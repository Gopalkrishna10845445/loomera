# LOOMERA — Database Architecture & Schema Specification

## 1. Overview

**LOOMERA** utilizes a robust PostgreSQL 17 relational database managed through **Drizzle ORM 0.45.4**. The schema is defined authoritatively in TypeScript at `frontend/src/db/schema.ts` and maps to **48 production tables** across 7 domain modules.

---

## 2. Connection & Pool Configuration

The database client is configured in `frontend/src/db/index.ts`:

- **Driver**: `node-postgres` (`pg.Pool`)
- **SSL**: Automatic detection. When connecting to cloud PostgreSQL providers (such as Supabase), SSL is enforced with `rejectUnauthorized: false` to allow managed cert chains.
- **Connection Limits**: Pool size default is 10 connections per serverless instance to prevent port exhaustion on high concurrency.

```typescript
// Connection String Format
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
```

---

## 3. Comprehensive Domain Table Directory (48 Tables)

### Module 1: Product Catalog & Taxonomy (6 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `categories` | Product hierarchy & navigation categories | `id` (serial) | `slug` (unique) |
| `products` | Core luxury apparel garments | `id` (text slug) | `category_slug` -> `categories.slug`, `is_published` |
| `product_variants` | Garment SKUs (Color, Size combinations) | `id` (text sku) | `product_id` -> `products.id`, `sku` (unique) |
| `product_images` | Gallery media and photography | `id` (serial) | `product_id` -> `products.id` |
| `product_pairings` | Curated luxury styling combinations | `id` (serial) | `product_id`, `paired_product_id` |
| `inventory_history` | Ledger of stock adjustments and receipts | `id` (serial) | `variant_id` -> `product_variants.id` |

### Module 2: Authentication, Security & Customers (5 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `users` | Authenticated customer and staff accounts | `id` (uuid) | `email` (unique), `role` (`CUSTOMER`, `OPERATOR`, `ADMIN`) |
| `sessions` | Active HttpOnly cookie sessions | `id` (uuid) | `user_id` -> `users.id`, `token` (unique), `expires_at` |
| `user_preferences` | AI assistant gathered preferences | `id` (serial) | `user_id` -> `users.id` |
| `search_history` | Customer query history for personalization | `id` (serial) | `user_id` -> `users.id` |
| `product_views` | Browsing telemetry for recommendation engine | `id` (serial) | `user_id` -> `users.id`, `product_id` -> `products.id` |

### Module 3: Commerce, Cart, Orders & Fulfillment (8 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `cart_items` | Customer cart contents (guest & authenticated) | `id` (serial) | `user_id`, `session_token`, `variant_id` |
| `wishlist_items` | Saved garment lists | `id` (serial) | `user_id` -> `users.id`, `product_id` -> `products.id` |
| `orders` | Authoritative customer purchases | `id` (text) | `user_id` -> `users.id`, `order_number` (unique), `status` |
| `order_items` | Individual purchased SKUs and prices | `id` (serial) | `order_id` -> `orders.id`, `variant_id` |
| `order_timeline` | Historical order state audit log | `id` (serial) | `order_id` -> `orders.id` |
| `inventory_reservations` | Temporary stock locks during checkout | `id` (uuid) | `variant_id` -> `product_variants.id`, `expires_at` |
| `shipments` | Courier tracking & dispatch records | `id` (uuid) | `order_id` -> `orders.id`, `tracking_number` |
| `returns` | Return & refund lifecycle records | `id` (uuid) | `order_id` -> `orders.id`, `status` |

### Module 4: Marketing, Promotions & Retention (6 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `coupons` | Promotional voucher codes & limits | `id` (uuid) | `code` (unique), `is_active`, `valid_until` |
| `coupon_usages` | Customer redemption history | `id` (uuid) | `coupon_id` -> `coupons.id`, `user_id` -> `users.id` |
| `campaigns` | Targeted promotional campaigns | `id` (uuid) | `code` (unique), `status` |
| `cart_recovery` | Abandoned cart recovery tokens & emails | `id` (uuid) | `cart_id`, `recovery_token` (unique), `status` |
| `loyalty_accounts` | Customer loyalty tier & points ledger | `id` (uuid) | `user_id` (unique) -> `users.id`, `tier` |
| `loyalty_transactions` | Points accrual and redemption audit trail | `id` (uuid) | `account_id` -> `loyalty_accounts.id` |

### Module 5: Customer Analytics & Experimentation (4 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `attribution_events` | Multi-touch customer acquisition sources | `id` (uuid) | `visitor_id`, `utm_source`, `utm_campaign` |
| `customer_rfm` | RFM segmentation scores (Recency, Freq, Mon) | `id` (uuid) | `user_id` (unique) -> `users.id`, `segment` |
| `experiments` | A/B testing experiment definitions | `id` (text) | `status` (`DRAFT`, `RUNNING`, `CONCLUDED`) |
| `experiment_variants` | Performance metrics per experiment branch | `id` (text) | `experiment_id` -> `experiments.id` |

### Module 6: Autonomous Business Intelligence — Phase 10 (6 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `demand_forecasts` | Predictive 7-day garment demand projections | `id` (uuid) | `product_id` -> `products.id`, `forecast_date` |
| `customer_churn_scores` | Machine learning churn probability rankings | `id` (uuid) | `user_id` -> `users.id`, `risk_level` |
| `product_profitability` | Unit economics, net margin & fee breakdown | `id` (uuid) | `product_id` -> `products.id` |
| `business_anomalies` | Statistical revenue & inventory deviation alerts | `id` (uuid) | `metric_name`, `severity`, `status` |
| `action_recommendations` | Unified actionable business proposals | `id` (uuid) | `category`, `status` (`PENDING`, `APPROVED`) |
| `intelligence_job_runs` | Background analytical scheduler telemetry | `id` (uuid) | `job_name`, `status`, `started_at` |

### Module 7: Operations, Support & Governance (4 Tables)
| Table | Description | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `support_tickets` | Customer service inquiries & disputes | `id` (uuid) | `user_id` -> `users.id`, `ticket_number` (unique) |
| `support_messages` | Threaded customer support conversation items | `id` (uuid) | `ticket_id` -> `support_tickets.id` |
| `audit_logs` | Immutable administrative mutation ledger | `id` (uuid) | `user_id` -> `users.id`, `action`, `created_at` |
| `restock_notifications` | Back-in-stock customer alerts | `id` (serial) | `variant_id` -> `product_variants.id`, `is_notified` |

---

## 4. Database Migration & Seed Workflow

All migrations and seed scripts are located in `frontend/scripts/`:

```bash
# 1. Inspect existing database tables and schema
npx tsx scripts/inspect_db.ts

# 2. Seed luxury apparel catalog, variants, and initial taxonomy
npx tsx scripts/seed.ts

# 3. Create or reconcile administrative operator credentials
npx tsx scripts/seed_admin.ts

# 4. Deploy schema to Supabase production cluster
powershell -ExecutionPolicy Bypass -File scripts/deploy_to_supabase.ps1
```
