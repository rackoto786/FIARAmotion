from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if column exists
        result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='planning' AND column_name='mission_id'"))
        column_exists = result.fetchone()
        
        if not column_exists:
            print("Adding mission_id column to planning table...")
            db.session.execute(text("ALTER TABLE planning ADD COLUMN mission_id VARCHAR REFERENCES missions(id)"))
            db.session.commit()
            print("Column added successfully.")
        else:
            print("Column mission_id already exists.")
    except Exception as e:
        print(f"Error adding column: {e}")
        db.session.rollback()
