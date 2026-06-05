'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const METRICS = [
  { value: '10×', label: 'Faster Iteration' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<12ms', label: 'Avg Latency' },
];

function MetricCard({ metric }: { metric: typeof METRICS[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="text-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'default', transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }}
    >
      <div style={{
        fontFamily: 'Space Grotesk, sans-serif',
        fontSize: 'clamp(36px, 5vw, 56px)',
        fontWeight: 700,
        color: 'white',
        letterSpacing: '-0.04em',
        lineHeight: '1',
        marginBottom: '12px',
        textShadow: hovered ? '0 0 40px rgba(255,255,255,0.4)' : 'none',
        transition: 'text-shadow 0.3s ease',
      }}>
        {metric.value}
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: hovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        transition: 'color 0.3s ease',
      }}>
        {metric.label}
      </div>
    </div>
  );
}

export default function CtaSection() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    const spot = spotRef.current;
    if (!el || !spot) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = x / rect.width;
    const cy = y / rect.height;

    spot.style.background = `radial-gradient(700px circle at ${x}px ${y}px, rgba(255,255,255,0.06), transparent 50%)`;
    spot.style.opacity = '1';

    const tiltX = (cy - 0.5) * -3;
    const tiltY = (cx - 0.5) * 3;
    el.style.transform = visible
      ? `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(0)`
      : 'translateY(48px)';
  }, [visible]);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    const spot = spotRef.current;
    if (el) el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
    if (spot) spot.style.opacity = '0';
  }, []);

  return (
    <section id="pulse" className="relative z-10" style={{ padding: '140px 48px 160px' }}>
      <div className="max-w-[1440px] mx-auto">

        {/* Metrics row */}
        <div className="grid grid-cols-3 max-w-2xl mx-auto" style={{ gap: '16px', marginBottom: '120px' }}>
          {METRICS.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>

        {/* CTA Glass Panel */}
        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="text-center relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '100px 48px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(48px)',
            transition: 'opacity 1s ease, transform 0.4s cubic-bezier(0.23,1,0.32,1), border-color 0.3s ease, box-shadow 0.3s ease',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Spotlight overlay */}
          <div
            ref={spotRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              pointerEvents: 'none',
              zIndex: 1,
              opacity: 0,
              transition: 'opacity 0.4s ease',
            }}
          />

          {/* Specular highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '1px', background: 'rgba(255,255,255,0.45)', borderTopLeftRadius: '1rem' }} />

          {/* Glow orb */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '350px', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.035) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} aria-hidden="true" />

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2.5 mx-auto"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9999px', padding: '8px 18px', marginBottom: '48px', position: 'relative', zIndex: 2 }}
          >
            <span className="w-2 h-2 rounded-full bg-white inline-block" style={{ animation: 'cosmicPulse 1.5s infinite' }} />
            <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Now in Beta
            </span>
          </div>

          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 700, color: 'white', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '28px', position: 'relative', zIndex: 2 }}>
            Ready to enter
            <br />
            <span style={{ color: 'rgba(255,255,255,0.32)' }}>the void?</span>
          </h2>

          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '16px', color: 'rgba(196,199,200,0.6)', lineHeight: '1.75', maxWidth: '520px', margin: '0 auto 56px', position: 'relative', zIndex: 2 }}>
            Join thousands of engineers already using Trace to turn their architectural vision
            into production-ready systems at the speed of thought.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center" style={{ position: 'relative', zIndex: 2 }}>
            <button
              id="cta-primary"
              onClick={() => router.push('/chat')}
              className="bg-white text-[#2f3131] font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:shadow-[0_0_32px_rgba(255,255,255,0.45)] active:scale-95"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', padding: '18px 56px', overflow: 'hidden', position: 'relative' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                e.currentTarget.style.background = `radial-gradient(100px circle at ${x}px 50%, rgba(200,200,200,1), white 60%)`;
              }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
            >
              Request Access
            </button>
            <button
              id="cta-secondary"
              onClick={() => document.getElementById('void')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/60 hover:text-white font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:bg-white/10 active:scale-95"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', padding: '18px 56px', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden', position: 'relative' }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.background = `radial-gradient(80px circle at ${x}px ${y}px, rgba(255,255,255,0.08), transparent 70%)`;
              }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cosmicPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </section>
  );
}
