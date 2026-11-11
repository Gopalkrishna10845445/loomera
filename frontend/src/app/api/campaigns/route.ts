import { NextResponse } from "next/server";
import { getActiveCampaigns } from "@/lib/marketing/campaign-service";

export async function GET() {
  try {
    const campaigns = await getActiveCampaigns();
    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch active campaigns";
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
