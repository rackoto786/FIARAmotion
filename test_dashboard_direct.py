from back.app import create_app, db
from back.app.models import Vehicle, Driver, Maintenance, Mission, FuelEntry
from sqlalchemy import func, extract
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    try:
        print("Testing dashboard stats calculation...")
        
        # Vehicle stats
        total_vehicles = Vehicle.query.count()
        print(f"✓ Total vehicles: {total_vehicles}")
        
        vehicles_in_service = Vehicle.query.filter_by(statut='en_service').count()
        print(f"✓ Vehicles in service: {vehicles_in_service}")
        
        # Driver stats
        total_drivers = Driver.query.count()
        print(f"✓ Total drivers: {total_drivers}")
        
        # Maintenance stats
        pending_maintenance = Maintenance.query.filter_by(statut='en_attente').count()
        print(f"✓ Pending maintenance: {pending_maintenance}")
        
        # Mission stats
        ongoing_missions = Mission.query.filter_by(state='en_cours').count()
        print(f"✓ Ongoing missions: {ongoing_missions}")
        
        # Average fuel consumption
        avg_consumption = db.session.query(
            func.avg(FuelEntry.consommation100)
        ).filter(FuelEntry.consommation100.isnot(None)).scalar()
        print(f"✓ Avg consumption: {avg_consumption}")
        
        # Fuel by month
        six_months_ago = datetime.now() - timedelta(days=180)
        fuel_by_month = db.session.query(
            extract('year', FuelEntry.date).label('year'),
            extract('month', FuelEntry.date).label('month'),
            func.sum(FuelEntry.quantite_achetee).label('total_liters'),
            func.sum(FuelEntry.total_achete).label('total_cost')
        ).filter(
            FuelEntry.date >= six_months_ago
        ).group_by('year', 'month').order_by('year', 'month').all()
        
        print(f"✓ Fuel by month: {len(fuel_by_month)} entries")
        
        print("\n✅ All queries executed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
