# LOOMERA — PHASE 9 SEARCH ENGINE OPTIMIZATION (SEO) STRATEGY
## Technical SEO Architecture, Schema.org Structured Data, Evergreen Content & Organic Discovery

**Author:** Principal SEO Strategist & Full-Stack Architect  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. STRATEGIC POSITIONING & ORGANIC SEARCH OPPORTUNITY

Luxury fashion e-commerce relies heavily on brand search and high-intent unbranded category queries. Customers searching for:
- *"pure linen collarless shirt for men"*
- *"unbleached tussar silk kurta"*
- *"young gentleman linen wedding tailoring"*
- *"how to care for European flax linen"*

represent the highest LTV (Lifetime Value) prospective patrons. Capturing these queries organically minimizes paid customer acquisition costs (CAC) and builds a defensible, sustainable revenue moat.

Phase 9 implements an enterprise-grade **Technical SEO and Semantic Structured Data Foundation**.

---

### 2. SCHEMA.ORG JSON-LD STRUCTURED DATA SUITE

LOOMERA injects dynamic, validated Schema.org microdata across all relevant routes to unlock Google Rich Results (Price badges, In-Stock indicators, Merchant Return Privileges, Star Ratings, and Breadcrumbs).

#### A. Product & Offer Schema (`/products/[id]`)
Injected via `generateProductJsonLd(product)`:
```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Classic Normandy Linen Shirt",
  "image": ["https://loomera.com/assets/products/classic-linen.jpg"],
  "description": "Artisanal European flax linen tailored with mother-of-pearl buttons.",
  "sku": "classic-linen-shirt",
  "mpn": "LMR-CLASSIC-LINEN-SHIRT",
  "brand": { "@type": "Brand", "name": "LOOMERA" },
  "material": "100% Pure European Flax Linen",
  "countryOfOrigin": "IN",
  "offers": {
    "@type": "Offer",
    "url": "https://loomera.com/products/classic-linen-shirt",
    "priceCurrency": "INR",
    "price": 2499,
    "availability": "https://schema.org/InStock",
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "IN",
      "merchantReturnDays": 15,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn"
    }
  }
}
```

#### B. BreadcrumbList Schema (`generateBreadcrumbJsonLd`)
Enables hierarchical navigation breadcrumbs in Google Search results:
```
LOOMERA > Men > Classic Normandy Linen Shirt
```

#### C. Editorial Article Schema (`/guides/linen-care`)
Injected on evergreen care and textile craftsmanship guides to capture informational search queries.

---

### 3. TECHNICAL SEO & CRAWLABILITY DIRECTIVES

#### A. Dynamic XML Sitemap (`sitemap.ts`)
- Auto-generates indexed URLs from PostgreSQL products (`isPublished = true`).
- Configures change frequencies: `daily` for new arrivals and collections, `weekly` for individual garments, and `monthly` for care guides.
- Automatic canonical base resolution via `process.env.NEXT_PUBLIC_APP_URL || 'https://loomera.com'`.

#### B. Search Engine Crawl Directives (`robots.ts`)
- **Allowed:** Storefront root (`/`), all collections (`/collections/*`), campaign landing hubs (`/campaign/*`), product detail pages (`/products/*`), and textile care guides (`/guides/*`).
- **Disallowed (Crawl Budget Protection):** Administrative dashboards (`/admin/*`), customer account portals (`/account/*`), checkout sessions (`/checkout`), order histories (`/orders/*`), and private backend APIs (`/api/*`).

#### C. Open Graph & Social Sharing Cards
- Fully responsive `og:image`, `og:title`, and `og:description` injected across all routes.
- Enhanced with native WhatsApp pre-filled share URLs (`?utm_source=whatsapp&utm_medium=social_share`).

---

### 4. CONTENT ARCHITECTURE FOR EVERGREEN DISCOVERY

To capture non-transactional organic traffic at the top of the funnel, LOOMERA established a dedicated Editorial Guides section:
- **Flagship Content:** `/guides/linen-care` (*The Connoisseur's Guide to Pure Linen & Heritage Silk Care*).
- **Core Topics:**
  1. Cool water washing protocols ($\le 30^\circ\text{C}$, pH-neutral botanical detergents).
  2. The aesthetics of natural flax rumples vs. artificial synthetics.
  3. Heritage Tussar & Mulberry silk preservation.
  4. Non-toxic seasonal cedar wardrobe storage.
- **Conversion Bridge:** Seamless cross-sell card linking directly to `/collections/men` at the foot of each guide.
