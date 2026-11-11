import { db } from "@/db";
import {
  productViewHistory,
  searchHistory,
  wishlists,
  wishlistItems,
  orders,
  orderItems,
  products,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface CategoryAffinity {
  categorySlug: string;
  weight: number; // Normalized score 0 - 1
  count: number;
}

export interface FabricAffinity {
  fabric: string;
  weight: number;
  count: number;
}

export interface ColorAffinity {
  color: string;
  weight: number;
  count: number;
}

export interface CustomerPreferenceProfile {
  userId?: string | null;
  sessionId?: string | null;
  topCategories: CategoryAffinity[];
  topFabrics: FabricAffinity[];
  topColors: ColorAffinity[];
  preferredSizes: string[];
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  totalInteractions: number;
  viewCount: number;
  orderCount: number;
  wishlistCount: number;
  searchCount: number;
  isColdStart: boolean;
  computedAt: Date;
}

const COMMON_FABRICS = [
  "linen",
  "cotton",
  "handloom",
  "silk",
  "khadi",
  "chanderi",
  "mulberry",
  "wool",
];

/**
 * Extracts fabric names from product description, fabricCare, or craftDetail.
 */
function extractFabrics(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const f of COMMON_FABRICS) {
    if (lower.includes(f)) {
      matched.push(f);
    }
  }
  return matched;
}

/**
 * Generates an authoritative customer preference profile based on live database records.
 * Analyzes:
 * - Product Views (Recency weighted)
 * - Wishlist items (Intent weighted)
 * - Confirmed Orders (Highest conversion intent)
 * - Search History (Query keywords & filters)
 */
