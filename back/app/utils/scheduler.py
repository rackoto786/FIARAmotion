from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from flask import current_app

def init_scheduler(app):
    """Initialize and start the background scheduler for periodic tasks."""
    scheduler = BackgroundScheduler()
    
    # Schedule the document expiry check to run daily at 9:00 AM
    scheduler.add_job(
        func=lambda: check_expiring_documents(app),
        trigger='cron',
        hour=9,
        minute=0,
        id='check_expiring_documents',
        name='Check for documents expiring in 5 days',
        replace_existing=True
    )

    # Schedule the maintenance start check to run daily at 6:00 AM
    scheduler.add_job(
        func=lambda: check_daily_maintenance_start(app),
        trigger='cron',
        hour=6,
        minute=0,
        id='check_daily_maintenance_start',
        name='Check for maintenance starting today',
        replace_existing=True
    )
    
    scheduler.start()
    print("Scheduler initialized: Daily document expiry checks at 9:00 AM")
    
    # Trigger an immediate check on startup
    try:
        print("Triggering immediate startup check for expiring documents...")
        check_expiring_documents(app)
    except Exception as e:
        print(f"Error during startup document check: {e}")
    
    # Shutdown scheduler when app closes
    import atexit
    atexit.register(lambda: scheduler.shutdown())

def check_expiring_documents(app):
    """Check for documents expiring in the next 5 days and send alerts."""
    with app.app_context():
        from ..models import Compliance, Vehicle
        from .. import db
        from .email_utils import send_document_expiry_alert
        from datetime import datetime
        
        # Calculate the target date range (up to 5 days from now)
        today = datetime.now().date()
        max_target_date = today + timedelta(days=5)
        
        # Find all compliance entries expiring within the next 5 days (or already expired)
        # that haven't been alerted yet (handle False or NULL)
        expiring_docs = Compliance.query.filter(
            Compliance.date_expiration <= max_target_date,
            (Compliance.expiry_alert_sent == False) | (Compliance.expiry_alert_sent == None)
        ).all()
        
        print(f"Checking for documents expiring between {today} and {max_target_date}")
        print(f"Found {len(expiring_docs)} document(s) to alert")
        
        for compliance in expiring_docs:
            vehicle = Vehicle.query.get(compliance.vehicule_id)
            if vehicle:
                try:
                    # Send the email alert
                    send_document_expiry_alert(compliance, vehicle)
                    
                    # Mark as alerted
                    compliance.expiry_alert_sent = True
                    compliance.expiry_alert_sent_at = datetime.now()
                    db.session.commit()
                    
                    print(f"Alert sent for {compliance.type} - {vehicle.immatriculation}")
                except Exception as e:
                    print(f"Error sending alert for {compliance.type} - {vehicle.immatriculation}: {e}")
                    db.session.rollback()
        
        return len(expiring_docs)

def check_daily_maintenance_start(app):
    """
    Check for maintenances that are scheduled to start today (date_prevue == today).
    If found and status is 'accepte', update vehicle status to 'en_maintenance'.
    """
    with app.app_context():
        from ..models import Maintenance, Vehicle
        from .. import db
        from ..utils import log_action
        
        today = datetime.now().date()
        today = datetime.now().date()
        print(f"Checking for maintenance starting today: {today}")
        
        # Find maintenances starting today that are accepted
        maintenances = Maintenance.query.filter(
            Maintenance.date_prevue == today,
            Maintenance.statut == 'accepte'
        ).all()
        
        print(f"DEBUG: Found {len(maintenances)} accepted maintenances for today.")
        all_today = Maintenance.query.filter(Maintenance.date_prevue == today).all()
        print(f"DEBUG: Total maintenances for today (any status): {len(all_today)}")
        for m in all_today:
             print(f" - ID: {m.id}, Status: {m.statut}, Vehicle: {m.vehicule_id}")
        
        count = 0
        for m in maintenances:
            vehicle = Vehicle.query.get(m.vehicule_id)
            if vehicle and vehicle.statut != 'en_maintenance':
                # vehicle.statut = 'en_maintenance' # DISABLED as per user request: only manual "Start" triggers status change
                
                # Log the action
                # log_action(
                #     user_id="system", # Indicates system action
                #     action="Modification",
                #     entite="Véhicule",
                #     entite_id=vehicle.id,
                #     details=f"Statut mis à jour automatiquement vers 'en_maintenance' (Début entretien: {m.type})"
                # )
                count += 1
                
        if count > 0:
            db.session.commit()
            print(f"Updated {count} vehicle(s) to 'en_maintenance'")
        else:
            print("No maintenance starting today requiring status update.")
