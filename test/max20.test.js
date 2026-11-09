// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/max20.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Phase 20 MAX: every art switch on in every preset (Original included), the first-launch preset pick
// (js/max20.js: desktop with hardware WebGL2 -> Cinematic, phone -> Medium), the player's stored choice never
// overridden, the automatic step-down on slow frames, and no page errors.
// js/max20.js does nothing under automation unless the page opts in with window.__max20 (set by an init script
// here, before any game script runs); the fake profile stands in for the GPU probe, which headless Chromium fails.
'use strict';
const assert = require('node:assert/strict');
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const KEY = 'octave.max20.v1';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  async function open(ctxOpts, max20, stored, other) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, ctxOpts || {}));
    await ctx.addInitScript(([cfg, key, st, other]) => {
      if (cfg) window.__max20 = cfg;
      // a stored choice (and other modules' stored settings), planted once per context (later loads keep what the game wrote)
      try {
        if ((st || other) && !sessionStorage.getItem('max20-planted')) {
          if (st) localStorage.setItem(key, JSON.stringify(st));
          for (const k in (other || {})) localStorage.setItem(k, JSON.stringify(other[k]));
          sessionStorage.setItem('max20-planted', '1');
        }
      } catch (e) { /* fine */ }
    }, [max20 || null, KEY, stored || null, other || null]);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof MAX20 !== 'undefined');
    return { ctx, page };
  }
  const read = (page) => page.evaluate((key) => ({
    preset: PRESETS.current(), gp: GFX.preset, viewDist: GFX.viewDist, scale: GFX.scale,
    state: Object.assign({}, MAX20.state), stored: JSON.parse(localStorage.getItem(key) || 'null'),
    live: MAX20.live, measuring: MAX20.measuring(), reason: MAX20.stats.reason, profile: MAX20.stats.profile,
  }), KEY);
  async function newGame(page) {
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Max Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; G.state = 'play'; G.fadeT = 0; });
  }
  const DESKTOP = { automation: true, fake: { hwgl2: true, cores: 8, mobile: false } };
  try {
    // ------------------------------------------------------------------ the rule itself
    {
      const { ctx, page } = await open(null, null);
      const r = await page.evaluate(() => {
        const P = (o) => MAX20.pick(Object.assign({ hwgl2: false, cores: 8, mobile: false, memory: null }, o));
        return {
          desk: P({ hwgl2: true }), deskNoGpu: P({}), deskTwoCores: P({ hwgl2: true, cores: 2 }), deskSmallMem: P({ hwgl2: true, memory: 2 }),
          phone: P({ mobile: true, hwgl2: true }), weak: P({ cores: 2 }), none: MAX20.pick(null),
          live: MAX20.live, automation: MAX20.automation, preset: PRESETS.current(), stored: localStorage.getItem('octave.max20.v1'),
        };
      });
      assert.equal(r.desk, 'cinematic', 'desktop, hardware WebGL2, 8 cores -> Cinematic');
      assert.equal(r.deskNoGpu, 'high', 'desktop without hardware WebGL2 -> High');
      assert.equal(r.deskTwoCores, 'medium', 'two cores -> Medium');
      assert.equal(r.deskSmallMem, 'medium', '2 GB of memory -> Medium');
      assert.equal(r.phone, 'medium', 'a phone with a GPU -> Medium');
      assert.equal(r.weak, 'medium'); assert.equal(r.none, 'medium');
      assert.ok(r.automation && !r.live && r.preset === 'medium' && r.stored === null, 'automation without the opt-in: boots on Medium as before and stores nothing ' + JSON.stringify(r));
      console.log('PASS max20: the pick rule (Cinematic / High / Medium) and the automation guard', JSON.stringify(r));
      await ctx.close();
    }

    // ------------------------------------------------------------------ every art switch on in every preset, Original included
    {
      const { ctx, page } = await open(null, null);
      const r = await page.evaluate(() => {
        const bad = [], seen = {};
        const ART = PRESETS.art.filter(k => GFX.FX.includes(k)).concat(GFX.FX.filter(k => /^p20_beast/.test(k) && !PRESETS.art.includes(k)));
        const NONFX = ['paintedArt', 'itemIcons', 'moodPortraits', 'companionLife', 'carvedFrames', 'logSketches', 'mapStamps', 'illustratedScreens', 'creatureLife'];
        for (const k of ['directions', 'p20_beastA', 'p20_beastb', 'critters', 'kestrelMoored', 'scenery', 'decals', 'ceilings', 'panoramas', 'belfryArt']) if (!ART.includes(k)) bad.push('not art: ' + k);
        for (const k of NONFX) if (GFX.FX.includes(k) || GFX[k] !== true) bad.push('non-preset art switch ' + k + ' = ' + GFX[k]);
        for (const n of PRESETS.order) {
          PRESETS.apply(n);
          for (const k of ART.concat(NONFX)) if (GFX[k] !== true) bad.push(n + ': ' + k + ' is off');
          seen[n] = GFX.FX.filter(k => k !== 'crtCurve' && GFX[k] === true).length;
        }
        // per-frame EFFECTS keep their preset logic: Original has none of them, Low drops its list
        PRESETS.apply('original');
        const origOn = GFX.FX.filter(k => k !== 'crtCurve' && GFX[k] === true && !PRESETS.isArt(k) && !PRESETS.allButLow.includes(k));
        const origAllButLow = PRESETS.allButLow.filter(k => GFX.FX.includes(k) && GFX[k] !== true);
        PRESETS.apply('low');
        const lowOn = ['bloom', 'softFog', 'mist', 'reflections', 'grass', 'groundShadows', 'sunShafts', 'aurora', 'winter17'].concat(PRESETS.allButLow).filter(k => GFX[k] === true);
        PRESETS.apply('medium');
        return { bad, seen, art: ART, origOn, origAllButLow, lowOn };
      });
      assert.deepEqual(r.bad, [], r.bad.join('; '));
      assert.deepEqual(r.origOn, [], 'Original keeps every per-frame effect off: ' + r.origOn);
      assert.deepEqual(r.lowOn, [], 'Low still drops its heavy effects (and the country beyond the walls): ' + r.lowOn);
      assert.deepEqual(r.origAllButLow, [], 'Original has the cheap all-but-Low effects: ' + r.origAllButLow);
      console.log('PASS max20: art switches on in all ' + Object.keys(r.seen).length + ' presets (' + r.art.join(', ') + '; plus painted art, icons, portraits, companion life, frames, sketches, stamps, screens); effects unchanged; farCountry on in all but Low', JSON.stringify(r.seen));
      await ctx.close();
    }

    // ------------------------------------------------------------------ desktop with hardware WebGL2 -> Cinematic; the GPU compositor rule
    {
      const { ctx, page } = await open(null, DESKTOP);
      const r = await read(page);
      assert.equal(r.preset, 'cinematic', 'a desktop with hardware WebGL2 starts on Cinematic: ' + JSON.stringify(r));
      assert.equal(r.viewDist, 2.5, 'view distance is the preset\'s own (2.5, Far)');
      assert.ok(r.live && r.state.auto === 'cinematic' && r.state.user === null && r.state.settled === false && r.measuring, 'auto choice stored, the safety net armed');
      assert.deepEqual(r.stored, r.state, 'the auto choice is in localStorage');
      const g = await page.evaluate(() => ({ comp: GFX.gpuCompositor, hw: !!(GPU18.available() && !GPU18.software()), choice: GPU18.st.choice, avail: GPU18.st.available }));
      assert.equal(g.choice, null, 'no stored compositor choice');
      assert.equal(g.comp, g.hw, 'GPU compositor auto default: on exactly where WebGL2 is hardware accelerated ' + JSON.stringify(g));
      // second launch: the stored auto choice is used, not re-picked (the fake profile is not consulted again)
      await page.reload(); await page.waitForFunction(() => typeof MAX20 !== 'undefined' && G.state === 'title');
      const r2 = await read(page);
      assert.ok(r2.preset === 'cinematic' && r2.profile === null && /stored auto/.test(r2.reason), 'relaunch keeps the stored auto choice ' + JSON.stringify(r2));
      console.log('PASS max20: desktop profile (faked hardware WebGL2, 8 cores) -> Cinematic at 2.5 view distance; compositor ' + (g.comp ? 'on' : 'off') + ' = hardware ' + g.hw, JSON.stringify(r.profile));
      await ctx.close();
    }

    // ------------------------------------------------------------------ a phone -> Medium (real detection: Pixel 7 user agent, touch, small screen)
    {
      const { ctx, page } = await open({ ...devices['Pixel 7'] }, { automation: true, fake: { hwgl2: true, cores: 8 } });
      const r = await read(page);
      assert.ok(r.profile && r.profile.mobile === true, 'the phone is detected as a phone ' + JSON.stringify(r.profile));
      assert.equal(r.preset, 'medium', 'a phone starts on Medium even with a GPU and 8 cores');
      assert.ok(r.state.auto === 'medium' && r.state.settled === true && !r.measuring, 'Medium is settled at once (nothing to step down to)');
      console.log('PASS max20: phone profile (Pixel 7) -> Medium', JSON.stringify(r.profile));
      await ctx.close();
    }
    {
      const { ctx, page } = await open({ ...devices['iPhone 14'] }, { automation: true, fake: { hwgl2: true, cores: 8 } });
      const r = await read(page);
      assert.equal(r.preset, 'medium', 'an iPhone starts on Medium');
      await ctx.close();
    }

    // ------------------------------------------------------------------ the player's stored choice is never overridden
    {
      // a returning player from before this phase: Cinematic chosen (js/cinema14.js kept it), on a phone: stays Cinematic
      const { ctx, page } = await open({ ...devices['Pixel 7'] }, { automation: true, fake: { hwgl2: true, cores: 8 } }, null, { 'octave.cinema14.v1': { p: 1, l: 1, f: 1, g: 1 } });
      const r = await read(page);
      assert.ok(r.preset === 'cinematic' && r.state.user === 'cinematic' && r.state.auto === null && !r.measuring && r.profile === null, 'an earlier Cinematic choice is kept, not re-picked ' + JSON.stringify(r));
      await ctx.close();
    }
    {
      // ...or a view distance of their own (js/far14.js kept 1.3): kept, recorded as a custom choice
      const { ctx, page } = await open(null, DESKTOP, null, { 'echoes-far14': { viewDist: 1.3, farLook: null } });
      const r = await read(page);
      assert.ok(r.viewDist === 1.3 && r.state.user === 'custom' && r.state.base === 'medium' && !r.measuring && r.profile === null, 'an earlier custom view distance is kept ' + JSON.stringify(r));
      console.log('PASS max20: settings stored by earlier phases (Cinematic, a view distance) count as the player\'s choice');
      await ctx.close();
    }
    {
      const { ctx, page } = await open(null, DESKTOP, { v: 1, user: 'low', base: 'low', auto: 'cinematic', settled: false });
      const r = await read(page);
      assert.equal(r.preset, 'low', 'a stored player choice (Low) boots as Low on a Cinematic-class desktop ' + JSON.stringify(r));
      assert.equal(r.measuring, false, 'no safety net for a player choice');
      await newGame(page);
      const r2 = await page.evaluate(() => { MAX20.forceFrameMs = 0; for (let i = 0; i < 600; i++) MAX20.feed(80); return { preset: PRESETS.current(), steps: MAX20.stats.steps.length, user: MAX20.state.user }; });
      assert.deepEqual(r2, { preset: 'low', steps: 0, user: 'low' }, '30 s of slow frames leave the player\'s Low alone');
      await ctx.close();
    }
    {
      // choosing in Options during the measured window: recorded, kept through slow frames and the next launch
      const { ctx, page } = await open(null, DESKTOP);
      await newGame(page);
      await page.evaluate(() => { MAX20.forceFrameMs = 0; renderMenu(); });
      await page.locator('#mn-gfx').click();
      await page.locator('#gfx-p-high').click();
      const r = await page.evaluate((key) => { for (let i = 0; i < 600; i++) MAX20.feed(80); return { preset: PRESETS.current(), user: MAX20.state.user, stored: JSON.parse(localStorage.getItem(key)), steps: MAX20.stats.steps.length, measuring: MAX20.measuring() }; }, KEY);
      assert.ok(r.preset === 'high' && r.user === 'high' && r.stored.user === 'high' && r.steps === 0 && !r.measuring, 'pressing High is the player\'s choice, never stepped down ' + JSON.stringify(r));
      // a lone switch is a choice too (custom over High)
      await page.locator('#gfx-res1').click();
      const c = await page.evaluate(() => ({ preset: PRESETS.current(), user: MAX20.state.user, base: MAX20.state.base }));
      assert.deepEqual(c, { preset: 'custom', user: 'custom', base: 'high' }, 'a lone resolution change records custom over High');
      await page.locator('#gfx-res2').click();
      await page.reload(); await page.waitForFunction(() => typeof MAX20 !== 'undefined' && G.state === 'title');
      const r2 = await read(page);
      assert.ok(r2.preset === 'high' && r2.state.user === 'high' && !r2.measuring, 'next launch boots on the player\'s High, not Cinematic ' + JSON.stringify(r2));
      console.log('PASS max20: a stored player choice is never overridden (boot, slow frames, Options clicks, relaunch)');
      await ctx.close();
    }

    // ------------------------------------------------------------------ the automatic step-down with a forced slow frame time
    {
      const { ctx, page } = await open(null, DESKTOP);
      await newGame(page);
      // the real requestAnimationFrame path: 200 ms frames (5 fps; headless Cinematic is about that slow here anyway, so
      // few real frames are needed) step Cinematic down to Ultra after ~4 s of play
      await page.evaluate(() => { MAX20.forceFrameMs = 200; });
      await page.waitForFunction(() => MAX20.state.auto !== 'cinematic', null, { timeout: 90000, polling: 250 });
      const a = await page.evaluate(() => ({ preset: PRESETS.current(), auto: MAX20.state.auto, steps: MAX20.stats.steps.slice(), notices: MAX20.stats.notices.slice(), msgs: document.getElementById('msgs').textContent }));
      assert.equal(a.preset, 'ultra'); assert.equal(a.auto, 'ultra');
      assert.equal(a.notices[0], 'Graphics eased to Ultra to keep the game smooth — Options to change');
      assert.ok(a.msgs.includes('Graphics eased to Ultra'), 'the notice shows in the message line');
      // then the rest synchronously: Ultra -> High -> Medium, then settled and stored
      const b = await page.evaluate((key) => {
        MAX20.forceFrameMs = 0;
        for (let i = 0; i < 400 && MAX20.measuring(); i++) MAX20.feed(50);
        return { preset: PRESETS.current(), auto: MAX20.state.auto, settled: MAX20.state.settled, steps: MAX20.stats.steps.map(s => s.from + '>' + s.to), notices: MAX20.stats.notices.slice(), stored: JSON.parse(localStorage.getItem(key)), vd: GFX.viewDist, scale: GFX.scale };
      }, KEY);
      assert.deepEqual(b.steps, ['cinematic>ultra', 'ultra>high', 'high>medium'], 'one preset at a time');
      assert.deepEqual(b.notices.slice(1), ['Graphics eased to High to keep the game smooth — Options to change', 'Graphics eased to Medium to keep the game smooth — Options to change']);
      assert.ok(b.preset === 'medium' && b.settled && b.stored.auto === 'medium' && b.stored.settled === true && b.stored.user === null, 'settled on Medium and stored ' + JSON.stringify(b));
      await page.reload(); await page.waitForFunction(() => typeof MAX20 !== 'undefined' && G.state === 'title');
      const c = await read(page);
      assert.ok(c.preset === 'medium' && !c.measuring, 'relaunch: Medium, not measured again');
      console.log('PASS max20: forced slow frames step Cinematic -> Ultra (real rAF path, 200 ms) -> High -> Medium (50 ms) with a notice each, settled and stored');
      await ctx.close();
    }
    {
      // smooth frames: the choice settles at Cinematic after ~20 s of play
      const { ctx, page } = await open(null, DESKTOP);
      await newGame(page);
      const r = await page.evaluate((key) => {
        MAX20.forceFrameMs = 0;
        for (let i = 0; i < 2000 && MAX20.measuring(); i++) MAX20.feed(16.7);
        return { preset: PRESETS.current(), settled: MAX20.state.settled, playS: MAX20.stats.playS, stored: JSON.parse(localStorage.getItem(key)), steps: MAX20.stats.steps.length };
      }, KEY);
      assert.ok(r.preset === 'cinematic' && r.settled && r.steps === 0 && r.stored.settled === true && r.playS >= 20 && r.playS < 25, 'smooth play settles on Cinematic after ~20 s ' + JSON.stringify(r));
      console.log('PASS max20: smooth frames settle on Cinematic after ' + r.playS.toFixed(1) + ' s of play');
      await ctx.close();
    }

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS max20: no page errors');
    console.log('OK max20');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL max20', e); process.exit(1); });
