// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4313 node test/r11water.test.js
// Covers js/r11water.js (ROADMAP R11 phase 4, team WATER): R11WATER.material, the realistic look's water.
//   - the material builds and r11core draws every water cell with it, at Ultra, High and Phone, with no shader errors
//     (console, and every program's diagnostics)
//   - the harbour's water (Port Cantabile, the Long Mole, an overcast morning) against picture 3's water
//     (docs/graphics/bench3-harbour.jpg): luma within a band of the picture's, green-grey (green over red, not blue)
//   - day brighter than night; deep water darker than the shallows (the deep woods' pools: t_water inside t_shallows)
//   - Ultra: the planar reflection renders once per frame, and at night a lamp's highlight shows in the water (the
//     brightest water pixels with the reflection on are far brighter than with it off)
//   - High and Phone add no render pass (no reflection target, the pass counter does not move)
//   - rain dimples only when the weather is rain or storm (R11.wet())
//   - side-by-sides (ours | picture 3), colour and greyscale, into SHOT_DIR: r11water-sbs.png, r11water-sbs-grey.png,
//     plus the shots r11water-*.png
// Headless Chromium here has only SwiftShader: the page opts in with window.__r11 = { automation: true, force: true }.
// Frame times here mean nothing and are not checked.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4313';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11water-shots');
const BENCH3 = process.env.BENCH3 || path.join(__dirname, '..', 'docs', 'graphics', 'bench3-harbour.jpg');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }
const ok = (c, m) => assert.ok(c, m);

// the harbour view: HARBOUR's bench camera when it is there, else on the Long Mole looking west along it, water on the left
const HARBOUR_VIEW = { map: 'cantabile_harbour', x: 66, y: 52.7, dir: 2.75, pitch: -15, tod: 0.42, weather: 'overcast' };
const NIGHT_VIEW = { map: 'cantabile_harbour', x: 73.5, y: 52.6, dir: 3.5, pitch: -12, tod: 0.92, weather: 'clear' };
const POOLS_VIEW = { map: 'deepwoods', x: 17.5, y: 35.2, dir: -Math.PI / 2, pitch: -40, tod: 0.45, weather: 'overcast' };
const FLUME_VIEW = { map: 'oakhaven', x: 28, y: 51.6, dir: -0.2, pitch: -10, tod: 0.45, weather: 'overcast' };

async function bootPage(browser, tier) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(900000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' || /Shader Error|WebGLProgram|r11water|r11core/.test(t)) errors.push(m.type() + ': ' + t.slice(0, 400)); });
  await page.addInitScript(([o]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 } })); } catch (e) { /* none */ } }, [{ automation: true, force: true, tier }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 900000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 900000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Water Tester');
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
  return { page, errors };
}

const HELPERS = () => {
  const S = window.S = {};
  window.requestAnimationFrame = () => 0;   // the game loop must not render between our frames
  S.pin = (fn) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
  };
  S.stage = (v) => S.pin(() => {
    G.state = 'paused'; G.day = 3; G.tod = v.tod; loadMap(v.map, { x: v.x, y: v.y, dir: v.dir }); G.fadeT = 0; G.tod = v.tod; G.day = 3;
    for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; }
    Engine.cam.pitch = v.pitch || 0; Engine.cam.bob = 0; try { Weather.hold(v.weather || 'overcast'); } catch (e) { /* none */ } G.state = 'play';
    try { document.getElementById('msgs').innerHTML = ''; } catch (e) { /* none */ }
  });
  S.frame = () => S.pin(() => render());
  S.waterMesh = () => { let o = null; if (R11.scene) R11.scene.traverse(n => { if (n.isMesh && n.name === 'r11-water') o = n; }); return o; };
  // the whole canvas, read right after a frame
  S.grab = () => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), w = c.width, h = c.height, b = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
    return { w, h, b };
  };
  // the water's pixels: a frame with the water drawn against one without it (the 3D view's rows only: the top 75%)
  S.waterStats = (pre) => {
    const wm = S.waterMesh(); if (!wm) return null;
    S.frame(); const A = S.grab();
    wm.visible = false; S.frame(); const B = S.grab(); wm.visible = true;
    if (pre) pre();
    S.frame(); const C = S.grab();
    const lum = (p, i) => 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
    let n = 0, r = 0, g = 0, bl = 0; const L = [];
    const y0 = Math.floor(A.h * 0.25);   // readPixels is bottom-up: skip the bottom quarter (the HUD's rows)
    for (let y = y0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
      const i = (y * A.w + x) * 4;
      if (Math.abs(A.b[i] - B.b[i]) + Math.abs(A.b[i + 1] - B.b[i + 1]) + Math.abs(A.b[i + 2] - B.b[i + 2]) < 12) continue;
      n++; r += C.b[i]; g += C.b[i + 1]; bl += C.b[i + 2]; L.push(lum(C.b, i));
    }
    if (!n) return { n: 0 };
    L.sort((a, b) => a - b);
    return { n, frac: n / (A.w * (A.h - y0)), rgb: [r / n, g / n, bl / n], luma: L.reduce((a, b) => a + b, 0) / n, p50: L[n >> 1], p995: L[Math.min(n - 1, Math.floor(n * 0.995))], max: L[n - 1] };
  };
  S.programsOk = () => {
    const bad = [];
    for (const p of R11.renderer.info.programs || []) { const d = p.diagnostics; if (d && d.runnable === false) bad.push(p.name || p.cacheKey.slice(0, 40)); }
    return bad;
  };
};

