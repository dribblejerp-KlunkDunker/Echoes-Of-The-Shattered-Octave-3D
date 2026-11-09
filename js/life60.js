// ============================================================
//  life60 — the lived-in world: people who walk their day (the owner, 7 Nov 2026; ROADMAP R10).
//
//  An engine for ambient townsfolk who keep a schedule and walk it. A place registers a roster (LIFE60.add(mapId, roster,
//  opts)); each person has stops by the hour, and at each stop a job you can see: selling, sweeping, carrying, hammering,
//  picking, scrubbing, hanging washing, chatting, playing, keeping watch. Between stops they walk a real route through the
//  map (a breadth-first path over the map's open cells, round anything solid). At a 'home' stop they walk to their door
//  and go in (hidden), so the streets empty at night. They can be spoken to (a line or two, and one topic), and when you
//  pass close you overhear them (a line, now and then). Every line has French.
//
//  Contract, so nothing else breaks:
//    * Every walker is a TRANSIENT npc entity (id 'p60_<key>', transient:true, _life) appended after the map is built:
//      never saved, rebuilt on every load; their NPCS entries are added once. Positions are a pure function of the hour
//      when time jumps (load, restore, rest): they snap to where the hour puts them. Only while you watch do they walk.
//    * Props for their work (a cart, a washing line, baskets, a sawhorse...) are transient decos too.
//    * They never block you (solid:false). They do count as witnesses to theft: that is what a busier town means.
//    * A place can say when its people are gone (opts.gone, e.g. Oakhaven after the Greening): then none are staged.
//    * Switch: GFX.life (default true). Off: nobody is staged.
// ============================================================
'use strict';

if (typeof GFX !== 'undefined' && GFX.life === undefined) GFX.life = true;

