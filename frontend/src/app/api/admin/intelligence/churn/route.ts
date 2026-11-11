import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getCustomerChurnAnalysis } from "@/lib/intelligence/churn-intelligence";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const churnRadar = await getCustomerChurnAnalysis();

    return NextResponse.json({
      success: true,
      data: churnRadar,
    });
  } catch (error) {
    console.error("Customer Churn Intelligence API error:", error);
    return NextResponse.json(
      { error: "Failed to compile customer churn analysis." },
      { status: 500 }
    );
  }
}
