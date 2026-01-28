import sys
import os

# Ensure we can import from app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))

from app import create_app

app = create_app()

print("Registered Routes:")
for rule in app.url_map.iter_rules():
    if "maintenance" in str(rule):
        print(f"{rule} {rule.methods}")
