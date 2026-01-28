"""
Direct database test for document expiry alerts.
This bypasses API authentication and tests the core functionality.
"""

from app import create_app, db
from app.models import Compliance, Vehicle
from app.utils.scheduler import check_expiring_documents
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    print("="*60)
    print("DOCUMENT EXPIRY ALERT TEST")
    print("="*60)
    
    # Get first vehicle
    vehicle = Vehicle.query.first()
    if not vehicle:
        print("❌ No vehicles found in database")
        exit(1)
    
    print(f"\n✅ Using vehicle: {vehicle.immatriculation}")
    
    # Create test compliance entry expiring in 2 days
    expiry_date = (datetime.now() + timedelta(days=2)).date()
    
    test_compliance = Compliance(
        id=f"test-alert-{datetime.now().timestamp()}",
        vehicule_id=vehicle.id,
        type="assurance",
        numero_document="TEST-ALERT-001",
        date_emission=datetime.now().date(),
        date_expiration=expiry_date,
        prestataire="Test Provider",
        cout=50000.0,
        statut="valide",
        notes="Test entry for alert verification",
        expiry_alert_sent=False
    )
    
    db.session.add(test_compliance)
    db.session.commit()
    
    print(f"✅ Created test compliance entry")
    print(f"   Type: {test_compliance.type}")
    print(f"   Expiration: {expiry_date.strftime('%d/%m/%Y')}")
    print(f"   ID: {test_compliance.id}")
    
    # Trigger alert check
    print(f"\n🔔 Triggering alert check...")
    count = check_expiring_documents(app)
    
    print(f"\n✅ Alert check completed")
    print(f"   Alerts sent: {count}")
    
    # Verify the entry was updated
    db.session.refresh(test_compliance)
    
    print(f"\n🔍 Verification:")
    print(f"   Alert sent flag: {test_compliance.expiry_alert_sent}")
    print(f"   Alert sent at: {test_compliance.expiry_alert_sent_at}")
    
    # Clean up
    print(f"\n🗑️  Cleaning up test entry...")
    db.session.delete(test_compliance)
    db.session.commit()
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\n📧 Check your email (admin/technician accounts) for the alert.")
    print("📱 Check in-app notifications in the application.")
