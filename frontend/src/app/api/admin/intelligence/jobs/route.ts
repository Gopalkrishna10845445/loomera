import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  executeIntelligenceJob,
  getJobExecutionHistory,
  IntelligenceJobName,
} from "@/lib/intelligence/job-runner";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const history = await getJobExecutionHistory(15);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Job History API error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve job history." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check if triggered via CRON secret or via Admin session
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "loomera_cron_secret_key_2026";
    const isCronAuthorized =
      authHeader &&
      (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret);

    if (!isCronAuthorized) {
      const auth = await requireAdmin(req);
      if (!auth.authorized) {
        return rbacErrorResponse(auth);
      }
    }

    const body = await req.json();
    const jobName = body.jobName as IntelligenceJobName;

    if (!jobName) {
      return NextResponse.json(
        { error: "jobName is required." },
        { status: 400 }
      );
    }

    const result = await executeIntelligenceJob(jobName);

    return NextResponse.json({
      success: result.status === "COMPLETED",
      result,
    });
  } catch (error) {
    console.error("Execute Job API error:", error);
    return NextResponse.json(
      { error: "Failed to execute intelligence job." },
      { status: 500 }
    );
  }
}
