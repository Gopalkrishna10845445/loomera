import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getAdminCoupons, createAdminCoupon } from "@/lib/promotions/coupon-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const couponsList = await getAdminCoupons();
    return NextResponse.json({ coupons: couponsList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch coupons";
    console.error("GET /api/admin/coupons error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const newCoupon = await createAdminCoupon({
      input: body,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, coupon: newCoupon }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create coupon";
    console.error("POST /api/admin/coupons error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
