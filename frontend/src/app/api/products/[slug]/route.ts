import { NextRequest, NextResponse } from "next/server";
import { getProductBySlugFromDb } from "@/lib/products";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Invalid product identifier" },
        { status: 400 }
      );
    }

    const product = await getProductBySlugFromDb(slug.trim());

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product '${slug}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        product,
        data: product,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("API /api/products/[slug] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error retrieving product details" },
      { status: 500 }
    );
  }
}
