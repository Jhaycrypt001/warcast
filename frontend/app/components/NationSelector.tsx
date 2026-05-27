'use client';

import { useMemo, useState } from 'react';
import { TransactionButton, useActiveAccount, useReadContract } from 'thirdweb/react';
import { prepareContractCall } from 'thirdweb';
import { nationRegistryContract } from '../lib/contracts';

type Confederation = 'Hosts' | 'AFC' | 'CAF' | 'Concacaf' | 'CONMEBOL' | 'OFC' | 'UEFA';

type Faction = {
  id: string;
  name: string;
  code: string;
  confederation: Confederation;
  color: string;
  bonus: string;
};

const FACTIONS: Faction[] = [
  { id: 'Canada', name: 'Canada', code: 'CAN', confederation: 'Hosts', color: '#d52b1e', bonus: 'Host-nation energy with disciplined transitions and direct attacking bursts.' },
  { id: 'Mexico', name: 'Mexico', code: 'MEX', confederation: 'Hosts', color: '#006847', bonus: 'Technical midfield control with fast wide combinations and altitude-tested grit.' },
  { id: 'USA', name: 'USA', code: 'USA', confederation: 'Hosts', color: '#b22234', bonus: 'Athletic pressing, vertical pace, and set-piece pressure from the host front.' },

  { id: 'Australia', name: 'Australia', code: 'AUS', confederation: 'AFC', color: '#00843d', bonus: 'Physical aerial threat and direct Socceroos pressure in both boxes.' },
  { id: 'Iraq', name: 'Iraq', code: 'IRQ', confederation: 'AFC', color: '#007a3d', bonus: 'Resilient defensive shape with rapid counter-strikes through central lanes.' },
  { id: 'IR Iran', name: 'IR Iran', code: 'IRN', confederation: 'AFC', color: '#239f40', bonus: 'Compact structure, set-piece precision, and clinical tournament patience.' },
  { id: 'Japan', name: 'Japan', code: 'JPN', confederation: 'AFC', color: '#bc002d', bonus: 'High-speed combinations, disciplined pressing, and technical overloads.' },
  { id: 'Jordan', name: 'Jordan', code: 'JOR', confederation: 'AFC', color: '#007a3d', bonus: 'Disciplined blocks with precise counters and fearless underdog timing.' },
  { id: 'Korea Republic', name: 'Korea Republic', code: 'KOR', confederation: 'AFC', color: '#003478', bonus: 'Relentless work rate, fast counters, and pressure across the full 90.' },
  { id: 'Qatar', name: 'Qatar', code: 'QAT', confederation: 'AFC', color: '#8d1b3d', bonus: 'Possession buildup with compact spacing and controlled tempo swings.' },
  { id: 'Saudi Arabia', name: 'Saudi Arabia', code: 'KSA', confederation: 'AFC', color: '#006c35', bonus: 'Technical confidence, quick rotations, and shock-result mentality.' },
  { id: 'Uzbekistan', name: 'Uzbekistan', code: 'UZB', confederation: 'AFC', color: '#0099b5', bonus: 'First-timer momentum with organized pressure and direct attacking routes.' },

  { id: 'Algeria', name: 'Algeria', code: 'ALG', confederation: 'CAF', color: '#006233', bonus: 'North African control, quick wing play, and ruthless counter movements.' },
  { id: 'Cabo Verde', name: 'Cabo Verde', code: 'CPV', confederation: 'CAF', color: '#003893', bonus: 'Historic underdog surge with disciplined defensive recovery runs.' },
  { id: 'Congo DR', name: 'Congo DR', code: 'COD', confederation: 'CAF', color: '#007fff', bonus: 'Powerful transitions, physical duels, and dangerous late-box pressure.' },
  { id: "Cote d'Ivoire", name: "Cote d'Ivoire", code: 'CIV', confederation: 'CAF', color: '#f77f00', bonus: 'Physical strength with explosive forward waves and tournament resilience.' },
  { id: 'Egypt', name: 'Egypt', code: 'EGY', confederation: 'CAF', color: '#ce1126', bonus: 'Structured defensive block with elite final-third timing and patience.' },
  { id: 'Ghana', name: 'Ghana', code: 'GHA', confederation: 'CAF', color: '#006b3f', bonus: 'Midfield energy, quick combinations, and Black Stars transition speed.' },
  { id: 'Morocco', name: 'Morocco', code: 'MAR', confederation: 'CAF', color: '#c1272d', bonus: 'Elite defensive organization with dangerous wide overloads.' },
  { id: 'Senegal', name: 'Senegal', code: 'SEN', confederation: 'CAF', color: '#00853f', bonus: 'Athletic power, compact defending, and rapid attack-to-defense resets.' },
  { id: 'South Africa', name: 'South Africa', code: 'RSA', confederation: 'CAF', color: '#007a4d', bonus: 'Combative possession and sharp movement between midfield lines.' },
  { id: 'Tunisia', name: 'Tunisia', code: 'TUN', confederation: 'CAF', color: '#e70013', bonus: 'Compact tactical discipline with efficient opportunistic finishing.' },

  { id: 'Curacao', name: 'Curacao', code: 'CUW', confederation: 'Concacaf', color: '#004b9b', bonus: 'Small-nation chaos factor with brave blocks and direct counters.' },
  { id: 'Haiti', name: 'Haiti', code: 'HAI', confederation: 'Concacaf', color: '#00209f', bonus: 'Explosive counter bursts and emotional momentum under pressure.' },
  { id: 'Panama', name: 'Panama', code: 'PAN', confederation: 'Concacaf', color: '#da121a', bonus: 'Physical direct play, second-ball pressure, and aerial threat.' },

  { id: 'Argentina', name: 'Argentina', code: 'ARG', confederation: 'CONMEBOL', color: '#74acdf', bonus: 'Champion DNA with possession control and clutch late-match finishing.' },
  { id: 'Brazil', name: 'Brazil', code: 'BRA', confederation: 'CONMEBOL', color: '#009c3b', bonus: 'Creative attacking waves, individual flair, and tempo domination.' },
  { id: 'Colombia', name: 'Colombia', code: 'COL', confederation: 'CONMEBOL', color: '#fcd116', bonus: 'Dynamic midfield creativity with electric wide play and intensity.' },
  { id: 'Ecuador', name: 'Ecuador', code: 'ECU', confederation: 'CONMEBOL', color: '#ffd100', bonus: 'Physical pressing, altitude-engine stamina, and set-piece danger.' },
  { id: 'Paraguay', name: 'Paraguay', code: 'PAR', confederation: 'CONMEBOL', color: '#0038a8', bonus: 'Hard defensive duels with rugged counter-attacking routes.' },
  { id: 'Uruguay', name: 'Uruguay', code: 'URU', confederation: 'CONMEBOL', color: '#75aadb', bonus: 'Garra Charrua aggression with veteran tactical intelligence.' },

  { id: 'New Zealand', name: 'New Zealand', code: 'NZL', confederation: 'OFC', color: '#00247d', bonus: 'Direct pressure, physical duels, and All Whites battling tempo.' },

  { id: 'Austria', name: 'Austria', code: 'AUT', confederation: 'UEFA', color: '#ef3340', bonus: 'High-energy gegenpressing with precise vertical buildup.' },
  { id: 'Belgium', name: 'Belgium', code: 'BEL', confederation: 'UEFA', color: '#ef3340', bonus: 'Attacking depth with physical midfield control and final-third craft.' },
  { id: 'Bosnia and Herzegovina', name: 'Bosnia and Herzegovina', code: 'BIH', confederation: 'UEFA', color: '#002395', bonus: 'Veteran edge, compact shape, and smart central combinations.' },
  { id: 'Croatia', name: 'Croatia', code: 'CRO', confederation: 'UEFA', color: '#ff0000', bonus: 'World-class midfield rhythm with knockout-stage patience.' },
  { id: 'Czechia', name: 'Czechia', code: 'CZE', confederation: 'UEFA', color: '#d7141a', bonus: 'Structured pressing with physical box entries and set-piece danger.' },
  { id: 'England', name: 'England', code: 'ENG', confederation: 'UEFA', color: '#cf091c', bonus: 'Set-piece supremacy and elite wide overload attacks.' },
  { id: 'France', name: 'France', code: 'FRA', confederation: 'UEFA', color: '#002395', bonus: 'World-class squad depth with explosive transition football.' },
  { id: 'Germany', name: 'Germany', code: 'GER', confederation: 'UEFA', color: '#3a3a4a', bonus: 'Structured high press, disciplined recovery, and central control.' },
  { id: 'Netherlands', name: 'Netherlands', code: 'NED', confederation: 'UEFA', color: '#ff4f00', bonus: 'Total-football spacing with aggressive lane exploitation.' },
  { id: 'Norway', name: 'Norway', code: 'NOR', confederation: 'UEFA', color: '#ba0c2f', bonus: 'Direct vertical threat with elite striker gravity and fast support runs.' },
  { id: 'Portugal', name: 'Portugal', code: 'POR', confederation: 'UEFA', color: '#006600', bonus: 'Elite wing play with late-game strike pressure and technical depth.' },
  { id: 'Scotland', name: 'Scotland', code: 'SCO', confederation: 'UEFA', color: '#003da5', bonus: 'High-energy pressing with combative defensive shape.' },
  { id: 'Spain', name: 'Spain', code: 'ESP', confederation: 'UEFA', color: '#aa151b', bonus: 'Possession chains, pressing traps, and technical tempo control.' },
  { id: 'Sweden', name: 'Sweden', code: 'SWE', confederation: 'UEFA', color: '#006aa7', bonus: 'Organized defensive blocks with dangerous direct attacking patterns.' },
  { id: 'Switzerland', name: 'Switzerland', code: 'SUI', confederation: 'UEFA', color: '#d52b1e', bonus: 'Tactical flexibility and precision when neutralizing elite teams.' },
  { id: 'Turkiye', name: 'Turkiye', code: 'TUR', confederation: 'UEFA', color: '#e30a17', bonus: 'Passionate intensity, quick attackers, and brave counter pressure.' },
];

