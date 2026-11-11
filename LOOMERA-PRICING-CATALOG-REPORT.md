# LOOMERA — PRICING ENGINE & PRODUCT CATALOG REFINEMENT REPORT

**Project:** LOOMERA — Premium Men's and Boys' Clothing E-Commerce Platform  
**Milestone:** Phase: Pricing Engine & Product Catalog Refinement  
**Date:** November 3, 2026  
**Auditor & Lead Engineers:** Senior Full-Stack Engineer, E-Commerce Architect, Database Engineer, AppSec Engineer, and QA Automation Specialist  
**Execution Environment:** Windows x64, Node.js v24.16.0, Next.js 16.4.2 (Turbopack), React 19.3.0, PostgreSQL 17.11 (Port 5434), Drizzle ORM ^0.45.4  

---

## 1. Initial Problems Identified

Prior to this milestone, comprehensive code inspection and auditing identified multiple functional, architectural, and data discrepancies across currency, pricing, shipping, and collection filtering:

1. **Currency Inconsistency & Clash (`$` vs `₹`):**
   * While homepage product cards formatted prices in Indian Rupees (`₹`), other primary storefront views hardcoded US Dollars (`$`) with `.toFixed(2)`:
     * Product Detail Page (`src/components/ProductDetailClient.tsx`): rendered `$2499.00` instead of `₹2,499`.
     * Cart Drawer (`src/components/CartDrawer.tsx`): rendered `$2499.00` line items and `$subtotal`.
     * Search Modal (`src/components/SearchModal.tsx`): rendered `$item.price.toFixed(2)`.
     * Product Spotlight (`src/components/ProductSpotlight.tsx`): rendered `$prod.price.toFixed(2)`.
     * Account Concierge (`src/app/account/page.tsx`): rendered mock dispatches with `$165.00`.
     * Order Tracking (`src/app/orders/page.tsx`): rendered line items and order totals in `$`.
2. **Conflicting Free Shipping Thresholds ($250 vs ₹2,999):**
   * Top announcement banner (`Header.tsx`) and benefit strip (`BenefitsStrip.tsx`) advertised: *"Free Shipping on Orders Above ₹2,999"*.
   * In contrast, `CartContext.tsx` hardcoded `freeShippingThreshold = 250`, `CartDrawer.tsx` displayed `Add $${amountRemaining.toFixed(2)}`, and multiple components advertised `orders over $250`.
   * When an Indian Rupee item (e.g. ₹2,499) was added to the bag, `2499 / 250` caused the progress bar to instantly jump to 1000% (clamped at 100%), rendering the shipping calculation completely broken.
3. **Hardcoded Product IDs in Collection Filtering:**
   * `src/components/collections/CollectionClient.tsx` lines 90–120 determined category chip membership through hardcoded product ID checks (`if (product.id !== "classic-linen-shirt") return false;`, `if (product.id !== "linen-trousers") return false;`, `if (product.id !== "textured-casual-shirt") return false;`, `if (product.id !== "boys-linen-shirt") return false;`).
   * `src/lib/products.ts` used a hardcoded SQL `CASE products.id WHEN 'classic-linen-shirt' THEN 1 ...` statement for featured ordering.
   * New products inserted into PostgreSQL could not properly match collection chips or rank in featured sorting.
4. **Catalog Data Integrity Anomalies in Seed Data:**
   * Two youth products contained legacy USD seed prices: `kids-romper` was seeded at `base_price_inr = 65` (₹65), and `boys-drawstring-shorts` was seeded at `base_price_inr = 75` (₹75), creating severe pricing distortions on the storefront.
5. **No Centralized Currency or Pricing Utility:**
   * Price formatting was duplicated ad-hoc with string concatenations and various `toLocaleString` calls.
   * No unified pricing calculation existed for original vs. sale prices, discount percentages, or server-authoritative cart validation.
