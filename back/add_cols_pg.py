import os
import psycopg2
from psycopg2 import sql

def add_columns():
    # Database connection parameters from config (or hardcoded based on file)
    DB_USER = os.environ.get("DB_USER", "ceres")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "admin")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "5432")
    DB_NAME = os.environ.get("DB_NAME", "parc_roulant")

    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()
        print("Connected to database.")

        # List of columns to add with their types
        new_columns = [
            ("vidange_interval_km", "INTEGER DEFAULT 1000"),
            ("last_vidange_km", "INTEGER DEFAULT 0"),
            ("vidange_alert_sent", "BOOLEAN DEFAULT FALSE"),
            ("filtre_interval_km", "INTEGER DEFAULT 1000"),
            ("last_filtre_km", "INTEGER DEFAULT 0"),
            ("filtre_alert_sent", "BOOLEAN DEFAULT FALSE"),
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
            # Check if column exists
            cur.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='vehicles' AND column_name=%s
            """, (col_name,))
            
            if cur.fetchone():
                print(f"Column {col_name} already exists.")
            else:
                print(f"Adding column {col_name}...")
                try:
                    cur.execute(f"ALTER TABLE vehicles ADD COLUMN {col_name} {col_type};")
                    print(f"Successfully added {col_name}")
                except Exception as e:
                    print(f"Failed to add {col_name}: {e}")

        cur.close()
        conn.close()
        print("Migration completed.")

    except Exception as e:
        print(f"Database connection failed: {e}")

if __name__ == "__main__":
    add_columns()
