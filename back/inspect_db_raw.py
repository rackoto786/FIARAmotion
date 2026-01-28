
import os
import sys

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    with open('db_inspect_raw.txt', 'w') as f:
        f.write("--- USER LIST RAW ---\n")
        users = User.query.all()
        for u in users:
            f.write(f"ID: {u.id}\n")
            f.write(f"Email: {u.email!r}\n") # Use !r to see raw string
            f.write(f"Email Bytes: {u.email.encode('utf-8').hex()}\n")
            f.write("-" * 20 + "\n")
        f.write("--- END ---\n")
print("Raw inspection written to db_inspect_raw.txt")
