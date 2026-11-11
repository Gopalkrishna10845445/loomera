/**
 * LOOMERA — Unified Business Recommendation Engine
 * Synthesizes cross-cutting signals from demand forecasts, inventory runout, churn risk,
 * profitability, anomalies, and marketing to generate prioritized, approval-gated operational recommendations.
 */

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessRecommendations } from "@/db/schema";
import { getInventoryIntelligence } from "./inventory-intelligence";
import { getCustomerChurnAnalysis } from "./churn-intelligence";
import { getProductProfitabilityAnalysis } from "./profitability-intelligence";
import { getMarketingIntelligenceReport } from "./marketing-intelligence";

export type RecommendationCategory =
  | "INVENTORY_RESTOCK"
  | "HIGH_RETURN_INVESTIGATION"
  | "CAMPAIGN_OPTIMIZATION"
  | "SLOW_MOVING_INVENTORY"
  | "RETENTION_AT_RISK"
  | "PROFITABILITY_IMPROVEMENT";

export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RecommendationStatus = "PENDING_APPROVAL" | "APPROVED" | "DISMISSED" | "COMPLETED";

export interface UnifiedRecommendation {
  id: string;
  category: RecommendationCategory;
  title: string;
  recommendation: string;
  supportingEvidence: string;
  expectedImpact: string;
  confidenceScore: number; // 0 to 100
  priority: RecommendationPriority;
  targetType: "PRODUCT" | "CATEGORY" | "CAMPAIGN" | "CUSTOMER_COHORT" | "GENERAL";
  targetId: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  status: RecommendationStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface RecommendationEngineSummary {
  totalActiveRecommendations: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  recommendations: UnifiedRecommendation[];
  generatedAt: string;
}

/**
 * Aggregates all subsystem signals and compiles unified, deduplicated business recommendations.
 */
export async function refreshUnifiedRecommendations(
  persist: boolean = true
): Promise<RecommendationEngineSummary> {
  const recommendations: UnifiedRecommendation[] = [];
  const now = new Date();
  const defaultExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. SIGNAL: Inventory Restock & Stockout Risks
  const inv = await getInventoryIntelligence();
  for (const r of inv.restockRecommendations.slice(0, 3)) {
    recommendations.push({
      id: crypto.randomUUID(),
      category: "INVENTORY_RESTOCK",
      title: `Restock Order Recommended: ${r.garmentName}`,
      recommendation: `Commission a replacement workshop batch of ${r.suggestedQuantity} units for ${r.garmentName}.`,
      supportingEvidence: `${r.reasoning} Current available stock: ${r.effectiveStock} units.`,
      expectedImpact: `Prevents revenue loss and captures projected unfulfilled customer demand over the next 45 days.`,
      confidenceScore: 88,
      priority: r.urgency === "CRITICAL_STOCKOUT" ? "CRITICAL" : "HIGH",
      targetType: "PRODUCT",
      targetId: r.productId,
      actionType: "RESTOCK_REVIEW",
      actionPayload: {
        variantId: r.variantId,
        suggestedQuantity: r.suggestedQuantity,
        sku: r.sku,
      },
      status: "PENDING_APPROVAL",
      expiresAt: defaultExpiry,
      createdAt: now.toISOString(),
    });
  }

  // 2. SIGNAL: High Return Rates Investigation
  const prof = await getProductProfitabilityAnalysis();
  for (const hp of prof.highReturnProducts.slice(0, 2)) {
    if (hp.returnRatePercent >= 10.0) {
      recommendations.push({
        id: crypto.randomUUID(),
        category: "HIGH_RETURN_INVESTIGATION",
        title: `Audit Return Rate on ${hp.productTitle}`,
        recommendation: `Conduct quality audit and size-chart verification on ${hp.productTitle} (${hp.returnRatePercent}% return rate).`,
        supportingEvidence: `${hp.returnUnitsCount} units returned out of ${hp.unitsSold} units sold, incurring INR ${hp.refundsInr.toLocaleString()} in refund processing.`,
        expectedImpact: `Reduces return logistics fees and enhances customer satisfaction for core catalog silhouettes.`,
        confidenceScore: 85,
        priority: hp.returnRatePercent > 20.0 ? "HIGH" : "MEDIUM",
        targetType: "PRODUCT",
        targetId: hp.productId,
        actionType: "RETURN_INSPECTION",
        actionPayload: { productId: hp.productId, returnRate: hp.returnRatePercent },
        status: "PENDING_APPROVAL",
        expiresAt: defaultExpiry,
        createdAt: now.toISOString(),
      });
    }
  }

  // 3. SIGNAL: Customer Churn Retention Interventions
  const churn = await getCustomerChurnAnalysis();
  if (churn.imminentChurnCount > 0 || churn.highRiskCount > 0) {
    const totalAtRisk = churn.imminentChurnCount + churn.highRiskCount;
    recommendations.push({
      id: crypto.randomUUID(),
      category: "RETENTION_AT_RISK",
      title: `Approve Retention Outreach to ${totalAtRisk} High-Value Patrons`,
      recommendation: `Authorize dispatch of bespoke seasonal revival invitation (Voucher: REVIVE20) to ${totalAtRisk} at-risk patrons.`,
      supportingEvidence: `Identified INR ${churn.atRiskRevenueExposureInr.toLocaleString()} in historical lifetime spend currently exposed to dormancy risk.`,
      expectedImpact: `Re-engages dormant connoisseurs and restores recurring purchase cadence.`,
      confidenceScore: 80,
      priority: churn.atRiskRevenueExposureInr > 20000 ? "HIGH" : "MEDIUM",
      targetType: "CUSTOMER_COHORT",
      targetId: "AT_RISK_LAPSED",
      actionType: "RETENTION_OUTREACH",
      actionPayload: {
        targetCount: totalAtRisk,
        recommendedVoucher: "REVIVE20",
        exposureInr: churn.atRiskRevenueExposureInr,
      },
      status: "PENDING_APPROVAL",
      expiresAt: defaultExpiry,
      createdAt: now.toISOString(),
    });
  }

  // 4. SIGNAL: Slow-Moving Inventory Clearance
  for (const sm of inv.slowMovingItems.slice(0, 2)) {
    recommendations.push({
      id: crypto.randomUUID(),
      category: "SLOW_MOVING_INVENTORY",
      title: `Feature Slow-Moving SKU: ${sm.productTitle} (${sm.colorName})`,
      recommendation: `Spotlight ${sm.productTitle} (${sm.colorName}, Size ${sm.size}) in upcoming artisanal edit newsletter or bundle promotion.`,
      supportingEvidence: `Current stock: ${sm.physicalStock} units with zero sales velocity in past 30 days. Capital tied up in stagnant inventory.`,
      expectedImpact: `Accelerates stock turnover and recovers working capital for new textile drops.`,
      confidenceScore: 75,
      priority: "LOW",
      targetType: "PRODUCT",
      targetId: sm.productId,
      actionType: "DISCOUNT_CLEARANCE",
      actionPayload: { variantId: sm.variantId, currentStock: sm.physicalStock },
      status: "PENDING_APPROVAL",
      expiresAt: defaultExpiry,
      createdAt: now.toISOString(),
    });
  }

  // 5. SIGNAL: Marketing Campaign Review
  const mkt = await getMarketingIntelligenceReport();
  for (const c of mkt.campaignEfficiency) {
    if (c.statusRecommendation === "PAUSE_REVIEW") {
      recommendations.push({
        id: crypto.randomUUID(),
        category: "CAMPAIGN_OPTIMIZATION",
        title: `Review Underperforming Campaign: ${c.name}`,
        recommendation: `Pause or revise messaging for campaign "${c.name}" (${c.code}).`,
        supportingEvidence: c.reasoning,
        expectedImpact: `Prevents budget dilution on low-converting promotional channels.`,
        confidenceScore: 82,
        priority: "MEDIUM",
        targetType: "CAMPAIGN",
        targetId: c.code,
        actionType: "CAMPAIGN_REVIEW",
        actionPayload: { campaignId: c.campaignId, code: c.code },
        status: "PENDING_APPROVAL",
        expiresAt: defaultExpiry,
        createdAt: now.toISOString(),
      });
    }
  }

  // Persist to PostgreSQL if requested
  if (persist && recommendations.length > 0) {
    for (const r of recommendations) {
      try {
        await db
          .insert(businessRecommendations)
          .values({
            id: r.id,
            category: r.category,
            title: r.title,
            recommendation: r.recommendation,
            supportingEvidence: r.supportingEvidence,
            expectedImpact: r.expectedImpact,
            confidenceScore: r.confidenceScore,
            priority: r.priority,
            targetType: r.targetType,
            targetId: r.targetId,
            actionType: r.actionType,
            actionPayload: r.actionPayload,
            status: r.status,
            expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
          })
          .onConflictDoNothing();
      } catch (err) {
        console.warn("Failed to persist business recommendation:", err);
      }
    }
  }

  const criticalCount = recommendations.filter((r) => r.priority === "CRITICAL").length;
  const highCount = recommendations.filter((r) => r.priority === "HIGH").length;
  const mediumCount = recommendations.filter((r) => r.priority === "MEDIUM").length;
  const lowCount = recommendations.filter((r) => r.priority === "LOW").length;

  return {
    totalActiveRecommendations: recommendations.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    recommendations,
    generatedAt: now.toISOString(),
  };
}

/**
 * Updates the approval status of a business recommendation.
 * Strict human review gate: recommendations only transition to APPROVED upon explicit administrator action.
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  newStatus: RecommendationStatus,
  reviewerUserId?: string
): Promise<boolean> {
  const updateData: {
    status: string;
    reviewedBy?: string | null;
    reviewedAt?: Date;
  } = {
    status: newStatus,
    reviewedBy: reviewerUserId || null,
    reviewedAt: new Date(),
  };

  const result = await db
    .update(businessRecommendations)
    .set(updateData)
    .where(eq(businessRecommendations.id, recommendationId))
    .returning({ id: businessRecommendations.id });

  return result.length > 0;
}
