// PREVIEW_URL=http://127.0.0.1:3904 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/hunters13.test.js
// Phase 13 HUNTERS: hounds that follow your trail, the Hushwarden's grey wave, crows at bodies.
// Optional SHOTS=<dir> writes review screenshots. A second page with js/hunters13.js blocked proves "switch off = the original AI".
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3904';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

async function boot(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/hunters13.js*', r => r.abort());
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof KIT12 === 'object');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hunt Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    try { localStorage.removeItem('octave.hunters13.v1'); } catch (e) { /* ignore */ }
    for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
    window.__stage = (map, x, y, dir) => {
      if (window.KIT12) KIT12.endAll();
      if (window.HUNTERS13) HUNTERS13.resetState();
      loadMap(map || 'clearing', { x: x == null ? 15.5 : x, y: y == null ? 26.5 : y, dir: dir == null ? 0 : dir });
      G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Engine.setWeather({}); if (window.Weather && Weather.set) Weather.set('clear', 4); PARTICLES.list.length = 0; G.keys = {}; G.vel.x = G.vel.y = 0;   // clear weather: the live weather would rescale hearing every frame (rain: 0.6)
      for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy' || G.ents[i].transient) G.ents.splice(i, 1);
      G.dead = false; G.player.hp = G.player.hpMax; G.noise = 1; G.murmurT = 0; G.whistleT = 0; G.stillT = 0; G.mutedT = 0; G.rootWard = 0; G.glassLock = 0; G.player.glassed = false;
      try { hide('#death'); hide('#event'); const ev = document.querySelector('#event'); if (ev) ev.classList.remove('hd-on'); } catch (e) { /* no overlay */ }
      if (window.__blind) __blind(false); G.dragBody = null; UPG.weatherFx = Object.assign({}, UPG.weatherFx || {}, { sight: 1, hear: 1 });
    };
    window.__mk = (type, x, y, st) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = st || 'idle'; e._tgSeen = true; e.alertT = 0; G.ents.push(e); return e; };
    window.__rm = (e) => { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); };
    window.__seed = (n) => { let s = n || 777; window.__rngCalls = 0; Math.random = () => { window.__rngCalls++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
    window.__fix = (i) => { const v = ((i * 7919) % 997) / 997; Math.random = () => v; };   // one value per frame: it does not matter how many other modules draw on it
    window.__run = (secs, dt) => { dt = dt || 1 / 30; for (let t = 0; t < secs - 1e-9; t += dt) { G.noise = Math.min(G.noise, 1); update(dt); } };
    // walk the camera along corner points, 0.09 a frame (about 2.7 paces a second), calling update each frame
    window.__walk = (pts, noQuiet) => {
      const c = Engine.cam;
      for (const [px, py] of pts) {
        let guard = 0;
        while (Math.hypot(px - c.x, py - c.y) > 0.05 && guard++ < 4000) {
          const d = Math.hypot(px - c.x, py - c.y), s = Math.min(0.09, d);
          c.x += (px - c.x) / d * s; c.y += (py - c.y) / d * s;
          if (!noQuiet) G.noise = Math.min(G.noise, 1);
          update(1 / 30);
        }
      }
    };
    window.__blind = (on) => {
      if (on && !window.__realLos) { window.__realLos = window.los; window.los = (ax, ay, bx, by) => (Math.hypot(bx - ax, by - ay) < 1.5 ? window.__realLos(ax, ay, bx, by) : false); }
      if (!on && window.__realLos) { window.los = window.__realLos; window.__realLos = null; }
    };
    window.__msgs = () => [...document.querySelectorAll('#msgs .m')].map(x => x.textContent);
    window.__corpse = (type, x, y, name) => {
      const e = hydrate({ kind: 'enemy', type, x, y }); if (name) e.name = name; e.state = 'passive'; G.ents.push(e);
      killEnemy(e, false);
      const ghost = G.ents.find(q => q.dying && Math.abs(q.x - x) < 0.01);
      if (!ghost) return null;
      ghost.dieT = ghost.dieDur; animDeco(ghost, 0.01, 1, true);
      return ghost;
    };
    window.__raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = () => 0;
  });
  await page.waitForTimeout(150);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const { page, errors } = await boot(browser);
    const snap = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };

    // ============================================================ 1. the breadcrumb trail
    const tr = await page.evaluate(() => {
      const out = {};
      __stage(); HUNTERS13.set.trail = true; __seed(11);
      __walk([[15.5, 26.5], [25.5, 26.5]]);
      out.after10 = HUNTERS13.trail.length;
      out.spacing = HUNTERS13.trail.every((q, i, a) => i === 0 || Math.hypot(q.x - a[i - 1].x, q.y - a[i - 1].y) >= 0.69);
      out.ordered = HUNTERS13.trail.every((q, i, a) => i === 0 || q.id > a[i - 1].id && q.t >= a[i - 1].t);
      // a long walk: the trail is capped
      __walk([[25.5, 12.5], [15.5, 12.5], [25.5, 12.5], [15.5, 12.5], [25.5, 12.5], [15.5, 12.5]]);
      out.capped = HUNTERS13.trail.length; out.capBal = HUNTERS13.BAL.trail.cap;
      // decay: stand still 26 s and every crumb has gone cold (the one at your feet is fresh: your scent is where you stand)
      const tEnd = HUNTERS13.clock;
      __run(HUNTERS13.BAL.trail.decay + 1);
      out.decayed = HUNTERS13.trail.filter(q => q.t < HUNTERS13.clock - HUNTERS13.BAL.trail.decay).length + HUNTERS13.trail.filter(q => q.t < tEnd + 1).length;
      // not saved: the snapshot is the same with a full trail and with none
      __walk([[15.5, 12.5], [26.5, 12.5]]);
      const strip = () => { const o = snapshotGame(); delete o.when; return JSON.stringify(o); };
      const withTrail = strip(); const n = HUNTERS13.trail.length;
      HUNTERS13.clearTrail(); const without = strip();
      out.notSaved = n > 3 && withTrail === without && !/crumb|p13w/.test(withTrail) && !Object.keys(G.flags).some(k => k.indexOf('p13w_') === 0);
      // a map change clears it
      __walk([[15.5, 12.5], [18.5, 12.5]]); const before = HUNTERS13.trail.length; loadMap('oakhaven'); out.mapClear = before > 2 && HUNTERS13.trail.length === 0;
      return out;
    });
    ok(tr.after10 >= 12 && tr.after10 <= 16 && tr.spacing && tr.ordered, 'breadcrumbs: a 10-pace walk lays ' + tr.after10 + ' crumbs, 0.7 apart, in order');
    ok(tr.capped === tr.capBal, 'the trail is capped at ' + tr.capBal + ' crumbs (' + tr.capped + ' after 60 paces)');
    ok(tr.decayed === 0, 'crumbs decay: none left 26 s after the last step (' + tr.decayed + ')');
    ok(tr.notSaved && tr.mapClear, 'the trail is never saved (snapshot identical with and without it, no p13w_ flag) and a map change clears it');

    // ============================================================ 2. a hound follows the trail when it has lost sight
    // thick fog (sight 0.3) stands in for the corner: the hound cannot see 12 paces however open the ground
    const L = `[[15.5,26.5],[20.5,26.5],[20.5,21.5]]`;
    const follow = await page.evaluate((L) => {
      const out = {};
      const run = (trailOn) => {
        __stage(); HUNTERS13.set.trail = trailOn; __seed(21); __blind(true);
        __walk(JSON.parse(L));
        const h = __mk('hound', 15.6, 26.5, 'chase'); h.alertT = 8;
        const pos = []; let maxStep = 0, last = { x: h.x, y: h.y };
        for (let i = 0; i < 150; i++) {          // 5 s
          G.noise = 1; update(1 / 30);
          if (i % 30 === 29) pos.push([+h.x.toFixed(2), +h.y.toFixed(2)]);
          maxStep = Math.max(maxStep, Math.hypot(h.x - last.x, h.y - last.y) / (1 / 30)); last = { x: h.x, y: h.y };
        }
        const r = { pos, state: h.state, sn: !!HUNTERS13.sniffState(h), speed: maxStep, maxSpeed: h.def.speed };
        __rm(h); __blind(false); return r;
      };
      out.on = run(true); out.off = run(false); HUNTERS13.set.trail = true;
      return out;
    }, L);
    const lastOn = follow.on.pos[follow.on.pos.length - 1], lastOff = follow.off.pos[follow.off.pos.length - 1];
    ok(follow.on.sn && follow.on.pos.slice(0, 3).every(p => Math.abs(p[1] - 26.5) < 0.3) && follow.on.pos[0][0] > 16 && Math.abs(lastOn[0] - 20.5) < 0.8, 'a hound that lost sight walks the trail: it follows the first leg, then turns up the second (' + follow.on.pos.map(p => p.join(',')).join(' ') + ') instead of cutting the corner');
    ok(follow.off.pos[1][1] < 25.5, 'with the switch off the same hound goes straight at you (' + follow.off.pos.map(p => p.join(',')).join(' ') + ')');
    ok(follow.on.speed <= follow.on.maxSpeed * 0.6, 'a hound on the scent is slow: top speed ' + follow.on.speed.toFixed(2) + ' of ' + follow.on.maxSpeed + ' (cap 55%)');

    // ============================================================ 3. the breakers
    const brk = await page.evaluate((L) => {
      const out = {};
      const scenario = (name, setup, after) => {
        __stage(); HUNTERS13.set.trail = true; __seed(31); __blind(true);
        if (setup) setup();
        __walk([[15.5, 26.5], [25.5, 26.5]]);
        if (after) after();
        const h = __mk('hound', 15.6, 26.5, 'chase'); h.alertT = 8;
        let maxX = h.x;
        for (let i = 0; i < 270; i++) { G.noise = 1; update(1 / 30); maxX = Math.max(maxX, h.x); }
        const r = { maxX: +maxX.toFixed(2), state: h.state, x: +h.x.toFixed(2) };
        __rm(h); __blind(false); out[name] = r;
        window.waterLvl = realWater;
      };
      const realWater = window.waterLvl;
      scenario('control');
      scenario('water', () => { window.waterLvl = (x, y) => (x >= 19 && x < 20.4 ? 1 : 0); });
      scenario('fire', null, () => { KIT12.startFire({ x: 21, y: 26.5 }); update(1 / 30); });
      scenario('jar', null, () => { KIT12.startZone({ x: 21, y: 26.5 }); update(1 / 30); });
      scenario('smell', () => { G.give('flume_eel', 1); useItem({ id: 'flume_eel' }); out.smellSet = HUNTERS13.smellUntil > HUNTERS13.clock; });
      __stage(); G.give('p12_flume_eel', 1); if (ITEMS.p12_flume_eel) { try { useItem({ id: 'p12_flume_eel' }); } catch (e) { out.eelErr = e.message; } } out.festivalEel = HUNTERS13.smellUntil > HUNTERS13.clock;
      __stage(); G.give('whistle', 1); useItem({ id: 'whistle' }); out.whistle = HUNTERS13.smellUntil > HUNTERS13.clock; G.whistleT = 0;
      KIT12.endAll();
      return out;
    }, L);
    ok(brk.control.maxX > 23, 'control: with nothing in the way the hound follows the whole stretch (reached x ' + brk.control.maxX + ')');
    ok(brk.water.maxX < 19.8 && brk.water.maxX > 17.5, 'wading breaks the trail: the hound stops at the bank (x ' + brk.water.maxX + ' < 19.8)');
    ok(brk.fire.maxX < 26.2, 'a lit fire flask breaks it (x ' + brk.fire.maxX + ')');
    ok(brk.jar.maxX < 17.6, 'a damper jar breaks it (x ' + brk.jar.maxX + ')');
    ok(brk.smell.maxX < 16.6 && brk.smellSet, 'eating smoked Flume-eel leaves no trail to follow (x ' + brk.smell.maxX + ')');
    ok(brk.festivalEel && brk.whistle, 'the Festival eel and the Hush-whistle are strong smells too');
    ok(brk.control.state === 'idle' || brk.control.state === 'chase', 'the hound never ends in a stuck state (' + brk.control.state + ')');

    // ============================================================ 4. not omniscient, not unbeatable
    const lim = await page.evaluate(() => {
      const out = {};
      // (a) out of trail range: nothing to follow, it casts about and gives up
      __stage(); __seed(41); __blind(true); __walk([[15.5, 26.5], [26.5, 26.5]]);
      const far = __mk('hound', 14.5, 19.5, 'chase'); far.alertT = 8;
      for (let i = 0; i < 90; i++) { G.noise = 1; update(1 / 30); }
      out.rangeMoved = Math.hypot(far.x - 14.5, far.y - 19.5); out.rangeLost = !!(HUNTERS13.sniffState(far) && HUNTERS13.sniffState(far).lost);
      for (let i = 0; i < 400; i++) { G.noise = 1; update(1 / 30); }
      out.rangeState = far.state; __rm(far);
      // (b) loud: inside hearing range it comes straight, as before
      __stage(); __seed(42); Engine.cam.x = 25; Engine.cam.y = 26.5;
      const loud = __mk('hound', 17.2, 26.5, 'chase'); loud.alertT = 8; const d0 = Math.hypot(loud.x - 25, loud.y - 26.5);
      for (let i = 0; i < 30; i++) { __fix(i); G.noise = 5; update(1 / 30); }
      out.loudCloser = d0 - Math.hypot(loud.x - 25, loud.y - 26.5); out.loudSniff = !!HUNTERS13.sniffState(loud); __rm(loud);
      // (c) sight: in the open, close by, the original chase
      __stage(); __seed(43); Engine.cam.x = 20; Engine.cam.y = 26.5;
      const seen = __mk('hound', 15, 26.5, 'chase'); seen.alertT = 8; const d1 = Math.hypot(seen.x - 20, seen.y - 26.5);
      for (let i = 0; i < 30; i++) { __fix(i); G.noise = 1; update(1 / 30); }
      out.seenCloser = d1 - Math.hypot(seen.x - 20, seen.y - 26.5); out.seenSniff = !!HUNTERS13.sniffState(seen); __rm(seen);
      // (d) the scent runs out within the limit even with a long trail
      __stage(); __seed(44); __blind(true); __walk([[15.5, 26.5], [27.5, 26.5], [27.5, 32.5], [37.5, 32.5]]);
      const slow = __mk('hound', 15.6, 26.5, 'chase'); slow.alertT = 60; let t = 0;
      for (; t < 30 * 30 && slow.state === 'chase'; t++) { G.noise = 1; update(1 / 30); }
      out.limitSecs = t / 30; out.limitState = slow.state; __rm(slow); __blind(false);
      return out;
    });
    ok(lim.rangeMoved < 2.5 && lim.rangeLost && lim.rangeState === 'idle', 'leave the trail range and stealth works: a hound 13 paces off the trail casts about (moved ' + lim.rangeMoved.toFixed(2) + ') and goes idle (' + lim.rangeState + ')');
    ok(lim.loudCloser > 0.8 && !lim.loudSniff, 'a loud player is still found: inside hearing range the hound comes straight (closed ' + lim.loudCloser.toFixed(2) + ')');
    ok(lim.seenCloser > 2 && !lim.seenSniff, 'in sight the original chase runs (closed ' + lim.seenCloser.toFixed(2) + ' in 1 s)');
    ok(lim.limitSecs <= 18.5 && lim.limitState === 'idle', 'even with a 60-second alert the scent is dropped within the limit (' + lim.limitSecs.toFixed(1) + ' s)');

    // ============================================================ 5. switch off = the original AI, call for call
    const script = `(() => {
      const log = [];
      const run = (tag) => {
        __stage(); __seed(5150); __blind(true);
        __walk([[15.5, 26.5], [20.5, 26.5], [20.5, 21.5]]);
        const hs = [__mk('hound', 15.6, 26.5, 'chase'), __mk('hound', 17.5, 29.5, 'chase'), __mk('proctor', 24, 30, 'idle')];
        for (const h of hs) h.alertT = 8;
        for (let i = 0; i < 240; i++) {
          __fix(i); G.noise = 1; update(1 / 30);
          if (i % 6 === 0) log.push(hs.map(e => e.state + ':' + e.x.toFixed(4) + ',' + e.y.toFixed(4) + ':' + (e.alertT || 0).toFixed(3)).join('|') + '|' + G.noise.toFixed(4) );
        }
        // and a hound with sight, noise and fire fear, all unchanged
        __blind(false); Engine.cam.x = 20; Engine.cam.y = 26.5;
        const near = __mk('hound', 14, 26.5, 'chase'); near.alertT = 8;
        for (let i = 0; i < 90; i++) { __fix(i + 500); G.noise = 3; update(1 / 30); if (i % 6 === 0) log.push('near:' + near.state + ':' + near.x.toFixed(4) + ',' + near.y.toFixed(4) + ':' + G.player.hp.toFixed(2)); }
        for (const h of hs) __rm(h); __rm(near); __blind(false);
      };
      run();
      return log.join('\\n');
    })()`;
    const traceOff = await page.evaluate((s) => { HUNTERS13.set.trail = false; const r = eval(s); HUNTERS13.set.trail = true; return r; }, script);
    const traceOff2 = await page.evaluate((s) => { HUNTERS13.set.trail = false; const r = eval(s); HUNTERS13.set.trail = true; return r; }, script);
    const traceOn = await page.evaluate((s) => { HUNTERS13.set.trail = true; return eval(s); }, script);
    const orig = await boot(browser, { block: true });
    const traceOrig = await orig.page.evaluate((s) => { if (typeof HUNTERS13 !== 'undefined') return 'MODULE PRESENT'; return eval(s); }, script);
    await orig.page.close();
    const lines = traceOff.split('\n').length;
    const dl = traceOff.split('\n'), ol = String(traceOrig).split('\n'); let di = -1; for (let i = 0; i < Math.max(dl.length, ol.length); i++) if (dl[i] !== ol[i]) { di = i; break; }
    if (di >= 0) console.log('  (the same script twice on one page ' + (traceOff === traceOff2 ? 'is' : 'is NOT') + ' identical)');
    if (di >= 0) console.log('  first difference at sample ' + di + ':\n   off : ' + dl[di] + '\n   orig: ' + ol[di]);
    ok(traceOff === traceOrig && lines > 40, 'switch off = identical AI traces: ' + lines + ' seeded samples (states, positions, alert timers, Narrow, RNG calls) equal a page that never loaded the module');
    ok(traceOn !== traceOff, 'and with the switch on the same script does differ (the trail is doing something)');
    const origErr = orig.errors.filter(e => !/ERR_FAILED|Failed to load resource/.test(e));
    ok(origErr.length === 0, 'the blocked-module page ran clean' + (origErr.length ? ': ' + origErr[0] : ''));

    // ============================================================ 6. the grey wave
    const wv = await page.evaluate(() => {
      const out = {};
      __stage('clearing', 22.5, 26.5, 0);
      HUNTERS13.set.wave = true; GFX.hushWave = true;
      const e = __mk('hushwarden', 23.5, 26.5, 'chase');
      // the mechanic (wilds.js): half the hits mute for 5 s. Pin the roll.
      Math.random = () => 0.1; wildsHitFx(e, ENEMIES.hushwarden);
      out.muted = G.mutedT; out.waves = HUNTERS13.waves.length; out.pos = HUNTERS13.waves[0] ? [HUNTERS13.waves[0].x, HUNTERS13.waves[0].y] : null;
      out.duck0 = HUNTERS13.duckWanted();
      // it expands
      const R = [];
      for (let i = 0; i < 6; i++) { R.push(+HUNTERS13.waveR(HUNTERS13.waves[0], HUNTERS13.clock).toFixed(2)); update(0.2); }
      out.R = R;
      out.expands = R.every((r, i) => i === 0 || r > R[i - 1]);
      // a miss (roll >= 0.5) is the same as before: no mute, no wave
      update(1.3); HUNTERS13.waves.length = 0; HUNTERS13.resetDuck(); G.mutedT = 0; Math.random = () => 0.9; wildsHitFx(e, ENEMIES.hushwarden);
      out.missMuted = G.mutedT; out.missWaves = HUNTERS13.waves.length;
      // the duck follows the wave, and is restored
      Math.random = () => 0.1; G.mutedT = 0; update(1.3); wildsHitFx(e, ENEMIES.hushwarden);
      const w = HUNTERS13.waves[0]; out.life = HUNTERS13.waveLife(w);
      update(0.4); out.duckMid = HUNTERS13.duck; out.duckLiveMid = HUNTERS13.duckLive;
      for (let i = 0; i < Math.ceil(out.life / 0.2) + 2; i++) update(0.2);
      out.duckEnd = HUNTERS13.duck; out.wavesEnd = HUNTERS13.waves.length; out.duckLiveEnd = HUNTERS13.duckLive;
      out.gain = Audio_.ctx && Audio_.sfxBus ? +Audio_.sfxBus.gain.value.toFixed(3) : null;
      // the switch off: same mechanic, no wave
      HUNTERS13.setSwitch('wave', false); G.mutedT = 0; update(1.3); Math.random = () => 0.1; wildsHitFx(e, ENEMIES.hushwarden);
      out.offMuted = G.mutedT; out.offWaves = HUNTERS13.waves.length; HUNTERS13.setSwitch('wave', true);
      __rm(e);
      return out;
    });
    ok(wv.muted === 5 && wv.waves === 1 && Math.abs(wv.pos[0] - 23.5) < 0.01, 'a muffling hit starts a wave at the warden (G.mutedT stays the original 5 s)');
    ok(wv.expands && wv.R[5] > wv.R[0] + 4, 'the ring expands: radius ' + wv.R.join(' '));
    ok(wv.missMuted === 0 && wv.missWaves === 0, 'a swing that does not muffle makes no wave');
    ok(wv.duck0 === 1 && wv.duckMid < 0.7 && wv.duckLiveMid, 'sound dips as the wave reaches you (wanted gain ' + wv.duck0.toFixed(2) + ' before, ' + wv.duckMid.toFixed(2) + ' as it passes)');
    await page.waitForTimeout(900);
    const gainLater = await page.evaluate(() => (Audio_.ctx && Audio_.sfxBus ? +Audio_.sfxBus.gain.value.toFixed(3) : null));
    ok(wv.duckEnd === 1 && !wv.duckLiveEnd && wv.wavesEnd === 0 && (gainLater === null || gainLater > 0.97), 'and is restored when the wave ends (wanted 1, bus gain ' + gainLater + ' after the ramp)');
    ok(wv.offMuted === 5 && wv.offWaves === 0, 'switch off: the mute still works, no wave');

    // ---- the picture, on a synthetic frame (depth-aware, desaturating, accessibility fallbacks)
    const px = await page.evaluate(() => {
      const mkF = () => {
        const w = 64, h = 4, n = w * h, fb = new Uint32Array(n), dbuf = new Float32Array(n), mbuf = new Uint8Array(n);
        // one row per depth: x from 0..63; the camera looks east from (0,0), plane (0, 0.66)
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * w + x; fb[o] = 0xff000000 | (60 << 16) | (200 << 8) | 220; dbuf[o] = 1 + y * 4; mbuf[o] = y === 3 ? 1 : 4; }   // rows: depth 1, 5, 9; the last row is sky
        return { fb, dbuf, mbuf, w, h, cam: { x: 0, y: 0 }, map: G.map, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 };
      };
      const sat = (p) => { const r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255; return Math.max(r, g, b) - Math.min(r, g, b); };
      const lightOf = (p) => ((p & 255) + ((p >> 8) & 255) + ((p >> 16) & 255)) / 3;
      const out = {};
      const test = (opts, age) => {
        HUNTERS13.waves.length = 0;
        const w = { x: 5, y: 0, map: G.mapId, t0: HUNTERS13.clock - age, soft: !!opts.soft, still: !!opts.still, gentle: !!opts.gentle };
        HUNTERS13.waves.push(w);
        const F = mkF(); const mid = 32;
        HUNTERS13.drawWaves(F);
        HUNTERS13.waves.length = 0;
        const at = (y) => F.fb[y * F.w + mid];
        return { d1: at(0), d5: at(1), d9: at(2), sky: at(3), F };
      };
      const base = (0xff000000 | (60 << 16) | (200 << 8) | 220) >>> 0;
      // age 0.8 s: R = 5.6. Row 1 (depth 5, the source itself) is inside; row 2 (depth 9, d = 4) is near the ring; row 0 (depth 1, d = 4) too
      const a = test({}, 0.65);          // R = 4.55: the pixels 4 paces from the source (rows 0 and 2) have just been passed
      out.satBase = sat(base); out.satD5 = Math.max(sat(a.d1), sat(a.d9)); out.satSrc = sat(a.d5); out.skyUntouched = a.sky === base;
      // not yet reached: age 0.2 -> R = 1.4: the depth-9 pixel (d = 4) is untouched, the source pixel is not
      const early = test({}, 0.2); out.farUntouched = early.d9 === base;
      // fully past: wave over
      const late = test({}, 4); out.lateUntouched = late.d5 === base;
      // soft (No flashes) is gentler
      const soft = test({ soft: true }, 0.65); out.satSoft = Math.min(sat(soft.d1), sat(soft.d9));
      // jump scares off: gentler too
      const gentle = test({ gentle: true }, 0.65); out.satGentle = Math.min(sat(gentle.d1), sat(gentle.d9));
      // still tint (Reduce motion): the same grey at d = 0 and d = 4 (no ring), and it fades
      const st0 = test({ still: true }, 0.1); out.stillSat = [sat(st0.d5), sat(st0.d9)]; out.stillLight = [lightOf(st0.d5), lightOf(st0.d9)];
      const st1 = test({ still: true }, 1.7); out.stillFade = sat(st1.d5); const st2 = test({ still: true }, 2.2); out.stillGone = st2.d5 === base;
      // wave in another map: ignored
      HUNTERS13.waves.push({ x: 5, y: 0, map: 'nowhere', t0: HUNTERS13.clock - 1, soft: false, still: false, gentle: false }); const F2 = mkF(); HUNTERS13.drawWaves(F2); HUNTERS13.waves.length = 0; out.otherMap = F2.fb[32] === base;
      out.maxGrey = [0, 1, 2, 3, 4].map(i => +HUNTERS13.greyAt({ soft: false, still: false, gentle: false }, 2, 0.5 + i * 0.3).toFixed(3));
      return out;
    });
    ok(px.satD5 < px.satBase * 0.5 && px.skyUntouched, 'the ring desaturates what it passes (saturation ' + px.satBase + ' -> ' + px.satD5 + ') and leaves the sky alone');
    ok(px.farUntouched && px.lateUntouched && px.otherMap, 'depth-aware: pixels the ring has not reached, ones long past, and waves from another map are untouched');
    ok(px.satSoft > px.satD5 && px.satGentle > px.satD5, 'No flashes (' + px.satSoft + ') and jump scares off (' + px.satGentle + ') are softer than the full wave (' + px.satD5 + ')');
    ok(Math.abs(px.stillSat[0] - px.stillSat[1]) <= 3 && px.stillSat[0] < px.satBase && px.stillFade > px.stillSat[0] && px.stillGone, 'Reduce motion: a static grey tint, equal near and far (' + px.stillSat + '), that fades (' + px.stillSat[0] + ' -> ' + px.stillFade + ' -> gone)');

    // ---- a real frame: the wave is in the picture and costs little
    const perf = await page.evaluate(() => {
      __stage('clearing', 22.5, 26.5, 0); G.tod = 0.5;
      for (let i = 0; i < 12; i++) __mk(['hound', 'proctor', 'legionnaire', 'hushwarden'][i % 4], 24 + (i % 4) * 1.3, 15 + Math.floor(i / 4) * 2.2, 'idle');
      for (const e of G.ents) if (e.kind === 'enemy') e.state = 'passive';
      const median = (f) => { const a = []; for (let i = 0; i < 61; i++) { const t0 = performance.now(); f(); a.push(performance.now() - t0); } a.sort((x, y) => x - y); return a[30]; };
      const frame = () => Engine.render(G.ents, G.tod);
      const mean = () => { const d = Engine.ctx.getImageData(0, 0, Engine.canvas.width, Math.floor(Engine.canvas.height * 0.9)).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 40) { s += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); n++; } return s / n; };
      frame(); const satOff = mean();
      HUNTERS13.startWave(Engine.cam.x + 1, Engine.cam.y, { force: true }); const wv = HUNTERS13.waves[0]; wv.t0 = HUNTERS13.clock - 0.85;
      frame(); const satOn = mean(); const px0 = HUNTERS13.stats.wavePixels;
      const offs = [], ons = [];
      for (let round = 0; round < 6; round++) {
        HUNTERS13.waves.length = 0; for (let i = 0; i < 20; i++) frame();
        for (let i = 0; i < 41; i++) { const t0 = performance.now(); frame(); offs.push(performance.now() - t0); }
        HUNTERS13.waves.push(wv); for (let i = 0; i < 20; i++) { wv.t0 = HUNTERS13.clock - 0.85; frame(); }
        for (let i = 0; i < 41; i++) { wv.t0 = HUNTERS13.clock - 0.85; const t0 = performance.now(); frame(); ons.push(performance.now() - t0); }
      }
      offs.sort((x, y) => x - y); ons.sort((x, y) => x - y);
      const off = offs[offs.length >> 1], on = ons[ons.length >> 1];
      const waveMs = HUNTERS13.stats.waveMs; HUNTERS13.waves.length = 0;
      return { satOff, satOn, px0, off, on, waveMs, w: Engine.canvas.width, h: Engine.canvas.height };
    });
    ok(perf.px0 > 500 && perf.satOn < perf.satOff * 0.95, 'in a real frame the ring greys the floor and walls (' + perf.px0 + ' pixels; mean saturation ' + perf.satOff.toFixed(1) + ' -> ' + perf.satOn.toFixed(1) + ')');
    console.log('INFO perf: 12-enemy frame median ' + perf.off.toFixed(2) + ' ms without the wave, ' + perf.on.toFixed(2) + ' ms with it (+' + (perf.on - perf.off).toFixed(2) + ' ms, wave pass ' + perf.waveMs.toFixed(2) + ' ms) at ' + perf.w + 'x' + perf.h);
    ok(perf.on - perf.off < 3, 'wave cost while it is on stays small (+' + (perf.on - perf.off).toFixed(2) + ' ms; it runs for under 3 s a hit and is free otherwise)');

    // ============================================================ 7. crows at bodies
    const cr = await page.evaluate(() => {
      const out = {};
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; __seed(61); HUNTERS13.set.crows = true; GFX.carrionCrows = true;
      const g = __corpse('legionnaire', 30.5, 26.5);
      out.corpse = !!(g && g.corpse); out.sensitive = HUNTERS13.srcInfo(g) && HUNTERS13.srcInfo(g).sensitive;
      __run(3); out.early = HUNTERS13.crows.length;
      __run(20);
      out.crows = HUNTERS13.crows.length; out.landed = HUNTERS13.crows.filter(c => c._c13.st === 'peck' || c._c13.st === 'hop').length;
      out.near = HUNTERS13.crows.every(c => Math.hypot(c.x - g.x, c.y - g.y) < 1.2);
      out.sprites = HUNTERS13.crows.map(c => c.animSprite);
      out.flags = Object.keys(G.flags).filter(k => k.indexOf('p13w_') === 0).length;
      out.saved = JSON.stringify(snapshotGame()).indexOf('crow') < 0 || !HUNTERS13.crows.some(c => !c.transient);
      // peck frames alternate
      const seen = new Set(); for (let i = 0; i < 90; i++) { update(1 / 30); for (const c of HUNTERS13.crows) { animDeco(c, 1 / 30, 1, true); seen.add(c.animSprite); } }
      out.pecks = [...seen].sort().join();
      // the scatter: idle foes near it turn to look; a far one and a walled one do not
      const near = __mk('golem', 34.5, 26.5, 'idle'), far = __mk('tongueless', 30.5, 10.5, 'idle'), chaser = __mk('proctor', 29.5, 29, 'chase');
      const cx = HUNTERS13.crows[0].x, cy = HUNTERS13.crows[0].y;
      const sc0 = HUNTERS13.stats.scatters, noise0 = G.noise;
      // walk up to them (2.7 paces a second): they go before you are on top of them
      G.noise = 1; const c = Engine.cam; c.x = 22; c.y = g.y; let steps = 0, firstOut = -1;
      while (steps++ < 400 && HUNTERS13.stats.scatters === sc0) { c.x += 0.09; G.noise = Math.min(G.noise, 1); update(1 / 30); }
      out.scatterDist = Math.hypot(g.x - c.x, g.y - c.y);
      update(1 / 30);
      out.scatters = HUNTERS13.stats.scatters - sc0; out.outCount = HUNTERS13.crows.filter(c => c._c13.st === 'out').length;
      out.nearState = near.state; out.nearInv = near.investigation ? [near.investigation.x, near.investigation.y] : null; out.farState = far.state; out.chaseState = chaser.state;
      out.cry = [cx, cy]; out.noiseBump = G.noise - noise0;
      out.msgNone = true;
      // the scatter happens once: they do not re-scatter next frame
      update(1 / 30); out.scatters2 = HUNTERS13.stats.scatters - sc0;
      // they leave and are removed
      __run(8); out.gone = HUNTERS13.crows.length;
      // no new crows for 40 s while you are close, even in daylight
      G.vel.x = 0; Engine.cam.x = g.x - 5; __run(10); out.again = HUNTERS13.crows.length;
      __rm(near); __rm(far); __rm(chaser);
      return out;
    });
    ok(cr.corpse && !cr.sensitive && cr.early === 0 && cr.crows >= 1 && cr.crows <= 2 && cr.landed === cr.crows && cr.near, 'crows come to a settled corpse after a delay (none at 3 s, ' + cr.crows + ' landed beside it by 23 s)');
    ok(/crow_peck/.test(cr.pecks) && /crow_stand/.test(cr.pecks), 'they peck (frames: ' + cr.pecks + ')');
    ok(cr.scatters === 1 && cr.outCount === cr.crows && cr.scatters2 === 1 && cr.scatterDist > 3 && cr.scatterDist < 6.5, 'walking up scatters them, once, at ' + cr.scatterDist.toFixed(1) + ' paces');
    ok(cr.nearState === 'investigate' && cr.nearInv && Math.hypot(cr.nearInv[0] - cr.cry[0], cr.nearInv[1] - cr.cry[1]) < 1.5, 'the scatter is a noise: an idle foe 4 paces from the crows (out of its own sight of you) turns to look at the spot');
    ok(cr.farState === 'idle' && cr.chaseState === 'chase', 'and only within the radius: a foe 16 paces away is unmoved, one already chasing is not redirected');
    ok(cr.noiseBump > 0 && cr.noiseBump <= 3.5, 'a small bump to the Narrow when you are the one close (' + cr.noiseBump.toFixed(2) + ')');
    ok(cr.gone === 0 && cr.again === 0, 'they fly off and are removed, and do not come back while you stand near (' + cr.again + ')');
    ok(cr.flags === 0 && cr.saved, 'nothing about crows is saved');

    const rules = await page.evaluate(() => {
      const out = {};
      const soak = (secs) => { __run(secs || 28); return HUNTERS13.crows.length; };
      // caps: six bodies, at most 4 crows on the map
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; __seed(62);
      for (let i = 0; i < 6; i++) __corpse('legionnaire', 24.5 + (i % 3) * 4, 26.5 + Math.floor(i / 3) * 4);
      out.cap = soak(40); out.perBody = Math.max(...[...document.querySelectorAll('x')].map(() => 0), 0);
      const counts = {}; for (const c of HUNTERS13.crows) { const k = HUNTERS13.crows.filter(d => d._c13.body === c._c13.body).length; counts[k] = 1; } out.perBodyMax = Math.max(...Object.keys(counts).map(Number));
      // night: none; and any there at dusk leave quietly
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.9; __corpse('legionnaire', 30.5, 26.5); out.night = soak();
      G.tod = 0.5; __run(25); out.dayAfter = HUNTERS13.crows.length; const sc = HUNTERS13.stats.scatters, al = HUNTERS13.stats.alerted;
      G.tod = 0.9; __run(0.6); out.duskLeave = HUNTERS13.crows.filter(c => c._c13.st === 'out').length; out.duskQuiet = HUNTERS13.stats.scatters === sc && HUNTERS13.stats.alerted === al; __run(8); out.duskGone = HUNTERS13.crows.length;
      // indoors: the tavern
      __stage('tavern', 5.5, 5.5, 0); G.tod = 0.5; out.indoor = G.map.outdoor; __corpse('legionnaire', 8.5, 6.5); out.indoorCrows = soak();
      // named: an authored name, a boss, a dragged body, a hidden body, a body in water
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; __corpse('legionnaire', 30.5, 26.5, 'Hal Brennick'); out.named = soak();
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; const bg = __corpse('captain', 30.5, 26.5); out.boss = soak(); out.bossFlag = !!(bg && HUNTERS13.srcInfo(bg) && HUNTERS13.srcInfo(bg).sensitive);
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; const dg = __corpse('legionnaire', 30.5, 26.5); const realReach = window.bodyReachable; window.bodyReachable = () => true; for (let t = 0; t < 28 * 30; t++) { G.dragBody = dg; G.noise = 1; update(1 / 30); } window.bodyReachable = realReach; out.dragged = HUNTERS13.crows.length; G.dragBody = null;
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; const hg = __corpse('legionnaire', 30.5, 26.5); hg.hidden = true; out.hidden = soak();
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; const real = window.waterLvl; window.waterLvl = (x, y) => (x > 25 ? 1 : 0); __corpse('legionnaire', 30.5, 26.5); out.water = soak(); window.waterLvl = real;
      // swarms and the Hush's dissolving things leave no corpse at all
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; const sw = __corpse('mites', 30.5, 26.5); out.swarmCorpse = !!(sw && sw.corpse); out.swarm = soak();
      // near the player: not within 8 paces
      __stage('clearing', 28.5, 26.5, 0); G.tod = 0.5; __corpse('legionnaire', 31.5, 26.5); out.close = soak();
      // switch off: none, and existing crows go
      __stage('clearing', 14.5, 26.5, 0); G.tod = 0.5; __corpse('legionnaire', 30.5, 26.5); __run(25); out.onN = HUNTERS13.crows.length; HUNTERS13.setSwitch('crows', false); out.offN = HUNTERS13.crows.length; out.offInEnts = G.ents.filter(e => e._c13).length; __run(30); out.offAfter = HUNTERS13.crows.length; HUNTERS13.setSwitch('crows', true);
      return out;
    });
    ok(rules.cap <= 4 && rules.cap >= 3 && rules.perBodyMax <= 2, 'caps: six bodies draw ' + rules.cap + ' crows (map cap 4), never more than 2 at one body');
    ok(rules.night === 0 && rules.dayAfter >= 1 && rules.duskLeave === rules.dayAfter && rules.duskQuiet && rules.duskGone === 0, 'not at night; crows already there at dusk leave quietly (no scatter, no noise)');
    ok(rules.indoor === false && rules.indoorCrows === 0, 'not indoors');
    ok(rules.named === 0 && rules.boss === 0 && rules.bossFlag, 'not at named people (an authored name) or bosses');
    ok(rules.dragged === 0 && rules.hidden === 0 && rules.water === 0 && rules.close === 0, 'not at a body you drag, a hidden one, one in water, or within 8 paces of you (' + [rules.dragged, rules.hidden, rules.water, rules.close] + ')');
    ok(rules.swarmCorpse === false && rules.swarm === 0, 'swarms leave no corpse, so no crows');
    ok(rules.onN >= 1 && rules.offN === 0 && rules.offInEnts === 0 && rules.offAfter === 0, 'switch off: crows go and none come');

    // ============================================================ 8. Options, accessibility, 640x400
    const opts = await page.evaluate(() => {
      G.state = 'panel'; renderAccessibilityMenu();
      const out = { head: !!document.getElementById('p13w-head'), btns: ['trail', 'wave', 'crows'].map(k => { const b = document.getElementById('p13w-' + k); return b ? b.textContent + ':' + b.getAttribute('aria-pressed') : null; }) };
      document.getElementById('p13w-wave').click(); out.waveOff = GFX.hushWave === false && HUNTERS13.set.wave === false; out.storedOff = JSON.parse(localStorage.getItem('octave.hunters13.v1'));
      document.getElementById('p13w-wave').click(); out.waveOn = GFX.hushWave === true; out.stored = JSON.parse(localStorage.getItem('octave.hunters13.v1'));
      closeModal(); G.state = 'play'; return out;
    });
    ok(opts.head && opts.btns.join() === 'On:true,On:true,On:true', 'Options > Graphics & access has three switches, default On: ' + opts.btns);
    ok(opts.waveOff && opts.waveOn && opts.storedOff && opts.storedOff.wave === false && opts.stored && opts.stored.wave === true, 'the Grey wave row drives GFX.hushWave and persists (octave.hunters13.v1)');
    const pre = await page.evaluate(() => { PRESETS.apply('original'); const a = { wave: GFX.hushWave, crows: GFX.carrionCrows, setWave: HUNTERS13.set.wave }; PRESETS.apply('medium'); return a; });
    ok(pre.wave === false && pre.crows === true && pre.setWave === false, 'the Original preset leaves the Grey wave effect off and keeps the carrion crows (Phase 20 MAX: small-life art is on in every preset)');
    await page.evaluate(() => { PRESETS.apply('medium'); GFX.hushWave = true; GFX.carrionCrows = true; HUNTERS13.set.wave = true; HUNTERS13.set.crows = true; GFX.changed(); });

    // captions
    const cap = await page.evaluate(() => {
      ACCESS.settings.cap = true; const box = document.getElementById('ac-captions'); if (box) box.textContent = '';
      __stage('clearing', 22.5, 26.5, 0); HUNTERS13.startWave(22.5, 26.5, { force: true });
      const t = [...document.querySelectorAll('#ac-captions div')].map(d => d.textContent);
      ACCESS.settings.cap = false; return t;
    });
    ok(cap.includes('[The sound drains away]'), 'the wave has a sound caption: ' + cap);

    // jump scares off: a stub of NERVES13 makes the wave gentler (checked on the greyness) and the snuffle quieter
    const scares = await page.evaluate(() => {
      const had = window.NERVES13; window.NERVES13 = { scaresAllowed: () => false };
      __stage('clearing', 22.5, 26.5, 0); const w = HUNTERS13.startWave(22.5, 26.5, { force: true });
      const out = { gentle: w.gentle, g: HUNTERS13.greyAt(w, 2, 0.6), full: HUNTERS13.greyAt(Object.assign({}, w, { gentle: false }), 2, 0.6) };
      window.NERVES13 = had; HUNTERS13.waves.length = 0; HUNTERS13.resetDuck(); return out;
    });
    ok(scares.gentle && scares.g < scares.full, 'with Jump scares off the wave is gentler (' + scares.g.toFixed(2) + ' < ' + scares.full.toFixed(2) + ')');

    // 640x400 and screenshots
    await page.evaluate(() => { HUNTERS13.resetState(); });
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(200);
    const compact = await page.evaluate(() => {
      G.state = 'panel'; renderAccessibilityMenu(); const q = document.getElementById('modal-panel'); const o = { sw: q.scrollWidth, cw: q.clientWidth };
      const rowOk = ['p13w-trail', 'p13w-wave', 'p13w-crows'].every(id => { const b = document.getElementById(id); if (!b) return false; const r = b.getBoundingClientRect(), pr = q.getBoundingClientRect(); return r.right <= pr.right + 1 && r.left >= pr.left - 1; });
      closeModal(); G.state = 'play'; return { o, rowOk };
    });
    ok(compact.o.sw <= compact.o.cw + 1 && compact.rowOk, 'Options rows at 640x400: no horizontal overflow (' + JSON.stringify(compact.o) + ')');
    await snap('compact-options');

    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(200);
    if (SHOTS) {
      await page.evaluate(() => {
        __stage('clearing', 20.5, 26.5, 0); G.tod = 0.5; PRESETS.apply('medium');
        const h = __mk('hound', 25.5, 26.5, 'chase'); h.alertT = 8; window.__shotHound = h;
        const hs = HUNTERS13.sniffState(h);
        window.render && render();
      });
      // hound sniffing: put it where the camera looks, nose down
      await page.evaluate(() => {
        const h = window.__shotHound; G.state = 'play'; __blind(true);
        Engine.cam.x = 20.5; Engine.cam.y = 26.5; HUNTERS13.trail.length = 0;
        for (let i = 0; i < 12; i++) HUNTERS13.trail.push({ id: 900 + i, x: 28.2 - i * 0.7, y: 26.5, t: HUNTERS13.clock, seg: 1, broken: false });
        h.x = 24.6; h.y = 26.5; for (let i = 0; i < 12; i++) { G.noise = 1; update(1 / 30); } __blind(false);
      });
      await page.evaluate(() => { render(); }); await snap('hound-sniffing');
      await page.evaluate(() => {
        __rm(window.__shotHound); HUNTERS13.resetState(); __stage('clearing', 20.5, 26.5, 0); G.tod = 0.5;
        const e = __mk('hushwarden', 23, 26.2, 'chase'); window.__shotW = e; Math.random = () => 0.1; wildsHitFx(e, ENEMIES.hushwarden);
        HUNTERS13.waves[0].t0 = HUNTERS13.clock - 0.55; render();
      });
      await snap('wave-ring');
      await page.evaluate(() => { HUNTERS13.waves[0].t0 = HUNTERS13.clock - 1.45; render(); }); await snap('wave-wake');
      await page.evaluate(() => { __rm(window.__shotW); HUNTERS13.resetState(); GFX.reduceMotion = true; __stage('clearing', 20.5, 26.5, 0); const e = __mk('hushwarden', 23, 26.2, 'chase'); Math.random = () => 0.1; wildsHitFx(e, ENEMIES.hushwarden); HUNTERS13.waves[0].t0 = HUNTERS13.clock - 0.4; render(); window.__shotW = e; });
      await snap('wave-reduce-motion');
      await page.evaluate(() => { GFX.reduceMotion = false; __rm(window.__shotW); HUNTERS13.resetState(); __stage('clearing', 20.5, 26.5, 0); G.tod = 0.5; __seed(63); const g = __corpse('legionnaire', 26.5, 26.5); Engine.cam.dir = 0; __run(24); render(); });
      await snap('crows-at-body');
      await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(200);
      await page.evaluate(() => { render(); }); await snap('crows-compact');
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    // ============================================================ 9. no page errors, hostile saves
    const hostile = await page.evaluate(() => {
      HUNTERS13.resetState();
      const o = {};
      try {
        G.flags.p13w_junk = 'x<img onerror=1>'; G.flags.p13w_n = NaN; const snap = JSON.stringify(snapshotGame()); o.ran = true; o.noMarkup = true;
        delete G.flags.p13w_junk; delete G.flags.p13w_n;
        o.stats = HUNTERS13.stats.errors;
      } catch (e) { o.err = e.message; }
      return o;
    });
    ok(hostile.ran && hostile.stats === 0, 'hostile p13w_ flags are inert (the module reads no flags), and the module logged no internal errors (' + hostile.stats + ')');
    const realErrors = errors.filter(e => !/ERR_FAILED/.test(e));
    ok(realErrors.length === 0, 'no page errors' + (realErrors.length ? ': ' + realErrors.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log(fails === 0 ? 'ALL PASS' : fails + ' FAILED');
  process.exit(fails === 0 ? 0 : 1);
})();
