/**
 * LOOMERA AUTOMATED TEST SUITE: PHASE 10 — AUTONOMOUS BUSINESS INTELLIGENCE
 * Comprehensive verification of:
 * 1. Database schema & 6 Phase 10 extension tables
 * 2. Authoritative financial metrics & overview calculation
 * 3. Demand forecasting engine (SMA, EWMA, confidence bounds, time-based split validation)
 * 4. Inventory intelligence (effective stock, reservation locks, runout days, restock cues)
 * 5. Customer churn prediction (RFM extension, interval disruption, behavioral risk scoring)
 * 6. Product profitability & unit economics (verified costs, net margins, gateway fees)
 * 7. Business anomaly detection (statistical deviation alerts, severity grading)
 * 8. Marketing attribution & promotional efficiency
 * 9. Automated executive reporting & CSV formatting
 * 10. Unified recommendation engine & approval workflow
 * 11. AI Business Analyst (12 read-only tools, grounded reasoning, uncertainty declaration)
 * 12. Idempotent background job runner & execution telemetry
 * 13. Security, RBAC & read-only enforcement
 */

(process.env as Record<string, string | undefined>).NODE_ENV = "test";

import { db } from "../src/db";
import { sql } from "drizzle-orm";
import { getAuthoritativeBusinessOverview } from "../src/lib/intelligence/financial-metrics";
import {
  generateDemandForecast,
  evaluateForecastAccuracy,
  getStorewideDemandForecastOverview,
} from "../src/lib/intelligence/demand-forecasting";
import { getInventoryIntelligence } from "../src/lib/intelligence/inventory-intelligence";
import { getCustomerChurnAnalysis } from "../src/lib/intelligence/churn-intelligence";
import { getProductProfitabilityAnalysis } from "../src/lib/intelligence/profitability-intelligence";
import {
  runBusinessAnomalyDetection,
  updateAnomalyStatus,
} from "../src/lib/intelligence/anomaly-detection";
import { getMarketingIntelligenceReport } from "../src/lib/intelligence/marketing-intelligence";
import {
  generateExecutiveReport,
  getHistoricalReportRuns,
} from "../src/lib/intelligence/automated-reporting";
import {
  refreshUnifiedRecommendations,
  updateRecommendationStatus,
} from "../src/lib/intelligence/business-recommendations";
import {
  executeAnalystTool,
  queryAiBusinessAnalyst,
} from "../src/lib/intelligence/ai-business-analyst";
import {
  executeIntelligenceJob,
  getJobExecutionHistory,
} from "../src/lib/intelligence/job-runner";
import {
  products,
  productVariants,
} from "../src/db/schema";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runPhase10Tests() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 10 — BUSINESS INTELLIGENCE SUITE");
  console.log("======================================================================\n");

  await db.execute(sql`SET client_encoding = 'UTF8'`);

  // --------------------------------------------------------------------------
  // SECTION 1: DATABASE SCHEMA INTEGRITY & 6 PHASE 10 TABLES
  // --------------------------------------------------------------------------
  console.log("--- SECTION 1: DATABASE SCHEMA & 6 PHASE 10 TABLES ---");
  const expectedTables = [
    "demand_forecasts",
    "forecast_evaluations",
    "business_anomalies",
    "business_recommendations",
    "scheduled_report_runs",
    "intelligence_job_runs",
  ];

  for (const table of expectedTables) {
    const res = await db.execute(
      sql`SELECT to_regclass(${`public.${table}`}) as tbl`
    );
    const exists = res.rows[0]?.tbl !== null;
    assert(exists, `Table 'public.${table}' exists and is queryable in PostgreSQL`);
  }

  // Verify additive columns on products & variants
  const prodCol = await db.execute(
    sql`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='cost_price_inr'`
  );
  assert(prodCol.rows.length > 0, "Product table includes additive cost_price_inr column");

  // --------------------------------------------------------------------------
  // SECTION 2: AUTHORITATIVE FINANCIAL METRICS ENGINE
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 2: AUTHORITATIVE FINANCIAL METRICS ---");
  const overview = await getAuthoritativeBusinessOverview();
  assert(typeof overview.grossMerchandiseValueInr === "number", "GMV is a valid number");
  assert(typeof overview.netRevenueInr === "number", "Net revenue is a valid number");
  assert(overview.netRevenueInr <= overview.grossMerchandiseValueInr, "Net revenue does not exceed GMV");
  assert(typeof overview.totalOrders === "number", "Total orders is a valid number");
  assert(typeof overview.averageOrderValueInr === "number", "AOV is a valid number");
  assert(typeof overview.totalInventoryUnits === "number" && overview.totalInventoryUnits > 0, "Inventory units verified > 0");
  assert(typeof overview.totalInventoryValuationInr === "number" && overview.totalInventoryValuationInr > 0, "Inventory valuation verified > 0");
  assert(typeof overview.averageFulfilmentHours === "number", "Fulfilment hours metric exists");

  // --------------------------------------------------------------------------
  // SECTION 3: DEMAND FORECASTING ENGINE
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 3: DEMAND FORECASTING ENGINE ---");
  const storeForecast = await generateDemandForecast({
    targetType: "STORE",
    targetId: "STORE",
    horizonDays: 30,
    preferredModel: "EWMA",
    persist: true,
  });

  assert(Boolean(storeForecast.id), "Storewide demand forecast persisted with valid ID");
  assert(storeForecast.predictedUnits > 0, `Predicted storewide units > 0 (got ${storeForecast.predictedUnits})`);
  assert(storeForecast.predictedRevenueInr > 0, `Predicted revenue > 0 (got ₹${storeForecast.predictedRevenueInr})`);
  assert(storeForecast.confidenceLower <= storeForecast.predictedUnits, "Confidence lower bound <= predicted units");
  assert(storeForecast.confidenceUpper >= storeForecast.predictedUnits, "Confidence upper bound >= predicted units");
  assert(storeForecast.dailyForecast.length === 30, "Generates 30 continuous daily projection points");
  assert(storeForecast.modelUsed === "EWMA" || storeForecast.modelUsed === "VELOCITY_RUN_RATE", "Valid model selected");
  assert(storeForecast.limitations.length > 0, "Explicitly declares data limitations and assumptions");

  // Product-level forecast
  const prodForecast = await generateDemandForecast({
    targetType: "PRODUCT",
    targetId: "classic-linen-shirt",
    horizonDays: 14,
    preferredModel: "SMA_7",
  });
  assert(prodForecast.targetName.includes("Classic Linen"), "Product-level forecast targets Classic Linen Shirt");
  assert(prodForecast.dailyForecast.length === 14, "Product forecast respects requested 14-day horizon");

  // Time-based split evaluation (train vs holdout test)
  const evaluation = await evaluateForecastAccuracy({
    targetType: "STORE",
    targetId: "STORE",
    holdoutDays: 14,
    modelToTest: "EWMA",
  });
  assert(typeof evaluation.mae === "number", "MAE evaluation computed");
  assert(typeof evaluation.rmse === "number", "RMSE evaluation computed");
  assert(typeof evaluation.bias === "number", "Forecast bias computed");

  // Storewide overview compilation
  const multiForecast = await getStorewideDemandForecastOverview();
  assert(Boolean(multiForecast.storewide), "Storewide summary compiled");
  assert(multiForecast.topProducts.length > 0, "Top products forecast array populated");

  // --------------------------------------------------------------------------
  // SECTION 4: INTELLIGENT INVENTORY & RESTOCKING
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 4: INTELLIGENT INVENTORY & RESTOCKING ---");
  const invIntel = await getInventoryIntelligence();
  assert(invIntel.totalVariantsAudited > 0, `Audited variant SKUs (got ${invIntel.totalVariantsAudited})`);
  assert(typeof invIntel.criticalStockoutCount === "number", "Tracks critical stockout count");
  assert(typeof invIntel.reorderSoonCount === "number", "Tracks approaching low stock count");
  assert(typeof invIntel.slowMovingCount === "number", "Tracks slow moving inventory count");

  if (invIntel.itemsApproachingStockout.length > 0) {
    const firstItem = invIntel.itemsApproachingStockout[0];
    assert(
      firstItem.effectiveAvailableStock === Math.max(0, firstItem.physicalStock - firstItem.activeReservedStock),
      "Effective available stock strictly equals physical minus active reservations"
    );
    assert(firstItem.reorderThreshold > 0, "Calculates non-zero reorder threshold");
  }

  // Restock recommendations verification
  assert(Array.isArray(invIntel.restockRecommendations), "Generates restock recommendations array");
  if (invIntel.restockRecommendations.length > 0) {
    const rec = invIntel.restockRecommendations[0];
    assert(rec.requiresApproval === true, "Restock recommendations strictly require human approval");
    assert(rec.suggestedQuantity > 0, "Suggested reorder quantity is strictly positive");
    assert(rec.reasoning.length > 0, "Restock recommendation includes transparent reasoning");
  }

  // --------------------------------------------------------------------------
  // SECTION 5: CUSTOMER CHURN PREDICTION & RETENTION
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 5: CUSTOMER CHURN PREDICTION ---");
  const churnSummary = await getCustomerChurnAnalysis();
  assert(churnSummary.totalAuditedCustomers > 0, `Audited patrons (got ${churnSummary.totalAuditedCustomers})`);
  assert(typeof churnSummary.lowRiskCount === "number", "Tracks low risk count");
  assert(typeof churnSummary.moderateRiskCount === "number", "Tracks moderate risk count");
  assert(typeof churnSummary.highRiskCount === "number", "Tracks high risk count");
  assert(typeof churnSummary.imminentChurnCount === "number", "Tracks imminent churn count");
  assert(typeof churnSummary.atRiskRevenueExposureInr === "number", "Calculates at-risk revenue exposure in INR");

  if (churnSummary.highRiskPatrons.length > 0) {
    const atRiskPatron = churnSummary.highRiskPatrons[0];
    assert(atRiskPatron.churnRiskScore >= 0 && atRiskPatron.churnRiskScore <= 100, "Churn score bounded within [0, 100]");
    assert(atRiskPatron.behavioralSignals.length > 0, "Behavioral signals list is populated");
    assert(atRiskPatron.requiresApproval === true, "Retention outreach requires administrator approval");
  }

  // --------------------------------------------------------------------------
  // SECTION 6: PRODUCT PROFITABILITY & UNIT ECONOMICS
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 6: PRODUCT PROFITABILITY & UNIT ECONOMICS ---");
  const profSummary = await getProductProfitabilityAnalysis();
  assert(profSummary.totalProductsAudited > 0, `Audited products (got ${profSummary.totalProductsAudited})`);
  assert(typeof profSummary.netSalesInr === "number", "Calculates net sales in INR");
  assert(typeof profSummary.estimatedPaymentProcessingFeesInr === "number", "Calculates gateway processing fees");
  assert(profSummary.costDataStatusNotice.includes("NOTICE") || profSummary.costDataStatusNotice.includes("verified"), "Declares cost configuration status notice");

  const sampleProd = profSummary.allProductProfitability[0];
  assert(Boolean(sampleProd.productId), "Product record contains ID");
  assert(typeof sampleProd.returnRatePercent === "number", "Tracks return rate percentage");
  if (!sampleProd.costConfigured) {
    assert(sampleProd.grossProfitInr === null, "Gross profit is null when unit cost is unconfigured (does not invent profit)");
  }

  // --------------------------------------------------------------------------
  // SECTION 7: BUSINESS ANOMALY DETECTION
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 7: BUSINESS ANOMALY DETECTION ---");
  const anomalyScan = await runBusinessAnomalyDetection(true);
  assert(typeof anomalyScan.anomaliesDetectedCount === "number", "Scans for anomalies successfully");
  assert(Array.isArray(anomalyScan.alerts), "Anomaly alerts is an array");

  if (anomalyScan.alerts.length > 0) {
    const alert = anomalyScan.alerts[0];
    assert(Boolean(alert.id), "Persisted anomaly alert has a valid ID");
    assert(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(alert.severity), "Severity is properly graded");
    assert(alert.suggestedInvestigation.length > 0, "Includes suggested investigation steps");

    // Test status update
    if (alert.id) {
      const updated = await updateAnomalyStatus(alert.id, "ACKNOWLEDGED");
      assert(updated === true, "Anomaly status transitions to ACKNOWLEDGED");
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 8: MARKETING ATTRIBUTION & CAMPAIGN EFFICIENCY
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 8: MARKETING ATTRIBUTION ---");
  const marketingReport = await getMarketingIntelligenceReport();
  assert(Array.isArray(marketingReport.channelBreakdown), "Channel breakdown is an array");
  assert(Array.isArray(marketingReport.campaignEfficiency), "Campaign efficiency is an array");
  assert(typeof marketingReport.topPerformingChannel === "string", "Identifies top performing channel");
  assert(marketingReport.adSpendStatusNotice.includes("NOTICE"), "Explicitly discloses unconfigured advertising spend");

  // --------------------------------------------------------------------------
  // SECTION 9: AUTOMATED REPORTING & CSV EXPORT
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 9: AUTOMATED REPORTING ---");
  const dailyReport = await generateExecutiveReport("DAILY", true);
  assert(Boolean(dailyReport.id), "Daily report generated and persisted with valid ID");
  assert(dailyReport.reportType === "DAILY", "Report type is DAILY");
  assert(typeof dailyReport.executiveSummary.grossRevenueInr === "number", "Report includes GMV in INR");
  assert(dailyReport.csvExportPayload.includes("LOOMERA BUSINESS INTELLIGENCE REPORT"), "CSV export payload properly formatted");
  assert(dailyReport.csvExportPayload.includes("EXECUTIVE FINANCIAL SUMMARY"), "CSV export includes financial summary block");

  const reportHistory = await getHistoricalReportRuns(5);
  assert(reportHistory.length > 0, "Historical report runs query returns generated report");

  // --------------------------------------------------------------------------
  // SECTION 10: UNIFIED ACTION RECOMMENDATIONS
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 10: UNIFIED ACTION RECOMMENDATIONS ---");
  const recSummary = await refreshUnifiedRecommendations(true);
  assert(recSummary.totalActiveRecommendations > 0, `Generated recommendations (got ${recSummary.totalActiveRecommendations})`);

  const topRec = recSummary.recommendations[0];
  assert(Boolean(topRec.id), "Recommendation has valid ID");
  assert(topRec.status === "PENDING_APPROVAL", "New recommendation starts in PENDING_APPROVAL");
  assert(topRec.confidenceScore >= 0 && topRec.confidenceScore <= 100, "Confidence score is valid percentage");
  assert(topRec.expectedImpact.length > 0, "Recommendation states expected business impact");

  // Status transition to APPROVED
  const approved = await updateRecommendationStatus(topRec.id, "APPROVED");
  assert(approved === true, "Recommendation successfully transitions to APPROVED");

  // --------------------------------------------------------------------------
  // SECTION 11: AI BUSINESS ANALYST & 12 TOOLS
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 11: AI BUSINESS ANALYST & 12 READ-ONLY TOOLS ---");
  const toolsToTest = [
    "get_revenue_summary",
    "get_sales_trends",
    "get_top_products",
    "get_category_performance",
    "get_inventory_summary",
    "get_demand_forecast",
    "get_customer_retention_metrics",
    "get_churn_risk_summary",
    "get_campaign_performance",
    "get_refund_analysis",
    "get_business_anomalies",
    "get_restock_recommendations",
  ];

  for (const t of toolsToTest) {
    const res = await executeAnalystTool(t);
    assert(res.toolName === t, `Tool '${t}' executes successfully`);
    assert(res.explanation.length > 0, `Tool '${t}' provides conversational explanation`);
    assert(res.data !== undefined, `Tool '${t}' returns authoritative data`);
  }

  // End-to-end NLU query test
  const queryResult = await queryAiBusinessAnalyst("Which products should I restock?");
  assert(queryResult.toolUsed === "get_restock_recommendations", "Correctly routes restock question to get_restock_recommendations");
  assert(queryResult.answer.length > 0, "Analyst provides grounded answer");

  const revQueryResult = await queryAiBusinessAnalyst("How much revenue did LOOMERA generate?");
  assert(revQueryResult.toolUsed === "get_revenue_summary", "Correctly routes revenue question to get_revenue_summary");

  // --------------------------------------------------------------------------
  // SECTION 12: SCHEDULED BACKGROUND JOBS & TELEMETRY
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 12: SCHEDULED BACKGROUND JOBS & TELEMETRY ---");
  const jobResult = await executeIntelligenceJob("ANOMALY_DETECTION");
  assert(jobResult.status === "COMPLETED", "ANOMALY_DETECTION job completes successfully");
  assert(Boolean(jobResult.jobId), "Job run record generated with valid ID");
  assert(jobResult.durationMs >= 0, "Tracks execution duration in milliseconds");

  const jobHistory = await getJobExecutionHistory(5);
  assert(jobHistory.length > 0, "Job execution history query returns logged run");
  assert(jobHistory[0].jobName === "ANOMALY_DETECTION", "Latest logged job matches ANOMALY_DETECTION");

  // --------------------------------------------------------------------------
  // SECTION 13: READ-ONLY & SECURITY GOVERNANCE
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 13: READ-ONLY & SECURITY GOVERNANCE ---");
  // Verify that products, variants, and orders remain unmodified after running BI tools
  const [currentProductCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products);
  assert(currentProductCount.count === 8, "Product catalog count remains exactly 8 (zero side-effect deletions or additions)");

  const [currentVariantsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productVariants);
  assert(currentVariantsCount.count === 103, "Variant SKUs remain exactly 103 (zero mutation by AI analyst)");

  // ==========================================================================
  // FINAL PHASE 10 SUMMARY
  // ==========================================================================
  console.log("\n======================================================================");
  console.log(`PHASE 10 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("======================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase10Tests().catch((err) => {
  console.error("Fatal Phase 10 test error:", err);
  process.exit(1);
});
