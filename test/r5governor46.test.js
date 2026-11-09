// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r5governor46.test.js
// Release road R5 #5 (js/governor46.js): the Governor's house above the square, the aired room, and the coat on the peg.
// It joins Oakhaven only (the north-row door by the Greenhall), is shut from the Greening on, closes its errand with one
// logbook line, and has French. Set SHOT_DIR to also write a screenshot of each room.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /governor46/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof GOVERNOR46 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Governor Tester');
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
      window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
      window.T = {
        go(id, x, y, dir, tod) { if (tod != null) G.tod = tod; loadMap(id, x == null ? undefined : { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.033); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        use(e) { window.__ev.length = 0; useDeco(e); return window.__ev[window.__ev.length - 1] || null; },
        pick(ev, re) { const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        portalAt(id, x, y) { const c = G.maps[id].get(x, y); return c && c.portal ? c.portal.map : null; },
        talkTo(id) { const e = G.ents.find((o) => o.kind === 'npc' && o.id === id); talk(e); const log = DLG.log.slice(); const ch = DLG.choices; try { document.getElementById('d-bye').click(); } catch (err) { /* none */ } G.state = 'play'; return { log, ch }; },
      };
    });
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- the way in: Oakhaven's north-row door by the Greenhall, and only that
    const ways = await page.evaluate(() => {
      const H = GOVERNOR46, out = {};
      out.door = T.portalAt('oakhaven', H.OAK_DOOR[0], H.OAK_DOOR[1]);
      out.label = G.maps.oakhaven.get(H.OAK_DOOR[0], H.OAK_DOOR[1]).label;
      out.back = T.portalAt('p46_house', 8, 10) === 'oakhaven' && T.portalAt('p46_house', 6, 0) === 'p46_room' && T.portalAt('p46_room', 4, 6) === 'p46_house';
      // nothing else leads into the new maps
      const into = [];
      for (const id in G.maps) { const m = G.maps[id]; if (/^p46_/.test(id)) continue; for (const c of m.cells) if (c && c.portal && /^p46_/.test(c.portal.map)) into.push(id); }
      out.only = into.length === 1 && into[0] === 'oakhaven';
      const lands = [];
      for (const id of ['p46_house', 'p46_room', 'oakhaven']) {
        const m = G.maps[id];
        for (const c of m.cells) { if (!c || !c.portal || !G.maps[c.portal.map]) continue; if (!/^p46_/.test(c.portal.map) && !/^p46_/.test(id)) continue; const t = G.maps[c.portal.map]; const px = c.portal.x, py = c.portal.y; lands.push([id + '>' + c.portal.map, !t.isBlocked(Math.floor(px), Math.floor(py)) && !t.entities.some((o) => o && o.solid && !o.hidden && !o.dead && (o.x - px) ** 2 + (o.y - py) ** 2 < ((o.radius || 0.3) + 0.25) ** 2)]); }
      }
      out.bad = lands.filter((l) => !l[1]); out.n = lands.length;
      return out;
    });
    check(ways.door === 'p46_house' && /Governor/.test(ways.label) && ways.back, 'the north-row door by the Greenhall opens on the Governor\'s house; a stair up to the aired room; every door leads back');
    check(ways.only, 'only Oakhaven leads into the new rooms');
    check(ways.n >= 4 && ways.bad.length === 0, 'every new doorway lands on open ground (' + ways.n + ' checked; bad: ' + JSON.stringify(ways.bad) + ')');

    // ---- the house: the step, the table laid for one, the lease and the winter's list, the hidden roots, Marrit
    const house = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p46_house', null, null, 0, 0.8); T.step(1);
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      const by = (re) => G.ents.find((e) => re.test(e.label || ''));
      out.step = /both ways/.test(by(/doorstep/).look);
      out.table = /laid at the head for one/.test(by(/laid for one/).look);
      let ev = T.use(G.ents.find((e) => e.sprite === 'p46_desk'));
      out.desk = /Wetherby twins/.test(ev.b) && /eleven more/.test(ev.b) && /signature/.test(ev.b);
      ev = T.use(G.ents.find((e) => e.use === 'p46_dressing'));
      out.roots = /linen squares/.test(ev.b) && /face down/.test(ev.b) && /Second and fourth Rootday/.test(ev.b) && f.p46_roots === true && G.journal.some((j) => /putting out roots/.test(j.text));
      const n = G.journal.length; T.use(G.ents.find((e) => e.use === 'p46_dressing')); out.rootsOnce = G.journal.length === n;
      out.marrit = G.ents.some((e) => e.kind === 'npc' && e.id === 'p46_marrit');
      const t = T.talkTo('p46_marrit'); out.greet = t.log.some((l) => /Wipe your boots/.test(l.t));
      out.topics = /Massday/.test(NPCS.p46_marrit.topics.Oakhaven) && TOPIC_KEYS.includes('Oakhaven') && TOPIC_KEYS.includes('Governor Vance') && TOPIC_KEYS.includes('Kaelen Vance');
      return out;
    });
    check(house.free && house.step && house.table, 'the step the town tells both ways, and a long table laid at the head for one');
    check(house.desk, 'the Governor\'s desk: the lease worn soft at the signature, and the famine winter\'s list in his hand');
    check(house.roots && house.rootsOnce, 'his dressing-table keeps the hidden roots: linen squares, the hand-glass face down, the Grafters\' note (logbook once)');
    check(house.marrit && house.greet && house.topics, 'Marrit Pell keeps the house and answers the game\'s own topics');
    await shot('p46-hall', () => { T.go('p46_house', 8.5, 8.8, -1.1, 0.8); T.step(1); });
    await shot('p46-study', () => { T.go('p46_house', 3.4, 5.2, 2.2, 0.8); T.step(1); });

    // ---- the aired room
    const room = await page.evaluate(() => {
      const out = {}, f = G.flags;
      window.__msgs.length = 0; f.p46_room = false;
      T.go('p46_room', null, null, 0, 0.8); T.step(1);
      out.seen = f.p46_room === true && T.heard(/aired again, in autumn/);
      const lk = (re) => G.ents.some((e) => re.test(e.look || ''));
      out.bed = lk(/changed this week/); out.window = lk(/It is not spring/); out.drawings = lk(/174/) && lk(/root drawn like a heart/); out.letter = lk(/Conservatory of Bores/);
      const coat = G.ents.find((e) => e.use === 'p46_coat');
      const ev = T.use(coat); out.coatShut = /leave it where it hangs/.test(ev.b) && ev.c.length === 1 && !G.has('p46_coat');
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      return out;
    });
    check(room.seen && room.free, 'the aired room: as he left it, and aired again in autumn');
    check(room.bed && room.window && room.drawings && room.letter, 'the bed made this week, the window open on a day that is not spring, the boy\'s drawings of bores, the Conservatory\'s letter');
    check(room.coatShut, 'the coat on the peg stays where it hangs until the Governor asks');
    await shot('p46-room', () => { T.go('p46_room', 4.5, 5.2, -1.75, 0.45); T.step(1); });

    // ---- "The Coat on the Peg"
    const coat = await page.evaluate(() => {
      const out = {}, f = G.flags;
      const q0 = NPCS.aldric.quest;
      T.go('greenhall', null, null, 0, 0.8); T.step(1);
      let t = T.talkTo('aldric');
      out.ask = f.p46_ask === true && t.log.some((l) => /It isn't spring/.test(l.t) && /Leave it on the step/.test(l.t)) && G.journal.some((j) => /The Coat on the Peg/.test(j.text));
      out.restored = NPCS.aldric.quest === q0;
      t = T.talkTo('aldric'); out.quietAfter = !t.ch && !GOVERNOR46.aldricReady(f);
      // not outside the Greenhall (the Rite and the rope have their own Aldric)
      T.go('oakhaven', 37.5, 9.5, 0, 0.8); out.onlyHall = !GOVERNOR46.aldricReady(Object.assign({}, f, { p46_ask: false }));
      T.go('p46_room', null, null, 0, 0.8); T.step(1);
      const peg = G.ents.find((e) => e.use === 'p46_coat');
      let ev = T.use(peg); out.take = T.pick(ev, /fold it over your arm/) && G.has('p46_coat') && GOVERNOR46.stage() === 1;
      ev = T.use(peg); out.peg = /empty peg/.test(ev.b);
      // the hut's step
      T.go('clearing', 12.55, 16.5, Math.PI, 0.8); T.step(1);
      out.atDoor = GOVERNOR46.atHutDoor();
      window.__ev.length = 0; interact(); ev = window.__ev[window.__ev.length - 1];
      out.offered = !!ev && /coat is folded over your arm/.test(ev.b);
      T.pick(ev, /Put it down on the step/); ev = window.__ev[window.__ev.length - 1];
      out.left = GOVERNOR46.stage() === 2 && !G.has('p46_coat') && /says nothing at all/.test(ev.b) && G.journal.some((j) => /left the coat on the step/.test(j.text));
      out.parcel = G.map.entities.filter((e) => e._p46 === 'step' && e.transient).length === 1;
      T.go('oakhaven', 23.5, 3.0, 0, 0.8); T.go('clearing', 20.5, 32.5, 0, 0.8); out.parcelOnce = G.map.entities.filter((e) => e._p46 === 'step').length === 1;
      window.__ev.length = 0; interact(); out.noSecond = !window.__ev.some((x) => /coat is folded/.test(x.b));
      // telling the Governor
      T.go('greenhall', null, null, 0, 0.8); T.step(1);
      const xp0 = G.player.xp;
      const e = G.ents.find((o) => o.kind === 'npc' && o.id === 'aldric'); talk(e);
      out.well = DLG.log.some((l) => /Well\?/.test(l.t)) && Array.isArray(DLG.choices) && DLG.choices.length === 2;
      const reply = DLG.choices[0].f(G); try { document.getElementById('d-bye').click(); } catch (err) { /* none */ } G.state = 'play';
      out.told = /I didn't think he would/.test(reply) && f.p46_told === true && GOVERNOR46.stage() === 3 && G.player.xp >= xp0 + 40 && G.journal.some((j) => /I didn't think he would/.test(j.text));
      out.restored2 = NPCS.aldric.quest === q0;
      return out;
    });
    check(coat.ask && coat.restored && coat.quietAfter && coat.onlyHall, 'once you have seen the room, Aldric asks you to take the coat out to the hut, only in the Greenhall; his quest function is unchanged');
    check(coat.take && coat.peg, 'the coat comes down off the peg once he has asked; the peg is left empty');
    check(coat.atDoor && coat.offered && coat.left && coat.parcel && coat.parcelOnce && coat.noSecond, 'at the hut the coat goes on the step; Kaelen leaves it unopened and says nothing; it lies there after');
    check(coat.well && coat.told && coat.restored2, 'tell the Governor, and he says "No. I didn\'t think he would." (40 xp)');
    await shot('p46-step', () => { T.go('clearing', 13.6, 17.4, Math.PI + 0.5, 0.45); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });

    // ---- the Greening closes the house and the errand; the maps survive a save
    const close = await page.evaluate(() => {
      const out = {}, f = G.flags, keep = JSON.parse(JSON.stringify(f));
      for (const [s, re] of [[1, /still have Kaelen's old coat/], [2, /never told the Governor/], [0, /still on the peg/]]) {
        for (const k of Object.keys(f)) delete f[k]; Object.assign(f, keep);
        f.p46_ask = true; f.p46_told = false; f.p46_closed = false; f.p46_coat = s; f.greening = true;
        const n = G.journal.length; T.go('greenhall', null, null, 0, 0.5); T.step(2); T.step(2);
        out['c' + s] = G.journal.length === n + 1 && re.test(G.journal[0].text);
      }
      GOVERNOR46.syncOak(G.maps.oakhaven);
      const c = G.maps.oakhaven.get(37, 7); out.shut = !c.portal && c.locked === '__never' && /Root has come through/.test(c.lockMsg);
      GOVERNOR46.syncStep(G.maps.clearing); out.noParcel = !G.maps.clearing.entities.some((e) => e._p46);
      out.noAsk = !GOVERNOR46.aldricReady(Object.assign({}, f, { p46_ask: false, p46_room: true }));
      for (const k of Object.keys(f)) delete f[k]; Object.assign(f, keep);
      GOVERNOR46.syncOak(G.maps.oakhaven); out.reopen = T.portalAt('oakhaven', 37, 7) === 'p46_house';
      T.go('p46_room', null, null, 0, 0.5);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p46_room' && G.flags.p46_coat === 3;
      return out;
    });
    check(close.c0 && close.c1 && close.c2, 'at the Greening an unfinished errand closes with one logbook line, whichever way it stood');
    check(close.shut && close.noParcel && close.noAsk && close.reopen, 'from the Greening on, the door is shut under the green and nothing more is asked');
    check(close.saved, 'a save made in the aired room loads back there');

    // ---- French for every new string
    const tsv = src('tools/i18n/p46-governor.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => GOVERNOR46.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R5 GOVERNOR TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
