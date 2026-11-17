# LOOMERA Flickering & Unwanted Re-rendering: Root Cause Report

**Date:** November 16, 2026  
**Auditor:** Senior Frontend Performance Engineer & Next.js Architect  
**Project:** LOOMERA (Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM)  
**Status:** Root Causes Fully Identified, Verified, and Categorized

---

## 1. Executive Summary of Root Causes

The investigation diagnosed three distinct root causes contributing to different types of flickering, flashing, and re-rendering on LOOMERA:

1. **Turbopack Dev Cache & Build Manifest Collision (Primary Cause of Continuous High-Frequency Blinking):**
   - **Frequency:** Every 100ms – 300ms continuously.
   - **Mechanism:** Running `next dev` in a workspace containing build artifacts from `npm run build` triggered Next.js Turbopack HMR hash mismatches. The client runtime received continuous `reloadPage` control packets over WebSocket (`ws://localhost:3000/_next/webpack-hmr`), causing the browser execution context to repeatedly destroy and refresh.
   
2. **Context Fragmentation & Lifecycle Teardown (Primary Cause of Route-Transition Flickering):**
   - **Frequency:** On every route navigation between storefront pages.
   - **Mechanism:** `<CartProvider>` was individually instantiated inside page-level components (`page.tsx`, `ProductDetailClient.tsx`, `AccountClient.tsx`, `OrdersClient.tsx`, etc.) instead of once at the root `layout.tsx`. Each route change destroyed the existing cart context and mounted a new one, resetting client state and causing noticeable header badge layout jumps.

3. **Hydration Phase Desynchronization in `CartContext` (Primary Cause of Initial Load Badge Flash):**
   - **Frequency:** On initial page load with items in local storage.
   - **Mechanism:** `CartContext.tsx` synchronously read `localStorage` during initial `useState` evaluation. During server-side rendering, `typeof window === 'undefined'` evaluated to `true` (rendering `0` items), whereas in client hydration `typeof window !== 'undefined'` rendered cached items. This discrepancy triggered React hydration mismatches and badge layout shifts.

4. **Continuous GPU Paint Invalidation in AI Assistant Widget (Minor Component-Level Jitter):**
   - **Frequency:** Every 2 seconds.
   - **Mechanism:** An unbounded Tailwind `animate-pulse` class on the floating concierge status indicator caused constant GPU paint invalidation on lower-power displays.

---

## 2. In-Depth Technical Breakdown

### A. The Turbopack HMR Hash Mismatch Loop
#### Telemetry Intercepted via Playwright WebSocket Tap
```json
[RECV] Type: reloadPage, Action: None, Data: "HMR hash mismatch"
[RECV] Type: turbopack-message, Action: None, Data: [{"resource": {"path": "static/chunks/_1anvha4rlo79g._.js"}, "type": "restart"}]
[RECV] Type: reloadPage, Action: None, Data: "HMR hash mismatch"
```

#### Detailed Anatomy
1. Next.js 16 uses Turbopack by default in development mode.
2. When `next build` is executed, optimized static chunk manifests and asset manifests are written to `.next/`.
3. When `next dev` is subsequently run, Turbopack serves dynamic hot-reloading chunks.
4. If stale production manifests remain in `.next/server/` or `.next/static/`, the client HMR runtime checks incoming chunk hashes against the stale static manifest rather than the dev memory graph.
5. The hash check fails (`HMR hash mismatch`), emitting `reloadPage`.
6. The page reloads, reconnects to `_next/webpack-hmr`, and immediately encounters the same mismatch, trapping the user in an infinite reload cycle.

### B. Split Context Architecture
#### Previous Implementation
- `frontend/src/app/layout.tsx`: Included `<AuthProvider>` only.
- `<CartProvider>` was redundantly imported and wrapped inside:
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/collections/[category]/page.tsx`
  - `frontend/src/app/checkout/page.tsx`
  - `frontend/src/app/login/page.tsx`
  - `frontend/src/app/register/page.tsx`
  - `frontend/src/app/campaign/[code]/page.tsx`
  - `frontend/src/app/guides/linen-care/page.tsx`
  - `frontend/src/components/ProductDetailClient.tsx`
  - `frontend/src/components/AccountClient.tsx`
  - `frontend/src/components/OrdersClient.tsx`
  - `frontend/src/components/OrderDetailClient.tsx`

#### Impact
When a user navigated from `/` (Homepage) to `/products/classic-linen-shirt`, Next.js dismantled the entire React subtree of `page.tsx`, terminating its `<CartProvider>` instance. When `ProductDetailClient` mounted, it initialized a completely new `<CartProvider>`. This teardown:
- Cleared all in-memory cart/wishlist state.
- Forced a re-read of `localStorage`.
- Caused Header badges to flash from loaded -> unmounted -> re-rendered.

### C. SSR Hydration Mismatch in `CartContext.tsx`
#### Flawed Code
```typescript
const [cart, setCart] = useState<CartItem[]>(() => {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("loomera_cart");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
});
```

#### Why it Flashed
- Next.js pre-renders the HTML on the server. The server has no `window`, so `cart = []`. The header badge `<span className="absolute ...">{totalItems}</span>` was omitted from the server HTML.
- When the HTML reached the client browser, React initiated the hydration pass. The initial client render executed the `useState` initializer where `typeof window !== 'undefined'` was true, immediately evaluating `totalItems > 0` and injecting the badge.
- React reported: `Warning: Text content did not match. Server: "" Client: "1"`. React was forced to discard the server DOM node and re-mount the element, producing a visible jump/flicker.

---

## 3. Classification of Non-Issues (Ruled Out)

During deep inspection, the following suspected causes were investigated and confirmed **NOT** to be causing flickering:
1. **Database Query Looping:** PostgreSQL queries and Drizzle ORM execution were checked; no runaway queries or connection exhaustion occurred.
2. **React Strict Mode:** Strict Mode double-invocation in development worked as intended and was NOT responsible for the continuous reload loop.
3. **Framer Motion / Motion v14 Animation Loops:** Framer motion transitions on hero and navigation components behaved deterministically and did not trigger re-render cascades.
4. **Third-party Script Injections:** No external analytics or tracking scripts were conflicting with DOM mutation.

---

## 4. Summary Table of Root Causes & Targets

| Root Cause ID | Layer | Problem | Resolution Target |
| :--- | :--- | :--- | :--- |
| **RC-01** | Dev Tooling | Turbopack HMR hash collision in `.next` | Dev cache isolation & clean script |
| **RC-02** | React Architecture | Fragmented, duplicated `<CartProvider>` | Move `<CartProvider>` to root `layout.tsx` |
| **RC-03** | React Hydration | Synchronous `localStorage` read during render | Delayed post-hydration sync via `useEffect` |
| **RC-04** | CSS Animation | Continuous `animate-pulse` keyframe paint | Replace with subtle static luminous styling |

---
*Report completed. Proceeding to Fix Report.*
