"""
auto_resolver.py — WARCAST Autonomous Dispatch Resolver

Tracks every minted dispatch in memory and automatically resolves it
on-chain once the 20-minute prediction window expires.

Resolution logic (checks events that occurred AFTER dispatch minute):
  GOAL_SCORED     → confirm if another goal happens in the window
  RED_CARD        → confirm if any goal follows the dismissal
  ATTACKING_WAVE  → confirm if a goal happens in the window
  TACTICAL_SHIFT  → confirm if a goal OR 2+ more subs happen
  (any other)     → confirm if any goal happens

Called by main.py on every loop tick — no manual terminal work needed.
"""

from utils.football_api import get_match_events

_pending: list[dict] = []


def register(
    dispatch_id: int,
    fixture_id: int,
    home_team: str,
    away_team: str,
    minute: int,
    event_type: str,
    tier_num: int,
    x_post_id: str | None = None,
) -> None:
    """Call immediately after a successful on-chain mint."""
    _pending.append({
        "dispatch_id": dispatch_id,
        "fixture_id":  fixture_id,
        "home_team":   home_team,
        "away_team":   away_team,
        "minute":      minute,
        "event_type":  event_type,
        "tier_num":    tier_num,
        "window_end":  minute + 20,
        "x_post_id":   x_post_id,   # original tweet ID for reply threading
    })
    print(f"[AutoResolver] Tracking Dispatch #{dispatch_id} — resolves at match minute {minute + 20}")


def _should_confirm(event_type: str, dispatch_minute: int, events: list) -> bool:
    """
    Determine if the prediction came true by checking events that occurred
    strictly AFTER the minute the dispatch was generated.
    """
    later = [e for e in events if e.get("time", {}).get("elapsed", 0) > dispatch_minute]
    goals = [e for e in later if e.get("type") == "Goal"]
    subs  = [e for e in later if e.get("type") == "subst"]

    if event_type == "TACTICAL_SHIFT":
        return len(goals) > 0 or len(subs) >= 2

    # GOAL_SCORED, RED_CARD, ATTACKING_WAVE, anything else:
    # confirm if at least one goal happens in the window
    return len(goals) > 0


def check_and_resolve(live_matches: list) -> None:
    """
    Called once per main-loop tick with the already-fetched live match list.
    Resolves any dispatch whose 20-minute window has expired or whose match ended.
    """
    global _pending
    if not _pending:
        return

    # Build fixture_id → current elapsed minute from live data (no extra API call)
    current_minutes: dict[int, int] = {}
    for m in live_matches or []:
        fid    = m.get("fixture", {}).get("id")
        minute = m.get("fixture", {}).get("status", {}).get("elapsed", 0) or 0
        if fid:
            current_minutes[fid] = minute

    still_pending: list[dict] = []

    for entry in _pending:
        fid        = entry["fixture_id"]
        window_end = entry["window_end"]
        cur_min    = current_minutes.get(fid)  # None = match no longer live

        match_ended   = cur_min is None
        window_passed = cur_min is not None and cur_min >= window_end

        if not (match_ended or window_passed):
            still_pending.append(entry)
            continue

        # ── Window expired — resolve this dispatch ─────────────────────────
        dispatch_id = entry["dispatch_id"]
        reason = "match ended" if match_ended else f"window closed at minute {cur_min}"
        print(f"\n[AutoResolver] Dispatch #{dispatch_id} ready — {reason}")

        try:
            events    = get_match_events(fid) or []
            confirmed = _should_confirm(entry["event_type"], entry["minute"], events)
            label     = "CONFIRMED" if confirmed else "BURNED"
            print(f"[AutoResolver] Prediction → {label}")

            # Lazy imports so resolver.py startup prints don't clutter the boot log
            from resolver import resolve_dispatch, award_points_to_holders, TIER_POINTS  # noqa: PLC0415
            from supabase_logger import resolve_dispatch_log                              # noqa: PLC0415
            from x_poster import post_resolution_reply                                   # noqa: PLC0415

            tx_hash = resolve_dispatch(dispatch_id, confirmed)
            if not tx_hash:
                print(f"[AutoResolver] On-chain resolve failed for #{dispatch_id} — will retry next tick")
                still_pending.append(entry)
                continue

            if confirmed:
                points = TIER_POINTS.get(entry["tier_num"], 10)
                award_points_to_holders(dispatch_id, points)

            resolve_dispatch_log(dispatch_id, confirmed)

            # ── Reply to the original dispatch tweet ──────────────────────
            x_post_id = entry.get("x_post_id")
            if x_post_id:
                reply = post_resolution_reply(
                    original_tweet_id=x_post_id,
                    dispatch_id=dispatch_id,
                    confirmed=confirmed,
                    tier=entry.get("event_type", ""),
                    home_team=entry["home_team"],
                    away_team=entry["away_team"],
                )
                if reply.get("posted"):
                    print(f"[AutoResolver] X reply posted → {reply.get('post_id')}")
                else:
                    print(f"[AutoResolver] X reply skipped: {reply.get('reason')}")

            print(f"[AutoResolver] Dispatch #{dispatch_id} fully resolved on-chain.")

        except Exception as exc:
            print(f"[AutoResolver] Error on Dispatch #{dispatch_id}: {exc}")
            still_pending.append(entry)

    _pending = still_pending
