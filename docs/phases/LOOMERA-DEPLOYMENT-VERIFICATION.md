# LOOMERA — PRODUCTION DEPLOYMENT VERIFICATION PLAYBOOK
## Multi-Stage Verification, Post-Deploy Health Checks, RBAC Validation & Security Probing

**Date:** November 2026  
**Auditor & Deployment Architect:** Senior DevOps Engineer, Application Security Auditor & Vercel Deployment Architect  
**Scope:** GitHub Remote Synchronization, Supabase Database Verification, Vercel Serverless Build & Runtime Probing  
**Status:** Verification Playbook Established — Awaiting Remote Credentials  

---

### EXECUTIVE SUMMARY

This verification playbook defines the systematic, repeatable testing protocol to be executed immediately following GitHub repository publishing and Vercel cloud deployment. 

A deployment is not considered successful simply because a build command completes. The application must be verified end-to-end against live database transactions, authenticated administration consoles, serverless API execution, image optimization pipelines, and security header enforcement.

---

### 1. PHASE-BY-PHASE VERIFICATION PROTOCOL

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT VERIFICATION SEQUENCE                     │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 1: GITHUB REMOTE REPOSITORY VERIFICATION                         │
│  - Verify branch 'main' exists and contains commit f290f3b.            │
│  - Verify zero secrets, .dev-db, .env*, or backup dumps in repo.       │
│  - Verify GitHub Actions CI runs npm ci, lint, tsc, and builds.        │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 2: SUPABASE POSTGRESQL CONNECTIVITY & MIGRATION                  │
│  - Verify TLS encrypted connection (?sslmode=require).                 │
│  - Verify connection pooling on port 6543 (PgBouncer).                 │
│  - Apply Drizzle ORM migrations (verify 48 tables created).            │
│  - Verify baseline catalog seed (8 products, 103 variants).            │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 3: VERCEL BUILD & DEPLOYMENT DIAGNOSTICS                         │
│  - Verify Root Directory is set to 'frontend'.                         │
│  - Inspect build logs: 0 TypeScript errors, 0 ESLint warnings.         │
│  - Verify 75 routes compiled and SSG pages prerendered.                │
├────────────────────────────────────────────────────────────────────────┤
│ STAGE 4: PRODUCTION RUNTIME & SECURITY PROBING                         │
│  - Public Storefront: GET / (HTTP 200 OK).                             │
│  - Health Probe: GET /api/health (HTTP 200 OK, {"status":"healthy"}).  │
│  - RBAC Protection: GET /admin/intelligence (HTTP 307 Redirect).       │
│  - Admin Login: POST /api/auth/login (Argon2 hash verified).           │
│  - Command Center: GET /admin/intelligence (HTTP 200 with session).    │
│  - AI Business Analyst: POST /api/admin/intelligence/analyst.          │
│  - CSP Headers: Strict-Transport-Security, Content-Security-Policy.    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2. DETAILED RUNTIME PROBE SPECIFICATION

#### 1. Public Health Check Endpoint (`/api/health`)
- **Method:** `GET`
- **Expected Status:** `HTTP 200 OK`
- **Expected Payload:**
  ```json
  {
    "status": "healthy",
    "timestamp": "ISO_8601_TIMESTAMP",
    "environment": "production"
  }
  ```

#### 2. Role-Based Access Control (RBAC) Guard Verification
- **Unauthenticated Probe:**
  - `GET /admin/intelligence` without session cookies must return `HTTP 307 Temporary Redirect` to `/login?redirect=%2Fadmin%2Fintelligence`.
  - `GET /api/admin/intelligence/overview` without session cookies must return `HTTP 401 Unauthorized`.
- **Authenticated Probe:**
  - `POST /api/auth/login` with administrative credentials sets `loomera_session` HTTP-only cookie.
  - Subsequent `GET /admin/intelligence` returns `HTTP 200 OK`.

#### 3. Conversational AI Analyst Verification
- **Request:**
  - `POST /api/admin/intelligence/analyst` with `{ "query": "Which products should I restock?" }`.
- **Validation:**
  - Returns `success: true`.
  - Tool executed: `get_restock_recommendations`.
  - Returns grounded recommendations with `requiresApproval: true`.

#### 4. Security Header Verification
Inspected via `curl -I https://[deployment].vercel.app`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` containing authorized image and script sources.

---

### 3. VERIFICATION CHECKLIST & LOGGING

All runtime probe results will be logged and incorporated into the final master deployment report [`LOOMERA-DEPLOYMENT-REPORT.md`](file:///c:/Users/gopal/Downloads/lommera/LOOMERA-DEPLOYMENT-REPORT.md).
