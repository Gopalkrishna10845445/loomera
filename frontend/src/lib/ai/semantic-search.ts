import { db } from "@/db";
import { products, productVariants, productImages, categories } from "@/db/schema";
import { eq, and, gte, lte, ilike, or, inArray } from "drizzle-orm";
import { AssistantProduct } from "./types";
import { mapDbToAssistantProduct } from "./tools";
import { getEffectiveAvailableStock } from "@/lib/inventory/reservation";

export interface SemanticSearchParams {
  query?: string;
  category?: string;
  fabric?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  occasion?: string;
  inStockOnly?: boolean;
  sort?: "relevance" | "price-asc" | "price-desc" | "newest";
  limit?: number;
}

export interface SemanticSearchResult {
  products: AssistantProduct[];
  totalFound: number;
  appliedFilters: {
    category?: string;
    fabric?: string;
    color?: string;
    size?: string;
    minPrice?: number;
    maxPrice?: number;
    occasion?: string;
  };
  searchExplanation: string;
}

/**
 * Normalizes text for semantic token matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Intelligent Semantic Fashion Discovery Engine.
 * Combines exact database filters with fuzzy attribute scoring, strict price clamping, and live availability.
 */
export async function executeSemanticDiscovery(
  params: SemanticSearchParams
): Promise<SemanticSearchResult> {
  const {
    query = "",
    category,
    fabric,
    color,
    size,
    minPrice,
    maxPrice,
    occasion,
    inStockOnly = false,
    sort = "relevance",
    limit = 10,
  } = params;

  const appliedFilters: SemanticSearchResult["appliedFilters"] = {};

  // Base conditions: must be published and non-archived
  const conditions = [
    eq(products.isPublished, true),
    eq(products.isArchived, false),
  ];

  // 1. Category Enforcement
  if (category && category !== "all") {
    const catLower = category.toLowerCase().trim();
    appliedFilters.category = catLower;

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

  // 2. Strict Price Constraints (Server-Authoritative clamping)
  if (typeof minPrice === "number" && !isNaN(minPrice)) {
    conditions.push(gte(products.basePriceInr, minPrice));
    appliedFilters.minPrice = minPrice;
  }
  if (typeof maxPrice === "number" && !isNaN(maxPrice)) {
    conditions.push(lte(products.basePriceInr, maxPrice));
    appliedFilters.maxPrice = maxPrice;
  }

  // 3. Fabric Constraint
  if (fabric && fabric.trim()) {
    const f = `%${fabric.trim()}%`;
    appliedFilters.fabric = fabric.trim();
    conditions.push(
      or(
        ilike(products.title, f),
        ilike(products.description, f),
        ilike(products.fabricCare, f),
        ilike(products.craftDetail, f)
      )!
    );
  }

  // 4. Occasion keywords
  if (occasion && occasion.trim()) {
    appliedFilters.occasion = occasion.trim();
    const occLower = occasion.toLowerCase().trim();
    if (occLower.includes("festive") || occLower.includes("wedding") || occLower.includes("celebration")) {
      conditions.push(
        or(
          ilike(products.title, "%kurta%"),
          ilike(products.description, "%artisan%"),
          ilike(products.description, "%handloom%"),
          ilike(products.badge, "%handloom%")
        )!
      );
    } else if (occLower.includes("summer") || occLower.includes("resort") || occLower.includes("casual")) {
      conditions.push(
        or(
          ilike(products.title, "%linen%"),
          ilike(products.title, "%casual%"),
          ilike(products.description, "%breathable%")
        )!
      );
    }
  }

  // Fetch candidate rows
  const productRows = await db
    .select({
      product: products,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categorySlug, categories.slug))
    .where(and(...conditions));

  if (productRows.length === 0) {
    let emptyExplanation = "No luxury garments match the exact criteria specified.";
    if (maxPrice) {
      emptyExplanation = `No artisan pieces were found under ₹${maxPrice.toLocaleString("en-IN")}${appliedFilters.category ? ` in ${appliedFilters.category}` : ""}.`;
    }
    return {
      products: [],
      totalFound: 0,
      appliedFilters,
      searchExplanation: emptyExplanation,
    };
  }

  const productIds = productRows.map((r) => r.product.id);

  // Fetch variants and images
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

  // Calculate effective available stock and variant attributes
  const stockMap = new Map<string, number>();
  const productSizesMap = new Map<string, Set<string>>();
  const productColorsMap = new Map<string, Set<string>>();

  for (const row of productRows) {
    const vList = variantsByProd.get(row.product.id) || [];
    let effectiveTotal = 0;
    const sizes = new Set<string>();
    const colors = new Set<string>();

    for (const v of vList) {
      const eff = await getEffectiveAvailableStock(v.id);
      if (eff > 0) {
        sizes.add(v.size.toLowerCase());
        colors.add(v.colorName.toLowerCase());
      }
      effectiveTotal += Math.max(0, eff);
    }

    stockMap.set(row.product.id, effectiveTotal);
    productSizesMap.set(row.product.id, sizes);
    productColorsMap.set(row.product.id, colors);
  }

  // Map to AssistantProducts
  let candidateProducts = productRows.map((row) =>
    mapDbToAssistantProduct(
      row.product,
      variantsByProd.get(row.product.id) || [],
      imagesByProd.get(row.product.id) || [],
      row.categoryName || undefined
    )
  );

  // Filter by size if requested
  if (size && size.trim()) {
    const sLower = size.toLowerCase().trim();
    appliedFilters.size = size.trim();
    candidateProducts = candidateProducts.filter((p) => {
      const availSizes = productSizesMap.get(p.id);
      return availSizes ? availSizes.has(sLower) : p.sizes.some((s) => s.toLowerCase() === sLower);
    });
  }

  // Filter by color if requested
  if (color && color.trim()) {
    const cLower = color.toLowerCase().trim();
    appliedFilters.color = color.trim();
    candidateProducts = candidateProducts.filter((p) => {
      const availColors = productColorsMap.get(p.id);
      return availColors ? Array.from(availColors).some((c) => c.includes(cLower)) : p.colors.some((c) => c.toLowerCase().includes(cLower));
    });
  }

  // Filter by stock if requested
  if (inStockOnly) {
    candidateProducts = candidateProducts.filter((p) => (stockMap.get(p.id) || 0) > 0);
  }

  // Semantic Relevance Scoring
  const queryTokens = tokenize(query);

  const scoredProducts = candidateProducts.map((p) => {
    let score = 0;
    const fullText = `${p.title} ${p.description} ${p.category} ${p.origin || ""} ${p.fabricCare || ""} ${p.badge || ""}`.toLowerCase();

    // Exact title phrase match
    if (query && p.title.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }

    // Token frequency and semantic proximity
    queryTokens.forEach((token) => {
      if (p.title.toLowerCase().includes(token)) score += 20;
      else if (fullText.includes(token)) score += 10;
    });

    // In-stock availability bonus
    const stock = stockMap.get(p.id) || 0;
    if (stock > 0) score += 15;

    return { product: p, score };
  });

  // Apply sorting
  if (sort === "price-asc") {
    scoredProducts.sort((a, b) => a.product.price - b.product.price);
  } else if (sort === "price-desc") {
    scoredProducts.sort((a, b) => b.product.price - a.product.price);
  } else if (sort === "newest") {
    scoredProducts.sort((a, b) => {
      const aNew = (a.product.badge || "").toLowerCase().includes("new") ? 1 : 0;
      const bNew = (b.product.badge || "").toLowerCase().includes("new") ? 1 : 0;
      return bNew - aNew;
    });
  } else {
    // Default: relevance
    scoredProducts.sort((a, b) => b.score - a.score);
  }

  const finalProducts = scoredProducts.slice(0, limit).map((s) => s.product);

  let explanation = `Discovered ${finalProducts.length} handcrafted garments matching your criteria.`;
  if (finalProducts.length === 0) {
    explanation = "No garments currently match all combined filters.";
  }

  return {
    products: finalProducts,
    totalFound: finalProducts.length,
    appliedFilters,
    searchExplanation: explanation,
  };
}
