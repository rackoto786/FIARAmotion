from datetime import date, datetime

from app import create_app, db
from app.models import (
    User,
    Vehicle,
    Driver,
    FuelEntry,
    Maintenance,
    Mission,
    Planning,
    ActionLog,
)


def seed_users():
    users_data = [
        {
            "id": "1",
            "email": "admin@fiaramotion.com",
            "name": "Mohamed Benali",
            "role": "admin",
            "createdAt": "2024-01-15",
            "lastLogin": "2024-12-12T08:30:00",
        },
        {
            "id": "2",
            "email": "technique@fiaramotion.com",
            "name": "Karim Hadj",
            "role": "technician",
            "createdAt": "2024-02-20",
            "lastLogin": "2024-12-12T07:45:00",
        },
        {
            "id": "3",
            "email": "conducteur@fiaramotion.com",
            "name": "Youcef Mansouri",
            "role": "driver",
            "createdAt": "2024-03-10",
            "lastLogin": "2024-12-11T16:20:00",
        },
        {
            "id": "4",
            "email": "direction@fiaramotion.com",
            "name": "Amina Khelifa",
            "role": "direction",
            "createdAt": "2024-01-20",
            "lastLogin": "2024-12-12T09:00:00",
        },
        {
            "id": "5",
            "email": "collaborateur@fiaramotion.com",
            "name": "Samir Boudiaf",
            "role": "collaborator",
            "createdAt": "2024-04-05",
            "lastLogin": "2024-12-10T14:30:00",
        },
    ]

    for data in users_data:
        if db.session.get(User, data["id"]):
            continue
        user = User(
            id=data["id"],
            email=data["email"],
            name=data["name"],
            role=data["role"],
            created_at=date.fromisoformat(data["createdAt"]),
            last_login=datetime.fromisoformat(data["lastLogin"]),
        )
        db.session.add(user)


def seed_vehicles():
    vehicles_data = [
        {
            "id": "v1",
            "matricule": "00125-116-16",
            "marque": "Toyota",
            "modele": "Hilux",
            "type": "utilitaire",
            "puissance": 2400,
            "dateAcquisition": "2022-05-15",
            "dateMiseEnCirculation": "2022-06-01",
            "kilometrage": 45230,
            "statut": "en_service",
            "affectation": "Service Logistique",
        },
        {
            "id": "v2",
            "matricule": "00234-117-16",
            "marque": "Renault",
            "modele": "Master",
            "type": "camion",
            "puissance": 2300,
            "dateAcquisition": "2021-08-20",
            "dateMiseEnCirculation": "2021-09-01",
            "kilometrage": 78450,
            "statut": "en_service",
            "affectation": "Transport Marchandises",
        },
        {
            "id": "v3",
            "matricule": "00345-118-16",
            "marque": "Peugeot",
            "modele": "308",
            "type": "voiture",
            "puissance": 1600,
            "dateAcquisition": "2023-01-10",
            "dateMiseEnCirculation": "2023-02-01",
            "kilometrage": 23100,
            "statut": "en_service",
            "affectation": "Direction",
        },
        {
            "id": "v4",
            "matricule": "00456-119-16",
            "marque": "Ford",
            "modele": "Transit",
            "type": "utilitaire",
            "puissance": 2000,
            "dateAcquisition": "2020-11-25",
            "dateMiseEnCirculation": "2020-12-15",
            "kilometrage": 112300,
            "statut": "en_maintenance",
            "affectation": "Service Technique",
        },
        {
            "id": "v5",
            "matricule": "00567-120-16",
            "marque": "Honda",
            "modele": "CB500X",
            "type": "moto",
            "puissance": 500,
            "dateAcquisition": "2023-06-01",
            "dateMiseEnCirculation": "2023-06-15",
            "kilometrage": 8900,
            "statut": "en_service",
            "affectation": "Coursier",
        },
        {
            "id": "v6",
            "matricule": "00678-121-16",
            "marque": "Mercedes",
            "modele": "Sprinter",
            "type": "camion",
            "puissance": 2200,
            "dateAcquisition": "2019-03-10",
            "dateMiseEnCirculation": "2019-04-01",
            "kilometrage": 156780,
            "statut": "hors_service",
            "affectation": "Non assigné",
        },
        {
            "id": "v7",
            "matricule": "00789-122-16",
            "marque": "Volkswagen",
            "modele": "Caddy",
            "type": "utilitaire",
            "puissance": 1400,
            "dateAcquisition": "2022-09-15",
            "dateMiseEnCirculation": "2022-10-01",
            "kilometrage": 34560,
            "statut": "en_service",
            "affectation": "Service Commercial",
        },
        {
            "id": "v8",
            "matricule": "00890-123-16",
            "marque": "Hyundai",
            "modele": "Tucson",
            "type": "voiture",
            "puissance": 1600,
            "dateAcquisition": "2023-11-20",
            "dateMiseEnCirculation": "2023-12-01",
            "kilometrage": 5200,
            "statut": "en_service",
            "affectation": "Direction Générale",
        },
    ]

    for data in vehicles_data:
        if db.session.get(Vehicle, data["id"]):
            continue
        vehicle = Vehicle(
            id=data["id"],
            immatriculation=data["matricule"],
            marque=data["marque"],
            modele=data["modele"],
            type_vehicule=data["type"],
            puissance=data["puissance"],
            date_acquisition=date.fromisoformat(data["dateAcquisition"]),
            date_mise_circulation=date.fromisoformat(data["dateMiseEnCirculation"]),
            kilometrage_actuel=data["kilometrage"],
            statut=data["statut"],
            affectation=data.get("affectation"),
        )
        db.session.add(vehicle)


