import urllib.request
import ssl
import json
import re

BASE_URL = "https://loomera-roan.vercel.app"
ctx = ssl.create_default_context()

routes = [
    ("/", "Homepage"),
    ("/collections", "Collections Overview"),
    ("/collections/men", "Men Collection"),
    ("/collections/boys", "Boys Collection"),
    ("/collections/handloom", "Handloom Collection"),
    ("/collections/new-arrivals", "New Arrivals"),
    ("/products/classic-linen-shirt", "Product Detail Page"),
    ("/login", "Login Page"),
    ("/register", "Register Page"),
    ("/checkout", "Checkout Page"),
    ("/admin", "Admin Route (Redirect expected)"),
    ("/guides/linen-care", "Guides / Linen Care"),
    ("/api/health", "API: Health Endpoint"),
    ("/api/products", "API: Products Endpoint"),
]

results = []

for path, label in routes:
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cache-Control": "no-cache"
        }
    )
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as res:
            status = res.status
            headers = dict(res.headers)
            body = res.read().decode('utf-8', errors='replace')
            title_match = re.search(r'<title>(.*?)</title>', body, re.IGNORECASE)
            title = title_match.group(1) if title_match else None
            
            # Look for Next.js build / version traces
            has_next_chunk = "/_next/static/" in body
            
            results.append({
                "path": path,
                "label": label,
                "status": status,
                "title": title,
                "content_length": len(body),
                "has_next_chunk": has_next_chunk,
                "x_vercel_id": headers.get("X-Vercel-Id") or headers.get("x-vercel-id"),
                "x_vercel_cache": headers.get("X-Vercel-Cache") or headers.get("x-vercel-cache"),
                "body_preview": body[:200]
            })
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        headers = dict(e.headers)
        results.append({
            "path": path,
            "label": label,
            "status": e.code,
            "error": str(e),
            "x_vercel_id": headers.get("X-Vercel-Id") or headers.get("x-vercel-id"),
            "body_preview": body[:300]
        })
    except Exception as e:
        results.append({
            "path": path,
            "label": label,
            "status": "ERROR",
            "error": str(e)
        })

print(json.dumps(results, indent=2))
