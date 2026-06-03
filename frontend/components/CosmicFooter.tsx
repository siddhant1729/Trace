'use client';
import { useRouter } from 'next/navigation';

const NAV_COL = {
  Product: ['Nebula', 'Mirror', 'Void Mode', 'Pulse'],
  Company: ['About', 'Changelog', 'Status', 'Contact'],
  Developers: ['Docs', 'API Reference', 'SDK', 'GitHub'],
};

export default function CosmicFooter() {
  const router = useRouter();

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
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: 700, color: 'white', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '20px' }}>
              Trace
            </div>
            <p style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.75', maxWidth: '220px', marginBottom: '28px' }}>
              The cinematic workspace for architects of digital systems.
            </p>
            {/* Status chip */}
            <div
              className="inline-flex items-center gap-2.5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '8px 16px' }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white" style={{ animation: 'footerPulse 2s infinite' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                All Systems Nominal
              </span>
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(NAV_COL).map(([heading, links]) => (
            <div key={heading}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '28px' }}>
                {heading}
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0 }}>
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleFooterLink(heading, link); }}
                      style={{ fontFamily: 'Geist, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.32)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                      onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.85)')}
                      onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.32)')}
                    >
                      {link}
                    </a>
                  </li>
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
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>
            © 2026 Trace Systems Inc. — Build {'{'} v2.0.4 {'}'}
          </span>
          <div style={{ display: 'flex', gap: '32px' }}>
            {['Privacy', 'Terms', 'Security'].map((item) => (
              <a
                key={item}
                href="#"
                style={{ fontFamily: 'Geist, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textDecoration: 'none', transition: 'color 0.2s ease' }}
                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.2)')}
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
