import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getCustomerInAppNotifications,
  getCustomerNotificationPreferences,
  updateCustomerNotificationPreferences,
} from "@/lib/notifications/notification-service";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { alerts, unreadCount } = await getCustomerInAppNotifications(sessionData.user.id);
    const preferences = await getCustomerNotificationPreferences(sessionData.user.id);

    return NextResponse.json({ alerts, unreadCount, preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications";
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
    const updated = await updateCustomerNotificationPreferences(sessionData.user.id, body);

    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update notification preferences";
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
