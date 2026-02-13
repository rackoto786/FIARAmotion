#!/usr/bin/env python3
"""Génère un fichier Excel de test pour /api/fuel/import.
- Récupère la première immatriculation disponible depuis /api/vehicles
- Écrit un xlsx minimal avec colonnes attendues
- Emplacement de sortie: ./test_fuel_import.xlsx

Usage: python tools/make_fuel_import_test.py
"""
import sys
import requests
import pandas as pd
from datetime import date

BASE = 'http://127.0.0.1:5000/api'
OUT = 'test_fuel_import.xlsx'

try:
    r = requests.get(f'{BASE}/vehicles', timeout=5)
    r.raise_for_status()
    vehicles = r.json()
    if not vehicles:
        print('ERROR: no vehicles returned from API', file=sys.stderr)
        sys.exit(2)
    v = vehicles[0]
    imm = v.get('immatriculation') or v.get('immatriculation', '')
    km = v.get('kilometrage_actuel') or 1000

    # Minimal row with commonly-mapped columns used by importer
    row = {
        'immatriculation': imm,
        'date': date.today().isoformat(),
        'actuel_km': int(km) + 10,
        'precedent_km': int(km),
        'go_pu_ar_l': 4500,
        'total_acheter': 4500 * 10,
        'numero_ticket': 'TEST-001'
    }

    df = pd.DataFrame([row])
    df.to_excel(OUT, index=False)
    print(f'WROTE:{OUT}')
    sys.exit(0)

except requests.RequestException as e:
    print('ERROR: cannot reach API to fetch vehicles:', e, file=sys.stderr)
    sys.exit(3)
except Exception as e:
    print('ERROR:', e, file=sys.stderr)
    sys.exit(4)
