import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Notification

app = create_app()

with app.app_context():
    notifs = Notification.query.order_by(Notification.timestamp.desc()).limit(5).all()
    print(f"Total notifications found: {len(notifs)}")
    for n in notifs:
        print(f"ID: {n.id}, Title: {n.title}, Role: {n.target_role}, UserID: {n.target_user_id}, Time: {n.timestamp}")
