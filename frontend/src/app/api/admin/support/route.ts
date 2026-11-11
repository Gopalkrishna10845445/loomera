import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getAdminSupportQueue } from "@/lib/support/support-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const queue = await getAdminSupportQueue({ status, priority, limit, offset });
    return NextResponse.json({ tickets: queue });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch support queue";
    console.error("GET /api/admin/support error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
