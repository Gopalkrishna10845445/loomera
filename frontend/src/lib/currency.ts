/**
 * LOOMERA — Centralized Storefront Currency Engine
 * Standardizes storefront currency formatting to Indian Rupees (INR, ₹)
 * using the standard Intl.NumberFormat API with the 'en-IN' locale.
 */

export const CURRENCY_CODE = "INR" as const;
export const CURRENCY_SYMBOL = "₹" as const;
export const CURRENCY_LOCALE = "en-IN" as const;

export interface FormatInrOptions {
  /**
   * If true, always display 2 decimal places (e.g., ₹2,499.00).
   * If false, never display decimal places (e.g., ₹2,499).
   * If undefined (default), displays decimals only when fractional paise exist (e.g. 2499.50 -> ₹2,499.50).
   */
  showDecimals?: boolean;
  /**
   * String to display when the amount is null, undefined, or NaN.
   * Defaults to '₹0'.
   */
  fallback?: string;
}

/**
 * Format a numeric amount into standard Indian Rupee notation (e.g. 2499 -> ₹2,499).
 * Under modern Intl.NumberFormat rules, en-IN groups digits as 1,00,000 (lakhs/crores).
 */
export function formatInr(
  amount: number | null | undefined,
  options: FormatInrOptions = {}
): string {
  const { showDecimals, fallback = "₹0" } = options;

  if (amount === null || amount === undefined || typeof amount !== "number" || Number.isNaN(amount)) {
    return fallback;
  }

  // Determine whether to display decimal places
  let fractionDigits = 0;
  if (typeof showDecimals === "boolean") {
    fractionDigits = showDecimals ? 2 : 0;
  } else {
    // If fractional paise exist, show 2 decimal places; otherwise show whole rupees
    fractionDigits = amount % 1 !== 0 ? 2 : 0;
  }

  try {
    const formatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: "currency",
      currency: CURRENCY_CODE,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return formatter.format(amount);
  } catch (error) {
    // Fallback if Intl is unavailable or throws in an edge-case environment
    console.error("formatInr error:", error);
    const rounded = fractionDigits > 0 ? amount.toFixed(fractionDigits) : Math.round(amount).toString();
    return `${CURRENCY_SYMBOL}${rounded}`;
  }
}

/**
 * Alias for formatInr to provide intuitive ergonomics across components
 */
export const formatPrice = formatInr;

/**
 * Safe numeric parser for string inputs (e.g. "₹2,499" -> 2499)
 */
export function parsePrice(priceString: string): number {
  if (!priceString || typeof priceString !== "string") return 0;
  const cleaned = priceString.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}
