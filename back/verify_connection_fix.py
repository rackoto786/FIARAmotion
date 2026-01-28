import urllib.request
import urllib.error
import sys

base_url = "http://127.0.0.1:5000/api"

endpoints = [
    "/notifications",
    "/dashboard/stats",
    "/health"
]

failed = False

for endpoint in endpoints:
    url = f"{base_url}{endpoint}"
    print(f"Checking {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            print(f"Status: {response.getcode()}")
            if response.getcode() == 200:
                print("OK")
            else:
                print("Unexpected status")
                failed = True
    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} {e.reason}")
        if e.code in [401, 403]:
             print("Connection successful (even if auth failed)")
        else:
             failed = True
    except urllib.error.URLError as e:
        print(f"URLError: {e.reason}")
        failed = True
    except Exception as e:
        print(f"FAILED: {e}")
        failed = True

if failed:
    sys.exit(1)
else:
    print("All checks passed (connection-wise)")
    sys.exit(0)
