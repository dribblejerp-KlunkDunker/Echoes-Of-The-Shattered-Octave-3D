// ============================================================
//  conservatory59 — The Reedside Conservatory and reed orchard (ROADMAP R5 #7, optional; Vol II §Settlements, Vol V
//  §Ilse Brennan, Book Four Part One ch. 4 for the reed-hall).
//
//  The Conservatory Reading Room (js/libraries26.js, Ilse Brennan's library, door at Oakhaven (48,39)) gets a door in its east
//  wall into the rest of the school, open in Parts One and Two:
//    * THE REED-HALL (canon: Book Four). High dark beams; a fire of dry wind-reed stalks; the kitchen at one end. On the
//      slate board, in the small upright hand, the line Ilse wrote the first morning she came back to teach in 408: "A
//      Cantor's instrument is the breath. The voice is only the most common way of spending it." [PROPOSED: never wiped.]
//      Over the door, the reed-rack: four hundred pegs and forty reeds; the head of school has not replaced the dead
//      students' reeds and will not discuss it (Vol II). The box of old exercise slates in Ilse's hand [PROPOSED: Lyra's
//      among them, the tending note at eight]. From Dawnday, when the Church has come, three close-written pages on Ilse's
//      desk, the first word "Lyra," and the rest face down: the letter she wrote "in Harvestmonth, the week the Church
//      came" (Book Four). Nothing more of it is shown.
//    * THE YOUNGEST STUDENT [PROPOSED]: eight years old, as Lyra was, and cannot find the middle of the tending note. Hold it
//      with her (Hold the Pitch at 174, js/reedcraft.js) and she finds it.
//    * THE REED ORCHARD, against the east Hedge. Rows of wind-reed, whistling under their breath. The oldest tree's hollow,
//      that Cantors still hum into on the Longest Night (canon: the remnant of the Long Tending), and the tally-board of
//      nights kept beside it. Hum into it [PROPOSED]: the note goes down, a long way, and does not come back. Where the
//      Hedge meets the orchard wall an old iron-bark's roots have heaved a flagstone; under the moss it rings faintly. The
//      old stair stays sealed: nothing here opens it (it is Book Four's, and js/longnight17.js's after Book One).
//  Closes at the Greening or the escape (the Reading Room's east door is shut). Maps are part of the base build; the one
//  door cell on the Reading Room is set at build and on load. Flags: p59_lesson (1 she found it), p59_hum, p59_seen bits.
// ============================================================
'use strict';

