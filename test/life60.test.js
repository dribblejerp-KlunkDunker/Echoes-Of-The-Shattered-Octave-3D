// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/life60.test.js
// The lived-in world, wave 1 (js/life60.js engine + js/life60-oakhaven.js; ROADMAP R10): Oakhaven's people keep a day.
// Every stop is open ground and reachable; every hour of every day is covered; they are out by day and in by night;
// they walk real routes (never through a wall) and go indoors at home time; you can talk to them and overhear them;
// nothing of theirs is saved; resting snaps them to the hour; after the Greening (and with GFX.life off) nobody is
// there; and every line has French.
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
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof LIFE60 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Life Tester');
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
        oak(h) { G.tod = h / 24; loadMap('oakhaven'); G.state = 'play'; return G.map; },
        who(k) { return LIFE60.people(G.map).find((e) => e._life === k); },
        open(x, y) { const m = G.map, g = LIFE60.grid(m); return !g[Math.floor(y) * m.w + Math.floor(x)]; },
        run(sec, fn) { for (let t = 0; t < sec; t += 0.1) { G.state = 'play'; LIFE60.tick(0.1); if (fn) fn(); } },
      };
    });

    // ---- the roster and its days
    let r = await page.evaluate(() => {
      T.reset(); const m = T.oak(10), P = LIFE60.PLACES.oakhaven, out = { bad: [] };
      out.n = P.roster.length; out.staged = LIFE60.people(m).length;
      for (const p of P.roster) {
        const pts = [p.home];
        for (const s of p.day) { for (const q of [s.at, s.to2]) if (q) pts.push(q); if (typeof s.face === 'string' && !P.byKey[s.face]) out.bad.push(p.key + ' faces ' + s.face); }
        for (const q of pts) { if (!T.open(q[0], q[1])) out.bad.push(p.key + ' solid ' + q); else if (!LIFE60.path(m, p.home[0], p.home[1], q[0], q[1])) out.bad.push(p.key + ' unreachable ' + q); }
        for (let h = 0; h < 24; h += 0.25) { const k = p.day.filter((s) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)).length; if (k !== 1) { out.bad.push(p.key + ' hour ' + h + ' x' + k); break; } }
        if (!NPCS['p60_' + p.key] || !NPCS['p60_' + p.key].greet.normal) out.bad.push(p.key + ' no NPCS entry');
      }
      out.kinds = new Set(P.roster.flatMap((p) => p.day.map((s) => s.job))).size;
      return out;
    });
    check(r.n >= 25 && r.staged === r.n, 'Oakhaven has its people, all staged (' + r.n + ')');
    check(!r.bad.length, 'every home and stop is open ground and reachable, every hour covered once, everyone has lines (' + r.bad.slice(0, 3).join('; ') + ')');
    check(r.kinds >= 12, 'they do a dozen different kinds of work (' + r.kinds + ')');

    // ---- day and night
    r = await page.evaluate(() => {
      const out = {};
      for (const h of [3, 10, 15, 20, 22]) { T.oak(h); out[h] = LIFE60.people(G.map).filter((e) => !e.hidden).map((e) => e._life); }
      T.oak(3); out.watchAt3 = !T.who('watchA').hidden && Math.hypot(T.who('watchA').x - 21.4, T.who('watchA').y - 3.2) < 0.4;
      T.oak(10); const b = T.who('tullboy'); out.boyAt10 = !b.hidden && Math.hypot(b.x - 21.5, b.y - 19.5) < 0.4;
      return out;
    });
    check(r[10].length >= 15 && r[15].length >= 15, 'by day the town is busy (' + r[10].length + ' out at ten, ' + r[15].length + ' at three)');
    check(r[3].length <= 3 && r[3].includes('watchA') && !r[3].includes('dyer'), 'at the dead hour only the watch is out (' + r[3].join(',') + ')');
    check(r[20].includes('drinkA') && r[20].includes('wicker') && r[22].includes('mother'), 'evening has its own people: the Boar\'s door, the lamp-trimmer, the mother walking the baby');
    check(r.watchAt3 && r.boyAt10, 'each stands where the hour puts them');

    // ---- walking: real routes, home at home time
    r = await page.evaluate(() => {
      const out = {};
      T.oak(11.95); const c = T.who('carpenter'), start = [c.x, c.y];
      let wall = 0; G.tod = 12.05 / 24; T.run(40, () => { if (!c.hidden && !T.open(c.x, c.y)) wall++; });
      out.lunch = Math.hypot(c.x - 25.3, c.y - 26.3) < 0.5 && Math.hypot(start[0] - 25.3, start[1] - 26.3) > 8; out.wall = wall;
      T.oak(18.98); const d = T.who('dyer'); out.outBefore = !d.hidden; G.tod = 19.1 / 24; T.run(30);
      out.inAfter = d.hidden && Math.hypot(d.x - 16.5, d.y - 37.4) < 0.3;
      // shuttles and wanderers keep moving
      T.oak(9); const w = T.who('woolman'), k = T.who('kidA'); const w0 = [w.x, w.y], k0 = [k.x, k.y]; let kidWall = 0, wFar = 0, kFar = 0; G.tod = 9 / 24;
      T.run(25, () => { if (!T.open(k.x, k.y)) kidWall++; wFar = Math.max(wFar, Math.hypot(w.x - w0[0], w.y - w0[1])); kFar = Math.max(kFar, Math.hypot(k.x - k0[0], k.y - k0[1])); });
      out.shuttle = wFar > 3; out.play = kFar > 0.3 && !kidWall;
      return out;
    });
    check(r.lunch && !r.wall, 'the carpenter walks from his ladder to the bench for his noon bread, round the houses, never through a wall');
    check(r.outBefore && r.inAfter, 'at home time the dyer\'s wife walks to her door and goes in');
    check(r.shuttle && r.play, 'the wool-factor\'s man shuttles his bales; the children run about (inside open ground)');

    // ---- talking and overhearing
    r = await page.evaluate(() => {
      const out = {};
      T.oak(10); const c = T.who('carpenter'); talk(c);
      out.dlg = G.state === 'dialogue' && /Shutters\. Whoever lived here/.test(document.body.innerHTML);
      const b = document.querySelector('[data-life]'); out.topicBtn = !!b && b.textContent === 'What are you doing?';
      if (b) b.click(); out.ans = /The shuttered house\. It.ll be somebody.s again/.test(document.getElementById('dlg-log').innerHTML);
      try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      // overheard
      window.__msgs.length = 0; T.oak(10); const om = T.who('oldman'); Engine.cam.x = om.x; Engine.cam.y = om.y + 1.2; G.player.x = Engine.cam.x; G.player.y = Engine.cam.y;
      T.run(14, () => { Engine.cam.x = om.x; Engine.cam.y = om.y + 1.2; });
      out.bark = window.__msgs.some((t) => /^An old man/.test(t));
      // they are witnesses
      T.oak(10); const dy = T.who('dyer'); Engine.cam.x = dy.x; Engine.cam.y = dy.y - 2; dy.facing = -Math.PI / 2;
      out.witness = !!theftWitness(null);
      return out;
    });
    check(r.dlg, 'you can speak to them: the carpenter answers in his own words');
    check(r.topicBtn && r.ans, 'their own question sits right in the conversation, and gets their own answer');
    check(r.bark, 'walk close and you overhear them, whispering');
    check(r.witness, 'a townsperson who can see you is a witness');

    // ---- the contract: not saved; rest snaps; gone after the Greening; switch
    r = await page.evaluate(() => {
      const out = {};
      T.oak(10); out.unsaved = !/p60_/.test(JSON.stringify(snapshotGame()));
      T.oak(10); passHours(9); const d = T.who('dyer'); out.snap = d.hidden && Math.hypot(d.x - 16.5, d.y - 37.4) < 0.3;
      G.flags.greening = true; T.oak(10); out.gone = LIFE60.people(G.map).length === 0 && !G.ents.some((e) => e._lifeProp);
      delete G.flags.greening; T.oak(10); out.back = LIFE60.people(G.map).length > 20;
      GFX.life = false; T.oak(10); out.off = LIFE60.people(G.map).length === 0; GFX.life = true; T.oak(10); out.on = LIFE60.people(G.map).length > 20;
      loadMap('greenhall'); out.otherMap = LIFE60.people(G.map).length === 0 && !LIFE60.people(G.map).some((e) => /^p60_(tullboy|dyer|carpenter)$/.test(e.id));
      return out;
    });
    check(r.unsaved, 'nothing of theirs goes into a save');
    check(r.snap, 'resting nine hours puts everyone where the new hour does');
    check(r.gone && r.back, 'after the Greening Oakhaven is empty of them, and their things');
    check(r.off && r.on, 'GFX.life switches them off and on');
    check(r.otherMap, 'they stay in Oakhaven');

    await frCheck(page, 'p60-life.tsv', 'LIFE60', 'the engine');
    await frCheck(page, 'p60-life.tsv', 'LIFE60_OAK', 'Oakhaven\'s people');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
