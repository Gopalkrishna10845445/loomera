import crypto from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS, SESSION_TTL_MS } from "./constants";

export { SESSION_COOKIE_NAME, SESSION_TTL_DAYS, SESSION_TTL_MS };

export type UserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
}

/**
 * Computes a SHA-256 hash of the plaintext session token before storing in DB.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a cryptographically secure random session token and stores its hash in PostgreSQL.
 */
export async function createSession(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  // Generate 256 bits of high-entropy randomness
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    lastActivityAt: new Date(),
  });

  return { token, expiresAt };
}

/**
 * Validates a session token from an incoming request.
 * Returns the authenticated user and session metadata if valid and unexpired; otherwise null.
 */
export async function validateSession(
  token: string | null | undefined
): Promise<{ user: SessionUser; session: SessionData } | null> {
  if (!token || typeof token !== "string" || token.length < 32) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  // Query valid session joining with user
  const found = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      userEmail: users.email,
      userFullName: users.fullName,
      userRole: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (!found || found.length === 0) {
    return null;
  }

  const row = found[0];

  // Update last activity timestamp asynchronously (fire and forget)
  db.update(sessions)
    .set({ lastActivityAt: now })
    .where(eq(sessions.id, row.sessionId))
    .catch((err) => {
      console.error("Failed to update session activity:", err);
    });

  return {
    user: {
      id: row.userId,
      email: row.userEmail,
      fullName: row.userFullName,
      role: (row.userRole as UserRole) || "CUSTOMER",
    },
    session: {
      id: row.sessionId,
      userId: row.userId,
      expiresAt: row.sessionExpiresAt,
    },
  };
}

/**
 * Revokes a session token by removing it from the database.
 */
export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashSessionToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Revokes all active sessions for a user (e.g. on password change or security reset).
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
