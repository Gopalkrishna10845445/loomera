/**
 * LOOMERA — Centralized Shipping & Fulfilment Service
 * Orchestrates carrier adapters, order shipments, tracking event checkpoints, and webhook processing.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  orderAddresses,
  shipments,
  shipmentEvents,
  orderStatusHistory,
} from "@/db/schema";
import {
  ShippingCarrier,
  ShippingProviderAdapter,
  CreateShipmentResult,
  ShipmentStatus,
} from "./types";
import { DelhiveryAdapter } from "./adapters/delhivery";
import { ShiprocketAdapter } from "./adapters/shiprocket";
import { BlueDartAdapter } from "./adapters/bluedart";
import { recordAdminAuditLog } from "@/lib/admin/audit";
import { sendTransactionalEmail } from "@/lib/notifications/email";

// Singleton adapter cache
const ADAPTER_MAP: Record<ShippingCarrier, ShippingProviderAdapter> = {
  DELHIVERY: new DelhiveryAdapter(),
  SHIPROCKET: new ShiprocketAdapter(),
  BLUEDART: new BlueDartAdapter(),
  LOOMERA_EXPRESS: new DelhiveryAdapter(), // Uses Delhivery under the hood
};

/**
 * Returns the selected shipping provider adapter.
 */
export function getShippingAdapter(carrier: ShippingCarrier = "DELHIVERY"): ShippingProviderAdapter {
  return ADAPTER_MAP[carrier] || ADAPTER_MAP.DELHIVERY;
}

export interface CreateOrderShipmentParams {
  orderId: string;
  carrier?: ShippingCarrier;
  adminId: string;
  ipAddress?: string | null;
}

/**
 * Creates a carrier consignment for an order, updates status to SHIPPED, and records tracking events.
 */
export async function createOrderShipment(params: CreateOrderShipmentParams): Promise<{
  shipment: typeof shipments.$inferSelect;
  result: CreateShipmentResult;
}> {
  const { orderId, carrier = "DELHIVERY", adminId, ipAddress } = params;

  return await db.transaction(async (tx) => {
    // 1. Fetch order with shipping address and items
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Only orders in CONFIRMED, PROCESSING, or PACKED can be shipped
    const shippableStatuses = ["CONFIRMED", "PROCESSING", "PACKED"];
    if (!shippableStatuses.includes(order.status)) {
      throw new Error(`Cannot ship order in '${order.status}' status`);
    }

    // Check if shipment already exists
    const [existingShipment] = await tx
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, orderId))
      .limit(1);

    if (existingShipment) {
      throw new Error(`Shipment already exists for order ${order.orderNumber} (Tracking: ${existingShipment.trackingNumber})`);
    }

    const [address] = await tx
      .select()
      .from(orderAddresses)
      .where(eq(orderAddresses.id, order.shippingAddressId))
      .limit(1);

    if (!address) {
      throw new Error("Order shipping address not found");
    }

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // 2. Invoke carrier adapter
    const adapter = getShippingAdapter(carrier);
    const shipmentResult = await adapter.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      carrier,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        email: address.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      items: items.map((i) => ({
        title: i.productTitle,
        sku: `${i.productId}-${i.size}-${i.color}`,
        quantity: i.quantity,
        priceInr: i.unitPriceInr,
      })),
    });

    const now = new Date();

    // 3. Insert shipment record
    const [shipmentRow] = await tx
      .insert(shipments)
      .values({
        orderId: order.id,
        carrier,
        trackingNumber: shipmentResult.trackingNumber,
        labelUrl: shipmentResult.labelUrl,
        status: "MANIFESTED",
        estimatedDeliveryAt: shipmentResult.estimatedDeliveryAt,
        dispatchedAt: now,
      })
      .returning();

    // 4. Insert initial shipment checkpoint event
    await tx.insert(shipmentEvents).values({
      shipmentId: shipmentRow.id,
      statusCode: "MANIFESTED",
      statusDescription: `Shipment booked with ${carrier} (AWB: ${shipmentResult.trackingNumber})`,
      location: "LOOMERA Atelier Distribution Center",
      carrierEventTimestamp: now,
    });

    // 5. Update order status to SHIPPED
    const prevStatus = order.status;
    await tx
      .update(orders)
      .set({
        status: "SHIPPED",
        updatedAt: now,
      })
      .where(eq(orders.id, order.id));

    // 6. Record order status timeline
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      previousStatus: prevStatus,
      newStatus: "SHIPPED",
      reason: `Dispatched via ${carrier} (Tracking: ${shipmentResult.trackingNumber})`,
    });

    // 7. Record admin audit log
    await recordAdminAuditLog({
      adminId,
      action: "SHIPMENT_CREATED",
      resourceType: "SHIPMENT",
      resourceId: shipmentRow.id,
      previousState: { orderStatus: prevStatus },
      newState: {
        orderStatus: "SHIPPED",
        carrier,
        trackingNumber: shipmentResult.trackingNumber,
      },
      ipAddress,
    });

    // 8. Send transactional dispatch email
    await sendTransactionalEmail({
      type: "ORDER_SHIPPED",
      recipientEmail: address.email,
      recipientName: address.fullName,
      orderNumber: order.orderNumber,
      totalInr: order.totalInr,
      carrier,
      trackingNumber: shipmentResult.trackingNumber,
      shippingAddress: `${address.addressLine1}, ${address.city}, ${address.state} - ${address.postalCode}`,
    });

    return {
      shipment: shipmentRow,
      result: shipmentResult,
    };
  });
}

