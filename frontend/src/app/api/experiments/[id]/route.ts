import { NextRequest, NextResponse } from "next/server";
import { getOrAssignVariant, getExperimentReport } from "@/lib/experimentation/ab-testing";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`exp-assign-${ip}`, 100, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ variant: "control" });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const visitorId = searchParams.get("visitorId");
    const mode = searchParams.get("mode"); // "report" or "assign"

    // If report mode requested
    if (mode === "report") {
      const report = await getExperimentReport(id);
      if (!report) {
        return NextResponse.json({ error: "Experiment not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // Default: assign variant
    if (!visitorId) {
      return NextResponse.json({ variant: "control" });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);

    const variant = await getOrAssignVariant({
      experimentId: id,
      visitorId,
      userId: sessionData?.user?.id || null,
    });

    return NextResponse.json({ success: true, experimentId: id, variant });
  } catch (error: unknown) {
    console.error("GET /api/experiments/[id] error:", error);
    return NextResponse.json({ variant: "control" });
  }
}
