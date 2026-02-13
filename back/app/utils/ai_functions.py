"""
AI Functions for the Fleet Management Assistant.
These functions are called by the AI to fetch real-time data from the database.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from ..models import Vehicle, Maintenance, Mission, Planning, Compliance, FuelEntry, Driver
from .. import db
from sqlalchemy import and_, or_, func


def get_available_vehicles(target_date: str = None) -> Dict[str, Any]:
    """
    Get vehicles available on a specific date.
    
    Args:
        target_date: Date in format YYYY-MM-DD. If None, uses today.
    
    Returns:
        Dictionary with available vehicles and count
    """
    if target_date:
        check_date = datetime.strptime(target_date, '%Y-%m-%d').date()
    else:
        check_date = date.today()
    
    # Get all vehicles
    all_vehicles = Vehicle.query.all()
    
    # Get vehicles in missions on that date
    vehicles_in_mission = db.session.query(Mission.vehicule_id).filter(
        and_(
            Mission.date_debut <= check_date,
            or_(Mission.date_fin >= check_date, Mission.date_fin.is_(None)),
            Mission.state.in_(['planifiee', 'en_cours'])
        )
    ).all()
    mission_vehicle_ids = [v[0] for v in vehicles_in_mission]
    
    # Get vehicles in planning on that date
    vehicles_in_planning = db.session.query(Planning.vehicule_id).filter(
        and_(
            Planning.date_debut <= check_date,
            Planning.date_fin >= check_date,
            Planning.status.in_(['acceptee', 'en_attente'])
        )
    ).all()
    planning_vehicle_ids = [v[0] for v in vehicles_in_planning]
    
    # Get vehicles in maintenance
    vehicles_in_maintenance = db.session.query(Maintenance.vehicule_id).filter(
        Maintenance.statut == 'en_cours'
    ).all()
    maintenance_vehicle_ids = [v[0] for v in vehicles_in_maintenance]
    
    # Combine all unavailable vehicles
    unavailable_ids = set(mission_vehicle_ids + planning_vehicle_ids + maintenance_vehicle_ids)
    
    # Filter available vehicles
    available = [v for v in all_vehicles if v.id not in unavailable_ids and v.statut == 'principale']
    
    return {
        "date": check_date.strftime('%d/%m/%Y'),
        "total_vehicles": len(all_vehicles),
        "available_count": len(available),
        "vehicles": [
            {
                "immatriculation": v.immatriculation,
                "marque": v.marque,
                "modele": v.modele,
                "type": v.type_vehicule,
                "statut": v.statut
            }
            for v in available
        ]
    }


def get_recent_requests(days: int = 7) -> Dict[str, Any]:
    """
    Get recent maintenance and planning requests.
    
    Args:
        days: Number of days to look back (default 7)
    
    Returns:
        Dictionary with recent requests
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get recent maintenance requests
    maintenance_requests = Maintenance.query.filter(
        and_(
            Maintenance.date_demande >= cutoff_date.date(),
            Maintenance.statut.in_(['en_attente', 'accepte'])
        )
    ).order_by(Maintenance.date_demande.desc()).all()
    
    # Get recent planning requests
    planning_requests = Planning.query.filter(
        and_(
            Planning.date_debut >= cutoff_date.date(),
            Planning.status.in_(['en_attente', 'acceptee'])
        )
    ).order_by(Planning.date_debut.desc()).all()
    
    return {
        "period_days": days,
        "maintenance_requests": [
            {
                "id": m.id,
                "type": m.type,
                "vehicule": m.vehicle.immatriculation if m.vehicle else "N/A",
                "date": m.date_demande.strftime('%d/%m/%Y'),
                "statut": m.statut,
                "demandeur": m.demandeur.name if m.demandeur else "N/A"
            }
            for m in maintenance_requests
        ],
        "planning_requests": [
            {
                "id": p.id,
                "type": p.type,
                "vehicule": p.vehicle.immatriculation if p.vehicle else "N/A",
                "date_debut": p.date_debut.strftime('%d/%m/%Y'),
                "date_fin": p.date_fin.strftime('%d/%m/%Y'),
                "status": p.status,
                "created_by": p.created_by.name if p.created_by else "N/A"
            }
            for p in planning_requests
        ],
        "total_count": len(maintenance_requests) + len(planning_requests)
    }


