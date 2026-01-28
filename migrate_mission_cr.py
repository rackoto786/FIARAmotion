from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE missions ADD COLUMN missionnaire_retour VARCHAR(255)"))
            conn.commit()
            print("Column missionnaire_retour added to missions table.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")
