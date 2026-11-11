/**
 * LOOMERA — Razorpay Payment Gateway Integration Service
 * Compliant with Razorpay API specifications (amount in paise, HMAC SHA-256 signatures).
 * Supports official Razorpay REST calls and deterministic sandbox testing.
 */

import crypto from "crypto";

export interface CreateRazorpayOrderParams {
  amountInr: number;
  orderNumber: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  entity: "order";
  amount: number; // in paise (INR * 100)
  amount_paid: number;
  amount_due: number;
  currency: "INR";
  receipt: string;
  status: "created" | "attempted" | "paid";
  created_at: number;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}

export interface VerifyWebhookParams {
  rawBody: string;
  signature: string;
  secret?: string;
}

/**
 * Returns configured Razorpay credentials from environment variables.
 */
export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_loomera_sandbox";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "loomera_sandbox_secret_key_12345";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "loomera_webhook_secret_key_12345";
  const isSandbox = !process.env.RAZORPAY_KEY_ID || keyId.startsWith("rzp_test_");

  return {
    keyId,
    keySecret,
    webhookSecret,
    isSandbox,
  };
}

/**
 * Creates a payment order with Razorpay.
 * Amount is converted from INR to paise (1 INR = 100 paise).
 */
export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams
): Promise<RazorpayOrderResult> {
  const { amountInr, orderNumber, notes = {} } = params;
  const config = getRazorpayConfig();
  const amountPaise = Math.round(amountInr * 100);

  // If live credentials are provided and not local sandbox mock, call Razorpay REST endpoint
  if (
    process.env.RAZORPAY_KEY_ID &&
    !process.env.RAZORPAY_KEY_ID.includes("sandbox") &&
    process.env.RAZORPAY_KEY_SECRET
  ) {
    const authHeader = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: orderNumber,
        notes: {
          platform: "LOOMERA Atelier",
          ...notes,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Razorpay Order Creation Failed: ${err}`);
    }

    return (await response.json()) as RazorpayOrderResult;
  }

  // Deterministic Local Sandbox Mock Order Generation
  const sandboxOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    id: sandboxOrderId,
    entity: "order",
    amount: amountPaise,
    amount_paid: 0,
    amount_due: amountPaise,
    currency: "INR",
    receipt: orderNumber,
    status: "created",
    created_at: Math.floor(Date.now() / 1000),
  };
}

/**
 * Computes Razorpay checkout payment signature:
 * HMAC-SHA256(order_id + "|" + payment_id, secret)
 */
export function computePaymentSignature(orderId: string, paymentId: string, secret?: string): string {
  const keySecret = secret || getRazorpayConfig().keySecret;
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
}

/**
 * Verifies Razorpay payment signature from client checkout callback.
 * Uses timing-safe string comparison to prevent timing side-channel attacks.
 */
export function verifyPaymentSignature(params: VerifyPaymentParams): boolean {
  const { orderId, paymentId, signature, secret } = params;
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expectedSignature = computePaymentSignature(orderId, paymentId, secret);

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const providedBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * Computes Razorpay webhook signature:
 * HMAC-SHA256(raw_body, webhook_secret)
 */
export function computeWebhookSignature(rawBody: string, secret?: string): string {
  const keySecret = secret || getRazorpayConfig().webhookSecret;
  return crypto.createHmac("sha256", keySecret).update(rawBody).digest("hex");
}

/**
 * Verifies Razorpay webhook signature against the raw HTTP request body.
 */
export function verifyWebhookSignature(params: VerifyWebhookParams): boolean {
  const { rawBody, signature, secret } = params;
  if (!rawBody || !signature) {
    return false;
  }

  const expectedSignature = computeWebhookSignature(rawBody, secret);

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const providedBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}
