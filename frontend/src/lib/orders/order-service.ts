/**
 * LOOMERA — Order Lifecycle Management Service
 * Handles order creation, payment confirmation, customer history, order details, and cancellations.
 * Enforces server-authoritative pricing, inventory consistency, and strict customer isolation.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderAddresses,
  payments,
  orderStatusHistory,
  products,
  productVariants,
  productImages,
  shipments,
  shipmentEvents,
} from "@/db/schema";
import { SHIPPING_CONFIG } from "@/lib/pricing";
import {
  reserveInventoryForOrder,
  commitOrderReservations,
  releaseOrderReservations,
  restoreCommittedInventory,
} from "@/lib/inventory/reservation";
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  RazorpayOrderResult,
} from "@/lib/payments/razorpay";
import { clearUserCart } from "@/lib/cart";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import {
  validateAndCalculateCouponDiscount,
  recordCouponRedemption,
} from "@/lib/promotions/coupon-service";

export interface CreateOrderAddressInput {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface CheckoutOrderItemInput {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export interface CreateCheckoutOrderParams {
  userId: string;
  items: CheckoutOrderItemInput[];
  shippingAddress: CreateOrderAddressInput;
  shippingMethod?: "standard" | "express";
  couponCode?: string;
  notes?: string;
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  subtotalInr: number;
  shippingFeeInr: number;
  shippingMethod: string;
  discountInr: number;
  taxInr: number;
  totalInr: number;
  currency: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    productTitle: string;
    size: string;
    color: string;
    unitPriceInr: number;
    quantity: number;
    lineTotalInr: number;
    imageUrl: string | null;
  }>;
  payment?: {
    id: string;
    gateway: string;
    gatewayOrderId: string;
    gatewayPaymentId: string | null;
    amountInr: number;
    status: string;
  } | null;
  shipment?: {
    id: string;
    carrier: string;
    trackingNumber: string;
    labelUrl: string | null;
    status: string;
    estimatedDeliveryAt: Date | null;
    dispatchedAt: Date | null;
    deliveredAt: Date | null;
    events: Array<{
      id: string;
      statusCode: string;
      statusDescription: string;
      location: string | null;
      carrierEventTimestamp: Date;
    }>;
  } | null;
  statusHistory: Array<{
    id: string;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: Date;
  }>;
}

/**
 * Generates an elegant, bespoke order number:
 * Format: LMR-YYYYMMDD-XXXX (e.g. LMR-20261103-7K2Q)
 */
