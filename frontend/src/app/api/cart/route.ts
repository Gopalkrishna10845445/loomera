import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import {
  getUserCart,
  addItemToUserCart,
  updateUserCartItemQuantity,
  removeUserCartItem,
  clearUserCart,
} from "@/lib/cart";
import { calculateCartSubtotal } from "@/lib/pricing";
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

    const items = await getUserCart(user.id);
    const subtotal = calculateCartSubtotal(items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      items,
      subtotal,
      totalItems,
    });
  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cart." },
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
    const { productId, size, color, quantity } = body || {};

    if (!productId || !size || !color) {
      return NextResponse.json(
        { error: "Product ID, size, and color are required." },
        { status: 400 }
      );
    }

    try {
      await addItemToUserCart(user.id, {
        productId,
        size,
        color,
        quantity: quantity ?? 1,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid product or variant.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const items = await getUserCart(user.id);
    const subtotal = calculateCartSubtotal(items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      items,
      subtotal,
      totalItems,
      message: "Item added to cart.",
    });
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json(
      { error: "Failed to add item to cart." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const { productId, size, color, quantity } = body || {};

    if (!productId || !size || !color || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "Product ID, size, color, and numeric quantity are required." },
        { status: 400 }
      );
    }

    try {
      await updateUserCartItemQuantity(user.id, {
        productId,
        size,
        color,
        quantity,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update item quantity.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const items = await getUserCart(user.id);
    const subtotal = calculateCartSubtotal(items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      items,
      subtotal,
      totalItems,
    });
  } catch (error) {
    console.error("Cart PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update item quantity." },
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

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const size = searchParams.get("size");
    const color = searchParams.get("color");

    if (productId && size && color) {
      await removeUserCartItem(user.id, { productId, size, color });
    } else {
      // Clear entire cart
      await clearUserCart(user.id);
    }

    const items = await getUserCart(user.id);
    const subtotal = calculateCartSubtotal(items);
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return NextResponse.json({
      items,
      subtotal,
      totalItems,
    });
  } catch (error) {
    console.error("Cart DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to remove item from cart." },
      { status: 500 }
    );
  }
}
