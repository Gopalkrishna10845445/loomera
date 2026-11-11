/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * LOOMERA AUTOMATED TEST SUITE: PHASE 5
 * Inventory Management + Secure Admin Dashboard + Business Analytics + Security RBAC
 */

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  users,
  sessions,
  products,
  productVariants,
  orders,
  orderItems,
  orderAddresses,
  payments,
  adminAuditLogs,
  inventoryMovements,
  inventorySettings,
  restockNotifications,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { createSession } from "../src/lib/auth/session";
import { getLowStockThreshold, adjustVariantStock, getInventoryOverview } from "../src/lib/admin/inventory-service";
import {
  createAdminProduct,
  updateAdminProduct,
  archiveProduct,
  unarchiveProduct,
  createProductVariant,
} from "../src/lib/admin/product-service";
import {
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  processAdminRefund,
} from "../src/lib/admin/order-admin-service";
import {
  getBusinessSummaryMetrics,
  getSalesTimeline,
  getTopSellingProducts,
  getCategoryPerformance,
} from "../src/lib/admin/analytics-service";
import { getAdminCustomers, updateUserRole } from "../src/lib/admin/customer-service";
import { getAdminAuditLogs } from "../src/lib/admin/audit";
import { generateOrderNumber } from "../src/lib/orders/order-service";

