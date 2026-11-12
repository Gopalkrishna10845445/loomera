# LOOMERA — PHASE 4 INITIAL AUDIT REPORT
## Checkout System, Secure Payments & Order Lifecycle Management

**Audit Release:** Version 1.0.0  
**Date:** November 3, 2026  
**Auditor:** Principal Full-Stack Engineer, Payment Architect, Application Security Engineer  
**Project:** LOOMERA — Premium Men's and Boys' Clothing E-Commerce Platform  
**Target Milestone:** Phase 4 — Checkout, Secure Payments & Order Management  
**Audit Status:** **COMPLETED — SOURCE CODE UNMODIFIED**  
**Database Backup:** Verified at `backup_phase3a_pre_phase3b.sql` (38,986 bytes)  
**Baseline Test Status:** **380 / 380 Tests Passing (100%)**  
**TypeScript Status:** 0 errors (`npx tsc --noEmit`)  
**ESLint Status:** 0 errors, 0 warnings (`npm run lint`)  
**Production Build Status:** 33 / 33 Routes Compiled (`npm run build`)

---

## 1. Executive Summary

This audit assesses the readiness of the LOOMERA application to support **Phase 4: Multi-Step Checkout, Razorpay Payment Gateway Integration, Server-Authoritative Order Management, and Real-Time Inventory Reservation Consistency**.

The existing application is in an exceptionally healthy state. All features from Phase 1 (Product Catalog & PostgreSQL), Phase 2 (Customer Authentication & Persistent Cart/Wishlist), Phase 3A (AI Shopping Assistant), and Phase 3B (Product Intelligence & Shopping History) are fully operational, strictly isolated, and verified with 380 passing automated tests.

Per the Phase 4 master execution instructions, **no existing source code was modified during this audit**.

---

## 2. Baseline System Verification

### 2.1 Verification Commands Output

| Command | Target | Result | Output Summary |
| :--- | :--- | :---: | :--- |
| `npm test` | Automated Test Suite | **PASS** | 380/380 assertions passed across 5 test suites: pricing (54), catalog & DB (60), auth & cart (97), assistant 3A (70), intelligence 3B (99). |
| `npx tsc --noEmit` | TypeScript Compiler | **PASS** | 0 type errors across App Router routes, components, and server libraries. |
| `npm run lint` | ESLint Linter | **PASS** | 0 errors, 0 warnings. |
| `npm run build` | Next.js Turbopack Build | **PASS** | 33 routes generated (Static, SSG, and Dynamic), compiled cleanly in 670ms. |

---

## 3. Inventory of Existing Reusable Functionality

The following modules, utilities, and components have been inspected and confirmed ready for direct reuse in Phase 4:

### 3.1 Customer Authentication & Server Sessions
* **Modules:** `src/lib/auth/session.ts`, `src/lib/auth/cookies.ts`, `src/lib/auth/argon2.ts`
* **Capabilities:** Argon2id password hashing, sliding 30-day SHA-256 session tokens, HttpOnly `loomera_session` cookies, server-side session extraction (`validateSession`), Edge Middleware protection.
* **Reuse in Phase 4:** Authenticates checkout sessions, extracts customer ID without trusting client inputs, and protects order history endpoints.

### 3.2 Persistent Shopping Cart System
* **Modules:** `src/lib/cart.ts`, `src/context/CartContext.tsx`, `src/components/CartDrawer.tsx`
* **Capabilities:** `getUserCart(userId)`, `addItemToUserCart`, `updateUserCartItemQuantity`, `removeUserCartItem`, `clearUserCart`, `mergeAnonymousCart`.
* **Database Tables:** `carts`, `cart_items` (keyed to `users.id`, with product ID, variant size, color, quantity).
* **Reuse in Phase 4:** Source of truth for items entering the checkout pipeline. Upon successful payment verification, `clearUserCart(userId)` empties the active cart.

