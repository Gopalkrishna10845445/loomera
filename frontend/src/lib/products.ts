import { db } from "@/db";
import { products, productVariants, productImages, categories } from "@/db/schema";
import { eq, and, gte, lte, ilike, or, asc, desc, sql } from "drizzle-orm";
import { Product } from "@/types";
import { calculatePriceBreakdown, calculateShipping } from "./pricing";

export interface GetProductsOptions {
  category?: string;
  strictCategory?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "name-asc";
  limit?: number;
}

// Map database record + relations to application Product type
export function mapDatabaseProductToProduct(
  p: typeof products.$inferSelect,
  variants: (typeof productVariants.$inferSelect)[],
  images: (typeof productImages.$inferSelect)[],
  categoryName?: string
): Product {
  // Extract unique sizes preserving order
  const sizeSet = new Set<string>();
  variants.forEach((v) => sizeSet.add(v.size));
  const sizes = Array.from(sizeSet);

  // Extract unique swatches preserving color name & hex
  const swatchMap = new Map<string, string>();
  variants.forEach((v) => {
    if (!swatchMap.has(v.colorName)) {
      swatchMap.set(v.colorName, v.colorHex);
    }
  });
  const swatches = Array.from(swatchMap.entries()).map(([name, color]) => ({
    name,
    color,
  }));

  const primaryImage =
    images.find((img) => img.isPrimary)?.imageUrl ||
    images[0]?.imageUrl ||
    "/assets/reference/prod_linen_shirt.jpg";

  // Category title display fallback
  let displayCategory = categoryName || "Wardrobe";
  if (!categoryName) {
    if (p.categorySlug === "men") displayCategory = "Men's Wardrobe";
    else if (p.categorySlug === "boys") displayCategory = "Boys' Tailoring";
    else if (p.categorySlug === "kids") displayCategory = "Kids Essentials";
    else if (p.categorySlug === "handloom") displayCategory = "Handloom Heritage";
  }

  const pricing = calculatePriceBreakdown(p.basePriceInr, p.originalPriceInr);

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    price: pricing.salePrice,
    originalPrice: pricing.isOnSale ? pricing.originalPrice : undefined,
    discountPercent: pricing.isOnSale ? pricing.discountPercent : undefined,
    isOnSale: pricing.isOnSale,
    category: displayCategory,
    categorySlug: p.categorySlug as Product["categorySlug"],
    badge: p.badge || "",
    desc: p.description,
    origin: p.origin || "Artisan Guilds",
    weight: p.weightGsm || "Standard GSM",
    image: primaryImage,
    swatches,
    sizes,
    fabricCare: p.fabricCare || undefined,
    craftDetail: p.craftDetail || undefined,
  };
}

export async function getProductsFromDb(
  options: GetProductsOptions = {}
): Promise<Product[]> {
  try {
    const conditions = [eq(products.isPublished, true)];

    // Category filter:
    if (options.category && options.category !== "all" && options.category !== "new-arrivals") {
      if (options.category === "men") {
        if (options.strictCategory) {
          conditions.push(eq(products.categorySlug, "men"));
        } else {
          // Adult menswear includes men's wardrobe and adult kurtas in handloom
          conditions.push(
            or(
              eq(products.categorySlug, "men"),
              eq(products.categorySlug, "handloom")
            )!
          );
        }
      } else if (options.category === "boys" || options.category === "kids") {
        // Youth garments only
        conditions.push(
          or(
            eq(products.categorySlug, "boys"),
            eq(products.categorySlug, "kids")
          )!
        );
      } else {
        conditions.push(eq(products.categorySlug, options.category));
      }
    }

    // Search filter
    if (options.search && options.search.trim()) {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(ilike(products.title, q), ilike(products.description, q))!
      );
    }

    // Price filters
    if (typeof options.minPrice === "number") {
      conditions.push(gte(products.basePriceInr, options.minPrice));
    }
    if (typeof options.maxPrice === "number") {
      conditions.push(lte(products.basePriceInr, options.maxPrice));
    }

    // Determine sorting
    let orderByClause;
    switch (options.sort) {
      case "price-asc":
        orderByClause = [asc(products.basePriceInr)];
        break;
      case "price-desc":
        orderByClause = [desc(products.basePriceInr)];
        break;
      case "name-asc":
        orderByClause = [asc(products.title)];
        break;
      case "newest":
        orderByClause = [
          sql`CASE WHEN ${products.badge} ILIKE '%new%' THEN 0 ELSE 1 END`,
          desc(products.createdAt),
        ];
        break;
      case "featured":
      default:
        orderByClause = [
          asc(products.displayOrder),
          desc(products.createdAt),
        ];
        break;
    }

    // Query products
    const productRows = await db
      .select({
        product: products,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categorySlug, categories.slug))
      .where(and(...conditions))
      .orderBy(...orderByClause)
      .limit(options.limit || 50);

    if (productRows.length === 0) return [];

    const productIds = productRows.map((r) => r.product.id);

    // Fetch associated variants and images in batch
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(sql`${productVariants.productId} IN ${productIds}`);

    const imageRows = await db
      .select()
      .from(productImages)
      .where(sql`${productImages.productId} IN ${productIds}`);

    // Group variants and images by product ID
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

    return productRows.map((row) =>
      mapDatabaseProductToProduct(
        row.product,
        variantsByProd.get(row.product.id) || [],
        imagesByProd.get(row.product.id) || [],
        row.categoryName || undefined
      )
    );
  } catch (error) {
    console.error("Database query failed in getProductsFromDb:", error);
    throw error;
  }
}

