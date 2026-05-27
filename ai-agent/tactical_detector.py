import time
from utils.football_api import get_match_events

# ── WC2026 qualified nations ───────────────────────────────────────────────
WC2026_NATIONS = {
    "Argentina", "Australia", "Algeria", "Austria", "Belgium",
    "Bosnia and Herzegovina", "Brazil", "Cabo Verde", "Canada", "Colombia",
    "Congo DR", "Cote d'Ivoire", "Croatia", "Czechia", "Curacao", "Ecuador",
    "Egypt", "England", "France", "Germany", "Ghana", "Haiti", "IR Iran",
    "Iraq", "Japan", "Jordan", "Korea Republic", "Mexico", "Morocco",
    "Netherlands", "New Zealand", "Norway", "Panama", "Paraguay", "Portugal",
    "Qatar", "Saudi Arabia", "Scotland", "Senegal", "South Africa", "Spain",
    "Sweden", "Switzerland", "Tunisia", "Turkiye", "Uruguay", "USA", "Uzbekistan",
}

# ── In-memory state (no extra API calls needed) ────────────────────────────
_last_scores: dict[int, tuple[int, int]] = {}        # fixture_id → (home, away)
_last_events_call: dict[int, float]      = {}        # fixture_id → unix timestamp

EVENTS_COOLDOWN_SECS = 600  # only hit events endpoint once per 10 min per fixture


def is_wc2026_match(home_team: str, away_team: str) -> bool:
    return home_team in WC2026_NATIONS or away_team in WC2026_NATIONS


def analyze_match(fixture_id: int, match: dict | None = None) -> dict | None:
    """
    Detect the highest-priority tactical event for a live fixture.

    Goal detection uses the score already in the live-match payload (zero
    extra API calls).  The events endpoint is only called for red cards /
    substitution waves, and at most once every 10 minutes per fixture.
    """

    # ── Priority 1: Goal from score change (FREE — no extra API call) ──────
    if match is not None:
        home_goals = match.get("goals", {}).get("home") or 0
        away_goals = match.get("goals", {}).get("away") or 0
        home_team  = match.get("teams", {}).get("home", {}).get("name", "Home")
        away_team  = match.get("teams", {}).get("away", {}).get("name", "Away")
        minute     = match.get("fixture", {}).get("status", {}).get("elapsed", 0) or 0

        if fixture_id in _last_scores:
            prev_home, prev_away = _last_scores[fixture_id]

            if home_goals > prev_home:
                _last_scores[fixture_id] = (home_goals, away_goals)
                return {
                    "type":   "GOAL_SCORED",
                    "team":   home_team,
                    "detail": f"GOAL — {home_team} at {minute}' (score {home_goals}-{away_goals})",
                }

            if away_goals > prev_away:
                _last_scores[fixture_id] = (home_goals, away_goals)
                return {
                    "type":   "GOAL_SCORED",
                    "team":   away_team,
                    "detail": f"GOAL — {away_team} at {minute}' (score {home_goals}-{away_goals})",
                }

        # First time seeing this fixture — record baseline score, no event yet
        _last_scores[fixture_id] = (home_goals, away_goals)

    # ── Priority 2 & 3: Red cards / substitution waves (events endpoint) ───
    # Rate-limited: at most one call per fixture per EVENTS_COOLDOWN_SECS
    now = time.time()
    last_call = _last_events_call.get(fixture_id, 0)
    if now - last_call < EVENTS_COOLDOWN_SECS:
        return None  # cooldown not elapsed — skip events API call

    _last_events_call[fixture_id] = now
    events = get_match_events(fixture_id)

    if not events:
        return None

    # Red card
    for event in events:
        if event.get("type") == "Card" and event.get("detail") == "Red Card":
            player = event.get("player", {}).get("name", "Unknown")
            team   = event.get("team",   {}).get("name", "Unknown")
            minute = event.get("time",   {}).get("elapsed", 0)
            return {
                "type":   "RED_CARD",
                "team":   team,
                "detail": (
                    f"RED CARD — {player} ({team}) dismissed at {minute}' — "
                    "numerical advantage shifts tactical picture"
                ),
            }

    # Substitution wave (3+ subs = tactical reset signal)
    subs = [e for e in events if e.get("type") == "subst"]
    if len(subs) >= 3:
        last  = subs[-1]
        team  = last.get("team",   {}).get("name", "Unknown")
        p_in  = last.get("assist", {}).get("name", "Unknown")
        p_out = last.get("player", {}).get("name", "Unknown")
        minute = last.get("time",  {}).get("elapsed", 0)
        return {
            "type":   "TACTICAL_SHIFT",
            "team":   team,
            "detail": (
                f"TACTICAL SHIFT — {team} at {minute}' | "
                f"{p_in} replaces {p_out} ({len(subs)} total rotations)"
            ),
        }

    return None
