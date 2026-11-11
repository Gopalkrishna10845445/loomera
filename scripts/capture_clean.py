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

async def run(phase="before"):
    out_dir = f"artifacts/loomera-qa/{phase}"
    os.makedirs(out_dir, exist_ok=True)
    temp_dir = tempfile.mkdtemp()
    port = 9230

    chrome_cmd = [
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={temp_dir}",
        f"--remote-debugging-port={port}",
        "--window-size=1440,900",
        "http://localhost:3000/"
    ]
    proc = subprocess.Popen(chrome_cmd)
    await asyncio.sleep(2.5)

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

            async def set_view(w, h, mobile=False):
                await call("Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": 1,
                    "mobile": mobile
                })
                await asyncio.sleep(0.5)

            async def scroll(y):
                await call("Runtime.evaluate", {"expression": f"window.scrollTo(0, {y})"})
                await asyncio.sleep(0.8)

            async def snap(filename):
                res = await call("Page.captureScreenshot", {"format": "png"})
                img_data = base64.b64decode(res["data"])
                path = os.path.join(out_dir, filename)
                with open(path, "wb") as f:
                    f.write(img_data)
                print(f"Captured {filename} ({len(img_data)} bytes)")

            # Wait for initial load
            await asyncio.sleep(3)

            # 1. Desktop Initial / Hero
            await set_view(1440, 900)
            await scroll(0)
            await snap("desktop-home.png")

            # 2. Desktop Collections
            # Find collections offset
            offset_res = await call("Runtime.evaluate", {
                "expression": "document.getElementById('collections') ? document.getElementById('collections').getBoundingClientRect().top + window.scrollY - 80 : 750",
                "returnByValue": True
            })
            col_y = int(offset_res.get("result", {}).get("value", 750))
            await scroll(col_y)
            await snap("desktop-collections.png")

            # 3. Desktop Benefits
            # Benefits is right below collections
            await scroll(col_y + 220)
            await snap("desktop-benefits.png")

            # 4. Desktop Arrivals
            arr_res = await call("Runtime.evaluate", {
                "expression": "document.getElementById('new-arrivals') ? document.getElementById('new-arrivals').getBoundingClientRect().top + window.scrollY - 80 : 1100",
                "returnByValue": True
            })
            arr_y = int(arr_res.get("result", {}).get("value", 1100))
            await scroll(arr_y)
            await snap("desktop-arrivals.png")

            # 5. Desktop Fabric Story
            fab_res = await call("Runtime.evaluate", {
                "expression": "document.getElementById('fabric-story') ? document.getElementById('fabric-story').getBoundingClientRect().top + window.scrollY - 60 : 1600",
                "returnByValue": True
            })
            fab_y = int(fab_res.get("result", {}).get("value", 1600))
            await scroll(fab_y)
            await snap("desktop-fabric-story.png")

            # 6. Desktop Footer
            foot_res = await call("Runtime.evaluate", {
                "expression": "document.querySelector('footer') ? document.querySelector('footer').getBoundingClientRect().top + window.scrollY - 100 : 2100",
                "returnByValue": True
            })
            foot_y = int(foot_res.get("result", {}).get("value", 2100))
            await scroll(foot_y)
            await snap("desktop-footer.png")

            # 7. Laptop 1024x768
            await set_view(1024, 768)
            await scroll(0)
            await snap("laptop-home.png")

            # 8. Tablet 768x1024
            await set_view(768, 1024)
            await scroll(0)
            await snap("tablet-home.png")

            # 9. Mobile 390x844
            await set_view(390, 844, mobile=True)
            await scroll(0)
            await snap("mobile-home.png")

    finally:
        proc.terminate()

if __name__ == "__main__":
    phase = sys.argv[1] if len(sys.argv) > 1 else "before"
    asyncio.run(run(phase))
