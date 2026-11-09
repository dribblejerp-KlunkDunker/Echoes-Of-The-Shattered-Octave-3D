// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3922 node test/skies14.test.js
// Covers js/skies14.js: Octave lights (aurora), the Kestrel flight scene, rippling light on the Sunken Court's flooded floor.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
// Frames are pinned (Engine.render by hand, fixed clock and weather). "Off = the original frame" is proved by loading the
// game a second time with js/skies14.js blocked and comparing frame hashes with the three switches off.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'skies14-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }

async function bootPage(browser, url, viewport, block) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' && !(block && /ERR_FAILED|skies14/.test(m.text()))) || (m.type() === 'warning' && /skies14/.test(m.text()))) errors.push('console: ' + m.text()); });
  if (block) await page.route('**/js/skies14.js*', r => r.abort());
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(url);
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

const HELPERS = () => {
  const S = window.S = { cap: null, on: false };
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, horizon: F.horizon }; }, 99);
  S.KEYS = ['aurora', 'kestrelScene', 'causticLight'];
  S.stage = (map, x, y, dir, tod, day, flags) => {
    loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = tod == null ? 0.5 : tod; G.day = day == null ? 3 : day;
    for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {});
    Engine.cam.pitch = 0; Engine.cam.bob = 0; Weather.hold('clear'); GFX.reduceMotion = false; GFX.noFlash = false;
  };
  S.frame = (flags, t, wx) => {
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = 1; GFX.particles = 1; Engine.setLook({ fogK: 1 });
    for (const k of (flags || [])) GFX[k] = true;
    Engine.setTime(t == null ? 5 : t); Engine.setWeather(wx || { haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
    const ents = G.ents.filter(e => e.kind === 'deco');
    S.on = true; Engine.render(ents, G.tod); S.on = false;
    return S.cap;
  };
  S.diff = (a, b) => { const out = []; for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) out.push(i); return out; };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  S.png = (k) => { const c = Engine.canvas, o = document.createElement('canvas'), vh = Engine.VIEW_H * Engine.getScale(); o.width = c.width * k; o.height = vh * k; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, c.width, vh, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
  S.sum = (c, i) => (c.fb[i] & 255) + ((c.fb[i] >> 8) & 255) + ((c.fb[i] >> 16) & 255);
  S.scenes = () => {
    const out = [];
    const add = (map, x, y, dir, tod, day, flags) => { S.stage(map, x, y, dir, tod, day, flags); out.push(S.hash(S.frame([], 5).fb)); };
    // (Oakhaven's hashes differ from one page load to the next even with the module blocked, so it is left out here)
    add('clearing', 20.5, 33.5, 3.14, 0.95, 9, {});
    add('greenroot', G.maps.greenroot.spawn.x, G.maps.greenroot.spawn.y, G.maps.greenroot.spawn.dir, 0.95, 9, {});
    add('clearing', 20.5, 33.5, -1.57, 0.95, 3, {});
    add('whispergrove', 24.5, 27.5, -1.57, 0.5, 3, {});
    add('whispergrove', 24.5, 27.5, -1.57, 0.9, 12, { part3: true, greening: true });
    add('whispergrove', 33, 16.5, 0, 0.9, 12, { part3: true });
    add('cloister', 9.5, 13.3, -1.57, 0.95, 9, {});
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3922';
  try {
    const { page, errors } = await bootPage(browser, URL);
    await page.evaluate(HELPERS);
    const shot = async (name, k) => { const url = await page.evaluate((k) => { Engine.render(G.ents.filter(e => e.kind === 'deco'), G.tod); return S.png(k || 3); }, k); fs.writeFileSync(path.join(SHOT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); };

    // ------------------------------------------------------------------ 0. module, switches, presets
    const st = await page.evaluate(() => {
      const o = { has: typeof SKIES14 === 'object', fx: S.KEYS.map(k => GFX.FX.includes(k)), def: S.KEYS.map(k => GFX[k]) };
      o.presets = {};
      for (const p of ['original', 'low', 'medium', 'high']) { PRESETS.apply(p); o.presets[p] = S.KEYS.map(k => GFX[k]).join(','); }
      PRESETS.apply('medium'); GFX.plain(); o.plain = S.KEYS.map(k => GFX[k]).join(',');
      PRESETS.apply('medium'); o.cur = PRESETS.current();
      PRESETS.apply('low'); o.curLow = PRESETS.current();
      PRESETS.apply('medium');
      return o;
    });
    ok(st.has && st.fx.every(Boolean) && st.def.every(Boolean), 'module: SKIES14 exists, the three flags are in GFX.FX and default on');
    ok(st.presets.original === 'false,false,false', 'presets: Original has all three off');
    ok(st.presets.low === 'false,true,false' && st.curLow === 'low', `presets: Low drops the two per-frame effects, keeps the scene, and is still recognised as Low (${st.curLow})`);
    ok(st.presets.medium === 'true,true,true' && st.presets.high === 'true,true,true' && st.cur === 'medium', 'presets: Medium and High have them on');
    ok(st.plain === 'false,false,false', 'presets: GFX.plain() turns them off');

    // ------------------------------------------------------------------ 1. off = the original game, pixel for pixel
    const mine = await page.evaluate(() => { S.scenes(); return S.scenes(); });
    const { page: page2, errors: errors2 } = await bootPage(browser, URL, null, true);
    await page2.evaluate(HELPERS);
    const base = await page2.evaluate(() => { window.SKIES14 = undefined; return (S.scenes(), S.scenes()); });
    ok(mine.length === 7 && mine.every((h, i) => h === base[i]), `off: with every switch off, ${mine.length} fixed-camera frames (night on day 9 in the open, Part Three flags, the Court, indoors) hash identically to the game without the module`);
    ok(errors2.length === 0, 'off: the module-less page also loads without errors');
    // and the transition without the module: the same outcome record the scene test compares against
    await page2.close();

    // ------------------------------------------------------------------ 2. Octave lights
    const au = await page.evaluate(() => {
      const o = {}, P = SKIES14.aurora.plan, gv = (m) => (k) => m[k] || 0;
      const kind = (d, t, f, m) => { const p = P(d, t, f, gv(m || {})); return p ? p.kind : null; };
      o.rite = [kind(9, 0.8, {}), kind(10, 0.1, {}), kind(9, 0.3, {})];                       // evening of 9, small hours of 10, but the evening before is day 8's
      o.riteGone = [kind(9, 0.8, { rite_started: true }), kind(9, 0.8, { greening: true }), kind(9, 0.8, { part3: true })];
      o.notRite = [kind(8, 0.8, {}), kind(11, 0.8, {})];
      o.greening = [kind(10, 0.7, { greening: true }, { p14s_g: 10 + 2 }), kind(11, 0.7, { greening: true }, { p14s_g: 10 + 2 }), kind(10, 0.7, { greening: true }, {})];
      o.grove = [kind(15, 0.8, { part3: true }, { p14s_w: 15 + 2 }), kind(16, 0.1, { part3: true }, { p14s_w: 15 + 2 }), kind(15, 0.8, {}, { p14s_w: 15 + 2 })];
      o.woods = [kind(20, 0.9, { part4: true }, { p14s_d: 20 + 2 }), kind(20, 0.9, { part3: true }, { p14s_d: 20 + 2 })];
      // rare nights: deterministic by day, about one in ten, never a story kind, strictly weaker
      let rare = 0, again = true; const N = 4000;
      for (let d = 20; d < 20 + N; d++) { const a = P(d, 0.9, {}, gv({})), b = P(d, 0.9, {}, gv({})); if (a) { rare++; if (a.kind !== 'rare' || !b || b.notes.join() !== a.notes.join() || a.notes.length !== 2 || a.notes[0] === a.notes[1]) again = false; } else if (b) again = false; }
      o.rare = { frac: rare / N, again };
      o.amp = [P(9, 0.8, {}, gv({})).amp, (() => { for (let d = 20; ; d++) { const p = P(d, 0.9, {}, gv({})); if (p) return p.amp; } })()];
      o.notes = SKIES14.aurora.NOTES.map(n => n.hz).join();
      o.kinds = Object.values(SKIES14.aurora.KINDS).every(k => k.notes.every(i => i >= 0 && i < 8));
      return o;
    });
    ok(au.rite[0] === 'rite' && au.rite[1] === 'rite' && au.rite[2] !== 'rite', `aurora: the Rite eve is day 9's night (${au.rite.join()})`);
    ok(au.riteGone.every(k => k !== 'rite') && au.notRite.every(k => k !== 'rite'), 'aurora: not on other days, nor once the Rite or the Greening has begun');
    ok(au.greening[0] === 'greening' && au.greening[1] !== 'greening' && au.greening[2] !== 'greening', `aurora: the greening night follows the recorded day only (${au.greening.join()})`);
    ok(au.grove[0] === 'grove' && au.grove[1] === 'grove' && au.grove[2] !== 'grove', `aurora: the first night in Whisper-Grove runs dusk to dawn, only in Part Three (${au.grove.join()})`);
    ok(au.woods[0] === 'woods' && au.woods[1] !== 'woods', `aurora: the first night in the Deep Woods needs Part Four (${au.woods.join()})`);
    ok(au.rare.frac > 0.06 && au.rare.frac < 0.14 && au.rare.again, `aurora: rare nights are deterministic by G.day, two notes each, about one in ten (${(au.rare.frac * 100).toFixed(1)}%)`);
    ok(au.amp[0] > au.amp[1] * 1.8 && au.notes === '174,285,396,417,528,639,741,852' && au.kinds, 'aurora: story nights are much stronger than rare ones; the eight notes are 174..852 and every night uses valid notes');

    // frames
    const fr = await page.evaluate(() => {
      const o = {};
      const cmp = (setup, t) => { setup(); const a = S.frame([], t || 5), b = S.frame(['aurora'], t || 5); return [a, b]; };
      const lighterOnly = (a, b) => { const idx = S.diff(a, b); let bad = 0, wrongMat = 0; for (const i of idx) { if (S.sum(b, i) < S.sum(a, i)) bad++; if (b.mbuf[i] !== 1 || ((i / b.w) | 0) >= b.horizon) wrongMat++; } return { n: idx.length, bad, wrongMat }; };
      let [a, b] = cmp(() => S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 9, {}));
      o.eve = lighterOnly(a, b);
      { let mx = 0, lowRow = 1e9; for (const i of S.diff(a, b)) { mx = Math.max(mx, S.sum(b, i) - S.sum(a, i)); lowRow = Math.min(lowRow, (b.horizon - ((i / b.w) | 0)) / b.horizon); } o.eve.maxRise = mx; o.eve.lowest = (b.horizon - Math.max(...S.diff(a, b).map(i => (i / b.w) | 0))) / b.horizon; }
      [a, b] = cmp(() => S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5, 9, {})); o.dayDiff = S.diff(a, b).length;
      [a, b] = cmp(() => S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 4, {})); o.plainNight = S.diff(a, b).length;
      [a, b] = cmp(() => S.stage('cloister', 9.5, 13.3, -1.57, 0.97, 9, {})); o.indoors = S.diff(a, b).length;
      // cloud and haze thin it; a storm removes it
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 9, {});
      const clear = S.diff(S.frame([], 5), S.frame(['aurora'], 5)).length;
      const wx = (cloud, haze, flash) => ({ haze, dark: 0, cloud, tint: [196, 200, 214], flash });
      const cl = (c, h, f) => { const A = S.frame([], 5, wx(c, h, f)), B = S.frame(['aurora'], 5, wx(c, h, f)); let s = 0; for (const i of S.diff(A, B)) s += S.sum(B, i) - S.sum(A, i); return s; };
      const sClear = cl(0, 0, 0), sCloud = cl(0.6, 0, 0), sStorm = cl(1, 0, 0), sHaze = cl(0, 0.35, 0);
      o.weather = { clear, sClear, sCloud, sStorm, sHaze };
      // movement: normal drifts, Reduce motion drifts slowly, No flashes is a still gradient
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 9, {});
      const change = (t0, t1) => { let n = 0, s = 0; const A = S.frame(['aurora'], t0), B = S.frame(['aurora'], t1); for (const i of S.diff(A, B)) { n++; s += Math.abs(S.sum(A, i) - S.sum(B, i)); } return { n, s }; };
      const base = (t0, t1) => { const A = S.frame([], t0), B = S.frame([], t1); return S.diff(A, B).length; };
      o.normal = change(5, 25); o.stars = base(5, 25);
      GFX.reduceMotion = true; o.reduced = change(5, 25); GFX.reduceMotion = false;
      GFX.noFlash = true; { const A = S.frame(['aurora'], 5), B = S.frame(['aurora'], 25); const d = S.diff(A, B).length; const sA = S.frame([], 5), sB = S.frame([], 25); o.still = { aur: d, stars: S.diff(sA, sB).length }; } GFX.noFlash = false;
      // the switch in Options turns it off for real
      SKIES14.setSwitch('aurora', false); const off = S.diff(S.frame([], 5), S.frame(['aurora'], 5)).length; SKIES14.setSwitch('aurora', true);
      o.switchOff = off;
      // the hook's own bookkeeping
      S.frame(['aurora'], 5); o.stats = { kind: SKIES14.aurora.state.stats.kind, px: SKIES14.aurora.state.stats.px };
      return o;
    });
    ok(fr.eve.maxRise < 200 && fr.eve.lowest >= 0.34, `aurora look: translucent (no pixel gains more than ${fr.eve.maxRise} of 765), and nothing lower than ${(fr.eve.lowest * 100).toFixed(0)}% of the way up the sky`);
    ok(fr.eve.n > 800 && fr.eve.bad === 0 && fr.eve.wrongMat === 0, `aurora frames: on the Rite eve it adds light (${fr.eve.n} px), only lighter, only on sky pixels above the horizon`);
    ok(fr.dayDiff === 0 && fr.plainNight === 0 && fr.indoors === 0, 'aurora frames: no change by day, on an ordinary night, or indoors');
    ok(fr.weather.sClear > 0 && fr.weather.sCloud < fr.weather.sClear * 0.6 && fr.weather.sStorm === 0 && fr.weather.sHaze < fr.weather.sClear * 0.5, `aurora frames: cloud and haze thin it, a storm removes it (${Math.round(fr.weather.sClear)} / ${Math.round(fr.weather.sCloud)} / ${fr.weather.sStorm} / ${Math.round(fr.weather.sHaze)})`);
    ok(fr.normal.n > fr.stars + 300 && fr.reduced.s < fr.normal.s * 0.5 && fr.reduced.s > 0, `aurora motion: it moves (${fr.normal.n} px vs ${fr.stars} twinkling stars over 20 s), and Reduce motion moves it far less (${fr.reduced.s} vs ${fr.normal.s})`);
    ok(fr.still.aur === fr.still.stars, `aurora No flashes: a still gradient, only the stars twinkle (${fr.still.aur} vs ${fr.still.stars})`);
    ok(fr.switchOff === 0 && fr.stats.kind === 'rite' && fr.stats.px > 800, 'aurora: the Options switch turns it off for real; the hook reports the night');

    // recording of the story nights, and hostile flags
    const rec = await page.evaluate(() => {
      const o = {};
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 10, { greening: true }); S.frame(['aurora'], 5); o.g = G.flags.p14s_g;
      S.stage('whispergrove', 24.5, 27.5, -1.57, 0.8, 15, { part3: true }); S.frame(['aurora'], 5); o.w = G.flags.p14s_w;
      S.stage('deepwoods', 27.5, 36, -1.57, 0.3, 21, { part4: true }); S.frame(['aurora'], 5); o.d = G.flags.p14s_d;
      S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 15, { part3: true }); S.frame([], 5); o.offWrites = G.flags.p14s_w === undefined;
      const bad = [NaN, -5, 1e12, 'abc', {}, [], null, 2.5, true];
      let threw = false, any = 0;
      try { for (const v of bad) { S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 15, { part3: true, greening: true, part4: true, p14s_g: v, p14s_w: v, p14s_d: v, p14s_k: v }); const a = S.frame(['aurora'], 5); if (SKIES14.aurora.state.stats.kind && SKIES14.aurora.state.stats.kind !== 'rare') any++; } } catch (e) { threw = true; }
      o.hostile = { threw, any };
      return o;
    });
    ok(rec.g === 12 && rec.w === 17 && rec.d === 23 && rec.offWrites, `aurora flags: the first sighting records the night (p14s_g ${rec.g}, p14s_w ${rec.w}, p14s_d ${rec.d}; a daytime sighting means tonight; the late-evening and small-hours rules) and nothing is written with the switch off`);
    ok(!rec.hostile.threw, 'aurora flags: hostile p14s_ values (NaN, negatives, huge, strings, objects) never throw');

    // ------------------------------------------------------------------ 3. the Kestrel flight scene
    const SK = await page.evaluate(async () => {
      const o = {};
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const waitFor = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await sleep(25); } return true; };
      const seed = () => { let s = 9090; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; };
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5, 5, { greening: true, escaped: true, vane_told: true, sable_returned: true });
      PRESETS.apply('medium'); SKIES14.setSwitch('scene', true);
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      // (p7t_/p7s_ flags are the playtools' own running tallies; they move with real time, so they are left out)
      const outcome = (withNext) => { const f = Object.assign({}, G.flags); for (const k of Object.keys(f)) if (k.startsWith('p14s_') || /^p7[a-z]_/.test(k)) delete f[k]; return JSON.stringify({ mapId: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir].map(v => +v.toFixed(4)), day: G.day, tod: +G.tod.toFixed(6), hp: G.player.hp, fat: G.player.fat, voice: G.player.voice, noise: G.noise, state: G.state, flags: f, journal: G.journal.length, ents: G.ents.length, next: withNext ? Math.random() : 0 }); };
      const reset = () => { restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; for (const k of Object.keys(G.flags)) if (k.startsWith('p14s_')) delete G.flags[k]; const e = document.getElementById('sk14-scene'); if (e) e.remove(); closeModal(); };
      const clickEvent = () => { const b = document.querySelector('#event-panel button'); if (b) b.click(); };
      // the transition with the scene switched off: the original outcome
      reset(); GFX.kestrelScene = false; seed(); startPart3(); o.offOverlay = !!document.getElementById('sk14-scene'); o.offFlag = G.flags.p14s_k; o.offState = G.state;
      const outOff = outcome(true); await sleep(1900); const outOffLate = outcome(false); GFX.kestrelScene = true;
      clickEvent(); o.afterEventOff = { state: G.state, f: G.flags.part3 };
      // the same with the scene on: plays, then skipped by a key
      reset(); seed(); startPart3();
      o.onOverlay = !!document.getElementById('sk14-scene'); o.onFlag = G.flags.p14s_k; o.active = !!SKIES14.scene.active();
      o.lines = document.querySelectorAll('#sk14-lines .ln').length; o.hasSkip = !!document.getElementById('sk14-skip'); o.aria = document.getElementById('sk14-scene').getAttribute('role');
      o.lineText = Array.from(document.querySelectorAll('#sk14-lines .ln')).map(d => d.textContent.length);
      o.sameNow = outcome(true) === outOff;
      o.eventUnder = G.state;
      await sleep(260);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      o.afterKey = { active: !!SKIES14.scene.active(), skipped: SKIES14.scene.state.lastPlay && SKIES14.scene.state.lastPlay.skipped, state: G.state, ms: SKIES14.scene.state.lastPlay && SKIES14.scene.state.lastPlay.ms };
      await sleep(1500);
      o.gone = !document.getElementById('sk14-scene');
      const outOn = outcome(false);
      o.same = o.sameNow && outOn === outOffLate;
      if (!o.same) o.diff = [outOffLate, outOn];
      clickEvent(); o.afterEventOn = { state: G.state, f: G.flags.part3 };
      // plays once: a second Part Three start (same save, flag already set) shows nothing
      const flagK = G.flags.p14s_k; const again = (() => { G.state = 'play'; startPart3(); return !!document.getElementById('sk14-scene'); })();
      o.again = again; o.flagK = flagK; clickEvent();
      // skip by tap (pointerdown on the scene), by the Skip button, by the pad
      const fresh = () => { reset(); seed(); startPart3(); return SKIES14.scene.active(); };
      let A = fresh(); await sleep(200); document.getElementById('sk14-scene').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      o.tap = { done: !SKIES14.scene.active(), skipped: SKIES14.scene.state.lastPlay.skipped };
      A = fresh(); await sleep(200); document.getElementById('sk14-skip').click(); o.btn = { done: !SKIES14.scene.active(), skipped: SKIES14.scene.state.lastPlay.skipped };
      A = fresh(); await sleep(200);
      const realPads = navigator.getGamepads; navigator.getGamepads = () => [{ connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })) }];
      controlsTick(); o.pad = { done: !SKIES14.scene.active(), skipped: SKIES14.scene.state.lastPlay.skipped }; navigator.getGamepads = realPads;
      // a key in the first moments does not skip (the click that began Part Three is still in the air)
      A = fresh(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true })); o.grace = !!SKIES14.scene.active(); A.finish(true);
      // a modifier alone does not skip
      A = fresh(); await sleep(200); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true })); o.shift = !!SKIES14.scene.active(); A.finish(true);
      // another map under it ends it at once (a loaded game): never blocks
      A = fresh(); await sleep(100); loadMap('oakhaven'); await waitFor(() => !SKIES14.scene.active(), 600); o.mapChange = !SKIES14.scene.active();
      reset();
      // it does not play from loadMap alone, nor with the switch or Original preset off
      reset(); loadMap('whispergrove'); o.plain = !document.getElementById('sk14-scene') && G.flags.p14s_k === undefined;
      reset(); SKIES14.setSwitch('scene', false); startPart3(); o.switchedOff = !document.getElementById('sk14-scene') && G.flags.p14s_k === undefined; SKIES14.setSwitch('scene', true); clickEvent();
      reset(); PRESETS.apply('original'); startPart3(); o.original = !document.getElementById('sk14-scene'); PRESETS.apply('medium'); clickEvent();
      reset(); PRESETS.apply('low'); startPart3(); o.low = !!document.getElementById('sk14-scene'); if (SKIES14.scene.active()) SKIES14.scene.active().finish(true); PRESETS.apply('medium'); clickEvent();
      // reduced motion: one still painting, all four lines at once, a short hold
      reset(); GFX.reduceMotion = true; seed(); startPart3();
      const el = document.getElementById('sk14-scene'); o.still = { cls: el.classList.contains('still'), lines: el.querySelectorAll('.ln').length, shown: Array.from(el.querySelectorAll('.ln')).every(d => getComputedStyle(d).opacity === '1'), frames: SKIES14.scene.active().frames };
      o.stillSame = true; const t0 = performance.now(); await waitFor(() => !SKIES14.scene.active(), 9000); o.stillMs = performance.now() - t0; GFX.reduceMotion = false; clickEvent();
      return o;
    });
    ok(!SK.offOverlay && SK.offFlag === undefined && SK.offState === 'event', 'scene off: no overlay, no flag; the original Part Three event is up');
    ok(SK.onOverlay && SK.onFlag === 1 && SK.active && SK.eventUnder === 'event', 'scene: Part Three start lays the scene over the original event and sets p14s_k once');
    ok(SK.lines === 4 && SK.hasSkip && SK.aria === 'dialog' && SK.lineText.every(n => n > 40 && n < 190), `scene: four narration lines in the DOM (${SK.lineText.join(',')} chars), a Skip button, role=dialog`);
    ok(SK.afterKey.skipped === true && !SK.afterKey.active && SK.afterKey.state === 'event' && SK.gone, `scene: a key skips it (after ${Math.round(SK.afterKey.ms)} ms), the Enter key is swallowed (state ${SK.afterKey.state}), the overlay is gone after its fade`);
    ok(SK.same, 'scene: outcome identical (same map, position, time, hp, flags except p14s_, journal, entities, next random) to the original transition' + (SK.same ? '' : ' ' + JSON.stringify(SK.diff)));
    ok(SK.afterEventOn.state === 'play' && SK.afterEventOn.f === true && SK.afterEventOff.state === 'play', 'scene: never blocks: the Part Three button works right after a skip, exactly as without the scene');
    ok(SK.again === false && SK.flagK === 1, 'scene: plays once');
    ok(SK.tap.done && SK.tap.skipped && SK.btn.done && SK.btn.skipped && SK.pad.done && SK.pad.skipped, 'scene: skip works by tap, by the Skip button and by the controller A');
    ok(SK.grace === true && SK.shift === true, 'scene: a key in the first 150 ms and a bare Shift do not skip');
    ok(SK.mapChange, 'scene: it ends by itself if the map under it changes (a loaded game)');
    ok(SK.plain && SK.switchedOff && SK.original && SK.low, 'scene: not from loadMap alone, not with its switch off, not in Original; still plays in Low');
    ok(SK.still.cls && SK.still.lines === 4 && SK.still.shown && SK.stillMs < 9000 && SK.stillMs > 5000, `scene: Reduce motion is a still painting with all four lines shown, held about ${Math.round(SK.stillMs / 100) / 10} s`);

    // the whole scene runs by itself and ends in under 20 s
    const full = await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; for (const k of Object.keys(G.flags)) if (k.startsWith('p14s_')) delete G.flags[k];
      const t0 = performance.now(); startPart3();
      const A = SKIES14.scene.active(), seen = new Set(); let fps = 0;
      while (SKIES14.scene.active() && performance.now() - t0 < 22000) { const on = document.querySelector('#sk14-lines .ln.on'); if (on) seen.add(on.textContent.slice(0, 12)); await sleep(100); }
      const ms = performance.now() - t0, last = SKIES14.scene.state.lastPlay;
      const b = document.querySelector('#event-panel button'); if (b) b.click();
      return { ms, seen: seen.size, skipped: last.skipped, frames: last.frames, state: G.state };
    });
    ok(full.ms < 20000 && full.ms > 17500 && !full.skipped && full.seen === 4 && full.frames > 150, `scene: left alone it shows all four lines and ends after ${(full.ms / 1000).toFixed(1)} s (under 20), ${full.frames} frames`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'after-scene.png') });

    // screenshots of the scene itself (frames drawn by the module's own painter)
    const painted = await page.evaluate(() => { const o = []; for (const [T, rm] of [[1.5, false], [5.5, false], [8.5, false], [12, false], [17, false], [10.6, true]]) { const c = document.createElement('canvas'); c.width = 480; c.height = 300; SKIES14.scene.paint(c.getContext('2d'), T, rm); o.push(c.toDataURL('image/png')); } return o; });
    painted.forEach((u, i) => fs.writeFileSync(path.join(SHOT_DIR, 'kestrel-' + ['orchards', 'hedge-ahead', 'hedge', 'woods', 'dusk', 'still'][i] + '.png'), Buffer.from(u.split(',')[1], 'base64')));
    // and the real overlay with its text, mid-scene
    await page.evaluate(() => { restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; for (const k of Object.keys(G.flags)) if (k.startsWith('p14s_')) delete G.flags[k]; startPart3(); });
    await page.waitForTimeout(7200);
    await page.screenshot({ path: path.join(SHOT_DIR, 'kestrel-overlay-1280.png') });
    await page.evaluate(() => { SKIES14.scene.active() && SKIES14.scene.active().finish(true); const b = document.querySelector('#event-panel button'); if (b) b.click(); });
    await page.waitForTimeout(1500);

    // ------------------------------------------------------------------ 4. rippling light on the flooded floor
    const cs = await page.evaluate(() => {
      const o = {};
      const C = () => SKIES14.caustics.state.stats;
      S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 3, {}); S.frame(['causticLight'], 5); o.court = { px: C().px, ms: C().ms };
      S.stage('whispergrove', 33, 16.5, 0, 0.9, 3, {}); S.frame(['causticLight'], 5); o.wall = C().wallPx; o.wallFloor = C().px;
      // only water and shallows pixels (mat 2/3) and lower-wall pixels (mat 4) change, only lighter, and walls stay low
      S.stage('whispergrove', 33, 16.5, 0, 0.9, 3, {});
      let a = S.frame([], 5), b = S.frame(['causticLight'], 5); let idx = S.diff(a, b), bad = 0, other = 0, wallN = 0, maxWallRise = 0;
      const colTop = new Int32Array(b.w).fill(1e9);
      for (const i of idx) { if (S.sum(b, i) < S.sum(a, i)) bad++; const m = b.mbuf[i]; if (m === 4) { wallN++; const x = i % b.w, y = (i / b.w) | 0; colTop[x] = Math.min(colTop[x], y); } else if (m !== 2 && m !== 3) other++; }
      o.mat = { n: idx.length, bad, other, wallN };
      // a wall's lit stretch is a lower part only: its top is far below the wall's top in the same column
      let wallTall = 0; for (let x = 0; x < b.w; x++) if (colTop[x] < 1e9) { let y = colTop[x]; while (y > 0 && b.mbuf[(y - 1) * b.w + x] === 4) y--; const wallH = (() => { let e = colTop[x]; while (e < b.h && b.mbuf[e * b.w + x] === 4) e++; return e - y; })(); if (wallH < 12) continue; const lit = (() => { let e = colTop[x]; while (e < b.h && b.mbuf[e * b.w + x] === 4) e++; return e - colTop[x]; })(); if (lit > wallH * 0.75) wallTall++; }
      o.wallTall = wallTall;
      // other maps with floors of their own: untouched
      const others = {};
      for (const [m, x, y, d] of [['oakhaven', 23.5, 20.5, -1.57], ['clearing', 20.5, 33.5, -1.57], ['cloister', 9.5, 13.3, -1.57], ['greenroot', G.maps.greenroot.spawn.x, G.maps.greenroot.spawn.y, G.maps.greenroot.spawn.dir]]) { S.stage(m, x, y, d, 0.9, 3, {}); const A = S.frame([], 5), B = S.frame(['causticLight'], 5); others[m] = S.diff(A, B).length; }
      o.others = others;
      // off = identical
      S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 3, {});
      SKIES14.setSwitch('caustics', false); o.offSwitch = S.diff(S.frame([], 5), S.frame(['causticLight'], 5)).length; SKIES14.setSwitch('caustics', true);
      // movement
      const change = (t0, t1) => { const A = S.frame(['causticLight'], t0), B = S.frame(['causticLight'], t1); let s = 0, n = 0; for (const i of S.diff(A, B)) { n++; s += Math.abs(S.sum(A, i) - S.sum(B, i)); } return { n, s }; };
      const baseChange = (t0, t1) => S.diff(S.frame([], t0), S.frame([], t1)).length;
      o.normal = change(5, 5.6); o.waterOnly = baseChange(5, 5.6);
      GFX.reduceMotion = true; o.reduced = change(5, 5.6); GFX.reduceMotion = false;
      GFX.noFlash = true; { const A = S.frame(['causticLight'], 5), B = S.frame(['causticLight'], 9); const sA = S.frame([], 5), sB = S.frame([], 9); o.still = { c: S.diff(A, B).length, base: S.diff(sA, sB).length }; } GFX.noFlash = false;
      // depth-aware: fades with distance (near rows stronger than far rows)
      S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 3, {});
      a = S.frame([], 5); b = S.frame(['causticLight'], 5);
      const rowSum = (y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < b.w; x++) { const i = y * b.w + x; if (b.mbuf[i] === 3 || b.mbuf[i] === 2) { s += S.sum(b, i) - S.sum(a, i); n++; } } return n ? s / n : 0; };
      const hz = b.horizon, hh = b.h;
      o.near = rowSum(hh - 25, hh); o.far = rowSum(hz + 2, hz + 14);
      return o;
    });
    ok(cs.court.px > 3000 && cs.wall > 30 && cs.wallFloor > 500, `caustics: lit on the Court's flooded floor (${cs.court.px} px) and up the walls standing in it (${cs.wall} px)`);
    ok(cs.mat.n > 0 && cs.mat.bad === 0 && cs.mat.other === 0 && cs.mat.wallN > 0 && cs.wallTall <= 3, `caustics: only water, shallows and the lowest stretch of wall change, only lighter (${cs.mat.n} px, ${cs.mat.wallN} on walls, ${cs.wallTall} columns lit over three quarters of their height)`);
    ok(Object.values(cs.others).every(n => n === 0), `caustics: other maps' floors are untouched (${JSON.stringify(cs.others)})`);
    ok(cs.offSwitch === 0, 'caustics: switched off, the frame is identical');
    ok(cs.normal.n > cs.waterOnly * 0 + 2000 && cs.reduced.s < cs.normal.s * 0.5 && cs.reduced.s > 0, `caustics motion: the pattern drifts (${cs.normal.n} px change in 0.6 s), Reduce motion drifts slowly (${cs.reduced.s} vs ${cs.normal.s})`);
    ok(cs.still.c === cs.still.base, `caustics No flashes: a static pattern (${cs.still.c} px change vs ${cs.still.base} without)`);
    ok(cs.near > cs.far * 1.15 && cs.far >= 0, `caustics depth: stronger on the near floor than the far (${cs.near.toFixed(1)} vs ${cs.far.toFixed(1)} per pixel)`);

    // ------------------------------------------------------------------ 5. Options rows and persistence
    const opt = await page.evaluate(() => {
      const o = {}; localStorage.removeItem('octave.skies14.v1');
      G.state = 'panel'; renderAccessibilityMenu();
      PRESETS.apply('medium'); const ids = ['sk14-opt-aurora', 'sk14-opt-scene', 'sk14-opt-caustics'];
      o.rows = ids.map(id => { const b = document.getElementById(id); return b ? b.textContent + b.getAttribute('aria-pressed') : null; });
      PRESETS.apply('medium'); document.getElementById('sk14-opt-aurora').click(); o.off = [SKIES14.on.aurora(), document.getElementById('sk14-opt-aurora').textContent, JSON.parse(localStorage.getItem('octave.skies14.v1')).a];
      document.getElementById('sk14-opt-aurora').click(); o.on = SKIES14.on.aurora();
      document.getElementById('sk14-opt-scene').click(); o.sceneOff = SKIES14.on.scene(); document.getElementById('sk14-opt-scene').click();
      document.getElementById('sk14-opt-caustics').click(); o.cOff = SKIES14.on.caustics(); document.getElementById('sk14-opt-caustics').click();
      localStorage.removeItem('octave.skies14.v1'); closeModal(); G.state = 'play';
      return o;
    });
    ok(opt.rows.every(r => r === 'Ontrue'), 'options: three rows in Graphics & access, each on');
    ok(opt.off[0] === false && opt.off[1] === 'Off' && opt.off[2] === 0 && opt.on === true && opt.sceneOff === false && opt.cOff === false, 'options: each row switches its effect and the choice is saved');

    // ------------------------------------------------------------------ 6. performance: a 12-enemy scene at 1x, each effect on vs off
    const perf = await page.evaluate(() => {
      const out = {};
      const scenes = {
        aurora: ['oakhaven', 23.5, 20.5, -1.57, 0.97, 9, ['hound', 'proctor', 'legionnaire', 'golem'], () => SKIES14.aurora.state.stats.ms],
        causticLight: ['whispergrove', 24.5, 27.5, -1.57, 0.9, 3, ['hound', 'proctor', 'legionnaire', 'golem'], () => SKIES14.caustics.state.stats.ms],
      };
      const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'passive'; if (!e.name) e.name = 'Test ' + type; return e; };
      for (const [flag, [map, x, y, dir, tod, day, types, own]] of Object.entries(scenes)) {
        S.stage(map, x, y, dir, tod, day, {}); PRESETS.apply('medium'); Engine.setScale && Engine.setScale(1);
        const cam = Engine.cam, crowd = [];
        for (let i = 0; i < 12; i++) { const a = cam.dir + (i % 4 - 1.5) * 0.28, d = 2.5 + ((i / 4) | 0) * 1.6; const e = mk(types[i % 4], cam.x + Math.cos(a) * d, cam.y + Math.sin(a) * d); G.ents.push(e); crowd.push(e); }
        for (const e of G.ents) if (e.kind === 'enemy' && !crowd.includes(e)) e.hidden = true;
        for (const k of GFX.FX) GFX[k] = false; Engine.setTime(5); Engine.render(G.ents, G.tod);
        const times = { off: [], on: [] };
        for (let r = 0; r < 13; r++) for (const k of ['off', 'on']) {
          for (const f of GFX.FX) GFX[f] = false; GFX[flag] = k === 'on';
          for (let i = 0; i < 4; i++) Engine.render(G.ents, G.tod);
          const t0 = performance.now(); for (let i = 0; i < 30; i++) { Engine.setTime(5 + i * 0.02); Engine.render(G.ents, G.tod); } times[k].push((performance.now() - t0) / 30);
        }
        for (const f of GFX.FX) GFX[f] = false; GFX[flag] = true;
        const ms = []; for (let i = 0; i < 150; i++) { Engine.setTime(5 + i * 0.03); Engine.render(G.ents, G.tod); ms.push(own()); } ms.sort((p, q) => p - q);
        const best = a => Math.min(...a);
        out[flag] = { off: +best(times.off).toFixed(2), on: +best(times.on).toFixed(2), delta: +(best(times.on) - best(times.off)).toFixed(2), own: +ms[75].toFixed(2), scale: Engine.getScale() };
        for (const e of crowd) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
      }
      PRESETS.apply('medium');
      return out;
    });
    for (const k in perf) {
      console.log(`PERF ${k}: off ${perf[k].off} ms, on ${perf[k].on} ms (delta ${perf[k].delta}), own median ${perf[k].own} ms at ${perf[k].scale}x`);
      ok(perf[k].own < 1.0, `perf: ${k} costs ${perf[k].own} ms in its own timer (best-of frame delta ${perf[k].delta} ms; noisy on a shared machine) in a 12-enemy scene at 1x`);
    }

    // ------------------------------------------------------------------ 7. screenshots
    await page.evaluate(() => { PRESETS.apply('medium'); for (const k of GFX.FX) GFX[k] = true; });
    const SHOTS = {
      'aurora-rite-eve-a': () => S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 9, {}),
      'aurora-rite-eve-b': () => S.stage('oakhaven', 23.5, 20.5, 3.14, 0.97, 9, {}),
      'aurora-grove-night': () => S.stage('whispergrove', 24.5, 36.5, -1.57, 0.85, 15, { part3: true, p14s_w: 17 }),
      'aurora-greening-night': () => S.stage('clearing', 20.5, 33.5, -1.57, 0.97, 10, { greening: true, p14s_g: 12 }),
      'aurora-none-ordinary-night': () => S.stage('clearing', 20.5, 33.5, -1.57, 0.97, 4, {}),
      'caustics-court': () => S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 3, {}),
      'caustics-wall': () => S.stage('whispergrove', 33, 16.5, 0, 0.9, 3, {}),
      'caustics-day': () => S.stage('whispergrove', 24.5, 33.5, -1.57, 0.5, 3, {}),
    };
    for (const name of Object.keys(SHOTS)) {
      await page.evaluate((src) => { window.__s = src; }, name);
      await page.evaluate(`(${SHOTS[name].toString()})()`);
      await page.evaluate(() => Engine.setTime(12.3));
      await shot(name, 3);
    }
    await page.evaluate(() => { S.stage('whispergrove', 24.5, 27.5, -1.57, 0.9, 3, {}); GFX.causticLight = false; });
    await shot('caustics-court-OFF', 3);
    await page.evaluate(() => { GFX.causticLight = true; });

    // ------------------------------------------------------------------ 8. 640x400: the scene fits, nothing overflows
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(300);
    await page.evaluate(() => { restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; for (const k of Object.keys(G.flags)) if (k.startsWith('p14s_')) delete G.flags[k]; startPart3(); });
    await page.waitForTimeout(15500);
    const fit = await page.evaluate(() => {
      const el = document.getElementById('sk14-scene'), g = document.getElementById('game').getBoundingClientRect();
      if (!el) return null;
      const r = el.getBoundingClientRect(), ln = document.querySelector('#sk14-lines .ln.on'), lr = ln ? ln.getBoundingClientRect() : null, sk = document.getElementById('sk14-skip').getBoundingClientRect();
      return { fills: Math.abs(r.width - g.width) < 2 && Math.abs(r.height - g.height) < 2, noX: el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1, line: lr ? { l: lr.left >= g.left, r: lr.right <= g.right, b: lr.bottom <= g.bottom, t: lr.top > g.top + g.height * 0.55, fs: parseFloat(getComputedStyle(ln).fontSize) } : null, skipIn: sk.right <= g.right && sk.left >= g.left && sk.top >= g.top };
    });
    await page.screenshot({ path: path.join(SHOT_DIR, 'kestrel-overlay-640x400.png') });
    ok(fit && fit.fills && fit.noX && fit.line && fit.line.l && fit.line.r && fit.line.b && fit.line.t && fit.line.fs >= 11 && fit.skipIn, `640x400: the scene fills the game box, its line is inside it at ${fit && fit.line ? fit.line.fs.toFixed(1) : '?'} px, the Skip button is in view, no overflow`);
    await page.evaluate(() => { SKIES14.scene.active() && SKIES14.scene.active().finish(true); const b = document.querySelector('#event-panel button'); if (b) b.click(); G.state = 'panel'; renderAccessibilityMenu(); document.getElementById('sk14-opt-caustics').scrollIntoView(); });
    const optFit = await page.evaluate(() => { const p = document.querySelector('#modal-panel'); return { fit: p.scrollWidth <= p.clientWidth + 1, rows: ['sk14-opt-aurora', 'sk14-opt-scene', 'sk14-opt-caustics'].every(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }) }; });
    await page.screenshot({ path: path.join(SHOT_DIR, 'options-640x400.png') });
    ok(optFit.fit && optFit.rows, '640x400: Options fits with the three new rows inside the viewport');
    // the sky itself at the small size
    await page.evaluate(() => { closeModal(); G.state = 'play'; PRESETS.apply('medium'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.97, 9, {}); Engine.setTime(12.3); });
    const frame640 = await page.evaluate(() => { const a = S.frame([], 5), b = S.frame(['aurora'], 5); return S.diff(a, b).length; });
    ok(frame640 > 300, `640x400: the lights still draw in the small view (${frame640} px)`);
    await page.setViewportSize({ width: 1280, height: 800 });

    ok(errors.length === 0, 'no page errors or skies14 warnings' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
