/**
 * LOOMERA — Intelligent Inventory & Restocking Decision Support Engine
 * Evaluates real-time effective stock (physical - active reservations), sales velocity, coverage days,
 * and recommends restocking decisions with human approval governance.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productVariants,
  inventoryReservations,
  orderItems,
  orders,
} from "@/db/schema";
import { getLowStockThreshold } from "@/lib/admin/inventory-service";

export type InventoryUrgencyLevel = "CRITICAL_STOCKOUT" | "REORDER_SOON" | "HEALTHY" | "SLOW_MOVING" | "EXCESS_STOCK";

export interface VariantStockIntelligence {
  variantId: string;
  productId: string;
  productTitle: string;
  sku: string;
  size: string;
  colorName: string;
  physicalStock: number;
  activeReservedStock: number;
  effectiveAvailableStock: number;
  sellingPriceInr: number;
  averageDailySales: number;
  salesVelocityTrend: "SURGING" | "STABLE" | "DECLINING";
  stockCoverageDays: number | null; // null if 0 sales velocity
  estimatedStockoutDate: string | null;
  reorderThreshold: number;
  suggestedReorderQuantity: number;
  urgency: InventoryUrgencyLevel;
  supplierLeadTimeDays: number | null;
  supplierDataAvailable: boolean;
  notes: string;
}

export interface RestockRecommendation {
  id: string;
  variantId: string;
  productId: string;
  garmentName: string;
  sku: string;
  size: string;
  color: string;
  effectiveStock: number;
  stockCoverageDays: number;
  suggestedQuantity: number;
  urgency: InventoryUrgencyLevel;
  reasoning: string;
  confidence: string;
  requiresApproval: boolean;
}

export interface InventoryIntelligenceSummary {
  totalVariantsAudited: number;
  criticalStockoutCount: number;
  reorderSoonCount: number;
  slowMovingCount: number;
  healthyCount: number;
  itemsApproachingStockout: VariantStockIntelligence[];
  slowMovingItems: VariantStockIntelligence[];
  restockRecommendations: RestockRecommendation[];
  generatedAt: string;
}

/**
 * Computes deep inventory velocity, runout days, and restock metrics for all variants.
 */
