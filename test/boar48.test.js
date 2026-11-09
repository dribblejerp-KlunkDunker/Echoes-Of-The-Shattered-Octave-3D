// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/boar48.test.js
// Hearthday at the Boar & Dulcimer, played (js/boar48.js; Book One ch. 4; ROADMAP R9 item 5).
// Every choice at the stand, the count to ten, the hounds through the gaps, both ways of drawing them off the children,
// the aftermath, missing it, a save mid-scene, and French. Set SHOT_DIR to also write screenshots.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /boar48/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof BOAR48 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Boar Tester');
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
      window.__fresh = JSON.parse(JSON.stringify({ flags: G.flags, ledger: G.ledger, journal: G.journal }));
      window.T = {
        reset(day, h) {
          for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, JSON.parse(JSON.stringify(window.__fresh.flags)));
          G.ledger = []; G.journal.length = 0; G.day = day; G.tod = h / 24; G.player.hp = G.player.maxHp || G.player.hp;
          window.__ev.length = 0; window.__msgs.length = 0;
        },
        go(id, h) { if (h != null) G.tod = h / 24; loadMap(id); G.state = 'play'; G.keys = {}; },
        step(n) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(0.033); } },
        until(pred, n) { for (let i = 0; i < (n || 600) && !pred(); i++) { G.state = 'play'; G.keys = {}; G.player.hp = Math.max(G.player.hp, 5); update(0.033); } return pred(); },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(ev, re) { const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        ent(k) { return G.map.entities.find((e) => e._p48 === k); },
      };
    });
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- the afternoon: Davin by the hearth from noon; Kaelen and Lyra at Vane's table from seven
    const pre = await page.evaluate(() => {
      const out = {};
      T.reset(2, 11); T.go('tavern'); T.step(1); out.noon = !T.ent('davin');
      T.reset(2, 14); T.go('tavern'); T.step(1); out.davin = !!T.ent('davin') && !T.ent('kaelen') && T.heard(/drinking since noon/);
      out.look = /drinking with purpose since noon/.test(T.ent('davin').look);
      useDeco(T.ent('davin')); out.near = T.heard(/Every year of my life/);
      T.reset(2, 19.2); T.go('tavern'); T.step(1); out.berths = !!T.ent('kaelen') && !!T.ent('lyra') && /Eight days/.test(T.ent('kaelen').look);
      T.reset(1, 21); T.go('tavern'); T.step(1); out.notYesterday = !T.ent('davin') && BOAR48.stage() === 0;
      return out;
    });
    check(pre.noon && pre.davin && pre.look && pre.near, 'on Hearthday Davin Hale is drinking by the hearth from noon, and Hetty waters his mug');
    check(pre.berths && pre.notYesterday, 'from seven Kaelen and Lyra are at Vane\'s table buying berths; on Rootday nobody is');
    await shot('p48-afternoon', () => { T.reset(2, 19.5); T.go('tavern'); G.tod = 19.5 / 24; loadMap('tavern', { x: 8.5, y: 9.4, dir: -0.55 }); T.step(1); });

    // ---- he stands up, at eight, if you are there
    const stand = await page.evaluate(() => {
      const out = {};
      T.reset(2, 19.9); T.go('tavern'); T.step(1); out.waits = BOAR48.stage() === 0;
      G.tod = 20.01 / 24; T.step(1);
      const ev = T.last(); out.stand = BOAR48.stage() === 1 && /whole room stops/.test(ev.b) && /last sheaf/.test(ev.b) && ev.c.length === 3;
      window.__stand = ev;
      return out;
    });
    check(stand.waits && stand.stand, 'at eight he stands up and sings The Last Sheaf; three things you can do');
    // way 1: the children
    let r = await page.evaluate(() => {
      const out = {};
      T.pick(window.__stand, /children/); out.kids = BOAR48.stage() === 2 && G.flags.p48_way === 'kids' && T.heard(/behind the bar/);
      out.hidden = [0, 1, 2, 3].every((i) => { const e = T.ent('kid' + i); return e && e.y < 2; }) && T.ent('lyra').y < 2;
      const t0 = performance.now();
      out.counted = T.until(() => BOAR48.stage() === 3, 500);
      out.six = T.heard(/^Six\. Outside, every oak/) && T.heard(/^Eight\. Faintly/) && T.heard(/^Nine\. In the corner, Vane laughs/);
      out.through = T.heard(/come in through everything/) && BOAR48.hounds().length === 5;
      return out;
    });
    check(r.kids && r.hidden, 'get the children and the dye-works women behind the bar, with Lyra');
    check(r.counted && r.six, 'Vane counts one to ten: at six the oaks ring, at eight the song comes back from outside, at nine he laughs');
    check(r.through, 'at ten the hounds come in through the gaps: five of them');
    await shot('p48-count', () => { T.step(1); });
    r = await page.evaluate(() => {
      const out = {};
      out.rites = T.until(() => T.heard(/Last Rites/), 200) && BOAR48.hounds().length === 4;
      out.sleeve = T.until(() => T.heard(/felt sleeve/), 200);
      out.loud = T.until(() => BOAR48.stage() === 4, 400) && BOAR48.hounds().length === 2;
      const ev = T.last(); out.card = /beginning to whimper/.test(ev.b) && ev.c.some((c) => /shout/.test(c.t)) && ev.c.some((c) => /Keep still/.test(c.t));
      window.__loud = ev;
      return out;
    });
    check(r.rites && r.sleeve, 'Last Rites; the felt sleeve off with Kaelen\'s teeth; Second Opinion');
    check(r.loud && r.card, 'two of them turn toward a child behind the bar: be the loudest thing in the room, or keep still');
    await shot('p48-fight', () => { T.step(1); });
    r = await page.evaluate(() => {
      const out = {}, xp0 = G.player.xp;
      T.pick(window.__loud, /shout/); let ev = T.last();
      out.you = G.flags.p48_drew === 'you' && /pale blue fist/.test(ev.b) && T.heard(/flees up the chimney/) && G.noise >= 7;
      T.pick(ev, /Sit with them/); ev = T.last();
      out.after = BOAR48.stage() === 5 && /still laced/.test(ev.b) && /Dissonant: self-inflicted/.test(ev.b) && /NO WEEPING ABOVE A HAND/.test(ev.b) && /You did it on purpose/.test(ev.b);
      out.flags = G.flags.davin_gone === true && G.ledger.some((l) => l.name === 'Davin Hale') && G.journal.some((j) => /Hearthday at the Boar/.test(j.text)) && G.journal.some((j) => /loudest thing in the room/.test(j.text)) && G.player.xp >= xp0 + 50;
      out.room = !!T.ent('boots') && !!T.ent('ash') && !T.ent('davin') && BOAR48.hounds().length === 0 && !G.map.entities.some((e) => /^h\d$/.test(e._p48 || ''));
      // Vane says it to you, once
      const v = G.map.entities.find((e) => e.kind === 'npc' && e.id === 'vane'); const q0 = NPCS.vane.quest;
      talk(v); out.vane = DLG.log.some((l) => /You drew them off the children/.test(l.t)); try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      talk(v); out.once = !DLG.log.some((l) => /You drew them off the children/.test(l.t)); try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      out.q = NPCS.vane.quest === q0;
      return out;
    });
    check(r.you && r.after && r.flags && r.room, 'make yourself the loudest thing: Kaelen\'s fist through the one at your boots; the boots, the clerk\'s ledger, the four rules chalked again');
    check(r.vane && r.once && r.q, 'Vane tells you, once: "You drew them off the children"; his quest function is unchanged');
    await shot('p48-after', () => { G.tod = 21 / 24; loadMap('tavern', { x: 11.6, y: 7.3, dir: 0.05 }); T.step(1); });

    // ---- the other ways: stop him (held a beat), the door, and keep still (Vane does it)
    r = await page.evaluate(() => {
      const out = {};
      T.reset(2, 19.99); T.go('tavern'); T.step(1); G.tod = 20.02 / 24; T.step(1);
      G.player.attrs.Strength = 80; T.pick(T.last(), /Try to stop him/);
      out.stop = G.flags.p48_way === 'stop' && T.heard(/like a ship coming about/) && BOAR48.R.slow > 0;
      T.until(() => BOAR48.stage() === 4, 900);
      T.pick(T.last(), /Keep still/); let ev = T.last(); out.vane = G.flags.p48_drew === 'vane' && /on purpose/.test(ev.b);
      T.pick(ev, /Sit with them/); ev = T.last(); out.vaneAfter = /sits on them/.test(ev.b) && G.journal.some((j) => /Vane laughed out loud, on purpose/.test(j.text));
      out.noLine = !BOAR48.vaneReady(G.flags);
      T.reset(2, 19.99); T.go('tavern'); T.step(1); G.tod = 20.02 / 24; T.step(1);
      G.player.attrs.Strength = 20; G.player.attrs.Personality = 20; T.pick(T.last(), /door/);
      out.door = G.flags.p48_way === 'door' && T.heard(/will not bother with it/) && BOAR48.R.slow === 0;
      return out;
    });
    check(r.stop, 'try to stop him: Hetty is pushed into a table; a strong arm holds the line back a beat, never stops it');
    check(r.vane && r.vaneAfter && r.noLine, 'keep still, and Vane laughs out loud on purpose, as in the book');
    check(r.door, 'get between the door and the room (they do not come by the door)');

    // ---- a save mid-scene; missing it
    r = await page.evaluate(() => {
      const out = {};
      T.until(() => BOAR48.stage() === 3, 500);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.resumed = BOAR48.stage() === 3 && T.until(() => BOAR48.stage() === 4, 500) && BOAR48.hounds().length === 2;
      T.pick(T.last(), /Keep still/); T.pick(T.last(), /Sit with them/); out.finished = BOAR48.stage() === 5;
      T.reset(2, 19.9); T.go('oakhaven'); T.step(1); G.tod = 20.1 / 24; T.step(3);
      out.missed = BOAR48.stage() === 9 && G.flags.davin_gone === true;
      T.go('tavern', 20.5); T.step(1); out.missedRoom = !!T.ent('boots') && !T.ent('davin') && BOAR48.stage() === 9 && !BOAR48.hounds().length;
      out.noCard = !window.__ev.some((e) => /whole room stops/.test(e.b));
      G.day = 4; T.go('tavern', 12); T.step(1); out.bootsGone = !T.ent('boots');
      return out;
    });
    check(r.resumed && r.finished, 'a save in the fight loads back into it, and it ends cleanly');
    check(r.missed && r.missedRoom && r.noCard && r.bootsGone, 'away from the Boar at eight, he is taken all the same; his boots are by the hearth when you come in, for a day');

    // ---- French for every new string
    const tsv = src('tools/i18n/p48-boar.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => BOAR48.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL BOAR48 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
