'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_LINKS = ['Nebula', 'Mirror', 'Void', 'Pulse'];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const onChatPage = pathname === '/chat';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [logoHovered, setLogoHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Magnetic pull effect for nav links
  const handleLinkMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    e.currentTarget.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  }, []);

  const handleLinkLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = 'translate(0, 0)';
    setHoveredLink(null);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/[0.06] shadow-[0_0_20px_rgba(255,255,255,0.07)]'
          : 'bg-white/[0.03]'
      }`}
      style={{ backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex justify-between items-center px-6 md:px-12 py-5 max-w-[1440px] mx-auto">
        {/* Logo — glow on hover */}
        <div
          onClick={() => router.push('/')}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          className="font-semibold text-white tracking-[0.2em] uppercase text-sm md:text-base select-none cursor-pointer"
          style={{
            fontFamily: 'Space Grotesk, sans-serif',
            transition: 'text-shadow 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease',
            textShadow: logoHovered ? '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.3)' : 'none',
            transform: logoHovered ? 'scale(1.05)' : 'scale(1)',
            letterSpacing: logoHovered ? '0.28em' : '0.2em',
          }}
        >
          Trace
        </div>

        {/* Desktop Nav Links — magnetic pull */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href={onChatPage ? '/' : `#${link.toLowerCase()}`}
              onClick={onChatPage && i === 0 ? (e) => { e.preventDefault(); router.push('/'); } : undefined}
              onMouseEnter={() => setHoveredLink(i)}
              onMouseMove={(e) => handleLinkMove(e, i)}
              onMouseLeave={handleLinkLeave}
              className="transition-all duration-300 text-sm"
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                color: i === 0 ? 'white' : hoveredLink === i ? 'white' : 'rgba(255,255,255,0.4)',
                textShadow: hoveredLink === i ? '0 0 12px rgba(255,255,255,0.4)' : 'none',
                borderBottom: i === 0 ? '1px solid white' : hoveredLink === i ? '1px solid rgba(255,255,255,0.6)' : '1px solid transparent',
                paddingBottom: '2px',
                display: 'inline-block',
                transition: 'color 0.3s ease, text-shadow 0.3s ease, transform 0.2s cubic-bezier(0.23,1,0.32,1), border-bottom-color 0.3s ease',
                willChange: 'transform',
              }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Search icon */}
          <button
            className="text-white/40 hover:text-white transition-colors hidden md:block"
            aria-label="Search"
            style={{ transition: 'color 0.3s ease, transform 0.3s ease, filter 0.3s ease' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.4))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'none';
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* CTA — cursor-following gradient */}
          <button
            id="nav-cta"
            onClick={() => router.push('/chat')}
            className="bg-white text-[#2f3131] px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] active:scale-95 transition-all duration-300"
            style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              overflow: 'hidden',
              position: 'relative',
              transition: 'box-shadow 0.3s ease, transform 0.15s ease',
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              e.currentTarget.style.background = `radial-gradient(60px circle at ${x}px 50%, rgba(200,200,200,1), white 60%)`;
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Initialize
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/60 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className="text-white/60 hover:text-white transition-colors text-sm tracking-wider uppercase"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
