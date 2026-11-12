# LOOMERA — Authoritative REST API Specification

## 1. Overview & Protocol Standards

The LOOMERA API is built on Next.js 16 App Router Route Handlers. All payloads use standard JSON (`application/json`) with UTF-8 encoding. All currency values are calculated server-authoritatively in **Indian Rupees (INR)**.

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Authentication required or session expired.
- `403 Forbidden`: Insufficient role-based permissions (RBAC).
- `404 Not Found`: Target entity does not exist.
- `409 Conflict`: Business logic violation (e.g., insufficient stock).
- `500 Internal Server Error`: Server failure with sanitized error message.

---

## 2. Public Storefront Endpoints

### `GET /api/products`
Retrieves published garments from the catalog with optional filtering, search, and sorting.
- **Query Parameters**:
  - `category` *(string, optional)*: Filter by category slug (`men`, `boys`, `handloom`, `new-arrivals`).
  - `q` *(string, optional)*: Case-insensitive title and description keyword search.
  - `sort` *(string, optional)*: `price-asc`, `price-desc`, `newest`, `popular`.
- **Response**: Array of published product records with variants and image galleries.

### `GET /api/products/[slug]`
Retrieves full details for a single garment by slug or ID.
- **Response**: Single product object including SKU variants, inventory counts, pairing recommendations, and luxury craftsmanship details.

### `GET /api/recommendations`
Retrieves AI-driven personalized product recommendations.
- **Query Parameters**:
  - `productId` *(string, optional)*: Reference product for complementary pairing.
  - `limit` *(number, optional, default: 4)*: Maximum recommendations to return.

### `GET /api/health`
System operational diagnostic and database connectivity check.
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-12T16:55:00.000Z",
    "database": "connected",
    "uptime": 12450
  }
  ```

---

## 3. Customer Authentication & Session

### `POST /api/auth/register`
Creates a new customer account with Argon2id password hashing.
- **Payload**: `{ "email": "...", "password": "...", "name": "..." }`
- **Response**: User object and sets `HttpOnly` session cookie.

### `POST /api/auth/login`
Authenticates existing patron and establishes session.
- **Payload**: `{ "email": "...", "password": "..." }`
- **Response**: User object and sets `HttpOnly` session cookie.

### `POST /api/auth/logout`
Terminates active session and clears authentication cookies.

### `GET /api/auth/me`
Retrieves current authenticated patron profile, role, and active session expiry.

---

## 4. Shopping Cart & Authoritative Validation

### `GET /api/cart`
Retrieves current cart items for authenticated user or anonymous session.

### `POST /api/cart`
Adds or updates item quantity in cart.
- **Payload**: `{ "variantId": "...", "quantity": 1 }`

### `POST /api/cart/validate`
Authoritative server-side price validation engine. Ignores client prices and re-calculates subtotals, discounts, and free shipping qualification against database records.
- **Payload**: `{ "items": [{ "productId": "...", "quantity": 1 }] }`
- **Response**: `{ "isValid": true, "subtotal": 2499, "isFreeShipping": false, "shippingFee": 150 }`

### `POST /api/cart/merge`
Merges guest cart into authenticated user cart upon login.

---

## 5. Checkout & Payments (Razorpay)

### `POST /api/checkout/session`
Initiates secure checkout. Atomically creates 15-minute stock reservations in `inventory_reservations` and creates a Razorpay INR payment order.
- **Payload**: `{ "shippingAddress": { ... }, "couponCode": "WELCOME10" }`
- **Response**: `{ "orderId": "ord_...", "razorpayOrderId": "order_...", "amount": 249900, "currency": "INR" }`

### `POST /api/checkout/verify`
Cryptographically verifies Razorpay payment signature (`razorpay_signature`) and confirms order into `PROCESSING` state.
- **Payload**: `{ "orderId": "...", "razorpayPaymentId": "...", "razorpaySignature": "..." }`

---

## 6. AI Shopping Assistant

### `POST /api/assistant/chat`
Autonomous fashion concierge providing sizing recommendations, luxury fabric styling advice, and cart pairing suggestions.
- **Payload**: `{ "message": "What should I wear to a summer wedding?", "conversationId": "..." }`
- **Response**: `{ "reply": "...", "suggestedProducts": [...], "suggestedActions": [...] }`

---

## 7. Administrative & Operations API (`/api/admin/*`)

*All administrative endpoints require authenticated user session with `OPERATOR` or `ADMIN` role.*

### Analytics & Reporting
- `GET /api/admin/analytics`: Aggregated GMV, orders, inventory valuation, and sales timeline.
- `GET /api/admin/analytics/commerce`: Conversion rate, average order value, cart abandonment rate.
- `GET /api/admin/audit-logs`: Immutable chronological log of administrative operations.

### Inventory & Catalog Operations
- `GET /api/admin/products`: Full catalog with cost prices, supplier lead times, and SKU counts.
- `POST /api/admin/products`: Create new luxury garment.
- `PATCH /api/admin/products/[id]`: Update product metadata, status, or pricing.
- `POST /api/admin/inventory/movements`: Record stock receipts, write-offs, and reconciliations.

### Orders, Fulfillment & Returns
- `GET /api/admin/orders`: Search, filter, and paginate customer orders.
- `PATCH /api/admin/orders/[id]`: Update status (`PROCESSING`, `SHIPPED`, `DELIVERED`).
- `POST /api/admin/orders/[id]/shipment`: Generate waybill and assign tracking carrier.
- `POST /api/admin/orders/[id]/refund`: Issue partial or full refund with Razorpay reversal.
- `GET /api/admin/returns`: Return authorization request management.

---

## 8. Autonomous Business Intelligence API (`/api/admin/intelligence/*`)

*Phase 10 Decision-Support & Predictive Analytics Engines.*

- `GET /api/admin/intelligence/overview`: Authoritative financial overview (Gross Revenue, Net Sales, Realized Profit, Gateway Fees, COGS Disclosures).
- `GET /api/admin/intelligence/forecasts`: 7-day predictive demand models (SMA, EWMA, upper/lower confidence bounds).
- `GET /api/admin/intelligence/inventory`: Effective stock, reservation locks, runout days, and automated restock suggestions.
- `GET /api/admin/intelligence/churn`: RFM interval-disruption customer churn scores and risk tiering.
- `GET /api/admin/intelligence/profitability`: Per-garment unit economics and margin ranking.
- `GET /api/admin/intelligence/anomalies`: Active statistical deviations in revenue, return volume, and conversion.
- `GET /api/admin/intelligence/marketing`: Multi-touch channel attribution and promotional discount efficacy.
- `POST /api/admin/intelligence/reports`: Trigger on-demand executive daily/weekly report generation and CSV download.
- `GET /api/admin/intelligence/recommendations`: Unified actionable business proposals.
- `POST /api/admin/intelligence/recommendations`: Approve or dismiss actionable recommendations.
- `POST /api/admin/intelligence/analyst`: AI Business Analyst query endpoint with 12 grounded analytical tools.
- `POST /api/admin/intelligence/jobs`: Trigger manual or scheduled background analytical jobs (`ANOMALY_DETECTION`, `DEMAND_FORECAST`).

---

## 9. Webhook Ingress Handlers

### `POST /api/webhooks/razorpay`
Asynchronous payment gateway event listener. Validates HMAC SHA-256 webhook signatures before transitioning order states (`payment.captured`, `payment.failed`, `refund.processed`).

### `POST /api/webhooks/shipping/[carrier]`
Carrier logistics tracking updates (`in_transit`, `out_for_delivery`, `delivered`) for automated order timeline progression.
