import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";
import { cancelUserOrder } from "@/lib/orders/order-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const { id } = await context.params;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`order-cancel-${ip}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    const { reason } = (body as { reason?: string }) || {};

    const result = await cancelUserOrder({
      userId: sessionData.user.id,
      orderId: id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to cancel order";
    console.error("POST /api/orders/[id]/cancel error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
