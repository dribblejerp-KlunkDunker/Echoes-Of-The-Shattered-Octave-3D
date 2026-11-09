// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4211 SHOT_DIR=/some/dir node test/r11look.test.js
// Covers the LOOK of js/r11core.js (ROADMAP R11 phase 2, team LOOK): the realistic renderer graded toward the owner's
// picture 1 (docs/graphics/bench1-square.jpg; docs/graphics/art-bible.md).
//   - R11.benchCam {map, x, y, dir, pitch, tod}: Oakhaven's square framed like picture 1; R11 draws it
//   - Ultra and Phone shots at the bench camera, a side-by-side (ours | picture 1) and a greyscale side-by-side (the
//     value bands) into SHOT_DIR: r11look-ultra.png, r11look-phone.png, r11look-sbs.png, r11look-sbs-grey.png
//   - Ultra, High and Phone all draw graded (High: the same output pass as Ultra)
//   - the grade: darker and less saturated than the neutral look (AgX alone, phase-1 exposure), the sky still the
//     brightest band (overcast day, not night), the grade is the composer's output pass at Ultra (no OutputPass) and the
//     materials' own tone mapping at Phone (no composer: no extra full-screen pass), and both tiers agree
//   - bloom only on what glows: the sky's ceiling sits under the bloom threshold
//   - wet cobbles: the cobble material carries the wet hook; wet, the cobbles in front of the camera are darker and
//     more contrasted (dark joints, the sky caught in them) than dry
//   - night at the bench camera: darker than day, still readable; Pixel style hands the frame back (R11 off)
// Headless Chromium here has only SwiftShader: frames take seconds; frame times are not measured or checked.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4211';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11look-shots');
const BENCH1 = process.env.BENCH1 || path.join(__dirname, '..', 'docs', 'graphics', 'bench1-square.jpg');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }
const ok = (c, m) => { if (!c) throw new Error(m || 'check failed'); };

