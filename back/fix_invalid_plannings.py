"""
Script pour identifier et corriger les plannings invalides
(où date_fin < date_debut)
"""

from app import create_app, db
from app.models import Planning

app = create_app()
with app.app_context():
    print("=" * 80)
    print("IDENTIFICATION DES PLANNINGS INVALIDES")
    print("=" * 80)
    
    # Trouver tous les plannings
    all_plannings = Planning.query.all()
    invalid = [p for p in all_plannings if p.date_fin < p.date_debut]
    
    print(f"\nTotal plannings: {len(all_plannings)}")
    print(f"Plannings invalides (date_fin < date_debut): {len(invalid)}\n")
    
    if not invalid:
        print("✅ Aucun planning invalide trouvé !")
    else:
        print("❌ Plannings invalides détectés :\n")
        
        for i, p in enumerate(invalid, 1):
            print(f"{i}. Planning ID: {p.id}")
            print(f"   Type: {p.type}")
            print(f"   Statut: {p.status}")
            print(f"   Véhicule: {p.vehicule_id}")
            print(f"   Début: {p.date_debut}")
            print(f"   Fin: {p.date_fin}")
            print(f"   ⚠️ Problème: La date de fin est AVANT la date de début!")
            print()
        
        print("=" * 80)
        print("OPTIONS DE CORRECTION")
        print("=" * 80)
        print("\nPour corriger ces plannings, vous pouvez :")
        print("1. Les supprimer dans pgAdmin")
        print("2. Corriger manuellement les dates dans pgAdmin")
        print("3. Décommenter le code ci-dessous pour les supprimer automatiquement")
        print("\n⚠️ ATTENTION : La suppression est définitive !")
        
        # DÉCOMMENTEZ CETTE SECTION POUR SUPPRIMER AUTOMATIQUEMENT
        # print("\n🗑️ Suppression des plannings invalides...")
        # for p in invalid:
        #     db.session.delete(p)
        # db.session.commit()
        # print(f"✅ {len(invalid)} plannings invalides supprimés !")
