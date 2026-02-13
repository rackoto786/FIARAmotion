import sys
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

def reset_password(identifier, new_password):
    app = create_app()
    with app.app_context():
        # Search by email (case insensitive)
        user = User.query.filter(db.func.lower(User.email) == identifier.lower()).first()
        
        if not user:
            print(f"Error: User with identifier '{identifier}' not found.")
            return False
            
        print(f"Found user: {user.name} ({user.email})")
        user.password = generate_password_hash(new_password)
        db.session.commit()
        print(f"Password for user '{user.email}' has been successfully reset.")
        return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_password.py <email_or_matricule> <new_password>")
        sys.exit(1)
        
    identifier = sys.argv[1]
    new_password = sys.argv[2]
    
    reset_password(identifier, new_password)
