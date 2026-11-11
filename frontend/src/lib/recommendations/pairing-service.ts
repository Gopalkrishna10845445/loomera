import { db } from "@/db";
import { products, productVariants, productImages, categories } from "@/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import { AssistantProduct } from "@/lib/ai/types";
import { mapDbToAssistantProduct } from "@/lib/ai/tools";
import { getEffectiveAvailableStock } from "@/lib/inventory/reservation";

export interface ComplementaryRecommendation {
  product: AssistantProduct;
  pairingRole: string; // e.g. "Tailored Bottoms", "Artisan Layering", "Youth Ensemble"
  stylingAdvice: string;
  inStock: boolean;
}

export interface SimilarRecommendation {
  product: AssistantProduct;
  similarityScore: number; // 0 - 100
  similarityReason: string;
  sharedAttributes: string[];
}

/**
 * Retrieves similar garments (alternatives in same silhouette, category, or fabric).
 */
export async function getSimilarGarments(
  productId: string,
  limit: number = 4
): Promise<SimilarRecommendation[]> {
  try {
    const [targetProduct] = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(and(eq(products.isPublished, true), eq(products.id, productId)))
      .limit(1);

    if (!targetProduct) return [];

    const targetDesc = (targetProduct.product.description || "").toLowerCase();
    const targetPrice = targetProduct.product.basePriceInr;
    const targetCat = targetProduct.product.categorySlug;

    // Fetch other published products
    const candidates = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(
        and(
          eq(products.isPublished, true),
          eq(products.isArchived, false),
          sql`${products.id} != ${productId}`
        )
      );

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.product.id);

    const variantRows = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, candidateIds));

    const imageRows = await db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, candidateIds));

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

    const scored: SimilarRecommendation[] = [];

    for (const c of candidates) {
      let score = 0;
      const sharedAttributes: string[] = [];
      const itemDesc = (c.product.description || "").toLowerCase();

      // 1. Category similarity (40 pts)
      if (c.product.categorySlug === targetCat) {
        score += 40;
        sharedAttributes.push("Same silhouette classification");
      } else if (
        (targetCat === "men" && c.product.categorySlug === "handloom") ||
        (targetCat === "handloom" && c.product.categorySlug === "men")
      ) {
        score += 20;
        sharedAttributes.push("Complementary men's atelier collection");
      }

      // 2. Fabric match (30 pts)
      const fabrics = ["linen", "cotton", "handloom", "silk", "khadi"];
      for (const fab of fabrics) {
        if (targetDesc.includes(fab) && itemDesc.includes(fab)) {
          score += 30;
          sharedAttributes.push(`Crafted from ${fab.charAt(0).toUpperCase() + fab.slice(1)}`);
          break;
        }
      }

      // 3. Price proximity (20 pts)
      const priceDiffRatio = Math.abs(c.product.basePriceInr - targetPrice) / targetPrice;
      if (priceDiffRatio < 0.2) {
        score += 20;
        sharedAttributes.push("Matching luxury price tier");
      } else if (priceDiffRatio < 0.4) {
        score += 10;
      }

      // 4. Availability check (10 pts)
      const vars = variantsByProd.get(c.product.id) || [];
      let availablePieces = 0;
      for (const v of vars) {
        const eff = await getEffectiveAvailableStock(v.id);
        availablePieces += Math.max(0, eff);
      }
      if (availablePieces > 0) {
        score += 10;
      }

      const assistantProd = mapDbToAssistantProduct(
        c.product,
        vars,
        imagesByProd.get(c.product.id) || [],
        c.categoryName || undefined
      );

      let reason = "Alternative luxury option with similar artisan craft";
      if (sharedAttributes.length > 0) {
        reason = sharedAttributes.join(" • ");
      }

      scored.push({
        product: assistantProd,
        similarityScore: score,
        similarityReason: reason,
        sharedAttributes,
      });
    }

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, limit);
  } catch (err) {
    console.error("getSimilarGarments error:", err);
    return [];
  }
}

/**
 * Retrieves complementary styling pairings (e.g., shirts with trousers, kurtas with bottoms).
 * "Complete the Look" intelligence.
 */
