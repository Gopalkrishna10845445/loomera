import { NextRequest, NextResponse } from "next/server";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  recordSearchQuery,
  getCustomerSearchHistory,
  clearCustomerSearchHistory,
  getCallerIdentity,
  attachAnonymousCookieIfNeeded,
} from "@/lib/history";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

// GET /api/history/searches
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`searches-get-${ip}`, 60, 60000);
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
    const queryFilter = searchParams.get("queryFilter") || undefined;
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    const searches = await getCustomerSearchHistory({
      userId,
      sessionId: userId ? undefined : sessionId,
      dateFilter,
      queryFilter,
      limit,
    });

    const res = NextResponse.json({
      success: true,
      searches,
      isAuthenticated: !!userId,
    });

    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("GET /api/history/searches error:", error);
    return NextResponse.json({ error: "Failed to retrieve search history" }, { status: 500 });
  }
}

// POST /api/history/searches
export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`searches-post-${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: { query?: unknown; filters?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "Valid non-empty 'query' is required" }, { status: 400 });
    }

    const { userId, sessionId, isNewSession } = await getCallerIdentity(req);

    const filters =
      body.filters && typeof body.filters === "object"
        ? (body.filters as Record<string, unknown>)
        : undefined;

    await recordSearchQuery({
      query: body.query.trim(),
      filters,
      userId,
      sessionId: userId ? undefined : sessionId,
    });

    const res = NextResponse.json({ success: true });
    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("POST /api/history/searches error:", error);
    return NextResponse.json({ error: "Failed to record search" }, { status: 500 });
  }
}

// DELETE /api/history/searches
export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const { userId, sessionId } = await getCallerIdentity(req);
    await clearCustomerSearchHistory({
      userId,
      sessionId: userId ? undefined : sessionId,
    });

    return NextResponse.json({ success: true, message: "Search history cleared" });
  } catch (error) {
    console.error("DELETE /api/history/searches error:", error);
    return NextResponse.json({ error: "Failed to clear search history" }, { status: 500 });
  }
}
