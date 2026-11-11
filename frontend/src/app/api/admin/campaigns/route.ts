import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getAdminCampaigns, createAdminCampaign } from "@/lib/marketing/campaign-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const campaigns = await getAdminCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch campaigns";
    console.error("GET /api/admin/campaigns error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const newCampaign = await createAdminCampaign({
      input: body,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, campaign: newCampaign }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create campaign";
    console.error("POST /api/admin/campaigns error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
