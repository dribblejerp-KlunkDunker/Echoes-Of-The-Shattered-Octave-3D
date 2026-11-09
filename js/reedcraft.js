// ============================================================
//  reedcraft — Phase 9: cutting and tuning Flume-reeds.
//
//  One reusable pitch minigame, "Hold the Pitch" (REEDS.holdPitch), and a small craft built on it:
//    * reed beds by the Flume crossing (Oakhaven) and on the damp ground of the clearing: E cuts one
//      Flume-reed (p9_windreed), quietly, three a bed a day; the beds come again with the next game day;
//    * a cut reed lives one game day. We keep NO per-item stamp: two small integer flags
//      (p9r_cutday, p9r_cuth) say when the newest reed in the bundle was cut, and every held raw reed
//      shares that moment. A day later they turn into p9_dryreed (worthless; burn them);
//    * at the forge panel (a "Reeds" button) or by a fire at R-rest, tuning a reed runs the minigame:
//      p9_reed_root (steadies you against the Hush), p9_reed_lure (a thin note that draws idle
//      listeners exactly as a stone does: it is a DISTRACTIONS entry), and p9_reed_first (a blank
//      First Reed that the quest team tunes to a person with REEDS.tuneFirstReed).
//
//  Rules kept (BRIEF_P8/P9): wrappers only, no edits to game.js/upgrades.js/data.js; state lives in
//  G.flags (p9r_*), validated on read; nothing built from save data goes into markup; procedural art
//  only (a canvas stand-in); every piece of new prose is marked [PROPOSED] and listed in TEXT.md.
//
//  Settings (localStorage 'octave.reedcraft.v1', Options -> Graphics & access -> Reed-craft):
//    on      : reed beds, the Reeds button and the lure in the throw menu (off = the original game;
//              the minigame API itself keeps working for the quest team)
//    assist  : Hold the Pitch with a wider band (accessibility)
// ============================================================
'use strict';

