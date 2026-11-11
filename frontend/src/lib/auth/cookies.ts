import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";

export interface SessionCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export function getSessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000), // in seconds (30 days)
  };
}

/**
 * Attaches the session cookie to an outgoing NextResponse.
 */
export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): NextResponse {
  const options = getSessionCookieOptions();
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...options,
    expires: expiresAt,
  });
  return response;
}

/**
 * Clears the session cookie on an outgoing NextResponse.
 */
export function removeSessionCookie(response: NextResponse): NextResponse {
  const options = getSessionCookieOptions();
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

/**
 * Reads the session token from incoming server headers/cookies.
 */
export async function getSessionTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}
