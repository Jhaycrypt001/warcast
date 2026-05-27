'use client';

import { useEffect, useState } from 'react';

// Opening match: Mexico vs ? — June 11, 2026 at 22:00 UTC (Estadio Azteca kickoff)
const WC2026_START = new Date('2026-06-11T22:00:00Z').getTime();

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  started: boolean;
};

function calcTimeLeft(): TimeLeft {
  const diff = WC2026_START - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, started: true };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    started: false,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function WarcountDown() {
  const [t, setT] = useState<TimeLeft>(calcTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setT(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (t.started) {
    return (
      <div className="countdown-banner">
        <span className="countdown-label">WC2026 DEPLOYMENT STATUS</span>
        <span className="countdown-live">&#9889; TOURNAMENT ACTIVE — WARCAST COMMANDER ONLINE</span>
        <span className="countdown-event">48 NATIONS · USA · CANADA · MEXICO</span>
      </div>
    );
  }

  return (
    <div className="countdown-banner">
      <span className="countdown-label">&#9711; WC2026 DEPLOYMENT COUNTDOWN</span>

      <div className="countdown-units">
        <div className="countdown-unit">
          <span className="countdown-num">{t.days}</span>
          <span className="countdown-sub">DAYS</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-num">{pad(t.hours)}</span>
          <span className="countdown-sub">HRS</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-num">{pad(t.minutes)}</span>
          <span className="countdown-sub">MIN</span>
        </div>
        <span className="countdown-sep">:</span>
        <div className="countdown-unit">
          <span className="countdown-num">{pad(t.seconds)}</span>
          <span className="countdown-sub">SEC</span>
        </div>
      </div>

      <span className="countdown-event">JUNE 11 · OPENING MATCH · 48 NATIONS · USA · CANADA · MEXICO</span>
    </div>
  );
}
