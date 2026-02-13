from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

def fix_admin():
    app = create_app()
    with app.app_context():
        # Find the admin user by their current (incorrect) email login
        old_login = "rackoto786@gmail.com"
        target_matricule = "ADMIN"
        target_email = "rackoto786@gmail.com"
        
        user = User.query.filter(User.email == old_login).first()
        
        if not user:
            print(f"User with login '{old_login}' not found. Searching by role 'admin' instead...")
            user = User.query.filter(User.role == 'admin').first()
            
        if not user:
            print("No admin user found.")
            return

        print(f"Found admin user: {user.name} (Current ID: {user.email})")
        
        # Update credentials
        user.email = target_matricule  # Login ID becomes Matricule
        user.profile_email = target_email # Contact email
        user.password = generate_password_hash("password123")
        
        try:
            db.session.commit()
            print("Successfully updated admin account.")
            print(f"Login (Matricule): {user.email}")
            print(f"Saved Profile Email: {user.profile_email}")
            print(f"Password: password123")
        except Exception as e:
            db.session.rollback()
            print(f"Error updating user: {e}")

if __name__ == "__main__":
    fix_admin()
