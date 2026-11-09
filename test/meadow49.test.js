// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/meadow49.test.js
// The water-meadow, played (js/meadow49.js; Book One ch. 6; ROADMAP R9 item 4): Nell at the blue door, the crossing both
// ways Tam can be, the culvert, the whistle duel, the calling-song, the jitter, Tam's walk, the bank, the end card, missing
// it, a save in the meadow, and French. Set SHOT_DIR to also write screenshots.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /meadow49/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof MEADOW49 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Meadow Tester');
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
      window.__fresh = JSON.parse(JSON.stringify(G.flags));
      window.T = {
        reset(day, h) { for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, JSON.parse(JSON.stringify(window.__fresh))); G.journal.length = 0; G.day = day; G.tod = h / 24; window.__ev.length = 0; window.__msgs.length = 0; for (const e of G.maps.oakhaven.entities) if (e && e.id === 'tam') e.hidden = false; },
        go(id, h) { if (h != null) G.tod = h / 24; loadMap(id); G.state = 'play'; G.keys = {}; },
        step(n) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(0.033); } },
        until(pred, n) { for (let i = 0; i < (n || 900) && !pred(); i++) { G.state = 'play'; G.keys = {}; G.player.hp = Math.max(G.player.hp, 10); update(0.033); } return pred(); },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        ent(k) { return G.map.entities.find((e) => e._p49 === k); },
      };
    });
    const tick = () => page.waitForTimeout(40);
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- Nell, the crossing (tam_left), the culvert
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(3, 18.8); G.flags.tam_left = true; T.go('p30_hollow'); T.step(1); out.waits = MEADOW49.stage() === 0;
      G.tod = 19.05 / 24; T.step(1);
      out.nell = MEADOW49.stage() === 1 && /He said he heard you/.test(T.last().b) && T.last().c.length === 2;
      T.pick(/Run for the culvert/); const ev = T.last();
      out.cross = MEADOW49.stage() === 2 && /grate is pushed aside/.test(ev.b) && /I'd stopped/.test(ev.b) && /Let me sing to your hands/.test(ev.b);
      T.pick(/Crawl through/);
      out.meadow = G.mapId === 'p49_meadow' && MEADOW49.stage() === 3 && /wrong side of the Hedge/.test(T.last().b) && ['lyra', 'pim', 'wearer'].every((k) => !!T.ent(k));
      const back = G.map.get(0, 11); out.shut = back.locked === 'p49_back' && !G.flags.p49_back;
      out.wearerNotFoe = T.ent('wearer').kind === 'deco';
      return out;
    });
    check(r.waits && r.nell, 'at the Listening Hour on Massday Nell comes down the lane: "He said he heard you"');
    check(r.cross, 'the crossing: the grate pushed aside, Tam had stopped humming to listen, and the voice through the Hedge');
    check(r.meadow && r.shut && r.wearerNotFoe, 'through the culvert into the silent meadow: Pim halfway, the shape at the trees (not a foe); no way back without the boy');
    await shot('p49-meadow', () => { loadMap('p49_meadow', { x: 3.6, y: 11.2, dir: 0.02 }); G.state = 'play'; T.step(1); });

    // ---- the whistle duel
    await page.evaluate(() => T.pick(/Whistle the falling fifth/)); await tick();
    r = await page.evaluate(() => ({ h: window.__holds[0], w1: /a sixth instead of a fifth/.test(T.last().b) }));
    const fifth = r.h && Math.abs(r.h.curve[r.h.curve.length - 1][1] / r.h.curve[1][1] - 2 / 3) < 0.001 && r.h.curve[1][1] === 348;
    check(fifth && r.w1, 'whistle the falling fifth (the Root and down); it answers a sixth too wide');
    await page.evaluate(() => { window.__score = 0.1; T.pick(/Whistle/); }); await tick();
    r = await page.evaluate(() => ({ w2: /wide fifth/.test(T.last().b), slip: T.heard(/cracks and goes to air/), n: G.flags.p49_whistle }));
    check(r.w2 && r.slip && r.n === 1, 'a cracked whistle still lets it answer: a wide fifth now');
    await page.evaluate(() => { window.__score = 1; T.pick(/Whistle/); }); await tick();
    r = await page.evaluate(() => ({ w3: /exactly right/.test(T.last().b) && /works on a mimic once/.test(T.last().b), j: G.journal.some((j) => /a sixth too wide, then a wide fifth, then exactly right/.test(j.text)), n: G.flags.p49_whistle }));
    check(r.w3 && r.j && r.n === 2, 'the third time it whistles it exactly right: a trick works on a mimic once');

    // ---- it sings instead; the jitter; Tam's walk
    r = await page.evaluate(() => {
      const out = {};
      T.pick(/Keep them off her back/); out.sing = /one perfect, one ruined/.test(T.last().b);
      T.pick(/Keep them off her back/); out.jitter = MEADOW49.stage() === 4 && MEADOW49.hounds().length === 4 && T.heard(/jitter comes out of the tree-line/);
      out.caught = T.until(() => T.heard(/Lyra has him/), 400);
      out.tam = T.until(() => MEADOW49.stage() === 5, 600) && !!T.ent('tam') && G.flags.p49_tam === true && T.heard(/Miller's Daughter/);
      const hs = MEADOW49.hounds(); const tam = T.ent('tam'); const d0 = hs.map((h) => Math.hypot(h.x - tam.x, h.y - tam.y));
      T.step(30); const d1 = MEADOW49.hounds().map((h) => Math.hypot(h.x - T.ent('tam').x, h.y - T.ent('tam').y));
      out.veer = d1.length && d1.every((d, i) => d < d0[i] || d < 0.6);
      out.gone = T.until(() => MEADOW49.stage() === 6, 600) && G.flags.p49_back === true && !MEADOW49.hounds().length && T.ent('tam').hidden && T.heard(/He misses the high note/);
      return out;
    });
    check(r.sing && r.jitter && r.caught, 'it sings the calling-song; Lyra answers torn; Pim runs to her; the jitter comes out of the trees');
    check(r.tam && r.veer && r.gone, 'Tam walks out singing The Miller\'s Daughter; the hounds veer past you to him; he misses the high note');
    await shot('p49-tam', () => { G.flags.p49 = 5; loadMap('p49_meadow', { x: 4.6, y: 9.6, dir: -1.9 }); G.state = 'play'; MEADOW49.tamWalks(); T.step(20); });

    // ---- the bank; the end card; Tam gone from his bench
    r = await page.evaluate(() => {
      const out = {}; G.flags.p49 = 6;
      const c = G.maps.p49_meadow.get(0, 11); loadMap('p49_meadow'); transfer(c.portal); G.state = 'play'; T.step(1);
      const ev = T.last();
      out.after = MEADOW49.stage() === 9 && G.mapId === 'oakhaven' && /sets it straight at the crossing/.test(ev.b) && /Exactly right/.test(ev.b);
      out.flags = G.flags.pim_lured === true && G.journal.some((j) => /The water-meadow/.test(j.text));
      out.tamGone = G.map.entities.filter((e) => e.kind === 'npc' && e.id === 'tam').every((e) => e.hidden) && !!T.ent('stool');
      out.end = /walked out into the water-meadow singing/.test(MEADOW49.endLine() || '') && /MEADOW49\.endLine/.test(String(window.buildEnding || '') + '') !== null;
      return out;
    });
    check(r.after && r.flags, 'back through the culvert: Nell on the bank with Pim; the dye-works woman sets Tam\'s stool straight; the whistle at dawn, exactly right');
    check(r.tamGone && r.end, 'Old Tam is gone from his bench, his stool at the crossing, and the end card tells his walk on Massday');
    const endSrc = src('js/game.js');
    check(/MEADOW49\.endLine\(\)/.test(endSrc) && /else if \(f\.tam_told\)/.test(endSrc), 'game.js asks the meadow for Tam\'s end-card line first, and keeps his old lines when you missed it');

    // ---- the tam_told crossing; letting Lyra go; missing it; a save in the meadow
    r = await page.evaluate(() => {
      const out = {};
      T.reset(3, 19.1); G.flags.tam_told = true; T.go('oakhaven'); T.step(1); T.pick(/Run/);
      out.told = /You told me it isn't her/.test(T.last().b);
      T.reset(3, 19.1); T.go('tannery'); T.step(1); T.pick(/Let Lyra go/); out.letGo = MEADOW49.stage() === 9 && G.mapId === 'tannery' && !MEADOW49.endLine();
      T.reset(3, 18.9); T.go('p31_bellyard'); T.step(1); G.tod = 21.2 / 24; T.step(2); out.missed = MEADOW49.stage() === 9 && !G.flags.p49_tam;
      T.reset(3, 19.1); T.go('oakhaven'); T.step(1); T.pick(/Run/); T.pick(/Crawl/);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p49_meadow' && MEADOW49.stage() === 3 && !!T.ent('wearer');
      return out;
    });
    check(r.told, 'if you told Tam the truth, he went down early and is the first one at the grate');
    check(r.letGo && r.missed, 'let Lyra go, or be elsewhere at the Hour, and it happens without you; Tam keeps his old ending');
    check(r.saved, 'a save in the meadow loads back into it');

    // ---- French for every new string
    const tsv = src('tools/i18n/p49-meadow.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => MEADOW49.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL MEADOW49 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
