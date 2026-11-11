import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { getLowStockThreshold, updateInventorySetting } from "@/lib/admin/inventory-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const threshold = await getLowStockThreshold();
    return NextResponse.json({ lowStockThreshold: threshold });
  } catch (error) {
    console.error("Admin get inventory settings error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve inventory settings." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!isRequestOriginValid(req)) {
      return NextResponse.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
    }

    const auth = await requireAdmin(req);
    if (!auth.authorized) {
      return rbacErrorResponse(auth);
    }

    const body = await req.json();
    const { lowStockThreshold } = body;

    if (typeof lowStockThreshold !== "number" || lowStockThreshold < 0) {
      return NextResponse.json(
        { error: "lowStockThreshold must be a non-negative number." },
        { status: 400 }
      );
    }

    await updateInventorySetting("low_stock_threshold", String(lowStockThreshold), auth.user.id);

    return NextResponse.json({
      message: "Inventory settings updated successfully.",
      lowStockThreshold,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update inventory settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update inventory settings." },
      { status: 400 }
    );
  }
}