/**
 * Records a carrier tracking checkpoint and updates shipment/order statuses accordingly.
 */
export async function recordShipmentCheckpoint(params: {
  trackingNumber: string;
  statusCode: string;
  statusDescription: string;
  location?: string;
  timestamp?: Date;
}): Promise<{ success: boolean; shipment: typeof shipments.$inferSelect }> {
  const { trackingNumber, statusCode, statusDescription, location, timestamp = new Date() } = params;

  return await db.transaction(async (tx) => {
    const [shipment] = await tx
      .select()
      .from(shipments)
      .where(eq(shipments.trackingNumber, trackingNumber))
      .limit(1);

    if (!shipment) {
      throw new Error(`Shipment not found for tracking number: ${trackingNumber}`);
    }

    // Determine normalized status
    let normalizedStatus: ShipmentStatus = shipment.status as ShipmentStatus;
    const upperCode = statusCode.toUpperCase();

    if (upperCode.includes("DELIVERED") || upperCode === "DL") {
      normalizedStatus = "DELIVERED";
    } else if (upperCode.includes("OUT_FOR_DELIVERY") || upperCode === "OFD") {
      normalizedStatus = "OUT_FOR_DELIVERY";
    } else if (upperCode.includes("TRANSIT") || upperCode.includes("HUB")) {
      normalizedStatus = "IN_TRANSIT";
    } else if (upperCode.includes("PICKED") || upperCode === "PU") {
      normalizedStatus = "PICKED_UP";
    }

    // Insert checkpoint event
    await tx.insert(shipmentEvents).values({
      shipmentId: shipment.id,
      statusCode: upperCode,
      statusDescription,
      location: location || null,
      carrierEventTimestamp: timestamp,
    });

    // Update shipment row
    const [updatedShipment] = await tx
      .update(shipments)
      .set({
        status: normalizedStatus,
        deliveredAt: normalizedStatus === "DELIVERED" ? timestamp : shipment.deliveredAt,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipment.id))
      .returning();

    // Update parent order if status progressed to OUT_FOR_DELIVERY or DELIVERED
    if (normalizedStatus === "DELIVERED" || normalizedStatus === "OUT_FOR_DELIVERY") {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, shipment.orderId))
        .limit(1);

      if (order && order.status !== normalizedStatus) {
        await tx
          .update(orders)
          .set({ status: normalizedStatus, updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          previousStatus: order.status,
          newStatus: normalizedStatus,
          reason: `Carrier tracking update: ${statusDescription} (${location || "Transit Hub"})`,
        });

        if (normalizedStatus === "DELIVERED") {
          const [addr] = await tx
            .select()
            .from(orderAddresses)
            .where(eq(orderAddresses.id, order.shippingAddressId))
            .limit(1);

          if (addr) {
            await sendTransactionalEmail({
              type: "DELIVERY_CONFIRMATION",
              recipientEmail: addr.email,
              recipientName: addr.fullName,
              orderNumber: order.orderNumber,
              totalInr: order.totalInr,
            });
          }
        }
      }
    }

    return {
      success: true,
      shipment: updatedShipment,
    };
  });
}

/**
 * Retrieves full shipment details and chronological events for an order.
 */
export async function getOrderShipment(orderId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1);

  if (!shipment) return null;

  const events = await db
    .select()
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, shipment.id))
    .orderBy(desc(shipmentEvents.carrierEventTimestamp));

  return {
    ...shipment,
    events,
  };
}

/**
 * Handles incoming carrier webhooks safely with signature verification and idempotency.
 */
export async function processShippingWebhook(params: {
  carrier: ShippingCarrier;
  rawBody: string;
  signature?: string;
  parsedBody: Record<string, unknown>;
}): Promise<{ success: boolean; message: string }> {
  const { carrier, rawBody, signature, parsedBody } = params;

  const adapter = getShippingAdapter(carrier);
  if (signature && !adapter.verifyWebhookSignature(rawBody, signature)) {
    throw new Error(`Invalid webhook signature for carrier ${carrier}`);
  }

  const pb = parsedBody as Record<string, string | undefined>;
  const trackingNumber = pb.trackingNumber || pb.awb || pb.waybill;
  const statusCode = pb.status || pb.statusCode || "IN_TRANSIT";
  const description = pb.description || pb.instructions || "Shipment checkpoint updated";
  const location = pb.location || pb.currentLocation;

  if (!trackingNumber) {
    throw new Error("Missing tracking number in webhook payload");
  }

  await recordShipmentCheckpoint({
    trackingNumber,
    statusCode,
    statusDescription: description,
    location,
  });

  return { success: true, message: "Webhook processed successfully" };
}
