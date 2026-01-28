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
            "token": user.token
        })
    print(json.dumps(results, indent=2))
