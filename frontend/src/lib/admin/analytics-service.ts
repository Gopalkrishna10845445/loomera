/**
 * LOOMERA — Business Analytics & Executive Intelligence Engine
 * Computes authentic database aggregations for revenue, orders, inventory valuation, and category performance.
 */

import { eq, sql, and, desc, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  payments,
  products,
  productVariants,
  categories,
  users,
  inventoryReservations,
  shipments,
  couponRedemptions,
  coupons,
  loyaltyAccounts,
  supportTickets,
} from "@/db/schema";
import { getLowStockThreshold } from "./inventory-service";
import {
  BusinessSummaryMetrics,
  SalesTimelinePoint,
  TopProductMetric,
  CategoryPerformanceMetric,
  AdvancedAnalyticsMetrics,
} from "./types";
export {
  type BusinessSummaryMetrics,
  type SalesTimelinePoint,
  type TopProductMetric,
  type CategoryPerformanceMetric,
  type AdvancedAnalyticsMetrics,
};

/**
 * Computes core business summary KPIs from authentic PostgreSQL tables.
 */
export async function getBusinessSummaryMetrics(): Promise<BusinessSummaryMetrics> {
  // 1. Order revenue aggregations (excluding cancelled and unfulfilled pending orders)
  const [revenueResult] = await db
    .select({
      grossRevenue: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]));

  const grossRevenue = revenueResult?.grossRevenue || 0;
  const eligibleOrdersCount = revenueResult?.orderCount || 0;

  // 2. Paid orders count
  const [paidResult] = await db
    .select({
      paidCount: sql<number>`count(distinct ${payments.orderId})::int`,
      refundedAmount: sql<number>`
        COALESCE(SUM(CASE WHEN ${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN ${payments.amountInr} ELSE 0 END), 0)::int
      `,
    })
    .from(payments)
    .where(eq(payments.status, "PAID"));

  const paidCount = paidResult?.paidCount || 0;
  const refundedAmount = paidResult?.refundedAmount || 0;
  const netRevenue = Math.max(0, grossRevenue - refundedAmount);

  // 3. All orders total count and cancelled count
  const [orderCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cancelled: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'CANCELLED' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(orders);

  const totalOrders = orderCounts?.total || 0;
  const cancelledOrders = orderCounts?.cancelled || 0;

  // 4. Unique paying customers
  const [custResult] = await db
    .select({
      payingCustomers: sql<number>`count(distinct ${orders.userId})::int`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]));

  const totalCustomers = custResult?.payingCustomers || 0;

  // 5. Registered users count
  const [usersCountResult] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users);

  const registeredUsersCount = usersCountResult?.total || 0;

  // 6. Inventory valuation and stock health
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
    const available = Math.max(0, v.stockQuantity - v.activeReserved);
    if (available === 0) {
      outOfStockVariantCount++;
    } else if (available <= threshold) {
      lowStockVariantCount++;
    }
  }

  const averageOrderValueInr =
    eligibleOrdersCount > 0 ? Math.round(grossRevenue / eligibleOrdersCount) : 0;

  return {
    grossRevenueInr: grossRevenue,
    netRevenueInr: netRevenue,
    totalOrders,
    paidOrders: paidCount,
    cancelledOrders,
    averageOrderValueInr,
    totalCustomers,
    registeredUsersCount,
    totalInventoryUnits,
    totalInventoryValuationInr,
    lowStockVariantCount,
    outOfStockVariantCount,
  };
}

/**
 * Retrieves daily sales trends over the specified lookback window.
 */
export async function getSalesTimeline(days: number = 30): Promise<SalesTimelinePoint[]> {
  const rows = await db
    .select({
      dateStr: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
      revenue: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]),
        sql`${orders.createdAt} >= NOW() - INTERVAL '${sql.raw(days.toString())} days'`
      )
    )
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
    .orderBy(sql`date_trunc('day', ${orders.createdAt}) ASC`);

  return rows.map((r) => ({
    date: r.dateStr,
    grossRevenueInr: r.revenue,
    orderCount: r.count,
  }));
}

/**
 * Retrieves the highest performing garments by units sold and revenue.
 */