const CONSERVATORY59 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const PI = Math.PI;
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('conservatory59: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };

  const READ = 'lib_conservatory', HALL = 'p59_hall', ORCH = 'p59_orchard';
  const READ_DOOR = [12, 7];
  const HW = 22, HH = 12, OW = 26, OH = 20;

  const TX = {
    leave: S('Leave it.'),
    hallName: S('The Conservatory: the reed-hall'),
    orchName: S('The Conservatory: the reed orchard'),
    toHall: S('Into the Conservatory'),
    toRead: S('The Reading Room'),
    toOrch: S('The reed orchard'),
    toHallBack: S('The reed-hall'),
    shut: S('The door into the rest of the Conservatory is shut, and nobody answers.'),
    enterHall: S('A long hall with high dark beams, and a fire of dry wind-reed stalks burning low in the middle of it. Somebody is practising a note, very quietly, at the far end.'),
    enterOrch: S('Rows of wind-reed, taller than you, whistling under their breath in a wind you can hardly feel.'),
    // the reed-hall
    slate: S('The slate board'),
    slateLook: S('A wide slate on the north wall, and on it, in a small upright hand, one line that nobody has wiped in eleven years:<br><br><i>A Cantor\'s instrument is the breath. The voice is only the most common way of spending it.</i><br><br>Ilse Brennan wrote it the first morning she came back to teach, in 408, after the throat-fever winter: nine nights singing to the dying in the Hollow, and on the tenth morning she opened her mouth and nothing came.'),
    rack: S('The reed-rack over the door'),
    rackLook: S('A long board over the door, with four hundred pegs in it, one for every student the Conservatory had when it was full. Forty of the pegs have a reed in them, cut fresh, each with a name burned small into the stalk. The rest are empty.<br><br>The head of school has not replaced the dead students\' reeds, and will not discuss it.'),
    fire: S('A fire of wind-reed stalks'),
    fireLook: S('Dry wind-reed stalks, burning low and clean. They whistle very faintly as they go.'),
    kitchen: S('The reed-hall kitchen'),
    kitchenLook: S('A copper, a long table scrubbed white, and forty bowls on a shelf.'),
    slates: S('A box of old slates'),
    slatesLook: S('Exercise slates, years of them, each marked in the same small upright hand. Near the top, one in a child\'s careful letters: <i>L. Ashgrove. The tending note.</i> Under it, in the upright hand: <i>Again. Lower. Slower. Good.</i>'),
    desk: S('Ilse Brennan\'s desk'),
    deskLook: S('A plain desk under the window, a slate on a string, a jar of chalk, and nothing else at all.'),
    letterLook: S('Three pages, close-written in the small upright hand, squared on the desk. The first word on the top page is <i>Lyra,</i> and the rest of them have been turned face down. Somebody has set the chalk-jar on top of them, so that they will stay that way.'),
    bench: S('A bench'),
    student: S('A student of the Conservatory'),
    studentLook: S('Forty, down from four hundred. This one is practising the falling fifth with her hand flat on her own breastbone, and does not look up.'),
    // the youngest
    youngest: S('The youngest student'),
    youngestLook: S('Eight years old, perhaps, sitting on the end of a bench with her hands pressed to her ribs, trying a note and stopping, and trying it again.'),
    lessonTitle: S('The tending note'),
    lesson: S('She is eight, and she cannot find the middle of the tending note. She keeps going up to it and sliding off. "Cantor-Master says hold the middle and it finds you," she says, very low, as if it were your fault. "It doesn\'t find me."'),
    holdWith: S('Hold it with her'),
    notNow: S('Not now'),
    holdTitle: S('The tending note, with her'),
    holdHint: S('Low and slow. Hold the middle of the note.'),
    found: S('Somewhere in the middle of the second breath she stops sliding. You hear it: the note sitting where it should, and her voice inside it, small and steady. She does not look up. She does it again on her own, and then again.'),
    missed: S('She slides off it again, and so do you. "It\'s all right," she says, kindly. "It took Cantor Ashgrove till she was nine. Everybody knows that."'),
    // the orchard
    reeds: S('Wind-reed'),
    dryLook: S('Cut wind-reed, tied in bundles and stood against the wall to dry. The fire is made of last year\'s.'),
    reedsLook: S('Grown reed, taller than a man, the heads gone silver for autumn. The wind finds the cut ones and they whistle; the whole orchard is humming a little under its breath.'),
    hollow: S('The oldest tree'),
    hollowLook: S('An iron-bark older than the Conservatory, its trunk split at the height of a child\'s face into a hollow worn smooth and dark by hands. Once a year, on the Longest Night, every Cantor in Reedside comes and hums into it. Nobody says what for.'),
    humIn: S('Hum into the hollow'),
    hummed: S('You hum into the hollow. The note goes in, and down, a long way down, further than any tree is deep, and does not come back.'),
    tally: S('The tally-board'),
    tallyLook: S('A board nailed to a post beside the oldest tree, scored in fives: a stroke for every Longest Night that somebody came and hummed into the hollow. The oldest strokes have weathered almost flat. There are a great many of them.'),
    flag: S('Where the Hedge meets the orchard wall'),
    flagLook: S('An old iron-bark stands where the Hedge comes down to meet the Conservatory\'s orchard wall, and its roots have heaved a flagstone up at the foot of it. Moss, and under the moss, something that rings very faintly when you step on it. It does not move.'),
    wall: S('The orchard wall'),
    // logbook
    jHall: S('The Reedside Conservatory: forty students, down from four hundred, and over the door a rack of four hundred pegs with forty reeds in it. On the slate board, in Ilse Brennan\'s hand: A Cantor\'s instrument is the breath.'),
    jLesson: S('The youngest student at the Conservatory could not find the middle of the tending note. We held it together until she did.'),
    jHollow: S('In the reed orchard I hummed into the hollow of the oldest tree, the way the Cantors do on the Longest Night. The note went down a long way and did not come back.'),
  };

  // ================================================================ art
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites.p59_reed)) return;
    const px = (d, w, x, y, r, g, b) => { if (x >= 0 && x < w && y >= 0 && y < d.length / w) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
    // a clump of wind-reed, heads gone silver
    { const w = 20, h = 48, d = new Uint32Array(w * h);
      for (let s = 0; s < 6; s++) {
        const bx = 3 + s * 3 - (s > 2 ? 1 : 0), top = 4 + ((s * 7) % 9), lean = (s - 2.5) * 0.06;
        for (let y = top; y < h; y++) { const x = Math.round(bx + (h - y) * lean); px(d, w, x, y, 104 + (y % 5) * 3, 112 + (y % 5) * 3, 64); if (y % 9 === 0) px(d, w, x, y, 74, 76, 44); }
        for (let k = 0; k < 6; k++) { const x = Math.round(bx + (h - top) * lean) + (k % 3) - 1, y = top - 2 + (k >> 1); px(d, w, x, y, 206, 204, 190); }
      }
      Engine.addSprite('p59_reed', { w, h, data: d, hs: 2.9, cx: 0.5, dy: 0 }); }
    // the reed-rack: a board of pegs, a few with reeds in them
    { const w = 40, h = 10, d = new Uint32Array(w * h);
      for (let y = 6; y < 10; y++) for (let x = 0; x < w; x++) px(d, w, x, y, 96 + ((x * 3) % 7), 66, 40);
      for (let x = 1; x < w; x += 2) { px(d, w, x, 5, 60, 44, 28); if ((x * 7) % 10 === 3) for (let y = 0; y < 6; y++) px(d, w, x, y, 150, 154, 92); }
      Engine.addSprite('p59_rack', { w, h, data: d, hs: 0.38, cx: 0.5, dy: 0 }); }
  }

  // ================================================================ maps
  const look = (m, sprite, x, y, label, text, extra) => m.deco(sprite, x, y, Object.assign({ use: 'p59_look', label, look: text, radius: 0.3 }, extra || {}));
  function buildHall() {
    const m = new GameMap(HALL, TX.hallName, HW, HH, { floor: 't_wood', ceil: 'c_beams', fogDist: 16, ambient: 0.34, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 1.7, y: 6.5, dir: 0 } });
    m.border('t_house');
    m.set(0, 6, DOOR({ portal: { map: READ, x: READ_DOOR[0] - 0.7, y: READ_DOOR[1] + 0.5, dir: PI }, label: TX.toRead }));
    m.set(HW - 1, 6, DOOR({ portal: { map: ORCH, x: 1.7, y: 10.5, dir: 0 }, label: TX.toOrch }));
    look(m, 'sign', 11.0, 1.3, TX.slate, TX.slateLook, { scale: 1.1, solid: false, use: 'p59_slate' });
    look(m, 'p59_rack', 1.25, 4.4, TX.rack, TX.rackLook, { scale: 1.0, solid: false, yOff: -0.55, use: 'p59_rack' });
    look(m, 'hearth', 11.0, 6.5, TX.fire, TX.fireLook, { scale: 0.9, glow: 0.55, radius: 0.5 });
    // benches in rows facing the slate board, either side of the fire
    for (const y of [3.2, 4.6]) for (const x of [5.0, 7.4, 14.6, 17.0]) m.deco('p9p_pew', x, y, { radius: 0.35, scale: 0.75, facing: -PI / 2, label: TX.bench });
    for (const y of [8.4, 9.8]) for (const x of [5.0, 7.4, 14.6]) m.deco('p9p_pew', x, y, { radius: 0.35, scale: 0.75, facing: -PI / 2, label: TX.bench });
    // cut reed drying along the walls
    for (const x of [3.0, 6.0, 9.0, 13.0, 16.0]) look(m, 'p59_reed', x + 0.5, HH - 1.35, TX.reeds, TX.dryLook, { scale: 0.55, radius: 0.2, solid: false });
    m.deco('lamp', 11.0, HH - 1.6, { radius: 0.12, scale: 0.7, glow: 0.45, solid: false });
    look(m, 'table', 19.2, 1.8, TX.kitchen, TX.kitchenLook, { scale: 0.7 });
    look(m, 'crates', 20.3, 2.6, TX.kitchen, TX.kitchenLook, { scale: 0.6 });
    look(m, 'table', 18.6, 9.8, TX.desk, TX.deskLook, { scale: 0.7, use: 'p59_desk' });
    look(m, 'bookpile', 16.4, 10.3, TX.slates, TX.slatesLook, { scale: 0.45, solid: false, use: 'p59_slates' });
    m.deco('lamp', 4.0, 1.6, { radius: 0.12, scale: 0.7, glow: 0.5, solid: false });
    m.deco('lamp', 18.0, 1.6, { radius: 0.12, scale: 0.7, glow: 0.5, solid: false });
    for (const [x, y, sp, sc] of [[7.2, 3.6, 'townswoman', 0.9], [15.0, 3.7, 'townsman', 0.9], [15.4, 9.3, 'townswoman', 0.88]]) look(m, sp, x, y, TX.student, TX.studentLook, { scale: sc, facing: -PI / 2 });
    look(m, 'townswoman', 8.9, 8.9, TX.youngest, TX.youngestLook, { scale: 0.62, facing: -PI / 2, use: 'p59_youngest' });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildOrchard() {
    const m = new GameMap(ORCH, TX.orchName, OW, OH, { outdoor: true, floor: 't_grass', fogDist: 18, music: 'wild', spawn: { x: 1.7, y: 10.5, dir: 0 } });
    m.border('t_hedge');
    for (let y = 0; y < OH; y++) m.set(0, y, WALL('t_house'));
    m.set(0, 10, DOOR({ portal: { map: HALL, x: HW - 1.7, y: 6.5, dir: PI }, label: TX.toHallBack }));
    // rows of wind-reed, north to south, with a walk down the middle (y 9 to 12) and a clearing round the oldest tree
    for (let x = 3; x <= 23; x += 2) for (let y = 2; y <= 18; y += 1.5) {
      if (y > 8.4 && y < 12.6) continue;
      if (Math.abs(x - 13) < 3.2 && Math.abs(y - 10.5) < 4.2) continue;
      const j = ((x * 7 + y * 13) % 5) / 10;
      look(m, 'p59_reed', x + 0.3 + j, y + 0.2, TX.reeds, TX.reedsLook, { scale: 1.05 + j, radius: 0.3 });
    }
    look(m, 'oak', 13.0, 10.5, TX.hollow, TX.hollowLook, { scale: 2.8, radius: 0.8, solid: true, use: 'p59_hollow' });
    look(m, 'ln17_board', 14.8, 11.6, TX.tally, TX.tallyLook, { scale: 0.85, radius: 0.25, solid: true });
    look(m, 'oak', OW - 2.6, 2.4, TX.flag, TX.flagLook, { scale: 1.6, radius: 0.6, solid: true });
    m.baseCount = m.entities.length;
    return m;
  }
  // the Reading Room's east door: open in Parts One and Two, shut after
  function syncRead(r) {
    if (!r || r.id !== READ) return;
    const [x, y] = READ_DOOR, c = r.get(x, y);
    if (gone()) { if (!c || c.lockMsg !== TX.shut) r.set(x, y, DOOR({ locked: '__never', lockMsg: TX.shut, label: TX.toHall })); return; }
    if (!c || !c.portal || c.portal.map !== HALL) r.set(x, y, DOOR({ portal: { map: HALL, x: 1.7, y: 6.5, dir: 0 }, label: TX.toHall }));
  }
  function buildMaps(maps) {
    if (!maps[HALL]) maps[HALL] = buildHall();
    if (!maps[ORCH]) maps[ORCH] = buildOrchard();
    syncRead(maps[READ]);
  }

  // ================================================================ uses
  const seen = (bit) => { const f = F(); const v = Number(f.p59_seen) | 0; if (v & bit) return false; f.p59_seen = v | bit; return true; };
  function lessonCard() {
    if (Number(F().p59_lesson) === 1) { showEvent(TX.youngest, TX.found, [{ t: TX.leave, f: null }]); return; }
    showEvent(TX.lessonTitle, TX.lesson, [{ t: TX.holdWith, f: () => { hold(); } }, { t: TX.notNow, f: null }]);
  }
  async function hold() {
    let score = 0;
    try {
      const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
      if (Rd) { const res = await Rd.holdPitch({ curve: [[0, 174 * 0.96], [1.4, 174], [7, 174]], width: (typeof Rd.bandFor === 'function' ? Rd.bandFor(0) : 100) * 1.3, duration: 7, title: TX.holdTitle, hint: TX.holdHint }); score = res && !res.aborted ? Number(res.score) || 0 : 0; }
    } catch (e) { warnOnce('hold', e); }
    try { if (G.state !== 'play' && !G.openPanel) G.state = 'play'; } catch (e) { /* ok */ }
    return finishLesson(score);
  }
  function finishLesson(score) {
    const ok = score >= 0.55;
    if (ok) { F().p59_lesson = 1; try { journal('side', TX.jLesson); questXp(20); } catch (e) { /* none */ } }
    showEvent(TX.lessonTitle, ok ? TX.found : TX.missed, [{ t: TX.leave, f: null }]);
    return ok;
  }
  function hollowCard() {
    showEvent(TX.hollow, TX.hollowLook, [{ t: TX.humIn, f: () => {
      const f = F(); f.p59_hum = (Number(f.p59_hum) | 0) + 1;
      try { Audio_.sfx.song(174, 2.4); } catch (e) { /* silent */ }
      if (f.p59_hum === 1) { try { journal('side', TX.jHollow); questXp(5); } catch (e) { /* none */ } }
      showEvent(TX.hollow, TX.hummed, [{ t: TX.leave, f: null }]);
    } }, { t: TX.leave, f: null }]);
  }
  function useOwn(e) {
    if (!e || !e.use || !/^p59_/.test(e.use)) return false;
    if (e.use === 'p59_youngest') { lessonCard(); return true; }
    if (e.use === 'p59_hollow') { hollowCard(); return true; }
    if (e.use === 'p59_desk') { showEvent(TX.desk, F().church_come ? TX.letterLook : TX.deskLook, [{ t: TX.leave, f: null }]); return true; }
    if (e.use === 'p59_rack' || e.use === 'p59_slate') { if (seen(1)) { try { journal('side', TX.jHall); } catch (err) { /* none */ } } }
    showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]);
    return true;
  }

  // ================================================================ the orchard's hum, and wiring
  let humming = false;
  function onLoad() {
    try {
      if (!hasG()) return;
      syncRead(G.maps && G.maps[READ]);
      if (G.mapId === HALL && seen(2)) say(TX.enterHall, '', 6500);
      if (G.mapId === ORCH && seen(4)) say(TX.enterOrch, '', 6000);
      const on = G.mapId === ORCH;
      if (on || humming) { Audio_.hum(on ? 0.14 : 0, 348, 'p59_reeds'); humming = on; }
    } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (!guest() && useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); onLoad(); return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('conservatory59 failed to wire', e); }

  return { TX, TEXTS, READ, HALL, ORCH, READ_DOOR, syncRead, useOwn, lessonCard, finishLesson, hollowCard };
})();
if (typeof window !== 'undefined') window.CONSERVATORY59 = CONSERVATORY59;
