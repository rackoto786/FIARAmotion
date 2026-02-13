from flask import Blueprint, jsonify, request
from datetime import datetime
import uuid
from typing import Dict, Any
import pandas as pd
from werkzeug.utils import secure_filename
import traceback

from .. import db
from ..models import FuelEntry, Vehicle, Driver, FuelMonthlyBudget, User
from ..utils.email_utils import send_mileage_limit_alert, send_fuel_creation_alert, send_abnormal_fuel_alert
from ..utils.auth_utils import token_required
import re
import unicodedata
import io
from flask import send_file
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

bp = Blueprint("fuel", __name__)

def fuel_to_dict(entry: FuelEntry) -> Dict[str, Any]:
    return {
        "id": entry.id,
        "vehiculeId": entry.vehicule_id,
        "demandeurId": entry.demandeur_id,
        
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
        "ticketImage": entry.ticket_image,
        "soldeTicket": entry.solde_ticket,
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
    status = request.args.get('status')
    
    query = FuelEntry.query
    
    if status and status != 'all':
        query = query.filter_by(statut=status)
    
    if role in ['collaborator', 'driver', 'direction'] and user_email:
        # Filter entries they created (demandeur_id)
        # Search by both email and profile_email for robustness
        current_user = User.query.filter(
            db.or_(
                db.func.lower(User.email) == user_email.lower(),
                db.func.lower(User.profile_email) == user_email.lower()
            )
        ).first()
        if current_user:
            query = query.filter_by(demandeur_id=current_user.id)
        else:
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

@bp.get("/year-end-balance")
def get_year_end_balance():
    """
    Calculate year-end balance by summing the remaining balance (nouveauSolde) 
    at the end of each month for a given year, grouped by vehicle.
    
    Query params:
    - year: optional, defaults to current year
    """
    try:
        # Get query parameters
        year = request.args.get('year', type=int) or datetime.now().year
        
        # Fetch all vehicles
        vehicles = Vehicle.query.all()
        
        vehicles_data = []
        grand_total_year = 0
        
        for vehicle in vehicles:
            # Base query for this vehicle and year
            query = FuelEntry.query.filter(
                db.extract('year', FuelEntry.date) == year,
                FuelEntry.vehicule_id == vehicle.id
            ).order_by(FuelEntry.date.asc())
            
            entries = query.all()
            
            # Group entries by month and find the last entry for each month
            monthly_data = {}
            
            # Initialize all months to 0
            for m in range(1, 13):
                monthly_data[m] = {
                    'month': m,
                    'balance': 0,
                    'date': None,
                    'ticket_number': None
                }
            
            vehicle_total = 0
            
            # Populate with actual data (keep last entry of month)
            for entry in entries:
                month = entry.date.month
                if monthly_data[month]['date'] is None or entry.date > monthly_data[month]['date']:
                    monthly_data[month] = {
                        'month': month,
                        'balance': entry.nouveau_solde or 0,
                        'date': entry.date,
                        'ticket_number': entry.numero_ticket
                    }
            
            # Format list for response
            monthly_balances = []
            
            sorted_months = sorted(monthly_data.values(), key=lambda x: x['month'])
            
            for m_data in sorted_months:
                 monthly_balances.append({
                    'month': m_data['month'],
                    'balance': m_data['balance'],
                    'date': m_data['date'].isoformat() if m_data['date'] else None,
                    'ticket_number': m_data['ticket_number']
                })
                 
            # Year-end balance logic:
            # - If December has data → use December's balance (year completed)
            # - If December has no data → use last known month's balance (year in progress)
            # This handles the case where we're viewing current year before December
            year_end_balance = 0
            
            if monthly_data[12]['date']:
                # December has data, use it (year is complete or we're past December)
                year_end_balance = monthly_data[12]['balance']
            else:
                # December has no data yet, find the last month with data
                for m_data in reversed(sorted_months):
                    if m_data['date']:
                        year_end_balance = m_data['balance']
                        break
            
            vehicles_data.append({
                "vehicle_id": vehicle.id,
                "immatriculation": vehicle.immatriculation,
                "marque": vehicle.marque,
                "monthly_balances": monthly_balances,
                "last_balance": year_end_balance
            })
            
            grand_total_year += year_end_balance

        return jsonify({
            "year": year,
            "vehicles_data": vehicles_data,
            "grand_total_year": grand_total_year
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Erreur lors du calcul: {str(e)}"}), 500

@bp.post("/")
def create_fuel_entry():
    try:
        data = request.json
        
        calcs = calculate_derived_fields(data)
        
        # Handle date parsing
        date_val = data.get("date")
        if isinstance(date_val, str):
             # Try isoformat or YYYY-MM-DD
             try:
                 date_val = datetime.fromisoformat(date_val.replace('Z', '+00:00')).date()
             except:
                 try:
                    date_val = datetime.strptime(date_val, "%Y-%m-%d").date()
                 except:
                    date_val = datetime.now().date()
        elif not date_val:
            date_val = datetime.now().date()

        entry = FuelEntry(
            id=str(uuid.uuid4()),
            vehicule_id=data.get("vehiculeId"),
            demandeur_id=data.get("demandeurId"),
            
            date=date_val,
            heure=data.get("heure"),
            
            station=data.get("station"),
            produit=data.get("produit"),
            
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
            ticket_image=data.get("ticketImage"),
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
            # Update vehicle mileage only if the new mileage is greater to prevent rollback
            if entry.actuel_km > (vehicle.kilometrage_actuel or 0):
                vehicle.kilometrage_actuel = entry.actuel_km
            
            # Check Oil Change Alert
            vid_interval = vehicle.vidange_interval_km if vehicle.vidange_interval_km is not None else 0
            last_vidange = vehicle.last_vidange_km if vehicle.last_vidange_km is not None else 0
            
            if not vehicle.vidange_alert_sent and vid_interval > 0:
                if vehicle.kilometrage_actuel >= (last_vidange + vid_interval):
                    if send_mileage_limit_alert(vehicle, 'vidange', vehicle.kilometrage_actuel, vid_interval):
                        vehicle.vidange_alert_sent = True
            
            # Check Filter Change Alert
            filt_interval = vehicle.filtre_interval_km if vehicle.filtre_interval_km is not None else 0
            last_filtre = vehicle.last_filtre_km if vehicle.last_filtre_km is not None else 0

            if not vehicle.filtre_alert_sent and filt_interval > 0:
                if vehicle.kilometrage_actuel >= (last_filtre + filt_interval):
                    if send_mileage_limit_alert(vehicle, 'filtre', vehicle.kilometrage_actuel, filt_interval):
                        vehicle.filtre_alert_sent = True
            
            # Anomaly Detection: Purchase Quantity > Tank Capacity
            if entry.quantite_achetee > (vehicle.capacite_reservoir or 0):
                entry.alerte = "Carburant anormal - Quantité supérieure à la capacité du réservoir"
                entry.statut_carburant = "Dépassement"
                try:
                    demandeur_name = entry.demandeur.name if entry.demandeur else "Inconnu"
                    send_abnormal_fuel_alert(entry, vehicle, demandeur_name)
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

@bp.put("/<uuid:id>")
def update_fuel_entry(id):
    try:
        id = str(id)
        entry = FuelEntry.query.get(id)
        if not entry:
            return jsonify({"error": "Entrée non trouvée"}), 404
            
        data = request.json
        calcs = calculate_derived_fields(data)
        
        # Update fields
        mapping = {
            "vehiculeId": "vehicule_id",
            "demandeurId": "demandeur_id",
            "heure": "heure",
            "station": "station",
            "produit": "produit",
            "numeroTicket": "numero_ticket",
            "ticketImage": "ticket_image",
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
        
        # Explicitly update some fields if they are in data
        if "actuelKm" in data: entry.actuel_km = safe_int(data["actuelKm"])
        if "precedentKm" in data: entry.precedent_km = safe_int(data["precedentKm"])
        if "prixUnitaire" in data: entry.prix_unitaire = safe_float(data["prixUnitaire"])
        if "totalAchete" in data: entry.total_achete = safe_float(data["totalAchete"])
        if "montantRecharge" in data: entry.montant_recharge = safe_float(data["montantRecharge"])
        if "ancienSolde" in data: entry.ancien_solde = safe_float(data["ancienSolde"])
        if "bonus" in data: entry.bonus = safe_float(data["bonus"])
        if "statut" in data: entry.statut = data["statut"]
        
        # Legacy mapping update
        entry.kilometrage = entry.actuel_km
        entry.volume = entry.quantite_achetee
        entry.cout = entry.total_achete
        
        # Update vehicle mileage
        vehicle = Vehicle.query.get(entry.vehicule_id)
        if vehicle:
            if entry.actuel_km > vehicle.kilometrage_actuel:
                vehicle.kilometrage_actuel = entry.actuel_km
            
            # Anomaly Detection (Update)
            if entry.quantite_achetee > (vehicle.capacite_reservoir or 0):
                entry.alerte = "Carburant anormal - Quantité supérieure à la capacité du réservoir"
                entry.statut_carburant = "Dépassement"
                try:
                    demandeur_name = entry.demandeur.name if entry.demandeur else "Inconnu"
                    send_abnormal_fuel_alert(entry, vehicle, demandeur_name)
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

@bp.delete("/<uuid:id>")
def delete_fuel_entry(id):
    try:
        id = str(id)
        entry = FuelEntry.query.get(id)
        if not entry:
            return jsonify({"error": "Entrée non trouvée"}), 404
            
        db.session.delete(entry)
        db.session.commit()
        
        return jsonify({"message": "Entrée supprimée"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Erreur suppression fuel: {str(e)}")
        return jsonify({"error": "Erreur lors de la suppression"}), 500

@bp.post("/import")
def import_fuel_entries():
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier fourni"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Aucun fichier sélectionné"}), 400

    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({"error": "Format de fichier non supporté. Utilisez Excel (.xlsx, .xls)"}), 400

    try:
        # Lecture du fichier Excel
        try:
            df = pd.read_excel(file)
        except Exception as e:
            return jsonify({"error": f"Impossible de lire le fichier Excel: {str(e)}"}), 400
        
        # Nettoyage : suppression des lignes et colonnes entièrement vides
        df = df.dropna(how='all').dropna(axis=1, how='all')
        
        if df.empty:
            return jsonify({"error": "Le fichier Excel est vide ou ne contient aucune ligne de données.", "details": []}), 400

        # Fonction de normalisation robuste
        def _norm(s):
            if not isinstance(s, str): s = str(s or '')
            s = s.strip().lower()
            if not s: return ''
            s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
            s = re.sub(r'[^a-z0-9]', '', s)
            return s

        # Mapping des colonnes (clé normalisée -> nom original)
        col_map = { _norm(c): c for c in df.columns if _norm(c) }
        
        # Identifiants de véhicule acceptés
        accepted_vehicle_keys = ['immatriculation', 'vehicule', 'vehiculeimmatriculation', 'immat', 'plaque', 'plaqueimmatriculation', 'voiture']
        
        # Recherche de la colonne d'immatriculation
        vehicle_col_norm = next((k for k in accepted_vehicle_keys if k in col_map), None)
        
        if not vehicle_col_norm:
            return jsonify({
                "error": "Colonne d'immatriculation introuvable. Veuillez nommer la colonne 'immatriculation' ou 'véhicule'.",
                "found_columns": list(df.columns)
            }), 400

        vehicle_col = col_map[vehicle_col_norm]

        # Pré-chargement des données pour performance
        vehicles_all = Vehicle.query.all()
        vehicles_cache = { _norm(v.immatriculation): v for v in vehicles_all if v.immatriculation }
            
        users_all = User.query.all()
        users_cache = {}
        for u in users_all:
            users_cache[_norm(u.name)] = u
            if u.email: users_cache[_norm(u.email)] = u
            if u.profile_email: users_cache[_norm(u.profile_email)] = u

        success_count = 0
        errors = []
        
        # Règles de mapping (clé logique -> variantes de noms de colonnes)
        mapping_rules = {
            'date': ['date'],
            'heure': ['heure', 'time'],
            'numeroTicket': ['numeroticket', 'ticket', 'numticket'],
            'actuelKm': ['actuelkm', 'kilometrage', 'kmactuel', 'compteur', 'index'],
            'precedentKm': ['precedentkm', 'kmprecedent', 'ancienkm', 'ancienindex'],
            'prixUnitaire': ['prixunitaire', 'pu', 'gopuar', 'prix'],
            'totalAchete': ['totalachete', 'total', 'montant', 'cout', 'prixpaye'],
            'montantRecharge': ['montantrecharge', 'recharge', 'montantrecharger'],
            'ancienSolde': ['anciensolde', 'soldeinitial'],
            'soldeTicket': ['soldeticket', 'soldetps', 'soldefin'],
            'quantiteAchetee': ['quantiteachetee', 'qteacheter', 'volume', 'litres', 'quantite'],
            'bonus': ['bonus', 'bonussurrecharge'],
            'montantRistourne': ['ristourne', 'montantristourne'],
            'montantTransactionAnnuler': ['montanttransactionannuler', 'annule', 'transactionannulee'],
            'demandeur': ['demandeur', 'conducteur', 'driver', 'chauffeur', 'nomconducteur'],
            'station': ['station', 'stationdeservice', 'lieu'],
            'produit': ['produit', 'carburant', 'typecarburant']
        }

        # Résolution des colonnes disponibles
        resolved_map = {} 
        for logical, variants in mapping_rules.items():
            for v in variants:
                if v in col_map:
                    resolved_map[logical] = col_map[v]
                    break

        for index, row in df.iterrows():
            try:
                # 1. Identification du véhicule
                raw_immat = str(row.get(vehicle_col) or '').strip()
                if not raw_immat or raw_immat.lower() == 'nan':
                    continue # On saute les lignes vides
                
                clean_immat = _norm(raw_immat)
                vehicle = vehicles_cache.get(clean_immat)
                
                if not vehicle:
                    errors.append(f"Ligne {index+2}: Véhicule '{raw_immat}' non trouvé dans la base")
                    continue
                
                # 2. Identification du demandeur
                demandeur = None
                demandeur_col = resolved_map.get('demandeur')
                if demandeur_col:
                    raw_demandeur = str(row.get(demandeur_col) or '').strip()
                    if raw_demandeur and raw_demandeur.lower() != 'nan':
                        demandeur = users_cache.get(_norm(raw_demandeur))
                
                # If no demandeur found in Excel, try to find the user linked via the vehicle's driver email
                if not demandeur and vehicle.conducteur_id:
                    driver = Driver.query.get(vehicle.conducteur_id)
                    if driver and driver.email:
                        demandeur = User.query.filter(db.func.lower(User.email) == driver.email.lower()).first()
                
                if not demandeur:
                    errors.append(f"Ligne {index+2}: Demandeur (utilisateur) non trouvé pour {raw_immat}")
                    continue

                # 3. Helper numérique
                def get_num(key):
                    col = resolved_map.get(key)
                    val = row.get(col) if col else 0
                    if pd.isna(val): return 0
                    try: return float(str(val).replace(',', '.').replace(' ', ''))
                    except: return 0

                # 4. Données d'entrée
                input_data = {
                    "actuelKm": get_num('actuelKm'),
                    "precedentKm": get_num('precedentKm'),
                    "prixUnitaire": get_num('prixUnitaire'),
                    "totalAchete": get_num('totalAchete'),
                    "montantRecharge": get_num('montantRecharge'),
                    "ancienSolde": get_num('ancienSolde'),
                    "soldeTicket": get_num('soldeTicket'),
                    "quantiteAchetee": get_num('quantiteAchetee'),
                    "bonus": get_num('bonus'),
                    "montantRistourne": get_num('montantRistourne'),
                    "montantTransactionAnnuler": get_num('montantTransactionAnnuler'),
                    "capaciteReservoir": vehicle.capacite_reservoir or 0
                }

                # Fallback pour la quantité si manquante mais total/prix présents
                if not input_data['quantiteAchetee'] and input_data['totalAchete'] and input_data['prixUnitaire'] > 0:
                    input_data['quantiteAchetee'] = input_data['totalAchete'] / input_data['prixUnitaire']

                # 5. Parsing de la date
                date_col = resolved_map.get('date')
                date_val = row.get(date_col) if date_col else None
                date_obj = datetime.now().date()
                if not pd.isna(date_val):
                    try:
                        date_obj = pd.to_datetime(date_val).date()
                    except:
                        pass
                
                # 6. Calculs
                calcs = calculate_derived_fields(input_data)
                
                # 7. Création de l'entrée
                entry = FuelEntry(
                    id=str(uuid.uuid4()),
                    vehicule_id=vehicle.id,
                    demandeur_id=demandeur.id,
                    date=date_obj,
                    heure=str(row.get(resolved_map.get('heure')) or "00:00"),
                    station=str(row.get(resolved_map.get('station')) or ""),
                    produit=str(row.get(resolved_map.get('produit')) or "Gasoil"),
                    
                    prix_unitaire=input_data['prixUnitaire'],
                    actuel_km=int(input_data['actuelKm']),
                    precedent_km=int(input_data['precedentKm']),
                    km_parcouru=calcs['km_parcouru'],
                    
                    total_achete=input_data['totalAchete'],
                    quantite_achetee=input_data['quantiteAchetee'],
                    
                    montant_recharge=input_data['montantRecharge'],
                    quantite_rechargee=calcs['quantite_rechargee'],
                    ancien_solde=input_data['ancienSolde'],
                    nouveau_solde=calcs['nouveau_solde'],
                    
                    cout_au_km=calcs["cout_au_km"],
                    consommation_100=calcs["consommation_100"],
                    distance_possible=calcs["distance_possible"],
                    distance_possible_restant=calcs["distance_possible_restant"],
                    
                    solde_ticket=input_data['soldeTicket'],
                    difference_solde=calcs["difference_solde"],
                    
                    montant_ristourne=input_data['montantRistourne'],
                    montant_transaction_annuler=input_data['montantTransactionAnnuler'],
                    bonus=input_data['bonus'],
                    numero_ticket=str(row.get(resolved_map.get('numeroTicket')) or ""),
                    
                    capacite_reservoir=input_data['capaciteReservoir'],
                    statut="valide"
                )

                # Détection d'anomalies (Dépassement de capacité)
                if entry.quantite_achetee > (vehicle.capacite_reservoir or 0) and (vehicle.capacite_reservoir or 0) > 0:
                    entry.alerte = "Carburant anormal - Quantité supérieure à la capacité du réservoir"
                    entry.statut_carburant = "Dépassement"
                else:
                    entry.statut_carburant = "Normal"

                # Mise à jour du kilométrage du véhicule
                if entry.actuel_km > (vehicle.kilometrage_actuel or 0):
                    vehicle.kilometrage_actuel = entry.actuel_km
                
                db.session.add(entry)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Ligne {index+2}: {str(e)}")
        
        if success_count > 0:
            db.session.commit()
            return jsonify({"message": f"{success_count} lignes importées avec succès", "errors": errors}), 200
        else:
            return jsonify({
                "error": "Aucune ligne importée. Vérifiez que les véhicules et conducteurs existent dans la base.",
                "details": errors,
                "found_columns": list(df.columns)
            }), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Erreur critique lors de l'import: {str(e)}"}), 500

@bp.post("/status/<uuid:id>")
def update_fuel_status(id):
    """Update fuel entry status (validate/reject)"""
    try:
        id = str(id)
        entry = FuelEntry.query.get(id)
        if not entry:
            return jsonify({"error": "Entrée non trouvée"}), 404
        
        data = request.json
        new_status = data.get("status")
        
        if new_status not in ["valide", "rejete", "en_attente"]:
            return jsonify({"error": "Statut invalide"}), 400
        
        entry.statut = new_status
        db.session.commit()
        
        return jsonify(fuel_to_dict(entry)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@bp.get("/<uuid:id>/pdf")
def export_fuel_pdf(id):
    """Generate and return a PDF for the fuel entry"""
    try:
        # Trigger reload
        entry = FuelEntry.query.get(str(id))
        if not entry:
            return jsonify({"error": "Entrée non trouvée"}), 404

        # Create a file-like buffer to receive PDF data.
        buffer = io.BytesIO()

        # Create the PDF object, using the buffer as its "file."
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []

        # Logo handling (Try to find the logo)
        import os
        logo_path = os.path.join(os.getcwd(), '..', 'front', 'src', 'assets', 'ceres-logo.png')
        if not os.path.exists(logo_path):
            # Fallback for dev environment structure
             logo_path = os.path.join(os.getcwd(), '../front/src/assets/ceres-logo.png')
        
        # Header Table with Logo
        from reportlab.lib.units import cm
        from reportlab.platypus import Image as RLImage

        # Initialize styles
        styles = getSampleStyleSheet()

        header_data = [[Paragraph("<b>Détail de la Consommation de Carburant</b>", styles['Heading1'])]]
        
        if os.path.exists(logo_path):
            try:
                logo = RLImage(logo_path, width=4*cm, height=1.5*cm, kind='proportional')
                header_data[0].insert(0, logo)
            except Exception as e:
                print(f"Error loading logo: {e}")
        
        header_table = Table(header_data, colWidths=[5*cm, 10*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 20))

        # Helper to format currency and dates
        def fmt_curr(val):
            return f"{val:,.2f} Ar".replace(",", " ") if val is not None else "-"
        
        def fmt_num(val, suffix=""):
            return f"{val:,.2f} {suffix}".replace(",", " ") if val is not None else "-"

        # Recalculate Logic to fix "0.00" issue
        actuel = entry.actuel_km or 0
        precedent = entry.precedent_km or 0
        km_parcouru = entry.km_parcouru
        if (not km_parcouru or km_parcouru == 0) and actuel > precedent:
            km_parcouru = actuel - precedent
        
        total = entry.total_achete or 0
        pu = entry.prix_unitaire or 0
        qte_achetee = entry.quantite_achetee
        if (not qte_achetee or qte_achetee == 0) and pu > 0:
            qte_achetee = total / pu
        
        conso = entry.consommation_100
        if (not conso or conso == 0) and km_parcouru > 0 and qte_achetee > 0:
            conso = (qte_achetee * 100) / km_parcouru

        nouveau_solde = entry.nouveau_solde
        # Recalc nouveau solde if 0 but inputs exist
        if (not nouveau_solde or nouveau_solde == 0):
             ancien = entry.ancien_solde or 0
             recharge = entry.montant_recharge or 0
             # Formula: Ancien + Recharge - TotalAchat + Ristourne + Annulation
             nouveau_solde = ancien + recharge - total + (entry.montant_ristourne or 0) + (entry.montant_transaction_annuler or 0)

        qte_restante = entry.quantite_restante
        if (not qte_restante or qte_restante == 0) and pu > 0:
            qte_restante = nouveau_solde / pu

        # Data for the table
        vehicle_info = f"{entry.vehicle.immatriculation} ({entry.vehicle.marque})" if entry.vehicle else "Inconnu"
        driver_info = entry.demandeur.name if entry.demandeur else "Inconnu"
        date_info = entry.date.strftime('%d/%m/%Y') if entry.date else "-"

        # Custom Styles
        primary_color = colors.HexColor("#1e40af") # Blue 800
        secondary_color = colors.HexColor("#f1f5f9") # Slate 100
        header_bg = colors.HexColor("#eef2ff") # Indigo 50

        section_style = ParagraphStyle('SectionHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=primary_color, spaceAfter=6)

        data = [
            [Paragraph("INFORMATIONS GÉNÉRALES", section_style), ""],
            ["Date", date_info],
            ["Heure", entry.heure or "-"],
            ["Véhicule", vehicle_info],
            ["Conducteur", driver_info],
            ["Station", entry.station or "-"],
            ["N° Ticket", entry.numero_ticket or "-"],
            ["Produit", entry.produit or "-"],
            
            [Paragraph("DONNÉES KILOMÉTRIQUES", section_style), ""],
            ["Précédent KM", fmt_num(precedent, "km")],
            ["Actuel KM", fmt_num(actuel, "km")],
            ["KM Parcouru", fmt_num(km_parcouru, "km")],
            
            [Paragraph("FINANCES", section_style), ""],
            ["Prix Unitaire", fmt_curr(pu)],
            ["Total Acheté", fmt_curr(total)],
            ["Ancien Solde", fmt_curr(entry.ancien_solde)],
            ["Nouveau Solde", fmt_curr(nouveau_solde)],
            
            [Paragraph("VOLUMES", section_style), ""],
            ["Quantité Achetée", fmt_num(qte_achetee, "L")],
            ["Quantité Restante", fmt_num(qte_restante, "L")],
            ["Consommation", fmt_num(conso, "L/100km")],
        ]

        # Create Table
        t = Table(data, colWidths=[2.5*inch, 3.5*inch])
        
        # Table Style
        t.setStyle(TableStyle([
            # General
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 8),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('LINEBELOW', (0, 0), (-1, 0), 1, primary_color), # Specific thick line under headers
            
            # Section Headers
            ('BACKGROUND', (0, 0), (1, 0), header_bg),
            ('SPAN', (0, 0), (1, 0)),
            
            ('BACKGROUND', (0, 8), (1, 8), header_bg),
            ('SPAN', (0, 8), (1, 8)),
            
            ('BACKGROUND', (0, 12), (1, 12), header_bg),
            ('SPAN', (0, 12), (1, 12)),
            
            ('BACKGROUND', (0, 17), (1, 17), header_bg),
            ('SPAN', (0, 17), (1, 17)),
            
            # Labels Column
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.darkslategrey),
            
            # Values Column
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))

        elements.append(t)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey, alignment=1)
        elements.append(Paragraph("Document généré automatiquement par le système CERES", footer_style))
        
        # Build PDF
        doc.build(elements)

        buffer.seek(0)
        
        filename = f"fuel_ticket_{entry.numero_ticket or 'details'}.pdf"
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erreur génération PDF: {str(e)}"}), 500


"""
New endpoints for fuel budget management
"""

# Append to fuel.py after line 763

@bp.get("/budgets")
def get_budgets():
    """Get monthly budgets for a specific year and optional vehicle"""
    year = request.args.get('year', type=int) or datetime.now().year
    vehicle_id = request.args.get('vehicle_id')
    
    query = FuelMonthlyBudget.query.filter_by(year=year)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    
    budgets = query.all()
    
    return jsonify([{
        'id': b.id,
        'vehicle_id': b.vehicle_id,
        'year': b.year,
        'month': b.month,
        'forecast_amount': b.forecast_amount,
        'alert_sent': b.alert_sent
    } for b in budgets]), 200


@bp.post("/budgets")
def create_or_update_budget():
    """Create or update a monthly budget forecast"""
    try:
        data = request.json
        vehicle_id = data.get('vehicle_id')
        year = data.get('year')
        month = data.get('month')
        forecast_amount = data.get('forecast_amount')
        
        if not all([vehicle_id, year, month, forecast_amount]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if month < 1 or month > 12:
            return jsonify({'error': 'Month must be between 1 and 12'}), 400
        
        # Check if budget already exists
        existing = FuelMonthlyBudget.query.filter_by(
            vehicle_id=vehicle_id,
            year=year,
            month=month
        ).first()
        
        if existing:
            # Update existing
            existing.forecast_amount = forecast_amount
            existing.updated_at = datetime.utcnow()
            existing.alert_sent = False  # Reset alert when budget is updated
            db.session.commit()
            budget = existing
        else:
            # Create new
            budget = FuelMonthlyBudget(
                id=str(uuid.uuid4()),
                vehicle_id=vehicle_id,
                year=year,
                month=month,
                forecast_amount=forecast_amount
            )
            db.session.add(budget)
            db.session.commit()
        
        # Check for overrun after creating/updating
        check_budget_overrun(vehicle_id, year, month)
        
        return jsonify({
            'id': budget.id,
            'vehicle_id': budget.vehicle_id,
            'year': budget.year,
            'month': budget.month,
            'forecast_amount': budget.forecast_amount
        }), 201
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.get("/year-end-balance-with-budgets")
def get_year_end_balance_with_budgets():
    """
    Enhanced version with budget tracking.
    Returns monthly forecast, consumed, and balance for each vehicle.
    """
    try:
        year = request.args.get('year', type=int) or datetime.now().year
        
        vehicles = Vehicle.query.all()
        vehicles_data = []
        total_overruns = 0
        
        for vehicle in vehicles:
            # Get fuel entries for this year
            entries = FuelEntry.query.filter(
                db.extract('year', FuelEntry.date) == year,
                FuelEntry.vehicule_id == vehicle.id
            ).order_by(FuelEntry.date.asc()).all()
            
            # Get budgets for this year
            budgets = FuelMonthlyBudget.query.filter_by(
                vehicle_id=vehicle.id,
                year=year
            ).all()
            budget_map = {b.month: b for b in budgets}
            
            # Calculate monthly data
            monthly_data = {}
            for m in range(1, 13):
                monthly_data[m] = {
                    'month': m,
                    'forecast': 0,
                    'consumed': 0,
                    'balance': 0,
                    'date': None,
                    'exceeded': False
                }
            
            # Calculate consumed amounts per month
            for entry in entries:
                month = entry.date.month
                monthly_data[month]['consumed'] += (entry.total_achete or 0)
                
                # Update balance with last entry of month
                if monthly_data[month]['date'] is None or entry.date > monthly_data[month]['date']:
                    monthly_data[month]['balance'] = entry.nouveau_solde or 0
                    monthly_data[month]['date'] = entry.date
            
            # Add forecast data
            vehicle_overruns = 0
            for month, budget in budget_map.items():
                monthly_data[month]['forecast'] = budget.forecast_amount
                
                # Check if exceeded
                if budget.forecast_amount > 0 and monthly_data[month]['consumed'] > budget.forecast_amount:
                    monthly_data[month]['exceeded'] = True
                    vehicle_overruns += 1
            
            total_overruns += vehicle_overruns
            
            # Format for response
            monthly_list = [
                {
                    'month': m['month'],
                    'forecast': m['forecast'],
                    'consumed': m['consumed'],
                    'balance': m['balance'],
                    'date': m['date'].isoformat() if m['date'] else None,
                    'exceeded': m['exceeded']
                }
                for m in sorted(monthly_data.values(), key=lambda x: x['month'])
            ]
            
            # Year-end balance logic (same as before)
            year_end_balance = 0
            if monthly_data[12]['date']:
                year_end_balance = monthly_data[12]['balance']
            else:
                for m_data in reversed(sorted(monthly_data.values(), key=lambda x: x['month'])):
                    if m_data['date']:
                        year_end_balance = m_data['balance']
                        break
            
            vehicles_data.append({
                'vehicle_id': vehicle.id,
                'immatriculation': vehicle.immatriculation,
                'marque': vehicle.marque,
                'monthly_data': monthly_list,
                'last_balance': year_end_balance,
                'overrun_months': vehicle_overruns
            })
        
        # Calculate grand totals
        grand_total_forecast = sum(
            sum(m['forecast'] for m in v['monthly_data'])
            for v in vehicles_data
        )
        grand_total_consumed = sum(
            sum(m['consumed'] for m in v['monthly_data'])
            for v in vehicles_data
        )
        grand_total_balance = sum(v['last_balance'] for v in vehicles_data)
        
        return jsonify({
            'year': year,
            'vehicles_data': vehicles_data,
            'grand_total_forecast': grand_total_forecast,
            'grand_total_consumed': grand_total_consumed,
            'grand_total_balance': grand_total_balance,
            'total_overruns': total_overruns
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.get("/budget-overruns")
def get_budget_overruns():
    """Get list of vehicles that exceeded their budget"""
    try:
        year = request.args.get('year', type=int) or datetime.now().year
        
        overruns = []
        
        budgets = FuelMonthlyBudget.query.filter_by(year=year).all()
        
        for budget in budgets:
            # Calculate consumed for this vehicle/month
            consumed = db.session.query(
                db.func.sum(FuelEntry.total_achete)
            ).filter(
                FuelEntry.vehicule_id == budget.vehicle_id,
                db.extract('year', FuelEntry.date) == year,
                db.extract('month', FuelEntry.date) == budget.month
            ).scalar() or 0
            
            if consumed > budget.forecast_amount:
                vehicle = Vehicle.query.get(budget.vehicle_id)
                overruns.append({
                    'vehicle_id': budget.vehicle_id,
                    'immatriculation': vehicle.immatriculation if vehicle else 'Unknown',
                    'marque': vehicle.marque if vehicle else '',
                    'month': budget.month,
                    'forecast': budget.forecast_amount,
                    'consumed': consumed,
                    'overrun_amount': consumed - budget.forecast_amount,
                    'overrun_percent': ((consumed / budget.forecast_amount) - 1) * 100 if budget.forecast_amount > 0 else 0
                })
        
        return jsonify(overruns), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def check_budget_overrun(vehicle_id, year, month):
    """Check if consumption exceeded forecast and send alert if needed"""
    try:
        budget = FuelMonthlyBudget.query.filter_by(
            vehicle_id=vehicle_id,
            year=year,
            month=month
        ).first()
        
        if not budget or budget.alert_sent:
            return  # No budget or alert already sent
        
        # Calculate consumed
        consumed = db.session.query(
            db.func.sum(FuelEntry.total_achete)
        ).filter(
            FuelEntry.vehicule_id == vehicle_id,
            db.extract('year', FuelEntry.date) == year,
            db.extract('month', FuelEntry.date) == month
        ).scalar() or 0
        
        if consumed > budget.forecast_amount:
            # Send alert
            vehicle = Vehicle.query.get(vehicle_id)
            if vehicle:
                send_budget_overrun_alert(vehicle, year, month, budget.forecast_amount, consumed)
                
                # Mark alert as sent
                budget.alert_sent = True
                db.session.commit()
    
    except Exception as e:
        print(f"Error checking budget overrun: {e}")
        traceback.print_exc()


def send_budget_overrun_alert(vehicle, year, month, forecast, consumed):
    """Send email alert when budget is exceeded"""
    from ..models import User
    
    recipients = [u.profile_email for u in User.query.filter(
        User.role.in_(['admin', 'technician'])
    ).all() if u.profile_email]
    
    if not recipients:
        return
    
    month_names = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    month_name = month_names[month]
    
    overrun_amount = consumed - forecast
    overrun_percent = ((consumed / forecast) - 1) * 100 if forecast > 0 else 0
    
    subject = f"⚠️ BUDGET DÉPASSÉ : {vehicle.immatriculation} - {month_name} {year}"
    
    html_content = f"""
    <h3 style="color: #e74c3c;">⚠️ Dépassement Budgétaire Détecté</h3>
    <p>Le véhicule <b>{vehicle.immatriculation}</b> ({vehicle.marque} {vehicle.modele}) a dépassé son budget carburant.</p>
    <div style="background-color: #fcebea; padding: 15px; border-radius: 8px; border: 1px solid #e74c3c; margin: 15px 0;">
        <ul>
            <li><b>Mois :</b> {month_name} {year}</li>
            <li><b>Budget prévu :</b> {forecast:,.0f} Ar</li>
            <li><b>Montant consommé :</b> <span style="color: #e74c3c; font-weight: bold;">{consumed:,.0f} Ar</span></li>
            <li><b>Dépassement :</b> <span style="color: #e74c3c; font-weight: bold;">{overrun_amount:,.0f} Ar ({overrun_percent:.1f}%)</span></li>
        </ul>
    </div>
    <p><b>Action requise :</b> Veuillez vérifier la consommation de carburant et prendre les mesures appropriées.</p>
    <p>Connectez-vous à l'application pour plus de détails.</p>
    """
    
    from flask_mail import Message
    from .. import mail
    
    msg = Message(subject, recipients=recipients)
    msg.html = html_content
    
    from ..utils.email_utils import send_email_async
    send_email_async(msg)
    
    # Also create in-app notification
    from ..utils.notification_utils import create_notification
    create_notification(
        title=f"Budget dépassé: {vehicle.immatriculation}",
        message=f"Budget {month_name}: {consumed:,.0f} Ar / {forecast:,.0f} Ar (+{overrun_percent:.1f}%)",
        type="error",
        target_role="admin",
        link="/fuel/year-end-stats"
    )