export async function getProductBySlugFromDb(
  slugOrId: string
): Promise<Product | null> {
  try {
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
          or(eq(products.slug, slugOrId), eq(products.id, slugOrId))
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

    return mapDatabaseProductToProduct(
      row.product,
      variantRows,
      imageRows,
      row.categoryName || undefined
    );
  } catch (error) {
    console.error("Database query failed in getProductBySlugFromDb:", error);
    throw error;
  }
}

export interface ServerCartVerificationItem {
  id: string;
  productId: string;
  title: string;
  color: string;
  size: string;
  quantity: number;
  clientPrice?: number;
  verifiedPrice: number;
  lineSubtotal: number;
  image: string;
  isAvailable: boolean;
  priceMismatch: boolean;
  errorMessage?: string;
}

export interface ServerCartVerificationResult {
  isValid: boolean;
  items: ServerCartVerificationItem[];
  subtotal: number;
  shipping: ReturnType<typeof calculateShipping>;
  finalTotal: number;
  priceTampered: boolean;
  errors: string[];
}

/**
 * Server-Authoritative Cart & Pricing Verification.
 * Reads verified product and variant prices directly from PostgreSQL via Drizzle ORM.
 * Ignores any client-supplied prices to prevent browser price tampering.
 */
export async function validateCartOnServer(
  rawItems: Array<{
    productId: string;
    color?: string;
    size?: string;
    quantity: number;
    clientPrice?: number;
  }>
): Promise<ServerCartVerificationResult> {
  const errors: string[] = [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const shipping = calculateShipping(0);
    return {
      isValid: true,
      items: [],
      subtotal: 0,
      shipping,
      finalTotal: 0,
      priceTampered: false,
      errors: [],
    };
  }

  const items: ServerCartVerificationItem[] = [];
  let priceTampered = false;

  for (const item of rawItems) {
    if (!item.productId || typeof item.productId !== "string") {
      errors.push("Invalid product ID in cart item");
      continue;
    }

    const safeQty = Math.max(1, typeof item.quantity === "number" && !Number.isNaN(item.quantity) ? Math.floor(item.quantity) : 1);
    const chosenColor = item.color || "Natural";
    const chosenSize = item.size || "Standard";
    const itemId = `${item.productId}-${chosenColor}-${chosenSize}`;

    // Lookup product in database
    const prodRows = await db
      .select()
      .from(products)
      .where(and(eq(products.id, item.productId), eq(products.isPublished, true)))
      .limit(1);

    if (prodRows.length === 0) {
      items.push({
        id: itemId,
        productId: item.productId,
        title: "Unknown or Unavailable Garment",
        color: chosenColor,
        size: chosenSize,
        quantity: safeQty,
        clientPrice: item.clientPrice,
        verifiedPrice: 0,
        lineSubtotal: 0,
        image: "/assets/reference/prod_linen_shirt.jpg",
        isAvailable: false,
        priceMismatch: false,
        errorMessage: "This product is no longer published or in catalog",
      });
      errors.push(`Product '${item.productId}' is not available.`);
      continue;
    }

    const prod = prodRows[0];

    // Check variant price override if available
    const variantRows = await db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, prod.id),
          eq(productVariants.colorName, chosenColor),
          eq(productVariants.size, chosenSize)
        )
      )
      .limit(1);

    const variant = variantRows[0];
    const verifiedPrice = variant?.priceOverrideInr || prod.basePriceInr;

    // Check if client tampered with price
    const hasPriceMismatch =
      typeof item.clientPrice === "number" &&
      item.clientPrice !== verifiedPrice;

    if (hasPriceMismatch) {
      priceTampered = true;
    }

    // Fetch primary image
    const imageRows = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, prod.id))
      .limit(1);

    const primaryImage = imageRows[0]?.imageUrl || "/assets/reference/prod_linen_shirt.jpg";

    items.push({
      id: itemId,
      productId: prod.id,
      title: prod.title,
      color: chosenColor,
      size: chosenSize,
      quantity: safeQty,
      clientPrice: item.clientPrice,
      verifiedPrice,
      lineSubtotal: verifiedPrice * safeQty,
      image: primaryImage,
      isAvailable: true,
      priceMismatch: hasPriceMismatch,
    });
  }

  const subtotal = items.reduce(
    (acc, it) => (it.isAvailable ? acc + it.lineSubtotal : acc),
    0
  );
  const shipping = calculateShipping(subtotal);
  const finalTotal = subtotal + shipping.shippingFee;
  const isValid = items.every((it) => it.isAvailable) && items.length > 0;

  return {
    isValid,
    items,
    subtotal,
    shipping,
    finalTotal,
    priceTampered,
    errors,
  };
}
