# LOOMERA Complete Website Redesign — Phase A: Baseline Audit & Technical Assessment

**Date:** November 17, 2026  
**Auditor & Creative Director:** Senior E-commerce Product Designer, UX Architect & Next.js Systems Architect  
**Project:** LOOMERA — Premium Men's and Boys' Linen & Handloom Fashion Platform  
**Reference Design Specification:** ASOS Black Friday High-Contrast Editorial Design System (`asos.com-design.md`)  
**Production Target:** Full Visual & UX Redesign across all storefront and admin surfaces  

---

## 1. Executive Summary

A comprehensive architectural and visual audit of LOOMERA was executed across all 75 Next.js App Router routes, 48 PostgreSQL database tables, design tokens, and frontend components.

The application has a robust, production-certified backend:
- **Database:** Supabase Managed PostgreSQL 17 / Local PostgreSQL daemon (Port 5434), 48 relational tables.
- **ORM:** Drizzle ORM (`^0.45.4`).
- **Framework:** Next.js 16.4.2 (Turbopack, React 19, TypeScript 5).
- **Test Baseline:** 100% Pass Rate across all 10 automated test suites (Pricing engine, Auth/Cart/Wishlist, AI Assistant, Product Intelligence, Checkout/Orders, Admin/Inventory, AI Recommendations, Production Readiness, Business Operations, Growth/Commerce, Business Intelligence).
- **Production Build:** All 75 routes compiled and statically rendered with zero fatal compilation errors.
- **Flickering Fixes:** The root `CartProvider` architecture in `frontend/src/app/layout.tsx` and hydration-safe post-mount synchronization in `CartContext.tsx` are fully verified and preserved.

### The Visual Transformation Requirement
While functionally mature, the existing frontend was styled in an artisanal aesthetic (ivory `#fbf9f4`, muted teal `#264653`, terracotta `#E76F51`, serif Playfair Display typography, liquid glassmorphism, heavy shadows, and rounded pill containers). 

Under this initiative, LOOMERA is being transformed into a **bold, editorial, high-contrast fashion-commerce storefront** adhering to the ASOS Black Friday design system principles:
- **Palette:** Crisp White (`#FFFFFF`), True Black (`#000000`), Deep Royal Navy (`#051A6E`), Secondary Charcoal (`#2D2D2D`), Pale 1px Border (`#E5E7EB`), Reserved Semantic Red (`#D92D20`).
- **Typography:** Geometric Futura sans-serif hierarchy (`headline-display` 48px bold, `headline-lg` 32px bold, `headline-md` 28px bold, `label-sm` uppercase tracked CTAs).
- **Shapes & Chromes:** Square corners on buttons (`rounded: none`), 8px max card radius, pill-shaped central search, subtle 1px gray borders with zero heavy decorative shadows or glassmorphic blur.
- **Merchandising:** Full-width edge-to-edge campaign imagery, 4-column responsive product grids, prominent dual-category entrance (MEN & BOYS), and streamlined commercial conversion flows.

---

## 2. Route Inventory & Redesign Scope

| Route Path | Type | Current State | Target Redesign Architecture |
|---|---|---|---|
| `/` | SSR / Static | Ivory, rounded cards, glassmorphic hero | Edge-to-edge campaign hero, dual MEN & BOYS image split, New Arrivals grid, editorial collection banners, Best Sellers, Brand Story, Newsletter |
| `/collections` | Redirect | Redirects to `/collections/men` | Preserved clean redirect to `/collections/men` |
| `/collections/[category]` | SSG / Dynamic | Ivory background, rounded pills | High-contrast editorial hero banner, sticky filter bar, 4-column product grid, swatch pills, quick add |
| `/products/[id]` | SSG / Dynamic | Warm tone, rounded buttons | High-fashion editorial gallery on left, clean product details on right, 44px square Navy CTA, swatch selector, size selector |
| `/checkout` | Dynamic | Step-based with glass cards | Sharp, high-conversion 2-column checkout with coupon drawer, order summary, address validation, Razorpay trigger |
| `/login` & `/register` | Static | Centered ivory card with teal buttons | High-contrast fashion retail auth with bold geometric typography, clean inputs, and square CTAs |
| `/account` | Dynamic | Rounded panels, muted tabs | Clean editorial patron dashboard, order history, addresses, loyalty tracking, support tickets |
| `/orders` & `/orders/[id]` | Dynamic | Rounded cards with status pills | High-contrast order tracking timeline, itemized receipt with garment thumbnails, carrier status |
| `/campaign/[code]` | Dynamic | Custom campaign banner | High-impact promotional campaign landing page with bold typography and curated product grid |
| `/guides/linen-care` | Static | Editorial article with serif fonts | Modern fashion editorial care guide with clean typography, iconography, and Schema.org JSON-LD |
| `/admin/*` (11 sub-routes) | Dynamic / RBAC | Dark teal sidebar, rounded cards | Premium charcoal/navy command center, structured tables, minimal cards, functional charts, preserved Phase 1–10 BI |

