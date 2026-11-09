// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/life64.test.js
// The lived-in world, wave 3 (js/life64-cantabile.js; ROADMAP R10): Port Cantabile's Lantern Yard and Long Mole keep the
// hours. Every stop is on the quay and reachable; nobody steps into the water or up the cliff; the harbour stops and is
// silent while it counts after the Mole-bell; the children go in at Hesper's doors; and every line has French.
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
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof LIFE64_CANT !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Harbour Tester');
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
        hb(h) { G.tod = h / 24; loadMap('cantabile_harbour'); G.state = 'play'; return G.map; },
        quay(x, y) { return LIFE64_CANT.walk(G.map, Math.floor(x), Math.floor(y)); },
        who(k) { return LIFE60.people(G.map).find((e) => e._life === k); },
        open(x, y) { const m = G.map, g = LIFE60.grid(m); return !g[Math.floor(y) * m.w + Math.floor(x)]; },
        run(sec, fn) { for (let t = 0; t < sec; t += 0.1) { G.state = 'play'; LIFE60.tick(0.1); if (fn) fn(); } },
      };
    });

    // ---- the roster
    let r = await page.evaluate(() => {
      T.reset(); const m = T.hb(10), P = LIFE60.PLACES.cantabile_harbour, out = { bad: [] };
      out.n = P.roster.length; out.staged = LIFE60.people(m).length;
      for (const p of P.roster) {
        const pts = [p.home]; for (const s of p.day) { for (const q of [s.at, s.to2]) if (q) pts.push(q); if (typeof s.face === 'string' && !P.byKey[s.face]) out.bad.push(p.key + ' faces ' + s.face); }
        for (const q of pts) { if (!T.open(q[0], q[1]) || !T.quay(q[0], q[1])) out.bad.push(p.key + ' off the quay ' + q); else if (!LIFE60.path(m, p.home[0], p.home[1], q[0], q[1])) out.bad.push(p.key + ' unreachable ' + q); }
        for (let h = 0; h < 24; h += 0.25) { const k = p.day.filter((s) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to)).length; if (k !== 1) { out.bad.push(p.key + ' hour ' + h + ' x' + k); break; } }
      }
      out.oona = m.entities.some((e) => e.id === 'p17c_oona') && m.entities.some((e) => e.id === 'p17c_bessa');
      return out;
    });
    check(r.n >= 20 && r.staged === r.n, 'the harbour has its people, all staged (' + r.n + ')');
    check(!r.bad.length, 'every stop is on the quay and reachable, every hour covered once (' + r.bad.slice(0, 3).join('; ') + ')');
    check(r.oona, 'the extra\'s own people (Oona Salt, Auld Bessa and the rest) are where they were');

    // ---- they keep to the quay
    r = await page.evaluate(() => {
      const out = { off: 0, moved: 0 };
      T.hb(10); const ps = LIFE60.people(G.map).filter((e) => !e.hidden), p0 = ps.map((e) => [e.x, e.y]);
      for (let i = 0; i < 400; i++) { T.run(0.1); for (const e of ps) if (!e.hidden && !T.quay(e.x, e.y)) out.off++; }
      out.moved = ps.filter((e, i) => Math.hypot(e.x - p0[i][0], e.y - p0[i][1]) > 1).length;
      return out;
    });
    check(!r.off && r.moved >= 4, 'forty seconds of the morning: they come and go (' + r.moved + ' moved) and nobody steps into the water or up the cliff');

    // ---- the Mole-bell: the harbour counts
    r = await page.evaluate(() => {
      const out = {};
      T.hb(10); const d = T.who('diverA'); T.run(3); const at = [d.x, d.y];
      window.__msgs.length = 0; CANTABILE17.T.count = 8; T.run(4, () => { CANTABILE17.T.count = 8; });
      out.still = Math.hypot(d.x - at[0], d.y - at[1]) < 0.01 && !window.__msgs.length;
      CANTABILE17.T.count = 0; let far = 0; for (let i = 0; i < 80; i++) { T.run(0.1); far = Math.max(far, Math.hypot(d.x - at[0], d.y - at[1])); }
      out.again = far > 1;
      return out;
    });
    check(r.still && r.again, 'when the Mole-bell has rung they stand still and say nothing until the harbour has counted, then go on');

    // ---- the hours
    r = await page.evaluate(() => {
      const out = {}, vis = (h) => { T.hb(h); return LIFE60.people(G.map).filter((e) => !e.hidden).map((e) => e._life); };
      const v3 = vis(3), v10 = vis(10), v12 = vis(12.5), v13 = vis(13.2), v195 = vis(19.5), v21 = vis(21);
      out.night = v3.length === 1 && v3[0] === 'watch';
      out.day = v10.length >= 15;
      out.reader = v12.includes('reader') && !v13.includes('reader');
      out.kids = !v12.includes('kidA') && v10.includes('kidA');
      out.dusk = v195.includes('lamp') && v195.includes('watch') && v21.includes('nightfish');
      T.hb(12.5); const k = T.who('kidA'); out.kidDoor = Math.hypot(k.x - 14.5, k.y - 50.4) < 0.3;
      return out;
    });
    check(r.day && r.night, 'by day the Yard and the Mole are busy; at the dead of night only the watch is on the Mole-head');
    check(r.reader, 'the Articles are read at noon');
    check(r.kids && r.kidDoor, 'Hesper\'s children go in at her door for their dinner');
    check(r.dusk, 'at dusk the lamplighter and the night watch, and later a man fishing off the Mole');

    // ---- talking, overhearing, the contract
    r = await page.evaluate(() => {
      const out = {};
      T.hb(10); const c = T.who('rope'); talk(c); out.talk = G.state === 'dialogue' && /Left hand over right/.test(document.body.innerHTML) && !!document.querySelector('[data-life]');
      try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play';
      window.__msgs.length = 0; T.hb(10); const p = T.who('pilot'); Engine.cam.x = p.x - 1.2; Engine.cam.y = p.y; T.run(14, () => { Engine.cam.x = p.x - 1.2; Engine.cam.y = p.y; });
      out.bark = window.__msgs.some((t) => /^A pilot/.test(t) || /^A boy with a bucket/.test(t) || /^A Free Captain/.test(t));
      T.hb(10); out.unsaved = !/p60_/.test(JSON.stringify(snapshotGame()));
      return out;
    });
    check(r.talk, 'you can speak to them, and they have a question of their own');
    check(r.bark, 'walk the Mole and you hear them');
    check(r.unsaved, 'nothing of theirs is saved');

    await frCheck(page, 'p64-cantabile.tsv', 'LIFE64_CANT', 'Port Cantabile\'s people');
    check(!errors.length, 'no errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) { fails++; console.log('FAIL exception ' + (e && e.stack || e)); }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
