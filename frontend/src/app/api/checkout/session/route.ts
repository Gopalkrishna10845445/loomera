import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";
import { createCheckoutOrder } from "@/lib/orders/order-service";
import { getUserCart } from "@/lib/cart";
import { getRazorpayConfig } from "@/lib/payments/razorpay";
import { recordServerAttribution } from "@/lib/analytics/attribution";

export async function POST(req: NextRequest) {
  try {
    // 1. CSRF validation on mutation
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    // 2. IP Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`checkout-session-${ip}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many checkout requests. Please wait a moment." }, { status: 429 });
    }

    // 3. Authenticate customer
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json(
        { error: "Authentication required to initiate checkout. Please sign in." },
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

    const { shippingAddress, shippingMethod = "standard", notes, items: clientItems, couponCode } = body || {};

    if (!shippingAddress) {
      return NextResponse.json({ error: "Delivery shipping address is required" }, { status: 400 });
    }

    // 5. Determine items to checkout (authoritative cart or explicitly passed items)
    let itemsToCheckout = clientItems;
    if (!itemsToCheckout || !Array.isArray(itemsToCheckout) || itemsToCheckout.length === 0) {
      const userCart = await getUserCart(sessionData.user.id);
      if (userCart.length === 0) {
        return NextResponse.json({ error: "Your shopping bag is empty" }, { status: 400 });
      }
      itemsToCheckout = userCart.map((c) => ({
        productId: c.productId,
        size: c.size,
        color: c.color,
        quantity: c.quantity,
      }));
    }

    // 6. Create internal order and initiate Razorpay payment order
    const { order, razorpayOrder } = await createCheckoutOrder({
      userId: sessionData.user.id,
      items: itemsToCheckout,
      shippingAddress,
      shippingMethod,
      couponCode,
      notes,
    });

    // 7. Record acquisition attribution if available
    try {
      const attributionInput = body?.attribution || null;
      const cookieAttrStr = req.cookies.get("lmr_attr")?.value;
      let parsedCookieAttr: { vid?: string; src?: string; med?: string; cmp?: string } | null = null;
      if (cookieAttrStr) {
        try {
          parsedCookieAttr = JSON.parse(decodeURIComponent(cookieAttrStr));
        } catch {
          // ignore corrupted cookie
        }
      }

      const sessionId = attributionInput?.sessionId || req.cookies.get(SESSION_COOKIE_NAME)?.value || `session_${order.id}`;
      const visitorId = attributionInput?.visitorId || parsedCookieAttr?.vid || `visitor_${order.id}`;
      const utmSource = attributionInput?.utmSource || parsedCookieAttr?.src || null;
      const utmMedium = attributionInput?.utmMedium || parsedCookieAttr?.med || null;
      const utmCampaign = attributionInput?.utmCampaign || parsedCookieAttr?.cmp || null;

      await recordServerAttribution({
        orderId: order.id,
        sessionId,
        visitorId,
        userId: sessionData.user.id,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm: attributionInput?.utmTerm || null,
        utmContent: attributionInput?.utmContent || null,
        referrerUrl: attributionInput?.referrerUrl || req.headers.get("referer") || null,
        landingPage: attributionInput?.landingPage || null,
      });
    } catch (attrErr) {
      console.warn("Attribution recording non-fatal error:", attrErr);
    }

    const config = getRazorpayConfig();

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalInr: order.totalInr,
      subtotalInr: order.subtotalInr,
      discountInr: order.discountInr,
      shippingFeeInr: order.shippingFeeInr,
      currency: "INR",
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: config.keyId,
      amountPaise: razorpayOrder.amount,
      customer: {
        name: shippingAddress.fullName,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to initiate checkout session";
    console.error("POST /api/checkout/session error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
