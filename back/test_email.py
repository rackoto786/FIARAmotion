from app import create_app, mail
from flask_mail import Message
import sys

app = create_app()

with app.app_context():
    print("Testing email configuration...")
    print(f"Server: {app.config['MAIL_SERVER']}")
    print(f"Port: {app.config['MAIL_PORT']}")
    print(f"User: {app.config['MAIL_USERNAME']}")
    # Mask password
    print(f"Password: {app.config['MAIL_PASSWORD'][:4]}...")

    try:
        msg = Message(
            subject="Test Email from Flask",
            recipients=[app.config['MAIL_USERNAME']],  # Send to self
            body="If you receive this, the email configuration is correct."
        )
        print("Attempting to send email...")
        mail.send(msg)
        print("✅ SUCCESS: Email sent successfully!")
    except Exception as e:
        print(f"❌ ERROR: Failed to send email.")
        print(f"Exception type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
