import urllib.request
import re

req = urllib.request.Request('https://loomera-roan.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as res:
    html = res.read().decode('utf-8')

scripts = re.findall(r'src="(/_next/static/[^"]+\.js)"', html)
print(f"Found {len(scripts)} scripts in HTML")

found_versions = set()
for s in scripts:
    js_url = f"https://loomera-roan.vercel.app{s}"
    try:
        req_js = urllib.request.Request(js_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_js) as js_res:
            content = js_res.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'16\.4\.\d+', content)
            if matches:
                print(f"File {s}: found Next.js versions: {set(matches)}")
                found_versions.update(matches)
    except Exception as e:
        print(s, e)

print("Total unique Next.js version strings found in bundles:", found_versions)
