"""
Check vehicle-planning relationship for accepted plannings
"""

from app import create_app, db
from app.models import Planning, Vehicle

app = create_app()
with app.app_context():
    print("=" * 80)
    print("ACCEPTED PLANNINGS - VEHICLE RELATIONSHIP")
    print("=" * 80)
    
    accepted = Planning.query.filter_by(status='acceptee').all()
    
    print(f"\nTotal accepted plannings: {len(accepted)}\n")
    
    for i, p in enumerate(accepted, 1):
        vehicle = Vehicle.query.get(p.vehicule_id)
        
        start_date = p.date_debut.strftime('%Y-%m-%d')
        end_date = p.date_fin.strftime('%Y-%m-%d')
        
        print(f"{i}. Planning ID: {p.id}")
        print(f"   Vehicle ID: {p.vehicule_id}")
        if vehicle:
            print(f"   Vehicle: {vehicle.immatriculation} ({vehicle.marque} {vehicle.modele})")
            print(f"   Vehicle type: {vehicle.type_vehicule}")
        else:
            print(f"   ⚠️ Vehicle NOT FOUND in database!")
        print(f"   Date range: {start_date} to {end_date}")
        print(f"   Type: {p.type}")
        print(f"   Description: {p.description}")
        print()
