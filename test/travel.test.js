// PLAYWRIGHT_MODULE=/path/to/playwright node test/travel.test.js
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
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Stable Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);
    await page.evaluate(() => { G.state = 'panel'; window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(80);
    const rules = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      window.travelBase = JSON.parse(JSON.stringify(snapshotGame()));
      window.resetTravel = () => {
        restoreGame(JSON.parse(JSON.stringify(travelBase))); G.state = 'play';
        Weather.hold('clear');   // road maths is measured in still air; weather has its own suite
        G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {};
      };
      // --- stable placement and world interaction
      resetTravel();
      const stall = G.ents.find(e => e.use === 'stable');
      check(!!stall, 'the oakhaven stable marker exists');
      check(!G.map.isBlocked(stall.x | 0, stall.y | 0), 'the stable does not block its cell');
      check(!stall.solid, 'the stable sign is walk-through');
      Object.assign(Engine.cam, { x: stall.x - 1, y: stall.y, dir: 0 }); render(); interact();
      check(G.openPanel === 'stable', 'facing the sign opens the stable');
      check(document.querySelector('#stable-rent') && document.querySelector('#stable-return') && document.querySelector('#stable-leave'), 'stable panel has all three actions');
      document.querySelector('#stable-leave').click();
      check(!G.openPanel && G.state === 'play', 'leaving the stable returns to play');
      // --- hire cost, term and the empty purse
      resetTravel(); G.player.gold = 100; openStable();
      document.querySelector('#stable-rent').click();
      check(G.player.gold === 75, 'hire takes 25 sovereigns');
      check(horseActive(), 'hire activates the horse');
      check(Math.abs(horseHoursLeft() - HORSE.hours) < 1e-6, 'hire term is one day');
      resetTravel(); G.player.gold = 4; openStable();
      check(document.querySelector('#stable-rent').disabled, 'an empty purse cannot hire');
      check(document.querySelector('#stable-return').disabled, 'nothing to return when unhorsed');
      document.querySelector('#stable-leave').click();
      // --- road time: a third less, then back to foot pace
      resetTravel(); TRAVEL.region = 'reach'; TRAVEL.pace = 'cautious'; TRAVEL.here = [0.2, 0.2];
      const dest = { fx: 0.8, fy: 0.8, map: 'oakhaven' };
      const footMins = travelMinutes(dest);
      G.player.horseUntil = horseClock() + 24;
      const horseMins = travelMinutes(dest);
      check(horseMins < footMins, 'horse shortens the journey');
      check(Math.abs(horseMins / footMins - HORSE.speed) < 0.03, 'horse is about 35% faster: ' + horseMins + '/' + footMins);
      G.player.horseUntil = 0;
      check(travelMinutes(dest) === footMins, 'returning to foot restores the old pace');
      // --- an actual journey: hours pass, the horse carries the fatigue
      resetTravel(); const p = G.player; p.fat = p.fatMax;
      TRAVEL.region = 'reach'; TRAVEL.pace = 'reckless';
      const ride = travelDestinations('reach').find(d => d.map === 'oakhaven' && d.spawn);
      check(!!ride && ride.state === 'ok', 'the gate square is a known destination');
      p.horseUntil = horseClock() + 24;
      const roll = Math.random; Math.random = () => 0.99;
      const clock0 = horseClock(), mins = travelMinutes(ride);
      travelGo(ride); Math.random = roll;
      check(G.mapId === 'oakhaven' && G.state !== 'panel', 'the journey arrives');
      check(Math.abs(p.fat - (p.fatMax - p.fatMax * 0.08)) < 1e-6, 'a horse halves reckless fatigue');
      check(Math.abs(horseClock() - clock0 - mins / 60) < 1e-6, 'the quoted hours pass on the road');
      // --- returning early refunds part of the hire
      resetTravel(); G.player.gold = 100; openStable();
      document.querySelector('#stable-rent').click();
      openStable(); document.querySelector('#stable-return').click();
      check(G.player.gold === 85 && !horseActive() && G.player.horseUntil === 0, 'returning refunds 10 and clears the hire');
      // --- the term lapses on the world clock
      resetTravel(); G.player.gold = 100; G.player.horseUntil = horseClock() + 1; G.day += 2;
      check(!horseActive(), 'the hire lapses after its day');
      openStable();
      check(!/Hired/.test(document.querySelector('.horse-study').textContent), 'a lapsed hire shows as on foot');
      check(!document.querySelector('#stable-rent').disabled, 'a lapsed hire can be renewed');
      document.querySelector('#stable-leave').click();
      // --- saves: the term persists, hostile terms clamp, old saves are on foot
      resetTravel(); G.player.gold = 100; openStable(); document.querySelector('#stable-rent').click();
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'play';
      check(horseActive() && horseHoursLeft() > 23, 'the hire survives save/load');
      const evil = JSON.parse(JSON.stringify(snapshotGame())); evil.player.horseUntil = 1e9; restoreGame(evil); G.state = 'play';
      check(G.player.horseUntil <= horseClock() + 48 + 1e-6, 'imported hire term clamps to two days');
      const old = JSON.parse(JSON.stringify(snapshotGame())); delete old.player.horseUntil; restoreGame(old); G.state = 'play';
      check(G.player.horseUntil === 0 && !horseActive(), 'old saves start on foot');
      // --- stale panel callbacks cannot double-charge
      resetTravel(); G.player.gold = 100; openStable();
      const staleHire = document.querySelector('#stable-rent').onclick;
      document.querySelector('#stable-leave').click(); staleHire();
      check(G.player.gold === 100 && !horseActive(), 'a stale hire callback is inert');
      return { stall: [stall.x, stall.y], footMins, horseMins, cost: HORSE.cost };
    });
    console.log('PASS stable, hire term, road speed, fatigue, refund, lapse and saves', rules);

    // Keyboard 1/2, touch taps, simulated controller A/X and compact layout.
    await page.evaluate(() => { resetTravel(); G.player.gold = 100; openStable(); });
    await page.keyboard.press('1');
    assert.equal(await page.evaluate(() => horseActive() && G.player.gold === 75 && !G.openPanel), true);
    await page.evaluate(() => { openStable(); });
    await page.keyboard.press('2');
    assert.equal(await page.evaluate(() => !horseActive() && G.player.gold === 85), true);
    await page.evaluate(() => { openStable(); });
    await page.locator('#stable-rent').tap();
    assert.equal(await page.evaluate(() => horseActive() && G.player.gold === 60), true);
    await page.evaluate(() => { resetTravel(); G.player.gold = 100; openStable(); });
    await page.screenshot({ path: '/tmp/octave-stable-panel.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    assert.equal(await page.locator('#stable-rent').evaluate(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      resetTravel(); G.player.gold = 100; openStable();
      const pads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp];
      const press = i => { gp.buttons.forEach(b => { b.pressed = false; }); controlsTick(); gp.buttons[i].pressed = true; controlsTick(); };
      try {
        press(0); if (!horseActive() || G.player.gold !== 75) throw new Error('controller A does not hire');
        openStable(); press(2); if (horseActive() || G.player.gold !== 85) throw new Error('controller X does not return the horse');
        openStable(); press(1); if (horseActive() || G.player.gold !== 85 || G.openPanel) throw new Error('controller B does not leave');
      } finally { navigator.getGamepads = pads; controlsTick(); }
    });
    await page.evaluate(() => { resetTravel(); travelOpen(); });
    assert.equal(await page.evaluate(() => G.openPanel === 'travel'), true);
    await page.evaluate(() => { G.player.horseUntil = horseClock() + 12; travelRender(); });
    assert.equal(await page.locator('.tv-horse').count(), 1);
    await page.evaluate(() => travelClose());
    console.log('PASS stable keyboard, touch, simulated controller, travel panel and compact layout');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
