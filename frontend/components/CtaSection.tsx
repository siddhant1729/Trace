'use client';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const METRICS = [
  { value: '10×', label: 'Faster Iteration' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '<12ms', label: 'Avg Latency' },
];

export default function CtaSection() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <section id="pulse" className="relative z-10" style={{ padding: '140px 48px 160px' }}>
      <div className="max-w-[1440px] mx-auto">

        {/* Metrics row */}
        <div className="grid grid-cols-3 max-w-2xl mx-auto" style={{ gap: '16px', marginBottom: '120px' }}>
          {METRICS.map((m) => (
            <div key={m.label} className="text-center">
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: 'white', letterSpacing: '-0.04em', lineHeight: '1', marginBottom: '12px' }}>
                {m.value}
              </div>
              <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Glass Panel */}
        <div
          ref={ref}
          className="text-center relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '100px 48px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(48px)',
            transition: 'opacity 1s ease, transform 1s ease',
          }}
        >
          {/* Specular highlight */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100px', height: '1px', background: 'rgba(255,255,255,0.45)', borderTopLeftRadius: '1rem' }} />

          {/* Glow orb */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '350px', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.035) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} aria-hidden="true" />

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2.5 mx-auto"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9999px', padding: '8px 18px', marginBottom: '48px' }}
          >
            <span className="w-2 h-2 rounded-full bg-white inline-block" style={{ animation: 'cosmicPulse 1.5s infinite' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Now in Beta
            </span>
          </div>

          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 700, color: 'white', lineHeight: '1.1', letterSpacing: '-0.04em', marginBottom: '28px', position: 'relative', zIndex: 1 }}>
            Ready to enter
            <br />
            <span style={{ color: 'rgba(255,255,255,0.32)' }}>the void?</span>
          </h2>

          <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '16px', color: 'rgba(196,199,200,0.6)', lineHeight: '1.75', maxWidth: '520px', margin: '0 auto 56px', position: 'relative', zIndex: 1 }}>
            Join thousands of engineers already using Trace to turn their architectural vision
            into production-ready systems at the speed of thought.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center" style={{ position: 'relative', zIndex: 1 }}>
            <button
              id="cta-primary"
              onClick={() => router.push('/chat')}
              className="bg-white text-[#2f3131] font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:shadow-[0_0_32px_rgba(255,255,255,0.45)] active:scale-95"
              style={{ fontFamily: 'Geist, sans-serif', fontSize: '12px', padding: '18px 56px' }}
            >
              Request Access
            </button>
            <button
              id="cta-secondary"
              onClick={() => document.getElementById('void')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-white/60 hover:text-white font-semibold uppercase tracking-[0.12em] transition-all duration-300 hover:bg-white/10 active:scale-95"
              style={{ fontFamily: 'Geist, sans-serif', fontSize: '12px', padding: '18px 56px', border: '1px solid rgba(255,255,255,0.15)' }}
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
