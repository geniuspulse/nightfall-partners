// ============================================================
// NIGHTFALL PARTNERS — Mission Engine (Phase 3)
// A data-driven, headless mission state machine. Missions are
// pure data (see src/game/missions/); this engine interprets
// them. No rendering, no I/O — fully unit-testable, reusable in
// the text game, the 3D world, and future modes.
//
// Mission definition contract:
// {
//   id, title, chapter, intro, environment,
//   objectives: [{ id, type, title, description, requiredProgress,
//                  required (default true), requires: [objIds],
//                  match: { zone|zones, item|items, npc|npcs, choice, id } }],
//   npcs, enemies, items, dialogue,            // content (engine stores, doesn't interpret)
//   triggers,                                   // future: world-level reactions
//   checkpoints: [ { id, afterObjective } ],
//   storyChoices: [ { id, atObjective, prompt, options:
//                     [{ id, label, description, effects: {flags}, branch }] } ],
//   completion: { type: 'ALL_REQUIRED' },       // default
//   rewards: { points, xp, unlocks: [..], items: [..] },
//   nextMission: id | null,
// }
//
// Branching-ready: story choices persist flags + branch ids into
// state.storyState; future missions (or branches of one mission)
// read them via `requiresFlags` on objectives.
// ============================================================

import { OBJECTIVE_TYPES, objectiveEventType, eventMatches } from './objectives.js';

export const MISSION_STATUS = { ACTIVE: 'active', COMPLETE: 'complete', FAILED: 'failed' };

// ── Validation ───────────────────────────────────────────

export function validateMission(def) {
  const errors = [];
  if (!def?.id) errors.push('missing id');
  if (!def?.title) errors.push('missing title');
  if (!Array.isArray(def?.objectives) || def.objectives.length === 0) errors.push('mission needs at least one objective');
  const ids = new Set();
  for (const o of def?.objectives ?? []) {
    if (!o.id) errors.push('objective missing id');
    if (ids.has(o.id)) errors.push(`duplicate objective id: ${o.id}`);
    ids.add(o.id);
    if (!OBJECTIVE_TYPES[o.type]) errors.push(`objective ${o.id}: unknown type ${o.type}`);
    if (o.requires) {
      for (const r of o.requires) {
        if (!ids.has(r)) errors.push(`objective ${o.id} requires unknown/future objective ${r} (requires must reference earlier objectives)`);
      }
    }
  }
  if (errors.length) throw new Error(`Invalid mission "${def?.id}": ${errors.join('; ')}`);
  return true;
}

// ── State creation ────────────────────────────────────────

export function createMissionState(def, { startedAt = Date.now() } = {}) {
  validateMission(def);
  const objectives = {};
  for (const o of def.objectives) {
    objectives[o.id] = {
      id: o.id,
      type: o.type,
      title: o.title,
      description: o.description ?? '',
      progress: 0,
      requiredProgress: o.requiredProgress ?? 1,
      required: o.required !== false, // default required
      completed: false,
      requires: o.requires ?? [],
    };
  }
  return {
    missionId: def.id,
    status: MISSION_STATUS.ACTIVE,
    startedAt,
    updatedAt: startedAt,
    objectives,               // id → objective state
    order: def.objectives.map((o) => o.id),
    storyState: { flags: {}, choices: [], branch: null },
    checkpoints: [],         // [{ id, at, snapshot }]
    completedAt: null,
    rewardsClaimed: false,
  };
}

// ── Queries ───────────────────────────────────────────────

export function isObjectiveAvailable(state, objId) {
  const o = state.objectives[objId];
  return o.requires.every((r) => state.objectives[r]?.completed);
}

export function currentObjectives(state) {
  return state.order
    .map((id) => state.objectives[id])
    .filter((o) => !o.completed && isObjectiveAvailable(state, o.id) && !state.objectives[o.id].hidden);
}

export function isMissionComplete(state) {
  return Object.values(state.objectives)
    .filter((o) => o.required)
    .every((o) => o.completed);
}

export function getProgress(state) {
  const all = Object.values(state.objectives);
  const required = all.filter((o) => o.required);
  return {
    done: all.filter((o) => o.completed).length,
    total: all.length,
    requiredDone: required.filter((o) => o.completed).length,
    requiredTotal: required.length,
  };
}

// ── Event reporting (the heart of the engine) ─────────────

/**
 * Report a gameplay event to the engine.
 * gameEvent: { kind, id?, zone?, item?, npc?, choice?, amount? }
 * Returns engine events for UI/audio/reaction layers:
 *   OBJECTIVE_PROGRESS, OBJECTIVE_COMPLETED, MISSION_COMPLETE,
 *   CHECKPOINT_CAPTURED (when a checkpoint rule fires)
 */
