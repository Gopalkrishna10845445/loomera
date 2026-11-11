import { NextRequest, NextResponse } from "next/server";
import { getProductsFromDb, GetProductsOptions } from "@/lib/products";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category")?.toLowerCase() || undefined;
    const search = searchParams.get("search") || undefined;
    const sortParam = searchParams.get("sort")?.toLowerCase() || undefined;
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const limitParam = searchParams.get("limit");

    const options: GetProductsOptions = {};

    if (category) {
      options.category = category;
      if (category === "new-arrivals" && !sortParam) {
        options.sort = "newest";
      }
    }
    if (search) options.search = search;

    if (
      sortParam &&
      ["featured", "newest", "price-asc", "price-desc", "name-asc"].includes(
        sortParam
      )
    ) {
      options.sort = sortParam as GetProductsOptions["sort"];
    }

    if (minPriceParam && !isNaN(Number(minPriceParam))) {
      options.minPrice = Math.max(0, parseInt(minPriceParam, 10));
    }

    if (maxPriceParam && !isNaN(Number(maxPriceParam))) {
      options.maxPrice = Math.max(0, parseInt(maxPriceParam, 10));
    }

    if (limitParam && !isNaN(Number(limitParam))) {
      options.limit = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
    }

    const data = await getProductsFromDb(options);

    return NextResponse.json(
      {
        success: true,
        count: data.length,
        total: data.length,
        products: data,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("API /api/products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error retrieving products catalog",
      },
      { status: 500 }
    );
  }
}
