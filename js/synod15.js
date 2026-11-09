// ============================================================
//  synod15 — Phase 15 (the province moves), team SYNOD.
//
//  Three things, three switches (Options -> Graphics & access, saved under octave.synod15.v1, all default On; Off =
//  the game exactly as before: no person, no prop, no line, no wrapped behaviour that does anything):
//   1. SERMONS ("Synod sermons"). Before the Greening the Chapel of the Carillon holds a sermon three times a week,
//      on weekdays that fit the Vol VII Rota [PROPOSED]: Dawnday at first light (the Church kept the hour), Stasisday at
//      dusk (the hour is named once) and Memoryday in the evening (the names: "the dead are being echoed"). While one is
//      on, a deacon [PROPOSED] stands at the front and six townsfolk fill the nave. Attend it (sit on the free place,
//      ~40 s, or a one-click summary under Reduce motion): a little standing with the Church, the borrowed-robes
//      inspection clock runs slower for the rest of the day. Disrupt it (sing, make a noise, throw anything, strike
//      someone): the congregation files out, it is a witnessed crime (reportCrime, js/game.js law), the Hedge thinks
//      better of you and the Church worse. Sermons never touch the main quest. They end with the Greening: Whisper-Grove
//      has no congregation (the Synod does not go there: FESTIVALS_CANON, the Drowned Lanterns), so they simply stop and
//      the logbook says so once.
//   2. THE SYNOD ON THE MAP ("Synod on the map"). The world map (js/travel.js) gets a pale hatched wash that grows with the
//      story: before kaelen_met, kaelen_met, the Rite (rite_ready or rite_started), the Greening. A legend line says what
//      the wash is. Purely informational: no travel restriction of any kind is added.
//   3. ECLIPSES ("Eclipses"). Rare, deterministic, canon-safe [PROPOSED]: a new-moon Dawnday (calendar11's moon: day % 8 ==
//      5) is an eclipse day when a hash of G.day says so (2 in 5, so 18 a canonical year, one day in twenty), never on a
//      feast, a festival or a story day, never during the Rite or the escape timer. For ~90 s of game time around noon the
//      moon crosses the sun: the engine's weather light darkens slowly (Engine.setWeather dark: the same path as a storm),
//      the birds go quiet, hounds come x1.25 as often, townsfolk have a line, the logbook an almanac line.
//
//  BALANCE (all numbers in B below; the report repeats them):
//    sermon  sit 40 s, 5 lines | Church standing +3 for each of the first three sermons sat | cover eased by 1 of 3 and
//            the inspection clock x0.75 for the rest of that day
//    disrupt witnessed: +20 Oakhaven bounty (a crime like a theft), Hedge +3 (first three, not for a blow), Church -3;
//            loud = G.noise >= 5.5 for 0.6 s, any Song but the murmur, any throw, any blow
//    map     4 stages x 3 views; hatch wash alpha .26, 2.5 s growth when a stage is first seen
//    eclipse day%8==5 and hash<2/5; window 90 s around noon (+-29 min jitter); ramps 22 % each end; dark +0.55 of
//            the engine's 0.6 cap (+0.40 under No flashes or Reduce motion, and half the fade speed); hounds x1.25
//
//  Saved state: G.flags p15s_ only, small validated integers (FLAGS). Everything else (the people, the wash, the sky)
//  is derived from the day, the hour and the story flags, or is transient. Hostile p15s_ flags are clamped or dropped.
//  Wrapped (never edited): loadMap, restoreGame, update, talk, useDeco, throwDistraction, castSong, assaultCivilian,
//  tickDisguise, spawnHound, renderLog, showEvent (the Gazette), renderAccessibilityMenu, travelDraw, travelRender,
//  MOTION10.travel.go, Engine.setWeather, Audio_.sfx.bird. Every invented fact is marked [PROPOSED].
// ============================================================
'use strict';

