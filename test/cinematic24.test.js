// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3000 node test/cinematic24.test.js
// Phase 24 "The opening" (js/cinematic24.js): the camera sequence before the first step.
//  - a new game runs it: the intro screen hosts it, the HUD is off, the bars and captions show, the title card comes,
//    and it ends on loadMap('oakhaven') at the spawn with the clock back at dusk and nothing it staged left behind;
//  - every way out works at once: the Skip button, a click, Escape; the sky it held is let go;
//  - the setting turns it off and the old scrolling text comes back unchanged; the Options rows exist and persist;
//  - "Watch again" replays it from inside a game and puts you back where you stood;
//  - it runs under Reduce motion and on the CPU raycaster (no R3D) alike; no page errors anywhere.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000') + '/index.html?nosw=1';
const pass = (m) => console.log('PASS ' + m);

async function boot(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /cinematic24/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript((o) => {
    try { localStorage.clear(); if (o.setting) localStorage.setItem('octave.cine24.v1', JSON.stringify(o.setting)); } catch (e) { /* none */ }
    if (o.r3d) window.__r3d21 = { automation: true };
    let a = 2424; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, { r3d: opts.r3d !== false, setting: opts.setting || null });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof CINEMATIC24 !== 'undefined');
  await page.evaluate((o) => { try { if (o.r3d !== false) R3D.setMode('on'); else R3D.setMode('off'); } catch (e) { /* no R3D */ } if (typeof GFX !== 'undefined') { GFX.illustratedScreens = false; if (o.reduce) GFX.reduceMotion = true; } }, opts);
  return { page, errors };
}
// through character creation to the moment the intro (and the cinematic) starts
async function newGame(page, speed) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Opening Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.evaluate((s) => { CINEMATIC24.speed = s; }, speed || 1);
  await page.locator('#c-go').click();
  await page.waitForTimeout(300);
}
const snap = (page) => page.evaluate(() => ({
  on: CINEMATIC24.running(), shot: CINEMATIC24.shot(), state: G.state, map: G.mapId, staged: CINEMATIC24.staged(), stats: Object.assign({}, CINEMATIC24.stats),
  cam: [+Engine.cam.x.toFixed(2), +Engine.cam.y.toFixed(2), +Engine.cam.dir.toFixed(3), +Engine.cam.z.toFixed(2)], tod: G.tod,
  introCine: !!document.querySelector('#intro.cine'), skipText: (document.querySelector('#btn-intro-skip') || {}).textContent, ui: !!document.querySelector('#cine24'),
  bars: !!document.querySelector('#cine24.bars'), cap: (document.querySelector('#cine24 .cap') || {}).textContent || '', card: !!document.querySelector('#cine24 .card.on'),
  gameCls: document.getElementById('game').className, held: typeof Weather !== 'undefined' ? Weather.held : null, wstate: typeof Weather !== 'undefined' ? Weather.state : null,
  leftovers: Object.values(G.maps).reduce((n, m) => n + m.entities.filter((e) => e && e._cine).length, 0),
  introPs: document.querySelectorAll('#intro-text p').length,
  black: !!document.querySelector('#cine24.black'), who: (document.querySelector('#cine24 .who.on') || {}).textContent || '',
  music: typeof Audio_ !== 'undefined' && Audio_.music ? Audio_.music.current : null, ducked: CINEMATIC24.ducked(),
  voiceLast: typeof VOICE_ACT !== 'undefined' && VOICE_ACT.state ? VOICE_ACT.state.last : null,
}));
const untilDone = (page, ms) => page.waitForFunction(() => !CINEMATIC24.running(), null, { timeout: ms || 60000 });


