"use client";

/**
 * LOOMERA — Client-Side Attribution & Visitor Session Tracker
 * Reads and persists UTM parameters and visitor session state in localStorage and cookies.
 */

export interface ClientAttribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrerUrl: string | null;
  landingPage: string | null;
  visitorId: string;
  sessionId: string;
  capturedAt: string;
}

const STORAGE_KEY = "lmr_attribution_v1";
const COOKIE_NAME = "lmr_attr";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets or creates persistent anonymous visitor ID.
 */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";
  let vid = localStorage.getItem("lmr_visitor_id");
  if (!vid) {
    vid = "v_" + generateUUID();
    localStorage.setItem("lmr_visitor_id", vid);
  }
  return vid;
}

/**
 * Gets or creates session ID (refreshed after 30 min of inactivity).
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  const now = Date.now();
  const sessionStr = sessionStorage.getItem("lmr_session");
  if (sessionStr) {
    try {
      const parsed = JSON.parse(sessionStr);
      if (now - parsed.timestamp < 30 * 60 * 1000) {
        parsed.timestamp = now;
        sessionStorage.setItem("lmr_session", JSON.stringify(parsed));
        return parsed.sessionId;
      }
    } catch {
      // Fall through to create new session
    }
  }

  const newSessionId = "s_" + generateUUID();
  sessionStorage.setItem("lmr_session", JSON.stringify({ sessionId: newSessionId, timestamp: now }));
  return newSessionId;
}

/**
 * Captures UTM parameters from current window URL and document referrer.
 */
export function captureClientAttribution(): ClientAttribution | null {
  if (typeof window === "undefined") return null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUtm =
      urlParams.has("utm_source") ||
      urlParams.has("utm_medium") ||
      urlParams.has("utm_campaign") ||
      urlParams.has("ref");

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();

    const stored = getStoredClientAttribution();

    // If new UTM parameters are present, overwrite with new attribution touchpoint
    if (hasUtm || !stored) {
      const attribution: ClientAttribution = {
        utmSource: urlParams.get("utm_source") || urlParams.get("ref") || null,
        utmMedium: urlParams.get("utm_medium") || (urlParams.get("ref") ? "referral" : null),
        utmCampaign: urlParams.get("utm_campaign") || null,
        utmTerm: urlParams.get("utm_term") || null,
        utmContent: urlParams.get("utm_content") || null,
        referrerUrl: document.referrer || null,
        landingPage: window.location.pathname + window.location.search,
        visitorId,
        sessionId,
        capturedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      // Save lightweight cookie (30 days)
      const cookieVal = encodeURIComponent(
        JSON.stringify({
          src: attribution.utmSource,
          med: attribution.utmMedium,
          cmp: attribution.utmCampaign,
          vid: attribution.visitorId,
        })
      );
      document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/; max-age=2592000; SameSite=Lax`;

      return attribution;
    }

    return stored;
  } catch (err) {
    console.warn("[Attribution] Error capturing attribution parameters", err);
    return null;
  }
}

/**
 * Retrieves currently stored client attribution.
 */
export function getStoredClientAttribution(): ClientAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
