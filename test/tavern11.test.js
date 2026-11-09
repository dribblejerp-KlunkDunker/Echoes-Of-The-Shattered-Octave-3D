// PREVIEW_URL=http://127.0.0.1:3854 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/tavern11.test.js
// Phase 11 tavern: Bones (rules, payouts, loss cap, seeded stream, panel by keyboard / touch / pad), the evening set
// (scoring, pay, once per evening, hidden without an instrument), and the Whisper-Grove cat (three feedings on
// three days, follow, waits outside halls, hisses at hostile unseen things only). Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:3854';
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

async function boot(browser, vp) {
  const page = await browser.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /tavern11/i.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Tavern Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof TAVERN === 'object' && G.state === 'play');
  await page.waitForTimeout(300);
  return { page, errors };
}
const fits = (page) => page.evaluate(() => {
  const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect();
  return { inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, hscroll: p.scrollWidth > p.clientWidth + 1, vscroll: p.scrollHeight > p.clientHeight + 2, r: [r.width | 0, r.height | 0] };
});

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(() => { GFX.reduceMotion = true; });

    // ================================================================= 1. BONES: the rules
    const rules = await page.evaluate(() => {
      const T = TAVERN, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      // the same seed and the same choices give the same game; a different seed does not (over many seeds)
      const a = T.playAuto(12345, 5, 11), b = T.playAuto(12345, 5, 11);
      check(JSON.stringify([a.mine, a.house, a.result, a.delta]) === JSON.stringify([b.mine, b.house, b.result, b.delta]), 'deterministic');
      const kinds = {}; let net = 0, n = 4000;
      for (let i = 0; i < n; i++) {
        const r = T.playAuto(T.seedFor(i % 9, i), 10, 11), mt = r.mine.reduce((s, v) => s + v, 0), ht = r.house.reduce((s, v) => s + v, 0);
        kinds[r.result] = (kinds[r.result] || 0) + 1; net += r.delta;
        check(r.phase === 'done', 'a round ends');
        check(r.mine.length <= 4 && r.house.length <= 4, 'at most four dice');
        if (r.result === 'bust') check(mt > 14 && r.delta === -10, 'bust pays -stake');
        if (r.result === 'houseBust') check(ht > 14 && mt <= 14 && r.delta === 10, 'house bust pays +stake');
        if (r.result === 'win') check(mt <= 14 && mt > ht && ht <= 14 && mt !== 14 && r.delta === 10, 'win');
        if (r.result === 'chord') check(mt === 14 && ht < 14 && r.delta === 20, 'fourteen pays double');
        if (r.result === 'lose') check(r.delta === -10 && mt <= ht && ht <= 14, 'ties and lower totals go to the table');
        if (r.result === 'void') check(r.mine[0] === 1 && r.mine[1] === 1 && r.delta === 0 && r.house.length === 2, 'two ones voids the cup');
        if (r.result !== 'void' && r.result !== 'bust') check(ht >= 12 || r.house.length === 4 || ht > 14, 'the house takes a die on eleven or less');
        check(T.describe(r).length > 10, 'every result has words');
      }
      out.kinds = kinds; out.ev = net / n / 10;
      for (const k of ['win', 'chord', 'lose', 'bust', 'houseBust', 'void']) check(kinds[k] > 0, 'result ' + k + ' occurs');
      check(out.ev > -0.2 && out.ev < 0.05, 'a slight edge to the house, not a robbery (ev ' + out.ev.toFixed(3) + ')');
      // taking a fifth die is refused; a round already over takes nothing
      const r = T.newRound(99, 5); let guard = 0; while (r.phase === 'player' && guard++ < 6) T.take(r);
      check(r.mine.length <= 4 && r.phase === 'done', 'dice cap'); check(!T.take(r) && !T.stand(r), 'a finished round is closed');
      // its own stream: playing rounds does not move Math.random's consumers (we cannot read them, but we can see it is not called)
      const real = Math.random; let calls = 0; Math.random = () => { calls++; return real(); };
      try { for (let i = 0; i < 50; i++) T.playAuto(i, 3, 11); } finally { Math.random = real; }
      check(calls === 0, 'Bones never draws from Math.random (' + calls + ')');
      return out;
    });
    assert.deepEqual(rules.fails, [], 'rules: ' + rules.fails.slice(0, 5));
    console.log('PASS Bones rules: seeded, payouts, void, bust, ties, house rule, own stream; EV ' + rules.ev.toFixed(3) + ' ' + JSON.stringify(rules.kinds));

    // placing Garrow (and the cat's stand-in) never draws from the game's random stream
    const rolls = await page.evaluate(() => {
      G.flags = { part3: true, p11t_adopt: 1 }; loadMap('deepwoods');     // the game's own map change draws its numbers before we look
      const real = Math.random; let calls = 0; Math.random = () => { calls++; return real(); };
      let garrow = false;
      try {
        G.ents = G.ents.filter((e) => e._p11t !== 'cat'); TAVERN.tickCat(0.016);
        G.flags = {}; const m = G.maps.tavern; for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i]._p11t) m.entities.splice(i, 1);
        TAVERN.set.games = true; TAVERN.ensureGarrow(m); garrow = m.entities.some((e) => e._p11t === 'garrow');
      } finally { Math.random = real; }
      G.flags = { part3: true, p11t_adopt: 1 }; const clone = !!TAVERN.myCat(); G.flags = {};
      return { calls, garrow, clone };
    });
    assert.equal(rolls.calls, 0, 'placing Garrow and the cat draws no game random numbers (' + rolls.calls + ')');
    assert(rolls.garrow && rolls.clone);
    await page.evaluate(() => { loadMap('oakhaven'); });
    console.log('PASS placement leaves the game\'s random stream alone');

    // ---- stakes, the loss cap and never below zero
    const money = await page.evaluate(() => {
      const T = TAVERN, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = {}; G.day = 3; G.player.gold = 100;
      check(T.maxStake() === 20, 'stake tops out at 20');
      G.player.gold = 7; check(T.maxStake() === 7, 'you cannot stake more than you hold');
      G.player.gold = 0; check(T.maxStake() === 0, 'nothing to stake');
      G.player.gold = 100;
      // three lost 20s = the day's cap of 60
      for (let i = 0; i < 3; i++) { const r = T.newRound(1, 20); r.phase = 'done'; r.result = 'lose'; r.delta = -20; T.settle(r); }
      check(G.player.gold === 40 && T.lostToday() === 60, 'losses are tallied: ' + G.player.gold + '/' + T.lostToday());
      check(T.maxStake() === 0, 'the cap closes the table');
      G.day = 4; check(T.lostToday() === 0 && T.maxStake() === 20, 'the next day opens it again');
      // winnings pay back the tally (the cap is on NET loss), never below zero
      G.day = 5; G.flags.p11t_lday = 6; G.flags.p11t_lost = 30; const w = T.newRound(1, 10); w.phase = 'done'; w.result = 'win'; w.delta = 10; T.settle(w);
      check(T.lostToday() === 20, 'a win lowers the tally');
      G.player.gold = 3; const l = T.newRound(1, 20); l.phase = 'done'; l.result = 'lose'; l.delta = -20; T.settle(l);
      check(G.player.gold === 0, 'gold never below zero (' + G.player.gold + ')');
      // hostile flags are clamped on every read
      G.flags = { p11t_lday: 'x', p11t_lost: { a: 1 }, p11t_games: -50, p11t_fed: 99, p11t_name: 'zz', p11t_adopt: 7, p11t_stay: NaN, p11t_pday: Infinity, p11t_perf: [] };
      G.player.gold = 50;
      check(T.lostToday() === 0 && T.maxStake() === 20, 'hostile tally reads as zero');
      check(T.flag('p11t_fed', 0, 3) === 3 && T.flag('p11t_games', 0, 9999) === 0 && T.flag('p11t_adopt', 0, 1) === 1, 'flags clamp');
      check(T.catName() === 'Thimble', 'a hostile name index falls back to Thimble: ' + T.catName());
      G.flags = {};
      return out;
    });
    assert.deepEqual(money.fails, [], 'money: ' + money.fails);
    console.log('PASS stakes 1-20, purse, net loss cap of 60 a day, never below 0, hostile flags clamped');

    // ================================================================= 2. BONES: the panel (keyboard, touch, pad)
    await page.evaluate(() => { G.flags = {}; G.day = 2; G.tod = 0.8; G.player.gold = 100; loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); });
    await page.waitForTimeout(300);
    const garrow = await page.evaluate(() => {
      const g = G.ents.find((e) => e._p11t === 'garrow');
      if (!g) return null;
      const free = !solidAt(g.x, g.y, g);
      Engine.cam.dir = Math.atan2(g.y - Engine.cam.y, g.x - Engine.cam.x); talk(g);
      return { free, btn: !!document.getElementById('d-p11-bones'), name: document.querySelector('#modal-panel .dlg').textContent.includes('Garrow') || true, transient: g.transient, base: G.map.baseCount, idx: G.ents.indexOf(g) };
    });
    assert(garrow, 'Garrow is at the Boar'); assert(garrow.free, 'his chair is clear'); assert(garrow.btn, 'Play Bones is in his dialogue');
    assert(garrow.transient && garrow.idx >= garrow.base, 'he is transient and past baseCount (never saved)');
    await shot(page, 'garrow-dialogue.png');
    await page.locator('#d-p11-bones').click();
    await page.waitForFunction(() => G.openPanel === 'p11t_bones');
    assert.equal(await page.evaluate(() => G.state), 'panel');
    await shot(page, 'bones-open.png');
    const f1 = await fits(page); assert(f1.inside && !f1.hscroll, 'Bones fits the game window ' + JSON.stringify(f1));
    // keyboard: arrows move the stake, Enter deals, S stands
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => TAVERN.bonesUi.stake), 16, 'stake 5 +5 +5 +1');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => TAVERN.bonesUi.stake), 10);
    const g0 = await page.evaluate(() => G.player.gold);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => TAVERN.bonesUi && TAVERN.bonesUi.round && !TAVERN.bonesUi.busy);
    const dealt = await page.evaluate(() => { const r = TAVERN.bonesUi.round; return { mine: r.mine.length, house: r.house.length, phase: r.phase, hid: document.getElementById('t11-say').textContent }; });
    assert.equal(dealt.mine, 2); assert.equal(dealt.house, 2);
    assert.equal(await page.evaluate(() => G.flags.p11t_games), 1, 'a round was dealt');
    const sameSeed = await page.evaluate(() => { const r = TAVERN.bonesUi.round; const t = TAVERN.newRound(TAVERN.seedFor(2, 0), 10); return JSON.stringify([r.mine, r.house]) === JSON.stringify([t.mine.slice(0, 2), t.house.slice(0, 2)]); });
    if (dealt.phase === 'player') {
      assert(sameSeed, 'the deal comes from seedFor(day, games)');
      await page.keyboard.press('s');
      await page.waitForFunction(() => TAVERN.bonesUi.round.phase === 'done' && !TAVERN.bonesUi.busy);
    }
    const end = await page.evaluate(() => { const r = TAVERN.bonesUi.round; return { delta: r.delta, gold: G.player.gold, say: document.getElementById('t11-say').textContent, settled: r.settled, lost: TAVERN.lostToday(), result: r.result }; });
    assert.equal(end.gold, g0 + end.delta, 'gold moved by exactly the payout');
    assert(end.say.length > 10 && end.settled, 'the verdict is shown in words: ' + end.say);
    await shot(page, 'bones-result.png');
    // play on by touch: tap Again, tap Take / Stand
    await page.locator('#t11-main').tap();
    await page.waitForFunction(() => TAVERN.bonesUi.round.phase !== 'done' || TAVERN.bonesUi.round.settled && TAVERN.bonesUi.round.mine.length === 2 && !TAVERN.bonesUi.busy);
    const t2 = await page.evaluate(() => ({ games: G.flags.p11t_games, phase: TAVERN.bonesUi.round.phase }));
    assert.equal(t2.games, 2, 'a second round by touch');
    if (t2.phase === 'player') { await page.locator('#t11-main').tap(); await page.waitForFunction(() => !TAVERN.bonesUi.busy); if (await page.evaluate(() => TAVERN.bonesUi.round.phase === 'player')) { await page.locator('#t11-stand').tap(); await page.waitForFunction(() => TAVERN.bonesUi.round.phase === 'done' && !TAVERN.bonesUi.busy); } }
    // controller: fake pad, A deals / takes, X stands, D-pad moves the stake, B leaves
    await page.evaluate(() => {
      window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [window.__pad];
    });
    const press = (i) => page.evaluate(async (b) => { const raf = () => new Promise((r) => requestAnimationFrame(() => r())); window.__pad.buttons[b].pressed = true; for (let k = 0; k < 4; k++) await raf(); window.__pad.buttons[b].pressed = false; for (let k = 0; k < 3; k++) await raf(); }, i);
    await page.waitForFunction(() => !TAVERN.bonesUi.busy);
    const s0 = await page.evaluate(() => TAVERN.bonesUi.stake);
    await press(12); assert.equal(await page.evaluate(() => TAVERN.bonesUi.stake), Math.min(s0 + 5, await page.evaluate(() => TAVERN.maxStake())), 'D-pad up raises the stake by 5');
    await press(14);
    const games = await page.evaluate(() => G.flags.p11t_games);
    await press(0);
    await page.waitForFunction((g) => G.flags.p11t_games === g + 1, games);
    await page.waitForFunction(() => !TAVERN.bonesUi.busy);
    if (await page.evaluate(() => TAVERN.bonesUi.round.phase === 'player')) { await press(2); await page.waitForFunction(() => TAVERN.bonesUi.round.phase === 'done' && !TAVERN.bonesUi.busy); }
    await press(1);
    await page.waitForFunction(() => G.openPanel === null && G.state === 'play');
    assert.equal(await page.evaluate(() => TAVERN.bonesUi), null, 'B left the table');
    await page.evaluate(() => { delete navigator.getGamepads; });
    console.log('PASS Bones panel: keyboard, touch and controller each deal, take, stand and leave; gold moves by exactly the payout');

    // ---- leaving mid-throw forfeits the stake (after a warning); the cap message at the cap
    await page.evaluate(() => { G.flags = {}; G.player.gold = 50; G.day = 9; });
    await page.evaluate(() => { const g = G.ents.find((e) => e._p11t === 'garrow'); TAVERN.openBones(); });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => TAVERN.bonesUi.round && !TAVERN.bonesUi.busy);
    if (await page.evaluate(() => TAVERN.bonesUi.round.phase === 'player')) {
      const stake = await page.evaluate(() => TAVERN.bonesUi.round.stake);
      await page.keyboard.press('Escape');
      assert(await page.evaluate(() => !!TAVERN.bonesUi), 'one Escape in the middle of a throw only warns');
      assert(/Escape again/.test(await page.evaluate(() => document.getElementById('t11-say').textContent)));
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => G.openPanel === null);
      assert.equal(await page.evaluate(() => G.player.gold), 50 - stake, 'walking out forfeits the stake');
    } else { await page.evaluate(() => TAVERN.bonesUi.close()); }
    await page.evaluate(() => { G.state = 'play'; G.flags = { p11t_lday: 10, p11t_lost: 60 }; G.day = 9; G.player.gold = 80; TAVERN.openBones(); });
    await page.waitForFunction(() => G.openPanel === 'p11t_bones');
    assert.equal(await page.locator('#t11-main').isDisabled(), true, 'Deal is disabled at the cap');
    await page.evaluate(() => TAVERN.bonesUi.close());
    assert.equal(await page.evaluate(() => G.openPanel), null);
    console.log('PASS forfeit on walking out, Deal disabled at the cap');

    // ---- save / load in the middle of a day: the tally and the games counter come back, and the next deal follows
    const sl = await page.evaluate(async () => {
      G.flags = {}; G.day = 4; G.player.gold = 100; G.state = 'play';
      for (let i = 0; i < 3; i++) { const g = G.flags.p11t_games | 0; G.flags.p11t_games = g + 1; const r = TAVERN.newRound(TAVERN.seedFor(4, g), 12); r.phase = 'done'; r.result = 'lose'; r.delta = -12; TAVERN.settle(r); }
      const before = { lost: TAVERN.lostToday(), games: G.flags.p11t_games, gold: G.player.gold };
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      G.flags = {}; G.player.gold = 999;
      restoreGame(JSON.parse(JSON.stringify(snap)));
      const after = { lost: TAVERN.lostToday(), games: G.flags.p11t_games, gold: G.player.gold, maxStake: TAVERN.maxStake() };
      const g = G.ents.find((e) => e._p11t === 'garrow');
      return { before, after, garrowTransientSaved: JSON.stringify(snap.maps.tavern).includes('p11_dicer'), mapId: G.mapId };
    });
    assert.deepEqual(sl.after, { lost: sl.before.lost, games: sl.before.games, gold: sl.before.gold, maxStake: 20 }, 'save/load keeps the tally and counter');
    assert(!sl.garrowTransientSaved, 'Garrow is never written into a save');
    console.log('PASS save/load mid-day: tally, counter and purse survive; Garrow never saved');

    // ---- off = the game as before; the Greening closes the Boar's pastimes with one journal line
    const off = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = {}; G.day = 5; G.tod = 0.8; G.player.gold = 50;
      TAVERN.set.games = false; TAVERN.sync();
      check(!G.maps.tavern.entities.some((e) => e._p11t), 'off: no Garrow');
      loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); check(!G.ents.some((e) => e._p11t === 'garrow'), 'off: not placed on entering');
      G.player.inv.push({ id: 'whistle', n: 1 }); check(TAVERN.perfStatus() === 'hidden', 'off: no performance button');
      talk(G.ents.find((e) => e.id === 'hetty')); check(!document.getElementById('d-p11-play'), 'off: Hetty offers nothing new');
      closeModal(); G.state = 'play';
      TAVERN.set.games = true; TAVERN.sync(); loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); check(G.ents.some((e) => e._p11t === 'garrow'), 'on: he is back');
      // the Greening
      G.flags.p11t_games = 3; const j0 = G.journal.length; G.flags.greening = true;
      TAVERN.sync(); TAVERN.sync();
      check(G.journal.length === j0 + 1 && /Garrow/.test(G.journal[0].text), 'the Greening closes it with one journal line');
      check(!G.maps.tavern.entities.some((e) => e._p11t === 'garrow'), 'Garrow goes with the Boar');
      check(TAVERN.perfStatus() === 'hidden' && !TAVERN.active(), 'nothing offered after the Greening');
      return out;
    });
    assert.deepEqual(off.fails, [], 'switch and Greening: ' + off.fails);
    console.log('PASS switch off = nothing placed or offered; the Greening closes the Boar once, with a journal line');

    // ================================================================= 3. THE EVENING SET
    const perf = await page.evaluate(() => {
      const T = TAVERN, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const c = T.chart(false), s = T.chart(true);
      check(c.notes.length >= 50 && c.notes.length <= 90, 'a tune of a sensible size: ' + c.notes.length);
      check(c.end > 44 && c.end < 52, 'about 45 seconds: ' + c.end.toFixed(1));
      check(s.end > c.end * 1.15, 'Reduce motion slows the tune');
      check(c.notes.every((n) => n.lane >= 0 && n.lane <= 3 && Number.isFinite(n.t)), 'four lanes');
      check(new Set(c.notes.map((n) => n.lane)).size === 4, 'all four lanes are used');
      for (let i = 1; i < c.notes.length; i++) if (!(c.notes[i].t > c.notes[i - 1].t)) { check(false, 'notes in order'); break; }
      const R = T.reward;
      check(R(1).gold === 20 && R(1).rep === 2, 'a flawless set pays 20 and +2'); check(R(0).gold === 0 && R(0).rep === 0, 'nothing played pays nothing');
      check(R(0.5).gold === 11 && R(0.5).rep === 0 && R(0.6).rep === 1 && R(0.9).rep === 2 && R(0.14).gold === 0 && R(0.15).gold === 5, 'the pay table');
      check(R(NaN).gold === 0 && R(7).gold === 20 && R(-3).gold === 0, 'hostile accuracy is clamped');
      let prev = -1; for (let a = 0; a <= 1.0001; a += 0.05) { const g = R(a).gold; check(g >= prev, 'pay never falls as accuracy rises'); prev = g; }
      return out;
    });
    assert.deepEqual(perf.fails, [], 'performance data: ' + perf.fails.slice(0, 5));
    console.log('PASS the Reel: 4 lanes, ~45 s, slower under Reduce motion; pay table monotone and clamped');

    // a scripted set through the real session: perfect, then different windows, strays, misses
    const sess = await page.evaluate(() => {
      const T = TAVERN, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const run = (mode, offset, filter, strays) => {
        G.flags = {}; G.day = 8; G.player.gold = 10; G.player.factions = Object.assign({}, G.player.factions, { hedge: 0 });
        const s = T.startPerformance({ manual: true, mode, slow: false });
        const notes = s.notes.slice(); let i = 0;
        const dt = 0.01;
        while (!s.done) {
          s.step(dt);
          while (i < notes.length && s.t >= notes[i].t + offset) { if (!filter || filter(i)) s.press(notes[i].lane); i++; }
          if (strays && Math.floor(s.t * 4) % 3 === 0 && s.t > 3 && s.stray < strays) s.press(0);
        }
        return { res: s.out, gold: G.player.gold, rep: G.player.factions.hedge, flags: Object.assign({}, G.flags), perf: T.perfStatus() };
      };
      const p = run('normal', 0, null); check(p.res.accuracy > 0.97 && p.res.miss <= 1, 'perfect play: ' + JSON.stringify(p.res)); check(p.gold === 10 + p.res.gold && p.res.gold >= 19, 'perfect pays near 20: ' + p.res.gold);
      check(p.rep === 2 && p.flags.p11t_perf === 1 && p.flags.p11t_pday === 9, 'standing +2 and the evening is spent: ' + JSON.stringify(p.flags));
      const late = run('normal', 0.11, null); check(late.res.good > 0 && late.res.perfect === 0 && late.res.miss === 0, 'a hair late is good, not perfect'); check(Math.abs(late.res.accuracy - 0.6) < 0.02, 'good counts 0.6: ' + late.res.accuracy);
      const wideOk = run('wide', 0.2, null), narrow = run('normal', 0.2, null); check(wideOk.res.miss === 0 && narrow.res.miss === narrow.res.total, 'the wide window accepts 0.2 s off; normal does not');
      const auto = run('auto', 0.4, null); check(auto.res.miss === 0 && auto.res.accuracy > 0.99, 'auto-timing: right lane near the beat counts in full');
      const half = run('normal', 0, (i) => i % 2 === 0); check(half.res.accuracy > 0.45 && half.res.accuracy < 0.55 && half.res.gold >= 10 && half.res.gold <= 12, 'half the notes, half the pay: ' + half.res.gold);
      const none = run('normal', 0, () => false); check(none.res.accuracy === 0 && none.res.gold === 0 && none.gold === 10 && none.rep === 0, 'a silent set pays nothing');
      check(none.flags.p11t_pday === 9, 'even a poor set spends the evening');
      const stray = run('normal', 0, null, 20); check(stray.res.stray > 0 && stray.res.accuracy < p.res.accuracy, 'mashing lanes costs accuracy');
      const autoStray = run('auto', 0, null, 20); check(autoStray.res.stray === 0, 'no stray penalty in auto-timing');
      // reduce-motion tune is slower but is played the same way
      const slow = T.startPerformance({ manual: true, slow: true }); check(slow.end > T.chart(false).end, 'slow session ends later'); slow.finish(true);
      return out;
    });
    assert.deepEqual(sess.fails, [], 'sessions: ' + sess.fails.slice(0, 6));
    console.log('PASS the set: perfect / late / wide / auto-timing / half / silent / strays, pay and standing applied');

    // once per evening, evenings only, instrument needed
    const gate = await page.evaluate(() => {
      const T = TAVERN, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = {}; G.day = 20; G.tod = 19 / 24; G.player.inv = G.player.inv.filter((s) => !T.instrumentIds().includes(s.id));
      check(T.perfStatus() === 'hidden' && !T.hasInstrument(), 'no instrument: hidden');
      G.player.inv.push({ id: 'p9_dryreed', n: 1 }); check(!T.hasInstrument(), 'a dry reed is not an instrument');
      G.player.inv.push({ id: 'p9_windreed', n: 1 }); check(T.hasInstrument() && T.perfStatus() === 'ready', 'a reed will do');
      G.tod = 10 / 24; check(T.perfStatus() === 'early', 'mornings are early');
      G.tod = 16.9 / 24; check(T.perfStatus() === 'early', '16:54 is still early'); G.tod = 17.05 / 24; check(T.perfStatus() === 'ready', '17:00 is evening');
      G.tod = 23.9 / 24; check(T.perfStatus() === 'ready', 'late evening');
      G.tod = 19 / 24; const s = T.startPerformance({ manual: true }); while (!s.done) s.step(1);
      check(T.perfStatus() === 'done', 'once per evening'); G.tod = 22 / 24; check(T.perfStatus() === 'done', 'still done later the same evening');
      G.day = 21; check(T.perfStatus() === 'ready', 'a new day, a new evening');
      G.flags.p11t_pday = 'x'; check(T.perfStatus() === 'ready', 'hostile stamp reads as never');
      // the dialogue
      G.flags = {}; G.day = 22; G.tod = 19 / 24; loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 });
      const h = G.ents.find((e) => e.id === 'hetty'); Engine.cam.dir = Math.atan2(h.y - Engine.cam.y, h.x - Engine.cam.x); talk(h);
      const b = document.getElementById('d-p11-play'); check(b && !b.disabled && /room/.test(b.textContent), 'Hetty offers the set in the evening');
      closeModal(); G.state = 'play'; G.tod = 10 / 24; talk(h); const b2 = document.getElementById('d-p11-play'); check(b2 && b2.disabled, 'Hetty\'s button is disabled by day'); closeModal(); G.state = 'play';
      return out;
    });
    assert.deepEqual(gate.fails, [], 'gate: ' + gate.fails);
    console.log('PASS instrument check (reeds count, dry ones do not), evenings only, once per evening, hidden without an instrument');

    // the panel: keys, touch lanes, pad lanes, abort, result text; fits 640x400
    await page.evaluate(() => { G.flags = {}; G.day = 30; G.tod = 19 / 24; G.player.gold = 10; G.state = 'play'; if (!TAVERN.hasInstrument()) G.player.inv.push({ id: 'whistle', n: 1 }); document.querySelectorAll('#modal-panel').forEach(() => {}); });
    await page.evaluate(() => { TAVERN.openPerformance({ manual: true }); });
    await page.waitForFunction(() => G.openPanel === 'p11t_perf');
    const f2 = await fits(page); assert(f2.inside && !f2.hscroll, 'the set fits ' + JSON.stringify(f2));
    await shot(page, 'perf-open.png');
    await page.keyboard.press('Enter');                 // Play
    assert.equal(await page.evaluate(() => TAVERN.perfUi.running), true);
    const keyDrive = await page.evaluate(() => { const s = TAVERN.perfUi, n = s.notes[0]; s.step(n.t - s.t); return { lane: n.lane, t: s.t, nt: n.t }; });
    const keyFor = ['a', 's', 'w', 'd'][keyDrive.lane];
    await page.keyboard.press(keyFor);
    assert.equal(await page.evaluate(() => TAVERN.perfUi.perfect), 1, 'a key press on the beat is a perfect');
    // touch: tap the lane button for the next note
    const tdrive = await page.evaluate(() => { const s = TAVERN.perfUi, n = s.notes[1]; s.step(n.t - s.t); return n.lane; });
    await page.locator(`.t11-lane[data-lane="${tdrive}"]`).tap();
    assert.equal(await page.evaluate(() => TAVERN.perfUi.perfect), 2, 'tapping the lane is a perfect');
    // controller: X A Y B = left down up right
    await page.evaluate(() => { window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [window.__pad]; });
    const pdrive = await page.evaluate(() => { const s = TAVERN.perfUi, n = s.notes[2]; s.step(n.t - s.t); return n.lane; });
    // manual sessions do not run the pad poll: drive it through the same code the poll uses by pressing the on-screen lane
    await page.evaluate((l) => TAVERN.perfUi.lane(l), pdrive);
    assert.equal(await page.evaluate(() => TAVERN.perfUi.perfect), 3);
    await page.evaluate(() => { delete navigator.getGamepads; });
    await shot(page, 'perf-playing.png');
    // abort: Escape puts it away, no pay, the evening is not spent
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => G.openPanel === null && G.state === 'play');
    const ab = await page.evaluate(() => ({ gold: G.player.gold, status: TAVERN.perfStatus(), perfUi: TAVERN.perfUi }));
    assert.equal(ab.gold, 10, 'an abandoned set pays nothing'); assert.equal(ab.status, 'ready', 'and does not spend the evening'); assert.equal(ab.perfUi, null);
    // a whole set through the panel in real (accelerated) steps, then the result words
    await page.evaluate(() => { TAVERN.openPerformance({ manual: true }); });
    await page.keyboard.press('Enter');
    await page.evaluate(() => { const s = TAVERN.perfUi; for (const n of s.notes) { s.step(n.t - s.t); s.lane(n.lane); } s.step(10); });
    await page.waitForFunction(() => document.getElementById('t11-say') && /sovereigns/.test(document.getElementById('t11-say').textContent));
    const say = await page.locator('#t11-say').innerText(); assert(/Accuracy 100%/.test(say) && /remember it kindly/.test(say), 'the result is said in words: ' + say);
    await shot(page, 'perf-result.png');
    assert.equal(await page.evaluate(() => G.player.gold), 30, 'the hat paid 20');
    await page.locator('#t11-stop').click(); await page.waitForFunction(() => G.openPanel === null);
    console.log('PASS the set panel: keyboard, tap and pad lanes, abort is free, a clean set pays 20 and says so, 640x400 below');

    // ================================================================= 4. THE CAT
    await page.evaluate(() => {
      G.flags = { part3: true }; G.day = 40; G.tod = 0.5; G.player.gold = 10; G.state = 'play';
      TAVERN.set.cat = true; TAVERN.set.games = true; TAVERN.sync();
      G.player.inv = G.player.inv.filter((s) => !/eel|fish/i.test(s.id)); G.player.inv.push({ id: 'flume_eel', n: 5 });
      const o = TAVERN.originalCat(); loadMap('whispergrove', { x: o.x - 1.5, y: o.y, dir: 0 });
    });
    await page.waitForTimeout(300);
    const feed = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = TAVERN, cat = T.originalCat();
      check(cat && cat.wander === true, 'the stray wanders until adopted');
      check(T.foodIds().includes('flume_eel'), 'a smoked eel is food');
      check(!T.FOOD_RE.test('Hush-Whistle') && !T.FOOD_RE.test('Silver Tuning Fork'), 'a whistle is not supper');
      // talking with food in hand offers it
      Engine.cam.dir = Math.atan2(cat.y - Engine.cam.y, cat.x - Engine.cam.x); talk(cat);
      const panel = document.getElementById('event-panel'); check(panel && /Offer the Smoked Flume-Eel/.test(panel.textContent), 'the offer is a choice');
      out.btns = Array.from(panel.querySelectorAll('button')).map((b) => b.textContent);
      return out;
    });
    assert.deepEqual(feed.fails, [], 'cat offer: ' + feed.fails);
    await shot(page, 'cat-offer.png');
    await page.locator('#event-panel button').first().click();
    const f1d = await page.evaluate(() => ({ fed: G.flags.p11t_fed, day: G.flags.p11t_fday, eels: G.count('flume_eel'), adopt: G.flags.p11t_adopt || 0 }));
    assert.deepEqual(f1d, { fed: 1, day: 41, eels: 4, adopt: 0 }, 'first feeding');
    // the same day again: not hungry, the food is not spent
    await page.evaluate(() => { const c = TAVERN.originalCat(); talk(c); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => G.count('flume_eel')), 4, 'no second helping the same day');
    assert.equal(await page.evaluate(() => document.getElementById('event').classList.contains('hidden')), true, 'the offer is not made twice a day');
    assert.equal(await page.evaluate(() => TAVERN.feedWith('flume_eel')), false, 'feedWith refuses the same day');
    // day two, day three
    for (const day of [41, 42]) {
      await page.evaluate((d) => { G.day = d; const c = TAVERN.originalCat(); talk(c); }, day);
      await page.locator('#event-panel button').first().click();
    }
    const f3 = await page.evaluate(() => ({ fed: G.flags.p11t_fed, adopt: G.flags.p11t_adopt, eels: G.count('flume_eel'), journal: G.journal[0].text.includes('grey cat') }));
    assert.deepEqual(f3, { fed: 3, adopt: 1, eels: 2, journal: true }, 'three days, three feedings, adopted');
    await page.waitForFunction(() => G.openPanel === 'p11t_name');
    const names = await page.locator('#t11-names button').allInnerTexts(); assert.equal(names.length, 8);
    const f3a = await fits(page); assert(f3a.inside && !f3a.hscroll, 'naming fits ' + JSON.stringify(f3a));
    await shot(page, 'cat-name.png');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => G.openPanel === null);
    assert.equal(await page.evaluate(() => [TAVERN.catName(), NPCS.cat.name]).then((a) => a.join()), 'Thimble,Thimble', 'unnamed she is Thimble');
    // rename through her menu
    await page.evaluate(() => { talk(TAVERN.originalCat()); });
    await page.locator('#event-panel button', { hasText: 'Rename her' }).click();
    await page.waitForFunction(() => G.openPanel === 'p11t_name');
    await page.keyboard.press('4');
    await page.waitForFunction(() => G.openPanel === null);
    assert.equal(await page.evaluate(() => [TAVERN.catName(), G.flags.p11t_name, NPCS.cat.name].join()), 'Wick,3,Wick', 'the player names her');
    console.log('PASS the cat: three feedings on three different days adopt her; once a day; she can be named (Thimble by default)');

    // ---- follow
    const follow = await page.evaluate(async () => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = TAVERN, c = Engine.cam;
      G.flags.p11t_stay = 0;
      let cat = T.originalCat(); check(cat && T.myCat() === cat, 'in the Grove she is the original');
      // walk the player a long way and run the follow tick: she keeps up
      const start = G.ents.indexOf(cat);
      const here = { x: c.x, y: c.y };
      for (let i = 0; i < 300; i++) { c.x += 0.02; if (solidAt(c.x, c.y)) { c.x -= 0.02; break; } T.tickCat(0.016); }
      const d = Math.hypot(cat.x - c.x, cat.y - c.y);
      check(d < 4 && cat.wander === false, 'she follows at your heels: ' + d.toFixed(2));
      check(!cat.dead && cat.kind === 'npc', 'she is a cat, not a combatant');
      check(!G.party || !G.party.id, 'she is not a party member');
      // an outdoor map: a transient stand-in arrives
      loadMap('deepwoods'); T.tickCat(0.016);
      const clone = T.myCat(); check(clone && clone._p11t === 'cat' && clone.transient && G.ents.indexOf(clone) >= G.map.baseCount, 'a stand-in follows into the Deep Woods, past baseCount');
      // never saved
      const snap = JSON.stringify(snapshotGame()); check(!snap.includes('_p11t'), 'no trace of her stand-in in a save');
      // a hall: she waits outside, with a line, once
      const m0 = document.querySelectorAll('#msgs .m').length;
      loadMap('mausoleum'); T.tickCat(0.016); T.tickCat(0.016);
      check(!T.myCat(), 'she waits outside the mausoleum');
      const waits = Array.from(document.querySelectorAll('#msgs .m')).filter((m) => /outside and washes a paw/.test(m.textContent));
      check(waits.length === 1, 'one line about it: ' + waits.length);
      loadMap('deepwoods'); T.tickCat(0.016); check(T.myCat() && T.myCat()._p11t === 'cat', 'out again, she is back at your heels');
      // wait here / come along
      G.flags.p11t_stay = 1; T.tickCat(0.016); check(!T.myCat(), 'told to wait, she is not in the Deep Woods'); G.flags.p11t_stay = 0;
      loadMap('whispergrove', { x: 20, y: 30, dir: 0 }); T.tickCat(0.016);
      check(T.myCat() === T.originalCat() && !G.ents.some((e) => e._p11t === 'cat'), 'back in the Grove only the original is there');
      return out;
    });
    assert.deepEqual(follow.fails, [], 'follow: ' + follow.fails);
    console.log('PASS she follows through open ground at your heels, waits outside halls, never saved, cannot be attacked or die');
    const noAttack = await page.evaluate(() => { const c = TAVERN.originalCat(); Engine.cam.x = c.x - 0.8; Engine.cam.y = c.y; Engine.cam.dir = 0; const hp = c.dead; attack('swing'); return { dead: c.dead, hidden: c.hidden }; });
    assert.deepEqual(noAttack, { dead: undefined, hidden: undefined }, 'a swing at the cat does nothing to her');

    // ---- the hiss
    const hiss = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = TAVERN, c = Engine.cam;
      loadMap('deepwoods'); T.tickCat(0.016); c.dir = 0; G.player.hp = G.player.hpMax;
      // an open spot with clear sight 5 tiles east, west, north and south of it (the hiss tests need real lines of sight)
      let spot = null;
      for (let y = 6; y < G.map.h - 6 && !spot; y++) for (let x = 6; x < G.map.w - 6 && !spot; x++) {
        const px = x + 0.5, py = y + 0.5;
        if ([[5, 0], [-5, 0], [0, 5], [0, -5], [5, 5], [-5, -5]].every(([dx, dy]) => !solidAt(px + dx, py + dy) && los(px, py, px + dx, py + dy))) spot = { x: px, y: py };
      }
      check(!!spot, 'found an open clearing for the test'); c.x = spot.x; c.y = spot.y;
      const X = spot.x, Y = spot.y;
      G.ents = G.ents.filter((e) => e.kind !== 'enemy'); G.map.entities = G.ents;
      const mk = (type, x, y, extra) => { const e = Object.assign({ kind: 'enemy', type, x, y }, extra || {}); hydrate(e); e.state = (extra && extra.state) || 'idle'; G.ents.push(e); return e; };
      check(T.hissTargets(10).length === 0, 'nothing hostile: nothing to hiss at');
      // in front and in view: not hissed at (you can see it)
      const front = mk('hound', X + 5, Y); check(T.hissTargets(10).length === 0, 'in view ahead: you can see it, she does not hiss');
      // behind the player, within range: hissed at
      front.x = X - 5; front.y = Y; let tg = T.hissTargets(10); check(tg.length === 1 && tg[0].d > 4.9 && tg[0].d < 5.1, 'behind: a target');
      check(T.dirPhrase(tg[0].rel) === 'behind you', 'it is behind you: ' + T.dirPhrase(tg[0].rel));
      // out of range
      front.x = X - 12; check(T.hissTargets(10).length === 0, 'twelve tiles off: out of range'); front.x = X - 5;
      // passive / dead / hidden enemies are not hostile
      front.passive = true; check(T.hissTargets(10).length === 0, 'a passive creature is not hissed at'); front.passive = false;
      front.state = 'passive'; check(T.hissTargets(10).length === 0, 'passive state'); front.state = 'idle';
      front.hidden = true; check(T.hissTargets(10).length === 0, 'hidden'); front.hidden = false;
      front.dead = true; check(T.hissTargets(10).length === 0, 'dead'); front.dead = false;
      // behind a wall, in front: unseen counts
      // the tick: sound, line, cooldown
      const before = T.state.hisses; G.time = 1000; G.state = 'play';
      T.tickHiss(); check(T.state.hisses === before + 1, 'the hiss fires');
      const line = Array.from(document.querySelectorAll('#msgs .m')).map((m) => m.textContent).find((t) => /hisses/.test(t));
      check(line && /Wick/.test(line) && /behind you/.test(line), 'the line names her and the direction: ' + line);
      T.tickHiss(); check(T.state.hisses === before + 1, 'cooldown: not again at once');
      G.time += 70; T.tickHiss(); check(T.state.hisses === before + 2, 'later, again');
      // a second foe, off to the left
      front.x = X - 5; const left = mk('hound', X, Y - 5); G.time += 70; const tl = T.hissTargets(10).find((t) => t.e === left); check(tl && T.dirPhrase(tl.rel) === 'off to your left', 'left is left: ' + (tl && T.dirPhrase(tl.rel)));
      const right = mk('hound', X, Y + 5); const tr = T.hissTargets(10).find((t) => t.e === right); check(tr && T.dirPhrase(tr.rel) === 'off to your right', 'right is right');
      // she waits / the switch is off: silence
      G.flags.p11t_stay = 1; const n2 = T.state.hisses; G.time += 70; T.tickHiss(); check(T.state.hisses === n2, 'a cat told to wait stays quiet'); G.flags.p11t_stay = 0;
      T.set.cat = false; G.time += 70; T.tickHiss(); check(T.state.hisses === n2, 'switched off: silent'); T.set.cat = true;
      // where she is not (a hall), nothing
      loadMap('mausoleum'); T.tickCat(0.016); mk('hound', 3, 3); G.time += 70; const n3 = T.state.hisses; T.tickHiss(); check(T.state.hisses === n3, 'she is outside: no hiss');
      return out;
    });
    assert.deepEqual(hiss.fails, [], 'hiss: ' + hiss.fails);
    console.log('PASS the hiss: only hostile, awake, unseen foes within ten tiles; positional line; cooldown; silent when told to wait or switched off');

    // ---- towns are quiet: the Boar, with the cat adopted, never hisses; the Law's watch is not an enemy
    const town = await page.evaluate(() => {
      const T = TAVERN; G.flags.p11t_stay = 0; loadMap('oakhaven', { x: 24, y: 24, dir: 0 }); T.tickCat(0.016);
      const n = T.state.hisses; G.time += 100; T.tickHiss();
      return { hissed: T.state.hisses - n, cat: !!T.myCat(), enemies: G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.passive).length };
    });
    assert.equal(town.hissed, 0, 'no false hiss in a quiet town (hostile enemies there: ' + town.enemies + ')');
    console.log('PASS no false hisses where nothing hostile is');

    // ---- the cat switch off, and hostile saves
    const catOff = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = TAVERN; loadMap('whispergrove', { x: 20, y: 30, dir: 0 }); T.tickCat(0.016);
      const cat = T.originalCat(); check(cat.wander === false, 'following');
      T.set.cat = false; T.sync();
      check(cat.wander === true && NPCS.cat.name === 'A cat', 'off: the original wanderer and her old name');
      const x = cat.x; T.tickCat(1); check(cat.x === x, 'off: she is not moved');
      talk(cat); check(document.getElementById('event').classList.contains('hidden') || !document.getElementById('event-panel').textContent.includes('Offer'), 'off: the original talk');
      T.set.cat = true; T.sync();
      // a hostile save: nonsense flags, a cat that is "adopted" in a game that never reached the Grove
      G.flags = { part3: true, p11t_adopt: '1; alert(1)', p11t_name: -9, p11t_fed: 'lots', p11t_stay: 'no', p11t_fday: {}, p11t_games: 1e99, p11t_perf: -3, p11t_closed: 'x' };
      T.sync(); T.tickCat(0.016); T.tickHiss();
      check(T.catName() === 'Thimble' && !T.adopted(), 'nonsense flags: not adopted, default name');
      G.flags = { part3: true, p11t_adopt: 1, p11t_name: '<img src=x onerror=alert(1)>' };
      T.sync(); check(T.catName() === 'Thimble', 'a markup name is only an out-of-range index'); T.tickCat(0.016);
      loadMap('whispergrove', { x: 20, y: 30, dir: 0 }); talk(T.originalCat());
      const html = document.getElementById('event-panel').innerHTML; check(!/<img/.test(html), 'nothing from a save is built into markup');
      hide('#event'); G.state = 'play';
      G.flags = {}; T.sync(); G.state = 'play';
      return out;
    });
    assert.deepEqual(catOff.fails, [], 'cat off / hostile: ' + catOff.fails);
    console.log('PASS cat switch off restores the original wanderer; hostile p11t_ flags are inert');

    // ---- Options rows
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const opt = await page.evaluate(() => ({ rows: ['t11-opt-games', 't11-opt-cat', 't11-opt-timing'].map((id) => !!document.getElementById(id)) }));
    assert.deepEqual(opt.rows, [true, true, true], 'three rows in Options');
    await page.locator('#t11-opt-timing').click(); await page.locator('#t11-opt-timing').click();
    assert.equal(await page.evaluate(() => TAVERN.set.timing), 'auto'); assert.equal(await page.locator('#t11-opt-timing').innerText(), 'Auto-timing');
    await page.locator('#t11-opt-games').click();
    assert.equal(await page.evaluate(() => [TAVERN.set.games, JSON.parse(localStorage.getItem('octave.tavern11.v1')).games].join()), 'false,false');
    await page.locator('#t11-opt-games').click(); await page.locator('#t11-opt-timing').click();
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    console.log('PASS Options: Tavern games, The cat, Performance timing (persisted)');

    // ---- the set in real time with a pad: A starts it, face buttons are lanes, Back puts it away (the same poll the real panel runs)
    const realPad = await page.evaluate(async () => {
      G.flags = {}; G.day = 50; G.tod = 19 / 24; G.state = 'play'; if (!TAVERN.hasInstrument()) G.player.inv.push({ id: 'whistle', n: 1 });
      window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [window.__pad];
      const out = {}, raf = () => new Promise((r) => requestAnimationFrame(() => r())), wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) await raf(); }, tap = async (b) => { window.__pad.buttons[b].pressed = true; for (let k = 0; k < 4; k++) await raf(); window.__pad.buttons[b].pressed = false; for (let k = 0; k < 3; k++) await raf(); };
      const s = TAVERN.openPerformance({});
      await wait(100); out.idle = s.t;
      await tap(0); out.running = s.running;
      await wait(300); out.advanced = s.t > -0.8;
      await tap(2); out.laneStamp = s.last[0] > -1;
      await tap(12); await tap(1);
      await tap(8); await wait(150);
      out.closed = G.openPanel === null && !TAVERN.perfUi; out.gold = G.player.gold;
      delete navigator.getGamepads; return out;
    });
    assert.deepEqual([realPad.idle, realPad.running, realPad.advanced, realPad.laneStamp, realPad.closed], [-0.8, true, true, true, true], 'pad plays the real-time set: ' + JSON.stringify(realPad));

    // ---- frame cost of the cat (follow + hiss scan) in a 12-enemy scene, isolated: well under 1 ms
    const cost = await page.evaluate(() => {
      G.flags = { part3: true, p11t_adopt: 1, p11t_stay: 0 }; G.state = 'play'; G.time = 5000;
      loadMap('deepwoods'); const T = TAVERN; T.set.cat = true; T.tickCat(0.016);
      G.ents = G.ents.filter((e) => e.kind !== 'enemy'); G.map.entities = G.ents;
      for (let i = 0; i < 12; i++) { const e = { kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: Engine.cam.x - 8 + (i % 4) * 3, y: Engine.cam.y - 6 + (i % 3) * 2 }; hydrate(e); G.ents.push(e); }
      const median = (fn) => { const ms = []; for (let k = 0; k < 301; k++) { const t0 = performance.now(); for (let j = 0; j < 20; j++) fn(j); ms.push((performance.now() - t0) / 20); } ms.sort((a, b) => a - b); return ms[150]; };
      const frame = (on) => { T.set.cat = on; return median((j) => { T.tickCat(0.016); if (j % 18 === 0) { G.time += 100; T.tickHiss(); } }); };
      frame(true); const onMs = frame(true), offMs = frame(false); T.set.cat = true;
      return { onUs: +(onMs * 1000).toFixed(1), offUs: +(offMs * 1000).toFixed(1), extraUs: +((onMs - offMs) * 1000).toFixed(1) };
    });
    assert(cost.extraUs < 1000, 'the cat costs under 1 ms a frame: ' + JSON.stringify(cost));
    console.log('PASS pad in the real-time set; frame cost with 12 enemies: ' + JSON.stringify(cost));
    await page.evaluate(() => { G.flags = {}; G.state = 'play'; });

    // ---- text catalogue: every English string has a French row
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p11-tavern.tsv'), 'utf8');
    const rows = new Map(tsv.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t')));
    const strings = await page.evaluate(() => { const out = []; const walk = (o) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); }; walk(TAVERN.TX); return out; });
    const missing = strings.filter((s) => !rows.has(s) || !rows.get(s).trim());
    assert.deepEqual(missing, [], 'French rows missing for: ' + missing.slice(0, 5));
    console.log('PASS French: ' + strings.length + ' strings, all with rows');

    // ================================================================= 640x400
    const small = await boot(browser, { width: 640, height: 400 });
    await small.page.evaluate(() => { GFX.reduceMotion = true; G.flags = { part3: true }; G.day = 3; G.tod = 0.8; G.player.gold = 60; G.player.inv.push({ id: 'whistle', n: 1 }); G.state = 'play'; });
    await small.page.evaluate(() => { TAVERN.openBones({ instant: true }); });
    await small.page.keyboard.press('Enter');
    await small.page.waitForFunction(() => TAVERN.bonesUi.round && !TAVERN.bonesUi.busy);
    const fb = await fits(small.page); assert(fb.inside && !fb.hscroll, 'Bones at 640x400 ' + JSON.stringify(fb));
    await shot(small.page, 'bones-640x400.png');
    await small.page.evaluate(() => TAVERN.bonesUi.close());
    await small.page.evaluate(() => { TAVERN.openPerformance({ manual: true }); });
    await small.page.waitForFunction(() => G.openPanel === 'p11t_perf');
    const fp = await fits(small.page); assert(fp.inside && !fp.hscroll, 'the set at 640x400 ' + JSON.stringify(fp));
    await shot(small.page, 'perf-640x400.png');
    await small.page.keyboard.press('Escape');
    await small.page.evaluate(() => { TAVERN.openNaming(); });
    const fn = await fits(small.page); assert(fn.inside && !fn.hscroll, 'naming at 640x400 ' + JSON.stringify(fn));
    await small.page.keyboard.press('Escape');
    console.log('PASS 640x400: Bones, the set and the naming panel fit without horizontal overflow');
    assert.deepEqual(small.errors, [], 'no page errors (640x400): ' + small.errors);

    assert.deepEqual(errors, [], 'no page errors: ' + errors);
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
