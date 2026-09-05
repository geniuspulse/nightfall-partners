// ============================================================
// NIGHTFALL PARTNERS — Mission Content
// Each mission ("night") is rooms with asymmetric information.
// Role "pathfinder" sees the daylight layer.
// Role "seer" sees the shadow layer.
// ============================================================

export const NIGHTS = {
  1: {
    id: 'night-1',
    title: 'The Lantern in the Dark',
    summary:
      'A curse splits your town at nightfall. Find each other across the veil before the lantern burns out.',
    intro:
      'The sun sets over Hollow Creek, and the world tears in two. You stand on opposite sides of the veil — one of you bathed in the last grey light of day, the other wrapped in the hush of shadow. Somewhere between your worlds, a lantern burns. Find each other before it goes out.',
    reward: 300,
    rooms: [
      // ── ROOM 1: The Forked Road ──
      {
        id: 'room-1',
        title: 'The Forked Road',
        story:
          'The road ahead splits into three paths: one lined with ash-grey trees, one swallowed by mist, one descending into old cellar doors set into the earth.',
        clues: {
          pathfinder:
            'You can see fresh footprints — small, bare — leading down into the cellar doors. But the mist path has a warm glow at its far end, like a lit window.',
          seer:
            'You can see the spirits: grey wisps drifting INTO the mist path, all facing one direction, like moths. The cellar doors have iron rings — cold, unhallowed, no spirit goes near them.',
        },
        interaction: {
          type: 'choice',
          prompt: 'Which path do you take? Choose together — if you disagree, the veil weakens.',
          options: [
            { id: 'trees', label: 'The ash-grey trees' },
            { id: 'mist', label: 'The swallowing mist' },
            { id: 'cellar', label: 'The cellar doors' },
          ],
          answer: 'mist',
          explain:
            'The spirits knew. The mist was a road all along — and at its end, the lantern-keeper\'s window.',
        },
      },

      // ── ROOM 2: The Whispering Lock ──
      {
        id: 'room-2',
        title: 'The Whispering Lock',
        story:
          'The mist opens onto a stone door. No handle, no hinges — only a circular lock of seven moon-dials, each pointing at a different phase.',
        clues: {
          pathfinder:
            'Above the door, scratched into the stone in daylight letters: "THE MOON SHOWS TRUTH ONLY AT ITS FULLNESS."',
          seer:
            'In the shadow layer, the dials glow. Three of them pulse brighter than the rest: the FULL moon, the HALF moon, and the CRESCENT.',
        },
        interaction: {
          type: 'code',
          prompt: 'The Pathfinder holds the inscription. The Seer sees which dials glow. How many dials does the lock want?',
          answer: '3',
          hint: 'Count what the Seer sees glowing, and heed what the inscription warns.',
          explain:
            'Three dials glowed, but the moon shows truth only at fullness. The lock wanted the three phases spoken aloud — and the door sighed open.',
        },
      },

      // ── ROOM 3: The Lantern Keeper ──
      {
        id: 'room-3',
        title: 'The Lantern Keeper',
        story:
          'Inside: a small room, one table, one lantern — and the veil itself, thin as smoke, running down the middle of the room. The lantern-keeper\'s voice fills both layers: "To pass, you must move as one. When the flame stands tallest — reach for each other. TOGETHER."',
        clues: {
          pathfinder:
            'You can see the lantern flame. It flickers low, then RISES — there, it stands tall twice before guttering.',
          seer:
            'You can see the veil. Where it thins, it glows like a scar. It is thinnest when the flame is tallest — your partner can tell you when.',
        },
        interaction: {
          type: 'sync-tap',
          prompt:
            'When the flame stands tallest, BOTH partners must reach within the same window. The Pathfinder calls the moment. Move together.',
          windowMs: 3000,
          explain:
            'Your hands met through the veil. For one impossible heartbeat, the curse held its breath — and you were both on the same side.',
        },
      },
    ],
    finale: {
      title: 'Reunited — For Now',
      text:
        'The lantern-keeper smiles. "The curse is old, and one night is not enough to break it. But tonight, you found each other — that is how every ending begins." The lantern dims. Dawn comes, hollow and thin. But you are together, and Night Two waits.',
    },
  },
  // Nights 2–5: content to be written as development continues
  2: { id: 'night-2', title: 'The Whispering Bridge', summary: 'Locked — complete Night One.', locked: true },
  3: { id: 'night-3', title: 'The Hollow Chapel', summary: 'Locked — complete Night Two.', locked: true },
  4: { id: 'night-4', title: 'The Midnight Market', summary: 'Locked — complete Night Three.', locked: true },
  5: { id: 'night-5', title: 'The Descent', summary: 'Locked — complete Night Four.', locked: true },
};
