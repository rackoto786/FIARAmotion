from flask import Blueprint, jsonify
from sqlalchemy import func
from datetime import date
from collections import defaultdict

from .. import db
from ..models import Vehicle, FuelEntry, Maintenance

bp = Blueprint("reports", __name__)

@bp.get("/global_summary")
def get_global_summary():
    vehicles = Vehicle.query.all()
    
    # 1. Aggregate Costs per Vehicle per Year
    # We want Total Cost = Fuel + Maintenance for each year 2018-2025
    
    # Fuel: {(vid, year, month): cost}
    fuel_stats = db.session.query(
        FuelEntry.vehicule_id,
        func.extract('year', FuelEntry.date).label('year'),
        func.extract('month', FuelEntry.date).label('month'),
        func.sum(FuelEntry.total_achete).label('total_cost')
    ).group_by(
        FuelEntry.vehicule_id, 
        func.extract('year', FuelEntry.date),
        func.extract('month', FuelEntry.date)
    ).all()

    # Maintenance: {(vid, year, month): cost}
    maintenance_stats = db.session.query(
        Maintenance.vehicule_id,
        func.extract('year', Maintenance.date).label('year'),
        func.extract('month', Maintenance.date).label('month'),
        func.sum(Maintenance.cout).label('total_cost')
    ).group_by(
        Maintenance.vehicule_id, 
        func.extract('year', Maintenance.date),
        func.extract('month', Maintenance.date)
    ).all()
    
    # Total Maintenance Lifetime: {vid: total_cost}
    total_maintenance_lifetime = db.session.query(
        Maintenance.vehicule_id,
        func.sum(Maintenance.cout).label('total_cost')
    ).group_by(Maintenance.vehicule_id).all()
    
    # Process into dictionaries
    monthly_details = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    vehicle_year_costs = defaultdict(lambda: defaultdict(float))
    
    vehicle_maintenance_lifetime = defaultdict(float)
    vehicle_fuel_lifetime = defaultdict(float)

    # Track all years encountered in data
    all_years = {date.today().year}

    for vid, year, month, cost in fuel_stats:
        if cost is not None and year is not None:
            y, m = int(year), int(month)
            c = float(cost)
            vehicle_year_costs[vid][y] += c
            monthly_details[vid][y][m] += c
            vehicle_fuel_lifetime[vid] += c
            all_years.add(y)

    for vid, year, month, cost in maintenance_stats:
        if cost is not None and year is not None:
            y, m = int(year), int(month)
            c = float(cost)
            vehicle_year_costs[vid][y] += c
            monthly_details[vid][y][m] += c
            vehicle_maintenance_lifetime[vid] += c
            all_years.add(y)

    # Backup: insure lifetime maintenance covers even entries without dates if any
    for vid, cost in total_maintenance_lifetime:
        if cost:
            # We use the separate query for absolute total maintenance
            vehicle_maintenance_lifetime[vid] = float(cost)
            
    summary_data = []
    current_year = date.today().year
    year_range = sorted(list(set(range(2018, max(max(all_years), current_year) + 1))))

    for v in vehicles:
        # Ancienneté
        date_mec = v.date_mise_circulation
        anciennete_str = ""
        if date_mec:
            delta = date.today() - date_mec
            years = delta.days // 365
            months = (delta.days % 365) // 30
            anciennete_str = f"{years} ans {months} mois" if years > 0 else f"{months} mois"

        # Status Logic
        statut_recap = "INCONNU"
        if v.statut in ['principale', 'technique']:
            statut_recap = "ACTU"
        elif v.statut == 'exceptionnel':
            statut_recap = "VENDUE" if v.sous_statut_exceptionnel == 'vendu' else "PERDU"

        row = {
            "id": v.id,
            "immatriculation": v.immatriculation,
            "type_vehicule": v.type_vehicule,
            "marque": f"{v.marque} {v.modele}",
            "annee_mise_circulation": v.date_mise_circulation.isoformat() if v.date_mise_circulation else None,
            "statut": statut_recap,
            "valeur_acquisition": v.valeur_acquisition or 0,
            "annee_acquisition": v.date_acquisition.year if v.date_acquisition else None,
            "anciennete": anciennete_str,
            "monthly_details": monthly_details[v.id],
            "total_maintenance": vehicle_maintenance_lifetime[v.id],
            "total_fuel": vehicle_fuel_lifetime[v.id],
            "total_global": vehicle_maintenance_lifetime[v.id] + vehicle_fuel_lifetime[v.id]
        }
        
        # Add yearly total costs
        for year in year_range:
            row[f"cost_{year}"] = vehicle_year_costs[v.id][year]
            
        summary_data.append(row)

    return jsonify(summary_data), 200

