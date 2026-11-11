import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { validateAndCalculateCouponDiscount } from "@/lib/promotions/coupon-service";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    const userId = sessionData?.user.id || "";

    const body = await req.json();
    const { code, subtotalInr, items } = body || {};

    if (!code || typeof subtotalInr !== "number") {
      return NextResponse.json({ error: "Code and subtotalInr are required" }, { status: 400 });
    }

    const result = await validateAndCalculateCouponDiscount({
      code,
      userId,
      subtotalInr,
      items: items || [],
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to validate coupon";
    console.error("POST /api/coupons/validate error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
