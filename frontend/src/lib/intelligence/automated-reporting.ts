/**
 * LOOMERA — Automated Business Reporting Engine
 * Generates Daily, Weekly, and Monthly executive reports, tracks historical generation in PostgreSQL,
 * and formats downloadable CSV/PDF-ready datasets.
 */

import { eq, sql, desc, and } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  scheduledReportRuns,
} from "@/db/schema";
import { getAuthoritativeBusinessOverview } from "./financial-metrics";
import { getInventoryIntelligence } from "./inventory-intelligence";
import { runBusinessAnomalyDetection } from "./anomaly-detection";

export type ReportType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface GeneratedReport {
  id?: string;
  reportType: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  executiveSummary: {
    grossRevenueInr: number;
    netRevenueInr: number;
    totalOrders: number;
    paidOrders: number;
    averageOrderValueInr: number;
    cancellationRatePercent: number;
    refundRatePercent: number;
    totalUnitsSold: number;
  };
  operationalHighlights: {
    lowStockAlertsCount: number;
    outOfStockCount: number;
    averageFulfilmentHours: number;
    delayedOrdersCount: number;
    anomaliesCount: number;
  };
  topSellingProducts: Array<{
    title: string;
    units: number;
    revenueInr: number;
  }>;
  anomaliesDetected: string[];
  recommendationsCount: number;
  csvExportPayload: string;
}

/**
 * Builds and records an executive business report for the requested period.
 */
export async function generateExecutiveReport(
  reportType: ReportType = "DAILY",
  persist: boolean = true
): Promise<GeneratedReport> {
  const now = new Date();
  let periodStart = new Date();
  const periodEnd = now;

  let title = "LOOMERA Daily Executive Briefing";

  if (reportType === "DAILY") {
    periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    title = `LOOMERA Daily Briefing — ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  } else if (reportType === "WEEKLY") {
    periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    title = `LOOMERA Weekly Commercial Report — Ending ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  } else if (reportType === "MONTHLY") {
    periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    title = `LOOMERA Monthly Performance Digest — ${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
  }

  // 1. Authoritative business overview for period
  const overview = await getAuthoritativeBusinessOverview({
    startDate: periodStart,
    endDate: periodEnd,
  });

  // 2. Units sold & top products in period
  const topProductsRows = await db
    .select({
      productTitle: orderItems.productTitle,
      units: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)::int`,
      revenue: sql<number>`COALESCE(SUM(${orderItems.lineTotalInr}), 0)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        sql`${orders.createdAt} >= ${periodStart} AND ${orders.createdAt} <= ${periodEnd}`,
        sql`${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`
      )
    )
    .groupBy(orderItems.productTitle)
    .orderBy(desc(sql`SUM(${orderItems.quantity})`))
    .limit(5);

  const topSellingProducts = topProductsRows.map((r) => ({
    title: r.productTitle,
    units: r.units,
    revenueInr: r.revenue,
  }));

  const totalUnitsSold = topProductsRows.reduce((acc, p) => acc + p.units, 0);

  // 3. Inventory and anomalies snapshot
  const inv = await getInventoryIntelligence();
  const anomalyScan = await runBusinessAnomalyDetection(false);

  const executiveSummary = {
    grossRevenueInr: overview.grossMerchandiseValueInr,
    netRevenueInr: overview.netRevenueInr,
    totalOrders: overview.totalOrders,
    paidOrders: overview.paidOrders,
    averageOrderValueInr: overview.averageOrderValueInr,
    cancellationRatePercent: overview.cancellationRatePercent,
    refundRatePercent: overview.refundRatePercent,
    totalUnitsSold,
  };

  const operationalHighlights = {
    lowStockAlertsCount: inv.reorderSoonCount,
    outOfStockCount: inv.criticalStockoutCount,
    averageFulfilmentHours: overview.averageFulfilmentHours,
    delayedOrdersCount: overview.delayedOrdersCount,
    anomaliesCount: anomalyScan.anomaliesDetectedCount,
  };

  // 4. Formatted CSV payload for export
  const csvLines = [
    "LOOMERA BUSINESS INTELLIGENCE REPORT",
    `Report Type,${reportType}`,
    `Period Start,${periodStart.toISOString()}`,
    `Period End,${periodEnd.toISOString()}`,
    `Generated At,${now.toISOString()}`,
    "",
    "EXECUTIVE FINANCIAL SUMMARY",
    `Gross Merchandise Value (INR),${executiveSummary.grossRevenueInr}`,
    `Net Revenue (INR),${executiveSummary.netRevenueInr}`,
    `Total Orders,${executiveSummary.totalOrders}`,
    `Paid Orders,${executiveSummary.paidOrders}`,
    `Average Order Value (INR),${executiveSummary.averageOrderValueInr}`,
    `Cancellation Rate (%),${executiveSummary.cancellationRatePercent}%`,
    `Refund Rate (%),${executiveSummary.refundRatePercent}%`,
    "",
    "OPERATIONS & INVENTORY HEALTH",
    `Critical Stockouts,${operationalHighlights.outOfStockCount}`,
    `Low Stock Variants Approaching Stockout,${operationalHighlights.lowStockAlertsCount}`,
    `Delayed Orders (>48h),${operationalHighlights.delayedOrdersCount}`,
    `Avg Fulfilment Dispatch (Hours),${operationalHighlights.averageFulfilmentHours}`,
    "",
    "TOP PERFORMING GARMENTS",
    "Product Title,Units Sold,Revenue (INR)",
    ...topSellingProducts.map((p) => `"${p.title.replace(/"/g, '""')}",${p.units},${p.revenueInr}`),
  ];

  const csvExportPayload = csvLines.join("\n");

  const report: GeneratedReport = {
    reportType,
    title,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    generatedAt: now.toISOString(),
    executiveSummary,
    operationalHighlights,
    topSellingProducts,
    anomaliesDetected: anomalyScan.alerts.map((a) => a.summary),
    recommendationsCount: inv.restockRecommendations.length,
    csvExportPayload,
  };

  // 5. Persist record in scheduled_report_runs
  if (persist) {
    try {
      const [inserted] = await db
        .insert(scheduledReportRuns)
        .values({
          reportType,
          periodStart,
          periodEnd,
          status: "GENERATED",
          summary: executiveSummary,
          metrics: {
            operationalHighlights,
            topSellingProducts,
            anomalies: report.anomaliesDetected,
          },
        })
        .returning({ id: scheduledReportRuns.id });

      if (inserted) {
        report.id = inserted.id;
      }
    } catch (err) {
      console.warn("Failed to persist scheduled report run:", err);
    }
  }

  return report;
}

/**
 * Retrieves the historical list of generated executive reports.
 */
export async function getHistoricalReportRuns(limit: number = 10): Promise<Array<{
  id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  summary: Record<string, unknown>;
  createdAt: string;
}>> {
  const rows = await db
    .select({
      id: scheduledReportRuns.id,
      reportType: scheduledReportRuns.reportType,
      periodStart: scheduledReportRuns.periodStart,
      periodEnd: scheduledReportRuns.periodEnd,
      status: scheduledReportRuns.status,
      summary: scheduledReportRuns.summary,
      createdAt: scheduledReportRuns.createdAt,
    })
    .from(scheduledReportRuns)
    .orderBy(desc(scheduledReportRuns.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    reportType: r.reportType,
    periodStart: new Date(r.periodStart).toISOString(),
    periodEnd: new Date(r.periodEnd).toISOString(),
    status: r.status,
    summary: (r.summary as Record<string, unknown>) || {},
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}
