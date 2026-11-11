import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { db } from "@/db";
import { paymentEvents, payments, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { commitOrderReservations, releaseOrderReservations } from "@/lib/inventory/reservation";

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body text for cryptographic verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    // 2. Verify HMAC SHA-256 webhook signature
    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    // 3. Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const eventType = payload.event;

    // 4. Idempotency Check: Prevent duplicate webhook deliveries
    const [existingEvent] = await db
      .select({ id: paymentEvents.id })
      .from(paymentEvents)
      .where(eq(paymentEvents.eventId, eventId))
      .limit(1);

    if (existingEvent) {
      return NextResponse.json({ success: true, message: "Event already processed" });
    }

    // Record webhook event in audit log
    await db.insert(paymentEvents).values({
      eventId,
      eventType: eventType || "unknown",
      gateway: "RAZORPAY",
      payload: rawBody,
    });

    // 5. Handle relevant event types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const [paymentRow] = await db
          .select({ orderId: payments.orderId, status: payments.status, id: payments.id })
          .from(payments)
          .where(eq(payments.gatewayOrderId, razorpayOrderId))
          .limit(1);

        if (paymentRow && paymentRow.status !== "PAID") {
          await db.transaction(async (tx) => {
            await tx
              .update(payments)
              .set({
                gatewayPaymentId: paymentId || null,
                status: "PAID",
                updatedAt: new Date(),
              })
              .where(eq(payments.id, paymentRow.id));

            await tx
              .update(orders)
              .set({
                status: "CONFIRMED",
                updatedAt: new Date(),
              })
              .where(eq(orders.id, paymentRow.orderId));

            await commitOrderReservations(paymentRow.orderId);
          });
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        const [paymentRow] = await db
          .select({ orderId: payments.orderId, id: payments.id })
          .from(payments)
          .where(eq(payments.gatewayOrderId, razorpayOrderId))
          .limit(1);

        if (paymentRow) {
          await db
            .update(payments)
            .set({
              status: "FAILED",
              errorCode: paymentEntity?.error_code || "PAYMENT_FAILED",
              errorDescription: paymentEntity?.error_description || "Payment failed via gateway",
              updatedAt: new Date(),
            })
            .where(eq(payments.id, paymentRow.id));

          await releaseOrderReservations(paymentRow.orderId);
        }
      }
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error("POST /api/webhooks/razorpay error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
