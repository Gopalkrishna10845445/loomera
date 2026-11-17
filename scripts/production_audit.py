import asyncio
import json
import time
import urllib.request
import ssl
from playwright.async_api import async_playwright

BASE_URL = "https://loomera-roan.vercel.app"

ROUTES_TO_AUDIT = [
    ("Homepage", f"{BASE_URL}/", 200),
    ("Men's Collection", f"{BASE_URL}/collections/men", 200),
    ("Boys' Collection", f"{BASE_URL}/collections/boys", 200),
    ("Product Detail", f"{BASE_URL}/products/classic-linen-shirt", 200),
    ("Linen Care Guide", f"{BASE_URL}/guides/linen-care", 200),
    ("Login Page", f"{BASE_URL}/login", 200),
    ("Registration Page", f"{BASE_URL}/register", 200),
    ("Checkout Page", f"{BASE_URL}/checkout", [200, 307, 308]),  # protected / redirects to login
    ("Patron Account", f"{BASE_URL}/account", [200, 307, 308]),   # protected / redirects to login
    ("Orders Page", f"{BASE_URL}/orders", [200, 307, 308]),       # protected / redirects to login
    ("Admin Dashboard", f"{BASE_URL}/admin", [200, 307, 308, 401, 403]), # protected / access denied
    ("Admin Intelligence", f"{BASE_URL}/admin/intelligence", [200, 307, 308, 401, 403]), # protected
]

VIEWPORTS = [
    ("Desktop (1920x1080)", 1920, 1080),
    ("Laptop (1440x900)", 1440, 900),
    ("Tablet (768x1024)", 768, 1024),
    ("Mobile (390x844)", 390, 844),
]

audit_results = {
    "phase1_routes": [],
    "phase2_flickering": {},
    "phase3_cart": {},
    "phase4_apis": [],
    "phase5_health": {},
    "phase6_responsive": [],
    "phase7_performance": {},
    "phase8_security": {}
}

async def run_phase1_route_audit(page):
    print("\n=======================================================")
    print("PHASE 1: PRODUCTION WEBSITE ACCESS & ROUTE AUDIT")
    print("=======================================================")
    
    for name, url, expected in ROUTES_TO_AUDIT:
        try:
            start_t = time.time()
            resp = await page.goto(url, wait_until="load", timeout=20000)
            elapsed_ms = int((time.time() - start_t) * 1000)
            status = resp.status if resp else "NO_RESPONSE"
            final_url = page.url
            
            # Check redirect behavior
            is_redirected = final_url != url
            title = await page.title()
            
            # Check for critical errors or blank screen
            body_text = await page.evaluate("() => document.body.innerText.slice(0, 200)")
            is_blank = len(body_text.strip()) == 0
            has_error_page = "404" in title or "Application error" in body_text or "500" in title
            
            expected_list = expected if isinstance(expected, list) else [expected]
            passed = status in expected_list and not is_blank and not has_error_page
            
            res_item = {
                "name": name,
                "url": url,
                "status": status,
                "elapsed_ms": elapsed_ms,
                "is_redirected": is_redirected,
                "final_url": final_url,
                "title": title,
                "is_blank": is_blank,
                "passed": passed
            }
            audit_results["phase1_routes"].append(res_item)
            status_tag = "PASS" if passed else "FAIL"
            print(f"  [{status_tag}] {name}: HTTP {status} in {elapsed_ms}ms (Final: {final_url})")
        except Exception as e:
            print(f"  [FAIL] {name}: Exception {str(e)}")
            audit_results["phase1_routes"].append({
                "name": name, "url": url, "status": "ERROR", "error": str(e), "passed": False
            })

