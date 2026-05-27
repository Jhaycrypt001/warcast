"""
resolver.py — WARCAST Dispatch Resolver

Resolves a dispatch (confirms or burns the prediction) and awards points
to all current holders of that dispatch NFT.

Usage:
    python resolver.py <dispatch_id> <confirm|burn>

Example:
    python resolver.py 1 confirm
    python resolver.py 3 burn
"""

import os
import sys
from collections import defaultdict
from web3 import Web3
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment setup
# ---------------------------------------------------------------------------
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

PRIVATE_KEY           = os.getenv("PRIVATE_KEY")
DISPATCH_NFT_ADDRESS  = os.getenv("DISPATCH_NFT_ADDRESS")
AGENT_RANK_ADDRESS    = os.getenv("AGENT_RANK_ADDRESS")
RPC_URL               = os.getenv("XLAYER_RPC", "https://testrpc.xlayer.tech")

if not PRIVATE_KEY:
    raise ValueError("CRITICAL: PRIVATE_KEY not found in .env")
if not DISPATCH_NFT_ADDRESS:
    raise ValueError("CRITICAL: DISPATCH_NFT_ADDRESS not found in .env")
if not AGENT_RANK_ADDRESS:
    raise ValueError("CRITICAL: AGENT_RANK_ADDRESS not found in .env")

# ---------------------------------------------------------------------------
# Web3 setup
# ---------------------------------------------------------------------------
w3 = Web3(Web3.HTTPProvider(RPC_URL))
if not w3.is_connected():
    raise ConnectionError(f"Cannot connect to RPC: {RPC_URL}")

account = w3.eth.account.from_key(PRIVATE_KEY)
print(f"[+] Resolver wallet : {account.address}")
print(f"[+] DispatchNFT     : {DISPATCH_NFT_ADDRESS}")
print(f"[+] AgentRank       : {AGENT_RANK_ADDRESS}")

