import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  getBusinessSummaryMetrics,
  getSalesTimeline,
  getTopSellingProducts,
  getCategoryPerformance,
  getAdvancedBusinessAnalytics,
} from "@/lib/admin/analytics-service";
import { getAiIntelligenceAnalytics } from "@/lib/admin/ai-analytics-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const [summary, timeline, topProducts, categories, aiIntelligence, advanced] = await Promise.all([
      getBusinessSummaryMetrics(),
      getSalesTimeline(isNaN(days) ? 30 : days),
      getTopSellingProducts(5),
      getCategoryPerformance(),
      getAiIntelligenceAnalytics(),
      getAdvancedBusinessAnalytics(),
    ]);

    return NextResponse.json({
      summary,
      timeline,
      topProducts,
      categories,
      aiIntelligence,
      advanced,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { error: "Failed to compile business analytics." },
      { status: 500 }
    );
  }
}
