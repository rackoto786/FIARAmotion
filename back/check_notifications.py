from app import create_app
from app.models import Notification, NotificationRead

app = create_app()
with app.app_context():
    notifications = Notification.query.all()
    print(f"Total notifications found: {len(notifications)}")
    for n in notifications[:5]:
        print(f"- [{n.timestamp}] {n.title}: {n.message} (Role: {n.target_role}, User: {n.target_user_id})")
    
    reads = NotificationRead.query.all()
    print(f"Total notification reads found: {len(reads)}")
