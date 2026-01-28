"""
Migration: Add created_by_id to missions table
"""
from back.app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Add created_by_id column to missions table
        db.session.execute(text("""
            ALTER TABLE missions 
            ADD COLUMN IF NOT EXISTS created_by_id VARCHAR;
        """))
        
        # Add foreign key constraint
        db.session.execute(text("""
            ALTER TABLE missions 
            ADD CONSTRAINT fk_missions_created_by_id 
            FOREIGN KEY (created_by_id) REFERENCES users(id)
            ON DELETE SET NULL;
        """))
        
        db.session.commit()
        print("✅ Migration réussie: created_by_id ajouté à la table missions")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Erreur lors de la migration: {e}")
        # If FK constraint already exists, just continue
        if "already exists" in str(e):
            print("La contrainte existe déjà, migration ignorée.")
        else:
            raise
