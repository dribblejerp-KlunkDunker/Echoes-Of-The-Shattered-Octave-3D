// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r5stones47.test.js
// Release road R5 #6 (js/stones47.js): the standing-stone ring off the Greenroot road, and "Counted in Eights".
// It joins the clearing alone (outside the Hedge), has no softlock, closes cleanly at the Greening, and has French.
// Set SHOT_DIR to also write screenshots.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /stones47/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof STONES47 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Stones Tester');
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
      window.__score = 1; window.__holds = [];
      REEDS.holdPitch = (o) => { window.__holds.push(o); return Promise.resolve({ score: window.__score, held: 1, aborted: false }); };
      window.T = {
        go(id, x, y, dir, tod) { if (tod != null) G.tod = tod; loadMap(id, x == null ? undefined : { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.033); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        use(e) { window.__ev.length = 0; useDeco(e); return window.__ev[window.__ev.length - 1] || null; },
        pick(ev, re) { const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        portalAt(id, x, y) { const c = G.maps[id].get(x, y); return c && c.portal ? c.portal.map : null; },
        stone(i) { return G.ents.find((e) => e.use === 'p47_stone' && e.stone === i); },
      };
    });
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };
    const flush = () => page.waitForTimeout(30);

    // ---- the way in: a second gap in the clearing's east hedge, beside the Greenroot road's, and nothing else
    const ways = await page.evaluate(() => {
      const S = STONES47, out = {};
      out.gap = T.portalAt('clearing', S.GAP[0], S.GAP[1]) === S.MAP && /standing-stones/.test(G.maps.clearing.get(S.GAP[0], S.GAP[1]).label);
      out.road = T.portalAt('clearing', 39, 33) === 'greenroot';
      out.back = T.portalAt(S.MAP, 0, 15) === 'clearing';
      const into = []; for (const id in G.maps) { if (id === S.MAP) continue; for (const c of G.maps[id].cells) if (c && c.portal && c.portal.map === S.MAP) into.push(id); }
      out.only = into.length === 1 && into[0] === 'clearing';
      const outOf = []; for (const c of G.maps[S.MAP].cells) if (c && c.portal) outOf.push(c.portal.map);
      out.joinsOne = outOf.length === 1 && outOf[0] === 'clearing';
      const land = (m, x, y) => !m.isBlocked(Math.floor(x), Math.floor(y)) && !m.entities.some((o) => o && o.solid && (o.x - x) ** 2 + (o.y - y) ** 2 < ((o.radius || 0.3) + 0.25) ** 2);
      const p1 = G.maps.clearing.get(S.GAP[0], S.GAP[1]).portal, p2 = G.maps[S.MAP].get(0, 15).portal;
      out.lands = land(G.maps[S.MAP], p1.x, p1.y) && land(G.maps.clearing, p2.x, p2.y);
      // no softlock: every stone and the tongue-stones can be reached from the gap, and the gap from each of them
      const m = G.maps[S.MAP], sp = { x: p1.x, y: p1.y };
      const targets = [S.PEBBLES].concat([0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const p = S.stoneAt(i); return { x: p.x + (S.RING.x - p.x) * 0.2, y: p.y + (S.RING.y - p.y) * 0.2 }; }));
      const r = HORIZON20.reach(m, Math.floor(sp.x), Math.floor(sp.y), Math.floor(sp.x), Math.floor(sp.y));
      out.reach = r.stuck === 0 && r.maxDrop <= 0.5 && targets.every((t) => r.fwd[Math.floor(t.y) * m.w + Math.floor(t.x)] === 1);
      out.reached = r.reached;
      return out;
    });
    check(ways.gap && ways.road && ways.back, 'a gap in the clearing\'s east hedge, beside the Greenroot road\'s, leads to the standing-stones and back');
    check(ways.only && ways.joinsOne && ways.lands, 'it joins the clearing alone (outside the Hedge); both doorways land on open ground');
    check(ways.reach, 'every stone and the tongue-stones can be walked to from the gap, with no softlock and no fall that hurts (' + ways.reached + ' cells)');

    // ---- the ring
    const ring = await page.evaluate(() => {
      const out = {};
      window.__msgs.length = 0;
      T.go('p47_stones', null, null, 0, 0.3); T.step(2);
      out.entered = T.heard(/Eight stones in a ring/);
      const st = G.ents.filter((e) => e.use === 'p47_stone');
      out.eight = st.length === 8 && st.filter((e) => e.solid).length === 7 && st.find((e) => e.stone === 7).sprite === 'p47_fallen' && T.stone(0).sprite === 'p47_stone_tall';
      out.faces = [0, 1, 2, 3, 4, 5, 6, 7].every((i) => { const ev = T.use(T.stone(i)); return ev && ev.b === STONES47.STONES[i][2] && ev.c.length === 1; });
      out.root = /tree cut into its face/.test(STONES47.STONES[0][2]) && /circle with nothing in it/.test(STONES47.STONES[7][2]);
      out.pebbles = G.ents.some((e) => e.use === 'p47_pebbles');
      out.hounds = G.ents.filter((e) => e.kind === 'enemy' && e.type === 'hound').length === 2;
      out.sprites = ['oak', 'p20_thorn', 'p47_stone_tall', 'p47_stone0', 'p47_stone1', 'p47_stone2', 'p47_fallen', 'p47_pebbles'].every((k) => !!Engine.sprites[k]);
      out.free = !solidAt(Engine.cam.x, Engine.cam.y);
      out.rise = G.map.groundAt(STONES47.RING.x, STONES47.RING.y) > 0.2;
      return out;
    });
    check(ring.entered && ring.free && ring.eight && ring.sprites, 'eight stones in a ring, seven standing and Nullday\'s flat in the grass, the tallest the Root\'s');
    check(ring.faces && ring.root && ring.rise, 'each stone carries its day\'s sign; the ring stands on a low rise');
    check(ring.pebbles && ring.hounds, 'the tongue-stones in the hollow at the Root\'s foot; hounds out on the open ground');
    await shot('p47-ring', () => { T.go('p47_stones', 7.5, 16.5, -0.15, 0.32); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });
    await shot('p47-root', () => { const p = STONES47.PEBBLES; T.go('p47_stones', p.x + 0.6, p.y + 2.6, -Math.PI / 2 - 0.2, 0.3); for (const e of G.ents) if (e.kind === 'enemy') e.state = 'idle'; T.step(1); });

    // ---- "Counted in Eights"
    let q = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.go('p47_stones', null, null, 0, 0.3); T.step(1);
      let ev = T.use(T.stone(2)); out.notYet = ev.c.length === 1 && STONES47.stage() === 0;
      ev = T.use(G.ents.find((e) => e.use === 'p47_pebbles'));
      out.look = /tongue/.test(ev.b) && /Hedge eats a note/.test(ev.b);
      out.start = T.pick(ev, /Sing them out/) && STONES47.stage() === 1 && STONES47.count() === 0 && G.journal.some((j) => /Counted in Eights/.test(j.text));
      ev = T.use(T.stone(3)); out.order = /next is Rootday's/.test(ev.b) && ev.c.length === 1;
      ev = T.use(T.stone(0)); out.offer = ev.c.some((c) => /Hold the note/.test(c.t));
      window.__holdEv = ev;
      return out;
    });
    check(q.notYet && q.look && q.start, 'the tongue-stones tell what they are; "Sing them out the old way" opens Counted in Eights');
    check(q.order && q.offer, 'sunwise from the Root: a stone out of turn only says which is next');
    // hold at the first stone
    await page.evaluate(() => T.pick(window.__holdEv, /Hold the note/)); await flush(); await flush();
    q = await page.evaluate(() => ({ n: STONES47.count(), hz: window.__holds[0] && window.__holds[0].curve[1][1], title: window.__holds[0] && window.__holds[0].title, heard: T.heard(/1 of eight/) }));
    check(q.n === 1 && q.hz === 174 && /Rootday/.test(q.title) && q.heard, 'a held note at the Root\'s stone, at 174, counts one of eight');
    // too loud at the second
    await page.evaluate(() => { window.__score = 0.2; G.noise = 0; const ev = T.use(T.stone(1)); T.pick(ev, /Hold the note/); }); await flush(); await flush();
    q = await page.evaluate(() => ({ n: STONES47.count(), noise: G.noise, heard: T.heard(/Too loud/), hz: window.__holds[1].curve[1][1] }));
    check(q.n === 0 && q.noise >= 3 && q.heard && q.hz === 285, 'too loud, and the note carries to the hounds and the count goes back to the Root');
    // walk it right round
    await page.evaluate(() => { window.__score = 1; window.__holds.length = 0; });
    for (let i = 0; i < 7; i++) { await page.evaluate((k) => { const ev = T.use(T.stone(k)); T.pick(ev, /Hold the note/); }, i); await flush(); await flush(); }
    q = await page.evaluate(() => ({ n: STONES47.count(), hz: window.__holds.map((h) => h.curve[1][1]) }));
    check(q.n === 7 && q.hz.join(',') === '174,285,396,417,528,639,741', 'seven stones held in turn, each at its own Anchor\'s pitch');
    q = await page.evaluate(() => {
      const out = {}, xp0 = G.player.xp;
      let ev = T.use(T.stone(7)); out.noHold = !ev.c.some((c) => /Hold/.test(c.t)) && ev.c.some((c) => /Let it go/.test(c.t));
      T.pick(ev, /Let it go/); ev = window.__ev[window.__ev.length - 1];
      out.done = STONES47.stage() === 2 && G.player.xp >= xp0 + 50 && /does not come back/.test(ev.b) && G.journal.some((j) => /let the note go at the eighth/.test(j.text));
      ev = T.use(G.ents.find((e) => e.use === 'p47_pebbles')); out.after = /have been sung out/.test(ev.b) && ev.c.length === 1;
      ev = T.use(T.stone(0)); out.quiet = ev.c.length === 1;
      return out;
    });
    check(q.noHold && q.done, 'at the eighth, the fallen stone, you do not hold: you let it go (50 xp)');
    check(q.after && q.quiet, 'afterwards the stones only look; the tongue-stones look no different');

    // ---- the Greening closes it; the map survives a save
    const close = await page.evaluate(() => {
      const out = {}, f = G.flags, keep = JSON.parse(JSON.stringify(f));
      f.p47_q = 1; f.p47_n = 3; f.p47_closed = false;
      T.go('clearing', null, null, 0, 0.5); T.step(1); out.open = !f.p47_closed;
      f.greening = true; const n = G.journal.length; T.step(2); T.step(2);
      out.closed = f.p47_closed === true && G.journal.length === n + 1 && /nobody sang them out/.test(G.journal[0].text);
      T.go('p47_stones', null, null, 0, 0.5);
      const ev = T.use(G.ents.find((e) => e.use === 'p47_pebbles')); out.noStart = ev.c.length === 1;
      for (const k of Object.keys(f)) delete f[k]; Object.assign(f, keep);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p47_stones' && T.portalAt('clearing', STONES47.GAP[0], STONES47.GAP[1]) === 'p47_stones';
      return out;
    });
    check(close.open && close.closed && close.noStart, 'at the Greening an unsung count closes with one logbook line');
    check(close.saved, 'a save made at the stones loads back there, with the gap in the hedge');

    // ---- French for every new string
    const tsv = src('tools/i18n/p47-stones.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => STONES47.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R5 STONES TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
