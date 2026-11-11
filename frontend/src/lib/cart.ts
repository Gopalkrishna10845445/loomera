import { eq, and, sql, ilike } from "drizzle-orm";
import { db } from "@/db";
import { carts, cartItems, products, productImages, productVariants } from "@/db/schema";
import { CartItem } from "@/types";

/**
 * Retrieves the cart ID for a user, or creates one if it does not yet exist.
 */
export async function getOrCreateUserCartId(userId: string): Promise<string> {
  const existing = await db
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(carts)
    .values({ userId })
    .returning({ id: carts.id });

  return created.id;
}

/**
 * Fetches all cart items for an authenticated user with authoritative database pricing and images.
 */
export async function getUserCart(userId: string): Promise<CartItem[]> {
  const cartId = await getOrCreateUserCartId(userId);

  const rows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      size: cartItems.size,
      color: cartItems.color,
      quantity: cartItems.quantity,
      title: products.title,
      basePriceInr: products.basePriceInr,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  if (rows.length === 0) {
    return [];
  }

  // Fetch primary images and variant price overrides for all products in cart
  const productIds = Array.from(new Set(rows.map((r) => r.productId)));

  const images = await db
    .select({
      productId: productImages.productId,
      imageUrl: productImages.imageUrl,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(
      sql`${productImages.productId} IN (${sql.join(
        productIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  const variants = await db
    .select({
      productId: productVariants.productId,
      size: productVariants.size,
      colorName: productVariants.colorName,
      priceOverrideInr: productVariants.priceOverrideInr,
    })
    .from(productVariants)
    .where(
      sql`${productVariants.productId} IN (${sql.join(
        productIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );

  const imageMap = new Map<string, string>();
  for (const img of images) {
    if (!imageMap.has(img.productId) || img.isPrimary) {
      imageMap.set(img.productId, img.imageUrl);
    }
  }

  const variantPriceMap = new Map<string, number>();
  for (const v of variants) {
    if (v.priceOverrideInr !== null) {
      const key = `${v.productId}:${v.colorName.toLowerCase()}:${v.size.toLowerCase()}`;
      variantPriceMap.set(key, v.priceOverrideInr);
    }
  }

  return rows.map((r) => {
    const variantKey = `${r.productId}:${r.color.toLowerCase()}:${r.size.toLowerCase()}`;
    const price = variantPriceMap.get(variantKey) ?? r.basePriceInr;
    const image = imageMap.get(r.productId) || "/assets/reference/prod_linen_shirt.jpg";
    const compositeId = `${r.productId}-${r.color}-${r.size}`;

    return {
      id: compositeId,
      productId: r.productId,
      title: r.title,
      price,
      color: r.color,
      size: r.size,
      image,
      quantity: r.quantity,
    };
  });
}

/**
 * Adds an item to the user's persistent cart, or increments quantity if it exists.
 * Validates product publication status, variant existence, and available stock.
 */
export async function addItemToUserCart(
  userId: string,
  item: {
    productId: string;
    size: string;
    color: string;
    quantity?: number;
  }
): Promise<void> {
  const reqQty = Number(item.quantity) || 1;
  if (!Number.isInteger(reqQty) || reqQty <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }
  const qty = Math.min(10, reqQty);
  const cartId = await getOrCreateUserCartId(userId);

  // Validate that the product exists and is published
  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, item.productId), eq(products.isPublished, true)))
    .limit(1);

  if (existingProduct.length === 0) {
    throw new Error(`Product ${item.productId} does not exist or is unavailable.`);
  }

  // Validate that variant exists and has stock
  const variant = await db
    .select({
      id: productVariants.id,
      stockQuantity: productVariants.stockQuantity,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, item.productId),
        ilike(productVariants.size, item.size.trim()),
        ilike(productVariants.colorName, item.color.trim())
      )
    )
    .limit(1);

  if (variant.length === 0) {
    throw new Error(`Variant (${item.color}, ${item.size}) is not available for this product.`);
  }

  if (variant[0].stockQuantity <= 0) {
    throw new Error("This item is currently out of stock.");
  }

  const maxPermitted = Math.min(10, variant[0].stockQuantity);

  // Check if item already exists in this cart
  const existingItem = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, item.productId),
        ilike(cartItems.size, item.size.trim()),
        ilike(cartItems.color, item.color.trim())
      )
    )
    .limit(1);

  if (existingItem.length > 0) {
    const updatedQty = Math.min(maxPermitted, existingItem[0].quantity + qty);
    await db
      .update(cartItems)
      .set({ quantity: updatedQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existingItem[0].id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: Math.min(maxPermitted, qty),
    });
  }

  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Updates an item's quantity in the user's cart.
 */
