/**
 * LOOMERA — Administrative Product & Variant Management Service
 * Full CRUD, soft-archiving, variant matrix administration, and audit tracking.
 */

import { eq, and, sql, desc, or, ilike, gt } from "drizzle-orm";
import { db } from "@/db";
import {
  products,
  productVariants,
  productImages,
  categories,
  orderItems,
  inventoryReservations,
} from "@/db/schema";
import { recordAdminAuditLog } from "./audit";

export interface CreateVariantInput {
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  priceOverrideInr?: number | null;
  stockQuantity?: number;
}

export interface CreateImageInput {
  imageUrl: string;
  altText: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface CreateProductInput {
  id?: string;
  slug: string;
  title: string;
  description: string;
  basePriceInr: number;
  originalPriceInr?: number | null;
  categorySlug: string;
  badge?: string;
  origin?: string;
  weightGsm?: string;
  fabricCare?: string;
  craftDetail?: string;
  isPublished?: boolean;
  displayOrder?: number;
  variants?: CreateVariantInput[];
  images?: CreateImageInput[];
}

export interface UpdateProductInput {
  slug?: string;
  title?: string;
  description?: string;
  basePriceInr?: number;
  originalPriceInr?: number | null;
  categorySlug?: string;
  badge?: string;
  origin?: string;
  weightGsm?: string;
  fabricCare?: string;
  craftDetail?: string;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface GetAdminProductsParams {
  search?: string;
  categorySlug?: string;
  isPublished?: boolean;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Retrieves catalog products for administration.
 */
export async function getAdminProducts(params: GetAdminProductsParams = {}) {
  const {
    search,
    categorySlug,
    isPublished,
    isArchived,
    limit = 50,
    offset = 0,
  } = params;

  const conditions = [];

  if (categorySlug) {
    conditions.push(eq(products.categorySlug, categorySlug));
  }
  if (typeof isPublished === "boolean") {
    conditions.push(eq(products.isPublished, isPublished));
  }
  if (typeof isArchived === "boolean") {
    conditions.push(eq(products.isArchived, isArchived));
  }
  if (search) {
    conditions.push(
      or(
        ilike(products.title, `%${search}%`),
        ilike(products.slug, `%${search}%`),
        ilike(products.id, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      basePriceInr: products.basePriceInr,
      originalPriceInr: products.originalPriceInr,
      categorySlug: products.categorySlug,
      categoryName: categories.name,
      badge: products.badge,
      origin: products.origin,
      weightGsm: products.weightGsm,
      fabricCare: products.fabricCare,
      craftDetail: products.craftDetail,
      displayOrder: products.displayOrder,
      isPublished: products.isPublished,
      isArchived: products.isArchived,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      variantCount: sql<number>`(SELECT count(*) FROM ${productVariants} pv WHERE pv.product_id = ${products.id})::int`,
      totalStock: sql<number>`COALESCE((SELECT sum(stock_quantity) FROM ${productVariants} pv WHERE pv.product_id = ${products.id}), 0)::int`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categorySlug, categories.slug))
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .where(whereClause);

  return {
    products: productRows,
    total: countRow?.total || 0,
    limit,
    offset,
  };
}

/**
 * Retrieves a single product with full variants and images.
 */
export async function getAdminProductById(id: string) {
  const [product] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      basePriceInr: products.basePriceInr,
      originalPriceInr: products.originalPriceInr,
      categorySlug: products.categorySlug,
      categoryName: categories.name,
      badge: products.badge,
      origin: products.origin,
      weightGsm: products.weightGsm,
      fabricCare: products.fabricCare,
      craftDetail: products.craftDetail,
      displayOrder: products.displayOrder,
      isPublished: products.isPublished,
      isArchived: products.isArchived,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categorySlug, categories.slug))
    .where(eq(products.id, id))
    .limit(1);

  if (!product) return null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.size, productVariants.colorName);

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.displayOrder);

