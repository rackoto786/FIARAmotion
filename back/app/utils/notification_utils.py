from datetime import datetime
from ..models import Notification, db

def create_notification(title, message, type='info', target_role=None, target_user_id=None, link=None):
    """
    Crée une nouvelle notification dans la base de données.
    """
    try:
        new_notification = Notification(
            id=f"notif_{int(datetime.utcnow().timestamp() * 1000)}",
            title=title,
            message=message,
            type=type,
            target_role=target_role,
            target_user_id=target_user_id,
            link=link,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_notification)
        db.session.commit()
        return new_notification
    except Exception as e:
        print(f"Error creating notification: {e}")
        db.session.rollback()
        return None
