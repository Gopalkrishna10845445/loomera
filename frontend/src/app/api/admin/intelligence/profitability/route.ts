import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getProductProfitabilityAnalysis } from "@/lib/intelligence/profitability-intelligence";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const profitability = await getProductProfitabilityAnalysis();

    return NextResponse.json({
      success: true,
      data: profitability,
    });
  } catch (error) {
    console.error("Product Profitability API error:", error);
    return NextResponse.json(
      { error: "Failed to compile product profitability analysis." },
      { status: 500 }
    );
  }
}
