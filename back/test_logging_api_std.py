import urllib.request
import json

token = "fcd2575e299faa5744f1971fd87a5e381058a9545968505484f849468115b5a2"
base_url = "http://127.0.0.1:5000/api"

def make_request(url, method="GET", data=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, headers=headers, method=method)
    if data:
        json_data = json.dumps(data).encode('utf-8')
        req.data = json_data
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8'), response.status
    except urllib.error.HTTPError as e:
        return e.read().decode('utf-8'), e.code
    except Exception as e:
        return str(e), 500

# 1. Get vehicles
body, status = make_request(f"{base_url}/vehicles")
if status != 200:
    print(f"Failed to get vehicles: {status} - {body}")
    exit()

vehicles = json.loads(body)
if not vehicles:
    print("No vehicles found")
    exit()

vehicle = vehicles[0]
vehicle_id = vehicle['id']
print(f"Testing with vehicle ID: {vehicle_id}")

# 2. Update vehicle
payload = vehicle.copy()
payload['couleur'] = 'Debug Color'
body, status = make_request(f"{base_url}/vehicles/{vehicle_id}", method="PUT", data=payload)

print(f"Update response status: {status}")
print(f"Update response body: {body}")
