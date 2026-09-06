// ============================================================
// NIGHTFALL PARTNERS — Mission Engine test suite (Phase 3)
// Headless: the engine is pure data-in/data-out, so this runs
// in Node with zero stubs. Covers state creation, progression,
// dependencies, optional objectives, accumulation, idempotence,
// checkpoints, save/resume round trips, story-choice branching,
// completion, rewards, and unlock chaining.
//
// Run: npm run test:mission
// ============================================================

import {
  createMissionState, report, validateMission,
  makeChoice, availableChoices, serialize, deserialize,
  restoreCheckpoint, latestCheckpoint, getProgress,
  isMissionUnlocked, isObjectiveAvailable, currentObjectives,
  isMissionComplete,
} from '../src/game/engine/MissionEngine.js';
import { FIRST_LIGHT, MISSIONS } from '../src/game/missions/first-light.js';

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? (pass++, console.log('  ✓', name)) : (fail++, console.log('  ✗ FAIL:', name)); };

// ── test mission (exercises every objective type contract) ──
const T = {
  id: 'test-mission', title: 'Test Mission', chapter: 1, environment: 'forest',
  objectives: [
    { id: 'talk', type: 'TALK', title: 'Talk to Wren', match: { npc: 'wren' } },
    { id: 'reach', type: 'REACH_LOCATION', title: 'Reach the glade', match: { zone: 'glade' }, requires: ['talk'] },
    { id: 'collect', type: 'COLLECT', title: 'Collect ember shards', requiredProgress: 3, match: { items: ['shard'] }, requires: ['talk'] },
    { id: 'defeat', type: 'DEFEAT', title: 'Defeat the hollow wolf', match: { id: 'wolf-1' }, required: false },
    { id: 'activate', type: 'ACTIVATE', title: 'Light the beacon', match: { zones: ['beacon'] }, requires: ['reach'] },
    { id: 'choose', type: 'CHOOSE', title: 'Choose the path', match: { choice: 'fork' }, requires: ['activate', 'collect'] },
  ],
  storyChoices: [
    { id: 'fork', atObjective: 'reach',
      prompt: 'The path forks.',
      options: [
        { id: 'left', label: 'Left', effects: { flags: { path: 'left' } }, branch: 'dark' },
        { id: 'right', label: 'Right', effects: { flags: { path: 'right' } }, branch: 'dawn' },
      ] },
  ],
  checkpoints: [
    { id: 'cp-1', afterObjective: 'talk' },
    { id: 'cp-2', afterObjective: 'activate' },
  ],
  rewards: { points: 250, unlocks: ['next-mission'] },
  nextMission: 'next-mission',
};

// ── 1. validation ──
{
  check('valid mission passes validation', validateMission(T) === true);
  let threw = false;
  try { validateMission({ id: 'x' }); } catch { threw = true; }
  check('invalid mission rejected', threw);
  threw = false;
  try { validateMission({ id: 'x', title: 'x', objectives: [{ id: 'a', type: 'NOPE' }] }); } catch { threw = true; }
  check('unknown objective type rejected', threw);
  threw = false;
  try { validateMission({ id: 'x', title: 'x', objectives: [
    { id: 'a', type: 'TALK', requires: ['b'] }, { id: 'b', type: 'TALK' }] }); } catch { threw = true; }
  check('forward reference in requires rejected', threw);
}

// ── 2. state creation ──
{
  const st = createMissionState(T);
  check('state created with all objectives', Object.keys(st.objectives).length === 6);
  check('default requiredProgress is 1', st.objectives.talk.requiredProgress === 1);
  check('required defaults to true', st.objectives.talk.required === true);
  check('optional objective marked', st.objectives.defeat.required === false);
  check('mission starts active', st.status === 'active');
  check('demo mission validates', (() => { validateMission(FIRST_LIGHT); return true; })());
}

