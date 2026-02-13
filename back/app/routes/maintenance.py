from flask import Blueprint, jsonify, request
import uuid
from datetime import datetime, date

from .. import db
from ..models import Maintenance, Vehicle, User
from ..utils.email_utils import send_maintenance_alert, send_status_update_notification
from ..utils.auth_utils import token_required
import uuid
from datetime import datetime, date

bp = Blueprint("maintenance", __name__)


def parse_date(d_str):
    if not d_str:
        return None
    try:
        # Handle ISO format from frontend (e.g., "2023-10-27T10:00:00Z")
        return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()
    except ValueError:
        # Fallback to simple date format
        return date.fromisoformat(d_str)


def maintenance_to_dict(m: Maintenance) -> dict:
    return {
        "id": m.id,
        "vehiculeId": m.vehicule_id,
        "type": m.type,
        "description": m.description,
        "dateDemande": m.date_demande.isoformat() if m.date_demande else None,
        "datePrevue": m.date_prevue.isoformat() if m.date_prevue else None,
        "kilometrage": m.kilometrage,
        "cout": m.cout,
        "prestataire": m.prestataire,
        "statut": m.statut,
        "demandeurId": m.demandeur_id,
        "imageFacture": m.image_facture,
        "priorite": m.priorite,
        "prochainEntretienKm": m.prochain_entretien_km,
        "localisation": m.localisation,
        "technicien": m.technicien,
        "coutEstime": m.cout_estime,
        "notesSupplementaires": m.notes_supplementaires,
        "compteRendu": m.compte_rendu,
        "dateRealisation": m.date_realisation.isoformat() if m.date_realisation else None,
        "piecesRemplacees": m.pieces_remplacees,
    }


@bp.get("")
def list_maintenances():
    role = request.args.get('role')
    user_id = request.args.get('userId')
    
    query = Maintenance.query
    
    if role == 'collaborator' and user_id:
        query = query.filter_by(demandeur_id=user_id)
    elif role == 'driver' and user_id:
        # Drivers see maintenance for their assigned vehicle OR their own requests
        user = User.query.get(user_id)
        if user:
            from ..models import Driver
            # Find the driver record by email (matricule)
            driver = Driver.query.filter(db.func.lower(Driver.email) == user.email.lower()).first()
            if driver and driver.vehicule_assigne_id:
                query = query.filter(
                    db.or_(
                        Maintenance.vehicule_id == driver.vehicule_assigne_id,
                        Maintenance.demandeur_id == user_id
                    )
                )
            else:
                query = query.filter_by(demandeur_id=user_id)
            
    maintenances = query.order_by(Maintenance.date_demande.desc()).all()
    return jsonify([maintenance_to_dict(m) for m in maintenances]), 200


