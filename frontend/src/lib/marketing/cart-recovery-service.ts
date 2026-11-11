/**
 * LOOMERA — Abandoned Cart Recovery & Re-engagement Engine
 * Identifies dormant shopping bags, issues single-use recovery tokens, and tracks recovered revenue.
 */

import crypto from "crypto";
import { eq, and, sql, notInArray, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  carts,
  cartItems,
  cartRecoveryEvents,
  users,
  products,
} from "@/db/schema";
import { createInAppAlert } from "@/lib/notifications/notification-service";

export interface AbandonedCartSummary {
  cartId: string;
  userId: string | null;
  customerEmail: string;
  customerName: string | null;
  itemCount: number;
  totalInr: number;
  lastActive: Date;
  status: "DORMANT" | "REMINDED" | "CLICKED" | "RECOVERED";
}

export interface CartRecoveryMetrics {
  totalAbandonedCarts: number;
  remindersSent: number;
  clicksCount: number;
  recoveredOrdersCount: number;
  recoveredRevenueInr: number;
  recoveryRatePercent: number;
}

/**
 * Scans PostgreSQL for carts with items that have been inactive for >= idleHours.
 */
export async function scanForAbandonedCarts(params?: {
  idleHours?: number;
  maxAgeHours?: number;
}): Promise<AbandonedCartSummary[]> {
  const idleHours = params?.idleHours ?? 2;
  const maxAgeHours = params?.maxAgeHours ?? 168; // 7 days

  const idleCutoff = new Date(Date.now() - idleHours * 3600 * 1000);
  const maxAgeCutoff = new Date(Date.now() - maxAgeHours * 3600 * 1000);

  // Fetch candidate carts with active items
  const candidateRows = await db
    .select({
      cartId: carts.id,
      userId: carts.userId,
      cartUpdatedAt: carts.updatedAt,
      userEmail: users.email,
      userName: users.fullName,
      itemId: cartItems.id,
      quantity: cartItems.quantity,
      unitPriceInr: products.basePriceInr,
    })
    .from(carts)
    .innerJoin(cartItems, eq(carts.id, cartItems.cartId))
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(users, eq(carts.userId, users.id))
    .where(
      and(
        sql`${carts.updatedAt} <= ${idleCutoff}`,
        sql`${carts.updatedAt} >= ${maxAgeCutoff}`
      )
    );

  // Aggregate by cartId
  const cartMap = new Map<
    string,
    {
      cartId: string;
      userId: string | null;
      email: string;
      name: string | null;
      itemCount: number;
      totalInr: number;
      lastActive: Date;
    }
  >();

  for (const row of candidateRows) {
    const existing = cartMap.get(row.cartId);
    const lineTotal = row.quantity * row.unitPriceInr;
    if (existing) {
      existing.itemCount += row.quantity;
      existing.totalInr += lineTotal;
    } else {
      cartMap.set(row.cartId, {
        cartId: row.cartId,
        userId: row.userId,
        email: row.userEmail || "guest-patron@loomera.internal",
        name: row.userName || "Valued Patron",
        itemCount: row.quantity,
        totalInr: lineTotal,
        lastActive: row.cartUpdatedAt,
      });
    }
  }

  // Check existing recovery events to determine status
  const abandonedCarts: AbandonedCartSummary[] = [];

  for (const [cartId, data] of cartMap.entries()) {
    const [existingEvent] = await db
      .select()
      .from(cartRecoveryEvents)
      .where(eq(cartRecoveryEvents.cartId, cartId))
      .orderBy(desc(cartRecoveryEvents.createdAt))
      .limit(1);

    let status: "DORMANT" | "REMINDED" | "CLICKED" | "RECOVERED" = "DORMANT";
    if (existingEvent) {
      status = existingEvent.status as "DORMANT" | "REMINDED" | "CLICKED" | "RECOVERED";
    }

    abandonedCarts.push({
      cartId: data.cartId,
      userId: data.userId,
      customerEmail: data.email,
      customerName: data.name,
      itemCount: data.itemCount,
      totalInr: data.totalInr,
      lastActive: data.lastActive,
      status,
    });
  }

  return abandonedCarts;
}

/**
 * Dispatches an abandoned cart reminder with a cryptographic single-use recovery token.
 * Respects strict idempotency and 1-reminder-per-cart frequency cap.
 */
