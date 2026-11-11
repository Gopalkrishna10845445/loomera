import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { queryAiBusinessAnalyst } from "@/lib/intelligence/ai-business-analyst";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json(
        { error: "Query string is required." },
        { status: 400 }
      );
    }

    const response = await queryAiBusinessAnalyst(query);

    return NextResponse.json({
      success: true,
      query,
      response,
    });
  } catch (error) {
    console.error("AI Business Analyst query API error:", error);
    return NextResponse.json(
      { error: "Failed to process business inquiry." },
      { status: 500 }
    );
  }
}
