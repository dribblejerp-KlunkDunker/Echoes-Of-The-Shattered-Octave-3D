// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3926 node test/far14.test.js
// Optional: SHOT_DIR=/some/dir keeps before/after screenshots and the frame-cost table (default: os tmpdir).
//           BASE_REF=phase14-world is the commit whose js/engine.js the "before" frames come from.
// Covers Phase 14 FAR (js/far14.js, the FAR blocks of js/engine.js and js/presets.js): the View distance slider to 4x and its
// persistence, the Ultra preset, frames identical to the old engine at every old setting, sky haze that follows the hour,
// the indoor cap, sprites at the new distance and their LOD, floor/wall shimmer, rays that reach the far end of a long
// map, gameplay (AI, detection, picking, Dread) independent of view distance, frame cost, the 640x400 Options panel.
// Frames are pinned the way test/look10.test.js pins them. Uses the preview server; never writes saves.
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3926';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'far14-shots');
const BASE_REF = process.env.BASE_REF || 'phase14-world';
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, viewport, init) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // a seeded Math.random at load: the sky's cloud noise and every other load-time roll is the same on every page
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  if (init) await page.addInitScript(init);
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Far Tester');
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

const SCENES = {
  oakhaven: { map: 'oakhaven', x: 23.5, y: 20.5, dir: -1.57 },
  clearing: { map: 'clearing', x: 20.5, y: 32.5, dir: -Math.PI / 2 },
  deepwoods: { map: 'deepwoods', x: 27.5, y: 30.5, dir: -1.57 },
  catacombs: { map: 'catacombs', x: 2.6, y: 14.5, dir: 0 },
};

