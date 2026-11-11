import { db } from "@/db";
import {
  products,
  productVariants,
  restockRecords,
  restockNotifications,
} from "@/db/schema";
import { eq, and, or, inArray, gte, sql } from "drizzle-orm";

export interface VariantAvailability {
  variantId: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  price: number;
}

export interface ProductAvailabilityResult {
  productId: string;
  slug: string;
  title: string;
  isPublished: boolean;
  available: boolean;
  status: "in_stock" | "low_stock" | "out_of_stock" | "unavailable";
  totalStock: number;
  requestedSize?: string;
  requestedColor?: string;
  matchingVariant?: {
    id: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
    price: number;
  };
  availableSizes: string[];
  availableColors: string[];
  matchingVariants: VariantAvailability[];
  reason?: string;
}

export interface RestockInfoResult {
  hasRestockInfo: boolean;
  productId: string;
  slug: string;
  title: string;
  variantId?: string;
  size?: string;
  color?: string;
  expectedDate?: string; // ISO string
  expectedQuantity?: number;
  status?: string;
  message: string;
}

/**
 * 1. checkProductAvailability
 * Authoritatively inspects PostgreSQL variant inventory for a given garment.
 */
export async function checkProductAvailability(
  productIdOrSlug: string,
  size?: string,
  color?: string
): Promise<ProductAvailabilityResult> {
  const cleanId = (productIdOrSlug || "").trim();
  if (!cleanId) {
    return {
      productId: "",
      slug: "",
      title: "",
      isPublished: false,
      available: false,
      status: "unavailable",
      totalStock: 0,
      availableSizes: [],
      availableColors: [],
      matchingVariants: [],
      reason: "Invalid or empty product identifier",
    };
  }

  // 1. Fetch published product
  const prodRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isPublished, true),
        or(eq(products.id, cleanId), eq(products.slug, cleanId))
      )
    )
    .limit(1);

  if (prodRows.length === 0) {
    return {
      productId: cleanId,
      slug: cleanId,
      title: "Unknown Garment",
      isPublished: false,
      available: false,
      status: "unavailable",
      totalStock: 0,
      availableSizes: [],
      availableColors: [],
      matchingVariants: [],
      reason: "This product is either unpublished or does not exist in the atelier catalog.",
    };
  }

  const prod = prodRows[0];

  // 2. Fetch all variants for this product
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, prod.id));

  // Determine available sizes and colors (where stock > 0)
  const sizeStockMap = new Map<string, number>();
  const colorStockMap = new Map<string, number>();
  let totalStock = 0;

  const allVariants: VariantAvailability[] = variantRows.map((v) => {
    const stock = Math.max(0, v.stockQuantity || 0);
    totalStock += stock;
    sizeStockMap.set(v.size, (sizeStockMap.get(v.size) || 0) + stock);
    colorStockMap.set(v.colorName, (colorStockMap.get(v.colorName) || 0) + stock);

    let statusText: "In Stock" | "Low Stock" | "Out of Stock" = "In Stock";
    if (stock === 0) statusText = "Out of Stock";
    else if (stock <= 5) statusText = "Low Stock";

    return {
      variantId: v.id,
      size: v.size,
      color: v.colorName,
      colorHex: v.colorHex,
      stock,
      status: statusText,
      price: v.priceOverrideInr || prod.basePriceInr,
    };
  });

  const availableSizes = Array.from(sizeStockMap.entries())
    .filter(([, stock]) => stock > 0)
    .map(([size]) => size);

  const availableColors = Array.from(colorStockMap.entries())
    .filter(([, stock]) => stock > 0)
    .map(([color]) => color);

  // Normalize requested filters
  const normSize = size?.trim().toUpperCase();
  const normColor = color?.trim().toLowerCase();

  const colorMatches = (variantColor: string, queryColor: string) => {
    const v = variantColor.trim().toLowerCase();
    const q = queryColor.trim().toLowerCase();
    if (v === q || v.includes(q) || q.includes(v)) return true;
    if ((q === "rust" || q === "terracotta" || q === "brick") && (v === "rust" || v === "terracotta" || v === "brick")) return true;
    if ((q === "navy" || q === "blue") && (v === "navy" || v === "blue" || v === "midnight blue")) return true;
    return false;
  };

  // Case A: Specific size and color requested
  if (normSize && normColor) {
    const matched = variantRows.find(
      (v) =>
        v.size.toUpperCase() === normSize &&
        colorMatches(v.colorName, normColor)
    );

    if (!matched) {
      return {
        productId: prod.id,
        slug: prod.slug,
        title: prod.title,
        isPublished: true,
        available: false,
        status: "unavailable",
        totalStock,
        requestedSize: size,
        requestedColor: color,
        availableSizes,
        availableColors,
        matchingVariants: allVariants,
        reason: `The requested combination (${size} / ${color}) is not tailored for ${prod.title}.`,
      };
    }

    const stock = Math.max(0, matched.stockQuantity || 0);
    const inStock = stock > 0;
    const status = inStock ? (stock <= 5 ? "low_stock" : "in_stock") : "out_of_stock";

    return {
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      isPublished: true,
      available: inStock,
      status,
      totalStock,
      requestedSize: size,
      requestedColor: color,
      matchingVariant: {
        id: matched.id,
        sku: matched.sku,
        size: matched.size,
        color: matched.colorName,
        stock,
        price: matched.priceOverrideInr || prod.basePriceInr,
      },
      availableSizes,
      availableColors,
      matchingVariants: allVariants,
      reason: inStock
        ? undefined
        : `Size ${size} in ${color} is currently out of stock.`,
    };
  }

  // Case B: Only size requested
  if (normSize) {
    const sizeVariants = variantRows.filter(
      (v) => v.size.toUpperCase() === normSize
    );

    if (sizeVariants.length === 0) {
      return {
        productId: prod.id,
        slug: prod.slug,
        title: prod.title,
        isPublished: true,
        available: false,
        status: "unavailable",
        totalStock,
        requestedSize: size,
        availableSizes,
        availableColors,
        matchingVariants: allVariants,
        reason: `Size ${size} is not offered for ${prod.title}.`,
      };
    }

    const sizeStock = sizeVariants.reduce(
      (sum, v) => sum + Math.max(0, v.stockQuantity || 0),
      0
    );
    const inStock = sizeStock > 0;
    const status = inStock ? (sizeStock <= 5 ? "low_stock" : "in_stock") : "out_of_stock";

    return {
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      isPublished: true,
      available: inStock,
      status,
      totalStock,
      requestedSize: size,
      availableSizes,
      availableColors,
      matchingVariants: allVariants,
      reason: inStock ? undefined : `Size ${size} is currently out of stock in all colors.`,
    };
  }

  // Case C: Only color requested
  if (normColor) {
    const colorVariants = variantRows.filter(
      (v) => colorMatches(v.colorName, normColor)
    );

    if (colorVariants.length === 0) {
      return {
        productId: prod.id,
        slug: prod.slug,
        title: prod.title,
        isPublished: true,
        available: false,
        status: "unavailable",
        totalStock,
        requestedColor: color,
        availableSizes,
        availableColors,
        matchingVariants: allVariants,
        reason: `Color ${color} is not offered for ${prod.title}.`,
      };
    }

    const colorStock = colorVariants.reduce(
      (sum, v) => sum + Math.max(0, v.stockQuantity || 0),
      0
    );
    const inStock = colorStock > 0;
    const status = inStock ? (colorStock <= 5 ? "low_stock" : "in_stock") : "out_of_stock";

    return {
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      isPublished: true,
      available: inStock,
      status,
      totalStock,
      requestedColor: color,
      availableSizes,
      availableColors,
      matchingVariants: allVariants,
      reason: inStock ? undefined : `Color ${color} is currently out of stock in all sizes.`,
    };
  }

  // Case D: General product availability
  const hasStock = totalStock > 0;
  return {
    productId: prod.id,
    slug: prod.slug,
    title: prod.title,
    isPublished: true,
    available: hasStock,
    status: hasStock ? (totalStock <= 10 ? "low_stock" : "in_stock") : "out_of_stock",
    totalStock,
    availableSizes,
    availableColors,
    matchingVariants: allVariants,
  };
}

