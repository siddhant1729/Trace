'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const FEATURES = [
  {
    icon: (
      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    number: '01',
    title: 'Neural Mapping',
    description:
      'Trace uses advanced AI to predict your architectural needs, suggesting nodes and connections before you even draw them.',
  },
  {
    icon: (
      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    number: '02',
    title: 'Glass Sync',
    description:
      "Real-time collaboration through transparent, multi-layered interfaces. Watch your team's changes ripple through the void.",
  },
  {
    icon: (
      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    number: '03',
    title: 'Void Mode',
    description:
      'Enter a state of pure focus. All UI elements dim to 10% opacity, leaving only your code block visible against the starfield.',
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    const spot = spotlightRef.current;
    if (!el || !spot) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = x / rect.width;
    const cy = y / rect.height;

    // Spotlight
    spot.style.background = `radial-gradient(500px circle at ${x}px ${y}px, rgba(255,255,255,0.07), transparent 50%)`;
    spot.style.opacity = '1';

    // 3D tilt
    const tiltX = (cy - 0.5) * -6;
    const tiltY = (cx - 0.5) * 6;
    el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    const spot = spotlightRef.current;
    if (el) el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    if (spot) spot.style.opacity = '0';
    setHovered(false);
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: hovered ? '1px solid rgba(255,255,255,0.28)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '52px 44px 44px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease, transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
        boxShadow: hovered ? '0 0 28px rgba(255,255,255,0.07)' : 'none',
        maskImage: 'linear-gradient(to bottom, black 72%, transparent 100%)',
        opacity: visible ? 1 : 0,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        transitionDelay: visible ? '0s' : `${index * 0.14}s`,
      }}
    >
      {/* Cursor spotlight overlay */}
      <div
        ref={spotlightRef}
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
      <div style={{ position: 'absolute', top: 0, left: 0, width: '50px', height: '1px', background: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)', borderTopLeftRadius: '0.75rem', transition: 'background 0.3s ease, width 0.4s ease', ...(hovered ? { width: '100px' } : {}) }} />

      {/* Icon */}
      <div
        className="text-white"
        style={{ marginBottom: '36px', transform: hovered ? 'scale(1.12) translateY(-4px)' : 'scale(1) translateY(0)', transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.32, 1)', filter: hovered ? 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' : 'none' }}
      >
        {feature.icon}
      </div>

      {/* Content */}
      <div style={{ marginBottom: '48px', position: 'relative', zIndex: 2 }}>
        <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 600, color: 'white', marginBottom: '16px', lineHeight: '1.3' }}>
          {feature.title}
        </h3>
        <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', color: hovered ? 'rgba(196,199,200,0.8)' : 'rgba(196,199,200,0.6)', lineHeight: '1.75', transition: 'color 0.3s ease' }}>
          {feature.description}
        </p>
      </div>

      {/* Number rule */}
      <div className="flex items-center gap-4" style={{ position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '13px', color: hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)', transition: 'color 0.3s ease', textShadow: hovered ? '0 0 20px rgba(255,255,255,0.5)' : 'none' }}>
          {feature.number}
        </span>
        <div style={{ height: '1px', flexGrow: 1, background: hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)', transition: 'background 0.3s ease' }} />
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="void" className="relative z-10" style={{ padding: '140px 48px', background: 'rgba(0,0,0,0.45)' }}>
      <div className="max-w-[1440px] mx-auto">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-end" style={{ marginBottom: '80px', gap: '32px' }}>
          <div style={{ maxWidth: '600px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700, color: 'white', lineHeight: '1.1', letterSpacing: '-0.03em', marginBottom: '24px' }}>
              Designed for the{' '}
              <span style={{ color: 'rgba(255,255,255,0.22)' }}>Focused</span>
            </h2>
            <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '16px', color: 'rgba(196,199,200,0.6)', lineHeight: '1.75' }}>
              A workspace that respects your attention. No clutter, only clarity. Built on the principles of
              minimalism and high-performance engineering.
            </p>
          </div>
          <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.3em', textTransform: 'uppercase', paddingBottom: '6px' }}>
            [Core Modules]
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '24px' }}>
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
