/**
 * LOOMERA — Delhivery Express Logistics Adapter
 * Sandbox & Mock Provider for Delhivery Surface & Air API.
 */

import crypto from "crypto";
import {
  ShippingProviderAdapter,
  ShippingCarrier,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingResult,
  CreateReturnShipmentInput,
} from "../types";

export class DelhiveryAdapter implements ShippingProviderAdapter {
  readonly carrier: ShippingCarrier = "DELHIVERY";
  private webhookSecret: string;

  constructor(webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET || "delhivery_mock_secret_key_loomera") {
    this.webhookSecret = webhookSecret;
  }

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void _input;
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
    const trackingNumber = `DELH-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 4);

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/delhivery/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        waybill: trackingNumber,
        status: "Manifested",
        cod_amount: 0,
        pickup_location: "LOOMERA Central Atelier, Jaipur, Rajasthan",
      },
    };
  }

  async getTrackingStatus(trackingNumber: string): Promise<TrackingResult> {
    const now = new Date();
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 2);

    return {
      trackingNumber,
      carrier: this.carrier,
      status: "IN_TRANSIT",
      estimatedDeliveryAt: estDate,
      checkpoints: [
        {
          statusCode: "MANIFESTED",
          statusDescription: "Shipment documentation created at LOOMERA Atelier",
          location: "Jaipur Sorting Facility, Rajasthan",
          timestamp: new Date(now.getTime() - 86400000),
        },
        {
          statusCode: "IN_TRANSIT",
          statusDescription: "Arrived at National Logistics Hub",
          location: "Delhi Air Cargo Hub",
          timestamp: now,
        },
      ],
    };
  }

  async cancelShipment(trackingNumber: string, reason = "Cancelled by atelier"): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Delhivery shipment ${trackingNumber} successfully cancelled. Reason: ${reason}`,
    };
  }

  async createReturnShipment(input: CreateReturnShipmentInput): Promise<CreateShipmentResult> {
    const randomSuffix = Math.floor(100000000 + Math.random() * 900000000);
    const trackingNumber = `DELH-RET-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 5);

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/delhivery-reverse/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        return_waybill: trackingNumber,
        reverse_pickup: true,
        pickup_address: input.pickupAddress.city,
      },
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature || !rawBody) return false;
    try {
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest("hex");
      return crypto.timingSafeEqual(Buffer.from(signature, "utf-8"), Buffer.from(expectedSignature, "utf-8"));
    } catch {
      return false;
    }
  }
}
