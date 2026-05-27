"""
supabase_logger.py — WARCAST Dispatch Logger

Logs every minted dispatch to Supabase and tracks AI prediction accuracy.

Setup:
    1. Go to supabase.com → New Project
    2. Go to Settings → API → copy Project URL and anon/public key
    3. Add to ai-agent/.env:
         SUPABASE_URL=https://xxxx.supabase.co
         SUPABASE_ANON_KEY=eyJhbGci...
    4. Run the SQL schema in Supabase SQL Editor (see supabase_schema.sql)
    5. Set SUPABASE_ENABLED=true in .env
"""

import os
import datetime
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL     = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_ENABLED = os.getenv("SUPABASE_ENABLED", "false").strip().lower() in {"1", "true", "yes"}

_client = None


def _get_client():
    """Lazy-load the Supabase client so the module is importable even without credentials."""
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_ENABLED:
        return None

    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("[Supabase] SUPABASE_URL or SUPABASE_ANON_KEY not set — logging disabled.")
        return None

    try:
        from supabase import create_client  # type: ignore
        _client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("[Supabase] Connected successfully.")
    except ImportError:
        print("[Supabase] 'supabase' package not installed. Run: pip install supabase")
    except Exception as exc:
        print(f"[Supabase] Connection failed: {exc}")

    return _client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def log_dispatch(
    *,
    dispatch_id: int,
    nft_token_id: int,
    tx_hash: str,
    fixture_id: int,
    home_team: str,
    away_team: str,
    minute: int,
    dispatch_text: str,
    confidence_tier: str,      # "ALPHA" | "BRAVO" | "CHARLIE"
    confidence_pct: int,
    prediction: str,
    x_post_url: str | None = None,
) -> bool:
    """
    Insert a new dispatch row.
    Returns True on success, False on failure (never raises).
    """
    client = _get_client()
    if not client:
        return False

    try:
        payload = {
            "dispatch_id":      dispatch_id,
            "nft_token_id":     nft_token_id,
            "tx_hash":          tx_hash,
            "fixture_id":       fixture_id,
            "home_team":        home_team,
            "away_team":        away_team,
            "minute":           minute,
            "dispatch_text":    dispatch_text,
            "confidence_tier":  confidence_tier,
            "confidence_pct":   confidence_pct,
            "prediction":       prediction,
            "x_post_url":       x_post_url,
            "status":           "PENDING",
            "created_at":       datetime.datetime.utcnow().isoformat(),
        }
        client.table("dispatches").insert(payload).execute()
        print(f"[Supabase] Dispatch #{dispatch_id} logged.")
        return True
    except Exception as exc:
        print(f"[Supabase] log_dispatch failed: {exc}")
        return False


def resolve_dispatch_log(dispatch_id: int, confirmed: bool) -> bool:
    """
    Update a dispatch row status to CONFIRMED or BURNED.
    Call this when the AI's prediction outcome is known.
    """
    client = _get_client()
    if not client:
        return False

    try:
        status = "CONFIRMED" if confirmed else "BURNED"
        client.table("dispatches").update({"status": status}).eq("dispatch_id", dispatch_id).execute()
        print(f"[Supabase] Dispatch #{dispatch_id} resolved → {status}")
        return True
    except Exception as exc:
        print(f"[Supabase] resolve_dispatch_log failed: {exc}")
        return False


def get_accuracy_stats() -> dict:
    """
    Return AI accuracy statistics across all resolved dispatches.
    """
    client = _get_client()
    if not client:
        return {}

    try:
        result = client.table("dispatches").select("confidence_tier, status").execute()
        rows = result.data or []

        stats: dict[str, dict[str, int]] = {}
        for row in rows:
            tier   = row.get("confidence_tier", "CHARLIE")
            status = row.get("status", "PENDING")
            if tier not in stats:
                stats[tier] = {"confirmed": 0, "burned": 0, "pending": 0}
            if status == "CONFIRMED":
                stats[tier]["confirmed"] += 1
            elif status == "BURNED":
                stats[tier]["burned"] += 1
            else:
                stats[tier]["pending"] += 1

        # Add accuracy percentage per tier
        for tier, counts in stats.items():
            resolved = counts["confirmed"] + counts["burned"]
            counts["accuracy_pct"] = round(
                (counts["confirmed"] / resolved * 100) if resolved > 0 else 0, 1
            )

        return stats
    except Exception as exc:
        print(f"[Supabase] get_accuracy_stats failed: {exc}")
        return {}
