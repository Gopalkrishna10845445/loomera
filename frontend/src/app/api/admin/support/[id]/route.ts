import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getSupportTicketDetails,
  addSupportMessage,
  updateAdminSupportTicket,
  SupportStatus,
  SupportPriority,
} from "@/lib/support/support-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const ticket = await getSupportTicketDetails(id, auth.user.id, true);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ticket";
    console.error("GET /api/admin/support/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected" }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const body = await req.json();
    const { status, priority, assignedAdminId } = body || {};

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const updated = await updateAdminSupportTicket({
      ticketId: id,
      status: status as SupportStatus,
      priority: priority as SupportPriority,
      assignedAdminId,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update ticket";
    console.error("PATCH /api/admin/support/[id] error:", error);
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

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const body = await req.json();
    const { message, attachments } = body || {};

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const newMsg = await addSupportMessage({
      ticketId: id,
      senderId: auth.user.id,
      senderRole: "ADMIN",
      message,
      attachments,
    });

    return NextResponse.json({ success: true, message: newMsg }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send admin reply";
    console.error("POST /api/admin/support/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
