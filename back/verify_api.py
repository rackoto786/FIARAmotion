import requests
from app import create_app

def verify():
    # Since we can't easily run the full flask app in bg and curl it without setup, 
    # let's just use the app context to call the function directly or use test client.
    app = create_app()
    with app.test_client() as client:
        response = client.get('/api/vehicles/')
        if response.status_code == 200:
            data = response.get_json()
            if data and len(data) > 0:
                vehicle = data[0]
                # Check for a few new fields
                fields_to_check = [
                    'filtre_air_interval_km',
                    'last_filtre_air_km',
                    'freins_interval_km',
                    'pont_interval_km'
                ]
                missing = [f for f in fields_to_check if f not in vehicle]
                if missing:
                    print(f"FAILED: Missing fields in API response: {missing}")
                else:
                    print("SUCCESS: All new fields present in API response.")
            else:
                print("WARNING: No vehicles found to verify.")
        else:
            print(f"FAILED: API returned {response.status_code}")

if __name__ == "__main__":
    verify()