// side-by-side in the page: ours (the 3D view part of the screenshot) | picture 3 (its picture above the HUD), colour
// and greyscale, at one height; plus picture 3's water (clean patches left of the Mole and under the boat)
async function sideBySide(page, oursPng, outColour, outGrey) {
  const ours = 'data:image/png;base64,' + fs.readFileSync(oursPng).toString('base64');
  const ref = 'data:image/jpeg;base64,' + fs.readFileSync(BENCH3).toString('base64');
  const [c, g, water] = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const A = await load(a), B = await load(b), H = 540;
    const ah = A.height * 0.75, bh = B.height * 0.80, aw = A.width * H / ah, bw = B.width * H / bh;
    const cv = document.createElement('canvas'); cv.width = Math.round(aw + bw + 8); cv.height = H;
    const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, H);
    x.drawImage(A, 0, 0, A.width, ah, 0, 0, aw, H); x.drawImage(B, 0, 0, B.width, bh, aw + 8, 0, bw, H);
    const colour = cv.toDataURL('image/png');
    const d = x.getImageData(0, 0, cv.width, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = l; }
    x.putImageData(d, 0, 0);
    // picture 3's water, in its own 1586x992 pixels
    const k = document.createElement('canvas'); k.width = B.width; k.height = B.height; const kx = k.getContext('2d'); kx.drawImage(B, 0, 0);
    const sx = B.width / 1586, sy = B.height / 992; let n = 0, r = 0, gg = 0, bl = 0;
    for (const [x0, y0, x1, y1] of [[0, 580, 60, 680], [100, 570, 300, 620], [330, 420, 440, 500], [0, 400, 30, 480], [1480, 600, 1586, 680]]) {
      const q = kx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy), Math.round((x1 - x0) * sx), Math.round((y1 - y0) * sy)).data;
      for (let i = 0; i < q.length; i += 4) { r += q[i]; gg += q[i + 1]; bl += q[i + 2]; n++; }
    }
    const rgb = [r / n, gg / n, bl / n];
    return [colour, cv.toDataURL('image/png'), { rgb, luma: 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] }];
  }, [ours, ref]);
  fs.writeFileSync(outColour, Buffer.from(c.split(',')[1], 'base64'));
  fs.writeFileSync(outGrey, Buffer.from(g.split(',')[1], 'base64'));
  return water;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let page, errors;
  const shaderErrors = () => errors.filter(e => /Shader Error|WebGLProgram|r11water|R11WATER/.test(e));
  try {
    ({ page, errors } = await bootPage(browser, 'ultra'));
    const view = await page.evaluate((v) => (window.R11 && R11.benchCams && R11.benchCams.harbour) ? Object.assign({}, v, R11.benchCams.harbour, { weather: R11.benchCams.harbour.weather || v.weather }) : v, HARBOUR_VIEW);
    console.log('# harbour view ' + JSON.stringify(view));
    let day = null;

    await step('Ultra: R11WATER.material builds, r11core draws the harbour\'s water with it, the planar reflection renders once per frame, no shader errors', async () => {
      const r = await page.evaluate((v) => {
        S.stage(v); S.frame();
        const p0 = R11WATER.stats.passes; S.frame(); S.frame();
        const wm = S.waterMesh();
        return { tier: R11.tier(), active: R11.active(), mesh: !!wm, mine: !!(wm && wm.material && wm.material.name === 'r11-water'), mode: R11WATER.mode(), passes: R11WATER.stats.passes - p0, on: R11WATER.uniforms.uReflOn.value, plane: R11WATER.stats.plane, shore: R11WATER.stats.shore, bad: S.programsOk(), draws: R11.stats.draws };
      }, view);
      console.log('# ' + JSON.stringify(r));
      ok(r.tier === 'ultra' && r.active, 'R11 at Ultra: ' + r.tier + ' ' + r.active);
      ok(r.mesh && r.mine, 'the water mesh uses R11WATER\'s material');
      ok(r.mode === 'planar' && r.passes === 2 && r.on === 1, 'one reflection pass per frame at Ultra: ' + r.mode + ' ' + r.passes);
      ok(r.shore && r.shore.water > 1000, 'the shore map is built for the harbour');
      ok(!r.bad.length && !shaderErrors().length, 'shader errors: ' + JSON.stringify(r.bad.concat(shaderErrors()).slice(0, 3)));
    });

    await step('the harbour\'s water against picture 3\'s: luma within the band, green-grey (green over red, not blue); side-by-sides written', async () => {
      day = await page.evaluate((v) => { S.stage(v); S.frame(); return S.waterStats(); }, view);
      await page.evaluate(() => { S.frame(); try { R11HUD.update(); } catch (e) { /* none */ } });
      const shot = path.join(SHOT_DIR, 'r11water-harbour-ultra.png');
      await page.screenshot({ path: shot });
      const ref = await sideBySide(page, shot, path.join(SHOT_DIR, 'r11water-sbs.png'), path.join(SHOT_DIR, 'r11water-sbs-grey.png'));
      console.log('# ours ' + JSON.stringify(day) + ' picture 3 ' + JSON.stringify(ref));
      ok(day && day.n > 5000, 'enough water in view: ' + (day && day.n));
      ok(Math.abs(day.luma - ref.luma) <= 30, 'water luma ' + day.luma.toFixed(1) + ' vs picture 3 ' + ref.luma.toFixed(1));
      const [r, g, b] = day.rgb;
      ok(g >= r + 3 && b <= g + 4, 'green-grey: rgb ' + day.rgb.map(v => v.toFixed(1)).join(','));
      ok(Math.max(r, g, b) - Math.min(r, g, b) < 30, 'not saturated: rgb ' + day.rgb.map(v => v.toFixed(1)).join(','));
    });

    await step('Ultra at night: the water is darker than by day, and a lamp\'s highlight shows in it (reflection on vs off)', async () => {
      const r = await page.evaluate((v) => {
        S.stage(v); S.frame();
        const P0 = R11WATER.get();
        const on = S.waterStats();
        const off = S.waterStats(() => { R11WATER.set({ refl: 0, lamp: 0 }); });
        R11WATER.set(P0);
        return { on, off, lights: R11.stats.lights };
      }, NIGHT_VIEW);
      await page.evaluate(() => S.frame());
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11water-night-ultra.png') });
      console.log('# night ' + JSON.stringify(r));
      ok(r.on && r.on.n > 3000, 'water in view at night');
      ok(r.on.luma < day.luma - 15, 'night water ' + r.on.luma.toFixed(1) + ' darker than day ' + day.luma.toFixed(1));
      ok(r.on.p995 > r.off.p995 + 25 && r.on.max > 120, 'a lamp in the water: brightest 0.5% ' + r.on.p995.toFixed(0) + ' (off ' + r.off.p995.toFixed(0) + '), max ' + r.on.max.toFixed(0));
    });

    await step('rain dimples only in rain or storm (R11.wet()), none on a dry day', async () => {
      const r = await page.evaluate((v) => {
        const out = {};
        for (const w of ['overcast', 'rain', 'storm']) { S.stage(Object.assign({}, v, { weather: w })); S.frame(); out[w] = { rain: R11WATER.uniforms.uRain.value, wet: R11.wet ? R11.wet() : null }; }
        return out;
      }, view);
      await page.evaluate(() => S.frame());
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11water-storm-ultra.png') });
      console.log('# ' + JSON.stringify(r));
      ok(r.overcast.rain === 0, 'dry day: no rain rings');
      ok(r.rain.rain > 0.5 && r.storm.rain > r.rain.rain, 'rain and storm ring the water: ' + r.rain.rain + ' ' + r.storm.rain);
    });

    await step('the pools (the deep woods: deep water inside a ring of shallows) and Oakhaven\'s Flume use it; the deep is darker than the shallows', async () => {
      const r = await page.evaluate(([pv, fv]) => {
        S.stage(pv); S.frame();
        const deepMask = (() => { const wm = S.waterMesh(); return !!wm; })();
        // the deep cells against the shallows: the same view with the shallows' tint forced to the deep's (pixels that
        // change are the shallows)
        const P0 = R11WATER.get();
        S.frame(); const A = S.grab();
        R11WATER.set({ shal: P0.deep }); const u = R11WATER.uniforms; const sh = u.uShal.value.clone();
        S.frame(); const B = S.grab(); R11WATER.set(P0);
        const lum = (p, i) => 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
        let ns = 0, ls = 0, nd = 0, ld = 0;
        const wm = S.waterMesh(); wm.visible = false; S.frame(); const C = S.grab(); wm.visible = true;
        for (let i = 0; i < A.b.length; i += 4) {
          const water = Math.abs(A.b[i] - C.b[i]) + Math.abs(A.b[i + 1] - C.b[i + 1]) + Math.abs(A.b[i + 2] - C.b[i + 2]) >= 12;
          if (!water) continue;
          if (Math.abs(lum(A.b, i) - lum(B.b, i)) > 3) { ns++; ls += lum(A.b, i); } else { nd++; ld += lum(A.b, i); }
        }
        S.frame();
        const pools = { has: deepMask, shallow: ns ? ls / ns : null, deep: nd ? ld / nd : null, ns, nd, sh: sh.getHex() };
        S.stage(fv); S.frame(); const fl = S.waterStats();
        return { pools, flume: fl, shore: R11WATER.stats.shore };
      }, [POOLS_VIEW, FLUME_VIEW]);
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11water-flume-ultra.png') });
      console.log('# ' + JSON.stringify(r));
      ok(r.pools.has && r.pools.ns > 500 && r.pools.nd > 500, 'deep and shallow water both in view: ' + r.pools.nd + ' / ' + r.pools.ns);
      ok(r.pools.deep < r.pools.shallow - 4, 'deep ' + (r.pools.deep || 0).toFixed(1) + ' darker than shallows ' + (r.pools.shallow || 0).toFixed(1));
      ok(r.flume && r.flume.n > 2000 && r.flume.rgb[1] >= r.flume.rgb[0], 'the Flume is drawn green-grey: ' + JSON.stringify(r.flume && r.flume.rgb));
    });

    for (const t of ['high', 'phone']) {
      await step(t + ': the material switches with the tier, adds no render pass and no reflection target, no shader errors', async () => {
        const r = await page.evaluate(([v, t]) => {
          R11.setTier(t); S.stage(v); S.frame();
          const p0 = R11WATER.stats.passes; S.frame(); S.frame();
          const wm = S.waterMesh();
          return { tier: R11.tier(), mode: R11WATER.mode(), passes: R11WATER.stats.passes - p0, rt: !!R11WATER._rf.rt, mine: !!(wm && wm.material.name === 'r11-water'), def: wm && wm.material.defines.R11W_MODE, bad: S.programsOk(), draws: R11.stats.draws, stats: S.waterStats() };
        }, [view, t]);
        await page.evaluate(() => S.frame());
        await page.screenshot({ path: path.join(SHOT_DIR, 'r11water-harbour-' + t + '.png') });
        console.log('# ' + JSON.stringify(r));
        ok(r.tier === t && r.mode === 'env' && r.mine, 'env mode at ' + t);
        ok(r.passes === 0 && !r.rt, 'no reflection pass at ' + t + ': ' + r.passes + ' ' + r.rt);
        ok(r.def === (t === 'phone' ? 0 : 1), 'the shader follows the tier: R11W_MODE ' + r.def);
        ok(!r.bad.length && !shaderErrors().length, 'shader errors: ' + JSON.stringify(r.bad.concat(shaderErrors()).slice(0, 3)));
        ok(r.stats && Math.abs(r.stats.luma - day.luma) < 25, 'the water reads the same at ' + t + ': ' + (r.stats && r.stats.luma.toFixed(1)) + ' vs Ultra ' + day.luma.toFixed(1));
      });
    }

    await step('no page errors', async () => { ok(!errors.filter(e => /pageerror/.test(e)).length, JSON.stringify(errors.slice(0, 4))); });
  } catch (e) {
    failed++; console.log('FAIL harness -- ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(`r11water: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
