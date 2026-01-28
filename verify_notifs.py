from back.app import db, create_app
from back.app.models import User, Notification, NotificationRead
from datetime import datetime
import json

app = create_app()

with app.app_context():
    # Find a test user
    user = User.query.first()
    if not user:
        print("No user found")
        exit()
    
    print(f"Testing for user: {user.name} ({user.role})")
    
    # Create a system-wide notification
    notif1 = Notification(
        id=f"test_sys_{int(datetime.utcnow().timestamp())}",
        title="System Test",
        message="System wide notification",
        type="info"
    )
    db.session.add(notif1)
    
    # Create a role-based notification
    notif2 = Notification(
        id=f"test_role_{int(datetime.utcnow().timestamp())}",
        title="Role Test",
        message="Notification for your role",
        target_role=user.role,
        type="success"
    )
    db.session.add(notif2)
    
    # Create a user-specific notification
    notif3 = Notification(
        id=f"test_user_{int(datetime.utcnow().timestamp())}",
        title="User Test",
        message="Notification for you only",
        target_user_id=user.id,
        type="warning"
    )
    db.session.add(notif3)
    
    db.session.commit()
    
    # Simulate get_notifications logic
    from sqlalchemy import or_, and_
    notifications = Notification.query.filter(
        or_(
            Notification.target_role == user.role,
            Notification.target_user_id == user.id,
            and_(Notification.target_role.is_(None), Notification.target_user_id.is_(None))
        )
    ).order_by(Notification.timestamp.desc()).limit(5).all()
    
    print(f"Found {len(notifications)} notifications for user")
    for n in notifications:
        print(f"- {n.title}: {n.message} (Role: {n.target_role}, User: {n.target_user_id})")
        
    # Cleanup
    db.session.delete(notif1)
    db.session.delete(notif2)
    db.session.delete(notif3)
    db.session.commit()
