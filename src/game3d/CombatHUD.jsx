// ============================================================
// NIGHTFALL PARTNERS — Combat HUD (Phase 4)
// DOM overlay: player HP bars, ammo, downed/bleed-out state,
// revive progress, damage flash, and the cinematic overlay used
// for story beats (intro, screams, the Nightstone reveal).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';

export function HpBars({ self, partnerName, partner }) {
  const bar = (label, p) => {
    const frac = Math.max(0, (p?.hp ?? 0) / (p?.maxHp ?? 1));
    const color = p?.state === 'downed' ? '#e0645c'
      : frac > 0.5 ? '#7fd88f' : frac > 0.25 ? '#e0b44d' : '#e0645c';
    return (
      <div className="ch-bar" key={label}>
        <span className="ch-bar-name">{label}</span>
        <span className="ch-bar-track">
          <span className="ch-bar-fill" style={{ width: `${frac * 100}%`, background: color }} />
        </span>
        {p?.state === 'downed' && <span className="ch-downed-tag">DOWN</span>}
        {p?.state === 'dead' && <span className="ch-downed-tag">LOST</span>}
      </div>
    );
  };
  return (
    <div className="ch-hpbars">
      {bar('You', self)}
      {partnerName ? bar(partnerName, partner) : null}
    </div>
  );
}

export function AmmoCounter({ ammo }) {
  if (!ammo) return null;
  const mag = Math.max(0, ammo.mag ?? 0);
  return (
    <div className="ch-ammo">
      <div className="ch-ammo-mag">
        {'◆'.repeat(mag)}
        {'◇'.repeat(Math.max(0, (ammo.magTotal ?? 3) - mag))}
      </div>
      <div className="ch-ammo-reserve">
        {ammo.reloading ? 'reloading…' : `${ammo.reserve ?? 0} spare — [F] fire · [R] reload`}
      </div>
    </div>
  );
}

export function DownedOverlay({ self, partnerName, bleedOutMs = 30000 }) {
  if (self?.state !== 'downed') return null;
  const left = Math.max(0, bleedOutMs - (Date.now() - self.downedAt));
  const pct = (left / bleedOutMs) * 100;
  return (
    <div className="ch-downed">
      <div className="ch-downed-card">
        <div className="ch-downed-title">YOU ARE DOWN</div>
        <p>{partnerName ? `${partnerName} can lift you — stay close to them.` : 'The lantern light is failing…'}</p>
        <div className="ch-bleed-track"><div className="ch-bleed-fill" style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

export function RevivePrompt({ show, progress }) {
  if (!show) return null;
  return (
    <div className="ch-revive">
      <div className="ch-revive-label">REVIVING — hold still…</div>
      <div className="ch-revive-track"><div className="ch-revive-fill" style={{ width: `${(progress / 3000) * 100}%` }} /></div>
    </div>
  );
}

export function DamageFlash({ trigger }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 280);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!on) return null;
  return <div className="ch-damage-flash" />;
}

/** Cinematic overlay: letterbox + typed story text, advances on click/E. */
export function Cinema({ cinema, onAdvance }) {
  if (!cinema) return null;
  const { lines, label } = cinema;
  return (
    <div className="cinema" onClick={onAdvance}>
      <div className="cinema-bar cinema-top" />
      <div className="cinema-bar cinema-bottom" />
      <div className="cinema-body">
        {label && <div className="cinema-label">{label}</div>}
        <div className="cinema-text">{lines[cinema.index] ?? ''}</div>
        <div className="cinema-hint">click or press [E] to continue</div>
      </div>
    </div>
  );
}
