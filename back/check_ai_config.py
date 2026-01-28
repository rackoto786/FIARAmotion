import os
from app.utils.ai_service import AIAssistantService
from dotenv import load_dotenv

# Try to load .env manually if it exists
load_dotenv()

print("--- AI Configuration Check ---")
api_key = os.getenv('GEMINI_API_KEY')
if api_key:
    print(f"GEMINI_API_KEY found: {api_key[:5]}...{api_key[-5:]}")
else:
    print("GEMINI_API_KEY NOT found in environment.")

print("\nAttempting to initialize AIAssistantService...")
try:
    service = AIAssistantService()
    print("SUCCESS: AIAssistantService initialized correctly.")
    
    # Verify Chat Creation
    print("Attempting to create chat session...")
    try:
        # Mock role to get context
        sys_ctx = service.get_system_context('admin')
        from google.genai import types
        from app.utils.ai_functions import FUNCTION_DECLARATIONS
        
        chat = service.client.chats.create(
            model=service.model_name,
            config=types.GenerateContentConfig(
                tools=[{'function_declarations': FUNCTION_DECLARATIONS}],
                system_instruction=sys_ctx
            )
        )
        print("SUCCESS: Chat session created.")
    except Exception as e:
        print(f"FAILURE: Could not create chat session. Error: {e}")

except Exception as e:
    print(f"FAILURE: Could not initialize AIAssistantService.\nError: {e}")
