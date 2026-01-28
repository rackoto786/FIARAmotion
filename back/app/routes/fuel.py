from flask import Blueprint, jsonify, request
from datetime import datetime
import uuid
from typing import Dict, Any

from .. import db
from ..models import FuelEntry, Vehicle, Driver
from ..utils.email_utils import send_mileage_limit_alert, send_fuel_creation_alert, send_abnormal_fuel_alert
from ..utils.auth_utils import token_required

bp = Blueprint("fuel", __name__)

from flask import Blueprint, jsonify, request
from datetime import datetime
import uuid
from typing import Dict, Any

from .. import db
from ..models import FuelEntry, Vehicle, Driver

bp = Blueprint("fuel", __name__)

def fuel_to_dict(entry: FuelEntry) -> Dict[str, Any]:
    return {
        "id": entry.id,
        "vehiculeId": entry.vehicule_id,
        "conducteurId": entry.conducteur_id,
        
        "date": entry.date.isoformat() if entry.date else None,
        "heure": entry.heure,
        
        "station": entry.station,
        "produit": entry.produit,
        "prixUnitaire": entry.prix_unitaire,
        
        "precedentKm": entry.precedent_km,
        "actuelKm": entry.actuel_km,
        "kmParcouru": entry.km_parcouru,
        
        "ancienSolde": entry.ancien_solde,
        "montantRecharge": entry.montant_recharge,
        "quantiteRechargee": entry.quantite_rechargee,
        "bonus": entry.bonus,
        
        # New fields
        "numeroTicket": entry.numero_ticket,
        "soldeTicket": entry.solde_ticket,
        "montantRistourne": entry.montant_ristourne,
        "montantTransactionAnnuler": entry.montant_transaction_annuler,
        
        "totalAchete": entry.total_achete,
        "quantiteAchetee": entry.quantite_achetee,
        "coutAuKm": entry.cout_au_km,
        
        "consommation100": entry.consommation_100,
        "distancePossible": entry.distance_possible,
        "distancePossibleRestant": entry.distance_possible_restant,
        
        "nouveauSolde": entry.nouveau_solde,
        "quantiteRestante": entry.quantite_restante,
        "differenceSolde": entry.difference_solde,
        
        "capaciteReservoir": entry.capacite_reservoir,
        "alerte": entry.alerte,
        "statut_carburant": entry.statut_carburant or "Normal",
        
        # Legacy/Compatibility
        "kilometrage": entry.kilometrage or entry.actuel_km,
        "volume": entry.volume or entry.quantite_achetee,
        "cout": entry.cout or entry.total_achete,
        
        "statut": entry.statut,
    }

@bp.get("/")
def list_fuel_entries():
    role = request.args.get('role')
    user_email = request.args.get('email')
    
    query = FuelEntry.query
    
    if role == 'collaborator' and user_email:
        # Find the driver associated with this email
        driver = Driver.query.filter(db.func.lower(Driver.email) == user_email.lower()).first()
        if driver:
            query = query.filter_by(conducteur_id=driver.id)
        else:
            # If no driver found for this email, they see nothing or we might return an empty list
            return jsonify([]), 200
            
    entries = query.order_by(FuelEntry.date.desc()).all()
    return jsonify([fuel_to_dict(e) for e in entries]), 200

def safe_float(val):
    try:
        return float(val) if val is not None else 0.0
    except (ValueError, TypeError):
        return 0.0

def safe_int(val):
    try:
        return int(val) if val is not None else 0
    except (ValueError, TypeError):
        return 0

