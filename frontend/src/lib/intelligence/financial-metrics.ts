/**
 consolidated authoritative calculations for GMV, Net Revenue, Margins, Orders, and Operations.
 */

import { eq, sql, and, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  payments,
  products,
  productVariants,
  inventoryReservations,
  shipments,
} from "@/db/schema";
import { getLowStockThreshold } from "@/lib/admin/inventory-service";

export interface BusinessOverviewData {
  grossMerchandiseValueInr: number;
  netRevenueInr: number;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  cancellationRatePercent: number;
  refundedAmountInr: number;
  refundRatePercent: number;
  returnedOrdersCount: number;
  returnRatePercent: number;
  averageOrderValueInr: number;
  totalCustomers: number;
  returningCustomers: number;
  repeatPurchaseRatePercent: number;
  totalInventoryUnits: number;
  totalInventoryValuationInr: number;
  lowStockVariantCount: number;
  outOfStockVariantCount: number;
  averageFulfilmentHours: number;
  delayedOrdersCount: number;
  lastCalculatedAt: string;
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Computes authoritative financial & operational summary metrics from PostgreSQL tables.
 */
export async function getAuthoritativeBusinessOverview(
  dateFilter?: DateRangeFilter
): Promise<BusinessOverviewData> {
  const conditions = [notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"])];

  if (dateFilter?.startDate) {
    conditions.push(sql`${orders.createdAt} >= ${dateFilter.startDate}`);
  }
  if (dateFilter?.endDate) {
    conditions.push(sql`${orders.createdAt} <= ${dateFilter.endDate}`);
  }

  // 1. GMV & Orders
  const [revenueResult] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(...conditions));

  const grossMerchandiseValueInr = revenueResult?.grossRevenue || 0;
  const eligibleOrdersCount = revenueResult?.orderCount || 0;

  // 2. Paid orders & refunds
  const [paidResult] = await db
    .select({
      paidCount: sql<number>`count(distinct ${payments.orderId})::int`,
      refundedAmount: sql<number>`
        COALESCE(SUM(CASE WHEN ${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN ${payments.amountInr} ELSE 0 END), 0)::int
      `,
    })
    .from(payments)
    .where(eq(payments.status, "PAID"));

  const paidOrders = paidResult?.paidCount || 0;
  const refundedAmountInr = paidResult?.refundedAmount || 0;
  const netRevenueInr = Math.max(0, grossMerchandiseValueInr - refundedAmountInr);

  // 3. Total, cancelled, and returned orders
  const allOrderConditions = [];
  if (dateFilter?.startDate) {
    allOrderConditions.push(sql`${orders.createdAt} >= ${dateFilter.startDate}`);
  }
  if (dateFilter?.endDate) {
    allOrderConditions.push(sql`${orders.createdAt} <= ${dateFilter.endDate}`);
  }

  const [orderCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cancelled: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'CANCELLED' THEN 1 ELSE 0 END), 0)::int`,
      returned: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('RETURNED', 'REFUNDED', 'RETURN_REQUESTED') THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(orders)
    .where(allOrderConditions.length > 0 ? and(...allOrderConditions) : undefined);

  const totalOrders = orderCounts?.total || 0;
  const cancelledOrders = orderCounts?.cancelled || 0;
  const returnedOrdersCount = orderCounts?.returned || 0;

  const cancellationRatePercent =
    totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;
  const returnRatePercent =
    totalOrders > 0 ? Number(((returnedOrdersCount / totalOrders) * 100).toFixed(1)) : 0;

  // 4. Refund rate (orders with refunds / total orders)
  const [refundCountRow] = await db
    .select({ count: sql<number>`count(distinct ${payments.orderId})::int` })
    .from(payments)
    .where(sql`${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED')`);

  const refundedOrdersCount = refundCountRow?.count || 0;
  const refundRatePercent =
    totalOrders > 0 ? Number(((refundedOrdersCount / totalOrders) * 100).toFixed(1)) : 0;

  // 5. AOV
  const averageOrderValueInr =
    eligibleOrdersCount > 0 ? Math.round(grossMerchandiseValueInr / eligibleOrdersCount) : 0;

  // 6. Customers & Repeat Purchases
  const customerStats = await db
    .select({
      userId: orders.userId,
      ordersCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]))
    .groupBy(orders.userId);

  const totalCustomers = customerStats.length;
  const returningCustomers = customerStats.filter((c) => c.ordersCount > 1).length;
  const repeatPurchaseRatePercent =
    totalCustomers > 0 ? Number(((returningCustomers / totalCustomers) * 100).toFixed(1)) : 0;

  // 7. Inventory valuation & stock health
  const threshold = await getLowStockThreshold();
  const now = new Date();

  const variantStockRows = await db
    .select({
      stockQuantity: productVariants.stockQuantity,
      basePriceInr: products.basePriceInr,
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
    .innerJoin(products, eq(productVariants.productId, products.id));

  let totalInventoryUnits = 0;
  let totalInventoryValuationInr = 0;
  let lowStockVariantCount = 0;
  let outOfStockVariantCount = 0;

  for (const v of variantStockRows) {
    totalInventoryUnits += v.stockQuantity;
    totalInventoryValuationInr += v.stockQuantity * v.basePriceInr;
    const effectiveAvailable = Math.max(0, v.stockQuantity - v.activeReserved);
    if (effectiveAvailable === 0) {
      outOfStockVariantCount++;
    } else if (effectiveAvailable <= threshold) {
      lowStockVariantCount++;
    }
  }

  // 8. Fulfilment duration (hours)
  const [fulfillmentRow] = await db
    .select({
      avgHours: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${shipments.dispatchedAt} - ${orders.createdAt})) / 3600), 18)::int`,
    })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .where(sql`${shipments.dispatchedAt} IS NOT NULL`);

  const averageFulfilmentHours = fulfillmentRow?.avgHours || 18;

  // 9. Delayed orders (> 48h confirmed/processing without dispatch)
  const [delayedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('CONFIRMED', 'PROCESSING', 'PACKED')`,
        sql`${orders.createdAt} <= NOW() - INTERVAL '48 hours'`
      )
    );

  const delayedOrdersCount = delayedRow?.count || 0;

  return {
    grossMerchandiseValueInr,
    netRevenueInr,
    totalOrders,
    paidOrders,
    cancelledOrders,
    cancellationRatePercent,
    refundedAmountInr,
    refundRatePercent,
    returnedOrdersCount,
    returnRatePercent,
    averageOrderValueInr,
    totalCustomers,
    returningCustomers,
    repeatPurchaseRatePercent,
    totalInventoryUnits,
    totalInventoryValuationInr,
    lowStockVariantCount,
    outOfStockVariantCount,
    averageFulfilmentHours,
    delayedOrdersCount,
    lastCalculatedAt: new Date().toISOString(),
  };
}
