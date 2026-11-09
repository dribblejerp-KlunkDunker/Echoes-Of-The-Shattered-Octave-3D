// ============================================================
//  painted20 — Phase 20b "The painted world, finished": the ground, the walls, the trees and the painted pieces.
//
//  Phase 20's teams gave the bestiary its five views, the sky its panoramas, the Chapel its belfry, the ceilings their
//  tiles and the country beyond the walls. What still read as a stand-in was the biggest surface of every outdoor
//  frame: one 64x64 grass tile laid across whole meadows, one house front on every building, one oak in every wood,
//  and the scenery props drawn with canvas strokes. This module finishes that:
//
//  1. PAINTED GROUND (switch "Painted ground", GFX.p20_ground). Every grass and moss map gets painted ground that
//     changes from cell to cell: the meadow tile, a dense clover tile, a dry straw tile, a tile of bare trodden earth,
//     and two mosses. The tiles are hand-built pixel art painted here at load from each map's own base tile: the dark,
//     body and light tones of the original t_grass / t_moss are read out of it, so the new ground keeps the colour the
//     panoramas, the far country and the automap already use, and only the detail is new. Which tile a cell gets is a
//     pure function of the map id and the cell (two tileable noise fields and a few rules: earth beside roads, doors
//     and walls; clover in the damp hollows; straw on the open flats), written into map.floorCells, which the engine,
//     R3D and the automap already read per cell. Footsteps and the rain's mud still see grass (js/upgrades.js and
//     js/air11.js match the family name, not the tile).
//  2. PAINTED WALLS (switch "Painted walls", GFX.p20_walls). Three more house fronts (close studding, brick nogging
//     between the timbers, a braced frame with cracked plaster) and two more stone courses (dressed ashlar, rubble with
//     moss in the joints), painted from the original tiles' own timber, plaster and stone tones. Every building in a
//     town (a connected run of house cells) draws one front for the whole building; stone varies by the cell.
//  3. TREE VARIETY (switch "Tree variety", GFX.p20_trees). The painted oak comes in three colours now (its own rust,
//     a green-gold and a dark copper, recoloured leaf by leaf from the one painting) and the willow in two, and about
//     half of them are turned about, chosen by where each tree stands. Nothing moves: the same deco, the same place.
//  4. PAINTED PIECES (switch "Painted pieces", GFX.p20_pieces). Real paintings for the scenery, the flora and the wall
//     notices, in place of the canvas-drawn stand-ins of js/scenery.js, js/flora.js and js/decals.js: the files in
//     img/painted20/ (see tools/art/painted20/key.py and CREDITS.md). Each is swapped in under the stand-in's own
//     sprite or texture name, at its size and anchor, once it has loaded; off, or until then, the stand-in draws.
//
//  Everything is deterministic (seeded hashes and noise, no Math.random), prepared once per map when the maps are
//  built (and for any map built later, when it is first loaded), and kept apart from the originals, which come back
//  byte for byte when a switch goes off: the Original preset (GFX.plain) has none of it. Saves hold entity indexes,
//  flags and positions, none of which change; floor cells, wall textures and sprite names are rebuilt from code.
// ============================================================
'use strict';

