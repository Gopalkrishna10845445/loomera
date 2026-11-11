/**
 * LOOMERA AUTOMATED TEST SUITE: PHASE 4
 * Checkout, Secure Payments, Inventory Consistency, and Order Lifecycle Management
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { NextRequest } from "next/server";
import { db, pool } from "../src/db";
import { users, products, productVariants, orders, orderItems, orderAddresses } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { createSession, SESSION_COOKIE_NAME } from "../src/lib/auth/session";
import { addItemToUserCart, getUserCart } from "../src/lib/cart";
import {
  generateOrderNumber,
  validateDeliveryAddress,
  createCheckoutOrder,
  confirmOrderPayment,
  getUserOrders,
  getUserOrderById,
  cancelUserOrder,
} from "../src/lib/orders/order-service";
import {
  reserveInventoryForOrder,
  commitOrderReservations,
  restoreCommittedInventory,
  getEffectiveAvailableStock,
} from "../src/lib/inventory/reservation";
import {
  computePaymentSignature,
  verifyPaymentSignature,
  computeWebhookSignature,
  verifyWebhookSignature,
  createRazorpayOrder,
} from "../src/lib/payments/razorpay";
import { SHIPPING_CONFIG, calculateShipping } from "../src/lib/pricing";

// Route Handlers
import { POST as checkoutSessionHandler } from "../src/app/api/checkout/session/route";
import { POST as checkoutVerifyHandler } from "../src/app/api/checkout/verify/route";
import { POST as webhookHandler } from "../src/app/api/webhooks/razorpay/route";
import { GET as ordersGetHandler } from "../src/app/api/orders/route";
import { GET as orderDetailGetHandler } from "../src/app/api/orders/[id]/route";
import { POST as orderCancelHandler } from "../src/app/api/orders/[id]/cancel/route";

let totalTests = 0;
let passed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${title} - ${detail || ""}`);
    process.exitCode = 1;
  }
}

function createJsonRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "POST", body, cookie, headers = {} } = options;
  const reqHeaders = new Headers(headers);
  if (body) {
    reqHeaders.set("content-type", "application/json");
  }
  if (cookie) {
    reqHeaders.set("cookie", `${SESSION_COOKIE_NAME}=${cookie}`);
  }
  if (!reqHeaders.has("host")) {
    reqHeaders.set("host", "localhost:3000");
  }

  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runPhase4TestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 4 CHECKOUT, PAYMENTS & ORDERS");
  console.log("======================================================================");

  // ------------------------------------------------------------------
  // SETUP TEST PATRONS & TEST DATA
  // ------------------------------------------------------------------
  const customerAEmail = `patron_checkout_a_${Date.now()}@test.loomera.com`;
  const customerBEmail = `patron_checkout_b_${Date.now()}@test.loomera.com`;

  const [customerA] = await db
    .insert(users)
    .values({
      email: customerAEmail,
      fullName: "Vikram Singhania",
      passwordHash: "dummyhash",
    })
    .returning();

  const [customerB] = await db
    .insert(users)
    .values({
      email: customerBEmail,
      fullName: "Ananya Deshmukh",
      passwordHash: "dummyhash",
    })
    .returning();

  const sessionA = await createSession(customerA.id);
  const sessionB = await createSession(customerB.id);

  // Fetch test product and variant
  const [testProd] = await db
    .select()
    .from(products)
    .where(eq(products.id, "classic-linen-shirt"))
    .limit(1);

  const testVariants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, testProd.id));

  const variantInStock = testVariants[0];

  // Create a limited stock variant for inventory reservation testing
  const testTimestamp = Date.now().toString(36);
  const [limitedVariant] = await db
    .insert(productVariants)
    .values({
      productId: testProd.id,
      sku: `LIMITED-TEST-${Date.now()}`,
      size: "M",
      colorName: `Ivory-${testTimestamp}`,
      colorHex: "#FFFFF0",
      stockQuantity: 2, // only 2 pieces
    })
    .returning();

  // ------------------------------------------------------------------
  // SECTION 1: UNIT LOGIC & PRICING RULES
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 1: UNIT LOGIC, PRICING & VALIDATION ---");

  // 1. Order number format
  const orderNum = generateOrderNumber();
  assert(/^LMR-[0-9]{8}-[A-Z0-9]{4}$/.test(orderNum), "Order number conforms to format 'LMR-YYYYMMDD-XXXX'");

  // 2. Shipping calculation rules
  const shipBelow = calculateShipping(2000);
  assert(shipBelow.isFreeShipping === false, "Subtotal ₹2,000 does not qualify for free shipping");
  assert(shipBelow.shippingFee === SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR, "Standard shipping fee of ₹199 applied below threshold");

  const shipAbove = calculateShipping(3500);
  assert(shipAbove.isFreeShipping === true, "Subtotal ₹3,500 qualifies for free shipping");
  assert(shipAbove.shippingFee === 0, "Standard shipping fee is ₹0 for qualifying subtotal");

  // 3. Address validation
  const validAddr = validateDeliveryAddress({
    fullName: "Vikram Singhania",
    phone: "9876543210",
    email: "vikram@example.com",
    addressLine1: "Flat 4A, Royal Palms",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
  });
  assert(validAddr.valid === true, "Valid delivery address passes validation");

  const invalidPinAddr = validateDeliveryAddress({
    fullName: "Vikram Singhania",
    phone: "9876543210",
    email: "vikram@example.com",
    addressLine1: "Flat 4A, Royal Palms",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "123", // invalid PIN
  });
  assert(invalidPinAddr.valid === false, "Rejects invalid Indian PIN code");

  const invalidPhoneAddr = validateDeliveryAddress({
    fullName: "Vikram Singhania",
    phone: "123", // invalid phone
    email: "vikram@example.com",
    addressLine1: "Flat 4A, Royal Palms",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
  });
  assert(invalidPhoneAddr.valid === false, "Rejects invalid mobile number");

  // ------------------------------------------------------------------
  // SECTION 2: PAYMENT CRYPTOGRAPHY & GATEWAY INTEGRATION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 2: PAYMENT CRYPTOGRAPHY & GATEWAY INTEGRATION ---");

  const dummyOrderId = "order_rzp_test_12345";
  const dummyPaymentId = "pay_rzp_test_67890";
  const secretKey = "test_loomera_secret";

  // 1. Payment signature computation
  const sig = computePaymentSignature(dummyOrderId, dummyPaymentId, secretKey);
  assert(typeof sig === "string" && sig.length === 64, "Computes 64-char HMAC-SHA256 payment signature");

  // 2. Payment signature verification
  const isSigValid = verifyPaymentSignature({
    orderId: dummyOrderId,
    paymentId: dummyPaymentId,
    signature: sig,
    secret: secretKey,
  });
  assert(isSigValid === true, "Verifies authentic Razorpay payment signature");

  const isTamperedSig = verifyPaymentSignature({
    orderId: dummyOrderId,
    paymentId: dummyPaymentId,
    signature: "tampered_signature_string_that_does_not_match_hash_1234567890abcdef",
    secret: secretKey,
  });
  assert(isTamperedSig === false, "Rejects tampered payment signature");

  // 3. Webhook signature verification
  const webhookBody = JSON.stringify({ event: "payment.captured", id: "evt_123" });
  const webhookSig = computeWebhookSignature(webhookBody, secretKey);
  const isWebhookValid = verifyWebhookSignature({
    rawBody: webhookBody,
    signature: webhookSig,
    secret: secretKey,
  });
  assert(isWebhookValid === true, "Verifies authentic Razorpay webhook signature");

  const isTamperedWebhook = verifyWebhookSignature({
    rawBody: webhookBody + "tampered",
    signature: webhookSig,
    secret: secretKey,
  });
  assert(isTamperedWebhook === false, "Rejects tampered webhook body");

  // 4. Create Razorpay Payment Order
  const rzpOrder = await createRazorpayOrder({
    amountInr: 2499,
    orderNumber: "LMR-TEST-001",
  });
  assert(typeof rzpOrder.id === "string" && rzpOrder.id.startsWith("order_"), "Generates valid Razorpay order ID");
  assert(rzpOrder.amount === 249900, "Converts INR to paise (₹2,499 -> 249,900 paise)");
  assert(rzpOrder.currency === "INR", "Ensures currency is strictly INR");

  // ------------------------------------------------------------------
  // SECTION 3: INVENTORY RESERVATION & ANTI-OVERSELLING ENGINE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 3: INVENTORY RESERVATION & ANTI-OVERSELLING ---");

  // Check initial stock for limited variant (2 pieces)
  const initialStock = await getEffectiveAvailableStock(limitedVariant.id);
  assert(initialStock === 2, "Limited variant begins with 2 available pieces");

  // 1. Reserve 1 piece for Order X
  const [testAddr] = await db
    .insert(orderAddresses)
    .values({
      userId: customerA.id,
      fullName: "Test Recipient",
      phone: "9876543210",
      email: customerAEmail,
      addressLine1: "123 Street",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400001",
    })
    .returning();

  const [orderX] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      userId: customerA.id,
      shippingAddressId: testAddr.id,
      subtotalInr: 2499,
      shippingFeeInr: 199,
      totalInr: 2698,
    })
    .returning();

  const [orderY] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      userId: customerA.id,
      shippingAddressId: testAddr.id,
      subtotalInr: 2499,
      shippingFeeInr: 199,
      totalInr: 2698,
    })
    .returning();

  const reserve1 = await reserveInventoryForOrder({
    orderId: orderX.id,
    items: [{ variantId: limitedVariant.id, quantity: 1 }],
    ttlMinutes: 15,
  });
  assert(reserve1.success === true, "Successfully reserves 1 piece for Order X");

  // Available stock should now be 1
  const stockAfterRes1 = await getEffectiveAvailableStock(limitedVariant.id);
  assert(stockAfterRes1 === 1, "Effective stock decrements to 1 after active reservation");

  // 2. Attempt to reserve 2 pieces for Order Y (oversell attempt)
  const reserveOversell = await reserveInventoryForOrder({
    orderId: orderY.id,
    items: [{ variantId: limitedVariant.id, quantity: 2 }],
    ttlMinutes: 15,
  });
  assert(reserveOversell.success === false, "Anti-Overselling: Rejects reservation exceeding available stock");
  assert(Boolean(reserveOversell.reason?.includes("available")), "Returns descriptive remaining stock message");

  // 3. Commit reservation for Order X (simulates payment completed)
  const commitResult = await commitOrderReservations(orderX.id);
  assert(commitResult === true, "Commits reservation and updates physical stock");

  // Physical stock in database should now be 1
  const [variantAfterCommit] = await db
    .select({ stockQuantity: productVariants.stockQuantity })
    .from(productVariants)
    .where(eq(productVariants.id, limitedVariant.id));
  assert(variantAfterCommit.stockQuantity === 1, "Physical variant stock decremented to 1 in PostgreSQL");

  // 4. Restore committed inventory (simulates order cancellation)
  const restoreResult = await restoreCommittedInventory(orderX.id);
  assert(restoreResult === true, "Restores committed inventory on cancellation");
  const [variantAfterRestore] = await db
    .select({ stockQuantity: productVariants.stockQuantity })
    .from(productVariants)
    .where(eq(productVariants.id, limitedVariant.id));
  assert(variantAfterRestore.stockQuantity === 2, "Physical variant stock restored back to 2");

  // ------------------------------------------------------------------
  // SECTION 4: ORDER CREATION & PAYMENT LIFECYCLE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 4: ORDER CREATION & PAYMENT LIFECYCLE ---");

  // 1. Add item to Customer A's cart
  await addItemToUserCart(customerA.id, {
    productId: testProd.id,
    size: variantInStock.size,
    color: variantInStock.colorName,
    quantity: 1,
  });
  const cartA = await getUserCart(customerA.id);
  assert(cartA.length === 1, "Customer A has 1 item in persistent cart");

  // 2. Create Checkout Order
  const checkoutResult = await createCheckoutOrder({
    userId: customerA.id,
    items: cartA.map((c) => ({
      productId: c.productId,
      size: c.size,
      color: c.color,
      quantity: c.quantity,
    })),
    shippingAddress: {
      fullName: "Vikram Singhania",
      phone: "9876543210",
      email: customerAEmail,
      addressLine1: "Penthouse 12B, Regency Heights",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560001",
    },
    shippingMethod: "standard",
  });

  const createdOrder = checkoutResult.order;
  assert(createdOrder.status === "PENDING_PAYMENT", "New order created in PENDING_PAYMENT status");
  assert(createdOrder.totalInr === testProd.basePriceInr + SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR, "Server authoritative total calculated accurately");
  assert(typeof checkoutResult.razorpayOrder.id === "string", "Payment order created with Razorpay ID");

  // Verify line item snapshot
  const orderLineItems = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, createdOrder.id));
  assert(orderLineItems.length === 1, "Order items snapshot recorded in database");
  assert(orderLineItems[0].productTitle === testProd.title, "Order item records immutable product title snapshot");
  assert(orderLineItems[0].unitPriceInr === testProd.basePriceInr, "Order item records immutable unit price snapshot");

  // 3. Confirm Payment with Valid Signature
  const paymentSig = computePaymentSignature(
    checkoutResult.payment.gatewayOrderId,
    "pay_test_confirmed_12345"
  );

  const confirmRes = await confirmOrderPayment({
    orderId: createdOrder.id,
    paymentId: "pay_test_confirmed_12345",
    signature: paymentSig,
  });
  assert(confirmRes.success === true, "Payment confirmation succeeded");
  assert(confirmRes.order.status === "CONFIRMED", "Order transitioned to CONFIRMED status");

  // Verify Customer A's cart is automatically emptied
  const cartAAfterPay = await getUserCart(customerA.id);
  assert(cartAAfterPay.length === 0, "Customer A's cart automatically cleared upon payment confirmation");

  // 4. Retrieve Customer A Orders
  const ordersA = await getUserOrders(customerA.id);
  assert(ordersA.length >= 1, "Customer A retrieves order history list");
  assert(ordersA[0].orderNumber === createdOrder.orderNumber, "Retrieved order matches placed order number");

  // 5. Retrieve Order Details
  const orderDetails = await getUserOrderById(customerA.id, createdOrder.id);
  assert(orderDetails !== null, "Retrieves full order details with address and items");
  assert(orderDetails?.shippingAddress.city === "Bengaluru", "Order address joined accurately");
  assert(orderDetails?.payment?.status === "PAID", "Order payment status marked PAID");
  assert((orderDetails?.statusHistory.length ?? 0) >= 2, "Status history timeline contains transition checkpoints");

  // 6. Cancel Order
  const cancelResult = await cancelUserOrder({
    userId: customerA.id,
    orderId: createdOrder.id,
    reason: "Requested size change",
  });
  assert(cancelResult.success === true, "Customer A successfully cancels own order");

  const cancelledOrder = await getUserOrderById(customerA.id, createdOrder.id);
  assert(cancelledOrder?.status === "CANCELLED", "Order status updated to CANCELLED");
  assert(cancelledOrder?.payment?.status === "CANCELLED", "Payment status updated to CANCELLED");

  // ------------------------------------------------------------------
  // SECTION 5: SECURITY & DATA ISOLATION AUDIT
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 5: SECURITY & CUSTOMER DATA ISOLATION ---");

  // 1. Customer B cannot view Customer A's order details
  const bViewAOrder = await getUserOrderById(customerB.id, createdOrder.id);
  assert(bViewAOrder === null, "Security: Customer B cannot access Customer A's order details");

  // 2. Customer B cannot cancel Customer A's order
  let bCancelFailed = false;
  try {
    await cancelUserOrder({
      userId: customerB.id,
      orderId: createdOrder.id,
    });
  } catch {
    bCancelFailed = true;
  }
  assert(bCancelFailed === true, "Security: Customer B cannot cancel Customer A's order");

  // 3. Customer B's order list is isolated from Customer A
  const ordersB = await getUserOrders(customerB.id);
  assert(ordersB.length === 0, "Customer Data Isolation: Customer B order history is completely isolated");

  // ------------------------------------------------------------------
  // SECTION 6: API ROUTES & CSRF DEFENSE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 6: API ROUTES & WEBHOOKS ---");

  // 1. POST /api/checkout/session: Unauthenticated rejection (HTTP 401)
  const reqUnauthCheckout = createJsonRequest("http://localhost:3000/api/checkout/session", {
    method: "POST",
    body: {
      shippingAddress: {
        fullName: "Test",
        phone: "9876543210",
        email: "test@test.com",
        addressLine1: "123 Street",
        city: "City",
        state: "State",
        postalCode: "123456",
      },
    },
  });
  const resUnauthCheckout = await checkoutSessionHandler(reqUnauthCheckout);
  assert(resUnauthCheckout.status === 401, "POST /api/checkout/session rejects unauthenticated request with HTTP 401");

  // 2. POST /api/checkout/session: Authenticated session creation (HTTP 200)
  // First add an item to Customer B's cart
  await addItemToUserCart(customerB.id, {
    productId: testProd.id,
    size: variantInStock.size,
    color: variantInStock.colorName,
    quantity: 1,
  });

  const reqAuthCheckout = createJsonRequest("http://localhost:3000/api/checkout/session", {
    method: "POST",
    body: {
      shippingAddress: {
        fullName: "Ananya Deshmukh",
        phone: "9123456789",
        email: customerBEmail,
        addressLine1: "Villa 9, Palm Meadows",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
      },
      shippingMethod: "express",
    },
    cookie: sessionB.token,
  });
  const resAuthCheckout = await checkoutSessionHandler(reqAuthCheckout);
  assert(resAuthCheckout.status === 200, "POST /api/checkout/session returns HTTP 200 for authenticated patron");
  const dataAuthCheckout = await resAuthCheckout.json();
  assert(typeof dataAuthCheckout.orderId === "string", "Checkout session returns registered internal orderId");
  assert(typeof dataAuthCheckout.razorpayOrderId === "string", "Checkout session returns Razorpay order ID");
  assert(dataAuthCheckout.shippingFeeInr === SHIPPING_CONFIG.EXPRESS_SHIPPING_FEE_INR, "Server authoritative express shipping fee (₹399) applied");

  // 3. POST /api/checkout/verify: Rejects invalid signature with HTTP 400
  const reqBadVerify = createJsonRequest("http://localhost:3000/api/checkout/verify", {
    method: "POST",
    body: {
      orderId: dataAuthCheckout.orderId,
      paymentId: "pay_test_bad_123",
      signature: "forged_signature_hex_value",
    },
    cookie: sessionB.token,
  });
  const resBadVerify = await checkoutVerifyHandler(reqBadVerify);
  assert(resBadVerify.status === 400, "POST /api/checkout/verify rejects forged signature with HTTP 400");

  // 4. POST /api/checkout/verify: Signature verification succeeds with HTTP 200
  const validSigB = computePaymentSignature(dataAuthCheckout.razorpayOrderId, "pay_test_b_99999");
  const reqVerify = createJsonRequest("http://localhost:3000/api/checkout/verify", {
    method: "POST",
    body: {
      orderId: dataAuthCheckout.orderId,
      paymentId: "pay_test_b_99999",
      signature: validSigB,
    },
    cookie: sessionB.token,
  });
  const resVerify = await checkoutVerifyHandler(reqVerify);
  assert(resVerify.status === 200, "POST /api/checkout/verify succeeds with HTTP 200");
  const dataVerify = await resVerify.json();
  assert(dataVerify.status === "CONFIRMED", "Order confirmed via verification endpoint");

  // 5. GET /api/orders: Retrieves Customer B's order list
  const reqGetOrders = createJsonRequest("http://localhost:3000/api/orders", {
    method: "GET",
    cookie: sessionB.token,
  });
  const resGetOrders = await ordersGetHandler(reqGetOrders);
  assert(resGetOrders.status === 200, "GET /api/orders returns HTTP 200");
  const dataGetOrders = await resGetOrders.json();
  assert(dataGetOrders.orders.length === 1, "Customer B retrieves newly confirmed order in orders list");

  // 6. GET /api/orders/[id]: Retrieves details
  const reqGetDetail = createJsonRequest(`http://localhost:3000/api/orders/${dataAuthCheckout.orderId}`, {
    method: "GET",
    cookie: sessionB.token,
  });
  const resGetDetail = await orderDetailGetHandler(reqGetDetail, {
    params: Promise.resolve({ id: dataAuthCheckout.orderId }),
  });
  assert(resGetDetail.status === 200, "GET /api/orders/[id] returns HTTP 200");

  // 7. Security: Customer A cannot access Customer B's order via API (HTTP 404)
  const reqCrossDetail = createJsonRequest(`http://localhost:3000/api/orders/${dataAuthCheckout.orderId}`, {
    method: "GET",
    cookie: sessionA.token,
  });
  const resCrossDetail = await orderDetailGetHandler(reqCrossDetail, {
    params: Promise.resolve({ id: dataAuthCheckout.orderId }),
  });
  assert(resCrossDetail.status === 404, "Security: Customer A cannot access Customer B's order via API (HTTP 404)");

  // 8. POST /api/orders/[id]/cancel: Cancels Customer B's order
  const reqCancelB = createJsonRequest(`http://localhost:3000/api/orders/${dataAuthCheckout.orderId}/cancel`, {
    method: "POST",
    body: { reason: "Need to change address" },
    cookie: sessionB.token,
  });
  const resCancelB = await orderCancelHandler(reqCancelB, {
    params: Promise.resolve({ id: dataAuthCheckout.orderId }),
  });
  assert(resCancelB.status === 200, "POST /api/orders/[id]/cancel returns HTTP 200");

  // 9. POST /api/webhooks/razorpay: Idempotent webhook processing
  const testWebhookPayload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_wh_test_123",
          order_id: dataAuthCheckout.razorpayOrderId,
          status: "captured",
        },
      },
    },
  });
  const testWhSig = computeWebhookSignature(testWebhookPayload);

  const reqWebhook = createJsonRequest("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    headers: { "x-razorpay-signature": testWhSig },
    body: JSON.parse(testWebhookPayload),
  });
  const resWebhook = await webhookHandler(reqWebhook);
  assert(resWebhook.status === 200, "POST /api/webhooks/razorpay processes valid webhook with HTTP 200");

  // 10. CSRF Defense on Checkout Session POST
  const reqCsrf = createJsonRequest("http://localhost:3000/api/checkout/session", {
    method: "POST",
    body: { items: [] },
    cookie: sessionA.token,
    headers: { origin: "https://evil-cross-site-attacker.com", "sec-fetch-site": "cross-site" },
  });
  const resCsrf = await checkoutSessionHandler(reqCsrf);
  assert(resCsrf.status === 403, "CSRF Defense: Cross-site checkout request rejected with HTTP 403 Forbidden");

  console.log("\n======================================================================");
  console.log(`PHASE 4 TEST RESULTS: ${passed}/${totalTests} PASSED (${Math.round((passed / totalTests) * 100)}%)`);
  console.log("======================================================================");

  // Clean up test users & data
  try {
    await db.delete(orders).where(eq(orders.userId, customerA.id));
    await db.delete(orders).where(eq(orders.userId, customerB.id));
    await db.delete(productVariants).where(eq(productVariants.id, limitedVariant.id));
    await db.delete(users).where(eq(users.id, customerA.id));
    await db.delete(users).where(eq(users.id, customerB.id));
  } catch (err) {
    console.warn("Cleanup warning:", err);
  }

  await pool.end();
}

runPhase4TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
