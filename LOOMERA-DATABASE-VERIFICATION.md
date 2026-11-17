# LOOMERA — Production Database & Schema Verification Report

**Date:** November 16, 2026  
**Auditor:** Senior PostgreSQL Database Administrator & Next.js Systems Architect  
**Project:** LOOMERA Luxury Fashion E-Commerce  
**Database Provider:** Supabase Managed PostgreSQL 17  
**Project Reference:** `vgqaytnajvyltxyohwtt`  
**Host Region:** AWS `ap-south-1` (Mumbai, India)  
**Status:** Architecture Certified — Connection Pooling & Topology Verified

---

## 1. Executive Summary

This report establishes the complete verification of LOOMERA's **48-table relational schema** and details the technical connection architecture required for seamless operation between **Vercel Serverless Functions** and **Supabase Managed PostgreSQL**.

A critical infrastructure barrier was identified: Supabase direct endpoints (`db.[ref].supabase.co:5432`) resolve strictly via **IPv6 (AAAA)** on the standard cloud tier. Because Vercel serverless lambdas operate on IPv4 outbound egress, direct connections fail at the network transport layer. The application must connect via the **Supabase Transaction Pooler (Supavisor) on Port 6543**, which resolves to dual-stack IPv4/IPv6 AWS Network Load Balancers in Mumbai.

---

## 2. Complete 48-Table Relational Topology

All 48 tables defined in `frontend/src/db/schema.ts` have been verified for integrity, foreign key relations, constraints, and Drizzle ORM model alignment:

### A. Catalog & Merchandising (Tables 1–4)
1. `categories` — Category metadata, creative direction, hero art, and display order.
2. `products` — Core product entities, INR prices, fabric specifications, and publication status.
3. `product_variants` — Granular SKU combinations (Color, Hex, Size, Inventory Count).
4. `product_images` — Primary editorial photos, thumbnails, and responsive asset mappings.

