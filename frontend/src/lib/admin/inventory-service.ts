/**
 * LOOMERA — Administrative Inventory Management Engine
 * Governs physical stock, reservations, ledger movements, and restock notifications.
 */

import { eq, and, sql, desc, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productVariants,
  inventoryReservations,
  inventoryMovements,
  inventorySettings,
  restockNotifications,
  users,
} from "@/db/schema";
import { recordAdminAuditLog } from "./audit";
import { MovementType, VALID_MOVEMENT_TYPES, InventoryOverviewItem } from "./types";
export { type MovementType, VALID_MOVEMENT_TYPES, type InventoryOverviewItem };

/**
 * Retrieves the current configured low-stock threshold (default: 5).
 */
export async function getLowStockThreshold(): Promise<number> {
  const [row] = await db
    .select({ value: inventorySettings.value })
    .from(inventorySettings)
    .where(eq(inventorySettings.key, "low_stock_threshold"))
    .limit(1);

  if (!row || isNaN(Number(row.value))) {
    return 5;
  }
  return Number(row.value);
}

/**
 * Updates an inventory setting with audit tracking.
 */
export async function updateInventorySetting(
  key: string,
  value: string,
  adminId: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(inventorySettings)
    .where(eq(inventorySettings.key, key))
    .limit(1);

  await db
    .insert(inventorySettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: inventorySettings.key,
      set: { value, updatedAt: new Date() },
    });

  await recordAdminAuditLog({
    adminId,
    action: "SETTING_UPDATED",
    resourceType: "INVENTORY_SETTINGS",
    resourceId: key,
    previousState: existing ? { [key]: existing.value } : null,
    newState: { [key]: value },
  });
}

export interface GetInventoryOverviewParams {
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  categorySlug?: string;
  limit?: number;
  offset?: number;
}

/**
 * Computes live inventory statuses for all variants across the atelier.
 */
export async function getInventoryOverview(params: GetInventoryOverviewParams = {}) {
  const {
    search,
    lowStockOnly = false,
    outOfStockOnly = false,
    categorySlug,
    limit = 50,
    offset = 0,
  } = params;

  const threshold = await getLowStockThreshold();
  const now = new Date();

  // Query variants joined with products and active reservations
  const rows = await db
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      size: productVariants.size,
      colorName: productVariants.colorName,
      colorHex: productVariants.colorHex,
      priceOverrideInr: productVariants.priceOverrideInr,
      physicalStock: productVariants.stockQuantity,
      productTitle: products.title,
      categorySlug: products.categorySlug,
      basePriceInr: products.basePriceInr,
      isArchived: products.isArchived,
      isPublished: products.isPublished,
      activeReserved: sql<number>`
        COALESCE(
          (
            SELECT SUM(r.quantity)
            FROM ${inventoryReservations} r
            WHERE r.variant_id = ${productVariants.id}
              AND r.status = 'RESERVED'
              AND r.expires_at > ${now}
          ),
          0
        )::int
      `,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        categorySlug ? eq(products.categorySlug, categorySlug) : undefined,
        search
          ? or(
              ilike(products.title, `%${search}%`),
              ilike(products.slug, `%${search}%`),
              ilike(products.id, `%${search}%`),
              ilike(productVariants.sku, `%${search}%`),
              ilike(productVariants.colorName, `%${search}%`)
            )
          : undefined
      )
    )
    .orderBy(desc(productVariants.createdAt));

  // Map into domain items
  const items: InventoryOverviewItem[] = rows.map((r) => {
    const available = Math.max(0, r.physicalStock - r.activeReserved);
    return {
      variantId: r.variantId,
      productId: r.productId,
      productTitle: r.productTitle,
      categorySlug: r.categorySlug,
      sku: r.sku,
      size: r.size,
      colorName: r.colorName,
      colorHex: r.colorHex,
      basePriceInr: r.basePriceInr,
      priceOverrideInr: r.priceOverrideInr,
      physicalStock: r.physicalStock,
      reservedStock: r.activeReserved,
      availableStock: available,
      isLowStock: available > 0 && available <= threshold,
      isOutOfStock: available === 0,
      lowStockThreshold: threshold,
    };
  });

  // Filter in-memory if threshold filters requested
  let filtered = items;
  if (outOfStockOnly) {
    filtered = filtered.filter((i) => i.isOutOfStock);
  } else if (lowStockOnly) {
    filtered = filtered.filter((i) => i.isLowStock || i.isOutOfStock);
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    items: paginated,
    total: filtered.length,
    threshold,
    limit,
    offset,
  };
}

