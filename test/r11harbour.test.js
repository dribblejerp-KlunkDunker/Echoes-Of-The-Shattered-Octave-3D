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
  let page, errors;
  try {
    ({ page, errors } = await bootPage(browser, 'phone'));
    let dress = null;
    await step('the dresser is registered and R11.benchCams.harbour is a camera on the Long Mole looking toward the town', async () => {
      const r = await page.evaluate(() => ({ B: R11.benchCams && R11.benchCams.harbour, reg: (window.R11DRESSERS || []).some((d) => d.id === 'harbour'),
        mole: (() => { const B = R11.benchCams.harbour, m = G.maps[B.map]; if (!m) return null; const i = Math.floor(B.y) * m.w + Math.floor(B.x); return m.floorTextures[m.floorCells[i]]; })() }));
      ok(r.reg, 'not on R11DRESSERS');
      const B = r.B; ok(B && B.map === 'cantabile_harbour' && ['x', 'y', 'dir', 'pitch', 'tod'].every((k) => typeof B[k] === 'number'), 'shape ' + JSON.stringify(B));
      ok(r.mole === 'p17c_mole', 'the camera stands on ' + r.mole);
      ok(Math.cos(B.dir) > 0.8, 'looks east, out along the Mole to the Mole-head: dir ' + B.dir);
      // nobody stands in the camera's face (a billboard a pace away fills picture 3's frame)
      const close = await page.evaluate(() => { const B = R11.benchCams.harbour, m = G.maps[B.map], c = Math.cos(B.dir), s = Math.sin(B.dir);
        return (m.entities || []).filter((e) => { const dx = e.x - B.x, dy = e.y - B.y, d = Math.hypot(dx, dy); return d < 1.6 && (dx * c + dy * s) / (d || 1) > 0.3 && !/post|ring|coil|barrel|crate|gull|lamp/.test(e.sprite || ''); }).map((e) => e.sprite); });
      ok(!close.length, 'in the camera\'s face: ' + close.join(', '));
    });
    await step('the dress: the Mole, the Mole-head, the boats, the houses, the counting-house, the cliff, the shore', async () => {
      dress = await page.evaluate(() => {
        S.bench(); S.frame();
        const L = R11HARBOUR.last, m = G.map, st = L.stats;
        let doorHidden = 0, walkHidden = 0;
        for (const ci of L.hiddenCells) { const c = m.cells[ci]; if (c && c.door) doorHidden++; if (!c || c.door) { const t = m.floorTextures[m.floorCells[ci]]; if (t !== 'p17c_mole') walkHidden++; } }
        const boats = (m.p17cBoats || []).length, boatsReplaced = (m.p17cBoats || []).filter((e) => L.replaced.has(e)).length;
        const repl = (sp) => m.entities.filter((e) => e.sprite === sp).every((e) => L.replaced.has(e));
        const coreHidden = [...L.hiddenCells].every((c) => R11.R && true);
        const par = []; for (let i = 0; i < m.cells.length; i++) if (m.cells[i] && m.cells[i].moleParapet) par.push(i);
        const parapetHidden = par.length > 0 && par.every((i) => L.hiddenCells.has(i));
        const parapetSea = par.length > 0 && par.every((i) => { const t = m.floorTextures[m.floorCells[i + m.w]]; const n = m.floorTextures[m.floorCells[i - m.w]]; return /water/.test(t || '') && n === 'p17c_mole'; });
        const MH = CANTABILE17.MOLE_HEAD, mastE = m.entities.find((e) => e.sprite === 'p17c_mast'), mastMid = Math.round(Math.hypot(mastE.x - MH.x, mastE.y - MH.y) * 100) / 100;
        return { st, doorHidden, walkHidden, boats, boatsReplaced, mast: repl('p17c_mast'), derrick: repl('p17c_derrick'), bell: repl('p17c_molebell'), posts: repl('p12r_post'), sea: !!L.sea, map: G.map.id, coreHidden, parapetHidden, parapetSea, mastMid };
      });
      const s = dress.st;
      console.log('  stats ' + JSON.stringify(Object.assign({}, s, { countingHouse: !!s.countingHouse })));
      ok(dress.map === 'cantabile_harbour', 'map ' + dress.map);
      ok(s.moleCells > 90 && s.bollards >= 5 && s.rings >= 10 && s.ladders === 2 && s.moleSteps > 0 && s.kerbs > 4, 'the Mole ' + JSON.stringify([s.moleCells, s.bollards, s.rings, s.ladders, s.moleSteps, s.kerbs]));
      ok(s.parapetCells >= 15 && dress.parapetHidden && dress.parapetSea, 'the parapet on the sea side: ' + s.parapetCells + ' cells, hidden ' + dress.parapetHidden + ', sea beyond it ' + dress.parapetSea);
      ok(s.headRound && s.headCourses >= 3, 'the round Mole-head: ' + s.headCourses + ' courses');
      ok(s.mastTower && s.derrick && s.articles && s.cradleRope && s.moleBell && s.lifebuoy && dress.mast && dress.derrick && dress.bell, 'the Mole-head');
      ok(s.bellOnTower < 1 && dress.mastMid < 0.2, 'the mast-tower in the middle of the head (' + dress.mastMid + ') and the Mole-bell on the tower (' + s.bellOnTower + ')');
      ok(s.cables >= 4 && s.kerbBollards >= 2, 'boats made fast with thick rope to kerb bollards: ' + s.cables + ' cables, ' + s.kerbBollards + ' bollards');
      ok(dress.boats > 0 && dress.boatsReplaced === dress.boats && s.boats >= dress.boats, 'boats ' + dress.boatsReplaced + '/' + dress.boats);
      ok(s.houses >= 20 && s.countingHouse && s.cliffCells > 500 && s.shoreRocks > 50 && dress.sea && dress.posts, 'houses ' + s.houses + ' cliff ' + s.cliffCells + ' shore ' + s.shoreRocks + ' sea ' + dress.sea);
      ok(dress.doorHidden === 0 && dress.walkHidden === 0, 'hidden doors ' + dress.doorHidden + ', hidden walkable cells (not the Mole) ' + dress.walkHidden);
      ok(s.lamps > 20, 'lamps ' + s.lamps);
    });
    await step('the bench view: a moored boat close on the left with its rope; the mast-tower, the Mole-light, the derrick\'s Articles and the Mole-bell down the Mole', async () => {
      const r = await page.evaluate(() => {
        S.bench(); S.frame();
        const L = R11HARBOUR.last, m = G.map, T = R11.THREE, M = R11.M, B = R11.benchCams.harbour, ZK = 0.61875, v = new T.Vector3();
        const pr = (x, y, h) => { v.set(x, h * ZK, y).project(R11.camera); return { x: Math.round(v.x * 100) / 100, y: Math.round(v.y * 100) / 100, in: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 }; };
        const g = m.groundAt ? m.groundAt(B.x, B.y) : 0.4;
        const near = L.boats.filter((b) => b.e).map((b) => ({ b, d: Math.hypot(b.e.x - B.x, b.e.y - B.y) })).sort((a, c) => a.d - c.d)[0];
        const ent = (sp) => m.entities.find((e) => e.sprite === sp);
        return { boat: near && Object.assign(pr(near.b.e.x, near.b.e.y, 0.2), { d: Math.round(near.d * 100) / 100 }), mast: pr(ent('p17c_mast').x, ent('p17c_mast').y, g + 4), light: pr(ent('p17c_mast').x - 0.5, ent('p17c_mast').y, g + 3.4),
          derrick: pr(ent('p17c_derrick').x, ent('p17c_derrick').y, g + 1.8), bell: pr(ent('p17c_molebell').x, ent('p17c_molebell').y, g + 1.2), cables: L.stats.cables };
      });
      console.log('  ' + JSON.stringify(r));
      ok(r.boat && r.boat.in && r.boat.x < -0.2 && r.boat.d < 4, 'the nearest moored boat sits on the left of the frame: ' + JSON.stringify(r.boat));
      ok(r.mast.in && r.light.in && r.derrick.in && r.bell.in, 'the Mole-head in view');
    });
    await step('the skyline (no castle): the counting-house\'s roof stands over the cliff seen from the Mole', async () => {
      const r = await page.evaluate(() => {
        const L = R11HARBOUR.last, ch = L.stats.countingHouse, M = R11.M, T = R11.THREE, B = R11.benchCams.harbour;
        const proj = () => new T.Vector3((ch.x0 + ch.x1 + 1) / 2, ch.top * M, (ch.y0 + ch.y1 + 1) / 2).project(R11.camera);
        // a terrace house (on the cliff, west of the Stair) in the bench view
        S.bench(); S.frame();
        let town = 0; const v = new T.Vector3();
        for (let y = 20; y < 44; y++) for (let x = 2; x < 26; x++) { const c = G.map.cells[y * G.map.w + x]; if (!c || !/^p17c_front/.test(c.tex || '')) continue; v.set(x + 0.5, (c.top + 1.5) * 0.61875, y + 0.5).project(R11.camera); if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1) town++; }
        // turned toward the counting-house from the same spot on the Mole
        const dx = (ch.x0 + ch.x1 + 1) / 2 - B.x, dy = (ch.y0 + ch.y1 + 1) / 2 - B.y;
        S.pin(() => { Engine.cam.dir = Math.atan2(dy, dx); if (G.player) G.player.dir = Engine.cam.dir; }); S.frame();
        const p = proj(); let maxTop = 0; L.metres.traverse((o) => { if (o.isMesh && o.name === 'harbour:slate') { o.geometry.computeBoundingBox(); maxTop = Math.max(maxTop, o.geometry.boundingBox.max.y); } });
        S.bench(); S.frame();
        return { town, p: { x: p.x, y: p.y, z: p.z }, top: ch.top, maxTop };
      });
      console.log('  ' + JSON.stringify(r));
      ok(Math.abs(r.p.x) < 1 && r.p.y > -1 && r.p.y < 1 && r.p.z < 1, 'counting-house roof projects to ' + JSON.stringify(r.p));
      ok(r.top >= r.maxTop - 0.6, 'the counting-house is the highest roof: ' + r.top + ' vs ' + r.maxTop);
    });
    await page.waitForTimeout(6000);   // the glTF lanterns and crates arrive after the first frame of a map
    await step('Phone: the bench shot, side-by-sides against picture 3, draws reported (aim <= 200)', async () => {
      const r = await page.evaluate(() => { S.bench(); S.frame(); return { draws: R11.stats.draws, harbour: R11HARBOUR.last.stats.draws, tier: R11.tier(), all: S.stats(0, 0, 1, 1), sky: S.stats(0.3, 0.02, 0.7, 0.15), ground: S.stats(0.3, 0.75, 0.7, 0.98) }; });
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11harbour-phone.png') });
      await sideBySide(page, path.join(SHOT_DIR, 'r11harbour-phone.png'), path.join(SHOT_DIR, 'r11harbour-sbs-phone.png'), path.join(SHOT_DIR, 'r11harbour-sbs-phone-grey.png'));
      console.log('  Phone: draws ' + r.draws + ' (harbour dress ' + r.harbour + '), luma all ' + r.all + ' sky ' + r.sky + ' ground ' + r.ground);
      ok(r.tier === 'phone', 'tier ' + r.tier);
      ok(r.draws <= 230, 'draws at Phone ' + r.draws);
      ok(r.sky > r.ground, 'the sky brighter than the Mole: ' + r.sky + ' vs ' + r.ground);
    });
    await step('lamps: out by day; lit at night (flames, the Mole-light, lit windows); the boats ride the game\'s swing', async () => {
      const r = await page.evaluate(() => {
        const L = R11HARBOUR.last, M = R11HARBOUR._internal.mats(R11.THREE), T = R11.THREE, m4 = new T.Matrix4();
        const onCount = () => { let n = 0; for (let i = 0; i < L.flames.count; i++) { L.flames.getMatrixAt(i, m4); if (Math.abs(m4.elements[0]) > 1e-6) n++; } return n; };
        S.bench(0.62); S.frame(); const day = { flames: onCount(), win: M.winLit.emissiveIntensity, light: (L.lights[0] || {}).intensity };
        const dayL = S.stats(0, 0, 1, 1);
        S.bench(0.95); S.frame(); const night = { flames: onCount(), win: M.winLit.emissiveIntensity, light: (L.lights[0] || {}).intensity }; const nightL = S.stats(0, 0, 1, 1);
        // the game's own swing (cantabile17 animateBoats) drives each map boat: the uniform carries e.animLift in metres
        S.bench(); S.frame(); const k = 0.61875 / R11.M; let agree = 0; for (const b of L.boats) if (b.e && Math.abs(M.U.lift.value[b.id] - (+b.e.animLift || 0) * k) < 1e-6) agree++;
        const own = L.boats.filter((b) => !b.e).map((b) => M.U.lift.value[b.id]);
        return { day, night, dayL, nightL, agree, mapBoats: L.boats.filter((b) => b.e).length, own };
      });
      console.log('  ' + JSON.stringify(r));
      ok(r.day.flames === 0 && r.day.win === 0, 'by day ' + JSON.stringify(r.day));
      ok(r.night.flames > 10 && r.night.win > 1 && r.night.light > 0, 'at night ' + JSON.stringify(r.night));
      ok(r.nightL < r.dayL && r.nightL > 5, 'night ' + r.nightL + ' day ' + r.dayL);
      ok(r.agree === r.mapBoats && r.mapBoats > 0, 'the boats ride the game\'s swing: ' + r.agree + '/' + r.mapBoats);
    });
    await step('Ultra: the bench shot and side-by-sides are written; draws reported', async () => {
      const r = await page.evaluate(() => { R11.setTier('ultra'); S.bench(); S.frame(); return { draws: R11.stats.draws, tier: R11.tier() }; });
      await page.waitForTimeout(3000);
      const r2 = await page.evaluate(() => { S.bench(); S.frame(); return { draws: R11.stats.draws }; });
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11harbour-ultra.png') });
      ok(fs.existsSync(BENCH3), 'picture 3 missing: ' + BENCH3);
      await sideBySide(page, path.join(SHOT_DIR, 'r11harbour-ultra.png'), path.join(SHOT_DIR, 'r11harbour-sbs.png'), path.join(SHOT_DIR, 'r11harbour-sbs-grey.png'));
      console.log('  Ultra: draws ' + r2.draws);
      ok(r.tier === 'ultra' && fs.statSync(path.join(SHOT_DIR, 'r11harbour-sbs-grey.png')).size > 10000, 'ultra shot');
    });
    await step('Pixel style hands the frame back (R11 off), Realistic takes it again', async () => {
      const r = await page.evaluate(() => { R11.setTier('phone'); R11.setStyle('pixel'); S.bench(); S.frame(); const a = R11.active(); R11.setStyle('realistic'); S.bench(); S.frame(); return { pixel: a, back: R11.active() }; });
      ok(r.pixel === false && r.back === true, JSON.stringify(r));
    });
    await step('leaving the harbour and coming back rebuilds the dress (no leftovers, no errors)', async () => {
      const r = await page.evaluate(() => { const inScene = (o) => { while (o) { if (o === R11.scene) return true; o = o.parent; } return false; }; const old = R11HARBOUR.last; S.pin(() => loadMap('oakhaven', { x: 18.5, y: 20.5, dir: 0 })); S.frame(); const away = inScene(old.group); S.bench(); S.frame(); return { away, back: inScene(R11HARBOUR.last.group) && R11HARBOUR.last !== old, map: G.map.id }; });
      ok(!r.away && r.back && r.map === 'cantabile_harbour', JSON.stringify(r));
    });
    await step('no page errors', async () => { ok(!errors.length, errors.slice(0, 3).join(' | ')); });
  } catch (e) {
    failed++; console.log('FAIL harness -- ' + (e && e.message ? e.message.split('\n')[0] : e));
  } finally {
    await browser.close();
  }
  console.log((failed ? 'FAILED' : 'OK') + ' r11harbour: ' + passed + ' passed, ' + failed + ' failed; shots in ' + SHOT_DIR);
  process.exit(failed ? 1 : 0);
})();
