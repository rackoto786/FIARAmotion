from datetime import datetime, date
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    if not User.query.filter_by(email="admin@fiaramotion.com").first():
        print("Adding admin user...")
        user = User(
            id="1",
            email="admin@fiaramotion.com",
            name="Mohamed Benali",
            role="admin",
            created_at=date(2024, 1, 15),
            last_login=datetime(2024, 12, 12, 8, 30, 0),
        )
        db.session.add(user)
        try:
            db.session.commit()
            print("Admin user added successfully.")
        except Exception as e:
            print(f"Error adding user: {e}")
            db.session.rollback()
    else:
        print("Admin user already exists.")
