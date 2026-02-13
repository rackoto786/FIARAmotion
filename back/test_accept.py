from app import create_app, db
from app.models import Planning, Vehicle
from datetime import datetime

app = create_app()
with app.app_context():
    # Find a pending planning item
    p = Planning.query.filter_by(status='en_attente').first()
    if not p:
        print("No pending item found")
        exit()
    
    print(f"Testing accept for item {p.id}")
    old_status = p.status
    p.status = 'acceptee'
    
    # Simulate the logic from planning.py
    vehicle = p.vehicle
    if old_status != p.status:
        if p.status == 'acceptee':
            if p.type in ['mission', 'reserve']:
                vehicle.statut = 'reserve'
            elif p.type == 'maintenance':
                vehicle.statut = 'en_maintenance'
        
        print(f"Vehicle status updated to: {vehicle.statut}")
        db.session.commit()
        print("Commit successful")
        
        try:
            from app.utils.email_utils import send_planning_status_notification
            # send_planning_status_notification(p, vehicle) # Skip actual email sending for test
            print("Skipped email notification for test")
        except Exception as e:
            print(f"Email error: {e}")

        from app.utils.notification_utils import create_notification
        status_label = "acceptée" if p.status == 'acceptee' else "rejetée" if p.status == 'rejetee' else p.status
        create_notification(
            title=f"Réservation {status_label}",
            message=f"Votre réservation ({p.type}) pour le véhicule {vehicle.immatriculation} a été {status_label}.",
            type="success" if p.status == 'acceptee' else "error" if p.status == 'rejetee' else "info",
            target_user_id=p.created_by_id,
            link="/planning"
        )
        print("Internal notification created")
    
    print("Test completed successfully")
