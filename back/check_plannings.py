"""
Check what plannings exist and for which dates
"""

from app import create_app, db
from app.models import Planning
from datetime import datetime, timedelta

app = create_app()
with app.app_context():
    print("=" * 80)
    print("CURRENT PLANNING STATUS - ALL PLANNINGS")
    print("=" * 80)
    
    all_plannings = Planning.query.all()
    print(f"\nTotal plannings in database: {len(all_plannings)}\n")
    
    # Group by status
    by_status = {}
    for p in all_plannings:
        status = p.status or 'None'
        if status not in by_status:
            by_status[status] = []
        by_status[status].append(p)
    
    print("Plannings by status:")
    for status, items in sorted(by_status.items()):
        print(f"  {status}: {len(items)} items")
    
    print("\n" + "=" * 80)
    print("ACCEPTED PLANNINGS DETAILS")
    print("=" * 80)
    
    accepted = [p for p in all_plannings if p.status == 'acceptee']
    
    if not accepted:
        print("\n⚠️  NO ACCEPTED PLANNINGS FOUND IN DATABASE!")
        print("This is why nothing appears in day view.")
    else:
        print(f"\nFound {len(accepted)} accepted planning(s):\n")
        
        for i, p in enumerate(accepted, 1):
            start_date = p.date_debut.strftime('%Y-%m-%d')
            end_date = p.date_fin.strftime('%Y-%m-%d')
            start_time = p.date_debut.strftime('%H:%M')
            end_time = p.date_fin.strftime('%H:%M')
            
            print(f"{i}. ID: {p.id}")
            print(f"   Vehicle: {p.vehicule_id}")
            print(f"   Type: {p.type}")
            print(f"   Description: {p.description}")
            print(f"   Start: {start_date} at {start_time}")
            print(f"   End: {end_date} at {end_time}")
            print(f"   Created by: {p.created_by_id}")
            print()
        
        # Show which dates have accepted plannings
        print("=" * 80)
        print("DATES WITH ACCEPTED PLANNINGS")
        print("=" * 80)
        
        dates_set = set()
        for p in accepted:
            current = p.date_debut.date()
            end = p.date_fin.date()
            while current <= end:
                dates_set.add(current)
                current += timedelta(days=1)
        
        dates_sorted = sorted(dates_set)
        print(f"\nAccepted plannings are visible on these dates:")
        for date in dates_sorted:
            print(f"  📅 {date.strftime('%Y-%m-%d')} ({date.strftime('%A')})")
        
        # Today's date
        today = datetime.now().date()
        print(f"\n📍 Today is: {today.strftime('%Y-%m-%d')}")
        
        if today in dates_set:
            print("   ✅ There ARE accepted plannings for today!")
        else:
            print("   ❌ There are NO accepted plannings for today.")
            print(f"   💡 To see accepted plannings, select one of the dates above.")
