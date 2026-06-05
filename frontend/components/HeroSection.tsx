'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const glowTextRef = useRef<HTMLDivElement>(null);

  // Entrance animation
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

  // Cursor-reactive hero orb + wordmark tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = x / rect.width;   // 0 → 1
    const cy = y / rect.height;  // 0 → 1

    // Move the ambient orb toward cursor
    if (orbRef.current) {
      orbRef.current.style.transform = `translate(${-50 + (cx - 0.5) * 30}%, ${-50 + (cy - 0.5) * 30}%)`;
      orbRef.current.style.opacity = '1';
    }

    // 3D tilt on wordmark
    if (wordmarkRef.current) {
      const tiltX = (cy - 0.5) * -8;
      const tiltY = (cx - 0.5) * 10;
      wordmarkRef.current.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    }

    // Cursor-following text glow
    if (glowTextRef.current) {
      glowTextRef.current.style.background = `radial-gradient(400px circle at ${x}px ${y - (rect.height * 0.25)}px, rgba(255,255,255,0.25), rgba(255,255,255,0.05) 40%, transparent 70%)`;
      glowTextRef.current.style.webkitBackgroundClip = 'text';
      glowTextRef.current.style.backgroundClip = 'text';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (orbRef.current) {
      orbRef.current.style.transform = 'translate(-50%, -50%)';
      orbRef.current.style.opacity = '0.6';
    }
    if (wordmarkRef.current) {
      wordmarkRef.current.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    }
    if (glowTextRef.current) {
      glowTextRef.current.style.background = 'none';
      glowTextRef.current.style.webkitTextFillColor = 'unset';
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      id="nebula"
      className="relative z-10 flex flex-col items-center justify-center text-center px-6 md:px-16"
      style={{ minHeight: '100vh', paddingTop: '140px', paddingBottom: '120px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cursor-reactive large light orb */}
      <div
        ref={orbRef}
        className="absolute pointer-events-none"
        style={{
          top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '900px', height: '600px',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0) 65%)',
          filter: 'blur(60px)', zIndex: 0,
          transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.6s ease',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />

      {/* Status chip */}
      <div
        ref={chipRef}
        className="relative z-10 inline-flex items-center gap-3 px-5 py-2.5 group"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '9999px',
          marginBottom: '48px',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          cursor: 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-white" style={{ animation: 'cosmicPulse 1.5s infinite' }} />
        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          System Active: V.2.0.4
        </span>
      </div>

      {/* Giant wordmark — 3D tilt + cursor glow */}
      <div
        ref={wordmarkRef}
        className="relative z-10 uppercase font-bold leading-none select-none"
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: 'clamp(96px, 18vw, 200px)',
          letterSpacing: '-0.04em',
          lineHeight: '0.9',
          marginBottom: '36px',
          color: 'transparent',
          WebkitTextStroke: '0px white',
          transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
        aria-hidden="true"
      >
        {/* Base text */}
        <span style={{ color: 'white', position: 'relative' }}>
          {'Trace'.split('').map((letter, i) => (
            <span
              key={i}
              className="hero-letter"
              style={{
                display: 'inline-block',
                transition: 'transform 0.3s ease, text-shadow 0.3s ease, color 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.08)';
                e.currentTarget.style.textShadow = '0 0 40px rgba(255,255,255,0.6), 0 0 80px rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              {letter}
            </span>
          ))}
        </span>

        {/* Cursor-following glow overlay */}
        <div
          ref={glowTextRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: 'inherit',
            lineHeight: 'inherit',
            WebkitTextFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            mixBlendMode: 'screen',
          }}
          aria-hidden="true"
        >
          Trace
        </div>
      </div>

      {/* Main headline */}
      <h1
        ref={headlineRef}
        className="relative z-10 text-white font-bold max-w-3xl mx-auto"
        style={{
          fontFamily: 'Space Grotesk, sans-serif',
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
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: '17px',
          color: 'rgba(196,199,200,0.65)',
          lineHeight: '1.75',
          marginBottom: '56px',
        }}
      >
        The architecture of tomorrow, rendered in real-time. Trace bridges the gap between
        conceptual nodes and executable logic with a cinematic workspace designed for the elite.
      </p>

      {/* CTAs — enhanced hover */}
      <div ref={ctaRef} className="relative z-10 flex flex-col sm:flex-row gap-5">
        <button
          id="hero-cta-primary"
          onClick={() => router.push('/chat')}
          className="bg-white text-[#2f3131] font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:shadow-[0_0_32px_rgba(255,255,255,0.45)] active:scale-95"
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '12px',
            padding: '18px 52px',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            e.currentTarget.style.background = `radial-gradient(100px circle at ${x}px ${y}px, rgba(200,200,200,1), white 60%)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
          }}
        >
          Start Mapping
        </button>
        <button
          id="hero-cta-secondary"
          onClick={() => document.getElementById('void')?.scrollIntoView({ behavior: 'smooth' })}
          className="font-semibold uppercase tracking-[0.12em] text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-300"
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: '12px',
            padding: '18px 52px',
            border: '1px solid rgba(255,255,255,0.18)',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            e.currentTarget.style.boxShadow = `inset 0 0 60px rgba(255,255,255,0.06)`;
            e.currentTarget.style.borderImage = 'none';
            e.currentTarget.style.background = `radial-gradient(80px circle at ${x}px ${y}px, rgba(255,255,255,0.08), transparent 70%)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = 'transparent';
          }}
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