  return {
    ...product,
    variants,
    images,
  };
}

/**
 * Creates a new garment product with variants and images inside an atomic transaction.
 */
export async function createAdminProduct(
  input: CreateProductInput,
  adminId: string,
  ipAddress?: string | null
) {
  const productId = input.id || input.slug;

  return await db.transaction(async (tx) => {
    // 1. Check slug uniqueness
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(or(eq(products.id, productId), eq(products.slug, input.slug)))
      .limit(1);

    if (existing) {
      throw new Error(`A garment with ID or slug '${input.slug}' already exists.`);
    }

    // 2. Insert product
    const [newProduct] = await tx
      .insert(products)
      .values({
        id: productId,
        slug: input.slug,
        title: input.title,
        description: input.description,
        basePriceInr: input.basePriceInr,
        originalPriceInr: input.originalPriceInr || null,
        categorySlug: input.categorySlug,
        badge: input.badge || "",
        origin: input.origin || "India",
        weightGsm: input.weightGsm || null,
        fabricCare: input.fabricCare || null,
        craftDetail: input.craftDetail || null,
        displayOrder: input.displayOrder ?? 0,
        isPublished: input.isPublished ?? true,
        isArchived: false,
      })
      .returning();

    // 3. Insert variants
    if (input.variants && input.variants.length > 0) {
      for (const v of input.variants) {
        await tx.insert(productVariants).values({
          productId,
          sku: v.sku,
          size: v.size,
          colorName: v.colorName,
          colorHex: v.colorHex,
          priceOverrideInr: v.priceOverrideInr || null,
          stockQuantity: v.stockQuantity ?? 50,
        });
      }
    }

    // 4. Insert images
    if (input.images && input.images.length > 0) {
      for (let i = 0; i < input.images.length; i++) {
        const img = input.images[i];
        await tx.insert(productImages).values({
          productId,
          imageUrl: img.imageUrl,
          altText: img.altText || input.title,
          isPrimary: img.isPrimary ?? (i === 0),
          displayOrder: img.displayOrder ?? i,
        });
      }
    }

    // 5. Audit Log
    await recordAdminAuditLog({
      adminId,
      action: "PRODUCT_CREATED",
      resourceType: "PRODUCT",
      resourceId: productId,
      previousState: null,
      newState: newProduct as unknown as Record<string, unknown>,
      ipAddress,
    });

    return newProduct;
  });
}

/**
 * Updates a product's attributes.
 */
export async function updateAdminProduct(
  id: string,
  input: UpdateProductInput,
  adminId: string,
  ipAddress?: string | null
) {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new Error(`Product not found: ${id}`);
    }

    const [updated] = await tx
      .update(products)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await recordAdminAuditLog({
      adminId,
      action: "PRODUCT_UPDATED",
      resourceType: "PRODUCT",
      resourceId: id,
      previousState: existing as unknown as Record<string, unknown>,
      newState: updated as unknown as Record<string, unknown>,
      ipAddress,
    });

    return updated;
  });
}

/**
 * Soft-archives a product. Keeps it intact for historical orders while hiding from active storefront.
 */
export async function archiveProduct(id: string, adminId: string, ipAddress?: string | null) {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Product not found: ${id}`);
  }

  const [updated] = await db
    .update(products)
    .set({
      isArchived: true,
      isPublished: false,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "PRODUCT_ARCHIVED",
    resourceType: "PRODUCT",
    resourceId: id,
    previousState: { isArchived: existing.isArchived, isPublished: existing.isPublished },
    newState: { isArchived: true, isPublished: false },
    ipAddress,
  });

  return updated;
}

/**
 * Unarchives a product and restores it to published status.
 */
export async function unarchiveProduct(id: string, adminId: string, ipAddress?: string | null) {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Product not found: ${id}`);
  }

  const [updated] = await db
    .update(products)
    .set({
      isArchived: false,
      isPublished: true,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "PRODUCT_UNARCHIVED",
    resourceType: "PRODUCT",
    resourceId: id,
    previousState: { isArchived: existing.isArchived, isPublished: existing.isPublished },
    newState: { isArchived: false, isPublished: true },
    ipAddress,
  });

  return updated;
}

/**
 * Safely deletes a product if and only if it has zero ordered history.
 */
