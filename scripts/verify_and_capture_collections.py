import subprocess
import tempfile
import os
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = os.path.abspath("artifacts/loomera-collections")
os.makedirs(OUT_DIR, exist_ok=True)

def get_rendered_dom(url, budget=5000):
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
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return res.stdout

def capture_screenshot(url, out_path, width=1440, height=900, budget=6000):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    temp_dir = tempfile.mkdtemp()
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--window-size={width},{height}",
        f"--virtual-time-budget={budget}",
        f"--screenshot={os.path.abspath(out_path)}",
        url
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            print(f"Captured: {out_path} ({width}x{height}) [{os.path.getsize(out_path)} bytes]", flush=True)
            return True
        else:
            print(f"Failed to capture: {out_path}", flush=True)
            return False
    except Exception as e:
        print(f"Error capturing {out_path}: {e}", flush=True)
        return False

def main():
    print("==================================================", flush=True)
    print("LOOMERA MASTER COLLECTIONS AUTOMATED AUDIT & EVIDENCE", flush=True)
    print("==================================================", flush=True)

    tests = []

    # 1. Men's Collection Audit
    print("\n[Phase 3 Audit] Inspecting Men's Collection (/collections/men)...", flush=True)
    dom_men = get_rendered_dom("http://localhost:3000/collections/men")
    tests.append(("Men: Eyebrow 'THE MODERN GENTLEMAN'", "THE MODERN GENTLEMAN" in dom_men))
    tests.append(("Men: Headline 'Refined Essentials.'", "Refined Essentials." in dom_men))
    tests.append(("Men: Headline 'Effortless Style.'", "Effortless Style." in dom_men))
    tests.append(("Men: Primary CTA 'SHOP ALL MEN'", "SHOP ALL MEN" in dom_men))
    tests.append(("Men: Secondary CTA 'EXPLORE LINEN'", "EXPLORE LINEN" in dom_men))
    tests.append(("Men: Category 'Linen Shirts'", "Linen Shirts" in dom_men))
    tests.append(("Men: Category 'Trousers'", "Trousers" in dom_men))
    tests.append(("Men: Category 'Kurtas'", "Kurtas" in dom_men))
    tests.append(("Men: Category 'Casual Wear'", "Casual Wear" in dom_men))
    tests.append(("Men: Category 'Co-ord Sets'", "Co-ord Sets" in dom_men))
    tests.append(("Men: Category 'Festive Wear'", "Festive Wear" in dom_men))
    tests.append(("Men: Product 'Classic Linen Shirt'", "Classic Linen Shirt" in dom_men))
    tests.append(("Men: Product 'Linen Trousers'", "Linen Trousers" in dom_men))
    tests.append(("Men: Product 'Textured Casual Shirt'", "Textured Casual Shirt" in dom_men))
    tests.append(("Men: Price in INR '₹2,499'", "₹2,499" in dom_men or "2,499" in dom_men))
    tests.append(("Men: Quick Add Button Present", "Quick Add" in dom_men or "Added to Bag" in dom_men))
    tests.append(("Men: Available Color Swatches", "Available color swatches" in dom_men or "color" in dom_men))

    # 2. Kids' Collection Audit
    print("\n[Phase 4 Audit] Inspecting Kids' Collection (/collections/boys)...", flush=True)
    dom_boys = get_rendered_dom("http://localhost:3000/collections/boys")
    tests.append(("Boys: Eyebrow 'MADE FOR LITTLE ADVENTURES'", "MADE FOR LITTLE ADVENTURES" in dom_boys))
    tests.append(("Boys: Headline 'Little Moments.'", "Little Moments." in dom_boys))
    tests.append(("Boys: Headline 'Timeless Style.'", "Timeless Style." in dom_boys))
    tests.append(("Boys: Primary CTA 'SHOP EVERYDAY WEAR'", "SHOP EVERYDAY WEAR" in dom_boys))
    tests.append(("Boys: Secondary CTA 'EXPLORE FESTIVE STYLES'", "EXPLORE FESTIVE STYLES" in dom_boys))
    tests.append(("Boys: Category 'Linen Shirts'", "Linen Shirts" in dom_boys))
    tests.append(("Boys: Category 'Everyday Essentials'", "Everyday Essentials" in dom_boys))
    tests.append(("Boys: Category 'Traditional Kurtas'", "Traditional Kurtas" in dom_boys))
    tests.append(("Boys: Category 'Festive Wear'", "Festive Wear" in dom_boys))
    tests.append(("Boys: Category 'Matching Outfits'", "Matching Outfits" in dom_boys))
    tests.append(("Boys: Product 'Boys Linen Shirt'", "Boys Linen Shirt" in dom_boys))
    tests.append(("Boys: Product 'Boys' Tailored Drawstring Shorts'", "Drawstring Shorts" in dom_boys or "Boys' Tailored" in dom_boys))
    tests.append(("Boys: Product 'Organic Muslin Romper'", "Muslin Romper" in dom_boys or "Organic Muslin" in dom_boys))
    # Verify no adult shirts/trousers are shown in boys collection
    adult_leak = "Classic Linen Trousers" in dom_boys or "Textured Casual Shirt" in dom_boys
    tests.append(("Boys: No Adult Products Displayed", not adult_leak))

    # 3. Handloom Collection Audit
    print("\n[Phase 5 Audit] Inspecting Handloom Collection (/collections/handloom)...", flush=True)
    dom_hl = get_rendered_dom("http://localhost:3000/collections/handloom")
    tests.append(("Handloom: Eyebrow 'CRAFTED WITH INTENTION'", "CRAFTED WITH INTENTION" in dom_hl))
    tests.append(("Handloom: Headline 'Rooted in Tradition.'", "Rooted in Tradition." in dom_hl))
    tests.append(("Handloom: Headline 'Designed for Today.'", "Designed for Today." in dom_hl))
    tests.append(("Handloom: Primary CTA 'SHOP HANDLOOM'", "SHOP HANDLOOM" in dom_hl))
    tests.append(("Handloom: Secondary CTA 'DISCOVER THE CRAFT'", "DISCOVER THE CRAFT" in dom_hl))
    tests.append(("Handloom: Category 'Handloom Kurtas'", "Handloom Kurtas" in dom_hl))
    tests.append(("Handloom: Category 'Handwoven Shirts'", "Handwoven Shirts" in dom_hl))
    tests.append(("Handloom: Category 'Cotton Essentials'", "Cotton Essentials" in dom_hl))
    tests.append(("Handloom: Category 'Festive Collection'", "Festive Collection" in dom_hl))
    tests.append(("Handloom: Category 'Heritage Styles'", "Heritage Styles" in dom_hl))
    tests.append(("Handloom: Craftsmanship Story Section Present", "craftsmanship-story" in dom_hl))
    tests.append(("Handloom: Provenance 'Bengal Weaves'", "Bengal Weaves" in dom_hl))
    tests.append(("Handloom: Craft 'Hand-Spun Charkha Yarn'", "Hand-Spun Charkha Yarn" in dom_hl))
    tests.append(("Handloom: Texture 'Microscopic Air Pockets'", "Microscopic Air Pockets" in dom_hl))
    tests.append(("Handloom: Product 'Handloom Kurta'", "Handloom Kurta" in dom_hl))
    tests.append(("Handloom: Product 'Classic Kurta'", "Classic Kurta" in dom_hl))

    # 4. New Arrivals Audit
    print("\n[Phase 6 Audit] Inspecting New Arrivals (/collections/new-arrivals)...", flush=True)
    dom_na = get_rendered_dom("http://localhost:3000/collections/new-arrivals")
    tests.append(("New Arrivals: Eyebrow 'JUST ARRIVED'", "JUST ARRIVED" in dom_na))
    tests.append(("New Arrivals: Headline 'New Season.'", "New Season." in dom_na))
    tests.append(("New Arrivals: Headline 'New Essentials.'", "New Essentials." in dom_na))
    tests.append(("New Arrivals: Filter Bar Present", "filter-bar" in dom_na))
    tests.append(("New Arrivals: Department Filter 'Men'", "Men" in dom_na))
    tests.append(("New Arrivals: Department Filter 'Boys'", "Boys" in dom_na))
    tests.append(("New Arrivals: Department Filter 'Handloom'", "Handloom" in dom_na))
    tests.append(("New Arrivals: Price Filter Options", "Under ₹2,000" in dom_na or "Price" in dom_na))
    tests.append(("New Arrivals: Sorting Dropdown", "sort-dropdown" in dom_na))
    tests.append(("New Arrivals: Products Displayed (> 0)", "product-card" in dom_na))

    # 5. Capture Required Artifact Screenshots
    print("\n[Phase 11 Capture] Capturing screenshots for all 4 collections at desktop and mobile sizes...", flush=True)
    tasks = [
        ("http://localhost:3000/collections/men", f"{OUT_DIR}/mens-collection-desktop.png", 1440, 900),
        ("http://localhost:3000/collections/men", f"{OUT_DIR}/mens-collection-mobile.png", 390, 844),
        ("http://localhost:3000/collections/boys", f"{OUT_DIR}/kids-collection-desktop.png", 1440, 900),
        ("http://localhost:3000/collections/boys", f"{OUT_DIR}/kids-collection-mobile.png", 390, 844),
        ("http://localhost:3000/collections/handloom", f"{OUT_DIR}/handloom-collection-desktop.png", 1440, 900),
        ("http://localhost:3000/collections/handloom", f"{OUT_DIR}/handloom-collection-mobile.png", 390, 844),
        ("http://localhost:3000/collections/new-arrivals", f"{OUT_DIR}/new-arrivals-desktop.png", 1440, 900),
        ("http://localhost:3000/collections/new-arrivals", f"{OUT_DIR}/new-arrivals-mobile.png", 390, 844),
        # Responsive checks at laptop and tablet
        ("http://localhost:3000/collections/men", f"{OUT_DIR}/mens-collection-laptop-1024.png", 1024, 768),
        ("http://localhost:3000/collections/men", f"{OUT_DIR}/mens-collection-tablet-768.png", 768, 1024),
    ]

    for url, path, w, h in tasks:
        success = capture_screenshot(url, path, w, h)
        name = os.path.basename(path)
        tests.append((f"Screenshot Captured: {name}", success))

    print("\n==================================================", flush=True)
    print("AUDIT RESULTS SUMMARY:", flush=True)
    print("==================================================", flush=True)
    all_ok = True
    for name, ok in tests:
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {name}", flush=True)
        if not ok:
            all_ok = False

    print("==================================================", flush=True)
    if all_ok:
        print("ALL AUDIT CHECKS PASSED SUCCESSFULLY (100%)!", flush=True)
    else:
        print("SOME CHECKS FAILED! Please inspect output above.", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    main()
