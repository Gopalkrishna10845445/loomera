/**
 * LOOMERA — Product Profitability & Unit Economics Engine
 * Evaluates verified business costs (selling price, discounts, refunds, payment processing, shipping)
 * and distinguishes between gross revenue, gross profit, and net contribution margin.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  orderItems,
  orders,
  returnItems,
} from "@/db/schema";

export interface ProductProfitabilityRecord {
  productId: string;
  productTitle: string;
  categorySlug: string;
  unitsSold: number;
  grossSalesInr: number;
  discountsAllocatedInr: number;
  refundsInr: number;
  netSalesInr: number;
  unitCostInr: number | null;
  totalCostOfGoodsSoldInr: number | null;
  grossProfitInr: number | null;
  grossMarginPercent: number | null;
  estimatedPaymentGatewayFeeInr: number; // ~2% standard payment fee
  estimatedShippingFeeInr: number;
  contributionMarginInr: number | null;
  contributionMarginPercent: number | null;
  returnUnitsCount: number;
  returnRatePercent: number;
  costConfigured: boolean;
  notes: string;
}

export interface StoreProfitabilitySummary {
  grossSalesInr: number;
  discountsInr: number;
  refundsInr: number;
  netSalesInr: number;
  estimatedPaymentProcessingFeesInr: number;
  totalUnitsSold: number;
  totalProductsAudited: number;
  costDataConfiguredCount: number;
  unconfiguredCostCount: number;
  costDataStatusNotice: string;
  topProfitableProducts: ProductProfitabilityRecord[];
  lowestMarginProducts: ProductProfitabilityRecord[];
  highReturnProducts: ProductProfitabilityRecord[];
  allProductProfitability: ProductProfitabilityRecord[];
  generatedAt: string;
}

/**
 * Computes deep unit economics and profitability analysis per product.
 */