# ---------------------------------------------------------------------------
# Contract ABIs
# ---------------------------------------------------------------------------
DISPATCH_NFT_ABI = [
    # resolveDispatch(uint256 dispatchId, bool success)
    {
        "inputs": [
            {"internalType": "uint256", "name": "dispatchId", "type": "uint256"},
            {"internalType": "bool",    "name": "success",    "type": "bool"},
        ],
        "name": "resolveDispatch",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    # getDispatch(uint256 dispatchId) returns (DispatchData)
    # We only need tier (index 3 in the tuple) so we return the full tuple
    {
        "inputs": [
            {"internalType": "uint256", "name": "dispatchId", "type": "uint256"},
        ],
        "name": "getDispatch",
        "outputs": [
            {
                "internalType": "tuple",
                "name": "",
                "type": "tuple",
                "components": [
                    {"internalType": "uint256", "name": "matchId",      "type": "uint256"},
                    {"internalType": "uint256", "name": "timestamp",    "type": "uint256"},
                    {"internalType": "string",  "name": "dispatchText", "type": "string"},
                    {"internalType": "uint8",   "name": "tier",         "type": "uint8"},
                    {"internalType": "uint8",   "name": "status",       "type": "uint8"},
                    {"internalType": "string",  "name": "metadataURI",  "type": "string"},
                    {"internalType": "string",  "name": "homeTeam",     "type": "string"},
                    {"internalType": "string",  "name": "awayTeam",     "type": "string"},
                    {"internalType": "uint256", "name": "minute",       "type": "uint256"},
                ],
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
    # TransferSingle event for holder tracking
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "address", "name": "operator", "type": "address"},
            {"indexed": True,  "internalType": "address", "name": "from",     "type": "address"},
            {"indexed": True,  "internalType": "address", "name": "to",       "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "id",       "type": "uint256"},
            {"indexed": False, "internalType": "uint256", "name": "value",    "type": "uint256"},
        ],
        "name": "TransferSingle",
        "type": "event",
    },
]

AGENT_RANK_ABI = [
    # awardPoints(address agent, uint256 points) onlyOwner
    {
        "inputs": [
            {"internalType": "address", "name": "agent",  "type": "address"},
            {"internalType": "uint256", "name": "points", "type": "uint256"},
        ],
        "name": "awardPoints",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

dispatch_nft = w3.eth.contract(
    address=Web3.to_checksum_address(DISPATCH_NFT_ADDRESS),
    abi=DISPATCH_NFT_ABI,
)
agent_rank = w3.eth.contract(
    address=Web3.to_checksum_address(AGENT_RANK_ADDRESS),
    abi=AGENT_RANK_ABI,
)

# ---------------------------------------------------------------------------
# Tier → points mapping (confirmed dispatches only)
# ConfidenceTier enum: 0=CHARLIE, 1=BRAVO, 2=ALPHA
# ---------------------------------------------------------------------------
TIER_POINTS = {
    2: 50,  # ALPHA
    1: 30,  # BRAVO
    0: 10,  # CHARLIE
}
TIER_NAMES = {2: "ALPHA", 1: "BRAVO", 0: "CHARLIE"}

# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def get_dispatch_holders(dispatch_id: int) -> list[tuple[str, int]]:
    """
    Query TransferSingle events for the given dispatch token_id and
    return a list of (address, balance) tuples where balance > 0.

    Strategy:
      - Mint events have `from == 0x0`, giving initial balances.
      - Transfer events move balances from one holder to another.
      - Aggregate net balance per address.
    """
    zero_address = "0x0000000000000000000000000000000000000000"
    balances: dict[str, int] = defaultdict(int)

    print(f"[*] Querying TransferSingle events for dispatch #{dispatch_id}...")

    try:
        events = dispatch_nft.events.TransferSingle.get_logs(
            argument_filters={"id": dispatch_id},
            from_block=0,
            to_block="latest",
        )
    except Exception as exc:
        print(f"[!] Error fetching transfer events: {exc}")
        return []

    for event in events:
        args = event["args"]
        from_addr = args["from"]
        to_addr   = args["to"]
        value     = args["value"]

        if from_addr != zero_address:
            balances[from_addr] -= value
        if to_addr != zero_address:
            balances[to_addr] += value

    holders = [(addr, bal) for addr, bal in balances.items() if bal > 0]
    print(f"[+] Found {len(holders)} holder(s) for dispatch #{dispatch_id}")
    return holders


def resolve_dispatch(dispatch_id: int, confirmed: bool) -> str | None:
    """
    Call resolveDispatch(dispatch_id, confirmed) on the DispatchNFT contract.
    Returns the tx hash as a hex string, or None on failure.
    """
    action_label = "CONFIRMED" if confirmed else "BURNED"
    print(f"[*] Resolving dispatch #{dispatch_id} → {action_label}")

    try:
        nonce = w3.eth.get_transaction_count(account.address)
        tx = dispatch_nft.functions.resolveDispatch(dispatch_id, confirmed).build_transaction({
            "chainId":  1952,
            "gas":      200_000,
            "gasPrice": int(w3.eth.gas_price * 1.5),
            "nonce":    nonce,
        })
        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        hex_hash = w3.to_hex(tx_hash)
        print(f"[*] resolveDispatch tx sent: {hex_hash}")
        print(f"[*] Explorer: https://www.oklink.com/xlayer-test/tx/{hex_hash}")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        if receipt.status == 1:
            print(f"[+] Dispatch #{dispatch_id} resolved as {action_label} in block {receipt.blockNumber}")
            return hex_hash
        else:
            print("[!] resolveDispatch transaction reverted")
            return None

    except Exception as exc:
        print(f"[!] resolveDispatch error: {exc}")
        return None


def award_points_to_holders(dispatch_id: int, points_per_holder: int) -> int:
    """
    Get current holders via get_dispatch_holders() and call awardPoints()
    on AgentRank for each holder with balance > 0.
    Returns the number of successful point-award transactions.
    """
    holders = get_dispatch_holders(dispatch_id)
    if not holders:
        print(f"[!] No holders found for dispatch #{dispatch_id}. No points awarded.")
        return 0

    success_count = 0
    for address, balance in holders:
        checksum_addr = Web3.to_checksum_address(address)
        print(f"[*] Awarding {points_per_holder} pts to {checksum_addr} (holds {balance}x)")
        try:
            nonce = w3.eth.get_transaction_count(account.address)
            tx = agent_rank.functions.awardPoints(
                checksum_addr,
                points_per_holder,
            ).build_transaction({
                "chainId":  1952,
                "gas":      100_000,
                "gasPrice": int(w3.eth.gas_price * 1.5),
                "nonce":    nonce,
            })
            signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            if receipt.status == 1:
                print(f"    [+] Awarded {points_per_holder} pts → {checksum_addr}")
                success_count += 1
            else:
                print(f"    [!] awardPoints reverted for {checksum_addr}")
        except Exception as exc:
            print(f"    [!] awardPoints error for {checksum_addr}: {exc}")

    print(f"[+] Points awarded to {success_count}/{len(holders)} holder(s)")
    return success_count


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python resolver.py <dispatch_id> <confirm|burn>")
        sys.exit(1)

    try:
        dispatch_id = int(sys.argv[1])
    except ValueError:
        print(f"[!] Invalid dispatch_id '{sys.argv[1]}': must be an integer")
        sys.exit(1)

    action = sys.argv[2].strip().lower()
    if action not in ("confirm", "burn"):
        print(f"[!] Invalid action '{sys.argv[2]}': must be 'confirm' or 'burn'")
        sys.exit(1)

    confirmed = action == "confirm"

    # --- Fetch dispatch metadata to determine tier ---
    print(f"[*] Fetching dispatch #{dispatch_id} metadata...")
    try:
        dispatch_data = dispatch_nft.functions.getDispatch(dispatch_id).call()
        # tuple order: matchId, timestamp, dispatchText, tier, status, metadataURI, homeTeam, awayTeam, minute
        tier_num = dispatch_data[3]
        tier_label = TIER_NAMES.get(tier_num, "CHARLIE")
        print(f"[+] Dispatch #{dispatch_id} | Tier: {tier_label} ({tier_num})")
    except Exception as exc:
        print(f"[!] Could not fetch dispatch metadata: {exc}")
        print("[!] Aborting.")
        sys.exit(1)

    # --- Resolve on-chain ---
    tx_hash = resolve_dispatch(dispatch_id, confirmed)
    if not tx_hash:
        print("[!] Resolve step failed. Aborting point distribution.")
        sys.exit(1)

    # --- Award points if confirmed ---
    if confirmed:
        points = TIER_POINTS.get(tier_num, 10)
        print(f"[*] Distributing {points} pts (Tier {tier_label}) to all holders...")
        awarded = award_points_to_holders(dispatch_id, points)
        print(f"\n=== Resolution complete ===")
        print(f"    Dispatch   : #{dispatch_id}")
        print(f"    Outcome    : CONFIRMED")
        print(f"    Tier       : {tier_label}")
        print(f"    Points     : {points} per holder")
        print(f"    Holders paid: {awarded}")
    else:
        print(f"\n=== Resolution complete ===")
        print(f"    Dispatch : #{dispatch_id}")
        print(f"    Outcome  : BURNED (no points awarded)")


if __name__ == "__main__":
    main()
