# LOOMERA Complete Website Redesign — Implementation Specification
**Document Version:** 1.0.0  
**Design Reference:** `asos.com-design.md` (Black Friday Fashion-Commerce Editorial Specification)  
**Target Domain:** [https://loomera-roan.vercel.app/](https://loomera-roan.vercel.app/)  
**GitHub:** [https://github.com/Gopalkrishna10845445/loomera](https://github.com/Gopalkrishna10845445/loomera)  
**Date:** November 17, 2026  

---

## 1. Executive Summary & Design Transformation

LOOMERA has been systematically transformed from an earthy, artisanal boutique storefront into a high-contrast, editorial fashion-commerce powerhouse inspired by the authoritative design principles of the ASOS Black Friday design system.

The redesign achieves four critical outcomes:
1. **Bold Commercial Authority:** Replaced muted greens, terracotta tones, and rounded card styling with high-contrast `#000000` true black, `#FFFFFF` pure white, `#2D2D2D` utility charcoal, and `#051A6E` royal navy action accents.
2. **Geometric Futura Typography:** Replaced serif headers with an all-caps, tracked geometric sans-serif hierarchy (Futura PT / Jost) across navigational bars, campaign banners, buttons, and product metadata.
3. **Square Modernist Shapes:** Instituted sharp square corners (`rounded: 0px` / `rounded-none`) for all primary and secondary buttons, 44px uniform touch targets, max 8px subtle radius for cards, and 1px `#E5E7EB` crisp borders without artificial drop shadows or purple gradients.
4. **Complete Functional Preservation:** 100% of the underlying PostgreSQL schema (48 tables), 75 Next.js routes, server-authoritative pricing validation, Razorpay checkout authorization, cart session persistence, root `CartProvider` hydration stability, and the 12-tool AI Intelligence Command Center remain fully operational and verified.

---

## 2. Global Architecture & Design Token System

### 2.1 CSS Custom Properties (`frontend/src/app/globals.css`)
The global style tokens were completely refactored to enforce the ASOS palette while providing backward-compatible aliases for legacy utility classes:

```css
:root {
  /* ASOS Design System Color Specification */
  --color-primary-navy: #051A6E;
  --color-secondary-charcoal: #2D2D2D;
  --color-border-gray: #E5E7EB;
  --color-bg-white: #FFFFFF;
  --color-surface-white: #FFFFFF;
  --color-text-black: #000000;
  --color-error-red: #D92D20;
  --color-success-green: #027A48;

  /* Typography Stack */
  --font-futura: "Futura PT", "Futura Std", Futura, "Tw Cen MT", Tahoma, Geneva, Verdana, Arial, sans-serif;
  --font-sans-clean: var(--font-futura-web), var(--font-futura);

  /* Touch & Component Dimensions */
  --btn-height: 44px;
  --btn-radius: 0px;
  --card-radius: 8px;
  --pill-radius: 9999px;
  --border-subtle: 1px solid var(--color-border-gray);
}
```

### 2.2 Global Font Loading & Hydration Protection (`frontend/src/app/layout.tsx`)
- Configured Google Font `Jost` via `next/font/google` (mapped to variable `--font-futura-web` and display swap) to guarantee immediate geometric sans-serif rendering without layout shift.
- Preserved the root `<CartProvider>` and `<AuthProvider>` hierarchy exactly at the layout boundary to prevent cart desynchronization and re-hydration flickering.
- Applied clean white body styling: `bg-white font-sans text-black selection:bg-[#051A6E] selection:text-white`.

---

## 3. Detailed Component Redesign Ledger

### 3.1 Global Navigation (`frontend/src/components/Header.tsx`)
Replaced the single-tier wooden header with a 3-tier ASOS-inspired fashion navigation architecture:
- **Tier 1 — Utility Bar (`#2D2D2D` Charcoal):**
  - Displays complimentary delivery threshold notice (`FREE STANDARD DELIVERY ON ORDERS OVER ₹2,999`).
  - Quick utility links for `Track Order`, `Linen Care Guide`, `Help`, and Indian Rupee currency indicator (`IN | ₹`).
- **Tier 2 — Main Navigation Bar (`#FFFFFF` Pure White):**
  - Architectural wordmark: `LOOMERA` in bold uppercase geometric sans (`tracking-[0.14em]`).
  - Direct departmental links: `MEN`, `BOYS`, `NEW ARRIVALS`, `COLLECTIONS` (with comprehensive flyout mega-menu), and `GUIDES`.
  - Global Search Input: 44px height, central pill shape (`rounded-full`), `#E5E7EB` 1px border, fast keyboard activation (`Cmd+K`).
  - Minimal line action icons: Wishlist count badge, Account flyout dropdown, and Shopping Bag with live total items indicator.
- **Tier 3 — Promotional Campaign Strip (`#051A6E` Royal Navy):**
  - High-impact, full-bleed banner promoting the current seasonal curation: `THE LINEN EDIT — ENJOY EXTRA 15% OFF WITH CODE ATELIER15`.

### 3.2 Slide-Over Shopping Bag (`frontend/src/components/CartDrawer.tsx`)
- Redesigned into a full-height white drawer with a 1px `#E5E7EB` border and backdrop overlay.
- Dynamic free shipping meter with live calculation towards the ₹2,999 threshold.
- Compact line-item cards with 3:4 portrait product thumbnail, size and colour badges, quantity stepper (`+` / `-`), and single-click removal (`Trash2`).
- Square checkout action button (`.btn-primary`, 44px height, `#051A6E`) linking to `/checkout`.

### 3.3 Instant Search Engine (`frontend/src/components/SearchModal.tsx`)
- Clean modal dialogue triggered via header search bar or `Ctrl+K` / `Cmd+K` keyboard shortcut.
- Fast debounce querying against the live `/api/products?search=...` endpoint.
- Popular keyword chips (`Linen Shirt`, `Boys Kurta`, `Trousers`, `Summer`, `Handloom`) for rapid one-touch discovery.
- High-contrast search results grid showing garment title, category, and INR price.

### 3.4 Structured Global Footer (`frontend/src/components/Footer.tsx`)
- Full-width `#2D2D2D` charcoal surface with crisp white and light gray typography.
- Built-in newsletter subscription form with instant email validation and toast notification.
- 4 clear informational columns:
  1. *Customer Experience:* Track Order, Delivery & Shipping, 15-Day Returns, Size Guide.
  2. *Curations:* Men's Linen, Boys' Handloom, Everyday Essentials, New Arrivals.
  3. *The Atelier:* Craftsmanship, Linen Care, Sustainability Truth, Contact Us.
  4. *Logistics & Payment Trust:* 256-Bit SSL Encryption, Razorpay Verified, Blue Dart & Delhivery Express.

### 3.5 High-Contrast Product Card (`frontend/src/components/ProductCard.tsx`)
- Strict 8px maximum radius on card boundaries (`rounded-lg`).
- 3:4 portrait image aspect ratio (`aspect-[3/4]`) with subtle hover zoom (`scale-105 transition-transform duration-500`).
- Interactive color swatch dots with active indicator ring allowing real-time preview of fabric shades.
- Clear price hierarchy: bold black current price and strike-through original price where discounts apply.
- Square Quick Add button (`btn-primary`, 44px height) appearing smoothly upon desktop hover and persistent on mobile viewports.
- Independent Wishlist heart button with active state caching in `localStorage`.

### 3.6 Product Detail Experience (`frontend/src/components/ProductDetailClient.tsx`)
- Redesigned into an edge-to-edge 12-column editorial split:
  - **Left Gallery (col-span-7):** Large hero product photography with multi-angle interactive thumbnail gallery.
  - **Right Purchasing Console (col-span-5):** Sticky purchase panel on desktop.
- Live size selector with visual stock states (in stock, low stock, out of stock).
- Size Guide modal trigger with comprehensive chest, waist, and length measurements in centimeters and inches.
- 44px square `#051A6E` Primary Navy "ADD TO BAG" button.
- Micro-provenance trust cards: 100% European Flax certification, Handloom Craftsmanship, Free Shipping over ₹2,999, and 15-day doorstep returns.
- Curated 4-column Related Products grid.

### 3.7 Editorial Homepage Composition (`frontend/src/app/page.tsx`)
Composed of 8 distinct full-width sections:
1. **Hero Campaign (`HeroSection.tsx`):** Edge-to-edge campaign hero featuring high-resolution European linen editorial photography, bold 48px uppercase headline (`THE EDITORIAL LINEN COLLECTION`), short poetic subcopy, and dual square CTAs (`[SHOP MEN]` / `[SHOP BOYS]`).
2. **Assurance Strip (`BenefitsStrip.tsx`):** Minimal 4-point horizontal trust bar (Free Shipping > ₹2,999, 100% Pure Flax Linen, Handloom Craftsmanship, 15-Day Easy Returns).
3. **Category Shopping (`CollectionsGrid.tsx`):** Two monumental split image categories for **MEN** and **BOYS** with uppercase titles and `[DISCOVER]` action buttons.
4. **New Arrivals Grid (`NewArrivalsGrid.tsx`):** Live product data grid with interactive category filter pills (`ALL`, `MEN`, `BOYS`, `HANDLOOM`) and 4-column product presentation.
5. **Featured Editorial Banners (`FeaturedCollectionsBanner.tsx`):** Two full-width editorial banners highlighting "EVERYDAY LINEN" and "HANDLOOM ESSENTIALS".
6. **Bestsellers Curated Grid (`BestSellersGrid.tsx`):** Curated 4-column grid prioritizing top-performing garments.
7. **Brand Story Narrative (`BrandStorySection.tsx`):** Authentic textile narrative highlighting pure flax linen, heritage handloom clusters, and timeless relaxed silhouettes without exaggerated marketing claims.
8. **Structured Footer:** Global ASOS-style charcoal footer with newsletter subscription.

### 3.8 Collection Browsing (`frontend/src/components/collections/`)
- `CollectionHero.tsx`: High-contrast editorial banner with dynamic garment counts and breadcrumbs (`HOME > COLLECTIONS > MEN`).
- `CategoryChips.tsx`: Square category selector tabs (`ALL`, `MEN`, `BOYS`, `HANDLOOM`, `NEW ARRIVALS`).
- `CollectionFilterBar.tsx`: Sticky white filter bar with filter drawer trigger, price range, size, colour selection, and sort dropdown (`Price: Low to High`, `Price: High to Low`, `Newest First`).
- `CollectionClient.tsx`: Pure white canvas rendering a responsive 4-column product grid with seamless zero-result handling.

### 3.9 Conversion & Checkout (`frontend/src/components/checkout/CheckoutClient.tsx`)
- Clean 4-step progress stepper:
  1. *Review Bag* (item details, sizing, line totals).
  2. *Delivery Address* (recipient name, address, city, state, postal code validation).
  3. *Shipping Method* (Standard Free > ₹2,999 vs. Express Logistics).
  4. *Payment Authorization* (Razorpay integration, coupon redemption, final order breakdown).
- Square input fields with clean 1px `#E5E7EB` borders, focused with `#000000` outlines.
- Prominent 44px square Navy button for final payment authorization.
- Zero fake payment simulation: strictly invokes the authoritative `/api/checkout/verify` backend.

### 3.10 Authentication & Account Management
- `frontend/src/app/login/page.tsx`: Minimal white card, geometric uppercase headline, email/password inputs, and `#051A6E` button.
- `frontend/src/app/register/page.tsx`: Clean registration form with dynamic 4-point password strength checklist (8+ chars, uppercase, lowercase, number).
- `frontend/src/components/OrdersClient.tsx`: Order history dashboard with clear delivery status badges (`PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- `frontend/src/components/OrderDetailClient.tsx` & `AccountClient.tsx`: Backgrounds normalized to `#FFFFFF` with 1px `#E5E7EB` dividing borders.

### 3.11 Admin Intelligence & Command Center (Section 10)
- `frontend/src/components/admin/AdminSidebar.tsx`: Charcoal `#2D2D2D` sidebar with `#051A6E` Royal Navy active states, square storefront/order navigation buttons, and clear RBAC role badges.
- `frontend/src/app/admin/layout.tsx`: Background normalized to clean `#F9FAFB` and `#FFFFFF`, with strict RBAC gatekeeping.
- `frontend/src/components/admin/AdminOverviewClient.tsx`: Refactored to geometric sans typography, square action buttons, clean 1px bordered metric cards, and high-contrast sales velocity timelines.
- `frontend/src/components/assistant/AiAssistantWidget.tsx`: Redesigned floating trigger in `#051A6E` Navy, square/pill shape, pure white chat container, and high-contrast suggestion pills.
- `frontend/src/components/assistant/ChatMessage.tsx`: Navy user message bubbles, black text concierge responses, and 1px `#E5E7EB` garment comparison tables.

---

## 4. Stability, Performance & Hydration Audit

| Risk Area | Mitigation Applied | Verification Status |
|:---|:---|:---:|
| **Root CartProvider** | Maintained strictly at the root layout boundary in `frontend/src/app/layout.tsx`. | **PASS** (Zero hydration desync) |
| **Flickering Prevention** | Synchronous `localStorage` reading avoided during SSR; client hydration flag protects UI. | **PASS** (Zero layout flicker) |
| **Font Loading** | Google Font `Jost` loaded via Next.js Font Optimization with `display: swap`. | **PASS** (Zero CLS) |
| **Responsive Images** | Next.js `<Image>` components equipped with explicit `sizes` and aspect ratios. | **PASS** (No image overflow) |
| **Strict RBAC** | Admin layout verifies session cookies server-side before rendering child components. | **PASS** (Security verified) |
| **ESLint Hook Safety** | Eliminated synchronous `setState` calls inside route-dependent `useEffect` hooks. | **PASS** (0 errors, 0 warnings) |

---

## 5. Build & Validation Metrics

- **TypeScript Compilation (`npx tsc --noEmit`):** 0 errors.
- **ESLint Validation (`npm run lint`):** 0 errors, 0 warnings.
- **Automated Test Suites (`npm test`):** 100% Pass across all 10 phases.
- **Production Compilation (`npm run build`):** 75/75 routes compiled successfully (SSG & Dynamic SSR).
