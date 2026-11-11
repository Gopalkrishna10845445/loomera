import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { updateAdminCampaign, deleteAdminCampaign } from "@/lib/marketing/campaign-service";

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
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const updated = await updateAdminCampaign({
      campaignId: id,
      updates: body,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update campaign";
    console.error("PATCH /api/admin/campaigns/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const deleted = await deleteAdminCampaign({
      campaignId: id,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, deletedCampaign: deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete campaign";
    console.error("DELETE /api/admin/campaigns/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
