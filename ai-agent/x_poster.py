import base64
import hashlib
import hmac
import os
import time
import urllib.parse
import uuid

import requests
from dotenv import load_dotenv


dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

X_API_V2_URL = "https://api.x.com/2/tweets"
X_API_V1_URL = "https://api.x.com/1.1/statuses/update.json"
X_MENTION = os.getenv("X_POST_MENTION", "@XLayerOfficial")
X_HASHTAGS = os.getenv("X_POST_HASHTAGS", "#WARCAST #XLayer #WorldCup2026")
X_POST_ENABLED = os.getenv("X_POST_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}

# User-context token from OAuth 2.0 PKCE or OAuth 1.0a user auth.
X_USER_ACCESS_TOKEN = (
    os.getenv("X_OAUTH2_USER_ACCESS_TOKEN")
    or os.getenv("X_OAUTH2_ACCESS_TOKEN")
)
X_OAUTH2_REFRESH_TOKEN = os.getenv("X_OAUTH2_REFRESH_TOKEN", "")
X_CLIENT_ID            = os.getenv("X_CLIENT_ID", "")
X_CLIENT_SECRET        = os.getenv("X_CLIENT_SECRET", "")
X_CONSUMER_KEY         = os.getenv("X_CONSUMER_KEY") or os.getenv("X_API_KEY")
X_CONSUMER_SECRET      = os.getenv("X_CONSUMER_SECRET") or os.getenv("X_API_SECRET")
X_ACCESS_TOKEN         = os.getenv("X_ACCESS_TOKEN")
X_ACCESS_TOKEN_SECRET  = os.getenv("X_ACCESS_TOKEN_SECRET")


def _refresh_access_token() -> str | None:
    """
    Exchange the refresh token for a new access token using OAuth2.
    Automatically updates .env so the new token persists across restarts.
    Returns the new access token, or None if refresh fails.
    """
    global X_USER_ACCESS_TOKEN, X_OAUTH2_REFRESH_TOKEN

    if not (X_OAUTH2_REFRESH_TOKEN and X_CLIENT_ID and X_CLIENT_SECRET):
        print("[X] Cannot refresh — missing X_OAUTH2_REFRESH_TOKEN / X_CLIENT_ID / X_CLIENT_SECRET")
        return None

    try:
        credentials = base64.b64encode(f"{X_CLIENT_ID}:{X_CLIENT_SECRET}".encode()).decode()
        resp = requests.post(
            "https://api.x.com/2/oauth2/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type":    "refresh_token",
                "refresh_token": X_OAUTH2_REFRESH_TOKEN,
            },
            timeout=20,
        )

        if resp.status_code != 200:
            print(f"[X] Token refresh failed: {resp.status_code} — {resp.text[:200]}")
            return None

        data              = resp.json()
        new_access        = data.get("access_token")
        new_refresh       = data.get("refresh_token", X_OAUTH2_REFRESH_TOKEN)

        if not new_access:
            print("[X] Refresh response missing access_token")
            return None

        # Update in-memory globals
        X_USER_ACCESS_TOKEN    = new_access
        X_OAUTH2_REFRESH_TOKEN = new_refresh

        # Persist to .env so next restart picks up the new tokens
        try:
            with open(dotenv_path, "r", encoding="utf-8") as fh:
                lines = fh.readlines()
            updated = []
            for line in lines:
                if line.startswith("X_OAUTH2_USER_ACCESS_TOKEN="):
                    updated.append(f"X_OAUTH2_USER_ACCESS_TOKEN={new_access}\n")
                elif line.startswith("X_OAUTH2_REFRESH_TOKEN="):
                    updated.append(f"X_OAUTH2_REFRESH_TOKEN={new_refresh}\n")
                else:
                    updated.append(line)
            with open(dotenv_path, "w", encoding="utf-8") as fh:
                fh.writelines(updated)
        except Exception as save_err:
            print(f"[X] Warning: could not persist new tokens to .env: {save_err}")

        print("[X] Access token refreshed and saved.")
        return new_access

    except Exception as exc:
        print(f"[X] Token refresh error: {exc}")
        return None


