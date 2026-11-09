// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4011 node test/gpu18.test.js
// Covers js/gpu18.js (Phase 18, team GPU): the WebGL2 compositor. The switch on and off (layers, Engine.ctx, the Options
// row, persistence, the auto default), the fallback when WebGL2 is missing (getContext stubbed), lost-context recovery,
// the GPU frame against the CPU frame (Medium with bloom and grade on the GPU, Cinematic with grade and the cinema pass,
// 1x and 2x, outdoors and in), the port of post.js grade, HUD text crisp at scale 1, the Original preset and the switch off
// leaving every frame byte-identical to a page without the module, and page errors.
// Headless Chromium here has only SwiftShader (a software WebGL2): everything is checked for correctness on it; its
// timings are not GPU timings.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4011';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'gpu18-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  page.setDefaultTimeout(300000);   // a loaded build machine can take minutes to boot a page
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' && !(opts.block && /ERR_FAILED|gpu18/.test(m.text()))) || (m.type() === 'warning' && /gpu18|render hook/.test(m.text()))) errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/gpu18.js*', r => r.abort());
  if (opts.init) await page.addInitScript(opts.init);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Gpu Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.evaluate(HELPERS);
  return { page, errors };
}

const SCENES = {
  oak: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.73, {}],          // dusk: lamps, sky, the gate-warden
  oakNight: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.96, {}],     // night
  clear: ['clearing', 20.5, 32.5, -Math.PI / 2, 0.3, {}],
  vault: ['rootvault', 4.5, 5.5, 0, 0.5, {}],
  tavern: ['tavern', 8.5, 10.5, -1.57, 0.85, {}],
};

