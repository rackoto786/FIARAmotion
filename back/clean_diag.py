import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Compliance, Vehicle

app = create_app()

with app.app_context():
    output_lines = []
    output_lines.append("="*60)
    output_lines.append("COMPLIANCE DATA DIAGNOSTIC")
    output_lines.append("="*60)
    
    today = datetime.now().date()
    target_date = today + timedelta(days=5)
    
    output_lines.append(f"Today: {today}")
    output_lines.append(f"Target date for alerts (exactly 5 days): {target_date}")
    
    docs = Compliance.query.all()
    output_lines.append(f"Total compliance documents: {len(docs)}")
    
    for d in docs:
        vehicle = Vehicle.query.get(d.vehicule_id)
        immat = vehicle.immatriculation if vehicle else "Unknown"
        days_to_expiry = (d.date_expiration - today).days
        
        output_lines.append(f"\n--- {d.type} for {immat} ---")
        output_lines.append(f"  Expiration Date: {d.date_expiration}")
        output_lines.append(f"  Days to expiry: {days_to_expiry}")
        output_lines.append(f"  Alert sent: {d.expiry_alert_sent}")
        output_lines.append(f"  Alert sent at: {d.expiry_alert_sent_at}")
        if d.date_expiration == target_date:
            output_lines.append("  !!! MATCHES TARGET DATE !!!")
        elif days_to_expiry <= 5 and not d.expiry_alert_sent:
             output_lines.append("  !!! SHOULD TRIGGER IF LOGIC WAS <= 5 !!!")
        
    output_lines.append("\n" + "="*60)
    
    with open('clean_compliance_diag.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    print("Clean diagnostic file created: clean_compliance_diag.txt")
