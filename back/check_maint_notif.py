import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Maintenance, Notification

app = create_app()

with app.app_context():
    m = Maintenance.query.order_by(Maintenance.id.desc()).first()
    if m:
        print(f"Latest Maintenance: ID={m.id}, Type={m.type}, Date={m.date}")
        # Search for notification with similar message
        notifs = Notification.query.filter(Notification.message.like(f"%entretien ({m.type})%")).all()
        print(f"Related notifications found: {len(notifs)}")
        for n in notifs:
            print(f"  ID: {n.id}, Title: {n.title}, Role: {n.target_role}, Time: {n.timestamp}")
    else:
        print("No maintenance found.")
