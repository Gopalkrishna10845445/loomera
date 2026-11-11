import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { processAdminRefund } from "@/lib/admin/order-admin-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const body = await req.json();
    const { amountInr, reason, restoreStock } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "A justification reason is required to process refunds." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const result = await processAdminRefund({
      orderId: id,
      amountInr,
      reason,
      restoreStock: restoreStock ?? true,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({
      ...result,
      message: `Refund of ₹${result.refundAmount} processed successfully.`,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin refund error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process refund." },
      { status: 400 }
    );
  }
}
