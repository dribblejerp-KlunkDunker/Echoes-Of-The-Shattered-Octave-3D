// ============================================================
//  longnight17 — Phase 17 "Beyond Book One", team LONGNIGHT: "The Long Night".
//
//  AN EXTRA — AFTER BOOK ONE. A survival vigil. On the Longest Night (30 Frostmonth, a Stasisday) every Cantor in the Reach went
//  down the old stair to sing the Root its lullaby, all through, first note to last, because a god that holds a law for ten thousand
//  years forgets the tune (Ilse Brennan's letter, Vol V "The Cantors' Secret"; Book Four). The stair has been open at the top since
//  somebody found the ring under the fallen oak. Three Cantors have come down. You are the fourth. Keep the lullaby going until first
//  light of the first of Stillmonth, a Dawnday. NOTHING here shows or resolves Vaelen's rite, the Organum, or any other stair.
//  The year is deliberately not named. Every invented name, place and fact is [PROPOSED].
//
//  SHAPE
//    ln17_orchard   The Conservatory orchard at dusk (and again at first light): the fallen iron-bark oak, the lifted slab, the
//                   stairhead, a page in Ilse's hand, the tally-board of nights kept. Reached from the Extras menu.
//    ln17_gallery   The gallery above the Root-vault: the Root a hundred thousand roots twisted into one, grey with a little green in
//                   the deep, below a stone rail; six hush-lamps; the Keeper's Stone; three keepers; three dark ways in (west, east,
//                   and the south fill where the Synod's rubble is thin). The coldest place in the Reach.
//    (the stair itself is a portal: locked until first light, and a confirm card if you want to climb out early.)
//
//  THE LOOP (ten hours, "from full dark"; the tenth is the dead hour)
//    * THE LULLABY is a held-pitch mechanic that reuses Hold the Pitch (js/reedcraft.js: REEDS.centsAt/normCurve/bandFor/toHz, the
//      assist switch, the same steer keys / pointer / pad, the same drone-and-voice tone). It runs IN THE WORLD, not in a modal: E at
//      the Stone starts a verse (five notes, a turn, the five again lower, a fall: ~12.7 s) and the 3D view stays live behind a staff
//      along the bottom of it. You are rooted while you sing; Esc breaks off; a blow breaks it. The Songs (Root Note, Falling Fifth,
//      Tending, Murmur) still work mid-verse. The verse's score is the share of it held; it feeds THE TUNE.
//    * THE TUNE (0..100) is how much of the song the Root has. It drains (more each hour, more per dead lamp, more per kept keeper)
//      and a verse restores it. At 0 the Root loses its place and the night is lost.
//    * LAMPS. Six hush-lamps burn oil. A lamp in light slows and disarms the foes that walk into it and shelters the keeper beside it.
//      E at a lamp trims it (+oil, costs a flask); E at a dark one relights it. Pale moths come for the lamps and drink them. The oil
//      niche gives a flask now and then.
//    * KEEPERS. Marl, Tansy and Jory hum the ground under your lead. A Hollow that reaches a keeper outside lamp-light stands beside
//      them and, in five seconds, the keeper falls quiet: kept. A kept keeper is warm, not hurt, and can be called back (hold E beside
//      them: you find their note and give it back). Everything kept is returned at first light: a gift and a catastrophe at once.
//    * FOES. Hollows (slow, come toward a held voice, 8 hp, they sit down when stilled), cacophony hounds (fast, come for the singer),
//      pale moths (come for the lamps). ALL their attacks are telegraphed (a wind-up) and can be walked out of; lamp-light disarms them;
//      nothing attacks inside the Stone's nook while a flank lamp burns. There is NO unavoidable damage and no death: a fall (hp 0)
//      carries you to the Stone, winded (a third fall ends the night).
//    * THE HUSH keeps what is not held. Never shown. It is only reported: sounds go missing from the vault (the drip, the keepers'
//      breath, the wind in the stair, your own footsteps) and come back when the tune is held, a gift each time. Captions say so.
//    * COLD. Warmth falls away from lamp-light; when it is gone your legs are stiff (no running) and your voice comes back slower.
//      Never damage.
//    * DAWN. The tenth hour's verse sung, the stair unlocks; the keepers walk up behind you into the orchard at first light.
//
//  SCORING and the TALLY. Wins are recorded locally (localStorage, never a save): time to first light, score, keepers/lamps held.
//
//  GAMEPLAY NUMBERS (the one table, B below): see B. Every number is also printed in the report.
//  STATE: G.flags under p17n_ only (small validated integers); everything else is transient (R) and the run touches nothing of the
//  Book One save: start() snapshots the pieces it changes and end() puts them back; no entity beyond baseCount is ever saved
//  (all foes are transient). Hostile flags are dropped on load. The tally is its own localStorage key and is validated.
//  SWITCH: the lullaby respects REEDS' "Hold the Pitch assist" (wider band). NERVES13.scaresAllowed() sets how fast the lamps die and
//  how the Fall's dark comes down. Reduce motion / No flashes: no pulsing, steady glow.
//  Art: procedural stand-ins (canvas painting, cached once). Music: existing 'root' and 'wild' scenes. Security: no markup is built
//  from saves or flags; the card HTML is built from constants and sanitised numbers only.
// ============================================================
'use strict';

