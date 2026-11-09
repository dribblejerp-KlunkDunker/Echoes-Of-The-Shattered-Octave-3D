// ============================================================
//  greening14 — Phase 14 "A world that shows the story", the GREENING team.
//
//  Three effects, each behind its own GFX switch (Options -> Graphics & access). All are PROCEDURAL STAND-INS
//  for hand-painted art. Nothing here changes damage, AI, RNG order or quest logic, and nothing is saved except
//  two tiny "this animation has played" integers (p14g_gv, p14g_gg). What a place LOOKS like is derived from
//  the story flags every time, so an old save shows the right stage the moment it loads.
//
//  1. greenStages  Oakhaven (and what is left of the Reach) grows greener as the story nears the Greening:
//       stage 0  nothing                                   (the game as it was)
//       stage 1  kaelen_met      the Root has been woken: moss and a few flowers in the paving cracks
//       stage 2  coil_done       the Rite is days away: vines on the shuttered houses, more moss
//       stage 3  rite_started /  Hearthday: the vines reach the eaves (you are underground; this is what a
//                bore_seated     save loaded in Oakhaven shows)
//       stage 4  greening        the bit has snapped. The escape timer drives the growth: it CREEPS, cell by
//                                cell, while the clock runs (roots break the square, leaves thicken)
//       stage 5  escaped /       the Greening is done: the full, overgrown town
//                part3 / part4
//     Wall growth is decals (the engine's per-cell decal slot); ground growth (moss, flowers, roots) is a floor
//     pass in the same world-space style as js/look10.js. Maps: Oakhaven (all stages), the clearing's Hedge,
//     the Greenhall, Greenroot (stage 4 and 5 only, the Greening reached them last). With Reduce motion the
//     growth moves in a few coarse steps instead of creeping.
//  2. glassSpread  Light-glass grows across nearby walls and floor at the moments it belongs to:
//       Root-vault  rite_started (R 4) -> bore_seated (R 7) -> greening (R 11), spreading cell by cell from
//                   the bore, with a faint glassy chime, and staying grown afterwards;
//       Whisper-Grove  part3: small clusters around its Light-glass (the Sunken Court shard), R 3.
//     "Has it played" is p14g_gv / p14g_gg (small ints, clamped); the grown STATE is derived from story flags.
//  3. rootVeins    Glowing veins on walls and floor around the Anchor-roots (js/songcraft12.js knows where they
//     are: the quarry shaft, the Root-vault bore, the Malting's Tuning Room floor). They pulse slowly
//     (about 1.2 s, a visual 174 Hz) and are brighter as you come near. No flashes / Reduce motion: steady glow.
//
//  A switch that is off returns before touching a pixel or a decal; the frame is the original frame.
// ============================================================
'use strict';

const G14_FLAGS = ['greenStages', 'glassSpread', 'rootVeins'];
if (typeof GFX !== 'undefined') {
  for (const k of G14_FLAGS) {
    if (GFX[k] === undefined) GFX[k] = true;
    if (GFX.FX && !GFX.FX.includes(k)) GFX.FX.push(k);
  }
}

