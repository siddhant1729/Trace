'use client';
import { useEffect, useRef } from 'react';

interface Star {
  el: HTMLDivElement;
  x: number;
  y: number;
  baseSize: number;
  baseOpacity: number;
}

export default function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing stars
    container.innerHTML = '';
    starsRef.current = [];

    const count = 200;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 1.8 + 0.2;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 5;
      const opacity = Math.random() * 0.5 + 0.1;
      const blurred = Math.random() < 0.2;
      const xPct = Math.random() * 100;
      const yPct = Math.random() * 100;

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${xPct}%;
        top: ${yPct}%;
        background: white;
        border-radius: 50%;
        opacity: ${opacity};
        animation: twinkle ${duration}s ${delay}s infinite ease-in-out;
        transition: width 0.5s ease, height 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease, filter 0.5s ease;
        ${blurred ? 'filter: blur(1px);' : ''}
        will-change: width, height, opacity, box-shadow;
      `;
      container.appendChild(star);

      starsRef.current.push({
        el: star,
        x: xPct / 100,
        y: yPct / 100,
        baseSize: size,
        baseOpacity: opacity,
      });
    }

    // Cursor interaction loop
    const handleMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const RADIUS = 180; // interaction radius in px
    const animate = () => {
      const { x: mx, y: my } = mouseRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const star of starsRef.current) {
        const sx = star.x * vw;
        const sy = star.y * vh;
        const dx = mx - sx;
        const dy = my - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < RADIUS) {
          const proximity = 1 - dist / RADIUS; // 1 = right on top, 0 = edge
          const scale = star.baseSize + proximity * 4;
          const glow = proximity * 0.8;

          star.el.style.width = `${scale}px`;
          star.el.style.height = `${scale}px`;
          star.el.style.opacity = `${Math.min(1, star.baseOpacity + proximity * 0.7)}`;
          star.el.style.boxShadow = `0 0 ${8 * proximity}px ${4 * proximity}px rgba(255,255,255,${glow})`;
          star.el.style.filter = proximity > 0.5 ? 'blur(0px)' : '';
        } else {
          star.el.style.width = `${star.baseSize}px`;
          star.el.style.height = `${star.baseSize}px`;
          star.el.style.opacity = `${star.baseOpacity}`;
          star.el.style.boxShadow = 'none';
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafRef.current);
    };
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
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </>
  );
}
