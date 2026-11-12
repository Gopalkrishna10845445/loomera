# LOOMERA — MEDIA INFRASTRUCTURE & IMAGE OPTIMIZATION READINESS

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Version:** 1.0.0  
**Target Formats:** AVIF, WebP, Progressive Fallback  
**Cache Policy:** Immutable 1-Year Edge TTL / 24-Hour Next.js Image Optimization Cache  

---

## 1. High-Resolution Visual Aesthetic & Requirements

LOOMERA is a luxury menswear atelier celebrating tactile materials: raw linen, handspun khadi, textured weaves, and architectural tailoring. High-resolution imagery is central to conveying authentic fabric weight (GSM) and artisanal texture to discerning patrons without introducing bandwidth-heavy latency.

```
Patron Viewport                 Next.js Image Pipeline (Turbopack)           Object Storage / CDN
      │                                       │                                      │
      │ 1. GET /_next/image?url=...&w=1080    │                                      │
      ├──────────────────────────────────────►│                                      │
      │                                       │ 2. Check Local Optimization Cache    │
      │                                       │    (minimumCacheTTL: 86400s)         │
      │                                       ├─────────────────────────────────────►│
      │                                       │ 3. If cache miss, fetch original     │
      │                                       │◄─────────────────────────────────────┤
      │                                       │ 4. Encode to AVIF / WebP             │
      │ 5. Deliver Compressed Next-Gen Image  │                                      │
      │◄──────────────────────────────────────┤                                      │
```

---

## 2. Next.js Image Optimization Engine (`next.config.ts`)

The production configuration in `next.config.ts` enforces the following parameters:

1. **Next-Generation Formats:**
   - `formats: ['image/avif', 'image/webp']`
   - Browsers supporting AVIF receive superior compression (up to 50% byte reduction compared to JPEG at identical perceptual quality), preserving delicate fabric weave textures.
2. **Responsive Device Breakpoints:**
   - `deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048]`
   - Ensures mobile devices download compact 640px representations while 4K displays receive crisp 2048px garment imagery.
3. **Strict Remote Pattern Whitelist:**
   - Restricts external image retrieval to verified sources:
     - `lh3.googleusercontent.com`
     - `contribution.usercontent.google.com`
     - `images.unsplash.com`
     - `*.loomera.com`
   - Thwarts Server-Side Request Forgery (SSRF) and prevents unauthorized domain bandwidth consumption.

---

## 3. Product Photography & Texture Standards

| Attribute | Specification | Rationale |
|---|---|---|
| **Primary Aspect Ratio** | 4:5 Portrait (`800x1000` or `1200x1500`) | Standard vertical fashion framing emphasizing drape and silhouette. |
| **Macro Swatch Ratio** | 1:1 Square (`1000x1000`) | Displays close-up grain of khadi cotton and slub linen fibers. |
| **Color Space** | sRGB | Ensures identical garment color fidelity across mobile OLED and desktop IPS panels. |
| **Target Quality Factor** | 85 | Optimal balance between eliminating JPEG compression artifacts and minimizing mobile download payload. |

---

## 4. Edge CDN Caching & Invalidation Protocol

1. **Static Assets (`/_next/static/*`):**
   - Header: `Cache-Control: public, max-age=31536000, immutable`
   - Content-addressed filenames with Turbopack hashes enable aggressive, lifelong edge caching.
2. **Optimized Images (`/_next/image?*`):**
   - Header: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
   - Images cached at Cloudflare edge for 24 hours, automatically revalidated in the background.
3. **Invalidation:**
   - When product imagery is updated via `/api/admin/products/[id]/images`, Next.js on-demand revalidation (`revalidatePath('/products/[slug]')`) purges stale HTML and forces fresh image generation.

---
*End of Media Readiness Specification.*
