import { db } from "@/db";
import {
  productViewHistory,
  searchHistory,
  products,
  productImages,
  productVariants,
  categories,
} from "@/db/schema";
import { eq, and, desc, gte, lte, sql, inArray, ilike } from "drizzle-orm";
import { AssistantProduct } from "./ai/types";
import { mapDbToAssistantProduct } from "./ai/tools";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, ANONYMOUS_COOKIE_NAME } from "./auth/constants";
import { validateSession } from "./auth/session";
import crypto from "crypto";

export async function getCallerIdentity(req: NextRequest): Promise<{
  userId: string | null;
  sessionId: string;
  isNewSession: boolean;
}> {
  // Check authenticated session
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const auth = await validateSession(token);
    if (auth && auth.user) {
      return {
        userId: auth.user.id,
        sessionId: "",
        isNewSession: false,
      };
    }
  }

  // Anonymous identity
  const existingAnon =
    req.cookies.get(ANONYMOUS_COOKIE_NAME)?.value ||
    req.headers.get("x-anonymous-id");

  if (existingAnon && existingAnon.length >= 10) {
    return {
      userId: null,
      sessionId: existingAnon,
      isNewSession: false,
    };
  }

  // Generate new anonymous ID
  const newAnon = crypto.randomUUID();
  return {
    userId: null,
    sessionId: newAnon,
    isNewSession: true,
  };
}

