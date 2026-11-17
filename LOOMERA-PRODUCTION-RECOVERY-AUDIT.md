# LOOMERA — Production Recovery & Database Audit Report

**Date:** November 16, 2026  
**Auditor:** Senior Full-Stack Engineer, PostgreSQL DBA & Next.js Production Engineer  
**Project:** LOOMERA (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM)  
**Target Deployment:** `https://loomera-roan.vercel.app` (Vercel Serverless Platform)  
**Status:** Audit Complete — Pre-Modification State

---

## 1. Executive Summary

A comprehensive pre-repair codebase and infrastructure audit was conducted to isolate the exact mechanisms causing:
1. `GET /api/health` returning **HTTP 503** (`database: disconnected`).
2. `GET /api/products` returning **HTTP 500** (`Internal server error retrieving products catalog`).

While LOOMERA's static storefront, pre-rendered catalog pages, cart persistence, and auth boundaries operate flawlessly on Vercel, dynamic database-dependent API routes fail because the serverless application runtime cannot communicate with PostgreSQL.

Four distinct contributing factors were identified across environment configuration, database driver initialization, and serverless lifecycle management.

---

## 2. Codebase & Infrastructure Inventory

| Component | Repository Path | Configuration / Details |
| :--- | :--- | :--- |
| **Package Manager** | `package.json` | `npm` (Lockfile: `package-lock.json`) |
| **Framework** | `frontend/package.json` | Next.js 16.4.2 (Turbopack runtime), React 19.3.0 |
| **ORM & Database Driver** | `frontend/package.json` | `drizzle-orm` v0.45.4 with `pg` (node-postgres) v8.23.1 |
| **Database Schema** | `frontend/src/db/schema.ts` | **48 relational tables** (full Phase 1–10 relational topology) |
| **Drizzle Config** | `frontend/drizzle.config.ts` | Dialect: `postgresql`, Schema: `./src/db/schema.ts`, Out: `./src/db/migrations` |
| **DB Connection Utility** | `frontend/src/db/index.ts` | Initializes `pg.Pool` with connection string fallback to `127.0.0.1:5434` |
| **Health API** | `frontend/src/app/api/health/route.ts` | Dynamic route probing `db.execute(sql\`SELECT 1\`)` |
| **Products API** | `frontend/src/app/api/products/route.ts` | Dynamic route calling `getProductsFromDb()` via Drizzle |
| **Working Tree Status** | Local `main` branch | Clean git tree with local flickering/hydration repairs verified locally |

---

## 3. Root Cause Analysis

### Cause 1: Missing or Inactive `DATABASE_URL` in Vercel Production Environment
In `frontend/src/db/index.ts`:
```typescript
const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5434/loomera";
```
When `DATABASE_URL` is undefined or misconfigured in Vercel Project Settings, the connection string defaults to `127.0.0.1:5434` (the local developer cluster). In Vercel's serverless execution environment (AWS Lambda), connecting to `127.0.0.1:5434` is immediately rejected with `ECONNREFUSED` within 3ms.

### Cause 2: Missing TLS/SSL Configuration in `pg.Pool` Initialization
In `frontend/src/db/index.ts`:
```typescript
if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}
```
Supabase managed PostgreSQL mandates SSL/TLS encryption for all external connections. `node-postgres` (`pg`) does not automatically negotiate self-signed TLS certificates for pooled cloud providers unless `ssl: { rejectUnauthorized: false }` is explicitly provided in the pool configuration. Without this, connections to Supabase will fail immediately during the TLS handshake.

### Cause 3: Inefficient Serverless Connection Pool Lifecycle
1. **Lack of Global Pool Reuse in Production:** `globalThis.__dbPool` is currently only used when `NODE_ENV !== 'production'`. In production, every serverless function invocation could potentially construct a fresh `Pool` instance. Warm serverless lambdas should reuse `globalThis.__dbPool`.
2. **Oversized Connection Allocation (`max: 20`):** In a serverless environment, if 10 concurrent lambdas launch with `max: 20`, up to 200 connections are requested simultaneously, immediately overwhelming free-tier PostgreSQL limits. In serverless Next.js, `max: 2` or `max: 5` per container is the established best practice.

### Cause 4: Target Supabase Database Provisioning
The live Supabase PostgreSQL instance (`project_ref: vgqaytnajvyltxyohwtt`) requires verification to ensure that all 48 tables, constraints, foreign keys, and catalog seed rows have been pushed and are present.

---

## 4. Remediation Plan

1. **Phase 2 — Supabase Connection Investigation:**
   - Establish the precise Supabase connection string format.
   - For Vercel serverless execution, determine the appropriate endpoint (Direct port 5432 vs. Supavisor Transaction Pooler port 6543).
   - Document the safe configuration protocol without leaking credentials.

2. **Phase 3 — Vercel Environment Configuration:**
   - Verify `DATABASE_URL` in Vercel Project Settings.
   - If missing, guide secure addition of the pooled connection URI.

3. **Phase 4 — Database Schema & Migration Verification:**
   - Inspect the remote Supabase schema against `frontend/src/db/schema.ts` (48 tables).
   - Generate `LOOMERA-DATABASE-VERIFICATION.md`.

4. **Phase 5 — Database Connectivity Repair (Code-Level):**
   - Refactor `frontend/src/db/index.ts`:
     - Enable SSL support for cloud PostgreSQL (`ssl: { rejectUnauthorized: false }` when connecting to Supabase or when `?sslmode=require`).
     - Enable global pool caching across warm serverless containers in production.
     - Optimize pool size for serverless execution (`max: 3` to `5`, timeout 5000ms).

5. **Phase 6 — API Endpoint Verification:**
   - Verify `/api/health` returns 200 when connected and 503 when disconnected.
   - Verify `/api/products` returns 200 with catalog data.

6. **Phase 7–10 — Validation, GitHub Synchronization & Vercel Deployment:**
   - Run full regression suite (825 assertions, tsc, lint, build).
   - Request approval, commit, push, trigger Vercel deployment, and verify live endpoints.

---
*Report filed by Senior Full-Stack & Database Systems Engineer.*