def get_vehicle_info(immatriculation: str) -> Dict[str, Any]:
    """
    Get detailed information about a specific vehicle.
    
    Args:
        immatriculation: Vehicle registration number
    
    Returns:
        Dictionary with vehicle details
    """
    vehicle = Vehicle.query.filter_by(immatriculation=immatriculation.upper()).first()
    
    if not vehicle:
        return {"error": f"Véhicule {immatriculation} non trouvé"}
    
    # Get latest fuel entry
    latest_fuel = FuelEntry.query.filter_by(vehicule_id=vehicle.id).order_by(FuelEntry.date.desc()).first()
    
    # Get maintenance count
    maintenance_count = Maintenance.query.filter_by(vehicule_id=vehicle.id).count()
    
    # Get current mission
    current_mission = Mission.query.filter(
        and_(
            Mission.vehicule_id == vehicle.id,
            Mission.state.in_(['planifiee', 'en_cours'])
        )
    ).order_by(Mission.date_debut.asc()).first()
    
    # Get next mission (after current)
    next_mission = Mission.query.filter(
        and_(
            Mission.vehicule_id == vehicle.id,
            Mission.state == 'planifiee',
            Mission.date_debut > (current_mission.date_end if current_mission and current_mission.date_end else datetime.now().date())
        )
    ).order_by(Mission.date_debut.asc()).first()

    # Get next maintenance
    next_maintenance = Maintenance.query.filter(
        and_(
            Maintenance.vehicule_id == vehicle.id,
            Maintenance.statut.in_(['en_attente', 'accepte'])
        )
    ).order_by(Maintenance.date_demande.asc()).first()
    
    return {
        "immatriculation": vehicle.immatriculation,
        "marque": vehicle.marque,
        "modele": vehicle.modele,
        "type": vehicle.type_vehicule,
        "statut": vehicle.statut,
        "kilometrage_actuel": vehicle.kilometrage_actuel,
        "date_acquisition": vehicle.date_acquisition.strftime('%d/%m/%Y') if vehicle.date_acquisition else None,
        "carburant": vehicle.carburant,
        "derniere_consommation": latest_fuel.consommation_100 if latest_fuel else None,
        "nombre_maintenances": maintenance_count,
        "mission_en_cours": {
            "reference": current_mission.reference,
            "destination": current_mission.lieu_destination,
            "conducteur": current_mission.driver.nom if current_mission.driver else "N/A",
            "state": current_mission.state,
            "dates": f"{current_mission.date_debut} au {current_mission.date_fin}"
        } if current_mission else None,
        "prochaine_mission": {
            "destination": next_mission.lieu_destination,
            "date_debut": next_mission.date_debut.strftime('%d/%m/%Y')
        } if next_mission else None,
        "maintenance_a_venir": {
            "type": next_maintenance.type,
            "date": next_maintenance.date_demande.strftime('%d/%m/%Y'),
            "statut": next_maintenance.statut
        } if next_maintenance else None
    }


def get_maintenance_status() -> Dict[str, Any]:
    """
    Get current maintenance status and pending requests.
    
    Returns:
        Dictionary with maintenance statistics
    """
    pending = Maintenance.query.filter_by(statut='en_attente').all()
    accepted = Maintenance.query.filter_by(statut='accepte').all()
    in_progress = Maintenance.query.filter_by(statut='en_cours').all()
    
    return {
        "pending_count": len(pending),
        "accepted_count": len(accepted),
        "in_progress_count": len(in_progress),
        "pending_requests": [
            {
                "id": m.id,
                "vehicule": m.vehicle.immatriculation if m.vehicle else "N/A",
                "type": m.type,
                "date": m.date_demande.strftime('%d/%m/%Y'),
                "demandeur": m.demandeur.name if m.demandeur else "N/A"
            }
            for m in pending[:5]  # Limit to 5 most recent
        ]
    }


