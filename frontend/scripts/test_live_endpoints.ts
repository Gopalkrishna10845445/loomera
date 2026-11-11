interface TestProduct {
  id: string;
  categorySlug: string;
  price: number;
  swatches: unknown[];
  sizes: unknown[];
}

async function runLiveApiTests() {
  const baseUrl = "http://localhost:3000";
  console.log("==================================================");
  console.log("RUNNING LIVE HTTP API ENDPOINT TESTS");
  console.log(`Target: ${baseUrl}`);
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // 1. GET /api/products
  const resAll = await fetch(`${baseUrl}/api/products`);
  assert(resAll.status === 200, "GET /api/products returns HTTP 200");
  const dataAll = await resAll.json();
  assert(dataAll.success === true, "Response JSON has success: true");
  assert(dataAll.total === 8, "Total products count is 8");
  assert(Array.isArray(dataAll.products) && dataAll.products.length === 8, "Returns all 8 database products");

  // 2. GET /api/products?category=men
  const resMen = await fetch(`${baseUrl}/api/products?category=men`);
  const dataMen = await resMen.json();
  assert(dataMen.total === 5, "Category 'men' returns 5 products");

  // 3. GET /api/products?category=boys
  const resBoys = await fetch(`${baseUrl}/api/products?category=boys`);
  const dataBoys = await resBoys.json();
  assert(dataBoys.total === 3, "Category 'boys' returns 3 products");
  assert(!dataBoys.products.some((p: TestProduct) => p.categorySlug === "men"), "Category 'boys' excludes adult clothing");

  // 4. GET /api/products?category=handloom
  const resHandloom = await fetch(`${baseUrl}/api/products?category=handloom`);
  const dataHandloom = await resHandloom.json();
  assert(dataHandloom.total === 2, "Category 'handloom' returns 2 kurtas");

  // 5. GET /api/products?search=linen
  const resSearch = await fetch(`${baseUrl}/api/products?search=linen`);
  const dataSearch = await resSearch.json();
  assert(dataSearch.total > 0, "Search query 'linen' matches database products");

  // 6. GET /api/products?sort=price-asc
  const resSort = await fetch(`${baseUrl}/api/products?sort=price-asc`);
  const dataSort = await resSort.json();
  const prices = dataSort.products.map((p: TestProduct) => p.price);
  const isSorted = prices.every((val: number, i: number, arr: number[]) => !i || arr[i - 1] <= val);
  assert(isSorted, "Products sorted ascending by price");

  // 7. GET /api/products/classic-linen-shirt
  const resSlug = await fetch(`${baseUrl}/api/products/classic-linen-shirt`);
  assert(resSlug.status === 200, "GET /api/products/classic-linen-shirt returns HTTP 200");
  const dataSlug = await resSlug.json();
  assert(dataSlug.product.id === "classic-linen-shirt", "Product id matches requested slug");
  assert(dataSlug.product.swatches.length === 3, "Product swatches joined correctly");
  assert(dataSlug.product.sizes.length === 5, "Product sizes joined correctly");

  // 8. GET /api/products/non-existent-product-slug (404)
  const res404 = await fetch(`${baseUrl}/api/products/non-existent-product-slug`);
  assert(res404.status === 404, "Unknown product slug returns HTTP 404");
  const data404 = await res404.json();
  assert(data404.success === false, "404 response body has success: false");

  console.log("==================================================");
  console.log(`HTTP API TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================");
}

runLiveApiTests().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
