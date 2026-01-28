from flask import Blueprint, jsonify, request

from .. import db
from ..models import Maintenance, Vehicle, User
from ..utils.email_utils import send_maintenance_alert, send_status_update_notification
from ..utils.auth_utils import token_required

bp = Blueprint("maintenance", __name__)


def maintenance_to_dict(m: Maintenance) -> dict:
    return {
        "id": m.id,
        "vehiculeId": m.vehicule_id,
        "type": m.type,
        "description": m.description,
        "date": m.date.isoformat(),
        "kilometrage": m.kilometrage,
        "cout": m.cout,
        "prestataire": m.prestataire,
        "statut": m.statut,
        "demandeurId": m.demandeur_id,
        "imageFacture": m.image_facture,
    }


@bp.get("")
def list_maintenances():
    role = request.args.get('role')
    user_id = request.args.get('userId')
    
    query = Maintenance.query
    
    if role == 'collaborator' and user_id:
        query = query.filter_by(demandeur_id=user_id)
            
    maintenances = query.order_by(Maintenance.date.desc()).all()
    return jsonify([maintenance_to_dict(m) for m in maintenances]), 200


@bp.post("")
@token_required
def create_maintenance():
    data = request.get_json() or {}

    required_fields = [
        "vehiculeId",
        "type",
        "description",
        "date",
        "kilometrage",
        "statut",
        "demandeurId",
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

    vehicle = Vehicle.query.get(data["vehiculeId"])
    if not vehicle:
        return jsonify({"error": f"Vehicule non trouvé: {data['vehiculeId']}"}), 404

    demandeur = User.query.get(data["demandeurId"])
    if not demandeur:
        return jsonify({"error": f"Demandeur non trouvé: {data['demandeurId']}"}), 404

    import uuid
    from datetime import datetime

    # Helper for date parsing
    def parse_date(d_str):
        try:
            return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()
        except ValueError:
            from datetime import date
            return date.fromisoformat(d_str)

    m = Maintenance(
        id=data.get("id") or str(uuid.uuid4()),
        vehicule_id=data["vehiculeId"],
        type=data["type"],
        description=data["description"],
        date=parse_date(data["date"]),
        kilometrage=int(data["kilometrage"]),
        cout=float(data["cout"]) if data.get("cout") is not None else None,
        prestataire=data.get("prestataire"),
        statut=data["statut"],
        demandeur_id=data["demandeurId"],
        image_facture=data.get("imageFacture"),
    )
    db.session.add(m)
    db.session.commit()

    # Trigger email notification
    send_maintenance_alert(m, vehicle)

    from ..utils.notification_utils import create_notification
    create_notification(
        title="Nouvelle demande d'entretien",
        message=f"Une nouvelle demande d'entretien ({m.type}) a été créée pour le véhicule {vehicle.immatriculation}.",
        type="warning",
        target_role="admin,technician",
        link="/maintenance"
    )

    from ..utils import log_action
    log_action(action="Création", entite="Maintenance", entite_id=m.id, details=f"Demande d'entretien {m.type} créée pour {vehicle.immatriculation}")

    return jsonify(maintenance_to_dict(m)), 201


@bp.put("/<string:maintenance_id>")
@bp.patch("/<string:maintenance_id>")
@token_required
def update_maintenance(maintenance_id: str):
    m = Maintenance.query.get_or_404(maintenance_id)
    data = request.get_json() or {}

    old_status = m.statut
    for field in [
        "type",
        "description",
        "kilometrage",
        "cout",
        "prestataire",
        "statut",
    ]:
        if field in data:
            setattr(m, field, data[field])
    
    # Handle image_facture separately
    if "imageFacture" in data:
        m.image_facture = data["imageFacture"]

    from datetime import datetime
    
    # Helper for date parsing matches logic in create
    def parse_date(d_str):
        try:
            return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()
        except ValueError:
            from datetime import date
            return date.fromisoformat(d_str)

    if "date" in data:
        m.date = parse_date(data["date"])

    if "vehiculeId" in data:
        vehicle = Vehicle.query.get_or_404(data["vehiculeId"])
        m.vehicule_id = data["vehiculeId"]
    else:
        vehicle = m.vehicle

    if "demandeurId" in data:
        User.query.get_or_404(data["demandeurId"])
        m.demandeur_id = data["demandeurId"]

    db.session.commit()

    # Trigger notification if status changed to accepte or rejete
    if old_status != m.statut:
        # Automate Vehicle Status Update
        if m.statut in ['accepte', 'en_cours']:
            vehicle.statut = 'en_maintenance'
        elif m.statut in ['cloture', 'rejete'] and vehicle.statut == 'en_maintenance':
             # Only revert if it was in maintenance, to avoid side effects
             vehicle.statut = 'en_service'
        
        db.session.commit()

    if old_status != m.statut and m.statut in ['accepte', 'rejete']:
        send_status_update_notification(m, vehicle)
        
        from ..utils.notification_utils import create_notification
        status_label = "acceptée" if m.statut == 'accepte' else "rejetée"
        create_notification(
            title=f"Demande d'entretien {status_label}",
            message=f"Votre demande d'entretien pour le véhicule {vehicle.immatriculation} a été {status_label}.",
            type="success" if m.statut == 'accepte' else "error",
            target_user_id=m.demandeur_id,
            link="/maintenance"
        )
        
        # Reset mileage alerts if it's a vidange or filtre and status is 'accepte'
        if m.statut == 'accepte':
            if m.type == 'vidange':
                vehicle.last_vidange_km = vehicle.kilometrage_actuel
                vehicle.vidange_alert_sent = False
            elif m.type == 'filtre':
                vehicle.last_filtre_km = vehicle.kilometrage_actuel
                vehicle.filtre_alert_sent = False
            db.session.commit()

    from ..utils import log_action
    log_action(action="Modification", entite="Maintenance", entite_id=m.id, details=f"Mise à jour entretien {m.type} pour {vehicle.immatriculation}")

    return jsonify(maintenance_to_dict(m)), 200


@bp.delete("/<string:maintenance_id>")
@token_required
def delete_maintenance(maintenance_id: str):
    m = Maintenance.query.get_or_404(maintenance_id)
    db.session.delete(m)
    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Maintenance", entite_id=maintenance_id, details=f"Suppression entretien {m.type} pour {m.vehicle.immatriculation}")
    
    return jsonify({"deleted": True}), 200


