import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  scanForAbandonedCarts,
  getCartRecoveryMetrics,
} from "@/lib/marketing/cart-recovery-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const idleHours = parseInt(searchParams.get("idleHours") || "2", 10);

    const [abandonedCarts, metrics] = await Promise.all([
      scanForAbandonedCarts({ idleHours }),
      getCartRecoveryMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      abandonedCarts,
      metrics,
    });
  } catch (error) {
    console.error("Admin get cart recovery error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cart recovery intelligence." },
      { status: 500 }
    );
  }
}
