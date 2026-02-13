import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission

app = create_app()

with app.app_context():
    # Search for missions with similar titles
    search_term = "bibliotheque mobile"
    missions = Mission.query.filter(Mission.titre.ilike(f"%{search_term}%")).all()
    print(f"Found {len(missions)} missions containing '{search_term}'")
    
    for m in missions:
        print(f"  Mission ID: {m.id}, Reference: {m.reference}, Current Title: '{m.titre}'")
