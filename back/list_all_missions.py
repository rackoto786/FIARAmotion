import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission

app = create_app()

with app.app_context():
    missions = Mission.query.all()
    print(f"Total Missions: {len(missions)}")
    for m in missions:
        print(f"REF: {m.reference} | TITLE: '{m.titre}'")
