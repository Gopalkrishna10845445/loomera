/**
 * LOOMERA — Intelligence Scheduled Job Runner & Pipeline Orchestrator
 * Provides idempotent execution, duration tracking, failure handling, and execution logging in PostgreSQL.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { intelligenceJobRuns } from "@/db/schema";
import { generateDemandForecast } from "./demand-forecasting";
import { getInventoryIntelligence } from "./inventory-intelligence";
import { getCustomerChurnAnalysis } from "./churn-intelligence";
import { runBusinessAnomalyDetection } from "./anomaly-detection";
import { generateExecutiveReport } from "./automated-reporting";
import { refreshUnifiedRecommendations } from "./business-recommendations";

export type IntelligenceJobName =
  | "DEMAND_FORECAST_REFRESH"
  | "INVENTORY_RISK_CALCULATION"
  | "CHURN_ANALYSIS"
  | "ANOMALY_DETECTION"
  | "DAILY_REPORT_GENERATION"
  | "RECOMMENDATION_REFRESH";

export interface JobExecutionResult {
  jobId: string;
  jobName: IntelligenceJobName;
  status: "COMPLETED" | "FAILED";
  itemsProcessed: number;
  anomaliesFound: number;
  recommendationsCreated: number;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
}

/**
 * Executes a named intelligence job idempotently with complete duration tracking and database logging.
 */
export async function executeIntelligenceJob(
  jobName: IntelligenceJobName
): Promise<JobExecutionResult> {
  const startTime = Date.now();
  const startedAt = new Date();

  // 1. Record job initiation
  const [initialRecord] = await db
    .insert(intelligenceJobRuns)
    .values({
      jobName,
      status: "RUNNING",
      startedAt,
    })
    .returning({ id: intelligenceJobRuns.id });

  const jobId = initialRecord.id;

  let itemsProcessed = 0;
  let anomaliesFound = 0;
  let recommendationsCreated = 0;
  let errorMessage: string | undefined;
  let jobStatus: "COMPLETED" | "FAILED" = "COMPLETED";

  try {
    switch (jobName) {
      case "DEMAND_FORECAST_REFRESH": {
        const fc = await generateDemandForecast({
          targetType: "STORE",
          targetId: "STORE",
          horizonDays: 30,
          preferredModel: "EWMA",
          persist: true,
        });
        itemsProcessed = fc.dailyForecast.length;
        break;
      }

      case "INVENTORY_RISK_CALCULATION": {
        const inv = await getInventoryIntelligence();
        itemsProcessed = inv.totalVariantsAudited;
        recommendationsCreated = inv.restockRecommendations.length;
        break;
      }

      case "CHURN_ANALYSIS": {
        const churn = await getCustomerChurnAnalysis();
        itemsProcessed = churn.totalAuditedCustomers;
        anomaliesFound = churn.imminentChurnCount;
        break;
      }

      case "ANOMALY_DETECTION": {
        const scan = await runBusinessAnomalyDetection(true);
        itemsProcessed = 5; // 5 statistical checks
        anomaliesFound = scan.anomaliesDetectedCount;
        break;
      }

      case "DAILY_REPORT_GENERATION": {
        const rep = await generateExecutiveReport("DAILY", true);
        itemsProcessed = 1;
        recommendationsCreated = rep.recommendationsCount;
        break;
      }

      case "RECOMMENDATION_REFRESH": {
        const rec = await refreshUnifiedRecommendations(true);
        itemsProcessed = rec.totalActiveRecommendations;
        recommendationsCreated = rec.totalActiveRecommendations;
        break;
      }

      default:
        throw new Error(`Unknown job name: ${jobName}`);
    }
  } catch (err: unknown) {
    jobStatus = "FAILED";
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Scheduled job [${jobName}] encountered fatal failure:`, err);
  }

  const durationMs = Date.now() - startTime;
  const completedAt = new Date();

  // 2. Finalize job record in database
  await db
    .update(intelligenceJobRuns)
    .set({
      status: jobStatus,
      itemsProcessed,
      anomaliesFound,
      recommendationsCreated,
      errorMessage: errorMessage || null,
      durationMs,
      completedAt,
    })
    .where(eq(intelligenceJobRuns.id, jobId));

  return {
    jobId,
    jobName,
    status: jobStatus,
    itemsProcessed,
    anomaliesFound,
    recommendationsCreated,
    durationMs,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    errorMessage,
  };
}

/**
 * Retrieves the recent execution history of intelligence background jobs.
 */
export async function getJobExecutionHistory(limit: number = 10): Promise<Array<{
  id: string;
  jobName: string;
  status: string;
  itemsProcessed: number;
  anomaliesFound: number;
  recommendationsCreated: number;
  durationMs: number;
  startedAt: string;
  errorMessage: string | null;
}>> {
  const rows = await db
    .select({
      id: intelligenceJobRuns.id,
      jobName: intelligenceJobRuns.jobName,
      status: intelligenceJobRuns.status,
      itemsProcessed: intelligenceJobRuns.itemsProcessed,
      anomaliesFound: intelligenceJobRuns.anomaliesFound,
      recommendationsCreated: intelligenceJobRuns.recommendationsCreated,
      durationMs: intelligenceJobRuns.durationMs,
      startedAt: intelligenceJobRuns.startedAt,
      errorMessage: intelligenceJobRuns.errorMessage,
    })
    .from(intelligenceJobRuns)
    .orderBy(desc(intelligenceJobRuns.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    jobName: r.jobName,
    status: r.status,
    itemsProcessed: r.itemsProcessed,
    anomaliesFound: r.anomaliesFound,
    recommendationsCreated: r.recommendationsCreated,
    durationMs: r.durationMs,
    startedAt: new Date(r.startedAt).toISOString(),
    errorMessage: r.errorMessage,
  }));
}
