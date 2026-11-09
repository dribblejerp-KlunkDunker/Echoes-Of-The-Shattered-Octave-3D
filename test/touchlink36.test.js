// PREVIEW_URL=http://127.0.0.1:4110 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/touchlink36.test.js
// Phase 36: the phone link. ?touch=1 (the README's "Play on your phone" button and QR code), or a finger-first device,
// starts the touch controls from the first frame; a phone held upright is told to turn sideways.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { hash, norm } = require('../tools/i18n/lib');
const ROOT = path.join(__dirname, '..');
const URL0 = (process.env.PREVIEW_URL || 'http://127.0.0.1:4110').replace(/\/$/, '');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };
const ready = (page) => page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'), null, { timeout: 60000 });
// how: 'click' (a real mouse), 'tap' (a finger) or 'dom' (element clicks that move no pointer at all)
async function startGame(page, how) {
  const press = (loc) => (how === 'tap' ? loc.tap() : how === 'dom' ? loc.dispatchEvent('click') : loc.click());
  const hit = (sel) => press(page.locator(sel).first());
  await hit('#btn-new'); await page.locator('#cname').fill('Thumb Tester'); await hit('#c-next');
  await hit('.classlist button'); await hit('#c-next'); await hit('#c-next');
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const c = page.locator('#create-panel .list button').first();
    if (await c.count()) await press(c);
    else await press(page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first());
  }
  await hit('#c-go'); await hit('#btn-intro-skip');
  await page.waitForFunction(() => G.state === 'play');
  await page.waitForTimeout(400);
}
const state = (page) => page.evaluate(() => ({
  touch: G.touchMode, ui: document.querySelector('#touchui').classList.contains('on'),
  rotate: getComputedStyle(document.querySelector('#rotate-hint')).display,
  mouseLine: Array.from(document.querySelectorAll('#msgs *')).some((n) => /capture the mouse/.test(n.textContent)),
}));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    // ---- the link parser
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL0 + '/'); await ready(page);
      const p = await page.evaluate(() => ['?touch', '?touch=1', '?mobile', '?x=2&touch=on', '?touch=0', '?touch=off', '?retouch=1', '', '?nosw&mobile=yes'].map((s) => TOUCHLINK36.fromLink(s)));
      check(JSON.stringify(p) === JSON.stringify([true, true, true, true, false, false, false, false, true]), 'the link reads ?touch, ?touch=1, ?mobile and ?touch=on; ?touch=0 and off do nothing (' + p.join(',') + ')');
      const s = await state(page);
      check(!s.touch && s.rotate === 'none', 'a desktop with a mouse and the plain link starts in mouse mode, with no rotate hint');
      await startGame(page, 'click');
      const s2 = await state(page);
      check(!s2.touch && !s2.ui, 'on the desktop the game plays with the mouse, as before');
      await ctx.close();
    }
    // ---- ?touch=1 on a desktop browser: touch from the first frame, and a real mouse still hands control back
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL0 + '/?touch=1'); await ready(page);
      check((await state(page)).touch, '?touch=1 switches touch mode on at the title screen');
      check(!(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)), '(this browser has a mouse as its main pointer, so it is the link that did it)');
      await startGame(page, 'dom');
      const s = await state(page);
      check(s.touch && s.ui && !s.mouseLine, 'the thumb stick and buttons are there when play begins, and the "capture the mouse" line is not shown');
      await page.mouse.move(400, 300); await page.mouse.move(600, 420, { steps: 4 }); await page.waitForTimeout(100);
      check(!(await state(page)).touch, 'with Touch controls on Auto, a real mouse moving hands control back');
      await ctx.close();
    }
    // ---- ?touch=0 does nothing
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL0 + '/?touch=0'); await ready(page);
      check(!(await state(page)).touch, '?touch=0 leaves a desktop in mouse mode');
      await ctx.close();
    }
    // ---- a phone with the plain link: touch from the first tap of play; upright, it is told to turn sideways
    {
      const ctx = await browser.newContext({ ...devices['iPhone 13'] }); const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL0 + '/'); await ready(page);
      const up = await state(page);
      check(up.touch && up.rotate === 'block', 'an upright phone starts in touch mode and shows "Turn your phone sideways"');
      check(await page.evaluate(() => document.querySelector('#rotate-hint').getBoundingClientRect().top > document.querySelector('#game').getBoundingClientRect().bottom), 'the hint sits in the black band under the view, not over it');
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(150);
      check((await state(page)).rotate === 'none', 'turned sideways, the hint goes');
      await startGame(page, 'tap');
      const s = await state(page);
      check(s.touch && s.ui && !s.mouseLine, 'on the phone, play begins with the thumb stick and buttons, and no mouse instructions');
      await ctx.close();
    }
    // ---- French
    {
      const fr = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/story/fr.json'), 'utf8'));
      const en = 'Turn your phone sideways for a bigger view.';
      check(!!fr.s[hash(norm(en))] && /horizontale/.test(fr.s[hash(norm(en))]), 'the rotate hint has its French');
      const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      check(html.includes('<div id="rotate-hint" role="note">' + en + '</div>') && /js\/touchlink36\.js\?v=\d+/.test(html), 'index.html carries the hint and loads js/touchlink36.js');
    }
    check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})();