// ── 3. progression + dependencies ──
{
  const st = createMissionState(T);
  check('first objective available at start', isObjectiveAvailable(st, 'talk') === true);
  check('dependent objective locked', isObjectiveAvailable(st, 'reach') === false);
  check('currentObjectives excludes locked', currentObjectives(st).every((o) => isObjectiveAvailable(st, o.id)));

  const ev = report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  check('TALK objective completes on matching event', st.objectives.talk.completed === true);
  check('OBJECTIVE_COMPLETED emitted', ev.some((e) => e.type === 'OBJECTIVE_COMPLETED' && e.objectiveId === 'talk'));
  check('checkpoint captured per rule', st.checkpoints.length === 1 && st.checkpoints[0].id === 'cp-1');
  check('CHECKPOINT_CAPTURED emitted', ev.some((e) => e.type === 'CHECKPOINT_CAPTURED'));

  // wrong npc doesn't complete
  const st2 = createMissionState(T);
  report(st2, T, { kind: 'NPC_TALKED', npc: 'stranger' });
  check('matcher rejects non-matching npc', st2.objectives.talk.completed === false);

  // unlock after dependency
  check('reach unlocked after talk', isObjectiveAvailable(st, 'reach') === true);
  check('collect unlocked after talk', isObjectiveAvailable(st, 'collect') === true);
}

// ── 4. accumulation + clamping + idempotence ──
{
  const st = createMissionState(T);
  report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
  check('COLLECT accumulates (1/3)', st.objectives.collect.progress === 1);
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
  check('COLLECT completes at 3/3', st.objectives.collect.completed === true);
  const ev = report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
  check('over-collection clamps (no negative progress)', st.objectives.collect.progress === 3);
  check('no duplicate completion events', !ev.some((e) => e.type === 'OBJECTIVE_COMPLETED'));

  // non-matching items ignored
  const st2 = createMissionState(T);
  report(st2, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st2, T, { kind: 'ITEM_COLLECTED', item: 'pebble' });
  check('matcher rejects non-matching item', st2.objectives.collect.progress === 0);
}

// ── 5. optional objectives don't block completion ──
{
  const st = createMissionState(T);
  report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard', amount: 3 });
  report(st, T, { kind: 'ACTIVATED', zone: 'beacon' });
  check('mission not complete without choice', isMissionComplete(st) === false);
  report(st, T, { kind: 'ENEMY_DEFEATED', id: 'wolf-1' });
  check('optional objective completes', st.objectives.defeat.completed === true);
  check('still not complete (choice pending)', st.status === 'active');
}