/**
 * 2. getAvailableVariants
 * Returns all valid variants for a product with current stock status.
 */
export async function getAvailableVariants(
  productIdOrSlug: string
): Promise<VariantAvailability[]> {
  const check = await checkProductAvailability(productIdOrSlug);
  return check.matchingVariants;
}

/**
 * 3. getLowStockProducts
 * Returns products or variants below a configurable low-stock threshold.
 */
export async function getLowStockProducts(
  threshold: number = 5
): Promise<
  Array<{
    productId: string;
    productTitle: string;
    variantId: string;
    size: string;
    color: string;
    stockQuantity: number;
  }>
> {
  const lowVariants = await db
    .select({
      productId: products.id,
      productTitle: products.title,
      variantId: productVariants.id,
      size: productVariants.size,
      color: productVariants.colorName,
      stockQuantity: productVariants.stockQuantity,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(products.isPublished, true),
        gte(productVariants.stockQuantity, 0),
        sql`${productVariants.stockQuantity} <= ${threshold}`
      )
    );

  return lowVariants;
}

/**
 * 4. getRestockInformation
 * Retrieves authoritative restock records. Never infers dates from stock.
 */
export async function getRestockInformation(
  productIdOrSlug: string,
  size?: string,
  color?: string
): Promise<RestockInfoResult> {
  const cleanId = (productIdOrSlug || "").trim();
  if (!cleanId) {
    return {
      hasRestockInfo: false,
      productId: "",
      slug: "",
      title: "",
      message: "An estimated restock date is not currently available.",
    };
  }

  const prodRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isPublished, true),
        or(eq(products.id, cleanId), eq(products.slug, cleanId))
      )
    )
    .limit(1);

  if (prodRows.length === 0) {
    return {
      hasRestockInfo: false,
      productId: cleanId,
      slug: cleanId,
      title: "Unknown Garment",
      message: "An estimated restock date is not currently available.",
    };
  }

  const prod = prodRows[0];

  // Fetch product variants
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, prod.id));

  let candidateVariantIds = variants.map((v) => v.id);

  if (size || color) {
    const normSize = size?.trim().toUpperCase();
    const normColor = color?.trim().toLowerCase();

    const filtered = variants.filter((v) => {
      let match = true;
      if (normSize && v.size.toUpperCase() !== normSize) match = false;
      if (normColor && v.colorName.toLowerCase() !== normColor) match = false;
      return match;
    });

    if (filtered.length > 0) {
      candidateVariantIds = filtered.map((v) => v.id);
    }
  }

  if (candidateVariantIds.length === 0) {
    return {
      hasRestockInfo: false,
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      message: "An estimated restock date is not currently available.",
    };
  }

  // Query restock_records
  const records = await db
    .select()
    .from(restockRecords)
    .where(
      and(
        inArray(restockRecords.variantId, candidateVariantIds),
        or(
          eq(restockRecords.status, "scheduled"),
          eq(restockRecords.status, "in_transit")
        )
      )
    )
    .orderBy(restockRecords.expectedRestockDate)
    .limit(1);

  if (records.length === 0 || !records[0].expectedRestockDate) {
    return {
      hasRestockInfo: false,
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      size,
      color,
      message: "An estimated restock date is not currently available.",
    };
  }

  const rec = records[0];
  const matchedVariant = variants.find((v) => v.id === rec.variantId);
  const restockDate = rec.expectedRestockDate ? new Date(rec.expectedRestockDate) : null;

  return {
    hasRestockInfo: true,
    productId: prod.id,
    slug: prod.slug,
    title: prod.title,
    variantId: rec.variantId,
    size: matchedVariant?.size,
    color: matchedVariant?.colorName,
    expectedDate: restockDate ? restockDate.toISOString() : undefined,
    expectedQuantity: rec.expectedQuantity,
    status: rec.status,
    message: restockDate
      ? `Restock expected on ${restockDate.toLocaleDateString("en-IN", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })} (${rec.expectedQuantity} pieces).`
      : `Restock scheduled for ${rec.expectedQuantity} pieces.`,
  };
}

