import urllib.request

url = "https://sekure-woad.vercel.app/api/share"
req = urllib.request.Request(url, method="OPTIONS", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,content-type"
})

try:
    with urllib.request.urlopen(req) as response:
        print("Status", response.status)
        print("Headers:")
        for k, v in response.headers.items():
            print(f"{k}: {v}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
