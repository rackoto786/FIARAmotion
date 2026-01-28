import requests
try:
    r = requests.get('http://127.0.0.1:5000/api/users')
    if r.status_code == 200:
        data = r.json()
        if data:
            print("First user keys:", data[0].keys())
        else:
            print("No users found.")
    else:
        print("Error:", r.status_code)
except Exception as e:
    print("Exception:", e)
