"""
Test script to check planning status values and debug day view filtering
"""

from app import create_app, db
from app.models import Planning
from datetime import datetime

app = create_app()
with app.app_context():
    print("=" * 60)
    print("PLANNING ITEMS IN DATABASE")
    print("=" * 60)
    
    plannings = Planning.query.all()
    print(f"\nTotal plannings: {len(plannings)}")
    
    accepted = [p for p in plannings if p.status and 'accepte' in p.status.lower()]
    print(f"Plannings with 'accepte' in status: {len(accepted)}\n")
    
    for p in plannings[:10]:  # Show first 10
        print(f"\nID: {p.id}")
        print(f"  Vehicle ID: {p.vehicule_id}")
        print(f"  Status: [{repr(p.status)}] (length: {len(p.status) if p.status else 0})")
        print(f"  Status lowercase: [{repr(p.status.lower()) if p.status else None}]")
        print(f"  Date Debut: {p.date_debut}")
        print(f"  Date Fin: {p.date_fin}")
        print(f"  Type: {p.type}")
        
        # Test the filter conditions
        print(f"\n  Filter Tests:")
        print(f"    p.status?.toLowerCase() === 'acceptee': {p.status.lower() == 'acceptee' if p.status else False}")
        print(f"    Status exactly equals 'acceptee': {p.status == 'acceptee'}")
        print(f"    Status exactly equals 'acceptée': {p.status == 'acceptée'}")
        
        # Date formatting test
        date_debut_str = p.date_debut.isoformat()
        date_fin_str = p.date_fin.isoformat()
        item_start_date = date_debut_str.split('T')[0]
        item_end_date = date_fin_str.split('T')[0]
        print(f"    Date Debut ISO: {date_debut_str}")
        print(f"    Date Debut (split): {item_start_date}")
        print(f"    Date Fin ISO: {date_fin_str}")
        print(f"    Date Fin (split): {item_end_date}")
        
        # Test with today's date
        today = datetime.now().strftime('%Y-%m-%d')
        is_visible_today = today >= item_start_date and today <= item_end_date
        print(f"    Visible today ({today})?: {is_visible_today}")
    
    print("\n" + "=" * 60)
    print("STATUS VALUE ANALYSIS")
    print("=" * 60)
    
    status_counts = {}
    for p in plannings:
        status = repr(p.status) if p.status else "None"
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nUnique status values (with repr):")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count} items")
