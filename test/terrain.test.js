// PLAYWRIGHT_MODULE=/path/to/playwright node test/terrain.test.js
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Terrain Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);
    const rules = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const hold = n => { for (let i = 0; i < n; i++) { G.keys = { w: true }; update(0.033); } G.keys = {}; };
      G.state = 'play'; G.tod = 0.45; G.player.hp = G.player.hpMax;
      // the Watch-stone has a proctor and mites on it: keep them out of the
      // physics under test so a stray bite cannot masquerade as fall damage
      for (const e of G.maps.clearing.entities) if (e.kind === 'enemy') e.hidden = true;
      // --- the Watch-stone is real ground, not scenery -------------------
      loadMap('clearing', { x: 20.5, y: 19.5, dir: 0 });
      const m = G.map;
      check(!!m.lvls, 'the clearing carries a height field');
      check(Math.abs(m.lvlAt(28, 18) - 1.2) < 1e-6, 'the hilltop sits 1.2 above the meadow');
      check(Math.abs(m.lvlAt(24, 19) - 0.9) < 1e-6, 'the top step is one rise below the hilltop');
      check(Math.abs(m.lvlAt(23, 19) - 0.6) < 1e-6 && Math.abs(m.lvlAt(22, 19) - 0.3) < 1e-6, 'the stair rises in walkable steps');
      check(!m.isBlocked(25, 18) && !m.isBlocked(30, 20), 'the cliff edge is open ground, not a wall cell');
      check(G.player.feet === 0 && Engine.cam.z === 0.88, 'you start at eye height on the meadow');
      // --- a 1.2 rise is a cliff: you cannot walk up it -------------------
      loadMap('clearing', { x: 24.4, y: 17.5, dir: 0 });
      check(solidAt(25.4, 17.5, null), 'the cliff face blocks a walker at the bottom');
      check(!solidAt(22.5, 19.5, null), 'the first step is inside a walking rise');
      check(solidAt(24.5, 19.5, null), 'the top step is not a single leap from the meadow');
      // --- the stair lifts the eye ---------------------------------------
      loadMap('clearing', { x: 21.2, y: 19.5, dir: 0 });
      hold(90);
      check(Math.abs(G.player.feet - 1.2) < 1e-6, 'walking the steps brings the feet up to the hilltop');
      check(Math.abs(Engine.cam.z - 2.08) < 1e-6, 'the eye rides 0.88 above raised ground');
      check(Engine.cam.x > 25.5, 'the walk ends on top of the hill');
      // --- and you can walk off the edge ---------------------------------
      loadMap('clearing', { x: 30.6, y: 17.5, dir: 0 });
      const topHp = G.player.hp = G.player.hpMax;
      document.querySelector('#msgs').innerHTML = '';
      let fell = false;
      for (let i = 0; i < 150; i++) { G.keys = { w: true }; update(0.033); if (G.player.feet < 0.01) { fell = true; break; } }
      G.keys = {};
      check(fell, 'walking off the edge drops you to the meadow');
      check(G.player.feet === 0 && Engine.cam.z === 0.88, 'the fall settles your feet on the lower ground');
      check(G.player.hp < topHp, 'a 1.2 drop costs health');
      check(Math.round(topHp - G.player.hp) === 8, 'fall damage scales with the drop');
      check(/hard off the edge/.test(document.querySelector('#msgs').textContent), 'the landing is reported');
      // --- short drops are free ------------------------------------------
      loadMap('clearing', { x: 24.5, y: 19.5, dir: Math.PI });
      const stairsHp = G.player.hp = G.player.hpMax;
      hold(80);
      check(G.player.feet === 0, 'walking down the steps reaches the meadow');
      check(G.player.hp === stairsHp, 'a stair is not a fall');
      // --- sprites stand on raised ground --------------------------------
      loadMap('clearing', { x: 28.5, y: 19.5, dir: -Math.PI / 2 });
      render();
      const topSign = G.ents.find(e => e.sprite === 'sign' && Math.abs(e.x - 28.5) < 0.1);
      check(topSign && topSign._screen, 'the hilltop signpost is drawn');
      check(topSign._screen.y1 < 180, 'a sprite on the hill stands on the hill, not on the meadow below');
      // --- the cliff is drawn from the height field, not from a decal -----
      loadMap('clearing', { x: 20.4, y: 19.5, dir: 0 });
      G.fadeT = 0;   // the load fade would paint the frame black
      const snapFrame = () => Array.from(Engine.ctx.getImageData(0, 0, 320, 150).data);
      render(); const withHeights = snapFrame();
      const kept = G.map.lvls; G.map.lvls = null; Engine.cam.z = 0.5;
      render(); const flat = snapFrame();
      G.map.lvls = kept;
      let changed = 0;
      for (let i = 0; i < withHeights.length; i += 4) if (withHeights[i] !== flat[i] || withHeights[i + 1] !== flat[i + 1]) changed++;
      check(changed > 4000, 'the cliff face and raised floor are rendered from the height field (changed ' + changed + ')');
      // --- saves carry the standing height -------------------------------
      loadMap('clearing', { x: 28.5, y: 18.5, dir: 0 });
      const hillSave = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(hillSave); G.state = 'play';
      check(Math.abs(G.player.feet - 1.2) < 1e-6 && Math.abs(Engine.cam.z - 2.08) < 1e-6, 'a save on the hill restores you standing on it');
      // --- maps without heights are untouched -----------------------------
      loadMap('oakhaven', { x: 23.5, y: 5.5, dir: Math.PI / 2 });
      check(G.map.lvls === null, 'Oakhaven keeps no height field');
      hold(20);
      check(G.player.feet === 0 && Engine.cam.z === 0.88, 'flat maps keep the standing eye height and walk');
      return { hill: 1.2, steps: [0.3, 0.6, 0.9], fallDamage: 8, changed };
    });
    console.log('PASS walkable elevation: heights, stairs, cliffs, falls, sprites and saves', rules);
    await page.evaluate(() => { loadMap('clearing', { x: 20.4, y: 19.5, dir: 0 }); G.state = 'play'; });
    await page.waitForTimeout(250);
    await page.screenshot({ path: '/tmp/octave-terrain.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { loadMap('clearing', { x: 24.5, y: 19.5, dir: -Math.PI / 2 }); G.state = 'play'; });
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => G.player.feet > 0.5), true, 'compact view also stands on the hill');
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS terrain view at full and compact sizes');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
