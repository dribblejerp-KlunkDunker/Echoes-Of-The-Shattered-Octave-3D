// ============================================================
//  house13 — Phase 13 "The Hush comes closer", team HOUSE: "The Kept House".
//
//  A haunted-house side quest in Oakhaven. Nobody in it is a monster. A house has kept something half-finished.
//    * WHO: Bethan Marl, a neighbour (new person, standing in the lane outside the shut house in the north-west corner,
//      the one the map calls "A shuttered house"). She keeps the key and will not use it.
//    * WHAT [PROPOSED, all of it]: the Tarrows (Gil the reed-cutter, Maud, Linnet who is eight, and Gil's mother Nan)
//      went out on the last cart before the gate was barred. Nan could not be moved and was dying. The family was
//      holding her Last Note, counting it out in eights (one count to each Anchor, let go on the eighth) and the cart
//      was at the door at seven. Nan died an hour later with only a neighbour at the bed, and a neighbour is not blood.
//      So the note was never let go, the Hedge keeps what it is given and was never given the eighth count, and the
//      house is keeping the rest: a kettle that comes up to the boil and never gets there, a child's voice counting
//      one to seven, the three First Reeds over the door hanging still while every reed in the lane stirs. Nan had
//      taken her own reed down, wrapped it in a shawl and hidden it in her room. (The Hedge, not anything else, keeps
//      the sounds of Oakhaven and gives them back in the voices it was given: Vol V ruling. The Hush is never shown.)
//    * HOW: take the key; go in; find what is kept with the tuning fork (js/songcraft12.js; Gil's spare is on his
//      bench if you carry none); read the name on the reed's tag; hold Nan's pitch (REEDS.holdPitch, js/reedcraft.js)
//      for nine breaths; then give the nursery its eighth count, in silence, as funerals are held now. The house
//      goes quiet and stays quiet. Reward: 10 sovereigns, Hedge standing +5, a small trinket, a journal line.
//    * HOW THE HOUSE BEHAVES WRONG (all deterministic, none hurts): the back room (Nan's) takes the sound of your
//      own footsteps and dulls the air; the parlour gives your footsteps back a beat late; the kitchen kettle sings
//      a boil that never comes; the nursery counts to seven and stops. Three props sit where you left them only when
//      you are not looking: the kettle, a chair and a wooden horse each have two resting places and only ever change
//      while outside the view cone (and not within 1.4 cells), on entering the house or on passing into another room.
//
//  GAMEPLAY EFFECTS (the one table):
//    effect                        value                                      where
//    Hedge standing                +5 once (changeRep 'hedge')                finish
//    sovereigns / xp               +10 / +40 once                             finish
//    Linnet's Counting-Beads       use: clears the Hush meter (G.stillT = 0), once per game day
//                                  caps G.noise at 2.4 (never raises it)       item p13h_beads
//    Mute room (Nan's)             footsteps silent; Audio_.muffle floor 0.35  p13h_tarrow, back room, quest open
//    Echo room (parlour)           each footstep repeated once after 0.46 s    p13h_tarrow, parlour, quest open
//    Prop move                     one prop, at most once per 18 s, never in view
//    Stronger moment               Full scares only, once: the nursery's sound drops away for 1.6 s (muffle floor 0.9)
//    Damage / combat / locks       none. No enemy. Every interior door opens, the street door is never locked behind you.
//
//  STATE: G.flags under p13h_ only, validated on every read (see FLAGS): q stage 0-3, ask 0-2, open, pos 0-7 (which
//  resting place each prop is at), visits 0-99, seen 0-63 (room lines said), fork, full, bday, done, closed. Props,
//  people and the key reed are TRANSIENT entities (never saved) rebuilt from the flags; the map itself is built
//  deterministically so saved entity indexes line up. Anything else under the prefix is dropped on load.
//  CLOSED STATE: if the Greening (or the escape, or Part Three) comes first, an open quest writes one journal line and
//  the people and props leave; the door goes back to being barred. Nothing here ever touches a main-quest flag.
//  SWITCH: Options -> Graphics & access -> "The Tarrows' house" (default On; localStorage 'octave.house13.v1'). Off =
//  the original town: the door is barred as before, nobody is in the lane, no wrapped behaviour does anything.
//  SCARES: NERVES13.scaresAllowed() when present (team NERVES), default 'gentle'. Only the one Full moment checks it.
//  ART: procedural stand-ins (canvas, cached once). Every invented fact is marked [PROPOSED]; all player-visible text is
//  in TX, registered through S() so the tests and the French file can be checked against the code.
// ============================================================
'use strict';

