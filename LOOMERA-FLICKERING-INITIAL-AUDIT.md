# LOOMERA Flickering & Unwanted Re-rendering: Initial Audit Report

**Date:** November 16, 2026  
**Auditor:** Senior Frontend Performance Engineer, Next.js Architect & UI/UX Quality Auditor  
**Repository:** `LOOMERA` (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM)  
**Status:** Audit & Reproduction Complete — Fix Plan Formulated (Pre-Modification State)

---

## 1. Executive Summary

During initial development testing and browser interaction with `http://localhost:3000`, a high-frequency flashing/blinking phenomenon was observed where the application window repeatedly re-rendered and reloaded at intervals of 100ms to 300ms. In addition, browser console telemetry indicated network 401 unauthorized errors on guest visits, and route transitions exhibited visual flicker due to context teardown and client-side hydration mismatches.

Through low-level WebSocket packet inspection and automated headless browser telemetry, the root causes were isolated into three categories:
1. **Development Runtime Rapid Reload Loop (Primary Cause of Continuous Flashing):** Next.js Turbopack dev server and client runtime entered an infinite `reloadPage` cycle triggered by `HMR hash mismatch` when running `next dev` over stale build cache chunks left behind in `.next/` from `npm run build`.
2. **Context Fragmentation & Hydration State Shift (Cause of Route-Transition Blinking):** `<CartProvider>` was instantiated locally inside five separate client components rather than globally at the root layout. Furthermore, `CartContext.tsx` read `localStorage` synchronously during initial state creation, causing SSR/client HTML mismatches and badge layout shifts.
3. **Guest Session Console Error Warning:** `/api/auth/me` returned HTTP 401 `{ error: "Unauthorized" }` for unauthenticated visitors, triggering red browser console error floods on every page load.

---

## 2. Telemetry & Reproduction Evidence

### A. Reproduction Steps
1. Execute `npm run build` inside `frontend/` (generating production chunks in `frontend/.next`).
2. Execute `npm run dev` in `frontend/` to start the Next.js development server with Turbopack.
3. Launch a Chromium / Edge browser session pointing to `http://localhost:3000`.
4. Observe the page viewport continuously reloading and flashing every 150ms.

### B. Low-Level WebSocket Telemetry
Using a custom Playwright WebSocket telemetry tap (`scripts/inspect_ws_incoming.py`), the following continuous stream of control frames was intercepted from `ws://localhost:3000/_next/webpack-hmr`:

```json
[RECV] Type: reloadPage, Action: None, Data: "HMR hash mismatch"
[RECV] Type: turbopack-message, Action: None, Data: [{"resource": {"path": "static/chunks/_1anvha4rlo79g._.js"}, "type": "restart"}]
[RECV] Type: reloadPage, Action: None, Data: "HMR hash mismatch"
```

**Analysis:**  
The client-side Turbopack HMR runtime checks incoming chunk hashes against the expected hash in memory. Because the `.next` directory contained conflicting static manifests from a prior production build (`next build`), Turbopack computed mismatched chunk identifiers, emitting an immediate `reloadPage` event. When the page reloaded, the same hash mismatch re-occurred, trapping the browser in an infinite restart loop.

### C. Network & Console Errors Captured
- **`GET /api/auth/me` -> 401 Unauthorized:**
  - `AuthProvider` mounts on root layout and immediately dispatches `fetch('/api/auth/me')`.
  - For guests without a JWT cookie, the endpoint returned HTTP 401.
  - While logically handled in code (`setUser(null)`), browsers flag HTTP 401 as a red network failure in the developer console.

---

## 3. Affected vs. Non-Affected Scenarios

| Page / Component | Initial Behavior (Prior to Fix) | Classification | Root Mechanism |
| :--- | :--- | :--- | :--- |
| **All Routes in `next dev`** | Rapid continuous flashing / reloading | Critical | Turbopack HMR hash collision in `.next` cache |
| **Route Transitions (`/` -> `/collections/...`)** | Cart badge flash, momentary layout jump | Moderate | Separate `<CartProvider>` unmounting/remounting |
| **Cart / Wishlist Badges** | Hydration warning, value flip from `0` to cached | Low/Moderate | Direct `localStorage` read during SSR initial render |
| **Floating Concierge (`AiAssistantWidget`)** | High GPU paint frequency | Low | `animate-pulse` on notification indicator |
| **Production Build (`next build` + `next start`)** | No rapid HMR loop (HMR disabled in production) | Stable | Issue was specific to dev cache state, but hydration & 401 affected production |

---

## 4. Root Cause Analysis