export function generateOrderNumber(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LMR-${dateStr}-${randomSuffix}`;
}

/**
 * Validates delivery address fields.
 */
export function validateDeliveryAddress(addr: CreateOrderAddressInput): { valid: boolean; error?: string } {
  if (!addr.fullName || addr.fullName.trim().length < 2) {
    return { valid: false, error: "Recipient full name is required" };
  }
  if (!addr.phone || !/^[0-9+ -]{10,15}$/.test(addr.phone.trim())) {
    return { valid: false, error: "Valid 10-digit mobile number is required" };
  }
  if (!addr.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr.email.trim())) {
    return { valid: false, error: "Valid contact email address is required" };
  }
  if (!addr.addressLine1 || addr.addressLine1.trim().length < 5) {
    return { valid: false, error: "Building or street address is required" };
  }
  if (!addr.city || addr.city.trim().length < 2) {
    return { valid: false, error: "City is required" };
  }
  if (!addr.state || addr.state.trim().length < 2) {
    return { valid: false, error: "State / Province is required" };
  }
  // Validate Indian 6-digit postal code
  const cleanPin = addr.postalCode ? addr.postalCode.replace(/\s+/g, "") : "";
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return { valid: false, error: "Valid 6-digit Indian PIN code is required" };
  }

  return { valid: true };
}

/**
 * Creates a server-authoritative checkout order and initiates payment order.
 */
export async function createCheckoutOrder(params: CreateCheckoutOrderParams): Promise<{
  order: typeof orders.$inferSelect;
  payment: typeof payments.$inferSelect;
  razorpayOrder: RazorpayOrderResult;
}> {
  const { userId, items, shippingAddress, shippingMethod = "standard", notes } = params;

  if (!items || items.length === 0) {
    throw new Error("Cannot checkout with an empty cart");
  }

  // 1. Validate delivery address
  const addrValidation = validateDeliveryAddress(shippingAddress);
  if (!addrValidation.valid) {
    throw new Error(addrValidation.error || "Invalid delivery address");
  }

  // 2. Resolve authoritative pricing and variant IDs for each item
  const resolvedItems: Array<{
    productId: string;
    variantId: string;
    productTitle: string;
    size: string;
    color: string;
    unitPriceInr: number;
    quantity: number;
    lineTotalInr: number;
    imageUrl: string;
  }> = [];

  let subtotalInr = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.min(10, Math.floor(Number(item.quantity) || 1)));

    // Fetch published product
    const [prod] = await db
      .select({
        id: products.id,
        title: products.title,
        basePriceInr: products.basePriceInr,
        isPublished: products.isPublished,
      })
      .from(products)
      .where(and(eq(products.id, item.productId), eq(products.isPublished, true)))
      .limit(1);

    if (!prod) {
      throw new Error(`Garment '${item.productId}' is not available in our catalog`);
    }

    // Fetch matching variant
    const [variant] = await db
      .select({
        id: productVariants.id,
        size: productVariants.size,
        colorName: productVariants.colorName,
        priceOverrideInr: productVariants.priceOverrideInr,
        stockQuantity: productVariants.stockQuantity,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, item.productId),
          eq(productVariants.size, item.size),
          eq(productVariants.colorName, item.color)
        )
      )
      .limit(1);

    if (!variant) {
      throw new Error(`Variant (${item.color}, ${item.size}) is not available for ${prod.title}`);
    }

    // Fetch primary image
    const [img] = await db
      .select({ imageUrl: productImages.imageUrl })
      .from(productImages)
      .where(and(eq(productImages.productId, item.productId), eq(productImages.isPrimary, true)))
      .limit(1);

    const unitPrice = variant.priceOverrideInr ?? prod.basePriceInr;
    const lineTotal = unitPrice * qty;
    subtotalInr += lineTotal;

    resolvedItems.push({
      productId: prod.id,
      variantId: variant.id,
      productTitle: prod.title,
      size: variant.size,
      color: variant.colorName,
      unitPriceInr: unitPrice,
      quantity: qty,
      lineTotalInr: lineTotal,
      imageUrl: img?.imageUrl || "/assets/reference/prod_linen_shirt.jpg",
    });
  }

  // 3. Compute server-authoritative shipping fee
  let shippingFeeInr = 0;
  if (shippingMethod === "express") {
    shippingFeeInr = SHIPPING_CONFIG.EXPRESS_SHIPPING_FEE_INR;
  } else {
    shippingFeeInr =
      subtotalInr >= SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR
        ? 0
        : SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR;
  }

  // 4. Server-authoritative coupon verification
  let discountInr = 0;
  let appliedCouponId: string | null = null;
  if (params.couponCode) {
    const couponValidation = await validateAndCalculateCouponDiscount({
      code: params.couponCode,
      userId,
      subtotalInr,
      items: resolvedItems.map((ri) => ({
        productId: ri.productId,
        quantity: ri.quantity,
        unitPriceInr: ri.unitPriceInr,
      })),
    });
    if (couponValidation.valid) {
      discountInr = couponValidation.discountInr;
      appliedCouponId = couponValidation.couponId || null;
    }
  }

  const taxInr = 0; // Inclusive of GST
  const totalInr = Math.max(0, subtotalInr + shippingFeeInr - discountInr);

  // 5. Create internal order and reserve inventory within a transaction
  return await db.transaction(async (tx) => {
    // A. Insert Address Snapshot
    const [addressRow] = await tx
      .insert(orderAddresses)
      .values({
        userId,
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        email: shippingAddress.email.trim().toLowerCase(),
        addressLine1: shippingAddress.addressLine1.trim(),
        addressLine2: shippingAddress.addressLine2?.trim() || null,
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        postalCode: shippingAddress.postalCode.trim(),
        country: shippingAddress.country?.trim() || "India",
      })
      .returning();

    // B. Insert Order Record
    const orderNumber = generateOrderNumber();
    const [orderRow] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId,
        shippingAddressId: addressRow.id,
        status: "PENDING_PAYMENT",
        subtotalInr,
        shippingFeeInr,
        shippingMethod,
        discountInr,
        taxInr,
        totalInr,
        currency: "INR",
        notes: notes?.trim() || null,
      })
      .returning();

    // If coupon was applied, record redemption
    if (appliedCouponId && discountInr > 0) {
      await recordCouponRedemption(
        {
          couponId: appliedCouponId,
          userId,
          orderId: orderRow.id,
          discountAmountInr: discountInr,
        },
        tx
      );
    }

    // C. Insert Order Line Items
    for (const item of resolvedItems) {
      await tx.insert(orderItems).values({
        orderId: orderRow.id,
        productId: item.productId,
        variantId: item.variantId,
        productTitle: item.productTitle,
        size: item.size,
        color: item.color,
        unitPriceInr: item.unitPriceInr,
        quantity: item.quantity,
        lineTotalInr: item.lineTotalInr,
        imageUrl: item.imageUrl,
      });
    }

    // D. Reserve Inventory (Anti-overselling TTL lock)
    const reserveResult = await reserveInventoryForOrder(
      {
        orderId: orderRow.id,
        items: resolvedItems.map((ri) => ({
          variantId: ri.variantId,
          quantity: ri.quantity,
        })),
        ttlMinutes: 15,
      },
      tx
    );

    if (!reserveResult.success) {
      throw new Error(reserveResult.reason || "Failed to reserve inventory for checkout");
    }

    // E. Create Razorpay Payment Order
    const razorpayOrder = await createRazorpayOrder({
      amountInr: totalInr,
      orderNumber,
      notes: {
        orderId: orderRow.id,
        userId,
      },
    });

    // F. Record Payment Record
    const [paymentRow] = await tx
      .insert(payments)
      .values({
        orderId: orderRow.id,
        gateway: "RAZORPAY",
        gatewayOrderId: razorpayOrder.id,
        amountInr: totalInr,
        currency: "INR",
        status: "CREATED",
      })
      .returning();

    // G. Record Order Status Timeline
    await tx.insert(orderStatusHistory).values({
      orderId: orderRow.id,
      previousStatus: null,
      newStatus: "PENDING_PAYMENT",
      reason: "Checkout session initiated by customer",
    });

    return {
      order: orderRow,
      payment: paymentRow,
      razorpayOrder,
    };
  });
}

/**
 * Confirms payment, validates cryptographic signature, commits inventory, and clears cart.
 */
export async function confirmOrderPayment(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  rawPayload?: Record<string, unknown>;
}): Promise<{ success: boolean; order: typeof orders.$inferSelect }> {
  const { orderId, paymentId, signature, rawPayload } = params;

  // 1. Fetch order and active payment
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error("Order not found");
  }

  // Idempotency check: if already confirmed/paid, return success
  if (order.status !== "PENDING_PAYMENT") {
    return { success: true, order };
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);

  if (!payment) {
    throw new Error("Payment record not found for order");
  }

  // 2. Verify Razorpay HMAC-SHA256 signature
  const isSignatureValid = verifyPaymentSignature({
    orderId: payment.gatewayOrderId,
    paymentId,
    signature,
  });

  if (!isSignatureValid) {
    // Record payment failure in status history
    await db
      .update(payments)
      .set({
        status: "FAILED",
        errorCode: "BAD_SIGNATURE",
        errorDescription: "Payment signature mismatch",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await releaseOrderReservations(orderId);
    throw new Error("Invalid payment signature. Transaction could not be verified.");
  }

  // 3. Atomically commit inventory and transition order within transaction
  await db.transaction(async (tx) => {
    // A. Update Payment
    await tx
      .update(payments)
      .set({
        gatewayPaymentId: paymentId,
        gatewaySignature: signature,
        status: "PAID",
        rawPayload: rawPayload ? JSON.stringify(rawPayload) : null,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // B. Update Order Status
    await tx
      .update(orders)
      .set({
        status: "CONFIRMED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // C. Commit Inventory Reservations (Deduct Physical Stock)
    await commitOrderReservations(orderId, tx);

    // D. Clear Cart for Customer
    await clearUserCart(order.userId);

    // E. Record Timeline
    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus: "PENDING_PAYMENT",
      newStatus: "CONFIRMED",
      reason: `Payment verified successfully (ID: ${paymentId})`,
    });
  });

  // 4. Send Order Confirmation Email Notification
  const fullOrder = await getUserOrderById(order.userId, orderId);
  if (fullOrder) {
    await sendTransactionalEmail({
      type: "ORDER_CONFIRMATION",
      recipientEmail: fullOrder.shippingAddress.email,
      recipientName: fullOrder.shippingAddress.fullName,
      orderNumber: fullOrder.orderNumber,
      totalInr: fullOrder.totalInr,
      items: fullOrder.items.map((i) => ({
        title: i.productTitle,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        lineTotal: i.lineTotalInr,
      })),
      shippingAddress: `${fullOrder.shippingAddress.addressLine1}, ${fullOrder.shippingAddress.city}, ${fullOrder.shippingAddress.state} - ${fullOrder.shippingAddress.postalCode}`,
    });
  }

  const [updatedOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return { success: true, order: updatedOrder };
}

/**
 * Fetches all orders belonging to a customer in reverse chronological order.
 * Strictly scoped to userId for customer data isolation.
 */
export async function getUserOrders(userId: string): Promise<OrderWithDetails[]> {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  if (orderRows.length === 0) {
    return [];
  }

  const results: OrderWithDetails[] = [];
  for (const o of orderRows) {
    const details = await getUserOrderById(userId, o.id);
    if (details) {
      results.push(details);
    }
  }

  return results;
}

/**
 * Retrieves a single order with items, address, payment, and status history.
 * Enforces ownership: returns null if the order does not belong to the user.
 */
export async function getUserOrderById(userId: string, orderId: string): Promise<OrderWithDetails | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    return null;
  }

  // Fetch address
  const [address] = await db
    .select()
    .from(orderAddresses)
    .where(eq(orderAddresses.id, order.shippingAddressId))
    .limit(1);

  // Fetch items
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  // Fetch payment
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .limit(1);

  // Fetch shipment and timeline events
  const [shipmentRow] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1);

  let shipmentData = null;
  if (shipmentRow) {
    const events = await db
      .select()
      .from(shipmentEvents)
      .where(eq(shipmentEvents.shipmentId, shipmentRow.id))
      .orderBy(desc(shipmentEvents.carrierEventTimestamp));

    shipmentData = {
      ...shipmentRow,
      events,
    };
  }

  // Fetch timeline
  const statusHistory = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt));

  return {
    ...order,
    shippingAddress: address,
    items,
    payment: payment || null,
    shipment: shipmentData,
    statusHistory,
  };
}

/**
 * Cancels an eligible order and restores or releases reserved/committed inventory.
 */
export async function cancelUserOrder(params: {
  userId: string;
  orderId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  const { userId, orderId, reason = "Cancelled by patron" } = params;

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new Error("Order not found or unauthorized");
  }

  // Check eligibility: only PENDING_PAYMENT, CONFIRMED, or PROCESSING can be cancelled
  const cancellableStatuses = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];
  if (!cancellableStatuses.includes(order.status)) {
    throw new Error(`Order cannot be cancelled in '${order.status}' status`);
  }

  const prevStatus = order.status;

  await db.transaction(async (tx) => {
    // 1. Update order status
    await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // 2. Restore or release inventory
    if (prevStatus === "CONFIRMED" || prevStatus === "PROCESSING") {
      await restoreCommittedInventory(orderId, tx);
    } else {
      await releaseOrderReservations(orderId, tx);
    }

    // 3. Update payment status if exists
    await tx
      .update(payments)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(payments.orderId, orderId));

    // 4. Record Timeline
    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus: prevStatus,
      newStatus: "CANCELLED",
      reason,
    });
  });

  // 5. Send Cancellation Notification
  const fullOrder = await getUserOrderById(userId, orderId);
  if (fullOrder) {
    await sendTransactionalEmail({
      type: "ORDER_CANCELLED",
      recipientEmail: fullOrder.shippingAddress.email,
      recipientName: fullOrder.shippingAddress.fullName,
      orderNumber: fullOrder.orderNumber,
      totalInr: fullOrder.totalInr,
      items: fullOrder.items.map((i) => ({
        title: i.productTitle,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        lineTotal: i.lineTotalInr,
      })),
      reason,
    });
  }

  return { success: true, message: "Order cancelled successfully" };
}
