"""
Script pour supprimer tous les utilisateurs sauf admin01
"""
from app import create_app, db
from app.models import User, ActionLog, Maintenance, Mission, Planning, Notification, NotificationRead

def delete_all_users_except_admin01():
    app = create_app()
    
    with app.app_context():
        # Trouver l'administrateur admin01
        admin = User.query.filter_by(email="admin01").first()
        
        if not admin:
            print("❌ Administrateur 'admin01' non trouvé!")
            print("\n📋 Utilisateurs disponibles:")
            all_users = User.query.all()
            for user in all_users:
                print(f"   - {user.name} ({user.email})")
            return
        
        print(f"✅ Administrateur trouvé: {admin.name} ({admin.email})")
        print(f"   ID: {admin.id}")
        print()
        
        # Récupérer tous les utilisateurs sauf admin01
        users_to_delete = User.query.filter(User.id != admin.id).all()
        
        if not users_to_delete:
            print("ℹ️  Aucun utilisateur à supprimer.")
            return
        
        print(f"📋 {len(users_to_delete)} utilisateur(s) à supprimer:")
        for user in users_to_delete:
            print(f"   - {user.name} ({user.email}) - Rôle: {user.role}")
        print()
        
        # Supprimer chaque utilisateur (sans confirmation pour automatisation)
        deleted_count = 0
        for user in users_to_delete:
            try:
                user_email = user.email
                user_name = user.name
                user_id = user.id
                
                print(f"🗑️  Suppression de {user_name} ({user_email})...")
                
                # Nettoyer les relations
                # 1. Supprimer les logs d'actions
                action_logs_count = ActionLog.query.filter_by(user_id=user_id).delete()
                
                # 2. Mettre à NULL les maintenances demandées
                maintenances_count = Maintenance.query.filter_by(demandeur_id=user_id).update({"demandeur_id": None})
                
                # 3. Mettre à NULL les missions créées
                missions_count = Mission.query.filter_by(created_by_id=user_id).update({"created_by_id": None})
                
                # 4. Mettre à NULL les plannings créés
                planning_count = Planning.query.filter_by(created_by_id=user_id).update({"created_by_id": None})
                
                # 5. Supprimer les notifications ciblées
                notifications_count = Notification.query.filter_by(target_user_id=user_id).delete()
                
                # 6. Supprimer les statuts de lecture de notifications
                notif_reads_count = NotificationRead.query.filter_by(user_id=user_id).delete()
                
                # Supprimer l'utilisateur
                db.session.delete(user)
                db.session.commit()
                
                deleted_count += 1
                print(f"   ✅ Supprimé (logs: {action_logs_count}, maint: {maintenances_count}, missions: {missions_count})")
                
            except Exception as e:
                db.session.rollback()
                print(f"   ❌ Erreur: {str(e)}")
        
        print()
        print(f"✅ Opération terminée: {deleted_count}/{len(users_to_delete)} utilisateur(s) supprimé(s)")
        
        # Afficher les utilisateurs restants
        remaining_users = User.query.all()
        print()
        print(f"👤 Utilisateur(s) restant(s): {len(remaining_users)}")
        for user in remaining_users:
            print(f"   ✅ {user.name} ({user.email}) - Rôle: {user.role}")

if __name__ == "__main__":
    delete_all_users_except_admin01()
