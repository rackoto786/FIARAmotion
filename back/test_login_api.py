
import requests
import json

url = "http://127.0.0.1:5000/api/auth/login"
payload = {
    "email": "admin@fiaramotion.com",
    "password": "demo"
}
headers = {
    "Content-Type": "application/json"
}

print(f"Testing login for {payload['email']}...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error calling API: {e}")

payload["password"] = "wrong"
print(f"\nTesting login with wrong password...")
try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error calling API: {e}")
