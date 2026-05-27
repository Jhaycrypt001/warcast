import os
from web3 import Web3
from dotenv import load_dotenv

# Load .env from same folder as this script
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

PRIVATE_KEY          = os.getenv("PRIVATE_KEY")
DISPATCH_NFT_ADDRESS = os.getenv("DISPATCH_NFT_ADDRESS")
RPC_URL              = os.getenv("XLAYER_RPC", "https://testrpc.xlayer.tech")

# Sanity checks at startup
if not PRIVATE_KEY:
    raise ValueError("CRITICAL: PRIVATE_KEY not found in .env")
if not DISPATCH_NFT_ADDRESS:
    raise ValueError("CRITICAL: DISPATCH_NFT_ADDRESS not found in .env")

# Web3 setup
w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)
print(f"[+] Minter wallet: {account.address}")
print(f"[+] DispatchNFT contract: {DISPATCH_NFT_ADDRESS}")

# ABI — matches our deployed DispatchNFT.sol exactly
# mintDispatch(recipient, matchId, dispatchText, tier, metadataURI, homeTeam, awayTeam, minute, quantity)
DISPATCH_NFT_ABI = [
    {
        "inputs": [
            {"internalType": "address",  "name": "recipient",    "type": "address"},
            {"internalType": "uint256",  "name": "matchId",      "type": "uint256"},
            {"internalType": "string",   "name": "dispatchText", "type": "string"},
            {"internalType": "uint8",    "name": "tier",         "type": "uint8"},
            {"internalType": "string",   "name": "metadataURI",  "type": "string"},
            {"internalType": "string",   "name": "homeTeam",     "type": "string"},
            {"internalType": "string",   "name": "awayTeam",     "type": "string"},
            {"internalType": "uint256",  "name": "minute",       "type": "uint256"},
            {"internalType": "uint256",  "name": "quantity",     "type": "uint256"}
        ],
        "name": "mintDispatch",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "dispatchCount",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

dispatch_nft = w3.eth.contract(
    address=Web3.to_checksum_address(DISPATCH_NFT_ADDRESS),
    abi=DISPATCH_NFT_ABI
)


def mint_intel_onchain(
    fixture_id: int,
    home_team: str,
    away_team: str,
    minute: int,
    dispatch_text: str,
    tier_num: int,          # 0=CHARLIE, 1=BRAVO, 2=ALPHA
    metadata_uri: str = ""  # IPFS URI (empty string for now, add Pinata later)
) -> dict | None:
    """
    Mints a WARCAST Dispatch NFT on X Layer.
    The deployer wallet (PRIVATE_KEY) must be the contract owner.
    """
    if not w3.is_connected():
        print("[!] Cannot connect to X Layer RPC.")
        return None

    print(f"[*] Minting dispatch: {home_team} vs {away_team} | {minute}' | Tier {tier_num}")

    try:
        nonce = w3.eth.get_transaction_count(account.address)

        tx = dispatch_nft.functions.mintDispatch(
            account.address,            # recipient = deployer for now
            int(fixture_id),            # matchId
            dispatch_text,              # dispatchText
            tier_num,                   # tier (uint8: 0/1/2)
            metadata_uri,               # metadataURI (IPFS hash)
            home_team,                  # homeTeam
            away_team,                  # awayTeam
            int(minute),                # minute
            100                         # quantity (100 copies per dispatch)
        ).build_transaction({
            'chainId': 1952,            # X Layer Testnet — confirmed correct
            'gas': 500000,
            'gasPrice': int(w3.eth.gas_price * 1.5),
            'nonce': nonce,
        })

        signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

        print(f"[*] Transaction sent: {w3.to_hex(tx_hash)}")
        print(f"[*] View on explorer: https://www.oklink.com/xlayer-test/tx/{w3.to_hex(tx_hash)}")

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

        if receipt.status == 1:
            # Get the new dispatch count to know the token ID
            dispatch_id = dispatch_nft.functions.dispatchCount().call()
            print(f"[+] SUCCESS: Dispatch NFT #{dispatch_id} minted in block {receipt.blockNumber}")
            return {
                "dispatch_id": dispatch_id,
                "tx_hash": w3.to_hex(tx_hash),
                "block": receipt.blockNumber
            }
        else:
            print("[!] Transaction failed (reverted)")
            return None

    except Exception as e:
        print(f"[!] Minting error: {e}")
        return None