export async function deleteProductSafely(id: string, adminId: string, ipAddress?: string | null) {
  // Check if any order items reference this product
  const [ordered] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.productId, id));

  if (ordered && ordered.count > 0) {
    throw new Error(
      `Cannot delete product '${id}' because it has ${ordered.count} existing customer order records. Archive the product instead.`
    );
  }

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Product not found: ${id}`);
  }

  await db.delete(products).where(eq(products.id, id));

  await recordAdminAuditLog({
    adminId,
    action: "PRODUCT_DELETED",
    resourceType: "PRODUCT",
    resourceId: id,
    previousState: existing as unknown as Record<string, unknown>,
    newState: null,
    ipAddress,
  });

  return { success: true };
}

/**
 * Creates a variant for an existing product.
 */
export async function createProductVariant(
  productId: string,
  input: CreateVariantInput,
  adminId: string,
  ipAddress?: string | null
) {
  const [created] = await db
    .insert(productVariants)
    .values({
      productId,
      sku: input.sku,
      size: input.size,
      colorName: input.colorName,
      colorHex: input.colorHex,
      priceOverrideInr: input.priceOverrideInr || null,
      stockQuantity: input.stockQuantity ?? 50,
    })
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "VARIANT_CREATED",
    resourceType: "PRODUCT_VARIANT",
    resourceId: created.id,
    previousState: null,
    newState: created as unknown as Record<string, unknown>,
    ipAddress,
  });

  return created;
}

/**
 * Updates a product variant's attributes.
 */
export async function updateProductVariant(
  variantId: string,
  input: Partial<CreateVariantInput>,
  adminId: string,
  ipAddress?: string | null
) {
  const [existing] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!existing) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  const [updated] = await db
    .update(productVariants)
    .set({
      ...input,
    })
    .where(eq(productVariants.id, variantId))
    .returning();

  await recordAdminAuditLog({
    adminId,
    action: "VARIANT_UPDATED",
    resourceType: "PRODUCT_VARIANT",
    resourceId: variantId,
    previousState: existing as unknown as Record<string, unknown>,
    newState: updated as unknown as Record<string, unknown>,
    ipAddress,
  });

  return updated;
}

/**
 * Deletes a variant if not tied to orders or active reservations.
 */
export async function deleteProductVariantSafely(
  variantId: string,
  adminId: string,
  ipAddress?: string | null
) {
  // Check orders
  const [ordered] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orderItems)
    .where(eq(orderItems.variantId, variantId));

  if (ordered && ordered.count > 0) {
    throw new Error(
      `Cannot delete variant '${variantId}' because it exists in ${ordered.count} order records.`
    );
  }

  // Check active reservations
  const now = new Date();
  const [reserved] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.variantId, variantId),
        eq(inventoryReservations.status, "RESERVED"),
        gt(inventoryReservations.expiresAt, now)
      )
    );

  if (reserved && reserved.count > 0) {
    throw new Error(`Cannot delete variant with ${reserved.count} active reservations.`);
  }

  const [existing] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!existing) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  await db.delete(productVariants).where(eq(productVariants.id, variantId));

  await recordAdminAuditLog({
    adminId,
    action: "VARIANT_DELETED",
    resourceType: "PRODUCT_VARIANT",
    resourceId: variantId,
    previousState: existing as unknown as Record<string, unknown>,
    newState: null,
    ipAddress,
  });

  return { success: true };
}

/**
 * Replaces and reorders all images for a product.
 */
export async function replaceProductImages(
  productId: string,
  images: CreateImageInput[],
  adminId: string,
  ipAddress?: string | null
) {
  return await db.transaction(async (tx) => {
    // Delete existing images
    await tx.delete(productImages).where(eq(productImages.productId, productId));

    // Reinsert
    const inserted = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const [row] = await tx
        .insert(productImages)
        .values({
          productId,
          imageUrl: img.imageUrl,
          altText: img.altText,
          isPrimary: img.isPrimary ?? (i === 0),
          displayOrder: img.displayOrder ?? i,
        })
        .returning();
      inserted.push(row);
    }

    await recordAdminAuditLog({
      adminId,
      action: "IMAGES_REPLACED",
      resourceType: "PRODUCT_IMAGES",
      resourceId: productId,
      previousState: null,
      newState: { count: inserted.length },
      ipAddress,
    });

    return inserted;
  });
}
