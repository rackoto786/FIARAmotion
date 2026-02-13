import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission, Planning

app = create_app()

with app.app_context():
    print("--- RECENT MISSIONS ---")
    missions = Mission.query.order_by(Mission.created_at.desc().nulls_last()).limit(10).all()
    for m in missions:
        print(f"Mission: {m.reference} | Title: '{m.titre}' | Date: {m.date_debut}")

    print("\n--- RECENT PLANNING ITEMS ---")
    plannings = Planning.query.order_by(Planning.date_debut.desc()).limit(10).all()
    for p in plannings:
        print(f"Planning: {p.id} | Desc: '{p.description}' | Date: {p.date_debut}")
