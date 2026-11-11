import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getInventoryMovements, MovementType } from "@/lib/admin/inventory-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const movementType = (searchParams.get("movementType") as MovementType) || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getInventoryMovements({
      variantId,
      productId,
      movementType,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin get inventory movements error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve inventory movements." },
      { status: 500 }
    );
  }
}
