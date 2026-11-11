import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { updateProductVariant, deleteProductVariantSafely } from "@/lib/admin/product-service";

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

    const { id: variantId } = await params;
    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const updated = await updateProductVariant(variantId, body, auth.user.id, ipAddress);

    return NextResponse.json({
      variant: updated,
      message: "Variant updated successfully.",
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update variant error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update variant." },
      { status: 400 }
    );
  }
}

export async function DELETE(
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

    const { id: variantId } = await params;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    await deleteProductVariantSafely(variantId, auth.user.id, ipAddress);

    return NextResponse.json({ message: "Variant deleted successfully." });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin delete variant error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete variant." },
      { status: 400 }
    );
  }
}
