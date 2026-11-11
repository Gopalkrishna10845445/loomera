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

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

async def capture_cdp_suite(phase="before"):
    out_dir = f"artifacts/loomera-qa/{phase}"
    os.makedirs(out_dir, exist_ok=True)
    temp_dir = tempfile.mkdtemp()
    port = 9225

    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--remote-debugging-port={port}",
        "--window-size=1440,900",
        "about:blank"
    ]
    proc = subprocess.Popen(chrome_cmd)
    await asyncio.sleep(2)

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=40*1024*1024) as ws:
            req_id = 1
            async def send_cmd(method, params=None):
                nonlocal req_id
                req_id += 1
                msg = {"id": req_id, "method": method}
                if params:
                    msg["params"] = params
                await ws.send(json.dumps(msg))
                while True:
                    raw = await ws.recv()
                    res = json.loads(raw)
                    if res.get("id") == req_id:
                        return res.get("result", {})

            await send_cmd("Page.enable")
            await send_cmd("Runtime.enable")
            await send_cmd("DOM.enable")

            async def set_viewport(w, h, scale=1, is_mobile=False):
                await send_cmd("Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": scale,
                    "mobile": is_mobile
                })

            async def screenshot(file_path, full_page=False):
                params = {"format": "png"}
                if full_page:
                    params["captureBeyondViewport"] = True
                ss = await send_cmd("Page.captureScreenshot", params)
                data = base64.b64decode(ss["data"])
                with open(file_path, "wb") as f:
                    f.write(data)
                print(f"Captured: {file_path} ({len(data)} bytes)")

            async def scroll_to(selector):
                expr = f'''
                (() => {{
                    const el = document.querySelector("{selector}");
                    if (el) {{
                        el.scrollIntoView({{ behavior: "instant", block: "start" }});
                        return true;
                    }}
                    return false;
                }})()
                '''
                await send_cmd("Runtime.evaluate", {"expression": expr})
                await asyncio.sleep(1)

            # --- DESKTOP 1440x900 ---
            print("\nCapturing Desktop 1440x900...")
            await set_viewport(1440, 900)
            await send_cmd("Page.navigate", {"url": "http://localhost:3000/"})
            await asyncio.sleep(4)

            # Full page
            await screenshot(f"{out_dir}/desktop-fullpage.png", full_page=True)
            # Hero / Initial Viewport
            await screenshot(f"{out_dir}/desktop-home.png")
            
            # Collections
            await scroll_to("#collections")
            await screenshot(f"{out_dir}/desktop-collections.png")

            # Benefits
            await scroll_to("section:has(#collections) + section, #new-arrivals")
            # Let's scroll specifically to benefits / arrivals
            await send_cmd("Runtime.evaluate", {"expression": 'window.scrollTo(0, 950)'})
            await asyncio.sleep(1)
            await screenshot(f"{out_dir}/desktop-benefits.png")

            # New Arrivals
            await scroll_to("#new-arrivals")
            await screenshot(f"{out_dir}/desktop-arrivals.png")

            # Fabric Story
            await scroll_to("#fabric-story")
            await screenshot(f"{out_dir}/desktop-fabric-story.png")

            # Footer
            await scroll_to("footer")
            await screenshot(f"{out_dir}/desktop-footer.png")

            # --- LAPTOP 1024x768 ---
            print("\nCapturing Laptop 1024x768...")
            await set_viewport(1024, 768)
            await send_cmd("Runtime.evaluate", {"expression": 'window.scrollTo(0, 0)'})
            await asyncio.sleep(1.5)
            await screenshot(f"{out_dir}/laptop-home.png")

            # --- TABLET 768x1024 ---
            print("\nCapturing Tablet 768x1024...")
            await set_viewport(768, 1024)
            await send_cmd("Runtime.evaluate", {"expression": 'window.scrollTo(0, 0)'})
            await asyncio.sleep(1.5)
            await screenshot(f"{out_dir}/tablet-home.png")

            # --- MOBILE 390x844 ---
            print("\nCapturing Mobile 390x844...")
            await set_viewport(390, 844, is_mobile=True)
            await send_cmd("Runtime.evaluate", {"expression": 'window.scrollTo(0, 0)'})
            await asyncio.sleep(1.5)
            await screenshot(f"{out_dir}/mobile-home.png")

    finally:
        proc.terminate()

if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else "before"
    asyncio.run(capture_cdp_suite(p))
