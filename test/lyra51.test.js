// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/lyra51.test.js
// The forty-one nights (js/lyra51.js; Book One ch. 1 and 3; ROADMAP R9 item 7): the stone behind the cooperage by day,
// the forty-first night and each thing you can do about it, telling Kaelen, the forty-second night, missing it, and French.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /lyra51/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof LYRA51 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Stone Tester');
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
      window.__base = JSON.parse(JSON.stringify(snapshotGame()));
      window.T = {
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; },
        at(day, h, x, y) { G.day = day; G.tod = h / 24; loadMap('oakhaven', { x, y, dir: 0 }); G.state = 'play'; },
        step(n) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(0.033); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        ent(k) { return G.map.entities.find((e) => e._p51 === k); },
        talkTo(id, map) { loadMap(map); G.state = 'play'; const e = G.ents.find((o) => o.kind === 'npc' && o.id === id); talk(e); const log = DLG.log.slice(); try { document.getElementById('d-bye').click(); } catch (err) { /* none */ } G.state = 'play'; return log; },
      };
    });
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- by day: the stone and the rotted wadding behind the cooperage
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.at(0, 14, 64.5, 41.5); T.step(1);
      out.props = !!T.ent('stone') && !!T.ent('wadding') && !T.ent('lyra') && G.map.entities.filter((e) => e._p51).every((e) => e.transient);
      const c = G.map.get(Math.floor(LYRA51.STONE.x), Math.floor(LYRA51.STONE.y)), h = G.map.get(Math.floor(LYRA51.STONE.x) + 1, Math.floor(LYRA51.STONE.y));
      out.place = !c && !!h && /hedge/.test(h.tex || '') && G.map.entities.some((e) => /cooper's barrel/.test(e.label || '') && Math.hypot(e.x - LYRA51.STONE.x, e.y - LYRA51.STONE.y) < 12);
      useDeco(T.ent('stone')); out.day = /no night-hummer/.test(T.last().b);
      out.noCard = !window.__ev.some((e) => /dead hour/.test(e.t));
      return out;
    });
    check(r.props && r.place, 'behind the old cooperage, at the foot of the Hedge: a flat stone and the rotted wadding (transient)');
    check(r.day && r.noCard, 'by day it is only a stone, with no crossing and no night-hummer near it');
    await shot('p51-day', () => { T.at(0, 15, 64.6, 41.4); G.player.dir = -0.3; T.step(1); });

    // ---- the forty-first night, kept
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.at(1, 2.5, 55.5, 44.5); T.step(2);
      out.sitting = !!T.ent('lyra') && LYRA51.stage() === 0 && !window.__ev.length;
      T.at(1, 2.6, 64.5, 41.5); T.step(2);
      const ev = T.last();
      out.card = LYRA51.stage() === 1 && /Hello, Da/.test(ev.b) && /Boy or girl/.test(ev.b) && /Pim Carder's hands/.test(ev.b) && /heard by both of them/.test(ev.b) && ev.c.length === 3;
      out.noSit = !ev.c.some((c) => /Sit/.test(c.t));
      out.j = G.journal.some((j) => /The forty-one nights/.test(j.text));
      T.pick(/Go, quietly/); out.kept = LYRA51.stage() === 2 && T.heard(/telling it about her day/) && !T.ent('lyra');
      T.step(3); out.once = window.__ev.length === 1;
      return out;
    });
    check(r.sitting, 'at the dead hour after the Madder birth, Lyra is on the stone');
    check(r.card && r.noSit && r.j, 'come near and you hear it: "Hello, Da." "Boy or girl?" and Pim Carder\'s hands; three things to do, none of them sitting down');
    check(r.kept && r.once, 'go, quietly (canon): it is hers to tell');
    await shot('p51-night', () => { T.reset(); T.at(1, 2.5, 63.9, 40.9); G.player.dir = 0.05; LYRA51.stage0(G.map); });

    // ---- told Kaelen; the forty-second night
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.at(1, 2.5, 64.5, 41.5); T.step(2); T.pick(/tell Kaelen/);
      out.toldStage = LYRA51.stage() === 3 && LYRA51.kaelenReady(G.flags);
      const q0 = NPCS.kaelen.quest;
      G.tod = 11 / 24; let log = T.talkTo('kaelen', 'clearing');
      out.kaelen = log.some((l) => /I'll go to her door tonight/.test(l.t)) && G.flags.p51_k === true && G.journal.some((j) => /I told Kaelen/.test(j.text));
      log = T.talkTo('kaelen', 'clearing'); out.once = !log.some((l) => /I'll go to her door/.test(l.t)) && NPCS.kaelen.quest === q0;
      window.__ev.length = 0;
      T.at(2, 1.5, 64.5, 41.5); T.step(2);
      const ev = T.last();
      out.n42 = !!ev && /It has been practising/.test(ev.b) && /ring of glass/.test(ev.b) && /hummed at the latch/.test(ev.b) && !T.ent('lyra') && G.journal.some((j) => /forty-second night/.test(j.text));
      T.step(3); out.n42once = window.__ev.length === 1;
      return out;
    });
    check(r.toldStage && r.kaelen && r.once, 'tell Kaelen, and the next time you speak with him he says he will go to her door tonight (once)');
    check(r.n42 && r.n42once, 'the forty-second night: the stone is empty, and the Hedge hums Kaelen\'s note with the glass in it. It has been practising');

    // ---- answering it; missing it
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.at(1, 2.5, 64.5, 41.5); T.step(2); T.pick(/Answer it yourself/);
      const ev = T.last();
      out.answer = LYRA51.stage() === 4 && G.flags.hedge_answered === true && /in your voice/.test(ev.b) && /without a word/.test(ev.b);
      T.reset(); T.at(1, 2.5, 30.5, 30.5); T.step(2); G.tod = 6 / 24; T.step(2);
      out.missed = LYRA51.stage() === 9 && !window.__ev.length;
      T.at(1, 14, 64.5, 41.5); T.step(1); useDeco(T.ent('stone')); out.missedDay = /no night-hummer/.test(T.last().b) && !T.ent('lyra');
      T.at(2, 1.5, 64.5, 41.5); T.step(2); const e42 = T.last(); out.n42anyway = /practising/.test(e42.b) && !/hummed at the latch/.test(e42.b);
      return out;
    });
    check(r.answer, 'answer it yourself, and it learns you (hedge_answered); Lyra goes past you without a word');
    check(r.missed && r.missedDay && r.n42anyway, 'be elsewhere at the dead hour and you never see her there; the forty-second night\'s hum is there for anyone at the stone');

    // ---- French for every new string
    const tsv = src('tools/i18n/p51-lyra.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => LYRA51.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL LYRA51 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
