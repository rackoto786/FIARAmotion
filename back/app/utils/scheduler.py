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
        name='Check for documents expiring in 2 days',
        replace_existing=True
    )
    
    scheduler.start()
    print("✅ Scheduler initialized: Daily document expiry checks at 9:00 AM")
    
    # Shutdown scheduler when app closes
    import atexit
    atexit.register(lambda: scheduler.shutdown())

def check_expiring_documents(app):
    """Check for documents expiring in 2 days and send alerts."""
    with app.app_context():
        from ..models import Compliance, Vehicle
        from .. import db
        from .email_utils import send_document_expiry_alert
        
        # Calculate the target date (2 days from now)
        target_date = (datetime.now() + timedelta(days=2)).date()
        
        # Find all compliance entries expiring on the target date that haven't been alerted
        expiring_docs = Compliance.query.filter(
            Compliance.date_expiration == target_date,
            Compliance.expiry_alert_sent == False
        ).all()
        
        print(f"🔍 Checking for documents expiring on {target_date.strftime('%d/%m/%Y')}")
        print(f"📋 Found {len(expiring_docs)} document(s) to alert")
        
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
                    
                    print(f"✅ Alert sent for {compliance.type} - {vehicle.immatriculation}")
                except Exception as e:
                    print(f"❌ Error sending alert for {compliance.type} - {vehicle.immatriculation}: {e}")
                    db.session.rollback()
        
        return len(expiring_docs)
