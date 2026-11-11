import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession } from "@/lib/auth/session";
import { removeSessionCookie } from "@/lib/auth/cookies";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sessionData = await validateSession(token);

    if (!sessionData) {
      const response = NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
      if (token) {
        // Clear stale or expired cookie
        removeSessionCookie(response);
      }
      return response;
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: sessionData.user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "Internal server error" },
      { status: 500 }
    );
  }
}
