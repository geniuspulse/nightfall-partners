// ============================================================
// NIGHTFALL PARTNERS — Objective Type Registry (Mission Engine)
// The data-driven contract between mission definitions and the
// engine. Each objective type maps to a gameplay EVENT kind;
// mission authors never write engine code — they declare
// { type, match, requiredProgress } and report events.
//
// Adding a new objective type = adding one entry here.
// ============================================================

export const OBJECTIVE_TYPES = {
  EXPLORE:        { event: 'ZONE_ENTERED',     verb: 'Explore',        icon: '🧭' },
  REACH_LOCATION: { event: 'ZONE_ENTERED',     verb: 'Reach',          icon: '📍' },
  FIND:           { event: 'ITEM_FOUND',       verb: 'Find',           icon: '🔎' },
  RETRIEVE:       { event: 'ITEM_RETRIEVED',    verb: 'Retrieve',       icon: '📤' },
  COLLECT:        { event: 'ITEM_COLLECTED',    verb: 'Collect',        icon: '🎒' },
  RESCUE:         { event: 'NPC_RESCUED',       verb: 'Rescue',         icon: '🫱' },
  ESCORT:         { event: 'ESCORT_COMPLETED', verb: 'Escort',         icon: '🚶' },
  PROTECT:        { event: 'PROTECTION_HELD',  verb: 'Protect',        icon: '🛡' },
  INVESTIGATE:    { event: 'INVESTIGATED',      verb: 'Investigate',    icon: '🕯' },
  DEFEAT:         { event: 'ENEMY_DEFEATED',    verb: 'Defeat',         icon: '⚔' },
  SURVIVE:        { event: 'SURVIVED',          verb: 'Survive',        icon: '⏳' },
  ESCAPE:         { event: 'ESCAPED',           verb: 'Escape',         icon: '🏃' },
  REPAIR:         { event: 'REPAIRED',          verb: 'Repair',         icon: '🔧' },
  ACTIVATE:       { event: 'ACTIVATED',         verb: 'Activate',       icon: '🔥' },
  SOLVE:          { event: 'SOLVED',            verb: 'Solve',          icon: '🧩' },
  FIND_PARTNER:   { event: 'PARTNER_MET',       verb: 'Find',           icon: '👥' },
  RETURN:         { event: 'RETURNED',          verb: 'Return',         icon: '↩' },
  TALK:           { event: 'NPC_TALKED',        verb: 'Talk to',        icon: '💬' },
  CHOOSE:         { event: 'CHOICE_MADE',       verb: 'Choose',         icon: '🌿' },
};

export function objectiveEventType(type) {
  const t = OBJECTIVE_TYPES[type];
  if (!t) throw new Error(`Unknown objective type: ${type}`);
  return t.event;
}

/**
 * Does a game event match an objective?
 * objective.match (all optional): { zones: [..], zone, item, items, npc, npcs, choice, id }
 * No match clause → the objective accepts ANY event of its type.
 */
export function eventMatches(objective, gameEvent) {
  const m = objective.match;
  if (!m) return true;

  const eventId = gameEvent.id ?? gameEvent.zone ?? gameEvent.item ?? gameEvent.npc ?? gameEvent.choice;

  if (m.zone !== undefined) {
    const zones = m.zones ?? [m.zone];
    if (!zones.includes(gameEvent.zone ?? eventId)) return false;
  }
  if (m.zones !== undefined && !m.zones.includes(gameEvent.zone ?? eventId)) return false;
  if (m.item !== undefined) {
    const items = m.items ?? [m.item];
    if (!items.includes(gameEvent.item ?? eventId)) return false;
  }
  if (m.items !== undefined && !m.items.includes(gameEvent.item ?? eventId)) return false;
  if (m.npc !== undefined) {
    const npcs = m.npcs ?? [m.npc];
    if (!npcs.includes(gameEvent.npc ?? eventId)) return false;
  }
  if (m.npcs !== undefined && !m.npcs.includes(gameEvent.npc ?? eventId)) return false;
  if (m.choice !== undefined && m.choice !== (gameEvent.choice ?? eventId)) return false;
  if (m.id !== undefined && m.id !== (gameEvent.id ?? eventId)) return false;
  return true;
}
