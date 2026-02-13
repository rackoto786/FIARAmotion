from flask import Blueprint, jsonify, request
from .. import db
from ..models import User
from ..utils.auth_utils import token_required

bp = Blueprint("users", __name__)

@bp.get("/")
def get_users():
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
            "avatar": user.avatar,
            "createdAt": user.created_at.isoformat() if user.created_at else None,
            "lastLogin": user.last_login.isoformat() if user.last_login else None,
            "isOnline": True if user.token else False,
        })
    return jsonify(result), 200

@bp.delete("/<user_id>")
@token_required
def delete_user(user_id):
    from flask import g
    
    # Check if current user is admin
    if not g.user or g.user.role != 'admin':
        return jsonify({"success": False, "error": "Accès refusé. Seuls les administrateurs peuvent supprimer des utilisateurs."}), 403
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404
    
    if user.email == "admin@fiaramotion.com": # Prevent deleting the main admin
        return jsonify({"success": False, "error": "Impossible de supprimer l'administrateur principal"}), 403

    try:
        # Import models we need for cleanup
        from ..models import ActionLog, Maintenance, Mission, Planning, Notification, NotificationRead
        
        # Clean up all related records before deleting user
        # 1. Delete action logs created by this user
        ActionLog.query.filter_by(user_id=user_id).delete()
        
        # 2. Update maintenances to set demandeur_id to NULL
        Maintenance.query.filter_by(demandeur_id=user_id).update({"demandeur_id": None})
        
        # 3. Update missions to set created_by_id to NULL
        Mission.query.filter_by(created_by_id=user_id).update({"created_by_id": None})
        
        # 4. Update planning to set created_by_id to NULL
        Planning.query.filter_by(created_by_id=user_id).update({"created_by_id": None})
        
        # 5. Delete notifications targeted to this user
        Notification.query.filter_by(target_user_id=user_id).delete()
        
        # 6. Delete notification read status for this user
        NotificationRead.query.filter_by(user_id=user_id).delete()
        
        # Now we can safely delete the user
        db.session.delete(user)
        db.session.commit()
        
        from ..utils import log_action
        log_action(action="Suppression", entite="Utilisateur", entite_id=user_id, details=f"Suppression de l'utilisateur {user.email}")
        
        return jsonify({"success": True, "message": "Utilisateur supprimé avec succès"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@bp.put("/<user_id>/role")
@token_required
def update_user_role(user_id):
    from flask import g
    
    # Check if current user is admin
    if not g.user or g.user.role != 'admin':
        return jsonify({"success": False, "error": "Accès refusé. Seuls les administrateurs peuvent modifier les rôles."}), 403
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"success": False, "error": "Utilisateur non trouvé"}), 404
    
    data = request.get_json() or {}
    new_role = data.get("role")
    
    valid_roles = ["admin", "technician", "driver", "direction", "collaborator"]
    
    if not new_role or new_role not in valid_roles:
         return jsonify({"success": False, "error": "Rôle invalide"}), 400

    if user.email == "admin@fiaramotion.com" and new_role != "admin":
        return jsonify({"success": False, "error": "Impossible de changer le rôle de l'administrateur principal"}), 403

    try:
        user.role = new_role
        # If user was pending, approving them (changing role) activates them
        if user.status == 'pending':
            user.status = 'active'
            
        db.session.commit()
        
        from ..utils.notification_utils import create_notification
        create_notification(
            title="Mise à jour de votre compte",
            message=f"Votre rôle a été mis à jour en : {new_role}. Votre compte est désormais {user.status}.",
            type="success",
            target_user_id=user.id,
            link="/"
        )

        from ..utils import log_action
        log_action(action="Modification Rôle", entite="Utilisateur", entite_id=user_id, details=f"Rôle modifié en {new_role} pour {user.email}")

        return jsonify({"success": True, "message": "Rôle mis à jour"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
