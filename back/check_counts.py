import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Maintenance, Notification

app = create_app()

with app.app_context():
    m_count = Maintenance.query.count()
    n_count = Notification.query.count()
    print(f"Maint Count: {m_count}")
    print(f"Notif Count: {n_count}")
    
    recent_m = Maintenance.query.order_by(Maintenance.id.desc()).limit(3).all()
    for rm in recent_m:
        print(f"Maint ID: {rm.id}, Type: {rm.type}, Date: {rm.date}")
