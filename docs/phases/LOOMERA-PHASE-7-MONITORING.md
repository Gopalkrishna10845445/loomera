# LOOMERA — PRODUCTION MONITORING, OBSERVABILITY & INCIDENT RUNBOOK

**Atelier:** LOOMERA Luxury Menswear & Young Gentleman's Tailoring  
**Service Health Probe:** `/api/health`  
**Telemetry Standard:** OpenTelemetry & Structured JSON Logging  
**Incident Severity Protocol:** SEV-1 (Critical Outage) to SEV-4 (Minor Cosmetic Anomaly)  

---

## 1. Observability Architecture & Telemetry Pipeline

High-reliability luxury e-commerce requires proactive visibility across every customer interaction, database query, payment webhook, and AI concierge request.

```
                  ┌─────────────────────────────────────────┐
                  │       Patron Browsing & Checkout        │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │           Next.js Application           │
                  │ - Structured JSON Logging               │
                  │ - Error Boundary Capture                │
                  │ - Performance Timing Middleware         │
                  └───────┬─────────────────────────┬───────┘
                          │                         │
                          ▼                         ▼
              ┌───────────────────────┐ ┌───────────────────────┐
              │ Health Probe Endpoint │ │ Error Tracking (Sentry│
              │     `/api/health`     │ │     / OpenTelemetry)  │
              │ - PostgreSQL Ping     │ │ - Unhandled Exceptions│
              │ - Memory & Uptime     │ │ - Context & Stacktrace│
              └───────────┬───────────┘ └───────────┬───────────┘
                          │                         │
                          ▼                         ▼
              ┌─────────────────────────────────────────┐
              │     Synthetic Monitoring & Alerting     │
              │   (Better Uptime / Cloudflare / Ops)    │
              │   - PagerDuty / Telegram / Slack Ops    │
              └─────────────────────────────────────────┘
```

---

## 2. Health Check & Readiness Endpoint (`/api/health`)

LOOMERA exposes a dedicated health probe at `/api/health` designed for synthetic uptime monitors, container orchestrators, and load balancer health checks.

### 2.1 Health Check Behavior
- **Database Probe:** Executes an active `SELECT 1` query to verify PostgreSQL connectivity and measures round-trip database latency in milliseconds.
- **Memory Diagnostics:** Reports Node.js runtime process metrics: `rssMb`, `heapUsedMb`, and `heapTotalMb`.
- **Uptime Tracking:** Reports cumulative uptime in seconds.
- **HTTP Status Codes:**
  - `200 OK`: Database connected and operational (`status: "healthy"`).
  - `503 Service Unavailable`: Database probe failed or connection pool exhausted (`status: "unhealthy"`).

### 2.2 Sample Health Probe Response
```json
{
  "status": "healthy",
  "timestamp": "2026-11-04T07:49:50.123Z",
  "uptimeSeconds": 3482,
  "environment": "production",
  "checks": {
    "database": {
      "status": "connected",
      "latencyMs": 8
    },
    "memory": {
      "rssMb": 84,
      "heapUsedMb": 42,
      "heapTotalMb": 58
    }
  },
  "totalDurationMs": 10
}
```

---

## 3. Key Performance Indicators (KPIs) & Alerting Rules

| Metric Name | Warning Threshold | Critical Alert | Notification Channel |
|---|---|---|---|
| **API 5xx Error Rate** | > 1.0% over 5 mins | > 3.0% over 2 mins | PagerDuty (On-Call Engineer) |
| **Database Probe Latency** | > 150 ms | > 500 ms or disconnected | Slack `#ops-alerts` + PagerDuty |
| **Payment Success Rate** | < 85% over 15 mins | < 70% over 10 mins | SMS / PagerDuty (Immediate SEV-1) |
| **Inventory Reservation Churn** | > 40% expiration rate | > 70% expiration rate | Slack `#commerce-analytics` |
| **Memory RSS Usage** | > 75% container limit | > 90% container limit | Automated rolling container restart |

---

## 4. Critical Incident Response Runbook

### Scenario A: Payment Processing Outage (SEV-1)
- **Symptom:** Razorpay webhook failures, high rate of `/api/checkout/verify` rejections.
- **Immediate Diagnostic Steps:**
  1. Check Razorpay Status Dashboard (`status.razorpay.com`).
  2. Inspect `/api/health` response and database connection pool.
  3. Validate `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in secret vault.
  4. Query `payment_events` table for latest webhook errors:
     ```sql
     SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 10;
     ```
- **Remediation:**
  - If Razorpay gateway is down, display informative atelier banner: *"Online checkout is momentarily paused for scheduled gateway maintenance. Your garments remain in your bag."*

### Scenario B: Database Connection Exhaustion (SEV-1)
- **Symptom:** `/api/health` returns 503, application logs show `Error: remaining connection slots are reserved for non-replication superuser connections`.
- **Immediate Diagnostic Steps:**
  1. Run `SELECT count(*) FROM pg_stat_activity;`.
  2. Inspect idle in transaction queries:
     ```sql
     SELECT pid, query, state, age(clock_timestamp(), query_start) 
     FROM pg_stat_activity WHERE state != 'idle';
     ```
- **Remediation:**
  - Terminate blocked queries with `SELECT pg_terminate_backend(pid);`.
  - Enable Supavisor / RDS Proxy transaction pooling.
  - Scale database connection limit or restart PostgreSQL daemon.

---
*End of Monitoring Specification.*
