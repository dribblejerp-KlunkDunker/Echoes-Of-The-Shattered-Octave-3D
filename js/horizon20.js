// ============================================================
//  horizon20 — Phase 20 "The painted world", team HORIZON: the horizon and the landmarks.
//
//  1. THE WATCH DOWNS [PROPOSED name] — walkable country beyond a map's wall. A gate in the thorn on the clearing's
//     west side (outside the Hedge, so nothing is bypassed) leads up onto chalk downland on the Phase 2 height system:
//     a long ridge with a beacon cairn on its summit, a chalk scar whose cliff flanks cannot be climbed, a knoll that
//     looks across the Hedge at Oakhaven, a dew-pond, a sheepfold and thorn. Walking and looking only: no enemies, no
//     items, no flags, danger 0. It joins nothing but the clearing, so it cannot lead around a story gate. Oakhaven's
//     own walls stay walls: beyond them is the Hedge, which is a story boundary, so the country there is shown (the
//     panorama, the far ground and the town seen from outside) but never made walkable. Registered from here through a
//     buildAllMaps wrapper (maps.js and data.js are untouched); the clearing gains one door cell and no entities, so
//     saved entity indexes line up. HORIZON20.reach() is the movement-graph BFS the test uses (no softlock, no fall
//     that hurts much, every reachable cell can get back to the gate).
//  2. COUNTRY BEYOND THE WALLS (switch "Country beyond walls", GFX.farCountry). On the clearing and the Downs,
//     Oakhaven is drawn where it really stands, past the Hedge: its roofs, the Greenhall dome, the mooring mast and the
//     Chapel of the Carillon's bell-tower, ray-cast through Oakhaven's own cells in the same world frame (the North Gate
//     ties the two maps together), shaded and fogged like near walls. On those maps the ground beyond the map's edge,
//     which the relief renderer leaves as flat haze when you stand high, is laid as distant ground. A post hook (order
//     -9.6) that only writes pixels the renderer left as sky or haze, with its own depth test between them; the frame's
//     depth and material buffers stay as they were, so later passes treat these pixels as the far air they stand in.
//  3. THE CHAPEL BELL (switch "Chapel belfry", GFX.belfryArt). The Chapel's bell-tower gets its open belfry stage: two
//     round-headed openings a face, and through them the oak bell-frame with its hooks EMPTY. The story keeps it empty:
//     the four bells were "taken for bore-teeth, 417 SR" (the frame's chalk, js/game.js), Tobin's register says the great
//     bell came down and did not ring, the Book One manuscript says the Synod requisitioned every bell in the Reach and
//     that at the Greening "the whole town rang like a struck carillon, and there was not one bell in it", and no flag
//     anywhere in the game puts a bell back or rings one. So no bell is ever drawn. The one change the story makes to the
//     frame is drawn: once the Church has come (G.flags.rite_ready) "the Flambeau's people have hung a glass-fire lamp
//     where the tenor bell was" — a small white-gold lamp hangs from the tenor's hook in the tower and in the Chapel, and
//     glows at night. Inside the Chapel the frame (a sluice-lever stand-in until now) is a drawn oak frame with four
//     empty hooks and the chalk on its headstock; same entity, place, radius and use.
//
//  Art: hand-built pixel art drawn in code (fixed palettes, hard edges), cached once. Every invented detail is marked
//  [PROPOSED] in the review text. Switches are in GFX.FX, so the Original preset (GFX.plain) has neither; off = the
//  frames before this module. Nothing here touches saves beyond the map that exists, the RNG, or the story.
// ============================================================
'use strict';

for (const k of ['farCountry', 'belfryArt']) {
  if (GFX[k] === undefined) GFX[k] = true;
  if (!GFX.FX.includes(k)) GFX.FX.push(k);
}

