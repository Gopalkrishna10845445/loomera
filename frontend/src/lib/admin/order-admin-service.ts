/**
 * LOOMERA — Administrative Order Management & Fulfillment Service
 * Handles order inspection, status transitions, cancellations, returns, and refund processing.
 */

import { eq, and, desc, sql, or, ilike, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderAddresses,
  payments,
  orderStatusHistory,
  users,
  shipments,
  shipmentEvents,
} from "@/db/schema";
import { restoreCommittedInventory, releaseOrderReservations } from "@/lib/inventory/reservation";
import { recordAdminAuditLog } from "./audit";
import { VALID_ORDER_STATUSES, OrderStatus, isValidOrderTransition } from "./types";
export { VALID_ORDER_STATUSES, type OrderStatus, isValidOrderTransition };

export interface GetAdminOrdersParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves atelier orders for administration with search and status filtering.
 */
export async function getAdminOrders(params: GetAdminOrdersParams = {}) {
  const { status, search, limit = 50, offset = 0 } = params;

  const conditions = [];

  if (status === "AWAITING_FULFILMENT") {
    conditions.push(inArray(orders.status, ["CONFIRMED", "PROCESSING", "PACKED"]));
  } else if (status === "DELAYED") {
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
    conditions.push(
      and(
        inArray(orders.status, ["CONFIRMED", "PROCESSING", "PACKED"]),
        lte(orders.createdAt, twoDaysAgo)
      )
    );
  } else if (status) {
    conditions.push(eq(orders.status, status));
  }

  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(orderAddresses.fullName, `%${search}%`),
        ilike(orderAddresses.email, `%${search}%`),
        ilike(orderAddresses.phone, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderRows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      customerEmail: users.email,
      customerName: users.fullName,
      recipientName: orderAddresses.fullName,
      recipientPhone: orderAddresses.phone,
      recipientCity: orderAddresses.city,
      recipientState: orderAddresses.state,
      status: orders.status,
      totalInr: orders.totalInr,
      subtotalInr: orders.subtotalInr,
      shippingFeeInr: orders.shippingFeeInr,
      shippingMethod: orders.shippingMethod,
      currency: orders.currency,
      itemCount: sql<number>`(SELECT count(*) FROM ${orderItems} oi WHERE oi.order_id = ${orders.id})::int`,
      paymentStatus: sql<string | null>`(SELECT p.status FROM ${payments} p WHERE p.order_id = ${orders.id} ORDER BY p.created_at DESC LIMIT 1)`,
      paymentGateway: sql<string | null>`(SELECT p.gateway FROM ${payments} p WHERE p.order_id = ${orders.id} ORDER BY p.created_at DESC LIMIT 1)`,
      carrier: sql<string | null>`(SELECT s.carrier FROM ${shipments} s WHERE s.order_id = ${orders.id} LIMIT 1)`,
      trackingNumber: sql<string | null>`(SELECT s.tracking_number FROM ${shipments} s WHERE s.order_id = ${orders.id} LIMIT 1)`,
      shipmentStatus: sql<string | null>`(SELECT s.status FROM ${shipments} s WHERE s.order_id = ${orders.id} LIMIT 1)`,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(orderAddresses, eq(orders.shippingAddressId, orderAddresses.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(orders)
    .innerJoin(orderAddresses, eq(orders.shippingAddressId, orderAddresses.id))
    .innerJoin(users, eq(orders.userId, users.id))
    .where(whereClause);

  return {
    orders: orderRows,
    total: countRow?.total || 0,
    limit,
    offset,
  };
}

/**
 * Retrieves full order details for administrative inspection.
 */
export async function getAdminOrderById(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1);

  const [address] = await db
    .select()
    .from(orderAddresses)
    .where(eq(orderAddresses.id, order.shippingAddressId))
    .limit(1);

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);

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

  const statusHistory = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(desc(orderStatusHistory.createdAt));

  return {
    ...order,
    customer: user,
    shippingAddress: address,
    items,
    payment: payment || null,
    shipment: shipmentData,
    statusHistory,
  };
}

export interface UpdateOrderStatusParams {
  orderId: string;
  newStatus: OrderStatus;
  reason?: string;
  adminId: string;
  ipAddress?: string | null;
}

/**
 * Updates an order status with transaction protection, inventory restoration, and audit logging.
 */
export async function updateAdminOrderStatus(params: UpdateOrderStatusParams) {
  const { orderId, newStatus, reason = "Status updated by administrator", adminId, ipAddress } = params;

  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid order status: ${newStatus}`);
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const previousStatus = order.status as OrderStatus;
    if (previousStatus === newStatus) {
      return { success: true, order, unchanged: true };
    }

    if (!isValidOrderTransition(previousStatus, newStatus)) {
      throw new Error(`Invalid status transition from '${previousStatus}' to '${newStatus}'`);
    }

    // 1. If transitioning to CANCELLED or RETURNED, restore inventory
    const committedStatuses = ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
    if (newStatus === "CANCELLED" || newStatus === "RETURNED") {
      if (committedStatuses.includes(previousStatus)) {
        await restoreCommittedInventory(orderId, tx);
      } else if (previousStatus === "PENDING_PAYMENT") {
        await releaseOrderReservations(orderId, tx);
      }

      // Update payment status if cancelled
      if (newStatus === "CANCELLED") {
        await tx
          .update(payments)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(payments.orderId, orderId));
      }
    }

    // 2. Update order row
    const [updated] = await tx
      .update(orders)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning();

    // 3. Insert status history timeline
    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus,
      newStatus,
      reason,
    });

    // 4. Record admin audit log
    await recordAdminAuditLog({
      adminId,
      action: "ORDER_STATUS_CHANGED",
      resourceType: "ORDER",
      resourceId: orderId,
      previousState: { status: previousStatus },
      newState: { status: newStatus, reason },
      ipAddress,
    });

    return {
      success: true,
      order: updated,
      previousStatus,
      newStatus,
    };
  });
}

export interface ProcessRefundParams {
  orderId: string;
  amountInr?: number;
  reason: string;
  restoreStock?: boolean;
  adminId: string;
  ipAddress?: string | null;
}

/**
 * Processes an administrative refund, updates payment status, optionally restores stock, and audits the transaction.
 */
export async function processAdminRefund(params: ProcessRefundParams) {
  const { orderId, amountInr, reason, restoreStock = true, adminId, ipAddress } = params;

  if (!reason || reason.trim().length === 0) {
    throw new Error("A justification reason is required to process refunds.");
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    if (!payment) {
      throw new Error(`No payment record found for order ${order.orderNumber}`);
    }

    const refundAmount = amountInr ?? payment.amountInr;
    const isFullRefund = refundAmount >= payment.amountInr;
    const newPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    // Update payment
    const [updatedPayment] = await tx
      .update(payments)
      .set({
        status: newPaymentStatus,
        errorDescription: `Refund processed: ${reason} (Amount: INR ${refundAmount})`,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    // Optionally restore stock
    if (restoreStock && isFullRefund) {
      await restoreCommittedInventory(orderId, tx);
    }

    // Update order status if full refund
    if (isFullRefund) {
      await tx
        .update(orders)
        .set({ status: "RETURNED", updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await tx.insert(orderStatusHistory).values({
        orderId,
        previousStatus: order.status,
        newStatus: "RETURNED",
        reason: `Refund processed: INR ${refundAmount} - ${reason}`,
      });
    }

    // Audit log
    await recordAdminAuditLog({
      adminId,
      action: "ORDER_REFUNDED",
      resourceType: "ORDER",
      resourceId: orderId,
      previousState: { paymentStatus: payment.status, orderStatus: order.status },
      newState: {
        paymentStatus: newPaymentStatus,
        refundAmount,
        reason,
        restoreStock,
      },
      ipAddress,
    });

    return {
      success: true,
      refundAmount,
      payment: updatedPayment,
    };
  });
}
