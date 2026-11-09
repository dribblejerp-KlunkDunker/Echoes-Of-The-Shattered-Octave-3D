// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/libraries26.test.js
// Phase 26 in the real game: the four libraries (doors, shelves, keepers, quests), books for sale, books found,
// names on flyleaves going into the Ledger, every pile and found book on open floor; no page errors.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ok = (m) => console.log('PASS ' + m);
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3304');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof LIBRARIES !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'), null, { timeout: 120000 });
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reader');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const c = page.locator('#create-panel .list button').first();
      if (await c.count()) await c.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => G.state === 'play');
    await page.evaluate(() => { window.__ev = []; const o = showEvent; showEvent = function (t, b, c) { window.__ev.push({ t, b, c }); return o.apply(this, arguments); }; });

    // ---- the four rooms: built, each host door leads in and the room's door leads back out; shelves hold the right books
    const rooms = await page.evaluate(() => {
      const out = [];
      for (const [id, R] of Object.entries(LIBRARIES.LIBS)) {
        const m = G.maps[id], host = G.maps[R.host];
        const hd = host && host.get(R.door[0], R.door[1]);
        const shelves = m ? m.entities.filter(e => e.use === 'lib_shelf') : [];
        const exit = m ? Object.keys(m.doors).map(k => m.cells[k]).filter(c => c && c.portal).sort((a, b) => (b.portal.map === R.host) - (a.portal.map === R.host))[0] : null;   // the way out (other modules may add stairs)
        const shelved = LIBRARY.BOOKS.filter(b => b.how === 'shelf' && b.at === id).length;
        const shown = shelves.reduce((n, e) => n + (e.shelfKey === 'returns' ? 0 : LIBRARY.onShelf(id, e.shelfKey).length), 0);
        const outside = host && !host.isSolidCell(Math.floor(R.out.x), Math.floor(R.out.y));
        out.push({ id, built: !!m, hostDoor: !!(hd && hd.portal && hd.portal.map === id), back: !!(exit && exit.portal.map === R.host), outside, shelves: shelves.length, shelved, shown, keeper: !R.keeper || m.entities.some(e => e.kind === 'npc' && e.id === R.keeper.id) });
      }
      return out;
    });
    for (const r of rooms) {
      assert(r.built && r.hostDoor && r.back && r.outside, JSON.stringify(r));
      assert(r.keeper, 'keeper in ' + r.id); assert.equal(r.shown, r.shelved, 'every shelved book is on a shelf in ' + r.id);
    }
    ok('four libraries: host doors in, doors back out onto open ground, every shelved book on a shelf, keepers in place');

    const walk = await page.evaluate(() => {
      const res = {};
      loadMap('lib_conservatory');
      const sh = G.map.entities.find(e => e.use === 'lib_shelf' && e.shelfKey !== 'returns');
      useDeco(sh); const ev = window.__ev[window.__ev.length - 1];
      res.menu = ev.c.length; ev.c[0].f(); res.read = LIBRARY.count();
      closeModal(); G.state = 'play';
      // Ilse's quest: start, return the quest books, learn the tending breath, get the gift
      const q = NPCS.lib_ilse.quest; const r0 = q(G); res.started = !!(r0 && r0.journal);
      const qb = LIBRARY.BOOKS.filter(b => b.how === 'quest' && b.quest === 'ilse');
      for (const b of qb) G.give(b.id);
      G.player.songs = G.player.songs.filter(s => s !== 'tending');
      const r1 = q(G); res.done = !!G.flags.libq_ilse_done; res.tending = G.player.songs.includes('tending');
      res.gift = LIBRARY.BOOKS.filter(b => b.how === 'gift' && b.quest === 'ilse').every(b => G.has(b.id));
      res.returned = qb.every(b => !G.has(b.id) && G.flags['libret:' + b.id]);
      // shops
      res.odileShop = (NPCS.lib_odile.shop || []).filter(s => LIBRARY.isBook(s.item)).length;
      res.corvoShop = (NPCS.moor_bookseller.shop || []).filter(s => LIBRARY.isBook(s.item)).length;
      res.wantShop = LIBRARY.BOOKS.filter(b => b.how === 'shop').length;
      res.vaneShop = (NPCS.vane.shop || []).filter(s => LIBRARY.isBook(s.item)).length;
      // found books and flyleaves
      const fb = LIBRARY.BOOKS.find(b => b.how === 'quest' && b.quest === 'shelver') || LIBRARY.BOOKS.find(b => b.how === 'found' && b.at !== 'lib_scriptorium');
      loadMap(fb.at); const ent = G.map.entities.find(e => e.libFound && e.item === fb.id);
      res.foundPlaced = !!ent; if (ent) pickUp(ent); res.picked = G.has(fb.id) && !G.map.entities.includes(ent);
      const before = G.ledger.length; useItem(G.player.inv.find(s => s.id === fb.id)); res.ledger = G.ledger.length - before; res.wantLedger = (fb.flyleaf || []).length;
      renderLog(); res.logSection = !!document.querySelector('#lib-log'); closeModal(); G.state = 'play';
      loadMap(fb.at); res.notRespawned = !G.map.entities.some(e => e.libFound && e.item === fb.id);
      // the Moot-house: reading a named book opened the quest; bring them all back and the shelver gives his book
      res.shelverOpen = !!G.flags.libq_shelver;
      const sb = LIBRARY.BOOKS.filter(b => b.how === 'quest' && b.quest === 'shelver');
      for (const b of sb) if (!G.has(b.id)) G.give(b.id);
      const r2 = NPCS.lib_shelver.quest(G);
      res.shelverDone = !!G.flags.libq_shelver_done && sb.every(b => G.flags['libret:' + b.id]);
      res.shelverGift = LIBRARY.BOOKS.filter(b => b.how === 'gift' && b.quest === 'shelver').every(b => G.has(b.id));
      // Odile: the crate, then a friend's price
      G.flags.libq_odile = true;
      for (const b of LIBRARY.BOOKS.filter(b => b.how === 'quest' && b.quest === 'odile')) G.give(b.id);
      NPCS.lib_odile.quest(G); res.odileDone = !!G.flags.libq_odile_done && NPCS.lib_odile.markup < 1;
      return res;
    });
    assert(walk.menu >= 2 && walk.read === 1, 'shelf menu and reading');
    assert(walk.started && walk.done && walk.tending && walk.gift && walk.returned, JSON.stringify(walk));
    assert.equal(walk.odileShop + walk.corvoShop + walk.vaneShop, walk.wantShop, 'every shop book is on sale');
    assert(walk.foundPlaced && walk.picked && walk.notRespawned, 'found book');
    assert(walk.shelverOpen && walk.shelverDone && walk.shelverGift, 'the Moot-house quest: ' + JSON.stringify(walk));
    assert(walk.odileDone, 'Odile\'s crate');
    assert.equal(walk.ledger, walk.wantLedger, 'flyleaf names go into the Ledger');
    assert(walk.logSection, 'the logbook offers your library');
    ok('shelves read; Ilse\'s quest teaches the tending breath, Odile\'s crate earns a friend\'s price, the Moot-house quest opens from a flyleaf and ends in the shelver\'s gift; shops sell; found books pick up once; flyleaf names reach the Ledger; the logbook offers the library');

    // ---- every pile and found book in the real game: on open floor, off doors and solids
    const spots = await page.evaluate(() => {
      const bad = [], maps = new Set(LIBRARY.BOOKS.filter(b => ['pile', 'found', 'quest'].includes(b.how)).map(b => b.at));
      for (const id of maps) {
        if (!G.maps[id]) { bad.push(id + ': no such map'); continue; }
        loadMap(id);
        for (const p of G.map.entities.filter(e => e.libPile || e.libFound)) {
          if (G.map.isBlocked(Math.floor(p.x), Math.floor(p.y))) bad.push(id + ': in a wall');
          for (const k in G.map.doors) { const dx = (k % G.map.w) + 0.5 - p.x, dy = Math.floor(k / G.map.w) + 0.5 - p.y; if (dx * dx + dy * dy < 4) bad.push(id + ': by a door'); }
          for (const o of G.map.entities) if (o !== p && o.solid && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < 0.5) bad.push(id + ': on ' + (o.sprite || o.kind));
        }
      }
      return { n: maps.size, bad };
    });
    assert.deepEqual(spots.bad, []);
    ok('piles and found books on ' + spots.n + ' maps lie on open floor, off doors and furniture');
    assert.deepEqual(errors, []); ok('no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
