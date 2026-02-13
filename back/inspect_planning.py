from app import create_app, db
from app.models import Planning, Mission
from datetime import datetime

app = create_app()

with app.app_context():
    print("--- 10 Most Recent Planning Entries ---")
    plans = Planning.query.order_by(Planning.date_debut.desc()).limit(10).all()
    if not plans:
        print("No planning entries found.")
    for p in plans:
        m_ref = "N/A"
        if p.mission_id:
            m = Mission.query.get(p.mission_id)
            m_ref = m.reference if m else "Mission Not Found"
        
        print(f"ID: {p.id}")
        print(f"  MissionRef: {m_ref} (LinkedID: {p.mission_id})")
        print(f"  Type: {p.type}")
        print(f"  Status: {p.status}")
        print(f"  Vehicle: {p.vehicule_id}")
        print(f"  Start: {p.date_debut}")
        print(f"  End: {p.date_fin}")
        print("-" * 30)

    print("\n--- Recent Missions ---")
    missions = Mission.query.order_by(Mission.id.desc()).limit(5).all()
    for m in missions:
         print(f"Mission {m.reference} (ID: {m.id}) | State: {m.state}")
