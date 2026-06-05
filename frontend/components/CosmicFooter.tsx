'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV_COL = {
  Product: ['Nebula', 'Mirror', 'Void Mode', 'Pulse'],
  Company: ['About', 'Changelog', 'Status', 'Contact'],
  Developers: ['Docs', 'API Reference', 'SDK', 'GitHub'],
};

function FooterLink({ text, onClick }: { text: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <li>
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); onClick?.(); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: '14px',
          color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)',
          textDecoration: 'none',
          transition: 'color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease',
          display: 'inline-block',
          transform: hovered ? 'translateX(6px)' : 'translateX(0)',
          letterSpacing: hovered ? '0.03em' : '0',
        }}
      >
        {hovered && (
          <span style={{ marginRight: '6px', opacity: 0.5, transition: 'opacity 0.3s ease' }}>→</span>
        )}
        {text}
      </a>
    </li>
  );
}

export default function CosmicFooter() {
  const router = useRouter();
  const [logoHovered, setLogoHovered] = useState(false);

  const handleFooterLink = (heading: string, link: string) => {
    if (link === 'Nebula') { router.push('/'); return; }
    if (link === 'Docs')   { router.push('/chat'); return; }
    if (link === 'SDK')    { router.push('/chat'); return; }
  };

  return (
    <footer
      className="relative z-10"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '100px 48px 80px' }}
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '48px', marginBottom: '80px' }}>
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div
              onMouseEnter={() => setLogoHovered(true)}
              onMouseLeave={() => setLogoHovered(false)}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: logoHovered ? '0.28em' : '0.2em',
                textTransform: 'uppercase',
                marginBottom: '20px',
                cursor: 'default',
                transition: 'letter-spacing 0.3s ease, text-shadow 0.3s ease',
                textShadow: logoHovered ? '0 0 16px rgba(255,255,255,0.5)' : 'none',
              }}
            >
              Trace
            </div>
            <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.75', maxWidth: '220px', marginBottom: '28px' }}>
              The cinematic workspace for architects of digital systems.
            </p>
            {/* Status chip */}
            <div
              className="inline-flex items-center gap-2.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '8px 16px', transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'footerPulse 2s infinite' }} />
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                All Systems Nominal
              </span>
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(NAV_COL).map(([heading, links]) => (
            <div key={heading}>
              <div style={{ fontFamily: 'Fira Code, monospace', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '28px' }}>
                {heading}
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                {links.map((link) => (
                  <FooterLink
                    key={link}
                    text={link}
                    onClick={() => handleFooterLink(heading, link)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px', gap: '20px' }}
        >
          <span style={{ fontFamily: 'Fira Code, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>
            © 2026 Trace Systems Inc. — Build {'{'} v2.0.4 {'}'}
          </span>
          <div style={{ display: 'flex', gap: '32px' }}>
            {['Privacy', 'Terms', 'Security'].map((item) => (
              <a
                key={item}
                href="#"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textDecoration: 'none', transition: 'color 0.2s ease, text-shadow 0.2s ease' }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)';
                  (e.target as HTMLAnchorElement).style.textShadow = '0 0 8px rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.2)';
                  (e.target as HTMLAnchorElement).style.textShadow = 'none';
                }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes footerPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </footer>
  );
}
