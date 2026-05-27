"""
check_live.py — Quick diagnostic: print every live match the API sees right now.
Run: python check_live.py
"""
from dotenv import load_dotenv
import os, datetime

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from utils.football_api import get_live_matches

print(f"\n[{datetime.datetime.now().strftime('%H:%M:%S')}] Checking live matches on API-Football...\n")

matches = get_live_matches()

if not matches:
    print("  No live matches right now.")
else:
    print(f"  {len(matches)} live match(es) found:\n")
    for m in matches:
        home    = m.get('teams', {}).get('home', {}).get('name', '?')
        away    = m.get('teams', {}).get('away', {}).get('name', '?')
        minute  = m.get('fixture', {}).get('status', {}).get('elapsed', 0) or 0
        status  = m.get('fixture', {}).get('status', {}).get('short', '?')
        g_home  = m.get('goals', {}).get('home', 0) or 0
        g_away  = m.get('goals', {}).get('away', 0) or 0
        league  = m.get('league', {}).get('name', '?')
        country = m.get('league', {}).get('country', '?')
        fid     = m.get('fixture', {}).get('id', '?')
        print(f"  [{status} {minute}'] {home} {g_home}-{g_away} {away}")
        print(f"          League: {league} ({country}) | Fixture ID: {fid}\n")

print("Done.")
