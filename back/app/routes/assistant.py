from flask import Blueprint, jsonify, request, g
from ..utils.auth_utils import token_required
from ..utils.ai_service import get_ai_service
from datetime import datetime

bp = Blueprint("assistant", __name__)


@bp.post("/chat")
@token_required
def chat():
    """
    Process a chat message from the user and return AI response.
    
    Request body:
    {
        "message": "User's question",
        "conversation_history": [...]  // Optional
    }
    
    Returns:
    {
        "success": true,
        "response": "AI response",
        "timestamp": "2024-01-22T10:30:00"
    }
    """
    data = request.get_json() or {}
    
    message = data.get('message', '').strip()
    if not message:
        return jsonify({"error": "Message requis"}), 400
    
    conversation_history = data.get('conversation_history', [])
    
    try:
        # Get AI service
        ai_service = get_ai_service()
        
        # Process message
        result = ai_service.chat(
            message=message,
            user_role=g.user.role,
            conversation_history=conversation_history
        )
        
        # Add timestamp
        result['timestamp'] = datetime.now().isoformat()
        
        return jsonify(result), 200
        
    except ValueError as e:
        # API key not configured
        return jsonify({
            "success": False,
            "error": "AI service not configured",
            "message": "La clé API Gemini n'est pas configurée. Veuillez contacter l'administrateur."
        }), 503
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Une erreur s'est produite lors du traitement de votre message."
        }), 500


@bp.get("/suggestions")
@token_required
def get_suggestions():
    """
    Get suggested questions based on user role.
    
    Returns:
    {
        "suggestions": ["Question 1", "Question 2", ...]
    }
    """
    try:
        ai_service = get_ai_service()
        suggestions = ai_service.get_suggestions(g.user.role)
        
        return jsonify({
            "success": True,
            "suggestions": suggestions
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@bp.get("/status")
@token_required
def get_status():
    """
    Check if AI service is available and configured.
    
    Returns:
    {
        "available": true/false,
        "message": "Status message"
    }
    """
    try:
        ai_service = get_ai_service()
        return jsonify({
            "available": True,
            "message": "AI assistant is ready"
        }), 200
        
    except ValueError:
        return jsonify({
            "available": False,
            "message": "AI service not configured. Please add GEMINI_API_KEY to environment."
        }), 200
        
    except Exception as e:
        return jsonify({
            "available": False,
            "message": f"Error: {str(e)}"
        }), 200
