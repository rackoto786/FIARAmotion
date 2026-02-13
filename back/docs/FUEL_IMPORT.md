Guide d'import — endpoint: POST /api/fuel/import

But: le fichier Excel doit contenir une colonne permettant d'identifier le véhicule — **`immatriculation`** (ou équivalent: `véhicule`, `immat`, `plaque`).

Colonnes recommandées (au minimum):
- immatriculation (obligatoire)
- date (YYYY-MM-DD)
- actuel_km
- precedent_km
- go_pu_ar_l (prix unitaire)
- total_acheter (montant)
- numero_ticket
- station (optionnel)

Si l'import retourne `Aucune ligne importée` sans détails, vérifiez que votre feuille contient la colonne `immatriculation`.

Exemple rapide:
```
immatriculation,date,actuel_km,precedent_km,go_pu_ar_l,total_acheter,numero_ticket,station
EX-123-ABC,2026-02-02,1010,1000,4500,45000,TEST-001,Karenjy (Ankidona)
```
