import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getAuthoritativeBusinessOverview } from "@/lib/intelligence/financial-metrics";
import { getStorewideDemandForecastOverview } from "@/lib/intelligence/demand-forecasting";
import { getInventoryIntelligence } from "@/lib/intelligence/inventory-intelligence";
import { getCustomerChurnAnalysis } from "@/lib/intelligence/churn-intelligence";
import { runBusinessAnomalyDetection } from "@/lib/intelligence/anomaly-detection";
import { refreshUnifiedRecommendations } from "@/lib/intelligence/business-recommendations";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const [overview, forecasts, inventory, churn, anomalies, recommendations] =
      await Promise.all([
        getAuthoritativeBusinessOverview(),
        getStorewideDemandForecastOverview(),
        getInventoryIntelligence(),
        getCustomerChurnAnalysis(),
        runBusinessAnomalyDetection(false),
        refreshUnifiedRecommendations(false),
      ]);

    return NextResponse.json({
      success: true,
      businessOverview: overview,
      predictiveOverview: {
        forecastSummary: {
          storewide30dUnits: forecasts.storewide.predictedUnits,
          storewide30dRevenueInr: forecasts.storewide.predictedRevenueInr,
          confidenceLevel: forecasts.storewide.confidenceLevel,
        },
        inventoryRisks: {
          criticalStockouts: inventory.criticalStockoutCount,
          reorderSoonCount: inventory.reorderSoonCount,
          slowMovingCount: inventory.slowMovingCount,
        },
        churnRisks: {
          imminentChurnCount: churn.imminentChurnCount,
          highRiskCount: churn.highRiskCount,
          atRiskRevenueExposureInr: churn.atRiskRevenueExposureInr,
        },
        anomaliesSummary: {
          detectedCount: anomalies.anomaliesDetectedCount,
          criticalCount: anomalies.criticalCount,
        },
      },
      actionRecommendations: recommendations.recommendations.slice(0, 5),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI Command Center Overview API error:", error);
    return NextResponse.json(
      { error: "Failed to compile command center overview." },
      { status: 500 }
    );
  }
}
