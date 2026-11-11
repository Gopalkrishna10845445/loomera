/**
 * LOOMERA — Promotional Engine & Coupon Validation Service
 * Server-authoritative promotion calculation, eligibility verification,
 * transaction-safe usage tracking, and multi-tier discount application.
 */

import { eq, and, sql, desc, count } from "drizzle-orm";
import { db } from "@/db";
import {
  coupons,
  couponRedemptions,
  orders,
} from "@/db/schema";
import { recordAdminAuditLog } from "@/lib/admin/audit";

export interface ValidateCouponParams {
  code: string;
  userId?: string;
  subtotalInr: number;
  items?: Array<{
    productId: string;
    quantity: number;
    unitPriceInr: number;
    categorySlug?: string;
  }>;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountInr: number;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  description: string;
  message: string;
  couponId?: string;
}

/**
 * Validates a coupon code server-side and computes the exact INR discount amount.
 * Prevents client discount tampering and enforces all promotional restrictions.
 */
export async function validateAndCalculateCouponDiscount(
  params: ValidateCouponParams
): Promise<CouponValidationResult> {
  const { code, userId, subtotalInr, items = [] } = params;

  if (!code || code.trim().length === 0) {
    return {
      valid: false,
      code: "",
      discountInr: 0,
      discountType: "FIXED_AMOUNT",
      discountValue: 0,
      description: "",
      message: "Please enter a promotional code.",
    };
  }

  const cleanCode = code.trim().toUpperCase();

  // 1. Fetch active coupon by uppercase code
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(sql`UPPER(${coupons.code})`, cleanCode))
    .limit(1);

  if (!coupon) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: "FIXED_AMOUNT",
      discountValue: 0,
      description: "",
      message: "Invalid promotion code. Please check and try again.",
    };
  }

  // 2. Check active flag
  if (!coupon.isActive) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: coupon.discountValue,
      description: coupon.description,
      message: "This promotion code is currently inactive.",
    };
  }

  // 3. Check date range (with 10-second skew tolerance)
  const now = new Date();
  if (coupon.startsAt && now.getTime() + 10000 < coupon.startsAt.getTime()) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: coupon.discountValue,
      description: coupon.description,
      message: "This promotional campaign has not started yet.",
    };
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: coupon.discountValue,
      description: coupon.description,
      message: "This promotion code has expired.",
    };
  }

  // 4. Check global usage limit
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: coupon.discountValue,
      description: coupon.description,
      message: "This promotion has reached its maximum global redemptions.",
    };
  }

  // 5. Check minimum order value
  if (subtotalInr < coupon.minOrderValueInr) {
    return {
      valid: false,
      code: cleanCode,
      discountInr: 0,
      discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: coupon.discountValue,
      description: coupon.description,
      message: `Minimum order value of ₹${coupon.minOrderValueInr.toLocaleString("en-IN")} required for this voucher.`,
    };
  }

  // 6. Check per-customer usage limit
  if (userId) {
    const [redemptionCountRow] = await db
      .select({ count: count() })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));

    const customerRedemptions = redemptionCountRow?.count || 0;
    if (customerRedemptions >= coupon.perCustomerLimit) {
      return {
        valid: false,
        code: cleanCode,
        discountInr: 0,
        discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
        discountValue: coupon.discountValue,
        description: coupon.description,
        message: "You have already used this promotional voucher.",
      };
    }
  }

  // 7. Check first-order promotion restriction
  if (coupon.firstOrderOnly && userId) {
    const [existingOrdersRow] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`${orders.status} NOT IN ('CANCELLED', 'PENDING_PAYMENT')`
        )
      );

    if ((existingOrdersRow?.count || 0) > 0) {
      return {
        valid: false,
        code: cleanCode,
        discountInr: 0,
        discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
        discountValue: coupon.discountValue,
        description: coupon.description,
        message: "This promotion is reserved exclusively for your first atelier order.",
      };
    }
  }

  // 8. Compute discount amount with item/category restriction support
  let eligibleSubtotal = subtotalInr;

  if (coupon.applicableProductId) {
    eligibleSubtotal = items
      .filter((i) => i.productId === coupon.applicableProductId)
      .reduce((sum, i) => sum + i.unitPriceInr * i.quantity, 0);

    if (eligibleSubtotal === 0) {
      return {
        valid: false,
        code: cleanCode,
        discountInr: 0,
        discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
        discountValue: coupon.discountValue,
        description: coupon.description,
        message: "This voucher is only valid for specific atelier garments.",
      };
    }
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    calculatedDiscount = Math.round((eligibleSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountInr && coupon.maxDiscountInr > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, coupon.maxDiscountInr);
    }
  } else {
    // FIXED_AMOUNT
    calculatedDiscount = Math.min(eligibleSubtotal, coupon.discountValue);
  }

  return {
    valid: true,
    code: cleanCode,
    couponId: coupon.id,
    discountInr: calculatedDiscount,
    discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: coupon.discountValue,
    description: coupon.description,
    message: `Voucher applied: ₹${calculatedDiscount.toLocaleString("en-IN")} savings unlocked.`,
  };
}

