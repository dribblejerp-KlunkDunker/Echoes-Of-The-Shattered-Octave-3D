// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/path/to/playwright node test/sky.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers js/sky.js: night stars, painted area panoramas and the Drift-Kestrel's
// flyovers, the three GFX switches, render scale 2, the pixel-exact "off" state
// (compared against a second page that never loads sky.js) and per-frame cost.
// Before/after screenshots go to SKY_SHOTS (default: the team scratch folder).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SKY_SHOTS || '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/SKY';

async function boot(browser, blockSky) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /hook failed/.test(m.text()))) errors.push('console: ' + m.text()); });
  // the same seeded Math.random in both pages, so both build the same world
  await page.addInitScript(() => { let a = 12345; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  if (blockSky) await page.route('**/js/sky.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Sky Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  return { page, errors };
}

// shared page-side helpers: a frame grabber built on a late post hook, so the
// capture is the finished frame at whatever render scale is current
const HELPERS = () => {
  window.__cap = null; window.__capOn = false;
  Engine.addPostHook(F => { if (window.__capOn) window.__cap = { fb: F.fb.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, S: F.S, horizon: F.horizon }; }, 9999);
  window.hide = () => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; };
  window.go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; hide(); };
  // one deterministic frame: no entities, the camera level, clouds and the animation clock pinned
  window.grab = (tod, t, dir) => {
    Engine.cam.bob = 0; Engine.cam.pitch = 0; if (dir != null) Engine.cam.dir = dir;
    Engine.setTime(t || 0);
    const pn = performance.now; performance.now = () => 777777;
    window.__capOn = true;
    try { Engine.render([], tod); } finally { performance.now = pn; window.__capOn = false; }
    return window.__cap;
  };
  window.sky = (map, wx) => { Weather.release(); Weather.hold(wx || 'clear'); Weather.tick(1 / 60); };
  window.flags = (s, p, f) => { GFX.plain(); GFX.stars = !!s; GFX.panoramas = !!p; GFX.flyovers = !!f; GFX.changed(); };
  window.diff = (a, b) => { const out = []; for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) out.push(i); return out; };
  window.hash = (c) => { let h = 2166136261; for (let i = 0; i < c.fb.length; i++) { h ^= c.fb[i]; h = Math.imul(h, 16777619); } for (let i = 0; i < c.mbuf.length; i++) { h ^= c.mbuf[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + c.w + 'x' + c.h; };
  window.png = (c, scale) => { const cv = document.createElement('canvas'); cv.width = c.w * scale; cv.height = c.h * scale; const x = cv.getContext('2d'); const id = new ImageData(new Uint8ClampedArray(c.fb.buffer.slice(0)), c.w, c.h); const src = document.createElement('canvas'); src.width = c.w; src.height = c.h; src.getContext('2d').putImageData(id, 0, 0); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, cv.width, cv.height); return cv.toDataURL(); };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const A = await boot(browser, false);
    const B = await boot(browser, true);
    await A.page.evaluate(HELPERS); await B.page.evaluate(HELPERS);
    assert.equal(await B.page.evaluate(() => typeof SKY), 'undefined', 'page B really runs without js/sky.js');

    // ---- the pixel-exact off state: every flag false == a page without the module -----
    const scenes = [];
    for (const [map, x, y] of [['oakhaven', 23.5, 20.5], ['clearing', 20.5, 20.5], ['whispergrove', 20.5, 20.5], ['deepwoods', 27.5, 30.5]])
      for (const tod of [0.02, 0.5, 0.78]) for (const dir of [0, 2.1, 4.2]) for (const wx of ['clear', 'storm', 'mist']) scenes.push({ map, x, y, tod, dir, wx });
    const hashAll = (page, withFly) => page.evaluate(({ scenes, withFly }) => {
      GFX.plain();
      if (typeof SKY !== 'undefined' && withFly) SKY.flyover(100, 0, 1);
      const out = []; let last = '';
      for (const s of scenes) {
        if (last !== s.map) { go(s.map, s.x, s.y, 0); last = s.map; }
        sky(s.map, s.wx);
        out.push(hash(grab(s.tod, withFly ? 106 : 3.3, s.dir)));
      }
      if (typeof SKY !== 'undefined') SKY.flyover(null);
      return out;
    }, { scenes, withFly });
    for (const withFly of [false, true]) {
      const ha = await hashAll(A.page, withFly), hb = await hashAll(B.page, withFly);
      assert.equal(ha.length, scenes.length);
      const bad = ha.map((h, i) => (h === hb[i] ? -1 : i)).filter(i => i >= 0);
      assert.deepEqual(bad, [], 'with every flag off the frame is byte-identical to a page without sky.js (mismatches: ' + bad.slice(0, 5).map(i => JSON.stringify(scenes[i])).join(' ') + ')');
    }
    console.log('PASS off state: ' + scenes.length + ' scenes x2 (also with a forced flyover) are byte-identical to a build without js/sky.js');

    const r = await A.page.evaluate(() => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const out = {};
      const skyRow = (c, i) => { const y = (i / c.w) | 0; return y <= c.horizon && c.mbuf[i] === 1; };
      const allSky = (c, idx) => idx.every(i => skyRow(c, i));
      const stars = (map, x, y, dir, tod, wx) => { go(map, x, y, dir); sky(map, wx); flags(0, 0, 0); const off = grab(tod, 4.2, dir); flags(1, 0, 0); const on = grab(tod, 4.2, dir); return { off, on, idx: diff(off, on) }; };

      // --- 1. stars ---------------------------------------------------------
      const night = stars('oakhaven', 23.5, 20.5, -1.0, 0.02, 'clear');
      check(night.idx.length >= 40, 'stars appear at night outdoors (' + night.idx.length + ' px changed)');
      check(allSky(night.on, night.idx), 'every star pixel is a sky pixel above the horizon');
      out.starsNight = night.idx.length;
      const noon = stars('oakhaven', 23.5, 20.5, -1.0, 0.5, 'clear'); check(noon.idx.length === 0, 'no stars by day (' + noon.idx.length + ')'); out.starsNoon = noon.idx.length;
      const dusk = stars('oakhaven', 23.5, 20.5, -1.0, 0.3, 'clear'); out.starsDawn = dusk.idx.length;
      check(dusk.idx.length < night.idx.length, 'the field fades in as the light falls (' + dusk.idx.length + ' at dawn vs ' + night.idx.length + ' at midnight)');
      go('tavern', 8.5, 10.5, 0); flags(0, 0, 0); const inOff = grab(0.02, 4.2, 0); flags(1, 1, 1); const inOn = grab(0.02, 4.2, 0);
      check(diff(inOff, inOn).length === 0, 'indoors the sky effects draw nothing'); out.starsIndoor = 0;
      const storm = stars('oakhaven', 23.5, 20.5, -1.0, 0.02, 'storm'); check(storm.idx.length <= 2, 'a storm puts the stars out (' + storm.idx.length + ')'); out.starsStorm = storm.idx.length;
      const mist = stars('oakhaven', 23.5, 20.5, -1.0, 0.02, 'mist'); check(mist.idx.length <= 2, 'sea-fog puts the stars out (' + mist.idx.length + ')'); out.starsMist = mist.idx.length;
      const over = stars('oakhaven', 23.5, 20.5, -1.0, 0.02, 'overcast'); check(over.idx.length < night.idx.length * 0.25, 'overcast thins the stars (' + over.idx.length + ' vs ' + night.idx.length + ')'); out.starsOvercast = over.idx.length;
      // twinkle: same view, a different clock, same stars but not the same brightness
      go('oakhaven', 23.5, 20.5, -1.0); sky('oakhaven', 'clear'); flags(1, 0, 0);
      const t1 = grab(0.02, 10, -1.0), t2 = grab(0.02, 10.9, -1.0);
      const tw = diff(t1, t2); check(tw.length > 10, 'stars twinkle with the animation clock (' + tw.length + ' px changed)'); out.twinkle = tw.length;
      // fixed bearings: turn the view a little and the same field slides sideways by the right amount
      const posSet = (a, b) => { const s = new Set(); for (const i of diff(a, b)) s.add(i); return s; };
      flags(0, 0, 0); const o0 = grab(0.02, 4.2, -1.0), o1 = grab(0.02, 4.2, -0.95);
      flags(1, 0, 0); const s0 = grab(0.02, 4.2, -1.0), s1 = grab(0.02, 4.2, -0.95);
      const P0 = posSet(o0, s0), P1 = posSet(o1, s1);
      const ov = (sh) => { let hit = 0, tot = 0; for (const i of P0) { const x = i % 320, y = (i / 320) | 0, xs = x - sh; if (xs < 0 || xs >= 320) continue; tot++; if (P1.has(y * 320 + xs) || P1.has(y * 320 + xs - 1) || P1.has(y * 320 + xs + 1)) hit++; } return tot ? hit / tot : 0; };
      let best = 0, bestSh = 0; for (let sh = 1; sh < 40; sh++) { const v = ov(sh); if (v > best) { best = v; bestSh = sh; } }
      check(best > 0.5 && bestSh >= 8 && bestSh <= 18 && ov(0) < 0.25, 'stars sit at fixed bearings: a 0.05 rad turn slides them ~12 px (best shift ' + bestSh + ' px, ' + (best * 100 | 0) + '% overlap, none at 0: ' + ov(0).toFixed(2) + ')');
      out.starShift = bestSh;

      // --- 2. panoramas, per map, differing between maps ---------------------
      go('oakhaven', 23.5, 20.5, 3.14);
      const real = G.map.id, pano = {};
      for (const id of ['oakhaven', 'clearing', 'whispergrove', 'deepwoods', '_unlisted_map']) {
        G.map.id = id;                         // same geometry and ridges, a different area's panorama
        let rows = 0, count = 0, ok = true, img = [];
        for (const dir of [0.4, 1.9, 3.14, 4.6]) {
          sky('oakhaven', 'clear'); flags(0, 0, 0); const off = grab(0.5, 4.2, dir); flags(0, 1, 0); const on = grab(0.5, 4.2, dir);
          const d = diff(off, on); count += d.length; ok = ok && allSky(on, d);
          for (const i of d) { const y = (i / on.w) | 0; if (on.horizon - y > rows) rows = on.horizon - y; img.push(on.fb[i]); }
        }
        pano[id] = { count, rows, ok, key: img.join(',') };
        check(count >= 150, 'the ' + id + ' panorama changes sky pixels (' + count + ')');
        check(ok, 'the ' + id + ' panorama only paints sky pixels at or above the horizon');
        // Phase 20: the panorama also carries the LANDMARKS ridges as pixel art (the tallest, the Whisper-Grove spire-hill, stands 0.36 of the view: 54 rows)
        check(rows >= 4 && rows <= 56, 'the ' + id + ' panorama is a band just above the horizon (' + rows + ' rows)');
      }
      G.map.id = real;
      const ids = Object.keys(pano);
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) check(pano[ids[i]].key !== pano[ids[j]].key, 'the ' + ids[i] + ' and ' + ids[j] + ' panoramas are different paintings');
      out.pano = ids.reduce((o, k) => (o[k] = pano[k].count + 'px/' + pano[k].rows + 'rows', o), {});
      // tables really differ, and are built at load
      const sig = (id) => SKY.panorama(id).map(L => Array.from(L.h.slice(0, 64)).join()).join('|');
      check(new Set(['oakhaven', 'clearing', 'whispergrove', 'deepwoods', 'nowhere'].map(sig)).size === 5, 'five different height tables');
      check(SKY.panorama('oakhaven') === SKY.panorama('oakhaven') && SKY.panorama('oakhaven')[0].h.length === SKY.PN, 'tables are built once and reused');
      // panoramas answer to weather and the clock
      go('oakhaven', 23.5, 20.5, 3.14); flags(0, 0, 0);
      const strength = (wx, tod) => { sky('oakhaven', wx); flags(0, 0, 0); const o = grab(tod, 4.2, 3.14); flags(0, 1, 0); const n = grab(tod, 4.2, 3.14); let s = 0; for (const i of diff(o, n)) { const a = o.fb[i], b = n.fb[i]; s += Math.abs((a & 255) - (b & 255)) + Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) + Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)); } return s; };
      const sClear = strength('clear', 0.5), sMist = strength('mist', 0.5), sNight = strength('clear', 0.02);
      check(sMist < sClear * 0.8, 'mist hazes the panorama away (' + sMist + ' vs ' + sClear + ')');
      check(sNight !== sClear, 'the panorama follows the time of day');
      out.panoContrast = { clear: sClear, mist: sMist, night: sNight };

      // --- 3. flyovers -------------------------------------------------------
      const fly = (map, x, y, dir, tod, t, b0, d) => { go(map, x, y, dir); sky(map, 'clear'); SKY.flyover(100, b0, d); flags(0, 0, 0); const off = grab(tod, t, dir); flags(0, 0, 1); const on = grab(tod, t, dir); const idx = diff(off, on); return { off, on, idx, st: SKY.state() }; };
      const cen = (idx, w) => { let sx = 0, sy = 0; for (const i of idx) { sx += i % w; sy += (i / w) | 0; } return { x: sx / idx.length, y: sy / idx.length }; };
      const f1 = fly('whispergrove', 20.5, 20.5, 1.0, 0.5, 106, 1.0, 1);
      check(f1.st.active && f1.st.forced && f1.idx.length >= 40 && f1.idx.length <= 900, 'a forced flyover draws the Kestrel (' + f1.idx.length + ' px, state ' + JSON.stringify(f1.st) + ')');
      check(allSky(f1.on, f1.idx), 'the Kestrel only draws on sky pixels above the horizon');
      const c1 = cen(f1.idx, 320); check(Math.abs(c1.x - f1.st.x) < 10 && Math.abs(c1.y - f1.st.y) < 8, 'SKY.state() says where it is (' + c1.x.toFixed(1) + ',' + c1.y.toFixed(1) + ' vs ' + f1.st.x.toFixed(1) + ',' + f1.st.y.toFixed(1) + ')');
      check(f1.st.y < f1.on.horizon - 10, 'it crosses the sky band, not the horizon');
      // turn the camera: it moves, because its bearing is fixed
      const f2 = fly('whispergrove', 20.5, 20.5, 1.12, 0.5, 106, 1.0, 1);
      const c2 = cen(f2.idx, 320);
      check(f2.idx.length >= 40 && c2.x - c1.x < -20 && c2.x - c1.x > -38, 'turning the view moves it across the screen (' + (c2.x - c1.x).toFixed(1) + ' px for 0.12 rad)');
      out.flyover = { px: f1.idx.length, x: +c1.x.toFixed(1), y: +c1.y.toFixed(1), turnDx: +(c2.x - c1.x).toFixed(1) };
      // it travels along its path with the clock
      const f3 = fly('whispergrove', 20.5, 20.5, 1.0, 0.5, 109, 1.0, 1); const c3 = cen(f3.idx, 320);
      check(c3.x - c1.x > 8, 'it flies on as the clock runs (moved ' + (c3.x - c1.x).toFixed(1) + ' px in 3 s)');
      // and it is faded in and out at the ends of the flight
      const fe = fly('whispergrove', 20.5, 20.5, 1.0, 0.5, 100.05, 1.0, 1); check(fe.idx.length < f1.idx.length * 0.5, 'the flight fades in at its start (' + fe.idx.length + ' px)');
      // outside the 12-second window, nothing
      const fn = fly('whispergrove', 20.5, 20.5, 1.0, 0.5, 130, 1.0, 1); check(fn.idx.length === 0 && !fn.st.active, 'no Kestrel outside its window');
      // the forced hook is only a test hook: clear it and the schedule rules
      SKY.flyover(null);
      let wins = 0, inWin = false, first = -1;
      for (let t = 0; t < 900; t += 0.5) { const on = !!SKY.flightAt(t); if (on && !inWin) { wins++; if (first < 0) first = t; } inWin = on; }
      check(wins === 10, 'one flyover per 90 s cycle (' + wins + ' in 900 s)');
      let spans = []; for (let k = 0; k < 10; k++) { let a = -1, b = -1; for (let t = k * 90; t < k * 90 + 90; t += 0.25) if (SKY.flightAt(t)) { if (a < 0) a = t; b = t; } spans.push(b - a); }
      check(spans.every(s => s >= 11.5 && s <= 12.25), 'each flyover lasts about 12 s (' + spans.join(',') + ')');
      check(JSON.stringify(SKY.flightAt(first + 4)) === JSON.stringify(SKY.flightAt(first + 4)) && SKY.flightAt(first + 4).u > 0.3, 'the schedule is a pure function of the clock');
      const tw0 = first + 5;
      for (const [map, x, y, expect] of [['whispergrove', 20.5, 20.5, true], ['deepwoods', 27.5, 30.5, true], ['oakhaven', 23.5, 20.5, false], ['clearing', 20.5, 20.5, false]]) {
        go(map, x, y, 0); sky(map, 'clear'); flags(0, 0, 0);
        // look straight at wherever the scheduled ship is at tw0
        const fl = SKY.flightAt(tw0), bearing = fl.b0 + fl.dir * (fl.u - 0.5) * SKY.FLY.sweep;
        const off = grab(0.5, tw0, bearing); flags(0, 0, 1); const on = grab(0.5, tw0, bearing); const n = diff(off, on).length;
        check(expect ? n >= 40 : n === 0, 'scheduled flyover on ' + map + ': ' + n + ' px (expected ' + (expect ? 'a ship' : 'none') + ')');
        out['sched_' + map] = n;
        flags(0, 0, 0); const q = grab(0.5, tw0 + 40, bearing); flags(0, 0, 1); const q2 = grab(0.5, tw0 + 40, bearing); check(diff(q, q2).length === 0, 'no ship between flights on ' + map);
      }
      // and the forced hook respects its flag
      go('whispergrove', 20.5, 20.5, 1.0); sky('whispergrove', 'clear'); SKY.flyover(100, 1.0, 1); flags(0, 0, 0); const offA = grab(0.5, 106, 1.0); const stateOff = SKY.state(); SKY.flyover(null);
      check(!stateOff.active || stateOff.drawn === 0, 'flag off: nothing drawn even when forced'); out.flyoverFlagOff = stateOff.drawn;

      // --- 4. render scale 2 ---------------------------------------------------
      Engine.setScale(2);
      go('oakhaven', 23.5, 20.5, -1.0); sky('oakhaven', 'clear'); flags(0, 0, 0); const q0 = grab(0.02, 4.2, -1.0); flags(1, 1, 0); const q1 = grab(0.02, 4.2, -1.0);
      check(q1.w === 640 && q1.h === 300 && q1.S === 2, 'scale 2 renders 640x300');
      const dq = diff(q0, q1); check(dq.length >= 200, 'stars and panoramas draw at scale 2 (' + dq.length + ' px)'); check(dq.every(i => ((i / 640) | 0) <= q1.horizon && q1.mbuf[i] === 1), 'scale 2 changes sky pixels only');
      out.scale2 = dq.length;
      go('whispergrove', 20.5, 20.5, 1.0); sky('whispergrove', 'clear'); SKY.flyover(100, 1.0, 1); flags(0, 0, 0); const k0 = grab(0.5, 106, 1.0); flags(0, 0, 1); const k1 = grab(0.5, 106, 1.0);
      const dk = diff(k0, k1); check(dk.length > f1.idx.length * 2.5 && dk.length < f1.idx.length * 6, 'the Kestrel is twice as big on a doubled canvas (' + dk.length + ' px vs ' + f1.idx.length + ')');
      SKY.flyover(null); out.scale2Kestrel = dk.length;
      Engine.setScale(1);

      // --- 5. cost ---------------------------------------------------------------
      // Wall-clock frame times are noisy on a shared machine, so cost is measured two ways:
      // (a) each hook timed on its own, in batches, median of 40 batches (robust to load);
      // (b) frames rendered in on/off pairs back to back, median of the paired differences.
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      const bench = (map, x, y, tod, forceFly) => {
        go(map, x, y, -1.57); sky(map, 'clear'); Engine.cam.bob = 0; Engine.setTime(106); G.tod = tod;
        if (forceFly) SKY.flyover(100, -1.57, 1);
        flags(1, 1, 1);
        let F = null; Engine.addPostHook(f => { F = f; }, 10000);
        Engine.cam.bob = 0; Engine.render(G.ents, tod);
        const res = { hooks: {} };
        let total = 0;
        for (const k of ['stars', 'panoramas', 'flyovers']) {
          const fn = SKY.hooks[k], bt = [];
          for (let b = 0; b < 40; b++) { const t0 = performance.now(); for (let i = 0; i < 20; i++) fn(F); bt.push((performance.now() - t0) / 20); }
          res.hooks[k] = +med(bt).toFixed(4); total += med(bt);
        }
        res.hookTotal = +total.toFixed(4);
        const d = [], onT = [], offT = [];
        for (let i = 0; i < 80; i++) {
          GFX.stars = GFX.panoramas = GFX.flyovers = true; let t0 = performance.now(); Engine.cam.bob = 0; Engine.render(G.ents, tod); const a = performance.now() - t0;
          GFX.stars = GFX.panoramas = GFX.flyovers = false; t0 = performance.now(); Engine.cam.bob = 0; Engine.render(G.ents, tod); const b = performance.now() - t0;
          d.push(a - b); onT.push(a); offT.push(b);
        }
        res.pairedDiff = +med(d).toFixed(3); res.frameOn = +med(onT).toFixed(2); res.frameOff = +med(offT).toFixed(2);
        SKY.flyover(null); flags(0, 0, 0);
        return res;
      };
      out.cost = {
        oakhavenNoon: bench('oakhaven', 23.5, 20.5, 0.5, false),
        oakhavenNight: bench('oakhaven', 23.5, 20.5, 0.02, false),
        deepwoodsNight: bench('deepwoods', 27.5, 30.5, 0.02, false),
        deepwoodsNoonFlyover: bench('deepwoods', 27.5, 30.5, 0.5, true),
      };
      // The budget is 0.6 ms at S=1 against a ~1.9 ms frame (ROADMAP: weather pass). Wall time on a busy box can
      // be ten times slower, so assert the budget as a share of the same page's frame time, measured in the same
      // minute: 0.6 / 1.9 = 0.32. Absolute CPU time was measured separately in a Node harness (see the team report).
      for (const k in out.cost) { const c = out.cost[k]; c.share = +(c.hookTotal / c.frameOff).toFixed(3); check(c.share < 0.32, 'sky hooks stay inside their budget share of a frame at S=1 in ' + k + ' (' + c.hookTotal + ' ms of a ' + c.frameOff + ' ms frame)'); }
      return out;
    });
    for (const line of [
      'PASS stars: ' + r.starsNight + ' px at midnight, ' + r.starsDawn + ' at dawn, none at noon/indoors/storm/mist, overcast ' + r.starsOvercast + ', twinkle ' + r.twinkle + ' px, 0.05 rad turn slides them ' + r.starShift + ' px',
      'PASS panoramas: ' + JSON.stringify(r.pano) + ' - five different paintings; contrast clear/mist/night ' + JSON.stringify(r.panoContrast),
      'PASS flyovers: ' + JSON.stringify(r.flyover) + ', schedule 10 windows per 900 s of ~12 s, whispergrove ' + r.sched_whispergrove + ' px, deepwoods ' + r.sched_deepwoods + ' px, oakhaven ' + r.sched_oakhaven + ' px, clearing ' + r.sched_clearing + ' px',
      'PASS render scale 2: ' + r.scale2 + ' px of stars and panoramas, Kestrel ' + r.scale2Kestrel + ' px',
      'PASS frame cost at S=1 (ms; per-hook medians and paired on/off frame differences): ' + JSON.stringify(r.cost),
    ]) console.log(line);

    // ---- before / after screenshots for the human --------------------------------------------
    fs.mkdirSync(SHOTS, { recursive: true });
    const shotJobs = [
      { name: 'stars-oakhaven-night', map: 'oakhaven', x: 23.5, y: 20.5, dir: -1.0, tod: 0.02, f: [1, 0, 0] },
      { name: 'stars-deepwoods-night', map: 'deepwoods', x: 27.5, y: 30.5, dir: 0.2, tod: 0.04, f: [1, 0, 0] },
      { name: 'panorama-oakhaven', map: 'oakhaven', x: 23.5, y: 20.5, dir: 3.14, tod: 0.5, f: [0, 1, 0] },
      { name: 'panorama-clearing', map: 'clearing', x: 20.5, y: 20.5, dir: 2.0, tod: 0.55, f: [0, 1, 0] },
      { name: 'panorama-whispergrove', map: 'whispergrove', x: 20.5, y: 20.5, dir: 1.0, tod: 0.5, f: [0, 1, 0] },
      { name: 'panorama-deepwoods', map: 'deepwoods', x: 27.5, y: 30.5, dir: 3.0, tod: 0.5, f: [0, 1, 0] },
      { name: 'kestrel-whispergrove', map: 'whispergrove', x: 20.5, y: 20.5, dir: 1.0, tod: 0.5, f: [0, 0, 1], fly: [100, 1.0, 1], t: 106 },
      { name: 'kestrel-deepwoods-dusk', map: 'deepwoods', x: 27.5, y: 30.5, dir: 0.2, tod: 0.76, f: [0, 0, 1], fly: [100, 0.2, -1], t: 106 },
      { name: 'all-whispergrove-dusk', map: 'whispergrove', x: 20.5, y: 20.5, dir: 1.0, tod: 0.74, f: [1, 1, 1], fly: [100, 1.0, 1], t: 106 },
    ];
    for (const j of shotJobs) {
      const urls = await A.page.evaluate((j) => {
        go(j.map, j.x, j.y, j.dir); sky(j.map, 'clear');
        if (j.fly) SKY.flyover(j.fly[0], j.fly[1], j.fly[2]);
        flags(0, 0, 0); const before = png(grab(j.tod, j.t || 4.2, j.dir), 3);
        flags(...j.f); const after = png(grab(j.tod, j.t || 4.2, j.dir), 3);
        SKY.flyover(null); return { before, after };
      }, j);
      for (const k of ['before', 'after']) fs.writeFileSync(path.join(SHOTS, j.name + '-' + k + '.png'), Buffer.from(urls[k].split(',')[1], 'base64'));
    }
    console.log('PASS screenshots: ' + shotJobs.length + ' before/after pairs in ' + SHOTS);

    assert.deepEqual(A.errors, [], 'no browser runtime errors (page A)');
    assert.deepEqual(B.errors, [], 'no browser runtime errors (page B)');
    console.log('PASS no page errors, no render hook failures');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
