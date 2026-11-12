# LOOMERA — DATABASE RELIABILITY & DISASTER RECOVERY SPECIFICATION

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Database Engine:** PostgreSQL 17.x  
**ORM / Migration Framework:** Drizzle ORM + drizzle-kit  
**Recovery Objectives:** RPO < 5 Minutes, RTO < 15 Minutes  

---

## 1. Relational Database Topology & Storage Design

The LOOMERA relational schema consists of 24 normalized tables governing products, stock variants, high-resolution imagery, patron accounts, sessions, carts, wishlists, orders, payments, cryptographic payment event logs, status history, 15-minute TTL inventory reservations, inventory ledgers, and customer intelligence logs.

### 1.1 Connection Pool Architecture
The database client (`src/db/index.ts`) initializes an optimized connection pool:
- **Production Pool Size:** 20 connections per node instance (configurable via `DATABASE_MAX_CONNECTIONS`).
- **Connection Timeout:** 5,000 ms.
- **Idle Client Timeout:** 30,000 ms.
- **SSL Encryption:** Supports enforced SSL (`DATABASE_SSL=true` or `?sslmode=require`).
- **Development Hot-Reload Protection:** Global singleton pattern (`globalThis.__dbPool`) prevents connection leakages during Next.js Turbopack fast reloads.

---

## 2. Automated Backup Strategy

To guarantee zero data loss and adhere to strict recovery objectives, LOOMERA employs a multi-tiered backup cadence:

1. **Continuous Write-Ahead Logging (WAL):**
   - In cloud hosting (AWS RDS / Supabase / Neon), WAL archiving provides point-in-time recovery (PITR) down to the minute.
2. **Daily Physical Snapshots:**
   - Automated full database dumps scheduled daily at 02:00 IST during low-traffic atelier hours.
3. **On-Demand & Pre-Migration Snapshots (`scripts/backup_db.ps1`):**
   - Automated PowerShell/CLI utility creates clean SQL backups with `--clean --if-exists --no-owner` flags.
   - Tested and verified: Full backup generated at `backups/loomera_backup_*.sql` (96.7 KB verified dump).

---

## 3. Disaster Recovery & Restoration Procedure

In the event of database failure or corrupted state:

1. **Restoration Execution:**
   - Execute the verified restoration utility:
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/restore_db.ps1 -BackupFile backups/loomera_backup_YYYYMMDD_HHMMSS.sql
     ```
   - Includes safety confirmation prompt requiring the operator to enter `CONFIRM` to prevent accidental overwrites.
2. **Post-Restoration Integrity Checklist:**
   - [ ] Verify core catalog count (8 published atelier products).
   - [ ] Verify inventory variants count (24 unique sizing SKUs).
   - [ ] Verify reservation consistency (`SELECT * FROM inventory_reservations WHERE status = 'PENDING';`).
   - [ ] Confirm super-admin account accessibility (`admin@loomera.com`).
   - [ ] Execute automated regression suite: `npm test`.

---

## 4. Zero-Downtime Migration Policy

When introducing additive schema changes:
1. **Additive Only:** New columns must be either nullable or provide default values.
2. **Never Drop in Step 1:** Column renames or drops must follow the expand-contract pattern:
   - Phase A: Introduce new column and dual-write in application code.
   - Phase B: Backfill historical data.
   - Phase C: Switch reads to new column.
   - Phase D: Deprecate and drop old column in subsequent release.
3. **Lock Minimization:** Create indexes concurrently (`CREATE INDEX CONCURRENTLY`) to prevent blocking patron checkouts.

---
*End of Database Recovery Specification.*
