// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/aldric63.test.js
// Aldric's arc (js/aldric63.js; R9 item 16; Book One ch. 2 and ch. 7): the Greenhall on Rootday (Revision Seven, Stage 9,
// the three offers; stay for the brandy, "You sold them." / "I fed them.", "Da. Your hair."; or go out with the Factor);
// the signing on Driftday at dusk; Aldric's line after the brandy that sends you to the house; only in its own time.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /aldric63/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof ALDRIC63 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Greenhall Tester');
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
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.flags.kaelen_met = true; G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; },
        at(d, h) { G.day = d; G.tod = h / 24; },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
      };
    });

    // ---- Rootday: the walk and the Greenhall
    let r = await page.evaluate(() => {
      T.reset(); const out = {};
      T.at(1, 9); loadMap('oakhaven'); out.walk = window.__msgs.some((m) => /walking Kaelen down Cooper's Row/.test(m)) && G.flags.p63_walk === 1;
      loadMap('greenhall'); const a = T.last();
      out.hall = a && a.t === 'The Greenhall, Rootday morning' && /the blue jug, Mam\. Not the white/.test(a.b) && /"Sit\."<br><br>He does not sit\./.test(a.b) && /"I was required\."/.test(a.b);
      T.pick(/Go on/); const p = T.last();
      out.plan = /VANCE SEQUENCE, REV\. 7/.test(p.b) && /STAGE 9 — UNISON HOLD/.test(p.b) && /Source: Cantor, local \(1\)/.test(p.b) && /Collar: standard\. Wire: standard\./.test(p.b) && /It went through me/.test(p.b);
      T.pick(/Go on/); const o = T.last();
      out.offer = o.t === 'Three things' && /It\'s a chance, Kaelen/.test(o.b) && /The wire is not\./.test(o.b) && o.c.length === 2;
      T.pick(/Stay when the Factor goes/); const b = T.last();
      out.brandy = /"No," his father says quietly\. "I didn\'t think you would\."/.test(b.b) && /"You sold them," says Kaelen\./.test(b.b) && /"I fed them\."/.test(b.b) && /the Wetherby twins, and the Hale girl, and the miller\'s three/.test(b.b) && /I only sold them the ground/.test(b.b);
      T.pick(/Go on/); const h = T.last();
      out.hair = /"Da," Kaelen says\. "Your hair\."/.test(h.b) && /pale as a grub, a root-tip/.test(h.b) && /Twice a month, now/.test(h.b) && /I had them air it every spring/.test(h.b);
      out.flags = G.flags.p63_hall === 1 && G.flags.p63_stayed === 1;
      window.__ev.length = 0; loadMap('oakhaven'); loadMap('greenhall'); out.once = !window.__ev.length;
      return out;
    });
    check(r.walk, 'Rootday morning: a Legionnaire walks Kaelen across town to the Greenhall');
    check(r.hall, 'the Greenhall: the blue jug in the bell, "Sit." / he does not sit, "I was required."');
    check(r.plan, 'Revision Seven of his own Sequence: Stage 9, Unison Hold, Source: Cantor, local (1), Collar: standard, Wire: standard');
    check(r.offer, 'the three offers, "It\'s a chance, Kaelen", and the choice to stay or go');
    check(r.brandy, 'stay: the apple-brandy, "I didn\'t think you would", "You sold them." / "I fed them.", the famine names');
    check(r.hair, '"Da. Your hair.": the root-tip, twice a month, "I had them air it every spring"');
    check(r.flags && r.once, 'it plays once');

    r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.at(1, 10); loadMap('greenhall'); T.pick(/Go on/); T.pick(/Go on/); T.pick(/Go out with the Factor/);
      out.left = /pour two cups/.test(T.last().b) && !G.flags.p63_stayed && G.flags.p63_hall === 1;
      // only in its own time
      T.reset(); T.at(0, 10); loadMap('greenhall'); out.nullday = !window.__ev.length;
      T.reset(); T.at(1, 7); loadMap('greenhall'); out.early = !window.__ev.length;
      T.reset(); T.at(2, 10); loadMap('greenhall'); out.later = !window.__ev.length;
      T.reset(); delete G.flags.kaelen_met; T.at(1, 10); loadMap('greenhall'); out.notMet = !window.__ev.length;
      T.reset(); G.flags.greening = true; T.at(1, 10); loadMap('greenhall'); out.greening = !window.__ev.length;
      return out;
    });
    check(r.left, 'go out with the Factor, and through the closing door you see him pour two cups');
    check(r.nullday && r.early && r.later && r.notMet && r.greening, 'only on Rootday from eight, after you have met Kaelen, in Part One');

    // ---- Aldric, after the brandy
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.flags.p63_hall = 1; G.flags.p63_stayed = 1; T.at(1, 14); loadMap('greenhall');
      const q = NPCS.aldric.quest(G); out.bridge = q && /Marrit has the key/.test(q.text) && G.flags.p63_bridge === 1;
      out.once = !NPCS.aldric.quest(G) || !/Marrit has the key/.test((NPCS.aldric.quest(G) || {}).text || '');
      T.reset(); G.flags.p63_stayed = 1; G.flags.p46_room = true; out.seen = !(NPCS.aldric.quest(G) && /Marrit has the key/.test(NPCS.aldric.quest(G).text));
      T.reset(); out.notStayed = !(NPCS.aldric.quest(G) && /Marrit has the key/.test((NPCS.aldric.quest(G) || {}).text || ''));
      return out;
    });
    check(r.bridge && r.once, 'after the brandy, Aldric sends you up to the house: "Marrit has the key" (once)');
    check(r.seen && r.notStayed, 'not if you have already seen the room, and not if you did not stay');

    // ---- Driftday dusk: the signing
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.flags.church_come = true; T.at(6, 18); loadMap('greenhall'); const s = T.last();
      out.sign = s && s.t === 'The signing' && /<i>K\. Vance<\/i> on the line beside <i>Supervising Engineer<\/i>/.test(s.b) && /holding a door shut against a storm/.test(s.b) && /Creak\./.test(s.b) && G.flags.p63_signed === 1;
      window.__ev.length = 0; loadMap('oakhaven'); loadMap('greenhall'); out.once = !window.__ev.length;
      T.reset(); G.flags.church_come = true; T.at(6, 21); loadMap('greenhall'); out.late = !window.__ev.length;
      T.reset(); G.flags.church_come = true; G.flags.rite_started = true; T.at(6, 18); loadMap('greenhall'); out.rite = !window.__ev.length;
      out.unsaved = true;
      return out;
    });
    check(r.sign && r.once, 'Driftday at dusk: the signing, twice, and Aldric\'s breath; the censer creaks (once)');
    check(r.late && r.rite, 'only at dusk on Driftday, before the Rite');

    await frCheck(page, 'p63-aldric.tsv', 'ALDRIC63', 'Aldric\'s arc');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
