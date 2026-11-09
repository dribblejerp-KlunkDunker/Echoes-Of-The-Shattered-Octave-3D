// ============================================================
//  skies14 — Phase 14 (a world that shows the story): three pieces of sky and water.
//
//  1. OCTAVE LIGHTS (switch "Octave lights", GFX.aurora). Thin translucent ribbons of muted colour high in the night sky,
//     one hue per Anchor note (Growth, Heat, Mass, Time, Light, Velocity, Memory, Decay) blending along each ribbon, folding
//     and drifting slowly, with a soft bright lower fringe, vertical rays and a long fade upward. Never below about a third of
//     the way up the sky and only on true sky pixels, so the hills and skyline are never covered.
//     [PROPOSED] meaning: the province's Signatures made visible when the Relay is strained; nobody in the Reach has a
//     word for it, and the hunters say not to look at it for long. A sky hook (order 12, after the moon at 5 and the
//     stars at 10, before the panorama at 20, so ridges and trees stand in front); it only adds light to sky pixels and
//     gives way to anything bright already there (cloud, moon glow), so it sits behind them.
//     table: which nights (a night belongs to the day on whose evening it starts; tod >= 0.5 is that evening, tod < 0.5
//     the small hours of the next morning, so the night of day N runs from dusk of N to dawn of N+1)
//       rite       the night of day 9, before the Rite (Hearthday the sixteenth of Harvestmonth is day 10); only while
//                  the Rite has not begun (no rite_started, no greening)             notes Growth, Light, Mass   strong
//       greening   the first night after the Greening (day recorded in p14s_g)    notes Growth, Decay, Memory strong
//       grove      the first night in Whisper-Grove (Part Three; p14s_w)           notes Memory, Light, Decay  strong
//                  (the same night the Drowned Lanterns are set, js/festivals12.js)
//       woods      the first night in the Deep Woods (Part Four; p14s_d)           notes Growth, Decay, Time   strong
//       rare       about one night in ten, by G.day alone (a seeded hash, no saved state)   two notes by hash  faint
//     Outdoor maps only, night only; cloud, haze and flashes thin it. No flashes (GFX.noFlash) = a static gradient (no
//     drift, no shimmer). Reduce motion (GFX.reduceMotion) = the same curtains moving about a tenth as fast.
//
//  2. THE KESTREL FLIGHT (switch "Kestrel flight scene", GFX.kestrelScene). When Part Three begins (startPart3, the
//     Part Two ending's "Begin Part Three" button), the original runs untouched (map, position, time, flags, the
//     Part Three event all as before) and a short painted scene is laid over the top for at most 19 s: the Kestrel's
//     rail, clouds in layers moving past, the Reach orchards below, then the Hedge, then the Spectral Woods, wind in the
//     rigging, four lines of narration. Any key, click, tap or controller A skips it (a Skip button too). It fades out
//     onto Whisper-Grove and the Part Three event. Plays once (p14s_k). Reduce motion = one still painting, all four
//     lines written out, held for 7 s. It never blocks: a timer ends it even if no frame is delivered, and it ends
//     itself if the map is no longer Whisper-Grove. Nothing it does touches the game state except the p14s_ flags.
//
//  3. WATER LIGHT (switch "Water light", GFX.causticLight). A web of caustic light drifting over the flooded floor of
//     the Sunken Court (every water or shallows pixel on Whisper-Grove) and up the lowest half-unit of the walls that
//     stand in it. A post hook (order 26, after the reflections at 25); depth-aware (world coordinates from the depth
//     buffer, fading with distance), subtle. No flashes = a static pattern; Reduce motion = slow.
//
//  Per-frame effects (1 and 3) are off in Low (LOW_OFF in js/presets.js) and in the Original preset (all three are in
//  GFX.FX). Own PRNG only: nothing here draws from Math.random.
//  Saved state (G.flags, small integers): p14s_g (greening night + 2), p14s_w (grove night + 2), p14s_d (woods night + 2),
//  p14s_k (the scene has played).
//  Procedural stand-in: every picture is drawn with canvas or framebuffer pixels here.
// ============================================================
'use strict';
/* eslint-disable no-func-assign */

for (const k of ['aurora', 'kestrelScene', 'causticLight']) {
  if (GFX[k] === undefined) GFX[k] = true;
  if (!GFX.FX.includes(k)) GFX.FX.push(k);
}

