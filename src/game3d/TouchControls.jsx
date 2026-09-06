// ============================================================
// NIGHTFALL PARTNERS — Touch controls (mobile-first)
// Left-thumb analog joystick → movement vector (analog, camera-
// relative). Right-side action buttons dispatch the same events
// the keyboard does, so interact/revive/cinema/reload logic is
// identical across desktop and mobile.
// ============================================================

import React, { useRef, useState } from 'react';

const isTouch = typeof window !== 'undefined'
  && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Fire a synthetic key event so all existing E/R logic just works. */
const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));

export default function TouchControls({ vecRef, onInteract }) {
  const padRef = useRef(null);
  const knobRef = useRef(null);
  const activeId = useRef(null);
  const [runOn, setRunOn] = useState(false);

  if (!isTouch) return null;

  const RADIUS = 56;

  const setKnob = (dx, dy) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const tStart = (e) => {
    const t = e.changedTouches[0];
    activeId.current = t.identifier;
    tMove(e);
  };

  const tMove = (e) => {
    const t = [...e.changedTouches].find((x) => x.identifier === activeId.current);
    if (!t || !padRef.current) return;
    e.preventDefault();
    const rect = padRef.current.getBoundingClientRect();
    let dx = t.clientX - (rect.left + rect.width / 2);
    let dy = t.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    setKnob(dx, dy);
    // normalized analog vector: y up = forward
    vecRef.current.x = dx / RADIUS;
    vecRef.current.y = -dy / RADIUS;
    // full-tilt sprint feels right on a phone
    if (Math.hypot(vecRef.current.x, vecRef.current.y) > 0.94 && !runOn) {
      setRunOn(true);
      vecRef.current.run = true;
    } else if (Math.hypot(vecRef.current.x, vecRef.current.y) <= 0.94 && runOn) {
      setRunOn(false);
      vecRef.current.run = false;
    }
  };

  const tEnd = (e) => {
    if (![...e.changedTouches].some((x) => x.identifier === activeId.current)) return;
    activeId.current = null;
    setKnob(0, 0);
    vecRef.current.x = 0;
    vecRef.current.y = 0;
    vecRef.current.run = false;
    setRunOn(false);
  };

  return (
    <div className="touch-controls">
      {/* left thumb: movement */}
      <div
        className="touch-pad"
        ref={padRef}
        onTouchStart={tStart}
        onTouchMove={tMove}
        onTouchEnd={tEnd}
        onTouchCancel={tEnd}
      >
        <div className="touch-knob" ref={knobRef} />
      </div>

      {/* right thumb: actions */}
      <div className="touch-actions">
        <button
          className="tbtn tbtn-fire"
          onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('nf-fire')); }}
        >BOW</button>
        <div className="tbtn-row">
          <button
            className="tbtn"
            onPointerDown={(e) => { e.preventDefault(); key('keydown', 'r'); }}
            onPointerUp={() => key('keyup', 'r')}
          >RLD</button>
          <button
            className="tbtn"
            onPointerDown={(e) => { e.preventDefault(); key('keydown', 'e'); }}
            onPointerUp={() => key('keyup', 'e')}
          >USE</button>
        </div>
      </div>
    </div>
  );
}
