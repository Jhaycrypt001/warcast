'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import Navbar from '../components/Navbar';
import {
  agentRankContract,
  dispatchNftContract,
  nationRegistryContract,
} from "../lib/contracts";

const TIER_LABELS = ['CHARLIE', 'BRAVO', 'ALPHA'] as const;
const STATUS_LABELS = ['PENDING', 'CONFIRMED', 'BURNED'] as const;

function renderStatus(status: string) {
  if (status === 'CONFIRMED') return <span className="dispatch-status status-confirmed">&#10003; CONFIRMED</span>;
  if (status === 'BURNED')    return <span className="dispatch-status status-burned">&#10007; BURNED</span>;
  return <span className="dispatch-status status-active">&#9711; ACTIVE INTEL</span>;
}

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

type OwnedDispatch = {
  id: bigint;
  balance: bigint;
  tier: string;
  status: string;
  match: string;
  minute: bigint;
  text: string;
};

const RANK_THRESHOLDS = [
  { min: 0,    max: 99,   name: 'Recruit Scout' },
  { min: 100,  max: 299,  name: 'Tactical Analyst' },
  { min: 300,  max: 699,  name: 'Intelligence Officer' },
  { min: 700,  max: 1499, name: 'War Room Strategist' },
  { min: 1500, max: Infinity, name: 'Supreme Commander' },
] as const;

function getRankInfo(pts: bigint) {
  const n = Number(pts);
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    const tier = RANK_THRESHOLDS[i];
    if (n <= tier.max) {
      const isMax = i === RANK_THRESHOLDS.length - 1;
      const nextTier = isMax ? null : RANK_THRESHOLDS[i + 1];
      const rangeSize = isMax ? 1 : tier.max - tier.min + 1;
      const progress = isMax ? 100 : Math.min(100, ((n - tier.min) / rangeSize) * 100);
      return {
        name: tier.name,
        isMax,
        pointsInTier: n - tier.min,
        tierSize: isMax ? null : rangeSize,
        pointsToNext: isMax ? 0 : (nextTier ? nextTier.min - n : 0),
        nextRankName: nextTier?.name ?? null,
        progress,
      };
    }
  }
  return {
    name: 'Supreme Commander',
    isMax: true,
    pointsInTier: n,
    tierSize: null,
    pointsToNext: 0,
    nextRankName: null,
    progress: 100,
  };
}

