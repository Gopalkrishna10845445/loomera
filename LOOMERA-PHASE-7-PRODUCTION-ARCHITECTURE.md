# LOOMERA — PRODUCTION INFRASTRUCTURE & CLOUD ARCHITECTURE

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Document Version:** 1.0.0 (Production Release)  
**Target Availability SLA:** 99.95% Uptime  
**Recovery Objectives:** RPO < 5 Minutes, RTO < 15 Minutes  

---

## 1. Architectural Overview & System Topology

LOOMERA is architected as a modern, high-performance, stateless e-commerce platform built on the Next.js App Router (React 19, TypeScript), powered by a relational PostgreSQL 17 data engine managed via Drizzle ORM, with Razorpay for sovereign Indian currency payment processing, and an intelligent client-server AI shopping concierge.

```
                             [ Internet Patrons / Web Browsers ]
                                             │
                                             ▼
                      ┌─────────────────────────────────────────────┐
                      │          Cloudflare Edge Network            │
                      │  - Anycast DNS & Automated SSL/TLS 1.3      │
                      │  - Web Application Firewall (WAF) & DDoS    │
                      │  - Global CDN Asset Caching (Static/Media)  │
                      │  - Edge Security Headers & Rate Limiting    │
                      └──────────────────────┬──────────────────────┘
                                             │
                                             ▼
                      ┌─────────────────────────────────────────────┐
                      │         Compute Layer (Next.js 16)          │
                      │  - Primary Host: Vercel Pro / AWS ECS       │
                      │  - App Router SSR + Turbopack Generation    │
                      │  - Serverless API Handlers & Route Proxy    │
                      │  - Edge-Terminated CSRF & Session Validation│
                      └───────┬─────────────────────────────┬───────┘
                              │                             │
              ┌───────────────┴───────────────┐             │
              ▼                               ▼             ▼
  ┌───────────────────────┐       ┌───────────────────────┐ ┌──────────────────────┐
  │ Managed PostgreSQL 17 │       │ Third-Party Services  │ │ Cloud Object Storage │
  │ (AWS RDS / Supabase)  │       │ - Razorpay Gateway    │ │ (AWS S3 / Cloudflare │
  │ - Primary Write Node  │       │ - Resend / AWS SES    │ │  R2 Media Bucket)    │
  │ - Transaction Pooler  │       │ - Gemini AI API       │ │ - High-res Imagery   │
  │ - Daily Backup Vault  │       └───────────────────────┘ └──────────────────────┘
  └───────────────────────┘
```

---

## 2. Infrastructure & Hosting Options Evaluation

| Dimension | Option A: Vercel Pro (Recommended) | Option B: AWS ECS / Fargate (Containerized) | Option C: Dedicated VPS (Hetzner / DigitalOcean) |
|---|---|---|---|
| **Architecture Fit** | Native first-class support for Next.js App Router & Server Actions | High control via Docker; complex container orchestration | Single-server monolith; high maintenance overhead |
| **Operational Overhead** | Near-zero (fully managed CI/CD, automatic preview environments) | Moderate to High (requires Terraform, VPC, IAM, ALB setup) | High (requires manual OS patching, failover scripts, Nginx) |
| **Edge Global Latency** | Ultra-low (< 30ms TTFB via Vercel Edge Network) | CloudFront CDN configuration required | Depends on single datacenter location |
| **Connection Pooling** | Requires managed pooling (Supavisor / AWS RDS Proxy) | Native connection pooling inside container task | Local PgBouncer instance on localhost |
| **Estimated Monthly Cost** | \$20/seat + usage (~$40–$75/month total) | ~$85–$160/month (ALB + NAT Gateway + ECS + RDS) | ~$30–$60/month (fixed server specs) |
| **Production Decision** | **Recommended for Launch** | Enterprise scale-out tier (>10,000 concurrent sessions) | Not recommended for mission-critical e-commerce |

---

## 3. Database Topology & Connection Pool Sizing

### 3.1 Recommended Production Engine
- **Engine:** PostgreSQL 17.x (Managed via AWS RDS, Neon, or Supabase Enterprise)
- **High Availability:** Multi-AZ automated failover with read replica for analytical queries (`admin_audit_logs`, `search_history`, `product_view_history`).
- **Connection Pool Sizing Formula:**
  $$\text{Max Connections} = ((\text{Core CPU Count} \times 2) + \text{Spindle Effective Count}) \times \text{Safety Margin}$$
- **Serverless / Compute Pool Calculation:**
  - For serverless deployment (Vercel/Lambda), direct connections can quickly exceed PostgreSQL limits.
  - A transaction-mode connection pooler (**Supavisor** or **AWS RDS Proxy**) MUST be positioned between the Next.js runtime and PostgreSQL.
  - Direct connection: `DATABASE_URL` configured with `max: 20` pool size per long-running container, or `connection_limit=1` per serverless invocation.
  - Connection timeout: 5,000 ms.
  - Idle timeout: 30,000 ms.
  - Keep-alive: Enabled.

---

## 4. Media Storage & Content Delivery Network (CDN)

1. **Storage Tier:**
   - Garment photography, swatch textures, and craft hero imagery stored in an **S3-compatible Object Storage Bucket** (e.g., Cloudflare R2 or AWS S3 in `ap-south-1` Mumbai region for minimal latency to Indian patrons).
   - Zero egress fees achieved with Cloudflare R2.
2. **Next.js Image Pipeline:**
   - Server-side image optimization configured with `formats: ['image/avif', 'image/webp']`.
   - Device breakpoints: `[640, 750, 828, 1080, 1200, 1920, 2048]`.
   - Quality factor: 85 (delivering artifact-free fabric weave detail at minimal byte size).
   - Strict `remotePatterns` restricting image fetching exclusively to verified bucket domains and trusted Google CDNs.

---

## 5. Security & Network Perimeter (Edge Layer)

1. **Cloudflare WAF (Web Application Firewall):**
   - OWASP Core Rule Set active.
   - Bot Fight Mode enabled to deter automated scraping of artisan product catalog.
   - Rate limiting at edge: 60 requests/minute per IP on sensitive routes (`/api/auth/*`, `/api/checkout/*`).
2. **TLS 1.3 Strict Encryption:**
   - Full (Strict) SSL mode from Cloudflare edge to origin server.
   - Strict-Transport-Security (HSTS) with 1-year max-age, `includeSubDomains`, and `preload`.
3. **HTTP Security Headers:**
   - Enforced across all server responses via `next.config.ts`.
   - Content Security Policy (CSP) tuned to permit Razorpay checkout iframe (`https://api.razorpay.com`, `https://checkout.razorpay.com`) and Google Fonts.

---

## 6. Disaster Recovery & Business Continuity

| Metric | Target | Architecture Provision |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 5 Minutes** | Automated continuous WAL archiving + daily full physical snapshots at 02:00 IST. |
| **Recovery Time Objective (RTO)** | **< 15 Minutes** | Scripted single-command database restore (`scripts/restore_db.ps1`) from verified encrypted backups. |
| **Availability SLA** | **99.95%** | Multi-AZ database clustering, redundant DNS, stateless Next.js app servers. |

---
*End of Production Architecture Document.*
