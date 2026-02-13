import requests
from app import create_app
import sys

def verify():
    try:
        app = create_app()
        with app.test_client() as client:
            response = client.get('/api/vehicles/')
            with open('verification_result.txt', 'w') as f:
                if response.status_code == 200:
                    data = response.get_json()
                    if data and len(data) > 0:
                        vehicle = data[0]
                        fields_to_check = [
                            'filtre_air_interval_km',
                            'last_filtre_air_km',
                            'freins_interval_km',
                            'pont_interval_km'
                        ]
                        missing = [f for f in fields_to_check if f not in vehicle]
                        if missing:
                            f.write(f"FAILED: Missing fields: {missing}\n")
                        else:
                            f.write("SUCCESS: All new fields present.\n")
                    else:
                        f.write("WARNING: No vehicles found.\n")
                else:
                    f.write(f"FAILED: API returned {response.status_code}\n")
    except Exception as e:
        with open('verification_result.txt', 'w') as f:
            f.write(f"ERROR: {str(e)}\n")

if __name__ == "__main__":
    verify()
