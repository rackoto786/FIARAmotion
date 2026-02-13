from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if column exists
        result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='planning' AND column_name='priorite'"))
        column_exists = result.fetchone()
        
        if not column_exists:
            print("Adding priorite column to planning table...")
            db.session.execute(text("ALTER TABLE planning ADD COLUMN priorite INTEGER DEFAULT 3"))
            db.session.commit()
            print("Column added successfully.")
        else:
            print("Column priorite already exists.")
    except Exception as e:
        print(f"Error adding column: {e}")
        db.session.rollback()
