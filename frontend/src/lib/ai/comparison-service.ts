import { db } from "@/db";
import { products, productVariants, productImages, categories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { AssistantProduct } from "./types";
import { mapDbToAssistantProduct } from "./tools";
import { formatPrice } from "@/lib/currency";
import { getEffectiveAvailableStock } from "@/lib/inventory/reservation";

export interface ComparisonAttribute {
  label: string;
  key: string;
  values: {
    productId: string;
    productTitle: string;
    displayValue: string;
    rawValue?: unknown;
  }[];
}

export interface GarmentComparisonResult {
  products: AssistantProduct[];
  attributes: ComparisonAttribute[];
  summary: string;
  differences: string[];
  recommendationNote: string;
}

/**
 * Generates an authoritative, side-by-side comparison for two or more luxury garments.
 * Extracts: Title, Category, Price, Fabric & Care, Weight (GSM), Origin, Craft Details, Available Sizes/Colors, Stock.
 */
export async function compareGarments(
  productIdentifiers: string[]
): Promise<GarmentComparisonResult | null> {
  if (!productIdentifiers || productIdentifiers.length < 2) {
    return null;
  }

  // Sanitize IDs
  const cleanIds = Array.from(new Set(productIdentifiers.map((id) => id.trim()))).slice(0, 4);

  // Fetch product master rows
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
        inArray(products.id, cleanIds)
      )
    );

  // Also check slugs if not found by id
  if (productRows.length < cleanIds.length) {
    const missing = cleanIds.filter((id) => !productRows.some((r) => r.product.id === id));
    if (missing.length > 0) {
      const slugRows = await db
        .select({
          product: products,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categorySlug, categories.slug))
        .where(
          and(
            eq(products.isPublished, true),
            inArray(products.slug, missing)
          )
        );
      slugRows.forEach((sr) => {
        if (!productRows.some((pr) => pr.product.id === sr.product.id)) {
          productRows.push(sr);
        }
      });
    }
  }

  if (productRows.length < 2) {
    return null;
  }

  const foundIds = productRows.map((r) => r.product.id);

  // Fetch variants and images
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, foundIds));

  const imageRows = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, foundIds));

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

  const assistantProducts: AssistantProduct[] = [];
  const stockMap = new Map<string, number>();

  for (const row of productRows) {
    const vList = variantsByProd.get(row.product.id) || [];
    let totalStock = 0;
    for (const v of vList) {
      const eff = await getEffectiveAvailableStock(v.id);
      totalStock += Math.max(0, eff);
    }
    stockMap.set(row.product.id, totalStock);

    assistantProducts.push(
      mapDbToAssistantProduct(
        row.product,
        vList,
        imagesByProd.get(row.product.id) || [],
        row.categoryName || undefined
      )
    );
  }

  // Construct structured comparison attributes
  const attributes: ComparisonAttribute[] = [
    {
      label: "Base Price",
      key: "price",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: formatPrice(r.product.basePriceInr),
        rawValue: r.product.basePriceInr,
      })),
    },
    {
      label: "Collection / Category",
      key: "category",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: r.categoryName || r.product.categorySlug,
      })),
    },
    {
      label: "Fabric Weight",
      key: "weightGsm",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: r.product.weightGsm ? `${r.product.weightGsm} GSM` : "Not specified",
      })),
    },
    {
      label: "Artisan Origin",
      key: "origin",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: r.product.origin || "Artisan Guilds",
      })),
    },
    {
      label: "Fabric Care",
      key: "fabricCare",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: r.product.fabricCare || "Dry clean or delicate handwash recommended",
      })),
    },
    {
      label: "Craft Detail",
      key: "craftDetail",
      values: productRows.map((r) => ({
        productId: r.product.id,
        productTitle: r.product.title,
        displayValue: r.product.craftDetail || "Handcrafted signature weave",
      })),
    },
    {
      label: "Available Sizes",
      key: "sizes",
      values: assistantProducts.map((p) => ({
        productId: p.id,
        productTitle: p.title,
        displayValue: p.sizes.length > 0 ? p.sizes.join(", ") : "All sizes currently reserved",
      })),
    },
    {
      label: "Available Colors",
      key: "colors",
      values: assistantProducts.map((p) => ({
        productId: p.id,
        productTitle: p.title,
        displayValue: p.colors.length > 0 ? p.colors.join(", ") : "Not specified",
      })),
    },
    {
      label: "Atelier Stock Status",
      key: "stockStatus",
      values: assistantProducts.map((p) => {
        const count = stockMap.get(p.id) || 0;
        return {
          productId: p.id,
          productTitle: p.title,
          displayValue:
            count > 5
              ? `In Stock (${count} pieces)`
              : count > 0
              ? `Low Stock (${count} remaining)`
              : "Sold Out",
          rawValue: count,
        };
      }),
    },
  ];

  // Synthesize Key Differences
  const differences: string[] = [];

  // Price difference
  const prices = productRows.map((r) => r.product.basePriceInr);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  if (maxP !== minP) {
    const cheapest = productRows.find((r) => r.product.basePriceInr === minP);
    const dearest = productRows.find((r) => r.product.basePriceInr === maxP);
    differences.push(
      `Price ranges from ${formatPrice(minP)} (${cheapest?.product.title}) to ${formatPrice(maxP)} (${dearest?.product.title}).`
    );
  } else {
    differences.push(`Both garments are priced identically at ${formatPrice(minP)}.`);
  }

  // Weight difference
  const weights = productRows
    .filter((r) => r.product.weightGsm)
    .map((r) => ({ title: r.product.title, gsm: parseInt(r.product.weightGsm || "0", 10) }))
    .filter((w) => !isNaN(w.gsm) && w.gsm > 0);

  if (weights.length >= 2) {
    const lighter = weights.reduce((min, cur) => (cur.gsm < min.gsm ? cur : min));
    const heavier = weights.reduce((max, cur) => (cur.gsm > max.gsm ? cur : max));
    if (lighter.gsm !== heavier.gsm) {
      differences.push(
        `${lighter.title} features a lighter airy weave (${lighter.gsm} GSM), whereas ${heavier.title} has a more structured hand (${heavier.gsm} GSM).`
      );
    }
  }

  // Category difference
  const distinctCats = Array.from(new Set(productRows.map((r) => r.categoryName || r.product.categorySlug)));
  if (distinctCats.length > 1) {
    differences.push(`Features distinct collections: ${distinctCats.join(" vs ")}.`);
  }

  const p1 = assistantProducts[0];
  const p2 = assistantProducts[1];
  const summary = `Side-by-side comparison between ${p1.title} (${formatPrice(p1.price)}) and ${p2.title} (${formatPrice(p2.price)}).`;
  const recommendationNote = `Both garments uphold LOOMERA's ethical artisan tailoring. Choose ${p1.title} for ${p1.sizes.length > 0 ? "immediate availability in " + p1.sizes.join("/") : "classic styling"}, or ${p2.title} for ${p2.badge || "distinctive fabric character"}.`;

  return {
    products: assistantProducts,
    attributes,
    summary,
    differences,
    recommendationNote,
  };
}
