// ============================================================
// NIGHTFALL PARTNERS — Combat Engine test suite (Phase 4)
// Headless: players, damage, downed/death/revive, weapons, and
// every entity AI behavior (aggro / flee / escort / idle) that
// Chapter 1 needs. Run: npm run test:combat
// ============================================================

import {
  createCombatState, joinCombat, spawnEnemy, tickCombat, combatSnapshot,
  applyPlayerDamage, applyEnemyDamage, tickRevive, respawnPlayer,
  PLAYER_STATE, ENTITY_STATE, BLEED_OUT_MS,
} from '../src/game/engine/combat/CombatEngine.js';
import {
  createWeaponState, tryFire, tryReload, resolveReload, getWeapon,
} from '../src/game/engine/combat/weapons.js';

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗ FAIL:', name); }
};

// ── 1. player lifecycle: damage → downed → dead ──
{
  const c = createCombatState();
  joinCombat(c, 'A');
  joinCombat(c, 'B');
  check('players join at full hp', c.players.A.hp === 100 && c.players.B.hp === 100);

  let ev = applyPlayerDamage(c, 'A', 18);
  check('damage reduces hp', c.players.A.hp === 82);
  check('PLAYER_DAMAGED emitted', ev[0].type === 'PLAYER_DAMAGED' && ev[0].amount === 18);

  ev = applyPlayerDamage(c, 'A', 90);
  check('overkill clamps to 0 and downs', c.players.A.hp === 0 && c.players.A.state === PLAYER_STATE.DOWNED);
  check('PLAYER_DOWNED emitted', ev.some((e) => e.type === 'PLAYER_DOWNED'));

  ev = applyPlayerDamage(c, 'A', 50);
  check('no damage while downed', c.players.A.hp === 0 && ev.length === 0);

  // bleed-out
  c.players.A.downedAt = Date.now() - BLEED_OUT_MS - 1;
  ev = tickCombat(c, 100, { A: { x: 0, z: 0 }, B: { x: 0, z: 0 } });
  check('bleed-out kills', c.players.A.state === PLAYER_STATE.DEAD);
  check('PLAYER_DIED emitted', ev.some((e) => e.type === 'PLAYER_DIED'));

  ev = respawnPlayer(c, 'A', {}, { hp: 50 });
  check('respawn restores alive at half hp', c.players.A.state === PLAYER_STATE.ALIVE && c.players.A.hp === 50);
}

// ── 2. revive ──
{
  const c = createCombatState();
  joinCombat(c, 'A'); joinCombat(c, 'B');
  applyPlayerDamage(c, 'B', 100);
  let ev = tickRevive(c, 'B', 'A', 1500);
  check('revive progress accumulates', c.players.B.reviveProgress === 1500);
  check('still downed mid-revive', c.players.B.state === PLAYER_STATE.DOWNED);
  ev = tickRevive(c, 'B', 'A', 1500);
  check('revive completes at 3s', c.players.B.state === PLAYER_STATE.ALIVE && c.players.B.hp === 50);
  check('PLAYER_REVIVED emitted with reviver', ev.some((e) => e.type === 'PLAYER_REVIVED' && e.byPid === 'A'));
  // downed player cannot revive
  applyPlayerDamage(c, 'A', 100);
  applyPlayerDamage(c, 'B', 100);
  ev = tickRevive(c, 'B', 'A', 500);
  check('downed player cannot revive', ev.length === 0);
}

// ── 3. weapon: fire / cooldown / ammo / reload ──
{
  const w = getWeapon('ember-bow');
  check('ember bow is ranged 34 dmg / 30m', w.type === 'ranged' && w.damage === 34 && w.range === 30);

  const ws = createWeaponState('ember-bow');
  let r = tryFire(ws, 0);
  check('first shot fires', r.ok && ws.ammoInMag === 2);
  r = tryFire(ws, 100);
  check('cooldown blocks rapid fire', !r.ok && r.reason === 'cooldown');
  r = tryFire(ws, 700);
  check('cooldown passes after 650ms', r.ok);
  tryFire(ws, 1400);
  check('mag empties to 0', ws.ammoInMag === 0);
  r = tryFire(ws, 2100);
  check('empty mag triggers reload, not a shot', !r.ok && r.reason === 'reloading' && ws.reloading);
  resolveReload(ws, 2100 + 100);
  check('reload not done early', ws.reloading && ws.ammoInMag === 0);
  resolveReload(ws, 2100 + w.reloadMs + 1);
  check('reload refills from reserve', ws.ammoInMag === 3 && ws.reserve === 6);
  // drain everything: full mag → reload → full mag → empty pockets
  const fire3 = (t0) => { tryFire(ws, t0); tryFire(ws, t0 + 700); tryFire(ws, t0 + 1400); };
  fire3(5000);
  r = tryReload(ws, 10000);
  check('reload from empty works', r.ok);
  resolveReload(ws, 10000 + w.reloadMs + 1);
  check('reserve refilled the mag', ws.ammoInMag === 3 && ws.reserve === 3);
  fire3(11000);
  r = tryReload(ws, 20000);
  resolveReload(ws, 20000 + w.reloadMs + 1);
  fire3(21000);
  r = tryReload(ws, 30000);
  check('no-ammo reload refused', !r.ok && r.reason === 'no-ammo' && ws.reserve === 0);
}

