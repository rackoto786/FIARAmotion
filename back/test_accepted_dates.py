"""
Check accepted plannings and their date ranges
"""

from app import create_app, db
from app.models import Planning
from datetime import datetime

app = create_app()
with app.app_context():
    print("=" * 80)
    print("ACCEPTED PLANNINGS - DATE ANALYSIS")
    print("=" *80)
    
    accepted = Planning.query.filter_by(status='acceptee').all()
    print(f"\nTotal ACCEPTED plannings: {len(accepted)}\n")
    
    for i, p in enumerate(accepted, 1):
        date_debut_iso = p.date_debut.isoformat()
        date_fin_iso = p.date_fin.isoformat()
        
        date_start = date_debut_iso.split('T')[0]
        date_end = date_fin_iso.split('T')[0]
        
        print(f"{i}. Planning ID: {p.id}")
        print(f"   Vehicle: {p.vehicule_id}")
        print(f"   Type: {p.type}")
        print(f"   Description: {p.description}")
        print(f"   Start Date: {date_start} (full: {date_debut_iso})")
        print(f"   End Date: {date_end} (full: {date_fin_iso})")
        
        # Check which dates this planning would be visible on
        from datetime import datetime, timedelta
        start = datetime.fromisoformat(date_debut_iso.replace('Z', '+00:00'))
        end = datetime.fromisoformat(date_fin_iso.replace('Z', '+00:00'))
        
        print(f"   Visible from {date_start} to {date_end}")
        
        # Check specific dates
        test_dates = ['2026-02-07', '2026-02-08', '2026-02-11', '2026-02-12']
        visible_on = []
        for test_date in test_dates:
            if test_date >= date_start and test_date <= date_end:
                visible_on.append(test_date)
        
        if visible_on:
            print(f"   ✅ Visible on: {', '.join(visible_on)}")
        else:
            print(f"   ❌ Not visible on any of the test dates: {', '.join(test_dates)}")
        print()
    
    # Show what date range to check
    if accepted:
        all_starts = [p.date_debut for p in accepted]
        all_ends = [p.date_fin for p in accepted]
        earliest = min(all_starts).strftime('%Y-%m-%d')
        latest = max(all_ends).strftime('%Y-%m-%d')
        print(f"\n📅 To see accepted plannings, check dates between: {earliest} and {latest}")
