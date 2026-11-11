import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getMarketingIntelligenceReport } from "@/lib/intelligence/marketing-intelligence";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const marketingReport = await getMarketingIntelligenceReport();

    return NextResponse.json({
      success: true,
      data: marketingReport,
    });
  } catch (error) {
    console.error("Marketing Intelligence API error:", error);
    return NextResponse.json(
      { error: "Failed to compile marketing intelligence." },
      { status: 500 }
    );
  }
}
