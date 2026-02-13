from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    print("Checking for Email Recipients (Admin/Technician)...")
    recipients = User.query.filter(User.role.in_(['admin', 'technician'])).all()
    
    if not recipients:
        print("❌ NO RECIPIENTS FOUND! No users with role 'admin' or 'technician'.")
    else:
        print(f"✅ Found {len(recipients)} recipients:")
        for user in recipients:
            print(f" - {user.name} ({user.role}): {user.email}")
            
    print("\nChecking for Drivers (for status updates)...")
    drivers = User.query.filter_by(role='driver').all()
    for d in drivers:
         print(f" - {d.name} (driver): {d.email}")
