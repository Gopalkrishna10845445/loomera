import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { formatInr, parsePrice } from "../src/lib/currency";
import {
  calculatePriceBreakdown,
  calculateShipping,
  calculateCartSubtotal,
  SHIPPING_CONFIG,
} from "../src/lib/pricing";
import {
  getProductsFromDb,
  getProductBySlugFromDb,
  validateCartOnServer,
} from "../src/lib/products";
import { db, pool } from "../src/db";
import { products } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function runTestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PRICING ENGINE & CATALOG REFINEMENT");
  console.log("======================================================================");

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${detail || ""}`);
      process.exitCode = 1;
    }
  }

  // ============================================================================
  // 1. CURRENCY ENGINE TESTS
  // ============================================================================
  console.log("\n--- SECTION 1: CURRENCY ENGINE (INR FORMATTING) ---");

  // Standard pricing
  assert("Formats standard price (2499 -> ₹2,499)", formatInr(2499) === "₹2,499", `Got ${formatInr(2499)}`);
  assert("Formats round price (1500 -> ₹1,500)", formatInr(1500) === "₹1,500", `Got ${formatInr(1500)}`);
  assert("Formats sub-thousand price (999 -> ₹999)", formatInr(999) === "₹999", `Got ${formatInr(999)}`);

  // Zero & Large prices
  assert("Formats zero price (0 -> ₹0)", formatInr(0) === "₹0", `Got ${formatInr(0)}`);
  const largeFormatted = formatInr(100000);
  assert("Formats large price with Indian grouping (100000 -> ₹1,00,000)", largeFormatted === "₹1,00,000", `Got ${largeFormatted}`);

  // Decimals
  const decFormatted = formatInr(2499.5, { showDecimals: true });
  assert("Formats decimal values when requested (2499.50 -> ₹2,499.50)", decFormatted === "₹2,499.50", `Got ${decFormatted}`);
  const autoDecFormatted = formatInr(2499.5);
  assert("Auto-detects fractional paise (2499.50 -> ₹2,499.50)", autoDecFormatted === "₹2,499.50", `Got ${autoDecFormatted}`);

  // Invalid and missing values
  assert("Handles NaN gracefully (returns ₹0)", formatInr(NaN) === "₹0", `Got ${formatInr(NaN)}`);
  assert("Handles null gracefully (returns ₹0)", formatInr(null) === "₹0", `Got ${formatInr(null)}`);
  assert("Handles undefined gracefully (returns ₹0)", formatInr(undefined) === "₹0", `Got ${formatInr(undefined)}`);
  assert("Custom fallback on missing value", formatInr(null, { fallback: "Price on request" }) === "Price on request");

  // String parser
  assert("Parses formatted INR string '₹2,499' -> 2499", parsePrice("₹2,499") === 2499);
  assert("Parses formatted INR with decimals '₹1,499.50' -> 1499.5", parsePrice("₹1,499.50") === 1499.5);

  // ============================================================================
  // 2. PRICING & DISCOUNT LOGIC TESTS
  // ============================================================================
  console.log("\n--- SECTION 2: PRICING & DISCOUNT LOGIC ---");

  // Regular price (no discount)
  const reg = calculatePriceBreakdown(2499);
  assert("Regular price: salePrice is 2499", reg.salePrice === 2499);
  assert("Regular price: originalPrice equals salePrice", reg.originalPrice === 2499);
  assert("Regular price: isOnSale is false", reg.isOnSale === false);
  assert("Regular price: discountPercent is 0", reg.discountPercent === 0);

  // Discounted price
  const disc = calculatePriceBreakdown(2000, 2500);
  assert("Discounted price: salePrice is 2000", disc.salePrice === 2000);
  assert("Discounted price: originalPrice is 2500", disc.originalPrice === 2500);
  assert("Discounted price: discountPercent is 20%", disc.discountPercent === 20);
  assert("Discounted price: isOnSale is true", disc.isOnSale === true);
  assert("Discounted price: discountAmount is 500", disc.discountAmount === 500);

  // Edge case: Invalid sale price exceeding original price (Rule 5: discounted price cannot exceed original price)
  const invalidSale = calculatePriceBreakdown(3000, 2500);
  assert("Invalid sale price > original: original clamped to sale price", invalidSale.originalPrice === 3000);
  assert("Invalid sale price > original: discountPercent is 0", invalidSale.discountPercent === 0);
  assert("Invalid sale price > original: isOnSale is false", invalidSale.isOnSale === false);

  // Cart subtotal calculation
  const subtotal = calculateCartSubtotal([
    { price: 2499, quantity: 2 },
    { price: 1699, quantity: 1 },
  ]);
  assert("Cart subtotal calculates 2x2499 + 1x1699 = 6697", subtotal === 6697, `Got ${subtotal}`);

  // Cart subtotal sanitizes invalid inputs
  const sanitizedSubtotal = calculateCartSubtotal([
    { price: 2499, quantity: -1 }, // invalid quantity ignored
    { price: -500, quantity: 2 },  // negative price ignored
    { price: 1000, quantity: 1.8 }, // floored to 1
  ]);
  assert("Cart subtotal ignores negative quantities and prices", sanitizedSubtotal === 1000, `Got ${sanitizedSubtotal}`);

  // ============================================================================
  // 3. SHIPPING CONFIGURATION & THRESHOLD TESTS
  // ============================================================================
  console.log("\n--- SECTION 3: SHIPPING THRESHOLD CONSISTENCY ---");

  assert("Centralized free shipping threshold is ₹2,999", SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR === 2999);

  // Empty cart
  const shipEmpty = calculateShipping(0);
  assert("Empty cart: progress is 0%", shipEmpty.progressPercent === 0);
  assert("Empty cart: amountRemaining is ₹2,999", shipEmpty.amountRemaining === 2999);
  assert("Empty cart: isFreeShipping is false", shipEmpty.isFreeShipping === false);

  // Below threshold
  const shipBelow = calculateShipping(1699);
  assert("Below threshold (₹1,699): amountRemaining is ₹1,300", shipBelow.amountRemaining === 1300);
  assert("Below threshold: progress is 57%", shipBelow.progressPercent === 57, `Got ${shipBelow.progressPercent}%`);
  assert("Below threshold: isFreeShipping is false", shipBelow.isFreeShipping === false);
  assert("Below threshold: shipping fee applied", shipBelow.shippingFee === SHIPPING_CONFIG.STANDARD_SHIPPING_FEE_INR);

  // Exactly equal to threshold
  const shipEqual = calculateShipping(2999);
  assert("Equal to threshold (₹2,999): amountRemaining is 0", shipEqual.amountRemaining === 0);
  assert("Equal to threshold: progress is 100%", shipEqual.progressPercent === 100);
  assert("Equal to threshold: isFreeShipping is true", shipEqual.isFreeShipping === true);
  assert("Equal to threshold: shipping fee is 0", shipEqual.shippingFee === 0);

  // Above threshold
  const shipAbove = calculateShipping(4198);
  assert("Above threshold (₹4,198): progress is 100%", shipAbove.progressPercent === 100);
  assert("Above threshold: isFreeShipping is true", shipAbove.isFreeShipping === true);
  assert("Above threshold: amountRemaining is 0", shipAbove.amountRemaining === 0);

  // ============================================================================
  // 4. SERVER-AUTHORITATIVE PRICE VALIDATION & SECURITY
  // ============================================================================
  console.log("\n--- SECTION 4: SERVER-AUTHORITATIVE PRICE VALIDATION ---");

  // Legitimate client cart
  const legitCart = await validateCartOnServer([
    { productId: "classic-linen-shirt", color: "Cream", size: "M", quantity: 1, clientPrice: 2499 },
    { productId: "boys-linen-shirt", color: "Ecru", size: "8 YRS", quantity: 1, clientPrice: 1699 },
  ]);
  assert("Legitimate cart: isValid is true", legitCart.isValid === true);
  assert("Legitimate cart: subtotal is 4198", legitCart.subtotal === 4198);
  assert("Legitimate cart: priceTampered is false", legitCart.priceTampered === false);
  assert("Legitimate cart: free shipping unlocked (> ₹2,999)", legitCart.shipping.isFreeShipping === true);

  // Tampered client price (Client sends ₹1 instead of ₹2,499)
  const tamperedCart = await validateCartOnServer([
    { productId: "classic-linen-shirt", color: "Cream", size: "M", quantity: 1, clientPrice: 1 },
  ]);
  assert("Tampered cart: detects price mismatch", tamperedCart.priceTampered === true);
  assert("Tampered cart: authoritative server price overrides client (₹2,499)", tamperedCart.subtotal === 2499);
  assert("Tampered cart: item verifiedPrice is 2499", tamperedCart.items[0].verifiedPrice === 2499);

  // Unavailable or non-existent product
  const nonExistentCart = await validateCartOnServer([
    { productId: "fake-non-existent-product", quantity: 1 },
  ]);
  assert("Non-existent product: isValid is false", nonExistentCart.isValid === false);
  assert("Non-existent product: reports unavailable item", nonExistentCart.items[0].isAvailable === false);

  // ============================================================================
  // 5. DATABASE-DRIVEN COLLECTION FILTERING TESTS
  // ============================================================================
  console.log("\n--- SECTION 5: DATABASE-DRIVEN COLLECTION FILTERING ---");

  // Men's collection
  const menProds = await getProductsFromDb({ category: "men" });
  assert("Men's collection returns 5 adult garments", menProds.length === 5, `Got ${menProds.length}`);
  const hasBoysInMen = menProds.some((p) => p.categorySlug === "boys" || p.categorySlug === "kids");
  assert("Men's collection contains 0 boys/kids products", !hasBoysInMen);

  // Strict Men's category filter
  const strictMen = await getProductsFromDb({ category: "men", strictCategory: true });
  assert("Strict Men's category returns 3 items", strictMen.length === 3, `Got ${strictMen.length}`);
  assert("Strict Men's category items all have categorySlug 'men'", strictMen.every((p) => p.categorySlug === "men"));

  // Boys' collection
  const boysProds = await getProductsFromDb({ category: "boys" });
  assert("Boys' collection returns 3 youth garments (including kids alias)", boysProds.length === 3, `Got ${boysProds.length}`);
  const hasAdultInBoys = boysProds.some((p) => p.categorySlug === "men");
  assert("Boys' collection contains 0 adult products", !hasAdultInBoys);

  // Handloom collection
  const handloomProds = await getProductsFromDb({ category: "handloom" });
  assert("Handloom collection returns 2 kurtas", handloomProds.length === 2, `Got ${handloomProds.length}`);
  assert("All handloom products have categorySlug 'handloom'", handloomProds.every((p) => p.categorySlug === "handloom"));

  // New arrivals
  const newArrivals = await getProductsFromDb({ sort: "newest" });
  assert("New arrivals returns all 8 published products", newArrivals.length === 8);
  const firstItemBadge = newArrivals[0].badge.toLowerCase();
  assert("New arrivals places 'New' badge items first", firstItemBadge.includes("new"));

  // Empty collection
  const emptyCol = await getProductsFromDb({ category: "non-existent-category" });
  assert("Non-existent category returns empty array (graceful empty state)", emptyCol.length === 0);

  // Distinct products (no duplicates)
  const allProds = await getProductsFromDb();
  const idSet = new Set(allProds.map((p) => p.id));
  assert("Collection contains zero duplicate products (8 unique IDs)", idSet.size === allProds.length);

  // Search combined with category
  const searchInMen = await getProductsFromDb({ category: "men", search: "linen" });
  assert("Search 'linen' within 'men' returns matching garments", searchInMen.length > 0);
  assert("Search 'linen' within 'men' excludes boys garments", !searchInMen.some((p) => p.categorySlug === "boys"));

  // Sorting combined with category
  const sortedMen = await getProductsFromDb({ category: "men", sort: "price-asc" });
  let isSortedAsc = true;
  for (let i = 1; i < sortedMen.length; i++) {
    if (sortedMen[i].price < sortedMen[i - 1].price) isSortedAsc = false;
  }
  assert("Sort 'price-asc' within category is strictly ordered low-to-high", isSortedAsc);

  // ============================================================================
  // 6. PRODUCT CATALOG DATA VALIDATION TESTS
  // ============================================================================
  console.log("\n--- SECTION 6: PRODUCT CATALOG DATA INTEGRITY ---");

  // Verify reconciled INR prices for kids-romper and boys-drawstring-shorts
  const romper = await getProductBySlugFromDb("kids-romper");
  assert("kids-romper has reconciled INR price ₹1,299", romper?.price === 1299, `Got ₹${romper?.price}`);

  const shorts = await getProductBySlugFromDb("boys-drawstring-shorts");
  assert("boys-drawstring-shorts has reconciled INR price ₹1,499", shorts?.price === 1499, `Got ₹${shorts?.price}`);

  // Unpublished products exclusion
  const testUnpublishedId = "test-unpublished-temp";
  try {
    // Insert temporary unpublished product to verify exclusion
    await db.insert(products).values({
      id: testUnpublishedId,
      slug: "test-unpublished-temp-slug",
      title: "Test Unpublished Shirt",
      description: "Should never appear in storefront catalog",
      basePriceInr: 9999,
      categorySlug: "men",
      isPublished: false,
    });

    const publicCatalog = await getProductsFromDb();
    const containsUnpublished = publicCatalog.some((p) => p.id === testUnpublishedId);
    assert("Public storefront API excludes unpublished products", !containsUnpublished);

    const slugLookup = await getProductBySlugFromDb(testUnpublishedId);
    assert("Single product API excludes unpublished products", slugLookup === null);
  } finally {
    // Clean up temporary test product
    await db.delete(products).where(eq(products.id, testUnpublishedId));
  }

  // Slugs and numeric prices
  for (const p of allProds) {
    assert(`Product [${p.id}] has valid non-empty slug`, typeof p.slug === "string" && p.slug.length > 0);
    assert(`Product [${p.id}] has valid numeric price (₹${p.price})`, typeof p.price === "number" && p.price >= 999);
    assert(`Product [${p.id}] has at least one color swatch`, p.swatches.length > 0);
    assert(`Product [${p.id}] has at least one size`, p.sizes.length > 0);
  }

  console.log("\n======================================================================");
  console.log(`FINAL RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("======================================================================");

  await pool.end();
  process.exit(passed === total ? 0 : 1);
}

runTestSuite().catch((err) => {
  console.error("Test execution encountered an unhandled error:", err);
  process.exit(1);
});
