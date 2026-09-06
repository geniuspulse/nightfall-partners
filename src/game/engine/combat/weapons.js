// ============================================================
// NIGHTFALL PARTNERS — Weapon System (Phase 4)
// Reusable, data-driven weapon definitions. The engine only
// interprets stats; adding a weapon is adding a data entry.
//
// Contract per weapon:
// {
//   id, name, type: 'ranged'|'melee',
//   damage,            // per hit
//   range,             // meters
//   mag,               // rounds per magazine
//   reserve,           // total spare rounds
//   cooldownMs,        // min time between shots
//   reloadMs,          // full-magazine reload time
//   projectile,        // visual: 'bolt' | 'tracer' | 'none' (melee)
//   anim,              // attack animation key
//   effects: { muzzle: bool, sound: string },
// }
// ============================================================

export const WEAPONS = {
  'ember-bow': {
    id: 'ember-bow',
    name: "Wren's Ember Bow",
    type: 'ranged',
    damage: 34,
    range: 30,
    mag: 3,
    reserve: 9,
    cooldownMs: 650,
    reloadMs: 2200,
    projectile: 'bolt',
    anim: 'shoot-bow',
    effects: { muzzle: true, sound: 'bow-release' },
    description: 'A keeper\'s bow strung with lantern-light. Its bolts burn what the dark hides.',
  },
};

export function getWeapon(id) {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Unknown weapon: ${id}`);
  return w;
}

// ── Local weapon state (the shooter's own discipline) ──

export function createWeaponState(weaponId) {
  const w = getWeapon(weaponId);
  return {
    weaponId,
    ammoInMag: w.mag,
    reserve: w.reserve,
    lastShotAt: -Infinity,
    reloading: false,
    reloadEndsAt: 0,
  };
}

/**
 * Try to fire at time `now` (ms, performance.now()).
 * Returns { ok: true, shot: { damage, range, projectile } }
 * or { ok: false, reason: 'cooldown'|'empty'|'reloading' }.
 * Does NOT touch the enemy — hit resolution is the combat
 * engine's job (host-authoritative).
 */
export function tryFire(ws, now) {
  const w = getWeapon(ws.weaponId);
  if (ws.reloading) return { ok: false, reason: 'reloading' };
  if (now - ws.lastShotAt < w.cooldownMs) return { ok: false, reason: 'cooldown' };
  if (ws.ammoInMag <= 0) {
    // auto-reload attempt; empty-handed if no reserve
    const r = tryReload(ws, now);
    return r.ok ? { ok: false, reason: 'reloading' } : { ok: false, reason: 'empty' };
  }
  ws.ammoInMag -= 1;
  ws.lastShotAt = now;
  return { ok: true, shot: { damage: w.damage, range: w.range, projectile: w.projectile } };
}

/** Reload if the magazine is short and reserve exists. */
export function tryReload(ws, now) {
  const w = getWeapon(ws.weaponId);
  if (ws.reloading) return { ok: false, reason: 'reloading' };
  if (ws.ammoInMag === w.mag) return { ok: false, reason: 'full' };
  if (ws.reserve <= 0) return { ok: false, reason: 'no-ammo' };
  ws.reloading = true;
  ws.reloadEndsAt = now + w.reloadMs;
  return { ok: true, reloadEndsAt: ws.reloadEndsAt, reloadMs: w.reloadMs };
}

/** Resolve a finished reload (call each frame or before each shot). */
export function resolveReload(ws, now) {
  if (!ws.reloading) return;
  if (now >= ws.reloadEndsAt) {
    const w = getWeapon(ws.weaponId);
    const needed = w.mag - ws.ammoInMag;
    const taken = Math.min(needed, ws.reserve);
    ws.ammoInMag += taken;
    ws.reserve -= taken;
    ws.reloading = false;
  }
}
