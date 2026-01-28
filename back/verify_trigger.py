import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Maintenance, Vehicle, User
import uuid
from datetime import date

app = create_app()

with app.app_context():
    # Get a vehicle and user
    v = Vehicle.query.first()
    u = User.query.first()
    
    if not v or not u:
        print("Missing vehicle or user to create maintenance.")
        sys.exit(1)
        
    print(f"Creating maintenance for vehicle {v.immatriculation} and user {u.email}")
    
    m = Maintenance(
        id=str(uuid.uuid4()),
        vehicule_id=v.id,
        type='revision',
        description='Test maintenance from script',
        date=date.today(),
        kilometrage=v.kilometrage_actuel,
        statut='en_attente',
        demandeur_id=u.id
    )
    db.session.add(m)
    db.session.commit()
    
    # Manually trigger the notification since we are bypassing the route
    from app.utils.notification_utils import create_notification
    n = create_notification(
        title="Nouvelle demande d'entretien",
        message=f"Une nouvelle demande d'entretien ({m.type}) a été créée pour le véhicule {v.immatriculation}.",
        type="warning",
        target_role="technician",
        link="/maintenance"
    )
    
    if n:
        print(f"Notification created: ID={n.id}, Role={n.target_role}")
    else:
        print("Failed to create notification.")
        
    print(f"Maintenance created: ID={m.id}")
