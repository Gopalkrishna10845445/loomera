import { db } from "@/db";
import { products, productVariants, productImages, categories, orders } from "@/db/schema";
import { getUserOrderById } from "@/lib/orders/order-service";
import { eq, and, gte, lte, ilike, or, asc, desc, sql, inArray } from "drizzle-orm";
import { calculatePriceBreakdown } from "@/lib/pricing";
import { AssistantProduct, SearchProductsParams } from "./types";
import {
  checkProductAvailability,
  getRestockInformation,
  ProductAvailabilityResult,
  RestockInfoResult,
} from "@/lib/inventory";
import {
  getProductViewHistory,
  getCustomerSearchHistory,
  ViewedProductItem,
  SearchHistoryItem,
} from "@/lib/history";
import {
  getPersonalizedRecommendations,
  ScoredRecommendation,
  RecommendationOptions,
} from "@/lib/recommendations/recommendation-service";
import {
  getComplementaryGarments,
  ComplementaryRecommendation,
} from "@/lib/recommendations/pairing-service";
import {
  compareGarments,
  GarmentComparisonResult,
} from "@/lib/ai/comparison-service";
import {
  getCustomerPreferenceProfile,
  CustomerPreferenceProfile,
} from "@/lib/recommendations/preference-service";
import {
  executeSemanticDiscovery,
  SemanticSearchParams,
  SemanticSearchResult,
} from "@/lib/ai/semantic-search";

/**
 * Maps raw database product, variants, and images to an authoritative AssistantProduct.
 */
export function mapDbToAssistantProduct(
  p: typeof products.$inferSelect,
  variants: (typeof productVariants.$inferSelect)[],
  images: (typeof productImages.$inferSelect)[],
  categoryName?: string
): AssistantProduct {
  const sizeSet = new Set<string>();
  variants.forEach((v) => {
    if (v.size) sizeSet.add(v.size);
  });
  const sizes = Array.from(sizeSet);

  const colorSet = new Set<string>();
  variants.forEach((v) => {
    if (v.colorName) colorSet.add(v.colorName);
  });
  const colors = Array.from(colorSet);

  const primaryImage =
    images.find((img) => img.isPrimary)?.imageUrl ||
    images[0]?.imageUrl ||
    "/assets/reference/prod_linen_shirt.jpg";

  let displayCategory = categoryName || p.categorySlug;
  if (!categoryName) {
    if (p.categorySlug === "men") displayCategory = "Men's Wardrobe";
    else if (p.categorySlug === "boys") displayCategory = "Boys' Tailoring";
    else if (p.categorySlug === "kids") displayCategory = "Kids Essentials";
    else if (p.categorySlug === "handloom") displayCategory = "Handloom Heritage";
  }

  const pricing = calculatePriceBreakdown(p.basePriceInr, p.originalPriceInr);
  const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: pricing.salePrice,
    originalPrice: pricing.isOnSale ? pricing.originalPrice : null,
    discountPercent: pricing.isOnSale ? pricing.discountPercent : undefined,
    isOnSale: pricing.isOnSale,
    category: displayCategory,
    image: primaryImage,
    badge: p.badge || null,
    description: p.description,
    sizes,
    colors,
    inStock: variants.length > 0 ? totalStock > 0 : true,
    origin: p.origin || "Artisan Guilds",
    fabricCare: p.fabricCare || null,
  };
}

/**
 * 1. search_products tool
 */
