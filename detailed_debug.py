import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from back.app import create_app, db
from back.app.models import User, Driver, Vehicle

app = create_app()

with app.app_context(), open("detailed_debug_output.txt", "w", encoding="utf-8") as f:
    f.write("--- USERS ---\n")
    users = User.query.all()
    for u in users:
        f.write(f"ID: {u.id}\n")
        f.write(f"  Name: {u.name}\n")
        f.write(f"  Email/Matricule: {u.email}\n")
        f.write(f"  ProfileEmail: {u.profile_email}\n")
        f.write(f"  Role: {u.role}\n")
        f.write(f"  Status: {u.status}\n")

    f.write("\n--- DRIVERS ---\n")
    drivers = Driver.query.all()
    for d in drivers:
        f.write(f"ID: {d.id}\n")
        f.write(f"  Nom Complet: {d.nom} {d.prenom}\n")
        f.write(f"  Email: {d.email}\n")
        f.write(f"  VehiculeAssigne: {d.vehicule_assigne_id}\n")

    f.write("\n--- VEHICLES ---\n")
    vehicles = Vehicle.query.all()
    for v in vehicles:
        f.write(f"ID: {v.id}\n")
        f.write(f"  Immatriculation: {v.immatriculation}\n")
        f.write(f"  Marque: {v.marque}\n")
        f.write(f"  Modele: {v.modele}\n")
        f.write(f"  Conducteur ID: {v.conducteur_id}\n")
