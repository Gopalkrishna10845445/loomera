/**
 * LOOMERA — Deterministic A/B Experimentation Engine
 * Provides zero-flicker, privacy-first variant assignment using SHA-256 hash bucketing.
 */

import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { experiments, experimentAssignments, orders } from "@/db/schema";

export interface ExperimentVariantResult {
  variant: string;
  assignedVisitors: number;
  ordersCount: number;
  revenueInr: number;
  conversionRatePercent: number;
}

export interface ExperimentReport {
  experimentId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  variants: string[];
  totalAssigned: number;
  results: ExperimentVariantResult[];
}

/**
 * Computes a deterministic integer in range [0, 99] from visitorId and experimentId.
 */
export function hashVisitorToBucket(visitorId: string, experimentId: string): number {
  const hash = crypto
    .createHash("sha256")
    .update(`${visitorId}:${experimentId}`)
    .digest("hex");
  const subInt = parseInt(hash.slice(0, 8), 16);
  return subInt % 100;
}

/**
 * Deterministically assigns a visitor to an active experiment variant.
 * Guarantees zero-flicker consistency across repeat visits.
 */
export async function getOrAssignVariant(params: {
  experimentId: string;
  visitorId: string;
  userId?: string | null;
}): Promise<string> {
  const { experimentId, visitorId, userId } = params;

  // 1. Check existing assignment in database
  const [existing] = await db
    .select()
    .from(experimentAssignments)
    .where(
      and(
        eq(experimentAssignments.experimentId, experimentId),
        eq(experimentAssignments.visitorId, visitorId)
      )
    );

  if (existing) {
    return existing.variant;
  }

  // 2. Fetch experiment configuration
  const [exp] = await db
    .select()
    .from(experiments)
    .where(eq(experiments.id, experimentId));

  if (!exp || !exp.isActive || !exp.variants || exp.variants.length === 0) {
    return "control";
  }

  // 3. Compute deterministic hash bucket
  const bucket = hashVisitorToBucket(visitorId, experimentId);

  // If traffic allocation is e.g. 80%, users with bucket >= 80 get "control"
  if (bucket >= exp.trafficAllocationPercent) {
    return "control";
  }

  // Distribute uniformly among variants
  const variantIndex = bucket % exp.variants.length;
  const chosenVariant = exp.variants[variantIndex] || "control";

  // 4. Record assignment asynchronously (gracefully ignoring conflicts)
  try {
    await db
      .insert(experimentAssignments)
      .values({
        experimentId,
        visitorId,
        userId: userId || null,
        variant: chosenVariant,
      })
      .onConflictDoNothing();
  } catch (err) {
    console.warn("[A/B Testing] Assignment record conflict handled:", err);
  }

  return chosenVariant;
}

/**
 * Retrieves conversion metrics and variant performance for an experiment.
 */
export async function getExperimentReport(experimentId: string): Promise<ExperimentReport | null> {
  const [exp] = await db
    .select()
    .from(experiments)
    .where(eq(experiments.id, experimentId));

  if (!exp) return null;

  const assignments = await db
    .select({
      variant: experimentAssignments.variant,
      visitorId: experimentAssignments.visitorId,
      userId: experimentAssignments.userId,
    })
    .from(experimentAssignments)
    .where(eq(experimentAssignments.experimentId, experimentId));

  const variantStats: Record<string, { visitors: Set<string>; users: Set<string> }> = {};
  for (const v of exp.variants) {
    variantStats[v] = { visitors: new Set(), users: new Set() };
  }

  for (const a of assignments) {
    if (!variantStats[a.variant]) {
      variantStats[a.variant] = { visitors: new Set(), users: new Set() };
    }
    variantStats[a.variant].visitors.add(a.visitorId);
    if (a.userId) variantStats[a.variant].users.add(a.userId);
  }

  // Fetch confirmed orders
  const allOrders = await db
    .select({
      userId: orders.userId,
      totalInr: orders.totalInr,
    })
    .from(orders)
    .where(sql`${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`);

  const results: ExperimentVariantResult[] = [];

  for (const [variant, data] of Object.entries(variantStats)) {
    const assignedVisitors = data.visitors.size;
    let ordersCount = 0;
    let revenueInr = 0;

    for (const ord of allOrders) {
      if (data.users.has(ord.userId)) {
        ordersCount += 1;
        revenueInr += ord.totalInr;
      }
    }

    const conversionRatePercent =
      assignedVisitors > 0 ? Number(((ordersCount / assignedVisitors) * 100).toFixed(2)) : 0;

    results.push({
      variant,
      assignedVisitors,
      ordersCount,
      revenueInr,
      conversionRatePercent,
    });
  }

  return {
    experimentId: exp.id,
    name: exp.name,
    description: exp.description,
    isActive: exp.isActive,
    variants: exp.variants,
    totalAssigned: assignments.length,
    results,
  };
}
