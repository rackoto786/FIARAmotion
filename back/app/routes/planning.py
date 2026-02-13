from flask import Blueprint, jsonify, request

from .. import db
from ..models import Planning, Vehicle, Driver, User, Mission
from ..utils.email_utils import send_planning_creation_alert, send_planning_status_notification
from ..utils.auth_utils import token_required
from flask import g

bp = Blueprint("planning", __name__)
 
PRIORITY_MAP = {
    "Critique": 1,
    "Haute": 2,
    "Moyenne": 3,
    "Basse": 4
}


def planning_to_dict(p: Planning) -> dict:
    d = {
        "id": p.id,
        "vehiculeId": p.vehicule_id,
        "conducteurId": p.conducteur_id,
        "dateDebut": p.date_debut.isoformat(),
        "dateFin": p.date_fin.isoformat(),
        "type": p.type,
        "description": p.description,
        "status": p.status,
        "createdById": p.created_by_id,
        "priorite": p.priorite,
        "numeroOm": p.numero_om,
        "zone": p.zone,
        "mission_id": p.mission_id,
    }
    
    # Enrich with mission data if linked
    if p.mission:
        m = p.mission
        d.update({
            "missionnaire": m.missionnaire,
            "lieuDepart": m.lieu_depart,
            "lieuDestination": m.lieu_destination,
            "kilometrageDepart": m.kilometrage_depart,
            "titre": m.titre,
            "priorite_label": m.priorite,
            "distancePrevue": m.distance_prevue,
            "trajet": m.trajet,
            "mission_reference": m.reference
        })
    return d


@bp.get("/")
def list_planning():
    items = Planning.query.order_by(Planning.priorite.asc(), Planning.date_debut.asc()).all()
    return jsonify([planning_to_dict(p) for p in items]), 200



# Helper to get current user (DEPRECATED: Use @token_required and g.user)
def get_current_user():
    return g.user if hasattr(g, 'user') else None

