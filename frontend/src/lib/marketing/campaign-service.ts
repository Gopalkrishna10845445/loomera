/**
 * LOOMERA — Marketing & Customer Acquisition Service
 * Manages promotional banners, editorial campaigns, and referral tracking.
 */

import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { marketingCampaigns } from "@/db/schema";
import { recordAdminAuditLog } from "@/lib/admin/audit";

export interface CreateCampaignInput {
  name: string;
  code: string;
  headline: string;
  bannerText: string;
  ctaText: string;
  ctaLink: string;
  startsAt?: Date;
  endsAt?: Date;
  isActive?: boolean;
}

/**
 * Retrieves currently active campaigns within their scheduled flight dates.
 */
export async function getActiveCampaigns() {
  const now = new Date();

  const active = await db
    .select()
    .from(marketingCampaigns)
    .where(
      and(
        eq(marketingCampaigns.isActive, true),
        sql`${marketingCampaigns.startsAt} <= ${now}`,
        sql`(${marketingCampaigns.endsAt} IS NULL OR ${marketingCampaigns.endsAt} >= ${now})`
      )
    )
    .orderBy(desc(marketingCampaigns.createdAt));

  return active;
}

/**
 * Retrieves a single campaign by unique campaign code (case-insensitive).
 */
export async function getCampaignByCode(code: string) {
  const clean = code.trim().toUpperCase();
  const [campaign] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.code, clean));

  return campaign || null;
}

/**
 * Increments campaign impression counter atomically.
 */
export async function recordCampaignImpression(campaignId: string) {
  await db
    .update(marketingCampaigns)
    .set({
      impressions: sql`${marketingCampaigns.impressions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, campaignId));
}

/**
 * Increments campaign click counter atomically.
 */
export async function recordCampaignClick(campaignId: string) {
  await db
    .update(marketingCampaigns)
    .set({
      clicks: sql`${marketingCampaigns.clicks} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, campaignId));
}

/**
 * Admin: creates a new marketing campaign.
 */
export async function createAdminCampaign(params: {
  input: CreateCampaignInput;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { input, adminId, ipAddress } = params;
  const cleanCode = input.code.trim().toUpperCase();

  const [campaign] = await db
    .insert(marketingCampaigns)
    .values({
      name: input.name.trim(),
      code: cleanCode,
      headline: input.headline.trim(),
      bannerText: input.bannerText.trim(),
      ctaText: input.ctaText.trim(),
      ctaLink: input.ctaLink.trim(),
      startsAt: input.startsAt || new Date(),
      endsAt: input.endsAt || null,
      isActive: input.isActive ?? true,
    })
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "MARKETING_CAMPAIGN_CREATED",
    resourceType: "CAMPAIGN",
    resourceId: campaign.id,
    previousState: null,
    newState: { name: campaign.name, code: cleanCode },
    ipAddress,
  });

  return campaign;
}

/**
 * Admin: retrieves all marketing campaigns with click-through metrics.
 */
export async function getAdminCampaigns() {
  const campaigns = await db
    .select()
    .from(marketingCampaigns)
    .orderBy(desc(marketingCampaigns.createdAt));

  return campaigns.map((c) => ({
    ...c,
    ctrPercent: c.impressions > 0 ? Number(((c.clicks / c.impressions) * 100).toFixed(2)) : 0,
  }));
}

/**
 * Admin: updates an existing marketing campaign.
 */
export async function updateAdminCampaign(params: {
  campaignId: string;
  updates: Partial<CreateCampaignInput>;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { campaignId, updates, adminId, ipAddress } = params;

  const [existing] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, campaignId));

  if (!existing) {
    throw new Error(`Campaign with ID ${campaignId} not found`);
  }

  const patch: Partial<typeof marketingCampaigns.$inferInsert> = { updatedAt: new Date() };
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.headline !== undefined) patch.headline = updates.headline.trim();
  if (updates.bannerText !== undefined) patch.bannerText = updates.bannerText.trim();
  if (updates.ctaText !== undefined) patch.ctaText = updates.ctaText.trim();
  if (updates.ctaLink !== undefined) patch.ctaLink = updates.ctaLink.trim();
  if (updates.startsAt !== undefined) patch.startsAt = updates.startsAt;
  if (updates.endsAt !== undefined) patch.endsAt = updates.endsAt;
  if (updates.isActive !== undefined) patch.isActive = updates.isActive;

  const [updated] = await db
    .update(marketingCampaigns)
    .set(patch)
    .where(eq(marketingCampaigns.id, campaignId))
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "MARKETING_CAMPAIGN_UPDATED",
    resourceType: "CAMPAIGN",
    resourceId: campaignId,
    previousState: { isActive: existing.isActive, headline: existing.headline },
    newState: { isActive: updated.isActive, headline: updated.headline },
    ipAddress,
  });

  return updated;
}

/**
 * Admin: permanently deletes or deactivates a campaign.
 */
export async function deleteAdminCampaign(params: {
  campaignId: string;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { campaignId, adminId, ipAddress } = params;

  const [deleted] = await db
    .delete(marketingCampaigns)
    .where(eq(marketingCampaigns.id, campaignId))
    .returning();

  if (deleted) {
    await recordAdminAuditLog({
      adminId,
      action: "MARKETING_CAMPAIGN_DELETED",
      resourceType: "CAMPAIGN",
      resourceId: campaignId,
      previousState: { code: deleted.code, name: deleted.name },
      newState: null,
      ipAddress,
    });
  }

  return deleted || null;
}
