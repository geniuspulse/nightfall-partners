// ============================================================
// NIGHTFALL PARTNERS — Combat Engine (Phase 4)
// Headless, host-authoritative combat state machine. The 3D
// layer renders snapshots; clients report hits; the host is the
// single source of truth. Pure JS — unit-tested in Node.
//
// Entity behaviors (data-driven via enemy defs):
//   'aggro'  — detect, chase, attack players (Hollow Husk)
//   'flee'   — wander; flee from players (deer)
//   'escort' — follow a march target while escorted (survivors)
//   'idle'   — stand (children, leader) / invulnerable NPCs
//
// Player lifecycle: alive → downed (bleed-out) → dead
//                   downed → revived (partner revive)
// ============================================================

import { getEnemyDef } from './enemies.js';

export const PLAYER_STATE = { ALIVE: 'alive', DOWNED: 'downed', DEAD: 'dead' };
export const ENTITY_STATE = { IDLE: 'idle', CHASE: 'chase', ATTACK: 'attack', FLEE: 'flee', FOLLOW: 'follow', DYING: 'dying', GONE: 'gone' };

export const BLEED_OUT_MS = 30000;
export const REVIVE_MS = 3000;
export const REVIVE_HP = 50;

export function createCombatState() {
  return {
    players: {},   // pid → { id, hp, maxHp, state, downedAt, reviveProgress, reviverId, kills, deaths }
    enemies: [],   // enemy instances (see spawnEnemy)
    entitySeq: 1,
  };
}

export function joinCombat(state, pid, { maxHp = 100 } = {}) {
  if (!state.players[pid]) {
    state.players[pid] = {
      id: pid, hp: maxHp, maxHp, state: PLAYER_STATE.ALIVE,
      downedAt: 0, reviveProgress: 0, reviverId: null, kills: 0, deaths: 0,
    };
  }
  return state.players[pid];
}

export function spawnEnemy(state, defId, pos, { id, invulnerable = false, target } = {}) {
  const def = getEnemyDef(defId);
  const inst = {
    id: id ?? `${defId}-${state.entitySeq++}`,
    defId, invulnerable,
    hp: def.maxHp, maxHp: def.maxHp,
    pos: { ...pos }, yaw: Math.random() * Math.PI * 2,
    spawnPos: { ...pos },
    state: def.behavior === 'aggro' ? ENTITY_STATE.IDLE : ENTITY_STATE.FLEE,
    targetId: null, marchTarget: target ?? null,
    lastAttackAt: 0, spawnedAt: Date.now(), diedAt: 0, hitFlashAt: 0,
  };
  state.enemies.push(inst);
  return inst;
}

function nearestAlivePlayer(state, pos, maxDist) {
  let best = null, bestD = Infinity;
  for (const p of Object.values(state.players)) {
    if (p.state !== PLAYER_STATE.ALIVE) continue;
    const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best && bestD <= maxDist ? { player: best, dist: bestD } : null;
}

function dist2(a, b) { return Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z); }

// ── Damage ───────────────────────────────────────────────

export function applyPlayerDamage(state, pid, amount, sourceId) {
  const events = [];
  const p = state.players[pid];
  if (!p || p.state !== PLAYER_STATE.ALIVE || amount <= 0) return events;

  p.hp = Math.max(0, p.hp - amount);
  events.push({ type: 'PLAYER_DAMAGED', pid, amount, hp: p.hp, sourceId });

  if (p.hp === 0) {
    p.state = PLAYER_STATE.DOWNED;
    p.downedAt = Date.now();
    p.reviveProgress = 0;
    p.reviverId = null;
    events.push({ type: 'PLAYER_DOWNED', pid });
  }
  return events;
}

