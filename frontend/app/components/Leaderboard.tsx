'use client';

import { useCallback, useEffect, useState } from 'react';
import { readContract } from 'thirdweb';
import { nationRegistryContract } from '../lib/contracts';

// Full NATIONS list extracted from NationSelector FACTIONS
const NATIONS = [
  { id: 'Canada',                  name: 'Canada',                  code: 'CAN', color: '#d52b1e' },
  { id: 'Mexico',                  name: 'Mexico',                  code: 'MEX', color: '#006847' },
  { id: 'USA',                     name: 'USA',                     code: 'USA', color: '#b22234' },
  { id: 'Australia',               name: 'Australia',               code: 'AUS', color: '#00843d' },
  { id: 'Iraq',                    name: 'Iraq',                    code: 'IRQ', color: '#007a3d' },
  { id: 'IR Iran',                 name: 'IR Iran',                 code: 'IRN', color: '#239f40' },
  { id: 'Japan',                   name: 'Japan',                   code: 'JPN', color: '#bc002d' },
  { id: 'Jordan',                  name: 'Jordan',                  code: 'JOR', color: '#007a3d' },
  { id: 'Korea Republic',          name: 'Korea Republic',          code: 'KOR', color: '#003478' },
  { id: 'Qatar',                   name: 'Qatar',                   code: 'QAT', color: '#8d1b3d' },
  { id: 'Saudi Arabia',            name: 'Saudi Arabia',            code: 'KSA', color: '#006c35' },
  { id: 'Uzbekistan',              name: 'Uzbekistan',              code: 'UZB', color: '#0099b5' },
  { id: 'Algeria',                 name: 'Algeria',                 code: 'ALG', color: '#006233' },
  { id: 'Cabo Verde',              name: 'Cabo Verde',              code: 'CPV', color: '#003893' },
  { id: 'Congo DR',                name: 'Congo DR',                code: 'COD', color: '#007fff' },
  { id: "Cote d'Ivoire",           name: "Cote d'Ivoire",           code: 'CIV', color: '#f77f00' },
  { id: 'Egypt',                   name: 'Egypt',                   code: 'EGY', color: '#ce1126' },
  { id: 'Ghana',                   name: 'Ghana',                   code: 'GHA', color: '#006b3f' },
  { id: 'Morocco',                 name: 'Morocco',                 code: 'MAR', color: '#c1272d' },
  { id: 'Senegal',                 name: 'Senegal',                 code: 'SEN', color: '#00853f' },
  { id: 'South Africa',            name: 'South Africa',            code: 'RSA', color: '#007a4d' },
  { id: 'Tunisia',                 name: 'Tunisia',                 code: 'TUN', color: '#e70013' },
  { id: 'Curacao',                 name: 'Curacao',                 code: 'CUW', color: '#004b9b' },
  { id: 'Haiti',                   name: 'Haiti',                   code: 'HAI', color: '#00209f' },
  { id: 'Panama',                  name: 'Panama',                  code: 'PAN', color: '#da121a' },
  { id: 'Argentina',               name: 'Argentina',               code: 'ARG', color: '#74acdf' },
  { id: 'Brazil',                  name: 'Brazil',                  code: 'BRA', color: '#009c3b' },
  { id: 'Colombia',                name: 'Colombia',                code: 'COL', color: '#fcd116' },
  { id: 'Ecuador',                 name: 'Ecuador',                 code: 'ECU', color: '#ffd100' },
  { id: 'Paraguay',                name: 'Paraguay',                code: 'PAR', color: '#0038a8' },
  { id: 'Uruguay',                 name: 'Uruguay',                 code: 'URU', color: '#75aadb' },
  { id: 'New Zealand',             name: 'New Zealand',             code: 'NZL', color: '#00247d' },
  { id: 'Austria',                 name: 'Austria',                 code: 'AUT', color: '#ef3340' },
  { id: 'Belgium',                 name: 'Belgium',                 code: 'BEL', color: '#ef3340' },
  { id: 'Bosnia and Herzegovina',  name: 'Bosnia and Herzegovina',  code: 'BIH', color: '#002395' },
  { id: 'Croatia',                 name: 'Croatia',                 code: 'CRO', color: '#ff0000' },
  { id: 'Czechia',                 name: 'Czechia',                 code: 'CZE', color: '#d7141a' },
  { id: 'England',                 name: 'England',                 code: 'ENG', color: '#cf091c' },
  { id: 'France',                  name: 'France',                  code: 'FRA', color: '#002395' },
  { id: 'Germany',                 name: 'Germany',                 code: 'GER', color: '#3a3a4a' },
  { id: 'Netherlands',             name: 'Netherlands',             code: 'NED', color: '#ff4f00' },
  { id: 'Norway',                  name: 'Norway',                  code: 'NOR', color: '#ba0c2f' },
  { id: 'Portugal',                name: 'Portugal',                code: 'POR', color: '#006600' },
  { id: 'Scotland',                name: 'Scotland',                code: 'SCO', color: '#003da5' },
  { id: 'Spain',                   name: 'Spain',                   code: 'ESP', color: '#aa151b' },
  { id: 'Sweden',                  name: 'Sweden',                  code: 'SWE', color: '#006aa7' },
  { id: 'Switzerland',             name: 'Switzerland',             code: 'SUI', color: '#d52b1e' },
  { id: 'Turkiye',                 name: 'Turkiye',                 code: 'TUR', color: '#e30a17' },
] as const;

