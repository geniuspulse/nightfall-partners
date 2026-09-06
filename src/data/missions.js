// ============================================================
// NIGHTFALL PARTNERS — The Story
// Each mission ("night") is a chapter: rooms with asymmetric
// information. The Pathfinder sees the daylight layer. The Seer
// sees the shadow layer. No room can be solved alone.
//
// THE OVERALL ARC:
// Hollow Creek is torn by the Grey Veil — a curse born in 1907,
// when Wren Ashwal lost her husband Tomas on their wedding night
// and the town's grief split the world in two. Every night since,
// the veil falls. Every dawn, it lifts. Wren has kept a lantern
// burning at the seam for over a century, waiting for a couple
// who can do what she could not: cross to each other.
// Five nights. Five crossings. The curse breaks — or they don't.
// ============================================================

export const NIGHTS = {
  // ──────────────────────────────────────────────────────────
  // NIGHT ONE — THE LANTERN IN THE DARK
  // The curse falls. You find each other across the veil.
  // ──────────────────────────────────────────────────────────
  1: {
    id: 'night-1',
    title: 'The Lantern in the Dark',
    summary:
      'The Grey Veil falls over Hollow Creek for the first time in your lives. Somewhere across the seam, your partner is standing in the other world — and an old lantern is the only light either of you has.',
    intro:
      'They say it happened at dusk, the way it always does. One moment, Hollow Creek was an ordinary town pretending at ordinary things. The next, the light went grey and the world tore along its oldest scar — a seam down the middle of everything.\n\nYou felt it before you saw it: the air turned to held breath. And then you were alone. The streets are empty. The windows are dark. But you know — the way you know your own heartbeat — that your partner is out there too, standing in the same town, on the other side of the veil. They see a different world than you do. One of you walks in the last grey light of day. The other walks in the hush of shadow, where the dead things drift.\n\nFar away, at the seam of the world, a lantern is burning. It has burned for a hundred and nineteen years. Find it. Find each other. Dawn is coming, and the veil will lift — but what happens tonight will decide whether you are ever truly in the same world again.',
    reward: 300,
    rooms: [
      // ── ROOM 1: The Forked Road ──
      {
        id: 'room-1',
        title: 'The Forked Road',
        story:
          'The lane out of town splits three ways at the old milestone. The air is wrong here — thick, like the moment before lightning. Whichever path you take, you take it alone. But your partner stands at this same crossroads in their own world, and the two of you can still speak — voices carrying thin across the veil, if you lean close enough.',
        clues: {
          pathfinder:
            'In the daylight layer, you can read the milestone\'s worn engraving: "THREE ROADS. ONE CROSSES. THE DEAD KNOW WHICH." And below, in the ash: fresh footprints — small, bare, human — leading down into the cellar doors set into the hillside. Someone living took that path. But the mist-road glows warm at its far end, like a window with a light behind it.',
          seer:
            'In the shadow layer, you can see them — the dead of Hollow Creek, grey wisps drifting down all three roads. But look: on the tree-road they wander confused, circling. By the cellar doors they balk and turn away, as if the iron rings burned them. Only the mist-road has a current — every spirit on it faces the same direction, like moths against glass. Whatever they are moving toward, they move toward it together.',
        },
        interaction: {
          type: 'choice',
          prompt:
            'Three roads, one crossing. The dead know which — and only one of you can read the stone, while only the other can read the dead. Choose together.',
          options: [
            { id: 'trees', label: 'The road of ash-grey trees' },
            { id: 'mist', label: 'The swallowing mist' },
            { id: 'cellar', label: 'The cellar doors in the hill' },
          ],
          answer: 'mist',
          explain:
            'The dead of Hollow Creek drift down the mist like it was a river with a mouth — and the milestone does not lie: the dead know which road crosses. You step into the mist together, worlds apart, and the warm glow at its end grows: a lantern in a window.',
        },
      },

      // ── ROOM 2: The Whispering Lock ──
      {
        id: 'room-2',
        title: 'The Whispering Lock',
        story:
          'The mist opens like a held breath released. Before you stands a crooked cottage that exists in both worlds at once — the same building, wearing two faces. In the daylight layer it is whitewashed and sagging, with herbs in the windows. In the shadow layer it is black timber and cold starlight, and every shutter is an eye.\n\nThe door has no handle. No hinges. Only a circular lock of seven moon-dials, each frozen at a different phase of the moon — and none of them matching the moon above you now.',
        clues: {
          pathfinder:
            'In the daylight layer, the lintel above the door carries a scratched inscription you can read plainly: "THE MOON SHOWS TRUTH ONLY AT ITS FULLNESS. SPEAK WHAT BURNS, AND ENTER."',
          seer:
            'In the shadow layer, the dials are not still — they glow. Faint light in three of them, like coals under ash: the FULL moon burns brightest, the HALF moon second, the CRESCENT a dim ember. The other four dials are dead and dark.',
        },
        interaction: {
          type: 'code',
          prompt:
            'One of you holds the inscription; the other sees which dials burn. The lock wants a single number. Speak it together.',
          answer: '3',
          hint: 'Count only what the Seer sees burning — the inscription says the moon shows truth at its fullness, but it asks you to speak what burns.',
          explain:
            'Three dials burn in the shadow of the lock. The Pathfinder speaks the number and the moon-dials spin — full, half, crescent — grinding like an old woman turning in her sleep. The door exhales and opens.',
        },
      },

      // ── ROOM 3: The Two Faces of Wren ──
      {
        id: 'room-3',
        title: 'The Two Faces of Wren',
        story:
          'Inside the cottage there is one room, one table, one lantern — and one woman standing at the seam of the world, where the veil runs down the middle of the floor like a curtain of smoke. She exists fully in neither of your worlds. She is the reason there is a lantern at all.\n\n"I am Wren," she says, and her voice arrives in both layers like a chord. "Keeper of this seam, these hundred and nineteen years. You found the door. Good. The road beyond it is mine to open — but my lantern does not burn for free."\n\nShe extends one hand across the table. Her eyes are different colours — one for each world — and she is waiting.',
        clues: {
          pathfinder:
            'In the daylight layer, Wren is an old woman, silver-haired, kind in a worn-out way — and the lantern she keeps is no lantern at all. Inside its glass, where the flame should be, there is a photograph. A young couple, arm in arm, laughing. The flame flickers around it like something protecting it. Around her cottage, the daylight walls are papered with hundreds of small drawings — homes, streets, faces — each one dated, each one made by a hand that never stopped remembering.',
          seer:
            'In the shadow layer, Wren is young — barely twenty — and hollow-eyed, with a scar of pale light across her heart, the exact shape and place of a wound. Where the daylight walls are papered with drawings, the shadow walls are papered with the same drawings, but every one is unfinished, cut off mid-line, as if the hand that drew them was interrupted every single time. And the spirits here do not avoid her cottage — they come to it, one by one, and each carries a small light in its hands, which it feeds gently to her lantern before drifting away.',
        },
        interaction: {
          type: 'choice',
          prompt:
            'The lantern does not burn for free, and each of you sees a different truth about what feeds it. Wren asks what you will offer to open the road. Choose together — and choose what she actually keeps.',
          options: [
            { id: 'name', label: 'Your names — trade them to her' },
            { id: 'memory', label: 'A memory — one you share' },
            { id: 'nothing', label: 'Nothing. Ask her for the road, plainly' },
          ],
          answer: 'memory',
          explain:
            '"A memory," you say — one voice in each world — and Wren closes her eyes like you have cut something loose in her. The spirits bring her memories; her lantern has been fed with them for a century. It is the only fuel a lantern can burn here. She takes yours gently, folds it into the glass, and the flame stands up tall and bright. "The road is open," she says. "Follow it down. There is something I need you to see."',
        },
      },

      // ── ROOM 4: The Memory Well ──
      {
        id: 'room-4',
        title: 'The Memory Well',
        story:
          'Behind the cottage, where no garden should be, the road ends at a well — ringed in stone older than the town, its mouth breathing cold. Wren stands beside it, and for the first time she looks afraid.\n\n"This is where it happened," she says. "Where the veil first tore. Everything the curse is, it poured out of this well, on a night that should have been the happiest of my life. Look into it. Both of you. And understand what you are fighting."',
        clues: {
          pathfinder:
            'In the daylight layer, the well\'s stone lip carries a carved chronicle you can read clearly: "WED IN \'99. WIDOWED BY DUSK THE SAME DAY. THE VEIL TORE IN THE YEAR OF THE TORNADO — SHE TOOK HIM IN HER ARMS AND THE WORLD COULD NOT DECIDE WHICH SIDE OF IT TO KEEP HIM ON." Below, one last line, carved deeper than the rest: "SPEAK HOW LONG SHE SEARCHED — THE YEARS, THE WHOLE NUMBER — AND THE WELL WILL SHOW YOU THE REST."',
          seer:
            'In the shadow layer, the well is not dark. It is full of floating lights — years, peeled off a human life, hanging in the water like sunken stars. Three of them glow brighter than all the rest, and as you look, each flares and shows a scene: a young woman in a wedding dress lighting a lantern (\'99). The same woman, older, in a black shawl, building a bridge out of driftwood and grief (\'04). And a wall of absolute dark rising over the town like a wave — the veil, tearing — (\'07). The other lights are dim and say nothing.',
        },
        interaction: {
          type: 'code',
          prompt:
            'The well wants one number before it shows you the rest. One of you reads what it demands; the other sees the years that matter. Speak the number together — the whole number of years.',
          answer: '8',
          hint: 'The Seer sees the year the search began and the year the veil tore. Count from one to the other — the whole span.',
          explain:
            'Eight years. From the lantern lit in \'99 to the veil torn in \'07 — eight years she searched for a way across, and the tearing of it is what cursed the town. You speak the number and the well exhales every light at once, and for a moment you both see her: young Wren, arms around a young man, and the world splitting down the middle of them. It did not take sides. It kept neither of them.',
        },
      },

      // ── ROOM 5: The Reach ──
      {
        id: 'room-5',
        title: 'The Reach',
        story:
          'When the vision clears, Wren is standing in the seam itself — one foot in daylight, one in shadow, the only person in Hollow Creek who can do that, and only because she has been doing it for a hundred and nineteen years. Her lantern is in her hands, and its flame is the thread the veil hangs by.\n\n"I could never reach him," she says simply. "You are the first pair to walk the whole seam since him and me. So I am asking. When the flame stands tallest — reach for each other. Across everything. If you can do what I couldn\'t, even for one heartbeat, then this can be broken. All of it. Every night, every veil. Begin at the beginning: TOGETHER."',
        clues: {
          pathfinder:
            'You can see the lantern flame — the only thing in Hollow Creek that lives in both worlds. It flickers low, low, lower... and then it RISES. Twice, it stands tall as a held breath. Each rise is the seam thinning to nothing. Count it out loud: your partner cannot see the flame.',
          seer:
            'You can see the veil itself — where it thins, it glows like a scar in the air. It pulses brightest in rhythm with something you cannot see, but your partner can: the flame. When they call the moment, the veil is already thin. All you must do is reach on their word.',
        },
        interaction: {
          type: 'sync-tap',
          prompt:
            'The Pathfinder calls the moment the flame stands tallest. The Seer reaches on the word. Both, inside the same window — across the veil, across everything. Move as one.',
          windowMs: 3000,
          explain:
            'Your hands meet. Through the veil, through the smoke of a hundred and nineteen years — you feel the warm solid fact of each other, one impossible heartbeat. The curse holds its breath. Wren covers her mouth with both hands. Nobody has touched through the seam since the night it tore.',
        },
      },
    ],
    finale: {
      title: 'One Heartbeat — and Dawn',
      text:
        'The lantern dims to a coal. The seam softens to mist. And dawn comes up over Hollow Creek, grey and thin, but dawn all the same.\n\nWren walks you both to the edge of the cottage ground, where the worlds are almost one. "I need you to understand what tonight was," she says. "It was a proof. The veil can be crossed — by the right two people, at the right thin places. There are four thin places left in this town, and every one of them is a night of its own. The bridge that drowned. The chapel that emptied. The market that never closes. And the place at the bottom of it all.\n\n"Rest today. When dusk comes again — go to the river. The Whispering Bridge is waiting, and it remembers me."\n\nShe turns back to her cottage, and for a moment the light catches her face, and she is young.',
    },
  },

  // ──────────────────────────────────────────────────────────
  // NIGHT TWO — THE WHISPERING BRIDGE
  // The drowned bridge over the black river. Where the veil first
  // thinned over water — and where voices only carry one way.
  // ──────────────────────────────────────────────────────────
  2: {
    id: 'night-2',
    title: 'The Whispering Bridge',
    summary:
      'Dusk again. The black river that cut Hollow Creek in two — before the veil ever did — and the drowned bridge across it. On the water, voices only carry one direction: the Seer hears the Pathfinder. The Pathfinder hears only the river.',
    intro:
      'You did not sleep so much as wait for dusk.\n\nThe river runs along the valley floor below the town, black as poured ink, and it was drowning things long before the curse came. The old crossing — the Whispering Bridge, the drowned call it — rises from the water in broken stone spans, and every span is a thin place. Wren\'s lantern still burns at your backs; ahead, across the water, stands the far-bank chapel, dark against the last light.\n\nBut the bridge has rules, older than Wren and meaner. On this water, a voice only carries one way: the daylight layer cannot hear the shadow layer across the river. The Seer hears everything you say, Pathfinder. But what they say back to you — the river keeps.\n\nCross together. The far shore has bells, and they are ringing for no reason at all.',
    reward: 400,
    rooms: [
      // ── ROOM 1: The Toll of Names ──
      {
        id: 'room-1',
        title: 'The Toll of Names',
        story:
          'The first span is guarded by a tollhouse flooded to its windows — a drowned room with a drowned counter, and behind the counter, a figure of silt and patience, holding out a hand that has been open for a very long time. The bridge does not let the unbonded cross. The toll has never been money.',
        clues: {
          pathfinder:
            'In the daylight layer, above the tollhouse door, you can read the faded paint of an old sign: "TWO VOICES. ONE VOW. THE RIVER KEEPS ITS TOLL AND RETURNS NOTHING." The counter before the silt-keeper is bare except for a bowl of river-stones — each one smooth, each one worn in the shape of being held by two hands at once.',
          seer:
            'In the shadow layer, you can see the crossing dead — couples, generations of them, standing at this counter. Watch what they do: each pair takes a single stone, and each pair SPEAKS over it, out loud. Not names. Not secrets. The river carries the words down and the stone drinks them, and only then does the silt-keeper\'s hand close and let them pass. You listen hard, and one word survives the water. An old woman\'s voice, from long ago: "...promise..."',
        },
        interaction: {
          type: 'choice',
          prompt:
            'The silt-keeper\'s hand is open, and it will not close for nothing. One of you can read what the toll is; the other has watched the dead pay it. Choose together what you give the river.',
          options: [
            { id: 'secret', label: 'A secret — told aloud to the water' },
            { id: 'promise', label: 'A promise — one you make to each other' },
            { id: 'stone', label: 'A river-stone — taken and given back' },
          ],
          answer: 'promise',
          explain:
            'You take a stone from the bowl, hold it between your two hands — worlds apart, one weight — and you make a promise over it. Each of you, out loud. The Pathfinder cannot hear the Seer\'s voice across the water, but they see the stone go warm. The silt-keeper\'s hand closes around a century of patience, and the first span opens with a sound like a held breath released.',
        },
      },

      // ── ROOM 2: The Drowned Bells ──
      {
        id: 'room-2',
        title: 'The Drowned Bells',
        story:
          'Halfway across, the spans sink toward the waterline, and here the river shows you what it keeps. Beneath the surface, hanging from the bridge\'s drowned bones, is a chapel\'s worth of bells — rung into the river the night the town emptied, one by one, by hands nobody remembers. They hang in the black like a congregation at prayer.\n\nThe bells began ringing when you stepped onto this span. All of them. It is not a welcome.',
        clues: {
          pathfinder:
            'In the daylight layer, you can see a drowned toll-sign hanging crooked under the water, and read it through the current: "THE RIVER KEEPS FIVE BELLS. SPEAK THE NUMBER THAT STILL RING FOR THE LIVING, AND BE PASSED BY THE REST."',
          seer:
            'In the shadow layer, the bells are luminous — and not all of them ring. Four of the five swing and toll with a sound like buried voices. But the fifth hangs dead still, wrapped in chains of dark: it is the bell that was rung last, the night the veil tore, and the river chained it to keep what\'s inside it. The ringing four still answer the living. The silent one answers to nobody.',
        },
        interaction: {
          type: 'code',
          prompt:
            'The sign under the water demands a number: the bells that still ring for the living. One of you reads the demand; the other counts the ringing. Speak it together, over the water.',
          answer: '4',
          hint: 'Count only the bells that swing and toll — not the one the river chained silent.',
          explain:
            'Four. You say it over the black water and four bells fall silent at once, obedient, while the fifth — the chained one — shudders once, as if it heard you anyway. The river goes glass-still, and the sunken span rises just enough out of the water to walk.',
        },
      },

      // ── ROOM 3: The Wrong Reflection ──
      {
        id: 'room-3',
        title: 'The Wrong Reflection',
        story:
          'The last long span. The mist comes off the water here and walks the bridge with you, and in the mist each of you can see the other: your partner, ahead on the far half of the span, waving you forward. Their coat. Their walk. Their face, smiling, exactly as you know it.\n\nBut here is the thing about the river: it shows reflections, and it decides what they reflect. And the person in the mist is standing on the WRONG side — because the real one is on the other side of the veil, exactly where they should be. One of these two figures is the river, fishing.',
        clues: {
          pathfinder:
            'In the daylight layer, the mist-figure of your partner looks perfect — until they wave. You know that wave. They do it with the wrong hand. Everything about the figure is a memory of your partner, drawn from your own mind, and it is beckoning you toward the low rail, toward the water, where the current curls like a waiting hand.',
          seer:
            'In the shadow layer, you see what the mist is made of: drowned things, wearing your partner\'s shape the way a coat is worn. Under the mist-figure\'s feet there is no reflection on the bridge stones — nothing that walks the shadow layer casts none, and this thing casts none. But the true path is marked: a line of small white candles guttering along the RIGHT-hand rail, each flame leaning away from the water, toward the chapel. The dead light candles for the living to follow.',
        },
        interaction: {
          type: 'choice',
          prompt:
            'The river is fishing with a face you love, and the true crossing is marked for only one of you to see. Choose together how you cross the last span.',
          options: [
            { id: 'eyes', label: 'Follow the figure — it looks so exactly like them' },
            { id: 'voice', label: 'Eyes closed — follow each other\'s voices, not the mist' },
            { id: 'candles', label: 'Follow the white candles along the rail' },
          ],
          answer: 'voice',
          explain:
            'You close your eyes, both of you, and walk the span by voice alone — the Seer calling across the veil, the Pathfinder answering on the word. The mist-figure wavers and comes apart, because a river can wear a face but it cannot hold a conversation with the one who loves it. The wrong hand was wrong. You step off the span onto the far shore, together, and behind you something in the water makes a sound like a line going slack.',
        },
      },

      // ── ROOM 4: The Far Shore ──
      {
        id: 'room-4',
        title: 'The Far Shore',
        story:
          'The gap before the far bank is the bridge\'s broken final span — ten feet of black air and blacker water. And down the river, coming up level with you, two funeral barges glide, each carrying a single lit lantern: one visible in your world, one in your partner\'s. This is the crossing the bridge kept for last. It is not a gap you jump alone.\n\nWren\'s voice reaches you faintly from somewhere behind and above, from both worlds at once: "The barges align at the tall flame. That is the only moment the gap closes. TOGETHER — or the river keeps you."',
        clues: {
          pathfinder:
            'You can see the daylight barge — its lantern flame burning low on the water, then flaring, rising, standing tall. The gap between the spans begins to close only while that flame stands. Count the moment out loud: your partner cannot see your barge.',
          seer:
            'You can see the shadow barge, and more: the water between the spans, which in your layer is thin as a pane of glass — and beneath it, the drowned original span, whole and walkable, a road under the water that only exists while the two flames are tall together. When your partner calls the moment, the glass road is there. Reach. Jump. It will hold exactly once.',
        },
        interaction: {
          type: 'sync-tap',
          prompt:
            'The Pathfinder calls the alignment — the tall flame. The Seer jumps on the word, onto the road under the water that only one of you can see. Both of you, inside the same window, across the last gap of the Whispering Bridge.',
          windowMs: 3000,
          explain:
            'You leap — both of you — on one word, into a gap that was only a gap when it was watched. For a half-second you cross above the river and through it at once, two worlds overlapping like hands. You land on the far shore as the barges pass, and every chained bell in the river rings once — even the silent fifth — and the chapel before you stops pretending to be empty.',
        },
      },
    ],
    finale: {
      title: 'The Far Bank — and the Bells That Followed',
      text:
        'You stand on the far shore, where nobody from Hollow Creek has stood at night since the veil tore. Behind you, the Whispering Bridge settles into the water with a long sigh, satisfied — the toll paid, the crossing proven.\n\nAnd before you: the Hollow Chapel. It has no doors left to open. Its windows are eyes. Its bells — the ones they say were rung the night the town emptied — hang silent in its tower, watching you, and the fifth one from the river now hangs among them, still wet.\n\nFrom the chapel doorway, a voice that is not Wren\'s and is older than hers calls out over the gravel: "Two more. It has been so long since anyone came together."\n\nRest. Dawn is coming up behind you, warm for once.',
    },
  },

  // ──────────────────────────────────────────────────────────
  // NIGHTS THREE TO FIVE — the road ahead
  // ──────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────
  // NIGHT THREE — THE HOLLOW CHAPEL
  // The doorless chapel on the far shore. The congregation that
  // never left, the bells that answer only to couples — and the
  // voice that has been waiting one hundred and nineteen years.
  // ──────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────
  // NIGHT THREE — THE HOLLOW CHAPEL
  // The doorless chapel on the far shore. The congregation that
  // never left, the bells that answer only to couples — and the
  // voice that has been waiting one hundred and nineteen years.
  // ──────────────────────────────────────────────────────────
  3: {
    id: 'night-3',
    title: 'The Hollow Chapel',
    summary:
      'The far-shore chapel with no doors and a congregation that never left. The bells stopped mid-toll the night the town emptied — and the fifth one is still holding its breath.',
    intro:
      'You crossed the Whispering Bridge at dawn, and you never went home — because home is on the other side of the river now, in every way that matters. All day the chapel has stood over you on its gravel rise, windowless at noon, and all day you have heard it singing. Not from the tower. From inside the walls themselves, faint as a hymn sung through closed lips.\n\nThe Hollow Chapel has no doors left. It had them once — the hinges are still there, great iron straps rusted into the stone — but the doorways were filled in the same night the town emptied, bricked with honest stones that do not pretend to be anything other than what they are. The windows are eyes. The bells hang silent in the tower — except the fifth from the river, which hangs wet, and trembles when the singing passes beneath it.\n\nThe voice that called to you from the doorway at dawn said it has been so long since anyone came together. It was not Wren\'s voice. It was older than hers, and it has been patient.\n\nThe veil falls. Dusk is here. Sing back.',
    reward: 500,
    rooms: [
      // ── ROOM 1: The Doorless Threshold ──
      {
        id: 'room-1',
        title: 'The Doorless Threshold',
        story:
          'Up close, the filled-in doorway is a wall of stones fitted without mortar, each one worn smooth as a riverbed pebble — a wall built in a night, by hands that had no time to be careful. The hymn bleeds through it, and you can feel the bass of it in your teeth. Somewhere behind you, very faintly, Wren\'s lantern flickers — she would not come past the bridge. This is the one place in Hollow Creek she has never been able to stand since the night the veil tore.',
        clues: {
          pathfinder:
            'In the daylight layer, the stones of the sealed doorway are carved — hundreds of names, paired two by two, over and over, weathered generations deep. This is not just a chapel. It is a wedding chapel, and every couple ever wed here gave the threshold their names. The last carving is different from the rest: only HALF-FINISHED. One name chiseled deep and true — WREN ASHWAL — and beside it a second name barely begun: three letters, T, O, M, and then nothing, as if the mason\'s hand was pulled away mid-stroke.',
          seer:
            'In the shadow layer, the doorway is not sealed at all. It is an open mouth, and the congregation pours their song out of it like smoke. The hymn is a WEDDING HYMN — you know it the way everyone knows it, the one sung last, when the couple turns to face the town. But the shadows sing it slowly, gardener-slow, waiting. And the doorway\'s threshold stone, seen from the shadow side, is not full: it is HUNGRY. Names carved in the daylight layer glow faintly here — all of them — except one patch of stone, smooth and empty, shaped exactly like a space that has been kept free.',
        },
        interaction: {
          type: 'choice',
          prompt:
            'One of you can read the rite of the threshold: names, given two by two. The other can see the doorway wants. The wall has held since the town emptied. Choose together how you ask it to open.',
          options: [
            { id: 'knock', label: 'Knock — as a guest knocks' },
            { id: 'hymn', label: 'Join the hymn — sing back through the stone' },
            { id: 'names', label: 'Speak your names to the stone, as the wed do' },
          ],
          answer: 'names',
          explain:
            'You give the threshold what every couple ever gave it: your names, spoken together, two voices at once. The stone drinks the sound. Every carved pair lights in sequence like lamps being lit down a wedding aisle — and the half-carved TOM burns brightest of all, waiting, unfinished. Then the wall exhales a hundred years of dust and the stones un-stack themselves, politely, the way a door opens when it finally recognizes family.',
        },
      },

      // ── ROOM 2: The Pews of the Waiting ──
      {
        id: 'room-2',
        title: 'The Pews of the Waiting',
        story:
          'Inside, the congregation is exactly where a congregation should be: seated. Pews and pews of shadows, facing the altar, singing the wedding hymn around and around — and around and around it goes, never ending, never beginning, with a hole in the harmony the size of one voice. The air smells of candle-smoke and river water. Nobody turns to look at you. Nobody stops singing. But the aisle down the middle stands open like an unspoken question, and the altar at the far end is where every one of those bowed shadow-heads is pointed.',
        clues: {
          pathfinder:
            'In the daylight layer, the chapel is empty — pews, floor, altar rail, all honest wood and honest dust. On the wall by the door hangs the WEDDING REGISTER, a ledger fat with one hundred and nineteen years of marriages. The final entry, in a celebrant\'s hurried hand: ASHWAL — ??? — the second surname blotted out, never finished, the same date as every other record in town ending. And beside the ledger, a small brass plate: WEDDING PARTIES ARE SEATED AT PEW 17.',
          seer:
            'In the shadow layer, the congregation fills every pew — every pew but one. Pew after pew of singing shadows, and then one pew, mid-church, left side, sitting empty and dark. It is not just unoccupied; it is UNTOUCHED — no shadow will so much as face it, though they sing around it carefully, the way you carry water past a sleeping child. The missing voice in the hymn is a YOUNG MAN\'S — a tenor, high and sure, and the harmony leans on the empty space where it should be, and has leaned there for a hundred and nineteen years.',
        },
        interaction: {
          type: 'code',
          prompt:
            'The hymn cannot be finished without the missing voice, and the congregation will not rise for you until its place is honored. One of you holds the register\'s brass plate; the other can see which pew stands empty. Speak the number of the pew, together, out loud.',
          answer: '17',
          hint: 'The register names where wedding parties sit — but it is the Seer who can see which pew the congregation itself refuses to fill.',
          explain:
            'You speak it together: seventeen. And the congregation\'s singing stops — total, sudden, relieved silence, the first silence this chapel has kept in a hundred and nineteen years. Then, softly, they begin the hymn again from the beginning. But this time, at the turn where the tenor\'s voice belongs, the empty pew gives it back. Pew 17 sings. The aisle unclenches. You may walk to the altar.',
        },
      },

      // ── ROOM 3: The Sexton ──
      {
        id: 'room-3',
        title: 'The Sexton',
        story:
          'At the altar rail stands the voice that called to you at dawn. He is a tall, spare shape in the sexton\'s black — the keeper of this church, who buried the parish and married it and rang for it, and never once in a hundred and nineteen years sat down. His face is kind the way November is kind. "Two more," he says again, and it is not a greeting, it is arithmetic. "I have waited for a pair since the town walked. I will let you to the tower. But the tower is where the bells stopped, and I require that you understand them first. So. Tell me: what stopped the bells?"',
        clues: {
          pathfinder:
            'In the daylight layer, you can see the tower stair winding up through the ringing chamber: five bell-ropes hang down through the ceiling, the way ropes do in ringing chambers — and you can read their ends like a story. FOUR of the ropes are frayed to powdery fibers, worn through, rope-ends splayed like burst brooms. But the FIFTH rope — the one on the far ring, its wheel still crusted with river silt — was not worn through at all. It was CUT. One stroke, clean, deliberate, while the rope was still taut.',
          seer:
            'In the shadow layer, the tower\'s memory replays itself, the way this whole chapel remembers its worst night. You watch the ringing: many hands on the four ropes — farmers, bakers, children even — all pulling, all ringing the changes. And the fifth rope, one pair of young hands, ringing alone, ringing hard. The fifth toll rolls out — and something ANSWERS IT. Not an echo. An answer: one toll went down into the earth, and TWO came back. And every ringer in the chamber stops. And every ringer in the chamber puts down their rope — the four ropes fray as they fall — and walks out of the chapel into the dark, and keeps walking, and does not stop walking. The young hands on the fifth rope are the last to go. They cut the rope so nothing could ever be answered again.',
        },
        interaction: {
          type: 'choice',
          prompt:
            'One of you read the ropes. The other watched the night itself. Tell the Sexton, together, what stopped the bells.',
          options: [
            { id: 'broke', label: 'The fifth bell broke — and the town mourned it silent' },
            { id: 'answered', label: 'The bells were answered from below — and the town followed the answer' },
            { id: 'fear', label: 'Fear cut the rope — the ringers silenced it themselves' },
          ],
          answer: 'answered',
          explain:
            '"Yes," says the Sexton, and for the first time in a hundred and nineteen years, somebody in this chapel says a thing out loud that the singing has been covering. "One toll went down. Two came back. The town heard its own funeral answered, and it went to meet it. Not one of them feared, child. They FOLLOWED. That is what the mason could not carve into the doorway: hope is heavier than grief." He unhooks the altar rail gate. "You understand the bells. Climb."',
        },
      },

      // ── ROOM 4: The Gate Under the Choir ──
      {
        id: 'room-4',
        title: 'The Gate Under the Choir',
        story:
          'The tower stair does not go up, at first. It goes down — behind the altar, through a low arch into the crypt beneath the choir, where the chapel buries its own. But the crypt is wrong, and you both feel it before you can say it: the niches cut into the walls, row on row of them, meant for the parish dead — and every single one is EMPTY. Not robbed. Never used. The dust in them lies undisturbed a hundred years deep. The whole town is down here, in theory. Not one of them is down here in fact. At the far end of the crypt, the stair bends upward at last toward the ringing chamber — but the way is shut by a gate of black iron latticework, older than the chapel itself, older than the town, with a lock that has no keyhole. It has a carved lip. A mouth. It wants to be sung to.',
        clues: {
          pathfinder:
            'In the daylight layer, you can read the carving set into the gate\'s crossbar: SING TO ME THE VERSE THAT IS NOT SUNG. And nailed beside it, a hymn board — a small wooden board listing the wedding hymn\'s verses, I, II, III, IV, V, the numbering every churchgoer knows. But verse IV has been struck through with a single knife-scratch, scored so deep the wood is scarred white around it, and over the strike-through someone has written, in a hand you now recognize as the Sexton\'s: LEFT UNSUNG.',
          seer:
            'In the shadow layer, you can HEAR why. The congregation overhead has been looping the hymn since before you entered the chapel — verses one, two, three, and then five. Always five. They have sung it past verse four a thousand times tonight, and every single time they pass it, the entire congregation holds its breath, all at once, and lets it go when verse five begins. Verse four is not forbidden. Verse four is UNBEARABLE: it is the wedding verse, the blessing on the two made one, the one the whole town sang at every marriage — and no one has been able to sing it since the night it was last sung, at a wedding that never finished.',
        },
        interaction: {
          type: 'code',
          prompt:
            'The gate wants the number of the verse that is not sung. One of you can read the board; the other can hear the hole the congregation leaves. Speak the verse\'s number, together.',
          answer: '4',
          hint: 'The hymn board has five verses, but the carving asks for the one the congregation will not sing — count which one they skip.',
          explain:
            'You say it together: four. And the gate drinks the number like a hymn. The iron latticework folds back into itself, a mouth finally given the right word, and the stair upward opens — but for one moment, all around you, every empty niche in the crypt hums the wedding verse in the voices of the people who are supposed to be lying in them, singing it on your behalf, because there is a wedding in the chapel again, and the dead still know their parts.',
        },
      },

      // ── ROOM 5: The Fifth Bell ──
      {
        id: 'room-5',
        title: 'The Fifth Bell',
        story:
          'The ringing chamber. Five wheels, five ropes, four of them hanging dead and frayed — and the fifth bell, the one from the river, hanging wet in the tower above you, wrapped chin to crown in chains that are not the river\'s. They are shadow-chains, forged of the dark under the pews, and they are TIGHT — tight as held breath. The Sexton does not follow you up the last stair. From below, his voice comes up the tower like smoke: "A bell answers a bell. That one has been silent one hundred and nineteen years because it has nothing to answer it — and because it holds the last toll ever rung in Hollow Creek, which I will not let the river have twice. Two of you. One sound. Strike as one, when the chain goes slack — and the bell will give back what it has been keeping."',
        clues: {
          pathfinder:
            'In the daylight layer, you can see the chains plainly — and they move. They run tight, tighter, tightest... and then, all at once, SLACK, the links sagging like a held breath let go. It is the same rhythm the congregation kept around the unsung verse — and it comes about every little while, never on a schedule you can predict. You cannot see inside the bell. But you can see the mallet that hangs beside it on the wheel-post, worn smooth by the hands of every ringer who ever lived in this town.',
          seer:
            'In the shadow layer, the chains glow faintly, and you can see INSIDE the bell through them. Curled in the bowl of it is a TOLL — a single note, folded up like a sleeping bird, glowing like a coal kept alive under ash. A hundred and nineteen years in there. When the chains go slack, the note STIRS, unfolds halfway, lifts its head. And you understand, the way you understand your own heartbeat, that the toll is a VOICE — a young man\'s voice, a tenor — and that it has been waiting in the dark for someone to answer it, the way he once answered the town.',
        },
        interaction: {
          type: 'sync-tap',
          prompt:
            'The Pathfinder calls the moment the chains go slack. The Seer strikes with them, together, as one — both hands on the mallet, across the veil. The window is small. The bell has waited long enough.',
          windowMs: 3000,
          explain:
            'The mallet swings as one, and the fifth bell of Hollow Chapel rings for the first time since the night the town emptied. And out of it, at last, pours the toll it has been holding: a young man\'s voice, a tenor, high and sure — the missing pew, the missing verse, the unfinished carving, all of it one voice — and it is not saying words, it is saying a NAME. Wren. The bell rings her name the way a man rings it who believes she can still hear him. The congregation below finishes the hymn — all five verses, at last, with the tenor singing, whole — and then, gently, the singing ends. For the first time in one hundred and nineteen years, the Hollow Chapel is silent, and the silence is not empty. It is at peace.',
        },
      },
    ],
    finale: {
      title: 'The Toll That Was Kept — and Dawn',
      text:
        'You come down the tower stair, and the congregation is gone — not vanished: GONE, the way rain is gone from a leaf, the way the last note of a hymn is gone. The Sexton stands alone in the aisle among the empty pews, hat in his hands for the first time you have seen, and he is not arithmetic anymore. "Pew 17 was theirs," he says, simply. "I kept it dusted. The river kept the bell, and I kept the rest. You may tell the lantern-keeper her tenor sang true, every night, and that he rang for her to the very end."\n\nHe walks you to the doorway, and the stones stack themselves closed behind you, gently, at rest. Below the gravel rise, the crypt gate stands open on the dark stair that goes down past the chapel — down toward what the bells were answered from. "The town did not vanish, whatever the daylight says," the Sexton tells you. "They went down. Most stopped at the Market — the Midnight Market, where the dead trade what they remember of daylight for what they need of courage. Some went further. If you are going, you will need to buy, and the Market has been saving a stall for a pair like you."\n\nDawn comes up over the far shore, over the river, over Wren\'s lantern on the bridge. You walk back across the Whispering Bridge carrying a name the fifth bell gave you to deliver — a hundred and nineteen years of post, and you are the postmen. She sees your faces before you reach her. She already knows. She has known since the bell rang.',
    },
  },

  4: {
    id: 'night-4',
    title: 'The Midnight Market',
    summary: 'Locked — free the Hollow Chapel first. The market that never closes, where the dead trade memories for memories — and something there has been saving a stall for you.',
    locked: true,
  },
  5: {
    id: 'night-5',
    title: 'The Descent',
    summary: 'Locked — the final night. Below the town, below the river, below everything: the place where Wren\'s lantern came from. The beginning — and, if you are brave enough together, the end of the veil.',
    locked: true,
  },
};