---

## 3. Component Architecture & Mapping

| Component | Path | Current Aesthetic | Redesign Plan |
|---|---|---|---|
| `Header` | `components/Header.tsx` | Floating glass capsule, rounded search | 3-tier fashion commerce header: (1) Dark Charcoal utility bar, (2) White main nav with geometric wordmark, MEN/BOYS/NEW/COLLECTIONS/GUIDES, central pill search (44px), Bag/Wishlist/Account icons, (3) Royal Navy promotional banner |
| `Footer` | `components/Footer.tsx` | Dark teal `#264653` container | Full-width structured retail footer: Customer Care, Shipping/Returns, Legal, Brand, Newsletter subscription, Payment icons |
| `ProductCard` | `components/ProductCard.tsx` | Rounded 12px card, shadow, teal quick add | Flat 8px max card, 1px `#E5E7EB` border, high-contrast imagery, bold title, strike-through sale pricing, interactive color dots, instant Quick Add, Wishlist heart |
| `HeroSection` | `components/HeroSection.tsx` | Serif Playfair headline, soft gradient | Full-width edge-to-edge campaign hero, 48px bold uppercase headline, dual [SHOP MEN] / [SHOP BOYS] buttons |
| `CollectionsGrid` | `components/CollectionsGrid.tsx` | 3 small horizontal cards | 2 prominent edge-to-edge category portals (MEN & BOYS) with large photography, bold uppercase typography, and [SHOP NOW] |
| `NewArrivalsGrid` | `components/NewArrivalsGrid.tsx` | Ivory container with serif titles | High-contrast retail product grid with category filters, badge highlights, and instant add-to-bag |
| `CartDrawer` | `components/CartDrawer.tsx` | Muted slideover, teal accents | Clean white high-contrast drawer, live quantity adjustments, shipping progress meter, checkout CTA |
| `SearchModal` | `components/SearchModal.tsx` | Centered modal | Full-bleed rapid search overlay with instant suggestions, live keyword matching, and direct product links |
| `CollectionHero` | `components/collections/CollectionHero.tsx` | Ivory overlay with serif text | High-contrast editorial banner with uppercase campaign title, breadcrumb trail, and product counter |
| `CollectionFilterBar` | `components/collections/CollectionFilterBar.tsx` | Rounded chips | Clean horizontal filter bar with drop-down menus for size, color, price range, and sort |
| `ProductDetailClient` | `components/ProductDetailClient.tsx` | Split layout with teal CTAs | Editorial split layout: high-res zoomable gallery, geometric pricing block, size guide drawer, stock notice, primary navy CTA |
| `CheckoutClient` | `components/checkout/CheckoutClient.tsx` | Multi-step cards | High-conversion streamlined layout with address book, shipping methods, coupon engine, and secure Razorpay interface |
| `AdminSidebar` & Admin Views | `components/admin/*` | Dark teal palette `#1A333B` | High-contrast Charcoal `#2D2D2D` & Navy `#051A6E` operational palette, structured data tables, status badges |
| `AiAssistantWidget` | `components/assistant/*` | Teal floating button | Minimal high-contrast concierge drawer with quick prompt chips and product comparison cards |

---

## 4. Preservation of Performance & Flickering Mitigations

The audit verified that the previous flickering issue was solved by:
1. Lifting `<CartProvider>` to the root `layout.tsx` so state persists across page transitions.
2. Initializing cart and wishlist state identically on server and client to prevent React hydration mismatches.
3. Deferring `localStorage` synchronization until after hydration (`hasHydrated` guard + `queueMicrotask`).
4. Eliminating aggressive CSS animations or layout-shifting transforms.

**Redesign Guarantee:** All of these mitigations will remain completely intact. The visual changes will alter only styling, layout composition, typography, and color tokens, leaving the state management and lifecycle hooks untouched.