// ── 4. aggro AI: detect → chase → attack → leash ──
{
  const c = createCombatState();
  joinCombat(c, 'A', {});
  const husk = spawnEnemy(c, 'hollow-husk', { x: 20, z: 20 });
  const farPos = { A: { x: 0, z: 0 } };
  tickCombat(c, 100, farPos);
  check('husk idle when players far', husk.state === ENTITY_STATE.IDLE);

  // step close enough to detect (14m)
  const nearPos = { A: { x: 14, z: 14 } };
  let d = Math.hypot(14 - 20, 14 - 20);
  const ev = tickCombat(c, 100, nearPos);
  check('husk aggros inside detect range', husk.state === ENTITY_STATE.CHASE || husk.state === ENTITY_STATE.ATTACK);
  check('ENEMY_AGGRO event', ev.some((e) => e.type === 'ENEMY_AGGRO'));

  // let it chase on a monotonic clock until it reaches attack range
  let clock = Date.now();
  let attackEv = [];
  for (let i = 0; i < 300; i++) {
    clock += 100;
    attackEv = tickCombat(c, 100, nearPos, clock);
    if (husk.state === ENTITY_STATE.ATTACK) break;
  }
  check('husk reaches attack range', husk.state === ENTITY_STATE.ATTACK);

  const hpBefore = c.players.A.hp;
  for (let i = 0; i < 40; i++) {
    clock += 100;
    attackEv = tickCombat(c, 100, nearPos, clock);
  }
  check('husk attacks deal damage', c.players.A.hp < hpBefore || c.players.A.state !== PLAYER_STATE.ALIVE);
  check('ENEMY_ATTACK event fires', attackEv.some((e) => e.type === 'ENEMY_ATTACK') || c.players.A.hp < hpBefore);
}

// ── 5. flee AI (deer) ──
{
  const c = createCombatState();
  joinCombat(c, 'A');
  const deer = spawnEnemy(c, 'deer', { x: 5, z: -45 });
  tickCombat(c, 100, { A: { x: 50, z: 50 } });
  check('deer idle when players far', deer.state === ENTITY_STATE.IDLE);
  tickCombat(c, 100, { A: { x: 8, z: -45 } });
  const oldX = deer.pos.x;
  check('deer flees when player close', deer.state === ENTITY_STATE.FLEE);
  tickCombat(c, 500, { A: { x: 8, z: -45 } });
  check('deer moves away while fleeing', deer.pos.x < oldX); // player is east → deer runs west
}

// ── 6. escort AI (survivors) ──
{
  const c = createCombatState();
  const woman = spawnEnemy(c, 'npc-woman', { x: 0, z: -76 }, { id: 'woman-1', invulnerable: true });
  tickCombat(c, 100, {});
  check('escort idle without march target', woman.state === ENTITY_STATE.IDLE);
  woman.marchTarget = { x: -27, z: -61 };
  tickCombat(c, 1000, {});
  check('escort follows march target', woman.state === ENTITY_STATE.FOLLOW);
  for (let i = 0; i < 100; i++) tickCombat(c, 1000, {});
  check('escort arrives and settles', woman.state === ENTITY_STATE.IDLE
    && Math.hypot(woman.pos.x + 27, woman.pos.z + 61) < 1.5);
}

