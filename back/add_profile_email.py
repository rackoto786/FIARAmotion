
from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        print("Adding 'profile_email' column to 'users' table...")
        try:
            db.session.execute(text("ALTER TABLE users ADD COLUMN profile_email VARCHAR(255);"))
            print("✅ 'profile_email' column added.")
            db.session.commit()
        except Exception as e:
            print(f"⚠️ 'profile_email' column might already exist or error occurred: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
