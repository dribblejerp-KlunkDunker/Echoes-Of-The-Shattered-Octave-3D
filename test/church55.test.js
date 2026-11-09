// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/church55.test.js
// The Church comes up the road, played (js/church55.js; Book One ch. 7; ROADMAP R9 item 13): the gate at sunrise on
// Dawnday, the column down the main road, a noise heard, the warrant and Lyra's guards, the well-house (glassed or not),
// arriving in the hour, missing it (days35's message instead), the Pure Note over the town, and French.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

async function newGame(page) {
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof CHURCH55 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Gate Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play');
  await page.evaluate(() => {
    window.__msgs = []; const _m = window.msg; window.msg = function (t) { window.__msgs.push(String(t)); return _m.apply(this, arguments); };
    window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
    window.__base = JSON.parse(JSON.stringify(snapshotGame()));
    window.T = {
      reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; },
      step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.05); } },
      last() { return window.__ev[window.__ev.length - 1] || null; },
      pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
      heard(re) { return window.__msgs.some((t) => re.test(t)); },
      keys() { return G.map.entities.filter((e) => e._p55).map((e) => e._p55); },
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /church55|days35|audit54/.test(m.text())) errors.push('console: ' + m.text()); });
    await newGame(page);

    // ---- in Oakhaven at sunrise on Dawnday: days35 holds its message, the gate card, the gatehouse
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.day = 5; G.tod = 5.9 / 24; loadMap('oakhaven', { x: 23.5, y: 14.5, dir: 0 }); T.step(2);
      out.before = CHURCH55.stage() === 0 && !G.flags.church_come;
      G.tod = 6.05 / 24; T.step(2);
      const ev = T.last();
      out.card = CHURCH55.stage() === 1 && !!ev && /Singing, on the Greenroot road/.test(ev.b) && /hands over their mouths/.test(ev.b) && ev.c.length === 2;
      out.noDays35 = !T.heard(/At sunrise the Church comes up the Greenroot road/) && G.flags.church_come === true;
      T.pick(/gatehouse/); T.step(2);
      out.gatehouse = G.flags.p55_way === 1 && Math.abs(Engine.cam.x - CHURCH55.GATEHOUSE.x) < 0.5 && Math.abs(Engine.cam.y - CHURCH55.GATEHOUSE.y) < 0.5;
      const k = T.keys(); out.staged = k.includes('crane') && k.includes('herald') && k.filter((x) => /^ch\d/.test(x)).length === 16 && k.filter((x) => /^fl/.test(x)).length === 6 && k.includes('harrow') && G.map.entities.filter((e) => e._p55).every((e) => e.transient);
      out.coming = T.heard(/Five hundred and twenty-eight/);
      // the road is clear: townsfolk standing in it step aside
      out.aside = !G.map.entities.some((e) => e.kind === 'npc' && !e.hidden && Math.abs(e.x - CHURCH55.ROAD_X) < 1.7 && e.y > 2 && e.y < CHURCH55.STOP_Y + 2);
      // it walks; nobody is drawn inside the gate's stone; a noise is heard
      T.step(60);
      const figs = G.map.entities.filter((e) => e._p55 && e._row != null);
      out.walks = CHURCH55.state().head > 3 && figs.every((e) => !(G.map.get(Math.floor(e.x), Math.floor(e.y))) || e.hidden);
      out.creak = T.heard(/Creak\. The censer/);
      G.noise = 9; T.step(1);
      out.heardGate = G.flags.p55_heard === true && T.heard(/A Flambeau's hood turns/) && (AUDIT54.logged() & AUDIT54.BITS.gate) !== 0;
      return out;
    });
    check(r.before && r.card && r.noDays35, 'at sunrise on Dawnday in Oakhaven: the gate card, and days35 holds its message for it');
    check(r.gatehouse && r.staged && r.coming && r.aside, 'to the gatehouse: Harrow and the north side, the Inquisitor, the herald, sixteen of the choir and six Flambeaux (transient); the road is cleared');
    check(r.walks && r.creak, 'the column comes down the road; nobody is drawn inside the gate\'s stone; the censer creaks');
    check(r.heardGate, 'a noise while it passes: a Flambeau\'s hood turns, and the bells log it for the Factor');

    // ---- the warrant, Lyra's guards, the well-house
    r = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < 600 && CHURCH55.stage() === 1 && (!T.last() || T.last().t !== 'The warrant'); i++) T.step(1);
      const ev = T.last();
      out.warrant = !!ev && ev.t === 'The warrant' && /Pure Note be held over the town of Oakhaven without end/.test(ev.b) && /In the Church's protection/.test(ev.b) && G.journal.some((j) => /The Church came up the Greenroot road at sunrise on Dawnday, and I was at the North Gate/.test(j.text));
      out.lyra = T.keys().includes('lyra') && T.keys().includes('leg0') && T.keys().includes('leg1');
      T.pick(/Watch/); T.step(100);
      out.filed = CHURCH55.stage() === 2 && !T.keys().some((k) => /^ch\d|^fl|^crane$|^harrow$/.test(k)) && T.heard(/like a lid/);
      const L = G.map.entities.find((e) => e._p55 === 'leg0'); out.legsMoved = !!L && Math.hypot(L.x - L._to[0], L.y - L._to[1]) < 0.05;
      out.npcsBack = G.map.entities.some((e) => e.kind === 'npc' && !e.hidden && Math.abs(e.x - CHURCH55.ROAD_X) < 1.7 && e.y > 2 && e.y < CHURCH55.STOP_Y + 2);
      out.well = T.keys().includes('kaelen') && T.keys().includes('crane2');
      Engine.cam.x = CHURCH55.WELL.kaelen[0]; Engine.cam.y = CHURCH55.WELL.kaelen[1] - 1.5; T.step(2);
      const w = T.last();
      out.wellCard = CHURCH55.stage() === 3 && /It let go because they held/.test(w.b) && /I have <i>held<\/i> it/.test(w.b) && G.journal.some((j) => /At the well-house, afterwards/.test(j.text));
      out.glassAsk = G.player.glassed ? /Do you know what the Church calls men like you/.test(w.b) && w.c.length === 3 : !/Do you know what the Church calls/.test(w.b) && w.c.length === 1;
      return out;
    });
    check(r.warrant && r.lyra, 'the herald reads the book\'s warrant; Lyra at the mouth of Cooper\'s Row and two Legionnaires come for her');
    check(r.filed && r.legsMoved && r.npcsBack, 'the choir files into the chapel ("like a lid"); her guards take their places; the townsfolk are back in the road');
    check(r.well && r.wellCard && r.glassAsk, 'at the well-house: "It let go because they held"; the glassed are asked what the Church calls them');

    // ---- glassed, the other way; arriving in the hour; missing it; the drone
    r = await page.evaluate(() => {
      const out = {};
      // the glassed question, answered
      T.reset(); G.player.glassed = true; G.day = 5; G.tod = 6.1 / 24; loadMap('clearing'); T.step(1);
      out.heldInClearing = !G.flags.church_come && CHURCH55.holds();
      loadMap('oakhaven', { x: 23.5, y: 14.5, dir: 0 }); T.step(1);
      out.arrive = CHURCH55.stage() === 1 && /Singing/.test(T.last().b);
      T.pick(/where you are/); out.way = G.flags.p55_way === 2;
      CHURCH55.warrant(); T.pick(/Watch/); CHURCH55.wellHouse();
      T.pick(/It let go because they held/);
      out.glass = G.flags.p55_glass === 2 && /Two of you/.test(T.last().b);
      // missing it: elsewhere until the hour is out, and days35's message stands
      T.reset(); G.day = 5; G.tod = 6.1 / 24; loadMap('clearing'); T.step(1);
      G.tod = 7.6 / 24; T.step(2);
      out.missed = G.flags.church_come === true && CHURCH55.stage() === 9 && T.heard(/At sunrise the Church comes up the Greenroot road/);
      loadMap('oakhaven', { x: 23.5, y: 14.5, dir: 0 }); T.step(2);
      out.noLate = !window.__ev.some((e) => /Singing, on the Greenroot road/.test(e.b));
      // the Pure Note over the town until the Rite
      out.drone = (Audio_.hums && Audio_.ready) ? (Audio_.hums.p55_note || 0) > 0 : true;
      G.flags.rite_started = true; T.step(2);
      out.droneOff = (Audio_.hums && Audio_.ready) ? !(Audio_.hums.p55_note > 0) : true;
      return out;
    });
    check(r.heldInClearing && r.arrive && r.way, 'elsewhere at six, days35 holds it; come into Oakhaven in the hour and you are there for it');
    check(r.glass, 'glassed: tell the Inquisitor it let go because they held, and he goes still: "Two of you"');
    check(r.missed && r.noLate, 'miss the hour and days35\'s message stands; nothing replays later');
    check(r.drone && r.droneOff, 'the Pure Note hums over Oakhaven until the Rite');

    // ---- French for every new string
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/p55-church.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => CHURCH55.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL CHURCH55 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