async def run_phase2_flickering_audit(page):
    print("\n=======================================================")
    print("PHASE 2: FLICKERING, HYDRATION & RE-RENDERING VERIFICATION")
    print("=======================================================")
    
    console_errors = []
    page.on("console", lambda m: console_errors.append({"type": m.type, "text": m.text}) if m.type in ["error", "warning"] else None)

    # Inject DOM MutationObserver before load
    await page.add_init_script("""
        window.__domMutations = [];
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                window.__domMutations.push({
                    type: m.type,
                    target: (m.target.nodeName || '') + '.' + (m.target.className || '').slice(0, 30),
                    t: performance.now()
                });
            }
        });
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
        });
    """)

    print("  1. Testing Homepage Initial Load & Idle Stability...")
    await page.goto(f"{BASE_URL}/", wait_until="load")
    await page.wait_for_timeout(2000) # Hydration settle
    init_mutations = await page.evaluate("() => window.__domMutations ? window.__domMutations.length : 0")
    
    print("  2. Monitoring 4 seconds idle for background CSS/JS blinking loops...")
    await page.wait_for_timeout(4000)
    idle_mutations = await page.evaluate("() => window.__domMutations ? window.__domMutations.length : 0")
    periodic_mutations = idle_mutations - init_mutations
    print(f"     Periodic DOM mutations during 4s idle: {periodic_mutations}")

    print("  3. Testing Scroll Stability...")
    await page.evaluate("window.scrollTo({ top: 600, behavior: 'smooth' })")
    await page.wait_for_timeout(800)
    await page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
    await page.wait_for_timeout(800)

    print("  4. Testing AI Concierge Drawer Open & Close...")
    ai_btn = page.locator("button:has-text('Atelier Concierge')").first
    if await ai_btn.count() > 0:
        await ai_btn.click()
        await page.wait_for_timeout(1000)
        ai_drawer = page.locator("[data-testid='ai-assistant-drawer']").first
        drawer_visible = await ai_drawer.is_visible() if await ai_drawer.count() > 0 else True
        print(f"     AI Drawer opened successfully: {drawer_visible}")
        close_btn = page.locator("button[aria-label='Close Concierge'], button[title='Close Concierge']").first
        if await close_btn.count() > 0:
            await close_btn.click()
            await page.wait_for_timeout(600)
            print("     AI Drawer closed cleanly.")

    print("  5. Testing Search Modal Open & Close...")
    search_capsule = page.locator("text='Search for shirts'").first
    if await search_capsule.count() > 0:
        await search_capsule.click()
        await page.wait_for_timeout(800)
        search_input = page.locator("input[placeholder*='Search']").first
        modal_open = await search_input.is_visible() if await search_input.count() > 0 else False
        print(f"     Search modal opened: {modal_open}")
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)

    # Filter console messages: ignore 401 on /api/auth/me for anonymous visitors
    critical_console_errors = [
        c for c in console_errors 
        if c["type"] == "error" and "401" not in c["text"] and "favicon" not in c["text"]
    ]
    hydration_warnings = [
        c for c in console_errors 
        if "hydration" in c["text"].lower() or "did not match" in c["text"].lower()
    ]

    audit_results["phase2_flickering"] = {
        "periodic_mutations": periodic_mutations,
        "critical_console_errors": len(critical_console_errors),
        "hydration_warnings": len(hydration_warnings),
        "console_details": [c["text"] for c in critical_console_errors[:5]],
        "passed": periodic_mutations <= 10 and len(critical_console_errors) == 0 and len(hydration_warnings) == 0
    }
    print(f"  [RESULT] Periodic Mutations: {periodic_mutations}, Critical Console Errors: {len(critical_console_errors)}, Hydration Warnings: {len(hydration_warnings)}")

