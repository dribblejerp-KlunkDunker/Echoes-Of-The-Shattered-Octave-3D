// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/roads15.test.js
// Phase 15 ROADS (js/roads15.js): roadside events on world-map journeys, houses that burn and are rebuilt,
// and lasting deaths for unnamed townsfolk. Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof ROADS15 !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Roads Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);

    // ------------------------------------------------------------------ part A: the live loop (walk, panel, keys, touch, pad)
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      UPG.tutorial = false; Weather.hold('clear'); G.keys = {}; G.flags.gate_open = true;
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.reset = () => {
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; Weather.hold('clear'); G.keys = {};
        G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false;
        for (const m of Object.values(G.maps)) m.visited.fill(1);
        ROADS15.pending = null; ROADS15.forceNext(null);
        for (const k of ['events', 'fire', 'loss']) ROADS15.set[k] = true;
        TRAVEL.region = 'reach'; TRAVEL.pace = 'cautious';
      };
    });
    const gotoClearing = () => page.evaluate(() => { loadMap('clearing', { x: 20.5, y: 32.5, dir: 0 }); G.state = 'play'; });
    const walk = async (plan, setup) => {
      await page.evaluate(([plan, setup]) => {
        if (setup) new Function(setup)();
        ROADS15.forceNext(plan); Math.random = () => 0.99;
      }, [plan, setup || '']);
      await page.keyboard.press('t'); await page.waitForTimeout(250);
      await page.evaluate(() => { const d = TRAVEL.dests.filter(x => x.state === 'ok').find(x => x.map === 'oakhaven' && x.spawn); travelSelect(d); });
      await page.waitForTimeout(150);
      await page.locator('#tv-go').click();
    };

    // A1: the figure halts short of the mark, then the panel opens; keys 1 then Enter
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'cart', seed: 777, rate: 1, roll: 0 });
    await page.waitForFunction(() => MOTION10.travel.state.anim && MOTION10.travel.state.anim.plan, null, { timeout: 5000 });
    const anim = await page.evaluate(() => { const A = MOTION10.travel.state.anim; return { stopU: A.plan.stopU, ev: A.plan.roadEvent, ambush: !!A.plan.ambush }; });
    assert.ok(anim.stopU >= 0.6 && anim.stopU <= 0.9, 'the figure halts at 60-90% of the way: ' + anim.stopU);
    assert.equal(anim.ev, 'cart'); assert.equal(anim.ambush, false, 'a road event is not an ambush alarm');
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    const ask = await page.evaluate(() => ({ state: G.state, mapId: G.mapId, b0: !!document.getElementById('p15r-b0'), b1: !!document.getElementById('p15r-b1'), b2: !!document.getElementById('p15r-b2'), title: document.getElementById('p15r-t').textContent, trips: G.flags.p15r_trips }));
    assert.deepEqual([ask.state, ask.mapId, ask.b0, ask.b1, ask.b2, ask.title, ask.trips], ['panel', 'oakhaven', true, true, false, 'A cart in the ditch', 1], 'the cart panel after the walk: ' + JSON.stringify(ask));
    await page.keyboard.press('m'); // a stray key never leaks through to the map
    assert.equal(await page.evaluate(() => G.openPanel), 'roadevent', 'other keys are swallowed while the event is up');
    const gold0 = await page.evaluate(() => G.player.gold);
    await page.keyboard.press('1'); await page.waitForTimeout(150);
    const res = await page.evaluate(() => ({ stage: ROADS15.open.stage, out: ROADS15.open.res.outcome, ok: !!document.getElementById('p15r-ok'), gold: G.player.gold }));
    assert.equal(res.stage, 'result'); assert.ok(res.ok, 'a Go on button'); assert.ok(res.gold > gold0, 'the carter pays something');
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [G.openPanel, G.state, G.mapId, ROADS15.pending, ROADS15.open]), [null, 'play', 'oakhaven', null, null], 'Enter goes on, into play');

    // A2: touch (tap) the toll at a checkpoint
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'checkpoint', seed: 5, rate: 1, roll: 0 }, 'G.player.gold = 40;');
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    await page.locator('#p15r-b1').tap(); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [ROADS15.open.res.outcome, G.player.gold]), ['tolled', 32], 'tapping the toll pays 8');
    await page.locator('#p15r-ok').tap(); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [G.openPanel, G.state, G.mapId]), [null, 'play', 'oakhaven'], 'tapping Go on returns to play');

    // A3: controller. A shares the food, B goes on
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'refugees', seed: 9, rate: 1, roll: 0 }, "G.give('honey', 1);");
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    const pad = await page.evaluate(() => {
      const mk = () => { const b = []; for (let i = 0; i < 17; i++) b.push({ pressed: false, value: 0 }); return { connected: true, id: 'test pad', index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons: b }; };
      window.fakePad = mk(); navigator.getGamepads = () => [window.fakePad];
      const hed0 = G.player.factions.hedge;
      fakePad.buttons[0].pressed = true; controlsTick(0.016); fakePad.buttons[0].pressed = false; controlsTick(0.016);
      const o = { stage: ROADS15.open && ROADS15.open.stage, out: ROADS15.open && ROADS15.open.res && ROADS15.open.res.outcome, honey: G.has('honey'), hedge: G.player.factions.hedge - hed0 };
      fakePad.buttons[1].pressed = true; controlsTick(0.016); fakePad.buttons[1].pressed = false; controlsTick(0.016);
      o.after = [G.openPanel, G.state]; return o;
    });
    assert.deepEqual(pad, { stage: 'result', out: 'shared', honey: false, hedge: 2, after: [null, 'play'] }, 'controller A shares, B goes on: ' + JSON.stringify(pad));
    // X (button 2) picks the second choice, Y (3) the third, B backs out on the leave choice
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'checkpoint', seed: 5, rate: 1, roll: 0 });
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    const pad2 = await page.evaluate(() => {
      fakePad.buttons[3].pressed = true; controlsTick(0.016); fakePad.buttons[3].pressed = false; controlsTick(0.016);
      const o = { out: ROADS15.open.res.outcome, after: ROADS15.open.res.after };
      fakePad.buttons[0].pressed = true; controlsTick(0.016); fakePad.buttons[0].pressed = false; controlsTick(0.016);
      o.end = [G.openPanel, G.state, G.mapId]; return o;
    });
    assert.deepEqual(pad2, { out: 'turned', after: 'back', end: [null, 'play', 'clearing'] }, 'controller Y turns back and the walk is undone: ' + JSON.stringify(pad2));

    // A4: Escape on the ask stage is the quiet way on (the pass choice), and Escape on a checkpoint turns back
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'cart', seed: 3, rate: 1, roll: 0 });
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => ROADS15.open.res.outcome), 'passed', 'Escape passes the cart by');
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => [G.openPanel, G.state]), [null, 'play']);
    await page.evaluate(() => reset()); await gotoClearing();
    await walk({ type: 'checkpoint', seed: 3, rate: 1, roll: 0 });
    await page.waitForFunction(() => G.openPanel === 'roadevent', null, { timeout: 9000 });
    assert.match(await page.evaluate(() => document.getElementById('p15r-h').textContent), /Escape turns back/, 'the checkpoint hint says what Escape does');
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [G.openPanel, G.state, G.mapId]), [null, 'play', 'clearing'], 'Escape then Enter walks back');

    // A5: a normal (unforced) trip with events off, and an ambush trip, raise no event
    const offs = await page.evaluate(() => {
      reset(); loadMap('clearing', { x: 20.5, y: 32.5, dir: 0 });
      ROADS15.setSwitch('events', false); ROADS15.forceNext({ type: 'cart', seed: 1, rate: 1, roll: 0 });
      const d = travelDestinations('reach').find(x => x.map === 'oakhaven' && x.spawn);
      const t0 = G.flags.p15r_trips; const sv = Math.random; Math.random = () => 0.99; travelGo(d); Math.random = sv;
      const o = { pending: !!ROADS15.pending, trips: G.flags.p15r_trips, t0, mapId: G.mapId };
      ROADS15.setSwitch('events', true); ROADS15.forceNext(null); return o;
    });
    assert.deepEqual(offs, { pending: false, trips: undefined, t0: undefined, mapId: 'oakhaven' }, 'events off: no event, no flag written: ' + JSON.stringify(offs));
    const amb = await page.evaluate(() => {
      reset(); loadMap('oakhaven', { x: 39.5, y: 6.5, dir: 0 });
      const d = travelDestinations('reach').find(x => x.map === 'clearing' && x.spawn) || travelDestinations('reach').find(x => x.map === 'clearing');
      ROADS15.forceNext({ type: 'cart', seed: 1, rate: 1, roll: 0 });
      TRAVEL.pace = 'reckless';
      const n0 = G.ents.length, sv = Math.random; Math.random = () => 0; travelGo(d); Math.random = sv;
      const o = { arrived: G.mapId === 'clearing', foes: G.ents.filter(e => e.kind === 'enemy' && e.state === 'chase').length, pending: !!ROADS15.pending, trips: G.flags.p15r_trips, n0 };
      ROADS15.forceNext(null); return o;
    });
    assert.equal(amb.arrived, true); assert.ok(amb.foes >= 1, 'the ambush came: ' + JSON.stringify(amb));
    assert.equal(amb.pending, false, 'an ambush is that trip\'s event: no roadside event on top');
    assert.equal(amb.trips, 1, 'the trip is still counted');
    // a waiting event that nobody opened is dropped after its time
    const ttl = await page.evaluate(() => {
      reset(); ROADS15.pending = { plan: { type: 'cart', seed: 1, rate: 1, roll: 0 }, dest: { name: 'x', map: G.mapId }, origin: null, born: -1000, paused: false };
      ROADS15.pump(); return [!!ROADS15.pending, G.openPanel];
    });
    assert.deepEqual(ttl, [false, null], 'a stale event is dropped, never opened late');

    // ------------------------------------------------------------------ part B: pure rules, frozen loop
    await page.evaluate(() => { reset(); G.state = 'panel'; window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(80);
    const B = await page.evaluate(async () => {
      const check = window.check;
      const R = ROADS15, BAL = R.BAL, out = {};
      const clk = () => G.day * 24 + G.tod * 24;
      const src = await (await fetch('js/roads15.js')).text();
      check(!/Math\.random/.test(src.replace(/\/\/.*$/gm, '')), 'the module never calls Math.random');

      // ---- event rates and determinism
      const ctx = (o) => Object.assign({ world: 12345, trips: 0, dest: 'Oakhaven: the North Gate square', map: 'oakhaven', mins: 60, pace: 'reckless', day: 3, after: false }, o || {});
      const same = JSON.stringify(R.planEvent(ctx({ trips: 7 }))) === JSON.stringify(R.planEvent(ctx({ trips: 7 })));
      check(same, 'the same trip on the same save gives the same answer');
      let n = 0, types = {}, firstPlans = [];
      for (let t = 0; t < 6000; t++) { const p = R.planEvent(ctx({ trips: t })); if (p) { n++; types[p.type] = (types[p.type] || 0) + 1; if (firstPlans.length < 20) firstPlans.push(JSON.stringify(p)); } }
      const want = BAL.events.rate.oakhaven;
      check(Math.abs(n / 6000 - want) < 0.02, 'oakhaven reckless 60-minute trips: rate ' + (n / 6000).toFixed(3) + ' near ' + want);
      check(!types.graves, 'no road graves before the Greening');
      const tot = n; for (const [k, w] of Object.entries(BAL.events.weights.before)) { const sum = Object.values(BAL.events.weights.before).reduce((a, b) => a + b, 0); check(Math.abs((types[k] || 0) / tot - w / sum) < 0.08, 'weight of ' + k + ': ' + ((types[k] || 0) / tot).toFixed(2)); }
      let na = 0, ta = {}; for (let t = 0; t < 6000; t++) { const p = R.planEvent(ctx({ trips: t, after: true, map: 'deepwoods' })); if (p) { na++; ta[p.type] = (ta[p.type] || 0) + 1; } }
      check(!ta.checkpoint && !ta.refugees && ta.cart && ta.graves, 'after the Greening only carts and graves: ' + JSON.stringify(ta));
      check(Math.abs(na / 6000 - BAL.events.rate.deepwoods) < 0.025, 'deepwoods rate ' + (na / 6000).toFixed(3));
      let other = 0; for (let t = 0; t < 4000; t++) if (R.planEvent(ctx({ trips: t, map: 'somewhere' }))) other++;
      check(Math.abs(other / 4000 - BAL.events.rateOther) < 0.025, 'unlisted maps use rateOther');
      check(R.eventRate(ctx({ pace: 'cautious' })) < R.eventRate(ctx({ pace: 'reckless' })), 'walking cautiously meets fewer events');
      check(R.eventRate(ctx({ mins: 5 })) < R.eventRate(ctx({ mins: 60 })) && R.eventRate(ctx({ mins: 600, map: 'deepwoods' })) <= BAL.events.cap, 'short trips fewer, the rate is capped');
      check(R.eventRate(ctx({ mins: NaN })) >= 0 && R.eventRate(ctx({ mins: -9 })) >= 0, 'bad minutes cannot make a negative rate');
      check(JSON.stringify(R.planEvent(ctx({ world: 1, trips: 3 }))) !== JSON.stringify(R.planEvent(ctx({ world: 2, trips: 3 }))) || R.planEvent(ctx({ world: 1, trips: 3 })) === null, 'worlds differ');
      let diff = 0; for (let t = 0; t < 400; t++) if (JSON.stringify(R.planEvent(ctx({ trips: t, world: 1 }))) !== JSON.stringify(R.planEvent(ctx({ trips: t, world: 2 })))) diff++;
      check(diff > 20, 'another character, another road');
      out.rates = { n, na, other };

      // ---- exact outcomes (opts.roll pins the check)
      const fresh = () => { reset(); G.state = 'play'; G.player.gold = 50; G.player.attrs.Strength = 10; G.player.attrs.Intelligence = 10; };
      fresh(); G.player.attrs.Strength = 12;
      check(Math.abs(R.cartChance() - Math.min(BAL.events.cart.max, BAL.events.cart.base + 12 * BAL.events.cart.perPoint)) < 1e-9, 'cart chance is base plus the better of Strength and Intelligence');
      G.player.attrs.Strength = 99; G.player.attrs.Intelligence = 99; check(R.cartChance() <= BAL.events.cart.max, 'cart chance is capped');
      G.player.attrs.Strength = -5; G.player.attrs.Intelligence = 'x'; check(R.cartChance() === BAL.events.cart.base, 'a hostile attribute falls back to the base');
      fresh(); let c0 = clk();
      let r = R.resolve({ type: 'cart', seed: 11 }, 0, { roll: 0 });
      check(r.outcome === 'mended' && r.gold >= 5 && r.gold <= 12 && G.player.gold === 50 + r.gold, 'a mended cart pays 5-12: ' + JSON.stringify(r));
      check(Math.abs(clk() - c0 - 0.5) < 1e-6, 'mending takes half an hour');
      fresh(); c0 = clk(); r = R.resolve({ type: 'cart', seed: 11 }, 0, { roll: 0.999 });
      check(r.outcome === 'failed' && G.player.gold === 52 && Math.abs(clk() - c0 - 0.5) < 1e-6, 'a failed mend still costs the half hour and pays 2');
      fresh(); c0 = clk(); r = R.resolve({ type: 'cart', seed: 11 }, 1, { roll: 0 });
      check(r.outcome === 'passed' && G.player.gold === 50 && clk() === c0, 'going round costs nothing and pays nothing');
      let gs = new Set(); for (let s = 1; s < 80; s++) { fresh(); gs.add(R.resolve({ type: 'cart', seed: s }, 0, { roll: 0 }).gold); }
      check(Math.min(...gs) === 5 && Math.max(...gs) === 12, 'the pay spans 5 to 12');
      check(JSON.stringify(R.resolve({ type: 'cart', seed: 4 }, 0, { roll: 0 }).texts) === JSON.stringify((fresh(), R.resolve({ type: 'cart', seed: 4 }, 0, { roll: 0 }).texts)), 'the same seed says the same line');

      // refugees: food, standing, one rumour
      fresh(); G.give('honey', 2); const hed0 = G.player.factions.hedge, j0 = G.journal.length;
      r = R.resolve({ type: 'refugees', seed: 2 }, 0, {});
      check(r.outcome === 'shared' && G.count('honey') === 1 && G.player.factions.hedge === hed0 + 2 && G.journal.length === j0 + 1, 'sharing food: one item, +2 Hedge, a first journal line');
      R.resolve({ type: 'refugees', seed: 2 }, 0, {}); check(G.journal.length === j0 + 1 && G.flags.p15r_ref === 2, 'the journal line is written once');
      fresh(); const inv0 = JSON.stringify(G.player.inv), h1 = G.player.factions.hedge; for (const f of BAL.events.refugees.foods) while (G.has(f)) G.take(f);
      r = R.resolve({ type: 'refugees', seed: 2 }, 0, {});
      check(r.outcome === 'wished' && G.player.factions.hedge === h1, 'with no food the choice is only a kind word');
      fresh(); G.give('honey', 1); r = R.resolve({ type: 'refugees', seed: 2 }, 1, {});
      check(r.outcome === 'wished' && G.has('honey'), 'wishing them well keeps your food');
      // graves: no mechanics at all
      fresh(); G.flags.greening = true; const snap0 = JSON.stringify([G.player.gold, G.player.inv, G.player.factions, G.player.xp, clk(), Object.keys(G.flags).sort()]);
      r = R.resolve({ type: 'graves', seed: 8 }, 0, {});
      check(r.outcome === 'seen' && r.effects.length === 0 && r.texts.length === 1 && snap0 === JSON.stringify([G.player.gold, G.player.inv, G.player.factions, G.player.xp, clk(), Object.keys(G.flags).sort()]), 'the graves are a quiet line and nothing else');
      delete G.flags.greening;

      // checkpoint: papers, the toll, contraband
      const CB = BAL.events.checkpoint;
      fresh(); G.player.factions.synod = 0; G.player.factions.office = 0;
      check(Math.abs(R.papersChance() - CB.base) < 1e-9, 'papers: the base chance with no standing');
      G.player.factions.synod = 100; const hi = R.papersChance(); G.player.factions.synod = -100; const lo = R.papersChance();
      check(hi > CB.base && lo < CB.base && lo >= CB.min && hi <= CB.max, 'papers: Synod standing moves it, inside min/max');
      G.player.factions.synod = 0; G.player.crime = { bounty: 60 }; check(R.papersChance() < CB.base, 'a bounty makes the clerk look harder'); G.player.crime = {};
      fresh(); c0 = clk(); r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0 });
      check(r.outcome === 'passed' && G.player.gold === 50 && clk() === c0, 'good papers cost nothing');
      fresh(); c0 = clk(); r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0.999 });
      check(r.outcome === 'fee' && G.player.gold === 50 - CB.feeFail && Math.abs(clk() - c0 - CB.delay) < 1e-6, 'a clean search costs the fee and a quarter hour');
      fresh(); G.player.gold = 2; r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0.999 }); check(G.player.gold === 0, 'the fee never takes more than you have');
      fresh(); G.give('p12_grapnel', 1); G.give('coil', 1); G.give('honey', 3); const b0 = G.player.crime ? G.player.crime.bounty || 0 : 0;
      r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0.999 });
      check(r.outcome === 'confiscated' && !G.has('p12_grapnel'), 'the grapnel is taken');
      check(G.has('coil') && G.count('honey') === 3, 'a quest item and honest goods are never taken');
      check(G.player.crime.bounty === b0 + CB.grapnelBounty, 'the grapnel is a bounty of ' + CB.grapnelBounty + ': ' + G.player.crime.bounty);
      fresh(); G.give('honey', 2); R.noteStolen('honey'); R.noteStolen('honey'); R.noteStolen('coil');
      check(R.stolenCounts().honey === 2 && !R.stolenCounts().coil, 'stolen goods are counted; key items are not');
      r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0.999 });
      check(r.outcome === 'confiscated' && !G.has('honey') && !R.stolenCounts().honey, 'stolen goods are confiscated and forgotten');
      fresh(); G.give('honey', 2); R.noteStolen('honey'); r = R.resolve({ type: 'checkpoint', seed: 6 }, 0, { roll: 0 }); check(r.outcome === 'passed' && G.has('honey'), 'passing the check keeps contraband');
      fresh(); G.player.gold = 30; r = R.resolve({ type: 'checkpoint', seed: 6 }, 1, {}); check(r.outcome === 'tolled' && G.player.gold === 30 - CB.toll, 'the toll is 8');
      fresh(); G.give('p12_grapnel', 1); G.player.gold = 30; R.resolve({ type: 'checkpoint', seed: 6 }, 1, {}); check(G.has('p12_grapnel'), 'a paid toll means no search');
      fresh(); G.player.gold = 3; r = R.resolve({ type: 'checkpoint', seed: 6 }, 1, { roll: 0 }); check(r.outcome === 'passed' && G.player.gold === 3, 'too poor for the toll falls back on the papers');
      fresh(); r = R.resolve({ type: 'checkpoint', seed: 6 }, 2, {}); check(r.after === 'back' && r.outcome === 'turned', 'turning back is always on offer');
      out.fresh = true;
      return out;
    });
    assert.ok(B.fresh);

    // ------------------------------------------------------------------ checkpoint never softlocks (every choice, every situation)
    const soft = await page.evaluate(() => {
      const check = window.check, results = [];
      const sits = {
        plain: () => { },
        broke: () => { G.player.gold = 0; },
        grapnel: () => { G.give('p12_grapnel', 1); },
        keyitems: () => { G.give('coil', 1); G.give('charts', 1); G.give('pass', 1); },
        wanted: () => { G.player.crime = { bounty: 500 }; },
        cursed: () => { G.player.factions.synod = -100; G.player.factions.office = -100; },
        stolen: () => { G.give('honey', 4); ROADS15.noteStolen('honey'); },
      };
      for (const [name, f] of Object.entries(sits)) for (const choice of [0, 1, 2]) for (const seed of [41, 42, 43, 44, 45, 46]) {
        reset(); G.state = 'play'; G.player.gold = 40; f();
        const keyBefore = ['coil', 'charts', 'pass'].filter(k => G.has(k));
        const here = G.mapId;
        ROADS15.pending = { plan: { type: 'checkpoint', seed, rate: 1, roll: 0 }, dest: { name: 'Oakhaven: the North Gate square', map: G.mapId }, origin: { mapId: 'clearing', x: 20.5, y: 32.5, dir: 0 }, born: performance.now() / 1000, paused: true };
        ROADS15.pump();
        check(G.openPanel === 'roadevent' && G.state === 'panel', 'the panel opens: ' + name);
        const btn = document.getElementById('p15r-b' + choice);
        // a disabled choice (too poor for the toll) must leave another way on
        check(document.getElementById('p15r-b0') && document.getElementById('p15r-b2') && !document.getElementById('p15r-b0').disabled && !document.getElementById('p15r-b2').disabled, 'papers and turn-back are always enabled: ' + name);
        if (btn && !btn.disabled) ROADS15.pick(choice); else ROADS15.pick(2);
        // the result stage must offer Go on (or have already resolved)
        check(!!document.getElementById('p15r-ok'), 'a Go on button follows every choice: ' + name + '/' + choice);
        ROADS15.finish();
        check(G.state === 'play' && !G.openPanel && !ROADS15.open, 'checkpoint ends in play, nothing open: ' + name + '/' + choice + ' state=' + G.state);
        check(G.mapId === here || G.mapId === 'clearing', 'we are on the destination or back where we began: ' + G.mapId);
        for (const k of keyBefore) check(G.has(k), 'quest item kept: ' + k + ' in ' + name);
        results.push(name + choice);
      }
      return results.length;
    });
    assert.equal(soft, 7 * 3 * 6, 'every checkpoint situation was exercised');

    // ------------------------------------------------------------------ part C: fire and rebuilding
    const C = await page.evaluate(() => {
      const check = window.check, R = ROADS15, BAL = R.BAL, F = BAL.fire;
      const clk = () => G.day * 24 + G.tod * 24;
      const setup = () => { reset(); G.state = 'play'; loadMap('oakhaven', { x: 39.5, y: 12.5, dir: 0 }); G.state = 'play'; };
      const m = () => G.maps.oakhaven;
      const decalsOf = (i) => R.ringCells(m(), R.BUILDINGS[i]).map(ci => (m()._decalsAll || {})[ci] || null);
      const out = {};
      // whitelist: four generic houses, enterable ones never
      setup();
      check(R.BUILDINGS.length === 4, 'four houses in the whitelist');
      for (let i = 0; i < 4; i++) {
        const b = R.BUILDINGS[i]; check(R.validateBuilding(i), 'building ' + b.key + ' matches the map');
        const dc = m().cells[b.door[1] * m().w + b.door[0]];
        check(dc.door && !dc.portal && !dc.shop, b.key + ' is a closed door: not a shop, not an interior');
        check(!/Tarrow|Boar|mill|tannery|Cooper|market|Bettany|Harrow|Office|Synod|watch/i.test(b.label), 'no named building in the whitelist: ' + b.label);
      }
      check(!R.ignite(99, 'story') && !R.ignite(-1, 'story') && !R.ignite('boar', 'story') && !R.ignite('house13', 'flask') && !R.ignite(null, 'story') && !R.ignite(NaN, 'story') && !R.ignite({}, 'story') && !R.ignite('toString', 'story'), 'only whitelisted houses can burn');
      check(Object.keys(G.flags).filter(k => k.indexOf('p15r_b') === 0).length === 0, 'refused ignitions write nothing');

      // the lifecycle, day by day
      setup(); const before = decalsOf(0).slice();
      const door0 = m().cells[R.BUILDINGS[0].door[1] * m().w + R.BUILDINGS[0].door[0]].label;
      check(R.stageOf(0) === 'none', 'untouched at the start');
      check(R.ignite('east', 'story') === true, 'a story event lights the east house');
      check(R.stageOf(0) === 'burning', 'burning at once');
      R.syncFire();
      check(decalsOf(0).some(d => d && d.indexOf('p15r_') === 0), 'wall decals show it burning');
      check(!R.ignite('east', 'story'), 'each house burns once, ever');
      const stages = [];
      for (let h = 0; h <= 400; h += 1) {
        if (h > 0) passHours(1);
        stages.push([h, R.stageOf(0)]);
      }
      const at = (h) => stages.find(s => s[0] === h)[1];
      check(at(0) === 'burning' && at(4) === 'burning', 'burning for the first hours');
      check(at(F.burnHours + 1) === 'charred' && at(40) === 'charred' && at(F.charHours - 1) === 'charred', 'charred up to day 3');
      check(at(F.charHours + 1) === 'scaffold' && at(F.charHours + F.rebuildHours - 2) === 'scaffold', 'scaffold for six game days');
      check(at(F.charHours + F.rebuildHours + 2) === 'rebuilt' && at(400) === 'rebuilt', 'rebuilt at the end');
      check(F.rebuildHours === 144, 'six days of rebuilding');
      out.timeline = { burn: F.burnHours, char: F.charHours, rebuild: F.rebuildHours };
      // walk the stage states with the decals and props
      setup(); R.ignite('east', 'story'); R.syncFire();
      check(R.props[0].stage === 'burning', 'the props track the stage');
      passHours(F.burnHours + 1); R.syncFire();
      check(R.props[0].stage === 'charred', 'charred stage');
      const charredDecals = decalsOf(0); check(charredDecals.filter(d => d && d.indexOf('p15r_char') === 0).length >= 3, 'soot decals on the walls: ' + charredDecals.join());
      check(m().cells[R.BUILDINGS[0].door[1] * m().w + R.BUILDINGS[0].door[0]].label !== door0, 'the door is relabelled while it is burnt');
      check(R.props[0].list.length >= 1 && R.props[0].list.every(e => e._p15r && e.transient), 'ash and props are transient entities of ours');
      passHours(F.charHours); R.syncFire();
      check(R.props[0].stage === 'scaffold', 'scaffold stage');
      check(R.props[0].list.some(e => e.sprite === 'p15r_scaffold'), 'scaffold props stand');
      check(R.props[0].workers.length >= 1 && R.props[0].workers.length <= F.workers, 'one or two workers');
      const tod0 = G.tod, day0 = G.day;
      G.tod = 0.5; R.tickWorkers(); check(R.props[0].workers.every(e => !e.hidden), 'workers are out at noon');
      G.tod = 0.05; R.tickWorkers(); check(R.props[0].workers.every(e => e.hidden), 'workers go home at night');
      G.tod = tod0; G.day = day0;
      passHours(F.rebuildHours); R.syncFire();
      check(R.stageOf(0) === 'rebuilt' && R.props[0].list.length === 0 && R.props[0].workers.length === 0, 'rebuilt: no props, no workers');
      check(JSON.stringify(decalsOf(0)) === JSON.stringify(before), 'rebuilt: the walls are exactly as they were');
      check(m().cells[R.BUILDINGS[0].door[1] * m().w + R.BUILDINGS[0].door[0]].label === door0, 'rebuilt: the door is itself again');
      check(!R.ignite('east', 'story'), 'a rebuilt house does not burn again');
      check(R.activeCount() === 0, 'nothing in trouble once rebuilt');

      // max two houses at once
      setup(); check(R.ignite('east', 'story') && R.ignite('orchard', 'story'), 'two at once');
      check(!R.ignite('meadow', 'story') && !R.ignite('madders', 'story') && R.activeCount() === 2, 'never a third while two are in trouble');
      passHours(F.charHours + F.rebuildHours + 1); R.syncFire(); check(R.ignite('meadow', 'story'), 'room again once they are rebuilt');

      // arson: a witnessed flask fire is a heavy bounty; a story fire has no one to blame
      const realLaw = window.lawActive, realWit = window.theftWitness;
      setup(); window.lawActive = () => true; window.theftWitness = () => ({ id: 'townsman' });
      G.player.crime = { bounty: 0 }; check(R.ignite('east', 'flask'), 'a flask fire takes the house');
      check(G.player.crime.bounty === F.arson && F.arson > 35, 'witnessed arson is ' + F.arson + ' (above fire\'s +35): ' + G.player.crime.bounty);
      setup(); G.player.crime = { bounty: 0 }; R.ignite('orchard', 'story'); check(G.player.crime.bounty === 0, 'a story fire is nobody\'s crime');
      setup(); window.theftWitness = () => null; G.player.crime = { bounty: 0 }; R.ignite('meadow', 'flask'); check(G.player.crime.bounty === 0, 'no witness, no bounty');
      window.lawActive = realLaw; window.theftWitness = realWit;

      // a real kit12 flask fire left to burn beside a house takes it, and one that is far off does not
      setup(); const b1 = R.BUILDINGS[0];
      KIT12.fires.push({ x: b1.x - 1, y: b1.y + 3, map: 'oakhaven', left: 10, dur: 14, r: 1, ents: [], light: null, acc: 0, smoke: 0, tick: 1, dealt: new Map(), crackle: 0 });
      R.tickFire(0.1); check(R.stageOf(0) === 'burning', 'a flask fire that has burned for a few seconds beside the house takes it');
      KIT12.fires.length = 0;
      setup(); KIT12.fires.push({ x: 20, y: 50, map: 'oakhaven', left: 10, dur: 14, r: 1, ents: [], light: null, acc: 0, smoke: 0, tick: 1, dealt: new Map(), crackle: 0 });
      R.tickFire(0.1); check(R.activeCount() === 0, 'a fire in the road does not');
      KIT12.fires.length = 0;
      setup(); KIT12.fires.push({ x: b1.x - 1, y: b1.y + 3, map: 'oakhaven', left: 14, dur: 14, r: 1, ents: [], light: null, acc: 0, smoke: 0, tick: 1, dealt: new Map(), crackle: 0 });
      R.tickFire(0.1); check(R.activeCount() === 0, 'a fire that has only just been lit has not taken it yet');
      KIT12.fires.length = 0;

      // the charred house's one line from a neighbour
      setup(); R.ignite('east', 'story'); passHours(F.burnHours + 2); R.syncFire();
      Object.assign(Engine.cam, { x: b1.x - 2, y: b1.y + 3 }); G.log && (G.log.length = 0);
      R.tickFire(0.1); check((G.flags.p15r_bs & 1) === 1, 'the neighbour has spoken');
      const said = G.flags.p15r_bs; R.tickFire(0.1); R.tickFire(0.1); check(G.flags.p15r_bs === said, 'once only');

      // the Greening stops it
      setup(); R.ignite('east', 'story'); passHours(F.burnHours + 2); R.syncFire(); check(decalsOf(0).some(d => d), 'charred before the Greening');
      G.flags.greening = true; R.syncFire(); R.syncAll();
      check(R.stageOf(0) === 'none' && R.activeCount() === 0 && R.props[0].list.length === 0, 'the Greening ends the fire: no stage, no props');
      check(JSON.stringify(decalsOf(0)) === JSON.stringify(before), 'the Greening leaves the walls as the map had them');
      check(!R.ignite('orchard', 'story') && !R.ignite('meadow', 'flask'), 'no new fires after the Greening');
      delete G.flags.greening;
      setup(); G.flags.part3 = true; check(!R.ignite('east', 'story'), 'part 3 stops it too'); delete G.flags.part3;

      // the fire switch off: identical game
      setup(); const snapOff = JSON.stringify(decalsOf(0)); R.setSwitch('fire', false);
      check(!R.ignite('east', 'story') && R.stageOf(0) === 'none' && R.activeCount() === 0, 'fire off: nothing burns');
      KIT12.fires.push({ x: b1.x - 1, y: b1.y + 3, map: 'oakhaven', left: 5, dur: 14, r: 1, ents: [], light: null, acc: 0, smoke: 0, tick: 1, dealt: new Map(), crackle: 0 });
      R.tickFire(0.1); KIT12.fires.length = 0; check(R.activeCount() === 0 && JSON.stringify(decalsOf(0)) === snapOff, 'fire off: the flask fire leaves the house alone');
      R.setSwitch('fire', true);

      // a save mid-fire comes back mid-fire; a hostile save cannot start fires in the future or light every house
      setup(); R.ignite('east', 'story'); passHours(F.burnHours + 2);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); const st = R.stageOf(0);
      restoreGame(snap); G.state = 'play'; R.syncFire();
      check(R.stageOf(0) === st && st === 'charred', 'the stage survives a save: ' + R.stageOf(0));
      check(decalsOf(0).some(d => d && d.indexOf('p15r_char') === 0), 'and the soot is back on the wall');
      const evil = JSON.parse(JSON.stringify(snapshotGame()));
      evil.flags.p15r_b0 = 1e12; evil.flags.p15r_b1 = 5; evil.flags.p15r_b2 = 6; evil.flags.p15r_b3 = 7; evil.flags.p15r_bs = 'x'; evil.flags.p15r_junk = 4; evil.flags.p15r_dead = -1; evil.flags.p15r_trips = -3;
      restoreGame(evil); G.state = 'play';
      check(R.activeCount() <= F.maxActive, 'a hostile save cannot light more than two houses: ' + R.activeCount());
      check(G.flags.p15r_junk === undefined && G.flags.p15r_trips === 0 && (G.flags.p15r_bs | 0) === 0, 'junk keys are dropped, bad counters reset');
      check(!G.flags.p15r_b0 || G.flags.p15r_b0 <= Math.floor(clk()) + 1, 'a fire cannot start in the future');
      return out;
    });
    assert.ok(C.timeline);

    // ------------------------------------------------------------------ part D: lasting deaths
    const D = await page.evaluate(() => {
      const check = window.check, R = ROADS15, L = R.BAL.loss;
      const setup = () => { reset(); G.state = 'play'; loadMap('oakhaven', { x: 39.5, y: 12.5, dir: 0 }); G.state = 'play'; };
      const nextDay = () => { G.day++; };
      const named = () => G.maps.oakhaven.entities.filter(e => e.kind === 'npc' && !/^town(s)?(man|woman)$/.test(e.id));
      const out = {};
      setup();
      const list = R.homes();
      check(list.length === 16 && list.every(Boolean), 'sixteen homes found: ' + list.map(e => e && e.id).join());
      check(list.every(e => e.id === 'townsman' || e.id === 'townswoman'), 'only generic townsfolk are on the list');
      check(new Set(list).size === 16, 'one person per home');
      check(R.HOMES.filter(h => h.k === 'folk').length === 12 && R.HOMES.filter(h => h.k === 'watch').length === 2 && R.HOMES.filter(h => h.k === 'law').length === 2, '12 / 2 / 2');
      const nm0 = named().map(e => [e.id, e.dead, e.hidden]);
      check(nm0.length >= 4, 'there are named people in Oakhaven: ' + nm0.map(x => x[0]).join());

      // one death
      check(R.slay(0, 'enemy') === true, 'a townsman can be killed by an enemy');
      check(list[0].dead && list[0].hidden && !list[0].solid && list[0]._tf == null, 'dead, hidden, no routine');
      check((G.flags.p15r_dead & 1) === 1 && R.aliveCount('folk') === 11, 'the mask bit and the count');
      check(!R.slay(0, 'enemy'), 'the dead cannot be killed twice');
      check(!R.slay(1, 'enemy') && G.flags.p15r_dead === 1, 'one death a day at most');
      nextDay(); check(R.slay(1, 'enemy'), 'the next day, another');
      // floors
      let killed = 2; for (let i = 2; i < 12; i++) { nextDay(); if (R.slay(i, 'enemy')) killed++; }
      check(killed === 4 && R.aliveCount('folk') === L.floor.folk, 'at least ' + L.floor.folk + ' of 12 townsfolk always live; killed ' + killed);
      nextDay(); check(R.slay(12, 'enemy'), 'one of the two watchmen can fall');
      nextDay(); check(!R.slay(13, 'enemy') && R.aliveCount('watch') === L.floor.watch, 'a watchman always walks');
      nextDay(); check(R.slay(14, 'enemy'), 'one constable can fall');
      nextDay(); check(!R.slay(15, 'enemy') && R.aliveCount('law') === L.floor.law, 'a constable always stands');
      const total = R.HOMES.reduce((n, h, i) => n + ((R.deadMask() >> i) & 1), 0);
      check(total === 6, 'six permanent deaths is the most there can ever be: ' + total);
      check(list.filter(e => !e.dead).length >= 10, 'the town never empties: ' + list.filter(e => !e.dead).length + ' of 16 remain');
      // named and story NPCs never die
      const nm1 = named().map(e => [e.id, e.dead, e.hidden]); check(JSON.stringify(nm0) === JSON.stringify(nm1), 'no named person was touched');
      check(!R.slay(16, 'enemy') && !R.slay(-1, 'enemy') && !R.slay(NaN, 'enemy') && !R.slay('0', 'enemy') && !R.slay(null, 'enemy') && !R.slay(1.5, 'enemy'), 'only the sixteen homes can be slain');
      // a hostile mask
      for (const bad of [-1, 1.5, NaN, Infinity, '65535', null, undefined, true, {}, [], 2 ** 40, 0xFFFFFFFF, 0xFFFF, -0xFFFF]) {
        const a = R.acceptedMask(bad); let f = 0, w = 0, l = 0;
        for (let i = 0; i < 16; i++) if (a & (1 << i)) { const k = R.HOMES[i].k; if (k === 'folk') f++; else if (k === 'watch') w++; else l++; }
        check(f <= 12 - L.floor.folk && w <= 2 - L.floor.watch && l <= 2 - L.floor.law && (a & ~0xFFFF) === 0, 'mask ' + String(bad) + ' is clamped: ' + a);
      }
      check(R.acceptedMask(0xFFFF) === R.acceptedMask(R.acceptedMask(0xFFFF)), 'clamping is idempotent');
      check(R.acceptedMask(0b101) === 0b101, 'a legal mask is kept whole');

      // a save round-trip keeps them dead, with no routine
      setup(); R.slay(3, 'enemy'); const id3 = list[3];
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(snap); G.state = 'play';
      const list2 = R.homes(), e3 = list2[3];
      check((G.flags.p15r_dead & 8) === 8 && e3 && e3.dead && e3.hidden && e3._tf == null, 'dead after a reload: ' + JSON.stringify([e3 && e3.dead, e3 && e3.hidden]));
      check(list2.filter((e, i) => i !== 3 && e.dead).length === 0, 'and no one else');
      loadMap('tavern', { x: 5.5, y: 5.5, dir: 0 }); loadMap('oakhaven', { x: 39.5, y: 12.5, dir: 0 }); G.state = 'play'; check(R.homes()[3].dead, 'still dead after a map change');
      // hostile saved masks
      const evil = JSON.parse(JSON.stringify(snapshotGame())); evil.flags.p15r_dead = 0xFFFF; evil.flags.p15r_dday = -4; evil.flags.p15r_dsay = 1e9; evil.flags.p15r_dn = 'many';
      restoreGame(evil); G.state = 'play';
      const l3 = R.homes(); check(l3.filter(e => e.dead).length <= 6, 'a full mask kills at most six: ' + l3.filter(e => e.dead).length);
      check(l3.filter(e => !e.dead && R.HOMES[l3.indexOf(e)].k === 'folk').length >= L.floor.folk && l3.filter(e => !e.dead && R.HOMES[l3.indexOf(e)].k === 'watch').length >= 1 && l3.filter(e => !e.dead && R.HOMES[l3.indexOf(e)].k === 'law').length >= 1, 'floors hold after a hostile load');
      check(named().every(e => !e.dead), 'named people survive a hostile load');
      check((G.flags.p15r_dday | 0) >= 0 && (G.flags.p15r_dsay | 0) <= 0xFFFF && (G.flags.p15r_dn | 0) >= 0, 'counters clamped');

      // enemies are the killer: a chaser nearer to a townsperson than to you, for two seconds
      setup(); const t = R.homes()[4]; check(!t.dead, 'target alive');
      const foe = hydrate({ kind: 'enemy', type: 'hound', x: t.x + 0.4, y: t.y, }); foe.state = 'chase'; G.ents.push(foe);
      Object.assign(Engine.cam, { x: t.x + 6, y: t.y + 6 });
      check(R.maulable(foe), 'a hound can');
      for (let i = 0; i < 12; i++) R.tickLoss(0.1); check(!t.dead, 'not in a second');
      for (let i = 0; i < 12; i++) R.tickLoss(0.1); check(t.dead && (G.flags.p15r_dead & 16) === 16, 'two seconds on them, and they fall');
      // near you instead: they are fine
      setup(); const t2 = R.homes()[5]; const foe2 = hydrate({ kind: 'enemy', type: 'hound', x: t2.x + 0.4, y: t2.y }); foe2.state = 'chase'; G.ents.push(foe2);
      Object.assign(Engine.cam, { x: t2.x + 0.5, y: t2.y }); for (let i = 0; i < 60; i++) R.tickLoss(0.1); check(!t2.dead, 'an enemy that is after you is not after them');
      // a Hush creature never kills
      setup(); const t3 = R.homes()[6]; const q = hydrate({ kind: 'enemy', type: 'hound', x: t3.x + 0.3, y: t3.y }); q.state = 'chase'; q.def = Object.assign({}, q.def, { quiet: true }); check(!R.maulable(q), 'the Hush keeps, it does not kill');
      const idle = hydrate({ kind: 'enemy', type: 'hound', x: t3.x + 0.3, y: t3.y }); idle.state = 'idle'; check(!R.maulable(idle), 'an idle enemy does not');
      // the player's own hand never does it
      setup(); const t4 = R.homes()[7]; t4.hp = 1; const dead0 = t4.dead; try { if (typeof assaultCivilian === 'function') assaultCivilian(t4); } catch (e) { /* nonlethal in the engine */ }
      check(!(R.deadMask() & 128) && t4.dead === dead0, 'assault is not a permanent death');
      // the neighbour speaks the next day, once
      setup(); R.slay(8, 'enemy'); const d0 = G.day; Object.assign(Engine.cam, { x: 12.5, y: 30.5 });
      R.tickLoss(0.2); check(!(G.flags.p15r_dsay & 256), 'not the same day');
      G.day = d0 + 1; for (let i = 0; i < 3; i++) R.tickLoss(0.2); check((G.flags.p15r_dsay & 256) === 256, 'the next day, a neighbour has a line');
      const sd = G.flags.p15r_dsay; for (let i = 0; i < 5; i++) R.tickLoss(0.2); check(G.flags.p15r_dsay === sd, 'once');
      // Greening: nothing new, and the dead are still dead
      setup(); R.slay(9, 'enemy'); G.flags.greening = true; nextDay(); check(!R.slay(10, 'enemy'), 'no new deaths after the Greening'); R.applyDead(); check(R.homes()[9].dead, 'the dead stay dead'); delete G.flags.greening;
      // loss off: identical game
      setup(); R.setSwitch('loss', false); check(!R.slay(0, 'enemy') && !G.flags.p15r_dead, 'loss off: no one dies'); R.setSwitch('loss', true);
      // not in oakhaven: no
      setup(); loadMap('tavern', { x: 5.5, y: 5.5, dir: 0 }); G.state = 'play'; check(!R.slay(0, 'enemy'), 'only Oakhaven\'s own'); loadMap('oakhaven', { x: 39.5, y: 12.5, dir: 0 });
      return out;
    });
    assert.ok(D);

    // ------------------------------------------------------------------ part E: off = identical game, flags namespace, options panel
    const E = await page.evaluate(() => {
      const check = window.check, R = ROADS15;
      reset(); G.state = 'play';
      R.setSwitch('events', false); R.setSwitch('fire', false); R.setSwitch('loss', false);
      const keys0 = JSON.stringify(Object.keys(G.flags).sort());
      loadMap('clearing', { x: 20.5, y: 32.5, dir: 0 }); const d = travelDestinations('reach').find(x => x.map === 'oakhaven' && x.spawn);
      const sv = Math.random; Math.random = () => 0.99; travelGo(d); Math.random = sv; G.state = 'play';
      passHours(200); R.syncAll(); R.slay(0, 'enemy'); R.ignite('east', 'flask');
      check(JSON.stringify(Object.keys(G.flags).sort()) === keys0 || Object.keys(G.flags).every(k => keys0.indexOf(k) >= 0 || k.indexOf('p15r_') !== 0), 'all three off: no p15r flags are written');
      check(Object.keys(G.flags).filter(k => k.indexOf('p15r_') === 0).length === 0, 'none at all');
      check(!R.pending, 'and no event waits');
      for (const k of ['events', 'fire', 'loss']) R.setSwitch(k, true);
      // every flag we write is ours
      reset(); G.state = 'play'; const before = new Set(Object.keys(G.flags)); loadMap('oakhaven', { x: 39.5, y: 12.5, dir: 0 });
      R.ignite('east', 'story'); R.slay(0, 'enemy'); G.give('honey', 1); R.resolve({ type: 'refugees', seed: 1 }, 0, {}); R.noteStolen('honey');
      const added = Object.keys(G.flags).filter(k => !before.has(k));
      check(added.length > 0, 'flags added: ' + added.join());
      check(added.filter(k => k.indexOf('p15r_') === 0).length >= 4, 'ours are namespaced: ' + added.filter(k => k.indexOf('p15r_') === 0).join());
      for (const k of added) { const v = G.flags[k]; if (k.indexOf('p15r_') === 0) check(typeof v === 'number' && Number.isInteger(v), 'flag ' + k + ' is a small integer'); }
      const bytes = JSON.stringify(Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.indexOf('p15r_') === 0))).length;
      check(bytes < 400, 'our whole save footprint is small: ' + bytes + ' bytes');
      return { bytes };
    });
    assert.ok(E.bytes < 400);

    // options panel: three rows, keyboard-reachable buttons, they toggle and persist
    await page.evaluate(() => { reset(); G.state = 'play'; renderAccessibilityMenu(); });
    const opt = await page.evaluate(() => ({ head: !!document.getElementById('p15r-head'), rows: ['events', 'fire', 'loss'].map(k => { const b = document.getElementById('p15r-opt-' + k); return b && [b.textContent, b.getAttribute('aria-pressed'), b.tagName, !!b.getAttribute('aria-label')]; }) }));
    assert.equal(opt.head, true);
    assert.deepEqual(opt.rows, [['On', 'true', 'BUTTON', true], ['On', 'true', 'BUTTON', true], ['On', 'true', 'BUTTON', true]]);
    await page.locator('#p15r-opt-fire').click();
    assert.deepEqual(await page.evaluate(() => [ROADS15.set.fire, document.getElementById('p15r-opt-fire').textContent, JSON.parse(localStorage.getItem('octave.roads15.v1')).fire]), [false, 'Off', false], 'a click flips the switch and remembers it');
    await page.locator('#p15r-opt-fire').click();
    assert.equal(await page.evaluate(() => ROADS15.set.fire), true);
    await page.evaluate(() => { closeModal(); G.state = 'play'; });

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('roads15 ok');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
