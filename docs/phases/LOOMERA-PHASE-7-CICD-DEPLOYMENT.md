# LOOMERA — CI/CD AUTOMATION & PRODUCTION DEPLOYMENT STRATEGY

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**CI/CD Engine:** GitHub Actions (`.github/workflows/ci.yml`)  
**Deployment Target:** Vercel Pro / High-Availability Managed Cloud  
**Zero-Downtime Guarantee:** Blue/Green Atomic Deployments  

---

## 1. CI/CD Architecture & Quality Gate Pipeline

Every code modification proposed to LOOMERA must traverse a strict, automated verification pipeline prior to merging and staging deployment.

```
       [ Developer Branch / Pull Request ]
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │          GitHub Actions Pipeline             │
    │  1. Static Lint Analysis (`npm run lint`)    │
    │  2. TypeScript Strict Mode (`tsc --noEmit`)  │
    │  3. Spin up ephemeral PostgreSQL 17 service  │
    │  4. Run Seed & Migration Scripts             │
    │  5. Automated Test Suite (571+ Assertions)   │
    │  6. Production Turbopack Build Verification  │
    └──────────────────────┬───────────────────────┘
                           │ All 6 Gates Passed
                           ▼
    ┌──────────────────────────────────────────────┐
    │          Staging Preview Deployment          │
    │  - Isolated preview URL per PR               │
    │  - Staging database sandbox                  │
    │  - Automated Smoke Tests                     │
    └──────────────────────┬───────────────────────┘
                           │ Merge to `main` + Manual Approval
                           ▼
    ┌──────────────────────────────────────────────┐
    │          Production Release Cutover          │
    │  - Atomic Instant Rollout (Zero Downtime)    │
    │  - Edge Cache Warmup                         │
    │  - Automated Health Check (`/api/health`)    │
    └──────────────────────────────────────────────┘
```

---

## 2. Automated Quality Gates

No code can reach production without satisfying four non-negotiable verification gates:

1. **Gate 1: Static Code Linting (`npm run lint`):**
   - Enforces clean Next.js 16 and React 19 standards.
   - Zero ESLint errors or unescaped entities permitted.
2. **Gate 2: Static Type Analysis (`npx tsc --noEmit`):**
   - Strict TypeScript checking across all modules, API handlers, database queries, and components.
3. **Gate 3: Automated Test Suite (`npm test`):**
   - Executes all 8 regression suites covering INR pricing, cart, sessions, checkout, 15-minute reservations, admin inventory ledger, and AI shopping intelligence.
   - Requires 100% pass rate.
4. **Gate 4: Production Build Verification (`npm run build`):**
   - Turbopack compilation must generate all 48 static and dynamic routes cleanly.

---

## 3. Database Migration Automation Policy

1. **Pre-Deployment Backup:**
   - Database snapshot created via `scripts/backup_db.ps1` prior to executing any Drizzle migration.
2. **Backward-Compatible Migrations:**
   - Drizzle migrations applied via `npm run db:migrate`.
   - All migrations must be additive (new columns nullable or defaulted), ensuring the active production application continues functioning seamlessly while the database updates.
3. **Post-Migration Smoke Test:**
   - CI probes `/api/health` and verifies that all 24 schema tables remain intact.

---

## 4. Rollback Strategy & Incident Reversal

1. **Instant Application Rollback:**
   - In Vercel or cloud container environments, deployments are immutable and atomic.
   - If an issue occurs post-deployment, rolling back to the previous deployment takes $< 30$ seconds via the deployment dashboard or CLI (`vercel rollback`).
2. **Database Rollback:**
   - In the event of schema corruption, execute `scripts/restore_db.ps1` pointing to the pre-deployment backup archive.
   - Target Recovery Time Objective: $< 15$ minutes.

---
*End of CI/CD Deployment Specification.*
