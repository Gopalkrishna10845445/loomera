/**
 * LOOMERA — Administrative Shared Types & Constants
 * Safe for both Client Components and Server Runtime (Zero DB/Node dependencies).
 */

export const VALID_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLATION_REQUESTED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUND_PROCESSING",
  "REFUNDED",
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

/**
 * Deterministic State Machine Transition Matrix.
 * Restricts order progression to valid e-commerce lifecycles.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PACKED", "SHIPPED", "CANCELLATION_REQUESTED", "CANCELLED"],
  PROCESSING: ["PACKED", "SHIPPED", "CANCELLATION_REQUESTED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURN_REQUESTED", "RETURNED"],
  DELIVERED: ["RETURN_REQUESTED", "RETURNED"],
  CANCELLATION_REQUESTED: ["CANCELLED", "PROCESSING", "CONFIRMED"],
  CANCELLED: ["REFUND_PROCESSING", "REFUNDED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED", "REFUND_PROCESSING"],
  RETURNED: ["REFUND_PROCESSING", "REFUNDED"],
  REFUND_PROCESSING: ["REFUNDED"],
  REFUNDED: [],
} as const;

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_ORDER_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export const VALID_MOVEMENT_TYPES = [
  "STOCK_ADDED",
  "STOCK_REMOVED",
  "STOCK_ADJUSTED",
  "DAMAGED_STOCK",
  "RETURN_RECEIVED",
  "ORDER_COMMITTED",
  "ORDER_RESTORED",
] as const;

export type MovementType = (typeof VALID_MOVEMENT_TYPES)[number];

export interface InventoryOverviewItem {
  variantId: string;
  productId: string;
  productTitle: string;
  categorySlug: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  basePriceInr: number;
  priceOverrideInr: number | null;
  physicalStock: number;
  reservedStock: number;
  availableStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lowStockThreshold: number;
}

export interface BusinessSummaryMetrics {
  grossRevenueInr: number;
  netRevenueInr: number;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  averageOrderValueInr: number;
  totalCustomers: number;
  registeredUsersCount: number;
  totalInventoryUnits: number;
  totalInventoryValuationInr: number;
  lowStockVariantCount: number;
  outOfStockVariantCount: number;
}

export interface SalesTimelinePoint {
  date: string;
  grossRevenueInr: number;
  orderCount: number;
}

export interface TopProductMetric {
  productId: string;
  productTitle: string;
  unitsSold: number;
  grossRevenueInr: number;
  categorySlug: string;
}

export interface CategoryPerformanceMetric {
  categorySlug: string;
  categoryName: string;
  activeProductCount: number;
  unitsSold: number;
  grossRevenueInr: number;
}

export interface AdvancedAnalyticsMetrics {
  grossSalesInr: number;
  netSalesInr: number;
  totalDiscountsInr: number;
  totalRefundsInr: number;
  averageOrderValueInr: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  repeatPurchaseRatePercent: number;
  customerLifetimeValueInr: number;
  averageFulfilmentHours: number;
  cancellationRatePercent: number;
  returnRatePercent: number;
  refundRatePercent: number;
  delayedOrdersCount: number;
  inventoryTurnoverRatio: number;
  lowStockItemsCount: number;
  couponsRedeemedCount: number;
  promotionsActiveCount: number;
  referralSignupsCount: number;
  supportOpenTicketsCount: number;
}
