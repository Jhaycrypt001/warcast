'use client';
import { useEffect, useMemo, useState } from 'react';
import { readContract } from 'thirdweb';
import { dispatchNftContract, EXPLORER_URL } from '../lib/contracts';

const TIER_LABELS = ['CHARLIE', 'BRAVO', 'ALPHA'] as const;
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

type DispatchItem = {
  id: bigint;
  matchId: bigint;
  timestamp: bigint;
  text: string;
  tier: number;
  status: number;
  metadataURI: string;
  homeTeam: string;
  awayTeam: string;
  minute: bigint;
};

function timeAgo(timestamp: bigint) {
  const mintedAt = Number(timestamp) * 1000;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - mintedAt) / 1000));

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h ago`;
}

function truncateText(text: string) {
  return text.length > 190 ? `${text.slice(0, 187)}...` : text;
}

function renderStatus(statusNum: number) {
  if (statusNum === 1) return <span className="dispatch-status status-confirmed">&#10003; CONFIRMED</span>;
  if (statusNum === 2) return <span className="dispatch-status status-burned">&#10007; BURNED</span>;
  return <span className="dispatch-status status-active pulse-dot">&#9711; ACTIVE INTEL</span>;
}


export default function DispatchFeed() {
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dispatchCount = useMemo(() => dispatches.length, [dispatches]);

  useEffect(() => {
    let isMounted = true;

    async function loadDispatches() {
      setIsLoading(true);
      setError(null);

      try {
        const count = await readContract({
          contract: dispatchNftContract,
          method: 'dispatchCount',
          params: [],
        });

        const latestIds = Array.from({ length: Number(count) }, (_, index) => BigInt(index + 1))
          .reverse()
          .slice(0, 6);

        const latestDispatches = await Promise.all(
          latestIds.map(async (dispatchId) => {
            const result = (await readContract({
              contract: dispatchNftContract,
              method: 'getDispatch',
              params: [dispatchId],
            })) as DispatchContractData;

            return {
              id: dispatchId,
              matchId: result.matchId,
              timestamp: result.timestamp,
              text: result.dispatchText,
              tier: Number(result.tier),
              status: Number(result.status),
              metadataURI: result.metadataURI,
              homeTeam: result.homeTeam,
              awayTeam: result.awayTeam,
              minute: result.minute,
            };
          }),
        );

        if (isMounted) {
          setDispatches(latestDispatches);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to read DispatchNFT contract');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDispatches();
    const interval = window.setInterval(loadDispatches, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="glass-panel feed-container">
      <div className="feed-header">
        <h2 className="feed-title">
          <span className="live-dot"></span> Live Tactical Feed
        </h2>
        <span className="node-id">X LAYER TESTNET: {dispatchCount} LOADED</span>
      </div>

      <div className="feed-list">
        {isLoading && (
          <div className="feed-empty">Reading latest Dispatch NFTs from X Layer...</div>
        )}

        {error && !isLoading && (
          <div className="feed-empty">Contract read failed: {error}</div>
        )}

        {!isLoading && !error && dispatches.length === 0 && (
          <div className="feed-empty">No Dispatch NFTs minted yet.</div>
        )}

        {!isLoading && !error && dispatches.map((dispatch) => (
          <div key={dispatch.id.toString()} className="feed-item">
            <div className="feed-content">
              <div className="feed-meta">
                <span className={`feed-badge tier-${TIER_LABELS[dispatch.tier]?.toLowerCase() ?? 'charlie'}`}>
                  {TIER_LABELS[dispatch.tier] ?? 'CHARLIE'}
                </span>
                <span className="feed-time">{timeAgo(dispatch.timestamp)}</span>
                {renderStatus(dispatch.status)}
              </div>
              <p className="feed-match">
                #{dispatch.id.toString()} | {dispatch.homeTeam} vs {dispatch.awayTeam} | {dispatch.minute.toString()}&#39;
              </p>
              <p className="feed-text">{truncateText(dispatch.text)}</p>
            </div>
            <a
              className="btn-mint"
              href={`${EXPLORER_URL}/address/${dispatchNftContract.address}`}
              rel="noreferrer"
              target="_blank"
            >
              View NFT
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