6. **ESLint Static Analysis Failures:**
   * Pre-existing ESLint errors existed in `scripts/test_live_endpoints.ts` (`@typescript-eslint/no-explicit-any`).

---

## 2. Files Inspected

* `frontend/package.json`
* `frontend/.env.local`
* `frontend/.env.example`
* `frontend/drizzle.config.ts`
* `frontend/src/db/index.ts`
* `frontend/src/db/schema.ts`
* `frontend/src/db/migrations/0000_last_loa.sql`
* `frontend/src/lib/products.ts`
* `frontend/src/types/index.ts`
* `frontend/src/data/mockData.ts`
* `frontend/src/data/collectionsData.ts`
* `frontend/src/context/CartContext.tsx`
* `frontend/src/components/Header.tsx`
* `frontend/src/components/Footer.tsx`
* `frontend/src/components/ProductCard.tsx`
* `frontend/src/components/ProductDetailClient.tsx`
* `frontend/src/components/ProductSpotlight.tsx`
* `frontend/src/components/BenefitsStrip.tsx`
* `frontend/src/components/NewArrivalsGrid.tsx`
* `frontend/src/components/SearchModal.tsx`
* `frontend/src/components/collections/CollectionClient.tsx`
* `frontend/src/components/collections/CollectionFilterBar.tsx`
* `frontend/src/components/collections/CategoryChips.tsx`
* `frontend/src/components/collections/EmptyState.tsx`
* `frontend/src/app/page.tsx`
* `frontend/src/app/collections/[category]/page.tsx`
* `frontend/src/app/products/[id]/page.tsx`
* `frontend/src/app/orders/page.tsx`
* `frontend/src/app/account/page.tsx`
* `frontend/src/app/api/products/route.ts`
* `frontend/src/app/api/products/[slug]/route.ts`
* `frontend/scripts/test_api_and_db.ts`
* `frontend/scripts/test_live_endpoints.ts`

---

## 3. Files Modified & Created

