import subprocess
import tempfile
import os
import sys
import time

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_DIR = os.path.abspath("artifacts/loomera-final-qa/before")
os.makedirs(BASE_DIR, exist_ok=True)

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
    print("Capturing baseline screenshots into artifacts/loomera-final-qa/before/ ...", flush=True)
    tasks = [
        # Homepage
        ("http://localhost:3000/", os.path.join(BASE_DIR, "homepage-desktop.png"), 1440, 900),
        ("http://localhost:3000/", os.path.join(BASE_DIR, "homepage-laptop.png"), 1024, 768),
        ("http://localhost:3000/", os.path.join(BASE_DIR, "homepage-tablet.png"), 768, 1024),
        ("http://localhost:3000/", os.path.join(BASE_DIR, "homepage-mobile.png"), 390, 844),
        # Men
        ("http://localhost:3000/collections/men", os.path.join(BASE_DIR, "men-desktop.png"), 1440, 900),
        ("http://localhost:3000/collections/men", os.path.join(BASE_DIR, "men-laptop.png"), 1024, 768),
        ("http://localhost:3000/collections/men", os.path.join(BASE_DIR, "men-tablet.png"), 768, 1024),
        ("http://localhost:3000/collections/men", os.path.join(BASE_DIR, "men-mobile.png"), 390, 844),
        # Boys
        ("http://localhost:3000/collections/boys", os.path.join(BASE_DIR, "boys-desktop.png"), 1440, 900),
        ("http://localhost:3000/collections/boys", os.path.join(BASE_DIR, "boys-laptop.png"), 1024, 768),
        ("http://localhost:3000/collections/boys", os.path.join(BASE_DIR, "boys-tablet.png"), 768, 1024),
        ("http://localhost:3000/collections/boys", os.path.join(BASE_DIR, "boys-mobile.png"), 390, 844),
        # Handloom
        ("http://localhost:3000/collections/handloom", os.path.join(BASE_DIR, "handloom-desktop.png"), 1440, 900),
        ("http://localhost:3000/collections/handloom", os.path.join(BASE_DIR, "handloom-laptop.png"), 1024, 768),
        ("http://localhost:3000/collections/handloom", os.path.join(BASE_DIR, "handloom-tablet.png"), 768, 1024),
        ("http://localhost:3000/collections/handloom", os.path.join(BASE_DIR, "handloom-mobile.png"), 390, 844),
        # New Arrivals
        ("http://localhost:3000/collections/new-arrivals", os.path.join(BASE_DIR, "new-arrivals-desktop.png"), 1440, 900),
        ("http://localhost:3000/collections/new-arrivals", os.path.join(BASE_DIR, "new-arrivals-laptop.png"), 1024, 768),
        ("http://localhost:3000/collections/new-arrivals", os.path.join(BASE_DIR, "new-arrivals-tablet.png"), 768, 1024),
        ("http://localhost:3000/collections/new-arrivals", os.path.join(BASE_DIR, "new-arrivals-mobile.png"), 390, 844),
    ]

    for url, path, w, h in tasks:
        capture_screenshot(url, path, w, h)

    print("Baseline capture finished.", flush=True)

if __name__ == "__main__":
    main()