@bp.post("")
@token_required
def create_maintenance():
    try:
        data = request.get_json() or {}

        required_fields = [
            "vehiculeId",
            "type",
            "description",
            "dateDemande",
            "datePrevue",
            "kilometrage",
            "statut",
            "demandeurId",
        ]
        missing = [f for f in required_fields if f not in data or data[f] == ""]
        if missing:
            return jsonify({"error": f"Champs obligatoires manquants ou vides: {', '.join(missing)}"}), 400

        vehicle = Vehicle.query.get(data["vehiculeId"])
        if not vehicle:
            return jsonify({"error": f"Vehicule non trouvé: {data['vehiculeId']}"}), 404

        demandeur = User.query.get(data["demandeurId"])
        if not demandeur:
            return jsonify({"error": f"Demandeur non trouvé: {data['demandeurId']}"}), 404

        # Handle kilometrage - could be numeric or alphanumeric (e.g., "HS")
        kilometrage_value = data.get("kilometrage")
        try:
            # Try to convert to int
            kilometrage = int(kilometrage_value) if kilometrage_value else 0
        except (ValueError, TypeError):
            # If conversion fails (e.g., "HS"), store 0 or handle as needed
            # The actual string value can be stored in a notes field if needed
            kilometrage = 0
            # Optionally, add the original string to notes_supplementaires if it's not numeric
            if isinstance(kilometrage_value, str) and kilometrage_value.upper() == "HS":
                data["notesSupplementaires"] = (data.get("notesSupplementaires", "") + f" Kilométrage indiqué: {kilometrage_value}.").strip()

        m = Maintenance(
            id=data.get("id") or str(uuid.uuid4()),
            vehicule_id=data["vehiculeId"],
            type=data["type"],
            description=data["description"],
            date_demande=parse_date(data["dateDemande"]),
            date_prevue=parse_date(data["datePrevue"]),
            kilometrage=kilometrage,
            cout=float(data["cout"]) if data.get("cout") is not None else None,
            prestataire=data.get("prestataire"),
            statut=data["statut"],
            demandeur_id=data["demandeurId"],
            image_facture=data.get("imageFacture"),
            priorite=data.get("priorite", "Moyenne"),
            prochain_entretien_km=data.get("prochainEntretienKm"),
            localisation=data.get("localisation"),
            technicien=data.get("technicien"),
            cout_estime=data.get("coutEstime"),
            notes_supplementaires=data.get("notesSupplementaires"),
            compte_rendu=data.get("compteRendu"),
            date_realisation=parse_date(data["dateRealisation"]) if data.get("dateRealisation") else None,
            pieces_remplacees=data.get("piecesRemplacees"),
        )
        db.session.add(m)
        db.session.commit()

        # Trigger email notification
        try:
            send_maintenance_alert(m, vehicle)
        except Exception as e:
            print(f"Erreur d'envoi d'email: {e}")

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
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.put("/<string:maintenance_id>")
@bp.patch("/<string:maintenance_id>")
@token_required
def update_maintenance(maintenance_id: str):
    from flask import g
    m = Maintenance.query.get_or_404(maintenance_id)
    
    # Ownership/Role check: Admin, Technician, or Owner
    if g.user.role not in ['admin', 'technician'] and m.demandeur_id != g.user.id:
        return jsonify({"error": "Vous n'avez pas la permission de modifier cet entretien car vous n'en êtes pas l'auteur"}), 403
        
    try:
        data = request.get_json() or {}

        old_status = m.statut
        for field in [
            "type",
            "description",
            "kilometrage",
            "cout",
            "prestataire",
            "statut",
            "priorite",
            "localisation",
            "technicien",
            "notesSupplementaires",
            "compteRendu",
            "piecesRemplacees"
        ]:
            if field in data:
                if field == "notesSupplementaires":
                    m.notes_supplementaires = data[field]
                elif field == "compteRendu":
                    m.compte_rendu = data[field]
                elif field == "piecesRemplacees":
                    m.pieces_remplacees = data[field]
                else:
                    setattr(m, field, data[field])
        
        if "prochainEntretienKm" in data:
            m.prochain_entretien_km = data["prochainEntretienKm"]
        if "coutEstime" in data:
            m.cout_estime = data["coutEstime"]
        if "dateRealisation" in data:
            m.date_realisation = parse_date(data["dateRealisation"])
        
        # Handle image_facture separately
        if "imageFacture" in data:
            m.image_facture = data["imageFacture"]

        if "dateDemande" in data:
            m.date_demande = parse_date(data["dateDemande"])
        if "datePrevue" in data:
            m.date_prevue = parse_date(data["datePrevue"])

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
        # Trigger notification if status changed to accepte or rejete
        if old_status != m.statut:
            # Automate Vehicle Status Update
            # Get today's date
            today = date.today()
            
            # Logic for 'accepte' - REMOVED as per user request (Only Start/En cours triggers info)
            
            # Logic for 'en_cours' (Démarrer)
            if m.statut == 'en_cours':
                vehicle.statut = 'en_maintenance'
                
            # Logic for 'termine' (Terminer) or cancellation
            elif m.statut in ['cloture', 'rejete', 'termine']:
                # Only revert if it was in maintenance, to avoid side effects
                # We revert to 'disponible' as requested, or 'en_service' (legacy code used en_service, user asked for disponible)
                # Let's use 'disponible' if that's the new standard, or stick to 'en_service' if that's what's used elsewhere.
                # Scheduler uses 'en_maintenance'. 
                # Reverting to 'disponible' as per user request. "remet automatiquement en 'disponible'"
                if vehicle.statut == 'en_maintenance':
                    vehicle.statut = 'disponible'
            
            db.session.commit()

        if old_status != m.statut and m.statut in ['accepte', 'rejete']:
            try:
                send_status_update_notification(m, vehicle)
            except Exception as e:
                print(f"Erreur d'envoi d'email de mise à jour: {e}")
            
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
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.delete("/<string:maintenance_id>")
@token_required
def delete_maintenance(maintenance_id: str):
    from flask import g
    if g.user.role not in ['admin', 'technician']:
        return jsonify({"error": "Vous n'avez pas la permission de supprimer une maintenance"}), 403
        
    try:
        m = Maintenance.query.get_or_404(maintenance_id)
        from ..utils import log_action
        vehicle_info = ""
        try:
            if m.vehicle:
                vehicle_info = f" pour {m.vehicle.immatriculation}"
        except:
            pass
        
        # Capture necessary info before deletion
        m_type = m.type
        m_id = m.id
        
        log_action(action="Suppression", entite="Maintenance", entite_id=m_id, details=f"Suppression entretien {m_type}{vehicle_info}")
        
        db.session.delete(m)
        db.session.commit()
        
        return jsonify({"deleted": True}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


