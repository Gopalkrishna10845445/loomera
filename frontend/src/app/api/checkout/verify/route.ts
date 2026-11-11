import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";
import { confirmOrderPayment } from "@/lib/orders/order-service";
import { recordRecoveryConversionByUser } from "@/lib/marketing/cart-recovery-service";

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF validation on mutation
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    // 2. IP Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`checkout-verify-${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many payment verification requests" }, { status: 429 });
    }

    // 3. Authenticate customer
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json(
        { error: "Authentication required to verify payment" },
        { status: 401 }
      );
    }

    // 4. Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { orderId, paymentId, signature } = body || {};

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: "Missing required payment verification parameters (orderId, paymentId, signature)" },
        { status: 400 }
      );
    }

    // 5. Verify payment signature and commit inventory
    const result = await confirmOrderPayment({
      orderId,
      paymentId,
      signature,
      rawPayload: body,
    });

    // 6. Check and mark abandoned cart recovery if applicable
    try {
      await recordRecoveryConversionByUser(sessionData.user.id, result.order.id);
    } catch (recErr) {
      console.warn("Cart recovery conversion non-fatal warning:", recErr);
    }

    return NextResponse.json({
      success: true,
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      status: result.order.status,
      message: "Payment successfully verified and order confirmed.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    console.error("POST /api/checkout/verify error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
