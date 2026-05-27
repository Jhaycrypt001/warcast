'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TransactionButton,
  useActiveAccount,
  useActiveWalletChain,
  useReadContract,
  useSendAndConfirmTransaction,
  useSwitchActiveWalletChain,
} from 'thirdweb/react';
import { prepareContractCall, readContract, toEther, toWei } from 'thirdweb';
import Navbar from '../components/Navbar';
import {
  CONTRACT_ADDRESSES,
  EXPLORER_URL,
  dispatchNftContract,
  intelMarketContract,
  xLayerTestnet,
} from '../lib/contracts';

type ListingTuple = readonly [string, bigint, bigint, boolean];

type DispatchContractData = {
  matchId: bigint;
  timestamp: bigint;
  dispatchText: string;
  tier: number;
  status: number;
  metadataURI: string;
  homeTeam: string;
  awayTeam: string;
  minute: bigint;
};

type MarketListing = {
  id: bigint;
  seller: string;
  dispatchId: bigint;
  price: bigint;
  active: boolean;
  match: string;
  tier: string;
  minute: bigint;
  text: string;
};

const TIER_LABELS = ['CHARLIE', 'BRAVO', 'ALPHA'] as const;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown transaction error';
}

export default function MarketPage() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const buyMutation = useSendAndConfirmTransaction();

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatchId, setDispatchId] = useState('');
  const [listPrice, setListPrice] = useState('0.01');
  const [buyStatus, setBuyStatus] = useState<Record<string, string>>({});
  const [buyingListingId, setBuyingListingId] = useState<string | null>(null);

  const { data: latestDispatchCount } = useReadContract({
    contract: dispatchNftContract,
    method: 'dispatchCount',
    params: [],
    queryOptions: {
      refetchInterval: 30000,
    },
  });

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const count = await readContract({
        contract: intelMarketContract,
        method: 'listingCount',
        params: [],
      });

      const latestIds = Array.from({ length: Number(count) }, (_, index) => BigInt(index + 1))
        .reverse()
        .slice(0, 24);

      const loadedListings = await Promise.all(
        latestIds.map(async (listingId) => {
          const listing = (await readContract({
            contract: intelMarketContract,
            method: 'listings',
            params: [listingId],
          })) as ListingTuple;

          let dispatch: DispatchContractData | null = null;
          if (listing[1] > 0n && listing[0] !== ZERO_ADDRESS) {
            try {
              dispatch = (await readContract({
                contract: dispatchNftContract,
                method: 'getDispatch',
                params: [listing[1]],
              })) as DispatchContractData;
            } catch {
              dispatch = null;
            }
          }

          return {
            id: listingId,
            seller: listing[0],
            dispatchId: listing[1],
            price: listing[2],
            active: listing[3],
            match: dispatch ? `${dispatch.homeTeam} vs ${dispatch.awayTeam}` : 'Dispatch unavailable',
            tier: dispatch ? TIER_LABELS[Number(dispatch.tier)] ?? 'CHARLIE' : 'CHARLIE',
            minute: dispatch?.minute ?? 0n,
            text: dispatch?.dispatchText ?? '',
          };
        }),
      );

      setListings(
        loadedListings.filter(
          (listing) => listing.active && listing.dispatchId > 0n && listing.seller !== ZERO_ADDRESS,
        ),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
    const interval = window.setInterval(loadListings, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadListings]);

  async function acquireIntel(listing: MarketListing) {
    const listingKey = listing.id.toString();

    if (!account?.address) {
      setBuyStatus((prev) => ({ ...prev, [listingKey]: 'Connect a wallet first.' }));
      return;
    }

    if (account.address.toLowerCase() === listing.seller.toLowerCase()) {
      setBuyStatus((prev) => ({
        ...prev,
        [listingKey]: 'This is your own listing. Connect another wallet to test buying it.',
      }));
      return;
    }

    setBuyingListingId(listingKey);

    try {
      if (activeChain?.id !== xLayerTestnet.id) {
        setBuyStatus((prev) => ({ ...prev, [listingKey]: 'Switching wallet to X Layer Testnet...' }));
        await switchChain(xLayerTestnet);
      }

      setBuyStatus((prev) => ({ ...prev, [listingKey]: 'Checking listing status...' }));
      const liveListing = (await readContract({
        contract: intelMarketContract,
        method: 'listings',
        params: [listing.id],
      })) as ListingTuple;

      if (!liveListing[3]) {
        throw new Error('This listing is no longer active.');
      }

      const sellerBalance = (await readContract({
        contract: dispatchNftContract,
        method: 'balanceOf',
        params: [liveListing[0], liveListing[1]],
      })) as bigint;

      if (sellerBalance === 0n) {
        throw new Error('Seller no longer owns this dispatch NFT.');
      }

      const isApproved = (await readContract({
        contract: dispatchNftContract,
        method: 'isApprovedForAll',
        params: [liveListing[0], CONTRACT_ADDRESSES.intelMarket],
      })) as boolean;

      if (!isApproved) {
        throw new Error('Seller has not approved the market to transfer this dispatch.');
      }

      setBuyStatus((prev) => ({ ...prev, [listingKey]: 'Open your wallet and confirm the purchase...' }));

      const transaction = prepareContractCall({
        contract: intelMarketContract,
        method: 'buyDispatch',
        params: [listing.id],
        value: liveListing[2],
      });

      const receipt = await buyMutation.mutateAsync(transaction);
      const txHash = receipt.transactionHash;

      setBuyStatus((prev) => ({
        ...prev,
        [listingKey]: `Acquired. TX: ${txHash}`,
      }));
      await loadListings();
    } catch (err) {
      setBuyStatus((prev) => ({ ...prev, [listingKey]: getErrorMessage(err) }));
    } finally {
      setBuyingListingId(null);
    }
  }

  return (
    <>
      <Navbar />

      <div className="arc-gradient">
        <main className="dashboard-container" style={{ maxWidth: '1000px' }}>
          <div className="dashboard-header">
            <h1 className="dashboard-heading">
              Intel <strong>Marketplace</strong>
            </h1>
            <p className="dashboard-sub">
              Trade verified tactical dispatches minted by the AI commander on X Layer testnet.
            </p>
          </div>

          <section className="market-card list-panel">
            <div className="market-card-header">
              <span className="market-badge">CREATE LISTING</span>
              <span className="market-time">
                Latest dispatch #{latestDispatchCount?.toString() ?? '...'}
              </span>
            </div>

            <div className="listing-form">
              <label className="field-label">
                Dispatch ID
                <input
                  className="field-input"
                  inputMode="numeric"
                  onChange={(event) => setDispatchId(event.target.value.replace(/\D/g, ''))}
                  placeholder="1"
                  value={dispatchId}
                />
              </label>
              <label className="field-label">
                Price in OKB
                <input
                  className="field-input"
                  inputMode="decimal"
                  onChange={(event) => setListPrice(event.target.value)}
                  placeholder="0.01"
                  value={listPrice}
                />
              </label>
            </div>

            <div className="market-actions">
              <TransactionButton
                className="btn-buy"
                disabled={!account?.address}
                onError={(err) => alert(`Approval failed: ${err.message}`)}
                onTransactionConfirmed={() => {
                  alert('IntelMarket approved to transfer your Dispatch NFTs.');
                }}
                transaction={() =>
                  prepareContractCall({
                    contract: dispatchNftContract,
                    method: 'setApprovalForAll',
                    params: [CONTRACT_ADDRESSES.intelMarket, true],
                  })
                }
                unstyled
              >
                Approve Market
              </TransactionButton>

              <TransactionButton
                className="btn-buy"
                disabled={!account?.address || !dispatchId || !listPrice}
                onError={(err) => alert(`Listing failed: ${err.message}`)}
                onTransactionConfirmed={() => {
                  alert(`Dispatch #${dispatchId} listed for ${listPrice} OKB.`);
                  setDispatchId('');
                  loadListings();
                }}
                transaction={() =>
                  prepareContractCall({
                    contract: intelMarketContract,
                    method: 'listDispatch',
                    params: [BigInt(dispatchId), toWei(listPrice)],
                  })
                }
                unstyled
              >
                List Dispatch
              </TransactionButton>
            </div>
          </section>

          <div className="market-grid">
            {isLoading && <div className="feed-empty">Reading active listings from IntelMarket...</div>}
            {error && !isLoading && <div className="feed-empty">Market read failed: {error}</div>}
            {!isLoading && !error && listings.length === 0 && (
              <div className="feed-empty">
                No active listings yet. Approve the market, then list one of your minted dispatches.
              </div>
            )}

            {!isLoading && !error && listings.map((listing) => {
              const listingKey = listing.id.toString();
              const status = buyStatus[listingKey];
              const isOwnListing = account?.address?.toLowerCase() === listing.seller.toLowerCase();
              const isBusy = buyingListingId === listingKey || buyMutation.isPending;

              return (
                <div key={listingKey} className="market-card">
                  <div className="market-card-header">
                    <span className="market-badge">{listing.tier}</span>
                    <span className="market-time">Listing #{listingKey}</span>
                  </div>

                  <div className="market-details">
                    <div className="detail-row">
                      <span className="detail-label">Dispatch</span>
                      <span className="detail-value">#{listing.dispatchId.toString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Match</span>
                      <span className="detail-value">{listing.match}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Minute</span>
                      <span className="detail-value">{listing.minute.toString()}&#39;</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Seller</span>
                      <span className="detail-value">{shortAddress(listing.seller)}</span>
                    </div>
                  </div>

                  {listing.text && <p className="feed-text market-listing-text">{listing.text}</p>}

                  <div className="market-pricing">
                    <div className="price-block">
                      <span className="price-label">Ask Price</span>
                      <span className="price-value">{toEther(listing.price)} OKB</span>
                    </div>
                    <div className="trend-block" style={{ color: '#10b981' }}>
                      ACTIVE
                    </div>
                  </div>

                  {status && (
                    <div className="market-status">
                      {status.startsWith('0x') || status.includes('TX: 0x') ? (
                        <a
                          href={`${EXPLORER_URL}/tx/${status.split('TX: ')[1]}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View purchase transaction
                        </a>
                      ) : status}
                    </div>
                  )}

                  <div className="market-actions">
                    <button
                      className="btn-buy"
                      disabled={!account?.address || isOwnListing || isBusy}
                      onClick={() => acquireIntel(listing)}
                      type="button"
                    >
                      {!account?.address
                        ? 'Connect Wallet'
                        : isOwnListing
                          ? 'Your Listing'
                          : isBusy
                            ? 'Processing...'
                            : 'Acquire Intel'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}
