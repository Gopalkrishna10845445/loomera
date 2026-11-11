# LOOMERA — PHASE 3B ENGINEERING REPORT
## Product Intelligence, Variant Availability, Customer Shopping History & Restock Subscriptions

**Document Release:** Version 1.0.0  
**Date:** November 3, 2026  
**Engineering Discipline:** Principal Full-Stack Engineer, AI Agent Architect, Database Engineer, Application Security Specialist  
**Project:** LOOMERA — Premium Men's and Boys' Clothing E-Commerce Platform  
**Milestone:** Phase 3B — Product Intelligence & Customer Shopping History  
**Verification Status:** **100% Verified (99/99 Phase 3B Tests Passing; 380/380 Total Platform Tests Passing)**  
**Build Status:** Turbopack Production Build Passed (33 Routes Generated, 0 Errors, 0 Warnings)

---

## 1. Executive Summary

Phase 3B expands the LOOMERA conversational commerce ecosystem from catalog discovery into **authoritative product intelligence, real-time inventory verification, patron browsing memory, search history retrieval, and restock notification subscriptions**.

Building upon Phase 3A's dual-mode AI Shopping Assistant and Phase 2's secure server sessions, the Phase 3B architecture guarantees that neither the AI assistant nor the web client ever invents stock counts, available sizes, shades, or estimated arrival dates. Every response is backed directly by atomic queries against PostgreSQL.

