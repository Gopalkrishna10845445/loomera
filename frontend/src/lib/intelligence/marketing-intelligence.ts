/**
 * LOOMERA — Marketing & Channel Intelligence Engine
 * Evaluates first-party UTM attribution, channel conversion ROI, campaign efficiency,
 * and recommends approval-gated growth and retention initiatives.
 */

import { eq, sql, notInArray, and } from "drizzle-orm";
import { db } from "@/db";
import {
  campaignAttributions,
  marketingCampaigns,
  orders,
  coupons,
  couponRedemptions,
} from "@/db/schema";
import { getAttributionBreakdown } from "@/lib/analytics/attribution";

export interface ChannelPerformanceMetric {
  channel: string;
  totalSessions: number;
  ordersCount: number;
  grossRevenueInr: number;
  averageOrderValueInr: number;
  conversionRatePercent: number;
  repeatBuyersCount: number;
  repeatPurchaseRatePercent: number;
  adSpendInr: number | null; // null if unconfigured
  roas: number | null;       // null if ad spend unavailable
}

export interface CampaignEfficiencyMetric {
  campaignId: string;
  name: string;
  code: string;
  headline: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  clickThroughRatePercent: number;
  attributedOrdersCount: number;
  attributedRevenueInr: number;
  associatedCouponCode: string | null;
  couponRedemptionCount: number;
  statusRecommendation: "CONTINUE" | "OPTIMIZE_CREATIVE" | "PAUSE_REVIEW" | "SCALE";
  reasoning: string;
}

export interface MarketingIntelligenceReport {
  totalAttributedRevenueInr: number;
  totalAttributedOrders: number;
  channelBreakdown: ChannelPerformanceMetric[];
  campaignEfficiency: CampaignEfficiencyMetric[];
  productsSuitableForPromotion: Array<{
    productId: string;
    productTitle: string;
    currentStock: number;
    recommendedPromoAngle: string;
  }>;
  underperformingChannels: string[];
  topPerformingChannel: string;
  adSpendStatusNotice: string;
  generatedAt: string;
}

/**
 * Computes deep marketing attribution and promotional efficiency metrics.
 */
