import uuid
from flask import Blueprint, jsonify, request, g
from datetime import datetime, date

from .. import db
from .. models import Mission, Vehicle, Driver, User, Planning
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
        "titre": m.titre,
        "priorite": m.priorite,
        "numeroOm": m.numero_om,
        "zone": m.zone,
        "distancePrevue": m.distance_prevue,
        "trajet": m.trajet,
        "createdAt": m.created_at.isoformat() if m.created_at else None,
    }


@bp.get("/")
def list_missions():
    status_param = request.args.get('status')
    query = Mission.query
    
    if status_param:
        statuses = status_param.split(',')
        query = query.filter(Mission.state.in_(statuses))
    
    missions = query.order_by(Mission.created_at.desc().nulls_last(), Mission.date_debut.desc()).all()
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

        # Validation Zone/Numero OM
        if data.get("zone") == "periferie" and not data.get("numeroOm"):
             return jsonify({"error": "Le numéro d'OM est obligatoire pour une mission en périphérie"}), 400

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
            titre=data.get("titre"),
            priorite=data.get("priorite", "Moyenne"),
            numero_om=data.get("numeroOm"),
            zone=data.get("zone", "ville"),
            distance_prevue=float(data.get("distancePrevue") or 0) if data.get("distancePrevue") else None,
            trajet=data.get("trajet"),
        )
        
        db.session.add(m)

        # --- Auto-create Planning Entry ---
        try:
            print(f"[PLANNING_SYNC] Starting sync for mission {m.reference}")
            from datetime import time, timedelta
            
            # Flush to ensure m.id is persistent if we need it (though it's already set)
            db.session.flush()
            print(f"[PLANNING_SYNC] Mission ID after flush: {m.id}")

            # Helper to combine date and float hour
            def get_dt(d_obj, h_val):
                if not d_obj: 
                    print("[PLANNING_SYNC] WARNING: Date object is missing!")
                    return datetime.now()
                h_val = h_val or 0.0
                hours = int(h_val)
                minutes = int((h_val - hours) * 60)
                if hours >= 24: hours = 23; minutes = 59
                
                # Ensure d_obj is a date (not datetime)
                if isinstance(d_obj, datetime):
                    d_obj = d_obj.date()
                return datetime.combine(d_obj, time(hours, minutes))

            p_start = get_dt(m.date_debut, m.heure_depart)
            p_end = get_dt(m.date_fin or m.date_debut, m.heure_retour) 
            
            print(f"[PLANNING_SYNC] Calculated Dates: {p_start} to {p_end}")

            # If end is before start, default to 4 hours
            if p_end <= p_start:
                 p_end = p_start + timedelta(hours=4)

            planning_description = f"Mission {m.reference}: {m.lieu_depart} -> {m.lieu_destination}"
            if m.missionnaire:
                planning_description += f" ({m.missionnaire})"

            print(f"[PLANNING_SYNC] Creating Planning object linked to vehicle {m.vehicule_id}")
            new_planning = Planning(
                id=str(uuid.uuid4()),
                vehicule_id=m.vehicule_id,
                conducteur_id=m.conducteur_id,
                date_debut=p_start,
                date_fin=p_end,
                type="mission",
                description=planning_description,
                status="en_attente",
                created_by_id=m.created_by_id,
                mission_id=m.id
            )
            db.session.add(new_planning)
            print(f"[PLANNING_SYNC] SUCCESS: Planning {new_planning.id} added to session for Mission {m.id}")
            
        except Exception as e:
            print(f"[PLANNING_SYNC] ERROR: {e}")
            import traceback
            traceback.print_exc()
            # If sync fails, we still want the mission but maybe the user wants it atomic
            # For now, let's keep it atomic (re-raising) to be sure it's working or failing loud.
            raise e

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

    # Capture old state BEFORE updating fields
    old_state = m.state

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
        "titre": "titre",
        "priorite": "priorite",
        "numeroOm": "numero_om",
        "zone": "zone",
        "distancePrevue": "distance_prevue",
        "trajet": "trajet",
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

    if km_retour > km_depart:
        m.kilometre_parcouru = km_retour - km_depart
    else:
        m.kilometre_parcouru = 0

    try:
        db.session.commit()
        
        # Alerting if state changed
        if old_state != m.state:
             # Automate Vehicle Status Update FIRST
             # User request: "demarrer(mission) la status du vehicule changer en 'en service/sur terrain'"
             # "terminer(mission)" -> "en disponible"
             
             print(f"[MISSION DEBUG] Status changed from {old_state} to {m.state}")
             
             if m.state == 'en_cours':
                 # Updates vehicle status to 'sur_terrain' (In Service/On Field)
                 vehicle_to_update = Vehicle.query.get(m.vehicule_id)
                 print(f"[MISSION DEBUG] Entering 'en_cours' logic. Vehicle: {vehicle_to_update.immatriculation if vehicle_to_update else 'None'}, Current Status: {vehicle_to_update.statut if vehicle_to_update else 'None'}")
                 if vehicle_to_update:
                     vehicle_to_update.statut = 'sur_terrain'
                     db.session.commit()
                     print(f"[MISSION DEBUG] Vehicle status updated to: sur_terrain")
                     
             elif m.state == 'termine':
                 # Updates vehicle status to 'disponible'
                 vehicle_to_update = Vehicle.query.get(m.vehicule_id)
                 print(f"[MISSION DEBUG] Entering 'termine' logic. Vehicle: {vehicle_to_update.immatriculation if vehicle_to_update else 'None'}, Current Status: {vehicle_to_update.statut if vehicle_to_update else 'None'}")
                 if vehicle_to_update and vehicle_to_update.statut == 'sur_terrain':
                     vehicle_to_update.statut = 'disponible'
                     db.session.commit()
                     print(f"[MISSION DEBUG] Vehicle status updated to: disponible")
             
             if m.state in ['annule', 'rejeter']:
                 Planning.query.filter_by(mission_id=m.id).delete()
                 db.session.commit()
                 print(f"[MISSION DEBUG] Associated planning entries deleted for mission {m.id}")

             # Now handle notifications and emails
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

    # Delete associated planning entries
    Planning.query.filter_by(mission_id=mission_id).delete()

    db.session.delete(m)
    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Mission", entite_id=mission_id, details=f"Mission {m.reference} supprimée")
    
    return jsonify({"deleted": True}), 200


