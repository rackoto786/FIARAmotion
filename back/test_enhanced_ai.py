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
        print(f"Model: {service.model_name}")
        
        # Test 1: Ask about a vehicle (should now trigger richer info)
        print("\nTest 1: Asking about a vehicle...")
        response = service.chat("Donne-moi des infos sur le véhicule AA-123-BB", "admin")
        print(f"Response: {response['response'][:200]}...")
        
        # Test 2: Ask about a driver (new function)
        print("\nTest 2: Asking about a driver...")
        response_driver = service.chat("Où est le conducteur Jean ?", "admin")
        print(f"Response: {response_driver['response'][:200]}...")
        
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
