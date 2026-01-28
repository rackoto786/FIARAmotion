import sys
import os
from sqlalchemy import text

# Add the parent directory to sys.path to allow imports from 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

def add_statut_carburant_column():
    app = create_app()
    with app.app_context():
        try:
            # Check if the column already exists
            query = text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'fuel_entries' AND COLUMN_NAME = 'statut_carburant'
            """)
            result = db.session.execute(query).fetchone()
            
            if not result:
                print("Adding 'statut_carburant' column to 'fuel_entries' table...")
                db.session.execute(text("ALTER TABLE fuel_entries ADD COLUMN statut_carburant VARCHAR(50) DEFAULT 'Normal'"))
                db.session.commit()
                print("Column added successfully.")
            else:
                print("Column 'statut_carburant' already exists.")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_statut_carburant_column()
