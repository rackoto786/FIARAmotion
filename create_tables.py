import sys
import os

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from back.app import create_app, db
from back.app.models import Compliance

app = create_app()
with app.app_context():
    db.create_all()
    print("Database tables created successfully, including 'compliance'.")
