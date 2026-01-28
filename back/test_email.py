import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app import create_app, mail
from flask_mail import Message

app = create_app()

with app.app_context():
    print("Testing email configuration...")
    msg = Message("Test Parc Auto",
                  recipients=["rackoto786@gmail.com"])
    msg.body = "Ceci est un test de configuration email pour l'application Parc Auto."
    
    try:
        mail.send(msg)
        print("Email envoyé avec succès !")
    except Exception as e:
        print(f"Erreur lors de l'envoi : {e}")
