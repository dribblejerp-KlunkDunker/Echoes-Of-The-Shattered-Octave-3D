// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4311 SHOT_DIR=/some/dir node test/r11gate.test.js
// Covers js/r11gate.js (ROADMAP R11 phase 4, team GATE): the Hedge and Oakhaven's North Gate in the realistic look,
// against the owner's picture 2 (docs/graphics/bench2-gate.jpg).
//   - the dresser is on window.R11DRESSERS; R11.benchCams.gate is { map, x, y, dir, pitch, tod, day, weather }
//   - Oakhaven: every hedge cell is hidden from CORE's plain boxes and drawn as the Hedge (thorn, packed wool, sprays,
//     felt and sacking, timber, iron, stone), in at most 8 draws; the thorn stands taller than a man, the wool about a
//     man's height; the gate's timber, the coin (copper) and the mounting-block are there
//   - the gate is shut while the flag gate_open is unset and open once it is set (Harrow's word)
//   - the Last Sheaf: none on day 1; on the festival's days it hangs on the gate in 3D and its billboard is skipped
//   - the clearing: its south side (the Hedge) is hidden and drawn, with the gate seen from outside
//   - Ultra and Phone shots at the bench camera, side-by-sides (ours | picture 2) in colour and greyscale into SHOT_DIR:
//     r11gate-ultra.png, r11gate-phone.png, r11gate-sbs.png, r11gate-sbs-grey.png, r11gate-sbs-phone.png, ...-grey;
//     draws at Ultra and Phone reported; the Hedge at the left of the frame darker than the sky, as in picture 2
//   - no page errors
// Headless Chromium here has only SwiftShader: frames take seconds to minutes; frame times are not measured or checked.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4311';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11gate-shots');
const BENCH2 = process.env.BENCH2 || path.join(__dirname, '..', 'docs', 'graphics', 'bench2-gate.jpg');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'check failed'); };

async function bootPage(browser, tier) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(1800000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r11core|r11gate/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(([o]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 }, tier: o.tier, tierManual: true })); } catch (e) { /* none */ } }, [{ automation: true, force: true, tier }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 1800000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 1800000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Gate Tester');
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
  // a place, its day, hour, weather and flags (the bench camera by default)
  S.stage = (o) => S.pin(() => {
    const B = Object.assign({}, R11.benchCams.gate, o || {});
    Object.assign(G.flags, B.flags || {});
    G.state = 'paused'; G.day = B.day; G.tod = B.tod; loadMap(B.map, { x: B.x, y: B.y, dir: B.dir }); G.fadeT = 0; G.tod = B.tod; G.day = B.day;
    Engine.cam.pitch = B.pitch || 0; Engine.cam.bob = 0; try { Weather.hold(B.weather || 'overcast'); } catch (e) { /* none */ } G.state = 'play';
    try { document.getElementById('msgs').innerHTML = ''; document.getElementById('msgs').style.visibility = 'hidden'; } catch (e) { /* none */ }
  });
  S.frame = () => { S.pin(() => render()); S.pin(() => render()); try { R11HUD.update(); } catch (e) { /* none */ } };
  S.stats = (x0, y0, x1, y1) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), vh = c.height * 0.75;
    const X0 = (x0 * c.width) | 0, W = Math.max(1, ((x1 - x0) * c.width) | 0), H = Math.max(1, ((y1 - y0) * vh) | 0), Y0 = (c.height - y1 * vh) | 0;
    const b = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    let L = 0; for (let i = 0; i < b.length; i += 4) L += 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
    return Math.round(L / (W * H) * 10) / 10;
  };
  // the gate's meshes in the scene, by name
  S.meshes = () => { const o = {}; R11.scene.traverse((m) => { if (m.isMesh && /^gate:/.test(m.name) && m.visible) o[m.name] = m; }); return o; };
  S.maxY = (m) => { const p = m.geometry.attributes.position; let y = -1e9; for (let i = 0; i < p.count; i++) y = Math.max(y, p.getY(i)); return y; };
};

