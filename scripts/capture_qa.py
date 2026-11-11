import subprocess
import tempfile
import os
import sys
import time

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def capture_one(url, out_path, width=1440, height=900, budget=6000):
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
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
        if os.path.exists(out_path):
            size = os.path.getsize(out_path)
            print(f"Captured: {out_path} ({size} bytes)")
            return True
        else:
            print(f"Failed to capture: {out_path}, err: {res.stderr}")
            return False
    except Exception as e:
        print(f"Exception capturing {out_path}: {e}")
        return False

def run_suite(phase="before"):
    base = "http://localhost:3000/"
    out = f"artifacts/loomera-qa/{phase}"
    
    tasks = [
        (base, f"{out}/desktop-home.png", 1440, 900),
        (f"{base}#collections", f"{out}/desktop-collections.png", 1440, 900),
        (f"{base}#new-arrivals", f"{out}/desktop-arrivals.png", 1440, 900),
        (f"{base}#fabric-story", f"{out}/desktop-fabric-story.png", 1440, 900),
        (base, f"{out}/laptop-home.png", 1024, 768),
        (base, f"{out}/tablet-home.png", 768, 1024),
        (base, f"{out}/mobile-home.png", 390, 844),
    ]
    
    for url, path, w, h in tasks:
        capture_one(url, path, w, h)

if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else "before"
    run_suite(p)
