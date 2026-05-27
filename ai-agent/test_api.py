import requests
from utils.config import FOOTBALL_API_KEY, FOOTBALL_API_BASE

headers = {"x-apisports-key": FOOTBALL_API_KEY}

# Test the connection
response = requests.get(f"{FOOTBALL_API_BASE}/status", headers=headers)
data = response.json()

print("API Status:", data.get("response", {}).get("account", {}).get("firstname", "Unknown"))
print("Requests used today:", data.get("response", {}).get("requests", {}).get("current", 0))
print("Requests limit:", data.get("response", {}).get("requests", {}).get("limit_day", 0))