export async function updateUserCartItemQuantity(
  userId: string,
  item: {
    productId: string;
    size: string;
    color: string;
    quantity: number;
  }
): Promise<void> {
  const cartId = await getOrCreateUserCartId(userId);

  if (item.quantity <= 0) {
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, item.productId),
          ilike(cartItems.size, item.size.trim()),
          ilike(cartItems.color, item.color.trim())
        )
      );
  } else {
    const variant = await db
      .select({ stockQuantity: productVariants.stockQuantity })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, item.productId),
          ilike(productVariants.size, item.size.trim()),
          ilike(productVariants.colorName, item.color.trim())
        )
      )
      .limit(1);

    const stock = variant.length > 0 ? variant[0].stockQuantity : 10;
    const cappedQty = Math.min(10, Math.min(Math.floor(item.quantity), stock));

    await db
      .update(cartItems)
      .set({ quantity: cappedQty, updatedAt: new Date() })
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, item.productId),
          ilike(cartItems.size, item.size.trim()),
          ilike(cartItems.color, item.color.trim())
        )
      );
  }

  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Removes an item from the user's cart.
 */
export async function removeUserCartItem(
  userId: string,
  item: {
    productId: string;
    size: string;
    color: string;
  }
): Promise<void> {
  const cartId = await getOrCreateUserCartId(userId);

  await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, item.productId),
        ilike(cartItems.size, item.size.trim()),
        ilike(cartItems.color, item.color.trim())
      )
    );

  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Clears all items in the user's cart.
 */
export async function clearUserCart(userId: string): Promise<void> {
  const cartId = await getOrCreateUserCartId(userId);
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/**
 * Merges anonymous / guest cart items into the user's persistent cart upon login.
 * Transactional, duplicate-safe, and fully idempotent against repeated requests.
 */
export async function mergeAnonymousCart(
  userId: string,
  guestItems: Array<{
    productId: string;
    size: string;
    color: string;
    quantity: number;
  }>
): Promise<CartItem[]> {
  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    return getUserCart(userId);
  }

  // 1. Group / consolidate guest items by key (productId-color-size)
  const consolidatedGuestItems = new Map<
    string,
    { productId: string; size: string; color: string; quantity: number }
  >();

  for (const item of guestItems) {
    if (!item?.productId || !item?.size || !item?.color) continue;
    const cleanQty = Math.max(1, Math.min(Number(item.quantity) || 1, 10));
    const key = `${item.productId.trim()}:${item.color.trim().toLowerCase()}:${item.size.trim().toLowerCase()}`;
    const existing = consolidatedGuestItems.get(key);
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + cleanQty);
    } else {
      consolidatedGuestItems.set(key, {
        productId: item.productId.trim(),
        size: item.size.trim(),
        color: item.color.trim(),
        quantity: cleanQty,
      });
    }
  }

  if (consolidatedGuestItems.size === 0) {
    return getUserCart(userId);
  }

  const cartId = await getOrCreateUserCartId(userId);

  // 2. Perform merge within an atomic database transaction
  await db.transaction(async (tx) => {
    // Fetch all current items in user cart
    const currentItems = await tx
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        size: cartItems.size,
        color: cartItems.color,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));

    const currentMap = new Map<string, { id: string; quantity: number }>();
    for (const c of currentItems) {
      const key = `${c.productId}:${c.color.toLowerCase()}:${c.size.toLowerCase()}`;
      currentMap.set(key, { id: c.id, quantity: c.quantity });
    }

    for (const [, guestItem] of consolidatedGuestItems) {
      // Validate product exists and is published
      const prod = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, guestItem.productId),
            eq(products.isPublished, true)
          )
        )
        .limit(1);

      if (prod.length === 0) continue; // Skip invalid / unpublished product

      // Validate variant exists
      const variant = await tx
        .select({
          id: productVariants.id,
          stockQuantity: productVariants.stockQuantity,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, guestItem.productId),
            ilike(productVariants.size, guestItem.size),
            ilike(productVariants.colorName, guestItem.color)
          )
        )
        .limit(1);

      if (variant.length === 0 || variant[0].stockQuantity <= 0) continue; // Skip out-of-stock / non-existent variant

      const maxPermitted = Math.min(10, variant[0].stockQuantity);
      const key = `${guestItem.productId}:${guestItem.color.toLowerCase()}:${guestItem.size.toLowerCase()}`;
      const existingInCart = currentMap.get(key);

      if (existingInCart) {
        // Idempotent reconciliation: take max of existing and guest quantity, capped at stock & 10
        const mergedQty = Math.min(
          maxPermitted,
          Math.max(existingInCart.quantity, guestItem.quantity)
        );
        await tx
          .update(cartItems)
          .set({ quantity: mergedQty, updatedAt: new Date() })
          .where(eq(cartItems.id, existingInCart.id));
      } else {
        const insertQty = Math.min(maxPermitted, guestItem.quantity);
        await tx.insert(cartItems).values({
          cartId,
          productId: guestItem.productId,
          size: guestItem.size,
          color: guestItem.color,
          quantity: insertQty,
        });
      }
    }

    await tx
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, cartId));
  });

  return getUserCart(userId);
}