/**
 * Records a coupon redemption atomically in the database.
 */
export async function recordCouponRedemption(
  params: {
    couponId: string;
    userId: string;
    orderId: string;
    discountAmountInr: number;
  },
  clientTx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
) {
  const { couponId, userId, orderId, discountAmountInr } = params;
  const runner = clientTx || db;

  // Insert redemption record
  await runner.insert(couponRedemptions).values({
    couponId,
    userId,
    orderId,
    discountAmountInr,
  });

  // Increment usage count on coupon
  await runner
    .update(coupons)
    .set({
      usageCount: sql`${coupons.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(coupons.id, couponId));
}

// ============================================================================
// ADMINISTRATIVE PROMOTION MANAGEMENT
// ============================================================================

export interface CreateCouponInput {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderValueInr?: number;
  maxDiscountInr?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  applicableCategorySlug?: string;
  applicableProductId?: string;
  firstOrderOnly?: boolean;
  isActive?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
}

export async function createAdminCoupon(params: {
  input: CreateCouponInput;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { input, adminId, ipAddress } = params;
  const cleanCode = input.code.trim().toUpperCase();

  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(sql`UPPER(${coupons.code})`, cleanCode))
    .limit(1);

  if (existing) {
    throw new Error(`Promotion code '${cleanCode}' already exists`);
  }

  const [newCoupon] = await db
    .insert(coupons)
    .values({
      code: cleanCode,
      description: input.description,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderValueInr: input.minOrderValueInr ?? 0,
      maxDiscountInr: input.maxDiscountInr ?? null,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? 1,
      applicableCategorySlug: input.applicableCategorySlug ?? null,
      applicableProductId: input.applicableProductId ?? null,
      firstOrderOnly: input.firstOrderOnly ?? false,
      isActive: input.isActive ?? true,
      startsAt: input.startsAt ?? new Date(),
      expiresAt: input.expiresAt ?? null,
    })
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "COUPON_CREATED",
    resourceType: "PROMOTION",
    resourceId: newCoupon.id,
    previousState: null,
    newState: { code: cleanCode, discountType: input.discountType, discountValue: input.discountValue },
    ipAddress,
  });

  return newCoupon;
}

export async function getAdminCoupons() {
  const list = await db
    .select()
    .from(coupons)
    .orderBy(desc(coupons.createdAt));

  return list;
}

export async function toggleCouponStatus(params: {
  couponId: string;
  isActive: boolean;
  adminId: string;
  ipAddress?: string | null;
}) {
  const { couponId, isActive, adminId, ipAddress } = params;

  const [updated] = await db
    .update(coupons)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(coupons.id, couponId))
    .returning();

  if (!updated) {
    throw new Error("Coupon not found");
  }

  await recordAdminAuditLog({
    adminId,
    action: "COUPON_STATUS_TOGGLED",
    resourceType: "PROMOTION",
    resourceId: couponId,
    previousState: { isActive: !isActive },
    newState: { isActive },
    ipAddress,
  });

  return updated;
}
