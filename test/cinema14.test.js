// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3927 node test/cinema14.test.js
// Covers js/cinema14.js (Phase 14 CINEMA): the Cinematic preset, its three switches (Cinematic light, Ground fog,
// Cinematic grade), identity for every other preset (frame hashes against a page with js/cinema14.js blocked, and the frame
// just before and after the hook), what each switch may change (and that nothing blurs), the frame-cost table (12 enemies,
// Oakhaven at dusk, 1x and 2x, four reference scenes), accessibility (No flashes, Reduce motion, High contrast,
// colour-blind), the Options rows at 640x400, persistence and page errors.
//   SHOT_DIR=/some/dir   where screenshots and the cost table go (default: os tmpdir)
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3927';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'cinema14-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' && !(opts.block && /ERR_FAILED|cinema14/.test(m.text()))) || (m.type() === 'warning' && /cinema14|render hook/.test(m.text()))) errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/cinema14.js*', r => r.abort());
  if (opts.init) await page.addInitScript(opts.init);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Cinema Tester');
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

// the four reference cameras the owner approved the look on
const SCENES = {
  oak: ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.73, {}],
  clear: ['clearing', 20.5, 32.5, -Math.PI / 2, 0.3, {}],
  grove: ['whispergrove', 24.5, 43.5, -Math.PI / 2, 0.85, { part3: true, greening: true }],
  vault: ['rootvault', 4.5, 5.5, 0, 0.5, {}],
};

