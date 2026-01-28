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
