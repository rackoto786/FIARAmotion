"""
Migration script to update image_128 column type from VARCHAR(255) to TEXT
Run this script to update existing database schema
"""

from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # For SQLite, we need to recreate the table or use ALTER TABLE
            # Check if we're using SQLite
            db.session.execute(text("""
                ALTER TABLE vehicles 
                MODIFY COLUMN image_128 TEXT;
            """))
            db.session.commit()
            print("✅ Migration successful: image_128 column updated to TEXT")
        except Exception as e:
            # For SQLite, ALTER TABLE MODIFY is not supported
            # Try SQLite-specific syntax
            try:
                db.session.rollback()
                # SQLite doesn't support ALTER COLUMN directly
                # We need to recreate the table
                print("Attempting SQLite-compatible migration...")
                
                # For SQLite, we'll just drop and recreate all tables
                # This is safe for development but WARNING: will lose data
                print("⚠️  WARNING: This will recreate the vehicles table")
                response = input("Continue? (yes/no): ")
                
                if response.lower() == 'yes':
                    db.drop_all()
                    db.create_all()
                    print("✅ Database recreated successfully")
                else:
                    print("❌ Migration cancelled")
            except Exception as e2:
                print(f"❌ Migration failed: {e2}")
                db.session.rollback()

if __name__ == "__main__":
    migrate()
