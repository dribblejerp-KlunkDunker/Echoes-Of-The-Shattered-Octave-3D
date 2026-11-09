// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4102 node test/light21.test.js
// Phase 21 team LIGHT.
// Part 1 (the hotfix for "the sky was not loading properly"): the Phase 18 GPU compositor's on-device self-check, the
// lost-context path and the drawing-buffer placement, booted as a real player would (navigator.webdriver hidden, so
// js/max20.js makes its first-launch pick) with the compositor forced on (headless Chromium has only SwiftShader).
//   - no false alarm: the self-check runs and passes in the reference scenes (every hour, Medium and Cinematic)
//   - a composite that comes out black is caught: the compositor turns itself off and the canvas path shows the sky
//   - a lost context hands the frame to the canvas at once (no "present failed", no latch) and the compositor comes
//     back when the context is restored
//   - no page errors
// Part 2 (js/light21.js, the look of R3D): booted with R3D on (window.__r3d21 = { automation: true, force: true }).
//   - installed: the 'shade' chunk and the 'sky' and 'post' passes are LIGHT's, no shader errors
//   - every reference scene draws (Oakhaven noon/dusk/night, the tavern, the Deep Woods at night, Whisper-Grove at dusk, the
//     Root-vault, the clearing) in Medium and Cinematic, every hour and weather, with no black sky by day and a dark one
//     at night; the sky follows the hour; panoramas are on the dome; the moon and stars at night
//   - shadows: switching GFX.p21_shadows off brightens the shaded ground, on darkens it (and only outdoors by day)
//   - gameplay parity is CORE's (picking etc.); here: light21 never touches G, saves or RNG (a seeded trace with and
//     without the module) and the CPU raycaster's frames are byte-identical with and without js/light21.js
//   - frame cost of the LIGHT passes (SwiftShader: correctness only, not GPU timings)
//   PART=1|2 runs one part only.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4102';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'light21-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /gpu18|light21|render hook/.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript((o) => {
    // a real player: js/max20.js only runs its first-launch pick when navigator.webdriver is false
    try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true }); } catch (e) { /* fine */ }
    window.__max20 = { fake: { hwgl2: true, cores: 8, mobile: false, memory: 8 } };   // the owner's desktop: Cinematic
    try { localStorage.setItem('octave.gpu18.v1', JSON.stringify({ on: 1 })); } catch (e) { /* fine */ }
    if (o.preset) try { localStorage.setItem('octave.max20.v1', JSON.stringify({ v: 1, user: o.preset, base: o.preset, auto: null, settled: true })); } catch (e) { /* fine */ }
  }, { preset: opts.preset || 'cinematic' });
  await page.goto(URL + '/?nosw=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Light Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;   // our frames only
    window.L21 = {
      stage(map, x, y, dir, tod, wx) { G.state = 'play'; loadMap(map, x == null ? undefined : { x, y, dir }); G.fadeT = 0; G.tod = tod; Weather.hold(wx || 'clear'); Engine.cam.pitch = 0; },
      frames(n) { for (let i = 0; i < n; i++) render(); return GPU18.st.check; },
      skyLuma() {   // the presented 3D view (GPU layer when shown, else the canvas), mean luma of the top tenth
        const g = GPU18.active() ? GPU18.readFrame() : null;
        const F = g || { fb: new Uint32Array(Engine.ctx.getImageData(0, 0, Engine.canvas.width, Engine.canvas.height * 0.75).data.buffer), w: Engine.canvas.width };
        const w = F.w, rows = Math.max(1, (F.fb.length / w / 10) | 0); let s = 0;
        for (let i = 0; i < rows * w; i++) { const p = F.fb[i]; s += ((p & 255) * 77 + ((p >> 8) & 255) * 150 + ((p >> 16) & 255) * 29) >> 8; }
        return s / (rows * w);
      },
    };
  });
  return { page, ctx, errors };
}

const SCENES = [
  ['oakhaven', 23.5, 6.5, Math.PI / 2], ['clearing', 20.5, 32.5, -Math.PI / 2], ['deepwoods', null, null, null], ['whispergrove', null, null, null],
];

