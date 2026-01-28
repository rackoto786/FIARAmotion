import requests
import traceback

try:
    response = requests.get('http://127.0.0.1:5000/api/dashboard/stats')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response:", response.json())
    else:
        print("Error Response:", response.text)
except Exception as e:
    print(f"Exception: {e}")
    traceback.print_exc()
