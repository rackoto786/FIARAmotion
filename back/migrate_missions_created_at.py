import sys
import os
from datetime import datetime

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app import create_app, db
from app.models import Mission
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if column exists
        db.session.execute(text("ALTER TABLE missions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP"))
        db.session.execute(text("UPDATE missions SET created_at = date_debut WHERE created_at IS NULL"))
        db.session.commit()
        print("Successfully added created_at column to missions table.")
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")
