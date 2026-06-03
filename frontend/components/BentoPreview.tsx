'use client';
import React from 'react';

const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  position: 'relative',
};

function CanvasMockup() {
  return (
    <svg viewBox="0 0 800 400" className="w-full" style={{ display: 'block' }} aria-label="Trace Canvas Preview">
      <rect width="800" height="400" fill="#080808" />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="800" height="400" fill="url(#grid)" />
      {/* Nodes */}
      <rect x="80" y="140" width="160" height="70" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="160" y="171" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="12" fontFamily="JetBrains Mono">auth.service</text>
      <text x="160" y="191" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="JetBrains Mono">node:012</text>

      <rect x="320" y="80" width="160" height="70" rx="4" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
      <text x="400" y="111" textAnchor="middle" fill="white" fontSize="12" fontFamily="JetBrains Mono">api.gateway</text>
      <text x="400" y="131" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="JetBrains Mono">node:007</text>

      <rect x="320" y="200" width="160" height="70" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="400" y="231" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="12" fontFamily="JetBrains Mono">data.pipeline</text>
      <text x="400" y="251" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="JetBrains Mono">node:031</text>

      <rect x="560" y="140" width="160" height="70" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <text x="640" y="171" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="12" fontFamily="JetBrains Mono">render.core</text>
      <text x="640" y="191" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="JetBrains Mono">node:056</text>

      {/* Connectors */}
      <path d="M 240 175 L 320 115" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="5 5" />
      <path d="M 240 175 L 320 235" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5 5" />
      <path d="M 480 115 L 560 175" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="5 5" />
      <path d="M 480 235 L 560 175" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5 5" />

      {/* Active highlight */}
      <rect x="317" y="77" width="166" height="76" rx="5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      <rect x="305" y="65" width="190" height="100" rx="7" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      <text x="16" y="22" fill="rgba(255,255,255,0.18)" fontSize="9" fontFamily="JetBrains Mono">canvas:main — zoom:1.0x</text>
      <text x="720" y="388" fill="rgba(255,255,255,0.12)" fontSize="8" fontFamily="JetBrains Mono">v2.0.4</text>
    </svg>
  );
}

function InspectorMockup() {
  const rows = [
    { label: 'NODE', value: 'api.gateway' },
    { label: 'TYPE', value: 'service' },
    { label: 'DEPS', value: '3 upstream' },
    { label: 'STATUS', value: '● ACTIVE' },
    { label: 'LATENCY', value: '12ms avg' },
    { label: 'REQUESTS', value: '8.2k / min' },
  ];
  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', padding: '28px 28px' }}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className="flex justify-between items-center"
          style={{ padding: '14px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
        >
          <span style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', fontSize: '10px' }}>{r.label}</span>
          <span style={{ color: r.label === 'STATUS' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function BentoPreview() {
  return (
    <section id="mirror" className="relative z-10 max-w-[1440px] mx-auto" style={{ padding: '0 48px 140px' }}>
      {/* Section label */}
      <div className="flex items-center gap-6" style={{ marginBottom: '40px' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          [Preview Interface]
        </span>
        <div style={{ height: '1px', flexGrow: 1, background: 'rgba(255,255,255,0.05)' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Canvas — 8 cols */}
        <div
          className="md:col-span-8 overflow-hidden"
          style={{ ...glassStyle, borderRadius: '0.75rem', transition: 'box-shadow 0.3s, border-color 0.3s' }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 0 24px rgba(255,255,255,0.07)'; el.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          <div className="flex justify-between items-center" style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Main Canvas
            </span>
            <svg className="opacity-20" width="16" height="16" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </div>
          <div style={{ maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)' }}>
            <CanvasMockup />
          </div>
        </div>

        {/* Logic Inspector — 4 cols */}
        <div
          className="md:col-span-4 flex flex-col overflow-hidden"
          style={{ ...glassStyle, borderRadius: '0.75rem', transition: 'box-shadow 0.3s, border-color 0.3s' }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = '0 0 24px rgba(255,255,255,0.07)'; el.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = 'none'; el.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        >
          <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Logic Inspector
            </span>
          </div>
          <div className="flex-grow" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <InspectorMockup />
          </div>
          <div style={{ padding: '28px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: 600, color: 'white', marginBottom: '10px', lineHeight: '1.3' }}>
              Infinite Depth
            </h3>
            <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', color: 'rgba(196,199,200,0.5)', lineHeight: '1.7' }}>
              Drill down into any node to see the underlying cosmic structure of your project.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
