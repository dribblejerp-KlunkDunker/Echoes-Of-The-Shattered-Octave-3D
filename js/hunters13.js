// ============================================================
//  hunters13 — Phase 13 "The Hush comes closer", team HUNTERS: three things that hunt, or gather, or take the sound.
//
//  1. SCENT TRAILS (gameplay; switch "Scent trails", default On). The game keeps a short breadcrumb trail of where
//     you walked on THIS visit (module memory only: never in G, never in a save, cleared on a map change and on
//     loading a game). A Cacophony Hound that is chasing but has lost you (it cannot see you and cannot hear you:
//     the game's own sight and hearing tests) no longer runs straight at your real position. It puts its nose down
//     and walks your trail, crumb by crumb, a sniffing bob and a snuffling sound that comes from where it is. At the
//     end of the trail it casts about, and when its alert runs out it gives up and goes back to idle.
//
//     table: what breaks a trail (the crumbs there go cold, and a hound that reaches the break loses it)
//       wading           shallows or deep water under you (floor t_shallows / t_water): no crumbs, a break at the bank
//       a lit fire flask crumbs inside a burning patch (js/kit12.js KIT12.fires) go cold while it burns
//       a damper jar     crumbs inside a jar's zone (KIT12.zones) go cold: sound and scent both
//       strong smell     eating smoked Flume-eel (flume_eel, p12_flume_eel) or blowing the Hush-whistle: 12 s with no
//                        crumbs, and the old trail goes cold. (Other food is not strong enough; herbs are for brewing.)
//     table: why hounds do not become unbeatable or omniscient
//       decay            a crumb is cold after 25 s; the trail holds at most 40 crumbs, one every 0.7 paces
//       slow             a hound on the scent moves at 55% of its speed (walking outpaces it; standing still lets it arrive)
//       hearing          inside the Narrow's hearing range it still comes straight (a loud player is found, as before)
//       sight            inside sight (7 paces, line of sight) it chases normally, as before
//       range            further than 6 paces from every crumb it has nothing to follow: it casts about and gives up
//       one trail        it stays on the stretch of trail it first met; a break ends it, it never jumps a break
//       limit            at most 18 s on the scent after losing sight, then it is idle again
//       unchanged        Root Note / glass fear, fear of fire, nets, stun, height differences: the original code runs
//     Off = the original AI call for call (the seeded traces in test/hunters13.test.js are identical).
//
//  2. THE HUSHWARDEN'S GREY WAVE (switch "Grey wave", GFX.hushWave, default On, Original preset off). What a
//     Hushwarden's muffle does already (js/wilds.js wildsHitFx): the felted bell comes down, and half the time
//     G.mutedT = 5 and you cannot sing for five seconds. This module adds ONLY the picture and the sound of it: a
//     grey ring that expands from the warden across floor, walls and things (depth-aware: it reads the frame's depth
//     buffer like js/look10.js and js/air11.js, so what is in front hides it), colour draining as it passes and coming
//     back slowly, and every sound dipping while it passes you (the sound bus is ducked, then restored; js/kit12.js's
//     damper-jar silence has priority). No flashes (GFX.noFlash) = a softer ring and wake. Reduce motion = no ring: a
//     static grey tint that fades. Jump scares off (NERVES13.scaresAllowed() false) = the same wave, gentler.
//     Nothing about the mechanic changes: same roll, same five seconds.
//
//  3. CROWS AT BODIES (switch "Carrion crows", GFX.carrionCrows, default On). After a fight, crows fly in to settled
//     corpses (the "fall" corpses js/anim.js leaves; swarms and the Hush's dissolving things leave none), land, and
//     peck. Come close and they scatter noisily, and the scatter is a small NOISE event: idle enemies within 6.5 paces
//     (a third of that through a wall) turn to go and look, as they do for a thrown stone (game.js throwDistraction).
//     It never calls anyone to chase and adds at most +0.5 to the Narrow.
//     table: when crows come
//       outdoors only, by day only (SMALLLIFE.crowsAwake: tod 0.27-0.76; any crow still there at dusk leaves quietly)
//       not at bodies of bosses or of authored, named people (a name that is not from the game's random pool)
//       not at a body you are dragging, have hidden, or that lies in water; not within 8 paces of you
//       one to two crows a body, at most 4 on a map; the first comes 5-12 s after the body settles
//       scatter radius 1.6 + 1.1 x your speed (about 4.5 walking, 6 running, 2.7 creeping); a body whose crows were
//       scattered gets new ones no sooner than 40 s later, and only if you are 12 paces away
//     Nothing is saved: crows are transient entities of the current visit.
//
//  No Math.random: a private generator is used everywhere, so the game's RNG order is never shifted.
//  Procedural stand-in art: the crow frames are smalllife's own; the ring and the tint are drawn in code.
//  Flags: none used (the p13w_ prefix is reserved; nothing is saved).
// ============================================================
'use strict';

if (typeof GFX !== 'undefined') {
  for (const k of ['hushWave', 'carrionCrows']) {
    if (GFX[k] === undefined) GFX[k] = true;
    if (GFX.FX && !GFX.FX.includes(k)) GFX.FX.push(k);
  }
}

