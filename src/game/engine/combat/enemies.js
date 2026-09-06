// ============================================================
// NIGHTFALL PARTNERS — Enemy System (Phase 4)
// Reusable, data-driven enemy archetypes. The combat engine
// interprets these; adding a monster is adding a data entry.
//
// Contract per enemy:
// {
//   id, name, maxHp,
//   speed,            // m/s while chasing
//   detectRange,      // meters — wakes up inside this
//   leashRange,       // drops pursuit beyond this
//   attackRange,      // meters — can strike inside this
//   attackDamage,
//   attackCooldownMs,
//   points,           // score on kill
//   despawnMs,        // corpse linger time
//   tint,             // render hint for the 3D layer
// }
// ============================================================

export const ENEMIES = {
  'hollow-husk': {
    id: 'hollow-husk',
    name: 'Hollow Husk',
    behavior: 'aggro',
    maxHp: 100,
    speed: 2.3,
    detectRange: 14,
    leashRange: 26,
    attackRange: 2.3,
    attackDamage: 18,
    attackCooldownMs: 1400,
    points: 50,
    despawnMs: 2600,
    tint: '#4a3b5c',
    description: 'A thing that used to be a keeper of the path. The dark kept the shape and emptied the rest.',
  },
  // ── Chapter 1: The Hunt ──
  'deer': {
    id: 'deer',
    name: 'Deer',
    behavior: 'flee',
    maxHp: 34,                // one clean bow shot
    speed: 4.2,
    points: 10,
    despawnMs: 3000,
    tint: '#9a7248',
    description: 'A doe of the hollow — quicker than she looks.',
  },
  'husk-wave': {
    id: 'husk-wave',
    name: 'Hollow Husk',
    behavior: 'aggro',
    maxHp: 120,
    speed: 2.6,
    detectRange: 30,          // wave husks spawn already intent on the settlement
    leashRange: 60,
    attackRange: 2.3,
    attackDamage: 16,
    attackCooldownMs: 1300,
    points: 75,
    despawnMs: 2600,
    tint: '#4a3b5c',
    description: 'The forest empties itself of shadows, and the shadows walk here.',
  },
  // ── NPC cast (invulnerable, rendered + interacted with like entities) ──
  'npc-leader': {
    id: 'npc-leader', name: 'Mbizi the Elder', behavior: 'idle',
    maxHp: 1, invulnerable: true, points: 0, despawnMs: 999999, tint: '#6b5a8a',
    description: 'Settlement elder. Her voice is steady; her hands are not.',
  },
  'npc-woman': {
    id: 'npc-woman', name: 'Settlement Woman', behavior: 'escort',
    speed: 1.6, maxHp: 1, invulnerable: true, points: 0, despawnMs: 999999, tint: '#8a6a5a',
    description: 'She carries what she could save, which is mostly the children.',
  },
  'npc-child': {
    id: 'npc-child', name: 'Missing Child', behavior: 'idle',
    maxHp: 1, invulnerable: true, points: 0, despawnMs: 999999, tint: '#c9b48a',
    description: 'Small enough to hide where the dark forgot to look.',
  },
  'npc-injured': {
    id: 'npc-injured', name: 'Injured Man', behavior: 'escort',
    speed: 1.2, maxHp: 1, invulnerable: true, points: 0, despawnMs: 999999, tint: '#7a5a6a',
    description: 'He fought whatever came. He did not win, but he lived.',
  },
};

export function getEnemyDef(defId) {
  const d = ENEMIES[defId];
  if (!d) throw new Error(`Unknown enemy: ${defId}`);
  return d;
}