def seed_drivers():
    drivers_data = [
        {
            "id": "d1",
            "nom": "Mansouri",
            "prenom": "Youcef",
            "telephone": "0550123456",
            "email": "y.mansouri@fiaramotion.com",
            "permis": "B, C",
            "dateEmbauche": "2020-03-15",
            "statut": "actif",
            "vehiculeAssigne": "v1",
        },
        {
            "id": "d2",
            "nom": "Belkacem",
            "prenom": "Ahmed",
            "telephone": "0551234567",
            "email": "a.belkacem@fiaramotion.com",
            "permis": "B, C, D",
            "dateEmbauche": "2019-06-20",
            "statut": "actif",
            "vehiculeAssigne": "v2",
        },
        {
            "id": "d3",
            "nom": "Cherif",
            "prenom": "Mourad",
            "telephone": "0552345678",
            "email": "m.cherif@fiaramotion.com",
            "permis": "A, B",
            "dateEmbauche": "2021-01-10",
            "statut": "actif",
            "vehiculeAssigne": "v5",
        },
        {
            "id": "d4",
            "nom": "Hamidi",
            "prenom": "Sofiane",
            "telephone": "0553456789",
            "email": "s.hamidi@fiaramotion.com",
            "permis": "B, C",
            "dateEmbauche": "2022-04-05",
            "statut": "en_conge",
            "vehiculeAssigne": None,
        },
        {
            "id": "d5",
            "nom": "Zeroual",
            "prenom": "Rachid",
            "telephone": "0554567890",
            "email": "r.zeroual@fiaramotion.com",
            "permis": "B",
            "dateEmbauche": "2023-02-15",
            "statut": "actif",
            "vehiculeAssigne": "v7",
        },
        {
            "id": "d6",
            "nom": "Bouaziz",
            "prenom": "Farid",
            "telephone": "0555678901",
            "email": "f.bouaziz@fiaramotion.com",
            "permis": "B, C, D",
            "dateEmbauche": "2018-09-01",
            "statut": "actif",
            "vehiculeAssigne": "v8",
        },
    ]

    for data in drivers_data:
        if db.session.get(Driver, data["id"]):
            continue
        driver = Driver(
            id=data["id"],
            nom=data["nom"],
            prenom=data["prenom"],
            telephone=data["telephone"],
            email=data["email"],
            permis=data["permis"],
            date_embauche=date.fromisoformat(data["dateEmbauche"]),
            statut=data["statut"],
            vehicule_assigne_id=data.get("vehiculeAssigne"),
        )
        db.session.add(driver)


def seed_fuel_entries():
    fuel_data = [
        {
            "id": "f1",
            "vehiculeId": "v1",
            "date": "2024-12-10",
            "kilometrage": 45100,
            "volume": 65,
            "cout": 8450,
            "station": "Naftal - Alger Centre",
            "conducteurId": "d1",
            "statut": "valide",
        },
        {
            "id": "f2",
            "vehiculeId": "v2",
            "date": "2024-12-09",
            "kilometrage": 78200,
            "volume": 85,
            "cout": 11050,
            "station": "Naftal - Bab Ezzouar",
            "conducteurId": "d2",
            "statut": "valide",
        },
        {
            "id": "f3",
            "vehiculeId": "v3",
            "date": "2024-12-11",
            "kilometrage": 23050,
            "volume": 45,
            "cout": 5850,
            "station": "Naftal - Hydra",
            "conducteurId": "d6",
            "statut": "en_attente",
        },
        {
            "id": "f4",
            "vehiculeId": "v5",
            "date": "2024-12-08",
            "kilometrage": 8800,
            "volume": 15,
            "cout": 1950,
            "station": "Naftal - El Harrach",
            "conducteurId": "d3",
            "statut": "valide",
        },
        {
            "id": "f5",
            "vehiculeId": "v7",
            "date": "2024-12-11",
            "kilometrage": 34500,
            "volume": 50,
            "cout": 6500,
            "station": "Naftal - Kouba",
            "conducteurId": "d5",
            "statut": "en_attente",
        },
    ]

    for data in fuel_data:
        if db.session.get(FuelEntry, data["id"]):
            continue
        entry = FuelEntry(
            id=data["id"],
            vehicule_id=data["vehiculeId"],
            date=date.fromisoformat(data["date"]),
            kilometrage=data["kilometrage"],
            volume=data["volume"],
            cout=data["cout"],
            station=data["station"],
            conducteur_id=data["conducteurId"],
            statut=data["statut"],
        )
        db.session.add(entry)


