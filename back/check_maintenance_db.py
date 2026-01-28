import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Maintenance

app = create_app()

with app.app_context():
    maints = Maintenance.query.order_by(Maintenance.id.desc()).limit(5).all()
    print(f"Total maintenance records found: {len(maints)}")
    for m in maints:
        print(f"ID: {m.id}, Type: {m.type}, Statut: {m.statut}, Date: {m.date}")