async function bootPage(browser, tier) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(900000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r11core/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(([o]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 }, tier: o.tier, tierManual: true })); } catch (e) { /* none */ } }, [{ automation: true, force: true, tier }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 900000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 900000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Look Tester');
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
  await page.evaluate((t) => { if (window.R11BENCH) R11BENCH.renderScale = () => 1; if (R11.tier() !== t) R11.setTier(t); }, tier);   // a fixed tier, full resolution
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
  // the bench camera, its day, hour and weather (overcast: picture 1's sky)
  S.bench = (tod) => S.pin(() => {
    const B = R11.benchCam, t = tod == null ? B.tod : tod;
    G.state = 'paused'; G.day = B.day || 3; G.tod = t; loadMap(B.map, { x: B.x, y: B.y, dir: B.dir }); G.fadeT = 0; G.tod = t; G.day = B.day || 3;
    Engine.cam.pitch = B.pitch || 0; Engine.cam.bob = 0; try { Weather.hold(B.weather || 'overcast'); } catch (e) { /* none */ } G.state = 'play';
    try { document.getElementById('msgs').innerHTML = ''; } catch (e) { /* none */ }
  });
  S.frame = () => { S.pin(() => render()); S.pin(() => render()); try { R11HUD.update(); } catch (e) { /* none */ } try { document.getElementById('msgs').innerHTML = ''; document.getElementById('msgs').style.visibility = 'hidden'; } catch (e) { /* none */ } };
  // the R11 canvas, read right after a frame: mean sRGB colour, mean luma, luma spread and mean saturation of a
  // region given in fractions of the 3D view (the top 150 of 200 logical rows)
  S.stats = (x0, y0, x1, y1) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), vh = c.height * 0.75;
    const X0 = (x0 * c.width) | 0, W = Math.max(1, ((x1 - x0) * c.width) | 0), H = Math.max(1, ((y1 - y0) * vh) | 0), Y0 = (c.height - y1 * vh) | 0;
    const b = new Uint8Array(W * H * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    let r = 0, g = 0, bl = 0, L = 0, L2 = 0, sat = 0; const n = W * H;
    for (let i = 0; i < b.length; i += 4) { const l = 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2]; r += b[i]; g += b[i + 1]; bl += b[i + 2]; L += l; L2 += l * l; const mx = Math.max(b[i], b[i + 1], b[i + 2]), mn = Math.min(b[i], b[i + 1], b[i + 2]); sat += (mx - mn) / (mx + 1); }
    const m = L / n; return { rgb: [r / n, g / n, bl / n].map(Math.round), L: Math.round(m * 10) / 10, sd: Math.round(Math.sqrt(Math.max(0, L2 / n - m * m)) * 10) / 10, sat: Math.round(sat / n * 1000) / 1000 };
  };
  // a percentile of luma over a region (the sky shows through gaps in the oaks: its bright end is what reads as sky)
  S.pct = (x0, y0, x1, y1, p) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), vh = c.height * 0.75;
    const X0 = (x0 * c.width) | 0, W = Math.max(1, ((x1 - x0) * c.width) | 0), H = Math.max(1, ((y1 - y0) * vh) | 0), Y0 = (c.height - y1 * vh) | 0;
    const b = new Uint8Array(W * H * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b);
    const L = []; for (let i = 0; i < b.length; i += 4) L.push(0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2]);
    L.sort((a, q) => a - q); return Math.round(L[Math.min(L.length - 1, Math.floor(p * L.length))]);
  };
  // the grade itself, on the GPU: R11.look.gradeGLSL (Phone's baked copy, the same text as Ultra's output pass) applied
  // to known colours (linear, as they come out of AgX); returns sRGB 0..255
  S.grade = (cols) => {
    const T = R11.THREE, n = cols.length, rt = new T.WebGLRenderTarget(n, 1, { type: T.UnsignedByteType });
    const pick = cols.map((c, i) => (i < n - 1 ? 'i == ' + i + ' ? vec3(' + c.join(', ') + ') : ' : 'vec3(' + c.join(', ') + ')')).join('');
    const m = new T.ShaderMaterial({ toneMapped: false, depthTest: false,
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: R11.look.gradeGLSL(false) + '\nvoid main() { int i = int(gl_FragCoord.x); vec3 c = ' + pick + '; gl_FragColor = vec4(pow(r11Grade(c), vec3(1.0 / 2.2)), 1.0); }' });
    const scene = new T.Scene(), q = new T.Mesh(new T.PlaneGeometry(2, 2), m); q.frustumCulled = false; scene.add(q);
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), r = R11.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(rt); r.render(scene, cam); const b = new Uint8Array(n * 4); r.readRenderTargetPixels(rt, 0, 0, n, 1, b); r.setRenderTarget(prev);
    rt.dispose(); m.dispose(); q.geometry.dispose();
    const out = []; for (let i = 0; i < n; i++) out.push([b[i * 4], b[i * 4 + 1], b[i * 4 + 2]]); return out;
  };
  S.regions = () => ({ all: S.stats(0, 0, 1, 1), sky: S.stats(0.3, 0.02, 0.6, 0.16), ground: S.stats(0.32, 0.7, 0.68, 0.98), mid: S.stats(0.3, 0.42, 0.75, 0.6) });
  // the neutral look: AgX alone at phase 1's exposure, no grade, a dry floor (for comparisons)
  S.NEUTRAL = { expDay: 1.0, expNight: 1.6, expDusk: 0, ambDay: 1, skyDay: 1, fogMix: 0, wetForce: 0, grade: { sat: 1, warmSat: 1, contrast: 1, gamma: 1, lift: 0, shadow: [0, 0, 0], mid: [0, 0, 0], high: [0, 0, 0] } };
};

