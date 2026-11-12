# LOOMERA — PHASE 9 CONTROLLED A/B EXPERIMENTATION ENGINE
## Deterministic Hash Bucketing, Zero-Flicker Architecture, Conversion Attribution & Statistical Governance

**Author:** Chief Technology Officer & Conversion Rate Optimization Specialist  
**Date:** November 2026  
**Status:** Implemented & Verified  

---

### 1. THE NEED FOR DETERMINISTIC EXPERIMENTATION

In luxury fashion e-commerce, design and copy decisions cannot rely on intuition alone. However, traditional third-party client-side experimentation tools (such as Optimizely or Google Optimize) suffer from severe flaws:
- **Layout Shift / Visual Flicker:** As asynchronous scripts inject DOM modifications after initial render, Cumulative Layout Shift (CLS) degrades Google Core Web Vitals.
- **Third-Party Surveillance:** External testing scripts harvest user browsing habits without consent.
- **Flaky Inconsistency:** Visitors clearing cookies or hopping pages get reassigned back and forth between different variants, ruining the customer experience.

LOOMERA Phase 9 introduces a **First-Party, Zero-Flicker Deterministic Experimentation Engine**.

---

### 2. DETERMINISTIC HASH BUCKETING PROTOCOL

Variant assignment is strictly mathematical and deterministic using a cryptographic hash:

$$\text{Hash} = \text{SHA-256}(\text{visitorId} + \text{":"} + \text{experimentId})$$
$$\text{Bucket Integer} = \text{parseInt}(\text{Hash}[0..8], 16) \pmod{100}$$

```
                Anonymous Visitor ID (e.g. v_4f9a3e21...)
                                    │
                                    ▼
                + Experiment ID (e.g. "exp_hero_cta")
                                    │
                                    ▼
                          [ SHA-256 Digest ]
                                    │
                                    ▼
                         [ Hex Modulo 100 ]
                           Bucket: 0 to 99
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
   [ Bucket < 50 ]                                       [ Bucket ≥ 50 ]
  Variant: "control"                                  Variant: "variant_a"
 (Explore The Collection)                            (Shop Artisanal Linen)
```

#### Key Architectural Properties:
1. **Zero Flicker:** The same visitor identifier produces the exact same variant every single visit across weeks or months.
2. **Statistically Uniform:** SHA-256 distributes millions of visitor IDs uniformly with near-perfect 50/50 division.
3. **Traffic Allocation Control:** The `traffic_allocation_percent` parameter allows gradual rollouts (e.g., test on 10% of traffic before scaling to 100%).

---

### 3. ACTIVE BASELINE PRODUCTION EXPERIMENTS

LOOMERA Phase 9 seeded two foundational conversion experiments in table `experiments`:

| Experiment ID | Hypothesis | Control Variant | Test Variant | Target Conversion Metric |
| :--- | :--- | :--- | :--- | :--- |
| **`exp_hero_cta`** | Specific fabric copy ("Shop Artisanal Linen") outperforms generic editorial copy ("Explore Collection"). | "Explore Collection" | "Shop Artisanal Linen" | Homepage $\to$ PDP Click-Through Rate |
| **`exp_pdp_urgency`** | Displaying micro-batch stock scarcity ("Only 2 left in size") reduces hesitation and drives cart additions. | Static Stock Display | Pulsing Scarcity Badge | Add-to-Cart \& Checkout Completion Rate |

---

### 4. DATA MODEL & SCHEMA

#### 1. Experiments Master Table (`experiments`)
- `id`: Unique slug identifier (e.g., `exp_hero_cta`).
- `name`, `description`: Human-readable context and hypothesis.
- `variants`: JSONB array of variant keys (e.g., `["control", "variant_a"]`).
- `traffic_allocation_percent`: Percentage of traffic exposed to experiment (default 100%).
- `is_active`: Operational toggle.
- `starts_at`, `ends_at`: Automated flight schedule.

#### 2. Experiment Assignments Table (`experiment_assignments`)
- `experiment_id`: Foreign key referencing `experiments(id)`.
- `visitor_id`: Anonymous client identifier.
- `user_id`: Optional authenticated customer ID.
- `variant`: The assigned variant string.
- `assigned_at`: Timestamp of initial assignment.
- Unique constraint: `(experiment_id, visitor_id)` guarantees idempotency.

---

### 5. CONVERSION ATTRIBUTION & STATISTICAL ANALYSIS (`/api/experiments/[id]?mode=report`)

Conversions are tracked by cross-referencing assigned `user_id` values with finalized records in PostgreSQL table `orders`:
$$\text{Variant Conversion Rate} = \frac{\text{Orders Placed by Assigned Users}}{\text{Unique Assigned Visitors}} \times 100$$
$$\text{Variant Revenue per Visitor (RPV)} = \frac{\text{Total Attributed Order Revenue INR}}{\text{Unique Assigned Visitors}}$$

Administrators inspect live experiment metrics through the reporting endpoint, enabling data-driven feature promotion or retirement without code churn.
