"""
AI Service for the Fleet Management Assistant.
Integrates with OpenAI-compatible APIs (like Groq) for natural language processing.
"""

import os
import json
import logging
from datetime import date
from typing import List, Dict, Any, Optional
import time
import functools
from flask import current_app
from openai import OpenAI, APIError, RateLimitError
from .ai_functions import AVAILABLE_FUNCTIONS, OPENAI_TOOLS


class AIAssistantService:
    """Service for AI-powered assistant using OpenAI-compatible API (Groq/OpenAI)."""
    
    def __init__(self):
        """Initialize the AI service."""
        # Prefer GROQ_API_KEY, fallback to OPENAI_API_KEY
        self.api_key = os.getenv('GROQ_API_KEY') or os.getenv('OPENAI_API_KEY')
        self.base_url = os.getenv('AI_API_BASE_URL', 'https://api.groq.com/openai/v1') # Default to Groq
        
        if not self.api_key:
            # Fallback for dev/debug if needed, or raise error
             logging.warning("No AI API Key found (GROQ_API_KEY or OPENAI_API_KEY)")
             # We allow init without key, but chat will fail.
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url
        )
        
        # Use Llama 3.3 70B for Groq (current stable version)
        default_model = 'llama-3.3-70b-versatile' if 'groq' in self.base_url else 'gpt-3.5-turbo'
        self.model_name = os.getenv('AI_MODEL_NAME', default_model)
        
    def get_system_context(self, user_role: str) -> str:
        """
        Get system context based on user role.
        """
        today_str = date.today().strftime('%A %d %B %Y')
        base_context = f"""Tu es un assistant IA pour FIARAmotion, une application de gestion de parc roulant (véhicules).

Tu as accès aux données suivantes via des fonctions:
- Véhicules (disponibilité, informations détaillées, recherche)
- Missions (planification, suivi)
- Maintenance (demandes, statuts)
- Planning (réservations)
- Carburant (consommation, statistiques)
- Échéances (documents, alertes)

INSTRUCTIONS CRITIQUES DE RAISONNEMENT:
1. **Analyse Complète**: Avant de répondre, vérifie si ta réponse est complète. (Ex: Si on demande un véhicule, donne aussi son conducteur actuel et sa prochaine maintenance).
2. **Utilisation Proactive des Outils**:
    - Si tu parles d'un véhicule -> Utilise `get_vehicle_info`
    - Si tu parles d'un conducteur -> Utilise `get_driver_info`
    - Si tu parles de maintenance -> Vérifie `get_maintenance_status` ET `get_compliance_alerts`
3. **Précision**: Donne des chiffres exacts, des dates précises et des noms complets. Ne devine jamais.
4. **Style**: Réponds comme un expert en logistique : professionnel, direct et factuel.

DATES:
DATES:
DATES:
- Aujourd'hui: {today_str} (Date du système)
- Pour les dates futures, calcule à partir d'aujourd'hui
- Format de date: YYYY-MM-DD pour les fonctions, DD/MM/YYYY pour l'affichage

NAVIGATION:
Tu peux suggérer à l'utilisateur de naviguer vers:
- /dashboard - Tableau de bord
- /vehicles - Liste des véhicules
- /maintenance - Gestion de la maintenance
- /missions - Gestion des missions
- /planning - Planning des réservations
- /fuel - Gestion du carburant
- /compliance - Échéances des documents
- /reports - Rapports et statistiques
"""
        
        role_contexts = {
            'admin': "\nTu as accès complet à toutes les données et fonctionnalités.",
            'technician': "\nTu as accès aux données de maintenance, véhicules et missions.",
            'driver': "\nTu as accès aux données de missions et carburant.",
            'direction': "\nTu as accès aux rapports et statistiques globales.",
            'collaborator': "\nTu as accès limité aux données qui te concernent."
        }
        
        return base_context + role_contexts.get(user_role, "")
    
    def chat(self, message: str, user_role: str, conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Process a chat message and return AI response.
        """
        if not self.api_key:
             return {
                "success": False,
                "response": "La clé API (Groq/OpenAI) n'est pas configurée.",
                "error": "API Key missing"
            }

        try:
            messages = [
                {"role": "system", "content": self.get_system_context(user_role)}
            ]
            
            if conversation_history:
                # Add history (limit to last 10 messages)
                for msg in conversation_history[-10:]:
                    role = "assistant" if msg.get("role") == "assistant" else "user"
                    messages.append({"role": role, "content": msg.get("content", "")})
            
            messages.append({"role": "user", "content": message})
            
            # First API Call
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                tools=OPENAI_TOOLS,
                tool_choice="auto",
                temperature=0.7,
            )
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls
            
            # Helper logic to handle tool calls mechanism
            if tool_calls:
                # Extend conversation with assistant's thought/tool call
                messages.append(response_message)
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    print(f"🤖 AI calling function: {function_name} with args: {function_args}")
                    
                    if function_name in AVAILABLE_FUNCTIONS:
                        try:
                            function_result = AVAILABLE_FUNCTIONS[function_name](**function_args)
                            # Serialize result to JSON string
                            content = json.dumps(function_result, default=str)
                        except Exception as exec_err:
                            content = json.dumps({"error": str(exec_err)})
                    else:
                        content = json.dumps({"error": f"Function {function_name} not found"})
                        
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": content,
                    })
                
                # Second API call to get final response
                second_response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages
                )
                final_content = second_response.choices[0].message.content
            else:
                final_content = response_message.content

            return {
                "success": True,
                "response": final_content,
                "role": "assistant"
            }
            
        except RateLimitError:
            print("❌ AI Rate Limit Exceeded")
            return {
                "success": False,
                "response": "Le service est temporairement surchargé (limite de quota). Veuillez réessayer dans un instant.",
                "error": "Rate limit exceeded"
            }
            
        except Exception as e:
            print(f"❌ AI Service Error: {str(e)}")
            return {
                "success": False,
                "response": "Désolé, je rencontre des difficultés techniques.",
                "error": str(e)
            }
    
    def get_suggestions(self, user_role: str) -> List[str]:
        """Get suggested questions based on user role."""
        common_suggestions = [
            "Quels véhicules sont disponibles aujourd'hui?",
            "Y a-t-il de nouvelles demandes?",
            "Montre-moi les alertes d'échéances",
        ]
        
        role_suggestions = {
            'admin': [
                "Quel est le statut des maintenances?",
                "Combien avons-nous dépensé en carburant ce mois?",
                "Quels documents expirent bientôt?",
            ],
            'technician': [
                "Quelles sont les maintenances en attente?",
                "Quels véhicules nécessitent une intervention?",
            ],
            'driver': [
                "Quelles sont mes missions cette semaine?",
                "Quel est mon véhicule assigné?",
            ]
        }
        
        return common_suggestions + role_suggestions.get(user_role, [])


# Singleton instance
_ai_service = None

def get_ai_service() -> AIAssistantService:
    """Get or create AI service instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIAssistantService()
    return _ai_service

