/**
 * LOOMERA — Customer Acquisition & Attribution Intelligence Engine
 * Handles first-party UTM tracking, session attribution, channel classification, and order linkage.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { campaignAttributions, orders } from "@/db/schema";

export interface AttributionData {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrerUrl?: string | null;
  landingPage?: string | null;
  sessionId: string;
  visitorId: string;
}

export type AcquisitionChannel =
  | "Organic Search"
  | "Direct"
  | "Social Media"
  | "Referral"
  | "Email"
  | "Paid Advertising";

/**
 * Classifies traffic source into standard e-commerce acquisition channels.
 */
export function classifyChannel(params: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrerUrl?: string | null;
}): AcquisitionChannel {
  const source = (params.utmSource || "").toLowerCase().trim();
  const medium = (params.utmMedium || "").toLowerCase().trim();
  const referrer = (params.referrerUrl || "").toLowerCase().trim();

  // 1. Paid Advertising
  if (
    medium === "cpc" ||
    medium === "ppc" ||
    medium === "paid" ||
    medium === "paidsearch" ||
    source.includes("googleads") ||
    source.includes("meta_ads")
  ) {
    return "Paid Advertising";
  }

  // 2. Email Campaigns
  if (medium === "email" || source.includes("newsletter") || source.includes("mail")) {
    return "Email";
  }

  // 3. Social Media
  const socialDomains = ["instagram.com", "facebook.com", "pinterest.com", "linkedin.com", "twitter.com", "x.com", "t.co"];
  if (
    medium === "social" ||
    socialDomains.some((d) => referrer.includes(d) || source.includes(d.replace(".com", "")))
  ) {
    return "Social Media";
  }

  // 4. Referral Links
  if (medium === "referral" || source.includes("referral") || (referrer && !referrer.includes("loomera.com") && !referrer.includes("localhost"))) {
    // Check if it's search engine
    const searchEngines = ["google.", "bing.", "yahoo.", "duckduckgo.", "ecosia.", "brave."];
    if (searchEngines.some((se) => referrer.includes(se))) {
      return "Organic Search";
    }
    return "Referral";
  }

  // 5. Organic Search
  if (medium === "organic" || source.includes("organic")) {
    return "Organic Search";
  }

  // Default to Direct
  return "Direct";
}

/**
 * Sanitizes input string to prevent stored injection or invalid characters.
 */
export function sanitizeAttributionParam(value?: string | null, maxLength: number = 255): string | null {
  if (!value) return null;
  const clean = value.replace(/[^\w\s\-.,_/:?=&]/gi, "").trim();
  return clean.slice(0, maxLength) || null;
}

/**
 * Server-side: records campaign attribution linked to a completed order or session.
 */
export async function recordServerAttribution(params: {
  orderId?: string | null;
  sessionId: string;
  visitorId: string;
  userId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  referrerUrl?: string | null;
  landingPage?: string | null;
}) {
  const cleanSource = sanitizeAttributionParam(params.utmSource, 128);
  const cleanMedium = sanitizeAttributionParam(params.utmMedium, 128);
  const cleanCampaign = sanitizeAttributionParam(params.utmCampaign, 128);
  const cleanTerm = sanitizeAttributionParam(params.utmTerm, 255);
  const cleanContent = sanitizeAttributionParam(params.utmContent, 255);
  const cleanReferrer = sanitizeAttributionParam(params.referrerUrl, 1000);
  const cleanLanding = sanitizeAttributionParam(params.landingPage, 1000);

  const [attribution] = await db
    .insert(campaignAttributions)
    .values({
      orderId: params.orderId || null,
      sessionId: params.sessionId,
      visitorId: params.visitorId,
      userId: params.userId || null,
      utmSource: cleanSource,
      utmMedium: cleanMedium,
      utmCampaign: cleanCampaign,
      utmTerm: cleanTerm,
      utmContent: cleanContent,
      referrerUrl: cleanReferrer,
      landingPage: cleanLanding,
    })
    .returning();

  return attribution;
}

/**
 * Server-side: retrieves channel attribution breakdown with revenue contribution.
 */
export async function getAttributionBreakdown() {
  const rows = await db
    .select({
      id: campaignAttributions.id,
      orderId: campaignAttributions.orderId,
      utmSource: campaignAttributions.utmSource,
      utmMedium: campaignAttributions.utmMedium,
      utmCampaign: campaignAttributions.utmCampaign,
      referrerUrl: campaignAttributions.referrerUrl,
      createdAt: campaignAttributions.createdAt,
      orderTotalInr: orders.totalInr,
    })
    .from(campaignAttributions)
    .leftJoin(orders, eq(campaignAttributions.orderId, orders.id))
    .orderBy(desc(campaignAttributions.createdAt));

  const channelMap: Record<AcquisitionChannel, { sessions: number; ordersCount: number; revenueInr: number }> = {
    "Organic Search": { sessions: 0, ordersCount: 0, revenueInr: 0 },
    "Direct": { sessions: 0, ordersCount: 0, revenueInr: 0 },
    "Social Media": { sessions: 0, ordersCount: 0, revenueInr: 0 },
    "Referral": { sessions: 0, ordersCount: 0, revenueInr: 0 },
    "Email": { sessions: 0, ordersCount: 0, revenueInr: 0 },
    "Paid Advertising": { sessions: 0, ordersCount: 0, revenueInr: 0 },
  };

  for (const r of rows) {
    const channel = classifyChannel({
      utmSource: r.utmSource,
      utmMedium: r.utmMedium,
      referrerUrl: r.referrerUrl,
    });

    channelMap[channel].sessions += 1;
    if (r.orderId && r.orderTotalInr) {
      channelMap[channel].ordersCount += 1;
      channelMap[channel].revenueInr += r.orderTotalInr;
    }
  }

  return Object.entries(channelMap).map(([channel, metrics]) => ({
    channel: channel as AcquisitionChannel,
    ...metrics,
    aovInr: metrics.ordersCount > 0 ? Math.round(metrics.revenueInr / metrics.ordersCount) : 0,
    conversionRatePercent: metrics.sessions > 0 ? Number(((metrics.ordersCount / metrics.sessions) * 100).toFixed(2)) : 0,
  }));
}
