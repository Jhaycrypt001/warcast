import os
import time
import datetime
import threading
from flask import Flask
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=dotenv_path)

from utils.football_api import get_live_matches
from tactical_detector import analyze_match
from dispatch_generator import generate_dispatch
from onchain_minter import mint_intel_onchain
from x_poster import post_dispatch_to_x
from supabase_logger import log_dispatch
import auto_resolver

load_dotenv()

# Track dispatches we've already processed so we don't double-mint
processed_events = set()
dispatch_count = 0


def run_production_pipeline():
    global dispatch_count

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{timestamp}] WARCAST COMMANDER — Scanning live matches...")
    print("=" * 60)

    # ── 1. FETCH live matches ──────────────────────────────────
    matches = get_live_matches()

    if not matches:
        print("[-] No live matches right now. Holding position...")
        auto_resolver.check_and_resolve([])
        return

    print(f"[*] {len(matches)} live match(es) found.")

    # ── 2. AUTO-RESOLVE pending dispatches ────────────────────
    auto_resolver.check_and_resolve(matches)

    # ── 3. PROCESS each match ──────────────────────────────────
    for match in matches:
        time.sleep(1.2)  # Respect API rate limits

        try:
            fixture_id = match.get('fixture', {}).get('id')
            if not fixture_id:
                continue

            home_team = match.get('teams', {}).get('home', {}).get('name', 'Home')
            away_team = match.get('teams', {}).get('away', {}).get('name', 'Away')
            minute    = match.get('fixture', {}).get('status', {}).get('elapsed', 0) or 0

            print(f"\n[>] Analyzing: {home_team} vs {away_team} | {minute}'")

            # ── 3. DETECT tactical event ───────────────────────
            tactical_event = analyze_match(fixture_id, match=match)

            if not tactical_event:
                print("    No tactical event detected.")
                continue

            # Deduplicate: don't re-dispatch same event type in same 10-minute window
            event_key = f"{fixture_id}_{tactical_event.get('type')}_{minute // 10}"
            if event_key in processed_events:
                print(f"    Already dispatched this event. Skipping.")
                continue

            processed_events.add(event_key)
            dispatch_count += 1

            print(f"[!] Intelligence captured: {tactical_event.get('type')}")
            print(f"    Details: {tactical_event.get('detail')}")

            # ── 4. GENERATE dispatch narrative ─────────────────
            dispatch = generate_dispatch(
                dispatch_num=dispatch_count,
                home_team=home_team,
                away_team=away_team,
                minute=minute,
                tactical_event=tactical_event.get('type', ''),
                event_details=tactical_event.get('detail', '')
            )

            if not dispatch:
                print("[-] Dispatch generation failed. Skipping mint.")
                continue

            print(f"\n{'=' * 60}")
            print(dispatch['narrative'])
            print(f"Tier: {dispatch['tier']} | Confidence: {dispatch['confidence_pct']}%")
            print(f"{'=' * 60}")

            # ── 5. MINT on X Layer ─────────────────────────────
            print(f"\n[*] Minting Dispatch #{dispatch_count} to X Layer...")

            result = mint_intel_onchain(
                fixture_id=fixture_id,
                home_team=home_team,
                away_team=away_team,
                minute=minute,
                dispatch_text=dispatch['narrative'],
                tier_num=dispatch['tier_num'],
                metadata_uri=""  # Will add IPFS URI in Day 9
            )

            if result:
                print(f"[+] MINTED: Dispatch NFT #{result['dispatch_id']}")
                print(f"[+] TX: https://www.oklink.com/xlayer-test/tx/{result['tx_hash']}")

                # ── 5b. POST to X ──────────────────────────────────────────
                x_result = post_dispatch_to_x(
                    dispatch_id=result["dispatch_id"],
                    home_team=home_team,
                    away_team=away_team,
                    minute=minute,
                    prediction=dispatch["prediction"],
                    tier=dispatch["tier"],
                    confidence_pct=dispatch["confidence_pct"],
                    tx_hash=result["tx_hash"],
                )

                if x_result.get("posted"):
                    print(f"[+] X POSTED: {x_result.get('post_url') or x_result.get('post_id') or 'success'}")
                else:
                    print(f"[-] X post skipped/failed: {x_result.get('reason')}")
                    if x_result.get("detail"):
                        print(f"    Detail: {x_result.get('detail')}")

                # ── Register for auto-resolution (after X so we have tweet ID) ─
                auto_resolver.register(
                    dispatch_id=result["dispatch_id"],
                    fixture_id=fixture_id,
                    home_team=home_team,
                    away_team=away_team,
                    minute=minute,
                    event_type=tactical_event.get("type", ""),
                    tier_num=dispatch["tier_num"],
                    x_post_id=x_result.get("post_id"),
                )

                # ── 6. LOG to Supabase ─────────────────────────────
                log_dispatch(
                    dispatch_id=result["dispatch_id"],
                    nft_token_id=result["dispatch_id"],
                    tx_hash=result["tx_hash"],
                    fixture_id=fixture_id,
                    home_team=home_team,
                    away_team=away_team,
                    minute=minute,
                    dispatch_text=dispatch["narrative"],
                    confidence_tier=dispatch["tier"],
                    confidence_pct=dispatch["confidence_pct"],
                    prediction=dispatch["prediction"],
                    x_post_url=x_result.get("post_url"),
                )
            else:
                print("[-] Mint failed — check onchain_minter logs above.")

        except Exception as e:
            print(f"[!] Error processing fixture {fixture_id}: {e}")
            continue


_app = Flask(__name__)

@_app.route("/")
def _health():
    return "WARCAST Commander running", 200


def _start_health_server():
    port = int(os.environ.get("PORT", 10000))
    _app.run(host="0.0.0.0", port=port)


if __name__ == "__main__":
    print("⚡ WARCAST AI COMMANDER — ONLINE")
    print("   Live On-Chain Tactical Intelligence — X Layer")
    print("=" * 60)

    threading.Thread(target=_start_health_server, daemon=True).start()

    while True:
        try:
            run_production_pipeline()
            print(f"\n[*] Next scan in 5 minutes... (Ctrl+C to stop)")
            time.sleep(300)
        except KeyboardInterrupt:
            print("\n[*] WARCAST Commander shutting down.")
            break
        except Exception as e:
            print(f"[!] Pipeline error: {e}")
            time.sleep(30)
