// ============================================================
// NIGHTFALL PARTNERS — Player input (Phase 1)
// Keyboard + pointer-drag camera orbit. Raw, unopinionated:
// the controller interprets; this just reports.
// ============================================================

import { useEffect, useRef } from 'react';

/**
 * useInput({ onInteract }) → keysRef {f,b,l,r,run} (held keys)
 * The camera orbit is exposed via cameraRef {angle, dist, dragging}
 * updated by pointer events on the container element.
 */
export function useInput({ onInteract, containerRef }) {
  const keysRef = useRef({ f: false, b: false, l: false, r: false, run: false });
  const cameraRef = useRef({ angle: 0, pitch: 0.34, dist: 4.6, dragging: false });

  useEffect(() => {
    const set = (e, v) => {
      const k = e.code;
      if (k === 'KeyW' || k === 'ArrowUp') keysRef.current.f = v;
      if (k === 'KeyS' || k === 'ArrowDown') keysRef.current.b = v;
      if (k === 'KeyA' || k === 'ArrowLeft') keysRef.current.l = v;
      if (k === 'KeyD' || k === 'ArrowRight') keysRef.current.r = v;
      if (k === 'ShiftLeft' || k === 'ShiftRight') keysRef.current.run = v;
      if (v && k === 'KeyE') onInteract?.();
      if (v && k === 'KeyE') e.preventDefault();
    };
    const down = (e) => set(e, true);
    const up = (e) => set(e, false);
    const blur = () => { keysRef.current = { f: false, b: false, l: false, r: false, run: false }; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [onInteract]);

  // pointer-drag camera orbit + wheel zoom on the game container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lastX = 0, lastY = 0;

    const pDown = (e) => {
      if (e.target.closest('.forest-hud')) return; // HUD stays clickable
      cameraRef.current.dragging = true;
      lastX = e.clientX; lastY = e.clientY;
    };
    const pMove = (e) => {
      if (!cameraRef.current.dragging) return;
      cameraRef.current.angle -= (e.clientX - lastX) * 0.006;
      cameraRef.current.pitch = Math.min(
        1.1, Math.max(0.08, cameraRef.current.pitch + (e.clientY - lastY) * 0.003)
      );
      lastX = e.clientX; lastY = e.clientY;
    };
    const pUp = () => { cameraRef.current.dragging = false; };
    const wheel = (e) => {
      cameraRef.current.dist = Math.min(8, Math.max(2.6, cameraRef.current.dist + e.deltaY * 0.0035));
    };

    el.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    el.addEventListener('wheel', wheel, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
      el.removeEventListener('wheel', wheel);
    };
  }, [containerRef]);

  return { keysRef, cameraRef };
}
