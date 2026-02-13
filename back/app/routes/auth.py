from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import date, datetime
from flask import Blueprint, jsonify, request

from .. import db
from ..models import User
from ..utils.auth_utils import token_required

bp = Blueprint("auth", __name__)


@bp.post("/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").lower() # This corresponds to Matricule
    password = data.get("password")
    name = data.get("name")
    role = data.get("role", "collaborator")  # Default role
    profile_email = (data.get("profile_email") or "").lower() # Actual contact email

    if not email or not password or not name:
        return jsonify({"success": False, "error": "Tous les champs sont requis"}), 400

    if User.query.filter(db.func.lower(User.email) == email).first():
        return jsonify({"success": False, "error": "Ce matricule est déjà utilisé"}), 400

    new_user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        password=generate_password_hash(password),
        role=role,
        status='pending',
        profile_email=profile_email,
        created_at=date.today(),
        last_login=datetime.now()
    )

    db.session.add(new_user)
    db.session.commit()

    from ..utils.notification_utils import create_notification
    create_notification(
        title="Nouvelle inscription",
        message=f"L'utilisateur {name} s'est inscrit et attend votre approbation.",
        type="info",
        target_role="admin",
        link="/settings"
    )

    return jsonify({"success": True, "message": "Compte créé avec succès"}), 201


@bp.post("/login")
def login():
    """
    Endpoint de connexion avec vérification de mot de passe.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "Email et mot de passe requis"}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()
    
    # Validation du statut du compte
    if user.status != 'active':
        return jsonify({
            "success": False, 
            "error": "Votre compte est en attente d'approbation par un administrateur."
        }), 403

    # Update last login
    user.last_login = datetime.now()
    
    # Générer un token simple et le stocker
    import secrets
    token = secrets.token_hex(32)
    user.token = token

    db.session.commit()

    # Conversion en format proche de celui utilisé côté frontend
    user_dict = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "status": user.status,
        "avatar": user.avatar,
        "profileEmail": user.profile_email,
        "createdAt": user.created_at.isoformat(),
        "lastLogin": user.last_login.isoformat() if user.last_login else None,
    }



    from ..utils import log_action
    log_action(user_id=user.id, action="Connexion", entite="Auth", entite_id=user.id, details=f"Connexion de {user.name}")

    return jsonify({
        "success": True, 
        "user": user_dict,
        "token": token
    }), 200


@bp.post("/logout")
@token_required
def logout():
    from flask import g
    try:
        g.user.token = None
        from datetime import datetime
        # Optionally store a last logout time if needed in future
        # g.user.last_logout = datetime.now()
        db.session.commit()
        from ..utils import log_action
        log_action(user_id=g.user.id, action="Déconnexion", entite="Auth", entite_id=g.user.id, details=f"Déconnexion de {g.user.name}")
        return jsonify({"success": True, "message": "Déconnexion réussie"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


