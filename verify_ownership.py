from back.app import db, create_app
from back.app.models import User, Mission
from flask import g
import uuid
from datetime import date

app = create_app()

with app.app_context():
    # 1. Create two users
    u1 = User.query.filter_by(email="u1@test.com").first()
    if not u1:
        u1 = User(id="u1", email="u1@test.com", name="User 1", role="driver", status="active")
        db.session.add(u1)
    
    u2 = User.query.filter_by(email="u2@test.com").first()
    if not u2:
        u2 = User(id="u2", email="u2@test.com", name="User 2", role="driver", status="active")
        db.session.add(u2)
    
    db.session.commit()

    # 2. Create mission owned by u1
    m1_id = "test_m1_" + uuid.uuid4().hex[:4]
    m1 = Mission(
        id=m1_id,
        reference="REF-U1",
        vehicule_id="any", # Mock or real
        conducteur_id="any",
        date_debut=date.today(),
        lieu_depart="Start",
        lieu_destination="End",
        created_by_id=u1.id,
        state="nouveau"
    )
    # Ensure vehicle/driver exist if FK is enforced (Parc_auto DB has them)
    # Let's just try to add it and see.
    try:
        db.session.add(m1)
        db.session.commit()
        print(f"Created mission {m1_id} owned by {u1.id}")
    except Exception as e:
        print(f"Error creating mission (likely FK): {e}")
        # If FK fails, we can still test the logic on the existing missions
        db.session.rollback()

    # 3. Test logic directly (simulation of route logic)
    def check_access(user, mission):
        # Admin/Tech bypass or Owner
        if user.role in ['admin', 'technician'] or mission.created_by_id == user.id:
            return True
        return False

    print(f"Access for owner (u1) to m1: {check_access(u1, m1)}")
    print(f"Access for other (u2) to m1: {check_access(u2, m1)}")
    
    admin = User(role="admin")
    print(f"Access for admin to m1: {check_access(admin, m1)}")

    # Cleanup
    db.session.delete(m1)
    db.session.commit()
