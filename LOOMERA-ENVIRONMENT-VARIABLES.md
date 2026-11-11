# LOOMERA — PRODUCTION ENVIRONMENT VARIABLES SPECIFICATION
## Comprehensive Secrets Inventory, Variable Classification, Security Boundaries & Vercel Vault Configuration

**Date:** November 2026  
**Auditor & Application Security Engineer:** Senior DevOps Engineer & Security Auditor  
**Scope:** Complete Codebase Variable Audit, Client vs Server Isolation, Required vs Optional Parameters & Zero-Secret Policy  
**Status:** Variable Audit Completed — Production Checklist Prepared  

---

### EXECUTIVE SUMMARY

This document provides the authoritative specification for all environment variables referenced across the LOOMERA codebase (`frontend/src/` and `frontend/scripts/`). 

In strict adherence to security best practices and the Phase 6 directives:
1. **Zero Real Secrets are Printed:** This document specifies only variable names, schemas, intended environments, and fallback behaviors.
2. **Server-Side Isolation:** Variables that authenticate databases, payment webhooks, or AI services are strictly server-only and are never exposed via `NEXT_PUBLIC_` prefixes.
3. **Graceful Fallbacks:** The platform is architected with resilient offline fallbacks (e.g. `curated_nlu` for AI when Gemini/OpenAI keys are omitted; simulated email logging when transactional email keys are absent).

---

### 1. ENVIRONMENT VARIABLE CLASSIFICATION MATRIX

| Variable Name | Environment Target | Classification | Sensitivity | Purpose & Code Reference | Fallback Behavior if Omitted |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production, Preview | **Required for Runtime** | **High Secret** (Server Only) | PostgreSQL connection string (`src/db/index.ts`). Required for all database operations. | Fails runtime queries with explicit connection error. |
| `DATABASE_URL_UNPOOLED` | Production, Preview | Optional Integration | **High Secret** (Server Only) | Direct (unpooled) PostgreSQL connection string for Drizzle schema migrations. | Falls back to `DATABASE_URL`. |
| `DATABASE_SSL` | Production, Preview | Optional Integration | Public Config (Server Only) | Set to `"true"` to enforce TLS encryption on database connections (`src/db/index.ts`). | Defaults to `"false"` in local dev. |
| `NEXT_PUBLIC_APP_URL` | Production, Preview | **Required for Build & Runtime** | Public (Browser & Server) | Canonical URL of the deployment (e.g. `https://loomera.com` or `https://[deployment].vercel.app`). Used for SEO, CORS, and redirects. | Defaults to `http://localhost:3000`. |
| `NODE_ENV` | Production, Preview | **Required for Runtime** | System Config | Set to `"production"` to activate production connection pooling and optimizations. | Defaults to `"development"`. |
| `CRON_SECRET` | Production, Preview | **Required for Runtime** | **High Secret** (Server Only) | High-entropy bearer token required to authenticate automated intelligence cron endpoints (`/api/admin/intelligence/jobs`). | Requests without valid admin session or CRON_SECRET return HTTP 401. |
| `RAZORPAY_KEY_ID` | Production, Preview | Optional Integration | Secret (Server Only) | Razorpay Merchant API Key ID (`src/app/api/checkout/session/route.ts`). | Allows checkout in sandbox test mode with mock keys. |
| `RAZORPAY_KEY_SECRET` | Production, Preview | Optional Integration | **High Secret** (Server Only) | Razorpay Secret Key for HMAC-SHA256 signature verification. | Payment verification rejected if signature cannot be validated. |
| `RAZORPAY_WEBHOOK_SECRET`| Production, Preview | Optional Integration | **High Secret** (Server Only) | Razorpay Webhook signature verification secret (`src/app/api/webhooks/razorpay/route.ts`). | Webhook returns HTTP 401 Unauthorized if signature fails. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`| Production, Preview | Optional Integration | Public (Browser Only) | Public client-side Razorpay checkout modal key. | Injects sandbox key for mock testing. |
| `AI_PROVIDER` | Production, Preview | Optional Integration | Public Config (Server Only) | AI engine mode: `"curated_nlu"` (default, zero-cost offline), `"gemini"`, or `"openai"` (`src/lib/ai/orchestrator.ts`). | Defaults to `"curated_nlu"` (100% operational uptime, 0 API cost). |
| `GEMINI_API_KEY` | Production, Preview | Optional Integration | Secret (Server Only) | Google Gemini 1.5/2.0 API key for advanced conversational synthesis (`src/lib/ai/`). | Gracefully falls back to curated deterministic NLU. |
| `OPENAI_API_KEY` | Production, Preview | Optional Integration | Secret (Server Only) | OpenAI API key fallback for conversational assistant. | Gracefully falls back to curated deterministic NLU. |
| `RESEND_API_KEY` | Production, Preview | Optional Integration | Secret (Server Only) | Resend API key for transactional email delivery (`src/lib/notifications/email-service.ts`). | Simulates email dispatch and logs formatted luxury HTML to console. |
| `EMAIL_FROM` | Production, Preview | Optional Integration | Public Config (Server Only) | Canonical sender email header (e.g. `LOOMERA Atelier <concierge@loomera.com>`). | Defaults to `concierge@loomera.com`. |
| `BLUEDART_WEBHOOK_SECRET` | Production, Preview | Optional Integration | Secret (Server Only) | Webhook verification secret for BlueDart logistics (`src/app/api/webhooks/shipping/[carrier]/route.ts`). | Carrier webhook returns HTTP 401 if unauthenticated. |
| `DELHIVERY_WEBHOOK_SECRET`| Production, Preview | Optional Integration | Secret (Server Only) | Webhook verification secret for Delhivery logistics. | Carrier webhook returns HTTP 401 if unauthenticated. |
| `SHIPROCKET_WEBHOOK_SECRET`| Production, Preview | Optional Integration | Secret (Server Only) | Webhook verification secret for Shiprocket logistics. | Carrier webhook returns HTTP 401 if unauthenticated. |

---

### 2. MINIMUM REQUIRED VARIABLES FOR INITIAL VERCEL PREVIEW DEPLOYMENT

To successfully launch a fully functional Vercel deployment, the following minimum set of variables must be configured in Vercel:

```env
# 1. Database Connection (from Neon, Supabase, etc.)
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# 2. Canonical Application URL
NEXT_PUBLIC_APP_URL="https://[project-name].vercel.app"

# 3. Environment
NODE_ENV="production"

# 4. Background Job Authentication Token (Generate a random 32-character hex string)
CRON_SECRET="[secure_randomly_generated_32_char_token]"

# 5. AI Engine (Zero-Cost Baseline)
AI_PROVIDER="curated_nlu"
```

---

### 3. VERCEL DASHBOARD CONFIGURATION PROCEDURE

1. In the Vercel Dashboard, select the LOOMERA project.
2. Navigate to **Settings > Environment Variables**.
3. For each variable in the table above:
   - Enter the **Key**.
   - Enter the **Value** securely.
   - Check the environments: **Production**, **Preview**, and **Development**.
4. Click **Save**.
5. Trigger a deployment redeploy to inject the environment variables into the serverless execution context.
