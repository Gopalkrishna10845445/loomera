import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { toggleCouponStatus } from "@/lib/promotions/coupon-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const updated = await toggleCouponStatus({
      couponId: id,
      isActive: Boolean(isActive),
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update coupon";
    console.error("PATCH /api/admin/coupons/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
