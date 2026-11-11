import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getCustomerRfmAnalysis } from "@/lib/loyalty/rfm-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const analysis = await getCustomerRfmAnalysis();
    return NextResponse.json({ success: true, ...analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to compute RFM analysis";
    console.error("GET /api/admin/customers/rfm error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
