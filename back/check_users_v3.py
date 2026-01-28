
import os
import sys

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    print("--- USER LIST START ---")
    users = User.query.all()
    for u in users:
        print(f"ID: {u.id} | Email: '{u.email}' | Role: {u.role}")
    print("--- USER LIST END ---")
