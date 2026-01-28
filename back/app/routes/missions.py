import uuid
from flask import Blueprint, jsonify, request, g
from datetime import datetime, date

from .. import db
from .. models import Mission, Vehicle, Driver, User
from ..utils.email_utils import send_mission_creation_alert, send_mission_status_notification
from ..utils.auth_utils import token_required

bp = Blueprint("missions", __name__)


def mission_to_dict(m: Mission) -> dict:
    return {
        "id": m.id,
        "reference": m.reference,
        "missionnaire": m.missionnaire,
        "vehiculeId": m.vehicule_id,
        "conducteurId": m.conducteur_id,
        "dateDebut": m.date_debut.isoformat(),
        "dateFin": m.date_fin.isoformat() if m.date_fin else None,
        "heureDepart": m.heure_depart,
        "heureRetour": m.heure_retour,
        "lieuDepart": m.lieu_depart,
        "lieuDestination": m.lieu_destination,
        "kilometrageDepart": m.kilometrage_depart,
        "kilometrageRetour": m.kilometrage_retour,
        "kilometreParcouru": m.kilometre_parcouru,
        "state": m.state,
        "immatriculation": m.vehicle.immatriculation if m.vehicle else None, # Added as requested in "Informations de base"
        "createdById": m.created_by_id,
        "missionnaireRetour": m.missionnaire_retour,
    }


@bp.get("/")
def list_missions():
    status_param = request.args.get('status')
    query = Mission.query
    
    if status_param:
        statuses = status_param.split(',')
        query = query.filter(Mission.state.in_(statuses))
    
    missions = query.order_by(Mission.date_debut.desc()).all()
    return jsonify([mission_to_dict(m) for m in missions]), 200


@bp.post("/")
@token_required
def create_mission():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Aucune donnée fournie"}), 400

        required_fields = [
            "vehiculeId",
            "conducteurId",
            "dateDebut",
            "lieuDepart",
            "lieuDestination",
        ]
        
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

        # Vérifier que le véhicule existe
        if not Vehicle.query.get(data["vehiculeId"]):
            return jsonify({"error": f"Véhicule {data['vehiculeId']} non trouvé"}), 400
            
        # Vérifier que le conducteur existe
        if not Driver.query.get(data["conducteurId"]):
            return jsonify({"error": f"Conducteur {data['conducteurId']} non trouvé"}), 400

        # Helper date parsing
        def parse_date(d_str):
            if not d_str: return None
            # Handle "YYYY-MM-DD" or ISO "YYYY-MM-DDTHH:MM:SS" -> return Date object
            if "T" in d_str:
                return datetime.fromisoformat(d_str.replace("Z", "")).date()
            return date.fromisoformat(d_str)

        mission_id = data.get("id") or str(uuid.uuid4())
        
        # Generate Reference: MIS-YYYYMMDD-XXXX
        today_str = date.today().strftime("%Y%m%d")
        short_id = mission_id[:4].upper()
        reference = f"MIS-{today_str}-{short_id}"

        # Calculation logic
        km_depart = int(data.get("kilometrageDepart") or 0)
        km_retour = int(data.get("kilometrageRetour") or 0)
        km_parcouru = 0
        if km_retour > km_depart:
            km_parcouru = km_retour - km_depart

        m = Mission(
            id=mission_id,
            reference=reference,
            missionnaire=data.get("missionnaire"),
            vehicule_id=data["vehiculeId"],
            conducteur_id=data["conducteurId"],
            date_debut=parse_date(data["dateDebut"]),
            date_fin=parse_date(data.get("dateFin")),
            heure_depart=float(data.get("heureDepart") or 0) if data.get("heureDepart") else None,
            heure_retour=float(data.get("heureRetour") or 0) if data.get("heureRetour") else None,
            lieu_depart=data["lieuDepart"],
            lieu_destination=data["lieuDestination"],
            kilometrage_depart=km_depart,
            kilometrage_retour=km_retour,
            kilometre_parcouru=km_parcouru,
            state=data.get("state", "nouveau"),
            created_by_id=g.user.id if hasattr(g, 'user') else None,
        )
        
        db.session.add(m)
        db.session.add(m)
        db.session.commit()

        # Alerting
        try:
            vehicle = Vehicle.query.get(data["vehiculeId"])
            send_mission_creation_alert(m, vehicle)
        except Exception as e:
            print(f"Error triggering alert: { e}")

        from ..utils.notification_utils import create_notification
        create_notification(
            title="Nouvelle mission créée",
            message=f"La mission {m.reference} ({m.lieu_depart} -> {m.lieu_destination}) a été créée.",
            type="info",
            target_role="admin,direction",
            link="/missions"
        )

        from ..utils import log_action
        log_action(action="Création", entite="Mission", entite_id=m.id, details=f"Mission {m.reference} créée ({m.lieu_depart} -> {m.lieu_destination})")

        return jsonify(mission_to_dict(m)), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Erreur lors de la création de la mission: {str(e)}")
        return jsonify({"error": f"Erreur lors de la création: {str(e)}"}), 500


