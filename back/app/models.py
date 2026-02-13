from datetime import datetime

from . import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(255), nullable=True) # Valid for old users until they update
    role = db.Column(db.String(50), nullable=False)
    avatar = db.Column(db.String(255))
    created_at = db.Column(db.Date, nullable=False)
    last_login = db.Column(db.DateTime)
    token = db.Column(db.String(255))
    status = db.Column(db.String(50), default='pending')
    profile_email = db.Column(db.String(255))

    action_logs = db.relationship("ActionLog", back_populates="user", lazy="selectin")
    fuel_entries = db.relationship("FuelEntry", back_populates="demandeur", lazy="selectin")


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.String, primary_key=True)
    
    # Informations générales
    image_128 = db.Column(db.Text)
    immatriculation = db.Column(db.String(50), unique=True, nullable=False)
    marque = db.Column(db.String(100), nullable=False)
    modele = db.Column(db.String(100), nullable=False)
    type_vehicule = db.Column(db.String(50), nullable=False)
    autre_type_vehicule = db.Column(db.String(100))
    puissance = db.Column(db.Integer)
    date_acquisition = db.Column(db.Date, nullable=False)
    date_mise_circulation = db.Column(db.Date, nullable=False)
    kilometrage_actuel = db.Column(db.Integer, default=0)
    numero_chassis = db.Column(db.String(100))
    couleur = db.Column(db.String(50))
    annee_fabrication = db.Column(db.Integer)
    carburant = db.Column(db.String(50))

    # Statut et suivi
    statut = db.Column(db.String(50), nullable=False, default='principale')
    sous_statut_principale = db.Column(db.String(50))
    sous_statut_technique = db.Column(db.String(50))
    sous_statut_exceptionnel = db.Column(db.String(50))

    # Informations techniques
    capacite_reservoir = db.Column(db.Float)
    ref_pneu_av = db.Column(db.String(50))
    ref_pneu_ar = db.Column(db.String(50))
    numero_moteur = db.Column(db.String(100))
    compteur_huile = db.Column(db.Integer)
    compteur_filtre = db.Column(db.Integer)

    # Gestion administrative
    detenteur = db.Column(db.String(100))
    numero_serie_type = db.Column(db.String(100))
    valeur_acquisition = db.Column(db.Float)
    anciennete = db.Column(db.String(50)) # Calculé ou stocké ? Stocké pour l'instant si demandé
    cout_entretien_annuel = db.Column(db.Float)
    observations = db.Column(db.Text)

    # Paramètres d'alerte maintenance (Kilométrage)
    vidange_interval_km = db.Column(db.Integer, default=1000)
    last_vidange_km = db.Column(db.Integer, default=0)
    vidange_alert_sent = db.Column(db.Boolean, default=False)
    
    filtre_interval_km = db.Column(db.Integer, default=1000)
    last_filtre_km = db.Column(db.Integer, default=0)
    filtre_alert_sent = db.Column(db.Boolean, default=False)
    
    # Nouveaux champs pour alertes périodiques
    filtre_air_interval_km = db.Column(db.Integer, default=10000)
    last_filtre_air_km = db.Column(db.Integer, default=0)
    
    filtre_carburant_interval_km = db.Column(db.Integer, default=10000)
    last_filtre_carburant_km = db.Column(db.Integer, default=0)
    
    filtre_habitacle_interval_km = db.Column(db.Integer, default=10000)
    last_filtre_habitacle_km = db.Column(db.Integer, default=0)
    
    freins_interval_km = db.Column(db.Integer, default=20000)
    last_freins_km = db.Column(db.Integer, default=0)
    
    amortisseur_interval_km = db.Column(db.Integer, default=50000)
    last_amortisseur_km = db.Column(db.Integer, default=0)
    
    pneus_interval_km = db.Column(db.Integer, default=30000)
    last_pneus_km = db.Column(db.Integer, default=0)
    
    distribution_interval_km = db.Column(db.Integer, default=80000)
    last_distribution_km = db.Column(db.Integer, default=0)
    
    liquide_refroidissement_interval_km = db.Column(db.Integer, default=40000)
    last_liquide_refroidissement_km = db.Column(db.Integer, default=0)
    
    pont_interval_km = db.Column(db.Integer, default=60000)
    last_pont_km = db.Column(db.Integer, default=0)

    # Carte carburant
    num_ancienne_carte_carburant = db.Column(db.String(100))
    num_nouvelle_carte_carburant = db.Column(db.String(100))
    code_nouvelle_carte_carburant = db.Column(db.String(50))
    porteur_carte_carburant = db.Column(db.String(100))
    card_holder_name = db.Column(db.String(100))
    date_expiration_carburant = db.Column(db.Date)

    # Relations
    conducteur_id = db.Column(db.String, db.ForeignKey("drivers.id"))
    service_id = db.Column(db.String) # Pas de table services mentionnée, String pour l'instant
    notes = db.Column(db.Text)

    # Existing relationships
    # Explicitly specify foreign_keys to resolve ambiguity with conducteur_id
    fuel_entries = db.relationship("FuelEntry", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    maintenances = db.relationship("Maintenance", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    missions = db.relationship("Mission", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    planning_items = db.relationship("Planning", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    compliance_entries = db.relationship("Compliance", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    monthly_budgets = db.relationship("FuelMonthlyBudget", back_populates="vehicle", lazy="selectin", cascade="all, delete-orphan")
    drivers = db.relationship("Driver", foreign_keys="[Driver.vehicule_assigne_id]", back_populates="vehicle", lazy="selectin")


class Driver(db.Model):
    __tablename__ = "drivers"

    id = db.Column(db.String, primary_key=True)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100), nullable=False)
    telephone = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    permis = db.Column(db.String(100), nullable=False)
    date_embauche = db.Column(db.Date, nullable=False)
    statut = db.Column(db.String(50), nullable=False)
    vehicule_assigne_id = db.Column(db.String, db.ForeignKey("vehicles.id"))
    avatar = db.Column(db.String(255))

    # Explicitly specify foreign_keys
    vehicle = db.relationship("Vehicle", foreign_keys=[vehicule_assigne_id], back_populates="drivers")
    missions = db.relationship("Mission", back_populates="driver", lazy="selectin")


class FuelEntry(db.Model):
    __tablename__ = "fuel_entries"

    id = db.Column(db.String, primary_key=True)
    vehicule_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    demandeur_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    
    # Basic fields
    date = db.Column(db.Date, nullable=False)
    heure = db.Column(db.String(5))
    station = db.Column(db.String(255))
    produit = db.Column(db.String(50))
    
    # Metering and Distances
    precedent_km = db.Column(db.Integer)
    actuel_km = db.Column(db.Integer)
    km_parcouru = db.Column(db.Integer)
    
    # Financials and Quantity
    prix_unitaire = db.Column(db.Float)
    ancien_solde = db.Column(db.Float)
    
    # Ticket & Transactions
    numero_ticket = db.Column(db.String(100))
    ticket_image = db.Column(db.Text)  # Base64 image
    solde_ticket = db.Column(db.Float)
    
    montant_recharge = db.Column(db.Float)
    quantite_rechargee = db.Column(db.Float)
    bonus = db.Column(db.Float, default=0.0)
    montant_ristourne = db.Column(db.Float, default=0.0)
    montant_transaction_annuler = db.Column(db.Float, default=0.0)
    
    # Purchase details
    total_achete = db.Column(db.Float)
    quantite_achetee = db.Column(db.Float)
    cout_au_km = db.Column(db.Float)
    
    # Consumption and Efficiency
    consommation_100 = db.Column(db.Float)
    distance_possible = db.Column(db.Float) # acts as distance_possible_qte_achetee
    distance_possible_restant = db.Column(db.Float)
    
    # Balances
    nouveau_solde = db.Column(db.Float)
    quantite_restante = db.Column(db.Float)
    difference_solde = db.Column(db.Float)
    
    # Other
    capacite_reservoir = db.Column(db.Float)
    alerte = db.Column(db.String(100)) # or Boolean
    statut_carburant = db.Column(db.String(50), default='Normal')
    
    
    # Legacy fields (kept for compatibility or mapped)
    kilometrage = db.Column(db.Integer) # Can act as alias for actuel_km
    volume = db.Column(db.Float) # Can act as alias for quantite_achetee
    cout = db.Column(db.Float) # Can act as alias for total_achete
    
    statut = db.Column(db.String(50), default='en_attente')

    vehicle = db.relationship("Vehicle", back_populates="fuel_entries")
    demandeur = db.relationship("User", back_populates="fuel_entries")


class Maintenance(db.Model):
    __tablename__ = "maintenances"

    id = db.Column(db.String, primary_key=True)
    vehicule_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    date_demande = db.Column(db.Date, nullable=False)
    date_prevue = db.Column(db.Date, nullable=False)
    kilometrage = db.Column(db.String(50), nullable=False)
    cout = db.Column(db.Float)
    prestataire = db.Column(db.String(255))
    statut = db.Column(db.String(50), nullable=False)
    demandeur_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    image_facture = db.Column(db.Text)  # Image de la facture en base64

    # Nouveaux champs pour le design
    priorite = db.Column(db.String(50), default='Moyenne')
    prochain_entretien_km = db.Column(db.String(50))
    localisation = db.Column(db.String(255))
    technicien = db.Column(db.String(255))
    cout_estime = db.Column(db.Float)
    notes_supplementaires = db.Column(db.Text)
    
    # Rapport d'entretien (Formulaire 2)
    compte_rendu = db.Column(db.Text)
    date_realisation = db.Column(db.Date)
    pieces_remplacees = db.Column(db.Text)

    vehicle = db.relationship("Vehicle", back_populates="maintenances")
    demandeur = db.relationship("User")



class Mission(db.Model):
    __tablename__ = "missions"

    id = db.Column(db.String, primary_key=True)
    reference = db.Column(db.String(50), unique=True, nullable=False)
    missionnaire = db.Column(db.String(255))  # Noms séparés par des virgules
    missionnaire_retour = db.Column(db.String(255)) # Noms séparés par des virgules (Optionnel)
    state = db.Column(db.String(50), nullable=False, default='nouveau')  # nouveau, planifiée, en cours, terminée, annulée, archive
    
    # Véhicule et conducteur
    vehicule_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    conducteur_id = db.Column(db.String, db.ForeignKey("drivers.id"), nullable=False)
    
    # Période
    date_debut = db.Column(db.Date, nullable=False)  # Changed from DateTime to Date as per standardizing or keep DateTime? User said "Date de debut". Usually Date. But "Heure depart" is separate. So Date is better.
    date_fin = db.Column(db.Date)
    heure_depart = db.Column(db.Float)  # Format décimal
    heure_retour = db.Column(db.Float)  # Format décimal
    
    # Itinéraire
    lieu_depart = db.Column(db.String(255), nullable=False, default='CAMPUS')
    lieu_destination = db.Column(db.String(255), nullable=False)
    
    # Nouveaux champs
    titre = db.Column(db.String(255))
    numero_om = db.Column(db.String(100))
    zone = db.Column(db.String(50), default='ville')
    priorite = db.Column(db.String(50), default='Moyenne')
    distance_prevue = db.Column(db.Float)

    # Kilométrage
    kilometrage_depart = db.Column(db.Integer)
    kilometrage_retour = db.Column(db.Integer)
    kilometre_parcouru = db.Column(db.Integer)  # Calculé
    trajet = db.Column(db.Text)
    created_by_id = db.Column(db.String, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vehicle = db.relationship("Vehicle", back_populates="missions")
    driver = db.relationship("Driver", back_populates="missions")


class Planning(db.Model):
    __tablename__ = "planning"

    id = db.Column(db.String, primary_key=True)
    vehicule_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    conducteur_id = db.Column(db.String, db.ForeignKey("drivers.id"))
    date_debut = db.Column(db.DateTime, nullable=False)
    date_fin = db.Column(db.DateTime, nullable=False)
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='en_attente')
    created_by_id = db.Column(db.String, db.ForeignKey("users.id"))
    priorite = db.Column(db.Integer, default=3)
    numero_om = db.Column(db.String(100))
    zone = db.Column(db.String(50), default='ville')
    mission_id = db.Column(db.String, db.ForeignKey("missions.id"))

    vehicle = db.relationship("Vehicle", back_populates="planning_items")
    driver = db.relationship("Driver")
    created_by = db.relationship("User")
    mission = db.relationship("Mission", lazy="selectin")


class ActionLog(db.Model):
    __tablename__ = "action_logs"

    id = db.Column(db.String, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    entite = db.Column(db.String(50), nullable=False)
    entite_id = db.Column(db.String, nullable=False)
    details = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="action_logs")



class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.String, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info') # info, success, warning, error
    target_role = db.Column(db.String(50)) # If set, all users with this role see it
    target_user_id = db.Column(db.String, db.ForeignKey("users.id")) # If set, only this user sees it
    link = db.Column(db.String(255)) # Frontend route
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    target_user = db.relationship("User", foreign_keys=[target_user_id])


class NotificationRead(db.Model):
    __tablename__ = "notification_reads"

    user_id = db.Column(db.String, db.ForeignKey("users.id"), primary_key=True)
    notification_id = db.Column(db.String, db.ForeignKey("notifications.id"), primary_key=True)
    read_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User")
    notification = db.relationship("Notification")


class Compliance(db.Model):
    __tablename__ = "compliance"

    id = db.Column(db.String, primary_key=True)
    vehicule_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    type = db.Column(db.String(50), nullable=False) # assurance, vignette, visite_technique, carte_rose
    numero_document = db.Column(db.String(100))
    date_emission = db.Column(db.Date)
    date_expiration = db.Column(db.Date, nullable=False)
    prestataire = db.Column(db.String(255))
    cout = db.Column(db.Float, default=0.0)
    statut = db.Column(db.String(50), default='valide') # valide, expiré, à_renouveler
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Alert tracking
    expiry_alert_sent = db.Column(db.Boolean, default=False)
    expiry_alert_sent_at = db.Column(db.DateTime)

    vehicle = db.relationship("Vehicle", back_populates="compliance_entries")


class FuelMonthlyBudget(db.Model):
    __tablename__ = "fuel_monthly_budgets"

    id = db.Column(db.String, primary_key=True)
    vehicle_id = db.Column(db.String, db.ForeignKey("vehicles.id"), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1 to 12
    forecast_amount = db.Column(db.Float, nullable=False)  # Budget prévisionnel
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Track if alert was sent for this month to avoid spam
    alert_sent = db.Column(db.Boolean, default=False)

    vehicle = db.relationship("Vehicle", back_populates="monthly_budgets")
    
    __table_args__ = (
        db.UniqueConstraint('vehicle_id', 'year', 'month', name='unique_vehicle_year_month'),
    )
