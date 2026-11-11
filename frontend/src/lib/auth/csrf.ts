import { NextRequest } from "next/server";

/**
 * Validates request origin against the host header for defense-in-depth CSRF protection
 * on all state-changing endpoints (POST, PATCH, DELETE).
 */
export function isRequestOriginValid(req: NextRequest): boolean {
  // Sec-Fetch-Site header provides standard browser-level origin defense
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // Check referer if origin is missing
    const referer = req.headers.get("referer");
    if (!referer) {
      // In same-origin or programmatic API tests, allowed
      return true;
    }
    try {
      const refererUrl = new URL(referer);
      const host = req.headers.get("host") || "";
      return refererUrl.host === host || host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    const host = req.headers.get("host") || "";
    return (
      originUrl.host === host ||
      originUrl.host.startsWith("localhost") ||
      originUrl.host.startsWith("127.0.0.1") ||
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1")
    );
  } catch {
    return false;
  }
}
