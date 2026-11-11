import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  refreshUnifiedRecommendations,
  updateRecommendationStatus,
  RecommendationStatus,
} from "@/lib/intelligence/business-recommendations";
import { db } from "@/db";
import { businessRecommendations } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const refresh = searchParams.get("refresh") === "true";

    if (refresh) {
      const summary = await refreshUnifiedRecommendations(true);
      return NextResponse.json({ success: true, summary });
    }

    // Return stored recommendations from DB, or synthesize if empty
    const rows = await db
      .select()
      .from(businessRecommendations)
      .orderBy(desc(businessRecommendations.createdAt))
      .limit(20);

    if (rows.length === 0) {
      const summary = await refreshUnifiedRecommendations(true);
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({
      success: true,
      recommendations: rows,
    });
  } catch (error) {
    console.error("Business Recommendations API error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve recommendations." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Recommendation id and status are required." },
        { status: 400 }
      );
    }

    const updated = await updateRecommendationStatus(
      id,
      status as RecommendationStatus,
      auth.user?.id
    );

    return NextResponse.json({
      success: updated,
      id,
      status,
    });
  } catch (error) {
    console.error("Update Recommendation Status API error:", error);
    return NextResponse.json(
      { error: "Failed to update recommendation status." },
      { status: 500 }
    );
  }
}