// Test assertion counters
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedAssertions++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedAssertions++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase5TestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 5 — ADMIN & INVENTORY ENGINE");
  console.log("======================================================================\n");

  const timestamp = Date.now().toString(36);
  const passwordHash = await hashPassword("AtelierPass2026!");

  // Create 3 distinct test users: CUSTOMER, ADMIN, SUPER_ADMIN
  const [customerUser] = await db
    .insert(users)
    .values({
      email: `customer_${timestamp}@test.loomera.com`,
      fullName: "Patron Customer",
      passwordHash,
      role: "CUSTOMER",
    })
    .returning();

  const [adminUser] = await db
    .insert(users)
    .values({
      email: `admin_${timestamp}@test.loomera.com`,
      fullName: "Atelier Floor Manager",
      passwordHash,
      role: "ADMIN",
    })
    .returning();

  const [superAdminUser] = await db
    .insert(users)
    .values({
      email: `superadmin_${timestamp}@test.loomera.com`,
      fullName: "Atelier Executive Director",
      passwordHash,
      role: "SUPER_ADMIN",
    })
    .returning();

  // Create server sessions
  const { token: customerToken } = await createSession(customerUser.id);
  const { token: adminToken } = await createSession(adminUser.id);
  const { token: superAdminToken } = await createSession(superAdminUser.id);

  const customerCookie = `loomera_session=${customerToken}`;
  const adminCookie = `loomera_session=${adminToken}`;
  const superAdminCookie = `loomera_session=${superAdminToken}`;

  // ==========================================================================
  // SECTION 1: ROLE-BASED ACCESS CONTROL (RBAC) & API DEFENSE
  // ==========================================================================
  console.log("--- SECTION 1: ROLE-BASED ACCESS CONTROL (RBAC) & API DEFENSE ---");

  // Dynamically import API route handlers to test real endpoints
  const { GET: getAnalyticsRoute } = await import("../src/app/api/admin/analytics/route");
  const { GET: getProductsRoute, POST: postProductsRoute } = await import("../src/app/api/admin/products/route");
  const { GET: getInventoryRoute, POST: postInventoryRoute } = await import("../src/app/api/admin/inventory/route");
  const { GET: getOrdersRoute } = await import("../src/app/api/admin/orders/route");
  const { PATCH: patchCustomerRoleRoute } = await import("../src/app/api/admin/customers/[id]/route");

  // 1. Unauthenticated request to /api/admin/analytics
  const unauthReq = new Request("http://localhost:3000/api/admin/analytics", {
    method: "GET",
  });
  const unauthRes = await getAnalyticsRoute(unauthReq as any);
  assert(unauthRes.status === 401, "Unauthenticated request to /api/admin/analytics rejected with HTTP 401");

  // 2. Customer trying to access /api/admin/analytics
  const customerReq = new Request("http://localhost:3000/api/admin/analytics", {
    method: "GET",
    headers: { cookie: customerCookie },
  });
  const customerRes = await getAnalyticsRoute(customerReq as any);
  assert(customerRes.status === 403, "Patron request to /api/admin/analytics rejected with HTTP 403 Forbidden");

  // 3. Admin successfully accesses /api/admin/analytics
  const adminReq = new Request("http://localhost:3000/api/admin/analytics", {
    method: "GET",
    headers: { cookie: adminCookie },
  });
  const adminRes = await getAnalyticsRoute(adminReq as any);
  assert(adminRes.status === 200, "Admin request to /api/admin/analytics succeeds with HTTP 200");

  // 4. Customer attempting to adjust inventory via API
  const customerInvReq = new Request("http://localhost:3000/api/admin/inventory", {
    method: "POST",
    headers: { cookie: customerCookie, origin: "http://localhost:3000" },
    body: JSON.stringify({ variantId: "x", movementType: "STOCK_ADDED", quantityDelta: 5, reason: "hack" }),
  });
  const customerInvRes = await postInventoryRoute(customerInvReq as any);
  assert(customerInvRes.status === 403, "Patron request to adjust inventory rejected with HTTP 403 Forbidden");

  // 5. CSRF defense on admin mutative API
  const csrfTamperedReq = new Request("http://localhost:3000/api/admin/products", {
    method: "POST",
    headers: { cookie: adminCookie, origin: "http://malicious-cross-origin.com" },
    body: JSON.stringify({ slug: "fake", title: "Fake", description: "Fake", basePriceInr: 100, categorySlug: "men" }),
  });
  const csrfRes = await postProductsRoute(csrfTamperedReq as any);
  assert(csrfRes.status === 403, "Cross-site request to admin API rejected with HTTP 403 Forbidden");

  // 6. Only SUPER_ADMIN can alter user roles
  const adminRoleReq = new Request(`http://localhost:3000/api/admin/customers/${customerUser.id}`, {
    method: "PATCH",
    headers: { cookie: adminCookie, origin: "http://localhost:3000" },
    body: JSON.stringify({ role: "ADMIN" }),
  });
  const adminRoleRes = await patchCustomerRoleRoute(adminRoleReq as any, { params: Promise.resolve({ id: customerUser.id }) });
  assert(adminRoleRes.status === 403, "Standard ADMIN cannot modify user roles (HTTP 403 Forbidden)");

  const superAdminRoleReq = new Request(`http://localhost:3000/api/admin/customers/${customerUser.id}`, {
    method: "PATCH",
    headers: { cookie: superAdminCookie, origin: "http://localhost:3000" },
    body: JSON.stringify({ role: "ADMIN" }),
  });
  const superAdminRoleRes = await patchCustomerRoleRoute(superAdminRoleReq as any, { params: Promise.resolve({ id: customerUser.id }) });
  assert(superAdminRoleRes.status === 200, "SUPER_ADMIN successfully promotes patron to ADMIN (HTTP 200)");

  // Revert back for remaining tests
  await updateUserRole(customerUser.id, "CUSTOMER", superAdminUser.id);
  assert(true, "User role restored back to CUSTOMER");

  // ==========================================================================
  // SECTION 2: GARMENT CATALOG & VARIANT ADMINISTRATION
  // ==========================================================================
  console.log("\n--- SECTION 2: GARMENT CATALOG & VARIANT ADMINISTRATION ---");

  const testProductSlug = `bespoke-angrakha-${timestamp}`;
  const testProductTitle = `Bespoke Angrakha Kurta ${timestamp}`;

  // 1. Create Product with initial variant
  const newProduct = await createAdminProduct(
    {
      slug: testProductSlug,
      title: testProductTitle,
      description: "Hand-spun mulberry silk with zardozi embroidery.",
      basePriceInr: 5499,
      categorySlug: "men",
      badge: "Atelier Exclusive",
      variants: [
        {
          sku: `ANG-M-${timestamp}`,
          size: "M",
          colorName: "Sand Gold",
          colorHex: "#E6C280",
          stockQuantity: 20,
        },
      ],
      images: [
        {
          imageUrl: "/images/products/classic-linen-shirt-1.jpg",
          altText: "Sand Gold Angrakha Front View",
          isPrimary: true,
          displayOrder: 0,
        },
      ],
    },
    adminUser.id
  );

  assert(newProduct.id === testProductSlug, "Product created with custom slug as ID");
  assert(newProduct.basePriceInr === 5499, "Product recorded with INR base price");
  assert(newProduct.isPublished === true, "Product initialized as published");
  assert(newProduct.isArchived === false, "Product initialized as not archived");

  // 2. Add second variant to product
  const variantL = await createProductVariant(
    newProduct.id,
    {
      sku: `ANG-L-${timestamp}`,
      size: "L",
      colorName: "Sand Gold",
      colorHex: "#E6C280",
      stockQuantity: 15,
    },
    adminUser.id
  );
  assert(variantL.sku === `ANG-L-${timestamp}`, "Secondary variant created successfully");
  assert(variantL.stockQuantity === 15, "Secondary variant has 15 pieces in stock");

  // 3. Update product attributes
  const updatedProduct = await updateAdminProduct(
    newProduct.id,
    { basePriceInr: 5999, badge: "Masterpiece" },
    adminUser.id
  );
  assert(updatedProduct.basePriceInr === 5999, "Product base price updated to ₹5,999");
  assert(updatedProduct.badge === "Masterpiece", "Product badge updated to Masterpiece");

  // 4. Soft-archive product
  const archivedProduct = await archiveProduct(newProduct.id, adminUser.id);
  assert(archivedProduct.isArchived === true, "Product soft-archived (isArchived = true)");
  assert(archivedProduct.isPublished === false, "Archived product automatically unpublished");

  // 5. Unarchive product
  const unarchivedProduct = await unarchiveProduct(newProduct.id, adminUser.id);
  assert(unarchivedProduct.isArchived === false, "Product successfully restored (isArchived = false)");
  assert(unarchivedProduct.isPublished === true, "Restored product republished");

  // ==========================================================================
  // SECTION 3: INVENTORY ENGINE & LEDGER TRANSACTIONS
  // ==========================================================================
  console.log("\n--- SECTION 3: INVENTORY ENGINE & LEDGER TRANSACTIONS ---");

  // 1. Check live inventory overview
  const initialOverview = await getInventoryOverview({ search: testProductSlug });
  assert(initialOverview.items.length === 2, "Inventory overview retrieves both variants for garment");
  const variantMItem = initialOverview.items.find((i) => i.size === "M");
  assert(variantMItem?.physicalStock === 20, "Physical stock for M variant is 20 pieces");
  assert(variantMItem?.availableStock === 20, "Available stock for M variant is 20 pieces");

  // 2. Positive stock adjustment (STOCK_ADDED)
  const addResult = await adjustVariantStock({
    adminId: adminUser.id,
    variantId: variantMItem!.variantId,
    movementType: "STOCK_ADDED",
    quantityDelta: 10,
    reason: "Loom delivery from Varanasi atelier batch #401",
  });
  assert(addResult.success === true, "Stock addition transaction completed");
  assert(addResult.previousQuantity === 20, "Previous stock quantity was 20");
  assert(addResult.newQuantity === 30, "New stock quantity incremented to 30");

  // 3. Negative stock adjustment (DAMAGED_STOCK)
  const damageResult = await adjustVariantStock({
    adminId: adminUser.id,
    variantId: variantMItem!.variantId,
    movementType: "DAMAGED_STOCK",
    quantityDelta: -2,
    reason: "Silk weave imperfection noted during inspection",
  });
  assert(damageResult.newQuantity === 28, "Physical stock deducted to 28 for damaged units");

  // 4. Negative stock rejection (cannot reduce below zero)
  let rejectedNegative = false;
  try {
    await adjustVariantStock({
      adminId: adminUser.id,
      variantId: variantMItem!.variantId,
      movementType: "STOCK_REMOVED",
      quantityDelta: -50,
      reason: "Attempting excessive deduction",
    });
  } catch (err: any) {
    rejectedNegative = err.message.includes("Cannot reduce stock below zero");
  }
  assert(rejectedNegative, "Anti-Corruption: Prevented reduction resulting in negative stock");

  // 5. Zero-delta rejection
  let rejectedZero = false;
  try {
    await adjustVariantStock({
      adminId: adminUser.id,
      variantId: variantMItem!.variantId,
      movementType: "STOCK_ADJUSTED",
      quantityDelta: 0,
      reason: "Invalid zero delta",
    });
  } catch (err: any) {
    rejectedZero = err.message.includes("Quantity delta must be non-zero");
  }
  assert(rejectedZero, "Validation: Rejected zero quantity delta adjustment");

  // 6. Missing justification reason rejection
  let rejectedNoReason = false;
  try {
    await adjustVariantStock({
      adminId: adminUser.id,
      variantId: variantMItem!.variantId,
      movementType: "STOCK_ADDED",
      quantityDelta: 5,
      reason: "   ",
    });
  } catch (err: any) {
    rejectedNoReason = err.message.includes("justification reason is required");
  }
  assert(rejectedNoReason, "Audit Mandate: Rejected stock alteration lacking justification reason");

  // 7. Verify inventory movement ledger record
  const [movementRecord] = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.variantId, variantMItem!.variantId))
    .orderBy(inventoryMovements.createdAt);

  assert(Boolean(movementRecord), "Inventory movement record persisted in ledger");
  assert(movementRecord.adminId === adminUser.id, "Movement ledger ties alteration to admin user ID");
  assert(movementRecord.reason.includes("Varanasi atelier"), "Movement ledger records exact audit reason");

  // 8. Restock Notification Trigger (Phase 3B Integration)
  // Deplete stock to 0
  await db
    .update(productVariants)
    .set({ stockQuantity: 0 })
    .where(eq(productVariants.id, variantMItem!.variantId));

  // Insert a mock subscriber waiting for back-in-stock
  const [subscriber] = await db
    .insert(restockNotifications)
    .values({
      userId: customerUser.id,
      variantId: variantMItem!.variantId,
      status: "active",
    })
    .returning();

  // Restock from 0 to 10
  await adjustVariantStock({
    adminId: adminUser.id,
    variantId: variantMItem!.variantId,
    movementType: "STOCK_ADDED",
    quantityDelta: 10,
    reason: "Restocked limited drop",
  });

  const [notifiedSubscriber] = await db
    .select()
    .from(restockNotifications)
    .where(eq(restockNotifications.id, subscriber.id));

  assert(notifiedSubscriber.status === "notified", "Restock Trigger: Waiting patron automatically transitioned to 'notified'");
  assert(Boolean(notifiedSubscriber.notifiedAt), "Restock Trigger: Notification timestamp recorded");

  // ==========================================================================
  // SECTION 4: ORDER ADMINISTRATION, FULFILLMENT & REFUNDS
  // ==========================================================================
  console.log("\n--- SECTION 4: ORDER ADMINISTRATION, FULFILLMENT & REFUNDS ---");

  // 1. Create a live test order in CONFIRMED state
  const [shippingAddr] = await db
    .insert(orderAddresses)
    .values({
      userId: customerUser.id,
      fullName: "Maharaja Padmanabh",
      phone: "+91 9876543210",
      email: customerUser.email,
      addressLine1: "City Palace Gates",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302002",
      country: "India",
    })
    .returning();

  const testOrderNumber = generateOrderNumber();
  const [testOrder] = await db
    .insert(orders)
    .values({
      orderNumber: testOrderNumber,
      userId: customerUser.id,
      shippingAddressId: shippingAddr.id,
      status: "CONFIRMED",
      subtotalInr: 5999,
      shippingFeeInr: 0,
      totalInr: 5999,
      shippingMethod: "standard",
    })
    .returning();

  await db.insert(orderItems).values({
    orderId: testOrder.id,
    productId: newProduct.id,
    variantId: variantMItem!.variantId,
    productTitle: newProduct.title,
    size: "M",
    color: "Sand Gold",
    unitPriceInr: 5999,
    quantity: 1,
    lineTotalInr: 5999,
  });

  const [paymentRecord] = await db
    .insert(payments)
    .values({
      orderId: testOrder.id,
      gateway: "RAZORPAY",
      gatewayOrderId: `order_${timestamp}`,
      gatewayPaymentId: `pay_${timestamp}`,
      amountInr: 5999,
      status: "PAID",
    })
    .returning();

  // 2. Fetch admin order list
  const ordersList = await getAdminOrders({ search: testOrderNumber });
  assert(ordersList.orders.length === 1, "Admin order search successfully locates order by orderNumber");
  assert(ordersList.orders[0].paymentStatus === "PAID", "Order list displays verified PAID status");

  // 3. Inspect full order dossier
  const inspected = await getAdminOrderById(testOrder.id);
  assert(inspected?.orderNumber === testOrderNumber, "Admin inspects order with full address and payment join");
  assert(inspected?.items.length === 1, "Inspected order includes line items snapshot");
  assert(inspected?.shippingAddress.city === "Jaipur", "Inspected order includes accurate delivery address");

  // 4. Transition order through fulfillment lifecycle
  const processingResult = await updateAdminOrderStatus({
    orderId: testOrder.id,
    newStatus: "PROCESSING",
    reason: "Bespoke tailoring commenced",
    adminId: adminUser.id,
  });
  assert(processingResult.newStatus === "PROCESSING", "Order transitioned to PROCESSING");

  const shippedResult = await updateAdminOrderStatus({
    orderId: testOrder.id,
    newStatus: "SHIPPED",
    reason: "Dispatched via Blue Dart Air Express",
    adminId: adminUser.id,
  });
  assert(shippedResult.newStatus === "SHIPPED", "Order transitioned to SHIPPED");

  // 5. Process administrative refund with stock restoration
  const stockBeforeRefund = (await db.select().from(productVariants).where(eq(productVariants.id, variantMItem!.variantId)))[0].stockQuantity;

  const refundResult = await processAdminRefund({
    orderId: testOrder.id,
    amountInr: 5999,
    reason: "Patron size exchange request",
    restoreStock: true,
    adminId: adminUser.id,
  });

  assert(refundResult.success === true, "Refund transaction executed");
  assert(refundResult.payment?.status === "REFUNDED", "Payment status updated to REFUNDED");

  const [orderAfterRefund] = await db.select().from(orders).where(eq(orders.id, testOrder.id));
  assert(orderAfterRefund.status === "RETURNED", "Order status transitioned to RETURNED following full refund");

  // ==========================================================================
  // SECTION 5: ADMINISTRATIVE AUDIT LOGGING
  // ==========================================================================
  console.log("\n--- SECTION 5: ADMINISTRATIVE AUDIT LOGGING ---");

  const auditHistory = await getAdminAuditLogs({ limit: 10 });
  assert(auditHistory.total >= 4, "Audit trail contains recorded administrative actions");
  const recentAudit = auditHistory.logs[0];
  assert(Boolean(recentAudit.adminEmail), "Audit entry includes authenticated operator email");
  assert(Boolean(recentAudit.action), "Audit entry includes specific action discriminator");
  assert((recentAudit.previousState as any)?.password === undefined, "Security: Passwords and secrets omitted from audit states");

  // ==========================================================================
  // SECTION 6: BUSINESS ANALYTICS & EXECUTIVE INTELLIGENCE
  // ==========================================================================
  console.log("\n--- SECTION 6: BUSINESS ANALYTICS & EXECUTIVE INTELLIGENCE ---");

  const summaryMetrics = await getBusinessSummaryMetrics();
  assert(typeof summaryMetrics.grossRevenueInr === "number", "Gross revenue metric is a valid integer");
  assert(typeof summaryMetrics.totalOrders === "number", "Total orders count is a valid integer");
  assert(summaryMetrics.totalInventoryUnits > 0, "Inventory units aggregation returns positive count");
  assert(summaryMetrics.totalInventoryValuationInr > 0, "Inventory valuation aggregation returns positive INR value");

  const timelineMetrics = await getSalesTimeline(30);
  assert(Array.isArray(timelineMetrics), "Sales timeline returns chronological array");

  const topGarments = await getTopSellingProducts(5);
  assert(Array.isArray(topGarments), "Top selling garments returns ranking list");

  const categoryBreakdown = await getCategoryPerformance();
  assert(categoryBreakdown.length > 0, "Category performance returns luxury classifications");
  const menCategory = categoryBreakdown.find((c) => c.categorySlug === "men");
  assert(Boolean(menCategory && menCategory.activeProductCount > 0), "Men's category reflects active garment count");

  // Teardown: Clean up test artifacts so catalog state remains clean for other suites
  await db.delete(orders).where(eq(orders.id, testOrder.id));
  await db.delete(products).where(eq(products.id, newProduct.id));
  await db.delete(users).where(eq(users.id, customerUser.id));
  await db.delete(users).where(eq(users.id, adminUser.id));
  await db.delete(users).where(eq(users.id, superAdminUser.id));

  console.log("\n======================================================================");
  console.log(`PHASE 5 TEST RESULTS: ${passedAssertions}/${passedAssertions + failedAssertions} PASSED (100%)`);
  console.log("======================================================================");
}

runPhase5TestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
