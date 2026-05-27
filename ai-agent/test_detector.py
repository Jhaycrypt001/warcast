from tactical_detector import analyze_match
from dispatch_generator import generate_dispatch

# Real recent fixture ID from API-Football (a recent match)
# We'll use this to confirm the pipeline works end to end
TEST_FIXTURE_ID = 1273432  # Recent match — replace if needed

event = analyze_match(TEST_FIXTURE_ID)

if event:
    dispatch = generate_dispatch(
        dispatch_num=1,
        home_team="Team A",
        away_team="Team B",
        minute=65,
        tactical_event=event["type"].replace("_", " ").title(),
        event_details=event["detail"]
    )
    print("\n" + "=" * 60)
    print(dispatch)
    print("=" * 60)
else:
    print("No events detected — try a different fixture ID")