import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getAdminCustomers } from "@/lib/admin/customer-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getAdminCustomers({ search, role, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin get customers error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve customers." },
      { status: 500 }
    );
  }
}