export async function searchProducts(
  params: SearchProductsParams = {}
): Promise<AssistantProduct[]> {
  try {
    const conditions = [eq(products.isPublished, true)];

    // Category filter
    if (params.category && params.category !== "all") {
      const catLower = params.category.toLowerCase().trim();
      if (catLower === "men" || catLower === "mens" || catLower === "men's") {
        conditions.push(or(eq(products.categorySlug, "men"), eq(products.categorySlug, "handloom"))!);
      } else if (catLower === "boys" || catLower === "boy" || catLower === "boys'") {
        conditions.push(or(eq(products.categorySlug, "boys"), eq(products.categorySlug, "kids"))!);
      } else if (catLower === "kids" || catLower === "kid") {
        conditions.push(eq(products.categorySlug, "kids"));
      } else if (catLower === "handloom" || catLower === "heritage" || catLower === "kurta") {
        conditions.push(eq(products.categorySlug, "handloom"));
      } else {
        conditions.push(eq(products.categorySlug, catLower));
      }
    }

    // Text search query
    if (params.query && params.query.trim()) {
      const raw = params.query.trim();
      const q = `%${raw}%`;
      const fullPhraseCondition = or(
        ilike(products.title, q),
        ilike(products.description, q),
        ilike(products.badge, q),
        ilike(products.fabricCare, q),
        ilike(products.craftDetail, q)
      )!;

      const words = raw.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 1) {
        const wordConditions = words.map((word) => {
          const stem = word.length > 3 && word.toLowerCase().endsWith("s") ? word.slice(0, -1) : word;
          const w = `%${stem}%`;
          return or(
            ilike(products.title, w),
            ilike(products.description, w),
            ilike(products.badge, w),
            ilike(products.fabricCare, w),
            ilike(products.craftDetail, w)
          )!;
        });
        conditions.push(or(fullPhraseCondition, and(...wordConditions)!)!);
      } else {
        const stem = raw.length > 3 && raw.toLowerCase().endsWith("s") ? raw.slice(0, -1) : raw;
        const s = `%${stem}%`;
        conditions.push(or(fullPhraseCondition, ilike(products.title, s), ilike(products.description, s))!);
      }
    }

    // Fabric filter
    if (params.fabric && params.fabric.trim()) {
      const f = `%${params.fabric.trim()}%`;
      conditions.push(
        or(
          ilike(products.title, f),
          ilike(products.description, f),
          ilike(products.fabricCare, f)
        )!
      );
    }

    // Price range filters
    if (typeof params.minPrice === "number" && !isNaN(params.minPrice)) {
      conditions.push(gte(products.basePriceInr, params.minPrice));
    }
    if (typeof params.maxPrice === "number" && !isNaN(params.maxPrice)) {
      conditions.push(lte(products.basePriceInr, params.maxPrice));
    }

    // Sorting
    let orderByClause;
    switch (params.sort) {
      case "price-asc":
        orderByClause = [asc(products.basePriceInr)];
        break;
      case "price-desc":
        orderByClause = [desc(products.basePriceInr)];
        break;
      case "newest":
        orderByClause = [
          sql`CASE WHEN ${products.badge} ILIKE '%new%' THEN 0 ELSE 1 END`,
          desc(products.createdAt),
        ];
        break;
      case "featured":
      default:
        orderByClause = [asc(products.displayOrder), desc(products.createdAt)];
        break;
    }

    const limit = Math.min(params.limit || 10, 20);

    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .limit(limit);

    if (productRows.length === 0) return [];

    const productIds = productRows.map((r) => r.product.id);

    // Fetch variants & images
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const imageRows = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

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

    let mapped = productRows.map((row) =>
      mapDbToAssistantProduct(
        row.product,
        variantsByProd.get(row.product.id) || [],
        imagesByProd.get(row.product.id) || [],
        row.categoryName || undefined
      )
    );

    // Filter by color if specified
    if (params.color && params.color.trim()) {
      const colorQuery = params.color.toLowerCase().trim();
      mapped = mapped.filter((p) =>
        p.colors.some((c) => c.toLowerCase().includes(colorQuery))
      );
    }

    // Filter by size if specified
    if (params.size && params.size.trim()) {
      const sizeQuery = params.size.toLowerCase().trim();
      mapped = mapped.filter((p) =>
        p.sizes.some((s) => s.toLowerCase() === sizeQuery)
      );
    }

    return mapped;
  } catch (err) {
    console.error("searchProducts error:", err);
    return [];
  }
}

/**
 * 2. get_product_details tool
 */
export async function getProductDetails(
  identifier: string
): Promise<AssistantProduct | null> {
  try {
    if (!identifier || !identifier.trim()) return null;
    const cleanId = identifier.trim();

    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(
        and(
          eq(products.isPublished, true),
          or(eq(products.slug, cleanId), eq(products.id, cleanId))
        )
      )
      .limit(1);

    if (productRows.length === 0) return null;

    const row = productRows[0];
    const pId = row.product.id;

    const variantRows = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, pId));

    const imageRows = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, pId));

    return mapDbToAssistantProduct(
      row.product,
      variantRows,
      imageRows,
      row.categoryName || undefined
    );
  } catch (err) {
    console.error("getProductDetails error:", err);
    return null;
  }
}

/**
 * 3. get_collection_products tool
 */
export async function getCollectionProducts(
  collection: string,
  limit: number = 8
): Promise<AssistantProduct[]> {
  try {
    const colLower = (collection || "").toLowerCase().trim();
    if (colLower === "new-arrivals" || colLower === "new") {
      return searchProducts({ sort: "newest", limit });
    }
    return searchProducts({ category: colLower, limit });
  } catch (err) {
    console.error("getCollectionProducts error:", err);
    return [];
  }
}