const HELPERS = () => {
  const S = window.S = { cap: null };
  Engine.addPostHook(F => { S.cap = { fb: F.fb.slice(), w: F.w, h: F.h }; }, 1e9);   // the frame as the CPU leaves it
  window.requestAnimationFrame = () => 0;   // the game loop must not render between our frames
  S.pin = (fn) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
  };
  S.stage = (sc) => S.pin(() => {
    const [map, x, y, dir, tod, flags] = sc;
    G.state = 'paused'; for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {});
    // the day and hour are set BEFORE the map loads as well: what a map puts out when it loads (js/festivals12.js's
    // bunting and lanterns, by the day and hour) must not depend on where the page's clock had got to
    G.day = 3; G.tod = tod;
    loadMap(map, { x, y, dir }); G.fadeT = 0; G.tod = tod; G.day = 3;
    Engine.cam.pitch = 0; Engine.cam.bob = 0; Weather.hold('clear'); GFX.reduceMotion = false; GFX.noFlash = false;
  });
  S.steady = () => { for (const k of ['coldBreath', 'windSigns', 'dyingLights']) GFX[k] = false; };
  // one frame through the game's own render() (which the compositor wraps), with every clock pinned and only scenery
  S.frame = (preset, gpu, t) => S.pin(() => {
    if (preset) PRESETS.apply(preset);
    const has = typeof GPU18 !== 'undefined';
    if (gpu != null && has) GPU18.setEnabled(gpu, { noSave: true });
    S.steady();
    if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
    const ents = G.ents.filter(e => e.kind === 'deco');
    for (const e of ents) { for (const k of Object.keys(e)) if (k.startsWith('anim') && typeof e[k] === 'number') e[k] = (k === 'animSX' || k === 'animSY' || k === 'animAlpha') ? 1 : 0; e.animSprite = null; e.animFlip = false; e._fb = 0; }
    PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir;
    Engine.setTime(t == null ? 5 : t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 }); Engine.setFlicker(1);
    Engine.cam.bob = 0;
    const er = Engine.render; Engine.render = function (e, tod, o) { return er.call(this, ents, tod, o); };
    try { render(); } finally { Engine.render = er; }
    return has && GPU18.active() ? GPU18.readFrame() : S.cap;
  });
  // the raw engine frame (no render() wrappers), as test/cinema14.test.js takes it: the stable cross-page reference
  S.raw = (preset) => S.pin(() => {
    if (preset) PRESETS.apply(preset);
    S.steady();
    if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
    const ents = G.ents.filter(e => e.kind === 'deco');
    for (const e of ents) { for (const k of Object.keys(e)) if (k.startsWith('anim') && typeof e[k] === 'number') e[k] = (k === 'animSX' || k === 'animSY' || k === 'animAlpha') ? 1 : 0; e.animSprite = null; e.animFlip = false; e._fb = 0; }
    PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir;
    Engine.setTime(5); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 }); Engine.setFlicker(1);
    Engine.cam.bob = 0; Engine.render(ents, G.tod);
    return S.cap;
  });
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  // a GPU frame against the CPU frame of the same moment, only where two CPU renders agree (other modules keep a little
  // wall-clock state of their own); per channel
  S.compare = (preset, scale) => {
    PRESETS.apply(preset); if (scale) PRESETS.setScale(scale);
    if (typeof CINEMA14 !== 'undefined') CINEMA14.T.gradeOnCanvas = true;   // the CPU reference grades on the canvas, as the shader does
    const a = S.frame(null, false).fb.slice(), g = S.frame(null, true), b = S.frame(null, false).fb.slice();
    if (typeof CINEMA14 !== 'undefined') CINEMA14.T.gradeOnCanvas = false;
    GPU18.setEnabled(false, { noSave: true });
    let n = 0, sum = 0, max = 0, over2 = 0, stable = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) continue;
      stable++;
      const p = a[i], q = g.fb[i];
      for (let s = 0; s < 24; s += 8) { const d = Math.abs(((p >> s) & 255) - ((q >> s) & 255)); sum += d; n++; if (d > max) max = d; if (d > 2) over2++; }
    }
    return { len: [a.length, g.fb.length], stable: stable / a.length, mean: sum / Math.max(1, n), max, over2: over2 / Math.max(1, n), passes: GPU18.stats.lastPasses };
  };
  S.shotStats = async (dataUrl, x0, y0, x1, y1, block) => {
    const im = new Image(); im.src = dataUrl; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let blocks = 0, mixed = 0;
    for (let by = y0; by + block <= y1; by += block) for (let bx = x0; bx + block <= x1; bx += block) {
      blocks++; const o0 = (by * c.width + bx) * 4; let uni = true;
      for (let j = 0; j < block && uni; j++) for (let i = 0; i < block; i++) { const o = ((by + j) * c.width + bx + i) * 4; if (d[o] !== d[o0] || d[o + 1] !== d[o0 + 1] || d[o + 2] !== d[o0 + 2]) { uni = false; break; } }
      if (!uni) mixed++;
    }
    return { blocks, mixed: mixed / Math.max(1, blocks) };
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let A = null, B = null, C = null, D = null;
  try {
    A = await bootPage(browser);
    const pg = A.page, Q = (fn, arg) => pg.evaluate(fn, arg);
    const info = await Q(() => ({ renderer: GPU18.renderer(), software: GPU18.software(), avail: GPU18.st.available, on: GFX.gpuCompositor }));
    console.log('WebGL2 here: ' + JSON.stringify(info));

    // ------------------------------------------------------------------------------------------------ switch
    await step('auto default: off on a software rasteriser (SwiftShader here), so the CPU path stays the default; nothing is shown', async () => {
      const r = await Q(() => ({ on: GFX.gpuCompositor, active: GPU18.active(), cls: document.getElementById('game').classList.contains('gpu18-on'), ctx: Engine.ctx === Engine.canvas.getContext('2d'), stored: localStorage.getItem(GPU18.KEY) }));
      assert.deepEqual(r, { on: false, active: false, cls: false, ctx: true, stored: null });
    });
    await step('switch on: WebGL2 layers shown over the view, Engine.ctx is the device-resolution HUD layer, the frame is presented; off puts everything back', async () => {
      const r = await Q((SC) => {
        S.stage(SC.oak); PRESETS.apply('medium');
        const o = {};
        o.set = GPU18.setEnabled(true, { noSave: true }); render();
        const L = GPU18.layers(), gl = document.getElementById('gpu18-gl'), hud = document.getElementById('gpu18-hud');
        o.on = { active: GPU18.active(), ctxHud: Engine.ctx === L.hudCtx, glShown: getComputedStyle(gl).display, hudShown: getComputedStyle(hud).display, hudSize: [hud.width, hud.height], glSize: [gl.width, gl.height], frames: GPU18.stats.frames > 0, pe: getComputedStyle(gl).pointerEvents + '/' + getComputedStyle(hud).pointerEvents, veilHidden: !CINEMA14.veilShown() };
        GPU18.setEnabled(false, { noSave: true }); render();
        o.off = { active: GPU18.active(), ctxView: Engine.ctx === L.viewCtx, glShown: getComputedStyle(gl).display };
        return o;
      }, SCENES);
      assert.equal(r.set, true);
      assert.deepEqual(r.on, { active: true, ctxHud: true, glShown: 'block', hudShown: 'block', hudSize: [1280, 800], glSize: [1280, 800], frames: true, pe: 'none/none', veilHidden: true });
      assert.deepEqual(r.off, { active: false, ctxView: true, glShown: 'none' });
    });
    await step('Options: a "GPU compositor" row that toggles, remembers the choice, and fits 640x400', async () => {
      await Q(() => { localStorage.removeItem(GPU18.KEY); PRESETS.apply('medium'); G.state = 'panel'; renderMenu(); });
      await pg.locator('#mn-gfx').click();
      assert.equal(await pg.locator('#gpu-comp').count(), 1);
      assert.equal(await pg.locator('#gpu-comp').textContent(), 'Off');
      await pg.locator('#gpu-comp').click();
      let s = await Q(() => ({ on: GFX.gpuCompositor, txt: document.getElementById('gpu-comp').textContent, pressed: document.getElementById('gpu-comp').getAttribute('aria-pressed'), stored: localStorage.getItem(GPU18.KEY), preset: PRESETS.current() }));
      assert.deepEqual(s, { on: true, txt: 'On', pressed: 'true', stored: '{"on":1}', preset: 'medium' });   // not a preset flag: the preset stays Medium
      await pg.setViewportSize({ width: 640, height: 400 });
      await Q(() => { renderAccessibilityMenu(); });
      const r = await Q(() => {
        const panel = document.querySelector('#modal-panel'), bad = [];
        const b = document.getElementById('gpu-comp'); b.scrollIntoView({ block: 'nearest' }); const q = b.getBoundingClientRect();
        if (q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1 || q.width < 4) bad.push([q.left, q.right, q.top, q.bottom].map(Math.round));
        return { x: panel.scrollWidth <= panel.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1, bad };
      });
      await pg.screenshot({ path: path.join(SHOT_DIR, 'options-gpu-640x400.png') });
      await pg.setViewportSize({ width: 1280, height: 800 });
      await pg.locator('#gpu-comp').click();
      s = await Q(() => ({ on: GFX.gpuCompositor, stored: localStorage.getItem(GPU18.KEY) }));
      await Q(() => { closeModal(); G.state = 'play'; localStorage.removeItem(GPU18.KEY); });
      assert.deepEqual(r.bad, []); assert.ok(r.x, 'no horizontal overflow');
      assert.deepEqual(s, { on: false, stored: '{"on":0}' });
    });
    await step('persistence: a stored "on" comes back at boot (even on a software rasteriser); a hostile stored value is ignored', async () => {
      const P1 = await bootPage(browser, { init: () => { try { localStorage.setItem('octave.gpu18.v1', '{"on":1}'); } catch (e) { /* */ } } });
      const a = await P1.page.evaluate(() => { render(); return { on: GFX.gpuCompositor, active: GPU18.active() }; });
      await P1.page.evaluate(() => localStorage.setItem('octave.gpu18.v1', '{"on":"<img src=x onerror=alert(1)>"}'));
      await P1.page.close();
      const P2 = await bootPage(browser);
      const b = await P2.page.evaluate(() => ({ on: GFX.gpuCompositor, active: GPU18.active() }));
      await P2.page.evaluate(() => localStorage.removeItem('octave.gpu18.v1'));
      await P2.page.close();
      assert.deepEqual(a, { on: true, active: true });
      assert.deepEqual(b, { on: false, active: false });
      assert.deepEqual(P1.errors.concat(P2.errors), []);
    });

    // ------------------------------------------------------------------------------------------------ fallback
    await step('fallback: with WebGL2 unavailable (getContext stubbed) the switch cannot turn on, the row says so, and the canvas path renders', async () => {
      const F = await bootPage(browser, { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t) { if (/webgl2/i.test(t)) return null; return g.apply(this, arguments); }; } });
      const r = await F.page.evaluate((SC) => {
        S.stage(SC.oak);
        const o = { set: GPU18.setEnabled(true, { noSave: true }), avail: GPU18.available(), active: GPU18.active(), ctx: Engine.ctx === Engine.canvas.getContext('2d') };
        const f = S.frame('cinematic'); o.frame = !!(f && f.fb.length === 640 * 300);
        G.state = 'panel'; renderAccessibilityMenu(); const b = document.getElementById('gpu-comp'); o.row = b ? [b.textContent, b.disabled] : null;
        closeModal(); G.state = 'play'; PRESETS.apply('medium');
        return o;
      }, SCENES);
      await F.page.close();
      assert.deepEqual(r, { set: false, avail: false, active: false, ctx: true, frame: true, row: ['Not available', true] });
      assert.deepEqual(F.errors, []);
    });

    // ------------------------------------------------------------------------------------------------ correctness
    await step('post.js grade, as this module rebuilds it, equals post.js on every pixel (five areas, day/dusk/night)', async () => {
      const r = await Q(() => {
        const bad = [];
        for (const [map, outdoor, tod, sky] of [['oakhaven', true, 0.5, 1], ['oakhaven', true, 0.76, 0.4], ['deepwoods', true, 0.95, 0.05], ['tavern', false, 0.5, 1], ['whispergrove', true, 0.3, 0.7], ['catacombs', false, 0.1, 0]]) {
          const n = 4096, fb = new Uint32Array(n); let s = 99; for (let i = 0; i < n; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; fb[i] = (0xff000000 | (s & 0xffffff)) >>> 0; }
          const F = { fb: fb.slice(), w: 64, h: 64, map: { id: map }, outdoor, skyDay: sky, tod };
          POST.reset(); POST.hooks.grade(F);
          for (let i = 0; i < n; i++) if ((F.fb[i] >>> 0) !== GPU18.gradeOne({ map: { id: map }, outdoor, skyDay: sky, tod }, fb[i])) { bad.push(map + ':' + i); break; }
        }
        POST.reset();
        return bad;
      });
      assert.deepEqual(r, []);
    });
    const cmpSteps = [
      ['Medium 1x, Oakhaven at dusk', 'oak', 'medium', 1],
      ['Medium 2x, Oakhaven at night', 'oakNight', 'medium', 2],
      ['Medium 2x, the Root-vault (its lights bloom)', 'vault', 'medium', 2],
      ['Medium 1x, the tavern', 'tavern', 'medium', 1],
      ['Cinematic 2x, the clearing (far haze, rays, ground fog, grade, vignette)', 'clear', 'cinematic', 2],
      ['Cinematic 1x, Oakhaven at dusk', 'oak', 'cinematic', 1],
      ['Cinematic 2x, the Root-vault (indoor depth haze)', 'vault', 'cinematic', 2],
    ];
    const cmpOut = {};
    for (const [label, id, preset, sc] of cmpSteps) {
      await step('GPU vs CPU frame: ' + label + ' — mean abs difference under 0.25 a level, under 0.1% of channel values off by more than 2', async () => {
        const r = await Q(([sc0, preset, sc]) => { S.stage(sc0); const o = S.compare(preset, sc); PRESETS.apply('medium'); return o; }, [SCENES[id], preset, sc]);
        cmpOut[label] = r;
        assert.deepEqual(r.len, [320 * sc * 150 * sc, 320 * sc * 150 * sc]);
        assert.ok(r.stable > 0.97, 'stable reference pixels: ' + r.stable.toFixed(4));
        assert.ok(r.mean < 0.25 && r.over2 < 0.001, JSON.stringify(r));
        if (preset === 'medium') assert.ok(r.passes.grade && r.passes.bloom && !r.passes.cine, 'Medium moves post.js bloom and grade: ' + JSON.stringify(r.passes));
        else assert.ok(r.passes.grade && r.passes.cine && !r.passes.bloom, 'Cinematic moves post.js grade and the cinema pass: ' + JSON.stringify(r.passes));
      });
    }
    await step('the moved passes are really on the GPU: the CPU leaves the frame without them, the shader adds them (and the Root-vault has bloom to move)', async () => {
      const r = await Q((SC) => {
        S.stage(SC.vault); PRESETS.apply('medium'); PRESETS.setScale(2);
        const cpuNoBloom = (() => { GFX.bloom = false; const f = S.frame(null, false).fb.slice(); GFX.bloom = true; return f; })();
        const cpu = S.frame(null, false).fb.slice();
        const gpu = S.frame(null, true).fb, raw = S.cap.fb;   // the CPU frame inside a presented frame: bloom and grade skipped
        let bloomPx = 0, rawDiff = 0, same = 0;
        for (let i = 0; i < cpu.length; i++) { if (cpu[i] !== cpuNoBloom[i]) bloomPx++; if (raw[i] !== gpu[i]) rawDiff++; if (cpu[i] === gpu[i]) same++; }
        const s = GPU18.stats.lastPasses;
        GPU18.setEnabled(false, { noSave: true }); PRESETS.apply('medium');
        return { bloomPx, rawDiff: rawDiff / cpu.length, same: same / cpu.length, s };
      }, SCENES);
      assert.ok(r.bloomPx > 200, 'bloom changes the scene: ' + r.bloomPx);
      assert.ok(r.rawDiff > 0.5, 'the CPU skipped grade and bloom (most pixels differ from the presented frame): ' + r.rawDiff);
      assert.ok(r.same > 0.97, 'and the presented frame is the CPU look: ' + r.same);
    });
    await step('accessibility on the GPU path: High contrast drops the cinema grade and vignette; No flashes and Reduce motion still match the CPU', async () => {
      const r = await Q((SC) => {
        S.stage(SC.clear); const o = {};
        ACCESS.setHighContrast(true); o.hc = S.compare('cinematic', 2); ACCESS.setHighContrast(false);
        GFX.noFlash = true; GFX.reduceMotion = true; S.stage(SC.clear); GFX.noFlash = true; GFX.reduceMotion = true;
        o.nf = S.compare('cinematic', 2);
        GFX.noFlash = false; GFX.reduceMotion = false; PRESETS.apply('medium');
        return o;
      }, SCENES);
      for (const k of ['hc', 'nf']) assert.ok(r[k].mean < 0.25 && r[k].over2 < 0.001, k + ': ' + JSON.stringify(r[k]));
    });

    // ------------------------------------------------------------------------------------------------ lost context
    await step('lost context: the canvas path takes over at once (frames keep coming, no errors); on restore the compositor comes back and matches the CPU', async () => {
      const r = await Q(async (SC) => {
        S.stage(SC.oak); PRESETS.apply('medium'); GPU18.setEnabled(true, { noSave: true }); render();
        const ext = GPU18.gl().getExtension('WEBGL_lose_context'), o = { ext: !!ext };
        ext.loseContext();
        for (let i = 0; i < 100 && !GPU18.st.lost; i++) await new Promise(res => setTimeout(res, 20));
        o.lost = { lost: GPU18.st.lost, active: GPU18.active(), ctxView: Engine.ctx === GPU18.layers().viewCtx, shown: getComputedStyle(document.getElementById('gpu18-gl')).display };
        const f = S.frame(null); o.cpuFrame = !!(f && f.fb && f.fb.length === 320 * 150); for (let i = 0; i < 3; i++) render();
        ext.restoreContext();
        for (let i = 0; i < 100 && GPU18.st.lost; i++) await new Promise(res => setTimeout(res, 20));
        render();
        o.back = { lost: GPU18.st.lost, active: GPU18.active(), ctxHud: Engine.ctx === GPU18.layers().hudCtx };
        o.cmp = S.compare('medium', 1);
        PRESETS.apply('medium'); GPU18.setEnabled(false, { noSave: true });
        return o;
      }, SCENES);
      assert.equal(r.ext, true);
      assert.deepEqual(r.lost, { lost: true, active: false, ctxView: true, shown: 'none' });
      assert.equal(r.cpuFrame, true);
      assert.deepEqual(r.back, { lost: false, active: true, ctxHud: true });
      assert.ok(r.cmp.mean < 0.25 && r.cmp.over2 < 0.001, JSON.stringify(r.cmp));
    });

    // ------------------------------------------------------------------------------------------------ HUD text
    await step('HUD text is crisp at scale 1: drawn at device resolution (1280x800), not a 320x200 text upscaled 4x', async () => {
      const shot = async (gpu) => {
        await Q(([sc, gpu]) => { S.stage(sc); S.frame('medium', gpu); }, [SCENES.oak, gpu]);
        const buf = await pg.screenshot({ path: path.join(SHOT_DIR, 'hud-medium-' + (gpu ? 'gpu' : 'cpu') + '.png') });
        // the status box and the place / name lines of the bottom panel, on the 4x4 grid of the 320x200 canvas
        const url = 'data:image/png;base64,' + buf.toString('base64');
        return Q(([u]) => Promise.all([S.shotStats(u, 624, 620, 880, 780, 4), S.shotStats(u, 940, 680, 1260, 780, 4)]), [url]);
      };
      const cpu = await shot(false), gpu = await shot(true);
      await Q(() => { GPU18.setEnabled(false, { noSave: true }); });
      console.log('  non-uniform 4x4 blocks in the HUD text: canvas ' + cpu.map(s => s.mixed.toFixed(3)).join(' / ') + ', compositor ' + gpu.map(s => s.mixed.toFixed(3)).join(' / '));
      for (const s of cpu) assert.ok(s.mixed < 0.01, 'the canvas path is blocky (each 4x4 block one colour): ' + JSON.stringify(cpu));
      for (const s of gpu) assert.ok(s.mixed > 0.08, 'the compositor draws glyph edges inside the 4x4 blocks: ' + JSON.stringify(gpu));
    });

    // ------------------------------------------------------------------------------------------------ identity
    // three FRESH pages with the same history: one with the module, two without. The page that ran the steps above has
    // rendered hundreds of frames, and modules that keep per-frame state of their own (a torch's flicker, js/festivals12's
    // decorations) would make it differ from a fresh page for reasons that have nothing to do with this module.
    D = await bootPage(browser, {});
    B = await bootPage(browser, { block: true });
    C = await bootPage(browser, { block: true });
    await step('Original preset untouched: with the switch on, Original shows no compositor and its frames (and the view canvas) are byte-identical to a page without js/gpu18.js; so are Medium and Cinematic with the switch off', async () => {
      const run = (P, mod) => P.evaluate(([SC, mod]) => {
        const out = [];
        if (mod) GPU18.setEnabled(true, { noSave: true });
        for (const id of ['oak', 'clear', 'vault']) {
          S.stage(SC[id]);
          PRESETS.apply('original'); S.steady();
          out.push(id + ':original:' + S.hash(S.raw(null).fb));
        }
        if (mod) GPU18.setEnabled(false, { noSave: true });
        for (const id of ['oak', 'clear', 'vault']) { S.stage(SC[id]); for (const p of ['medium', 'cinematic']) { PRESETS.apply(p); S.steady(); out.push(id + ':' + p + ':' + S.hash(S.raw(null).fb)); } }
        PRESETS.apply('medium');
        return out;
      }, [SCENES, mod]);
      // with the switch on, Original goes through render() without the compositor: nothing shown, the view canvas holds the frame
      const orig = await Q((SC) => {
        S.stage(SC.oak); GPU18.setEnabled(true, { noSave: true }); PRESETS.apply('original');
        const f0 = GPU18.stats.frames; S.frame(null);
        const v = Engine.canvas.getContext('2d').getImageData(0, 0, 320, 150).data, c = new Uint32Array(v.buffer.slice(0));
        let same = 0; for (let i = 0; i < c.length; i++) if (c[i] === S.cap.fb[i]) same++;
        const o = { active: GPU18.active(), presented: GPU18.stats.frames - f0, ctxView: Engine.ctx === GPU18.layers().viewCtx, shown: getComputedStyle(document.getElementById('gpu18-gl')).display, viewIsFrame: same / c.length };
        PRESETS.apply('medium'); o.backOn = GPU18.active(); GPU18.setEnabled(false, { noSave: true });
        return o;
      }, SCENES);
      assert.deepEqual(orig, { active: false, presented: 0, ctxView: true, shown: 'none', viewIsFrame: orig.viewIsFrame, backOn: true });
      assert.ok(orig.viewIsFrame > 0.95, 'the view canvas shows the engine frame (weapon and crosshair drawn over it aside): ' + orig.viewIsFrame);
      // other modules keep a little wall-clock state, so two module-less pages can disagree on a frame now and then (more on
      // a loaded machine): compare only where they agree, retrying up to three times for enough stable references
      let a, b, c, stable;
      for (let attempt = 0; attempt < 3; attempt++) {
        a = await run(D.page, true); b = await run(B.page, false); c = await run(C.page, false);
        stable = b.map((x, i) => x === c[i]);
        if (stable.filter(Boolean).length >= 7) break;
      }
      assert.equal(a.length, 9);
      assert.ok(stable.filter(Boolean).length >= 6, 'stable reference frames: ' + stable.filter(Boolean).length + ' of 9');
      const bad = a.filter((x, i) => stable[i] && x !== b[i]);
      assert.deepEqual(bad, [], 'differing: ' + bad.join(' ') + ' vs ' + b.filter((x, i) => stable[i] && x !== a[i]).join(' '));
    });

    // ------------------------------------------------------------------------------------------------ screenshots
    await step('screenshots: Medium and Cinematic, canvas path and compositor, four scenes', async () => {
      for (const id of ['oak', 'clear', 'vault', 'tavern']) for (const p of ['medium', 'cinematic']) for (const gpu of [false, true]) {
        await Q(([sc, p, gpu]) => { S.stage(sc); S.frame(p, gpu); }, [SCENES[id], p, gpu]);
        await pg.screenshot({ path: path.join(SHOT_DIR, id + '-' + p + '-' + (gpu ? 'gpu' : 'cpu') + '.png') });
      }
      await Q(() => { GPU18.setEnabled(false, { noSave: true }); PRESETS.apply('medium'); });
    });

    fs.writeFileSync(path.join(SHOT_DIR, 'gpu18-compare.json'), JSON.stringify({ info, cmp: cmpOut }, null, 1));
    await step('no page errors', async () => { assert.deepEqual(A.errors, []); assert.deepEqual(B.errors, []); assert.deepEqual(C.errors, []); assert.deepEqual(D.errors, []); });
  } catch (e) {
    failed++; console.log('FAIL harness: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
