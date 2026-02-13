from app import create_app, db
from app.models import Mission, Planning
from datetime import datetime

app = create_app()

with app.app_context():
    print("--- Checking Recent Missions ---")
    missions = Mission.query.order_by(Mission.id.desc()).limit(10).all()
    for m in missions:
        print(f"ID: {m.id} | Ref: {m.reference} | Veh: {m.vehicule_id} | CreatedAt: {m.date_debut}")
        p_items = Planning.query.filter_by(mission_id=m.id).all()
        print(f"  -> Linked Planning Entries: {len(p_items)}")
        for p in p_items:
            print(f"     Planning ID: {p.id} | Type: {p.type} | Start: {p.date_debut} | Status: {p.status}")
    
    print("\n--- Checking Planning items of type 'mission' without mission_id link ---")
    orphan_plans = Planning.query.filter_by(type="mission", mission_id=None).all()
    print(f"Orphan Planning items: {len(orphan_plans)}")
    for p in orphan_plans:
        print(f"Planning ID: {p.id} | Veh: {p.vehicule_id} | Start: {p.date_debut}")

    print("\nTotal Missions:", Mission.query.count())
    print("Total Planning:", Planning.query.count())