def calculate_derived_fields(data):
    # Inputs
    actuel = safe_int(data.get("actuelKm"))
    precedent = safe_int(data.get("precedentKm"))
    prix = safe_float(data.get("prixUnitaire"))
    total_achete = safe_float(data.get("totalAchete"))
    montant_recharge = safe_float(data.get("montantRecharge"))
    ancien_solde = safe_float(data.get("ancienSolde"))
    solde_ticket = safe_float(data.get("soldeTicket"))
    
    # Calculations
    km_parcouru = actuel - precedent
    
    quantite_rechargee = 0.0
    if prix > 0:
        quantite_rechargee = montant_recharge / prix
        
    quantite_achetee = 0.0
    if prix > 0:
        quantite_achetee = total_achete / prix
        
    cout_au_km = 0.0
    if km_parcouru > 0:
        cout_au_km = total_achete / km_parcouru
        
    consommation_100 = 0.0
    if km_parcouru > 0:
        consommation_100 = (quantite_achetee * 100) / km_parcouru
        
    nouveau_solde = ancien_solde + montant_recharge - total_achete
    
    # User specific difference field
    difference_solde = solde_ticket - ancien_solde
    
    quantite_restante = 0.0
    if prix > 0:
        quantite_restante = nouveau_solde / prix
        
    distance_possible = 0.0 # From purchased qty
    if consommation_100 > 0:
        distance_possible = (quantite_achetee * 100) / consommation_100
        
    distance_possible_restant = 0.0 # From remaining qty
    if consommation_100 > 0:
        distance_possible_restant = (quantite_restante * 100) / consommation_100
        
    return {
        "km_parcouru": km_parcouru,
        "quantite_rechargee": quantite_rechargee,
        "quantite_achetee": quantite_achetee,
        "cout_au_km": cout_au_km,
        "consommation_100": consommation_100,
        "nouveau_solde": nouveau_solde,
        "quantite_restante": quantite_restante,
        "distance_possible": distance_possible,
        "distance_possible_restant": distance_possible_restant,
        "difference_solde": difference_solde
    }

@bp.post("/")
@token_required
def create_fuel_entry():
    try:
        data = request.get_json() or {}
        print("Données reçues (Fuel):", data)
        
        # Validation minimale des champs requis pour la création
        required = ["vehiculeId", "conducteurId", "date"]
        missing = [f for f in required if f not in data]
        if missing:
            return jsonify({"error": f"Champs manquants: {', '.join(missing)}"}), 400
            
        if not Vehicle.query.get(data["vehiculeId"]):
            return jsonify({"error": "Véhicule non trouvé"}), 404
        if not Driver.query.get(data["conducteurId"]):
            return jsonify({"error": "Conducteur non trouvé"}), 404

        try:
            entry_date = (
                datetime.strptime(data["date"], "%Y-%m-%d").date()
                if isinstance(data["date"], str)
                else data["date"]
            )
        except ValueError:
            return jsonify({"error": "Format de date invalide. Utilisez YYYY-MM-DD"}), 400

        # Calculations
        calcs = calculate_derived_fields(data)
        
        # Create Entry
        entry = FuelEntry(
            id=str(uuid.uuid4()),
            vehicule_id=data["vehiculeId"],
            conducteur_id=data["conducteurId"],
            date=entry_date,
            heure=data.get("heure", ""),
            station=data.get("station", ""),
            produit=data.get("produit", ""),
            
            precedent_km=safe_int(data.get("precedentKm")),
            actuel_km=safe_int(data.get("actuelKm")),
            km_parcouru=calcs["km_parcouru"],
            
            prix_unitaire=safe_float(data.get("prixUnitaire")),
            ancien_solde=safe_float(data.get("ancienSolde")),
            montant_recharge=safe_float(data.get("montantRecharge")),
            quantite_rechargee=calcs["quantite_rechargee"],
            bonus=safe_float(data.get("bonus")),
            
            # New fields
            numero_ticket=data.get("numeroTicket"),
            solde_ticket=safe_float(data.get("soldeTicket")),
            montant_ristourne=safe_float(data.get("montantRistourne")),
            montant_transaction_annuler=safe_float(data.get("montantTransactionAnnuler")),
            capacite_reservoir=safe_float(data.get("capaciteReservoir")),
            alerte=data.get("alerte"),
            
            total_achete=safe_float(data.get("totalAchete")),
            quantite_achetee=calcs["quantite_achetee"],
            cout_au_km=calcs["cout_au_km"],
            
            consommation_100=calcs["consommation_100"],
            distance_possible=calcs["distance_possible"],
            distance_possible_restant=calcs["distance_possible_restant"],
            
            nouveau_solde=calcs["nouveau_solde"],
            quantite_restante=calcs["quantite_restante"],
            difference_solde=calcs["difference_solde"],
            
            # Legacy mapping
            kilometrage=safe_int(data.get("actuelKm")),
            volume=calcs["quantite_achetee"],
            cout=safe_float(data.get("totalAchete")),
            
            statut=data.get("statut", "en_attente")
        )
        
        db.session.add(entry)
        
        # Update vehicle mileage and check for alerts
        vehicle = Vehicle.query.get(entry.vehicule_id)
        if vehicle:
            vehicle.kilometrage_actuel = entry.actuel_km
            
            # Check Oil Change Alert
            if not vehicle.vidange_alert_sent and vehicle.vidange_interval_km > 0:
                if vehicle.kilometrage_actuel >= (vehicle.last_vidange_km + vehicle.vidange_interval_km):
                    if send_mileage_limit_alert(vehicle, 'vidange', vehicle.kilometrage_actuel, vehicle.vidange_interval_km):
                        vehicle.vidange_alert_sent = True
            
            # Check Filter Change Alert
            if not vehicle.filtre_alert_sent and vehicle.filtre_interval_km > 0:
                if vehicle.kilometrage_actuel >= (vehicle.last_filtre_km + vehicle.filtre_interval_km):
                    if send_mileage_limit_alert(vehicle, 'filtre', vehicle.kilometrage_actuel, vehicle.filtre_interval_km):
                        vehicle.filtre_alert_sent = True
            
            # Anomaly Detection: Purchase Quantity > Tank Capacity
            if entry.quantite_achetee > (vehicle.capacite_reservoir or 0):
                entry.alerte = "Carburant anormal - Quantité supérieure à la capacité du réservoir"
                entry.statut_carburant = "Dépassement"
                try:
                    driver_name = f"{entry.driver.prenom} {entry.driver.nom}" if entry.driver else "Inconnu"
                    send_abnormal_fuel_alert(entry, vehicle, driver_name)
                except Exception as e:
                    print(f"Error triggering abnormal fuel alert: {e}")
            else:
                entry.statut_carburant = "Normal"
        
        db.session.commit()
        
        # Trigger email notification
        try:
            send_fuel_creation_alert(entry, vehicle)
        except Exception as e:
            print(f"Error triggering fuel alert: {e}")

        from ..utils import log_action
        log_action(action="Création", entite="Carburant", entite_id=entry.id, details=f"Plein carburant enregistré pour {vehicle.immatriculation} ({entry.quantite_rechargee}L)")

        return jsonify(fuel_to_dict(entry)), 201

    except Exception as e:
        db.session.rollback()
        print(f"Erreur création fuel: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erreur serveur lors de la création"}), 500