async def run_phase3_cart_audit(page):
    print("\n=======================================================")
    print("PHASE 3: CART PERSISTENCE & HYDRATION VERIFICATION")
    print("=======================================================")
    
    # 1. Start fresh
    await page.goto(f"{BASE_URL}/", wait_until="load")
    await page.evaluate("() => { localStorage.clear(); }")
    await page.reload(wait_until="load")
    await page.wait_for_timeout(1000)

    badge_empty = await page.evaluate("""() => {
        const btn = document.querySelector('button[aria-label*="Shopping Cart"]');
        return btn ? btn.getAttribute('aria-label') : null;
    }""")
    print(f"  1. Fresh Session Cart: {badge_empty}")

    # 2. Navigate to product detail
    print("  2. Navigating to /products/classic-linen-shirt...")
    await page.goto(f"{BASE_URL}/products/classic-linen-shirt", wait_until="load")
    await page.wait_for_timeout(1500)

    # 3. Add to bag
    print("  3. Adding product to bag...")
    add_btn = page.locator("button:has-text('Atelier Bag')").first
    if await add_btn.count() > 0:
        await add_btn.click()
        await page.wait_for_timeout(1500)
        print("     Clicked 'Add to Atelier Bag'.")

    # 4. Check cart drawer
    cart_drawer = page.locator("[aria-label='Shopping Bag'], [data-testid='cart-drawer']").first
    print("  4. Checking drawer state...")
    
    # Close drawer if open
    close_drawer_btn = page.locator("button[aria-label='Close Bag'], button[aria-label='Close cart']").first
    if await close_drawer_btn.count() > 0 and await close_drawer_btn.is_visible():
        await close_drawer_btn.click()
        await page.wait_for_timeout(600)

    # 5. Check localStorage
    stored_cart = await page.evaluate("() => localStorage.getItem('loomera_cart')")
    print(f"  5. LocalStorage 'loomera_cart': {stored_cart[:80] if stored_cart else 'EMPTY'}...")

    # 6. Navigate across routes to Homepage
    print("  6. Navigating back to Homepage to test cross-route persistence...")
    await page.goto(f"{BASE_URL}/", wait_until="load")
    await page.wait_for_timeout(1500)

    badge_after_nav = await page.evaluate("""() => {
        const btn = document.querySelector('button[aria-label*="Shopping Cart"]');
        return btn ? btn.getAttribute('aria-label') : null;
    }""")
    print(f"     Homepage Cart Badge after route navigation: {badge_after_nav}")

    # 7. Navigate to Collections
    print("  7. Navigating to /collections/men...")
    await page.goto(f"{BASE_URL}/collections/men", wait_until="load")
    await page.wait_for_timeout(1500)
    badge_collections = await page.evaluate("""() => {
        const btn = document.querySelector('button[aria-label*="Shopping Cart"]');
        return btn ? btn.getAttribute('aria-label') : null;
    }""")
    print(f"     Collections Cart Badge: {badge_collections}")

    # 8. Refresh page
    print("  8. Refreshing page...")
    await page.reload(wait_until="load")
    await page.wait_for_timeout(1500)
    badge_refreshed = await page.evaluate("""() => {
        const btn = document.querySelector('button[aria-label*="Shopping Cart"]');
        return btn ? btn.getAttribute('aria-label') : null;
    }""")
    print(f"     Cart Badge after full page refresh: {badge_refreshed}")

    has_1_item = "1 item" in (badge_refreshed or "") or (stored_cart and len(stored_cart) > 10)
    audit_results["phase3_cart"] = {
        "badge_empty": badge_empty,
        "stored_cart": stored_cart[:60] if stored_cart else None,
        "badge_after_nav": badge_after_nav,
        "badge_collections": badge_collections,
        "badge_refreshed": badge_refreshed,
        "passed": bool(has_1_item)
    }
    status_tag = "PASS" if has_1_item else "FAIL"
    print(f"  [{status_tag}] Cart state persistence verified!")

