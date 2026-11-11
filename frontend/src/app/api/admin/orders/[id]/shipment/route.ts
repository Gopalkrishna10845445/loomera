import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rbacErrorResponse } from "@/lib/auth/rbac";
import { isRequestOriginValid } from "@/lib/auth/csrf";
import { createOrderShipment, getOrderShipment } from "@/lib/shipping/shipping-service";
import { ShippingCarrier } from "@/lib/shipping/types";

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
    const shipment = await getOrderShipment(id);

    return NextResponse.json({ shipment });
  } catch (error) {
    console.error("Admin get shipment error:", error);
    return NextResponse.json({ error: "Failed to retrieve shipment details." }, { status: 500 });
  }
}

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
    const body = await req.json();
    const { carrier = "DELHIVERY" } = body || {};

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const result = await createOrderShipment({
      orderId: id,
      carrier: carrier as ShippingCarrier,
      adminId: auth.user.id,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      shipment: result.shipment,
      trackingNumber: result.result.trackingNumber,
      labelUrl: result.result.labelUrl,
      estimatedDeliveryAt: result.result.estimatedDeliveryAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create shipment";
    console.error("Admin create shipment error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