export async function getProductProfitabilityAnalysis(): Promise<StoreProfitabilitySummary> {
  // 1. Fetch all active products with unit cost configuration
  const productList = await db
    .select({
      id: products.id,
      title: products.title,
      categorySlug: products.categorySlug,
      basePriceInr: products.basePriceInr,
      costPriceInr: products.costPriceInr,
    })
    .from(products)
    .where(eq(products.isPublished, true));

  let storeGrossSalesInr = 0;
  let storeDiscountsInr = 0;
  let storeRefundsInr = 0;
  let storeNetSalesInr = 0;
  let storePaymentFeesInr = 0;
  let storeUnitsSold = 0;
  let costDataConfiguredCount = 0;
  let unconfiguredCostCount = 0;

  const productRecords: ProductProfitabilityRecord[] = [];

  for (const p of productList) {
    // A. Sales & Line Totals
    const [salesRow] = await db
      .select({
        units: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)::int`,
        grossRevenue: sql<number>`COALESCE(SUM(${orderItems.lineTotalInr}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        sql`${orderItems.productId} = ${p.id} AND ${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`
      );

    const unitsSold = salesRow?.units || 0;
    const grossSalesInr = salesRow?.grossRevenue || 0;

    // B. Pro-rated order discounts
    const [discountRow] = await db
      .select({
        orderDiscount: sql<number>`
          COALESCE(SUM(${orders.discountInr}), 0)::int
        `,
        orderTotal: sql<number>`
          COALESCE(SUM(${orders.subtotalInr}), 1)::int
        `,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        sql`${orderItems.productId} = ${p.id} AND ${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`
      );

    const discountsAllocatedInr =
      grossSalesInr > 0 && discountRow?.orderTotal
        ? Math.round(
            (grossSalesInr / Math.max(1, discountRow.orderTotal)) *
              (discountRow.orderDiscount || 0)
          )
        : 0;

    // C. Returns & Refunds
    const [returnsRow] = await db
      .select({
        returnUnits: sql<number>`count(*)::int`,
      })
      .from(returnItems)
      .innerJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
      .where(eq(orderItems.productId, p.id));

    const returnUnitsCount = returnsRow?.returnUnits || 0;
    const returnRatePercent =
      unitsSold > 0 ? Number(((returnUnitsCount / unitsSold) * 100).toFixed(1)) : 0;

    // Approximate refund amount by returned units * basePrice
    const refundsInr = returnUnitsCount * p.basePriceInr;
    const netSalesInr = Math.max(0, grossSalesInr - discountsAllocatedInr - refundsInr);

    // D. Operating Costs (Payment processing: 2% Razorpay standard fee; Shipping: ~₹100/order unit)
    const estimatedPaymentGatewayFeeInr = Math.round(netSalesInr * 0.02);
    const estimatedShippingFeeInr = unitsSold * 100;

    // E. Unit Cost & Profit Margins
    const costConfigured = p.costPriceInr !== null && p.costPriceInr > 0;
    let unitCostInr: number | null = null;
    let totalCostOfGoodsSoldInr: number | null = null;
    let grossProfitInr: number | null = null;
    let grossMarginPercent: number | null = null;
    let contributionMarginInr: number | null = null;
    let contributionMarginPercent: number | null = null;
    let notes = "";

    if (costConfigured && p.costPriceInr !== null) {
      costDataConfiguredCount++;
      unitCostInr = p.costPriceInr;
      totalCostOfGoodsSoldInr = unitsSold * unitCostInr;
      grossProfitInr = netSalesInr - totalCostOfGoodsSoldInr;
      grossMarginPercent =
        netSalesInr > 0 ? Number(((grossProfitInr / netSalesInr) * 100).toFixed(1)) : 0;

      const directCosts =
        totalCostOfGoodsSoldInr + estimatedPaymentGatewayFeeInr + estimatedShippingFeeInr;
      contributionMarginInr = netSalesInr - directCosts;
      contributionMarginPercent =
        netSalesInr > 0 ? Number(((contributionMarginInr / netSalesInr) * 100).toFixed(1)) : 0;

      notes = `Unit COGS verified at ₹${unitCostInr}. Contribution margin accounts for 2% gateway and courier delivery.`;
    } else {
      unconfiguredCostCount++;
      notes =
        "Unit manufacturing/purchasing cost not yet provided. Financial metrics report net sales; gross profit calculation requires unit cost entry.";
    }

    storeGrossSalesInr += grossSalesInr;
    storeDiscountsInr += discountsAllocatedInr;
    storeRefundsInr += refundsInr;
    storeNetSalesInr += netSalesInr;
    storePaymentFeesInr += estimatedPaymentGatewayFeeInr;
    storeUnitsSold += unitsSold;

    productRecords.push({
      productId: p.id,
      productTitle: p.title,
      categorySlug: p.categorySlug || "apparel",
      unitsSold,
      grossSalesInr,
      discountsAllocatedInr,
      refundsInr,
      netSalesInr,
      unitCostInr,
      totalCostOfGoodsSoldInr,
      grossProfitInr,
      grossMarginPercent,
      estimatedPaymentGatewayFeeInr,
      estimatedShippingFeeInr,
      contributionMarginInr,
      contributionMarginPercent,
      returnUnitsCount,
      returnRatePercent,
      costConfigured,
      notes,
    });
  }

  // Segmentations
  const topProfitableProducts = [...productRecords]
    .sort((a, b) => (b.grossProfitInr ?? b.netSalesInr) - (a.grossProfitInr ?? a.netSalesInr))
    .slice(0, 5);

  const lowestMarginProducts = [...productRecords]
    .filter((p) => p.grossMarginPercent !== null)
    .sort((a, b) => (a.grossMarginPercent ?? 0) - (b.grossMarginPercent ?? 0))
    .slice(0, 5);

  const highReturnProducts = [...productRecords]
    .filter((p) => p.returnRatePercent > 0)
    .sort((a, b) => b.returnRatePercent - a.returnRatePercent)
    .slice(0, 5);

  const costDataStatusNotice =
    costDataConfiguredCount === 0
      ? "NOTICE: Unit manufacturing costs (COGS) are currently unconfigured for products. Contribution margins and gross profits require unit cost specifications; reporting focuses on verified net sales and operational fees."
      : `${costDataConfiguredCount} of ${productList.length} products have verified unit costs configured.`;

  return {
    grossSalesInr: storeGrossSalesInr,
    discountsInr: storeDiscountsInr,
    refundsInr: storeRefundsInr,
    netSalesInr: storeNetSalesInr,
    estimatedPaymentProcessingFeesInr: storePaymentFeesInr,
    totalUnitsSold: storeUnitsSold,
    totalProductsAudited: productList.length,
    costDataConfiguredCount,
    unconfiguredCostCount,
    costDataStatusNotice,
    topProfitableProducts,
    lowestMarginProducts,
    highReturnProducts,
    allProductProfitability: productRecords,
    generatedAt: new Date().toISOString(),
  };
}
