// PREVIEW_URL=http://127.0.0.1:3304 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/tobin.test.js
// Phase 6 TOBIN: twelve collectible journal pages, the logbook section, the completion reward and the switch.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.TOBIN_SHOTS || '';

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3304');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof TOBIN !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Tobin Tester');
  await page.locator('#c-next').click();
  await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click();
  await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click();
  await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play');
  return { page, errors };
}
const ok = (m) => console.log('PASS ' + m);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);

    // ---- the table: twelve pages, 100-200 words, fixed numbering, valid ground
    const table = await page.evaluate(() => {
      const out = { n: TOBIN.PAGES.length, words: [], bad: [], ids: TOBIN.PAGES.map(p => p.n).join(','), titles: new Set(TOBIN.PAGES.map(p => TOBIN.titleOf(p.n))).size, src: true };
      for (const p of TOBIN.PAGES) {
        out.words.push(p.text.join(' ').split(/\s+/).length);
        const m = G.maps[p.map]; if (!m) { out.bad.push(p.n + ' no map ' + p.map); continue; }
        const cx = Math.floor(p.x), cy = Math.floor(p.y);
        if (m.isBlocked(cx, cy)) out.bad.push(p.n + ' in a wall');
        const c = m.get(cx, cy); if (c && c.door) out.bad.push(p.n + ' in a doorway');
        for (const e of m.entities) if (e.solid && !e.tobinPage && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 0.25) out.bad.push(p.n + ' overlaps a solid ' + (e.sprite || e.kind));
        // never on the straight line through a door: keep two cells from any door cell
        for (const k in m.doors) { const dx = (k % m.w) + 0.5 - p.x, dy = Math.floor(k / m.w) + 0.5 - p.y; if (dx * dx + dy * dy < 2.25) out.bad.push(p.n + ' next to a door'); }
        if (!READING.SOURCES[TOBIN.titleOf(p.n)] || READING.SOURCES[TOBIN.titleOf(p.n)].style !== 'parch' || READING.SOURCES[TOBIN.titleOf(p.n)].kind !== 'Journal') out.src = false;
      }
      out.maps = new Set(TOBIN.PAGES.map(p => p.map)).size;
      return out;
    });
    assert.equal(table.n, 12); assert.equal(table.ids, '1,2,3,4,5,6,7,8,9,10,11,12'); assert.equal(table.titles, 12);
    assert(table.words.every(w => w >= 100 && w <= 200), 'word counts ' + table.words);
    assert.deepEqual(table.bad, []); assert(table.src, 'READING.SOURCES'); assert(table.maps >= 10, 'spread over maps');
    ok('twelve pages, 100-200 words, numbered 1..12, parch Journal sources, on open floor away from doors and solids (' + table.maps + ' maps)');

    // ---- a page is present on entering its map, and picked up with the real interact path
    const inter = await page.evaluate(() => {
      const p = TOBIN.PAGES[1];
      loadMap(p.map, { x: p.x + 1.2, y: p.y, dir: Math.PI });
      const e = G.ents.find(x => x.tobinPage === 2);
      if (!e) return { err: 'not placed' };
      const before = G.flags.p6t_page_2;
      interact();
      return { before, after: G.flags.p6t_page_2, open: READING.state().open, title: document.querySelector('.hd-title') && document.querySelector('.hd-title').textContent, kind: document.querySelector('.hd-kicker') && document.querySelector('.hd-kicker').textContent, gone: !G.ents.some(x => x.tobinPage === 2 && !x.dead && !x.hidden), state: G.state, inv: G.player.inv.some(s => s.id === 'tobin_page') };
    });
    assert.equal(inter.err, undefined, inter.err);
    assert.equal(inter.before, undefined); assert.equal(inter.after, true); assert.equal(inter.open, true);
    assert.equal(inter.title, 'Tobin\'s Journal, page 2'); assert.equal(inter.kind, 'Journal'); assert(inter.gone); assert.equal(inter.inv, false);
    if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: SHOTS + '/page2-held.png' }); }
    await page.evaluate(() => READING.choose(0));
    assert.equal(await page.evaluate(() => G.state), 'play');
    ok('interact() picks the page up, opens it as a held Journal document, sets p6t_page_2, and puts nothing in the bag');

    // ---- once only: leaving and coming back, and save/load
    const once = await page.evaluate(() => {
      loadMap('tavern'); loadMap('lyra_house', { x: 6, y: 6, dir: 0 });
      const back = G.ents.some(x => x.tobinPage === 2);
      const d = JSON.parse(JSON.stringify(snapshotGame()));
      const extras = Object.values(d.maps).reduce((n, m) => n + (m.extra || []).filter(o => o.item === 'tobin_page').length, 0);
      const baseSaved = Object.values(d.maps).reduce((n, m) => n + (m.ents || []).filter(o => o && o.item === 'tobin_page').length, 0);
      restoreGame(d);
      return { back, extras, baseSaved, flag: G.flags.p6t_page_2, still: G.ents.some(x => x.tobinPage === 2), others: [...new Set(G.maps.chapel.entities.concat(G.maps.mill.entities).filter(x => x.tobinPage).map(x => x.tobinPage))].length };
    });
    assert.equal(once.back, false); assert.equal(once.extras, 0); assert.equal(once.baseSaved, 0);
    assert.equal(once.flag, true); assert.equal(once.still, false);
    ok('a collected page never respawns over map changes, save and load; pages are never written into the save');
    const chapelP = await page.evaluate(() => { loadMap('chapel'); const n = TOBIN.PAGES.find(p => p.map === 'chapel').n; return G.ents.some(x => x.tobinPage === n); });
    assert(chapelP, 'other pages are still waiting after a load');

    // ---- order and numbering in the logbook
    await page.evaluate(() => { for (const n of [9, 5]) { const p = TOBIN.PAGES[n - 1]; loadMap(p.map, { x: p.x, y: p.y + 0.6, dir: 0 }); pickUp(G.ents.find(x => x.tobinPage === n)); READING.choose(0); } });
    const log = await page.evaluate(() => {
      G.state = 'panel'; renderLog();
      const sec = document.getElementById('tobin-log');
      return { h: sec.querySelector('h3').textContent, items: [...sec.querySelectorAll('[role=listitem]')].map(x => x.textContent), first: document.querySelector('#modal-panel').firstElementChild.tagName + ' ' + [...document.querySelectorAll('#modal-panel h3')].map(h => h.textContent).join('|') };
    });
    assert.equal(log.h, 'Tobin\'s Journal (3/12)');
    assert.equal(log.items.length, 12); assert.equal(log.items[1], '2. The long cane'); assert.equal(log.items[4], '5. Such resonances as lie beneath'); assert.equal(log.items[8], '9. A congregation of hounds'); assert.equal(log.items[0], '1. (not found)');
    assert(log.first.indexOf('Tobin') < log.first.indexOf('The Rite'), 'section sits above the entries: ' + log.first);
    if (SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: SHOTS + '/logbook-3of12.png' }); }
    await page.locator('[data-tobin-page="5"]').click();
    const re = await page.evaluate(() => ({ open: READING.state().open, title: document.querySelector('.hd-title').textContent, body: document.querySelector('.hd-body').textContent.slice(0, 40) }));
    assert.equal(re.open, true); assert.equal(re.title, 'Tobin\'s Journal, page 5'); assert(/Stasisday/.test(re.body));
    await page.evaluate(() => READING.choose(0));
    assert.equal(await page.evaluate(() => ({ s: G.state, log: !!document.getElementById('tobin-log'), prog: document.querySelector('#tobin-log h3').textContent })).then(x => x.log && x.s === 'panel' && x.prog), 'Tobin\'s Journal (3/12)');
    ok('logbook lists found pages in numeric order (3/12), unfound pages as gaps, and re-reads open the page and return to the logbook');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });

    // ---- completion: reward once
    const done = await page.evaluate(() => {
      const xp0 = G.player.xp + G.player.level * 1e6;
      for (let n = 1; n <= 12; n++) { if (G.flags['p6t_page_' + n] === true) continue; const p = TOBIN.PAGES[n - 1]; loadMap(p.map, { x: p.x, y: p.y + 0.6, dir: 0 }); pickUp(G.ents.find(x => x.tobinPage === n)); if (n < 12) READING.choose(0); }
      const midDone = G.flags.p6t_done;   // not yet: the 12th is still open on screen
      READING.choose(0);                  // fold the last page -> completion
      const closing = READING.state().open && document.querySelector('.hd-title').textContent;
      const text = document.querySelector('.hd-body') && document.querySelector('.hd-body').textContent;
      READING.choose(0);
      return { midDone, closing, text, done: G.flags.p6t_done, count: TOBIN.count(), xp: G.player.xp + G.player.level * 1e6 - xp0, title: G.player.titles.includes(TOBIN.REWARD.title), item: G.count('tobin_journal'), state: G.state };
    });
    assert.equal(done.midDone, undefined); assert.equal(done.closing, 'Tobin\'s Journal, bound'); assert(/Does it ring\? True enough/.test(done.text));
    assert.equal(done.done, true); assert.equal(done.count, 12); assert(done.xp >= 100, 'xp ' + done.xp); assert(done.title); assert.equal(done.item, 1); assert.equal(done.state, 'play');
    if (SHOTS) {
      await page.evaluate(() => { TOBIN.complete = TOBIN.complete; });
    }
    const again = await page.evaluate(() => {
      const xp0 = G.player.xp + G.player.level * 1e6;
      const r = TOBIN.complete();
      const d = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(d);
      const r2 = TOBIN.complete();
      return { r, r2, dxp: G.player.xp + G.player.level * 1e6 - xp0, item: G.count('tobin_journal'), left: Object.values(G.maps).reduce((n, m) => n + m.entities.filter(e => e.tobinPage).length, 0) };
    });
    assert.equal(again.r, false); assert.equal(again.r2, false); assert.equal(again.dxp, 0); assert.equal(again.item, 1); assert.equal(again.left, 0);
    ok('collecting all twelve gives the closing page, +100 xp, a title and the keepsake exactly once (also across save/load); no pages left anywhere');
    const full = await page.evaluate(() => { G.state = 'panel'; renderLog(); const h = document.querySelector('#tobin-log h3').textContent; const n = document.querySelectorAll('#tobin-log button').length; closeModal(); G.state = 'play'; return { h, n }; });
    assert.equal(full.h, 'Tobin\'s Journal (12/12)'); assert.equal(full.n, 12);

    // ---- the keepsake survives the inventory panel and a reload
    const inv = await page.evaluate(() => { G.state = 'panel'; renderInventory && renderInventory(); const t = document.querySelector('#modal-panel').textContent; closeModal(); G.state = 'play'; return /Tobin's Journal/.test(t); });
    assert(inv, 'keepsake shows in the bag');

    // ---- hostile flags: only a real boolean true counts, nothing becomes markup
    const host = await page.evaluate(() => {
      const bad = ['true', 1, {}, [], null, '<img src=x onerror="window.__pwn=1">', 'yes'];
      const f = G.flags;
      for (let n = 1; n <= 12; n++) f['p6t_page_' + n] = bad[n % bad.length];
      f.p6t_done = '<img src=x onerror="window.__pwn=2">';
      window.__pwn = 0;
      let placed = 0; for (const p of TOBIN.PAGES) { loadMap(p.map); if (G.ents.some(e => e.tobinPage === p.n)) placed++; }
      G.state = 'panel'; renderLog();
      const sec = document.getElementById('tobin-log'); const html = document.getElementById('modal-panel').innerHTML;
      const r = { placed, count: TOBIN.count(), sec: !!sec, complete: TOBIN.complete(), pwn: window.__pwn, imgs: document.querySelectorAll('#modal-panel img[onerror], #modal-panel [onerror]').length, raw: /onerror/.test(html) };
      closeModal(); G.state = 'play';
      // objects with toString tricks and a non-object flags bag must not throw
      G.flags = { p6t_page_1: { toString() { return 'true'; } }, p6t_done: { valueOf() { return true; } } };
      loadMap('greenhall'); r.trick = G.ents.some(e => e.tobinPage === 1);
      for (const k in G.flags) delete G.flags[k];
      return r;
    });
    assert.equal(host.placed, 12, 'every hostile-flag page is still placed'); assert.equal(host.count, 0); assert.equal(host.sec, false);
    assert.equal(host.complete, false); assert.equal(host.pwn, 0); assert.equal(host.imgs, 0); assert.equal(host.raw, false); assert.equal(host.trick, true);
    ok('hostile p6t_ flags (strings, numbers, objects, markup) never count, never reward and never reach the DOM');

    // ---- the switch: off = no pages, no section, original logbook
    const sw = await page.evaluate(() => {
      const f = G.flags;
      // baseline logbook with the switch off and pages flagged found
      f.p6t_page_1 = true; f.p6t_page_2 = true; f.p6t_page_3 = true;
      UPG.tobinPages = false;
      let placed = 0; for (const id in G.maps) { loadMap(id); placed += G.ents.filter(e => e.tobinPage).length; }
      for (const f2 of ['p6t_page_1', 'p6t_page_2', 'p6t_page_3']) delete f[f2];
      loadMap('lyra_house'); const leftover = G.ents.some(e => e.tobinPage);
      G.state = 'panel'; renderLog(); const offHtml = document.getElementById('modal-panel').innerHTML; closeModal(); G.state = 'play';
      f.p6t_page_1 = true; G.state = 'panel'; renderLog(); const offWith = document.getElementById('modal-panel').innerHTML; const sec = !!document.getElementById('tobin-log'); closeModal(); G.state = 'play';
      delete f.p6t_page_1;
      // a stray page entity does nothing while off
      const stray = { kind: 'item', item: 'tobin_page', sprite: 'tobin_page', x: 5, y: 5, solid: false, tobinPage: 4 };
      G.ents.push(stray); pickUp(stray);
      const strayFlag = G.flags.p6t_page_4, strayOpen = READING.state().open;
      G.ents.splice(G.ents.indexOf(stray), 1);
      UPG.tobinPages = true; loadMap('lyra_house'); const back = G.ents.some(e => e.tobinPage === 2);
      return { placed, leftover, same: offHtml === offWith, sec, strayFlag, strayOpen, back, noTobinText: !/Tobin/.test(offWith) };
    });
    assert.equal(sw.placed, 0); assert.equal(sw.leftover, false); assert.equal(sw.same, true); assert.equal(sw.sec, false);
    assert.equal(sw.strayFlag, undefined); assert.equal(sw.strayOpen, false); assert.equal(sw.back, true); assert(sw.noTobinText);
    ok('UPG.tobinPages = false: no page on any map, no logbook section, logbook identical, stray pages inert; back on restores them');

    // ---- the pickup message, and the mid-map switch
    const live = await page.evaluate(() => {
      loadMap('lyra_house'); UPG.tobinPages = false;
      return new Promise(res => setTimeout(() => { const gone = !G.ents.some(e => e.tobinPage); UPG.tobinPages = true; setTimeout(() => res({ gone, back: G.ents.some(e => e.tobinPage) }), 300); }, 300));
    });
    assert.equal(live.gone, true); assert.equal(live.back, true);
    ok('switching off and on while standing in a map removes and restores the page');

    // ---- screenshots 1280x800
    if (SHOTS) {
      await page.evaluate(() => { const p = TOBIN.PAGES[0]; loadMap('lyra_house', { x: 4.2, y: 5.4, dir: Math.PI }); G.flags = {}; });
      await page.waitForTimeout(700);
      await page.screenshot({ path: SHOTS + '/world-page-lyra-house.png' });
      await page.evaluate(() => { loadMap('lyra_house', { x: 3.3, y: 5.8, dir: Math.PI }); });
      await page.waitForTimeout(700);
      await page.screenshot({ path: SHOTS + '/world-page-close.png' });
      await page.evaluate(() => { const f = G.flags; for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) f['p6t_page_' + n] = true; G.state = 'panel'; renderLog(); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: SHOTS + '/logbook-11of12.png' });
      await page.evaluate(() => { closeModal(); G.state = 'play'; const p = TOBIN.PAGES[11]; loadMap(p.map, { x: p.x, y: p.y + 0.6, dir: 0 }); pickUp(G.ents.find(x => x.tobinPage === 12)); });
      await page.waitForTimeout(500);
      await page.screenshot({ path: SHOTS + '/page12-held.png' });
      await page.evaluate(() => READING.choose(0));
      await page.waitForTimeout(500);
      await page.screenshot({ path: SHOTS + '/completion.png' });
      await page.evaluate(() => READING.choose(0));
    }
    assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
    await page.close();

    // ---- compact 640x400: held page and the logbook section fit without horizontal overflow
    const c = await boot(browser, { width: 640, height: 400 });
    const fit = await c.page.evaluate(() => {
      for (let n = 1; n <= 12; n++) G.flags['p6t_page_' + n] = true;
      const r = {};
      G.state = 'panel'; renderLog();
      const pn = document.getElementById('modal-panel');
      r.logOverflow = pn.scrollWidth - pn.clientWidth; r.secW = document.getElementById('tobin-log').getBoundingClientRect().right - pn.getBoundingClientRect().left;
      closeModal();
      showEvent(TOBIN.titleOf(11), TOBIN.bodyHTML(TOBIN.PAGES[10]), [{ t: 'Fold it away.', f: null }]);
      const sheet = document.querySelector('.hd-sheet'); const b = sheet.getBoundingClientRect();
      r.sheet = [Math.round(b.right), Math.round(b.bottom), innerWidth, innerHeight]; r.docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return r;
    });
    assert(fit.logOverflow <= 1, 'logbook horizontal overflow ' + fit.logOverflow);
    assert(fit.sheet[0] <= fit.sheet[2] + 1 && fit.sheet[1] <= fit.sheet[3] + 1 && fit.docOverflow <= 0, 'sheet fits ' + fit.sheet);
    if (SHOTS) { await c.page.waitForTimeout(400); await c.page.screenshot({ path: SHOTS + '/compact-page.png' }); await c.page.evaluate(() => { READING.choose(0); G.state = 'panel'; renderLog(); }); await c.page.waitForTimeout(300); await c.page.screenshot({ path: SHOTS + '/compact-logbook.png' }); }
    assert.deepEqual(c.errors, [], 'compact page errors');
    ok('640x400: the held page and the logbook section fit with no horizontal overflow');
    console.log('ALL TOBIN TESTS PASSED');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
