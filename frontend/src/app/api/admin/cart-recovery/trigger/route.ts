import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  scanForAbandonedCarts,
  dispatchCartRecoveryReminder,
} from "@/lib/marketing/cart-recovery-service";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json().catch(() => ({}));
    const { idleHours = 2, discountCode = "WELCOMEBACK10" } = body || {};

    const abandoned = await scanForAbandonedCarts({ idleHours });
    const results = [];

    for (const item of abandoned) {
      if (item.status === "DORMANT") {
        const dispatchResult = await dispatchCartRecoveryReminder({
          cartId: item.cartId,
          customerEmail: item.customerEmail,
          customerName: item.customerName || undefined,
          userId: item.userId,
          discountCode,
        });
        results.push({ cartId: item.cartId, ...dispatchResult });
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: abandoned.length,
      dispatchedCount: results.filter((r) => r.success).length,
      details: results,
    });
  } catch (error) {
    console.error("Admin trigger cart recovery error:", error);
    return NextResponse.json(
      { error: "Failed to trigger cart recovery batch." },
      { status: 500 }
    );
  }
}
