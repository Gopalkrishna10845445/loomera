import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { NextRequest } from "next/server";
import { db, pool } from "../src/db";
import { products, productVariants } from "../src/db/schema";
import {
  searchProducts,
  getProductDetails,
  getCollectionProducts,
  getSimilarProducts,
  getProductFilters,
} from "../src/lib/ai/tools";
import { parseCustomerQuery, buildConversationalResponse } from "../src/lib/ai/nlu";
import { checkAssistantRateLimit } from "../src/lib/ai/rate-limit";
import { orchestrateAssistant, executeAssistantTool } from "../src/lib/ai/orchestrator";
import { POST as chatHandler } from "../src/app/api/assistant/chat/route";
import { validateCartOnServer } from "../src/lib/products";
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

function createJsonRequest(url: string, body?: unknown, headers: Record<string, string> = {}): NextRequest {
  const reqHeaders = new Headers(headers);
  if (body) {
    reqHeaders.set("content-type", "application/json");
  }
  return new NextRequest(url, {
    method: "POST",
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runPhase3aTestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 3A AI SHOPPING ASSISTANT");
  console.log("======================================================================");

  // ------------------------------------------------------------------
  // SECTION 1: TOOL EXECUTION & POSTGRESQL VERIFICATION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 1: TOOL EXECUTION & POSTGRESQL VERIFICATION ---");

  // 1. searchProducts basic
  const allProds = await searchProducts({ limit: 10 });
  assert(allProds.length > 0, "searchProducts returns published products", `Got ${allProds.length}`);
  assert(allProds.every((p) => p.price > 0), "All returned products have valid positive INR prices");
  assert(allProds.every((p) => p.title && p.slug), "All returned products have title and slug");

  // 2. searchProducts with fabric filter
  const linenProds = await searchProducts({ fabric: "linen" });
  assert(linenProds.length > 0, "searchProducts filters by fabric 'linen'", `Got ${linenProds.length}`);
  assert(
    linenProds.every((p) => p.description.toLowerCase().includes("linen") || p.title.toLowerCase().includes("linen")),
    "All linen search results contain 'linen' in title or description"
  );

  // 3. searchProducts with maxPrice filter
  const under2000 = await searchProducts({ maxPrice: 2000 });
  assert(under2000.length > 0, "searchProducts filters by maxPrice <= ₹2,000", `Got ${under2000.length}`);
  assert(under2000.every((p) => p.price <= 2000), "All products under ₹2,000 strictly respect price ceiling");

  // 4. searchProducts sorting
  const sortedAsc = await searchProducts({ sort: "price-asc" });
  let isStrictAsc = true;
  for (let i = 1; i < sortedAsc.length; i++) {
    if (sortedAsc[i].price < sortedAsc[i - 1].price) isStrictAsc = false;
  }
  assert(isStrictAsc, "searchProducts sort 'price-asc' orders ascending by price");

  // 5. getProductDetails by slug and id
  const detailBySlug = await getProductDetails("classic-linen-shirt");
  assert(detailBySlug !== null, "getProductDetails resolves product by slug");
  assert(detailBySlug?.title === "Classic Linen Shirt", "Product detail returns authoritative title");
  assert(Array.isArray(detailBySlug?.sizes) && detailBySlug.sizes.length > 0, "Product detail returns real sizes array");
  assert(Array.isArray(detailBySlug?.colors) && detailBySlug.colors.length > 0, "Product detail returns real colors array");

  const detailById = await getProductDetails("classic-linen-shirt");
  assert(detailById?.id === "classic-linen-shirt", "getProductDetails resolves product by id");

  const nonExistent = await getProductDetails("non-existent-random-slug");
  assert(nonExistent === null, "getProductDetails returns null for invalid identifier");

  // 6. getCollectionProducts
  const menCol = await getCollectionProducts("men");
  assert(menCol.length > 0, "getCollectionProducts returns adult garments for 'men'");
  assert(menCol.every((p) => !p.category.toLowerCase().includes("boy")), "Men's collection excludes boys garments");

  const boysCol = await getCollectionProducts("boys");
  assert(boysCol.length > 0, "getCollectionProducts returns youth garments for 'boys'");
  assert(boysCol.every((p) => p.category.toLowerCase().includes("boy") || p.category.toLowerCase().includes("kid")), "Boys' collection contains youth garments");

  const handloomCol = await getCollectionProducts("handloom");
  assert(handloomCol.length > 0, "getCollectionProducts returns handloom heritage garments");

  // 7. getSimilarProducts
  const similarItems = await getSimilarProducts("classic-linen-shirt", 4);
  assert(similarItems.length > 0, "getSimilarProducts returns matching candidates", `Got ${similarItems.length}`);
  assert(similarItems.every((p) => p.id !== "classic-linen-shirt"), "getSimilarProducts strictly excludes target product itself");

  // 8. getProductFilters
  const filtersData = await getProductFilters();
  assert(filtersData.categories.length > 0, "getProductFilters returns category list from DB");
  assert(filtersData.sizes.length > 0, "getProductFilters returns size list from DB variants");
  assert(filtersData.colors.length > 0, "getProductFilters returns color list from DB variants");
  assert(filtersData.priceRange.min > 0 && filtersData.priceRange.max >= filtersData.priceRange.min, "getProductFilters derives catalog min and max price");

  // 9. executeAssistantTool & orchestrateAssistant dispatch
  const toolExec = await executeAssistantTool("search_products", { fabric: "linen", limit: 2 });
  assert(toolExec.products.length > 0, "executeAssistantTool successfully executes 'search_products'");

  const orchestrateDirect = await orchestrateAssistant({ query: "Hello", patronName: "Vikram" });
  assert(orchestrateDirect.products.length > 0, "orchestrateAssistant delivers verified products directly");
  assert(orchestrateDirect.message.includes("Vikram"), "orchestrateAssistant personalizes greeting with patron name");

  // ------------------------------------------------------------------
  // SECTION 2: NATURAL LANGUAGE UNDERSTANDING & ENTITY EXTRACTION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 2: NATURAL LANGUAGE UNDERSTANDING & ENTITY EXTRACTION ---");

  // 1. Price queries
  const q1 = parseCustomerQuery("Show me linen shirts under ₹2,000");
  assert(q1.intent === "search", "Parses shopping search intent");
  assert(q1.searchParams.fabric === "linen", "Extracts fabric 'linen'");
  assert(q1.searchParams.query === "shirt", "Extracts garment 'shirt'");
  assert(q1.searchParams.maxPrice === 2000, "Extracts price ceiling 2000");

  const q2 = parseCustomerQuery("Find kurtas between 1500 and 2500");
  assert(q2.searchParams.minPrice === 1500 && q2.searchParams.maxPrice === 2500, "Extracts price range between 1500 and 2500");

  // 2. Colors & sizes
  const q3 = parseCustomerQuery("Find blue shirts in size L");
  assert(q3.searchParams.color === "navy", "Normalizes blue to 'navy'");
  assert(q3.searchParams.size === "L", "Extracts size 'L'");

  const q4 = parseCustomerQuery("Show me white linen trousers");
  assert(q4.searchParams.color === "white", "Extracts color 'white'");
  assert(q4.searchParams.fabric === "linen", "Extracts fabric 'linen'");
  assert(q4.searchParams.query === "trouser", "Extracts garment 'trouser'");

  // 3. Category classification
  const qBoys = parseCustomerQuery("Show me boys traditional clothing");
  assert(qBoys.searchParams.category === "boys", "Extracts category 'boys'");

  // 4. Reset & Greeting
  const qReset = parseCustomerQuery("clear filters");
  assert(qReset.intent === "reset", "Extracts reset intent from 'clear filters'");

  const qHello = parseCustomerQuery("Hello");
  assert(qHello.intent === "greeting", "Extracts greeting intent from 'Hello'");

  // 5. Shipping Policy
  const qShip = parseCustomerQuery("What is your free shipping policy?");
  assert(qShip.intent === "shipping_info", "Extracts shipping_info intent");
  const shipResp = buildConversationalResponse(qShip, 0, {});
  assert(shipResp.message.includes("₹2,999"), "Shipping explanation quotes authoritative ₹2,999 threshold");

  // ------------------------------------------------------------------
  // SECTION 3: MULTI-TURN CONVERSATION & FILTER ACCUMULATION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 3: MULTI-TURN CONVERSATION & FILTER ACCUMULATION ---");

  // Turn 1: "Show me linen shirts"
  const turn1 = parseCustomerQuery("Show me linen shirts", {});
  assert(turn1.searchParams.fabric === "linen" && turn1.searchParams.query === "shirt", "Turn 1 sets fabric 'linen' and query 'shirt'");

  // Turn 2: "Only white ones" (accumulates over Turn 1)
  const turn2 = parseCustomerQuery("Only white ones", turn1.searchParams);
  assert(turn2.searchParams.fabric === "linen", "Turn 2 preserves fabric 'linen' from Turn 1");
  assert(turn2.searchParams.query === "shirt", "Turn 2 preserves query 'shirt' from Turn 1");
  assert(turn2.searchParams.color === "white", "Turn 2 accumulates color 'white'");

  // Turn 3: "Under 2000" (accumulates over Turn 2)
  const turn3 = parseCustomerQuery("under 2000", turn2.searchParams);
  assert(turn3.searchParams.fabric === "linen", "Turn 3 preserves fabric 'linen'");
  assert(turn3.searchParams.color === "white", "Turn 3 preserves color 'white'");
  assert(turn3.searchParams.maxPrice === 2000, "Turn 3 accumulates maxPrice 2000");

  // Turn 4: "Reset"
  const turn4 = parseCustomerQuery("reset", turn3.searchParams);
  assert(turn4.intent === "reset", "Turn 4 triggers clean reset");

  // ------------------------------------------------------------------
  // SECTION 4: CHAT API ROUTE & RATE LIMITING
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 4: CHAT API ROUTE & RATE LIMITING ---");

  // 1. Valid request to chat endpoint
  const chatReq1 = createJsonRequest("http://localhost:3000/api/assistant/chat", {
    message: "Show me linen shirts under 2000",
  });
  const chatRes1 = await chatHandler(chatReq1);
  assert(chatRes1.status === 200, "POST /api/assistant/chat returns HTTP 200", `Got ${chatRes1.status}`);

  const chatJson1 = await chatRes1.json();
  assert(chatJson1.success === true, "Chat response returns success: true");
  assert(typeof chatJson1.message === "string" && chatJson1.message.length > 0, "Chat response contains natural language message");
  assert(Array.isArray(chatJson1.products), "Chat response returns products array");
  assert(chatJson1.providerMode === "curated_nlu" || chatJson1.providerMode === "llm", "Chat response reports authoritative providerMode");

  // 2. Input validation: missing/empty message
  const chatReqEmpty = createJsonRequest("http://localhost:3000/api/assistant/chat", {
    message: "   ",
  });
  const chatResEmpty = await chatHandler(chatReqEmpty);
  assert(chatResEmpty.status === 400, "Rejects whitespace-only message with HTTP 400");

  // 3. Input validation: non-string message
  const chatReqNonStr = createJsonRequest("http://localhost:3000/api/assistant/chat", {
    message: 12345,
  });
  const chatResNonStr = await chatHandler(chatReqNonStr);
  assert(chatResNonStr.status === 400, "Rejects non-string message with HTTP 400");

  // 4. Input validation: message exceeding 500 chars
  const longMsg = "a".repeat(501);
  const chatReqLong = createJsonRequest("http://localhost:3000/api/assistant/chat", {
    message: longMsg,
  });
  const chatResLong = await chatHandler(chatReqLong);
  assert(chatResLong.status === 400, "Rejects message exceeding 500 characters with HTTP 400");

  // 5. Rate limiting unit verification
  const testIp = `test-ip-${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    checkAssistantRateLimit(testIp, 5, 60000);
  }
  const blockedRate = checkAssistantRateLimit(testIp, 5, 60000);
  assert(blockedRate.allowed === false, "Enforces rate limit after exceeding request quota");
  assert(blockedRate.resetInSeconds > 0, "Provides resetInSeconds cooldown countdown");

  // ------------------------------------------------------------------
  // SECTION 5: DATA INTEGRITY & ANTI-HALLUCINATION AUDIT
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 5: DATA INTEGRITY & ANTI-HALLUCINATION AUDIT ---");

  // Verify that all products returned by assistant are genuine database records
  const assistantResults = await searchProducts({ limit: 20 });
  const dbProducts = await db.select().from(products).where(eq(products.isPublished, true));
  const dbProductMap = new Map(dbProducts.map((p) => [p.id, p]));

  let allProductsLegit = true;
  let allPricesAuthoritative = true;

  for (const ap of assistantResults) {
    const dbMatch = dbProductMap.get(ap.id);
    if (!dbMatch) {
      allProductsLegit = false;
      break;
    }
    // Verify price matches basePriceInr or valid sale price
    if (ap.price !== dbMatch.basePriceInr) {
      allPricesAuthoritative = false;
      break;
    }
  }

  assert(allProductsLegit, "Anti-Hallucination: 100% of assistant products exist in PostgreSQL products table");
  assert(allPricesAuthoritative, "Anti-Hallucination: 100% of product prices match database basePriceInr");

  // Verify variants: every size returned by assistant exists in product_variants
  let allVariantsLegit = true;
  for (const ap of assistantResults) {
    const dbVariants = await db.select().from(productVariants).where(eq(productVariants.productId, ap.id));
    const dbSizes = new Set(dbVariants.map((v) => v.size));
    for (const size of ap.sizes) {
      if (!dbSizes.has(size)) {
        allVariantsLegit = false;
        break;
      }
    }
  }
  assert(allVariantsLegit, "Anti-Hallucination: 100% of assistant sizes exist in PostgreSQL product_variants");

  // ------------------------------------------------------------------
  // SECTION 6: CART & PRICING VERIFICATION INTEGRATION
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 6: CART & PRICING VERIFICATION INTEGRATION ---");

  // Simulate an item recommended by the assistant being added to the server-verified cart
  const sampleAssistantItem = assistantResults[0];
  const cartValidation = await validateCartOnServer([
    {
      productId: sampleAssistantItem.id,
      color: sampleAssistantItem.colors[0],
      size: sampleAssistantItem.sizes[0],
      quantity: 1,
      clientPrice: sampleAssistantItem.price,
    },
  ]);

  assert(cartValidation.isValid, "Assistant product passes server-authoritative cart validation");
  assert(cartValidation.items.length === 1, "Server cart contains 1 verified item line");
  assert(cartValidation.subtotal === sampleAssistantItem.price, "Server cart subtotal matches assistant verified price");
  assert(cartValidation.priceTampered === false, "Honest assistant price does not trigger tampering flag");

  // Tampered client price detection
  const tamperedValidation = await validateCartOnServer([
    {
      productId: sampleAssistantItem.id,
      color: sampleAssistantItem.colors[0],
      size: sampleAssistantItem.sizes[0],
      quantity: 1,
      clientPrice: 1, // Tampered client price
    },
  ]);

  assert(tamperedValidation.priceTampered === true, "Server detects tampered client price on assistant product");
  assert(
    tamperedValidation.subtotal === sampleAssistantItem.price,
    "Authoritative server price overrides tampered price"
  );

  // ------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(`PHASE 3A TEST RESULTS: ${passed}/${totalTests} PASSED (${Math.round((passed / totalTests) * 100)}%)`);
  console.log("======================================================================");

  if (passed !== totalTests) {
    process.exit(1);
  }
}

runPhase3aTestSuite()
  .then(() => {
    pool.end();
  })
  .catch((err) => {
    console.error("Test execution fatal error:", err);
    pool.end();
    process.exit(1);
  });
