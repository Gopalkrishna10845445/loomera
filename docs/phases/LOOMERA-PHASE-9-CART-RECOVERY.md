# LOOMERA — PHASE 9 ABANDONED CART RECOVERY SYSTEM
## Autonomous Dormant Cart Detection, Cryptographic Tokens, Re-engagement Sequences & Recovered Revenue Analytics

**Author:** Senior Full-Stack Engineer & Retention Strategist  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. SYSTEM OBJECTIVE & LUXURY ALIGNMENT

In luxury e-commerce, shopping bag abandonment frequently exceeds 70%. Patrons rarely abandon due to lack of interest; instead, drop-offs occur due to momentary distraction, indecision between sizes, or postponement of checkout.

Aggressive discount popups and spammy SMS bombardment undermine the prestige of an artisanal brand. LOOMERA's Phase 9 Cart Recovery engine implements a **high-touch, respectful re-engagement system**:
- **Dormancy Threshold:** Identifies carts that have sat untouched for $\ge 2$ hours.
- **Cryptographic Security:** Generates single-use, 24-character hexadecimal recovery tokens (`lrc_...`).
- **Incentive Calibration:** Offers a refined 10% privilege code (`WELCOMEBACK10`) rather than cheapening clearance tactics.
- **Strict Frequency Capping:** Enforces a rigid rule of at most **1 recovery notification per cart session**.
- **Automated Conversion Attribution:** Automatically flags recovered carts upon order verification and attributes the captured INR revenue.

---

### 2. RECOVERY WORKFLOW & STATE MACHINE

```
   [ Active Shopping Bag ]
              │
              │  (2+ Hours Inactivity)
              ▼
   [ Candidate Abandoned Cart ]
              │
              │  (Idempotency & Frequency Cap Verification)
              ▼
    [ Issue Recovery Event ]
     - recovery_token: "lrc_4a9b2c..."
     - status: "REMINDED"
     - notification dispatched to patron
              │
              │  (Customer clicks personalized recovery link)
              ▼
      [ Token Validated ]
     - status: "CLICKED"
     - redirect to /checkout?recovered=true&coupon=WELCOMEBACK10
              │
              │  (Payment verified via Razorpay)
              ▼
   [ Converted & Recovered ]
     - status: "RECOVERED"
     - recovered_order_id linked
     - recovered_at timestamped
```

---

### 3. DATABASE SCHEMA SPECIFICATION (`cart_recovery_events`)

The system is anchored by PostgreSQL table 39 (`cart_recovery_events`):

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Unique primary key (`gen_random_uuid()`) |
| `cart_id` | `UUID` (FK) | Reference to `carts.id` (cascades on delete) |
| `user_id` | `UUID` (FK) | Reference to `users.id` (set null on delete) |
| `customer_email` | `TEXT` | Recipient email address |
| `customer_name` | `TEXT` | Personalized recipient salutation |
| `recovery_token` | `TEXT` (Unique) | Single-use token: `lrc_` + 24 secure random hex bytes |
| `cart_total_inr` | `INTEGER` | Gross value of abandoned garments in INR |
| `item_count` | `INTEGER` | Total quantity of items in dormant bag |
| `discount_code_offered`| `TEXT` | Pre-approved incentive code (e.g. `WELCOMEBACK10`) |
| `status` | `TEXT` | Finite states: `REMINDED`, `CLICKED`, `RECOVERED`, `EXPIRED` |
| `reminded_at` | `TIMESTAMPTZ` | Timestamp when recovery reminder was dispatched |
| `clicked_at` | `TIMESTAMPTZ` | Timestamp when patron accessed the recovery link |
| `recovered_at` | `TIMESTAMPTZ` | Timestamp when successful payment was verified |
| `recovered_order_id`| `UUID` (FK) | Reference to completed order in `orders.id` |

---

### 4. CORE ENGINE APIS & SERVICES

#### A. Service Engine (`cart-recovery-service.ts`)
- `scanForAbandonedCarts({ idleHours: 2, maxAgeHours: 168 })`:
  Computes live aggregations across `carts`, `cart_items`, and `products` to identify eligible dormant carts.
- `dispatchCartRecoveryReminder(params)`:
  Validates idempotency, generates token, records event, and safely logs or transmits notification.
- `processCartRecoveryToken(token)`:
  Resolves recovery token, sets status to `CLICKED`, and returns the cart context for checkout hydration.
- `recordRecoveryConversionByUser(userId, orderId)`:
  Invoked by `/api/checkout/verify` upon successful payment verification to close the loop.
- `getCartRecoveryMetrics()`:
  Calculates abandonment rates, click-through rates, and total recovered revenue in INR.

#### B. API Endpoints
1. `GET /api/cart/recover/[token]`:
   Public entrypoint for recovery links. Validates token and performs 307 redirect directly to checkout with auto-applied voucher.
2. `GET /api/admin/cart-recovery`:
   Protected administrative endpoint returning real-time list of abandoned carts and overall conversion metrics.
3. `POST /api/admin/cart-recovery/trigger`:
   Protected administrative trigger to execute batch recovery dispatches against dormant carts.

---

### 5. PRIVACY, CONSENT & ANTI-SPAM PROTOCOLS

1. **Explicit Preference Adherence:**
   Before dispatching external communications, the system checks `notification_preferences.promotional_email`. If the patron has opted out of promotional alerts, external dispatch is bypassed.
2. **Frequency Capping:**
   Strict database-level checks ensure that no cart receives more than 1 recovery notification within any 7-day window.
3. **Cryptographic Entropy:**
   Tokens utilize `crypto.randomBytes(24)`, providing $2^{192}$ bits of entropy, rendering brute-force or link enumeration attacks mathematically impossible.
4. **Safe Sandbox Operation:**
   During development and staging, notifications utilize the unified fallback logger, preventing unsolicited external emails while maintaining 100% testable verification.
