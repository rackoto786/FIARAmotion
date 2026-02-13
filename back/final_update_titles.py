import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission, Planning

app = create_app()

with app.app_context():
    print("="*60)
    print("FINAL MISSION TITLE UPDATE")
    print("="*60)
    
    new_title = "DMM"
    
    # Fuzzy match to handle encoding issues or casing
    # Search for anything containing "eploiement" and "ibliotheque"
    missions = Mission.query.filter(Mission.titre.ilike("%eploiement%"), Mission.titre.ilike("%ibliotheque%")).all()
    print(f"Found {len(missions)} matching missions")
    
    for m in missions:
        old_val = m.titre
        m.titre = new_title
        print(f"  Updated Mission {m.reference}: '{old_val}' -> '{new_title}'")
        
        # Update associated Planning entries
        plannings = Planning.query.filter(Planning.mission_id == m.id).all()
        for p in plannings:
            # Update description if it contains any of the keywords
            if "eploiement" in p.description.lower() or "ibliotheque" in p.description.lower():
                # We don't know the exact string because of encoding, so we'll re-construct description
                # or just replace what we can. 
                # Planning description is usually "Mission REF: DEPART -> DEST (MISSIONNAIRE)"
                # Actually, the user specifically wants to change the field "titre" or where it appears.
                # If there's no "titre" field in Planning, we update description.
                p.description = p.description.replace(old_val, new_title)
                print(f"    Updated Planning {p.id} description")
    
    db.session.commit()
    print("\n" + "="*60)
    print("DONE")
