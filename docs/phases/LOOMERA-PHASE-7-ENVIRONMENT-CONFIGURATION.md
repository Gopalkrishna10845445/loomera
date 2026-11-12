# LOOMERA — PRODUCTION ENVIRONMENT & SECRETS MANAGEMENT SPECIFICATION

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Version:** 1.0.0  
**Security Classification:** Confidential / Operational Reference  

---

## 1. Environment Variable Architecture & Classification

The LOOMERA runtime divides configuration variables into distinct tiers to uphold the principle of least privilege and prevent client-side leakage of sensitive credentials:

| Tier | Prefix | Target Scope | Security Handling | Examples |
|---|---|---|---|---|
| **Public / Browser** | `NEXT_PUBLIC_` | Inlined into client JS bundles during Next.js build | Non-sensitive only; never place gateway secrets here | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` |
| **Server Secrets** | None | Private to Node.js server runtime (`NodePgDatabase`, API handlers) | Stored encrypted in cloud secret manager / hosting vault | `DATABASE_URL`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| **Provider API Keys**| None | Server-side integration adapters (`Resend`, `Gemini`, `OpenAI`) | Restricted IAM roles or scoped API tokens | `RESEND_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY` |
| **Runtime Toggles** | None | Controls logging, pool sizes, and sandbox simulation | Configured per environment tier (development, staging, prod) | `NODE_ENV`, `DATABASE_SSL`, `DATABASE_MAX_CONNECTIONS` |

---

## 2. Startup Environment Validation Module (`src/lib/env.ts`)

A centralized validation module (`src/lib/env.ts`) is executed during application initialization to guarantee that:
1. All critical secrets exist before handling customer transactions.
2. Production environments enforce strict HTTPS URLs and live Razorpay credentials.
3. Secret values are **never printed in plaintext** in standard console logs, telemetry, or error messages (utilizing `maskSecret()` which formats credentials as `rzp_live...****`).
4. In non-production environments (development and CI test runs), missing third-party keys gracefully fall back to zero-cost deterministic mock modes (`curated_nlu` for AI, sandbox mock orders for Razorpay, local console logging for transactional notifications).

---

## 3. Secret Rotation & Provisioning Protocol

When operating in production:
1. **Database Credentials:**
   - Database passwords rotated on a 90-day cycle.
   - Master connection strings managed via AWS Secrets Manager or Vercel Environment Secrets with zero-downtime rolling updates.
2. **Razorpay Gateway Keys:**
   - Webhook secrets generated using high-entropy random keys ($> 32$ characters).
   - If a key compromise is suspected, generate secondary API key in Razorpay Dashboard, update environment vault, test with a test webhook, and revoke the compromised key.
3. **Audit Log & Version Control Discipline:**
   - Continuous `.gitignore` enforcement ensures `.env`, `.env.local`, and `.env.production` are strictly excluded from git tracking.
   - Any secret inadvertently detected by CI git scanners triggers immediate revocation and regeneration.

---
*End of Environment Configuration Document.*
