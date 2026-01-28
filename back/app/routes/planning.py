from flask import Blueprint, jsonify, request

from .. import db
from ..models import Planning, Vehicle, Driver, User
from ..utils.email_utils import send_planning_creation_alert, send_planning_status_notification
from ..utils.auth_utils import token_required
from flask import g

bp = Blueprint("planning", __name__)


def planning_to_dict(p: Planning) -> dict:
    return {
        "id": p.id,
        "vehiculeId": p.vehicule_id,
        "conducteurId": p.conducteur_id,
        "dateDebut": p.date_debut.isoformat(),
        "dateFin": p.date_fin.isoformat(),
        "type": p.type,
        "description": p.description,
        "status": p.status,
        "createdById": p.created_by_id,
    }


@bp.get("/")
def list_planning():
    items = Planning.query.order_by(Planning.date_debut).all()
    return jsonify([planning_to_dict(p) for p in items]), 200



from ..models import Planning, Vehicle, Driver, User

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

    Vehicle.query.get_or_404(data["vehiculeId"])
    if data.get("conducteurId"):
        Driver.query.get_or_404(data["conducteurId"])

    import uuid
    from datetime import datetime

    # Parse dates safely
    try:
        date_debut = datetime.fromisoformat(data["dateDebut"].replace("Z", "+00:00")).date()
        date_fin = datetime.fromisoformat(data["dateFin"].replace("Z", "+00:00")).date()
    except ValueError:
        # Fallback for simple date strings
        from datetime import date
        date_debut = date.fromisoformat(data["dateDebut"])
        date_fin = date.fromisoformat(data["dateFin"])

    p = Planning(
        id=data.get("id") or str(uuid.uuid4()),
        vehicule_id=data["vehiculeId"],
        conducteur_id=data.get("conducteurId") or None,
        date_debut=date_debut,
        date_fin=date_fin,
        type=data["type"],
        description=data["description"],
        status="en_attente",
        created_by_id=user.id
    )
    db.session.add(p)
    db.session.commit()

    # Alerting
    try:
        vehicle = Vehicle.query.get(data["vehiculeId"])
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
        
        # Check permissions: Admin, Technician or Owner
        if user.role not in ['admin', 'technician'] and p.created_by_id != user.id:
            return jsonify({"error": "Vous n'avez pas la permission de modifier cette réservation"}), 403

        data = request.get_json() or {}
        old_status = p.status

        for field in ["type", "description", "status"]:
            if field in data:
                setattr(p, field, data[field])


        import uuid
        from datetime import datetime
        
        # Helper for date parsing
        def parse_date(d_str):
            try:
                # Handle empty strings if they slip through
                if not d_str: 
                    raise ValueError("Date string is empty")
                return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()
            except ValueError:
                from datetime import date
                return date.fromisoformat(d_str)

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
    
    # Check permissions: Admin, Technician or Owner
    if user.role not in ['admin', 'technician'] and p.created_by_id != user.id:
        return jsonify({"error": "Vous n'avez pas la permission de supprimer cette réservation"}), 403

    db.session.delete(p)
    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Planning", entite_id=planning_id, details=f"Suppression réservation {p.type} pour {p.vehicle.immatriculation}")
    
    return jsonify({"deleted": True}), 200