const LONGNIGHT17 = (function () {
  const FP = 'p17n_';
  const KEY = 'octave.longnight17.v1';
  const ORCH = 'ln17_orchard', GAL = 'ln17_gallery';
  const MAPS = [ORCH, GAL];
  const EXTRA_ID = 'longnight17';
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;
  const rngOf = typeof mulberry32 === 'function' ? mulberry32 : (a) => () => (a = (a * 16807) % 2147483647) / 2147483647;

  // ---------------------------------------------------------------- balance, one table
  const B = {
    HOURS: 10,
    HOUR_MIN: 34, HOUR_MAX: 76,                    // seconds an hour lasts at least (once its verse is sung) / at most
    TUNE0: 64, TUNE_PASS: 40,                      // the tune at the first step; the pass mark drawn on the bar
    DRAIN_BASE: 0.26, DRAIN_HOUR: 0.072,           // tune lost per second: base + per-hour step (hour 1..10)
    DRAIN_LAMP: 0.18, DRAIN_KEPT: 0.45,            // per dead lamp / per kept keeper, per second
    HUM: 0.07,                                     // tune given back per second by each held keeper
    UNSUNG: 12,                                    // tune lost when an hour runs out unsung
    VERSE: { gain: 44, curve: 1.4, again: 0.35, pass: 0.40, lead: 1.4, rate: 450, hold: 0.42, glide: 0.66, turn: 1.0, fall: 2.0 },
    BAND: 105,                                     // cents of the held band at the lowest skill (REEDS.bandFor(0) when present)
    LAMP: { life: 200, trim: 62, relight: 52, light: 3.3, mothDrain: 3.6, warm: 4.8, glowTau: 0.9, tendTime: 0.5, oilNear: 2.7 },
    OIL: { carry: 3, shelf: 5, regen: 17, start: 3 },
    COLD: { loss: 0.30, lossHour: 0.035, gain: 3.2, stiff: 22 },
    KEEP: { secs: 5.0, call: 3.0, callRange: 2.3, callVoice: 0, hum: 0.6 },
    FALL: { max: 3, tune: 9, hp: 0.5, stun: 7, rest: 3.5 },
    TELE: 7,                                       // seconds of warning before a group comes in
    CAP: 10,                                       // foes alive at once
    FOE: {
      hollow: { hp: 8, dmg: [1, 2], speed: 0.95, reach: 0.95, wind: 0.9, cool: 2.4, xp: 5, lightSlow: 0.4, voice: 3 },
      hound: { hp: 14, dmg: [2, 5], speed: 2.15, reach: 1.0, wind: 0.5, cool: 1.5, xp: 9, lightSlow: 0.35 },
      moth: { hp: 10, speed: 1.7, xp: 4 },
    },
    SCORE: { dawn: 500, verse: 40, lamp: 25, keeper: 100, fall: -75, quickFrom: 340, quickTo: 700, quickMax: 150 },
    TABLE: 8,
    SEED: 4004,
  };
  // The groups of each hour: { at: seconds into the hour, from: 'W'|'E'|'S', kinds: [h hollow, d hound, m moth] }
  const WAVES = [
    null,
    [{ at: 16, from: 'W', kinds: 'h' }],
    [{ at: 12, from: 'E', kinds: 'h' }, { at: 30, from: 'E', kinds: 'm' }],
    [{ at: 10, from: 'S', kinds: 'd' }, { at: 26, from: 'W', kinds: 'h' }],
    [{ at: 10, from: 'W', kinds: 'hh' }, { at: 28, from: 'E', kinds: 'm' }],
    [{ at: 8, from: 'S', kinds: 'd' }, { at: 22, from: 'E', kinds: 'mm' }, { at: 34, from: 'W', kinds: 'h' }],
    [{ at: 8, from: 'W', kinds: 'hh' }, { at: 20, from: 'S', kinds: 'd' }, { at: 34, from: 'E', kinds: 'm' }],
    [{ at: 8, from: 'E', kinds: 'mmm' }, { at: 24, from: 'W', kinds: 'h' }, { at: 36, from: 'S', kinds: 'd' }],
    [{ at: 8, from: 'S', kinds: 'dd' }, { at: 20, from: 'W', kinds: 'hh' }, { at: 34, from: 'E', kinds: 'm' }],
    [{ at: 8, from: 'W', kinds: 'hhh' }, { at: 22, from: 'E', kinds: 'mm' }, { at: 36, from: 'S', kinds: 'd' }],
    [{ at: 6, from: 'S', kinds: 'dd' }, { at: 18, from: 'W', kinds: 'hh' }, { at: 26, from: 'E', kinds: 'mmm' }, { at: 36, from: 'E', kinds: 'hh' }],
  ];
  // the singing stone and the world (cells / world coordinates)
  const C = { x: 17, y: 15 };                                       // the Root, the middle of the hall
  const STONE = { x: 17.0, y: 21.0 };
  const LAMPS = [[10.2, 12.5], [23.8, 12.5], [10.2, 17.5], [23.8, 17.5], [14.4, 21.7], [19.6, 21.7]];
  const KEEPER_AT = [[11.7, 11.5], [22.3, 11.5], [11.0, 18.6]];
  const OIL_AT = [24.9, 19.1];
  const BENCHES = [[8.0, 11.0], [26.0, 11.0], [7.6, 19.0], [26.4, 19.0], [12.5, 7.6], [21.5, 7.6]];   // POLISH17
  const MOUTH = { W: [2.6, 15.0], E: [31.4, 15.0], S: [17.0, 27.0] };
  const MOUTH_NAME = { W: 'west', E: 'east', S: 'south' };
  const GAL_W = 34, GAL_H = 30;

  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  const FLAGS = { nights: [0, 99], dawns: [0, 99], seen: [0, 1], up: [0, 1] };
  function fint(k) { const v = flags()[FP + k], r = FLAGS[k]; return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0; }
  function setf(k, v) { const r = FLAGS[k]; flags()[FP + k] = clamp(v | 0, r[0], r[1]); }
  function validate() {
    const f = flags();
    for (const k of Object.keys(f)) {
      if (k.indexOf(FP) !== 0) continue;
      const name = k.slice(FP.length);
      if (!has(FLAGS, name)) { delete f[k]; continue; }
      const v = f[k], r = FLAGS[name];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete f[k];
    }
  }
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion || GFX.noFlash); } catch (e) { return false; } };
  const scares = () => { try { return (typeof NERVES13 !== 'undefined' && NERVES13.scaresAllowed) ? NERVES13.scaresAllowed() : 'gentle'; } catch (e) { return 'gentle'; } };
  const inMine = (id) => MAPS.indexOf(id) >= 0;

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const F = (t, ...a) => t.replace(/\{(\d)\}/g, (m, i) => (a[+i] == null ? '' : String(a[+i])));
  const TX = {
    tag: S('An extra — after Book One'),
    title: S('The Long Night'),
    blurb: S('Down the old stair on the Longest Night. Keep the lullaby going until first light.'),
    orchardName: S('The Conservatory Orchard'),
    galleryName: S('The Gallery above the Root-vault'),
    intro: {
      title: S('The Longest Night'),
      date: S('Stasisday, the thirtieth of Frostmonth. The year is not said.'),
      body: S('Every Longest Night the Cantors of the Reach went down the old stair and sang the Root its lullaby, all through, from the first note to the last, because a god that holds a law for ten thousand years forgets the tune. Nobody has gone down in three hundred years. Somebody found the ring under the fallen oak. Three Cantors have come. You are the fourth.'),
      how: S('Sing the verse at the Keeper\'s Stone (E): steer the note with W and S. Keep the lamps burning, keep the keepers humming, and sing the Root a verse every hour until first light.'),
      go: S('Go down the old stair'),
      tally: S('The tally of nights'),
      no: S('Not yet'),
    },
    orchard: {
      arrive: S('The Conservatory orchard, at dusk. Snow on the iron-bark, and the fallen oak lying across the old wall. Under its roots a slab has been lifted, and a cold breath comes up out of the dark.'),
      arriveDawn: S('The orchard, at first light. The oak lies as it fell. The slab is grey with frost. Nothing has changed, except that it is morning.'),
      stair: S('The old stair'),
      stairShut: S('The stair is open at the top. It goes down, narrow, cut in the rock, with a rope rail of rotted hemp.'),
      slab: S('The slab, lifted and propped on a log. An iron ring is set in it. It is older than the Conservatory.'),
      page: S('A page pinned to the ring-post in a small upright hand, copied out and passed round: "Sing it all through. From the first note to the last. It forgets. Nobody has been down in three hundred years. If you go, come and tell me what it said."'),
      oak: S('An iron-bark oak that fell across the orchard wall and took a length of it. The wood is still faintly ringing.'),
      wall: S('The old wall of the Conservatory\'s orchard. Reed-frost on the coping.'),
      board: S('The tally-board of nights kept. Scratched into it, a time for every dawn that was reached.'),
      tree: S('A reed-orchard tree, hollow at the heart. Cantors hum into the hollow of the oldest one on the Longest Night. This is what is left of that.'),
    },
    gallery: {
      arrive: S('The gallery. Below the rail the Root goes down, a hundred thousand roots twisted into one like a rope, grey, with green only in the deepest places. It is the coldest place in the Reach.'),
      rail: S('A stone rail, waist-high, worn smooth by hands. Beyond it there is only the Root.'),
      root: S('The Root. It is listening.'),
      rootLow: S('The Root. It is losing its place, and going back to the start.'),
      rootDark: S('The Root. It has almost nothing of the tune left.'),
      stone: S('The Keeper\'s Stone. Five notches in it, worn by knees.'),
      stoneSing: S('The Keeper\'s Stone. E: sing the verse.'),
      stoneDone: S('The Keeper\'s Stone. The Root has had this hour\'s verse; sing again if the tune is low.'),
      stoneAfter: S('The Keeper\'s Stone. The Root is quiet.'),
      lamp: S('A hush-lamp. Its reed-whistle keeps the room from going silent.'),
      lampOut: S('A hush-lamp, dark. E: relight it (a flask of oil).'),
      lampLow: S('A hush-lamp, burning low. E: trim it (a flask of oil).'),
      lampOk: S('A hush-lamp, burning well.'),
      lampMoth: S('A hush-lamp, with a pale moth on the glass. It is drinking the light.'),
      oil: S('The oil niche. E: take a flask.'),
      oilEmpty: S('The oil niche. The flasks are filling again, slowly.'),
      rubble: S('Fallen stone and a long way back into the dark.'),
      fill: S('The Synod\'s fill, where the bore came through. It is thin here.'),
      stairFoot: S('The foot of the old stair. The way up is open only at first light.'),
      up: S('Up the old stair'),
      upShut: S('Climb out before first light? The vigil would be lost.'),
    },
    hint: {
      first: S('The first hour. Marl begins, low, and the Root turns toward him like a sleeper. Sing the verse at the Stone (E) when you are ready.'),
      hours: [S('The second hour. The lamps burn steady. Tansy\'s voice is thin, and she knows it.'),
        S('The third hour. Your breath is smoke. Below you, something that dripped all night has stopped.'),
        S('The fourth hour. The Root does not seem to mind the cold. It minds being alone.'),
        S('The fifth hour. The oil niche scrapes. The stair wind has dropped to nothing.'),
        S('The sixth hour. Half the night. The song has gone round six times, and it has not once gone round the same.'),
        S('The seventh hour. The keepers have stopped looking at one another.'),
        S('The eighth hour. Your feet are making no sound on the stone.'),
        S('The ninth hour. Jory says it is the longest he has stood at anything. He says it low.'),
        S('The dead hour, the one before dawn. Everything that is coming has come. Hold the middle of the note.')],
      tele: S('Something is coming in from the {0} way.'),
      teleH: S('A Hollow, from the {0} way. They come slowly, toward a held voice.'),
      teleD: S('Claws on stone, from the {0} way.'),
      teleM: S('Pale wings, from the {0} way, drawn to the lamps.'),
      lampLow: S('A lamp is burning low.'),
      lampOut: S('A lamp goes out.'),
      lampOn: S('The lamp takes, and steadies.'),
      lampTrim: S('You trim the wick. It steadies.'),
      noOil: S('You have no oil. The niche refills slowly, by the east lamp.'),
      oilGot: S('You take a flask of lamp-oil.'),
      oilFull: S('You are carrying all the oil you can.'),
      mothOn: S('A pale moth has settled on a lamp. The glass is dimming.'),
      mothKill: S('The moth goes still, and the lamp brightens.'),
      keptA: S('{0} has stopped humming. They sit as they were sitting, hands in their lap, quite warm.'),
      callStart: S('You find {0}\'s note under your own breath and hold it out.'),
      callDone: S('{0} breathes in, and takes up the note where it was left.'),
      callBreak: S('You lose the note. Stay beside them.'),
      shelter: S('The lamp-light turns it aside.'),
      hollowSit: S('The Hollow sits down where it stands, and is still.'),
      hollowAt: S('A Hollow is standing beside {0}.'),
      cold: S('Your legs are stiff with cold. You cannot run until you are warm.'),
      warm: S('Warmth comes back into your hands.'),
      fall: S('The dark takes your legs. When you can see again you are on the flags beside the Stone, and Tansy has your hand.'),
      fallLast: S('You cannot stand. They carry you to the stair.'),
      versePass: S('The Root has the verse.'),
      verseLost: S('The verse slips. The Root goes back to the start of it.'),
      verseStop: S('You break off. The note goes on without you for a breath, and stops.'),
      verseHurt: S('Something strikes you, and the note is gone.'),
      unsung: S('The hour passes unsung.'),
      hourNext: S('The hour turns.'),
      drip: S('You cannot hear the drip any more.'),
      dripBack: S('The drip comes back, a little too loud.'),
      breath: S('The keepers\' breathing has gone out of the room.'),
      breathBack: S('You can hear the keepers breathe again.'),
      wind: S('The wind in the stair has stopped.'),
      windBack: S('The wind in the stair comes back, thin, and cold.'),
      steps: S('Your footsteps make no sound.'),
      stepsBack: S('Your footsteps come back, a little too loud.'),
      dawnWait: S('The stair is grey at the top.'),
      noSing: S('Not now. The Root has stopped asking. Wait for first light.'),
      notReady: S('Your voice is not here. Wait a moment.'),
      singing: S('Hold the middle of the note.'),
      keeperTalkKept: S('{0} sits with their hands in their lap and their eyes open. They are warm. They are not singing. (Hold E beside them to call them back.)'),
    },
    cap: {
      drip: S('[the dripping has stopped]'), dripBack: S('[dripping returns]'),
      breath: S('[the breathing has stopped]'), breathBack: S('[breathing returns]'),
      wind: S('[the wind has stopped]'), windBack: S('[wind returns]'),
      steps: S('[footsteps make no sound]'), stepsBack: S('[footsteps return]'),
      tele: S('[something is coming]'), verse: S('[the lullaby, held]'), out: S('[a lamp goes out]'),
    },
    hud: {
      hour: S('HOUR'), dead: S('THE DEAD HOUR'), tune: S('TUNE'), lamps: S('LAMPS'), keepers: S('KEEPERS'), oil: S('OIL'), warm: S('WARM'),
      verse: S('THE LULLABY'), held: S('HELD'), kept: S('KEPT'), coming: S('COMING'),
      w: S('west'), e: S('east'), s: S('south'),
      steer: S('W / S steer · Esc breaks off'),
      listen: S('Listen for the note.'),
      hourNames: [S('FIRST'), S('SECOND'), S('THIRD'), S('FOURTH'), S('FIFTH'), S('SIXTH'), S('SEVENTH'), S('EIGHTH'), S('NINTH'), S('TENTH')],
    },
    keepers: {
      marl: {
        name: S('Marl Dunning, bass'),
        polite: S('Does it ring? Don\'t answer. There is no breath to spare. Hold the middle of the note and it will find you.'),
        normal: S('Low and slow. That is all the old ones ever asked.'),
        blunt: S('Sing, or sit down.'),
        a: S('Does it ring? Don\'t answer, there is no breath to spare. Hold the middle of the note, and it will find you. Low and slow. That is all the old ones ever asked.'),
        b: S('Tell me if the lamp at my back goes. I won\'t turn round. If I turn round I lose my place.'),
        c: S('My mother hummed it into the hollow of the oldest tree every year and never said what for. I have hummed it forty. Tonight it has somewhere to go.'),
        kept: S('Marl Dunning sits with his hands in his lap and his eyes open. He is warm. He is not singing.'),
        dawn: S('That is the whole song, then. All through.'),
        orchard: S('It is a long stair. Mind the rope rail; it is older than any of us.'),
        back: S('It takes Marl a moment to know where he is. He takes your hand, and does not let go for a while.'),
      },
      tansy: {
        name: S('Tansy Quill, apprentice'),
        polite: S('Is it always this cold? Marl says it is the coldest place in the Reach. I thought he was being a Cantor about it.'),
        normal: S('I keep losing my place on the turn.'),
        blunt: S('I am singing. Look at the lamps.'),
        a: S('Is it always this cold? Marl says it is the coldest place in the Reach. I thought he was being a Cantor about it.'),
        b: S('I keep losing my place on the turn. Just there, after the fifth. Don\'t tell Marl.'),
        c: S('If I stop, will you tell me? I don\'t think I would know.'),
        kept: S('Tansy Quill sits very straight, eyes open, her hands in her lap. She is warm. She is not singing.'),
        dawn: S('It is light. Is that — is it light?'),
        orchard: S('I have never been this far from the Conservatory in the dark.'),
        back: S('Tansy comes up the stair with her eyes wide, and says, quietly, that she can hear everything.'),
      },
      jory: {
        name: S('Jory Fenn, lamplighter'),
        polite: S('I brought the oil. Six lamps, and a flask each, he says. I said that is not much of a plan. Take it from the niche by the east lamp.'),
        normal: S('Lamps first. The moths come for the light and the dark comes for the rest.'),
        blunt: S('Mind the lamps.'),
        a: S('I brought the oil. Take a flask from the niche by the east lamp. Lamps first: the moths come for the light, and the dark comes for the rest.'),
        b: S('A lamp with a moth on it burns three times as fast. Don\'t ask me how I know. Swat it. It does not mind.'),
        c: S('I have lit lamps in the Reach for twenty years. First time one has been lit for something.'),
        kept: S('Jory Fenn stands where he was standing, a flask in his hand, quite still. He is warm. He is not humming.'),
        dawn: S('Put the lamps out. We shall not be needing them.'),
        orchard: S('Oil is in the niche. Remember: lamps first.'),
        back: S('Jory walks up the stair carrying the empty flask as if it were full, and does not say a word until noon.'),
      },
    },
    card: {
      dawnTitle: S('First light'),
      dawnBody: S('The tune has held. The stair is grey at the top, and then it is not grey. First light of the first of Stillmonth, a Dawnday. Far below, the Root has the whole song again for another year, and is asleep. Whether any other stair was kept tonight, you cannot know.'),
      dawnGo: S('Climb the old stair'),
      winTitle: S('The night is kept'),
      winBody: S('The keepers come up behind you, one by one, into the frost. The oak lies as it fell.'),
      loseTune: S('The night is not kept'),
      loseTuneBody: S('The tune slips and does not come back. Far below, the Root begins again from the first note, with nobody to hear it. You climb the old stair in the grey, and the keepers climb behind you, quiet.'),
      loseFall: S('Carried up'),
      loseFallBody: S('You are carried up the old stair before the night is out. The lamps are still burning below. The Root is still listening.'),
      leaveTitle: S('Climb out?'),
      leaveBody: S('The stair is open, but the night is not finished. If you go up now the Root will have nobody tonight.'),
      leaveYes: S('Climb out'),
      leaveNo: S('Stay'),
      stats: S('Time to first light {0} · Score {1}'),
      stats2: S('Verses held {0} · Lamps lit {1} of 6 · Keepers held {2} of 3 · Falls {3}'),
      newBest: S('A new best night.'),
      rank: S('Fastest dawn number {0} on the tally.'),
      ret: S('Return'),
      stay: S('Stay a moment'),
      tallyTitle: S('The tally of nights'),
      tallyHead: S('Time · Score · Keepers · Lamps · Falls'),
      tallyNone: S('No dawn has been reached yet. This is a local tally; it is kept only on this device.'),
      tallyNote: S('Local to this device. It does not touch any save.'),
      close: S('Close'),
    },
    opt: {
      note: S('The lullaby uses the Hold the Pitch assist (Options → Reeds).'),
    },
    enemy: {
      hollow: { name: S('A Hollow'), desc: S('One of the Unstrung, walking toward a held voice. It does not hurry, and it does not know it is walking.') },
      hound: { name: S('Cacophony Hound'), desc: S('Static with appetite. It has come for the singer.') },
      moth: { name: S('Pale Moth'), desc: S('A pale moth, drawn to the lamps. It drinks the light first.') },
    },
    result: {
      won: S('The night was kept.'), lost: S('The night was lost.'), left: S('The night was left.'),
    },
  };

  // ---------------------------------------------------------------- art (procedural stand-ins)
  const paint = (w, h, fn) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    return new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0));
  };
  const E_ = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R_ = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const L_ = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  function glowMask(name, test) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]; if (!sp || !Engine.setEmissive) return;
    const m = new Uint8Array(sp.w * sp.h); let n = 0;
    for (let i = 0; i < m.length; i++) { const p = sp.data[i], a = p >>> 24; if (a < 120) continue; if (test(p & 255, (p >>> 8) & 255, (p >>> 16) & 255)) { m[i] = 1; n++; } }
    if (n) Engine.setEmissive(name, m);
  }
  function tintSprite(src, dst, k) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[src]; if (!sp || Engine.sprites[dst]) return;
    const d = new Uint32Array(sp.data.length);
    for (let i = 0; i < d.length; i++) {
      const p = sp.data[i], a = p >>> 24;
      if (!a) { d[i] = p; continue; }
      const r = Math.min(255, (p & 255) * k[0]), g = Math.min(255, ((p >>> 8) & 255) * k[1]), b = Math.min(255, ((p >>> 16) & 255) * k[2]);
      d[i] = ((a << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
    }
    Engine.addSprite(dst, Object.assign({}, sp, { data: d }));
  }
  // The Hollow as a FOE needs the five poses every enemy species has (walk and attack frames: js/anim.js, js/directions.js).
  // The Book One 'hollow' is an NPC drawing with none, and must stay untouched, so the foe walks on its own copies:
  // ln17_hollow (idle) plus _w1/_w2 (a sway and a dragged step) and _a1/_a2 (the lean in, the reach), cut from that drawing.
  const HOLLOW_POSES = { '': [0, 0, 0], _w1: [-1, -2, 0], _w2: [1, 1, 0], _a1: [0, -1, -3], _a2: [2, 1, 4] };   // [dx, dy, lean]
  function ensureHollowFrames() {
    if (typeof Engine === 'undefined' || !Engine.sprites || !Engine.addSprite) return false;
    if (Engine.sprites.ln17_hollow_a2) return true;
    const sp = Engine.sprites.hollow; if (!sp || !sp.data) return false;
    const w = sp.w, h = sp.h;
    for (const pose in HOLLOW_POSES) {
      const [dx, dy, lean] = HOLLOW_POSES[pose], d = new Uint32Array(w * h);
      for (let y = 0; y < h; y++) {
        const sh = dx + Math.round(lean * (1 - y / h));   // lean: the head moves, the feet stay
        for (let x = 0; x < w; x++) {
          const sx = x - sh, sy = y - dy;
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) d[y * w + x] = sp.data[sy * w + sx];
        }
      }
      if (pose && !d.some((p, i) => p !== sp.data[i])) d[(h >> 1) * w + (w >> 1)] ^= 0x00010101;   // never identical to idle
      Engine.addSprite('ln17_hollow' + pose, Object.assign({}, sp, { data: d }));
    }
    if (typeof ANIM_FRAMES !== 'undefined') delete ANIM_FRAMES.ln17_hollow;
    return !!Engine.sprites.ln17_hollow_a2;
  }
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || !Engine.textures.t_flag) return;
    const make = (name, fn) => {
      if (Engine.textures[name]) return;
      const d = new Uint32Array(64 * 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const o = fn(x, y); d[y * 64 + x] = (255 << 24) | ((clamp(o[2], 0, 255) | 0) << 16) | ((clamp(o[1], 0, 255) | 0) << 8) | (clamp(o[0], 0, 255) | 0); }
      Engine.addTexture(name, d);
    };
    const TAU = Math.PI * 2;
    // the dark below the rail: near-black with threads of root running through it (periodic, so it tiles)
    make('ln17_depth', (x, y) => {
      const a = Math.sin((x / 64) * TAU * 3 + Math.sin((y / 64) * TAU * 2) * 1.6), b = Math.sin((y / 64) * TAU * 4 + Math.cos((x / 64) * TAU * 3) * 1.4);
      const v = Math.pow(Math.max(0, a * b), 3);
      return [7 + v * 18, 10 + v * 40, 8 + v * 16];
    });
    // snow on a frozen orchard floor: cold white with a blue shadow and a fine grain (periodic)
    make('ln17_snow', (x, y) => {
      const n = Math.sin(x * 2.3 + Math.sin(y * 0.7) * 2) * Math.sin(y * 1.9 + Math.sin(x * 0.5) * 2) * 0.5 + 0.5;
      const g = ((x * 7 + y * 13 + (x * y) % 11) % 5) / 5;
      const k = 0.88 + n * 0.08 + g * 0.04;
      return [206 * k, 216 * k, 232 * k];
    });
    // ---- the gallery's stone (POLISH17). Flat-shaded pixel shapes rather than per-texel noise, because the rail is seen from
    // half a pace and a wall from a pace or two: magnified, these stay crisp blocks and carved lines instead of a smear.
    // On this relief map a face's texture is anchored at its top, so the rail (0.46 high) shows the top 29 rows only.
    const mark = (x, y, gx, gy, kind) => {                                    // an incised keepers' mark: true where the cut is
      const u = x - gx, v = y - gy;
      if (kind === 0) return (u >= 0 && u < 11 && v >= 0 && v < 9) && ((u % 3 === 0 && u < 10) || (v === 4 && u < 11));   // a tally: four strokes and the fifth across
      if (kind === 1) return (Math.abs(u - 1) <= 1 && Math.abs(v - 1) <= 1) || (Math.abs(u - 9) <= 1 && Math.abs(v - 6) <= 1) || (u > 1 && u < 9 && Math.abs(v - (1 + (u - 1) * 5 / 8)) < 0.7);   // two notes, a falling fifth
      return (u >= 0 && u < 9 && (v === 0 || v === 8) && u % 2 === 0) || ((u === 0 || u === 8) && v >= 0 && v <= 8);          // a keeper's square
    };
    const stone = (x, y, row, seed, base) => {
      const off = (row % 2) * 16, bx = (x + off) % 32, id = hsh(row, ((x + off) / 32) | 0, seed);
      let k = 0.82 + 0.26 * id;
      if (((x * 7 + y * 13 + row * 5) % 23) === 0) k *= 0.88;                // a few chisel pocks, not noise
      return { k, joint: bx === 0 };
    };
    make('ln17_wall', (x, y) => {
      const row = (y / 21.34) | 0, by = y - ((row * 21.34) | 0), st = stone(x, y, row, 301);
      let k = st.k; if (st.joint || by === 0) k = 0.42; else if (by === 1) k *= 1.14; else if (by > 18) k *= 0.82;
      return [58 * k, 54 * k, 47 * k];
    });
    make('ln17_wall2', (x, y) => {
      const row = (y / 21.34) | 0, by = y - ((row * 21.34) | 0), st = stone(x, y, row, 311);
      let k = st.k; if (st.joint || by === 0) k = 0.42; else if (by === 1) k *= 1.14; else if (by > 18) k *= 0.82;
      let c = [58 * k, 54 * k, 47 * k];
      if (row === 1 && (mark(x, y, 6, 27, 0) || mark(x, y, 38, 26, 1))) c = [26, 24, 21];
      else if (row === 1 && (mark(x, y - 1, 6, 27, 0) || mark(x, y - 1, 38, 26, 1))) c = [86, 80, 70];   // the lit lower lip of the cut
      return c;
    });
    // the rail round the pit: a pale worn coping, a frieze of keepers' marks under it, a dark foot
    make('ln17_rail', (x, y) => {
      if (y < 6) { const k = y === 0 ? 1.18 : y === 5 ? 0.78 : 1 - 0.03 * y + 0.06 * hsh(x >> 3, 0, 321); return [118 * k, 110 * k, 96 * k]; }
      if (y < 8) return [34, 31, 27];
      if (y >= 26) return [30, 28, 25];
      const bx = x % 32, k = 0.86 + 0.18 * hsh((x / 32) | 0, 1, 322);
      if (bx === 0) return [36, 33, 29];
      const kind = ((x / 32) | 0) % 3;
      if (mark(bx, y, 11, 12, kind)) return [30, 27, 23];
      if (mark(bx, y - 1, 11, 12, kind)) return [104, 96, 84];
      return [72 * k, 67 * k, 58 * k];
    });
    make('ln17_coping', (x, y) => { const k = 0.9 + 0.14 * hsh(x >> 4, y >> 4, 331) + ((x + y) % 29 === 0 ? -0.12 : 0); return [112 * k, 104 * k, 92 * k]; });
    // the mouth of the stair: dark, with the edges of steps going down into it
    make('ln17_stairhole', (x, y) => {
      const d = Math.abs(x - 32) / 32, step = (y % 11) / 11;
      const dark = clamp(0.1 + d * 0.5 + (1 - y / 64) * 0.2, 0, 1);
      const edge = step < 0.14 ? 0.5 : 0;
      return [(20 + 46 * dark + 42 * edge), (22 + 44 * dark + 40 * edge), (26 + 40 * dark + 38 * edge)];
    });
  }
  // the Root: a rope of roots rising out of the dark; three states (alive, dim, grey). Veins are the emissive part.
  function paintRoot(x, w, h, state) {
    const rg = rngOf(171);
    const vein = state === 0 ? '#b6e870' : state === 1 ? '#7aa04c' : '#6c726a';
    const bark = state === 0 ? ['#4a3a22', '#2a2014'] : state === 1 ? ['#44382a', '#241c14'] : ['#403c36', '#22201c'];
    E_(x, w / 2, h - 6, 40, 6, 'rgba(0,0,0,0.45)');
    const strands = 9;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < strands; i++) {
        const ph = i * 0.83 + 0.6, amp = 13 + (i % 3) * 5, off = (i - (strands - 1) / 2) * 3.4;
        x.beginPath();
        for (let yy = h - 8; yy >= 2; yy -= 3) {
          const t = (h - 8 - yy) / (h - 10), taper = 1 - 0.22 * t;
          const xx = w / 2 + off * (1 - 0.55 * t) + Math.sin(yy * 0.052 + ph) * amp * taper + Math.sin(yy * 0.13 + ph * 2) * 2.2;
          if (yy === h - 8) x.moveTo(xx, yy); else x.lineTo(xx, yy);
        }
        const wd = 8.5 - (i % 3) * 1.2;
        if (pass === 0) { x.strokeStyle = '#120d08'; x.lineWidth = wd + 2.4; }
        else if (pass === 1) { x.strokeStyle = VG(x, 0, h, bark[0], bark[1]); x.lineWidth = wd; }
        else { x.strokeStyle = i % 2 ? 'rgba(0,0,0,0)' : vein; x.lineWidth = state === 0 ? 1.7 : 1.1; }
        x.lineCap = 'round'; x.stroke();
      }
    }
    // the flare at its foot, where the roots spread out into the dark
    for (let i = 0; i < 9; i++) {
      const s = (i / 8 - 0.5) * 2, bx = w / 2 + s * 14;
      x.beginPath(); x.moveTo(bx, h - 24); x.quadraticCurveTo(bx + s * 18, h - 14, w / 2 + s * 42, h - 6);
      x.strokeStyle = '#17110a'; x.lineWidth = 6 - Math.abs(s) * 2; x.lineCap = 'round'; x.stroke();
      x.strokeStyle = bark[0]; x.lineWidth = 3.6 - Math.abs(s) * 1.4; x.stroke();
    }
    if (state === 0) for (let i = 0; i < 18; i++) E_(x, w / 2 + (rg() - 0.5) * 34, 10 + rg() * (h - 30), 1.3, 1.3, 'rgba(210,255,150,0.8)');
  }
  function paintProps() {
    addSprite('ln17_root', 96, 176, (x, w, h) => paintRoot(x, w, h, 0), { hs: 1, cx: 0.5, dy: 0 });
    addSprite('ln17_root_dim', 96, 176, (x, w, h) => paintRoot(x, w, h, 1), { hs: 1, cx: 0.5, dy: 0 });
    addSprite('ln17_root_grey', 96, 176, (x, w, h) => paintRoot(x, w, h, 2), { hs: 1, cx: 0.5, dy: 0 });
    glowMask('ln17_root', (r, g, b) => g > 200 && g > r + 20 && g > b + 40);
    glowMask('ln17_root_dim', (r, g, b) => g > 140 && g > r + 10 && g > b + 40);
    // the Keeper's Stone: a low flat stone, worn at five places where knees have rested (POLISH17: larger, its face carved
    // with the five notes of the lullaby falling a fifth, its top pale with use, so it reads across the dark)
    addSprite('ln17_stone', 80, 48, (x) => {
      E_(x, 40, 43, 36, 5, 'rgba(0,0,0,0.45)');
      R_(x, 6, 16, 68, 26, '#4e4a42'); R_(x, 6, 16, 68, 3, '#8a8474'); R_(x, 6, 38, 68, 4, '#2c2a26'); R_(x, 6, 16, 2, 26, '#625e54'); R_(x, 72, 16, 2, 26, '#36332e');
      R_(x, 8, 10, 64, 6, '#9a9482'); R_(x, 8, 10, 64, 1, '#b4ae9a');                                           // the top, worn pale
      for (let i = 0; i < 5; i++) { R_(x, 13 + i * 12, 11, 7, 3, '#5a564c'); R_(x, 14 + i * 12, 12, 5, 1, '#3e3b34'); }   // five places worn by knees
      const notes = [[18, 21], [28, 23], [38, 25], [48, 30], [58, 33]];                                          // the lullaby, falling a fifth
      for (const [nx, ny] of notes) { R_(x, nx - 2, ny, 5, 4, '#26241f'); R_(x, nx - 2, ny + 4, 5, 1, '#7a7466'); R_(x, nx + 2, ny - 5, 1, 6, '#26241f'); }
      L_(x, 12, 36, 68, 36, 'rgba(20,18,15,0.6)', 1);
    });
    // a keepers' bench: a plank on two stone blocks, worn
    addSprite('ln17_bench', 64, 32, (x) => {
      E_(x, 32, 29, 28, 3, 'rgba(0,0,0,0.4)');
      R_(x, 8, 16, 10, 13, '#4a463e'); R_(x, 46, 16, 10, 13, '#4a463e'); R_(x, 8, 16, 10, 2, '#6a655a'); R_(x, 46, 16, 10, 2, '#6a655a');
      R_(x, 2, 10, 60, 6, '#6a5236'); R_(x, 2, 10, 60, 2, '#8a6c48'); R_(x, 2, 15, 60, 1, '#3a2a1a');
    });
    // the oil niche: a rack of brass flasks in a stone frame
    addSprite('ln17_oil', 48, 56, (x) => {
      E_(x, 24, 52, 18, 3, 'rgba(0,0,0,0.35)');
      R_(x, 6, 8, 36, 42, '#2c2822'); R_(x, 9, 11, 30, 36, '#14110d');
      R_(x, 9, 28, 30, 3, '#5a4a30');
      for (let i = 0; i < 4; i++) { const fx = 12 + i * 7.5; for (const fy of [14, 31]) { R_(x, fx, fy + 4, 5, 10, '#b88a3a'); R_(x, fx + 1, fy + 5, 1.6, 8, '#e8c470'); R_(x, fx + 1.2, fy, 2.6, 5, '#8a6a2a'); } }
      R_(x, 4, 6, 40, 3, '#4a463c');
    }, { hs: 1, cx: 0.5, dy: 0 });
    // fallen stone at the mouth of a dark way
    addSprite('ln17_rubble', 72, 44, (x) => {
      const r = rngOf(7);
      E_(x, 36, 40, 34, 4, 'rgba(0,0,0,0.4)');
      for (let i = 0; i < 16; i++) { const px = 8 + r() * 56, py = 18 + r() * 20, s = 5 + r() * 9; E_(x, px, py, s, s * 0.6, VG(x, py - s, py + s, '#5a564c', '#2a2824'), r()); }
    });
    // the tally-board: planks on a post, scratched with tallies
    addSprite('ln17_board', 48, 64, (x) => {
      E_(x, 24, 60, 16, 3, 'rgba(0,0,0,0.35)');
      R_(x, 21, 30, 6, 30, '#3a2c1c'); R_(x, 4, 6, 40, 30, '#5a4630'); R_(x, 6, 8, 36, 26, '#6a5238');
      for (let i = 0; i < 8; i++) L_(x, 8 + i * 4.4, 10 + (i % 3), 8 + i * 4.4, 31 - (i % 2) * 2, 'rgba(24,16,8,0.7)', 0.9);
      L_(x, 7, 20, 42, 24, 'rgba(24,16,8,0.6)', 0.9);
    });
    // the lifted slab: a grey stone leaning on a log, an iron ring in it
    addSprite('ln17_slab', 56, 64, (x) => {
      E_(x, 28, 60, 22, 3, 'rgba(0,0,0,0.4)');
      x.beginPath(); x.moveTo(6, 58); x.lineTo(14, 8); x.lineTo(48, 12); x.lineTo(52, 58); x.closePath(); x.fillStyle = VG(x, 8, 58, '#8a8678', '#4a463c'); x.fill();
      L_(x, 14, 8, 6, 58, 'rgba(255,255,255,0.18)', 1.4); L_(x, 48, 12, 52, 58, 'rgba(0,0,0,0.4)', 1.4);
      x.beginPath(); x.arc(30, 30, 7, 0, Math.PI * 2); x.strokeStyle = '#2a2622'; x.lineWidth = 2.6; x.stroke();
      R_(x, 4, 52, 48, 6, '#3a2c1c');
    });
    addSprite('ln17_frost', 40, 20, (x) => { for (let i = 0; i < 14; i++) E_(x, 4 + (i * 11) % 34, 6 + (i * 7) % 11, 3.6, 1.6, 'rgba(236,244,255,0.55)'); });
  }
  const COATS = [['hob', 'ln17_marl', [0.82, 0.9, 1.05]], ['townswoman', 'ln17_tansy', [0.8, 0.95, 1.12]], ['townsman', 'ln17_jory', [1.0, 0.85, 0.72]]];
  function ensureCoats() {
    if (typeof Engine === 'undefined' || !Engine.sprites) return false;
    let all = true;
    for (const [src, dst, k] of COATS) { if (!Engine.sprites[dst]) tintSprite(src, dst, k); if (!Engine.sprites[dst]) all = false; }
    if (!ensureHollowFrames()) all = false;
    return all;
  }

  // ---------------------------------------------------------------- the catalogue: foes, people
  const ENEMY_DEFS = {
    p17n_hollow: { name: TX.enemy.hollow.name, sprite: 'ln17_hollow', hp: B.FOE.hollow.hp, dmg: B.FOE.hollow.dmg.slice(), speed: B.FOE.hollow.speed, reach: B.FOE.hollow.reach, scale: 1, xp: B.FOE.hollow.xp, p17n: 'hollow', desc: TX.enemy.hollow.desc },
    p17n_hound: { name: TX.enemy.hound.name, sprite: 'hound', hp: B.FOE.hound.hp, dmg: B.FOE.hound.dmg.slice(), speed: B.FOE.hound.speed, reach: B.FOE.hound.reach, cacophony: true, noiseLure: true, scale: 0.8, xp: B.FOE.hound.xp, p17n: 'hound', desc: TX.enemy.hound.desc },
    p17n_moth: { name: TX.enemy.moth.name, sprite: 'hushmoth', hp: B.FOE.moth.hp, dmg: [0, 0], speed: B.FOE.moth.speed, reach: 0.6, hushkin: true, moth: true, scale: 0.8, yOff: -0.15, xp: B.FOE.moth.xp, p17n: 'moth', desc: TX.enemy.moth.desc },
  };
  const VOICE_DEFS = { p17n_hollow: { style: 'breathy', f0: 138, fs: 1.0 }, p17n_hound: { style: 'beast', f0: 150, fs: 0.9 }, p17n_moth: { style: 'silent' } };
  const KEEPERS = [
    { id: 'p17n_marl', key: 'marl', first: 'Marl', sprite: 'ln17_marl', portrait: 'townsman' },
    { id: 'p17n_tansy', key: 'tansy', first: 'Tansy', sprite: 'ln17_tansy', portrait: 'townswoman' },
    { id: 'p17n_jory', key: 'jory', first: 'Jory', sprite: 'ln17_jory', portrait: 'townsman' },
  ];
  const keeperText = (K, which) => TX.keepers[K.key][which];
  function installCatalog() {
    if (typeof ENEMIES !== 'undefined') for (const k in ENEMY_DEFS) if (!ENEMIES[k]) ENEMIES[k] = Object.assign({}, ENEMY_DEFS[k]);
    if (typeof VOICES !== 'undefined' && VOICES.ENEMY_VOICES) for (const k in VOICE_DEFS) if (!VOICES.ENEMY_VOICES[k]) VOICES.ENEMY_VOICES[k] = Object.assign({}, VOICE_DEFS[k]);
    if (typeof NPCS !== 'undefined') {
      KEEPERS.forEach((K, i) => {
        if (NPCS[K.id]) return;
        NPCS[K.id] = {
          name: keeperText(K, 'name'), sprite: K.sprite, portrait: K.portrait, tier: 'low',
          greet: { polite: keeperText(K, 'polite'), normal: keeperText(K, 'normal'), blunt: keeperText(K, 'blunt') }, topics: {},
          quest: () => keeperQuest(i),
        };
      });
    }
    if (typeof ANIM !== 'undefined' && ANIM.flutter && ANIM.flutter.add) { /* moths use the existing hushmoth flutter */ }
  }

  // ---------------------------------------------------------------- the run (transient; never saved)
  let R = null;
  function freshRun(opts) {
    opts = opts || {};
    return {
      active: false, over: false, phase: 'idle', result: null, opts,
      seed: opts.seed == null ? B.SEED : opts.seed, rng: rngOf(opts.seed == null ? B.SEED : opts.seed),
      t: 0, hour: 1, hourT: 0, hourSung: false, hourMin: opts.hourMin || B.HOUR_MIN, hourMax: opts.hourMax || B.HOUR_MAX, hourStarted: false,
      tune: B.TUNE0, warm: 100, oil: B.OIL.start, shelf: B.OIL.shelf, shelfT: 0, cold: false,
      lamps: LAMPS.map((p, i) => ({ i, x: p[0], y: p[1], oil: 100, glow: 0.9, lit: true, moth: null, low: false, e: null })),
      keepers: KEEPERS.map((K, i) => ({ i, K, state: 'held', e: null, hollowT: 0, callT: 0, home: KEEPER_AT[i] })),
      falls: 0, verses: 0, versePts: 0, scores: [], mothKills: 0, hollowStilled: 0, houndKills: 0,
      sung: false, sing: null, callIdx: -1, rest: 0, restFade: 0,
      queue: [], tele: null, told: {}, missing: { drip: false, breath: false, wind: false, steps: false }, lastTold: -1e9,
      rank: -1, newBest: false, dawnT: 0, bell: 0, spawned: 0, cap: [],
    };
  }
  R = freshRun();

  // ---------------------------------------------------------------- the tally (localStorage; validated)
  const tally = { best: [], nights: 0, dawns: 0 };
  const cleanNum = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : lo; };
  function loadTally() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object' && Array.isArray(o.best)) {
        tally.best = o.best.filter((r) => r && typeof r === 'object').slice(0, B.TABLE).map((r) => ({ t: cleanNum(r.t, 1, 99999), s: cleanNum(r.s, 0, 99999), k: cleanNum(r.k, 0, 3), l: cleanNum(r.l, 0, 6), f: cleanNum(r.f, 0, 3) }));
        tally.nights = cleanNum(o.nights, 0, 99999); tally.dawns = cleanNum(o.dawns, 0, 99999);
        sortTally();
      }
    } catch (e) { /* storage blocked or hostile: an empty tally */ }
  }
  function saveTally() { try { localStorage.setItem(KEY, JSON.stringify({ best: tally.best, nights: tally.nights, dawns: tally.dawns })); } catch (e) { /* ignore */ } }
  function sortTally() { tally.best.sort((a, b) => a.t - b.t || b.s - a.s); tally.best.length = Math.min(tally.best.length, B.TABLE); }
  function recordWin(entry) {
    tally.best.push(entry); sortTally();
    const i = tally.best.findIndex((r) => r === entry);
    tally.dawns++; saveTally();
    return i;   // -1 when it did not make the table
  }
  function resetTally() { tally.best.length = 0; tally.nights = 0; tally.dawns = 0; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function score(r) {
    const S_ = B.SCORE, lampsLit = r.lamps.filter((l) => l.lit).length, held = r.keepers.filter((k) => k.state !== 'kept').length;
    const q = clamp((S_.quickTo - r.t) / (S_.quickTo - S_.quickFrom), 0, 1);
    return Math.max(0, Math.round(S_.dawn + r.versePts * S_.verse + lampsLit * S_.lamp + held * S_.keeper + r.falls * S_.fall + q * S_.quickMax));
  }

  // ---------------------------------------------------------------- the maps
  const hsh = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const walkable = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !m.isSolidCell(x, y) && !(m.floorCells && m.floorCells[y * m.w + x] === 2);

  function buildGallery() {
    const m = new GameMap(GAL, TX.galleryName, GAL_W, GAL_H, { floor: 't_flag', floorTextures: ['t_flag', 't_cobble', 'ln17_depth'], ceil: 'c_rock', fogDist: 15, ambient: 0.13, fogColor: [6, 10, 8], music: 'root', danger: 0, spawn: { x: 17.5, y: 6.6, dir: Math.PI / 2 } });
    m.ceilZ = 2.6;
    for (let y = 0; y < GAL_H; y++) for (let x = 0; x < GAL_W; x++) m.set(x, y, WALL(hsh(x, y, 3) < 0.3 ? 'ln17_wall2' : 'ln17_wall'));   // POLISH17: dressed stone, the keepers' marks cut in it
    // the hall: an ellipse around the Root
    for (let y = 0; y < GAL_H; y++) for (let x = 0; x < GAL_W; x++) {
      const ex = (x + 0.5 - C.x) / 12.6, ey = (y + 0.5 - C.y) / 10.6;
      if (ex * ex + ey * ey <= 1) { m.set(x, y, null); m.setFloor(x, y, hsh(x, y, 5) < 0.3 ? 1 : 0); }
    }
    // the stair up (north), and the three dark ways in
    for (let y = 1; y <= 5; y++) for (let x = 16; x <= 18; x++) { m.set(x, y, null); m.setFloor(x, y, 1); }
    for (let x = 1; x <= 5; x++) for (let y = 14; y <= 16; y++) { m.set(x, y, null); m.setFloor(x, y, 1); }
    for (let x = 28; x <= 32; x++) for (let y = 14; y <= 16; y++) { m.set(x, y, null); m.setFloor(x, y, 1); }
    for (let y = 24; y <= 28; y++) for (let x = 16; x <= 18; x++) { m.set(x, y, null); m.setFloor(x, y, 1); }
    // the pit and the rail around it
    for (let y = 0; y < GAL_H; y++) for (let x = 0; x < GAL_W; x++) {
      const d = hyp(x + 0.5 - C.x, y + 0.5 - C.y);
      if (d < 3.3) { m.set(x, y, null); m.setFloor(x, y, 2); }
      else if (d < 4.4 && walkable(m, x, y)) m.block(x, y, 'ln17_rail', 0.46, { capTex: 'ln17_coping' });
    }
    m.set(17, 0, DOOR({ tex: 'ln17_stairhole', portal: { map: ORCH, x: 14.5, y: 8.4, dir: Math.PI / 2, ln17up: true }, label: TX.gallery.up }));
    // ---- props
    LAMPS.forEach((p, i) => m.deco('lamp', p[0], p[1], { solid: true, radius: 0.22, scale: 1.0, glow: 0.9, label: TX.gallery.lamp, use: 'p17n_lamp', _lampIdx: i }));
    m.deco('ln17_root', C.x, C.y + 0.2, { solid: false, radius: 0.1, scale: 3.3, glow: 0.5, lightCol: [30, 60, 20], label: TX.gallery.root, use: 'p17n_root', yOff: 0 });
    m.deco('ln17_stone', STONE.x, STONE.y, { solid: false, radius: 0.5, scale: 1.05, glow: 0.32, label: TX.gallery.stoneSing, use: 'p17n_stone' });
    // POLISH17: the keepers' benches round the outer wall, facing the Root (not solid: nothing in the hall's ways changes)
    for (const [x, y] of BENCHES) m.deco('ln17_bench', x, y, { solid: false, radius: 0.3, scale: 0.62, nopick: true });
    m.deco('ln17_oil', OIL_AT[0], OIL_AT[1], { solid: true, radius: 0.35, scale: 0.8, label: TX.gallery.oil, use: 'p17n_oil' });
    m.deco('ln17_rubble', 3.6, 15.0, { solid: false, scale: 1.0, label: TX.gallery.rubble });
    m.deco('ln17_rubble', 30.4, 15.0, { solid: false, scale: 1.0, label: TX.gallery.rubble });
    m.deco('ln17_rubble', 17.0, 25.2, { solid: false, scale: 1.0, label: TX.gallery.fill });
    for (const [x, y] of [[8.2, 9.0], [25.8, 9.0], [7.6, 20.4], [26.6, 21.0], [12.0, 24.0], [22.4, 24.2]]) m.deco('ln17_rubble', x, y, { solid: false, scale: 0.6 });
    // the three keepers (the base entities; their state is in the run)
    KEEPERS.forEach((K, i) => m.add({ kind: 'npc', id: K.id, x: KEEPER_AT[i][0], y: KEEPER_AT[i][1], sprite: K.sprite, scale: 0.92, yOff: -0.06, solid: true, radius: 0.32, facing: Math.atan2(C.y - KEEPER_AT[i][1], C.x - KEEPER_AT[i][0]), _keeper: i }));
    m.baseCount = m.entities.length;
    return m;
  }
  function buildOrchard() {
    const W = 30, H = 20;
    const m = new GameMap(ORCH, TX.orchardName, W, H, { outdoor: true, floor: 'ln17_snow', floorTextures: ['ln17_snow', 't_cobble'], fogDist: 17, fogColor: [150, 160, 176], music: 'wild', danger: 0, spawn: { x: 14.5, y: 14.5, dir: -Math.PI / 2 } });
    m.border('t_hedge');
    m.rect(1, 1, W - 2, 2, 't_hedge');
    // the Conservatory's orchard wall down the west side, broken where the oak fell
    for (let y = 3; y < H - 1; y++) { if (y >= 8 && y <= 11) continue; m.block(1, y, 't_stone', 0.9); m.block(2, y, 't_stone', 0.9); }
    for (let y = 3; y < H - 1; y++) for (let x = 3; x < W - 1; x++) m.setFloor(x, y, 0);
    for (let x = 13; x <= 15; x++) for (let y = 7; y <= 17; y++) m.setFloor(x, y, 1);   // the trodden way to the stairhead
    // the stairhead: a low kerb round the opening, the door set into its north side; approach it from the south
    for (const [x, y] of [[13, 5], [14, 5], [15, 5], [13, 6], [15, 6]]) m.block(x, y, 't_stone', 0.6);
    m.set(14, 6, DOOR({ tex: 'ln17_stairhole', portal: { map: GAL, x: 17.5, y: 6.6, dir: Math.PI / 2 }, label: TX.orchard.stair }));
    // props
    m.deco('ln17_slab', 16.6, 6.4, { solid: true, radius: 0.5, scale: 0.95, label: TX.orchard.slab });
    m.deco('sign', 12.4, 7.4, { solid: false, radius: 0.15, scale: 0.8, label: TX.orchard.page });
    m.deco('ln17_board', 19.2, 8.6, { solid: true, radius: 0.3, scale: 0.9, label: TX.orchard.board, use: 'p17n_board' });
    // the fallen iron-bark oak: a long trunk across the wall, a root-plate, branches in the snow
    for (let i = 0; i < 7; i++) m.deco('p9_log', 4.2 + i * 1.15, 9.5 + Math.sin(i * 0.7) * 0.25, { solid: true, radius: 0.5, scale: 1.5, label: TX.orchard.oak });
    m.deco('oak', 3.1, 10.0, { solid: true, radius: 0.6, scale: 1.1, label: TX.orchard.oak });
    for (const [x, y, s] of [[22.4, 5.4, 1.5], [26.2, 8.2, 1.7], [24.0, 14.2, 1.4], [8.0, 16.4, 1.5], [7.0, 5.6, 1.6], [27.0, 16.6, 1.5], [20.2, 17.0, 1.3], [9.4, 12.6, 1.4]]) m.deco('oak', x, y, { solid: true, radius: 0.45, scale: s, label: TX.orchard.tree });
    for (const [x, y] of [[13.4, 8.4], [16.0, 9.2], [11.6, 13.6], [18.6, 12.4], [9.6, 7.0], [21.2, 10.6]]) m.deco('ln17_frost', x, y, { solid: false, scale: 0.8 });
    for (const [x, y] of [[12.5, 8.0], [15.9, 8.0]]) m.deco('lamp', x, y, { solid: true, radius: 0.2, scale: 0.85, glow: 0.8 });
    // the three Cantors at dusk (separate entities from the gallery's; hidden at dawn until they come up)
    KEEPERS.forEach((K, i) => m.add({ kind: 'npc', id: K.id, x: [12.3, 15.6, 17.5][i], y: [9.6, 9.8, 9.2][i], sprite: K.sprite, scale: 0.95, solid: true, radius: 0.32, facing: -Math.PI / 2, _orch: i }));
    m.baseCount = m.entities.length;
    return m;
  }

  // ---------------------------------------------------------------- navigation: a flow field on the cell grid
  const flowCache = new Map();
  function flowTo(tx, ty) {
    const m = G.map; if (!m) return null;
    tx = clamp(tx | 0, 0, m.w - 1); ty = clamp(ty | 0, 0, m.h - 1);
    const key = G.mapId + ':' + tx + ',' + ty, now = G.time;
    const hit = flowCache.get(key);
    if (hit && now - hit.at < 2.5) return hit.d;
    const d = new Int16Array(m.w * m.h).fill(-1);
    const q = [tx + ty * m.w]; d[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], cx = c % m.w, cy = (c / m.w) | 0, cd = d[c];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!walkable(m, nx, ny) || d[nx + ny * m.w] >= 0) continue;
        if (dx && dy && (!walkable(m, cx + dx, cy) || !walkable(m, cx, cy + dy))) continue;
        d[nx + ny * m.w] = cd + 1; q.push(nx + ny * m.w);
      }
    }
    if (flowCache.size > 40) flowCache.clear();
    flowCache.set(key, { at: now, d });
    return d;
  }
  // a unit step from (e.x,e.y) toward (tx,ty): straight when close or in sight, else down the flow field
  function steer(e, tx, ty) {
    const dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy) || 1;
    if (d < 2.2 || los(e.x, e.y, tx, ty)) return [dx / d, dy / d];
    const f = flowTo(tx, ty), m = G.map;
    if (!f) return [dx / d, dy / d];
    const cx = e.x | 0, cy = e.y | 0; let best = null, bd = f[cx + cy * m.w] < 0 ? 1e9 : f[cx + cy * m.w];
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      if (!i && !j) continue;
      const nx = cx + i, ny = cy + j; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const v = f[nx + ny * m.w]; if (v < 0 || v >= bd) continue;
      if (i && j && (!walkable(m, cx + i, cy) || !walkable(m, cx, cy + j))) continue;
      bd = v; best = [nx + 0.5, ny + 0.5];
    }
    if (!best) return [dx / d, dy / d];
    const bx = best[0] - e.x, by = best[1] - e.y, bl = hyp(bx, by) || 1;
    return [bx / bl, by / bl];
  }

  // ---------------------------------------------------------------- the world's state in the run
  const inGallery = () => !!(G && G.mapId === GAL);
  const live = () => R.active && !R.over && inGallery();
  const player = () => G.player;
  const cam = () => Engine.cam;
  const stoneDist = () => hyp(cam().x - STONE.x, cam().y - STONE.y);
  const lampBy = (x, y) => { let b = null, bd = 1e9; for (const l of R.lamps) { const d = hyp(l.x - x, l.y - y); if (d < bd) { bd = d; b = l; } } return { l: b, d: bd }; };
  function litNear(x, y, r) { for (const l of R.lamps) if (l.lit && hyp(l.x - x, l.y - y) <= r) return l; return null; }
  // the Stone's nook: while a flank lamp burns, nothing lands within it
  const flank = () => R.lamps[4].lit || R.lamps[5].lit;
  const inNook = (x, y) => hyp(x - STONE.x, y - STONE.y) <= 2.5 && flank();
  const sheltered = (x, y) => !!litNear(x, y, B.LAMP.light) || inNook(x, y);
  function say(text, cls, ttl) { if (typeof msg === 'function') msg(text, cls || '', ttl || 4200); }
  function capLine(text) {
    try {
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      const b = document.getElementById('ac-captions') || (document.getElementById('game') && (() => { const d = document.createElement('div'); d.id = 'ac-captions'; d.setAttribute('role', 'log'); document.getElementById('game').appendChild(d); return d; })());
      if (!b) return;
      const d = document.createElement('div'); d.textContent = text; b.appendChild(d);
      while (b.children.length > 4) b.removeChild(b.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* captions are cosmetic */ }
  }
  const keeperEnt = (i) => (G.maps && G.maps[GAL] ? G.maps[GAL].entities.find((e) => e._keeper === i) : null);

  // ---------------------------------------------------------------- spawning and the foes
  function spawnFoe(kind, from, k) {
    const m = G.map; if (!m) return null;
    const type = kind === 'h' ? 'p17n_hollow' : kind === 'd' ? 'p17n_hound' : 'p17n_moth';
    const o = MOUTH[from], off = ((k % 3) - 1) * 0.8;
    const x = o[0] + (from === 'S' ? off : 0), y = o[1] + (from === 'S' ? 0 : off);
    const e = { kind: 'enemy', type, x, y, transient: true, passive: true, _ln: { kind, wind: 0, cool: 1.2, st: 'walk', sit: 0, perch: -1, tx: 0, ty: 0, born: R.t, drift: R.rng() * 6.28, from } };
    m.entities.push(e); hydrate(e);
    if (kind === 'h' && !ensureHollowFrames()) e.sprite = 'hollow';   // the art has not decoded yet: the plain drawing
    e.state = 'passive'; e.alertT = 0; R.spawned++;
    return e;
  }
  const foes = () => G.map.entities.filter((e) => e._ln && !e.dead && !e.hidden);
  function wake(kinds, from, index) {
    for (let i = 0; i < kinds.length; i++) spawnFoe(kinds[i], from, i + (index || 0));
  }
  function foeAlive() { return foes().length; }

  function foeTick(e, dt) {
    const L = e._ln, p = player(), c = cam(), d0 = B.FOE[L.kind === 'h' ? 'hollow' : L.kind === 'd' ? 'hound' : 'moth'];
    if (e.stun > 0) return;
    const dxp = c.x - e.x, dyp = c.y - e.y, dp = hyp(dxp, dyp);
    const lamp = litNear(e.x, e.y, B.LAMP.light);
    if (L.kind === 'm') { mothTick(e, L, dt, d0); return; }
    let spd = d0.speed * (lamp ? d0.lightSlow : 1);
    if (e.slowed) spd *= 0.6;
    // hounds will not touch the glassed, and the Root Note wards them (the game's own rule)
    if (L.kind === 'd' && ((p.glassed && G.glassLock <= 0) || G.rootWard > 0)) {
      if (dp < 4.5) moveWithSlide(e, -dxp / (dp || 1) * d0.speed * dt, -dyp / (dp || 1) * d0.speed * dt, e);
      L.st = 'walk'; return;
    }
    // choose a target: hollows go for the nearest held keeper outside the light (or the player when close); hounds for the singer
    let tx = c.x, ty = c.y, tk = -1;
    if (L.kind === 'h') {
      let bd = 1e9;
      for (const k of R.keepers) { if (k.state !== 'held') continue; const d = hyp(k.e.x - e.x, k.e.y - e.y); if (d < bd) { bd = d; tk = k.i; tx = k.e.x; ty = k.e.y; } }
      if (tk < 0 || dp < 4.2) { tx = c.x; ty = c.y; tk = -1; }
    }
    L.tk = tk;
    // a wind-up in progress: the blow lands only if you are still within reach when it ends
    if (L.st === 'wind') {
      L.wind -= dt;
      if (L.wind <= 0) {
        L.st = 'walk'; L.cool = d0.cool;
        if (dp <= d0.reach + 0.45 && !sheltered(c.x, c.y) && !R.rest) strike(e, d0);
        else if (dp <= d0.reach + 0.45 && sheltered(c.x, c.y)) say(TX.hint.shelter, '', 1600);
      }
      return;
    }
    L.cool -= dt;
    const dist = hyp(tx - e.x, ty - e.y);
    // beside a keeper
    if (tk >= 0 && dist <= 1.15) {
      L.st = 'at'; const k = R.keepers[tk];
      if (!litNear(k.e.x, k.e.y, B.LAMP.light)) { k.hollowT += dt; if (k.hollowT === dt) say(F(TX.hint.hollowAt, k.K.first), '', 3200); }
      return;
    }
    L.st = 'walk';
    // reach the player: begin a wind-up (nothing is dealt in a lamp's light)
    // (a foe is stopped by the player's own body a little outside its reach, so the swing starts a hand's breadth beyond it)
    if (tk < 0 && dp <= d0.reach + 0.2 && L.cool <= 0 && !lamp && !sheltered(c.x, c.y)) { L.st = 'wind'; L.wind = d0.wind; return; }
    if (tk < 0 && dp <= d0.reach + 0.2) return;
    const [sx, sy] = steer(e, tx, ty);
    moveWithSlide(e, sx * spd * dt, sy * spd * dt, e);
  }
  function mothTick(e, L, dt, d0) {
    // drawn to the nearest lit lamp; settles on it and drinks
    let lamp = L.perch >= 0 ? R.lamps[L.perch] : null;
    if (lamp && !lamp.lit && lamp.moth !== e) lamp = null;
    if (!lamp || !lamp.lit) {
      L.perch = -1; let bd = 1e9; lamp = null;
      for (const l of R.lamps) { if (!l.lit || (l.moth && l.moth !== e && !l.moth.dead)) continue; const d = hyp(l.x - e.x, l.y - e.y); if (d < bd) { bd = d; lamp = l; } }
      if (lamp) L.perch = lamp.i;
    }
    L.drift += dt * 3.2;
    if (!lamp) { e.x += Math.cos(L.drift) * 0.4 * dt; e.y += Math.sin(L.drift) * 0.4 * dt; return; }
    const tx = lamp.x + Math.cos(L.drift) * 0.45, ty = lamp.y + Math.sin(L.drift * 1.1) * 0.45, d = hyp(tx - e.x, ty - e.y);
    if (d > 0.3) { const sp = d0.speed * (d > 1.6 ? 1 : 0.6); e.x += (tx - e.x) / d * sp * dt; e.y += (ty - e.y) / d * sp * dt; }
    if (hyp(lamp.x - e.x, lamp.y - e.y) < 0.9) {
      if (lamp.moth !== e) { lamp.moth = e; say(TX.hint.mothOn, 'warn', 3200); }
    }
  }
  function strike(e, d0) {
    const p = player(), L = e._ln;
    const dmg = d0.dmg[0] + Math.floor(R.rng() * (d0.dmg[1] - d0.dmg[0] + 1));
    try { Audio_.sfx.enemy(e.def, 'attack'); } catch (er) { /* silent */ }
    damagePlayer(dmg, e.def.name);
    if (L.kind === 'h' && p) p.voice = Math.max(0, p.voice - (d0.voice || 0));
  }

  // ---------------------------------------------------------------- keepers, lamps, oil, warmth
  function setKept(k) {
    k.state = 'kept'; k.hollowT = 0; k.callT = 0;
    say(F(TX.hint.keptA, k.K.first), 'warn', 5200);
    capLine(TX.cap.breath);
  }
  function lampSet(l, lit) {
    if (l.lit === lit) return;
    l.lit = lit;
    if (!lit) { l.oil = 0; if (l.moth) l.moth = null; say(TX.hint.lampOut, 'warn', 3000); capLine(TX.cap.out); }
  }
  function tendLamp(l) {
    if (!live()) return false;
    if (R.oil < 1) { say(TX.hint.noOil, 'warn', 3000); return false; }
    if (l.lit && l.oil > 88) { say(TX.gallery.lampOk, '', 2000); return false; }
    R.oil--;
    if (!l.lit) { l.lit = true; l.oil = B.LAMP.relight; say(TX.hint.lampOn, 'good', 2800); }
    else { l.oil = Math.min(100, l.oil + B.LAMP.trim); say(TX.hint.lampTrim, 'good', 2400); }
    try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
    return true;
  }
  function takeOil() {
    if (!live()) return false;
    if (R.oil >= B.OIL.carry) { say(TX.hint.oilFull, '', 2200); return false; }
    if (R.shelf < 1) { say(TX.gallery.oilEmpty, 'warn', 2600); return false; }
    R.shelf--; R.oil++; say(TX.hint.oilGot, 'good', 2000);
    try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
    return true;
  }

  // ---------------------------------------------------------------- the lullaby: a held-pitch mechanic that runs in the world
  // The contour, in cents above 174 Hz (REEDS' reference): five notes, a turn, the five again lower, a fall. [PROPOSED] shape; the
  // canon only says "five notes, a turn, the five again lower, a fall". Slews stay under ~320 cents a second.
  function verseCurve() {
    const V = B.VERSE, pts = []; let t = 0;
    const A = [700, 900, 700, 500, 700], Bn = A.map((c) => c - 300);
    const phrase = (notes) => { notes.forEach((c, i) => { if (i === 0) pts.push([t, c]); else { t += V.glide; pts.push([t, c]); } t += V.hold; pts.push([t, c]); }); };
    phrase(A);
    t += V.turn * 0.5; pts.push([t, A[A.length - 1] + 220]); t += V.turn * 0.5; pts.push([t, A[A.length - 1]]);
    t += V.glide; pts.push([t, Bn[0]]); t += V.hold; pts.push([t, Bn[0]]);
    Bn.slice(1).forEach((c) => { t += V.glide; pts.push([t, c]); t += V.hold; pts.push([t, c]); });
    t += V.fall; pts.push([t, Bn[Bn.length - 1] - 700]); t += 0.4; pts.push([t, Bn[Bn.length - 1] - 700]);
    return pts;
  }
  const CURVE = verseCurve();
  const VERSE_SECS = CURVE[CURVE.length - 1][0];
  const centsAt = (t) => {
    if (typeof REEDS !== 'undefined' && REEDS.centsAt) { try { return REEDS.centsAt(CURVE, t); } catch (e) { /* fall through */ } }
    if (t <= CURVE[0][0]) return CURVE[0][1];
    for (let i = 1; i < CURVE.length; i++) if (t <= CURVE[i][0]) { const a = CURVE[i - 1], b = CURVE[i], k = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
    return CURVE[CURVE.length - 1][1];
  };
  const toHz = (c) => (typeof REEDS !== 'undefined' && REEDS.toHz) ? REEDS.toHz(c) : 174 * Math.pow(2, c / 1200);
  const bandNow = () => { try { if (typeof REEDS !== 'undefined' && REEDS.bandFor) return REEDS.bandFor(0); } catch (e) { /* default */ } return B.BAND; };
  const LO = -1700, HI = 1500;

  function startSing() {
    if (!live() || R.sing) return false;
    if (R.phase !== 'night') return false;
    if (R.rest > 0) { say(TX.hint.notReady, 'warn', 1800); return false; }
    const c = cam();
    // you sing from the Stone: close, and facing the Root
    if (stoneDist() > 2.6) return false;
    G.keys = {}; G.vel.x = 0; G.vel.y = 0;
    R.sing = { t: -B.VERSE.lead, held: 0, longest: 0, streak: 0, inside: false, glow: 0, pitch: clamp(CURVE[0][1] - 260, LO + 80, HI - 80), keys: { up: false, down: false }, ptr: null, padPrev: {}, done: false, width: bandNow(), hist: [], histT: 0, tone: null, manual: false };
    R.sing.tone = singTone();
    bindSing();
    say(TX.hint.singing, '', 2400); capLine(TX.cap.verse);
    return true;
  }
  function endSing(why) {
    const s = R.sing; if (!s) return null;
    R.sing = null; unbindSing(); stopSingTone(s);
    const dur = VERSE_SECS, played = Math.max(0, Math.min(dur, s.t)), score = clamp(s.held / dur, 0, 1);
    const res = { score, held: s.held, played, why, complete: s.t >= dur - 1e-6 };
    // a verse counts for what was held of all of it; a verse broken off at the start counts for little
    if (played < 1.5) return res;
    R.verses++; R.scores.push(score);
    const V = B.VERSE, gain = V.gain * Math.pow(score, V.curve) * (R.hourSung ? V.again : 1);
    R.tune = Math.min(100, R.tune + gain); R.versePts += score;
    if (score >= V.pass) { if (!R.hourSung) R.hourSung = true; say(TX.hint.versePass, 'good', 2800); }
    else say(why === 'hurt' ? TX.hint.verseHurt : why === 'stop' ? TX.hint.verseStop : TX.hint.verseLost, 'warn', 3200);
    R.lastVerse = res;
    return res;
  }
  function singStep(dt) {
    const s = R.sing; if (!s) return;
    // steer: keys, pad, pointer
    let dir = (s.keys.up ? 1 : 0) - (s.keys.down ? 1 : 0);
    const g = padNow();
    if (g) {
      const ay = Math.abs(g.axes[1] || 0) < 0.18 ? 0 : -(g.axes[1] || 0);
      const dp = ((g.buttons[12] && g.buttons[12].pressed) ? 1 : 0) - ((g.buttons[13] && g.buttons[13].pressed) ? 1 : 0);
      dir = clamp(dir + ay + dp, -1, 1);
      for (const b of [1, 8]) { const now = !!(g.buttons[b] && g.buttons[b].pressed); if (now && !s.padPrev[b]) { s.padPrev[b] = true; endSing('stop'); return; } s.padPrev[b] = now; }
    }
    if (s.setPitch != null) { s.pitch = s.setPitch; }
    else s.pitch += dir * B.VERSE.rate * dt;
    if (s.ptr != null) { const d = s.ptr - s.pitch, m = 1800 * dt; s.pitch += clamp(d, -m, m); }
    s.pitch = clamp(s.pitch, LO, HI);
    const before = s.t; s.t += dt;
    const target = centsAt(Math.max(0, s.t));
    s.inside = s.t >= 0 && Math.abs(s.pitch - target) <= s.width / 2;
    if (s.t > 0) {
      const dtEff = Math.min(s.t, s.t - Math.max(0, before), VERSE_SECS - Math.max(0, before));
      if (dtEff > 0) { if (s.inside) { s.held += dtEff; s.streak += dtEff; if (s.streak > s.longest) s.longest = s.streak; } else s.streak = 0; }
    }
    s.glow += ((s.inside ? 1 : 0) - s.glow) * Math.min(1, dt * 9);
    s.histT += dt; if (s.histT >= 0.05) { s.histT = 0; s.hist.push([Math.max(0, s.t), s.pitch]); if (s.hist.length > 400) s.hist.shift(); }
    singToneUpdate(s);
    if (s.t >= VERSE_SECS - 1e-6) endSing('done');
  }
  function padNow() {
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ }
    return null;
  }
  // input while singing (capture phase, as reedcraft does): W/S or Up/Down steer, Esc breaks off; a drag steers too
  let sKd = null, sPd = null, sPm = null, sPu = null;
  function bindSing() {
    if (sKd) return;
    sKd = (ev) => {
      const s = R.sing; if (!s) return;
      if (G.state !== 'play') return;
      const k = String(ev.key || '').toLowerCase(), down = ev.type === 'keydown';
      if (k === 'w' || k === 'arrowup') { s.keys.up = down; }
      else if (k === 's' || k === 'arrowdown') { s.keys.down = down; }
      else if (k === 'escape' && down) { endSing('stop'); }
      else return;
      ev.stopImmediatePropagation(); ev.preventDefault();
    };
    const yToCents = (ev) => { const cv = document.getElementById('view'); if (!cv) return 0; const r = cv.getBoundingClientRect(); const f = clamp((ev.clientY - r.top) / Math.max(1, r.height), 0, 1); return HI - f * (HI - LO); };
    sPd = (ev) => { const s = R.sing; if (!s || G.state !== 'play') return; s.ptr = yToCents(ev); };
    sPm = (ev) => { const s = R.sing; if (!s || s.ptr == null) return; s.ptr = yToCents(ev); };
    sPu = () => { const s = R.sing; if (s) s.ptr = null; };
    window.addEventListener('keydown', sKd, true); window.addEventListener('keyup', sKd, true);
    const cv = document.getElementById('view');
    if (cv) { cv.addEventListener('pointerdown', sPd, true); cv.addEventListener('pointermove', sPm, true); cv.addEventListener('pointerup', sPu, true); cv.addEventListener('pointercancel', sPu, true); }
  }
  function unbindSing() {
    if (!sKd) return;
    window.removeEventListener('keydown', sKd, true); window.removeEventListener('keyup', sKd, true);
    const cv = document.getElementById('view');
    if (cv) { cv.removeEventListener('pointerdown', sPd, true); cv.removeEventListener('pointermove', sPm, true); cv.removeEventListener('pointerup', sPu, true); cv.removeEventListener('pointercancel', sPu, true); }
    sKd = sPd = sPm = sPu = null;
  }
  // the player's voice and the Root's drone (a reed tone, as in Hold the Pitch)
  function singTone() {
    try {
      const ctx = typeof Audio_ !== 'undefined' ? Audio_.ctx : null;
      if (!ctx || !Audio_.sfxBus) return null;
      const mk = (type, filterHz) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; g.gain.value = 0.0001;
        if (filterHz) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz; o.connect(f); f.connect(g); } else o.connect(g);
        g.connect(Audio_.sfxBus); o.start(); return { o, g };
      };
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => { });
      return { ctx, voice: mk('triangle', 1500), drone: mk('sine', 0) };
    } catch (e) { return null; }
  }
  function singToneUpdate(s) {
    const T = s.tone; if (!T) return;
    try {
      const muted = !!Audio_.muted, now = T.ctx.currentTime, a = Math.max(0, s.t);
      T.voice.o.frequency.setTargetAtTime(toHz(s.pitch), now, 0.03);
      T.drone.o.frequency.setTargetAtTime(toHz(centsAt(a)), now, 0.05);
      T.voice.g.gain.setTargetAtTime(muted ? 0.0001 : (s.inside ? 0.06 : 0.04), now, 0.05);
      T.drone.g.gain.setTargetAtTime(muted ? 0.0001 : 0.016, now, 0.08);
    } catch (e) { /* cosmetic */ }
  }
  function stopSingTone(s) {
    const T = s.tone; if (!T) return; s.tone = null;
    try { const now = T.ctx.currentTime; for (const n of [T.voice, T.drone]) { n.g.gain.setTargetAtTime(0.0001, now, 0.04); n.o.stop(now + 0.25); } } catch (e) { /* gone */ }
  }

  // ---------------------------------------------------------------- the vault's own sound (what the Hush takes, and gives back)
  const AM = { ctx: null, drone: null, hum: null, wind: null, dripT: 0, ok: false };
  function dropAmb() {
    const ctx = AM.ctx, srcs = AM.srcs || [], outs = AM.outs || [], gains = (AM.drone || []).concat(AM.hum || []).map((n) => n.g).concat(AM.wind ? [AM.wind] : []);
    AM.ok = false; AM.ctx = null; AM.srcs = null; AM.outs = null;
    try {
      const t = ctx.currentTime;
      for (const g of gains) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.3); }
      for (const o of srcs) o.stop(t + 1.6);
      setTimeout(() => { for (const n of outs) { try { n.disconnect(); } catch (e) { /* gone */ } } }, 1800);
    } catch (e) { /* closed context */ }
  }
  function ambTick(dt) {
    const A = typeof Audio_ !== 'undefined' ? Audio_ : null;
    if (!A || !A.ctx || !A.sfxBus) return;
    const ctx = A.ctx;
    // outside the night (every other map in the game) the bed is not built, or is faded out and stopped: no sources run and
    // nothing is automated per frame; it is built again when a night begins
    if (!(live() && !!R.active && !R.over)) { if (AM.ok) dropAmb(); return; }
    if (!AM.ok || AM.ctx !== ctx) {
      try {
        AM.ctx = ctx;
        const mk = (type, f, g0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = 0; o.connect(g); return { o, g }; };
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.connect(A.sfxBus);
        AM.drone = [mk('sine', 87), mk('sine', 174), mk('triangle', 261)];
        AM.hum = [mk('sine', 130.8), mk('sine', 146.8), mk('sine', 164.8)];
        for (const n of AM.drone.concat(AM.hum)) { n.g.connect(lp); n.o.start(); }
        const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        let last = 0, seed = 11; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; last = (last + 0.04 * (seed / 2147483647 * 2 - 1)) / 1.04; d[i] = last * 4; }
        const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
        const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 380; const wg = ctx.createGain(); wg.gain.value = 0;
        ns.connect(wl); wl.connect(wg); wg.connect(A.sfxBus); ns.start(); AM.wind = wg;
        AM.srcs = AM.drone.concat(AM.hum).map((n) => n.o).concat([ns]); AM.outs = [lp, wg];
        AM.ok = true;
      } catch (e) { AM.ok = false; return; }
    }
    const on = live() && !!R.active && !R.over, t = ctx.currentTime, muted = !!A.muted;
    try {
      const tune = on ? R.tune / 100 : 0, base = muted || !on ? 0 : 0.012 + 0.03 * tune;
      AM.drone[0].g.gain.setTargetAtTime(base, t, 0.4);
      AM.drone[1].g.gain.setTargetAtTime(base * (0.4 + 0.6 * tune), t, 0.4);
      AM.drone[2].g.gain.setTargetAtTime(base * Math.max(0, tune - 0.35), t, 0.4);
      R.keepers.forEach((k, i) => AM.hum[i].g.gain.setTargetAtTime(muted || !on || R.missing.breath || k.state !== 'held' ? 0 : 0.011, t, 0.5));
      AM.wind.gain.setTargetAtTime(muted || !on || R.missing.wind ? 0 : 0.018, t, 0.6);
      if (on && !R.missing.drip && !muted) {
        AM.dripT -= dt;
        if (AM.dripT <= 0) {
          AM.dripT = 1.9 + (R.t * 7.3 % 1.7);
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(920, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.07);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          o.connect(g); g.connect(A.sfxBus); o.start(t); o.stop(t + 0.18);
        }
      }
    } catch (e) { /* closed context */ }
  }
  // your footsteps go missing with the rest: the game's own step sound is held back while the layer is gone
  function wrapSteps() {
    if (typeof Audio_ === 'undefined' || !Audio_.sfx || Audio_.sfx.__ln17) return;
    const _s = Audio_.sfx.step;
    if (typeof _s !== 'function') return;
    Audio_.sfx.step = function () { try { if (R && live() && R.missing.steps) return; } catch (e) { /* normal */ } return _s.apply(this, arguments); };
    for (const k of ['_orig', '_test', '_p13h', '_p16d']) if (k in _s) Object.defineProperty(Audio_.sfx.step, k, { configurable: true, enumerable: true, get: () => _s[k], set: (v) => { _s[k] = v; } });   // pass inner wrappers' hooks through (house13 keeps its spy on ._orig)
    Audio_.sfx.__ln17 = true;
  }
  const LAYERS = ['drip', 'breath', 'wind', 'steps'];
  const LAYER_TX = { drip: [TX.hint.drip, TX.hint.dripBack, TX.cap.drip, TX.cap.dripBack], breath: [TX.hint.breath, TX.hint.breathBack, TX.cap.breath, TX.cap.breathBack], wind: [TX.hint.wind, TX.hint.windBack, TX.cap.wind, TX.cap.windBack], steps: [TX.hint.steps, TX.hint.stepsBack, TX.cap.steps, TX.cap.stepsBack] };
  // hour at which each sound can go, and the tune above which it comes back (a gift, each time)
  const LAYER_AT = { drip: 3, wind: 5, breath: 7, steps: 8 };
  function layersTick() {
    for (const k of LAYERS) {
      const gone = R.missing[k];
      if (!gone && R.hour >= LAYER_AT[k] && R.tune < 62 - (R.hour - LAYER_AT[k]) * 2 + 8) { R.missing[k] = true; say(LAYER_TX[k][0], 'warn', 4200); capLine(LAYER_TX[k][2]); }
      else if (gone && R.tune >= 74) { R.missing[k] = false; say(LAYER_TX[k][1], 'good', 3800); capLine(LAYER_TX[k][3]); }
    }
  }

  // ---------------------------------------------------------------- the tick
  function hourStart() {
    R.hourT = 0; R.hourSung = false; R.queue = (WAVES[R.hour] || []).map((g) => ({ at: g.at, from: g.from, kinds: g.kinds, told: false, done: false }));
    if (R.hour === 1) say(TX.hint.first, 'warn', 7000); else if (R.hour <= B.HOURS) say(TX.hint.hours[R.hour - 2], 'warn', 6500);
  }
  function lampTick(dt) {
    const Lm = B.LAMP;
    for (const l of R.lamps) {
      const e = l.e; if (!l.lit) { l.glow += (0 - l.glow) * Math.min(1, dt / Lm.glowTau); continue; }
      let rate = 100 / Lm.life;
      if (l.moth && !l.moth.dead && !l.moth.hidden) rate += Lm.mothDrain; else l.moth = null;
      l.oil = Math.max(0, l.oil - rate * dt);
      if (l.oil <= 0) lampSet(l, false);
      else if (l.oil < 24 && !l.low) { l.low = true; say(TX.hint.lampLow, 'warn', 2400); }
      if (l.oil >= 24) l.low = false;
      const tgt = 0.35 + 0.6 * clamp(l.oil / 100, 0, 1);
      l.glow += (tgt - l.glow) * Math.min(1, dt / Lm.glowTau);
      if (!l.lit) l.low = false;
    }
  }
  function tick(dt) {
    if (!R.active || R.over) return;
    const p = player(), c = cam();
    R.t += dt;
    if (R.rest > 0) R.rest = Math.max(0, R.rest - dt);
    // the lullaby in progress
    if (R.sing) { G.keys = {}; singStep(dt); }
    // the hour
    if (!R.hourStarted) { R.hourStarted = true; hourStart(); }
    R.hourT += dt;
    // the groups of this hour
    for (const g of R.queue) {
      if (g.done) continue;
      if (!g.told && R.hourT >= g.at - B.TELE) {
        g.told = true;
        const k = g.kinds[0], name = TX.hud[g.from.toLowerCase()];
        say(F(k === 'h' ? TX.hint.teleH : k === 'd' ? TX.hint.teleD : TX.hint.teleM, name), 'warn', 4800); capLine(TX.cap.tele);
        R.tele = { from: g.from, at: g.at, hour: R.hour };
      }
      if (R.hourT >= g.at) {
        if (foeAlive() + g.kinds.length > B.CAP + 2) continue;
        g.done = true; wake(g.kinds, g.from, 0); R.tele = null;
      }
    }
    if (R.tele && R.hourT > R.tele.at + 1) R.tele = null;
    // lamps, oil
    lampTick(dt);
    R.shelfT += dt; if (R.shelf < B.OIL.shelf && R.shelfT >= B.OIL.regen) { R.shelfT = 0; R.shelf++; }
    // warmth: near a lit lamp it comes back; away from one it goes, faster as the night goes on
    const warmNear = !!litNear(c.x, c.y, B.LAMP.light + 1.6) || inNook(c.x, c.y);
    const Cd = B.COLD;
    R.warm = clamp(R.warm + (warmNear ? Cd.gain : -(Cd.loss + Cd.lossHour * R.hour)) * dt, 0, 100);
    const cold = R.warm < Cd.stiff;
    if (cold && !R.cold) say(TX.hint.cold, 'warn', 3600); else if (!cold && R.cold) say(TX.hint.warm, 'good', 2600);
    R.cold = cold;
    if (cold) { p.fat = Math.min(p.fat, 0); p.voice = Math.max(0, p.voice - 0.05 * dt); }
    // the foes
    for (const e of foes()) foeTick(e, dt);
    // keepers: a Hollow beside them outside the light, and calling them back
    for (const k of R.keepers) {
      if (k.state === 'held') {
        if (k.hollowT >= B.KEEP.secs) setKept(k);
        else if (k.hollowT > 0) {
          const near = foes().some((e) => e._ln.kind === 'h' && hyp(e.x - k.e.x, e.y - k.e.y) <= 1.4);
          if (!near || litNear(k.e.x, k.e.y, B.LAMP.light)) k.hollowT = Math.max(0, k.hollowT - dt * 1.5);
        }
      }
    }
    if (R.callIdx >= 0) callStep(dt);
    // the tune
    let drain = B.DRAIN_BASE + B.DRAIN_HOUR * R.hour;
    for (const l of R.lamps) if (!l.lit) drain += B.DRAIN_LAMP;
    let held = 0;
    for (const k of R.keepers) { if (k.state === 'kept') drain += B.DRAIN_KEPT; else if (k.state === 'held') held++; }
    drain -= B.HUM * held;
    R.tune = clamp(R.tune - Math.max(0, drain) * dt, 0, 100);
    layersTick();
    // the root's look follows the tune
    syncVisuals();
    // the hour turns
    const ready = R.hourSung && R.hourT >= R.hourMin;
    if (ready || R.hourT >= R.hourMax) {
      if (R.sing && R.hourT < R.hourMax + 20) { /* let a verse in progress finish */ }
      else {
        if (!R.hourSung) { R.tune = Math.max(0, R.tune - B.UNSUNG); say(TX.hint.unsung, 'warn', 3600); }
        if (R.hour >= B.HOURS) { beginDawn(); return; }
        R.hour++; R.hourStarted = false; R.queue = [];
      }
    }
    if (R.tune <= 0) { finishRun('tune'); return; }
  }
  function syncVisuals() {
    const m = G.map; if (!m || m.id !== GAL) return;
    R.lamps.forEach((l) => { if (!l.e) l.e = m.entities.find((e) => e._lampIdx === l.i); if (l.e) { l.e.glow = l.lit ? l.glow : 0; l.e.label = !l.lit ? TX.gallery.lampOut : (l.moth ? TX.gallery.lampMoth : (l.oil < 40 ? TX.gallery.lampLow : TX.gallery.lampOk)); } });
    R.keepers.forEach((k) => { if (!k.e) k.e = keeperEnt(k.i); });
    const root = m.entities.find((e) => e.sprite && e.sprite.indexOf('ln17_root') === 0);
    if (root) {
      const t = R.tune;
      root.sprite = t >= 66 ? 'ln17_root' : t >= 33 ? 'ln17_root_dim' : 'ln17_root_grey';
      root.glow = 0.15 + 0.5 * (t / 100); root.lightCol = [14 + 28 * (t / 100), 24 + 44 * (t / 100), 10 + 14 * (t / 100)];
      root.label = t < 18 ? TX.gallery.rootDark : t < 45 ? TX.gallery.rootLow : TX.gallery.root;
    }
    const st = m.entities.find((e) => e.sprite === 'ln17_stone');
    if (st) st.label = R.phase !== 'night' ? TX.gallery.stoneAfter : (R.hourSung ? TX.gallery.stoneDone : TX.gallery.stoneSing);
    const ko = m.entities.find((e) => e.sprite === 'ln17_oil');
    if (ko) ko.label = R.shelf > 0 ? TX.gallery.oil : TX.gallery.oilEmpty;
    // a held keeper hums, sits straight; a kept one sits as they were (no sprite change: the Hush is never shown)
    R.keepers.forEach((k) => { if (k.e) k.e.label = k.state === 'kept' ? F(TX.hint.keeperTalkKept, k.K.first) : keeperText(k.K, 'name'); });
  }

  // ---------------------------------------------------------------- calling a keeper back
  function callStart(i) {
    const k = R.keepers[i]; if (!k || k.state !== 'kept' || !live()) return false;
    if (hyp(cam().x - k.e.x, cam().y - k.e.y) > B.KEEP.callRange + 0.6) return false;
    R.callIdx = i; k.callT = 0; say(F(TX.hint.callStart, k.K.first), '', 3000);
    return true;
  }
  function callStep(dt) {
    const k = R.keepers[R.callIdx]; if (!k) { R.callIdx = -1; return; }
    const near = hyp(cam().x - k.e.x, cam().y - k.e.y) <= B.KEEP.callRange + 0.2;
    if (!near || R.sing) { say(TX.hint.callBreak, 'warn', 2200); k.callT = 0; R.callIdx = -1; return; }
    k.callT += dt;
    if (k.callT >= B.KEEP.call) { k.state = 'held'; k.callT = 0; k.hollowT = 0; R.callIdx = -1; say(F(TX.hint.callDone, k.K.first), 'good', 3800); }
  }

  // ---------------------------------------------------------------- falls
  function fall() {
    const p = player(); R.falls++;
    R.tune = Math.max(1, R.tune - B.FALL.tune);
    if (R.sing) endSing('hurt');
    if (R.falls >= B.FALL.max) { say(TX.hint.fallLast, 'bad', 5000); finishRun('fall'); return; }
    p.hp = Math.max(1, Math.ceil(p.hpMax * B.FALL.hp)); p.fat = 0;
    const c = cam(); c.x = STONE.x + 0.3; c.y = STONE.y - 1.6; c.dir = -Math.PI / 2; if (typeof settleFeet === 'function') settleFeet();
    for (const e of foes()) if (e._ln.kind !== 'm') { e.stun = Math.max(e.stun || 0, B.FALL.stun); const d = hyp(e.x - STONE.x, e.y - STONE.y); if (d < 5) { e.x = STONE.x + (e.x - STONE.x) / (d || 1) * 5.5; e.y = STONE.y + (e.y - STONE.y) / (d || 1) * 5.5; } }
    R.rest = B.FALL.rest;
    R.restFade = scares() === 'full' ? 0.3 : scares() === 'gentle' ? 0.8 : 1.6;
    R.restFadeT = R.restFade;
    say(TX.hint.fall, 'warn', 5500);
  }

  // ---------------------------------------------------------------- dawn, results
  function beginDawn() {
    R.phase = 'dawn'; R.dawnT = 0;
    flags()[FP + 'up'] = 1;
    for (const e of foes()) { e.dead = true; e.hidden = true; e.solid = false; }
    say(TX.hint.dawnWait, 'warn', 5000);
    // the lamps pale; the Root is whole
    R.tune = Math.max(R.tune, 70);
    showEvent(TX.card.dawnTitle, TX.card.dawnBody, [{ t: TX.card.dawnGo, f: () => climbToOrchard() }]);
  }
  function climbToOrchard() {
    if (!R.active) return;
    R.phase = 'morning'; R.tick2 = 0;
    G.tod = 0.27; G.day = 85;      // Dawnday, the first of Stillmonth
    loadMap(ORCH, { x: 14.5, y: 8.2, dir: Math.PI / 2 });
    G.state = 'play';
    // the keepers come up one after another from the stairhead; those that were kept are given back last
    const m = G.map;
    R.keepers.forEach((k, i) => { const e = m.entities.find((x) => x._orch === i); if (e) { e.hidden = false; e.x = 14.5; e.y = 6.3; e._rise = { delay: 1.0 + i * 1.3, tx: [11.8, 14.5, 17.2][i], ty: 10.2 + (i === 1 ? 0.8 : 0), k }; e.hidden = true; } });
  }
  function morningTick(dt) {
    R.dawnT += dt;
    const m = G.map; if (!m || m.id !== ORCH) return;
    for (const e of m.entities) {
      if (!e._rise) continue;
      const r = e._rise;
      if (R.dawnT >= r.delay) {
        if (e.hidden) { e.hidden = false; if (r.k.state === 'kept') say(F(keeperText(r.k.K, 'back')), 'warn', 6500); }
        const d = hyp(r.tx - e.x, r.ty - e.y);
        if (d > 0.05) { const sp = 1.3 * dt; e.x += (r.tx - e.x) / d * Math.min(sp, d); e.y += (r.ty - e.y) / d * Math.min(sp, d); }
      }
    }
    if (R.dawnT >= 8.5 && !R.result) finishRun('dawn');
  }
  function finishRun(how) {
    if (R.over) return;
    R.over = true; R.phase = how === 'dawn' ? 'won' : 'lost'; R.sing && endSing('stop');
    unbindSing();
    const lamps = R.lamps.filter((l) => l.lit).length, keepers = R.keepers.filter((k) => k.state !== 'kept').length;
    const res = { id: EXTRA_ID, won: how === 'dawn', how, time: Math.round(R.t * 10) / 10, score: how === 'dawn' ? score(R) : 0, verses: R.verses, lamps, keepers, falls: R.falls, hours: R.hour };
    if (res.won) {
      const entry = { t: Math.max(1, Math.round(R.t)), s: res.score, k: keepers, l: lamps, f: R.falls };
      R.rank = recordWin(entry); R.newBest = R.rank === 0 && tally.best.length > 0;
      setf('dawns', fint('dawns') + 1);
    }
    R.result = res;
    res.rank = R.rank;
    showResult(res);
  }
  function tableHtml() {
    // numbers only: nothing from a save or from storage is ever parsed as markup
    if (!tally.best.length) return '<p>' + TX.card.tallyNone + '</p>';
    let h = '<p class="muted">' + TX.card.tallyHead + '</p><ol class="ln17-tally">';
    tally.best.forEach((r) => { h += '<li>' + mmss(r.t) + ' · ' + r.s + ' · ' + r.k + '/3 · ' + r.l + '/6 · ' + r.f + '</li>'; });
    return h + '</ol><p class="muted">' + TX.card.tallyNote + '</p>';
  }
  function showTally(back) {
    showEvent(TX.card.tallyTitle, tableHtml(), [{ t: TX.card.close, f: back || null }]);
  }
  function showResult(res) {
    const lines = res.won ? [TX.card.winBody] : [res.how === 'fall' ? TX.card.loseFallBody : TX.card.loseTuneBody];
    let body = lines[0];
    if (res.won) {
      body += '<br><br>' + F(TX.card.stats, mmss(res.time), res.score) + '<br>' + F(TX.card.stats2, res.verses, res.lamps, res.keepers, res.falls);
      if (res.rank === 0) body += '<br>' + TX.card.newBest; else if (res.rank > 0) body += '<br>' + F(TX.card.rank, res.rank + 1);
    }
    const title = res.won ? TX.card.winTitle : (res.how === 'fall' ? TX.card.loseFall : TX.card.loseTune);
    const choices = [{ t: TX.card.ret, f: () => end(res) }];
    if (res.won && R.phase === 'won') choices.unshift({ t: TX.card.stay, f: () => { /* a moment in the frost; the card does not return */ } });
    showEvent(title, body + '<br><br>' + (res.won ? tableHtml() : ''), choices);
  }

  // ---------------------------------------------------------------- uses
  function onUse(e) {
    const use = e.use;
    if (use === 'p17n_lamp') { const l = R.lamps[e._lampIdx]; if (l && live()) { tendLamp(l); return true; } say(TX.gallery.lamp, '', 2600); return true; }
    if (use === 'p17n_oil') { if (live()) takeOil(); else say(TX.gallery.oil, '', 2200); return true; }
    if (use === 'p17n_stone') {
      if (!live()) { say(TX.gallery.stoneAfter, '', 2600); return true; }
      if (R.phase !== 'night') { say(TX.hint.noSing, 'warn', 2600); return true; }
      if (!startSing()) say(TX.hint.notReady, 'warn', 1800);
      return true;
    }
    if (use === 'p17n_root') { say(e.label || TX.gallery.root, '', 3600); return true; }
    if (use === 'p17n_board') { showTally(null); return true; }
    return false;
  }
  function keeperQuest(i) {
    const K = KEEPERS[i], k = R && R.keepers ? R.keepers[i] : null;
    if (G.mapId === ORCH) return { text: R.phase === 'morning' || R.phase === 'won' ? keeperText(K, 'dawn') : keeperText(K, 'orchard') };
    if (k && k.state === 'kept') return { text: F(keeperText(K, 'kept')) };
    const h = R.hour; const w = h <= 3 ? 'a' : h <= 7 ? 'b' : 'c';
    return { text: keeperText(K, w) };
  }

  // ---------------------------------------------------------------- the HUD (drawn on the canvas, in the view)
  function paintStrip(ctx) {
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(8,6,4,0.62)'; ctx.fillRect(0, 0, 320, 18);
    ctx.fillStyle = '#5a4530'; ctx.fillRect(0, 18, 320, 1);
    ctx.font = '7px "Alegreya SC", serif'; ctx.textAlign = 'left';
    const hn = R.hour >= B.HOURS ? TX.hud.dead : TX.hud.hourNames[R.hour - 1] + ' ' + TX.hud.hour;
    ctx.fillStyle = '#d9a441'; ctx.fillText(hn, 4, 6);
    ctx.fillStyle = '#8a7a58'; ctx.fillText(mmss(R.t), 4, 14);
    // the tune
    const bx = 62, bw = 100;
    ctx.fillStyle = '#b8a883'; ctx.fillText(TX.hud.tune, bx, 6);
    ctx.fillStyle = '#000'; ctx.fillRect(bx, 9, bw, 6);
    const tcol = R.tune > 66 ? '#a9d868' : R.tune > 33 ? '#d9b441' : '#b86a4a';
    ctx.fillStyle = tcol; ctx.fillRect(bx + 1, 10, Math.round((bw - 2) * R.tune / 100), 4);
    ctx.fillStyle = '#e0e0e0'; ctx.fillRect(bx + Math.round(bw * B.TUNE_PASS / 100), 8, 1, 8);
    // lamps
    ctx.fillStyle = '#b8a883'; ctx.fillText(TX.hud.lamps, 172, 6);
    R.lamps.forEach((l, i) => {
      const x = 172 + i * 8, y = 10;
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, 6, 6);
      if (l.lit) { ctx.fillStyle = l.oil < 24 ? '#c05a30' : '#e0a838'; const hh = Math.max(1, Math.round(4 * l.oil / 100)); ctx.fillRect(x + 1, y + 5 - hh, 4, hh); }
      if (l.moth) { ctx.fillStyle = '#e8e8ff'; ctx.fillRect(x + 2, y - 1, 2, 2); }
    });
    // keepers
    ctx.fillStyle = '#b8a883'; ctx.fillText(TX.hud.keepers, 226, 6);
    R.keepers.forEach((k, i) => {
      const x = 226 + i * 9, y = 10;
      ctx.fillStyle = '#000'; ctx.fillRect(x, y, 7, 6);
      ctx.fillStyle = k.state === 'kept' ? '#6a7080' : '#e8c470'; ctx.fillRect(x + 1, y + 1, 5, 4);
      if (k.hollowT > 0 && k.state === 'held') { ctx.fillStyle = '#c05a30'; ctx.fillRect(x, y + 7, Math.round(7 * Math.min(1, k.hollowT / B.KEEP.secs)), 1); }
      if (k.callT > 0) { ctx.fillStyle = '#a9d868'; ctx.fillRect(x, y + 7, Math.round(7 * Math.min(1, k.callT / B.KEEP.call)), 1); }
    });
    // oil and warmth
    ctx.fillStyle = '#b8a883'; ctx.fillText(TX.hud.oil + ' ' + R.oil, 258, 6);
    ctx.fillText(TX.hud.warm, 288, 6);
    ctx.fillStyle = '#000'; ctx.fillRect(288, 9, 28, 6);
    ctx.fillStyle = R.warm < B.COLD.stiff ? '#6a8ac8' : '#d98b3a'; ctx.fillRect(289, 10, Math.round(26 * R.warm / 100), 4);
    // what is coming
    if (R.tele) {
      const left = Math.max(0, R.tele.at - R.hourT);
      ctx.fillStyle = 'rgba(8,6,4,0.62)'; ctx.fillRect(110, 20, 100, 10);
      ctx.fillStyle = '#e0a060'; ctx.textAlign = 'center';
      ctx.fillText(TX.hud.coming + ' · ' + TX.hud[R.tele.from.toLowerCase()] + (left > 0 ? ' ' + Math.ceil(left) : ''), 160, 25);
    }
  }
  // Text is the costly part of a canvas HUD (every fillText goes through the language wrapper), so the strip and the staff's words are
  // painted into small cached layers and only repainted when what they say changes; a frame is then a few drawImage calls.
  const LAYERS_C = {};
  function layer(name, w, h, key, paint) {
    let L_ = LAYERS_C[name];
    if (!L_) { const c = document.createElement('canvas'); c.width = w; c.height = h; L_ = LAYERS_C[name] = { c, x: c.getContext('2d'), key: null }; }
    if (L_.key !== key) { L_.key = key; L_.x.clearRect(0, 0, w, h); L_.x.save(); L_.x.textBaseline = 'middle'; paint(L_.x); L_.x.restore(); }
    return L_.c;
  }
  const lang = () => { try { return document.documentElement.lang || ''; } catch (e) { return ''; } };
  function stripKey() {
    let k = R.hour + '|' + (R.t | 0) + '|' + Math.round(R.tune) + '|' + R.oil + '|' + Math.round(R.warm / 2) + '|' + lang() + '|';
    for (const l of R.lamps) k += (l.lit ? Math.ceil(l.oil / 8) : 'x') + (l.moth ? 'm' : '') + ',';
    for (const q of R.keepers) k += q.state[0] + Math.round(Math.min(1, q.hollowT / B.KEEP.secs) * 7) + Math.round(Math.min(1, q.callT / B.KEEP.call) * 7) + ',';
    if (R.tele) k += R.tele.from + Math.ceil(Math.max(0, R.tele.at - R.hourT));
    return k;
  }
  function drawHUD17() {
    const ctx = Engine.ctx;
    if (!R.active || !inGallery() || G.state === 'title' || G.dead) return;
    ctx.save();
    ctx.drawImage(layer('strip', 320, 31, stripKey(), paintStrip), 0, 0);
    // the fall: the dark comes down, slowly if you asked it to
    if (R.rest > 0) {
      const a = clamp(R.rest / Math.max(0.1, B.FALL.rest), 0, 1);
      const fade = R.restFade || 1, since = B.FALL.rest - R.rest;
      const alpha = Math.min(1, since / fade) * 0.78 * Math.min(1, a * 3);
      ctx.fillStyle = 'rgba(2,3,2,' + alpha.toFixed(3) + ')'; ctx.fillRect(0, 0, 320, 150);
    }
    // the staff, while singing
    if (R.sing) drawStaff(ctx, R.sing);
    ctx.restore();
  }
  function drawStaff(ctx, s) {
    const y0 = 84, h = 62, x0 = 16, w = 288, nowX = x0 + 74, pps = 36;
    ctx.fillStyle = 'rgba(6,8,6,0.74)'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = 'rgba(217,164,65,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    const yOf = (c) => y0 + 5 + (HI - c) / (HI - LO) * (h - 10);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 1, y0 + 1, w - 2, h - 2); ctx.clip();
    const half = s.width / 2, tNow = s.t;
    // the target band, scrolling right to left
    ctx.fillStyle = s.inside ? 'rgba(232,196,112,0.55)' : 'rgba(232,196,112,0.32)';
    ctx.beginPath();
    for (let px = x0; px < x0 + w; px += 3) {
      const t = tNow + (px - nowX) / pps; if (t < 0 || t > VERSE_SECS) continue;
      const c = centsAt(t); ctx.rect(px, yOf(c + half), 3, Math.max(2, yOf(c - half) - yOf(c + half)));
    }
    ctx.fill();
    // the trail of your voice
    ctx.fillStyle = 'rgba(170,230,160,0.75)';
    ctx.beginPath(); for (const [t, c] of s.hist) { const px = nowX + (t - tNow) * pps; if (px >= x0 && px <= nowX) ctx.rect(px, yOf(c) - 0.5, 1, 1.5); } ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(nowX, y0 + 2, 1, h - 4);
    const vy = yOf(s.pitch);
    ctx.fillStyle = s.inside ? '#d4ffc0' : '#9ac88a'; ctx.beginPath(); ctx.arc(nowX, vy, s.inside ? 3.4 : 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const pct = Math.round(clamp(s.held / VERSE_SECS, 0, 1) * 100), listen = s.t < 0;
    ctx.drawImage(layer('staff', 288, 62, pct + '|' + listen + '|' + lang(), (c) => {
      c.font = '7px "Alegreya SC", serif'; c.textAlign = 'left';
      c.fillStyle = '#d9a441'; c.fillText(TX.hud.verse, 4, 7);
      c.textAlign = 'right'; c.fillStyle = '#b8a883'; c.fillText(TX.hud.held + ' ' + pct + '%', w - 4, 7);
      c.textAlign = 'left'; c.fillStyle = '#8a7a58'; c.fillText(listen ? TX.hud.listen : TX.hud.steer, 4, h - 6);
    }), x0, y0);
  }

  // ---------------------------------------------------------------- start / end of the extra (an isolated visit)
  let SNAP = null;
  function ensureSession() {
    if (!G.maps) G.maps = buildAllMaps();
    if (!G.player) {
      const ci = typeof CLASSES !== 'undefined' ? Math.max(0, CLASSES.findIndex((c) => c.id === 'cantor')) : 0;
      CREATE.cls = ci; CREATE.name = 'Keeper'; CREATE.face = 1; CREATE.attrs = Object.assign({}, CLASSES[ci].attrs); CREATE.bio = [];
      G.player = newPlayer(); giveKit(G.player); G.flags = G.flags || {}; G.journal = G.journal || []; G.ledger = G.ledger || [];
    }
    ensureMaps();
  }
  function ensureMaps() {
    if (!G.maps) return;
    if (!G.maps[ORCH] || !G.maps[GAL]) { const fresh = { [ORCH]: buildOrchard(), [GAL]: buildGallery() }; Object.assign(G.maps, fresh); }
  }
  function freshMaps() { G.maps[ORCH] = buildOrchard(); G.maps[GAL] = buildGallery(); flowCache.clear(); }
  function snapshot() {
    const p = G.player, c = cam();
    return {
      mapId: G.mapId, cam: { x: c.x, y: c.y, dir: c.dir, pitch: c.pitch }, tod: G.tod, day: G.day, state: G.state, noise: G.noise,
      hp: p.hp, voice: p.voice, fat: p.fat, hpMax: p.hpMax, voiceMax: p.voiceMax, gold: p.gold, inv: JSON.parse(JSON.stringify(p.inv)), songs: p.songs.slice(), weapon: p.weapon, weapons: (p.weapons || []).slice(),
      xp: p.xp, level: p.level, kills: p.kills,
      flags: Object.keys(flags()).filter((k) => k.indexOf(FP) === 0).reduce((o, k) => { o[k] = flags()[k]; return o; }, {}),
      hadFlags: Object.keys(flags()).filter((k) => k.indexOf(FP) === 0), flagsAll: JSON.stringify(flags()),
      keepMaps: { [ORCH]: G.maps ? G.maps[ORCH] : null, [GAL]: G.maps ? G.maps[GAL] : null },
      journalLen: G.journal ? G.journal.length : 0, rootWard: G.rootWard, mapsHad: { [ORCH]: !!(G.maps && G.maps[ORCH]), [GAL]: !!(G.maps && G.maps[GAL]) },
    };
  }
  function restore() {
    if (!SNAP) return;
    const p = G.player, s = SNAP;
    if (p) {
      p.hp = s.hp; p.voice = s.voice; p.fat = s.fat; p.hpMax = s.hpMax; p.voiceMax = s.voiceMax; p.gold = s.gold; p.inv = s.inv; p.songs = s.songs; p.weapon = s.weapon; if (s.weapons) p.weapons = s.weapons;
      p.xp = s.xp; p.level = s.level; p.kills = s.kills;
    }
    G.tod = s.tod; G.day = s.day; G.noise = s.noise; G.rootWard = 0;
    // the visit changes nothing of the game's own: every flag is put back as it was (the generic world clock ticks them while a map runs)
    const f = flags();
    const putFlags = () => { try { const was = JSON.parse(s.flagsAll); for (const k of Object.keys(f)) delete f[k]; Object.assign(f, was); } catch (e) { for (const k of Object.keys(f)) if (k.indexOf(FP) === 0) delete f[k]; Object.assign(f, s.flags); } };
    putFlags();
    if (G.journal && G.journal.length > s.journalLen) G.journal.length = s.journalLen;
    // put the player back where the visit began, and take away maps that the visit alone made (a save never sees them)
    try {
      if (s.mapId && !inMine(s.mapId) && G.maps && G.maps[s.mapId]) { loadMap(s.mapId, { x: s.cam.x, y: s.cam.y, dir: s.cam.dir }); cam().pitch = s.cam.pitch || 0; }
      for (const id of MAPS) { if (!G.maps) break; if (s.keepMaps[id]) G.maps[id] = s.keepMaps[id]; else delete G.maps[id]; }
    } catch (e) { console.warn('longnight17 restore failed', e); }
    putFlags();   // the re-entry above writes flags of its own (the world clock); the visit leaves none of them
    G.state = s.state === 'title' ? 'title' : 'play'; G.keys = {};
    SNAP = null;
  }
  function start(opts) {
    opts = opts || {};
    ensureSession();
    validate();
    SNAP = snapshot();
    R = freshRun(opts);
    freshMaps(); ensureCoats();
    const p = G.player;
    // the night's kit: a full voice for the Songs, two jars of honey, a tonic; the Songs a Cantor would know
    p.voiceMax = Math.max(p.voiceMax, 30); p.voice = p.voiceMax; p.hp = p.hpMax; p.fat = p.fatMax;
    for (const s of ['murmur', 'tending', 'fifth', 'root']) if (!p.songs.includes(s)) p.songs.push(s);
    // a short sword in hand, so the night is not seen through the glowing casting hands
    if (Array.isArray(p.weapons)) { if (!p.weapons.includes('sword')) p.weapons.push('sword'); p.weapon = p.weapons.indexOf('sword'); }
    if (!G.has('honey')) G.give('honey', 2); else G.give('honey', 1);
    if (!G.has('tonic')) G.give('tonic', 1);
    setf('nights', fint('nights') + 1); tally.nights++; saveTally();
    flags()[FP + 'up'] = 0; setf('seen', 1);
    G.dead = false; G.state = 'play'; G.keys = {};
    try { if (typeof WINTER17 !== 'undefined') { WINTER17.apply(ORCH, { snow: 0.85, fall: 0.35, breath: true, grade: 0.5 }); WINTER17.apply(GAL, { snow: 0, fall: 0, breath: true, grade: 0.35 }); } } catch (e) { console.warn('longnight17 winter failed', e); }
    G.tod = 0.76; G.day = 84;      // Stasisday, the thirtieth of Frostmonth (calendar11: day 84 is the last day of the year, a Stasisday) [PROPOSED year-less]
    loadMap(ORCH, { x: 14.5, y: 14.5, dir: -Math.PI / 2 });
    G.state = 'play';
    R.phase = 'dusk';
    if (opts.skipIntro) { begin(); return R; }
    showEvent(TX.intro.title, TX.intro.date + '<br><br>' + TX.intro.body + '<br><br>' + TX.intro.how, [
      { t: TX.intro.go, f: () => begin() },
      { t: TX.intro.tally, f: () => showTally(() => start2()) },
      { t: TX.intro.no, f: () => end({ id: EXTRA_ID, won: false, how: 'no' }) },
    ]);
    return R;
  }
  function start2() {   // the intro card again (after the tally)
    showEvent(TX.intro.title, TX.intro.date + '<br><br>' + TX.intro.body + '<br><br>' + TX.intro.how, [
      { t: TX.intro.go, f: () => begin() },
      { t: TX.intro.tally, f: () => showTally(() => start2()) },
      { t: TX.intro.no, f: () => end({ id: EXTRA_ID, won: false, how: 'no' }) },
    ]);
  }
  function begin() {
    if (!R || R.over) return;
    R.active = true; R.phase = 'night'; R.hourStarted = false;
    try { document.body.classList.add('ln17-run'); } catch (e) { /* none */ }
    loadMap(GAL, { x: 17.5, y: 6.8, dir: Math.PI / 2 });
    G.state = 'play';
    R.lamps.forEach((l) => { l.e = null; }); R.keepers.forEach((k) => { k.e = null; });
    syncVisuals();
  }
  function end(result) {
    unbindSing(); if (R && R.sing) stopSingTone(R.sing);
    try { document.body.classList.remove('ln17-run'); } catch (e) { /* none */ }
    try { if (typeof WINTER17 !== 'undefined') { WINTER17.clear(ORCH); WINTER17.clear(GAL); } } catch (e) { /* none */ }
    const res = result || (R && R.result) || { id: EXTRA_ID, won: false };
    if (R) { R.active = false; R.over = true; R.sing = null; }
    for (const e of (G.map ? G.map.entities : [])) if (e._ln) { e.dead = true; e.hidden = true; }
    restore();
    flowCache.clear();
    R.phase = 'idle';
    try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.finish) EXTRAS17.finish({ text: res.won ? TX.result.won : (res.how === 'tune' || res.how === 'fall') ? TX.result.lost : TX.result.left }); } catch (e) { console.warn('longnight17 finish failed', e); }
    return res;
  }
  function registerExtra() {
    try {
      if (typeof EXTRAS17 === 'undefined' || !EXTRAS17.register) return;
      EXTRAS17.register({
        id: EXTRA_ID, title: TX.title, blurb: TX.blurb, tag: TX.tag,
        start: (o) => start(o), unlocked: () => true,
        summary: () => (tally.best.length ? mmss(tally.best[0].t) : ''),
      });
    } catch (e) { console.warn('longnight17 register failed', e); }
  }

  // ---------------------------------------------------------------- wrappers
  function wrap() {
    if (typeof useDeco === 'function') {
      const _f = useDeco;
      useDeco = function (e) {
        try { if (e && typeof e.use === 'string' && e.use.indexOf('p17n_') === 0 && onUse(e)) return; } catch (er) { console.warn('longnight17 use failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof talk === 'function') {
      const _f = talk;
      talk = function (e) {
        try {
          if (e && e._keeper != null && live()) {
            const k = R.keepers[e._keeper];
            if (k && k.state === 'kept') { if (callStart(e._keeper)) return; }
          }
        } catch (er) { console.warn('longnight17 talk failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof transfer === 'function') {
      const _f = transfer;
      transfer = function (portal) {
        try {
          if (portal && portal.ln17up && R.active && !R.over && R.phase === 'night') {
            showEvent(TX.card.leaveTitle, TX.card.leaveBody, [{ t: TX.card.leaveYes, f: () => { finishRun('left'); } }, { t: TX.card.leaveNo, f: null }]);
            return;
          }
          if (portal && portal.ln17up && R.phase === 'dawn') { climbToOrchard(); return; }
        } catch (er) { console.warn('longnight17 transfer failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof damagePlayer === 'function') {
      const _f = damagePlayer;
      damagePlayer = function (dmg, src) {
        try {
          if (live() && R.phase === 'night' && G.player) {
            const p = G.player;
            if (p.hp - dmg <= 0) {
              try { fx('hurt', 220); Audio_.sfx.hurt(); } catch (e) { /* silent */ }
              p.hp = 0; fall(); return;
            }
            const r = _f.apply(this, arguments);
            if (R.sing) endSing('hurt');
            return r;
          }
        } catch (er) { console.warn('longnight17 damage failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof killEnemy === 'function') {
      const _f = killEnemy;
      killEnemy = function (e, byGlass) {
        try {
          if (e && e._ln) {
            if (e.type === 'p17n_hollow') {
              e.dead = true; e.solid = false; e.hidden = true; G.player.kills++; G.player.xp += e.def.xp; R.hollowStilled++;
              say(TX.hint.hollowSit, '', 3200); checkLevel(); return;
            }
            if (e.type === 'p17n_moth') { R.mothKills++; const l = R.lamps.find((x) => x.moth === e); if (l) { l.moth = null; say(TX.hint.mothKill, 'good', 2400); } }
            if (e.type === 'p17n_hound') R.houndKills++;
          }
        } catch (er) { console.warn('longnight17 kill failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof update === 'function') {
      const _f = update;
      update = function (dt) {
        try { if (R.active && !R.over && R.sing && G.state === 'play') { G.keys = {}; G.vel.x = 0; G.vel.y = 0; } } catch (er) { /* none */ }
        const r = _f.apply(this, arguments);
        try {
          if (G.state === 'play') {
            if (live()) tick(dt);
            else if (R.active && !R.over && R.phase === 'morning') morningTick(dt);
            ambTick(dt);
          }
        } catch (er) { console.warn('longnight17 tick failed', er); }
        return r;
      };
    }
    if (typeof drawHUD === 'function') {
      const _f = drawHUD;
      drawHUD = function () {
        const r = _f.apply(this, arguments);
        try { drawHUD17(); } catch (er) { console.warn('longnight17 hud failed', er); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _f = loadMap;
      loadMap = function (id, pos) {
        try { ensureCoats(); validate(); if (inMine(id) && G.maps) ensureMaps(); } catch (er) { console.warn('longnight17 load failed', er); }
        const r = _f.call(this, id, pos);
        try {
          if (inMine(G.mapId)) {
            try { const tx = G.mapId === ORCH ? TX.orchard : TX.gallery; const t = (G.mapId === ORCH && R.phase === 'morning') ? TX.orchard.arriveDawn : tx.arrive; msg(t, '', 7000); } catch (e) { /* none */ }
            if (G.mapId === GAL) { R.lamps.forEach((l) => { l.e = null; }); R.keepers.forEach((k) => { k.e = null; }); syncVisuals(); }
            // out of the run: the stair is open and the room is quiet
            if (!R.active && G.mapId === GAL) { for (const e of foes()) { e.dead = true; e.hidden = true; } }
          }
        } catch (er) { console.warn('longnight17 arrival failed', er); }
        return r;
      };
    }
    if (typeof buildAllMaps === 'function') {
      const _f = buildAllMaps;
      buildAllMaps = function () {
        const maps = _f.apply(this, arguments);
        try { ensureCoats(); maps[ORCH] = buildOrchard(); maps[GAL] = buildGallery(); } catch (er) { console.warn('longnight17 maps failed', er); }
        return maps;
      };
    }
  }

  function state() {
    return { active: R.active, over: R.over, phase: R.phase, t: R.t, hour: R.hour, hourT: R.hourT, tune: R.tune, warm: R.warm, oil: R.oil, shelf: R.shelf, falls: R.falls, verses: R.verses, sung: R.hourSung,
      lamps: R.lamps.map((l) => ({ lit: l.lit, oil: l.oil, moth: !!l.moth })), keepers: R.keepers.map((k) => k.state), missing: Object.assign({}, R.missing), foes: R.active && G.map ? foes().length : 0, singing: !!R.sing, result: R.result, rest: R.rest };
  }
  function init() {
    try { const st = document.createElement('style'); st.textContent = 'body.ln17-run #msgs{top:16cqh}'; document.head.appendChild(st); } catch (e) { /* no dom */ }
    loadTally();
    paintTextures(); paintProps(); installCatalog(); ensureCoats();
    wrap(); wrapSteps();
    registerExtra();
    // arrival cards (js/screens.js): the vault is a root-hall; the orchard is outdoor
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) Object.assign(SCREENS.FAMILY, { ln17_gallery: 'root', ln17_orchard: 'woods' }); } catch (e) { /* no cards */ }
  }
  init();

  return {
    FP, KEY, MAPS, ORCH, GAL, B, WAVES, TX, LIST, FLAGS, ENEMY_DEFS, VOICE_DEFS, KEEPERS, LAMPS, KEEPER_AT, STONE, OIL_AT, MOUTH, C, CURVE, VERSE_SECS,
    get R() { return R; }, tally, state, fint, setf, validate, score, mmss,
    start, begin, end, finishRun, beginDawn, climbToOrchard, tick, morningTick, fall, startSing, endSing, singStep, tendLamp, takeOil, callStart, callStep, wake, spawnFoe, foes, setKept, lampSet,
    buildGallery, buildOrchard, buildAllHere: freshMaps, showTally, tableHtml, recordWin, resetTally, loadTally, saveTally, centsAt, flowTo, steer, litNear, sheltered, inNook, onUse, keeperQuest,
    drawHUD17, registerExtra, snapshot, restore, freshRun, installCatalog, ensureCoats, hourStart, layersTick, syncVisuals, F, bandNow,
    setRun(r) { R = r; },
  };
})();
if (typeof window !== 'undefined') window.LONGNIGHT17 = LONGNIGHT17;
