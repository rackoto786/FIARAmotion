from flask import Blueprint, jsonify, request

from .. import db
from ..models import Driver, Vehicle
from ..utils.auth_utils import token_required

bp = Blueprint("drivers", __name__)


def driver_to_dict(driver: Driver) -> dict:
    return {
        "id": driver.id,
        "nom": driver.nom,
        "prenom": driver.prenom,
        "telephone": driver.telephone,
        "email": driver.email,
        "permis": driver.permis,
        "dateEmbauche": driver.date_embauche.isoformat(),
        "statut": driver.statut,
        "vehiculeAssigne": driver.vehicule_assigne_id,
        "avatar": driver.avatar,
    }


@bp.get("/")
def list_drivers():
    drivers = Driver.query.order_by(Driver.nom, Driver.prenom).all()
    return jsonify([driver_to_dict(d) for d in drivers]), 200


@bp.get("/<string:driver_id>")
def get_driver(driver_id: str):
    driver = Driver.query.get_or_404(driver_id)
    return jsonify(driver_to_dict(driver)), 200


@bp.post("/")
@token_required
def create_driver():
    data = request.get_json() or {}

    required_fields = [
        "id",
        "nom",
        "prenom",
        "telephone",
        "email",
        "permis",
        "dateEmbauche",
        "statut",
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400

    from datetime import date

    vehicle_id = data.get("vehiculeAssigne")
    if vehicle_id:
        Vehicle.query.get_or_404(vehicle_id)

    driver = Driver(
        id=data["id"],
        nom=data["nom"],
        prenom=data["prenom"],
        telephone=data["telephone"],
        email=data["email"],
        permis=data["permis"],
        date_embauche=date.fromisoformat(data["dateEmbauche"]),
        statut=data["statut"],
        vehicule_assigne_id=vehicle_id,
        avatar=data.get("avatar"),
    )
    db.session.add(driver)
    db.session.commit()

    from ..utils import log_action
    log_action(action="Création", entite="Conducteur", entite_id=driver.id, details=f"Conducteur {driver.nom} {driver.prenom} créé")

    return jsonify(driver_to_dict(driver)), 201


@bp.put("/<string:driver_id>")
@bp.patch("/<string:driver_id>")
@token_required
def update_driver(driver_id: str):
    driver = Driver.query.get_or_404(driver_id)
    data = request.get_json() or {}

    for field in ["nom", "prenom", "telephone", "email", "permis", "statut", "avatar"]:
        if field in data:
            setattr(driver, field, data[field])

    from datetime import date

    if "dateEmbauche" in data:
        driver.date_embauche = date.fromisoformat(data["dateEmbauche"])

    if "vehiculeAssigne" in data:
        vehicle_id = data["vehiculeAssigne"]
        if vehicle_id:
            Vehicle.query.get_or_404(vehicle_id)
        driver.vehicule_assigne_id = vehicle_id

    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Modification", entite="Conducteur", entite_id=driver.id, details=f"Modification conducteur {driver.nom} {driver.prenom}")
    
    return jsonify(driver_to_dict(driver)), 200


@bp.delete("/<string:driver_id>")
@token_required
def delete_driver(driver_id: str):
    driver = Driver.query.get_or_404(driver_id)
    db.session.delete(driver)
    db.session.commit()
    
    from ..utils import log_action
    log_action(action="Suppression", entite="Conducteur", entite_id=driver_id, details=f"Suppression conducteur {driver.nom} {driver.prenom}")
    
    return jsonify({"deleted": True}), 200


