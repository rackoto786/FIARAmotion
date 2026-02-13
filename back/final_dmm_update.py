import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission, Planning

app = create_app()

with app.app_context():
    print("="*60)
    print("FINAL UPDATE FOR DMM")
    print("="*60)
    
    target_ids = [
        "a1410634-d5f8-43f0-a1a7-04151309173d",
        "8cd32769-a67f-4de1-9ecd-692b7a47a256"
    ]
    new_title = "DMM"
    
    for m_id in target_ids:
        m = Mission.query.get(m_id)
        if m:
            old_titre = m.titre
            m.titre = new_title
            print(f"Updated Mission {m.reference}: '{old_titre}' -> '{new_title}'")
            
            # Update associated Planning entries
            plannings = Planning.query.filter(Planning.mission_id == m.id).all()
            for p in plannings:
                if old_titre in p.description:
                    p.description = p.description.replace(old_titre, new_title)
                    print(f"  Updated Planning {p.id} description")
                else:
                    # If exact match fails due to encoding in description, try fuzzy
                    if "Biblioth" in p.description or "Mobile" in p.description:
                         # Reconstruct description based on pattern: "Mission REF: DEPART -> DEST (MISSIONNAIRE)"
                         # Actually, let's just do a more aggressive replace
                         import re
                         # Try to replace the whole "Déploiement Bibliothèque Mobile" or similar
                         p.description = re.sub(r'D[ée]ploiement Biblioth[eè]que Mobile', new_title, p.description, flags=re.IGNORECASE)
                         print(f"  Aggressively updated Planning {p.id} description")
    
    db.session.commit()
    print("\n" + "="*60)
    print("DONE")
