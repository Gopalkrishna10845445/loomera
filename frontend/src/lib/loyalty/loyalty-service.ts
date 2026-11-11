/**
 * LOOMERA — Patron Loyalty & Retention Architecture
 * Manages tiered patron membership, purchase-based point rewards, referral bonuses,
 * and immutable points audit ledgers.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  loyaltyAccounts,
  loyaltyTransactions,
  users,
  orders,
} from "@/db/schema";

export const LOYALTY_TIERS = {
  SILVER: { name: "Silver Patron", minLifetimePoints: 0, multiplier: 1.0 },
  GOLD: { name: "Gold Connoisseur", minLifetimePoints: 5000, multiplier: 1.25 },
  PLATINUM: { name: "Platinum Sovereign", minLifetimePoints: 15000, multiplier: 1.5 },
  ATELIER_PRIVILEGE: { name: "Atelier Privilege VIP", minLifetimePoints: 30000, multiplier: 2.0 },
} as const;

export type LoyaltyTier = keyof typeof LOYALTY_TIERS;

export function determineTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= LOYALTY_TIERS.ATELIER_PRIVILEGE.minLifetimePoints) return "ATELIER_PRIVILEGE";
  if (lifetimePoints >= LOYALTY_TIERS.PLATINUM.minLifetimePoints) return "PLATINUM";
  if (lifetimePoints >= LOYALTY_TIERS.GOLD.minLifetimePoints) return "GOLD";
  return "SILVER";
}

export function generateReferralCode(fullName: string): string {
  const cleanName = fullName.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "PATR";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LMR-${cleanName}${randomSuffix}`;
}

/**
 * Retrieves or creates a patron's loyalty account.
 */
export async function getOrCreateLoyaltyAccount(userId: string) {
  const [existing] = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [user] = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const referralCode = generateReferralCode(user?.fullName || "ATELIER");

  const [created] = await db
    .insert(loyaltyAccounts)
    .values({
      userId,
      tier: "SILVER",
      pointsBalance: 100, // 100 Welcome Points
      lifetimePointsEarned: 100,
      lifetimePointsRedeemed: 0,
      referralCode,
    })
    .returning();

  // Record initial welcome points transaction
  await db.insert(loyaltyTransactions).values({
    accountId: created.id,
    type: "PURCHASE_EARN",
    pointsDelta: 100,
    balanceAfter: 100,
    referenceType: "MANUAL",
    referenceId: "WELCOME_CREDIT",
    description: "Welcome to LOOMERA Atelier Privilege Club",
  });

  return created;
}

/**
 * Calculates and awards purchase-based points on successful order confirmation.
 * 1 Point per ₹10 spent, scaled by the patron's tier multiplier.
 */
export async function awardPurchasePoints(
  orderId: string,
  clientTx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  const runner = clientTx || db;

  const [order] = await runner
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order || order.status !== "CONFIRMED") {
    return null;
  }

  const account = await getOrCreateLoyaltyAccount(order.userId);
  const tierConfig = LOYALTY_TIERS[account.tier as LoyaltyTier] || LOYALTY_TIERS.SILVER;

  const basePoints = Math.floor(order.totalInr / 10);
  const earnedPoints = Math.max(1, Math.round(basePoints * tierConfig.multiplier));

  const newBalance = account.pointsBalance + earnedPoints;
  const newLifetime = account.lifetimePointsEarned + earnedPoints;
  const nextTier = determineTier(newLifetime);

  await runner
    .update(loyaltyAccounts)
    .set({
      pointsBalance: newBalance,
      lifetimePointsEarned: newLifetime,
      tier: nextTier,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyAccounts.id, account.id));

  await runner.insert(loyaltyTransactions).values({
    accountId: account.id,
    type: "PURCHASE_EARN",
    pointsDelta: earnedPoints,
    balanceAfter: newBalance,
    referenceType: "ORDER",
    referenceId: order.orderNumber,
    description: `Earned on order ${order.orderNumber} (${tierConfig.name} ${tierConfig.multiplier}x)`,
  });

  return { earnedPoints, newBalance, tier: nextTier };
}

/**
 * Awards referral bonus to both the referrer and the referee upon referee's first purchase.
 */
export async function awardReferralBonus(referralCode: string, newUserId: string) {
  const cleanCode = referralCode.trim().toUpperCase();

  const [referrerAccount] = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.referralCode, cleanCode))
    .limit(1);

  if (!referrerAccount || referrerAccount.userId === newUserId) {
    return { success: false, message: "Invalid referral voucher code" };
  }

  const refereeAccount = await getOrCreateLoyaltyAccount(newUserId);

  if (refereeAccount.referredByUserId) {
    return { success: false, message: "Referral bonus has already been claimed" };
  }

  const REFERRAL_BONUS_POINTS = 250;

  await db.transaction(async (tx) => {
    // 1. Credit Referrer
    const newReferrerBalance = referrerAccount.pointsBalance + REFERRAL_BONUS_POINTS;
    const newReferrerLifetime = referrerAccount.lifetimePointsEarned + REFERRAL_BONUS_POINTS;
    const referrerTier = determineTier(newReferrerLifetime);

    await tx
      .update(loyaltyAccounts)
      .set({
        pointsBalance: newReferrerBalance,
        lifetimePointsEarned: newReferrerLifetime,
        tier: referrerTier,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, referrerAccount.id));

    await tx.insert(loyaltyTransactions).values({
      accountId: referrerAccount.id,
      type: "REFERRAL_BONUS",
      pointsDelta: REFERRAL_BONUS_POINTS,
      balanceAfter: newReferrerBalance,
      referenceType: "REFERRAL",
      referenceId: newUserId,
      description: `Referral reward for introducing a fellow patron`,
    });

    // 2. Credit Referee
    const newRefereeBalance = refereeAccount.pointsBalance + REFERRAL_BONUS_POINTS;
    const newRefereeLifetime = refereeAccount.lifetimePointsEarned + REFERRAL_BONUS_POINTS;

    await tx
      .update(loyaltyAccounts)
      .set({
        pointsBalance: newRefereeBalance,
        lifetimePointsEarned: newRefereeLifetime,
        referredByUserId: referrerAccount.userId,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, refereeAccount.id));

    await tx.insert(loyaltyTransactions).values({
      accountId: refereeAccount.id,
      type: "REFERRAL_BONUS",
      pointsDelta: REFERRAL_BONUS_POINTS,
      balanceAfter: newRefereeBalance,
      referenceType: "REFERRAL",
      referenceId: referrerAccount.userId,
      description: `Welcome bonus via patron referral (${cleanCode})`,
    });
  });

  return { success: true, bonusPoints: REFERRAL_BONUS_POINTS };
}

/**
 * Retrieves patron loyalty profile and chronological audit history.
 */
export async function getLoyaltyProfile(userId: string) {
  const account = await getOrCreateLoyaltyAccount(userId);

  const transactions = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.accountId, account.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(50);

  const tierConfig = LOYALTY_TIERS[account.tier as LoyaltyTier] || LOYALTY_TIERS.SILVER;

  return {
    account,
    tierName: tierConfig.name,
    earnMultiplier: tierConfig.multiplier,
    transactions,
  };
}
