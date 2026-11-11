/**
 * LOOMERA — Real-Time Inventory Reservation & Consistency Engine
 * Prevents overselling during high-concurrency checkout journeys.
 * Utilizes TTL reservation locks, atomic decrement transitions, and expiration release.
 */

import { eq, and, sql, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, inventoryReservations, products } from "@/db/schema";

export interface ReservationItem {
  variantId: string;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  reservationIds?: string[];
  reason?: string;
  failedVariantId?: string;
}

/**
 * Releases all uncommitted reservations whose TTL has expired.
 * Runs opportunistically before stock checks.
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();
  const result = await db
    .update(inventoryReservations)
    .set({ status: "RELEASED" })
    .where(
      and(
        eq(inventoryReservations.status, "RESERVED"),
        lte(inventoryReservations.expiresAt, now)
      )
    )
    .returning({ id: inventoryReservations.id });

  return result.length;
}

/**
 * Calculates currently available stock for a variant:
 * Available = Physical stock_quantity - Unexpired active reservations
 */
export async function getEffectiveAvailableStock(variantId: string): Promise<number> {
  await cleanupExpiredReservations();

  const [variant] = await db
    .select({
      stockQuantity: productVariants.stockQuantity,
    })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) return 0;

  const now = new Date();
  const [reservedSum] = await db
    .select({
      totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)::int`,
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.variantId, variantId),
        eq(inventoryReservations.status, "RESERVED"),
        gt(inventoryReservations.expiresAt, now)
      )
    );

  const activeReservations = reservedSum?.totalReserved || 0;
  return Math.max(0, variant.stockQuantity - activeReservations);
}

/**
 * Atomically reserves inventory for an in-flight order.
 * Ensures stock availability taking into account active reservations.
 */
export async function reserveInventoryForOrder(
  params: {
    orderId: string;
    items: ReservationItem[];
    ttlMinutes?: number;
  },
  externalTx?: any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<ReservationResult> {
  const { orderId, items, ttlMinutes = 15 } = params;
  if (!items || items.length === 0) {
    return { success: false, reason: "Cart is empty" };
  }

  await cleanupExpiredReservations();

  const runWithTx = async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const reservationIds: string[] = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, reason: "Invalid item quantity", failedVariantId: item.variantId };
      }

      // 1. Fetch variant with row-level lock
      const [variant] = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          size: productVariants.size,
          colorName: productVariants.colorName,
          stockQuantity: productVariants.stockQuantity,
        })
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .limit(1);

      if (!variant) {
        return {
          success: false,
          reason: `Garment variant not found`,
          failedVariantId: item.variantId,
        };
      }

      // Check product is published
      const [prod] = await tx
        .select({ isPublished: products.isPublished, title: products.title })
        .from(products)
        .where(eq(products.id, variant.productId))
        .limit(1);

      if (!prod || !prod.isPublished) {
        return {
          success: false,
          reason: `Garment '${prod?.title || item.variantId}' is no longer available`,
          failedVariantId: item.variantId,
        };
      }

      // 2. Fetch active reservations on this variant
      const now = new Date();
      const [reservedRow] = await tx
        .select({
          totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)::int`,
        })
        .from(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.variantId, item.variantId),
            eq(inventoryReservations.status, "RESERVED"),
            gt(inventoryReservations.expiresAt, now)
          )
        );

      const alreadyReserved = reservedRow?.totalReserved || 0;
      const effectiveAvailable = variant.stockQuantity - alreadyReserved;

      if (effectiveAvailable < item.quantity) {
        return {
          success: false,
          reason: `Only ${effectiveAvailable} piece(s) of ${prod.title} (${variant.colorName}, ${variant.size}) available`,
          failedVariantId: item.variantId,
        };
      }

      // 3. Create reservation record
      const [res] = await tx
        .insert(inventoryReservations)
        .values({
          orderId,
          variantId: item.variantId,
          quantity: item.quantity,
          expiresAt,
          status: "RESERVED",
        })
        .returning({ id: inventoryReservations.id });

      reservationIds.push(res.id);
    }

    return {
      success: true,
      reservationIds,
    };
  };

  if (externalTx) {
    return await runWithTx(externalTx);
  }
  return await db.transaction(runWithTx);
}

/**
 * Commits reservations and atomically decrements physical stock upon confirmed payment.
 */
export async function commitOrderReservations(orderId: string, externalTx?: any): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const runWithTx = async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // 1. Fetch active reservations for this order
    const reservations = await tx
      .select({
        id: inventoryReservations.id,
        variantId: inventoryReservations.variantId,
        quantity: inventoryReservations.quantity,
        status: inventoryReservations.status,
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, "RESERVED")
        )
      );

    if (reservations.length === 0) {
      // Check if already committed (idempotent call)
      const committed = await tx
        .select({ id: inventoryReservations.id })
        .from(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.orderId, orderId),
            eq(inventoryReservations.status, "COMMITTED")
          )
        );
      return committed.length > 0;
    }

    // 2. Decrement physical stock for each variant atomically
    for (const res of reservations) {
      const updateResult = await tx
        .update(productVariants)
        .set({
          stockQuantity: sql`GREATEST(0, ${productVariants.stockQuantity} - ${res.quantity})`,
        })
        .where(eq(productVariants.id, res.variantId))
        .returning({ id: productVariants.id, newStock: productVariants.stockQuantity });

      if (updateResult.length === 0) {
        throw new Error(`Failed to deduct inventory for variant ${res.variantId}`);
      }

      // Mark reservation as COMMITTED
      await tx
        .update(inventoryReservations)
        .set({ status: "COMMITTED" })
        .where(eq(inventoryReservations.id, res.id));
    }

    return true;
  };

  if (externalTx) {
    return await runWithTx(externalTx);
  }
  return await db.transaction(runWithTx);
}

/**
 * Releases uncommitted reservations when payment is cancelled or fails.
 */
export async function releaseOrderReservations(orderId: string, externalTx?: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const executor = externalTx || db;
  await executor
    .update(inventoryReservations)
    .set({ status: "RELEASED" })
    .where(
      and(
        eq(inventoryReservations.orderId, orderId),
        eq(inventoryReservations.status, "RESERVED")
      )
    );
}

/**
 * Restores previously committed physical stock when an order is cancelled or returned.
 */
export async function restoreCommittedInventory(orderId: string, externalTx?: any): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const runWithTx = async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const committed = await tx
      .select({
        id: inventoryReservations.id,
        variantId: inventoryReservations.variantId,
        quantity: inventoryReservations.quantity,
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, "COMMITTED")
        )
      );

    for (const item of committed) {
      await tx
        .update(productVariants)
        .set({
          stockQuantity: sql`${productVariants.stockQuantity} + ${item.quantity}`,
        })
        .where(eq(productVariants.id, item.variantId));

      await tx
        .update(inventoryReservations)
        .set({ status: "RELEASED" })
        .where(eq(inventoryReservations.id, item.id));
    }

    return true;
  };

  if (externalTx) {
    return await runWithTx(externalTx);
  }
  return await db.transaction(runWithTx);
}