@bp.put("/<string:entry_id>")
@bp.patch("/<string:entry_id>")
@token_required
def update_fuel_entry(entry_id: str):
    try:
        entry = FuelEntry.query.get_or_404(entry_id)
        data = request.get_json() or {}
        
        # Determine current values (prefer incoming data, fallback to existing entry)
        current_data = fuel_to_dict(entry)
        merged_data = {**current_data, **data}
        
        # Recalculate
        calcs = calculate_derived_fields(merged_data)
        
        # Update fields
        if "vehiculeId" in data:
             entry.vehicule_id = data["vehiculeId"]
        if "conducteurId" in data:
             entry.conducteur_id = data["conducteurId"]
        if "date" in data:
            try:
                entry.date = datetime.strptime(data["date"], "%Y-%m-%d").date()
            except:
                pass
        
        mapping = {
            "heure": "heure",
            "station": "station",
            "produit": "produit",
            "precedentKm": "precedent_km",
            "actuelKm": "actuel_km",
            "prixUnitaire": "prix_unitaire",
            "ancienSolde": "ancien_solde",
            "montantRecharge": "montant_recharge",
            "bonus": "bonus",
            "totalAchete": "total_achete",
            "differenceSolde": "difference_solde",
            "statut": "statut",
            
            # New fields
            "numeroTicket": "numero_ticket",
            "soldeTicket": "solde_ticket",
            "montantRistourne": "montant_ristourne",
            "montantTransactionAnnuler": "montant_transaction_annuler",
            "capaciteReservoir": "capacite_reservoir",
            "alerte": "alerte"
        }
        
        for json_key, attr in mapping.items():
            if json_key in data:
                val = data[json_key]
                # Type conversion if needed
                if attr in ["precedent_km", "actuel_km"]:
                    setattr(entry, attr, safe_int(val))
                elif attr in ["prix_unitaire", "ancien_solde", "montant_recharge", "bonus", "total_achete", "difference_solde", "solde_ticket", "montant_ristourne", "montant_transaction_annuler", "capacite_reservoir"]:
                    setattr(entry, attr, safe_float(val))
                else:
                    setattr(entry, attr, val)

        # Update calculated fields
        entry.km_parcouru = calcs["km_parcouru"]
        entry.quantite_rechargee = calcs["quantite_rechargee"]
        entry.quantite_achetee = calcs["quantite_achetee"]
        entry.cout_au_km = calcs["cout_au_km"]
        entry.consommation_100 = calcs["consommation_100"]
        entry.nouveau_solde = calcs["nouveau_solde"]
        entry.quantite_restante = calcs["quantite_restante"]
        entry.distance_possible = calcs["distance_possible"]
        entry.distance_possible_restant = calcs["distance_possible_restant"]
        entry.difference_solde = calcs["difference_solde"]
        
        # Update legacy
        entry.kilometrage = entry.actuel_km
        entry.volume = entry.quantite_achetee
        entry.cout = entry.total_achete
        
        # Update vehicle mileage and check for alerts
        vehicle = Vehicle.query.get(entry.vehicule_id)
        if vehicle:
            vehicle.kilometrage_actuel = entry.actuel_km
            
            # Re-check Oil Change Alert
            if not vehicle.vidange_alert_sent and vehicle.vidange_interval_km > 0:
                if vehicle.kilometrage_actuel >= (vehicle.last_vidange_km + vehicle.vidange_interval_km):
                    if send_mileage_limit_alert(vehicle, 'vidange', vehicle.kilometrage_actuel, vehicle.vidange_interval_km):
                        vehicle.vidange_alert_sent = True
            
            # Re-check Filter Change Alert
            if not vehicle.filtre_alert_sent and vehicle.filtre_interval_km > 0:
                if vehicle.kilometrage_actuel >= (vehicle.last_filtre_km + vehicle.filtre_interval_km):
                    if send_mileage_limit_alert(vehicle, 'filtre', vehicle.kilometrage_actuel, vehicle.filtre_interval_km):
                        vehicle.filtre_alert_sent = True

            # Anomaly Detection on Update: Purchase Quantity > Tank Capacity
            if entry.quantite_achetee > (vehicle.capacite_reservoir or 0):
                entry.alerte = "Carburant anormal - Quantité supérieure à la capacité du réservoir"
                entry.statut_carburant = "Dépassement"
                try:
                    driver_name = f"{entry.driver.prenom} {entry.driver.nom}" if entry.driver else "Inconnu"
                    send_abnormal_fuel_alert(entry, vehicle, driver_name)
                except Exception as e:
                    print(f"Error triggering abnormal fuel alert (update): {e}")
            else:
                entry.statut_carburant = "Normal"
                # Clear alert if it was corrected (optional, but cleaner)
                if entry.alerte == "Carburant anormal - Quantité supérieure à la capacité du réservoir":
                    entry.alerte = ""

        db.session.commit()
        from ..utils import log_action
        log_action(action="Modification", entite="Carburant", entite_id=entry.id, details=f"Mise à jour plein carburant pour {vehicle.immatriculation}")

        return jsonify(fuel_to_dict(entry)), 200

    except Exception as e:
        db.session.rollback()
        print(f"Erreur update fuel: {str(e)}")
        return jsonify({"error": "Erreur lors de la mise à jour"}), 500

@bp.delete("/<string:entry_id>")
@token_required
def delete_fuel_entry(entry_id: str):
    try:
        entry = FuelEntry.query.get_or_404(entry_id)
        db.session.delete(entry)
        db.session.commit()

        from ..utils import log_action
        log_action(action="Suppression", entite="Carburant", entite_id=entry_id, details=f"Suppression plein carburant")

        return jsonify({"deleted": True}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Erreur suppression fuel: {str(e)}")
        return jsonify({"error": "Erreur lors de la suppression"}), 500

