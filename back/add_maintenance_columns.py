from app import create_app, db
from sqlalchemy import text

app = create_app()

def add_columns():
    with app.app_context():
        # List of new columns and their types
        new_columns = [
            ("filtre_air_interval_km", "INTEGER DEFAULT 10000"),
            ("last_filtre_air_km", "INTEGER DEFAULT 0"),
            ("filtre_carburant_interval_km", "INTEGER DEFAULT 10000"),
            ("last_filtre_carburant_km", "INTEGER DEFAULT 0"),
            ("filtre_habitacle_interval_km", "INTEGER DEFAULT 10000"),
            ("last_filtre_habitacle_km", "INTEGER DEFAULT 0"),
            ("freins_interval_km", "INTEGER DEFAULT 20000"),
            ("last_freins_km", "INTEGER DEFAULT 0"),
            ("amortisseur_interval_km", "INTEGER DEFAULT 50000"),
            ("last_amortisseur_km", "INTEGER DEFAULT 0"),
            ("pneus_interval_km", "INTEGER DEFAULT 30000"),
            ("last_pneus_km", "INTEGER DEFAULT 0"),
            ("distribution_interval_km", "INTEGER DEFAULT 80000"),
            ("last_distribution_km", "INTEGER DEFAULT 0"),
            ("liquide_refroidissement_interval_km", "INTEGER DEFAULT 40000"),
            ("last_liquide_refroidissement_km", "INTEGER DEFAULT 0"),
            ("pont_interval_km", "INTEGER DEFAULT 60000"),
            ("last_pont_km", "INTEGER DEFAULT 0"),
        ]
        
        with db.engine.connect() as conn:
            # Check existing columns to avoid errors
            result = conn.execute(text("PRAGMA table_info(vehicles)"))
            existing_columns = [row[1] for row in result.fetchall()]
            
            for col_name, col_type in new_columns:
                if col_name not in existing_columns:
                    print(f"Adding column {col_name}...")
                    try:
                        conn.execute(text(f"ALTER TABLE vehicles ADD COLUMN {col_name} {col_type}"))
                    except Exception as e:
                        print(f"Error adding {col_name}: {e}")
                else:
                    print(f"Column {col_name} already exists.")
            
            conn.commit()
            print("Migration completed.")

if __name__ == "__main__":
    add_columns()
