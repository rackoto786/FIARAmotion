from flask import Blueprint, jsonify
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from .. import db
from ..models import Vehicle, Driver, Maintenance, Mission, FuelEntry

bp = Blueprint("dashboard", __name__)

@bp.get("/stats")
def get_dashboard_stats():
    """Get comprehensive dashboard statistics."""
    
    # Vehicle stats
    total_vehicles = Vehicle.query.count()
    vehicles_in_service = Vehicle.query.filter_by(statut='en_service').count()
    vehicles_in_maintenance = Vehicle.query.filter_by(statut='en_maintenance').count()
    
    # Driver stats
    total_drivers = Driver.query.count()
    active_drivers = Driver.query.filter_by(statut='actif').count()
    
    # Maintenance stats
    pending_maintenance = Maintenance.query.filter_by(statut='en_attente').count()
    
    # Mission stats
    ongoing_missions = Mission.query.filter_by(state='en_cours').count()
    
    # Average fuel consumption
    avg_consumption = db.session.query(
        func.avg(FuelEntry.consommation_100)
    ).filter(FuelEntry.consommation_100.isnot(None)).scalar()
    
    # Fuel data by month (last 6 months)
    six_months_ago = datetime.now() - timedelta(days=180)
    fuel_by_month = db.session.query(
        extract('year', FuelEntry.date).label('year'),
        extract('month', FuelEntry.date).label('month'),
        func.sum(FuelEntry.quantite_achetee).label('total_liters'),
        func.sum(FuelEntry.total_achete).label('total_cost')
    ).filter(
        FuelEntry.date >= six_months_ago
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    fuel_chart_data = []
    for entry in fuel_by_month:
        month_name = datetime(int(entry.year), int(entry.month), 1).strftime('%B')
        fuel_chart_data.append({
            'month': month_name,
            'liters': float(entry.total_liters or 0),
            'cost': float(entry.total_cost or 0)
        })
    
    # Maintenance by type
    maintenance_by_type = db.session.query(
        Maintenance.type,
        func.count(Maintenance.id).label('count')
    ).group_by(Maintenance.type).all()
    
    maintenance_chart_data = [
        {'type': m.type, 'count': m.count} for m in maintenance_by_type
    ]
    
    # Vehicle usage (missions per vehicle)
    vehicle_usage = db.session.query(
        Vehicle.immatriculation,
        func.count(Mission.id).label('mission_count')
    ).outerjoin(Mission, Vehicle.id == Mission.vehicule_id
    ).group_by(Vehicle.id, Vehicle.immatriculation
    ).order_by(func.count(Mission.id).desc()
    ).limit(10).all()
    
    vehicle_usage_data = [
        {'vehicle': v.immatriculation, 'missions': v.mission_count} 
        for v in vehicle_usage
    ]
    
    return jsonify({
        # Main KPIs
        'totalVehicules': total_vehicles,
        'vehiculesEnService': vehicles_in_service,
        'vehiculesEnMaintenance': vehicles_in_maintenance,
        'totalChauffeurs': total_drivers,
        'chauffeursActifs': active_drivers,
        'entretiensEnAttente': pending_maintenance,
        'missionsEnCours': ongoing_missions,
        'consommationMoyenne': round(float(avg_consumption or 0), 2),
        
        # Chart data
        'fuelByMonth': fuel_chart_data,
        'maintenanceByType': maintenance_chart_data,
        'vehicleUsage': vehicle_usage_data
    }), 200
