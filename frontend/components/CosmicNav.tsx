'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const NAV_LINKS = ['Nebula', 'Mirror', 'Void', 'Pulse'];

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const onChatPage = pathname === '/chat';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        {/* Logo */}
        <div
          onClick={() => router.push('/')}
          className="font-semibold text-white tracking-[0.2em] uppercase text-sm md:text-base select-none cursor-pointer"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          Trace
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href={onChatPage ? '/' : `#${link.toLowerCase()}`}
              onClick={onChatPage && i === 0 ? (e) => { e.preventDefault(); router.push('/'); } : undefined}
              className={`transition-all duration-300 text-sm ${
                i === 0
                  ? 'text-white border-b border-white pb-0.5'
                  : 'text-white/40 hover:text-white'
              }`}
              style={{ fontFamily: 'Geist, sans-serif' }}
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
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* CTA */}
          <button
            id="nav-cta"
            onClick={() => router.push('/chat')}
            className="bg-white text-[#2f3131] px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:scale-95 transition-all duration-300"
            style={{ fontFamily: 'Geist, sans-serif' }}
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
              style={{ fontFamily: 'Geist, sans-serif' }}
            >
              {link}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
