/**
 * LOOMERA — RFM Customer Segmentation & Retention Engine
 * Segments patrons into behavioral cohorts based on Recency, Frequency, and Monetary spend.
 */

import { eq, sql, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { users, orders, loyaltyAccounts } from "@/db/schema";

export type RfmSegment =
  | "VIP Connoisseur"
  | "Loyal Repeat Patron"
  | "First-Time Patron"
  | "At-Risk Lapsed"
  | "New Prospect";

export interface CustomerRfmRecord {
  userId: string;
  fullName: string;
  email: string;
  recencyDays: number;
  frequency: number;
  monetaryTotalInr: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  segment: RfmSegment;
  recommendedAction: string;
}

export interface RfmSegmentSummary {
  segment: RfmSegment;
  customerCount: number;
  totalRevenueInr: number;
  averageAovInr: number;
  recommendedIncentive: string;
}

/**
 * Classifies individual patron metrics into an RFM cohort.
 */
export function classifyRfmSegment(params: {
  recencyDays: number;
  frequency: number;
  monetaryTotalInr: number;
  loyaltyTier: string;
}): { segment: RfmSegment; recommendedAction: string } {
  const { recencyDays, frequency, monetaryTotalInr, loyaltyTier } = params;

  // 1. VIP Connoisseurs: High frequency, high spend, or top tier
  if (
    monetaryTotalInr >= 15000 ||
    frequency >= 3 ||
    loyaltyTier === "PLATINUM" ||
    loyaltyTier === "ATELIER_PRIVILEGE"
  ) {
    return {
      segment: "VIP Connoisseur",
      recommendedAction: "Offer early-access preview of new artisanal silk drops & dedicated concierge support",
    };
  }

  // 2. Loyal Repeat Patrons: >= 2 purchases, recent activity
  if (frequency >= 2 && recencyDays <= 90) {
    return {
      segment: "Loyal Repeat Patron",
      recommendedAction: "Provide 1.5x bonus loyalty points on next linen purchase",
    };
  }

  // 3. First-Time Patrons: 1 order, within last 60 days
  if (frequency === 1 && recencyDays <= 60) {
    return {
      segment: "First-Time Patron",
      recommendedAction: "Dispatch post-purchase garment care guide and ₹500 referral invitation voucher",
    };
  }

  // 4. At-Risk / Lapsed: Placed orders previously, but inactive for > 90 days
  if (frequency >= 1 && recencyDays > 90) {
    return {
      segment: "At-Risk Lapsed",
      recommendedAction: "Dispatch personalized seasonal re-engagement invitation with code RECONNECT15",
    };
  }

  // 5. New Prospects: Registered users who haven't completed their first order
  return {
    segment: "New Prospect",
    recommendedAction: "Encourage first tailoring order with welcome privilege code WELCOME10",
  };
}

/**
 * Computes RFM metrics across all registered customers in the database.
 */
export async function getCustomerRfmAnalysis(): Promise<{
  customers: CustomerRfmRecord[];
  summary: RfmSegmentSummary[];
}> {
  const now = new Date();

  // 1. Query all users with their loyalty accounts
  const userRows = await db
    .select({
      userId: users.id,
      fullName: users.fullName,
      email: users.email,
      loyaltyTier: loyaltyAccounts.tier,
      loyaltyPoints: loyaltyAccounts.pointsBalance,
    })
    .from(users)
    .leftJoin(loyaltyAccounts, eq(users.id, loyaltyAccounts.userId));

  // 2. Query orders aggregated by user
  const orderStats = await db
    .select({
      userId: orders.userId,
      orderCount: sql<number>`count(*)::int`,
      totalSpend: sql<number>`COALESCE(SUM(${orders.totalInr}), 0)::int`,
      latestOrderDate: sql<Date>`MAX(${orders.createdAt})`,
    })
    .from(orders)
    .where(notInArray(orders.status, ["CANCELLED", "PENDING_PAYMENT"]))
    .groupBy(orders.userId);

  const statsMap = new Map(
    orderStats.map((s) => [
      s.userId,
      {
        count: s.orderCount,
        totalSpend: s.totalSpend,
        latestDate: s.latestOrderDate ? new Date(s.latestOrderDate) : null,
      },
    ])
  );

  const customers: CustomerRfmRecord[] = [];

  const segmentMap: Record<RfmSegment, { count: number; totalRevenue: number; incentive: string }> = {
    "VIP Connoisseur": { count: 0, totalRevenue: 0, incentive: "Private Salon Preview & Concierge Access" },
    "Loyal Repeat Patron": { count: 0, totalRevenue: 0, incentive: "1.5x Loyalty Accrual & Free Express Shipping" },
    "First-Time Patron": { count: 0, totalRevenue: 0, incentive: "Post-Purchase Care Guide + ₹500 Referral Link" },
    "At-Risk Lapsed": { count: 0, totalRevenue: 0, incentive: "Exclusive 15% Reconnect Code (RECONNECT15)" },
    "New Prospect": { count: 0, totalRevenue: 0, incentive: "10% Welcome Atelier Voucher (WELCOME10)" },
  };

  for (const u of userRows) {
    const stats = statsMap.get(u.userId);
    const frequency = stats?.count || 0;
    const monetaryTotalInr = stats?.totalSpend || 0;
    let recencyDays = 999;

    if (stats?.latestDate) {
      recencyDays = Math.max(0, Math.floor((now.getTime() - stats.latestDate.getTime()) / (1000 * 3600 * 24)));
    }

    const { segment, recommendedAction } = classifyRfmSegment({
      recencyDays,
      frequency,
      monetaryTotalInr,
      loyaltyTier: u.loyaltyTier || "SILVER",
    });

    customers.push({
      userId: u.userId,
      fullName: u.fullName,
      email: u.email,
      recencyDays,
      frequency,
      monetaryTotalInr,
      loyaltyTier: u.loyaltyTier || "SILVER",
      loyaltyPoints: u.loyaltyPoints || 0,
      segment,
      recommendedAction,
    });

    segmentMap[segment].count += 1;
    segmentMap[segment].totalRevenue += monetaryTotalInr;
  }

  const summary: RfmSegmentSummary[] = Object.entries(segmentMap).map(([segment, data]) => ({
    segment: segment as RfmSegment,
    customerCount: data.count,
    totalRevenueInr: data.totalRevenue,
    averageAovInr: data.count > 0 ? Math.round(data.totalRevenue / data.count) : 0,
    recommendedIncentive: data.incentive,
  }));

  return { customers, summary };
}
