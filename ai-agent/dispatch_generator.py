import os
import json
import re
import datetime
from groq import Groq
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(dotenv_path=dotenv_path)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

TIER_MAP = {"CHARLIE": 0, "BRAVO": 1, "ALPHA": 2}

WC2026_START = datetime.datetime(2026, 6, 11, tzinfo=datetime.timezone.utc)


def _build_system_prompt() -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    delta = WC2026_START - now
    if delta.total_seconds() <= 0:
        status = "STATUS: TOURNAMENT ACTIVE. FIFA World Cup 2026 is underway. All dispatches are live WC2026 intelligence."
    else:
        days = delta.days
        status = (
            f"STATUS: Pre-tournament reconnaissance phase. WC2026 is {days} days away. "
            "Every live match is WC2026 intelligence — nations are finalizing form, rotations, "
            "and tactical setups before the war begins June 11."
        )

    return f"""You are WARCAST — the AI Intelligence Commander deployed for FIFA World Cup 2026.

MISSION BRIEFING:
The FIFA World Cup 2026 launches JUNE 11, 2026 in the USA, Canada, and Mexico.
This is the first-ever 48-nation tournament — the largest in World Cup history.
Format: 12 groups of 4 teams, top 2 per group + best 8 third-place advance to 32-team knockout.

48 ACTIVE WC2026 NATIONS (qualified):
Argentina, Australia, Algeria, Austria, Belgium, Bosnia and Herzegovina, Brazil, Cabo Verde,
Canada (HOST), Colombia, Congo DR, Cote d'Ivoire, Croatia, Czechia, Curacao, Ecuador,
Egypt, England, France, Germany, Ghana, Haiti, IR Iran, Iraq, Japan, Jordan,
Korea Republic, Mexico (HOST), Morocco, Netherlands, New Zealand, Norway, Panama, Paraguay,
Portugal, Qatar, Saudi Arabia, Scotland, Senegal, South Africa, Spain, Sweden, Switzerland,
Tunisia, Turkiye, Uruguay, USA (HOST), Uzbekistan.

{status}

WARCAST DISPATCH PROTOCOL:
Return ONLY a valid JSON object. Zero extra text. Zero markdown. No code fences.

Format:
{{"narrative": "[DISPATCH #N | HomeTeam vs AwayTeam | Minute\\'] <2-3 sentences of classified tactical intelligence in military tone. If either team is a WC2026 nation, reference tournament implications. End with: PREDICTION: <specific outcome in next 10-15 minutes> | Confidence: TIER (PCT%)>", "tier": "ALPHA or BRAVO or CHARLIE", "confidence_pct": 30, "prediction": "one-line specific prediction"}}

TIER DOCTRINE:
- ALPHA (70-95%): High-confidence. Clear tactical signal. High-value WC2026 intel.
- BRAVO (50-69%): Field-grade signal. Moderate certainty. Actionable intelligence.
- CHARLIE (30-49%): Speculative. Low signal. Pre-tournament variance.

NARRATIVE DOCTRINE:
- Military intelligence tone — use: "assets", "flanks", "field command", "intercept", "advance", "tactical shift", "war room"
- ALL matches are WC2026 pre-tournament reconnaissance — these nations prepare for the war
- Short, brutal, precise. Maximum 3 sentences. No filler. No sports commentary language.
- Reference WC2026 implications when either team is a qualified nation
- Every dispatch reads like it was torn from a classified dossier, not a match report"""


def generate_dispatch(
    dispatch_num: int,
    home_team: str,
    away_team: str,
    minute: int,
    tactical_event: str,
    event_details: str
) -> dict | None:
    """
    Generates a WARCAST dispatch and returns structured data for NFT minting.

    Returns:
        {
            "narrative": str,        # Full dispatch text for NFT metadata
            "tier": str,             # "ALPHA" | "BRAVO" | "CHARLIE"
            "tier_num": int,         # 2 | 1 | 0 (matches contract enum)
            "confidence_pct": int,   # e.g. 79
            "prediction": str        # Short prediction string
        }
    """
    system_prompt = _build_system_prompt()

    user_message = f"""Match: {home_team} vs {away_team}
Minute: {minute}'
Dispatch Number: {dispatch_num}
Tactical Event: {tactical_event}
Details: {event_details}

Generate the WARCAST dispatch JSON now."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.75,
            max_tokens=400
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if AI adds them
        clean = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.MULTILINE).strip()

        data = json.loads(clean)

        tier = data.get("tier", "BRAVO").upper()
        if tier not in TIER_MAP:
            tier = "BRAVO"

        return {
            "narrative": data.get("narrative", f"[DISPATCH #{dispatch_num} | {home_team} vs {away_team} | {minute}'] Tactical event detected."),
            "tier": tier,
            "tier_num": TIER_MAP[tier],
            "confidence_pct": int(data.get("confidence_pct", 60)),
            "prediction": data.get("prediction", "Outcome pending")
        }

    except json.JSONDecodeError as e:
        print(f"[!] JSON Parse Error: {e}")
        print(f"[!] Raw response was: {raw[:200]}")
        return None
    except Exception as e:
        print(f"[!] Dispatch generation error: {e}")
        return None