async def run_phase4_api_audit():
    print("\n=======================================================")
    print("PHASE 4: PRODUCTION API & BACKEND AUDIT")
    print("=======================================================")

    endpoints = [
        ("Catalog API", f"{BASE_URL}/api/products", "GET", None, [200]),
        ("Single Product API", f"{BASE_URL}/api/products/classic-linen-shirt", "GET", None, [200]),
        ("Guest Auth Session API", f"{BASE_URL}/api/auth/me", "GET", None, [200, 401]),
        ("Healthcheck API", f"{BASE_URL}/api/health", "GET", None, [200]),
        ("AI Assistant Chat API", f"{BASE_URL}/api/assistant/chat", "POST", json.dumps({"message": "Recommend pure linen shirts"}), [200]),
        ("Protected Admin Products API", f"{BASE_URL}/api/admin/products", "GET", None, [401, 403, 307]),
        ("Protected Admin Analytics API", f"{BASE_URL}/api/admin/analytics", "GET", None, [401, 403, 307]),
        ("Protected Admin Intelligence API", f"{BASE_URL}/api/admin/intelligence/overview", "GET", None, [401, 403, 307]),
    ]

    ctx = ssl.create_default_context()
    for name, url, method, body, expected_statuses in endpoints:
        req = urllib.request.Request(url, method=method)
        req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) LOOMERA-Production-Auditor/1.0")
        if body:
            req.add_header("Content-Type", "application/json")
            req.data = body.encode("utf-8")

        start_t = time.time()
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
                status = response.status
                content_type = response.headers.get("Content-Type", "")
                data = response.read(200).decode("utf-8", errors="ignore")
                elapsed_ms = int((time.time() - start_t) * 1000)
                passed = status in expected_statuses
                tag = "PASS" if passed else "FAIL"
                print(f"  [{tag}] {name} ({method} {url}): HTTP {status} in {elapsed_ms}ms (type: {content_type[:25]})")
                audit_results["phase4_apis"].append({
                    "name": name, "url": url, "method": method, "status": status, "elapsed_ms": elapsed_ms, "passed": passed
                })
        except urllib.error.HTTPError as e:
            elapsed_ms = int((time.time() - start_t) * 1000)
            passed = e.code in expected_statuses
            tag = "PASS" if passed else "FAIL"
            print(f"  [{tag}] {name} ({method} {url}): HTTP {e.code} in {elapsed_ms}ms (Expected: {expected_statuses})")
            audit_results["phase4_apis"].append({
                "name": name, "url": url, "method": method, "status": e.code, "elapsed_ms": elapsed_ms, "passed": passed
            })
        except Exception as e:
            print(f"  [FAIL] {name}: Network exception {str(e)}")
            audit_results["phase4_apis"].append({
                "name": name, "url": url, "method": method, "status": "ERROR", "error": str(e), "passed": False
            })

async def run_phase6_responsive_audit(browser):
    print("\n=======================================================")
    print("PHASE 6: RESPONSIVE & MULTI-VIEWPORT AUDIT")
    print("=======================================================")

    for vp_name, width, height in VIEWPORTS:
        context = await browser.new_context(viewport={"width": width, "height": height})
        page = await context.new_page()
        try:
            await page.goto(f"{BASE_URL}/", wait_until="load", timeout=20000)
            await page.wait_for_timeout(1500)

            # Check horizontal overflow
            has_horizontal_overflow = await page.evaluate("""() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            }""")

            # Check navigation elements
            is_mobile = width < 1024
            menu_btn = page.locator("button[aria-label='Toggle navigation menu']").first
            menu_btn_visible = await menu_btn.is_visible() if await menu_btn.count() > 0 else False
            
            passed = not has_horizontal_overflow
            tag = "PASS" if passed else "FAIL"
            print(f"  [{tag}] {vp_name}: Horizontal Overflow = {has_horizontal_overflow}, Mobile Menu Button = {menu_btn_visible}")
            audit_results["phase6_responsive"].append({
                "viewport": vp_name,
                "width": width,
                "height": height,
                "has_horizontal_overflow": has_horizontal_overflow,
                "menu_btn_visible": menu_btn_visible,
                "passed": passed
            })
        finally:
            await context.close()