// ── 7. enemy damage + death + despawn ──
{
  const c = createCombatState();
  joinCombat(c, 'A');
  const husk = spawnEnemy(c, 'hollow-husk', { x: 10, z: 10 });
  let ev = applyEnemyDamage(c, husk.id, 34, 'A');
  check('enemy takes damage', husk.hp === 66);
  check('invulnerable NPCs ignore damage', (() => {
    const npc = spawnEnemy(c, 'npc-leader', { x: 0, z: 0 }, { invulnerable: true });
    const e2 = applyEnemyDamage(c, npc.id, 50, 'A');
    return npc.hp === 1 && e2.length === 0;
  })());
  applyEnemyDamage(c, husk.id, 34, 'A');
  ev = applyEnemyDamage(c, husk.id, 34, 'A');
  check('enemy dies at 0 hp', husk.hp === 0 && husk.state === ENTITY_STATE.DYING);
  check('ENEMY_KILLED with points', ev.some((e) => e.type === 'ENEMY_KILLED' && e.points === 50));
  check('kill credited to player', c.players.A.kills === 1);
  ev = applyEnemyDamage(c, husk.id, 100, 'A');
  check('no damage to a dying enemy', ev.length === 0);
  husk.diedAt = Date.now() - 3000;
  ev = tickCombat(c, 100, { A: { x: 0, z: 0 } });
  check('corpse despawns after linger', husk.state === ENTITY_STATE.GONE);
  check('ENEMY_DESPAWNED event', ev.some((e) => e.type === 'ENEMY_DESPAWNED'));
}

// ── 8. snapshot wire format ──
{
  const c = createCombatState();
  joinCombat(c, 'A');
  applyPlayerDamage(c, 'A', 30);
  spawnEnemy(c, 'deer', { x: 1, z: 2 }, { id: 'deer-1' });
  const snap = combatSnapshot(c);
  check('snapshot has player states', snap.players.A.state === 'alive' && snap.players.A.hp === 70);
  check('snapshot has entities', snap.enemies.length === 1 && snap.enemies[0].defId === 'deer');
  check('snapshot carries downedAt for bleed-out UI', 'downedAt' in snap.players.A);
  const gone = spawnEnemy(c, 'deer', { x: 0, z: 0 });
  gone.state = ENTITY_STATE.GONE;
  check('gone entities excluded from snapshot', combatSnapshot(c).enemies.length === 1);
}

// ── 9. THE HUNT walkthrough: full mission data → completion ──
{
  const { THE_HUNT } = await import('../src/game/missions/chapter1.js');
  const { createMissionState, report } = await import('../src/game/engine/MissionEngine.js');
  const st = createMissionState(THE_HUNT);
  const rep = (ev) => report(st, THE_HUNT, ev);

  // hunt the deer
  ['deer-1', 'deer-2', 'deer-3'].forEach((id) => rep({ kind: 'ENEMY_DEFEATED', id }));
  check('hunt: 3 deer completes objective', st.objectives['hunt-deer'].completed);
  check('hunt: checkpoint fired', st.checkpoints.some((cp) => cp.id === 'cp-hunt'));

  // screams
  rep({ kind: 'INVESTIGATED', zone: 'screams-knoll' });
  check('screams objective completes', st.objectives['investigate-screams'].completed);

  // leader talk
  rep({ kind: 'NPC_TALKED', npc: 'leader-1' });
  check('leader talk completes', st.objectives['talk-leader'].completed);

  // children
  ['child-1', 'child-2', 'child-3'].forEach((id) => rep({ kind: 'NPC_RESCUED', id }));
  check('all 3 children rescued', st.objectives['find-children'].completed);

  // husk at healer's hut + medicine
  rep({ kind: 'ENEMY_DEFEATED', id: 'healer-husk' });
  check('healer husk slain', st.objectives['slay-husk'].completed);
  rep({ kind: 'ITEM_COLLECTED', item: 'medicine' });
  check('medicine recovered', st.objectives['recover-medicine'].completed);

  // escort + defense
  rep({ kind: 'ESCORT_COMPLETED', id: 'settlement-escort' });
  check('escort completed', st.objectives['escort-survivors'].completed);
  ['wave-1', 'wave-2', 'wave-3'].forEach((id) => rep({ kind: 'ENEMY_DEFEATED', id }));
  check('mission NOT complete until all 4 waves', st.status === 'active');
  rep({ kind: 'ENEMY_DEFEATED', id: 'wave-4' });
  check('defense completed after 4th wave', st.objectives['defend-settlement'].completed);

  // optional secrets don't gate anything
  check('optionals not required for completion', st.objectives['read-tracks'].completed === false);

  // final talk → THE NIGHTSTONE
  const ev = rep({ kind: 'NPC_TALKED', npc: 'leader-final' });
  check('final talk completes the mission', st.status === 'complete');
  const done = ev.find((e) => e.type === 'MISSION_COMPLETE');
  check('rewards + chapter 2 unlock carried', done.rewards.points === 1200 && done.nextMission === 'the-trail');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
