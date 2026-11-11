import { NextRequest, NextResponse } from "next/server";
import { validateCartOnServer } from "@/lib/products";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = body.items;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must include an 'items' array",
        },
        { status: 400 }
      );
    }

    const result = await validateCartOnServer(items);

    return NextResponse.json({
      success: true,
      data: result,
      ...result,
    });
  } catch (error) {
    console.error("Cart validation API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error validating cart",
      },
      { status: 500 }
    );
  }
}