def get_missions_by_date(target_date: str = None) -> Dict[str, Any]:
    """
    Get missions for a specific date.
    
    Args:
        target_date: Date in format YYYY-MM-DD. If None, uses today.
    
    Returns:
        Dictionary with missions
    """
    if target_date:
        check_date = datetime.strptime(target_date, '%Y-%m-%d').date()
    else:
        check_date = date.today()
    
    missions = Mission.query.filter(
        and_(
            Mission.date_debut <= check_date,
            or_(Mission.date_fin >= check_date, Mission.date_fin.is_(None))
        )
    ).all()
    
    return {
        "date": check_date.strftime('%d/%m/%Y'),
        "mission_count": len(missions),
        "missions": [
            {
                "reference": m.reference,
                "vehicule": m.vehicle.immatriculation if m.vehicle else "N/A",
                "conducteur": m.driver.nom if m.driver else "N/A",
                "destination": m.lieu_destination,
                "depart": m.lieu_depart,
                "state": m.state,
                "missionnaire": m.missionnaire
            }
            for m in missions
        ]
    }


def search_vehicles(query: str) -> Dict[str, Any]:
    """
    Search vehicles by various criteria.
    
    Args:
        query: Search term (immatriculation, marque, modele, type)
    
    Returns:
        Dictionary with matching vehicles
    """
    search_term = f"%{query}%"
    
    vehicles = Vehicle.query.filter(
        or_(
            Vehicle.immatriculation.ilike(search_term),
            Vehicle.marque.ilike(search_term),
            Vehicle.modele.ilike(search_term),
            Vehicle.type_vehicule.ilike(search_term)
        )
    ).all()
    
    return {
        "query": query,
        "result_count": len(vehicles),
        "vehicles": [
            {
                "immatriculation": v.immatriculation,
                "marque": v.marque,
                "modele": v.modele,
                "type": v.type_vehicule,
                "statut": v.statut,
                "kilometrage": v.kilometrage_actuel
            }
            for v in vehicles
        ]
    }


def get_compliance_alerts() -> Dict[str, Any]:
    """
    Get upcoming document expirations.
    
    Returns:
        Dictionary with compliance alerts
    """
    today = date.today()
    thirty_days = today + timedelta(days=30)
    
    expiring_soon = Compliance.query.filter(
        and_(
            Compliance.date_expiration >= today,
            Compliance.date_expiration <= thirty_days
        )
    ).order_by(Compliance.date_expiration.asc()).all()
    
    return {
        "alert_count": len(expiring_soon),
        "alerts": [
            {
                "vehicule": c.vehicle.immatriculation if c.vehicle else "N/A",
                "type": c.type,
                "numero_document": c.numero_document,
                "date_expiration": c.date_expiration.strftime('%d/%m/%Y'),
                "jours_restants": (c.date_expiration - today).days,
                "prestataire": c.prestataire
            }
            for c in expiring_soon
        ]
    }


def get_fuel_stats(period_days: int = 30) -> Dict[str, Any]:
    """
    Get fuel consumption statistics.
    
    Args:
        period_days: Number of days to analyze (default 30)
    
    Returns:
        Dictionary with fuel statistics
    """
    cutoff_date = datetime.now() - timedelta(days=period_days)
    
    fuel_entries = FuelEntry.query.filter(
        FuelEntry.date >= cutoff_date.date()
    ).all()
    
    if not fuel_entries:
        return {
            "period_days": period_days,
            "total_entries": 0,
            "message": "Aucune entrée de carburant pour cette période"
        }
    
    total_cost = sum(f.total_achete for f in fuel_entries if f.total_achete)
    total_volume = sum(f.quantite_achetee for f in fuel_entries if f.quantite_achetee)
    avg_consumption = sum(f.consommation_100 for f in fuel_entries if f.consommation_100) / len([f for f in fuel_entries if f.consommation_100]) if any(f.consommation_100 for f in fuel_entries) else 0
    
    return {
        "period_days": period_days,
        "total_entries": len(fuel_entries),
        "total_cost": round(total_cost, 2),
        "total_volume_liters": round(total_volume, 2),
        "average_consumption_per_100km": round(avg_consumption, 2),
        "average_cost_per_entry": round(total_cost / len(fuel_entries), 2)
    }



