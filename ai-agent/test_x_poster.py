import os

os.environ["X_POST_ENABLED"] = "false"

from x_poster import build_dispatch_post_text, post_dispatch_to_x


post_text = build_dispatch_post_text(
    dispatch_id=7,
    home_team="Portugal",
    away_team="Germany",
    minute=82,
    prediction="Germany will overload the left channel but Portugal will hold the lead through stoppage time.",
    tier="ALPHA",
    confidence_pct=85,
    tx_hash="0x" + "a" * 64,
)

print("=" * 60)
print("WARCAST X POST TEST")
print("=" * 60)
print(post_text)
print(f"Length: {len(post_text)}")

result = post_dispatch_to_x(
    dispatch_id=7,
    home_team="Portugal",
    away_team="Germany",
    minute=82,
    prediction="Germany will overload the left channel but Portugal will hold the lead through stoppage time.",
    tier="ALPHA",
    confidence_pct=85,
    tx_hash="0x" + "a" * 64,
)

print(result)
assert result["posted"] is False
assert result["reason"] == "disabled"
print("=" * 60)