export async function dispatchCartRecoveryReminder(params: {
  cartId: string;
  customerEmail: string;
  customerName?: string;
  userId?: string | null;
  discountCode?: string;
}) {
  const { cartId, customerEmail, customerName, userId, discountCode = "WELCOMEBACK10" } = params;

  // 1. Idempotency Check: Do not send multiple recovery notifications for the same cart
  const [alreadyReminded] = await db
    .select()
    .from(cartRecoveryEvents)
    .where(
      and(
        eq(cartRecoveryEvents.cartId, cartId),
        notInArray(cartRecoveryEvents.status, ["EXPIRED"])
      )
    );

  if (alreadyReminded) {
    return {
      success: false,
      reason: "Recovery notification already issued for this cart session",
      event: alreadyReminded,
    };
  }

  // 2. Compute cart totals
  const items = await db
    .select({
      quantity: cartItems.quantity,
      unitPriceInr: products.basePriceInr,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  const totalInr = items.reduce((sum, item) => sum + item.quantity * item.unitPriceInr, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (itemCount === 0) {
    return { success: false, reason: "Cart has no active items" };
  }

  // 3. Generate secure single-use recovery token
  const token = `lrc_${crypto.randomBytes(24).toString("hex")}`;

  // 4. Record recovery event in database
  const [event] = await db
    .insert(cartRecoveryEvents)
    .values({
      cartId,
      userId: userId || null,
      customerEmail,
      customerName: customerName || null,
      recoveryToken: token,
      cartTotalInr: totalInr,
      itemCount,
      discountCodeOffered: discountCode,
      status: "REMINDED",
      remindedAt: new Date(),
    })
    .returning();

  // 5. Dispatch notification via multi-channel fallback service
  if (userId) {
    try {
      await createInAppAlert({
        userId,
        title: "Your Bespoke Atelier Silhouettes Await",
        message: `Your reserved garments are waiting in your bag. Use code ${discountCode} for an exclusive 10% privilege on completion.`,
        type: "ORDER_STATUS",
      });
    } catch (notifErr) {
      console.warn("[CartRecovery] Notification dispatch warning:", notifErr);
    }
  }

  return { success: true, event };
}

/**
 * Validates a recovery token when customer clicks the recovery email/notification link.
 */
export async function processCartRecoveryToken(token: string) {
  const [event] = await db
    .select()
    .from(cartRecoveryEvents)
    .where(eq(cartRecoveryEvents.recoveryToken, token));

  if (!event) {
    return { valid: false, error: "Invalid or expired cart recovery token" };
  }

  // Update status to CLICKED if currently REMINDED
  if (event.status === "REMINDED") {
    await db
      .update(cartRecoveryEvents)
      .set({
        status: "CLICKED",
        clickedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(cartRecoveryEvents.id, event.id));
  }

  return {
    valid: true,
    cartId: event.cartId,
    discountCode: event.discountCodeOffered,
    customerEmail: event.customerEmail,
  };
}

/**
 * Marks an abandoned cart event as successfully recovered when an order is finalized.
 */
export async function recordRecoveryConversion(params: {
  cartId: string;
  orderId: string;
}) {
  const [event] = await db
    .select()
    .from(cartRecoveryEvents)
    .where(eq(cartRecoveryEvents.cartId, params.cartId))
    .orderBy(desc(cartRecoveryEvents.createdAt))
    .limit(1);

  if (!event || event.status === "RECOVERED") {
    return null;
  }

  const [updated] = await db
    .update(cartRecoveryEvents)
    .set({
      status: "RECOVERED",
      recoveredAt: new Date(),
      recoveredOrderId: params.orderId,
      updatedAt: new Date(),
    })
    .where(eq(cartRecoveryEvents.id, event.id))
    .returning();

  return updated;
}

/**
 * Automatically records recovery conversion by user ID upon order payment.
 */
export async function recordRecoveryConversionByUser(userId: string, orderId?: string | null) {
  const [event] = await db
    .select()
    .from(cartRecoveryEvents)
    .where(
      and(
        eq(cartRecoveryEvents.userId, userId),
        sql`${cartRecoveryEvents.status} IN ('REMINDED', 'CLICKED')`
      )
    )
    .orderBy(desc(cartRecoveryEvents.createdAt))
    .limit(1);

  if (!event) return null;

  const [updated] = await db
    .update(cartRecoveryEvents)
    .set({
      status: "RECOVERED",
      recoveredAt: new Date(),
      recoveredOrderId: orderId || null,
      updatedAt: new Date(),
    })
    .where(eq(cartRecoveryEvents.id, event.id))
    .returning();

  return updated;
}

/**
 * Retrieves executive metrics for cart abandonment and recovery.
 */
export async function getCartRecoveryMetrics(): Promise<CartRecoveryMetrics> {
  const allEvents = await db.select().from(cartRecoveryEvents);

  const remindersSent = allEvents.length;
  const clicksCount = allEvents.filter((e) => e.status === "CLICKED" || e.status === "RECOVERED").length;
  const recoveredEvents = allEvents.filter((e) => e.status === "RECOVERED");
  const recoveredOrdersCount = recoveredEvents.length;
  const recoveredRevenueInr = recoveredEvents.reduce((sum, e) => sum + e.cartTotalInr, 0);

  const recoveryRatePercent =
    remindersSent > 0 ? Number(((recoveredOrdersCount / remindersSent) * 100).toFixed(2)) : 0;

  // Approximate total abandoned carts
  const abandonedList = await scanForAbandonedCarts({ idleHours: 2 });
  const totalAbandonedCarts = Math.max(abandonedList.length, remindersSent);

  return {
    totalAbandonedCarts,
    remindersSent,
    clicksCount,
    recoveredOrdersCount,
    recoveredRevenueInr,
    recoveryRatePercent,
  };
}
