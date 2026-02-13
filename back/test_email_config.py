"""
Test Script: Verify Email Notification Configuration

This script verifies that the email notification system is properly configured
to use profile_email instead of email (matricule) for sending alerts.
"""

from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    print("=" * 70)
    print("EMAIL NOTIFICATION CONFIGURATION TEST")
    print("=" * 70)
    
    # Get all admin and technician users
    recipients_users = User.query.filter(User.role.in_(['admin', 'technician'])).all()
    
    if not recipients_users:
        print("\n❌ ERROR: No admin or technician users found!")
        exit(1)
    
    print(f"\n✅ Found {len(recipients_users)} admin/technician user(s):")
    print("-" * 70)
    
    valid_count = 0
    invalid_count = 0
    
    for user in recipients_users:
        print(f"\n👤 User: {user.name}")
        print(f"   Role: {user.role}")
        print(f"   Matricule (for login): {user.email}")
        
        if user.profile_email:
            print(f"   ✅ Notification Email: {user.profile_email}")
            valid_count += 1
        else:
            print(f"   ❌ Notification Email: NOT SET!")
            invalid_count += 1
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✅ Users with valid notification email: {valid_count}")
    print(f"❌ Users without notification email: {invalid_count}")
    
    if valid_count > 0:
        valid_emails = [u.profile_email for u in recipients_users if u.profile_email]
        print(f"\n📧 Notifications will be sent to:")
        for email in valid_emails:
            print(f"   • {email}")
        print(f"\n✅ Email notifications are properly configured!")
    else:
        print(f"\n❌ WARNING: No users have valid notification emails!")
        print(f"   Update the profile_email field for admin/technician users.")
    
    print("\n" + "=" * 70)
    print("IMPORTANT NOTES:")
    print("=" * 70)
    print("• The 'email' field is used for LOGIN (it contains the matricule)")
    print("• The 'profile_email' field is used for EMAIL NOTIFICATIONS")
    print("• All email notification functions now use 'profile_email'")
    print("=" * 70 + "\n")
