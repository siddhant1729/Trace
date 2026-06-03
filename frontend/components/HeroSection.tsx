'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const router = useRouter();
  const chipRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [chipRef.current, wordmarkRef.current, headlineRef.current, subRef.current, ctaRef.current];
    els.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      setTimeout(() => {
        el.style.transition = 'opacity 1s ease, transform 1s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 150 + i * 200);
    });
  }, []);

  return (
    <section
      id="nebula"
      className="relative z-10 flex flex-col items-center justify-center text-center px-6 md:px-16"
      style={{ minHeight: '100vh', paddingTop: '140px', paddingBottom: '120px' }}
    >
      {/* Large light leak orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: '800px', height: '500px',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 65%)',
          filter: 'blur(60px)', zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Status chip */}
      <div
        ref={chipRef}
        className="relative z-10 inline-flex items-center gap-3 px-5 py-2.5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '9999px',
          marginBottom: '48px',
        }}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-white" style={{ animation: 'cosmicPulse 1.5s infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          System Active: V.2.0.4
        </span>
      </div>

      {/* Giant wordmark */}
      <div
        ref={wordmarkRef}
        className="relative z-10 text-white uppercase font-bold leading-none select-none"
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 'clamp(96px, 18vw, 200px)',
          letterSpacing: '-0.04em',
          lineHeight: '0.9',
          marginBottom: '36px',
        }}
        aria-hidden="true"
      >
        Trace
      </div>

      {/* Main headline */}
      <h1
        ref={headlineRef}
        className="relative z-10 text-white font-bold max-w-3xl mx-auto"
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 'clamp(28px, 4.5vw, 64px)',
          lineHeight: '1.1',
          letterSpacing: '-0.03em',
          marginBottom: '32px',
          color: 'rgba(255,255,255,0.85)',
        }}
      >
        Diagrams to Reality
      </h1>

      {/* Sub-headline */}
      <p
        ref={subRef}
        className="relative z-10 max-w-lg mx-auto"
        style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: '17px',
          color: 'rgba(196,199,200,0.65)',
          lineHeight: '1.75',
          marginBottom: '56px',
        }}
      >
        The architecture of tomorrow, rendered in real-time. Trace bridges the gap between
        conceptual nodes and executable logic with a cinematic workspace designed for the elite.
      </p>

      {/* CTAs */}
      <div ref={ctaRef} className="relative z-10 flex flex-col sm:flex-row gap-5">
        <button
          id="hero-cta-primary"
          onClick={() => router.push('/chat')}
          className="bg-white text-[#2f3131] font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:shadow-[0_0_32px_rgba(255,255,255,0.45)] active:scale-95"
          style={{ fontFamily: 'Geist, sans-serif', fontSize: '12px', padding: '18px 52px' }}
        >
          Start Mapping
        </button>
        <button
          id="hero-cta-secondary"
          onClick={() => document.getElementById('void')?.scrollIntoView({ behavior: 'smooth' })}
          className="font-semibold uppercase tracking-[0.12em] text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-300"
          style={{ fontFamily: 'Geist, sans-serif', fontSize: '12px', padding: '18px 52px', border: '1px solid rgba(255,255,255,0.18)' }}
        >
          View Documentation
        </button>
      </div>

      {/* Scroll hint line */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-25" aria-hidden="true">
        <div className="w-px h-16 bg-gradient-to-b from-transparent to-white" style={{ animation: 'scrollPulse 2.5s infinite' }} />
      </div>

      <style>{`
        @keyframes cosmicPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