### Cause 1: Turbopack Build vs. Dev Cache Collision
In Next.js 16 with Turbopack, the compilation artifact structure in `.next` differs significantly between `next build` (which creates optimized production chunk manifests) and `next dev --turbopack` (which uses dynamic fast-refresh chunk IDs). If `next dev` is started in a workspace containing an existing `.next` build tree without cache isolation, Turbopack's HMR runtime compares dynamic chunk hashes with stale static manifests, failing the check and issuing `reloadPage("HMR hash mismatch")`.

### Cause 2: Split Scope of State Providers
In `frontend/src/app/layout.tsx`, `<AuthProvider>` is wrapped globally, but `<CartProvider>` was missing. Instead, `<CartProvider>` was individually duplicated inside:
- `frontend/src/app/page.tsx`
- `frontend/src/components/ProductDetailClient.tsx`
- `frontend/src/components/AccountClient.tsx`
- `frontend/src/components/OrdersClient.tsx`
- `frontend/src/components/OrderDetailClient.tsx`

Every time a user navigated between the homepage, product pages, or account pages, the entire cart state was torn down, unmounted, and re-instantiated.

### Cause 3: Hydration Mismatch in `CartContext.tsx`
In `frontend/src/context/CartContext.tsx`, state is initialized with:
```typescript
const [cart, setCart] = useState<CartItem[]>(() => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('loomera_cart');
  return saved ? JSON.parse(saved) : [];
});
```
During Next.js server-side rendering, `typeof window === 'undefined'` evaluates to `true`, rendering server HTML with an empty cart (`0` items in badge). On the client, during initial hydration, `typeof window !== 'undefined'` immediately reads `localStorage`, causing React hydration mismatch errors (`Text content does not match server-rendered HTML`) and causing the header badge to visibly jump and flicker.

### Cause 4: `/api/auth/me` HTTP 401 Status for Guests
The API route `frontend/src/app/api/auth/me/route.ts` returned:
```typescript
if (!payload) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
For an e-commerce site where the vast majority of visitors are anonymous guest shoppers, querying session state should be treated as a standard query. Returning HTTP 401 triggers browser network error logging and can cause certain extensions/firewalls to flag the page.

---

## 5. Architectural Remediation Plan (Minimal & Reliable)

To eliminate all blinking, flashing, hydration mismatches, and console warnings while preserving 100% of Phase 1–10 features and design:

1. **Global Provider Unification (`app/layout.tsx`):**
   - Wrap `<CartProvider>` at the root layout level alongside `<AuthProvider>`.
   - Remove redundant local `<CartProvider>` tags from `app/page.tsx`, `ProductDetailClient.tsx`, `AccountClient.tsx`, `OrdersClient.tsx`, and `OrderDetailClient.tsx`.
   - Guarantee persistent cart and wishlist state across all route navigations with zero teardown or remount.

2. **Hydration-Safe Cart Initialization (`CartContext.tsx`):**
   - Initialize state to `[]` identically on both SSR and CSR initial passes.
   - Introduce a `hasHydrated` flag and synchronize with `localStorage` inside a single `useEffect` on mount.
   - Prevent any SSR/CSR HTML mismatch or badge flickering.

3. **Clean Guest Auth API Handling (`/api/auth/me/route.ts` & `AuthContext.tsx`):**
   - In `/api/auth/me`, return HTTP 200 with `{ authenticated: false, user: null }` when no valid session token exists.
   - Maintain HTTP 401 only for protected mutation routes (`/api/admin/*`, `/api/user/*`).
   - Clean up browser console network status for guest visitors.

4. **Dev Cache Clean Script (`package.json`):**
   - Add a clean start script (`npm run dev:clean`) or ensure build artifacts do not contaminate dev runs.

5. **Visual Stability Audit (`AiAssistantWidget.tsx`):**
   - Refine animation classes on floating indicators to use subtle CSS transitions rather than continuous aggressive pulse animations.

---

## 6. Verification Criteria
Following code changes, the following checks will be performed:
- [ ] Run Playwright automated browser test across all key pages (`/`, `/collections/men`, `/products/classic-linen-shirt`, `/cart`, `/account`, `/admin`).
- [ ] Verify 0 periodic mutations during idle, 0 rapid HMR reloads.
- [ ] Verify 0 browser console errors/warnings.
- [ ] Verify TypeScript compiler pass: `npx tsc --noEmit` (0 errors).
- [ ] Verify ESLint pass: `npm run lint` (0 errors).
- [ ] Verify all 12 test suites / 825 automated assertions pass: `npm test`.
- [ ] Verify production compilation: `npm run build` (all 75 routes compiled).

---
*Report filed in accordance with Senior Frontend Performance Engineering & Architecture protocol. Next step: Implementation of minimal fixes.*
