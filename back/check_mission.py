from app import create_app
from app.models import db, Mission

app = create_app()

with app.app_context():
    mission = Mission.query.get('b152bec5-bfdd-4384-8803-715a5158c9c2')
    if mission:
        print(f"Mission trouvée: {mission.id}")
    else:
        print("Mission non trouvée")