def seed_maintenances():
    maint_data = [
        {
            "id": "m1",
            "vehiculeId": "v4",
            "type": "revision",
            "description": "Révision complète des 100 000 km",
            "date": "2024-12-05",
            "kilometrage": 112000,
            "cout": 45000,
            "prestataire": "Ford Service Alger",
            "statut": "en_cours",
            "demandeurId": "d1",
        },
        {
            "id": "m2",
            "vehiculeId": "v1",
            "type": "vidange",
            "description": "Vidange huile moteur et filtre",
            "date": "2024-12-15",
            "kilometrage": 45230,
            "cout": None,
            "prestataire": None,
            "statut": "en_attente",
            "demandeurId": "d1",
        },
        {
            "id": "m3",
            "vehiculeId": "v2",
            "type": "freins",
            "description": "Remplacement plaquettes de frein avant",
            "date": "2024-11-28",
            "kilometrage": 78000,
            "cout": 18500,
            "prestataire": "Auto Service Pro",
            "statut": "cloture",
            "demandeurId": "d2",
        },
        {
            "id": "m4",
            "vehiculeId": "v6",
            "type": "autre",
            "description": "Problème moteur - diagnostic nécessaire",
            "date": "2024-12-01",
            "kilometrage": 156780,
            "cout": None,
            "prestataire": None,
            "statut": "en_attente",
            "demandeurId": "2",
        },
        {
            "id": "m5",
            "vehiculeId": "v5",
            "type": "pneus",
            "description": "Changement pneu arrière",
            "date": "2024-12-10",
            "kilometrage": 8900,
            "cout": 12000,
            "prestataire": "Moto Parts DZ",
            "statut": "cloture",
            "demandeurId": "d3",
        },
    ]

    for data in maint_data:
        if db.session.get(Maintenance, data["id"]):
            continue
        m = Maintenance(
            id=data["id"],
            vehicule_id=data["vehiculeId"],
            type=data["type"],
            description=data["description"],
            date=date.fromisoformat(data["date"]),
            kilometrage=data["kilometrage"],
            cout=data["cout"],
            prestataire=data["prestataire"],
            statut=data["statut"],
            demandeur_id=data["demandeurId"],
        )
        db.session.add(m)


def seed_missions():
    missions_data = [
        {
            "id": "mi1",
            "titre": "Livraison matériel Oran",
            "description": "Transport de matériel informatique vers la succursale Oran",
            "vehiculeId": "v2",
            "conducteurId": "d2",
            "dateDebut": "2024-12-12",
            "dateFin": "2024-12-13",
            "destination": "Oran",
            "kilometrageDepart": 78450,
            "kilometrageArrivee": None,
            "statut": "en_cours",
        },
        {
            "id": "mi2",
            "titre": "Déplacement Direction Constantine",
            "description": "Réunion avec partenaires à Constantine",
            "vehiculeId": "v3",
            "conducteurId": "d6",
            "dateDebut": "2024-12-14",
            "dateFin": "2024-12-15",
            "destination": "Constantine",
            "kilometrageDepart": None,
            "kilometrageArrivee": None,
            "statut": "planifie",
        },
        {
            "id": "mi3",
            "titre": "Collecte marchandises Blida",
            "description": "Récupération commande fournisseur",
            "vehiculeId": "v1",
            "conducteurId": "d1",
            "dateDebut": "2024-12-11",
            "dateFin": "2024-12-11",
            "destination": "Blida",
            "kilometrageDepart": 45100,
            "kilometrageArrivee": 45230,
            "statut": "termine",
        },
        {
            "id": "mi4",
            "titre": "Livraison express Tizi Ouzou",
            "description": "Documents urgents pour client",
            "vehiculeId": "v5",
            "conducteurId": "d3",
            "dateDebut": "2024-12-12",
            "dateFin": "2024-12-12",
            "destination": "Tizi Ouzou",
            "kilometrageDepart": None,
            "kilometrageArrivee": None,
            "statut": "en_cours",
        },
        {
            "id": "mi5",
            "titre": "Visite client Annaba",
            "description": "Présentation commerciale",
            "vehiculeId": "v7",
            "conducteurId": "d5",
            "dateDebut": "2024-12-16",
            "dateFin": "2024-12-17",
            "destination": "Annaba",
            "kilometrageDepart": None,
            "kilometrageArrivee": None,
            "statut": "planifie",
        },
    ]

    for data in missions_data:
        if db.session.get(Mission, data["id"]):
            continue
        m = Mission(
            id=data["id"],
            titre=data["titre"],
            description=data["description"],
            vehicule_id=data["vehiculeId"],
            conducteur_id=data["conducteurId"],
            date_debut=date.fromisoformat(data["dateDebut"]),
            date_fin=date.fromisoformat(data["dateFin"]),
            destination=data["destination"],
            kilometrage_depart=data["kilometrageDepart"],
            kilometrage_arrivee=data["kilometrageArrivee"],
            statut=data["statut"],
        )
        db.session.add(m)


