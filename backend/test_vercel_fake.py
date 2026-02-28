import urllib.request

url = "https://sekure-woad.vercel.app/api/doesnotexist123"
req = urllib.request.Request(url, method="POST")
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except Exception as e:
    print("Error:", e)