const HORIZON20 = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const on = (k) => typeof GFX === 'undefined' || GFX[k] !== false;
  const hasG = () => typeof G !== 'undefined' && G && G.maps;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('horizon20 ' + k + ' failed', e); } };
  const stats = { farPx: 0, groundPx: 0, belfryPx: 0, farMs: 0, belfryMs: 0 };

  // ---------------------------------------------------------------- art helpers
  const px = (r, g, b, a) => (((a == null ? 255 : a) << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  const hex = (s, a) => px(parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), a);
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y) => (BAY[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  const ramp = (pal, t, x, y) => { const v = clamp(t, 0, 0.999) * (pal.length - 1), i = v | 0; return pal[(v - i) > dith(x, y) ? Math.min(pal.length - 1, i + 1) : i]; };
  function hash(ix, iy, seed) { let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  // a sprite drawn into a pixel buffer by a function of (set, w, h); transparent where nothing was set
  function sprite(w, h, fn) { const d = new Uint32Array(w * h); const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = c; }; fn(set, w, h, d); return d; }
  const rect = (set, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, c); };
  const line = (set, x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let k = 0; k <= n; k++) set(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); };
  // string stamps: '.' empty, other characters from a palette object
  function stampInto(set, rows, pal, x0, y0) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c != null) set(x0 + i, y0 + j, c); } }); }

  // ---------------------------------------------------------------- the belfry stage (tower faces, 2.2 .. 3.2)
  // One face of the tower is two cells wide: a 128 x 64 picture, 64 texels a unit like every wall. Two round-headed
  // openings; through each, the dark of the belfry, the oak headstock of the bell-frame and an empty iron hook. With the
  // Rite's lamp, the first opening's hook carries the glass-fire lamp instead.
  const BW = 128, BH = 64, BELFRY_Z0 = 2.2, BELFRY_Z1 = 3.2;
  const TOWER = { x0: 48, y0: 5, x1: 50, y1: 7, top: 3.2 };   // the four tower cells in js/maps.js shapeOakhaven
  const STONE = ['#7c766c', '#968f82', '#ada597', '#c3bba9', '#d6cfbd'].map((s) => hex(s));
  const OAK = ['#2a1a10', '#40291a', '#583a24', '#6e4a2e'].map((s) => hex(s));
  const IRON = [hex('#18161a'), hex('#34323a'), hex('#5a5862')];
  const DARK = [hex('#0e0b0e'), hex('#17121a'), hex('#211a24')];
  const LAMP = [hex('#fff6d8'), hex('#ffe08a'), hex('#e8b04a'), hex('#a2702a')];
  function paintBelfry(lamp) {
    const d = new Uint32Array(BW * BH), glow = new Uint8Array(BW * BH);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      // dressed stone: courses every 16 rows, joints staggered, lit a little toward the top of each block
      const course = y >> 4, jx = (x + (course & 1) * 16) & 31, inB = (y & 15);
      let c = ramp(STONE, 0.55 + (8 - inB) * 0.02 + (hash(x >> 4, course, 7) - 0.5) * 0.18, x, y);
      if (inB === 15 || jx === 31) c = STONE[0];
      d[y * BW + x] = c;
    }
    // cornice (rows 0..6): a projecting moulding, lit on top, deep shadow line underneath
    for (let x = 0; x < BW; x++) { d[x] = STONE[4]; d[BW + x] = STONE[3]; d[2 * BW + x] = STONE[3]; d[3 * BW + x] = STONE[2]; d[4 * BW + x] = ((x >> 2) & 1) ? STONE[2] : STONE[1]; d[5 * BW + x] = STONE[0]; d[6 * BW + x] = DARK[2]; }
    for (const cx of [32, 96]) {
      const r = 15, cy = 28, xl = cx - r, xr = cx + r, sill = 54;
      // voussoirs round the head: alternating blocks, a key-stone at the crown
      for (let y = 8; y < cy + 1; y++) for (let x = xl - 5; x <= xr + 5; x++) {
        const dd = Math.hypot(x - cx + 0.5, y - cy + 0.5);
        if (dd > r && dd <= r + 4.5) { const a = Math.atan2(y - cy, x - cx), blk = Math.floor((a + Math.PI) / (Math.PI / 9)); d[y * BW + x] = (blk & 1) ? STONE[3] : STONE[2]; if (dd > r + 3.7) d[y * BW + x] = STONE[0]; }
      }
      for (let y = 8; y < 13; y++) for (let x = cx - 2; x <= cx + 2; x++) d[y * BW + x] = y === 8 ? STONE[4] : STONE[3];
      // jambs: lit left reveal, shaded right reveal
      for (let y = cy; y < sill; y++) { d[y * BW + xl - 1] = STONE[4]; d[y * BW + xl - 2] = STONE[3]; d[y * BW + xr + 1] = STONE[1]; d[y * BW + xr + 2] = STONE[0]; }
      // the opening: dark, a little lighter toward the bottom where the floor catches light
      for (let y = 9; y < sill; y++) for (let x = xl; x <= xr; x++) {
        const inside = y >= cy ? true : Math.hypot(x - cx + 0.5, y - cy + 0.5) <= r;
        if (inside) d[y * BW + x] = ramp(DARK, (y - 9) / 60 + (x < cx - 8 ? 0.15 : 0), x, y);
      }
      // the bell-frame seen through it: oak headstock across the opening, a post, a brace, and the hook
      for (let x = xl; x <= xr; x++) { d[26 * BW + x] = OAK[3]; d[27 * BW + x] = OAK[2]; d[28 * BW + x] = OAK[2]; d[29 * BW + x] = OAK[1]; d[30 * BW + x] = OAK[0]; }
      for (let y = 31; y < sill; y++) { d[y * BW + xl + 3] = OAK[2]; d[y * BW + xl + 4] = OAK[1]; d[y * BW + xr - 3] = OAK[1]; d[y * BW + xr - 4] = OAK[0]; }
      line((x, y, c) => { if (x > xl && x < xr) d[y * BW + x] = c; }, xl + 5, 46, xl + 12, 31, OAK[1]);
      line((x, y, c) => { if (x > xl && x < xr) d[y * BW + x] = c; }, xr - 5, 46, xr - 12, 31, OAK[0]);
      // the hook: a short shank and an open J, empty
      const hook = [[0, 31], [0, 32], [0, 33], [0, 34], [-1, 35], [-1, 36], [0, 37], [1, 37], [2, 36], [2, 35]];
      const withLamp = lamp && cx === 32;
      for (const [hx, hy] of hook) { d[hy * BW + cx + hx] = IRON[1]; if (hx === 0) d[hy * BW + cx + hx + 1] = IRON[0]; }
      if (withLamp) {
        // the glass-fire lamp hung where the tenor bell was: a bronze cage, white-gold light inside
        const L = ['..3333..', '.3....3.', '3.1001.3', '3.0000.3', '3.0000.3', '3.1001.3', '3.2112.3', '.3....3.', '..3333..', '...33...'];
        L.forEach((row, j) => { for (let i = 0; i < 8; i++) { const ch = row[i]; if (ch === '.') continue; const o = (36 + j) * BW + cx - 3 + i; d[o] = LAMP[+ch]; glow[o] = ch === '0' ? 1 : 0; } });
      }
      // the sill: a pale ledge
      for (let x = xl - 3; x <= xr + 3; x++) { d[sill * BW + x] = STONE[4]; d[(sill + 1) * BW + x] = STONE[3]; d[(sill + 2) * BW + x] = STONE[0]; }
    }
    return { d, glow };
  }
  const BELFRY = { plain: null, lamp: null };

  // ---------------------------------------------------------------- the Chapel's bell-frame (interior sprite)
  // 64 x 64: two oak posts on a stone plinth, a headstock with the chalk on it, braces, four iron hooks, nothing on
  // them. The lamp variant hangs the glass-fire lamp from the second hook. Drawn to stand about one unit tall with the
  // old entity's own scale (1.1): hs below.
  function paintFrame(lamp) {
    const W = 64, H = 72, glowMask = new Uint8Array(W * H);
    const OK = ['#22150c', '#33200f', '#472d17', '#5c3c20', '#724c2a', '#8c6238', '#a67a4a'].map((q) => hex(q));
    const ST = STONE, IR = [hex('#141216'), hex('#2a282e'), hex('#46444c'), hex('#6c6a72')];
    const data = sprite(W, H, (set) => {
      // a squared oak timber, lit from the upper left: grain runs along it, the far edge in shadow, a dark outline
      const timber = (x0, y0, w, h, along) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const across = along === 'x' ? y / (h - 1) : x / (w - 1), alongP = along === 'x' ? x : y;
          let t = 0.78 - across * 0.5;
          const g = hash(along === 'x' ? (alongP >> 3) : x, along === 'x' ? y : (alongP >> 3), 41);
          if (g > 0.78 && ((alongP + (along === 'x' ? y : x) * 5) % 9) < 6) t -= 0.18;   // a grain streak
          let c = ramp(OK, t, x0 + x, y0 + y);
          if ((along === 'x' && (y === 0 || y === h - 1)) || (along === 'y' && (x === 0 || x === w - 1))) c = OK[0];
          else if ((along === 'x' && y === 1) || (along === 'y' && x === 1)) c = OK[6];
          set(x0 + x, y0 + y, c);
        }
      };
      // the stone plinth: a chamfered block, lit along its top
      for (let y = 63; y < 72; y++) for (let x = 2; x < 62; x++) {
        let c = ramp(ST, 0.65 - (y - 63) * 0.05 + (hash(x >> 2, y >> 2, 3) - 0.5) * 0.12, x, y);
        if (y === 63) c = ST[4]; if (y === 64) c = ST[3]; if (y === 71 || x === 2 || x === 61) c = ST[0];
        if ((x === 21 || x === 43) && y > 64) c = ST[0];
        set(x, y, c);
      }
      // sill beam, posts, headstock, a lower rail, two braces
      timber(4, 58, 56, 5, 'x');
      timber(7, 12, 8, 46, 'y'); timber(49, 12, 8, 46, 'y');
      timber(2, 6, 60, 9, 'x');
      timber(15, 40, 34, 5, 'x');
      for (let k = 0; k < 11; k++) { set(15 + k, 25 - k, OK[3]); set(15 + k, 26 - k, OK[4]); set(16 + k, 26 - k, OK[1]); set(48 - k, 25 - k, OK[2]); set(48 - k, 26 - k, OK[3]); set(47 - k, 26 - k, OK[0]); }
      // oak pegs at the joints
      for (const [x, y] of [[10, 9], [53, 9], [10, 42], [53, 42], [10, 60], [53, 60]]) { set(x, y, OK[1]); set(x + 1, y, OK[6]); set(x, y + 1, OK[0]); set(x + 1, y + 1, OK[2]); }
      // the chalk on the headstock: two lines in a careful hand, a smaller newer line under the first
      const chalk = hex('#e6e0cc'), chalk2 = hex('#b8b2a0');
      for (let x = 9; x < 55; x++) { if (((x * 7) % 5) !== 1 && x % 9 !== 4) set(x, 8 + ((x * 3) % 4 === 0 ? 1 : 0), chalk); }
      for (let x = 14; x < 44; x++) if (((x * 5) % 4) !== 2 && x % 7 !== 3) set(x, 11, chalk2);
      // four hooks: a strap over the headstock, a shank and an open J, all empty
      for (const hx of [19, 27, 36, 44]) {
        set(hx - 1, 15, IR[1]); set(hx, 15, IR[2]); set(hx + 1, 15, IR[1]);
        for (let y = 16; y < 23; y++) { set(hx, y, IR[2]); set(hx + 1, y, IR[0]); }
        set(hx - 1, 23, IR[1]); set(hx - 2, 24, IR[1]); set(hx - 2, 25, IR[1]); set(hx - 1, 26, IR[2]); set(hx, 26, IR[2]); set(hx + 1, 26, IR[1]); set(hx + 2, 25, IR[1]); set(hx + 2, 24, IR[3]);
      }
      if (lamp) {
        // the glass-fire lamp the Church hung where the tenor bell was, on the second hook
        const L = ['...ii...', '..3333..', '.3.22.3.', '3.1001.3', '3.0000.3', '3.0000.3', '3.0000.3', '3.1001.3', '3.2112.3', '.3....3.', '..3333..', '...33...'];
        const LP = { i: IR[2], '0': LAMP[0], '1': LAMP[1], '2': LAMP[2], '3': LAMP[3] };
        L.forEach((row, j) => { for (let i = 0; i < 8; i++) { const c = LP[row[i]]; if (c == null) continue; set(24 + i, 25 + j, c); if (row[i] === '0' || row[i] === '1') glowMask[(25 + j) * W + 24 + i] = 1; } });
      }
    });
    return { w: W, h: H, data, hs: 0.9, cx: 0.5, dy: 0, glow: glowMask };
  }

  // ---------------------------------------------------------------- the Downs' own art
  // shaded blobs: each pixel takes the nearest-on-top blob covering it, lit from the upper left, outlined in the
  // darkest tone where it meets the air or a blob behind it (the way a pixel artist builds a bush or a heap of stones)
  function blobs(set, list, pal, outline) {
    const pts = new Map();
    list.forEach((b, k) => {
      for (let y = Math.floor(b[1] - b[3]) - 1; y <= b[1] + b[3] + 1; y++) for (let x = Math.floor(b[0] - b[2]) - 1; x <= b[0] + b[2] + 1; x++) {
        const nx = (x + 0.5 - b[0]) / b[2], ny = (y + 0.5 - b[1]) / b[3], r = nx * nx + ny * ny; if (r > 1) continue;
        pts.set(y * 1000 + x, [k, nx, ny, r]);
      }
    });
    for (const [key, [k, nx, ny, r]] of pts) {
      const x = key % 1000, y = (key / 1000) | 0;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const q = pts.get((y + dy) * 1000 + x + dx); return !q || (q[0] < k && Math.hypot(dx, dy) && r > 0.55); });
      const light = 0.62 - nx * 0.3 - ny * 0.38 - r * 0.12 + (list[k][4] || 0);
      set(x, y, edge && outline != null ? outline : ramp(pal, light, x, y));
    }
  }
  // chalk faces: greyed cream, faint bedding, small flints
  function paintChalk() {
    const d = new Uint32Array(64 * 64);
    const C = ['#8a8574', '#9e9884', '#b2ac96', '#c4bea8', '#d2ccb6'].map((q) => hex(q));
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const t = 0.56 + (hash(x >> 3, y >> 2, 91) - 0.5) * 0.24 + (((y + (x >> 4)) % 9) === 0 ? -0.22 : 0) + (((y + 4) % 9) === 0 ? 0.1 : 0);
      d[y * 64 + x] = ramp(C, t, x, y);
    }
    const F = [hex('#2c3038'), hex('#4a505c'), hex('#6c7480')];
    for (const [fx, fy, rr] of [[10, 12, 2.1], [41, 7, 1.7], [27, 30, 2.3], [53, 41, 1.8], [14, 50, 1.6], [36, 56, 2], [58, 22, 1.6]]) {
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const r = Math.hypot(x, y * 1.3); if (r > rr) continue; d[(((fy + y) & 63) * 64) + ((fx + x) & 63)] = r > rr - 0.7 ? F[0] : (x + y < 0 ? F[2] : F[1]); }
    }
    return d;
  }
  // a trodden track: the turf worn thin, pale chalk showing through in patches, a few flints
  function paintTrack() {
    const base = Engine.textures.t_grass, d = new Uint32Array(64 * 64);
    const C = ['#6e6a52', '#847e64', '#9a9278', '#aca48a'].map((q) => hex(q));
    const vn = (x, y, per, seed) => { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, m = (v) => ((v % per) + per) % per; const a = hash(m(x0), m(y0), seed), b2 = hash(m(x0 + 1), m(y0), seed), c = hash(m(x0), m(y0 + 1), seed), e = hash(m(x0 + 1), m(y0 + 1), seed); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return a + (b2 - a) * sx + (c - a) * sy + (a - b2 - c + e) * sx * sy; };
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const g = base ? base[y * 64 + x] : hex('#4a5a30');
      const n = vn(x / 10, y / 10, 6.4, 7) * 0.7 + vn(x / 4, y / 4, 16, 8) * 0.3;
      if (n > 0.66 + dith(x, y) * 0.05) d[y * 64 + x] = ramp(C, (n - 0.66) * 3 + 0.15, x, y);
      else { const k = n > 0.5 ? 0.78 : 0.9; d[y * 64 + x] = px((g & 255) * k + 6, ((g >> 8) & 255) * k + 2, ((g >> 16) & 255) * k); }
    }
    for (const [x, y] of [[9, 13], [33, 40], [50, 22], [21, 55], [44, 5]]) { d[y * 64 + x] = hex('#3a3e46'); d[y * 64 + x + 1] = hex('#5c6270'); }
    return d;
  }
  // a field gate hung in the thorn: the hedge texture behind five oak bars and a diagonal brace
  function paintGate() {
    const base = Engine.textures.t_hedge, d = new Uint32Array(64 * 64);
    for (let i = 0; i < d.length; i++) d[i] = base ? base[i] : hex('#2a3a24');
    const W1 = hex('#7a5a36'), W2 = hex('#5a3e22'), W0 = hex('#2e2014'), Wl = hex('#9c7a4c');
    for (const y of [14, 24, 34, 44, 54]) for (let x = 4; x < 60; x++) { d[y * 64 + x] = Wl; d[(y + 1) * 64 + x] = W1; d[(y + 2) * 64 + x] = W2; d[(y + 3) * 64 + x] = W0; }
    for (const x0 of [3, 56]) for (let y = 10; y < 62; y++) for (let x = x0; x < x0 + 5; x++) d[y * 64 + x] = x === x0 ? Wl : x === x0 + 4 ? W0 : W1;
    for (let k = 0; k < 46; k++) { const x = 8 + k, y = 57 - k; if (y < 14) break; d[y * 64 + x] = W1; d[y * 64 + x + 1] = W2; d[(y + 1) * 64 + x + 1] = W0; }
    return d;
  }
  // a hawthorn on the down: a twisted trunk leaning east, a dense lumpy crown pushed the same way by the wind
  function paintThorn() {
    const W = 48, H = 44;
    const GR = ['#1e2a1a', '#2c3c22', '#3c4e2a', '#506634', '#687e40', '#82944c'].map((q) => hex(q));
    const BK = [hex('#20160e'), hex('#3a2a1a'), hex('#56402a'), hex('#6e5436')];
    return { w: W, h: H, hs: 1, cx: 0.4, dy: 0, data: sprite(W, H, (set) => {
      // trunk and two limbs
      const trunk = [[17, 43], [17, 40], [18, 37], [18, 34], [19, 31], [21, 28], [22, 25], [24, 22]];
      trunk.forEach(([x, y], i) => { for (let k = -2; k <= 1; k++) for (let j = 0; j < 3; j++) set(x + k, y - j, k === -2 ? BK[0] : k === -1 ? BK[3] : k === 0 ? BK[2] : BK[1]); });
      for (let k = 0; k < 9; k++) { set(21 - k, 29 - (k >> 1), BK[2]); set(21 - k, 30 - (k >> 1), BK[0]); set(23 + k, 26 - (k >> 1), BK[2]); set(23 + k, 27 - (k >> 1), BK[0]); }
      set(15, 43, BK[0]); set(14, 43, BK[1]); set(20, 43, BK[1]);
      // the crown: blobs from the back (dark, high) to the front (lit), lumped to the east
      blobs(set, [[12, 20, 7, 5, -0.15], [34, 14, 9, 6, -0.1], [24, 11, 9, 7, 0], [40, 19, 6, 5, -0.05], [16, 15, 7, 6, 0.05], [28, 19, 8, 5, 0.05], [21, 22, 6, 4, 0.08], [36, 9, 6, 4, 0.12], [26, 6, 6, 4, 0.15]], GR, GR[0]);
      // haws: a few dark red berries on the lit side
      for (const [x, y] of [[20, 10], [27, 8], [31, 13], [17, 16], [37, 12], [24, 17], [33, 18]]) { set(x, y, hex('#8a2a22')); set(x + 1, y, hex('#5a1a16')); }
    }) };
  }
  // the beacon cairn on the summit [PROPOSED]: a heap of chalk and flint round an iron fire-basket on a post, long cold
  function paintCairn() {
    const W = 40, H = 40;
    const SG = ['#3a3a3c', '#5e5b54', '#7e7a6e', '#a29c8c', '#c2bba8', '#d8d2be'].map((q) => hex(q));
    return { w: W, h: H, hs: 1, cx: 0.5, dy: 0, data: sprite(W, H, (set) => {
      // the post and basket first; the heap is built up round its foot
      for (let y = 3; y < 30; y++) { set(19, y, IRON[2]); set(20, y, IRON[1]); set(21, y, IRON[0]); }
      for (let x = 13; x <= 27; x++) { set(x, 3, IRON[2]); set(x, 10, IRON[1]); }
      for (const x of [13, 16, 20, 24, 27]) for (let y = 3; y <= 10; y++) set(x, y, IRON[1]);
      for (let x = 14; x < 27; x++) { set(x, 9, hex('#3e3632')); if (x % 3) set(x, 8, hex('#2c2624')); }
      blobs(set, [[8, 33, 6, 5], [31, 33, 7, 5], [20, 34, 9, 5], [13, 28, 6, 4.5], [27, 28, 6, 4.5], [20, 26, 6, 4], [15, 22, 4, 3.4, 0.1], [25, 22, 4, 3.4], [20, 19, 4, 3, 0.1], [5, 37, 4, 3], [35, 37, 4, 3], [20, 37.5, 13, 2.6]], SG, SG[0]);
      // a few flints in the heap
      for (const [x, y] of [[10, 31], [24, 30], [17, 25], [29, 34], [14, 35], [22, 21]]) { set(x, y, hex('#2c3038')); set(x + 1, y, hex('#5a6270')); }
    }) };
  }
  // a boundary stone, leaning, lichen on its lit face [PROPOSED]
  function paintStone() {
    const rows = ['....oooo....', '...o4443o...', '..o44433o...', '..o4443332o.', '..o44433322o', '..o4g43322o.', '..o4443322o.', '..o4g433322o', '..o44433322o', '..o4443332o.', '..o44433322o', '.o444433322o', '.o4443333222o', 'oooooooooooo'];
    const P = { o: hex('#24242a'), '4': hex('#b4ae9c'), '3': hex('#928c7c'), '2': hex('#6c675c'), g: hex('#7c8a4a') };
    return { w: 13, h: rows.length, hs: 1, cx: 0.5, dy: 0, data: sprite(13, rows.length, (set) => stampInto(set, rows, P, 0, 0)) };
  }

  function installArt() {
    BELFRY.plain = paintBelfry(false); BELFRY.lamp = paintBelfry(true);
    Engine.addTexture('t_p20_chalk', paintChalk());
    Engine.addTexture('t_p20_track', paintTrack());
    Engine.addTexture('t_p20_gate', paintGate());
    const fr = paintFrame(false), fl = paintFrame(true);
    Engine.addSprite('p20_bellframe', fr); Engine.addSprite('p20_bellframe_lamp', fl);
    if (Engine.setEmissive) Engine.setEmissive('p20_bellframe_lamp', fl.glow);
    Engine.addSprite('p20_thorn', paintThorn());
    Engine.addSprite('p20_cairn', paintCairn());
    Engine.addSprite('p20_stone', paintStone());
  }


  // ---------------------------------------------------------------- the world frame
  // Where each map sits in Oakhaven's coordinates (oak = map + OFF). The North Gate joins Oakhaven (23, 0) to the
  // clearing's south door (20, 35), so the clearing is Oakhaven + (-3, +35) read backwards; the Downs adjoin the
  // clearing's west wall (Downs column 43 is the clearing's column 0, Downs row 2 its row 0).
  const DOWNS = 'p20_downs', DW = 44, DH = 38;
  const D2C = [-43, -2];                                  // clearing = downs + D2C
  const OFF = { clearing: [3, -35], [DOWNS]: [3 - 43, -35 - 2] };

  // ---------------------------------------------------------------- 1. the Watch Downs
  const TX = {
    name: 'The Watch Downs',
    gateIn: 'A hurdle in the thorn, and a sheep-track up onto the Watch Downs',
    gateOut: 'The hurdle in the thorn, back down to the clearing',
    sign: 'A finger-post with one arm left: THE WATCH DOWNS. Under it someone has cut, small, SHEEP-WALK. There are no sheep. The turf is short anyway, as if it remembers them.',
    cairn: 'The beacon on the Long Down: chalk and flint piled round an iron fire-basket. The ash in it is years old. North, the Grey Teeth. South-east, over the Hedge, the roofs of Oakhaven and the Chapel\'s bell-tower, its belfry open to the weather.',
    knoll: 'Hedge Knoll. From here the Hedge is a dark line along the bottom of the world, and Oakhaven is the roofs behind it: the Greenhall dome, the mooring mast, the Chapel\'s tower. Nothing hangs in the tower. You can see daylight through the frame.',
    scar: 'The Scar: a chalk face, sheer on every side, flint standing out of it like knuckles. There is no way up, and nothing up there to want.',
    fold: 'A sheepfold of dry stone, the gate gone. Thistles inside. Somebody kept it mended for a long time, and then stopped.',
    pond: 'A dew-pond, lined with clay, older than the Hedge. Rain still fills it. Nothing drinks from it that you can see.',
    stone: 'A boundary stone, leaning. Whatever parish it marked the edge of, the lettering is gone under the lichen.',
    wall: 'A dry-stone wall across the slope, with a gap for a stile.',
  };
  function downsGateRow(cl) {
    // a row on the clearing's west wall with open ground and no solid prop in front of it (preferring the middle)
    const solidNear = (x, y) => cl.entities.some((e) => e && e.solid !== false && e.kind !== 'item' && Math.hypot(e.x - x, e.y - y) < (e.radius || 0.35) + 0.9);
    for (const y of [22, 23, 21, 24, 20, 25, 19, 26, 18, 27]) {
      if (!cl.get(0, y) || cl.get(0, y).door) continue;
      if (cl.get(1, y) || cl.get(2, y) || cl.get(1, y - 1) || cl.get(1, y + 1)) continue;
      if (Math.abs(cl.groundAt(1.5, y + 0.5)) > 0.05 || Math.abs(cl.groundAt(2.5, y + 0.5)) > 0.05) continue;
      if (solidNear(1.5, y + 0.5) || solidNear(2.6, y + 0.5)) continue;
      return y;
    }
    return 22;
  }
  function buildDowns(yc) {
    const yd = yc - D2C[1];                                 // the same row, in the Downs' frame
    const m = new GameMap(DOWNS, TX.name, DW, DH, {
      outdoor: true, floor: 't_grass', floorTextures: ['t_grass', 't_moss', 't_water', 't_p20_chalk', 't_p20_track'], fogDist: 22, fogColor: [62, 66, 60],
      music: 'wild', danger: 0, spawn: { x: DW - 2.4, y: yd + 0.5, dir: Math.PI },
    });
    m.border('t_hedge');
    m.set(DW - 1, yd, DOOR({ tex: 't_p20_gate', portal: { map: 'clearing', x: 1.6, y: yc + 0.5, dir: 0 }, label: TX.gateOut }));
    // the land: the Long Down (a ridge from the north to the south-west) with the Beacon Knap on it, a shoulder in the
    // north, Hedge Knoll in the south-east, and the Scar, a flat-topped chalk crag with flanks too steep to climb
    m.hill(17, 13, 10, 9, 2.4);
    m.hill(10, 24, 7.5, 6.5, 1.6);
    m.hill(5, 7, 5, 4.5, 1.0);
    m.hill(37, 31, 6, 5, 1.4);
    m.hill(32, 9, 4.6, 3.8, 2.3, { steep: 0.3 });
    const CHALK = 3, MOSS = 1, WATER = 2, TRACK = 4;
    // bare chalk where the Scar is too steep to hold turf, and its flanks are chalk faces
    for (let y = 3; y <= 15; y++) for (let x = 25; x <= 39; x++) if (!m.get(x, y) && m.gradeAt(x + 0.5, y + 0.5) > 0.8) m.setFloor(x, y, CHALK);
    m.setSide(25, 3, 39, 15, 't_p20_chalk');
    // the chalk track: in at the gate, west across the bottom, then up the Long Down to the beacon, with a spur to the knoll
    const track = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2; for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; m.setFloor(Math.floor(x), Math.floor(y), TRACK); } } };
    track([[DW - 2, yd], [34, yd], [28, yd - 2], [24, 19], [20, 15], [17.5, 13.5]]);
    track([[34, yd], [36, 28], [37, 31]]);
    // the dew-pond in the south-west hollow, with moss round it
    for (let y = 32; y <= 35; y++) for (let x = 3; x <= 8; x++) m.setFloor(x, y, MOSS);
    for (let y = 33; y <= 34; y++) for (let x = 4; x <= 7; x++) m.setFloor(x, y, WATER);
    // low dry-stone: the sheepfold (gate gap to the east) and a field wall across the slope with a stile gap
    const low = (x, y) => m.block(x, y, 't_stone', m.groundAt(x + 0.5, y + 0.5) + 0.42, { capTex: 't_stone' });
    for (let x = 22; x <= 26; x++) { low(x, 32); low(x, 36); }
    for (let y = 33; y <= 35; y++) { low(22, y); if (y !== 34) low(26, y); }
    for (let x = 1; x <= 20; x++) if (x !== 9 && x !== 16) low(x, 31);
    // what you look at: a finger-post, the beacon, the knoll's post, the Scar, the fold, the pond, three boundary stones
    m.deco('sign', DW - 3.5, yd - 0.7, { radius: 0.2, scale: 0.85, label: TX.sign });
    m.deco('p20_cairn', 17.5, 12.5, { radius: 0.55, scale: 0.8, label: TX.cairn });
    m.deco('sign', 37.5, 30.6, { radius: 0.2, scale: 0.8, label: TX.knoll });
    m.deco('sign', 32.5, 15.2, { radius: 0.2, scale: 0.8, label: TX.scar });
    m.deco('sign', 27.6, 33.2, { radius: 0.2, scale: 0.75, label: TX.fold });
    m.deco('sign', 9.4, 33.5, { radius: 0.2, scale: 0.75, label: TX.pond });
    for (const [x, y] of [[14.5, 18.5], [21.5, 8.5], [8.5, 27.5]]) m.deco('p20_stone', x, y, { radius: 0.22, scale: 0.55, label: TX.stone });
    // thorn on the slopes, leaning away from the west wind; a few oaks where the woods come up to the north wall
    const THORN = [[6, 11], [10, 5.5], [26.5, 15], [33.5, 19], [40.5, 15], [38.5, 5.5], [4.5, 18.5], [23.5, 29.5], [30.5, 34.5], [14.5, 34.2], [19.5, 26.5], [34.5, 25.5], [41, 27.5], [3.5, 26.5], [21.5, 3.5], [12.5, 15.5],
      [7.5, 15.5], [2.6, 12.5], [15.5, 6.5], [24.5, 10.5], [29.5, 17.5], [36.5, 20.5], [40.5, 33.5], [33.5, 35.5], [18.5, 35.0], [11.5, 34.6], [2.8, 35.0], [26.5, 24.5], [16.5, 23.5], [6.5, 21.5]];
    THORN.forEach(([x, y], i) => m.deco('p20_thorn', x, y, { radius: 0.3, scale: 0.9 + ((i * 37) % 5) * 0.08, label: 'A hawthorn, combed flat by the wind.' }));
    for (const [x, y] of [[3.5, 2.6], [8.5, 2.4], [13.5, 2.8], [27.5, 2.5], [41.2, 2.6], [41.5, 8.5]]) m.deco('oak', x, y, { radius: 0.45, scale: 1.7 });
    m.baseCount = m.entities.length;
    m._p20 = { yd, yc };
    return m;
  }
  function hookClearing(cl, yc) {
    cl.set(0, yc, DOOR({ tex: 't_p20_gate', portal: { map: DOWNS, x: DW - 2.4, y: yc - D2C[1] + 0.5, dir: Math.PI }, label: TX.gateIn }));
    cl._p20Gate = { x: 0, y: yc };
    // js/decals.js marks walls, never doors: the hedge cell that became the hurdle loses any mark it was given
    if (cl._decalsAll) delete cl._decalsAll[yc * cl.w];
  }

  // the movement graph a walker really has (the height rules of solidAt; drops are always allowed, and are falls when
  // they are not a walkable slope), solid props blocking their cells. Returns what can be reached from (sx, sy), which
  // cells can get back to (tx, ty), and the worst fall on the way.
  function reach(m, sx, sy, tx, ty) {
    const W = m.w, H = m.h, N = W * H;
    const blocked = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = m.cells[y * W + x]; if ((c && !c.door) || (m.floorCells && m.floorCells[y * W + x] === 2)) blocked[y * W + x] = 1; if (c && c.door) blocked[y * W + x] = 2; }
    for (const e of m.entities) {
      if (!e || !e.solid || e.kind === 'enemy' || e.kind === 'item') continue;
      const r = (e.radius || 0.3) + 0.24;
      for (let y = Math.floor(e.y - r); y <= Math.floor(e.y + r); y++) for (let x = Math.floor(e.x - r); x <= Math.floor(e.x + r); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if (Math.hypot(x + 0.5 - e.x, y + 0.5 - e.y) < r) blocked[y * W + x] = blocked[y * W + x] || 1;
      }
    }
    const g = (x, y) => m.groundAt(x + 0.5, y + 0.5);
    const step = (ax, ay, bx, by) => {
      const b = blocked[by * W + bx]; if (b === 1) return false;
      const rise = g(bx, by) - g(ax, ay);
      if (rise > STEP_UP) return false;
      if (m.smooth && rise > 0.02 && m.gradeAt(bx + 0.5, by + 0.5) > MAX_GRADE) return false;
      return true;
    };
    const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const fwd = new Uint8Array(N), q = [sx, sy]; fwd[sy * W + sx] = 1;
    let maxDrop = 0;
    for (let i = 0; i < q.length; i += 2) {
      const x = q[i], y = q[i + 1]; if (blocked[y * W + x] === 2 && !(x === sx && y === sy)) continue;   // a door is a way out, not a floor
      for (const [dx, dy] of NB) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || fwd[ny * W + nx]) continue;
        if (!step(x, y, nx, ny)) continue;
        const drop = g(x, y) - g(nx, ny), sloped = m.smooth && m.smooth[ny * W + nx] && m.gradeAt(nx + 0.5, ny + 0.5) <= MAX_GRADE;
        if (drop > STEP_UP && !sloped && drop > maxDrop) maxDrop = drop;
        fwd[ny * W + nx] = 1; q.push(nx, ny);
      }
    }
    const back = new Uint8Array(N), r = [tx, ty]; back[ty * W + tx] = 1;
    for (let i = 0; i < r.length; i += 2) {
      const x = r[i], y = r[i + 1];
      for (const [dx, dy] of NB) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || back[ny * W + nx]) continue;
        if (blocked[ny * W + nx] === 2) continue;
        if (!step(nx, ny, x, y)) continue;   // can a walker go from the neighbour to here?
        back[ny * W + nx] = 1; r.push(nx, ny);
      }
    }
    let reached = 0, stuck = 0, maxZ = 0; const stuckCells = [];
    for (let i = 0; i < N; i++) if (fwd[i] && blocked[i] !== 2) { reached++; const z = m.groundAt((i % W) + 0.5, ((i / W) | 0) + 0.5); if (z > maxZ) maxZ = z; if (!back[i]) { stuck++; if (stuckCells.length < 8) stuckCells.push([i % W, (i / W) | 0]); } }
    return { reached, stuck, stuckCells, maxDrop: +maxDrop.toFixed(3), maxZ: +maxZ.toFixed(3), fwd, back };
  }

  // ---------------------------------------------------------------- shared shading (the engine's own rule for walls)
  // tint(): toward the fog colour by (1 - f), then the light of the hour; post hooks get the fog per unit of light
  function shadePx(px, f, F) {
    const L = F.light, r = ((px & 255) * f + F.fogR * (1 - f)) * L, g = (((px >> 8) & 255) * f + F.fogG * (1 - f)) * L, b = (((px >> 16) & 255) * f + F.fogB * (1 - f)) * L;
    return (255 << 24) | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
  }
  const fogF = (F, t, side, floorK) => { let f = 1 - t / F.fogDist; if (f < 0) f = 0; f = F.ambient + (1 - F.ambient) * f; if (side) f *= 0.8; return f < floorK ? floorK : f; };
  const riteLamp = () => !!(hasG() && G.flags && G.flags.rite_ready);
  // a texel of the belfry stage on one of the tower's faces: u 0..2 along the face (left to right as seen from
  // outside), z between BELFRY_Z0 and BELFRY_Z1. Returns -1 outside the band.
  // The lamp hangs in the opening that looks down on the square (the south face, over the Chapel door).
  function belfryTexel(u, z, out, face) {
    if (z < BELFRY_Z0 || z >= BELFRY_Z1) return -1;
    const art = riteLamp() && face === 'S' ? BELFRY.lamp : BELFRY.plain;
    const tx = clamp((u * 64) | 0, 0, BW - 1), ty = clamp(((BELFRY_Z1 - z) * 64) | 0, 0, BH - 1), o = ty * BW + tx;
    out.glow = art.glow[o];
    return art.d[o];
  }
  // which face of the tower a world point lies on, and the u along it (as seen from outside), or null
  function towerFace(x, y, eps) {
    const T = TOWER;
    if (x < T.x0 - eps || x > T.x1 + eps || y < T.y0 - eps || y > T.y1 + eps) return null;
    const dW = Math.abs(x - T.x0), dE = Math.abs(x - T.x1), dN = Math.abs(y - T.y0), dS = Math.abs(y - T.y1), m = Math.min(dW, dE, dN, dS);
    if (m > eps) return null;
    if (m === dW) return { u: y - T.y0, side: 0, f: 'W' };
    if (m === dE) return { u: T.y1 - y, side: 0, f: 'E' };
    if (m === dN) return { u: T.x1 - x, side: 1, f: 'N' };
    return { u: x - T.x0, side: 1, f: 'S' };
  }

  // ---------------------------------------------------------------- 2. country beyond the walls
  let rdX = new Float32Array(640), rdY = new Float32Array(640);
  const tmp = { glow: 0 };
  function rays(F) {
    if (rdX.length < F.w) { rdX = new Float32Array(F.w); rdY = new Float32Array(F.w); }
    for (let x = 0; x < F.w; x++) { const cx = 2 * x / F.w - 1; rdX[x] = F.dirX + F.planeX * cx; rdY[x] = F.dirY + F.planeY * cx; }
  }
  // the ground past the map's edge: the relief renderer leaves it as haze (depth 1e9, material 0) when you stand high;
  // lay the map's own floor there, on the plane of the map's base, fogged with distance
  function farGround(F) {
    const { fb, dbuf, mbuf, w, h, horizon } = F, CZ = F.cam.z, CX = F.cam.x, CY = F.cam.y;
    const tex = Engine.textures[F.map.floor] || Engine.textures.t_grass; if (!tex || CZ <= 0.05) return 0;
    let n = 0;
    for (let y = Math.max(0, horizon + 1); y < h; y++) {
      const p = y + 0.5 - horizon, t = h * CZ / p, o0 = y * w;
      // far country keeps a little of its own colour however deep the haze, as the ridges do
      const f = fogF(F, t, 0, 0.3);
      for (let x = 0; x < w; x++) {
        const o = o0 + x; if (mbuf[o] !== 0 || dbuf[o] < 1e8) continue;   // only the haze the renderer left
        const wx = CX + t * rdX[x], wy = CY + t * rdY[x];
        // fields: the floor texture at a third of its scale, each field a little lighter or darker, hedgerows between
        const fx = Math.floor(wx / 7), fy = Math.floor(wy / 5), ex = wx / 7 - fx, ey = wy / 5 - fy;
        let c = tex[((((wy / 3) % 1 + 1) % 1 * 64) | 0) * 64 + ((((wx / 3) % 1 + 1) % 1 * 64) | 0)];
        const k = (ex < 0.05 || ey < 0.07) ? 0.55 : 0.84 + hash(fx, fy, 23) * 0.3;
        c = px((c & 255) * k, ((c >> 8) & 255) * k, ((c >> 16) & 255) * k);
        fb[o] = shadePx(c, f, F); own[o] = t; n++;
      }
    }
    return n;
  }
  // Oakhaven where it stands, ray-cast through its own cells: faces where the ground rises to a wall, the tops of
  // walls and roofs when you look down on them; front to back per column, behind anything this frame drew nearer
  function farTown(F, oak, off) {
    const { fb, dbuf, mbuf, w, h, horizon } = F, CZ = F.cam.z;
    const OX = F.cam.x + off[0], OY = F.cam.y + off[1], W = oak.w, H = oak.h, cells = oak.cells;
    const tStone = Engine.textures.t_stone, tmax0 = Math.min(110, F.fogDist * 3.2);
    let n = 0;
    for (let x = 0; x < w; x++) {
      const rdx = rdX[x], rdy = rdY[x];
      // where the ray enters and leaves Oakhaven's rectangle
      let t0 = 0, t1 = tmax0;
      if (Math.abs(rdx) < 1e-9) { if (OX < 0 || OX > W) continue; } else { let a = (0 - OX) / rdx, b = (W - OX) / rdx; if (a > b) { const s = a; a = b; b = s; } if (a > t0) t0 = a; if (b < t1) t1 = b; }
      if (Math.abs(rdy) < 1e-9) { if (OY < 0 || OY > H) continue; } else { let a = (0 - OY) / rdy, b = (H - OY) / rdy; if (a > b) { const s = a; a = b; b = s; } if (a > t0) t0 = a; if (b < t1) t1 = b; }
      if (t1 <= t0) continue;
      let tIn = t0 + 1e-4;
      let cx = Math.floor(OX + tIn * rdx), cy = Math.floor(OY + tIn * rdy);
      cx = clamp(cx, 0, W - 1); cy = clamp(cy, 0, H - 1);
      const stepX = rdx > 0 ? 1 : -1, stepY = rdy > 0 ? 1 : -1;
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let sdx = rdx > 0 ? (cx + 1 - OX) / rdx : rdx < 0 ? (cx - OX) / rdx : 1e30;
      let sdy = rdy > 0 ? (cy + 1 - OY) / rdy : rdy < 0 ? (cy - OY) / rdy : 1e30;
      let side = sdx - ddx > sdy - ddy ? 0 : 1, prevTop = 0, clip = h;
      for (let it = 0; it < W + H + 4 && clip > 0; it++) {
        const tOut = Math.min(sdx, sdy, t1);
        const c = cells[cy * W + cx];
        const top = c ? (c.top != null ? c.top : 1) : 0;
        if (top > prevTop + 0.01 && tIn > 0.3) {
          // a face from prevTop up to top at distance tIn
          const yT = horizon + h * (CZ - top) / tIn, yB = horizon + h * (CZ - prevTop) / tIn;
          let ys = Math.max(0, Math.ceil(yT)), ye = Math.min(clip - 1, Math.floor(yB), h - 1);
          if (ye >= ys) {
            const tex = (c && Engine.textures[c.tex]) || tStone, f = fogF(F, tIn, side, 0.22);
            let u = side === 0 ? OY + tIn * rdy : OX + tIn * rdx; u -= Math.floor(u);
            let tx = (u * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = 63 - tx;
            const isTower = cx >= TOWER.x0 && cx < TOWER.x1 && cy >= TOWER.y0 && cy < TOWER.y1 && on('belfryArt');
            let tf = null; if (isTower) tf = towerFace(OX + tIn * rdx, OY + tIn * rdy, 0.02);
            for (let y = ys; y <= ye; y++) {
              const o = y * w + x; if (dbuf[o] < 1e8 || own[o] <= tIn) continue;
              const z = CZ - (y + 0.5 - horizon) * tIn / h;
              let p = -1, glow = 0;
              if (tf) { p = belfryTexel(tf.u, z, tmp, tf.f); glow = tmp.glow; }
              if (p < 0) p = tex[((((top - z) * 64) | 0) & 63) * 64 + tx];
              fb[o] = glow ? shadePx(p, Math.max(f, 0.85), { light: 1, fogR: F.fogR * F.light, fogG: F.fogG * F.light, fogB: F.fogB * F.light }) : shadePx(p, f, F);
              own[o] = tIn; if (glow) mbuf[o] = 8; n++;
            }
            if (ys < clip) clip = ys;
          }
        }
        if (top > 0 && CZ > top + 0.01 && clip > 0) {
          // the top of a wall or roof, seen from above, from tIn to tOut
          const yNear = horizon + h * (CZ - top) / Math.max(tIn, 0.3), yFar = horizon + h * (CZ - top) / tOut;
          let ys = Math.max(0, Math.ceil(yFar)), ye = Math.min(clip - 1, Math.floor(yNear), h - 1);
          if (ye >= ys) {
            const tex = (c && Engine.textures[c.capTex || c.tex]) || tStone;
            for (let y = ys; y <= ye; y++) {
              const t = h * (CZ - top) / (y + 0.5 - horizon), o = y * w + x; if (dbuf[o] < 1e8 || own[o] <= t) continue;
              const wx = OX + t * rdx, wy = OY + t * rdy;
              const p = tex[((((wy - Math.floor(wy)) * 64) | 0) & 63) * 64 + ((((wx - Math.floor(wx)) * 64) | 0) & 63)];
              fb[o] = shadePx(p, fogF(F, t, 0, 0.22), F); own[o] = t; n++;
            }
            if (ys < clip) clip = ys;
          }
        }
        prevTop = top;
        if (tOut >= t1) break;
        if (sdx < sdy) { tIn = sdx; sdx += ddx; cx += stepX; side = 0; } else { tIn = sdy; sdy += ddy; cy += stepY; side = 1; }
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) break;
        // anything further only shows above what is drawn if it could rise above it
        if (horizon + h * (CZ - 3.4) / tIn >= clip) break;
      }
    }
    return n;
  }
  // The far country keeps its own depth: the frame's depth and material buffers are left as the renderer wrote them
  // (sky and distant haze), so every later pass treats these pixels as the far air they stand in, at no extra cost.
  let own = new Float32Array(0);
  function farHook(F) {
    stats.farPx = 0; stats.groundPx = 0;
    if (!F.outdoor || !F.map || !on('farCountry')) return;
    // Phase 20b: every outdoor height-mapped map gets the far ground beyond its edge; the town past the Hedge only
    // where the map's frame is tied to Oakhaven's (OFF)
    const off = OFF[F.map.id]; if (!off && !F.relief) return;
    const t0 = performance.now();
    if (own.length !== F.w * F.h) own = new Float32Array(F.w * F.h);
    own.fill(1e9);
    rays(F);
    if (F.relief) stats.groundPx = farGround(F);
    const oak = hasG() && off ? G.maps.oakhaven : null;
    if (oak) stats.farPx = farTown(F, oak, off);
    stats.farMs = performance.now() - t0;
  }

  // ---------------------------------------------------------------- 3. the belfry on the tower, seen in town
  // The engine draws the tower's faces with the marble texture all the way up. Here every wall pixel whose depth puts it
  // on one of the tower's four faces, in the top unit, is repainted with the belfry stage (lit like the wall it replaces).
  function belfryHook(F) {
    stats.belfryPx = 0;
    if (!F.outdoor || !F.map || F.map.id !== 'oakhaven' || !on('belfryArt')) return;
    const t0 = performance.now();
    const { fb, dbuf, mbuf, w, h, horizon } = F, CX = F.cam.x, CY = F.cam.y, CZ = F.cam.z, T = TOWER;
    // the tower's screen columns from its corners (any corner behind the eye: test every column)
    let xa = w, xb = -1, tmin = 1e9, tmax = 0;
    const invDet = 1 / (F.planeX * F.dirY - F.dirX * F.planeY);
    let behind = false;
    for (const [qx, qy] of [[T.x0, T.y0], [T.x1, T.y0], [T.x0, T.y1], [T.x1, T.y1]]) {
      const sx = qx - CX, sy = qy - CY, trX = invDet * (F.dirY * sx - F.dirX * sy), trY = invDet * (-F.planeY * sx + F.planeX * sy);
      if (trY <= 0.05) { behind = true; continue; }
      const scr = (w / 2) * (1 + trX / trY); if (scr < xa) xa = scr; if (scr > xb) xb = scr;
      if (trY < tmin) tmin = trY; if (trY > tmax) tmax = trY;
    }
    if (behind) { xa = 0; xb = w - 1; tmin = 0.05; tmax = Math.max(tmax, 4); }
    xa = Math.max(0, Math.floor(xa) - 1); xb = Math.min(w - 1, Math.ceil(xb) + 1);
    if (xb < xa) return;
    // rows the band can occupy over that range of distances
    const ya = Math.max(0, Math.floor(horizon + h * (CZ - BELFRY_Z1) / Math.max(tmax, 0.05)) - 1);
    const yb = Math.min(h - 1, Math.ceil(horizon + h * (CZ - BELFRY_Z0) / Math.max(tmin, 0.05)) + 1);
    let n = 0;
    for (let x = xa; x <= xb; x++) {
      const cxr = 2 * x / w - 1, rdx = F.dirX + F.planeX * cxr, rdy = F.dirY + F.planeY * cxr;
      for (let y = ya; y <= yb; y++) {
        const o = y * w + x; if (mbuf[o] !== 4) continue;
        const t = dbuf[o]; if (t > 200) continue;
        const z = CZ - (y + 0.5 - horizon) * t / h; if (z < BELFRY_Z0 || z >= BELFRY_Z1) continue;
        const tf = towerFace(CX + t * rdx, CY + t * rdy, 0.03); if (!tf) continue;
        const p = belfryTexel(tf.u, z, tmp, tf.f); if (p < 0) continue;
        const f = fogF(F, t, tf.side, 0);
        fb[o] = tmp.glow ? shadePx(p, Math.max(f, 0.9), { light: 1, fogR: F.fogR * F.light, fogG: F.fogG * F.light, fogB: F.fogB * F.light }) : shadePx(p, f, F);
        if (tmp.glow) mbuf[o] = 8;
        n++;
      }
    }
    stats.belfryPx = n; stats.belfryMs = performance.now() - t0;
  }

  // ---------------------------------------------------------------- the Chapel's frame inside
  function syncFrame() {
    if (!hasG()) return;
    const m = G.maps.chapel; if (!m) return;
    const e = m.entities.find((q) => q && q.use === 'plinth'); if (!e) return;
    if (e._p20Orig === undefined) e._p20Orig = e.sprite;
    e.sprite = on('belfryArt') ? (riteLamp() ? 'p20_bellframe_lamp' : 'p20_bellframe') : e._p20Orig;
  }

  // ---------------------------------------------------------------- Options rows (Graphics & access)
  const ROWS = [
    ['farCountry', 'Country beyond walls', 'Oakhaven seen past the Hedge from outside it, and distant ground beyond the map edge'],
    ['belfryArt', 'Chapel belfry', 'the Chapel tower\'s open belfry and its empty bell-frame, drawn'],
  ];
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('gfx-p20-farCountry')) return;
    for (const [key, name, hint] of ROWS) {
      const label = document.createElement('span'); label.className = 'gfx-label'; label.appendChild(document.createTextNode(name + ' '));
      const sm = document.createElement('small'); sm.className = 'muted'; sm.textContent = hint; label.appendChild(sm);
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = 'gfx-p20-' + key; b.type = 'button'; b.setAttribute('aria-label', name);
      const sync = () => { b.textContent = GFX[key] !== false ? 'On' : 'Off'; b.setAttribute('aria-pressed', GFX[key] !== false ? 'true' : 'false'); };
      b.onclick = () => { GFX[key] = GFX[key] === false; if (typeof PRESETS !== 'undefined') GFX.preset = PRESETS.current(); GFX.changed(); sync(); };
      sync();
      grid.appendChild(label); grid.appendChild(b);
    }
  }

  // ---------------------------------------------------------------- wiring
  function wire() {
    installArt();
    if (typeof LANDMARKS !== 'undefined' && !LANDMARKS[DOWNS]) {
      // the Grey Teeth to the north, and the downs rolling away west (bearings in the Downs' own frame)
      LANDMARKS[DOWNS] = [
        { a: -1.4, aw: 1.1, h: 0.28, p: 1.4, ridge: 0.5, seed: 1.7, far: 0.85, cap: [152, 158, 178], capH: 0.26, c: [40, 42, 58] },
        { a: 3.0, aw: 1.3, h: 0.13, p: 1.0, ridge: 0.4, seed: 4.2, far: 0.55, c: [44, 50, 52] },
        { a: 0.4, aw: 0.7, h: 0.10, p: 1.1, far: 0.6, c: [38, 44, 46] },
      ];
    }
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) SCREENS.FAMILY[DOWNS] = 'hedge'; } catch (e) { /* no arrival cards */ }
    // grass tufts and a few reeds by the dew-pond, from js/flora.js (transient, never saved)
    try { if (typeof FLORA !== 'undefined' && FLORA.PLANS && !FLORA.PLANS[DOWNS]) FLORA.PLANS[DOWNS] = { grass: 170, reed: 12 }; } catch (e) { /* no grass */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try {
          if (maps.clearing && !maps[DOWNS]) {
            const yc = downsGateRow(maps.clearing); hookClearing(maps.clearing, yc); maps[DOWNS] = buildDowns(yc);
            // flora.js placed its grass before this map existed: give the Downs theirs (transient, after baseCount)
            if (typeof FLORA !== 'undefined' && FLORA.place) FLORA.place({ [DOWNS]: maps[DOWNS] });
          }
        } catch (e) { warnOnce('downs', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _l = loadMap;
      loadMap = function (id) { try { if (id === 'chapel') syncFrame(); } catch (e) { warnOnce('frame', e); } return _l.apply(this, arguments); };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendRows(); } catch (e) { warnOnce('rows', e); } return r; };
    }
    if (typeof GFX !== 'undefined' && GFX.onChange) GFX.onChange(() => { try { syncFrame(); } catch (e) { warnOnce('frame', e); } });
    if (typeof Engine !== 'undefined' && Engine.addPostHook) {
      // before the lantern (-4), the dark-interiors pass (-5), gates (-8): these are walls and ground, and every later
      // pass (fog, mist, bloom, grade, the cinematic pass) should treat them as such
      Engine.addPostHook((F) => { try { farHook(F); } catch (e) { warnOnce('far', e); } }, -9.6);
      Engine.addPostHook((F) => { try { belfryHook(F); } catch (e) { warnOnce('belfry', e); } }, -9.5);
    }
  }
  wire();

  return {
    DOWNS, OFF, D2C, TX, TOWER, BELFRY, stats, ROWS,
    reach, buildDowns, downsGateRow, syncFrame, towerFace, belfryTexel,
    hooks: { far: farHook, belfry: belfryHook },
    riteLamp,
  };
})();
