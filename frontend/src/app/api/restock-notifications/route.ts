import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  subscribeRestockNotification,
  cancelRestockNotification,
  getUserRestockNotifications,
} from "@/lib/inventory";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionData = await validateSession(token);
  return sessionData ? sessionData.user : null;
}

// GET /api/restock-notifications
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const notifications = await getUserRestockNotifications(user.id);
    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("GET /api/restock-notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch restock notifications" },
      { status: 500 }
    );
  }
}

// POST /api/restock-notifications
export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`notify-post-${ip}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to receive restock notifications." },
        { status: 401 }
      );
    }

    let body: { variantId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body.variantId !== "string" || !body.variantId.trim()) {
      return NextResponse.json({ error: "Valid 'variantId' is required" }, { status: 400 });
    }

    const result = await subscribeRestockNotification(user.id, body.variantId.trim());

    return NextResponse.json({
      success: true,
      notificationId: result.notificationId,
      alreadyActive: result.alreadyActive,
      message: result.alreadyActive
        ? "You are already subscribed to restock notifications for this variant."
        : "Restock notification subscription recorded. You will be alerted when this garment is available.",
    });
  } catch (error: unknown) {
    console.error("POST /api/restock-notifications error:", error);
    const msg = error instanceof Error ? error.message : "Failed to subscribe";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/restock-notifications
export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: { notificationId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body.notificationId !== "string" || !body.notificationId.trim()) {
      return NextResponse.json({ error: "Valid 'notificationId' is required" }, { status: 400 });
    }

    const cancelled = await cancelRestockNotification(user.id, body.notificationId.trim());
    if (!cancelled) {
      return NextResponse.json(
        { error: "Notification not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Restock notification subscription cancelled.",
    });
  } catch (error) {
    console.error("DELETE /api/restock-notifications error:", error);
    return NextResponse.json(
      { error: "Failed to cancel notification" },
      { status: 500 }
    );
  }
}
