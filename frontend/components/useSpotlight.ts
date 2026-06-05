'use client';
import { useCallback, useRef } from 'react';

/**
 * useSpotlight — Attaches a cursor-following spotlight gradient to a card.
 * Returns handlers and a ref to apply to any container element.
 * The spotlight creates a subtle radial-gradient that follows the cursor
 * within the card bounds, plus a gentle 3D tilt effect.
 */
export function useSpotlight(intensity: number = 0.08) {
  const ref = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const ensureOverlay = useCallback(() => {
    const el = ref.current;
    if (!el) return null;
    if (!overlayRef.current) {
      const overlay = document.createElement('div');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 1;
        opacity: 0;
        transition: opacity 0.4s ease;
      `;
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(overlay);
      overlayRef.current = overlay;
    }
    return overlayRef.current;
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      const overlay = ensureOverlay();
      if (!el || !overlay) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = x / rect.width;
      const cy = y / rect.height;

      // Spotlight gradient
      overlay.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,${intensity}), transparent 50%)`;
      overlay.style.opacity = '1';

      // 3D tilt
      const tiltX = (cy - 0.5) * -6; // max ±3deg
      const tiltY = (cx - 0.5) * 6;
      el.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.01)`;
    },
    [intensity, ensureOverlay]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    const overlay = overlayRef.current;
    if (el) {
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
    if (overlay) {
      overlay.style.opacity = '0';
    }
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
