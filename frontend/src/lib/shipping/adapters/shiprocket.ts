/**
 * LOOMERA — Shiprocket Multi-Carrier Shipping Adapter
 * Sandbox & Mock Provider for Shiprocket Aggregator API.
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

export class ShiprocketAdapter implements ShippingProviderAdapter {
  readonly carrier: ShippingCarrier = "SHIPROCKET";
  private webhookSecret: string;

  constructor(webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET || "shiprocket_mock_secret_key_loomera") {
    this.webhookSecret = webhookSecret;
  }

  async createShipment(_input: CreateShipmentInput): Promise<CreateShipmentResult> {
    void _input;
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `SR-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/shiprocket/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        awb_code: trackingNumber,
        courier_name: "Shiprocket Surface High-Value",
        assigned_courier_id: 14,
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
          statusCode: "ORDER_CREATED",
          statusDescription: "Consignment booked via Shiprocket",
          location: "Jaipur Central Atelier",
          timestamp: new Date(now.getTime() - 48000000),
        },
      ],
    };
  }

  async cancelShipment(trackingNumber: string, reason = "Cancelled by atelier"): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Shiprocket order ${trackingNumber} cancelled successfully. Reason: ${reason}`,
    };
  }

  async createReturnShipment(_input: CreateReturnShipmentInput): Promise<CreateShipmentResult> {
    void _input;
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const trackingNumber = `SR-RET-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 4);

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/shiprocket-reverse/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        return_awb_code: trackingNumber,
        reverse_courier: "Shiprocket Return Express",
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
