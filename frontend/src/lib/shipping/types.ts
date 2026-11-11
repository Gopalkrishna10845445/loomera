/**
 * LOOMERA — Shipping & Logistics Architecture Types
 * Defines carrier abstractions, tracking checkpoints, and adapter interfaces.
 */

export type ShippingCarrier = "DELHIVERY" | "SHIPROCKET" | "BLUEDART" | "LOOMERA_EXPRESS";

export type ShipmentStatus =
  | "MANIFESTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "RTO"
  | "CANCELLED";

export interface ShipmentAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShipmentItemDetail {
  title: string;
  sku: string;
  quantity: number;
  priceInr: number;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  carrier: ShippingCarrier;
  shippingAddress: ShipmentAddress;
  items: ShipmentItemDetail[];
  totalWeightGrams?: number;
}

export interface CreateShipmentResult {
  success: boolean;
  trackingNumber: string;
  carrier: ShippingCarrier;
  labelUrl: string;
  estimatedDeliveryAt: Date;
  rawResponse?: Record<string, unknown>;
}

export interface TrackingCheckpoint {
  statusCode: string;
  statusDescription: string;
  location?: string;
  timestamp: Date;
}

export interface TrackingResult {
  trackingNumber: string;
  carrier: ShippingCarrier;
  status: ShipmentStatus;
  checkpoints: TrackingCheckpoint[];
  estimatedDeliveryAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface CreateReturnShipmentInput {
  orderId: string;
  orderNumber: string;
  returnNumber: string;
  pickupAddress: ShipmentAddress;
  items: ShipmentItemDetail[];
  carrier?: ShippingCarrier;
}

export interface ShippingProviderAdapter {
  readonly carrier: ShippingCarrier;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getTrackingStatus(trackingNumber: string): Promise<TrackingResult>;
  cancelShipment(trackingNumber: string, reason?: string): Promise<{ success: boolean; message: string }>;
  createReturnShipment(input: CreateReturnShipmentInput): Promise<CreateShipmentResult>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