### 3.3 Centralized Pricing & Shipping Rules
* **Modules:** `src/lib/pricing.ts`, `src/lib/currency.ts`
* **Configuration:**
  - Free Shipping Threshold: **₹2,999** (`FREE_SHIPPING_THRESHOLD_INR`)
  - Standard Shipping Fee: **₹199** (`STANDARD_SHIPPING_FEE_INR`) — complimentary when subtotal $\ge ₹2,999$
  - Express Shipping Fee: **₹399** (`EXPRESS_SHIPPING_FEE_INR`)
* **Utilities:** `calculatePriceBreakdown`, `calculateShipping`, `calculateCartSubtotal`, `formatInr`, `parseInr`.
* **Reuse in Phase 4:** Used exclusively on the server to compute subtotal, shipping charges, discounts, and final payable INR amounts.

### 3.4 Product Catalog & Phase 3B Inventory Engine
* **Modules:** `src/lib/inventory.ts`, `src/lib/products.ts`
* **Capabilities:**
  - `checkProductAvailability`: Variant-level stock checks, status categorization (`in_stock`, `low_stock`, `out_of_stock`, `unavailable`).
  - `product_variants.stock_quantity`: Integer column tracking exact inventory per size and color.
  - Non-negative stock constraint: `CHECK (stock_quantity >= 0)`.
* **Reuse in Phase 4:** Pre-checkout stock validation, atomic inventory decrement locks, and order cancellation inventory restoral.

### 3.5 Security & Defense-in-Depth
* **Modules:** `src/lib/auth/csrf.ts`, `src/lib/ai/rate-limit.ts`
* **Capabilities:** `isRequestOriginValid` (validates `Origin`, `Host`, and `Sec-Fetch-Site`), sliding-window in-memory IP rate limiter.
* **Reuse in Phase 4:** Shields payment order creation, verification, and order mutation endpoints against CSRF and brute-force replay attacks.

---

## 4. Gap Analysis: Missing Phase 4 Functionality

| Functional Area | Current Status | Required Phase 4 Implementation |
| :--- | :--- | :--- |
| **Database Schema** | No order/payment tables | Additive migration for `orders`, `order_items`, `order_addresses`, `payments`, `payment_events`, `order_status_history`, and `inventory_reservations`. |
| **Checkout UI (`/checkout`)** | Missing (Cart drawer displays toast) | 5-step responsive checkout wizard: Cart Review, Delivery Address, Shipping Method, Order Summary, and Payment Initiation. |
| **Payment Order Creation API** | Missing | `POST /api/checkout/session` — server-side cart validation, stock verification, amount computation, and Razorpay order generation. |
| **Payment Verification API** | Missing | `POST /api/checkout/verify` — HMAC-SHA256 signature verification (`razorpay_order_id\|razorpay_payment_id`), atomic inventory deduction, and order confirmation. |
| **Payment Webhook API** | Missing | `POST /api/webhooks/razorpay` — raw body HMAC validation, idempotent processing of `payment.captured`, `payment.failed`, and `order.paid`. |
| **Inventory Reservation** | Missing | Atomic PostgreSQL transactional reservation system with TTL expiration to prevent overselling while checkout is in flight. |
| **Customer Orders Page (`/orders`)** | Only honest empty state | Connect to real orders from PostgreSQL; list order number, date, items, total, payment status, and dispatch status. |
| **Order Details Page (`/orders/[orderId]`)** | Missing | Detailed order timeline, courier tracking placeholder, line items, address snapshot, invoice summary, and cancellation request. |
| **Order Cancellation API** | Missing | `POST /api/orders/[id]/cancel` — validates eligibility, reverses inventory reservation/deduction, and updates status timeline. |
| **Customer Email Notifications** | Missing | Abstraction service (`src/lib/notifications/email.ts`) with templates for Order Confirmation, Payment Received, Payment Failed, and Cancellation. |

---

## 5. Database Architecture & Additive Migration Plan

To maintain backward compatibility and preserve all existing data, database changes will be executed via a dedicated additive SQL script (`scripts/migrate_phase4_checkout_orders.sql`) and mirrored in Drizzle ORM (`src/db/schema.ts`).

### Proposed Schema Additions

