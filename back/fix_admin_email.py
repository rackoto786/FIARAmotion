from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    print("Updating Admin Email...")
    admin = User.query.filter_by(role='admin').first()
    
    if admin:
        print(f"Found admin: {admin.name} (Current Email: {admin.email})")
        admin.email = "rackoto786@gmail.com"
        db.session.commit()
        print(f"✅ Updated admin email to: {admin.email}")
    else:
        print("❌ Admin user not found!")

    # Verify
    recipients = User.query.filter(User.role.in_(['admin', 'technician'])).all()
    print(f"\nCurrent Valid Recipients ({len(recipients)}):")
    for u in recipients:
        print(f" - {u.name}: {u.email}")