| File | Status | Description of Modifications |
| :--- | :---: | :--- |
| `frontend/src/lib/currency.ts` | **CREATED** | Centralized Indian Rupee (INR, `₹`) currency engine using `Intl.NumberFormat` with locale `en-IN`, handling decimals, zero, missing, and invalid values safely. |
| `frontend/src/lib/pricing.ts` | **CREATED** | Centralized pricing engine: `SHIPPING_CONFIG` (₹2,999 threshold), `calculatePriceBreakdown` (sale price, original price, discount percentage), `calculateShipping`, and `calculateCartSubtotal`. |
| `frontend/src/app/api/cart/validate/route.ts` | **CREATED** | Server-authoritative cart and price validation endpoint. Queries PostgreSQL for verified prices and stock, detecting and remediating client-side price manipulation. |
| `frontend/scripts/test_pricing_and_catalog.ts` | **CREATED** | Comprehensive 102-test automated suite verifying currency formatting, pricing logic, shipping thresholds, collection filtering, and catalog integrity. |
| `frontend/src/db/schema.ts` | **MODIFIED** | Added `originalPriceInr` (`integer`) and `displayOrder` (`integer`, default 0) to `products` table schema. |
| `frontend/src/types/index.ts` | **MODIFIED** | Extended `Product` interface with `originalPrice?: number`, `discountPercent?: number`, and `isOnSale?: boolean`. |
| `frontend/src/lib/products.ts` | **MODIFIED** | Integrated `calculatePriceBreakdown`, removed hardcoded product ID SQL `CASE` in featured sort in favor of `products.displayOrder`, added `validateCartOnServer` with direct PostgreSQL lookups. |
| `frontend/src/data/mockData.ts` | **MODIFIED** | Reconciled fallback USD prices for `kids-romper` (65 -> 1299) and `boys-drawstring-shorts` (75 -> 1499). |
| `frontend/src/context/CartContext.tsx` | **MODIFIED** | Integrated `calculateShipping` and `calculateCartSubtotal`; updated threshold to centralized ₹2,999; exported `amountRemaining` and `isFreeShipping`. |
| `frontend/src/components/CartDrawer.tsx` | **MODIFIED** | Replaced all hardcoded `$` with `formatInr()`; integrated dynamic free-shipping banner and progress animation based on ₹2,999 threshold. |
| `frontend/src/components/ProductCard.tsx` | **MODIFIED** | Centralized currency formatting (`formatInr`); added support for sale prices, original prices with line-through, and discount badges. |
| `frontend/src/components/ProductDetailClient.tsx`| **MODIFIED** | Replaced `$product.price.toFixed(2)` with `formatInr()`; rendered discount badges; updated shipping notice to centralized ₹2,999 threshold. |
| `frontend/src/components/ProductSpotlight.tsx` | **MODIFIED** | Replaced `$prod.price.toFixed(2)` with `formatInr()`; updated delivery banner to centralized ₹2,999 threshold. |
| `frontend/src/components/SearchModal.tsx` | **MODIFIED** | Replaced `$item.price.toFixed(2)` with `formatInr()`. |
| `frontend/src/components/Header.tsx` | **MODIFIED** | Updated desktop announcement banner and mobile concierge sheet to use centralized `formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)`. |
| `frontend/src/components/BenefitsStrip.tsx` | **MODIFIED** | Bound free-shipping strip text dynamically to `formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)`. |
| `frontend/src/components/Footer.tsx` | **MODIFIED** | Bound express delivery toast copy to centralized `formatInr(SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD_INR)`. |
| `frontend/src/components/collections/CollectionClient.tsx` | **MODIFIED** | Completely eliminated hardcoded product IDs in chip filtering; introduced attribute-driven `matchesCategoryChip`; integrated dynamic `categoryCounts`. |
| `frontend/src/app/collections/[category]/page.tsx` | **MODIFIED** | Updated New Arrivals data pre-fetching to enforce `sort: "newest"`. |
| `frontend/src/app/orders/page.tsx` | **MODIFIED** | Converted mock patron order dispatches to INR with `formatInr`. |
| `frontend/src/app/account/page.tsx` | **MODIFIED** | Converted patron order dispatches to INR with `formatInr`. |
| `frontend/src/app/api/products/route.ts` | **MODIFIED** | Added automatic `newest` sorting for `category=new-arrivals`. |
| `frontend/scripts/test_live_endpoints.ts` | **MODIFIED** | Resolved ESLint `@typescript-eslint/no-explicit-any` errors with strict types. |
| `frontend/package.json` | **MODIFIED** | Added `"test"` and `"test:pricing"` scripts. |

---

## 4. Currency Implementation

* **Default Storefront Currency:** Indian Rupees (`INR`, symbol `₹`).
* **Implementation Location:** `frontend/src/lib/currency.ts`.
* **Standard Formatter:**
  ```typescript
  export function formatInr(
    amount: number | null | undefined,
    options: FormatInrOptions = {}
  ): string {
    if (amount === null || amount === undefined || typeof amount !== "number" || Number.isNaN(amount)) {
      return options.fallback ?? "₹0";
    }
    const hasDecimals = typeof options.showDecimals === "boolean" 
      ? options.showDecimals 
      : amount % 1 !== 0;
    const fractionDigits = hasDecimals ? 2 : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  }
  ```
* **Formatting Behavior:**
  * Whole rupee values display cleanly without trailing paise: `2499` → `₹2,499`, `1500` → `₹1,500`, `999` → `₹999`.
  * Large values follow the Indian numerical system: `100000` → `₹1,00,000`.
  * Fractional paise are preserved when present or requested: `2499.50` → `₹2,499.50`.
  * Missing or invalid values (`null`, `undefined`, `NaN`) fail safely to `₹0`.
* **Database Separation:** The database and memory models store strictly numeric integers/floats (`base_price_inr INTEGER`). Formatted strings are never persisted in PostgreSQL.

