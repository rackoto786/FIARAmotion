from flask import Blueprint, jsonify
from ..models import ActionLog
from .. import db
from ..utils.auth_utils import token_required

bp = Blueprint("logs", __name__)

@bp.get("/")
@token_required
def get_logs():
    from flask import request, g
    from datetime import datetime
    
    # Check if current user is admin
    if not g.user or g.user.role != 'admin':
        return jsonify({"success": False, "error": "Accès refusé. Seuls les administrateurs peuvent accéder aux logs."}), 403

    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    start_hour = request.args.get('startHour') # format "HH:mm"
    end_hour = request.args.get('endHour')     # format "HH:mm"
    user_id = request.args.get('userId')

    query = ActionLog.query

    if user_id:
        query = query.filter(ActionLog.user_id == user_id)

    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            query = query.filter(ActionLog.timestamp >= start_date)
        except ValueError:
            pass

    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            query = query.filter(ActionLog.timestamp <= end_date)
        except ValueError:
            pass

    if start_hour:
        try:
            h, m = map(int, start_hour.split(':'))
            from sqlalchemy import extract
            query = query.filter(extract('hour', ActionLog.timestamp) * 60 + extract('minute', ActionLog.timestamp) >= h * 60 + m)
        except Exception:
            pass

    if end_hour:
        try:
            h, m = map(int, end_hour.split(':'))
            from sqlalchemy import extract
            query = query.filter(extract('hour', ActionLog.timestamp) * 60 + extract('minute', ActionLog.timestamp) <= h * 60 + m)
        except Exception:
            pass

    logs = query.order_by(ActionLog.timestamp.desc()).all()
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "action": log.action,
            "entite": log.entite,
            "entiteId": log.entite_id,
            "details": log.details,
            "timestamp": log.timestamp.isoformat(),
            "userId": log.user_id,
            "user": {
                "name": log.user.name if log.user else "Utilisateur supprimé",
                "avatar": log.user.avatar if log.user else None
            }
        })
    return jsonify(result), 200
