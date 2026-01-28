import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    email = "rackoto786@gmail.com"
    user = User.query.filter_by(email=email).first()
    if user:
        user.role = "admin"
        db.session.commit()
        print(f"Role updated to 'admin' for user {email}")
    else:
        print(f"User {email} not found")
