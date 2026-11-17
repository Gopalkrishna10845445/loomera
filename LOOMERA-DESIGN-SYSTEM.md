# LOOMERA Editorial Fashion Commerce Design System

**Specification Authority:** LOOMERA Design System v2.0 (Inspired by ASOS Editorial Fashion Commerce System)  
**Target Codebase:** Next.js 16.4.2 App Router, React 19, Tailwind CSS v4, TypeScript 5  
**Core Principles:** High-Contrast Commercial Clarity, Confident Editorial Typography, Minimal Interface Chrome, Zero Artificial Elevation.

---

## 1. Color Palette & Token Architecture

The color system replaces the previous soft-toned artisanal palette with a bold, high-contrast, editorial fashion retail structure.

```css
:root {
  /* Brand Primary & Accents */
  --color-primary: #051A6E;           /* Deep Royal Navy for high-impact CTAs & brand emphasis */
  --color-primary-hover: #041457;     /* Focused interactive state */
  --color-on-primary: #FFFFFF;        /* White text on primary surfaces */

  /* Neutral & Utility Surfaces */
  --color-secondary: #2D2D2D;         /* Charcoal Gray for utility bars & structural layers */
  --color-on-secondary: #FFFFFF;      /* White text on secondary surfaces */
  --color-background: #FFFFFF;         /* Pure crisp white dominant canvas */
  --color-surface: #FFFFFF;            /* Surface background for cards, modals, headers */
  --color-text: #000000;               /* True black for primary titles & body typography */
  --color-text-muted: #555555;         /* Medium gray for subtitles & secondary labels */
  --color-text-subtle: #888888;        /* Subtle gray for breadcrumbs & captions */

  /* Structural Dividers */
  --color-border: #E5E7EB;             /* Crisp 1px pale gray border */
  --color-border-dark: #2D2D2D;        /* High-contrast divider */

  /* Semantics */
  --color-error: #D92D20;              /* Reserved semantic red for validation & sale badges */
  --color-success: #027A48;            /* Controlled confirmation green */
  --color-warning: #B54708;            /* Subtle advisory amber */
}
```

---

## 2. Typography System

The typography is built around a geometric Futura font stack:
`"Futura PT", "Futura Std", Futura, Tahoma, Geneva, Verdana, Arial, sans-serif`.

### Hierarchy & Scales

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `headline-display` | 48px (3rem) | Bold (700) | 1.08 | 0px | Major campaign hero headlines, full-width statements |
| `headline-lg` | 32px (2rem) | Bold (700) | 38px (1.18) | 0px | Section titles, collection headlines |
| `headline-md` | 28px (1.75rem) | Bold (700) | 36px (1.28) | 1.2px | Subsection titles, editorial feature banners |
| `headline-sm` | 25px (1.56rem) | Regular (400) | 30px (1.2) | 0.6px | Supporting headings, product category headers |
| `headline-xs` | 22px (1.375rem) | Regular (400) | 26px (1.18) | 0px | Card titles, modal headers |
| `body-lg` | 19px (1.187rem) | Regular (400) | 29px (1.52) | 0.6px | Editorial copy, narrative lead paragraphs |
| `body-md` | 16px (1rem) | Regular (400) | 24px (1.5) | 0.4px | Standard product descriptions, policy text |
| `body-sm` | 14px (0.875rem) | Regular (400) | 20px (1.42) | 0.2px | Secondary metadata, specifications, breadcrumbs |
| `label-lg` | 14px (0.875rem) | SemiBold (600) | 20px (1.42) | 1.2px (UPPERCASE) | Navigation menu items, campaign category links |
| `label-md` | 14px (0.875rem) | Medium (500) | 18px (1.28) | 1.0px (UPPERCASE) | Tab headers, secondary actions |
| `label-sm` | 12px (0.75rem) | SemiBold (600) | 16px (1.33) | 0.8px (UPPERCASE) | Buttons, badges, utility topbar text |
| `caption` | 12px (0.75rem) | Regular (400) | 16px (1.33) | 0.4px | Disclaimers, copyright, microcopy |

---

## 3. Shapes, Elevation & Spacing

### Shapes
- **Buttons:** Square corners (`border-radius: 0px`).
- **Cards:** Maximum 8px radius (`border-radius: 8px`).
- **Search Inputs:** Pill-shaped (`border-radius: 9999px`) for the global storefront header search.
- **Form Inputs:** Clean square or subtle 4px radius with 1px `#E5E7EB` borders.

### Elevation & Flat Depth
In accordance with the ASOS system specification, the UI is **intentionally flat**:
- Zero drop-shadows or floating blurs on cards or navigation headers.
- Separation is established purely through **1px border lines (`#E5E7EB`)**, **contrast bands (white / charcoal / navy)**, and **proportional whitespace**.

### Spacing Scale
- `space-xs`: 6px
- `space-sm`: 16px
- `space-md`: 24px
- `space-lg`: 32px
- `space-xl`: 70px (Section spacing)

---

## 4. Reusable Component Specifications

### 4.1 Buttons
- **`button-primary`**:
  - Background: `#051A6E` (Navy)
  - Color: `#FFFFFF`
  - Font: `label-sm` (12px, 600 weight, uppercase, letter-spacing 0.8px)
  - Border-radius: `0px` (square corners)
  - Height: `44px`
  - Hover: Background `#041457`
- **`button-secondary`**:
  - Background: `#FFFFFF`
  - Color: `#000000`
  - Border: `1px solid #000000` or `#2D2D2D`
  - Font: `label-sm`
  - Border-radius: `0px`
  - Height: `44px`
  - Hover: Background `#2D2D2D`, text `#FFFFFF`
- **`button-link`**:
  - Transparent background, dark text, subtle underline on hover.

### 4.2 Global Header Structure
1. **Utility Bar:** Full-width `#2D2D2D` (Charcoal), 36px height, compact 12px uppercase white text. Features delivery information, currency selector, and help/orders shortcuts.
2. **Main Navigation:** Full-width `#FFFFFF` with 1px `#E5E7EB` bottom border. Features bold LOOMERA wordmark, primary category navigation (MEN, BOYS, NEW ARRIVALS, COLLECTIONS, GUIDES), a central pill-shaped 44px search bar, and clean line icons for Account, Wishlist, and Shopping Bag with live badges.
3. **Promotional Banner:** Full-width `#051A6E` (Navy) or `#2D2D2D` (Charcoal) with bold uppercase message and sharp action link.

### 4.3 Product Card
- Dimensions: Responsive 4-column layout on desktop, 2-column on mobile.
- Image Aspect Ratio: 3:4 portrait or square, flat 8px border-radius, clean `#E5E7EB` outline.
- Quick Add: 44px square overlay button that appears on hover/focus, instantly adding garment to cart with animated confirmation check.
- Interactive Color Swatches: Direct swatch circles with 2px active ring.
- Price Display: Bold true black price with strike-through original price for sale items.
