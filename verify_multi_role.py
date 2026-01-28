from back.app import db, create_app
from back.app.models import User, Notification
from datetime import datetime

app = create_app()

with app.app_context():
    # Find admin user
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        print("No admin user found")
        exit()
    
    print(f"Testing for admin: {admin.name}")
    
    # Create a multi-role notification
    notif = Notification(
        id="test_multi_role",
        title="Multi-Role Test",
        message="Should be visible to admin and technician",
        target_role="admin,technician",
        type="info",
        timestamp=datetime.utcnow()
    )
    db.session.add(notif)
    db.session.commit()
    
    # Simulate get_notifications logic
    from sqlalchemy import or_, and_
    notifications = Notification.query.filter(
        or_(
            Notification.target_role == admin.role,
            Notification.target_role.like(f"%{admin.role}%"),
            Notification.target_user_id == admin.id,
            and_(Notification.target_role.is_(None), Notification.target_user_id.is_(None))
        )
    ).all()
    
    found = any(n.id == "test_multi_role" for n in notifications)
    print(f"Multi-role notification found in admin's list: {found}")
    
    # Cleanup
    db.session.delete(notif)
    db.session.commit()
