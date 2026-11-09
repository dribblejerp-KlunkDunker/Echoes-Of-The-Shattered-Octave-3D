// PREVIEW_URL=... node test/guard.test.js — blocking and parrying (js/guard.js): a parry turns a melee blow aside, a block
// halves it (a third with a shield), bolts and traps are never blocked, the guard drops when its timer runs out.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof GUARD !== 'undefined' && G.state === 'title' && Engine.sprites.proctor);
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Guard Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) { const c = page.locator('#create-panel .list button').first(); if (await c.count()) await c.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click(); }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const check = (ok, l) => { if (!ok) throw new Error(l); };
      G.state = 'play'; const p = G.player; p.hpMax = p.hp = 500;
      const hit = (melee, dmg) => { const before = p.hp; GUARD.state.inMelee = melee; damagePlayer(dmg, 'Test foe'); GUARD.state.inMelee = false; return before - p.hp; };
      const reset = () => { UPG.blocking = false; UPG.parryWindow = 0; UPG.parryCool = 0; };
      reset(); check(hit(true, 10) === 10, 'no guard: full damage');
      reset(); triggerBlock(); check(UPG.blocking && UPG.parryWindow > 0, 'F raises the guard');
      check(hit(true, 10) === 0, 'inside the parry window a melee blow is turned aside');
      UPG.parryWindow = 0; const shield = GUARD.shieldWorn();
      const blocked = hit(true, 10); check(blocked === (shield ? 3 : 5), 'after the window a block halves the blow (a third with a shield): ' + blocked);
      reset(); triggerBlock(); check(hit(false, 10) === 10, 'a bolt or trap is never blocked');
      reset(); triggerBlock(); for (let i = 0; i < 40; i++) update(1 / 60); check(!UPG.blocking && UPG.parryCool === 0 && UPG.parryWindow === 0, 'the guard drops when its timer runs out');
      triggerBlock(); check(UPG.blocking, 'and can be raised again');
      return { parried: GUARD.state.parried, blocked: GUARD.state.blocked, shield };
    });
    console.log('PASS guard ' + JSON.stringify(r));
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await b.close(); }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