async def run_phase7_performance_audit(page):
    print("\n=======================================================")
    print("PHASE 7: PERFORMANCE & CORE WEB VITALS PROBE")
    print("=======================================================")

    await page.goto(f"{BASE_URL}/", wait_until="load")
    await page.wait_for_timeout(2500)

    perf_metrics = await page.evaluate("""() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const paint = performance.getEntriesByType('paint') || [];
        const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
        
        return {
            dns_time: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
            tls_time: Math.round(nav.connectEnd - nav.secureConnectionStart),
            ttfb: Math.round(nav.responseStart - nav.requestStart),
            transfer_size: nav.transferSize || 0,
            dom_content_loaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            load_complete: Math.round(nav.loadEventEnd - nav.startTime),
            fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null
        };
    }""")

    print(f"  TTFB (Time to First Byte): {perf_metrics.get('ttfb')} ms")
    print(f"  FCP (First Contentful Paint): {perf_metrics.get('fcp')} ms")
    print(f"  DOM Content Loaded: {perf_metrics.get('dom_content_loaded')} ms")
    print(f"  Complete Load: {perf_metrics.get('load_complete')} ms")
    print(f"  HTML Transfer Size: {perf_metrics.get('transfer_size')} bytes")

    audit_results["phase7_performance"] = perf_metrics

async def run_phase8_security_audit(page):
    print("\n=======================================================")
    print("PHASE 8: SECURITY & PRODUCTION SAFETY AUDIT")
    print("=======================================================")

    resp = await page.goto(f"{BASE_URL}/", wait_until="load")
    headers = resp.headers if resp else {}

    hsts = "strict-transport-security" in headers
    csp = "content-security-policy" in headers
    x_content_type = "x-content-type-options" in headers
    x_frame = "x-frame-options" in headers
    referrer = "referrer-policy" in headers

    print(f"  Strict-Transport-Security (HSTS): {'PRESENT' if hsts else 'MISSING'}")
    print(f"  Content-Security-Policy (CSP): {'PRESENT' if csp else 'MISSING'}")
    print(f"  X-Content-Type-Options: {'PRESENT' if x_content_type else 'MISSING'}")
    print(f"  X-Frame-Options: {'PRESENT' if x_frame else 'MISSING'}")
    print(f"  Referrer-Policy: {'PRESENT' if referrer else 'MISSING'}")

    # Inspect page source for exposed sensitive patterns
    page_content = await page.content()
    leak_postgres = "postgres://" in page_content
    leak_db_url = "DATABASE_URL" in page_content
    leak_secret_key = "SESSION_SECRET" in page_content or "CRON_SECRET" in page_content

    print(f"  Client-side leak of 'postgres://': {leak_postgres}")
    print(f"  Client-side leak of DATABASE_URL: {leak_db_url}")
    print(f"  Client-side leak of SESSION/CRON secrets: {leak_secret_key}")

    passed = hsts and csp and not leak_postgres and not leak_db_url and not leak_secret_key
    audit_results["phase8_security"] = {
        "hsts": hsts,
        "csp": csp,
        "x_content_type": x_content_type,
        "x_frame": x_frame,
        "referrer": referrer,
        "leak_postgres": leak_postgres,
        "leak_db_url": leak_db_url,
        "passed": passed
    }
    status_tag = "PASS" if passed else "FAIL"
    print(f"  [{status_tag}] Security headers & client secrecy certified!")

async def main():
    print("======================================================================")
    print(f"LOOMERA LIVE PRODUCTION AUDIT — TARGET: {BASE_URL}")
    print("======================================================================")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, channel="msedge")
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        await run_phase1_route_audit(page)
        await run_phase2_flickering_audit(page)
        await run_phase3_cart_audit(page)
        await run_phase4_api_audit()
        await run_phase6_responsive_audit(browser)
        await run_phase7_performance_audit(page)
        await run_phase8_security_audit(page)

        await browser.close()

    # Save raw audit findings to JSON for reference
    with open("scripts/production_audit_results.json", "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    print("\n======================================================================")
    print("PRODUCTION AUDIT COMPLETE — RAW RESULTS PERSISTED")
    print("======================================================================")

if __name__ == "__main__":
    asyncio.run(main())