```sql
-- 1. Order Delivery Address Snapshots
CREATE TABLE IF NOT EXISTS order_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(128) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(64) NOT NULL,
    state VARCHAR(64) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    country VARCHAR(32) NOT NULL DEFAULT 'India',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Orders Master Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shipping_address_id UUID NOT NULL REFERENCES order_addresses(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT' 
        CHECK (status IN (
            'PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'PACKED', 
            'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 
            'RETURN_REQUESTED', 'RETURNED'
        )),
    subtotal_inr INT NOT NULL,
    shipping_fee_inr INT NOT NULL DEFAULT 0,
    shipping_method VARCHAR(32) NOT NULL DEFAULT 'standard' CHECK (shipping_method IN ('standard', 'express')),
    discount_inr INT NOT NULL DEFAULT 0,
    tax_inr INT NOT NULL DEFAULT 0,
    total_inr INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- 3. Order Items Table (Immutable historical price & title snapshots)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_title VARCHAR(255) NOT NULL,
    size VARCHAR(32) NOT NULL,
    color VARCHAR(64) NOT NULL,
    unit_price_inr INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    line_total_inr INT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 4. Payments Master Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    gateway VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY' CHECK (gateway IN ('RAZORPAY', 'SIMULATED_TEST')),
    gateway_order_id VARCHAR(128) NOT NULL,
    gateway_payment_id VARCHAR(128),
    gateway_signature VARCHAR(255),
    amount_inr INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED' 
        CHECK (status IN (
            'CREATED', 'PENDING', 'AUTHORIZED', 'PAID', 
            'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
        )),
    error_code VARCHAR(64),
    error_description TEXT,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway_order_id);

-- 5. Payment Events (Webhook Idempotency Log)
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    gateway VARCHAR(32) NOT NULL DEFAULT 'RAZORPAY',
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_payment_events_event_id ON payment_events(event_id);

-- 6. Order Status History Timeline
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status VARCHAR(32),
    new_status VARCHAR(32) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- 7. Temporary Inventory Reservations (Anti-overselling TTL lock)
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'COMMITTED', 'RELEASED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_inv_res_variant_id ON inventory_reservations(variant_id);
CREATE INDEX idx_inv_res_expires_at ON inventory_reservations(expires_at);
```

---

## 6. Payment Gateway Integration Architecture (Razorpay)

### 6.1 Dual-Mode Payment Architecture
1. **Official Razorpay REST API Client (`src/lib/payments/razorpay.ts`):**
   - Creates orders via `POST https://api.razorpay.com/v1/orders` using standard HTTP Basic Authentication (`RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET`).
   - Slices amounts in paise (1 INR = 100 paise) as required by Razorpay API.
   - Verifies customer payment signatures using Node built-in `crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")`.
   - Verifies webhook signatures using `crypto.createHmac("sha256", webhookSecret).update(rawPayload).digest("hex")`.
2. **Deterministic Sandbox Test Harness:**
   - When running automated integration tests or when `RAZORPAY_KEY_ID` is set to test mode (`rzp_test_*`), the system supports sandbox order simulation.
   - Strictly enforces real cryptographic HMAC validation so test assertions guarantee production correctness without calling live external banking networks.

### 6.2 Payment Order Lifecycle Transitions

```
[Customer Initiates Checkout]
          |
          v
       CREATED ────────► (Payment failed / rejected) ───► FAILED
          |
          v
      AUTHORIZED
          |
          v
         PAID ──────────► (Customer cancel / refund) ───► REFUNDED
```

---

## 7. Inventory Consistency & Anti-Overselling Strategy

A major failure mode in high-traffic e-commerce is overselling when multiple customers check out the final piece simultaneously.

### Two-Phase Inventory Consistency Architecture:
1. **Phase 1: Temporary Reservation (`inventory_reservations`):**
   - When a customer generates a checkout session, an atomic transaction checks available variant stock:  
     $$\text{Available Stock} = \text{stock\_quantity} - \sum \text{Active Reservations}$$
   - If stock is sufficient, rows are inserted into `inventory_reservations` with a 15-minute TTL (`expires_at = NOW() + INTERVAL '15 minutes'`).
   - If stock is insufficient, the checkout session creation fails immediately with a detailed out-of-stock notice.
