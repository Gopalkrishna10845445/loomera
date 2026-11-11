import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getAdminProductById,
  updateAdminProduct,
  deleteProductSafely,
  archiveProduct,
} from "@/lib/admin/product-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const { id } = await params;
    const product = await getAdminProductById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Admin get product error:", error);
    return NextResponse.json({ error: "Failed to retrieve product." }, { status: 500 });
  }
}

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

    const { id } = await params;
    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const updated = await updateAdminProduct(id, body, auth.user.id, ipAddress);

    return NextResponse.json({
      product: updated,
      message: "Garment product updated successfully.",
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update product error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update product." },
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

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const forceArchive = searchParams.get("archive") === "true";
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    if (forceArchive) {
      const archived = await archiveProduct(id, auth.user.id, ipAddress);
      return NextResponse.json({
        message: "Product soft-archived successfully.",
        product: archived,
      });
    }

    try {
      await deleteProductSafely(id, auth.user.id, ipAddress);
      return NextResponse.json({ message: "Product deleted successfully." });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // If product has order records, fallback to soft archiving automatically
      if (err?.message?.includes("existing customer order records")) {
        const archived = await archiveProduct(id, auth.user.id, ipAddress);
        return NextResponse.json({
          message:
            "Product has existing customer orders and cannot be hard-deleted. It has been soft-archived instead.",
          product: archived,
          archived: true,
        });
      }
      throw err;
    }
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin delete product error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete product." },
      { status: 400 }
    );
  }
}