const SKIES14 = (() => {
  const KEY = 'octave.skies14.v1';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (e0, e1, v) => { const k = clamp((v - e0) / (e1 - e0), 0, 1); return k * k * (3 - 2 * k); };
  const set = { aurora: true, scene: true, caustics: true };
  const gflag = (k) => !!(typeof GFX !== 'undefined' && GFX[k] !== false);
  const auroraOn = () => set.aurora && gflag('aurora');
  const sceneOn = () => set.scene && gflag('kestrelScene');
  const causticsOn = () => set.caustics && gflag('causticLight');

  function save() { try { localStorage.setItem(KEY, JSON.stringify({ a: set.aurora ? 1 : 0, s: set.scene ? 1 : 0, c: set.caustics ? 1 : 0 })); } catch (e) { /* no storage: fine */ } }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o || typeof o !== 'object') return;
      set.aurora = o.a !== 0; set.scene = o.s !== 0; set.caustics = o.c !== 0;
    } catch (e) { /* ignore */ }
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash01(n, salt) { const r = mulberry((Math.imul(n | 0, 2654435761) ^ Math.imul(salt | 0, 40503)) >>> 0); r(); return r(); }

  // ---- saved flags: small validated integers --------------------------------------------------------------------
  const hasG = () => typeof G !== 'undefined' && !!G && !!G.flags;
  const FLAGS = { p14s_g: [0, 100000], p14s_w: [0, 100000], p14s_d: [0, 100000], p14s_k: [0, 1] };
  function fint(k) { const r = FLAGS[k]; const v = hasG() ? Math.floor(+G.flags[k]) : 0; return v >= r[0] && v <= r[1] ? v : 0; }
  function fset(k, v) { if (hasG()) G.flags[k] = clamp(v | 0, FLAGS[k][0], FLAGS[k][1]); }
  // the night an event at (day, tod) belongs to: its evening's day
  const nightKey = (day, tod) => (tod >= 0.5 ? day : day - 1);
  // the first night at or after (day, tod): a daytime moment belongs to tonight, a small-hours moment to the night in progress
  const firstNight = (day, tod) => (tod < 0.22 ? day - 1 : day);

  // ============================================================
  //  1. OCTAVE LIGHTS
  // ============================================================
  // The eight Anchor notes in the Octave's order, each a muted hue (peak colour before the amplitude is applied).
  const NOTES = [
    { name: 'Growth', hz: 174, rgb: [74, 156, 98] },
    { name: 'Heat', hz: 285, rgb: [180, 96, 62] },
    { name: 'Mass', hz: 396, rgb: [118, 128, 150] },
    { name: 'Time', hz: 417, rgb: [186, 158, 86] },
    { name: 'Light', hz: 528, rgb: [108, 196, 206] },
    { name: 'Velocity', hz: 639, rgb: [100, 154, 206] },
    { name: 'Memory', hz: 741, rgb: [154, 112, 200] },
    { name: 'Decay', hz: 852, rgb: [124, 114, 134] },
  ];
  const AMP_STORY = 0.52, AMP_RARE = 0.24, RARE_P = 0.1, RITE_EVE = 9;
  const KINDS = {
    rite: { notes: [0, 4, 2], amp: AMP_STORY },
    greening: { notes: [0, 7, 6], amp: AMP_STORY },
    grove: { notes: [6, 4, 7], amp: AMP_STORY },
    woods: { notes: [0, 7, 3], amp: AMP_STORY },
  };
  // which night is it, and what does the sky do: { kind, notes, amp, night } or null. Pure: tests call it with their own flags.
  function auroraPlan(day, tod, f, gv) {
    day = day | 0; f = f || {}; gv = gv || fint;
    const N = nightKey(day, +tod || 0);
    let kind = null;
    if (N === RITE_EVE && !f.rite_started && !f.greening && !f.part3) kind = 'rite';
    else if (f.greening) { const g = gv('p14s_g'); if (g && N === g - 2) kind = 'greening'; }
    if (!kind && f.part3) { const w = gv('p14s_w'); if (w && N === w - 2) kind = 'grove'; }
    if (!kind && f.part4) { const d = gv('p14s_d'); if (d && N === d - 2) kind = 'woods'; }
    if (kind) return { kind, notes: KINDS[kind].notes.slice(), amp: KINDS[kind].amp, night: N };
    if (hash01(N, 0xA7) < RARE_P) {
      const a = (hash01(N, 0xB1) * 8) | 0; let b = (hash01(N, 0xB2) * 7) | 0; if (b >= a) b++;
      return { kind: 'rare', notes: [a, b], amp: AMP_RARE, night: N };
    }
    return null;
  }

  // The vertical profile of a ribbon across s = (height - lower edge) / thickness: a soft bright fringe below the edge
  // (a gaussian, no hard line) and a long fade upward. Tabulated once over s = -1.2 .. 3.
  const PROF_N = 256, PROF_LO = -1.2, PROF_HI = 3, PROF = new Float32Array(PROF_N + 1);
  for (let i = 0; i <= PROF_N; i++) { const q = PROF_LO + (PROF_HI - PROF_LO) * i / PROF_N; PROF[i] = q < 0 ? Math.exp(-Math.pow(q * 3.1, 2)) : Math.exp(-q * 1.7) * (1 - 0.25 * Math.min(1, q)); }
  const PROF_K = PROF_N / (PROF_HI - PROF_LO);
  // 4x4 ordered dither for the alpha, so the soft gradients do not band
  const BAYER = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5));
  // the aurora lives high: its lowest part sits at this fraction of the sky above the horizon, and it is faded out below FLOOR
  const FLOOR_LO = 0.36, FLOOR_HI = 0.5;
  const AUR = { ang: new Float32Array(0), key: '', curt: [], stats: { px: 0, kind: null, amp: 0, ms: 0, lowest: 1 } };
  // ribbons: long horizontal bands that fold along their length; colour blends from one note to the next along the ribbon.
  // Fixed per (night, kind) so the sky does not jump when the plan is re-read. Integer frequencies, so the sky wraps cleanly.
  function curtainsFor(plan) {
    const out = [], n = plan.notes.length;
    for (let j = 0; j < n; j++) {
      const s = plan.night * 7 + j * 13 + 3;
      out.push({
        c1: NOTES[plan.notes[j]].rgb, c2: NOTES[plan.notes[(j + 1) % n]].rgb,
        ph: hash01(s, 1) * TAU, base: 0.46 + 0.07 * j + 0.06 * hash01(s, 2), ext: 0.19 + 0.09 * hash01(s, 3),
        f1: 1 + ((hash01(s, 4) * 2) | 0), f2: 3 + ((hash01(s, 5) * 3) | 0), sp: 0.5 + hash01(s, 6) * 0.8, dir: hash01(s, 7) < 0.5 ? -1 : 1,
        mix: 1 + ((hash01(s, 8) * 2) | 0),
      });
    }
    return out;
  }
  function recordNights(F) {
    // the first sighting of a story state fixes its night; flags only ever grow from 0
    if (!hasG()) return;
    const f = G.flags;
    if (f.greening && !fint('p14s_g')) fset('p14s_g', firstNight(G.day, F.tod) + 2);
    if (f.part3 && G.mapId === 'whispergrove' && !fint('p14s_w')) fset('p14s_w', firstNight(G.day, F.tod) + 2);
    if (f.part4 && G.mapId === 'deepwoods' && !fint('p14s_d')) fset('p14s_d', firstNight(G.day, F.tod) + 2);
  }
  function auroraHook(F) {
    AUR.stats.px = 0; AUR.stats.kind = null; AUR.stats.amp = 0;
    if (!auroraOn() || !hasG()) return;
    try { recordNights(F); } catch (e) { /* cosmetic */ }
    if (!F.outdoor) return;
    const night = clamp((0.5 - F.skyDay) / 0.45, 0, 1); if (night < 0.04) return;
    const plan = auroraPlan(G.day, F.tod, G.flags); if (!plan) return;
    const wx = F.wx, thin = clamp(1 - wx.cloud * 1.25, 0, 1) * clamp(1 - wx.haze * 2.6, 0, 1) * (1 - wx.flash);
    const vis = plan.amp * night * thin; if (vis < 0.012) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const key = plan.kind + ':' + plan.night;
    if (AUR.key !== key) { AUR.key = key; AUR.curt = curtainsFor(plan); }
    const { fb, mbuf, w, horizon, dirX, dirY, planeX, planeY } = F;
    if (horizon < 4) return;
    const still = !!GFX.noFlash, T = still ? 0 : F.animT * (GFX.reduceMotion ? 0.1 : 1);
    if (AUR.ang.length !== w) AUR.ang = new Float32Array(w);
    for (let x = 0; x < w; x++) { const cx = 2 * x / w - 1; AUR.ang[x] = Math.atan2(dirY + planeY * cx, dirX + planeX * cx); }
    const H = horizon, curt = AUR.curt;
    let n = 0, lowest = 1;
    for (let j = 0; j < curt.length; j++) {
      const C = curt[j];
      for (let x = 0; x < w; x++) {
        const th = AUR.ang[x];
        // the fold: the lower edge rides a sum of slow waves along the ribbon, thickness breathes with another
        const e = C.base + 0.07 * Math.sin(th * C.f1 + C.ph + T * 0.045 * C.sp * C.dir) + 0.035 * Math.sin(th * C.f2 - T * 0.07 * C.sp + C.ph * 1.3) + 0.012 * Math.sin(th * 11 + T * 0.1 * C.sp);
        const ext = C.ext * (0.85 + 0.3 * Math.sin(th * 4 + C.ph * 2 - T * 0.05));
        // how much of the ribbon is lit here: it thins to nothing at the ends of its run and travels along it
        const run = 0.5 + 0.5 * Math.sin(th * (C.f1 + 1) + C.ph * 0.7 - T * 0.03 * C.dir), wave = 0.55 + 0.45 * Math.sin(th * 3 - T * 0.2 * C.sp * C.dir + C.ph);
        const gate = run * run * (3 - 2 * run) * wave; if (gate < 0.03) continue;
        // vertical rays: slow striations that grow with height, shimmering a little
        const ray = 0.5 + 0.5 * Math.sin(th * 58 + C.ph + T * 0.11 * C.sp), ray2 = 0.5 + 0.5 * Math.sin(th * 127 - T * 0.07 + j);
        const shim = still ? 0 : 0.09 * Math.sin(T * 0.8 + th * 17 + C.ph);
        const m = 0.5 + 0.5 * Math.sin(th * C.mix + C.ph);         // colour along the ribbon
        const cr = lerp(C.c1[0], C.c2[0], m), cg = lerp(C.c1[1], C.c2[1], m), cb = lerp(C.c1[2], C.c2[2], m);
        // the ribbon spans heights e - 1.2 ext .. e + 3 ext (fractions of the sky above the horizon)
        const yb = (H - (e + PROF_LO * ext) * H) | 0, yt = Math.max(0, (H - (e + PROF_HI * ext) * H) | 0);
        for (let y = yt; y <= yb && y < H; y++) {
          const el = (H - y) / H;
          // never low in the sky: fade out between FLOOR_LO and FLOOR_HI of the way up
          const fl = el <= FLOOR_LO ? 0 : el >= FLOOR_HI ? 1 : (el - FLOOR_LO) / (FLOOR_HI - FLOOR_LO);
          if (fl <= 0) continue;
          const sIdx = ((el - e) / ext - PROF_LO) * PROF_K; if (sIdx < 0 || sIdx > PROF_N) continue;
          const sq = (el - e) / ext, prof = PROF[sIdx | 0];
          const rays = 1 + (sq > 0 ? (ray * 0.55 + ray2 * 0.2 - 0.375) * Math.min(1, sq * 1.4) : 0) * 1.1;
          let a = vis * gate * prof * rays * (1 + shim) * (fl * fl * (3 - 2 * fl));
          a += BAYER[(x & 3) + ((y & 3) << 2)] * 0.012 * (a > 0.02 ? 1 : 0);
          if (a < 0.01) continue;
          const o = y * w + x; if (mbuf[o] !== 1) continue;           // true sky only: terrain, walls and anything near stay as drawn
          const px = fb[o], pr = px & 255, pg = (px >> 8) & 255, pb = (px >> 16) & 255;
          // cloud and moon glow are brighter than the dark sky: the light yields to them, so it sits behind
          const lum = (pr + pg + pb) / 3, allow = clamp(1 - (lum - 30) / 110, 0, 1);
          const k = a * allow; if (k < 0.008) continue;
          const r = pr + cr * k, g = pg + cg * k, b = pb + cb * k;
          fb[o] = (255 << 24) | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
          n++; if (el < lowest) lowest = el;
        }
      }
    }
    AUR.stats.lowest = lowest;
    AUR.stats.px = n; AUR.stats.kind = plan.kind; AUR.stats.amp = vis;
    AUR.stats.ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  }

  // ============================================================
  //  3. WATER LIGHT (caustics)
  // ============================================================
  const CAUSTIC_MAPS = { whispergrove: true };   // the Sunken Court; the table is the place to add any other lit flooded map
  const TN = 128, TMASK = TN - 1;
  const AMP_WATER = 62, WALL_REACH = 0.5, FADE_DIST = 14, BIAS = 0.45;
  const CST = { stats: { px: 0, wallPx: 0, ms: 0 }, tex: null };
  // a tileable web of thin bright lines where three warped sine bands cancel; built once
  (function buildCaustics() {
    const tex = new Uint8Array(TN * TN);
    for (let y = 0; y < TN; y++) for (let x = 0; x < TN; x++) {
      const u = x / TN * TAU, v = y / TN * TAU;
      const a = Math.sin(3 * u + 1.7 * Math.sin(2 * v + 0.5)) + Math.sin(3 * v + 1.7 * Math.sin(2 * u)) + Math.sin(2 * u + 2 * v + 1.2 * Math.sin(u - v));
      const c = Math.max(0, 1 - Math.abs(a) * 0.85);
      tex[y * TN + x] = Math.round(c * c * 255);
    }
    CST.tex = tex;
  })();
  function causticsHook(F) {
    CST.stats.px = 0; CST.stats.wallPx = 0;
    if (!causticsOn()) return;
    const map = F.map; if (!map || !CAUSTIC_MAPS[map.id]) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const { fb, mbuf, dbuf, w, h, horizon, dirX, dirY, planeX, planeY, cam } = F;
    const tex = CST.tex, still = !!GFX.noFlash, T = still ? 0 : F.animT * (GFX.reduceMotion ? 0.16 : 1);
    const K1 = TN / 3.4, K2 = TN / 2.3;            // texels per world unit: two webs of different size
    const a1x = T * 7, a1y = T * 4.5, a2x = -T * 6, a2y = T * 8;
    const amp = AMP_WATER * (0.75 + 0.25 * (1 - F.skyDay));
    const invFog = 1 / Math.min(FADE_DIST, (F.fogDist || 20));
    const y0 = horizon < 1 ? 1 : horizon;
    let px = 0, wallPx = 0;
    for (let x = 0; x < w; x++) {
      const u = 2 * x / w - 1, rx = dirX + planeX * u, ry = dirY + planeY * u;
      for (let y = y0; y < h; y++) {
        const o = y * w + x, m = mbuf[o];
        if (m !== 2 && m !== 3) continue;
        const dp = dbuf[o] - BIAS; if (dp <= 0.2) continue;
        const fade = 1 - dp * invFog; if (fade <= 0.02) continue;
        const wx = cam.x + dp * rx, wy = cam.y + dp * ry;
        const v1 = tex[(((wy * K1 + a1y) | 0) & TMASK) * TN + (((wx * K1 + a1x) | 0) & TMASK)];
        const v2 = tex[(((wy * K2 + a2y) | 0) & TMASK) * TN + (((wx * K2 + a2x) | 0) & TMASK)];
        const c = (v1 + v2 + Math.sqrt(v1 * v2) * 1.4) * (0.3 / 255) * fade * (m === 2 ? 1 : 0.85);
        if (c >= 0.02) {
          const e = c * amp, p = fb[o];
          const R = (p & 255) + e * 0.55, Gc = ((p >> 8) & 255) + e * 0.95, B = ((p >> 16) & 255) + e;
          fb[o] = (255 << 24) | ((B > 255 ? 255 : B) << 16) | ((Gc > 255 ? 255 : Gc) << 8) | (R > 255 ? 255 : R);
          px++;
        }
        // water starts right under a wall: the wall's lowest stretch takes the same light, fading upward
        if (mbuf[o - w] === 4) {
          const yw = y - 1, d = dbuf[yw * w + x];
          if (d > 0.3) {
            const L = clamp(Math.floor(WALL_REACH * h / d), 2, (h / 3) | 0), wxw = cam.x + d * rx, wyw = cam.y + d * ry;
            for (let k = 0; k < L; k++) {
              const yy = yw - k; if (yy < 0) break;
              const oo = yy * w + x; if (mbuf[oo] !== 4) break;
              const z = (k + 0.5) * d / h, zf = 1 - z / WALL_REACH; if (zf <= 0) break;
              const s1 = (wxw * 0.7 + wyw * 0.7) * K1 + z * K1 * 0.55, s2 = (wxw * 0.7 - wyw * 0.7) * K2 + z * K2 * 0.9;
              const w1 = tex[(((z * K1 + a1y * 0.6 + 40) | 0) & TMASK) * TN + (((s1 + a1x) | 0) & TMASK)];
              const w2 = tex[(((z * K2 + a2y * 0.6) | 0) & TMASK) * TN + (((s2 + a2x) | 0) & TMASK)];
              const cw = (w1 + w2 + Math.sqrt(w1 * w2) * 1.4) * (0.3 / 255) * zf * zf * fade * 0.9;
              if (cw < 0.02) continue;
              const ew = cw * amp, pw = fb[oo];
              const R2 = (pw & 255) + ew * 0.55, G2 = ((pw >> 8) & 255) + ew * 0.95, B2 = ((pw >> 16) & 255) + ew;
              fb[oo] = (255 << 24) | ((B2 > 255 ? 255 : B2) << 16) | ((G2 > 255 ? 255 : G2) << 8) | (R2 > 255 ? 255 : R2);
              wallPx++;
            }
          }
        }
      }
    }
    CST.stats.px = px; CST.stats.wallPx = wallPx;
    CST.stats.ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  }

  if (typeof Engine !== 'undefined') {
    if (Engine.addSkyHook) Engine.addSkyHook(auroraHook, 12);
    if (Engine.addPostHook) Engine.addPostHook(causticsHook, 26);
  }

  // ============================================================
  //  2. THE KESTREL FLIGHT
  // ============================================================
  const DUR = 18.5;                 // seconds of painting; with the fade out the whole scene stays under 20
  const STILL_HOLD = 7, SKIP_GRACE = 150, HARD_STOP = 22000, FADE_OUT = 1.2;
  const CW = 480, CH = 300;
  // [PROPOSED] four lines, Book One canon only: Lyra has no voice after the Root (she writes on a slate), Kaelen listens
  // through the glass, Vane sets the course. Times are in seconds from the start.
  const LINES = [
    { t0: 0.9, t1: 5.6, text: 'Under the keel the orchards of the Reach go by in their rows, greener than any autumn has a right to be.' },
    { t0: 5.8, t1: 9.6, text: 'Lyra holds her slate up against the wind: THE HEDGE. It passes under you, a dark seam three men deep in thorn, and nothing in it sings.' },
    { t0: 9.8, t1: 13.8, text: 'Kaelen keeps his glass hand flat on the rail. Under the lift-tanks the whole ship hums one note, and holds it.' },
    { t0: 14.0, t1: 18.2, text: '"Spectral Woods," says Vane, not turning round. "Whisper-Grove is under that, with its feet in the water. Mind your voices."' },
  ];
  const LINE_FADE = 0.7;
  const BIOME_T = { hedge: 4.8, woods: 7.2 };   // a tile's biome is fixed by the moment it comes into view on the right

  // sky keyframes at scene seconds: zenith, horizon, lit cloud, shaded cloud
  const SKYK = [
    { t: 0, top: [96, 150, 196], hor: [244, 214, 150], lit: [255, 246, 226], shade: [190, 176, 172] },
    { t: 7, top: [112, 130, 184], hor: [248, 176, 120], lit: [255, 214, 176], shade: [176, 140, 150] },
    { t: 13, top: [70, 62, 120], hor: [214, 150, 176], lit: [236, 186, 200], shade: [128, 104, 150] },
    { t: 18.5, top: [44, 40, 92], hor: [170, 130, 190], lit: [200, 170, 214], shade: [96, 86, 140] },
  ];
  function skyAt(T) {
    let i = 0; while (i < SKYK.length - 2 && T > SKYK[i + 1].t) i++;
    const a = SKYK[i], b = SKYK[i + 1], k = clamp((T - a.t) / (b.t - a.t), 0, 1);
    const mix = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
    return { top: mix(a.top, b.top), hor: mix(a.hor, b.hor), lit: mix(a.lit, b.lit), shade: mix(a.shade, b.shade) };
  }
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')';
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  // ground bands, far to near: top and bottom as fractions of the canvas height, scroll speed in px/s, tile spacing, crown size
  const BANDS = [
    { y0: 0.5, y1: 0.585, v: 13, sp: 9, r: 4.5, haze: 0.62, a: 1 },
    { y0: 0.55, y1: 0.68, v: 36, sp: 17, r: 8.5, haze: 0.4, a: 1 },
    { y0: 0.63, y1: 0.82, v: 92, sp: 34, r: 17, haze: 0.2, a: 1 },
    { y0: 0.78, y1: 1.02, v: 205, sp: 74, r: 38, haze: 0.05, a: 0.78 },
  ];
  // cloud layers: speed, count, vertical range, blob size, opacity; the last two pass in front of the ground
  const CLOUDS = [
    { v: 5, n: 7, y0: 0.08, y1: 0.42, s: 22, a: 0.55 },
    { v: 20, n: 6, y0: 0.05, y1: 0.46, s: 34, a: 0.62 },
    { v: 66, n: 5, y0: 0.1, y1: 0.7, s: 52, a: 0.42 },
    { v: 235, n: 3, y0: 0.35, y1: 0.95, s: 96, a: 0.2 },
  ];
  function biomeOf(Te) { return Te < BIOME_T.hedge ? 0 : Te < BIOME_T.woods ? 1 : 2; }   // 0 orchard, 1 hedge, 2 woods

  const SC = { hold: false, A: null, blobs: null, tintT: -9, cloudDefs: null, lastPlay: null, played: 0, skipped: 0 };
  function buildClouds() {
    const r = mulberry(0x4B5E57), defs = [];
    for (const L of CLOUDS) {
      const arr = [], P = CW + 2 * L.s * 2.5;
      for (let i = 0; i < L.n; i++) {
        const blobs = [], nb = 4 + ((r() * 4) | 0);
        for (let b = 0; b < nb; b++) blobs.push({ dx: (b - nb / 2) * L.s * (0.5 + r() * 0.35), dy: (r() - 0.5) * L.s * 0.32, r: L.s * (0.55 + r() * 0.6) });
        arr.push({ a: i * P / L.n + r() * P * 0.4, y: lerp(L.y0, L.y1, r()) * CH, blobs });
      }
      defs.push({ L, arr, P });
    }
    return defs;
  }
  function blobSprite(c, a) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgb(c, a)); g.addColorStop(0.55, rgb(c, a * 0.5)); g.addColorStop(1, rgb(c, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return cv;
  }
  const tile = (i, salt) => hash01(i * 31 + salt * 977, 0x51);   // a tile's own dice, the same every frame

  function paintGround(ctx, T, sky, rm) {
    const haze = sky.hor, dusk = clamp(T / DUR, 0, 1);
    for (let bi = 0; bi < BANDS.length; bi++) {
      const B = BANDS[bi], v = B.v, yT = B.y0 * CH, yB = B.y1 * CH, hh = yB - yT, scroll = v * T;
      const i0 = Math.floor(scroll / B.sp) - 2, i1 = Math.ceil((scroll + CW + B.r * 3) / B.sp) + 2;
      // the ground itself, in 12 px chunks whose biome is fixed by their entry time
      ctx.globalAlpha = B.a;
      for (let cx = -12; cx < CW + 12; cx += 12) {
        const a = scroll + cx, Te = (a - CW) / v, bm = biomeOf(Te);
        const base = bm === 0 ? [92, 140, 72] : bm === 1 ? [40, 50, 40] : [112, 100, 140];
        const c = mixc(mixc(base, haze, B.haze), [30, 24, 56], dusk * 0.45);
        ctx.fillStyle = rgb(c); ctx.fillRect(cx, yT, 13, hh + 1);
      }
      // features, each at its own vertical place in the band
      for (let i = i0; i <= i1; i++) {
        const a = i * B.sp, x = a - scroll, Te = (a - CW) / v, bm = biomeOf(Te);
        const dy = tile(i, bi), y = yT + hh * (0.3 + 0.7 * dy), rr = B.r * (0.75 + 0.5 * tile(i, bi + 9));
        const hz = B.haze, sh = 1 - dusk * 0.5;
        if (bm === 0) {
          // orchard: round crowns in rows, a few of them the bright new green of a season that is wrong
          if (tile(i, bi + 21) < 0.12) continue;
          const fresh = tile(i, bi + 4) < 0.45;
          const base = fresh ? [128, 188, 84] : [66, 122, 62];
          const c = mixc(mixc(base, haze, hz), [34, 28, 62], dusk * 0.5);
          ctx.fillStyle = rgb(mixc([36, 52, 34], haze, hz), 0.5 * B.a); ctx.fillRect(x - rr * 0.1, y + rr * 0.25, rr * 1.2, Math.max(1, rr * 0.18));
          ctx.fillStyle = rgb(c, B.a); ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
          ctx.fillStyle = rgb(mixc(c, [220, 230, 150], 0.35 * sh), 0.7 * B.a); ctx.beginPath(); ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.5, 0, TAU); ctx.fill();
        } else if (bm === 1) {
          // the Hedge: a dark wall of thorn with a ragged top
          const hgt = rr * (1.4 + 1.2 * tile(i, bi + 5)), c = mixc(mixc([20, 28, 24], haze, hz * 0.6), [18, 16, 36], dusk * 0.4);
          const top = yT + hh * 0.55 - hgt;
          ctx.fillStyle = rgb(c, B.a); ctx.fillRect(x - B.sp * 0.6, top, B.sp * 1.3, hgt + hh * 0.5);
          ctx.beginPath(); ctx.moveTo(x - B.sp * 0.6, top);
          for (let k = 0; k < 4; k++) { ctx.lineTo(x - B.sp * 0.6 + (k + 0.5) * B.sp * 0.325, top - rr * (0.3 + 0.5 * tile(i, k + 40))); ctx.lineTo(x - B.sp * 0.6 + (k + 1) * B.sp * 0.325, top); }
          ctx.closePath(); ctx.fill();
        } else {
          // the Spectral Woods: silver willows, drooping fronds, now and then a lit pool
          if (tile(i, bi + 21) < 0.2) { ctx.fillStyle = rgb(mixc([120, 220, 220], haze, hz * 0.5), 0.45 * B.a); ctx.beginPath(); ctx.ellipse(x, y + rr * 0.3, rr * 1.4, rr * 0.3, 0, 0, TAU); ctx.fill(); continue; }
          const c = mixc(mixc(tile(i, bi + 6) < 0.5 ? [150, 168, 176] : [122, 108, 158], haze, hz), [40, 34, 80], dusk * 0.5);
          ctx.fillStyle = rgb(c, B.a); ctx.beginPath(); ctx.ellipse(x, y - rr * 0.3, rr * 1.05, rr * 0.8, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgb(mixc(c, [220, 230, 240], 0.25), 0.7 * B.a); ctx.lineWidth = Math.max(1, rr * 0.07);
          const sw = rm ? 0 : Math.sin(T * 1.1 + i) * rr * 0.06;
          for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * rr * 0.4, y - rr * 0.1); ctx.lineTo(x + k * rr * 0.46 + sw, y + rr * 0.85); ctx.stroke(); }
        }
      }
    }
    ctx.globalAlpha = 1;
    // lilac mist lying on the woods as the light goes
    const mist = smooth(7, 14, T) * 0.4;
    if (mist > 0.01) { const g = ctx.createLinearGradient(0, CH * 0.5, 0, CH * 0.9); g.addColorStop(0, rgb([190, 160, 220], mist)); g.addColorStop(1, rgb([190, 160, 220], 0)); ctx.fillStyle = g; ctx.fillRect(0, CH * 0.5, CW, CH * 0.4); }
  }

  function paintClouds(ctx, T, sky, front) {
    if (!SC.cloudDefs) SC.cloudDefs = buildClouds();
    if (Math.abs(SC.tintT - T) > 0.25 || !SC.blobs) { SC.blobs = { lit: blobSprite(sky.lit, 0.85), shade: blobSprite(sky.shade, 0.7) }; SC.tintT = T; }
    for (let li = 0; li < SC.cloudDefs.length; li++) {
      const D = SC.cloudDefs[li], L = D.L;
      if ((li >= 2) !== front) continue;
      for (const C of D.arr) {
        const x = ((C.a - L.v * T) % D.P + D.P) % D.P - L.s * 2.5;
        ctx.globalAlpha = L.a;
        for (const b of C.blobs) ctx.drawImage(SC.blobs.shade, x + b.dx - b.r, C.y + b.dy + b.r * 0.22 - b.r, b.r * 2, b.r * 2);
        for (const b of C.blobs) ctx.drawImage(SC.blobs.lit, x + b.dx - b.r * 0.9, C.y + b.dy - b.r * 0.2 - b.r * 0.9, b.r * 1.8, b.r * 1.8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function paintRail(ctx, T, rm) {
    const bob = rm ? 0 : Math.sin(T * 1.25) * 2.2, sway = rm ? 0 : Math.sin(T * 0.8) * 0.6;
    ctx.save(); ctx.translate(0, bob);
    const dk = clamp(T / DUR, 0, 1), shade = (c) => mixc(c, [20, 14, 36], dk * 0.45 + 0.1);
    // the deck, planks running away
    ctx.fillStyle = rgb(shade([84, 58, 38])); ctx.fillRect(0, CH * 0.9, CW, CH * 0.2);
    ctx.strokeStyle = rgb(shade([46, 30, 20]), 0.8); ctx.lineWidth = 1;
    for (let k = 0; k < 9; k++) { const x = k * CW / 8; ctx.beginPath(); ctx.moveTo(CW / 2 + (x - CW / 2) * 0.55, CH * 0.9); ctx.lineTo(x * 1.0 - (CW / 2 - x) * 0.25, CH + 4); ctx.stroke(); }
    // the rail: a bronze bar and posts
    ctx.fillStyle = rgb(shade([170, 124, 64])); ctx.fillRect(-4, CH * 0.8, CW + 8, 6);
    ctx.fillStyle = rgb(shade([230, 190, 118]), 0.6); ctx.fillRect(-4, CH * 0.8, CW + 8, 1.5);
    for (let k = 0; k < 8; k++) { const x = 30 + k * 66; ctx.fillStyle = rgb(shade([128, 92, 48])); ctx.fillRect(x, CH * 0.8 + 5, 6, CH * 0.11); ctx.fillStyle = rgb(shade([200, 150, 84]), 0.5); ctx.fillRect(x, CH * 0.8 + 5, 1.5, CH * 0.11); }
    // a rope sagging between two posts
    ctx.strokeStyle = rgb(shade([186, 160, 110]), 0.9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(33, CH * 0.8 + 12); ctx.quadraticCurveTo(100, CH * 0.8 + 38 + sway * 4, 165, CH * 0.8 + 12); ctx.stroke();
    // the stern lamp, swinging a little, the only warm thing left as the light goes
    const lx = CW - 70 + sway * 6, ly = CH * 0.8 - 40;
    ctx.strokeStyle = rgb(shade([90, 70, 50])); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CW - 70, CH * 0.8 - 80); ctx.lineTo(lx, ly); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, ly + 6, 1, lx, ly + 6, 38), ga = 0.3 + 0.5 * smooth(5, 15, T);
    glow.addColorStop(0, rgb([255, 214, 140], ga)); glow.addColorStop(1, rgb([255, 190, 100], 0));
    ctx.fillStyle = glow; ctx.fillRect(lx - 40, ly - 34, 80, 80);
    ctx.fillStyle = rgb([255, 226, 160]); ctx.fillRect(lx - 3, ly, 6, 9);
    ctx.restore();
  }

  function paintScene(ctx, T, rm) {
    const sky = skyAt(T);
    const g = ctx.createLinearGradient(0, 0, 0, CH * 0.56);
    g.addColorStop(0, rgb(sky.top)); g.addColorStop(1, rgb(sky.hor));
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
    // a low sun going down behind the far hills
    const sa = 0.55 * (1 - smooth(8, 15, T)); if (sa > 0.01) { const sg = ctx.createRadialGradient(CW * 0.22, CH * 0.52, 2, CW * 0.22, CH * 0.52, 90); sg.addColorStop(0, rgb([255, 236, 190], sa)); sg.addColorStop(1, rgb([255, 200, 140], 0)); ctx.fillStyle = sg; ctx.fillRect(0, 0, CW, CH * 0.6); }
    // first stars once the dark comes
    const sta = smooth(13, 18, T); if (sta > 0.02) { const r = mulberry(77); ctx.fillStyle = rgb([240, 240, 255], 0.7 * sta); for (let i = 0; i < 30; i++) ctx.fillRect(r() * CW, r() * CH * 0.3, 1.4, 1.4); }
    paintClouds(ctx, T, sky, false);
    paintGround(ctx, T, sky, rm);
    paintClouds(ctx, T, sky, true);
    // wind streaks: fast pale hairlines (not drawn in a still painting)
    if (!rm) { const r = mulberry(5); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const sp = 380 + r() * 300, x = (((r() * (CW + 200)) - sp * T) % (CW + 200) + CW + 200) % (CW + 200) - 100, y = r() * CH * 0.78, len = 30 + r() * 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke(); } }
    paintRail(ctx, T, rm);
    // the edges darken, more as the day goes
    const vg = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.35, CW / 2, CH / 2, CH * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,4,20,' + (0.3 + 0.2 * (T / DUR)) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
  }

  // wind in the rigging: filtered noise swelling and falling, on the effects bus. Own noise, never Math.random.
  function windStart() {
    try {
      const ac = (typeof Audio_ !== 'undefined' && Audio_) ? Audio_.ctx : null; if (!ac || Audio_.muted) return null;
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0), r = mulberry(0x57AD);
      let lp = 0; for (let i = 0; i < len; i++) { lp += (r() * 2 - 1 - lp) * 0.6; d[i] = lp; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
      const gain = ac.createGain(); gain.gain.value = 0;
      const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.19; lg.gain.value = 210; lfo.connect(lg); lg.connect(bp.frequency);
      src.connect(bp); bp.connect(gain); gain.connect(Audio_.sfxBus || Audio_.master || ac.destination);
      const now = ac.currentTime; gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(GFX.reduceMotion ? 0.07 : 0.13, now + 2.2);
      src.start(); lfo.start();
      return { ac, src, lfo, gain };
    } catch (e) { return null; }
  }
  function windStop(wd) {
    if (!wd) return;
    try { const n = wd.ac.currentTime; wd.gain.gain.cancelScheduledValues(n); wd.gain.gain.setValueAtTime(wd.gain.gain.value, n); wd.gain.gain.linearRampToValueAtTime(0, n + 0.5); wd.src.stop(n + 0.6); wd.lfo.stop(n + 0.6); } catch (e) { /* already stopped */ }
  }

  function injectStyle() {
    if (document.getElementById('skies14-style')) return;
    const st = document.createElement('style'); st.id = 'skies14-style';
    st.textContent =
      '#sk14-scene { position: absolute; inset: 0; z-index: 15; background: #0a0714; opacity: 0; transition: opacity .5s ease-out; overflow: hidden; }' +
      '#sk14-scene.in { opacity: 1; }' +
      '#sk14-scene.out { opacity: 0; transition: opacity ' + FADE_OUT + 's ease-in; pointer-events: none; }' +
      '#sk14-scene canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
      '#sk14-lines { position: absolute; left: 0; right: 0; bottom: 0; height: 22cqh; background: linear-gradient(0deg, rgba(8,5,18,.92) 0%, rgba(8,5,18,.7) 60%, rgba(8,5,18,0) 100%); }' +
      '#sk14-lines .ln { position: absolute; left: 7cqw; right: 7cqw; bottom: 4.5cqh; text-align: center; font-family: var(--font-body); font-style: italic; font-size: 2.7cqw; line-height: 1.3; color: var(--parch, #eadfc8); text-shadow: 0 1px 3px #000; opacity: 0; transition: opacity ' + LINE_FADE + 's ease; }' +
      '#sk14-lines .ln.on { opacity: 1; }' +
      '#sk14-scene.still #sk14-lines { height: auto; padding: 8cqh 7cqw 3cqh; display: flex; flex-direction: column; gap: .6cqh; }' +
      '#sk14-scene.still .ln { position: static; opacity: 1; transition: none; font-size: 2.2cqw; }' +
      '#sk14-skip { position: absolute; right: 1.5cqw; top: 1.5cqh; }' +
      '#sk14-hint { position: absolute; left: 0; right: 0; top: 1.8cqh; text-align: center; margin: 0; font-family: var(--font-body); font-size: 1.9cqw; color: var(--parch, #eadfc8); opacity: .7; pointer-events: none; text-shadow: 0 1px 3px #000; }' +
      '#sk14-snd { position: absolute; left: 1.5cqw; top: 1.5cqh; font-family: var(--font-body); font-style: italic; font-size: 1.9cqw; color: var(--parch, #eadfc8); padding: .3cqh .9cqw; background: rgba(8,6,4,.82); border-left: 3px solid var(--gold, #d9a441); }';
    document.head.appendChild(st);
  }

  // Lay the scene over the game. Returns the run record, or null when it cannot play.
  function playScene(opts) {
    opts = opts || {};
    if (SC.A) return SC.A;
    if (typeof document === 'undefined' || !hasG()) return null;
    const game = document.getElementById('game'); if (!game) return null;
    injectStyle();
    const rm = !!GFX.reduceMotion;
    const el = document.createElement('div'); el.id = 'sk14-scene'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'The Drift-Kestrel, in flight to Whisper-Grove');
    if (rm) el.classList.add('still');
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; cv.setAttribute('aria-hidden', 'true'); el.appendChild(cv);
    const box = document.createElement('div'); box.id = 'sk14-lines'; box.setAttribute('aria-live', 'polite');
    const lineEls = LINES.map((L) => { const d = document.createElement('div'); d.className = 'ln'; d.textContent = L.text; box.appendChild(d); return d; });
    el.appendChild(box);
    const skipBtn = document.createElement('button'); skipBtn.id = 'sk14-skip'; skipBtn.type = 'button'; skipBtn.className = 'dfbtn small close'; skipBtn.textContent = 'Skip'; el.appendChild(skipBtn);
    const hint = document.createElement('p'); hint.id = 'sk14-hint'; hint.textContent = 'Press any key, click or tap to skip.'; el.appendChild(hint);
    try { if (typeof ACCESS !== 'undefined' && ACCESS.settings && ACCESS.settings.cap) { const sn = document.createElement('div'); sn.id = 'sk14-snd'; sn.textContent = 'Wind in the rigging.'; el.appendChild(sn); hint.style.top = '6cqh'; } } catch (e) { /* cosmetic */ }
    game.appendChild(el);
    const ctx = cv.getContext('2d');
    const A = { el, t0: performance.now(), raf: 0, timer: 0, done: false, skipped: false, padPrev: false, wind: null, frames: 0, mapId: G.mapId, reduced: rm };
    SC.A = A; SC.cloudDefs = null; SC.blobs = null;
    const pads = () => { try { return navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { return null; } };
    const padDown = () => { const l = pads(); if (l) for (let i = 0; i < l.length; i++) { const p = l[i]; if (p && p.connected && p.buttons && p.buttons[0] && p.buttons[0].pressed) return true; } return false; };
    A.padPrev = padDown();
    const finish = (skipped) => {
      if (A.done) return; A.done = true; A.skipped = !!skipped;
      cancelAnimationFrame(A.raf); clearTimeout(A.timer);
      window.removeEventListener('keydown', onKey, true); el.removeEventListener('pointerdown', onPress, true); el.removeEventListener('click', onPress, true);
      windStop(A.wind);
      SC.A = null; SC.played++; if (skipped) SC.skipped++;
      SC.lastPlay = { skipped: !!skipped, reduced: rm, ms: performance.now() - A.t0, frames: A.frames, mapId: A.mapId };
      // fade onto Whisper-Grove and the Part Three event; the element goes once the fade is over
      el.classList.remove('in'); el.classList.add('out');
      if (rm || opts.instant) el.remove(); else setTimeout(() => { if (el.parentNode) el.remove(); }, FADE_OUT * 1000 + 200);
      try { G.keys = {}; } catch (e) { /* cosmetic */ }
    };
    A.finish = finish;
    const skip = () => { if (performance.now() - A.t0 >= SKIP_GRACE) finish(true); };
    const onKey = (ev) => {
      if (ev.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(ev.key)) return;
      ev.preventDefault(); ev.stopImmediatePropagation(); skip();
    };
    const onPress = (ev) => { ev.preventDefault(); ev.stopPropagation(); skip(); };
    window.addEventListener('keydown', onKey, true); el.addEventListener('pointerdown', onPress, true); el.addEventListener('click', onPress, true);
    A.pad = () => { const down = padDown(); if (down && !A.padPrev) skip(); A.padPrev = down; };
    requestAnimationFrame(() => { if (!A.done) el.classList.add('in'); });
    if (!rm) A.wind = windStart();
    let shown = -1;
    const step = () => {
      if (A.done) return;
      if (G.mapId !== A.mapId) { finish(false); return; }          // a different game was loaded under it
      const t = (performance.now() - A.t0) / 1000;
      try {
        paintScene(ctx, rm ? 10.6 : Math.min(t, DUR), rm);
        if (!rm) {
          let cur = -1; for (let i = 0; i < LINES.length; i++) if (t >= LINES[i].t0 && t < LINES[i].t1) cur = i;
          if (cur !== shown) { shown = cur; lineEls.forEach((d, i) => d.classList.toggle('on', i === cur)); }
        }
        A.frames++;
      } catch (e) { console.warn('skies14 scene paint failed', e); finish(false); return; }
      A.pad();
      if (!rm && t >= DUR) { finish(false); return; }
      if (rm && t >= STILL_HOLD) { finish(false); return; }
      A.raf = requestAnimationFrame(step);
    };
    step();
    // if animation frames are not delivered (a hidden tab, a test), the scene still ends on time
    if (!A.done) A.timer = setTimeout(() => finish(false), Math.min(HARD_STOP, (rm ? STILL_HOLD : DUR) * 1000 + 600));
    return A;
  }
  // A controller's A also skips, through the same poll the game uses for everything else. While the scene is up (and while
  // A is still held after it ends) the game's own pad poll is not called: the press that skips must not also press the
  // Part Three event's button underneath. The game is paused in its event state meanwhile, so nothing is missed.
  const padAny = () => { try { const l = navigator.getGamepads ? navigator.getGamepads() : null; if (l) for (let i = 0; i < l.length; i++) { const p = l[i]; if (p && p.connected && p.buttons && p.buttons.some(b => b && b.pressed)) return true; } } catch (e) { /* none */ } return false; };
  if (typeof controlsTick === 'function') {
    const _ct = controlsTick;
    controlsTick = function () {
      try {
        if (SC.A) { SC.A.pad(); SC.hold = true; return undefined; }
        if (SC.hold) { if (padAny()) return undefined; SC.hold = false; }
      } catch (e) { /* cosmetic */ }
      return _ct.apply(this, arguments);
    };
  }

  // the transition: the original runs first and untouched, then (once) the picture goes over it
  if (typeof startPart3 === 'function') {
    const _sp3 = startPart3;
    startPart3 = function () {
      const r = _sp3.apply(this, arguments);
      try {
        if (hasG() && G.flags.part3 && G.mapId === 'whispergrove') {
          if (!fint('p14s_w')) fset('p14s_w', firstNight(G.day, G.tod) + 2);       // the first night in the Grove
          if (sceneOn() && !fint('p14s_k')) { fset('p14s_k', 1); playScene(); }
        }
      } catch (e) { console.warn('skies14 scene failed', e); }
      return r;
    };
  }

  // ============================================================
  //  Options rows
  // ============================================================
  const ROWS = [
    ['sk14-opt-aurora', 'Octave lights', 'slow coloured curtains in the night sky on certain nights', 'aurora'],
    ['sk14-opt-scene', 'Kestrel flight scene', 'a short skippable scene on the way to Whisper-Grove', 'scene'],
    ['sk14-opt-caustics', 'Water light', 'rippling light on the flooded floor of the Sunken Court', 'caustics'],
  ];
  function syncBtn(b, key) { b.textContent = set[key] ? 'On' : 'Off'; b.setAttribute('aria-pressed', set[key] ? 'true' : 'false'); b.classList.toggle('sel', !!set[key]); }
  function setSwitch(key, v) {
    set[key] = !!v; save();
    const id = (ROWS.find(r => r[3] === key) || [])[0], b = id && document.getElementById(id); if (b) syncBtn(b, key);
    return set[key];
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('sk14-opt-aurora')) return;
    let anchor = document.getElementById('m10-parry') || document.getElementById('rp-toggle') || document.getElementById('ac-cap');
    for (const [id, label, hint, key] of ROWS) {
      const lab = document.createElement('span'); lab.className = 'gfx-label'; lab.id = id + '-label'; lab.textContent = label + ' ';
      const small = document.createElement('small'); small.className = 'muted'; small.textContent = hint; lab.appendChild(small);
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = id; b.type = 'button'; b.setAttribute('aria-label', label);
      b.onclick = () => setSwitch(key, !set[key]);
      syncBtn(b, key);
      if (anchor && anchor.parentNode) { anchor.insertAdjacentElement('afterend', b); anchor.insertAdjacentElement('afterend', lab); anchor = b; }
      else { grid.appendChild(lab); grid.appendChild(b); }
    }
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { appendRows(); } catch (e) { console.warn('skies14 rows failed', e); }
      return r;
    };
  }
  load();
  if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenu); else wireMenu();

  return {
    settings: set, setSwitch, on: { aurora: auroraOn, scene: sceneOn, caustics: causticsOn },
    aurora: { plan: auroraPlan, hook: auroraHook, state: AUR, NOTES, KINDS, nightKey, firstNight, RITE_EVE, RARE_P, curtainsFor },
    scene: { play: playScene, state: SC, LINES, DUR, STILL_HOLD, SKIP_GRACE, paint: paintScene, skyAt, active: () => SC.A },
    caustics: { hook: causticsHook, state: CST, MAPS: CAUSTIC_MAPS },
  };
})();
