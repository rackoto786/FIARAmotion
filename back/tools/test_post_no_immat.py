import requests, pandas as pd
from io import BytesIO
BASE='http://127.0.0.1:5000/api'
# Create Excel with the same columns seen in logs but WITHOUT immatriculation
cols = ['Date','Heure','N° Ticket','Précédent KM','Actuel KM','KM parcouru','GO\nP.U AR/L','Total Acheter \n(Montant total de l\'achat)']
row = ['2026-02-02','12:00','TICKET-01',1000,1010,10,4500,45000]
df = pd.DataFrame([row], columns=cols)
buf = BytesIO()
df.to_excel(buf, index=False)
buf.seek(0)
# login
lr = requests.post(f'{BASE}/auth/login', json={'email':'admin01','password':'password123'})
print('LOGIN', lr.status_code, lr.text)
token = lr.json().get('token')
headers = {'Authorization': f'Bearer {token}'}
files = {'file': ('no_immat.xlsx', buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
resp = requests.post(f'{BASE}/fuel/import', headers=headers, files=files)
print('IMPORT STATUS', resp.status_code)
try:
    print('BODY:', resp.json())
except Exception:
    print('TEXT:', resp.text)
