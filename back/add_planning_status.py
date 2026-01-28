"""
Migration script to add status column to planning table
"""

from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # Check if column exists first to be safe (optional, but good practice)
            # For simplicity in this script, we'll just try to add it.
            # SQLite doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN universally in older versions,
            # but usually it's fine.
            
            print("Adding 'status' column to 'planning' table...")
            db.session.execute(text("""
                ALTER TABLE planning 
                ADD COLUMN status VARCHAR(50) DEFAULT 'en_attente' NOT NULL;
            """))
            db.session.commit()
            print("✅ Migration successful: 'status' column added.")
        except Exception as e:
            print(f"❌ Migration failed (maybe column already exists?): {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
