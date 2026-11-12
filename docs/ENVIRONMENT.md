# LOOMERA — Environment Variables Specification

## 1. Overview & Security Boundaries

LOOMERA enforces strict environment variable separation between client-safe variables (prefixed with `NEXT_PUBLIC_`) and private server-only secrets. The runtime validator is implemented in `frontend/src/lib/env.ts` and masks all sensitive tokens in logs.

> [!CAUTION]
> **Never commit `.env` or `.env.local` files to version control.** Secrets must be provided via deployment platform vaults (e.g., Vercel Project Settings) or local uncommitted `.env.local`.

---

## 2. Environment Variables Matrix

| Variable | Scope | Required in Prod | Default (Dev) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Server | **Yes** | `development` | Runtime mode (`development`, `production`, `test`). |
| `NEXT_PUBLIC_APP_URL` | Public / Client | **Yes** | `http://localhost:3000` | Canonical origin URL (must be HTTPS in production). |
| `DATABASE_URL` | Server | **Yes** | `postgresql://postgres@127.0.0.1:5434/loomera` | Authoritative PostgreSQL connection string. |
| `DATABASE_SSL` | Server | Recommended | `false` | Set to `true` when connecting to cloud Postgres without `sslmode=require` in URI. |
| `DATABASE_MAX_CONNECTIONS` | Server | No | `20` | Maximum connections for `pg.Pool`. |
| `SESSION_SECRET` | Server | Recommended | `loomera_dev_session_secret` | 64-char key for session cookie signing. |
| `RAZORPAY_KEY_ID` | Server | Production | `rzp_test_...` | Razorpay Merchant Key ID. Must be `rzp_live_...` in production. |
| `RAZORPAY_KEY_SECRET` | Server | Production | `...` | Razorpay API Secret for order creation & refunds. |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Production | `...` | Secret for cryptographic verification of Razorpay webhooks. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public / Client | Optional | `rzp_test_...` | Client key for the browser Razorpay checkout modal. |
| `RESEND_API_KEY` | Server | Optional | `""` | Resend API key for transactional emails (`re_...`). |
| `EMAIL_FROM` | Server | Optional | `LOOMERA Atelier <concierge@loomera.com>` | Sender identity for transactional notifications. |
| `AI_PROVIDER` | Server | No | `curated_nlu` | AI provider: `curated_nlu` (zero-cost offline), `gemini`, or `openai`. |
| `GEMINI_API_KEY` | Server | Optional | `""` | Google Gemini API key if `AI_PROVIDER="gemini"`. |
| `OPENAI_API_KEY` | Server | Optional | `""` | OpenAI API key if `AI_PROVIDER="openai"`. |

---

## 3. Diagnostic & Health Validation

The runtime provides an automated environment diagnostic via `/api/health` and the `validateEnvironment()` function. In production, any missing `CRITICAL` variables block deployments or fail gracefully without exposing sensitive credentials.

To inspect environment diagnostics in development:

```typescript
import { validateEnvironment } from "@/lib/env";

const { isValid, isProductionReady, issues, diagnostics } = validateEnvironment();
console.log(diagnostics);
```
