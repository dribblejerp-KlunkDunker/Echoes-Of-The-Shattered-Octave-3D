// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4211 SHOT_DIR=/some/dir node test/r11harbour.test.js
// Covers js/r11harbour.js and js/r11water.js (ROADMAP R11 phase 4, teams HARBOUR and WATER): Port Cantabile's Long Mole in
// the realistic look.
//   - the dresser answers for cantabile_harbour only; once its models are in, the map's mooring posts, boats, coils,
//     casks, crates, street lamps, gulls, the derrick, the Mole-bell, the mast and its rungs have bodies and no billboard
//     (R11.replaced()), and are still the map's own entities (the bell can still be rung);
//   - the zigzag's wall-top lamps keep their billboards; there is an iron ring every few paces in the Mole's faces;
//   - the boats ride the entity's own yOff;
//   - the water: darker than the sky and green, a mirror pass on Ultra and none on Phone, one material for both;
//   - leaving the map takes the harbour's bodies with it, and nothing throws.
// Writes r11harbour-ultra.png and r11harbour-phone.png (the harbour's bench camera) into SHOT_DIR.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4211';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11harbour-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'check failed'); };

const HELPERS = () => {
  const S = window.S = {};
  window.requestAnimationFrame = () => 0;   // the game loop must not render between our frames
  S.pin = (fn) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
  };
  S.go = (B) => S.pin(() => {
    G.state = 'paused'; G.tod = B.tod; loadMap(B.map, { x: B.x, y: B.y, dir: B.dir }); G.fadeT = 0; G.tod = B.tod;
    Engine.cam.pitch = B.pitch || 0; Engine.cam.bob = 0; try { Weather.hold(B.weather || 'overcast'); } catch (e) { /* none */ } G.state = 'play';
  });
  S.frame = (n) => { for (let i = 0; i < (n || 2); i++) S.pin(() => render()); try { R11HUD.update(); } catch (e) { /* none */ } try { document.getElementById('msgs').style.visibility = 'hidden'; } catch (e) { /* none */ } };
  // mean sRGB colour and luma of a region of the 3D view (fractions of the top 150 of 200 logical rows), read after a frame
  S.stats = (x0, y0, x1, y1) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), vh = c.height * 0.75;
    const X0 = (x0 * c.width) | 0, W = Math.max(1, ((x1 - x0) * c.width) | 0), H = Math.max(1, ((y1 - y0) * vh) | 0), Y0 = (c.height - y1 * vh) | 0;
    const b = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    let r = 0, g = 0, bl = 0; const n = W * H;
    for (let i = 0; i < b.length; i += 4) { r += b[i]; g += b[i + 1]; bl += b[i + 2]; }
    return { r: r / n, g: g / n, b: bl / n, L: (0.2126 * r + 0.7152 * g + 0.0722 * bl) / n };
  };
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(900000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r11(core|harbour|water)/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(([o]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 }, tier: o.tier, tierManual: true })); } catch (e) { /* none */ } }, [{ automation: true, force: true, tier: 'ultra' }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 900000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 900000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Harbour Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.waitForFunction(() => window.R11 && (R11.ready || R11.failed()), null, { timeout: 900000 });
  await page.evaluate(HELPERS);
  await page.evaluate(() => { if (window.R11BENCH) R11BENCH.renderScale = () => 1; if (R11.tier() !== 'ultra') R11.setTier('ultra'); });

  await step('the harbour dresser is registered, and answers for cantabile_harbour only', async () => {
    const r = await page.evaluate(() => ({ reg: Array.isArray(window.R11DRESSERS) && window.R11DRESSERS.includes(window.R11HARBOUR), h: R11HARBOUR.maps({ id: 'cantabile_harbour' }), o: R11HARBOUR.maps({ id: 'oakhaven' }), n: R11HARBOUR.maps(null), water: typeof R11WATER.material }));
    ok(r.reg && r.h === true && r.o === false && r.n === false && r.water === 'function', JSON.stringify(r));
  });

  let st = null;
  await step('at the Mole, once the kit is in: posts, boats, lamps, the derrick, the bell and the mast have bodies and no billboard', async () => {
    st = await page.evaluate(async () => {
      S.go(R11HARBOUR.benchCam); S.frame(3);
      const before = R11.stats.billboards;
      const ready = await R11HARBOUR.ready(); S.frame(3);
      const m = G.map, rep = R11.replaced(), h = R11HARBOUR.state();
      const by = (f) => m.entities.filter(f), all = (list) => list.length > 0 && list.every((e) => rep.has(e) && m.entities.includes(e));
      const bell = m.entities.find((e) => e.sprite === 'p17c_molebell');
      return { ready, h, before, after: R11.stats.billboards, active: R11.active(),
        posts: all(by((e) => e.sprite === 'p12r_post')), boats: all(m.p17cBoats), nBoats: m.p17cBoats.length, nPosts: by((e) => e.sprite === 'p12r_post').length,
        derrick: all(by((e) => e.sprite === 'p17c_derrick')), bell: all([bell]), bellUse: bell.use, mast: all(by((e) => e.sprite === 'p17c_mast')), rungs: all(by((e) => e.sprite === 'ladder' && e.use === 'p17c_mast')),
        gulls: all(by((e) => e.sprite === 'p17c_gull')), coils: all(by((e) => e.sprite === 'p17c_coil')),
        zig: by((e) => e._lampZ != null).length, zigKept: by((e) => e._lampZ != null).every((e) => !rep.has(e)), kestrel: by((e) => e._p17cKestrel).every((e) => !rep.has(e)),
        people: by((e) => e.kind === 'npc').every((e) => !rep.has(e)) };
    });
    await page.screenshot({ path: path.join(SHOT_DIR, 'r11harbour-ultra.png') });
    ok(st.ready && st.active && st.h.loaded, 'not ready ' + JSON.stringify(st.h));
    ok(st.posts && st.boats && st.derrick && st.bell && st.mast && st.rungs && st.gulls && st.coils, 'a body is missing ' + JSON.stringify(st));
    ok(st.h.bollards === st.nPosts && st.h.boats === st.nBoats && st.h.tower === 1 && st.h.derrick === 1 && st.h.bell === 1 && st.h.lamps >= 20, JSON.stringify(st.h));
    ok(st.bellUse === 'p17c_bellrope', 'the bell is still the map\'s bell');
    ok(st.after <= st.before - st.h.replaced + 2, 'billboards ' + st.before + ' -> ' + st.after + ' with ' + st.h.replaced + ' replaced');
  });

  await step('the zigzag\'s lamps, the Kestrel and the people keep their billboards; an iron ring every few paces; boats lie to their posts', async () => {
    ok(st.zig >= 6 && st.zigKept && st.kestrel && st.people, JSON.stringify({ zig: st.zig, kept: st.zigKept, kestrel: st.kestrel, people: st.people }));
    ok(st.h.rings >= 20 && st.h.ropes >= 3 && st.h.ropes <= st.nPosts, JSON.stringify(st.h));
  });

  await step('the boats ride the entity\'s own yOff', async () => {
    const r = await page.evaluate(() => {
      const b = G.map.p17cBoats[0], y0 = R11HARBOUR.state().boatY, was = b.yOff;
      b.yOff = was + 0.2; S.frame(1); const y1 = R11HARBOUR.state().boatY; b.yOff = was; S.frame(1);
      return { y0, y1, back: R11HARBOUR.state().boatY, zk: R3D.ZK };
    });
    ok(Math.abs((r.y1 - r.y0) - 0.2 * r.zk) < 0.002 && Math.abs(r.back - r.y0) < 0.002, JSON.stringify(r));
  });

  await step('the water: darker than the sky and green; a mirror pass on Ultra, none on Phone, one material', async () => {
    const r = await page.evaluate(() => {
      S.frame(2);
      const sky = S.stats(0.25, 0.02, 0.4, 0.12), water = S.stats(0.02, 0.5, 0.2, 0.62), u = R11WATER.state();
      const mat = (() => { let m = null; R11.scene.traverse((o) => { if (o.isMesh && o.material && o.material.userData && o.material.userData.r11water) m = o.material; }); return m; })();
      R11.setTier('phone'); S.frame(3);
      const p = R11WATER.state(), waterP = S.stats(0.02, 0.5, 0.2, 0.62);
      const mat2 = (() => { let m = null; R11.scene.traverse((o) => { if (o.isMesh && o.material && o.material.userData && o.material.userData.r11water) m = o.material; }); return m; })();
      return { sky, water, waterP, u, p, same: !!mat && mat === mat2 };
    });
    await page.screenshot({ path: path.join(SHOT_DIR, 'r11harbour-phone.png') });
    ok(r.u.mirror === true && r.u.meshes >= 1 && !r.u.dead && r.u.drawn > 0, 'Ultra ' + JSON.stringify(r.u));
    ok(r.p.mirror === false && r.same, 'Phone ' + JSON.stringify(r.p) + ' same ' + r.same);
    ok(r.water.L < r.sky.L * 0.6 && r.water.g >= r.water.r && r.water.g >= r.water.b - 1, 'Ultra water ' + JSON.stringify(r.water) + ' sky ' + JSON.stringify(r.sky));
    ok(r.waterP.L < r.sky.L * 0.75, 'Phone water ' + JSON.stringify(r.waterP));
  });

  await step('leaving the map takes the harbour\'s bodies with it; nothing throws', async () => {
    const r = await page.evaluate(() => {
      R11.setTier('ultra');
      S.pin(() => { G.state = 'paused'; loadMap('oakhaven', { x: 27.5, y: 26.5, dir: 0 }); G.fadeT = 0; G.state = 'play'; }); S.frame(3);
      let harbour = 0; R11.scene.traverse((o) => { if (o.name === 'r11-harbour') harbour++; });
      return { harbour, rep: R11.replaced().size, active: R11.active(), map: G.map.id, water: R11WATER.state().dead };
    });
    ok(r.harbour === 0 && r.active && r.map === 'oakhaven' && r.water === false, JSON.stringify(r));
    ok(errors.length === 0, errors.slice(0, 3).join(' | '));
  });

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
