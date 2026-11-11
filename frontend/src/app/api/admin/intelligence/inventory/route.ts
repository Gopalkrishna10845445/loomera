import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { getInventoryIntelligence } from "@/lib/intelligence/inventory-intelligence";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const inventoryData = await getInventoryIntelligence();

    return NextResponse.json({
      success: true,
      data: inventoryData,
    });
  } catch (error) {
    console.error("Inventory Intelligence API error:", error);
    return NextResponse.json(
      { error: "Failed to compile inventory intelligence." },
      { status: 500 }
    );
  }
}
