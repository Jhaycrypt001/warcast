import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FOOTBALL_API_KEY")
BASE_URL = "https://v3.football.api-sports.io"

HEADERS = {
    "x-apisports-key": API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

def get_live_matches():
    """
    Fetches all currently live matches from the API.
    """
    try:
        url = f"{BASE_URL}/fixtures"
        params = {"live": "all"}
        
        response = requests.get(url, headers=HEADERS, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('response', [])
        else:
            print(f"[-] API Error: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"[!] Error fetching live matches: {e}")
        return []

def get_match_events(fixture_id):
    """
    Fetches match events (goals, substitutions, etc.)
    """
    try:
        url = f"{BASE_URL}/fixtures/events"
        params = {"fixture": fixture_id}
        response = requests.get(url, headers=HEADERS, params=params)
        if response.status_code == 200:
            return response.json().get('response', [])
        return []
    except Exception as e:
        print(f"[!] Error fetching events: {e}")
        return []

def get_match_stats(fixture_id):
    try:
        url = f"{BASE_URL}/fixtures/statistics"
        params = {"fixture": fixture_id}
        response = requests.get(url, headers=HEADERS, params=params)
        
        # DEBUG: Print the status code so we know if the API is blocking us
        if response.status_code != 200:
            print(f"   [!] API Error {response.status_code} for stats on {fixture_id}")
            return None
            
        data = response.json().get('response', [])
        return data if data else None # Return None if empty
    except Exception as e:
        print(f"[!] Error fetching stats: {e}")
        return None

def get_match_lineups(fixture_id):
    """
    Fetches match lineups and formations.
    """
    try:
        url = f"{BASE_URL}/fixtures/lineups"
        params = {"fixture": fixture_id}
        response = requests.get(url, headers=HEADERS, params=params)
        if response.status_code == 200:
            return response.json().get('response', [])
        return []
    except Exception as e:
        print(f"[!] Error fetching lineups: {e}")
        return []