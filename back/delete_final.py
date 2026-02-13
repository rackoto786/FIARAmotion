import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    # Trouver admin01 par son email exact 'admin01'
    admin_keep = User.query.filter_by(email="admin01").first()
    
    if not admin_keep:
        print("ERREUR CRITIQUE: L'utilisateur 'admin01' n'existe pas. Arrêt pour sécurité.")
        sys.exit(1)
    
    print(f"✅ UTILISATEUR A GARDER: {admin_keep.name} (ID: {admin_keep.id})")
    print("-" * 60)

    # Trouver tous les autres utilisateurs
    users_to_delete = User.query.filter(User.id != admin_keep.id).all()
    
    if not users_to_delete:
        print("Aucun autre utilisateur à supprimer.")
    
    for user in users_to_delete:
        print(f"🔄 Traitement de : {user.name} ({user.email}) ID: {user.id}")
        
        try:
            # 1. Supprimer ActionLogs
            res = db.session.execute(db.text("DELETE FROM action_logs WHERE user_id = :uid"), {"uid": user.id})
            print(f"   - ActionLogs: {res.rowcount} supprimés")

            # 2. Supprimer NotificationRead (C'est souvent ici que ça bloque)
            res = db.session.execute(db.text("DELETE FROM notification_reads WHERE user_id = :uid"), {"uid": user.id})
            print(f"   - NotificationReads: {res.rowcount} supprimés")

            # 3. Supprimer Notifications (target_user_id)
            res = db.session.execute(db.text("DELETE FROM notifications WHERE target_user_id = :uid"), {"uid": user.id})
            print(f"   - Notifications: {res.rowcount} supprimés")

            # 4. Maintenances (demandeur_id) - Important: Supprimer car nullable=False souvent
            res = db.session.execute(db.text("DELETE FROM maintenances WHERE demandeur_id = :uid"), {"uid": user.id})
            print(f"   - Maintenances: {res.rowcount} supprimées")

            # 5. Missions (created_by_id) - Mise à NULL ou Suppression
            # Vérifions si on peut mettre à NULL
            try:
                res = db.session.execute(db.text("UPDATE missions SET created_by_id = NULL WHERE created_by_id = :uid"), {"uid": user.id})
                print(f"   - Missions (Update NULL): {res.rowcount} mises à jour")
            except Exception:
                # Si update échoue (contrainte NOT NULL), on supprime
                db.session.rollback()
                res = db.session.execute(db.text("DELETE FROM missions WHERE created_by_id = :uid"), {"uid": user.id})
                print(f"   - Missions (Delete): {res.rowcount} supprimées")

            # 6. Planning (created_by_id) - Mise à NULL ou Suppression
            try:
                res = db.session.execute(db.text("UPDATE planning SET created_by_id = NULL WHERE created_by_id = :uid"), {"uid": user.id})
                print(f"   - Planning (Update NULL): {res.rowcount} mis à jour")
            except Exception:
                db.session.rollback()
                res = db.session.execute(db.text("DELETE FROM planning WHERE created_by_id = :uid"), {"uid": user.id})
                print(f"   - Planning (Delete): {res.rowcount} supprimés")

            # Avez-vous d'autres tables liées ? Vérifions s'il y a des trigger ou autres
            # Pour l'instant on tente la suppression du User
            
            res = db.session.execute(db.text("DELETE FROM users WHERE id = :uid"), {"uid": user.id})
            print(f"   🗑️  USER SUPPRIMÉ: {res.rowcount} ligne(s)")
            
            db.session.commit()
            print("   ✅ Transaction validée avec succès.")

        except Exception as e:
            db.session.rollback()
            print(f"   ❌ ERREUR: {str(e)}")
        
        print("-" * 60)

    # Vérification finale
    remaining = User.query.all()
    print(f"\n📊 Bilan : Il reste {len(remaining)} utilisateur(s).")
    for u in remaining:
        print(f"   👤 {u.name} ({u.email})")
