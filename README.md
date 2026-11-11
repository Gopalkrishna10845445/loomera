# LOOMERA — Artisan Luxury Fashion E-Commerce

> **Autonomous Business Intelligence, Predictive Analytics & Premium Artisan Fashion Platform**  
> Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, PostgreSQL 17 & Drizzle ORM.

---

## 1. PROJECT OVERVIEW

**LOOMERA** is an artisanal men's and boys' fashion e-commerce platform and intelligent decision-support system. Designed with an editorial aesthetic featuring Deep Petrol (`#264653`), Persian Green (`#2A9D8F`), Terracotta (`#E76F51`), and Warm Ivory (`#FAF8F5`), LOOMERA delivers a seamless luxury shopping experience paired with server-authoritative e-commerce mechanics and an autonomous Business Intelligence Command Center.

Across Phases 1 through 10, the platform has evolved from a bespoke storefront into an end-to-end commercial operating system comprising 75 production routes, 48 relational PostgreSQL tables, and 825 automated assertions passing across 12 comprehensive test suites.

---

## 2. KEY PLATFORM CAPABILITIES

### Storefront & Patron Experience (Phases 1–4)
- **Artisan Catalog:** Editorial showcases for Men's Linen Essentials, Boys' Youthwear, and Heritage Handloom Kurtas.
- **Server-Authoritative Pricing:** Centralized Indian Rupee (INR) formatting, promotional discounts, and strict price tamper detection.
- **Session-Based Cart & Wishlist:** Persistent shopping bag with guest-to-patron cart merging and stock reservation locks.
- **Secure Authentication & RBAC:** Argon2-hashed credentials, cryptographic session cookies, and multi-tier role authorization (`CUSTOMER`, `ADMIN`, `SUPER_ADMIN`).
- **Checkout & Multi-Payment Orchestration:** Multi-step checkout pipeline integrated with Razorpay payment processing and real-time webhook settlement.

### Atelier Administration & Operations (Phases 5–8)
- **Inventory Control & TTL Reservation Locks:** Real-time physical inventory management with 15-minute temporary reservation locks during checkout.
- **Fulfillment & Logistics Tracking:** Shipping state machines supporting multi-carrier integrations (BlueDart, Delhivery, Shiprocket).
- **Return & Refund Architecture:** 15-day return request workflow with reverse logistics inspection and gateway refund issuance.
- **Promotions & Loyalty System:** Tiered promotional coupons with minimum spend thresholds and points-based customer loyalty rewards.

### Growth, Experimentation & Attribution (Phase 9)
- **First-Party Multi-Touch Attribution:** Server-side UTM tracking across 6 distinct acquisition channels.
- **RFM Customer Segmentation:** Deterministic behavioral scoring categorizing patrons into 5 distinct cohorts.
- **A/B Experimentation Engine:** Deterministic client hashing for conversion-rate split testing with confidence tracking.
- **Abandoned Cart Recovery:** Automated multi-stage email recovery sequences with single-use promotional reactivation links.

### Autonomous Business Intelligence & Operations (Phase 10)
- **AI Command Center (`/admin/intelligence`):** Unified 10-tab executive operations hub with real-time KPI pulses.
- **Conversational AI Business Analyst:** Grounded natural language query engine backed by 12 read-only tools and deterministic NLU fallback.
- **Time-Series Demand Forecasting:** Statistical projections (SMA_7, SMA_30, EWMA, velocity run-rates) with 85% empirical confidence bounds and time-based holdout evaluation (MAE, RMSE, bias).
- **Restocking & Effective Inventory Radar:** Replenishment optimization evaluating effective available stock ($\text{physical} - \text{activeReserved}$) and coverage days.
- **Customer Churn Early Warning:** Inactivity risk scoring (0–100) analyzing personal order cadence disruption and 30-day browsing signals.
- **Grounded Unit Economics:** Net settled revenue calculations with Razorpay gateway fee deduction, logistics allowances, and honest cost disclosures.
- **Statistical Business Anomaly Detection:** Continuous automated scanning across 6 operational triggers with incident lifecycle state machines.
- **Executive Reporting & CSV Export:** Scheduled Daily, Weekly, and Monthly reports with audit persistence and RFC-4180 CSV spreadsheet export.
- **Approval-Gated Recommendations:** Strict human-in-the-loop governance requiring administrator approval before operational action.

