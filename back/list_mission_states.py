from app import create_app
from app.models import db, Mission

app = create_app()

with app.app_context():
    missions = Mission.query.all()
    print(f"Total missions: {len(missions)}")
    states = {}
    for m in missions:
        states[m.state] = states.get(m.state, 0) + 1
    
    for state, count in states.items():
        print(f"State '{state}': {count}")
