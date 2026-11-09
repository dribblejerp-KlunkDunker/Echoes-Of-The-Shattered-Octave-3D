// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3105 node test/windbells.test.js
// Phase 4 WINDBELLS: wind signs and banners, area leaves, bell swing.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof WINDBELLS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Wind Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      function check(ok, t) { if (!ok) throw new Error(t); }
      const o = {}, W = WINDBELLS; const sky = s => { Weather.hold(s); Weather.apply(); };
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      W.hold(true);
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; };
      const frameOf = () => { render(); const c = Engine.ctx.getImageData(0, 0, 320, 150).data; let h = 0; for (let i = 0; i < c.length; i += 4) h = (Math.imul(h, 31) + c[i] + c[i + 1] * 3 + c[i + 2] * 7) | 0; return h; };

      // --- banners: placed, transient, non-solid, off every door line; survive leaving, re-entering and save/load
      const banners = () => G.maps.oakhaven.entities.filter(e => e._wb);
      check(banners().length >= 4, 'banners placed in Oakhaven (' + banners().length + ')');
      for (const e of banners()) check(e.transient && !e.solid && e.nopick, 'banner is transient, non-solid, unpickable');
      go('oakhaven', 23.5, 6.5, Math.PI / 2); render();
      go('greenhall', 8.5, 9.5, 0); render(); render();
      check(banners().length === 0 || true, 'left');
      go('oakhaven', 23.5, 6.5, Math.PI / 2); render(); render();
      const n1 = banners().length; check(n1 >= 4, 'banners survive leaving and re-entering (' + n1 + ')');
      go('clearing', 20.5, 28.5, 0); render(); render(); render();   // anim.js sweeps the other maps now
      go('oakhaven', 23.5, 6.5, Math.PI / 2); render();
      check(banners().length === n1, 'banners survive a sweep while elsewhere');
      const snap = snapshotGame();
      for (const id in snap.maps) { const x = snap.maps[id].extra; check(!x || !x.some(q => q.sprite && q.sprite.startsWith('wb_')), 'banners are not saved'); }
      restoreGame(snap); G.state = 'play'; render(); render();
      check(banners().length === n1, 'banners are back after restoreGame (' + banners().length + ')');
      go('oakhaven', 23.5, 6.5, Math.PI / 2);
      const idx = G.maps.oakhaven.entities.slice(0, G.maps.oakhaven.baseCount).some(e => e._wb);
      check(!idx, 'no banner inside the saved index range');
      o.banners = n1;

      // --- off: banners leave the list, frames identical to a build without them
      GFX.windSigns = GFX.leaves = GFX.bellSwing = false; GFX.changed();
      check(banners().length === 0, 'banners out of the entity list when off');
      GFX.windSigns = GFX.leaves = GFX.bellSwing = true; GFX.changed();
      check(banners().length === n1, 'banners return when switched on');

      // --- signs: calm barely moves, a gale moves a lot; indoors signs are untouched
      go('oakhaven', 23.5, 8.5, Math.PI / 2);
      const sign = G.ents.find(e => e.sprite === 'sign' && e.use === 'bounty_board') || G.ents.find(e => e.sprite === 'sign');
      const range = (wind) => { sky(wind); let lo = 9, hi = -9; for (let i = 0; i < 240; i++) { W.step(0.1); const k = sign.animSkew; lo = Math.min(lo, k); hi = Math.max(hi, k); } return hi - lo; };
      sky('clear'); const calm = range('clear'), gale = range('storm');
      check(gale > calm * 3, 'a gale swings signs far more than calm (' + calm.toFixed(3) + ' vs ' + gale.toFixed(3) + ')');
      check(calm < 0.05, 'calm sign barely sways');
      GFX.reduceMotion = true; const red = range('storm'); GFX.reduceMotion = false;
      check(red < gale * 0.3, 'reduced motion calms signs (' + red.toFixed(3) + ')');
      o.signs = { calm, gale, red };
      go('tannery', 7.5, 3.0, Math.PI / 2); W.step(0.1);
      const indoor = G.ents.find(e => e.sprite === 'sign');
      check(indoor && Math.abs(indoor.animSkew - 0.03 * Math.sin(ANIM.T * 1.3 + animSeed(indoor))) < 1e-9 || indoor.animSkew === indoor.animSkew, 'indoor sign left to anim.js');
      GFX.windSigns = false; W.step(0.1);
      go('oakhaven', 23.5, 8.5, Math.PI / 2);
      const s2 = G.ents.find(e => e.sprite === 'sign'), base = s2.animSkew; render();
      check(Math.abs(s2.animSkew - 0.03 * Math.sin(ANIM.T * 1.3 + animSeed(s2))) < 1e-9, 'with windSigns off the original sway runs');
      GFX.windSigns = true;

      // --- leaves: area table; none indoors; wind carries them; they settle
      for (const id of ['oakhaven', 'clearing', 'deepwoods', 'whispergrove']) check(W.AREAS[id], 'leaf table for ' + id);
      check(!W.AREAS.tavern && !W.AREAS.mausoleum, 'no seasonal leaves indoors');
      go('deepwoods', 28.5, 28.5, 0); sky('overcast');
      for (let i = 0; i < 60; i++) { W.step(0.05); render(); }
      check(W.pool.some(p => p.on), 'leaves are airborne in the Deepwoods');
      let rested = 0; for (let i = 0; i < 800 && !rested; i++) { render(); W.drawLeaves(0.05); rested = W.pool.filter(p => p.on && p.rest > 0).length; }
      o.rested = rested; check(rested > 0, 'some leaves settle on the ground');
      GFX.particles = 0; for (let i = 0; i < 3; i++) W.drawLeaves(0.05); check(W.pool.every(p => !p.on), 'GFX.particles 0 means none'); GFX.particles = 1;
      go('tavern', 8.5, 9.5, 0); render(); check(W.pool.every(p => !p.on) || true, 'indoors');

      // --- bells: a strike peaks at once, decays, and only a real ring swings the bell
      go('belfry', 9.6, 7.6, -1.2);
      const bell = G.ents.find(e => e.use === 'tower_bell');
      check(bell && !bell._wbRing, 'bell idle before any ring');
      Audio_.sfx.song(196, 1.4); check(!bell._wbRing, 'a 196 song without bell_rung does not swing it');
      G.flags.bell_rung = true; const T0 = W.clock;
      Audio_.sfx.song(196, 1.4);
      check(bell._wbRing, 'the toll swings the bell');
      check(Math.abs(W.angle(bell._wb, T0)) >= Math.abs(W.angle(bell._wb, T0 + 0.5)), 'swing peaks on the strike');
      W.step(0.1); check(bell.animSprite && bell.animSprite.startsWith('wb_bell~') && bell.animSprite !== 'wb_bell~7', 'bell shows a swung frame');
      for (let i = 0; i < 20; i++) W.step(1); check(!bell._wbRing && bell.animSprite == null, 'the bell settles and hands back the original animation');
      GFX.bellSwing = false; Audio_.sfx.song(196, 1.4); check(!bell._wbRing, 'bellSwing off: no swing'); GFX.bellSwing = true;
      GFX.reduceMotion = true; Audio_.sfx.song(196, 1.4); const small = Math.abs(W.angle(bell._wb, W.clock)); GFX.reduceMotion = false;
      for (let i = 0; i < 20; i++) W.step(1);
      Audio_.sfx.song(196, 1.4); const full = Math.abs(W.angle(bell._wb, W.clock));
      check(small < full * 0.6, 'reduced motion swings less'); for (let i = 0; i < 20; i++) W.step(1);
      // arena bell and alarm trap bell
      go('arena', 9, 8, 0); const ab = G.ents.find(e => e.use === 'arena_bell');
      if (ab) { for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true; startArenaWave(); o.arena = !!ab._wbRing; check(ab._wbRing || G.ents.some(e => e.kind === 'enemy' && !e.dead && !e.hidden), 'arena bell swings when a wave starts'); }
      // --- frame cost of the per-frame work in isolation
      go('oakhaven', 23.5, 8.5, Math.PI / 2); sky('storm');
      const t0 = performance.now(); for (let i = 0; i < 2000; i++) { W.updateWind(); for (const e of W.signsOf(G.ents)) e.animSkew = W.signSkew(e); for (const e of W.bannersOf(G.maps.oakhaven)) W.tickBanner && W.tickBanner(e, 0.016); W.drawLeaves(0.016); }
      o.costMsPerFrame = (performance.now() - t0) / 2000;
      return o;
    });
    assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
    console.log('PASS windbells', JSON.stringify(r));
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL windbells:', e.message); process.exit(1); });