---

## 3. TECHNOLOGY STACK

| Tier | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16.4.2](https://nextjs.org/) (App Router, Turbopack, React 19 Server Components) |
| **Language & Typing** | [TypeScript 5.x](https://www.typescriptlang.org/) (Strict Type Checking, Zero `any`) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with Turbopack CSS rules |
| **Database & ORM** | [PostgreSQL 17](https://www.postgresql.org/) with [Drizzle ORM 0.45.x](https://orm.drizzle.team/) |
| **Authentication & Crypto** | [@node-rs/argon2](https://github.com/napi-rs/node-rs) password hashing & encrypted session tokens |
| **Payment Gateway** | [Razorpay SDK](https://razorpay.com/) (INR settlement, webhook verification, signature validation) |
| **UI Components & Icons** | [Lucide React](https://lucide.dev/), [Motion 14](https://motion.dev/) |
| **Continuous Integration** | GitHub Actions (`.github/workflows/ci.yml`) |
| **Cloud Deployment** | [Vercel](https://vercel.com/) (Serverless Next.js Hosting) |

---

## 4. PROJECT ARCHITECTURE

```text
c:\Users\gopal\Downloads\lommera\
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI workflow (Node 20, Postgres, Tests)
├── frontend/                          # Next.js 16 Full-Stack Application
│   ├── src/
│   │   ├── app/                       # Next.js App Router (75 Routes)
│   │   │   ├── (storefront)/          # Public catalog, collections, cart, checkout
│   │   │   ├── admin/                 # Administration console & /admin/intelligence
│   │   │   └── api/                   # Serverless REST API Route Handlers
│   │   ├── components/                # Modular React UI components (luxury design system)
│   │   ├── db/                        # Drizzle ORM schema (48 tables) & connection pool
│   │   └── lib/                       # Core domain engines
│   │       ├── ai/                    # AI concierge and orchestrator
│   │       ├── auth/                  # RBAC, password hashing, session management
│   │       ├── checkout/              # Pricing engine, order FSM, checkout validation
│   │       ├── intelligence/          # 11 Phase 10 BI & predictive analytics modules
│   │       ├── loyalty/               # RFM segmentation and loyalty points
│   │       └── notifications/         # Email templates and dispatch abstractions
│   ├── scripts/                       # 12 Automated test suites and seed scripts
│   ├── package.json                   # Application dependencies and execution scripts
│   ├── package-lock.json              # Authoritative lockfile
│   ├── next.config.ts                 # CSP headers, image optimization, and Turbopack
│   ├── drizzle.config.ts              # Drizzle ORM migration configuration
│   └── tsconfig.json                  # Strict TypeScript configuration
├── LOOMERA-PHASE-*.md                 # Comprehensive Phase 1–10 engineering reports
├── .gitignore                         # Strict production gitignore
└── README.md                          # Repository documentation
```

---

## 5. INSTALLATION & LOCAL DEVELOPMENT

### Prerequisites
- **Node.js:** `v20.x` or higher
- **Package Manager:** `npm` (utilizing `package-lock.json`)
- **Database:** PostgreSQL `v17.x`

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/loomera.git
   cd loomera
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm ci
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your local PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:password@127.0.0.1:5434/loomera"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize and seed the database:**
   ```bash
   npm run db:migrate
   npx tsx scripts/seed.ts
   npx tsx scripts/seed_admin.ts
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. DEVELOPMENT SCRIPTS

Execute all commands from the `frontend/` directory:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts Next.js development server with Turbopack |
| **Production Build** | `npm run build` | Compiles optimized production bundle (75 routes) |
| **Production Start** | `npm start` | Runs the compiled production server |
| **Linter** | `npm run lint` | Runs ESLint analysis (0 errors, 0 warnings enforced) |
| **Type Check** | `npx tsc --noEmit` | Executes strict TypeScript compilation check |
| **Full Test Suite** | `npm test` | Executes all 12 test suites (825 assertions) |
| **BI Test Suite** | `npm run test:bi` | Executes Phase 10 Business Intelligence test suite (120 assertions) |
| **Database Studio** | `npm run db:studio` | Launches Drizzle Studio database inspector |

---

## 7. AUTOMATED VERIFICATION & TEST SUITES

LOOMERA enforces strict automated testing across all business logic. Run the full regression test suite with:

```bash
cd frontend
npm test
```

### Test Suite Coverage (825 Assertions)
1. `npm run test:pricing`: Pricing engine, INR currency formatting, discount rules (100 assertions).
2. `scripts/test_api_and_db.ts`: Database connection, schema constraints, catalog queries (64 assertions).
3. `scripts/test_phase2_auth_cart_wishlist.ts`: Authentication, Argon2, session tokens, cart merging (82 assertions).
4. `npm run test:assistant`: AI fashion assistant, NLU intent parsing, catalog recommendations (50 assertions).
5. `npm run test:intelligence`: Product intelligence, semantic search, fit guidance (46 assertions).
6. `npm run test:checkout`: Multi-step checkout, Razorpay order creation, inventory locks (60 assertions).
7. `npm run test:admin`: Administration RBAC, inventory movement tracking, variant mutations (64 assertions).
8. `npm run test:recommendations`: Personalized recommendations, collaborative filtering (72 assertions).
9. `npm run test:production`: Production readiness, health checks, rate limiting, security headers (58 assertions).
10. `npm run test:business`: Shipping tracking, returns/refunds, coupons, loyalty points (56 assertions).
11. `npm run test:growth`: UTM attribution, RFM segmentation, A/B testing, cart recovery (53 assertions).
12. `npm run test:bi`: Phase 10 Business Intelligence, demand forecasts, churn, unit economics, anomalies, reports (120 assertions).

---

## 8. ENVIRONMENT VARIABLES SPECIFICATION

Refer to `frontend/.env.example` for the complete reference. Configure these in the Vercel Project Dashboard under **Settings > Environment Variables**:

| Variable Name | Required | Target | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | Server | Connection string to production PostgreSQL with SSL (`?sslmode=require`) |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Client/Server | Canonical URL of the application (e.g. `https://loomera.com`) |
| `NODE_ENV` | **Yes** | Server | Set to `"production"` |
| `RAZORPAY_KEY_ID` | Optional | Server | Razorpay API Key ID (Sandbox or Live) |
| `RAZORPAY_KEY_SECRET` | Optional | Server | Razorpay Secret Key for order signing |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Server | Webhook signature validation secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Optional | Client | Public client-side Razorpay checkout key |
| `CRON_SECRET` | **Yes** | Server | High-entropy bearer token protecting background intelligence jobs |
| `AI_PROVIDER` | Optional | Server | AI engine mode: `"curated_nlu"` (default, zero cost), `"gemini"`, or `"openai"` |
| `GEMINI_API_KEY` | Optional | Server | Google Gemini API key (if `AI_PROVIDER="gemini"`) |
| `RESEND_API_KEY` | Optional | Server | Resend API key for transactional emails |
| `EMAIL_FROM` | Optional | Server | Verified sender address (e.g., `LOOMERA <concierge@loomera.com>`) |

---

## 9. VERCEL DEPLOYMENT ARCHITECTURE

LOOMERA is optimized for zero-configuration serverless deployment on [Vercel](https://vercel.com/):

- **Repository Root:** Workspace root (`loomera`).
- **Vercel Root Directory:** Set to `frontend` in Project Settings.
- **Build Command:** `npm run build` (or Next.js default).
- **Output Directory:** Next.js default (`.next`).
- **Install Command:** `npm ci`.
- **Database:** Managed Serverless PostgreSQL (Neon, Supabase) with SSL enabled.

---

## 10. SECURITY & COMPLIANCE POSTURE

- **Zero Hardcoded Secrets:** Codebase contains zero committed credentials, API keys, or live payment secrets.
- **Content Security Policy:** Production CSP headers protect against XSS, unauthorized frame embedding, and clickjacking.
- **Read-Only AI Isolation:** Conversational AI tools are strictly read-only; administrative and operational actions require explicit human sign-off.
- **SQL Injection Prevention:** 100% parameterized database queries via Drizzle ORM.
- **Authentication Security:** Argon2 password hashing with strict salt generation and cryptographically signed session cookies (`HttpOnly`, `SameSite=Lax`, `Secure`).

---

## 11. LICENSE & INTELLECTUAL PROPERTY

Copyright © 2026 LOOMERA Atelier. All rights reserved. Proprietary software.
