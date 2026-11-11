import { NextRequest, NextResponse } from "next/server";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  recordProductView,
  getProductViewHistory,
  clearProductViewHistory,
  getCallerIdentity,
  attachAnonymousCookieIfNeeded,
} from "@/lib/history";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

// GET /api/history/views
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`views-get-${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { userId, sessionId, isNewSession } = await getCallerIdentity(req);
    const searchParams = req.nextUrl.searchParams;
    const dateFilter = (searchParams.get("dateFilter") || "all") as
      | "today"
      | "yesterday"
      | "last_7_days"
      | "all";
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    const history = await getProductViewHistory({
      userId,
      sessionId: userId ? undefined : sessionId,
      dateFilter,
      limit,
    });

    const res = NextResponse.json({
      success: true,
      history,
      isAuthenticated: !!userId,
    });

    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("GET /api/history/views error:", error);
    return NextResponse.json({ error: "Failed to retrieve view history" }, { status: 500 });
  }
}

// POST /api/history/views
export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`views-post-${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: { productId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body.productId !== "string" || !body.productId.trim()) {
      return NextResponse.json({ error: "Valid 'productId' is required" }, { status: 400 });
    }

    const { userId, sessionId, isNewSession } = await getCallerIdentity(req);

    const recorded = await recordProductView({
      productId: body.productId.trim(),
      userId,
      sessionId: userId ? undefined : sessionId,
    });

    if (!recorded) {
      return NextResponse.json(
        { error: "Product not found or unpublished" },
        { status: 404 }
      );
    }

    const res = NextResponse.json({ success: true });
    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("POST /api/history/views error:", error);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}

// DELETE /api/history/views
export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const { userId, sessionId } = await getCallerIdentity(req);
    await clearProductViewHistory({
      userId,
      sessionId: userId ? undefined : sessionId,
    });

    return NextResponse.json({ success: true, message: "Viewing history cleared" });
  } catch (error) {
    console.error("DELETE /api/history/views error:", error);
    return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
  }
}
