import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { mergeAnonymousCart } from "@/lib/cart";
import { calculateCartSubtotal } from "@/lib/pricing";
import { isRequestOriginValid } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-site request rejected." },
        { status: 403 }
      );
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);

    if (!sessionData) {
      return NextResponse.json(
        { error: "Authentication required to merge cart." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const guestItems = body?.items || [];

    const items = await mergeAnonymousCart(sessionData.user.id, guestItems);
    const subtotal = calculateCartSubtotal(items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      items,
      subtotal,
      totalItems,
      message: "Cart merged successfully.",
    });
  } catch (error) {
    console.error("Cart merge error:", error);
    return NextResponse.json(
      { error: "Failed to merge cart." },
      { status: 500 }
    );
  }
}
