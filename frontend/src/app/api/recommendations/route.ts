import { NextRequest, NextResponse } from "next/server";
import { getCallerIdentity, attachAnonymousCookieIfNeeded } from "@/lib/history";
import { getPersonalizedRecommendations } from "@/lib/recommendations/recommendation-service";
import {
  getSimilarGarments,
  getComplementaryGarments,
} from "@/lib/recommendations/pairing-service";
import { compareGarments } from "@/lib/ai/comparison-service";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionId, isNewSession } = await getCallerIdentity(req);
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get("mode") || "personalized";
    const productId = searchParams.get("productId") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "4", 10);

    let res: NextResponse;

    if (mode === "similar" && productId) {
      const similar = await getSimilarGarments(productId, isNaN(limit) ? 4 : limit);
      res = NextResponse.json({
        mode: "similar",
        productId,
        recommendations: similar,
      });
    } else if (mode === "complementary" && productId) {
      const complementary = await getComplementaryGarments(productId, isNaN(limit) ? 3 : limit);
      res = NextResponse.json({
        mode: "complementary",
        productId,
        recommendations: complementary,
      });
    } else if (mode === "compare") {
      const idsParam = searchParams.get("ids") || "";
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      const comparison = await compareGarments(ids);
      res = NextResponse.json({
        mode: "compare",
        comparison,
      });
    } else {
      // Default: personalized
      const recommendations = await getPersonalizedRecommendations({
        userId,
        sessionId: userId ? undefined : sessionId,
        categoryFilter: category,
        limit: isNaN(limit) ? 4 : limit,
      });

      res = NextResponse.json({
        mode: "personalized",
        recommendations,
      });
    }

    return attachAnonymousCookieIfNeeded(res, sessionId, isNewSession);
  } catch (error) {
    console.error("Recommendations API error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations." },
      { status: 500 }
    );
  }
}
