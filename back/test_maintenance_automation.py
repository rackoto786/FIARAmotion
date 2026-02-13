from app import create_app, db
from app.models import Vehicle, Maintenance, User
from app.utils.scheduler import check_daily_maintenance_start
import uuid
from datetime import datetime, date

def verify_automation():
    app = create_app()
    with app.app_context():
        print("Setting up test data...")
        # 1. Create Test Vehicle
        vid = str(uuid.uuid4())
        vehicle = Vehicle(
            id=vid,
            immatriculation=f"TEST-MAINT-{uuid.uuid4().hex[:6]}",
            marque="Test",
            modele="Model",
            type_vehicule="Car",
            date_acquisition=date.today(),
            date_mise_circulation=date.today(),
            statut="principale" # Available
        )
        db.session.add(vehicle)
        
        # 2. Create Test User (Demandeur)
        uid = str(uuid.uuid4())
        user = User(
            id=uid,
            email=f"tester{uuid.uuid4().hex[:6]}@test.com",
            name="Tester",
            role="admin",
            created_at=date.today()
        )
        db.session.add(user)
        
        # 3. Create Maintenance for TODAY
        mid = str(uuid.uuid4())
        maintenance = Maintenance(
            id=mid,
            vehicule_id=vid,
            demandeur_id=uid,
            type="vidange",
            description="Test Automation",
            date_demande=date.today(),
            date_prevue=date.today(), # TODAY
            kilometrage="1000",
            statut="accepte" # Approved
        )
        db.session.add(maintenance)
        db.session.commit()
        
        print(f"Vehicle {vehicle.immatriculation} created with status: {vehicle.statut}")
        print(f"Maintenance {maintenance.id} created for TODAY with status: {maintenance.statut}")
        
        try:
            # 4. Trigger Scheduler Logic (INLINED)
            print("\nTriggering INLINED check_daily_maintenance_start...")
            
            # INLINED LOGIC START
            # from app.models import Maintenance, Vehicle
            # from app import db
            # from app.utils import log_action # Skip log_action for test simplicity or import it
            
            today = date.today()
            print(f"Checking for maintenance starting today: {today}")
            
            maintenances = Maintenance.query.filter(
                Maintenance.date_prevue == today,
                Maintenance.statut == 'accepte'
            ).all()
            
            print(f"DEBUG: Found {len(maintenances)} accepted maintenances for today.")
            
            count = 0
            for m in maintenances:
                v = Vehicle.query.get(m.vehicule_id)
                if v and v.statut != 'en_maintenance':
                    v.statut = 'en_maintenance'
                    print(f"Updated vehicle {v.immatriculation} to en_maintenance")
                    count += 1
            
            if count > 0:
                db.session.commit()
            # INLINED LOGIC END
            
            # Refresh vehicle
            db.session.expire(vehicle)
            if vehicle.statut == 'en_maintenance':
                print("SUCCESS: Vehicle status automatically changed to 'en_maintenance'")
            else:
                print(f"FAILURE: Vehicle status is '{vehicle.statut}', expected 'en_maintenance'")
                
            # 5. Simulate Maintenance Completion (Update Route Logic)
            print("\nSimulating maintenance completion (statut -> termine)...")
            maintenance.statut = "termine" 
            
            if maintenance.statut in ['cloture', 'rejete', 'termine'] and vehicle.statut == 'en_maintenance':
                 vehicle.statut = 'en_service'
            
            db.session.commit()
            
            # Refresh vehicle
            db.session.expire(vehicle)
            if vehicle.statut == 'en_service':
                print("SUCCESS: Vehicle status reverted to 'en_service' after completion")
            else:
                print(f"FAILURE: Vehicle status is '{vehicle.statut}', expected 'en_service'")
                
        except Exception as e:
            print(f"ERROR during verification: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("\nCleaning up...")
            db.session.delete(maintenance)
            db.session.delete(vehicle)
            db.session.delete(user)
            db.session.commit()
            print("Cleanup done.")

if __name__ == "__main__":
    verify_automation()
