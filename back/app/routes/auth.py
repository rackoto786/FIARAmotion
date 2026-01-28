from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import date, datetime
from flask import Blueprint, jsonify, request

from .. import db
from ..models import User

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
    
    # Validation du mot de passe
    if not user or not user.password or not check_password_hash(user.password, password):
        return jsonify({"success": False, "error": "Email ou mot de passe incorrect"}), 401

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
def logout():
    return jsonify({"success": True, "message": "Déconnexion réussie"}), 200


