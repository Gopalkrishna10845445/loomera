import urllib.request
import json
import time
import sys

commit_sha = '0bcde9ec212cdee3a2cdc1766143ce0da21fb030'
url = f'https://api.github.com/repos/Gopalkrishna10845445/loomera/commits/{commit_sha}/statuses'

print(f"Monitoring deployment for commit {commit_sha}...")

for i in range(15):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as res:
            statuses = json.loads(res.read().decode())
            if statuses:
                latest = statuses[0]
                state = latest.get('state')
                desc = latest.get('description')
                target = latest.get('target_url')
                print(f"[{i*10}s] State: {state} | Description: {desc} | URL: {target}")
                if state in ('success', 'failure', 'error'):
                    sys.exit(0 if state == 'success' else 1)
    except Exception as e:
        print("Error fetching status:", e)
    time.sleep(10)