/**
 * 5. Restock Notification Subscriptions
 */
export async function subscribeRestockNotification(
  userId: string,
  variantId: string
): Promise<{ success: boolean; notificationId: string; alreadyActive: boolean }> {
  // Verify variant exists
  const variantRows = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (variantRows.length === 0) {
    throw new Error("Variant does not exist");
  }

  // Check for existing active notification
  const existing = await db
    .select()
    .from(restockNotifications)
    .where(
      and(
        eq(restockNotifications.userId, userId),
        eq(restockNotifications.variantId, variantId),
        eq(restockNotifications.status, "active")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      success: true,
      notificationId: existing[0].id,
      alreadyActive: true,
    };
  }

  const [inserted] = await db
    .insert(restockNotifications)
    .values({
      userId,
      variantId,
      status: "active",
    })
    .returning();

  return {
    success: true,
    notificationId: inserted.id,
    alreadyActive: false,
  };
}

export async function cancelRestockNotification(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const result = await db
    .update(restockNotifications)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(restockNotifications.id, notificationId),
        eq(restockNotifications.userId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

export async function getUserRestockNotifications(userId: string) {
  const list = await db
    .select({
      id: restockNotifications.id,
      status: restockNotifications.status,
      createdAt: restockNotifications.createdAt,
      variantId: productVariants.id,
      size: productVariants.size,
      color: productVariants.colorName,
      stockQuantity: productVariants.stockQuantity,
      productId: products.id,
      productTitle: products.title,
      productSlug: products.slug,
    })
    .from(restockNotifications)
    .innerJoin(
      productVariants,
      eq(restockNotifications.variantId, productVariants.id)
    )
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(restockNotifications.userId, userId),
        eq(restockNotifications.status, "active")
      )
    )
    .orderBy(restockNotifications.createdAt);

  return list;
}
