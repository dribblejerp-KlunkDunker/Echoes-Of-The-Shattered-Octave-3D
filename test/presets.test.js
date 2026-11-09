// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/presets.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers the graphics presets (Original / Low / Medium / High), the Graphics block in the
// Options -> accessibility menu, CRT curvature and upscaling, HUD input at 2x, and PRESETS.measure().
// Set PRESETS_SHOTS to a directory to keep screenshots and the measurement table.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.PRESETS_SHOTS || path.join(os.tmpdir(), 'octave-presets');
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Presets Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // ---------------------------------------------------------------- state: values, canvas, fog, particles
    const state = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const out = {};
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; };
      if (typeof Weather !== 'undefined') Weather.hold('clear');
      G.tod = 0.45;
      check(typeof PRESETS === 'object' && typeof PRESETS.apply === 'function' && typeof PRESETS.current === 'function' && typeof PRESETS.measure === 'function' && PRESETS.table, 'PRESETS exposes apply, current, table and measure');
      check(PRESETS.current() === 'medium' && GFX.preset === 'medium', 'the game boots on the medium preset');
      const orig = {}; for (const id in PART_STYLE) orig[id] = PART_STYLE[id].n;
      check(Object.keys(orig).length >= 8, 'particle styles exist');
      const fogCalls = []; const _look = Engine.setLook;
      Engine.setLook = o => { fogCalls.push(o && o.fogK); return _look(o); };
      const cheapOff = ['bloom', 'softFog', 'mist', 'reflections', 'grass', 'panoramas', 'flyovers', 'darkInteriors', 'groundShadows', 'sunShafts', 'heatHaze', 'glassGlare', 'seeThrough', 'coldBreath', 'footprints', 'hushWave', 'folkHoods', 'folkHuddle', 'folkCapes', 'folkTavern', 'greenStages', 'glassSpread', 'rootVeins', 'p14pMirrors', 'p14pShimmer', 'aurora', 'causticLight', 'deepView', 'flumeGlow', 'winter17'];   // dark interiors are off in Low (accessibility; audit finding)
      const expect = { original: [1, 1, 1], low: [1, 0.8, 0.5], medium: [1, 1, 1], high: [2, 1.15, 1.25] };
      const canvasOf = { 1: [320, 200], 2: [640, 400] };
      for (const name of ['original', 'low', 'medium', 'high']) {
        fogCalls.length = 0;
        check(PRESETS.apply(name) === name, 'apply returns the name');
        const [sc, vd, pt] = expect[name];
        check(GFX.scale === sc && GFX.viewDist === vd && GFX.particles === pt, name + ': scale/view/particles ' + [GFX.scale, GFX.viewDist, GFX.particles]);
        check(GFX.preset === name && PRESETS.current() === name, name + ': preset recorded');
        check(Engine.getScale() === sc && Engine.canvas.width === canvasOf[sc][0] && Engine.canvas.height === canvasOf[sc][1], name + ': canvas ' + Engine.canvas.width + 'x' + Engine.canvas.height);
        check(fogCalls.length === 1 && fogCalls[0] === vd, name + ': setLook fogK ' + fogCalls);
        for (const k of GFX.FX) {
          if (k === 'crtCurve') continue;
          const want = PRESETS.isArt && PRESETS.isArt(k) ? true : PRESETS.allButLow && PRESETS.allButLow.includes(k) ? name !== 'low' : PRESETS.cinemaOnly && PRESETS.cinemaOnly.includes(k) ? false : name === 'original' ? false : name === 'low' ? !cheapOff.includes(k) : true;   // Phase 14 CINEMA flags: Cinematic preset only
          check(GFX[k] === want, name + ': flag ' + k + ' should be ' + want);   // Phase 20 MAX: art switches are on in every preset
        }
        for (const id in PART_STYLE) check(PART_STYLE[id].n === Math.round(orig[id] * pt), name + ': particles ' + id + ' ' + PART_STYLE[id].n);
        go('deepwoods', 27.5, 30.5, -1.57); render();
        check(PARTICLES.list.length === PART_STYLE.deepwoods.n, name + ': the particle list was rebuilt to ' + PART_STYLE.deepwoods.n + ', saw ' + PARTICLES.list.length);
        out[name] = { canvas: canvasOf[sc].join('x'), deepwoodsParticles: PARTICLES.list.length };
      }
      check(PRESETS.table.original && PRESETS.table.low && PRESETS.table.medium && PRESETS.table.high && PRESETS.table.ultra, 'the table has all five presets');
      // an unknown flag added by another team follows the rule: on for low/medium/high, off for original
      GFX.FX.push('zzNewFlag'); GFX.zzNewFlag = false;
      PRESETS.apply('medium'); check(GFX.zzNewFlag === true, 'unknown flags default on for medium');
      PRESETS.apply('low'); check(GFX.zzNewFlag === true, 'unknown flags default on for low');
      PRESETS.apply('original'); check(GFX.zzNewFlag === false, 'unknown flags default off for original');
      GFX.FX.pop(); delete GFX.zzNewFlag;
      // invalid names are refused, state untouched
      let threw = false; try { PRESETS.apply('bogus'); } catch (e) { threw = true; }
      check(threw && PRESETS.current() === 'original', 'unknown preset names are refused');
      // individual changes read as custom
      PRESETS.apply('medium'); PRESETS.setScale(2);
      check(PRESETS.current() === 'custom' && GFX.preset === 'custom' && Engine.canvas.width === 640, 'a lone resolution change is custom');
      PRESETS.setScale(1); check(PRESETS.current() === 'medium', 'putting it back is medium again');
      PRESETS.setViewDist(10); check(GFX.viewDist === 4, 'view distance clamps at 4 (Phase 14: the slider runs 0.6 to 4)');
      PRESETS.setViewDist(0); check(GFX.viewDist === 0.6, 'view distance clamps at 0.6');
      PRESETS.setParticles(0.5); check(GFX.particles === 0.5 && PART_STYLE.deepwoods.n === Math.round(orig.deepwoods * 0.5), 'particles scale from the original counts');
      PRESETS.apply('medium');
      Engine.setLook = _look;
      out.originals = orig;
      return out;
    });
    console.log('PASS presets: documented values, canvas size, fog multiplier, particle counts, unknown flags', JSON.stringify(state));

    // ---------------------------------------------------------------- original == GFX.plain() at scale 1; round trips
    const exact = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; };
      let seed = 1;
      const lcg = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const realRandom = Math.random;
      const frame = () => {
        // the engine drifts the clouds on the real clock (engine.js), so freeze it along with Math.random
        const realNow = performance.now.bind(performance); performance.now = () => 123456;
        seed = 7; Math.random = lcg; PARTICLES.mapId = null; ANIM.dirLast = Engine.cam.dir; Engine.setTime(3.25);
        Engine.render(G.ents, G.tod); Engine.render(G.ents, G.tod);
        Math.random = realRandom; performance.now = realNow;
        return Array.from(Engine.ctx.getImageData(0, 0, Engine.canvas.width, 150 * Engine.getScale()).data);
      };
      const orig = {}; for (const id in PART_STYLE) orig[id] = PART_STYLE[id].n;
      const origN = Object.assign({}, orig);
      const scenes = [['oakhaven', 23.5, 20.5, -1.57], ['deepwoods', 27.5, 30.5, -1.57], ['tavern', 8.5, 10.5, -1.57]];
      const same = [];
      for (const [id, x, y, dir] of scenes) {
        // reference: the engine as it was before this phase, via GFX.plain() at the shipped scale and look
        Engine.setScale(1); Engine.setLook({ fogK: 1 });
        for (const k in orig) PART_STYLE[k].n = origN[k];
        GFX.plain(); for (const k of (PRESETS.art || []).concat(PRESETS.allButLow || [])) if (GFX.FX.includes(k)) GFX[k] = true; GFX.changed(); go(id, x, y, dir);   // Phase 20 MAX: Original = no effects, art on
        frame();   // warm-up: the first frame in a place settles sky and cached art
        const ref = frame();
        // the long way round: high, then low, then original
        PRESETS.apply('high'); check(Engine.canvas.width === 640, 'high doubles the canvas');
        PRESETS.apply('low'); PRESETS.apply('original');
        check(Engine.canvas.width === 320 && Engine.canvas.height === 200 && GFX.preset === 'original', 'original restores 320x200');
        go(id, x, y, dir);
        frame();
        const got = frame();
        let diff = 0; for (let i = 0; i < ref.length; i++) if (ref[i] !== got[i]) diff++;
        check(ref.length === got.length && diff === 0, id + ': original differs from GFX.plain() in ' + diff + ' bytes');
        same.push(id + ':' + ref.length);
      }
      // high -> original -> medium restores the canvas and the counts exactly
      PRESETS.apply('high'); PRESETS.apply('original'); PRESETS.apply('medium');
      check(Engine.canvas.width === 320 && Engine.canvas.height === 200 && Engine.getScale() === 1, 'medium after high/original is 320x200');
      for (const id in orig) check(PART_STYLE[id].n === origN[id], 'particle count restored for ' + id + ': ' + PART_STYLE[id].n + ' vs ' + origN[id]);
      go('deepwoods', 27.5, 30.5, -1.57); render();
      check(PARTICLES.list.length === origN.deepwoods, 'live particles back to ' + origN.deepwoods);
      // the HUD still draws after round trips
      const hud = Engine.ctx.getImageData(0, 160, 320, 40).data; let lit = 0; for (let i = 0; i < hud.length; i += 4) if (hud[i] + hud[i + 1] + hud[i + 2] > 30) lit++;
      check(lit > 1500, 'HUD drawn (' + lit + ' px)');
      return same;
    });
    console.log('PASS presets: original is byte-identical to GFX.plain() at scale 1; high -> original -> medium restores 320x200 and counts', JSON.stringify(exact));

    // ---------------------------------------------------------------- the Graphics block in Options -> accessibility
    await page.evaluate(() => { PRESETS.apply('medium'); loadMap('oakhaven', { x: 23.5, y: 20.5, dir: -1.57 }); G.state = 'panel'; G.fadeT = 0; renderMenu(); });
    assert.equal(await page.locator('#mn-gfx').count(), 1, 'Options has a door to the graphics and accessibility menu');
    await page.locator('#mn-gfx').click();
    assert.equal(await page.locator('#modal-panel .ctl-grid #gfx-state').count(), 1, 'the Graphics block lives in the ctl-grid');
    assert.match(await page.locator('#gfx-state').textContent(), /Medium/);
    for (const id of ['gfx-p-original', 'gfx-p-low', 'gfx-p-medium', 'gfx-p-high', 'gfx-res1', 'gfx-res2', 'gfx-vd-dn', 'gfx-vd-up', 'gfx-pt-dn', 'gfx-pt-up', 'gfx-up-sharp', 'gfx-up-smooth', 'gfx-curve']) {
      assert.equal(await page.locator('#' + id).evaluate(b => b.tagName === 'BUTTON'), true, id + ' is a button');
    }
    assert.equal(await page.locator('#gfx-p-medium').getAttribute('aria-pressed'), 'true');
    const read = () => page.evaluate(() => ({ cur: PRESETS.current(), scale: GFX.scale, vd: GFX.viewDist, pt: GFX.particles, w: Engine.canvas.width, curve: GFX.crtCurve, smooth: document.getElementById('view').classList.contains('smooth-up'),
      state: document.getElementById('gfx-state').textContent, marked: Array.from(document.querySelectorAll('[id^=gfx-p-].sel')).map(b => b.id) }));
    for (const [name, scale] of [['original', 1], ['low', 1], ['high', 2], ['medium', 1]]) {
      await page.locator('#gfx-p-' + name).click();
      const s = await read();
      assert.equal(s.cur, name); assert.equal(s.scale, scale); assert.equal(s.w, 320 * scale);
      assert.deepEqual(s.marked, ['gfx-p-' + name], 'the current preset is marked');
      assert.match(s.state, new RegExp(name, 'i'));
    }
    await page.locator('#gfx-res2').click(); let s = await read();
    assert.equal(s.scale, 2); assert.equal(s.cur, 'custom'); assert.deepEqual(s.marked, []); assert.match(s.state, /Custom/);
    await page.locator('#gfx-res1').click(); s = await read(); assert.equal(s.scale, 1); assert.equal(s.cur, 'medium');
    await page.locator('#gfx-vd-up').click(); s = await read(); assert.equal(s.vd, 1.05); assert.equal(s.cur, 'custom');
    await page.locator('#gfx-vd-dn').click(); await page.locator('#gfx-vd-dn').click(); s = await read(); assert.equal(s.vd, 0.95);
    await page.locator('#gfx-vd-up').click(); s = await read(); assert.equal(s.cur, 'medium');
    await page.locator('#gfx-pt-dn').click(); s = await read(); assert.equal(s.pt, 0.75); assert.equal(s.cur, 'custom');
    await page.locator('#gfx-pt-up').click(); s = await read(); assert.equal(s.pt, 1);
    await page.locator('#gfx-up-smooth').click(); s = await read(); assert.equal(s.smooth, true);
    assert.equal(await page.locator('#view').evaluate(v => getComputedStyle(v).imageRendering), 'auto', 'Smooth upscaling filters the canvas');
    await page.locator('#gfx-up-sharp').click(); s = await read(); assert.equal(s.smooth, false);
    assert.match(await page.locator('#view').evaluate(v => getComputedStyle(v).imageRendering), /pixelated|crisp-edges/, 'Sharp pixels is the default');
    // the menu survives a re-render by the existing buttons (the wrapper re-appends the block, state intact)
    await page.locator('#gfx-p-low').click();
    await page.locator('#ac-dith').click();
    assert.equal(await page.locator('#gfx-state').count(), 1);
    assert.equal((await read()).cur, 'low');
    await page.locator('#ac-dith').click();
    // keyboard: focus a button and press Enter
    await page.locator('#gfx-p-high').focus(); await page.keyboard.press('Enter');
    assert.equal((await read()).cur, 'high', 'Enter on a focused preset button applies it');
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'gfx-p-high', 'focus stays on the button');
    await page.locator('#gfx-res1').focus(); await page.keyboard.press('Enter'); assert.equal((await read()).scale, 1);
    await page.locator('#gfx-p-medium').focus(); await page.keyboard.press('Enter'); assert.equal((await read()).cur, 'medium');
    console.log('PASS presets UI: Graphics block, each button changes state, Custom state, Enter on a focused button');

    // ---------------------------------------------------------------- CRT
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-on') || g.classList.contains('crt-curve')), false, 'clean by default');
    await page.locator('#gfx-curve').click();
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-curve')), false, 'curvature does nothing while CRT is off');
    await page.locator('#gfx-curve').click();
    await page.locator('#ac-crt').click();
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-on')), true);
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-curve')), false);
    await page.locator('#gfx-curve').click();
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-curve') && g.classList.contains('crt-on')), true, 'curvature class toggles on with CRT');
    assert.equal(await page.locator('#gfx-curve').textContent(), 'On');
    assert.match(await page.locator('#game').evaluate(g => getComputedStyle(g, '::after').backgroundImage), /gradient/, 'scanlines draw');
    assert.match(await page.locator('#game').evaluate(g => getComputedStyle(g, '::before').backgroundImage), /gradient/, 'vignette draws');
    assert.notEqual(await page.locator('#game').evaluate(g => getComputedStyle(g).borderTopLeftRadius), '0px', 'curved glass corners');
    await page.locator('#ac-crt').click();   // CRT off again: the whole filter goes, curvature included
    assert.equal(await page.locator('#game').evaluate(g => g.classList.contains('crt-on') || g.classList.contains('crt-curve')), false);
    assert.equal(await page.locator('#game').evaluate(g => getComputedStyle(g, '::after').content), 'none', 'clean unfiltered: no overlay');
    assert.equal(await page.locator('#gfx-curve').textContent(), 'On', 'the curvature choice is remembered');
    await page.locator('#gfx-curve').click();   // off
    await page.locator('#gfx-p-original').click();
    assert.equal((await read()).curve, false);
    console.log('PASS presets CRT: scanlines + vignette + curvature class, off means clean unfiltered');

    // ---------------------------------------------------------------- compact 640x400 and every button reachable
    const fits = async (label) => {
      const r = await page.evaluate(() => {
        const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel;
        const bad = [];
        const buttons = Array.from(panel.querySelectorAll('button:enabled'));
        for (const b of buttons) {
          b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          const q = b.getBoundingClientRect();
          if (q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1 || q.width < 4) bad.push((b.id || b.textContent) + ' ' + [q.left, q.right, q.top, q.bottom].map(Math.round));
        }
        return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, bad, n: buttons.length };
      });
      assert.equal(r.panelX && r.gridX && r.docX, true, label + ' has no horizontal overflow ' + JSON.stringify(r));
      assert.deepEqual(r.bad, [], label + ' buttons reachable by scrolling');
      return r.n;
    };
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { renderAccessibilityMenu(); });
    const n640 = await fits('compact accessibility menu');
    await page.evaluate(() => { document.querySelector('#modal-panel .ctl-grid').scrollTop = 1e6; });
    await page.screenshot({ path: path.join(SHOTS, 'options-graphics-640x400.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const hardcore of [false, true]) {   // the hardcore row is the tallest: the Options panel must still fit (as hardcore.test.js checks)
      await page.evaluate((hc) => { closeModal(); G.player.hardcore = hc; G.state = 'panel'; renderMenu(); }, hardcore);
      assert.equal(await page.locator('#modal-panel button:enabled').evaluateAll(buttons => buttons.every(b => {
        const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
      })), true, 'options panel keeps every action on screen (hardcore ' + hardcore + ')');
    }
    await page.evaluate(() => { G.player.hardcore = false; closeModal(); G.state = 'panel'; renderMenu(); });
    await page.screenshot({ path: path.join(SHOTS, 'options-menu-1280x800.png') });
    await page.evaluate(() => { renderAccessibilityMenu(); document.querySelector('#modal-panel .ctl-grid').scrollTop = 1e6; });
    await page.screenshot({ path: path.join(SHOTS, 'options-graphics-1280x800.png') });
    console.log('PASS presets layout: compact 640x400 menu has no horizontal overflow, ' + n640 + ' buttons reachable; Options fits at 1280x800');

    // ---------------------------------------------------------------- HUD stays clickable at scale 2
    for (const name of ['high', 'original']) {
      await page.evaluate((n) => { closeModal(); PRESETS.apply(n); loadMap('oakhaven', { x: 23.5, y: 20.5, dir: -1.57 }); G.state = 'play'; G.fadeT = 0; G.mouse.down = false; G.keys = {}; render(); }, name);
      const box = await page.locator('#view').boundingBox();
      assert.equal(await page.evaluate(() => Engine.canvas.width), name === 'high' ? 640 : 320);
      // MAP button: logical x 48..72, y 168..179 on the 320x200 canvas
      await page.mouse.click(box.x + (48 + 12) / 320 * box.width, box.y + (168 + 5.5) / 200 * box.height);
      await page.waitForFunction(() => G.openPanel === 'map', null, { timeout: 3000 });
      assert.equal(await page.locator('#amap').count(), 1, name + ': the MAP HUD button opens the map panel');
      await page.evaluate(() => { closeModal(); G.state = 'play'; });
    }
    console.log('PASS presets input: the MAP HUD button opens the map at 2x and at 1x');

    // ---------------------------------------------------------------- screenshots of each preset
    await page.evaluate(() => { closeModal(); if (typeof Weather !== 'undefined') Weather.hold('clear'); });
    for (const name of ['original', 'low', 'medium', 'high']) {
      await page.evaluate((n) => { PRESETS.apply(n); loadMap('oakhaven', { x: 23.5, y: 20.5, dir: -1.57 }); G.state = 'play'; G.fadeT = 0; G.tod = 0.45; render(); }, name);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(SHOTS, 'preset-' + name + '.png') });
    }
    await page.evaluate(() => { PRESETS.apply('medium'); UPG.crt = true; GFX.crtCurve = false; applyVisualSettings(); });
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, 'crt-scanlines.png') });
    await page.evaluate(() => { PRESETS.setCurve(true); PRESETS.syncClasses(); });
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, 'crt-curved.png') });
    await page.evaluate(() => { UPG.crt = false; PRESETS.setCurve(false); applyVisualSettings(); PRESETS.setUpscale('smooth'); PRESETS.apply('high'); });
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, 'high-smooth-upscale.png') });
    await page.evaluate(() => { PRESETS.setUpscale('sharp'); PRESETS.apply('high'); });
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, 'high-sharp-clean.png') });
    await page.evaluate(() => { PRESETS.apply('medium'); });

    // ---------------------------------------------------------------- measurement
    const table = await page.evaluate(() => {
      const t = PRESETS.measure({ runs: 7, frames: 60 });
      return { t, best: PRESETS.lastBest, restored: { preset: PRESETS.current(), map: G.mapId, scale: Engine.getScale() } };
    });
    const scenes = ['oakhaven', 'deepwoods', 'whispergrove', 'tavern'];
    for (const p of ['original', 'low', 'medium', 'high']) for (const sc of scenes) {
      const v = table.t[p][sc];
      assert.ok(typeof v === 'number' && Number.isFinite(v) && v > 0, 'measured ' + p + ' ' + sc + ': ' + v);
    }
    assert.deepEqual(table.restored, { preset: 'medium', map: 'oakhaven', scale: 1 }, 'measure() puts the game back');
    fs.writeFileSync(path.join(SHOTS, 'measure.json'), JSON.stringify({ median: table.t, best: table.best, loadavg: os.loadavg(), cpus: os.cpus().length }, null, 2));
    console.log('MEASURE ms per frame (median of seven 60-frame runs, headless Chromium on the build server; not Chromebook numbers)');
    console.log('preset      ' + scenes.map(s => s.padStart(13)).join(''));
    for (const p of ['original', 'low', 'medium', 'high']) console.log(p.padEnd(12) + scenes.map(s => table.t[p][s].toFixed(2).padStart(13)).join(''));
    console.log('best (fastest of the seven runs) ms per frame; machine load average ' + os.loadavg().map(v => v.toFixed(1)).join(' ') + ' on ' + os.cpus().length + ' CPUs');
    for (const p of ['original', 'low', 'medium', 'high']) console.log(p.padEnd(12) + scenes.map(s => table.best[p][s].toFixed(2).padStart(13)).join(''));
    console.log('PASS presets measure: every preset and scene reports a frame time');

    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
