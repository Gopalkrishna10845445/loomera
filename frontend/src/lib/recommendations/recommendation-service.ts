import { db } from "@/db";
import {
  products,
  productVariants,
  productImages,
  categories,
  orderItems,
  productViewHistory,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { AssistantProduct } from "@/lib/ai/types";
import { mapDbToAssistantProduct } from "@/lib/ai/tools";
import {
  getCustomerPreferenceProfile,
  CustomerPreferenceProfile,
} from "./preference-service";
import { getEffectiveAvailableStock } from "@/lib/inventory/reservation";

export interface ScoredRecommendation {
  product: AssistantProduct;
  score: number; // 0 - 100
  explanation: string;
  reasons: string[];
  matchFactors: {
    categoryMatch: number;
    fabricMatch: number;
    colorMatch: number;
    priceMatch: number;
    popularityScore: number;
    availabilityScore: number;
  };
}

export interface RecommendationOptions {
  userId?: string | null;
  sessionId?: string | null;
  limit?: number;
  excludeProductIds?: string[];
  categoryFilter?: string;
  maxPrice?: number;
  inStockOnly?: boolean;
}

/**
 * Multi-factor recommendation scoring engine for LOOMERA luxury apparel.
 *
 * Scoring Model:
 * S(p) = w_cat * C(p) + w_fab * F(p) + w_col * K(p) + w_price * P(p) + w_pop * Pop(p) + w_avail * A(p)
 */
export async function getPersonalizedRecommendations(
  options: RecommendationOptions = {}
): Promise<ScoredRecommendation[]> {
  const {
    userId,
    sessionId,
    limit = 6,
    excludeProductIds = [],
    categoryFilter,
    maxPrice,
    inStockOnly = true,
  } = options;

  // 1. Fetch or compute customer preference profile
  const profile: CustomerPreferenceProfile = await getCustomerPreferenceProfile({
    userId,
    sessionId,
  });

  // 2. Fetch all published & non-archived candidate products
  const conditions = [
    eq(products.isPublished, true),
    eq(products.isArchived, false),
  ];

  if (categoryFilter && categoryFilter !== "all") {
    conditions.push(eq(products.categorySlug, categoryFilter));
  }

  const candidateRows = await db
    .select({
      product: products,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categorySlug, categories.slug))
    .where(and(...conditions));

  if (candidateRows.length === 0) return [];

  const candidateIds = candidateRows.map((r) => r.product.id);

  // 3. Fetch variants and images in bulk
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, candidateIds));

  const imageRows = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, candidateIds));

  // 4. Fetch popularity metric (order item count + view count per product)
  const orderCounts = await db
    .select({
      productId: orderItems.productId,
      count: sql<number>`count(*)::int`,
    })
    .from(orderItems)
    .where(inArray(orderItems.productId, candidateIds))
    .groupBy(orderItems.productId);

  const viewCounts = await db
    .select({
      productId: productViewHistory.productId,
      count: sql<number>`count(*)::int`,
    })
    .from(productViewHistory)
    .where(inArray(productViewHistory.productId, candidateIds))
    .groupBy(productViewHistory.productId);

  const popularityMap = new Map<string, number>();
  orderCounts.forEach((oc) => {
    popularityMap.set(oc.productId, (popularityMap.get(oc.productId) || 0) + oc.count * 3);
  });
  viewCounts.forEach((vc) => {
    popularityMap.set(vc.productId, (popularityMap.get(vc.productId) || 0) + vc.count);
  });

  // Organize variants and images by product ID
  const variantsByProd = new Map<string, typeof variantRows>();
  variantRows.forEach((v) => {
    const arr = variantsByProd.get(v.productId) || [];
    arr.push(v);
    variantsByProd.set(v.productId, arr);
  });

  const imagesByProd = new Map<string, typeof imageRows>();
  imageRows.forEach((img) => {
    const arr = imagesByProd.get(img.productId) || [];
    arr.push(img);
    imagesByProd.set(img.productId, arr);
  });

  // Convert to AssistantProduct representations
  const candidateProducts = candidateRows.map((row) =>
    mapDbToAssistantProduct(
      row.product,
      variantsByProd.get(row.product.id) || [],
      imagesByProd.get(row.product.id) || [],
      row.categoryName || undefined
    )
  );

  // Filter out explicit exclusions (e.g. current product or already purchased items)
  const filteredCandidates = candidateProducts.filter(
    (p) => !excludeProductIds.includes(p.id)
  );

  // 5. Score every candidate
  const scoredList: ScoredRecommendation[] = [];

  for (const item of filteredCandidates) {
    const reasons: string[] = [];
    const itemVariants = variantsByProd.get(item.id) || [];

    // Authoritative effective stock calculation
    let totalAvailableStock = 0;
    for (const v of itemVariants) {
      const avail = await getEffectiveAvailableStock(v.id);
      totalAvailableStock += Math.max(0, avail);
    }

    if (inStockOnly && totalAvailableStock <= 0) {
      continue; // Skip out-of-stock garments if requested
    }

    // A. Category Match (Weight: 25)
    let categoryScore = 0;
    const catAffinity = profile.topCategories.find(
      (c) => c.categorySlug === item.category.toLowerCase() || item.category.toLowerCase().includes(c.categorySlug)
    );
    if (catAffinity) {
      categoryScore = Math.min(25, Math.round(catAffinity.weight * 25));
      if (catAffinity.count > 0) {
        reasons.push(`Popular in your preferred category (${item.category})`);
      }
    } else if (profile.isColdStart) {
      categoryScore = 15;
    }

    // B. Fabric Match (Weight: 25)
    let fabricScore = 0;
    const descLower = (item.description || "").toLowerCase();
    for (const fab of profile.topFabrics) {
      if (descLower.includes(fab.fabric) || (item.fabricCare || "").toLowerCase().includes(fab.fabric)) {
        fabricScore = Math.max(fabricScore, Math.min(25, Math.round(fab.weight * 25)));
        if (fab.count > 0) {
          reasons.push(`Matches your preferred fabric (${fab.fabric.charAt(0).toUpperCase() + fab.fabric.slice(1)})`);
        }
        break;
      }
    }
    if (profile.isColdStart && descLower.includes("linen")) {
      fabricScore = 20;
      reasons.push("Crafted from signature LOOMERA Pure Linen");
    }

    // C. Color Match (Weight: 15)
    let colorScore = 0;
    for (const col of profile.topColors) {
      if (item.colors.some((c) => c.toLowerCase() === col.color.toLowerCase())) {
        colorScore = Math.min(15, Math.round(col.weight * 15));
        if (col.count > 0) {
          reasons.push(`Available in your favored shade (${col.color})`);
        }
        break;
      }
    }

    // D. Price Compatibility (Weight: 15)
    let priceScore = 0;
    const avgBudget = profile.priceRange.average;
    const priceRatio = Math.abs(item.price - avgBudget) / avgBudget;
    if (priceRatio <= 0.25) {
      priceScore = 15;
      reasons.push(`Within your typical wardrobe budget (₹${item.price.toLocaleString("en-IN")})`);
    } else if (priceRatio <= 0.5) {
      priceScore = 10;
    } else {
      priceScore = 5;
    }

    if (maxPrice && item.price <= maxPrice) {
      priceScore += 5;
    }

    // E. Popularity & Sales Velocity (Weight: 10)
    const popRaw = popularityMap.get(item.id) || 0;
    const popularityScore = Math.min(10, Math.round(popRaw * 2));
    if (popRaw >= 5 && reasons.length < 2) {
      reasons.push("Trending atelier favorite");
    }

    // F. Stock Availability Bonus (Weight: 10)
    let availabilityScore = 0;
    if (totalAvailableStock > 5) {
      availabilityScore = 10;
    } else if (totalAvailableStock > 0) {
      availabilityScore = 6;
      reasons.push("Limited handcrafted pieces remaining");
    }

    const totalScore =
      categoryScore +
      fabricScore +
      colorScore +
      priceScore +
      popularityScore +
      availabilityScore;

    // Primary explanation synthesis
    let explanation = "";
    if (reasons.length > 0) {
      explanation = reasons[0];
    } else if (profile.isColdStart) {
      explanation = `Handcrafted luxury highlight in ${item.category}`;
    } else {
      explanation = `Selected based on your atelier browsing history`;
    }

    scoredList.push({
      product: item,
      score: totalScore,
      explanation,
      reasons,
      matchFactors: {
        categoryMatch: categoryScore,
        fabricMatch: fabricScore,
        colorMatch: colorScore,
        priceMatch: priceScore,
        popularityScore,
        availabilityScore,
      },
    });
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  return scoredList.slice(0, limit);
}
