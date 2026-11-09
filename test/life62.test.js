// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/life62.test.js
// The lived-in world, wave 2 (js/life62-whispergrove.js; ROADMAP R10): Whisper-Grove's Hollows keep their loops.
// The book's four (the wool coat between the pillar and the basin, the two men mid-argument, the young man washing a
// clean plate) loop all day and night; the others loop about the city by day and drift into the Sunken Court at dusk;
// the Office feeder walks the court at dawn and dusk only; the plaza's own Hollows and Halder Wick are unchanged.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /life60/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof LIFE62_WG !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Grove Tester');
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
      window.__base = JSON.parse(JSON.stringify(snapshotGame()));
      window.T = {
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; window.__msgs.length = 0; },
        wg(h) { G.tod = h / 24; loadMap('whispergrove'); G.state = 'play'; return G.map; },
        who(k) { return LIFE60.people(G.map).find((e) => e._life === k); },
        open(x, y) { const m = G.map, g = LIFE60.grid(m); return !g[Math.floor(y) * m.w + Math.floor(x)]; },
        run(sec, fn) { for (let t = 0; t < sec; t += 0.1) { G.state = 'play'; LIFE60.tick(0.1); if (fn) fn(); } },
      };
    });

    // ---- the roster
    let r = await page.evaluate(() => {
      T.reset(); const m = T.wg(10), P = LIFE60.PLACES.whispergrove, out = { bad: [] };
      out.n = P.roster.length; out.staged = LIFE60.people(m).length;
      for (const p of P.roster) {
        const pts = [p.home]; for (const s of p.day) { for (const q of [s.at, s.to2]) if (q) pts.push(q); if (typeof s.face === 'string' && !P.byKey[s.face]) out.bad.push(p.key + ' faces ' + s.face); }
        for (const q of pts) { if (!T.open(q[0], q[1])) out.bad.push(p.key + ' solid ' + q); else if (!LIFE60.path(m, p.home[0], p.home[1], q[0], q[1])) out.bad.push(p.key + ' unreachable ' + q); }
        for (let h = 0; h < 24; h += 0.25) { const k = p.day.filter((s) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)).length; if (k !== 1) { out.bad.push(p.key + ' hour ' + h + ' x' + k); break; } }
      }
      out.plaza = m.entities.filter((e) => e.id === 'hollow' && !e._life).length; out.halder = m.entities.some((e) => e.id === 'halder');
      return out;
    });
    check(r.n >= 18 && r.staged === r.n, 'Whisper-Grove has its Hollows on their loops, all staged (' + r.n + ')');
    check(!r.bad.length, 'every stop is open ground and reachable, every hour covered once (' + r.bad.slice(0, 3).join('; ') + ')');
    check(r.plaza === 20 && r.halder, 'the plaza\'s twenty standing Hollows and Halder Wick are as they were');

    // ---- the book's four, day and night
    r = await page.evaluate(() => {
      const out = {};
      for (const h of [3, 12]) {
        T.wg(h); const a = T.who('argA'), b = T.who('argB'), c = T.who('coat'), p = T.who('plate');
        out['h' + h] = !a.hidden && !b.hidden && !c.hidden && !p.hidden && Math.hypot(a.x - b.x, a.y - b.y) < 1.6 && p._stop.job === 'scrub';
      }
      T.wg(12); const c = T.who('coat'), c0 = [c.x, c.y]; let far = 0, wall = 0;
      for (let i = 0; i < 150; i++) { T.run(0.1); far = Math.max(far, Math.hypot(c.x - c0[0], c.y - c0[1])); if (!T.open(c.x, c.y)) wall++; }
      out.coat = far > 3 && !wall;
      const a = T.who('argA'), b = T.who('argB'); out.facing = Math.abs(Math.atan2(b.y - a.y, b.x - a.x) - a.facing) < 0.3;
      out.greet = /since the spring/.test(NPCS.p60_coat.greet.normal) && /an argument that finished three years ago/.test(NPCS.p60_argA.greet.normal) && /a thousand days/.test(NPCS.p60_plate.greet.normal);
      return out;
    });
    check(r.h3 && r.h12, 'the book\'s own loop all day and all night: the two men at the colonnade, the plate at the water\'s edge, the woman in the wool coat');
    check(r.coat, 'the woman in the good wool coat walks from the third pillar to the basin\'s edge and back, never through anything');
    check(r.facing && r.greet, 'the arguer faces the man waiting for him; their lines are the book\'s');

    // ---- the others: loops by day, the court at dusk ("the way leaves do")
    r = await page.evaluate(() => {
      const keys = ['sweep', 'bucket', 'stall', 'baker', 'wash', 'clock', 'joiner', 'gather', 'moot', 'letter', 'shawl', 'rake', 'mother'], out = {};
      const dist = (e) => Math.hypot(e.x - 24.5, e.y - 22.5);
      T.wg(10); out.day = keys.filter((k) => dist(T.who(k)) > 7.6).length;
      T.wg(17.9); const e = T.who('baker'), d0 = dist(e); G.tod = 18.2 / 24; let wall = 0; T.run(60, () => { if (!T.open(e.x, e.y)) wall++; });
      out.drift = d0 > 10 && dist(e) < 7.6 && !wall;
      T.wg(21); out.dusk = keys.filter((k) => dist(T.who(k)) < 7.6 && !T.who(k).hidden).length;
      T.wg(3); out.night = keys.filter((k) => dist(T.who(k)) < 7.6).length;
      T.wg(7); const f = T.who('feeder'); out.feedDawn = !f.hidden; T.wg(12); out.feedNoon = T.who('feeder').hidden; T.wg(18); out.feedDusk = !T.who('feeder').hidden; T.wg(23); out.feedNight = T.who('feeder').hidden;
      return out;
    });
    check(r.day >= 12, 'by day the others are about the city on their loops (' + r.day + '/13 away from the court)');
    check(r.drift, 'at dusk they drift into the Sunken Court, round the houses');
    check(r.dusk === 13 && r.night === 13, 'through the evening and the night they stand in the court');
    check(r.feedDawn && r.feedNoon && r.feedDusk && r.feedNight, 'the Office feeder walks the court with his cart at dawn and dusk only');

    // ---- talking, overhearing, the contract
    r = await page.evaluate(() => {
      const out = {};
      T.wg(10); const h = T.who('plate'); talk(h); out.talk = G.state === 'dialogue' && /washing a plate that has no dirt on it/.test(document.body.innerHTML) && !document.querySelector('[data-life]');
      try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      T.wg(7); const f = T.who('feeder'); talk(f); out.feeder = !!document.querySelector('[data-life]'); try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      window.__msgs.length = 0; T.wg(10); const p = T.who('plate'); Engine.cam.x = p.x + 1.2; Engine.cam.y = p.y; T.run(14, () => { Engine.cam.x = p.x + 1.2; Engine.cam.y = p.y; });
      out.bark = window.__msgs.some((t) => /nearly clean/.test(t));
      T.wg(10); out.unsaved = !/p60_/.test(JSON.stringify(snapshotGame()));
      T.wg(10); passHours(10); out.snap = Math.hypot(T.who('baker').x - 24.5, T.who('baker').y - 22.5) < 7.6;
      return out;
    });
    check(r.talk, 'speak to a Hollow and you are told what it is doing; it has nothing to tell you');
    check(r.feeder, 'the feeder will answer a question');
    check(r.bark, 'stand close and you hear them');
    check(r.unsaved && r.snap, 'nothing of theirs is saved; resting puts them where the hour does');

    await frCheck(page, 'p62-whispergrove.tsv', 'LIFE62_WG', 'Whisper-Grove\'s Hollows');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
