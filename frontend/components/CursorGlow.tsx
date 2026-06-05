'use client';
import { useEffect, useRef } from 'react';

/**
 * CursorGlow — A page-level radial glow that follows the user's cursor.
 * Renders a fixed, pointer-events-none div that smoothly tracks the mouse
 * using requestAnimationFrame for buttery 60 fps movement.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const target = useRef({ x: -200, y: -200 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      // Lerp towards target for smooth trailing
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${pos.current.x - 300}px, ${pos.current.y - 300}px)`;
      }
      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 30%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 9999,
        filter: 'blur(2px)',
        willChange: 'transform',
      }}
    />
  );
}
