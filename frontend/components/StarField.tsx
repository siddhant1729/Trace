'use client';
import { useEffect, useRef } from 'react';

export default function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing stars
    container.innerHTML = '';

    const count = 180;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 1.8 + 0.2;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 5;
      const opacity = Math.random() * 0.5 + 0.1;
      const blurred = Math.random() < 0.2;

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        background: white;
        border-radius: 50%;
        opacity: ${opacity};
        animation: twinkle ${duration}s ${delay}s infinite ease-in-out;
        ${blurred ? 'filter: blur(1px);' : ''}
      `;
      container.appendChild(star);
    }
  }, []);

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--star-opacity, 0.3); transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at center, #111111 0%, #000000 100%)',
        }}
        aria-hidden="true"
      />
    </>
  );
}