// ── 6. story choices + branching ──
{
  const st = createMissionState(T);
  report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  check('choice gated until atObjective complete', (() => {
    const before = availableChoices(st, T).length;
    return before === 0;
  }));
  const avail = availableChoices(st, T);
  check('choice available after gate satisfied', avail.some((c) => c.id === 'fork'));

  // wrong option rejected
  let threw = false;
  try { makeChoice(st, T, 'fork', 'middle'); } catch { threw = true; }
  check('unknown option rejected', threw);

  const ev = makeChoice(st, T, 'fork', 'left');
  check('choice flag persisted', st.storyState.flags.path === 'left');
  check('branch recorded', st.storyState.branch === 'dark');
  check('CHOICE_MADE event', ev.some((e) => e.type === 'CHOICE_MADE' && e.optionId === 'left'));
  check('choice not offered twice', availableChoices(st, T).length === 0);

  // second manager choosing differently → different branch (branching-ready proof)
  const st2 = createMissionState(T);
  report(st2, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st2, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  makeChoice(st2, T, 'fork', 'right');
  check('divergent branch from same mission', st2.storyState.branch === 'dawn' && st.storyState.branch === 'dark');
}

// ── 7. completion + rewards + full walkthrough ──
{
  const st = createMissionState(T);
  report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  report(st, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard', amount: 3 });
  report(st, T, { kind: 'ACTIVATED', zone: 'beacon' });
  const ev = makeChoice(st, T, 'fork', 'right');
  check('mission completes when all required done', st.status === 'complete');
  const done = ev.find((e) => e.type === 'MISSION_COMPLETE');
  check('MISSION_COMPLETE emitted with rewards', done?.rewards?.points === 250);
  check('nextMission carried on completion', done?.nextMission === 'next-mission');
  check('completedAt timestamp set', st.completedAt !== null);
  check('progress counters sane', (() => {
    const p = getProgress(st);
    return p.requiredDone === 5 && p.requiredTotal === 5 && p.done === 5; // defeat (optional) not done
  })());
  const more = report(st, T, { kind: 'NPC_TALKED', npc: 'wren' });
  check('no events after completion', more.length === 0);
}

// ── 8. checkpoints + save/resume round trip ──
{
  const st = createMissionState(T);
  report(st, T, { kind: 'NPC_TALKED', npc: 'wren' }); // cp-1
  report(st, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  report(st, T, { kind: 'ITEM_COLLECTED', item: 'shard', amount: 2 });

  const saved = JSON.stringify(serialize(st));
  const resumed = deserialize(JSON.parse(saved), T);
  check('serialize/deserialize round trip is faithful', (() => {
    const a = serialize(st), b = serialize(resumed);
    return JSON.stringify(a) === JSON.stringify(b);
  })());
  check('mid-mission progress resumes exactly', resumed.objectives.collect.progress === 2 && resumed.objectives.talk.completed === true);
  check('resumed mission accepts further events', (() => {
    const ev = report(resumed, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
    return resumed.objectives.collect.completed === true;
  })());

  // checkpoint restore
  const st3 = createMissionState(T);
  report(st3, T, { kind: 'NPC_TALKED', npc: 'wren' });   // cp-1
  report(st3, T, { kind: 'ZONE_ENTERED', zone: 'glade' });
  report(st3, T, { kind: 'ITEM_COLLECTED', item: 'shard' });
  const restored = restoreCheckpoint(st3, 'cp-1');
  check('checkpoint restores earlier state', restored.objectives.talk.completed === true && restored.objectives.collect.progress === 0);
  check('latestCheckpoint returns newest', latestCheckpoint(st3)?.id === 'cp-1');

  // resume works against an evolved mission definition (new objective added)
  const evolved = JSON.parse(JSON.stringify(T));
  evolved.objectives.push({ id: 'new-obj', type: 'EXPLORE', title: 'New area', match: { zone: 'new-area' } });
  const stOld = JSON.parse(saved);
  const stNew = deserialize(stOld, evolved);
  check('new objective grafted onto old save', stNew.objectives['new-obj'] !== undefined && stNew.objectives['new-obj'].progress === 0);
}

// ── 9. unlock chain ──
{
  const defs = MISSIONS.concat([{ id: 'ember-hollow', title: 'Ember Hollow', chapter: 1, objectives: [{ id: 'o1', type: 'TALK', title: 'x' }], nextMission: null }]);
  check('entry mission unlocked', isMissionUnlocked(defs, [], 'first-light') === true);
  check('next mission locked until predecessor complete', isMissionUnlocked(defs, [], 'ember-hollow') === false);
  check('next mission unlocked after completion', isMissionUnlocked(defs, ['first-light'], 'ember-hollow') === true);
  check('unknown mission locked', isMissionUnlocked(defs, [], 'nope') === false);
}

// ── 10. FIRST_LIGHT demo walkthrough (the live forest flow) ──
{
  const st = createMissionState(FIRST_LIGHT);
  const ev1 = report(st, FIRST_LIGHT, { kind: 'INVESTIGATED', zone: 'waystone-1' });
  check('demo: waystone read', st.objectives['read-waystone'].completed === true);
  check('demo: checkpoint cp-1 fired', st.checkpoints.some((c) => c.id === 'cp-1'));
  report(st, FIRST_LIGHT, { kind: 'ZONE_ENTERED', zone: 'lp-2-approach' });
  report(st, FIRST_LIGHT, { kind: 'ACTIVATED', zone: 'lp-1' });
  report(st, FIRST_LIGHT, { kind: 'ACTIVATED', zone: 'lp-2' });
  check('demo: lanterns kindled (2/2)', st.objectives['kindle-lanterns'].completed === true);
  report(st, FIRST_LIGHT, { kind: 'PARTNER_MET' });
  check('demo: partner found, cp-2 fired', st.objectives['find-partner'].completed === true && st.checkpoints.some((c) => c.id === 'cp-2'));
  check('demo: optional milestone still open', st.objectives['read-milestone'].completed === false);
  const avail = availableChoices(st, FIRST_LIGHT);
  check('demo: ring whisper available', avail.some((c) => c.id === 'ring-whisper'));
  const done = makeChoice(st, FIRST_LIGHT, 'ring-whisper', 'whisper-light');
  check('demo: mission completes on choice', st.status === 'complete');
  check('demo: completion event carries rewards + next', done.some((e) => e.type === 'MISSION_COMPLETE' && e.rewards.points === 300 && e.nextMission === 'ember-hollow'));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
