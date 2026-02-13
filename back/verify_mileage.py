from app import create_app, db
from app.models import Vehicle, FuelEntry, Driver
import uuid
from datetime import date

def verify_mileage_logic():
    app = create_app()
    with app.app_context():
        print("Setting up test data...")
        # Create a test vehicle
        test_vid = str(uuid.uuid4())
        vehicle = Vehicle(
            id=test_vid,
            immatriculation=f"TEST-{uuid.uuid4().hex[:6]}",
            marque="TestBrand",
            modele="TestModel",
            type_vehicule="Voiture",
            date_acquisition=date.today(),
            date_mise_circulation=date.today(),
            kilometrage_actuel=1000,
            statut="principale"
        )
        # Create a dummy driver (required for fuel entry)
        test_did = str(uuid.uuid4())
        driver = Driver(
            id=test_did,
            nom="Test",
            prenom="Driver",
            telephone="000",
            email=f"test{uuid.uuid4().hex[:6]}@example.com",
            permis="B",
            date_embauche=date.today(),
            statut="actif"
        )
        
        db.session.add(vehicle)
        db.session.add(driver)
        db.session.commit()
        
        print(f"Test Vehicle created. Initial Mileage: {vehicle.kilometrage_actuel}")
        
        try:
            # Test Case 1: Add fuel entry with higher mileage
            print("\nTest 1: Adding fuel entry with higher mileage (1500)...")
            client = app.test_client()
            resp = client.post("/api/fuel/", json={
                "vehiculeId": test_vid,
                "conducteurId": test_did,
                "actuelKm": 1500,
                "precedentKm": 1000,
                "prixUnitaire": 1.0,
                "totalAchete": 10.0,
                "date": date.today().isoformat()
            })
            
            if resp.status_code != 201:
                print(f"Failed to create entry: {resp.json}")
            
            # Re-fetch vehicle
            db.session.expire(vehicle)
            if vehicle.kilometrage_actuel == 1500:
                print("SUCCESS: Vehicle mileage updated to 1500.")
            else:
                print(f"FAILURE: Vehicle mileage is {vehicle.kilometrage_actuel}, expected 1500.")
                
            # Test Case 2: Add fuel entry with lower mileage (1200) - Should NOT update
            print("\nTest 2: Adding fuel entry with lower mileage (1200)...")
            resp = client.post("/api/fuel/", json={
                "vehiculeId": test_vid,
                "conducteurId": test_did,
                "actuelKm": 1200,
                "precedentKm": 1000,
                "prixUnitaire": 1.0,
                "totalAchete": 10.0,
                "date": date.today().isoformat()
            })
            
            if resp.status_code != 201:
                 print(f"Failed to create entry: {resp.json}")
                 
            db.session.expire(vehicle)
            if vehicle.kilometrage_actuel == 1500:
                print("SUCCESS: Vehicle mileage remained at 1500.")
            else:
                print(f"FAILURE: Vehicle mileage changed to {vehicle.kilometrage_actuel}, expected to stay at 1500.")
                
        finally:
            print("\nCleaning up test data...")
            # Cleanup
            FuelEntry.query.filter_by(vehicule_id=test_vid).delete()
            db.session.delete(vehicle)
            db.session.delete(driver)
            db.session.commit()
            print("Cleanup done.")

if __name__ == "__main__":
    verify_mileage_logic()