const HELPERS = () => {
  const S = window.S = { cap: null, on: false };
  // captures just before (94.5) and just after (95.5) the module's hook at 95
  Engine.addPostHook(F => { if (S.on) S.pre = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, S: F.S, horizon: F.horizon, outdoor: F.outdoor, far: F.far, fogDist: F.fogDist, fogR: F.fogR, fogG: F.fogG, fogB: F.fogB, animT: F.animT, wx: F.wx ? Object.assign({}, F.wx) : null }; }, 94.5);
  // the module's hook alone on a copy of the frame captured just before it, at a chosen animation time
  S.hookAt = (t) => { const F = Object.assign({}, S.pre, { fb: S.pre.fb.slice(), animT: t }); CINEMA14.hook(F); return S.hash(F.fb); };
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, horizon: F.horizon }; }, 95.5);
  window.requestAnimationFrame = () => 0;   // the game loop must not render between our frames
  // every clock and random number pinned (as test/far14.test.js does), so two pages give the same frame of the same scene
  S.pin = (fn) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
  };
  S.stage = (sc) => S.pin(() => {
    const [map, x, y, dir, tod, flags] = sc;
    G.state = 'paused'; for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {});
    loadMap(map, { x, y, dir }); G.fadeT = 0; G.tod = tod; G.day = 3;
    Engine.cam.pitch = 0; Engine.cam.bob = 0; Weather.hold('clear'); GFX.reduceMotion = false; GFX.noFlash = false;
  });
  // a frame with pinned time, weather, clocks and animation state; only scenery (no wandering NPCs)
  S.frame = (preset, flags, t) => S.pin(() => {
    if (preset) PRESETS.apply(preset);
    if (flags) for (const k of ['cineLight', 'cineFog', 'cineGrade']) if (k in flags) GFX[k] = flags[k];
    if (preset || flags) GFX.changed();
    if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
    const ents = G.ents.filter(e => e.kind === 'deco');
    for (const e of ents) { for (const k of Object.keys(e)) if (k.startsWith('anim') && typeof e[k] === 'number') e[k] = (k === 'animSX' || k === 'animSY' || k === 'animAlpha') ? 1 : 0; e.animSprite = null; e.animFlip = false; e._fb = 0; }
    PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir;
    Engine.setTime(t == null ? 5 : t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 }); Engine.setFlicker(1);
    Engine.cam.bob = 0;
    S.on = true; Engine.render(ents, G.tod); S.on = false;
    return S.cap;
  });
  S.steady = () => { for (const k of ['coldBreath', 'windSigns', 'dyingLights']) GFX[k] = false; };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  S.png = () => { const c = Engine.canvas, o = document.createElement('canvas'), vh = Engine.VIEW_H * Engine.getScale(); o.width = c.width; o.height = vh; o.getContext('2d').drawImage(c, 0, 0, c.width, vh, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let A = null, B = null, C = null;
  try {
    A = await bootPage(browser);
    B = await bootPage(browser, { block: true });
    C = await bootPage(browser, { block: true });   // a second page without the module: what two such pages agree on is the reference
    const pg = A.page, Q = (fn, arg) => pg.evaluate(fn, arg);

    // ------------------------------------------------------------------------------------------------ preset values
    await step('preset: Cinematic is scale 2, view distance 2.5 (FAR far mode), particles 1.25, after Ultra, post.js bloom off; its three switches are on only there', async () => {
      const r = await Q(() => {
        const o = { t: JSON.parse(JSON.stringify(PRESETS.table.cinematic)), order: PRESETS.order.slice(), flags: {} };
        for (const n of PRESETS.order) { PRESETS.apply(n); o.flags[n] = [GFX.cineLight, GFX.cineFog, GFX.cineGrade, PRESETS.current()]; }
        PRESETS.apply('cinematic'); o.cine = { scale: GFX.scale, vd: GFX.viewDist, pt: GFX.particles, canvas: Engine.canvas.width, farLook: GFX.farLook, bloom: GFX.bloom, grade: GFX.grade };
        PRESETS.apply('medium'); return o;
      });
      assert.deepEqual([r.t.scale, r.t.viewDist, r.t.particles], [2, 2.5, 1.25]);
      assert.deepEqual(r.order.slice(-2), ['ultra', 'cinematic']);
      for (const n of r.order) assert.deepEqual(r.flags[n], n === 'cinematic' ? [true, true, true, 'cinematic'] : [false, false, false, n], n);
      assert.deepEqual(r.cine, { scale: 2, vd: 2.5, pt: 1.25, canvas: 640, farLook: true, bloom: false, grade: true });   // post.js bloom gives way to the module's emissive bloom
    });

    // ------------------------------------------------------------------------------------------------ identity
    // Three effects keep wall-clock state across frames (coldBreath in js/air11.js, windSigns in js/windbells.js, dyingLights
    // in js/nerves13.js), so two pages can differ by them alone, with or without this module: S.steady() holds them off on
    // both pages for the cross-page comparisons.
    await step('off: Original, Low, Medium, High and Ultra frames are byte-identical to a page without js/cinema14.js (four scenes)', async () => {
      const run = (P) => P.evaluate((SC) => {
        const out = [];
        for (const id of ['oak', 'clear', 'grove', 'vault']) { S.stage(SC[id]); for (const p of ['original', 'low', 'medium', 'high', 'ultra']) { PRESETS.apply(p); S.steady(); out.push(id + ':' + p + ':' + S.hash(S.frame(null, {}).fb)); } }
        PRESETS.apply('medium');
        const v = document.getElementById('cine14-veil');
        return { out, veil: !!(v && getComputedStyle(v).display !== 'none') };
      }, SCENES);
      // a frame that differs is rendered again on both pages (up to twice): other modules' wall-clock state can still
      // flicker a few pixels now and then, on two pages that both lack this module as well
      // Other modules' wall-clock state can still flicker a few pixels now and then, on pages without this module too. So a
      // frame is compared only where the two module-less pages agree on it (that is the reference), and must then match one
      // of them exactly; at least 16 of the 20 frames must be such stable references.
      const A1 = await run(pg), B1 = await run(B.page), C1 = await run(C.page);
      assert.equal(A1.veil, false, 'the compositor grade is hidden outside Cinematic');
      const a = A1.out, b = B1.out, c = C1.out;
      assert.equal(a.length, 20);
      const stable = a.map((x, i) => b[i] === c[i]);
      assert.ok(stable.filter(Boolean).length >= 16, 'stable reference frames: ' + stable.filter(Boolean).length + ' of 20');
      const bad = a.filter((x, i) => stable[i] && x !== b[i]).map(x => x.split(':').slice(0, 2).join(':'));
      assert.deepEqual(bad, [], 'differing frames: ' + bad.join(' '));
    });
    await step('off: in every preset but Cinematic the hook leaves the frame untouched (captured just before and after it)', async () => {
      const r = await Q((SC) => {
        const bad = [];
        S.stage(SC.clear);
        for (const p of ['original', 'low', 'medium', 'high', 'ultra']) { S.frame(p); if (S.hash(S.pre.fb) !== S.hash(S.cap.fb)) bad.push(p); }
        S.frame('cinematic'); const moved = S.hash(S.pre.fb) !== S.hash(S.cap.fb);
        PRESETS.apply('medium');
        return { bad, moved };
      }, SCENES);
      assert.deepEqual(r.bad, []);
      assert.ok(r.moved, 'Cinematic does change the frame');
    });
    await step('off: Cinematic with its three switches off equals the same preset on the page without the module', async () => {
      const run = (P) => P.evaluate((SC) => { const out = []; for (const id of ['clear', 'vault']) { S.stage(SC[id]); PRESETS.apply('cinematic'); S.steady(); out.push(S.hash(S.frame(null, { cineLight: false, cineFog: false, cineGrade: false }).fb)); } PRESETS.apply('medium'); return out; }, SCENES);
      const a = await run(pg), b = await run(B.page), c = await run(C.page);
      const stable = b.map((x, i) => x === c[i]);
      assert.ok(stable.some(Boolean), 'no stable reference frame');
      assert.deepEqual(a.filter((x, i) => stable[i]), b.filter((x, i) => stable[i]));
    });

    // ------------------------------------------------------------------------------------------------ each switch
    await step('switches: light only adds light, most of it at Light-glass; fog never touches the sky and stays in its band outdoors, and adds depth haze indoors; grade changes the view', async () => {
      const r = await Q((SC) => {
        const o = {};
        // a: frame without, b: frame with; n changed, dark: any channel went down, sky: changed sky pixels, above: changed
        // pixels above the fog band, maxAt: where the most light was added and whether a glowing pixel is near it
        const cmp = (a, b) => {
          let n = 0, dark = 0, sky = 0, above = 0, best = -1, bi = 0; const band = a.horizon - 0.05 * a.h - 1;
          for (let i = 0; i < a.fb.length; i++) {
            if (a.fb[i] === b.fb[i]) continue;
            n++; const p = a.fb[i], q = b.fb[i];
            const dr = (q & 255) - (p & 255), dg = ((q >> 8) & 255) - ((p >> 8) & 255), db = ((q >> 16) & 255) - ((p >> 16) & 255);
            if (dr < 0 || dg < 0 || db < 0) dark++;
            if (a.dbuf[i] >= 1e8) sky++;
            if (((i / a.w) | 0) < band) above++;
            if (dr + dg + db > best) { best = dr + dg + db; bi = i; }
          }
          const bx = bi % a.w, by = (bi / a.w) | 0, R = 10 * (a.w / 320);
          let glowNear = false;
          for (let y = Math.max(0, by - R); y <= Math.min(a.h - 1, by + R) && !glowNear; y++) for (let x = Math.max(0, bx - R); x <= Math.min(a.w - 1, bx + R); x++) if (a.mbuf[y * a.w + x] === 8) { glowNear = true; break; }
          return { n, dark, sky, above, best, glowNear };
        };
        S.stage(SC.clear);
        const none = S.frame('cinematic', { cineLight: false, cineFog: false, cineGrade: false });
        o.light = cmp(none, S.frame(null, { cineLight: true }));
        o.fog = cmp(none, S.frame(null, { cineLight: false, cineFog: true })); o.fogAerial = CINEMA14.stats.last.aerial; o.far = !!(Engine.farInfo && Engine.farInfo().far);
        o.mode = CINEMA14.gradeMode();
        o.grade = cmp(none, S.frame(null, { cineFog: false, cineGrade: true })); o.veil = CINEMA14.veilShown();
        const v = document.getElementById('cine14-veil'); o.filter = v ? getComputedStyle(v).backdropFilter : ''; o.veilH = v ? v.getBoundingClientRect().height / Engine.canvas.getBoundingClientRect().height : 0;
        o.veilBg = v ? getComputedStyle(v).backgroundImage : '';
        // the same grade folded into the canvas loop (the path for browsers without backdrop-filter)
        CINEMA14.T.gradeOnCanvas = true; GFX.changed();
        o.gradeJs = cmp(none, S.frame(null, { cineGrade: true })); o.gradeJsOn = CINEMA14.stats.last.grade; o.veilJs = CINEMA14.veilShown();
        // a corner pixel is darker than the centre pixel relative to the ungraded frame (the vignette)
        const g = S.cap, lum = (f, x, y) => { const p = f.fb[y * f.w + x]; return (p & 255) + ((p >> 8) & 255) + ((p >> 16) & 255); };
        o.vigCorner = lum(g, 2, 2) / Math.max(1, lum(none, 2, 2)); o.vigCentre = lum(g, g.w >> 1, g.h >> 1) / Math.max(1, lum(none, none.w >> 1, none.h >> 1));
        CINEMA14.T.gradeOnCanvas = false; GFX.changed();
        S.stage(SC.vault);
        const noneV = S.frame('cinematic', { cineLight: false, cineFog: false, cineGrade: false });
        o.vaultFog = cmp(noneV, S.frame(null, { cineFog: true })); o.vaultAerial = CINEMA14.stats.last.aerial;
        PRESETS.apply('medium');
        return o;
      }, SCENES);
      assert.ok(r.light.n > 200 && r.light.dark === 0, 'light: ' + JSON.stringify(r.light));
      assert.ok(r.light.glowNear, 'the strongest light lands by a glowing (emissive) pixel: ' + JSON.stringify(r.light));
      assert.ok(r.fog.n > 1000 && r.fog.sky === 0 && r.fog.above === 0, 'fog (outdoors, far mode): ' + JSON.stringify(r.fog));
      assert.equal(r.fogAerial, false, 'outdoors in far mode the engine haze is the aerial perspective, not this module');
      assert.ok(r.vaultFog.n > 1000 && r.vaultFog.sky === 0 && r.vaultAerial === true, 'indoors the module adds depth haze: ' + JSON.stringify(r.vaultFog));
      assert.equal(r.mode, 'css', 'Chromium has backdrop-filter: the grade runs on the compositor');
      assert.equal(r.grade.n, 0, 'compositor grade: the canvas frame is untouched');
      assert.ok(r.veil && /saturate\(1\.12\)/.test(r.filter) && /contrast\(1\.08\)/.test(r.filter) && /radial-gradient/.test(r.veilBg), 'grade overlay: ' + r.filter + ' ' + r.veilBg.slice(0, 40));
      assert.ok(Math.abs(r.veilH - 0.75) < 0.01, 'the overlay covers the 3D view only, not the HUD: ' + r.veilH);
      assert.ok(r.gradeJsOn && !r.veilJs && r.gradeJs.n > 100000, 'canvas grade touches the whole view (and the overlay is off): ' + JSON.stringify(r.gradeJs));
      assert.ok(r.vigCorner < r.vigCentre - 0.15, 'canvas vignette darkens the corners: ' + r.vigCorner.toFixed(3) + ' vs centre ' + r.vigCentre.toFixed(3));
    });
    await step('switches: no blur — fog, light and grade keep every hard edge (a 1-pixel step stays a 1-pixel step)', async () => {
      // the owner rejected blur: compare the sum of absolute horizontal neighbour differences (local contrast) in the view
      const r = await Q((SC) => {
        const edge = (f) => { let s = 0; for (let y = 0; y < f.h; y++) for (let x = 1; x < f.w; x++) { const p = f.fb[y * f.w + x], q = f.fb[y * f.w + x - 1]; s += Math.abs((p & 255) - (q & 255)) + Math.abs(((p >> 8) & 255) - ((q >> 8) & 255)) + Math.abs(((p >> 16) & 255) - ((q >> 16) & 255)); } return s; };
        const o = {};
        CINEMA14.T.gradeOnCanvas = true;   // so the grade is in the frame being measured
        for (const id of ['oak', 'clear', 'vault']) { S.stage(SC[id]); const a = edge(S.frame('cinematic', { cineLight: false, cineFog: false, cineGrade: false })), b = edge(S.frame(null, { cineLight: true, cineFog: true, cineGrade: true })); o[id] = b / a; }
        CINEMA14.T.gradeOnCanvas = false; PRESETS.apply('medium');
        return o;
      }, SCENES);
      for (const id in r) assert.ok(r[id] > 0.85, id + ': edge energy kept ' + r[id].toFixed(3));
    });

    // ------------------------------------------------------------------------------------------------ accessibility
    await step('accessibility: No flashes holds the rays still and halves bloom; Reduce motion freezes the fog noise; High contrast removes grade and vignette; colour-blind mode is not affected', async () => {
      const r = await Q((SC) => {
        const o = {};
        S.stage(SC.clear); PRESETS.apply('cinematic');
        const at = (t) => { S.frame(null, {}, t); return Object.assign({}, CINEMA14.stats.last); };
        let a = at(5), b = at(6.3); o.shimmerMoves = a.shimmer !== b.shimmer; o.bk = a.bloomK; o.fogMoves = a.fogShift !== at(40).fogShift;
        GFX.noFlash = true; a = at(5); b = at(6.3); o.nfShimmer = [a.shimmer, b.shimmer]; o.nfBk = a.bloomK; GFX.noFlash = false;
        GFX.reduceMotion = true; o.rmFog = [at(5).fogShift, at(40).fogShift]; GFX.reduceMotion = false;
        // the module itself on one fixed frame at two moments: the rays breathe by default, and hold still under No flashes
        S.frame(null, { cineLight: true, cineFog: false, cineGrade: false }, 5);
        o.lightMoves = S.hookAt(5) !== S.hookAt(6.3);
        GFX.noFlash = true; o.nfSteady = S.hookAt(5) === S.hookAt(6.3); GFX.noFlash = false;
        // and Reduce motion holds the fog still on one fixed frame
        S.frame(null, { cineLight: false, cineFog: true }, 5);
        o.fogFrameMoves = S.hookAt(5) !== S.hookAt(40);
        GFX.reduceMotion = true; o.rmSteady = S.hookAt(5) === S.hookAt(40); GFX.reduceMotion = false;
        GFX.cineFog = true; GFX.cineLight = true;
        // high contrast: no overlay, and on the canvas path the grade switch then changes nothing
        GFX.cineGrade = true; GFX.changed(); o.veilOn = CINEMA14.veilShown();
        ACCESS.setHighContrast(true); o.hcVeil = CINEMA14.veilShown(); ACCESS.setHighContrast(false); o.veilBack = CINEMA14.veilShown();
        CINEMA14.T.gradeOnCanvas = true;
        const gradeDelta = () => S.hash(S.frame(null, { cineGrade: true }).fb) !== S.hash(S.frame(null, { cineGrade: false }).fb);
        o.gradeNormally = gradeDelta();
        ACCESS.setHighContrast(true); o.hcGrade = gradeDelta(); o.hcStat = CINEMA14.stats.last.grade; ACCESS.setHighContrast(false);
        CINEMA14.T.gradeOnCanvas = false; GFX.cineGrade = true; GFX.changed();
        // colour-blind: what the module changes is the same with the colour-blind switch on or off
        const d = () => { const off = S.frame(null, { cineLight: false, cineFog: false, cineGrade: false }).fb.slice(), on = S.frame(null, { cineLight: true, cineFog: true, cineGrade: true }).fb; let h = 2166136261; for (let i = 0; i < on.length; i++) { h ^= (on[i] ^ off[i]); h = Math.imul(h, 16777619); } return h >>> 0; };
        const cb0 = d(); UPG.colorblind = true; if (typeof applyVisualSettings === 'function') applyVisualSettings(); const cb1 = d(); UPG.colorblind = false; if (typeof applyVisualSettings === 'function') applyVisualSettings();
        o.cbSame = cb0 === cb1;
        PRESETS.apply('medium');
        return o;
      }, SCENES);
      assert.ok(r.shimmerMoves, 'rays breathe gently by default');
      assert.deepEqual(r.nfShimmer, [1, 1], 'No flashes: no shimmer');
      assert.ok(r.lightMoves && r.nfSteady, 'No flashes: the light the module adds holds still (default moves: ' + r.lightMoves + ')');
      assert.ok(r.fogFrameMoves && r.rmSteady, 'Reduce motion: the fog holds still (default moves: ' + r.fogFrameMoves + ')');
      assert.ok(Math.abs(r.nfBk / r.bk - 0.5) < 1e-6, 'No flashes: bloom halved ' + r.nfBk + ' vs ' + r.bk);
      assert.ok(r.fogMoves, 'fog drifts by default');
      assert.deepEqual(r.rmFog, [0, 0], 'Reduce motion: static fog noise');
      assert.deepEqual([r.veilOn, r.hcVeil, r.veilBack], [true, false, true], 'High contrast hides the compositor grade');
      assert.ok(r.gradeNormally, 'the canvas grade changes the frame normally');
      assert.deepEqual([r.hcGrade, r.hcStat], [false, false], 'High contrast: no grade, no vignette');
      assert.ok(r.cbSame, 'colour-blind palettes unaffected');
    });

    // ------------------------------------------------------------------------------------------------ cost
    await step('cost: interleaved on/off median, 1x and 2x, four reference scenes with 12 enemies in Oakhaven; Oakhaven at dusk at 2x is within 2.5 ms', async () => {
      let t = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        t = await Q((SC) => {
          const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
          const out = {};
          for (const id of ['oak', 'clear', 'grove', 'vault']) {
            S.stage(SC[id]); G.state = 'paused';
            if (id === 'oak') for (let i = 0; i < 12; i++) G.ents.push(hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: 22 + (i % 4), y: 9 + (i >> 2) * 1.2, passive: true }));
            out[id] = {};
            for (const sc of [1, 2]) {
              PRESETS.apply('cinematic'); PRESETS.setScale(sc);
              const set = v => { for (const k of CINEMA14.FLAGS) GFX[k] = v; };
              const frame = () => { const t0 = performance.now(); for (let j = 0; j < 15; j++) { Engine.setTime(5 + j * 0.016); Engine.render(G.ents, G.tod); } return (performance.now() - t0) / 15; };
              set(true); frame(); set(false); frame();
              const d = [];
              for (let r = 0; r < 13; r++) { let a, b; if (r % 2) { set(true); a = frame(); set(false); b = frame(); } else { set(false); b = frame(); set(true); a = frame(); } d.push(a - b); }
              out[id][sc + 'x'] = Math.round(med(d) * 100) / 100;
              // for the record: the same with the grade folded into the canvas loop (browsers without backdrop-filter)
              if (sc === 2) {
                CINEMA14.T.gradeOnCanvas = true; const d2 = [];
                for (let r = 0; r < 7; r++) { let a, b; if (r % 2) { set(true); a = frame(); set(false); b = frame(); } else { set(false); b = frame(); set(true); a = frame(); } d2.push(a - b); }
                CINEMA14.T.gradeOnCanvas = false; out[id].js2x = Math.round(med(d2) * 100) / 100;
              }
            }
          }
          PRESETS.apply('medium');
          return out;
        }, SCENES);
        if (t.oak['2x'] <= 2.5) break;
      }
      const la = os.loadavg().map(v => v.toFixed(2)).join(' ');
      console.log('CINEMA COST ms per frame (median of interleaved on - off, headless Chromium, load ' + la + '):');
      console.log('scene      1x      2x   (2x, grade on the canvas instead of the compositor)');
      for (const id of Object.keys(t)) console.log(id.padEnd(8) + String(t[id]['1x'].toFixed(2)).padStart(6) + String(t[id]['2x'].toFixed(2)).padStart(8) + String(t[id].js2x.toFixed(2)).padStart(8));
      fs.writeFileSync(path.join(SHOT_DIR, 'cinema-cost.json'), JSON.stringify({ t, loadavg: os.loadavg() }, null, 1));
      assert.ok(t.oak['2x'] <= 2.5, 'Oakhaven at dusk, 12 enemies, 2x: ' + t.oak['2x'] + ' ms');
    });

    // ------------------------------------------------------------------------------------------------ options
    await step('Options: a Cinematic preset button and three switch rows that work, mark the preset custom, persist, and fit 640x400', async () => {
      await Q(() => { localStorage.removeItem('octave.cinema14.v1'); PRESETS.apply('medium'); G.state = 'panel'; renderMenu(); });
      await pg.locator('#mn-gfx').click();
      for (const id of ['gfx-p-cinematic', 'cine-light', 'cine-fog', 'cine-grade']) assert.equal(await pg.locator('#' + id).count(), 1, id);
      assert.equal(await pg.locator('#cine-fog').textContent(), 'Off');
      await pg.locator('#gfx-p-cinematic').click();
      let s = await Q(() => ({ cur: PRESETS.current(), on: [GFX.cineLight, GFX.cineFog, GFX.cineGrade], txt: document.getElementById('cine-fog').textContent, state: document.getElementById('gfx-state').textContent }));
      assert.deepEqual(s, { cur: 'cinematic', on: [true, true, true], txt: 'On', state: 'Graphics: Cinematic' });
      await pg.locator('#cine-fog').click();
      s = await Q(() => ({ cur: PRESETS.current(), fog: GFX.cineFog, pressed: document.getElementById('cine-fog').getAttribute('aria-pressed'), stored: JSON.parse(localStorage.getItem('octave.cinema14.v1')), state: document.getElementById('gfx-state').textContent }));
      assert.deepEqual(s, { cur: 'custom', fog: false, pressed: 'false', stored: { p: 1, l: 1, f: 0, g: 1 }, state: 'Graphics: Custom' });
      await pg.setViewportSize({ width: 640, height: 400 });
      await Q(() => { renderAccessibilityMenu(); });
      const r = await Q(() => {
        const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel, bad = [];
        for (const b of Array.from(panel.querySelectorAll('button:enabled'))) {
          b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          const q2 = b.getBoundingClientRect();
          if (q2.left < -1 || q2.right > innerWidth + 1 || q2.top < -1 || q2.bottom > innerHeight + 1 || q2.width < 4) bad.push((b.id || b.textContent) + ' ' + [q2.left, q2.right, q2.top, q2.bottom].map(Math.round));
        }
        document.getElementById('cine-light').scrollIntoView({ block: 'center' });
        return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, bad };
      });
      await pg.screenshot({ path: path.join(SHOT_DIR, 'options-cinema-640x400.png') });
      assert.equal(r.panelX && r.gridX && r.docX, true, 'no horizontal overflow ' + JSON.stringify(r)); assert.deepEqual(r.bad, []);
      await pg.setViewportSize({ width: 1280, height: 800 });
      await Q(() => { PRESETS.apply('medium'); closeModal(); G.state = 'play'; localStorage.removeItem('octave.cinema14.v1'); });
    });
    await step('persistence: a stored Cinematic choice comes back at boot (with its switches); a fresh profile boots Medium', async () => {
      const C = await bootPage(browser, { init: () => { try { localStorage.setItem('octave.cinema14.v1', JSON.stringify({ p: 1, l: 1, f: 0, g: 1 })); } catch (e) { /* */ } } });
      const s = await C.page.evaluate(() => ({ cur: PRESETS.current(), on: [GFX.cineLight, GFX.cineFog, GFX.cineGrade], scale: GFX.scale }));
      const bad = await C.page.evaluate(() => { localStorage.setItem('octave.cinema14.v1', '{"p":"x<img>"}'); return true; });
      await C.page.close();
      assert.deepEqual(s, { cur: 'custom', on: [true, false, true], scale: 2 });
      assert.ok(bad);
      const fresh = await pg.evaluate(() => PRESETS.current());
      assert.equal(fresh, 'medium');
      assert.deepEqual(C.errors, []);
    });

    // ------------------------------------------------------------------------------------------------ screenshots
    await step('screenshots: the four reference cameras, Medium and Cinematic', async () => {
      for (const id of Object.keys(SCENES)) {
        for (const p of ['medium', 'cinematic']) {
          await Q(([sc, p]) => { S.stage(sc); S.frame(p); }, [SCENES[id], p]);
          await pg.locator('#view').screenshot({ path: path.join(SHOT_DIR, id + '-' + p + '.png') });
        }
      }
      await Q(() => { PRESETS.apply('medium'); });
    });

    await step('no page errors', async () => { assert.deepEqual(A.errors, []); assert.deepEqual(B.errors, []); assert.deepEqual(C.errors, []); });
  } catch (e) {
    failed++; console.log('FAIL harness: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
