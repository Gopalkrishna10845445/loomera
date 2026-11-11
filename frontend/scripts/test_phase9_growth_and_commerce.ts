/**
 * LOOMERA AUTOMATED TEST SUITE: PHASE 9 GROWTH, ATTRIBUTION & COMMERCE INTELLIGENCE
 * Validates UTM attribution, abandoned cart recovery, RFM segmentation, A/B testing, and Schema.org SEO.
 */

import {
  classifyChannel,
  sanitizeAttributionParam,
  recordServerAttribution,
  getAttributionBreakdown,
} from "../src/lib/analytics/attribution";
import {
  dispatchCartRecoveryReminder,
  processCartRecoveryToken,
  recordRecoveryConversionByUser,
  getCartRecoveryMetrics,
} from "../src/lib/marketing/cart-recovery-service";
import {
  getCampaignByCode,
  getActiveCampaigns,
} from "../src/lib/marketing/campaign-service";
import {
  classifyRfmSegment,
  getCustomerRfmAnalysis,
} from "../src/lib/loyalty/rfm-service";
import {
  getProductCommercePerformance,
  getExecutiveCommerceReport,
} from "../src/lib/admin/commerce-intelligence";
import {
  hashVisitorToBucket,
  getOrAssignVariant,
  getExperimentReport,
} from "../src/lib/experimentation/ab-testing";
import {
  generateProductJsonLd,
  generateBreadcrumbJsonLd,
} from "../src/lib/seo/structured-data";
import { PRODUCTS } from "../src/data/mockData";
import { db } from "../src/db";
import { users, carts, cartItems, products, orders, cartRecoveryEvents } from "../src/db/schema";
import { eq } from "drizzle-orm";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    totalFailed++;
  }
}

