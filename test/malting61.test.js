// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/malting61.test.js
// The Malting's front door and the Reach-displaced queue (js/malting61.js; R9 item 15; Book One ch. 18): the queue-yard
// between the Cloister road and the Malting; the first sight and the plan; the three halves (in at the front with Sable
// and Ansel Hay's eight seconds; the kiln end; the queue); people told what is in the first room walk off into the
// orchard; the clerk notices, and the bell rings early; Sable's line after; and French.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };
const frCheck = async (page, file, mod, label) => {
  const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/' + file), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
  const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
  const texts = await page.evaluate((m) => window[m].TEXTS, mod);
  const noFr = texts.filter((t) => !pairs.get(t));
  check(!noFr.length && tsv.every((x) => x.length === 2), label + ': every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /malting61|life60/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof MALTING61 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Queue Tester');
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
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); const f = G.flags; f.part3 = true; f.sable_joined = true; f.wg_plan = true; G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        yard() { loadMap('p61_yard'); G.state = 'play'; return G.map; },
        who(k) { return LIFE60.people(G.map).find((e) => e._life === 'q_' + k); },
        tell(k) { const e = T.who(k); talk(e); const i = DLG.choices ? DLG.choices.findIndex((c) => /first room/.test(c.t)) : -1; const ok = i >= 0; if (ok) document.querySelector('[data-choice="' + i + '"]').click(); const log = document.getElementById('dlg-log').innerHTML; try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play'; return { ok, log }; },
        run(sec) { for (let t = 0; t < sec; t += 0.1) { G.state = 'play'; G.keys = {}; LIFE60.tick(0.1); updateNarrow(0.1); } },
        far() { const c = T.who('clerk'); if (c) { c.x = 25.6; c.y = 9.45; c._path = []; c._wait = 1e9; } Engine.cam.x = 14.2; Engine.cam.y = 9.45; },
        hallProctors() { return G.maps.malting.entities.filter((e) => e.kind === 'enemy' && e.type === 'proctor' && !e.room && !e.requires && e.x >= 10 && e.x < 20 && e.y < 15); },
      };
    });

    // ---- the yard and its doors
    let r = await page.evaluate(() => {
      T.reset(); const out = {};
      out.wg = G.maps.whispergrove.get(32, 5).portal.map === 'p61_yard';
      out.mw = G.maps.malting.get(0, 11).portal.map === 'p61_yard';
      out.mf = G.maps.malting.get(29, 15).portal.map === 'p61_yard';
      const y = G.maps.p61_yard; out.front = y.get(27, 9).portal.map === 'malting' && y.get(27, 14).portal.map === 'malting' && y.get(0, 9).portal.map === 'whispergrove';
      T.yard(); out.people = LIFE60.people(G.map).filter((e) => !e.hidden).length;
      out.board = G.ents.some((e) => e.sprite === 'sign' && /RELIEF STATION — REACH DISPLACED/.test(e.p61Look || ''));
      const b = T.who('bettis'); out.yardBettis = b && !b.hidden && b.sprite === 'hollow' && NPCS.p60_q_bettis.name === 'A Hollow with a basket';
      const x0 = b.x; let far = 0; for (let i = 0; i < 80; i++) { T.run(0.1); far = Math.max(far, Math.abs(b.x - x0)); } out.carries = far > 2;
      // a save that never saw the yard: Bettis is by the press, as before
      const save = JSON.parse(JSON.stringify(window.__base)); restoreGame(save); G.flags.part3 = true; loadMap('malting'); T.run(0.2);
      out.legacy = !G.ents.find((e) => e.id === 'bettis').hidden;
      return out;
    });
    check(r.wg && r.mw && r.mf && r.front, 'the Cloister road door and the Malting\'s west door open on the queue-yard; the yard has the front door and the freight door at the kiln end');
    check(r.people >= 20 && r.board, 'under the shelter, the queue (' + r.people + ') and the board: RELIEF STATION — REACH DISPLACED');
    check(r.yardBettis && r.carries, 'Bettis Renn is in the yard, a Hollow carrying baskets (Book One ch. 18)');
    check(r.legacy, 'a save that never saw the yard still finds Bettis by the press');

    // ---- the first sight and the plan
    r = await page.evaluate(() => {
      T.reset(); T.yard(); const out = {};
      const a = T.last(); out.arrive = a && a.t === 'There is a queue under the shelter' && /They are harvesting them/.test(a.b) && /Registration is the first room/.test(a.b);
      T.pick(/Go on/); const p = T.last(); out.plan = p.t === 'The plan is Vane\'s' && p.c.length === 4;
      T.pick(/Not yet/); window.__ev.length = 0; loadMap('whispergrove'); T.yard(); out.again = T.last() && T.last().t === 'The plan is Vane\'s';
      return out;
    });
    check(r.arrive, 'the first time: the queue, Kaelen\'s "They walked", "Registration is the first room"');
    check(r.plan && r.again, 'the plan: three halves (and "not yet", which asks again next time)');

    // ---- (a) in at the front with Sable
    r = await page.evaluate(() => {
      T.reset(); T.yard(); T.pick(/Go on/); T.pick(/front with Sable/); const out = {};
      out.hall = T.last().t === 'The clerks\' hall' && /vinegar/.test(T.last().b) && /You look <i>dreadful<\/i>/.test(T.last().b);
      T.pick(/Go on/); out.desk = /It is not a trap. It is a desk/.test(T.last().b) && /Would you show me a pressing/.test(T.last().b);
      T.pick(/Go with them/); out.press = /Is it long, sir\? Only they said there's food after/.test(T.last().b) && G.ledger.some((l) => l.name === 'Ansel Hay');
      T.pick(/Go on/); out.seen = /Put one back/.test(T.last().b) && /carrying baskets on my way in/.test(T.last().b) && /Go on, then, my dear/.test(T.last().b) && /They bring Bettis Renn in from the yard/.test(T.last().b);
      T.pick(/Stay with her/); T.run(0.5);
      const staff = G.ents.filter((e) => e.kind === 'enemy' && e._p61watch && !e.dead);
      out.where = G.mapId === 'malting' && staff.length === 2 && staff.every((e) => e.passive && e.state === 'passive');
      const q = G.ents.find((e) => e.id === 'quist'), b = G.ents.find((e) => e.id === 'bettis');
      out.quist = q && q.x > 21 && q.y > 10; out.bettis = b && !b.hidden && G.flags.p61_bettis_in === 1;
      out.drawn = T.hallProctors().every((e) => e.passive && e.state === 'passive');
      const press = G.ents.find((e) => e.use === 'press'); useDeco(press); out.card = T.last().t === 'An Office hand-press'; T.pick(/Unbolt/);
      T.run(0.5); out.wake = G.flags.press_taken && T.hallProctors().every((e) => !e.passive && e.state !== 'passive') && staff.every((e) => !e.passive && e.state === 'chase');
      out.quistHome = Math.abs(q.x - 25.5) < 0.1 && Math.abs(q.y - 4.2) < 0.1;
      return out;
    });
    check(r.hall && r.desk, 'in at the front: the clerks\' hall, the vinegar, Quist\'s desk, "Would you show me a pressing?"');
    check(r.press && r.seen, 'Pressing Room I: Ansel Hay, eight seconds of 741 (into the ledger); "Put one back"; Quist: "Go on, then, my dear"; they bring Bettis in from the yard');
    check(r.where && r.quist && r.bettis, 'you end in the press room with her: the two staff are back and watching, Quist is there, and Bettis Renn has been brought in');
    check(r.drawn, 'the hall is looking at Sable');
    check(r.card && r.wake && r.quistHome, 'take the press, and the bell wakes the hall and the staff; Quist goes back to his office');

    // ---- (b) the kiln end
    r = await page.evaluate(() => {
      T.reset(); T.yard(); T.pick(/Go on/); T.pick(/kiln end/); const out = {};
      out.card = T.last().t === 'The kiln end' && /looks enormous/.test(T.last().b); T.pick(/^In\./);
      out.at = G.mapId === 'malting' && Math.abs(Engine.cam.x - 28.2) < 0.6 && Math.abs(Engine.cam.y - 15.5) < 0.6;
      out.guarded = G.map.entities.filter((e) => e.room === 'press' && !e.dead).length === 2;
      T.run(0.3); out.drawn = T.hallProctors().every((e) => e.passive);
      const b = G.ents.find((e) => e.id === 'bettis'); out.bettis = b && !b.hidden && window.__msgs.some((m) => /Sable has asked for her/.test(m));
      return out;
    });
    check(r.card && r.at, 'the kiln end: Mags in the freight doorway, and in you go by the freight door');
    check(r.guarded && r.drawn, 'the press room is still guarded; the hall is looking at Sable');
    check(r.bettis, 'in the press room, they bring Bettis Renn in from the yard: Sable has asked for her');

    // ---- (c) the queue
    r = await page.evaluate(() => {
      T.reset(); T.yard(); T.pick(/Go on/); T.pick(/with the queue/); const out = {};
      out.card = T.last().t === 'Under the shelter' && /You could tell them what is in the first room/.test(T.last().b);
      T.far(); const t = T.tell('ansel'); out.told = t.ok && /Food after/.test(t.log) && G.flags.p61 === 3;
      const a = T.who('ansel'); T.run(30); out.gone = a.hidden && !G.flags.p61_noticed;
      T.far(); const o = T.tell('old'); T.run(3); out.stays = /I'm old, and my feet are done/.test(o.log) && !T.who('old').hidden && MALTING61.toldCount() === 1;
      T.far(); T.tell('mother'); T.far(); T.tell('dyer'); T.run(2); out.three = !G.flags.p61_noticed;
      T.far(); T.tell('hay'); T.run(5); out.notYet = !G.flags.p61_noticed; T.run(5);
      out.noticed = G.flags.p61_noticed === 1 && G.flags.malting_alarm && window.__msgs.some((m) => /counts, and counts again/.test(m));
      loadMap('malting'); T.run(0.3);
      out.reserve = G.ents.filter((e) => e.requires === 'malting_alarm' && !e.dead).every((e) => !e.hidden && e.state === 'chase') && T.hallProctors().every((e) => !e.passive);
      return out;
    });
    check(r.card && r.told && r.gone, 'tell Ansel Hay what is in the first room, and he walks off into the orchard');
    check(r.stays, 'the old man will not go: "Tell the young ones"');
    check(r.three && r.notYet && r.noticed, 'four empty places, and after a little the clerk counts the benches; the bell rings early');
    check(r.reserve, 'go in after that, and the hall is awake and the reserve is out');

    r = await page.evaluate(() => {
      T.reset(); T.yard(); T.pick(/Go on/); T.pick(/with the queue/); const out = {};
      const c = T.who('clerk'); c.x = 14.0; c.y = 9.45; c._path = []; c._wait = 1e9; Engine.cam.x = 14.6; Engine.cam.y = 9.45;
      T.tell('fuller'); T.run(0.5); out.heard = G.flags.p61_noticed === 1 && window.__msgs.some((m) => /He heard that/.test(m));
      // Ansel warned, then in at the front: someone else is on the stool
      T.reset(); G.flags.p61_seen = 1; G.flags.p61_told = 1; T.yard(); T.pick(/front with Sable/); T.pick(/Go on/); T.pick(/Go with them/);
      out.other = /Ansel Hay is in the orchard/.test(T.last().b) && !G.ledger.some((l) => l.name === 'Ansel Hay');
      return out;
    });
    check(r.heard, 'tell someone within the clerk\'s hearing and the bell rings at once');
    check(r.other, 'warn Ansel Hay first, and it is someone else on the stool; Ansel Hay is in the orchard');

    // ---- after the press; saves
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.flags.p61_seen = 1; G.flags.p61 = 2; G.flags.press_taken = true; T.yard();
      out.none = /Sable does not look at the board/.test(T.last().b) && LIFE60.people(G.map).length === 0;
      T.reset(); G.flags.p61_seen = 1; G.flags.p61 = 3; G.flags.p61_told = 2 | 4; G.flags.press_taken = true; T.yard();
      out.some = /telling them the truth/.test(T.last().b);
      T.reset(); G.flags.p61_seen = 1; G.flags.p61 = 3; G.flags.p61_told = 2; G.flags.p61_noticed = 1; G.flags.press_taken = true; T.yard();
      out.noticed = /Let them ring it/.test(T.last().b);
      window.__ev.length = 0; loadMap('whispergrove'); T.yard(); out.once = !window.__ev.length;
      T.reset(); T.yard(); out.unsaved = !/p60_q_/.test(JSON.stringify(snapshotGame()));
      // an old save that already had the press: no cards, nobody
      T.reset(); G.flags.press_taken = true; window.__ev.length = 0; T.yard(); out.old = !window.__ev.length && LIFE60.people(G.map).length === 0;
      return out;
    });
    check(r.none && r.some && r.noticed && r.once, 'after the press, the shelter is empty, and Sable has a line for what you did to her queue (once)');
    check(r.unsaved && r.old, 'the queue is never saved; a save that already had the press sees an empty yard and no cards');

    await frCheck(page, 'p61-malting.tsv', 'MALTING61', 'the queue-yard');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