def seed_planning():
    planning_data = [
        {
            "id": "p1",
            "vehiculeId": "v1",
            "conducteurId": "d1",
            "dateDebut": "2024-12-12",
            "dateFin": "2024-12-12",
            "type": "disponible",
            "description": "Disponible pour missions locales",
        },
        {
            "id": "p2",
            "vehiculeId": "v2",
            "conducteurId": "d2",
            "dateDebut": "2024-12-12",
            "dateFin": "2024-12-13",
            "type": "mission",
            "description": "Mission Oran",
        },
        {
            "id": "p3",
            "vehiculeId": "v3",
            "conducteurId": "d6",
            "dateDebut": "2024-12-14",
            "dateFin": "2024-12-15",
            "type": "reserve",
            "description": "Réservé Direction",
        },
        {
            "id": "p4",
            "vehiculeId": "v4",
            "conducteurId": None,
            "dateDebut": "2024-12-05",
            "dateFin": "2024-12-20",
            "type": "maintenance",
            "description": "En révision",
        },
        {
            "id": "p5",
            "vehiculeId": "v5",
            "conducteurId": "d3",
            "dateDebut": "2024-12-12",
            "dateFin": "2024-12-12",
            "type": "mission",
            "description": "Livraison Tizi Ouzou",
        },
    ]

    for data in planning_data:
        if db.session.get(Planning, data["id"]):
            continue
        p = Planning(
            id=data["id"],
            vehicule_id=data["vehiculeId"],
            conducteur_id=data.get("conducteurId"),
            date_debut=date.fromisoformat(data["dateDebut"]),
            date_fin=date.fromisoformat(data["dateFin"]),
            type=data["type"],
            description=data["description"],
        )
        db.session.add(p)


def seed_action_logs():
    logs_data = [
        {
            "id": "log1",
            "userId": "1",
            "action": "CREATE",
            "entite": "vehicle",
            "entiteId": "v8",
            "details": "Ajout véhicule Hyundai Tucson",
            "timestamp": "2024-12-11T10:30:00",
        },
        {
            "id": "log2",
            "userId": "2",
            "action": "UPDATE",
            "entite": "maintenance",
            "entiteId": "m1",
            "details": "Mise à jour statut maintenance: en_cours",
            "timestamp": "2024-12-11T09:15:00",
        },
        {
            "id": "log3",
            "userId": "3",
            "action": "CREATE",
            "entite": "fuel",
            "entiteId": "f3",
            "details": "Nouveau plein carburant enregistré",
            "timestamp": "2024-12-11T08:45:00",
        },
        {
            "id": "log4",
            "userId": "2",
            "action": "APPROVE",
            "entite": "mission",
            "entiteId": "mi1",
            "details": "Mission Oran approuvée",
            "timestamp": "2024-12-10T16:20:00",
        },
        {
            "id": "log5",
            "userId": "1",
            "action": "DELETE",
            "entite": "driver",
            "entiteId": "d_old",
            "details": "Suppression ancien conducteur",
            "timestamp": "2024-12-10T14:00:00",
        },
    ]

    for data in logs_data:
        if db.session.get(ActionLog, data["id"]):
            continue
        log = ActionLog(
            id=data["id"],
            user_id=data["userId"],
            action=data["action"],
            entite=data["entite"],
            entite_id=data["entiteId"],
            details=data["details"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
        )
        db.session.add(log)


def main():
    app = create_app()
    with app.app_context():
        seed_users()
        seed_vehicles()
        seed_drivers()
        seed_fuel_entries()
        seed_maintenances()
        seed_missions()
        seed_planning()
        seed_action_logs()
        db.session.commit()
        print("Données mock insérées avec succès.")


if __name__ == "__main__":
    main()