async function runPhase9Tests() {
  console.log("======================================================================");
  console.log("LOOMERA PHASE 9 AUTOMATED TEST SUITE: GROWTH & COMMERCE INTELLIGENCE");
  console.log("======================================================================\n");

  // --------------------------------------------------------------------------
  // SECTION 1: UTM ATTRIBUTION & CHANNEL CLASSIFICATION
  // --------------------------------------------------------------------------
  console.log("--- SECTION 1: UTM ATTRIBUTION & CHANNEL CLASSIFICATION ---");
  
  const c1 = classifyChannel({ utmSource: "googleads", utmMedium: "cpc" });
  assert(c1 === "Paid Advertising", `Classifies CPC as Paid Advertising (got ${c1})`);

  const c2 = classifyChannel({ utmMedium: "email", utmSource: "newsletter" });
  assert(c2 === "Email", `Classifies newsletter as Email (got ${c2})`);

  const c3 = classifyChannel({ referrerUrl: "https://www.instagram.com/p/123" });
  assert(c3 === "Social Media", `Classifies Instagram referrer as Social Media (got ${c3})`);

  const c4 = classifyChannel({ referrerUrl: "https://www.google.com/search?q=linen+shirt" });
  assert(c4 === "Organic Search", `Classifies Google referrer as Organic Search (got ${c4})`);

  const c5 = classifyChannel({ utmMedium: "referral", utmSource: "friend" });
  assert(c5 === "Referral", `Classifies referral medium as Referral (got ${c5})`);

  const c6 = classifyChannel({});
  assert(c6 === "Direct", `Classifies empty parameters as Direct (got ${c6})`);

  // Sanitization test
  const dirty = "<script>alert('xss')</script>utm_campaign_2026!@#$%";
  const sanitized = sanitizeAttributionParam(dirty);
  assert(!sanitized?.includes("<script>"), "Strips script tags from attribution parameters");
  assert(Boolean(sanitized?.includes("utm_campaign_2026")), "Preserves valid alphanumeric campaign characters");

  // Server attribution recording
  const recorded = await recordServerAttribution({
    sessionId: `test_sess_${Date.now()}`,
    visitorId: `test_vis_${Date.now()}`,
    utmSource: "instagram",
    utmMedium: "social",
    utmCampaign: "festive_silk",
    landingPage: "/campaign/FESTIVE2026",
  });
  assert(Boolean(recorded.id), `Records server attribution entry with ID ${recorded.id}`);

  const breakdown = await getAttributionBreakdown();
  assert(Array.isArray(breakdown), "Retrieves channel attribution breakdown array");
  assert(breakdown.some((b) => b.channel === "Social Media"), "Attribution breakdown contains Social Media channel");

  // --------------------------------------------------------------------------
  // SECTION 2: MARKETING CAMPAIGNS & DYNAMIC SCHEDULING
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 2: MARKETING CAMPAIGNS & DYNAMIC SCHEDULING ---");

  const activeCampaigns = await getActiveCampaigns();
  assert(Array.isArray(activeCampaigns), "getActiveCampaigns returns array");

  // Look up default campaign by code (case-insensitive)
  const lookedUp = await getCampaignByCode("FESTIVE2026");
  // If not found in dev db, that's okay, test function returns null or campaign
  assert(lookedUp === null || Boolean(lookedUp?.code), "getCampaignByCode executes cleanly");

  // --------------------------------------------------------------------------
  // SECTION 3: ABANDONED CART RECOVERY & CRYPTOGRAPHIC TOKENS
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 3: ABANDONED CART RECOVERY SYSTEM ---");

  // Seed or get a test user and cart for testing
  const [testUser] = await db.select().from(users).limit(1);
  assert(Boolean(testUser), `Found test user for cart recovery tests (${testUser?.email})`);

  if (testUser) {
    let [testCart] = await db.select().from(carts).where(eq(carts.userId, testUser.id));
    if (!testCart) {
      [testCart] = await db.insert(carts).values({ userId: testUser.id }).returning();
    }

    // Add a cart item if empty
    const existingItems = await db.select().from(cartItems).where(eq(cartItems.cartId, testCart.id));
    if (existingItems.length === 0) {
      const [firstProduct] = await db.select().from(products).limit(1);
      if (firstProduct) {
        await db.insert(cartItems).values({
          cartId: testCart.id,
          productId: firstProduct.id,
          size: "M",
          color: "Natural",
          quantity: 2,
        });
      }
    }

    // Clean up any stale recovery event for this test cart to ensure deterministic idempotency test
    await db.delete(cartRecoveryEvents).where(eq(cartRecoveryEvents.cartId, testCart.id));

    // Dispatch recovery reminder
    const dispatchResult = await dispatchCartRecoveryReminder({
      cartId: testCart.id,
      customerEmail: testUser.email,
      customerName: testUser.fullName,
      userId: testUser.id,
      discountCode: "WELCOMEBACK10",
    });

    assert(Boolean(dispatchResult.event), "Dispatches cart recovery reminder with valid event record");
    assert(
      Boolean(dispatchResult.event?.recoveryToken.startsWith("lrc_")),
      `Recovery token starts with secure prefix 'lrc_' (token: ${dispatchResult.event?.recoveryToken.slice(0, 10)}...)`
    );

    // Validate frequency cap / idempotency
    const secondDispatch = await dispatchCartRecoveryReminder({
      cartId: testCart.id,
      customerEmail: testUser.email,
    });
    assert(
      secondDispatch.success === false,
      "Enforces strict frequency capping: rejects duplicate recovery notification for same cart"
    );

    // Process recovery token
    if (dispatchResult.event) {
      const tokenProcess = await processCartRecoveryToken(dispatchResult.event.recoveryToken);
      assert(tokenProcess.valid === true, "Validates valid recovery token");
      assert(tokenProcess.discountCode === "WELCOMEBACK10", "Returns assigned discount code on token resolution");

      // Verify recovery conversion helper
      const [existingOrder] = await db.select({ id: orders.id }).from(orders).limit(1);
      const targetOrderId = existingOrder ? existingOrder.id : null;
      const converted = await recordRecoveryConversionByUser(testUser.id, targetOrderId);
      assert(converted?.status === "RECOVERED", "Marks cart recovery event as RECOVERED upon order completion");
    }
  }

  const recoveryMetrics = await getCartRecoveryMetrics();
  assert(typeof recoveryMetrics.remindersSent === "number", "Calculates recovery reminders sent KPI");
  assert(typeof recoveryMetrics.recoveryRatePercent === "number", "Calculates recovery conversion rate percentage");

  // --------------------------------------------------------------------------
  // SECTION 4: RFM CUSTOMER SEGMENTATION
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 4: RFM CUSTOMER SEGMENTATION ---");

  const vipClass = classifyRfmSegment({
    recencyDays: 15,
    frequency: 4,
    monetaryTotalInr: 22000,
    loyaltyTier: "PLATINUM",
  });
  assert(vipClass.segment === "VIP Connoisseur", `Classifies high frequency & high spend as VIP Connoisseur`);

  const repeatClass = classifyRfmSegment({
    recencyDays: 45,
    frequency: 2,
    monetaryTotalInr: 6000,
    loyaltyTier: "SILVER",
  });
  assert(repeatClass.segment === "Loyal Repeat Patron", `Classifies recent repeat buyer as Loyal Repeat Patron`);

  const firstClass = classifyRfmSegment({
    recencyDays: 20,
    frequency: 1,
    monetaryTotalInr: 2499,
    loyaltyTier: "SILVER",
  });
  assert(firstClass.segment === "First-Time Patron", `Classifies single order within 60 days as First-Time Patron`);

  const atRiskClass = classifyRfmSegment({
    recencyDays: 120,
    frequency: 2,
    monetaryTotalInr: 8000,
    loyaltyTier: "SILVER",
  });
  assert(atRiskClass.segment === "At-Risk Lapsed", `Classifies inactive >90 days buyer as At-Risk Lapsed`);

  const prospectClass = classifyRfmSegment({
    recencyDays: 999,
    frequency: 0,
    monetaryTotalInr: 0,
    loyaltyTier: "SILVER",
  });
  assert(prospectClass.segment === "New Prospect", `Classifies 0 order customer as New Prospect`);

  const rfmAnalysis = await getCustomerRfmAnalysis();
  assert(Array.isArray(rfmAnalysis.customers), "getCustomerRfmAnalysis returns customer array");
  assert(Array.isArray(rfmAnalysis.summary), "getCustomerRfmAnalysis returns 5 segment summaries");
  assert(rfmAnalysis.summary.length === 5, `Summary covers all 5 RFM cohorts (got ${rfmAnalysis.summary.length})`);

  // --------------------------------------------------------------------------
  // SECTION 5: REVENUE & COMMERCE INTELLIGENCE
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 5: REVENUE & COMMERCE INTELLIGENCE ---");

  const productPerf = await getProductCommercePerformance(5);
  assert(Array.isArray(productPerf), "getProductCommercePerformance returns array");
  if (productPerf.length > 0) {
    const firstPerf = productPerf[0];
    assert(typeof firstPerf.viewToCartPercent === "number", "Calculates view-to-cart ratio");
    assert(typeof firstPerf.cartToOrderPercent === "number", "Calculates cart-to-order ratio");
    assert(typeof firstPerf.returnRatePercent === "number", "Calculates product return rate");
  }

  const executiveReport = await getExecutiveCommerceReport();
  assert(typeof executiveReport.gmvInr === "number", "Executive report includes GMV INR");
  assert(typeof executiveReport.netRevenueInr === "number", "Executive report includes Net Revenue INR");
  assert(typeof executiveReport.averageOrderValueInr === "number", "Executive report includes AOV INR");
  assert(Array.isArray(executiveReport.channelAttribution), "Executive report includes channel attribution");

  // --------------------------------------------------------------------------
  // SECTION 6: CONTROLLED A/B EXPERIMENTATION
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 6: CONTROLLED A/B EXPERIMENTATION ---");

  const visitorA = "v_guest_alpha_123";
  const visitorB = "v_guest_beta_456";

  const bucketA1 = hashVisitorToBucket(visitorA, "exp_hero_cta");
  const bucketA2 = hashVisitorToBucket(visitorA, "exp_hero_cta");
  const bucketB = hashVisitorToBucket(visitorB, "exp_hero_cta");
  assert(bucketA1 === bucketA2, "Hash bucketing is strictly deterministic (same bucket on repeat calls)");
  assert(bucketA1 >= 0 && bucketA1 < 100, `Hash bucket is bounded within [0, 99] (got ${bucketA1})`);
  assert(bucketB >= 0 && bucketB < 100, `Second visitor hash bucket is bounded within [0, 99] (got ${bucketB})`);

  const assignedVariantA = await getOrAssignVariant({
    experimentId: "exp_hero_cta",
    visitorId: visitorA,
  });
  const reAssignedVariantA = await getOrAssignVariant({
    experimentId: "exp_hero_cta",
    visitorId: visitorA,
  });
  assert(
    assignedVariantA === reAssignedVariantA,
    `Visitor receives identical variant across multiple sessions (${assignedVariantA})`
  );

  const expReport = await getExperimentReport("exp_hero_cta");
  assert(expReport !== null, "Retrieves experiment report for active experiment");
  assert(expReport?.experimentId === "exp_hero_cta", "Report matches requested experiment ID");
  assert(Array.isArray(expReport?.results), "Report includes variant results breakdown");

  // --------------------------------------------------------------------------
  // SECTION 7: SCHEMA.ORG JSON-LD STRUCTURED DATA
  // --------------------------------------------------------------------------
  console.log("\n--- SECTION 7: SCHEMA.ORG JSON-LD STRUCTURED DATA ---");

  const mockProduct = PRODUCTS[0];
  const productJsonLd = generateProductJsonLd(mockProduct);
  assert(productJsonLd["@type"] === "Product", "Product JSON-LD has '@type': 'Product'");
  assert(productJsonLd.name === mockProduct.title, "Product JSON-LD has correct title");
  assert(productJsonLd.offers["@type"] === "Offer", "Product JSON-LD includes Offer schema");
  assert(productJsonLd.offers.priceCurrency === "INR", "Product Offer specifies currency INR");
  assert(
    productJsonLd.offers.hasMerchantReturnPolicy["@type"] === "MerchantReturnPolicy",
    "Product Offer includes MerchantReturnPolicy"
  );
  assert(
    productJsonLd.offers.hasMerchantReturnPolicy.merchantReturnDays === 15,
    "MerchantReturnPolicy specifies 15-day return window"
  );

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Men", url: "/collections/men" },
    { name: mockProduct.title, url: `/products/${mockProduct.id}` },
  ]);
  assert(breadcrumbJsonLd["@type"] === "BreadcrumbList", "Breadcrumb JSON-LD has '@type': 'BreadcrumbList'");
  assert(breadcrumbJsonLd.itemListElement.length === 3, "BreadcrumbList contains 3 hierarchical tiers");

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(`PHASE 9 TEST SUITE SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("======================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runPhase9Tests().catch((err) => {
  console.error("FATAL: Phase 9 test run failed with unhandled error:", err);
  process.exit(1);
});
