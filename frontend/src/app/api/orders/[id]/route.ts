import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";
import { getUserOrderById } from "@/lib/orders/order-service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`order-detail-${ip}`, 60, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const order = await getUserOrderById(sessionData.user.id, id);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found or you do not have permission to access it" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to retrieve order details" }, { status: 500 });
  }
}
