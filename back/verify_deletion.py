import sys
import os
import uuid
import json
from datetime import date, datetime, timedelta

# Ensure we can import app
sys.path.append(os.getcwd())

from app import create_app, db
from app.models import User, Vehicle, Driver, Mission, Planning

app = create_app()

def run_test():
    with app.app_context():
        print("--- Setting up Verification Data ---")
        test_token = "verify-token-456"
        user = User.query.filter_by(email="worker_Verify@test.com").first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="worker_Verify@test.com",
                name="Verify User",
                role="admin",
                created_at=date.today(),
                token=test_token,
                status="active"
            )
            db.session.add(user)
        else:
            user.token = test_token
        
        vehicle = Vehicle.query.filter_by(immatriculation="VERIF-LNK").first()
        if not vehicle:
            vehicle = Vehicle(
                id=str(uuid.uuid4()),
                immatriculation="VERIF-LNK",
                marque="Verify",
                modele="Link",
                type_vehicule="Light",
                date_acquisition=date.today(),
                date_mise_circulation=date.today(),
                statut="disponible"
            )
            db.session.add(vehicle)

        driver = Driver.query.filter_by(email="driver_verif@test.com").first()
        if not driver:
            driver = Driver(
                id=str(uuid.uuid4()),
                nom="DriverVerif",
                prenom="Test",
                telephone="123456",
                email="driver_verif@test.com",
                permis="B",
                date_embauche=date.today(),
                statut="actif"
            )
            db.session.add(driver)
        
        db.session.commit()

        client = app.test_client()
        headers = {"Authorization": f"Bearer {test_token}", "Content-Type": "application/json"}

        # --- TEST 1: Deletion on Status Change (ANNULE) ---
        print("\n[TEST 1] Creating mission and then cancelling it...")
        payload = {
            "vehiculeId": vehicle.id,
            "conducteurId": driver.id,
            "dateDebut": date.today().isoformat(),
            "dateFin": date.today().isoformat(),
            "lieuDepart": "PointA",
            "lieuDestination": "PointB",
            "heureDepart": 10.0,
            "heureRetour": 12.0,
            "titre": "Test Sync Cancel",
            "distancePrevue": 10
        }
        resp = client.post("/api/missions/", data=json.dumps(payload), headers=headers)
        m_id = resp.get_json()['id']
        
        # Verify planning entry exists
        p = Planning.query.filter_by(mission_id=m_id).first()
        if p:
            print(f"PASS: Planning entry created for mission {m_id}")
        else:
            print("FAIL: Planning entry NOT created")
            return

        # Cancel mission
        print("Cancelling mission...")
        client.patch(f"/api/missions/{m_id}", data=json.dumps({"state": "annule"}), headers=headers)
        
        # Verify planning entry is gone
        p = Planning.query.filter_by(mission_id=m_id).first()
        if not p:
            print("PASS: Planning entry deleted after cancellation")
        else:
            print("FAIL: Planning entry still exists after cancellation")

        # --- TEST 2: Deletion on Mission DELETE ---
        print("\n[TEST 2] Creating mission and then deleting it...")
        resp = client.post("/api/missions/", data=json.dumps(payload), headers=headers)
        m_id2 = resp.get_json()['id']
        
        if Planning.query.filter_by(mission_id=m_id2).first():
            print(f"PASS: Planning entry created for second mission {m_id2}")
        else:
             print("FAIL: Planning entry NOT created for second mission")
             return

        # Delete mission
        print("Deleting mission...")
        client.delete(f"/api/missions/{m_id2}", headers=headers)
        
        # Verify planning entry is gone
        p = Planning.query.filter_by(mission_id=m_id2).first()
        if not p:
            print("PASS: Planning entry deleted after mission deletion")
        else:
            print("FAIL: Planning entry still exists after mission deletion")

if __name__ == "__main__":
    run_test()