const SYNOD15 = (function () {
  const KEY = 'octave.synod15.v1';
  const cfg = { sermons: true, wash: true, eclipse: true };
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of Object.keys(cfg)) if (typeof o[k] === 'boolean') cfg[k] = o[k];
    } catch (e) { /* storage blocked: the defaults stand */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }
  if (typeof GFX !== 'undefined') {
    if (GFX.eclipseSky === undefined) GFX.eclipseSky = true;                     // the dimming and the corona (visual: Original turns them off)
    if (GFX.FX && !GFX.FX.includes('eclipseSky')) GFX.FX.push('eclipseSky');
  }

  // ---------------------------------------------------------------- balance and schedule, one table
  const B = {
    // sermons: weekday index in js/data.js DAYS (0 Nullday .. 7 Memoryday); from/to are fractions of the day
    SLOTS: [
      { key: 'dawn', wd: 5, from: 6.5 / 24, to: 9 / 24 },          // Dawnday 06:30-09:00, first light [PROPOSED]
      { key: 'dial', wd: 4, from: 17.5 / 24, to: 19.5 / 24 },      // Stasisday 17:30-19:30, the hour named once [PROPOSED]
      { key: 'names', wd: 7, from: 18 / 24, to: 20.5 / 24 },       // Memoryday 18:00-20:30, the names [PROPOSED]
    ],
    SIT_SECS: 40, SIT_LINES: 5,
    REP_SYNOD: 3, REP_N: 3,            // standing with the Church per sermon sat, for the first REP_N of them
    COVER_EASE: 1, GRACE: 0.75,        // cover suspicion (of 3) eased on sitting; the inspection clock's speed for the rest of that day
    DIS_CRIME: 20, DIS_HEDGE: 3, DIS_HEDGE_N: 3, DIS_SYNOD: -3,
    NOISE_LOUD: 5.5, NOISE_HOLD: 0.6,  // G.noise (0-10; a run is ~4.2, the hound mark 7) held this long is a disturbance
    SCATTER_SECS: 3, SEAT_REACH: 3.2, WITNESS_RANGE: 12,
    // eclipses
    ECL_MOD: 8, ECL_NEW: 5,            // calendar11's new moon: moonIndex (day+3)%8 == 0  <=>  day % 8 == 5 (a Dawnday)
    ECL_NUM: 2, ECL_DEN: 5, ECL_SALT: 'k',
    ECL_SECS: 90, ECL_JITTER: 0.04, ECL_RAMP: 0.22,
    ECL_DIM: 0.55, ECL_DIM_SOFT: 0.4, ECL_FADE: 1 / 6, ECL_FADE_SOFT: 1 / 12,
    ECL_SPAWN: 1.25,
    ECL_EXCLUDE: [0, 2, 3, 4, 6, 10], // the arrival, the Last Sheaf (2-4), the Eel-Run (6), the Rite (10): js/festivals12.js B
    // the map
    WASH_ALPHA: 0.26, WASH_RIM: 0.85, WASH_ANIM: 2.5,
  };

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      sermons: { label: S('Synod sermons'), hint: S('Sermons at the Chapel of the Carillon before the Greening: sit one out for a little standing with the Church, or disturb one and lose it. Off: no sermons.') },
      map: { label: S('Synod on the map'), hint: S('A shaded wash on the world map shows the Synod\'s reach growing as the story goes. Information only. Off: the map as before.') },
      eclipse: { label: S('Eclipses'), hint: S('Rare dark noons: the sky dims slowly, the birds go quiet and the hounds come bolder. Off: none.') },
    },
    preacher: {
      name: S('Deacon of the Pure Note'),                                                             // [PROPOSED] unnamed
      polite: S('Peace, under the Note. Sit, if there is a place. We begin when the last of us has stopped talking.'),
      normal: S('The Note is held. There is a place at the end of the bench, if you want it.'),
      blunt: S('Lower your voice. This is a listening, and you are in the middle of it.'),
      church: S('We are not here to frighten anyone. A frightened town sings out of tune, and a held town sings one note, and the quiet has nothing to take.'),
      rite: S('Hearthday. Attendance is a courtesy. I would come. It will be a long note.'),
      after: S('I will not preach to an empty room. Go in peace, if you can.'),
    },
    seat: {
      label: S('A free place at the end of the bench. Sit.'),
      far: S('The place is too far. Step closer to the bench.'),
      already: S('You have heard this one through. Nobody expects you to sit it twice.'),
      empty: S('The benches are empty. There is nobody left to sit with.'),
    },
    ui: {
      title: S('The sermon'),
      who: S('The deacon of the Pure Note speaks from the front of the nave.'),
      keys: S('Escape or B: rise and go'),
      keysDone: S('Enter or A: rise'),
      keysSkip: S('Enter or A: stay to the end · Escape or B: rise and go'),
      stay: S('Stay to the end'),
      leave: S('Rise and go'),
      rise: S('Rise'),
      sumHead: S('In short'),
    },
    sermons: {
      dawn: {
        title: S('First light'),
        lines: [
          S('Friends. We are met at first light, as the Church has always met, because it is the one hour that never needed asking for.'),
          S('There were a thousand bells once, and a thousand ears, and each ear heard a different morning. Now there is one Note. One Note, one town, held. Hold it and you are held.'),
          S('You have felt the quiet at the edge of the wood. Do not call it a hunger. A quiet is only a note that has not been asked to sound. We mean to ask it. All of us, together.'),
          S('The dead are being echoed. Every name that went silent in the Reach is a note some mouth is still holding, and it is not yet ours. Sing in unison and they are carried. Sing alone and you drop them.'),
          S('Go gently, and in tune. Say nothing under the Note. That is not a rule. It is how a held thing is held.'),
        ],
        summary: S('The deacon preaches the Pure Note: one note, one town, held together at first light. The quiet is only a note not yet asked to sound, and the dead are being echoed, he says, so long as nobody sings alone.'),
        close: S('The congregation answers in one breath: Held. You are a half-beat late. Nobody turns round.'),
      },
      dial: {
        title: S('The hour'),
        lines: [
          S('It is the hour. It has been the hour since the dial was wound this morning, and it will be the hour once more before the dark. The Church does not tell the time. It keeps it.'),
          S('A moment kept is a moment that cannot be lost. A hymn in unison is a moment kept by every throat at once. That is all the Church has ever claimed to do.'),
          S('Some ask why we count. We count because somebody must. There was a year when nobody was counting, and you know what the count came to after.'),
          S('The dead are being echoed. They are not gone. They are late, and the Note will wait for them as long as it takes. It is patient. We are asked only to be patient with it.'),
          S('Name the hour once, softly, and do not say it again after. The rest belongs to the Note.'),
        ],
        summary: S('The deacon speaks of the hour: a moment kept by every throat at once is a moment that cannot be lost. The dead are not gone, he says. They are late, and the Note will wait for them.'),
        close: S('Somewhere outside, one hand winds the dial. The deacon says the hour once, softly, and the whole nave lets it lie.'),
      },
      names: {
        title: S('The names'),
        lines: [
          S('Memoryday. You came to hear about the names. The Church has them. All of them, in one book, in one hand, kept dry.'),
          S('Some of you say a name at the Hedge on this day and tell no one whose. We do not forbid it. We ask only that you say it in the Note\'s key, so that it is carried and not scattered.'),
          S('The dead are being echoed. Since the Grove went quiet the Echo no longer catches them of its own accord. So the Church catches them. To be caught is not a loss. It is a kindness with a long reach.'),
          S('Whoever you are keeping in your mouth this evening, keep them a little longer. Unison is coming. We will take the weight from you.'),
          S('Go home. Say no names in the street. The Note has them.'),
        ],
        summary: S('The deacon says the Church keeps every name in one book. The dead are being echoed, he says; since the Grove went quiet the Church has caught them, and soon it will take the weight of them from anyone still carrying one.'),
        close: S('Nobody in the nave says a name. You can feel a good many of them being held, one behind every closed mouth.'),
      },
    },
    att: {
      done: S('You sit it out to the last word. Nobody looks at you, which is the only kindness the Church does well. A woman two places along shifts her skirts to make room.'),
      rep: S('Your standing with the Church rises a little.'),
      capped: S('They know your face by now. Nobody is any warmer for it.'),
      cover: S('For the rest of the day the borrowed robes will pass a little easier.'),
      early: S('You rise before the end and slip out. Nobody follows you with their eyes, which is how you know they saw.'),
      journal: S('I sat out a sermon at the Chapel of the Carillon, on the end of a bench, hands in my lap. The deacon says the dead are being echoed. Nobody sang alone. I kept my mouth shut and counted the exits.'),
    },
    dis: {
      sung: S('You sing in the nave. The deacon stops mid-word. Nobody cries out. The congregation stands, all together, and files out with its eyes on the floor.'),
      noise: S('The noise you are making goes on a breath too long. The deacon stops. Nobody cries out. The congregation stands and files out, and the nave is suddenly very large.'),
      thrown: S('What you threw rings on the flags. The deacon stops mid-word. Nobody cries out. The congregation stands as one and files out, eyes down.'),
      jar: S('The jar breaks and the room goes dead, as if a hand had closed on it. The deacon opens his mouth and nothing comes out, and he stops trying. The congregation files out without a sound.'),
      struck: S('They recoil from the blow. The deacon stops. Nobody cries out; the rest of the congregation stands and goes, close together, and does not look at you.'),
      unseen: S('It is done, and nobody was looking at you when it was. The congregation goes anyway.'),
      standing: S('Word will get round the Hedge, and some of it will be kind. The Church will not be.'),
      crime: S('a disturbed sermon'),
      cover: S('You disturb a sermon in Synod robes.'),
    },
    cong: [
      S('Hush. He is about to begin.'),
      S('Sit if you are sitting. Do not hum.'),
      S('I come for the warmth. And for the count at the door.'),
      S('He never shouts. That is what I cannot get used to.'),
    ],
    bell: {
      dawn: S('The Chapel door stands open at first light. Inside, a congregation is settling, and the deacon is waiting for the last of them to stop talking.'),
      dial: S('The Chapel door stands open at dusk. The deacon will name the hour inside, once, and the whole nave will let it lie.'),
      names: S('The Chapel door stands open this evening. It is Memoryday. The Church is going to tell the district what it does with the names.'),
      chapel: S('A congregation fills the benches and a deacon waits at the front. At the end of one bench there is a free place.'),
      over: S('The sermon is over. The benches empty without a word, and the nave is only a cold room again.'),
    },
    folk: [
      S('The Chapel keeps a sermon today. I go for the warmth, and so as to be seen going.'),
      S('Sit at the back, say nothing, leave before the last word. That is how everyone does it.'),
      S('They say the dead are being echoed. I would like it to be true. That is the trouble with the Church.'),
    ],
    end: { journal: S('Oakhaven is up in the crowns, and the Chapel with it. If the deacon is still preaching, it is to the leaves.') },
    gaz: S('The Chapel of the Carillon will receive the district for the Pure Note on Dawnday, Stasisday and Memoryday. Attendance is a courtesy. Disturbances of worship are an administrative matter.'),
    alm: {
      sched: S('The Chapel of the Carillon keeps a sermon on Dawnday at first light, on Stasisday at dusk and on Memoryday in the evening. Sitting one out is quiet. Disturbing one is noted.'),
      dawn: S('Today the Chapel keeps its sermon at first light.'),
      dial: S('Today the Chapel keeps its sermon at dusk, when the hour is named.'),
      names: S('Today the Chapel keeps its sermon in the evening, on the names.'),
    },
    wash: [
      S('Synod reach: the quarry roads and the eastern marches.'),
      S('Synod reach: the roads to the Hedge are Church-walked.'),
      S('Synod reach: the Note is held over Oakhaven.'),
      S('Synod reach: Oakhaven is struck from the roll, and the wash moves on.'),
    ],
    ecl: {
      entry: S('The light at noon is going thin and cold, as though the day had been asked to hold its breath. Something has taken a bite out of the sun.'),
      mid: S('The sun is a black coin with a pale ring round it. Noon is the colour of dusk. Nothing is singing.'),
      end: S('The light comes back the way water comes back into a footprint.'),
      folk: [
        S('Look at the ground, not the sun. See how the light goes thin under the oak and makes crescents? The Church says it is weather. The Church would.'),
        S('My gran called it the dark noon. She said the Hush keeps closest then, and the dogs know it first. Stay where there are lamps.'),
        S('The birds just stopped. All of them, in one breath. I do not like how clean it was.'),
        S('It is the moon in front of the sun, that is all. That is all. Say it again to yourself, quietly.'),
        S('Keep your voice low. A dark noon is a long quiet, and the Hush keeps whatever quiet is left lying about.'),
      ],
      journal: S('At noon the moon crossed the sun, and the day went to dusk for a minute and a half. The birds stopped. Somebody in the street said it was only weather, and did not look up.'),
      almBefore: S('A dark noon is marked for today: the moon will cross the sun about midday. Hunters say the Hush keeps closer while it lasts, and the hounds come bolder. The almanac does not say why.'),
      almAfter: S('The moon crossed the sun at noon today. The birds went quiet and the hounds were bolder for a little while.'),
    },
  };

  // ---------------------------------------------------------------- small helpers
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const flags = () => (hasG() && !Array.isArray(G.flags) ? G.flags : {});
  const dayNow = () => { const d = hasG() ? Number(G.day) : 0; return Number.isFinite(d) ? clamp(Math.floor(d), 0, 99999) : 0; };
  const todNow = () => { const t = hasG() ? Number(G.tod) : 0; return Number.isFinite(t) ? ((t % 1) + 1) % 1 : 0; };
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
  const reduced = () => !!(typeof GFX !== 'undefined' && GFX && (GFX.reduceMotion || GFX.reducedMotion));
  const noFlash = () => !!(typeof GFX !== 'undefined' && GFX && GFX.noFlash);
  const gentle = () => reduced() || noFlash();
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const warnOnce = (k, e) => { if (!state.warned) { state.warned = true; console.warn('synod15: ' + k + ' failed', e); } };

  // ---------------------------------------------------------------- flags: small validated integers
  const FLAGS = { p15s_att: [0, 99], p15s_dis: [0, 99], p15s_last: [0, 400000], p15s_lk: [0, 2], p15s_ecl: [0, 1], p15s_end: [0, 1] };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : r[0];
  }
  function fset(k, v) { const r = FLAGS[k]; try { if (hasG()) G.flags[k] = clamp(Math.floor(v), r[0], r[1]); } catch (e) { /* a save that cannot hold flags */ } }
  // a loaded save is untrusted: every known flag is clamped back to an integer in range, every other p15s_ key is dropped
  function sanitizeFlags() {
    if (!hasG()) return;
    const f = G.flags;
    for (const k of Object.keys(f)) {
      if (k.indexOf('p15s_') !== 0) continue;
      if (!own(FLAGS, k)) { delete f[k]; continue; }
      const r = FLAGS[k], v = f[k];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) { if (v === true && r[1] === 1) f[k] = 1; else delete f[k]; }
    }
  }

  // ---------------------------------------------------------------- the calendar (Vol VII; the same arithmetic as js/calendar11.js)
  const gone = (f) => !!(f && (f.greening || f.escaped || f.part3));
  const riteOn = (f, d) => !!(f && !gone(f) && (f.rite_started || (f.rite_ready && d >= 10)));
  const wdOf = (d) => ((d % 8) + 8) % 8;                         // js/data.js DAYS index: 0 Nullday, 4 Stasisday, 5 Dawnday, 7 Memoryday
  // [month, weekday index] of the Eight Feasts' first-weekday rule, and the Maw (30 Longsun): none falls in Harvestmonth
  const FEASTS = { 1: 2, 2: 4, 3: 1, 6: 5, 7: 6, 9: 3, 11: 7 };
  function dateOf(d) {
    const doy = ((276 + Math.max(0, d | 0) - 1) % 360) + 1;         // G.day 0 = the sixth of Harvestmonth: day of the year 276
    return { month: Math.floor((doy - 1) / 30) + 1, dom: ((doy - 1) % 30) + 1, wd: wdOf(d) };
  }
  function isFeast(d) { const t = dateOf(d); return (own(FEASTS, t.month) && FEASTS[t.month] === t.wd && t.dom <= 7) || (t.month === 6 && t.dom === 30); }

  // ================================================================ 1. SERMONS
  // which sermon is on right now (0 dawn, 1 dial, 2 names), or -1
  function sermonAt(d, tod, f) {
    if (!cfg.sermons) return -1;
    f = f || flags();
    if (gone(f) || riteOn(f, d)) return -1;
    const w = wdOf(d);
    for (let i = 0; i < B.SLOTS.length; i++) { const s = B.SLOTS[i]; if (s.wd === w && tod >= s.from && tod < s.to) return i; }
    return -1;
  }
  const sermonDay = (d) => B.SLOTS.findIndex((s) => s.wd === wdOf(d));          // the slot that falls on this day, or -1
  const sid = (d, slot) => d * 3 + slot + 1;                                     // the sermon's number; 0 is "none yet"
  const sermonNow = () => (hasG() ? sermonAt(dayNow(), todNow(), flags()) : -1);
  function status() {
    const slot = sermonNow(), id = slot >= 0 ? sid(dayNow(), slot) : 0, last = fint('p15s_last'), lk = fint('p15s_lk');
    return { live: slot >= 0, slot, id, attended: id > 0 && last === id && lk === 1, disrupted: id > 0 && last === id && lk === 2 };
  }
  // the pew-warm grace: this day's sat sermon, while the day lasts
  function graceActive() { const last = fint('p15s_last'); return cfg.sermons && fint('p15s_lk') === 1 && last > 0 && Math.floor((last - 1) / 3) === dayNow() && !gone(flags()); }

  // ---- the people and the one free place (transient: rebuilt from the clock and the flags, never saved)
  const CHAPEL = { w: 13, h: 13 };
  const realChapel = (m) => !!m && m.id === 'chapel' && m.w === CHAPEL.w && m.h === CHAPEL.h && Array.isArray(m.entities);
  const PREACHER_AT = [5.0, 3.4], SEAT_AT = [5.3, 9.9], DOOR_AT = [6.5, 11.2];
  const CONG = [[4.5, 4.8, 'townsman'], [4.5, 6.6, 'townswoman'], [4.5, 8.6, 'townsman'], [8.5, 4.8, 'townswoman'], [8.5, 6.6, 'townsman'], [8.5, 8.6, 'townswoman']];   // [PROPOSED] who is in the nave
  const ent = (o) => Object.assign({ kind: 'deco', solid: false, radius: 0.1, nopick: true, transient: true, _decor: true }, o);
  function nearFree(m, x, y, r) {
    r = r || 0.4;
    const free = (px, py) => !m.isBlocked(px | 0, py | 0);
    if (free(x, y) && free(x - r, y) && free(x + r, y)) return [x, y];
    for (let k = 1; k <= 8; k++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * Math.PI / 4) * k * 0.4, py = y + Math.sin(a * Math.PI / 4) * k * 0.4; if (free(px, py) && free(px - r, py) && free(px + r, py)) return [px, py]; }
    return null;
  }
  const NPC_DEFS = {
    p15s_preacher: {
      name: TX.preacher.name, sprite: 'flambeau', portrait: 'flambeau', tier: 'low',
      greet: { polite: TX.preacher.polite, normal: TX.preacher.normal, blunt: TX.preacher.blunt },
      topics: { 'The Church': TX.preacher.church, 'The Rite': TX.preacher.rite }, quest: () => null,
    },
  };
  if (typeof NPCS !== 'undefined') for (const id in NPC_DEFS) if (!NPCS[id]) NPCS[id] = NPC_DEFS[id];

  function chapelSpecs() {
    const L = [], add = (key, when, make) => L.push({ key, when, make });
    const live = () => status().live, show = () => { const s = status(); return s.live && (!s.disrupted || !!state.scatter); };   // a ruined sermon's people stay until they have walked out
    add('preacher', live, () => ent({ kind: 'npc', id: 'p15s_preacher', sprite: 'flambeau', x: PREACHER_AT[0], y: PREACHER_AT[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI / 2, _still: true }));
    CONG.forEach((c, i) => add('cong' + i, show, () => ent({ kind: 'npc', id: c[2], sprite: c[2], x: c[0], y: c[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: -Math.PI / 2, _still: true, _cong: i })));
    add('seat', () => { const s = status(); return s.live && !s.disrupted && !s.attended; }, () => ent({ sprite: 'chair', x: SEAT_AT[0], y: SEAT_AT[1], scale: 0.6, solid: false, radius: 0.3, nopick: false, use: 'p15s_seat', label: TX.seat.label }));
    return L;
  }
  let SPECS = null;
  function removeAll(m) { for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p15s) m.entities.splice(i, 1); } }
  function ensureChapel(m) {
    if (!m || !realChapel(m)) return;
    if (!cfg.sermons) { removeAll(m); return; }
    if (!SPECS) SPECS = chapelSpecs();
    for (const sp of SPECS) {
      let want = false; try { want = !!sp.when(); } catch (e) { want = false; }
      const have = m.entities.find((e) => e && e._p15s === sp.key);
      if (!want) { if (have) m.entities.splice(m.entities.indexOf(have), 1); continue; }
      if (have) continue;
      const o = sp.make();
      const at = nearFree(m, o.x, o.y, o.radius || 0.4); if (!at) continue; o.x = at[0]; o.y = at[1];
      const e = Object.assign(o, { _p15s: sp.key });
      // no hydrate(): it draws from Math.random, and the shared stream must stay as it was
      if (e.kind === 'npc') { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 1e9; e.dir = e.facing != null ? e.facing : 0; }
      m.entities.push(e);
    }
  }
  const syncChapel = () => { try { if (hasG() && G.maps && G.maps.chapel) ensureChapel(G.maps.chapel); } catch (e) { warnOnce('chapel', e); } };
  const audience = () => (hasG() && G.ents ? G.ents.filter((e) => e && e.kind === 'npc' && !e.dead && !e.hidden && !e.companion && (e._p15s || G.mapId === 'chapel')) : []);
  const congregants = () => (hasG() && G.ents ? G.ents.filter((e) => e && e._cong != null && !e.hidden) : []);

  // ---- attending
  const ui = { open: false, t: 0, shown: 0, done: false, slot: -1, token: 0, timer: 0 };
  const stats = { attended: 0, disrupted: 0, scatters: 0, errors: 0, extraHounds: 0, hushed: 0, crowsHeld: 0 };
  const state = { warned: false, said: {}, accT: 0, loudT: 0, scatter: null, k: 0, spawnN: 0, eclDay: -1, eclStage: 0, wasActive: false, hadSermon: false };
  const rep = (fac, n) => { try { if (typeof changeRep === 'function') changeRep(fac, n); } catch (e) { /* standing is a bonus */ } };
  const padNow = () => { try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ } return null; };

  function attendDone() {
    const st = status(); if (!st.live) return false;
    const n = fint('p15s_att');
    fset('p15s_att', n + 1); fset('p15s_last', st.id); fset('p15s_lk', 1);
    stats.attended++;
    say(TX.att.done, 'good', 8000);
    if (n < B.REP_N) { rep('synod', B.REP_SYNOD); say(TX.att.rep, 'good', 5000); } else say(TX.att.capped, '', 5000);
    try { G.coverSuspicion = Math.max(0, (Number(G.coverSuspicion) || 0) - B.COVER_EASE); } catch (e) { /* cosmetic */ }
    say(TX.att.cover, '', 5000);
    if (n === 0) { try { journal('side', TX.att.journal); } catch (e) { /* the log is a bonus */ } }
    syncChapel();
    return true;
  }
  function seatEnt() { return hasG() && G.map ? G.map.entities.find((e) => e && e._p15s === 'seat') : null; }
  function openSermon() {
    if (ui.open || !hasG() || !G.player || G.state !== 'play') return null;
    const st = status();
    if (!st.live || G.mapId !== 'chapel') return null;
    if (st.disrupted) { say(TX.seat.empty, '', 4000); return null; }
    if (st.attended) { say(TX.seat.already, '', 4000); return null; }
    const seat = seatEnt(), c = Engine.cam;
    if (!seat || Math.hypot(seat.x - c.x, seat.y - c.y) > B.SEAT_REACH) { say(TX.seat.far, '', 3000); return null; }
    const T = TX.sermons[B.SLOTS[st.slot].key];
    Object.assign(ui, { open: true, t: 0, shown: reduced() ? B.SIT_LINES : 1, done: false, slot: st.slot });
    G.state = 'panel'; G.touch && (G.touch.fx = G.touch.fy = 0);
    openModal(`<h2></h2><div class="s15"><p class="s15-who" id="s15-who"></p><div class="s15-lines" id="s15-lines" role="log" aria-live="polite"></div>
      <div class="s15-meter" aria-hidden="true"><div class="s15-bar" id="s15-bar"></div></div><p class="s15-sum muted" id="s15-sum"></p>
      <div class="btns"><button class="dfbtn small" id="s15-go" type="button"></button><button class="dfbtn small" id="s15-leave" type="button"></button></div><p class="muted s15-keys" id="s15-keys"></p></div>`, 'p15s_sermon');
    ui.token = G.panelToken;
    const q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = TX.ui.title + ': ' + T.title;
    q('s15-who').textContent = TX.ui.who; q('s15-keys').textContent = reduced() ? TX.ui.keysSkip : TX.ui.keys; q('s15-leave').textContent = TX.ui.leave;
    q('s15-go').textContent = TX.ui.stay;
    if (reduced()) { q('s15-sum').textContent = TX.ui.sumHead + ': ' + T.summary; q('s15-bar').parentNode.hidden = true; }
    else { q('s15-go').hidden = true; q('s15-sum').hidden = true; }
    const lines = q('s15-lines');
    if (!reduced()) renderLines(lines, T); else { lines.hidden = true; }
    q('s15-leave').onclick = () => leaveSermon();
    q('s15-go').onclick = () => { if (ui.done) closeSermon(); else finishSermon(); };
    let last = performance.now(); const prev = {}; let seeded = false;
    ui.keyHandler = (ev) => {
      const k = String(ev.key || '').toLowerCase();
      if (!['enter', ' ', 'escape'].includes(k)) return;
      ev.stopImmediatePropagation(); ev.preventDefault(); if (ev.repeat) return;
      if (k === 'escape') leaveSermon();
      else if (ui.done || reduced()) q('s15-go').click();
    };
    window.addEventListener('keydown', ui.keyHandler, true);
    ui.timer = setInterval(() => {
      if (G.panelToken !== ui.token || G.openPanel !== 'p15s_sermon') { teardown(); return; }
      const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000); last = now;
      if (!reduced() && !ui.done) stepSermon(dt);
      const g = padNow();
      if (g) {
        const edge = (i) => { const on = !!(g.buttons[i] && g.buttons[i].pressed), was = !!prev[i]; prev[i] = on; return on && !was; };
        if (!seeded) { seeded = true; for (const i of [0, 1, 8]) edge(i); return; }                // a button held from opening the place is not a press
        if (edge(0) && (ui.done || reduced())) q('s15-go').click();
        if (edge(1) || edge(8)) leaveSermon();
      }
    }, 100);
    return ui;
  }
  function renderLines(box, T) {
    while (box.firstChild) box.removeChild(box.firstChild);
    for (let i = 0; i < ui.shown && i < T.lines.length; i++) box.appendChild(el('p', { class: 's15-line' }, T.lines[i]));      // our own constant text, textContent
    if (ui.done) box.appendChild(el('p', { class: 's15-line s15-close' }, T.close));
  }
  // the sit, driven by a clock the caller advances: tests run it with no waiting
  function stepSermon(dt) {
    if (!ui.open || ui.done) return;
    ui.t = Math.min(B.SIT_SECS, ui.t + dt);
    const per = B.SIT_SECS / B.SIT_LINES, shown = clamp(Math.floor(ui.t / per) + 1, 1, B.SIT_LINES);
    const bar = document.getElementById('s15-bar'); if (bar) bar.style.width = (ui.t / B.SIT_SECS * 100).toFixed(1) + '%';
    if (shown !== ui.shown) { ui.shown = shown; const box = document.getElementById('s15-lines'); if (box) renderLines(box, TX.sermons[B.SLOTS[ui.slot].key]); }
    if (ui.t >= B.SIT_SECS) finishSermon();
  }
  function finishSermon() {
    if (!ui.open || ui.done) return false;
    ui.done = true; ui.t = B.SIT_SECS; ui.shown = B.SIT_LINES;
    const T = TX.sermons[B.SLOTS[ui.slot].key], q = (id) => document.getElementById(id);
    const box = q('s15-lines'); if (box) { box.hidden = false; renderLines(box, T); }
    const bar = q('s15-bar'); if (bar) bar.style.width = '100%';
    const go = q('s15-go'); if (go) { go.hidden = false; go.textContent = TX.ui.rise; }
    const ks = q('s15-keys'); if (ks) ks.textContent = TX.ui.keysDone;
    const sum = q('s15-sum'); if (sum) sum.hidden = true;
    const lv = q('s15-leave'); if (lv) lv.hidden = true;
    attendDone();
    return true;
  }
  function teardown() { clearInterval(ui.timer); ui.timer = 0; if (ui.keyHandler) window.removeEventListener('keydown', ui.keyHandler, true); ui.keyHandler = null; ui.open = false; }
  function closeSermon() {
    const was = ui.open; teardown();
    if (was && G.panelToken === ui.token && G.openPanel === 'p15s_sermon') closeModal();
    if (was && G.state === 'panel' && !G.openPanel) { G.state = 'play'; G.keys = {}; }
  }
  function leaveSermon() {
    if (!ui.open) return;
    const early = !ui.done; closeSermon();
    if (early) say(TX.att.early, '', 4500);
  }

  // ---- disrupting
  function startScatter() {
    stats.scatters++;
    if (reduced()) { syncChapel(); return; }
    state.scatter = { t: 0 };
  }
  function tickScatter(dt) {
    const s = state.scatter; if (!s) return;
    s.t += dt;
    const list = congregants();
    for (const e of list) {
      const dx = DOOR_AT[0] - e.x, dy = DOOR_AT[1] - e.y, d = Math.hypot(dx, dy);
      if (d > 0.5) { const sp = Math.min(d, 3.1 * dt); e.x += dx / d * sp; e.y += dy / d * sp; e.dir = e.facing = Math.atan2(dy, dx); }
    }
    if (s.t >= B.SCATTER_SECS) { state.scatter = null; syncChapel(); }
  }
  function disrupt(kind, o) {
    o = o || {};
    if (!hasG() || !G.player || G.mapId !== 'chapel') return false;
    const st = status(); if (!st.live || st.disrupted) return false;
    if (ui.open) closeSermon();
    const c = Engine.cam, seen = audience().some((e) => (e.x - c.x) * (e.x - c.x) + (e.y - c.y) * (e.y - c.y) < B.WITNESS_RANGE * B.WITNESS_RANGE && (typeof los !== 'function' || los(e.x, e.y, c.x, c.y)));
    const n = fint('p15s_dis');
    fset('p15s_dis', n + 1); fset('p15s_last', st.id); fset('p15s_lk', 2);
    stats.disrupted++;
    say(TX.dis[kind] || TX.dis.thrown, 'warn', 8000);
    if (seen) {
      if (o.crime !== false) { try { if (typeof lawActive === 'function' && lawActive() && typeof reportCrime === 'function') reportCrime(TX.dis.crime, B.DIS_CRIME); } catch (e) { warnOnce('crime', e); } }
      if (!o.violent && n < B.DIS_HEDGE_N) rep('hedge', B.DIS_HEDGE);
      rep('synod', B.DIS_SYNOD);
      say(TX.dis.standing, '', 5000);
      try { if (typeof wearingDisguise === 'function' && wearingDisguise()) exposeDisguise(TX.dis.cover, true); } catch (e) { warnOnce('cover', e); }
    } else say(TX.dis.unseen, '', 4000);
    startScatter();
    syncChapel();
    return true;
  }
  const inChapelLive = () => hasG() && G.mapId === 'chapel' && cfg.sermons && sermonNow() >= 0 && !!seatOrPreacher();
  const seatOrPreacher = () => (G.map && G.map.entities ? G.map.entities.some((e) => e && e._p15s) : false);
  function tickSermon(dt) {
    if (!hasG() || !G.player || !G.map) return;
    if (!cfg.sermons) { if (state.hadSermon) { state.hadSermon = false; try { for (const id in (G.maps || {})) removeAll(G.maps[id]); } catch (e) { /* ignore */ } } return; }
    state.hadSermon = true;
    state.accT += dt;
    if (state.accT >= 0.5) {
      state.accT = 0;
      const was = state.sermonLive; const now = sermonNow() >= 0;
      if (G.mapId === 'chapel') {
        if (!now && seatOrPreacher() && was && !state.said['over' + dayNow()]) { state.said['over' + dayNow()] = true; say(TX.bell.over, '', 6000); }
        syncChapel();
      }
      state.sermonLive = now;
      tickClosure();
    }
    tickScatter(dt);
    if (G.state !== 'play') return;
    if (inChapelLive() && !status().disrupted) {
      if (G.noise >= B.NOISE_LOUD) { state.loudT += dt; if (state.loudT >= B.NOISE_HOLD) { state.loudT = 0; disrupt('noise'); } } else state.loudT = Math.max(0, state.loudT - dt);
    } else state.loudT = 0;
  }
  // the Greening ends the sermons; once, and only for a player who ever met one, the logbook says so
  function tickClosure() {
    if (!gone(flags()) || fint('p15s_end')) return;
    if (fint('p15s_att') + fint('p15s_dis') > 0) { fset('p15s_end', 1); try { journal('side', TX.end.journal); } catch (e) { /* bonus */ } }
  }

  // ---- entry lines, townsfolk, the Gazette, the almanac
  function sayEntry(mapId) {
    if (!hasG() || typeof msg !== 'function') return;
    const out = [], d = dayNow(), st = status();
    if (cfg.sermons && st.live && !st.disrupted) {
      if (mapId === 'oakhaven') out.push([TX.bell[B.SLOTS[st.slot].key], 'warn', 'b' + st.id]);
      else if (mapId === 'chapel') out.push([TX.bell.chapel, 'warn', 'c' + st.id]);
    }
    out.forEach(([t, c, k], i) => { if (state.said[k]) return; state.said[k] = true; setTimeout(() => { try { const s2 = status(); if (G.mapId === mapId && s2.live && !s2.disrupted && G.state === 'play') say(t, c, 8000); } catch (e) { /* cosmetic */ } }, 2200 + i * 1000); });
    void d;
  }
  const folkId = (id) => id === 'townsman' || id === 'townswoman';
  function folkLine(e) {
    if (!e || !folkId(e.id) || !hasG()) return null;
    const d = dayNow(), k = hash(d + ':' + Math.round((e.homeX || e.x || 0) * 10) + ':' + Math.round((e.homeY || e.y || 0) * 10));
    if (eclipseActive() && eclipseInWindow() && !e._cong) return TX.ecl.folk[k % TX.ecl.folk.length];
    if (e._cong != null) return TX.cong[(e._cong + d) % TX.cong.length];
    if (cfg.sermons && G.mapId === 'oakhaven' && !gone(flags()) && sermonDay(d) >= 0 && k % 3 === 0) return TX.folk[k % TX.folk.length];
    return null;
  }
  function wireTalk() {
    if (typeof talk !== 'function') return;
    const _talk = talk;
    talk = function (e) {
      const r = _talk.apply(this, arguments);
      try {
        if (G.state === 'dialogue' && DLG && DLG.ent === e && DLG.log) {
          let line = null;
          if (e && e.id === 'p15s_preacher' && status().disrupted) line = TX.preacher.after;
          else line = folkLine(e);
          if (line) {
            // the Rota line (calendar11) and the festival lines (festivals12) are replaced by ours: one remark, not two
            const last = DLG.log[DLG.log.length - 1];
            try { if (last && last.who === 'them') { const cl = typeof CALENDAR11 !== 'undefined' && CALENDAR11.folkLine ? CALENDAR11.folkLine(e) : null; const fl = typeof FESTIVALS12 !== 'undefined' && FESTIVALS12.folkLine ? FESTIVALS12.folkLine(e) : null; if ((cl && last.t === cl) || (fl && last.t === fl)) DLG.log.pop(); } } catch (err) { /* keep both */ }
            DLG.log.push({ who: 'them', t: line }); renderDialogue(DLG.choices ? 'choice' : null);
          }
        }
      } catch (err) { warnOnce('talk', err); }
      return r;
    };
  }
  function wireGazette() {
    if (typeof showEvent !== 'function') return;
    const _show = showEvent;
    showEvent = function (title, html, choices) {
      try {
        if (cfg.sermons && !gone(flags()) && title === 'The Synod Gazette' && typeof html === 'string' && html.indexOf('rm-sheet') >= 0 && html.indexOf('p15s-item') < 0) {
          const i = html.indexOf('<div class="rm-notice">'); const item = '<div class="rm-item p15s-item">' + TX.gaz + '</div>';
          html = i >= 0 ? html.slice(0, i) + item + html.slice(i) : html + item;
        }
      } catch (e) { warnOnce('gazette', e); }
      return _show.call(this, title, html, choices);
    };
  }
  function almanacLines() {
    if (!hasG()) return [];
    const out = [], d = dayNow(), f = flags();
    if (cfg.sermons && !gone(f)) { out.push(TX.alm.sched); const s = sermonDay(d); if (s >= 0 && !riteOn(f, d)) out.push(TX.alm[B.SLOTS[s].key]); }
    if (cfg.eclipse && eclipseDay(d) && !eclipseBlocked()) out.push(eclipseOver(d, todNow()) ? TX.ecl.almAfter : TX.ecl.almBefore);
    if (cfg.wash) out.push(TX.wash[stageOf(f)]);
    return out;
  }
  function addAlmanac() {
    const panel = document.querySelector('#modal-panel'); if (!panel || document.getElementById('p15s-almanac')) return;
    const lines = almanacLines(); if (!lines.length) return;
    const box = el('div', { id: 'p15s-almanac', class: 'p15s-almanac' });
    for (const t of lines) box.appendChild(el('p', { class: 'muted' }, t));
    const after = document.getElementById('p11c-almanac'), head = panel.querySelector('p.muted');
    if (after) after.parentNode.insertBefore(box, after.nextSibling); else if (head) head.parentNode.insertBefore(box, head.nextSibling); else panel.appendChild(box);
  }

  // ---- using things, the hooks that make a disturbance
  function wireSermonHooks() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try { if (e && e.use === 'p15s_seat') { openSermon(); return; } } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof throwDistraction === 'function') {
      const _t = throwDistraction;
      throwDistraction = function (id) {
        const r = _t.apply(this, arguments);
        try { if (r && inChapelLive()) disrupt(id === 'p12_jar' ? 'jar' : 'thrown'); } catch (e) { warnOnce('throw', e); }
        return r;
      };
    }
    if (typeof castSong === 'function') {
      const _cs = castSong;
      castSong = function (id) {
        const was = !!(G.song && G.song.t > 0);
        const r = _cs.apply(this, arguments);
        try { if (id !== 'murmur' && !was && G.song && G.song.t > 0 && inChapelLive()) disrupt('sung'); } catch (e) { warnOnce('song', e); }
        return r;
      };
    }
    if (typeof assaultCivilian === 'function') {
      const _ac = assaultCivilian;
      assaultCivilian = function (e) {
        const r = _ac.apply(this, arguments);
        try { if (e && e._p15s && inChapelLive()) disrupt('struck', { crime: false, violent: true }); } catch (err) { warnOnce('blow', err); }
        return r;
      };
    }
    if (typeof tickDisguise === 'function') {
      const _td = tickDisguise;
      tickDisguise = function (dt) {
        try { if (graceActive() && typeof wearingDisguise === 'function' && wearingDisguise()) dt *= B.GRACE; } catch (e) { /* the clock stays as it was */ }
        return _td.call(this, dt);
      };
    }
  }

  // ================================================================ 2. the Synod on the map
  // the wash is a union of discs (cx, cy, r) in fractions of the painting's width (so a disc is round on the canvas), grown
  // stage by stage; holes are cut where the Synod does not go. Every extent is [PROPOSED].
  const WASH = {
    reach: {                                                 // img/map_reach.jpg, 933 x 1400, the quarry top right, Oakhaven's Hedge low centre
      add: [
        [[0.80, 0.18, 0.20], [1.0, 0.36, 0.22], [1.0, 0.62, 0.20]],
        [[0.90, 0.52, 0.26], [0.78, 0.46, 0.14]],
        [[0.70, 0.62, 0.18], [0.56, 0.44, 0.11], [0.565, 0.64, 0.21]],
        [[0.40, 0.50, 0.30], [0.30, 0.30, 0.26], [0.62, 0.86, 0.24]],
      ],
      holes: [[], [], [], [[0.565, 0.64, 0.21]]],
    },
    woods: {                                                 // img/map_woods.jpg, 1440 x 960; the Synod comes from the east and never into the Grove's water
      add: [
        [[1.06, 0.30, 0.17]],
        [[1.0, 0.42, 0.24], [1.0, 0.76, 0.20]],
        [[0.90, 0.56, 0.20]],
        [[0.78, 0.46, 0.22], [0.70, 0.28, 0.17], [0.80, 0.78, 0.18]],
      ],
      holes: [[[0.28, 0.60, 0.27]], [[0.28, 0.60, 0.27]], [[0.28, 0.60, 0.27]], [[0.28, 0.60, 0.27]]],
    },
    continent: {                                             // img/map_continent.jpg, 1440 x 960; the Organum in the middle, the Reach in the west
      add: [
        [[0.615, 0.45, 0.075], [0.68, 0.40, 0.06], [0.60, 0.55, 0.05]],
        [[0.54, 0.46, 0.07], [0.50, 0.38, 0.05]],
        [[0.40, 0.50, 0.06], [0.33, 0.52, 0.05], [0.255, 0.52, 0.03]],
        [[0.45, 0.50, 0.10], [0.47, 0.58, 0.06]],
      ],
      holes: [[], [], [], [[0.255, 0.52, 0.03], [0.42, 0.55, 0.05]]],
    },
  };
  // the story stage: 0 before kaelen_met, 1 kaelen_met, 2 the Rite (rite_ready or rite_started), 3 the Greening
  function stageOf(f) {
    f = f || flags();
    if (f.greening || f.part3 || f.escaped) return 3;
    if (f.rite_started || f.rite_ready) return 2;
    if (f.kaelen_met) return 1;
    return 0;
  }
  function washBlobs(view, stage) {
    const T = WASH[view]; if (!T) return [];
    let out = []; for (let s = 0; s <= clamp(stage | 0, 0, 3); s++) out = out.concat(T.add[s] || []);
    return out;
  }
  const washHoles = (view, stage) => ((WASH[view] && WASH[view].holes[clamp(stage | 0, 0, 3)]) || []);
  const legendText = (stage) => TX.wash[clamp(stage | 0, 0, 3)];
  // Paint the wash over a copy of the painting. grow in 0..1 scales the discs of the newest stage (the growth when a stage is first seen).
  const layers = {};
  function layer(name, W, H) {
    let c = layers[name];
    if (!c) c = layers[name] = document.createElement('canvas');
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    return c;
  }
  function paintWash(ctx, W, H, view, stage, grow) {
    stage = clamp(stage | 0, 0, 3); grow = grow == null ? 1 : clamp(grow, 0, 1);
    const discs = [];
    for (let s = 0; s <= stage; s++) for (const b of (WASH[view].add[s] || [])) discs.push([b[0] * W, b[1] * H, b[2] * W * (s === stage && stage > 0 ? 0.35 + 0.65 * grow : 1)]);
    const holes = washHoles(view, stage).map((b) => [b[0] * W, b[1] * H, b[2] * W * (stage === 3 ? 0.35 + 0.65 * grow : 1)]);
    if (!discs.length) return;
    const lw = Math.max(2, W / 330);
    // the fill: one opaque union (so overlaps do not stack), hatched, then laid on at low alpha
    const F = layer('fill', W, H), f = F.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, H);
    f.fillStyle = '#dfe6f2'; for (const d of discs) { f.beginPath(); f.arc(d[0], d[1], d[2], 0, Math.PI * 2); f.fill(); }
    f.globalCompositeOperation = 'destination-out'; for (const h of holes) { f.beginPath(); f.arc(h[0], h[1], h[2], 0, Math.PI * 2); f.fill(); }
    f.globalCompositeOperation = 'source-atop'; f.strokeStyle = '#8a95b2'; f.lineWidth = lw * 0.8;           // the hatch: a cue that is not a colour
    const step = Math.max(10, W / 70); f.beginPath(); for (let x = -H; x < W + H; x += step) { f.moveTo(x, 0); f.lineTo(x + H, H); } f.stroke();
    f.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha = B.WASH_ALPHA; ctx.drawImage(F, 0, 0); ctx.restore();
    // the border: the outer rim of the union, and the rim of each hole
    const R = layer('rim', W, H), r = R.getContext('2d');
    r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, W, H);
    r.strokeStyle = '#eef2ff'; r.lineWidth = lw * 2; for (const d of discs) { r.beginPath(); r.arc(d[0], d[1], d[2], 0, Math.PI * 2); r.stroke(); }
    r.globalCompositeOperation = 'destination-out'; r.fillStyle = '#000'; for (const d of discs) { r.beginPath(); r.arc(d[0], d[1], d[2], 0, Math.PI * 2); r.fill(); }
    r.globalCompositeOperation = 'source-over'; r.strokeStyle = '#eef2ff'; r.lineWidth = lw * 1.4; r.setLineDash([lw * 3, lw * 2.4]);
    for (const h of holes) { r.beginPath(); r.arc(h[0], h[1], h[2], 0, Math.PI * 2); r.stroke(); }
    r.setLineDash([]);
    ctx.save(); ctx.globalAlpha = B.WASH_RIM; ctx.drawImage(R, 0, 0); ctx.restore();
  }
  // count the washed pixels of a view at a stage (for the tests: the wash really grows)
  function washArea(view, stage, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
    const discs = washBlobs(view, stage), holes = washHoles(view, stage);
    x.fillStyle = '#fff'; for (const d of discs) { x.beginPath(); x.arc(d[0] * W, d[1] * H, d[2] * W, 0, Math.PI * 2); x.fill(); }
    x.globalCompositeOperation = 'destination-out'; for (const h of holes) { x.beginPath(); x.arc(h[0] * W, h[1] * H, h[2] * W, 0, Math.PI * 2); x.fill(); }
    const d = x.getImageData(0, 0, W, H).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 127) n++;
    return n;
  }
  // the composite of a painting and its wash is cached (one entry per painting); while a stage grows it is rebuilt each frame
  const comp = {}, shown = {}, grow = {};
  function viewKey() {
    if (typeof TRAVEL === 'undefined') return null;
    return TRAVEL.view === 'continent' ? 'continent' : (WASH[TRAVEL.region] ? TRAVEL.region : null);
  }
  function compositeFor(src, real, view) {
    const stage = stageOf(flags()), W = real.naturalWidth, H = real.naturalHeight;
    if (shown[view] === undefined) shown[view] = stage;
    if (stage > shown[view] && !grow[view]) { if (reduced()) shown[view] = stage; else grow[view] = { stage, t0: performance.now() }; }
    if (stage < shown[view]) shown[view] = stage;
    let g = 1;
    if (grow[view]) { g = clamp((performance.now() - grow[view].t0) / 1000 / B.WASH_ANIM, 0, 1); if (g >= 1) { shown[view] = grow[view].stage; grow[view] = null; } }
    const drawStage = grow[view] ? grow[view].stage : shown[view];
    const key = view + ':' + drawStage + ':' + W + 'x' + H + ':' + (grow[view] ? Math.round(g * 40) : 'x');
    let c = comp[src];
    if (c && c.key === key) return c.cv;
    const cv = c && c.cv && c.cv.width === W && c.cv.height === H ? c.cv : document.createElement('canvas');
    cv.width = W; cv.height = H;                                // a canvas posing as the loaded painting: travel.js reads complete, naturalWidth and naturalHeight
    const x = cv.getContext('2d'); x.drawImage(real, 0, 0, W, H);
    paintWash(x, W, H, view, drawStage, grow[view] ? g : 1);
    cv.complete = true; cv.naturalWidth = W; cv.naturalHeight = H;
    comp[src] = { key, cv };
    return cv;
  }
  function withWash(fn, that, args) {
    let swapped = null;
    try {
      if (cfg.wash && typeof TRAVEL !== 'undefined' && typeof TRAVEL_REGIONS !== 'undefined') {
        const view = viewKey();
        const src = view === 'continent' ? 'img/map_continent.jpg' : view ? TRAVEL_REGIONS[view].img : null;
        const real = src ? TRAVEL.img[src] : null;
        if (src && real && real.complete && real.naturalWidth && !real.__p15s) { swapped = [src, real]; TRAVEL.img[src] = compositeFor(src, real, view); }
      }
    } catch (e) { warnOnce('wash', e); swapped = null; }
    try { return fn.apply(that, args); } finally { if (swapped) TRAVEL.img[swapped[0]] = swapped[1]; }
  }
  function wireMap() {
    if (typeof travelDraw === 'function') {
      const _d = travelDraw;
      travelDraw = function () { return withWash(_d, this, arguments); };
    }
    if (typeof travelRender === 'function') {
      const _r = travelRender;
      travelRender = function () {
        const r = _r.apply(this, arguments);
        try { addLegend(); } catch (e) { warnOnce('legend', e); }
        return r;
      };
    }
    // the walk across the map (js/motion10.js) is drawn from the same painting: give it the washed one, too
    if (typeof MOTION10 !== 'undefined' && MOTION10.travel && typeof MOTION10.travel.go === 'function') {
      const _g = MOTION10.travel.go;
      MOTION10.travel.go = function () { return withWash(_g, this, arguments); };
    }
  }
  function addLegend() {
    const panel = document.querySelector('#modal-panel.travel'); if (!panel || !cfg.wash) return;
    const old = document.getElementById('p15s-legend'); if (old) old.remove();
    const top = panel.querySelector('.tv-top'); if (!top) return;
    const p = el('p', { id: 'p15s-legend', class: 'muted tv-synod' });
    p.appendChild(el('i', { class: 'tv-sw synod', 'aria-hidden': 'true' })); p.appendChild(document.createTextNode(' ' + legendText(stageOf(flags()))));
    top.parentNode.insertBefore(p, top.nextSibling);
  }

  // ================================================================ 3. eclipses
  // the day: a new-moon Dawnday that the hash picks, never a feast, a festival or a story day
  function eclipseDay(d) {
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 99999) return false;
    if (d % B.ECL_MOD !== B.ECL_NEW) return false;
    if (B.ECL_EXCLUDE.includes(d) || isFeast(d)) return false;
    return hash('p15s-eclipse:' + B.ECL_SALT + ':' + d) % B.ECL_DEN < B.ECL_NUM;
  }
  const ECL_DUR = B.ECL_SECS / (90 * 24);                        // the clock runs a game day in 90 x 24 real seconds
  function eclipseWindow(d) {
    const centre = 0.5 + ((hash('p15s-eclipse-at:' + d) % 1000) / 1000 - 0.5) * B.ECL_JITTER;
    return { t0: centre - ECL_DUR / 2, t1: centre + ECL_DUR / 2, centre };
  }
  function eclipseU(d, tod) { if (!eclipseDay(d)) return -1; const w = eclipseWindow(d), u = (tod - w.t0) / (w.t1 - w.t0); return u > 0 && u < 1 ? u : -1; }
  function eclipseLevel(d, tod) {
    const u = eclipseU(d, tod); if (u < 0) return 0;
    const R = B.ECL_RAMP; return u < R ? smooth(u / R) : u > 1 - R ? smooth((1 - u) / R) : 1;
  }
  const eclipseOver = (d, tod) => eclipseDay(d) && tod >= eclipseWindow(d).t1;
  function eclipseBlocked() {
    if (!hasG()) return true;
    const f = flags();
    if (f.rite_started && !gone(f)) return true;                 // never during the Rite
    if (Number(G.escapeTimer) > 0 || Number(G.boreHold) > 0) return true;
    return false;
  }
  const eclipseInWindow = () => hasG() && eclipseU(dayNow(), todNow()) >= 0;
  const eclipseActive = () => cfg.eclipse && eclipseInWindow() && !eclipseBlocked();
  const eclipseTarget = () => (eclipseActive() ? eclipseLevel(dayNow(), todNow()) : 0);
  const spawnMult = () => (eclipseActive() ? B.ECL_SPAWN : 1);
  const dim = () => (gentle() ? B.ECL_DIM_SOFT : B.ECL_DIM);
  const skyOn = () => typeof GFX === 'undefined' || (GFX.eclipseSky !== false && GFX.preset !== 'plain');

  // the engine's own weather light: the same path a storm uses (js/engine.js setWeather -> wxDark darkens the sky and the world)
  function wireLight() {
    if (typeof Engine === 'undefined' || !Engine.setWeather) return;
    const _sw = Engine.setWeather;
    Engine.setWeather = function (o) {
      try {
        if (state.k > 0.001 && skyOn() && o && typeof o === 'object') o = Object.assign({}, o, { dark: Math.min(0.6, (+o.dark || 0) + dim() * state.k) });
      } catch (e) { warnOnce('light', e); }
      return _sw.call(this, o);
    };
  }
  // the moon over the sun and its corona, in the engine's own sun geometry (js/engine.js, "sun and moon")
  const skyStats = { covered: 0, ring: 0 };
  function eclipseHook(F) {
    skyStats.covered = 0; skyStats.ring = 0;
    if (state.k < 0.01 || !skyOn() || !F.outdoor) return;
    const elev = Math.cos((F.tod - 0.5) * Math.PI * 2); if (elev < 0.02) return;
    const { fb, mbuf, w, h, horizon, dirX, dirY, planeX, planeY } = F;
    const u = eclipseU(dayNow(), F.tod), e = Math.min(1, state.k); if (u < 0 && state.k < 0.05) return;
    const sunA = (F.tod - 0.25) * Math.PI * 2;
    const bodyEl = Math.min(0.95, elev), bodyCY = Math.max(2, Math.min(horizon - 1, horizon - bodyEl * h * 0.58));
    const rDisc = Math.max(2.5, h * 0.05), rAng = rDisc / (w * 0.55);
    const side = u < 0.5 ? -1 : 1, off = side * (1 - e) * 2.6;                        // the moon slides in from one side and out the other, in disc radii
    const moonA = sunA + off * rAng, moonCY = bodyCY + (1 - e) * rDisc * 0.5 * side * 0.6;
    const R = rDisc * 3.4, y0 = Math.max(0, Math.floor(bodyCY - R)), y1 = Math.min(horizon - 1, Math.ceil(bodyCY + R));
    const T = reduced() ? 0 : (typeof ANIM !== 'undefined' ? ANIM.T : 0);
    let cov = 0, ring = 0;
    for (let x = 0; x < w; x++) {
      const camX = 2 * x / w - 1, ang = Math.atan2(dirY + planeY * camX, dirX + planeX * camX);
      let ds = ang - sunA, dm = ang - moonA;
      while (ds > Math.PI) ds -= Math.PI * 2; while (ds < -Math.PI) ds += Math.PI * 2;
      while (dm > Math.PI) dm -= Math.PI * 2; while (dm < -Math.PI) dm += Math.PI * 2;
      if (Math.abs(ds) > rAng * 3.6 && Math.abs(dm) > rAng * 3.6) continue;
      for (let y = y0; y <= y1; y++) {
        const o = y * w + x; if (mbuf[o] !== 1) continue;
        const sx = ds / rAng, sy = (y - bodyCY) / rDisc, mx = dm / rAng, my = (y - moonCY) / rDisc;
        const rs = Math.sqrt(sx * sx + sy * sy), rm = Math.sqrt(mx * mx + my * my);
        let px = fb[o], r = px & 255, g = (px >> 8) & 255, b = (px >> 16) & 255, ch = false;
        if (rs < 3.4) { const k = e * 0.55 * Math.exp(-rs * rs / 5); r *= 1 - k; g *= 1 - k; b *= 1 - k; ch = true; }          // the sun's glow goes with its light
        if (rm <= 1.02) { const s = 0.94 * Math.min(1, (1.02 - rm) * 12 + 0.3); r *= 1 - s; g *= 1 - s; b *= 1 - s; ch = true; cov++; }
        else if (rm < 2.3 && e > 0.55) {                                                                                           // the corona: a pale ring, brightest at the rim, with a slow shimmer
          const a = (e - 0.55) / 0.45 * 0.5 * Math.exp(-Math.pow((rm - 1.0) / 0.5, 2)) * (1 + (T ? 0.08 * Math.sin(T * 1.7 + rm * 5) : 0));
          if (a > 0.01) { r = Math.min(255, r + 205 * a); g = Math.min(255, g + 210 * a); b = Math.min(255, b + 245 * a); ch = true; ring++; }
        }
        if (ch) fb[o] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
    }
    skyStats.covered = cov; skyStats.ring = ring;
  }
  // the birds go quiet: the call is swallowed, and the crows stand still with their heads up
  function wireQuiet() {
    if (typeof Audio_ === 'undefined' || !Audio_.sfx) return;
    const f = Audio_.sfx.bird;
    if (typeof f !== 'function' || f.__p15s) return;
    const w = function () { if (state.k > 0.05 && cfg.eclipse) { stats.hushed++; return undefined; } return f.apply(this, arguments); };
    w.__p15s = true; Audio_.sfx.bird = w;
  }
  function holdCrows() {
    if (state.k < 0.05 || !G.ents) return;
    for (const e of G.ents) {
      const s = e && e._sl; if (!s || s.kind !== 'crow') continue;
      if (s.st === 'peck' || s.st === 'hop' || s.st === 'look') { s.st = 'look'; s.t = Math.max(s.t || 0, 0.5); stats.crowsHeld++; }
    }
  }
  // the extra hound: a bolder noon brings a second one, a moment later, from our own seeded stream (never Math.random)
  function spawnRoll() { return mulberry(hash(dayNow() + ':' + (++state.spawnN) + ':ecl'))(); }
  function wireSpawn() {
    if (typeof spawnHound !== 'function') return;
    const _sh = spawnHound;
    spawnHound = function () {
      let m = 1; try { m = spawnMult(); } catch (e) { m = 1; }
      const r = _sh.apply(this, arguments);
      if (m > 1) { try { if (spawnRoll() < m - 1) { stats.extraHounds++; setTimeout(() => { try { _sh(); } catch (e) { /* the spawner is the game's */ } }, 2500); } } catch (e) { warnOnce('spawn', e); } }
      return r;
    };
  }
  function tickEclipse(dt) {
    if (!hasG() || !G.player) return;
    const target = eclipseTarget(), rate = gentle() ? B.ECL_FADE_SOFT : B.ECL_FADE;
    state.k = clamp(state.k + clamp(target - state.k, -rate * dt, rate * dt), 0, 1);
    if (!cfg.eclipse) state.k = 0;
    if (state.k > 0.001 || target > 0) { holdCrows(); }
    if (G.state !== 'play') return;
    const outdoor = !!(G.map && G.map.outdoor), d = dayNow();
    if (eclipseActive() && outdoor) {
      const lv = eclipseLevel(d, todNow());
      if (lv > 0.12 && !state.said['ea' + d]) { state.said['ea' + d] = true; say(TX.ecl.entry, 'warn', 9000); }
      if (lv >= 0.98 && !state.said['eb' + d]) {
        state.said['eb' + d] = true; say(TX.ecl.mid, 'voice', 9000);
        if (!fint('p15s_ecl')) { fset('p15s_ecl', 1); try { journal('side', TX.ecl.journal); } catch (e) { /* bonus */ } }
      }
    } else if (state.said['eb' + d] && !state.said['ec' + d] && eclipseOver(d, todNow()) && outdoor) { state.said['ec' + d] = true; say(TX.ecl.end, '', 6000); }
  }

  // ================================================================ per-frame work, map loading, saves
  function tick(dt) {
    try { tickSermon(dt); } catch (e) { warnOnce('sermon tick', e); }
    try { tickEclipse(dt); } catch (e) { warnOnce('eclipse tick', e); }
    if (((state.audioT = (state.audioT || 0) + dt)) > 1) { state.audioT = 0; try { wireQuiet(); } catch (e) { /* optional */ } }
  }
  function wireTick() {
    if (typeof update !== 'function') return;
    const _update = update;
    update = function (dt) {
      const r = _update.apply(this, arguments);
      try { tick(dt); } catch (e) { warnOnce('tick', e); }
      return r;
    };
  }
  function wireMaps() {
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        const r = _lm.apply(this, arguments);
        try { state.scatter = null; state.loudT = 0; syncChapel(); sayEntry(id); tickClosure(); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function (d) {
        const r = _rg.apply(this, arguments);                // a bad save throws here, before anything below
        try { sanitizeFlags(); state.scatter = null; state.said = {}; state.k = 0; state.loudT = 0; closeSermon(); syncChapel(); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof renderLog === 'function') {
      const _log = renderLog;
      renderLog = function () {
        const r = _log.apply(this, arguments);
        try { addAlmanac(); } catch (e) { warnOnce('almanac', e); }
        return r;
      };
    }
  }

  // ================================================================ Options rows and style
  function row(grid, id, spec, get, set) {
    const lab = el('span', { class: 'gfx-label' }, spec.label + ' '); lab.appendChild(el('small', { class: 'muted' }, spec.hint));
    const b = el('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': String(!!get()) }, get() ? 'On' : 'Off');
    b.classList.toggle('sel', !!get());
    b.onclick = () => { set(!get()); b.textContent = get() ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(!!get())); b.classList.toggle('sel', !!get()); };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('s15-sermons-opt')) return;
    row(grid, 's15-sermons-opt', TX.opts.sermons, () => cfg.sermons, (v) => { cfg.sermons = v; saveCfg(); syncChapel(); });
    row(grid, 's15-map-opt', TX.opts.map, () => cfg.wash, (v) => { cfg.wash = v; saveCfg(); });
    row(grid, 's15-eclipse-opt', TX.opts.eclipse, () => cfg.eclipse, (v) => { cfg.eclipse = v; saveCfg(); });
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { appendRows(); } catch (e) { warnOnce('options', e); }
      return r;
    };
  }
  function injectStyle() {
    if (document.getElementById('synod15-style')) return;
    const st = document.createElement('style'); st.id = 'synod15-style';
    st.textContent = `
.s15 { display: flex; flex-direction: column; gap: .6cqh; }
.s15-who { margin: 0; font-size: 1.9cqw; color: var(--gold); font-family: var(--font-sc); }
.s15-lines { display: flex; flex-direction: column; gap: .7cqh; min-height: 22cqh; max-height: 38cqh; overflow: auto; padding-right: .5cqw; }
.s15-line { margin: 0; font-size: 2cqw; line-height: 1.32; text-align: left; }
.s15-close { font-style: italic; color: var(--parch-dim); }
.s15-meter { height: 1cqh; background: rgba(232,217,181,.14); border: 1px solid rgba(232,217,181,.3); }
.s15-bar { height: 100%; width: 0; background: #9aa4c0; }
.s15-sum { margin: 0; font-size: 2cqw; line-height: 1.3; text-align: left; }
.s15-keys { margin: 0; font-size: 1.6cqw; text-align: center; }
.p15s-almanac p { margin: .3cqh 0; font-size: 1.75cqw; }
.panel.travel .tv-synod { margin: 0 0 .6cqh; font-size: 1.6cqw; line-height: 1.25; text-align: left; }
.panel.travel .tv-sw.synod { background: repeating-linear-gradient(45deg, #dfe6f2 0 2px, #8a95b2 2px 4px); border-color: #eef2ff; }
`;
    document.head.appendChild(st);
  }

  // ================================================================ boot
  loadCfg();
  try { injectStyle(); } catch (e) { /* head not ready */ }
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('synod15: ' + name + ' wiring failed', e); } };
  wire('talk', wireTalk); wire('gazette', wireGazette); wire('hooks', wireSermonHooks); wire('map', wireMap); wire('light', wireLight);
  wire('spawn', wireSpawn); wire('tick', wireTick); wire('maps', wireMaps); wire('options', wireOptions); wire('quiet', wireQuiet);
  wire('sky', () => { if (typeof Engine !== 'undefined' && Engine.addSkyHook) Engine.addSkyHook(eclipseHook, 14); });
  if (hasG() && G.map) wire('first sync', syncChapel);

  return {
    cfg, saveCfg, B, TX, TEXTS: LIST, FLAGS, WASH, NPC_DEFS, CONG, PREACHER_AT, SEAT_AT,
    // sermons
    sermonAt, sermonDay, sermonNow, sid, status, graceActive, ensureChapel, syncChapel, openSermon, stepSermon, finishSermon, closeSermon, leaveSermon, ui,
    attendDone, disrupt, tickSermon, tickScatter, folkLine, sayEntry, almanacLines, seatEnt, realChapel,
    // map
    stageOf, washBlobs, washHoles, legendText, paintWash, washArea, compositeFor, addLegend, mapState: () => JSON.parse(JSON.stringify({ shown, grow })),
    // eclipses
    eclipseDay, eclipseWindow, eclipseU, eclipseLevel, eclipseOver, eclipseBlocked, eclipseActive, eclipseTarget, eclipseInWindow, spawnMult, spawnRoll, eclipseHook, skyStats, holdCrows, tickEclipse,
    isFeast, dateOf, wdOf,
    sanitizeFlags, fint, fset, tick, state, stats,
  };
})();
if (typeof window !== 'undefined') window.SYNOD15 = SYNOD15;
