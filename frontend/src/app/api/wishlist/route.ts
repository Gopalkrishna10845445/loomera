import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import {
  getUserWishlist,
  addToUserWishlist,
  removeFromUserWishlist,
} from "@/lib/wishlist";
import { isRequestOriginValid } from "@/lib/auth/csrf";

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionData = await validateSession(token);
  return sessionData ? sessionData.user : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const wishlist = await getUserWishlist(user.id);
    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve wishlist." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-site request rejected." },
        { status: 403 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const identifier = body?.productTitle || body?.productId;

    if (!identifier) {
      return NextResponse.json(
        { error: "Product title or ID is required." },
        { status: 400 }
      );
    }

    const wishlist = await addToUserWishlist(user.id, identifier);
    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json(
      { error: "Failed to add item to wishlist." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-site request rejected." },
        { status: 403 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    let identifier: string | null = null;
    try {
      const body = await req.json();
      identifier = body?.productTitle || body?.productId;
    } catch {
      // If no JSON body, check search params
    }

    if (!identifier) {
      const { searchParams } = new URL(req.url);
      identifier = searchParams.get("productTitle") || searchParams.get("productId");
    }

    if (!identifier) {
      return NextResponse.json(
        { error: "Product title or ID is required." },
        { status: 400 }
      );
    }

    const wishlist = await removeFromUserWishlist(user.id, identifier);
    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove item from wishlist." },
      { status: 500 }
    );
  }
}
