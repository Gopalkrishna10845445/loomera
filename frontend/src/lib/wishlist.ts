import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { wishlists, wishlistItems, products } from "@/db/schema";

/**
 * Retrieves the wishlist ID for a user, or creates one if it does not yet exist.
 */
export async function getOrCreateUserWishlistId(userId: string): Promise<string> {
  const existing = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [created] = await db
    .insert(wishlists)
    .values({ userId })
    .returning({ id: wishlists.id });

  return created.id;
}

/**
 * Resolves a product by either its unique string ID or its title.
 */
async function resolveProductId(identifier: string): Promise<string | null> {
  if (!identifier || typeof identifier !== "string") return null;

  const found = await db
    .select({ id: products.id })
    .from(products)
    .where(
      or(
        eq(products.id, identifier.trim()),
        ilike(products.title, identifier.trim())
      )
    )
    .limit(1);

  return found.length > 0 ? found[0].id : null;
}

/**
 * Fetches all wishlist items for an authenticated user, returning their product titles.
 */
export async function getUserWishlist(userId: string): Promise<string[]> {
  const wishlistId = await getOrCreateUserWishlistId(userId);

  const rows = await db
    .select({
      title: products.title,
    })
    .from(wishlistItems)
    .innerJoin(products, eq(wishlistItems.productId, products.id))
    .where(eq(wishlistItems.wishlistId, wishlistId));

  return rows.map((r) => r.title);
}

/**
 * Adds a product to the user's wishlist (by id or title).
 * Idempotent. Returns updated array of wishlist titles.
 */
export async function addToUserWishlist(
  userId: string,
  identifier: string
): Promise<string[]> {
  const productId = await resolveProductId(identifier);
  if (!productId) {
    return getUserWishlist(userId);
  }

  const wishlistId = await getOrCreateUserWishlistId(userId);

  // Check if already in wishlist
  const existing = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.wishlistId, wishlistId),
        eq(wishlistItems.productId, productId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    try {
      await db.insert(wishlistItems).values({
        wishlistId,
        productId,
      });
    } catch {
      // In case of concurrent insert colliding with unique index
    }
  }

  return getUserWishlist(userId);
}

/**
 * Removes a product from the user's wishlist (by id or title).
 * Returns updated array of wishlist titles.
 */
export async function removeFromUserWishlist(
  userId: string,
  identifier: string
): Promise<string[]> {
  const productId = await resolveProductId(identifier);
  if (!productId) {
    return getUserWishlist(userId);
  }

  const wishlistId = await getOrCreateUserWishlistId(userId);

  await db
    .delete(wishlistItems)
    .where(
      and(
        eq(wishlistItems.wishlistId, wishlistId),
        eq(wishlistItems.productId, productId)
      )
    );

  return getUserWishlist(userId);
}

/**
 * Merges anonymous / guest wishlist items into user's persistent wishlist upon login.
 * Idempotent and duplicate-safe. Returns updated array of wishlist titles.
 */
export async function mergeAnonymousWishlist(
  userId: string,
  guestIdentifiers: string[]
): Promise<string[]> {
  if (!Array.isArray(guestIdentifiers) || guestIdentifiers.length === 0) {
    return getUserWishlist(userId);
  }

  const wishlistId = await getOrCreateUserWishlistId(userId);

  // Resolve unique valid product IDs for guest items
  const uniqueIdentifiers = Array.from(new Set(guestIdentifiers.filter(Boolean)));

  await db.transaction(async (tx) => {
    for (const identifier of uniqueIdentifiers) {
      const found = await tx
        .select({ id: products.id })
        .from(products)
        .where(
          or(
            eq(products.id, identifier.trim()),
            ilike(products.title, identifier.trim())
          )
        )
        .limit(1);

      if (found.length === 0) continue;
      const productId = found[0].id;

      const existing = await tx
        .select({ id: wishlistItems.id })
        .from(wishlistItems)
        .where(
          and(
            eq(wishlistItems.wishlistId, wishlistId),
            eq(wishlistItems.productId, productId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        try {
          await tx.insert(wishlistItems).values({
            wishlistId,
            productId,
          });
        } catch {
          // Handle race condition gracefully
        }
      }
    }
  });

  return getUserWishlist(userId);
}
