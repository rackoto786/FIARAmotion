from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash
import uuid
from datetime import date, datetime

def seed_admin():
    app = create_app()
    with app.app_context():
        matricule = "admin01"
        password = "password123"
        
        user = User.query.filter(db.func.lower(User.email) == matricule).first()
        
        if user:
            print(f"User with matricule '{matricule}' already exists. Updating...")
            user.role = 'admin'
            user.status = 'active'
            user.password = generate_password_hash(password)
            print(f"✅ User '{matricule}' updated to Admin/Active with password '{password}'.")
        else:
            print(f"Creating new Admin user with matricule '{matricule}'...")
            new_user = User(
                id=str(uuid.uuid4()),
                email=matricule,
                name="Administrateur",
                password=generate_password_hash(password),
                role='admin',
                status='active',
                profile_email="admin@example.com",
                created_at=date.today(),
                last_login=datetime.now()
            )
            db.session.add(new_user)
            print(f"✅ User '{matricule}' created with password '{password}'.")
            
        try:
            db.session.commit()
            print("Database changes committed successfully.")
        except Exception as e:
            print(f"❌ Error committing changes: {e}")
            db.session.rollback()

if __name__ == "__main__":
    seed_admin()
