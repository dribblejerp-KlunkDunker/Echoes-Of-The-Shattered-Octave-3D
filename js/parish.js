// ============================================================
//  parish — Phase 9 (new gameplay systems), team PARISH: "The Third Parish".
//
//  Tobin's register (page 10) says the Cantors of the three nearest parishes were called to the Greenhall; two came;
//  the third sent a note that said only "We have stopped being able to send." This module builds the third parish:
//    * access: a topic "The third parish" (Harrow, Ignatius; a road topic on Harrow), a hedge-gap door on the
//      clearing's east side and a world-map waypoint, all closed by one line when the Greening comes;
//    * three hand-built linked maps registered through a buildAllMaps wrapper: Greenroot (village edge, outdoors:
//      cottages, reed-beds, a silent reed over every door, a well, a churchyard knoll), the chapel interior, and the
//      undercroft (ossuary, bell rail, sung-note wall, drained-by-lever flooded crypt, reed gate, hush-lamps);
//    * the story is told by absence: laid tables, a cold kettle, a register open on a lectern whose last line just
//      stops. The Hush is never shown or described. No bodies. Overgrowth only as a mirror grown into a doorframe;
//    * two new foes with procedural art in every pose: the Mire-drone (outdoors, wallowing, not aggressive, a
//      positional drone that raises "despair") and the Fret-crawler (undercroft, invisible on stone until it moves;
//      its hit severs intervals, so no Song can be cast for about 20 s);
//    * the ending: the register goes to Ignatius (the Church files it) or to Lyra (she keeps it); two later
//      consequence lines through the existing courier / Gazette / rumour / epilogue hooks; a modest unique item.
//
//  State: G.flags only, prefix p9p_, booleans and small integers, validated on every read. The sever timer and the
//  despair level are transient (never saved). Saved entity indexes stay aligned: the new maps are built
//  deterministically and their baseCount set once; nothing is inserted into an old map's entity list.
//  Security: no markup is built from saves or flags; all text comes from the constant tables below.
//  Art: procedural stand-ins (canvas painting, cached once). Setting: UPG.p9Despair (Options > Graphics & access).
//  Anything marked [PROPOSED] is invention beyond LORE_P6.md and the game's own text.
// ============================================================
'use strict';

if (typeof UPG !== 'undefined' && UPG.p9Despair === undefined) UPG.p9Despair = true;