export function applyEnemyDamage(state, eid, amount, byPid) {
  const events = [];
  const e = state.enemies.find((x) => x.id === eid);
  if (!e || e.state === ENTITY_STATE.DYING || e.state === ENTITY_STATE.GONE) return events;
  if (e.invulnerable) return events;

  e.hp = Math.max(0, e.hp - amount);
  e.hitFlashAt = Date.now();
  events.push({ type: 'ENEMY_DAMAGED', enemyId: eid, hp: e.hp, byPid });

  if (e.hp === 0) {
    e.state = ENTITY_STATE.DYING;
    e.diedAt = Date.now();
    const def = getEnemyDef(e.defId);
    if (byPid && state.players[byPid]) state.players[byPid].kills += 1;
    events.push({ type: 'ENEMY_KILLED', enemyId: eid, defId: e.defId, points: def.points ?? 0, byPid });
  }
  return events;
}

// ── Revive ───────────────────────────────────────────────

/** Client heartbeats this while holding revive near a downed partner. */
export function tickRevive(state, downedPid, byPid, dtMs) {
  const events = [];
  const p = state.players[downedPid];
  const reviver = state.players[byPid];
  if (!p || !reviver || p.state !== PLAYER_STATE.DOWNED || reviver.state !== PLAYER_STATE.ALIVE) return events;

  p.reviverId = byPid;
  p.reviveProgress += dtMs;
  if (p.reviveProgress >= REVIVE_MS) {
    p.state = PLAYER_STATE.ALIVE;
    p.hp = Math.min(p.maxHp, REVIVE_HP);
    p.reviveProgress = 0;
    p.reviverId = null;
    events.push({ type: 'PLAYER_REVIVED', pid: downedPid, byPid, hp: p.hp });
  }
  return events;
}

export function cancelRevive(state, downedPid) {
  const p = state.players[downedPid];
  if (p) { p.reviveProgress = 0; p.reviverId = null; }
}

// ── Respawn (after death) ─────────────────────────────────

export function respawnPlayer(state, pid, pos, { hp } = {}) {
  const events = [];
  const p = state.players[pid];
  if (!p) return events;
  p.state = PLAYER_STATE.ALIVE;
  p.hp = hp ?? p.maxHp;
  p.reviveProgress = 0;
  events.push({ type: 'PLAYER_RESPAWNED', pid, hp: p.hp, pos });
  return events;
}

// ── AI tick (host calls ~10Hz) ────────────────────────────

/**
 * playerPos: pid → {x, z} (latest transforms)
 * dtMs: time since last tick
 * Returns engine events for this tick (movement is read from
 * state.enemies — the 3D layer renders/interpolates from it).
 */