---

## 5. Pricing Implementation

* **Implementation Location:** `frontend/src/lib/pricing.ts`.
* **Key Capabilities:**
  1. **Original vs. Sale Pricing (`calculatePriceBreakdown`):**
     * Supports regular pricing (no discount) and promotional discounts.
     * **Strict Rule Enforced:** Discounted price cannot exceed original price. If an invalid sale price is supplied (greater than compare-at price), the system clamps the original price to prevent negative discounts.
     * Discount percentage calculation:
       $$\text{discountPercent} = \text{round}\left(\frac{\text{originalPrice} - \text{salePrice}}{\text{originalPrice}} \times 100\right)$$
  2. **Variant Pricing:**
     * Products check variant overrides in `product_variants.price_override_inr`. If null, the base product price (`products.base_price_inr`) is used.
  3. **Cart Subtotal Calculation (`calculateCartSubtotal`):**
     * Sums line items with validation:
       $$\text{subtotal} = \sum (\max(0, \text{price}) \times \max(0, \lfloor\text{quantity}\rfloor))$$
     * Rejects negative prices, negative quantities, or NaN inputs.
  4. **Server-Authoritative Price Validation (`validateCartOnServer`):**
     * Browser input is treated as untrusted.
     * Validates line items directly against PostgreSQL via Drizzle ORM.
     * Detects client-side price tampering (e.g. if a client alters `localStorage` to claim a ₹2,499 shirt is ₹1).
     * Overrides client price with authoritative database price, logs discrepancy, and recalculates accurate subtotal.

---

## 6. Shipping Logic & Threshold Consistency

* **Single Centralized Configuration:**
  ```typescript
  export const SHIPPING_CONFIG = {
    FREE_SHIPPING_THRESHOLD_INR: 2999,
    STANDARD_SHIPPING_FEE_INR: 199,
    EXPRESS_SHIPPING_FEE_INR: 399,
  } as const;
  ```
* **Consistent Multi-Component Integration:**
  * Header announcement: *"Free Shipping on Orders Above ₹2,999"*
  * Benefits strip: *"Free Shipping on ₹2,999+"*
  * Cart drawer: *"Add ₹1,300 for complimentary delivery"* or *"Complimentary shipping unlocked!"*
  * Product detail page: *"Complimentary insured shipping on orders over ₹2,999"*
  * Product spotlight: *"Complimentary insured shipping over ₹2,999"*
  * Footer: *"Complimentary insured express delivery on orders above ₹2,999"*
* **Progress Calculation (`calculateShipping`):**
  * Empty cart: `progress = 0%`, `amountRemaining = ₹2,999`, `isFreeShipping = false`.
  * Below threshold (e.g., ₹1,699): `amountRemaining = ₹1,300`, `progress = 57%`, `isFreeShipping = false`.
  * Equal to threshold (₹2,999): `amountRemaining = 0`, `progress = 100%`, `isFreeShipping = true`.
  * Above threshold (e.g., ₹4,198): `amountRemaining = 0`, `progress = 100%`, `isFreeShipping = true`.
  * Quantity changes in `CartDrawer.tsx` immediately recompute and animate the progress bar.

---

## 7. Collection Filtering Improvements

### Elimination of Hardcoded Product IDs
Previously, `CollectionClient.tsx` checked hardcoded strings (`classic-linen-shirt`, `linen-trousers`, `textured-casual-shirt`, `boys-linen-shirt`). These have been completely eliminated in favor of database-driven and attribute-driven logic:

* **Attribute & Relationship Classification (`matchesCategoryChip`):**
  * Evaluates product properties (`title`, `description`, `categorySlug`, `origin`, `craftDetail`, `badge`).
  * "Linen Shirts": matches garments with "shirt" and "linen/flax" in attributes.
  * "Trousers": matches garments with "trouser" or "pant" in attributes.
  * "Kurtas": matches garments with "kurta" in attributes.
  * "Casual Wear": matches garments with "casual" in title, description, or badge.
  * "Festive Wear / Collection": matches kurtas and charkha/artisan loomed garments.
  * "Cotton Essentials": matches pure cotton slub textiles.
  * "Co-ord Sets", "Matching Outfits": gracefully evaluates to empty without crashing, rendering the LOOMERA `EmptyState` component.
