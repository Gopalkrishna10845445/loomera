import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getAdminAuditLogs } from "@/lib/admin/audit";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const resourceType = searchParams.get("resourceType") || undefined;
    const resourceId = searchParams.get("resourceId") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getAdminAuditLogs({
      resourceType,
      resourceId,
      action,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin get audit logs error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
