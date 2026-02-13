from functools import wraps
from flask import request, jsonify, g
from ..models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header

        if not token:
            print(f"[DEBUG AUTH] Token missing. Headers: {request.headers}")
            if request.method == 'OPTIONS':
                print("[DEBUG AUTH] OPTIONS request allowed pass-through")
                return jsonify({'status': 'ok'}), 200
            return jsonify({'message': 'Le token est manquant !'}), 401

        try:
            # Find user with this token
            current_user = User.query.filter_by(token=token).first()
            # Check if user is approved (active)
            if current_user.status != 'active':
                print(f"[DEBUG AUTH] Account not approved: {current_user.email} (Status: {current_user.status})")
                return jsonify({'message': 'Compte non approuvé. Veuillez contacter un administrateur.'}), 403
            
            # Save user in global flask context
            g.user = current_user
        except Exception as e:
            print(f"[DEBUG AUTH] Error during auth: {str(e)}")
            return jsonify({'message': f'Erreur d\'authentification: {str(e)}'}), 401

        return f(*args, **kwargs)

    return decorated
