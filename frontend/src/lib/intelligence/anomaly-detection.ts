/**
 * LOOMERA — Business Anomaly Detection Engine
 * Proactively scans operational signals (revenue drops, order spikes, refund surges, payment failures, coupon spikes)
 * using explainable statistical rules and tracks alert lifecycles in PostgreSQL.
 */

import { eq, sql, and, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  payments,
  couponRedemptions,
  productVariants,
  businessAnomalies,
} from "@/db/schema";

export type AnomalyType =
  | "REVENUE_DROP"
  | "ORDER_SPIKE"
  | "REFUND_SURGE"
  | "CANCELLATION_SPIKE"
  | "INVENTORY_DISCREPANCY"
  | "PAYMENT_FAILURE_SPIKE"
  | "COUPON_BURNRATE_SPIKE";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AnomalyStatus = "DETECTED" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "FALSE_POSITIVE";

export interface BusinessAnomalyAlert {
  id?: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  metricName: string;
  currentValue: number;
  baselineValue: number;
  deviationPercent: number;
  status: AnomalyStatus;
  summary: string;
  supportingData: Record<string, unknown>;
  suggestedInvestigation: string;
  detectedAt: string;
}

export interface AnomalyScanSummary {
  anomaliesDetectedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  alerts: BusinessAnomalyAlert[];
  scannedAt: string;
}

/**
 * Scans the database for operational anomalies comparing recent performance against baseline.
 */
