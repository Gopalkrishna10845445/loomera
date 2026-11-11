import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { replaceProductImages } from "@/lib/admin/product-service";

export async function PUT(
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
    const { images } = body;

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: "Images array is required." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const updatedImages = await replaceProductImages(productId, images, auth.user.id, ipAddress);

    return NextResponse.json({
      images: updatedImages,
      message: "Product photography updated successfully.",
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update images error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update product images." },
      { status: 400 }
    );
  }
}