### B. Patron Identity & Authentication (Tables 5–6)
5. `users` — Patron credentials (Argon2 hashes), email verification, and RBAC roles (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`).
6. `sessions` — Cryptographic cookie session tokens and revocation timestamps.

### C. Shopping Experience & Curation (Tables 7–14)
7. `carts` — Server-backed patron shopping carts.
8. `cart_items` — Cart lines, verified variant snapshots, and quantity tracking.
9. `wishlists` — Patron curated wishlists.
10. `wishlist_items` — Saved wardrobe items with timestamps.
11. `restock_records` — Catalog SKU stock replenishment logs.
12. `restock_notifications` — Out-of-stock waitlist alerts and patron notification preferences.
13. `product_view_history` — Patron browsing telemetries for personalized recommendation modeling.
14. `search_history` — Natural-language query audit trail for concierge intent discovery.

### D. Orders, Checkout & Payments (Tables 15–20)
15. `order_addresses` — Structured Indian delivery addresses (PIN code, state, city, street).
16. `orders` — Financial transactions, GMV, fulfillment status, and delivery milestones.
17. `order_items` — Immutable order line snapshots with point-of-sale pricing.
18. `payments` — Razorpay payment IDs, signature hashes, and gateway verification records.
19. `payment_events` — Webhook event audits for payment lifecycle transitions.
20. `order_status_history` — Comprehensive audit log of order state changes.

### E. Inventory Operations & Governance (Tables 21–24)
21. `inventory_reservations` — Temporary stock holds during checkout to prevent overselling.
22. `admin_audit_logs` — Immutable administrative action logs for security and compliance.
23. `inventory_movements` — Restock, adjustment, shrinkage, and fulfillment movements.
24. `inventory_settings` — Low-stock threshold alerts and warehouse buffer rules.

### F. Fulfilment & Post-Purchase (Tables 25–28)
25. `shipments` — Carrier assignments (BlueDart, Delhivery, etc.), tracking IDs, and dispatch states.
26. `shipment_events` — Carrier webhook tracking scans and transit updates.
27. `return_requests` — 15-day doorstep return authorizations and reason taxonomy.
28. `return_items` — Itemized inspection results and refund eligibility.

### G. Growth, Loyalty & Commerce (Tables 29–32)
29. `coupons` — Promotional codes, percentage/fixed discounts, minimum basket criteria, and usage caps.
30. `coupon_redemptions` — One-time-use redemption audits per patron account.
31. `loyalty_accounts` — Tiered patron reward balances (Atelier Silver, Gold, Platinum).
32. `loyalty_transactions` — Point earnings, redemptions, and expiry ledgers.

### H. Support & Communication (Tables 33–36)
33. `support_tickets` — Concierge service inquiries, priority levels, and assignment states.
34. `support_messages` — Client-analyst conversation threads and resolution notes.
35. `customer_notifications` — Transactional notifications (Order placed, Dispatched, Delivered).
36. `notification_preferences` — Email, SMS, and WhatsApp opt-in preferences.

### I. Marketing & Experimentation (Tables 37–42)
37. `marketing_campaigns` — UTM campaign definitions and promotional flight dates.
38. `campaign_attributions` — First-touch and last-touch order attribution models.
39. `cart_recovery_events` — Abandoned checkout recovery tokens and email dispatch sequences.
40. `experiments` — A/B testing configurations and hypothesis descriptions.
41. `experiment_assignments` — Deterministic hash bucket allocations across visitor sessions.
42. `analytics_events` — Micro-interaction funnel analytics (view, add_to_cart, checkout_start).

### J. Autonomous Business Intelligence (Tables 43–48)
43. `demand_forecasts` — 7-day, 14-day, and 30-day SKU demand predictions.
44. `forecast_evaluations` — Mean Absolute Percentage Error (MAPE) tracking against actual sales.
45. `business_anomalies` — Automated anomaly alerts (Spike in returns, sudden drop in conversion).
46. `business_recommendations` — Prescriptive actions with confidence scoring and impact estimations.
47. `scheduled_report_runs` — Automated daily/weekly GMV and unit-economics summaries.
48. `intelligence_job_runs` — Background scheduled cron job telemetry and execution timers.

---

## 3. Network Transport & Pooling Investigation

### A. The Direct Endpoint IPv6 Barrier
- **Target Host:** `db.vgqaytnajvyltxyohwtt.supabase.co`
- **DNS Query:** `Resolve-DnsName db.vgqaytnajvyltxyohwtt.supabase.co`
- **Result:**
  ```text
  QueryType: AAAA (IPv6)
  IP6Address: 2406:da1c:4c7:f802:0:8729:2dec:a9d2
  (No IPv4 'A' record exists)
  ```
- **Architectural Impact:** Vercel serverless execution environments run inside AWS Lambda containers that route internet traffic over standard IPv4 NAT gateways. When a serverless function attempts to connect to `db.[ref].supabase.co`, DNS fails to resolve an IPv4 address, immediately aborting the connection.

### B. The Supavisor Transaction Pooler (Solution)
- **Pooler Host:** `aws-0-ap-south-1.pooler.supabase.com`
- **Region:** AWS Mumbai (`ap-south-1`)
- **DNS Query:** `Resolve-DnsName aws-0-ap-south-1.pooler.supabase.com`
- **Result:**
  ```text
  IP4Address: 3.111.105.85
  IP4Address: 65.0.195.55
  (Dual-stack IPv4 and IPv6 active via AWS Network Load Balancer)
  ```
- **Port:** `6543` (Transaction Mode)
- **User Format:** `postgres.vgqaytnajvyltxyohwtt`

---

## 4. Driver & Connection String Blueprint

### Required Production Connection String (for Vercel):
```text
postgresql://postgres.vgqaytnajvyltxyohwtt:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Required Code-Level Pool Configuration (`src/db/index.ts`):
```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5434/loomera";

const isProduction = process.env.NODE_ENV === "production";
const isCloudDb =
  connectionString.includes("supabase.co") ||
  connectionString.includes("pooler.supabase.com") ||
  connectionString.includes("sslmode=require");

declare global {
  var __dbPool: Pool | undefined;
}

let pool: Pool;

if (!globalThis.__dbPool) {
  globalThis.__dbPool = new Pool({
    connectionString,
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}
pool = globalThis.__dbPool;

export const db = drizzle(pool, { schema });
export { pool, schema };
```

---
*Report filed by Senior PostgreSQL Database Administrator.*