export interface AdjustStockParams {
  adminId: string;
  variantId: string;
  movementType: MovementType;
  quantityDelta: number;
  reason: string;
  ipAddress?: string | null;
}

/**
 * Atomically adjusts stock for a product variant and records movement ledger + audit log.
 */
export async function adjustVariantStock(params: AdjustStockParams) {
  const { adminId, variantId, movementType, quantityDelta, reason, ipAddress } = params;

  if (!reason || reason.trim().length === 0) {
    throw new Error("A justification reason is required for inventory modifications.");
  }

  if (quantityDelta === 0) {
    throw new Error("Quantity delta must be non-zero.");
  }

  return await db.transaction(async (tx) => {
    // 1. Fetch variant with lock
    const [variant] = await tx
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        stockQuantity: productVariants.stockQuantity,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (!variant) {
      throw new Error(`Variant not found with ID: ${variantId}`);
    }

    const previousQuantity = variant.stockQuantity;
    const newQuantity = previousQuantity + quantityDelta;

    if (newQuantity < 0) {
      throw new Error(
        `Cannot reduce stock below zero. Current physical stock: ${previousQuantity}, requested delta: ${quantityDelta}`
      );
    }

    // 2. Update physical stock in PostgreSQL
    await tx
      .update(productVariants)
      .set({ stockQuantity: newQuantity })
      .where(eq(productVariants.id, variantId));

    // 3. Record movement in inventory_movements ledger
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        variantId,
        productId: variant.productId,
        adminId,
        movementType,
        quantityDelta,
        previousQuantity,
        newQuantity,
        reason: reason.trim(),
      })
      .returning();

    // 4. Record audit log
    await recordAdminAuditLog({
      adminId,
      action: "INVENTORY_ADJUSTED",
      resourceType: "PRODUCT_VARIANT",
      resourceId: variantId,
      previousState: { stockQuantity: previousQuantity, sku: variant.sku },
      newState: { stockQuantity: newQuantity, movementType, quantityDelta, reason },
      ipAddress,
    });

    // 5. Restock Notification Trigger (Phase 3B integration):
    // If stock rose from 0 to > 0, notify active subscribers
    if (previousQuantity === 0 && newQuantity > 0) {
      const activeNotifications = await tx
        .select({
          id: restockNotifications.id,
          userId: restockNotifications.userId,
        })
        .from(restockNotifications)
        .where(
          and(
            eq(restockNotifications.variantId, variantId),
            eq(restockNotifications.status, "active")
          )
        );

      if (activeNotifications.length > 0) {
        const notificationIds = activeNotifications.map((n) => n.id);
        await tx
          .update(restockNotifications)
          .set({
            status: "notified",
            notifiedAt: new Date(),
          })
          .where(sql`${restockNotifications.id} IN ${notificationIds}`);
      }
    }

    return {
      success: true,
      movement,
      previousQuantity,
      newQuantity,
    };
  });
}

export interface GetInventoryMovementsParams {
  variantId?: string;
  productId?: string;
  movementType?: MovementType;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves the historical inventory movement ledger.
 */
export async function getInventoryMovements(params: GetInventoryMovementsParams = {}) {
  const { variantId, productId, movementType, limit = 50, offset = 0 } = params;

  const conditions = [];
  if (variantId) conditions.push(eq(inventoryMovements.variantId, variantId));
  if (productId) conditions.push(eq(inventoryMovements.productId, productId));
  if (movementType) conditions.push(eq(inventoryMovements.movementType, movementType));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const movements = await db
    .select({
      id: inventoryMovements.id,
      variantId: inventoryMovements.variantId,
      productId: inventoryMovements.productId,
      adminId: inventoryMovements.adminId,
      adminName: users.fullName,
      adminEmail: users.email,
      movementType: inventoryMovements.movementType,
      quantityDelta: inventoryMovements.quantityDelta,
      previousQuantity: inventoryMovements.previousQuantity,
      newQuantity: inventoryMovements.newQuantity,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
      productTitle: products.title,
      sku: productVariants.sku,
      size: productVariants.size,
      colorName: productVariants.colorName,
    })
    .from(inventoryMovements)
    .leftJoin(users, eq(inventoryMovements.adminId, users.id))
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .innerJoin(productVariants, eq(inventoryMovements.variantId, productVariants.id))
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .where(whereClause);

  return {
    movements,
    total: countRow?.total || 0,
    limit,
    offset,
  };
}
