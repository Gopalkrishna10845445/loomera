import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getAdminProducts, createAdminProduct } from "@/lib/admin/product-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categorySlug = searchParams.get("category") || undefined;
    const isPublishedParam = searchParams.get("published");
    const isArchivedParam = searchParams.get("archived");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const isPublished =
      isPublishedParam === "true" ? true : isPublishedParam === "false" ? false : undefined;
    const isArchived =
      isArchivedParam === "true" ? true : isArchivedParam === "false" ? false : undefined;

    const result = await getAdminProducts({
      search,
      categorySlug,
      isPublished,
      isArchived,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin get products error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve products." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const { slug, title, description, basePriceInr, categorySlug } = body;

    if (!slug || !title || !description || !basePriceInr || !categorySlug) {
      return NextResponse.json(
        { error: "Missing required product fields (slug, title, description, basePriceInr, categorySlug)." },
        { status: 400 }
      );
    }

    if (basePriceInr <= 0) {
      return NextResponse.json(
        { error: "Base price must be greater than zero." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const newProduct = await createAdminProduct(body, auth.user.id, ipAddress);

    return NextResponse.json(
      { product: newProduct, message: "Garment product created successfully." },
      { status: 201 }
    );
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin create product error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create garment product." },
      { status: 400 }
    );
  }
}