/**
 * 4. get_similar_products tool
 */
export async function getSimilarProducts(
  productId: string,
  limit: number = 4
): Promise<AssistantProduct[]> {
  try {
    const target = await getProductDetails(productId);
    if (!target) return [];

    // Find other products in same category or matching keywords, excluding this product
    const allCandidates = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(
        and(
          eq(products.isPublished, true),
          sql`${products.id} != ${target.id}`
        )
      )
      .limit(20);

    if (allCandidates.length === 0) return [];

    const productIds = allCandidates.map((r) => r.product.id);
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    const imageRows = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds));

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

    const mapped = allCandidates.map((row) =>
      mapDbToAssistantProduct(
        row.product,
        variantsByProd.get(row.product.id) || [],
        imagesByProd.get(row.product.id) || [],
        row.categoryName || undefined
      )
    );

    // Score candidates based on:
    // 1. Same category (+50 points)
    // 2. Similar price within +/- 30% (+30 points)
    // 3. Shared fabric keywords in description (+20 points)
    const targetDescLower = (target.description || "").toLowerCase();
    const scored = mapped.map((item) => {
      let score = 0;
      if (item.category === target.category) score += 50;
      
      const priceDiffRatio = Math.abs(item.price - target.price) / target.price;
      if (priceDiffRatio < 0.3) score += 30;
      else if (priceDiffRatio < 0.5) score += 15;

      const itemDescLower = (item.description || "").toLowerCase();
      if (targetDescLower.includes("linen") && itemDescLower.includes("linen")) score += 20;
      if (targetDescLower.includes("cotton") && itemDescLower.includes("cotton")) score += 20;
      if (targetDescLower.includes("handloom") && itemDescLower.includes("handloom")) score += 20;

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  } catch (err) {
    console.error("getSimilarProducts error:", err);
    return [];
  }
}

/**
 * 5. get_product_filters tool
 */
export async function getProductFilters(): Promise<{
  categories: { slug: string; name: string; count: number }[];
  sizes: string[];
  colors: string[];
  priceRange: { min: number; max: number };
}> {
  try {
    const allPublished = await db
      .select({
        id: products.id,
        categorySlug: products.categorySlug,
        basePriceInr: products.basePriceInr,
      })
      .from(products)
      .where(eq(products.isPublished, true));

    const allCats = await db.select().from(categories);

    // Compute category counts
    const catCountMap = new Map<string, number>();
    allPublished.forEach((p) => {
      catCountMap.set(p.categorySlug, (catCountMap.get(p.categorySlug) || 0) + 1);
    });

    const categoryList = allCats.map((c) => ({
      slug: c.slug,
      name: c.name,
      count: catCountMap.get(c.slug) || 0,
    }));

    // Fetch all variants
    const allVariants = await db
      .select({
        size: productVariants.size,
        colorName: productVariants.colorName,
      })
      .from(productVariants);

    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    allVariants.forEach((v) => {
      if (v.size) sizeSet.add(v.size);
      if (v.colorName) colorSet.add(v.colorName);
    });

    // Price bounds
    const prices = allPublished.map((p) => p.basePriceInr);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 5000;

    return {
      categories: categoryList,
      sizes: Array.from(sizeSet),
      colors: Array.from(colorSet),
      priceRange: { min: minPrice, max: maxPrice },
    };
  } catch (err) {
    console.error("getProductFilters error:", err);
    return {
      categories: [],
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 5000 },
    };
  }
}

/**
 * 6. check_product_availability tool
 */
export async function checkProductAvailabilityTool(params: {
  productId: string;
  size?: string;
  color?: string;
}): Promise<ProductAvailabilityResult> {
  return checkProductAvailability(params.productId, params.size, params.color);
}

/**
 * 7. get_available_sizes tool
 */
export async function getAvailableSizesTool(
  productId: string
): Promise<{ productId: string; availableSizes: string[] }> {
  const check = await checkProductAvailability(productId);
  return {
    productId: check.productId,
    availableSizes: check.availableSizes,
  };
}

/**
 * 8. get_available_colors tool
 */
export async function getAvailableColorsTool(
  productId: string
): Promise<{ productId: string; availableColors: string[] }> {
  const check = await checkProductAvailability(productId);
  return {
    productId: check.productId,
    availableColors: check.availableColors,
  };
}

/**
 * 9. get_recently_viewed tool
 */
export async function getRecentlyViewedTool(params: {
  userId?: string | null;
  sessionId?: string | null;
  dateFilter?: "today" | "yesterday" | "last_7_days" | "all";
  limit?: number;
}): Promise<ViewedProductItem[]> {
  return getProductViewHistory(params);
}

