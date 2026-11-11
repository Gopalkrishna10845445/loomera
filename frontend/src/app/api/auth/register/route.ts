import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  normalizeEmail,
  validateEmail,
  validatePasswordStrength,
  hashPassword,
} from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { attachSessionCookie } from "@/lib/auth/cookies";
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
    const { fullName, email, password, passwordConfirmation, anonymousCart, anonymousWishlist } =
      body || {};

    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { error: "Password confirmation does not match." },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.isValid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Securely hash password with Argon2id
    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "CUSTOMER",
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      });

    // Create session
    const { token, expiresAt } = await createSession(newUser.id);

    // Merge guest cart/wishlist if provided
    if (Array.isArray(anonymousCart) && anonymousCart.length > 0) {
      await mergeAnonymousCart(newUser.id, anonymousCart);
    }

    if (Array.isArray(anonymousWishlist) && anonymousWishlist.length > 0) {
      await mergeAnonymousWishlist(newUser.id, anonymousWishlist);
    }

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
        },
        message: "Account created successfully.",
      },
      { status: 201 }
    );

    return attachSessionCookie(response, token, expiresAt);
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
