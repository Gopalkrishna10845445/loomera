import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { archiveProduct, unarchiveProduct } from "@/lib/admin/product-service";

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

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "archive"; // "archive" | "unarchive"
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    if (action === "unarchive") {
      const restored = await unarchiveProduct(id, auth.user.id, ipAddress);
      return NextResponse.json({
        message: "Product restored and published successfully.",
        product: restored,
      });
    }

    const archived = await archiveProduct(id, auth.user.id, ipAddress);
    return NextResponse.json({
      message: "Product soft-archived successfully.",
      product: archived,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin archive product error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to alter product archive status." },
      { status: 400 }
    );
  }
}
