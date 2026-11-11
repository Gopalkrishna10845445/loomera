import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { NextRequest } from "next/server";
import { db, pool } from "../src/db";
import {
  users,
  products,
  productVariants,
  restockRecords,
} from "../src/db/schema";
import {
  checkProductAvailability,
  getAvailableVariants,
  getLowStockProducts,
  getRestockInformation,
  subscribeRestockNotification,
  cancelRestockNotification,
  getUserRestockNotifications,
} from "../src/lib/inventory";
import {
  recordProductView,
  getProductViewHistory,
  clearProductViewHistory,
  recordSearchQuery,
  getCustomerSearchHistory,
  clearCustomerSearchHistory,
} from "../src/lib/history";
import {
  checkProductAvailabilityTool,
  getAvailableSizesTool,
  getAvailableColorsTool,
  getRestockInformationTool,
} from "../src/lib/ai/tools";
import { parseCustomerQuery } from "../src/lib/ai/nlu";
import { orchestrateAssistant, executeAssistantTool } from "../src/lib/ai/orchestrator";
import { POST as chatHandler } from "../src/app/api/assistant/chat/route";
import {
  GET as viewsGetHandler,
  POST as viewsPostHandler,
  DELETE as viewsDeleteHandler,
} from "../src/app/api/history/views/route";
import {
  GET as searchesGetHandler,
  POST as searchesPostHandler,
  DELETE as searchesDeleteHandler,
} from "../src/app/api/history/searches/route";
import {
  GET as notificationsGetHandler,
  POST as notificationsPostHandler,
  DELETE as notificationsDeleteHandler,
} from "../src/app/api/restock-notifications/route";
import { createSession, SESSION_COOKIE_NAME } from "../src/lib/auth/session";
import { eq } from "drizzle-orm";

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
  // Default valid origin for tests unless overridden
  if (!reqHeaders.has("origin") && !reqHeaders.has("referer")) {
    reqHeaders.set("origin", "http://localhost:3000");
  }

  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runPhase3bTestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 3B PRODUCT INTELLIGENCE & HISTORY");
  console.log("======================================================================");

  // ------------------------------------------------------------------
  // SETUP TEST PATRONS & TEST DATA
  // ------------------------------------------------------------------
  const customerAEmail = `patron_a_${Date.now()}@test.loomera.com`;
  const customerBEmail = `patron_b_${Date.now()}@test.loomera.com`;

  const [customerA] = await db
    .insert(users)
    .values({
      email: customerAEmail,
      fullName: "Arjun Mehta",
      passwordHash: "dummyhash",
    })
    .returning();

  const [customerB] = await db
    .insert(users)
    .values({
      email: customerBEmail,
      fullName: "Devika Roy",
      passwordHash: "dummyhash",
    })
    .returning();

  const sessionA = await createSession(customerA.id);
  const sessionB = await createSession(customerB.id);

  // Fetch a known product and variants
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

  // Set up an out-of-stock variant and a scheduled restock record for testing
  const [variantOutOfStock] = await db
    .insert(productVariants)
    .values({
      productId: testProd.id,
      sku: `TEST-OOS-${Date.now()}`,
      size: "XXL",
      colorName: "Terracotta",
      colorHex: "#E76F51",
      stockQuantity: 0,
    })
    .returning();

  const futureRestockDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days in future
  const [testRestock] = await db
    .insert(restockRecords)
    .values({
      variantId: variantOutOfStock.id,
      expectedRestockDate: futureRestockDate,
      expectedQuantity: 25,
      status: "scheduled",
    })
    .returning();

  // ------------------------------------------------------------------
  // SECTION 1: INVENTORY & PRODUCT AVAILABILITY ENGINE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 1: INVENTORY & PRODUCT AVAILABILITY ENGINE ---");

  // 1. checkProductAvailability basic
  const availGeneral = await checkProductAvailability("classic-linen-shirt");
  assert(availGeneral.available === true, "Published product with inventory reports available: true");
  assert(availGeneral.totalStock > 0, "Derives accurate total stock across all variants");
  assert(availGeneral.availableSizes.length > 0, "Lists available in-stock sizes");
  assert(availGeneral.availableColors.length > 0, "Lists available in-stock shades");

  // 2. Specific in-stock variant
  const availInStock = await checkProductAvailability("classic-linen-shirt", variantInStock.size, variantInStock.colorName);
  assert(availInStock.available === true, "In-stock variant reports available: true");
  assert(availInStock.status === "in_stock" || availInStock.status === "low_stock", "In-stock variant reports valid status");
  assert(availInStock.matchingVariant?.stock === variantInStock.stockQuantity, "Matching variant returns exact PostgreSQL stock quantity");

  // 3. Out-of-stock variant
  const availOos = await checkProductAvailability("classic-linen-shirt", "XXL", "Terracotta");
  assert(availOos.available === false, "Out-of-stock variant reports available: false");
  assert(availOos.status === "out_of_stock", "Out-of-stock variant reports status: 'out_of_stock'");
  assert(availOos.matchingVariant?.stock === 0, "Out-of-stock variant reports stock 0");

  // 4. Invalid size/color combination
  const availInvalid = await checkProductAvailability("classic-linen-shirt", "NON_EXISTENT_SIZE", "Neon Pink");
  assert(availInvalid.available === false, "Invalid size/color combination reports available: false");
  assert(availInvalid.status === "unavailable", "Invalid combination reports status: 'unavailable'");

  // 5. Unpublished or non-existent product
  const availGhost = await checkProductAvailability("ghost-product-xyz");
  assert(availGhost.available === false, "Non-existent product reports available: false");
  assert(availGhost.isPublished === false, "Non-existent product reports isPublished: false");

  // 6. getAvailableVariants
  const allVars = await getAvailableVariants("classic-linen-shirt");
  assert(allVars.length >= testVariants.length, "getAvailableVariants returns all variants for garment");
  assert(allVars.some((v) => v.stock === 0), "Includes out-of-stock variant with stock 0");
  assert(allVars.every((v) => v.stock >= 0), "Enforces non-negative stock across all variants");

  // 7. getLowStockProducts
  const lowStockItems = await getLowStockProducts(10);
  assert(Array.isArray(lowStockItems), "getLowStockProducts returns array");
  assert(lowStockItems.every((item) => item.stockQuantity >= 0 && item.stockQuantity <= 10), "Every low-stock item is within threshold");

  // 8. getRestockInformation: when record exists
  const restockKnown = await getRestockInformation("classic-linen-shirt", "XXL", "Terracotta");
  assert(restockKnown.hasRestockInfo === true, "Retrieves scheduled restock when reliable record exists");
  assert(restockKnown.expectedQuantity === 25, "Restock record contains expected quantity (25)");
  assert(typeof restockKnown.expectedDate === "string", "Restock record contains ISO restock date");

  // 9. getRestockInformation: when no record exists (honest fallback)
  const restockNone = await getRestockInformation("classic-linen-shirt", "S", "Cream");
  assert(restockNone.hasRestockInfo === false, "Honest reporting: hasRestockInfo is false when no record exists");
  assert(
    restockNone.message.includes("not currently available"),
    "Returns authoritative fallback message 'An estimated restock date is not currently available.'"
  );

  // ------------------------------------------------------------------
  // SECTION 2: PRODUCT VIEWING HISTORY ENGINE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 2: PRODUCT VIEWING HISTORY ENGINE ---");

  // 1. Record authenticated view
  const recViewA1 = await recordProductView({
    productId: "classic-linen-shirt",
    userId: customerA.id,
  });
  assert(recViewA1 === true, "Records authenticated product view for Customer A");

  const viewsA1 = await getProductViewHistory({ userId: customerA.id });
  assert(viewsA1.length === 1, "Customer A has 1 recorded product view");
  assert(viewsA1[0].product.id === "classic-linen-shirt", "Viewed product ID matches recorded product");

  // 2. Duplicate view behavior (must update viewed_at without duplicating row)
  const recViewA2 = await recordProductView({
    productId: "classic-linen-shirt",
    userId: customerA.id,
  });
  assert(recViewA2 === true, "Repeated view returns true");

  const viewsA2 = await getProductViewHistory({ userId: customerA.id });
  assert(viewsA2.length === 1, "Duplicate view updates existing record without creating duplicate row");

  // 3. Second product view for Customer A
  await recordProductView({
    productId: "handloom-kurta",
    userId: customerA.id,
  });
  const viewsA3 = await getProductViewHistory({ userId: customerA.id });
  assert(viewsA3.length === 2, "Customer A now has 2 distinct viewed products");
  assert(viewsA3[0].product.id === "handloom-kurta", "Most recently viewed product appears first (chronological order)");

  // 4. Anonymous browsing session history
  const anonSessionId = `anon-sess-${Date.now()}`;
  await recordProductView({
    productId: "textured-casual-shirt",
    sessionId: anonSessionId,
  });
  const anonViews = await getProductViewHistory({ sessionId: anonSessionId });
  assert(anonViews.length === 1, "Records and retrieves anonymous session viewing history");
  assert(anonViews[0].product.id === "textured-casual-shirt", "Anonymous view matches inspected product");

  // 5. Customer Privacy & Data Isolation: Customer B cannot view Customer A's history
  const viewsB = await getProductViewHistory({ userId: customerB.id });
  assert(viewsB.length === 0, "Customer Data Isolation: Customer B cannot access Customer A's viewing history");

  // 6. Clear viewing history
  const clearViews = await clearProductViewHistory({ userId: customerA.id });
  assert(clearViews === true, "Customer A clears personal viewing history");
  const viewsAAfterClear = await getProductViewHistory({ userId: customerA.id });
  assert(viewsAAfterClear.length === 0, "Customer A viewing history is now empty");

  // ------------------------------------------------------------------
  // SECTION 3: CUSTOMER SEARCH HISTORY ENGINE
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 3: CUSTOMER SEARCH HISTORY ENGINE ---");

  // 1. Record search
  const recSearch1 = await recordSearchQuery({
    query: "linen shirts under 2000",
    filters: { fabric: "linen", maxPrice: 2000 },
    userId: customerA.id,
  });
  assert(recSearch1 === true, "Records customer search query with filters");

  // 2. Retrieve search history
  const searchesA = await getCustomerSearchHistory({ userId: customerA.id });
  assert(searchesA.length === 1, "Customer A retrieves search history");
  assert(searchesA[0].searchQuery === "linen shirts under 2000", "Stored query matches search");
  assert((searchesA[0].filters as Record<string, unknown>).maxPrice === 2000, "Stored filters match search");

  // 3. Second search query
  await recordSearchQuery({
    query: "handloom kurtas",
    filters: { category: "handloom" },
    userId: customerA.id,
  });
  const searchesA2 = await getCustomerSearchHistory({ userId: customerA.id });
  assert(searchesA2.length === 2, "Customer A has 2 recorded searches in chronological order");
  assert(searchesA2[0].searchQuery === "handloom kurtas", "Latest search appears first");

  // 4. Query filter in search history
  const filteredSearches = await getCustomerSearchHistory({
    userId: customerA.id,
    queryFilter: "linen",
  });
  assert(filteredSearches.length === 1, "Filters search history by keyword 'linen'");
  assert(filteredSearches[0].searchQuery.includes("linen"), "Matching search contains 'linen'");

  // 5. Rejects empty query
  const recEmptySearch = await recordSearchQuery({
    query: "   ",
    userId: customerA.id,
  });
  assert(recEmptySearch === false, "Rejects empty search query");

  // 6. Customer Data Isolation: Customer B cannot view Customer A's searches
  const searchesB = await getCustomerSearchHistory({ userId: customerB.id });
  assert(searchesB.length === 0, "Customer Data Isolation: Customer B cannot access Customer A's searches");

  // 7. Clear search history
  await clearCustomerSearchHistory({ userId: customerA.id });
  const searchesAAfterClear = await getCustomerSearchHistory({ userId: customerA.id });
  assert(searchesAAfterClear.length === 0, "Customer A search history successfully cleared");

  // ------------------------------------------------------------------
  // SECTION 4: RESTOCK NOTIFICATION SUBSCRIPTIONS
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 4: RESTOCK NOTIFICATION SUBSCRIPTIONS ---");

  // 1. Subscribe to restock alert
  const subResult = await subscribeRestockNotification(customerA.id, variantOutOfStock.id);
  assert(subResult.success === true, "Subscribes Customer A to restock alert for out-of-stock variant");
  assert(subResult.alreadyActive === false, "Initial subscription is marked alreadyActive: false");

  // 2. Prevent duplicate active subscription (idempotent)
  const dupSubResult = await subscribeRestockNotification(customerA.id, variantOutOfStock.id);
  assert(dupSubResult.success === true, "Duplicate subscription call succeeds idempotently");
  assert(dupSubResult.alreadyActive === true, "Duplicate subscription detects active notification");

  // 3. Get customer notifications
  const notifsA = await getUserRestockNotifications(customerA.id);
  assert(notifsA.length === 1, "Customer A retrieves active restock notification list");
  assert(notifsA[0].size === "XXL", "Notification record references correct variant size (XXL)");
  assert(notifsA[0].productTitle === testProd.title, "Notification record joins product title");

  // 4. Customer B cannot see Customer A's restock subscriptions
  const notifsB = await getUserRestockNotifications(customerB.id);
  assert(notifsB.length === 0, "Customer Data Isolation: Customer B cannot view Customer A's restock subscriptions");

  // 5. Customer B cannot cancel Customer A's restock notification
  const cancelByB = await cancelRestockNotification(customerB.id, subResult.notificationId);
  assert(cancelByB === false, "Security: Customer B cannot cancel Customer A's restock alert");

  // 6. Customer A cancels their own restock notification
  const cancelByA = await cancelRestockNotification(customerA.id, subResult.notificationId);
  assert(cancelByA === true, "Customer A successfully cancels own restock alert");
  const notifsAAfterCancel = await getUserRestockNotifications(customerA.id);
  assert(notifsAAfterCancel.length === 0, "Active restock notifications list is now empty");

  // ------------------------------------------------------------------
  // SECTION 5: AI AGENT TOOLS & CONVERSATIONAL ORCHESTRATION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 5: AI AGENT TOOLS & CONVERSATIONAL ORCHESTRATION ---");

  // 1. checkProductAvailabilityTool
  const toolAvail = await checkProductAvailabilityTool({
    productId: "classic-linen-shirt",
    size: "M",
    color: "Navy",
  });
  assert(toolAvail.available === true, "Tool: checkProductAvailabilityTool returns in-stock status");

  // 2. getAvailableSizesTool
  const toolSizes = await getAvailableSizesTool("classic-linen-shirt");
  assert(toolSizes.availableSizes.includes("M"), "Tool: getAvailableSizesTool includes size M");

  // 3. getAvailableColorsTool
  const toolColors = await getAvailableColorsTool("classic-linen-shirt");
  assert(toolColors.availableColors.length > 0, "Tool: getAvailableColorsTool returns available shades");

  // 4. getRestockInformationTool
  const toolRestock = await getRestockInformationTool({
    productId: "classic-linen-shirt",
    size: "XXL",
    color: "Terracotta",
  });
  assert(toolRestock.hasRestockInfo === true, "Tool: getRestockInformationTool retrieves scheduled restock");

  // 5. executeAssistantTool generic dispatch
  const dispatchAvail = await executeAssistantTool("check_product_availability", {
    productId: "classic-linen-shirt",
    size: "S",
  });
  assert(dispatchAvail.meta !== undefined, "executeAssistantTool dispatches 'check_product_availability'");

  // 6. NLU query: Availability question
  const nluAvail = parseCustomerQuery("Is the classic linen shirt available in size M?");
  assert(nluAvail.intent === "availability", "NLU parses availability question intent");
  assert(nluAvail.targetSize === "M", "NLU extracts target size 'M'");
  assert(nluAvail.targetProductId === "classic-linen-shirt", "NLU extracts target product 'classic-linen-shirt'");

  // 7. NLU query: View history question
  const nluViews = parseCustomerQuery("Show me the products I viewed yesterday");
  assert(nluViews.intent === "view_history", "NLU parses view_history intent");
  assert(nluViews.dateFilter === "yesterday", "NLU extracts dateFilter 'yesterday'");

  // 8. NLU query: Search history question
  const nluSearches = parseCustomerQuery("Show my previous searches");
  assert(nluSearches.intent === "search_history", "NLU parses search_history intent");

  // 9. NLU query: Repeat search question
  const nluRepeat = parseCustomerQuery("Repeat my last search");
  assert(nluRepeat.intent === "repeat_search", "NLU parses repeat_search intent");

  // 10. NLU query: Restock question
  const nluRestock = parseCustomerQuery("When will size XXL come back for classic linen shirt?");
  assert(nluRestock.intent === "restock_info", "NLU parses restock_info intent");
  assert(nluRestock.targetSize === "XXL", "NLU extracts target size 'XXL'");

  // 11. Conversational orchestrator: Availability
  const orchAvail = await orchestrateAssistant({
    query: "Is classic linen shirt available in size M?",
  });
  assert(orchAvail.availability?.available === true, "Orchestrator returns verified availability metadata");
  assert(orchAvail.message.includes("available in size M"), "Orchestrator message reports size M availability");

  // 12. Conversational orchestrator: Out of stock availability
  const orchOos = await orchestrateAssistant({
    query: "Is classic linen shirt available in XXL in Terracotta?",
  });
  assert(orchOos.availability?.available === false, "Orchestrator reports out_of_stock accurately");
  assert(orchOos.message.includes("out of stock"), "Orchestrator message informs customer item is out of stock");

  // 13. Conversational orchestrator: Restock information
  const orchRestock = await orchestrateAssistant({
    query: "When is the restock for classic linen shirt in XXL?",
  });
  assert(orchRestock.restock?.hasRestockInfo === true, "Orchestrator returns genuine restock metadata");
  assert(orchRestock.message.includes("Restock expected"), "Orchestrator quotes scheduled restock date");

  // 14. Conversational orchestrator: Repeat search
  // First record a search for Customer A
  await recordSearchQuery({
    query: "handloom kurtas",
    filters: { category: "handloom" },
    userId: customerA.id,
  });

  const orchRepeat = await orchestrateAssistant({
    query: "Repeat my last search",
    userId: customerA.id,
  });
  assert(orchRepeat.products.length > 0, "Repeat search returns genuine matching products");
  assert(orchRepeat.message.includes("Repeating your previous inquiry"), "Orchestrator confirms repeated inquiry");

  // ------------------------------------------------------------------
  // SECTION 6: API ROUTES & SECURITY AUDIT
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 6: API ROUTES & SECURITY AUDIT ---");

  // 1. Views API: POST record view
  const reqPostView = createJsonRequest("http://localhost:3000/api/history/views", {
    method: "POST",
    body: { productId: "classic-linen-shirt" },
    cookie: sessionA.token,
  });
  const resPostView = await viewsPostHandler(reqPostView);
  assert(resPostView.status === 200, "POST /api/history/views returns HTTP 200");

  // 2. Views API: GET views
  const reqGetViews = createJsonRequest("http://localhost:3000/api/history/views", {
    method: "GET",
    cookie: sessionA.token,
  });
  const resGetViews = await viewsGetHandler(reqGetViews);
  assert(resGetViews.status === 200, "GET /api/history/views returns HTTP 200");
  const dataGetViews = await resGetViews.json();
  assert(dataGetViews.history.length > 0, "GET /api/history/views returns history list");
  assert(dataGetViews.isAuthenticated === true, "Reports authenticated status");

  // 3. Views API: DELETE views
  const reqDelViews = createJsonRequest("http://localhost:3000/api/history/views", {
    method: "DELETE",
    cookie: sessionA.token,
  });
  const resDelViews = await viewsDeleteHandler(reqDelViews);
  assert(resDelViews.status === 200, "DELETE /api/history/views returns HTTP 200");

  // 4. Searches API: POST record search
  const reqPostSearch = createJsonRequest("http://localhost:3000/api/history/searches", {
    method: "POST",
    body: { query: "summer linen", filters: { fabric: "linen" } },
    cookie: sessionA.token,
  });
  const resPostSearch = await searchesPostHandler(reqPostSearch);
  assert(resPostSearch.status === 200, "POST /api/history/searches returns HTTP 200");

  // 5. Searches API: GET searches
  const reqGetSearches = createJsonRequest("http://localhost:3000/api/history/searches", {
    method: "GET",
    cookie: sessionA.token,
  });
  const resGetSearches = await searchesGetHandler(reqGetSearches);
  assert(resGetSearches.status === 200, "GET /api/history/searches returns HTTP 200");
  const dataGetSearches = await resGetSearches.json();
  assert(dataGetSearches.searches.length > 0, "GET /api/history/searches returns search list");

  // 6. Searches API: DELETE searches
  const reqDelSearches = createJsonRequest("http://localhost:3000/api/history/searches", {
    method: "DELETE",
    cookie: sessionA.token,
  });
  const resDelSearches = await searchesDeleteHandler(reqDelSearches);
  assert(resDelSearches.status === 200, "DELETE /api/history/searches returns HTTP 200");

  // 7. Restock Notifications API: Unauthenticated rejection (HTTP 401)
  const reqUnauthNotif = createJsonRequest("http://localhost:3000/api/restock-notifications", {
    method: "POST",
    body: { variantId: variantOutOfStock.id },
  });
  const resUnauthNotif = await notificationsPostHandler(reqUnauthNotif);
  assert(resUnauthNotif.status === 401, "POST /api/restock-notifications rejects unauthenticated request with HTTP 401");

  // 8. Restock Notifications API: Authenticated subscription
  const reqAuthNotif = createJsonRequest("http://localhost:3000/api/restock-notifications", {
    method: "POST",
    body: { variantId: variantOutOfStock.id },
    cookie: sessionA.token,
  });
  const resAuthNotif = await notificationsPostHandler(reqAuthNotif);
  assert(resAuthNotif.status === 200, "POST /api/restock-notifications subscribes authenticated customer (HTTP 200)");
  const dataAuthNotif = await resAuthNotif.json();
  assert(typeof dataAuthNotif.notificationId === "string", "Returns registered notificationId");

  // 9. Restock Notifications API: GET list
  const reqListNotif = createJsonRequest("http://localhost:3000/api/restock-notifications", {
    method: "GET",
    cookie: sessionA.token,
  });
  const resListNotif = await notificationsGetHandler(reqListNotif);
  assert(resListNotif.status === 200, "GET /api/restock-notifications returns HTTP 200");
  const dataListNotif = await resListNotif.json();
  assert(dataListNotif.notifications.length === 1, "Customer A retrieves registered subscription");

  // 10. Restock Notifications API: Customer B cannot cancel Customer A's notification via API
  const reqCancelB = createJsonRequest("http://localhost:3000/api/restock-notifications", {
    method: "DELETE",
    body: { notificationId: dataAuthNotif.notificationId },
    cookie: sessionB.token,
  });
  const resCancelB = await notificationsDeleteHandler(reqCancelB);
  assert(resCancelB.status === 404, "Security: Customer B cannot cancel Customer A's restock alert via API (HTTP 404)");

  // 11. Restock Notifications API: Customer A cancels own subscription
  const reqCancelNotif = createJsonRequest("http://localhost:3000/api/restock-notifications", {
    method: "DELETE",
    body: { notificationId: dataAuthNotif.notificationId },
    cookie: sessionA.token,
  });
  const resCancelNotif = await notificationsDeleteHandler(reqCancelNotif);
  assert(resCancelNotif.status === 200, "DELETE /api/restock-notifications cancels subscription (HTTP 200)");

  // 12. Cross-Site Request Forgery (CSRF) Defense on History POST
  const reqCsrf = createJsonRequest("http://localhost:3000/api/history/views", {
    method: "POST",
    body: { productId: "classic-linen-shirt" },
    headers: { origin: "https://malicious-third-party.com", "sec-fetch-site": "cross-site" },
  });
  const resCsrf = await viewsPostHandler(reqCsrf);
  assert(resCsrf.status === 403, "CSRF Defense: Cross-site request rejected with HTTP 403 Forbidden");

  // 13. Chat API endpoint Phase 3B integration
  const reqChatAvail = createJsonRequest("http://localhost:3000/api/assistant/chat", {
    method: "POST",
    body: { message: "Is the classic linen shirt available in size M?" },
    cookie: sessionA.token,
  });
  const resChatAvail = await chatHandler(reqChatAvail);
  assert(resChatAvail.status === 200, "POST /api/assistant/chat processes Phase 3B query with HTTP 200");
  const dataChatAvail = await resChatAvail.json();
  assert(dataChatAvail.availability?.available === true, "Chat endpoint returns availability metadata");

  // ------------------------------------------------------------------
  // CLEANUP TEST DATA
  // ------------------------------------------------------------------
  try {
    await db.delete(restockRecords).where(eq(restockRecords.id, testRestock.id));
    await db.delete(productVariants).where(eq(productVariants.id, variantOutOfStock.id));
    await db.delete(users).where(eq(users.id, customerA.id));
    await db.delete(users).where(eq(users.id, customerB.id));
  } catch (err) {
    console.warn("Cleanup warning:", err);
  }

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(`PHASE 3B TEST RESULTS: ${passed}/${totalTests} PASSED (${Math.round((passed / totalTests) * 100)}%)`);
  console.log("======================================================================");

  if (passed !== totalTests) {
    process.exit(1);
  }
}

runPhase3bTestSuite()
  .then(() => {
    pool.end();
  })
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    pool.end();
    process.exit(1);
  });
