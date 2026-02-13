import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission

app = create_app()

with app.app_context():
    missions = Mission.query.all()
    with open('all_missions_names.txt', 'w', encoding='utf-8') as f:
        f.write(f"Total Missions: {len(missions)}\n")
        for m in missions:
            f.write(f"ID: {m.id} | REF: {m.reference} | TITLE: '{m.titre}'\n")
    print("Done listing names to all_missions_names.txt")
