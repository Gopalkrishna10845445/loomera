import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { createProductVariant } from "@/lib/admin/product-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id: productId } = await params;
    const body = await req.json();
    const { sku, size, colorName, colorHex } = body;

    if (!sku || !size || !colorName || !colorHex) {
      return NextResponse.json(
        { error: "Missing required variant fields (sku, size, colorName, colorHex)." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const variant = await createProductVariant(productId, body, auth.user.id, ipAddress);

    return NextResponse.json(
      { variant, message: "Garment variant created successfully." },
      { status: 201 }
    );
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin create variant error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create variant." },
      { status: 400 }
    );
  }
}