const PAINTED20 = (() => {
  const FLAGS = ['p20_ground', 'p20_walls', 'p20_trees', 'p20_pieces'];
  const hasGFX = typeof GFX !== 'undefined';
  if (hasGFX) {
    for (const k of FLAGS) {
      if (GFX[k] === undefined) GFX[k] = true;
      if (Array.isArray(GFX.FX) && !GFX.FX.includes(k)) GFX.FX.push(k);
      if (!Array.isArray(GFX.ART)) GFX.ART = [];
      if (!GFX.ART.includes(k)) GFX.ART.push(k);
    }
  }
  const on = (k) => hasGFX && GFX[k] !== false;
  const hasG = () => typeof G !== 'undefined' && G && typeof Engine !== 'undefined';
  const stats = { tiles: 0, groundMaps: 0, groundCells: 0, wallMaps: 0, wallCells: 0, trees: 0, pieces: 0, piecesFailed: 0, errors: 0 };
  const warned = {};
  const warnOnce = (k, e) => { if (warned[k]) return; warned[k] = true; stats.errors++; console.warn('painted20 ' + k, e); };

  // ---------------------------------------------------------------- numbers
  const TEX = 64;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const px = (r, g, b, a) => (((a == null ? 255 : a) << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  const R = (c) => c & 255, Gc = (c) => (c >> 8) & 255, B = (c) => (c >> 16) & 255;
  const mix = (a, b, t) => px(R(a) + (R(b) - R(a)) * t, Gc(a) + (Gc(b) - Gc(a)) * t, B(a) + (B(b) - B(a)) * t);
  const scale = (c, k) => px(R(c) * k, Gc(c) * k, B(c) * k);
  const lum = (c) => 0.299 * R(c) + 0.587 * Gc(c) + 0.114 * B(c);
  function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function hash2(x, y, seed) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  const smooth = (t) => t * t * (3 - 2 * t);
  // tileable value noise over a lattice of `cells` points per side (the tile is TEX wide, so the lattice repeats with it)
  function tileNoise(seed, cells) {
    const v = new Float32Array(cells * cells), r = mulberry32(seed);
    for (let i = 0; i < v.length; i++) v[i] = r();
    return (x, y) => {
      const u = ((x % TEX) + TEX) % TEX / TEX * cells, w = ((y % TEX) + TEX) % TEX / TEX * cells;
      const i0 = u | 0, j0 = w | 0, fu = smooth(u - i0), fw = smooth(w - j0), i1 = (i0 + 1) % cells, j1 = (j0 + 1) % cells;
      const a = v[j0 * cells + i0], b = v[j0 * cells + i1], c = v[j1 * cells + i0], d = v[j1 * cells + i1];
      return (a * (1 - fu) + b * fu) * (1 - fw) + (c * (1 - fu) + d * fu) * fw;
    };
  }
  // world-space noise for the cell assignment: periodic over `period` cells, so a map of any size reads it
  function cellNoise(seed, period) {
    const n = tileNoise(seed, 8);
    return (x, y) => n(x / period * TEX, y / period * TEX);
  }

  // ---------------------------------------------------------------- the palette of a tile
  // The dark, body and light tones of an existing 64x64 tile, and its average: new tiles are painted from these so the
  // ground stays the colour the rest of the game expects.
  function tones(tex) {
    const cs = Array.from(tex).sort((a, b) => lum(a) - lum(b)), n = cs.length;
    const at = (f) => cs[Math.min(n - 1, Math.max(0, (f * n) | 0))];
    let r = 0, g = 0, b = 0; for (const c of tex) { r += R(c); g += Gc(c); b += B(c); }
    return { dark: at(0.06), shade: at(0.25), body: at(0.5), lit: at(0.78), light: at(0.95), avg: px(r / n, g / n, b / n) };
  }

  // ---------------------------------------------------------------- the tile painters (pure, deterministic)
  const T = { set(d, x, y, c) { d[(((y % TEX) + TEX) % TEX) * TEX + (((x % TEX) + TEX) % TEX)] = c; }, get(d, x, y) { return d[(((y % TEX) + TEX) % TEX) * TEX + (((x % TEX) + TEX) % TEX)]; } };
  // a base of soft noise between two tones, with a finer grain over it
  function ground(d, seed, a, b, grain) {
    const n1 = tileNoise(seed, 5), n2 = tileNoise(seed + 7, 13), n3 = tileNoise(seed + 19, 32);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const t = clamp(n1(x, y) * 0.6 + n2(x, y) * 0.3 + (n3(x, y) - 0.5) * grain, 0, 1);
      d[y * TEX + x] = mix(a, b, t);
    }
  }
  // a grass blade: `len` pixels tall from (x, y) upward, leaning `lean` across its height, a darker foot
  function blade(d, x, y, len, lean, col, foot) {
    for (let i = 0; i < len; i++) T.set(d, x + Math.round(lean * i / len), y - i, i === 0 && foot ? foot : col);
  }
  // every variant keeps the original tile's own grain under the new marks (the game's ground has a busy painted
  // texture; a smooth tile beside it reads as a patch), and stays within a few steps of its luminance
  function paintGrass(src, variant, seed) {
    const p = tones(src), d = new Uint32Array(TEX * TEX), r = mulberry32(seed), n = tileNoise(seed, 5);
    if (variant === 'a') {              // the meadow: the tile a little livelier, blades over it, a seed head or two
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) { const c = src[y * TEX + x]; d[y * TEX + x] = mix(c, p.lit, (n(x, y) - 0.5) * 0.3 + 0.08); }
      for (let i = 0; i < 70; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0, len = 2 + ((r() * 3) | 0); blade(d, x, y, len, (r() - 0.5) * 2, r() < 0.3 ? p.light : p.lit, p.dark); }
      for (let i = 0; i < 6; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, mix(p.light, px(205, 180, 110), 0.5)); T.set(d, x, y + 1, p.lit); }
    } else if (variant === 'b') {       // clover in the damp: the tile a shade darker and cooler, trefoils over it
      const cool = mix(p.shade, px(40, 100, 70), 0.35), leaf = mix(p.body, px(60, 125, 80), 0.5), leafLit = mix(p.lit, px(110, 170, 110), 0.4);
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) { const c = src[y * TEX + x]; d[y * TEX + x] = mix(c, cool, 0.22 + n(x, y) * 0.16); }
      for (let i = 0; i < 46; i++) {
        const x = (r() * TEX) | 0, y = (r() * TEX) | 0, k = r() < 0.5 ? leaf : leafLit;
        T.set(d, x, y, k); T.set(d, x + 1, y, k); T.set(d, x, y + 1, k); T.set(d, x + 1, y + 1, mix(k, p.dark, 0.4)); T.set(d, x + 1, y - 1, k);
      }
      for (let i = 0; i < 24; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; blade(d, x, y, 2 + ((r() * 2) | 0), (r() - 0.5) * 1.5, p.lit, p.dark); }
      for (let i = 0; i < 4; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, px(215, 210, 220)); }   // a few white clover heads
    } else if (variant === 'c') {       // the dry flat: straw over the tile, a bare patch, a stone or two
      const straw = mix(p.lit, px(190, 160, 95), 0.5), strawLit = mix(p.light, px(215, 190, 125), 0.5), earth = mix(p.shade, px(110, 85, 55), 0.5);
      const bare = tileNoise(seed + 101, 4);
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) { const c = src[y * TEX + x]; let o = mix(c, straw, 0.14 + n(x, y) * 0.1); if (bare(x, y) > 0.7) o = mix(o, earth, 0.45); d[y * TEX + x] = o; }
      for (let i = 0; i < 64; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; blade(d, x, y, 2 + ((r() * 4) | 0), (r() - 0.5) * 2.4, r() < 0.5 ? straw : strawLit, mix(p.dark, earth, 0.5)); }
      for (let i = 0; i < 4; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, px(150, 145, 135)); T.set(d, x + 1, y, px(120, 115, 105)); T.set(d, x, y + 1, mix(p.dark, px(60, 50, 40), 0.5)); }
    } else {                            // trodden earth: the tile under mud, ruts, pebbles, the grass that survives at the edge
      const mud = mix(p.shade, px(112, 86, 56), 0.6), rutC = mix(p.dark, px(78, 58, 38), 0.6);
      const rut = tileNoise(seed + 55, 3);
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) { const c = src[y * TEX + x]; let o = mix(c, mud, 0.5 + n(x, y) * 0.12); if (rut(x, y) < 0.36) o = mix(o, rutC, 0.3); d[y * TEX + x] = o; }
      for (let i = 0; i < 18; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0, k = 115 + r() * 45; T.set(d, x, y, px(k + 20, k + 15, k)); T.set(d, x + 1, y, px(k, k - 5, k - 10)); T.set(d, x, y + 1, px(60, 46, 32)); }
      for (let i = 0; i < 26; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; blade(d, x, y, 2 + ((r() * 2) | 0), (r() - 0.5) * 1.5, p.body, p.dark); }
    }
    return d;
  }
  function paintMoss(src, variant, seed) {
    const p = tones(src), d = new Uint32Array(TEX * TEX), r = mulberry32(seed), pits = tileNoise(seed + 3, 6);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const c = src[y * TEX + x], v = pits(x, y);
      d[y * TEX + x] = v < 0.3 ? mix(c, p.dark, (0.3 - v) * 1.4) : v > 0.72 ? mix(c, p.lit, (v - 0.72) * 1.2) : c;
    }
    if (variant === 'a') {              // the cushion moss: soft tufts, a few pale tips
      for (let i = 0; i < 90; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, r() < 0.2 ? p.light : p.lit); T.set(d, x, y + 1, p.shade); }
    } else {                            // lichen and leaf-litter: grey-green rosettes and a dead leaf or two
      const lich = mix(p.lit, px(160, 165, 140), 0.5), lichLit = mix(p.light, px(190, 195, 175), 0.5), leaf = mix(p.body, px(140, 90, 40), 0.55);
      for (let i = 0; i < 8; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0, rr = 1 + ((r() * 2) | 0); for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) T.set(d, x + dx, y + dy, (dx + dy) & 1 ? lich : lichLit); T.set(d, x, y, mix(lich, p.dark, 0.3)); }
      for (let i = 0; i < 8; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, leaf); T.set(d, x + 1, y, mix(leaf, p.dark, 0.3)); T.set(d, x + 2, y + (r() < 0.5 ? 1 : 0), leaf); }
      for (let i = 0; i < 40; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; T.set(d, x, y, p.lit); }
    }
    return d;
  }
  // a timber: a rectangle of the timber tone with a lit top-left edge and a dark bottom-right, and the grain in it
  function timber(d, x0, y0, x1, y1, col, r) {
    const litC = scale(col, 1.22), darkC = scale(col, 0.72);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let c = col; if (r() < 0.12) c = scale(col, 0.88); if (y === y0 || x === x0) c = litC; if (y === y1 || x === x1) c = darkC;
      T.set(d, x, y, c);
    }
  }
  function plaster(d, x0, y0, x1, y1, col, seed) {
    const n = tileNoise(seed, 6), g = tileNoise(seed + 5, 20);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let c = mix(scale(col, 0.9), col, n(x, y));
      c = mix(c, scale(col, 0.82), clamp((g(x, y) - 0.5) * 1.2, 0, 1));
      if (y === y0) c = scale(c, 0.74); if (x === x0) c = scale(c, 0.86);   // the shadow the timber throws
      T.set(d, x, y, c);
    }
  }
  function paintHouse(src, variant, seed) {
    const p = tones(src), d = new Uint32Array(TEX * TEX), r = mulberry32(seed);
    const wood = p.dark, pl = p.light;
    if (variant === 1) {                // close studding: studs every ten pixels, a rail, the plaster between
      plaster(d, 0, 0, TEX - 1, TEX - 1, pl, seed);
      for (let x = 1; x < TEX; x += 10) timber(d, x, 0, x + 2, TEX - 1, wood, r);
      timber(d, 0, 0, TEX - 1, 2, wood, r); timber(d, 0, 31, TEX - 1, 33, wood, r); timber(d, 0, 61, TEX - 1, 63, wood, r);
      for (let i = 0; i < 24; i++) { const x = (r() * TEX) | 0, y = (r() * TEX) | 0; if (lum(T.get(d, x, y)) > lum(wood) + 40) T.set(d, x, y, scale(T.get(d, x, y), 0.8)); }   // stains
    } else if (variant === 2) {         // brick nogging: the frame with bricks laid between its timbers
      const brick = mix(px(132, 82, 62), p.body, 0.4), brickB = mix(px(104, 64, 50), p.shade, 0.4), mortar = mix(pl, px(170, 160, 140), 0.5);
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
        const row = (y / 5) | 0, off = (row & 1) * 5, inM = (y % 5) === 0 || ((x + off) % 10) === 0;
        let c = inM ? mortar : (((x + off) / 10) | 0) % 3 === 1 ? brickB : brick;
        if (!inM && r() < 0.15) c = scale(c, 0.9);
        d[y * TEX + x] = c;
      }
      timber(d, 0, 0, 2, TEX - 1, wood, r); timber(d, 61, 0, 63, TEX - 1, wood, r); timber(d, 31, 0, 33, TEX - 1, wood, r);
      timber(d, 0, 0, TEX - 1, 2, wood, r); timber(d, 0, 29, TEX - 1, 31, wood, r); timber(d, 0, 61, TEX - 1, 63, wood, r);
    } else {                            // the braced frame: a mid rail, two diagonal braces, plaster that has cracked
      plaster(d, 0, 0, TEX - 1, TEX - 1, pl, seed + 3);
      timber(d, 0, 0, 2, TEX - 1, wood, r); timber(d, 61, 0, 63, TEX - 1, wood, r); timber(d, 0, 0, TEX - 1, 2, wood, r); timber(d, 0, 61, TEX - 1, 63, wood, r);
      timber(d, 0, 30, TEX - 1, 32, wood, r);
      for (let i = 0; i < 28; i++) { timber(d, 3 + i, 31 - i - 1, 5 + i, 31 - i, wood, r); timber(d, 58 - i, 31 - i - 1, 60 - i, 31 - i, wood, r); }   // braces up to the corners
      for (let i = 0; i < 28; i++) { timber(d, 3 + i, 33 + i, 5 + i, 34 + i, wood, r); timber(d, 58 - i, 33 + i, 60 - i, 34 + i, wood, r); }
      const crack = scale(pl, 0.55);
      for (let k = 0; k < 3; k++) { let x = 8 + ((r() * 44) | 0), y = 6 + ((r() * 20) | 0); for (let i = 0; i < 10; i++) { if (lum(T.get(d, x, y)) > lum(wood) + 40) T.set(d, x, y, crack); x += r() < 0.5 ? 1 : 0; y += 1; } }
    }
    return d;
  }
  function paintStone(src, variant, seed) {
    const p = tones(src), d = new Uint32Array(TEX * TEX), r = mulberry32(seed);
    const mortar = p.dark;
    if (variant === 1) {                // dressed ashlar: 16x8 blocks, courses offset, every block its own tone
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
        const row = (y / 8) | 0, off = (row & 1) * 8, bx = (((x + off) % TEX) / 16) | 0;
        const seedB = hash2(bx, row, seed), tone = mix(mix(p.shade, p.lit, seedB), src[y * TEX + x], 0.4);
        let c = tone;
        if ((y % 8) === 7 || ((x + off) % 16) === 15) c = mortar;
        else if ((y % 8) === 0 || ((x + off) % 16) === 0) c = scale(tone, 1.12);
        else if (hash2(x, y, seed + 9) < 0.08) c = scale(tone, 0.9);
        d[y * TEX + x] = c;
      }
    } else {                            // rubble: irregular stones round seeded centres, mortar between, moss low in the joints
      const pts = []; for (let i = 0; i < 26; i++) pts.push([r() * TEX, r() * TEX, r()]);
      const dist = (x, y, q) => { let dx = Math.abs(x - q[0]), dy = Math.abs(y - q[1]); dx = Math.min(dx, TEX - dx); dy = Math.min(dy, TEX - dy); return dx * dx * 1.3 + dy * dy; };
      const moss = mix(p.body, px(60, 110, 50), 0.6);
      for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
        let b1 = 1e9, b2 = 1e9, k = 0;
        for (let i = 0; i < pts.length; i++) { const dd = dist(x, y, pts[i]); if (dd < b1) { b2 = b1; b1 = dd; k = i; } else if (dd < b2) b2 = dd; }
        const edge = Math.sqrt(b2) - Math.sqrt(b1);
        let c = mix(mix(p.shade, p.lit, pts[k][2]), src[y * TEX + x], 0.4);
        if (edge < 1.3) c = mortar; else if (edge < 2.4) c = scale(c, 0.8); else if (hash2(x, y, seed) < 0.1) c = scale(c, 1.1);
        if (edge < 1.8 && y > 40 && hash2(x, y, seed + 2) < 0.45) c = moss;
        d[y * TEX + x] = c;
      }
    }
    return d;
  }

  // ---------------------------------------------------------------- registration of the tiles
  // name -> { base, kind, variant }. The names keep the family in front (t_grass..., t_moss...): js/upgrades.js and
  // js/air11.js read the family for footsteps and mud.
  const TILES = {
    t_grass_p20b_a: { base: 't_grass', kind: 'grass', v: 'a' }, t_grass_p20b_b: { base: 't_grass', kind: 'grass', v: 'b' },
    t_grass_p20b_c: { base: 't_grass', kind: 'grass', v: 'c' }, t_grass_p20b_d: { base: 't_grass', kind: 'grass', v: 'd' },
    t_moss_p20b_a: { base: 't_moss', kind: 'moss', v: 'a' }, t_moss_p20b_b: { base: 't_moss', kind: 'moss', v: 'b' },
    t_house_p20b_1: { base: 't_house', kind: 'house', v: 1 }, t_house_p20b_2: { base: 't_house', kind: 'house', v: 2 }, t_house_p20b_3: { base: 't_house', kind: 'house', v: 3 },
    t_stone_p20b_1: { base: 't_stone', kind: 'stone', v: 1 }, t_stone_p20b_2: { base: 't_stone', kind: 'stone', v: 2 },
  };
  const GROUND = { t_grass: ['t_grass', 't_grass_p20b_a', 't_grass_p20b_b', 't_grass_p20b_c', 't_grass_p20b_d'], t_moss: ['t_moss', 't_moss_p20b_a', 't_moss_p20b_b'] };
  const HOUSE = ['t_house', 't_house_p20b_1', 't_house_p20b_2', 't_house_p20b_3'];
  const STONE = ['t_stone', 't_stone_p20b_1', 't_stone_p20b_2'];
  let tilesReady = false;
  function ensureTiles() {
    if (tilesReady || typeof Engine === 'undefined' || !Engine.textures) return tilesReady;
    for (const b of ['t_grass', 't_moss', 't_house', 't_stone']) if (!Engine.textures[b]) return false;   // the assets are still decoding
    try {
      let seed = 2020;
      for (const name in TILES) {
        const t = TILES[name], src = Engine.textures[t.base]; seed += 97;
        const d = t.kind === 'grass' ? paintGrass(src, t.v, seed) : t.kind === 'moss' ? paintMoss(src, t.v, seed) : t.kind === 'house' ? paintHouse(src, t.v, seed) : paintStone(src, t.v, seed);
        Engine.addTexture(name, d); stats.tiles++;
      }
      tilesReady = true;
    } catch (e) { warnOnce('tiles', e); }
    return tilesReady;
  }
  const budgetBytes = () => stats.tiles * TEX * TEX * 4;   // 11 tiles = 180,224 B, under the 512 KB cap with DECALS' 256 KB

  // ---------------------------------------------------------------- 1. the ground
  function floorNameAt(m, i) { const idx = m.floorCells ? m.floorCells[i] : 0; return (idx && m.floorTextures ? m.floorTextures[idx] : null) || m.floor; }
  const ROADS = new Set(['t_cobble', 't_flag', 't_p20_track', 't_wood', 't_marble']);
  function prepareGround(m) {
    const base = m.floor, fam = GROUND[base]; if (!m.outdoor || !fam) return null;
    const seed = hashStr(m.id), n1 = cellNoise(seed, 14), n2 = cellNoise(seed ^ 0x9e37, 7), W = m.w, H = m.h;
    const names = m.floorTextures ? m.floorTextures.slice() : [base];
    const idxOf = {}; for (const nm of fam) { let k = names.indexOf(nm); if (k < 0) { k = names.length; names.push(nm); } idxOf[nm] = k; }
    const cells = new Uint8Array(W * H); let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (m.cells[i] || floorNameAt(m, i) !== base) continue;
      // beside a road, a door or a wall the grass is worn to earth (or kept short on moss)
      let worn = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (m.cells[j] ? !!m.cells[j].door : ROADS.has(floorNameAt(m, j))) { worn = true; break; }
      }
      const a = n1(x, y), b = n2(x, y), h = hash2(x, y, seed);
      let pick;
      if (base === 't_grass') {
        if (worn && h < 0.6) pick = 't_grass_p20b_d';
        else if (b > 0.86) pick = 't_grass_p20b_d';
        else if (a > 0.66) pick = 't_grass_p20b_b';
        else if (a < 0.27) pick = 't_grass_p20b_c';
        else if (a < 0.47) pick = 't_grass';
        else pick = 't_grass_p20b_a';
      } else {
        pick = a > 0.62 ? 't_moss_p20b_b' : a < 0.4 ? 't_moss' : 't_moss_p20b_a';
      }
      cells[i] = idxOf[pick]; if (idxOf[pick]) n++;
    }
    if (names.length > 255) return null;
    return { names, cells, n, textures0: m.floorTextures ? m.floorTextures.slice() : null, cells0: m.floorCells ? m.floorCells.slice() : null };
  }
  function applyGround(m, want) {
    const P = m._p20b && m._p20b.ground; if (!P) return;
    if (want === P.applied) return;
    if (want) {
      m.floorTextures = P.names.slice();
      const fc = P.cells0 ? P.cells0.slice() : new Uint8Array(m.w * m.h);
      for (let i = 0; i < fc.length; i++) if (P.cells[i]) fc[i] = P.cells[i];
      m.floorCells = fc;
    } else {
      m.floorTextures = P.textures0 ? P.textures0.slice() : null;
      m.floorCells = P.cells0 ? P.cells0.slice() : (P.textures0 ? new Uint8Array(m.w * m.h) : null);
    }
    P.applied = want;
  }

  // ---------------------------------------------------------------- 2. the walls
  function prepareWalls(m) {
    const W = m.w, H = m.h, seed = hashStr(m.id + '|walls'), tex = new Map();   // cell index -> variant name
    // buildings and walls: a connected run of cells of one texture (8-neighbours) shares one face
    const comp = new Int32Array(W * H).fill(-1); let nComp = 0;
    const want = (c) => c && (c.tex === 't_house' || (c.tex === 't_stone' && m.outdoor));
    for (let i = 0; i < W * H; i++) {
      const c = m.cells[i]; if (!want(c) || comp[i] >= 0) continue;
      const stack = [i]; comp[i] = nComp;
      while (stack.length) {
        const j = stack.pop(), x = j % W, y = (j / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy; if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const k = yy * W + xx, cc = m.cells[k]; if (cc && cc.tex === c.tex && comp[k] < 0) { comp[k] = nComp; stack.push(k); }
        }
      }
      nComp++;
    }
    for (let i = 0; i < W * H; i++) {
      const c = m.cells[i]; if (!want(c)) continue;
      const vs = c.tex === 't_house' ? HOUSE : STONE, v = (hash2(comp[i], 7, seed) * vs.length) | 0;
      if (v) tex.set(i, vs[v]);
    }
    if (!tex.size) return null;
    return { tex, n: tex.size, applied: false };
  }
  function applyWalls(m, want) {
    const P = m._p20b && m._p20b.walls; if (!P) return;
    if (want === P.applied) return;
    for (const [i, name] of P.tex) { const c = m.cells[i]; if (!c) continue; if (want) { if (c._p20bTex0 === undefined) c._p20bTex0 = c.tex; c.tex = name; } else if (c._p20bTex0 !== undefined) c.tex = c._p20bTex0; }
    m.cells = m.cells.slice();   // a new array: R3D rebuilds the map's meshes from it
    P.applied = want;
  }

  // ---------------------------------------------------------------- 3. the trees
  // recolour a painted sprite leaf by leaf: coloured pixels (in the warm leaf range by hue when `warm`) are turned; grey
  // bark and deep shadow are left
  function recolour(sp, hueShift, satK, litK, warm) {
    const d = new Uint32Array(sp.data.length);
    for (let i = 0; i < d.length; i++) {
      const c = sp.data[i], a = (c >>> 24) & 255; if (!a) { d[i] = c; continue; }
      let r = R(c) / 255, g = Gc(c) / 255, b = B(c) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
      if (dl < (warm ? 0.08 : 0.03) || l < 0.12) { d[i] = c; continue; }   // grey bark and deep shadow stay
      let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h = (h * 60 + 360) % 360;
      if (warm && h > 75 && h < 330) { d[i] = c; continue; }      // only the warm leaf hues (red, orange, yellow) turn
      let s = l > 0.5 ? dl / (2 - mx - mn) : dl / (mx + mn);
      h = (h + hueShift + 360) % 360; s = clamp(s * satK, 0, 1); const L = clamp(l * litK, 0, 1);
      const C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m0 = L - C / 2;
      let rr = 0, gg = 0, bb = 0;
      if (h < 60) { rr = C; gg = X; } else if (h < 120) { rr = X; gg = C; } else if (h < 180) { gg = C; bb = X; } else if (h < 240) { gg = X; bb = C; } else if (h < 300) { rr = X; bb = C; } else { rr = C; bb = X; }
      d[i] = px((rr + m0) * 255, (gg + m0) * 255, (bb + m0) * 255, a);
    }
    return { w: sp.w, h: sp.h, data: d, hs: sp.hs, cx: sp.cx, dy: sp.dy };
  }
  const TREE_VARIANTS = { oak: ['oak', 'p20b_oak_green', 'p20b_oak_copper'], willow: ['willow', 'p20b_willow_pale'] };   // (the willow variant keeps its old name; it is the darker, bluer one)
  let treesReady = false;
  function ensureTrees() {
    if (treesReady || typeof Engine === 'undefined' || !Engine.sprites || !Engine.sprites.oak || !Engine.sprites.willow) return treesReady;
    try {
      Engine.addSprite('p20b_oak_green', recolour(Engine.sprites.oak, 38, 0.82, 1.02, true));     // a green-gold oak, the leaves not yet turned
      Engine.addSprite('p20b_oak_copper', recolour(Engine.sprites.oak, -14, 1.05, 0.84, true));   // a dark copper oak
      Engine.addSprite('p20b_willow_pale', recolour(Engine.sprites.willow, 40, 1.35, 0.9, false)); // a darker, bluer willow
      treesReady = true;
    } catch (e) { warnOnce('trees', e); }
    return treesReady;
  }
  function prepareTrees(m) {
    const list = [], seed = hashStr(m.id + '|trees');
    for (const e of m.entities) {
      if (!e || e.kind !== 'deco' || !TREE_VARIANTS[e.sprite] || e.transient) continue;
      const vs = TREE_VARIANTS[e.sprite], h = hash2(Math.round(e.x * 4), Math.round(e.y * 4), seed);
      list.push({ e, sprite0: e.sprite, flip0: !!e.animFlip, sprite: vs[(h * vs.length) | 0], flip: hash2(Math.round(e.y * 4), Math.round(e.x * 4), seed ^ 77) < 0.5 });
    }
    return list.length ? { list, n: list.length, applied: false } : null;
  }
  function applyTrees(m, want) {
    const P = m._p20b && m._p20b.trees; if (!P) return;
    if (want === P.applied) return;
    for (const t of P.list) { if (want) { t.e.sprite = t.sprite; t.e.animFlip = t.flip; } else { t.e.sprite = t.sprite0; t.e.animFlip = t.flip0; } }
    P.applied = want;
  }

  // ---------------------------------------------------------------- 4. the painted pieces
  // name -> file. A sprite keeps the stand-in's hs / cx / dy; a 64x64 'd_' entry replaces a decal texture.
  const PIECES = {
    p_barrel: 'img/painted20/p_barrel.png', p_cart: 'img/painted20/p_cart.png', p_grass1: 'img/painted20/p_grass1.png', p_grass2: 'img/painted20/p_grass2.png', p_reed1: 'img/painted20/p_reed1.png',
    p_crate: 'img/painted20/p_crate.png', p_statue_broken: 'img/painted20/p_statue_broken.png', p_bones_small: 'img/painted20/p_bones_small.png', p_cart_broken: 'img/painted20/p_cart_broken.png',
    d_poster1: 'img/painted20/d_poster1.png', d_synod1: 'img/painted20/d_synod1.png', d_moss1: 'img/painted20/d_moss1.png',
    p_barrel_open: 'img/painted20/p_barrel_open.png', p_barrel_side: 'img/painted20/p_barrel_side.png',
    p_statue_broken2: 'img/painted20/p_statue_broken2.png', p_statue_head: 'img/painted20/p_statue_head.png',
    p_grass3: 'img/painted20/p_grass3.png', p_reed2: 'img/painted20/p_reed2.png', d_poster2: 'img/painted20/d_poster2.png',
    d_poster3: 'img/painted20/d_poster3.png', d_synod2: 'img/painted20/d_synod2.png',
    // wall marks rendered by Blender from procedural materials (tools/art/decals/marks.py)
    d_moss2: 'img/painted20/d_moss2.png', d_moss3: 'img/painted20/d_moss3.png', d_crack1: 'img/painted20/d_crack1.png', d_crack2: 'img/painted20/d_crack2.png',
    d_scorch1: 'img/painted20/d_scorch1.png', d_scorch2: 'img/painted20/d_scorch2.png',
  };
  const pieces = {};   // name -> { data, w, h, orig }
  let piecesLoading = false;
  function loadPieces() {
    if (piecesLoading || typeof document === 'undefined' || typeof Engine === 'undefined') return; piecesLoading = true;
    for (const name in PIECES) {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
          const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0);
          const id = c.getImageData(0, 0, cv.width, cv.height), data = new Uint32Array(id.data.buffer.slice(0));
          for (let i = 0; i < data.length; i++) if (((data[i] >>> 24) & 255) <= 100) data[i] = 0; else data[i] |= 0xff000000;   // the engine's hard edge
          pieces[name] = { data, w: cv.width, h: cv.height, orig: null, applied: false }; stats.pieces++;
          syncPieces();
        } catch (e) { stats.piecesFailed++; warnOnce('piece ' + name, e); }
      };
      img.onerror = () => { stats.piecesFailed++; };
      img.src = PIECES[name] + '?v=1';
    }
  }
  function syncPieces() {
    for (const name in pieces) {
      const p = pieces[name];
      // a prop the pixel-3D set draws (js/pixel3d.js, when it is on and loaded) is left to it: the model wins over the painting
      if (typeof PIXEL3D !== 'undefined' && PIXEL3D.covers && PIXEL3D.covers(name)) continue;
      const want = on('p20_pieces'); if (p.applied === want) continue;
      try {
        if (name.startsWith('d_')) {
          if (p.w !== TEX || p.h !== TEX) continue;
          if (want) { if (!p.orig) p.orig = Engine.textures[name] || null; Engine.textures[name] = p.data; }
          else if (p.orig) Engine.textures[name] = p.orig;
        } else {
          if (want) { if (!p.orig) p.orig = Engine.sprites[name] || null; const o = p.orig || {}; Engine.addSprite(name, { w: p.w, h: p.h, data: p.data, hs: o.hs == null ? 1 : o.hs, cx: o.cx == null ? 0.5 : o.cx, dy: o.dy || 0 }); }
          else if (p.orig) Engine.sprites[name] = p.orig;
        }
        p.applied = want;
      } catch (e) { warnOnce('swap ' + name, e); }
    }
  }

  // ---------------------------------------------------------------- preparing and syncing the maps
  function prepare(m) {
    if (!m || m._p20b) return m && m._p20b;
    const P = { ground: null, walls: null, trees: null };
    try { P.ground = prepareGround(m); if (P.ground) { stats.groundMaps++; stats.groundCells += P.ground.n; } } catch (e) { warnOnce('ground ' + m.id, e); }
    try { P.walls = prepareWalls(m); if (P.walls) { stats.wallMaps++; stats.wallCells += P.walls.n; } } catch (e) { warnOnce('walls ' + m.id, e); }
    try { P.trees = prepareTrees(m); if (P.trees) stats.trees += P.trees.n; } catch (e) { warnOnce('trees ' + m.id, e); }
    m._p20b = P;
    return P;
  }
  function syncMap(m) {
    if (!m || !m._p20b) return;
    try { applyGround(m, on('p20_ground') && ensureTiles()); } catch (e) { warnOnce('apply ground', e); }
    try { applyWalls(m, on('p20_walls') && ensureTiles()); } catch (e) { warnOnce('apply walls', e); }
    try { applyTrees(m, on('p20_trees') && ensureTrees()); } catch (e) { warnOnce('apply trees', e); }
  }
  function syncAll(maps) {
    const lists = []; if (maps) for (const id in maps) lists.push(maps[id]); if (hasG() && G.maps && G.maps !== maps) for (const id in G.maps) lists.push(G.maps[id]);
    for (const m of lists) { if (!m._p20b) prepare(m); syncMap(m); }
    syncPieces();
  }

  // ---------------------------------------------------------------- wiring
  if (typeof buildAllMaps === 'function') {
    const _build = buildAllMaps;
    buildAllMaps = function () { const maps = _build.apply(this, arguments); try { syncAll(maps); } catch (e) { warnOnce('build', e); } return maps; };
  }
  if (typeof loadMap === 'function') {
    const _load = loadMap;
    loadMap = function (id, pos) { try { if (hasG() && G.maps && G.maps[id]) { if (!G.maps[id]._p20b) prepare(G.maps[id]); syncMap(G.maps[id]); } } catch (e) { warnOnce('load', e); } return _load.apply(this, arguments); };
  }
  if (hasGFX && typeof GFX.onChange === 'function') GFX.onChange(() => { try { syncAll(); } catch (e) { warnOnce('change', e); } });
  const ROWS = [
    ['p20_ground', 'Painted ground', 'grass and moss that change from cell to cell: clover, dry straw, trodden earth'],
    ['p20_walls', 'Painted walls', 'house fronts and stone courses that differ from one building to the next'],
    ['p20_trees', 'Tree variety', 'oaks in three colours and willows in two, some turned about'],
    ['p20_pieces', 'Painted pieces', 'painted barrels, carts, grass and notices in place of the drawn stand-ins'],
  ];
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('gfx-p20b-p20_ground')) return;
    for (const [key, name, hint] of ROWS) {
      const label = document.createElement('span'); label.className = 'gfx-label'; label.appendChild(document.createTextNode(name + ' '));
      const sm = document.createElement('small'); sm.className = 'muted'; sm.textContent = hint; label.appendChild(sm);
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = 'gfx-p20b-' + key; b.type = 'button'; b.setAttribute('aria-label', name);
      const sync = () => { b.textContent = GFX[key] !== false ? 'On' : 'Off'; b.setAttribute('aria-pressed', GFX[key] !== false ? 'true' : 'false'); };
      b.onclick = () => { GFX[key] = GFX[key] === false; if (typeof PRESETS !== 'undefined') GFX.preset = PRESETS.current(); GFX.changed(); sync(); };
      sync();
      grid.appendChild(label); grid.appendChild(b);
    }
  }
  if (typeof renderAccessibilityMenu === 'function') {
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendRows(); } catch (e) { warnOnce('rows', e); } return r; };
  }
  // the pieces start loading at once (small files); the tiles and tree sprites wait for the decoded assets
  try { loadPieces(); } catch (e) { warnOnce('pieces', e); }
  (function waitAssets(n) { if (ensureTiles() & ensureTrees() || n > 600) return; setTimeout(() => waitAssets(n + 1), 100); })(0);

  return {
    FLAGS, TILES, GROUND, HOUSE, STONE, TREE_VARIANTS, PIECES, ROWS, stats, budgetBytes,
    prepare, syncMap, syncAll, syncPieces, ensureTiles, ensureTrees, tilesReady: () => tilesReady, treesReady: () => treesReady,
    pieces: () => Object.keys(pieces), pieceApplied: (n) => !!(pieces[n] && pieces[n].applied), tones,
    paint: { grass: paintGrass, moss: paintMoss, house: paintHouse, stone: paintStone },
  };
})();
if (typeof window !== 'undefined') window.PAINTED20 = PAINTED20;
