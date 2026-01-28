from back.app import db, create_app
from back.app.models import User, Notification
from datetime import datetime
import uuid

app = create_app()

def inject_test_notifications(email):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"Utilisateur avec l'email {email} non trouvé.")
            return

        print(f"Injection de notifications de test pour : {user.name} ({user.role})")

        test_notifs = [
            {
                "title": "Test: Succès",
                "message": "Ceci est une notification de test pour confirmer que le système fonctionne (Succès).",
                "type": "success",
                "link": "/dashboard"
            },
            {
                "title": "Test: Alerte",
                "message": "Ceci est une alerte de test pour le technicien.",
                "type": "warning",
                "link": "/vehicles"
            },
            {
                "title": "Test: Erreur",
                "message": "Ceci est une notification d'erreur de test.",
                "type": "error",
                "link": "/settings"
            },
            {
                "title": "Test: Info",
                "message": "Ceci est une simple information de test.",
                "type": "info",
                "link": "/"
            }
        ]

        for data in test_notifs:
            notif = Notification(
                id=f"test_{uuid.uuid4().hex[:8]}",
                title=data["title"],
                message=data["message"],
                type=data["type"],
                target_user_id=user.id,
                link=data["link"],
                timestamp=datetime.utcnow()
            )
            db.session.add(notif)
        
        db.session.commit()
        print("Notifications injectées avec succès. Veuillez rafraîchir la page web.")

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@fiaramotion.com"
    inject_test_notifications(email)