export async function getMarketingIntelligenceReport(): Promise<MarketingIntelligenceReport> {
  // 1. Re-use Phase 9 native attribution breakdown
  const rawAttribution = await getAttributionBreakdown();

  // 2. Enhance channel breakdown with repeat buyer rate and explicit ad spend bounds
  const channelBreakdown: ChannelPerformanceMetric[] = [];
  let totalAttributedRevenueInr = 0;
  let totalAttributedOrders = 0;

  for (const c of rawAttribution) {
    totalAttributedRevenueInr += c.revenueInr;
    totalAttributedOrders += c.ordersCount;

    // Check repeat buyers in this channel
    const [repeatRow] = await db
      .select({
        repeatCount: sql<number>`
          COALESCE(
            COUNT(DISTINCT ${campaignAttributions.userId}),
            0
          )::int
        `,
      })
      .from(campaignAttributions)
      .innerJoin(orders, eq(campaignAttributions.orderId, orders.id))
      .where(
        and(
          sql`${campaignAttributions.userId} IS NOT NULL`,
          sql`${campaignAttributions.userId} IN (
            SELECT user_id FROM orders 
            WHERE status NOT IN ('CANCELLED', 'PENDING_PAYMENT')
            GROUP BY user_id HAVING count(*) > 1
          )`
        )
      );

    const repeatBuyers = repeatRow?.repeatCount || 0;
    const repeatRate =
      c.ordersCount > 0 ? Number(((repeatBuyers / c.ordersCount) * 100).toFixed(1)) : 0;

    channelBreakdown.push({
      channel: c.channel,
      totalSessions: c.sessions,
      ordersCount: c.ordersCount,
      grossRevenueInr: c.revenueInr,
      averageOrderValueInr: c.aovInr,
      conversionRatePercent: c.conversionRatePercent,
      repeatBuyersCount: repeatBuyers,
      repeatPurchaseRatePercent: repeatRate,
      adSpendInr: null, // Verified business constraint: ad spend not tracked in DB
      roas: null,
    });
  }

  // 3. Campaign efficiency analysis
  const activeCampaigns = await db
    .select({
      id: marketingCampaigns.id,
      name: marketingCampaigns.name,
      code: marketingCampaigns.code,
      headline: marketingCampaigns.headline,
      isActive: marketingCampaigns.isActive,
      impressions: marketingCampaigns.impressions,
      clicks: marketingCampaigns.clicks,
    })
    .from(marketingCampaigns);

  const campaignEfficiency: CampaignEfficiencyMetric[] = [];

  for (const camp of activeCampaigns) {
    const ctr =
      camp.impressions > 0
        ? Number(((camp.clicks / camp.impressions) * 100).toFixed(1))
        : 0;

    // Direct UTM match to orders
    const [orderRow] = await db
      .select({
        ordersCount: sql<number>`count(distinct ca.order_id)::int`,
        revenue: sql<number>`COALESCE(SUM(o.total_inr), 0)::int`,
      })
      .from(campaignAttributions)
      .innerJoin(orders, eq(campaignAttributions.orderId, orders.id))
      .where(
        and(
          eq(campaignAttributions.utmCampaign, camp.code),
          notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"])
        )
      );

    const attrOrders = orderRow?.ordersCount || 0;
    const attrRev = orderRow?.revenue || 0;

    // Check associated coupon
    const [couponRow] = await db
      .select({
        code: coupons.code,
        id: coupons.id,
      })
      .from(coupons)
      .where(eq(coupons.code, camp.code));

    let couponRedemptionsCount = 0;
    if (couponRow) {
      const [redempRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(couponRedemptions)
        .where(eq(couponRedemptions.couponId, couponRow.id));
      couponRedemptionsCount = redempRow?.count || 0;
    }

    let statusRecommendation: "CONTINUE" | "OPTIMIZE_CREATIVE" | "PAUSE_REVIEW" | "SCALE" =
      "CONTINUE";
    let reasoning = "";

    if (camp.clicks > 50 && attrOrders === 0) {
      statusRecommendation = "PAUSE_REVIEW";
      reasoning = "High traffic engagement (clicks) with zero downstream conversion. Review landing page relevance or pricing barrier.";
    } else if (attrOrders >= 5 && ctr >= 3.0) {
      statusRecommendation = "SCALE";
      reasoning = `Strong performance: ${ctr}% CTR with ${attrOrders} verified orders (₹${attrRev.toLocaleString()}). Recommend expanding placement budget.`;
    } else if (ctr < 1.0 && camp.impressions > 100) {
      statusRecommendation = "OPTIMIZE_CREATIVE";
      reasoning = "Below-average CTR (< 1.0%). Refresh headline and editorial luxury photography.";
    } else {
      statusRecommendation = "CONTINUE";
      reasoning = "Healthy engagement baseline within expected artisanal benchmark.";
    }

    campaignEfficiency.push({
      campaignId: camp.id,
      name: camp.name,
      code: camp.code,
      headline: camp.headline,
      isActive: camp.isActive,
      impressions: camp.impressions,
      clicks: camp.clicks,
      clickThroughRatePercent: ctr,
      attributedOrdersCount: attrOrders,
      attributedRevenueInr: attrRev,
      associatedCouponCode: couponRow?.code || null,
      couponRedemptionCount: couponRedemptionsCount,
      statusRecommendation,
      reasoning,
    });
  }

  // 4. Products with high inventory suitable for targeted promotion
  const candidates = await db.execute(sql`
    SELECT p.id, p.title, SUM(pv.stock_quantity)::int as total_stock
    FROM products p
    INNER JOIN product_variants pv ON p.id = pv.product_id
    WHERE p.is_published = true AND p.is_archived = false
    GROUP BY p.id, p.title
    HAVING SUM(pv.stock_quantity) >= 40
    ORDER BY total_stock DESC
    LIMIT 3;
  `);

  interface CandidateRow {
    id: string;
    title: string;
    total_stock: number;
  }

  const productsSuitableForPromotion = (candidates.rows as unknown as CandidateRow[]).map((r) => ({
    productId: String(r.id),
    productTitle: String(r.title),
    currentStock: Number(r.total_stock),
    recommendedPromoAngle: "Curated seasonal showcase spotlight with complimentary styling pairing.",
  }));

  // Identify top and underperforming channels
  const sortedChannels = [...channelBreakdown].sort((a, b) => b.grossRevenueInr - a.grossRevenueInr);
  const topPerformingChannel = sortedChannels[0]?.channel || "Direct / Organic";
  const underperformingChannels = channelBreakdown
    .filter((c) => c.totalSessions > 20 && c.conversionRatePercent < 0.5)
    .map((c) => c.channel);

  const adSpendStatusNotice =
    "NOTICE: Paid advertising spend (Meta Ads, Google CPC) is not integrated into database records. Channel reporting displays gross attributed revenue and conversion rates without fabricated CAC or ROAS figures.";

  return {
    totalAttributedRevenueInr,
    totalAttributedOrders,
    channelBreakdown,
    campaignEfficiency,
    productsSuitableForPromotion,
    underperformingChannels,
    topPerformingChannel,
    adSpendStatusNotice,
    generatedAt: new Date().toISOString(),
  };
}