export async function getCustomerPreferenceProfile(params: {
  userId?: string | null;
  sessionId?: string | null;
}): Promise<CustomerPreferenceProfile> {
  const { userId, sessionId } = params;

  // 1. Fetch recently viewed products (up to 30)
  const viewConditions = [];
  if (userId) {
    viewConditions.push(eq(productViewHistory.userId, userId));
  } else if (sessionId) {
    viewConditions.push(eq(productViewHistory.sessionId, sessionId));
  }

  const recentViews =
    viewConditions.length > 0
      ? await db
          .select({
            productId: productViewHistory.productId,
            viewedAt: productViewHistory.viewedAt,
          })
          .from(productViewHistory)
          .where(and(...viewConditions))
          .orderBy(desc(productViewHistory.viewedAt))
          .limit(30)
      : [];

  // 2. Fetch Wishlist Items (only for authenticated users)
  let userWishlistProductIds: string[] = [];
  if (userId) {
    const userWishlist = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(eq(wishlists.userId, userId))
      .limit(1);

    if (userWishlist.length > 0) {
      const wItems = await db
        .select({ productId: wishlistItems.productId })
        .from(wishlistItems)
        .where(eq(wishlistItems.wishlistId, userWishlist[0].id));
      userWishlistProductIds = wItems.map((w) => w.productId);
    }
  }

  // 3. Fetch Orders & Order Items (only for authenticated users)
  let purchasedItems: {
    productId: string;
    size: string;
    color: string;
    unitPriceInr: number;
  }[] = [];

  if (userId) {
    const userOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          inArray(orders.status, ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"])
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(15);

    if (userOrders.length > 0) {
      const orderIds = userOrders.map((o) => o.id);
      purchasedItems = await db
        .select({
          productId: orderItems.productId,
          size: orderItems.size,
          color: orderItems.color,
          unitPriceInr: orderItems.unitPriceInr,
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
    }
  }

  // 4. Fetch Search History (up to 20)
  const searchConditions = [];
  if (userId) {
    searchConditions.push(eq(searchHistory.userId, userId));
  } else if (sessionId) {
    searchConditions.push(eq(searchHistory.sessionId, sessionId));
  }

  const recentSearches =
    searchConditions.length > 0
      ? await db
          .select({
            query: searchHistory.searchQuery,
            filtersJson: searchHistory.filtersJson,
          })
          .from(searchHistory)
          .where(and(...searchConditions))
          .orderBy(desc(searchHistory.createdAt))
          .limit(20)
      : [];

  // Total interactions count
  const totalInteractions =
    recentViews.length +
    userWishlistProductIds.length +
    purchasedItems.length +
    recentSearches.length;

  const isColdStart = totalInteractions === 0;

  // If Cold Start, return sensible luxury default profile
  if (isColdStart) {
    return {
      userId: userId || null,
      sessionId: sessionId || null,
      topCategories: [
        { categorySlug: "men", weight: 0.6, count: 0 },
        { categorySlug: "handloom", weight: 0.25, count: 0 },
        { categorySlug: "boys", weight: 0.15, count: 0 },
      ],
      topFabrics: [
        { fabric: "linen", weight: 0.5, count: 0 },
        { fabric: "cotton", weight: 0.3, count: 0 },
        { fabric: "handloom", weight: 0.2, count: 0 },
      ],
      topColors: [
        { color: "White", weight: 0.35, count: 0 },
        { color: "Indigo", weight: 0.35, count: 0 },
        { color: "Natural", weight: 0.3, count: 0 },
      ],
      preferredSizes: ["M", "L"],
      priceRange: {
        min: 1200,
        max: 3500,
        average: 2400,
      },
      totalInteractions: 0,
      viewCount: 0,
      orderCount: 0,
      wishlistCount: 0,
      searchCount: 0,
      isColdStart: true,
      computedAt: new Date(),
    };
  }

  // Collect all unique product IDs referenced across views, wishlist, purchases
  const allProductIds = Array.from(
    new Set([
      ...recentViews.map((v) => v.productId),
      ...userWishlistProductIds,
      ...purchasedItems.map((p) => p.productId),
    ])
  );

  // Fetch product metadata for all referenced products
  const productRecords =
    allProductIds.length > 0
      ? await db
          .select({
            id: products.id,
            categorySlug: products.categorySlug,
            basePriceInr: products.basePriceInr,
            description: products.description,
            fabricCare: products.fabricCare,
            craftDetail: products.craftDetail,
          })
          .from(products)
          .where(inArray(products.id, allProductIds))
      : [];

  const productMap = new Map(productRecords.map((p) => [p.id, p]));

  // Frequency and weight accumulators
  const categoryCounts = new Map<string, number>();
  const fabricCounts = new Map<string, number>();
  const colorCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();
  const prices: number[] = [];

  // A. Process Views (Weight = 1.0)
  recentViews.forEach((v) => {
    const prod = productMap.get(v.productId);
    if (prod) {
      categoryCounts.set(
        prod.categorySlug,
        (categoryCounts.get(prod.categorySlug) || 0) + 1.0
      );
      prices.push(prod.basePriceInr);

      const combinedText = `${prod.description} ${prod.fabricCare || ""} ${prod.craftDetail || ""}`;
      extractFabrics(combinedText).forEach((f) => {
        fabricCounts.set(f, (fabricCounts.get(f) || 0) + 1.0);
      });
    }
  });

  // B. Process Wishlist Items (Weight = 2.0)
  userWishlistProductIds.forEach((pid) => {
    const prod = productMap.get(pid);
    if (prod) {
      categoryCounts.set(
        prod.categorySlug,
        (categoryCounts.get(prod.categorySlug) || 0) + 2.0
      );
      prices.push(prod.basePriceInr);

      const combinedText = `${prod.description} ${prod.fabricCare || ""} ${prod.craftDetail || ""}`;
      extractFabrics(combinedText).forEach((f) => {
        fabricCounts.set(f, (fabricCounts.get(f) || 0) + 2.0);
      });
    }
  });

  // C. Process Purchases (Weight = 3.5 — Strongest Signal)
  purchasedItems.forEach((pi) => {
    const prod = productMap.get(pi.productId);
    if (prod) {
      categoryCounts.set(
        prod.categorySlug,
        (categoryCounts.get(prod.categorySlug) || 0) + 3.5
      );
      prices.push(pi.unitPriceInr);

      const combinedText = `${prod.description} ${prod.fabricCare || ""} ${prod.craftDetail || ""}`;
      extractFabrics(combinedText).forEach((f) => {
        fabricCounts.set(f, (fabricCounts.get(f) || 0) + 3.5);
      });
    }
    if (pi.size) {
      sizeCounts.set(pi.size, (sizeCounts.get(pi.size) || 0) + 3.0);
    }
    if (pi.color) {
      colorCounts.set(pi.color, (colorCounts.get(pi.color) || 0) + 3.0);
    }
  });

  // D. Process Searches (Weight = 1.0)
  recentSearches.forEach((s) => {
    extractFabrics(s.query).forEach((f) => {
      fabricCounts.set(f, (fabricCounts.get(f) || 0) + 1.2);
    });

    const qLower = s.query.toLowerCase();
    if (qLower.includes("men") || qLower.includes("shirt")) {
      categoryCounts.set("men", (categoryCounts.get("men") || 0) + 1.0);
    }
    if (qLower.includes("boy") || qLower.includes("kid")) {
      categoryCounts.set("boys", (categoryCounts.get("boys") || 0) + 1.0);
    }
    if (qLower.includes("kurta") || qLower.includes("handloom")) {
      categoryCounts.set("handloom", (categoryCounts.get("handloom") || 0) + 1.0);
    }

    if (s.filtersJson) {
      try {
        const parsed = JSON.parse(s.filtersJson);
        if (parsed.color) {
          colorCounts.set(String(parsed.color), (colorCounts.get(String(parsed.color)) || 0) + 1.0);
        }
        if (parsed.size) {
          sizeCounts.set(String(parsed.size), (sizeCounts.get(String(parsed.size)) || 0) + 1.0);
        }
        if (parsed.minPrice) prices.push(Number(parsed.minPrice));
        if (parsed.maxPrice) prices.push(Number(parsed.maxPrice));
      } catch {
        // ignore JSON parse error
      }
    }
  });

  // Normalize Top Categories
  const catEntries = Array.from(categoryCounts.entries());
  const totalCatWeight = catEntries.reduce((sum, [, w]) => sum + w, 0) || 1;
  catEntries.sort((a, b) => b[1] - a[1]);
  const topCategories: CategoryAffinity[] = catEntries.map(([cat, w]) => ({
    categorySlug: cat,
    weight: Math.round((w / totalCatWeight) * 100) / 100,
    count: Math.round(w),
  }));

  // Normalize Top Fabrics
  const fabEntries = Array.from(fabricCounts.entries());
  const totalFabWeight = fabEntries.reduce((sum, [, w]) => sum + w, 0) || 1;
  fabEntries.sort((a, b) => b[1] - a[1]);
  const topFabrics: FabricAffinity[] = fabEntries.map(([f, w]) => ({
    fabric: f,
    weight: Math.round((w / totalFabWeight) * 100) / 100,
    count: Math.round(w),
  }));

  // Normalize Top Colors
  const colEntries = Array.from(colorCounts.entries());
  const totalColWeight = colEntries.reduce((sum, [, w]) => sum + w, 0) || 1;
  colEntries.sort((a, b) => b[1] - a[1]);
  const topColors: ColorAffinity[] = colEntries.map(([c, w]) => ({
    color: c,
    weight: Math.round((w / totalColWeight) * 100) / 100,
    count: Math.round(w),
  }));

  // Sizes ordered by affinity
  const sizeEntries = Array.from(sizeCounts.entries());
  sizeEntries.sort((a, b) => b[1] - a[1]);
  const preferredSizes = sizeEntries.map(([s]) => s);

  // Price calculations
  const validPrices = prices.filter((p) => typeof p === "number" && !isNaN(p) && p > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 1000;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 5000;
  const avgPrice =
    validPrices.length > 0
      ? Math.round(validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length)
      : 2400;

  return {
    userId: userId || null,
    sessionId: sessionId || null,
    topCategories,
    topFabrics,
    topColors,
    preferredSizes: preferredSizes.length > 0 ? preferredSizes : ["M", "L"],
    priceRange: {
      min: minPrice,
      max: maxPrice,
      average: avgPrice,
    },
    totalInteractions,
    viewCount: recentViews.length,
    orderCount: purchasedItems.length,
    wishlistCount: userWishlistProductIds.length,
    searchCount: recentSearches.length,
    isColdStart: false,
    computedAt: new Date(),
  };
}
