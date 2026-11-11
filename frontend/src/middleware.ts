import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/auth/constants";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Protect /account, /orders, and /admin routes
  const isProtected =
    pathname.startsWith("/account") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/admin");

  if (isProtected) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie || sessionCookie.trim().length === 0) {
      const redirectUrl = new URL("/login", req.url);
      const fullPath = pathname + search;
      redirectUrl.searchParams.set("redirect", fullPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/orders/:path*",
    "/admin/:path*",
  ],
};