export async function getInventoryIntelligence(): Promise<InventoryIntelligenceSummary> {
  const lowStockThreshold = await getLowStockThreshold();
  const now = new Date();

  // 1. Fetch all variants with product metadata and active reservation locks
  const variantRows = await db
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      productTitle: products.title,
      sku: productVariants.sku,
      size: productVariants.size,
      colorName: productVariants.colorName,
      stockQuantity: productVariants.stockQuantity,
      basePriceInr: products.basePriceInr,
      priceOverrideInr: productVariants.priceOverrideInr,
      supplierLeadTimeDays: products.supplierLeadTimeDays,
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
      // 30-day units sold
      unitsSold30d: sql<number>`
        COALESCE(
          (
            SELECT SUM(oi.quantity)
            FROM ${orderItems} oi
            INNER JOIN ${orders} o ON oi.order_id = o.id
            WHERE oi.variant_id = ${productVariants.id}
              AND o.status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
              AND o.created_at >= NOW() - INTERVAL '30 days'
          ),
          0
        )::int
      `,
      // 7-day units sold (for short-term velocity comparison)
      unitsSold7d: sql<number>`
        COALESCE(
          (
            SELECT SUM(oi.quantity)
            FROM ${orderItems} oi
            INNER JOIN ${orders} o ON oi.order_id = o.id
            WHERE oi.variant_id = ${productVariants.id}
              AND o.status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
              AND o.created_at >= NOW() - INTERVAL '7 days'
          ),
          0
        )::int
      `,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(products.isArchived, false));

  const allIntelligence: VariantStockIntelligence[] = [];
  const restockRecommendations: RestockRecommendation[] = [];

  let criticalStockoutCount = 0;
  let reorderSoonCount = 0;
  let slowMovingCount = 0;
  let healthyCount = 0;

  for (const v of variantRows) {
    const physicalStock = v.stockQuantity;
    const activeReservedStock = v.activeReserved;
    const effectiveAvailableStock = Math.max(0, physicalStock - activeReservedStock);
    const sellingPriceInr = v.priceOverrideInr || v.basePriceInr;

    // Velocity
    const ads30d = Number((v.unitsSold30d / 30).toFixed(2));
    const ads7d = Number((v.unitsSold7d / 7).toFixed(2));
    const averageDailySales = Math.max(ads30d, ads7d * 0.7); // blended ADS

    // Trend
    let salesVelocityTrend: "SURGING" | "STABLE" | "DECLINING" = "STABLE";
    if (ads7d > ads30d * 1.3 && ads7d > 0.3) {
      salesVelocityTrend = "SURGING";
    } else if (ads30d > 0 && ads7d < ads30d * 0.6) {
      salesVelocityTrend = "DECLINING";
    }

    // Stock Coverage Days
    let stockCoverageDays: number | null = null;
    let estimatedStockoutDate: string | null = null;

    if (averageDailySales > 0) {
      stockCoverageDays = Math.round(effectiveAvailableStock / averageDailySales);
      const runoutDate = new Date(now.getTime() + stockCoverageDays * 24 * 60 * 60 * 1000);
      estimatedStockoutDate = runoutDate.toISOString().split("T")[0];
    }

    // Reorder threshold & Suggested Reorder Quantity
    // Reorder Point (ROP) = (Lead Time * ADS) + Safety Stock
    const assumedLeadTimeDays = v.supplierLeadTimeDays || 14;
    const safetyStock = Math.max(5, Math.round(lowStockThreshold));
    const reorderThreshold = Math.round(averageDailySales * assumedLeadTimeDays) + safetyStock;

    // Urgency categorization
    let urgency: InventoryUrgencyLevel = "HEALTHY";
    let notes = "";

    if (effectiveAvailableStock === 0) {
      urgency = "CRITICAL_STOCKOUT";
      criticalStockoutCount++;
      notes = "Garment is completely out of stock. Immediate artisan batch commission recommended.";
    } else if (
      effectiveAvailableStock <= lowStockThreshold ||
      (stockCoverageDays !== null && stockCoverageDays <= 10)
    ) {
      urgency = "REORDER_SOON";
      reorderSoonCount++;
      notes = `Stock coverage down to ${stockCoverageDays ?? "unknown"} days based on recent demand velocity.`;
    } else if (effectiveAvailableStock > 80 && (stockCoverageDays === null || stockCoverageDays > 120)) {
      urgency = "EXCESS_STOCK";
      slowMovingCount++;
      notes = "Excess stock relative to current sales velocity (>120 days coverage).";
    } else if (v.unitsSold30d === 0 && physicalStock > 30) {
      urgency = "SLOW_MOVING";
      slowMovingCount++;
      notes = "Zero units sold over previous 30-day window.";
    } else {
      urgency = "HEALTHY";
      healthyCount++;
      notes = "Stock coverage is well balanced within optimal turnover buffer.";
    }

    // Suggested reorder quantity (orders to restore 45-day target buffer)
    const targetBufferDays = 45;
    const targetInventory = Math.max(20, Math.round(Math.max(averageDailySales, 0.5) * targetBufferDays));
    const suggestedReorderQuantity =
      effectiveAvailableStock < reorderThreshold
        ? Math.max(15, targetInventory - effectiveAvailableStock)
        : 0;

    const supplierDataAvailable = v.supplierLeadTimeDays !== null;

    const intelItem: VariantStockIntelligence = {
      variantId: v.variantId,
      productId: v.productId,
      productTitle: v.productTitle,
      sku: v.sku,
      size: v.size,
      colorName: v.colorName,
      physicalStock,
      activeReservedStock,
      effectiveAvailableStock,
      sellingPriceInr,
      averageDailySales,
      salesVelocityTrend,
      stockCoverageDays,
      estimatedStockoutDate,
      reorderThreshold,
      suggestedReorderQuantity,
      urgency,
      supplierLeadTimeDays: v.supplierLeadTimeDays,
      supplierDataAvailable,
      notes,
    };

    allIntelligence.push(intelItem);

    // If approaching stockout, generate a formal restock recommendation
    if (urgency === "CRITICAL_STOCKOUT" || urgency === "REORDER_SOON") {
      restockRecommendations.push({
        id: `rec_restock_${v.variantId.slice(0, 8)}`,
        variantId: v.variantId,
        productId: v.productId,
        garmentName: `${v.productTitle} (${v.colorName}, Size ${v.size})`,
        sku: v.sku,
        size: v.size,
        color: v.colorName,
        effectiveStock: effectiveAvailableStock,
        stockCoverageDays: stockCoverageDays ?? 0,
        suggestedQuantity: suggestedReorderQuantity,
        urgency,
        reasoning:
          effectiveAvailableStock === 0
            ? `Zero effective units remaining. Customer demand unfulfilled. Commission ${suggestedReorderQuantity} units.`
            : `Estimated ${stockCoverageDays} days of effective stock remaining (${effectiveAvailableStock} available units). Commission ${suggestedReorderQuantity} units to avoid stockout.`,
        confidence: supplierDataAvailable ? "High (Verified Lead Time)" : "Medium (Assumed 14-day Artisan Lead Time)",
        requiresApproval: true,
      });
    }
  }

  // Filter top critical and slow moving
  const itemsApproachingStockout = allIntelligence
    .filter((i) => i.urgency === "CRITICAL_STOCKOUT" || i.urgency === "REORDER_SOON")
    .sort((a, b) => a.effectiveAvailableStock - b.effectiveAvailableStock)
    .slice(0, 15);

  const slowMovingItems = allIntelligence
    .filter((i) => i.urgency === "SLOW_MOVING" || i.urgency === "EXCESS_STOCK")
    .sort((a, b) => b.effectiveAvailableStock - a.effectiveAvailableStock)
    .slice(0, 10);

  return {
    totalVariantsAudited: allIntelligence.length,
    criticalStockoutCount,
    reorderSoonCount,
    slowMovingCount,
    healthyCount,
    itemsApproachingStockout,
    slowMovingItems,
    restockRecommendations: restockRecommendations.slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
}
