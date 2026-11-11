import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  reviewAdminReturnRequest,
  processReturnRefundOrExchange,
} from "@/lib/returns/return-service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const body = await req.json();
    const { action, notes, inspectionNotes } = body || {};

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    if (action === "PROCESS_REFUND") {
      const result = await processReturnRefundOrExchange({
        returnId: id,
        inspectionNotes: inspectionNotes || "Garment inspected and approved at atelier",
        adminId: auth.user.id,
        ipAddress,
      });
      return NextResponse.json({ success: true, returnRequest: result });
    }

    if (action === "APPROVE" || action === "REJECT") {
      const result = await reviewAdminReturnRequest({
        returnId: id,
        action,
        notes,
        adminId: auth.user.id,
        ipAddress,
      });
      return NextResponse.json({ success: true, returnRequest: result });
    }

    return NextResponse.json({ error: "Invalid action. Supported: APPROVE, REJECT, PROCESS_REFUND" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process return";
    console.error("PATCH /api/admin/returns/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
