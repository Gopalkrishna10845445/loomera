import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getLoyaltyProfile, awardReferralBonus } from "@/lib/loyalty/loyalty-service";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const profile = await getLoyaltyProfile(sessionData.user.id);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch loyalty profile";
    console.error("GET /api/loyalty error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { referralCode } = body || {};

    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const result = await awardReferralBonus(referralCode, sessionData.user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to claim referral bonus";
    console.error("POST /api/loyalty error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
