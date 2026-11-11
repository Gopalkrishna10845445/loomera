import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import {
  runBusinessAnomalyDetection,
  updateAnomalyStatus,
  AnomalyStatus,
} from "@/lib/intelligence/anomaly-detection";
import { db } from "@/db";
import { businessAnomalies } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const liveScan = searchParams.get("scan") === "true";

    if (liveScan) {
      const scanResult = await runBusinessAnomalyDetection(true);
      return NextResponse.json({ success: true, scanResult });
    }

    // Historical records from DB
    const rows = await db
      .select()
      .from(businessAnomalies)
      .orderBy(desc(businessAnomalies.detectedAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      anomalies: rows,
    });
  } catch (error) {
    console.error("Business Anomalies API error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve business anomalies." },
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
        { error: "Anomaly id and status are required." },
        { status: 400 }
      );
    }

    const updated = await updateAnomalyStatus(id, status as AnomalyStatus);

    return NextResponse.json({
      success: updated,
      id,
      status,
    });
  } catch (error) {
    console.error("Update Anomaly Status API error:", error);
    return NextResponse.json(
      { error: "Failed to update anomaly status." },
      { status: 500 }
    );
  }
}
