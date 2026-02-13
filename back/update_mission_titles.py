import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission, Planning

app = create_app()

with app.app_context():
    print("="*60)
    print("UPDATING MISSION TITLES")
    print("="*60)
    
    old_title = "deploiement bibliotheque mobile"
    new_title = "DMM"
    
    # Update Missions
    missions = Mission.query.filter(Mission.titre == old_title).all()
    print(f"Found {len(missions)} missions with title '{old_title}'")
    
    for m in missions:
        m.titre = new_title
        print(f"  Updated Mission ID: {m.id}, Reference: {m.reference}")
        
        # Update associated Planning entries if necessary
        # Usually planning description for missions is "Mission REF: DEPART -> DEST (MISSIONNAIRE)"
        # But if the user mentions "field titre", they might be referring to the title field I added to Planning
        # Let's check Planning description too if it contains the old title
        plannings = Planning.query.filter(Planning.mission_id == m.id).all()
        for p in plannings:
            if old_title in p.description:
                p.description = p.description.replace(old_title, new_title)
                print(f"    Updated Planning {p.id} description")
    
    db.session.commit()
    print("\n" + "="*60)
    print("DONE")
