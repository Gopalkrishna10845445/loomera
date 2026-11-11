import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  createCustomerSupportTicket,
  getCustomerSupportTickets,
} from "@/lib/support/support-service";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const tickets = await getCustomerSupportTickets(sessionData.user.id);
    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch support tickets";
    console.error("GET /api/support error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { category, subject, message, orderId, attachments } = body || {};

    if (!category || !subject || !message) {
      return NextResponse.json(
        { error: "Category, subject, and message are required" },
        { status: 400 }
      );
    }

    const ticket = await createCustomerSupportTicket({
      userId: sessionData.user.id,
      category,
      subject,
      message,
      orderId,
      attachments,
    });

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create support ticket";
    console.error("POST /api/support error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
