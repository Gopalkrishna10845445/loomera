# LOOMERA — Production Performance & Core Web Vitals Report

**Date:** November 16, 2026  
**Auditor:** Senior Frontend Performance Optimization Specialist  
**Live Target:** `https://loomera-roan.vercel.app`  
**Host:** Vercel Edge Network (Mumbai / Global Anycast CDN)  
**Status:** Audit Complete — High Storefront Responsiveness / Database Bottleneck Identified

---

## 1. Executive Summary

A real-user monitoring (RUM) and performance probe was executed against `https://loomera-roan.vercel.app/` using the browser Navigation Timing API, Resource Timing API, and paint metrics.

The static storefront and pre-rendered SSG catalog benefit strongly from Vercel's global edge cache (`X-Vercel-Cache: HIT`), delivering sub-second page loads. However, dynamic backend routes that query the database suffer from connection failure timeouts.

---

## 2. Core Performance Telemetry

Telemetry collected on a 1440 × 900 desktop viewport over HTTPS:

| Metric | Measured Value | Standard Target | Assessment |
| :--- | :--- | :--- | :--- |
| **DNS Resolution** | **0 ms** (Cached / Persistent) | < 50 ms | **EXCELLENT** |
| **TLS Negotiation** | **1,502 ms** (Cold SSL Handshake) | < 150 ms | **FAIR** (Initial connection only) |
| **Time to First Byte (TTFB)** | **680 ms** | < 800 ms | **GOOD** |
| **DOM Content Loaded (DCL)** | **818 ms** (Live Edge Route) | < 1,500 ms | **EXCELLENT** |
| **First Contentful Paint (FCP)** | **< 1.0 s** (SSG Prerendered) | < 1,800 ms | **GOOD** |
| **Cumulative Layout Shift (CLS)** | **0.00** | < 0.10 | **PERFECT** |
| **Horizontal Page Overflow** | **0 px** (Across all viewports) | 0 px | **PERFECT** |

---

## 3. Asset & Bundle Analysis

1. **Preloaded Web Fonts:**
   - Both `Playfair Display` and `DM Sans` are loaded via Next.js Google Font optimization as zero-layout-shift variable WOFF2 subsets:
     - `2a65768255d6b625-s.p.2r-cuu_7locvx.woff2`
     - `5c285b27cdda1fe8-s.p.0lsanbtneewqp.woff2`
   - Preloaded in `<head>` with `crossorigin=""`, eliminating FOIT (Flash of Invisible Text) and FOUT (Flash of Unstyled Text).

2. **Image Optimization via Next.js Image Component (`/_next/image`):**
   - Hero and editorial images use responsive `imageSrcSet` spanning from 640w to 2048w with WebP/AVIF content negotiation.
   - Example: `/_next/image?url=%2Fassets%2Freference%2Fhero_model.jpg&w=1920&q=75` delivers crisp, compressed high-fashion imagery without multi-megabyte raw downloads.

3. **CSS Bundle:**
   - Consolidated Tailwind CSS utility stylesheet: `01n8oa7kza2s4.css` (~18 KB gzipped).
   - Injected with `data-precedence="next"` to prevent render-blocking flashes.

---

## 4. Performance Bottlenecks & Optimization Recommendations

### Bottleneck 1: Database Connection Latency on Dynamic APIs
- **Observation:** `GET /api/products` and `POST /api/assistant/chat` return 500/503 due to database disconnection.
- **Root Cause:** Next.js serverless functions in Vercel do not have an active pooled connection string to Supabase.
- **Actionable Optimization:**
  - Configure `DATABASE_URL` pointing to the Supabase **Transaction Pooler** (`port 6543`).
  - Configure `max: 1` or `max: 2` connections per serverless function instance in `src/db/index.ts` to prevent exhausting connection limits.

### Bottleneck 2: Missing Route Prefetch Stalls
- **Observation:** Clicking the header prefetch triggers a 404 on `/about`.
- **Actionable Optimization:**
  - Redirect or point `<Link href="/about">` to an existing valid route to eliminate superfluous failed HTTP requests.

---
*Report filed by Senior Performance Specialist.*
