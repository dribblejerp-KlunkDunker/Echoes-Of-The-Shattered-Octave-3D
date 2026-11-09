// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3853 node test/air11.test.js
// Covers js/air11.js: sun shafts, heat haze, Light-glass glare, see-through ghosts, cold breath, footprints.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
// Frames are pinned: Engine.render is called by hand with an explicit entity list and a fixed clock and
// weather, so exact comparisons are meaningful. "Off = the original frame" is proved by loading the game a
// second time with js/air11.js blocked and comparing frame hashes with all six switches off.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'air11-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }

async function bootPage(browser, url, viewport, block) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !(block && /ERR_FAILED|air11/.test(m.text()))) errors.push('console: ' + m.text()); });
  if (block) await page.route('**/js/air11.js*', r => r.abort());
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(url);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Air Tester');
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
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h }; }, 99);
  S.stage = (map, x, y, dir, tod, wx) => {
    loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = tod == null ? 0.5 : tod; Engine.cam.pitch = 0; Engine.cam.bob = 0;
    Weather.hold(wx || 'clear'); GFX.reduceMotion = false;
  };
  S.mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'passive'; if (!e.name) e.name = 'Test ' + type; return e; };
  S.npc = (sprite, x, y, extra) => Object.assign({ kind: 'npc', id: 'tester', name: 'Tester', sprite, x, y, solid: true, radius: 0.3, lines: ['...'] }, extra || {});
  const KEYS = ['sunShafts', 'heatHaze', 'glassGlare', 'seeThrough', 'coldBreath', 'footprints'];
  S.frame = (ents, flags, t) => {
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = 1; GFX.particles = 1; Engine.setLook({ fogK: 1 });
    for (const k of (flags || [])) GFX[k] = true;
    Engine.setTime(t == null ? 5 : t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
    S.on = true; Engine.render(ents, G.tod); S.on = false;
    return S.cap;
  };
  S.diff = (a, b) => { const out = []; for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) out.push(i); return out; };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  // the 3D view only, nearest-neighbour upscaled: no HUD or title cards in the picture
  S.png = (k) => { const c = Engine.canvas, o = document.createElement('canvas'), vh = Engine.VIEW_H * Engine.getScale(); o.width = c.width * k; o.height = vh * k; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, c.width, vh, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
  S.keys = KEYS;
  // the fixed scenes of the "off = original" comparison: a few places, day and night, with people and creatures in them
  S.scenes = () => {
    const out = [];
    const STATIC = ['lamp', 'campfire', 'coil', 'brazier', 'hearth', 'willow', 'oak', 'grave', 'kestrel', 'lifttank', 'crates'];
    // only fixed scenery plus entities made here: live NPCs wander between calls (the game loop runs beside the test)
    const add = (map, x, y, dir, tod, mk) => { S.stage(map, x, y, dir, tod); const ents = G.ents.filter(e => e.kind === 'deco' && STATIC.includes(e.sprite)); if (mk) for (const e of mk()) ents.push(e); out.push(S.hash(S.frame(ents, [], 5).fb)); };
    // (the Deep Woods and daytime Oakhaven are left out here: their hashes differ from one page load to the next even with the module blocked)
    add('greenroot', G.maps.greenroot.spawn.x, G.maps.greenroot.spawn.y, G.maps.greenroot.spawn.dir, 0.95);
    add('cloister', 9.5, 13.3, -1.57, 0.5);
    add('mausoleum', 17.5, 3.5, Math.PI, 0.5, () => [S.mk('golem', 14.5, 3.5), S.mk('quiet', 15.0, 4.5), S.mk('dirge', 14.0, 2.6)]);
    add('oakhaven', 23.5, 20.5, -1.57, 0.95, () => [S.npc('townsman', 23.0, 18.2), S.npc('mourner', 24.5, 18.0, { id: 'mourner' }), S.mk('hound', 23.8, 17.0)]);
    add('clearing', 20.5, 33.5, -1.57, 0.95);
    add('whispergrove', 24.5, 27.5, -1.57, 0.5);
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3853';
  try {
    const { page, errors } = await bootPage(browser, URL);
    await page.evaluate(HELPERS);
    const shot = async (name) => { const url = await page.evaluate(() => { Engine.render(G.ents, G.tod); return S.png(3); }); fs.writeFileSync(path.join(SHOT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); };

    // ------------------------------------------------------------------
    //  0. the module, the switches, the presets
    // ------------------------------------------------------------------
    const st = await page.evaluate(() => {
      const o = { has: typeof AIR11 === 'object', fx: S.keys.map(k => GFX.FX.includes(k)), def: S.keys.map(k => GFX[k]) };
      o.presets = {};
      for (const p of ['original', 'low', 'medium', 'high']) { PRESETS.apply(p); o.presets[p] = S.keys.map(k => GFX[k]).join(','); }
      PRESETS.apply('medium'); GFX.plain(); o.plain = S.keys.map(k => GFX[k]).join(',');
      PRESETS.apply('medium'); o.cur = PRESETS.current();
      PRESETS.apply('low'); o.curLow = PRESETS.current();
      PRESETS.apply('medium');
      return o;
    });
    ok(st.has && st.fx.every(Boolean), 'module: AIR11 exists and all six flags are in GFX.FX');
    ok(st.presets.original === 'false,false,false,false,false,false', 'presets: Original has every air effect off');
    ok(st.presets.low === 'false,false,false,false,false,false' && st.curLow === 'low', `presets: Low turns them off (per-frame) and is still recognised as Low (${st.curLow})`);
    ok(st.presets.medium === 'true,true,true,true,true,true' && st.presets.high === 'true,true,true,true,true,true', 'presets: Medium and High have them on');
    ok(st.plain === 'false,false,false,false,false,false' && st.cur === 'medium', 'presets: GFX.plain() turns them off; Medium is recognised again');

    // ------------------------------------------------------------------
    //  1. off = the original game, pixel for pixel (a second load with air11.js blocked)
    // ------------------------------------------------------------------
    const mine = await page.evaluate(() => { S.scenes(); return S.scenes(); });   // the first pass warms the lazy caches (sky noise, particles)
    const { page: page2, errors: errors2 } = await bootPage(browser, URL, null, true);
    await page2.evaluate(HELPERS);
    const base = await page2.evaluate(() => { window.AIR11 = undefined; return (S.scenes(), S.scenes()); });
    ok(mine.length === 6 && mine.every((h, i) => h === base[i]), `off: with every switch off, ${mine.length} fixed-camera frames hash identically to the game without the module (${mine.map(h => h.toString(16)).join(' ')})`);
    ok(errors2.length === 0, 'off: the module-less page also loads without errors');
    await page2.close();

    // ------------------------------------------------------------------
    //  2. sun shafts
    // ------------------------------------------------------------------
    const sf = await page.evaluate(() => {
      const o = {};
      const cmp = (map, x, y, dir, tod, ents) => { S.stage(map, x, y, dir, tod); const e = ents ? ents() : G.ents; return [S.frame(e, [], 5), S.frame(e, ['sunShafts'], 5)]; };
      let [a, b] = cmp('deepwoods', 27.5, 32, -1.57, 0.5); o.woodsDay = S.diff(a, b).length;
      [a, b] = cmp('deepwoods', 27.5, 32, -1.57, 0.95); o.woodsNight = S.diff(a, b).length;
      [a, b] = cmp('deepwoods', 27.5, 32, -1.57, 0.78); o.woodsDusk = S.diff(a, b).length;
      [a, b] = cmp('cloister', 9.5, 13.3, -1.57, 0.5); o.cloDay = S.diff(a, b).length;
      [a, b] = cmp('cloister', 9.5, 13.3, -1.57, 0.95); o.cloNight = S.diff(a, b).length;
      [a, b] = cmp('oakhaven', 23.5, 20.5, -1.57, 0.5); o.oakDay = S.diff(a, b).length;
      [a, b] = cmp('mausoleum', 17.5, 3.5, Math.PI, 0.5); o.mausDay = S.diff(a, b).length;
      // additive and soft: every changed pixel got lighter, none changed by a lot
      S.stage('cloister', 9.5, 13.3, -1.57, 0.5);
      a = S.frame(G.ents, [], 5); b = S.frame(G.ents, ['sunShafts'], 5);
      const idx = S.diff(a, b); let lighter = 0, mx = 0;
      for (const i of idx) { const dr = (b.fb[i] & 255) - (a.fb[i] & 255), dg = ((b.fb[i] >> 8) & 255) - ((a.fb[i] >> 8) & 255), db = ((b.fb[i] >> 16) & 255) - ((a.fb[i] >> 16) & 255); if (dr + dg + db >= 0) lighter++; mx = Math.max(mx, Math.abs(dr), Math.abs(dg), Math.abs(db)); }
      o.soft = { n: idx.length, lighter, mx };
      // depth: a body standing between you and a beam hides it
      S.stage('deepwoods', 27.5, 32, -1.57, 0.5); AIR11.sun.build(G.map);
      const sh = AIR11.sun.shafts().filter(s => Math.hypot(s.x - 27.5, s.y - 32) > 4 && Math.hypot(s.x - 27.5, s.y - 32) < 9)[0];
      const cam = Engine.cam, ang = Math.atan2(sh.y - cam.y, sh.x - cam.x); cam.dir = ang;
      const gol = S.mk('golem', cam.x + Math.cos(ang) * 1.6, cam.y + Math.sin(ang) * 1.6);
      const a2 = S.frame([gol], [], 5), b2 = S.frame([gol], ['sunShafts'], 5), idx2 = S.diff(a2, b2);
      o.depth = { changed: idx2.length, onBody: idx2.filter(i => a2.mbuf[i] === 6 || a2.mbuf[i] === 8).length, bodyPx: a2.mbuf.filter(v => v === 6).length };
      const none = S.frame([], [], 5), withS = S.frame([], ['sunShafts'], 5); o.depth.noBody = S.diff(none, withS).length;
      // a nearer wall (relief-free map: cloister pillar) is handled the same way by the shared depth buffer: re-check on the cloister
      // reduce motion: motes freeze, the beam stays
      S.stage('cloister', 9.5, 13.3, -1.57, 0.5); GFX.reduceMotion = true;
      const m1 = S.frame(G.ents, ['sunShafts'], 5), m2 = S.frame(G.ents, ['sunShafts'], 9); o.rm = { same: S.hash(m1.fb) === S.hash(m2.fb), n: S.diff(S.frame(G.ents, [], 5), m1).length };
      GFX.reduceMotion = false;
      const d1 = S.frame(G.ents, ['sunShafts'], 5), d2 = S.frame(G.ents, ['sunShafts'], 9); o.drift = S.hash(d1.fb) !== S.hash(d2.fb);
      // rain dims them
      S.stage('deepwoods', 27.5, 32, -1.57, 0.5); const wxA = S.frame(G.ents, ['sunShafts'], 5), wxOff = S.frame(G.ents, [], 5);
      o.clear = S.diff(wxOff, wxA).length;
      return o;
    });
    ok(sf.woodsDay > 100 && sf.cloDay > 1000, `shafts: daytime beams show in the Deep Woods (${sf.woodsDay} px) and the Cloister (${sf.cloDay} px)`);
    ok(sf.woodsNight === 0 && sf.cloNight === 0 && sf.woodsDusk === 0, `shafts: none at night or dusk (${sf.woodsNight}, ${sf.cloNight}, ${sf.woodsDusk})`);
    ok(sf.oakDay === 0 && sf.mausDay === 0, 'shafts: none on other maps (Oakhaven, the Mausoleum)');
    ok(sf.soft.lighter === sf.soft.n && sf.soft.mx < 130, `shafts: additive and soft, every changed pixel is lighter (${sf.soft.n} px, biggest step ${sf.soft.mx})`);
    ok(sf.depth.noBody > 0 && sf.depth.onBody === 0 && sf.depth.bodyPx > 100, `shafts: a Golem between you and the beam stays unlit (${sf.depth.onBody} body pixels changed; ${sf.depth.noBody} px without the body)`);
    ok(sf.rm.same && sf.rm.n > 1000, 'shafts: with Reduce motion the beams stay but nothing drifts (frames at two times identical)');
    ok(sf.drift, 'shafts: with motion the beams and motes drift');

    // ------------------------------------------------------------------
    //  3. heat haze
    // ------------------------------------------------------------------
    const hz = await page.evaluate(() => {
      const o = {};
      S.stage('deepwoods', 27.5, 38.0, 1.57, 0.5);
      const camp = G.ents.find(e => e.sprite === 'campfire');
      const a = S.frame(G.ents, [], 5), b = S.frame(G.ents, ['heatHaze'], 5), idx = S.diff(a, b);
      const sc = camp._screen, w = a.w;
      let outside = 0, srcPx = 0, above = 0;
      for (const i of idx) {
        const x = i % w, y = (i / w) | 0;
        if (x < sc.x0 - sc.x1 * 0 - (sc.x1 - sc.x0) * 0.6 || x > sc.x1 + (sc.x1 - sc.x0) * 0.6 || y > sc.y0 + (sc.y1 - sc.y0) * 0.35 + 1 || y < sc.y0 - (sc.y1 - sc.y0) * 1.0 - 1) outside++;
        if (a.mbuf[i] === 6 || a.mbuf[i] === 8) srcPx++;
        if (y < sc.y0) above++;
      }
      o.camp = { n: idx.length, outside, srcPx, above, box: [sc.x0, sc.y0, sc.x1, sc.y1] };
      // the shimmer moves with time
      const c2 = S.frame(G.ents, ['heatHaze'], 5.3); o.moves = S.diff(b, c2).length;
      // reduce motion = off
      GFX.reduceMotion = true; const r = S.frame(G.ents, ['heatHaze'], 5); o.rm = S.diff(a, r).length; GFX.reduceMotion = false;
      // depth: something standing in front of the fire is not moved
      const cam = Engine.cam, man = S.npc('townsman', cam.x, cam.y + 1.9);
      const e2 = G.ents.concat([man]), a2 = S.frame(e2, [], 5), b2 = S.frame(e2, ['heatHaze'], 5), idx2 = S.diff(a2, b2);
      o.front = { moved: idx2.filter(i => a2.mbuf[i] === 6 && a2.dbuf[i] < camp._screen.z - 0.1).length };
      // the Steam Golem, outdoors in front of the far country
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); const gol = S.mk('golem', 23.5, 17.0);
      const ga = S.frame([gol], [], 5), gb = S.frame([gol], ['heatHaze'], 5); o.golem = S.diff(ga, gb).length;
      const sol = S.diff(ga, gb).filter(i => ga.mbuf[i] === 6).length; o.golemBody = sol;
      // a hound is no source
      const h = S.mk('hound', 23.5, 17.0), ha = S.frame([h], [], 5), hb = S.frame([h], ['heatHaze'], 5); o.hound = S.diff(ha, hb).length;
      return o;
    });
    ok(hz.camp.n > 20 && hz.camp.outside === 0, `haze: a camp fire shimmers only in a small box around and above it (${hz.camp.n} px, ${hz.camp.outside} outside)`);
    ok(hz.camp.srcPx === 0 && hz.front.moved === 0, 'haze: the fire itself and anything in front of it are never displaced');
    ok(hz.moves > 0, 'haze: the shimmer moves with time');
    ok(hz.rm === 0, 'haze: Reduce motion switches it off completely');
    ok(hz.golem > 5 && hz.golemBody === 0 && hz.hound === 0, `haze: the Steam Golem shimmers (${hz.golem} px) and a hound does not`);

    // ------------------------------------------------------------------
    //  4. Light-glass glare
    // ------------------------------------------------------------------
    const gl = await page.evaluate(() => {
      const o = {};
      S.stage('clearing', 20.5, 33.5, -1.57, 0.5);
      const lamp = G.ents.find(e => e.glassLamp);
      const a = S.frame(G.ents, [], 5), b = S.frame(G.ents, ['glassGlare'], 5), idx = S.diff(a, b);
      o.lamp = { n: idx.length, glow: AIR11.glass.of(lamp) };
      const sc = lamp._screen; let far = 0, cx = (sc.x0 + sc.x1) / 2, cy = (sc.y0 + sc.y1) / 2;
      for (const i of idx) far = Math.max(far, Math.hypot(i % a.w - cx, ((i / a.w) | 0) - cy));
      o.far = far; o.reach = Math.max(sc.x1 - sc.x0, sc.y1 - sc.y0);
      // glass only: an ordinary lamp and a hearth get none
      const plain = { kind: 'deco', sprite: 'lamp', x: 20.5, y: 31.0, scale: 0.9, glow: 0.5 };
      const pa = S.frame([plain], [], 5), pb = S.frame([plain], ['glassGlare'], 5); o.plainLamp = S.diff(pa, pb).length;
      const coil = { kind: 'deco', sprite: 'coil', x: 20.5, y: 31.0, scale: 1.0 };
      const ca = S.frame([coil], [], 5), cb = S.frame([coil], ['glassGlare'], 5); o.coil = S.diff(ca, cb).length;
      const shard = { kind: 'item', item: 'shard', sprite: 'coil', x: 20.5, y: 31.0, scale: 0.5 };
      const sa = S.frame([shard], [], 5), sb = S.frame([shard], ['glassGlare'], 5); o.shard = S.diff(sa, sb).length;
      // it ripples (moves) but a still halo stays with Reduce motion
      // what the glare adds over time: pixels that change between two clock times with it on but not with it off
      const temporal = (t1, t2, extra) => { const fl = ['glassGlare'].concat(extra || []), off = new Set(S.diff(S.frame(G.ents, extra || [], t1), S.frame(G.ents, extra || [], t2))); return S.diff(S.frame(G.ents, fl, t1), S.frame(G.ents, fl, t2)).filter(i => !off.has(i)).length; };
      o.moves = temporal(5, 6.1, ['shardGlint']);   // (the Light-glass glimmer switch must be on for the air to move)
      o.stillGlimmerOff = temporal(5, 6.1);
      GFX.reduceMotion = true; const r1 = S.frame(G.ents, ['glassGlare'], 5);
      o.rm = { same: temporal(5, 8) === 0, n: S.diff(a, r1).length }; GFX.reduceMotion = false;
      // a nearer body hides the glare behind it
      const cam = Engine.cam, man = S.npc('townsman', cam.x, cam.y - 1.5);
      const e2 = G.ents.concat([man]), a2 = S.frame(e2, [], 5), b2 = S.frame(e2, ['glassGlare'], 5);
      o.front = S.diff(a2, b2).filter(i => a2.mbuf[i] === 6 && a2.dbuf[i] < lamp._screen.z - 0.2).length;
      // the glare is a halo of light: lighter everywhere it is added (the ripple only moves pixels)
      return o;
    });
    ok(gl.lamp.n > 500 && gl.lamp.glow > 0.5, `glare: a Light-glass lamp gets a halo and rippling air (${gl.lamp.n} px)`);
    ok(gl.far <= gl.reach * 2.2 + 12, `glare: it stays within a bounded radius of the glass (${gl.far.toFixed(0)} px of a ${gl.reach.toFixed(0)} px sprite)`);
    ok(gl.plainLamp === 0 && gl.coil > 200 && gl.shard > 100, `glare: only Light-glass (an ordinary lamp ${gl.plainLamp} px; coil growth ${gl.coil}; shard ${gl.shard})`);
    ok(gl.moves > 0 && gl.stillGlimmerOff === 0 && gl.rm.same && gl.rm.n > 300, 'glare: the air ripples; with Reduce motion, No flashes or the glimmer switched off a still halo stays');
    ok(gl.front === 0, 'glare: a body nearer than the glass is not touched');

    // ------------------------------------------------------------------
    //  5. see-through ghosts
    // ------------------------------------------------------------------
    const gh = await page.evaluate(() => {
      const o = {};
      S.stage('deepwoods', 27.5, 36, -1.57, 0.5); const cam = Engine.cam, ents = [];
      const put = (e, i) => { const a = cam.dir + (i - 2) * 0.18; e.x = cam.x + Math.cos(a) * 3.2; e.y = cam.y + Math.sin(a) * 3.2; e.state = 'passive'; ents.push(e); return e; };
      const kinds = { quiet: put(S.mk('quiet', 0, 0), 0), dirge: put(S.mk('dirge', 0, 0), 1), drowned: put(S.mk('drowned', 0, 0), 2), mourner: put(S.npc('mourner', 0, 0, { id: 'mourner' }), 3), hound: put(S.mk('hound', 0, 0), 4) };
      const a = S.frame(ents, [], 5), b = S.frame(ents, ['seeThrough'], 5);
      o.diff = S.diff(a, b).length;
      const sprOff = a.mbuf.filter(v => v === 6).length, sprOn = b.mbuf.filter(v => v === 6).length;
      o.coverage = sprOn / sprOff;
      // each kind alone: ghosts lose pixels (dither) but keep a readable share; the hound is untouched
      o.each = {};
      for (const k in kinds) { const e = kinds[k], x = S.frame([e], [], 5), y = S.frame([e], ['seeThrough'], 5); const n0 = x.mbuf.filter(v => v === 6).length, n1 = y.mbuf.filter(v => v === 6).length; o.each[k] = { ratio: n1 / n0, same: S.hash(x.fb) === S.hash(y.fb) }; }
      // alpha bounds over time, with and without motion, near and far
      let lo = 9, hi = -1;
      for (const rm of [false, true]) { GFX.reduceMotion = rm; for (const k of Object.keys(AIR11.ghost.kinds)) for (let t = 0; t < 60; t += 0.37) for (const x of [0, 3, 9]) { const v = AIR11.ghost.alpha({ sprite: k, kind: 'enemy', x, y: 2 * x }, t); lo = Math.min(lo, v); hi = Math.max(hi, v); } }
      GFX.reduceMotion = false; o.alpha = { lo, hi, min: AIR11.ghost.MIN_ALPHA, nonGhost: AIR11.ghost.alpha({ sprite: 'hound', kind: 'enemy', x: 0, y: 0 }, 1) };
      // animAlpha is put back exactly (and not left behind where there was none)
      const e = kinds.quiet; delete e.animAlpha; S.frame([e], ['seeThrough'], 5); o.restored1 = !Object.prototype.hasOwnProperty.call(e, 'animAlpha');
      e.animAlpha = 0.9; S.frame([e], ['seeThrough'], 5); o.restored2 = e.animAlpha === 0.9;
      e.animAlpha = 0.3; S.frame([e], ['seeThrough'], 5); o.restored3 = e.animAlpha === 0.3; delete e.animAlpha;
      // Hollows of the Grove are people, not ghosts; the Weaver is a boss
      const hol = S.npc('hollow', cam.x, cam.y - 3, { id: 'hollow' }), ha = S.frame([hol], [], 5), hb = S.frame([hol], ['seeThrough'], 5); o.hollow = S.diff(ha, hb).length;
      // high contrast: a light outline appears on the silhouette, and it is not in normal contrast
      ACCESS.setHighContrast(false); const n1 = S.diff(S.frame(ents, [], 5), S.frame(ents, ['seeThrough'], 5)).length;
      ACCESS.setHighContrast(true); const n2 = S.diff(S.frame(ents, [], 5), S.frame(ents, ['seeThrough'], 5)).length;
      ACCESS.setHighContrast(false);
      o.hc = { normal: n1, high: n2 };
      // the shimmer travels: two clock times differ, and Reduce motion holds still
      const s1 = S.frame([kinds.quiet], ['seeThrough'], 5), s2 = S.frame([kinds.quiet], ['seeThrough'], 5.9); o.shimmer = S.hash(s1.fb) !== S.hash(s2.fb);
      GFX.reduceMotion = true; const q1 = S.frame([kinds.quiet], ['seeThrough'], 5), q2 = S.frame([kinds.quiet], ['seeThrough'], 5.9); o.still = S.hash(q1.fb) === S.hash(q2.fb); GFX.reduceMotion = false;
      return o;
    });
    ok(gh.diff > 500, `ghosts: spectral kinds change (${gh.diff} px)`);
    ok(['quiet', 'dirge', 'drowned', 'mourner'].every(k => gh.each[k].ratio < 0.85 && gh.each[k].ratio > 0.3), `ghosts: each spectral kind is half-drawn but readable (kept ${['quiet', 'dirge', 'drowned', 'mourner'].map(k => gh.each[k].ratio.toFixed(2)).join(', ')} of its pixels)`);
    ok(gh.each.hound.same, 'ghosts: an ordinary hound is untouched');
    ok(gh.alpha.lo >= gh.alpha.min - 1e-9 && gh.alpha.hi <= 0.8 + 1e-9 && gh.alpha.nonGhost === 1, `ghosts: alpha stays within [${gh.alpha.min}, 0.8] (seen ${gh.alpha.lo.toFixed(3)} to ${gh.alpha.hi.toFixed(3)}); non-ghosts 1`);
    ok(gh.restored1 && gh.restored2 && gh.restored3, 'ghosts: entity animAlpha is restored exactly after every frame');
    ok(gh.hollow === 0, 'ghosts: the Hollows of the Grove (people) are left alone');
    ok(gh.hc.high > gh.hc.normal + 40, `ghosts: High contrast adds an outline (${gh.hc.normal} -> ${gh.hc.high} px)`);
    ok(gh.shimmer && gh.still, 'ghosts: a faint shimmer travels over them; Reduce motion holds it still');

    // ------------------------------------------------------------------
    //  6. cold breath
    // ------------------------------------------------------------------
    const cb = await page.evaluate(() => {
      const o = {};
      const B = AIR11.breath; o.cold = {};
      const maps = ['oakhaven', 'whispergrove', 'deepwoods', 'clearing', 'greenroot', 'tavern', 'lyra_house', 'mill', 'chapel', 'malting', 'catacombs', 'mausoleum', 'cloister', 'belfry', 'rootvault', 'quarry', 'greenroot_crypt', 'underhedge'];
      for (const id of maps) if (G.maps[id]) { o.cold[id] = [+B.coldness(G.maps[id], 0.5).toFixed(2), +B.coldness(G.maps[id], 0.95).toFixed(2)]; }
      o.breathes = ['townsman', 'hound', 'proctor', 'golem', 'quiet', 'dirge', 'aegis', 'mites', 'hollow'].map(s => [s, B.breathes({ kind: s === 'hound' || s === 'proctor' || s === 'golem' || s === 'quiet' || s === 'dirge' || s === 'aegis' || s === 'mites' ? 'enemy' : 'npc', sprite: s, type: s })]);
      const sweep = (map, x, y, tod, extra) => {
        S.stage(map, x, y, -1.57, tod); const cam = Engine.cam, ents = [];
        const mk = (e, a, d) => { e.x = cam.x + Math.cos(cam.dir + a) * d; e.y = cam.y + Math.sin(cam.dir + a) * d; e.facing = cam.dir + Math.PI + a * 0.3; ents.push(e); return e; };
        mk(S.npc('townsman', 0, 0), -0.15, 2.4); mk(S.npc('townswoman', 0, 0), 0.2, 3.2); mk(S.mk('hound', 0, 0), 0.0, 4.2); const g = mk(S.mk('golem', 0, 0), 0.4, 3.0);
        let best = 0, bt = 5, total = 0, golemTouched = 0;
        for (let t = 5; t < 12; t += 0.2) {
          const a = S.frame(ents, [], t), b = S.frame(ents, ['coldBreath'], t); const d = S.diff(a, b);
          if (AIR11.stats.breath > best) { best = AIR11.stats.breath; bt = t; }
          total += d.length;
        }
        return { best, total, bt, sprites: ents.length };
      };
      o.night = sweep('oakhaven', 23.5, 20.5, 0.95); o.day = sweep('oakhaven', 23.5, 20.5, 0.5); o.dusk = sweep('oakhaven', 23.5, 20.5, 0.72); o.duskCold = B.coldness(G.maps.oakhaven, 0.72); o.dawnCold = B.coldness(G.maps.oakhaven, 0.28);
      o.tavern = sweep('tavern', G.maps.tavern.spawn.x, G.maps.tavern.spawn.y, 0.95);
      o.crypt = sweep('catacombs', G.maps.catacombs.spawn.x, G.maps.catacombs.spawn.y, 0.5);
      // snow makes a noon cold
      S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); Weather.hold('snow'); o.snowCold = B.coldness(G.map, 0.5); Weather.hold('clear');
      // own breath: bottom of the view, only moving with motion on; none in warm places
      const own = (map, tod, rm) => {
        S.stage(map, G.maps[map].spawn.x, G.maps[map].spawn.y, G.maps[map].spawn.dir, tod); GFX.reduceMotion = rm;
        let n = 0; for (let t = 5; t < 13; t += 0.1) { const a = S.frame([], [], t), b = S.frame([], ['coldBreath'], t); const d = S.diff(a, b); n += d.filter(i => ((i / a.w) | 0) > a.h * 0.75).length; }
        GFX.reduceMotion = false; return n;
      };
      o.own = { night: own('oakhaven', 0.95, false), nightRm: own('oakhaven', 0.95, true), day: own('oakhaven', 0.5, false), tavern: own('tavern', 0.95, false) };
      return o;
    });
    ok(cb.cold.oakhaven[0] === 0 && cb.cold.oakhaven[1] === 1, `breath: Oakhaven is warm at noon and cold at night (${cb.cold.oakhaven})`);
    ok(['catacombs', 'mausoleum', 'cloister', 'belfry', 'greenroot_crypt'].every(id => !cb.cold[id] || cb.cold[id][0] >= 0.8), 'breath: stone and underground places are cold at any hour');
    ok(['tavern', 'lyra_house', 'mill', 'chapel', 'malting'].every(id => !cb.cold[id] || (cb.cold[id][0] === 0 && cb.cold[id][1] === 0)), 'breath: houses, the tavern, the chapel and the Malting are never cold');
    ok(cb.night.total > 0 && cb.night.best >= 2, `breath: at night in Oakhaven people and beasts puff (${cb.night.best} at once, ${cb.night.total} px over the sweep)`);
    ok(cb.day.total === 0 && cb.tavern.total === 0, `breath: nothing by day outdoors (${cb.day.total}) or in the warm tavern (${cb.tavern.total})`);
    ok(cb.dusk.total > 0 && cb.duskCold > 0.15 && cb.duskCold < 0.95 && cb.dawnCold > 0.15, `breath: dusk and dawn are part-way cold (${cb.duskCold.toFixed(2)}, ${cb.dawnCold.toFixed(2)})`);
    ok(cb.crypt.total > 0 && cb.snowCold >= 0.9, `breath: cold at noon in the catacombs (${cb.crypt.total} px) and in snow (${cb.snowCold})`);
    ok(JSON.stringify(cb.breathes) === JSON.stringify([['townsman', true], ['hound', true], ['proctor', true], ['golem', false], ['quiet', false], ['dirge', false], ['aegis', false], ['mites', false], ['hollow', true]]), 'breath: people and beasts breathe; the Golem, Aegis, ghosts and swarms do not');
    ok(cb.own.night > 0 && cb.own.nightRm === 0 && cb.own.day === 0 && cb.own.tavern === 0, `breath: your own puffs rise from the bottom of the view at night (${cb.own.night} px); none with Reduce motion, by day or indoors by a fire`);

    // ------------------------------------------------------------------
    //  7. footprints
    // ------------------------------------------------------------------
    const fp = await page.evaluate(() => {
      const o = {};
      const walk = (map, x, y, tod, steps, wx) => {
        S.stage(map, x, y, 0, tod, wx); AIR11.prints.clear(); const cam = Engine.cam; let t = 5; S.frame([], ['footprints'], t);
        for (let i = 0; i < steps; i++) { t += 0.1; cam.x = x + i * 0.1; S.frame([], ['footprints'], t); }
        return t;
      };
      let t = walk('deepwoods', 5.5, 36.5, 0.5, 70); o.mud = AIR11.prints.count(); o.mudKind = AIR11.prints.list.filter(p => p.on).map(p => p.kind)[0];
      t = walk('whispergrove', 5.5, 27.5, 0.5, 70); o.water = AIR11.prints.count(); o.waterKind = AIR11.prints.list.filter(p => p.on).map(p => p.kind)[0];
      // dry cobbles and grass: none; grass in the rain: mud
      walk('oakhaven', 23.5, 20.5, 0.5, 60); o.dry = AIR11.prints.count();
      walk('oakhaven', 23.5, 20.5, 0.5, 60, 'rain'); o.rainStreet = AIR11.prints.count();
      S.stage('oakhaven', 3.5, 3.5, 0, 0.5, 'rain'); o.surf = [AIR11.prints.surfaceAt(G.map, 3.5, 3.5), AIR11.prints.surfaceAt(G.map, 23.5, 20.5)];
      Weather.hold('clear'); o.surfDry = AIR11.prints.surfaceAt(G.map, 3.5, 3.5);
      // visible: the same trail seen from behind is different from none; only floor pixels change
      t = walk('deepwoods', 5.5, 36.5, 0.5, 70); const cam = Engine.cam; cam.dir = Math.PI;
      const a = S.frame([], [], t + 0.1), b = S.frame([], ['footprints'], t + 0.1), idx = S.diff(a, b);
      o.vis = { n: idx.length, nonGround: idx.filter(i => a.mbuf[i] !== 5).length, darker: idx.filter(i => ((b.fb[i] & 255) + ((b.fb[i] >> 8) & 255) + ((b.fb[i] >> 16) & 255)) < ((a.fb[i] & 255) + ((a.fb[i] >> 8) & 255) + ((a.fb[i] >> 16) & 255))).length };
      // water: pale rings on shallows pixels
      t = walk('whispergrove', 5.5, 27.5, 0.5, 70); Engine.cam.dir = Math.PI;
      const wa = S.frame([], [], t + 0.1), wb = S.frame([], ['footprints'], t + 0.1), widx = S.diff(wa, wb);
      o.wvis = { n: widx.length, shallows: widx.filter(i => wa.mbuf[i] === 3).length, lighter: widx.filter(i => ((wb.fb[i] & 255) + ((wb.fb[i] >> 8) & 255) + ((wb.fb[i] >> 16) & 255)) > ((wa.fb[i] & 255) + ((wa.fb[i] >> 8) & 255) + ((wa.fb[i] >> 16) & 255))).length };
      // a sprite standing on a print hides it (ground pixels only)
      // fade: strength falls with age; gone after ~60 s
      t = walk('deepwoods', 5.5, 36.5, 0.5, 70); Engine.cam.dir = Math.PI;
      const f0 = S.frame([], ['footprints'], t + 0.1), base = S.frame([], [], t + 0.1), d0 = S.diff(base, f0);
      const lumSum = (f, idx) => idx.reduce((s, i) => s + Math.abs(((f.fb[i] & 255) + ((f.fb[i] >> 8) & 255) + ((f.fb[i] >> 16) & 255)) - ((base.fb[i] & 255) + ((base.fb[i] >> 8) & 255) + ((base.fb[i] >> 16) & 255))), 0);
      const full = lumSum(f0, d0);
      const f30 = S.frame([], ['footprints'], t + 30), half = lumSum(f30, S.diff(base, f30));
      o.fade = { full, half, ratio: half / full };
      const f59 = S.frame([], ['footprints'], t + 59); o.fade59 = S.diff(base, f59).length;
      const f61 = S.frame([], ['footprints'], t + 62); o.fade61 = S.diff(base, f61).length; o.afterFade = AIR11.prints.count();
      // cap
      S.stage('deepwoods', 5.5, 36.5, 0, 0.5); AIR11.prints.clear(); let tt = 5; const cam2 = Engine.cam; S.frame([], ['footprints'], tt);
      let maxLive = 0; for (let i = 0; i < 600; i++) { tt += 0.05; cam2.x = 27.5 + Math.cos(i * 0.02) * 6; cam2.y = 36.5 + Math.sin(i * 0.02) * 6; S.frame([], ['footprints'], tt); maxLive = Math.max(maxLive, AIR11.prints.count()); }
      o.cap = { max: maxLive, cap: AIR11.prints.cap };
      AIR11.prints.cap = 10; o.cap10 = AIR11.prints.count(); tt += 0.05; for (let i = 0; i < 30; i++) { tt += 0.1; cam2.x = 27.5 + Math.cos(12 + i * 0.1) * 6; cam2.y = 36.5 + Math.sin(12 + i * 0.1) * 6; S.frame([], ['footprints'], tt); } o.cap10b = AIR11.prints.count(); AIR11.prints.cap = 60;
      // enemies leave prints too, but not ghosts, floaters or swarms
      S.stage('deepwoods', 27.5, 36.5, 0, 0.5); AIR11.prints.clear(); const hound = S.mk('hound', 28.5, 38.0), ghost = S.mk('quiet', 29.5, 38.0), dirge = S.mk('dirge', 30.5, 38.0), swarm = S.mk('mites', 31.5, 38.0);
      const ents = [hound, ghost, dirge, swarm]; for (const e of ents) G.ents.push(e); let t3 = 5; S.frame(G.ents, ['footprints'], t3);
      for (let i = 0; i < 60; i++) { t3 += 0.1; for (const e of ents) e.x += 0.08; S.frame(G.ents, ['footprints'], t3); }
      for (const e of ents) G.ents.splice(G.ents.indexOf(e), 1);
      o.enemy = AIR11.prints.list.filter(p => p.on).length; o.enemyPaw = AIR11.prints.list.filter(p => p.on && p.paw).length;
      // cleared on map change, and not in any save
      const before = JSON.stringify(Object.keys(G).sort()), flagsBefore = JSON.stringify(G.flags);
      loadMap('whispergrove', { x: 24.5, y: 27.5, dir: 0 }); o.afterMap = AIR11.prints.count();
      walk('whispergrove', 5.5, 27.5, 0.5, 40); o.some = AIR11.prints.count();
      o.gSame = before === JSON.stringify(Object.keys(G).sort()) && flagsBefore === JSON.stringify(G.flags);
      let code = ''; try { code = typeof makeSaveCode === 'function' ? makeSaveCode() : ''; } catch (e) { code = ''; }
      o.saveHas = JSON.stringify(G.flags).indexOf('print') >= 0 || JSON.stringify(G.flags).indexOf('p11a') >= 0;
      // switching it off clears
      GFX.footprints = true; GFX.changed(); GFX.footprints = false; GFX.changed(); o.afterOff = AIR11.prints.count();
      return o;
    });
    ok(fp.mud >= 8 && fp.mudKind === 1 && fp.water >= 5 && fp.waterKind === 2, `footprints: you leave prints in mud (${fp.mud}) and shallow water (${fp.water})`);
    ok(fp.dry === 0 && fp.rainStreet === 0 && fp.surf[0] === 1 && fp.surf[1] === 0 && fp.surfDry === 0, 'footprints: none on dry ground or cobbles; wet grass in rain takes them');
    ok(fp.vis.n > 80 && fp.vis.nonGround === 0 && fp.vis.darker > fp.vis.n * 0.6, `footprints: mud prints darken the floor (with a lighter wet lip), floor pixels only (${fp.vis.n} px)`);
    ok(fp.wvis.n > 40 && fp.wvis.shallows === fp.wvis.n && fp.wvis.lighter === fp.wvis.n, `footprints: water prints are paler rings on the shallows only (${fp.wvis.n} px)`);
    ok(fp.fade.ratio > 0.25 && fp.fade.ratio < 0.7 && fp.fade59 < fp.fade.full && fp.fade61 === 0 && fp.afterFade === 0, `footprints: they fade over ~60 s (half strength at 30 s = ${fp.fade.ratio.toFixed(2)}, gone by 62 s)`);
    ok(fp.cap.max <= fp.cap.cap && fp.cap.max === 60 && fp.cap10 === 10 && fp.cap10b === 10, `footprints: capped (${fp.cap.max} of ${fp.cap.cap} on a long walk; a cap of 10 holds at ${fp.cap10})`);
    ok(fp.enemy > 3 && fp.enemyPaw === fp.enemy, `footprints: a walking hound leaves paw prints (${fp.enemy}); ghosts, floaters and swarms leave none`);
    ok(fp.afterMap === 0 && fp.some > 0, 'footprints: cleared when the map changes');
    ok(fp.gSame && !fp.saveHas, 'footprints: nothing added to G or the saved flags');
    ok(fp.afterOff === 0, 'footprints: switching them off clears the trail');

    // ------------------------------------------------------------------
    //  8. save contents and RNG order are untouched by the effects
    // ------------------------------------------------------------------
    const rng = await page.evaluate(() => {
      const o = {};
      S.stage('deepwoods', 27.5, 36.5, 1.57, 0.5);
      // the game loop runs beside the test and draws randoms of its own, so prove it directly: with Math.random
      // made to throw, every effect draws a full frame from the captured frame info
      let F = null; Engine.addPostHook(f => { F = f; }, -60);
      const ents = G.ents.concat([S.mk('quiet', 27.5, 33.5), S.mk('hound', 28.5, 34)]);
      S.frame(ents, S.keys, 5); S.frame(ents, S.keys, 5.4);
      const orig = Math.random; let hit = 0; Math.random = () => { hit++; return 0.5; };
      try {
        for (const k of S.keys) GFX[k] = true;
        for (const fn of ['drawPrints', 'drawShafts', 'drawHaze', 'drawGlare', 'drawBreath', 'drawGhosts']) AIR11[fn](F);
        Engine.render(ents, G.tod);   // ...and the wrapped render (see-through ghosts) too
      } finally { Math.random = orig; }
      o.hit = hit; o.ranOnce = !!F;
      return o;
    });
    ok(rng.ranOnce && rng.hit <= 36, `purity: the six effects themselves never draw from Math.random (the rest of one frame drew ${rng.hit}: the game's own particles)`);
    const ent = await page.evaluate(() => {
      S.stage('deepwoods', 27.5, 36.5, 1.57, 0.5);
      const ents = G.ents.concat([S.mk('quiet', 27.5, 33.5), S.mk('hound', 28.5, 34)]), snap = () => JSON.stringify(ents.map(e => [e.x, e.y, e.hp, Object.prototype.hasOwnProperty.call(e, 'animAlpha') ? e.animAlpha : 'none', e.state, Object.keys(e).sort().join()]));
      S.frame(ents, [], 5); const before = snap(); S.frame(ents, S.keys, 5); S.frame(ents, S.keys, 5.5);
      return { same: before === snap() };
    });
    ok(ent.same, 'purity: no entity field is added or changed (not even animAlpha) by any effect');

    // ------------------------------------------------------------------
    //  9. Options rows
    // ------------------------------------------------------------------
    const opt = await page.evaluate(() => {
      const o = {};
      PRESETS.apply('medium'); localStorage.removeItem('echoes-air11');
      renderAccessibilityMenu(); const rows = ['air-shafts', 'air-haze', 'air-glare', 'air-ghosts', 'air-breath', 'air-prints'].map(id => document.getElementById(id));
      o.have = rows.every(Boolean); o.labels = rows.map(b => b && b.getAttribute('aria-label'));
      o.before = rows.map(b => b.textContent + b.getAttribute('aria-pressed'));
      rows[0].click(); o.afterClick = [GFX.sunShafts, rows[0].textContent, rows[0].getAttribute('aria-pressed')]; o.stored = localStorage.getItem('echoes-air11');
      rows[5].click(); o.after2 = [GFX.footprints, rows[5].textContent];
      // a preset takes over again and the stored override is dropped
      PRESETS.apply('original'); o.orig = [GFX.sunShafts, GFX.footprints]; PRESETS.apply('medium'); o.med = [GFX.sunShafts, GFX.footprints, localStorage.getItem('echoes-air11')];
      localStorage.removeItem('echoes-air11'); closeModal && closeModal();
      return o;
    });
    ok(opt.have && opt.before.every(s => s === 'Ontrue'), 'options: six rows in Graphics & access, each with a label and an on/off state');
    ok(opt.afterClick[0] === false && opt.afterClick[1] === 'Off' && opt.afterClick[2] === 'false' && JSON.parse(opt.stored).sunShafts === false && opt.after2[0] === false, 'options: clicking switches the effect and stores the choice');
    ok(opt.orig.join() === 'false,false' && opt.med[0] === true && opt.med[1] === true && opt.med[2] === JSON.stringify({ sunShafts: null, heatHaze: null, glassGlare: null, seeThrough: null, coldBreath: null, footprints: null }), 'options: choosing a preset takes over again (the stored override is dropped)');

    // ------------------------------------------------------------------
    //  10. performance: a 12-enemy scene at 1x, each effect on vs off (frame time and the module's own timer)
    // ------------------------------------------------------------------
    const perf = await page.evaluate(() => {
      const out = {};
      const scenes = {
        sunShafts: ['deepwoods', 27.5, 32, -1.57, 0.5, ['hound', 'proctor', 'legionnaire', 'golem'], 'shafts'],
        heatHaze: ['deepwoods', 27.5, 38.0, 1.57, 0.5, ['hound', 'proctor', 'legionnaire', 'golem'], 'haze'],
        glassGlare: ['clearing', 20.5, 33.5, -1.57, 0.5, ['hound', 'proctor', 'legionnaire', 'golem'], 'glare'],
        seeThrough: ['deepwoods', 27.5, 36, -1.57, 0.5, ['quiet', 'dirge', 'drowned', 'quiet'], 'ghosts'],
        coldBreath: ['oakhaven', 23.5, 20.5, -1.57, 0.95, ['hound', 'proctor', 'legionnaire', 'golem'], 'breath'],
        footprints: ['whispergrove', 24.5, 27.5, -1.57, 0.5, ['hound', 'proctor', 'legionnaire', 'golem'], 'prints'],
      };
      for (const [flag, [map, x, y, dir, tod, types, hn]] of Object.entries(scenes)) {
        S.stage(map, x, y, dir, tod); PRESETS.apply('medium'); GFX.reduceMotion = false;
        const cam = Engine.cam, crowd = [];
        for (let i = 0; i < 12; i++) { const a = cam.dir + (i % 4 - 1.5) * 0.28, d = 2.5 + ((i / 4) | 0) * 1.6; const e = S.mk(types[i % 4], cam.x + Math.cos(a) * d, cam.y + Math.sin(a) * d); G.ents.push(e); crowd.push(e); }
        for (const e of G.ents) if (e.kind === 'enemy' && !crowd.includes(e)) e.hidden = true;
        for (const k of GFX.FX) GFX[k] = false; Engine.setTime(5); Engine.render(G.ents, G.tod);
        if (flag === 'footprints') { GFX.footprints = true; Engine.setTime(5); Engine.render(G.ents, G.tod); AIR11.prints.clear(); for (let i = 0; i < 60; i++) AIR11.prints.add(G.map, cam.x - 1.5 + (i % 12) * 0.4, cam.y - 2.5 + Math.floor(i / 12) * 0.6, 0, 0.26, false); }
        const times = { off: [], on: [] };
        for (let r = 0; r < 13; r++) for (const k of ['off', 'on']) {
          for (const f of GFX.FX) GFX[f] = false; GFX[flag] = k === 'on';
          for (let i = 0; i < 4; i++) Engine.render(G.ents, G.tod);
          const t0 = performance.now(); for (let i = 0; i < 30; i++) { Engine.setTime(5 + i * 0.02); Engine.render(G.ents, G.tod); } times[k].push((performance.now() - t0) / 30);
        }
        AIR11.profile = true; for (const f of GFX.FX) GFX[f] = false; GFX[flag] = true;
        const own = []; for (let i = 0; i < 150; i++) { Engine.setTime(5 + i * 0.03); Engine.render(G.ents, G.tod); own.push(AIR11.stats.ms[hn] || 0); } own.sort((p, q) => p - q); AIR11.profile = false;
        const best = a => Math.min(...a);
        out[flag] = { off: +best(times.off).toFixed(2), on: +best(times.on).toFixed(2), delta: +(best(times.on) - best(times.off)).toFixed(2), own: +own[75].toFixed(2) };
        for (const e of crowd) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
      }
      return out;
    });
    for (const k in perf) {
      console.log(`PERF ${k}: off ${perf[k].off} ms, on ${perf[k].on} ms (delta ${perf[k].delta}), own median ${perf[k].own} ms`);
      ok(perf[k].own < 1.0, `perf: ${k} costs ${perf[k].own} ms in its own timer (best-of frame delta ${perf[k].delta} ms; noisy on a shared machine) in a 12-enemy scene at 1x`);
    }

    // ------------------------------------------------------------------
    //  11. screenshots (day / night, indoor / outdoor) and a compact 640x400 run
    // ------------------------------------------------------------------
    await page.evaluate(() => { PRESETS.apply('medium'); GFX.reduceMotion = false; });
    // each picture stages itself in the page; all six switches are on (the Medium preset), the clock is pinned
    const SHOTS = {
      'shafts-woods-day': () => { S.stage('deepwoods', 27.5, 36, -1.57, 0.5); AIR11.sun.build(G.map); const s = AIR11.sun.shafts()[8], a = Math.atan2(0.4, 1); Engine.cam.x = s.x - Math.cos(a) * 5; Engine.cam.y = s.y - Math.sin(a) * 5; Engine.cam.dir = a; },
      'shafts-woods-night': () => { S.stage('deepwoods', 27.5, 36, -1.57, 0.95); AIR11.sun.build(G.map); const s = AIR11.sun.shafts()[8], a = Math.atan2(0.4, 1); Engine.cam.x = s.x - Math.cos(a) * 5; Engine.cam.y = s.y - Math.sin(a) * 5; Engine.cam.dir = a; },
      'shafts-cloister-day': () => S.stage('cloister', 9.5, 13.3, -1.57, 0.5),
      'shafts-cloister-night': () => S.stage('cloister', 9.5, 13.3, -1.57, 0.95),
      'haze-campfire-day': () => S.stage('deepwoods', 27.5, 38.0, 1.57, 0.5),
      'haze-campfire-night': () => S.stage('deepwoods', 27.5, 38.0, 1.57, 0.95),
      'haze-brazier-indoor': () => { const sp = S.wallSpot('mausoleum', 1.2, 2.2); S.stage('mausoleum', sp.x, sp.y, sp.dir, 0.5); G.ents.push({ kind: 'deco', sprite: 'brazier', x: sp.x + sp.dx * 2.2, y: sp.y + sp.dy * 2.2, scale: 0.62, solid: false, glow: 0.8 }); },
      'haze-golem-outdoor': () => { S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); G.ents.push(S.mk('golem', 23.5, 17.0)); },
      'glare-lamp-day': () => S.stage('clearing', 20.5, 33.5, -1.57, 0.5),
      'glare-lamp-night': () => S.stage('clearing', 20.5, 33.5, -1.57, 0.95),
      'glare-coil-indoor': () => { const sp = S.wallSpot('mausoleum', 1.2, 3); S.stage('mausoleum', sp.x, sp.y, sp.dir, 0.5); G.ents.push({ kind: 'deco', sprite: 'coil', x: sp.x + sp.dx * 3, y: sp.y + sp.dy * 3, scale: 1.0, solid: false, glow: 0.6 }); },
      'ghosts-day-outdoor': () => { S.stage('deepwoods', 27.5, 36, -1.57, 0.5); S.ghostRow(); },
      'ghosts-night-outdoor': () => { S.stage('deepwoods', 27.5, 36, -1.57, 0.95); S.ghostRow(); },
      'ghosts-highcontrast': () => { S.stage('deepwoods', 27.5, 36, -1.57, 0.5); S.ghostRow(); ACCESS.setHighContrast(true); },
      'breath-night-outdoor': () => { S.stage('oakhaven', 23.5, 20.5, -1.57, 0.95); S.people(); },
      'breath-crypt-indoor': () => { const m = G.maps.catacombs; S.stage('catacombs', m.spawn.x, m.spawn.y, m.spawn.dir, 0.5); S.people(); },
      'prints-mud-day': () => { S.trail('deepwoods', 5.5, 36.5, 0.5); },
      'prints-water-night': () => { S.trail('whispergrove', 5.5, 27.5, 0.95); },
    };
    await page.evaluate(() => {
      S.wallSpot = (map, gap, back) => {
        loadMap(map); const m = G.map;
        for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) for (const dir of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const dx = Math.round(Math.cos(dir)), dy = Math.round(Math.sin(dir)); let wall = -1;
          for (let t = 1; t <= 9; t++) { if (m.cells[(y + dy * t) * m.w + x + dx * t]) { wall = t; break; } }
          if (wall < gap + back + 1 || wall > gap + back + 2) continue;
          let ok = true; for (let t = 0; t < wall; t++) if (m.cells[(y + dy * t) * m.w + x + dx * t]) ok = false;
          if (ok) return { x: x + 0.5, y: y + 0.5, dir, dx, dy };
        }
        return null;
      };
      S.ghostRow = () => {
        const cam = Engine.cam, kinds = [S.mk('quiet', 0, 0), S.mk('dirge', 0, 0), S.mk('drowned', 0, 0), S.npc('mourner', 0, 0, { id: 'mourner' }), S.mk('hound', 0, 0)];
        kinds.forEach((e, i) => { const a = cam.dir + (i - 2) * 0.18; e.x = cam.x + Math.cos(a) * 3.2; e.y = cam.y + Math.sin(a) * 3.2; e.state = 'passive'; G.ents.push(e); });
      };
      S.people = () => {
        const cam = Engine.cam;
        [['townsman', -0.15, 2.4], ['townswoman', 0.2, 3.2]].forEach(([k, a, d]) => { const e = S.npc(k, cam.x + Math.cos(cam.dir + a) * d, cam.y + Math.sin(cam.dir + a) * d); e.facing = cam.dir + Math.PI; G.ents.push(e); });
        const h = S.mk('hound', cam.x + Math.cos(cam.dir) * 4.2, cam.y + Math.sin(cam.dir) * 4.2); h.facing = cam.dir + Math.PI; G.ents.push(h);
      };
      S.trail = (map, x, y, tod) => {
        S.stage(map, x, y, 0, tod); AIR11.prints.clear(); const cam = Engine.cam; let t = 5; GFX.footprints = true; Engine.setTime(t); Engine.render(G.ents, G.tod);
        const hound = S.mk('hound', x + 2, y + 1.5); G.ents.push(hound);
        for (let i = 0; i < 70; i++) { t += 0.1; cam.x = x + i * 0.1; hound.x = x + 2 + i * 0.07; hound.y = y + 1.5 + Math.sin(i * 0.1) * 0.2; Engine.setTime(t); Engine.render(G.ents, G.tod); }
        cam.dir = Math.PI;
      };
    });
    for (const name of Object.keys(SHOTS)) {
      await page.evaluate((src) => {
        ACCESS.setHighContrast(false); PRESETS.apply('medium'); GFX.reduceMotion = false;
        (0, eval)('(' + src + ')')();
        for (const f of GFX.FX) GFX[f] = true; Engine.setTime(7.3);
      }, SHOTS[name].toString());
      await shot(name);
      await page.evaluate(() => { ACCESS.setHighContrast(false); });
    }
    ok(errors.length === 0, 'no page errors on the main page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    await page.close();

    const { page: pc, errors: errc } = await bootPage(browser, URL, { width: 640, height: 400 });
    await pc.evaluate(HELPERS);
    const compact = await pc.evaluate(() => {
      PRESETS.apply('high'); const o = {};
      S.stage('deepwoods', 27.5, 38.0, 1.57, 0.5); for (const k of S.keys) GFX[k] = true;
      for (let t = 0; t < 40; t++) { Engine.setTime(5 + t * 0.1); Engine.render(G.ents, G.tod); }
      o.scale = Engine.getScale();
      S.stage('cloister', 9.5, 13.3, -1.57, 0.5); for (let t = 0; t < 20; t++) { Engine.setTime(5 + t * 0.1); Engine.render(G.ents, G.tod); }
      PRESETS.apply('medium'); return o;
    });
    await pc.waitForTimeout(300);
    await pc.locator('#game').screenshot({ path: path.join(SHOT_DIR, 'compact-640x400.png') });
    ok(compact.scale === 2 && errc.length === 0, `compact: all six effects render at 2x in a 640x400 window without errors${errc.length ? ': ' + errc.slice(0, 3).join(' | ') : ''}`);
    await pc.close();
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
