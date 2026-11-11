import subprocess
import tempfile
import os
import sys
import time
from PIL import Image, ImageChops, ImageEnhance
import numpy as np

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def capture_viewport(out_path, width, height, budget=5000):
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
        "http://localhost:3000/"
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    print(f"Captured viewport: {out_path} ({width}x{height})")

def main():
    after_dir = "artifacts/loomera-qa/after"
    before_dir = "artifacts/loomera-qa/before"
    comp_dir = "artifacts/loomera-qa/comparisons"
    os.makedirs(after_dir, exist_ok=True)
    os.makedirs(comp_dir, exist_ok=True)

    # 1. Capture Full Page at 1425x2520 (matches reference aspect ratio and height)
    fullpage_path = f"{after_dir}/desktop-fullpage.png"
    temp_dir = tempfile.mkdtemp()
    cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        "--window-size=1425,2520",
        "--virtual-time-budget=6000",
        f"--screenshot={os.path.abspath(fullpage_path)}",
        "http://localhost:3000/"
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=35)
    print(f"Captured fullpage: {fullpage_path}")

    # Open rendered fullpage
    im_rendered = Image.open(fullpage_path)
    W, H = im_rendered.size
    print(f"Rendered dimensions: {W} x {H}")

    # Crop desktop sections
    # 1. Initial desktop viewport (1425 x 900)
    im_rendered.crop((0, 0, W, min(900, H))).save(f"{after_dir}/desktop-home.png")
    # 2. Collections (y=780 to 1050)
    im_rendered.crop((0, 780, W, 1050)).save(f"{after_dir}/desktop-collections.png")
    # 3. Benefits (y=1040 to 1160)
    im_rendered.crop((0, 1040, W, 1160)).save(f"{after_dir}/desktop-benefits.png")
    # 4. New Arrivals (y=1140 to 1530)
    im_rendered.crop((0, 1140, W, 1530)).save(f"{after_dir}/desktop-arrivals.png")
    # 5. Fabric Story (y=1520 to 2000)
    im_rendered.crop((0, 1520, W, 2000)).save(f"{after_dir}/desktop-fabric-story.png")
    # 6. Footer (y=2000 to H)
    im_rendered.crop((0, 2000, W, H)).save(f"{after_dir}/desktop-footer.png")
    print("Desktop section crops saved.")

    # 2. Capture Viewports
    # Laptop: 1024x768
    capture_viewport(f"{after_dir}/laptop-home.png", 1024, 768)
    # Tablet: 768x1024
    capture_viewport(f"{after_dir}/tablet-home.png", 768, 1024)
    # Mobile: 390x844
    capture_viewport(f"{after_dir}/mobile-home.png", 390, 844)

    # 3. Reference Image Comparison
    ref_path = "artifacts/loomera-qa/reference_homepage.png"
    if os.path.exists(ref_path):
        im_ref = Image.open(ref_path)
        print(f"Reference dimensions: {im_ref.size}")

        # Ensure same size for pixel comparison
        target_size = (1425, 2484)
        im_ref_resized = im_ref.resize(target_size, Image.Resampling.LANCZOS).convert("RGB")
        im_rend_resized = im_rendered.resize(target_size, Image.Resampling.LANCZOS).convert("RGB")

        # Side by side (1425*2 x 2484)
        sbs = Image.new("RGB", (target_size[0] * 2, target_size[1]))
        sbs.paste(im_ref_resized, (0, 0))
        sbs.paste(im_rend_resized, (target_size[0], 0))
        sbs.save(f"{comp_dir}/side_by_side.png")
        print(f"Saved {comp_dir}/side_by_side.png")

        # 50% opacity overlay
        overlay = Image.blend(im_ref_resized, im_rend_resized, alpha=0.5)
        overlay.save(f"{comp_dir}/overlay_50.png")
        print(f"Saved {comp_dir}/overlay_50.png")

        # Pixel difference image
        diff = ImageChops.difference(im_ref_resized, im_rend_resized)
        # Invert or enhance for clear visual inspection
        diff_enhanced = ImageEnhance.Contrast(diff).enhance(3.0)
        diff_enhanced.save(f"{comp_dir}/difference.png")
        print(f"Saved {comp_dir}/difference.png")

        # Calculate Mean Squared Error & Normalized Similarity Score
        arr_ref = np.array(im_ref_resized, dtype=np.float32)
        arr_rend = np.array(im_rend_resized, dtype=np.float32)
        mse = np.mean((arr_ref - arr_rend) ** 2)
        psnr = 10 * np.log10(255**2 / mse) if mse > 0 else 100
        similarity_pct = max(0, 100 - (np.mean(np.abs(arr_ref - arr_rend)) / 255.0) * 100)
        print(f"Comparison Metrics: MSE={mse:.2f}, PSNR={psnr:.2f}dB, Visual Similarity={similarity_pct:.2f}%")

        with open(f"{comp_dir}/metrics.json", "w") as f:
            import json
            json.dump({
                "mse": round(float(mse), 2),
                "psnr_db": round(float(psnr), 2),
                "visual_similarity_percent": round(float(similarity_pct), 2),
                "reference_dimensions": list(im_ref.size),
                "rendered_dimensions": list(im_rendered.size)
            }, f, indent=2)

if __name__ == "__main__":
    main()
