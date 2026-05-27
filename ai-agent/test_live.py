from utils.football_api import get_live_matches

matches = get_live_matches()

if matches:
    for m in matches:
        fixture_id = m["fixture"]["id"]
        home = m["teams"]["home"]["name"]
        away = m["teams"]["away"]["name"]
        minute = m["fixture"]["status"]["elapsed"]
        print(f"LIVE: {home} vs {away} | Minute: {minute} | ID: {fixture_id}")
else:
    print("No live matches right now — this is normal outside match days.")
    print("We'll use a test fixture ID for Day 2 testing.")