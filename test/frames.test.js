// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/path/to/playwright node test/frames.test.js
// Covers js/frames.js: carved-wood frames and brass corners (panels, title, death, ending, HUD bar), blackletter
// headings, the Credits panel, the GFX.carvedFrames switch (off = the original look) and a hostile-save check.
// Set FRAMES_SHOTS to a directory to keep screenshots. Uses the managed preview; writes no player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.FRAMES_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof FRAMES !== 'undefined');
    const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
    const ev = (fn, arg) => page.evaluate(fn, arg);

    // ---- the switch, the class, and the title screen before a game exists
    assert.equal(await ev(() => GFX.carvedFrames), true, 'carved frames default on');
    assert.equal(await ev(() => GFX.FX.includes('carvedFrames')), false, 'the switch is not part of the graphics effects list');
    assert.equal(await ev(() => document.getElementById('game').classList.contains('carved')), true, '#game carries the carved class');
    await page.waitForTimeout(400);
    const title = await ev(() => {
      const h = getComputedStyle(document.querySelector('.title-inner h1')), inner = getComputedStyle(document.querySelector('.title-inner'));
      return { ff: h.fontFamily, bi: inner.borderImageSource.slice(0, 20), bg: inner.backgroundImage.includes('svg+xml') };
    });
    assert.match(title.ff, /^"?UnifrakturMaguntia/, 'title h1 is blackletter');
    assert.match(title.ff, /Cinzel/, 'blackletter has Cinzel as its readable fallback');
    assert.ok(title.bi.startsWith('url('), 'title screen is framed');
    assert.ok(title.bg, 'title screen carries the brass corners');
    assert.equal(await ev(() => document.fonts.check('24px UnifrakturMaguntia', 'Echoes')), true, 'the bundled blackletter loads');
    await shot('title');

    // ---- boot a game
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Frames Tester');
    await shot('create');
    const create = await ev(() => { const p = document.getElementById('create-panel'), s = getComputedStyle(p); return { bi: s.borderImageSource.slice(0, 4), h2: getComputedStyle(p.querySelector('h2')).fontFamily }; });
    assert.equal(create.bi, 'url(', 'creation panel is framed');
    assert.match(create.h2, /UnifrakturMaguntia/, 'creation heading is blackletter');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(800);

    // ---- HUD overlay: only the empty edges change, hit boxes still work
    const hud = await ev(() => {
      const ctx = Engine.ctx, cv = ctx.canvas, s = cv.width / 320;
      const grab = () => ctx.getImageData(0, 150 * s, 320 * s, 50 * s).data;
      if (window.CALENDAR11) CALENDAR11.cfg.events = false;   // Phase 11 writes the date in the clock panel; hold it out of this comparison
      GFX.carvedFrames = true; FRAMES.sync();
      const raw = (FRAMES.rawDrawHUD)();   // bar drawn by the original
      const base = grab();
      GFX.carvedFrames = false; FRAMES.sync();
      drawHUD();
      const off = grab();
      GFX.carvedFrames = true; FRAMES.sync();
      drawHUD();
      const on = grab();
      let offDiff = 0, changed = 0, bad = 0;
      // protected rectangles (logical px): buttons, vitals + narrow bar, status box, compass, text lines
      const prot = HUD_BTNS.map(b => [b.x, b.y, b.w, b.h]).concat([[2, 155, 40, 40], [156, 155, 64, 40], [228, 155, 86, 14]]);
      for (let i = 0; i < base.length; i += 4) {
        if (base[i] !== off[i] || base[i + 1] !== off[i + 1] || base[i + 2] !== off[i + 2]) offDiff++;
        if (base[i] !== on[i] || base[i + 1] !== on[i + 1] || base[i + 2] !== on[i + 2]) {
          changed++;
          const px = (i / 4) % (320 * s) / s, py = 150 + Math.floor((i / 4) / (320 * s)) / s;
          if (prot.some(([x, y, w, h]) => px >= x && px < x + w && py >= y && py < y + h)) bad++;
        }
      }
      return { offDiff, changed, bad, s };
    });
    assert.equal(hud.offDiff, 0, 'switch off: the HUD bar is pixel-identical to the original drawing');
    assert.ok(hud.changed > 300, 'switch on: the bar gets rails and corner plates (' + hud.changed + ' px)');
    assert.equal(hud.bad, 0, 'the overlay never touches a button, vital bar, status box or compass');
    const clicked = await ev(async () => {
      const r = document.getElementById('view').getBoundingClientRect(), b = HUD_BTNS.find(x => x.t === 'INV');
      window.__hudx = [r.left + (b.x + b.w / 2) / 320 * r.width, r.top + (b.y + b.h / 2) / 200 * r.height];
      return window.__hudx;
    });
    await page.mouse.click(clicked[0], clicked[1]);
    await page.waitForTimeout(150);
    assert.equal(await ev(() => G.state === 'panel' && /Inventory/.test(document.getElementById('modal-panel').innerText)), true, 'clicking the INV button still opens the inventory');
    await shot('inventory');

    // ---- panels: frame, brass, blackletter h2 only, body fonts unchanged
    const panel = await ev(() => {
      const p = document.getElementById('modal-panel'), s = getComputedStyle(p);
      const h2 = getComputedStyle(p.querySelector('h2')), h3 = p.querySelector('h3'), btn = p.querySelector('.dfbtn');
      return {
        bi: s.borderImageSource.slice(0, 4), bw: parseFloat(s.borderTopWidth), bgImgs: (s.backgroundImage.match(/url\("data/g) || []).length,
        h2: h2.fontFamily, h3: h3 ? getComputedStyle(h3).fontFamily : '', btn: btn ? getComputedStyle(btn).fontFamily : '', body: getComputedStyle(p.querySelector('p') || p).fontFamily,
        bodySize: getComputedStyle(p.querySelector('p') || p).fontSize
      };
    });
    assert.equal(panel.bi, 'url(', 'modal panel has the wood frame');
    assert.ok(panel.bw >= 5 && panel.bw <= 12, 'frame thickness stays modest (' + panel.bw + 'px)');
    assert.equal(panel.bgImgs, 5, 'four brass corners plus the original texture');
    assert.match(panel.h2, /^"?UnifrakturMaguntia/, 'panel h2 is blackletter');
    assert.ok(!/Unifraktur/.test(panel.h3 + panel.btn + panel.body), 'h3, buttons and body text keep their fonts: ' + panel.h3 + ' | ' + panel.btn + ' | ' + panel.body);
    assert.match(panel.body, /Alegreya/, 'body text stays Alegreya');

    // ---- Options: no extra row; Credits lives in Graphics & access
    const rows = await ev(() => {
      const count = () => document.querySelector('#modal-panel .menu-list').querySelectorAll('button').length;
      G.state = 'panel'; renderMenu(); const on = count();
      GFX.carvedFrames = false; renderMenu(); const off = count();
      GFX.carvedFrames = true; return { on, off };
    });
    assert.equal(rows.on, rows.off, 'Options has the same buttons with frames on or off');
    const fits = await ev(() => { renderMenu(); const p = document.getElementById('modal-panel'); return p.scrollWidth <= p.clientWidth + 1; });
    assert.equal(fits, true, 'Options panel has no horizontal overflow');
    await ev(() => document.getElementById('mn-gfx').click());
    assert.equal(await page.locator('#fr-credits').count(), 1, 'Graphics & access has a Credits button');
    await ev(() => document.getElementById('fr-credits').click());
    const credits = await ev(() => { const p = document.getElementById('modal-panel'); return { text: p.innerText, open: G.openPanel, fit: p.scrollWidth <= p.clientWidth + 1 }; });
    for (const word of ['Cinzel', 'Alegreya', 'Alegreya SC', 'UnifrakturMaguntia', 'SIL Open Font License']) assert.ok(credits.text.includes(word), 'credits name ' + word);
    assert.equal(credits.open, 'credits'); assert.ok(credits.fit, 'credits panel has no horizontal overflow');
    await shot('credits');
    await ev(() => document.getElementById('fr-back').click());
    assert.equal(await ev(() => G.openPanel), 'controls', 'Back returns to Graphics & access');
    // keyboard: the Credits button is a real button, focusable
    assert.equal(await ev(() => { const b = document.getElementById('fr-credits'); b.focus(); return document.activeElement === b; }), true, 'Credits button takes keyboard focus');

    // ---- event, death and ending screens
    await ev(() => { closeModal(); showEvent('A Door in the Rain', 'The latch is cold.', [{ t: 'Knock' }, { t: 'Leave' }]); });
    const evt = await ev(() => ({ bi: getComputedStyle(document.getElementById('event-panel')).borderImageSource.slice(0, 4), ff: getComputedStyle(document.querySelector('#event-panel h2')).fontFamily }));
    assert.equal(evt.bi, 'url(', 'event panel is framed'); assert.match(evt.ff, /Unifraktur/, 'event heading is blackletter');
    await shot('event');
    await ev(() => { hide('#event'); G.state = 'panel'; show('#death'); });
    const death = await ev(() => ({ bi: getComputedStyle(document.querySelector('.death-inner')).borderImageSource.slice(0, 4), ff: getComputedStyle(document.querySelector('.death-inner h2')).fontFamily }));
    assert.equal(death.bi, 'url(', 'death screen is framed'); assert.match(death.ff, /Unifraktur/, 'death title is blackletter');
    await shot('death');
    await ev(() => { hide('#death'); show('#ending'); });
    const end = await ev(() => ({ bi: getComputedStyle(document.querySelector('.ending-inner')).borderImageSource.slice(0, 4), ff: getComputedStyle(document.querySelector('.ending-inner h2')).fontFamily }));
    assert.equal(end.bi, 'url(', 'ending screen is framed'); assert.match(end.ff, /Unifraktur/, 'ending title is blackletter');
    await shot('ending');

    // ---- contrast: body text against its background, frames off then on
    const contrast = await ev(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const out = {};
      for (const on of [false, true]) {
        GFX.carvedFrames = on; FRAMES.sync();
        G.state = 'panel'; renderInventory();
        const p = document.getElementById('modal-panel'), col = getComputedStyle(p).color;
        // lightest pixel of the panel texture is #2c2219; the panel colour is its base: take the lighter, the worst case
        const worst = ratio(col, 'rgb(44, 34, 25)');
        show('#death'); const d = document.querySelector('.death-inner'), dcol = getComputedStyle(d.querySelector('p')).color;
        const dbg = on ? 'rgb(26, 18, 16)' : 'rgb(42, 10, 8)'; hide('#death');
        out[on ? 'on' : 'off'] = { panel: +worst.toFixed(2), death: +ratio(dcol, dbg).toFixed(2) };
        closeModal();
      }
      GFX.carvedFrames = true; FRAMES.sync();
      return out;
    });
    console.log('contrast (body text vs worst-case background)', JSON.stringify(contrast));
    assert.ok(contrast.on.panel >= contrast.off.panel, 'panel text contrast is at least as high with frames on');
    assert.ok(contrast.on.death >= contrast.off.death, 'death text contrast is at least as high with frames on');

    // ---- switch off = original look
    const off = await ev(() => {
      GFX.carvedFrames = false; GFX.changed();
      G.state = 'panel'; renderInventory();
      const p = document.getElementById('modal-panel'), s = getComputedStyle(p);
      const r = {
        cls: document.getElementById('game').classList.contains('carved'), bi: s.borderImageSource, bw: s.borderTopWidth,
        h2: getComputedStyle(p.querySelector('h2')).fontFamily, bg: (s.backgroundImage.match(/url\("data/g) || []).length
      };
      renderMenu(); document.getElementById('mn-gfx').click();
      r.credits = !!document.getElementById('fr-credits');
      show('#ending'); r.endBi = getComputedStyle(document.querySelector('.ending-inner')).borderImageSource; hide('#ending');
      closeModal(); G.state = 'play';
      return r;
    });
    assert.equal(off.cls, false, 'no carved class when off');
    assert.equal(off.bi, 'none', 'no border image when off'); assert.equal(off.bw, '3px', 'original 3px border when off');
    assert.match(off.h2, /^Cinzel/, 'headings return to Cinzel when off'); assert.equal(off.bg, 1, 'original single texture when off');
    assert.equal(off.credits, false, 'no Credits row when off'); assert.equal(off.endBi, 'none', 'ending is unframed when off');
    await ev(() => { GFX.carvedFrames = true; GFX.changed(); });
    assert.equal(await ev(() => document.getElementById('game').classList.contains('carved')), true, 'switching back on restores the class');

    // ---- GFX.plain() and the presets leave the switch alone
    assert.equal(await ev(() => { GFX.plain(); return GFX.carvedFrames; }), true, 'GFX.plain() does not switch interface art off');

    // ---- compact 640x400: framed panels fit, no horizontal overflow
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(150);
    const compact = await ev(() => {
      const g = document.getElementById('game').getBoundingClientRect(), out = [];
      const check = (name) => {
        const p = document.getElementById('modal-panel'), r = p.getBoundingClientRect();
        out.push([name, p.scrollWidth <= p.clientWidth + 1, r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1]);
      };
      G.state = 'panel';
      renderInventory(); check('inventory'); renderCharacter(); check('character'); renderLog(); check('log'); renderMenu(); check('options');
      document.getElementById('mn-gfx').click(); check('access'); document.getElementById('fr-credits').click(); check('credits');
      closeModal();
      showEvent('A Door in the Rain', 'The latch is cold. '.repeat(10), [{ t: 'Knock' }, { t: 'Leave' }]);
      const e = document.getElementById('event-panel'), er = e.getBoundingClientRect();
      out.push(['event', e.scrollWidth <= e.clientWidth + 1, er.top >= g.top - 1 && er.bottom <= g.bottom + 1]);
      hide('#event'); show('#death'); const d = document.querySelector('.death-inner').getBoundingClientRect();
      out.push(['death', true, d.top >= g.top && d.bottom <= g.bottom && d.left >= g.left && d.right <= g.right]); hide('#death');
      G.state = 'play';
      return out;
    });
    for (const [name, noOverflow, inside] of compact) { assert.ok(noOverflow, 'compact ' + name + ' has no horizontal overflow'); assert.ok(inside, 'compact ' + name + ' stays inside the game'); }
    await ev(() => { G.state = 'panel'; renderMenu(); document.getElementById('mn-gfx').click(); document.getElementById('fr-credits').click(); });
    await shot('credits-compact');
    await ev(() => { closeModal(); G.state = 'play'; });
    await page.setViewportSize({ width: 1280, height: 800 });

    // ---- hostile save: nothing frames shows comes from a save, and a hostile name stays inert text
    const hostile = await ev(() => {
      window.__pwn = 0;
      G.player.name = '<img src=x onerror="window.__pwn=1">';
      // the game's own menus interpolate the name (security.test.js covers how names are cleaned); only frames' output is judged here
      G.state = 'panel'; closeModal(); FRAMES.renderCredits();
      const p = document.getElementById('modal-panel');
      return { img: !!p.querySelector('img[onerror]'), html: /onerror/.test(p.innerHTML), pwn: window.__pwn };
    });
    await page.waitForTimeout(200);
    assert.equal(hostile.img || hostile.html, false, 'credits panel contains no save-derived markup');
    assert.equal(await ev(() => window.__pwn), 0, 'hostile player name executed nothing');

    // ---- determinism: art is cached, not regenerated
    assert.equal(await ev(() => FRAMES.frameDataUrl() === FRAMES.frameDataUrl() && FRAMES.hudOverlay() === FRAMES.hudOverlay()), true, 'frame art is cached');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS frames');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL frames:', e.message); process.exit(1); });
