"""
Script pour lister tous les utilisateurs
"""
from app import create_app, db
from app.models import User

def list_all_users():
    app = create_app()
    
    with app.app_context():
        users = User.query.all()
        
        print(f"\n{'='*60}")
        print(f"LISTE DES UTILISATEURS ({len(users)} total)")
        print(f"{'='*60}\n")
        
        for i, user in enumerate(users, 1):
            print(f"{i}. ID: {user.id}")
            print(f"   Nom: {user.name}")
            print(f"   Email: {user.email}")
            print(f"   Rôle: {user.role}")
            print(f"   Statut: {user.status}")
            print(f"   Créé le: {user.created_at}")
            print()

if __name__ == "__main__":
    list_all_users()
