import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  generateDemandForecast,
  getStorewideDemandForecastOverview,
  evaluateForecastAccuracy,
  ForecastTargetType,
  ForecastModelType,
} from "@/lib/intelligence/demand-forecasting";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const targetType = (searchParams.get("targetType") || "STORE") as ForecastTargetType;
    const targetId = searchParams.get("targetId") || "STORE";
    const horizonDays = parseInt(searchParams.get("horizonDays") || "30", 10);
    const model = (searchParams.get("model") || "EWMA") as ForecastModelType;
    const evaluate = searchParams.get("evaluate") === "true";

    if (searchParams.get("overview") === "true") {
      const overview = await getStorewideDemandForecastOverview();
      return NextResponse.json({ success: true, overview });
    }

    const forecast = await generateDemandForecast({
      targetType,
      targetId,
      horizonDays: isNaN(horizonDays) ? 30 : horizonDays,
      preferredModel: model,
    });

    let evaluation = null;
    if (evaluate) {
      evaluation = await evaluateForecastAccuracy({
        targetType,
        targetId,
        holdoutDays: 14,
        modelToTest: model,
      });
    }

    return NextResponse.json({
      success: true,
      forecast,
      evaluation,
    });
  } catch (error) {
    console.error("Demand Forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to generate demand forecast." },
      { status: 500 }
    );
  }
}
