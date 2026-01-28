
import os
import sys

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    print("Listing users:")
    users = User.query.all()
    for u in users:
        has_password = "Yes" if u.password else "No"
        print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Status: {u.status} | Has Password: {has_password}")
