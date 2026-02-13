from app import create_app, db
from app.models import Mission, Planning
from datetime import date

app = create_app()

with app.app_context():
    today = date(2026, 2, 10)
    print(f"Checking missions for date: {today}")
    missions = Mission.query.filter(Mission.date_debut == today).all()
    print(f"Missions found: {len(missions)}")
    for m in missions:
        print(f"Mission: {m.reference} | ID: {m.id} | State: {m.state}")
        p_items = Planning.query.filter_by(mission_id=m.id).all()
        print(f"  Linked plans: {len(p_items)}")
        for p in p_items:
             print(f"    - Planning ID: {p.id}")
    
    # Check all planning for today
    print("\nChecking all planning items starting today:")
    plans = Planning.query.all()
    today_plans = [p for p in plans if p.date_debut.date() == today]
    print(f"Total planning items starting today: {len(today_plans)}")
    for p in today_plans:
        print(f"  ID: {p.id} | Type: {p.type} | MissionID: {p.mission_id}")