const CONFEDERATIONS = ['All', 'Hosts', 'AFC', 'CAF', 'Concacaf', 'CONMEBOL', 'OFC', 'UEFA'] as const;
type Filter = typeof CONFEDERATIONS[number];

function countForFilter(filter: Filter) {
  return filter === 'All'
    ? FACTIONS.length
    : FACTIONS.filter((faction) => faction.confederation === filter).length;
}

export default function NationSelector() {
  const account = useActiveAccount();
  const [selected, setSelected] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const agentAddress = account?.address ?? '0x0000000000000000000000000000000000000000';

  const {
    data: currentNation,
    refetch: refetchCurrentNation,
  } = useReadContract({
    contract: nationRegistryContract,
    method: 'getAgentNation',
    params: [agentAddress],
    queryOptions: {
      enabled: Boolean(account?.address),
      refetchInterval: 15000,
    },
  });

  const filteredFactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return FACTIONS.filter((faction) => {
      const matchesFilter = activeFilter === 'All' || faction.confederation === activeFilter;
      const matchesQuery =
        !normalizedQuery ||
        faction.name.toLowerCase().includes(normalizedQuery) ||
        faction.code.toLowerCase().includes(normalizedQuery) ||
        faction.confederation.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, query]);

  const joinedNation = typeof currentNation === 'string' ? currentNation : '';
  const hasJoinedNation = Boolean(joinedNation);

  return (
    <div className="faction-container">
      <div className="worldcup-field-panel">
        <span className="market-badge">FIFA WORLD CUP 26 FIELD</span>
        <strong>{FACTIONS.length}/48 qualified nations loaded</strong>
      </div>

      {account?.address && hasJoinedNation && (
        <div className="faction-status">
          Current nation: <strong>{joinedNation}</strong>
        </div>
      )}

      <div className="faction-controls">
        <input
          className="faction-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search nation or code"
          value={query}
        />

        <div className="continent-tabs" aria-label="Filter World Cup nations">
          {CONFEDERATIONS.map((filter) => (
            <button
              className={activeFilter === filter ? 'continent-tab active' : 'continent-tab'}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
              <span>{countForFilter(filter)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="faction-grid">
        {filteredFactions.map((faction) => {
          const isSelected = selected === faction.id || joinedNation === faction.id;

          return (
            <div
              className={isSelected ? 'faction-card selected' : 'faction-card'}
              key={faction.id}
              onClick={() => !hasJoinedNation && setSelected(faction.id)}
              style={{
                borderColor: isSelected ? faction.color : undefined,
                boxShadow: isSelected ? `0 8px 30px ${faction.color}35` : undefined,
              }}
            >
              <div className="faction-code" style={{ color: faction.color }}>
                {faction.code}
              </div>

              <h3 className="faction-name">{faction.name}</h3>
              <span className="faction-confed">{faction.confederation}</span>
              <p className="faction-bonus">
                <strong>{faction.bonus}</strong>
              </p>

              <TransactionButton
                className="btn-mint"
                disabled={!account?.address || hasJoinedNation}
                onError={(error) => {
                  alert(`Pledge failed: ${error.message}`);
                }}
                onTransactionConfirmed={() => {
                  refetchCurrentNation();
                  setSelected(faction.id);
                }}
                transaction={() => {
                  return prepareContractCall({
                    contract: nationRegistryContract,
                    method: 'joinNation',
                    params: [faction.id],
                  });
                }}
                unstyled
              >
                {!account?.address
                  ? 'Connect Wallet'
                  : joinedNation === faction.id
                    ? 'Pledged'
                    : hasJoinedNation
                      ? 'Locked'
                      : isSelected
                        ? 'Pledge Loyalty'
                        : 'Select'}
              </TransactionButton>
            </div>
          );
        })}
      </div>

      {filteredFactions.length === 0 && (
        <div className="feed-empty">
          No World Cup nation matches that search.
        </div>
      )}
    </div>
  );
}
