# LOOMERA Documentation Directory

Welcome to the comprehensive technical documentation for **LOOMERA** — an AI-powered luxury e-commerce platform for men's and boys' artisanal linen and handloom apparel.

---

## Documentation Index

| Document | Description |
| :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Full system architecture, layered design, App Router structure, AI orchestrator, and BI engine. |
| **[DATABASE.md](./DATABASE.md)** | Authoritative PostgreSQL database schema, 48 relational tables, constraints, connection pooling, and migrations. |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Production deployment runbook for Vercel and Supabase PostgreSQL, build commands, and healthchecks. |
| **[ENVIRONMENT.md](./ENVIRONMENT.md)** | Complete specification of environment variables, security boundaries, and secret governance. |
| **[API.md](./API.md)** | Authoritative API reference covering all 75 endpoints (Storefront, Auth, Cart, Checkout, Admin, AI BI). |
| **[phases/](./phases/)** | Archived historical engineering reports, audits, and implementation logs from Phases 1 through 10. |

---

## Architecture at a Glance

LOOMERA is built on Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and PostgreSQL via Drizzle ORM.

```text
loomera/
├── .agents/skills/          # Installed Supabase Agent Skills
├── .github/workflows/       # GitHub Actions CI/CD Pipeline
├── docs/                    # Centralized Engineering & Architecture Docs
│   ├── ARCHITECTURE.md      # System Architecture & Component Design
│   ├── DATABASE.md          # 48-Table Database Schema Specification
│   ├── DEPLOYMENT.md        # Vercel & Supabase Deployment Runbook
│   ├── ENVIRONMENT.md       # Environment Variables & Secret Configuration
│   ├── API.md               # Complete REST API Reference
│   └── phases/              # Historical Phase 1-10 Implementation Reports
├── frontend/                # Next.js 16 Production Application
│   ├── public/              # Optimized Static Assets & Typography
│   ├── src/                 # Application Source Code (App, Components, Lib, DB)
│   ├── scripts/             # Automated Test Suites (825 Assertions) & Seeds
│   └── package.json         # Dependencies & Script Runners
├── scripts/                 # Visual Regression & Browser QA Automation
├── .gitignore               # Strict Production Git Ignore Rules
└── README.md                # Authoritative Project Overview & Quick Start
```
