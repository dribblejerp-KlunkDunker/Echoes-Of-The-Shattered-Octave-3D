// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3000 node test/post.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers js/post.js: soft depth-graded fog, permanent area mist, bloom on lamps
// and glass, and the per-area colour grade, all as post-processing on the
// finished frame. Frames are pinned (animT, weather and clouds fixed) so
// exact comparisons are meaningful.
//   SHOT_DIR=/some/dir     where before/after screenshots go (default: os tmpdir)
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'post-shots');
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }
function check(fn, text) { try { fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? e.message.split('\n')[0] : e)); } }

// Scenes: [map, x, y, dir, tod]
const SCENES = {
  oakhavenDay: ['oakhaven', 23.5, 20.5, -1.57, 0.5],
  oakhavenDusk: ['oakhaven', 23.5, 20.5, -1.57, 0.76],
  grove: ['whispergrove', 24.5, 27.5, -1.57, 0.5],
  deepwoods: ['deepwoods', 27.5, 30.5, -1.57, 0.5],
  clearingDay: ['clearing', 20.5, 28.5, -1.57, 0.5],
  clearingNight: ['clearing', 20.5, 28.5, -1.57, 0.02],
  catacombs: ['catacombs', 3.5, 14.5, 0, 0.5],
  tavernWall: ['tavern', 8.5, 10.5, 0, 0.5],        // looks at plain wall and floor
  hearth: ['tavern', 10.5, 6.5, 0, 0.5],            // looks at the lit hearth
  lampNight: ['oakhaven', 21.5, 24.0, -1.57, 0.85], // street lamp
  glassNight: ['clearing', 20.5, 26.5, 1.57, 0.85], // glass lamp
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Post Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------
    //  in-page helpers: render a pinned frame with chosen flags, compare frames
    // ------------------------------------------------------------------
    await page.evaluate((SCENES) => {
      const T = window.T = { on: false, raw: null, out: null, SCENES };
      // order 5 runs before every post effect (raw engine frame); order 99 after all of them
      Engine.addPostHook(F => { if (T.on) T.raw = F.fb.slice(); }, 5);
      Engine.addPostHook(F => { if (T.on) T.out = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, S: F.S, horizon: F.horizon, fogDist: F.fogDist, skyDay: F.skyDay }; }, 99);
      T.scene = (name) => {
        const [map, x, y, dir, tod] = SCENES[name];
        for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
        loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = tod;
        // the clock was set by hand, not by passHours: put the townsfolk routines right for this hour
        if (typeof TOWNSFOLK !== 'undefined') TOWNSFOLK.apply(true);
        Weather.hold('clear'); T.wx = {};
      };
      // flags: names to switch on; everything else off. wx: weather override.
      T.render = (flags, wx) => {
        GFX.plain(); for (const k of flags) GFX[k] = true;
        const w = Object.assign({ haze: 0, dark: 0, flash: 0 }, wx || {});
        Engine.setTime(5);
        Engine.setWeather({ haze: w.haze, dark: w.dark, cloud: 0, tint: [196, 200, 214], flash: w.flash });
        T.on = true; Engine.render(G.ents, G.tod); T.on = false;
        return T.out;
      };
      T.ALL = ['softFog', 'mist', 'bloom', 'grade'];
      const luma = (p) => ((p & 255) * 77 + ((p >> 8) & 255) * 150 + ((p >> 16) & 255) * 29) >> 8;
      T.luma = luma;
      T.same = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
      // number of changed pixels and the brightness energy gained/lost
      T.diff = (a, b) => {
        let n = 0, up = 0, down = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { n++; const d = luma(b[i]) - luma(a[i]); if (d > 0) up += d; else down -= d; }
        return { n, up, down };
      };
      T.mean = (fb) => { let r = 0, g = 0, b = 0; for (let i = 0; i < fb.length; i++) { r += fb[i] & 255; g += (fb[i] >> 8) & 255; b += (fb[i] >> 16) & 255; } const n = fb.length; return [r / n, g / n, b / n]; };
      T.med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    }, SCENES);

    // ------------------------------------------------------------------
    //  1/2. flags off == plain, byte for byte; each effect only when on
    // ------------------------------------------------------------------
    const flagsOff = await page.evaluate(() => {
      const out = {};
      for (const name of Object.keys(T.SCENES)) {
        T.scene(name);
        const plain = T.render([]);
        const raw = T.raw;     // frame before any effect hook ran
        out[name] = { offEqualsRaw: T.same(plain.fb, raw), w: plain.w };
        // every flag set false by hand (not via plain) must behave the same
        GFX.softFog = GFX.mist = GFX.bloom = GFX.grade = false;
        Engine.setTime(5); T.on = true; Engine.render(G.ents, G.tod); T.on = false;
        out[name].manualOff = T.same(T.out.fb, T.raw);
      }
      return out;
    });
    for (const [name, r] of Object.entries(flagsOff)) {
      ok(r.offEqualsRaw && r.manualOff, `all flags off: ${name} frame is byte-identical to the engine's own frame (GFX.plain)`);
    }

    const only = await page.evaluate(() => {
      const trials = { softFog: 'deepwoods', mist: 'grove', bloom: 'hearth', grade: 'oakhavenDay' };
      const out = {};
      for (const k of Object.keys(trials)) {
        T.scene(trials[k]);
        const plain = T.render([]).fb.slice();
        const on = T.render([k]).fb.slice();
        const offAgain = T.render([]).fb.slice();
        const others = T.ALL.filter(x => x !== k);
        const allFb = T.render(T.ALL).fb.slice();
        const allButK = T.render(others).fb.slice();
        out[k] = { scene: trials[k], changed: T.diff(plain, on).n, offSame: T.same(plain, offAgain), contributes: T.diff(allButK, allFb).n, otherFlagsUntouched: (() => { const f = T.render([k]); return GFX[others[0]] === false && GFX[others[1]] === false && GFX[others[2]] === false; })() };
      }
      return out;
    });
    for (const [k, r] of Object.entries(only)) {
      ok(r.changed > 0, `${k}: switching only ${k} on changes the frame (${r.changed} pixels in ${r.scene})`);
      ok(r.offSame, `${k}: with ${k} off again the frame returns to plain exactly`);
      ok(r.contributes > 0, `${k}: with the other three on, ${k} still changes the frame`);
    }

    // ------------------------------------------------------------------
    //  3. bloom brightens around a lit lamp / glass lamp / hearth, not dark walls
    // ------------------------------------------------------------------
    const bloomR = await page.evaluate(() => {
      const out = {};
      for (const name of ['lampNight', 'glassNight', 'hearth']) {
        T.scene(name);
        const plain = T.render([]);
        const pf = plain.fb.slice();
        const bl = T.render(['bloom']);
        const w = bl.w, h = bl.h;
        // light sources: the brightest sprite pixels of the plain frame (a view may hold several lamps)
        let best = -1;
        for (let i = 0; i < pf.length; i++) if (plain.mbuf[i] === 6 || plain.mbuf[i] === 8) { const l = T.luma(pf[i]); if (l > best) best = l; }
        const srcs = [];
        for (let i = 0; i < pf.length; i++) if ((plain.mbuf[i] === 6 || plain.mbuf[i] === 8) && T.luma(pf[i]) >= best * 0.7) srcs.push([i % w, (i / w) | 0]);
        const nearest = (x, y) => { let m = 1e9; for (const [sx, sy] of srcs) { const d = Math.hypot(x - sx, y - sy); if (d < m) m = d; } return m; };
        let ring = 0, ringN = 0, negative = 0, far = 0, farWalls = 0, farWallsChanged = 0;
        for (let i = 0; i < pf.length; i++) if (T.luma(bl.fb[i]) < T.luma(pf[i])) negative++;
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        for (const [sx, sy] of srcs) { x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
        for (let y = Math.max(0, y0 - 14); y <= Math.min(h - 1, y1 + 14); y++) for (let x = Math.max(0, x0 - 14); x <= Math.min(w - 1, x1 + 14); x++) {
          if (nearest(x, y) <= 14) { ring += Math.max(0, T.luma(bl.fb[y * w + x]) - T.luma(pf[y * w + x])); ringN++; }
        }
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
          const i = y * w + x;
          if (nearest(x, y) > 60) { far++; if (plain.mbuf[i] === 4 || plain.mbuf[i] === 5 || plain.mbuf[i] === 7) { farWalls++; if (bl.fb[i] !== pf[i]) farWallsChanged++; } }
        }
        out[name] = { src: srcs.length, ringGain: ring / Math.max(1, ringN), negative, far, farWalls, farWallsChanged };
      }
      // a scene with nothing bright in it: bloom does nothing at all
      T.scene('tavernWall');
      const p = T.render([]).fb.slice(), b = T.render(['bloom']).fb.slice();
      out.dark = T.diff(p, b);
      return out;
    });
    for (const name of ['lampNight', 'glassNight', 'hearth']) {
      const r = bloomR[name];
      ok(r.ringGain > 0.5, `bloom: brightens around the ${name} light (mean +${r.ringGain.toFixed(2)} luma within 14px of the source)`);
      ok(r.negative === 0, `bloom: ${name} is purely additive (no pixel gets darker)`);
      ok(r.farWalls > 0 && r.farWallsChanged === 0, `bloom: ${name} dark walls and floor far from the light are untouched (${r.farWalls} sampled)`);
    }
    ok(bloomR.dark.n === 0, `bloom: a view of plain dark wall changes ${bloomR.dark.n} pixels`);

    // ------------------------------------------------------------------
    //  4. lightning: bloom shuts off, the frame does not white out
    // ------------------------------------------------------------------
    const flashR = await page.evaluate(() => {
      const out = {};
      for (const name of ['lampNight', 'hearth']) {
        T.scene(name);
        const energy = (f) => { const p = T.render([], { flash: f }).fb.slice(); const b = T.render(['bloom'], { flash: f }).fb.slice(); return T.diff(p, b).up; };
        out[name] = { e0: energy(0), e03: energy(0.3), e06: energy(0.6), e1: energy(1) };
      }
      // whole-frame check with everything on during a bolt, outdoors at night
      T.scene('lampNight');
      const hot = (fb) => { let n = 0; for (let i = 0; i < fb.length; i++) if (T.luma(fb[i]) >= 245) n++; return n / fb.length; };
      const meanL = (fb) => { let s = 0; for (let i = 0; i < fb.length; i++) s += T.luma(fb[i]); return s / fb.length; };
      const pl = T.render([], { flash: 1 }).fb.slice(), al = T.render(T.ALL, { flash: 1 }).fb.slice();
      out.frame = { plainMean: meanL(pl), allMean: meanL(al), plainHot: hot(pl), allHot: hot(al) };
      return out;
    });
    for (const name of ['lampNight', 'hearth']) {
      const r = flashR[name];
      ok(r.e0 > 0, `bloom: ${name} has bloom energy with no lightning (${r.e0})`);
      ok(r.e03 < r.e0 && r.e06 < r.e03, `bloom: ${name} fades as the flash rises (${r.e0} > ${r.e03} > ${r.e06})`);
      ok(r.e1 === 0, `bloom: ${name} is fully suppressed at full flash (${r.e1})`);
    }
    ok(flashR.frame.allMean - flashR.frame.plainMean < 8, `lightning: all effects on add no whiteout (mean luma ${flashR.frame.plainMean.toFixed(1)} -> ${flashR.frame.allMean.toFixed(1)})`);
    ok(flashR.frame.allHot <= flashR.frame.plainHot + 0.01, `lightning: no new blown-out pixels (${(flashR.frame.plainHot * 100).toFixed(1)}% -> ${(flashR.frame.allHot * 100).toFixed(1)}%)`);

    // ------------------------------------------------------------------
    //  5. permanent mist: present in the haunted areas, absent in the Oakhaven day
    // ------------------------------------------------------------------
    const mistR = await page.evaluate(() => {
      const out = {};
      for (const name of ['grove', 'deepwoods', 'catacombs', 'clearingNight']) {
        T.scene(name);
        const p = T.render([]), m = T.render(['mist']);
        const w = p.w, h = p.h, hz = p.horizon;
        let upper = 0, band = 0, lower = 0, bandRows = 0, lowerRows = 0;
        for (let y = 0; y < h; y++) {
          let rowSum = 0;
          for (let x = 0; x < w; x++) { const i = y * w + x; rowSum += Math.abs(T.luma(m.fb[i]) - T.luma(p.fb[i])); }
          if (y < hz - 18) upper += rowSum; else if (y <= hz + 14) { band += rowSum; bandRows++; } else { lower += rowSum; lowerRows++; }
        }
        out[name] = { changed: T.diff(p.fb, m.fb).n, upper, bandPerRow: band / Math.max(1, bandRows), lowerPerRow: lower / Math.max(1, lowerRows) };
      }
      for (const name of ['oakhavenDay', 'clearingDay']) {
        T.scene(name);
        out[name] = T.diff(T.render([]).fb.slice(), T.render(['mist']).fb.slice());
      }
      // stacking with weather: thick weather air eases the permanent mist back
      T.scene('grove');
      const e = (wx) => { const p = T.render([], wx).fb.slice(); const df = T.diff(p, T.render(['mist'], wx).fb); return df.up + df.down; };
      out.stack = { clear: e({}), foggy: e({ haze: 0.32 }) };
      // drift: the bands move with the clock
      const a = T.render(['mist']).fb.slice();
      Engine.setTime(9); GFX.plain(); GFX.mist = true; Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0 });
      T.on = true; Engine.render(G.ents, G.tod); T.on = false;
      out.drift = T.diff(a, T.out.fb).n;
      return out;
    });
    for (const name of ['grove', 'deepwoods', 'catacombs', 'clearingNight']) {
      const r = mistR[name];
      ok(r.changed > 500, `mist: present in ${name} (${r.changed} pixels)`);
      ok(r.bandPerRow > r.lowerPerRow * 0.8 || r.bandPerRow > 5, `mist: ${name} hugs the horizon band (${r.bandPerRow.toFixed(0)}/row there vs ${r.lowerPerRow.toFixed(0)}/row near the feet)`);
    }
    ok(mistR.grove.upper === 0 && mistR.deepwoods.upper === 0, 'mist: the upper sky is never touched (it stays near the ground)');
    ok(mistR.oakhavenDay.n === 0, `mist: absent in the Oakhaven street by day (${mistR.oakhavenDay.n} pixels)`);
    ok(mistR.clearingDay.n === 0, `mist: the clearing has none by day (${mistR.clearingDay.n} pixels), only at night`);
    ok(mistR.stack.foggy < mistR.stack.clear && mistR.stack.foggy > 0, `mist: eases back under weather haze rather than doubling (${mistR.stack.clear} -> ${mistR.stack.foggy})`);
    ok(mistR.drift > 0, `mist: drifts with the clock (${mistR.drift} pixels differ between animT 5 and 9)`);

    // ------------------------------------------------------------------
    //  6. grade: areas differ; interiors candle-warm; no crushed blacks or burnt whites
    // ------------------------------------------------------------------
    const gradeR = await page.evaluate(() => {
      const out = {};
      // run the grade hook on a synthetic 4-pixel frame so only the lookup is judged
      const probe = (mapId, outdoor, skyDay, tod, rgb) => {
        const fb = new Uint32Array([0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]]);
        GFX.plain(); GFX.grade = true; POST.reset();
        POST.hooks.grade({ fb, w: 1, h: 1, map: { id: mapId }, outdoor, skyDay, tod, light: 1 });
        return [fb[0] & 255, (fb[0] >> 8) & 255, (fb[0] >> 16) & 255];
      };
      const grey = [128, 128, 128];
      out.oak = probe('oakhaven', true, 1, 0.5, grey);
      out.grove = probe('whispergrove', true, 1, 0.5, grey);
      out.deep = probe('deepwoods', true, 1, 0.5, grey);
      out.tavern = probe('tavern', false, 1, 0.5, grey);
      out.crypt = probe('catacombs', false, 1, 0.5, grey);
      out.oakNight = probe('oakhaven', true, 0.05, 0.02, grey);
      out.oakDusk = probe('oakhaven', true, 0.4, 0.76, grey);
      out.black = probe('deepwoods', true, 1, 0.5, [0, 0, 0]);
      out.white = probe('oakhaven', true, 1, 0.5, [255, 255, 255]);
      out.alpha = (() => { const fb = new Uint32Array([0xff102030]); GFX.plain(); GFX.grade = true; POST.hooks.grade({ fb, w: 1, h: 1, map: { id: 'oakhaven' }, outdoor: true, skyDay: 1, tod: 0.5, light: 1 }); return fb[0] >>> 24; })();
      // real frames: the same scene graded differs from plain, and an interior gets warmer
      T.scene('oakhavenDay'); const op = T.mean(T.render([]).fb), og = T.mean(T.render(['grade']).fb);
      T.scene('deepwoods'); const dp = T.mean(T.render([]).fb), dg = T.mean(T.render(['grade']).fb);
      T.scene('tavernWall'); const tp = T.mean(T.render([]).fb), tg = T.mean(T.render(['grade']).fb);
      out.shift = { oak: og.map((v, i) => v - op[i]), deep: dg.map((v, i) => v - dp[i]), tavern: tg.map((v, i) => v - tp[i]), tavernWarmPlain: tp[0] - tp[2], tavernWarmGraded: tg[0] - tg[2] };
      return out;
    });
    const chroma = (c) => [c[0] - c[1], c[2] - c[1]];
    check(() => assert.notDeepEqual(gradeR.oak, gradeR.deep), 'grade: Oakhaven and Deep Woods grade a mid-grey differently');
    ok(gradeR.oak[0] > gradeR.oak[2], `grade: Oakhaven is warm-grey (${gradeR.oak})`);
    ok(gradeR.grove[2] > gradeR.grove[0] && gradeR.grove[1] > gradeR.grove[0], `grade: Whisper-Grove is cold teal (P10: was lilac) (${gradeR.grove})`);
    ok(gradeR.deep[0] > gradeR.deep[1] && gradeR.deep[2] > gradeR.deep[1], `grade: Deep Woods is violet-amber (${gradeR.deep})`);
    ok(gradeR.tavern[0] - gradeR.tavern[2] > gradeR.oak[0] - gradeR.oak[2] + 4, `grade: interiors are candle-warm, warmer than the street (${gradeR.tavern})`);
    ok(gradeR.crypt[2] > gradeR.crypt[0], `grade: the crypts run cold (${gradeR.crypt})`);
    ok(gradeR.oakNight[2] - gradeR.oakNight[0] > gradeR.oak[2] - gradeR.oak[0], `grade: night cools the town (${gradeR.oakNight})`);
    ok(gradeR.oakDusk[0] > gradeR.oak[0] - 2 && gradeR.oakDusk[0] - gradeR.oakDusk[2] > gradeR.oak[0] - gradeR.oak[2], `grade: dusk warms the town (${gradeR.oakDusk})`);
    ok(Math.max(...gradeR.black) <= 16, `grade: blacks stay black-ish (${gradeR.black})`);
    ok(Math.min(...gradeR.white) >= 225, `grade: whites stay white (${gradeR.white})`);
    ok(gradeR.alpha === 255, 'grade: pixel alpha is untouched');
    const d = Math.hypot(chroma(gradeR.shift.oak)[0] - chroma(gradeR.shift.deep)[0], chroma(gradeR.shift.oak)[1] - chroma(gradeR.shift.deep)[1]);
    ok(d > 0.5, `grade: real frames shift differently by area (Oakhaven ${gradeR.shift.oak.map(v => v.toFixed(1))}, Deep Woods ${gradeR.shift.deep.map(v => v.toFixed(1))})`);
    ok(gradeR.shift.tavernWarmGraded > gradeR.shift.tavernWarmPlain, `grade: the tavern frame warms (r-b ${gradeR.shift.tavernWarmPlain.toFixed(1)} -> ${gradeR.shift.tavernWarmGraded.toFixed(1)})`);

    // ------------------------------------------------------------------
    //  7. softFog: far pixels change, sky and near pixels do not
    // ------------------------------------------------------------------
    const fogR = await page.evaluate(() => {
      const out = {};
      for (const name of ['deepwoods', 'oakhavenDay', 'grove']) {
        T.scene(name);
        const p = T.render([]); const pf = p.fb.slice(), dbuf = p.dbuf.slice(), mbuf = p.mbuf.slice();
        const s = T.render(['softFog']);
        let changed = 0, skyChanged = 0, nearChanged = 0, nearCount = 0, farCount = 0, farChanged = 0, depthSum = 0, closer = 0;
        for (let i = 0; i < pf.length; i++) {
          const near = dbuf[i] < 0.25 * p.fogDist, sky = mbuf[i] === 1 || dbuf[i] >= 1e8, far = !sky && dbuf[i] > 0.6 * p.fogDist;
          if (near && !sky) nearCount++;
          if (far) farCount++;
          if (pf[i] !== s.fb[i]) {
            changed++; depthSum += dbuf[i] / p.fogDist;
            if (sky) skyChanged++;
            if (near) nearChanged++;
            if (far) farChanged++;
          }
        }
        out[name] = { changed, skyChanged, nearChanged, nearCount, farCount, farChanged, meanDepth: depthSum / Math.max(1, changed) };
      }
      return out;
    });
    for (const [name, r] of Object.entries(fogR)) {
      ok(r.changed > 0, `softFog: ${name} changes the frame (${r.changed} pixels)`);
      ok(r.skyChanged === 0, `softFog: ${name} never touches the sky`);
      ok(r.nearChanged === 0, `softFog: ${name} leaves pixels nearer than a quarter of the fog distance alone (${r.nearCount} sampled)`);
    }
    ok(fogR.deepwoods.farCount === 0 || fogR.deepwoods.farChanged > fogR.deepwoods.farCount * 0.5, `softFog: far pixels in the Deep Woods change (${fogR.deepwoods.farChanged}/${fogR.deepwoods.farCount})`);
    ok(fogR.deepwoods.meanDepth > 0.3, `softFog: changes concentrate in the distance (mean ${fogR.deepwoods.meanDepth.toFixed(2)} x fogDist)`);

    // ------------------------------------------------------------------
    //  8. render scale 2 and back
    // ------------------------------------------------------------------
    const scaleR = await page.evaluate(() => {
      const out = {};
      for (const S of [2, 1]) {
        Engine.setScale(S);
        const res = { size: null, flags: {}, offRaw: null, errs: 0 };
        for (const [k, scene] of [['softFog', 'deepwoods'], ['mist', 'grove'], ['bloom', 'hearth'], ['grade', 'oakhavenDay']]) {
          T.scene(scene);
          const p = T.render([]);
          res.size = [p.w, p.h];
          res.offRaw = (res.offRaw !== false) && T.same(p.fb, T.raw);
          res.flags[k] = T.diff(p.fb.slice(), T.render([k]).fb).n;
        }
        T.scene('grove');
        const all = T.render(T.ALL);
        res.allSize = [all.w, all.h];
        out['S' + S] = res;
      }
      Engine.setScale(1);
      return out;
    });
    for (const S of [2, 1]) {
      const r = scaleR['S' + S];
      ok(r.size[0] === 320 * S && r.size[1] === 150 * S, `scale ${S}: frames are ${r.size[0]}x${r.size[1]}`);
      for (const k of Object.keys(r.flags)) ok(r.flags[k] > 0, `scale ${S}: ${k} changes the frame (${r.flags[k]} pixels)`);
      ok(r.offRaw === true, `scale ${S}: flags off is byte-identical to the engine frame`);
    }

    // ------------------------------------------------------------------
    //  9. frame cost per effect (median of several 60-frame runs, ms added)
    // ------------------------------------------------------------------
    const cost = await page.evaluate(() => {
      const out = {};
      const runs = (S, scenes) => {
        Engine.setScale(S);
        for (const [label, scene] of scenes) {
          T.scene(scene);
          Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0 });
          const time = (flags) => {
            GFX.plain(); for (const k of flags) GFX[k] = true;
            // the fastest of 30 frames: on a busy machine the median measures the other tenants, the minimum the code
            let best = 1e9;
            for (let i = 0; i < 30; i++) { const t0 = performance.now(); Engine.render(G.ents, G.tod); const dt = performance.now() - t0; if (dt < best) best = dt; }
            return best;
          };
          const base = time([]), o = { base: +base.toFixed(2) };
          for (const k of T.ALL) o[k] = +(time([k]) - base).toFixed(2);
          o.all = +(time(T.ALL) - base).toFixed(2);
          // the module's own opt-in timers: per effect, median over 40 frames (immune to the engine's own noise)
          GFX.plain(); for (const k of T.ALL) GFX[k] = true;
          const per = { softFog: [], mist: [], bloom: [], grade: [] };
          POST.profile = true;
          for (let i = 0; i < 40; i++) { Engine.render(G.ents, G.tod); for (const k of T.ALL) per[k].push(POST.cost[k]); }
          const lo = (a) => Math.min(...a);
          POST.profile = false;
          o.hook = {}; let sum = 0;
          o.hookMed = {};
          for (const k of T.ALL) { o.hook[k] = +lo(per[k]).toFixed(2); sum += lo(per[k]); o.hookMed[k] = +T.med(per[k]).toFixed(2); }
          o.hookTotal = +sum.toFixed(2);
          out['S' + S + ' ' + label] = o;
        }
      };
      runs(1, [['oakhaven', 'oakhavenDay'], ['deepwoods', 'deepwoods'], ['lamp', 'lampNight']]);
      runs(2, [['deepwoods', 'deepwoods']]);
      Engine.setScale(1); GFX.plain();
      return out;
    });
    console.log('Frame cost, ms per frame, best case of 30 frames. "added" = render with the effect minus GFX.plain();');
    console.log('"hook" = the effect\'s own timer inside POST (fastest of 40 frames; hookMed is the median); total = the four together:');
    for (const [k, o] of Object.entries(cost)) console.log(`  ${k}: base ${o.base} | added: softFog ${o.softFog} mist ${o.mist} bloom ${o.bloom} grade ${o.grade} all ${o.all} | hook: ${JSON.stringify(o.hook)} total ${o.hookTotal} | hookMed ${JSON.stringify(o.hookMed)}`);
    for (const k of Object.keys(cost).filter(k => k.startsWith('S1'))) ok(cost[k].hookTotal < 4, `cost: the four effects take ${cost[k].hookTotal} ms together at ${k} (target 1.5 ms; 4 ms ceiling so a busy machine does not flake)`);
    for (const k of Object.keys(cost).filter(k => k.startsWith('S2'))) ok(cost[k].hookTotal < 14, `cost: the four effects take ${cost[k].hookTotal} ms together at ${k} (four times the pixels)`);

    // ------------------------------------------------------------------
    //  no per-frame allocation: heap does not grow across many frames
    // ------------------------------------------------------------------
    const alloc = await page.evaluate(() => {
      T.scene('grove'); GFX.plain(); for (const k of T.ALL) GFX[k] = true;
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0 });
      for (let i = 0; i < 20; i++) Engine.render(G.ents, G.tod);
      const m0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
      for (let i = 0; i < 300; i++) Engine.render(G.ents, G.tod);
      const m1 = performance.memory ? performance.memory.usedJSHeapSize : 0;
      return { m0, m1, perFrame: (m1 - m0) / 300 };
    });
    ok(alloc.m0 === 0 || alloc.perFrame < 400000, `alloc: heap grows ${Math.round(alloc.perFrame)} bytes/frame over 300 frames with every effect on (the engine itself allocates some)`);

    // ------------------------------------------------------------------
    //  10. screenshots: plain vs all effects, 3x crops of the 3D view
    // ------------------------------------------------------------------
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    const shots = [['oakhavenDay', 'oakhaven-day'], ['oakhavenDusk', 'oakhaven-dusk'], ['grove', 'whispergrove'], ['deepwoods', 'deepwoods'], ['clearingNight', 'clearing-night'], ['catacombs', 'catacombs'], ['hearth', 'tavern-hearth'], ['lampNight', 'lamp-night'], ['glassNight', 'glass-lamp-night']];
    for (const [scene, label] of shots) {
      for (const mode of ['plain', 'all']) {
        const url = await page.evaluate(([scene, mode]) => {
          Engine.setScale(1); T.scene(scene); T.render(mode === 'plain' ? [] : T.ALL);
          const src = Engine.canvas, c = document.createElement('canvas'); c.width = 960; c.height = 450;
          const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, 320, 150, 0, 0, 960, 450);
          return c.toDataURL('image/png');
        }, [scene, mode]);
        fs.writeFileSync(path.join(SHOT_DIR, `post-${label}-${mode === 'plain' ? 'before' : 'after'}.png`), Buffer.from(url.split(',')[1], 'base64'));
      }
    }
    // one real page screenshot with the effects on, HUD and all
    await page.evaluate(() => { T.scene('grove'); GFX.plain(); for (const k of T.ALL) GFX[k] = true; G.state = 'play'; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOT_DIR, 'post-page-whispergrove.png') });
    console.log('Screenshots in ' + SHOT_DIR);
    ok(fs.readdirSync(SHOT_DIR).filter(f => f.startsWith('post-')).length >= shots.length * 2, 'screenshots: before/after pairs written');

    // ------------------------------------------------------------------
    //  11. no page errors
    // ------------------------------------------------------------------
    ok(errors.length === 0, 'no page or console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL (test crashed)', e); process.exit(1); });