// ------------------------------------------------------------------------------------------------ part 2: the look
async function bootR3D(browser, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /light21|r3d21|render override|shader/.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  if (opts.block) await page.route('**/js/light21.js*', r => r.abort());
  await page.addInitScript((mode) => { window.__r3d21 = { automation: true, force: true }; try { localStorage.setItem('octave.r3d21.v1', JSON.stringify({ mode, cap: 80 })); } catch (e) { /* none */ } }, opts.mode || 'on');
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Light Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    const T = window.T21 = {};
    T.pin = (fn) => { const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now; let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000; try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; } };
    T.stage = (m, x, y, d, tod, wx, pitch) => T.pin(() => { G.state = 'paused'; G.day = 3; G.tod = tod; loadMap(m, x == null ? undefined : { x, y, dir: d }); G.fadeT = 0; G.tod = tod; G.day = 3; Engine.cam.pitch = pitch || 0; Engine.cam.bob = 0; Weather.hold(wx || 'clear'); Weather.apply(); G.state = 'play'; const ms = document.getElementById('msgs'); if (ms) ms.textContent = ''; });
    T.frame = (n) => { for (let i = 0; i < (n || 1); i++) T.pin(() => render()); };
    // the raw engine frame of only the scenery, every clock pinned (as test/gpu18.test.js and test/cinema14.test.js take it):
    // the stable cross-page reference for the CPU raycaster
    T.raw = () => T.pin(() => {
      for (const k of ['coldBreath', 'windSigns', 'dyingLights']) GFX[k] = false;
      if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
      const ents = G.ents.filter(e => e.kind === 'deco');
      for (const e of ents) { for (const k of Object.keys(e)) if (k.startsWith('anim') && typeof e[k] === 'number') e[k] = (k === 'animSX' || k === 'animSY' || k === 'animAlpha') ? 1 : 0; e.animSprite = null; e.animFlip = false; e._fb = 0; }
      PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir;
      Engine.setTime(5); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 }); Engine.setFlicker(1);
      Engine.cam.bob = 0; Engine.render(ents, G.tod);
    });
    // the presented 3D view: mean luma of rows (fractions of the view height from the top), and of the whole view
    T.luma = (y0, y1) => {
      const P = R3D.readPixels(); if (!P) return -1; const F = R3D.frame, w = P.w, top = F.vpY + F.vpH;   // GL rows from the bottom
      let s = 0, n = 0;
      for (let y = Math.floor(top - F.vpH * y1); y < Math.floor(top - F.vpH * y0); y++) for (let x = 0; x < w; x += 7) { const o = (y * w + x) * 4; s += P.data[o] * 0.3 + P.data[o + 1] * 0.59 + P.data[o + 2] * 0.11; n++; }
      return n ? s / n : -1;
    };
  });
  return { page, ctx, errors };
}
const REF = {
  oak_noon: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.5], oak_dusk: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.73], oak_night: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.96],
  tavern: ['tavern', 8.5, 10.5, -1.57, 0.85], woods_night: ['deepwoods', null, null, null, 0.96], grove_dusk: ['whispergrove', null, null, null, 0.73],
  vault: ['rootvault', 4.5, 5.5, 0, 0.5], clear_noon: ['clearing', 20.5, 32.5, -Math.PI / 2, 0.5],
};
async function part2(browser) {
  if (process.env.PART !== 'id') await part2look(browser);
  await part2identity(browser);
}
async function part2look(browser) {
  const { page, ctx, errors } = await bootR3D(browser);
  const E = (fn, a) => page.evaluate(fn, a);
  await step('R3D on, LIGHT installed: its shade chunk, sky and post passes, no shader errors', async () => {
    const r = await E(() => { T21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5); T21.frame(2); return { active: R3D.active(), st: LIGHT21.stats, passes: R3D.passes().map(p => p.name), shade: /l21Shadow/.test(R3D.chunk('shade') || '') }; });
    assert.strictEqual(r.active, true); assert.strictEqual(r.st.installed, true); assert.strictEqual(r.st.failed, ''); assert.strictEqual(r.shade, true);
    for (const n of ['sky', 'post']) assert.ok(r.passes.includes(n), n);
  });
  for (const preset of ['medium', 'cinematic']) {
    await step(`${preset}: every reference scene draws; the sky is lit by day and dark at night; panoramas and stars where they belong`, async () => {
      const out = {};
      for (const k of Object.keys(REF)) {
        const [m, x, y, d, t] = REF[k];
        out[k] = await E(([m, x, y, d, t, p]) => { PRESETS.apply(p); T21.stage(m, x, y, d, t); T21.frame(2); return { active: R3D.active(), sky: Math.round(T21.luma(0, 0.2)), all: Math.round(T21.luma(0, 1)), pano: LIGHT21.stats.panoLayers, stars: LIGHT21.P.sky2[0] }; }, [m, x, y, d, t, preset]);
        await page.locator('#game').screenshot({ path: path.join(SHOT_DIR, `l21-${preset}-${k}.png`) });
      }
      console.log('  ' + preset + ' ' + JSON.stringify(out));
      for (const k in out) { assert.strictEqual(out[k].active, true, k); assert.ok(out[k].all > 8, k + ' not black: ' + out[k].all); }
      assert.ok(out.oak_noon.sky > 120, 'noon sky ' + out.oak_noon.sky);
      assert.ok(out.oak_night.sky < out.oak_dusk.sky && out.oak_dusk.sky < out.oak_noon.sky, 'night < dusk < noon');
      assert.ok(out.oak_noon.pano > 0 && out.clear_noon.pano > 0, 'panorama layers on the dome');
      assert.ok(out.oak_night.stars > 0.3 && out.oak_noon.stars === 0, 'stars at night only');
    });
  }
  await step('every hour and weather draws (no black sky by day, no errors)', async () => {
    const bad = [];
    for (const wx of ['clear', 'overcast', 'rain', 'storm', 'mist', 'snow']) for (const t of [0.27, 0.5, 0.73, 0.96]) {
      const r = await E(([wx, t]) => { PRESETS.apply('medium'); T21.stage('clearing', 20.5, 32.5, -Math.PI / 2, t, wx); T21.frame(1); return { a: R3D.active(), sky: T21.luma(0, 0.2) }; }, [wx, t]);
      if (!r.a || (t === 0.5 && r.sky < (wx === 'storm' ? 35 : 50))) bad.push(wx + '@' + t + ':' + Math.round(r.sky));
    }
    assert.deepStrictEqual(bad, [], 'bad: ' + bad.join(' '));
  });
  await step('shadows: GFX.p21_shadows darkens the ground and walls in the shade (outdoors, by day)', async () => {
    const r = await E(() => {
      PRESETS.apply('medium'); T21.stage('oakhaven', 23.5, 6.5, Math.PI, 0.68, 'clear', 0); T21.frame(2);
      const grab = () => { const P = R3D.readPixels(); const out = new Uint8Array(P.data.length / 4); for (let i = 0, j = 0; i < P.data.length; i += 4, j++) out[j] = (P.data[i] * 0.3 + P.data[i + 1] * 0.59 + P.data[i + 2] * 0.11) | 0; return out; };
      GFX.p21_shadows = true; T21.frame(2); const on = grab();
      GFX.p21_shadows = false; T21.frame(2); const off = grab();
      GFX.p21_shadows = true; T21.frame(1);
      let darker = 0, lighter = 0; for (let i = 0; i < on.length; i++) { if (on[i] < off[i] - 6) darker++; else if (on[i] > off[i] + 6) lighter++; }
      return { darker: darker / on.length, lighter: lighter / on.length };
    });
    console.log('  shadowed share of the view ' + (r.darker * 100).toFixed(1) + '%');
    assert.ok(r.darker > 0.01 && r.lighter < 0.002, JSON.stringify(r));
  });
  await step('free look: looking straight up shows the sky (clouds, sun), straight down the ground; nothing black', async () => {
    const r = await E(() => {
      PRESETS.apply('medium'); const lim = R3D.camera && R3D.camera.limit ? R3D.camera.limit() : 1.3;
      T21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5); R3D.camera.setAngle(lim * 0.98); T21.frame(1); const up = T21.luma(0, 1);
      R3D.camera.setAngle(-lim * 0.98); T21.frame(1); const down = T21.luma(0, 1); R3D.camera.setAngle(0);
      return { up, down };
    });
    await page.locator('#game').screenshot({ path: path.join(SHOT_DIR, 'l21-look.png') });
    assert.ok(r.up > 100 && r.down > 20, JSON.stringify(r));
  });
  await step('frame cost of the LIGHT passes (SwiftShader: correctness, not GPU timing)', async () => {
    const r = await E(() => { PRESETS.apply('cinematic'); T21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.73); T21.frame(2); const t0 = performance.now(); T21.frame(6); const all = (performance.now() - t0) / 6; return { all, cpuParams: LIGHT21.stats.ms, sky: LIGHT21.stats.sky, post: LIGHT21.stats.post }; });
    console.log('  cinematic 1280x800 frame (SwiftShader) ' + r.all.toFixed(1) + ' ms; LIGHT CPU per frame ' + r.cpuParams.toFixed(2) + ' ms, sky pass submit ' + r.sky.toFixed(2) + ' ms, post submit ' + r.post.toFixed(2) + ' ms');
    assert.ok(r.cpuParams < 2, 'per-frame CPU work ' + r.cpuParams);
  });
  await step('no page errors (R3D on)', async () => { assert.deepStrictEqual(errors.filter(e => !/performance warning/i.test(e)), []); });
  await ctx.close();
}
async function part2identity(browser) {
  // the raycaster: byte-identical frames with and without js/light21.js (R3D off), and gameplay untouched
  // booted interleaved (without, with, without, with): what a page keeps from its boot (how long the game loop ran
  // before our frames) then falls on both sides alike
  const B = await bootR3D(browser, { mode: 'off', block: true }), A = await bootR3D(browser, { mode: 'off' }), C = await bootR3D(browser, { mode: 'off', block: true }), A2 = await bootR3D(browser, { mode: 'off' });
  await step('R3D off: the CPU raycaster frames are byte-identical with and without js/light21.js; gameplay trace identical', async () => {
    const run = (P) => P.evaluate((REF) => {
      const out = [];
      let h = 0; Engine.addPostHook((F) => { h = 2166136261; for (let i = 0; i < F.fb.length; i += 3) { h ^= F.fb[i]; h = Math.imul(h, 16777619); } }, 1e9);
      for (const k of ['oak_noon', 'oak_dusk', 'vault', 'clear_noon']) { const [m, x, y, d, t] = REF[k]; for (const p of ['medium', 'cinematic']) { PRESETS.apply(p); T21.stage(m, x, y, d, t); T21.raw(); out.push(k + ':' + p + ':' + (h >>> 0)); } }
      // a short seeded walk: the player's position and the entities after it
      T21.pin(() => {
        T21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5);
        // the pin freezes the wall clocks; these are the game's own (per-boot state that would otherwise ride into the walk)
        G.time = 4242; G.vel.x = 0; G.vel.y = 0; G.turnV = 0; G.bobPhase = 0; G.player.fat = G.player.fatMax;
        // and the walkers: the walk is keys and collision only — no townsfellow may jostle the player here (their schedules keep per-boot clocks of their own)
        const quiet = () => { for (const e of G.ents) { e.wanderT = 1e9; e.moving = false; e.solid = false; } };
        quiet();
        G.keys = { w: true }; for (let i = 0; i < 90; i++) { update(1 / 60); quiet(); } G.keys = {};
      });
      out.push('trace:' + [Engine.cam.x.toFixed(4), Engine.cam.y.toFixed(4), Engine.cam.dir.toFixed(4)].join(','));   // the player's walk: keys and collision only
      return out;
    }, REF);
    // other modules keep a little wall-clock state of their own, so two pages without the module can disagree on a frame
    // (js/gpu18.test.js has the same rule): compare only where the two module-less pages agree, and need most to agree
    const a = await run(A.page), b = await run(B.page), c = await run(C.page), a2 = await run(A2.page);
    const stable = b.map((x, i) => x === c[i] && a[i] === a2[i]);   // frames each pair of like pages agrees on
    console.log('  stable reference frames: ' + stable.filter(Boolean).length + ' of ' + b.length);
    assert.ok(stable.filter(Boolean).length >= 5, 'stable references ' + stable.filter(Boolean).length);
    assert.ok(stable[stable.length - 1], 'the gameplay trace is deterministic');
    const bad = a.filter((x, i) => stable[i] && x !== b[i]);
    assert.deepStrictEqual(bad, [], 'differ: ' + bad.join(' ') + ' | without: ' + b.filter((x, i) => stable[i] && x !== a[i]).join(' '));
    // the blocked pages miss js/light21.js on purpose (a load error there is expected)
    for (const P of [A, B, C, A2]) { const e = P.errors.filter(x => !/performance warning/i.test(x) && !((P === B || P === C) && /ERR_FAILED/.test(x))); assert.deepStrictEqual(e, [], 'page errors: ' + e.join(' | ')); }
  });
  await A.ctx.close(); await B.ctx.close(); await C.ctx.close(); await A2.ctx.close();
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const PART = process.env.PART || 'all';
  try {
    if (PART !== '2' && PART !== 'id') for (const preset of ['cinematic', 'medium']) {
      const { page, ctx, errors } = await bootPage(browser, { preset });
      await step(`${preset}: booted as a player, compositor on, preset ${preset}`, async () => {
        const s = await page.evaluate(() => ({ cur: PRESETS.current(), gpu: GPU18.active(), auto: MAX20.live }));
        assert.strictEqual(s.gpu, true); assert.strictEqual(s.cur, preset); assert.strictEqual(s.auto, true);
      });
      await step(`${preset}: the self-check runs and passes in every reference scene and hour (no false alarm)`, async () => {
        const out = [];
        for (const [m, x, y, d] of SCENES) for (const t of [0.5, 0.73, 0.96, 0.27]) {
          const c = await page.evaluate(([m, x, y, d, t]) => { L21.stage(m, x, y, d, t); GPU18.checkSoon(); return L21.frames(GPU18.CHECK.first + 2); }, [m, x, y, d, t]);
          out.push(`${m}@${t}:${c.last && c.last.ok}`);
          assert.ok(c.last && c.last.ok, `${m} ${t}: ${JSON.stringify(c.last)}`);
        }
        const st = await page.evaluate(() => ({ gpu: GPU18.active(), failed: GPU18.st.failed, runs: GPU18.st.check.runs, bad: GPU18.st.check.bad }));
        assert.strictEqual(st.gpu, true); assert.strictEqual(st.failed, false); assert.ok(st.runs >= 16, 'runs ' + st.runs); assert.strictEqual(st.bad, 0);
      });
      await step(`${preset}: storms, mist and snow at night and dusk pass too`, async () => {
        for (const wx of ['storm', 'mist', 'snow', 'rain']) for (const t of [0.73, 0.96]) {
          const c = await page.evaluate(([wx, t]) => { L21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, t, wx); GPU18.checkSoon(); return L21.frames(GPU18.CHECK.first + 2); }, [wx, t]);
          assert.ok(c.last && c.last.ok, `${wx} ${t}: ${JSON.stringify(c.last)}`);
        }
        assert.strictEqual(await page.evaluate(() => GPU18.active()), true);
      });
      await step(`${preset}: a lost context goes to the canvas the same frame, no latch, and comes back on restore`, async () => {
        const a = await page.evaluate(() => {
          L21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5);
          const lose = GPU18.gl().getExtension('WEBGL_lose_context'); window.__lose = lose; lose.loseContext();
          render();
          return { gpu: GPU18.active(), failed: GPU18.st.failed, lost: GPU18.st.lost };
        });
        assert.deepStrictEqual(a, { gpu: false, failed: false, lost: true });
        await page.evaluate(() => window.__lose.restoreContext());
        await page.waitForFunction(() => !GPU18.st.lost, null, { timeout: 30000 });
        const b = await page.evaluate(() => { L21.frames(GPU18.CHECK.first + 2); return { gpu: GPU18.active(), failed: GPU18.st.failed, ok: GPU18.st.check.last && GPU18.st.check.last.ok }; });
        assert.deepStrictEqual(b, { gpu: true, failed: false, ok: true });
      });
      await step(`${preset}: a composite that comes out black is caught and the canvas path shows the sky`, async () => {
        const r = await page.evaluate(() => {
          L21.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5); L21.frames(2);
          const before = L21.skyLuma();
          // a driver fault: every draw into the render-resolution composite target writes black instead
          const g = GPU18.gl(), draw = g.drawArrays.bind(g);
          g.drawArrays = function (m, f, c) {
            const vp = g.getParameter(g.VIEWPORT);
            if (g.getParameter(g.FRAMEBUFFER_BINDING) && vp[2] === Engine.canvas.width) { g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT); return; }
            return draw(m, f, c);
          };
          GPU18.checkSoon(); L21.frames(GPU18.CHECK.first + 6);
          g.drawArrays = draw;
          const after = L21.skyLuma();
          return { before, after, gpu: GPU18.active(), failed: GPU18.st.failed, why: GPU18.st.check.failedBy };
        });
        assert.ok(r.before > 60, 'sky before ' + r.before);
        assert.strictEqual(r.gpu, false); assert.strictEqual(r.failed, true); assert.ok(/black picture/.test(r.why), r.why);
        assert.ok(r.after > 60, 'sky after fallback ' + r.after);
        await page.locator('#game').screenshot({ path: path.join(SHOT_DIR, `selfcheck-fallback-${preset}.png`) });
      });
      await step(`${preset}: no page errors (the one self-check warning aside)`, async () => {
        const bad = errors.filter(e => !/self-check: black picture/.test(e));
        assert.deepStrictEqual(bad, []);
      });
      await ctx.close();
    }
    if (PART !== '1') await part2(browser);   // PART=id: only the raycaster identity check
  } finally { await browser.close(); }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
