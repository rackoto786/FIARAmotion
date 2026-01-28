from app import create_app
from app.models import User

app = create_app()
with app.app_context():
    u = User.query.filter_by(email="admin@fiaramotion.com").first()
    if u:
        print(f"Admin Found: Yes")
        print(f"Email: {u.email}")
        print(f"Role: {u.role}")
        print(f"Has Password Hash: {bool(u.password)}")
    else:
        print("Admin Found: No")
