# LOOMERA — PRODUCTION DATABASE DEPLOYMENT STRATEGY
## Cloud PostgreSQL Topology, Connection Pooling, Migration Idempotency & Backup Preservation

**Date:** November 2026  
**Auditor & Database Architect:** Senior Database Engineer, PostgreSQL DBA & Vercel Deployment Architect  
**Scope:** 48 Relational Tables, Schema Constraints, Serverless Connection Pooling, Cloud Provider Evaluation & Zero-Downtime Migration  
**Status:** Local Backup Preserved — Cloud Database Blueprint Prepared (Awaiting Provider Selection)  

---

### EXECUTIVE SUMMARY

LOOMERA operates on a normalized PostgreSQL 17 relational database comprising **48 tables** managed via Drizzle ORM (`frontend/src/db/schema.ts`). During local development across Phases 1 through 10, the database ran as a local standalone PostgreSQL daemon on port 5434 (`.dev-db/`).

Because Vercel is a serverless application platform, it does not host stateful PostgreSQL databases. Deploying LOOMERA to production requires provisioning a cloud-hosted, managed, and TLS-encrypted PostgreSQL instance.

To safeguard all existing data and architecture:
1. An authoritative local database backup was created at [`backups/loomera_production_migration_backup_20261111.sql`](file:///c:/Users/gopal/Downloads/lommera/backups/loomera_production_migration_backup_20261111.sql) (211 KB, 48 tables fully dumped).
2. Development and production environments will remain strictly separated.
3. No destructive migrations, table drops, or resets will be executed.

---

### 1. EVALUATION OF CLOUD POSTGRESQL HOSTING PROVIDERS

LOOMERA requires a PostgreSQL database ($\ge v15$) that supports serverless connection pooling and standard TLS/SSL connections. Because the platform uses standard SQL with native `gen_random_uuid()` without custom C-extensions, it is 100% portable.

| Hosting Provider | Serverless Architecture & Compatibility | Connection Pooling (PgBouncer) | Free / Low-Cost Tier | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Neon** ([neon.tech](https://neon.tech/)) | **Exceptional.** Purpose-built for Vercel & serverless Next.js. Storage/compute separation, instant point-in-time recovery, zero-lag branching. | **Native Built-in Pooler:** Provides dedicated `-pooler.region.neon.tech` connection string for serverless. | Generous Free Tier (0.5 GiB storage, auto-suspend). | **RECOMMENDED (Primary Choice)** |
| **Supabase** ([supabase.com](https://supabase.com/)) | **Strong.** Fully managed PostgreSQL with native connection pooling on port 6543 (PgBouncer transaction mode). | **Dedicated Pooler:** Port 6543 handles high concurrent serverless connections. | Generous Free Tier (500 MB database, 2 projects). | **STRONG ALTERNATIVE** |
| **Railway** ([railway.app](https://railway.app/)) | **Standard.** Traditional containerized PostgreSQL. | Requires manual PgBouncer sidecar or low concurrency. | Paid / usage-based trial. | Secondary Alternative |

> [!IMPORTANT]
> **Neon** is the recommended provider for LOOMERA on Vercel because its native serverless connection pooling automatically handles thousands of concurrent serverless invocations without running out of connections, and integrates directly with Vercel's environment variable pipeline.

---

### 2. PRE-MIGRATION SAFETY & BACKUP CONFIRMATION

Prior to configuring any remote database:
- **Backup Created:** `c:\Users\gopal\Downloads\lommera\backups\loomera_production_migration_backup_20261111.sql`
- **File Integrity:** 211,596 bytes, verified schema definitions and seeded catalog records.
- **Git Exclusion:** `backups/` and `*.sql` are strictly excluded in `.gitignore` to prevent database dump exposure.

---

### 3. DATABASE SCHEMA TOPOGRAPHY & EXTENSIONS

- **Total Tables:** 48 relational tables categorized into 8 domains:
  1. *Core Catalog:* `categories`, `products`, `product_variants`, `product_images`.
  2. *Authentication & Users:* `users`, `sessions`, `audit_logs`, `notification_preferences`.
  3. *Cart & Reservations:* `cart_items`, `wishlist_items`, `inventory_reservations`.
  4. *Orders & Checkout:* `orders`, `order_items`, `payments`, `checkout_sessions`.
  5. *Operations & Logistics:* `inventory_movements`, `inventory_alerts`, `shipments`, `shipping_events`, `return_requests`, `return_items`.
  6. *Promotions & Loyalty:* `coupons`, `coupon_redemptions`, `loyalty_accounts`, `loyalty_transactions`.
  7. *Growth & Attribution:* `campaign_attributions`, `marketing_campaigns`, `experiments`, `cart_recovery_events`.
  8. *Phase 10 BI:* `demand_forecasts`, `forecast_evaluations`, `business_anomalies`, `business_recommendations`, `scheduled_report_runs`, `intelligence_job_runs`.
- **Required Extensions:** Standard `plpgsql` (default in all PostgreSQL instances). No external extensions required (`gen_random_uuid()` is built-in).

---

### 4. MIGRATION & PROVISIONING PLAYBOOK

Once the cloud PostgreSQL instance is created and the connection string is provided:

#### Step 1: Provision Cloud Database
Create a database named `loomera` on the selected provider (e.g., Neon).

#### Step 2: Configure Environment Variables
Set the connection strings in Vercel:
```env
# Serverless Connection String (Pooled for Next.js runtime queries)
DATABASE_URL="postgresql://[user]:[password]@[pooler-host]/loomera?sslmode=require"

# Direct Connection String (Unpooled for Drizzle schema migrations)
DATABASE_URL_UNPOOLED="postgresql://[user]:[password]@[direct-host]/loomera?sslmode=require"
```

#### Step 3: Apply Authoritative Schema
Deploy the schema using Drizzle ORM:
```bash
cd frontend
npx drizzle-kit push
```
Or execute the consolidated SQL migration script:
```bash
psql -d "$DATABASE_URL" -f scripts/migrate_phase10_business_intelligence.sql
```

#### Step 4: Seed Essential Catalog & Administrative Data
```bash
npx tsx scripts/seed.ts
npx tsx scripts/seed_admin.ts
```

#### Step 5: Verify Schema & Foreign Keys
Execute database validation assertions:
```bash
npx tsx scripts/inspect_db.ts
```

---

### 5. CONCLUSION & DECISION REQUEST

The database migration strategy is fully defined, non-destructive, and backed up. To proceed with live production database connectivity, the user may either:
1. Supply an existing cloud PostgreSQL connection string (Neon, Supabase, or AWS RDS).
2. Authorize provisioning a free Neon or Supabase database project.
