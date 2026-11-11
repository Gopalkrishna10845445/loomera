import subprocess
import tempfile
import os
import sys
import time
import json
import base64
import urllib.request

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def run_capture(phase="after"):
    out_dir = f"artifacts/loomera-qa/{phase}"
    os.makedirs(out_dir, exist_ok=True)
    temp_dir = tempfile.mkdtemp()
    port = 9240

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
    time.sleep(2.5)

    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]["webSocketDebuggerUrl"]

        # Use sync or simple CDP calls
        import websockets
        import asyncio

        async def cdp_session():
            async with websockets.connect(ws_url, max_size=35*1024*1024, ping_interval=None) as ws:
                req_id = 0
                async def send(method, params=None):
                    nonlocal req_id
                    req_id += 1
                    msg = {"id": req_id, "method": method}
                    if params:
                        msg["params"] = params
                    await ws.send(json.dumps(msg))
                    while True:
                        raw = await ws.recv()
                        data = json.loads(raw)
                        if data.get("id") == req_id:
                            return data.get("result", {})

                await send("Page.enable")
                await send("Runtime.enable")

                async def set_vp(w, h, mobile=False):
                    await send("Emulation.setDeviceMetricsOverride", {
                        "width": w,
                        "height": h,
                        "deviceScaleFactor": 1,
                        "mobile": mobile
                    })
                    await asyncio.sleep(0.5)

                async def snap(name):
                    res = await send("Page.captureScreenshot", {"format": "png"})
                    img_bytes = base64.b64decode(res["data"])
                    path = os.path.join(out_dir, name)
                    with open(path, "wb") as f:
                        f.write(img_bytes)
                    print(f"Captured {name} ({len(img_bytes)} bytes)")

                # Navigate to localhost:3000
                await send("Page.navigate", {"url": "http://localhost:3000/"})
                await asyncio.sleep(3.5)

                # 1. Desktop 1440x900 Hero
                await set_vp(1440, 900)
                await send("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
                await asyncio.sleep(0.5)
                await snap("desktop-home.png")

                # 2. Desktop Collections
                await send("Runtime.evaluate", {"expression": "document.getElementById('collections').scrollIntoView({ behavior: 'instant', block: 'start' })"})
                await asyncio.sleep(0.6)
                await snap("desktop-collections.png")

                # 3. Desktop Benefits
                await send("Runtime.evaluate", {"expression": "document.getElementById('benefits').scrollIntoView({ behavior: 'instant', block: 'center' })"})
                await asyncio.sleep(0.6)
                await snap("desktop-benefits.png")

                # 4. Desktop New Arrivals
                await send("Runtime.evaluate", {"expression": "document.getElementById('new-arrivals').scrollIntoView({ behavior: 'instant', block: 'start' })"})
                await asyncio.sleep(0.6)
                await snap("desktop-arrivals.png")

                # 5. Desktop Fabric Story
                await send("Runtime.evaluate", {"expression": "document.getElementById('fabric-story').scrollIntoView({ behavior: 'instant', block: 'start' })"})
                await asyncio.sleep(0.6)
                await snap("desktop-fabric-story.png")

                # 6. Desktop Footer
                await send("Runtime.evaluate", {"expression": "document.getElementById('footer').scrollIntoView({ behavior: 'instant', block: 'start' })"})
                await asyncio.sleep(0.6)
                await snap("desktop-footer.png")

                # 7. Laptop 1024x768
                await set_vp(1024, 768)
                await send("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
                await asyncio.sleep(0.8)
                await snap("laptop-home.png")

                # 8. Tablet 768x1024
                await set_vp(768, 1024)
                await send("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
                await asyncio.sleep(0.8)
                await snap("tablet-home.png")

                # 9. Mobile 390x844
                await set_vp(390, 844, mobile=True)
                await send("Runtime.evaluate", {"expression": "window.scrollTo(0, 0)"})
                await asyncio.sleep(0.8)
                await snap("mobile-home.png")

        asyncio.run(cdp_session())

    finally:
        proc.terminate()

if __name__ == "__main__":
    p = sys.argv[1] if len(sys.argv) > 1 else "after"
    run_capture(p)
