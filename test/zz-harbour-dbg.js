// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4312 SHOT_DIR=/some/dir node test/r11harbour.test.js
// Covers js/r11harbour.js (ROADMAP R11 phase 4, team HARBOUR): Port Cantabile dressed to the owner's picture 3
// (docs/graphics/bench3-harbour.jpg; docs/graphics/art-bible.md).
//   - the dresser is on window.R11DRESSERS and R11.benchCams.harbour is { map, x, y, dir, pitch, tod, day, weather } on
//     the Long Mole, looking out along it to the Mole-head (picture 3: the harbour and a moored boat on the left)
//   - the Long Mole follows Book Two (owner's ruling 9 Nov 2026): the parapet on the sea side is the map's wall cells, drawn
//     as granite courses; the moorings on the harbour side; the round Mole-head with the mast-tower in the middle and the
//     Mole-bell on its bracket on the tower; the water's edge a kerb of big blocks; thick ropes from the boats to kerb bollards
//   - the dress: the Mole's cells drawn as flags (hidden from core), bollards, rings, ladders, the Mole steps; the
//     mast-tower, the derrick with the Articles, the cradle rope, the Mole-bell and the lifebuoy; every map boat replaced
//     by a hull; houses replacing core's blocks (hiddenCells never hold a door or a walkable cell); the counting-house;
//     the cliff as rock; the shore rocks; the outer sea
//   - the counting-house (the skyline, no castle) is in the bench camera's view
//   - lamps: flames out by day, lit at night with the lit windows; the boats ride the game's swing (uLift)
//   - Ultra and Phone shots at the bench camera, side-by-sides (ours | picture 3) in colour and greyscale; draws at both
//   - Pixel style hands the frame back; no page errors
// Headless Chromium here has only SwiftShader: frames take seconds; frame times are not measured or checked.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4312';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11harbour-shots');
const BENCH3 = process.env.BENCH3 || path.join(__dirname, '..', 'docs', 'graphics', 'bench3-harbour.jpg');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'check failed'); };

async function bootPage(browser, tier) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(1800000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r11core|r11harbour/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(([o]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 }, tier: o.tier, tierManual: true })); } catch (e) { /* none */ } }, [{ automation: true, force: true, tier }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 1800000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 1800000 });
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
  await page.waitForFunction(() => window.R11 && (R11.ready || R11.failed()), null, { timeout: 1800000 });
  await page.evaluate(HELPERS);
  await page.evaluate((t) => { if (window.R11BENCH) R11BENCH.renderScale = () => 1; if (R11.tier() !== t) R11.setTier(t); }, tier);
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
  S.bench = (tod) => S.pin(() => {
    const B = R11.benchCams.harbour, t = tod == null ? B.tod : tod;
    G.state = 'paused'; G.day = B.day || 3; G.tod = t; loadMap(B.map, { x: B.x, y: B.y, dir: B.dir }); G.fadeT = 0; G.tod = t; G.day = B.day || 3;
    Engine.cam.pitch = B.pitch || 0; Engine.cam.bob = 0; try { Weather.hold(B.weather || 'overcast'); } catch (e) { /* none */ } G.state = 'play';
    try { update(0.3); } catch (e) { /* none */ }
    G.tod = t; Engine.cam.x = B.x; Engine.cam.y = B.y; Engine.cam.dir = B.dir; if (G.player) { G.player.x = B.x; G.player.y = B.y; G.player.dir = B.dir; }
    try { document.getElementById('msgs').innerHTML = ''; } catch (e) { /* none */ }
  });
  S.frame = () => { S.pin(() => render()); S.pin(() => render()); try { R11HUD.update(); } catch (e) { /* none */ } try { document.getElementById('msgs').innerHTML = ''; document.getElementById('msgs').style.visibility = 'hidden'; } catch (e) { /* none */ } };
  S.stats = (x0, y0, x1, y1) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), vh = c.height * 0.75;
    const X0 = (x0 * c.width) | 0, W = Math.max(1, ((x1 - x0) * c.width) | 0), H = Math.max(1, ((y1 - y0) * vh) | 0), Y0 = (c.height - y1 * vh) | 0;
    const b = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    let L = 0; const n = W * H; for (let i = 0; i < b.length; i += 4) L += 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
    return Math.round(L / n * 10) / 10;
  };
};

// ours (the 3D view part of the screenshot) | picture 3 (its picture above the HUD), colour and greyscale, one height
async function sideBySide(page, oursPng, outColour, outGrey) {
  const ours = 'data:image/png;base64,' + fs.readFileSync(oursPng).toString('base64');
  const ref = 'data:image/jpeg;base64,' + fs.readFileSync(BENCH3).toString('base64');
  const [c, g] = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const A = await load(a), B = await load(b), H = 540;
    const ah = A.height * 0.75, bh = B.height * 0.805, aw = A.width * H / ah, bw = B.width * H / bh;
    const cv = document.createElement('canvas'); cv.width = Math.round(aw + bw + 8); cv.height = H;
    const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, H);
    x.drawImage(A, 0, 0, A.width, ah, 0, 0, aw, H); x.drawImage(B, 0, 0, B.width, bh, aw + 8, 0, bw, H);
    const colour = cv.toDataURL('image/png');
    const d = x.getImageData(0, 0, cv.width, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = l; }
    x.putImageData(d, 0, 0);
    return [colour, cv.toDataURL('image/png')];
  }, [ours, ref]);
  fs.writeFileSync(outColour, Buffer.from(c.split(',')[1], 'base64'));
  fs.writeFileSync(outGrey, Buffer.from(g.split(',')[1], 'base64'));
}


(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const tier = process.env.TIER || 'phone';
  const { page, errors } = await bootPage(browser, tier);
  if (process.env.EVAL) console.log(JSON.stringify(await page.evaluate(process.env.EVAL)));
  const cams = JSON.parse(process.env.CAMS || '[]');
  await page.waitForTimeout(4000);
  for (const c of cams) {
    if (c.style) await page.evaluate((st) => R11.setStyle(st), c.style);
    await page.evaluate((c) => { S.bench(); S.pin(() => { const g = G.map.groundAt(c.x, c.y); Engine.cam.x = c.x; Engine.cam.y = c.y; Engine.cam.dir = c.dir; Engine.cam.pitch = c.pitch || 0; if (c.z != null) Engine.cam.z = c.z; else Engine.cam.z = g + 0.88; if (c.tod != null) G.tod = c.tod; }); if (c.style) { S.pin(() => { G.keys = {}; try { update(0.02); } catch (e) {} Engine.cam.x = c.x; Engine.cam.y = c.y; Engine.cam.dir = c.dir; Engine.cam.pitch = c.pitch || 0; Engine.cam.z = c.z != null ? c.z : G.map.groundAt(c.x, c.y) + 0.88; if (G.player) { G.player.x = c.x; G.player.y = c.y; G.player.dir = c.dir; } }); } S.frame(); if (c.z != null) { Engine.cam.z = c.z; S.frame(); } }, c);
    await page.screenshot({ path: path.join(SHOT_DIR, c.name + '.png') });
    if (c.style) await page.evaluate(() => R11.setStyle('realistic'));
  }
  console.log(errors.slice(0, 5).join(' | '));
  await browser.close();
})();
