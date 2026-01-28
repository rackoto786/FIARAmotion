from app import create_app
from app.models import ActionLog, User
import json

app = create_app()
with app.app_context():
    # Get the last 5 logs
    logs = ActionLog.query.order_by(ActionLog.timestamp.desc()).limit(5).all()
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "action": log.action,
            "user_id": log.user_id,
            "user_name": log.user.name if log.user else "Unknown",
            "timestamp": log.timestamp.isoformat(),
            "details": log.details
        })
    print(json.dumps(results, indent=2))
