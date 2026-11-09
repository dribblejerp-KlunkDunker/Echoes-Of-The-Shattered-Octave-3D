// PLAYWRIGHT_MODULE=/path/to/playwright node test/hardcore.test.js
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
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hardcore Tester');
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
    const rules = await page.evaluate(async () => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      window.hcBase = JSON.parse(JSON.stringify(snapshotGame()));
      window.hcReset = () => {
        restoreGame(JSON.parse(JSON.stringify(hcBase)));
        HARDCORE.save = null; G.player.hardcore = false;
        SLOTS[0] = SLOTS[1] = SLOTS[2] = null; UPG.autosaveSlot = null; UPG.autosaveWhen = '';
        for (const id of ['#btn-auto-load', '#btn-hardcore-title', '#death']) { const el = document.querySelector(id); if (el) { if (id === '#death') el.classList.add('hidden'); else el.remove(); } }
        const wake = document.querySelector('#btn-wake'); if (wake) wake.hidden = false;
        G.dead = false; G.state = 'play'; G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {};
        document.querySelector('#msgs').innerHTML = '';
      };
      const panelText = () => document.querySelector('#modal-panel').innerText;
      const turnOn = () => { hcReset(); G.player.hardcore = false; G.state = 'panel'; renderMenu(); document.querySelector('#mn-hardcore').click(); document.querySelector('#hc-yes').click(); };

      // --- a new run is not hardcore, and says so
      hcReset();
      check(G.player.hardcore === false && hardcoreOn() === false, 'new travellers are not on a hardcore run');
      G.state = 'panel'; renderMenu();
      const toggle = document.querySelector('#mn-hardcore');
      check(/Death is final|death is final/.test(toggle.textContent) && /Off/.test(toggle.textContent) && !toggle.disabled, 'Options offers the hardcore opt-in, off and available');

      // --- opting in is a decision, not a stray click
      toggle.click();
      check(G.openPanel === 'hardcore' && /Make this run hardcore/.test(panelText()), 'the toggle asks before it commits');
      document.querySelector('#hc-no').click();
      check(G.player.hardcore === false && G.openPanel === 'menu', 'declining leaves the run ordinary');
      document.querySelector('#mn-hardcore').click(); document.querySelector('#hc-yes').click();
      check(G.player.hardcore === true && hardcoreOn(), 'confirming makes the run hardcore');
      const on = document.querySelector('#mn-hardcore');
      check(on.disabled && /cannot turn it off/.test(on.textContent), 'a hardcore run cannot switch itself back off');
      check(UPG.autosaveSlot === null, 'opting in clears any pre-boss autosave');
      on.click();
      check(G.player.hardcore === true, 'clicking the closed toggle changes nothing');

      // --- one save, written and overwritten
      renderSave();
      check(G.openPanel === 'save' && !document.querySelector('#savecode'), 'a hardcore save panel offers no save code');
      check(document.querySelectorAll('#modal-panel [data-slot]').length === 0, 'a hardcore run cannot write to session slots');
      const save = document.querySelector('#hc-save');
      check(save && /Save the run/.test(save.textContent), 'the run starts with no save at all');
      const day0 = G.day;
      save.click();
      check(HARDCORE.save && HARDCORE.save.player.hardcore === true && HARDCORE.save.day === day0, 'saving writes the run into its single slot');
      check(/Overwrite/.test(document.querySelector('#hc-save').textContent), 'a second write offers to overwrite');
      G.day = day0 + 3; G.player.gold = 77; renderSave(); document.querySelector('#hc-save').click();
      check(HARDCORE.save.day === day0 + 3 && HARDCORE.save.player.gold === 77, 'overwriting replaces the save instead of adding one');

      // --- the run cannot leave the page, and nothing ordinary can get in
      let codeErr = '';
      try { await encodeSave(snapshotGame()); } catch (e) { codeErr = e.message; }
      check(/hardcore/i.test(codeErr), 'a hardcore run refuses to become a save code');
      let thrown = '';
      try { await saveCode(); } catch (e) { thrown = e.message; }
      check(/hardcore/i.test(thrown), 'the console save-code helper refuses too');
      const smuggled = JSON.parse(JSON.stringify(snapshotGame())); smuggled.player.hardcore = true;
      const smuggledCode = 'OCTJ1.' + b64(new TextEncoder().encode(JSON.stringify(smuggled)));
      let decodeErr = '';
      try { await decodeSave(smuggledCode); } catch (e) { decodeErr = e.message; }
      check(/never travel as codes/i.test(decodeErr), 'a hardcore payload in a code is refused');
      const ordinary = JSON.parse(JSON.stringify(hcBase)); SLOTS[0] = ordinary;
      let mixErr = '';
      try { restoreGame(JSON.parse(JSON.stringify(ordinary))); } catch (e) { mixErr = e.message; }
      check(/does not open ordinary saves/.test(mixErr), 'a hardcore run refuses ordinary saves');
      renderLoad(false);
      check(document.querySelectorAll('#modal-panel [data-slot]').length === 0 && /one save/.test(panelText()), 'the load panel shows only the hardcore save');
      check(document.querySelector('#hc-load') && !document.querySelector('#ld-code'), 'loading a hardcore run offers no code box');
      closeModal();

      // --- and the single save still works
      G.day = day0 + 9; G.player.gold = 3;
      G.state = 'panel'; renderLoad(false); document.querySelector('#hc-load').click();
      check(G.day === day0 + 3 && G.player.gold === 77 && hardcoreOn(), 'the hardcore save loads back into its own run');

      // --- the other direction is refused as well
      G.player.hardcore = false;
      let intoErr = '';
      try { restoreGame(JSON.parse(JSON.stringify(HARDCORE.save))); } catch (e) { intoErr = e.message; }
      check(/only opens inside a hardcore run/.test(intoErr), 'an ordinary run refuses a hardcore save');

      // --- death ends the run and takes the save with it
      turnOn();
      renderSave(); document.querySelector('#hc-save').click();
      check(HARDCORE.save && HARDCORE.save.player.hardcore === true, 'the doomed run has a save to lose');
      UPG.autosaveSlot = JSON.parse(JSON.stringify(HARDCORE.save));
      die('Cacophony hound');
      check(G.dead === true && G.state === 'dead', 'the traveller is dead');
      check(HARDCORE.save === null, 'permadeath destroys the run\u2019s only save');
      check(/Hardcore/.test(document.querySelector('#death-text').textContent), 'the death screen says the run is over');
      check(document.querySelector('#btn-wake').hidden, 'there is no waking by the lamp in hardcore');
      check(!document.querySelector('#btn-auto-load'), 'no pre-boss autosave button appears in hardcore');
      const end = document.querySelector('#btn-hardcore-title');
      check(end && !end.hidden && /run ends here/i.test(end.textContent), 'the screen offers the end of the run instead');
      document.querySelector('#btn-wake').click();
      check(G.dead === true && G.state === 'dead', 'the hidden wake action cannot drag a hardcore traveller back');
      end.click();
      check(G.state === 'title' && G.player.hardcore === false, 'the run ends at the title, with the mark cleared');
      restoreGame(JSON.parse(JSON.stringify(ordinary)));
      check(G.state === 'play' && G.day === ordinary.day, 'ordinary saves are usable again after a hardcore run ends');

      // --- ordinary death still wakes by the lamp
      hcReset(); G.player.hp = 0; die('Cacophony hound');
      const wake = document.querySelector('#btn-wake');
      check(!wake.hidden && (!document.querySelector('#btn-hardcore-title') || document.querySelector('#btn-hardcore-title').hidden), 'an ordinary death still offers the lamp');
      wake.click();
      check(G.state === 'play' && G.dead === false && G.player.hp > 0, 'waking restores the ordinary traveller');

      // --- and the ordinary save panel is untouched (it encodes a code first, so it lands a tick later)
      hcReset(); renderSave(); await new Promise(r => setTimeout(r, 80));
      check(!!document.querySelector('#savecode') && document.querySelectorAll('#modal-panel [data-slot]').length === 3, 'ordinary runs keep codes and three slots');
      closeModal();
      return { savedDay: HARDCORE.save ? HARDCORE.save.day : null, death: 'run ended' };
    });
    console.log('PASS hardcore runs: opt-in, single save, isolation and permadeath', rules);
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { hcReset(); G.player.hardcore = true; HARDCORE.save = snapshotGame(); renderSave(); });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'hardcore save panel has no horizontal overflow');
    await page.evaluate(() => { closeModal(); G.state = 'panel'; renderLoad(false); });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'hardcore load panel has no horizontal overflow');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { closeModal(); G.state = 'panel'; renderMenu(); });
    assert.equal(await page.locator('#modal-panel button:enabled').evaluateAll(buttons => buttons.every(b => {
      const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
    })), true, 'options panel keeps every action on screen');
    console.log('PASS hardcore panels: compact layout and options fit');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