export function tickCombat(state, dtMs, playerPos, now = Date.now()) {
  const events = [];
  for (const p of Object.values(state.players)) p.pos = playerPos[p.id] ?? p.pos;

  for (const e of state.enemies) {
    if (e.state === ENTITY_STATE.GONE) continue;
    const def = getEnemyDef(e.defId);
    const dt = dtMs / 1000;

    // corpse cleanup
    if (e.state === ENTITY_STATE.DYING) {
      if (now - e.diedAt >= (def.despawnMs ?? 2500)) {
        e.state = ENTITY_STATE.GONE;
        events.push({ type: 'ENEMY_DESPAWNED', enemyId: e.id });
      }
      continue;
    }

    // ── behavior: flee (deer) ──
    if (def.behavior === 'flee') {
      const threat = nearestAlivePlayer(state, e.pos, 9);
      if (threat) {
        // run away from the closest player
        const dx = e.pos.x - threat.player.pos.x;
        const dz = e.pos.z - threat.player.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const spd = (def.speed ?? 4) * 1.6;
        e.pos.x += (dx / len) * spd * dt;
        e.pos.z += (dz / len) * spd * dt;
        e.yaw = Math.atan2(dx, dz);
        e.state = ENTITY_STATE.FLEE;
      } else if (e.state === ENTITY_STATE.FLEE) {
        e.state = ENTITY_STATE.IDLE;
      } else {
        // gentle wander around spawn
        const w = Math.sin(now / 1700 + e.spawnedAt) * 0.4;
        e.pos.x += Math.cos(e.yaw) * w * dt;
        e.pos.z += Math.sin(e.yaw) * w * dt;
        if (Math.random() < 0.008) e.yaw = Math.random() * Math.PI * 2;
      }
      continue;
    }

    // ── behavior: escort (survivors) ──
    if (def.behavior === 'escort') {
      if (e.marchTarget) {
        const dx = e.marchTarget.x - e.pos.x;
        const dz = e.marchTarget.z - e.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.5) {
          e.state = ENTITY_STATE.IDLE;
        } else {
          e.state = ENTITY_STATE.FOLLOW;
          const spd = def.speed ?? 1.6;
          e.pos.x += (dx / d) * spd * dt;
          e.pos.z += (dz / d) * spd * dt;
          e.yaw = Math.atan2(dx, dz);
        }
      } else {
        e.state = ENTITY_STATE.IDLE;
      }
      continue;
    }

    // ── behavior: idle (children, leader) ──
    if (def.behavior === 'idle') continue;

    // ── behavior: aggro (monsters) ──
    const target = nearestAlivePlayer(state, e.pos, Infinity);
    if (!target) { e.state = ENTITY_STATE.IDLE; e.targetId = null; continue; }

    const d = dist2(e, target.player);
    if (e.state === ENTITY_STATE.IDLE) {
      if (d <= def.detectRange) {
        e.state = ENTITY_STATE.CHASE;
        e.targetId = target.player.id;
        events.push({ type: 'ENEMY_AGGRO', enemyId: e.id, targetId: target.player.id });
      }
      continue;
    }

    // leashing
    const fromSpawn = Math.hypot(e.pos.x - e.spawnPos.x, e.pos.z - e.spawnPos.z);
    if (fromSpawn > (def.leashRange ?? 26) && d > def.detectRange) {
      e.state = ENTITY_STATE.IDLE;
      e.targetId = null;
      continue;
    }

    if (d <= def.attackRange) {
      e.state = ENTITY_STATE.ATTACK;
      // strike when cooled down
      if (now - e.lastAttackAt >= def.attackCooldownMs) {
        e.lastAttackAt = now;
        events.push({ type: 'ENEMY_ATTACK', enemyId: e.id, targetId: target.player.id, animMs: 350 });
        events.push(...applyPlayerDamage(state, target.player.id, def.attackDamage, e.id));
      }
    } else {
      // keep closing; show the attack pose in the near band (visual only)
      e.state = d <= def.attackRange + 1.2 ? ENTITY_STATE.ATTACK : ENTITY_STATE.CHASE;
      const spd = def.speed ?? 2;
      const dx = target.player.pos.x - e.pos.x;
      const dz = target.player.pos.z - e.pos.z;
      e.pos.x += (dx / d) * spd * dt;
      e.pos.z += (dz / d) * spd * dt;
      e.yaw = Math.atan2(dx, dz);
    }
  }

  // downed bleed-out
  for (const p of Object.values(state.players)) {
    if (p.state === PLAYER_STATE.DOWNED && now - p.downedAt >= BLEED_OUT_MS) {
      p.state = PLAYER_STATE.DEAD;
      p.deaths += 1;
      events.push({ type: 'PLAYER_DIED', pid: p.id });
    }
  }
  return events;
}

// ── Snapshot (wire format for both clients) ──────────────

export function combatSnapshot(state) {
  return {
    players: Object.fromEntries(Object.values(state.players).map((p) => [
      p.id, { hp: p.hp, maxHp: p.maxHp, state: p.state, reviveProgress: p.reviveProgress, downedAt: p.downedAt },
    ])),
    enemies: state.enemies
      .filter((e) => e.state !== ENTITY_STATE.GONE)
      .map((e) => ({
        id: e.id, defId: e.defId,
        x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), yaw: +e.yaw.toFixed(2),
        state: e.state, hp: e.hp, maxHp: e.maxHp,
        hitFlashAt: e.hitFlashAt, diedAt: e.diedAt,
      })),
  };
}

export function getEnemy(state, eid) {
  return state.enemies.find((e) => e.id === eid);
}
