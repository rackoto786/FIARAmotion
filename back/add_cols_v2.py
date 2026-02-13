from app import create_app, db
from sqlalchemy import text

def add_columns():
    app = create_app()
    with app.app_context():
        print("Starting migration...")
        with db.engine.connect() as conn:
            # List of columns to add with their types
            new_columns = [
                ("vidange_interval_km", "INTEGER DEFAULT 1000"),
                ("last_vidange_km", "INTEGER DEFAULT 0"),
                ("vidange_alert_sent", "BOOLEAN DEFAULT 0"),
                ("filtre_interval_km", "INTEGER DEFAULT 1000"),
                ("last_filtre_km", "INTEGER DEFAULT 0"),
                ("filtre_alert_sent", "BOOLEAN DEFAULT 0"),
                ("filtre_air_interval_km", "INTEGER DEFAULT 0"),
                ("last_filtre_air_km", "INTEGER DEFAULT 0"),
                ("filtre_carburant_interval_km", "INTEGER DEFAULT 0"),
                ("last_filtre_carburant_km", "INTEGER DEFAULT 0"),
                ("filtre_habitacle_interval_km", "INTEGER DEFAULT 0"),
                ("last_filtre_habitacle_km", "INTEGER DEFAULT 0"),
                ("freins_interval_km", "INTEGER DEFAULT 0"),
                ("last_freins_km", "INTEGER DEFAULT 0"),
                ("amortisseur_interval_km", "INTEGER DEFAULT 0"),
                ("last_amortisseur_km", "INTEGER DEFAULT 0"),
                ("pneus_interval_km", "INTEGER DEFAULT 0"),
                ("last_pneus_km", "INTEGER DEFAULT 0"),
                ("distribution_interval_km", "INTEGER DEFAULT 0"),
                ("last_distribution_km", "INTEGER DEFAULT 0"),
                ("liquide_refroidissement_interval_km", "INTEGER DEFAULT 0"),
                ("last_liquide_refroidissement_km", "INTEGER DEFAULT 0"),
                ("pont_interval_km", "INTEGER DEFAULT 0"),
                ("last_pont_km", "INTEGER DEFAULT 0"),
            ]

            for col_name, col_type in new_columns:
                try:
                    # Check if column exists
                    check_sql = text(f"SELECT {col_name} FROM vehicles LIMIT 1")
                    conn.execute(check_sql)
                    print(f"Column {col_name} already exists.")
                except Exception:
                    # Column likely doesn't exist, add it
                    print(f"Adding column {col_name}...")
                    try:
                        sql = text(f"ALTER TABLE vehicles ADD COLUMN {col_name} {col_type}")
                        conn.execute(sql)
                        print(f"Successfully added {col_name}")
                    except Exception as e:
                        print(f"Failed to add {col_name}: {e}")
            
            conn.commit()
        print("Migration completed.")

if __name__ == "__main__":
    add_columns()