const HUNTERS13 = (() => {
  // ---- the one balance table -------------------------------------------------------------------------------------
  const BAL = {
    trail: {
      decay: 25, cap: 40, spacing: 0.7,        // seconds until a crumb is cold; crumbs kept; paces between crumbs
      pickRange: 6, reach: 0.5,                // how near a crumb a hound must be to find it; how near to count it reached
      speed: 0.55, maxSniff: 18, castSpeed: 0.3,
      smell: 12,                               // seconds a strong smell keeps you off the trail
      snuffle: 0.9, snuffleRange: 14,          // seconds between snuffles; how far away one is heard
    },
    wave: {
      speed: 7, maxR: 9, band: 0.9, wake: 1.7,   // paces/s; paces; ring thickness; seconds a point stays grey after the ring passes
      desat: 0.82, ring: 0.26, edge: 0.4,        // peak desaturation; ring brightness; fraction of the wake lost at the far edge
      softK: 0.55, scareK: 0.7,                  // multipliers: No flashes / jump scares off
      staticLife: 1.8, staticA: 0.5,             // Reduce motion: seconds the tint lasts; its strength
      duck: 0.55, duckRamp: 0.06, maxWaves: 3, cooldown: 1.2,
    },
    crows: {
      perBody: 2, perMap: 4, minDelay: 5, maxDelay: 12, minPlayer: 8, spawnR: [14, 20],
      speed: 5.2, scatterBase: 1.6, scatterPerSpeed: 1.1, scatterMax: 7, scatterSpeed: 7,
      noiseR: 6.5, noiseThroughWall: 0.35, investigate: 6, noiseAdd: 0.5, noiseCool: 6,
      returnDelay: 40, returnPlayer: 12, ring: 0.9, land: [0.45, 0.9],
    },
  };
  const TRACKERS = new Set(['hound']);                      // the beasts that track by scent ("other tracking beasts": none in Book One)
  const SMELL_ITEMS = new Set(['flume_eel', 'p12_flume_eel']);
  const KEY = 'octave.hunters13.v1';
  const set = { trail: true, wave: true, crows: true };    // wave and crows mirror GFX.hushWave / GFX.carrionCrows
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const TAU = Math.PI * 2;
  const stats = { crumbs: 0, sniffs: 0, snuffles: 0, breaks: 0, losts: 0, waves: 0, wavePixels: 0, waveMs: 0, waveCalls: 0, ducks: 0, crowsLanded: 0, scatters: 0, alerted: 0, errors: 0, captions: 0 };

  // a private generator: the game's Math.random stream is never touched
  let rs = 0x1357acd1;
  const prnd = () => { rs = (rs + 0x6D2B79F5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let T = 0;                                                 // seconds of play (advances only while G.state === 'play')
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player && typeof Engine !== 'undefined';
  const here = () => (hasG() ? G.mapId : null);
  const reduced = () => !!(typeof GFX !== 'undefined' && (GFX.reduceMotion || GFX.reducedMotion));
  const calm = () => !!(typeof GFX !== 'undefined' && GFX.noFlash);
  const scaresOK = () => { try { return !(typeof window !== 'undefined' && window.NERVES13 && typeof window.NERVES13.scaresAllowed === 'function') || ![false, 'off'].includes(window.NERVES13.scaresAllowed()); } catch (e) { return true; } };

  // ---- strings (every one listed in P13-HUNTERS/TEXT.md, French in tools/i18n/p13-hunters.tsv) [PROPOSED] --------
  const TXT = {
    sniffMsg: 'Something is working your trail, nose down, a few paces behind.',
    crowsMsg: 'Crows have found what is left.',
    capSnuffle: '[Snuffling nearby]',
    capWings: '[Wings clatter]',
    capWave: '[The sound drains away]',
    optHead: 'The Hush comes closer: hunters',
    optTrail: 'Scent trails', optTrailHint: 'hounds that lose sight of you follow your recent steps, slowly, instead of knowing where you are',
    optWave: 'Grey wave', optWaveHint: 'a Hushwarden\'s muffling spreads as a grey ring and sound dips; Reduce motion keeps a still tint',
    optCrows: 'Carrion crows', optCrowsHint: 'crows gather at bodies by day, and scatter noisily when you come near',
    on: 'On', off: 'Off',
  };

  // ---- persistence of the three switches -------------------------------------------------------------------------
  function loadSet() {
    let had = false;
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of ['trail', 'wave', 'crows']) if (typeof o[k] === 'boolean') { set[k] = o[k]; had = true; }
    } catch (e) { /* storage blocked: defaults */ }
    if (typeof GFX !== 'undefined') {
      if (had) { GFX.hushWave = set.wave; GFX.carrionCrows = set.crows; } else { set.wave = !!GFX.hushWave; set.crows = !!GFX.carrionCrows; }
    }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) { /* optional */ } }
  const waveOn = () => !!(set.wave && (typeof GFX === 'undefined' || GFX.hushWave));
  const crowsOn = () => !!(set.crows && (typeof GFX === 'undefined' || GFX.carrionCrows));

  // ================================================================ sound helpers (positional, private)
  let noiseBuf = null;
  function noise() {
    const ctx = Audio_.ctx; if (!ctx) return null;
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const n = (ctx.sampleRate * 0.6) | 0, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    let s = 0x5eed1234; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
    return (noiseBuf = b);
  }
  // a filtered noise burst that seems to come from (x, y): gain by distance, a low-pass for walls, a pan by bearing
  function playAt(x, y, o) {
    try {
      if (typeof Audio_ === 'undefined' || !Audio_.ctx || !Audio_.sfxBus || Audio_.muted || !hasG()) return false;
      const ctx = Audio_.ctx, buf = noise(); if (!buf) return false;
      const c = Engine.cam, dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
      let gain = d <= 2.5 ? 1 : Math.max(0.06, 1 / (1 + Math.pow((d - 2.5) / 6, 1.6))), pan = 0, cut = 9000;
      if (typeof SPATIAL !== 'undefined' && SPATIAL.mix) {
        const w = SPATIAL.wallsBetween ? SPATIAL.wallsBetween(G.map, x, y, c.x, c.y) : 0, m = SPATIAL.mix({ x: c.x, y: c.y, dir: c.dir }, { x, y }, w);
        gain = m.gain; pan = m.pan; cut = m.cutoff;
      }
      const vol = (o.vol || 0.1) * gain; if (vol < 0.004) return false;
      const t0 = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = o.type || 'bandpass'; f.Q.value = o.q || 1.4; f.frequency.setValueAtTime(o.f0 || 1200, t0);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + o.dur);
      lp.type = 'lowpass'; lp.frequency.value = Math.max(400, cut);
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.03, o.dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
      src.connect(f); f.connect(lp); lp.connect(g);
      let tail = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -0.75, 0.75); g.connect(p); tail = p; }
      tail.connect(Audio_.sfxBus);
      src.start(t0, prnd() * 0.3); src.stop(t0 + o.dur + 0.05);
      return true;
    } catch (e) { return false; }
  }
  // a line in the Sound captions box (written the way access.js writes its own; only when captions are on)
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
  const say = (t, kind, ms) => { try { if (typeof msg === 'function') msg(t, kind || '', ms || 3500); } catch (e) { /* ignore */ } };

  // ================================================================ 1. SCENT TRAILS
  const trail = [];                    // { id, x, y, t, seg, broken }  oldest first; module memory only
  let crumbId = 0, trailSeg = 0, smellUntil = -1, trailMap = null, sniffMsgShown = false, crowMsgShown = false;
  const sn = new WeakMap();            // hound -> { id, seg, t0, castT, snT, end, lost, stuck, dir }

  function clearTrail() { trail.length = 0; trailSeg++; smellUntil = -1; trailMap = null; }
  const wet = (x, y) => { try { return typeof waterLvl === 'function' && waterLvl(x, y) >= 1; } catch (e) { return false; } };
  function breakerAt(x, y) {
    if (typeof KIT12 === 'undefined' || !KIT12) return false;
    const m = here();
    for (const f of KIT12.fires || []) if (f.map === m && (x - f.x) ** 2 + (y - f.y) ** 2 <= (f.r + 0.3) ** 2) return 'fire';
    for (const z of KIT12.zones || []) if (z.map === m && (x - z.x) ** 2 + (y - z.y) ** 2 <= z.r * z.r) return 'jar';
    return false;
  }
  function pushBreak(c, why) {
    const last = trail[trail.length - 1];
    if (last && last.broken) return;
    trail.push({ id: ++crumbId, x: c.x, y: c.y, t: T, seg: trailSeg, broken: why }); trailSeg++; stats.breaks++;
    if (trail.length > BAL.trail.cap) trail.shift();
  }
  // every update, before the foes move: lay a crumb, let the old ones go cold, cool the ones under a fire or a jar
  function layTrail() {
    const c = Engine.cam, B = BAL.trail;
    if (trailMap !== G.map) { trail.length = 0; trailSeg++; trailMap = G.map; }
    while (trail.length && T - trail[0].t > B.decay) trail.shift();
    if (typeof KIT12 !== 'undefined' && KIT12 && ((KIT12.fires && KIT12.fires.length) || (KIT12.zones && KIT12.zones.length))) {
      for (const q of trail) if (!q.broken) { const w = breakerAt(q.x, q.y); if (w) { q.broken = w; stats.breaks++; } }
    }
    let why = false;
    if (wet(c.x, c.y)) why = 'water'; else if (T < smellUntil) why = 'smell'; else why = breakerAt(c.x, c.y);
    if (why) { pushBreak(c, why); return; }
    const last = trail[trail.length - 1];
    if (last && !last.broken && Math.hypot(c.x - last.x, c.y - last.y) < B.spacing) return;
    trail.push({ id: ++crumbId, x: c.x, y: c.y, t: T, seg: trailSeg, broken: false }); stats.crumbs++;
    if (trail.length > B.cap) trail.shift();
  }
  const crumbById = (id) => { if (!trail.length) return null; const i = id - trail[0].id; return i >= 0 && i < trail.length && trail[i].id === id ? trail[i] : null; };
  function nearestCrumb(e) {
    const B = BAL.trail; let best = null, bd = B.pickRange * B.pickRange;
    for (const q of trail) {
      if (q.broken || T - q.t > B.decay) continue;
      const d = (q.x - e.x) ** 2 + (q.y - e.y) ** 2;
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }
  // the game's own sight and hearing tests (game.js enemyUpdate), so "lost you" means exactly what the AI means by it
  function senses(e) {
    const c = Engine.cam, d = e.def, dx = c.x - e.x, dy = c.y - e.y, dist = Math.sqrt(dx * dx + dy * dy);
    const fx = typeof UPG !== 'undefined' && UPG.weatherFx ? UPG.weatherFx : null;
    const canSee = dist < 7 * (fx ? fx.sight : 1) && typeof los === 'function' && los(e.x, e.y, c.x, c.y);
    const hear = (1.5 + G.noise * (d.noiseLure ? 1.4 : 0.8) + (G.flags && G.flags.thread_kept && d.cacophony ? 0.8 : 0)) * (fx ? fx.hear : 1);
    return { dx, dy, dist, canSee, hear };
  }
  function onScent(e) {
    if (!set.trail || !hasG() || G.state !== 'play' || G.dead) return false;
    if (e.kind !== 'enemy' || !TRACKERS.has(e.type) || e.dead || e.hidden || e.state !== 'chase' || !e.def) return false;
    if (e.stun > 0 || e._p12net > 0 || e.passive) return false;
    if (e._tg || (typeof GFX !== 'undefined' && GFX.telegraphs && e._tgSeen !== true)) return false;   // a new arrival makes its entrance first (js/telegraphs.js)
    return true;
  }
  // returns true when this call moved the hound (the original AI is then skipped)
  function sniffStep(e, dt) {
    if (!onScent(e)) { if (sn.has(e)) sn.delete(e); return false; }
    const d = e.def, p = G.player, s = senses(e);
    if (s.canSee || s.dist < s.hear) { sn.delete(e); return false; }                          // sight or hearing: the original chase
    if (d.cacophony && !d.fearless && ((p.glassed && G.glassLock <= 0) || G.rootWard > 0)) { sn.delete(e); return false; }
    if (typeof feetOf === 'function' && typeof MELEE_RISE !== 'undefined' && Math.abs(feetOf(e) - feetOf(p)) > MELEE_RISE) { sn.delete(e); return false; }
    let S = sn.get(e);
    if (!S) {
      S = { id: -1, seg: -1, t0: T, castT: 0, snT: 0.3, end: false, lost: false, stuck: 0, dir: prnd() * TAU }; sn.set(e, S); stats.sniffs++;
      if (!sniffMsgShown) { sniffMsgShown = true; say(TXT.sniffMsg, 'warn', 4200); }
    }
    // the scent runs out: the alert counts down (as it does when the original cannot see you) and the trail has a limit
    e.alertT = (e.alertT || 0) - dt;
    if (e.alertT <= 0 || T - S.t0 > BAL.trail.maxSniff) { e.state = 'idle'; sn.delete(e); stats.losts++; return false; }
    let sp = d.speed * BAL.trail.speed; if (e.slowed) sp *= 0.6;
    let tx = null, ty = null;
    if (S.id < 0 && !S.lost) {
      const q = nearestCrumb(e);
      if (q) { S.id = q.id; S.seg = q.seg; } else S.lost = true;                                // nothing within range: nothing to follow
    }
    if (S.id >= 0 && !S.end) {
      let q = crumbById(S.id);
      if (!q || q.broken || T - q.t > BAL.trail.decay) { S.end = true; }
      else {
        if ((q.x - e.x) ** 2 + (q.y - e.y) ** 2 < BAL.trail.reach ** 2) {
          const nx = crumbById(S.id + 1);
          if (nx && !nx.broken && nx.seg === S.seg && T - nx.t <= BAL.trail.decay) { S.id = nx.id; q = nx; } else S.end = true;
        }
        if (!S.end) { tx = q.x; ty = q.y; }
      }
    }
    if (tx !== null) {
      const dx = tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy) || 1;
      if (breakerAt(e.x + dx / dd * sp * dt * 6, e.y + dy / dd * sp * dt * 6) === 'fire') { S.end = true; return true; }   // a hound does not walk into a fire, even after a scent
      const ok = moveWithSlide(e, dx / dd * sp * dt, dy / dd * sp * dt, e);
      e.facing = Math.atan2(dy, dx);
      if (!ok) { S.stuck += dt; if (S.stuck > 1.2) { const nx = crumbById(S.id + 1); if (nx && nx.seg === S.seg && !nx.broken) { S.id = nx.id; S.stuck = 0; } else S.end = true; } } else S.stuck = 0;
    } else {
      // at the end of the scent, or with none: cast about slowly in a small ring; the alert runs down twice as fast
      S.castT += dt; S.dir += dt * 1.7;
      const cs = d.speed * BAL.trail.castSpeed * 0.5;
      moveWithSlide(e, Math.cos(S.dir) * cs * dt, Math.sin(S.dir) * cs * dt, e);
      e.alertT -= dt;
    }
    S.snT -= dt;
    if (S.snT <= 0) {
      S.snT = BAL.trail.snuffle;
      if (s.dist < BAL.trail.snuffleRange) { stats.snuffles++; snuffle(e); }
    }
    return true;
  }
  function snuffle(e) {
    const quiet = !scaresOK();
    // two short wet pulls of breath, a little apart
    playAt(e.x, e.y, { type: 'bandpass', f0: 1500, f1: 2300, q: 1.2, dur: 0.1, vol: quiet ? 0.07 : 0.13 });
    setTimeout(() => playAt(e.x, e.y, { type: 'bandpass', f0: 1100, f1: 2000, q: 1.2, dur: 0.11, vol: quiet ? 0.06 : 0.11 }), 140);
    capLine(TXT.capSnuffle);
  }
  // a strong smell: eating smoked eel, or blowing the Hush-whistle
  function strongSmell() { smellUntil = T + BAL.trail.smell; trail.length = 0; trailSeg++; }
  function wrapUse() {
    if (typeof useItem !== 'function') return;
    const _ui = useItem;
    useItem = function (slot) {
      let id = null, count = 0;
      try { id = slot && slot.id; if (id && hasG() && (SMELL_ITEMS.has(id) || (ITEMS[id] && ITEMS[id].use === 'whistle'))) count = G.count(id); } catch (e) { id = null; }
      const r = _ui.apply(this, arguments);
      try {
        if (id && count > 0) {
          if (SMELL_ITEMS.has(id) && G.count(id) < count) strongSmell();
          else if (ITEMS[id] && ITEMS[id].use === 'whistle' && G.whistleT > 20) strongSmell();
        }
      } catch (e) { /* ignore */ }
      return r;
    };
  }

  // ================================================================ 2. THE GREY WAVE
  const waves = [];                    // { x, y, map, t0, soft, still, gentle }
  let waveReadyAt = -1, duckNow = 1, duckLive = false;
  function startWave(x, y, o) {
    if (!hasG()) return null;
    o = o || {};
    if (!waveOn() && !o.force) return null;
    const w = { x, y, map: here(), t0: T, soft: calm(), still: reduced(), gentle: !scaresOK() };
    waves.push(w); if (waves.length > BAL.wave.maxWaves) waves.shift();
    stats.waves++;
    playAt(x, y, { type: 'lowpass', f0: 900, f1: 120, q: 0.7, dur: 0.7, vol: w.gentle ? 0.09 : 0.16 });
    capLine(TXT.capWave);
    return w;
  }
  const waveLife = (w) => (w.still ? BAL.wave.staticLife : BAL.wave.maxR / BAL.wave.speed + BAL.wave.wake);
  const waveR = (w, now) => clamp((now - w.t0) * BAL.wave.speed, 0, BAL.wave.maxR + BAL.wave.band);
  // the greyness at a distance d from the source, at wave time `age`, 0..1 (also what the duck follows at the player)
  function greyAt(w, d, age) {
    const W = BAL.wave;
    if (w.still) return W.staticA * clamp(1 - age / W.staticLife, 0, 1) * (1 - smooth(W.maxR * 0.6, W.maxR * 1.1, d)) * (w.gentle ? W.scareK : 1);
    const R = age * W.speed, delta = R - d;
    if (delta < -W.band * 0.5 || d > W.maxR + W.band) return 0;
    const tp = delta / W.speed;                                                                // seconds since the ring passed this point
    let a = smooth(-W.band * 0.5, W.band * 0.5, delta) * clamp(1 - tp / W.wake, 0, 1);
    a *= 1 - W.edge * smooth(0, W.maxR, d);
    return a * W.desat * (w.soft ? W.softK : 1) * (w.gentle ? W.scareK : 1);
  }
  function tickWaves() {
    for (let i = waves.length - 1; i >= 0; i--) if (T - waves[i].t0 > waveLife(waves[i]) || waves[i].map !== here()) waves.splice(i, 1);
    updateDuck();
  }
  function duckWanted() {
    if (!waves.length || !hasG()) return 1;
    const c = Engine.cam; let k = 0;
    for (const w of waves) { const d = Math.hypot(c.x - w.x, c.y - w.y), g = greyAt(w, d, T - w.t0); if (g > k) k = g; }
    return 1 - BAL.wave.duck * clamp(k / BAL.wave.desat, 0, 1) * (!scaresOK() ? BAL.wave.scareK : 1);
  }
  function updateDuck() {
    const want = duckWanted();
    duckNow = want;
    try {
      if (typeof Audio_ === 'undefined' || !Audio_.ctx || !Audio_.sfxBus || !Audio_.sfxBus.gain) return;
      if (typeof KIT12 !== 'undefined' && KIT12 && KIT12.audioMuted) return;                    // a damper jar's silence has priority
      const g = Audio_.sfxBus.gain, t = Audio_.ctx.currentTime;
      if (want < 0.999) {
        duckLive = true; stats.ducks++;
        g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(want, t + BAL.wave.duckRamp);
      } else if (duckLive) {
        duckLive = false; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1, t + 0.35);
      }
    } catch (e) { /* audio optional */ }
  }
  function resetDuck() {
    duckNow = 1;
    try {
      if (duckLive && typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && Audio_.sfxBus.gain && !(typeof KIT12 !== 'undefined' && KIT12 && KIT12.audioMuted)) {
        const g = Audio_.sfxBus.gain, t = Audio_.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(1, t + 0.2);
      }
    } catch (e) { /* ignore */ }
    duckLive = false;
  }
  // the picture: a post hook after the frame has its depth and material buffers (look10 / air11 pattern).
  // The radial profile (greyness, ring light) is tabulated against distance squared once per wave per frame, so a pixel costs a
  // few multiplies and two lookups, not a square root and three smoothsteps.
  const TAB_N = 512, tabA = new Float32Array(TAB_N), tabL = new Float32Array(TAB_N);
  function drawWaves(F) {
    if (!waves.length || !waveOn() || !F || !F.fb || !F.dbuf || !F.mbuf || !F.map) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const W = BAL.wave, w = F.w, h = F.h, fb = F.fb, dbuf = F.dbuf, mbuf = F.mbuf, camx = F.cam.x, camy = F.cam.y;
    const dirX = F.dirX, dirY = F.dirY, planeX = F.planeX, planeY = F.planeY;
    let px = 0;
    for (const wv of waves) {
      if (wv.map !== here()) continue;
      const age = T - wv.t0, ring = wv.still ? 0 : W.ring * (wv.soft ? W.softK * 0.5 : 1) * (wv.gentle ? W.scareK : 1);
      const R = waveR(wv, T), outer = wv.still ? W.maxR * 1.1 : Math.min(W.maxR + W.band, R + W.band * 0.5), outer2 = outer * outer, sx = wv.x, sy = wv.y;
      const k2 = (TAB_N - 1) / outer2;
      for (let i = 0; i < TAB_N; i++) {
        const d = Math.sqrt(i / k2);
        tabA[i] = greyAt(wv, d, age);
        if (ring > 0) { const dl = (R - d) / (W.band * 0.5); tabL[i] = ring * Math.exp(-dl * dl) * (1 - 0.5 * d / W.maxR); } else tabL[i] = 0;
      }
      for (let x = 0; x < w; x++) {
        const cx = 2 * x / w - 1, rdx = dirX + planeX * cx, rdy = dirY + planeY * cx;
        const bx = camx - sx, by = camy - sy;
        for (let y = 0, o = x; y < h; y++, o += w) {
          const m = mbuf[o]; if (m === 1 || m === 0) continue;
          const t = dbuf[o]; if (t > 1e8) continue;
          const ddx = bx + t * rdx, ddy = by + t * rdy, d2 = ddx * ddx + ddy * ddy;
          if (d2 > outer2) continue;
          const ti = (d2 * k2) | 0, a = tabA[ti], lift = tabL[ti];
          if (a <= 0.004 && lift <= 0.004) continue;
          const p = fb[o], r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255;
          const gr = ((r * 77 + g * 150 + b * 29) >> 8) * 0.9;
          let nr = r + (gr - r) * a, ng = g + (gr - g) * a, nb = b + (gr - b) * a;
          if (lift > 0) { nr += (200 - nr) * lift; ng += (200 - ng) * lift; nb += (196 - nb) * lift; }
          fb[o] = (p & 0xff000000) | ((nb < 0 ? 0 : nb > 255 ? 255 : nb | 0) << 16) | ((ng < 0 ? 0 : ng > 255 ? 255 : ng | 0) << 8) | (nr < 0 ? 0 : nr > 255 ? 255 : nr | 0);
          px++;
        }
      }
    }
    stats.wavePixels = px;
    if (t0) { stats.waveMs = performance.now() - t0; stats.waveCalls++; }
  }

  // ================================================================ 3. CROWS AT BODIES
  const crows = [];                    // entities (deco, transient): { _c13: { st, body, ... } }
  const bodyInfo = new WeakMap();      // corpse -> { settledAt, delay, crows, lastScatter, noiseAt, returnAt, want }
  const srcInfo = new WeakMap();       // ghost corpse -> { sensitive }
  let crowCheck = 0, lastCam = null, camSpeed = 0;
  const crowLand = (b) => { const A = BAL.crows.land, a = prnd() * TAU, r = A[0] + prnd() * (A[1] - A[0]); return [b.x + Math.cos(a) * r, b.y + Math.sin(a) * r]; };
  function openGround(x, y) {
    try {
      const m = G.map; if (!m || x < 1 || y < 1 || x >= m.w - 1 || y >= m.h - 1) return false;
      if (m.isBlocked(x | 0, y | 0)) return false;
      if (typeof waterLvl === 'function' && waterLvl(x, y) > 0) return false;
      return !solidAt(x, y, null);
    } catch (e) { return false; }
  }
  // is this a body crows may come to? (the rules in the table at the top)
  function eligibleBody(b) {
    if (!b || !b.corpse || b.dead || b.hidden || b.stashedIn || b.kind !== 'deco') return false;
    if (typeof G !== 'undefined' && G.dragBody === b) return false;
    const si = srcInfo.get(b); if (si && si.sensitive) return false;
    if (typeof waterLvl === 'function' && waterLvl(b.x, b.y) > 0) return false;
    return true;
  }
  function sensitiveSource(src) {
    if (!src) return false;
    const d = src.def || {};
    if (d.boss || d.wildsBoss || d.rally) return true;
    if (src.name && typeof NAMES_POOL !== 'undefined' && Array.isArray(NAMES_POOL) && !NAMES_POOL.includes(src.name)) return true;   // an authored name
    if (src.story || src.quest) return true;
    return false;
  }
  function daylight() { try { return typeof SMALLLIFE !== 'undefined' && SMALLLIFE.crowsAwake ? !!SMALLLIFE.crowsAwake() : (G.tod > 0.27 && G.tod < 0.76); } catch (e) { return false; } }
  const crowsHere = () => crows.filter(c => c._c13 && c._c13.map === G.map);
  function makeCrow(x, y, body, fromX, fromY) {
    const e = { kind: 'deco', sprite: 'crow_stand', x: fromX, y: fromY, scale: 0.36, solid: false, radius: 0.1, nopick: true, transient: true, _decor: true, label: 'A crow',
      animSprite: 'crow_fly1', animFlip: false,
      _c13: { map: G.map, st: 'in', body, x0: fromX, y0: fromY, tx: x, ty: y, fp: 0, fl: 0, dur: 1, alt: 1.4 + prnd() * 0.7, lift: 0, ph: prnd() * 6, t: 1 + prnd() * 2, flip: false, vx: 0, vy: 0 } };
    const s = e._c13, d = Math.hypot(x - fromX, y - fromY); s.dur = Math.max(1.2, d / BAL.crows.speed);
    G.ents.push(e); crows.push(e);
    const bi = bodyInfo.get(body); if (bi) bi.crows++;
    return e;
  }
  function removeCrow(e) {
    const i = crows.indexOf(e); if (i >= 0) crows.splice(i, 1);
    const j = G.ents ? G.ents.indexOf(e) : -1; if (j >= 0) G.ents.splice(j, 1);
    if (typeof G !== 'undefined' && G.maps) for (const id in G.maps) { const L = G.maps[id].entities; if (L && L !== G.ents) { const k = L.indexOf(e); if (k >= 0) L.splice(k, 1); } }
    if (e._c13 && e._c13.body) { const bi = bodyInfo.get(e._c13.body); if (bi && bi.crows > 0) bi.crows--; }
  }
  function clearCrows() { for (let i = crows.length - 1; i >= 0; i--) removeCrow(crows[i]); crows.length = 0; }
  function faceTo(e, dx, dy) {
    const c = Engine.cam, across = dx * -Math.sin(c.dir) + dy * Math.cos(c.dir);
    if (across < -0.05) e._c13.flip = true; else if (across > 0.05) e._c13.flip = false;
  }
  function leave(e, quietly) {
    const s = e._c13; Object.assign(s, { st: 'out', x0: e.x, y0: e.y, tx: e.x + 24, ty: e.y - 20, fp: 0, fl: 0, dur: 5, alt: 1.6 }); if (quietly) s.quiet = true;
  }
  // the scatter is a small noise event: idle foes near it turn to look (the same rule and fields as a thrown stone)
  function crowNoise(x, y) {
    const B = BAL.crows; let heard = 0;
    for (const e of G.ents) {
      const enemy = e.kind === 'enemy' && e.def && !e.def.boss && !e.def.wildsBoss && !['wearer', 'weaver', 'pressman', 'aegis', 'horn'].includes(e.type);
      if (!enemy || e.dead || e.hidden || e.passive || e.state === 'passive' || e.state === 'chase' || (e.investigation && e.investigation.source === 'body') || e.stun > 0) continue;
      const range = B.noiseR * (typeof los === 'function' && los(e.x, e.y, x, y) ? 1 : B.noiseThroughWall);
      if ((e.x - x) ** 2 + (e.y - y) ** 2 > range * range) continue;
      e.investigation = { x, y, left: B.investigate }; e.state = 'investigate'; heard++;
    }
    const c = Engine.cam;
    if (Math.hypot(c.x - x, c.y - y) < 5) addNoise(B.noiseAdd);
    stats.alerted += heard;
    return heard;
  }
  function scatterBody(body) {
    const B = BAL.crows, bi = bodyInfo.get(body), mine = crows.filter(c => c._c13 && c._c13.body === body && (c._c13.st === 'peck' || c._c13.st === 'hop'));
    if (!mine.length) return;
    const c = Engine.cam; let k = 0;
    for (const e of mine) {
      const s = e._c13, away = Math.atan2(e.y - c.y, e.x - c.x) + (prnd() - 0.5) * 1.1, far = 26 + prnd() * 6;
      Object.assign(s, { st: 'out', x0: e.x, y0: e.y, tx: e.x + Math.cos(away) * far, ty: e.y + Math.sin(away) * far, fp: -k * 0.08, fl: 0, dur: far / (B.scatterSpeed * (0.9 + prnd() * 0.2)), alt: 1.8 + prnd() * 0.8 });
      k++;
    }
    stats.scatters++;
    if (bi) { bi.lastScatter = T; bi.returnAt = T + B.returnDelay; }
    // wings clatter near, one caw: sounds, so they respect jump scares; the noise event is the point
    const ex = mine[0].x, ey = mine[0].y, gentle = !scaresOK();
    playAt(ex, ey, { type: 'highpass', f0: 2600, q: 0.6, dur: gentle ? 0.28 : 0.42, vol: gentle ? 0.07 : 0.16 });
    if (!gentle) { try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.bird) Audio_.sfx.bird(); } catch (e) { /* optional */ } }
    capLine(TXT.capWings);
    if (!bi || bi.noiseAt == null || T - bi.noiseAt >= B.noiseCool) { if (bi) bi.noiseAt = T; crowNoise(ex, ey); }
  }
  function tickCrows(dt) {
    const B = BAL.crows, c = Engine.cam;
    if (!hasG()) return;
    const on = crowsOn() && G.map.outdoor && daylight();
    // arrivals: look at the settled bodies twice a second
    crowCheck -= dt;
    if (crowCheck <= 0) {
      crowCheck = 0.5;
      if (on) {
        let budget = B.perMap - crowsHere().length;
        for (const b of G.ents) {
          if (budget <= 0) break;
          if (!b.corpse || !eligibleBody(b)) continue;
          let bi = bodyInfo.get(b);
          if (!bi) { bi = { settledAt: T, delay: B.minDelay + prnd() * (B.maxDelay - B.minDelay), crows: 0, lastScatter: -99, noiseAt: null, returnAt: -1, want: prnd() < 0.5 ? 1 : 2 }; bodyInfo.set(b, bi); }
          if (bi.crows >= Math.min(B.perBody, bi.want) || T - bi.settledAt < bi.delay || T < bi.returnAt) continue;
          const pd = Math.hypot(b.x - c.x, b.y - c.y);
          if (pd < B.minPlayer || (bi.lastScatter > 0 && pd < B.returnPlayer)) continue;
          // a take-off point out in the air, well away from both the body and the player
          let from = null;
          for (let k = 0; k < 12 && !from; k++) {
            const a = prnd() * TAU, r = B.spawnR[0] + prnd() * (B.spawnR[1] - B.spawnR[0]), x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
            if (x < 0.5 || y < 0.5 || x > G.map.w - 0.5 || y > G.map.h - 0.5 || Math.hypot(x - c.x, y - c.y) < 6) continue;
            from = [x, y];
          }
          if (!from) continue;
          let land = null; for (let k = 0; k < 8 && !land; k++) { const q = crowLand(b); if (openGround(q[0], q[1])) land = q; }
          if (!land) { bi.delay += 5; continue; }
          makeCrow(land[0], land[1], b, from[0], from[1]); budget--;
          if (!crowMsgShown) { crowMsgShown = true; say(TXT.crowsMsg, '', 3500); }
        }
      }
    }
    // each crow
    // your speed: the eased velocity the game keeps, or what the camera actually covered (whichever says more)
    const inst = lastCam && lastCam.map === G.map ? Math.min(8, Math.hypot(c.x - lastCam.x, c.y - lastCam.y) / Math.max(dt, 1e-3)) : 0;
    lastCam = { x: c.x, y: c.y, map: G.map }; camSpeed += (inst - camSpeed) * Math.min(1, dt * 10);
    const v = Math.max(camSpeed, G.vel ? Math.hypot(G.vel.x, G.vel.y) : 0), R = clamp(B.scatterBase + B.scatterPerSpeed * v, B.scatterBase, B.scatterMax);
    const toScatter = new Set();
    for (let i = crows.length - 1; i >= 0; i--) {
      const e = crows[i], s = e._c13;
      if (!s || s.map !== G.map) continue;
      if (G.ents.indexOf(e) < 0) G.ents.push(e);                                                // another module swept transients: put it back
      const dist = Math.hypot(e.x - c.x, e.y - c.y);
      if (s.st === 'in') {
        s.fp += dt / s.dur; s.fl += dt;
        const u = clamp(s.fp, 0, 1);
        e.x = s.x0 + (s.tx - s.x0) * u; e.y = s.y0 + (s.ty - s.y0) * u; s.lift = s.alt * Math.pow(Math.sin(Math.PI * u), 0.55) * (1 - u * 0.2);
        faceTo(e, s.tx - s.x0, s.ty - s.y0);
        if (!eligibleBody(s.body) || !daylight() || !crowsOn()) { leave(e, true); continue; }
        if (s.fp >= 1) { s.st = 'peck'; s.lift = 0; s.t = 1.2 + prnd() * 2; stats.crowsLanded++; }
      } else if (s.st === 'out') {
        s.fp += dt / s.dur; s.fl += dt;
        if (s.fp >= 0) {
          const u = clamp(s.fp, 0, 1);
          e.x = s.x0 + (s.tx - s.x0) * u; e.y = s.y0 + (s.ty - s.y0) * u; s.lift = s.alt * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.6)), 0.5);
          faceTo(e, s.tx - s.x0, s.ty - s.y0);
        }
        if (s.fp >= 1) { removeCrow(e); continue; }
      } else {                                                                                  // peck / hop at the body
        const b = s.body;
        if (!eligibleBody(b) || !daylight() || !crowsOn()) { leave(e, true); continue; }       // dusk, or the body is gone: a quiet departure
        if (dist < R) { toScatter.add(b); continue; }
        s.ph += dt * 5; s.t -= dt;
        if (s.st === 'peck' && s.t <= 0) { s.st = 'hop'; s.t = 0.5 + prnd() * 0.8; const a = prnd() * TAU; s.vx = Math.cos(a); s.vy = Math.sin(a); }
        else if (s.st === 'hop') {
          const nx = e.x + s.vx * 0.8 * dt, ny = e.y + s.vy * 0.8 * dt;
          if (Math.hypot(nx - b.x, ny - b.y) < B.ring && openGround(nx, ny)) { e.x = nx; e.y = ny; faceTo(e, s.vx, s.vy); } else s.t = 0;
          if (s.t <= 0) { s.st = 'peck'; s.t = 1.2 + prnd() * 2.2; }
        }
        s.lift = 0;
      }
    }
    for (const b of toScatter) scatterBody(b);
  }
  function lookCrow(e) {
    const s = e._c13; if (!s) return;
    e.animFlip = s.flip; e.animLift = s.lift;
    const rm = reduced();
    if (s.st === 'in' || (s.st === 'out' && s.fp >= 0)) { e.animSprite = ['crow_fly1', 'crow_fly2', 'crow_fly3', 'crow_fly2'][((s.fl * (rm ? 4 : 9)) | 0) & 3]; e.animSkew = (s.fl % 0.3 < 0.15 ? 1 : -1) * 0.02; }
    else if (s.st === 'out') e.animSprite = 'crow_stand';
    else if (s.st === 'hop') e.animSprite = ((s.ph | 0) & 1) ? 'crow_w1' : 'crow_w2';
    else e.animSprite = (Math.sin(s.ph) > 0.15 && !rm) || (rm && s.t > 1) ? 'crow_peck' : 'crow_stand';
  }

  // ================================================================ wiring
  function wire() {
    // the hounds: the one place the AI is touched, and only for a hound that is on the scent
    if (typeof enemyUpdate === 'function') {
      const _eu = enemyUpdate;
      enemyUpdate = function (e, dt) {
        if (set.trail && e && e.kind === 'enemy') {
          let moved = false;
          try { moved = sniffStep(e, dt); } catch (err) { stats.errors++; moved = false; sn.delete(e); }
          if (moved) return undefined;
        }
        return _eu.apply(this, arguments);
      };
    }
    // the sniffing bob (after the creature-life fidgets, so it wins while the hound has its nose down)
    if (typeof animCreature === 'function') {
      const _ac = animCreature;
      animCreature = function (e, dt, TT) {
        _ac.apply(this, arguments);
        try {
          const S = e && e.kind === 'enemy' ? sn.get(e) : null;
          if (S && !e.dead && !e.dying && !e.corpse) {
            const ph = (typeof TT === 'number' ? TT : T) * 9 + (e.x + e.y) * 3, dip = reduced() ? 0.6 : 0.5 + 0.5 * Math.sin(ph);
            e.animSY = (e.animSY == null ? 1 : e.animSY) - 0.08 * dip; e.animSX = (e.animSX == null ? 1 : e.animSX) + 0.04 * dip;
            e.animLift = (e.animLift || 0) - 0.012 * dip; e.animSkew = (e.animSkew || 0) + 0.04 * dip;
          }
        } catch (err) { /* animation must never break a frame */ }
      };
    }
    // the crows' wing frames and lift (smalllife applies its own only to critters it owns)
    if (typeof animDeco === 'function') {
      const _ad = animDeco;
      animDeco = function (e) {
        _ad.apply(this, arguments);
        try { if (e && e._c13) lookCrow(e); } catch (err) { /* ignore */ }
      };
    }
    // who a corpse was: remembered when it falls, so named and story bodies are left alone
    if (typeof animSpawnDeath === 'function') {
      const _asd = animSpawnDeath;
      animSpawnDeath = function (src) {
        const g = _asd.apply(this, arguments);
        try { if (g && typeof g === 'object') srcInfo.set(g, { sensitive: sensitiveSource(src), type: src && src.type }); } catch (err) { /* ignore */ }
        return g;
      };
    }
    // the hit that muffles: the wave starts where the warden stands (the mechanic itself is wilds.js's, untouched)
    if (typeof wildsHitFx === 'function') {
      const _wh = wildsHitFx;
      wildsHitFx = function (e, d) {
        const before = G.mutedT || 0;
        const r = _wh.apply(this, arguments);
        try { if (d && d.mute && (G.mutedT || 0) > before + 0.01 && T >= waveReadyAt) { waveReadyAt = T + BAL.wave.cooldown; startWave(e.x, e.y); } } catch (err) { stats.errors++; }
        return r;
      };
    }
    wrapUse();
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () {
        try { clearTrail(); waves.length = 0; resetDuck(); clearCrows(); crowCheck = 0; sniffMsgShown = false; } catch (err) { /* nothing to clear */ }
        return _lm.apply(this, arguments);
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        try { clearTrail(); waves.length = 0; resetDuck(); clearCrows(); sniffMsgShown = false; crowMsgShown = false; } catch (err) { /* ignore */ }
        return _rg.apply(this, arguments);
      };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        let play = false;
        try {
          play = dt > 0 && hasG() && G.state === 'play';
          if (play) { T += dt; if (set.trail) layTrail(); }
        } catch (err) { stats.errors++; }
        const r = _up.apply(this, arguments);
        try {
          if (play) {
            if (waves.length || duckLive) tickWaves();
            if (crows.length || set.crows) tickCrows(dt);
          } else if (duckLive && hasG() && G.state !== 'panel') resetDuck();
        } catch (err) { stats.errors++; console.warn('hunters13 tick failed', err); }
        return r;
      };
    }
    if (typeof Engine !== 'undefined' && Engine.addPostHook) Engine.addPostHook(drawWaves, 26);      // before bloom (30) and the grade (40): the grey is graded with the rest
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('hunters13 rows failed', e); }
        return r;
      };
    }
  }

  // ---- Options -----------------------------------------------------------------------------------------------------
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p13w-head')) return;
    const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) { if (k === 'style') e.style.cssText = props[k]; else e.setAttribute(k, props[k]); } if (text != null) e.textContent = text; return e; };
    grid.appendChild(el('span', { id: 'p13w-head', style: 'grid-column:1/-1;margin-top:1cqh;color:var(--gold);font-family:var(--font-display);letter-spacing:.08em' }, TXT.optHead));
    const rows = [['trail', TXT.optTrail, TXT.optTrailHint], ['wave', TXT.optWave, TXT.optWaveHint], ['crows', TXT.optCrows, TXT.optCrowsHint]];
    for (const [k, label, hintText] of rows) {
      const lab = el('span', { class: 'gfx-label' }, label); lab.appendChild(document.createTextNode(' ')); lab.appendChild(el('small', { class: 'muted' }, hintText));
      const b = el('button', { class: 'dfbtn small', id: 'p13w-' + k, type: 'button' }, '');
      const sync = () => { b.textContent = set[k] ? TXT.on : TXT.off; b.setAttribute('aria-pressed', set[k] ? 'true' : 'false'); b.classList.toggle('sel', set[k]); };
      b.setAttribute('aria-label', label);
      b.onclick = () => { setSwitch(k, !set[k]); sync(); };
      sync(); grid.appendChild(lab); grid.appendChild(b);
    }
  }
  function setSwitch(k, on) {
    if (!(k in set)) return;
    set[k] = !!on; saveSet();
    if (typeof GFX !== 'undefined') {
      if (k === 'wave') GFX.hushWave = !!on;
      if (k === 'crows') GFX.carrionCrows = !!on;
      if (k !== 'trail' && GFX.changed) { try { GFX.changed(); } catch (e) { /* ignore */ } }
    }
    if (!on) {
      if (k === 'trail') clearTrail();
      if (k === 'wave') { waves.length = 0; resetDuck(); }
      if (k === 'crows') clearCrows();
    }
  }
  // GFX presets flip hushWave / carrionCrows: follow them
  function followGfx() {
    if (typeof GFX === 'undefined' || !GFX.onChange) return;
    GFX.onChange(() => {
      try {
        set.wave = !!GFX.hushWave; set.crows = !!GFX.carrionCrows;
        if (!set.wave) { waves.length = 0; resetDuck(); }
        if (!set.crows) clearCrows();
      } catch (e) { /* ignore */ }
    });
  }

  // ---- init --------------------------------------------------------------------------------------------------------
  loadSet();
  try { wire(); followGfx(); } catch (e) { console.warn('hunters13 wiring failed', e); }

  return {
    BAL, TXT, TRACKERS, SMELL_ITEMS, set, stats, trail, waves, crows,
    startWave, greyAt, waveR, waveLife, drawWaves, tickWaves, duckWanted, resetDuck, layTrail, clearTrail, strongSmell, setSwitch, sniffStep, senses, onScent,
    tickCrows, scatterBody, crowNoise, eligibleBody, sensitiveSource, daylight, playAt, appendRows, capLine,
    sniffState: (e) => sn.get(e) || null,
    bodyInfo: (b) => bodyInfo.get(b) || null,
    srcInfo: (b) => srcInfo.get(b) || null,
    get clock() { return T; }, set clock(v) { T = v; },
    get duck() { return duckNow; }, get duckLive() { return duckLive; },
    get smellUntil() { return smellUntil; },
    resetState() { clearTrail(); waves.length = 0; resetDuck(); clearCrows(); sniffMsgShown = false; crowMsgShown = false; waveReadyAt = -1; },
    audio: 'positional snuffle (filtered noise), crow wing-clatter, a low dip under a grey wave; sound bus ducked then restored',
  };
})();
if (typeof window !== 'undefined') window.HUNTERS13 = HUNTERS13;
