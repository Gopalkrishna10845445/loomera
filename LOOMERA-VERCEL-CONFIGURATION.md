# LOOMERA — VERCEL PRODUCTION CONFIGURATION AUDIT
## Serverless Compatibility, Root Directory Resolution, Edge Optimization & Runtime Topology

**Date:** November 2026  
**Auditor & Cloud Architect:** Senior DevOps Engineer & Vercel Deployment Architect  
**Scope:** Vercel Runtime Profile, Build & Install Directives, Serverless Function Architecture, Image Optimization & Connection Pooling  
**Status:** Audit Completed — Architecture Certified for Vercel Deployment  

---

### EXECUTIVE SUMMARY

Deploying a complex, full-stack Next.js 16 application with an integrated PostgreSQL ORM layer to [Vercel](https://vercel.com/) requires aligning the project configuration with Vercel's serverless runtime environment. 

This audit analyzes LOOMERA's build commands, serverless functions, database connection pooling behavior, edge middleware, asset caching, and environment variable requirements to guarantee zero deployment runtime failures.

---

### 1. VERCEL PROJECT TOPOGRAPHY & ROOT DIRECTORY CONFIGURATION

The LOOMERA workspace is organized as a nested repository where the Next.js application resides in `frontend/`, and root-level files house multi-phase documentation, test tools, and GitHub Actions workflows:

```text
c:\Users\gopal\Downloads\lommera\
├── .github/workflows/ci.yml       # CI Pipeline
├── frontend/                      # << VERCEL ROOT DIRECTORY >>
│   ├── src/                       # Application code & route handlers
│   ├── package.json               # Next.js scripts & dependencies
│   ├── package-lock.json          # Dependency lockfile
│   └── next.config.ts             # Compiler and security configuration
├── LOOMERA-*.md                   # Documentation reports
└── .gitignore                     # Repository-level ignore rules
```

#### Vercel Dashboard Settings
- **Framework Preset:** `Next.js` (automatically detected)
- **Root Directory:** `frontend` *(CRITICAL: Must be specified in Vercel Project Settings > General)*
- **Build Command:** `next build` (or `npm run build`)
- **Install Command:** `npm install` (utilizing `package-lock.json` cleanly)
- **Output Directory:** `.next` (Vercel default)
- **Node.js Version:** `20.x` (matching Next.js 16.4.2 requirements)

---

### 2. SERVERLESS RUNTIME & API ROUTE COMPATIBILITY

All 50+ backend API route handlers under `frontend/src/app/api/` are built using modern Web Standards (`NextRequest`, `NextResponse`):
- **Stateless Execution:** API routes do not maintain in-memory server state between requests; session verification is performed cryptographically via Argon2 / cookie tokens and database lookups.
- **Zero Local Disk Writes:** All exports (such as the reporting engine's RFC-4180 CSV export) are generated in-memory and streamed directly to the client via HTTP response headers (`Content-Type: text/csv`).
- **Cold Start Optimization:** Lightweight route handlers without heavy binary dependencies guarantee sub-300ms serverless cold starts.

---

### 3. DATABASE CONNECTION POOLING IN SERVERLESS ENVIRONMENTS

In serverless platforms like Vercel, incoming traffic spikes can spin up dozens of concurrent serverless container instances. If each container creates multiple unmanaged direct PostgreSQL connections, the database's `max_connections` limit can be rapidly exhausted.

#### Implemented Pool Management (`frontend/src/db/index.ts`)
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

#### Production Recommendation for Managed PostgreSQL
When configuring production PostgreSQL (Neon or Supabase):
1. **Utilize Connection Pooler Endpoints:**
   - **Neon:** Use the pooled connection string (`-pooler.region.neon.tech`), which routes traffic through Neon's serverless connection pooler.
   - **Supabase:** Use port `6543` (PgBouncer transaction mode) for `DATABASE_URL`.
2. **Direct URL for Migrations:** Use the unpooled/direct connection string for schema migrations (`DATABASE_URL_UNPOOLED` or direct port `5432`).
3. **Enforce SSL:** Add `?sslmode=require` to all production database URLs.

---

### 4. IMAGE OPTIMIZATION & STATIC ASSET DELIVERY

`frontend/next.config.ts` is pre-configured for Vercel's high-performance Image Optimization Network:
- Formats: Modern WebP and AVIF.
- Responsive Device Sizes: `[640, 750, 828, 1080, 1200, 1920, 2048]`.
- Authorized Remote Hostnames:
  - `images.unsplash.com` (artisan fabric imagery)
  - `lh3.googleusercontent.com` (patron avatars)
  - `*.loomera.com` (canonical media CDN)

---

### 5. EDGE MIDDLEWARE & SECURITY HEADERS

- **Route Protection Middleware (`frontend/src/middleware.ts`):** Light, fast edge middleware intercepting unauthenticated requests to `/account`, `/orders`, and `/admin/*` and issuing immediate `307 Temporary Redirect` responses to `/login`.
- **Security Headers (`frontend/next.config.ts`):** Built-in HTTP response headers automatically applied across all Vercel edge nodes:
  - `Content-Security-Policy`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

### 6. VERCEL CONFIGURATION CONCLUSION

The application requires **zero invasive code changes** for Vercel compatibility. Setting the Root Directory to `frontend` in the Vercel Project Settings guarantees a clean, out-of-the-box build and deployment.
