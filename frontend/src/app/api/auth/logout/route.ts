import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, invalidateSession } from "@/lib/auth/session";
import { removeSessionCookie } from "@/lib/auth/cookies";
import { isRequestOriginValid } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-site request rejected." },
        { status: 403 }
      );
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await invalidateSession(token);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully." },
      { status: 200 }
    );

    return removeSessionCookie(response);
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.json(
      { error: "Error during logout." },
      { status: 500 }
    );
    return removeSessionCookie(response);
  }
}
