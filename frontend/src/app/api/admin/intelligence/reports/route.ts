import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  generateExecutiveReport,
  getHistoricalReportRuns,
  ReportType,
} from "@/lib/intelligence/automated-reporting";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const downloadCsv = searchParams.get("format") === "csv";
    const reportType = (searchParams.get("type") || "DAILY") as ReportType;

    if (downloadCsv) {
      const report = await generateExecutiveReport(reportType, false);
      return new NextResponse(report.csvExportPayload, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="LOOMERA_${reportType}_REPORT_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const history = await getHistoricalReportRuns(10);
    const latestReport = await generateExecutiveReport(reportType, false);

    return NextResponse.json({
      success: true,
      latestReport,
      history,
    });
  } catch (error) {
    console.error("Automated Reports API error:", error);
    return NextResponse.json(
      { error: "Failed to generate business report." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const reportType = (body.reportType || "DAILY") as ReportType;

    const report = await generateExecutiveReport(reportType, true);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Generate Report Run API error:", error);
    return NextResponse.json(
      { error: "Failed to compile scheduled report run." },
      { status: 500 }
    );
  }
}