// side-by-side in the page: ours (the 3D view part of the screenshot) | picture 1 (its picture above the HUD), colour
// and greyscale, at one height
async function sideBySide(page, oursPng, outColour, outGrey) {
  const ours = 'data:image/png;base64,' + fs.readFileSync(oursPng).toString('base64');
  const ref = 'data:image/jpeg;base64,' + fs.readFileSync(BENCH1).toString('base64');
  const [c, g] = await page.evaluate(async ([a, b]) => {
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const A = await load(a), B = await load(b), H = 540;
    const ah = A.height * 0.75, bh = B.height * 0.855, aw = A.width * H / ah, bw = B.width * H / bh;
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
    ({ page, errors } = await bootPage(browser, 'ultra'));
    let ultra = null, neutral = null, dry = null, phone = null;
    await step('R11.benchCam is { map, x, y, dir, pitch, tod } on Oakhaven\'s square, and R11 draws it', async () => {
      const r = await page.evaluate(() => { const B = R11.benchCam; S.bench(); S.frame(); return { B, active: R11.active(), map: G.map.id, draws: R11.stats.draws }; });
      const B = r.B;
      ok(B && B.map === 'oakhaven' && ['x', 'y', 'dir', 'pitch', 'tod'].every((k) => typeof B[k] === 'number'), 'shape ' + JSON.stringify(B));
      ok(r.active && r.map === 'oakhaven', 'R11 active ' + r.active + ' map ' + r.map);
      console.log('  bench camera ' + JSON.stringify(B) + ', draws at Ultra ' + r.draws);
    });
    await page.waitForTimeout(5000);   // KIT's glTF props and textures arrive after the first frame of a map
    // Ultra frames take minutes on SwiftShader under load: Ultra draws only the bench shot; the comparisons run at Phone,
    // whose tone mapping carries the very same grade (gradeGLSL) as Ultra's output pass
    await step('Ultra: the grade is the composer\'s output pass (no OutputPass); the sky (through the oaks) is the brightest band and reads as day; the bench shot and side-by-sides are written', async () => {
      const r = await page.evaluate(() => { if (R11.tier() !== 'ultra') R11.setTier('ultra'); S.bench(); S.frame(); const P = R11.R.passes;
        return { tier: R11.tier(), grade: !!P.grade, names: R11.R.composer.passes.map((p) => p.constructor.name), reg: S.regions(), sky: S.pct(0, 0, 1, 0.22, 0.9), look: R11.look.get(), draws: R11.stats.draws }; });
      ultra = r.reg;
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11look-ultra.png') });
      console.log('  Ultra ' + JSON.stringify(ultra) + ' sky p90 ' + r.sky + ' exposure ' + r.look.exposure + ' wet ' + r.look.wet + ' draws ' + r.draws);
      ok(r.tier === 'ultra', 'tier ' + r.tier);
      ok(r.grade && !r.names.includes('OutputPass'), 'passes ' + r.names.join(','));
      ok(r.sky > ultra.ground.L * 1.3 && r.sky > ultra.mid.L * 1.3 && r.sky > 95 && r.sky < 225, 'sky ' + r.sky + ' ground ' + ultra.ground.L + ' mid ' + ultra.mid.L);
      ok(fs.existsSync(BENCH1), 'picture 1 missing: ' + BENCH1);
      await sideBySide(page, path.join(SHOT_DIR, 'r11look-ultra.png'), path.join(SHOT_DIR, 'r11look-sbs.png'), path.join(SHOT_DIR, 'r11look-sbs-grey.png'));
      ok(fs.statSync(path.join(SHOT_DIR, 'r11look-sbs-grey.png')).size > 10000, 'grey side-by-side not written');
    });
    await step('bloom only on what glows: the sky\'s ceiling is under the bloom threshold', async () => {
      const r = await page.evaluate(() => ({ cap: R11.look.get().LOOK.skyCap, th: R11.R.passes.bloom ? R11.R.passes.bloom.threshold : null }));
      ok(r.th != null && r.cap < r.th, JSON.stringify(r));
    });
    await step('High: the same grade output pass compiles and draws (one frame, near Ultra\'s values)', async () => {
      const r = await page.evaluate(() => { R11.setTier('high'); S.bench(); S.pin(() => render()); const P = R11.R.passes; return { tier: R11.tier(), grade: !!P.grade, names: R11.R.composer.passes.map((p) => p.constructor.name), all: S.stats(0, 0, 1, 1), draws: R11.stats.draws }; });
      console.log('  High ' + JSON.stringify(r.all) + ' draws ' + r.draws);
      ok(r.tier === 'high' && r.grade && !r.names.includes('OutputPass'), JSON.stringify(r));
      ok(Math.abs(r.all.L - ultra.all.L) < Math.max(12, ultra.all.L * 0.2) && r.all.sd > 15, 'high ' + r.all.L + ' sd ' + r.all.sd + ' ultra ' + ultra.all.L);
    });
    await step('Phone: no composer (no extra full-screen pass), the grade rides in the tone mapping, and agrees with Ultra', async () => {
      const r = await page.evaluate(() => { R11.setTier('phone'); S.bench(); S.frame(); return { tier: R11.tier(), composer: !!R11.R.composer, tm: R11.renderer.toneMapping === R11.THREE.CustomToneMapping, reg: S.regions(), draws: R11.stats.draws }; });
      phone = r.reg;
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11look-phone.png') });
      await sideBySide(page, path.join(SHOT_DIR, 'r11look-phone.png'), path.join(SHOT_DIR, 'r11look-sbs-phone.png'), path.join(SHOT_DIR, 'r11look-sbs-phone-grey.png'));
      console.log('  Phone ' + JSON.stringify(phone) + ', draws at Phone ' + r.draws);
      ok(r.tier === 'phone' && !r.composer && r.tm, 'tier ' + r.tier + ' composer ' + r.composer + ' custom tone mapping ' + r.tm);
      ok(Math.abs(phone.all.L - ultra.all.L) < Math.max(14, ultra.all.L * 0.22), 'phone ' + phone.all.L + ' ultra ' + ultra.all.L);
    });
    await step('the frame: darker than the neutral look (AgX alone, phase-1 exposure and fill, dry), more contrasted', async () => {
      const r = await page.evaluate(() => { const keep = R11.look.get(); R11.look.set(S.NEUTRAL); S.bench(); S.frame(); const n = S.regions(); R11.look.set(Object.assign({}, keep.LOOK, { grade: keep.GRADE, wetForce: null })); S.bench(); S.frame(); return { n, back: S.regions() }; });
      neutral = r.n;
      console.log('  neutral ' + JSON.stringify(neutral));
      ok(Math.abs(r.back.all.L - phone.all.L) < 3, 'the look comes back: ' + r.back.all.L + ' vs ' + phone.all.L);
      ok(phone.all.L < neutral.all.L * 0.88, 'view luma ' + phone.all.L + ' vs neutral ' + neutral.all.L);
      ok(phone.all.sd / phone.all.L > neutral.all.sd / neutral.all.L, 'relative contrast ' + phone.all.sd + '/' + phone.all.L + ' vs neutral ' + neutral.all.sd + '/' + neutral.all.L);
    });
    await step('the grade on known colours: greens and greys lose 10-25% saturation, a lamp keeps its colour, deep shade goes teal-grey', async () => {
      const g = await page.evaluate(() => S.grade([[0.05, 0.22, 0.04], [0.9, 0.36, 0.07], [0.012, 0.012, 0.012], [0.18, 0.2, 0.24]]));
      const sat = (c) => (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c));
      const inSat = (c) => sat(c.map((v) => 255 * Math.pow(v, 1 / 2.2)));
      const kG = sat(g[0]) / inSat([0.05, 0.22, 0.04]), kB = sat(g[3]) / inSat([0.18, 0.2, 0.24]), kL = sat(g[1]) / inSat([0.9, 0.36, 0.07]);
      console.log('  graded ' + JSON.stringify(g));
      ok(kG < 0.92 && kG > 0.6 && kB < 0.92, 'green kept ' + kG.toFixed(2) + ', blue-grey kept ' + kB.toFixed(2));
      ok(kL > 0.95, 'lamp kept ' + kL.toFixed(2));
      ok(g[2][2] > g[2][0] && g[2][1] >= g[2][0], 'deep shade ' + JSON.stringify(g[2]));
    });
    await step('wet cobbles: the cobble material is wet; wet, the open floor is darker and more contrasted than dry', async () => {
      const r = await page.evaluate(() => {
        let wetMat = false; R11.scene.traverse((o) => { if (o.name === 'r11-cobble' && o.material && o.material.userData.r11wet) wetMat = true; });
        R11.look.set({ wetForce: 0 }); S.bench(); S.frame(); const d = S.stats(0.46, 0.62, 0.6, 0.98);   // open floor between the hands
        R11.look.set({ wetForce: null }); S.bench(); S.frame(); const w = S.stats(0.46, 0.62, 0.6, 0.98);
        return { wetMat, d, w };
      });
      dry = r.d;
      console.log('  floor wet ' + JSON.stringify(r.w) + ' dry ' + JSON.stringify(r.d));
      ok(r.wetMat, 'cobble material without the wet hook');
      ok(r.w.L < r.d.L * 0.95 && r.w.sd / r.w.L > r.d.sd / r.d.L, 'wet ' + JSON.stringify(r.w) + ' dry ' + JSON.stringify(r.d));
    });
    await step('night at the bench camera: darker than day, still readable (Phone)', async () => {
      const r = await page.evaluate(() => { S.bench(0.96); S.frame(); const n = S.regions(); S.bench(); return n; });
      ok(r.all.L < phone.all.L * 0.8 && r.all.L > 8, 'night ' + r.all.L + ' day ' + phone.all.L);
    });
    await step('Pixel style hands the frame back (R11 off), Realistic takes it again', async () => {
      const r = await page.evaluate(() => { R11.setStyle('pixel'); S.bench(); S.frame(); const a = R11.active(); R11.setStyle('realistic'); S.bench(); S.frame(); return { pixel: a, back: R11.active() }; });
      ok(r.pixel === false && r.back === true, JSON.stringify(r));
    });
    await step('no page errors', async () => { ok(!errors.length, errors.slice(0, 3).join(' | ')); });
  } catch (e) {
    failed++; console.log('FAIL harness -- ' + (e && e.message ? e.message.split('\n')[0] : e));
  } finally {
    await browser.close();
  }
  console.log((failed ? 'FAILED' : 'OK') + ' r11look: ' + passed + ' passed, ' + failed + ' failed; shots in ' + SHOT_DIR);
  process.exit(failed ? 1 : 0);
})();
