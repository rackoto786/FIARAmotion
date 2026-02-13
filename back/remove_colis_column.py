from app import db, create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Use simple SQL to drop the column
        db.session.execute(text("ALTER TABLE missions DROP COLUMN nombre_colis"))
        db.session.commit()
        print("Successfully dropped 'nombre_colis' column from 'missions' table.")
    except Exception as e:
        db.session.rollback()
        print(f"Error dropping column: {e}")
