import os
from utils.football_api import get_live_matches

print("--- STARTING TEST ---")

try:
    print("Attempting to fetch matches...")
    matches = get_live_matches()
    print(f"Fetch complete. Matches returned: {matches}")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")

print("--- TEST COMPLETE ---")