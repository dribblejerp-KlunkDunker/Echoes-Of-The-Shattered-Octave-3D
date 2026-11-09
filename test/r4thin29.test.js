// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r4thin29.test.js
// Release road R4, "Fill the thin places" (js/thin29.js): every listed map has people, something to use and a reason to
// be there. Set SHOT_DIR to also write a screenshot of each place.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /thin29/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof THIN29 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Thin Tester');
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
        // a place is filled when it has people to talk to and something to use
        census(ids) { const e = G.map.entities.filter((o) => !o.dead && !o.hidden); return { people: e.filter((o) => o.kind === 'npc' && NPCS[o.id]).map((o) => o.id), uses: e.filter((o) => o.use || (o.kind === 'npc' && NPCS[o.id] && NPCS[o.id].shop)).length, ids: ids ? ids.every((id) => e.some((o) => o.id === id)) : true }; },
      };
    });
    const shot = async (name) => {
      if (!SHOTS) return;
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- Oakhaven's barred doors: the baker's and the chandler's open
    const oak = await page.evaluate(() => {
      const m = G.maps.oakhaven, out = {};
      for (const [k, [x, y]] of Object.entries(THIN29.OAK_DOORS)) out[k] = m.get(x, y) && m.get(x, y).portal && m.get(x, y).portal.map;
      T.go('p29_bakery', null, null, 0, 0.1); out.bakery = Object.assign(T.census(['p29_agnes']), { free: !solidAt(Engine.cam.x, Engine.cam.y), back: G.map.get(5, 6).portal.map });
      T.go('p29_chandler', null, null, 0, 0.5); out.chandler = Object.assign(T.census(['p29_ambrose']), { back: G.map.get(0, 4).portal.map });
      out.shops = [NPCS.p29_agnes.shop.map((s) => s.item).join(), NPCS.p29_ambrose.shop.map((s) => s.item).join()];
      out.bread = !!ITEMS.p12_hearth_bread && !!ITEMS.whistle && !!ITEMS.bandage;
      return out;
    });
    check(oak.bakery && oak.chandler && oak.bakery.ids && oak.chandler.ids && oak.bakery.free, 'the baker\'s and the chandler\'s doors open onto rooms with their keepers in them');
    check(oak.bread && /p12_hearth_bread/.test(oak.shops[0]) && /whistle/.test(oak.shops[1]) && oak.bakery.back === 'oakhaven' && oak.chandler.back === 'oakhaven', 'Agnes Tull sells bread, Ambrose Vettle hush-whistles; both doors lead back to the street');
    await page.evaluate(() => T.go('p29_bakery', null, null, 0, 23 / 24)); await shot('p29-bakery');

    // ---- the thin maps: people, something to use, a reason
    const places = [
      ['p20_downs', 29.2, 31.4, Math.PI / 2, 0.45, ['p29_abel']],
      ['p22_bellwether', null, null, 0, 0.6, ['p22_gideon']],
      ['p22_combe', 36.0, 19.0, Math.PI / 2, 0.45, ['p22_tamar']],
      ['p29_farmhouse', 6.5, 4.4, Math.PI, 0.5, ['p29_hurst']],
      ['p29_barn', 4.5, 4.5, 0, 0.5, ['p29_jem']],
      ['flume_road', 8.5, 14.0, Math.PI, 0.45, ['p29_ennis']],
      ['tannery', null, null, 0, 0.5, ['p29_sim', 'p29_moll']],
      ['flume_lowrings', 23.8, 10.8, 0, 0.45, ['p29_gil', 'p29_ysolde']],
      ['flume_landing', 16.5, 9.5, Math.PI / 2, 0.45, ['p29_corvin', 'p29_prue']],
    ];
    for (const [id, x, y, dir, tod, who] of places) {
      const r = await page.evaluate(([id, x, y, dir, tod, who]) => { T.go(id, x, y, dir, tod); T.step(2); const c = T.census(who); c.danger = G.map.danger; return c; }, [id, x, y, dir, tod, who]);
      check(r.ids && r.people.length >= 1 && r.uses >= 1, id + ': people (' + r.people.join(', ') + ') and ' + r.uses + ' thing(s) to use');
      if (id === 'p20_downs') check(r.danger === 0, 'the Watch Downs stays danger 0 (Author Rulings 93-95)');
      await shot('p29-' + id.replace(/^p2\d_/, ''));
    }
    const built = await page.evaluate(() => { const D = buildAllMaps().p20_downs; return !D.entities.some((e) => e.kind === 'npc' || e.use) && D.danger === 0; });
    check(built, 'the Downs as built keeps no people or uses (horizon20\'s rule); they are placed on arrival');
    const nosheep = await page.evaluate(() => [NPCS.p29_abel.greet.normal, NPCS.p29_hurst.greet.normal].every((t) => /There are no sheep/.test(t)));
    check(nosheep, '"There are no sheep" has speakers: Abel Sedge on the Downs, Mother Hurst in the combe');
    const combe = await page.evaluate(() => { const m = G.maps.p22_combe, out = {}; for (const [k, [x, y]] of Object.entries(THIN29.COMBE_DOORS)) out[k] = m.get(x, y).portal && m.get(x, y).portal.map; return out; });
    check(combe.farm === 'p29_farmhouse' && combe.barn === 'p29_barn' && combe.cottage === 'p29_cottage', 'Wethercombe\'s farmhouse, barn and cottage open');

    // ---- the uses: the dew-pond once a day, the inn's room, a look, the sapling
    const uses = await page.evaluate(() => {
      const out = {}, p = G.player;
      T.go('p20_downs', 10.2, 33.0, Math.PI / 2, 0.45); T.step(2);
      const pond = G.ents.find((e) => e._p29 === 'pond'); p.hpMax = 100; p.hp = 50;
      window.__ev.length = 0; useDeco(pond); window.__ev[0].c[0].f(); out.pond1 = p.hp; window.__ev.length = 0; useDeco(pond); window.__ev[0].c[0].f(); out.pond2 = p.hp;
      T.go('p22_bellwether', null, null, 0, 0.6); T.step(2);
      const bed = G.ents.find((e) => e._p29 === 'bed'); p.gold = 2; window.__ev.length = 0; useDeco(bed); window.__ev[0].c[0].f(); out.broke = p.gold === 2 && G.openPanel !== 'rest';
      p.gold = 10; window.__ev.length = 0; useDeco(bed); window.__ev[0].c[0].f(); out.rented = p.gold === 7 && G.openPanel === 'rest'; closeModal(); G.state = 'play';
      const slate = G.ents.find((e) => e._p29 === 'slate'); window.__ev.length = 0; useDeco(slate); out.slate = /WOOLWIGHT/.test(window.__ev[0].b);
      T.go('oakhaven', 20.5, 27.5, Math.PI, 6 / 24); T.step(2);
      const sap = G.ents.find((e) => e._p29 === 'sapling'); out.sapling = !!sap;
      window.__ev.length = 0; useDeco(sap); window.__ev[0].c[0].f(); out.sawn = !G.ents.some((e) => e._p29 === 'sapling' || e._p29 === 'saw');
      G.day += 1; T.go('oakhaven', 20.5, 27.5, Math.PI, 6 / 24); T.step(2); out.again = G.ents.some((e) => e._p29 === 'sapling');
      G.tod = 14 / 24; T.step(2); out.afternoon = !G.ents.some((e) => e._p29 === 'sapling');
      return out;
    });
    check(uses.pond1 === 54 && uses.pond2 === 54, 'the dew-pond gives a drink once a day');
    check(uses.broke && uses.rented && uses.slate, 'the Bellwether rents a room for three (to the rest panel) and has its slate of tabs');
    check(uses.sapling && uses.sawn && uses.again && uses.afternoon, 'a sapling comes up on Cooper\'s Row each morning with the saw beside it; sawn, it is back the next day');

    // ---- Ennis Crowle and Telling the Bees
    const ennis = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), out = {};
      const q = (f) => { G.flags = Object.assign({}, keep, f); const r = NPCS.p29_ennis.quest(G); return r && r.text; };
      out.before = /tell the bees every birth/.test(q({}));
      out.during = /Three skeps, three tellings/.test(q({ p29_ennis_met: true, p9q_bees: 1 }));
      const n0 = (G.player.inv.find((s) => s.id === 'honey') || { n: 0 }).n || 0;
      out.after = /Somebody told Bettany's bees/.test(q({ p29_ennis_met: true, p9q_bees: 2, p9q_bees_done: true }));
      out.gift = ((G.player.inv.find((s) => s.id === 'honey') || { n: 0 }).n || 0) === n0 + 1 && G.flags.p29_ennis_gift;
      G.flags = keep;
      return out;
    });
    check(ennis.before && ennis.during && ennis.after && ennis.gift, 'Ennis Crowle\'s words follow Telling the Bees, and she gives a jar once the bees are home');

    // ---- the tannery's back door onto the Hollow
    const tan = await page.evaluate(() => { const c = G.maps.tannery.get(11, 9); return !!(c && c.door && ((c.portal && c.portal.map === 'p30_hollow') || (c.locked === '__never' && /Hollow/.test(c.lockMsg)))); });
    check(tan, 'the tannery has its back door onto the Hollow (open once R5 builds the Hollow)');

    // ---- small Oakhaven life
    const life = await page.evaluate(() => {
      const out = {};
      T.go('oakhaven', 30.5, 23.5, 0, 9.9 / 24); T.step(1);
      out.noTanker = !G.ents.some((e) => e._p29 === 'wagon');
      G.tod = 10.2 / 24; T.step(1); const w = G.ents.find((e) => e._p29 === 'wagon'); out.tanker = !!w && G.ents.filter((e) => /^leg[AB]$/.test(e._p29)).length === 2;
      const x0 = w && w.x; G.tod = 10.4 / 24; T.step(1); out.moves = w && w.x > x0; out.seen = T.heard(/tanker-wagon comes through/);
      G.tod = 11.99 / 24; T.step(1); window.__msgs.length = 0; G.tod = 12.01 / 24; T.step(1); out.noon = T.heard(/dog howls/);
      const W = Weather; const wind = Object.getOwnPropertyDescriptor(W, 'wind'); Object.defineProperty(W, 'wind', { configurable: true, get: () => 0.6 });
      window.__msgs.length = 0; G.tod = 15.5 / 24; T.step(1); out.chime = T.heard(/iron-oaks begin to ring/);
      if (wind) Object.defineProperty(W, 'wind', wind); else delete W.wind;
      T.go('oakhaven', 14.5, 9.5, -Math.PI / 2, 23 / 24); window.__msgs.length = 0; T.step(1); out.thump = T.heard(/punching the dough down/);
      T.go('oakhaven', 48.5, 13.5, -Math.PI / 2, 6 / 24); T.step(1); out.salt = G.ents.filter((e) => /^salt/.test(e._p29)).length === 3; out.sexton = G.ents.some((e) => e.id === 'p29_sexton');
      G.tod = 9 / 24; T.step(1); out.sextonGone = !G.ents.some((e) => e.id === 'p29_sexton');
      out.saved = !JSON.stringify(snapshotGame().maps.oakhaven || {}).includes('_p29');
      return out;
    });
    check(life.noTanker && life.tanker && life.moves && life.seen, 'the tanker-wagon crosses Oakhaven once a day with a Legionnaire at each end');
    check(life.noon && life.chime && life.thump, 'dogs howl at noon; the iron-oaks chime when the wind is up; the baker\'s wife\'s thumping carries at night');
    check(life.salt && life.sexton && life.sextonGone && life.saved, 'the sexton salts the chapel paths at dawn; none of the street life is saved');
    await page.evaluate(() => { T.go('oakhaven', 28.5, 23.5, 0, 10.35 / 24); T.step(1); }); await shot('p29-oakhaven-tanker');

    // ---- named routines: moved, never hidden
    const rt = await page.evaluate(() => {
      const out = {}, m = G.maps.oakhaven;
      T.go('oakhaven', 3.5, 3.5, 0, 12 / 24); T.step(1);
      const pos = (id) => { const e = m.entities.find((o) => o.id === id && !o.transient); return [e.x, e.y, !!e.hidden]; };
      out.day = { bettany: pos('bettany'), hob: pos('hob'), tam: pos('tam') };
      G.tod = 23 / 24; T.step(1);
      out.night = { bettany: pos('bettany'), hob: pos('hob'), tam: pos('tam') };
      out.moved = ['bettany', 'hob', 'tam'].every((id) => Math.hypot(out.day[id][0] - out.night[id][0], out.day[id][1] - out.night[id][1]) > 3);
      out.never = ['bettany', 'hob', 'tam'].every((id) => !out.day[id][2] && !out.night[id][2]);
      out.free = ['bettany', 'hob', 'tam'].every((id) => !solidAt(out.night[id][0], out.night[id][1], m.entities.find((o) => o.id === id)));
      // not while you stand by them
      G.tod = 12 / 24; T.go('oakhaven', 28.5, 27.5, 0, 12 / 24); const b = m.entities.find((o) => o.id === 'bettany' && !o.transient); b.x = 28.5; b.y = 29.2; b.homeX = 28.5; b.homeY = 29.2; THIN29.routines(false); out.held = b.x === 28.5;
      T.go('oakhaven', 3.5, 3.5, 0, 12 / 24); T.step(1);
      return out;
    });
    check(rt.moved && rt.never && rt.free, 'Bettany, Hob and Old Tam keep a day place and a night place, never hidden (' + JSON.stringify(rt.night) + ')');
    check(rt.held, 'nobody is moved while you stand close enough to see it');

    // ---- the rooms survive a save and the Greening shuts the town's doors again
    const save = await page.evaluate(() => {
      T.go('p29_barn', null, null, 0, 0.5); const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      const back = G.mapId === 'p29_barn';
      const keep = G.flags.greening; G.flags.greening = true; const oak = buildOakhaven(true); G.flags.greening = keep;
      return { back, greened: !oak.get(14, 7).portal };
    });
    check(save.back && save.greened, 'a save made in a new room loads back there; after the Greening the baker\'s is barred again');

    // ---- French for every new string
    const tsv = src('tools/i18n/p29-thin.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => THIN29.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R4 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