export function report(state, def, gameEvent) {
  const events = [];
  if (state.status !== MISSION_STATUS.ACTIVE) return events;
  if (!gameEvent?.kind) return events;

  for (const id of state.order) {
    const objState = state.objectives[id];
    const objDef = def.objectives.find((o) => o.id === id);
    if (objState.completed || !isObjectiveAvailable(state, id)) continue;
    if (objectiveEventType(objState.type) !== gameEvent.kind) continue;
    if (!eventMatches(objDef, gameEvent)) continue;

    // acceptANY: some objectives complete on first matching event
    const amount = gameEvent.amount ?? 1;
    objState.progress = Math.min(objState.requiredProgress, objState.progress + amount);
    events.push({ type: 'OBJECTIVE_PROGRESS', objectiveId: id, progress: objState.progress, requiredProgress: objState.requiredProgress });

    if (objState.progress >= objState.requiredProgress) {
      objState.completed = true;
      objState.completedAt = Date.now();
      events.push({ type: 'OBJECTIVE_COMPLETED', objectiveId: id, title: objState.title, required: objState.required });

      // checkpoint rule: capture after this objective if declared
      const cp = (def.checkpoints ?? []).find((c) => c.afterObjective === id);
      if (cp) {
        const snapshot = serialize(state);
        state.checkpoints.push({ id: cp.id, afterObjective: id, at: snapshot.updatedAt, snapshot });
        events.push({ type: 'CHECKPOINT_CAPTURED', checkpointId: cp.id, objectiveId: id });
      }
    }
  }

  if (isMissionComplete(state)) {
    state.status = MISSION_STATUS.COMPLETE;
    state.completedAt = Date.now();
    events.push({ type: 'MISSION_COMPLETE', missionId: def.id, rewards: def.rewards ?? {}, nextMission: def.nextMission ?? null });
  }
  state.updatedAt = Date.now();
  return events;
}

// ── Story choices (branching-ready) ──────────────────────

export function availableChoices(state, def) {
  return (def.storyChoices ?? []).filter((c) => {
    if (state.storyState.choices.some((made) => made.choiceId === c.id)) return false;
    if (c.atObjective && !state.objectives[c.atObjective]?.completed) return false;
    if (c.requiresFlags && !c.requiresFlags.every((f) => state.storyState.flags[f])) return false;
    return true;
  });
}

/**
 * makeChoice(state, def, choiceId, optionId) → events
 * Applies option effects (flags) and records the branch — future
 * objectives/missions can read storyState.flags / .branch.
 * Completes the matching CHOOSE objective, if any.
 */
export function makeChoice(state, def, choiceId, optionId) {
  const events = [];
  if (state.status !== MISSION_STATUS.ACTIVE) return events;
  const choice = (def.storyChoices ?? []).find((c) => c.id === choiceId);
  if (!choice) throw new Error(`makeChoice: unknown choice ${choiceId}`);
  if (!choice.options.some((o) => o.id === optionId)) throw new Error(`makeChoice: unknown option ${optionId}`);
  if (!availableChoices(state, def).some((c) => c.id === choiceId)) return events;

  const option = choice.options.find((o) => o.id === optionId);
  for (const [k, v] of Object.entries(option.effects?.flags ?? {})) {
    state.storyState.flags[k] = v;
  }
  if (option.branch) state.storyState.branch = option.branch;
  state.storyState.choices.push({ choiceId, optionId, at: Date.now() });
  events.push({ type: 'CHOICE_MADE', choiceId, optionId, branch: option.branch ?? null });

  // complete the CHOOSE objective bound to this choice
  events.push(...report(state, def, { kind: 'CHOICE_MADE', choice: choiceId, id: choiceId }));
  return events;
}

// ── Checkpoints & save/resume ─────────────────────────────

export function serialize(state) {
  return JSON.parse(JSON.stringify(state));
}

export function deserialize(json, def) {
  // structural validation on load — mission definitions can evolve
  validateMission(def);
  const state = JSON.parse(JSON.stringify(json));
  if (state.missionId !== def.id) throw new Error(`deserialize: state is for ${state.missionId}, mission is ${def.id}`);
  for (const o of def.objectives) {
    if (!state.objectives[o.id]) {
      // mission gained a new objective since this save — add it fresh
      state.objectives[o.id] = {
        id: o.id, type: o.type, title: o.title, description: o.description ?? '',
        progress: 0, requiredProgress: o.requiredProgress ?? 1,
        required: o.required !== false, completed: false, requires: o.requires ?? [],
      };
    }
  }
  return state;
}

export function latestCheckpoint(state) {
  return state.checkpoints.length ? state.checkpoints[state.checkpoints.length - 1] : null;
}

export function restoreCheckpoint(state, checkpointId) {
  const cp = state.checkpoints.find((c) => c.id === checkpointId) ?? latestCheckpoint(state);
  if (!cp) throw new Error('restoreCheckpoint: no checkpoint to restore');
  const restored = JSON.parse(JSON.stringify(cp.snapshot));
  restored.checkpoints = state.checkpoints.filter((c) => c.at <= cp.at);
  return restored;
}

// ── Rewards & unlocks ─────────────────────────────────────

export function missionRewards(def) {
  return def.rewards ?? { points: 0 };
}

/**
 * Unlock policy: a mission is unlocked if it's the first mission,
 * or the previous mission in the chain has a COMPLETE progress row.
 * data-driven via each def's nextMission chain.
 */
export function isMissionUnlocked(defs, completions, missionId) {
  const target = defs.find((d) => d.id === missionId);
  if (!target) return false;
  const predecessor = defs.find((d) => d.nextMission === missionId);
  if (!predecessor) return true; // entry mission
  return completions.includes(predecessor.id);
}