const LIFE60 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const PI = Math.PI;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('life60: ' + k + ' failed', e); } };
  const on = () => typeof GFX === 'undefined' || GFX.life !== false;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const inRange = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  const PLACES = {};        // mapId -> { roster, opts }
  const SPEED = 1.05;       // cells a second, walking
  const BARK_NEAR = 3.6, BARK_GAP = 11, BARK_OWN = 45, ARRIVE_QUIET = 5;
  const TX = { topicWork: S('What are you doing?'), topicPlace: S('How are things here?') };

  // ================================================================ a private random stream (the game's rolls stay untouched)
  let seed = 0x9e3779b9;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };

  // ================================================================ art: recoloured townsfolk, and props for the work
  function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
  function rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; if (s === 0) return [l, l, l].map((v) => Math.round(v * 255)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255)); }
  // cloth only: skin (warm, light) and hair (dark) keep their colour
  function variant(src, dst, hueTo, satK, litK) {
    try {
      const s = Engine.sprites[src]; if (!s || Engine.sprites[dst]) return;
      const d = new Uint32Array(s.data.length);
      for (let i = 0; i < d.length; i++) {
        const v = s.data[i], a = v >>> 24; if (!a) { d[i] = v; continue; }
        const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255, [h, sa, l] = hsl(r, g, b);
        const skin = h >= 8 && h <= 42 && sa > 0.18 && sa < 0.75 && l > 0.42 && l < 0.86;
        if (skin || l < 0.14 || sa < 0.08) { d[i] = v; continue; }
        const [R, Gc, B] = rgb(hueTo, Math.min(1, sa * satK), Math.min(0.92, l * litK));
        d[i] = (a << 24) | (B << 16) | (Gc << 8) | R;
      }
      Engine.addSprite(dst, Object.assign({}, s, { data: d }));
    } catch (e) { warnOnce('variant', e); }
  }
  function paintProps() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites.p60_cart)) return;
    const mk = (name, w, h, hs, fn) => { const d = new Uint32Array(w * h); const px = (x, y, r, g, b, a) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = ((a == null ? 255 : a) << 24) | (b << 16) | (g << 8) | r; }; fn(px, w, h); Engine.addSprite(name, { w, h, data: d, hs, cx: 0.5, dy: 0 }); };
    // a handcart with a load under sacking
    mk('p60_cart', 40, 22, 0.75, (px, w, h) => {
      for (let x = 4; x < 36; x++) for (let y = 9; y < 14; y++) px(x, y, 112 - (y - 9) * 6, 80 - (y - 9) * 4, 48);
      for (let x = 6; x < 34; x++) for (let y = 2; y < 9; y++) if ((x - 20) * (x - 20) / 220 + (y - 9) * (y - 9) / 50 < 1) px(x, y, 150 + ((x * 7 + y) % 9), 132 + ((x * 3) % 7), 98);
      for (const cx of [10, 30]) for (let a = 0; a < 40; a++) { const t = a / 40 * PI * 2; px(cx + Math.cos(t) * 5, 16 + Math.sin(t) * 5, 60, 44, 30); px(cx + Math.cos(t) * 2, 16 + Math.sin(t) * 2, 80, 60, 40); }
      for (let x = 36; x < 40; x++) px(x, 10, 96, 70, 44);
    });
    // a washing line with sheets and a shirt
    mk('p60_line', 48, 30, 1.25, (px) => {
      for (let y = 4; y < 30; y++) { px(1, y, 92, 70, 46); px(46, y, 92, 70, 46); }
      for (let x = 1; x < 47; x++) px(x, 5 + Math.round(Math.sin(x / 47 * PI) * 2), 70, 66, 60);
      const cloth = [[4, 14, [222, 220, 210]], [16, 26, [176, 64, 54]], [29, 34, [210, 206, 190]], [36, 44, [96, 112, 140]]];
      for (const [a, b, c] of cloth) for (let x = a; x < b; x++) for (let y = 7; y < 7 + 9 + ((x * 3) % 4); y++) px(x, y + Math.round(Math.sin(x / 47 * PI) * 2), c[0] - (y % 3) * 6, c[1] - (y % 3) * 6, c[2] - (y % 3) * 6);
    });
    // a basket of apples
    mk('p60_basket', 18, 12, 0.32, (px) => {
      for (let x = 2; x < 16; x++) for (let y = 5; y < 12; y++) px(x, y, ((x + y) % 2 ? 150 : 128), ((x + y) % 2 ? 112 : 96), 60);
      for (const [x, y, c] of [[5, 4, 0], [8, 3, 1], [11, 4, 0], [13, 3, 1], [7, 5, 0], [10, 5, 1]]) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) px(x + i, y + j, c ? 188 : 160, c ? 52 : 140, c ? 40 : 40);
    });
    // a sawhorse with a plank
    mk('p60_saw', 30, 14, 0.5, (px) => {
      for (let x = 0; x < 30; x++) for (let y = 3; y < 6; y++) px(x, y, 176 - y * 4, 140 - y * 4, 92);
      for (const cx of [7, 23]) for (let y = 5; y < 14; y++) { px(cx - (y - 5) * 0.5, y, 108, 80, 52); px(cx + (y - 5) * 0.5, y, 108, 80, 52); }
    });
    // a harvest garland: plaited straw, rowan berries, ribbons
    mk('p60_garland', 44, 10, 0.3, (px) => {
      for (let x = 0; x < 44; x++) { const y = 2 + Math.round(Math.sin(x / 43 * PI) * 4); for (let k = 0; k < 3; k++) px(x, y + k, 206 - k * 20, 170 - k * 18, 82); if (x % 6 === 3) { px(x, y + 3, 196, 40, 36); px(x + 1, y + 3, 176, 32, 30); } }
      for (const x of [0, 43]) for (let y = 0; y < 10; y++) px(x, y, (y % 2 ? 60 : 200), (y % 2 ? 90 : 70), (y % 2 ? 160 : 60));
    });
  }
  function paint() {
    paintProps();
    try {
      variant('townsman', 'p60_man_a', 210, 0.9, 0.9);    // slate-blue coat
      variant('townsman', 'p60_man_b', 95, 0.8, 0.85);    // moss
      variant('townsman', 'p60_man_c', 30, 0.7, 0.95);    // russet leather
      variant('townswoman', 'p60_wom_a', 355, 0.95, 0.9); // madder red
      variant('townswoman', 'p60_wom_b', 45, 0.9, 1.0);   // ochre
      variant('townswoman', 'p60_wom_c', 255, 0.6, 0.85); // heather
    } catch (e) { warnOnce('paint', e); }
  }

  // ================================================================ routes
  const grids = {};
  function grid(m) {
    if (grids[m.id] && grids[m.id].m === m) return grids[m.id].g;
    const g = new Uint8Array(m.w * m.h);
    const P = PLACES[m.id], walk = P && P.opts && P.opts.walk;   // a place can say which ground its people keep to (a quay, not the sea)
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.get(x, y); g[y * m.w + x] = c ? 1 : (walk && !walk(m, x, y) ? 1 : 0); }
    for (const e of m.entities || []) {
      if (!e || e.transient || e.kind !== 'deco' || e.solid === false || !(e.radius >= 0.3)) continue;
      const x = Math.floor(e.x), y = Math.floor(e.y); if (x >= 0 && y >= 0 && x < m.w && y < m.h) g[y * m.w + x] = 1;
    }
    grids[m.id] = { m, g };
    return g;
  }
  function path(m, ax, ay, bx, by) {
    const g = grid(m), W = m.w, H = m.h;
    const sx = Math.floor(ax), sy = Math.floor(ay), tx = Math.floor(bx), ty = Math.floor(by);
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    if (!inside(sx, sy) || !inside(tx, ty)) return null;
    if (sx === tx && sy === ty) return [[bx, by]];
    const prev = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
    let qh = 0, qt = 0; const s = sy * W + sx, t = ty * W + tx;
    if (s < 0 || s >= W * H) return [[bx, by]];
    q[qt++] = s; prev[s] = s;
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (qh < qt) {
      const c = q[qh++]; if (c === t) break;
      const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of D) {
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx; if (prev[n] !== -1) continue;
        if (g[n] && n !== t) continue;
        if (dx && dy && (g[cy * W + nx] || g[ny * W + cx])) continue;   // no cutting corners
        prev[n] = c; q[qt++] = n;
      }
    }
    if (prev[t] === -1) return null;
    const out = []; for (let c = t; c !== s; c = prev[c]) out.push([(c % W) + 0.5, ((c / W) | 0) + 0.5]);
    out.reverse(); out[out.length - 1] = [bx, by];
    return out;
  }

  // ================================================================ the schedule
  // stop: { from, to, job, at:[x,y], to2:[x,y] (a shuttle), area:r (wander), face (angle or 'p60_key'), prop }
  function stopAt(p, h) { for (const s of p.day) if (inRange(h, s.from, s.to)) return s; return p.day[p.day.length - 1]; }
  const homeOf = (p) => p.home;
  function spot(p, s) {
    if (s.job === 'home') return homeOf(p);
    return s.at;
  }

  // ================================================================ staging
  function npcDef(p) {
    const greet = p.greet;
    const topics = {}; if (p.work) topics[TX.topicWork] = p.work; if (p.place) topics[TX.topicPlace] = p.place;
    // the NPCS entry names the base figure (townsman / townswoman), so voices and anything else keyed on it still find it;
    // the walker itself wears the recoloured cloth
    const base = /^p60_man/.test(p.sprite) ? 'townsman' : /^p60_wom/.test(p.sprite) ? 'townswoman' : p.sprite;
    return { name: p.name, sprite: base, portrait: p.portrait || (/wom|child/.test(p.sprite) ? 'townswoman' : 'townsman'), tier: 'low', greet: { polite: greet, normal: greet, blunt: greet }, topics, quest: p.quest || (() => null), rumour: !p.quest, _life: true };
  }
  function fits(m, p) {
    const pts = [p.home]; for (const st of p.day) { if (st.at) pts.push(st.at); if (st.to2) pts.push(st.to2); }
    return pts.every((q) => q[0] >= 0 && q[1] >= 0 && q[0] < m.w && q[1] < m.h && open(m, q[0], q[1]));
  }
  const gone = (p) => { try { return !!(p.away && p.exit && p.away()); } catch (e) { return false; } };
  function people(m) { return (m && m.entities || []).filter((e) => e && e._life); }
  function stage(m) {
    if (!m || !PLACES[m.id] || !Array.isArray(m.entities)) return;
    paint();   // the townsfolk sprites exist only once the game has drawn its own; cheap when already done
    const P = PLACES[m.id];
    // gone (or switched off): nobody, and none of their things
    if (!on() || (P.opts.gone && P.opts.gone())) { for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && (m.entities[i]._life || m.entities[i]._lifeProp)) m.entities.splice(i, 1); return; }
    for (const p of P.roster) {
      if (!fits(m, p)) continue;   // a map that only borrows the name (a test room, a rebuilt map): not this roster's streets
      const id = 'p60_' + p.key;
      if (typeof NPCS !== 'undefined' && !NPCS[id]) NPCS[id] = npcDef(p);
      for (const pr of p.props || []) if (!m.entities.some((e) => e && e._lifeProp === p.key + ':' + pr.join(','))) m.entities.push({ kind: 'deco', sprite: pr[0], x: pr[1], y: pr[2], scale: pr[3] || 1, facing: pr[4] || 0, solid: false, radius: 0.2, label: pr[5] || undefined, transient: true, _decor: true, _lifeProp: p.key + ':' + pr.join(',') });
      if (!m.entities.some((e) => e && e._life === p.key)) m.entities.push({ kind: 'npc', id, sprite: p.sprite, x: p.home[0], y: p.home[1], facing: PI / 2, scale: p.scale || 1, solid: false, radius: 0.25, transient: true, _decor: true, _life: p.key });   // _decor: re-created on every visit, like other modules' stand-ins
    }
    snap(m);
  }
  // put everyone where the hour puts them
  function snap(m) {
    const P = PLACES[m.id]; if (!P) return;
    lastBark = Math.max(lastBark, clock - BARK_GAP + ARRIVE_QUIET);   // nobody speaks the instant you arrive or wake
    const h = hour();
    for (const e of people(m)) {
      const p = P.byKey[e._life]; if (!p) continue;
      if (gone(p)) { e.hidden = true; e._leaving = true; continue; }
      const s = stopAt(p, h), at = spot(p, s);
      e._stop = s; e._path = null; e._wait = rnd() * 3; e._leg = 0;
      e.x = at[0] + (s.job === 'home' ? 0 : (rnd() - 0.5) * 0.2); e.y = at[1] + (s.job === 'home' ? 0 : (rnd() - 0.5) * 0.2);
      e.hidden = s.job === 'home';
      face(e, s, m);
    }
  }
  function face(e, s, m) {
    if (!s) return;
    if (typeof s.face === 'number') e.facing = s.face;
    else if (typeof s.face === 'string') { const o = people(m).find((x) => x._life === s.face && !x.hidden); if (o) e.facing = Math.atan2(o.y - e.y, o.x - e.x); }
  }

  // ================================================================ walking
  function go(m, e, tx, ty) {   // no way there: stay put rather than walk through a wall
    const r = path(m, e.x, e.y, tx, ty);
    e._path = r && r.length ? r : [];
    return !!(r && r.length);
  }
  const open = (m, x, y) => { const g = grid(m), cx = Math.floor(x), cy = Math.floor(y); return cx >= 0 && cy >= 0 && cx < m.w && cy < m.h && !g[cy * m.w + cx]; };
  function stepAlong(e, dt) {
    if (!e._path || !e._path.length) return true;
    const [tx, ty] = e._path[0], dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), st = SPEED * dt * (e._fast || 1);
    if (d <= st) { e.x = tx; e.y = ty; e._path.shift(); }
    else { e.x += dx / d * st; e.y += dy / d * st; e.facing = Math.atan2(dy, dx); }
    return !e._path.length;
  }
  function tickPerson(m, P, e, h, dt) {
    const p = P.byKey[e._life]; if (!p) return;
    if (gone(p)) {   // they have left (a place can send someone away for good): walk to the way out, then nobody
      if (e.hidden) return;
      if (!e._leaving) { e._leaving = true; e._stop = null; go(m, e, p.exit[0], p.exit[1]); e._fast = 1.15; }
      if (stepAlong(e, dt)) e.hidden = true;
      return;
    }
    const s = stopAt(p, h);
    if (s !== e._stop) {   // a new stop: come out of the door if at home, and set off
      const was = e._stop; e._stop = s; e._leg = 0;
      if (was && was.job === 'home') { e.hidden = false; e.x = p.home[0]; e.y = p.home[1]; }
      const at = spot(p, s); go(m, e, at[0], at[1]); e._going = true;
      return;
    }
    if (e._going) {
      if (stepAlong(e, dt)) { e._going = false; e._wait = 1 + rnd() * 2; if (s.job === 'home') e.hidden = true; else face(e, s, m); }
      return;
    }
    if (s.job === 'home') { e.hidden = true; return; }
    // the job itself: a shuttle goes back and forth; a wander picks a new spot near its own
    if (s.to2 || s.area) {
      e._wait -= dt; if (e._wait > 0) return;
      if (!e._path || !e._path.length) {
        if (s.to2) { e._leg = 1 - (e._leg || 0); const t = e._leg ? s.to2 : s.at; go(m, e, t[0], t[1]); }
        else { const a = rnd() * PI * 2, r = rnd() * s.area, x = s.at[0] + Math.cos(a) * r, y = s.at[1] + Math.sin(a) * r; if (!open(m, x, y)) { e._wait = 0.3; return; } go(m, e, x, y); }
        e._fast = s.job === 'play' ? 1.8 : 1;
      }
      if (stepAlong(e, dt)) { e._wait = s.job === 'play' ? 0.4 + rnd() : 3 + rnd() * 3; face(e, s, m); }
    }
  }

  // ================================================================ overheard
  let lastBark = -1e9, clock = 0; const T0 = () => clock;   // seconds of play watched here (not wall time: paused in menus and talk)
  function barks(m, P) {
    const now = T0(); if (now - lastBark < BARK_GAP) return;
    const c = Engine.cam; let best = null, bd = BARK_NEAR;
    for (const e of people(m)) {
      if (e.hidden || e._going || e._leaving) continue;
      const p = P.byKey[e._life]; if (!p || !p.barks || !p.barks.length) continue;
      if (now - (e._bark || -1e9) < BARK_OWN) continue;
      const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    const p = P.byKey[best._life];
    best._bark = now; lastBark = now;
    const line = p.barks[(best._barkI = ((best._barkI || 0) + 1) % p.barks.length)];
    try { msg(line, 'voice', 6000); } catch (e) { /* cosmetic */ }
  }

  // ================================================================ the jobs, as you see them
  const o = { sy: 0, sx: 0, lift: 0, skew: 0 };
  const JOBS = {
    sweep(T, s) { const st = Math.sin(T * 3.2 + s); o.skew += 0.05 * st; o.sx += 0.012 * st; o.sy -= 0.02; },
    sell(T, s) { const t = (T + s) % 7; if (t < 2.5) { const k = Math.sin(PI * t / 2.5); o.sy += 0.02 * k; o.sx += 0.02 * k; o.skew += 0.02 * Math.sin(T * 4) * k; } },
    chat(T, s) { const beat = Math.pow(Math.max(0, Math.sin(T * 3.8 + s)), 2); o.sy += 0.014 * beat; o.sx += 0.012 * beat; o.skew += 0.016 * Math.sin(T * 0.9 + s); },
    hammer(T, s) { const t = (T + s) % 4; if (t < 2.4) { const st = Math.max(0, Math.sin(T * 9)); o.sy -= 0.03 * st; o.skew += 0.04 * st; o.lift -= 0.006 * st; } },
    reach(T, s) { const k = 0.6 + 0.4 * Math.sin(T * 1.3 + s); o.lift += 0.012 * k; o.sy += 0.035 * k; o.skew += 0.02 * Math.sin(T * 2.6 + s); },
    pick(T, s) { const t = (T + s) % 5; const k = t < 3 ? 1 : 0; o.lift += 0.01 * k; o.sy += 0.03 * k; o.skew += 0.025 * Math.sin(T * 3 + s) * k; if (t >= 3) { o.sy -= 0.04; o.lift -= 0.008; } },
    scrub(T, s) { const st = Math.sin(T * 6 + s); o.sy -= 0.04; o.lift -= 0.01; o.skew += 0.04 * st; o.sx += 0.01 * st; },
    knead(T, s) { const st = Math.max(0, Math.sin(T * 3 + s)); o.sy -= 0.03 * st; o.lift -= 0.008 * st; o.skew += 0.015 * st; },
    hang(T, s) { const t = (T + s) % 6; if (t < 3) { o.lift += 0.012; o.sy += 0.03; o.skew += 0.02 * Math.sin(T * 2); } else { o.sy -= 0.03; } },
    sit(T, s) { o.sy -= 0.12; o.lift -= 0.03; o.skew += 0.006 * Math.sin(T * 0.5 + s); },
    watch(T, s) { o.skew += 0.01 * Math.sin(T * 0.4 + s); },
    play(T, s) { o.lift += 0.012 * Math.abs(Math.sin(T * 6 + s)); },
    carry(T, s) { o.sy -= 0.02; o.sx += 0.01; },
    rake(T, s) { const st = Math.sin(T * 2.2 + s); o.skew += 0.045 * st; o.sx += 0.015 * st; o.sy -= 0.02; },
  };
  function animLife(e, dt, T) {
    if (!e || !e._life || e.hidden || !e._stop) return;
    const c = Engine.cam; if ((c.x - e.x) ** 2 + (c.y - e.y) ** 2 > 18 * 18) return;
    const talking = typeof DLG !== 'undefined' && DLG.ent === e && G.state === 'dialogue';
    if (talking) return;
    o.sy = o.sx = o.lift = o.skew = 0;
    const j = JOBS[e._going ? 'carry' : e._stop.job];
    if (!j || (e._going && e._stop.job !== 'carry')) return;
    j(T, animSeed(e));
    e.animSY = (e.animSY || 0) + o.sy; e.animSX = (e.animSX || 0) + o.sx; e.animLift = (e.animLift || 0) + o.lift; e.animSkew = (e.animSkew || 0) + o.skew;
  }

  function askLife(t) {
    const n = DLG.npc; if (!n || !n.topics || !n.topics[t]) return;
    DLG.log.push({ who: 'you', t }); DLG.log.push({ who: 'them', t: n.topics[t] });
  }

  // ================================================================ tick and wiring
  function paused() {
    try { if (typeof CHURCH55 !== 'undefined' && CHURCH55.stage() === 1 && G.mapId === 'oakhaven') return true; } catch (e) { /* none */ }
    try { const P = PLACES[G.mapId]; if (P && P.opts && P.opts.pause && P.opts.pause()) return true; } catch (e) { /* none */ }
    return false;
  }
  function tick(dt) {
    if (!hasG() || !on() || G.state !== 'play') return;
    const m = G.map, P = PLACES[m.id]; if (!P || paused()) return;
    if (P.opts.gone && P.opts.gone()) { if (people(m).length) stage(m); return; }
    const h = hour(), d = Math.min(0.1, Math.max(0, Number(dt) || 0.033));
    clock += d;
    for (const e of people(m)) { try { tickPerson(m, P, e, h, d); } catch (err) { warnOnce('person', err); } }
    try { barks(m, P); } catch (e) { warnOnce('barks', e); }
  }
  function add(mapId, roster, opts) {
    const byKey = {}; for (const p of roster) byKey[p.key] = p;
    PLACES[mapId] = { roster, byKey, opts: opts || {} };
    try { if (hasG() && G.maps && G.maps[mapId]) stage(G.maps[mapId]); } catch (e) { warnOnce('add', e); }
  }
  function wire() {
    paint();
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function (dt) { const r = _un.apply(this, arguments); tick(dt); return r; }; }
    if (typeof animCreature === 'function') { const _a = animCreature; animCreature = function (e, dt, T) { const r = _a.apply(this, arguments); try { if (e && e._life) animLife(e, dt, T); } catch (err) { warnOnce('anim', err); } return r; }; }
    // their one or two questions sit right under what they say (no need to go looking under "Tell me about…")
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function (mode) {
        const r = _rd.apply(this, arguments);
        try {
          const n = typeof DLG !== 'undefined' && DLG.npc;
          if (n && n._life && (mode == null || mode === 'tell')) {
            const box = document.getElementById('d-topics');
            if (box) for (const t of Object.keys(n.topics || {})) {
              const b = document.createElement('button'); b.className = 'dfbtn small'; b.setAttribute('data-life', t); b.textContent = t;
              b.onclick = () => { askLife(t); renderDialogue(mode); };
              box.insertBefore(b, box.firstChild);
            }
          }
        } catch (e) { warnOnce('dialogue', e); }
        return r;
      };
    }
    if (typeof askTopic === 'function') {
      const _at = askTopic;
      askTopic = function (t) { try { const n = DLG.npc; if (n && n._life && n.topics && n.topics[t] && (t === TX.topicWork || t === TX.topicPlace)) { askLife(t); return; } } catch (e) { warnOnce('ask', e); } return _at.apply(this, arguments); };
    }
    for (const fn of ['loadMap', 'restoreGame', 'passHours']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { if (hasG()) stage(G.map); } catch (e) { warnOnce(fn, e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('life60 failed to wire', e); }

  return { TX, TEXTS, PLACES, JOBS, add, stage, snap, people, path, grid, stopAt, spot, tick, hour, variant };
})();
if (typeof window !== 'undefined') window.LIFE60 = LIFE60;
