from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    print("Updating Admin profile_email...")
    admin = User.query.filter_by(role='admin').first()
    
    if admin:
        print(f"Found admin: {admin.name}")
        print(f"  - Current email (matricule): {admin.email}")
        print(f"  - Current profile_email: {admin.profile_email}")
        
        # Update profile_email to the actual email address
        admin.profile_email = "rackoto786@gmail.com"
        db.session.commit()
        
        print(f"\n✅ Updated admin profile_email to: {admin.profile_email}")
        print(f"   Note: admin.email ('{admin.email}') is the matricule for login")
    else:
        print("❌ Admin user not found!")
    
    # Verify all recipients
    print("\n" + "="*60)
    print("Verification of all notification recipients:")
    print("="*60)
    
    recipients_users = User.query.filter(User.role.in_(['admin', 'technician'])).all()
    
    if recipients_users:
        print(f"\nFound {len(recipients_users)} admin/technician users:\n")
        for u in recipients_users:
            print(f"👤 {u.name} ({u.role})")
            print(f"   - Matricule (login): {u.email}")
            print(f"   - Email (notifications): {u.profile_email or '⚠️ NOT SET'}")
            print()
        
        # Get valid recipients
        valid_recipients = [u.profile_email for u in recipients_users if u.profile_email]
        print(f"✅ Valid email addresses for notifications: {len(valid_recipients)}")
        if valid_recipients:
            for email in valid_recipients:
                print(f"   - {email}")
    else:
        print("\n❌ No admin or technician users found!")
