/**
 * LOOMERA — Centralized Pricing Engine & Shipping Logic
 * Provides pure, consistent pricing, discount, and shipping calculations in INR.
 * All prices are manipulated as numeric integers/floats and formatted using formatInr.
 */

import { formatInr } from "./currency";

/**
 * Global Storefront Shipping Configuration (INR)
 * Sourced directly from brand promise: "Free Shipping on Orders Above ₹2,999"
 */
export const SHIPPING_CONFIG = {
  FREE_SHIPPING_THRESHOLD_INR: 2999,
  STANDARD_SHIPPING_FEE_INR: 199,
  EXPRESS_SHIPPING_FEE_INR: 399,
} as const;

export interface PriceBreakdown {
  originalPrice: number;
  salePrice: number;
  discountAmount: number;
  discountPercent: number;
  isOnSale: boolean;
  formattedOriginalPrice: string;
  formattedSalePrice: string;
}

/**
 * Calculates discount percentage and formatted prices.
 * Strict rule: Discounted prices cannot exceed original prices.
 * If salePrice > originalPrice, clamps or treats regular price without negative discount.
 */
export function calculatePriceBreakdown(
  basePrice: number | null | undefined,
  compareAtPrice?: number | null | undefined
): PriceBreakdown {
  const sale = Math.max(0, typeof basePrice === "number" && !Number.isNaN(basePrice) ? basePrice : 0);
  const original =
    typeof compareAtPrice === "number" && !Number.isNaN(compareAtPrice) && compareAtPrice > 0
      ? compareAtPrice
      : sale;

  // Rule: sale price cannot exceed original price
  const validOriginal = Math.max(sale, original);
  const discountAmount = Math.max(0, validOriginal - sale);
  const discountPercent =
    validOriginal > 0 && discountAmount > 0
      ? Math.round((discountAmount / validOriginal) * 100)
      : 0;

  const isOnSale = discountAmount > 0 && discountPercent > 0;

  return {
    originalPrice: validOriginal,
    salePrice: sale,
    discountAmount,
    discountPercent,
    isOnSale,
    formattedOriginalPrice: formatInr(validOriginal),
    formattedSalePrice: formatInr(sale),
  };
}

export interface ShippingCalculation {
  threshold: number;
  subtotal: number;
  amountRemaining: number;
  progressPercent: number;
  isFreeShipping: boolean;
  shippingFee: number;
  formattedThreshold: string;
  formattedAmountRemaining: string;
  formattedShippingFee: string;
  bannerMessage: string;
}

/**
 * Calculates free shipping progress and amount remaining based on the centralized threshold.
 */
export function calculateShipping(
  subtotal: number,
  threshold = SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR
): ShippingCalculation {
  const safeSubtotal = Math.max(0, typeof subtotal === "number" && !Number.isNaN(subtotal) ? subtotal : 0);
  const amountRemaining = Math.max(0, threshold - safeSubtotal);
  const isFreeShipping = safeSubtotal >= threshold && safeSubtotal > 0;
  const progressPercent = safeSubtotal === 0 ? 0 : Math.min(100, Math.round((safeSubtotal / threshold) * 100));
  const shippingFee = isFreeShipping || safeSubtotal === 0 ? 0 : SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR;

  let bannerMessage = `Free Shipping on Orders Above ${formatInr(threshold)}`;
  if (safeSubtotal > 0) {
    bannerMessage = isFreeShipping
      ? "Complimentary shipping unlocked!"
      : `Add ${formatInr(amountRemaining)} for complimentary delivery`;
  }

  return {
    threshold,
    subtotal: safeSubtotal,
    amountRemaining,
    progressPercent,
    isFreeShipping,
    shippingFee,
    formattedThreshold: formatInr(threshold),
    formattedAmountRemaining: formatInr(amountRemaining),
    formattedShippingFee: isFreeShipping ? "FREE" : formatInr(shippingFee),
    bannerMessage,
  };
}

/**
 * Validates and sums cart items to obtain a subtotal in INR.
 */
export function calculateCartSubtotal(
  items: Array<{ price: number; quantity: number }>
): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => {
    if (!item) return acc;
    const price = typeof item.price === "number" && !Number.isNaN(item.price) && item.price > 0 ? item.price : 0;
    const qty = typeof item.quantity === "number" && !Number.isNaN(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 0;
    return acc + price * qty;
  }, 0);
}
