import { NextRequest, NextResponse } from "next/server";
import { recordServerAttribution } from "@/lib/analytics/attribution";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`attr-event-${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many attribution requests" }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      visitorId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrerUrl,
      landingPage,
    } = body || {};

    if (!sessionId || !visitorId) {
      return NextResponse.json({ error: "sessionId and visitorId are required" }, { status: 400 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);

    const record = await recordServerAttribution({
      sessionId,
      visitorId,
      userId: sessionData?.user?.id || null,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      referrerUrl,
      landingPage,
    });

    return NextResponse.json({ success: true, attributionId: record.id });
  } catch (error: unknown) {
    console.error("POST /api/analytics/attribution error:", error);
    return NextResponse.json({ error: "Failed to record attribution" }, { status: 500 });
  }
}
