import sys
import os
import json

# Ensure we can import app
sys.path.append(os.getcwd())

from app import create_app

app = create_app()

def test_fetch():
    with app.app_context():
        client = app.test_client()
        print("--- Fetching /api/planning ---")
        # Try without auth first to see if it allows it (unlikely)
        resp = client.get("/api/planning/")
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.get_json()
            print(f"Total planning items fetched: {len(data)}")
            # Filter type mission
            m_plans = [p for p in data if p.get('type') == 'mission']
            print(f"Planning items with type='mission': {len(m_plans)}")
            for p in m_plans[:5]:
                print(f"  ID: {p['id']} | MissionID: {p.get('mission_id')} | Start: {p['dateDebut']}")
        else:
            print(f"Error: {resp.status_code}")
            print(resp.get_data(as_text=True))

if __name__ == "__main__":
    test_fetch()
