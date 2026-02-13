"""
Script direct pour supprimer tous les utilisateurs sauf admin01
"""
from app import create_app, db

def force_delete_users():
    app = create_app()
    
    with app.app_context():
        # ID de l'utilisateur admin01
        admin_email = "admin01"
        
        print("🔍 Recherche de admin01...")
        result = db.session.execute(db.text("SELECT id, name, email FROM users WHERE email = :email"), {"email": admin_email})
        admin = result.fetchone()
        
        if not admin:
            print(f"❌ Utilisateur avec email '{admin_email}' non trouvé!")
            return
        
        admin_id = admin[0]
        print(f"✅ Admin trouvé: {admin[1]} ({admin[2]}) - ID: {admin_id}")
        print()
        
        # Lister les utilisateurs à supprimer
        result = db.session.execute(db.text("SELECT id, name, email, role FROM users WHERE id != :admin_id"), {"admin_id": admin_id})
        users_to_delete = result.fetchall()
        
        if not users_to_delete:
            print("ℹ️  Aucun utilisateur à supprimer.")
            return
        
        print(f"📋 {len(users_to_delete)} utilisateur(s) à supprimer:")
        for user in users_to_delete:
            print(f"   - {user[1]} ({user[2]}) - Rôle: {user[3]}")
        print()
        
        # Supprimer les relations pour chaque utilisateur
        deleted_count = 0
        for user in users_to_delete:
            user_id = user[0]
            user_name = user[1]
            user_email = user[2]
            
            try:
                print(f"🗑️  Suppression de {user_name} ({user_email})...")
                
                # 1. Supprimer action_logs
                db.session.execute(db.text("DELETE FROM action_logs WHERE user_id = :user_id"), {"user_id": user_id})
                
                # 2. Mettre à NULL dans maintenances
                db.session.execute(db.text("UPDATE maintenances SET demandeur_id = NULL WHERE demandeur_id = :user_id"), {"user_id": user_id})
                
                # 3. Mettre à NULL dans missions
                db.session.execute(db.text("UPDATE missions SET created_by_id = NULL WHERE created_by_id = :user_id"), {"user_id": user_id})
                
                # 4. Mettre à NULL dans planning
                db.session.execute(db.text("UPDATE planning SET created_by_id = NULL WHERE created_by_id = :user_id"), {"user_id": user_id})
                
                # 5. Supprimer notifications
                db.session.execute(db.text("DELETE FROM notifications WHERE target_user_id = :user_id"), {"user_id": user_id})
                
                # 6. Supprimer notification_reads
                db.session.execute(db.text("DELETE FROM notification_reads WHERE user_id = :user_id"), {"user_id": user_id})
                
                # 7. Supprimer l'utilisateur
                db.session.execute(db.text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
                
                db.session.commit()
                deleted_count += 1
                print(f"   ✅ Supprimé avec succès")
                
            except Exception as e:
                db.session.rollback()
                print(f"   ❌ Erreur: {str(e)}")
        
        print()
        print(f"✅ Opération terminée: {deleted_count}/{len(users_to_delete)} utilisateur(s) supprimé(s)")
        
        # Afficher les utilisateurs restants
        result = db.session.execute(db.text("SELECT id, name, email, role FROM users"))
        remaining_users = result.fetchall()
        
        print()
        print(f"👤 Utilisateur(s) restant(s): {len(remaining_users)}")
        for user in remaining_users:
            print(f"   ✅ {user[1]} ({user[2]}) - Rôle: {user[3]}")

if __name__ == "__main__":
    force_delete_users()