/**
 * 10. get_search_history tool
 */
export async function getSearchHistoryTool(params: {
  userId?: string | null;
  sessionId?: string | null;
  dateFilter?: "today" | "yesterday" | "last_7_days" | "all";
  queryFilter?: string;
  limit?: number;
}): Promise<SearchHistoryItem[]> {
  return getCustomerSearchHistory(params);
}

/**
 * 11. get_restock_information tool
 */
export async function getRestockInformationTool(params: {
  productId: string;
  size?: string;
  color?: string;
}): Promise<RestockInfoResult> {
  return getRestockInformation(params.productId, params.size, params.color);
}

/**
 * 12. get_personalized_recommendations tool
 */
export async function getPersonalizedRecommendationsTool(
  options: RecommendationOptions = {}
): Promise<ScoredRecommendation[]> {
  return getPersonalizedRecommendations(options);
}

/**
 * 13. get_complementary_products tool
 */
export async function getComplementaryProductsTool(params: {
  productId: string;
  limit?: number;
}): Promise<ComplementaryRecommendation[]> {
  return getComplementaryGarments(params.productId, params.limit);
}

/**
 * 14. compare_products tool
 */
export async function compareProductsTool(params: {
  productIds: string[];
}): Promise<GarmentComparisonResult | null> {
  return compareGarments(params.productIds);
}

/**
 * 15. get_customer_preferences tool
 */
export async function getCustomerPreferencesTool(params: {
  userId?: string | null;
  sessionId?: string | null;
}): Promise<CustomerPreferenceProfile> {
  return getCustomerPreferenceProfile(params);
}

/**
 * 16. semantic_discovery tool
 */
export async function semanticDiscoveryTool(
  params: SemanticSearchParams
): Promise<SemanticSearchResult> {
  return executeSemanticDiscovery(params);
}

/**
 * 17. get_order_status tool
 * Strictly scoped to authenticated customer; retrieves verified order & tracking status.
 * Safeguard: Never approves refunds or modifies orders directly.
 */
export async function getVerifiedOrderStatusTool(params: {
  userId: string;
  orderNumber?: string;
  orderId?: string;
}): Promise<{
  found: boolean;
  order?: {
    orderNumber: string;
    status: string;
    totalInr: number;
    createdAt: Date;
    itemCount: number;
    items: Array<{ title: string; size: string; color: string; quantity: number }>;
    shippingAddress: { city: string; state: string; postalCode: string };
    shipment?: {
      carrier: string;
      trackingNumber: string;
      status: string;
      estimatedDeliveryAt: Date | null;
      latestEvent?: string;
    } | null;
  };
  policyNotice: string;
}> {
  const { userId, orderNumber, orderId } = params;

  const policyNotice =
    "Verified data provided from LOOMERA atelier database. The digital concierge is an informational advisor and cannot approve refunds, promise expedited delivery dates, or modify orders without authorized server-side workflows.";

  if (!userId) {
    return {
      found: false,
      policyNotice,
    };
  }

  // Find target order
  let orderRow;
  if (orderId) {
    [orderRow] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);
  } else if (orderNumber) {
    [orderRow] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber.trim()), eq(orders.userId, userId)))
      .limit(1);
  } else {
    // Return latest order
    [orderRow] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
  }

  if (!orderRow) {
    return {
      found: false,
      policyNotice,
    };
  }

  const fullOrder = await getUserOrderById(userId, orderRow.id);
  if (!fullOrder) {
    return {
      found: false,
      policyNotice,
    };
  }

  return {
    found: true,
    order: {
      orderNumber: fullOrder.orderNumber,
      status: fullOrder.status,
      totalInr: fullOrder.totalInr,
      createdAt: fullOrder.createdAt,
      itemCount: fullOrder.items.length,
      items: fullOrder.items.map((i) => ({
        title: i.productTitle,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      })),
      shippingAddress: {
        city: fullOrder.shippingAddress.city,
        state: fullOrder.shippingAddress.state,
        postalCode: fullOrder.shippingAddress.postalCode,
      },
      shipment: fullOrder.shipment
        ? {
            carrier: fullOrder.shipment.carrier,
            trackingNumber: fullOrder.shipment.trackingNumber,
            status: fullOrder.shipment.status,
            estimatedDeliveryAt: fullOrder.shipment.estimatedDeliveryAt,
            latestEvent: fullOrder.shipment.events[0]?.statusDescription,
          }
        : null,
    },
    policyNotice,
  };
}


