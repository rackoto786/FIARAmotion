import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Compliance, Vehicle

app = create_app()

with app.app_context():
    print("="*60)
    print("COMPLIANCE DATA CHECK")
    print("="*60)
    
    today = datetime.now().date()
    target_date = today + timedelta(days=5)
    
    print(f"Today: {today}")
    print(f"Target date for alerts (exactly 5 days): {target_date}")
    
    docs = Compliance.query.all()
    print(f"\nTotal compliance documents: {len(docs)}")
    
    print("\nListing documents and their status:")
    for d in docs:
        vehicle = Vehicle.query.get(d.vehicule_id)
        immat = vehicle.immatriculation if vehicle else "Unknown"
        days_to_expiry = (d.date_expiration - today).days
        
        print(f"--- {d.type} for {immat} ---")
        print(f"  Expiration Date: {d.date_expiration}")
        print(f"  Days to expiry: {days_to_expiry}")
        print(f"  Alert sent: {d.expiry_alert_sent}")
        print(f"  Alert sent at: {d.expiry_alert_sent_at}")
        
    print("\n" + "="*60)