@bp.get("/stats")
def get_reports_stats():
    from ..models import Mission
    today = date.today()
    current_year = today.year
    
    # --- 1. Summary Cards (KPIs) ---
    total_vehicles = Vehicle.query.count()
    
    # Annual fuel (current year)
    annual_fuel = db.session.query(func.sum(FuelEntry.quantite_achetee)).filter(
        func.extract('year', FuelEntry.date) == current_year
    ).scalar() or 0
    
    # Total maintenance count (current year)
    total_maintenance_count = Maintenance.query.filter(
        func.extract('year', Maintenance.date) == current_year
    ).count()
    
    # Availability: (Total - In Maintenance) / Total
    in_maintenance = Vehicle.query.filter(Vehicle.statut == 'technique').count()
    availability = round(((total_vehicles - in_maintenance) / total_vehicles * 100), 1) if total_vehicles > 0 else 0
    
    # Previous month fuel to show trend (simplified)
    # ... (skipping complex trend logic for now)

    # --- 2. Monthly Costs (Fuel + Maintenance) ---
    # Monthly Fuel Costs
    monthly_fuel = db.session.query(
        func.extract('month', FuelEntry.date).label('month'),
        func.sum(FuelEntry.total_achete).label('cost')
    ).filter(func.extract('year', FuelEntry.date) == current_year).group_by(func.extract('month', FuelEntry.date)).all()
    
    # Monthly Maintenance Costs
    monthly_maint = db.session.query(
        func.extract('month', Maintenance.date).label('month'),
        func.sum(Maintenance.cout).label('cost')
    ).filter(func.extract('year', Maintenance.date) == current_year).group_by(func.extract('month', Maintenance.date)).all()
    
    month_names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    cost_data = []
    
    fuel_map = {int(m): float(c or 0) for m, c in monthly_fuel}
    maint_map = {int(m): float(c or 0) for m, c in monthly_maint}
    
    for i in range(1, 13):
        cost_data.append({
            "month": month_names[i-1],
            "cout": fuel_map.get(i, 0),
            "maintenance": maint_map.get(i, 0)
        })

    # --- 3. Maintenance Cost by Type ---
    maint_by_type = db.session.query(
        Maintenance.type,
        func.sum(Maintenance.cout).label('total')
    ).group_by(Maintenance.type).all()
    
    maint_type_data = [{"type": t, "cout": float(c or 0)} for t, c in maint_by_type]

    # --- 4. Vehicle Performance ---
    # Group mission stats by vehicle
    mission_stats = db.session.query(
        Mission.vehicule_id,
        func.count(Mission.id).label('missions_count'),
        func.sum(Mission.kilometre_parcouru).label('total_km')
    ).group_by(Mission.vehicule_id).all()
    
    # Group fuel stats (for consumption)
    fuel_perf = db.session.query(
        FuelEntry.vehicule_id,
        func.avg(FuelEntry.consommation_100).label('avg_cons')
    ).group_by(FuelEntry.vehicule_id).all()
    
    mission_map = {vid: (count, km) for vid, count, km in mission_stats}
    fuel_perf_map = {vid: float(cons or 0) for vid, cons in fuel_perf}
    
    vehicles = Vehicle.query.all()
    vehicle_usage = []
    for v in vehicles:
        m_count, m_km = mission_map.get(v.id, (0, 0))
        vehicle_usage.append({
            "vehicule": v.immatriculation,
            "missions": m_count,
            "km": m_km or 0,
            "consumption": round(fuel_perf_map.get(v.id, 0), 1)
        })

    return jsonify({
        "summary": {
            "totalVehicles": total_vehicles,
            "annualFuel": annual_fuel,
            "maintenanceCount": total_maintenance_count,
            "availability": availability
        },
        "costData": cost_data,
        "maintenanceByType": maint_type_data,
        "vehicleUsage": vehicle_usage
    }), 200
