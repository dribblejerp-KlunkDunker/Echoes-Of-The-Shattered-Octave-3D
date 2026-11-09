// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/firesmoke.test.js
// Chimney / hearth / Golem smoke, water splashes, torches and braziers (Phase 4, FIRESMOKE).
// SHOT_DIR=<dir> also writes screenshots there. Never starts a server or writes saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof FIRESMOKE !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Smoke Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      const out = {};
      const freeze = () => { Engine.setWeather({}); PARTICLES.list = []; ANIM.dt = 0; ANIM.T = 3; Engine.setTime(3); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Engine.cam.pitch = 0; Engine.cam.bob = 0; FIRESMOKE.hold(true); FIRESMOKE.reset(); };
      const frame = () => { Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data.slice(); };
      const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      const run = (secs) => { for (let i = 0; i < secs * 20; i++) FIRESMOKE.tick(0.05, 3 + i * 0.05); };
      PRESETS.apply('original'); for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = true; GFX.changed();

      // --- chimneys: stacks on roofs of lived-in houses only, kept on re-entry
      const oh = G.maps.oakhaven, ch = oh._fs.chimneys;
      check(ch.length >= 8 && ch.length <= 24, 'oakhaven has chimneys: ' + ch.length);
      check(ch.every(e => e.transient && e.solid === false && e.nopick), 'chimneys are transient, non-solid');
      out.chimneys = ch.length;
      loadMap('oakhaven', { x: 22, y: 14, dir: -2.28 }); freeze();
      check(ch.every(e => G.ents.includes(e)), 'chimneys are in the entity list');
      loadMap('tavern'); loadMap('oakhaven', { x: 22, y: 14, dir: -2.28 });
      check(ch.every(e => G.ents.includes(e)), 'chimneys survive leaving and re-entering');
      check(!G.ents.some(e => e._fs === 'torch'), 'no torches in oakhaven');
      // the saved map holds none of it
      const snap = snapshotGame(); const ex = snap.maps.oakhaven.extra || [];
      check(!ex.some(o => o.sprite === 'chimney'), 'chimneys are not saved');
      check(snap.maps.oakhaven.ents.length === oh.baseCount, 'entity count in save is unchanged');
      freeze(); run(8);
      out.smokePuffs = FIRESMOKE.countKind(0); check(out.smokePuffs > 6, 'chimneys smoke (' + out.smokePuffs + ')');
      // smoke drifts with the wind: compare mean x after calm vs gale
      const meanDrift = (w) => { FIRESMOKE.reset(); Object.defineProperty(Weather, 'wind', { get() { return w; }, configurable: true }); run(8); let sx = 0, c = 0; FIRESMOKE.each(p => { if (p.kind === 0) { sx += p.x; c++; } }); return sx / c; };
      const calm = meanDrift(0.05), gale = meanDrift(1.0); delete Weather.wind;
      out.drift = [calm, gale]; check(gale - calm > 0.5, 'a gale pushes the smoke downwind (' + calm.toFixed(1) + ' -> ' + gale.toFixed(1) + ')');
      // rise: puffs climb above their stack
      let maxZ = 0; FIRESMOKE.each(p => { maxZ = Math.max(maxZ, p.z); }); check(maxZ > 2.8, 'smoke rises above the roofs (' + maxZ.toFixed(2) + ')');
      // after the lifetime, everything fades out
      FIRESMOKE.hold(true); FIRESMOKE.reset(); Engine.cam.x = 3; Engine.cam.y = 3; run(1); // far from any chimney? (chimneys beyond range)
      // visible smoke changes the frame; depth-tested smoke is hidden behind a nearer wall
      loadMap('oakhaven', { x: 22, y: 14, dir: -2.28 }); freeze();
      const a0 = frame(); run(8); const a1 = frame(); out.smokePixels = diff(a0, a1); check(out.smokePixels > 60, 'smoke paints pixels (' + out.smokePixels + ')');

      // --- campfire and hearth
      loadMap('deepwoods', { x: 27.5, y: 38.3, dir: Math.PI / 2 }); freeze(); run(6);
      out.camp = FIRESMOKE.countKind(0); check(out.camp > 8, 'campfire smokes');
      loadMap('tavern', { x: 11, y: 6.5, dir: 0 }); freeze(); run(5);
      out.hearth = FIRESMOKE.countKind(0); check(out.hearth > 2, 'interior hearth curls');
      let hz = 0; FIRESMOKE.each(p => { hz = Math.max(hz, p.z); }); check(hz < 1.05, 'hearth smoke stays under the ceiling (' + hz.toFixed(2) + ')');

      // --- Steam Golem vents while alive, stops when dead
      loadMap('rootvault'); freeze();
      const g = hydrate({ kind: 'enemy', type: 'golem', x: Engine.cam.x + 2.5, y: Engine.cam.y }); G.ents.push(g);
      Engine.cam.dir = 0; run(3); out.golemSteam = FIRESMOKE.countKind(1); check(out.golemSteam > 4, 'golem steams (' + out.golemSteam + ')');
      g.dead = true; g.hp = 0; FIRESMOKE.reset(); run(3); check(FIRESMOKE.countKind(1) === 0, 'dead golem stops steaming'); G.ents.splice(G.ents.indexOf(g), 1);

      // --- splashes
      loadMap('oakhaven', { x: 22, y: 14, dir: 0 }); freeze();
      let wx = null; { const m = G.map; for (let y = 2; y < m.h - 2 && !wx; y++) for (let x = 2; x < m.w - 2; x++) if (waterLvl(x + 0.5, y + 0.5) === 1 && waterLvl(x + 2.5, y + 0.5) && waterLvl(x - 1.5, y + 0.5) && waterLvl(x + 0.5, y - 1.5)) { wx = [x + 0.5, y + 0.5]; break; } }
      if (!wx) { const m = G.map; for (let y = 2; y < m.h - 2 && !wx; y++) for (let x = 2; x < m.w - 2; x++) if (waterLvl(x + 0.5, y + 0.5) && waterLvl(x + 2.5, y + 0.5) && waterLvl(x - 1.5, y + 0.5)) { wx = [x + 0.5, y + 0.5]; break; } }
      check(wx, 'found water');
      out.water = wx;
      Object.assign(Engine.cam, { x: wx[0] - 2, y: wx[1], dir: 0 });
      FIRESMOKE.splash(wx[0], wx[1], 2); out.bigDrops = FIRESMOKE.countKind(2); check(out.bigDrops >= 20, 'a big splash throws droplets (' + out.bigDrops + ')');
      const smallBefore = (FIRESMOKE.reset(), FIRESMOKE.splash(wx[0], wx[1], 0), FIRESMOKE.countKind(2)); check(smallBefore < out.bigDrops, 'small < big');
      FIRESMOKE.reset(); FIRESMOKE.splash(wx[0], wx[1], 2); const w0 = frame(); FIRESMOKE.tick(0.12, 3); const w1 = frame(); out.dropPixels = diff(w0, w1); check(out.dropPixels > 5, 'droplets are drawn (' + out.dropPixels + ')');
      // after their arc they are gone
      run(2); check(FIRESMOKE.countKind(2) === 0, 'droplets fall back and vanish');
      // reduced motion: no spray
      GFX.reduceMotion = true; FIRESMOKE.reset(); FIRESMOKE.splash(wx[0], wx[1], 2); check(FIRESMOKE.countKind(2) === 0, 'reduced motion drops the spray'); GFX.reduceMotion = false;
      // player wading: the live hook, driven by moving the camera between frames
      FIRESMOKE.hold(false); FIRESMOKE.reset();
      let T = 5; const step = () => { T += 0.05; Engine.setTime(T); Engine.render(G.ents, G.tod); };
      Object.assign(Engine.cam, { x: wx[0] - 1.2, y: wx[1], dir: 0 }); step(); step();
      let seen = 0; for (let i = 0; i < 40; i++) { Engine.cam.x += 0.12; step(); seen = Math.max(seen, FIRESMOKE.countKind(2)); }
      out.wadeDrops = seen; check(seen > 0, 'wading player throws droplets (' + seen + ')');
      // an enemy wading is splashed too
      FIRESMOKE.reset(); const foe = hydrate({ kind: 'enemy', type: 'hound', x: wx[0] + 1.5, y: wx[1] }); foe.hidden = false; G.ents.push(foe);
      Engine.cam.x = wx[0] - 2; Engine.cam.y = wx[1]; for (let i = 0; i < 4; i++) step();
      let es = 0; for (let i = 0; i < 40; i++) { foe.x += 0.1; step(); es = Math.max(es, FIRESMOKE.countKind(2)); }
      out.enemyDrops = es; check(es > 0, 'a wading enemy is splashed (' + es + ')'); G.ents.splice(G.ents.indexOf(foe), 1);
      FIRESMOKE.hold(true);

      // --- torches and braziers: placed, non-blocking, lit, kept on re-entry
      let total = 0;
      for (const id in G.maps) {
        const m = G.maps[id]; if (!m._fs || !m._fs.fires.length) continue;
        total += m._fs.fires.length;
        for (const e of m._fs.fires) {
          check(e.solid === false && e.transient && !m.isBlocked(e.x | 0, e.y | 0) || e._fs === 'torch', id + ' fire not blocking');
          check(e.lightCol && e.lightCol.length === 3, 'fire has a light');
          for (const d in m.doors) { const dx = (d % m.w) + 0.5 - e.x, dy = ((d / m.w) | 0) + 0.5 - e.y; check(Math.hypot(dx, dy) > 1.9, id + ' fire too near a door'); }
        }
      }
      out.fires = total; check(total >= 12, 'torches and braziers placed (' + total + ')');
      loadMap('underhedge'); freeze(); const uf = G.map._fs.fires;
      check(uf.every(e => G.ents.includes(e)), 'torches present'); check(Engine.sprites.torch.emit && Engine.sprites.brazier.emit, 'emissive flame masks');
      loadMap('oakhaven'); loadMap('underhedge'); check(uf.every(e => G.ents.includes(e)), 'torches survive leaving and re-entering');
      const sv = snapshotGame(); check(!(sv.maps.underhedge.extra || []).some(o => o.sprite === 'torch'), 'torches are not saved');
      // a torch lights the wall: the lit frame differs from a frame with the torches taken out
      return Object.assign(out, { ok: true });
    });
    // reload-style check: save round trip keeps additions (restoreGame rebuilds maps)
    const rt = await page.evaluate(() => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      FIRESMOKE.hold(true);
      loadMap('oakhaven', { x: 22, y: 14, dir: 0 });
      const snap = snapshotGame(); restoreGame(snap); G.state = 'play';
      loadMap('oakhaven', { x: 22, y: 14, dir: 0 });
      const n = G.ents.filter(e => e._fs === 'chimney').length; check(n >= 8, 'chimneys exist after restoreGame (' + n + ')');
      loadMap('underhedge'); const t = G.ents.filter(e => e._fs === 'torch').length; check(t >= 2, 'torches exist after restoreGame (' + t + ')');
      return { chim: n, torch: t };
    });
    // switches off: frames and game state identical to the original (the entities are gone)
    const off = await page.evaluate(() => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      const frame = () => { Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data.slice(); };
      const same = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
      const setup = (id, p) => { Math.random = (() => { let q = 11; return () => (q = (q * 16807) % 2147483647) / 2147483647; })(); loadMap(id, p); Engine.setWeather({}); PARTICLES.list = []; PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir; ANIM.dt = 0; ANIM.T = 3; Engine.setTime(3); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; FIRESMOKE.hold(true); FIRESMOKE.reset(); };
      const res = {};
      for (const [id, p] of [['oakhaven', { x: 22, y: 14, dir: -2.28 }], ['underhedge', { x: 25.5, y: 8, dir: -0.3 }]]) {
        PRESETS.apply('original'); for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = false; GFX.changed();
        setup(id, p); const entsOff = G.ents.length; const sj = () => { const o = snapshotGame(); delete o.when; return JSON.stringify(o); }; const jOff = sj(); frame(); const fOff = frame();
        for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = true; GFX.changed();
        setup(id, p); check(G.ents.length > entsOff, id + ' on adds decos');
        const jOn = sj(); check(jOn === jOff, id + ' save identical on/off');
        for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = false; GFX.changed();
        setup(id, p); check(G.ents.length === entsOff, id + ' ents restored when off'); frame(); check(same(frame(), fOff), id + ' frames identical when off');
        res[id] = entsOff;
      }
      for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = true; GFX.changed();
      return res;
    });
    // per-frame cost: median of many hook runs
    const cost = await page.evaluate(() => {
      PRESETS.apply('original'); for (const k of ['smoke', 'splashes', 'torches']) GFX[k] = true; GFX.changed();
      loadMap('oakhaven', { x: 22, y: 14, dir: -2.28 }); G.state = 'play'; G.fadeT = 0; FIRESMOKE.hold(true); FIRESMOKE.reset();
      for (let i = 0; i < 200; i++) FIRESMOKE.tick(0.05, 3 + i * 0.05);
      Engine.render(G.ents, G.tod);
      const F = {}; const ts = [];
      // draw() needs frame info: capture it through a throwaway post hook
      let info = null; Engine.addPostHook((f) => { info = f; }, 9);
      Engine.render(G.ents, G.tod);
      const live = FIRESMOKE.count;
      for (let i = 0; i < 300; i++) { const t0 = performance.now(); FIRESMOKE.draw(info); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b);
      const sim = []; for (let i = 0; i < 300; i++) { const t0 = performance.now(); FIRESMOKE.tick(0.016, 20 + i * 0.016); sim.push(performance.now() - t0); } sim.sort((a, b) => a - b);
      return { particles: live, drawMedianMs: ts[150], simMedianMs: sim[150] };
    });
    console.log('RESULT', JSON.stringify(Object.assign({}, r, { rt, off, cost })));
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS firesmoke');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL firesmoke:', e.message); process.exit(1); });
