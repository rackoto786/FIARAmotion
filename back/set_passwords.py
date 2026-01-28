
import os
import sys
from werkzeug.security import generate_password_hash

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    print("Setting passwords to 'demo' for accounts without one...")
    admin = User.query.filter_by(email="admin@fiaramotion.com").first()
    if admin:
        admin.password = generate_password_hash("demo")
        print(f"Set password for {admin.email}")
    
    # Also update others just in case
    others = User.query.filter(User.password == None).all()
    for u in others:
        u.password = generate_password_hash("demo")
        print(f"Set password for {u.email}")
    
    db.session.commit()
    print("Done.")
