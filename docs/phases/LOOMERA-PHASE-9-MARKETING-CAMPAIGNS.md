# LOOMERA — PHASE 9 MARKETING CAMPAIGNS & PROMOTIONS
## Scheduled Flights, Dynamic Discount Architecture, Administrative Management & Attribution ROI

**Author:** Chief Technology Officer & Digital Marketing Architect  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. STRATEGIC PURPOSE

Marketing campaigns for an artisanal luxury atelier must convey restraint, exclusivity, and curation. Conventional mass-market strategies (e.g., perpetual countdown timers, blinking discount badges) compromise customer trust and dilute perceived craftsmanship.

LOOMERA Phase 9 implements an **Editorial Campaign & Promotional System**:
1. **Scheduled Flight Windows:** Campaigns feature strictly bounded `starts_at` and `ends_at` timestamps, automatically activating and expiring without manual code changes.
2. **Multi-Format Promotion Engine:** Supports Percentage vouchers, Fixed INR discounts, Complimentary Express Shipping, and Tiered minimum-spend privileges.
3. **Dedicated Campaign Hubs (`/campaign/[code]`):** Inbound traffic from email or ad flights lands on tailored editorial showcases featuring curated silhouettes and pre-applied vouchers.
4. **Attribution Telemetry:** Connects campaign impressions, clicks, orders, and gross revenue into a unified ROI view.
5. **Administrative Governance:** Full CRUD operations protected by RBAC, CSRF validation, and immutable audit logs.

---

### 2. CAMPAIGN ARCHITECTURE & DATA MODEL

Anchor table `marketing_campaigns` in PostgreSQL:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Primary key (`gen_random_uuid()`) |
| `name` | `TEXT` | Internal campaign moniker (e.g., "Festive Silk Gala 2026") |
| `code` | `TEXT` (Unique) | Public voucher code (e.g., `FESTIVE2026`) |
| `headline` | `TEXT` | Editorial hero headline |
| `banner_text` | `TEXT` | Detailed promotional narrative |
| `cta_text` | `TEXT` | Primary action button label (e.g., "Explore Silk Kurtas") |
| `cta_link` | `TEXT` | Target landing destination (e.g., `/collections/handloom`) |
| `starts_at` | `TIMESTAMPTZ`| Automated flight commencement timestamp |
| `ends_at` | `TIMESTAMPTZ`| Automated flight expiration timestamp (nullable) |
| `is_active` | `BOOLEAN` | Global kill-switch toggle |
| `impressions`| `INTEGER` | Counter incremented on campaign view |
| `clicks` | `INTEGER` | Counter incremented on CTA interaction |

---

### 3. CAMPAIGN TAXONOMY & USE CASES

| Campaign Archetype | Target Audience | Primary Mechanism | Example Flight |
| :--- | :--- | :--- | :--- |
| **Seasonal / Festive** | Entire Patron Base | Scheduled start/end dates, curated seasonal silhouettes | Diwali & Wedding Gala (`FESTIVE2026`, 15% off silk) |
| **New Silhouette Arrival**| Engaged Browse Sessions | Micro-batch notification, complimentary express shipping | Summer Raw Linen Drop (`NEWLINEN`, Free Express) |
| **Private Member Preview**| Tiered VIPs (Gold/Platinum) | Exclusive unlisted vouchers, early access | Atelier Salon Private Edition (`ATELIERVIP`, ₹1,500 off) |
| **Cart Recovery** | Abandoned Bag Sessions | 24-hour cryptographic token recovery links | Return to Atelier (`WELCOMEBACK10`, 10% off cart) |
| **Patron Referral** | Existing Paying Customers | Post-checkout "Give ₹500, Get ₹500" reciprocal credits | Connoisseur Invitation (`LMR-ARJU3327`) |

---

### 4. ADMINISTRATIVE API ENDPOINTS

- `GET /api/admin/campaigns`:
  Lists all active, scheduled, and past campaigns with calculated Click-Through Rates (`ctrPercent`).
- `POST /api/admin/campaigns`:
  Creates a new scheduled marketing flight with full audit log tracking (`MARKETING_CAMPAIGN_CREATED`).
- `PATCH /api/admin/campaigns/[id]`:
  Updates campaign flight dates, active status, or promotional copy with audit logging (`MARKETING_CAMPAIGN_UPDATED`).
- `DELETE /api/admin/campaigns/[id]`:
  Safely purges or deactivates marketing campaign records (`MARKETING_CAMPAIGN_DELETED`).

---

### 5. INTEGRATION WITH REVENUE INTELLIGENCE

Campaign performance is directly joined with `campaign_attributions` and `orders` in the Business Analytics Engine:
$$\text{Campaign CTR} = \frac{\text{Total Clicks}}{\text{Total Impressions}} \times 100$$
$$\text{Campaign Conversion Rate} = \frac{\text{Attributed Orders}}{\text{Total Clicks}} \times 100$$
$$\text{Attributed ROAS} = \frac{\text{Attributed Gross Sales INR}}{\text{Attributed Campaign Ad Spend INR}}$$

All calculations run natively inside PostgreSQL, guaranteeing immediate consistency without third-party tracking latency.