* **Database Featured Sort:**
  * Removed hardcoded SQL `CASE products.id WHEN ...` in `getProductsFromDb`.
  * Replaced with database-level `ORDER BY products.display_order ASC, products.created_at DESC`.
* **Collection Routing & Sourcing:**
  * Men's Collection (`/collections/men`): fetches adult wardrobe garments (5 items).
  * Boys' Collection (`/collections/boys`): fetches youth garments (3 items), strictly excluding adult menswear.
  * Handloom Collection (`/collections/handloom`): fetches heritage loomed kurtas (2 items).
  * New Arrivals (`/collections/new-arrivals`): fetches all 8 published items ordered newest first.

---

## 8. Database Changes & Migration Safety

### Safety & Recoverability
* **Full Backup Created:** Before executing any DDL or data corrections, a binary pg_dump backup was generated and verified:  
  `c:\Users\gopal\Downloads\lommera\.dev-db\loomera_backup_pre_pricing_milestone.dump` (19,873 bytes).
* **Zero Data Loss:** No tables or records were deleted or reset. All existing foreign keys, variants (102 rows), and images (8 rows) were preserved.

### Additive Schema Changes
Executed in PostgreSQL cluster and reflected in `frontend/src/db/schema.ts`:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price_inr INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
```

### Targeted Data Reconciliations
Fixed legacy USD prices seeded in previous milestones:
```sql
UPDATE products SET display_order = CASE id
  WHEN 'classic-linen-shirt' THEN 1
  WHEN 'handloom-kurta' THEN 2
  WHEN 'linen-trousers' THEN 3
  WHEN 'textured-casual-shirt' THEN 4
  WHEN 'boys-linen-shirt' THEN 5
  WHEN 'classic-kurta' THEN 6
  WHEN 'boys-drawstring-shorts' THEN 7
  WHEN 'kids-romper' THEN 8
  ELSE 99 END;

