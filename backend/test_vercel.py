import urllib.request
import json

url = "https://sekure-woad.vercel.app/api/share"
data = json.dumps({
    "encrypted_data": "test",
    "iv": "test",
    "expires_in": "1h",
    "access_mode": "anyone",
    "allowed_usernames": []
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
