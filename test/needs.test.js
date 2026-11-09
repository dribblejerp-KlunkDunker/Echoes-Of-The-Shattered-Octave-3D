// PLAYWRIGHT_MODULE=/path/to/playwright node test/needs.test.js
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
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Needs Tester');
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
      window.needsBase = JSON.parse(JSON.stringify(snapshotGame()));
      window.resetNeeds = () => {
        restoreGame(JSON.parse(JSON.stringify(needsBase))); G.state = 'play';
        Weather.hold('clear');   // hunger maths is measured in still air; weather has its own suite
        G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {}; $('#msgs').innerHTML = '';
      };
      // --- off by default, and off means nothing drains
      resetNeeds(); const p = G.player;
      check(p.needs === false && p.hunger === 100 && p.sleep === 100, 'new travellers start with needs off and full');
      passHours(12);
      check(p.hunger === 100 && p.sleep === 100, 'needs off: the road costs nothing');
      // --- opt in through the options panel
      G.state = 'panel'; renderMenu();
      const toggle = document.querySelector('#mn-needs');
      check(/Off/.test(toggle.textContent), 'options offer the needs toggle, off by default');
      toggle.click();
      check(p.needs === true && p.hunger === 100 && p.sleep === 100, 'enabling needs starts fed and rested');
      check(/On/.test(document.querySelector('#mn-needs').textContent), 'the toggle reads On once enabled');
      $('#mn-back').click();
      // --- drain on foot and on horseback
      passHours(10);
      check(Math.abs(p.hunger - 80) < 1e-6 && Math.abs(p.sleep - 86) < 1e-6, 'ten hours drain hunger and sleep');
      p.horseUntil = horseClock() + 24; passHours(10);
      check(Math.abs(p.hunger - 70) < 1e-6 && Math.abs(p.sleep - 72) < 1e-6, 'a horse halves the hunger a journey costs');
      // --- hunger warning halves recovery
      resetNeeds(); const q = G.player; q.needs = true;
      q.hunger = 25; q.sleep = 100; $('#msgs').innerHTML = '';
      passHours(3);
      check(q.hunger < 20 && needsWarned() && needsRecovery() === 0.5, 'hunger below 20 warns and halves recovery');
      check(/hungry/i.test(document.querySelector('#msgs').textContent), 'the warning is written on screen');
      // --- an empty belly caps what rest and riding can give back
      resetNeeds(); const r = G.player; r.needs = true; r.hunger = 0; r.sleep = 40;
      r.hp = r.hpMax * 0.5; r.voice = r.voiceMax * 0.5; r.fat = 0;
      check(fatCap() === r.fatMax * 0.5, 'a famished traveller caps at half fatigue');
      doRest('lamp');
      check(Math.abs(r.fat - r.fatMax * 0.5) < 1e-6, 'rest cannot exceed the famished cap');
      check(Math.abs(r.hp - r.hpMax * 0.75) < 1e-6, 'hunger halves what rest heals');
      check(r.sleep === 100 && r.hunger > 0, 'rest restores sleep and a little food');
      // --- a meal feeds you
      r.hunger = 10; G.give('honey'); const slot = r.inv.find(s => s.id === 'honey');
      useItem(slot);
      check(Math.abs(r.hunger - 45) < 1e-6, 'honey restores 35 hunger');
      // --- the character sheet and journey panel say so
      r.hunger = 80; r.sleep = 60; renderCharacter();
      const sheet = document.querySelector('#modal-panel').innerText;
      check(/Hunger 80\/100/.test(sheet) && /Sleep 60\/100/.test(sheet), 'the character sheet shows hunger and sleep');
      closeModal(); G.state = 'play';
      TRAVEL.region = 'reach'; TRAVEL.pace = 'cautious'; TRAVEL.here = [0.2, 0.2];
      const dest = { name: 'The gate square', map: 'oakhaven', x: 23.5, y: 5.5, dir: 0, fx: 0.4, fy: 0.6, state: 'ok' };
      travelConfirm(dest);
      check(/Hunger 80\/100/.test(document.querySelector('#modal-panel').innerText), 'the journey panel shows the current needs');
      closeModal(); G.state = 'play';
      // --- saves: values persist, hostile values clamp, old saves stay off
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'play';
      check(G.player.needs === true && G.player.hunger === 80 && G.player.sleep === 60, 'needs survive save/load');
      const evil = JSON.parse(JSON.stringify(snapshotGame()));
      evil.player.needs = 'yes'; evil.player.hunger = 1e9; evil.player.sleep = -5;
      restoreGame(evil); G.state = 'play';
      check(G.player.needs === false && G.player.hunger === 100 && G.player.sleep === 0, 'hostile needs values clamp and non-booleans stay off');
      const old = JSON.parse(JSON.stringify(snapshotGame()));
      delete old.player.needs; delete old.player.hunger; delete old.player.sleep;
      restoreGame(old); G.state = 'play';
      check(G.player.needs === false && G.player.hunger === 100 && G.player.sleep === 100, 'old saves start fed, rested and off');
      // --- switching it off really switches it off
      resetNeeds(); G.player.needs = true; G.player.hunger = 50;
      G.state = 'panel'; renderMenu(); document.querySelector('#mn-needs').click(); $('#mn-back').click();
      check(G.player.needs === false, 'the toggle turns needs off');
      passHours(10);
      check(G.player.hunger === 50, 'needs off again: time costs nothing');
      return { off: true, footHunger: 80, horseHunger: 70, honey: 45 };
    });
    console.log('PASS journey needs: opt-in, drain, warnings, fatigue caps, rest, food and saves', rules);
    await page.evaluate(() => { resetNeeds(); G.player.needs = true; G.player.hunger = 18; G.player.sleep = 15; renderCharacter(); });
    await page.screenshot({ path: '/tmp/octave-needs-sheet.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { closeModal(); G.state = 'play'; renderMenu(); });
    await page.screenshot({ path: '/tmp/octave-needs-menu.png' });
    console.log('PASS needs sheet, options toggle and compact layout');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
