/**
 * LOOMERA — Customer Churn Prediction & Retention Intelligence Engine
 * Extends Phase 9 RFM segmentation with explainable behavioral churn risk scoring.
 * Identifies at-risk patrons, inter-order intervals, and recommends approval-gated retention interventions.
 */

import { sql, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  productViewHistory,
  searchHistory,
} from "@/db/schema";
import {
  getCustomerRfmAnalysis,
  RfmSegment,
} from "@/lib/loyalty/rfm-service";

export type ChurnRiskTier = "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "IMMINENT_CHURN";

export interface CustomerChurnRiskProfile {
  userId: string;
  fullName: string;
  email: string;
  rfmSegment: RfmSegment;
  recencyDays: number;
  totalOrdersCount: number;
  lifetimeSpendInr: number;
  averageInterOrderIntervalDays: number | null;
  daysSinceExpectedOrder: number | null;
  recentViewsCount30d: number;
  recentSearchesCount30d: number;
  churnRiskScore: number; // 0 to 100
  riskTier: ChurnRiskTier;
  behavioralSignals: string[];
  recommendedRetentionStrategy: string;
  recommendedIncentiveCode: string | null;
  predictionConfidence: "HIGH" | "MEDIUM" | "PRELIMINARY";
  requiresApproval: boolean;
}

export interface ChurnRadarSummary {
  totalAuditedCustomers: number;
  lowRiskCount: number;
  moderateRiskCount: number;
  highRiskCount: number;
  imminentChurnCount: number;
  atRiskRevenueExposureInr: number;
  highRiskPatrons: CustomerChurnRiskProfile[];
  segmentChurnDistribution: Array<{
    segment: RfmSegment;
    averageRiskScore: number;
    atRiskCount: number;
    totalCount: number;
  }>;
  generatedAt: string;
}

/**
 * Computes explainable, transparent churn risk scores for each patron.
 */
