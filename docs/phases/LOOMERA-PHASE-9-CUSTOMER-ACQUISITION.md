# LOOMERA — PHASE 9 CUSTOMER ACQUISITION SYSTEM
## Architecture, Attribution Engine, Campaign Routing & Growth Economics

**Author:** Principal Growth Architect & Digital Marketing Engineer  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. ARCHITECTURAL OVERVIEW

Customer acquisition in luxury menswear requires a delicate balance between **high-intent discovery** and **brand elevation**. Aggressive popups or generic tracking pixels undermine the artisanal pedigree of LOOMERA.

Phase 9 introduces a **First-Party, Privacy-Centric Acquisition & Attribution Infrastructure**:
1. **Universal UTM Tracking:** Seamlessly captures incoming `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, and referrer domains.
2. **Persistent Attribution Store:** Preserves marketing touchpoints across anonymous sessions via `localStorage` and lightweight 30-day first-party cookies (`lmr_attr`).
3. **Automated Order Linkage:** Links acquisition data to finalized PostgreSQL `orders` at checkout creation without requiring third-party marketing tags.
4. **Dynamic Campaign Landing Hubs:** Dedicated routes (`/campaign/[code]`) offering customized editorial storytelling, pre-applied vouchers, and curated collections.
5. **Post-Purchase Referral Flywheel:** Direct incentive mechanisms ("Give ₹500, Get ₹500") transforming satisfied patrons into brand advocates.

---

### 2. ACQUISITION CHANNEL TAXONOMY

LOOMERA categorizes all traffic into six distinct commercial channels based on incoming UTM parameters and HTTP Referer headers:

```
                          Incoming Web Traffic
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
     [ Paid Media ]          [ Organic Search ]      [ Social Discovery ]
  - Google Ads (CPC)      - Google / Bing / Ecosia  - Instagram / Pinterest
  - Meta Ads (Paid)       - Unbranded SEO queries   - Editorial Stories
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   [ Direct / Known ]                             [ Referral & Affiliates ]
  - Direct URL typing                             - Patron Referral Links
  - Saved Bookmarks                               - Partner Publications
```

| Acquisition Channel | Classification Rules | Attribution Window | Primary Commercial Objective |
| :--- | :--- | :--- | :--- |
| **Paid Advertising** | `utm_medium` in `['cpc', 'ppc', 'paid']` or source contains `googleads`/`meta_ads` | 30 days (Last-Touch) | Scalable customer acquisition, new customer volume. |
| **Organic Search** | Referrer domain from search engine (`google.*`, `bing.*`, etc.) or `utm_medium='organic'` | 30 days (First-Touch) | High-margin discovery, luxury fabric education. |
| **Social Media** | Referrer from `instagram.com`, `facebook.com`, `pinterest.com`, `t.co`, etc. | 14 days (Last-Touch) | Visual brand discovery, styling inspiration. |
| **Referral** | Referrer from third-party sites or `utm_source='referral'` / `ref=LMR-*` | 30 days (Multi-Touch) | Viral loop expansion, low CAC customer acquisition. |
| **Email Campaigns** | `utm_medium='email'` or source contains `newsletter`/`mail` | 7 days (Last-Touch) | Re-engagement, seasonal lookbook conversion. |
| **Direct Visits** | No referrer header, direct navigation or internal bookmarks | Session | Brand loyalist replenishment, organic awareness. |

---

### 3. ATTRIBUTION DATA PIPELINE

#### A. Client-Side Capture (`attribution-client.ts` & `AttributionTracker.tsx`)
On initial page load, `AttributionTracker` mounts in Next.js `layout.tsx` and executes non-blocking parameter parsing:
- Extracts `utm_*` and `ref` parameters from `window.location.search`.
- Inspects `document.referrer`.
- Generates or re-hydrates a persistent anonymous `visitorId` (e.g. `v_4f9a3e21...`).
- Generates or refreshes a 30-minute session `sessionId` (e.g. `s_8b21c4...`).
- Stores sanitized parameters in `localStorage` under key `lmr_attribution_v1`.
- Sets an encrypted/encoded HTTP-friendly cookie `lmr_attr` with a 30-day lifetime.

#### B. Server-Side Linkage (`/api/checkout/session/route.ts`)
When a customer clicks "Place Order" or confirms their delivery address:
1. `CheckoutClient` retrieves the stored attribution object.
2. The payload is submitted to `POST /api/checkout/session`.
3. The server records the complete touchpoint in table `campaign_attributions`:
   - `order_id`: UUID of the newly initiated order.
   - `session_id`, `visitor_id`, `user_id`: Customer identity graph.
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`.
   - `referrer_url` and `landing_page`.

```sql
INSERT INTO campaign_attributions (
    order_id, session_id, visitor_id, user_id,
    utm_source, utm_medium, utm_campaign, referrer_url, landing_page
) VALUES (
    'e94bc172-...', 's_8b21c4...', 'v_4f9a3e21...', '3bb209...',
    'instagram', 'social', 'festive_2026', 'https://instagram.com/', '/campaign/FESTIVE2026'
);
```

---

### 4. DYNAMIC CAMPAIGN LANDING PAGES (`/campaign/[code]`)

To maximize conversion from paid and social acquisition campaigns, LOOMERA routes inbound marketing traffic to specialized dynamic landing pages rather than a generic homepage.

#### Key Landing Page Capabilities:
- **Campaign Lookup:** Automatically matches the URL parameter (`code`) against `marketing_campaigns` in PostgreSQL.
- **Editorial Hero Banner:** Displays campaign headline, bespoke copy, and luxury visual background.
- **Voucher Auto-Apply Pill:** Renders the campaign's voucher code with one-click copy and auto-apply capability.
- **Curated Catalog Grid:** Filters garments relevant to the flight (e.g., Silk kurtas for Festive season, Linen shirts for Summer Resort).
- **Trust Reassurance Strip:** Highlights 100% natural certified fibres, 15-day return privileges, and loyalty accrual.

---

### 5. PRIVACY, CONSENT & SECURITY COMPLIANCE

1. **Zero Third-Party Data Leakage:**
   - No Google Tag Manager, Meta Pixel, or TikTok tracking SDKs are loaded.
   - User browsing habits and PII are never shared with external ad networks.
2. **Deterministic String Sanitization:**
   - All UTM parameters are rigorously sanitized via regex `[^\w\s\-.,_/:?=&]` to prevent Cross-Site Scripting (XSS), parameter pollution, or SQL injection.
3. **No Excessive Personal Data:**
   - Attribution logs only store anonymous session/visitor tokens, marketing parameters, and timestamped URLs. No credit card or sensitive PII is ever written to attribution tables.
4. **Idempotency & Integrity:**
   - Unique database indexes on `(order_id, session_id)` ensure attribution events cannot be double-counted or inflated.