export async function runBusinessAnomalyDetection(
  persist: boolean = true
): Promise<AnomalyScanSummary> {
  const alerts: BusinessAnomalyAlert[] = [];
  const now = new Date();

  // --------------------------------------------------------------------------
  // 1. REVENUE DROP & ORDER SPIKE CHECK (Compare last 24h against 7d daily average)
  // --------------------------------------------------------------------------
  const [last24hRevenueRow] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]),
        sql`${orders.createdAt} >= NOW() - INTERVAL '24 hours'`
      )
    );

  const [prior7dRevenueRow] = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(
      and(
        notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]),
        sql`${orders.createdAt} >= NOW() - INTERVAL '8 days' AND ${orders.createdAt} < NOW() - INTERVAL '24 hours'`
      )
    );

  const current24hRev = last24hRevenueRow?.revenue || 0;
  const current24hOrders = last24hRevenueRow?.count || 0;
  const baselineDailyRev = Math.round((prior7dRevenueRow?.revenue || 0) / 7);
  const baselineDailyOrders = Math.round((prior7dRevenueRow?.count || 0) / 7);

  // Revenue drop detection (if baseline is meaningful and drop > 40%)
  if (baselineDailyRev >= 5000 && current24hRev < baselineDailyRev * 0.6) {
    const deviationPercent = Number(
      (((current24hRev - baselineDailyRev) / baselineDailyRev) * 100).toFixed(1)
    );
    alerts.push({
      anomalyType: "REVENUE_DROP",
      severity: Math.abs(deviationPercent) > 75 ? "CRITICAL" : "HIGH",
      metricName: "24h Gross Revenue (INR)",
      currentValue: current24hRev,
      baselineValue: baselineDailyRev,
      deviationPercent,
      status: "DETECTED",
      summary: `24-hour gross revenue (INR ${current24hRev.toLocaleString()}) declined ${Math.abs(deviationPercent)}% below 7-day average baseline (INR ${baselineDailyRev.toLocaleString()}).`,
      supportingData: { current24hRev, baselineDailyRev, current24hOrders, baselineDailyOrders },
      suggestedInvestigation:
        "Inspect storefront traffic analytics, payment gateway health, checkout abandonment rate, and top product availability.",
      detectedAt: now.toISOString(),
    });
  }

  // Order volume surge detection (> 2.5x baseline)
  if (baselineDailyOrders >= 3 && current24hOrders > baselineDailyOrders * 2.5) {
    const deviationPercent = Number(
      (((current24hOrders - baselineDailyOrders) / baselineDailyOrders) * 100).toFixed(1)
    );
    alerts.push({
      anomalyType: "ORDER_SPIKE",
      severity: "MEDIUM",
      metricName: "24h Order Volume",
      currentValue: current24hOrders,
      baselineValue: baselineDailyOrders,
      deviationPercent,
      status: "DETECTED",
      summary: `Sudden surge in order volume: ${current24hOrders} orders received in 24 hours vs daily baseline of ${baselineDailyOrders} (+${deviationPercent}%).`,
      supportingData: { current24hOrders, baselineDailyOrders, current24hRev },
      suggestedInvestigation:
        "Verify fulfillment workshop capacity, ensure packaging inventory is prepared, and check if an influencer campaign triggered the surge.",
      detectedAt: now.toISOString(),
    });
  }

  // --------------------------------------------------------------------------
  // 2. PAYMENT FAILURE SPIKE DETECTION
  // --------------------------------------------------------------------------
  const [paymentStats24h] = await db
    .select({
      totalAttempts: sql<number>`count(*)::int`,
      failedAttempts: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'FAILED' THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(payments)
    .where(sql`${payments.createdAt} >= NOW() - INTERVAL '24 hours'`);

  const totalAttempts = paymentStats24h?.totalAttempts || 0;
  const failedAttempts = paymentStats24h?.failedAttempts || 0;

  if (totalAttempts >= 5) {
    const failureRate = Number(((failedAttempts / totalAttempts) * 100).toFixed(1));
    const baselineFailureRate = 12.0; // standard benchmark

    if (failureRate > 30.0) {
      alerts.push({
        anomalyType: "PAYMENT_FAILURE_SPIKE",
        severity: failureRate > 50.0 ? "CRITICAL" : "HIGH",
        metricName: "24h Payment Gateway Failure Rate (%)",
        currentValue: failureRate,
        baselineValue: baselineFailureRate,
        deviationPercent: Number((failureRate - baselineFailureRate).toFixed(1)),
        status: "DETECTED",
        summary: `Elevated payment failure rate: ${failureRate}% (${failedAttempts} of ${totalAttempts} transactions failed).`,
        supportingData: { totalAttempts, failedAttempts, failureRate },
        suggestedInvestigation:
          "Check Razorpay webhook response codes, UPI bank outages in India, and client-side payment verification timeouts.",
        detectedAt: now.toISOString(),
      });
    }
  }

  // --------------------------------------------------------------------------
  // 3. REFUND & RETURN SURGE DETECTION
  // --------------------------------------------------------------------------
  const [refundCount7d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(
      and(
        sql`${payments.status} IN ('REFUNDED', 'PARTIALLY_REFUNDED')`,
        sql`${payments.createdAt} >= NOW() - INTERVAL '7 days'`
      )
    );

  const [orderCount7d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]),
        sql`${orders.createdAt} >= NOW() - INTERVAL '7 days'`
      )
    );

  const refunds7d = refundCount7d?.count || 0;
  const orders7d = orderCount7d?.count || 0;

  if (orders7d >= 10) {
    const refundRate = Number(((refunds7d / orders7d) * 100).toFixed(1));
    const baselineRefundRate = 5.0; // expected luxury benchmark

    if (refundRate > 15.0) {
      alerts.push({
        anomalyType: "REFUND_SURGE",
        severity: refundRate > 25.0 ? "HIGH" : "MEDIUM",
        metricName: "7-day Refund Rate (%)",
        currentValue: refundRate,
        baselineValue: baselineRefundRate,
        deviationPercent: Number((refundRate - baselineRefundRate).toFixed(1)),
        status: "DETECTED",
        summary: `7-day refund rate surged to ${refundRate}% (${refunds7d} refunds across ${orders7d} orders).`,
        supportingData: { refunds7d, orders7d, refundRate },
        suggestedInvestigation:
          "Inspect return inspection notes on recently shipped garment batches for recurring sizing or stitching defects.",
        detectedAt: now.toISOString(),
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. INVENTORY DISCREPANCY DETECTION
  // --------------------------------------------------------------------------
  const [negativeStockCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productVariants)
    .where(sql`${productVariants.stockQuantity} < 0`);

  if ((negativeStockCount?.count || 0) > 0) {
    alerts.push({
      anomalyType: "INVENTORY_DISCREPANCY",
      severity: "CRITICAL",
      metricName: "Negative Inventory Variants",
      currentValue: negativeStockCount?.count || 0,
      baselineValue: 0,
      deviationPercent: 100,
      status: "DETECTED",
      summary: `Critical inventory anomaly: ${negativeStockCount?.count} variant SKUs have negative stock quantities recorded.`,
      supportingData: { negativeVariants: negativeStockCount?.count },
      suggestedInvestigation:
        "Audit concurrent checkout reservations, race conditions in order creation, or manual adjustment errors.",
      detectedAt: now.toISOString(),
    });
  }

  // --------------------------------------------------------------------------
  // 5. COUPON BURN RATE / ABUSE DETECTION
  // --------------------------------------------------------------------------
  const [couponRedemptions24h] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(couponRedemptions)
    .where(sql`${couponRedemptions.redeemedAt} >= NOW() - INTERVAL '24 hours'`);

  const [couponRedemptionsPrior7d] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(couponRedemptions)
    .where(
      sql`${couponRedemptions.redeemedAt} >= NOW() - INTERVAL '8 days' AND ${couponRedemptions.redeemedAt} < NOW() - INTERVAL '24 hours'`
    );

  const currentCouponRedemptions = couponRedemptions24h?.count || 0;
  const baselineCouponRedemptions = Math.round((couponRedemptionsPrior7d?.count || 0) / 7);

  if (baselineCouponRedemptions >= 5 && currentCouponRedemptions > baselineCouponRedemptions * 3.0) {
    alerts.push({
      anomalyType: "COUPON_BURNRATE_SPIKE",
      severity: "HIGH",
      metricName: "24h Coupon Redemptions",
      currentValue: currentCouponRedemptions,
      baselineValue: baselineCouponRedemptions,
      deviationPercent: Number(
        (((currentCouponRedemptions - baselineCouponRedemptions) / baselineCouponRedemptions) * 100).toFixed(1)
      ),
      status: "DETECTED",
      summary: `Abnormal promo redemption velocity: ${currentCouponRedemptions} vouchers redeemed in 24 hours (baseline: ${baselineCouponRedemptions}/day).`,
      supportingData: { currentCouponRedemptions, baselineCouponRedemptions },
      suggestedInvestigation:
        "Check whether an influencer code has leaked to deal aggregator sites or if automated scrapers are applying codes.",
      detectedAt: now.toISOString(),
    });
  }

  // Severity counts
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;
  const highCount = alerts.filter((a) => a.severity === "HIGH").length;
  const mediumCount = alerts.filter((a) => a.severity === "MEDIUM").length;
  const lowCount = alerts.filter((a) => a.severity === "LOW").length;

  // Persist new anomalies if requested
  if (persist && alerts.length > 0) {
    for (const a of alerts) {
      try {
        const [inserted] = await db
          .insert(businessAnomalies)
          .values({
            anomalyType: a.anomalyType,
            severity: a.severity,
            metricName: a.metricName,
            currentValue: String(a.currentValue),
            baselineValue: String(a.baselineValue),
            deviationPercent: String(a.deviationPercent),
            status: a.status,
            summary: a.summary,
            supportingData: a.supportingData,
            suggestedInvestigation: a.suggestedInvestigation,
          })
          .returning({ id: businessAnomalies.id });
        if (inserted) {
          a.id = inserted.id;
        }
      } catch (err) {
        console.warn("Failed to insert business anomaly log:", err);
      }
    }
  }

  return {
    anomaliesDetectedCount: alerts.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    alerts,
    scannedAt: now.toISOString(),
  };
}

/**
 * Updates the status of an active business anomaly alert (e.g. ACKNOWLEDGED, RESOLVED).
 */
export async function updateAnomalyStatus(
  anomalyId: string,
  newStatus: AnomalyStatus
): Promise<boolean> {
  const updateData: { status: string; resolvedAt?: Date } = { status: newStatus };
  if (newStatus === "RESOLVED" || newStatus === "FALSE_POSITIVE") {
    updateData.resolvedAt = new Date();
  }

  const result = await db
    .update(businessAnomalies)
    .set(updateData)
    .where(eq(businessAnomalies.id, anomalyId))
    .returning({ id: businessAnomalies.id });

  return result.length > 0;
}