export async function getCustomerChurnAnalysis(): Promise<ChurnRadarSummary> {
  // 1. Re-use authoritative RFM customer analysis from Phase 9
  const { customers: rfmCustomers } = await getCustomerRfmAnalysis();

  const churnProfiles: CustomerChurnRiskProfile[] = [];
  let lowRiskCount = 0;
  let moderateRiskCount = 0;
  let highRiskCount = 0;
  let imminentChurnCount = 0;
  let atRiskRevenueExposureInr = 0;

  for (const c of rfmCustomers) {
    // 2. Fetch patron's historical order intervals to detect rhythm disruption
    const userOrders = await db
      .select({
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        sql`${orders.userId} = ${c.userId} AND ${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`
      )
      .orderBy(desc(orders.createdAt));

    let avgIntervalDays: number | null = null;
    let daysSinceExpected: number | null = null;

    if (userOrders.length >= 2) {
      const timestamps = userOrders.map((o) => new Date(o.createdAt).getTime());
      let diffSum = 0;
      for (let i = 0; i < timestamps.length - 1; i++) {
        diffSum += (timestamps[i] - timestamps[i + 1]) / (1000 * 60 * 60 * 24);
      }
      avgIntervalDays = Math.round(diffSum / (timestamps.length - 1));
      if (avgIntervalDays > 0) {
        daysSinceExpected = Math.max(0, c.recencyDays - avgIntervalDays);
      }
    }

    // 3. Digital engagement pulse (views & searches in past 30 days)
    const [viewsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productViewHistory)
      .where(
        sql`${productViewHistory.userId} = ${c.userId} AND ${productViewHistory.viewedAt} >= NOW() - INTERVAL '30 days'`
      );

    const [searchesRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchHistory)
      .where(
        sql`${searchHistory.userId} = ${c.userId} AND ${searchHistory.createdAt} >= NOW() - INTERVAL '30 days'`
      );

    const recentViewsCount30d = viewsRow?.count || 0;
    const recentSearchesCount30d = searchesRow?.count || 0;

    // 4. Transparent Behavioral Churn Scoring (0 to 100)
    let score = 0;
    const signals: string[] = [];

    // Recency factor (0 to 45 pts)
    if (c.recencyDays > 120) {
      score += 45;
      signals.push(`Long inactivity: ${c.recencyDays} days since last atelier purchase`);
    } else if (c.recencyDays > 75) {
      score += 30;
      signals.push(`Dormancy developing: ${c.recencyDays} days without an order`);
    } else if (c.recencyDays > 45) {
      score += 15;
      signals.push(`Approaching quiet period: ${c.recencyDays} days since purchase`);
    } else {
      score += 5;
    }

    // Interval disruption factor (0 to 30 pts)
    if (daysSinceExpected !== null && avgIntervalDays !== null) {
      if (daysSinceExpected > avgIntervalDays * 1.5) {
        score += 30;
        signals.push(
          `Usual purchase cycle breached: Expected order ~${avgIntervalDays} days, overdue by ${daysSinceExpected} days`
        );
      } else if (daysSinceExpected > 0) {
        score += 15;
        signals.push(`Past normal reorder interval of ${avgIntervalDays} days`);
      }
    } else if (c.frequency === 1 && c.recencyDays > 60) {
      score += 20;
      signals.push("Single purchase patron without follow-up engagement within 60-day window");
    }

    // Digital engagement factor (-15 to +25 pts)
    if (recentViewsCount30d === 0 && recentSearchesCount30d === 0) {
      score += 25;
      signals.push("Zero digital storefront visits or inquiries in previous 30 days");
    } else if (recentViewsCount30d >= 3 || recentSearchesCount30d >= 2) {
      score = Math.max(0, score - 15);
      signals.push("Active browsing intent detected despite lack of recent purchases (re-engagement opportunity)");
    }

    // Clamp score
    score = Math.min(100, Math.max(0, score));

    // Risk tier classification
    let riskTier: ChurnRiskTier = "LOW_RISK";
    let strategy = "";
    let incentiveCode: string | null = null;

    if (score >= 80) {
      riskTier = "IMMINENT_CHURN";
      imminentChurnCount++;
      atRiskRevenueExposureInr += c.monetaryTotalInr;
      strategy = "High-priority concierge reach-out with exclusive revival incentive.";
      incentiveCode = "REVIVE20";
    } else if (score >= 60) {
      riskTier = "HIGH_RISK";
      highRiskCount++;
      atRiskRevenueExposureInr += c.monetaryTotalInr;
      strategy = "Seasonal new-collection lookbook dispatch with complimentary express tailoring code.";
      incentiveCode = "ATELIER15";
    } else if (score >= 35) {
      riskTier = "MODERATE_RISK";
      moderateRiskCount++;
      strategy = "Subtle artisanal showcase email highlighting new handloom drops.";
      incentiveCode = null;
    } else {
      riskTier = "LOW_RISK";
      lowRiskCount++;
      strategy = "Standard VIP privilege recognition; no urgent retention intervention needed.";
      incentiveCode = null;
    }

    const confidence: "HIGH" | "MEDIUM" | "PRELIMINARY" =
      c.frequency >= 2 ? "HIGH" : c.frequency === 1 ? "MEDIUM" : "PRELIMINARY";

    churnProfiles.push({
      userId: c.userId,
      fullName: c.fullName,
      email: c.email,
      rfmSegment: c.segment,
      recencyDays: c.recencyDays,
      totalOrdersCount: c.frequency,
      lifetimeSpendInr: c.monetaryTotalInr,
      averageInterOrderIntervalDays: avgIntervalDays,
      daysSinceExpectedOrder: daysSinceExpected,
      recentViewsCount30d,
      recentSearchesCount30d,
      churnRiskScore: score,
      riskTier,
      behavioralSignals: signals,
      recommendedRetentionStrategy: strategy,
      recommendedIncentiveCode: incentiveCode,
      predictionConfidence: confidence,
      requiresApproval: true,
    });
  }

  // Segment breakdown
  const segments: RfmSegment[] = [
    "VIP Connoisseur",
    "Loyal Repeat Patron",
    "First-Time Patron",
    "At-Risk Lapsed",
    "New Prospect",
  ];

  const segmentChurnDistribution = segments.map((seg) => {
    const cohort = churnProfiles.filter((p) => p.rfmSegment === seg);
    const avgScore =
      cohort.length > 0
        ? Math.round(cohort.reduce((acc, p) => acc + p.churnRiskScore, 0) / cohort.length)
        : 0;
    const atRisk = cohort.filter(
      (p) => p.riskTier === "HIGH_RISK" || p.riskTier === "IMMINENT_CHURN"
    ).length;

    return {
      segment: seg,
      averageRiskScore: avgScore,
      atRiskCount: atRisk,
      totalCount: cohort.length,
    };
  });

  const highRiskPatrons = churnProfiles
    .filter((p) => p.riskTier === "HIGH_RISK" || p.riskTier === "IMMINENT_CHURN")
    .sort((a, b) => b.churnRiskScore - a.churnRiskScore)
    .slice(0, 15);

  return {
    totalAuditedCustomers: churnProfiles.length,
    lowRiskCount,
    moderateRiskCount,
    highRiskCount,
    imminentChurnCount,
    atRiskRevenueExposureInr,
    highRiskPatrons,
    segmentChurnDistribution,
    generatedAt: new Date().toISOString(),
  };
}
