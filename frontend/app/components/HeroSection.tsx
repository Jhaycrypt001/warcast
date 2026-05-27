import React, { Suspense } from 'react';

// Lazy load the Spline component to prevent initial render blocking
const Spline = React.lazy(() => import('@splinetool/react-spline'));

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-end bg-hero-bg overflow-hidden">
      
      {/* 3D Spline Background */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="absolute inset-0 bg-hero-bg" />}>
          <Spline
            scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Dark Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/40 z-[1] pointer-events-none" />

      {/* Content Container - Anchored Bottom Left */}
      <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-10 md:pb-16 pt-32">
        
        <h1 
          className="text-[clamp(3rem,8vw,6rem)] font-bold leading-[1.05] tracking-[-0.05em] text-foreground mb-2 md:mb-4 uppercase opacity-0 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          WARCAST<span className="text-primary">.AI</span>
        </h1>

        <p 
          className="text-foreground/90 text-[clamp(1.125rem,2.5vw,1.875rem)] font-light mb-3 md:mb-6 opacity-0 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          Live tactical intelligence.
        </p>

        <p 
          className="text-muted-foreground text-[clamp(0.875rem,1.5vw,1.25rem)] font-light mb-6 md:mb-8 opacity-0 animate-fade-up max-w-xl"
          style={{ animationDelay: "0.55s" }}
        >
          Trade on-chain tactical dispatches before the opening whistle. AI-powered match surveillance deployed with autonomous agent commanders. Choose your nation. Own the intel.
        </p>

        <div 
          className="flex flex-wrap gap-3 font-bold opacity-0 animate-fade-up"
          style={{ animationDelay: "0.7s" }}
        >
          <a href="/nation" className="pointer-events-auto bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] uppercase tracking-wider">
            Choose Nation
          </a>
          <a href="/market" className="pointer-events-auto bg-white text-background px-6 py-3 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-90 transition-all active:scale-[0.97] uppercase tracking-wider">
            Intel Market
          </a>
        </div>

        <p 
          className="text-muted-foreground/50 text-xs font-light mt-6 md:mt-8 opacity-0 animate-fade-up font-mono"
          style={{ animationDelay: "0.85s" }}
        >
          Powered by X Layer. Autonomous Commander V-800 Active. 14,021 Dispatches Mined.
        </p>
        
      </div>
    </section>
  );
}
