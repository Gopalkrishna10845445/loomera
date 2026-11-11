import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getProductsFromDb, getProductBySlugFromDb } from "../src/lib/products";
import { pool } from "../src/db";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING POSTGRESQL & DRIZZLE DATA-ACCESS TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${detail || ""}`);
    }
  }

  // Test 1: Fetch all products
  const allProds = await getProductsFromDb();
  assert("Fetch all products returns 8 items", allProds.length === 8, `Got ${allProds.length}`);

  // Test 2: Category filter 'men'
  const menProds = await getProductsFromDb({ category: "men" });
  assert("Category 'men' returns 5 items", menProds.length === 5, `Got ${menProds.length}`);

  // Test 3: Category filter 'boys'
  const boysProds = await getProductsFromDb({ category: "boys" });
  assert("Category 'boys' returns 3 items", boysProds.length === 3, `Got ${boysProds.length}`);
  const adultInBoys = boysProds.some(p => p.categorySlug === "men");
  assert("Boys collection contains 0 adult products", !adultInBoys);

  // Test 4: Category filter 'handloom'
  const hlProds = await getProductsFromDb({ category: "handloom" });
  assert("Category 'handloom' returns 2 kurtas", hlProds.length === 2, `Got ${hlProds.length}`);

  // Test 5: Search for 'kurta'
  const searchProds = await getProductsFromDb({ search: "kurta" });
  assert("Search 'kurta' returns 2 items", searchProds.length === 2, `Got ${searchProds.length}`);

  // Test 6: Price sorting 'price-asc'
  const sortedProds = await getProductsFromDb({ sort: "price-asc" });
  let isSorted = true;
  for (let i = 0; i < sortedProds.length - 1; i++) {
    if (sortedProds[i].price > sortedProds[i + 1].price) {
      isSorted = false;
      break;
    }
  }
  assert("Sort 'price-asc' is ordered lowest to highest", isSorted);

  // Test 7: Price range filter (minPrice: 2500)
  const expensiveProds = await getProductsFromDb({ minPrice: 2500 });
  const allOver2500 = expensiveProds.every(p => p.price >= 2500);
  assert("Filter minPrice: 2500 contains only >= 2500 items", allOver2500 && expensiveProds.length > 0);

  // Test 8: Single product fetch by slug
  const single = await getProductBySlugFromDb("classic-linen-shirt");
  assert("Fetch product by slug 'classic-linen-shirt' succeeds", single !== null && single.title === "Classic Linen Shirt");
  assert("Single product includes swatches", (single?.swatches?.length || 0) >= 3);
  assert("Single product includes sizes", (single?.sizes?.length || 0) >= 4);

  // Test 9: Missing product returns null
  const missing = await getProductBySlugFromDb("non-existent-sku-123");
  assert("Missing product returns null", missing === null);

  console.log("==================================================");
  console.log(`TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");

  await pool.end();

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
