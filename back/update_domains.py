
import os
import sys

# Add the parent directory to sys.path to import the app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    print("Updating user emails...")
    users = User.query.all()
    count = 0
    for u in users:
        old_email = u.email
        if "@fleetmanager.com" in old_email:
            u.email = old_email.replace("@fleetmanager.com", "@fiaramotion.com")
            print(f"Updated: {old_email} -> {u.email}")
            count += 1
        elif "@fleet.com" in old_email:
            u.email = old_email.replace("@fleet.com", "@fiaramotion.com")
            print(f"Updated: {old_email} -> {u.email}")
            count += 1
    
    db.session.commit()
    print(f"Finished updating {count} users.")
