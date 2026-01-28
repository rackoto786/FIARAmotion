from app import create_app
from app.models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print("ID | Name | Token (first 10 chars)")
    print("-" * 40)
    for user in users:
        token_str = str(user.token)[:10] + "..." if user.token else "None"
        print(f"{user.id} | {user.name} | {token_str}")
