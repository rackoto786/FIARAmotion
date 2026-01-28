from app import create_app
from app.models import User
import json

app = create_app()
with app.app_context():
    users = User.query.all()
    results = []
    for user in users:
        results.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "token": user.token
        })
    with open("tokens_dump.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Tokens dumped to tokens_dump.json")
