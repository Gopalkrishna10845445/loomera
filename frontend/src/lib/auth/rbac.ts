/**
 * LOOMERA — Role-Based Access Control (RBAC) Engine
 * Protects administrative APIs, mutations, and privileged data routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, validateSession, UserRole, SessionUser, SessionData } from "./session";

export interface RbacAuthSuccess {
  authorized: true;
  status: 200;
  user: SessionUser;
  session: SessionData;
}

export interface RbacAuthFailure {
  authorized: false;
  status: 401 | 403;
  error: string;
  user: SessionUser | null;
}

export type RbacAuthResult = RbacAuthSuccess | RbacAuthFailure;

/**
 * Validates request session and strictly verifies that user holds one of the permitted roles.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[] = ["ADMIN", "SUPER_ADMIN"]
): Promise<RbacAuthResult> {
  let token = req.cookies?.get ? req.cookies.get(SESSION_COOKIE_NAME)?.value : undefined;
  if (!token && typeof req.headers?.get === "function") {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }
  const sessionResult = await validateSession(token);

  if (!sessionResult) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in.",
      user: null,
    };
  }

  const { user, session } = sessionResult;

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      status: 403,
      error: "Access denied. Administrative privileges required.",
      user,
    };
  }

  return {
    authorized: true,
    status: 200,
    user,
    session,
  };
}

/**
 * Convenience helper requiring ADMIN or SUPER_ADMIN role.
 */
export async function requireAdmin(req: NextRequest): Promise<RbacAuthResult> {
  return requireRole(req, ["ADMIN", "SUPER_ADMIN"]);
}

/**
 * Convenience helper requiring SUPER_ADMIN role exclusively.
 */
export async function requireSuperAdmin(req: NextRequest): Promise<RbacAuthResult> {
  return requireRole(req, ["SUPER_ADMIN"]);
}

/**
 * Helper to produce standard JSON responses on RBAC failures.
 */
export function rbacErrorResponse(result: RbacAuthFailure): NextResponse {
  return NextResponse.json(
    {
      error: result.error,
      code: result.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
    },
    { status: result.status }
  );
}
