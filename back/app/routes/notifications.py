from flask import Blueprint, jsonify, request
from ..models import Notification, NotificationRead, User, db
from datetime import datetime
from sqlalchemy import or_, and_, outerjoin

bp = Blueprint("notifications", __name__)

@bp.get("/")
def get_notifications():
    """
    Récupère les notifications pour l'utilisateur actuel.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Unauthorized"}), 401
    
    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    user = User.query.filter_by(token=token).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Les notifications ciblées sur son rôle (gestion des rôles multiples séparés par virgule) OU sur son ID utilisateur spécifique
    notifications = Notification.query.filter(
        or_(
            Notification.target_role == user.role,
            Notification.target_role.like(f"%{user.role}%"),
            Notification.target_user_id == user.id,
            and_(Notification.target_role.is_(None), Notification.target_user_id.is_(None)) # System-wide
        )
    ).order_by(Notification.timestamp.desc()).limit(50).all()

    # Récupérer les IDs des notifications lues
    read_notification_ids = [r.notification_id for r in NotificationRead.query.filter_by(user_id=user.id).all()]

    result = []
    for notif in notifications:
        result.append({
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "link": notif.link,
            "timestamp": notif.timestamp.isoformat(),
            "isRead": notif.id in read_notification_ids
        })

    return jsonify(result), 200

@bp.post("/<id>/read")
def mark_as_read(id):
    """
    Marque une notification comme lue.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"error": "Unauthorized"}), 401
    
    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    user = User.query.filter_by(token=token).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    existing_read = NotificationRead.query.filter_by(user_id=user.id, notification_id=id).first()
    if not existing_read:
        new_read = NotificationRead(
            user_id=user.id,
            notification_id=id,
            read_at=datetime.utcnow()
        )
        db.session.add(new_read)
        db.session.commit()

    return jsonify({"success": True}), 200

@bp.get("/badges")
def get_badge_counts():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"missions": 0, "maintenance": 0}), 200
    
    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    user = User.query.filter_by(token=token).first()
    
    if not user:
        return jsonify({"missions": 0, "maintenance": 0}), 200

    mission_count = 0
    maintenance_count = 0
    
    mission_count = 0
    maintenance_count = 0
    compliance_count = 0
    planning_count = 0
    
    if user.role in ['admin', 'technician']:
        from ..models import Mission, Maintenance, Compliance, Planning
        from datetime import date, timedelta
        
        mission_count = Mission.query.filter_by(state='nouveau').count()
        maintenance_count = Maintenance.query.filter_by(statut='en_attente').count()
        planning_count = Planning.query.filter_by(status='en_attente').count()
        
        # Compliance expiring in 30 days or less (including expired)
        expiry_threshold = date.today() + timedelta(days=30)
        compliance_count = Compliance.query.filter(
            Compliance.statut.in_(['valide', 'à_renouveler']), # only active ones
            Compliance.date_expiration <= expiry_threshold
        ).count()
        
    return jsonify({
        "missions": mission_count,
        "maintenance": maintenance_count,
        "compliance": compliance_count,
        "planning": planning_count
    }), 200
