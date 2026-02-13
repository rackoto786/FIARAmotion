from flask import Blueprint, jsonify
from sqlalchemy import func, extract
from datetime import datetime, timedelta
from .. import db
from ..models import Vehicle, Driver, Maintenance, Mission, FuelEntry

bp = Blueprint("dashboard", __name__)

@bp.get("/stats")
def get_dashboard_stats():
    """Get comprehensive dashboard statistics based on user role."""
    from flask import request
    from ..models import User

    auth_header = request.headers.get('Authorization')
    user = None
    if auth_header:
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        user = User.query.filter_by(token=token).first()
    
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Common helper for charts (Admins/Techs see all, others might see filtered or none)
    # For simplicity, we keep charts global or empty for now, or filter if requested.
    # The user asked for "KPIs specific to pages", usually meaning the top cards.
    
    # Chart Data (Global for now, can be optimized later)
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
    
    maintenance_chart_data = [{'type': m.type, 'count': m.count} for m in maintenance_by_type]
    
    # Vehicle usage
    vehicle_usage = db.session.query(
        Vehicle.immatriculation,
        func.count(Mission.id).label('mission_count')
    ).outerjoin(Mission, Vehicle.id == Mission.vehicule_id
    ).group_by(Vehicle.id, Vehicle.immatriculation
    ).order_by(func.count(Mission.id).desc()
    ).limit(10).all()
    
    vehicle_usage_data = [{'vehicle': v.immatriculation, 'missions': v.mission_count} for v in vehicle_usage]
    
    charts = {
        'fuelByMonth': fuel_chart_data,
        'maintenanceByType': maintenance_chart_data,
        'vehicleUsage': vehicle_usage_data
    }

    # --- Role Specific KPIs ---
    
    if user and user.role == 'driver':
        # Driver KPIs - Case-insensitive email matching for more robust link
        driver = Driver.query.filter(func.lower(Driver.email) == func.lower(user.email)).first()
        
        assigned_vehicle = driver.vehicle if driver else None
        
        my_missions_active = 0
        my_missions_planifie = 0
        if driver:
             my_missions_active = Mission.query.filter_by(conducteur_id=driver.id, state='en_cours').count()
             my_missions_planifie = Mission.query.filter_by(conducteur_id=driver.id, state='planifie').count()
        
        vehicle_status = assigned_vehicle.statut if assigned_vehicle else 'Non assigné'
        
        # Consumption for this driver (avg)
        avg_cons = 0
        if user:
            avg_cons = db.session.query(func.avg(FuelEntry.consommation_100))\
                .filter(FuelEntry.demandeur_id == user.id).scalar() or 0
        
        return jsonify({
            'role': 'driver',
            'myVehicle': assigned_vehicle.immatriculation if assigned_vehicle else 'N/A',
            'vehicleStatus': vehicle_status,
            'activeMissions': my_missions_active,
            'upcomingMissions': my_missions_planifie,
            'avgConsumption': round(float(avg_cons or 0), 2),
            **charts
        }), 200

    elif user and user.role == 'collaborator':
        # Collaborator KPIs
        my_missions_total = Mission.query.filter_by(created_by_id=user.id).count()
        my_missions_pending = Mission.query.filter_by(created_by_id=user.id, state='nouveau').count()
        my_missions_active = Mission.query.filter_by(created_by_id=user.id, state='en_cours').count()
        
        # Maintenance requests by me
        my_maintenance_requests = Maintenance.query.filter_by(demandeur_id=user.id).count()
        my_maintenance_pending = Maintenance.query.filter_by(demandeur_id=user.id, statut='en_attente').count()
        
        return jsonify({
            'role': 'collaborator',
            'totalMissions': my_missions_total,
            'pendingMissions': my_missions_pending,
            'activeMissions': my_missions_active,
            'totalRequests': my_maintenance_requests,
            'pendingRequests': my_maintenance_pending,
             **charts
        }), 200

    else:
        # Default: Admin / Technician / Direction
        total_vehicles = Vehicle.query.count()
        vehicles_in_service = Vehicle.query.filter_by(statut='en_service').count()
        vehicles_in_maintenance = Vehicle.query.filter_by(statut='en_maintenance').count()
        total_drivers = Driver.query.count()
        active_drivers = Driver.query.filter_by(statut='actif').count()
        pending_maintenance = Maintenance.query.filter_by(statut='en_attente').count()
        ongoing_missions = Mission.query.filter_by(state='en_cours').count()
        
        avg_consumption = db.session.query(
            func.avg(FuelEntry.consommation_100)
        ).filter(FuelEntry.consommation_100.isnot(None)).scalar()

        return jsonify({
            'role': 'admin',
            'totalVehicules': total_vehicles,
            'vehiculesEnService': vehicles_in_service,
            'vehiculesEnMaintenance': vehicles_in_maintenance,
            'totalChauffeurs': total_drivers,
            'chauffeursActifs': active_drivers,
            'entretiensEnAttente': pending_maintenance,
            'missionsEnCours': ongoing_missions,
            'consommationMoyenne': round(float(avg_consumption or 0), 2),
            **charts
        }), 200
