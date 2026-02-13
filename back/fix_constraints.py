from app import create_app, db
import traceback
from sqlalchemy import text

def fix():
    app = create_app()
    with app.app_context():
        try:
            print("Detecting foreign key constraints on fuel_entries...")
            # Find all foreign key constraints on fuel_entries
            sql = text("""
                SELECT conname 
                FROM pg_constraint c 
                JOIN pg_class t ON t.oid = c.conrelid 
                WHERE t.relname = 'fuel_entries' AND c.contype = 'f'
            """)
            constraints = db.session.execute(sql).fetchall()
            print(f"Found constraints: {[c[0] for c in constraints]}")

            for c in constraints:
                name = c[0]
                # We want to drop the one that points to drivers
                # Usually it involves conducteur_id or points to drivers table
                # Let's check which table it points to
                check_sql = text(f"""
                    SELECT confrelid::regclass::text 
                    FROM pg_constraint 
                    WHERE conname = '{name}'
                """)
                target_table = db.session.execute(check_sql).scalar()
                print(f"Constraint {name} points to {target_table}")
                
                if target_table == 'drivers':
                    print(f"Dropping constraint {name}...")
                    db.session.execute(text(f"ALTER TABLE fuel_entries DROP CONSTRAINT {name}"))
                    db.session.commit()
                    print(f"Dropped {name}")

            # 2. Add new constraint pointing to users
            print("Adding new foreign key constraint to users table...")
            try:
                db.session.execute(text("""
                    ALTER TABLE fuel_entries 
                    ADD CONSTRAINT fuel_entries_demandeur_id_fkey 
                    FOREIGN KEY (demandeur_id) REFERENCES users(id)
                """))
                db.session.commit()
                print("New constraint added successfully.")
            except Exception as e:
                print(f"Failed to add new constraint: {e}. It might already exist or data is inconsistent.")

        except Exception as e:
            print("Fix failed:")
            traceback.print_exc()
            db.session.rollback()

if __name__ == "__main__":
    fix()
