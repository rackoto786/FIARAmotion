
from app import create_app, db
from sqlalchemy import text

def add_user_status_column():
    app = create_app()
    with app.app_context():
        # Check if column exists
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('users')]
        
        if 'status' not in columns:
            print("Adding status column to users table...")
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'pending'"))
                
                # Set existing users to active
                conn.execute(text("UPDATE users SET status = 'active'"))
                
                conn.commit()
            print("Column added and existing users set to active.")
        else:
            print("Status column already exists.")

if __name__ == "__main__":
    add_user_status_column()