export default function AgentPage() {
  const account = useActiveAccount();
  const agentAddress = account?.address ?? '0x0000000000000000000000000000000000000000';
  const [holdings, setHoldings] = useState<OwnedDispatch[]>([]);
  const [loadingHoldings, setLoadingHoldings] = useState(true);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);

  const { data: rank = 'Recruit Scout' } = useReadContract({
    contract: agentRankContract,
    method: 'getAgentRank',
    params: [agentAddress],
    queryOptions: {
      enabled: Boolean(account?.address),
      refetchInterval: 15000,
    },
  });

  const { data: points = 0n } = useReadContract({
    contract: agentRankContract,
    method: 'agentPoints',
    params: [agentAddress],
    queryOptions: {
      enabled: Boolean(account?.address),
      refetchInterval: 15000,
    },
  });

  const { data: nation = '' } = useReadContract({
    contract: nationRegistryContract,
    method: 'getAgentNation',
    params: [agentAddress],
    queryOptions: {
      enabled: Boolean(account?.address),
      refetchInterval: 15000,
    },
  });

  const { data: dispatchCount = 0n } = useReadContract({
    contract: dispatchNftContract,
    method: 'dispatchCount',
    params: [],
    queryOptions: {
      refetchInterval: 30000,
    },
  });

  const rankInfo = getRankInfo(typeof points === 'bigint' ? points : BigInt(points));

  useEffect(() => {
    let alive = true;

    async function loadHoldings() {
      setLoadingHoldings(true);
      setHoldingsError(null);

      try {
        if (!account?.address || dispatchCount === 0n) {
          if (alive) {
            setHoldings([]);
          }
          return;
        }

        const ids = Array.from({ length: Number(dispatchCount) }, (_, index) => BigInt(index + 1));

        const ownedDispatches = await Promise.all(
          ids.map(async (dispatchId) => {
            const balance = (await readContract({
              contract: dispatchNftContract,
              method: 'balanceOf',
              params: [account.address, dispatchId],
            })) as bigint;

            if (balance === 0n) {
              return null;
            }

            const dispatch = (await readContract({
              contract: dispatchNftContract,
              method: 'getDispatch',
              params: [dispatchId],
            })) as DispatchContractData;

            return {
              id: dispatchId,
              balance,
              tier: TIER_LABELS[Number(dispatch.tier)] ?? 'CHARLIE',
              status: STATUS_LABELS[Number(dispatch.status)] ?? 'PENDING',
              match: `${dispatch.homeTeam} vs ${dispatch.awayTeam}`,
              minute: dispatch.minute,
              text: dispatch.dispatchText,
            };
          }),
        );

        if (alive) {
          const filteredHoldings = ownedDispatches.reduce<OwnedDispatch[]>((acc, item) => {
            if (item) {
              acc.push(item);
            }
            return acc;
          }, []);
          setHoldings(filteredHoldings);
        }
      } catch (error) {
        if (alive) {
          setHoldingsError(error instanceof Error ? error.message : 'Unable to read onchain holdings');
        }
      } finally {
        if (alive) {
          setLoadingHoldings(false);
        }
      }
    }

    loadHoldings();
    const interval = window.setInterval(loadHoldings, 30000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [account?.address, dispatchCount]);

  return (
    <>
      <Navbar />

      <div className="arc-gradient">
        <main className="dashboard-container" style={{ maxWidth: '1000px' }}>
          <div className="dashboard-header" style={{ textAlign: 'left', marginBottom: '40px' }}>
            <h1 className="dashboard-heading" style={{ fontSize: '2rem' }}>
              Agent <strong>Profile</strong>
            </h1>
            <p className="dashboard-sub" style={{ margin: '0' }}>
              Live rank, faction, points, and the dispatch NFTs held by this wallet.
            </p>
          </div>

          <div className="agent-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Current Rank</span>
              <span className="stat-value" style={{ color: 'white' }}>{rank}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Faction</span>
              <span className="stat-value" style={{ color: '#ef4444' }}>
                {nation || 'Unassigned'}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Trade Points</span>
              <span className="stat-value" style={{ color: '#10b981' }}>{points.toString()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Dispatch Holdings</span>
              <span className="stat-value" style={{ color: '#c8a0e0' }}>{holdings.length}</span>
            </div>
          </div>

          {/* Rank Progress Bar */}
          <div className="rank-progress-panel">
            <p className="rank-progress-title">Rank Progression</p>
            <p className="rank-name-display">{rankInfo.name}</p>
            <div className="rank-bar-track">
              <div
                className={`rank-bar-fill${rankInfo.isMax ? ' max-rank' : ''}`}
                style={{ width: `${rankInfo.progress}%` }}
              />
            </div>
            <div className="rank-progress-meta">
              <span>
                {rankInfo.isMax ? (
                  <span style={{ color: '#ffd700', fontWeight: 700 }}>MAX RANK ACHIEVED</span>
                ) : (
                  <>
                    <span style={{ color: 'var(--text)' }}>
                      {rankInfo.pointsInTier}
                    </span>
                    {rankInfo.tierSize !== null && (
                      <span> / {rankInfo.tierSize} pts in tier</span>
                    )}
                  </>
                )}
              </span>
              {!rankInfo.isMax && rankInfo.nextRankName && (
                <span className="rank-next-label">
                  {rankInfo.pointsToNext} pts to {rankInfo.nextRankName}
                </span>
              )}
            </div>
          </div>

          <div className="agent-content-split">
            <div className="agent-inventory">
              <h3 className="section-title">Active Intel</h3>
              {loadingHoldings && <div className="feed-empty">Reading wallet holdings from DispatchNFT...</div>}
              {holdingsError && !loadingHoldings && <div className="feed-empty">Holdings read failed: {holdingsError}</div>}
              {!loadingHoldings && !holdingsError && holdings.length === 0 && (
                <div className="feed-empty">No dispatch NFTs in this wallet yet.</div>
              )}
              <div className="market-grid" style={{ gridTemplateColumns: '1fr' }}>
                {holdings.map((dispatch) => (
                  <div key={dispatch.id.toString()} className="market-card">
                    <div className="market-card-header">
                      <span className="market-badge">{dispatch.tier}</span>
                      <span className="market-time">Dispatch #{dispatch.id.toString()}</span>
                    </div>

                    <div className="market-details" style={{ marginBottom: '12px' }}>
                      <div className="detail-row">
                        <span className="detail-label" style={{ fontSize: '0.8rem' }}>Match</span>
                        <span className="detail-value" style={{ fontSize: '0.85rem' }}>{dispatch.match}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label" style={{ fontSize: '0.8rem' }}>Minute</span>
                        <span className="detail-value" style={{ fontSize: '0.85rem' }}>{dispatch.minute.toString()}&#39;</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label" style={{ fontSize: '0.8rem' }}>Status</span>
                        <span className="detail-value">{renderStatus(dispatch.status)}</span>
                      </div>
                    </div>

                    <p className="feed-text" style={{ maxWidth: 'none' }}>{dispatch.text}</p>
                    <div className="market-actions" style={{ marginTop: '16px' }}>
                      <Link href="/market" className="btn-buy" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        List on Market
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="agent-history">
              <h3 className="section-title">Combat Log</h3>
              <div className="history-list">
                <div className="history-item">
                  <div className="history-left">
                    <span className="history-action" style={{ color: '#10b981' }}>RANK</span>
                    <span className="history-target">{rank}</span>
                  </div>
                  <div className="history-right">
                    <span className="history-time">Current profile</span>
                    <span className="history-tx">{account?.address ?? 'Wallet disconnected'}</span>
                  </div>
                </div>
                <div className="history-item">
                  <div className="history-left">
                    <span className="history-action" style={{ color: '#c8a0e0' }}>POINTS</span>
                    <span className="history-target">{points.toString()}</span>
                  </div>
                  <div className="history-right">
                    <span className="history-time">Onchain score</span>
                    <span className="history-tx">{nation || 'No nation selected'}</span>
                  </div>
                </div>
                <div className="history-item">
                  <div className="history-left">
                    <span className="history-action" style={{ color: '#ef4444' }}>CHAIN</span>
                    <span className="history-target">X Layer Testnet</span>
                  </div>
                  <div className="history-right">
                    <span className="history-time">1952</span>
                    <span className="history-tx">OKLink supported</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
