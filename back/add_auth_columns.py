
from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        try:
            print("Adding 'token' column to 'users' table...")
            try:
                db.session.execute(text("ALTER TABLE users ADD COLUMN token VARCHAR(255);"))
                print("✅ 'token' column added.")
            except Exception as e:
                print(f"⚠️ 'token' column might already exist: {e}")
                db.session.rollback()

            print("Adding 'created_by_id' column to 'planning' table...")
            try:
                db.session.execute(text("ALTER TABLE planning ADD COLUMN created_by_id VARCHAR(255);"))
                print("✅ 'created_by_id' column added.")
            except Exception as e:
                print(f"⚠️ 'created_by_id' column might already exist: {e}")
                db.session.rollback()

            db.session.commit()
            print("Migration completed.")
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
