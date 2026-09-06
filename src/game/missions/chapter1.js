// ============================================================
// NIGHTFALL PARTNERS — Chapter 1: THE HUNT
// The first complete playable story mission. PURE DATA — the
// mission engine interprets it; the world layer realizes it.
// Objectives: hunt → screams → settlement → children → medicine
// → monster → escort → defense → the Nightstone reveal.
// ============================================================

export const THE_HUNT = {
  id: 'the-hunt',
  title: 'The Hunt',
  chapter: 1,
  dbNight: 1, // missions table row for persistence
  intro:
    'Evening comes down soft over the hollow. Two hunters walk the old path together — bow on one shoulder, lantern on the other. Tonight the forest is calm. Tonight it owes you three deer.',
  environment: 'forest',

  objectives: [
    {
      id: 'hunt-deer',
      type: 'DEFEAT',
      title: 'Hunt 3 deer in the meadow',
      description: 'The meadow north of the path. They spook easy — flank together.',
      match: { ids: ['deer-1', 'deer-2', 'deer-3'] },
      requiredProgress: 3,
    },
    {
      id: 'investigate-screams',
      type: 'INVESTIGATE',
      title: 'Investigate the screams',
      description: 'Screams carry from the north. Climb the knoll and look.',
      match: { zones: ['screams-knoll'] },
      requiredProgress: 1,
      requires: ['hunt-deer'],
    },
    {
      id: 'talk-leader',
      type: 'TALK',
      title: 'Speak with the settlement elder',
      description: 'A woman with steady eyes is holding what is left of her people together.',
      match: { npc: 'leader-1' },
      requiredProgress: 1,
      requires: ['investigate-screams'],
    },
    {
      id: 'find-children',
      type: 'RESCUE',
      title: 'Find the missing children',
      description: 'Three children hid when the creatures came. Search the ruins.',
      match: { ids: ['child-1', 'child-2', 'child-3'] },
      requiredProgress: 3,
      requires: ['talk-leader'],
    },
    {
      id: 'slay-husk',
      type: 'DEFEAT',
      title: 'Slay the creature guarding the healer\'s hut',
      description: 'Something waits beside the medicine shelf. It is not a healer.',
      match: { ids: ['healer-husk'] },
      requiredProgress: 1,
      requires: ['find-children'],
    },
    {
      id: 'recover-medicine',
      type: 'COLLECT',
      title: 'Recover the medicine',
      description: 'Take what is left of the healer\'s stores back to the wounded.',
      match: { items: ['medicine'] },
      requiredProgress: 1,
      requires: ['slay-husk'],
    },
    {
      id: 'escort-survivors',
      type: 'ESCORT',
      title: 'Escort the survivors to the ridge camp',
      description: 'The old ridge trail is safe. Walk with them — do not leave them behind.',
      match: { ids: ['settlement-escort'] },
      requiredProgress: 1,
      requires: ['recover-medicine'],
    },
    {
      id: 'defend-settlement',
      type: 'DEFEAT',
      title: 'Defend the settlement',
      description: 'The dark is done pretending. Hold the ground you just carried them across.',
      match: { ids: ['wave-1', 'wave-2', 'wave-3', 'wave-4'] },
      requiredProgress: 4,
      requires: ['escort-survivors'],
    },
    {
      id: 'final-talk',
      type: 'TALK',
      title: 'Return to the elder',
      description: 'The fires are low. She has something to tell you.',
      match: { npc: 'leader-final' },
      requiredProgress: 1,
      requires: ['defend-settlement'],
    },
    // ── optional secrets ──
    {
      id: 'read-tracks',
      type: 'INVESTIGATE',
      title: 'Study the strange tracks',
      description: 'Clawprints too long, too even — like something walked on the tips of its fingers.',
      match: { zones: ['creature-tracks'] },
      requiredProgress: 1,
      required: false,
      requires: ['talk-leader'],
    },
    {
      id: 'old-shrine',
      type: 'INVESTIGATE',
      title: 'Read the burned shrine',
      description: 'Whatever the shrine promised, the fire took the promise with it.',
      match: { zones: ['burned-shrine'] },
      requiredProgress: 1,
      required: false,
      requires: ['talk-leader'],
    },
  ],

  npcs: [
    { id: 'leader-1', name: 'Mbizi the Elder', def: 'npc-leader', at: [1.5, -76] },
    { id: 'woman-1', name: 'Chikondi', def: 'npc-woman', at: [-1.5, -77] },
    { id: 'woman-2', name: 'Amai Tendai', def: 'npc-woman', at: [2.5, -79] },
    { id: 'injured-1', name: 'Josam', def: 'npc-injured', at: [-2.5, -78.5] },
    { id: 'child-1', name: 'Thoko', def: 'npc-child', at: [7.5, -84] },
    { id: 'child-2', name: 'Nema', def: 'npc-child', at: [-8, -86] },
    { id: 'child-3', name: 'Mphatso', def: 'npc-child', at: [9, -90] },
  ],
  enemies: [
    { id: 'healer-husk', def: 'hollow-husk', at: [22, -85], whenObjective: 'slay-husk' },
    { id: 'wave-1', def: 'husk-wave', at: [-3, -60], whenObjective: 'defend-settlement' },
    { id: 'wave-2', def: 'husk-wave', at: [4, -61], whenObjective: 'defend-settlement' },
    { id: 'wave-3', def: 'husk-wave', at: [-8, -63], whenObjective: 'defend-settlement' },
    { id: 'wave-4', def: 'husk-wave', at: [10, -64], whenObjective: 'defend-settlement' },
  ],
  items: [
    { id: 'medicine', name: 'Healer\'s Satchel', at: [22, -86] },
  ],
  dialogue: {
    'leader-1': {
      nodes: [{ id: 'n1', speaker: 'Mbizi', text: 'They came when the light thinned. They did not take food. They did not take coin. They took the children that ran — and they left the ones who could not.', next: null },
              { id: 'n2', speaker: 'Mbizi', text: 'Three little ones hid before the fires. Find them, hunters. And there is medicine at the healer\'s hut, east of here — my people are burning with more than fear.', next: null }],
    },
    'leader-final': {
      nodes: [{ id: 'n1', speaker: 'Mbizi', text: 'You came back. I did not think anyone would come back.', next: null },
              { id: 'n2', speaker: 'Mbizi', text: 'The creatures — they were not hunting us. They turned the huts over. They dug beneath the shrine. They were searching.', next: null },
              { id: 'n3', speaker: 'Mbizi', text: 'For a stone. I heard the tall one hiss it through its teeth when the fires caught it. *The Nightstone.* It is not from here, hunters. And it is not the only thing that wants it.', next: null }],
    },
  },
  triggers: [],

  checkpoints: [
    { id: 'cp-hunt', afterObjective: 'hunt-deer' },
    { id: 'cp-screams', afterObjective: 'investigate-screams' },
    { id: 'cp-children', afterObjective: 'find-children' },
    { id: 'cp-medicine', afterObjective: 'recover-medicine' },
    { id: 'cp-escort', afterObjective: 'escort-survivors' },
    { id: 'cp-final', afterObjective: 'final-talk' },
  ],

  storyChoices: [],

  completion: { type: 'ALL_REQUIRED' },

  rewards: { points: 1200, unlocks: ['the-trail'], flavor: 'The survivors are safe. The forest owes you a debt it will not admit.' },
  nextMission: 'the-trail',
};

// ── Chapter 2 (stub — data shell, locked until Chapter 1 completes) ──
export const THE_TRAIL = {
  id: 'the-trail',
  title: 'The Trail',
  chapter: 2,
  dbNight: 2,
  intro: 'The Nightstone is a name with no home. Follow the clawprints north.',
  environment: 'forest',
  objectives: [
    { id: 'coming-soon', type: 'EXPLORE', title: 'Chapter 2 is coming', description: 'The trail goes cold here — for now.', requiredProgress: 1 },
  ],
  npcs: [], enemies: [], items: [], dialogue: {}, triggers: [], checkpoints: [], storyChoices: [],
  completion: { type: 'ALL_REQUIRED' },
  rewards: { points: 0 },
  nextMission: null,
};

export const CHAPTERS = [THE_HUNT, THE_TRAIL];
export const CHAPTERS_BY_ID = Object.fromEntries(CHAPTERS.map((m) => [m.id, m]));
