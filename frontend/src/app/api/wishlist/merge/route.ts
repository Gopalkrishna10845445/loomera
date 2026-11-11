import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { mergeAnonymousWishlist } from "@/lib/wishlist";
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
        { error: "Authentication required to merge wishlist." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const guestIdentifiers = body?.items || [];

    const wishlist = await mergeAnonymousWishlist(sessionData.user.id, guestIdentifiers);

    return NextResponse.json({
      wishlist,
      message: "Wishlist merged successfully.",
    });
  } catch (error) {
    console.error("Wishlist merge error:", error);
    return NextResponse.json(
      { error: "Failed to merge wishlist." },
      { status: 500 }
    );
  }
}