export async function getComplementaryGarments(
  productId: string,
  limit: number = 3
): Promise<ComplementaryRecommendation[]> {
  try {
    const [targetProduct] = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(
        and(
          eq(products.isPublished, true),
          or(eq(products.id, productId), eq(products.slug, productId))
        )
      )
      .limit(1);

    if (!targetProduct) return [];

    const targetId = targetProduct.product.id;
    const targetSlug = targetProduct.product.slug;
    const targetCat = targetProduct.product.categorySlug;

    // Define Atelier Fashion Pairing Rules
    // e.g. Tops -> Bottoms; Bottoms -> Tops; Handloom Kurta -> Trousers; Boys top -> Boys shorts
    const complementaryTargetSlugs: { slug: string; role: string; advice: string }[] = [];

    if (
      targetId === "classic-linen-shirt" ||
      targetSlug === "classic-linen-shirt" ||
      targetId === "textured-casual-shirt" ||
      targetSlug === "textured-casual-shirt"
    ) {
      complementaryTargetSlugs.push({
        slug: "linen-trousers",
        role: "Tailored Linen Bottoms",
        advice: "Pairs seamlessly with tailored linen trousers for an effortless resort aesthetic.",
      });
      complementaryTargetSlugs.push({
        slug: "handloom-kurta",
        role: "Artisan Layering",
        advice: "Alternate with this handloom kurta for evening celebrations.",
      });
    } else if (targetId === "linen-trousers" || targetSlug === "classic-linen-trousers") {
      complementaryTargetSlugs.push({
        slug: "classic-linen-shirt",
        role: "Signature Linen Top",
        advice: "The definitive companion: pristine linen shirt in natural breathable weave.",
      });
      complementaryTargetSlugs.push({
        slug: "textured-casual-shirt",
        role: "Contemporary Texture",
        advice: "Elevates tailored trousers with subtle organic texture.",
      });
      complementaryTargetSlugs.push({
        slug: "handloom-kurta",
        role: "Festive Silhouette",
        advice: "Pair with an artisan kurta for sophisticated formal gatherings.",
      });
    } else if (
      targetId === "handloom-kurta" ||
      targetSlug === "handloom-kurta" ||
      targetId === "classic-kurta" ||
      targetSlug === "classic-kurta"
    ) {
      complementaryTargetSlugs.push({
        slug: "linen-trousers",
        role: "Structured Base",
        advice: "Creates a relaxed yet distinguished drape underneath artisan kurtas.",
      });
      complementaryTargetSlugs.push({
        slug: "classic-linen-shirt",
        role: "Casual Transition",
        advice: "A crisp everyday essential for daytime layering.",
      });
    } else if (targetId === "boys-linen-shirt" || targetSlug === "boys-linen-shirt") {
      complementaryTargetSlugs.push({
        slug: "boys-drawstring-shorts",
        role: "Youth Summer Ensemble",
        advice: "Complete the junior artisan outfit with comfortable drawstring linen shorts.",
      });
      complementaryTargetSlugs.push({
        slug: "kids-romper",
        role: "Sibling Coordination",
        advice: "Coordinate with the matching youth romper for family occasions.",
      });
    } else if (
      targetId === "boys-drawstring-shorts" ||
      targetSlug === "boys-tailored-linen-shorts"
    ) {
      complementaryTargetSlugs.push({
        slug: "boys-linen-shirt",
        role: "Artisan Linen Top",
        advice: "The matching linen shirt creates a complete handcrafted youth wardrobe.",
      });
    } else if (targetId === "kids-romper" || targetSlug === "organic-muslin-baby-romper") {
      complementaryTargetSlugs.push({
        slug: "boys-linen-shirt",
        role: "Junior Companion",
        advice: "Coordinate beautifully with our youth linen collection.",
      });
    } else {
      // Fallback rule based on category
      if (targetCat === "men" || targetCat === "handloom") {
        complementaryTargetSlugs.push({
          slug: "linen-trousers",
          role: "Tailored Bottoms",
          advice: "Essential tailored trousers designed to ground any bespoke top.",
        });
      } else {
        complementaryTargetSlugs.push({
          slug: "boys-linen-shirt",
          role: "Youth Tops",
          advice: "Artisan tailoring designed for young gentlemen.",
        });
      }
    }

    const matchedRecommendations: ComplementaryRecommendation[] = [];

    for (const rule of complementaryTargetSlugs) {
      if (matchedRecommendations.length >= limit) break;

      const [compRow] = await db
        .select({
          product: products,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categorySlug, categories.slug))
        .where(
          and(
            eq(products.isPublished, true),
            eq(products.isArchived, false),
            or(eq(products.slug, rule.slug), eq(products.id, rule.slug))
          )
        )
        .limit(1);

      if (compRow) {
        const variants = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, compRow.product.id));

        const images = await db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, compRow.product.id));

        let availableCount = 0;
        for (const v of variants) {
          const eff = await getEffectiveAvailableStock(v.id);
          availableCount += Math.max(0, eff);
        }

        const assistantProd = mapDbToAssistantProduct(
          compRow.product,
          variants,
          images,
          compRow.categoryName || undefined
        );

        matchedRecommendations.push({
          product: assistantProd,
          pairingRole: rule.role,
          stylingAdvice: rule.advice,
          inStock: availableCount > 0,
        });
      }
    }

    return matchedRecommendations;
  } catch (err) {
    console.error("getComplementaryGarments error:", err);
    return [];
  }
}