(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    // ---------------------------------------------------------------- the whole sequence, R3D, at 6x
    {
      const { page, errors } = await boot(browser, { r3d: true });
      await newGame(page, 1);
      await page.waitForTimeout(1200);
      const a = await snap(page);
      await page.evaluate(() => { CINEMATIC24.speed = 6; });
      assert.equal(a.on, true, 'the cinematic runs after creation'); assert.equal(a.state, 'intro', 'in the intro state');
      assert.equal(a.introCine, true, 'the intro screen hosts it'); assert.equal(a.skipText, 'Skip', 'the button says Skip');
      assert.equal(a.ui && a.black, true, 'the prelude is black'); assert.equal(a.bars, false, 'no bars over black');
      assert.equal(a.shot, 0, 'in the prelude'); assert.equal(a.cap, 'What is holiness?', 'the catechism\'s question'); assert.equal(a.who, 'Ignatius Crane', 'and who asks it');
      assert.equal(a.music, 'opening', 'the director asks for the opening piece'); assert.equal(a.ducked, true, 'ducked under the line');
      assert.ok(a.gameCls.includes('cine24'), 'the HUD is hidden');
      assert.equal(a.held, true, 'the sky is held'); assert.equal(a.wstate, 'clear', 'and clear');
      await untilDone(page, 60000); await page.waitForTimeout(600);
      await page.waitForFunction(() => Audio_.music.current !== 'opening', null, { timeout: 10000 });   // the director's next frame
      const e = await snap(page);
      // what the cues did, shot by shot, from the module's own trace (headless frames are too slow to catch them live)
      const log = await page.evaluate(() => CINEMATIC24.trace());
      const at = (shot, re) => log.find((x) => x.shot === shot && re.test(x.cap));
      assert.equal(log.filter((x) => x.id !== 'card').length, 12, 'twelve cues fired');
      const b = at(1, /four hundred and nineteenth/);
      assert.ok(b, 'the narrator\'s caption in the combe is the first intro line'); assert.equal(b.map, 'p22_combe', 'the second shot is Wethercombe'); assert.equal(b.who, '', 'no name over the narrator');
      assert.equal(b.id, 'narrator.open.0', 'the narrator\'s recorded line');
      const c = at(4, /glass-fire/);
      assert.ok(c, 'the column\'s caption'); assert.equal(c.map, 'greenroot', 'the fifth shot is Greenroot'); assert.ok(c.staged >= 12, 'the Synod column is staged (' + c.staged + ')');
      const c2 = at(4, /^One note\. One law\. One hand\.$/);
      assert.ok(c2, 'Ignatius speaks over the column'); assert.equal(c2.who, 'ignatius', 'named'); assert.equal(c2.id, 'ignatius.open.onenote', 'his recorded line');
      const d = log.find((x) => x.shot === 6 && x.id === 'card');
      assert.ok(d, 'the title card shows'); assert.equal(d.staged, 0, 'the column is gone before the card');
      const g = at(7, /Keep your voice in your chest/);
      assert.ok(g, 'Harrow\'s second line at the gate'); assert.equal(g.map, 'oakhaven', 'the last shot is the gate'); assert.equal(g.who, 'harrow', 'Harrow speaks');
      assert.ok(at(7, /Greenroot road/), 'and his first'); assert.equal(e.voiceLast, 'harrow.open.1', 'the last recorded line played was his');
      assert.equal(e.state, 'play', 'play after the opening'); assert.equal(e.map, 'oakhaven', 'in Oakhaven');
      assert.deepEqual(e.cam.slice(0, 3), [23.5, 3.5, 1.571], 'at the North Gate spawn, facing the town');
      assert.ok(Math.abs(e.tod - 0.74) < 0.01, 'the clock is back at dusk (' + e.tod.toFixed(3) + ')');
      assert.equal(e.leftovers, 0, 'nothing staged is left in any map'); assert.equal(e.ui, false, 'the overlay is gone');
      assert.equal(e.introCine, false, 'the intro screen is itself again'); assert.equal(e.skipText, 'Continue', 'and its button');
      assert.ok(!e.gameCls.includes('cine24'), 'the HUD is back'); assert.equal(e.held, false, 'the sky is let go');
      assert.equal(e.stats.finished, 1, 'finished once'); assert.equal(e.stats.shots, 8, 'eight shots'); assert.equal(e.stats.errors, 0, 'no internal errors');
      assert.equal(e.stats.lines, 12, 'twelve recorded lines were played'); assert.notEqual(e.music, 'opening', 'the director is its own again (' + e.music + ')');
      const msgs = await page.evaluate(() => document.querySelector('#msgs').textContent);
      assert.match(msgs, /Nullday/, 'the game\'s own first message follows');
      assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
      pass('the whole opening, R3D: eight shots, the catechism, the narrator, the column, the card, Harrow, and play at the gate');
      await page.close();
    }
    // ---------------------------------------------------------------- skipping: the button, a click, Escape; and a replay
    {
      const { page, errors } = await boot(browser, { r3d: true });
      await newGame(page, 1);
      await page.waitForTimeout(800);
      await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(500);
      let s = await snap(page);
      assert.equal(s.on, false, 'skipped'); assert.equal(s.state, 'play', 'play at once'); assert.equal(s.map, 'oakhaven', 'in Oakhaven');
      assert.deepEqual(s.cam.slice(0, 2), [23.5, 3.5], 'at the spawn'); assert.equal(s.leftovers, 0, 'nothing staged left'); assert.equal(s.held, false, 'the sky let go');
      assert.equal(s.stats.skipped, 1, 'counted as skipped');
      // replay from inside the game: put back where you stood when skipped with Escape
      await page.evaluate(() => { G.state = 'play'; loadMap('oakhaven', { x: 30.5, y: 23.5, dir: 0.4 }); G.state = 'play'; G.fadeT = 0; });
      const ok = await page.evaluate(() => CINEMATIC24.replay());
      assert.equal(ok, true, 'replay starts'); await page.waitForTimeout(500);
      s = await snap(page);
      assert.equal(s.on && s.state === 'intro', true, 'replaying in the intro state'); assert.equal(s.shot === 0 && s.black, true, 'from the prelude');
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      s = await snap(page);
      assert.equal(s.on, false, 'Escape skips the replay'); assert.equal(s.state, 'play', 'back in play');
      assert.deepEqual(s.cam.slice(0, 3), [30.5, 23.5, 0.4], 'where you stood'); assert.equal(s.leftovers, 0, 'nothing left');
      // a click on the screen skips too
      await page.evaluate(() => CINEMATIC24.replay()); await page.waitForTimeout(400);
      await page.mouse.click(640, 300); await page.waitForTimeout(400);
      s = await snap(page);
      assert.equal(s.on, false, 'a click skips'); assert.equal(s.state, 'play', 'and plays on');
      assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
      pass('skip by button, Escape and click; replay returns you to where you stood');
      await page.close();
    }
    // ---------------------------------------------------------------- the setting off: the old intro, untouched
    {
      const { page, errors } = await boot(browser, { r3d: true, setting: { play: 0 } });
      await newGame(page, 1);
      const s = await snap(page);
      assert.equal(s.on, false, 'no cinematic'); assert.equal(s.state, 'intro', 'the old intro'); assert.equal(s.introCine, false, 'plain intro screen');
      assert.equal(s.introPs, 6, 'six paragraphs of the old text'); assert.equal(s.skipText, 'Continue', 'its own button'); assert.equal(s.ui, false, 'no overlay');
      await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(400);
      const t = await snap(page);
      assert.equal(t.state, 'play', 'Continue plays'); assert.equal(t.map, 'oakhaven', 'in Oakhaven');
      // the Options rows: the switch persists; the replay row exists in a game
      const rows = await page.evaluate(() => {
        renderAccessibilityMenu();
        const b = document.getElementById('cine24-play'), r = document.getElementById('cine24-replay');
        const before = b && b.textContent; if (b) b.click();
        const after = b && b.textContent; const stored = localStorage.getItem('octave.cine24.v1');
        closeModal(); G.state = 'play';
        return { before, after, stored, replay: !!r };
      });
      assert.equal(rows.before, 'Off', 'the row shows Off'); assert.equal(rows.after, 'On', 'and toggles'); assert.equal(rows.stored, '{"play":1}', 'and persists');
      assert.equal(rows.replay, true, 'a replay row in a game');
      assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
      pass('setting off gives the old intro; the Options rows toggle and persist');
      await page.close();
    }
    // ---------------------------------------------------------------- the mix, and the column on the road
    {
      const { page, errors } = await boot(browser, { r3d: true });
      const mix = await page.evaluate(() => {
        const C = CINEMATIC24, out = { bed: C.BED, envLen: C.ENV.length, rows: [] };
        let t0 = 0;
        for (const sh of C.SHOTS) {
          for (const ln of sh.lines || []) {
            const l = VOICE_ACT.LINES[ln.id], d = (l && l.d) || 3, mt = t0 + ln.at, v = C.LINE_DB[ln.id];
            let m = -60; for (let i = Math.floor(mt - 0.5); i <= Math.ceil(mt + d + 1); i++) if (C.ENV[i] != null) m = Math.max(m, C.ENV[i]);
            const g = Math.min(C.DUCK, Math.max(0.05, Math.pow(10, (v - m - 12 + 2.5) / 20)));
            // the score through its <audio> at 0.62 x g, the voice through the sfx bus at 1.5 x master 0.55
            out.rows.push({ id: ln.id, has: v != null && !!l, under: (v - 1.67) - (m - 4.15 + 20 * Math.log10(g)) });
          }
          t0 += sh.dur;
        }
        return out;
      });
      assert.ok(mix.bed < 1, 'the score sits below full between lines (' + mix.bed + ')');
      assert.ok(Math.abs(mix.envLen - 105) <= 2, 'the loudness map covers the whole score (' + mix.envLen + ' s)');
      for (const r of mix.rows) { assert.ok(r.has, 'loudness and length known for ' + r.id); assert.ok(r.under >= 10, r.id + ': the score is at least 10 dB under the voice (' + r.under.toFixed(1) + ')'); }
      await newGame(page, 6);
      await page.waitForFunction(() => CINEMATIC24.shot() === 4, null, { timeout: 60000 });
      await page.evaluate(() => { CINEMATIC24.speed = 1.5; window.__bad = []; window.__n = 0; window.__iv = setInterval(() => { if (CINEMATIC24.shot() !== 4) return; for (const e of G.map.entities) if (/^(proctor|herald|flambeau|p12_censer)$/.test(e.sprite || '') && !e.hidden) { window.__n++; const c = G.map.get(Math.floor(e.x), Math.floor(e.y)); if (c || e.y < 13.15 || e.y > 14.85) window.__bad.push(e.sprite + '@' + e.x.toFixed(1) + ',' + e.y.toFixed(1)); } }, 100); });
      await page.waitForFunction(() => CINEMATIC24.shot() >= 5, null, { timeout: 60000 });
      const col = await page.evaluate(() => { clearInterval(window.__iv); return { n: window.__n, bad: window.__bad.slice(0, 5), cam: CINEMATIC24.SHOTS[4].from.y }; });
      assert.ok(col.n > 100, 'the column was sampled (' + col.n + ')');
      assert.deepEqual(col.bad, [], 'every figure of the column that is drawn keeps to the cobbles, none inside a wall');
      assert.equal(col.cam, 14, 'the camera stands on the road\'s middle line');
      assert.deepEqual(errors, [], 'no page errors');
      await page.close();
      pass('the score sits under every voiced line; the Synod column walks the middle of the road');
    }
    // ---------------------------------------------------------------- Reduce motion, and the CPU raycaster, at 3x
    for (const o of [{ r3d: true, reduce: true, name: 'Reduce motion' }, { r3d: false, name: 'CPU raycaster (no R3D)' }]) {
      const { page, errors } = await boot(browser, o);
      await newGame(page, 3);
      await page.waitForFunction(() => CINEMATIC24.shot() >= 1, null, { timeout: 30000 });   // past the prelude: a map is up
      await page.waitForTimeout(300);
      const a = await snap(page);
      assert.equal(a.on, true, 'runs');
      if (!o.r3d) assert.equal(a.cam[3], a.cam[3] && +(await page.evaluate(() => (G.map.groundAt ? G.map.groundAt(Engine.cam.x, Engine.cam.y) : 0) + 0.88)).toFixed(2), 'eye height on the raycaster');
      if (o.reduce) { const b = await snap(page); assert.deepEqual(b.cam.slice(0, 2), a.cam.slice(0, 2), 'the camera holds still under Reduce motion'); }
      await untilDone(page, 80000); await page.waitForTimeout(500);
      const e = await snap(page);
      assert.equal(e.state, 'play', 'play after'); assert.equal(e.map, 'oakhaven', 'in Oakhaven'); assert.equal(e.leftovers, 0, 'nothing left'); assert.equal(e.stats.errors, 0, 'no internal errors');
      assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
      pass('the opening under ' + o.name);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
