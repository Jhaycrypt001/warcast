'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import NationSelector from '../components/NationSelector';
import Leaderboard from '../components/Leaderboard';

type Tab = 'choose' | 'rankings';

export default function NationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('choose');

  return (
    <>
      <Navbar />

      <div className="arc-gradient" style={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
        <main
          className="dashboard-container"
          style={{ maxWidth: '1000px', flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}
        >
          <div className="dashboard-header">
            <h1 className="dashboard-heading">
              {activeTab === 'choose' ? (
                <>Select Your <strong>Nation</strong></>
              ) : (
                <>War Room <strong>Rankings</strong></>
              )}
            </h1>
            <p className="dashboard-sub">
              {activeTab === 'choose'
                ? 'Pledge your wallet to a World Cup nation faction and push its onchain intelligence score.'
                : 'Live leaderboard of all 48 nations ranked by accuracy score and member count.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="page-tabs">
            <button
              className={activeTab === 'choose' ? 'page-tab active' : 'page-tab'}
              onClick={() => setActiveTab('choose')}
              type="button"
            >
              Choose Faction
            </button>
            <button
              className={activeTab === 'rankings' ? 'page-tab active' : 'page-tab'}
              onClick={() => setActiveTab('rankings')}
              type="button"
            >
              War Room Rankings
            </button>
          </div>

          {activeTab === 'choose' && <NationSelector />}
          {activeTab === 'rankings' && <Leaderboard />}
        </main>
      </div>
    </>
  );
}
