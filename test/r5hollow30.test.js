// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r5hollow30.test.js
// Release road R5a (js/hollow30.js): the Hollow behind the tannery, and the Carders' house with its root-cellar. Each joins
// a map that is already reachable, keeps the Hedge rule, closes cleanly when Oakhaven is left, and has French.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /hollow30/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof HOLLOW30 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Hollow Tester');
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

    // ---- the ways in: the tannery's back door, and the Carders' blue door halfway down the Hollow's lane (MS ch. 6, 11)
    const ways = await page.evaluate(() => {
      const H = HOLLOW30, out = {};
      out.tannery = T.portalAt('tannery', H.TANNERY_DOOR[0], H.TANNERY_DOOR[1]);
      out.carders = T.portalAt('p30_hollow', H.CARDERS_DOOR[0], H.CARDERS_DOOR[1]);
      { const c = G.maps.oakhaven.get(37, 7); out.oakBarred = !c.portal || c.portal.map === 'p46_house'; }   // the old north-row door no longer leads to the Carders (it is the Governor's house since R5 #5, js/governor46.js)
      out.blue = G.maps.p30_hollow.get(H.CARDERS_DOOR[0], H.CARDERS_DOOR[1]).tex === 't_p30_bluedoor' && !!Engine.textures.t_p30_bluedoor;
      out.back = T.portalAt('p30_hollow', 13, 0) === 'tannery' && T.portalAt('p30_carders', 3, 6) === 'p30_hollow' && T.portalAt('p30_carders', 6, 3) === 'p30_cellar' && T.portalAt('p30_cellar', 0, 3) === 'p30_carders';
      // every portal lands on open ground
      const lands = [];
      for (const id of ['p30_hollow', 'p30_carders', 'p30_cellar', 'tannery', 'oakhaven']) {
        const m = G.maps[id];
        for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (!c || !c.portal || !/^p30_|^tannery$|^oakhaven$/.test(c.portal.map) || !G.maps[c.portal.map]) continue; if (!/^p30_/.test(c.portal.map) && !/^p30_/.test(id)) continue; const t = G.maps[c.portal.map]; lands.push([id + '>' + c.portal.map, !t.isBlocked(Math.floor(c.portal.x), Math.floor(c.portal.y))]); }
      }
      out.lands = lands; out.allLand = lands.length >= 6 && lands.every((l) => l[1]);
      out.law = LAW_MAPS.has('p30_hollow') && LAW_MAPS.has('p30_carders');
      out.danger = G.maps.p30_hollow.danger === 0 && G.maps.p30_cellar.danger === 0 && G.maps.p30_cellar.siphoned === true;
      return out;
    });
    check(ways.tannery === 'p30_hollow' && ways.carders === 'p30_carders' && ways.blue && ways.back && ways.oakBarred, 'the tannery\'s back door opens on the Hollow, and the blue door halfway down its lane on the Carders\' house; each leads back, and the north row has no Carders\' door');
    check(ways.allLand, 'every new doorway lands on open ground (' + JSON.stringify(ways.lands) + ')');
    check(ways.law && ways.danger, 'the Hedge rule holds: the Narrow law reaches the Hollow and the house, nothing hunts there, and the cellar is siphoned');

    // ---- the Hollow: its doors, its marks, Lissa, the burl-sick and the book
    const hol = await page.evaluate(() => {
      const out = {};
      window.__msgs.length = 0;
      T.go('tannery', 11.5, 8.5, Math.PI / 2, 0.45); G.day = 2;
      T.go('p30_hollow', null, null, 0, 0.45); T.step(2);
      out.hum = T.heard(/The Hollow hums/);
      const m = G.map, e = m.entities;
      out.doors = HOLLOW30.HDOORS.every(([x, y]) => { const c = m.get(x, y); return c && c.door && c.locked === '__never' && /barley/.test(c.lockMsg); });
      out.marks = e.filter((o) => o.sprite === 'p30_sapmark').length; out.pencils = e.filter((o) => o.use === 'p30_door').length;
      out.lissa = !!e.find((o) => o.kind === 'npc' && o.id === 'p30_lissa');
      out.burl = e.filter((o) => o.sprite === 'burlsick' && o.look).length;
      out.book = !!e.find((o) => o.use === 'p30_book');
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      out.noGrafters = !e.some((o) => o._p30);
      // Lissa says who she is once
      G.flags.p30_lissa_met = false; const q = NPCS.p30_lissa.quest(G); out.lissaFirst = !!q && /tin|cup/.test(q.text) && /Merrow/.test(q.text);
      out.lissaVoice = !!(VOICES.PEOPLE && VOICES.PEOPLE.p30_lissa);
      return out;
    });
    check(hol.hum && hol.doors && hol.free, 'the Hollow hums behind barred doors; you come in on open ground');
    check(hol.marks >= 9 && hol.pencils === 2 && hol.book, 'doors past cutting carry the sap-mark; two are pencilled; Rooke\'s book is chained at the well-head');
    check(hol.lissa && hol.lissaFirst && hol.lissaVoice && hol.burl === 3 && hol.noGrafters, 'Lissa Merrow sits on her step with her cup; three of the burl-sick sit out; no Grafters on an ordinary day');
    await shot('p30-hollow', () => { T.go('p30_hollow', 12.6, 10.6, -0.12, 0.45); T.step(1); });
    await shot('p30-lissa', () => { T.go('p30_hollow', 7.5, 10.3, Math.PI / 2, 0.45); T.step(1); });
    await shot('p30-carders', () => { T.go('p30_carders', 3.6, 5.3, -Math.PI / 2 - 0.25, 0.5); T.step(1); });
    await shot('p30-cellar', () => { G.flags.p30c_told = true; T.go('p30_cellar', 2.6, 3.6, -0.3, 0.5); T.step(1); });

    // ---- the Grafters' visit: Rootday mornings only, and never saved
    const graft = await page.evaluate(() => {
      const out = {};
      window.__msgs.length = 0;
      G.day = 1; T.go('p30_hollow', 13.5, 4.5, Math.PI / 2, 9 / 24); T.step(2);
      out.on = ['wagon', 'g0', 'g1', 'g2', 'leg'].every((k) => G.ents.some((o) => o._p30 === k && o.transient));
      { const w = G.ents.find((o) => o._p30 === 'wagon'); out.on = out.on && w.sprite === 'p30_wagon' && !!Engine.sprites.p30_wagon && !!w.lightCol; }   // the white wagon and its two horses, the brazier's light on its bed
      out.grafters = G.ents.filter((o) => o._p30 && /^g\d$/.test(o._p30)).length === 3;
      out.seen = T.heard(/Grafters' white wagon is in the Hollow/);
      out.saved = !JSON.stringify(snapshotGame().maps.p30_hollow || {}).includes('_p30');
      out.lissa = /look at them/.test((NPCS.p30_lissa.quest(G) || {}).text || '');
      G.tod = 15 / 24; T.step(1); out.afternoon = !G.ents.some((o) => o._p30);
      G.day = 2; G.tod = 9 / 24; T.step(1); out.hearthday = !G.ents.some((o) => o._p30);
      return out;
    });
    check(graft.on && graft.grafters && graft.seen, 'on Rootday morning the white wagon with its two horses and the brazier on its bed, three masked Grafters and a Legionnaire come into the Hollow');
    check(graft.saved && graft.afternoon && graft.hearthday && graft.lissa, 'they are gone by afternoon and on other days, never saved; Lissa tells you not to look at them');
    await shot('p30-rootday', () => { G.day = 1; T.go('p30_hollow', 13.0, 12.2, Math.PI / 2 - 0.35, 9 / 24); T.step(2); });

    // ---- "The List"
    const list = await page.evaluate(() => {
      const out = {}, f = G.flags, p = G.player;
      G.day = 2; T.go('p30_hollow', 18.5, 14.5, Math.PI / 2, 0.45); T.step(1);
      const book = T.find((o) => o.use === 'p30_book'), doors = G.map.entities.filter((o) => o.use === 'p30_door');
      let ev = T.use(book); out.read = !!ev && /FOR THE INQUISITOR/.test(ev.b) && T.pick(ev, /keep it in mind/) && f.p30h_q === 1;
      ev = T.use(book); out.notYet = !ev.c.some((c) => /Recheck/.test(c.t)) && /0 of the two/.test(ev.b);
      // the first door: no tending note, no honey — nothing to offer but leaving
      const songs = p.songs.slice(), voice = p.voice;
      p.songs = p.songs.filter((s) => s !== 'tending'); p.inv = p.inv.filter((s) => s.id !== 'honey');
      ev = T.use(doors[0]); out.nothing = ev.c.length === 1;
      // the tending note through it
      if (!p.songs.includes('tending')) p.songs.push('tending'); p.voice = 20;
      ev = T.use(doors[0]); out.tended = T.pick(ev, /tending note/) && f['p30h_d' + doors[0].door] === 1 && p.voice === 12;
      // honey through the other
      G.give('honey'); ev = T.use(doors[1]); out.honey = T.pick(ev, /honey/) && f['p30h_d' + doors[1].door] === 1 && !G.has('honey');
      ev = T.use(doors[1]); out.again = /on your note/.test(ev.b);
      const xp0 = p.xp, rep0 = (p.factions && p.factions.hedge) || 0;
      ev = T.use(book); out.write = T.pick(ev, /Recheck next month/) && f.p30h_done === true && p.xp >= xp0 + 40 && p.factions.hedge === rep0 + 3;
      out.journal = G.journal.some((j) => /Recheck next month/.test(j.text));
      ev = T.use(book); out.after = /nearly Rooke/.test(ev.b);
      out.thanks = /did not chalk them/.test((NPCS.p30_lissa.quest(G) || {}).text || '');
      p.songs = songs; p.voice = voice;
      return out;
    });
    check(list.read && list.notYet, 'Rooke\'s book starts "The List": two pencilled households, the Inquisitor wants it by Rootday');
    check(list.nothing && list.tended && list.honey && list.again, 'each pencilled door takes the tending note (8 voice) or a jar of honey; without either there is nothing to offer');
    check(list.write && list.journal && list.after && list.thanks, '"Recheck next month" in the book closes it (40 xp, the Hedge thinks better of you); Lissa says Rooke did not chalk them');

    // ---- the Carders' house and the root-cellar
    const house = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p30_carders', null, null, 0, 0.5); T.step(1);
      const e = G.map.entities;
      out.parts = ['p30_hearth', 'p30_pallet'].every((u) => e.some((o) => o.use === u)) && e.some((o) => /KEEP HIS HANDS WARM/.test(o.look || '')) && e.some((o) => o.sprite === 'lamp' && o.glow > 0);
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      // before Nell asks, the hearth has no brick to give
      let ev = T.use(e.find((o) => o.use === 'p30_hearth')); out.noBrick = ev.c.length === 1;
      window.__msgs.length = 0; G.flags.p30c_told = false;
      T.go('p30_cellar', null, null, 0, 0.5); T.step(1);
      out.tutorial = T.heard(/hush-lamp at the stair foot keeps it off/) && T.heard(/falling fifth stops them/);
      out.lampHolds = typeof NARROW28 !== 'undefined' && NARROW28.lampNear(Engine.cam.x, Engine.cam.y);
      const mites = G.ents.filter((o) => o.kind === 'enemy' && o.type === 'mites');
      out.mites = mites.length === 3 && mites.every((m) => !m.dead);
      return out;
    });
    check(house.parts && house.free && house.noBrick, 'the Carders\' house: banked hearth, the pallet away from the wall, Lyra\'s chalk note, a lamp in the window');
    check(house.tutorial && house.lampHolds && house.mites, 'the root-cellar teaches the Hush and the mites: a hush-lamp at the stair foot, three mites in the damp');

    // ---- "Keep him out of the damp"
    const damp = await page.evaluate(() => {
      const out = {}, f = G.flags, p = G.player;
      // Nell's own quest is left exactly as it was; the house is asked about only through talking to her
      out.untouched = NPCS.nell.quest({ flags: { pim_safe: true } }) === null;
      T.go('mill', null, null, 0, 0.5); T.step(1);
      const nell = G.ents.find((o) => o.kind === 'npc' && o.id === 'nell');
      f.pim_safe = false; talk(nell); out.before = !f.p30c_q; G.state = 'play';
      f.pim_safe = true; talk(nell); out.offer = f.p30c_q === 1 && G.journal.some((j) => /blue door/.test(j.text)) && DLG.log.some((l) => /hot brick/.test(l.t)); G.state = 'play';
      out.restored = NPCS.nell.quest({ flags: { pim_safe: true } }) === null;
      // the brick
      T.go('p30_carders', null, null, 0, 0.5); T.step(1);
      let ev = T.use(G.ents.find((o) => o.use === 'p30_hearth')); out.brick = T.pick(ev, /hot brick/) && f.p30c_brick === 1;
      ev = T.use(G.ents.find((o) => o.use === 'p30_pallet')); out.warm = T.pick(ev, /brick in the pallet/) && f.p30c_warm === 1 && !f.p30c_brick;
      out.mitesLeft = /mites are still/.test(HOLLOW30.nellAsks(G).text);
      // the mites
      T.go('p30_cellar', null, null, 0, 0.5); T.step(1);
      window.__msgs.length = 0;
      for (const m of G.ents.filter((o) => o.kind === 'enemy' && o.type === 'mites')) killEnemy(m, false);
      T.step(2); out.quiet = f.p30c_mites === 1 && T.heard(/cellar goes quiet/);
      // back to Nell
      const gold0 = p.gold, xp0 = p.xp;
      T.go('mill', null, null, 0, 0.5); T.step(1);
      talk(G.ents.find((o) => o.kind === 'npc' && o.id === 'nell'));
      out.done = f.p30c_q === 2 && p.gold === gold0 + 6 && p.xp >= xp0 + 30 && G.journal.some((j) => /dry and warm/.test(j.text));
      G.state = 'play';
      out.once = HOLLOW30.nellAsks(G) === null;
      // a save made in the cellar loads back there, the mites still dead
      T.go('p30_cellar', null, null, 0, 0.5);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p30_cellar' && G.ents.filter((o) => o.kind === 'enemy' && o.type === 'mites').every((m) => m.dead);
      return out;
    });
    check(damp.untouched && damp.restored && damp.before && damp.offer, 'once Pim is safe, Nell asks for the house to be made fit for him (her own quest function is unchanged)');
    check(damp.brick && damp.warm && damp.mitesLeft && damp.quiet, 'a hot brick from the hearth goes into the pallet; clearing the cellar quiets it');
    check(damp.done && damp.once && damp.saved, 'Nell pays once when the house is dry and warm; a save in the cellar loads back there with the mites still dead');

    // ---- leaving closes them cleanly, and the Greening puts the Hollow under bramble
    const leave = await page.evaluate(() => {
      const out = {}, f = G.flags, keep = Object.assign({}, f);
      f.p30h_q = 1; f.p30h_done = false; f.p30h_closed = false; f.p30c_q = 1; f.p30c_closed = false;
      T.go('oakhaven', 37.5, 9.5, -Math.PI / 2, 0.5); T.step(1);
      out.open = !f.p30h_closed && !f.p30c_closed;
      f.greening = true; T.step(1);
      out.closed = f.p30h_closed && f.p30c_closed && G.journal.some((j) => /gone under the bramble/.test(j.text)) && G.journal.some((j) => /never got its brick/.test(j.text));
      const n = G.journal.length; T.step(2); out.once = G.journal.length === n;
      HOLLOW30.syncTannery(G.maps.tannery); const c = G.maps.tannery.get(11, 9); out.bramble = !c.portal && /bramble/.test(c.lockMsg);
      const oak = buildOakhaven(true); out.barred = !oak.get(37, 7).portal;
      out.nell = HOLLOW30.nellAsks(G) === null;
      for (const k of Object.keys(f)) delete f[k]; Object.assign(f, keep);
      HOLLOW30.syncTannery(G.maps.tannery); out.reopen = T.portalAt('tannery', 11, 9) === 'p30_hollow';
      return out;
    });
    check(leave.open && leave.closed && leave.once, 'leaving Oakhaven closes both quests with one logbook line each');
    check(leave.bramble && leave.barred && leave.nell && leave.reopen, 'at the Greening the Hollow is under bramble, the blue door barred, and Nell asks nothing more');

    // ---- French for every new string
    const tsv = src('tools/i18n/p30-hollow.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => HOLLOW30.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R5a TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