const REEDS = (function () {
  const KEY = 'octave.reedcraft.v1';
  const set = { on: true, assist: false };
  const REF = 174;                       // the Growth note: every pitch is held as cents above 174 Hz
  const LURE = 'p9_reed_lure', ROOT = 'p9_reed_root', FIRST = 'p9_reed_first', RAW = 'p9_windreed', DRY = 'p9_dryreed';
  const PER_BED = 3;                     // reeds a bed gives per game day
  const FAIL_BELOW = 0.5;                // score under this splits the reed

  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const clean = (s, n) => String(s == null ? '' : s).replace(/[<>&"`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 40);
  const toCents = (hz) => 1200 * Math.log2(hz / REF);
  const toHz = (c) => REF * Math.pow(2, c / 1200);
  const sayMsg = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };

  function loadSet() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { set.on = o.on !== false; set.assist = o.assist === true; }
    } catch (e) { /* private window or blocked storage: defaults */ }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify({ on: set.on, assist: set.assist })); } catch (e) { /* ignore */ } }
  const on = () => set.on !== false;

  // ---------------------------------------------------------------- items
  // Icons: p9_windreed and p9_dryreed are herbs (js/icons.js draws a reed herb for unknown herbs); the
  // others take the category fallbacks (consumable potion shape / key scroll).
  [ // [PROPOSED] every item description below
    [RAW, { name: 'Flume-Reed', sprite: 'loot', herb: true, use: 'p9_reeds', value: 0, desc: 'Cut green from a bed by the Flume. It holds any pitch you give it, and it is dead by this time tomorrow. Not the old wind-reed, which went to sugar-glass in 412; but it will do.' }],
    [DRY, { name: 'Dry Reed', sprite: 'loot', use: 'p9_dry', value: 0, desc: 'Pale, brittle, and worth nothing. It will not hold a pitch. It will burn.' }],
    [ROOT, { name: 'Root-Note Reed', sprite: 'loot', use: 'p9_root', value: 4, desc: 'A reed tuned to 174. Sound it against your breastbone and you stand a little straighter in the Narrow. One breath of use.' }],
    [LURE, { name: 'Lure Reed', sprite: 'loot', use: 'distraction', value: 2, desc: 'A thin, high reed. Thrown (O opens the throw panel), it lies where it lands and sounds one note a long while. Idle listeners go to look.' }],
    [FIRST, { name: 'Blank First Reed', sprite: 'loot', key: true, desc: 'Cut and slotted, and not yet tuned. In the Reach a reed like this hangs above every door, tuned to the one who sleeps behind it.' }],
  ].forEach(([id, def]) => { if (typeof ITEMS !== 'undefined' && !ITEMS[id]) ITEMS[id] = def; });
  // painted-icon rows (procedural stand-ins from js/icons.js): the reeds look like reeds and a reed-whistle
  try { if (typeof ICONS !== 'undefined' && ICONS.TABLE) { const T = ICONS.TABLE; T[RAW] = ['herb', { v: 'reed' }]; T[DRY] = ['herb', { v: 'bark' }]; T[ROOT] = ['whistle', {}]; T[LURE] = ['whistle', {}]; T[FIRST] = ['whistle', {}]; } } catch (e) { /* the fallback icons will do */ }
  if (typeof ITEM_WEIGHTS !== 'undefined') for (const id of [RAW, DRY, ROOT, LURE, FIRST]) if (ITEM_WEIGHTS[id] == null) ITEM_WEIGHTS[id] = 0.1;
  // the lure joins the stone and the bottle in the existing distraction system
  // (reach 6 / hearing 9 sits between the stone and the bottle; it lasts longer than either)
  if (typeof DISTRACTIONS !== 'undefined' && !DISTRACTIONS[LURE]) DISTRACTIONS[LURE] = { name: 'Lure reed', reach: 6, hearing: 9, duration: 14 };

  // ---------------------------------------------------------------- flags (validated on every read)
  function flag(name, lo, hi) { return Math.floor(num(typeof G !== 'undefined' && G.flags ? G.flags[name] : 0, lo, hi, lo)); }
  function setFlag(name, v) { if (G.flags && typeof G.flags === 'object') G.flags[name] = v; }
  const tunes = () => flag('p9r_tunes', 0, 99);
  const nowHours = () => (Number(G.day) || 0) * 24 + (num(G.tod, 0, 0.9999, 0)) * 24;

  // inventory counts that a hostile save cannot turn into strings or NaN
  function held(id) {
    let n = 0;
    if (!G.player || !Array.isArray(G.player.inv)) return 0;
    for (const s of G.player.inv) if (s && s.id === id) n += Math.floor(num(s.n, 0, 999, 1));
    return n;
  }
  function removeAll(id) {
    const inv = G.player.inv;
    for (let i = inv.length - 1; i >= 0; i--) if (inv[i] && inv[i].id === id) inv.splice(i, 1);
  }

  // ---------------------------------------------------------------- a reed lives one game day
  function cutAt() {   // the hour the newest held reed was cut, or null if the flags say nothing
    if (!G.flags || G.flags.p9r_cutday == null) return null;
    const day = flag('p9r_cutday', 0, 100000), h = flag('p9r_cuth', 0, 23);
    return Math.min(day * 24 + h, nowHours());
  }
  function hoursLeft() {
    const c = cutAt(); if (c == null) return 24;
    return Math.max(0, c + 24 - nowHours());
  }
  // Raw reeds held after their day turn to dry reeds. Returns how many dried.
  function sync() {
    try {
      if (!G.player || !Array.isArray(G.player.inv)) return 0;
      const n = held(RAW); if (!n) return 0;
      if (cutAt() == null) { stampCut(); return 0; }      // reeds with no stamp (an odd save) count as cut now
      if (hoursLeft() > 0) return 0;
      removeAll(RAW); G.give(DRY, n);
      if (G.state === 'play') sayMsg(n === 1 ? 'Your Flume-reed has gone pale and brittle.' : 'Your Flume-reeds have gone pale and brittle.', 'warn', 3500);
      return n;
    } catch (e) { console.warn('reed sync failed', e); return 0; }
  }
  function stampCut() { setFlag('p9r_cutday', Math.max(0, Math.floor(Number(G.day) || 0))); setFlag('p9r_cuth', Math.min(23, Math.floor(num(G.tod, 0, 0.9999, 0) * 24))); }

  // ---------------------------------------------------------------- reed beds
  // Oakhaven: banks of the Flume either side of the crossing (the water runs along y 49-50).
  // The clearing has no running water; its beds stand on the damp moss patch. [PROPOSED] placement.
  const BEDS = [
    ['oakhaven', 48.6, 51.4], ['oakhaven', 58.4, 51.4], ['oakhaven', 43.8, 51.4], ['oakhaven', 63.0, 51.4], ['oakhaven', 59.6, 48.5],
    ['clearing', 24.4, 16.6], ['clearing', 32.4, 19.4],
  ];
  function bedCut(i) { return G.flags && flag('p9r_bedday', 0, 100000) === Math.floor(Number(G.day) || 0) && G.flags.p9r_bedday != null ? flag('p9r_c' + i, 0, PER_BED) : 0; }
  function bedLabel(i) {
    const left = PER_BED - bedCut(i);
    if (left <= 0) return 'The reed bed is cut to the stubble. It will come again tomorrow.';
    return left === PER_BED ? 'A bed of Flume-reed, green and quiet in the wet. E cuts one.' : `A bed of Flume-reed. ${left} still standing today.`;
  }
  function refreshBeds() {
    if (!G.maps) return;
    for (const id in G.maps) {
      const m = G.maps[id]; if (!m || !m._p9beds) continue;
      for (const e of m._p9beds) {
        const left = PER_BED - bedCut(e.p9bed);
        e.hidden = !on(); e.label = bedLabel(e.p9bed);
        e.scale = left <= 0 ? 0.5 : 0.7 + 0.15 * left;
        e.sprite = left <= 0 ? 'p_reed1' : 'p_reed2';
      }
    }
  }
  // anim.js sweeps every transient entity when a map is left or entered, so each map keeps its own
  // beds in m._p9beds and puts them back on entry (the same trick scenery.js and flora.js use)
  function ensureBeds(m) {
    if (!m || !m._p9beds) return;
    const have = new Set(m.entities);
    for (const e of m._p9beds) if (!have.has(e)) m.entities.push(e);
  }
  function addBeds(maps) {
    BEDS.forEach(([mapId, x, y], i) => {
      const m = maps && maps[mapId]; if (!m) return;
      if (!m._p9beds) m._p9beds = [];
      if (m._p9beds.some(e => e.p9bed === i)) return;
      // transient: never saved, rebuilt with the maps (a Greened Oakhaven is rebuilt without them)
      // _decor: a gatherable bed is game content (like a notice board), not a graphics effect the plain preset may drop
      const e = m.deco('p_reed2', x, y, { solid: false, radius: 0.45, scale: 1.15, use: 'p9_reedbed', p9bed: i, transient: true, _decor: true, label: 'A bed of Flume-reed, green and quiet in the wet. E cuts one.' });
      m._p9beds.push(e);
    });
  }
  function cutReed(e) {
    if (!on()) return;
    sync();
    const i = e.p9bed | 0;
    if (flag('p9r_bedday', 0, 100000) !== Math.floor(Number(G.day) || 0) || G.flags.p9r_bedday == null) {
      // a new day: every bed is green again
      for (let k = 0; k < BEDS.length; k++) setFlag('p9r_c' + k, 0);
      setFlag('p9r_bedday', Math.floor(Number(G.day) || 0));
    }
    if (bedCut(i) >= PER_BED) { sayMsg('The bed is cut to the stubble. It will come again with the next day.', 'warn', 2800); return; }
    // a half-second debounce for a held E (cleared on every map load, so a load that puts G.time back cannot lock a bed)
    if (G.time < (cutReed.ready || 0)) return;
    cutReed.ready = G.time + 0.5;
    setFlag('p9r_c' + i, bedCut(i) + 1);
    stampCut();                      // the bundle keeps as long as its newest reed
    setFlag('p9r_seen', 1);
    G.give(RAW, 1);
    try { Audio_.sfx.pickup(); } catch (err) { /* silent */ }
    sayMsg(PER_BED - bedCut(i) > 0 ? 'You cut a Flume-reed low, at the joint. The bed hardly notices.' : 'You cut the last Flume-reed. The bed will come again tomorrow.', 'good', 3000);
    refreshBeds();
  }

  // ---------------------------------------------------------------- curves
  // opts.curve is [[seconds, Hz], ...]; here it becomes cents, sorted, and bounded.
  function normCurve(curve, fallbackHz) {
    const out = [];
    if (Array.isArray(curve)) {
      for (const p of curve) {
        if (!Array.isArray(p) || out.length >= 64) continue;
        const t = Number(p[0]), hz = Number(p[1]);
        if (Number.isFinite(t) && Number.isFinite(hz) && t >= 0 && t < 600 && hz >= 40 && hz <= 2000) out.push([t, toCents(hz)]);
      }
    }
    out.sort((a, b) => a[0] - b[0]);
    if (!out.length) out.push([0, toCents(num(fallbackHz, 40, 2000, REF))]);
    return out;
  }
  function centsAt(pts, t) {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i], f = b[0] > a[0] ? (t - a[0]) / (b[0] - a[0]) : 1;
        const s = f * f * (3 - 2 * f);                 // eased, so the target glides instead of kinking
        return a[1] + (b[1] - a[1]) * s;
      }
    }
    return pts[pts.length - 1][1];
  }

  // ---------------------------------------------------------------- skill: the band and the grades
  // Beginners get the wide band; it narrows as you practise (down to 55 cents), and in return the
  // "true" grade gets easier to earn. Assist widens the band by 60%.
  function bandFor(n) { n = Math.floor(num(n, 0, 99, 0)); return Math.max(55, 105 - 5 * n) * (set.assist ? 1.6 : 1); }
  function trueAt(n) { n = Math.floor(num(n, 0, 99, 0)); return Math.max(0.75, 0.85 - 0.01 * n); }
  function grade(score, n) { return score < FAIL_BELOW ? 'fail' : score >= trueAt(n) ? 'true' : 'fair'; }

  // Scripted targets. Slew stays under ~200 cents a second so a steady hand can follow.
  function makeCurve(kind, hz, duration) {
    hz = num(hz, 60, 1500, REF);
    if (kind === 'lure') {                           // a two-note call, high and thin
      return [[0, hz], [1.6, hz], [2.8, hz * 1.122], [4.2, hz * 1.122], [5.4, hz], [duration || 7, hz]];
    }
    if (kind === 'first') {                          // a person's pitch: found, then held while it breathes
      return [[0, hz * 1.07], [1.4, hz], [3, hz * 1.016], [4.8, hz * 0.985], [6, hz * 1.01], [duration || 7, hz]];
    }
    return [[0, hz * 1.12], [1.6, hz], [3.2, hz * 1.03], [5, hz * 0.97], [6.6, hz * 1.02], [duration || 8, hz]];   // root
  }
  const RECIPES = [
    { id: 'root', name: 'Root-note reed', need: 2, out: ROOT, hz: 174, duration: 8, wide: 1,
      desc: 'Two reeds, tuned to 174. Steadies you for a few breaths.', title: 'Tune the root-note reed', hint: 'Find 174 and hold it.' },
    { id: 'lure', name: 'Lure reed', need: 1, out: LURE, hz: 523, duration: 7, wide: 1.25,
      desc: 'One reed, tuned high and thin. Throw it to call the watch away.', title: 'Tune the lure reed', hint: 'A two-note call. Follow it up and back.' },
  ];

  // ---------------------------------------------------------------- sound: a soft reed tone at your pitch, the target as a drone
  function startTone() {
    try {
      const ctx = typeof Audio_ !== 'undefined' ? Audio_.ctx : null;
      if (!ctx || !Audio_.sfxBus) return null;
      const mk = (type, filterHz) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; g.gain.value = 0.0001;
        if (filterHz) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterHz; o.connect(f); f.connect(g); } else o.connect(g);
        g.connect(Audio_.sfxBus); o.start(); return { o, g };
      };
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => { });
      return { ctx, player: mk('triangle', 1500), drone: mk('sine', 0), playerHz: 0, droneHz: 0, playerGain: 0, droneGain: 0 };
    } catch (e) { console.warn('reed tone failed', e); return null; }
  }
  function updateTone(s) {
    const T = s.tone; if (!T) return;
    try {
      const muted = !!Audio_.muted, now = T.ctx.currentTime;
      T.playerHz = toHz(s.pitch); T.droneHz = toHz(s.centsAt(Math.max(0, s.t)));
      T.playerGain = muted ? 0 : (s.inside ? 0.06 : 0.045); T.droneGain = muted ? 0 : 0.016;
      T.player.o.frequency.setTargetAtTime(T.playerHz, now, 0.03);
      T.drone.o.frequency.setTargetAtTime(T.droneHz, now, 0.05);
      T.player.g.gain.setTargetAtTime(Math.max(0.0001, T.playerGain), now, 0.05);
      T.drone.g.gain.setTargetAtTime(Math.max(0.0001, T.droneGain), now, 0.08);
    } catch (e) { /* the tone is cosmetic */ }
  }
  function stopTone(s) {
    const T = s.tone; if (!T) return; s.tone = null;
    try {
      const now = T.ctx.currentTime;
      for (const n of [T.player, T.drone]) { n.g.gain.setTargetAtTime(0.0001, now, 0.04); n.o.stop(now + 0.25); }
      setTimeout(() => { try { for (const n of [T.player, T.drone]) { n.o.disconnect(); n.g.disconnect(); } } catch (e) { /* gone */ } }, 400);
    } catch (e) { /* gone */ }
    lastTone = { active: false, playerHz: T.playerHz, droneHz: T.droneHz, playerGain: T.playerGain, droneGain: T.droneGain };
  }
  let lastTone = { active: false, playerHz: 0, droneHz: 0, playerGain: 0, droneGain: 0 };

  // ---------------------------------------------------------------- Hold the Pitch
  let cur = null;          // the running session, or null
  let forceManual = false; // tests drive the session by hand (no animation frame, no linger)
  const RATE = 320;        // cents a second at full steer
  const PXPS = 84;         // scroll speed, canvas pixels a second

  function holdPitch(opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    if (cur) return Promise.resolve({ score: 0, held: 0, aborted: true, busy: true, duration: 0, longest: 0 });
    return new Promise((resolve) => {
      const pts = normCurve(opts.curve, opts.hz);
      const lastT = pts[pts.length - 1][0];
      const duration = num(opts.duration, 1, 120, Math.max(3, lastT || 6));
      const widthC = num(opts.width, 20, 400, 80);
      let lo = Infinity, hi = -Infinity; for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
      lo -= 450; hi += 450;
      if (hi - lo < 1000) { const mid = (hi + lo) / 2; lo = mid - 500; hi = mid + 500; }
      const s = {
        pts, width: widthC, duration, lead: num(opts.lead, 0, 10, 1.2), lo, hi,
        t: -num(opts.lead, 0, 10, 1.2), held: 0, longest: 0, streak: 0, inside: false, glow: 0,
        pitch: Math.max(lo + 40, Math.min(hi - 40, pts[0][1] - 320)), keys: { up: false, down: false }, ptr: null, padPrev: {},
        hist: [], histT: 0, done: false, ended: false, aborted: false, manual: opts.manual === true || forceManual,
        linger: opts.manual === true || forceManual ? 0 : num(opts.linger, 0, 5000, 900), captionState: '', resolve, tone: null,
        title: clean(opts.title, 60) || 'Hold the pitch', hint: clean(opts.hint, 90), prevState: G.state,
        reduce: !!(typeof GFX !== 'undefined' && GFX.reduceMotion),
      };
      s.centsAt = (t) => centsAt(pts, t);
      s.step = (dt) => step(s, dt);
      s.finish = (aborted) => finish(s, aborted);
      cur = s;
      if (G.state === 'play') G.state = 'panel';
      openModal(`<h2 id="rhp-title"></h2>
        <div class="reedhp"><canvas id="rhp-canvas" width="560" height="196" role="img" aria-label="Hold the pitch. The gold band is the note to hold. Your voice is the bright line. Steer up and down."></canvas>
        <p class="muted" id="rhp-hint"></p>
        <p id="rhp-cap" class="rhp-cap" role="status" aria-live="polite"></p>
        <div class="btns"><button class="dfbtn small" id="rhp-abort" type="button">Put the reed down</button></div>
        <p class="muted rhp-keys">W / S or Up / Down steer · drag with the mouse or a finger · left stick or D-pad · Esc puts the reed down.</p></div>`, 'holdpitch');
      s.token = G.panelToken;
      document.getElementById('rhp-title').textContent = s.title;
      document.getElementById('rhp-hint').textContent = s.hint;
      s.cv = document.getElementById('rhp-canvas'); s.cx = s.cv.getContext('2d');
      s.capEl = document.getElementById('rhp-cap');
      document.getElementById('rhp-abort').onclick = () => finish(s, true);
      bindInput(s);
      s.tone = startTone();
      // the pad's buttons held when we opened must be released before B or Back can abort
      const g = padNow(); if (g) { s.padPrev[1] = !!(g.buttons[1] && g.buttons[1].pressed); s.padPrev[8] = !!(g.buttons[8] && g.buttons[8].pressed); }
      draw(s);
      if (!s.manual) { s.last = performance.now(); s.raf = requestAnimationFrame(function loop(now) { if (s.done) return; step(s, Math.min(0.05, Math.max(0, (now - s.last) / 1000))); s.last = now; s.raf = requestAnimationFrame(loop); }); }
    });
  }

  function padNow() {
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ }
    return null;
  }

  function bindInput(s) {
    const kd = (ev) => {
      if (s.done) return;
      const k = String(ev.key || '').toLowerCase();
      ev.stopImmediatePropagation(); if (ev.type === 'keydown' && ['arrowup', 'arrowdown', ' ', 'escape'].includes(k)) ev.preventDefault();
      if (s.ended) { if (ev.type === 'keydown' && s.skip) s.skip(); return; }
      const down = ev.type === 'keydown';
      if (k === 'w' || k === 'arrowup') s.keys.up = down;
      else if (k === 's' || k === 'arrowdown') s.keys.down = down;
      else if (k === 'escape' && down) finish(s, true);
    };
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', kd, true);
    const yToCents = (ev) => { const r = s.cv.getBoundingClientRect(); const f = (ev.clientY - r.top) / Math.max(1, r.height); const y = f * s.cv.height; return s.yInv(y); };
    s.yInv = (y) => { const padT = 14, padB = 14, f = (y - padT) / (s.cv.height - padT - padB); return s.hi - f * (s.hi - s.lo); };
    const pd = (ev) => { if (s.ended) { if (s.skip) s.skip(); return; } try { s.cv.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic */ } s.ptr = Math.max(s.lo, Math.min(s.hi, yToCents(ev))); ev.preventDefault(); };
    const pm = (ev) => { if (s.ptr == null) return; s.ptr = Math.max(s.lo, Math.min(s.hi, yToCents(ev))); };
    const pu = () => { s.ptr = null; };
    s.cv.addEventListener('pointerdown', pd); s.cv.addEventListener('pointermove', pm);
    s.cv.addEventListener('pointerup', pu); s.cv.addEventListener('pointercancel', pu);
    s.cv.style.touchAction = 'none';
    s.unbind = () => {
      window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', kd, true);
      s.cv.removeEventListener('pointerdown', pd); s.cv.removeEventListener('pointermove', pm);
      s.cv.removeEventListener('pointerup', pu); s.cv.removeEventListener('pointercancel', pu);
    };
  }

  function step(s, dt) {
    if (s.done || s.ended) { if (s.ended) draw(s); return; }
    dt = num(dt, 0, 0.25, 0);
    // another panel took over (the options menu from a pad, say), or the player died: put the reed down
    if (G.dead || G.panelToken !== s.token || G.openPanel !== 'holdpitch') { finish(s, true, true); return; }
    // steer: keys, pad, pointer
    let dir = (s.keys.up ? 1 : 0) - (s.keys.down ? 1 : 0);
    const g = padNow();
    if (g) {
      const ay = Math.abs(g.axes[1] || 0) < 0.18 ? 0 : -(g.axes[1] || 0);
      const dp = ((g.buttons[12] && g.buttons[12].pressed) ? 1 : 0) - ((g.buttons[13] && g.buttons[13].pressed) ? 1 : 0);
      dir = Math.max(-1, Math.min(1, dir + ay + dp));
      for (const b of [1, 8]) { const now = !!(g.buttons[b] && g.buttons[b].pressed); if (now && !s.padPrev[b]) { s.padPrev[b] = true; finish(s, true); return; } s.padPrev[b] = now; }
    }
    s.pitch += dir * RATE * dt;
    if (s.ptr != null) { const d = s.ptr - s.pitch, m = 1800 * dt; s.pitch += Math.max(-m, Math.min(m, d)); }
    s.pitch = Math.max(s.lo, Math.min(s.hi, s.pitch));
    // time and score (the lead-in is for listening and is not scored)
    const before = s.t; s.t += dt;
    const target = s.centsAt(Math.max(0, s.t));
    s.inside = s.t >= 0 && Math.abs(s.pitch - target) <= s.width / 2;
    if (s.t > 0) {
      const dtEff = Math.min(s.t, s.t - Math.max(0, before), s.duration - Math.max(0, before));
      if (dtEff > 0) {
        if (s.inside) { s.held += dtEff; s.streak += dtEff; if (s.streak > s.longest) s.longest = s.streak; } else s.streak = 0;
      }
    }
    s.glow += ((s.inside ? 1 : 0) - s.glow) * Math.min(1, dt * 9);
    s.histT += dt; if (s.histT >= 0.05) { s.histT = 0; s.hist.push([Math.max(0, s.t), s.pitch]); if (s.hist.length > 700) s.hist.shift(); }
    updateTone(s);
    caption(s);
    draw(s);
    if (s.t >= s.duration - 1e-6) finish(s, false);
  }

  function caption(s) {
    // sound captions (Options -> Sound captions): say it in words as well
    const want = (typeof ACCESS !== 'undefined' && ACCESS.settings && ACCESS.settings.cap) ? (s.t < 0 ? 'listening' : s.inside ? 'holding' : 'off pitch') : '';
    if (want === s.captionState) return;
    s.captionState = want;
    if (s.capEl) s.capEl.textContent = want === 'holding' ? 'Holding.' : want === 'off pitch' ? 'Off pitch.' : want === 'listening' ? 'Listen for the note.' : '';
  }

  function finish(s, aborted, quiet) {
    if (s.done || s.ended) return;
    const dur = s.duration;
    const result = { score: Math.max(0, Math.min(1, s.held / dur)), held: Math.round(s.held * 100) / 100, aborted: !!aborted, duration: dur, longest: Math.round(s.longest * 100) / 100 };
    s.result = result;
    stopTone(s);
    const close = () => {
      if (s.done) return; s.done = true; s.ended = true; clearTimeout(s.lingerTimer);
      if (s.raf) cancelAnimationFrame(s.raf);
      try { s.unbind(); } catch (e) { /* gone */ }
      if (cur === s) cur = null;
      if (G.panelToken === s.token && G.openPanel === 'holdpitch') closeModal();
      if (s.prevState === 'play' && G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {};
      s.resolve(result);
    };
    if (!aborted && s.linger > 0 && !quiet) {
      s.ended = true; s.skip = close;
      if (s.capEl) s.capEl.textContent = 'Held ' + Math.round(result.score * 100) + '%.';
      draw(s);
      s.lingerTimer = setTimeout(close, s.linger);
    } else { s.ended = false; close(); }
  }

  // ---- drawing (procedural stand-in: canvas only)
  function draw(s) {
    const cv = s.cv, c = s.cx; if (!c || !cv.isConnected) return;
    const W = cv.width, H = cv.height, padT = 14, padB = 14;
    const y = (cents) => padT + (s.hi - cents) / (s.hi - s.lo) * (H - padT - padB);
    const reduce = s.reduce || !!(typeof GFX !== 'undefined' && GFX.reduceMotion);
    const t = Math.max(0, s.t);
    c.clearRect(0, 0, W, H);
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#171109'); bg.addColorStop(1, '#0e0a07');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    // the staff: a faint line every whole tone, stronger on each octave of 174
    c.lineWidth = 1;
    for (let k = Math.ceil(s.lo / 200); k * 200 <= s.hi; k++) {
      const yy = Math.round(y(k * 200)) + 0.5; c.strokeStyle = k % 6 === 0 ? 'rgba(232,217,181,.30)' : 'rgba(232,217,181,.12)';
      c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke();
    }
    const L = 24, R = W - 18, nowX = reduce ? L : Math.round(W * 0.28);
    const xOf = reduce ? (tt) => L + Math.min(1, tt / s.duration) * (R - L) : (tt) => nowX + (tt - t) * PXPS;
    // the target band along its curve
    const x0 = reduce ? L : 0, x1 = reduce ? R : W, stepPx = 4;
    const upper = [], lower = [];
    for (let x = x0; x <= x1; x += stepPx) {
      const tt = reduce ? (x - L) / (R - L) * s.duration : t + (x - nowX) / PXPS;
      const cc = s.centsAt(Math.max(0, Math.min(s.duration, tt)));
      upper.push([x, y(cc + s.width / 2)]); lower.push([x, y(cc - s.width / 2)]);
    }
    c.beginPath(); upper.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let i = lower.length - 1; i >= 0; i--) c.lineTo(lower[i][0], lower[i][1]); c.closePath();
    c.fillStyle = 'rgba(217,164,65,.20)'; c.fill();
    c.strokeStyle = 'rgba(217,164,65,.65)'; c.lineWidth = 1.5;
    c.beginPath(); upper.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    c.beginPath(); lower.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    if (reduce) {      // static view: the whole piece laid out, a marker moves along it
      const mx = xOf(t); c.strokeStyle = 'rgba(232,217,181,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(mx, padT - 6); c.lineTo(mx, H - padB + 6); c.stroke();
    } else {
      c.strokeStyle = 'rgba(232,217,181,.30)'; c.lineWidth = 1; c.beginPath(); c.moveTo(nowX + 0.5, padT - 6); c.lineTo(nowX + 0.5, H - padB + 6); c.stroke();
    }
    // your voice: a trail behind, a ring now
    c.strokeStyle = 'rgba(159,214,200,.85)'; c.lineWidth = 2; c.beginPath();
    let started = false;
    for (const [tt, pc] of s.hist) { const x = xOf(tt); if (x < -4) continue; if (!started) { c.moveTo(x, y(pc)); started = true; } else c.lineTo(x, y(pc)); }
    const px = xOf(t), py = y(s.pitch);
    if (started) c.lineTo(px, py); c.stroke();
    const gl = s.glow, r = 8 + 4 * gl;
    if (gl > 0.05) { const rg = c.createRadialGradient(px, py, 2, px, py, 26 + 10 * gl); rg.addColorStop(0, `rgba(255,233,168,${0.55 * gl})`); rg.addColorStop(1, 'rgba(255,233,168,0)'); c.fillStyle = rg; c.beginPath(); c.arc(px, py, 26 + 10 * gl, 0, 7); c.fill(); }
    c.lineWidth = 3; c.strokeStyle = gl > 0.5 ? '#ffe9a8' : '#7f93a0'; c.beginPath(); c.arc(px, py, r, 0, 7); c.stroke();
    c.fillStyle = gl > 0.5 ? '#fff6d8' : '#9fb3be'; c.beginPath(); c.arc(px, py, 3.5, 0, 7); c.fill();
    // progress and the held share
    c.fillStyle = 'rgba(232,217,181,.18)'; c.fillRect(L, 4, R - L, 3);
    c.fillStyle = '#d9a441'; c.fillRect(L, 4, (R - L) * Math.min(1, t / s.duration), 3);
    c.font = '15px "Alegreya SC", Georgia, serif'; c.fillStyle = '#e8d9b5'; c.textAlign = 'right';
    c.fillText(s.t < 0 ? 'Listen…' : 'Held ' + Math.round(Math.min(1, s.held / s.duration) * 100) + '%', W - 10, H - 6);
    c.textAlign = 'left';
  }

  // ---------------------------------------------------------------- tuning (what the recipes and the quest call)
  function inHedge() { try { return typeof lawActive === 'function' && lawActive(); } catch (e) { return false; } }
  // Sounding a reed is a small noise event. The Hedge swallows sound (no hounds); the watch may glance.
  function soundNoise() {
    try {
      if (inHedge()) {
        addNoise(0.8);
        const c = Engine.cam;
        const guard = G.ents.find(e => e.kind === 'npc' && e.lawGuard && !e.dead && !e.hidden && dist2(e.x, e.y, c.x, c.y) < 100 && los(e.x, e.y, c.x, c.y));
        if (guard) { guard.dir = Math.atan2(c.y - guard.y, c.x - guard.x); sayMsg('A constable glances over at the sound, then back to the street.', '', 3500); return 'glance'; }
        return 'hedge';
      }
      addNoise(1.6); return 'wild';
    } catch (e) { return null; }
  }
  function noteTune() { setFlag('p9r_tunes', Math.min(99, tunes() + 1)); }
  function firstTuneJournal() {
    if (flag('p9r_first', 0, 1)) return;
    setFlag('p9r_first', 1);
    // [PROPOSED] in Tobin's echo (his page 1: "tuning each against my own breastbone before I cut the slot")
    try { journal('side', 'My first reed. Tobin wrote that he tuned each one against his own breastbone before he cut the slot. I held the cane to mine and hummed until the bone answered. It is not hard to find the note. It is hard to keep it.'); } catch (e) { /* no journal yet */ }
  }
  function xp(q) { try { if (q === 'true') gainSkill('Lore', 2); else if (q === 'fair') gainSkill('Lore', 1); } catch (e) { /* no skills */ } }

  let crafting = false;
  async function craft(id) {
    const r = RECIPES.find(x => x.id === id); if (!r || crafting || cur) return null;
    sync();
    if (held(RAW) < r.need) { sayMsg('You need ' + r.need + ' fresh Flume-reed' + (r.need > 1 ? 's' : '') + ' for that.', 'warn', 2600); return null; }
    crafting = true;
    try {
      soundNoise();
      const n = tunes();
      const res = await holdPitch({ curve: makeCurve(id, r.hz, r.duration), width: bandFor(n) * r.wide, duration: r.duration, title: r.title, hint: r.hint });
      if (res.aborted) { sayMsg('You put the reed down, uncut.', '', 2200); return { aborted: true, score: res.score }; }
      const q = grade(res.score, n);
      noteTune();
      if (q === 'fail') {
        G.take(RAW);
        sayMsg('The reed splits along the slot.', 'bad', 3500);
      } else {
        for (let k = 0; k < r.need; k++) G.take(RAW);
        const made = q === 'true' ? 2 : 1;
        G.give(r.out, made);
        sayMsg(q === 'true' ? 'The reed rings true. The offcut makes a second.' : 'The reed sounds a little flat. It will do.', 'good', 3500);
        firstTuneJournal();
      }
      xp(q);
      return { aborted: false, quality: q, score: res.score, made: q === 'fail' ? 0 : (q === 'true' ? 2 : 1), item: r.out };
    } finally { crafting = false; }
  }

  // For the QUESTS team: tune a reed to one person's pitch. Resolves true on success (one fresh
  // Flume-reed is used up) and false on a failed or abandoned tuning. It grants nothing itself.
  async function tuneFirstReed(opts) {
    opts = opts && typeof opts === 'object' ? opts : {};
    if (crafting || cur) return false;
    const name = clean(opts.name, 32), hz = num(opts.hz, 60, 1500, REF);
    sync();
    if (held(RAW) < 1) { sayMsg('You have no fresh Flume-reed to tune.', 'warn', 2800); return false; }
    crafting = true;
    try {
      soundNoise();
      const n = tunes();
      const res = await holdPitch({ curve: makeCurve('first', hz, 7), width: bandFor(n), duration: 7, title: name ? 'Tune a reed to ' + name : 'Tune a First Reed', hint: 'Find their note, and hold it while it breathes.' });
      if (res.aborted) { sayMsg('You put the reed down, uncut.', '', 2200); return false; }
      const q = grade(res.score, n);
      noteTune();
      G.take(RAW);
      if (q === 'fail') { sayMsg('The reed splits along the slot.', 'bad', 3500); return false; }
      sayMsg(name ? 'The reed finds ' + name + '\'s note and keeps it.' : 'The reed finds the note and keeps it.', 'good', 3500);
      firstTuneJournal(); xp(q);
      return true;
    } finally { crafting = false; }
  }

  // ---------------------------------------------------------------- items in use
  function useRoot() {
    if (held(ROOT) < 1) return false;
    G.take(ROOT);
    // steadies the Narrow as the game models it: the Hush meter (stillT) is cleared and held clear a few
    // breaths, noise is nudged into the middle of the band, and a Root-note ward (the song's 12 s; this is 9)
    // keeps cacophony things off. A Hollow already coming for you slows and stops.
    steadyT = 8; G.stillT = 0; calmN = 0;
    G.noise = Math.max(2.4, Math.min(4, G.noise));
    G.rootWard = Math.max(num(G.rootWard, 0, 999, 0), 9);
    let calmed = 0;
    try {
      const c = Engine.cam;
      for (const e of G.ents) {
        if (e.kind !== 'enemy' || e.dead || e.hidden || !e.def || e.def.boss || e.def.wildsBoss) continue;
        if (!(e.def.name || '').includes('Hollow')) continue;
        if (dist2(e.x, e.y, c.x, c.y) > 64) continue;
        if (e.state === 'chase') { e.state = 'idle'; e.alertT = 0; e.calmT = 4; calmed++; calmN++; }
      }
    } catch (e) { /* no enemies */ }
    try { Audio_.sfx.song(174, 1.2); } catch (e) { /* silent */ }
    sayMsg('You sound the root-note reed against your breastbone, once, softly. Your hands warm. The air has a floor under it again.' + (calmed ? ' The Hollows nearby slow, and stand.' : ''), 'good', 5000);
    return true;
  }
  let steadyT = 0, calmN = 0;

  // ---------------------------------------------------------------- the lure's thin note
  let lure = null;    // { x, y, left, map, next }
  function lureStart(pt) {
    if (!pt) return;
    lure = { x: pt.x, y: pt.y, left: DISTRACTIONS[LURE].duration, map: G.mapId, next: 0 };
  }
  function lureTick(dt) {
    if (!lure) return;
    if (lure.map !== G.mapId || G.state === 'title') { lure = null; return; }
    lure.left -= dt; lure.next -= dt;
    if (lure.left <= 0) { lure = null; return; }
    if (lure.next <= 0) {
      lure.next = 1.6;
      try {
        const ctx = Audio_.ctx;
        if (ctx && Audio_.sfxBus && !Audio_.muted) {
          const near = Math.hypot(lure.x - Engine.cam.x, lure.y - Engine.cam.y);
          const vol = 0.05 / (1 + near * 0.35);
          const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
          o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
          o.connect(g); g.connect(Audio_.sfxBus); o.start(t); o.stop(t + 1.3);
        }
      } catch (e) { /* the note is cosmetic */ }
    }
  }

  // ---------------------------------------------------------------- the Reeds panel
  function fires() {
    try { const c = Engine.cam; return G.ents.some(e => ['campfire', 'hearth', 'brazier'].includes(e.sprite) && !e.hidden && dist2(e.x, e.y, c.x, c.y) < 25) || ['tavern', 'lyra_house', 'orla_house', 'cooper_house'].includes(G.mapId); } catch (e) { return false; }
  }
  function openPanel(from) {
    sync();
    const raw = held(RAW), dry = held(DRY), n = tunes();
    G.state = 'panel';
    const rows = RECIPES.map((r) => {
      const ok = raw >= r.need;
      return `<button class="dfbtn small" data-reed="${r.id}" ${ok ? '' : 'disabled'}><b>${r.name}</b> (Flume-Reed ×${r.need})<br><small class="muted">${r.desc}</small></button>`;
    }).join('');
    openModal(`<h2>Reeds</h2><button class="dfbtn small close" id="x">Close</button>
      <p class="muted" id="p9r-state"></p>
      <div class="list">${rows}</div>
      <p class="muted" id="p9r-skill"></p>
      <div class="btns">${dry ? '<button class="dfbtn small" id="p9r-burn">Burn the dry reeds</button>' : ''}<button class="dfbtn small" id="p9r-back">${from === 'craft' ? 'Back to the forge' : from === 'rest' ? 'Back to rest' : from === 'inv' ? 'Back to inventory' : 'Done'}</button></div>`, 'reeds');
    document.getElementById('p9r-state').textContent = `Fresh Flume-reed ×${raw}${raw ? ` · they keep about ${Math.max(1, Math.ceil(hoursLeft()))} more hours` : ''} · Dry reed ×${dry}`;
    document.getElementById('p9r-skill').textContent = `Tunings so far: ${n} · the band is ±${Math.round(bandFor(n) / 2)} cents${set.assist ? ' (assist on)' : ''}.`;
    const leave = () => { closeModal(); G.state = 'play'; };
    document.getElementById('x').onclick = leave;
    document.getElementById('p9r-back').onclick = () => { if (from === 'craft') renderCrafting(); else if (from === 'rest') renderRest(); else if (from === 'inv') renderInventory(); else leave(); };
    const burn = document.getElementById('p9r-burn');
    if (burn) burn.onclick = () => { removeAll(DRY); sayMsg('You feed the dry reeds to the fire. A little smoke, and no sound.', '', 3000); openPanel(from); };
    document.querySelectorAll('[data-reed]').forEach((b) => { b.onclick = async () => { await craft(b.dataset.reed); if (G.state === 'panel' || G.state === 'play') openPanel(from); }; });
  }

  // ---------------------------------------------------------------- wiring
  function wire() {
    const css = document.createElement('style'); css.id = 'reedcraft-style';
    css.textContent = `#modal-panel:has(.reedhp) { width: 84cqw; }
.reedhp canvas { display: block; width: min(100%, 125cqh); height: auto; margin: 0 auto; background: #0e0a07; border: 2px solid #0b0806; touch-action: none; cursor: ns-resize; }
.reedhp .rhp-cap { min-height: 2.4cqh; margin: .3cqh 0; color: var(--gold); font-family: var(--font-sc); }
.reedhp .rhp-keys { font-size: 1.6cqw; }
.reedhp .btns { margin-top: .4cqh; }`;
    document.head.appendChild(css);

    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { addBeds(maps); } catch (e) { console.warn('reed beds failed', e); } return maps; };
      // maps built before this script ran (a game already in progress) get their beds now
      try { if (G.maps) { addBeds(G.maps); refreshBeds(); } } catch (e) { /* nothing built yet */ }
    }
    if (typeof useDeco === 'function') {
      const _u = useDeco;
      useDeco = function (e) {
        if (e && e.use === 'p9_reedbed') { try { cutReed(e); } catch (err) { console.warn('reed cut failed', err); } return; }
        return _u.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _i = useItem;
      useItem = function (slot) {
        const id = slot && slot.id;
        if (id === ROOT) { try { if (useRoot()) { if (typeof renderInventory === 'function' && G.openPanel === 'inv') renderInventory(); return; } } catch (err) { console.warn('root reed failed', err); } return; }
        if (id === DRY) { G.take(DRY); sayMsg('You burn the dry reed. It gives a little smoke and no sound.', '', 3000); if (typeof renderInventory === 'function' && G.openPanel === 'inv') renderInventory(); return; }
        if (id === RAW) { if (on()) { openPanel('inv'); return; } }   // Use on a raw reed opens the Reeds panel
        return _i.apply(this, arguments);
      };
    }
    if (typeof renderCrafting === 'function') {
      const _c = renderCrafting;
      renderCrafting = function () {
        const r = _c.apply(this, arguments);
        try {
          const back = document.getElementById('cr-inv');
          if (on() && back && back.parentNode && !document.getElementById('p9r-tab')) {
            const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = 'p9r-tab'; b.type = 'button';
            b.textContent = 'Reeds (' + held(RAW) + ')'; b.onclick = () => openPanel('craft');
            back.parentNode.insertBefore(b, back);
          }
        } catch (e) { console.warn('reeds tab failed', e); }
        return r;
      };
    }
    if (typeof renderRest === 'function') {
      const _r = renderRest;
      renderRest = function () {
        const r = _r.apply(this, arguments);
        try {
          const list = document.querySelector('#modal-panel .list');
          sync();
          if (on() && G.openPanel === 'rest' && list && held(RAW) > 0 && fires() && !document.getElementById('p9r-rest')) {
            const b = document.createElement('button'); b.className = 'dfbtn'; b.id = 'p9r-rest'; b.type = 'button';
            b.appendChild(document.createTextNode('Tune a reed by the fire '));
            const sm = document.createElement('small'); sm.className = 'muted'; sm.textContent = '— while the Flume-reed is still green.'; b.appendChild(sm);
            b.onclick = () => openPanel('rest'); list.appendChild(b);
          }
        } catch (e) { console.warn('rest reeds failed', e); }
        return r;
      };
    }
    if (typeof throwDistraction === 'function') {
      const _t = throwDistraction;
      throwDistraction = function (id) {
        if (id !== LURE) return _t.apply(this, arguments);
        let pt = null;
        try { if (G.state === 'play') pt = distractionImpact(id); } catch (e) { pt = null; }   // a read-only ray
        const _m = msg; let done = false;
        // the stone's sentence says "stone clatters"; the lure sounds a note
        msg = function (text, cls, ms) {
          if (!done && typeof text === 'string' && text.indexOf('Lure reed:') === 0) { done = true; text = text.replace('stone clatters', 'sounds a thin note'); }
          return _m.call(this, text, cls, ms);
        };
        let r;
        try { r = _t.apply(this, arguments); } finally { msg = _m; }
        if (r && pt) lureStart(pt);
        return r;
      };
    }
    if (typeof openDistractions === 'function') {
      const _o = openDistractions;
      openDistractions = function () {
        const r = _o.apply(this, arguments);
        try {
          const hint = document.querySelector('#modal-panel p.muted:last-of-type');
          if (G.openPanel === 'distractions' && hint) hint.textContent = '1 stone · 2 bottle · 3 lure reed · Escape leaves. Controller: A stone, X bottle, Y lure reed, B leaves.';
        } catch (e) { console.warn('throw hint failed', e); }
        return r;
      };
    }
    // key 3 and pad Y in the throw panel (the original handler knows only 1 and 2)
    window.addEventListener('keydown', (ev) => {
      if (typeof G === 'undefined' || G.openPanel !== 'distractions' || ev.repeat) return;
      if (String(ev.key) === '3') { const b = document.getElementById('throw-' + LURE); if (b) { ev.preventDefault(); ev.stopImmediatePropagation(); b.click(); } }
    }, true);
    if (typeof controlsTick === 'function') {
      const _ct = controlsTick;
      let yPrev = false;
      controlsTick = function () {
        const r = _ct.apply(this, arguments);
        try {
          const g = padNow(), y = !!(g && g.buttons[3] && g.buttons[3].pressed);
          if (y && !yPrev && G.openPanel === 'distractions') { const b = document.getElementById('throw-' + LURE); if (b) b.click(); }
          yPrev = y;
        } catch (e) { /* no pad */ }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _l = loadMap;
      loadMap = function () { const r = _l.apply(this, arguments); try { ensureBeds(G.map); refreshBeds(); lure = null; cutReed.ready = 0; } catch (e) { console.warn('reed refresh failed', e); } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      let acc = 0, lastDay = null;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try {
          if (G.state === 'play' && G.player) {
            if (steadyT > 0) { steadyT -= dt; G.stillT = 0; }
            if (calmN > 0) { calmN = 0; for (const e of G.ents || []) if (e.calmT > 0) { e.calmT -= dt; calmN++; if (e.state === 'chase' && !(e.hp < e.hpMax)) { e.state = 'idle'; e.alertT = 0; } } }
            lureTick(dt);
            acc += dt;
            if (acc >= 1) {
              acc = 0; sync();
              if (lastDay !== G.day) { lastDay = G.day; refreshBeds(); }
              if (G.flags && G.flags.greening && !G.flags.p9r_greened && (tunes() > 0 || G.flags.p9r_seen)) {
                setFlag('p9r_greened', 1);
                // [PROPOSED] the Flume beds go under with the Hedge; the clearing's still stand
                journal('side', 'The reed beds by the Flume went under with the Hedge. There are beds yet in the clearing, where the ground stays wet. A reed is only good for a day, so I will cut them as I need them.');
              }
            }
          }
        } catch (e) { console.warn('reed tick failed', e); }
        return r;
      };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('reed rows failed', e); }
        return r;
      };
    }
  }

  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p9r-head')) return;
    const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) { if (k === 'style') e.style.cssText = props[k]; else e.setAttribute(k, props[k]); } if (text != null) e.textContent = text; return e; };
    grid.appendChild(el('span', { id: 'p9r-head', style: 'grid-column:1/-1;margin-top:1cqh;color:var(--gold);font-family:var(--font-display);letter-spacing:.08em' }, 'Reed-craft'));
    const row = (label, hint) => { const s = el('span', { class: 'gfx-label' }, label); s.appendChild(document.createTextNode(' ')); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const btn = (id, aria, fn) => { const b = el('button', { class: 'dfbtn small', id, type: 'button' }, ''); b.setAttribute('aria-label', aria); b.onclick = () => { fn(); saveSet(); sync2(); if (on() !== wasOn) { wasOn = on(); refreshBeds(); } }; return b; };
    let wasOn = on();
    const bOn = btn('p9r-on', 'Reed-craft', () => { set.on = !set.on; });
    const bAs = btn('p9r-assist', 'Hold the Pitch assist', () => { set.assist = !set.assist; });
    function sync2() {
      bOn.textContent = set.on ? 'On' : 'Off'; bAs.textContent = set.assist ? 'On' : 'Off';
      for (const [b, v] of [[bOn, set.on], [bAs, set.assist]]) { b.setAttribute('aria-pressed', v ? 'true' : 'false'); b.classList.toggle('sel', v); }
    }
    grid.appendChild(row('Reed beds', 'Flume-reed to cut, the Reeds button at the forge, the lure in the throw menu'));
    grid.appendChild(bOn);
    grid.appendChild(row('Hold the Pitch assist', 'a wider band to follow'));
    grid.appendChild(bAs);
    sync2();
  }

  loadSet();
  try { wire(); } catch (e) { console.warn('reedcraft failed to wire', e); }

  return {
    set, loadSet, saveSet, on, REF, RECIPES, BEDS, PER_BED,
    holdPitch, tuneFirstReed, craft, openPanel, sync, hoursLeft, held, grade, bandFor, trueAt, makeCurve, normCurve, centsAt, toCents, toHz,
    cutReed, bedCut, refreshBeds, addBeds, ensureBeds, useRoot, lureStart,
    get session() { return cur; }, get lure() { return lure; }, get steady() { return steadyT; }, get busy() { return !!(cur || crafting); },
    audio() { return cur && cur.tone ? { active: true, playerHz: cur.tone.playerHz, droneHz: cur.tone.droneHz, playerGain: cur.tone.playerGain, droneGain: cur.tone.droneGain } : Object.assign({}, lastTone); },
    soundNoise, appendRows,
    get forceManual() { return forceManual; }, set forceManual(v) { forceManual = !!v; },
  };
})();
if (typeof window !== 'undefined') window.REEDS = REEDS;
