import sys
import os

# Add the app directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'back')))

from back.app import create_app, db
from back.app.models import Planning, Mission

app = create_app()
with app.app_context():
    plannings = Planning.query.filter(Planning.mission_id.isnot(None)).order_by(Planning.id.desc()).limit(5).all()
    print(f"Found {len(plannings)} plannings with mission_id.")
    for p in plannings:
        print(f"Planning ID: {p.id}")
        print(f"Mission ID: {p.mission_id}")
        if p.mission:
            print(f"  Mission Title: {p.mission.titre}")
            print(f"  Mission Reference: {p.mission.reference}")
        else:
            print("  Mission relationship returned None!")
        print("-" * 20)

    # Check the most recent planning entry in general
    last_p = Planning.query.order_by(Planning.id.desc()).first()
    if last_p:
        print(f"LAST Planning: {last_p.id}, type: {last_p.type}, mission_id: {last_p.mission_id}")
