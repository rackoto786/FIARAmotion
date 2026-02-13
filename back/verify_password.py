from app import create_app, db
from app.models import User
from werkzeug.security import check_password_hash

app = create_app()
with app.app_context():
    user = User.query.filter_by(email="rackoto786@gmail.com").first()
    if user:
        is_correct = check_password_hash(user.password, "password123")
        print(f"User: {user.email}")
        print(f"Password 'password123' correct: {is_correct}")
    else:
        print("Admin user rackoto786@gmail.com not found")
