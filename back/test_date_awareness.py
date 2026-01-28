import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.getcwd())
load_dotenv()

from app import create_app
from app.utils.ai_service import get_ai_service

app = create_app()

with app.app_context():
    try:
        print("Initializing AI Service...")
        service = get_ai_service()
        
        # Test 1: Ask for the date
        print("\nTest 1: Asking 'Quelle est la date d'aujourd'hui ?'...")
        response = service.chat("Quelle est la date d'aujourd'hui exactement ?", "admin")
        print(f"Response: {response['response']}")
        
        if "2026" in response['response']:
             print("✅ Test PASSED: AI knows it's 2026")
        else:
             print("❌ FAILED: AI thinks it's another year")

    except Exception as e:
        print(f"\n❌ FAILED: {e}")
