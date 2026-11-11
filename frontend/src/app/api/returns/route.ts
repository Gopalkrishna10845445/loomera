import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  createCustomerReturnRequest,
  getCustomerReturns,
  getReturnEligibleOrders,
} from "@/lib/returns/return-service";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eligibleOnly = searchParams.get("eligible") === "true";

    if (eligibleOnly) {
      const eligible = await getReturnEligibleOrders(sessionData.user.id);
      return NextResponse.json({ eligibleOrders: eligible });
    }

    const returns = await getCustomerReturns(sessionData.user.id);
    return NextResponse.json({ returns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch returns";
    console.error("GET /api/returns error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, type, reason, notes, exchangeVariantId, items } = body || {};

    if (!orderId || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "orderId, reason, and at least one item are required" },
        { status: 400 }
      );
    }

    const returnRequest = await createCustomerReturnRequest({
      userId: sessionData.user.id,
      orderId,
      type,
      reason,
      notes,
      exchangeVariantId,
      items,
    });

    return NextResponse.json({ success: true, returnRequest }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create return request";
    console.error("POST /api/returns error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
