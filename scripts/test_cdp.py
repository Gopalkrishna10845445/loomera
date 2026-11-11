import subprocess
import time
import json
import urllib.request
import asyncio
import websockets
import tempfile
import os
import base64

async def main():
    temp_dir = tempfile.mkdtemp()
    chrome_cmd = [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        f'--user-data-dir={temp_dir}',
        '--remote-debugging-port=9224',
        '--window-size=1440,900',
        'about:blank'
    ]
    proc = subprocess.Popen(chrome_cmd)
    await asyncio.sleep(2)

    try:
        with urllib.request.urlopen('http://127.0.0.1:9224/json') as resp:
            tabs = json.loads(resp.read().decode())
            ws_url = tabs[0]['webSocketDebuggerUrl']

        async with websockets.connect(ws_url, max_size=25*1024*1024) as ws:
            req_id = 1
            console_logs = []

            async def send_cmd(method, params=None):
                nonlocal req_id
                req_id += 1
                msg = {'id': req_id, 'method': method}
                if params:
                    msg['params'] = params
                await ws.send(json.dumps(msg))
                while True:
                    raw = await ws.recv()
                    res = json.loads(raw)
                    if 'method' in res and res['method'] == 'Runtime.consoleAPICalled':
                        console_logs.append(res['params'])
                    if res.get('id') == req_id:
                        return res.get('result', {})

            await send_cmd('Page.enable')
            await send_cmd('Runtime.enable')
            await send_cmd('Emulation.setDeviceMetricsOverride', {
                'width': 1440,
                'height': 900,
                'deviceScaleFactor': 1,
                'mobile': False
            })

            await send_cmd('Page.navigate', {'url': 'http://localhost:3000/'})
            # Wait 4 seconds for full hydration and CSS transitions
            await asyncio.sleep(4)

            eval_res = await send_cmd('Runtime.evaluate', {
                'expression': 'JSON.stringify({'
                              'h1Text: document.querySelector("h1") ? document.querySelector("h1").innerText : "NO H1",'
                              'h1Opacity: document.querySelector("h1") ? window.getComputedStyle(document.querySelector("h1")).opacity : "N/A",'
                              'heroHeight: document.querySelector("section") ? document.querySelector("section").offsetHeight : 0,'
                              'imgCount: document.querySelectorAll("img").length'
                              '})',
                'returnByValue': True
            })
            print('DOM check:', eval_res.get('result', {}).get('value'))

            # Screenshot
            ss = await send_cmd('Page.captureScreenshot', {'format': 'png'})
            data = base64.b64decode(ss['data'])
            os.makedirs('artifacts/loomera-qa/before', exist_ok=True)
            with open('artifacts/loomera-qa/before/desktop-home-hydrated.png', 'wb') as f:
                f.write(data)
            print('Saved artifacts/loomera-qa/before/desktop-home-hydrated.png, size:', len(data))
    finally:
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(main())
