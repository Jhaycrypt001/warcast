'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import DispatchFeed from './components/DispatchFeed';
import Navbar from './components/Navbar';
import { useEffect, useRef } from 'react';

const WarcountDown = dynamic(() => import('./components/WarcountDown'), { ssr: false });

export default function Home() {
  // Animation Refs
  const pipelineRef = useRef<HTMLDivElement>(null);
  const nodeStackRef = useRef<HTMLDivElement>(null);
  const nodeXRef = useRef<HTMLDivElement>(null);
  const nodeShieldRef = useRef<HTMLDivElement>(null);
  const beamPathGlowRef = useRef<SVGPathElement>(null);
  const beamPathCoreRef = useRef<SVGPathElement>(null);
  const gradientRef = useRef<SVGLinearGradientElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);

  // SVG Pipeline Animation Logic
  useEffect(() => {
    let animationFrameId: number;
    let startTimestamp: number | null = null;
    let currentState: 'p1' | 'splash' | 'p2' | 'idle' = 'p1';

    const updatePaths = () => {
      if (!pipelineRef.current || !nodeStackRef.current || !nodeXRef.current || !nodeShieldRef.current || !beamPathCoreRef.current || !beamPathGlowRef.current) return;
      const pRect = pipelineRef.current.getBoundingClientRect();
      const sRect = nodeStackRef.current.getBoundingClientRect();
      const xRect = nodeXRef.current.getBoundingClientRect();
      const shRect = nodeShieldRef.current.getBoundingClientRect();
      const startX = sRect.left + sRect.width / 2 - pRect.left;
      const startY = sRect.top + sRect.height / 2 - pRect.top;
      const midX = xRect.left + xRect.width / 2 - pRect.left;
      const midY = xRect.top + xRect.height / 2 - pRect.top;
      const endX = shRect.left + shRect.width / 2 - pRect.left;
      const endY = shRect.top + shRect.height / 2 - pRect.top;
      const d = `M ${startX},${startY} L ${midX},${midY} L ${endX},${endY}`;
      beamPathCoreRef.current.setAttribute('d', d);
      beamPathGlowRef.current.setAttribute('d', d);
    };

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      if (currentState === 'p1') {
        const pct = Math.min(elapsed / 800, 1);
        const center = pct * 50; 
        if (gradientRef.current) {
          gradientRef.current.setAttribute('x1', `${center - 5}%`);
          gradientRef.current.setAttribute('x2', `${center + 5}%`);
        }
        if (pct < 0.4) nodeStackRef.current?.classList.add('active');
        else nodeStackRef.current?.classList.remove('active');
        if (elapsed >= 800) {
          currentState = 'splash';
          startTimestamp = timestamp;
          beamPathCoreRef.current?.style.setProperty('opacity', '0');
          beamPathGlowRef.current?.style.setProperty('opacity', '0');
          splashRef.current?.classList.add('animate');
        }
      } else if (currentState === 'splash') {
        if (elapsed >= 800) {
          currentState = 'p2';
          startTimestamp = timestamp;
          splashRef.current?.classList.remove('animate');
          beamPathCoreRef.current?.style.setProperty('opacity', '1');
          beamPathGlowRef.current?.style.setProperty('opacity', '0.6');
        }
      } else if (currentState === 'p2') {
        const pct = Math.min(elapsed / 800, 1);
        const center = 50 + (pct * 50); 
        if (gradientRef.current) {
          gradientRef.current.setAttribute('x1', `${center - 5}%`);
          gradientRef.current.setAttribute('x2', `${center + 5}%`);
        }
        if (pct > 0.6) nodeShieldRef.current?.classList.add('active');
        else nodeShieldRef.current?.classList.remove('active');
        if (elapsed >= 800) {
          currentState = 'idle';
          startTimestamp = timestamp;
          nodeShieldRef.current?.classList.remove('active');
        }
      } else if (currentState === 'idle') {
        if (elapsed >= 1000) {
          currentState = 'p1';
          startTimestamp = timestamp;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    updatePaths();
    window.addEventListener('resize', updatePaths);
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', updatePaths);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <Navbar />

      <section className="hero-card">
        <div className="hero-grid"></div>
        
        <div className="icon-pipeline" ref={pipelineRef}>
          <svg className="beam-svg">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" ref={gradientRef} x1="0%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#b04090" stopOpacity="0" />
                <stop offset="20%" stopColor="#b04090" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fff" stopOpacity="1" />
                <stop offset="80%" stopColor="#c8a0e0" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#c8a0e0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path ref={beamPathGlowRef} stroke="url(#beam-gradient)" strokeWidth="2" filter="url(#glow)" fill="none" opacity="0.6" style={{ transition: 'opacity 0.2s' }} />
            <path ref={beamPathCoreRef} stroke="url(#beam-gradient)" strokeWidth="0.8" fill="none" style={{ transition: 'opacity 0.2s' }} />
          </svg>

          {/* Left Node */}
          <div className="icon-node node-light-right" ref={nodeStackRef}>
            <svg viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>

          <div className="pipeline-line"></div>

          {/* Center Splashing Commander Node */}
          <div style={{ position: 'relative' }}>
            <div className="splash" ref={splashRef}></div>
            <div className="icon-node-center" ref={nodeXRef}>
              <svg viewBox="0 0 40 40" style={{ width: 28, height: 28 }}>
                <path d="M12 10l6 8 6-8h6l-9 12 10 12h-6l-7-9-7 9h-6l10-12-9-12z" fill="white"/>
              </svg>
            </div>
          </div>

          <div className="pipeline-line right"></div>

          {/* Right Node */}
          <div className="icon-node node-light-left" ref={nodeShieldRef}>
            <svg viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
        </div>

        <div className="hero-content">
          <h1 className="hero-heading">
            Live War Intelligence<br/>
            <strong>Onchain Proof</strong>
          </h1>
          <p className="hero-sub">
            Autonomous AI commanders detecting real-time tactical events on X Layer. Trade the narrative before the whistle blows.
          </p>
          <Link href="/nation" className="btn-cta">Enlist Faction</Link>
        </div>

        <DispatchFeed />

      </section>

      <WarcountDown />

      <div className="brands">
        <div className="brand-item">X LAYER</div>
        <div className="brand-item">GROQ</div>
        <div className="brand-item">THIRDWEB</div>
        <div className="brand-item">OKLINK</div>
      </div>
    </>
  );
}
