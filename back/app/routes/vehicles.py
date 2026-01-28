from flask import Blueprint, jsonify, request
from datetime import date

from .. import db
from ..models import Vehicle
from ..utils.auth_utils import token_required

bp = Blueprint("vehicles", __name__)


def vehicle_to_dict(vehicle: Vehicle) -> dict:
    return {
        "id": vehicle.id,
        "image_128": vehicle.image_128,
        "immatriculation": vehicle.immatriculation,
        "marque": vehicle.marque,
        "modele": vehicle.modele,
        "type_vehicule": vehicle.type_vehicule,
        "autre_type_vehicule": vehicle.autre_type_vehicule,
        "puissance": vehicle.puissance,
        "date_acquisition": vehicle.date_acquisition.isoformat() if vehicle.date_acquisition else None,
        "date_mise_circulation": vehicle.date_mise_circulation.isoformat() if vehicle.date_mise_circulation else None,
        "kilometrage_actuel": vehicle.kilometrage_actuel,
        "numero_chassis": vehicle.numero_chassis,
        "couleur": vehicle.couleur,
        "annee_fabrication": vehicle.annee_fabrication,
        "carburant": vehicle.carburant,
        "statut": vehicle.statut,
        "sous_statut_principale": vehicle.sous_statut_principale,
        "sous_statut_technique": vehicle.sous_statut_technique,
        "sous_statut_exceptionnel": vehicle.sous_statut_exceptionnel,
        "capacite_reservoir": vehicle.capacite_reservoir,
        "ref_pneu_av": vehicle.ref_pneu_av,
        "ref_pneu_ar": vehicle.ref_pneu_ar,
        "numero_moteur": vehicle.numero_moteur,
        "compteur_huile": vehicle.compteur_huile,
        "compteur_filtre": vehicle.compteur_filtre,
        "detenteur": vehicle.detenteur,
        "numero_serie_type": vehicle.numero_serie_type,
        "valeur_acquisition": vehicle.valeur_acquisition,
        "anciennete": vehicle.anciennete,
        "cout_entretien_annuel": vehicle.cout_entretien_annuel,
        "observations": vehicle.observations,
        "num_ancienne_carte_carburant": vehicle.num_ancienne_carte_carburant,
        "num_nouvelle_carte_carburant": vehicle.num_nouvelle_carte_carburant,
        "code_nouvelle_carte_carburant": vehicle.code_nouvelle_carte_carburant,
        "porteur_carte_carburant": vehicle.porteur_carte_carburant,
        "card_holder_name": vehicle.card_holder_name,
        "date_expiration_carburant": vehicle.date_expiration_carburant.isoformat() if vehicle.date_expiration_carburant else None,
        "conducteur_id": vehicle.conducteur_id,
        "service_id": vehicle.service_id,
        "notes": vehicle.notes,
        "vidange_interval_km": vehicle.vidange_interval_km,
        "last_vidange_km": vehicle.last_vidange_km,
        "vidange_alert_sent": vehicle.vidange_alert_sent,
        "filtre_interval_km": vehicle.filtre_interval_km,
        "last_filtre_km": vehicle.last_filtre_km,
        "filtre_alert_sent": vehicle.filtre_alert_sent,
    }


@bp.get("/")
def list_vehicles():
    vehicles = Vehicle.query.order_by(Vehicle.immatriculation).all()
    return jsonify([vehicle_to_dict(v) for v in vehicles]), 200


@bp.get("/<string:vehicle_id>")
def get_vehicle(vehicle_id: str):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    return jsonify(vehicle_to_dict(vehicle)), 200


