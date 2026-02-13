#!/usr/bin/env python3
"""Create a test Excel and POST it to /api/fuel/import (prints detailed result).
Run from backend venv so it can import pandas/requests.
"""
import requests, sys, os
import pandas as pd
from datetime import date

BASE = 'http://127.0.0.1:5000/api'
OUT = 'test_fuel_import.xlsx'
LOGIN = {'email': 'admin01', 'password': 'password123'}

def fail(msg, code=1):
    print('ERROR:', msg)
    sys.exit(code)

# 1) get a vehicle
r = requests.get(f'{BASE}/vehicles', timeout=5)
if r.status_code != 200:
    fail(f"GET /vehicles returned {r.status_code}: {r.text}")
vehicles = r.json()
if not vehicles:
    fail('no vehicles available to use for test')
v = vehicles[0]
imm = v.get('immatriculation') or v.get('immatriculation', '')
km = v.get('kilometrage_actuel') or 1000

# 2) create excel
row = {
    'immatriculation': imm,
    'date': date.today().isoformat(),
    'actuel_km': int(km) + 10,
    'precedent_km': int(km),
    'go_pu_ar_l': 4500,
    'total_acheter': 4500 * 10,
    'numero_ticket': 'E2E-TEST-01'
}
df = pd.DataFrame([row])
df.to_excel(OUT, index=False)
print('WROTE', OUT)
print('Row:', row)

# 3) login -> get token
lr = requests.post(f'{BASE}/auth/login', json=LOGIN, timeout=5)
if lr.status_code != 200:
    fail(f"login failed {lr.status_code}: {lr.text}")
token = lr.json().get('token')
if not token:
    fail('no token in login response: ' + str(lr.json()))
print('GOT token (len):', len(token))

# 4) upload file
headers = {'Authorization': f'Bearer {token}'}
with open(OUT, 'rb') as fh:
    files = {'file': (OUT, fh, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
    ur = requests.post(f'{BASE}/fuel/import', headers=headers, files=files, timeout=20)

print('IMPORT STATUS:', ur.status_code)
try:
    print('IMPORT RESPONSE JSON:', ur.json())
except Exception:
    print('IMPORT RESPONSE TEXT:', ur.text)

# exit code
if ur.status_code != 200:
    sys.exit(5)
print('IMPORT succeeded')
