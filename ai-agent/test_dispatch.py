from dispatch_generator import generate_dispatch

# Test with fake match data — no live API needed yet
dispatch = generate_dispatch(
    dispatch_num=1,
    home_team="Brazil",
    away_team="Argentina",
    minute=67,
    tactical_event="Formation change detected",
    event_details="Brazil switched from 4-3-3 to 3-5-2. Right flank now overloaded with 3 players pushing forward. Argentina's left back isolated."
)

print("=" * 60)
print("WARCAST DISPATCH TEST")
print("=" * 60)
print(dispatch)
print("=" * 60)