// ============================================================
// NIGHTFALL PARTNERS — Demo Mission: "First Light"
// Proves the mission engine end-to-end inside the 3D forest.
// PURE DATA — no engine code. Future missions are authored
// exactly like this file, without touching the engine.
//
// Environment hooks (zone ids) reference the forest prototype's
// interaction zones; the ForestGame bridge translates gameplay
// into engine events (see src/game3d/ForestGame.jsx).
// ============================================================

export const FIRST_LIGHT = {
  id: 'first-light',
  title: 'First Light',
  chapter: 0,
  intro:
    'The veil between Hollow Creek and the other world is thin tonight. Somewhere past the fog wall, an old path remembers where it was going. Light the way — together.',
  environment: 'forest',

  objectives: [
    {
      id: 'read-waystone',
      type: 'INVESTIGATE',
      title: 'Read the leaning waystone',
      description: 'Something is carved into the moss at the edge of the path. Look closer.',
      match: { zones: ['waystone-1'] },
      requiredProgress: 1,
    },
    {
      id: 'walk-old-path',
      type: 'REACH_LOCATION',
      title: 'Walk the old path to the far lantern post',
      description: 'The path bends north past the split milestone. Follow it to the second lantern.',
      match: { zones: ['lp-2-approach'] },
      requiredProgress: 1,
      requires: ['read-waystone'],
    },
    {
      id: 'kindle-lanterns',
      type: 'ACTIVATE',
      title: 'Kindle both lantern posts',
      description: 'Two cold lanterns wait for a word and two hands.',
      match: { zones: ['lp-1', 'lp-2'] },
      requiredProgress: 2,
      requires: ['read-waystone'],
    },
    {
      id: 'find-partner',
      type: 'FIND_PARTNER',
      title: 'Find your partner in the dark',
      description: 'The forest changes when two lanterns are close. Find them.',
      requiredProgress: 1,
      requires: ['walk-old-path'],
    },
    {
      id: 'read-milestone',
      type: 'INVESTIGATE',
      title: 'Read the split milestone',
      description: 'A milestone cracked clean in two — one half printed, one half hand-carved.',
      match: { zones: ['waystone-2'] },
      requiredProgress: 1,
      required: false, // optional — a secret
    },
    {
      id: 'the-choice',
      type: 'CHOOSE',
      title: 'At the ring of stones, choose what to whisper',
      description: 'The ring breathes cold. Whatever is said here, the other world keeps.',
      match: { choice: 'ring-whisper' },
      requiredProgress: 1,
      requires: ['find-partner', 'kindle-lanterns'],
    },
  ],

  npcs: [
    // content reserved for Phase 5+: positioned actors with dialogue trees
    { id: 'wren', name: 'Wren', dialogueTree: 'wren-intro', atZone: 'waystone-1' },
  ],
  enemies: [
    // content reserved for Phase 6+: the forest is still safe
  ],
  items: [
    { id: 'ember-shard', name: 'Ember Shard', atZones: ['lp-1', 'lp-2'] },
  ],
  dialogue: {
    'wren-intro': {
      nodes: [
        { id: 'n1', text: 'You found the waystone. In the other world, someone just felt you read it.', next: null },
      ],
    },
  },
  triggers: [],

  checkpoints: [
    { id: 'cp-1', afterObjective: 'read-waystone' },
    { id: 'cp-2', afterObjective: 'find-partner' },
    { id: 'cp-3', afterObjective: 'the-choice' },
  ],

  storyChoices: [
    {
      id: 'ring-whisper',
      atObjective: 'find-partner', // available once partners have met
      requiresFlags: [],
      prompt: 'The ring of stones is cold-breathing. Whisper something into it — the other world is listening.',
      options: [
        {
          id: 'whisper-name',
          label: 'Whisper your partner\'s name',
          description: 'Names have weight. The stone will remember who you came with.',
          effects: { flags: { ringWhisper: 'name' } },
          branch: 'bond',
        },
        {
          id: 'whisper-light',
          label: 'Whisper for light',
          description: 'Ask the dark for one more hour of morning.',
          effects: { flags: { ringWhisper: 'light' } },
          branch: 'dawn',
        },
      ],
    },
  ],

  completion: { type: 'ALL_REQUIRED' },

  rewards: { points: 300, unlocks: ['ember-hollow'], flavor: 'The lanterns remember being lit.' },
  nextMission: 'ember-hollow',
};

export const MISSIONS = [FIRST_LIGHT];
export const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
