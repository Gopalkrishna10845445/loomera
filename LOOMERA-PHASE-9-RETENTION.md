# LOOMERA — PHASE 9 CUSTOMER RETENTION & LOYALTY ARCHITECTURE
## RFM Behavioral Segmentation, Tiered Atelier Privileges, Re-engagement Workflows & LTV Maximization

**Author:** Retention Strategist & Business Intelligence Engineer  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. STRATEGIC PURPOSE

Acquiring a luxury patron is an intensive investment. In premium menswear, sustainable profitability depends almost entirely on **repeat patronage** and **lifetime value expansion**. A gentleman who purchases an initial unbleached linen shirt should naturally transition to bespoke kurtas, tailored trousers, and seasonal silk waistcoats over a multi-year wardrobe relationship.

Phase 9 implements an algorithmic **RFM (Recency, Frequency, Monetary) Segmentation Engine** that unifies purchase histories, loyalty accrual, and re-engagement incentives.

---

### 2. RFM COHORT TAXONOMY & BUSINESS RULES

Patrons are classified into 5 distinct behavioral cohorts directly via PostgreSQL queries:

```
                               Registered Patrons
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
  [ VIP Connoisseurs ]       [ Loyal Repeat Patrons ]      [ First-Time Patrons ]
  • Spend ≥ ₹15,000          • Frequency ≥ 2 orders        • Frequency = 1 order
  • Frequency ≥ 3 orders     • Recency ≤ 90 days           • Recency ≤ 60 days
  • Platinum / Atelier Tier  • Predictable replenishment   • Onboarding critical
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
  [ At-Risk / Lapsed ]                                       [ New Prospects ]
  • Frequency ≥ 1 order                                      • Frequency = 0 orders
  • Inactive > 90 days                                       • Account registered
  • Churn prevention trigger                                 • First order incentive
```

| RFM Cohort | Criteria | Current Action & Incentive | Retention Objective |
| :--- | :--- | :--- | :--- |
| **VIP Connoisseur** | Spend $\ge$ ₹15,000 OR Freq $\ge 3$ OR Tier = Platinum | Private Salon early-access, dedicated atelier concierge | Wardrobe consolidation, bespoke commissions |
| **Loyal Repeat** | Freq $\ge 2$ AND Recency $\le 90$ days | 1.5x bonus points on linen, complimentary express shipping | Maximize annual purchase frequency |
| **First-Time Patron** | Freq $= 1$ AND Recency $\le 60$ days | Post-purchase garment care guide, ₹500 referral invitation | Accelerate 2nd purchase within 60 days |
| **At-Risk Lapsed** | Freq $\ge 1$ AND Recency $> 90$ days | Curated lookbook email with voucher `RECONNECT15` | Re-activate dormant patron before permanent churn |
| **New Prospect** | Freq $= 0$ (Registered user) | Welcome voucher `WELCOME10` on initial order | Lower first-order barrier to entry |

---

### 3. INTEGRATION WITH THE LOYALTY & REFERRAL LEDGER

The RFM segmentation engine works directly with LOOMERA's existing loyalty infrastructure (`loyalty_accounts` and `loyalty_transactions`):

1. **Tiered Point Multipliers:**
   - **Silver:** 1x points per ₹1 spent.
   - **Gold:** 1.5x points per ₹1 spent.
   - **Platinum:** 2x points per ₹1 spent.
   - **Atelier Privilege:** 2.5x points + private bespoke invitations.
2. **Referral Flywheel Mechanics:**
   - Every registered patron possesses a unique referral code (e.g. `LMR-ARJU3327`).
   - The recipient enjoys ₹500 off their first tailoring order.
   - The advocate receives 500 loyalty credits (₹500 value) upon order delivery confirmation.
3. **Automated RFM Intelligence API (`/api/admin/customers/rfm`):**
   - Provides administrators with cohort distributions, revenue contributions, average order values, and individualized recommended retention plays.

---

### 4. RETENTION UNIT ECONOMICS & COHORT METRICS

$$\text{Repeat Purchase Rate} = \frac{\text{Returning Customers with } \ge 2 \text{ Orders}}{\text{Total Paying Customers}} \times 100$$
$$\text{Customer Lifetime Value (LTV)} = \text{Average Order Value} \times \text{Average Purchase Frequency} \times \text{Customer Lifespan}$$

By proactively identifying **At-Risk Lapsed** patrons at day 91 and delivering personalized re-engagement incentives, LOOMERA preserves customer retention without eroding margins through indiscriminate site-wide discounting.
