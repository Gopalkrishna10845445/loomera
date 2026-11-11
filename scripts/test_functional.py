import subprocess
import tempfile
import os
import sys
import time
import json
import urllib.request
import asyncio
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

async def run_functional_tests():
    temp_dir = tempfile.mkdtemp()
    port = 9255
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--remote-debugging-port={port}",
        "--window-size=1440,900",
        "about:blank"
    ])
    await asyncio.sleep(2.5)

    results = []

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as r:
            tabs = json.loads(r.read().decode())
            ws_url = tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=30*1024*1024, ping_interval=None) as ws:
            req_id = 0
            async def call(method, params=None):
                nonlocal req_id
                req_id += 1
                msg = {"id": req_id, "method": method}
                if params: msg["params"] = params
                await ws.send(json.dumps(msg))
                while True:
                    res = json.loads(await ws.recv())
                    if res.get("id") == req_id:
                        return res.get("result", {})

            await call("Page.enable")
            await call("Runtime.enable")
            
            # Navigate to Home and wait for hydration
            print("Navigating to http://localhost:3000/...")
            await call("Page.navigate", {"url": "http://localhost:3000/"})
            await asyncio.sleep(4.0)

            async def eval_js(expr):
                res = await call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
                return res.get("result", {}).get("value")

            # 1. Test Navigation Links
            print("\n--- 1. Testing Navigation ---")
            nav_men = await eval_js("document.querySelector('header a[href=\"/collections/men\"]') !== null")
            results.append({"test": "Nav Men Link", "expected": True, "actual": bool(nav_men), "status": "PASS" if nav_men else "FAIL"})

            nav_boys = await eval_js("document.querySelector('header a[href=\"/collections/boys\"]') !== null")
            results.append({"test": "Nav Boys Link", "expected": True, "actual": bool(nav_boys), "status": "PASS" if nav_boys else "FAIL"})

            nav_handloom = await eval_js("document.querySelector('header a[href=\"/collections/handloom\"]') !== null")
            results.append({"test": "Nav Handloom Link", "expected": True, "actual": bool(nav_handloom), "status": "PASS" if nav_handloom else "FAIL"})

            nav_arrivals = await eval_js("document.querySelector('header a[href=\"/#new-arrivals\"]') !== null")
            results.append({"test": "Nav New Arrivals Link", "expected": True, "actual": bool(nav_arrivals), "status": "PASS" if nav_arrivals else "FAIL"})

            nav_story = await eval_js("document.querySelector('header a[href=\"/#fabric-story\"]') !== null")
            results.append({"test": "Nav Our Story Link", "expected": True, "actual": bool(nav_story), "status": "PASS" if nav_story else "FAIL"})

            # 2. Test Hero CTAs
            print("\n--- 2. Testing Hero CTAs ---")
            hero_shop_men = await eval_js("document.querySelector('section a[href=\"/collections/men\"]') !== null")
            results.append({"test": "Hero Shop Men CTA", "expected": True, "actual": bool(hero_shop_men), "status": "PASS" if hero_shop_men else "FAIL"})

            hero_handloom = await eval_js("document.querySelector('section a[href=\"/collections/handloom\"]') !== null")
            results.append({"test": "Hero Explore Handloom CTA", "expected": True, "actual": bool(hero_handloom), "status": "PASS" if hero_handloom else "FAIL"})

            # 3. Test Collections Cards
            print("\n--- 3. Testing Collections Cards ---")
            col_cards = await eval_js("document.querySelectorAll('#collections a').length")
            results.append({"test": "3 Collection Cards Rendered", "expected": 3, "actual": col_cards, "status": "PASS" if col_cards == 3 else "FAIL"})

            # 4. Test New Arrivals Cards
            print("\n--- 4. Testing Product Cards ---")
            prod_cards = await eval_js("document.querySelectorAll('#new-arrivals .product-card').length")
            results.append({"test": "6 Product Cards Rendered", "expected": 6, "actual": prod_cards, "status": "PASS" if prod_cards == 6 else "FAIL"})

            # 5. Test Wishlist Toggle
            print("\n--- 5. Testing Wishlist Toggle ---")
            wishlist_clicked = await eval_js("(() => { const btn = document.querySelector('.product-card button[aria-label*=\"wishlist\"]'); if (btn) { btn.click(); return true; } return false; })()")
            await asyncio.sleep(0.5)
            badge_text = await eval_js("(() => { const b = document.querySelector('header a[href=\"/account#wishlist\"] span'); return b ? b.innerText : '0'; })()")
            wishlist_passed = bool(wishlist_clicked) and int(badge_text or 0) >= 1
            results.append({"test": "Wishlist Toggle Interaction", "expected": True, "actual": wishlist_passed, "status": "PASS" if wishlist_passed else "FAIL"})

            # 6. Test Quick Add to Cart
            print("\n--- 6. Testing Quick Add to Cart ---")
            added = await eval_js("(() => { const btns = document.querySelectorAll('.product-card button'); for (let b of btns) { if (b.innerText.includes('Quick Add') || b.querySelector('svg')) { b.click(); return true; } } return false; })()")
            await asyncio.sleep(0.6)
            cart_badge = await eval_js("(() => { const b = document.querySelector('header button[aria-label*=\"Shopping Cart\"] span'); return b ? b.innerText : '0'; })()")
            cart_passed = bool(added) and int(cart_badge or 0) >= 1
            results.append({"test": "Add to Cart Interaction", "expected": True, "actual": cart_passed, "status": "PASS" if cart_passed else "FAIL"})

            # 7. Test Cart Drawer Open
            print("\n--- 7. Testing Cart Drawer ---")
            drawer_opened = await eval_js("(() => { const b = document.querySelector('header button[aria-label*=\"Shopping Cart\"]'); if (b) { b.click(); return true; } return false; })()")
            await asyncio.sleep(0.8)
            drawer_visible = await eval_js("document.body.innerText.includes('Shopping Bag') || document.body.innerText.includes('Subtotal')")
            results.append({"test": "Cart Drawer Opens", "expected": True, "actual": bool(drawer_visible), "status": "PASS" if drawer_visible else "FAIL"})

            # Close Cart Drawer
            await eval_js("(() => { const closeBtn = document.querySelector('aside button, [role=\"dialog\"] button'); if (closeBtn) closeBtn.click(); })()")
            await asyncio.sleep(0.5)

            # 8. Test Search Modal Open
            print("\n--- 8. Testing Search Modal ---")
            search_opened = await eval_js("(() => { const s = document.querySelector('header button[aria-label*=\"Search\"], header div[class*=\"cursor-pointer\"]'); if (s) { s.click(); return true; } return false; })()")
            await asyncio.sleep(0.8)
            search_visible = await eval_js("document.querySelector('input[placeholder*=\"Search\"]') !== null")
            results.append({"test": "Search Modal Opens", "expected": True, "actual": bool(search_visible), "status": "PASS" if search_visible else "FAIL"})

            # 9. Test Product Navigation Link
            print("\n--- 9. Testing Product Navigation ---")
            prod_link = await eval_js("document.querySelector('.product-card a').getAttribute('href')")
            results.append({"test": "Product Detail Link Valid", "expected": "/products/classic-linen-shirt", "actual": prod_link, "status": "PASS" if "/products/" in str(prod_link) else "FAIL"})

            # 10. Test Route Health (Account, Orders, Men's Collection, Product Detail)
            print("\n--- 10. Testing Routes ---")
            # Navigate to /account
            await call("Page.navigate", {"url": "http://localhost:3000/account"})
            await asyncio.sleep(2)
            account_title = await eval_js("document.body.innerText.includes('Account') || document.body.innerText.includes('Profile') || document.body.innerText.includes('Sign in')")
            results.append({"test": "Account Route (/account) Health", "expected": True, "actual": bool(account_title), "status": "PASS" if account_title else "FAIL"})

            # Navigate to /orders
            await call("Page.navigate", {"url": "http://localhost:3000/orders"})
            await asyncio.sleep(2)
            orders_title = await eval_js("document.body.innerText.includes('Orders') || document.body.innerText.includes('Track') || document.body.innerText.includes('Order')")
            results.append({"test": "Orders Route (/orders) Health", "expected": True, "actual": bool(orders_title), "status": "PASS" if orders_title else "FAIL"})

            # Navigate to /collections/men
            await call("Page.navigate", {"url": "http://localhost:3000/collections/men"})
            await asyncio.sleep(2)
            men_title = await eval_js("document.body.innerText.includes('Men') || document.body.innerText.includes('Collection')")
            results.append({"test": "Collection Route (/collections/men) Health", "expected": True, "actual": bool(men_title), "status": "PASS" if men_title else "FAIL"})

            # Navigate to /products/classic-linen-shirt
            await call("Page.navigate", {"url": "http://localhost:3000/products/classic-linen-shirt"})
            await asyncio.sleep(2)
            pdp_title = await eval_js("document.body.innerText.includes('Classic Linen Shirt') || document.body.innerText.includes('₹2,499')")
            results.append({"test": "Product Detail Route (/products/classic-linen-shirt) Health", "expected": True, "actual": bool(pdp_title), "status": "PASS" if pdp_title else "FAIL"})

        print("\n=== FUNCTIONAL TEST RESULTS ===")
        pass_count = sum(1 for r in results if r["status"] == "PASS")
        for r in results:
            print(f"[{r['status']}] {r['test']}: expected {r['expected']}, got {r['actual']}")
        print(f"\nTotal: {len(results)}, Passed: {pass_count}, Failed: {len(results) - pass_count}")

        with open("artifacts/loomera-qa/functional_test_results.json", "w") as f:
            json.dump(results, f, indent=2)

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(run_functional_tests())
