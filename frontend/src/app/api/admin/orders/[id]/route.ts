import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import {
  getAdminOrderById,
  updateAdminOrderStatus,
  OrderStatus,
} from "@/lib/admin/order-admin-service";

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
    const order = await getAdminOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Admin get order details error:", error);
    return NextResponse.json({ error: "Failed to retrieve order." }, { status: 500 });
  }
}

export async function PATCH(
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
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: "New status is required." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const result = await updateAdminOrderStatus({
      orderId: id,
      newStatus: status as OrderStatus,
      reason,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({
      ...result,
      message: `Order status successfully transitioned to ${status}.`,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("Admin update order status error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update order status." },
      { status: 400 }
    );
  }
}
