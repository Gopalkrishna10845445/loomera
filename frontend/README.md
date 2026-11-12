# LOOMERA — Next.js Application Core (`frontend/`)

This directory houses the complete **Next.js 16 (App Router)** production web application for LOOMERA.

---

## Quick Reference for Developers

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`
- **PostgreSQL**: `v17` running locally on port 5434 or configured via Supabase

### Local Development Commands

```bash
# Install dependencies
npm install

# Start development server with Turbopack (http://localhost:3000)
npm run dev

# Run strict TypeScript type check (zero errors required)
npx tsc --noEmit

# Run ESLint static analysis
npm run lint

# Run master automated regression test suite (12 suites, 825 assertions)
npm test

# Run Next.js production build
npm run build

# Start production server
npm run start
```

---

## Database & Migration Tooling

```bash
# Seed local database with luxury garment catalog & variants
npm run db:seed

# Generate Drizzle migrations from schema changes
npm run db:generate

# Apply Drizzle migrations to database
npm run db:migrate

# Launch Drizzle Studio graphical browser
npm run db:studio

# Run database schema inspection script
npx tsx scripts/inspect_db.ts

# Deploy schema and seeds to remote Supabase cluster
powershell -ExecutionPolicy Bypass -File scripts/deploy_to_supabase.ps1
```

---

## Directory Layout

```text
frontend/
├── public/                 # Optimized static images, logos, and web fonts
├── scripts/                # 12 Automated test suites, seeds, and migration scripts
├── src/
│   ├── app/                # Next.js App Router (75 routes, layouts, and API handlers)
│   ├── components/         # React 19 UI components (Storefront, Admin, Cart, Assistant)
│   ├── context/            # React state contexts (AuthContext, CartContext)
│   ├── data/               # Static fallback data & mock definitions
│   ├── db/                 # PostgreSQL client connection & Drizzle ORM schema (48 tables)
│   ├── lib/                # Business logic, services (Pricing, Auth, Orders, AI BI)
│   ├── types/              # Global TypeScript interfaces
│   └── middleware.ts       # Route security proxy & session validation
├── .env.example            # Environment variables template
├── next.config.ts          # Next.js build and image optimization settings
├── package.json            # Project dependencies and script declarations
├── postcss.config.mjs      # PostCSS configuration for Tailwind CSS v4
└── tsconfig.json           # Strict TypeScript configuration
```

For complete system architecture, database schema, and deployment runbooks, see the central **[Documentation Directory](../docs/README.md)**.