const HOUSE13 = (function () {
  const KEY = 'octave.house13.v1';
  const cfg = { on: true };
  function loadCfg() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object' && typeof o.on === 'boolean') cfg.on = o.on; } catch (e) { /* storage blocked: the default stands */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ on: cfg.on })); } catch (e) { /* ignore */ } }

  const MAPID = 'p13h_tarrow';
  const DOOR_AT = [6, 7];                 // Oakhaven's "A shuttered house" (4,4,5x4): the door in its south face
  const NAN_HZ = 188;                     // [PROPOSED] Nan Tarrow's Signature: a little under Joram Pellow's 203
  const B = {
    PASS: 0.5,                            // Hold the Pitch score that counts (the game's own "fail" line)
    HOLD_SECS: 9,
    MOVE_GAP: 18,                         // seconds between prop moves
    HIDE_MARGIN: 0.45,                    // radians beyond the half field of view inside which a prop counts as watched
    HALF_FOV: Math.atan(0.66),            // js/engine.js: plane length 0.66
    NEAR: 1.4,                            // a prop this close is always watched
    ECHO_MS: 460,
    MUTE_FLOOR: 0.35,
    HUSH_FLOOR: 0.9, HUSH_SECS: 1.6,
    COUNT_GAP: 38, COUNT_BEAT: 0.9, COUNT_N: 7,
    COUNT_RANGE: 4.8,
    KETTLE_RANGE: 7, KETTLE_PERIOD: 5.5,
    GOLD: 10, XP: 40, REP: 5,
    BEADS_NOISE: 2.4,
  };

  // ---------------------------------------------------------------- text (every player-visible string goes through S)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      label: S('The Tarrows\' house'),
      hint: S('a haunted-house side quest in Oakhaven: a neighbour, a shut house, rooms where sound goes wrong. Off: the house stays barred and nobody asks.'),
    },
    mapName: S('The Tarrows\' house'),
    door: {
      label: S('The Tarrows\' house'),
      shut: S('The Tarrows\' house. The door is shut, not barred, and nobody has answered it for weeks. Three reeds hang still above it. The neighbour has the key.'),
      out: S('Out to the street'),
      inner: S('A door'),
    },
    lintel: {
      three: S('Three First Reeds over the Tarrows\' door, and a bare nail beside them. Down the lane every reed stirs when the wind comes through the Hedge. These hang as if they were nailed.'),
      four: S('Four First Reeds over the Tarrows\' door. They stir when the wind comes through the Hedge, like every reed in the lane. None of them sounds. None of them has to.'),
    },
    wenna: {
      name: S('Bethan Marl, neighbour to the Tarrows'),
      greet: {
        polite: S('Softly, if you would. I stand out here because I cannot sit in there.'),
        normal: S('Does it ring? Not next door, it does not. Keep your voice down.'),
        blunt: S('If you mean to shout, shout at your own door.'),
      },
      topics: {
        'The Tarrows': S('Gil cut reeds. Maud kept the carders\' books. Linnet is eight and counts everything she walks past. Nan was Gil\'s mother, and the oldest voice in this lane. They went out on the last cart before the gate was barred.'),
        'The First Reed': S('Tuned to you before you can lift your head, and hung over the door. Every reed in this lane stirs a little when the wind comes through the Hedge. The Tarrows\' hang still. The wind goes round them.'),
        'The Hedge': S('It keeps every sound this town ever made. It has your first cry and your mother\'s last word, and it gives them back when it likes, in whatever voice it was given. That is the only mercy in it.'),
        'The Last Note': S('When one of us is dying the family holds their pitch until the body lets go, and counts it out in eights, one for each Anchor. On the eighth, the note is let go. We do it in silence now. It is not that we are afraid. It is that it does not carry.'),
      },
      intro: S('Does it ring? No. That is the trouble. Look at the lintel next door: three reeds and a bare nail. The family went out on the last cart before the gate was barred, three weeks gone, and that house has not been empty since. There is a kettle in there that comes up to the boil all night and never gets there. And a child, counting. One to seven. Always seven. That is Linnet, the girl; she is well, I watched her go. It is only her voice the Hedge has, the way it has all of ours, and it will not hand it back finished. I have the key. I have not used it.'),
      again: S('You again. Will you go in? I have not stopped hearing it, and I would rather it were you than me.'),
      yes: S('I will go in.'),
      no: S('Not today.'),
      declined: S('No. No, I would not either. I will be here.'),
      accept: S('She presses a cold iron key into your hand and closes your fingers over it. "Nan would not be moved. She was dying the night they left. They were holding her note, all four of them, counting it out the way we do, and the cart was at the door at seven. She went an hour after. I was the only one at the bed, and I am not blood. It will not take from me." She wipes her hands down her apron. "Touch what you like. It does not mind. It only keeps. If the sound goes out of your feet in the back room, that is the house, not you. Gil kept a fork on his bench in the workroom, if you have none."'),
      acceptFork: S('She presses a cold iron key into your hand and closes your fingers over it. "Nan would not be moved. She was dying the night they left. They were holding her note, all four of them, counting it out the way we do, and the cart was at the door at seven. She went an hour after. I was the only one at the bed, and I am not blood. It will not take from me." She wipes her hands down her apron. "Touch what you like. It does not mind. It only keeps. If the sound goes out of your feet in the back room, that is the house, not you. You have a fork. Use it. Something in there is being kept, and a fork will find it."'),
      waiting: S('Have you been in? The back room is Nan\'s. Something is being kept in there, and a tuning fork will find it faster than your eyes.'),
      found: S('You found her reed. She took it down off the door herself, the old fool, so that nobody would hang a dead woman\'s note beside the children\'s. Hold it for her. Anyone can who will stay to the end. That is all family ever was.'),
      held: S('You held it. I felt it go, through the wall, like a pot taken off. Now the nursery. That count wants an eighth, and I never could say it. Do it in silence. Go on.'),
      done: S('Quiet. Not the Hedge\'s quiet. The other kind, the kind a house makes. I put my ear to the wall last night and heard my own kettle through it. I have hung her reed back on its nail. All four, now.'),
    },
    look: {
      board: S('A pitch-board nailed beside the door, the way a household keeps its pitches: four notches cut in a plank, each with a name in chalk. GIL. MAUD. LINNET, in a child\'s chalk, rubbed out and written again. NAN, the lowest, cut deepest: a little under Gil\'s.'),
      shelfFront: S('Cloaks on pegs. Three pegs, three cloaks. The fourth peg holds a shawl-pin and nothing else.'),
      hearth: S('The hearth is swept and cold, and has been for weeks.'),
      kettle: S('A tin kettle. There is no fire under it, and the water in it is cold, and it is making the small rising sound of water about to boil. It never boils.'),
      kitchenTable: S('A table laid for four. Three bowls are clean. In the fourth a spoon stands upright, as if somebody had set it down for an old woman who could not hold it.'),
      chair: S('A plain chair with a worn seat. It is cold, and it is only a chair.'),
      dulcimer: S('Gil\'s dulcimer on its shelf, the strings stopped with strips of cloth, the way you do when a house is to be left.'),
      parlourTable: S('A reckoning-table with the carders\' books on it, closed. Maud\'s writing on the top one: "Back by the first frost."'),
      bed: S('A bed stripped to the straw. The pillow has kept the shape of a head.'),
      cot: S('A cot, made up, the blanket turned back. The air above it is waiting for a number it has stopped at.'),
      cotEarly: S('The air above the cot is waiting for something. It is not time yet. The old woman\'s note comes first; the count only ends once it has been let go.'),
      toy: S('A wooden horse with one ear chewed. It stands on its four feet.'),
      bench: S('Gil\'s bench: a reed-knife, a block of cane, a jar of slots. Everything is where a careful man leaves it when he means to come back.'),
      shelfWork: S('Cut reeds in bundles, each tagged with a name. Hung, not sounded. A trade in people\'s breath, kept in order.'),
      bundle: S('A shawl on a stool in the corner, folded small. Something hard in the fold.'),
      bundleHeld: S('Nan\'s reed, wrapped again in her shawl. It has stopped answering. It is only a reed.'),
    },
    reed: {
      title: S('A shawl, folded'),
      body: S('You unfold the shawl on the bed-straw. A reed, long and old, cut and slotted a lifetime ago, on a cord worn pale. A tag on the cord, in a small unsteady hand: <i>NAN TARROW</i>. Taken down off the door by the one it was tuned to, wrapped, and put where nobody would hang it beside the children\'s. It is the only thing in the house that is sounding. You cannot hear it. You can feel your breastbone answer.'),
      hold: S('Hold her note'),
      leave: S('Leave it for now'),
      journal: S('In the back room of the Tarrows\' house, wrapped in a shawl, I found a First Reed with a tag on its cord: NAN TARROW. She took it down off the door herself. The tuning fork would not leave it alone. Bethan Marl says anyone who stays to the end can hold her note.'),
    },
    hold: {
      title: S('Hold Nan Tarrow\'s note'),
      hint: S('The family holds it until the body lets go. Hold it, and let it go slowly.'),
      slip: S('The note slips from you. It is still there, kept. You can try again.'),
      put: S('You wrap the reed again. It will wait.'),
      doneTitle: S('Her note'),
      doneBody: S('The note leaves you as slowly as it came. You do not breathe out until it has gone. Behind the wall, something that was counting draws a breath.'),
      doneBtn: S('Go to the nursery'),
      journal: S('I held Nan Tarrow\'s note in her room until it let go of my breath. In the nursery, something that counts to seven is waiting for an eighth.'),
    },
    eight: {
      title: S('The eighth count'),
      body: S('The count stopped at seven because the cart was at the door. The Hedge keeps what it is given, and it was never given the eighth. You stand where a child would stand, and you do not say it, because we do not say it now. You keep your mouth shut and you think it, as plain as a bell. <i>Eight.</i><br><br>The room lets out its breath. Somewhere in the walls a kettle comes off the boil without ever having reached it.'),
      btn: S('Eight.'),
      reward: S('Bethan presses ten sovereigns on you, and Linnet\'s counting-beads, which were on the cot. The Hedge, you feel, has noted it.'),
    },
    fork: {
      seen: S('The fork shivers against your palm and will not settle. Something in here is being kept.'),
    },
    items: {
      beads: S('Linnet\'s Counting-Beads'),
      beadsDesc: S('Eight beads on a cord, the eighth worn smooth. Counted slowly (use), they steady you against the Narrow: the Hush meter clears and your noise settles. Once a game day.'),
      beadsUsed: S('You count them, slowly, to eight. Your breath comes back into step.'),
      beadsRest: S('Not again today. The beads want a day between countings.'),
    },
    say: {
      enter: S('The door shuts behind you on its own weight. The house is exactly as quiet as the lane.'),
      kitchen: S('A kettle, somewhere, coming up to the boil.'),
      parlour: S('Your footsteps arrive a beat after you do.'),
      nan: S('Your footsteps make no sound in here. You listen for the place where they should be.'),
      work: S('The workroom smells of cut cane. For once, nothing in here is keeping anything.'),
      count: S('From the cot, very faintly: "One. Two. Three. Four. Five. Six. Seven."'),
      countEnd: S('It stops there. It always stops there.'),
      hushFull: S('The sound goes out of the room, all at once, as if a hand had been laid over it.'),
      fork: S('Gil\'s tuning fork, left on the bench with the cane.'),
      pickFork: S('You take Gil\'s fork.'),
    },
    cap: {
      kettle: S('[A kettle, almost at the boil]'),
      echo: S('[Your footsteps, a beat late]'),
      mute: S('[Your footsteps make no sound]'),
      count: S('[A child counting, one to seven]'),
      note: S('[A low note, held]'),
    },
    j: {
      offer: S('Bethan Marl, who lives beside the shut house in the north-west corner of Oakhaven, says the Tarrows\' First Reeds have stopped moving and the house keeps noises: a kettle that never boils, a child\'s counting that stops at seven. She gave me the key. Nobody is hurt. Something is being kept.'),
      done: S('The Tarrows\' house is quiet. I gave its nursery the eighth count and the Hedge took it. Bethan Marl says her own kettle boils again.'),
      closed: S('Oakhaven is gone under the oaks. The Tarrows\' house stands with its door shut and its reeds hanging still. I did not finish with it.'),
    },
    rumour: S('The lane by the north-west corner is quiet again, they say. Not Hedge-quiet; house-quiet. Bethan Marl\'s kettle boils, and she cried a little when it did.'),
    rumourNote: S('You gave the Tarrows\' nursery its eighth count'),
  };

  // ---------------------------------------------------------------- state: flags (validated on every read)
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object' && !Array.isArray(G.flags);
  const flags = () => (hasG() ? G.flags : {});
  const FLAGS = { // [lo, hi] for small integers, 'b' for true-only booleans
    p13h_q: [0, 3], p13h_ask: [0, 2], p13h_pos: [0, 7], p13h_visits: [0, 99], p13h_seen: [0, 63], p13h_bday: [0, 99999],
    p13h_open: 'b', p13h_fork: 'b', p13h_full: 'b', p13h_done: 'b', p13h_closed: 'b',
  };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    if (!r || r === 'b') return 0;
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0;
  }
  function fset(k, v) { const r = FLAGS[k]; if (!r || !hasG()) return; try { G.flags[k] = r === 'b' ? true : Math.max(r[0], Math.min(r[1], Math.floor(v))); } catch (e) { /* a save that cannot hold flags */ } }
  const fbool = (k) => flags()[k] === true;
  function sanitize() {
    if (!hasG()) return;
    for (const k of Object.keys(G.flags)) {
      if (k.indexOf('p13h_') !== 0) continue;
      const r = FLAGS[k], v = G.flags[k];
      if (!r) { delete G.flags[k]; continue; }
      if (r === 'b') { if (v !== true) delete G.flags[k]; }
      else if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete G.flags[k];
    }
  }
  const stage = () => fint('p13h_q');
  const done = () => fbool('p13h_done');
  const closed = () => fbool('p13h_closed');
  const worldGone = () => { const f = flags(); return !!(f.greening || f.escaped || f.part3); };
  const on = () => cfg.on !== false;
  const active = () => on() && !worldGone();
  const quiet = () => !active() || done() || closed();          // the house keeps nothing
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('house13: ' + k + ' failed', e); } };
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c || '', ms || 4000); } catch (e) { /* the message line is cosmetic */ } };

  // transient state: never saved
  const T = {
    clock: 0, room: -1, lastMove: -1e9, moved: [], rot: 0, count: null, lastCount: -1e9, hushT: 0, floor: 0, extMuffle: 0,
    kettleHeard: -1e9, noteCap: -1e9, holding: false, warnedFork: false, seenTx: null, echoTimers: 0, said: {},
  };

  // ---------------------------------------------------------------- the house: rooms, props, resting places
  // 20 x 14, one floor, six rooms in two rows of three; every room has two doors or more, so you can always walk out.
  const ROOMS = [
    { id: 'front', x0: 1, y0: 8, x1: 7, y1: 13 },       // 0 the front room, the street door
    { id: 'kitchen', x0: 8, y0: 8, x1: 13, y1: 13 },    // 1 the kettle
    { id: 'parlour', x0: 14, y0: 8, x1: 19, y1: 13 },   // 2 gives footsteps back a beat late
    { id: 'nan', x0: 1, y0: 1, x1: 7, y1: 7 },          // 3 takes the sound of your feet
    { id: 'nursery', x0: 8, y0: 1, x1: 13, y1: 7 },     // 4 counts to seven
    { id: 'work', x0: 14, y0: 1, x1: 19, y1: 7 },       // 5 Gil's bench and a spare fork
  ];
  const R = { FRONT: 0, KITCHEN: 1, PARLOUR: 2, NAN: 3, NURSERY: 4, WORK: 5 };
  const INNER_DOORS = [[7, 10], [13, 10], [3, 7], [10, 7], [16, 7], [7, 3], [13, 3]];
  const EXIT = [3, 13];
  // the three props that move: [A, B] resting places, A first. bit i of p13h_pos picks B.
  const PROPS = [
    { id: 'kettle', room: R.KITCHEN, at: [[10.0, 12.25], [10.9, 8.75]], sprite: 'p13h_kettle', scale: 0.36, yOff: [0, -0.2], look: 'kettle' },
    { id: 'chair', room: R.PARLOUR, at: [[16.9, 10.9], [14.9, 10.2]], sprite: 'chair', scale: 0.6, yOff: [0, 0], look: 'chair' },
    { id: 'toy', room: R.NURSERY, at: [[10.2, 2.6], [8.9, 3.9]], sprite: 'p13h_toy', scale: 0.32, yOff: [0, 0], look: 'toy' },
  ];
  const COT = [11.3, 2.0];
  const BUNDLE = [5.6, 5.6];
  const FORK_AT = [16.0, 2.9];
  const WENNA_AT = [7.7, 9.0];
  const LINTEL_AT = [6.5, 8.12];

  function roomOf(x, y) {
    for (let i = 0; i < ROOMS.length; i++) { const r = ROOMS[i]; if (x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1) return i; }
    return -1;
  }
  const inHouse = () => hasG() && G.mapId === MAPID && G.map && G.map.id === MAPID;

  function buildHouse() {
    const m = new GameMap(MAPID, TX.mapName, 20, 14, { floor: 't_wood', ceil: 't_wood', fogDist: 16, ambient: 0.3, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 3.5, y: 11.3, dir: -Math.PI / 2 } });
    m.border('t_house');
    m.rect(1, 7, 18, 7, 't_wood'); m.rect(7, 1, 7, 12, 't_wood'); m.rect(13, 1, 13, 12, 't_wood');
    for (const [x, y] of INNER_DOORS) m.set(x, y, DOOR({ label: TX.door.inner }));
    m.set(EXIT[0], EXIT[1], DOOR({ portal: { map: 'oakhaven', x: 6.5, y: 8.6, dir: Math.PI / 2 }, label: TX.door.out }));
    const look = (sprite, x, y, k, o) => m.add(Object.assign({ kind: 'deco', sprite, x, y, solid: true, radius: 0.35, use: 'p13h_look', _k: k }, o || {}));
    // front room
    look('p13h_board', 5.4, 8.25, 'board', { solid: false, scale: 0.7, radius: 0.2, label: TX.look.board });
    look('shelf', 1.4, 10.5, 'shelfFront', { radius: 0.2, scale: 0.9 });
    m.deco('lamp', 1.8, 12.2, { radius: 0.12, scale: 0.7, glow: 0.6 });
    // kitchen
    look('hearth', 10.5, 12.7, 'hearth', { radius: 0.3, scale: 0.9, glow: 0.35 });
    look('table', 9.2, 9.7, 'kitchenTable', { radius: 0.5, scale: 0.7 });
    m.deco('chair', 11.4, 9.2, { radius: 0.3, scale: 0.6 });
    m.deco('lamp', 12.4, 12.2, { radius: 0.12, scale: 0.7, glow: 0.5 });
    // parlour
    look('table', 16.6, 10.4, 'parlourTable', { radius: 0.5, scale: 0.7 });
    look('shelf', 18.6, 9.6, 'dulcimer', { radius: 0.2, scale: 0.9 });
    m.deco('lamp', 18.3, 12.3, { radius: 0.12, scale: 0.7, glow: 0.5 });
    // Nan's room
    look('bed', 2.4, 2.0, 'bed', { radius: 0.5, scale: 0.6 });
    m.deco('lamp', 5.6, 1.8, { radius: 0.12, scale: 0.7, glow: 0.35 });
    // the nursery
    look('bed', COT[0], COT[1], 'cot', { radius: 0.4, scale: 0.42 });
    m.deco('lamp', 8.8, 1.8, { radius: 0.12, scale: 0.7, glow: 0.4 });
    // Gil's workroom
    look('table', 16.6, 2.3, 'bench', { radius: 0.5, scale: 0.7 });
    look('shelf', 18.6, 4.2, 'shelfWork', { radius: 0.2, scale: 0.9 });
    m.deco('lamp', 14.8, 5.8, { radius: 0.12, scale: 0.7, glow: 0.55 });
    m.baseCount = m.entities.length;
    return m;
  }

  // ---------------------------------------------------------------- procedural stand-in art (cached once)
  function paint(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let i = 0; i < w * h; i++) { const o = i * 4; if (u8[o + 3] < 100) u8[o + 3] = 0; else u8[o + 3] = 255; }
    return new Uint32Array(id.data.buffer);
  }
  function reg(name, w, h, draw) {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, { w, h, data: paint(w, h, draw), hs: 1, cx: 0.5, dy: 0 });
  }
  function paintAll() {
    const reed = (c, x, top, len, col) => {
      c.strokeStyle = '#6a5a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top); c.lineTo(x, top + 8); c.stroke();
      c.fillStyle = col; c.fillRect(x - 2, top + 8, 4, len); c.fillStyle = '#2a2414'; c.fillRect(x - 1, top + 8 + len * 0.55, 2, 6);
      c.fillStyle = 'rgba(255,250,220,0.35)'; c.fillRect(x + 1, top + 8, 1, len);
    };
    // a lintel with First Reeds on their cords. Three and a bare nail, or four. They hang dead straight. [PROPOSED]
    for (const n of [3, 4]) {
      reg('p13h_lintel' + n, 88, 64, (c, w) => {
        c.fillStyle = '#4a3826'; c.fillRect(2, 2, w - 4, 6); c.fillStyle = '#6a5438'; c.fillRect(2, 2, w - 4, 2);
        const xs = [14, 32, 50, 68];
        for (let i = 0; i < 4; i++) {
          if (i < n) reed(c, xs[i], 8, 44 - (i === 3 ? 0 : i % 2 ? 4 : 0), i === 3 ? '#b9b080' : '#d8d2a0');
          else { c.fillStyle = '#8a8a8a'; c.fillRect(xs[i] - 1, 8, 2, 6); c.fillStyle = '#c0c0c0'; c.fillRect(xs[i] - 1, 8, 1, 6); }
        }
      });
    }
    reg('p13h_kettle', 40, 40, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(20, 36, 15, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2a2622'; c.fillRect(8, 31, 24, 3);
      const g = c.createLinearGradient(0, 17, 0, 31); g.addColorStop(0, '#6a665e'); g.addColorStop(1, '#2a2824');
      c.beginPath(); c.moveTo(9, 31); c.quadraticCurveTo(7, 19, 18, 17); c.quadraticCurveTo(30, 19, 31, 31); c.closePath(); c.fillStyle = g; c.fill();
      c.fillStyle = '#34322c'; c.beginPath(); c.ellipse(19, 17, 6, 2, 0, 0, Math.PI * 2); c.fill(); c.fillRect(17, 13, 4, 3);
      c.strokeStyle = '#2a2824'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(30, 24); c.quadraticCurveTo(38, 20, 36, 12); c.stroke();
      c.lineWidth = 1.4; c.beginPath(); c.arc(19, 17, 9, Math.PI, 0); c.stroke();
    });
    reg('p13h_toy', 36, 36, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(18, 33, 11, 2.4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a6a3a'; c.fillRect(8, 16, 18, 9); c.fillRect(22, 8, 6, 11); c.fillRect(26, 9, 5, 4);   // body, neck, head
      c.fillStyle = '#6a4e28'; c.fillRect(22, 5, 2, 4); c.fillRect(25, 6, 2, 3);                              // ears
      c.fillStyle = '#6a4e28'; for (const x of [9, 13, 20, 24]) c.fillRect(x, 24, 2.4, 8);                    // legs
      c.fillStyle = '#2a1c10'; c.fillRect(27, 10, 1.6, 1.6); c.fillStyle = '#d8d0b0'; c.fillRect(6, 15, 3, 2);
    });
    reg('p13h_bundle', 44, 44, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(22, 40, 14, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a3826'; c.fillRect(11, 27, 22, 3); c.fillRect(13, 30, 3, 10); c.fillRect(28, 30, 3, 10);        // a stool
      const g = c.createLinearGradient(0, 14, 0, 28); g.addColorStop(0, '#8a7a8e'); g.addColorStop(1, '#4e4458');
      c.beginPath(); c.moveTo(9, 27); c.quadraticCurveTo(10, 12, 22, 13); c.quadraticCurveTo(35, 12, 35, 27); c.closePath(); c.fillStyle = g; c.fill();
      c.strokeStyle = 'rgba(30,24,36,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(14, 25); c.quadraticCurveTo(22, 18, 31, 25); c.stroke();
      c.fillStyle = '#c9c394'; c.fillRect(21, 9, 2, 8);                                                                  // the tip of a reed
    });
    reg('p13h_board', 56, 72, (c) => {
      c.fillStyle = '#5a4630'; c.fillRect(6, 4, 44, 62); c.fillStyle = '#6a5438'; c.fillRect(6, 4, 44, 2);
      for (let i = 0; i < 4; i++) {
        const y = 12 + i * 13; c.fillStyle = '#2a1e12'; c.fillRect(10, y, 4 + (i === 3 ? 9 : i * 2), 3);
        c.fillStyle = 'rgba(232,226,200,0.85)'; c.fillRect(24, y - 1, 16 - (i === 2 ? 4 : 0), 2); c.fillRect(24, y + 3, 9, 1);
      }
    });
  }

  // ---------------------------------------------------------------- items
  const ITEM_DEFS = {
    p13h_beads: { name: TX.items.beads, sprite: 'loot', use: 'p13h_beads', value: 0, desc: TX.items.beadsDesc },
  };
  function installItems() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = ITEM_DEFS[k];
    try { if (typeof ICONS !== 'undefined' && ICONS.TABLE) ICONS.TABLE.p13h_beads = ['whistle', {}]; } catch (e) { /* icon fallback */ }
    try { if (typeof ITEM_WEIGHTS !== 'undefined' && ITEM_WEIGHTS.p13h_beads == null) ITEM_WEIGHTS.p13h_beads = 0.1; } catch (e) { /* weights optional */ }
  }
  function useBeads() {
    const day = hasG() ? Math.max(0, Math.min(99998, Math.floor(Number(G.day) || 0))) : 0;
    if (fint('p13h_bday') === day + 1) { say(TX.items.beadsRest, '', 3200); return false; }
    fset('p13h_bday', day + 1);
    G.stillT = 0; G.noise = Math.min(Number(G.noise) || 0, B.BEADS_NOISE);
    say(TX.items.beadsUsed, 'good', 3800);
    return true;
  }

  // ---------------------------------------------------------------- Bethan and the quest
  const NPC_DEFS = {
    p13h_wenna: { name: TX.wenna.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', greet: TX.wenna.greet, topics: TX.wenna.topics, quest: wennaQuest },
  };
  function installNpc() { if (typeof NPCS !== 'undefined') for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k]; }
  const haveFork = () => { try { return typeof SONGCRAFT !== 'undefined' && !!SONGCRAFT.hasFork && !!SONGCRAFT.hasFork(); } catch (e) { return false; } };
  function wennaQuest() {
    if (!active() || closed()) return null;
    const W = TX.wenna, s = stage();
    if (done()) return { text: W.done };
    if (s === 0) {
      return { text: fint('p13h_ask') ? W.again : W.intro, choices: [
        { t: W.yes, f: () => { accept(); return haveFork() ? W.acceptFork : W.accept; } },
        { t: W.no, f: () => { fset('p13h_ask', 1); return W.declined; } },
      ] };
    }
    if (s === 1) return { text: W.waiting };
    if (s === 2) return { text: W.found };
    return { text: W.held };
  }
  function accept() {
    if (stage() > 0) return;
    fset('p13h_q', 1); fset('p13h_open', true);
    syncAll();
    try { journal('side', TX.j.offer); } catch (e) { /* no journal yet */ }
  }
  function finishQuest() {
    if (done() || closed() || stage() < 3) return false;
    fset('p13h_done', true); fset('p13h_pos', 0);                    // settle the books first: the reward can never be paid twice
    try { G.gold(B.GOLD); } catch (e) { /* no purse */ }
    try { questXp(B.XP); } catch (e) { /* no xp */ }
    try { G.give('p13h_beads'); } catch (e) { /* no pack */ }
    try { if (typeof changeRep === 'function') changeRep('hedge', B.REP); } catch (e) { /* standing is a bonus */ }
    try { journal('side', TX.j.done); } catch (e) { /* no journal */ }
    syncAll(); applyPositions(true); stopSounds();
    say(TX.eight.reward, 'good', 6500);
    return true;
  }
  function checkClosure() {
    if (!worldGone()) return;
    if (stage() < 1 || done() || closed()) return;
    fset('p13h_closed', true);
    try { journal('side', TX.j.closed); } catch (e) { /* no journal */ }
    syncAll();
  }

  // the reed in the back room: found with the fork, read, then held
  function openBundle() {
    if (!active() || closed()) { say(TX.look.bundleHeld, '', 3500); return; }
    if (stage() >= 3 || done()) { say(TX.look.bundleHeld, '', 3500); return; }
    if (stage() < 1) { say(TX.look.bundle, '', 3500); return; }
    if (stage() === 1) { fset('p13h_q', 2); try { journal('side', TX.reed.journal); } catch (e) { /* none */ } syncAll(); }
    const R_ = TX.reed;
    showEvent(R_.title, R_.body, [
      { t: R_.hold, f: () => { setTimeout(holdNote, 0); } },
      { t: R_.leave, f: null },
    ]);
  }
  async function holdNote() {
    if (T.holding || stage() !== 2 || done() || closed()) return;
    T.holding = true;
    let res = null;
    try {
      const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
      if (!Rd) res = { score: 1 };
      else {
        const hz = NAN_HZ;
        // a Last Note: found, held, and (in the last third) let go very slowly. [PROPOSED] shape
        const curve = [[0, hz * 1.05], [1.4, hz], [4, hz * 1.006], [6.5, hz * 0.99], [B.HOLD_SECS, hz * 0.982]];
        const band = typeof Rd.bandFor === 'function' ? Rd.bandFor(0) * 1.15 : 110;
        res = await Rd.holdPitch({ curve, width: band, duration: B.HOLD_SECS, title: TX.hold.title, hint: TX.hold.hint });
      }
    } catch (e) { warnOnce('hold', e); res = null; }
    T.holding = false;
    if (!res || res.aborted) { say(TX.hold.put, '', 3000); return; }
    if (!(res.score >= B.PASS)) { say(TX.hold.slip, 'warn', 4500); return; }
    if (stage() !== 2) return;
    fset('p13h_q', 3);
    try { journal('side', TX.hold.journal); } catch (e) { /* none */ }
    syncAll();
    try { if (typeof closeModal === 'function' && G.openPanel) closeModal(); } catch (e) { /* none open */ }
    try { if (G.state !== 'play') G.state = 'play'; } catch (e) { /* ok */ }
    showEvent(TX.hold.doneTitle, TX.hold.doneBody, [{ t: TX.hold.doneBtn, f: null }]);
  }
  function openCot() {
    if (!active() || closed()) return;
    if (done()) { say(TX.look.cot, '', 3500); return; }
    if (stage() < 3) { say(stage() >= 1 ? TX.look.cotEarly : TX.look.cot, '', 5000); return; }
    showEvent(TX.eight.title, TX.eight.body, [{ t: TX.eight.btn, f: () => { finishQuest(); } }]);
  }

  // ---------------------------------------------------------------- what stands where (transient entities)
  const entsOf = (m) => (m && Array.isArray(m.entities)) ? m.entities : [];
  function find(m, key) { return entsOf(m).find((e) => e && e._p13h === key); }
  function drop(m, key) { const a = entsOf(m); for (let i = a.length - 1; i >= 0; i--) if (a[i] && a[i]._p13h === key) a.splice(i, 1); }
  function put(m, key, make) {
    let e = find(m, key);
    if (e) return e;
    e = Object.assign(make(), { transient: true, _p13h: key, _decor: true });
    e._h = true; if (e.kind === 'npc') { e.homeX = e.x; e.homeY = e.y; e.wanderT = 0; e.dir = e.facing || 0; } // no Math.random: the shared stream stays as it was
    m.entities.push(e);
    return e;
  }
  const realOak = (m) => m && m.id === 'oakhaven' && m.w === 70 && m.h === 64;
  const realHouse = (m) => m && m.id === MAPID && m.w === 20 && m.h === 14;
  function lintelLabel() { return done() ? TX.lintel.four : TX.lintel.three; }
  function ensure(m) {
    if (!m) return;
    const live = active() && !closed();
    if (realOak(m)) {
      if (live) put(m, 'wenna', () => ({ kind: 'npc', id: 'p13h_wenna', x: WENNA_AT[0], y: WENNA_AT[1], sprite: 'townswoman', scale: 1, solid: true, radius: 0.35, facing: -Math.PI / 2 }));
      else drop(m, 'wenna');
      if (live) {
        // not pickable: it hangs right in front of the door, and E at the door must reach the door (the shut-door line says what hangs there)
        const l = put(m, 'lintel', () => ({ kind: 'deco', sprite: done() ? 'p13h_lintel4' : 'p13h_lintel3', x: LINTEL_AT[0], y: LINTEL_AT[1], scale: 0.8, yOff: -0.55, solid: false, radius: 0.1, nopick: true, _k: 'lintel', label: lintelLabel() }));
        l.sprite = done() ? 'p13h_lintel4' : 'p13h_lintel3'; l.label = lintelLabel();
      } else drop(m, 'lintel');
      return;
    }
    if (realHouse(m)) {
      if (!live) { for (const k of ['kettle', 'chair', 'toy', 'bundle', 'fork', 'mark']) drop(m, k); return; }
      for (const p of PROPS) {
        const e = put(m, p.id, () => ({ kind: 'deco', sprite: p.sprite, x: p.at[0][0], y: p.at[0][1], scale: p.scale, yOff: p.yOff[0], solid: false, radius: 0.2, use: 'p13h_look', _k: p.look, label: TX.look[p.look], _room: p.room }));
        void e;
      }
      applyPositions(false);
      // the key reed: a shawl on a stool until the note is held
      const showBundle = !done();
      if (showBundle) {
        const b = put(m, 'bundle', () => ({ kind: 'deco', sprite: 'p13h_bundle', x: BUNDLE[0], y: BUNDLE[1], scale: 0.42, solid: true, radius: 0.3, use: 'p13h_look', _k: 'bundle', label: TX.look.bundle }));
        b.label = stage() >= 3 ? TX.look.bundleHeld : TX.look.bundle;
      } else drop(m, 'bundle');
      // while it is still being looked for, the fork finds it: songcraft12 reads glassGrowth as "something kept". The marker has
      // no sprite, so nothing is drawn (air11's glare only lights entities that were drawn) and nothing can be picked.
      if (!done() && stage() === 1) put(m, 'mark', () => ({ kind: 'deco', x: BUNDLE[0], y: BUNDLE[1], solid: false, radius: 0.1, nopick: true, glassGrowth: true }));
      else drop(m, 'mark');
      // Gil's spare fork, for anyone who carries none (and only until it has been taken)
      const wantFork = !fbool('p13h_fork') && !haveFork() && stage() >= 1 && !done() && typeof ITEMS !== 'undefined' && !!ITEMS.p12_fork;
      if (wantFork) put(m, 'fork', () => ({ kind: 'item', item: 'p12_fork', sprite: ITEMS.p12_fork.sprite || 'loot', x: FORK_AT[0], y: FORK_AT[1], scale: 0.35, yOff: 0, solid: false, label: TX.say.fork }));
      else drop(m, 'fork');
    }
  }
  function syncAll() {
    if (!hasG() || !G.maps) return;
    try { for (const id in G.maps) if (id === 'oakhaven' || id === MAPID) ensure(G.maps[id]); } catch (e) { warnOnce('sync', e); }
    try { syncDoor(G.maps && G.maps.oakhaven); } catch (e) { warnOnce('door', e); }
    try { syncGivers(); } catch (e) { warnOnce('givers', e); }
  }
  // the props sit at the resting place their bit says. Moves change the bit; this only places.
  function applyPositions(allRest) {
    const m = hasG() && G.maps ? G.maps[MAPID] : null; if (!m) return;
    const pos = allRest ? 0 : fint('p13h_pos');
    PROPS.forEach((p, i) => {
      const e = find(m, p.id); if (!e) return;
      const k = (pos >> i) & 1;
      e.x = p.at[k][0]; e.y = p.at[k][1]; e.yOff = p.yOff[k];
    });
  }

  // ---------------------------------------------------------------- the door in the street
  function doorCell(m) {
    if (!m || typeof m.get !== 'function' || m.id !== 'oakhaven') return null;
    const c = m.get(DOOR_AT[0], DOOR_AT[1]);
    return (c && c.door && (c._p13h || c.label === 'A shuttered house')) ? c : null;
  }
  function syncDoor(m) {
    const c = doorCell(m); if (!c) return;
    if (!c._p13h) c._p13h = { portal: c.portal, locked: c.locked, lockMsg: c.lockMsg, label: c.label };
    if (active() && !closed() && G.maps && G.maps[MAPID]) {
      c.portal = { map: MAPID, x: 3.5, y: 11.3, dir: -Math.PI / 2 }; c.locked = 'p13h_open'; c.lockMsg = TX.door.shut; c.label = TX.door.label;
    } else { c.portal = c._p13h.portal; c.locked = c._p13h.locked; c.lockMsg = c._p13h.lockMsg; c.label = c._p13h.label; }
  }
  function syncGivers() {
    const arr = (typeof LOGMAP !== 'undefined' && LOGMAP && Array.isArray(LOGMAP.QUEST_GIVERS)) ? LOGMAP.QUEST_GIVERS : null;
    if (!arr) return;
    const want = active() && !closed() && !done();
    const i = arr.indexOf('p13h_wenna');
    if (want && i < 0) arr.push('p13h_wenna'); else if (!want && i >= 0) arr.splice(i, 1);
  }

  // ---------------------------------------------------------------- props that move only out of sight
  function watched(x, y) {
    if (typeof Engine === 'undefined' || !Engine.cam) return true;
    const c = Engine.cam, dx = x - c.x, dy = y - c.y;
    if (Math.hypot(dx, dy) < B.NEAR) return true;
    let a = Math.atan2(dy, dx) - c.dir; a = Math.atan2(Math.sin(a), Math.cos(a));
    return Math.abs(a) < B.HALF_FOV + B.HIDE_MARGIN;
  }
  // may this prop change places right now? Not in the player's room, and neither its old nor its new place in view.
  function movable(i) {
    const p = PROPS[i], pos = fint('p13h_pos'), k = (pos >> i) & 1;
    if (T.room === p.room) return false;
    return !watched(p.at[k][0], p.at[k][1]) && !watched(p.at[1 - k][0], p.at[1 - k][1]);
  }
  function tryMove(force) {
    if (!inHouse() || quiet() || stage() < 1) return false;
    if (!force && T.clock - T.lastMove < B.MOVE_GAP) return false;
    const order = PROPS.map((p, i) => i).sort((a, b) => (T.moved[a] || -1e9) - (T.moved[b] || -1e9) || a - b);
    for (const i of order) {
      if (!movable(i)) continue;
      const m = G.map, e = find(m, PROPS[i].id); if (!e) continue;
      fset('p13h_pos', fint('p13h_pos') ^ (1 << i));
      applyPositions(false);
      T.moved[i] = T.clock; T.lastMove = T.clock;
      return PROPS[i].id;
    }
    return false;
  }

  // ---------------------------------------------------------------- sound: missing, late, kept
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  function capLine(text) {
    try {
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      let box = document.getElementById('ac-captions');
      if (!box) { const g = document.getElementById('game'); if (!g) return; box = document.createElement('div'); box.id = 'ac-captions'; box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', 'Sound captions'); g.appendChild(box); }
      const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
      while (box.children.length > 4) box.removeChild(box.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* captions are cosmetic */ }
  }
  function note(freq, at, dur, vol) {
    if (!audioOk()) return;
    const ctx = Audio_.ctx, t = ctx.currentTime + Math.max(0, at || 0);
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300;
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = freq; o2.frequency.value = freq * 1.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(Audio_.sfxBus);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  // Audio_.muffle is called every frame by fp-feel.js; a floor is applied by wrapping it, so the two never fight
  let _muffle = null;
  function setFloor(v) {
    v = Math.max(0, Math.min(1, v));
    if (v === T.floor) return;
    T.floor = v;
    try { if (_muffle) _muffle(Math.max(T.extMuffle, T.floor)); } catch (e) { /* audio optional */ }
  }
  const muteNow = () => inHouse() && !quiet() && T.room === R.NAN;
  const echoNow = () => inHouse() && !quiet() && T.room === R.PARLOUR;
  function stopSounds() {
    T.count = null; T.hushT = 0;
    setFloor(0);
    try { if (typeof Audio_ !== 'undefined' && Audio_.hum) { Audio_.hum(0, 0, 'p13h_kettle'); Audio_.hum(0, 0, 'p13h_note'); } } catch (e) { /* none running */ }
  }
  const scares = () => {
    try {
      if (typeof window !== 'undefined' && window.NERVES13 && typeof window.NERVES13.scaresAllowed === 'function') {
        const v = window.NERVES13.scaresAllowed();
        return (v === true || String(v).toLowerCase() === 'full') ? 'full' : 'gentle';
      }
    } catch (e) { /* default */ }
    return 'gentle';
  };
  function startCount() {
    if (T.count) return;
    T.count = { t: 0, n: 0 }; T.lastCount = T.clock;
    say(TX.say.count, '', 7000); capLine(TX.cap.count);
  }
  function tickCount(dt) {
    const c = T.count; if (!c) return;
    c.t += dt;
    while (c.n < B.COUNT_N && c.t >= c.n * B.COUNT_BEAT) {
      note(330 + (c.n % 3) * 22, 0, 0.5, 0.05); c.n++;                       // a thin sing-song, soft
    }
    if (c.n >= B.COUNT_N && c.t >= B.COUNT_N * B.COUNT_BEAT + 0.6) {
      T.count = null; say(TX.say.countEnd, '', 4500);
      if (scares() === 'full' && !fbool('p13h_full')) {                       // the one stronger moment: the room's sound drops away
        fset('p13h_full', true); T.hushT = B.HUSH_SECS; setFloor(B.HUSH_FLOOR); say(TX.say.hushFull, 'warn', 4000);
      }
    }
  }
  function tickHouse(dt) {
    const m = G.map, c = Engine.cam;
    const r = roomOf(c.x, c.y);
    if (r >= 0 && r !== T.room) onRoom(r);
    if (T.hushT > 0) { T.hushT -= dt; if (T.hushT <= 0) { T.hushT = 0; setFloor(muteNow() ? B.MUTE_FLOOR : 0); } }
    else setFloor(muteNow() ? B.MUTE_FLOOR : 0);
    if (quiet()) { stopSoundsKeepRoom(); return; }
    // the kettle: a boil that never comes, loudest near it
    const k = find(m, 'kettle');
    if (k && audioOk()) {
      const d = Math.hypot(k.x - c.x, k.y - c.y), lvl = d < B.KETTLE_RANGE ? Math.pow(1 - d / B.KETTLE_RANGE, 1.6) * 0.5 : 0;
      const ph = (T.clock % B.KETTLE_PERIOD) / B.KETTLE_PERIOD;
      try { Audio_.hum(lvl, 520 + 640 * ph * ph, 'p13h_kettle'); } catch (e) { /* none */ }
      if (lvl > 0.12 && T.clock - T.kettleHeard > 24) { T.kettleHeard = T.clock; capLine(TX.cap.kettle); }
    }
    // the held note under the nursery's counting
    const cd = Math.hypot(COT[0] - c.x, COT[1] - c.y);
    if (audioOk()) {
      const lvl = cd < B.COUNT_RANGE + 1 ? Math.pow(1 - cd / (B.COUNT_RANGE + 1), 1.2) * 0.4 : 0;
      try { Audio_.hum(lvl, NAN_HZ, 'p13h_note'); } catch (e) { /* none */ }
      if (lvl > 0.15 && T.clock - T.noteCap > 30) { T.noteCap = T.clock; capLine(TX.cap.note); }
    }
    if (T.room === R.NURSERY && cd < B.COUNT_RANGE && !T.count && T.clock - T.lastCount > B.COUNT_GAP) startCount();
    tickCount(dt);
  }
  function stopSoundsKeepRoom() {
    T.count = null;
    try { if (typeof Audio_ !== 'undefined' && Audio_.hum) { Audio_.hum(0, 0, 'p13h_kettle'); Audio_.hum(0, 0, 'p13h_note'); } } catch (e) { /* none running */ }
  }
  function onRoom(r) {
    const before = T.room; T.room = r;
    if (!quiet()) {
      const bit = 1 << r, seen = fint('p13h_seen');
      const line = r === R.KITCHEN ? TX.say.kitchen : r === R.PARLOUR ? TX.say.parlour : r === R.NAN ? TX.say.nan : r === R.WORK ? TX.say.work : null;
      if (line && !(seen & bit)) { fset('p13h_seen', seen | bit); say(line, '', 5000); }
      if (r === R.NAN) capLine(TX.cap.mute);
      if (r === R.PARLOUR) capLine(TX.cap.echo);
      if (before >= 0) tryMove(false);                     // passing into another room: whatever is behind you may change
    }
  }
  function wireAudio() {
    if (typeof Audio_ === 'undefined' || !Audio_.sfx) return;
    const sfx = Audio_.sfx;
    if (typeof sfx.step === 'function' && !sfx.step._p13h) {
      const wrapped = function () {
        const _step = wrapped._orig;                                        // the game's own step (a test may swap in a spy)
        let r;
        try {
          if (muteNow()) return undefined;                                  // the back room takes your footsteps
          r = _step.apply(this, arguments);
          if (echoNow()) {
            const args = arguments, self = this;
            setTimeout(() => { try { if (echoNow() && (audioOk() || wrapped._test)) wrapped._orig.apply(self, args); } catch (e) { /* gone */ } }, B.ECHO_MS);
          }
          return r;
        } catch (e) { warnOnce('step', e); return _step.apply(this, arguments); }
      };
      wrapped._orig = sfx.step; wrapped._p13h = true; sfx.step = wrapped;
    }
    if (typeof Audio_.muffle === 'function' && !Audio_.muffle._p13h) {
      _muffle = Audio_.muffle;
      const w = function (a) { T.extMuffle = Math.max(0, Math.min(1, +a || 0)); return _muffle.call(Audio_, Math.max(T.extMuffle, T.floor)); };
      w._p13h = true;
      try { Audio_.muffle = w; } catch (e) { _muffle = null; }
    }
  }

  // ---------------------------------------------------------------- the tuning fork finds it (songcraft12 reads glassGrowth)
  // songcraft12 would say "Light-glass, close" the first time; in this house the line is the house's own, and the real
  // first-glass line is left for later (the flag bit is given back).
  function forkSwap(fn) {
    let restore = null;
    try {
      if (inHouse() && stage() === 1 && typeof SONGCRAFT !== 'undefined' && SONGCRAFT.TX && SONGCRAFT.TX.forkSeen) {
        const fs = SONGCRAFT.TX.forkSeen, was = fs.glass, bitWas = (Number(G.flags.p12s_fseen) || 0) & 4;
        fs.glass = TX.fork.seen;
        restore = () => { fs.glass = was; if (!bitWas && typeof G.flags.p12s_fseen === 'number') G.flags.p12s_fseen &= ~4; };
      }
    } catch (e) { restore = null; }
    try { return fn(); } finally { if (restore) { try { restore(); } catch (e) { /* ok */ } } }
  }

  // ---------------------------------------------------------------- per-frame work
  function tick(dt) {
    if (!hasG() || !Engine || !Engine.cam) return;
    dt = Math.max(0, Math.min(0.25, Number(dt) || 0));
    T.clock += dt;
    if (worldGone()) checkClosure();
    if (!inHouse()) { if (T.floor || T.room >= 0) { T.room = -1; stopSounds(); } return; }
    tickHouse(dt);
  }
  function onLoad(id) {
    sanitize();
    checkClosure();
    T.room = -1; T.count = null; T.hushT = 0; T.lastCount = -1e9; T.echoTimers = 0;
    const leaving = id !== MAPID;
    if (leaving) stopSounds();
    syncAll();
    if (id === MAPID && hasG() && G.map && G.map.id === MAPID) {
      const v = fint('p13h_visits'); fset('p13h_visits', v + 1);
      const c = Engine.cam, r = roomOf(c.x, c.y);
      if (r < 0) { c.x = G.map.spawn.x; c.y = G.map.spawn.y; c.dir = G.map.spawn.dir; try { settleFeet(); } catch (e) { /* ok */ } }
      T.room = roomOf(Engine.cam.x, Engine.cam.y);
      if (!quiet()) {
        if (!T.said.enter) { T.said.enter = true; say(TX.say.enter, '', 5500); }
        tryMove(true);                                         // between visits: something has changed while nobody was here
      }
    }
  }

  // ---------------------------------------------------------------- interaction
  function look(e) {
    const k = e && e._k; if (!k) return false;
    if (k === 'bundle') { openBundle(); return true; }
    if (k === 'cot') { openCot(); return true; }
    if (k === 'lintel') { say(lintelLabel(), '', 6500); return true; }
    const text = TX.look[k]; if (!text) return false;
    say(text, '', 7000);
    return true;
  }
  function wireUse() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try { if (e && e.use === 'p13h_look' && look(e)) return; } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _item = useItem;
      useItem = function (slot) {
        const it = slot && typeof slot.id === 'string' && typeof ITEMS !== 'undefined' ? ITEMS[slot.id] : null;
        if (it && it.use === 'p13h_beads') { try { useBeads(); } catch (e) { warnOnce('beads', e); } try { renderInventory(); } catch (e) { /* closed */ } return; }
        return _item.apply(this, arguments);
      };
    }
    if (typeof pickUp === 'function') {
      const _pick = pickUp;
      pickUp = function (e) {
        try { if (e && e._p13h === 'fork' && !e.dead) { fset('p13h_fork', true); say(TX.say.pickFork, 'good', 3500); } } catch (err) { warnOnce('pick', err); }
        return _pick.apply(this, arguments);
      };
    }
  }

  // ---------------------------------------------------------------- rumour, options
  const RUMOUR_DEFS = [
    { id: 'd_p13h_done', cat: 'deed', who: 'patron', rank: 70, req: ['p13h_done'], note: TX.rumourNote, text: TX.rumour },
  ];
  function wireStory() {
    if (typeof STORYRUM === 'undefined' || !STORYRUM.RUMOURS) return;
    const ids = new Set(STORYRUM.RUMOURS.map((r) => r.id));
    for (const d of RUMOUR_DEFS) if (!ids.has(d.id)) STORYRUM.RUMOURS.push(Object.assign({}, d));
  }
  function row(grid) {
    const mk = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
    const lab = mk('span', { class: 'gfx-label' }, TX.opts.label + ' '); lab.appendChild(mk('small', { class: 'muted' }, TX.opts.hint));
    const b = mk('button', { class: 'dfbtn small', id: 'h13-house-opt', type: 'button', 'aria-pressed': String(cfg.on) }, cfg.on ? 'On' : 'Off');
    b.classList.toggle('sel', cfg.on);
    b.onclick = () => {
      cfg.on = !cfg.on; saveCfg(); b.textContent = cfg.on ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(cfg.on)); b.classList.toggle('sel', cfg.on);
      try { if (!cfg.on) stopSounds(); syncAll(); } catch (e) { /* ignore */ }
    };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { const grid = document.querySelector('#modal-panel .ctl-grid'); if (grid && !document.getElementById('h13-house-opt')) row(grid); } catch (e) { warnOnce('options', e); }
      return r;
    };
  }

  // ---------------------------------------------------------------- wiring
  function wireMaps() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { if (!maps[MAPID]) maps[MAPID] = buildHouse(); } catch (e) { warnOnce('build', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        try { sanitize(); } catch (e) { /* ignore */ }
        const r = _lm.apply(this, arguments);
        try { onLoad(id); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        const r = _rg.apply(this, arguments);            // a bad save throws here, before anything below
        try { sanitize(); T.said = {}; T.moved = []; syncAll(); applyPositions(false); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () { const r = _sg.apply(this, arguments); try { T.said = {}; T.moved = []; T.lastMove = -1e9; stopSounds(); syncAll(); } catch (e) { warnOnce('start', e); } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = forkSwap(() => _up.apply(this, arguments));
        try { if (G.state === 'play' || G.state === undefined) tick(dt); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
  }

  // ---------------------------------------------------------------- boot
  loadCfg();
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('house13: ' + name + ' wiring failed', e); } };
  try { if (typeof document !== 'undefined') paintAll(); } catch (e) { console.warn('house13: art failed', e); }
  installItems(); installNpc();
  wire('audio', wireAudio); wire('use', wireUse); wire('maps', wireMaps); wire('story', wireStory);
  if (typeof document !== 'undefined') {
    wire('options', wireOptions);
  }

  return {
    MAPID, DOOR_AT, NAN_HZ, B, TX, ROOMS, R, PROPS, INNER_DOORS, EXIT, FLAGS, T, cfg, saveCfg, loadCfg,
    get TEXTS() { return LIST.slice(); },
    stage, done, closed, active, quiet, accept, finishQuest, checkClosure, sanitize, syncAll, ensure, syncDoor, applyPositions, wennaQuest,
    roomOf, watched, movable, tryMove, tick, onLoad, buildHouse, holdNote, openBundle, openCot, look, useBeads, scares, startCount,
    muteNow, echoNow, setFloor, fint, fset, find, inHouse,
  };
})();
if (typeof window !== 'undefined') window.HOUSE13 = HOUSE13;
