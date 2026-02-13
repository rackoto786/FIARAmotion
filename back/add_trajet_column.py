from app import db, create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Use simple SQL to add the column
        db.session.execute(text("ALTER TABLE missions ADD COLUMN trajet TEXT"))
        db.session.commit()
        print("Successfully added 'trajet' column to 'missions' table.")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding column: {e}")
