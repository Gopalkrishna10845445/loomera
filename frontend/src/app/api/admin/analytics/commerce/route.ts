import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getExecutiveCommerceReport } from "@/lib/admin/commerce-intelligence";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const report = await getExecutiveCommerceReport();
    return NextResponse.json({ success: true, ...report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate commerce intelligence report";
    console.error("GET /api/admin/analytics/commerce error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