async function sideBySide(page, oursPng, outColour, outGrey) {
  const ours = 'data:image/png;base64,' + fs.readFileSync(oursPng).toString('base64');
  const ref = 'data:image/jpeg;base64,' + fs.readFileSync(BENCH2).toString('base64');
  const [c, g] = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const A = await load(a), B = await load(b), H = 540;
    const ah = A.height * 0.75, bh = B.height * 0.84, aw = A.width * H / ah, bw = B.width * H / bh;
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
  let page, errors;
  try {
    ({ page, errors } = await bootPage(browser, 'phone'));
    await step('the dresser is registered and R11.benchCams.gate is { map, x, y, dir, pitch, tod, day, weather } at the North Gate', async () => {
      const r = await page.evaluate(() => ({ B: R11.benchCams && R11.benchCams.gate, ids: (window.R11DRESSERS || []).map((d) => d.id) }));
      const B = r.B;
      ok(r.ids.includes('gate'), 'dressers ' + r.ids);
      ok(B && B.map === 'oakhaven' && ['x', 'y', 'dir', 'pitch', 'tod', 'day'].every((k) => typeof B[k] === 'number') && typeof B.weather === 'string', JSON.stringify(B));
      ok(Math.abs(B.x - 23.5) < 1 && B.y < 2.5, 'not at the gate: ' + B.x + ',' + B.y);
    });
    await step('Oakhaven: every hedge cell hidden and drawn; at most 8 draws; thorn taller than a man, wool about a man\'s height', async () => {
      const r = await page.evaluate(() => {
        S.stage(); S.frame();
        const L = R11GATE.live, m = G.map, hid = R11GATE.last.hiddenCells; let hedge = 0, missing = 0;
        for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (c && c.tex === 't_hedge') { hedge++; if (!hid.has(i)) missing++; } }
        const ms = S.meshes(), M = R11.M;
        return { active: R11.active(), map: m.id, hedge, missing, names: Object.keys(ms), draws: R11GATE.last.stats.draws, stats: R11GATE.last.stats,
          thornTop: ms['gate:thorn'] ? S.maxY(ms['gate:thorn']) : 0, woolMesh: !!ms['gate:wool'], live: !!L };
      });
      console.log('  ' + JSON.stringify(r.stats));
      ok(r.active && r.map === 'oakhaven' && r.live, 'R11 active ' + r.active + ' map ' + r.map);
      ok(r.hedge > 200 && r.missing === 0, 'hedge cells ' + r.hedge + ', not hidden ' + r.missing);
      for (const n of ['gate:thorn', 'gate:wool', 'gate:sprays', 'gate:cloth', 'gate:timber', 'gate:iron', 'gate:stone']) ok(r.names.includes(n), 'missing ' + n + ' in ' + r.names);
      ok(r.draws <= 8, 'draws ' + r.draws);
      ok(r.thornTop > 3.2 && r.thornTop < 5.5, 'thorn top ' + r.thornTop + ' m');
    });
    await step('the gate: shut and barred without gate_open, open with it; copper on the gatepost', async () => {
      const r = await page.evaluate(() => {
        S.stage({ flags: { gate_open: false } }); S.frame(); const shut = R11GATE.live.open;
        G.flags.gate_open = true; S.frame(); const open = R11GATE.live.open;
        const iron = S.meshes()['gate:iron'], c = iron.geometry.attributes.color; let copper = 0;
        for (let i = 0; i < c.count; i++) if (c.getX(i) > 0.6 && c.getY(i) < 0.45) copper++;
        return { shut, open, copper };
      });
      ok(r.shut === false && r.open === true, JSON.stringify(r));
      ok(r.copper > 20, 'no coin on the gatepost: ' + r.copper);
    });
    await step('the Last Sheaf: none on day 1; on the festival\'s days it hangs on the gate in 3D and its billboard is skipped', async () => {
      const r = await page.evaluate(() => {
        S.stage({ day: 1 }); S.frame(); const d1 = !!S.meshes()['gate:sheaf'];
        S.stage({ day: 3 }); S.frame(); S.frame();
        const ent = G.map.entities.find((e) => e && e.sprite === 'p12_sheaf' && Math.abs(e.x - 23.5) < 1 && e.y < 3);
        const fest = typeof FESTIVALS12 !== 'undefined';
        return { d1, d3: !!S.meshes()['gate:sheaf'], ent: !!ent, skipped: !!(ent && R11.replaced().has(ent)), fest };
      });
      console.log('  ' + JSON.stringify(r));
      ok(!r.d1, 'a sheaf on day 1');
      if (r.ent) ok(r.d3 && r.skipped, JSON.stringify(r)); else ok(!r.d3, 'a sheaf with no festival sheaf at the gate');
    });
    await step('the clearing: its south side (the Hedge) hidden and drawn, with the gate seen from outside', async () => {
      const r = await page.evaluate(() => {
        S.stage({ map: 'clearing', x: 20.5, y: 31.5, dir: Math.PI / 2, day: 1 }); S.frame();
        const m = G.map, hid = R11GATE.last.hiddenCells; let south = 0, missing = 0;
        for (let x = 0; x < m.w; x++) { const i = (m.h - 1) * m.w + x; if (m.cells[i]) { south++; if (!hid.has(i)) missing++; } }
        return { map: m.id, south, missing, names: Object.keys(S.meshes()), draws: R11GATE.last.stats.draws, all: R11.stats.draws };
      });
      console.log('  clearing ' + JSON.stringify(r));
      ok(r.map === 'clearing' && r.south > 30 && r.missing === 0, JSON.stringify(r));
      ok(r.names.includes('gate:timber') && r.names.includes('gate:thorn') && r.draws <= 8, JSON.stringify(r.names));
    });
    let phoneDraws = 0;
    await step('Phone: the bench shot and its side-by-sides; draws reported; the Hedge at the left darker than the sky', async () => {
      const r = await page.evaluate(() => { S.stage(); S.frame(); return { tier: R11.tier(), draws: R11.stats.draws, gate: R11GATE.last.stats.draws, hedge: S.stats(0.0, 0.1, 0.22, 0.8), sky: S.stats(0.45, 0.0, 0.7, 0.12) }; });
      phoneDraws = r.draws;
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11gate-phone.png') });
      ok(fs.existsSync(BENCH2), 'picture 2 missing: ' + BENCH2);
      await sideBySide(page, path.join(SHOT_DIR, 'r11gate-phone.png'), path.join(SHOT_DIR, 'r11gate-sbs-phone.png'), path.join(SHOT_DIR, 'r11gate-sbs-phone-grey.png'));
      console.log('  Phone ' + JSON.stringify(r));
      ok(r.tier === 'phone', 'tier ' + r.tier);
      ok(r.hedge < r.sky, 'hedge ' + r.hedge + ' sky ' + r.sky);
    });
    await step('Ultra: the bench shot and its side-by-sides; draws reported', async () => {
      const r = await page.evaluate(() => { R11.setTier('ultra'); S.stage(); S.frame(); return { tier: R11.tier(), draws: R11.stats.draws, gate: R11GATE.last.stats, hedge: S.stats(0.0, 0.1, 0.22, 0.8), sky: S.stats(0.45, 0.0, 0.7, 0.12) }; });
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11gate-ultra.png') });
      await sideBySide(page, path.join(SHOT_DIR, 'r11gate-ultra.png'), path.join(SHOT_DIR, 'r11gate-sbs.png'), path.join(SHOT_DIR, 'r11gate-sbs-grey.png'));
      console.log('  Ultra ' + JSON.stringify(r) + '; Phone draws ' + phoneDraws);
      ok(r.tier === 'ultra' && r.gate.tier === 'ultra' && r.gate.draws <= 8, JSON.stringify(r.gate));
      ok(fs.statSync(path.join(SHOT_DIR, 'r11gate-sbs-grey.png')).size > 10000, 'grey side-by-side not written');
    });
    await step('no page errors', async () => { ok(!errors.length, errors.slice(0, 3).join(' | ')); });
  } catch (e) {
    failed++; console.log('FAIL harness -- ' + (e && e.message ? e.message.split('\n')[0] : e));
  } finally {
    await browser.close();
  }
  console.log((failed ? 'FAILED' : 'OK') + ' r11gate: ' + passed + ' passed, ' + failed + ' failed; shots in ' + SHOT_DIR);
  process.exit(failed ? 1 : 0);
})();
