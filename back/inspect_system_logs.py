from app import create_app
from app.models import ActionLog, User
import json

app = create_app()
with app.app_context():
    # Get the last 20 logs that are attributed to "system"
    system_logs = ActionLog.query.filter_by(user_id="system").order_by(ActionLog.timestamp.desc()).limit(20).all()
    results = []
    for log in system_logs:
        results.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat()
        })
    print(json.dumps(results, indent=2))
