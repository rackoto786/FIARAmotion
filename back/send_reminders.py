import os
import sys
from datetime import datetime, timedelta
from app import create_app, db
from app.models import Mission, Planning, Maintenance, Vehicle
from app.utils.email_utils import send_reminder_alert

def send_reminders():
    app = create_app()
    with app.app_context():
        # Calculate the date for tomorrow
        tomorrow = (datetime.utcnow() + timedelta(days=1)).date()
        print(f"Checking for pending requests due on: {tomorrow}")

        # 1. Missions (state='nouveau')
        pending_missions = Mission.query.filter(
            Mission.state == 'nouveau',
            Mission.date_debut == tomorrow
        ).all()
        for mission in pending_missions:
            print(f"Sending reminder for Mission: {mission.reference}")
            send_reminder_alert("Mission", mission, mission.vehicle)

        # 2. Planning (status='en_attente')
        pending_plannings = Planning.query.filter(
            Planning.status == 'en_attente',
            Planning.date_debut == tomorrow
        ).all()
        for planning in pending_plannings:
            print(f"Sending reminder for Planning: {planning.type} ({planning.id})")
            send_reminder_alert("Planning", planning, planning.vehicle)

        # 3. Maintenance (statut='en_attente')
        pending_maintenances = Maintenance.query.filter(
            Maintenance.statut == 'en_attente',
            Maintenance.date == tomorrow
        ).all()
        for maintenance in pending_maintenances:
            print(f"Sending reminder for Maintenance: {maintenance.type} ({maintenance.id})")
            send_reminder_alert("Maintenance", maintenance, maintenance.vehicle)

        print("Reminder script completed.")

if __name__ == "__main__":
    send_reminders()
