/**
 * LOOMERA — Returns, Exchanges & Refund Processing Service
 * Provides complete customer return workflows, warehouse inspection, exchange stock management,
 * and duplicate-refund protection.
 */

import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  payments,
  productVariants,
  returnRequests,
  returnItems,
  orderStatusHistory,
  inventoryMovements,
  users,
} from "@/db/schema";
import { recordAdminAuditLog } from "@/lib/admin/audit";
import { sendTransactionalEmail } from "@/lib/notifications/email";

// Configurable Business Rules
export const RETURN_POLICY = {
  RETURN_WINDOW_DAYS: 15,
  ALLOW_EXCHANGES: true,
  ACCEPTED_CONDITIONS: ["UNOPENED", "TAGS_ATTACHED"] as const,
  REASONS: [
    "Defective Garment",
    "Size / Fit Issue",
    "Fabric / Color Mismatch",
    "Received Incorrect Item",
    "Changed Mind",
  ] as const,
} as const;

export type ReturnReason = (typeof RETURN_POLICY.REASONS)[number];

export function generateReturnNumber(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RET-${dateStr}-${randomSuffix}`;
}

/**
 * Returns orders eligible for return (delivered within return window, no active return).
 */
export async function getReturnEligibleOrders(userId: string) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETURN_POLICY.RETURN_WINDOW_DAYS);

  const eligibleOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.status, "DELIVERED"),
        sql`${orders.updatedAt} >= ${cutoffDate}`
      )
    )
    .orderBy(desc(orders.createdAt));

  const results = [];
  for (const o of eligibleOrders) {
    const existingActiveReturn = await db
      .select({ id: returnRequests.id })
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.orderId, o.id),
          inArray(returnRequests.status, [
            "REQUESTED",
            "APPROVED",
            "PICKUP_SCHEDULED",
            "INSPECTION_PENDING",
            "INSPECTED_PASSED",
            "COMPLETED",
          ])
        )
      )
      .limit(1);

    if (existingActiveReturn.length === 0) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id));

      results.push({
        ...o,
        items,
      });
    }
  }

  return results;
}

export interface CreateReturnRequestParams {
  userId: string;
  orderId: string;
  type?: "RETURN" | "EXCHANGE";
  reason: string;
  notes?: string;
  exchangeVariantId?: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
    condition?: string;
  }>;
}

/**
 * Creates a customer return or exchange request with strict ownership and eligibility checks.
 */
export async function createCustomerReturnRequest(params: CreateReturnRequestParams) {
  const { userId, orderId, type = "RETURN", reason, notes, exchangeVariantId, items } = params;

  if (!items || items.length === 0) {
    throw new Error("At least one item must be selected for return or exchange");
  }

  return await db.transaction(async (tx) => {
    // 1. Validate order ownership and status
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);

    if (!order) {
      throw new Error("Order not found or unauthorized");
    }

    if (order.status !== "DELIVERED") {
      throw new Error(`Only delivered orders can be returned. Current status: ${order.status}`);
    }

    // 2. Prevent duplicate active return
    const [existing] = await tx
      .select()
      .from(returnRequests)
      .where(
        and(
          eq(returnRequests.orderId, orderId),
          inArray(returnRequests.status, [
            "REQUESTED",
            "APPROVED",
            "PICKUP_SCHEDULED",
            "INSPECTION_PENDING",
            "INSPECTED_PASSED",
            "COMPLETED",
          ])
        )
      )
      .limit(1);

    if (existing) {
      throw new Error(`An active return request already exists for this order (${existing.returnNumber})`);
    }

    // 3. Calculate refund amount from returned items
    let refundAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const [orderItem] = await tx
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.id, item.orderItemId), eq(orderItems.orderId, orderId)))
        .limit(1);

      if (!orderItem) {
        throw new Error(`Item ${item.orderItemId} does not belong to this order`);
      }

      const qty = Math.min(orderItem.quantity, Math.max(1, item.quantity));
      refundAmount += orderItem.unitPriceInr * qty;

      validatedItems.push({
        orderItemId: orderItem.id,
        quantity: qty,
        condition: item.condition || "TAGS_ATTACHED",
      });
    }

    const returnNumber = generateReturnNumber();

    // 4. Insert Return Request
    const [returnRow] = await tx
      .insert(returnRequests)
      .values({
        returnNumber,
        orderId,
        userId,
        type,
        status: "REQUESTED",
        reason,
        notes: notes?.trim() || null,
        refundAmountInr: type === "RETURN" ? refundAmount : 0,
        refundStatus: "PENDING",
        exchangeVariantId: type === "EXCHANGE" ? exchangeVariantId || null : null,
      })
      .returning();

    // 5. Insert Return Items
    for (const vi of validatedItems) {
      await tx.insert(returnItems).values({
        returnRequestId: returnRow.id,
        orderItemId: vi.orderItemId,
        quantity: vi.quantity,
        condition: vi.condition,
      });
    }

    // 6. Update Order Status to RETURN_REQUESTED
    await tx
      .update(orders)
      .set({ status: "RETURN_REQUESTED", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      previousStatus: order.status,
      newStatus: "RETURN_REQUESTED",
      reason: `Customer initiated ${type.toLowerCase()} request ${returnNumber}: ${reason}`,
    });

    return returnRow;
  });
}

/**
 * Retrieves all return requests submitted by a customer.
 */
export async function getCustomerReturns(userId: string) {
  const returns = await db
    .select({
      id: returnRequests.id,
      returnNumber: returnRequests.returnNumber,
      orderId: returnRequests.orderId,
      type: returnRequests.type,
      status: returnRequests.status,
      reason: returnRequests.reason,
      notes: returnRequests.notes,
      refundAmountInr: returnRequests.refundAmountInr,
      refundStatus: returnRequests.refundStatus,
      createdAt: returnRequests.createdAt,
      orderNumber: orders.orderNumber,
      orderTotalInr: orders.totalInr,
    })
    .from(returnRequests)
    .innerJoin(orders, eq(returnRequests.orderId, orders.id))
    .where(eq(returnRequests.userId, userId))
    .orderBy(desc(returnRequests.createdAt));

  return returns;
}

/**
 * Admin: lists return requests with pagination and optional status filter.
 */
export async function getAdminReturns(params: { status?: string; limit?: number; offset?: number } = {}) {
  const { status, limit = 50, offset = 0 } = params;

  const conditions = [];
  if (status) {
    conditions.push(eq(returnRequests.status, status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const returnRows = await db
    .select({
      id: returnRequests.id,
      returnNumber: returnRequests.returnNumber,
      orderId: returnRequests.orderId,
      orderNumber: orders.orderNumber,
      userId: returnRequests.userId,
      customerEmail: users.email,
      customerName: users.fullName,
      type: returnRequests.type,
      status: returnRequests.status,
      reason: returnRequests.reason,
      notes: returnRequests.notes,
      inspectionNotes: returnRequests.inspectionNotes,
      refundAmountInr: returnRequests.refundAmountInr,
      refundStatus: returnRequests.refundStatus,
      createdAt: returnRequests.createdAt,
      updatedAt: returnRequests.updatedAt,
    })
    .from(returnRequests)
    .innerJoin(orders, eq(returnRequests.orderId, orders.id))
    .innerJoin(users, eq(returnRequests.userId, users.id))
    .where(whereClause)
    .orderBy(desc(returnRequests.createdAt))
    .limit(limit)
    .offset(offset);

  return returnRows;
}

/**
 * Admin: Approves or rejects a customer return request.
 */
export async function reviewAdminReturnRequest(params: {
  returnId: string;
  action: "APPROVE" | "REJECT";
  notes?: string;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { returnId, action, notes, adminId, ipAddress } = params;

  return await db.transaction(async (tx) => {
    const [ret] = await tx
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, returnId))
      .limit(1);

    if (!ret) {
      throw new Error(`Return request not found: ${returnId}`);
    }

    if (ret.status !== "REQUESTED") {
      throw new Error(`Return request is already in '${ret.status}' status`);
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    const [updated] = await tx
      .update(returnRequests)
      .set({
        status: newStatus,
        inspectionNotes: notes || null,
        refundStatus: action === "REJECT" ? "REJECTED" : ret.refundStatus,
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, returnId))
      .returning();

    // If rejected, restore order to DELIVERED
    if (action === "REJECT") {
      await tx
        .update(orders)
        .set({ status: "DELIVERED", updatedAt: new Date() })
        .where(eq(orders.id, ret.orderId));

      await tx.insert(orderStatusHistory).values({
        orderId: ret.orderId,
        previousStatus: "RETURN_REQUESTED",
        newStatus: "DELIVERED",
        reason: `Return request ${ret.returnNumber} rejected by atelier: ${notes || "Policy criteria not met"}`,
      });
    }

    await recordAdminAuditLog({
      adminId,
      action: action === "APPROVE" ? "RETURN_APPROVED" : "RETURN_REJECTED",
      resourceType: "RETURN_REQUEST",
      resourceId: returnId,
      previousState: { status: ret.status },
      newState: { status: newStatus, notes },
      ipAddress,
    });

    return updated;
  });
}

/**
 * Admin: Processes inspection and approves refund or exchange.
 * Features strict idempotency protection against duplicate refund execution.
 */
export async function processReturnRefundOrExchange(params: {
  returnId: string;
  inspectionNotes: string;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { returnId, inspectionNotes, adminId, ipAddress } = params;

  return await db.transaction(async (tx) => {
    const [ret] = await tx
      .select()
      .from(returnRequests)
      .where(eq(returnRequests.id, returnId))
      .limit(1);

    if (!ret) {
      throw new Error(`Return request not found: ${returnId}`);
    }

    // STRICT SAFEGUARD: Prevent duplicate refund processing
    if (ret.refundStatus === "PROCESSED") {
      throw new Error(`Refund has already been processed for return ${ret.returnNumber}`);
    }

    if (ret.status === "COMPLETED" || ret.status === "REJECTED") {
      throw new Error(`Return request cannot be processed in '${ret.status}' status`);
    }

    // Fetch order and payment
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, ret.orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found for return ${ret.returnNumber}`);
    }

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);

    if (!payment || payment.status !== "PAID") {
      throw new Error("No verified paid transaction found for this order");
    }

    // Fetch returned items
    const returnedItems = await tx
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnRequestId, returnId));

    // Restore returned stock into inventory
    for (const ri of returnedItems) {
      const [oi] = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, ri.orderItemId))
        .limit(1);

      if (oi) {
        const [variant] = await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, oi.variantId))
          .limit(1);

        if (variant) {
          const newQty = variant.stockQuantity + ri.quantity;
          await tx
            .update(productVariants)
            .set({ stockQuantity: newQty })
            .where(eq(productVariants.id, variant.id));

          await tx.insert(inventoryMovements).values({
            variantId: variant.id,
            productId: oi.productId,
            adminId,
            movementType: "RETURN_RECEIVED",
            quantityDelta: ri.quantity,
            previousQuantity: variant.stockQuantity,
            newQuantity: newQty,
            reason: `Restocked via return ${ret.returnNumber}`,
          });
        }
      }
    }

    // Handle Exchange Variant Stock if exchange
    if (ret.type === "EXCHANGE" && ret.exchangeVariantId) {
      const [newVariant] = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, ret.exchangeVariantId))
        .limit(1);

      if (newVariant && newVariant.stockQuantity > 0) {
        const afterEx = newVariant.stockQuantity - 1;
        await tx
          .update(productVariants)
          .set({ stockQuantity: afterEx })
          .where(eq(productVariants.id, newVariant.id));

        await tx.insert(inventoryMovements).values({
          variantId: newVariant.id,
          productId: newVariant.productId,
          adminId,
          movementType: "ORDER_COMMITTED",
          quantityDelta: -1,
          previousQuantity: newVariant.stockQuantity,
          newQuantity: afterEx,
          reason: `Exchange fulfillment for return ${ret.returnNumber}`,
        });
      }
    }

    // Update payment status
    const isFullRefund = ret.refundAmountInr >= payment.amountInr;
    const newPaymentStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx
      .update(payments)
      .set({
        status: newPaymentStatus,
        errorDescription: `Refund processed: ${ret.returnNumber} - INR ${ret.refundAmountInr}`,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Update Return Request
    const [updatedReturn] = await tx
      .update(returnRequests)
      .set({
        status: "COMPLETED",
        refundStatus: "PROCESSED",
        inspectionNotes,
        updatedAt: new Date(),
      })
      .where(eq(returnRequests.id, returnId))
      .returning();

    // Update Order Status
    const terminalOrderStatus = ret.type === "RETURN" ? "REFUNDED" : "RETURNED";
    await tx
      .update(orders)
      .set({ status: terminalOrderStatus, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      previousStatus: order.status,
      newStatus: terminalOrderStatus,
      reason: `Return inspection completed: ${inspectionNotes} (Refund INR ${ret.refundAmountInr} processed)`,
    });

    // Audit Log
    await recordAdminAuditLog({
      adminId,
      action: "RETURN_COMPLETED_REFUND_PROCESSED",
      resourceType: "RETURN_REQUEST",
      resourceId: returnId,
      previousState: { refundStatus: ret.refundStatus, orderStatus: order.status },
      newState: {
        refundStatus: "PROCESSED",
        refundAmountInr: ret.refundAmountInr,
        orderStatus: terminalOrderStatus,
        inspectionNotes,
      },
      ipAddress,
    });

    // Send transactional refund notification
    const [user] = await tx.select().from(users).where(eq(users.id, ret.userId)).limit(1);
    if (user) {
      await sendTransactionalEmail({
        type: "REFUND_STATUS",
        recipientEmail: user.email,
        recipientName: user.fullName,
        orderNumber: order.orderNumber,
        totalInr: order.totalInr,
        refundAmountInr: ret.refundAmountInr,
        reason: inspectionNotes,
      });
    }

    return updatedReturn;
  });
}
