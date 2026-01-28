import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.utils.notification_utils import create_notification
from app.models import User

app = create_app()

with app.app_context():
    # Find an admin user
    admin = User.query.filter_by(role='admin').first()
    if admin:
        print(f"Creating test notification for admin: {admin.email}")
        create_notification(
            title="Test Notification",
            message="Ceci est une notification de test pour vérifier l'intégration.",
            type="success",
            target_user_id=admin.id,
            link="/dashboard"
        )
        print("Notification created successfully.")
    else:
        # Create a role-based notification if no admin found
        print("No admin found, creating role-based notification for 'admin' role.")
        create_notification(
            title="Test Role Notification",
            message="Notification envoyée à tous les administrateurs.",
            type="info",
            target_role="admin"
        )
        print("Notification created successfully.")