@bp.post("/")
@token_required
def create_planning():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non authentifié"}), 401

    data = request.get_json() or {}

    required_fields = [
        "vehiculeId",
        "dateDebut",
        "dateFin",
        "type",
        "description",
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

    # Validation Zone/Numero OM
    if data.get("zone") == "periferie" and not data.get("numeroOm"):
             return jsonify({"error": "Le numéro d'OM est obligatoire pour une réservation en périphérie"}), 400

    vehicle = Vehicle.query.get_or_404(data["vehiculeId"])
    if data.get("conducteurId"):
        Driver.query.get_or_404(data["conducteurId"])

    import uuid
    from datetime import datetime, date

    # Parse dates safely
    try:
        date_debut = datetime.fromisoformat(data["dateDebut"].replace("Z", "+00:00"))
        date_fin = datetime.fromisoformat(data["dateFin"].replace("Z", "+00:00"))
    except ValueError:
        from datetime import date as py_date
        d_debut = py_date.fromisoformat(data["dateDebut"])
        d_fin = py_date.fromisoformat(data["dateFin"])
        date_debut = datetime(d_debut.year, d_debut.month, d_debut.day, 8, 0, 0)
        date_fin = datetime(d_fin.year, d_fin.month, d_fin.day, 18, 0, 0)

    # Auto-assign priority if not provided
    priority = data.get("priorite_val")
    if priority is None:
        p_label = data.get("priorite", "Moyenne")
        priority = PRIORITY_MAP.get(p_label, 3)

    # Create Mission first if it's a mission type
    mission_id = None
    if data.get("type") == "mission" or data.get("titre") or data.get("missionnaire"):
        mission_uuid = str(uuid.uuid4())
        today_str = date.today().strftime("%Y%m%d")
        short_id = mission_uuid[:4].upper()
        reference = f"MIS-{today_str}-{short_id}"

        # Combine destinations into trajet
        destinations = data.get("destinations", [])
        trajet = " --> ".join([d for d in destinations if d])
        
        # Calculate hours from dates
        h_depart = date_debut.hour + date_debut.minute / 60.0
        h_retour = date_fin.hour + date_fin.minute / 60.0

        m = Mission(
            id=mission_uuid,
            reference=reference,
            missionnaire=data.get("missionnaire"),
            vehicule_id=data["vehiculeId"],
            conducteur_id=data.get("conducteurId"),
            date_debut=date_debut.date(),
            date_fin=date_fin.date(),
            heure_depart=h_depart,
            heure_retour=h_retour,
            lieu_depart=data.get("lieuDepart", "CAMPUS"),
            lieu_destination=data.get("lieuDestination") or (destinations[-1] if destinations else ""),
            kilometrage_depart=int(data.get("kilometrageDepart") or 0),
            state="nouveau",
            created_by_id=user.id,
            titre=data.get("titre"),
            priorite=data.get("priorite", "Moyenne"), # String label
            numero_om=data.get("numeroOm"),
            zone=data.get("zone", "ville"),
            distance_prevue=float(data.get("distancePrevue") or 0),
            trajet=trajet
        )
        db.session.add(m)
        mission_id = m.id

    p = Planning(
        id=data.get("id") or str(uuid.uuid4()),
        vehicule_id=data["vehiculeId"],
        conducteur_id=data.get("conducteurId") or None,
        date_debut=date_debut,
        date_fin=date_fin,
        type=data["type"],
        description=data["description"] or f"Mission: {data.get('titre', '')}",
        status="en_attente",
        created_by_id=user.id,
        priorite=priority,
        numero_om=data.get("numeroOm"),
        zone=data.get("zone", "ville"),
        mission_id=mission_id
    )
    db.session.add(p)
    db.session.commit()

    # Alerting
    try:
        send_planning_creation_alert(p, vehicle)
    except Exception as e:
        print(f"Error triggering alert: {e}")

    from ..utils.notification_utils import create_notification
    create_notification(
        title="Nouvelle demande de réservation",
        message=f"Une nouvelle demande de réservation ({p.type}) a été créée pour le véhicule {vehicle.immatriculation}.",
        type="info",
        target_role="admin,technician",
        link="/planning"
    )

    from ..utils import log_action
    log_action(action="Création", entite="Planning", entite_id=p.id, details=f"Demande de réservation {p.type} pour {vehicle.immatriculation}")

    return jsonify(planning_to_dict(p)), 201


@bp.get("/<string:planning_id>")
def get_planning(planning_id: str):
    p = Planning.query.get_or_404(planning_id)
    return jsonify(planning_to_dict(p)), 200


@bp.put("/<string:planning_id>")
@bp.patch("/<string:planning_id>")
@token_required
def update_planning(planning_id: str):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non authentifié"}), 401

    try:
        p = Planning.query.get_or_404(planning_id)
        
        # Check permissions: Admin or Technician only
        if user.role not in ['admin', 'technician']:
            return jsonify({"error": "Vous n'avez pas la permission de modifier cette réservation"}), 403

        data = request.get_json() or {}
        old_status = p.status

        for field in ["type", "description", "status"]:
            if field in data:
                setattr(p, field, data[field])
        
        if "priorite" in data:
            if isinstance(data["priorite"], int):
                p.priorite = data["priorite"]
            else:
                p.priorite = PRIORITY_MAP.get(data["priorite"], 3)
        
        if "numeroOm" in data:
            p.numero_om = data["numeroOm"]
        if "zone" in data:
            p.zone = data["zone"]


        import uuid
        from datetime import datetime
        
        # Helper for date parsing
        def parse_date(d_str):
            try:
                # Handle empty strings if they slip through
                if not d_str: 
                    raise ValueError("Date string is empty")
                return datetime.fromisoformat(d_str.replace("Z", "+00:00"))
            except ValueError:
                from datetime import date
                d = date.fromisoformat(d_str)
                # If only date string, convert to datetime at midnight or similar
                return datetime(d.year, d.month, d.day, 0, 0, 0)

        if "dateDebut" in data:
            p.date_debut = parse_date(data["dateDebut"])
        if "dateFin" in data:
            p.date_fin = parse_date(data["dateFin"])

        if "vehiculeId" in data:
            Vehicle.query.get_or_404(data["vehiculeId"])
            p.vehicule_id = data["vehiculeId"]

        if "conducteurId" in data:
            # Handle explicit null/empty string to remove driver
            if data["conducteurId"] == "" or data["conducteurId"] is None:
                p.conducteur_id = None
            else:
                Driver.query.get_or_404(data["conducteurId"])
                p.conducteur_id = data["conducteurId"]

        # Sync with linked mission
        if p.type == "mission":
            m = p.mission
            if not m:
                # Create on the fly if missing
                import uuid
                from datetime import date as py_date
                mission_uuid = str(uuid.uuid4())
                today_str = py_date.today().strftime("%Y%m%d")
                short_id = mission_uuid[:4].upper()
                reference = f"MIS-{today_str}-{short_id}"
                
                m = Mission(
                    id=mission_uuid,
                    reference=reference,
                    vehicule_id=p.vehicule_id,
                    conducteur_id=p.conducteur_id,
                    date_debut=p.date_debut.date(),
                    date_fin=p.date_fin.date(),
                    state="nouveau",
                    created_by_id=user.id
                )
                db.session.add(m)
                p.mission_id = m.id
                db.session.flush() # Ensure m is available
            
            if "missionnaire" in data: m.missionnaire = data["missionnaire"]
            if "lieuDepart" in data: m.lieu_depart = data["lieuDepart"]
            if "lieuDestination" in data: m.lieu_destination = data["lieuDestination"]
            if "kilometrageDepart" in data: m.kilometrage_depart = int(data["kilometrageDepart"] or 0)
            if "titre" in data: m.titre = data["titre"]
            if "priorite" in data: m.priorite = data["priorite"]
            if "numeroOm" in data: m.numero_om = data["numeroOm"]
            if "zone" in data: m.zone = data["zone"]
            if "distancePrevue" in data: m.distance_prevue = float(data["distancePrevue"] or 0)
            if "destinations" in data:
                m.trajet = " --> ".join([d for d in data["destinations"] if d])
            
            m.date_debut = p.date_debut.date()
            m.heure_depart = p.date_debut.hour + p.date_debut.minute / 60.0
            m.date_fin = p.date_fin.date()
            m.heure_retour = p.date_fin.hour + p.date_fin.minute / 60.0
            m.vehicule_id = p.vehicule_id
            m.conducteur_id = p.conducteur_id
        db.session.commit()

        vehicle = p.vehicle
        
        # Alerting for status change
        if old_status != p.status:
            # Automate Vehicle Status Update
            if p.status == 'acceptee':
                if p.type in ['mission', 'reserve']:
                    vehicle.statut = 'reserve'
                elif p.type == 'maintenance':
                    vehicle.statut = 'en_maintenance'
            elif p.status in ['cloturee', 'rejetee']:
                vehicle.statut = 'en_service'
            
            db.session.commit()

            try:
                send_planning_status_notification(p, vehicle)
            except Exception as e:
                print(f"Error triggering status alert: {e}")

        from ..utils.notification_utils import create_notification
        status_label = "acceptée" if p.status == 'acceptee' else "rejetée" if p.status == 'rejetee' else p.status
        create_notification(
            title=f"Réservation {status_label}",
            message=f"Votre réservation ({p.type}) pour le véhicule {vehicle.immatriculation} a été {status_label}.",
            type="success" if p.status == 'acceptee' else "error" if p.status == 'rejetee' else "info",
            target_user_id=p.created_by_id,
            link="/planning"
        )

        from ..utils import log_action
        log_action(action="Modification", entite="Planning", entite_id=p.id, details=f"Mise à jour réservation {p.type} (Statut: {p.status})")

        return jsonify(planning_to_dict(p)), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.delete("/<string:planning_id>")
@token_required
def delete_planning(planning_id: str):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non authentifié"}), 401

    p = Planning.query.get_or_404(planning_id)
    
    # Check permissions: Admin or Technician only
    if user.role not in ['admin', 'technician']:
        return jsonify({"error": "Vous n'avez pas la permission de supprimer cette réservation"}), 403

    # Extract info before deletion to avoid DetachedInstanceError
    planning_type = p.type
    vehicle_immat = p.vehicle.immatriculation if p.vehicle else "Inconnu"
    planning_id_str = p.id

    try:
        db.session.delete(p)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erreur lors de la suppression: {str(e)}"}), 500
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Planning", entite_id=planning_id_str, details=f"Suppression réservation {planning_type} pour {vehicle_immat}")
    
    return jsonify({"deleted": True}), 200


