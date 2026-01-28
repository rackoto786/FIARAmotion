import json
from datetime import datetime
from flask import request, g
from ..models import ActionLog, User, db

def log_action(user_id=None, action=None, entite=None, entite_id=None, details=None):
    """
    Enregistre une action utilisateur dans la base de données.
    Priorité : user_id argument > g.user (via décorateur) > token manuel.
    """
    try:
        debug_info = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "passed_user_id": user_id,
            "g_has_user": hasattr(g, 'user'),
            "g_user": str(g.user.id) if hasattr(g, 'user') and g.user else None,
            "auth_header": request.headers.get('Authorization') is not None
        }

        if not user_id:
            # 2. Try to get it from flask global context (populated by token_required)
            if hasattr(g, 'user') and g.user:
                user_id = g.user.id
            else:
                # 3. Fallback to manual token extraction from headers
                auth_header = request.headers.get('Authorization')
                if auth_header:
                    # Handle both "Bearer <token>" and "<token>" formats
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(" ")[1]
                    else:
                        token = auth_header
                    
                    user = User.query.filter_by(token=token).first()
                    if user:
                        user_id = user.id
                        debug_info["manual_user"] = user.id
                    else:
                        debug_info["manual_user"] = "NOT FOUND"
        
        debug_info["final_user_id"] = user_id
        
        try:
            with open(r"c:\Parc_auto\back\backend_debug.log", "a") as f:
                f.write(json.dumps(debug_info) + "\n")
        except Exception as e:
            print(f"DEBUG LOG ERROR: {e}")

        # 4. Final fallback for system actions or unidentified processes
        if not user_id:
            user_id = "system" 

        new_log = ActionLog(
            id=f"log_{int(datetime.utcnow().timestamp() * 1000)}", 
            user_id=user_id,
            action=action,
            entite=entite,
            entite_id=str(entite_id) if entite_id else "N/A",
            details=details,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error logging action: {e}")
        import traceback
        traceback.print_exc()
