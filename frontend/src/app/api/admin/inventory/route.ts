import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getInventoryOverview,
  adjustVariantStock,
  MovementType,
} from "@/lib/admin/inventory-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categorySlug = searchParams.get("category") || undefined;
    const lowStockOnly = searchParams.get("lowStock") === "true";
    const outOfStockOnly = searchParams.get("outOfStock") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getInventoryOverview({
      search,
      categorySlug,
      lowStockOnly,
      outOfStockOnly,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin get inventory error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve inventory." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const { variantId, movementType, quantityDelta, reason } = body;

    if (!variantId || !movementType || typeof quantityDelta !== "number" || !reason) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (variantId, movementType, quantityDelta, reason).",
        },
        { status: 400 }
      );
    }

    const validMovements: MovementType[] = [
      "STOCK_ADDED",
      "STOCK_REMOVED",
      "STOCK_ADJUSTED",
      "DAMAGED_STOCK",
      "RETURN_RECEIVED",
    ];

    if (!validMovements.includes(movementType)) {
      return NextResponse.json(
        {
          error: `Invalid movement type. Permitted: ${validMovements.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const result = await adjustVariantStock({
      adminId: auth.user.id,
      variantId,
      movementType,
      quantityDelta,
      reason,
      ipAddress,
    });

    return NextResponse.json({
      ...result,
      message: `Stock successfully updated from ${result.previousQuantity} to ${result.newQuantity}.`,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin adjust stock error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to adjust inventory." },
      { status: 400 }
    );
  }
}
