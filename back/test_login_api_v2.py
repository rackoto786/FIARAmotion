
import urllib.request
import json
import ssl

url = "http://127.0.0.1:5000/api/auth/login"
data = json.dumps({
    "email": "admin@fiaramotion.com",
    "password": "demo"
}).encode('utf-8')

headers = {
    "Content-Type": "application/json"
}

print(f"Testing login for admin@fiaramotion.com...")
req = urllib.request.Request(url, data=data, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Response Body: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    print(f"Response Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error calling API: {e}")

# Wrong password test
data_wrong = json.dumps({
    "email": "admin@fiaramotion.com",
    "password": "wrong"
}).encode('utf-8')

print(f"\nTesting login with wrong password...")
req = urllib.request.Request(url, data=data_wrong, headers=headers, method='POST')
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Response Body: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    print(f"Response Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error calling API: {e}")