@bp.post("/")
@token_required
def create_vehicle():
    data = request.get_json() or {}

    required_fields = [
        "id",
        "immatriculation",
        "marque",
        "modele",
        "type_vehicule",
        "date_acquisition",
        "date_mise_circulation",
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

    try:
        # Handle conducteur_id - convert empty string or "none" to None
        conducteur_id = data.get("conducteur_id")
        if conducteur_id in ("", "none", None):
            conducteur_id = None
        
        # Handle service_id - convert empty string to None
        service_id = data.get("service_id")
        if service_id == "":
            service_id = None

        vehicle = Vehicle(
            id=data["id"],
            image_128=data.get("image_128"),
            immatriculation=data["immatriculation"],
            marque=data["marque"],
            modele=data["modele"],
            type_vehicule=data["type_vehicule"],
            autre_type_vehicule=data.get("autre_type_vehicule") or None,
            puissance=int(data["puissance"]) if data.get("puissance") not in (None, "", 0) else None,
            date_acquisition=date.fromisoformat(data["date_acquisition"]),
            date_mise_circulation=date.fromisoformat(data["date_mise_circulation"]),
            kilometrage_actuel=int(data.get("kilometrage_actuel", 0)),
            numero_chassis=data.get("numero_chassis") or None,
            couleur=data.get("couleur") or None,
            annee_fabrication=int(data["annee_fabrication"]) if data.get("annee_fabrication") not in (None, "") else None,
            carburant=data.get("carburant") or None,
            statut=data.get("statut", "principale"),
            sous_statut_principale=data.get("sous_statut_principale") or None,
            sous_statut_technique=data.get("sous_statut_technique") or None,
            sous_statut_exceptionnel=data.get("sous_statut_exceptionnel") or None,
            capacite_reservoir=float(data["capacite_reservoir"]) if data.get("capacite_reservoir") not in (None, "", 0) else None,
            ref_pneu_av=data.get("ref_pneu_av") or None,
            ref_pneu_ar=data.get("ref_pneu_ar") or None,
            numero_moteur=data.get("numero_moteur") or None,
            compteur_huile=int(data["compteur_huile"]) if data.get("compteur_huile") not in (None, "", 0) else None,
            compteur_filtre=int(data["compteur_filtre"]) if data.get("compteur_filtre") not in (None, "", 0) else None,
            detenteur=data.get("detenteur") or None,
            numero_serie_type=data.get("numero_serie_type") or None,
            valeur_acquisition=float(data["valeur_acquisition"]) if data.get("valeur_acquisition") not in (None, "", 0) else None,
            anciennete=data.get("anciennete") or None,
            cout_entretien_annuel=float(data["cout_entretien_annuel"]) if data.get("cout_entretien_annuel") not in (None, "", 0) else None,
            observations=data.get("observations") or None,
            num_ancienne_carte_carburant=data.get("num_ancienne_carte_carburant") or None,
            num_nouvelle_carte_carburant=data.get("num_nouvelle_carte_carburant") or None,
            code_nouvelle_carte_carburant=data.get("code_nouvelle_carte_carburant") or None,
            porteur_carte_carburant=data.get("porteur_carte_carburant") or None,
            card_holder_name=data.get("card_holder_name") or None,
            date_expiration_carburant=date.fromisoformat(data["date_expiration_carburant"]) if data.get("date_expiration_carburant") else None,
            conducteur_id=conducteur_id,
            service_id=service_id,
            notes=data.get("notes") or None,
            vidange_interval_km=int(data.get("vidange_interval_km", 1000)),
            last_vidange_km=int(data.get("last_vidange_km", 0)),
            filtre_interval_km=int(data.get("filtre_interval_km", 1000)),
            last_filtre_km=int(data.get("last_filtre_km", 0)),
        )
        db.session.add(vehicle)
        db.session.commit()

        from ..utils import log_action
        log_action(action="Création", entite="Véhicule", entite_id=vehicle.id, details=f"Création du véhicule {vehicle.immatriculation}")

        return jsonify(vehicle_to_dict(vehicle)), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Erreur de format de données: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erreur serveur: {str(e)}"}), 500


@bp.put("/<string:vehicle_id>")
@bp.patch("/<string:vehicle_id>")
@token_required
def update_vehicle(vehicle_id: str):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    data = request.get_json() or {}

    try:
        fields = [
            "image_128", "immatriculation", "marque", "modele", "type_vehicule", "autre_type_vehicule",
            "numero_chassis", "couleur", "carburant", "statut", "sous_statut_principale",
            "sous_statut_technique", "sous_statut_exceptionnel", "ref_pneu_av", "ref_pneu_ar",
            "numero_moteur", "detenteur", "numero_serie_type", "anciennete", "observations",
            "num_ancienne_carte_carburant", "num_nouvelle_carte_carburant", "code_nouvelle_carte_carburant",
            "porteur_carte_carburant", "card_holder_name", "notes"
        ]

        for field in fields:
            if field in data:
                # Convert empty strings to None
                value = data[field]
                if value == "":
                    value = None
                setattr(vehicle, field, value)

        # Handle foreign keys specially
        if "conducteur_id" in data:
            conducteur_id = data["conducteur_id"]
            if conducteur_id in ("", "none", None):
                vehicle.conducteur_id = None
            else:
                vehicle.conducteur_id = conducteur_id
        
        if "service_id" in data:
            service_id = data["service_id"]
            if service_id == "":
                vehicle.service_id = None
            else:
                vehicle.service_id = service_id

        # Numeric fields
        if "puissance" in data:
            vehicle.puissance = int(data["puissance"]) if data["puissance"] not in (None, "", 0) else None
        if "kilometrage_actuel" in data:
            vehicle.kilometrage_actuel = int(data["kilometrage_actuel"]) if data["kilometrage_actuel"] not in (None, "") else 0
        if "annee_fabrication" in data:
            vehicle.annee_fabrication = int(data["annee_fabrication"]) if data["annee_fabrication"] not in (None, "") else None
        if "capacite_reservoir" in data:
            vehicle.capacite_reservoir = float(data["capacite_reservoir"]) if data["capacite_reservoir"] not in (None, "", 0) else None
        if "compteur_huile" in data:
            vehicle.compteur_huile = int(data["compteur_huile"]) if data["compteur_huile"] not in (None, "", 0) else None
        if "compteur_filtre" in data:
            vehicle.compteur_filtre = int(data["compteur_filtre"]) if data["compteur_filtre"] not in (None, "", 0) else None
        if "valeur_acquisition" in data:
            vehicle.valeur_acquisition = float(data["valeur_acquisition"]) if data["valeur_acquisition"] not in (None, "", 0) else None
        if "cout_entretien_annuel" in data:
            vehicle.cout_entretien_annuel = float(data["cout_entretien_annuel"]) if data["cout_entretien_annuel"] not in (None, "", 0) else None
        
        # Mileage Alert Fields
        if "vidange_interval_km" in data:
            vehicle.vidange_interval_km = int(data["vidange_interval_km"]) if data["vidange_interval_km"] not in (None, "") else 1000
        if "last_vidange_km" in data:
            vehicle.last_vidange_km = int(data["last_vidange_km"]) if data["last_vidange_km"] not in (None, "") else 0
        if "vidange_alert_sent" in data:
            vehicle.vidange_alert_sent = bool(data["vidange_alert_sent"])
            
        if "filtre_interval_km" in data:
            vehicle.filtre_interval_km = int(data["filtre_interval_km"]) if data["filtre_interval_km"] not in (None, "") else 1000
        if "last_filtre_km" in data:
            vehicle.last_filtre_km = int(data["last_filtre_km"]) if data["last_filtre_km"] not in (None, "") else 0
        if "filtre_alert_sent" in data:
            vehicle.filtre_alert_sent = bool(data["filtre_alert_sent"])

        # Date fields
        if "date_acquisition" in data and data["date_acquisition"]:
            vehicle.date_acquisition = date.fromisoformat(data["date_acquisition"])
        if "date_mise_circulation" in data and data["date_mise_circulation"]:
            vehicle.date_mise_circulation = date.fromisoformat(data["date_mise_circulation"])
        if "date_expiration_carburant" in data and data["date_expiration_carburant"]:
            vehicle.date_expiration_carburant = date.fromisoformat(data["date_expiration_carburant"])

        db.session.commit()

        from ..utils import log_action
        log_action(action="Modification", entite="Véhicule", entite_id=vehicle.id, details=f"Modification du véhicule {vehicle.immatriculation}")

        return jsonify(vehicle_to_dict(vehicle)), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({"error": f"Erreur de format de données: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erreur serveur: {str(e)}"}), 500



@bp.delete("/<string:vehicle_id>")
@token_required
def delete_vehicle(vehicle_id: str):
    vehicle = Vehicle.query.get_or_404(vehicle_id)
    db.session.delete(vehicle)
    db.session.commit()

    from ..utils import log_action
    log_action(action="Suppression", entite="Véhicule", entite_id=vehicle_id, details=f"Suppression du véhicule {vehicle.immatriculation}")

    return jsonify({"deleted": True}), 200

@bp.get("/<string:vehicle_id>/maintenance-recap")
def get_maintenance_recap(vehicle_id: str):
    from ..models import Maintenance
    from sqlalchemy import extract, func
    
    # Query maintenance costs grouped by year and month
    results = db.session.query(
        extract('year', Maintenance.date).label('year'),
        extract('month', Maintenance.date).label('month'),
        func.sum(Maintenance.cout).label('total_cost')
    ).filter(Maintenance.vehicule_id == vehicle_id).group_by('year', 'month').order_by('year', 'month').all()
    
    recap = {}
    for year, month, total_cost in results:
        year_str = str(int(year))
        if year_str not in recap:
            recap[year_str] = [0.0] * 12
        recap[year_str][int(month) - 1] = float(total_cost or 0)
        
    return jsonify(recap), 200
