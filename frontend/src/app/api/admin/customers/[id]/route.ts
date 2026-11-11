import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getAdminCustomerById, updateUserRole } from "@/lib/admin/customer-service";
import { UserRole } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const customer = await getAdminCustomerById(id);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Admin get customer error:", error);
    return NextResponse.json({ error: "Failed to retrieve customer." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    // Role modification requires SUPER_ADMIN privilege
    const superAuth = await requireSuperAdmin(req);
    if (!superAuth.authorized) {
      return rbacErrorResponse(superAuth);
    }

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    const validRoles: UserRole[] = ["CUSTOMER", "ADMIN", "SUPER_ADMIN"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const updated = await updateUserRole(id, role as UserRole, superAuth.user.id, ipAddress);

    return NextResponse.json({
      customer: updated,
      message: `User role successfully updated to ${role}.`,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update role error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update user role." },
      { status: 400 }
    );
  }
}
