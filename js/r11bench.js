// r11bench — ROADMAP R11 phase 1, team BENCH.
// The quality setting (Auto / Ultra / High / Phone), dynamic resolution, the first-run automatic pick and the in-game
// benchmark: a fixed 20 s flight round Oakhaven's square at 10:00, so the owner and his brother can measure the realistic
// view on their own machines and send the report back. Window.R11BENCH = { sample, renderScale, autoTier, run, report,
// choose, choice, tier, pick, budget, state }.
//  - Settings live in localStorage 'octave.r11.v1' (merged with CORE's keys): tier = the tier in force, tierManual = true
//    when the player chose it by hand (never overridden), tierChecked = the first-play frame check has run.
//  - Everything cross-team is guarded: without window.R11 the module still keeps the setting and the benchmark runs on
//    whichever renderer draws (R11, R3D or the raycaster) and says which.
//  - Frame times measured on a software rasteriser mean nothing; this only measures, it never claims a number.
'use strict';
const R11BENCH = (function () {
  const KEY = 'octave.r11.v1';
  const TIERS = ['ultra', 'high', 'phone'];
  const BUDGET = { ultra: 1000 / 60, high: 1000 / 60, phone: 33 };   // ms per frame the renderScale tries to hold
  // day 17 is a Rootday (17 % 8 = 1): not Hearthday the Rite (day 10), not the Last Sheaf (2), not a Massday market (day % 8 = 3), not Canopy (31)
  const SCENE = { map: 'oakhaven', tod: 10 / 24, day: 17, id: 'oakhaven-square-10:00' };
  const TEXTS = [
    'Graphics quality', 'Auto picks for your device; Ultra, High and Phone are fixed choices',
    'Auto: Ultra', 'Auto: High', 'Auto: Phone', 'Ultra', 'High', 'Phone',
    'Benchmark', 'A 20 second flight round Oakhaven\'s square, then everything is put back as it was', 'Run benchmark',
    'Benchmark running', 'Esc to stop', 'Benchmark result',
    'Oakhaven\'s square at 10:00. Copy the report and send it to whoever is tuning the game.',
    'Frames per second', 'Average frame', '95% of frames under', '99% of frames under', 'Draw calls', 'Triangles', 'Render size', 'Renderer', 'Quality', 'GPU',
    'Realistic (R11)', 'True 3D (R3D)', 'Raycaster', 'Auto', 'Manual',
    'Copy report', 'Copied', 'Copy did not work: select the text below and copy it by hand', 'Close',
  ];

  // ---------------------------------------------------------------- storage (try/catch, merged)
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function save(patch) { try { const o = load(); Object.assign(o, patch); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* none */ } }

  const st = { tier: 'high', manual: false, checked: false, scale: 1, win: [], clock: 0, lastStep: -1e9, frozen: false,
    watch: { t: 0, skip: 0.5, samples: [], on: false }, running: false, last: null, report: null, ui: null };

  // ---------------------------------------------------------------- the first-run pick
  function hints() {
    const h = { coarse: false, mobile: false, mem: null, cores: null };
    try { h.coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { /* none */ }
    try { h.mobile = /Android|iPhone|iPad|iPod|Mobile|CrOS.*Tablet/i.test(navigator.userAgent || ''); } catch (e) { /* none */ }
    try { if (navigator.deviceMemory) h.mem = +navigator.deviceMemory; } catch (e) { /* none */ }
    try { if (navigator.hardwareConcurrency) h.cores = +navigator.hardwareConcurrency; } catch (e) { /* none */ }
    return h;
  }
  // Pure: hints in, tier out (the frame check that follows can only step it down).
  function pick(h) {
    h = h || hints();
    const mem = h.mem, cores = h.cores;
    if (h.coarse || h.mobile) return (mem && mem >= 8 && cores && cores >= 8) ? 'high' : 'phone';
    if ((mem && mem <= 4) || (cores && cores <= 4)) return 'high';
    if (cores && cores >= 8 && (!mem || mem >= 8)) return 'ultra';
    return 'high';
  }
  function apply(t) {
    if (TIERS.indexOf(t) < 0) return st.tier;
    const changed = t !== st.tier;
    st.tier = t;
    if (changed) { st.scale = 1; st.win.length = 0; }
    try { if (typeof window.R11 !== 'undefined' && window.R11 && typeof window.R11.setTier === 'function' && (typeof window.R11.tier !== 'function' || window.R11.tier() !== t)) window.R11.setTier(t); } catch (e) { /* CORE not ready */ }
    syncRows();
    return t;
  }
  // The tier in force at first run: a manual choice stands untouched; otherwise the stored automatic result, else the pick.
  function autoTier() {
    const o = load();
    if (o.tierManual === true && TIERS.indexOf(o.tier) >= 0) { st.manual = true; st.tier = o.tier; return o.tier; }
    st.manual = false;
    if (o.tierChecked === true && TIERS.indexOf(o.tier) >= 0) { st.checked = true; st.tier = o.tier; return o.tier; }
    const t = pick();
    st.tier = t; save({ tier: t, tierManual: false });
    return t;
  }
  // The player's choice from Options: 'auto' or a tier.
  function choose(c) {
    if (c === 'auto') {
      st.manual = false; st.checked = false; st.watch = { t: 0, skip: 0.5, samples: [], on: true };
      const t = pick(); save({ tier: t, tierManual: false, tierChecked: false }); apply(t);
    } else if (TIERS.indexOf(c) >= 0) {
      st.manual = true; st.watch.on = false; save({ tier: c, tierManual: true }); apply(c);
    }
    return st.manual ? st.tier : 'auto';
  }
  const choice = () => (st.manual ? st.tier : 'auto');

  // ---------------------------------------------------------------- frame times: the first-play check, dynamic resolution
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
  function playing() { try { return typeof G === 'undefined' || G.state === 'play'; } catch (e) { return true; } }

  function checkFirstPlay(dt) {
    const w = st.watch;
    if (st.manual || st.checked || !w.on || !playing()) return;
    w.t += dt / 1000;
    if (w.t <= w.skip) return;                       // shader compiles and the map build hitch the first half second
    w.samples.push(dt);
    if (w.t < w.skip + 3) return;
    const med = median(w.samples); w.on = false; w.samples = [];
    st.checked = true;
    let t = st.tier;
    if (med > BUDGET[t] && TIERS.indexOf(t) < TIERS.length - 1) t = TIERS[TIERS.indexOf(t) + 1];
    save({ tier: t, tierManual: false, tierChecked: true });
    if (t !== st.tier) {
      apply(t);
      try { if (typeof msg === 'function') msg('Graphics quality set to ' + t.charAt(0).toUpperCase() + t.slice(1) + ' to keep the game smooth: Options to change', 'warn', 6500); } catch (e) { /* none */ }
    }
  }

  // dtMs: the frame time CORE measured. Returns the render scale now in force.
  function sample(dtMs) {
    dtMs = +dtMs;
    if (!(dtMs > 0) || dtMs > 250) return st.scale;   // a stall (tab switch, map load) says nothing about the GPU
    st.clock += dtMs;
    if (st.running || st.frozen) return st.scale;
    checkFirstPlay(dtMs);
    st.win.push(dtMs); if (st.win.length > 60) st.win.shift();
    if (st.win.length >= 30 && st.clock - st.lastStep >= 1000) {
      const med = median(st.win), b = BUDGET[st.tier] || BUDGET.high;
      if (med > b && st.scale > 0.5) { st.scale = Math.max(0.5, Math.round((st.scale - 0.1) * 100) / 100); st.lastStep = st.clock; st.win.length = 0; }
      else if (med < b * 0.75 && st.scale < 1) { st.scale = Math.min(1, Math.round((st.scale + 0.05) * 100) / 100); st.lastStep = st.clock; st.win.length = 0; }
    }
    return st.scale;
  }
  const renderScale = () => (st.frozen || st.running ? 1 : st.scale);

  // ---------------------------------------------------------------- the benchmark path
  // Corners are chosen on Oakhaven's open ground round the square; a Catmull-Rom closed spline smooths them and every
  // sample is checked against the map (a wall or a solid prop moves the sample to the nearest open cell).
  const WAYPOINTS = [[17.5, 24.5], [24, 24.5], [30, 24.5], [36.5, 24.5], [43.5, 24.5], [43.5, 30], [43.5, 35], [37, 35.5], [30, 35.5], [23.5, 35.5], [17.5, 35], [17.5, 30], [17.5, 27]];
  function openGrid(m) {
    const g = new Uint8Array(m.w * m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) g[y * m.w + x] = m.get(x, y) ? 1 : 0;
    for (const e of m.entities || []) {
      if (!e || e.transient || e.kind !== 'deco' || e.solid === false || !(e.radius >= 0.3)) continue;
      const x = Math.floor(e.x), y = Math.floor(e.y); if (x >= 0 && y >= 0 && x < m.w && y < m.h) g[y * m.w + x] = 1;
    }
    return g;
  }
  function nearestOpen(g, m, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= m.w || Y >= m.h) continue;
      if (!g[Y * m.w + X]) return [X + 0.5, Y + 0.5];
    }
    return [x, y];
  }
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
  }
  // Returns a function k in [0,1) -> { x, y, dir } along the closed loop (uniform in spline parameter, not arc length: the
  // corners are spaced evenly enough that speed stays close to steady).
  function buildPath(m) {
    const g = openGrid(m), P = WAYPOINTS.map((p) => nearestOpen(g, m, p[0], p[1])), n = P.length, N = 40, pts = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < N; j++) {
      const q = catmull(P[(i + n - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n], j / N);
      const o = g[Math.floor(q[1]) * m.w + Math.floor(q[0])] ? nearestOpen(g, m, q[0], q[1]) : q;
      pts.push(o);
    }
    // arc-length table so the flight moves at a steady pace
    const cum = [0]; for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = cum[cum.length - 1];
    const at = (k) => {
      const d = (((k % 1) + 1) % 1) * total; let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
      const a = pts[lo % pts.length], b = pts[(lo + 1) % pts.length], f = (d - cum[lo]) / Math.max(1e-9, cum[lo + 1] - cum[lo]);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    };
    return { points: pts, length: total, at(k) { const p = at(k), q = at(k + 0.004); return { x: p[0], y: p[1], dir: Math.atan2(q[1] - p[1], q[0] - p[0]) }; } };
  }

  // ---------------------------------------------------------------- what draws, and how big
  function which() {
    try { if (window.R11 && typeof window.R11.active === 'function' && window.R11.active()) return 'R11'; } catch (e) { /* none */ }
    try { if (typeof R3D !== 'undefined' && R3D.shown && R3D.shown()) return 'R3D'; } catch (e) { /* none */ }
    return 'raycaster';
  }
  let gpuName = null;
  function gpu() {
    if (gpuName) return gpuName;
    let gl = null;
    try { const r = window.R11 && window.R11.renderer; if (r && r.getContext) gl = r.getContext(); } catch (e) { /* none */ }
    try { if (!gl && typeof R3D !== 'undefined' && R3D.gl) gl = R3D.gl(); } catch (e) { /* none */ }
    let made = null;
    try { if (!gl) { made = document.createElement('canvas'); gl = made.getContext('webgl2') || made.getContext('webgl'); } } catch (e) { /* none */ }
    let n = 'unknown';
    try { if (gl) { const x = gl.getExtension('WEBGL_debug_renderer_info'); n = String((x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || 'unknown'); } } catch (e) { /* none */ }
    try { if (made) { const l = gl && gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); } } catch (e) { /* none */ }
    gpuName = n; return n;
  }
  function renderSize(w) {
    try {
      if (w === 'R11' && window.R11.renderer && window.R11.renderer.getDrawingBufferSize) { const v = window.R11.renderer.getDrawingBufferSize(new window.R11.THREE.Vector2()); return [v.x, v.y]; }
    } catch (e) { /* none */ }
    try { if (w === 'R3D') { const gl = R3D.gl(); if (gl) return [gl.drawingBufferWidth, gl.drawingBufferHeight]; } } catch (e) { /* none */ }
    try { const c = document.querySelector('#view') || Engine.canvas; if (c && c.width) return [c.width, c.height]; } catch (e) { /* none */ }
    return [0, 0];
  }
  function gpuInfo(w) {
    try { if (w === 'R11' && window.R11.renderer && window.R11.renderer.info) { const i = window.R11.renderer.info.render; return [i.calls | 0, i.triangles | 0]; } } catch (e) { /* none */ }
    return null;
  }

  // ---------------------------------------------------------------- the run
  function inGame() { try { return typeof G !== 'undefined' && G.map && G.player && typeof snapshotGame === 'function' && typeof restoreGame === 'function' && typeof loadMap === 'function'; } catch (e) { return false; } }
  function buildReport(frames, o) {
    const s = frames.dt.slice(Math.min(10, Math.max(0, frames.dt.length - 5)));   // the first frames are shader and texture warm-up
    const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length), r2 = (v) => Math.round(v * 100) / 100;
    const d = frames.draws.slice().sort((a, b) => a - b), t = frames.tris.slice().sort((a, b) => a - b);
    const sz = o.size;
    return {
      scene: SCENE.id, renderer: o.renderer, style: (function () { try { return window.R11 && window.R11.style ? window.R11.style() : 'unknown'; } catch (e) { return 'unknown'; } })(),
      tier: st.tier, tierMode: st.manual ? 'manual' : 'auto', scale: 1,
      date: new Date().toISOString(), durationMs: Math.round(o.elapsed), frames: s.length,
      fps: r2(1000 / Math.max(0.001, avg)), avgMs: r2(avg), p50Ms: r2(pct(s, 0.5)), p95Ms: r2(pct(s, 0.95)), p99Ms: r2(pct(s, 0.99)), maxMs: r2(Math.max(0, ...s)),
      draws: d.length ? d[d.length >> 1] : null, triangles: t.length ? t[t.length >> 1] : null,
      renderSize: sz, dpr: (function () { try { return window.devicePixelRatio || 1; } catch (e) { return 1; } })(),
      gpu: gpu(), ua: (function () { try { return navigator.userAgent; } catch (e) { return ''; } })(),
      cores: hints().cores, memoryGB: hints().mem, greening: !!(function () { try { return G.flags && G.flags.greening; } catch (e) { return false; } })(),
      aborted: !!o.aborted,
    };
  }
  function drawOverlay(show, secLeft) {
    let el = document.getElementById('r11bench-hud');
    if (!show) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'r11bench-hud'; el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;padding:6px 14px;background:rgba(10,8,6,.78);color:#e8d9b0;border:1px solid #8a6a3a;font:14px/1.3 Georgia,serif;pointer-events:none;letter-spacing:.04em;border-radius:3px';
      el.innerHTML = '<span class="a"></span> <b class="n"></b> <span class="b"></span>';
      el.querySelector('.a').textContent = 'Benchmark running'; el.querySelector('.b').textContent = 'Esc to stop';
      (document.getElementById('game') || document.body).appendChild(el);
    }
    el.querySelector('.n').textContent = Math.max(0, Math.ceil(secLeft)) + ' s';
  }

  function run(opts) {
    opts = opts || {};
    const duration = +opts.duration > 0 ? +opts.duration : 20000;
    if (st.running && st.running.promise) return st.running.promise;
    if (!inGame()) return Promise.resolve(null);
    const R = { aborted: false, promise: null };
    st.running = R;
    R.promise = new Promise((resolve) => {
      let snap, prev;
      try {
        snap = snapshotGame();
        prev = { state: G.state, pitch: Engine.cam.pitch || 0, bob: Engine.cam.bob || 0 };
        try { if (typeof closeModal === 'function') closeModal(); } catch (e) { /* none */ }
        G.state = 'paused'; G.keys = {};
        G.tod = SCENE.tod; G.day = SCENE.day; try { if (typeof Weather !== 'undefined' && Weather.hold) Weather.hold('clear'); } catch (e) { /* none */ }
        const wasGreen = G.flags && G.flags.greening;
        loadMap(SCENE.map, { x: WAYPOINTS[0][0], y: WAYPOINTS[0][1], dir: 0 });
        G.tod = SCENE.tod; G.day = SCENE.day; G.fadeT = 0; G.state = 'paused'; Engine.cam.pitch = 0; Engine.cam.bob = 0;
        void wasGreen;
      } catch (e) { st.running = false; resolve(null); return; }
      const path = buildPath(G.map), frames = { dt: [], draws: [], tris: [] };
      const t0 = performance.now(); let last = t0, n = 0, done = false;
      const onKey = (e) => { if (e.key === 'Escape') { R.aborted = true; } };
      window.addEventListener('keydown', onKey, true);
      const finish = () => {
        if (done) return; done = true;
        window.removeEventListener('keydown', onKey, true);
        const elapsed = performance.now() - t0, w = which(), size = renderSize(w);
        drawOverlay(false);
        try { if (typeof Weather !== 'undefined' && Weather.release) Weather.release(); } catch (e) { /* none */ }
        let restored = true;
        try { restoreGame(snap); Engine.cam.pitch = prev.pitch; Engine.cam.bob = prev.bob; G.state = prev.state === 'event' ? 'play' : prev.state; G.fadeT = 0; }
        catch (e) { restored = false; try { console.warn('r11bench: restore failed', e); } catch (e2) { /* none */ } }
        st.running = false;
        const rep = buildReport(frames, { renderer: w, size, elapsed, aborted: R.aborted });
        rep.restored = restored;
        st.report = rep; st.last = rep;
        if (!R.aborted && opts.card !== false) showCard(rep);
        syncRows();
        resolve(rep);
      };
      const step = (now) => {
        if (done) return;
        if (R.aborted) { finish(); return; }
        const dt = now - last; last = now;
        const k = (now - t0) / duration;
        if (k >= 1) { finish(); return; }
        const p = path.at(k);
        Engine.cam.x = p.x; Engine.cam.y = p.y; Engine.cam.dir = p.dir; Engine.cam.pitch = 0.03 * Math.sin(k * Math.PI * 8);
        G.state = 'paused';
        if (n++ > 0) {
          frames.dt.push(dt);
          const gi = gpuInfo(which()); if (gi) { frames.draws.push(gi[0]); frames.tris.push(gi[1]); }
        }
        drawOverlay(true, (duration - (now - t0)) / 1000);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return R.promise;
  }
  const report = () => st.report;

  // ---------------------------------------------------------------- the result card
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function showCard(rep) {
    if (typeof showEvent !== 'function') return;
    const rn = rep.renderer === 'R11' ? 'Realistic (R11)' : rep.renderer === 'R3D' ? 'True 3D (R3D)' : 'Raycaster';
    const tn = rep.tier.charAt(0).toUpperCase() + rep.tier.slice(1);
    const row = (label, val) => '<tr><td style="padding:2px 14px 2px 0;opacity:.8">' + label + '</td><td style="padding:2px 0;text-align:right"><b>' + val + '</b></td></tr>';
    const unit = (v, u) => esc(v) + ' ' + u;
    const html = '<span>Oakhaven\'s square at 10:00. Copy the report and send it to whoever is tuning the game.</span>' +
      '<table style="margin:1cqh auto;border-collapse:collapse;font-size:inherit">' +
      row('Frames per second', unit(rep.fps, 'fps')) + row('Average frame', unit(rep.avgMs, 'ms')) +
      row('95% of frames under', unit(rep.p95Ms, 'ms')) + row('99% of frames under', unit(rep.p99Ms, 'ms')) +
      row('Draw calls', rep.draws == null ? '-' : esc(rep.draws)) + row('Triangles', rep.triangles == null ? '-' : esc(rep.triangles)) +
      row('Render size', esc(rep.renderSize[0] + ' × ' + rep.renderSize[1])) +
      row('Renderer', '<span>' + rn + '</span>') + row('Quality', '<span>' + tn + '</span> (<span>' + (rep.tierMode === 'manual' ? 'Manual' : 'Auto') + '</span>)') +
      row('GPU', '<span style="font-size:.85em">' + esc(rep.gpu) + '</span>') +
      '</table><div id="r11b-copywrap"><button type="button" class="dfbtn" id="r11b-copy">Copy report</button></div>';
    showEvent('Benchmark result', html, [{ t: 'Close' }]);
    const b = document.getElementById('r11b-copy'); if (!b) return;
    b.onclick = (ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      const text = JSON.stringify(rep, null, 2), manual = () => {
        b.textContent = 'Copy report'; const wrap = document.getElementById('r11b-copywrap'); if (!wrap) return;
        let ta = document.getElementById('r11b-ta');
        if (!ta) { const p = document.createElement('p'); p.textContent = 'Copy did not work: select the text below and copy it by hand'; wrap.appendChild(p); ta = document.createElement('textarea'); ta.id = 'r11b-ta'; ta.readOnly = true; ta.rows = 8; ta.style.cssText = 'width:100%;font:11px monospace'; wrap.appendChild(ta); }
        ta.value = text; ta.focus(); ta.select();
      };
      try {
        const p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard'));
        p.then(() => { b.textContent = 'Copied'; }, manual);
      } catch (e) { manual(); }
    };
  }

  // ---------------------------------------------------------------- Options rows
  const ROWS = [
    ['r11-tier', 'Graphics quality', 'Auto picks for your device; Ultra, High and Phone are fixed choices'],
    ['r11-bench', 'Benchmark', 'A 20 second flight round Oakhaven\'s square, then everything is put back as it was'],
  ];
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function syncRows() {
    if (typeof document === 'undefined') return;
    const b = document.getElementById(ROWS[0][0]);
    if (b) { b.textContent = st.manual ? cap(st.tier) : 'Auto: ' + cap(st.tier); b.setAttribute('aria-pressed', st.manual ? 'true' : 'false'); b.classList.toggle('sel', st.manual); }
    const r = document.getElementById(ROWS[1][0]);
    if (r) { r.disabled = !!st.running || !inGame(); }
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById(ROWS[0][0]) || !document.getElementById('gfx-state')) return;
    let anchor = document.getElementById('r3d-cap') || document.getElementById('r3d-mode') || document.getElementById('gpu-comp') || document.getElementById('gfx-curve');
    for (const [id, name, hint] of ROWS) {
      const lab = document.createElement('span'); lab.className = 'gfx-label'; lab.id = id + '-label'; lab.textContent = name + ' ';
      const small = document.createElement('small'); small.className = 'muted'; small.id = id + '-hint'; small.textContent = hint; lab.appendChild(small);
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = id; b.type = 'button'; b.setAttribute('aria-label', name);
      if (id === 'r11-tier') {
        b.onclick = () => { const order = ['auto'].concat(TIERS), i = order.indexOf(choice()); choose(order[(i + 1) % order.length]); syncRows(); };
      } else {
        b.textContent = 'Run benchmark';
        b.onclick = () => { b.disabled = true; run(); };
      }
      if (anchor && anchor.parentNode === grid) { anchor.insertAdjacentElement('afterend', b); anchor.insertAdjacentElement('afterend', lab); anchor = b; }
      else { grid.appendChild(lab); grid.appendChild(b); }
    }
    syncRows();
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function' || wireMenu.done) return;
    wireMenu.done = true;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendRows(); } catch (e) { try { console.warn('r11bench: rows', e); } catch (e2) { /* none */ } } return r; };
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    autoTier();
    st.watch.on = !st.manual && !st.checked;
    apply(st.tier);
    wireMenu();
    // CORE may not exist yet when this file runs: hand it the tier once it does
    const again = () => { try { apply(st.tier); } catch (e) { /* none */ } };
    try { window.addEventListener('r11three', again); } catch (e) { /* none */ }
    try { if (typeof setTimeout === 'function') { setTimeout(again, 500); setTimeout(again, 2500); } } catch (e) { /* none */ }
  }
  if (typeof window !== 'undefined' && typeof document !== 'undefined') { try { boot(); } catch (e) { /* never block the game */ } }

  return {
    sample, renderScale, autoTier, run, report, choose, choice, pick, hints, buildPath, TEXTS, TIERS, BUDGET, SCENE, WAYPOINTS,
    tier: () => st.tier, budget: () => BUDGET[st.tier], running: () => !!st.running,
    // test hooks
    state: st, _reset() { st.scale = 1; st.win.length = 0; st.clock = 0; st.lastStep = -1e9; },
  };
})();
if (typeof window !== 'undefined') window.R11BENCH = R11BENCH;
