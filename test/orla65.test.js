// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/orla65.test.js
// Orla Hale: the harvest home (js/orla65.js; R9 item 17; Book One ch. 6): "Was he any good?" after the boots; then The Last
// Sheaf, one line a day from the chair, the shutters first or the Hedge hears it; the fourth line; the Song, and the
// Greening's second voice.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /orla65/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof ORLA65 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Harvest Tester');
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
      window.__score = 0.9; REEDS.holdPitch = async (o) => { window.__pitch = o; return { score: window.__score }; };
      window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
      window.__base = JSON.parse(JSON.stringify(snapshotGame()));
      window.T = {
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.flags.boots_delivered = true; G.day = 3; G.tod = 10 / 24; loadMap('orla_house'); G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; window.__score = 0.9; },
        q() { return NPCS.orla.quest(G); },
        choose(q, re) { const c = q.choices.find((o) => re.test(o.t)); return c.f(G); },
        at(d, h) { G.day = d; G.tod = h / 24; },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
      };
    });

    let r = await page.evaluate(async () => {
      const out = {}; T.reset();
      const q = T.q(); out.heard = /"Was he any good\?"/.test(q.text) && /Clear across the square/.test(q.text) && q.choices.length === 2;
      const a = T.choose(q, /fourth line/); out.truth = /Never could/.test(a) && /Forty years I tried to teach the pair of them/.test(a) && /It didn't have <i>him<\/i>/.test(a) && /Even the fourth/.test(a) && /Shut the shutters/.test(a) && G.flags.p65_told === 1;
      out.notToday = /One line a day/.test(T.q().text);
      // the first lesson, shutters closed
      G.day = 4; const q1 = T.q(); out.l1 = /Oh, the last sheaf's in and the barley's high/.test(q1.text);
      const t0 = G.tod; T.choose(q1, /Learn the next line/); await new Promise((r) => setTimeout(r, 30));
      out.shut = T.last() && T.last().t === '"Shutters first"' && /before you've learned it off me/.test(T.last().b);
      T.pick(/Close the shutters/); await new Promise((r) => setTimeout(r, 30));
      out.l1done = G.flags.p65_lesson === 1 && G.tod > t0 && window.__pitch && window.__pitch.title === 'The harvest home: the first two lines' && !G.flags.p65_loud;
      // the second, shutters open
      G.day = 5; G.noise = 0; window.__msgs.length = 0; T.choose(T.q(), /Learn the next line/); await new Promise((r) => setTimeout(r, 30)); T.pick(/shutters open/); await new Promise((r) => setTimeout(r, 30));
      out.l2 = G.flags.p65_lesson === 2 && G.flags.p65_loud === 1 && G.noise >= 6 && window.__msgs.some((m) => /sing the line back to you/.test(m));
      // the fourth: fail, not again today, then hold it
      G.day = 6; window.__score = 0.3; window.__msgs.length = 0; const q3 = T.q(); out.l3offer = /Davin couldn't hold it/.test(q3.text);
      T.choose(q3, /Learn the next line/); await new Promise((r) => setTimeout(r, 30)); T.pick(/Close the shutters/); await new Promise((r) => setTimeout(r, 30));
      out.fail = G.flags.p65_lesson === 2 && window.__msgs.some((m) => /It took me a year/.test(m)) && /One line a day/.test(T.q().text) && window.__pitch.width < 80;
      G.day = 7; window.__score = 0.8; T.choose(T.q(), /Learn the next line/); await new Promise((r) => setTimeout(r, 30)); T.pick(/Close the shutters/); await new Promise((r) => setTimeout(r, 30));
      out.held = G.flags.p65_lesson === 3 && G.player.songs.includes('sheaf') && G.flags.g44_knows_sheaf === true && /it's good to know there's two/.test(T.last().b);
      { const b = T.last().b, all = ORLA65.TEXTS.join('|'); out.words = /though the spring come late/.test(b) && /for the sheaf's gone home/.test(b) && /That last one's for going down to/.test(b) && /creak: <i>then it's over the hill where the stubble runs gold/.test(all) && /<i>and hold it, and hold it, till the sheaf's in the fold/.test(all); }
      out.after = !T.q() || !/Learn the next line/.test(JSON.stringify(T.q()));
      // the Song
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); out.saved = G.player.songs.includes('sheaf') && !!SONGS.sheaf;
      G.state = 'play'; G.player.voice = 50; G.song.t = 0; G.attack.t = 0; window.__msgs.length = 0; castSong('sheaf');
      out.sung = G.player.voice === 50 - SONGS.sheaf.cost && window.__msgs.some((m) => /You sing the harvest home at full voice/.test(m));
      return out;
    });
    check(r.heard, 'after the boots: "He sang it. Didn\'t he." / "Was he any good?"');
    check(r.truth, 'tell her the truth: "Never could. His da couldn\'t either"; the voice past the Hedge with nobody inside it; "Even the fourth"');
    check(r.notToday, 'one line a day: "Tomorrow, lovey"');
    check(r.l1 && r.shut && r.l1done, 'the first two lines, from the chair; shutters first, and a rag in the cracks (ten minutes)');
    check(r.l2, 'sing with the shutters open and the Hedge sings the line back to you');
    check(r.l3offer && r.fail, 'the fourth line: the narrowest band; it slips, "It took me a year", and not again today');
    check(r.held, 'hold it, and you have all of The Last Sheaf: the Song, and the Greening\'s second voice');
    check(r.words, 'the whole song: the third and fourth lines in the lessons, and the two verses after (ruled 8 Nov: write the rest)');
    check(r.after && r.saved && r.sung, 'the Song is kept in a save and sung at full voice');

    r = await page.evaluate(() => {
      const out = {}; T.reset();
      const a = T.choose(T.q(), /very good/); out.kind = /"Liar," says Orla Hale/.test(a) && G.flags.p65_told === 2;
      T.reset(); G.flags.greening = true; out.gone = !T.q() || !/Was he any good/.test(T.q().text || '');
      T.reset(); delete G.flags.boots_delivered; G.give('boots'); const q = T.q(); out.boots = q && /His boots/.test(q.text);
      return out;
    });
    check(r.kind, 'or be kind: "Liar," quite fondly');
    check(r.gone, 'nothing of it after the Greening');
    check(r.boots, 'the boots themselves are handed over as before');

    await frCheck(page, 'p65-orla.tsv', 'ORLA65', 'Orla\'s harvest home');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
