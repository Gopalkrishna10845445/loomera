/**
 * LOOMERA — Blue Dart Express Logistics Adapter
 * Sandbox & Mock Provider for Blue Dart Apex/Surfaceline API.
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

export class BlueDartAdapter implements ShippingProviderAdapter {
  readonly carrier: ShippingCarrier = "BLUEDART";
  private webhookSecret: string;

  constructor(webhookSecret = process.env.BLUEDART_WEBHOOK_SECRET || "bluedart_mock_secret_key_loomera") {
    this.webhookSecret = webhookSecret;
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const randomSuffix = Math.floor(10000000000 + Math.random() * 90000000000);
    const trackingNumber = `BD-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 2); // Blue Dart Express is faster (2 days)

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/bluedart/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        waybill_number: trackingNumber,
        service_type: "Domestic Priority Air",
        destination_hub: input.shippingAddress?.city ? input.shippingAddress.city.toUpperCase() : "MUMBAI",
      },
    };
  }

  async getTrackingStatus(trackingNumber: string): Promise<TrackingResult> {
    const now = new Date();
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 1);

    return {
      trackingNumber,
      carrier: this.carrier,
      status: "IN_TRANSIT",
      estimatedDeliveryAt: estDate,
      checkpoints: [
        {
          statusCode: "BOOKED",
          statusDescription: "Consignment picked up from LOOMERA Atelier",
          location: "Jaipur Express Center",
          timestamp: new Date(now.getTime() - 36000000),
        },
      ],
    };
  }

  async cancelShipment(trackingNumber: string, reason = "Cancelled by atelier"): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Blue Dart shipment ${trackingNumber} cancelled. Reason: ${reason}`,
    };
  }

  async createReturnShipment(_input: CreateReturnShipmentInput): Promise<CreateShipmentResult> {
    void _input;
    const randomSuffix = Math.floor(10000000000 + Math.random() * 90000000000);
    const trackingNumber = `BD-RET-${randomSuffix}`;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    return {
      success: true,
      trackingNumber,
      carrier: this.carrier,
      labelUrl: `https://track.loomera.com/labels/bluedart-reverse/${trackingNumber}.pdf`,
      estimatedDeliveryAt: estDate,
      rawResponse: {
        return_waybill: trackingNumber,
        service_type: "Blue Dart Reverse Pick",
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
