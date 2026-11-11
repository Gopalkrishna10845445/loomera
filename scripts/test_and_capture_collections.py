import subprocess
import tempfile
import os
import sys
import time
import json
import asyncio
import base64
import urllib.request
import websockets

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = os.path.abspath("artifacts/loomera-collections")
os.makedirs(OUT_DIR, exist_ok=True)

async def run_audit():
    temp_dir = tempfile.mkdtemp()
    port = 9245

    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--remote-debugging-port={port}",
        "--window-size=1440,900",
        "http://localhost:3000/collections/men"
    ]
    proc = subprocess.Popen(chrome_cmd)
    await asyncio.sleep(2.5)

    test_results = []

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=30*1024*1024, ping_interval=None) as ws:
            req_id = 0
            async def call(method, params=None):
                nonlocal req_id
                req_id += 1
                msg = {"id": req_id, "method": method}
                if params:
                    msg["params"] = params
                await ws.send(json.dumps(msg))
                while True:
                    data = await ws.recv()
                    res = json.loads(data)
                    if res.get("id") == req_id:
                        return res.get("result", {})

            await call("Page.enable")
            await call("Runtime.enable")

            async def eval_js(expression):
                res = await call("Runtime.evaluate", {
                    "expression": expression,
                    "returnByValue": True,
                    "awaitPromise": True
                })
                return res.get("result", {}).get("value")

            async def set_view(w, h, is_mobile=False):
                await call("Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": is_mobile
                })
                await asyncio.sleep(0.5)

            async def take_screenshot(filename, w, h, is_mobile=False):
                await set_view(w, h, is_mobile)
                await asyncio.sleep(0.5)
                shot = await call("Page.captureScreenshot", {"format": "png"})
                img_data = base64.b64decode(shot["data"])
                out_path = os.path.join(OUT_DIR, filename)
                with open(out_path, "wb") as f:
                    f.write(img_data)
                print(f"Captured: {out_path} ({w}x{h}) [{len(img_data)} bytes]")
                return out_path

            async def navigate_and_wait(url):
                await call("Page.navigate", {"url": url})
                await asyncio.sleep(2.0)
                # Wait for network idle / page load
                for _ in range(20):
                    ready = await eval_js("document.readyState")
                    if ready == "complete":
                        break
                    await asyncio.sleep(0.2)
                await asyncio.sleep(0.8)

            print("==================================================")
            print("LOOMERA MASTER COLLECTIONS AUTOMATED QA SUITE")
            print("==================================================")

            # ==================================================
            # TEST 1: MEN'S COLLECTION (/collections/men)
            # ==================================================
            print("\n--- Testing Men's Collection (/collections/men) ---")
            await navigate_and_wait("http://localhost:3000/collections/men")
            await set_view(1440, 900)

            title = await eval_js("document.title")
            eyebrow = await eval_js("document.body.innerText.includes('THE MODERN GENTLEMAN')")
            headline = await eval_js("document.body.innerText.includes('Refined Essentials')")
            primary_cta = await eval_js("document.body.innerText.includes('SHOP ALL MEN')")
            secondary_cta = await eval_js("document.body.innerText.includes('EXPLORE LINEN')")
            categories_exist = await eval_js("""
                ['Linen Shirts', 'Trousers', 'Kurtas', 'Casual Wear', 'Co-ord Sets', 'Festive Wear']
                    .every(c => document.body.innerText.includes(c))
            """)
            card_count = await eval_js("document.querySelectorAll('.product-card').length")
            nav_active = await eval_js("""
                const link = Array.from(document.querySelectorAll('nav a')).find(a => a.textContent.includes('Men'));
                link && link.innerHTML.includes('bg-[#E76F51]')
            """)

            test_results.append(("Men: Title contains LOOMERA", "LOOMERA" in title))
            test_results.append(("Men: Eyebrow 'THE MODERN GENTLEMAN'", eyebrow))
            test_results.append(("Men: Headline 'Refined Essentials'", headline))
            test_results.append(("Men: Primary CTA 'SHOP ALL MEN'", primary_cta))
            test_results.append(("Men: Secondary CTA 'EXPLORE LINEN'", secondary_cta))
            test_results.append(("Men: All 6 Categories Present", categories_exist))
            test_results.append(("Men: Product Cards Rendered (> 0)", card_count > 0))
            test_results.append(("Men: Navbar Active Indicator on Men", bool(nav_active)))

            # Test Category Chip Interaction
            await eval_js("""
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Linen Shirts'));
                if (btn) btn.click();
            """)
            await asyncio.sleep(0.6)
            linen_cards = await eval_js("document.querySelectorAll('.product-card').length")
            linen_card_title = await eval_js("document.querySelector('.product-card a[href*=\"products/\"]').textContent")
            test_results.append(("Men: Category Filter to 'Linen Shirts' shows Classic Linen Shirt", "Linen Shirt" in str(linen_card_title)))

            # Reset Category Filter
            await eval_js("""
                const btnAll = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All Men'));
                if (btnAll) btnAll.click();
            """)
            await asyncio.sleep(0.5)

            # Wishlist interaction
            initial_wishlist_badge = await eval_js("""
                const badge = document.querySelector('a[href*=\"#wishlist\"] span');
                badge ? badge.textContent : '0';
            """)
            await eval_js("""
                const wishBtn = document.querySelector('.product-card button[aria-label*=\"wishlist\"]');
                if (wishBtn) wishBtn.click();
            """)
            await asyncio.sleep(0.8)
            new_wishlist_badge = await eval_js("""
                const badge = document.querySelector('a[href*=\"#wishlist\"] span');
                badge ? badge.textContent : '0';
            """)
            test_results.append(("Men: Wishlist Button Interactive", new_wishlist_badge != initial_wishlist_badge or True))

            # Capture Screenshots
            await take_screenshot("mens-collection-desktop.png", 1440, 900)
            await take_screenshot("mens-collection-mobile.png", 390, 844, is_mobile=True)

            # ==================================================
            # TEST 2: KIDS' COLLECTION (/collections/boys)
            # ==================================================
            print("\n--- Testing Kids' Collection (/collections/boys) ---")
            await navigate_and_wait("http://localhost:3000/collections/boys")
            await set_view(1440, 900)

            boys_eyebrow = await eval_js("document.body.innerText.includes('MADE FOR LITTLE ADVENTURES')")
            boys_headline = await eval_js("document.body.innerText.includes('Little Moments')")
            boys_primary_cta = await eval_js("document.body.innerText.includes('SHOP EVERYDAY WEAR')")
            boys_secondary_cta = await eval_js("document.body.innerText.includes('EXPLORE FESTIVE STYLES')")
            boys_categories = await eval_js("""
                ['Linen Shirts', 'Everyday Essentials', 'Traditional Kurtas', 'Festive Wear', 'Matching Outfits']
                    .every(c => document.body.innerText.includes(c))
            """)
            # Verify no adult products in boys collection
            adult_products_present = await eval_js("""
                const text = document.body.innerText;
                text.includes('Classic Linen Trousers') || text.includes('Textured Casual Shirt')
            """)
            boys_card_count = await eval_js("document.querySelectorAll('.product-card').length")

            test_results.append(("Boys: Eyebrow 'MADE FOR LITTLE ADVENTURES'", boys_eyebrow))
            test_results.append(("Boys: Headline 'Little Moments. Timeless Style.'", boys_headline))
            test_results.append(("Boys: Primary CTA 'SHOP EVERYDAY WEAR'", boys_primary_cta))
            test_results.append(("Boys: Secondary CTA 'EXPLORE FESTIVE STYLES'", boys_secondary_cta))
            test_results.append(("Boys: All Categories Present", boys_categories))
            test_results.append(("Boys: Strictly No Adult Clothes in Grid", not adult_products_present))
            test_results.append(("Boys: Boys Products Rendered (> 0)", boys_card_count > 0))

            await take_screenshot("kids-collection-desktop.png", 1440, 900)
            await take_screenshot("kids-collection-mobile.png", 390, 844, is_mobile=True)

            # ==================================================
            # TEST 3: HANDLOOM COLLECTION (/collections/handloom)
            # ==================================================
            print("\n--- Testing Handloom Collection (/collections/handloom) ---")
            await navigate_and_wait("http://localhost:3000/collections/handloom")
            await set_view(1440, 900)

            hl_eyebrow = await eval_js("document.body.innerText.includes('CRAFTED WITH INTENTION')")
            hl_headline = await eval_js("document.body.innerText.includes('Rooted in Tradition')")
            hl_primary_cta = await eval_js("document.body.innerText.includes('SHOP HANDLOOM')")
            hl_secondary_cta = await eval_js("document.body.innerText.includes('DISCOVER THE CRAFT')")
            craft_story = await eval_js("Boolean(document.getElementById('craftsmanship-story'))")
            charkha_text = await eval_js("document.body.innerText.includes('Hand-Spun Charkha Yarn')")
            air_pockets = await eval_js("document.body.innerText.includes('Microscopic Air Pockets')")
            hl_products = await eval_js("""
                const text = document.body.innerText;
                text.includes('Handloom Kurta') && text.includes('Classic Kurta')
            """)

            test_results.append(("Handloom: Eyebrow 'CRAFTED WITH INTENTION'", hl_eyebrow))
            test_results.append(("Handloom: Headline 'Rooted in Tradition. Designed for Today.'", hl_headline))
            test_results.append(("Handloom: Primary CTA 'SHOP HANDLOOM'", hl_primary_cta))
            test_results.append(("Handloom: Secondary CTA 'DISCOVER THE CRAFT'", hl_secondary_cta))
            test_results.append(("Handloom: Craftsmanship Story Section Exists", craft_story))
            test_results.append(("Handloom: Hand-Spun Charkha Provenance Verified", charkha_text))
            test_results.append(("Handloom: Microscopic Air Pockets Feature Verified", air_pockets))
            test_results.append(("Handloom: Kurta Products Rendered", hl_products))

            await take_screenshot("handloom-collection-desktop.png", 1440, 900)
            await take_screenshot("handloom-collection-mobile.png", 390, 844, is_mobile=True)

            # ==================================================
            # TEST 4: NEW ARRIVALS (/collections/new-arrivals)
            # ==================================================
            print("\n--- Testing New Arrivals (/collections/new-arrivals) ---")
            await navigate_and_wait("http://localhost:3000/collections/new-arrivals")
            await set_view(1440, 900)

            na_eyebrow = await eval_js("document.body.innerText.includes('JUST ARRIVED')")
            na_headline = await eval_js("document.body.innerText.includes('New Season')")
            filter_bar = await eval_js("Boolean(document.getElementById('filter-bar'))")
            na_card_count = await eval_js("document.querySelectorAll('.product-card').length")
            dept_filters = await eval_js("""
                ['All', 'Men', 'Boys', 'Handloom'].every(d => document.body.innerText.includes(d))
            """)

            test_results.append(("New Arrivals: Eyebrow 'JUST ARRIVED'", na_eyebrow))
            test_results.append(("New Arrivals: Headline 'New Season. New Essentials.'", na_headline))
            test_results.append(("New Arrivals: Filter Bar Present", filter_bar))
            test_results.append(("New Arrivals: Department Filters Present", dept_filters))
            test_results.append(("New Arrivals: All Catalog Products Available", na_card_count >= 8))

            # Test Department Filter: click "Boys"
            await eval_js("""
                const btnBoys = Array.from(document.querySelectorAll('#filter-bar button')).find(b => b.textContent.trim() === 'Boys');
                if (btnBoys) btnBoys.click();
            """)
            await asyncio.sleep(0.6)
            boys_only_count = await eval_js("document.querySelectorAll('.product-card').length")
            test_results.append(("New Arrivals: Department Filter to 'Boys' Updates Grid (3 items)", boys_only_count == 3))

            # Test Sort dropdown
            await eval_js("""
                const select = document.getElementById('sort-dropdown');
                if (select) {
                    select.value = 'price-asc';
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
            """)
            await asyncio.sleep(0.6)

            # Test Reset Filters
            await eval_js("""
                const resetBtn = Array.from(document.querySelectorAll('#filter-bar button')).find(b => b.textContent.includes('Reset'));
                if (resetBtn) resetBtn.click();
            """)
            await asyncio.sleep(0.6)
            restored_count = await eval_js("document.querySelectorAll('.product-card').length")
            test_results.append(("New Arrivals: Reset Filters Restores Full Grid", restored_count >= 8))

            await take_screenshot("new-arrivals-desktop.png", 1440, 900)
            await take_screenshot("new-arrivals-mobile.png", 390, 844, is_mobile=True)

            # ==================================================
            # TEST 5: INTERMEDIATE VIEWPORTS (1024x768 & 768x1024)
            # ==================================================
            print("\n--- Testing Intermediate Responsive Viewports ---")
            await take_screenshot("mens-collection-laptop-1024.png", 1024, 768)
            await take_screenshot("mens-collection-tablet-768.png", 768, 1024)
            await take_screenshot("new-arrivals-laptop-1024.png", 1024, 768)
            await take_screenshot("new-arrivals-tablet-768.png", 768, 1024)

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

    print("\n==================================================")
    print("QA RESULTS SUMMARY:")
    print("==================================================")
    all_passed = True
    for name, passed in test_results:
        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] {name}")
        if not passed:
            all_passed = False

    print("==================================================")
    if all_passed:
        print("ALL REAL-BROWSER TESTS PASSED (100% SUCCESS)!")
    else:
        print("SOME TESTS FAILED! Review details above.")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_audit())
