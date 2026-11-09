// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3303 node test/dreams.test.js
// Phase 6 dreams: rest dreams and Light-glass memory echoes (js/dreams.js). Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.DREAMS_SHOTS || '';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Dream Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);
    await page.waitForFunction(() => typeof DREAMS === 'object');
    await page.evaluate(() => {
      window.requestAnimationFrame = () => 0;       // freeze the game loop so nothing moves under the checks
      window.dBase = JSON.stringify(snapshotGame());
      window.dReset = () => {
        restoreGame(JSON.parse(dBase)); G.state = 'play'; G.dead = false; G.keys = {};
        UPG.storyDreams = true; UPG.tutorial = false; GFX.reduceMotion = false; $('#msgs').innerHTML = '';
        if (typeof Weather !== 'undefined') Weather.hold('clear');
      };
      window.dOverlay = () => document.getElementById('p6d-overlay');
      window.dKey = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      window.dFlags = () => Object.keys(G.flags).filter(k => k.startsWith('p6d_'));
      window.dGo = (id) => { loadMap(id, G.maps[id].spawn); G.state = 'play'; G.keys = {}; };
    });

    // ---- content tables
    const tables = await page.evaluate(() => {
      const words = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&\w+;/g, ' ').split(/\s+/).filter(Boolean).length;
      return {
        dreams: DREAMS.DREAM_LIST.map(d => ({ id: d.id, n: d.text.reduce((a, t) => a + words(t), 0), tier: d.tier })),
        echoes: DREAMS.ECHO_LIST.length, ids: new Set(DREAMS.ECHO_LIST.map(e => e.id)).size,
        bad: DREAMS.DREAM_LIST.concat(DREAMS.ECHO_LIST).filter(x => /Measure 419|Hush (is|was|looks|has)/.test(JSON.stringify(x))).length,
      };
    });
    assert.ok(tables.dreams.length >= 10 && tables.dreams.length <= 16, 'between 10 and 16 dreams');
    for (const d of tables.dreams) assert.ok(d.n >= 60 && d.n <= 140, `dream ${d.id} is ${d.n} words (60-140)`);
    assert.ok(tables.echoes >= 10 && tables.ids === tables.echoes, 'at least ten distinct echoes');
    assert.equal(tables.bad, 0, 'no banned phrasing');
    console.log('PASS dream and echo tables: ' + tables.dreams.length + ' dreams, ' + tables.echoes + ' echoes');

    // ---- a dream plays on a rest, is skippable, and wakes the player back to play
    await page.evaluate(() => { dReset(); doRest('lamp'); });
    await page.waitForTimeout(2800);
    let s = await page.evaluate(() => ({ ov: !!dOverlay(), st: G.state, kind: DREAMS.openKind(), id: DREAMS.openId(), reed: G.flags.p6d_dr_reed === true, day: G.flags.p6d_day, gday: G.day, aria: dOverlay() && dOverlay().getAttribute('aria-modal'), title: dOverlay() && dOverlay().querySelector('.p6d-title').textContent }));
    assert.ok(s.ov && s.st === 'event' && s.kind === 'dream' && s.id === 'reed' && s.reed, 'first rest plays the first dream');
    assert.equal(s.day, s.gday + 1, 'the dream day is stored as a small integer');
    assert.equal(s.aria, 'true');
    if (SHOTS) await page.screenshot({ path: SHOTS + '/dream-1280.png' });
    await page.evaluate(() => dKey('Escape'));
    s = await page.evaluate(() => ({ ov: !!dOverlay(), st: G.state }));
    assert.ok(!s.ov && s.st === 'play', 'Escape skips the dream and returns to play');
    console.log('PASS a rest dream plays once and is skippable');

    // ---- at most one dream a day; deepens with the story; same story no repeat
    await page.evaluate(() => { G.flags.kaelen_met = true; doRest('self'); });   // same game day (4 hours)
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), day: G.day, anchors: G.flags.p6d_dr_anchors }));
    assert.ok(!s.ov && !s.anchors, 'a second rest on the same day brings no dream');
    await page.evaluate(() => { G.tod = 0.9; doRest('lamp'); });                  // crosses to a new day
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), id: DREAMS.openId() }));
    assert.ok(s.ov && s.id === 'anchors', 'next day: the lowest-tier eligible dream (tier 1, list order) plays');
    await page.evaluate(() => dKey('Enter'));
    await page.evaluate(() => { G.tod = 0.9; doRest('lamp'); });
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), id: DREAMS.openId() }));
    assert.ok(s.ov && s.id === 'foundry', 'then the next unseen eligible dream');
    await page.evaluate(() => dKey(' '));
    await page.evaluate(() => { G.tod = 0.9; doRest('lamp'); });
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay() }));
    assert.ok(!s.ov, 'nothing eligible left: no dream');
    console.log('PASS at most one dream per day, in story order, never repeated');

    // ---- conditions: late dreams need their flags
    const cond = await page.evaluate(() => {
      dReset();
      const r = {};
      const ids = () => DREAMS.DREAM_LIST.filter(d => { try { return d.when(); } catch (e) { return false; } }).map(d => d.id);
      r.start = ids();
      G.flags.vane_vesper = true; r.vane = ids().includes('hawser');
      G.flags.part3 = true; r.names = ids().includes('names');
      G.flags.kaelen_told_now = true; r.glass = ids().includes('glassing');
      G.flags.coda_done = true; r.ninth = ids().includes('ninth');
      return r;
    });
    assert.deepEqual(cond.start, ['reed'], 'a fresh game is eligible for the first dream only');
    assert.ok(cond.vane && cond.names && cond.glass && cond.ninth, 'story flags unlock their dreams');
    console.log('PASS dreams fire only under their conditions');

    // ---- never during custody, an escape, a bore hold, combat, or death; never over an interrupted rest
    const never = await page.evaluate(() => {
      dReset(); const r = {};
      const crime = crimeState();
      crime.custody = { remaining: 6 }; r.custody = DREAMS.maybeDream(); crime.custody = null;
      G.escapeTimer = 30; r.escape = DREAMS.maybeDream(); G.escapeTimer = 0;
      G.boreHold = 30; r.bore = DREAMS.maybeDream(); G.boreHold = 0;
      G.dead = true; r.dead = DREAMS.maybeDream(); G.dead = false;
      G.state = 'panel'; r.panel = DREAMS.maybeDream(); G.state = 'play';
      const c = Engine.cam;
      const h = hydrate({ kind: 'enemy', type: 'hound', x: c.x + 3, y: c.y }); h.state = 'chase'; G.ents.push(h);
      r.combat = DREAMS.maybeDream();
      G.ents.splice(G.ents.indexOf(h), 1);
      r.clear = DREAMS.calm();
      return r;
    });
    assert.deepEqual([never.custody, never.escape, never.bore, never.dead, never.panel, never.combat], [false, false, false, false, false, false], 'no dream under custody/escape/bore hold/death/panels/combat');
    assert.equal(never.clear, true);
    // a rest that hounds interrupted does not dream
    await page.evaluate(() => {
      dReset(); G.map.danger = 1; const _r = Math.random; Math.random = () => 0;
      try { doRest('self'); } finally { Math.random = _r; }
    });
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), hounds: G.ents.filter(e => e.kind === 'enemy' && e.state === 'chase').length }));
    assert.ok(s.hounds > 0 && !s.ov, 'hounds came to the fire: no dream over it');
    console.log('PASS no dreams in custody, combat, death or an interrupted rest');

    // ---- hardcore: dreams still play, and a dead run never dreams
    s = await page.evaluate(() => {
      dReset(); G.player.hardcore = true; doRest('lamp');
      return new Promise(res => setTimeout(() => { const r = { ov: !!dOverlay() }; DREAMS.closeCard(); G.player.hardcore = false; res(r); }, 700));
    });
    assert.ok(s.ov, 'hardcore run dreams like any other');
    console.log('PASS hardcore rest');

    // ---- save / load safe
    s = await page.evaluate(() => {
      dReset(); doRest('lamp');
      return new Promise(res => setTimeout(() => {
        const open = !!dOverlay();
        const d = JSON.parse(JSON.stringify(snapshotGame()));
        restoreGame(d); G.state = 'play';
        res({ open, closed: !dOverlay(), seen: G.flags.p6d_dr_reed === true, day: G.flags.p6d_day, again: DREAMS.maybeDream(), st: G.state });
      }, 700));
    });
    assert.ok(s.open && s.closed && s.seen && s.st === 'play', 'loading closes an open card; flags survive a save');
    assert.equal(s.again, false, 'the dream is not replayed the same day after a load');
    s = await page.evaluate(() => { dReset(); return { none: dFlags().length, old: DREAMS.pickDream() && DREAMS.pickDream().id }; });
    assert.equal(s.none, 0, 'an old save has no p6d_ flags'); assert.equal(s.old, 'reed');
    console.log('PASS save and load');

    // ---- hostile flags
    const hostile = await page.evaluate(() => {
      dReset(); const r = {};
      for (const bad of ['x', {}, [], NaN, -5, 1e99, '<img src=x onerror=alert(1)>', 1, 0, null]) {
        G.flags.p6d_day = bad;
        const stamp = G.day + 1;
        r['day_' + String(typeof bad === 'number' ? bad : typeof bad)] = DREAMS.dreamedToday() === (bad === stamp);
      }
      G.flags.p6d_day = 0;
      for (const bad of ['true', 1, {}, '<b>', ['reed']]) { G.flags.p6d_dr_reed = bad; if (DREAMS.dreamSeen('reed')) r.leak = true; }
      for (const bad of ['true', 1, {}, '<b>']) { G.flags.p6d_e_sh_wg = bad; if (DREAMS.echoSeen('sh_wg')) r.leak2 = true; }
      delete G.flags.p6d_dr_reed; delete G.flags.p6d_e_sh_wg;
      G.flags['p6d_dr_<script>alert(1)</script>'] = true; G.flags.p6d_e_evil = '<img src=x onerror=window.__pwn=1>';
      G.flags.p6d_dr_anchors = true; G.flags.p6d_e_sh_wg = true;
      renderLog();
      const log = document.getElementById('p6d-log');
      r.logOk = !!log && log.querySelectorAll('button').length === 2 && !log.querySelector('img,script');
      r.pwn = window.__pwn === undefined;
      closeModal(); G.state = 'play';
      return r;
    });
    assert.ok(!hostile.leak && !hostile.leak2, 'only exact booleans count as seen');
    assert.ok(hostile.logOk && hostile.pwn, 'hostile flag values and keys never reach markup');
    for (const k of Object.keys(hostile)) if (k.startsWith('day_')) assert.ok(hostile[k], 'hostile p6d_day handled: ' + k);
    console.log('PASS hostile flags');

    // ---- echoes: shard in a place, once per place
    await page.evaluate(() => { dReset(); dGo('whispergrove'); G.give('shard'); });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), kind: DREAMS.openKind(), id: DREAMS.openId(), flag: G.flags.p6d_e_sh_wg === true, st: G.state, lines: dOverlay() && dOverlay().querySelectorAll('.p6d-text p').length }));
    assert.ok(s.ov && s.kind === 'echo' && s.id === 'sh_wg' && s.flag && s.st === 'event' && s.lines >= 3, 'a shard in Whisper-Grove plays its echo');
    await page.waitForTimeout(2800);
    if (SHOTS) await page.screenshot({ path: SHOTS + '/echo-1280.png' });
    await page.evaluate(() => dKey('Escape'));
    await page.evaluate(() => { G.give('shard'); });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), pend: DREAMS.pending().length }));
    assert.ok(!s.ov && s.pend === 0, 'a second shard in the same place plays nothing');
    await page.evaluate(() => { dGo('deepwoods'); G.give('shard'); });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ id: DREAMS.openId() })); assert.equal(s.id, 'sh_dw', 'another place, another echo');
    await page.evaluate(() => dKey('Escape'));
    console.log('PASS shard echoes play once per place');

    // ---- glass walls, glass lamps, cores
    await page.evaluate(() => { dGo('quarry'); wallLabel({ tex: 't_stone' }); });
    await page.waitForTimeout(700);
    s = await page.evaluate(() => ({ ov: !!dOverlay() })); assert.ok(!s.ov, 'plain stone keeps nothing');
    await page.evaluate(() => { wallLabel({ tex: 't_glassrock' }); });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ id: DREAMS.openId() })); assert.equal(s.id, 'gl_qr', 'quarry glass-veined rock: the night of the bore');
    await page.evaluate(() => dKey('Escape'));
    await page.evaluate(() => {
      dGo('catacombs'); const lamp = G.ents.find(e => e.use === 'mirror_lantern'); window.__lamp = lamp; useDeco(lamp);
    });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), st: G.state, panel: G.openPanel, pend: DREAMS.pending().length }));
    assert.ok(!s.ov && s.pend === 1, 'the lamp echo waits while the mirror panel is open');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ id: DREAMS.openId() })); assert.equal(s.id, 'lp_cat', 'and plays when the player is back in the room');
    await page.evaluate(() => dKey('Escape'));
    // cores: a Legionnaire standing in front of the player
    await page.evaluate(() => {
      dGo('quarry'); const c = Engine.cam;
      const e = hydrate({ kind: 'enemy', type: 'legionnaire', x: c.x + Math.cos(c.dir) * 1.0, y: c.y + Math.sin(c.dir) * 1.0 });
      e.state = 'idle'; e.name = 'Tamsin <b>Reed</b>'; G.ents.push(e); window.__leg = e;
      e._screen = { x0: -9999, x1: 9999, y0: -9999, y1: 9999, dist: 1, z: 0 };   // the frozen loop draws no frame, so give pick() a projection
      window.__picked = Engine.pick(G.ents, USE_RANGE) === e;
      interact();
    });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ picked: window.__picked, id: DREAMS.openId(), txt: dOverlay() && dOverlay().querySelector('.p6d-text').textContent, html: dOverlay() && dOverlay().querySelector('.p6d-text').innerHTML }));
    assert.ok(s.picked && s.id === 'co_qr', 'listening at a Legionnaire\'s bell in the quarry plays its echo');
    assert.ok(/Tamsin/.test(s.txt) && !/<b>/.test(s.html), 'the name is set as text, letters only');
    await page.evaluate(() => dKey('Escape'));
    console.log('PASS glass walls, lamps and cores');

    // ---- never during combat or custody; plays when it is over
    await page.evaluate(() => {
      dReset(); dGo('clearing'); const c = Engine.cam;
      const h = hydrate({ kind: 'enemy', type: 'hound', x: c.x + 3, y: c.y }); h.state = 'chase'; G.ents.push(h); window.__h = h;
      G.give('shard');
    });
    await page.waitForTimeout(1000);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), pend: DREAMS.pending().length })); assert.ok(!s.ov && s.pend === 1, 'no echo while enemies are chasing nearby');
    await page.evaluate(() => { G.ents.splice(G.ents.indexOf(window.__h), 1); crimeState().custody = { remaining: 6 }; });
    await page.waitForTimeout(1000);
    s = await page.evaluate(() => ({ ov: !!dOverlay() })); assert.ok(!s.ov, 'no echo in custody');
    await page.evaluate(() => { crimeState().custody = null; });
    await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ id: DREAMS.openId() })); assert.equal(s.id, 'sh_clear', 'it plays once the danger has passed');
    await page.evaluate(() => dKey('Escape'));
    // leaving the place drops a queued echo
    await page.evaluate(() => { dReset(); dGo('mausoleum'); const c = Engine.cam; const h = hydrate({ kind: 'enemy', type: 'hound', x: c.x + 3, y: c.y }); h.state = 'chase'; G.ents.push(h); G.give('shard'); dGo('oakhaven'); });
    await page.waitForTimeout(1000);
    s = await page.evaluate(() => ({ ov: !!dOverlay(), pend: DREAMS.pending().length })); assert.ok(!s.ov && s.pend === 0, 'a queued echo does not follow the player to another map');
    console.log('PASS echoes never interrupt combat or custody');

    // ---- evidence handed back is not a find
    s = await page.evaluate(() => {
      dReset(); dGo('oakhaven'); const g = G.give; const before = DREAMS.pending().length;
      const p = G.player; p.inv.push({ id: 'shard', n: 1 });
      crimeState().evidence = { inv: [{ id: 'shard', n: 1 }], weapons: [], armor: {}, gold: 0, pellets: 0, bolts: 0 };
      let threw = null; try { returnEvidence(); } catch (e) { threw = String(e); }
      return { before, after: DREAMS.pending().length, threw };
    });
    assert.equal(s.after, s.before, 'returned evidence queues no echo');
    console.log('PASS evidence return');

    // ---- logbook re-read
    s = await page.evaluate(() => {
      dReset(); G.flags.p6d_dr_reed = true; G.flags.p6d_e_sh_wg = true; G.state = 'panel'; renderLog();
      const log = document.getElementById('p6d-log'); const btns = log ? [...log.querySelectorAll('button')] : [];
      const r = { n: btns.length, labels: btns.map(b => b.textContent) };
      btns[0].click(); r.open = !!dOverlay(); r.state = G.state; r.kind = DREAMS.openKind();
      dKey('Escape'); r.closed = !dOverlay(); r.panel = G.openPanel; r.state2 = G.state; r.flagsSame = G.flags.p6d_day === undefined;
      btns[1].click(); r.echoOpen = DREAMS.openKind(); dKey('Escape');
      closeModal(); G.state = 'play';
      return r;
    });
    assert.equal(s.n, 2); assert.ok(s.open && s.state === 'panel' && s.kind === 'dream', 're-reading a dream leaves the logbook open underneath');
    assert.ok(s.closed && s.panel === 'log' && s.state2 === 'panel' && s.flagsSame && s.echoOpen === 'echo', 'closing returns to the logbook and re-reading sets no flags');
    s = await page.evaluate(() => { dReset(); G.state = 'panel'; renderLog(); const r = !document.getElementById('p6d-log'); closeModal(); G.state = 'play'; return r; });
    assert.ok(s, 'a logbook with nothing met has no extra section');
    console.log('PASS logbook list and re-read');

    // ---- reduced motion
    s = await page.evaluate(() => {
      dReset(); GFX.reduceMotion = true; DREAMS.playDream(DREAMS.DREAM_LIST[0], true);
      const i = dOverlay().querySelector('.p6d-sky i'); const card = dOverlay().querySelector('.p6d-card');
      const r = { still: dOverlay().classList.contains('p6d-still'), anim: getComputedStyle(i).animationName, cardAnim: getComputedStyle(card).animationName };
      DREAMS.closeCard(); GFX.reduceMotion = false;
      DREAMS.playDream(DREAMS.DREAM_LIST[0], true); r.liveAnim = getComputedStyle(dOverlay().querySelector('.p6d-sky i')).animationName; DREAMS.closeCard();
      return r;
    });
    assert.ok(s.still && s.anim === 'none' && s.cardAnim === 'none' && s.liveAnim !== 'none', 'reduced motion stops the drift and the fade');
    console.log('PASS reduced motion');

    // ---- switch off = the original
    const off = await page.evaluate(() => {
      dReset(); UPG.storyDreams = false; const r = {};
      doRest('lamp');
      r.day = G.day; r.msgs = $('#msgs').textContent;
      return new Promise(res => setTimeout(() => {
        r.ov = !!dOverlay(); r.flags = dFlags();
        dGo('whispergrove'); G.give('shard'); r.pend = DREAMS.pending().length;
        wallLabel({ tex: 't_glassrock' }); r.pend2 = DREAMS.pending().length;
        G.flags.p6d_dr_reed = true; G.state = 'panel'; renderLog(); r.log = !!document.getElementById('p6d-log'); closeModal(); G.state = 'play';
        G.state = 'panel'; renderAccessibilityMenu(); r.toggle = (document.getElementById('p6d-toggle') || {}).textContent; closeModal(); G.state = 'play';
        res(r);
      }, 900));
    });
    assert.ok(!off.ov && off.flags.length === 0 && off.pend === 0 && off.pend2 === 0 && !off.log, 'switch off: no dream, no echo, no logbook section');
    assert.ok(/sleep eight hours/.test(off.msgs), 'switch off: the original rest message is intact');
    assert.equal(off.toggle, 'Off', 'the options row reads Off');
    const on = await page.evaluate(() => { dReset(); G.state = 'panel'; renderAccessibilityMenu(); const b = document.getElementById('p6d-toggle'); const r = { t0: b && b.textContent }; b.click(); r.t1 = b.textContent; r.v = UPG.storyDreams; b.click(); r.v2 = UPG.storyDreams; closeModal(); G.state = 'play'; return r; });
    assert.deepEqual([on.t0, on.t1, on.v, on.v2], ['On', 'Off', false, true], 'the options row toggles the switch');
    console.log('PASS switch off restores the original rest and pickups');

    // ---- compact 640x400
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(200);
    const compact = await page.evaluate(() => {
      dReset(); const out = {};
      const longest = DREAMS.DREAM_LIST.slice().sort((a, b) => b.text.join('').length - a.text.join('').length)[0];
      for (const [name, fn] of [['dream', () => DREAMS.playDream(longest, true)], ['echo', () => DREAMS.playEcho(DREAMS.ECHO_LIST.find(e => e.id === 'gl_qr'), '', true)]]) {
        fn(); const ov = dOverlay(), card = ov.querySelector('.p6d-card'), btn = ov.querySelector('.p6d-btn'), txt = ov.querySelector('.p6d-text');
        const g = document.getElementById('game').getBoundingClientRect(), b = btn.getBoundingClientRect();
        out[name] = { hOverflow: ov.scrollWidth > ov.clientWidth + 1, btnIn: b.bottom <= g.bottom + 1 && b.top >= g.top && b.right <= g.right, cardIn: card.getBoundingClientRect().bottom <= g.bottom + 1, scrolls: txt.scrollHeight > txt.clientHeight + 1 };
        DREAMS.closeCard();
      }
      return out;
    });
    if (SHOTS) {
      await page.evaluate(() => { dReset(); DREAMS.playDream(DREAMS.DREAM_LIST.find(d => d.id === 'quarry'), true); });
      await page.waitForTimeout(2800);
      await page.screenshot({ path: SHOTS + '/dream-640.png' });
      await page.evaluate(() => { DREAMS.closeCard(); DREAMS.playEcho(DREAMS.ECHO_LIST.find(e => e.id === 'gl_qr'), '', true); });
      await page.waitForTimeout(2800);
      await page.screenshot({ path: SHOTS + '/echo-640.png' });
      await page.evaluate(() => DREAMS.closeCard());
    }
    for (const k of ['dream', 'echo']) assert.ok(!compact[k].hOverflow && compact[k].btnIn && compact[k].cardIn, `${k} card fits 640x400 (button reachable, no horizontal overflow)`);
    console.log('PASS compact 640x400');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS dreams.test.js: no page errors');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
