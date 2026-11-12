# LOOMERA — Production Deployment Runbook

## 1. Deployment Architecture

LOOMERA is designed for production deployment on **Vercel** (serving the Next.js 16 full-stack application) connected to **Supabase** (providing managed PostgreSQL 17 with connection pooling).

```text
GitHub (Gopalkrishna10845445/loomera)
     │
     ▼ (Automated Git Integration)
Vercel Edge Platform
     │  - Root Directory: frontend
     │  - Framework: Next.js 16 (Turbopack)
     │
     ▼ (Encrypted TLS Database Connection)
Supabase Managed PostgreSQL
     - Port: 5432 (Direct) / 6543 (PgBouncer Pooled)
     - 48 Production Relational Tables
```

---

## 2. Step 1: Prepare GitHub Repository

Ensure changes are committed on the target branch (`main` or production release branch):

```bash
git push origin chore/loomera-repository-cleanup
```

---

## 3. Step 2: Configure Vercel Project

1. Navigate to the **[Vercel Dashboard](https://vercel.com/new)**.
2. Select **Import Git Repository** and choose `Gopalkrishna10845445/loomera`.
3. In **Project Configuration**, configure the following:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select **`frontend`** (Crucial: LOOMERA's Next.js application lives inside the `frontend` subfolder).
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

---

## 4. Step 3: Configure Production Environment Variables

Add the following required environment variables in **Vercel Project Settings → Environment Variables**:

| Variable Name | Required | Example / Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **YES** | `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` |
| `SESSION_SECRET` | **YES** | Strong random 64-character secret for signing cookie sessions |
| `NEXT_PUBLIC_APP_URL` | **YES** | `https://loomera.vercel.app` (Your production domain) |
| `NODE_ENV` | **YES** | `production` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Optional | `rzp_live_...` (Razorpay Live Key ID) |
| `RAZORPAY_KEY_SECRET` | Optional | `...` (Razorpay Live Secret Key) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | `...` (Webhook verification secret) |

*(See [docs/ENVIRONMENT.md](./ENVIRONMENT.md) for the complete environment variables matrix).*

---

## 5. Step 4: Deploy & Seed Production PostgreSQL

Before deploying to Vercel, push the complete 48-table schema and luxury catalog seeds to your Supabase PostgreSQL database:

```powershell
# In PowerShell (from workspace root):
cd frontend
.\scripts\deploy_to_supabase.ps1 -DatabaseUrl "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

The automated migration script performs:
1. PostgreSQL connectivity check and SSL handshake.
2. Full schema migration (48 tables, indices, and constraints).
3. Product catalog seeding (8 garments, 103 SKUs, luxury editorial attributes).
4. Administrative user creation with secure password hashing.

---

## 6. Step 5: Trigger Production Deployment

1. In the Vercel Dashboard, click **Deploy**.
2. Vercel will:
   - Execute `npm install` inside `./frontend`.
   - Run Turbopack production compilation.
   - Execute strict TypeScript checks.
   - Compile all 75 static and dynamic routes.
3. Once deployed, verify live health:

```bash
# Verify API Health endpoint:
curl https://[YOUR-VERCEL-DOMAIN]/api/health
# Expected Response:
# {"status":"ok","database":"connected","timestamp":"..."}
```

---

## 7. Step 6: Post-Deployment Smoke Verification

Verify the following production endpoints in your browser:
1. `https://[YOUR-VERCEL-DOMAIN]/` — Storefront homepage, Hero, and Curated Collections.
2. `https://[YOUR-VERCEL-DOMAIN]/collections/men` — Category filtering and sorting.
3. `https://[YOUR-VERCEL-DOMAIN]/products/classic-linen-shirt` — Product detail page, size selector, and SSR Schema.org JSON-LD.
4. `https://[YOUR-VERCEL-DOMAIN]/admin` — Administrative login and dashboard.
5. `https://[YOUR-VERCEL-DOMAIN]/admin/intelligence` — Phase 10 Autonomous BI Command Center.