const GREENING14 = (() => {
  const KEY = 'octave.greening14.v1';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player && typeof Engine !== 'undefined';

  // ---------------------------------------------------------------- tuning table (all the numbers live here)
  const CFG = {
    amount: [0, 0.10, 0.24, 0.40, 0.52, 1.0],        // how much of the eligible growth shows, per stage (stage 4 adds 0.40 x timer progress)
    timerTotal: 300,                                  // game.js starts the escape timer at 300 s
    creepStep: 1 / 128,                                // finest step of the creep (a new cell or leaf level about every few seconds)
    calmStep: 0.15,                                   // Reduce motion: the growth moves in these coarse steps
    outerFrom: 0.5,                                   // maps other than Oakhaven only start to show at this amount
    glass: { speed: 1.25, calm: 0, chimeGap: 0.42 },  // cells per second; chime spacing in seconds
    vein: { period: 1.2, radius: 9, wallP: 0.62, paths: 6 },
    ground: { mossDensity: 0.62, wallDensity: 0.66 },
  };

  // ---------------------------------------------------------------- settings
  const stored = {}; for (const k of G14_FLAGS) stored[k] = null;
  let mineChanging = false;
  function loadSettings() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of G14_FLAGS) if (typeof o[k] === 'boolean') stored[k] = o[k];
    } catch (e) { /* storage may be blocked: the flags keep their preset values */ }
    for (const k of G14_FLAGS) if (stored[k] !== null && typeof GFX !== 'undefined') GFX[k] = stored[k];
  }
  function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch (e) { /* optional */ } }
  function setFlag(k, on) {
    mineChanging = true;
    try { GFX[k] = !!on; stored[k] = !!on; saveSettings(); GFX.changed(); } finally { mineChanging = false; }
  }

  // ---------------------------------------------------------------- small helpers
  function hash(ix, iy, seed) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  }
  function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h ^ 0x6e0e17) >>> 0; }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }
  const px32 = (r, g, b, a) => ((((a === undefined ? 255 : a) & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
  const c8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

  // ==============================================================================================
  //  ART: wall decals (64x64, the engine's decal size) and ground tiles (32x32, drawn by our own pass)
  // ==============================================================================================
  const T = 64, GT = 32;
  let texBytes = 0;
  const wallNames = { vine: [[], []], crystal: [[], []], vein: {} };   // vine[pattern][level], crystal[pattern][level], vein[tint][pattern][level] (lazy)
  const blank = () => new Uint32Array(T * T);
  const made = new Map();   // name -> data (the wall-glow pass reads the decals back to light them)
  function register(name, data) { Engine.addTexture(name, data); made.set(name, data); texBytes += data.length * 4; return name; }

  // a soft disc stamp
  function stamp(d, size, x, y, rad, r, g, b) {
    const x0 = Math.floor(x - rad), x1 = Math.ceil(x + rad), y0 = Math.floor(y - rad), y1 = Math.ceil(y + rad);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) <= rad * rad) d[yy * size + xx] = px32(r, g, b);
    }
  }

  // ---- vines: stems from the foot of the wall climbing to a height that grows with the level --------------
  // The same seeded stems are used for every level, so level n+1 is level n plus more, never a different drawing.
  function paintVine(pattern, level) {
    const d = blank(), rnd = rng(7100 + pattern * 131);
    const reach = [0.30, 0.52, 0.78, 1.0][level], leaf = [1.3, 1.9, 2.5, 3.0][level];
    const stems = pattern === 0 ? 3 : 4;
    for (let s = 0; s < stems; s++) {
      const x0 = pattern === 0 ? 10 + s * 22 + rnd() * 6 : 6 + s * 17 + rnd() * 6;
      const ph = rnd() * 6.28, amp = 2 + rnd() * 3.5, topFull = 4 + rnd() * 14, lean = (rnd() - 0.5) * 0.35;
      const len = (T - topFull) * reach;
      const path = [];
      for (let i = 0; i <= len; i++) path.push([x0 + Math.sin(ph + i * 0.17) * amp + lean * i, T - 1 - i]);
      for (let i = 0; i < path.length; i++) {
        const [x, y] = path[i], g = 62 + 20 * vnoise(x / 4, y / 4, 5);
        stamp(d, T, x, y, 1.05, 54, g, 36);
        if (i % 5 === 3) {   // leaves: pairs, bigger lower down
          const side = (i / 5 | 0) % 2 ? 1 : -1, lr = leaf * (0.75 + 0.35 * hash(i, s, 3)) * (0.7 + 0.5 * (1 - i / Math.max(1, len)));
          for (const sd of [side, -side]) {
            const lx = x + sd * (lr + 0.6), ly = y - 1 - hash(i, s, 9) * 2;
            const hv = vnoise(lx / 3, ly / 3, 11);
            stamp(d, T, lx, ly, lr, 40 + hv * 30, 98 + hv * 60, 36 + hv * 16);
            stamp(d, T, lx - 0.7, ly - 0.7, lr * 0.45, 108 + hv * 30, 168 + hv * 30, 72);
          }
        }
        if (level === 3 && i % 23 === 11 && pattern === s % 2) {   // a few small flowers once it is thick
          const col = hash(i, s, 21) > 0.5 ? [236, 230, 200] : [226, 188, 84];
          stamp(d, T, x + 3, y - 2, 1.4, col[0], col[1], col[2]);
        }
      }
      if (level >= 1) {   // side tendrils
        for (let k = 0; k < 2 + level; k++) {
          const at = path[Math.min(path.length - 1, 6 + ((k * 9 + s * 4) % Math.max(1, path.length - 6)))];
          if (!at) continue;
          const dir = k % 2 ? 1 : -1, tl = 6 + level * 3;
          for (let i = 0; i < tl; i++) stamp(d, T, at[0] + dir * i * 0.9, at[1] - i * 0.55 + Math.sin(i * 0.6), 0.9, 56, 78, 38);
          stamp(d, T, at[0] + dir * tl * 0.9, at[1] - tl * 0.55, leaf * 0.9, 52, 120, 44);
        }
      }
    }
    return d;
  }

  // ---- light-glass: prisms rising from the foot of a wall (or tucked into a corner) ------------------------
  function prism(put, x, base, h, w, lean, tone) {
    for (let r = 0; r <= h; r++) {
      const u = r / h, half = w * Math.pow(1 - u, 0.72) + (r === h ? 0 : 0.4);
      const cx = x + lean * r;
      for (let k = -Math.floor(half); k <= Math.floor(half); k++) {
        const side = half > 0 ? k / half : 0;
        const light = 0.66 + 0.34 * (-side) + 0.1 * (1 - u);
        let rr = 70 + 110 * light, gg = 170 + 70 * light, bb = 170 + 70 * light;
        if (tone) { rr += 30; gg += 6; bb -= 22; }                       // faintly warm
        if (Math.abs(k) >= Math.floor(half) && half > 1) { rr = 205; gg = 255; bb = 250; }     // bright edge
        if (r < 2) { rr *= 0.7; gg *= 0.8; bb *= 0.8; }                  // the root of it is dim
        put(Math.round(cx + k), base - r, c8(rr), c8(gg), c8(bb));
      }
    }
  }
  function paintCrystalWall(pattern, level) {
    const d = blank(), rnd = rng(8200 + pattern * 97);
    const put = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < T && y < T) d[y * T + x] = px32(r, g, b); };
    const scale = [0.45, 0.72, 1.0][level];
    const crystals = pattern === 0
      ? [[14, 62, 30, 5, 0.12], [26, 63, 21, 4, -0.1], [40, 62, 36, 6, 0.06], [52, 63, 24, 4.5, -0.14], [33, 63, 14, 3, 0.2], [7, 63, 15, 3, 0.1], [58, 63, 17, 3.5, -0.2]]
      : [[6, 40, 24, 4.5, 0.3], [12, 56, 30, 5, 0.2], [20, 63, 38, 6, 0.05], [34, 63, 18, 4, -0.1], [46, 62, 28, 5, -0.12], [56, 63, 22, 4, -0.22], [28, 50, 12, 3, 0.4]];
    for (const [x, b, h, w, lean] of crystals) prism(put, x, b, Math.max(4, Math.round(h * scale)), Math.max(1.6, w * scale), lean, rnd() > 0.5);
    return d;
  }

  // ---- root veins climbing a wall: a trunk and branches, in a bright core with a darker rim ---------------
  function paintVeinWall(tint, pattern, level) {
    const d = blank(), rnd = rng(9300 + pattern * 71);
    const k = [0.58, 0.8, 1.0][level];
    const core = tint === 'l' ? [236, 220, 255] : [236, 255, 150], rim = tint === 'l' ? [138, 96, 196] : [96, 190, 70];
    const pts = [];
    const branch = (x, y, ang, len, w, depth) => {
      for (let i = 0; i < len; i++) {
        x += Math.cos(ang) * 0.9; y += Math.sin(ang) * 0.9; ang += (rnd() - 0.5) * 0.42;
        if (x < 1 || y < 0 || x > T - 2 || y > T - 1) return;
        pts.push([x, y, w]);
        if (depth < 2 && i > 7 && rnd() < 0.045) branch(x, y, ang + (rnd() < 0.5 ? 0.85 : -0.85), (len * 0.6) | 0, Math.max(0.5, w * 0.72), depth + 1);
      }
    };
    const stemsX = pattern === 0 ? [16, 44] : [12, 50];
    for (const sx of stemsX) branch(sx + rnd() * 6, T - 1, -Math.PI / 2 + (rnd() - 0.5) * 0.4, 66, 1.0, 0);
    for (const [x, y, w] of pts) stamp(d, T, x, y, w * 0.9 + 0.9, rim[0] * k, rim[1] * k, rim[2] * k);      // the darker rim
    for (const [x, y, w] of pts) if (hash((x * 2) | 0, (y * 2) | 0, 4 + pattern) > 0.08) stamp(d, T, x, y, w * 0.45 + 0.2, core[0] * k, core[1] * k, core[2] * k);   // the bright core
    return d;
  }

  function wallTex(kind, tint, pattern, level) {   // the texture NAME, painting it on first use
    let name;
    if (kind === 'vine') { name = 'g14_vine' + pattern + level; if (!made.has(name)) register(name, paintVine(pattern, level)); }
    else if (kind === 'crystal') { name = 'g14_cry' + pattern + level; if (!made.has(name)) register(name, paintCrystalWall(pattern, level)); }
    else { name = 'g14_vein' + tint + pattern + level; if (!made.has(name)) register(name, paintVeinWall(tint, pattern, level)); }
    return name;
  }

  // ---- ground tiles -----------------------------------------------------------------------------------
  // kinds: 1 growth (lit by the ground it sits on), 2 glass (own colour, faint glow), 3 vein (own colour, glow per cell)
  const GROUND = [null];   // id -> { d: Uint32Array(32*32), kind, flip }
  const gId = { moss: [], root: {}, crystal: [], vein: {} };
  function newTile() { return new Uint32Array(GT * GT); }
  function tput(d, x, y, r, g, b, a) { if (x >= 0 && y >= 0 && x < GT && y < GT) d[(y | 0) * GT + (x | 0)] = px32(c8(r), c8(g), c8(b), c8(a)); }
  function tdisc(d, x, y, rad, r, g, b, a) {
    for (let yy = Math.floor(y - rad); yy <= Math.ceil(y + rad); yy++) for (let xx = Math.floor(x - rad); xx <= Math.ceil(x + rad); xx++)
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) <= rad * rad) tput(d, xx, yy, r, g, b, a);
  }
  function addGround(d, kind, flip) { GROUND.push({ d, kind, flip: !!flip }); return GROUND.length - 1; }

  // Moss and flowers are NOT painted per tile: a tileable world-space noise (period 8 cells) is thresholded per pixel, so a patch
  // runs on across neighbouring cells instead of ending in a square. Flowers come from a second sparse table.
  const NZ = 256, NOISE = new Uint8Array(NZ * NZ), FL_RANK = new Uint8Array(NZ * NZ).fill(255), FL_COL = new Uint32Array(NZ * NZ);
  (function buildNoise() {
    const lat = (x, y, o) => hash(((x % 16) + 16) % 16, ((y % 16) + 16) % 16, 61 + o);   // lattice that wraps every 16 cells = 256 px
    for (let y = 0; y < NZ; y++) for (let x = 0; x < NZ; x++) {
      let v = 0, amp = 0.5, tot = 0;
      for (let o = 0; o < 3; o++) {
        const f = 16 / NZ * (1 << o) * (o === 2 ? 2 : 1), px = x * f, py = y * f, per = 16 * (1 << o) * (o === 2 ? 2 : 1);
        const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const w = (ix, iy) => hash(((ix % per) + per) % per, ((iy % per) + per) % per, 61 + o);
        const a = w(x0, y0), b = w(x0 + 1, y0), c = w(x0, y0 + 1), d = w(x0 + 1, y0 + 1);
        v += ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy) * amp; tot += amp; amp *= 0.5;
      }
      NOISE[y * NZ + x] = c8(v / tot * 255);
    }
    const fr = rng(7777);
    for (let i = 0; i < 520; i++) {
      const x = (fr() * NZ) | 0, y = (fr() * NZ) | 0, k = fr(), rank = (fr() * 254) | 0;
      const col = k < 0.4 ? [244, 242, 224] : k < 0.75 ? [238, 200, 72] : [196, 156, 236];
      for (const [dx, dy, sh] of [[0, 0, 1], [1, 0, 1], [0, 1, 0.82], [1, 1, 0.82]]) {
        const j = ((y + dy) & 255) * NZ + ((x + dx) & 255);
        FL_RANK[j] = rank; FL_COL[j] = px32(col[0] * sh, col[1] * sh, col[2] * sh);
      }
    }
  })();
  // a path tile: lines from the centre to the middle of each marked edge (bit 1 N, 2 E, 4 S, 8 W)
  function paintPathTile(mask, style, thick) {
    const d = newTile(), rnd = rng(5000 + mask * 13 + (style === 'root' ? 700 : 0) + thick);
    const ends = [[16, 0], [31, 16], [16, 31], [0, 16]];
    const cx = 16 + (rnd() - 0.5) * 3, cy = 16 + (rnd() - 0.5) * 3;
    const w = style === 'root' ? (thick ? 4.0 : 2.7) : (thick ? 1.1 : 0.8);
    const draw = (paint) => {
      for (let s = 0; s < 4; s++) {
        if (!(mask & (1 << s)) && !(mask === 0 && s === 0)) continue;
        const [ex, ey] = mask === 0 ? [16, 10] : ends[s], wob = (rnd() - 0.5) * (style === 'root' ? 15 : 9);
        const steps = 26;
        for (let i = 0; i <= steps; i++) {
          const u = i / steps, bend = Math.sin(u * Math.PI) * wob;
          const x = cx + (ex - cx) * u + (s % 2 === 0 ? bend : 0), y = cy + (ey - cy) * u + (s % 2 === 1 ? bend : 0);
          paint(x, y, u);
        }
      }
      paint(cx, cy, 0);
    };
    if (style === 'root') {
      const r2 = rng(5000 + mask * 13 + 700 + thick);
      draw((x, y) => tdisc(d, x, y, w + 1.6, 150, 138, 110, 255));            // cracked, lifted paving round it
      draw((x, y) => tdisc(d, x, y, w, 70 + r2() * 12, 52 + r2() * 8, 34, 255));
      draw((x, y) => tdisc(d, x - 0.7, y - 0.7, w * 0.45, 112, 86, 56, 255)); // lit upper side
      draw((x, y, u) => { if (r2() < 0.16) tdisc(d, x, y + 1, 1, 56, 112, 44, 255); });   // moss in the bark
    } else {
      draw((x, y) => tdisc(d, x, y, w + 1.7, 120, 205, 90, 110));            // soft halo
      draw((x, y) => tdisc(d, x, y, w + 0.5, 150, 235, 110, 235));
      draw((x, y) => tdisc(d, x, y, w * 0.55, 245, 255, 190, 255));          // hot core
    }
    return d;
  }
  function paintCrystalTile(variant, level) {
    const d = newTile(), rnd = rng(6100 + variant * 29 + level);
    const n = [3, 5, 7][level], sc = [0.6, 0.85, 1.1][level];
    for (let i = 0; i < n; i++) {
      const x = 5 + rnd() * 22, y = 10 + rnd() * 20, h = (5 + rnd() * 8) * sc, w = (1.4 + rnd() * 1.4) * sc, lean = (rnd() - 0.5) * 0.5;
      const base = Math.min(31, Math.round(y + h * 0.5));
      for (let r = 0; r <= h; r++) {
        const u = r / h, half = w * Math.pow(1 - u, 0.7) + 0.35;
        for (let k = -Math.floor(half); k <= Math.floor(half); k++) {
          const sd = half > 0 ? k / half : 0, lt = 0.66 + 0.34 * -sd;
          tput(d, x + lean * r + k, base - r, 80 + 110 * lt, 176 + 70 * lt, 176 + 70 * lt, 255);
        }
      }
      tdisc(d, x, base, w + 1.6, 120, 230, 220, 60);
    }
    return d;
  }
  (function buildGround() {
    for (let lv = 0; lv < 3; lv++) { gId.moss[lv] = []; for (let p = 0; p < 3; p++) { gId.moss[lv][p] = addGround(null, 4, false); GROUND[GROUND.length - 1].lv = lv; } }
    for (let th = 0; th < 2; th++) { gId.root[th] = []; for (let m = 0; m < 16; m++) gId.root[th][m] = addGround(paintPathTile(m, 'root', th), 1, false); }
    for (let lv = 0; lv < 3; lv++) { gId.crystal[lv] = []; for (let v = 0; v < 3; v++) gId.crystal[lv][v] = addGround(paintCrystalTile(v, lv), 2, true); }
    for (let th = 0; th < 2; th++) { gId.vein[th] = []; for (let m = 0; m < 16; m++) gId.vein[th][m] = addGround(paintPathTile(m, 'vein', th), 3, false); }
  })();
  let groundBytes = NZ * NZ * 6; for (const g of GROUND) if (g && g.d) groundBytes += g.d.length * 4;

  // ==============================================================================================
  //  STAGES (derived from the story flags)
  // ==============================================================================================
  const flags = () => (hasG() && G.flags) || {};
  function stage() {
    const f = flags();
    if (f.escaped || f.part3 || f.part4) return 5;
    if (f.greening) return 4;
    if (f.rite_started || f.bore_seated) return 3;
    if (f.coil_done || f.rite_ready) return 2;
    if (f.kaelen_met) return 1;
    return 0;
  }
  // the escape timer's share, ratcheted so a death-and-wake (which resets it to 150) never un-grows the town
  let ratchet = 0, ratchetOn = false;
  function progress() {
    const f = flags();
    if (stage() !== 4) { ratchet = 0; ratchetOn = false; return stage() === 5 ? 1 : 0; }
    // game.js sets greening first and the 300 s timer a moment later: a timer of 0 here is that gap (or a stale value), never "done"
    if (typeof G.escapeTimer === 'number' && G.escapeTimer > 0) ratchet = Math.max(ratchet, clamp(1 - G.escapeTimer / CFG.timerTotal, 0, 1));
    ratchetOn = true;
    return f.greening ? ratchet : 0;
  }
  // amount of the eligible growth that shows (0..1); quantised so the decal table is rebuilt only when it changes
  function amountNow() {
    const st = stage(), calm = typeof GFX !== 'undefined' && GFX.reduceMotion;
    let a = CFG.amount[st];
    if (st === 4) a += 0.40 * progress();
    const step = calm ? CFG.calmStep : CFG.creepStep;
    return Math.min(1, Math.round(a / step) * step);
  }

  // ==============================================================================================
  //  MAP ANALYSIS (pure functions of the map; cached per map object)
  // ==============================================================================================
  const NB = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const cellOf = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? undefined : m.cells[y * m.w + x];
  const isOpen = (m, x, y) => cellOf(m, x, y) === null;
  const faceOpen = (m, x, y) => NB.some(([dx, dy]) => isOpen(m, x + dx, y + dy));
  function floorName(m, i) {
    const idx = m.floorCells ? m.floorCells[i] : 0;
    return (idx && m.floorTextures ? m.floorTextures[idx] : m.floor) || '';
  }
  const WATER = { t_water: 1 };        // deep water takes no decal; the Grove's shallows do (glass stands in a foot of lit water)
  const WATER_ALL = { t_water: 1, t_shallows: 1 };   // growth and veins keep to dry ground
  const baseDecals = (m) => m._decalsAll || null;
  const posterLike = (name) => !!name && /^d_(poster|synod|scorch)/.test(name);

  const RULES = {   // wall growth by map: textures, density, an outer-map flag, ground texture to grow on
    oakhaven: { walls: ['t_house', 't_wood', 't_marble', 't_stone', 't_roof'], outer: false, cobble: true },
    clearing: { walls: ['t_hedge', 't_stone'], outer: true, density: 0.34 },
    greenhall: { walls: ['t_marble'], outer: true, density: 0.34 },
    chapel: { walls: ['t_marble'], outer: true, density: 0.28 },
    greenroot: { walls: ['t_house', 't_wood', 't_stone', 't_hedge', 't_marble'], outer: true, density: 0.45, cobble: true },
  };

  function oakCentres(m) {
    const out = [];
    for (const e of m.entities || []) if (e && e.kind === 'deco' && e.sprite === 'oak') out.push([e.x, e.y]);
    return out;
  }

  // greening layer: wall cells with thresholds, ground cells (moss) with thresholds, root paths
  function analyseGreening(m) {
    const rule = RULES[m.id]; if (!rule) return null;
    const seed = seedOf(m.id), A = { walls: { idx: [], thr: [], pat: [], hl: [] }, moss: { idx: [], thr: [], pat: [], hl: [] }, roots: { idx: [], thr: [], mask: [], thick: [] } };
    const oaks = oakCentres(m), base = baseDecals(m);
    const near = (x, y) => { let best = 99; for (const [ox, oy] of oaks) { const d = Math.hypot(ox - x, oy - y); if (d < best) best = d; } return best; };
    const dens = rule.density || ((m.id === 'oakhaven') ? CFG.ground.wallDensity : 0.4);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, c = m.cells[i];
      if (c && !c.door && rule.walls.indexOf(c.tex) >= 0 && faceOpen(m, x, y)) {
        if (base && posterLike(base[i])) continue;
        const bonus = clamp((7 - near(x + 0.5, y + 0.5)) / 7, 0, 1) * 0.22;   // vines like the oaks
        const cluster = vnoise(x / 3.3, y / 3.3, seed) * 0.6 + hash(x, y, seed + 1) * 0.4;
        if (cluster > 1 - (dens + bonus)) {
          A.walls.idx.push(i); A.walls.thr.push(clamp(1 - (cluster - (1 - dens - bonus)) / (dens + bonus), 0, 0.98) * 0.95);
          A.walls.pat.push(hash(x, y, seed + 2) < 0.5 ? 0 : 1); A.walls.hl.push(hash(x, y, seed + 3));
        }
      } else if (!c && rule.cobble && floorName(m, i) === 't_cobble') {
        const cluster = vnoise(x / 2.6, y / 2.6, seed + 5) * 0.55 + hash(x, y, seed + 6) * 0.45;
        if (cluster > 1 - CFG.ground.mossDensity) {
          A.moss.idx.push(i); A.moss.thr.push(hash(x, y, seed + 7) * 0.9);
          A.moss.pat.push((hash(x, y, seed + 8) * 3) | 0); A.moss.hl.push(hash(x, y, seed + 9));
        }
      }
    }
    // roots: from each oak that stands within reach of paving, walk 2-4 paths over cobble cells
    if (rule.cobble) {
      const r = rng(seed ^ 0x51ab), taken = new Map();
      const push = (i, bit) => { taken.set(i, (taken.get(i) || 0) | bit); };
      for (const [ox, oy] of oaks) {
        let sx = -1, sy = -1, bd = 99;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const cx = (ox | 0) + dx, cy = (oy | 0) + dy;
          if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h) continue;
          if (!isOpen(m, cx, cy) || floorName(m, cy * m.w + cx) !== 't_cobble') continue;
          const d = Math.hypot(cx + 0.5 - ox, cy + 0.5 - oy); if (d < bd) { bd = d; sx = cx; sy = cy; }
        }
        if (sx < 0) continue;
        const paths = 2 + ((r() * 3) | 0);
        for (let p = 0; p < paths; p++) {
          let x = sx, y = sy, dir = (r() * 4) | 0;
          const len = 3 + ((r() * 5) | 0);
          for (let s = 0; s < len; s++) {
            if (r() < 0.3) dir = (dir + (r() < 0.5 ? 1 : 3)) & 3;
            const nx = x + NB[dir][0], ny = y + NB[dir][1];
            if (!isOpen(m, nx, ny) || floorName(m, ny * m.w + nx) !== 't_cobble') break;
            push(y * m.w + x, 1 << dir); push(ny * m.w + nx, 1 << ((dir + 2) & 3));
            x = nx; y = ny;
          }
        }
      }
      const order = [...taken.keys()].sort((a, b) => a - b);
      for (const i of order) {
        const x = i % m.w, y = (i / m.w) | 0, d = near(x + 0.5, y + 0.5);
        A.roots.idx.push(i); A.roots.mask.push(taken.get(i)); A.roots.thr.push(clamp(0.2 + d * 0.07 + hash(x, y, seed + 11) * 0.18, 0, 0.95)); A.roots.thick.push(hash(x, y, seed + 12) < 0.5 ? 0 : 1);
      }
    }
    return A;
  }

  // ---- light-glass (events) ---------------------------------------------------------------------------
  // levels: [{ at: flag test, R: reach in cells }]; bit 'gv' / 'gg' remembers the level whose animation has played
  const GLASS_EVENTS = {
    rootvault: {
      key: 'p14g_gv', sources: (m) => { const out = []; for (const e of m.entities || []) if (e && e.use === 'bore') out.push([e.x, e.y]); return out.length ? out : (m.casingRoom ? [[m.casingRoom.cx + 0.5, m.casingRoom.cy + 0.5]] : []); },
      levels: [{ test: (f) => !!f.rite_started, R: 4 }, { test: (f) => !!f.bore_seated, R: 7 }, { test: (f) => !!f.greening || !!f.bore_broken, R: 11 }],
    },
    whispergrove: {
      key: 'p14g_gg', sources: (m) => { const out = []; for (const e of m.entities || []) if (e && (e.item === 'shard' || e.glassLamp || e.glassGrowth)) out.push([e.x, e.y]); if (!out.length) out.push([11.5, 21.5]); return out; },
      levels: [{ test: (f) => !!f.part3, R: 6 }],
    },
  };
  function analyseGlass(m) {
    const ev = GLASS_EVENTS[m.id]; if (!ev) return null;
    const srcs = ev.sources(m), seed = seedOf(m.id + 'g');
    const Rmax = Math.max.apply(null, ev.levels.map(l => l.R));
    // breadth-first over open cells from each source: distance along the floor, so glass climbs round corners
    const dist = new Float32Array(m.w * m.h).fill(-1), queue = [];
    for (const [sx, sy] of srcs) {
      let cx = sx | 0, cy = sy | 0;
      if (!isOpen(m, cx, cy)) { let ok = false; for (const [dx, dy] of NB) if (isOpen(m, cx + dx, cy + dy)) { cx += dx; cy += dy; ok = true; break; } if (!ok) continue; }
      const i = cy * m.w + cx; if (dist[i] < 0) { dist[i] = 0; queue.push(i); }
    }
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q], x = i % m.w, y = (i / m.w) | 0, d = dist[i];
      if (d >= Rmax) continue;
      for (const [dx, dy] of NB) {
        const nx = x + dx, ny = y + dy; if (!isOpen(m, nx, ny)) continue;
        const j = ny * m.w + nx; if (dist[j] < 0) { dist[j] = d + 1; queue.push(j); }
      }
    }
    const G2 = { walls: { idx: [], d: [], pat: [], hl: [] }, ground: { idx: [], d: [], v: [], hl: [] }, R: ev.levels.map(l => l.R), srcs };
    const base = baseDecals(m);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, c = m.cells[i];
      if (!c) {
        const d = dist[i]; if (d < 0 || WATER[floorName(m, i)]) continue;
        const keep = 0.78 - 0.5 * (d / Rmax);
        if (hash(x, y, seed + 1) < keep) { G2.ground.idx.push(i); G2.ground.d.push(d + hash(x, y, seed + 2) * 0.8); G2.ground.v.push((hash(x, y, seed + 3) * 3) | 0); G2.ground.hl.push(hash(x, y, seed + 4)); }
      } else if (!c.door) {
        let best = -1;
        for (const [dx, dy] of NB) { const nx = x + dx, ny = y + dy; if (isOpen(m, nx, ny) && dist[ny * m.w + nx] >= 0 && (best < 0 || dist[ny * m.w + nx] < best)) best = dist[ny * m.w + nx]; }
        if (best < 0) continue;
        if (base && posterLike(base[i])) continue;
        const keep = 0.95 - 0.5 * (best / Rmax);
        if (hash(x, y, seed + 5) < keep) { G2.walls.idx.push(i); G2.walls.d.push(best + 0.5 + hash(x, y, seed + 6) * 0.8); G2.walls.pat.push(hash(x, y, seed + 7) < 0.5 ? 0 : 1); G2.walls.hl.push(hash(x, y, seed + 8)); }
      }
    }
    return G2;
  }

  // ---- root veins ------------------------------------------------------------------------------------
  // Where the Anchor-roots are. js/songcraft12.js owns the list (the dowsing rod's); its story gates apply here too,
  // so the veins never show a root the rod would not point at yet. Without that module the same three places are read directly.
  function rootsHere() {
    const m = G.map, out = [];
    try {
      if (typeof SONGCRAFT !== 'undefined' && SONGCRAFT && SONGCRAFT.rootTargets) {
        for (const t of SONGCRAFT.rootTargets()) out.push({ x: t.x, y: t.y, id: t.id });
        return out;
      }
    } catch (e) { /* fall through to the direct read */ }
    const f = flags();
    if (G.mapId === 'quarry' && f.kaelen_met && !f.greening) {
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.cells[y * m.w + x]; if (c && c.portal && c.portal.map === 'rootvault') out.push({ x: x + 0.5, y: y + 0.5, id: 'quarry' }); }
    }
    if (G.mapId === 'rootvault' && f.kaelen_met) for (const e of (G.ents || [])) if (e && e.use === 'bore' && !e.dead) out.push({ x: e.x, y: e.y, id: 'rootvault' });
    if (G.mapId === 'malting' && f.part3 && Array.isArray(m.triggers)) for (const t of m.triggers) if (t && t.id === 'chorister_floor') out.push({ x: t.x, y: t.y, id: 'malting' });
    return out;
  }
  function analyseVeins(m, roots) {
    const R = CFG.vein.radius, V = { walls: { idx: [], d: [], pat: [], root: [], tint: [] }, ground: { idx: [], mask: [], d: [], root: [], thick: [] }, roots };
    const seedBase = seedOf(m.id + 'v');
    roots.forEach((rt, ri) => {
      const tint = rt.id === 'malting' ? 'l' : 'g', rr = rng(seedBase ^ Math.imul(ri + 1, 2654435761)), seed = seedBase + ri * 17;
      let sx = rt.x | 0, sy = rt.y | 0;
      if (!isOpen(m, sx, sy)) { let ok = false; for (const [dx, dy] of NB) if (isOpen(m, sx + dx, sy + dy)) { sx += dx; sy += dy; ok = true; break; } if (!ok) return; }
      // floor veins: random walks outward over open cells, each step marking the connection to the next
      const mask = new Map();
      for (let p = 0; p < CFG.vein.paths; p++) {
        let x = sx, y = sy, dir = (rr() * 4) | 0;
        for (let s = 0; s < 10; s++) {
          if (rr() < 0.35) dir = (dir + (rr() < 0.5 ? 1 : 3)) & 3;
          const nx = x + NB[dir][0], ny = y + NB[dir][1];
          if (!isOpen(m, nx, ny) || WATER_ALL[floorName(m, ny * m.w + nx)] || Math.hypot(nx + 0.5 - rt.x, ny + 0.5 - rt.y) > R) break;
          mask.set(y * m.w + x, (mask.get(y * m.w + x) || 0) | (1 << dir)); mask.set(ny * m.w + nx, (mask.get(ny * m.w + nx) || 0) | (1 << ((dir + 2) & 3)));
          x = nx; y = ny;
        }
      }
      for (const [i, mk] of mask) {
        const x = i % m.w, y = (i / m.w) | 0, d = Math.hypot(x + 0.5 - rt.x, y + 0.5 - rt.y);
        V.ground.idx.push(i); V.ground.mask.push(mk); V.ground.d.push(d); V.ground.root.push(ri); V.ground.thick.push(d < R * 0.45 ? 1 : 0);
      }
      // wall veins: wall faces within R of the root, denser the nearer
      const base = baseDecals(m);
      for (let y = Math.max(0, (rt.y - R) | 0); y <= Math.min(m.h - 1, (rt.y + R) | 0); y++) for (let x = Math.max(0, (rt.x - R) | 0); x <= Math.min(m.w - 1, (rt.x + R) | 0); x++) {
        const i = y * m.w + x, c = m.cells[i]; if (!c || c.door || !faceOpen(m, x, y)) continue;
        const d = Math.hypot(x + 0.5 - rt.x, y + 0.5 - rt.y); if (d > R) continue;
        if (base && posterLike(base[i])) continue;
        if (hash(x, y, seed + 3) < CFG.vein.wallP * (1 - 0.7 * d / R)) { V.walls.idx.push(i); V.walls.d.push(d); V.walls.pat.push(hash(x, y, seed + 4) < 0.5 ? 0 : 1); V.walls.root.push(ri); V.walls.tint.push(tint); }
      }
    });
    return V;
  }

  // ==============================================================================================
  //  LIVE STATE (module memory only: the saved game holds nothing but the two "played" ints)
  // ==============================================================================================
  const S = {
    map: null, id: null, ent: null,
    gAmt: -1, gKey: '', gid: null, gglow: null, merged: null, wallOcc: null, mergedFor: null,
    reach: 0, reachTarget: 0, level: 0, shownKey: '', animating: false, chimeAt: -9, lastChimeCell: -1, firstChime: false,
    veinKey: '', veinLevel: null, clock: 0, glowT: 0,
  };
  const stats = { ticks: 0, rebuilds: 0, wallsGreen: 0, wallsGlass: 0, wallsVein: 0, groundGreen: 0, groundGlass: 0, groundVein: 0, pixels: 0, ms: 0, calls: 0, chimes: 0, chimeCalls: 0, captions: 0, errors: 0 };
  let profile = false;
  const cache = new WeakMap();
  function entryFor(m) { let e = cache.get(m); if (!e) { e = { green: undefined, glass: undefined, veins: undefined, veinKey: '' }; cache.set(m, e); } return e; }

  const intFlag = (name, hi) => { const v = flags()[name]; return Number.isInteger(v) ? clamp(v, 0, hi) : 0; };   // hostile saves: anything else is 0
  function setIntFlag(name, v, hi) { if (hasG() && G.flags) G.flags[name] = clamp(v | 0, 0, hi); }

  // ---------------------------------------------------------------- the faint chime
  function chime(cellIx) {
    stats.chimeCalls++;
    try {
      if (typeof Audio_ === 'undefined' || !Audio_.ctx || !Audio_.sfxBus || Audio_.muted) return;
      const c = Audio_.ctx, t0 = c.currentTime, pitch = [1, 1.5, 2, 1.25, 1.875][cellIx % 5] * 528;
      for (const [mul, vol, dur] of [[1, 0.020, 1.4], [2.76, 0.007, 0.8], [5.4, 0.003, 0.4]]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = pitch * mul;
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(Audio_.sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
      }
      stats.chimes++;
    } catch (e) { /* a missing chime is not an error */ }
  }
  function capLine(text) {
    try {
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap || typeof document === 'undefined') return;
      let box = document.getElementById('ac-captions');
      if (!box) { const g = document.getElementById('game'); if (!g) return; box = document.createElement('div'); box.id = 'ac-captions'; box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', 'Sound captions'); g.appendChild(box); }
      for (const ch of box.children) if (ch.textContent === text) return;
      const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
      while (box.children.length > 4) box.removeChild(box.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
      stats.captions++;
    } catch (e) { /* captions are cosmetic */ }
  }
  const TX = { cap: '[A faint glassy chiming]' };

  // ---------------------------------------------------------------- the rebuilds
  const calmNow = () => typeof GFX !== 'undefined' && GFX.reduceMotion;
  const steadyNow = () => typeof GFX !== 'undefined' && (GFX.reduceMotion || GFX.noFlash);

  function resetMap(m) {
    entryFor(m).rootsAt = undefined;
    S.map = m; S.id = m.id; S.gAmt = -1; S.gKey = ''; S.gid = null; S.gglow = null; S.merged = null; S.wallOcc = null;
    S.reach = 0; S.reachTarget = 0; S.level = 0; S.animating = false; S.firstChime = false; S.veinKey = ''; S.veinLevel = null; S.glowT = 0;
    // glass: start from what has already been shown (so a grown place is grown the moment you arrive)
    const ev = GLASS_EVENTS[m.id];
    if (ev) { const shown = intFlag(ev.key, ev.levels.length); S.reach = shown ? ev.levels[shown - 1].R : 0; S.level = shown; }
  }
  function glassTarget(m) {
    const ev = GLASS_EVENTS[m.id]; if (!ev) return 0;
    const f = flags(); let lv = 0;
    for (let i = 0; i < ev.levels.length; i++) if (ev.levels[i].test(f)) lv = i + 1;
    return lv;
  }

  // Build the ground-id grid and the wall decal table for the current map. Priority: glass > veins > growth.
  function rebuild(m, amt) {
    const e = entryFor(m), n = m.w * m.h;
    if (e.green === undefined) e.green = GFX.greenStages ? analyseGreening(m) : undefined;
    const useG = !!GFX.greenStages && !!e.green && (m.id === 'oakhaven' ? amt > 0 : amt > CFG.outerFrom);
    const gid = new Uint8Array(n), mthr = new Uint8Array(n).fill(255);
    const merged = Object.assign({}, baseDecals(m) || {}), occ = {}, wemit = new Float32Array(n);
    let wg = 0, wgl = 0, gg = 0, ggl = 0, gv = 0;
    if (useG) {
      const A = e.green, eff = m.id === 'oakhaven' ? amt : clamp((amt - CFG.outerFrom) / (1 - CFG.outerFrom), 0, 1);
      for (let k = 0; k < A.walls.idx.length; k++) {
        const t = A.walls.thr[k]; if (eff <= t) continue;
        const lv = clamp(Math.floor((eff - t) * 5 + A.walls.hl[k]), 0, 3), i = A.walls.idx[k];
        merged[i] = wallTex('vine', '', A.walls.pat[k], lv); occ[i] = 1; wg++;
      }
      for (let k = 0; k < A.moss.idx.length; k++) {
        const t = A.moss.thr[k]; if (eff <= t) continue;
        const lv = clamp(Math.floor((eff - t) * 3.4 + A.moss.hl[k] * 0.8), 0, 2);
        gid[A.moss.idx[k]] = gId.moss[lv][A.moss.pat[k]]; mthr[A.moss.idx[k]] = 166 - lv * 22 - A.moss.hl[k] * 12; gg++;
      }
      if (stage() >= 3 || m.id !== 'oakhaven') for (let k = 0; k < A.roots.idx.length; k++) {
        const t = A.roots.thr[k]; if (eff <= t) continue;
        gid[A.roots.idx[k]] = gId.root[eff - t > 0.25 ? 1 : A.roots.thick[k] ? 1 : 0][A.roots.mask[k]]; gg++;
      }
    }
    if (GFX.rootVeins && e.veins && e.veins.ground) {
      const V = e.veins;
      for (let k = 0; k < V.ground.idx.length; k++) { gid[V.ground.idx[k]] = gId.vein[V.ground.thick[k]][V.ground.mask[k]]; gv++; }
    }
    let gl = null;
    if (GFX.glassSpread && S.reach > 0) {
      gl = e.glass || (e.glass = analyseGlass(m));
      if (gl) {
        for (let k = 0; k < gl.walls.idx.length; k++) {
          const d = gl.walls.d[k]; if (d > S.reach) continue;
          const lv = clamp(Math.floor((S.reach - d) / 1.6 + gl.walls.hl[k] * 0.6), 0, 2), i = gl.walls.idx[k];
          merged[i] = wallTex('crystal', '', gl.walls.pat[k], lv); occ[i] = 2; wgl++; wemit[i] = 0.85;
        }
        for (let k = 0; k < gl.ground.idx.length; k++) {
          const d = gl.ground.d[k]; if (d > S.reach) continue;
          const lv = clamp(Math.floor((S.reach - d) / 1.8 + gl.ground.hl[k] * 0.6), 0, 2);
          if (gid[gl.ground.idx[k]] !== 0 && GROUND[gid[gl.ground.idx[k]]].kind === 3 && gl.ground.hl[k] < 0.5) continue;   // half the vein cells keep their vein
          gid[gl.ground.idx[k]] = gId.crystal[lv][gl.ground.v[k]]; ggl++;
        }
      }
    }
    // relief maps: cells whose ground is dead flat need no per-pixel height check (Oakhaven's paving is all flat)
    const gflat = new Uint8Array(n);
    if (m.relief && typeof m.groundAt === 'function') {
      const flat = (x, y) => { try { return Math.abs(m.groundAt(x, y)) < 1e-6; } catch (er) { return false; } };
      for (let i = 0; i < n; i++) { if (!gid[i]) continue; const x = i % m.w, y = (i / m.w) | 0; gflat[i] = flat(x + 0.5, y + 0.5) && flat(x + 0.02, y + 0.02) && flat(x + 0.98, y + 0.02) && flat(x + 0.02, y + 0.98) && flat(x + 0.98, y + 0.98) ? 1 : 0; }
    }
    S.gflat = gflat;
    let allFlat = true; for (let i = 0; i < n && allFlat; i++) if (gid[i] && m.relief && !gflat[i]) allFlat = false;
    S.allFlat = allFlat;   // flat ground can never rise above the horizon line, so the pass starts there
    S.gid = gid; S.mthr = mthr; S.merged = merged; S.wallOcc = occ; S.wemit = wemit;
    if (!S.gglow || S.gglow.length !== n) S.gglow = new Float32Array(n);
    stats.rebuilds++; stats.wallsGreen = wg; stats.wallsGlass = wgl; stats.groundGreen = gg; stats.groundGlass = ggl; stats.groundVein = gv; stats.wallsVein = GFX.rootVeins && e.veins ? e.veins.walls.idx.length : 0;
    S.hasEmit = wgl > 0 || (GFX.rootVeins && !!e.veins && e.veins.walls.idx.length > 0);
    S.hasGround = gg > 0 || ggl > 0 || gv > 0 || (GFX.rootVeins && e.veins && e.veins.ground && e.veins.ground.idx.length > 0);
    S.anyWall = wg > 0 || wgl > 0 || (GFX.rootVeins && !!e.veins && e.veins.walls.idx.length > 0);
    if (S.anyWall) applyDecals(m); else restoreDecals(m);
  }
  function applyDecals(m) {
    if (S.merged) m.decals = S.merged;
    m._g14 = true;
  }
  function restoreDecals(m) {
    if (!m._g14) return;
    m._g14 = false;
    if (typeof DECALS !== 'undefined' && DECALS.sync) DECALS.sync(m); else m.decals = baseDecals(m);
  }

  // ---- veins: per-tick brightness (pulse + nearness) ------------------------------------------------------
  function veinPulse(t, d) {
    if (steadyNow()) return 1;
    return 0.72 + 0.28 * Math.sin((t / CFG.vein.period - d * 0.045) * Math.PI * 2);
  }
  function tickVeins(m, dt) {
    const e = entryFor(m);
    const V = e.veins; if (!V || !GFX.rootVeins) return false;
    const cam = Engine.cam, t = S.clock, R = CFG.vein.radius;
    let changed = false;
    // nearness to each root
    const near = V.roots.map(r => clamp(1 - Math.max(0, Math.hypot(cam.x - r.x, cam.y - r.y) - 1.5) / (R * 1.6), 0, 1));
    const gl = S.gglow;
    for (let k = 0; k < V.ground.idx.length; k++) {
      const d = V.ground.d[k], r = V.ground.root[k];
      gl[V.ground.idx[k]] = (0.28 + 0.72 * near[r]) * (1 - 0.55 * clamp(d / R, 0, 1)) * veinPulse(t, d) * 1.25;
    }
    if (!S.veinLevel || S.veinLevel.length !== V.walls.idx.length) S.veinLevel = new Int8Array(V.walls.idx.length).fill(-1);
    for (let k = 0; k < V.walls.idx.length; k++) {
      const i = V.walls.idx[k]; if (S.wallOcc && S.wallOcc[i]) continue;
      const d = V.walls.d[k], g = (0.28 + 0.72 * near[V.walls.root[k]]) * (1 - 0.5 * clamp(d / R, 0, 1)) * veinPulse(t, d);
      const lv = g > 0.62 ? 2 : g > 0.38 ? 1 : 0;
      S.wemit[i] = clamp(g, 0, 1.2) * 0.8;
      if (lv !== S.veinLevel[k]) { S.veinLevel[k] = lv; S.merged[i] = wallTex('vein', V.walls.tint[k], V.walls.pat[k], lv); changed = true; }
    }
    stats.wallsVein = V.walls.idx.length; stats.groundVein = V.ground.idx.length;
    return changed;
  }

  // the root list changes only with the map or a story flag, so it is re-read four times a second at most
  function refreshRoots(m, e) {
    if (e.rootsAt !== undefined && Math.abs(S.clock - e.rootsAt) < 0.25) return;
    e.rootsAt = S.clock;
    const roots = rootsHere(), k2 = m.id + '|' + roots.map(r => r.id + (r.x | 0) + ',' + (r.y | 0)).join(';');
    if (k2 !== e.veinKey) { e.veinKey = k2; e.veins = roots.length ? analyseVeins(m, roots) : null; S.gKey = ''; }
  }

  // ---------------------------------------------------------------- the tick
  function tick(dt) {
    if (!hasG() || !G.map) return;
    dt = clamp(+dt || 0, 0, 0.25);
    stats.ticks++;
    const m = G.map;
    if (m !== S.map) { if (S.map) restoreDecals(S.map); resetMap(m); }
    const anyOn = !!(GFX.greenStages || GFX.glassSpread || GFX.rootVeins);
    if (!anyOn) { if (m._g14) { restoreDecals(m); } S.gid = null; S.hasGround = false; S.hasEmit = false; S.gAmt = -1; S.gKey = ''; return; }
    S.clock += dt;
    // 1. growth amount (quantised)
    const amt = GFX.greenStages ? amountNow() : 0;
    // 2. glass spread
    let reachChanged = false;
    if (GFX.glassSpread && GLASS_EVENTS[m.id]) {
      const ev = GLASS_EVENTS[m.id], tgt = glassTarget(m), shown = intFlag(ev.key, ev.levels.length);
      S.reachTarget = tgt ? ev.levels[tgt - 1].R : 0;
      if (tgt < S.level) { S.level = tgt; S.reach = S.reachTarget; S.animating = false; reachChanged = true; }   // an earlier save was loaded into this map
      if (tgt > S.level || S.reach < S.reachTarget) {
        if (tgt > shown && !calmNow() && hasPlayState()) {
          // the animation: from where the last shown level ended out to the new level, cell by cell
          if (!S.animating) { S.animating = true; S.firstChime = false; }
          const prev = S.reach, next = Math.min(S.reachTarget, S.reach + dt * CFG.glass.speed);
          if (Math.floor(next * 2) !== Math.floor(prev * 2)) reachChanged = true;
          S.reach = next;
          if (S.clock - S.chimeAt > CFG.glass.chimeGap && reachChanged) { S.chimeAt = S.clock; chime(Math.floor(S.reach)); if (!S.firstChime) { S.firstChime = true; capLine(TX.cap); } }
          if (S.reach >= S.reachTarget - 1e-6) { S.reach = S.reachTarget; S.level = tgt; S.animating = false; setIntFlag(ev.key, tgt, ev.levels.length); reachChanged = true; }
        } else if (tgt > shown && !hasPlayState()) {
          /* a modal is open: the clock waits */
        } else {   // Reduce motion, or already played: the place is simply grown
          if (S.reach !== S.reachTarget) reachChanged = true;
          S.reach = S.reachTarget; S.level = tgt; S.animating = false;
          if (tgt > shown) setIntFlag(ev.key, tgt, ev.levels.length);
        }
      }
    } else if (S.reach !== 0 && !GFX.glassSpread) { S.reach = 0; reachChanged = true; }
    // 3. rebuild if the growth, the glass or the switches changed
    const key = amt + '|' + Math.floor(S.reach * 2) + '|' + (GFX.greenStages ? 1 : 0) + (GFX.glassSpread ? 1 : 0) + (GFX.rootVeins ? 1 : 0);
    const e = entryFor(m);
    const veinKeyBefore = e.veinKey;
    if (GFX.rootVeins) refreshRoots(m, e);
    if (key !== S.gKey || veinKeyBefore !== e.veinKey) { S.gKey = key; S.gAmt = amt; S.veinLevel = null; rebuild(m, amt); }
    if (GFX.rootVeins && e.veins) { if (tickVeins(m, dt) && S.anyWall) applyDecals(m); }
    else if (!GFX.rootVeins && S.veinLevel) S.veinLevel = null;
    // the decal table can be replaced by DECALS.sync (a GFX change); keep ours in place
    if (S.merged && S.anyWall && m.decals !== S.merged) applyDecals(m);
  }
  const hasPlayState = () => !(typeof G !== 'undefined' && G && (G.state === 'event' || G.state === 'dialogue' || G.state === 'title'));

  // ==============================================================================================
  //  THE FLOOR PASS: moss, flowers, roots, crystals, veins (world-space, like look10's marks)
  // ==============================================================================================
  const FLOWER_AT = [0, 70, 170], MOSS_MIN = 108;   // MOSS_MIN: the lowest cut-off rebuild() can hand out (166 - 2 x 22 - 12 = 110)
  const mthrAt = (a, mw, mh, x, y) => (x < 0 || y < 0 || x >= mw || y >= mh ? 255 : a[y * mw + x]);   // noise cut-offs per growth level; how many of the flowers show
  const colScratch = { w: 0, k: null };
  // The walls' own glow: decals are lit like the wall they sit on, so in a dark vault a crystal or a vein would vanish. This pass
  // re-reads the decal of each glowing wall cell and adds it back as light. Non-relief maps only (the Root-vault, the quarry,
  // the Malting, the Grove); one cheap ray per column finds the wall cell, nothing else is touched.
  function wallGlow(F) {
    const m = F.map, mw = m.w, mh = m.h, cells = m.cells, em = S.wemit, merged = S.merged;
    const w = F.w, h = F.h, fb = F.fb, dbuf = F.dbuf, mbuf = F.mbuf, cam = F.cam, horizon = F.horizon, fogD = Math.max(4, F.fogDist);
    let drawn = 0;
    for (let x = 0; x < w; x++) {
      const camX = 2 * x / w - 1, rdx = F.dirX + F.planeX * camX, rdy = F.dirY + F.planeY * camX;
      let mx = cam.x | 0, my = cam.y | 0;
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let stx, sty, sdx, sdy, side = 0, hit = -1;
      if (rdx < 0) { stx = -1; sdx = (cam.x - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cam.x) * ddx; }
      if (rdy < 0) { sty = -1; sdy = (cam.y - my) * ddy; } else { sty = 1; sdy = (my + 1 - cam.y) * ddy; }
      for (let it = 0; it < 48; it++) {
        if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) break;
        const c = cells[my * mw + mx];
        if (c) { if (!c.door) hit = my * mw + mx; break; }
      }
      if (hit < 0) continue;
      const e = em[hit]; if (e <= 0.02) continue;
      const data = made.get(merged[hit]); if (!data) continue;
      const dist = side === 0 ? sdx - ddx : sdy - ddy;
      const lineH = (h / dist) | 0; if (lineH <= 0) continue;
      const ds = -lineH / 2 + horizon, step = 64 / lineH;
      let wx = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx; wx -= Math.floor(wx);
      let tx = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 63 - tx;
      const k = e * (1 - clamp(dist / fogD, 0, 1) * 0.8);
      const ys = Math.max(0, ds | 0), ye = Math.min(h - 1, (ds + lineH) | 0);
      for (let y = ys; y <= ye; y++) {
        const o = y * w + x;
        if (mbuf[o] !== 4 || Math.abs(dbuf[o] - dist) > 0.05) continue;
        const d = data[((((y - ds) * step) | 0) & 63) * 64 + tx]; if ((d >>> 24) <= 100) continue;
        const p = fb[o];
        fb[o] = (p & 0xff000000) | (c8(((p >> 16) & 255) + ((d >> 16) & 255) * k * 0.7) << 16) | (c8(((p >> 8) & 255) + ((d >> 8) & 255) * k * 0.7) << 8) | c8((p & 255) + (d & 255) * k * 0.7);
        drawn++;
      }
    }
    return drawn;
  }
  function pass(F) {
    if (!(GFX.greenStages || GFX.glassSpread || GFX.rootVeins)) return;
    if (F.map !== S.map || !F.dbuf || !F.mbuf) return;
    const t0 = profile ? now() : 0;
    let wallDrawn = 0;
    if (!F.relief && S.wemit && S.hasEmit && S.merged) wallDrawn = wallGlow(F);
    const gid = S.gid; if (!gid || !S.hasGround) { stats.wallPixels = wallDrawn; if (profile) { stats.ms = now() - t0; stats.calls++; } return; }
    const w = F.w, h = F.h, fb = F.fb, dbuf = F.dbuf, mbuf = F.mbuf, bias = F.surfBias == null ? 0.45 : F.surfBias;
    const cam = F.cam, camx = cam.x, camy = cam.y, dirX = F.dirX, dirY = F.dirY, planeX = F.planeX, planeY = F.planeY, relief = F.relief;
    const mw = F.map.w, mh = F.map.h, mthr = S.mthr, gflat = S.gflat, glow = S.gglow, fogD = Math.max(4, F.fogDist), gAt = F.gAt;
    if (colScratch.w !== w) { colScratch.w = w; colScratch.k = new Float32Array(w); for (let x = 0; x < w; x++) colScratch.k[x] = 2 * x / w - 1; }
    const ck = colScratch.k;
    let drawn = 0;
    const y0 = relief && !S.allFlat ? 0 : Math.max(0, (F.horizon | 0) - 1);
    for (let y = y0; y < h; y++) {
      let o = y * w;
      for (let x = 0; x < w; x++, o++) {
        const mb = mbuf[o]; if (mb !== 5 && mb !== 3) continue;
        const t = dbuf[o] - bias, cx = ck[x];
        const wx = camx + t * (dirX + planeX * cx), wy = camy + t * (dirY + planeY * cx);
        if (wx < 0 || wy < 0) continue;
        const ix = wx | 0, iy = wy | 0; if (ix >= mw || iy >= mh) continue;
        const ci = iy * mw + ix, id = gid[ci]; if (id === 0) continue;
        if (relief && !gflat[ci]) {   // the ground must really be at this depth (not a step or a wall top in the way)
          const gz = gAt(wx, wy, ix, iy), zp = cam.z - (y - F.horizon) * t / h;
          if (Math.abs(zp - gz) > 0.1 + 1.6 * t / h) continue;
        }
        const gt = GROUND[id];
        if (mb === 3 && gt.kind !== 2) continue;      // only glass shows through shallow water
        if (gt.kind === 4) {                       // moss and flowers from the world-space noise
          // the cut-off is blended between the four nearest cells' values (255 = no moss there), so a patch fades out
          // organically at the edge of its cell instead of ending in a straight line
          const ni = (((wy * 32) & 255) * NZ) + ((wx * 32) & 255), nv = NOISE[ni];
          if (nv < MOSS_MIN) continue;             // below the lowest cut-off of any cell: cannot be moss
          const gx = wx - 0.5, gy = wy - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
          const a00 = mthrAt(mthr, mw, mh, x0, y0), a10 = mthrAt(mthr, mw, mh, x0 + 1, y0), a01 = mthrAt(mthr, mw, mh, x0, y0 + 1), a11 = mthrAt(mthr, mw, mh, x0 + 1, y0 + 1);
          const thr = (a00 + (a10 - a00) * tx) * (1 - ty) + (a01 + (a11 - a01) * tx) * ty;
          if (nv < thr) continue;
          const fade = 1 - clamp(t / fogD, 0, 1) * 0.85;
          const p = fb[o], pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255, lk = clamp((((pr * 77 + pg * 150 + pb * 29) >> 8)) / 105, 0.28, 1.15);
          let tr, tg, tb;
          if (gt.lv > 0 && FL_RANK[ni] < FLOWER_AT[gt.lv] && (nv >= thr + 6)) { const fc = FL_COL[ni]; tr = fc & 255; tg = (fc >> 8) & 255; tb = (fc >> 16) & 255; }
          else { const q = (nv - thr) / 60, hv = clamp(q, 0, 1); tr = 36 + hv * 34 + (q < 0.18 ? 26 : 0); tg = 88 + hv * 62 + (q < 0.18 ? 26 : 0); tb = 36 + hv * 12; }
          const a = 0.94 * fade;
          fb[o] = (p & 0xff000000) | (c8(pb + a * (tb * lk - pb)) << 16) | (c8(pg + a * (tg * lk - pg)) << 8) | c8(pr + a * (tr * lk - pr));
          drawn++; continue;
        }
        let u = ((wx - ix) * GT) | 0, v = ((wy - iy) * GT) | 0;
        if (gt.flip) { const hb = (ci * 2654435761) >>> 28; if (hb & 1) u = GT - 1 - u; if (hb & 2) v = GT - 1 - v; if (hb & 4) { const q = u; u = v; v = q; } }
        const tx = gt.d[v * GT + u]; const ta = tx >>> 24; if (ta === 0) continue;
        const fade = 1 - clamp(t / fogD, 0, 1) * 0.85;
        const a = (ta / 255) * fade; if (a < 0.02) continue;
        const p = fb[o], pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255;
        let tr = tx & 255, tg = (tx >> 8) & 255, tb = (tx >> 16) & 255, nr, ng, nb;
        const lum = (pr * 77 + pg * 150 + pb * 29) >> 8;
        if (gt.kind === 1) {                       // growth: takes the light of the ground it grows on
          const lk = clamp(lum / 105, 0.28, 1.15);
          nr = pr + a * (tr * lk - pr); ng = pg + a * (tg * lk - pg); nb = pb + a * (tb * lk - pb);
        } else if (gt.kind === 2) {                // glass: its own colour, lit a little, with a faint glow
          const lk = 0.8 + 0.2 * clamp(lum / 120, 0, 1);
          nr = pr + a * (tr * lk - pr) + a * 16; ng = pg + a * (tg * lk - pg) + a * 34; nb = pb + a * (tb * lk - pb) + a * 30;
        } else {                                   // vein: glows by itself, brighter near the root
          const g = clamp(glow[ci], 0.1, 1.4), gk = 0.35 + 0.8 * g;
          nr = pr + a * (tr * gk - pr) + a * g * 14; ng = pg + a * (tg * gk - pg) + a * g * 26; nb = pb + a * (tb * gk - pb) + a * g * 8;
        }
        fb[o] = (p & 0xff000000) | (c8(nb) << 16) | (c8(ng) << 8) | c8(nr);
        drawn++;
      }
    }
    stats.pixels = drawn; stats.wallPixels = wallDrawn;
    if (profile) { stats.ms = now() - t0; stats.calls++; }
  }

  // ==============================================================================================
  //  wiring
  // ==============================================================================================
  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) e.setAttribute(k, props[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  const OPT = {
    green: ['The Greening shows', 'Oakhaven grows greener as the story nears the Greening'],
    glass: ['Light-glass spreads', 'crystals grow over walls and floor at the story moments'],
    veins: ['Root veins', 'glowing veins near the Anchor-roots'],
  };
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('g14-green')) return;
    const row = (pair) => { const s = el('span', { class: 'gfx-label' }, pair[0]); s.appendChild(document.createTextNode(' ')); s.appendChild(el('small', { class: 'muted' }, pair[1])); return s; };
    const mk = (id, flag, aria) => {
      const b = el('button', { class: 'dfbtn small', id, type: 'button' }, '');
      b.setAttribute('aria-label', aria);
      const sync = () => { b.textContent = GFX[flag] ? 'On' : 'Off'; b.setAttribute('aria-pressed', GFX[flag] ? 'true' : 'false'); b.classList.toggle('sel', !!GFX[flag]); };
      b.onclick = () => { setFlag(flag, !GFX[flag]); sync(); };
      sync(); return b;
    };
    grid.appendChild(row(OPT.green)); grid.appendChild(mk('g14-green', 'greenStages', OPT.green[0]));
    grid.appendChild(row(OPT.glass)); grid.appendChild(mk('g14-glass', 'glassSpread', OPT.glass[0]));
    grid.appendChild(row(OPT.veins)); grid.appendChild(mk('g14-veins', 'rootVeins', OPT.veins[0]));
  }
  function wire() {
    if (typeof Engine !== 'undefined' && Engine.addPostHook) Engine.addPostHook(pass, 5);   // after look10's ground pass (4), before soft fog (10), mist, water, bloom (30)
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try { if (G.state === 'play') tick(dt); } catch (e) { stats.errors++; if (!wire.warned) { wire.warned = true; console.warn('greening14 tick failed', e); } }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () {
        const r = _lm.apply(this, arguments);
        try { if (G.map) tick(0); } catch (e) { stats.errors++; }
        return r;
      };
    }
    if (typeof GFX !== 'undefined') GFX.onChange(() => {
      try {
        if (hasG() && G.map) { S.gKey = ''; if (!(GFX.greenStages || GFX.glassSpread || GFX.rootVeins)) { restoreDecals(G.map); S.gid = null; S.hasGround = false; S.hasEmit = false; } else if (G.map._g14) restoreDecals(G.map); }
      } catch (e) { /* ignore */ }
      if (!mineChanging) for (const k in stored) if (stored[k] !== null && GFX[k] !== stored[k]) { stored[k] = null; saveSettings(); }   // a preset took over: stop overriding it
    });
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('greening14 rows failed', e); }
        return r;
      };
    }
  }
  loadSettings();
  wire();

  return {
    CFG, GLASS_EVENTS, RULES, S, stats, OPT, TX, G14_FLAGS, GROUND,
    stage, progress, amountNow, tick, pass, rebuild, rootsHere, analyseGreening, analyseGlass, analyseVeins, entryFor, glassTarget, setFlag, appendRows,
    wallTex, textureData: (n) => made.get(n) || null, textureBytes: () => texBytes, groundBytes: () => groundBytes,
    get profile() { return profile; }, set profile(v) { profile = !!v; },
    reset() { S.map = null; S.clock = 0; ratchet = 0; },
  };
})();
if (typeof window !== 'undefined') window.GREENING14 = GREENING14;
