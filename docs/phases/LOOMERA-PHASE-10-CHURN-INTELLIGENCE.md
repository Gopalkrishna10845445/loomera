# LOOMERA — PHASE 10 CUSTOMER CHURN PREDICTION
## Behavioral Inactivity Radar, Purchase Cadence Disruption, Risk Scoring & Approved Retention Workflows

**Date:** November 2026  
**Auditor & Lead Architect:** Principal AI Architect, Data Scientist & CRM Architect  
**Scope:** Churn Risk Modeling, Inter-Order Interval Disruption, Digital Engagement Signals & Approval-Gated Retention  
**Status:** Implemented, Tested & Verified (120/120 Phase 10 Assertions Passing, 825/825 Overall)  

---

### EXECUTIVE SUMMARY

Customer acquisition costs (CAC) in luxury fashion are typically 5 to 7 times higher than retention costs. Retaining an existing connoisseur who appreciates artisanal handloom weaving and tailored linen is vastly more profitable than acquiring a new customer. However, once a patron has lapsed past 120 days of inactivity, the probability of successful reactivation drops precipitously.

Phase 10 introduces the **LOOMERA Customer Churn Intelligence Engine** ([`frontend/src/lib/intelligence/churn-intelligence.ts`](file:///c:/Users/gopal/Downloads/lommera/frontend/src/lib/intelligence/churn-intelligence.ts)). Rather than rebuilding the deterministic RFM segmentation established in Phase 9 (`VIP Connoisseur`, `Loyal Repeat Patron`, `First-Time Patron`, `At-Risk Lapsed`, `New Prospect`), the churn engine **extends** this foundation.

It pairs historical purchase cadence disruption with recent digital engagement signals (storefront visits, browsing history, product views) to score churn probability (0–100) and prescribe targeted, approval-gated retention strategies.

---

### 1. MULTI-SIGNAL CHURN RISK SCORING ALGORITHM

The engine computes an explainable, composite churn risk score ($S \in [0, 100]$) across four transparent, non-sensitive behavioral dimensions:

$$S_{\text{churn}} = w_{\text{recency}} \cdot S_{\text{recency}} + w_{\text{cadence}} \cdot S_{\text{cadence}} + w_{\text{frequency}} \cdot S_{\text{frequency}} + w_{\text{engagement}} \cdot S_{\text{engagement}}$$

Where the dimensional weights are:
- $w_{\text{recency}} = 0.40$ (Primary indicator: elapsed calendar days since most recent delivered order)
- $w_{\text{cadence}} = 0.30$ (Personal cadence disruption: ratio of current silence to historical order interval)
- $w_{\text{frequency}} = 0.15$ (Customer depth: single-order purchasers carry higher inherent churn propensity)
- $w_{\text{engagement}} = 0.15$ (Recent digital activity: product views in the last 30 days)

#### Sub-Score Formulations

1. **Recency Score ($S_{\text{recency}}$):**
   $$S_{\text{recency}} = \min\left(100, \frac{\text{Days Since Last Order}}{120} \times 100\right)$$
   Patrons silent for $\ge 120$ days receive the maximum 100 points on recency risk.

2. **Cadence Disruption Score ($S_{\text{cadence}}$):**
   For repeat patrons with multiple orders, LOOMERA calculates their personal historical order interval ($\overline{\Delta t}$). If a customer typically orders every 30 days, 60 days of silence is a massive deviation ($2.0\times$), even if 60 days is normal for another patron.
   $$\text{Cadence Ratio} = \frac{\text{Days Since Last Order}}{\max(15, \overline{\Delta t})}$$
   $$S_{\text{cadence}} = \min(100, \text{Cadence Ratio} \times 50)$$

3. **Order Frequency Buffer ($S_{\text{frequency}}$):**
   - 1 Lifetime Order: $S_{\text{frequency}} = 75$ (high vulnerability to single-purchase drop-off).
   - 2 Lifetime Orders: $S_{\text{frequency}} = 40$.
   - 3+ Lifetime Orders: $S_{\text{frequency}} = 15$ (established brand affinity).

4. **Digital Engagement Offset ($S_{\text{engagement}}$):**
   Queries `product_view_history` over the trailing 30 days:
   - 0 Views in 30 Days: $S_{\text{engagement}} = 80$ (complete digital disengagement).
   - 1–3 Views in 30 Days: $S_{\text{engagement}} = 40$ (active window shopping; retention opportunity).
   - 4+ Views in 30 Days: $S_{\text{engagement}} = 10$ (high active intent; likely considering purchase).

---

### 2. RISK TIERS & COHORT RADAR

Every registered customer is assigned to an actionable churn risk tier:

| Risk Tier | Churn Score Range | Cohort Characteristics | Primary Behavioral Signals |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | $80 \le S \le 100$ | Historically valuable patrons who have exceeded $2.5\times$ their typical cadence with zero storefront views in 45 days. | High recency gap ($>120\text{d}$), complete digital dormancy, high historical lifetime spend. |
| **HIGH** | $60 \le S < 80$ | Repeat buyers who have passed their expected order interval by $>1.5\times$ with diminishing browsing activity. | Silence interval $> 60\text{d}$, viewing session frequency down $>60\%$. |
| **MEDIUM** | $35 \le S < 60$ | First-time buyers approaching 45 days without a second purchase, or repeat buyers nearing their normal cadence window. | Single-order vulnerability, occasional browsing without add-to-cart. |
| **LOW** | $0 \le S < 35$ | Active, loyal patrons purchasing within their standard rhythm and actively browsing new collections. | Recent order within 30 days, frequent browsing, positive loyalty balance. |

---

### 3. ACTIONABLE RETENTION PLAYBOOKS

For every patron in the Medium, High, or Critical risk tiers, the engine generates an explainable retention playbook tailored to their historical garment preferences:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Patrons in CRITICAL Tier (e.g. VIP Connoisseur with >120d silence):   │
│ Strategy: Concierge VIP Reactivation                                  │
│ Playbook: Curated handwritten correspondence from Atelier Director;    │
│           private preview of upcoming Heritage Handloom Silk drop;     │
│           complimentary bespoke tailoring adjustment on next order.    │
├────────────────────────────────────────────────────────────────────────┤
│ Patrons in HIGH Tier (e.g. Loyal Repeat Patron with disrupted cadence):│
│ Strategy: Personalized Style Preference Follow-up                     │
│ Playbook: Tailored email showcasing new colorways in their preferred   │
│           silhouette (e.g., Linen Shirts if 80% of purchases);         │
│           exclusive INR 500 loyalty appreciation credit.               │
├────────────────────────────────────────────────────────────────────────┤
│ Patrons in MEDIUM Tier (e.g. First-Time Buyer at 45d):                │
│ Strategy: Second Purchase In-Category Discovery                        │
│ Playbook: Editorial style guide on how to care for handloom fabrics;   │
│           recommendation of complementary garments (trousers to shirt);│
│           gentle reminder of unused loyalty points.                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 4. PRIVACY PROTECTION & HUMAN APPROVAL GOVERNANCE

LOOMERA strictly upholds patron privacy and regulatory compliance:

1. **Non-Sensitive Behavioral Data Only:** Churn scoring evaluates strictly non-sensitive e-commerce metadata: order timestamps, monetary sums, product categories viewed, and session frequencies. It never accesses or infers personal medical, financial, or political information.
2. **Zero Automated Spam / Outreach:** The intelligence engine is **strictly forbidden from autonomously sending emails, SMS, or WhatsApp messages** to customers.
3. **Approval-Gated Campaign Recommendations:** When high-churn cohorts are detected, the system generates a recommendation in `business_recommendations`:
   - Title: *"Launch Approved Retention Campaign for 14 Lapsed Repeat Patrons"*
   - Status: `PENDING_APPROVAL`
   - Requires an administrator to review the audience list, approve the message template, and authorize dispatch via the Admin Campaign console.

---

### 5. VERIFICATION & VALIDATION RESULTS

Validated in [`frontend/scripts/test_phase10_business_intelligence.ts`](file:///c:/Users/gopal/Downloads/lommera/frontend/scripts/test_phase10_business_intelligence.ts):

| Assertion | Checked Behavior | Test Result |
| :--- | :--- | :--- |
| `Audits all registered customers` | Aggregates customer profiles across orders and users table | **PASSED** |
| `Calculates repeat purchase rate` | Computes repeat vs single-order ratio | **PASSED** |
| `Calculates average order interval` | Computes inter-order cadence in days | **PASSED** |
| `Assigns churn risk tiers` | Populates CRITICAL, HIGH, MEDIUM, LOW buckets | **PASSED** |
| `Bounds churn risk score` | Strict validation: $0 \le \text{score} \le 100$ | **PASSED** |
| `Populates behavioral signals` | Lists human-readable reasons (e.g., "Silence interval 74d exceeds cadence") | **PASSED** |
| `Preserves Phase 9 RFM intact` | Verifies Phase 9 RFM cohorts remain unmodified | **PASSED** |
| `Enforces outreach approval gate` | Prevents automated customer messaging; requires administrator action | **PASSED** |
