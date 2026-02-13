"""
Migration script: Add fuel_monthly_budgets table

Run this to create the fuel_monthly_budgets table in the database.
"""

from app import create_app, db
from app.models import FuelMonthlyBudget

app = create_app()

with app.app_context():
    print("Creating fuel_monthly_budgets table...")
    
    # Create the table
    db.create_all()
    
    print("✅ Table fuel_monthly_budgets created successfully!")
    print("\nYou can now:")
    print("1. Set monthly budgets for vehicles")
    print("2. Track forecast vs actual consumption")
    print("3. Receive alerts for budget overruns")
