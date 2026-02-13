from app import create_app, db
import traceback
from sqlalchemy import text

def run_migration():
    app = create_app()
    with app.app_context():
        try:
            print("--- Step 1: Dropping old foreign key constraints ---")
            # Find all foreign key constraints on fuel_entries
            sql = text("""
                SELECT conname 
                FROM pg_constraint c 
                JOIN pg_class t ON t.oid = c.conrelid 
                WHERE t.relname = 'fuel_entries' AND c.contype = 'f'
            """)
            constraints = db.session.execute(sql).fetchall()
            
            for c in constraints:
                name = c[0]
                check_sql = text(f"SELECT confrelid::regclass::text FROM pg_constraint WHERE conname = '{name}'")
                target_table = db.session.execute(check_sql).scalar()
                
                if target_table == 'drivers':
                    print(f"Dropping constraint {name} pointing to {target_table}...")
                    db.session.execute(text(f"ALTER TABLE fuel_entries DROP CONSTRAINT {name}"))
                    db.session.commit()

            print("--- Step 2: Mapping Driver IDs to User IDs ---")
            # This handles the case where demandeur_id (renamed from conducteur_id) currently contains driver IDs
            migrate_sql = text("""
                UPDATE fuel_entries f
                SET demandeur_id = u.id
                FROM drivers d, users u
                WHERE f.demandeur_id = d.id
                  AND LOWER(d.email) = LOWER(u.email)
            """)
            res = db.session.execute(migrate_sql)
            db.session.commit()
            print("Data migration (direct match) complete.")

            # Fallback for remaining driver IDs (link to first admin)
            fallback_sql = text("""
                UPDATE fuel_entries f
                SET demandeur_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
                FROM drivers d
                WHERE f.demandeur_id = d.id
            """)
            db.session.execute(fallback_sql)
            db.session.commit()
            print("Fallback migration complete.")

            print("--- Step 3: Adding new foreign key constraint to users ---")
            try:
                db.session.execute(text("""
                    ALTER TABLE fuel_entries 
                    ADD CONSTRAINT fuel_entries_demandeur_id_fkey 
                    FOREIGN KEY (demandeur_id) REFERENCES users(id)
                """))
                db.session.commit()
                print("New constraint added successfully.")
            except Exception as e:
                print(f"Failed to add new constraint: {e}")

            print("Migration finished successfully.")

        except Exception as e:
            print("Migration failed:")
            traceback.print_exc()
            db.session.rollback()

if __name__ == "__main__":
    run_migration()
