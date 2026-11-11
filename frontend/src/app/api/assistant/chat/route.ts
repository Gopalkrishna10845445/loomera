import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";
import { orchestrateAssistant } from "@/lib/ai/orchestrator";
import { ChatMessage, AssistantFilters } from "@/lib/ai/types";
import { getCallerIdentity, attachAnonymousCookieIfNeeded } from "@/lib/history";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateResult = checkAssistantRateLimit(ip, 30, 60 * 1000);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please pause a moment before consulting our concierge again.",
          retryAfter: rateResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateResult.resetInSeconds),
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // 2. Parse & Validate Payload
    let body: {
      message?: unknown;
      history?: unknown;
      filters?: unknown;
      contextProductId?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Field 'message' is required and must be a string." },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    if (message.length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty." },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message exceeds 500 characters limit." },
        { status: 400 }
      );
    }

    const history = Array.isArray(body.history)
      ? (body.history as ChatMessage[]).slice(-10) // Retain last 10 turns
      : [];

    const filters = (typeof body.filters === "object" && body.filters !== null
      ? body.filters
      : {}) as AssistantFilters;

    const contextProductId =
      typeof body.contextProductId === "string" ? body.contextProductId.trim() : undefined;

    // 3. Resolve Identity & Optional Patron Authentication Personalization
    const { userId, sessionId, isNewSession } = await getCallerIdentity(req);
    let patronName: string | undefined;

    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (sessionToken) {
      const auth = await validateSession(sessionToken);
      if (auth && auth.user && auth.user.fullName) {
        patronName = auth.user.fullName.split(" ")[0]; // First name
      }
    }

    // 4. Orchestrate Response
    const result = await orchestrateAssistant({
      query: message,
      history,
      filters,
      patronName,
      userId,
      sessionId,
      contextProductId,
    });

    const res = NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );

    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("Error in /api/assistant/chat:", error);
    return NextResponse.json(
      {
        error: "Our atelier concierge encountered an unexpected issue. Please try again.",
      },
      { status: 500 }
    );
  }
}
