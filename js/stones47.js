// ============================================================
//  stones47 — Release road R5 #6: the standing-stone ring, off the Greenroot road.
//
//  The Phase 20-21 Author Rulings made the ring painted on the clearing's eastern skyline (js/sky.js, bearing 0.11) a
//  real place, reached only from outside the Hedge: "Off the Greenroot road, which already leaves the clearing by the
//  east hedge." It joins the clearing alone, by a second gap in the east hedge beside the road's, and nothing else.
//
//  What the ring is, is left to whoever builds it, marked [PROPOSED]. Here it is:
//    * THE WEEKSTONES [PROPOSED]: eight stones, one for each day of the week, sunwise from Rootday's. Vol VI §0.1 (the
//      Rota, itself [PROPOSED]) makes the week the keepers' duty roster, one Anchor to a day; the ring is the Reach's
//      copy of it in stone. Each face carries its day's sign, worn nearly smooth. Seven stand, as the panorama paints
//      them; Nullday's lies flat on its back in the grass, which is why the skyline shows seven.
//    * THE TONGUE-STONES [PROPOSED, on canon customs]: "stone on the tongue" (canon) and the Last Note "counted out in
//      eights, one for each Anchor" (P13, [PROPOSED]). "In the old days [the note] was sung out after. It cannot be now.
//      The Hedge eats a note" (P9). So the families bring the stones out here instead, at first light when the gate
//      opens, and leave them in the hollow at the foot of Rootday's stone to wait.
//    * "COUNTED IN EIGHTS" [PROPOSED]: sing them out the old way. Walk the ring sunwise from the Root and hold a note at
//      each stone, a hand's width of voice (Hold the Pitch, js/reedcraft.js), each at its own Anchor's pitch. Too loud,
//      and the note carries and the count goes back to the Root; out here the hounds hear what the Hedge would have
//      eaten. On the eighth, at the fallen stone, you do not hold. You let it go.
//
//  The map is new and always built (a save may stand in it). Nothing draws on the random stream; nothing is added to
//  the clearing's entity list (the gap is a cell). The quest closes with one logbook line at the Greening.
// ============================================================
'use strict';