// the engine as it was before this phase, from git (null when git or the ref is not there)
function baseEngineSource() {
  try {
    const root = cp.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' }).trim();
    return cp.execFileSync('git', ['show', BASE_REF + ':js/engine.js'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  } catch (e) { return null; }
}

// ---- in-page: the old engine next to the new one, same canvas, same map, same entities -------------------------------
const OLD_ENGINE = ({ baseSrc, scenes }) => {
  window.SCENES_IN_PAGE = scenes;
  let E2 = null;
  if (baseSrc) {
    // the engine draws its cloud noise from Math.random once at load: give the copy the same numbers (the page was seeded with 424242)
    const realR = Math.random; { let sd = 424242; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; }
    E2 = new Function(baseSrc + '\nreturn Engine;')(); Math.random = realR;
    for (const k in Engine.textures) E2.textures[k] = Engine.textures[k];
    for (const k in Engine.sprites) E2.sprites[k] = Engine.sprites[k];
    window.E2 = E2;
  }
  window.F14 = { cap: null };
  // an open outdoor strip 100 cells long: nothing between the camera and what stands on it, for sprite and ray tests
  window.F14.longMap = () => { const m = new GameMap('far14long', 'Long', 100, 6, { outdoor: true, floor: 't_grass', fogDist: 16, fogColor: [50, 55, 50], spawn: { x: 2.5, y: 3.5, dir: 0 } }); m.border('t_stone'); return m; };
  // one frame with every clock and random number pinned and per-entity animation state reset, so two frames of the same scene compare exactly
  window.F14.pinned = (ents, tod, opts) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try {
      if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
      for (const e of ents) { for (const k of Object.keys(e)) if (k.startsWith('anim') && typeof e[k] === 'number') e[k] = (k === 'animSX' || k === 'animSY' || k === 'animAlpha') ? 1 : 0; e.animSprite = null; e.animFlip = false; e._fb = 0; }
      PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir; Engine.setTime(3.25);
      Engine.render(ents, tod, opts);
    } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
    return window.F14.cap;
  };
  Engine.addPostHook(F => { window.F14.cap = Uint32Array.from(F.fb); window.F14.fi = { fogR: F.fogR, fogG: F.fogG, fogB: F.fogB, fogDist: F.fogDist, far: F.far, haze: F.farHaze, sprList: F.sprList.slice(), horizon: F.horizon, w: F.w, h: F.h, dbuf: Float32Array.from(F.dbuf) }; }, -1000);
  // stage a case on both engines
  window.F14.stage = (c) => {
    if (c.scale) { GFX.scale = c.scale; Engine.setScale(c.scale); if (E2) E2.setScale(c.scale); }
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = c.vd; GFX.particles = 1; GFX.farLook = c.farLook !== false;
    Engine.setLook({ fogK: c.vd }); if (E2) E2.setLook({ fogK: c.e2vd == null ? c.vd : c.e2vd }); GFX.changed();
    loadMap(c.sc.map, { x: c.sc.x, y: c.sc.y, dir: c.sc.dir }); G.state = 'play'; G.fadeT = 0; G.tod = c.tod; Engine.cam.pitch = 0; Engine.cam.bob = 0;
    Weather.hold('clear'); GFX.reduceMotion = true;
    const ents = (c.ents || G.ents).slice();
    if (c.crowd) for (let i = 0; i < 12; i++) {
      const ang = c.sc.dir + (i - 5.5) * 0.11, d = 4 + (i % 6) * 2.4;
      const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: c.sc.x + Math.cos(ang) * d, y: c.sc.y + Math.sin(ang) * d }); e.state = 'passive'; ents.push(e);
    }
    const wx = { haze: c.haze || 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 };
    Engine.setWeather(wx); Engine.setTime(3.25); Engine.setFlicker(1);
    if (E2) { E2.setWeather(wx); E2.setMap(G.map); Object.assign(E2.cam, Engine.cam); E2.setTime(3.25); E2.setFlicker(1); }
    return ents;
  };
  return true;
};
const COMPARE = ({ cases }) => {
  const out = [];
  for (const c of cases) {
    const ents = window.F14.stage(c);
    const pl = c.light ? { x: Engine.cam.x, y: Engine.cam.y, r: 6, cr: 60, cg: 40, cb: 20 } : null;
    Engine.render(ents, c.tod, { playerLight: pl }); const a = window.F14.cap;
    E2.render(ents, c.tod, { playerLight: pl });
    const px = new Uint32Array(Engine.ctx.getImageData(0, 0, 320 * (c.scale || 1), 150 * (c.scale || 1)).data.buffer);
    let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== px[i]) n++;
    out.push({ name: c.name, n });
  }
  return out;
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const { page, errors } = await bootPage(browser);
  const q = (fn, arg) => page.evaluate(fn, arg);

  // ------------------------------------------------------------------------------------------------ presets and slider
  await step('presets: Original/Low/Medium/High keep their numbers; Ultra is scale 2, view distance 2.5; order puts Ultra after High', async () => {
    const r = await q(() => ({ t: JSON.parse(JSON.stringify(PRESETS.table)), order: PRESETS.order.slice() }));
    assert.deepEqual([r.t.original.scale, r.t.original.viewDist, r.t.original.particles], [1, 1, 1]);
    assert.deepEqual([r.t.low.scale, r.t.low.viewDist, r.t.low.particles], [1, 0.8, 0.5]);
    assert.deepEqual([r.t.medium.scale, r.t.medium.viewDist, r.t.medium.particles], [1, 1, 1]);
    assert.deepEqual([r.t.high.scale, r.t.high.viewDist, r.t.high.particles], [2, 1.15, 1.25]);
    assert.deepEqual([r.t.ultra.scale, r.t.ultra.viewDist], [2, 2.5]);
    assert.deepEqual(r.order, ['original', 'low', 'medium', 'high', 'ultra', 'cinematic']);   // Phase 14 CINEMA adds Cinematic after Ultra
    const u = await q(() => { PRESETS.apply('ultra'); Engine.render(G.ents, G.tod); const o = { cur: PRESETS.current(), scale: GFX.scale, vd: GFX.viewDist, w: Engine.canvas.width, fogK: Engine.farInfo().fogK, farLook: GFX.farLook }; PRESETS.apply('medium'); o.back = PRESETS.current(); return o; });
    assert.deepEqual([u.cur, u.scale, u.vd, u.w, u.fogK, u.farLook, u.back], ['ultra', 2, 2.5, 640, 2.5, true, 'medium']);
    const orig = await q(() => { PRESETS.apply('original'); const o = { farLook: GFX.farLook, vd: GFX.viewDist }; PRESETS.apply('medium'); return o; });
    assert.deepEqual(orig, { farLook: false, vd: 1 }, 'Original leaves the far look off');
  });

  await step('slider: steps 0.6..1.4 then 2, 2.5, 3, 4 with labels; clamps at 4 and 0.6; the API snaps to a step', async () => {
    await q(() => { PRESETS.apply('medium'); G.state = 'panel'; renderMenu(); });
    await page.locator('#mn-gfx').click();
    const read = () => q(() => ({ vd: GFX.viewDist, label: document.getElementById('gfx-vd-val').textContent, cur: PRESETS.current(), fogK: (Engine.render(G.ents, G.tod), Engine.farInfo().fogK) }));
    await page.locator('#gfx-vd-up').click(); let s = await read(); assert.equal(s.vd, 1.05); assert.equal(s.label, '1.05'); assert.equal(s.cur, 'custom');
    await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 1); assert.equal(s.cur, 'medium');
    for (let i = 0; i < 8; i++) await page.locator('#gfx-vd-up').click();   // 1.05 .. 1.4
    s = await read(); assert.equal(s.vd, 1.4); assert.equal(s.label, '1.40');
    const far = [[2, '2.00 Far'], [2.5, '2.50 Far'], [3, '3.00 Very far'], [4, '4.00 Horizon']];
    for (const [v, label] of far) { await page.locator('#gfx-vd-up').click(); s = await read(); assert.equal(s.vd, v); assert.equal(s.label, label); assert.equal(s.fogK, v, 'the renderer got ' + v); }
    await page.locator('#gfx-vd-up').click(); s = await read(); assert.equal(s.vd, 4, 'the slider stops at 4');
    await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 3);
    for (let i = 0; i < 2; i++) await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 2);
    await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 1.4); await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 1.35);
    const api = await q(() => { const o = []; for (const v of [10, 0, 1.8, 1.5, 2.7, 3.6, NaN, 0.62]) { PRESETS.setViewDist(v); o.push(GFX.viewDist); } PRESETS.apply('medium'); return o; });
    assert.deepEqual(api, [4, 0.6, 2, 1.4, 2.5, 4, 1, 0.6], 'setViewDist clamps and snaps: ' + api);
    await q(() => { closeModal(); G.state = 'play'; });
  });

  await step('slider persists: the value is stored and comes back after a reload; bad stored data is ignored', async () => {
    await q(() => PRESETS.setViewDist(4));
    const stored = await q(() => JSON.parse(localStorage.getItem(FAR14.KEY)));
    assert.equal(stored.viewDist, 4);
    await page.reload();
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    let r = await q(() => ({ vd: GFX.viewDist, cur: PRESETS.current(), fog: (Engine.render(G.ents, G.tod), Engine.farInfo().fogK) }));
    assert.deepEqual([r.vd, r.cur, r.fog], [4, 'custom', 4], 'restored after reload');
    for (const bad of ['{"viewDist":99}', '{"viewDist":"far"}', 'not json', '{"viewDist":null,"farLook":"yes"}']) {
      await q((b) => localStorage.setItem('echoes-far14', b), bad);
      await page.reload();
      await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
      r = await q(() => ({ vd: GFX.viewDist, farLook: GFX.farLook }));
      assert.ok(r.vd >= 0.6 && r.vd <= 4 && typeof r.farLook === 'boolean', 'bad data ' + bad + ' gives ' + JSON.stringify(r));
      if (bad === '{"viewDist":99}') assert.equal(r.vd, 4); else assert.equal(r.vd, 1);
    }
    await q(() => localStorage.removeItem('echoes-far14'));
    await page.reload();
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    r = await q(() => GFX.viewDist); assert.equal(r, 1);
  });

  // after the reloads the page is at the title: start a game again for everything below
  await page.close();
  const boot2 = await bootPage(browser); const pg = boot2.page; errors.push(...boot2.errors);
  const Q = (fn, arg) => pg.evaluate(fn, arg);

  // ------------------------------------------------------------------------------------------------ identical to the old engine
  const baseSrc = baseEngineSource();
  await Q(OLD_ENGINE, { baseSrc, scenes: SCENES });
  if (baseSrc) {
    await step('old settings: engine frames are pixel-identical to the engine before this phase (every old view distance, 1x and 2x, three hours, weather haze, 12 enemies, a lantern)', async () => {
      const cases = [];
      for (const [name, sc] of Object.entries(SCENES)) for (const tod of [0.5, 0.74, 0.1]) for (const scale of [1, 2]) for (const vd of [0.6, 0.8, 1, 1.15, 1.4]) for (const haze of [0, 0.3])
        cases.push({ name: [name, tod, scale, vd, haze].join('/'), sc, tod, scale, vd, haze, crowd: true, light: name === 'catacombs' });
      const res = await Q(COMPARE, { cases });
      const bad = res.filter(r => r.n);
      assert.equal(bad.length, 0, res.length + ' cases, ' + bad.length + ' differ: ' + JSON.stringify(bad.slice(0, 5)));
    });
    await step('far look off: outdoor frames at 2x are identical to the old engine at 2x (the new paths disabled change nothing)', async () => {
      const cases = [];
      for (const name of ['oakhaven', 'clearing', 'deepwoods']) for (const tod of [0.5, 0.74]) cases.push({ name: name + '/' + tod, sc: SCENES[name], tod, vd: 2, e2vd: 2, farLook: false, scale: 1, crowd: true });
      const res = await Q(COMPARE, { cases });
      assert.equal(res.filter(r => r.n).length, 0, JSON.stringify(res.filter(r => r.n)));
    });
  } else console.log('NOTE git history for ' + BASE_REF + ' not available: the old-engine comparison was skipped');

  await step('at 1x and 1.4x the far look is invisible: frames with farLook on and off are identical', async () => {
    const r = await Q(() => {
      const out = [];
      for (const name of ['oakhaven', 'clearing', 'deepwoods', 'catacombs']) for (const vd of [1, 1.4]) {
        const sc = { oakhaven: [23.5, 20.5, -1.57], clearing: [20.5, 32.5, -1.5708], deepwoods: [27.5, 30.5, -1.57], catacombs: [2.6, 14.5, 0] }[name];
        const h = [];
        for (const look of [true, false]) {
          GFX.farLook = look; GFX.viewDist = vd; Engine.setLook({ fogK: vd });
          loadMap(name, { x: sc[0], y: sc[1], dir: sc[2] }); G.state = 'play'; G.fadeT = 0; G.tod = 0.6; Weather.hold('clear');
          const d = window.F14.pinned(G.ents.filter(e => e.kind !== 'npc' && e.kind !== 'enemy' && (!e.transient || e._flora)), G.tod); let x = 2166136261; for (let i = 0; i < d.length; i++) { x ^= d[i]; x = Math.imul(x, 16777619); } h.push(x >>> 0);
        }
        out.push(h[0] === h[1]);
      }
      GFX.farLook = true; PRESETS.apply('medium');
      return out;
    });
    assert.ok(r.every(Boolean), JSON.stringify(r));
  });

  // ------------------------------------------------------------------------------------------------ haze follows the hour
  await step('haze: outdoors at 4x the far air is the colour of the sky at the horizon, and it follows the time of day', async () => {
    const r = await Q(() => {
      const out = {}, m = window.F14.longMap();   // open ground to the horizon: the row under the horizon is nothing but far air
      for (const [tn, tod] of [['day', 0.5], ['dusk', 0.74], ['night', 0.05]]) for (const vd of [1, 4]) {
        for (const k of GFX.FX) GFX[k] = false; GFX.farLook = true; GFX.viewDist = vd; Engine.setLook({ fogK: vd });
        Engine.setMap(m); Engine.cam.x = 2.5; Engine.cam.y = 3.5; Engine.cam.dir = 0; Engine.cam.pitch = 0; Engine.cam.bob = 0; Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
        const keepLm = LANDMARKS._default; LANDMARKS._default = [];   // bare sky above the horizon: nothing drawn over it
        Engine.setTime(2); Engine.render([], tod); LANDMARKS._default = keepLm;
        const f = window.F14.fi, cap = window.F14.cap, w = f.w, y = f.horizon;
        const at = (yy) => { let r = 0, g = 0, b = 0; for (let k = 0; k < 7; k++) { const p = cap[yy * w + 20 + k * 45]; r += p & 255; g += (p >> 8) & 255; b += (p >> 16) & 255; } return [r / 7, g / 7, b / 7]; };
        const sky = at(y - 2), air = at(y + 1);
        out[tn + vd] = { sky, air, gap: Math.abs(sky[0] - air[0]) + Math.abs(sky[1] - air[1]) + Math.abs(sky[2] - air[2]), haze: f.haze, far: f.far };
      }
      PRESETS.apply('medium'); loadMap('clearing');
      return out;
    });
    for (const tn of ['day', 'dusk', 'night']) {
      assert.equal(r[tn + 4].far, true); assert.ok(r[tn + 4].haze > 0.8, tn + ' haze ' + r[tn + 4].haze);
      assert.ok(r[tn + 4].gap < 45, tn + ': the far air is within 45 of the sky (' + r[tn + 4].gap.toFixed(1) + ')');
    }
    assert.ok(r.day4.gap < r.day1.gap * 0.5, 'in daylight the far air matches the sky much better than the old fog colour (' + r.day4.gap.toFixed(0) + ' vs ' + r.day1.gap.toFixed(0) + ')');
    const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    assert.ok(lum(r.day4.air) > lum(r.dusk4.air) + 15 && lum(r.dusk4.air) > lum(r.night4.air) + 5, 'brightest by day, dimmer at dusk, darkest at night: ' + [r.day4.air, r.dusk4.air, r.night4.air].map(lum).map(Math.round));
    const warm = (c) => c[0] / Math.max(1, c[2]);
    assert.ok(warm(r.dusk4.air) > warm(r.day4.air) + 0.05, 'the dusk horizon is warmer than the day one (' + warm(r.dusk4.air).toFixed(2) + ' vs ' + warm(r.day4.air).toFixed(2) + ')');
    assert.ok(lum(r.night4.air) > 3, 'night air is the dark sky, not pure black (' + lum(r.night4.air).toFixed(1) + ')');
  });

  // ------------------------------------------------------------------------------------------------ indoors
  await step('indoors: the effective distance is capped at 1.4x; a dungeon at 4x is the same frame as at 1.4x', async () => {
    const r = await Q(() => {
      const out = {};
      for (const [id, sc] of [['catacombs', [2.6, 14.5, 0]], ['tavern', [8.5, 10.5, -1.57]], ['mausoleum', [19.5, 31.2, -1.57]]]) {
        const hs = [];
        for (const vd of [1.4, 4]) {
          for (const k of GFX.FX) GFX[k] = false; GFX.farLook = true; GFX.viewDist = vd; Engine.setLook({ fogK: vd });
          loadMap(id, { x: sc[0], y: sc[1], dir: sc[2] }); G.state = 'play'; G.fadeT = 0; G.tod = 0.6; Weather.hold('clear');
          const d = window.F14.pinned(G.ents.filter(e => e.kind !== 'npc' && e.kind !== 'enemy' && (!e.transient || e._flora)), G.tod);
          let x = 2166136261; for (let i = 0; i < d.length; i++) { x ^= d[i]; x = Math.imul(x, 16777619); }
          hs.push({ h: x >>> 0, info: Engine.farInfo() });
        }
        out[id] = { same: hs[0].h === hs[1].h, kEff: hs[1].info.kEff, far: hs[1].info.far, fogDist: hs[1].info.fogDist, base: G.map.fogDist, cap: hs[1].info.indoorCap };
      }
      PRESETS.apply('medium');
      return out;
    });
    for (const id of Object.keys(r)) {
      assert.equal(r[id].same, true, id + ': frame at 4x equals frame at 1.4x');
      assert.equal(r[id].kEff, 1.4, id + ' kEff'); assert.equal(r[id].far, false);
      assert.ok(Math.abs(r[id].fogDist - r[id].base * 1.4) < 1e-6, id + ' fogDist ' + r[id].fogDist);
    }
    const o = await Q(() => { for (const k of GFX.FX) GFX[k] = false; GFX.farLook = true; GFX.viewDist = 4; Engine.setLook({ fogK: 4 }); const sc = SCENES_IN_PAGE.clearing; loadMap('clearing', { x: sc.x, y: sc.y, dir: sc.dir }); Engine.render(G.ents, G.tod); const i = Engine.farInfo(); PRESETS.apply('medium'); return i; });
    assert.equal(o.kEff, 4, 'outdoors keeps the full multiplier'); assert.equal(o.far, true);
  });

  // ------------------------------------------------------------------------------------------------ sprites at distance
  await step('sprites: an enemy 22 tiles out is culled at 1x (fog 16) and drawn at 4x; past two base fog lengths it uses a small copy and the decorating hooks do not see it', async () => {
    const r = await Q(() => {
      const out = {}, m = window.F14.longMap();
      let seen = null; Engine.addPostHook(F => { seen = F.sprList.slice(); }, -999);
      const frame = (ents) => Uint32Array.from(window.F14.pinned(ents, 0.5));
      const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
      for (const [tag, sx] of [['mid', 24.5], ['far', 50.5]]) {
        for (const [vd, look] of [[1, true], [4, true], [4, false]]) {
          for (const k of GFX.FX) GFX[k] = false; GFX.farLook = look; GFX.viewDist = vd; Engine.setLook({ fogK: vd }); GFX.reduceMotion = true;
          Engine.setMap(m); Engine.cam.x = 2.5; Engine.cam.y = 3.5; Engine.cam.dir = 0; Engine.cam.pitch = 0; Engine.cam.bob = 0;
          const e = hydrate({ kind: 'enemy', type: 'hound', x: sx, y: 3.5 }); e.state = 'passive'; e.hidden = false;
          const a = frame([]), b = frame([e]);
          out[tag + vd + (look ? '' : 'plain')] = { screen: !!e._screen, listed: !!(seen && seen.includes(e)), px: diff(a, b), lod: Engine.farInfo().lodDist, mips: (Engine.sprites[e.sprite] && Engine.sprites[e.sprite]._mips ? Engine.sprites[e.sprite]._mips.length : 0), dist: e._screen && e._screen.dist };
        }
      }
      PRESETS.apply('medium'); loadMap('clearing');
      return out;
    });
    assert.equal(r.mid1.screen, false, 'culled at 1x'); assert.equal(r.mid1.px, 0);
    assert.equal(r.mid4.screen, true, 'on screen at 4x'); assert.ok(r.mid4.px > 0, 'its pixels are drawn at 4x (' + r.mid4.px + ')');
    assert.equal(r.mid4.listed, true, 'a sprite inside two base fog lengths (' + r.mid4.lod.toFixed(0) + ') is seen by the decorating hooks');
    assert.equal(r.far4.screen, true, 'on screen at 33 tiles'); assert.equal(r.far4.listed, false, 'beyond the LOD distance the hooks do not get it');
    assert.ok(r.far4.dist > r.far4.lod, 'it stands beyond the LOD distance (' + r.far4.dist.toFixed(1) + ' > ' + r.far4.lod.toFixed(1) + ')');
    assert.ok(r.far4.px > 0, 'a far sprite still draws (' + r.far4.px + ' px)'); assert.ok(r.far4.mips > 1, 'and from a smaller copy of the sprite');
    assert.equal(r.far4plain.listed, true, 'with the far look off every sprite is listed as before');
    assert.ok(r.far4plain.px > 0, 'and drawn');
  });

  // ------------------------------------------------------------------------------------------------ shimmer
  await step('floors and walls: far ground and walls do not shimmer when the camera creeps forward (far look vs plain 4x)', async () => {
    const r = await Q(() => {
      const out = {};
      for (const name of ['oakhaven', 'clearing', 'deepwoods']) {
        const sc = SCENES_IN_PAGE[name];
        const row = {};
        for (const look of [false, true]) {
          for (const k of GFX.FX) GFX[k] = false; GFX.farLook = look; GFX.viewDist = 4; Engine.setLook({ fogK: 4 });
          loadMap(sc.map, { x: sc.x, y: sc.y, dir: sc.dir }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Weather.hold('clear'); GFX.reduceMotion = true;
          const base0 = G.map.fogDist || 12, bands = [[0.6, 0.85], [0.85, 9]], tot = [0, 0], cnt = [0, 0];
          const ents = G.ents.filter(e => e.kind !== 'enemy' && e.kind !== 'npc');
          let prev = null;
          for (let k = 0; k < 10; k++) {
            Engine.cam.x = sc.x + 0.05 * k * Math.cos(sc.dir); Engine.cam.y = sc.y + 0.05 * k * Math.sin(sc.dir);
            Engine.setTime(2); Engine.render(ents, G.tod);
            const cap = { fb: window.F14.cap, db: window.F14.fi.dbuf };
            const mb = (() => { const a = new Uint8Array(cap.fb.length); for (let i = 0; i < a.length; i++) a[i] = Engine.materialAt((i % 320), ((i / 320) | 0)); return a; })();
            cap.mb = mb;
            if (prev) for (let i = 0; i < cap.fb.length; i += 1) {
              if (cap.mb[i] !== 5 || prev.mb[i] !== 5) continue;
              const d = cap.db[i], d0 = prev.db[i];
              for (let b = 0; b < 2; b++) if (d >= bands[b][0] * base0 && d < bands[b][1] * base0 && d0 >= bands[b][0] * base0 && d0 < bands[b][1] * base0) {
                const a = cap.fb[i], c = prev.fb[i];
                tot[b] += Math.abs((a & 255) - (c & 255)) + Math.abs(((a >> 8) & 255) - ((c >> 8) & 255)) + Math.abs(((a >> 16) & 255) - ((c >> 16) & 255)); cnt[b]++;
              }
            }
            prev = cap;
          }
          row[look ? 'look' : 'plain'] = tot.map((t, i) => t / Math.max(1, cnt[i]) / 3);
        }
        out[name] = row;
      }
      PRESETS.apply('medium');
      return out;
    });
    for (const name of Object.keys(r)) {
      assert.ok(r[name].look[0] < r[name].plain[0] * 0.6, name + ' mid band ' + r[name].look[0].toFixed(1) + ' vs ' + r[name].plain[0].toFixed(1));
      assert.ok(r[name].look[1] < 1.5, name + ': past 0.85 base fog lengths ground frames barely change (' + r[name].look[1].toFixed(2) + ' vs plain ' + r[name].plain[1].toFixed(1) + ')');
    }
  });

  // ------------------------------------------------------------------------------------------------ rays reach the end
  await step('rays: a wall 97 cells of ray walk away on a long map is drawn at 4x; wall depth never has holes between 1x and 4x on the real maps', async () => {
    const r = await Q(() => {
      const out = {};
      const m = window.F14.longMap();
      const ents = [];
      for (const vd of [1, 4]) {
        for (const k of GFX.FX) GFX[k] = false; GFX.farLook = true; GFX.viewDist = vd; Engine.setLook({ fogK: vd });
        Engine.setMap(m); Engine.cam.x = 2.5; Engine.cam.y = 3.5; Engine.cam.dir = 0; Engine.cam.pitch = 0;
        Engine.setTime(2); Engine.render(ents, 0.5);
        const f = window.F14.fi; out['long' + vd] = f.dbuf[(f.horizon - 1) * f.w + 160];
      }
      PRESETS.apply('medium');
      // the real maps: wall depth at the row above the horizon is the same at 1x and at 4x (the far look changes colours, never geometry)
      let holes = 0, cols = 0;
      for (const name of ['oakhaven', 'clearing', 'deepwoods']) for (const dd of [0, 0.8, 1.7, 3.1, 4.4]) {
        const sc = SCENES_IN_PAGE[name]; const ds = [];
        for (const vd of [1, 4]) {
          for (const k of GFX.FX) GFX[k] = false; GFX.farLook = true; GFX.viewDist = vd; Engine.setLook({ fogK: vd });
          loadMap(sc.map, { x: sc.x, y: sc.y, dir: sc.dir + dd }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Weather.hold('clear'); Engine.cam.pitch = 0; Engine.cam.bob = 0;
          Engine.render([], G.tod); const f = window.F14.fi; ds.push(Array.from({ length: 80 }, (_, i) => f.dbuf[(f.horizon - 2) * f.w + i * 4]));
        }
        for (let i = 0; i < 80; i++) { cols++; if (Math.abs(ds[0][i] - ds[1][i]) > 1e-4 && !(ds[0][i] > 1e8 && ds[1][i] > 1e8)) holes++; }
      }
      PRESETS.apply('medium');
      out.holes = holes; out.cols = cols;
      return out;
    });
    assert.ok(Math.abs(r.long4 - 96.5) < 1, 'the end wall of a 100-cell map, 97 cells of ray walk away, is hit at 4x: ' + r.long4);
    assert.equal(r.holes, 0, r.holes + ' of ' + r.cols + ' columns differ between 1x and 4x');
  });

  // ------------------------------------------------------------------------------------------------ gameplay
  await step('gameplay: Dread\'s phantom spot, enemy-visible state and picking read the map\'s own distances, not the view distance', async () => {
    const r = await Q(() => {
      const out = [];
      const sc = SCENES_IN_PAGE.clearing;
      for (const vd of [0.6, 0.8, 1, 1.4, 2, 4]) {
        GFX.viewDist = vd; Engine.setLook({ fogK: vd });
        loadMap('clearing', { x: sc.x, y: sc.y, dir: sc.dir }); G.state = 'play'; G.fadeT = 0;
        DREAD.seed(11); const spot = DREAD.foeSpot();
        out.push(JSON.stringify(spot));
      }
      PRESETS.apply('medium');
      return out;
    });
    assert.ok(r[0] !== 'null', 'the clearing has a long sight-line for the phantom');
    assert.ok(r.every(s => s === r[0]), 'the same spot at every view distance: ' + JSON.stringify(r));
    // the source: nothing that decides a fight reads the setting (flora's sway cut-off and the renderer are looks)
    const root = path.join(__dirname, '..', 'js');
    const readers = fs.readdirSync(root).filter(f => f.endsWith('.js')).filter(f => /GFX\.viewDist|\{\s*fogK\s*:/.test(fs.readFileSync(path.join(root, f), 'utf8'))).sort();
    assert.deepEqual(readers, ['far14.js', 'flora.js', 'gfx.js', 'max20.js', 'presets.js'], 'only the renderer, its settings (max20.js: the first-launch preset keeps a custom view distance) and the grass sway read the view distance: ' + readers);
  });

  const traceFor = async (vd) => {
    const b = await bootPage(browser); errors.push(...b.errors);
    const res = await b.page.evaluate(({ vd }) => {
      window.requestAnimationFrame = () => 0;
      G.state = 'play'; G.noise = 2; G.keys = {};
      let vt = 1000000; performance.now = () => vt; Date.now = () => 1700000000000 + vt;
      PRESETS.apply('medium'); GFX.viewDist = vd; Engine.setLook({ fogK: vd });
      let sd = 1, calls = 0, phase = 0; const seedTo = (v, ph) => { sd = v % 2147483647 || 1; phase = ph; };
      Math.random = () => { if (phase === 0) calls++; return (sd = (sd * 16807) % 2147483647) / 2147483647; };
      const traces = {};
      for (const [mapId, sc] of [['clearing', [20.5, 32.5, -1.5708]], ['deepwoods', [27.5, 30.5, -1.57]]]) {
        seedTo(12345, 0); calls = 0;
        loadMap(mapId, { x: sc[0], y: sc[1], dir: sc[2] }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Weather.hold('clear'); G.player.hp = G.player.hpMax; G.noise = 2;
        const ents = G.map.entities, types = ['hound', 'proctor', 'quiet', 'legionnaire', 'hound', 'proctor'];
        for (let i = 0; i < 6; i++) ents.push(hydrate({ kind: 'enemy', type: types[i], x: sc[0] + (i - 2.5) * 2.2, y: sc[1] - 6 - i * 3 }));
        G.ents = G.map.entities;
        const tr = [];
        for (let step = 0; step < 240; step++) {
          G.keys = step % 40 < 20 ? { w: true } : {};
          vt += 50; seedTo(step * 7919 + 17, 0); update(0.05); seedTo(step * 104729 + 3, 1); Engine.render(G.ents, G.tod);
          if (step % 10 === 0) {
            const pk = Engine.pick(G.ents, 14), pw = Engine.pickWall(3);
            tr.push([step, +Engine.cam.x.toFixed(4), +Engine.cam.y.toFixed(4), G.player.hp, +(G.noise || 0).toFixed(3), pk ? (pk.id || pk.type) : '-', pw ? pw.x + ',' + pw.y : '-',
              G.ents.filter(e => e.kind === 'enemy').map(e => [e.state, +e.x.toFixed(3), +e.y.toFixed(3), e.hp].join(':')).join('|')].join(' '));
          }
        }
        traces[mapId] = { tr, calls };
      }
      return traces;
    }, { vd });
    await b.page.close();
    return res;
  };
  await step('gameplay: 240 steps of AI, detection, noise, picking and the gameplay random stream are the same at view distance 1 and 4 (and 0.8, 2.5)', async () => {
    const t1 = await traceFor(1), t4 = await traceFor(4), t08 = await traceFor(0.8), t25 = await traceFor(2.5);
    for (const m of ['clearing', 'deepwoods']) {
      for (const [tag, t] of [['4', t4], ['0.8', t08], ['2.5', t25]]) {
        const a = t1[m].tr, b = t[m].tr; let first = -1; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { first = i; break; }
        assert.equal(first, -1, m + ' at ' + tag + ' differs from 1 at sample ' + first + ': ' + (first >= 0 ? a[first].slice(0, 200) + ' // ' + b[first].slice(0, 200) : ''));
        assert.ok(Math.abs(t1[m].calls - t[m].calls) <= t1[m].calls * 0.05, m + ' at ' + tag + ': random draws made inside update() ' + t[m].calls + ' vs ' + t1[m].calls + ' (leaf and mote timers run off the wall clock; AI draws are in the trace)');
      }
    }
  });

  // ------------------------------------------------------------------------------------------------ cost
  let cost = null;
  await step('cost: median frame time at 1x and 2x for view distance 1, 2, 3, 4 in three scenes with 12 enemies (table printed)', async () => {
    cost = await Q(() => { window.requestAnimationFrame = () => 0; PRESETS.apply('medium'); return FAR14.measure({ frames: 15, runs: 5 }); });
    for (const sc of Object.keys(cost)) for (const k of Object.keys(cost[sc])) assert.ok(cost[sc][k] > 0 && cost[sc][k] < 200, sc + ' ' + k + ' ' + cost[sc][k]);
    console.log('FRAME COST ms per Engine.render, median (this machine, headless Chromium, 12 enemies in view):');
    console.log('scene        ' + Object.keys(cost.oakhaven).join('   '));
    for (const sc of Object.keys(cost)) console.log(sc.padEnd(12) + Object.values(cost[sc]).map(v => String(v.toFixed(2)).padStart(6)).join('   '));
    fs.writeFileSync(path.join(SHOT_DIR, 'frame-cost.json'), JSON.stringify(cost, null, 1));
  });

  // ------------------------------------------------------------------------------------------------ options at 640x400
  await step('Options: the far-look switch works and persists, and the graphics menu fits 640x400 with Ultra and the new rows', async () => {
    await Q(() => { PRESETS.apply('medium'); G.state = 'panel'; renderMenu(); });
    await pg.locator('#mn-gfx').click();
    assert.equal(await pg.locator('#gfx-p-ultra').count(), 1, 'an Ultra button'); assert.equal(await pg.locator('#gfx-farlook').count(), 1, 'a far-look switch');
    assert.equal(await pg.locator('#gfx-farlook').textContent(), 'On');
    await pg.locator('#gfx-farlook').click();
    let s = await Q(() => ({ look: GFX.farLook, stored: JSON.parse(localStorage.getItem('echoes-far14')).farLook }));
    assert.deepEqual(s, { look: false, stored: false });
    await pg.locator('#gfx-farlook').click(); s = await Q(() => ({ look: GFX.farLook, cur: PRESETS.current() })); assert.equal(s.look, true);
    await pg.locator('#gfx-p-ultra').click(); assert.equal(await Q(() => PRESETS.current()), 'ultra');
    assert.equal(await pg.locator('#gfx-p-ultra').getAttribute('aria-pressed'), 'true');
    await pg.locator('#gfx-p-medium').click();
    await pg.setViewportSize({ width: 640, height: 400 });
    await Q(() => { renderAccessibilityMenu(); });
    const r = await Q(() => {
      const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel, bad = [];
      for (const b of Array.from(panel.querySelectorAll('button:enabled'))) {
        b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const q2 = b.getBoundingClientRect();
        if (q2.left < -1 || q2.right > innerWidth + 1 || q2.top < -1 || q2.bottom > innerHeight + 1 || q2.width < 4) bad.push((b.id || b.textContent) + ' ' + [q2.left, q2.right, q2.top, q2.bottom].map(Math.round));
      }
      return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, bad };
    });
    assert.equal(r.panelX && r.gridX && r.docX, true, 'no horizontal overflow ' + JSON.stringify(r)); assert.deepEqual(r.bad, []);
    await Q(() => { PRESETS.setViewDist(4); renderAccessibilityMenu(); document.getElementById('gfx-vd-val').scrollIntoView({ block: 'center' }); });
    const w640 = await Q(() => { const v = document.getElementById('gfx-vd-val'), g = v.parentNode.getBoundingClientRect(); return { right: g.right, left: g.left, w: innerWidth, text: v.textContent }; });
    assert.ok(w640.right <= w640.w + 1 && w640.left >= 0, 'the "4.00 Horizon" label fits: ' + JSON.stringify(w640));
    await pg.screenshot({ path: path.join(SHOT_DIR, 'options-far-640x400.png') });
    await pg.setViewportSize({ width: 1280, height: 800 });
    await Q(() => { PRESETS.apply('medium'); closeModal(); G.state = 'play'; });
  });

  // ------------------------------------------------------------------------------------------------ screenshots
  if (baseSrc) await step('screenshots: before (old engine at its 1.4x ceiling) and after (4x) at the same camera, day and dusk, and a dungeon', async () => {
    const shots = await Q(() => {
      const out = {};
      const grab = (scale) => { const c = document.createElement('canvas'); c.width = 320 * scale; c.height = 150 * scale; c.getContext('2d').drawImage(Engine.canvas, 0, 0, c.width, c.height, 0, 0, c.width, c.height); return c.toDataURL('image/png'); };
      const sheets = [['oakhaven', 'day', 0.5], ['oakhaven', 'dusk', 0.74], ['clearing', 'day', 0.5], ['clearing', 'dusk', 0.74], ['deepwoods', 'day', 0.5], ['deepwoods', 'dusk', 0.74], ['catacombs', 'dungeon', 0.5]];
      for (const [name, tn, tod] of sheets) {
        const sc = SCENES_IN_PAGE[name];
        const base = { sc, tod, scale: 2, crowd: false, light: name === 'catacombs' };
        let ents = window.F14.stage(Object.assign({ vd: 1.4 }, base)); for (const e of ents) if (e.kind === 'enemy') e.hidden = true;
        Engine.setTime(2); E2.render(ents, tod, { playerLight: base.light ? { x: sc.x, y: sc.y, r: 6, cr: 60, cg: 40, cb: 20 } : null }); out[name + '-' + tn + '-before'] = grab(2);
        for (const vd of [1, 2, 4]) {
          ents = window.F14.stage(Object.assign({ vd }, base)); for (const e of ents) if (e.kind === 'enemy') e.hidden = true;
          Engine.setTime(2); GFX.farLook = true; Engine.render(ents, tod, { playerLight: base.light ? { x: sc.x, y: sc.y, r: 6, cr: 60, cg: 40, cb: 20 } : null }); out[name + '-' + tn + '-after-vd' + vd] = grab(2);
        }
      }
      PRESETS.apply('medium');
      return out;
    });
    for (const k of Object.keys(shots)) fs.writeFileSync(path.join(SHOT_DIR, k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64'));
    assert.ok(Object.keys(shots).length >= 28);
  });

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