UPDATE products SET base_price_inr = 1299, updated_at = NOW() WHERE id = 'kids-romper' AND base_price_inr = 65;
UPDATE products SET base_price_inr = 1499, updated_at = NOW() WHERE id = 'boys-drawstring-shorts' AND base_price_inr = 75;
```

### Verified Final Catalog State in PostgreSQL
| ID | Slug | Price (INR) | Original Price | Display Order | Category | Published |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| `classic-linen-shirt` | `classic-linen-shirt` | ₹2,499 | NULL | 1 | `men` | `true` |
| `handloom-kurta` | `handloom-kurta` | ₹2,999 | NULL | 2 | `handloom` | `true` |
| `linen-trousers` | `classic-linen-trousers` | ₹2,799 | NULL | 3 | `men` | `true` |
| `textured-casual-shirt` | `textured-casual-shirt` | ₹2,399 | NULL | 4 | `men` | `true` |
| `boys-linen-shirt` | `boys-linen-shirt` | ₹1,699 | NULL | 5 | `boys` | `true` |
| `classic-kurta` | `classic-kurta` | ₹2,699 | NULL | 6 | `handloom` | `true` |
| `boys-drawstring-shorts` | `boys-tailored-linen-shorts` | ₹1,499 | NULL | 7 | `boys` | `true` |
| `kids-romper` | `organic-muslin-baby-romper` | ₹1,299 | NULL | 8 | `kids` | `true` |

---

## 9. Security & Data Integrity

1. **Server-Side Price Authority:** Cart prices submitted by browsers are no longer trusted. The `/api/cart/validate` endpoint and `validateCartOnServer` cross-reference requested items with PostgreSQL, detecting and rejecting tampered prices.
2. **SQL Injection Defense:** All queries use Drizzle ORM parameterized clauses (`eq`, `and`, `or`, `asc`, `desc`, `ilike`).
3. **Protection of Unpublished Items:** Public storefront queries and single-product APIs enforce `is_published = true`. Unpublished items return 404 / empty array.
4. **Credential Isolation:** Database credentials remain restricted to `.env.local` and server environment variables. Zero credentials are exposed to client bundles.
5. **Input Validation:** Category slugs, search terms, and price bounds are sanitized. NaN, negative numbers, and non-integer quantities are clamped or rejected.

---

## 10. Automated Testing & Verification

### Test Suites Executed

1. **Pricing & Catalog Automated Suite (`frontend/scripts/test_pricing_and_catalog.ts`):**  
   **Result: 102/102 PASSED (100%)**
   * Section 1: Currency Engine (13 tests) — INR format, zero, large numbers, decimals, NaN, null, undefined, parser.
   * Section 2: Pricing & Discount Logic (11 tests) — Regular price, sale price, discount %, invalid sale price clamping, subtotal calculation, negative price rejection.
   * Section 3: Shipping Threshold (14 tests) — Empty cart, below threshold (₹1,699 -> 57%), equal to threshold (₹2,999 -> 100%), above threshold (₹4,198 -> 100%), fee calculation.
   * Section 4: Server-Authoritative Price Validation (8 tests) — Legitimate cart verification, client price tampering detection, non-existent product rejection.
   * Section 5: Database-Driven Collection Filtering (15 tests) — Men's collection (5 items), Boys' collection (3 items), Handloom collection (2 items), New Arrivals (8 items, newest first), strict category, empty category, zero duplicate IDs, search + category, sort + category.
   * Section 6: Product Catalog Data Integrity (41 tests) — Reconciled romper (₹1,299) and shorts (₹1,499), unpublished product exclusion from public catalog, slug validity, swatches, and sizes across all 8 products.

2. **Data Access & API Test Suite (`frontend/scripts/test_api_and_db.ts`):**  
   **Result: 12/12 PASSED (100%)**
   * Fetch all products, category filters (`men`, `boys`, `handloom`), search queries, price sorting, single product slug resolution with relational swatches and sizes.

3. **Combined Test Runner (`npm test`):**  
   **Result: 114/114 PASSED (100%)**

4. **TypeScript Typecheck (`npx tsc --noEmit`):**  
   **Result: PASS (0 errors)**

5. **ESLint Static Analysis (`npm run lint`):**  
   **Result: PASS (0 errors, 0 warnings)**

6. **Next.js Production Build (`npm run build`):**  
   **Result: PASS**
   * All 21 App Router routes compiled cleanly.
   * Static Site Generation (SSG) verified across 4 collection categories and 8 product detail pages.
   * Turbopack optimized bundle created in 6.3s.

---

## 11. Cloud Database Readiness Review (Neon / Supabase)

While database migration to the cloud was out of scope for this milestone, the current PostgreSQL + Drizzle architecture was evaluated for readiness:

| Evaluation Aspect | Current Status | Cloud Readiness (Neon / Supabase) | Recommendation for Cloud Milestone |
| :--- | :---: | :---: | :--- |
| **Connection Pooling** | `pg.Pool` (max 10 dev / 20 prod) | **READY** | Neon (PgBouncer) or Supabase (Supavisor) connection strings with `?sslmode=require` are fully compatible. For Vercel edge/serverless, `@neondatabase/serverless` can be dropped in. |
| **Drizzle Kit Migrations** | `drizzle-kit` configured | **READY** | Migrations must run against unpooled direct port (5432) for DDL introspection, while runtime queries use pooled port (6543). |
| **Environment Handling** | `.env.local` / `DATABASE_URL` | **READY** | Managed provider URL can be stored in Vercel/Netlify environment variables without changing source code. |
| **Dev / Prod Separation** | Local cluster (`.dev-db:5434`) | **READY** | Retain `.dev-db` for local offline development; provision cloud staging and production branches. |
| **Backup & Point-in-Time** | Manual `pg_dump` | **READY FOR CLOUD** | Neon and Supabase provide automated daily backups and WAL-based point-in-time recovery (PITR). |
| **Data Integrity & Constraints** | Foreign keys & unique indexes live | **READY** | Categories, products, variants, and images tables have CASCADE and RESTRICT foreign keys fully compliant with PostgreSQL standards. |

---

## 12. Final Acceptance Matrix

| Requirement | Target Status | Verified Result | Notes |
| :--- | :---: | :---: | :--- |
| **Centralized Currency Engine** | PASS | **PASS** | `formatInr()` handles all storefront prices with `Intl.NumberFormat('en-IN')`. |
| **Numeric DB Price Separation** | PASS | **PASS** | Database stores integer numbers; formatting is strictly display-time. |
| **Centralized Pricing Logic** | PASS | **PASS** | `calculatePriceBreakdown` handles sale, original, and discount %. |
| **Centralized Shipping Config** | PASS | **PASS** | One global threshold (₹2,999) bound across all 8 storefront components. |
| **Eliminate Hardcoded Collection IDs** | PASS | **PASS** | Removed all hardcoded product IDs in `CollectionClient.tsx` and SQL CASE queries. |
| **Database-Driven Filtering** | PASS | **PASS** | Men (5), Boys (3), Handloom (2), New Arrivals (8) sourced dynamically. |
| **Catalog Data Validation** | PASS | **PASS** | Reconciled USD legacy prices: Romper (₹1,299), Shorts (₹1,499). |
| **Frontend UI/UX Preservation** | PASS | **PASS** | Liquid Glass nav, Playfair/DM Sans typography, swatches, and layouts preserved. |
| **Server Price Validation** | PASS | **PASS** | `/api/cart/validate` prevents client-side price tampering. |
| **TypeScript Compilation** | PASS | **PASS** | `npx tsc --noEmit` passes with 0 errors. |
| **ESLint Static Analysis** | PASS | **PASS** | `npm run lint` passes with 0 errors and 0 warnings. |
| **Automated Test Execution** | PASS | **PASS** | 114/114 tests pass across unit, integration, and data access suites. |
| **Production Build Execution** | PASS | **PASS** | `npm run build` succeeds; 21 static/SSG/dynamic routes generated. |

---

## 13. Remaining Limitations

1. **Transactional E-Commerce (Checkout & Payment Gateways):**
   * Clicking "Proceed to Order Review" in the cart drawer remains a frontend mock notification. Zero payment gateways (Razorpay, Stripe, PhonePe) are integrated.
2. **Persistent Cart & Wishlist Synchronization:**
   * Cart and wishlist remain client-side in `localStorage`. Server persistence (`carts`, `cart_items`, `wishlists`) requires the User Authentication milestone.
3. **Customer Accounts & Order History:**
   * `/account` and `/orders` display mock patron data and do not yet require real customer authentication or database order queries.
4. **Cloud Object Storage for Product Imagery:**
   * Images currently reside locally in `public/assets/reference/`. Production object storage (Cloudinary / Supabase Storage / S3) will be introduced in the Backoffice/Admin milestone.

---

## 14. Recommended Next Implementation Phase

**PHASE: CUSTOMER AUTHENTICATION & PERSISTENT CART SYNCHRONIZATION**
1. Implement secure patron authentication using session cookies (e.g. Auth.js / Lucia / Jose).
2. Create PostgreSQL database tables for `users`, `sessions`, `carts`, `cart_items`, `wishlists`, and `wishlist_items`.
3. Provide seamless cart hydration that synchronizes anonymous `localStorage` bag items with the user's database cart upon sign-in.
4. Protect `/account` and `/orders` routes with server-side authentication middleware.
