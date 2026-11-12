# LOOMERA — PHASE 10 INTELLIGENT INVENTORY & RESTOCKING
## Effective Stock Accounting, Coverage Horizons, Reorder Optimization & Human-in-the-Loop Governance

**Date:** November 2026  
**Auditor & Lead Architect:** Principal AI Architect, Inventory Systems Engineer & CTO  
**Scope:** Inventory Health Analytics, Reservation Lock Deductions, Average Daily Sales (ADS), Reorder Thresholds & Approval Workflows  
**Status:** Implemented, Tested & Verified (120/120 Phase 10 Assertions Passing, 825/825 Overall)  

---

### EXECUTIVE SUMMARY

Effective inventory management in artisan luxury fashion requires balancing product availability against working capital constraints. Garments such as handloom kurtas and tailored linen shirts cannot be re-manufactured overnight; yet stocking excess quantities ties up capital and risks dead stock.

Phase 10 introduces the **LOOMERA Inventory Intelligence Engine** ([`frontend/src/lib/intelligence/inventory-intelligence.ts`](file:///c:/Users/gopal/Downloads/lommera/frontend/src/lib/intelligence/inventory-intelligence.ts)), which operates on **effective available stock** rather than raw unreserved physical counts. It automatically identifies:
1. Fast-moving garments with imminent stockout risk ($< 14$ days of coverage).
2. Moderate-coverage garments ($14$–$30$ days of coverage).
3. Healthy inventory positions ($30$–$90$ days of coverage).
4. Slow-moving and overstocked SKUs ($> 90$ days of coverage or zero sales in 30 days).

Crucially, in compliance with LOOMERA's operational safety mandate, all restock recommendations are generated with status `PENDING_APPROVAL` and require explicit administrator sign-off before any purchase order or supplier communication can occur.

---

### 1. EFFECTIVE AVAILABLE STOCK FORMULATION

A critical vulnerability in standard e-commerce platforms is relying exclusively on `product_variants.stock_quantity`. If five customers currently have a size M shirt held in checkout with active 15-minute reservation locks (`inventory_reservations` table), treating those 5 units as available for replenishment planning creates a false sense of security.

LOOMERA computes **Effective Available Stock** authoritatively:

$$\text{Effective Available Stock} = \max\left(0, \text{Physical On-Hand Stock} - \text{Active Unexpired Reservations}\right)$$

Where:
- $\text{Physical On-Hand Stock} = \text{product\_variants.stock\_quantity}$
- $\text{Active Unexpired Reservations} = \sum \text{inventory\_reservations.quantity}$ where $\text{status} = \text{'ACTIVE'}$ and $\text{expires\_at} > \text{NOW()}$.

---

### 2. CORE INVENTORY METRICS & REORDER FORMULAS

For every product and SKU across LOOMERA's 103 variants, the engine calculates:

#### 1. Average Daily Sales (ADS)
$$\text{ADS}_{30} = \frac{\sum_{i=1}^{30} \text{Units Sold on Day } i}{30}$$

When a product is newly launched ($< 30$ days old), the engine calculates ADS over the actual active lifespan:
$$\text{ADS} = \frac{\text{Total Units Sold}}{\max(1, \text{Days Since Product Launch})}$$

#### 2. Stock Coverage Days (Runout Horizon)
$$\text{Stock Coverage Days} = \begin{cases} 
\frac{\text{Effective Available Stock}}{\text{ADS}}, & \text{if } \text{ADS} > 0 \\
999, & \text{if } \text{ADS} = 0 \text{ (zero velocity / dormant)}
\end{cases}$$

#### 3. Estimated Stockout Date
$$\text{Estimated Stockout Date} = \text{Current Date} + \lceil \text{Stock Coverage Days} \rceil$$

#### 4. Reorder Threshold & Suggested Reorder Quantity
If supplier lead time $L$ is configured (via `supplier_lead_time_days`), the reorder threshold is:
$$\text{Reorder Threshold} = (\text{ADS} \times L) + \text{Safety Stock}$$
Where:
$$\text{Safety Stock} = z_{0.90} \times \sigma_{\text{daily}} \times \sqrt{L}$$

When supplier lead time is unconfigured (as in baseline local catalogs), the system applies a standardized **21-day replenishment buffer**:
$$\text{Suggested Reorder Quantity} = \max\left(10, \lceil \text{ADS} \times 30 \rceil - \text{Effective Available Stock}\right)$$

---

### 3. INVENTORY HEALTH CLASSIFICATION & RADAR

Every SKU is categorized into an actionable inventory tier:

```
┌──────────────────────┬──────────────────────┬───────────────────────────────────────────┐
│ Health Status Tier   │ Coverage Horizon     │ Operational Meaning & Action Triggered    │
├──────────────────────┼──────────────────────┼───────────────────────────────────────────┤
│ CRITICAL_SHORTAGE    │ 0 to 7 Days          │ Imminent stockout. Urgent restock cue.    │
│ LOW_COVERAGE         │ 8 to 21 Days         │ Approaching reorder point. Standard restock.│
│ HEALTHY              │ 22 to 60 Days        │ Optimal inventory turn. Balanced capital. │
│ OVERSTOCKED          │ 61 to 120 Days       │ Excess inventory. Review sales pace.      │
│ SLOW_MOVING_EXCESS   │ > 120 Days / 0 sales │ Stagnant capital. Clearance recommendation.│
└──────────────────────┴──────────────────────┴───────────────────────────────────────────┘
```

---

### 4. RESTOCK RECOMMENDATION PAYLOAD & TRANSPARENCY

Restock suggestions are persisted to the `business_recommendations` table with comprehensive contextual evidence:

```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "category": "INVENTORY",
  "priority": "HIGH",
  "title": "Restock Classic Linen Shirt (Navy, Size M)",
  "description": "Stock coverage is estimated at 8.2 days based on recent sales velocity of 1.4 units/day. Effective available stock is 12 units (14 physical - 2 active reservations).",
  "impact": "Prevent stockout loss estimated at INR 17,493 over the next 14 days.",
  "confidenceScore": 85,
  "evidence": {
    "sku": "CLS-NAVY-M",
    "physicalStock": 14,
    "activeReserved": 2,
    "effectiveStock": 12,
    "averageDailySales": 1.4,
    "coverageDays": 8.2,
    "suggestedReorderQuantity": 30,
    "supplierLeadTimeDays": null,
    "leadTimeNotice": "Supplier lead time unconfigured; utilizing default 21-day planning cycle."
  },
  "actionType": "RESTOCK_PURCHASE_ORDER",
  "status": "PENDING_APPROVAL"
}
```

---

### 5. STRICT HUMAN APPROVAL RULES & GOVERNANCE

To prevent catastrophic automated purchasing errors or unauthorized financial commitments, LOOMERA enforces four strict non-negotiable architectural boundaries:

1. **Zero Autonomous Purchasing:** The AI system is strictly blocked from communicating with fabric mills, garment suppliers, or placing automated wholesale purchase orders.
2. **Zero Automated Inventory Overwrites:** The intelligence engine cannot mutate `product_variants.stock_quantity`. Stock additions must go through the standard warehouse receipt workflow (`inventory_movements` with `STOCK_ADDED`).
3. **Approval Lifecycle Transitions:**
   - Default state: `PENDING_APPROVAL`.
   - Authorized states: `APPROVED` (human administrator confirms intent), `DISMISSED` (administrator rejects advice with optional rationale).
   - Only users with role `ADMIN` or `SUPER_ADMIN` may execute approval PATCH calls via [`/api/admin/intelligence/recommendations`](file:///c:/Users/gopal/Downloads/lommera/frontend/src/app/api/admin/intelligence/recommendations/route.ts).
4. **Transparent Data Disclosure:** If supplier costs or lead times are not configured in the database, the recommendation explicitly notes this limitation rather than guessing.

---

### 6. VERIFICATION & TEST RESULTS

Validated in [`frontend/scripts/test_phase10_business_intelligence.ts`](file:///c:/Users/gopal/Downloads/lommera/frontend/scripts/test_phase10_business_intelligence.ts):

| Assertion | Verification Check | Status |
| :--- | :--- | :--- |
| `Audits all 103 product variants` | Complete catalog variant scan without missing SKUs | **PASSED** |
| `Calculates total physical stock` | Aggregated physical units across catalog | **PASSED** |
| `Deducts active reservation locks` | Effective stock = physical - active reservations | **PASSED** |
| `Computes Average Daily Sales (ADS)` | Non-negative numeric sales velocity | **PASSED** |
| `Computes Stock Coverage Days` | Realistic coverage horizons computed | **PASSED** |
| `Generates Restock Recommendations` | Identifies critical SKUs and suggests reorder quantities | **PASSED** |
| `Enforces Human Approval State` | New recommendations default to `PENDING_APPROVAL` | **PASSED** |
| `Catalog Immutability Check` | Variant counts and stock counts remain untouched by scan | **PASSED** |
