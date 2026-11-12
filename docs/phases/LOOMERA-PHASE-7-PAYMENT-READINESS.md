# LOOMERA — PAYMENT GATEWAY LIVE READINESS & INTEGRATION AUDIT

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Payment Gateway:** Razorpay (RBI Compliant, Sovereign Indian Currency INR Settlement)  
**Security Standard:** PCI DSS Level 1 Compliant via Razorpay Hosted Checkout  
**Verification Status:** Verified Ready for Production Cutover  

---

## 1. Payment Integration Architecture

All commercial transactions on the LOOMERA atelier storefront are transacted exclusively in **Indian Rupees (INR)**. The payment pipeline adheres strictly to server-authoritative pricing and cryptographic verification.

```
Patron (Browser)            Next.js App Server (API)          Razorpay Gateway
       │                               │                             │
       │ 1. POST /api/checkout/session │                             │
       ├──────────────────────────────►│ (Validates Server Prices)   │
       │                               │ (Locks 15-min Reservation)  │
       │                               │ 2. Create Order in Paise    │
       │                               ├────────────────────────────►│
       │                               │ 3. Returns Gateway Order ID │
       │                               │◄────────────────────────────┤
       │ 4. Client Receives Order ID   │                             │
       │◄──────────────────────────────┤                             │
       │                                                             │
       │ 5. Opens Razorpay Modal & Captures UPI / Cards / Netbanking │
       ├────────────────────────────────────────────────────────────►│
       │                                                             │
       │ 6. Cryptographic Payment Signature Callback                 │
       │◄────────────────────────────────────────────────────────────┤
       │                                                             │
       │ 7. POST /api/checkout/verify (HMAC SHA-256 Timing-Safe)     │
       ├──────────────────────────────►│                             │
       │                               │ 8. Confirms & Commits Stock │
       │ 9. Order Confirmed Page       │                             │
       │◄──────────────────────────────┤                             │
       │                               │ 10. Async Server Webhook    │
       │                               │◄────────────────────────────┤
       │                               │ (Idempotent Backup Confirm) │
```

---

## 2. Currency Precision & Paise Engine

1. **Subunit Precision (Paise Conversion):**
   - Razorpay API expects monetary values in the smallest currency unit (paise).
   - $$1 \text{ INR} = 100 \text{ paise}$$
   - Conversion handled by `Math.round(amountInr * 100)`.
   - Never pass fractional paise to the gateway API.
2. **Authoritative Cart Validation:**
   - Client-submitted totals are strictly ignored by `/api/checkout/session`.
   - The server resolves all items directly against `products` and `product_variants` tables in PostgreSQL, recomputes item subtotals, verifies free shipping thresholds (₹2,999), and sets the gateway order amount authoritatively.

---

## 3. Cryptographic Signature Verification & Security

### 3.1 Client Callback Verification (`/api/checkout/verify`)
- Client submits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
- Server reconstructs payload: `${orderId}|${paymentId}`.
- Server computes HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
- Validated using `crypto.timingSafeEqual` to thwart timing side-channel attacks.

### 3.2 Webhook Signature Verification (`/api/webhooks/razorpay`)
- Webhook signature transmitted in `x-razorpay-signature` header.
- Computed over the **unparsed raw text body** (`req.text()`) using `RAZORPAY_WEBHOOK_SECRET`.
- Timing-safe comparison guarantees zero tampering in transit.

---

## 4. Idempotency & Webhook Deduplication

Network retries and duplicate webhooks from Razorpay are mitigated through database idempotency:
1. Every incoming webhook payload is checked against the `payment_events` table using `payload.id` (`eventId`).
2. If `eventId` exists, the endpoint immediately returns HTTP 200 `{ success: true, message: "Event already processed" }`.
3. If new, the event is recorded in `payment_events` with raw JSON payload for audit traceability before order/payment status updates are performed in a PostgreSQL transaction.

---

## 5. Failure Modes & Edge Case Handling

| Scenario | System Behavior |
|---|---|
| **Patron Abandons Checkout Modal** | Stock remains in `inventory_reservations` for 15 minutes. Background janitor releases reservations automatically upon TTL expiration. Physical stock is untouched. |
| **Payment Failed / Card Declined** | Razorpay sends `payment.failed` webhook. Payment status updated to `FAILED`, reservations released immediately to replenish available inventory. |
| **Network Timeout During Callback** | If patron closes browser before `/api/checkout/verify` executes, Razorpay's asynchronous webhook (`payment.captured`) updates order to `CONFIRMED` and commits stock. |
| **Refunds & Order Cancellations** | Managed via `/api/admin/orders/[id]/refund` with full audit ledger tracking, gateway refund initiation, and optional inventory restocking. |

---

## 6. Production Go-Live Checklist (Pre-Launch Protocol)

Before processing live credit cards or UPI payments:
- [ ] Confirm Razorpay KYC is activated and account status is **Live**.
- [ ] Generate Live Key ID (`rzp_live_...`) and Live Key Secret in Razorpay Dashboard.
- [ ] Configure Webhook URL in Razorpay Dashboard: `https://loomera.com/api/webhooks/razorpay`.
- [ ] Subscribe to events: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`.
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` in production secret vault.
- [ ] Run 1 real INR transaction (₹1 or ₹100) using a real UPI ID/card to verify live settlement.
- [ ] Issue full refund on test transaction to verify refund webhook callback.

---
*End of Payment Readiness Specification.*