export function attachAnonymousCookieIfNeeded(
  res: NextResponse,
  sessionId: string,
  isNewSession: boolean
): NextResponse {
  if (isNewSession && sessionId) {
    res.cookies.set(ANONYMOUS_COOKIE_NAME, sessionId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
  return res;
}

export interface RecordViewParams {
  productId: string;
  userId?: string | null;
  sessionId?: string | null;
}

export interface GetHistoryOptions {
  userId?: string | null;
  sessionId?: string | null;
  dateFilter?: "today" | "yesterday" | "last_7_days" | "all";
  limit?: number;
}

export interface ViewedProductItem {
  id: string; // history record id
  viewedAt: Date;
  product: AssistantProduct;
}

export interface SearchHistoryItem {
  id: string;
  searchQuery: string;
  filters: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Computes boundary timestamps for date filters.
 */
function getDateFilterBounds(dateFilter?: "today" | "yesterday" | "last_7_days" | "all"): {
  start?: Date;
  end?: Date;
} {
  const now = new Date();
  if (dateFilter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { start, end: now };
  }
  if (dateFilter === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { start, end };
  }
  if (dateFilter === "last_7_days") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end: now };
  }
  return {};
}

/**
 * 1. recordProductView
 * Records a customer's product view. Upserts recent timestamp on duplicate view.
 */
export async function recordProductView(params: RecordViewParams): Promise<boolean> {
  const { productId, userId, sessionId } = params;
  if (!productId || (!userId && !sessionId)) {
    return false;
  }

  // Verify product exists and is published
  const prodRows = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.isPublished, true)))
    .limit(1);

  if (prodRows.length === 0) {
    return false; // Never record views for unpublished or non-existent products
  }

  const now = new Date();

  if (userId) {
    // Authenticated user: check existing record
    const existing = await db
      .select({ id: productViewHistory.id })
      .from(productViewHistory)
      .where(
        and(
          eq(productViewHistory.userId, userId),
          eq(productViewHistory.productId, productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(productViewHistory)
        .set({ viewedAt: now })
        .where(eq(productViewHistory.id, existing[0].id));
      return true;
    }

    await db.insert(productViewHistory).values({
      userId,
      productId,
      viewedAt: now,
    });
    return true;
  }

  if (sessionId) {
    // Anonymous session
    const existing = await db
      .select({ id: productViewHistory.id })
      .from(productViewHistory)
      .where(
        and(
          sql`${productViewHistory.userId} IS NULL`,
          eq(productViewHistory.sessionId, sessionId),
          eq(productViewHistory.productId, productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(productViewHistory)
        .set({ viewedAt: now })
        .where(eq(productViewHistory.id, existing[0].id));
      return true;
    }

    await db.insert(productViewHistory).values({
      sessionId,
      productId,
      viewedAt: now,
    });
    return true;
  }

  return false;
}

/**
 * 2. getProductViewHistory
 * Retrieves chronological product view history for a user or session.
 */
export async function getProductViewHistory(
  options: GetHistoryOptions
): Promise<ViewedProductItem[]> {
  const { userId, sessionId, dateFilter = "all", limit = 5 } = options;
  if (!userId && !sessionId) {
    return [];
  }

  const conditions = [];

  if (userId) {
    conditions.push(eq(productViewHistory.userId, userId));
  } else if (sessionId) {
    conditions.push(
      and(
        sql`${productViewHistory.userId} IS NULL`,
        eq(productViewHistory.sessionId, sessionId)
      )
    );
  }

  // Date filtering
  const { start, end } = getDateFilterBounds(dateFilter);
  if (start) conditions.push(gte(productViewHistory.viewedAt, start));
  if (end) conditions.push(lte(productViewHistory.viewedAt, end));

  const safeLimit = Math.min(Math.max(1, limit), 20);

  // Fetch view history joined with products (excluding unpublished products)
  const historyRows = await db
    .select({
      historyId: productViewHistory.id,
      viewedAt: productViewHistory.viewedAt,
      product: products,
      categoryName: categories.name,
    })
    .from(productViewHistory)
    .innerJoin(products, eq(productViewHistory.productId, products.id))
    .leftJoin(categories, eq(products.categorySlug, categories.slug))
    .where(and(...conditions, eq(products.isPublished, true)))
    .orderBy(desc(productViewHistory.viewedAt))
    .limit(safeLimit);

  if (historyRows.length === 0) return [];

  const productIds = historyRows.map((r) => r.product.id);

  // Batch fetch variants and images
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

  return historyRows.map((row) => ({
    id: row.historyId,
    viewedAt: row.viewedAt,
    product: mapDbToAssistantProduct(
      row.product,
      variantsByProd.get(row.product.id) || [],
      imagesByProd.get(row.product.id) || [],
      row.categoryName || undefined
    ),
  }));
}

/**
 * 3. clearProductViewHistory
 * Allows customers to clear their personal viewing history.
 */
export async function clearProductViewHistory(params: {
  userId?: string | null;
  sessionId?: string | null;
}): Promise<boolean> {
  const { userId, sessionId } = params;
  if (!userId && !sessionId) return false;

  if (userId) {
    await db
      .delete(productViewHistory)
      .where(eq(productViewHistory.userId, userId));
    return true;
  }

  if (sessionId) {
    await db
      .delete(productViewHistory)
      .where(
        and(
          sql`${productViewHistory.userId} IS NULL`,
          eq(productViewHistory.sessionId, sessionId)
        )
      );
    return true;
  }

  return false;
}

/**
 * 4. recordSearchQuery
 * Stores a normalized search query and validated filters.
 */
export async function recordSearchQuery(params: {
  query: string;
  filters?: Record<string, unknown>;
  userId?: string | null;
  sessionId?: string | null;
}): Promise<boolean> {
  const { query, filters, userId, sessionId } = params;
  const cleanQuery = (query || "").trim();
  if (!cleanQuery || (!userId && !sessionId)) {
    return false;
  }

  let filtersJson: string | null = null;
  if (filters && typeof filters === "object") {
    try {
      filtersJson = JSON.stringify(filters);
    } catch {
      filtersJson = null;
    }
  }

  await db.insert(searchHistory).values({
    userId: userId || null,
    sessionId: userId ? null : sessionId || null,
    searchQuery: cleanQuery.slice(0, 200),
    filtersJson,
  });

  return true;
}

/**
 * 5. getCustomerSearchHistory
 * Retrieves previous searches for a customer with optional keyword and date filters.
 */
export async function getCustomerSearchHistory(params: {
  userId?: string | null;
  sessionId?: string | null;
  dateFilter?: "today" | "yesterday" | "last_7_days" | "all";
  queryFilter?: string;
  limit?: number;
}): Promise<SearchHistoryItem[]> {
  const { userId, sessionId, dateFilter = "all", queryFilter, limit = 5 } = params;
  if (!userId && !sessionId) {
    return [];
  }

  const conditions = [];

  if (userId) {
    conditions.push(eq(searchHistory.userId, userId));
  } else if (sessionId) {
    conditions.push(
      and(sql`${searchHistory.userId} IS NULL`, eq(searchHistory.sessionId, sessionId))
    );
  }

  if (queryFilter && queryFilter.trim()) {
    conditions.push(ilike(searchHistory.searchQuery, `%${queryFilter.trim()}%`));
  }

  const { start, end } = getDateFilterBounds(dateFilter);
  if (start) conditions.push(gte(searchHistory.createdAt, start));
  if (end) conditions.push(lte(searchHistory.createdAt, end));

  const safeLimit = Math.min(Math.max(1, limit), 20);

  const rows = await db
    .select()
    .from(searchHistory)
    .where(and(...conditions))
    .orderBy(desc(searchHistory.createdAt))
    .limit(safeLimit);

  return rows.map((r) => {
    let parsedFilters: Record<string, unknown> = {};
    if (r.filtersJson) {
      try {
        parsedFilters = JSON.parse(r.filtersJson);
      } catch {
        parsedFilters = {};
      }
    }
    return {
      id: r.id,
      searchQuery: r.searchQuery,
      filters: parsedFilters,
      createdAt: r.createdAt,
    };
  });
}

/**
 * 6. clearCustomerSearchHistory
 * Clears search history for the designated customer or session.
 */
export async function clearCustomerSearchHistory(params: {
  userId?: string | null;
  sessionId?: string | null;
}): Promise<boolean> {
  const { userId, sessionId } = params;
  if (!userId && !sessionId) return false;

  if (userId) {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
    return true;
  }

  if (sessionId) {
    await db
      .delete(searchHistory)
      .where(
        and(sql`${searchHistory.userId} IS NULL`, eq(searchHistory.sessionId, sessionId))
      );
    return true;
  }

  return false;
}
