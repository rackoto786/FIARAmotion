from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # Add columns to missions table
    try:
        db.session.execute(text("ALTER TABLE missions ADD COLUMN numero_om VARCHAR(100)"))
        print("Added numero_om to missions")
    except Exception as e:
        print(f"numero_om exists in missions or error: {e}")

    try:
        db.session.execute(text("ALTER TABLE missions ADD COLUMN zone VARCHAR(50) DEFAULT 'ville'"))
        print("Added zone to missions")
    except Exception as e:
        print(f"zone exists in missions or error: {e}")

    # Add columns to planning table
    try:
        db.session.execute(text("ALTER TABLE planning ADD COLUMN numero_om VARCHAR(100)"))
        print("Added numero_om to planning")
    except Exception as e:
        print(f"numero_om exists in planning or error: {e}")

    try:
        db.session.execute(text("ALTER TABLE planning ADD COLUMN zone VARCHAR(50) DEFAULT 'ville'"))
        print("Added zone to planning")
    except Exception as e:
        print(f"zone exists in planning or error: {e}")

    db.session.commit()
    print("Migration completed.")