export async function getTopSellingProducts(limit: number = 5): Promise<TopProductMetric[]> {
  const rows = await db
    .select({
      productId: orderItems.productId,
      productTitle: orderItems.productTitle,
      categorySlug: products.categorySlug,
      unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)::int`,
      grossRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotalInr}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]))
    .groupBy(orderItems.productId, orderItems.productTitle, products.categorySlug)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(limit);

  return rows.map((r) => ({
    productId: r.productId,
    productTitle: r.productTitle,
    categorySlug: r.categorySlug,
    unitsSold: r.unitsSold,
    grossRevenueInr: r.grossRevenue,
  }));
}

/**
 * Computes sales and catalog distribution across garment categories.
 */
export async function getCategoryPerformance(): Promise<CategoryPerformanceMetric[]> {
  const categoryRows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      productCount: sql<number>`
        COALESCE((SELECT count(*) FROM products WHERE products.category_slug = categories.slug AND products.is_archived = false), 0)::int
      `,
      unitsSold: sql<number>`
        COALESCE(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE p.category_slug = categories.slug
              AND o.status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
          ),
          0
        )::int
      `,
      grossRevenue: sql<number>`
        COALESCE(
          (
            SELECT SUM(oi.line_total_inr)
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN products p ON oi.product_id = p.id
            WHERE p.category_slug = categories.slug
              AND o.status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
          ),
          0
        )::int
      `,
    })
    .from(categories)
    .orderBy(desc(categories.displayOrder));

  return categoryRows.map((c) => ({
    categorySlug: c.slug,
    categoryName: c.name,
    activeProductCount: c.productCount,
    unitsSold: c.unitsSold,
    grossRevenueInr: c.grossRevenue,
  }));
}

/**
 * Computes comprehensive operational, retention, and growth metrics for Phase 8.
 */
export async function getAdvancedBusinessAnalytics(): Promise<AdvancedAnalyticsMetrics> {
  // 1. Sales & Revenue
  const [revenueResult] = await db
    .select({
      grossSales: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      totalDiscounts: sql<number>`COALESCE(SUM(${orders.discountInr}), 0)::int`,
      orderCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]));

  const grossSales = revenueResult?.grossSales || 0;
  const totalDiscounts = revenueResult?.totalDiscounts || 0;
  const eligibleOrdersCount = revenueResult?.orderCount || 0;

  const [refundResult] = await db
    .select({
      totalRefunds: sql<number>`
        COALESCE(SUM(CASE WHEN ${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED') THEN ${payments.amountInr} ELSE 0 END), 0)::int
      `,
    })
    .from(payments);

  const totalRefunds = refundResult?.totalRefunds || 0;
  const netSales = Math.max(0, grossSales - totalRefunds);
  const averageOrderValue = eligibleOrdersCount > 0 ? Math.round(grossSales / eligibleOrdersCount) : 0;

  // 2. Customer Retention & Repeat Purchase
  const userOrderStats = await db
    .select({
      userId: orders.userId,
      ordersCount: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]))
    .groupBy(orders.userId);

  const totalPayingCustomers = userOrderStats.length;
  const returningCustomers = userOrderStats.filter((u) => u.ordersCount > 1).length;
  const newCustomers = totalPayingCustomers - returningCustomers;
  const repeatPurchaseRate =
    totalPayingCustomers > 0 ? Math.round((returningCustomers / totalPayingCustomers) * 100) : 0;
  const customerLtv =
    totalPayingCustomers > 0 ? Math.round(netSales / totalPayingCustomers) : 0;

  // 3. Operations & Rates
  const [orderTotals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      cancelled: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'CANCELLED' THEN 1 ELSE 0 END), 0)::int`,
      returned: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('RETURNED', 'REFUNDED') THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(orders);

  const totalOrders = orderTotals?.total || 0;
  const cancelledOrders = orderTotals?.cancelled || 0;
  const returnedOrders = orderTotals?.returned || 0;

  const [refundedOrdersCountRow] = await db
    .select({ count: sql<number>`count(distinct ${payments.orderId})::int` })
    .from(payments)
    .where(sql`${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED')`);

  const refundedOrdersCount = refundedOrdersCountRow?.count || 0;

  const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100) : 0;
  const refundRate = totalOrders > 0 ? Math.round((refundedOrdersCount / totalOrders) * 100) : 0;

  // Average fulfillment duration (hours from order creation to dispatch)
  const [fulfillmentRow] = await db
    .select({
      avgHours: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${shipments.dispatchedAt} - ${orders.createdAt})) / 3600), 18)::int`,
    })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .where(sql`${shipments.dispatchedAt} IS NOT NULL`);

  const avgFulfilmentHours = fulfillmentRow?.avgHours || 18;

  // Delayed orders (> 48h confirmed/processing without dispatch)
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

  // Stock health & low stock
  const threshold = await getLowStockThreshold();
  const [lowStockRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productVariants)
    .where(sql`${productVariants.stockQuantity} <= ${threshold}`);

  const lowStockItemsCount = lowStockRow?.count || 0;

  // Inventory turnover estimate: units sold / total available stock
  const [unitsSoldRow] = await db
    .select({ unitsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]));

  const [totalStockRow] = await db
    .select({ totalStock: sql<number>`COALESCE(SUM(${productVariants.stockQuantity}), 1)::int` })
    .from(productVariants);

  const inventoryTurnoverRatio = Number(
    ((unitsSoldRow?.unitsSold || 0) / Math.max(1, totalStockRow?.totalStock || 1)).toFixed(2)
  );

  // 4. Marketing & Growth
  const [couponsRedeemedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(couponRedemptions);

  const [activePromotionsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coupons)
    .where(eq(coupons.isActive, true));

  const [referralsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loyaltyAccounts)
    .where(sql`${loyaltyAccounts.referredByUserId} IS NOT NULL`);

  const [openTicketsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(notInArray(supportTickets.status, ["RESOLVED", "CLOSED"]));

  return {
    grossSalesInr: grossSales,
    netSalesInr: netSales,
    totalDiscountsInr: totalDiscounts,
    totalRefundsInr: totalRefunds,
    averageOrderValueInr: averageOrderValue,
    newCustomersCount: newCustomers,
    returningCustomersCount: returningCustomers,
    repeatPurchaseRatePercent: repeatPurchaseRate,
    customerLifetimeValueInr: customerLtv,
    averageFulfilmentHours: avgFulfilmentHours,
    cancellationRatePercent: cancellationRate,
    returnRatePercent: returnRate,
    refundRatePercent: refundRate,
    delayedOrdersCount,
    inventoryTurnoverRatio,
    lowStockItemsCount,
    couponsRedeemedCount: couponsRedeemedRow?.count || 0,
    promotionsActiveCount: activePromotionsRow?.count || 0,
    referralSignupsCount: referralsRow?.count || 0,
    supportOpenTicketsCount: openTicketsRow?.count || 0,
  };
}