def get_driver_info(name_query: str) -> Dict[str, Any]:
    """
    Search for a driver and get their details.
    
    Args:
        name_query: Name or part of name to search
    
    Returns:
        Dictionary with driver details
    """
    driver = Driver.query.filter(Driver.nom.ilike(f"%{name_query}%")).first()
    
    if not driver:
        return {"error": f"Conducteur '{name_query}' non trouvé"}
        
    # Get current mission
    current_mission = Mission.query.filter(
        and_(
            Mission.driver_id == driver.id,
            Mission.state.in_(['planifiee', 'en_cours'])
        )
    ).first()
    
    return {
        "id": driver.id,
        "nom": driver.nom,
        "telephone": driver.telephone,
        "permis": driver.numero_permis,
        "statut": "En mission" if current_mission else "Disponible",
        "mission_actuelle": {
            "reference": current_mission.reference,
            "vehicule": current_mission.vehicle.immatriculation if current_mission.vehicle else "N/A",
            "destination": current_mission.lieu_destination
        } if current_mission else None
    }

# Function registry for AI to call
AVAILABLE_FUNCTIONS = {
    "get_available_vehicles": get_available_vehicles,
    "get_recent_requests": get_recent_requests,
    "get_vehicle_info": get_vehicle_info,
    "get_maintenance_status": get_maintenance_status,
    "get_missions_by_date": get_missions_by_date,
    "search_vehicles": search_vehicles,
    "get_compliance_alerts": get_compliance_alerts,
    "get_fuel_stats": get_fuel_stats,
    "get_driver_info": get_driver_info,
}


# Function definitions for Gemini function calling
FUNCTION_DECLARATIONS = [
    {
        "name": "get_available_vehicles",
        "description": "Obtenir la liste des véhicules disponibles à une date donnée. Un véhicule est disponible s'il n'est pas en mission, en planning ou en maintenance.",
        "parameters": {
            "type": "object",
            "properties": {
                "target_date": {
                    "type": "string",
                    "description": "Date au format YYYY-MM-DD. Si non fourni, utilise aujourd'hui."
                }
            }
        }
    },
    {
        "name": "get_recent_requests",
        "description": "Obtenir les demandes récentes de maintenance et de planning.",
        "parameters": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "Nombre de jours à regarder en arrière (défaut: 7)"
                }
            }
        }
    },
    {
        "name": "get_vehicle_info",
        "description": "Obtenir les informations détaillées d'un véhicule (km, carburant, maintenance, driver) par son immatriculation.",
        "parameters": {
            "type": "object",
            "properties": {
                "immatriculation": {
                    "type": "string",
                    "description": "Numéro d'immatriculation du véhicule"
                }
            },
            "required": ["immatriculation"]
        }
    },
    {
        "name": "get_maintenance_status",
        "description": "Obtenir le statut actuel des maintenances (en attente, acceptées, en cours).",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_missions_by_date",
        "description": "Obtenir les missions prévues pour une date donnée.",
        "parameters": {
            "type": "object",
            "properties": {
                "target_date": {
                    "type": "string",
                    "description": "Date au format YYYY-MM-DD. Si non fourni, utilise aujourd'hui."
                }
            }
        }
    },
    {
        "name": "search_vehicles",
        "description": "Rechercher des véhicules par immatriculation, marque, modèle ou type.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Terme de recherche"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_compliance_alerts",
        "description": "Obtenir les alertes d'échéances de documents (assurance, vignette, visite technique, etc.) expirant dans les 30 prochains jours.",
        "parameters": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_fuel_stats",
        "description": "Obtenir les statistiques de consommation de carburant sur une période donnée.",
        "parameters": {
            "type": "object",
            "properties": {
                "period_days": {
                    "type": "integer",
                    "description": "Nombre de jours à analyser (défaut: 30)"
                }
            }
        }
    },
    {
        "name": "get_driver_info",
        "description": "Rechercher un conducteur par son nom et obtenir ses détails et statut actuel.",
        "parameters": {
            "type": "object",
            "properties": {
                "name_query": {
                    "type": "string",
                    "description": "Nom ou partie du nom du conducteur"
                }
            },
            "required": ["name_query"]
        }
    }
]


# OpenAI Tool Format
OPENAI_TOOLS = [
    {
        "type": "function",
        "function": declaration
    } for declaration in FUNCTION_DECLARATIONS
]
