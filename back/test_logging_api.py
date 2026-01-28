import requests
import json

token = "fcd2575e299faa5744f1971fd87a5e38155ab4f1b94dba962021fcb27349e25f9"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# First, get a vehicle ID
res = requests.get("http://127.0.0.1:5000/api/vehicles", headers=headers)
vehicles = res.json()
if not vehicles:
    print("No vehicles found")
    exit()

vehicle = vehicles[0]
vehicle_id = vehicle['id']
print(f"Testing with vehicle ID: {vehicle_id}")

# Attempt to update the vehicle
payload = vehicle.copy()
payload['couleur'] = 'Test Color' # Change a safe field

update_res = requests.put(f"http://127.0.0.1:5000/api/vehicles/{vehicle_id}", 
                          headers=headers, 
                          data=json.dumps(payload))

print(f"Update response status: {update_res.status_code}")
print(f"Update response body: {update_res.text}")
