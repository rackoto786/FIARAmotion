
from app import create_app, db
from app.models import User, ActionLog, Maintenance, Planning

def cleanup_users():
    app = create_app()
    with app.app_context():
        # Keep Mohamed Benali (admin)
        admin_email = "admin@fiaramotion.com"
        admin = User.query.filter_by(email=admin_email).first()
        
        if not admin:
            print(f"Warning: Admin user {admin_email} not found. Aborting to prevent total lockout.")
            return

        print(f"Keeping Admin: {admin.name} ({admin.id})")
        
        users_to_delete = User.query.filter(User.id != admin.id).all()
        
        for user in users_to_delete:
            print(f"Deleting user: {user.name} ({user.role})")
            
            # Nullify references or delete related data if strictly required.
            # For now, let's try deleting and see if SQLAlchemy cascades or errors.
            # Explicitly handling known relationships if they don't cascade:
            
            # ActionLogs are usually important history, so maybe we shouldn't delete them?
            # But the user wants these "demo" users gone.
            # Let's delete their action logs.
            ActionLog.query.filter_by(user_id=user.id).delete()
            
            # Maintenance 'demandeur_id'
            # If we delete the user, we might break maintenance records. 
            # Let's reassign them to admin or delete them? 
            # Safest is to reassign to admin for now to preserve the record itself.
            Maintenance.query.filter_by(demandeur_id=user.id).update({"demandeur_id": admin.id})
            
            # Planning 'created_by_id'
            Planning.query.filter_by(created_by_id=user.id).update({"created_by_id": admin.id})
            
            db.session.delete(user)
            
        db.session.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_users()
