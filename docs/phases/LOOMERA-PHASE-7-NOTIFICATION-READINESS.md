# LOOMERA — TRANSACTIONAL NOTIFICATION & EMAIL READINESS

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Service:** Concierge Transactional Dispatch (`src/lib/notifications/email.ts`)  
**Visual Aesthetic:** Minimalist Bespoke Atelier (`#264653` Deep Teal, `#2A9D8F` Persian Green, Playfair Display)  

---

## 1. Notification Architecture & Lifecycle

Transactional emails inform patrons of critical status changes throughout their purchasing journey. The notification engine is designed for resilience, supporting live external dispatch via Resend API (or SMTP) while providing automated fallback to local structured audit logging in non-production environments.

```
                   [ Order / Payment / Dispatch Event ]
                                    │
                                    ▼
                     sendTransactionalEmail(payload)
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [ NODE_ENV === "test" ]           [ Production / Live Key ]
                  │                                   │
                  ▼                                   ▼
         Safe Internal Logger                 Resend REST API
         (Zero External Egress)               - HTTPS POST /emails
         Returns: development_logger          - DKIM / SPF Signed
                                              - Returns: external_provider
```

---

## 2. Event Types & Atelier Content Matrix

| Event Type | Subject Line | Trigger Point | Content Highlight |
|---|---|---|---|
| `ORDER_CONFIRMATION` | `[LOOMERA] ORDER CONFIRMATION: #ORD-...` | Checkout completed & payment verified | Full itemized bill, fabric shades, delivery destination, insured transit notice. |
| `PAYMENT_CONFIRMATION`| `[LOOMERA] PAYMENT CONFIRMATION: #ORD-...` | Razorpay payment successfully captured | Formal monetary receipt in INR, confirmation of atelier queue entry. |
| `PAYMENT_FAILED` | `[LOOMERA] PAYMENT FAILED: #ORD-...` | Gateway declines payment or card error | Courteous notice of failure; informs patron of 15-minute stock hold. |
| `ORDER_SHIPPED` | `[LOOMERA] ORDER SHIPPED: #ORD-...` | Admin marks order as DISPATCHED | Carrier details, tracking link, estimated delivery date. |
| `DELIVERY_CONFIRMATION`| `[LOOMERA] DELIVERY CONFIRMATION: #ORD-...`| Carrier delivers package | Delivery greeting, customer care contact, care advice for handloom fabrics. |
| `ORDER_CANCELLED` | `[LOOMERA] ORDER CANCELLED: #ORD-...` | Patron or Admin cancels unfulfilled order| Cancellation reason and confirmation of full refund initiation. |
| `REFUND_STATUS` | `[LOOMERA] REFUND STATUS: #ORD-...` | Admin processes refund via Razorpay | Refund amount in INR, expected banking turnaround (5–7 business days). |

---

## 3. Email Template Design Principles

1. **Responsive Table Architecture:** Standard fluid table layout (600px desktop max-width, 100% mobile fluid) guaranteeing identical rendering across Apple Mail, Gmail, Outlook, and mobile clients.
2. **Typography & Styling:**
   - Header: Playfair Display / Georgia serif brand wordmark in Deep Ocean (`#264653`).
   - Accent Subheadings: Persian Green (`#2A9D8F`).
   - Body Copy: Neutral Charcoal (`#474741`) with 1.6 line height for legibility.
   - Background: Warm Alabaster (`#F8F7F4`) matching the LOOMERA digital atelier palette.
3. **Transactional Safeguards:**
   - Every email contains order reference number, full itemized breakdown, and patron name.
   - Strictly plain text + inline HTML CSS with zero external javascript or trackers.

---

## 4. Production Domain Verification Protocol (DNS)

Prior to live production email dispatch, the sending domain (`loomera.com`) must configure the following records in Cloudflare DNS:

1. **DKIM (DomainKeys Identified Mail):**
   - Type: `CNAME` / `TXT` (Provided by Resend / SES)
   - Function: Cryptographically signs emails to verify they were sent by LOOMERA.
2. **SPF (Sender Policy Framework):**
   - Type: `TXT`
   - Content: `v=spf1 include:resend.com ~all`
   - Function: Authorizes mail servers to transmit on behalf of `loomera.com`.
3. **DMARC (Domain-based Message Authentication, Reporting & Conformance):**
   - Type: `TXT`
   - Host: `_dmarc.loomera.com`
   - Content: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@loomera.com`
   - Function: Enforces strict rejection of spoofed messages attempting to impersonate LOOMERA.

---
*End of Notification Readiness Specification.*
