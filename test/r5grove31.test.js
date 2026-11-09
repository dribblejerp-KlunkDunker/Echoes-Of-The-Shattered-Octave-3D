// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r5grove31.test.js
// Release road R5b (js/grove31.js): the Moot-house's gallery and cellar, and the Bell Yard and Ashlane, in Whisper-Grove.
// Each joins a map that is already reachable, closes cleanly when the Kestrel leaves, and has French.
// Set SHOT_DIR to also write a screenshot of each place.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SHOTS = process.env.SHOT_DIR || '';

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /grove31/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof GROVE31 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Grove Tester');
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
    await page.evaluate(() => {
      window.__msgs = []; const _m = window.msg; window.msg = function (t) { window.__msgs.push(String(t)); return _m.apply(this, arguments); };
      window.__ev = []; window.__realEvent = window.showEvent; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
      window.T = {
        go(id, x, y, dir, tod) { if (tod != null) G.tod = tod; loadMap(id, x == null ? undefined : { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.033); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        use(e) { window.__ev.length = 0; useDeco(e); return window.__ev[window.__ev.length - 1] || null; },
        pick(ev, re) { const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        find(pred) { return G.map.entities.find(pred); },
        portalAt(id, x, y) { const c = G.maps[id].get(x, y); return c && c.portal ? c.portal.map : null; },
      };
    });
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- the ways in: the Moot-house hall (a library room) and the Sunken Court, both already reachable
    const ways = await page.evaluate(() => {
      const H = GROVE31, out = {};
      out.gallery = T.portalAt('lib_moot', H.MOOT_DOORS.gallery[0], H.MOOT_DOORS.gallery[1]);
      out.cellar = T.portalAt('lib_moot', H.MOOT_DOORS.cellar[0], H.MOOT_DOORS.cellar[1]);
      out.yard = T.portalAt('whispergrove', H.GROVE_GATE[0], H.GROVE_GATE[1]);
      out.mootHost = T.portalAt('whispergrove', 40, 27) === 'lib_moot';
      out.back = T.portalAt('p31_gallery', 0, 3) === 'lib_moot' && T.portalAt('p31_cellar', 9, 3) === 'lib_moot' && T.portalAt('p31_bellyard', 33, 11) === 'whispergrove'
        && T.portalAt('p31_bellyard', 4, 3) === 'p31_wick' && T.portalAt('p31_bellyard', 5, 13) === 'p31_renn' && T.portalAt('p31_wick', 3, 6) === 'p31_bellyard' && T.portalAt('p31_renn', 3, 6) === 'p31_bellyard';
      const lands = [];
      for (const id of ['p31_gallery', 'p31_cellar', 'p31_bellyard', 'p31_wick', 'p31_renn', 'lib_moot', 'whispergrove']) {
        const m = G.maps[id];
        for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (!c || !c.portal || !G.maps[c.portal.map]) continue; if (!/^p31_/.test(c.portal.map) && !/^p31_/.test(id)) continue; const t = G.maps[c.portal.map]; const px = c.portal.x, py = c.portal.y; lands.push([id + '>' + c.portal.map, !t.isBlocked(Math.floor(px), Math.floor(py)) && !t.entities.some((o) => o && o.solid && !o.hidden && !o.dead && (o.x - px) ** 2 + (o.y - py) ** 2 < ((o.radius || 0.3) + 0.25) ** 2)]); }
      }
      out.lands = lands.filter((l) => !l[1]); out.n = lands.length;
      return out;
    });
    check(ways.gallery === 'p31_gallery' && ways.cellar === 'p31_cellar' && ways.mootHost, 'the Moot-house hall has a stair up to the gallery and a stair down to the cellar');
    check(ways.yard === 'p31_bellyard' && ways.back, 'an archway off the Sunken Court leads to the Bell Yard; Halder Wick\'s and Ivo Renn\'s doors open; every door leads back');
    check(ways.n >= 10 && ways.lands.length === 0, 'every new doorway lands on open ground (' + ways.n + ' checked; bad: ' + JSON.stringify(ways.lands) + ')');

    // ---- the gallery and the muniment store; the cellar and Corwin Aye's barrel
    const moot = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p31_gallery', null, null, 0, 0.8); T.step(1);
      out.windows = G.ents.filter((e) => e.sprite === 'p31_window' && /oilcloth/.test(e.look)).length === 3;
      f.sable_joined = false;
      let ev = T.use(G.ents.find((e) => e.use === 'p31_desk')); out.desk = /ten years and two hundred and twenty days/.test(ev.b) && /begin again/.test(ev.b);
      f.sable_joined = true; ev = T.use(G.ents.find((e) => e.use === 'p31_desk')); out.deskGone = /cleared/.test(ev.b); f.sable_joined = false;
      out.sheet = G.ents.some((e) => /scriptorium\. scriptorium/.test(e.look || ''));
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      T.go('p31_cellar', null, null, 0, 0.8); T.step(1);
      const b = G.ents.find((e) => e.use === 'p31_barrel'); ev = T.use(b);
      out.barrel = /nineteen years/.test(ev.b) && /C\. AYE/.test(ev.b);
      return out;
    });
    check(moot.windows && moot.free && moot.sheet, 'the gallery looks over the plaza where Sable watched the proctor; her practice sheet of "scriptorium"');
    check(moot.desk && moot.deskGone, 'her desk in the muniment store keeps the sum of twenty names a night, and is cleared once she has gone aboard');
    check(moot.barrel, 'Corwin Aye\'s barrel in the Moot-house cellar has not leaked in nineteen years');
    await shot('p31-gallery', () => { T.go('p31_gallery', 1.8, 2.6, 0.55, 0.8); T.step(1); });
    await shot('p31-cellar', () => { T.go('p31_cellar', 7.6, 3.4, Math.PI - 0.35, 0.8); T.step(1); });

    // ---- the Bell Yard and Ashlane
    const yard = await page.evaluate(() => {
      const out = {};
      window.__msgs.length = 0;
      T.go('whispergrove', 1.6, 29.5, 0, 0.8); T.go('p31_bellyard', null, null, 0, 0.8); T.step(2);
      out.entered = T.heard(/The Bell Yard\. The streets are swept/);
      const e = G.ents;
      out.boards = e.filter((o) => o.use === 'p31_board').length === 7;
      out.flowers = e.some((o) => o.sprite === 'p31_flowers' && /dead flowers/.test(o.look));
      out.lamps = e.filter((o) => o.sprite === 'lamp' && o.drylamp && !(o.glow > 0)).length >= 7;
      out.carts = e.filter((o) => o.sprite === 'p_cart' && /shafts up/.test(o.look)).length === 2;
      out.proctors = e.filter((o) => o.kind === 'enemy' && o.type === 'proctor').length === 2;
      out.hollows = ['p31_sweeper', 'p31_jugs', 'p31_shutters', 'p31_twice'].every((id) => e.some((o) => o.kind === 'npc' && o.id === id));
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      T.go('p31_wick', null, null, 0, 0.8); T.step(1);
      out.wick = G.ents.some((o) => /laid for four/.test(o.label || '') && /blue/.test(o.look || ''));
      T.go('p31_renn', null, null, 0, 0.8); T.step(1);
      out.renn = G.ents.some((o) => /keep his hands/.test(o.look || ''));
      return out;
    });
    check(yard.entered && yard.free && yard.flowers && yard.lamps && yard.carts, 'the Bell Yard: swept, latched, a window-box of dead flowers, the lamps with no oil, carts with their shafts up');
    check(yard.proctors && yard.hollows && yard.boards, 'proctors walk it; Hollows keep their tasks; seven doors carry name-boards');
    check(yard.wick && yard.renn, 'Halder Wick\'s table laid for four (the blue plate gone to the plaza); Ivo Renn\'s two bowls');
    await shot('p31-bellyard', () => { T.go('p31_bellyard', 21.5, 6.6, Math.PI + 0.32, 0.6); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });
    await shot('p31-ashlane', () => { T.go('p31_bellyard', 19.5, 15.2, Math.PI, 0.6); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });
    await shot('p31-twice', () => { T.go('p31_bellyard', 15.5, 16.0, -Math.PI / 2, 0.6); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });
    await shot('p31-wick', () => { T.go('p31_wick', 3.5, 5.2, -Math.PI / 2 - 0.3, 0.6); T.step(1); });

    // ---- "The Bell Yard Roll"
    const roll = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p31_bellyard', null, null, 0, 0.8); T.step(1);
      const n0 = G.ledger.length, xp0 = G.player.xp;
      G.ledger.push({ name: 'Corwin Aye', where: 'Hetty\'s cellar', day: 0 });   // the crates already named him
      const boards = G.ents.filter((o) => o.use === 'p31_board');
      let ev = T.use(boards[0]); out.first = T.pick(ev, /Write the name/) && f.p31_roll === 1 && G.journal.some((j) => /name-boards/.test(j.text));
      ev = T.use(boards[0]); out.once = ev.c.length === 1;
      for (const b of boards.slice(1)) { ev = T.use(b); T.pick(ev, /Write the name/); }
      out.done = f.p31_roll === 2 && G.player.xp >= xp0 + 40 && G.journal.some((j) => /Bell Yard Roll/.test(j.text));
      out.names = GROVE31.NAMES.every(([, n]) => G.ledger.some((r) => r.name === n));
      out.noDupe = G.ledger.filter((r) => r.name === 'Corwin Aye').length === 1 && G.ledger.length === n0 + 1 + 6;
      return out;
    });
    check(roll.first && roll.once, 'each name-board writes its household into your ledger, once');
    check(roll.done && roll.names && roll.noDupe, 'all seven names close "The Bell Yard Roll" (40 xp); a name already in the ledger is not written twice');

    // ---- the twice-taken man and Sable's three rules
    const twice = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p31_bellyard', null, null, 0, 0.8); T.step(1);
      const man = G.ents.find((o) => o.id === 'p31_twice');
      talk(man); try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } out.found = f.p31_twice === true && DLG.log.some((l) => /pressed him a second time/.test(l.t)) && G.journal.some((j) => /doing nothing at all/.test(j.text)); G.state = 'play';
      out.untouched = typeof NPCS.sable_wg.quest === 'function';
      const q0 = NPCS.sable_wg.quest;
      // not during the ambush
      f.wg_ambush = true; f.wg_ambush_over = false; out.notNow = !GROVE31.sableReady(f); f.wg_ambush = false;
      T.go('whispergrove', null, null, 0, 0.8); T.step(1);
      const sable = G.ents.find((o) => o.id === 'sable_wg' && !o.hidden) || G.ents.find((o) => o.id === 'sable_wg');
      talk(sable); try { document.getElementById('d-bye').click(); } catch (e) { /* none */ }
      out.rules = f.p31_rules === true && DLG.log.some((l) => /Do not comfort yourself in the margin/.test(l.t)) && G.journal.some((j) => /three rules/.test(j.text)); G.state = 'play';
      out.restored = NPCS.sable_wg.quest === q0;
      out.onceOnly = !GROVE31.sableReady(f);
      return out;
    });
    check(twice.found, 'the twice-taken man in Ashlane does nothing at all; finding him goes in the logbook');
    check(twice.notNow && twice.rules && twice.restored && twice.onceOnly, 'Sable shows you his margin entry and the Veil\'s three rules, once, never mid-ambush; her quest function is unchanged');

    // ---- the Kestrel's departure closes them; the maps survive a save
    const leave = await page.evaluate(() => {
      const out = {}, f = G.flags, keep = Object.assign({}, f);
      f.p31_roll = 1; f.p31_roll_closed = false; f.p31_twice = true; f.p31_rules = false; f.p31_twice_closed = false;
      T.go('whispergrove', null, null, 0, 0.8); T.step(1);
      out.open = !f.p31_roll_closed && !f.p31_twice_closed;
      f.part4 = true; T.step(1);
      out.closed = f.p31_roll_closed && f.p31_twice_closed && G.journal.some((j) => /nobody else is going to read them/.test(j.text)) && G.journal.some((j) => /does nothing at all\.$/.test(j.text));
      const n = G.journal.length; T.step(2); out.once = G.journal.length === n;
      out.noSable = !GROVE31.sableReady(f);
      for (const k of Object.keys(f)) delete f[k]; Object.assign(f, keep);
      T.go('p31_renn', null, null, 0, 0.5);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p31_renn';
      return out;
    });
    check(leave.open && leave.closed && leave.once && leave.noSable, 'when the Kestrel leaves Whisper-Grove, both quests close with one logbook line each');
    check(leave.saved, 'a save made in a new room loads back there');

    // ---- French for every new string
    const tsv = src('tools/i18n/p31-grove.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => GROVE31.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R5b TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