```
+-----------------------------------------------------------------------------------+
|                            LOOMERA STOREFRONT CLIENT                              |
|  - ProductDetailClient: Auto-view logging   - SearchModal: Debounced query logging|
|  - ChatMessage: Stock badges & alerts       - AccountClient: History & Subscriptions|
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                              SECURE API BOUNDARY                                  |
|  - /api/history/views           (GET, POST, DELETE; Rate-limited, CSRF protected)  |
|  - /api/history/searches        (GET, POST, DELETE; Rate-limited, CSRF protected)  |
|  - /api/restock-notifications   (GET, POST, DELETE; Authenticated, Isolated)      |
|  - /api/assistant/chat          (POST; Session-aware, Context-bound, Rate-limited)|
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                        ATELIER ORCHESTRATION & NLU LAYER                          |
|  - Intent Parsing: availability, restock_info, restock_notify, view_history, ...  |
|  - 6 New Dedicated Tools: check_availability, get_sizes, get_colors, restock, ... |
|  - Context Resolution: Active garment ID tracked across conversational turns      |
+------------------------------------------+----------------------------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
                    v                                             v
+-----------------------------------------+ +---------------------------------------+
|        INVENTORY & RESTOCK ENGINE       | |        CUSTOMER HISTORY ENGINE        |
|  - Authoritative variant stock checks   | |  - Authenticated & anonymous tracking |
|  - Low-stock threshold detection (<=5)  | |  - Duplicate-safe view upserts        |
|  - Scheduled restock date retrieval     | |  - Date filters: today, yesterday, 7d |
|  - Unique active restock notifications  | |  - Cross-customer data isolation      |
+-----------------------------------------+ +---------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                               POSTGRESQL DATABASE                                 |
|  - product_variants (CHECK stock >= 0)     - restock_records                      |
|  - restock_notifications                   - product_view_history                 |
|  - search_history                          - users & sessions                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Safe Additive Migrations

All Phase 3B database changes were applied additively to PostgreSQL on port 5434 without data loss or reset. A complete pre-migration SQL backup was preserved at `backup_phase3a_pre_phase3b.sql` (38,986 bytes).

### 2.1 Applied Migration (`scripts/migrate_phase3b_inventory_history.sql`)

```sql
-- 1. Restock Records Table (Authoritative inbound shipments)
CREATE TABLE IF NOT EXISTS restock_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    expected_restock_date TIMESTAMPTZ NOT NULL,
    expected_quantity INT NOT NULL CHECK (expected_quantity > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'arrived', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_restock_records_variant_id ON restock_records(variant_id);
CREATE INDEX IF NOT EXISTS idx_restock_records_status ON restock_records(status);

-- 2. Restock Notifications Table (Patron alerts)
CREATE TABLE IF NOT EXISTS restock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notified_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_user_variant_notification 
ON restock_notifications(user_id, variant_id) 
WHERE status = 'active';

-- 3. Product View History Table
CREATE TABLE IF NOT EXISTS product_view_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(128),
    product_id VARCHAR(128) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_product_view 
ON product_view_history(user_id, product_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_product_view 
ON product_view_history(session_id, product_id) 
WHERE user_id IS NULL AND session_id IS NOT NULL;

-- 4. Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(128),
    search_query VARCHAR(255) NOT NULL,
    filters_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_session_id ON search_history(session_id);

-- 5. Non-Negative Stock Constraint on Variants
ALTER TABLE product_variants ADD CONSTRAINT chk_stock_non_negative CHECK (stock_quantity >= 0);
```

### 2.2 Drizzle ORM Integration (`src/db/schema.ts`)

Definitions and relations for `restockRecords`, `restockNotifications`, `productViewHistory`, and `searchHistory` were added to Drizzle ORM schema, allowing type-safe queries with complete relational joins.

---

## 3. Product Availability & Inventory Engine (`src/lib/inventory.ts`)

The inventory engine serves as the sole authoritative source for garment stock levels:

1. **Variant Resolution (`checkProductAvailability`):**
   * Verifies product publication status (`isPublished: true`).
   * Evaluates size, color, or combined size-color requests.
   * Tolerates natural fashion shade synonyms (e.g., Terracotta/Rust, Navy/Blue, Cream/Ivory).
   * Categorizes inventory into three strict states:
     - `in_stock`: Available inventory exceeding 5 units.
     - `low_stock`: Critical inventory between 1 and 5 units (surfaced with luxury scarcity messaging).
     - `out_of_stock`: Exactly 0 units available.
     - `unavailable`: Combination not tailored or product unpublished.
2. **Catalog Discovery (`getAvailableVariants`, `getLowStockProducts`):**
   * Returns all variants for a product with individual SKU, size, color hex, price, and current stock.
   * `getLowStockProducts(threshold = 5)` extracts garments near exhaustion for urgent atelier notices.
3. **Honest Restock Schedule Retrieval (`getRestockInformation`):**
   * Looks up active records in `restock_records` with `status = 'scheduled'`.
   * **Strict Zero-Hallucination Rule:** If no confirmed inbound shipment exists, the system outputs:  
     `"An estimated restock date is not currently available."`  
     It never guesses, estimates, or invents dates.
4. **Subscription Management (`subscribeRestockNotification`, `cancelRestockNotification`, `getUserRestockNotifications`):**
   * Subscribes authenticated patrons to restock alerts.
   * Enforces idempotency via PostgreSQL conditional unique index `uq_active_user_variant_notification`.
   * Strictly isolates notifications: Customer B cannot view or cancel Customer A's subscriptions.

---

## 4. Customer Shopping History Engine (`src/lib/history.ts`)

### 4.1 Viewing History
* **Duplicate-Safe Upserts:** Viewing the same garment multiple times does not flood the database. It updates `viewed_at = NOW()` on the existing row.
* **Anonymous & Authenticated Dual Support:** Authenticated customers are keyed by `user_id`; guest visitors are keyed by `session_id` using HttpOnly `loomera_anon_id`.
* **Date Filters:** Strict ISO timestamp boundary calculation:
  - `today`: From 00:00:00 of the current day to the present.
  - `yesterday`: From 00:00:00 to 23:59:59.999 of the prior day.
  - `last_7_days`: From 7 days ago to the present.
  - `all`: Full history.
* **Privacy Controls:** One-click clear operation scoped strictly to the calling patron or session.

### 4.2 Search History
* Captures natural language queries and active filter parameters (`filters_json`).
* Sanitizes input: ignores whitespace-only queries and clamps length to 255 characters.
* Provides search-within-history filtering (`queryFilter`).
* Empowers repeat searches: the assistant extracts the patron's last query and immediately re-executes it against current catalog inventory.

---

## 5. AI Shopping Assistant Enhancements (`src/lib/ai/`)

### 5.1 Six New Assistant Tools (`src/lib/ai/tools.ts`)

| Tool Identifier | Purpose | Authoritative Source |
| :--- | :--- | :--- |
| `check_product_availability` | Checks stock for garment by size and/or shade | `checkProductAvailability` |
| `get_available_sizes` | Returns array of sizes currently in stock | `checkProductAvailability` |
| `get_available_colors` | Returns array of shades currently in stock | `checkProductAvailability` |
| `get_recently_viewed` | Returns patron's viewed garments filtered by date | `getProductViewHistory` |
| `get_search_history` | Returns patron's previous atelier inquiries | `getCustomerSearchHistory` |
| `get_restock_information` | Retrieves genuine scheduled restock shipment data | `getRestockInformation` |

### 5.2 Curated NLU Intent Architecture (`src/lib/ai/nlu.ts`)

The high-precision Atelier Curated NLU was expanded with 5 new intents:

```
Customer Input
      |
      v
Curated Pattern & Entity Extraction
      |
      +---> "Is this available in XL?" ───────────► Intent: availability (targetSize: "XL")
      +---> "Show products I saw yesterday" ──────► Intent: view_history (dateFilter: "yesterday")
      +---> "What did I search earlier?" ─────────► Intent: search_history
      +---> "Repeat my last search" ──────────────► Intent: repeat_search
      +---> "When will size XXL come back?" ──────► Intent: restock_info (targetSize: "XXL")
      +---> "Notify me when this returns" ────────► Intent: restock_notify
```

### 5.3 Context Product Resolution (`src/lib/ai/orchestrator.ts`)

When a customer asks *"Is this shirt available in size M?"*, the orchestrator resolves the target garment using a 3-tier precedence hierarchy:
1. Explicit product name or slug detected in query (e.g., `"classic linen shirt"`).
2. Explicit `contextProductId` passed by the calling page or component.
3. Garment from the most recent assistant message in chat history.

---

## 6. REST API Specifications

### 6.1 Product Viewing History (`/api/history/views`)
* **`GET /api/history/views?dateFilter=yesterday&limit=5`**
  - Rate limit: 60 req/min per IP.
  - Response: `{ success: true, history: [...], isAuthenticated: boolean }`
* **`POST /api/history/views`**
  - Headers: Same-Origin required (CSRF defense).
  - Body: `{ productId: "classic-linen-shirt" }`
  - Response: `{ success: true }`
* **`DELETE /api/history/views`**
  - Clears history for calling user or anonymous session.
  - Response: `{ success: true, message: "Viewing history cleared" }`

### 6.2 Customer Search History (`/api/history/searches`)
* **`GET /api/history/searches?dateFilter=all&query=linen&limit=10`**
  - Response: `{ success: true, searches: [...] }`
* **`POST /api/history/searches`**
  - Body: `{ query: "linen shirts under 2000", filters: { maxPrice: 2000 } }`
  - Response: `{ success: true }`
* **`DELETE /api/history/searches`**
  - Clears search history for calling customer.

### 6.3 Restock Notifications (`/api/restock-notifications`)
* **`GET /api/restock-notifications`**
  - Security: Requires authenticated session (HTTP 401 Unauthorized if guest).
  - Response: `{ success: true, notifications: [{ id, variantId, size, color, productTitle, ... }] }`
* **`POST /api/restock-notifications`**
  - Body: `{ variantId: "..." }`
  - Response: `{ success: true, notificationId: "...", alreadyActive: boolean }`
* **`DELETE /api/restock-notifications`**
  - Body: `{ notificationId: "..." }`
  - Security: Validates ownership. Returning HTTP 404/403 if Customer B attempts to cancel Customer A's alert.

---

## 7. Frontend Integration Touchpoints

1. **`src/components/ProductDetailClient.tsx`:**
   * Fires background `POST /api/history/views` on initial render using `useEffect`.
   * Non-blocking: failures do not impede garment browsing.
2. **`src/components/SearchModal.tsx`:**
   * Automatically logs searches to `POST /api/history/searches` after 1,000ms debounce when query exceeds 2 characters.
3. **`src/components/assistant/ChatMessage.tsx`:**
   * Renders availability status badges (In Stock, Low Stock, Out of Stock).
   * Displays remaining unit counts (`"Only 3 pieces remaining in stock"`).
   * Embeds `"Notify Me When Available"` interactive button with immediate subscription feedback and sign-in redirect.
4. **`src/components/AccountClient.tsx`:**
   * **Recently Examined:** Displays real viewed garments with thumbnail, price, and "Clear History" action.
   * **Recent Inquiries:** Shows previous searches with timestamps and 1-click re-search buttons.
   * **Active Restock Subscriptions:** Lists registered garment restock alerts with size, color, and "Cancel Alert" button.
5. **`src/components/assistant/AiAssistantWidget.tsx`:**
   * Surfaces Phase 3B quick-prompts: *"Is my size in stock?"*, *"What did I view recently?"*, *"Show previous searches"*.

---

## 8. Security, Privacy, and Customer Data Isolation Audit

| Security Layer | Implementation Detail | Verification Status |
| :--- | :--- | :--- |
| **Cross-Customer Isolation** | SQL queries enforce `WHERE user_id = $userId`. Customer B cannot view or delete Customer A's records. | **VERIFIED (Pass)** |
| **Anonymous Session Sandbox** | Anonymous views and searches are scoped to `session_id`. Anonymous users cannot inspect registered customer data. | **VERIFIED (Pass)** |
| **CSRF Defense** | State-changing endpoints (`POST`, `DELETE`) inspect `Sec-Fetch-Site` and validate `Origin` against `Host`. | **VERIFIED (Pass)** |
| **Rate Limiting** | Sliding-window memory rate limiting per IP across all history and notification routes. | **VERIFIED (Pass)** |
| **Restock Alert Ownership** | `DELETE /api/restock-notifications` checks `user_id = authUser.id`. Foreign deletion rejected with HTTP 404. | **VERIFIED (Pass)** |
| **Zero Inventory Hallucination**| If variant is out of stock or restock date does not exist, assistant reports strictly truthful messages. | **VERIFIED (Pass)** |

---

## 9. Comprehensive Automated Test Verification

A dedicated automated test suite (`scripts/test_phase3b_product_intelligence.ts`) was executed against the live PostgreSQL database:

```text
======================================================================
LOOMERA AUTOMATED TEST SUITE: PHASE 3B PRODUCT INTELLIGENCE & HISTORY
======================================================================

--- SECTION 1: INVENTORY & PRODUCT AVAILABILITY ENGINE ---
  [PASS] Published product with inventory reports available: true
  [PASS] Derives accurate total stock across all variants
  [PASS] Lists available in-stock sizes
  [PASS] Lists available in-stock shades
  [PASS] In-stock variant reports available: true
  [PASS] In-stock variant reports valid status
  [PASS] Matching variant returns exact PostgreSQL stock quantity
  [PASS] Out-of-stock variant reports available: false
  [PASS] Out-of-stock variant reports status: 'out_of_stock'
  [PASS] Out-of-stock variant reports stock 0
  [PASS] Invalid size/color combination reports available: false
  [PASS] Invalid combination reports status: 'unavailable'
  [PASS] Non-existent product reports available: false
  [PASS] Non-existent product reports isPublished: false
  [PASS] getAvailableVariants returns all variants for garment
  [PASS] Includes out-of-stock variant with stock 0
  [PASS] Enforces non-negative stock across all variants
  [PASS] getLowStockProducts returns array
  [PASS] Every low-stock item is within threshold
  [PASS] Retrieves scheduled restock when reliable record exists
  [PASS] Restock record contains expected quantity (25)
  [PASS] Restock record contains ISO restock date
  [PASS] Honest reporting: hasRestockInfo is false when no record exists
  [PASS] Returns authoritative fallback message 'An estimated restock date is not currently available.'

--- SECTION 2: PRODUCT VIEWING HISTORY ENGINE ---
  [PASS] Records authenticated product view for Customer A
  [PASS] Customer A has 1 recorded product view
  [PASS] Viewed product ID matches recorded product
  [PASS] Repeated view returns true
  [PASS] Duplicate view updates existing record without creating duplicate row
  [PASS] Customer A now has 2 distinct viewed products
  [PASS] Most recently viewed product appears first (chronological order)
  [PASS] Records and retrieves anonymous session viewing history
  [PASS] Anonymous view matches inspected product
  [PASS] Customer Data Isolation: Customer B cannot access Customer A's viewing history
  [PASS] Customer A clears personal viewing history
  [PASS] Customer A viewing history is now empty

--- SECTION 3: CUSTOMER SEARCH HISTORY ENGINE ---
  [PASS] Records customer search query with filters
  [PASS] Customer A retrieves search history
  [PASS] Stored query matches search
  [PASS] Stored filters match search
  [PASS] Customer A has 2 recorded searches in chronological order
  [PASS] Latest search appears first
  [PASS] Filters search history by keyword 'linen'
  [PASS] Matching search contains 'linen'
  [PASS] Rejects empty search query
  [PASS] Customer Data Isolation: Customer B cannot access Customer A's searches
  [PASS] Customer A search history successfully cleared

--- SECTION 4: RESTOCK NOTIFICATION SUBSCRIPTIONS ---
  [PASS] Subscribes Customer A to restock alert for out-of-stock variant
  [PASS] Initial subscription is marked alreadyActive: false
  [PASS] Duplicate subscription call succeeds idempotently
  [PASS] Duplicate subscription detects active notification
  [PASS] Customer A retrieves active restock notification list
  [PASS] Notification record references correct variant size (XXL)
  [PASS] Notification record joins product title
  [PASS] Customer Data Isolation: Customer B cannot view Customer A's restock subscriptions
  [PASS] Security: Customer B cannot cancel Customer A's restock alert
  [PASS] Customer A successfully cancels own restock alert
  [PASS] Active restock notifications list is now empty

--- SECTION 5: AI AGENT TOOLS & CONVERSATIONAL ORCHESTRATION ---
  [PASS] Tool: checkProductAvailabilityTool returns in-stock status
  [PASS] Tool: getAvailableSizesTool includes size M
  [PASS] Tool: getAvailableColorsTool returns available shades
  [PASS] Tool: getRestockInformationTool retrieves scheduled restock
  [PASS] executeAssistantTool dispatches 'check_product_availability'
  [PASS] NLU parses availability question intent
  [PASS] NLU extracts target size 'M'
  [PASS] NLU extracts target product 'classic-linen-shirt'
  [PASS] NLU parses view_history intent
  [PASS] NLU extracts dateFilter 'yesterday'
  [PASS] NLU parses search_history intent
  [PASS] NLU parses repeat_search intent
  [PASS] NLU parses restock_info intent
  [PASS] NLU extracts target size 'XXL'
  [PASS] Orchestrator returns verified availability metadata
  [PASS] Orchestrator message reports size M availability
  [PASS] Orchestrator reports out_of_stock accurately
  [PASS] Orchestrator message informs customer item is out of stock
  [PASS] Orchestrator returns genuine restock metadata
  [PASS] Orchestrator quotes scheduled restock date
  [PASS] Repeat search returns genuine matching products
  [PASS] Orchestrator confirms repeated inquiry

--- SECTION 6: API ROUTES & SECURITY AUDIT ---
  [PASS] POST /api/history/views returns HTTP 200
  [PASS] GET /api/history/views returns HTTP 200
  [PASS] GET /api/history/views returns history list
  [PASS] Reports authenticated status
  [PASS] DELETE /api/history/views returns HTTP 200
  [PASS] POST /api/history/searches returns HTTP 200
  [PASS] GET /api/history/searches returns HTTP 200
  [PASS] GET /api/history/searches returns search list
  [PASS] DELETE /api/history/searches returns HTTP 200
  [PASS] POST /api/restock-notifications rejects unauthenticated request with HTTP 401
  [PASS] POST /api/restock-notifications subscribes authenticated customer (HTTP 200)
  [PASS] Returns registered notificationId
  [PASS] GET /api/restock-notifications returns HTTP 200
  [PASS] Customer A retrieves registered subscription
  [PASS] Security: Customer B cannot cancel Customer A's restock alert via API (HTTP 404)
  [PASS] DELETE /api/restock-notifications cancels subscription (HTTP 200)
  [PASS] CSRF Defense: Cross-site request rejected with HTTP 403 Forbidden
  [PASS] POST /api/assistant/chat processes Phase 3B query with HTTP 200
  [PASS] Chat endpoint returns availability metadata

======================================================================
PHASE 3B TEST RESULTS: 99/99 PASSED (100%)
======================================================================
```

### Cumulative Platform Verification Summary
* `scripts/test_pricing_and_catalog.ts`: 54 tests passed
* `scripts/test_api_and_db.ts`: 60 tests passed
* `scripts/test_phase2_auth_cart_wishlist.ts`: 97 tests passed
* `scripts/test_phase3a_ai_assistant.ts`: 70 tests passed
* `scripts/test_phase3b_product_intelligence.ts`: 99 tests passed
* **CUMULATIVE AUTOMATED PASS RATE:** **380 / 380 Tests Passing (100%)**
* **TypeScript Compiler (`npx tsc --noEmit`):** 0 errors
* **ESLint (`npm run lint`):** 0 errors, 0 warnings
* **Next.js Production Build (`npm run build`):** 33 routes generated, Turbopack succeeded

---

## 10. Scope Boundaries & Future Recommendations

### 10.1 Respected Boundaries
* **No Payment / Checkout Execution:** Checkout, payment gateways (Razorpay/Stripe), and transactional order creation remain deliberately unimplemented per milestone rules.
* **No Vector Database:** Similarity and search utilize deterministic PostgreSQL full-text and attribute matching rather than fragile external embeddings.
* **No Automated Purchasing:** Restock subscriptions record patron interest without performing unauthorized financial transactions.

### 10.2 Next Milestone Recommendations
1. **Automated Notification Dispatcher:** Connect an email or SMS service (Resend / Twilio) to dispatch alerts when inventory increments in `product_variants`.
2. **Anonymous to Authenticated History Migration:** Automatically migrate anonymous view and search rows to the patron account upon login or registration.
3. **Phase 4: Order Creation & Checkout Engine:** Implement payment intents, webhook handlers, and transactional inventory decrement locks.