const STONES47 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const here = () => (hasG() ? G.mapId : null);
  const fmt = (t, ...a) => String(t).replace(/\{(\d)\}/g, (_, i) => a[+i]);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('stones47: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const noise = (n) => { try { if (typeof addNoise === 'function') addNoise(n); } catch (e) { /* none */ } };
  const PI = Math.PI;

  const MAP = 'p47_stones', CLEARING = 'clearing';
  const GAP = [39, 26];               // the clearing's east hedge, seven cells north of the Greenroot road's gap (39, 33)
  const W = 34, H = 30;
  const RING = { x: 18.5, y: 15.0, r: 5.6 };
  const PASS = 0.5, HOLD_SECS = 5;
  const XP = 50;

  const TX = {
    leave: S('Leave it.'),
    name: S('The standing-stones'),
    toStones: S('A gap in the east hedge, and a track to the standing-stones'),
    toClearing: S('Back through the hedge to the clearing'),
    entered: S('Eight stones in a ring on the open ground, and the wind going through them. One lies flat in the grass.'),
    // the stones, sunwise from the Root
    holdAt: S('Hold the note here, a hand\'s width of voice'),
    letGo: S('Let it go'),
    holdHint: S('A hand\'s width of voice. Find it, and hold it, and no louder.'),
    held: S('The stone takes the note, and holds it a moment after you stop. {0} of eight.'),
    tooLoud: S('Too loud. The note goes out over the thorn and keeps going, and somewhere east a hound lifts its head. The count goes back to the Root.'),
    putDown: S('You let the breath out without a note in it. The count stands where it was.'),
    eighthLook: S('The eighth stone lies flat on its back in the grass, face to the sky: a circle with nothing in it. The others you hold at. This one you do not. On the eighth, the note is let go.'),
    sungOut: S('You let it go. The note goes out of the ring over the open country, east, toward nothing in particular, and does not come back. Nothing answers it. That is how it is supposed to sound.<br><br>In the hollow at the foot of the Root\'s stone the chalk is the same as it was. But it was only ever chalk.'),
    sungOutMsg: S('Sung out.'),
    alreadySung: S('The tongue-stones lie in the hollow as they did. They have been sung out; they do not look any different. Nobody would know but you.'),
    // the tongue-stones
    pebbles: S('A hollow at the foot of the Root\'s stone, full of small stones'),
    pebblesLook: S('A hollow worn in the turf at the foot of the tallest stone, and in it a heap of small river-stones, smooth, the size of a thumb-end. Every one is chalked with two or three letters. Some of the chalk is fresh. You know what they are: a stone goes on the tongue when somebody lets go, and the family holds the note and counts it out in eights, one for each Anchor, in silence now. In the old days the note was sung out after. Inside the Hedge it cannot be; the Hedge eats a note. So they bring the stones out here, at first light when the gate is open for the carts, and leave them for when it can be done.'),
    pebblesStart: S('Sing them out the old way'),
    pebblesHow: S('Sunwise from the Root. A note at each stone, at its own pitch and no louder than a hand\'s width. On the eighth, let it go.'),
    // logbook
    jStart: S('Counted in Eights: at the standing-stones off the Greenroot road, Oakhaven\'s families leave the tongue-stones of the dead they cannot sing out inside the Hedge. I can sing them out the old way: a note at each stone, sunwise from the Root, quietly, and on the eighth, let it go.'),
    jDone: S('Counted in Eights: I sang the tongue-stones out at the standing-stones, sunwise from the Root, and let the note go at the eighth.'),
    jClosed: S('The standing-stones are behind me now. The tongue-stones are still in the hollow at the foot of the Root\'s stone, and nobody sang them out.'),
  };

  // sunwise from the Root. [day, Anchor pitch, sign]
  const STONES = [
    ['Rootday', 174, S('Rootday\'s, the tallest: a tree cut into its face, the roots as long as the branches. Ivy on the north side, and under the ivy the stone is warm.')],
    ['Hearthday', 285, S('Hearthday\'s: a ring of flame-tongues around a bowl, worn almost flat. Lichen has filled the bowl.')],
    ['Massday', 396, S('Massday\'s: three squares, one inside the next, like a weight seen from above. It is the heaviest-looking of them, and leans not at all.')],
    ['Stasisday', 417, S('Stasisday\'s: an hourglass lying on its side, so that nothing runs. Somebody has scratched a tally beside it, a long time ago, and stopped.')],
    ['Dawnday', 528, S('Dawnday\'s: a half-sun on a level line. The face looks east, and catches the first light before anything else in the Reach.')],
    ['Driftday', 639, S('Driftday\'s: three waved lines, one over another, like water seen from a bank. It is cut deeper than the rest, by somebody in a hurry.')],
    ['Memoryday', 741, S('Memoryday\'s: an open book, or a pair of hands held palm up. The rain has made it hard to say which, and perhaps it was always both.')],
    ['Nullday', 852, TX.eighthLook],
  ];
  const STONE_NAME = STONES.map(([d]) => S(d + '\'s stone'));
  // whole lines per day, so the French never has to put an English day-name into a pattern
  const SUNWISE = STONES.map(([d]) => S('Sunwise, from the Root. The next is ' + d + '\'s.'));
  const HOLD_TITLE = STONES.map(([d]) => S('Counted in eights: ' + d));

  // ================================================================ sprites (procedural stand-ins)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, w, h, hs, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px, w, h); Engine.addSprite(name, { w, h, data: d, hs, cx: 0.5, dy: 0 });
    };
    // a standing-stone: a slab, wider at the foot, rounded at the top, grey with lichen; the sign cut low on the face
    const slab = (seed, tall) => (px, w, h) => {
      const top = tall ? 1 : 6;
      for (let y = top; y < h; y++) {
        const k = (y - top) / (h - top);
        const half = Math.round((w * 0.26) + k * (w * 0.14) - (y < top + 3 ? (top + 3 - y) * 1.2 : 0));
        const cx = (w / 2) | 0, lean = Math.round(((seed % 3) - 1) * (1 - k) * 1.5);
        for (let x = cx - half + lean; x < cx + half + lean; x++) {
          const edge = x === cx - half + lean || x === cx + half + lean - 1;
          const n = ((x * 13 + y * 7 + seed * 5) % 9) * 3, shade = x < cx + lean ? 10 : -8;
          let r = 128 + n + shade, g = 124 + n + shade, b = 112 + n + shade;
          if (((x * 5 + y * 3 + seed) % 11) < 2 && y > top + 4) { r = 112; g = 128; b = 70; }   // lichen
          if (edge) { r = 52; g = 52; b = 50; }
          px(x, y, r, g, b);
        }
      }
      for (let y = (h * 0.55) | 0; y < (h * 0.55 + 5) | 0; y++) { px((w / 2 | 0) - 2, y, 84, 82, 76); px((w / 2 | 0) + 2, y, 84, 82, 76); }
      for (let x = (w / 2 | 0) - 2; x <= (w / 2 | 0) + 2; x++) px(x, (h * 0.55 + 2) | 0, 84, 82, 76);
    };
    mk('p47_stone_tall', 16, 40, 1.75, slab(1, true));
    for (let i = 0; i < 3; i++) mk('p47_stone' + i, 16, 32, 1.3, slab(i + 2, false));
    mk('p47_fallen', 32, 8, 0.22, (px) => {   // the eighth, lying on its back: a slab seen edge-on, the circle on its upturned face
      for (let y = 1; y < 8; y++) for (let x = 2 + (y < 3 ? 2 : 0); x < 30 - (y < 3 ? 2 : 0); x++) { const n = ((x * 7 + y * 3) % 7) * 3; px(x, y, y === 1 ? 150 + n : 118 + n, y === 1 ? 146 + n : 114 + n, y === 1 ? 134 + n : 104 + n); }
      for (let x = 12; x < 20; x++) px(x, 1, 86, 84, 78);
    });
    mk('p47_pebbles', 24, 12, 0.3, (px) => {   // a hollow of chalked river-stones
      for (let y = 6; y < 12; y++) for (let x = 2; x < 22; x++) if ((x - 12) * (x - 12) / 100 + (y - 9) * (y - 9) / 9 < 1) px(x, y, 52, 60, 40);
      for (let i = 0; i < 26; i++) { const x = 4 + ((i * 7) % 16), y = 5 + ((i * 5) % 6); px(x, y, 150 + (i % 4) * 12, 146 + (i % 4) * 10, 136 + (i % 3) * 8); px(x + 1, y, 136, 132, 122); if (i % 3 === 0) px(x, y - 1, 236, 236, 228); }
    });
  }

  // ================================================================ the map (new: always built)
  const stoneAt = (i) => { const a = -PI / 2 + i * (PI / 4); return { x: RING.x + Math.cos(a) * RING.r, y: RING.y + Math.sin(a) * RING.r }; };
  const PEBBLES = (() => { const s = stoneAt(0); return { x: s.x, y: s.y + 1.15 }; })();
  function buildStones() {
    const woods = (typeof Engine !== 'undefined' && Engine.textures && Engine.textures.p17p_woods) ? 'p17p_woods' : 't_hedge';
    const m = new GameMap(MAP, TX.name, W, H, {
      outdoor: true, floor: 't_grass', floorTextures: ['t_grass', 't_moss', 't_water', 't_stone'], fogDist: 17, fogColor: [52, 58, 54], ambient: 0,
      music: 'wild', danger: 1, spawn: { x: 1.6, y: 15.5, dir: 0 },
    });
    m.border(woods);
    m.hill(RING.x, RING.y, 9.5, 8.5, 0.32);   // the ring stands on a low rise, the way it reads on the skyline
    m.set(0, 15, DOOR({ tex: 't_hedge', portal: { map: CLEARING, x: GAP[0] - 1.6, y: GAP[1] + 0.5, dir: PI }, label: TX.toClearing }));
    // the track from the gap to the ring, worn to moss
    for (let x = 1; x < RING.x - RING.r + 1; x++) { m.setFloor(x, 15, 1); if (x % 3 === 0) m.setFloor(x, 14, 1); }
    // the ring's floor: worn turf inside, moss at the stones
    for (let y = 8; y < 23; y++) for (let x = 11; x < 27; x++) { const d = Math.hypot(x + 0.5 - RING.x, y + 0.5 - RING.y); if (Math.abs(d - RING.r) < 0.9) m.setFloor(x, y, 1); }
    for (let i = 0; i < 8; i++) {
      const p = stoneAt(i);
      if (i === 7) { m.deco('p47_fallen', p.x, p.y, { solid: false, scale: 1.25, radius: 0.6, label: STONE_NAME[i], use: 'p47_stone', stone: i }); continue; }
      const sprite = i === 0 ? 'p47_stone_tall' : 'p47_stone' + (i % 3);
      m.deco(sprite, p.x, p.y, { solid: true, scale: i === 0 ? 1.3 : 1.18, radius: 0.42, label: STONE_NAME[i], use: 'p47_stone', stone: i });
    }
    m.deco('p47_pebbles', PEBBLES.x, PEBBLES.y, { solid: false, scale: 0.9, radius: 0.35, label: TX.pebbles, use: 'p47_pebbles' });
    // the country round it: oaks and thorn at the edges, a pool where the ground is wet, a hound-bed to the east
    for (const [x, y, s] of [[4.5, 4.5, 1.7], [8.5, 25.5, 1.8], [27.5, 5.5, 1.6], [30.5, 24.5, 1.9], [5.5, 9.0, 1.5], [12.0, 3.0, 1.6], [24.0, 26.5, 1.7], [31.0, 12.5, 1.5]]) m.deco('oak', x, y, { scale: s, radius: 0.45 });
    for (const [x, y] of [[2.5, 22.5], [3.5, 26.5], [14.5, 27.0], [29.5, 2.5], [32.0, 18.5], [20.5, 2.0]]) m.deco('p20_thorn', x, y, { scale: 0.9, radius: 0.4 });
    for (const [x, y] of [[6, 20], [7, 20], [6, 21], [7, 21], [8, 21]]) m.setFloor(x, y, 2);
    m.deco('bones', 29.5, 20.5, { radius: 0.3, scale: 0.5, solid: false });
    m.enemy('hound', 30.5, 8.5); m.enemy('hound', 28.5, 26.0);
    m.item('honey', 3.5, 3.5);
    m.baseCount = m.entities.length;
    return m;
  }
  function syncGap(cl) {
    if (!cl || cl.id !== CLEARING || cl.w !== 40 || cl.h !== 36) return;
    const c = cl.get(GAP[0], GAP[1]);
    if (!c || !c.portal || c.portal.map !== MAP) cl.set(GAP[0], GAP[1], DOOR({ tex: 't_hedge', portal: { map: MAP, x: 1.6, y: 15.5, dir: 0 }, label: TX.toStones }));
  }
  function buildMaps(maps) {
    if (!maps[MAP]) maps[MAP] = buildStones();
    syncGap(maps[CLEARING]);
  }

  // ================================================================ "Counted in Eights"
  const stage = () => { const v = Number(F().p47_q); return Number.isFinite(v) ? Math.max(0, Math.min(2, Math.floor(v))) : 0; };
  const count = () => { const v = Number(F().p47_n); return Number.isFinite(v) ? Math.max(0, Math.min(7, Math.floor(v))) : 0; };
  const T = { holding: false };
  function usePebbles() {
    if (stage() === 2) { showEvent(TX.pebbles, TX.alreadySung, [{ t: TX.leave, f: null }]); return; }
    if (stage() === 1 || gone()) { showEvent(TX.pebbles, TX.pebblesLook + (gone() ? '' : '<br><br>' + TX.pebblesHow), [{ t: TX.leave, f: null }]); return; }
    showEvent(TX.pebbles, TX.pebblesLook, [{ t: TX.pebblesStart, f: start }, { t: TX.leave, f: null }]);
  }
  function start() {
    const f = F(); if (stage() !== 0 || gone()) return;
    f.p47_q = 1; f.p47_n = 0;
    try { journal('side', TX.jStart); } catch (e) { /* none */ }
    say(TX.pebblesHow, 'warn', 6000);
  }
  function useStone(e) {
    const i = Math.max(0, Math.min(7, Math.floor(Number(e.stone) || 0)));
    const body = STONES[i][2];
    if (stage() !== 1 || gone()) { showEvent(STONE_NAME[i], body, [{ t: TX.leave, f: null }]); return; }
    const n = count();
    if (i !== n) { showEvent(STONE_NAME[i], body + '<br><br>' + SUNWISE[n], [{ t: TX.leave, f: null }]); return; }
    if (i === 7) { showEvent(STONE_NAME[i], body, [{ t: TX.letGo, f: finish }, { t: TX.leave, f: null }]); return; }
    showEvent(STONE_NAME[i], body, [{ t: TX.holdAt, f: () => { setTimeout(() => holdAt(i), 0); } }, { t: TX.leave, f: null }]);
  }
  async function holdAt(i) {
    if (T.holding || stage() !== 1 || count() !== i || i > 6) return;
    T.holding = true;
    let res = null;
    try {
      const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
      if (!Rd) res = { score: 1 };
      else {
        const hz = STONES[i][1];
        const curve = [[0, hz * 1.05], [1.2, hz], [3.0, hz * 1.008], [HOLD_SECS, hz * 0.996]];
        const band = typeof Rd.bandFor === 'function' ? Rd.bandFor(0) * 1.2 : 110;
        res = await Rd.holdPitch({ curve, width: band, duration: HOLD_SECS, title: HOLD_TITLE[i], hint: TX.holdHint });
      }
    } catch (e) { warnOnce('hold', e); res = null; }
    T.holding = false;
    try { if (G.state !== 'play' && !G.openPanel) G.state = 'play'; } catch (e) { /* ok */ }
    if (!res || res.aborted) { say(TX.putDown, '', 3000); return; }
    const f = F();
    if (!(res.score >= PASS)) { f.p47_n = 0; noise(3.5); say(TX.tooLoud, 'warn', 6000); return; }
    f.p47_n = i + 1; noise(0.9);
    say(fmt(TX.held, i + 1), 'good', 3500);
  }
  function finish() {
    const f = F(); if (stage() !== 1 || count() !== 7) return;
    f.p47_q = 2;
    try { questXp(XP); } catch (e) { /* no xp */ }
    try { journal('side', TX.jDone); } catch (e) { /* none */ }
    say(TX.sungOutMsg, 'good', 4000);
    showEvent(STONE_NAME[7], TX.sungOut, [{ t: TX.leave, f: null }]);
  }
  function closeAtLeaving() {
    if (!gone()) return;
    const f = F(); if (stage() !== 1 || f.p47_closed) return;
    f.p47_closed = true;
    try { journal('side', TX.jClosed); } catch (e) { /* none */ }
  }

  // ================================================================ uses, tick, wiring
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p47_') !== 0) return false;
    if (e.use === 'p47_stone') { useStone(e); return true; }
    if (e.use === 'p47_pebbles') { usePebbles(); return true; }
    return false;
  }
  const said = {};
  function tick() {
    if (!hasG() || G.state !== 'play' || guest()) return;
    try { closeAtLeaving(); } catch (e) { warnOnce('close', e); }
  }
  function onLoad() {
    if (!hasG()) return;
    try {
      if (G.maps) syncGap(G.maps[CLEARING]);
      if (here() === MAP && !said[G.day]) { said[G.day] = true; say(TX.entered, 'warn', 6000); }
    } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); onLoad(); return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('stones47 failed to wire', e); }

  return { TX, MAP, GAP, RING, STONES, STONE_NAME, PEBBLES, TEXTS, stoneAt, stage, count, useOwn, holdAt, finish, closeAtLeaving, syncGap };
})();
if (typeof window !== 'undefined') window.STONES47 = STONES47;
