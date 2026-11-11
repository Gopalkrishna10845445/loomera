import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getSupportTicketDetails,
  addSupportMessage,
} from "@/lib/support/support-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const ticket = await getSupportTicketDetails(id, sessionData.user.id, false);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ticket";
    console.error("GET /api/support/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { message, attachments } = body || {};

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const newMessage = await addSupportMessage({
      ticketId: id,
      senderId: sessionData.user.id,
      senderRole: "CUSTOMER",
      message,
      attachments,
    });

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to post reply";
    console.error("POST /api/support/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