@bp.route('/<string:mission_id>', methods=['PUT', 'PATCH'])
@bp.route('/<string:mission_id>', methods=['PUT', 'PATCH'])
@token_required
def update_mission(mission_id: str):
    m = Mission.query.get_or_404(mission_id)
    
    # Check permissions: Admin, Technician, or Owner
    user = g.user if hasattr(g, 'user') else None
    print(f"[DEBUG PERM] User: {user.name} ({user.id}), Role: {user.role}, Mission CreatedBy: {m.created_by_id}")
    
    if user and user.role not in ['admin', 'technician'] and m.created_by_id != user.id:
        print(f"[DEBUG PERM] Access denied for user {user.id} with role {user.role}")
        return jsonify({"error": f"Permission refusée. Rôle actuel: {user.role}, ID: {user.id}"}), 403

    data = request.get_json() or {}

    # Map API fields to Model fields
    field_mapping = {
        "missionnaire": "missionnaire",
        "vehiculeId": "vehicule_id",
        "conducteurId": "conducteur_id",
        "lieuDepart": "lieu_depart",
        "lieuDestination": "lieu_destination",
        "state": "state",
        "kilometrageDepart": "kilometrage_depart",
        "kilometrageRetour": "kilometrage_retour",
        "missionnaireRetour": "missionnaire_retour",
    }
    
    for api_field, model_field in field_mapping.items():
        if api_field in data:
            val = data[api_field]
            # Convert numeric fields
            if "kilometrage" in api_field.lower():
                val = int(val) if val is not None else 0
            setattr(m, model_field, val)

    # Handle hours
    if "heureDepart" in data:
        m.heure_depart = float(data["heureDepart"]) if data["heureDepart"] else None
    if "heureRetour" in data:
        m.heure_retour = float(data["heureRetour"]) if data["heureRetour"] else None

    # Handle dates
    def parse_date(d_str):
        if not d_str: return None
        if "T" in d_str:
            return datetime.fromisoformat(d_str.replace("Z", "")).date()
        return date.fromisoformat(d_str)

    if "dateDebut" in data:
        m.date_debut = parse_date(data["dateDebut"])
    if "dateFin" in data:
        m.date_fin = parse_date(data["dateFin"])

    # Recalculate distance
    km_depart = m.kilometrage_depart or 0
    km_retour = m.kilometrage_retour or 0
    
    old_state = m.state

    if km_retour > km_depart:
        m.kilometre_parcouru = km_retour - km_depart
    else:
        m.kilometre_parcouru = 0

    try:
        db.session.commit()
        
        # Alerting if state changed
        if old_state != m.state:
             try:
                vehicle = Vehicle.query.get(m.vehicule_id)
                send_mission_status_notification(m, vehicle)
             except Exception as e:
                print(f"Error triggering mission status alert: { e}")

             from ..utils.notification_utils import create_notification
             # Notify direction
             create_notification(
                 title="Mise à jour de mission",
                 message=f"La mission {m.reference} est désormais {m.state}.",
                 type="info",
                 target_role="admin,direction",
                 link="/missions"
             )
             
             # Notify driver if user exists
             driver = Driver.query.get(m.conducteur_id)
             if driver:
                 user = User.query.filter_by(email=driver.email).first()
                 if user:
                     create_notification(
                         title="Statut de votre mission",
                         message=f"Votre mission {m.reference} est passée à l'état : {m.state}.",
                         type="info",
                         target_user_id=user.id,
                         link="/missions"
                     )
             
             from ..utils import log_action
             log_action(action="Changement Statut", entite="Mission", entite_id=m.id, details=f"Mission {m.reference} passée à {m.state}")
                
        return jsonify(mission_to_dict(m)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@bp.delete("/<string:mission_id>")
@token_required
def delete_mission(mission_id: str):
    m = Mission.query.get_or_404(mission_id)

    # Check permissions: Admin, Technician, or Owner
    user = g.user if hasattr(g, 'user') else None
    if user and user.role not in ['admin', 'technician'] and m.created_by_id != user.id:
        return jsonify({"error": "Vous n'avez pas la permission de supprimer cette mission"}), 403

    db.session.delete(m)
    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Mission", entite_id=mission_id, details=f"Mission {m.reference} supprimée")
    
    return jsonify({"deleted": True}), 200


