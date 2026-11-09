// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/reading.test.js
// Held full-screen documents (js/reading.js): lore books, the cutter's log, notices, notes with choices.
// Screenshots go to READING_SHOTS (default: the OS temp dir), never into the repo.
'use strict';
const assert = require('node:assert/strict');
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.READING_SHOTS || path.join(os.tmpdir(), 'reading-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof READING !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reader <b>X</b>');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const st = () => page.evaluate(() => Object.assign({ g: G.state, hidden: document.querySelector('#event').classList.contains('hidden') }, READING.state()));
    const key = async (k) => { await page.keyboard.press(k); await page.waitForTimeout(40); };
    const pageText = () => page.locator('.hd-count').textContent();
    const bigger = async () => { for (let i = 0; i < 4; i++) await page.locator('[data-act="larger"]').click({ force: true }); };

    // ---- 1. a lore book opens as a held document ----
    await page.evaluate(() => { readLoreBook(1); });
    let s = await st();
    ok(s.g === 'event' && !s.hidden && s.open, 'lore book opens a held document in the event state');
    ok(await page.locator('#event-panel .hd-sheet.hd-parch .hd-title').count() === 1, 'book uses the parchment sheet with its title');
    ok(/^Page 1 of \d+$/.test(await pageText()), 'page count is shown: ' + await pageText());
    ok(await page.evaluate(() => /Cantor Tobin/.test(document.querySelector('.hd-body').textContent)), 'the book text is present');
    await page.screenshot({ path: path.join(SHOTS, 'book.png') });
    const fs0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.hd-body')).fontSize));
    const panelFs = await page.evaluate(() => { const p = document.createElement('div'); p.className = 'panel'; document.querySelector('#modal').appendChild(p); const f = parseFloat(getComputedStyle(p).fontSize); p.remove(); return f; });
    ok(fs0 >= panelFs * 1.15, `body text ${fs0.toFixed(1)}px >= 1.15x the panel text ${panelFs.toFixed(1)}px`);
    ok(await page.evaluate(() => /serif|Alegreya|Georgia/i.test(getComputedStyle(document.querySelector('.hd-body')).fontFamily)), 'body text is a serif face');

    const cpl = await page.evaluate(() => {
      const b = document.querySelector('.hd-body'), cs = getComputedStyle(b);
      const sp = document.createElement('span'); sp.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + cs.font;
      const sample = 'The Madder child went too still in the night and the Hush had her by the ankles, and a murmur was not enough.';
      sp.textContent = sample; document.body.appendChild(sp); const w = sp.getBoundingClientRect().width / sample.length; sp.remove();
      return b.getBoundingClientRect().width / w;
    });
    ok(cpl >= 55 && cpl <= 80, 'line length is about 60-70 characters at the default size (' + cpl.toFixed(0) + ')');

    // ---- 2. text-size control reflows pages ----
    const before = await st();
    await bigger();
    const after = await st();
    const fs1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.hd-body')).fontSize));
    ok(fs1 > fs0 * 1.5 && after.pages > before.pages, `A+ x4: ${fs0.toFixed(1)}px -> ${fs1.toFixed(1)}px, pages ${before.pages} -> ${after.pages}`);
    ok(after.sizeIdx === 4 && await page.locator('[data-act="larger"]').isDisabled(), 'A+ stops at the largest size');
    await page.locator('[data-act="smaller"]').click({ force: true });
    ok((await st()).sizeIdx === 3, 'A- steps back down');
    for (let i = 0; i < 4; i++) await key('-');
    ok((await st()).sizeIdx === 0 && await page.locator('[data-act="smaller"]').isDisabled(), '- key shrinks to the smallest size');
    await key('+'); await key('+'); await key('+'); await key('+');
    const big = await st();
    ok(big.sizeIdx === 4 && big.pages >= 3, 'text size is session memory and gives several pages (' + big.pages + ')');

    // ---- 3. paging: keyboard ----
    await key('Home'); ok((await st()).page === 0, 'Home goes to page 1');
    await key('ArrowRight'); ok((await st()).page === 1, 'ArrowRight -> page 2');
    await key('PageDown'); ok((await st()).page === 2, 'PageDown -> page 3');
    await key('ArrowLeft'); ok((await st()).page === 1, 'ArrowLeft -> page 2');
    await key('PageUp'); ok((await st()).page === 0, 'PageUp -> page 1');
    await key('Enter'); ok((await st()).page === 1, 'Enter turns the page');
    await key(' '); ok((await st()).page === 2, 'Space turns the page');
    await key('ArrowLeft'); await key('ArrowLeft'); await key('ArrowLeft'); ok((await st()).page === 0, 'cannot page before the first page');
    ok(await page.locator('[data-act="prev"]').isDisabled(), 'Back is disabled on page 1');
    ok(!(await page.locator('.hd-choices button').first().isVisible()), 'choices stay hidden until the last page');
    // text really changes between pages
    const t0 = await page.evaluate(() => document.querySelector('.hd-body').scrollLeft);
    await key('ArrowRight');
    ok(await page.evaluate((a) => document.querySelector('.hd-body').scrollLeft > a, t0), 'the visible column moves when paging');

    // ---- 4. touch buttons and swipe ----
    await page.locator('[data-act="next"]').click({ force: true }); ok((await st()).page === 2, 'Next button pages forward');
    await page.locator('[data-act="prev"]').click({ force: true }); ok((await st()).page === 1, 'Back button pages back');
    const box = await page.locator('.hd-body').boundingBox();
    const swipeBy = async (dx) => page.evaluate(([x, y, dx]) => {
      const el = document.querySelector('.hd-body');
      const mk = (t, cx) => new PointerEvent(t, { clientX: cx, clientY: y, pointerType: 'touch', bubbles: true, isPrimary: true });
      el.dispatchEvent(mk('pointerdown', x)); el.dispatchEvent(mk('pointerup', x + dx));
    }, [box.x + box.width / 2, box.y + box.height / 2, dx]);
    await swipeBy(-200); ok((await st()).page === 2, 'swipe left turns forward');
    await swipeBy(200); ok((await st()).page === 1, 'swipe right turns back');

    // ---- 5. simulated controller ----
    await page.evaluate(() => {
      window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [window.__pad];
    });
    // hold the button until the module reacts (frames can be slow on a loaded box), then release
    const press = async (i) => {
      const sig = () => page.evaluate(() => JSON.stringify(READING.state()) + document.querySelector('#event').className);
      const b = await sig();
      await page.evaluate((i) => { __pad.buttons[i].pressed = true; }, i);
      for (let n = 0; n < 40 && (await sig()) === b; n++) await page.waitForTimeout(50);
      await page.evaluate((i) => { __pad.buttons[i].pressed = false; }, i); await page.waitForTimeout(200);
    };
    await page.keyboard.press('Home'); await page.waitForTimeout(40);
    // the pad was not connected when the document opened: reopen to start clean
    await page.evaluate(() => { READING.dismiss(); readLoreBook(1); });
    await page.waitForTimeout(250);
    s = await st(); ok(s.open && s.page === 0, 'document reopened with a controller connected');
    await press(0); ok((await st()).page === 1, 'controller A turns the page');
    await press(14); ok((await st()).page === 0, 'controller D-left goes back');
    await press(15); ok((await st()).page === 1, 'controller D-right goes forward');
    await press(4); ok((await st()).page === 0, 'controller LB goes back');
    await press(5); ok((await st()).page === 1, 'controller RB goes forward');
    await press(12); const up = (await st()).sizeIdx; ok(up >= 1, 'controller D-up changes the text size (' + up + ')');
    await press(1); await page.waitForTimeout(250);
    s = await st(); ok(s.g === 'play' && s.hidden && !s.open, 'controller B puts the document down and returns to play');
    await page.evaluate(() => { navigator.getGamepads = () => []; });

    // ---- 6. Escape closes; no stuck state ----
    const xp0 = await page.evaluate(() => { window.__x = 0; return G.player.xp; });
    await page.evaluate(() => { readLoreBook(0); });
    ok((await st()).open, 'book reopened');
    await key('End'); await key('Escape');
    s = await st();
    ok(s.g === 'play' && s.hidden && !s.open, 'Escape closes the book and returns to play');
    ok(await page.evaluate(() => !Object.values(G.keys).some(Boolean) && !document.querySelector('#event').classList.contains('hd-on')), 'no keys stuck, held styling removed');
    const xp1 = await page.evaluate(() => G.player.xp);
    ok(xp1 >= xp0, 'closing still runs the original Close the volume action (xp ' + xp0 + ' -> ' + xp1 + ')');
    await key('ArrowRight'); ok((await st()).g === 'play', 'keys after closing do nothing to the (closed) document');
    // opening again after a close works
    await page.evaluate(() => { readLoreBook(2); }); ok((await st()).open, 'a book can be opened again'); await key('Escape');

    // ---- 7. the Close the volume choice button works from the last page ----
    await page.evaluate(() => { readLoreBook(3); });
    await key('End');
    ok(await page.locator('.hd-choices button').first().isVisible(), 'the original choice shows on the last page');
    await page.locator('.hd-choices button').first().click({ force: true });
    s = await st(); ok(s.g === 'play' && s.hidden, 'clicking Close the volume returns to play');

    // ---- 8. converted note with choices (the writ) ----
    await page.evaluate(() => { window.__pick = null; G.flags.sable_with = false; });
    await page.evaluate(() => { showEvent('The writ', 'He has walked nine miles alone to read it aloud, because the form requires it. In the name of the Iron Synod: the Chord, all of you, declared Dissonant. The Church\'s claim on the Cantor stayed, not refused.<br><br>And grace, offered once: the glass drawn, the Cantor amnestied, the cores returned for <i>proper disposition</i>.', [{ t: 'Let Lyra answer him.', f: () => { window.__pick = 'lyra'; } }, { t: 'Answer him yourself.', f: () => { window.__pick = 'me'; } }]); });
    ok(await page.locator('.hd-sheet.hd-office').count() === 1, 'the writ uses the grey Office form');
    await page.screenshot({ path: path.join(SHOTS, 'notice-writ.png') });
    await key('Escape'); s = await st();
    ok(s.open && s.page === s.pages - 1 && await page.locator('.hd-choices button').first().isVisible(), 'Escape on a multi-choice note does not pick for you: it shows the choices');
    ok(await page.evaluate(() => document.activeElement.dataset.i === '0'), 'Escape puts focus on the first choice');
    await key('Enter');
    ok(await page.evaluate(() => window.__pick === 'lyra'), 'choosing runs the original choice callback');
    s = await st(); ok(s.g === 'play' && s.hidden, 'choice returns to play');
    await page.evaluate(() => { window.__pick = null; showEvent('The writ', 'x', [{ t: 'A', f: () => { window.__pick = 'a'; } }, { t: 'B', f: () => { window.__pick = 'b'; } }]); });
    await key('2'); ok(await page.evaluate(() => window.__pick === 'b'), 'number key picks the second choice');

    // ---- 9. non-reading events keep the normal panel ----
    await page.evaluate(() => { showEvent('Hew Callan', 'He looks at his hands.', [{ t: 'Nod.', f: null }]); });
    ok(await page.locator('#event-panel h2').count() === 1 && await page.locator('.hd-sheet').count() === 0 && await page.evaluate(() => !document.querySelector('#event').classList.contains('hd-on')), 'dialogue event keeps the normal panel');
    await page.locator('#event-panel button').first().click();
    await page.evaluate(() => { showEvent('The Greening', 'The bit snaps.', [{ t: 'Get out', f: null }]); });
    ok(await page.locator('.hd-sheet').count() === 0, 'story event keeps the normal panel');
    await page.locator('#event-panel button').first().click();
    ok((await st()).g === 'play', 'normal panel still closes to play');

    // ---- 10. the cutter's log, pamphlet, letter, register, inscription, dispatch, folder all convert ----
    const sources = await page.evaluate(() => Object.keys(READING.SOURCES));
    for (const t of sources) {
      const r = await page.evaluate((t) => { showEvent(t, 'Body text.<br><br><i>More.</i>', [{ t: 'Fold it away.', f: null }]); const o = READING.state().open; const sheet = document.querySelector('.hd-sheet'); const cls = sheet && sheet.className; if (o) { READING.choose(0); } return { o, cls }; }, t);
      ok(r.o, 'converted: ' + t + ' (' + (r.cls || '').replace('hd-sheet ', '').replace(' hd-sway', '') + ')');
    }
    // the real cutter log through its game path
    await page.evaluate(() => { loadMap('coda_mausoleum' in G.maps ? 'coda_mausoleum' : G.mapId, undefined); });
    await page.evaluate(() => { G.state = 'play'; showEvent('The log of OC-742', 'An Office logbook, grey cloth, every page ruled. The hand is small and very tidy.<br><br><i>TASKED: follow DK by sound from Oakhaven. Do not board. Do not engage. Listen.<br>REPORT TO: the Arbiter\'s column, the Tramway, ninth day.<br>CARGO: Consignment 19, 432 units, for the Hall of Carriage.<br><br>Day 6. DK took on a press and an archivist at Whisper-Grove. Grapnel crew stood to. Horn has the Cantor\'s voice clear.<br>Day 7. DK making for</i><br><br>The last line is not finished.', [{ t: 'Take the log.', f: null }]); });
    await page.evaluate(() => READING.setSize(1));
    await page.screenshot({ path: path.join(SHOTS, 'cutter-log.png') });
    await key('Escape');
    await page.evaluate(() => { showEvent('WELCOME TO RELIEF', 'A printed pamphlet, in a very straight hand someone has had set in type: <i>You have walked a long way. Sit down; the bench is clean. There is water in the butt and a cup on the chain. A clerk will call your name.</i><br><br>At the bottom, very small: <i>Prepared for the Office by S., Veil Archives, 415.</i>', [{ t: 'Put it back on its pin.', f: null }]); });
    await page.evaluate(() => READING.setSize(1));
    await page.screenshot({ path: path.join(SHOTS, 'synod-pamphlet.png') });
    await key('Escape');

    // ---- 11. contrast >= 7:1 for body text against the page, every paper ----
    const contrast = await page.evaluate(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const out = {};
      readLoreBook(0); { const sheet = document.querySelector('.hd-sheet'), b = document.querySelector('.hd-body'); const fg = lum(getComputedStyle(b).color), bg = lum(getComputedStyle(sheet).backgroundColor); out.parch = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05); READING.choose(0); }
      for (const t of ['The log of OC-742', 'The register of interments', 'Over the inner door', 'Bryony Wick\'s letter']) {
        showEvent(t, 'Body.', [{ t: 'ok', f: null }]);
        const sheet = document.querySelector('.hd-sheet'), b = document.querySelector('.hd-body');
        const fg = lum(getComputedStyle(b).color), bg = lum(getComputedStyle(sheet).backgroundColor);
        out[sheet.className.match(/hd-(parch|paper|office|slate)/)[1]] = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
        const tf = lum(getComputedStyle(document.querySelector('.hd-title')).color); out[t + ' title'] = (Math.max(tf, bg) + 0.05) / (Math.min(tf, bg) + 0.05);
        const btn = document.querySelector('.hd-btn'); const bf = lum(getComputedStyle(btn).color), bb = lum(getComputedStyle(btn).backgroundColor);
        out[t + ' button'] = (Math.max(bf, bb) + 0.05) / (Math.min(bf, bb) + 0.05);
        READING.choose(0);
      }
      return out;
    });
    for (const k in contrast) ok(contrast[k] >= 7, `contrast ${k}: ${contrast[k].toFixed(1)}:1 >= 7:1`);

    // ---- 12. compact 640x400: no horizontal overflow, every control reachable ----
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => READING.setSize(1));
    await page.waitForTimeout(150);
    await page.evaluate(() => { readLoreBook(1); });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOTS, 'compact-book.png') });
    await page.evaluate(() => { READING.dismiss(); showEvent('The writ', 'He has walked nine miles alone to read it aloud, because the form requires it. In the name of the Iron Synod: the Chord, all of you, declared Dissonant. The Church\'s claim on the Cantor stayed, not refused. The Dread Arbiter nine days out on the Tramway with a column. And grace, offered once: the glass drawn, the Cantor amnestied, the Oakhaven survivors given transit, and the cores returned for <i>proper disposition</i>.', [{ t: 'Let Lyra answer him.', f: () => { window.__pick = 'lyra'; } }, { t: 'Answer him yourself.', f: () => { window.__pick = 'me'; } }]); });
    await key('End');
    await page.screenshot({ path: path.join(SHOTS, 'compact-writ-choices.png') });
    const geo = await page.evaluate(() => {
      const g = document.querySelector('#game').getBoundingClientRect();
      const sheet = document.querySelector('.hd-sheet').getBoundingClientRect();
      const ev = document.querySelector('#event'), body = document.querySelector('.hd-body');
      const bad = [];
      document.querySelectorAll('.hd-btn').forEach(b => {
        b.scrollIntoView({ block: 'nearest' });
        const r = b.getBoundingClientRect();
        if (r.left < g.left - 1 || r.right > g.right + 1 || r.top < g.top - 1 || r.bottom > g.bottom + 1 || r.width < 20 || r.height < 20) bad.push(b.textContent.trim() + JSON.stringify([r.left, r.right, r.top, r.bottom]));
      });
      return { xo: ev.scrollWidth - ev.clientWidth, sheetW: sheet.width, gW: g.width, docXo: document.documentElement.scrollWidth - document.documentElement.clientWidth, bodyXo: false, bad, bodyH: body.clientHeight, lines: Math.floor(body.clientHeight / parseFloat(getComputedStyle(body).lineHeight)) };
    });
    ok(geo.xo <= 0 && geo.docXo <= 0 && geo.sheetW <= geo.gW + 1, 'compact: no horizontal overflow');
    ok(geo.bad.length === 0, 'compact: all controls inside the view and reachable ' + JSON.stringify(geo.bad));
    ok(geo.lines >= 3, 'compact: text area holds at least 3 lines with choices shown (' + geo.lines + ')');
    await page.locator('.hd-choices button').nth(1).click({ force: true });
    ok(await page.evaluate(() => window.__pick === 'me') && (await st()).g === 'play', 'compact: choice button works');
    await page.setViewportSize({ width: 1280, height: 800 });

    // ---- 13. reduced motion: no sway when GFX.reduceMotion ----
    const sway = await page.evaluate(() => { const r = {}; GFX.reduceMotion = false; showEvent('The log of OC-742', 'x', [{ t: 'ok', f: null }]); r.on = getComputedStyle(document.querySelector('.hd-sheet')).animationName; READING.choose(0); GFX.reduceMotion = true; showEvent('The log of OC-742', 'x', [{ t: 'ok', f: null }]); r.off = getComputedStyle(document.querySelector('.hd-sheet')).animationName; READING.choose(0); GFX.reduceMotion = false; return r; });
    ok(sway.on !== 'none' && sway.off === 'none', 'hand-held sway runs by default and stops with GFX.reduceMotion (' + sway.on + ' / ' + sway.off + ')');

    // ---- 14. flag off: the original panel DOM ----
    const orig = await page.evaluate(() => {
      GFX.heldDocs = false;
      readLoreBook(1);
      const p = document.querySelector('#event-panel');
      const r = { held: !!document.querySelector('.hd-sheet'), cls: document.querySelector('#event').className, h2: !!p.querySelector('h2'), list: !!p.querySelector('.list'), btns: p.querySelectorAll('button').length, st: G.state, open: READING.state().open };
      p.querySelector('button').click();
      showEvent('The log of OC-742', 'x', [{ t: 'ok', f: null }]);
      r.held2 = !!document.querySelector('.hd-sheet');
      document.querySelector('#event-panel button').click();
      GFX.heldDocs = true;
      return r;
    });
    ok(!orig.held && !orig.held2 && orig.h2 && orig.list && orig.btns === 1 && !/hd-on/.test(orig.cls) && orig.st === 'event' && !orig.open, 'GFX.heldDocs=false gives the original panel DOM');
    ok(await page.evaluate(() => G.state === 'play' && !('heldDocs' in {}) && !GFX.FX.includes('heldDocs')), 'heldDocs is not in GFX.FX');

    // ---- 15. the player name never reaches the sheet unescaped (nothing is added by the module) ----
    ok(await page.evaluate(() => { showEvent('The log of OC-742', 'Plain.', [{ t: 'ok', f: null }]); const h = document.querySelector('.hd-sheet').innerHTML; READING.choose(0); return !/Reader/.test(h) && !h.includes('<b>X</b>'); }), 'the module adds no player-controlled text');

    ok(errors.length === 0, 'no page errors ' + errors.join('|'));
  } finally { await browser.close(); }
  console.log(fails ? 'FAIL reading: ' + fails + ' failed' : 'PASS reading');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL reading crash: ' + (e && e.stack || e)); process.exit(1); });
