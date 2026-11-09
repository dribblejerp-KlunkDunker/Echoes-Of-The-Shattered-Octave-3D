// ============================================================
//  folk14 — Phase 14 "A world that shows the story", the FOLK team: people who answer the weather and the room.
//
//  Four effects, each behind its own GFX switch (Options -> Graphics & access, stored in localStorage
//  'echoes-folk14'). All are presentation: nothing is saved, no flag is written, no entity is added to a
//  built map, and the game's Math.random sequence is never drawn (own hash / xorshift only).
//
//   folkHoods   Rain, storm and snow: people outdoors pull a hood up (a procedural cowl over the head of the
//               sprite, face left open; a few seconds' stagger so a street does not change at one instant)
//               and the generic townsfolk who have slack walk a little faster, drifting to the eave beside
//               the nearest door. Quest NPCs only ever get the cosmetic hood.
//   folkHuddle  Cold (js/air11.js coldness: night, dusk, snow, mist, rain): idle generic townsfolk with slack
//               in their routine drift to a nearby brazier / camp fire / hearth and stand about it, rubbing
//               their hands (a small bob). They go back to their post when it warms or the routine needs them.
//   folkCapes   Coats, cloaks and robes sway: the bottom ~38% of the sprite is sheared sideways a pixel or
//               three (integer, crisp) while the wearer walks and, outdoors, in wind. Reduce motion = none.
//   folkTavern  The Boar & Dulcimer: patrons sit on a stool (the sprite loses its thighs and gets a stool
//               behind it), lift a tankard or a spoon every so often with a small tock or scrape, stand up
//               twenty minutes before their routine ends, and Hetty carries a round to a patron now and then.
//
//  Quest-bearing NPCs are never moved by the weather rules (only generic townsman/townswoman are eligible,
//  and never a law guard, a night watch, a conditional NPC or a companion). Hetty's serving walk is the one
//  movement of a named NPC, and it only runs while nobody is talking to her and the player is away.
//
//  Inventions are marked [PROPOSED]; the art is procedural STAND-IN work (painted frames replace it later).
// ============================================================
'use strict';

const FOLK_FLAGS = ['folkHoods', 'folkHuddle', 'folkCapes', 'folkTavern'];
if (typeof GFX !== 'undefined') {
  for (const k of FOLK_FLAGS) {
    if (GFX[k] === undefined) GFX[k] = true;
    if (GFX.FX && !GFX.FX.includes(k)) GFX.FX.push(k);
  }
}

