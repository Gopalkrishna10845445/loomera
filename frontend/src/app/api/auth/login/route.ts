import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeEmail, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { attachSessionCookie } from "@/lib/auth/cookies";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/auth/rate-limit";
import { mergeAnonymousCart } from "@/lib/cart";
import { mergeAnonymousWishlist } from "@/lib/wishlist";
import { isRequestOriginValid } from "@/lib/auth/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json(
        { error: "Forbidden: cross-site request rejected." },
        { status: 403 }
      );
    }
    const body = await req.json();
    const { email, password, anonymousCart, anonymousWishlist } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // IP or Email-based rate limiting
    const ip = req.headers.get("x-forwarded-for") || "client-local";
    const rateLimitKey = `${ip}:${normalizedEmail}`;

    const rateStatus = checkRateLimit(rateLimitKey);
    if (rateStatus.isLimited) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${rateStatus.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Look up user
    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (foundUsers.length === 0) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = foundUsers[0];
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateLimitKey);

    // Create secure session
    const { token, expiresAt } = await createSession(user.id);

    // Merge guest cart if present
    if (Array.isArray(anonymousCart) && anonymousCart.length > 0) {
      await mergeAnonymousCart(user.id, anonymousCart);
    }

    // Merge guest wishlist if present
    if (Array.isArray(anonymousWishlist) && anonymousWishlist.length > 0) {
      await mergeAnonymousWishlist(user.id, anonymousWishlist);
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        message: "Logged in successfully.",
      },
      { status: 200 }
    );

    return attachSessionCookie(response, token, expiresAt);
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
