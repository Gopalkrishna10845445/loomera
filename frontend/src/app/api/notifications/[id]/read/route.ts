import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { markNotificationAsRead } from "@/lib/notifications/notification-service";

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
    const updated = await markNotificationAsRead(id, sessionData.user.id);

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to mark notification as read";
    console.error("POST /api/notifications/[id]/read error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