def _pct_encode(value: str) -> str:
    return urllib.parse.quote(str(value), safe="~-._")


def _normalize_base_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    scheme = parsed.scheme.lower()
    host = parsed.hostname.lower() if parsed.hostname else ""
    port = parsed.port

    if port and not ((scheme == "https" and port == 443) or (scheme == "http" and port == 80)):
        host = f"{host}:{port}"

    return f"{scheme}://{host}{parsed.path}"


def _oauth_signature(method: str, url: str, request_params: dict[str, str], oauth_params: dict[str, str]) -> str:
    all_params = []
    for key, value in {**request_params, **oauth_params}.items():
        all_params.append((_pct_encode(key), _pct_encode(value)))

    all_params.sort(key=lambda item: (item[0], item[1]))
    normalized = "&".join(f"{key}={value}" for key, value in all_params)

    base_string = "&".join(
        [
            _pct_encode(method.upper()),
            _pct_encode(_normalize_base_url(url)),
            _pct_encode(normalized),
        ]
    )

    signing_key = "&".join([
        _pct_encode(X_CONSUMER_SECRET or ""),
        _pct_encode(X_ACCESS_TOKEN_SECRET or ""),
    ])

    digest = hmac.new(signing_key.encode("utf-8"), base_string.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("utf-8")


def _build_authorization_header(oauth_params: dict[str, str]) -> str:
    header_params = ", ".join(
        f'{_pct_encode(key)}="{_pct_encode(value)}"' for key, value in oauth_params.items()
    )
    return f"OAuth {header_params}"


def build_dispatch_post_text(
    dispatch_id: int,
    home_team: str,
    away_team: str,
    minute: int,
    prediction: str,
    tier: str,
    confidence_pct: int,
    tx_hash: str,
) -> str:
    prefix = f"WARCAST #{dispatch_id} | {home_team} vs {away_team} | {minute}' | {tier} {confidence_pct}% | "
    suffix = f" | Mint: https://www.oklink.com/xlayer-test/tx/{tx_hash} {X_MENTION} {X_HASHTAGS}"
    max_prediction_len = max(20, 280 - len(prefix) - len(suffix))
    clean_prediction = " ".join(prediction.split())
    if len(clean_prediction) > max_prediction_len:
        clean_prediction = clean_prediction[: max_prediction_len - 3].rstrip() + "..."

    post_text = f"{prefix}{clean_prediction}{suffix}"
    if len(post_text) > 280:
        post_text = post_text[:277].rstrip() + "..."
    return post_text


def post_resolution_reply(
    original_tweet_id: str,
    dispatch_id: int,
    confirmed: bool,
    tier: str,
    home_team: str,
    away_team: str,
) -> dict:
    """
    Post a reply to the original dispatch tweet when the prediction resolves.
    Requires X_POST_ENABLED=true and a user-context OAuth2 token (same as mint tweet).
    """
    if not X_POST_ENABLED:
        return {"posted": False, "reason": "disabled"}
    if not X_USER_ACCESS_TOKEN:
        return {"posted": False, "reason": "no_user_access_token"}

    if confirmed:
        text = (
            f"⚡ DISPATCH #{dispatch_id} | INTEL CONFIRMED ✓\n"
            f"{home_team} vs {away_team} — prediction VERIFIED.\n"
            f"Points awarded to holders. {X_HASHTAGS}"
        )
    else:
        text = (
            f"⚡ DISPATCH #{dispatch_id} | INTEL BURNED ✗\n"
            f"{home_team} vs {away_team} — prediction did not materialize.\n"
            f"No points. Stay sharp. {X_HASHTAGS}"
        )

    # Trim to 280 chars
    if len(text) > 280:
        text = text[:277].rstrip() + "..."

    headers = {
        "Authorization": f"Bearer {X_USER_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "WARCAST/1.0",
    }
    payload = {
        "text": text,
        "reply": {"in_reply_to_tweet_id": original_tweet_id},
    }

    try:
        response = requests.post(X_API_V2_URL, json=payload, headers=headers, timeout=20)

        if response.status_code == 401:
            new_token = _refresh_access_token()
            if new_token:
                headers["Authorization"] = f"Bearer {new_token}"
                response = requests.post(X_API_V2_URL, json=payload, headers=headers, timeout=20)

        if response.status_code not in (200, 201):
            return {"posted": False, "reason": f"http_{response.status_code}", "detail": response.text[:200]}
        data = response.json().get("data", {})
        post_id = data.get("id") if isinstance(data, dict) else None
        return {"posted": True, "post_id": post_id}
    except Exception as exc:
        return {"posted": False, "reason": str(exc)}


def post_dispatch_to_x(
    dispatch_id: int,
    home_team: str,
    away_team: str,
    minute: int,
    prediction: str,
    tier: str,
    confidence_pct: int,
    tx_hash: str,
) -> dict:
    if not X_POST_ENABLED:
        return {"posted": False, "reason": "disabled"}

    status_text = build_dispatch_post_text(
        dispatch_id=dispatch_id,
        home_team=home_team,
        away_team=away_team,
        minute=minute,
        prediction=prediction,
        tier=tier,
        confidence_pct=confidence_pct,
        tx_hash=tx_hash,
    )

    if X_USER_ACCESS_TOKEN:
        return _post_with_oauth2(status_text)

    missing = [
        name
        for name, value in [
            ("X_CONSUMER_KEY", X_CONSUMER_KEY),
            ("X_CONSUMER_SECRET", X_CONSUMER_SECRET),
            ("X_ACCESS_TOKEN", X_ACCESS_TOKEN),
            ("X_ACCESS_TOKEN_SECRET", X_ACCESS_TOKEN_SECRET),
        ]
        if not value
    ]
    if missing:
        return {"posted": False, "reason": f"missing_credentials: {', '.join(missing)}"}

    return _post_with_oauth1(status_text)


def _post_with_oauth2(status_text: str) -> dict:
    headers = {
        "Authorization": f"Bearer {X_USER_ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "WARCAST/1.0",
    }

    response = requests.post(X_API_V2_URL, json={"text": status_text}, headers=headers, timeout=20)

    # Token expired — try a one-shot refresh and retry
    if response.status_code == 401:
        print("[X] 401 received — refreshing access token...")
        new_token = _refresh_access_token()
        if new_token:
            headers["Authorization"] = f"Bearer {new_token}"
            response = requests.post(X_API_V2_URL, json={"text": status_text}, headers=headers, timeout=20)

    if response.status_code not in (200, 201):
        return {
            "posted": False,
            "reason": f"http_{response.status_code}",
            "detail": response.text[:300],
            "text": status_text,
        }

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    data = payload.get("data") if isinstance(payload, dict) else {}
    post_id = data.get("id") if isinstance(data, dict) else None

    return {
        "posted": True,
        "post_id": post_id,
        "post_url": f"https://x.com/i/web/status/{post_id}" if post_id else None,
        "text": status_text,
    }


def _post_with_oauth1(status_text: str) -> dict:
    oauth_params = {
        "oauth_consumer_key": X_CONSUMER_KEY,
        "oauth_nonce": uuid.uuid4().hex,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": X_ACCESS_TOKEN,
        "oauth_version": "1.0",
    }

    request_params = {"status": status_text}
    oauth_params["oauth_signature"] = _oauth_signature("POST", X_API_V1_URL, request_params, oauth_params)

    headers = {
        "Authorization": _build_authorization_header(oauth_params),
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "WARCAST/1.0",
    }

    response = requests.post(X_API_V1_URL, data=request_params, headers=headers, timeout=20)

    if response.status_code not in (200, 201):
        return {
            "posted": False,
            "reason": f"http_{response.status_code}",
            "detail": response.text[:300],
            "text": status_text,
        }

    try:
        payload = response.json()
    except ValueError:
        payload = {}

    post_id = None
    post_url = None
    if isinstance(payload, dict):
        data = payload.get("data") or {}
        post_id = data.get("id") if isinstance(data, dict) else None
        post_id = post_id or payload.get("id_str")
        if post_id:
            post_url = f"https://x.com/i/web/status/{post_id}"

    return {
        "posted": True,
        "post_id": post_id,
        "post_url": post_url,
        "text": status_text,
    }
