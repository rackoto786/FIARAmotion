from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash
import uuid
from datetime import date
import secrets

app = create_app()

with app.app_context():
    # Check if exists
    existing = User.query.filter_by(email="collab01").first()
    if existing:
        print("User collab01 already exists")
    else:
        u = User(
            id=str(uuid.uuid4()),
            email="collab01",
            name="Collaborateur Test",
            password=generate_password_hash("password123"),
            role="collaborator",
            status="active",
            created_at=date.today(),
            token=secrets.token_hex(32) # Pre-generate token
        )
        db.session.add(u)
        db.session.commit()
        print(f"User collab01 created with token: {u.token}")
