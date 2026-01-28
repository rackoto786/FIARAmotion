from flask import Blueprint, jsonify, request
import uuid
from datetime import datetime, date
from .. import db
from ..models import Compliance, Vehicle
from ..utils.auth_utils import token_required

bp = Blueprint("compliance", __name__)

def compliance_to_dict(c: Compliance) -> dict:
    return {
        "id": c.id,
        "vehiculeId": c.vehicule_id,
        "vehicule_immatriculation": c.vehicle.immatriculation if c.vehicle else "N/A",
        "type": c.type,
        "numeroDocument": c.numero_document,
        "dateEmission": c.date_emission.isoformat() if c.date_emission else None,
        "dateExpiration": c.date_expiration.isoformat(),
        "prestataire": c.prestataire,
        "cout": c.cout,
        "statut": c.statut,
        "notes": c.notes,
        "createdAt": c.created_at.isoformat() if c.created_at else None
    }

@bp.get("")
@token_required
def list_compliance():
    entries = Compliance.query.order_by(Compliance.date_expiration.asc()).all()
    return jsonify([compliance_to_dict(e) for e in entries]), 200

@bp.get("/alerts")
@token_required
def get_compliance_alerts():
    today = date.today()
    # Find entries expiring in the next 30 days
    entries = Compliance.query.filter(Compliance.date_expiration >= today).order_by(Compliance.date_expiration.asc()).all()
    
    alerts = []
    for e in entries:
        diff = (e.date_expiration - today).days
        if diff <= 30:
            alerts.append({
                **compliance_to_dict(e),
                "daysRemaining": diff
            })
    return jsonify(alerts), 200

@bp.post("")
@token_required
def create_compliance():
    data = request.get_json() or {}
    
    required = ["vehiculeId", "type", "dateExpiration"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

    new_id = str(uuid.uuid4())
    
    def parse_date(d_str):
        if not d_str: return None
        return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()

    entry = Compliance(
        id=new_id,
        vehicule_id=data["vehiculeId"],
        type=data["type"],
        numero_document=data.get("numeroDocument"),
        date_emission=parse_date(data.get("dateEmission")),
        date_expiration=parse_date(data["dateExpiration"]),
        prestataire=data.get("prestataire"),
        cout=float(data.get("cout", 0)),
        statut=data.get("statut", "valide"),
        notes=data.get("notes")
    )
    
    db.session.add(entry)
    db.session.commit()
    
    from ..utils import log_action
    vehicle = Vehicle.query.get(entry.vehicule_id)
    log_action(action="Création", entite="Échéance", entite_id=entry.id, details=f"Nouvelle échéance {entry.type} pour {vehicle.immatriculation if vehicle else '???'} (Expire le {entry.date_expiration})")

    return jsonify(compliance_to_dict(entry)), 201

@bp.put("/<string:id>")
@token_required
def update_compliance(id: str):
    entry = Compliance.query.get_or_404(id)
    data = request.get_json() or {}
    
    def parse_date(d_str):
        if not d_str: return None
        return datetime.fromisoformat(d_str.replace("Z", "+00:00")).date()

    if "type" in data: entry.type = data["type"]
    if "numeroDocument" in data: entry.numero_document = data["numeroDocument"]
    if "dateEmission" in data: entry.date_emission = parse_date(data["dateEmission"])
    if "dateExpiration" in data: entry.date_expiration = parse_date(data["dateExpiration"])
    if "prestataire" in data: entry.prestataire = data["prestataire"]
    if "cout" in data: entry.cout = float(data["cout"])
    if "statut" in data: entry.statut = data["statut"]
    if "notes" in data: entry.notes = data["notes"]
    
    db.session.commit()
    return jsonify(compliance_to_dict(entry)), 200

@bp.delete("/<string:id>")
@token_required
def delete_compliance(id: str):
    entry = Compliance.query.get_or_404(id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"success": True}), 200

@bp.post("/test-alerts")
@token_required
def test_expiry_alerts():
    """Manually trigger document expiry alert check (for testing)."""
    from flask import g
    from ..utils.scheduler import check_expiring_documents
    from flask import current_app
    
    # Only admins can trigger this
    if g.user.role != 'admin':
        return jsonify({"error": "Accès non autorisé"}), 403
    
    try:
        count = check_expiring_documents(current_app._get_current_object())
        return jsonify({
            "success": True,
            "message": f"{count} alerte(s) envoyée(s)",
            "count": count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