const FOLK14 = (() => {
  const KEY = 'echoes-folk14';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const frac = (x) => x - Math.floor(x);
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // ------------------------------------------------------------------ tables [PROPOSED numbers]
  const CFG = {
    sway: { maxPx: 4, frac: 0.38, wind: 2.4, walk: 2.4 },        // px at a 160-row figure; scaled to the sprite
    hood: { delayMin: 0.6, delayMax: 5.5, colours: [[96, 76, 54], [82, 86, 90], [72, 84, 66], [116, 96, 58]] },
    hurry: 1.15,                                                  // tiles/s while hurrying to the eave (the game's wander is 0.6)
    huddleSpeed: 0.85, huddleRing: 1.35, fireRange: 12, eaveRange: 10, coldMin: 0.55, coldHard: 0.85,
    seat: { thighs: 0.22, standUpBefore: 20 / 60 },               // fraction of figure height removed; hours before the routine ends
    serve: { from: 16, to: 23, gap: 45, speed: 0.9, pause: 3.2, playerAway: 2.6 },
  };

  // sprites that wear something long (value = how much it moves) [PROPOSED amounts]
  const SWAY = {
    vane: 1, harrow: 1, kaelen: 1, sable: 1, mags: 1, tam: 0.6, herald: 0.7, deacon: 1, flambeau: 0.8,
    proctor: 1, marine: 1, pressman: 0.8, outrider: 1, captain: 1, legionnaire: 0.5,
  };
  // people who get a hood or a stool (not beasts, constructs, or those already hooded, helmeted or mitred)
  const HUMAN = new Set(['townsman', 'townswoman', 'hetty', 'vane', 'sable', 'lyra', 'kaelen', 'rooke', 'orla', 'pim', 'vosk', 'aldric', 'tobiah', 'bettany', 'tam', 'hob', 'nell', 'mags', 'halder', 'quist', 'wren', 'herald']);
  const FIRE_SPR = new Set(['campfire', 'hearth', 'brazier']);

  // ------------------------------------------------------------------ settings
  const stored = {}; for (const k of FOLK_FLAGS) stored[k] = null;
  let mineChanging = false;
  function loadSettings() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of FOLK_FLAGS) if (typeof o[k] === 'boolean') stored[k] = o[k];
    } catch (e) { /* storage blocked: preset values stand */ }
    for (const k of FOLK_FLAGS) if (stored[k] !== null && typeof GFX !== 'undefined') GFX[k] = stored[k];
  }
  function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(stored)); } catch (e) { /* optional */ } }
  function setFlag(k, on) {
    mineChanging = true;
    try { GFX[k] = !!on; stored[k] = !!on; saveSettings(); GFX.changed(); } finally { mineChanging = false; }
  }
  const anyOn = () => !!(GFX.folkHoods || GFX.folkHuddle || GFX.folkCapes || GFX.folkTavern);

  let sysReduce = false;
  try {
    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq) { sysReduce = mq.matches; const on = (ev) => { sysReduce = ev.matches; }; if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on); }
  } catch (e) { /* carry on */ }
  const reduced = () => !!(GFX.reduceMotion || sysReduce);

  // the module's own generator (never Math.random)
  let rs = 0x14f01c;
  function rnd() { rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; return ((rs >>> 0) % 100000) / 100000; }

  // ------------------------------------------------------------------ the world, read once per frame
  const env = { T: -1, map: null, outdoor: false, wet: false, snow: false, wind: 0, cold: 0, hour: 12, mapId: '', fires: [], doors: null, doorsMap: null };
  function weatherState() { try { return (typeof Weather !== 'undefined' && Weather.state) || 'clear'; } catch (e) { return 'clear'; } }
  function coldOf(map, tod) {
    try { if (typeof AIR11 !== 'undefined' && AIR11.breath && AIR11.breath.coldness) return AIR11.breath.coldness(map, tod); } catch (e) { /* fall through */ }
    return 0;
  }
  function readEnv(T) {
    if (env.T === T && env.map === G.map) return env; env.T = T; env.map = G.map;
    const m = G.map; env.mapId = G.mapId || '';
    env.outdoor = !!(m && m.outdoor);
    const st = env.outdoor ? weatherState() : 'clear';
    env.snow = st === 'snow';
    env.wet = st === 'rain' || st === 'storm' || st === 'snow';
    env.wind = 0; try { if (env.outdoor && typeof Weather !== 'undefined') env.wind = clamp(+Weather.wind || 0, 0, 1); } catch (e) { /* none */ }
    env.cold = m ? coldOf(m, G.tod) : 0;
    env.hour = ((((G.tod % 1) + 1) % 1) * 24 + 1e-7) % 24;
    env.fires.length = 0;
    if (G.ents) for (const e of G.ents) if (!e.hidden && !e.dead && (FIRE_SPR.has(e.sprite) || e._fs === 'brazier') && e.kind === 'deco') env.fires.push(e);
    return env;
  }

  // ------------------------------------------------------------------ sprite analysis and variants
  const FIG = new WeakMap();
  // bounding box and head centre of the opaque pixels (engine threshold alpha > 100)
  function figOf(sp) {
    let f = FIG.get(sp); if (f) return f;
    const w = sp.w, h = sp.h, dt = sp.data;
    let t = -1, b = -1, l = w, r = -1;
    for (let y = 0; y < h; y++) {
      let any = false;
      for (let x = 0; x < w; x++) if ((dt[y * w + x] >>> 24) > 100) { any = true; if (x < l) l = x; if (x > r) r = x; }
      if (any) { if (t < 0) t = y; b = y; }
    }
    if (t < 0) { t = 0; b = h - 1; l = 0; r = w - 1; }
    const figH = b - t + 1, figW = r - l + 1;
    let sx = 0, n = 0; const top = Math.max(2, Math.round(figH * 0.03));
    for (let y = t; y < Math.min(h, t + top); y++) for (let x = 0; x < w; x++) if ((dt[y * w + x] >>> 24) > 100) { sx += x; n++; }
    f = { t, b, l, r, figH, figW, hc: n ? Math.round(sx / n) : Math.round((l + r) / 2) };
    FIG.set(sp, f); return f;
  }
  const pack = (r, g, b) => ((255 << 24) | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255)) >>> 0;
  const isOp = (px) => (px >>> 24) > 100;

  // sway: shear the bottom of the figure by k pixels (k signed, scaled to the figure), hem most, boots still
  function swayData(data, w, h, f, k) {
    const out = new data.constructor(data);
    const y0 = f.b - Math.round(f.figH * CFG.sway.frac), span = f.b - y0;
    const scale = f.figH / 160;
    for (let y = y0; y <= f.b; y++) {
      const u = (y - y0) / span;
      const prof = Math.min(1, Math.pow(u / 0.6, 1.6)) * (1 - smooth((u - 0.6) / 0.2));   // hem swings most, boots (last ~8%) stay put
      const off = Math.round(k * scale * prof);
      if (!off) continue;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const sx = x - off;
        out[row + x] = sx >= 0 && sx < w ? data[row + sx] : 0;
      }
    }
    return out;
  }

  // seat: drop the thighs, lower the upper body onto the stool, add a stool behind (amt 0.5 = half way)
  function seatData(data, w, h, f, amt) {
    const rem = Math.round(CFG.seat.thighs * f.figH * amt), yh = f.t + Math.round(0.5 * f.figH);
    const out = new data.constructor(w * h);
    for (let y = 0; y < h; y++) {
      if (y < yh) { const ny = y + rem; if (ny < h) out.set(data.subarray(y * w, y * w + w), ny * w); }
      else if (y >= yh + rem) out.set(data.subarray(y * w, y * w + w), y * w);
    }
    if (!(data instanceof Uint32Array)) return out;   // an emissive mask moves with the pixels; the stool does not glow
    // stool, drawn only into empty pixels so the figure hides most of it
    const plankY = yh + rem, th = Math.max(3, Math.round(f.figH * 0.045)), half = Math.round(f.figW * 0.4), legW = Math.max(2, Math.round(f.figH * 0.02));
    const lt = pack(138, 104, 64), md = pack(100, 72, 44), dk = pack(56, 38, 24);
    const put = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < h && !isOp(out[y * w + x])) out[y * w + x] = c; };
    for (let y = plankY; y < plankY + th; y++) for (let x = f.hc - half; x <= f.hc + half; x++) put(x, y, y === plankY ? lt : md);
    for (const sgn of [-1, 1]) for (let y = plankY + th; y <= f.b; y++) for (let i = 0; i < legW; i++) put(f.hc + sgn * (half - legW - 1) + i * 1, y, y > f.b - 2 ? dk : md);
    return out;
  }

  // hood: a cowl over the head with the face left open
  function hoodData(data, w, h, f, ci, seatRem) {
    const out = data;   // edited in place (data is already our own copy)
    const col = CFG.hood.colours[ci % CFG.hood.colours.length];
    const t = f.t + (seatRem || 0), hh = Math.round(0.19 * f.figH), cx = f.hc;
    // head half width from a row part-way down the head
    const wy = clamp(t + Math.round(hh * 0.4), 0, h - 1);
    let lo = cx, hi = cx; while (lo > 0 && isOp(out[wy * w + lo - 1])) lo--; while (hi < w - 1 && isOp(out[wy * w + hi + 1])) hi++;
    const hw = Math.max(4, Math.min(Math.round(f.figW * 0.2), Math.round((hi - lo + 1) / 2)));
    const cy = t + hh * 0.5, top = t - 5, ry = cy - top, endY = t + Math.round(hh * 1.5), wMax = hw + 3 + (endY - cy) * 0.42;
    const fcy = t + hh * 0.66, frx = hw * 0.66, fry = hh * 0.36;
    for (let y = Math.max(0, top); y <= Math.min(h - 1, endY); y++) {
      let ww;
      if (y <= cy) { const q = (cy - y) / ry; ww = (hw + 3) * Math.pow(Math.max(0, 1 - q * q), 0.62); }   // rounded crown with a soft peak
      else ww = hw + 3 + (y - cy) * 0.42;
      const wI = Math.floor(ww + 0.5);
      for (let x = cx - wI; x <= cx + wI; x++) {
        if (x < 0 || x >= w) continue;
        const ex = (x - cx) / frx, ey = (y - fcy) / fry, q = ex * ex + ey * ey;
        if (q < 1) continue;                                        // the face stays
        // the hem follows the shoulders: lowest at the centre of the chest, riding up toward the sides
        if (y > t + Math.round(hh * 1.5) - Math.round(0.55 * hh * Math.pow(Math.abs(x - cx) / wMax, 1.4))) continue;
        let k = x < cx - ww * 0.3 ? 0.78 : x > cx + ww * 0.35 ? 1.06 : 0.92;
        if (q < 1.5) k *= 0.5;                                      // shadow inside the opening
        if (ww - Math.abs(x - cx) < 1.2 || y <= top + 1) k *= 0.6;  // outline
        else if (y <= t + 1 && ww - Math.abs(x - cx) < 3.4) k *= 1.2; // wet sheen along the crown
        else if (y > cy && (Math.abs(x - cx - Math.round(hw * 0.55)) < 1 || Math.abs(x - cx + Math.round(hw * 0.5)) < 1)) k *= 0.72; // folds
        const sp = ((x * 7 + y * 13) % 23 === 0) ? 26 : 0;
        out[y * w + x] = pack(col[0] * k + sp, col[1] * k + sp, col[2] * k + sp);
      }
    }
    return out;
  }

  // held item: a tankard (kind 1) or a spoon (kind 2) at one of four lifts (0 table, 1 half, 2 mouth, 3 tilted)
  function heldData(data, w, h, f, kind, lift, seatRem) {
    const out = data, F = f.figH, t = f.t + (seatRem || 0), s = F / 160, fw = f.figW;
    const put = (x, y, c) => { x = x | 0; y = y | 0; if (x >= 0 && x < w && y >= 0 && y < h) out[y * w + x] = c; };
    const pos = [[0.27, 0.5], [0.2, 0.36], [0.13, 0.25], [0.1, 0.2]][lift];
    const hx = f.hc + Math.round(pos[0] * fw), hy = t + Math.round(pos[1] * F);
    if (kind === 1) {
      const mw = Math.max(4, Math.round(7 * s)), mh = Math.max(5, Math.round(11 * s));
      const body = pack(138, 132, 122), band = pack(86, 80, 74), foam = pack(226, 218, 190), edge = pack(60, 56, 52), hand = pack(150, 110, 84);
      const tilt = lift === 3 ? 0.4 : 0;
      for (let j = 0; j < mh; j++) {
        const sh = Math.round(-tilt * (mh - 1 - j) * 0.5);
        for (let i = 0; i < mw; i++) {
          let c = j < 2 ? foam : (j === Math.floor(mh * 0.55) ? band : body);
          if (i === 0 || i === mw - 1 || j === mh - 1) c = edge;
          put(hx - (mw >> 1) + i + sh, hy - mh + j, c);
        }
        if (j > 1 && j < mh - 2) put(hx + (mw >> 1) + 1 + sh, hy - mh + j, edge);   // the handle
      }
      for (let i = -1; i <= 2; i++) put(hx + i, hy, hand);                           // the hand under it
    } else if (kind === 2) {
      const len = Math.max(6, Math.round(14 * s)), metal = pack(190, 188, 180), dark = pack(96, 90, 82), hand = pack(150, 110, 84);
      const dx = lift >= 2 ? -0.55 : -0.25;
      for (let i = 0; i < len; i++) put(hx + dx * i, hy - i, i > len - 3 ? metal : dark);
      put(hx + dx * len - 1, hy - len, metal); put(hx + dx * len, hy - len - 1, metal);
      for (let i = -1; i <= 1; i++) put(hx + i, hy + 1, hand);
    }
    return out;
  }

  // The cache: source sprite -> Map(key -> variant). A key packs sway(0..6) | seat(0..2)<<3 | hood(0..4)<<5 | kind<<8 | lift<<10.
  const CACHE = new WeakMap();
  let built = 0;
  function variant(src, key) {
    if (!src || !key || !src.data || src.w * src.h > 40000) return null;
    let m = CACHE.get(src); if (!m) { m = new Map(); CACHE.set(src, m); }
    let v = m.get(key); if (v) return v;
    const f = figOf(src), w = src.w, h = src.h;
    let data = new Uint32Array(src.data), emit = src.emit || null;
    const sw = key & 7, seat = (key >> 3) & 3, hood = (key >> 5) & 7, kind = (key >> 8) & 3, lift = (key >> 10) & 3;
    if (sw) { const k = sw <= 3 ? sw - 4 : sw - 3; data = swayData(data, w, h, f, k); if (emit) emit = swayData(emit, w, h, f, k); }   // 1..3 -> -3..-1, 4..6 -> +1..+3
    let rem = 0;
    if (seat) { const amt = seat === 1 ? 0.5 : 1; rem = Math.round(CFG.seat.thighs * f.figH * amt); data = seatData(data, w, h, f, amt); if (emit) emit = seatData(emit, w, h, f, amt); }
    if (hood) data = hoodData(data, w, h, f, hood - 1, rem);
    if (kind && seat === 2) data = heldData(data, w, h, f, kind, lift, rem);
    v = Object.assign({}, src, { data }); if (emit) v.emit = emit;
    m.set(key, v); built++;
    return v;
  }
  const swayCode = (k) => (k === 0 ? 0 : k < 0 ? k + 4 : k + 3);       // -3..-1 -> 1..3, 1..3 -> 4..6

  // engine hook: swap in the variant chosen for this entity this frame (e._f14k, set in the animCreature wrapper)
  const _dir = animDirectionalSprite;
  animDirectionalSprite = function (e) {
    const r = _dir(e);
    const k = e._f14k;
    if (!k || e.deathArt || e.dying) return r;
    const v = variant(r.sprite, k);
    return v ? { sprite: v, flip: r.flip } : r;
  };

  // ------------------------------------------------------------------ per-entity presentation
  const seedOf = (e) => (typeof animSeed === 'function' ? animSeed(e) : 0);

  function swayK(e, T, dt) {
    const amp = SWAY[e.sprite]; if (!amp || !GFX.folkCapes || reduced()) return 0;
    if (e.kind === 'npc' && e.hidden) return 0;
    const s = seedOf(e);
    const mv = clamp((e._spd || 0) / 1.6, 0, 1.2);
    let v = 0;
    if (mv > 0.12) v += CFG.sway.walk * mv * Math.sin((e._phase || 0) * 1.0 + s) ;
    if (env.outdoor && env.wind > 0.12) v += CFG.sway.wind * env.wind * (0.6 * Math.sin(T * 2.3 + s) + 0.4 * Math.sin(T * 5.1 + s * 2));
    return clamp(Math.round(v * amp), -CFG.sway.maxPx, CFG.sway.maxPx);
  }

  function hoodIdx(e, dt) {
    if (e.kind !== 'npc' || !GFX.folkHoods || !HUMAN.has(e.sprite)) { e._f14hT = 0; return 0; }
    const want = env.outdoor && env.wet && !e.hidden;
    const s = seedOf(e), delay = CFG.hood.delayMin + (CFG.hood.delayMax - CFG.hood.delayMin) * frac(s * 0.37);
    e._f14hT = clamp((e._f14hT || 0) + (want ? dt : -dt * 0.5), 0, delay + 1);
    if (e._f14hT < delay) return 0;
    return 1 + (Math.floor(frac(s * 1.71) * 4) % 4);
  }

  // ---- tavern: who sits, when
  const inRange = (h, r) => (r[0] <= r[1] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1]);
  function rosterOf(e) {
    if (typeof TOWNSFOLK === 'undefined') return null;
    if (e._tf) return e._tf;
    if (e._tfStand) return TOWNSFOLK.ROSTER.find((r) => r.key === e._tfStand) || null;
    return null;
  }
  function canSit(e) {
    if (e.kind !== 'npc' || e.hidden || e.dead || e.companion || e.lawGuard || e.nightWatch) return false;
    if (!HUMAN.has(e.sprite) || e.sprite === 'hetty') return false;
    if (e.id === 'hetty' || e.id === 'cat') return false;
    return true;
  }
  function talking(e) { return typeof DLG !== 'undefined' && DLG.ent === e && G.state === 'dialogue'; }
  function wantSeat(e) {
    if (!GFX.folkTavern || env.mapId !== 'tavern' || !canSit(e)) return false;
    if (talking(e)) return false;
    if (G.flags && (G.flags.greening)) return false;
    const r = rosterOf(e);
    if (r) {
      const range = e._tfStand ? r.tavern : r.work;
      if (range) {
        const end = range[1], h = env.hour;
        // stand up a little before the routine ends
        if (!inRange(h, range)) return false;
        const left = (((end - h) % 24) + 24) % 24;
        if (left < CFG.seat.standUpBefore) return false;
      }
    }
    return true;
  }
  // a drink or a spoonful every nine to thirteen seconds: item (1 tankard / 2 spoon) and lift (0..3) as pure functions of time
  function cycle(seed, t) {
    const P = 9 + 4 * frac(seed * 1.7), tt = t + seed * 3, k = Math.floor(tt / P), u = tt - k * P;
    const kind = k % 3 === 2 ? 2 : 1, a = P - 3.4;
    let lift = 0;
    if (u >= a) {
      const x = u - a;
      lift = x < 0.5 ? 1 : x < 1.0 ? 2 : x < 2.2 ? (kind === 1 ? 3 : 2) : x < 2.7 ? 2 : x < 3.2 ? 1 : 0;
    }
    return { kind, lift, k, show: kind === 1 || lift > 0 };
  }

  // ---- sounds: tiny, near, own random
  let lastSnd = -9;
  function nearTavern(e) { return env.mapId === 'tavern' && d2(e.x, e.y, Engine.cam.x, Engine.cam.y) < 9 * 9; }
  function ctxOK() { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } }
  function blip(kind, vol) {
    if (!ctxOK()) return;
    const ac = Audio_.ctx, t0 = ac.currentTime, g = ac.createGain();
    g.connect(Audio_.sfxBus);
    if (kind === 'scrape') {
      const n = Math.floor(ac.sampleRate * 0.22), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(); src.buffer = buf;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380 + rnd() * 120; bp.Q.value = 1.1;
      g.gain.setValueAtTime(vol * 0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      src.connect(bp); bp.connect(g); src.start(t0);
    } else {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = kind === 'clink' ? 2300 + rnd() * 400 : 520 + rnd() * 90;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'clink' ? 0.16 : 0.07));
      o.connect(g); o.start(t0); o.stop(t0 + 0.2);
    }
  }
  function sound(e, kind) {
    if (!nearTavern(e)) return;
    const t = env.T; if (t - lastSnd < 0.6) return; lastSnd = t;
    try { blip(kind, kind === 'tock' ? 0.035 : 0.03); } catch (err) { /* sound is optional */ }
  }

  function seatTick(e, dt, T) {
    const want = wantSeat(e);
    let st = e._f14s;
    if (!st) { if (!want) return 0; st = e._f14s = { l: 1, t: 0, idx: 2, k: -1 }; }   // already seated when first seen
    const prev = st.idx;
    st.l = clamp(st.l + (want ? dt : -dt) * 4, 0, 1);
    st.idx = st.l < 0.25 ? 0 : st.l < 0.75 ? 1 : 2;
    if (st.idx !== prev && (prev === 0 || st.idx === 0 || (prev === 2) !== (st.idx === 2))) { if (prev === 0 || st.idx === 0) sound(e, 'scrape'); }
    if (st.idx === 0 && !want) { e._f14s = null; return 0; }
    let kind = 0, lift = 0;
    if (st.idx === 2) {
      st.t += reduced() ? 0 : dt;
      if (!reduced()) {
        const c = cycle(seedOf(e), st.t);
        kind = c.show ? c.kind : 0; lift = c.lift;
        if (st.k !== c.k) { if (st.k >= 0) sound(e, c.kind === 1 ? 'clink' : 'tock'); st.k = c.k; }
      }
    }
    e._f14seatIdx = st.idx;
    return (st.idx << 3) | (kind << 8) | (lift << 10);
  }

  // ---- Hetty serves
  const serve = { e: null, st: 'idle', path: null, i: 0, wait: 0, since: 30, stuck: 0, best: 1e9, tgt: null, home: null };
  function hettyOf() {
    if (!G.ents) return null;
    for (const e of G.ents) if (e.kind === 'npc' && e.id === 'hetty' && !e.hidden && !e.dead) return e;
    return null;
  }
  function freeSpot(x, y, self) {
    if (!G.map || solidAt(x, y, self)) return false;
    return true;
  }
  // a place beside a seated patron: one of four sides, free, nearest the aisle
  function stopBeside(p, self) {
    let best = null, bd = 1e9;
    for (const [dx, dy] of [[-0.95, 0], [0.95, 0], [0, -0.95], [0, 0.95]]) {
      const x = p.x + dx, y = p.y + dy;
      if (!freeSpot(x, y, self)) continue;
      const dd = d2(x, y, 8.6, 4.9); if (dd < bd) { bd = dd; best = { x, y }; }
    }
    return best;
  }
  // the straight segments a walker would take are free of walls and bodies
  function clearSegment(a, b, self) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.2));
    for (let i = 1; i <= n; i++) if (solidAt(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, self)) return false;
    return true;
  }
  function routeTo(p, e) {
    const stop = stopBeside(p, e); if (!stop) return null;
    const path = [{ x: 5.8, y: 4.8 }, { x: 8.6, y: 4.9 }, stop];
    let prev = { x: e.x, y: e.y };
    for (const q of path) { if (!clearSegment(prev, q, e)) return null; prev = q; }
    return path;
  }
  function startServe(e) {
    const list = G.ents.filter((p) => p.kind === 'npc' && p !== e && !p.hidden && p._f14s && p._f14s.idx === 2);
    if (!list.length) return false;
    const first = Math.floor(rnd() * list.length) % list.length;
    for (let i = 0; i < list.length; i++) {
      const p = list[(first + i) % list.length], path = routeTo(p, e);
      if (!path) continue;
      serve.e = e; serve.st = 'out'; serve.i = 0; serve.wait = 0; serve.stuck = 0; serve.best = 1e9; serve.tgt = p; serve.path = path;
      serve.home = { x: e.homeX != null ? e.homeX : e.x, y: e.homeY != null ? e.homeY : e.y };
      return true;
    }
    serve.since = CFG.serve.gap - 10;   // nobody reachable now: try again in ten seconds
    return false;
  }
  // true on arrival; a walker that makes no headway for 2.5 s counts as stuck
  function stepToward(e, tx, ty, speed, dt) {
    const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
    if (dist < 0.08) { serve.best = 1e9; serve.stuck = 0; return true; }
    const st = Math.min(dist, speed * dt);
    moveWithSlide(e, dx / dist * st, dy / dist * st, e);
    if (dist < serve.best - 0.04) { serve.best = dist; serve.stuck = 0; } else serve.stuck += dt;
    return false;
  }
  function snapHome(e) { if (e && e.homeX != null) { e.x = e.homeX; e.y = e.homeY; } serve.st = 'idle'; serve.path = null; serve.since = 0; }
  function hettyTick(dt) {
    const e = hettyOf();
    if (!GFX.folkTavern || env.mapId !== 'tavern' || !e || (G.flags && G.flags.greening)) { if (serve.e && serve.st !== 'idle') snapHome(serve.e); serve.e = null; serve.st = 'idle'; return; }
    if (serve.e !== e) { serve.e = e; serve.st = 'idle'; }
    const pd2 = d2(e.x, e.y, Engine.cam.x, Engine.cam.y);
    const busy = G.state !== 'play' || talking(e);
    if (serve.st === 'idle') {
      serve.since += dt;
      const hx = e.homeX, hy = e.homeY;
      if (hx != null && d2(e.x, e.y, hx, hy) > 0.04) snapHome(e);   // a restored save left her mid-round: back to the bar
      if (!busy && serve.since > CFG.serve.gap && inRange(env.hour, [CFG.serve.from, CFG.serve.to]) && pd2 > CFG.serve.playerAway * CFG.serve.playerAway) startServe(e);
      return;
    }
    if (busy || pd2 < 1.7 * 1.7) return;   // pause; never walk into someone who is talking to her or standing close
    const late = !inRange(env.hour, [CFG.serve.from, CFG.serve.to]);
    if (serve.st === 'out') {
      const wp = serve.path[serve.i];
      if (late) { serve.st = 'back'; serve.i = Math.max(0, serve.i - 1); return; }
      if (stepToward(e, wp.x, wp.y, CFG.serve.speed, dt)) { serve.i++; if (serve.i >= serve.path.length) { serve.st = 'wait'; serve.wait = CFG.serve.pause; } }
    } else if (serve.st === 'wait') {
      serve.wait -= dt; if (serve.wait <= 0) { serve.st = 'back'; serve.i = serve.path.length - 2; }
    } else if (serve.st === 'back') {
      const wp = serve.i >= 0 ? serve.path[serve.i] : serve.home;
      if (stepToward(e, wp.x, wp.y, CFG.serve.speed, dt)) { serve.i--; if (serve.i < -1) { snapHome(e); } }
    }
    if (serve.stuck > 2.5) { serve.stuck = 0; serve.best = 1e9; if (serve.st === 'out') { serve.st = 'back'; serve.i = Math.max(-1, serve.i - 1); } else if (serve.st === 'back') { snapHome(e); } }
  }

  // ---- weather steering (huddle, eave): eligible movers only
  function movable(e) {
    if (e.kind !== 'npc' || e.hidden || e.dead || e.dying) return false;
    if (e.id !== 'townsman' && e.id !== 'townswoman') return false;
    if (e.companion || e.lawGuard || e.nightWatch || e.requires || e.until || e._p11t || e.guard) return false;
    return true;
  }
  function slack(e) {
    const r = e._tf;
    if (!r) return !!e.wander;                                       // a stroller with no post
    if (!r.work) return false;
    if (env.cold >= CFG.coldHard) return true;                       // a hard cold: everyone takes a warm-up
    const h = env.hour, a = r.work[0], b = r.work[1];
    return Math.abs(h - a) <= 1 || Math.abs(h - b) <= 1;
  }
  function nearestFire(e) {
    let best = null, bd = CFG.fireRange * CFG.fireRange;
    for (const f of env.fires) { const dd = d2(e.x, e.y, f.x, f.y); if (dd < bd) { bd = dd; best = f; } }
    return best;
  }
  function ringSpot(f, e) {
    const s = seedOf(e);
    for (let i = 0; i < 8; i++) {
      const a = (frac(s * 0.61) + i / 8) * Math.PI * 2, x = f.x + Math.cos(a) * CFG.huddleRing, y = f.y + Math.sin(a) * CFG.huddleRing;
      if (!solidAt(x, y, e)) return { x, y };
    }
    return null;
  }
  function doorsOf(m) {
    if (env.doorsMap === m) return env.doors;
    const out = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.get(x, y); if (c && c.door && c.portal) out.push({ x, y }); }
    env.doors = out; env.doorsMap = m; return out;
  }
  function eaveSpot(e) {
    const m = G.map; if (!m) return null;
    let best = null, bd = CFG.eaveRange * CFG.eaveRange;
    for (const d of doorsOf(m)) {
      const cx = d.x + 0.5, cy = d.y + 0.5, dd = d2(e.x, e.y, cx, cy); if (dd >= bd) continue;
      // a free neighbour in front of the door, then one tile to the side of the doorway so the way in stays open
      for (const [ax, ay] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (m.isSolidCell(d.x + ax, d.y + ay)) continue;
        for (const sgn of [1, -1]) {
          const x = cx + ax * 1.0 + (ax === 0 ? sgn * 1.15 : 0), y = cy + ay * 1.0 + (ay === 0 ? sgn * 1.15 : 0);
          if (solidAt(x, y, e)) continue;
          const s2 = d2(e.x, e.y, x, y); if (s2 < bd) { bd = s2; best = { x, y }; }
        }
      }
    }
    return best;
  }
  const rubbing = new WeakSet();
  function preSteer() {
    // cancel the game's own wander step for people being steered, before it runs (its rolls still happen)
    if (!G.ents || !(GFX.folkHoods || GFX.folkHuddle)) return;
    for (const e of G.ents) if (e._f14m) e.moving = false;
  }
  function steer(dt) {
    if (!G.ents || G.state !== 'play' || !G.map) return;
    const T = (typeof ANIM !== 'undefined' ? ANIM.T : 0);
    readEnv(T);
    for (const e of G.ents) {
      if (e.kind !== 'npc') continue;
      if (e.hidden && e._f14m) { if (e.homeX != null) { e.x = e.homeX; e.y = e.homeY; } e._f14m = null; continue; }
      if (!movable(e)) { if (e._f14m) e._f14m = null; continue; }
      if (talking(e)) continue;
      const sl = slack(e);
      let mode = null, tgt = null;
      if (env.outdoor && sl && (e._f14give || 0) <= T) {
        if (GFX.folkHuddle && env.cold >= CFG.coldMin) { const f = nearestFire(e); if (f) { tgt = ringSpot(f, e); if (tgt) mode = 'huddle'; } }
        if (!mode && GFX.folkHoods && env.wet) { tgt = eaveSpot(e); if (tgt) mode = 'eave'; }
      }
      if (mode) {
        if (e._f14m !== mode) { e._f14best = null; e._f14stuck = 0; }
        e._f14m = mode;
        const dx = tgt.x - e.x, dy = tgt.y - e.y, dist = Math.hypot(dx, dy);
        if (dist > 0.12 && d2(e.x, e.y, Engine.cam.x, Engine.cam.y) > 1.2 * 1.2) {
          const sp = mode === 'eave' ? CFG.hurry : CFG.huddleSpeed, st = Math.min(dist, sp * dt);
          moveWithSlide(e, dx / dist * st, dy / dist * st, e);
          if (dist < (e._f14best == null ? 1e9 : e._f14best) - 0.04) { e._f14best = dist; e._f14stuck = 0; } else e._f14stuck = (e._f14stuck || 0) + dt;
          if (e._f14stuck > 2.5) { e._f14give = T + 25; e._f14stuck = 0; e._f14best = null; e._f14m = 'back'; }
          e._f14arrived = false;
        } else e._f14arrived = dist <= 0.12 + 0.3;
      } else if (e._f14m) {
        // conditions ended: walk back to the post, then stand down
        const hx = e.homeX, hy = e.homeY;
        if (hx == null) { e._f14m = null; continue; }
        const dx = hx - e.x, dy = hy - e.y, dist = Math.hypot(dx, dy);
        if (dist < 0.2) { e._f14m = null; e._f14arrived = false; e._f14best = e._f14best2 = null; }
        else { const st = Math.min(dist, 0.8 * dt); moveWithSlide(e, dx / dist * st, dy / dist * st, e); if (dist < (e._f14best2 == null ? 1e9 : e._f14best2) - 0.04) { e._f14best2 = dist; e._f14stuck = 0; } else e._f14stuck = (e._f14stuck || 0) + dt; if (e._f14stuck > 4) { e.x = hx; e.y = hy; e._f14m = null; e._f14best2 = null; } }
      } else if (e._tf && e.homeX != null && !e.wander && d2(e.x, e.y, e.homeX, e.homeY) > 0.5 * 0.5) {
        e._f14m = 'back';   // a restored save left them away from the post
      }
    }
    if (G.mapId === 'tavern') hettyTick(dt); else if (serve.st !== 'idle') { snapHome(serve.e); serve.e = null; }
  }

  // ------------------------------------------------------------------ the animCreature wrapper
  const stats = { ents: 0, ms: 0, timing: false, built: () => built };
  const ORIG = { animCreature, animDirectionalSprite: _dir, update, loadMap, restoreGame };   // what a page without this module runs (tests swap these in)
  const _anim = animCreature;
  animCreature = function (e, dt, T) {
    _anim(e, dt, T);
    if (e.kind !== 'npc' && e.kind !== 'enemy') return;
    if (!anyOn()) { if (e._f14k) e._f14k = 0; return; }
    const t0 = stats.timing ? now() : 0;
    try {
      readEnv(T);
      let key = 0;
      if (SWAY[e.sprite] && GFX.folkCapes) { const k = swayK(e, T, dt); key |= swayCode(k); }
      if (e.kind === 'npc') {
        const hd = hoodIdx(e, dt);
        if (hd) key |= hd << 5;
        if (GFX.folkTavern && env.mapId === 'tavern') { const sc = seatTick(e, dt, T); if (sc) key |= sc; }
        else if (e._f14s) e._f14s = null;
        // hands rubbed over a fire
        if (e._f14m === 'huddle' && e._f14arrived && GFX.folkHuddle && !reduced()) {
          const s = seedOf(e), b = Math.abs(Math.sin(T * 7 + s));
          e.animLift += 0.004 * b; e.animSkew += 0.012 * Math.sin(T * 5.5 + s); e.animSY *= 0.985;
        }
        // Hetty at a table: a lean while she sets the round down
        if (serve.e === e && serve.st === 'wait' && !reduced()) { e.animSY *= 1 - 0.02 * smooth(Math.sin(T * 3) * 0.5 + 0.5); e.animSkew += 0.02 * Math.sin(T * 2.2); }
      }
      e._f14k = key;
      stats.ents++;
    } catch (err) { e._f14k = 0; }
    if (t0) stats.ms += now() - t0;
  };

  const _update = update;
  update = function (dt) {
    try { if (anyOn()) preSteer(); } catch (err) { /* cosmetic */ }
    const r = _update(dt);
    try { if (anyOn()) steer(dt); } catch (err) { /* never break a tick */ }
    return r;
  };
  // a cut (load, travel): nobody stays mid-round or mid-huddle in a map the player is not looking at
  const _load = loadMap;
  loadMap = function (id, pos) {
    try { if (serve.e && serve.st !== 'idle') snapHome(serve.e); serve.e = null; serve.st = 'idle'; } catch (err) { /* cosmetic */ }
    return _load(id, pos);
  };
  const _restore = restoreGame;
  restoreGame = function (d) {
    const r = _restore(d);
    try { serve.e = null; serve.st = 'idle'; serve.since = 0; env.T = -1; } catch (err) { /* cosmetic */ }
    return r;
  };

  // ------------------------------------------------------------------ Options rows
  const ROWS = [
    ['folkHoods', 'Hoods in the rain', 'people outdoors pull a hood up and hurry for the eaves in rain and snow', 'folk-hoods'],
    ['folkHuddle', 'Huddling in the cold', 'idle townsfolk gather at a fire in the cold and rub their hands', 'folk-huddle'],
    ['folkCapes', 'Swaying coats and cloaks', 'coats, cloaks and robes sway as they walk and in the wind (off with Reduce motion)', 'folk-capes'],
    ['folkTavern', 'Life at the Boar', 'patrons sit, eat and drink; Hetty carries a round to a table', 'folk-tavern'],
  ];
  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) e.setAttribute(k, props[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('folk-hoods')) return;
    for (const [flag, label, hint, id] of ROWS) {
      const s = el('span', { class: 'gfx-label' }, label); s.appendChild(document.createTextNode(' ')); s.appendChild(el('small', { class: 'muted' }, hint));
      const b = el('button', { class: 'dfbtn small', id, type: 'button' }, '');
      b.setAttribute('aria-label', label);
      const sync = () => { b.textContent = GFX[flag] ? 'On' : 'Off'; b.setAttribute('aria-pressed', GFX[flag] ? 'true' : 'false'); b.classList.toggle('sel', !!GFX[flag]); };
      b.onclick = () => { setFlag(flag, !GFX[flag]); sync(); };
      sync(); grid.appendChild(s); grid.appendChild(b);
    }
  }
  loadSettings();
  if (typeof GFX !== 'undefined') GFX.onChange(() => {
    if (!mineChanging) for (const k of FOLK_FLAGS) if (stored[k] !== null && GFX[k] !== stored[k]) { stored[k] = null; saveSettings(); }   // a preset took over
  });
  if (typeof renderAccessibilityMenu === 'function') {
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { appendRows(); } catch (e) { console.warn('folk14 rows failed', e); }
      return r;
    };
  }

  return {
    CFG, SWAY, HUMAN, FLAGS: FOLK_FLAGS, ROWS, ORIG, stats, stored, setFlag, env, serve,
    readEnv, steer, preSteer, hettyTick, variant, figOf, swayCode, swayK, hoodIdx, cycle, wantSeat, canSit, movable, slack, nearestFire, ringSpot, eaveSpot, stopBeside, startServe, hettyOf, reduced,
  };
})();
if (typeof window !== 'undefined') window.FOLK14 = FOLK14;