type NationEntry = {
  id: string;
  name: string;
  code: string;
  color: string;
  memberCount: bigint;
  accuracyScore: bigint;
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatPoints(score: bigint): string {
  const n = Number(score);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<NationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    const results = await Promise.allSettled(
      NATIONS.map(async (nation) => {
        const [memberCount, accuracyScore] = await Promise.all([
          readContract({
            contract: nationRegistryContract,
            method: 'nationMemberCount',
            params: [nation.id],
          }) as Promise<bigint>,
          readContract({
            contract: nationRegistryContract,
            method: 'nationAccuracyScore',
            params: [nation.id],
          }) as Promise<bigint>,
        ]);
        return {
          id: nation.id,
          name: nation.name,
          code: nation.code,
          color: nation.color,
          memberCount,
          accuracyScore,
        } satisfies NationEntry;
      }),
    );

    const settled: NationEntry[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        settled.push(result.value);
      }
    }

    // Sort: accuracy descending, then memberCount descending as tiebreaker
    settled.sort((a, b) => {
      if (b.accuracyScore !== a.accuracyScore) {
        return b.accuracyScore > a.accuracyScore ? 1 : -1;
      }
      return b.memberCount > a.memberCount ? 1 : -1;
    });

    setEntries(settled);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeaderboard();
    const interval = window.setInterval(() => { void fetchLeaderboard(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchLeaderboard]);

  return (
    <div className="leaderboard-wrapper">
      {/* Header bar */}
      <div className="worldcup-field-panel" style={{ marginBottom: '20px' }}>
        <span className="market-badge">WAR ROOM RANKINGS</span>
        <strong>
          {loading ? 'Loading...' : `${entries.length} nations ranked`}
        </strong>
        {lastUpdated && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {loading && (
        <div className="feed-empty" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '10px', color: 'var(--accent)' }}>Reading NationRegistry...</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Fetching scores for all 48 nations from X Layer Testnet
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="feed-empty">
          Could not load leaderboard data from the contract.
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="leaderboard-table">
          {/* Column headers */}
          <div className="lb-header-row">
            <span className="lb-col-rank">Rank</span>
            <span className="lb-col-code">Code</span>
            <span className="lb-col-name">Nation</span>
            <span className="lb-col-members">Members</span>
            <span className="lb-col-score">Accuracy Score</span>
          </div>

          {entries.map((entry, index) => {
            const rank = index + 1;
            const medal = RANK_MEDALS[rank];
            return (
              <div key={entry.id} className="lb-row" style={{
                background: rank <= 3 ? 'rgba(200,160,224,0.04)' : undefined,
                borderColor: rank <= 3 ? 'rgba(200,160,224,0.12)' : undefined,
              }}>
                <span className="lb-col-rank" style={{ fontFamily: 'monospace', color: rank <= 3 ? '#c8a0e0' : 'var(--text-muted)' }}>
                  {medal ? `${medal} ${rank}` : `#${rank}`}
                </span>
                <span
                  className="lb-col-code"
                  style={{
                    color: entry.color,
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                  }}
                >
                  {entry.code}
                </span>
                <span className="lb-col-name" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                  {entry.name}
                </span>
                <span className="lb-col-members" style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {entry.memberCount.toString()}
                </span>
                <span className="lb-col-score" style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                  {formatPoints(entry.accuracyScore)} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
