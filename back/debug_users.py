from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    users = User.query.all()
    with open("users_list.txt", "w", encoding="utf-8") as f:
        f.write(f"Found {len(users)} users.\n")
        for u in users:
            f.write(f"ID: {u.id}, Email: {u.email}, Name: {u.name}, Role: {u.role}, Password Hash: {u.password[:10] if u.password else 'NONE'}\n")
print("Done writing to users_list.txt")