const PARISH = (function () {
  const FP = 'p9p_';
  const SEVER_SECS = 20;                 // how long a Fret-crawler's hit cuts the intervals
  const MAPS = ['greenroot', 'greenroot_chapel', 'greenroot_crypt'];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  const flag = (k) => { const f = flags(); return has(f, FP + k) && f[FP + k] === true; };
  const setFlag = (k) => { flags()[FP + k] = true; };
  const greening = () => { const f = flags(); return has(f, 'greening') && !!f.greening; };
  const despairOn = () => typeof UPG === 'undefined' || UPG.p9Despair !== false;
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion || GFX.noFlash); } catch (e) { return false; } };
  const now = () => (typeof G !== 'undefined' && typeof G.time === 'number') ? G.time : 0;

  // transient state: never saved, rebuilt from play
  const T = { sever: 0, despair: 0, bells: 0, lastDrone: null, wasSevered: false, hintAt: 0 };

  // ---------------------------------------------------------------- art (procedural stand-ins)
  const rng = typeof mulberry32 === 'function' ? mulberry32 : (a) => () => (a = (a * 16807) % 2147483647) / 2147483647;
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    const id = x.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill, stroke) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); } };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };

  function paintProps() {
    // the well: a low stone ring, two posts, a small roof, a bucket on its rope
    addSprite('p9p_well', 72, 88, (x) => {
      E(x, 36, 80, 30, 7, 'rgba(0,0,0,0.35)');
      R(x, 9, 40, 54, 38, VG(x, 40, 78, '#8a8479', '#55504a'));
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const off = r % 2 ? 4 : 0; R(x, 10 + c * 9 + off, 42 + r * 9, 7, 6, `rgba(${40 + ((r * 7 + c * 13) % 5) * 7},${38 + ((r * 5 + c * 11) % 4) * 6},${34},0.4)`); }
      E(x, 36, 40, 27, 8, '#9a948a'); E(x, 36, 40, 21, 5, '#0d0f10'); E(x, 36, 42, 15, 3, '#1c2a2c');
      R(x, 10, 6, 5, 40, '#4b3a28'); R(x, 57, 6, 5, 40, '#4b3a28'); R(x, 9, 5, 54, 5, '#5b4630');
      P(x, [[2, 8], [36, -2], [70, 8], [62, 14], [10, 14]], '#6a5a3a', '#2a2014');
      L(x, 36, 10, 36, 32, '#7a6a48', 1.2); R(x, 32, 32, 8, 7, '#6e5a3a'); R(x, 32, 32, 8, 2, '#8a7650');
    });
    // a wind-reed hung above a door on its cord: it does not move, and it does not sound
    addSprite('p9p_doorreed', 20, 80, (x) => {
      R(x, 8, 0, 4, 3, '#5a4a38'); L(x, 10, 3, 10, 14, '#7a6a50', 1);
      x.fillStyle = VG(x, 14, 76, '#d8d2a0', '#a8a070'); x.beginPath(); x.moveTo(6, 14); x.lineTo(14, 14); x.lineTo(12.5, 76); x.lineTo(7.5, 76); x.closePath(); x.fill();
      L(x, 6, 14, 7.5, 76, 'rgba(70,60,30,0.6)', 1); L(x, 14, 14, 12.5, 76, 'rgba(255,250,220,0.45)', 1);
      R(x, 8.5, 48, 3, 9, '#2e2a1a'); for (const y of [26, 38, 62]) L(x, 6.5, y, 13.5, y, 'rgba(70,60,30,0.5)', 1);
    });
    // a trestle table laid for a meal: cloth, bowls, cups, a jug. Nobody is sitting at it.
    addSprite('p9p_table', 128, 72, (x) => {
      E(x, 64, 66, 54, 5, 'rgba(0,0,0,0.3)');
      R(x, 10, 40, 5, 26, '#4a3826'); R(x, 113, 40, 5, 26, '#4a3826'); R(x, 22, 44, 4, 20, '#3a2c1e'); R(x, 102, 44, 4, 20, '#3a2c1e');
      P(x, [[4, 36], [124, 36], [118, 46], [10, 46]], VG(x, 36, 46, '#d7d2c0', '#aaa590'), '#6a6454');
      P(x, [[10, 46], [118, 46], [118, 51], [10, 51]], '#8e8a78');
      for (let i = 0; i < 6; i++) { const bx = 18 + i * 18; E(x, bx, 36, 7, 2.6, '#cfc8b0'); E(x, bx, 36, 5, 1.7, '#3e3426'); E(x, bx, 35.4, 5, 1.2, '#7a6a4a'); }
      for (let i = 0; i < 6; i++) { const cx = 27 + i * 18; R(x, cx - 2, 28, 4, 6, '#9a7a4a'); E(x, cx, 28, 2, 0.9, '#5a4428'); }
      R(x, 61, 22, 8, 13, '#7a6a52'); E(x, 65, 22, 4, 1.4, '#4a3c2a'); R(x, 69, 26, 3, 6, '#7a6a52');
    });
    // a kettle on its trivet, long cold, and one cup beside it
    addSprite('p9p_kettle', 40, 40, (x) => {
      E(x, 20, 36, 15, 3, 'rgba(0,0,0,0.35)');
      R(x, 8, 31, 24, 3, '#2a2622'); R(x, 10, 33, 2, 4, '#2a2622'); R(x, 28, 33, 2, 4, '#2a2622');
      x.beginPath(); x.moveTo(9, 31); x.quadraticCurveTo(7, 19, 18, 17); x.quadraticCurveTo(30, 19, 31, 31); x.closePath(); x.fillStyle = VG(x, 17, 31, '#4a4640', '#1e1c1a'); x.fill();
      E(x, 19, 17, 6, 2, '#2c2a26'); R(x, 17, 13, 4, 3, '#1c1a18');
      x.beginPath(); x.moveTo(30, 24); x.quadraticCurveTo(38, 20, 36, 12); x.strokeStyle = '#2a2824'; x.lineWidth = 2.2; x.stroke();
      x.beginPath(); x.arc(19, 17, 9, Math.PI, 0); x.strokeStyle = '#2a2824'; x.lineWidth = 1.4; x.stroke();
      R(x, 33, 30, 5, 4, '#a08a60'); R(x, 33, 30, 5, 1, '#c4ae80');
    });
    // a pew
    addSprite('p9p_pew', 120, 64, (x) => {
      E(x, 60, 58, 50, 4, 'rgba(0,0,0,0.3)');
      R(x, 8, 8, 104, 30, VG(x, 8, 38, '#5a4630', '#3e2f20')); for (let i = 0; i < 6; i++) R(x, 14 + i * 17, 10, 2, 26, 'rgba(0,0,0,0.25)');
      R(x, 6, 36, 108, 8, '#6a5438'); R(x, 6, 36, 108, 2, '#8a7050');
      R(x, 10, 44, 6, 14, '#3e2f20'); R(x, 104, 44, 6, 14, '#3e2f20');
    });
    // the lectern, with the register open on it and a reed lying across the page
    addSprite('p9p_lectern', 72, 104, (x) => {
      E(x, 36, 98, 22, 4, 'rgba(0,0,0,0.35)');
      R(x, 30, 52, 12, 44, VG(x, 52, 96, '#5a4630', '#3a2c1e')); R(x, 20, 94, 32, 5, '#3e2f20');
      P(x, [[8, 28], [64, 28], [60, 54], [12, 54]], VG(x, 28, 54, '#6a5438', '#4a3826'), '#2a2014');
      P(x, [[14, 20], [36, 24], [36, 46], [14, 42]], '#e6dfc4', '#8a8062'); P(x, [[36, 24], [58, 20], [58, 42], [36, 46]], '#efe8cd', '#8a8062');
      for (let i = 0; i < 6; i++) { L(x, 17, 24 + i * 3, 33, 27 + i * 3, 'rgba(60,45,25,0.55)', 0.8); L(x, 39, 27 + i * 3, 55, 23 + i * 3, 'rgba(60,45,25,0.55)', 0.8); }
      L(x, 39, 38, 49, 37, 'rgba(60,45,25,0.55)', 0.8);   // the last line: it stops
      L(x, 12, 38, 58, 30, '#cfc890', 2.6); L(x, 12, 38, 58, 30, 'rgba(120,110,60,0.6)', 0.8); R(x, 11, 36, 3, 4, '#5a4a38');
    });
    // a hung hand-bell
    addSprite('p9p_bell', 44, 72, (x) => {
      R(x, 4, 4, 36, 4, '#3a2c1e'); R(x, 20, 8, 4, 8, '#4a3a26');
      x.beginPath(); x.moveTo(12, 54); x.quadraticCurveTo(10, 30, 22, 17); x.quadraticCurveTo(34, 30, 32, 54); x.closePath(); x.fillStyle = VG(x, 17, 54, '#c9a45a', '#6e5226'); x.fill();
      E(x, 22, 54, 11, 3, '#8a6a30'); E(x, 22, 54, 8, 1.6, '#2a1c0c'); L(x, 15, 22, 13, 50, 'rgba(255,240,190,0.4)', 1.4);
      E(x, 22, 60, 2.6, 3, '#5a4018');
    });
    // a wall niche with a reed hung in it, and nothing else of note
    addSprite('p9p_niche', 72, 96, (x) => {
      x.beginPath(); x.moveTo(6, 92); x.lineTo(6, 36); x.quadraticCurveTo(36, -6, 66, 36); x.lineTo(66, 92); x.closePath(); x.fillStyle = '#7e7a70'; x.fill();
      x.beginPath(); x.moveTo(14, 90); x.lineTo(14, 38); x.quadraticCurveTo(36, 8, 58, 38); x.lineTo(58, 90); x.closePath(); x.fillStyle = VG(x, 8, 90, '#0e0f11', '#1c1b1b'); x.fill();
      R(x, 14, 82, 44, 8, '#4a4740');
      L(x, 36, 14, 36, 22, '#6a5a40', 1); x.fillStyle = '#c9c394'; x.beginPath(); x.moveTo(33, 22); x.lineTo(39, 22); x.lineTo(38, 62); x.lineTo(34, 62); x.closePath(); x.fill();
      R(x, 35, 44, 2, 6, '#2a2618');
      for (let i = 0; i < 5; i++) E(x, 20 + i * 8, 80 - (i % 2) * 2, 4.2, 3.2, '#bdb59e');
    });
    // a doorframe with a hand-mirror grown into the wood: the only overgrowth in the village [PROPOSED]
    addSprite('p9p_mirror', 64, 104, (x) => {
      R(x, 22, 4, 20, 98, VG(x, 4, 102, '#5a4630', '#3a2c1e')); R(x, 22, 4, 3, 98, 'rgba(255,230,180,0.18)');
      L(x, 30, 10, 28, 96, 'rgba(0,0,0,0.3)', 1); L(x, 36, 8, 37, 98, 'rgba(0,0,0,0.25)', 1);
      E(x, 32, 50, 11, 14, '#4a3a24'); E(x, 32, 50, 9, 12, VG(x, 38, 62, '#a8bfc0', '#5a7678')); L(x, 26, 44, 33, 38, 'rgba(255,255,255,0.55)', 1.2);
      x.strokeStyle = '#3f6a2c'; x.lineWidth = 2.2;
      for (const [sx, sy, ex, ey, cx, cy] of [[22, 100, 18, 60, 10, 80], [18, 60, 26, 40, 14, 48], [42, 98, 46, 64, 52, 82], [46, 64, 38, 42, 52, 50], [30, 38, 24, 22, 20, 30]]) { x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(cx, cy, ex, ey); x.stroke(); }
      for (const [lx, ly] of [[14, 52], [24, 40], [50, 54], [40, 44], [22, 24], [16, 76], [48, 80]]) E(x, lx, ly, 3.4, 1.9, '#5f9a3e', 0.6);
    });
    // a flood-gate valve: iron wheel on a pipe
    addSprite('p9p_valve', 56, 84, (x) => {
      E(x, 28, 80, 18, 3.4, 'rgba(0,0,0,0.35)');
      R(x, 24, 34, 8, 46, VG(x, 34, 80, '#4a4c4c', '#26282a')); R(x, 16, 74, 24, 6, '#3a3c3c');
      x.beginPath(); x.arc(28, 28, 20, 0, Math.PI * 2); x.strokeStyle = '#5a5e5e'; x.lineWidth = 4; x.stroke();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; L(x, 28, 28, 28 + Math.cos(a) * 20, 28 + Math.sin(a) * 20, '#4a4e4e', 3); }
      E(x, 28, 28, 5, 5, '#6a6e6e'); L(x, 12, 18, 20, 12, 'rgba(255,255,255,0.3)', 1.5);
      R(x, 10, 44, 4, 3, '#4a6a50'); R(x, 40, 52, 5, 3, '#4a6a50');
    });
    // a small pair of boots, set side by side on a step. No one is in them.
    addSprite('p9p_boots', 36, 24, (x) => {
      E(x, 18, 21, 14, 2.4, 'rgba(0,0,0,0.3)');
      for (const bx of [6, 20]) {
        x.beginPath(); x.moveTo(bx, 8); x.lineTo(bx + 8, 8); x.lineTo(bx + 8, 16); x.quadraticCurveTo(bx + 13, 17, bx + 12, 21); x.lineTo(bx - 1, 21); x.closePath(); x.fillStyle = VG(x, 8, 21, '#6a4a30', '#3a2818'); x.fill();
        R(x, bx - 1, 20, 14, 2, '#251a10'); L(x, bx + 1, 11, bx + 7, 11, 'rgba(255,230,180,0.35)', 1);
      }
    });
    // a small cloth-covered basket of bread, cold and a day old, left on a sill
    addSprite('p9p_bread', 36, 28, (x) => {
      E(x, 18, 25, 14, 2.4, 'rgba(0,0,0,0.3)');
      x.beginPath(); x.moveTo(4, 12); x.lineTo(32, 12); x.lineTo(28, 24); x.lineTo(8, 24); x.closePath(); x.fillStyle = VG(x, 12, 24, '#8a6a3a', '#5a4020'); x.fill();
      for (let i = 0; i < 5; i++) L(x, 7 + i * 5, 13, 9 + i * 4, 23, 'rgba(40,25,10,0.4)', 1);
      x.beginPath(); x.moveTo(3, 12); x.quadraticCurveTo(18, 0, 33, 12); x.closePath(); x.fillStyle = '#d8d0b8'; x.fill();
      L(x, 8, 9, 28, 9, 'rgba(120,110,90,0.5)', 1);
    });
    // inventory art: the register (a slim book with a clasp-strap) and the reed-case
    addSprite('p9p_regbook', 28, 28, (x) => {
      R(x, 4, 5, 20, 19, '#5a3f26'); R(x, 4, 5, 3, 19, '#3a2814'); R(x, 7, 7, 15, 15, '#7a5a38'); R(x, 22, 8, 2, 12, '#cdbf92');
      R(x, 4, 13, 20, 3, '#3a2814'); R(x, 11, 12, 6, 5, '#b49a52'); L(x, 9, 9, 20, 9, 'rgba(255,240,200,0.35)', 1);
    });
    addSprite('p9p_reedcase', 28, 28, (x) => {
      R(x, 3, 10, 22, 11, VG(x, 10, 21, '#7a5230', '#4a2e16')); R(x, 3, 10, 22, 3, '#8c6038'); R(x, 12, 12, 4, 7, '#b49a52');
      L(x, 6, 9, 22, 9, '#cfc890', 1.6); L(x, 8, 8, 20, 8, '#bdb680', 1.4); R(x, 3, 20, 22, 1, '#2a1a0c');
    });
  }

  // wall texture: the grooved reed-stone the sung wall is made of. Each groove is cut to a pitch. (procedural stand-in)
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || Engine.textures.p9p_reedstone || !Engine.textures.t_catacomb) return;
    const src = Engine.textures.t_catacomb, d = new Uint32Array(src.length);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const p = src[y * 64 + x]; let r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255;
      const col = x % 8;
      if (col === 3 || col === 4) { const k = col === 3 ? 0.62 : 1.12; r *= k; g *= k; b *= k; }
      if (y % 32 === 0) { r *= 0.7; g *= 0.7; b *= 0.7; }
      g = Math.min(255, g * 1.06 + 4); b = Math.min(255, b * 1.04 + 3);   // a faint teal
      d[y * 64 + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    }
    Engine.addTexture('p9p_reedstone', d);
  }

  // ---------------------------------------------------------------- the two new foes (procedural stand-ins, five poses each)
  const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
  // Mire-drone: low, wallowing, bovine-sized; a hide the colour of the bank it lies in, a slit mouth lined with reed-like
  // plates (it is what drones). Idle breathes; walk shifts the legs; a1 rears the head; a2 lunges it forward.
  function paintDrone(x, w, h, pose) {
    const bob = pose === '_w1' ? -2 : pose === '_w2' ? 2 : pose === '_a1' ? 3 : pose === '_a2' ? 6 : 0;
    const leg = pose === '_w1' ? 5 : pose === '_w2' ? -5 : 0;
    const hy = pose === '_a1' ? -12 : pose === '_a2' ? 8 : 0, hx = pose === '_a2' ? 8 : 0, gape = pose === '_a2' ? 8 : pose === '_a1' ? 4 : 1.5;
    const r = rng(77);
    E(x, 72, 88, 62, 7, 'rgba(18,20,14,0.55)');                                  // the mud it sits in
    for (const [lx, ly, s] of [[34, 78, 1], [54, 82, -1], [92, 82, 1], [110, 78, -1]]) {
      const ox = leg * s; R(x, lx + ox - 7, ly - 4, 14, 14, VG(x, ly, ly + 10, '#3c4034', '#23251c')); E(x, lx + ox, ly + 10, 9, 3.4, '#2a2418');
    }
    E(x, 72, 56 + bob, 58, 32, VG(x, 24, 88, '#566048', '#2a2f24'));             // body
    E(x, 72, 66 + bob, 56, 22, 'rgba(48,40,26,0.55)');                           // mud-streaked belly
    for (let i = 0; i < 9; i++) { const px = 24 + i * 12, py = 30 + bob + Math.abs(i - 4) * 2.4; P(x, [[px - 5, py + 7], [px, py - 3], [px + 5, py + 7]], '#7a8458', '#2c3220'); }   // spine plates
    for (let i = 0; i < 26; i++) { const px = 20 + r() * 104, py = 38 + r() * 40 + bob; E(x, px, py, 2 + r() * 4, 1 + r() * 2, `rgba(${30 + (r() * 30 | 0)},${34 + (r() * 24 | 0)},${22},0.5)`); }
    L(x, 34, 40 + bob, 90, 34 + bob, 'rgba(190,215,205,0.28)', 2); L(x, 40, 48 + bob, 70, 44 + bob, 'rgba(190,215,205,0.18)', 1.4);   // wet sheen
    // the head: low and forward, brow-heavy, eyes small and dull
    E(x, 72 + hx, 70 + bob + hy, 25, 19, VG(x, 52, 90, '#5c6650', '#2c3126'));
    E(x, 72 + hx, 60 + bob + hy, 22, 7, '#2a2e22');
    E(x, 62 + hx, 63 + bob + hy, 3, 2.2, '#b79a4a'); E(x, 82 + hx, 63 + bob + hy, 3, 2.2, '#b79a4a');
    E(x, 62 + hx, 63 + bob + hy, 1.2, 1.2, '#1a1608'); E(x, 82 + hx, 63 + bob + hy, 1.2, 1.2, '#1a1608');
    E(x, 72 + hx, 77 + bob + hy + gape * 0.4, 14, 3 + gape, '#150f0c');
    for (let i = -6; i <= 6; i++) L(x, 72 + hx + i * 2, 76 + bob + hy, 72 + hx + i * 2, 76 + bob + hy + 3 + gape, '#c9c394', 1);   // the reed-plates
    E(x, 72 + hx, 70 + bob + hy, 3, 1.6, '#1a1a14');
  }
  // Fret-crawler: flat and broad, the grey of the flagstones it lies on, its carapace ridged with parallel frets;
  // six jointed legs and a small pale head with two pincers. a1 raises the front; a2 lunges with the pincers wide.
  function paintCrawler(x, w, h, pose) {
    const step = pose === '_w1' ? 4 : pose === '_w2' ? -4 : 0, up = pose === '_a1' ? -8 : pose === '_a2' ? 2 : 0, stretch = pose === '_a2' ? 10 : 0, claw = pose === '_a2' ? 13 : pose === '_a1' ? 9 : 5;
    E(x, 72, 62, 58, 5, 'rgba(0,0,0,0.35)');
    x.strokeStyle = '#4a463e'; x.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      const bx = 72 + s * (14 + i * 9), by = 46 + i * 2, k = (i % 2 ? -1 : 1) * step * s;
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + s * (16 + k), by + 4 - (pose === '_a1' && i === 0 ? 10 : 0)); x.lineTo(bx + s * (26 + k * 1.4), by + 16); x.stroke();
    }
    x.beginPath(); x.ellipse(72 - stretch * 0.2, 46 + up * 0.4, 52 + stretch * 0.4, 17, 0, 0, Math.PI * 2); x.fillStyle = VG(x, 30, 62, '#7a7468', '#403c34'); x.fill();
    x.beginPath(); x.ellipse(72 - stretch * 0.2, 44 + up * 0.4, 48 + stretch * 0.4, 12, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(160,154,140,0.35)'; x.fill();
    for (let i = -8; i <= 8; i++) {             // the frets: fine ridges across the shell
      const fx = 72 + i * 5.4 - stretch * 0.2, hh = 12 * Math.sqrt(Math.max(0, 1 - (i / 9.6) * (i / 9.6)));
      L(x, fx, 44 + up * 0.4 - hh, fx, 44 + up * 0.4 + hh + 3, i % 2 ? 'rgba(210,204,186,0.5)' : 'rgba(50,46,38,0.55)', 1.2);
    }
    L(x, 22 - stretch * 0.2, 44 + up * 0.4, 122 - stretch * 0.2, 44 + up * 0.4, 'rgba(40,36,30,0.5)', 1);
    const hx = 72 + 46 + stretch * 0.6, hy = 46 + up;          // head, at the right: the crawler faces its prey
    E(x, hx, hy, 9, 7, '#bdb7a4'); E(x, hx + 2, hy - 1, 1.6, 1.6, '#201c14');
    x.strokeStyle = '#d8d2bc'; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(hx + 4, hy + 2); x.quadraticCurveTo(hx + 10 + claw * 0.4, hy + 6 + claw * 0.5, hx + 6 + claw, hy + 10 + claw * 0.4); x.stroke();
    x.beginPath(); x.moveTo(hx + 4, hy - 3); x.quadraticCurveTo(hx + 10 + claw * 0.4, hy - 6 - claw * 0.3, hx + 6 + claw, hy - 5 - claw * 0.4); x.stroke();
  }
  function paintFoes() {
    for (const pose of POSES) {
      addSprite('miredrone' + pose, 144, 96, (x, w, h) => paintDrone(x, w, h, pose), { hs: 1, cx: 0.5, dy: 0 });
      addSprite('fretcrawler' + pose, 144, 72, (x, w, h) => paintCrawler(x, w, h, pose), { hs: 1, cx: 0.5, dy: 0 });
    }
  }

  // ---------------------------------------------------------------- catalogue: items, enemies, topics, voices
  // All of it constant text. Everything marked [PROPOSED] is mine; see TEXT.md.
  const ITEM_DEFS = {
    // the quest object: the Cantor's register [PROPOSED name: Mabyn Verrow, Cantor of Greenroot; Ilse Brennan is canon (Book Four)]
    p9_greenroot_register: { name: 'The Greenroot Register', sprite: 'p9p_regbook', key: true,
      desc: 'Cantor Mabyn Verrow\'s parish register, a slim book strapped shut. The last entries are in a careful hand, and the last line stops. Somebody should have it who will read it through.' },
    // the unique modest reward: Songs cost a little less to sing while it is in your pack
    p9_verrow_reedcase: { name: 'Verrow\'s Tuning-Reed Case', sprite: 'p9p_reedcase', key: true,
      desc: 'A flat leather case of spare reeds, each tuned against a Cantor\'s own breastbone and long dead, as cut reeds are. It has a way of settling the breath. While you carry it, every Song costs you about a quarter less voice.' },
  };
  const ENEMY_DEFS = {
    miredrone: { name: 'Mire-drone', sprite: 'miredrone', hp: 30, dmg: [3, 7], speed: 0.75, reach: 1.25, scale: 0.95, xp: 26, drone: true,
      desc: 'A low, wallowing beast the size of a calf, the colour of the bank it lies in. It does not hunt. It hums, one note, under hearing, and everything near it gets a little heavier. Leave it be, or put it down.' },
    fretcrawler: { name: 'Fret-crawler', sprite: 'fretcrawler', hp: 20, dmg: [3, 6], speed: 2.05, reach: 1.0, scale: 0.62, xp: 30, sever: true, ambush: true,
      desc: 'Flat as a flagstone and the same grey, with a shell ridged like the neck of a lute. You do not see it until it moves. What it bites it cuts: after it, no Song will hold its pitch for a while.' },
  };
  const LOOT_DEFS = {
    miredrone: { chance: 0.35, table: [['honey', 40], ['tonic', 40], ['sovereigns', 20]] },
    fretcrawler: { chance: 0.3, table: [['v_scrap', 50], ['sovereigns', 30], ['pellets', 20]] },
  };
  // the third parish, asked of Harrow about the Greenroot road, and then asked after as itself
  const TOPIC_ROAD = 'The Greenroot road';
  const TOPIC_PARISH = 'The third parish';
  const TOPIC_DEFS = {
    [TOPIC_ROAD]: {
      low: 'East out of the clearing, between the oaks, the old cart-road. It goes to Greenroot. Nobody has been down it since the Cantors were called. Mind the wet ground; there is something in the reed-beds that makes a man sad enough to sit down in it.',
      high: 'The Greenroot road leaves the clearing by the east hedge and runs three miles to the parish on the Flume, past the reed-beds. The Church came up it. Nobody has gone down it since the summer the third Cantor sent her note.',
    },
    [TOPIC_PARISH]: {
      low: 'Greenroot. Three miles east by the road, off the clearing, outside the Hedge. They sent no word after the summer. I do not ask. You should not either, in a loud voice.',
      high: 'Greenroot is the third parish Cantor Tobin called to the Greenhall. Two Cantors came. The third sent one line, and then nothing more, and the Reach has been politely not asking since.',
    },
  };
  const VOICE_DEFS = { miredrone: { f0: 52, fs: 0.72, style: 'beast' }, fretcrawler: { style: 'silent' } };

  function installCatalog() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = Object.assign({}, ITEM_DEFS[k]);
    if (typeof ENEMIES !== 'undefined') for (const k in ENEMY_DEFS) if (!ENEMIES[k]) ENEMIES[k] = Object.assign({}, ENEMY_DEFS[k]);
    if (typeof LOOT !== 'undefined') for (const k in LOOT_DEFS) if (!LOOT[k]) LOOT[k] = LOOT_DEFS[k];
    if (typeof TOPICS !== 'undefined') for (const k in TOPIC_DEFS) if (!TOPICS[k]) TOPICS[k] = Object.assign({}, TOPIC_DEFS[k]);
    if (typeof VOICES !== 'undefined' && VOICES.ENEMY_VOICES) for (const k in VOICE_DEFS) if (!VOICES.ENEMY_VOICES[k]) VOICES.ENEMY_VOICES[k] = Object.assign({}, VOICE_DEFS[k]);
    // the drone and the crawler move on all fours: the animation module's quadruped gait
    if (typeof ANIM !== 'undefined' && ANIM.quadruped) { ANIM.quadruped.add('miredrone'); ANIM.quadruped.add('fretcrawler'); }
    if (typeof READING !== 'undefined' && READING.SOURCES) {
      READING.SOURCES[REGISTER_TITLE] = { style: 'parch', kind: 'Register' };
    }
  }

  // ---------------------------------------------------------------- the three maps
  // Greenroot's text lives here, in constants. Names are [PROPOSED]: Mabyn Verrow (the Cantor), the Pell house.
  const DOORS = {
    // each cottage door carries what the room behind it says, by absence
    a: 'Through the crack of the shutter: a table laid for four. Four bowls, four spoons, a loaf gone hard as a roof-tile. All four chairs are pulled out, the way you pull them out when you mean to sit.',
    b: 'The door is shut, not locked. Through the window a kettle sits on its hob, and the hob is cold, and the water in the kettle has long since dried to a ring of white.',
    c: 'The Cantor\'s house. A cloak is gone from its peg and the peg is bare. A pen lies across an inkwell gone to a crust. The bed is made, by someone who expected to be back for it.',
    d: 'A pair of small boots stand side by side on the step. The door above is open by a hand\'s width. You do not push it.',
    e: 'Washing hangs in the yard on a line, dry, stiff and gone grey. Nobody has taken it in.',
    f: 'A loom stands in the window with a half-woven length still on it. The shuttle lies where the weaver put it down, on the sill, beside a bowl of something that was blackberries.',
  };
  const T_LABEL = {
    well: 'The village well. The rope is dry and the bucket is on its hook. The water at the bottom is perfectly still, and there is nothing in it.',
    table: 'A trestle table laid in the green for the whole village: bowl, cup and spoon at every place, a jug at the middle. The cloth has been rained on and dried and rained on. Nobody has taken a place.',
    reed: 'A wind-reed hung over the door on its cord, tuned to someone who lives here. It hangs perfectly straight. It does not sound.',
    mirror: 'A doorpost with a hand-mirror grown into the wood. The wood has closed over the rim of it, the way a tree closes over a nail. Your own face is in it, a little green at the edges.',
    boots: 'A pair of small boots, side by side on the step, laces tucked in.',
    bread: 'Bread in a cloth, left on a step for somebody to collect.',
    lamp: 'A hush-lamp, still burning on the last of its oil. The reed in it is the only thing in Greenroot that has not stopped.',
    grave: 'A grave, with a reed set in the ground at its head instead of a name. The reed is dry.',
    charnel: 'The charnel stair. Down to the ossuary, where Greenroot keeps its old dead.',
  };

  // --- Greenroot: outdoors. Road in from the west, cottages, the green and its well, a churchyard knoll with the chapel,
  // the charnel house, and the reed-beds along the Flume in the south. (36 x 28)
  function buildGreenroot() {
    const W = 36, H = 28;
    const m = new GameMap('greenroot', 'Greenroot', W, H, { outdoor: true, floor: 't_grass', floorTextures: ['t_grass', 't_shallows', 't_water', 't_cobble', 't_moss'], fogDist: 15, fogColor: [58, 66, 60], music: 'wild', danger: 1, spawn: { x: 1.6, y: 13.5, dir: 0 } });
    const GRASS = 0, SHAL = 1, DEEP = 2, COB = 3, MOSS = 4;
    m.border('t_hedge');
    // thickets give the clearing its shape; the road is a lane through them
    for (const [x0, y0, x1, y1] of [[1, 1, 5, 3], [1, 4, 2, 6], [1, 11, 4, 12], [1, 15, 4, 16], [1, 22, 3, 26], [31, 22, 34, 26], [33, 1, 34, 3], [1, 8, 2, 9]]) m.rect(x0, y0, x1, y1, 't_hedge');
    // the road and the green
    for (let x = 1; x <= 21; x++) for (const y of [13, 14]) m.setFloor(x, y, COB);
    for (let y = 11; y <= 15; y++) for (let x = 14; x <= 18; x++) m.setFloor(x, y, COB);
    for (let y = 9; y <= 14; y++) { m.setFloor(30, y, MOSS); m.setFloor(29, y, MOSS); }    // the churchyard path
    // the churchyard knoll: a plateau 0.6 high held up by a stone skirt, climbed by two 0.2 steps on its west face
    m.raise(24, 0, 35, 15, 0.6);
    for (const y of [12, 13, 14]) { m.setLvl(22, y, 0.2); m.setLvl(23, y, 0.4); m.setFloor(22, y, MOSS); m.setFloor(23, y, MOSS); }
    m.setSide(24, 1, 34, 15, 't_stone'); m.setSide(22, 12, 23, 14, 't_stone');
    for (let y = 1; y <= 15; y++) for (let x = 24; x <= 34; x++) if (!m.get(x, y)) m.setFloor(x, y, MOSS);
    // cottages: a plain door each, and what is behind it said on the door (the vignettes are in DOORS)
    const house = (x0, y0, x1, y1, dx, dy, key, label) => {
      m.rect(x0, y0, x1, y1, 't_house');
      m.set(dx, dy, DOOR({ locked: '__never', lockMsg: DOORS[key], label }));
    };
    house(6, 7, 9, 10, 7, 10, 'a', 'A cottage door');
    house(11, 6, 14, 9, 12, 9, 'b', 'A cottage door');
    house(19, 5, 22, 9, 20, 9, 'c', 'The Cantor\'s house');
    house(6, 16, 9, 19, 7, 16, 'd', 'A cottage door');
    house(11, 17, 14, 20, 12, 17, 'e', 'A cottage door');
    house(19, 16, 22, 19, 20, 16, 'f', 'A cottage door');
    // the chapel, on the knoll: marble blocks measured from the plateau, a taller tower, the door to the south
    for (let y = 2; y <= 8; y++) for (let x = 27; x <= 33; x++) {
      const tower = x >= 30 && x <= 31 && y >= 2 && y <= 3;
      m.block(x, y, 't_marble', 0.6 + (tower ? 3.4 : 1.9), { capTex: 't_greymarble' });
    }
    m.set(30, 8, DOOR({ portal: { map: 'greenroot_chapel', x: 7.5, y: 11.4, dir: -Math.PI / 2 }, locked: 'p9p_chapel', lockMsg: 'The chapel door is shut, not locked. It has been pulled to from the inside and held there. Nothing on this side of it will move.', label: 'The chapel of Greenroot' }));
    // the charnel house: a squat stone mound with the stair down in its west face
    m.rect(31, 12, 33, 14, 't_stone');
    m.set(31, 13, DOOR({ portal: { map: 'greenroot_crypt', x: 1.6, y: 12.5, dir: 0 }, label: 'The charnel stair, down to the ossuary' }));
    // the road out, west
    m.set(0, 13, DOOR({ portal: { map: 'clearing', x: 38.4, y: 27.5, dir: Math.PI }, label: 'The Greenroot road, back to the clearing' }));
    // the reed-beds: moss at the bank, then shallows to wade, with deep pockets and the Flume itself along the south
    for (let x = 1; x <= 34; x++) { for (const y of [21]) if (!m.get(x, y)) m.setFloor(x, y, MOSS); for (let y = 22; y <= 25; y++) if (!m.get(x, y)) m.setFloor(x, y, SHAL); if (!m.get(x, 26)) m.setFloor(x, 26, DEEP); }
    for (const [x0, y0, x1, y1] of [[8, 24, 9, 25], [17, 23, 19, 24], [26, 22, 27, 23], [29, 25, 30, 25]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, DEEP);
    for (const [x0, y0, x1, y1] of [[12, 23, 14, 24], [22, 24, 24, 25], [5, 22, 6, 23]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, MOSS);

    // ---- props: a silent reed over every door, and what was left
    const reeds = [[7, 10, 1], [12, 9, 1], [20, 9, 1], [7, 16, -1], [12, 17, -1], [20, 16, -1], [30, 8, 1]];
    for (const [dx, dy, s] of reeds) m.deco('p9p_doorreed', dx + 0.5, dy + 0.5 + s * 0.52, { solid: false, radius: 0.1, scale: 0.55, yOff: -0.42, use: 'p9p_look', label: 'A silent wind-reed', look: T_LABEL.reed });
    m.deco('p9p_well', 16.5, 12.0, { radius: 0.55, scale: 0.9, use: 'p9p_look', label: 'The village well', look: T_LABEL.well });
    m.deco('p9p_table', 16.5, 15.3, { radius: 0.6, scale: 0.78, use: 'p9p_look', label: 'A table laid for the whole village', look: T_LABEL.table });
    m.deco('p9p_mirror', 13.3, 10.3, { solid: false, radius: 0.2, scale: 0.95, use: 'p9p_look', label: 'A mirror grown into a doorpost', look: T_LABEL.mirror });
    m.deco('p9p_boots', 7.5, 15.55, { solid: false, radius: 0.1, scale: 0.28, use: 'p9p_look', label: 'A pair of small boots', look: T_LABEL.boots });
    m.deco('p9p_bread', 19.5, 15.5, { solid: false, radius: 0.1, scale: 0.3, use: 'p9p_look', label: 'Bread in a cloth, left on a step', look: T_LABEL.bread });
    for (const [x, y] of [[26.4, 11.8], [28.4, 13.6], [27.0, 14.4], [26.2, 9.6], [32.6, 10.2], [33.0, 15.2]]) m.deco('grave', x, y, { radius: 0.25, scale: 0.5, solid: false, use: 'p9p_look', label: 'A grave with a reed at its head', look: T_LABEL.grave });
    m.deco('sign', 30.4, 14.35, { solid: false, radius: 0.15, scale: 0.7, use: 'p9p_look', label: 'The charnel stair', look: T_LABEL.charnel });
    // hush-lamps: the Greenroot safe points (the reed in each is the only thing here that still sounds)
    for (const [x, y] of [[3.0, 14.7], [15.3, 11.4], [21.4, 12.4], [30.3, 11.6], [11.0, 22.0]]) m.deco('lamp', x, y, { radius: 0.12, scale: 0.7, glow: 0.55, solid: true, use: 'p9p_look', label: 'A hush-lamp, still burning', look: T_LABEL.lamp });
    // trees, kept off the road, the cottages, the knoll and the water
    const rnd = mulberry32(9041);
    const clear = (x, y) => !(y > 10.2 && y < 16.8 && x < 23) && !(y > 4.2 && y < 10.8 && x > 5 && x < 23.5) && !(y > 15.2 && y < 21 && x > 5 && x < 23.5) && !(x > 22 && y < 16.8) && !(y > 20.5);
    for (let i = 0, n = 0; i < 140 && n < 26; i++) {
      const x = 1.6 + rnd() * (W - 3.2), y = 1.6 + rnd() * (H - 3.2);
      if (!clear(x, y) || m.get(x | 0, y | 0)) continue;
      m.deco('oak', x, y, { scale: 1.5 + rnd() * 0.9, radius: 0.45 }); n++;
    }
    // the Narrow: hounds listen for noise out here; the beds hold the drones
    m.enemy('hound', 10.5, 3.6); m.enemy('hound', 29.5, 18.6);
    m.enemy('miredrone', 7.5, 23.2, { passive: true, facing: 0.6 }); m.enemy('miredrone', 13.5, 23.5, { passive: true, facing: 3.4 }); m.enemy('miredrone', 23.5, 24.5, { passive: true, facing: 1.2 });
    m.item('honey', 28.3, 24.4); m.item('tonic', 10.6, 21.4);
    return m;
  }

  // --- the chapel: one quiet room. The way in from outside is barred from here; you arrive from below, in the vestry. (16 x 13)
  const CH = {
    tables: 'A long table laid down the nave for the whole parish: bowl, cup and spoon at every place, thirty-one by your count. The cloth is turned back at the far end, where someone was still laying it.',
    pew: 'A pew. A folded shawl lies on the end of it.',
    lectern: 'The lectern. The Greenroot register lies open on it, with a reed across the page.',
    kettle: 'The Cantor\'s kettle on the vestry stove. Long cold. The cup beside it has a ring in the bottom that has dried black.',
    cloak: 'A Cantor\'s cloak on its peg. The hem is stained to the knee and has dried that way.',
    rack: 'A rack of tuning-reeds, one slot for each house in Greenroot. Every slot is full.',
    bar: 'A lever on the wall beside the door, wired to the bar that holds it. Whoever barred this door from inside went down the stair after, and did not come back up to lift it.',
    barDown: 'The bar lies across the door, in its brackets. There is a lever on the wall beside it that would lift the bar.',
    barUp: 'The bar is lifted. The chapel door will open now, from either side.',
    lecternEmpty: 'The lectern. There is a pale oblong on the wood where the register lay, and a reed across it.',
  };
  function buildChapel() {
    const W = 16, H = 13;
    const m = new GameMap('greenroot_chapel', 'The Chapel of Greenroot', W, H, { floor: 't_flag', ceil: 't_wood', fogDist: 13, ambient: 0.3, fogColor: [18, 20, 20], music: 'inside', spawn: { x: 2.5, y: 1.6, dir: Math.PI / 2 } });
    m.ceilZ = 2.5;
    m.rect(0, 0, W - 1, H - 1, 't_marble'); m.clear(1, 1, W - 2, H - 2);
    // the vestry, west of the chancel, with a doorway into the nave
    m.rect(5, 1, 5, 5, 't_marble'); m.rect(1, 5, 5, 5, 't_marble'); m.clear(5, 3, 5, 3);
    m.set(2, 0, DOOR({ portal: { map: 'greenroot_crypt', x: 30.4, y: 12.5, dir: Math.PI }, label: 'The stair down to the undercroft' }));
    m.set(7, 12, DOOR({ portal: { map: 'greenroot', x: 30.5, y: 9.45, dir: Math.PI / 2 }, locked: 'p9p_chapel', lockMsg: CH.barDown, label: 'The chapel door' }));
    for (const [x, y] of [[4, 8], [4, 11], [11, 8], [11, 11]]) m.block(x, y, 't_greymarble', m.ceilZ);   // pillars: the tallest point the renderer scans
    m.deco('p9p_lectern', 10.5, 2.4, { radius: 0.4, scale: 0.85, use: 'p9p_register', label: 'The lectern', look: CH.lectern });
    m.deco('p9p_kettle', 3.2, 1.7, { radius: 0.25, scale: 0.4, use: 'p9p_look', label: 'The Cantor\'s kettle', look: CH.kettle });
    m.deco('cloaks', 1.55, 3.2, { solid: false, radius: 0.2, scale: 0.8, use: 'p9p_look', label: 'A Cantor\'s cloak on its peg', look: CH.cloak });
    m.deco('shelf', 1.5, 4.4, { solid: false, radius: 0.2, scale: 0.9, use: 'p9p_look', label: 'A rack of tuning-reeds', look: CH.rack });
    for (const [x, y] of [[7.6, 7.2], [11.8, 7.2], [7.6, 9.4], [11.8, 9.4]]) m.deco('p9p_table', x, y, { radius: 0.55, scale: 0.7, use: 'p9p_look', label: 'A long table, laid for the parish', look: CH.tables });
    for (const [x, y] of [[2.4, 7.2], [2.4, 9.8]]) m.deco('p9p_pew', x, y, { radius: 0.45, scale: 0.55, use: 'p9p_look', label: 'A pew', look: CH.pew });
    m.deco('lever', 8.5, 11.5, { solid: false, radius: 0.3, scale: 0.7, use: 'p9p_chapel_bar', label: 'A lever beside the door', look: CH.bar });
    for (const [x, y] of [[8.4, 1.6], [13.6, 1.6], [13.5, 11.2]]) m.deco('lamp', x, y, { radius: 0.12, scale: 0.7, glow: 0.55, use: 'p9p_look', label: 'A hush-lamp, still burning', look: T_LABEL.lamp });
    return m;
  }

  // --- the undercroft: landing, a ramp up to the ossuary hall (bell rail, sung wall, reed gate), a gated ramp down to the
  // flooded crypt (wade; a sluice valve drains the deep channel), and the family room with the stair up. (34 x 26)
  const CR = {
    verse: 'CARVED OVER THE STAIR: HOLD IT AS THE FAMILY HOLDS IT. THE ELDEST FIRST, THE YOUNGEST LAST, AND EACH WAITS FOR THE ONE BEFORE TO GO QUIET.',
    verse2: 'CARVED BY THE BELLS: PELL. FOUR BELLS TO A HOUSE. NOBODY RINGS ONE OUT OF TURN.',
    niche: 'A niche with a reed hung in it, and the long bones of whoever it was kept for. The reed is dry.',
    wall: 'Grooved reed-stone. Each groove is cut to a pitch. The deepest one hums, very faintly, when you stand near it. It wants a note sung into it.',
    wallShort: 'Grooved reed-stone, each groove cut to a pitch. The deepest hums.',
    verse3: 'CARVED BESIDE THE GROOVED STONE: SING IT THE NOTE EVERY CANTOR LEARNS FIRST, AND STAND CLOSE. THE ROOT, OR THE MENDING OF IT.',
    gate: 'A reed gate, iron-shod, shut. A bronze counterweight lever somewhere beyond the water would raise it.',
    pass: 'The passing gate. It will not rise until the house has been rung down in order.',
    valve: 'A sluice valve, wheel and pipe, green with a century of damp. Turned, it would let the deep channel down into the shallows.',
    lever: 'A bronze counterweight lever, set into the stone. It is wired to a gate somewhere above.',
    chairs: 'Three chairs set close, facing a fourth. This is where a family sat to hold the Last Note, in the old way. In the new way they sat in silence and held it anyway.',
    recess: 'A shrouded recess in the wall. Whatever is laid in it is not found.',
    sluiceDone: 'The wheel turns, and turns, and then there is a sound of water going somewhere. The channel sinks to a shallow.',
  };
  // the bell rail: [x, age, pitch(Hz)], listed left to right. The solution is eldest to youngest.
  const BELLS = [[13.2, 34, 220], [14.7, 81, 174], [19.5, 19, 261], [21.0, 56, 196]];
  const BELL_NAMES = { 34: 'Ansa Pell, thirty-four', 81: 'Hesper Pell, eighty-one', 19: 'Wick Pell, nineteen', 56: 'Joss Pell, fifty-six' };   // [PROPOSED]
  const BELL_ORDER = [81, 56, 34, 19];
  function buildCrypt() {
    const W = 34, H = 26;
    const m = new GameMap('greenroot_crypt', 'The Greenroot Undercroft', W, H, { floor: 't_flag', floorTextures: ['t_flag', 't_shallows', 't_water'], ceil: 't_stone', fogDist: 10, ambient: 0.07, fogColor: [10, 14, 14], music: 'root', siphoned: true, spawn: { x: 1.6, y: 12.5, dir: 0 } });
    m.ceilZ = 2.6;
    m.rect(0, 0, W - 1, H - 1, 't_catacomb');
    const room = (x0, y0, x1, y1) => m.clear(x0, y0, x1, y1);
    room(1, 10, 5, 14);          // A: the foot of the stair
    room(6, 12, 11, 12);         // B: the passage up
    room(12, 7, 22, 17);         // C: the ossuary hall
    room(16, 3, 18, 5);          // N: the niche behind the sung wall
    room(13, 18, 13, 20);        // the passing stair, down
    room(8, 21, 27, 24);         // E: the flooded crypt (west shallows, the channel, east shallows)
    room(24, 9, 30, 15);         // D: the family room
    // the shape of the ground: the hall stands 0.6 above the landing and the crypt, reached by ramps
    m.raise(12, 7, 22, 17, 0.6); m.raise(24, 9, 30, 15, 0.6); m.raise(16, 3, 18, 5, 0.6);
    m.ramp(9, 12, 11, 12, 0, 0.6, 'x');
    m.ramp(13, 19, 13, 20, 0.6, 0, 'y'); m.setLvl(13, 18, 0.6);
    m.setSide(12, 7, 22, 17, 't_greymarble');
    // the flood: shallows throughout, the channel between the two halves deep until the valve is turned
    for (let y = 21; y <= 24; y++) for (let x = 8; x <= 27; x++) m.setFloor(x, y, (x >= 16 && x <= 18) ? 2 : 1);
    for (const [x, y] of [[14, 9], [14, 15], [20, 9], [20, 15]]) m.block(x, y, 't_greymarble', m.ceilZ);
    // the sung wall: three panels of grooved reed-stone, the middle one answering the root note
    for (const x of [16, 18]) m.set(x, 6, { tex: 'p9p_reedstone', p9pLook: CR.wallShort });
    m.set(17, 6, { tex: 'p9p_reedstone', p9pSung: true, p9pLook: CR.wallShort });
    // gates: the passing gate (bells), the reed gate (lever beyond the water)
    m.set(13, 18, DOOR({ locked: 'p9p_bells', lockMsg: CR.pass, label: 'The passing gate' }));
    m.set(23, 12, DOOR({ locked: 'p9p_gate', lockMsg: CR.gate, label: 'The reed gate' })); m.setLvl(23, 12, 0.6);
    // the way out: charnel stair west, the stair up to the chapel vestry in the family room
    m.set(0, 12, DOOR({ portal: { map: 'greenroot', x: 30.5, y: 13.5, dir: Math.PI }, label: 'Up the charnel stair' }));
    m.set(31, 12, DOOR({ portal: { map: 'greenroot_chapel', x: 2.5, y: 1.6, dir: Math.PI / 2 }, label: 'The stair up to the chapel' }));
    // props
    m.deco('sign', 3.0, 10.7, { solid: false, radius: 0.15, scale: 0.8, use: 'p9p_look', label: 'A verse carved over the stair', look: CR.verse });
    m.deco('sign', 22.2, 7.5, { solid: false, radius: 0.15, scale: 0.8, use: 'p9p_look', label: 'Carved by the bells', look: CR.verse2 });
    m.deco('sign', 15.6, 7.5, { solid: false, radius: 0.15, scale: 0.8, use: 'p9p_look', label: 'Carved beside the grooved stone', look: CR.verse3 });
    BELLS.forEach(([x, age, hz], i) => m.deco('p9p_bell', x, 7.45, { radius: 0.18, scale: 0.34 + age * 0.0028, yOff: -0.3, use: 'p9p_bell', bellIdx: i, bellAge: age, bellHz: hz, label: 'A passing-bell on the rail. ' + BELL_NAMES[age] + '.' }));
    for (const [x, y] of [[12.5, 9.3], [12.5, 12.6], [12.5, 15.0], [22.5, 9.3], [22.5, 15.0]]) m.deco('p9p_niche', x, y, { solid: false, radius: 0.2, scale: 1.05, use: 'p9p_look', label: 'A niche with a reed hung in it', look: CR.niche });
    m.deco('crates', 20.8, 16.3, { solid: false, scale: 0.65, bodyCover: true, use: 'body_cover', label: 'Shrouded body recess — G to conceal nearby remains', glow: 0.25 });
    m.deco('p9p_valve', 9.4, 22.0, { radius: 0.35, scale: 0.8, use: 'p9p_sluice', label: 'A sluice valve', look: CR.valve });
    m.deco('lever', 26.3, 21.7, { radius: 0.3, scale: 0.8, use: 'p9p_lever', label: 'A bronze counterweight lever', look: CR.lever });
    for (const [x, y] of [[27.4, 11.0], [27.4, 13.6]]) m.deco('chair', x, y, { radius: 0.25, scale: 0.7, use: 'p9p_look', label: 'Chairs set close, facing a fourth', look: CR.chairs });
    m.deco('chair', 25.4, 12.3, { radius: 0.25, scale: 0.7, use: 'p9p_look', label: 'Chairs set close, facing a fourth', look: CR.chairs });
    for (const [x, y] of [[2.0, 10.7], [17.5, 16.5], [9.0, 21.6], [27.5, 9.6]]) m.deco('lamp', x, y, { radius: 0.12, scale: 0.65, glow: 0.55, use: 'p9p_look', label: 'A hush-lamp, still burning', look: T_LABEL.lamp });
    // the Fret-crawlers lie flat on the hall stones and in the family room; the swarm strips the crypt of sound
    m.enemy('fretcrawler', 15.6, 11.2, { guard: true, facing: 0 }); m.enemy('fretcrawler', 20.2, 14.4, { guard: true, facing: Math.PI }); m.enemy('fretcrawler', 28.2, 12.2, { guard: true, facing: Math.PI });
    m.enemy('mites', 11.5, 22.6); m.enemy('mites', 22.6, 23.0);
    // what is kept: loot, and the Cantor's reed-case behind the sung wall
    m.item('tonic', 4.5, 10.8); m.item('pellets', 9.8, 24.0); m.item('honey', 25.6, 14.2);
    m.add({ kind: 'item', item: 'cache', tier: 2, x: 16.7, y: 4.6, sprite: 'chest', scale: 0.5, solid: false, label: 'A Cantor\'s strongbox' });
    m.add({ kind: 'item', item: 'p9_verrow_reedcase', x: 17.5, y: 3.7, sprite: 'p9p_reedcase', scale: 0.35, yOff: 0, solid: false, glow: 0.2, label: 'A Cantor\'s case of reeds' });
    m.add({ kind: 'item', item: 'cache', tier: 1, x: 29.2, y: 14.2, sprite: 'chest', scale: 0.5, solid: false, label: 'A family\'s strongbox' });
    return m;
  }

  function buildAll(maps) {
    maps.greenroot = buildGreenroot();
    maps.greenroot_chapel = buildChapel();
    maps.greenroot_crypt = buildCrypt();
    hookClearing(maps.clearing);
    for (const id of MAPS) { const mm = maps[id]; mm.baseCount = mm.entities.length; }
    if (maps.clearing) {
      // no entity is added to the clearing, so its baseCount stays the game's own (scenery props sit after it)
      const rd = maps.clearing._p9pRoad, door = maps.greenroot.get(0, 13);
      if (rd && door && door.portal) door.portal = { map: 'clearing', x: maps.clearing.w - 1.6, y: rd.y + 0.5, dir: Math.PI };
    }
  }

  // the road: a gap in the clearing's east hedge, a door cell with no entities added to the old map
  function clearingRoadCell(cl) {
    for (let y = 33; y >= 4; y--) {
      if (cl.get(38, y) || cl.get(39, y) === null) continue;
      let free = true;
      for (const e of cl.entities) if (Math.abs(e.x - 38.5) < 1.2 && Math.abs(e.y - (y + 0.5)) < 1.2) { free = false; break; }
      if (free && !cl.get(38, y - 1) && !cl.get(38, y + 1)) return y;
    }
    return 27;
  }
  function hookClearing(cl) {
    if (!cl) return;
    const y = clearingRoadCell(cl);
    cl.set(cl.w - 1, y, DOOR({ tex: 't_hedge', portal: { map: 'greenroot', x: 1.6, y: 13.5, dir: 0 }, locked: 'p9p_known', lockMsg: ROAD_SHUT, label: ROAD_SHUT_LABEL }));
    cl._p9pRoad = { x: cl.w - 1, y };
  }

  // ---------------------------------------------------------------- the quest: text (all constants)
  const REGISTER_TITLE = 'The Greenroot Register';
  // [PROPOSED] the Cantor's name (Mabyn Verrow), the Pell family, the counting of reeds. Dates are bare years and Anchor-named days.
  const REGISTER_PAGES = [
    'Greenroot. The register of the parish, kept by Mabyn Verrow, Cantor, in her own hand. Seven houses and thirty-one souls.',
    'Hearthday, 417. Counted the reeds in the wind at dusk, as I do each week: seven houses, seven reeds, every one sounding. Thirty-one at supper on the green. Hesper Pell, eighty-one, said the grace and held it past the end, as she does, and we all waited for her.',
    'Massday, 417. A letter from Tobin Ashgrove at Oakhaven. The Cantors of the three nearest parishes are to come to the Greenhall. I will go when the road is open. The hounds have begun to sit on the Flume bank in the evenings. They do nothing. They sit.',
    'Nullday, 417. I answered Tobin. I wrote it three times. The pen worked and the ink went on, and each time the page would carry only the one line. I have sent that. It says: We have stopped being able to send.',
    'Driftday. The Joss reed did not sound. I took it down and blew across it and it spoke perfectly well. I hung it back up. In the wind it was silent. Six.',
    'Memoryday. Four. Ansa Pell\'s kettle was boiling and she could not hear it. We both stood and watched it.',
    'Rootday. Two. We have carried the tables into the chapel, all of them, to be together where the lamps are, and to see one another speak. Thirty-one places laid. Hesper held the grace again and we watched her lips to the end of it.',
    'Hearthday. One, and it is mine. I have put a lamp in every window. A hush-lamp keeps a room from going quite still, and the reed in it is the only thing in Greenroot that still sounds, and I find I am listening to it the way you listen to a person who is about to',
  ];
  const REGISTER_END = 'The next line is ruled, and empty.';
  const REGISTER_HTML = REGISTER_PAGES.map((t) => '<p>' + t + '</p>').join('') + '<p><i>' + REGISTER_END + '</i></p>';
  const REG_TAKE = 'Take the register. Someone should read it to the end.';
  const REG_LEAVE = 'Leave it where it lies.';
  const REG_CLOSE = 'Close the book.';

  const ROAD_SHUT = 'Bramble and thorn, three deep. Nothing to see through it, and no reason to push.';
  const ROAD_OPEN_LABEL = 'The Greenroot road';
  const ROAD_SHUT_LABEL = 'The east hedge';
  const ROAD_CLOSED = 'The hedge has grown across the old cart-road, thick and green and ringing faintly. Whatever road ran east of here is under the green now. Leave it with the others.';
  const CLOSED_LINE = 'Gone. The Greening came up through that road the night the oaks began to ring, and nobody is going down it now. Leave it with the others.';
  const J_ROAD = 'Harrow says an old cart-road leaves the clearing by the east hedge and runs to a parish called Greenroot, off the Flume. Nobody has gone down it since the summer the third Cantor sent her note.';
  const J_ARRIVE = 'Greenroot. Tables laid, doors shut, kettles cold, and nobody. The chapel stands on the knoll to the east, barred from the inside. There is a stair into the earth by the charnel house.';
  const J_REG = 'I have the Greenroot register. Cantor Mabyn Verrow\'s last line stops in the middle of a sentence. It should go to someone who will read it to the end: Ignatius, who would have the Church file it, or Lyra, who would keep it with Tobin\'s pages.';
  const J_FILED = 'I gave the Greenroot register to Ignatius Crane. He read it standing, all of it, and then he said it would be filed. I do not know what it will be filed under.';
  const J_KEPT = 'I gave the Greenroot register to Lyra. She read the names aloud, quietly, to the end, and put it with Tobin\'s pages. She said a book that is read to the end is not lost.';
  const M_LEVER_GATE = 'A counterweight drops somewhere above, with a long iron sound. The reed gate in the ossuary hall has gone up.';
  const M_LEVER_BAR = 'The bar lifts out of its brackets with a sound like a held breath let go. The chapel door will open, from either side.';
  const M_BELL_OK = ['The eldest. The hall waits.', 'The next of the house. The hall waits.', 'And the next. One more.', 'The youngest, last. Under your feet, a bolt draws back.'];
  const M_BELL_BAD = 'It rings out of turn. The rail goes still, and something under the floor sets itself back.';
  const M_BELL_DONE = 'The bells have been rung down in their order. They hang quiet, and the passing gate stands open.';
  const M_WALL = 'You sing the root into the stone. The deepest groove takes the note, and gives it back a fifth higher, and the middle panel sinks into the wall.';
  const M_WALL_NO = 'The stone hums under your note, a little, and will not open for it.';
  const M_SEVER = 'The bite cuts across your breath. You open your mouth for the interval and it will not hold. No Song will keep its pitch for a while.';
  const M_SEVER_BLOCK = 'You reach for the note and every interval slides off it. Your voice has been cut. Wait it out.';
  const M_SEVER_END = 'Your voice finds its pitch again.';
  const M_DESPAIR = 'Under hearing, a single low note. Your limbs are heavier for it, and the road seems very long.';
  const M_CRAWLER = 'The flagstones here are not quite flat. Something is lying very still on them.';
  const M_DARK = 'It is very dark below. If you carry a lantern, this is the place for it (U).';
  const M_CASE = 'Verrow\'s case sits in your pack. Your breath settles a little.';

  // ---------------------------------------------------------------- topics: who may be asked what
  const TOPIC_REG = 'The Greenroot register';
  TOPIC_DEFS[TOPIC_REG] = {
    low: 'A parish book from Greenroot. I do not know what it says. If it is a register, someone should read it to the end.',
    high: 'The Greenroot register. If it is Mabyn Verrow\'s, then it is the only account there is. Hand it to someone who will read it through.',
  };
  const PARISH_REPLY = {
    harrow_road: { low: TOPIC_DEFS[TOPIC_ROAD].low, high: TOPIC_DEFS[TOPIC_ROAD].high },
    ignatius: 'The Choir-Church keeps a file on Greenroot. It is short. The clerks write consolidated against parishes they cannot reach, and I have not signed it. I will say this once: if someone were to bring me that parish\'s own register, I could not sign the file at all, and I would have to ask it why.',
    ignatius_filed: 'Filed. I read it before I filed it. The clerk does not know that, and you will not tell him.',
    lyra_kept: 'I read them out most evenings. The Pells, the Joss house, the Cantor. Thirty-one. Nobody asked me to, and I find I cannot stop.',
  };
  const ASK_OFFER = {
    ignatius: {
      text: 'A book strapped shut, and your face the way a face is when it has carried a thing a long way. Is that the Greenroot register? Let me see it. No. Do not let me see it, I know what is in it. Give it here.',
      yes: 'Give him the register.', no: 'Not yet.',
      done: 'He reads it standing, to the very end, which takes a long time. Then he closes it and holds it flat in both hands. "It will be filed," he says, in the voice of a man reading from a card, and for a moment he does not look at you. "Take this. The Church is not ungrateful, whatever the file says."',
      hold: 'Then keep it a little longer. It will not get lighter.',
    },
    lyra: {
      text: 'That book. Where did you find it? Greenroot. Mabyn Verrow. We were girls in the same Conservatory, she sat behind me. May I? Please. I would like to have it read, by someone, properly.',
      yes: 'Give it to her to keep.', no: 'Not yet.',
      done: 'She reads the names aloud, softly, one by one, to the very end, and when she reaches the line that stops she does not stop. She says the rest of it into the room, as if it were Mabyn\'s. Then she puts the book with Tobin\'s pages. "A book that is read to the end is not lost," she says. "Thank you. Here. For the road."',
      hold: 'Of course. When you are ready. It is not going anywhere. It is the one thing in this story that is not.',
    },
  };
  const REWARD = {
    filed: { gold: 45, xp: 60, rep: ['synod', 3] },
    kept: { gold: 0, xp: 60, rep: ['hedge', 3], items: [['tonic', 2], ['honey', 1]] },
  };

  // ---------------------------------------------------------------- consequences (rumours, Gazette)
  const RUMOUR_DEFS = [
    { id: 'd_p9p_filed', cat: 'deed', who: 'patron', rank: 70, req: ['p9p_filed'], note: 'You gave the Greenroot register to Ignatius',
      text: 'A register from Greenroot way went into the Church\'s vestry cupboard. Filed, they say. I notice nobody has said what it was filed under.' },
    { id: 'd_p9p_kept', cat: 'deed', who: 'patron', rank: 70, req: ['p9p_kept'], note: 'You gave the Greenroot register to Lyra',
      text: 'Lyra reads names out of a book of an evening, low, in the Cantor\'s chair at the back. Greenroot names. Nobody asks her where it came from, and she does not say.' },
    { id: 'd_p9p_kept_h', cat: 'deed', who: 'hetty', rank: 70, req: ['p9p_kept'], note: 'You gave the Greenroot register to Lyra (Hetty)',
      text: 'Lyra sat in the corner with a book last night and read out names, soft, till the candles were low. I put a free drink in front of her. She did not drink it. She did not stop reading either.' },
  ];
  const GAZETTE_ITEMS = [
    { req: ['p9p_filed'], t: 'The parish of Greenroot is recorded as consolidated. Its register has been received and filed by the Choir-Church. Correspondence addressed to the parish will be answered by the file.' },
    { req: ['p9p_kept'], t: 'A parish register of unconfirmed provenance is reported to be read aloud in the Cantor\'s house of an evening. Reading aloud is not an offence. The reading is noted.' },
  ];

  // ---------------------------------------------------------------- state: validated flags, derived map state
  const BOOL_KEYS = ['known', 'visited', 'crypt', 'chapel', 'bells', 'gate', 'drained', 'wall', 'read', 'reg', 'filed', 'kept'];
  function validate() {
    const f = flags();
    for (const k of BOOL_KEYS) { const key = FP + k; if (has(f, key) && f[key] !== true) delete f[key]; }
  }
  const known = () => flag('known') || (has(flags(), 'p6t_page_10') && flags().p6t_page_10 === true);
  const inMine = (id) => MAPS.indexOf(id) >= 0;
  const mapOf = (id) => (typeof G !== 'undefined' && G.maps) ? G.maps[id] : null;
  const doorKey = (m, x, y) => y * m.w + x;
  function openDoor(m, x, y) { const d = m && m.doors[doorKey(m, x, y)]; if (d) d.target = 1; }

  // the road door in the clearing's east hedge: shut while unknown, passable once known, one line after the Greening
  function syncRoad() {
    const cl = mapOf('clearing'); if (!cl || !cl._p9pRoad) return;
    const cell = cl.get(cl._p9pRoad.x, cl._p9pRoad.y); if (!cell || !cell.door) return;
    if (greening()) { cell.locked = '__never'; cell.lockMsg = ROAD_CLOSED; cell.label = ROAD_SHUT_LABEL; }
    else { cell.locked = 'p9p_known'; cell.lockMsg = ROAD_SHUT; cell.label = known() ? ROAD_OPEN_LABEL : ROAD_SHUT_LABEL; }
  }
  function learn(first) {
    if (flag('known')) return;
    setFlag('known'); syncRoad();
    if (first && typeof journal === 'function') journal('side', J_ROAD);
  }
  // flag-derived changes to a map's cells (re-applied on every entry: saves keep flags, never cells)
  function applyMapState(id) {
    const m = mapOf(id); if (!m) return;
    if (id === 'greenroot_crypt') {
      if (flag('drained')) for (let y = 21; y <= 24; y++) for (let x = 16; x <= 18; x++) m.setFloor(x, y, 1);
      if (flag('wall')) { m.set(17, 6, null); m.setLvl(17, 6, 0.6); }
    }
    if (id === 'greenroot_chapel') {
      const lec = m.entities.find((e) => e.use === 'p9p_register');
      if (lec) lec.look = flag('reg') ? CH.lecternEmpty : CH.lectern;
      const lev = m.entities.find((e) => e.use === 'p9p_chapel_bar');
      if (lev) lev.look = flag('chapel') ? CH.barUp : CH.bar;
    }
    try { if (typeof Engine !== 'undefined' && Engine.scanRelief && G.map === m) Engine.scanRelief(m); } catch (e) { /* cosmetic */ }
  }

  // ---------------------------------------------------------------- using things
  const rung = [];            // the bells rung so far this attempt (transient)
  function ringBell(e) {
    const age = e.bellAge | 0, hz = e.bellHz || 196;
    try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.song) Audio_.sfx.song(hz, 1.3); } catch (er) { /* silent */ }
    addNoise(1.4);
    if (flag('bells')) { msg(M_BELL_DONE, '', 2600); return; }
    if (age === BELL_ORDER[rung.length]) {
      rung.push(age);
      if (rung.length === BELL_ORDER.length) {
        setFlag('bells'); rung.length = 0;
        const m = G.map; openDoor(m, 13, 18);
        try { if (Audio_.sfx.door) Audio_.sfx.door(); } catch (er) { /* silent */ }
        msg(M_BELL_OK[3], 'good', 4500); msg(M_BELL_DONE, '', 4500);
      } else msg(BELL_NAMES[age] + '. ' + M_BELL_OK[rung.length - 1], '', 3200);
    } else {
      rung.length = 0; msg(BELL_NAMES[age] + '. ' + M_BELL_BAD, 'warn', 4200);
    }
  }
  function turnSluice() {
    if (flag('drained')) { msg('The wheel is spent. The channel is a shallow.', '', 2500); return; }
    setFlag('drained'); applyMapState('greenroot_crypt');
    const p = G.player; p.fat = Math.max(0, p.fat - 6);
    try { Audio_.sfx.door(); } catch (er) { /* silent */ }
    msg(CR.sluiceDone, 'good', 5000);
  }
  function pullGate() {
    if (flag('gate')) { msg('The counterweight hangs at the bottom of its run. The reed gate stands open.', '', 2500); return; }
    setFlag('gate'); openDoor(G.map, 23, 12);
    try { Audio_.sfx.crack(); } catch (er) { /* silent */ }
    msg(M_LEVER_GATE, 'good', 5000);
  }
  function liftBar() {
    if (flag('chapel')) { msg(CH.barUp, '', 2500); return; }
    setFlag('chapel'); applyMapState('greenroot_chapel');
    openDoor(mapOf('greenroot_chapel'), 7, 12); openDoor(mapOf('greenroot'), 30, 8);
    try { Audio_.sfx.door(); } catch (er) { /* silent */ }
    msg(M_LEVER_BAR, 'good', 5000);
  }
  function showRegister(first) {
    if (typeof showEvent !== 'function') return;
    if (first) showEvent(REGISTER_TITLE, REGISTER_HTML, [
      { t: REG_TAKE, f: () => takeRegister() },
      { t: REG_LEAVE, f: () => { setFlag('read'); } },
    ]);
    else showEvent(REGISTER_TITLE, REGISTER_HTML, [{ t: REG_CLOSE, f: null }]);
  }
  function takeRegister() {
    setFlag('read');
    if (G.has('p9_greenroot_register') || flag('reg') || flag('filed') || flag('kept')) return;
    setFlag('reg'); G.give('p9_greenroot_register'); applyMapState('greenroot_chapel');
    try { Audio_.sfx.pickup(); } catch (er) { /* silent */ }
    msg('You take the Greenroot register.', 'good', 3500); journal('side', J_REG);
  }
  // a long description is read, not hinted: it is shown for as long as it takes to read
  function showLook(e) { if (e && typeof e.look === 'string') msg(e.look, '', Math.min(12000, 3500 + e.look.length * 45)); }
  function onUse(e) {
    if ((e.use === 'p9p_sluice' || e.use === 'p9p_lever' || e.use === 'p9p_chapel_bar') && !e._p9seen && !(e.use === 'p9p_chapel_bar' && flag('chapel'))) { e._p9seen = true; showLook(e); }
    switch (e.use) {
      case 'p9p_look': showLook(e); return true;
      case 'p9p_bell': ringBell(e); return true;
      case 'p9p_sluice': turnSluice(); return true;
      case 'p9p_lever': pullGate(); return true;
      case 'p9p_chapel_bar': liftBar(); return true;
      case 'p9p_register':
        if (flag('reg') || flag('filed') || flag('kept')) { msg(CH.lecternEmpty, '', 5000); return true; }
        showRegister(true); return true;
      default: return false;
    }
  }

  // ---------------------------------------------------------------- the ending: the register goes to Ignatius or to Lyra
  function npcId() { return (typeof DLG !== 'undefined' && DLG.ent && typeof DLG.ent.id === 'string') ? DLG.ent.id : ''; }
  function deliver(who) {
    if (!G.has('p9_greenroot_register') || flag('filed') || flag('kept')) return null;
    const kind = who === 'ignatius' ? 'filed' : 'kept', r = REWARD[kind], p = G.player;
    G.take('p9_greenroot_register'); setFlag(kind);
    if (r.gold) G.gold(r.gold);
    for (const [id, n] of (r.items || [])) if (ITEMS[id]) G.give(id, n);
    if (typeof questXp === 'function') questXp(r.xp);
    if (typeof changeRep === 'function') changeRep(r.rep[0], r.rep[1]);
    try { Audio_.sfx.pickup(); } catch (er) { /* silent */ }
    journal('side', kind === 'filed' ? J_FILED : J_KEPT);
    const loot = r.gold ? r.gold + ' sovereigns' : 'two tonics and a jar of honey';
    msg('You receive ' + loot + '.', 'good', 4500);
    return ASK_OFFER[who].done;
  }
  let offerPending = false;
  const availableTopics = (id) => {
    const out = {};
    const closed = greening();
    if (id === 'harrow') { out[TOPIC_ROAD] = true; if (known() || closed) out[TOPIC_PARISH] = true; }
    if (id === 'ignatius' && (known() || closed || flag('filed'))) out[TOPIC_PARISH] = true;
    if (id === 'lyra' && flag('kept')) out[TOPIC_PARISH] = true;
    if ((id === 'ignatius' || id === 'lyra') && !closed && G.has('p9_greenroot_register') && !flag('filed') && !flag('kept')) out[TOPIC_REG] = true;
    return out;
  };
  const isMine = (t) => t === TOPIC_ROAD || t === TOPIC_PARISH || t === TOPIC_REG;
  function askMine(t) {
    const id = npcId(), pers = (G.player && G.player.attrs && G.player.attrs.Personality) || 0;
    DLG.log.push({ who: 'you', t: 'Tell me about ' + t + '.' });
    const ok = availableTopics(id)[t];
    let ans;
    if (!ok) ans = 'I could not say.';
    else if (greening() && t !== TOPIC_REG) ans = CLOSED_LINE;
    else if (t === TOPIC_ROAD) {
      const tier = (DLG.npc && DLG.npc.tier === 'high') || (DLG.tone === 'polite' && pers >= 55) ? 'high' : 'low';
      ans = PARISH_REPLY.harrow_road[tier]; learn(true);
    } else if (t === TOPIC_PARISH) {
      if (id === 'ignatius') ans = flag('filed') ? PARISH_REPLY.ignatius_filed : PARISH_REPLY.ignatius;
      else if (id === 'lyra') ans = PARISH_REPLY.lyra_kept;
      else { const tier = DLG.tone === 'polite' && pers >= 55 ? 'high' : 'low'; ans = TOPIC_DEFS[TOPIC_PARISH][tier]; }
      learn(true);
    } else {
      const o = ASK_OFFER[id];
      ans = o.text;
      DLG.choices = [
        { t: o.yes, f: () => deliver(id) },
        { t: o.no, f: () => o.hold },
      ];
      offerPending = true;
    }
    DLG.log.push({ who: 'them', t: ans });
  }

  // ---------------------------------------------------------------- the foes' effects
  const sever = () => {
    const first = T.sever <= 0;
    T.sever = SEVER_SECS; T.wasSevered = true;
    if (first) msg(M_SEVER, 'bad', 5000);
  };
  const cloakFret = (e) => !!e && e.kind === 'enemy' && e.type === 'fretcrawler' && !e.dead;
  function nearestDrone() {
    if (!G.map || !G.ents || typeof Engine === 'undefined') return null;
    const c = Engine.cam; let best = null, bd = 1e9;
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.type !== 'miredrone' || e.dead || e.hidden) continue;
      const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; }
    }
    return best ? { e: best, d: bd } : null;
  }
  const DESPAIR_R = 7, HEAR_R = 16;
  function despairTarget(nd) {
    if (!despairOn() || !nd || nd.d >= DESPAIR_R) return 0;
    let v = clamp01((DESPAIR_R - nd.d) / DESPAIR_R);
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.wallsBetween && SPATIAL.wallsBetween(G.map, nd.e.x, nd.e.y, Engine.cam.x, Engine.cam.y) > 0) v *= 0.4; } catch (er) { /* none */ }
    // a hush-lamp's reed still sounds: near one the weight lifts
    for (const o of G.ents) if (o.sprite === 'lamp' && !o.hidden && Math.hypot(o.x - Engine.cam.x, o.y - Engine.cam.y) < 2.4) { v *= 0.25; break; }
    return v;
  }
  // where the nearest drone sounds from: a pure read, so the audio and the tests share it
  function droneMix() {
    const nd = nearestDrone(); if (!nd || nd.d > HEAR_R || !despairOn()) return null;
    const c = Engine.cam, L = { x: c.x, y: c.y, dir: c.dir };
    let walls = 0;
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.wallsBetween) walls = SPATIAL.wallsBetween(G.map, nd.e.x, nd.e.y, c.x, c.y); } catch (er) { walls = 0; }
    let m = null;
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.mix) m = SPATIAL.mix(L, { x: nd.e.x, y: nd.e.y }, walls); } catch (er) { m = null; }
    if (!m) { const dx = nd.e.x - L.x, dy = nd.e.y - L.y; m = { pan: clamp01(0.5 + (-Math.sin(L.dir) * dx + Math.cos(L.dir) * dy) / (2 * Math.max(1.2, nd.d))) * 2 - 1, gain: 1 / (1 + nd.d / 5), cutoff: 260, dist: nd.d }; }
    let pan = m.pan;
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.settings && SPATIAL.settings.positional === false) pan = 0; } catch (er) { /* default */ }
    const fade = clamp01(1 - (nd.d - 6) / (HEAR_R - 6));
    return { x: nd.e.x, y: nd.e.y, dist: nd.d, pan, gain: 0.13 * m.gain * fade, cutoff: Math.min(m.cutoff, 260), walls };
  }
  const DA = { ctx: null, g: null, pan: null, lp: null };
  function droneAudio() {
    const A = typeof Audio_ !== 'undefined' ? Audio_ : null;
    const mix = droneMix();
    if (!A || !A.ctx || !A.sfxBus) { T.lastDrone = null; return; }       // nothing at all until the one AudioContext exists
    const ctx = A.ctx;
    if (!DA.g || DA.ctx !== ctx) {
      try {
        DA.ctx = ctx; DA.g = ctx.createGain(); DA.g.gain.value = 0;
        DA.lp = ctx.createBiquadFilter(); DA.lp.type = 'lowpass'; DA.lp.frequency.value = 220; DA.lp.Q.value = 0.6;
        DA.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        for (const [type, hz] of [['sawtooth', 55], ['sine', 55.8], ['sine', 110.4]]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz; o.connect(DA.lp); o.start(); }
        if (DA.pan) { DA.lp.connect(DA.pan); DA.pan.connect(DA.g); } else DA.lp.connect(DA.g);
        DA.g.connect(A.sfxBus);
      } catch (er) { DA.g = null; return; }
    }
    const t = ctx.currentTime, muted = !!A.muted;
    const g = (!mix || muted) ? 0 : mix.gain;
    try {
      DA.g.gain.setTargetAtTime(Math.max(0, Math.min(0.14, g)), t, 0.2);
      if (mix) { if (DA.pan) DA.pan.pan.setTargetAtTime(mix.pan, t, 0.12); DA.lp.frequency.setTargetAtTime(mix.cutoff, t, 0.2); }
    } catch (er) { /* a closed context */ }
    T.lastDrone = mix ? { x: mix.x, y: mix.y, dist: mix.dist, pan: mix.pan, gain: g, walls: mix.walls } : null;
  }
  // despair: eased towards its target; drains fatigue (and needs, if the Journey is on); blurs the view edge
  function tickDespair(dt) {
    const target = despairTarget(nearestDrone());
    const k = target > T.despair ? 1.4 : 0.7;
    T.despair += (target - T.despair) * Math.min(1, dt * k);
    if (T.despair < 0.01) T.despair = 0;
    if (T.despair <= 0.04) return;
    const p = G.player;
    if (!T.despairTold) { T.despairTold = true; msg(M_DESPAIR, 'warn', 6000); }
    p.fat = Math.max(0, p.fat - dt * 6.0 * T.despair);   // resting gives back 2 a second: near it, you only sink
    if (typeof drainNeeds === 'function' && typeof needsOn === 'function' && needsOn()) drainNeeds((dt / 90) * 1.5 * T.despair);
  }
  const visualLevel = () => (!despairOn() || reduced()) ? 0 : T.despair;
  function drawDespair(level) {
    const ctx = Engine.ctx, w = VW, h = VIEW_H;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    const pulse = 0.92 + 0.08 * Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) / 1600);
    const lv = clamp01(level * pulse);
    // soften the rim: two shifted copies of the frame, kept to a ring
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(w * 0.22, h * 0.2, w * 0.56, h * 0.6); ctx.clip('evenodd');
    ctx.globalAlpha = 0.34 * lv; ctx.drawImage(Engine.canvas, 0, 0, w, h, -3, -2, w + 6, h + 4);
    ctx.globalAlpha = 0.22 * lv; ctx.drawImage(Engine.canvas, 0, 0, w, h, 2, 1, w - 4, h - 2);
    ctx.restore();
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, 'rgba(14,20,26,0)'); g.addColorStop(1, 'rgba(10,14,20,' + (0.82 * lv).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ---------------------------------------------------------------- per-frame work
  let syncAt = -9;
  function tick(dt) {
    if (typeof G === 'undefined' || !G.player || !G.map || G.state !== 'play') return;
    if (!(dt > 0) || dt > 1) dt = 0.016;
    if (G.time - syncAt > 1) { syncAt = G.time; validate(); if (known() && !flag('known')) setFlag('known'); syncRoad(); }
    if (T.sever > 0) { T.sever = Math.max(0, T.sever - dt); if (T.sever <= 0) msg(M_SEVER_END, '', 3000); }
    tickDespair(dt);
    droneAudio();
    if (!inMine(G.mapId)) return;
    const c = Engine.cam;
    // hush-lamp safe points: beside one, the stillness cannot get a hold
    for (const o of G.ents) if (o.sprite === 'lamp' && !o.hidden && Math.hypot(o.x - c.x, o.y - c.y) < 2.4) { G.stillT = 0; break; }
    // a fair warning: a Fret-crawler lying still within a few paces
    if (G.mapId === 'greenroot_crypt' && !T.hinted) {
      for (const e of G.ents) if (cloakFret(e) && !e.hidden && Math.hypot(e.x - c.x, e.y - c.y) < 3.2) { T.hinted = true; msg(M_CRAWLER, 'warn', 5500); break; }
    }
  }

  // ---------------------------------------------------------------- Options row
  const PREF_KEY = 'octave.p9.despair.v1';
  function loadPref() { try { const o = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (o && (o.on === 0 || o.on === 1)) UPG.p9Despair = o.on === 1; } catch (e) { /* no storage */ } }
  function savePref() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ on: despairOn() ? 1 : 0 })); } catch (e) { /* no storage */ } }
  function setDespair(on) { UPG.p9Despair = !!on; savePref(); if (!on) { T.despair = 0; } const b = document.getElementById('p9-despair'); if (b) syncBtn(b); return despairOn(); }
  function syncBtn(b) { b.textContent = despairOn() ? 'On' : 'Off'; b.setAttribute('aria-pressed', despairOn() ? 'true' : 'false'); b.classList.toggle('sel', despairOn()); }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p9-despair')) return;
    const lab = document.createElement('span'); lab.className = 'gfx-label'; lab.id = 'p9-despair-label'; lab.textContent = 'Mire-drone despair ';
    const small = document.createElement('small'); small.className = 'muted'; small.textContent = 'a heavy view-edge, drained strength and a low hum near a Mire-drone'; lab.appendChild(small);
    const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = 'p9-despair'; b.type = 'button'; b.setAttribute('aria-label', 'Mire-drone despair');
    b.onclick = () => { setDespair(!despairOn()); syncBtn(b); };
    syncBtn(b);
    const anchor = document.getElementById('rp-toggle') || document.getElementById('ac-cap');
    if (anchor && anchor.parentNode) { anchor.insertAdjacentElement('afterend', b); anchor.insertAdjacentElement('afterend', lab); }
    else { grid.appendChild(lab); grid.appendChild(b); }
  }

  // ---------------------------------------------------------------- wiring: wrappers, never edits
  function wrap() {
    if (typeof useDeco === 'function') {
      const _f = useDeco;
      useDeco = function (e) {
        try { if (e && typeof e.use === 'string' && e.use.indexOf('p9p_') === 0 && onUse(e)) return; } catch (er) { console.warn('parish use failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof wallLabel === 'function') {
      const _f = wallLabel;
      wallLabel = function (cell) { if (cell && typeof cell.p9pLook === 'string') return cell.p9pLook; return _f.apply(this, arguments); };
    }
    if (typeof useItem === 'function') {
      const _f = useItem;
      useItem = function (slot) {
        try { if (slot && slot.id === 'p9_greenroot_register') { showRegister(false); return; } } catch (er) { console.warn('parish item failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof renderDialogue === 'function') {
      const _f = renderDialogue;
      renderDialogue = function (mode) {
        if (offerPending) { offerPending = false; if (typeof DLG !== 'undefined' && DLG.choices && DLG.choices.length) mode = 'choice'; }
        const r = _f.apply(this, [mode].concat([].slice.call(arguments, 1)));
        try {
          if (mode === 'tell') {
            const ok = availableTopics(npcId());
            // TOPIC_KEYS is left alone (the rumours test counts it): the topics that apply to this person are appended here
            const box = document.getElementById('d-topics');
            if (box) for (const t of [TOPIC_ROAD, TOPIC_PARISH, TOPIC_REG]) {
              if (!ok[t] || box.querySelector('[data-topic]') && Array.from(box.querySelectorAll('[data-topic]')).some((x) => x.getAttribute('data-topic') === t)) continue;
              const b = document.createElement('button'); b.className = 'dfbtn small'; b.setAttribute('data-topic', t); b.textContent = t;
              b.onclick = () => { askTopic(t); renderDialogue('tell'); };
              box.appendChild(b);
            }
          }
        } catch (er) { console.warn('parish topics failed', er); }
        return r;
      };
    }
    if (typeof askTopic === 'function') {
      const _f = askTopic;
      askTopic = function (t) {
        if (isMine(t)) { try { askMine(t); return; } catch (er) { console.warn('parish topic failed', er); return; } }
        return _f.apply(this, arguments);
      };
    }
    if (typeof castSong === 'function') {
      const _f = castSong;
      castSong = function (id) {
        if (T.sever > 0 && id !== 'murmur' && typeof SONGS !== 'undefined' && SONGS[id] && G.song.t <= 0 && G.attack.t <= 0) { msg(M_SEVER_BLOCK, 'bad', 2600); return; }
        const p = G.player, s = typeof SONGS !== 'undefined' ? SONGS[id] : null, before = p ? p.voice : 0;
        const r = _f.apply(this, arguments);
        try {
          if (p && s && s.cost > 0 && G.song.t > 0 && before - p.voice >= s.cost - 0.01) {
            if (G.has('p9_verrow_reedcase')) p.voice = Math.min(p.voiceMax, p.voice + Math.max(1, Math.round(s.cost * 0.25)));
            if ((id === 'root' || id === 'tending') && G.mapId === 'greenroot_crypt') singWall();
          }
        } catch (er) { console.warn('parish song failed', er); }
        return r;
      };
    }
    if (typeof damagePlayer === 'function') {
      const _f = damagePlayer;
      damagePlayer = function (dmg, src) {
        const r = _f.apply(this, arguments);
        try { if (src === ENEMY_DEFS.fretcrawler.name && !G.dead) sever(); } catch (er) { console.warn('parish sever failed', er); }
        return r;
      };
    }
    if (typeof drawHUD === 'function') {
      const _f = drawHUD;
      drawHUD = function () {
        const r = _f.apply(this, arguments);
        try {
          const lv = visualLevel();
          if (lv > 0.03 && G.player && G.state !== 'title') drawDespair(lv);
          const ctx = Engine.ctx, y0 = VIEW_H;
          const heavy = despairOn() && reduced() && T.despair > 0.3;
          if (T.sever > 0 || heavy) {
            ctx.fillStyle = '#0e0a07'; ctx.fillRect(157, y0 + 36, 62, 9);
            ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = T.sever > 0 ? '#e0a070' : '#9aa8b8';
            ctx.fillText(T.sever > 0 ? 'SEVERED ' + Math.ceil(T.sever) : 'HEAVY', 188, y0 + 42);
          }
        } catch (er) { console.warn('parish hud failed', er); }
        return r;
      };
    }
    if (typeof animCreature === 'function') {
      const _f = animCreature;
      animCreature = function (e, dt, TT) {
        const r = _f.apply(this, arguments);
        try {
          if (cloakFret(e)) {
            const moved = e._p9x !== undefined && Math.hypot(e.x - e._p9x, e.y - e._p9y) > 0.0015;
            e._p9x = e.x; e._p9y = e.y;
            const seen = moved || (e.animHurt || 0) > 0.05 || e.stun > 0 || e.state === 'passive';
            const want = seen ? 1 : 0.07;
            const step = (dt || 0.016) * (want > (e._p9a === undefined ? 0 : e._p9a) ? 7 : 1.1);
            e._p9a = reduced() ? want : (e._p9a === undefined ? want : (want > e._p9a ? Math.min(want, e._p9a + step) : Math.max(want, e._p9a - step)));
            e.animAlpha = Math.min(e.animAlpha === undefined ? 1 : e.animAlpha, e._p9a);
          }
        } catch (er) { console.warn('parish cloak failed', er); }
        return r;
      };
    }
    if (typeof update === 'function') {
      const _f = update;
      update = function (dt) {
        const r = _f.apply(this, arguments);
        try { tick(dt); } catch (er) { console.warn('parish tick failed', er); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _f = loadMap;
      loadMap = function (id, pos) {
        try {
          validate();
          if (inMine(id) && greening()) {            // the road is gone: a hostile or stale save lands in the clearing
            const cl = mapOf('clearing');
            if (cl) { id = 'clearing'; pos = cl._p9pRoad ? { x: cl.w - 2.4, y: cl._p9pRoad.y + 0.5, dir: Math.PI } : null; }
          }
          if (inMine(id)) applyMapState(id);
          if (id === 'clearing') syncRoad();
        } catch (er) { console.warn('parish load failed', er); }
        const r = _f.call(this, id, pos);
        try {
          T.hinted = false; T.despairTold = false; rung.length = 0;
          if (inMine(G.mapId)) arrive();
        } catch (er) { console.warn('parish arrival failed', er); }
        return r;
      };
    }
    if (typeof buildAllMaps === 'function') {
      const _f = buildAllMaps;
      buildAllMaps = function () {
        const maps = _f.apply(this, arguments);
        try { paintTextures(); buildAll(maps); } catch (er) { console.warn('parish maps failed', er); }
        return maps;
      };
    }
    if (typeof startGame === 'function') {
      const _f = startGame;
      startGame = function () { T.sever = 0; T.despair = 0; rung.length = 0; return _f.apply(this, arguments); };
    }
    if (typeof restoreGame === 'function') {
      const _f = restoreGame;
      restoreGame = function () { T.sever = 0; T.despair = 0; rung.length = 0; return _f.apply(this, arguments); };
    }
  }
  // a hostile save can put the camera inside a wall of one of these maps: find the nearest free floor
  function arrive() {
    const m = G.map, c = Engine.cam;
    if (m.isBlocked(c.x | 0, c.y | 0) || !isFinite(c.x) || !isFinite(c.y)) { c.x = m.spawn.x; c.y = m.spawn.y; c.dir = m.spawn.dir || 0; try { settleFeet(); } catch (e) { /* ok */ } }
    if (G.mapId === 'greenroot' && !flag('visited')) { setFlag('visited'); learn(false); journal('side', J_ARRIVE); }
    if (G.mapId === 'greenroot_crypt' && !flag('crypt')) { setFlag('crypt'); if (typeof UPG !== 'undefined' && !UPG.lantern) msg(M_DARK, 'warn', 6500); }
    if (G.has && G.has('p9_verrow_reedcase') && !T.caseTold) { T.caseTold = true; msg(M_CASE, '', 3500); }
  }
  function singWall() {
    if (flag('wall')) return false;
    const c = Engine.cam;
    if (Math.hypot(c.x - 17.5, c.y - 6.5) > 3.8 || c.y < 6.6) { msg(M_WALL_NO, '', 3000); return false; }
    setFlag('wall'); applyMapState('greenroot_crypt');
    try { Audio_.sfx.crack(); } catch (er) { /* silent */ }
    msg(M_WALL, 'good', 6000);
    return true;
  }

  // ---------------------------------------------------------------- travel, rumours, the Gazette
  function wireTravel() {
    if (typeof TRAVEL_REGIONS === 'undefined' || !TRAVEL_REGIONS.reach) return;
    const R = TRAVEL_REGIONS.reach;
    if (!R.maps.greenroot) R.maps.greenroot = { ch: 1, rect: [0.745, 0.17, 0.985, 0.42], risk: 0.12 };
    if (!R.extra.some((x) => x.map === 'greenroot' && x.spawn)) R.extra.push({ map: 'greenroot', spawn: true, name: 'Greenroot, the third parish' });
    if (typeof TRAVEL_FOES !== 'undefined' && !TRAVEL_FOES.greenroot) TRAVEL_FOES.greenroot = ['hound'];
    if (typeof travelDestinations === 'function') {
      const _f = travelDestinations;
      travelDestinations = function (regionId) {
        const out = _f.apply(this, arguments);
        if (!greening()) return out;
        return out.filter((d) => !inMine(d.map) && !inMine(d.door));      // after the Greening the road is under the green
      };
    }
  }
  function wireStory() {
    if (typeof STORYRUM === 'undefined') return;
    const ids = new Set(STORYRUM.RUMOURS.map((r) => r.id));
    for (const d of RUMOUR_DEFS) if (!ids.has(d.id)) STORYRUM.RUMOURS.push(Object.assign({}, d));
    for (const issue of STORYRUM.ISSUES) {
      if (issue.items.some((it) => it && it.t === GAZETTE_ITEMS[0].t)) continue;
      for (const g of GAZETTE_ITEMS) issue.items.push(Object.assign({}, g));
    }
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _f = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _f.apply(this, arguments);
      try { appendRows(); } catch (er) { console.warn('parish rows failed', er); }
      return r;
    };
  }

  function state() {
    return { sever: T.sever, despair: T.despair, visual: visualLevel(), rung: rung.slice(), drone: T.lastDrone, known: known(), greening: greening() };
  }
  function init() {
    loadPref();
    paintProps(); paintTextures(); paintFoes(); installCatalog();
    wrap(); wireTravel(); wireStory();
    if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenu); else wireMenu();
  }
  init();

  return {
    FP, MAPS, SEVER_SECS, BELLS, BELL_ORDER, BELL_NAMES, REGISTER_TITLE, REGISTER_PAGES, TOPIC_ROAD, TOPIC_PARISH, TOPIC_REG,
    ENEMY_DEFS, ITEM_DEFS, POSES, T, state, flag, setFlag, known, learn, validate, applyMapState, droneMix, onUse, ringBell, sever, deliver, availableTopics,
    showRegister, takeRegister, singWall, setDespair, despairOn, visualLevel, despairTarget, tick, appendRows,
    text: { DOORS, T_LABEL, CH, CR, REGISTER_HTML, ROAD_SHUT, ROAD_CLOSED, CLOSED_LINE, J_ROAD, J_ARRIVE, J_REG, J_FILED, J_KEPT, ASK_OFFER, PARISH_REPLY, M_SEVER, M_SEVER_BLOCK, M_SEVER_END, M_DESPAIR, M_CRAWLER, M_DARK, M_WALL, M_WALL_NO, M_LEVER_GATE, M_LEVER_BAR, M_BELL_OK, M_BELL_BAD, M_BELL_DONE, M_CASE, RUMOUR_DEFS, GAZETTE_ITEMS, TOPIC_DEFS, ITEM_DEFS, ENEMY_DEFS },
  };
})();