2. **Phase 2: Atomic Commitment or Expiry Release:**
   - **Upon Successful Payment Verification:** In a single PostgreSQL transaction, the reservation is marked `COMMITTED`, and the variant stock is decremented atomically:
     ```sql
     UPDATE product_variants 
     SET stock_quantity = stock_quantity - $reservedQty 
     WHERE id = $variantId AND stock_quantity >= $reservedQty;
     ```
   - **Upon Payment Failure or Expiry:** Reservations past `expires_at` with status `RESERVED` are automatically released and ignored during subsequent availability checks.

---

## 8. Security & Risk Analysis

| Security Risk | Attack Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Price Tampering** | Client submits modified price or shipping amount in request payload. | Server-authoritative recalculation: subtotal, shipping, discounts, and totals are recomputed exclusively in `src/lib/pricing.ts` from PostgreSQL. Frontend totals are completely ignored. |
| **IDOR / Cross-Customer Access** | Customer A accesses or cancels Customer B's order via `/api/orders/[id]`. | Strict authorization check on every order query: `WHERE orders.id = $orderId AND orders.user_id = $authUserId`. |
| **Payment Signature Forgery** | Attacker invokes `/api/checkout/verify` with fake payment IDs. | Server-side HMAC-SHA256 signature verification using unshared `RAZORPAY_KEY_SECRET`. |
| **Webhook Replay Attacks** | Duplicate webhook deliveries or spoofed webhook events. | `payment_events` table enforces unique constraint on `event_id`. All webhook operations are idempotent. |
| **CSRF on Mutations** | Cross-site form post initiating unauthorized orders or cancellations. | Enforces `isRequestOriginValid(req)` on all state-changing routes (`POST`, `DELETE`). |
| **Double Fulfillment** | Customer double-clicks "Pay" or both webhook and client callback trigger confirmation simultaneously. | Idempotent transaction: if order status is already `CONFIRMED` or `PROCESSING`, secondary confirmation calls return success without deducting inventory twice. |

---

## 9. Implementation Sequence

```
1. DATABASE MIGRATION
   ├── scripts/migrate_phase4_checkout_orders.sql
   └── Update src/db/schema.ts (orders, payments, reservations)
            |
            v
2. BACKEND SERVICES & ENGINES
   ├── src/lib/inventory/reservation.ts (Anti-overselling TTL lock)
   ├── src/lib/payments/razorpay.ts (Order creation, HMAC signature verification)
   ├── src/lib/orders/order-service.ts (Order lifecycle, status transitions)
   └── src/lib/notifications/email.ts (Transactional notification templates)
            |
            v
3. CHECKOUT & ORDER API ROUTES
   ├── POST /api/checkout/session (Create order & Razorpay session)
   ├── POST /api/checkout/verify (Signature verification & atomic fulfillment)
   ├── POST /api/webhooks/razorpay (Raw payload webhook listener)
   ├── GET /api/orders & GET /api/orders/[id] (Isolated order queries)
   └── POST /api/orders/[id]/cancel (Eligible order cancellation)
            |
            v
4. FRONTEND USER EXPERIENCE
   ├── src/app/checkout/page.tsx (Multi-step checkout wizard)
   ├── src/components/checkout/ (Step components matching LOOMERA aesthetic)
   ├── src/app/account/orders/page.tsx (Real orders list)
   ├── src/app/account/orders/[id]/page.tsx (Detailed order timeline)
   └── Connect CartDrawer "Proceed to Order Review" -> /checkout
            |
            v
5. COMPREHENSIVE AUTOMATION TESTING
   ├── scripts/test_phase4_checkout_orders.ts (60+ assertions)
   └── Unit, Integration, Security, and Concurrency Tests
            |
            v
6. REGRESSION AUDIT & BUILD
   ├── Run npm test (All Phase 1, 2, 3A, 3B, and Phase 4 tests)
   ├── Run npx tsc --noEmit & npm run lint
   └── Run npm run build (Turbopack production build)
```

---

## 10. Audit Sign-Off

The existing LOOMERA codebase is architecturally solid and ready for the Phase 4 implementation. All existing systems have been validated without regressions. Implementation will proceed strictly in accordance with this plan.
