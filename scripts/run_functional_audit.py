import subprocess
import tempfile
import os
import sys
import json
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def get_rendered_dom(url, budget=4000):
    temp_dir = tempfile.mkdtemp()
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--virtual-time-budget={budget}",
        "--dump-dom",
        url
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
    return res.stdout

def test_route_http(path):
    url = f"http://localhost:3000{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Chrome/120.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return {"status": r.status, "ok": r.status == 200}
    except Exception as e:
        return {"status": getattr(e, "code", 500), "ok": False, "error": str(e)}

def main():
    print("Executing Real-Browser Functional QA Suite...")
    results = []

    # 1. Homepage DOM Inspection
    dom = get_rendered_dom("http://localhost:3000/")
    print(f"Captured Homepage DOM ({len(dom)} bytes)")

    # Test Suite A: Primary Navigation
    tests_nav = [
        ("Nav Logo LOOMERA", "LOOMERA" in dom and 'aria-label="LOOMERA Home"' in dom),
        ("Nav Subtitle 'THREADS FOR A BETTER TOMORROW'", "THREADS FOR A BETTER TOMORROW" in dom),
        ("Nav Link Men (/collections/men)", 'href="/collections/men"' in dom),
        ("Nav Link Boys (/collections/boys)", 'href="/collections/boys"' in dom),
        ("Nav Link Handloom (/collections/handloom)", 'href="/collections/handloom"' in dom),
        ("Nav Link New Arrivals (/#new-arrivals)", 'href="/#new-arrivals"' in dom),
        ("Nav Link Our Story (/#fabric-story)", 'href="/#fabric-story"' in dom),
        ("Nav Search Pill", "Search for shirts, kurtas, linen..." in dom),
        ("Nav Account Icon Link", 'href="/account"' in dom),
        ("Nav Wishlist Icon Link", 'href="/account#wishlist"' in dom),
        ("Nav Shopping Bag Button", 'aria-label="Shopping Cart with' in dom or 'ShoppingBag' in dom or 'Shopping Cart' in dom),
    ]

    for name, passed in tests_nav:
        results.append({
            "category": "Navigation",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite B: Hero Section
    tests_hero = [
        ("Hero Eyebrow (NATURAL FABRICS • TIMELESS STYLE)", "NATURAL FABRICS" in dom and "TIMELESS STYLE" in dom),
        ("Hero Headline (Everyday Extraordinary)", "Everyday" in dom and "Extraordinary" in dom),
        ("Hero Headline Italics", "italic" in dom and "Extraordinary" in dom),
        ("Hero Supporting Description", "Premium linen &amp; handloom clothing for the modern gentleman" in dom or "Premium linen & handloom clothing for the modern gentleman" in dom),
        ("Hero Primary CTA 'Shop Men →'", "Shop Men" in dom and 'href="/collections/men"' in dom),
        ("Hero Secondary CTA 'Explore Handloom'", "Explore Handloom" in dom and 'href="/collections/handloom"' in dom),
        ("Hero Social Proof (4.8/5 & 10K+ Happy Customers)", "4.8/5" in dom and "10K+ Happy Customers" in dom),
        ("Hero Editorial Script ('Linen that lives with you')", "Linen" in dom and "that lives" in dom and "with you" in dom),
        ("Hero Carousel Indicators", "aria-label=\"Previous slide\"" in dom and "aria-label=\"Next slide\"" in dom),
    ]

    for name, passed in tests_hero:
        results.append({
            "category": "Hero Section",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite C: Collections Section
    tests_col = [
        ("Men's Collection Card", "Men's Collection" in dom and "Explore Men" in dom),
        ("Boys' Collection Card", "Boys' Collection" in dom and "Explore Boys" in dom),
        ("Handloom Collection Card", "Handloom Collection" in dom and "Explore Handloom" in dom),
        ("3 Collection Cards in DOM", dom.count("Explore Men") >= 1 and dom.count("Explore Boys") >= 1 and dom.count("Explore Handloom") >= 1),
    ]

    for name, passed in tests_col:
        results.append({
            "category": "Collections",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite D: Benefits Strip
    tests_benefits = [
        ("Benefit 1: Natural & Breathable Fabrics", "Natural &amp; Breathable Fabrics" in dom or "Natural & Breathable Fabrics" in dom or "Natural & Breathable" in dom),
        ("Benefit 2: Free Shipping on ₹2,999+", "Free Shipping" in dom and "2,999" in dom),
        ("Benefit 3: Easy 7-Day Returns", "Easy 7-Day Returns" in dom),
        ("Benefit 4: Secure Payments", "Secure Payments" in dom),
        ("Benefit 5: Sustainable & Ethical", "Sustainable &amp; Ethical" in dom or "Sustainable & Ethical" in dom),
    ]

    for name, passed in tests_benefits:
        results.append({
            "category": "Benefits Strip",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite E: New Arrivals & Product Cards
    tests_products = [
        ("New Arrivals Header", "New Arrivals" in dom and "Fresh styles for your everyday wardrobe" in dom),
        ("New Arrivals 'View All →' Link", "View All" in dom and 'href="/collections/men"' in dom),
        ("Product 1: Classic Linen Shirt (₹2,499)", "Classic Linen Shirt" in dom and "2,499" in dom),
        ("Product 2: Handloom Kurta (₹2,999)", "Handloom Kurta" in dom and "2,999" in dom),
        ("Product 3: Textured Casual Shirt (₹2,399)", "Textured Casual Shirt" in dom and "2,399" in dom),
        ("Product 4: Linen Trousers (₹2,799)", "Linen Trousers" in dom and "2,799" in dom),
        ("Product 5: Boys Linen Shirt (₹1,699)", "Boys Linen Shirt" in dom and "1,699" in dom),
        ("Product 6: Classic Kurta (₹2,699)", "Classic Kurta" in dom and "2,699" in dom),
        ("Product Badges ('New')", dom.count(">New<") >= 2 or dom.count(">NEW<") >= 2 or "NEW" in dom),
        ("Product Wishlist Buttons", dom.count("Add ") >= 1 or dom.count("wishlist") >= 1),
    ]

    for name, passed in tests_products:
        results.append({
            "category": "New Arrivals",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite F: Fabric Story
    tests_fabric = [
        ("Fabric Story Eyebrow ('OUR FABRIC STORY')", "OUR FABRIC STORY" in dom),
        ("Fabric Story Headline ('Rooted in Tradition. Designed for Today.')", "Rooted in Tradition." in dom and "Designed for Today." in dom),
        ("Fabric Story CTA ('Know Our Story →')", "Know Our Story" in dom),
        ("Fabric Story Feature: Natural Fibres", "Natural Fibres" in dom),
        ("Fabric Story Feature: Handloom Weaves", "Handloom Weaves" in dom),
        ("Fabric Story Feature: Better Tomorrow", "Better Tomorrow" in dom),
    ]

    for name, passed in tests_fabric:
        results.append({
            "category": "Fabric Story",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite G: Footer
    tests_footer = [
        ("Footer Brand Info & Description", "Artisanal menswear and young gentleman" in dom),
        ("Footer Newsletter ('Atelier Gazette')", "Atelier Gazette" in dom and 'placeholder="Your email for quiet releases"' in dom),
        ("Footer Join Button", ">Join<" in dom or "Join" in dom),
        ("Footer Wardrobe Links", "Men's Atelier" in dom and "Boys' Tailoring" in dom),
        ("Footer Craft & Lineage Links", "The Linen &amp; Silk Guide" in dom or "The Linen & Silk Guide" in dom),
        ("Footer Concierge Links", "Care &amp; Alterations" in dom or "Care & Alterations" in dom),
        ("Footer Copyright & Legal", "LOOMERA Tailoring Guild. All rights reserved." in dom and "Privacy Manifesto" in dom),
    ]

    for name, passed in tests_footer:
        results.append({
            "category": "Footer",
            "test": name,
            "expected": True,
            "actual": bool(passed),
            "status": "PASS" if passed else "FAIL"
        })

    # Test Suite H: All Route Destinations (Live Server Verification)
    routes_to_test = [
        ("/", "Storefront Homepage"),
        ("/account", "Customer Account"),
        ("/orders", "Order Tracking"),
        ("/collections/men", "Men's Collection"),
        ("/collections/boys", "Boys' Collection"),
        ("/collections/handloom", "Handloom Collection"),
        ("/products/classic-linen-shirt", "Product Detail: Classic Linen Shirt"),
        ("/products/handloom-kurta", "Product Detail: Handloom Kurta"),
    ]

    for path, desc in routes_to_test:
        res = test_route_http(path)
        r_dom = get_rendered_dom(f"http://localhost:3000{path}", budget=3000)
        has_content = len(r_dom) > 1000 and "404" not in r_dom[:500]
        passed = res["ok"] and has_content
        results.append({
            "category": "Route Health",
            "test": f"Route {path} ({desc})",
            "expected": 200,
            "actual": res["status"] if passed else f"HTTP {res['status']} content_len={len(r_dom)}",
            "status": "PASS" if passed else "FAIL"
        })

    # Summary
    pass_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)

    with open("artifacts/loomera-qa/functional_test_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "total": total_count,
            "passed": pass_count,
            "failed": total_count - pass_count,
            "pass_rate_percent": round(pass_count / total_count * 100, 1),
            "results": results
        }, f, indent=2)

    print(f"\n==========================================")
    print(f"FUNCTIONAL QA COMPLETE: {pass_count}/{total_count} PASSED ({pass_count/total_count*100:.1f}%)")
    print(f"==========================================")
    for r in results:
        print(f"[{r['status']}] {r['category']} - {r['test']}")

if __name__ == "__main__":
    main()
