import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    # Trouver admin01
    admin = User.query.filter_by(email="admin01").first()
    
    if not admin:
        print("ERREUR: admin01 non trouve")
        sys.exit(1)
    
    print(f"Admin: {admin.name} - ID: {admin.id}\n")
    
    # Obtenir tous les autres utilisateurs
    others = User.query.filter(User.id != admin.id).all()
    
    print(f"Utilisateurs a supprimer: {len(others)}\n")
    
    for user in others:
        user_id = user.id
        user_name = user.name
        user_email = user.email
        
        print(f"Suppression: {user_name} ({user_email})")
        
        try:
            # NOTE: Pour maintenances, missions, planning -> SUPPRIMER au lieu de mettre a NULL
            # car demandeur_id/created_by_id ont nullable=False
            
            # 1. Action logs
            db.session.execute(db.text("DELETE FROM action_logs WHERE user_id = :uid"), {"uid": user_id})
            
            # 2. Maintenances - SUPPRIMER car demandeur_id est NOT NULL
            db.session.execute(db.text("DELETE FROM maintenances WHERE demandeur_id = :uid"), {"uid": user_id})
            
            # 3. Missions - Mettre a NULL (verifier le modele)
            db.session.execute(db.text("UPDATE missions SET created_by_id = NULL WHERE created_by_id = :uid"), {"uid": user_id})
            
            # 4. Planning - Mettre a NULL (verifier le modele)
            db.session.execute(db.text("UPDATE planning SET created_by_id = NULL WHERE created_by_id = :uid"), {"uid": user_id})
            
            # 5. Notifications
            db.session.execute(db.text("DELETE FROM notifications WHERE target_user_id = :uid"), {"uid": user_id})
            
            # 6. Notification reads
            db.session.execute(db.text("DELETE FROM notification_reads WHERE user_id = :uid"), {"uid": user_id})
            
            # 7. Supprimer l'utilisateur
            db.session.execute(db.text("DELETE FROM users WHERE id = :uid"), {"uid": user_id})
            
            # Commit tout ensemble
            db.session.commit()
            print(f"  -> Supprime avec succes!\n")
            
        except Exception as e:
            db.session.rollback()
            print(f"  -> ERREUR: {str(e)}\n")
    
    # Vérifier
    remaining = User.query.all()
    print(f"="*50)
    print(f"Utilisateurs restants: {len(remaining)}")
    print(f"="*50)
    for u in remaining:
        print(f"  {u.name} ({u.email})")
