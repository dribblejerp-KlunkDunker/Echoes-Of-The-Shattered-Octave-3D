// PREVIEW_URL=http://127.0.0.1:3842 PLAYWRIGHT_MODULE=/path/to/playwright node test/motion10.test.js
// Phase 10 MOTION: animated travel route, swinging guard lanterns, parry sparks.
// Optional SHOTS=<dir> writes review pictures (kept out of the repo).
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'warning' && /motion10/.test(m.text())) errors.push(m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof MOTION10 !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Motion Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);

    // ------------------------------------------------------------------ 1. travel (real animation frames)
    const travel = await page.evaluate(async () => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const waitFor = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await sleep(20); } return true; };
      const lcg = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
      window.mBase = JSON.parse(JSON.stringify(snapshotGame()));
      const realMsg = msg; window.__msgs = []; msg = function () { window.__msgs.push(String(arguments[0])); return realMsg.apply(this, arguments); };
      const out = { trips: [] };
      check(GFX.FX.includes('travelAnim') && GFX.FX.includes('guardLanterns') && GFX.FX.includes('parrySparks'), 'the three switches are GFX.FX effects');
      check(GFX.travelAnim && GFX.guardLanterns && GFX.parrySparks && MOTION10.on.travel() && MOTION10.on.lanterns() && MOTION10.on.parry(), 'all three default on');
      PRESETS.apply('original');
      check(!MOTION10.on.travel() && !MOTION10.on.lanterns() && !MOTION10.on.parry(), 'the Original preset leaves all three off');
      PRESETS.apply('medium');
      check(MOTION10.on.travel() && MOTION10.on.lanterns() && MOTION10.on.parry(), 'Medium turns them back on');

      const reset = (spec) => {
        restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; Weather.hold('clear');
        G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {}; G.fadeT = 0; MOTION10.setSwitch('travel', true);
        if (window.ROADS15 && ROADS15.setSwitch) ROADS15.setSwitch('events', false);   // Phase 15 roadside events stop a trip on purpose; this suite checks the route animation's outcome
        if (spec.part >= 3) { G.flags.part3 = true; if (spec.part >= 4) G.flags.part4 = true; loadMap(spec.from, { x: G.maps[spec.from].spawn.x, y: G.maps[spec.from].spawn.y, dir: 0 }); G.state = 'play'; }
        for (const id of ['clearing', 'oakhaven', 'whispergrove', 'deepwoods']) if (G.maps[id]) G.maps[id].visited.fill(1);
        for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; }
        G.tod = spec.tod; G.player.fat = G.player.fatMax; G.player.hp = G.player.hpMax; G.noise = 2;
        if (spec.mounted) G.player.horseUntil = horseClock() + 24; else G.player.horseUntil = 0;
        if (spec.part >= 3 && spec.party) G.party = { id: spec.party, order: 'follow', hp: 30, hpById: {}, cd: 0, said: {}, downed: {}, map: G.mapId, x: Engine.cam.x, y: Engine.cam.y, trail: [], hurtT: 0 };
        window.__msgs.length = 0;
      };
      const outcome = (rng) => ({
        mapId: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir].map(v => +v.toFixed(4)), day: G.day, tod: +G.tod.toFixed(6), hp: G.player.hp, fat: G.player.fat, noise: G.noise,
        foes: G.ents.filter(e => e.kind === 'enemy' && e.state === 'chase' && !e.dead && !e.hidden).map(e => [e.type, +e.x.toFixed(3), +e.y.toFixed(3), e.alertT]),
        next: rng(),
      });
      const specs = [
        { name: 'Hedge gate, cautious, dusk', from: 'oakhaven', part: 1, tod: 0.74, pace: 'cautious', pick: d => d.map === 'oakhaven' && d.spawn, rng: () => lcg(7) },
        { name: 'Outside the Hedge, reckless, forced ambush', from: 'oakhaven', part: 1, tod: 0.9, pace: 'reckless', pick: d => d.map === 'clearing' && d.spawn, rng: () => () => 0.001 },
        { name: 'Outside the Hedge, cautious, no ambush', from: 'oakhaven', part: 1, tod: 0.3, pace: 'cautious', pick: d => d.map === 'clearing' && d.spawn, rng: () => () => 0.999 },
        { name: 'Sable\'s camp, mounted, reckless, seeded', from: 'oakhaven', part: 1, tod: 0.6, pace: 'reckless', mounted: true, pick: d => /Sable/.test(d.name), rng: () => lcg(12345) },
        { name: 'Whisper-Grove, part 3, with Lyra, seeded', from: 'whispergrove', part: 3, tod: 0.2, pace: 'reckless', party: 'lyra', pick: d => d.map === 'whispergrove' && !d.spawn, rng: () => lcg(99) },
        { name: 'Deep Woods camp, part 4, crossing midnight, forced ambush', from: 'deepwoods', part: 4, tod: 0.97, pace: 'cautious', pick: d => d.map === 'deepwoods' && /wreck/.test(d.name), rng: () => () => 0.002 },
        { name: 'Deep Woods camp, part 4, seeded', from: 'deepwoods', part: 4, tod: 0.55, pace: 'cautious', pick: d => d.map === 'deepwoods' && d.spawn, rng: () => lcg(31337) },
      ];
      // each trip three ways: the original travelGo alone; the animated path; the animated path with the switch off
      const run = async (spec, mode) => {
        reset(spec);
        travelOpen(); await waitFor(() => { const R = TRAVEL_REGIONS[TRAVEL.region]; const im = TRAVEL.img[R.img]; return im && im.complete && im.naturalWidth; }, 3000);
        travelRender();
        TRAVEL.pace = spec.pace;
        const d = TRAVEL.dests.find(x => x.state === 'ok' && spec.pick(x));
        if (!d) throw new Error('no destination for ' + spec.name + ' among ' + TRAVEL.dests.map(x => x.name + ':' + x.state).join('|'));
        travelSelect(d);
        const rng = spec.rng(); Math.random = rng;
        const t0 = performance.now();
        if (mode === 'plain') travelGo(d);
        else { if (mode === 'off') MOTION10.setSwitch('travel', false); document.querySelector('#tv-go').click(); }
        const o = outcome(rng);
        const animating = !!MOTION10.travel.state.anim && G.openPanel === 'travelanim';
        let ms = 0, last = null;
        if (animating) { check(await waitFor(() => !MOTION10.travel.state.anim, 4500), spec.name + ': the picture ends'); ms = performance.now() - t0; last = JSON.parse(JSON.stringify(MOTION10.travel.state.last)); }
        const after = { state: G.state, panel: G.openPanel, mapId: G.mapId, msgs: window.__msgs.slice(), day: G.day, tod: +G.tod.toFixed(6) };
        MOTION10.setSwitch('travel', true);
        return { o, animating, ms, last, after };
      };
      for (const spec of specs) {
        const A = await run(spec, 'plain'), B = await run(spec, 'anim'), C = await run(spec, 'off');
        check(!A.animating && !C.animating && B.animating, spec.name + ': only the animated path shows a picture');
        check(JSON.stringify(A.o) === JSON.stringify(B.o), spec.name + ': animated outcome identical to travelGo alone\n' + JSON.stringify(A.o) + '\n' + JSON.stringify(B.o));
        check(JSON.stringify(A.o) === JSON.stringify(C.o), spec.name + ': switch off identical');
        check(JSON.stringify(A.after.msgs) === JSON.stringify(B.after.msgs), spec.name + ': the same messages arrive, after the picture\n' + JSON.stringify(A.after.msgs) + '\n' + JSON.stringify(B.after.msgs));
        check(B.after.state === 'play' && !B.after.panel && B.after.mapId === A.after.mapId && B.after.day === A.after.day && Math.abs(B.after.tod - A.after.tod) < 0.01, spec.name + ': back in play after the picture ' + JSON.stringify([A.after.state, A.after.panel, A.after.mapId, A.after.day, A.after.tod, B.after.state, B.after.panel, B.after.mapId, B.after.day, B.after.tod]));
        check(B.ms <= 3000 && B.last.total <= 2.9, spec.name + ': the picture takes at most 3 s: ' + Math.round(B.ms));
        const ambushed = A.o.foes.length > 0;
        check(B.last.ambush === ambushed, spec.name + ': the figure halts exactly when an ambush was spawned');
        if (ambushed) check(B.last.stopU < 1 && B.last.stopU > 0.7, spec.name + ': the halt is short of the mark');
        out.trips.push({ n: spec.name, mins: B.last.mins, ambush: ambushed, ms: Math.round(B.ms), walk: +B.last.walk.toFixed(2) });
      }
      check(out.trips.some(t => t.ambush) && out.trips.some(t => !t.ambush), 'the trips cover both an ambush and a quiet road');
      out.maxMs = Math.max(...out.trips.map(t => t.ms));
      return out;
    });
    console.log('PASS travel outcome identical animated / switch off / travelGo alone over', travel.trips.length, 'trips; picture <= 3 s', JSON.stringify(travel));

    // ------------------------------------------------------------------ 2. skip, reduced motion, hostile data, layout
    const skip = await page.evaluate(async () => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const waitFor = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await sleep(15); } return true; };
      const out = {};
      const begin = async (pace, reduce) => {
        restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; Weather.hold('clear'); G.fadeT = 0; UPG.tutorial = false; MOTION10.setSwitch('travel', true);
        G.maps.clearing.visited.fill(1); G.tod = 0.5; GFX.reduceMotion = !!reduce; GFX.noFlash = false;
        travelOpen(); await waitFor(() => { const im = TRAVEL.img['img/map_reach.jpg']; return im && im.complete && im.naturalWidth; }, 3000);
        travelRender(); TRAVEL.pace = pace || 'cautious';
        const d = TRAVEL.dests.find(x => x.state === 'ok' && x.map === 'clearing' && x.spawn);
        travelSelect(d); Math.random = () => 0.999;
        const o0 = G.tod; document.querySelector('#tv-go').click();
        check(MOTION10.travel.state.anim && G.openPanel === 'travelanim' && G.state === 'panel', 'the picture opens');
        return { d, hours: (G.tod - o0 + 1) % 1 * 24 };
      };
      const ended = async (label, trigger, wantSkipped) => {
        const b = await begin(); await sleep(260); const t0 = performance.now(); await trigger();
        check(await waitFor(() => !MOTION10.travel.state.anim, 1500), label + ': skip ends the picture');
        const ms = performance.now() - t0, last = MOTION10.travel.state.last;
        check(last.skipped === wantSkipped && ms < 1000, label + ': skipped quickly (' + Math.round(ms) + ' ms)');
        check(G.state === 'play' && !G.openPanel && G.mapId === 'clearing', label + ': in play at the destination');
        return { ms: Math.round(ms), hours: b.hours };
      };
      out.click = await ended('click', () => document.querySelector('#modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })), true);
      out.touch = await ended('tap', () => document.querySelector('#tvmap').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })), true);
      out.key = await ended('key', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })), true);
      out.escape = await ended('escape', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true);
      // a key held down from the "Begin" press must not skip: repeats and modifiers are ignored, and so is anything in the first moments
      { const b = await begin(); MOTION10.travel.state.anim.t0 = performance.now(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', bubbles: true })); document.querySelector('#modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); check(!!MOTION10.travel.state.anim, 'a press in the first 150 ms does not skip ' + JSON.stringify(MOTION10.travel.state.last)); MOTION10.travel.state.anim.finish(false); }
      // the controller: A skips; an A already held when the picture opened does not
      { const pads = navigator.getGamepads; const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [gp];
        try {
          gp.buttons[0].pressed = true;   // A is down as the journey begins (it just pressed "Begin")
          const b = await begin(); await sleep(260); controlsTick(); check(!!MOTION10.travel.state.anim, 'a held A does not skip');
          gp.buttons[0].pressed = false; controlsTick(); await sleep(30); gp.buttons[0].pressed = true; controlsTick();
          check(!MOTION10.travel.state.anim && MOTION10.travel.state.last.skipped && G.state === 'play', 'controller A skips to arrival');
          gp.buttons[0].pressed = false;
        } finally { navigator.getGamepads = pads; } }
      // skipping changes nothing about the outcome
      { restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; G.maps.clearing.visited.fill(1); G.tod = 0.5; travelOpen(); travelRender(); TRAVEL.pace = 'cautious'; const d = TRAVEL.dests.find(x => x.map === 'clearing' && x.spawn); travelSelect(d); Math.random = () => 0.999; travelGo(d); out.skipDay = G.day; out.skipTod = G.tod; }
      { const b = await begin(); await sleep(200); document.querySelector('#modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); check(G.day === out.skipDay && Math.abs(b.hours - (out.skipTod - 0.5) * 24) < 1e-6, 'a skipped journey ends at the same time as travelGo alone'); }

      // reduced motion: the finished trail at once, held briefly, no walking
      { const b = await begin('cautious', true); const A = MOTION10.travel.state.anim, t0 = performance.now();
        const fr = MOTION10.travel.frameAt(A.plan, 0, true); check(fr.s === A.plan.stopU && !fr.walking && fr.clock.tod > 0, 'reduced motion: frame zero is the finished trail');
        check(await waitFor(() => !MOTION10.travel.state.anim, 1500), 'reduced motion: the picture ends'); out.reducedMs = Math.round(performance.now() - t0); check(out.reducedMs <= 1500 && MOTION10.travel.state.last.reduced, 'reduced motion: held under a second: ' + out.reducedMs);
        GFX.reduceMotion = false; }

      // an animated frame really moves: the figure at the start, the middle and the end are in different places, and the dotted trail only grows
      { const b = await begin(); const A = MOTION10.travel.state.anim, p = A.plan;
        const at = u => { const fr = MOTION10.travel.frameAt(p, u * p.walk, false); return MOTION10.travel.along(p.route, fr.s); };
        const a0 = at(0), a1 = at(0.5), a2 = at(1);
        check(Math.hypot(a0.x - a1.x, a0.y - a1.y) > 4 && Math.hypot(a1.x - a2.x, a1.y - a2.y) > 4, 'the figure advances along the route');
        check(Math.abs(a0.x - p.from[0] * p.W) < 1.5 && Math.abs(a2.x - p.to[0] * p.W) < 1.5, 'the route runs from where you were to the mark');
        const c0 = MOTION10.travel.frameAt(p, 0, false).clock, c1 = MOTION10.travel.frameAt(p, p.walk, false).clock;
        check((c1.day * 24 + c1.tod * 24) - (c0.day * 24 + c0.tod * 24) > 0.99 * p.hours - 1e-9, 'the clock runs through the hours the game spent: ' + p.hours.toFixed(2));
        // pixels: the canvas shows the painting, and the figure's red cloak is on it at the figure
        const cv = document.querySelector('#tvmap'), ctx = cv.getContext('2d'); await sleep(120);
        const fx = Math.round(MOTION10.travel.along(p.route, MOTION10.travel.frameAt(p, (performance.now() - A.t0) / 1000, false).s).x), px = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let red = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 150 && px[i + 1] < 90 && px[i + 2] < 70) red++;
        check(red > 20, 'a figure is painted on the map'); check(cv.width === p.W && cv.height === p.H, 'the canvas is the painting\'s size');
        MOTION10.travel.state.anim.finish(false); }

      // hostile data: the destination name goes in as text; a hostile clock cannot put NaN on the page
      { restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; G.maps.clearing.visited.fill(1); travelOpen(); travelRender(); TRAVEL.pace = 'cautious';
        const d0 = TRAVEL.dests.find(x => x.map === 'clearing' && x.spawn), d = Object.assign({}, d0, { name: '<img src=x onerror="window.__pwned=1"><b>Hedge</b>' });
        TRAVEL.sel = d.name; Math.random = () => 0.999; MOTION10.travel.go(d); await sleep(60);
        const title = document.querySelector('#tva-title');
        check(title && title.textContent.includes('<img') && !document.querySelector('#modal-panel img') && !document.querySelector('#tva-title b') && !window.__pwned, 'a hostile destination name is text, not markup');
        MOTION10.travel.state.anim && MOTION10.travel.state.anim.finish(false);
        const plan = MOTION10.travel.plan(d0, { region: 'reach', here: null, day: NaN, tod: NaN, mins: 30, pace: 'cautious', mounted: false, companion: false }, { day: Infinity, tod: NaN }, null);
        const c = MOTION10.travel.frameAt(plan, 0.5, false).clock; check(Number.isFinite(c.tod) && Number.isFinite(c.day), 'a hostile clock is replaced by a plain one'); }
      return out;
    });
    console.log('PASS skip (click, tap, key, Escape, controller A), held-A guard, reduced motion, route/clock/painting, hostile data', JSON.stringify(skip));

    // the picture at 640x400 and 1280x800
    await page.evaluate(async () => {
      restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; G.maps.clearing.visited.fill(1); GFX.reduceMotion = true; travelOpen();
      await new Promise(r => setTimeout(r, 400)); travelRender(); TRAVEL.pace = 'cautious';
      const d = TRAVEL.dests.find(x => x.map === 'clearing' && x.spawn); travelSelect(d); Math.random = () => 0.999; document.querySelector('#tv-go').click();
      MOTION10.travel.state.anim.t0 += 1e6;   // keep the picture open for the layout checks
    });
    const fits = async (label) => assert.equal(await page.evaluate(() => {
      const p = document.querySelector('#modal-panel'), cv = document.querySelector('#tvmap'), sk = document.querySelector('#tva-skip');
      const inside = el => { const r = el.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
      return p.scrollWidth <= p.clientWidth + 1 && inside(cv) && inside(sk);
    }), true, label + ': the travel picture fits');
    await fits('1280x800');
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'travel-picture-1280.png') }); }
    await page.setViewportSize({ width: 640, height: 400 });
    await fits('640x400');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'travel-picture-640x400.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { const A = MOTION10.travel.state.anim; if (A) { A.t0 -= 2e6; A.finish(false); } GFX.reduceMotion = false; });
    console.log('PASS travel picture fits at 1280x800 and 640x400');

    // ------------------------------------------------------------------ 3. lanterns, parry sparks, options, perf (game loop stopped: frames are stepped by hand)
    await page.evaluate(() => { G.state = 'panel'; window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    const L = await page.evaluate(async (wantShots) => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const out = {}, shots = {};
      const lcg = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
      const reset = () => { restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; Weather.hold('clear'); G.fadeT = 0; UPG.tutorial = false; G.keys = {}; MOTION10.stepBy(1 / 60); GFX.reduceMotion = false; GFX.noFlash = false; for (const s of ['travel', 'lanterns', 'parry']) MOTION10.setSwitch(s, true); G.player.hp = G.player.hpMax = 9999; };
      const LAN = MOTION10.lanterns.state, SPK = MOTION10.parry.state;
      const lights = []; Engine.addPostHook(F => { lights.length = 0; for (const l of F.ptLights) lights.push({ x: l.x, y: l.y, cr: l.cr }); }, 0);
      const frame = () => { Engine.render(G.ents, G.tod); };
      const guard = (type, x, y, extra) => { const e = hydrate(Object.assign({ kind: 'enemy', type, x, y }, extra || {})); e.state = 'idle'; e._tgSeen = true; G.ents.push(e); return e; };
      const night = () => { G.tod = 0.92; };
      const mine = () => LAN.out.slice();
      const clear = () => { for (const e of G.ents) if (e.kind === 'enemy' || (e.kind === 'npc' && (e.lawGuard || e.nightWatch))) e.hidden = true; LAN.drops.length = 0; };

      // ---- carriers, darkness, the swing
      reset(); loadMap('oakhaven', { x: 50, y: 20.5, dir: 0 }); G.fadeT = 0; clear(); night(); Weather.hold('clear');
      const con = G.ents.find(e => e.lawGuard && e.name === 'Oakhaven watch constable'); con.hidden = false; con.wander = false; con.x = 54; con.y = 20.5; con.facing = Math.PI;
      check(MOTION10.lanterns.isCarrier(con), 'the watch constable carries a lantern');
      check(!MOTION10.lanterns.isCarrier(G.ents.find(e => e.kind === 'npc' && !e.lawGuard && !e.nightWatch)) && !MOTION10.lanterns.isCarrier(hydrate({ kind: 'enemy', type: 'hound', x: 1, y: 1 })), 'ordinary townsfolk and hounds do not');
      frame(); frame();
      check(mine().length === 1, 'a patrolling constable at night gets exactly one light, got ' + mine().length);
      check(lights.some(l => Math.hypot(l.x - mine()[0].x, l.y - mine()[0].y) < 1e-6), 'the engine received that light in its coloured-light list');
      // walk him down the square and watch the light swing against his heading
      const offs = [], pos = [];
      for (let i = 0; i < 90; i++) { con.x = 54 + i * (1.2 / 60) * 0.999 * 0 + 0; con.y = 20.5; con.x += 0; }
      con.x = 56; con.y = 14.5; let h = 0;
      for (let i = 0; i < 150; i++) {
        con.y += 1.25 / 60; frame(); const p = mine()[0]; h = Math.PI / 2;
        if (i > 40) { offs.push((p.x - con.x) * Math.cos(h) + (p.y - con.y) * Math.sin(h)); pos.push([p.x - con.x, p.y - con.y]); }
      }
      const amp = (Math.max(...offs) - Math.min(...offs)) / 2;
      check(amp > 0.14 && amp < 0.5, 'the light swings fore and aft of the walker (amplitude ' + amp.toFixed(3) + ')');
      let flips = 0; for (let i = 1; i < offs.length; i++) if (Math.sign(offs[i] - offs[i - 1]) !== Math.sign(offs[Math.max(0, i - 2)] - offs[Math.max(0, i - 3)])) flips++;
      check(flips >= 4, 'it swings back and forth with the stride (' + flips + ' turns)');
      check(Math.hypot(mine()[0].x - con.x, mine()[0].y - con.y) < 0.5, 'and it stays with its carrier');
      out.swing = +amp.toFixed(3);
      // reduced motion: the lantern hangs steady
      GFX.reduceMotion = true; const offs2 = []; for (let i = 0; i < 80; i++) { con.y += 1.25 / 60; frame(); const p = mine()[0]; offs2.push(p.y - con.y); } GFX.reduceMotion = false;
      check(Math.max(...offs2) - Math.min(...offs2) < 0.06, 'reduced motion: no swing (' + (Math.max(...offs2) - Math.min(...offs2)).toFixed(3) + ')');
      // pixels: the lantern is drawn at the hand, and the light moves across the ground as it swings
      con.x = 53; con.y = 20.5; con.facing = Math.PI; Engine.cam.x = 49; Engine.cam.y = 20.5; Engine.cam.dir = 0; for (let i = 0; i < 20; i++) frame();
      const snap = () => { frame(); const c = Engine.ctx.canvas; return Engine.ctx.getImageData(0, 0, c.width, Math.floor(c.height * 0.75)).data.slice(); };
      const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return n; };
      const withL = snap(); MOTION10.setSwitch('lanterns', false); const without = snap(); MOTION10.setSwitch('lanterns', true);
      out.lanternPixels = diff(withL, without); check(out.lanternPixels > 150, 'the lantern and its light change the picture (' + out.lanternPixels + ' pixels)');
      let moved = 0; for (let i = 0; i < 40; i++) { const a = snap(); for (let k = 0; k < 7; k++) frame(); const b = snap(); moved = Math.max(moved, diff(a, b)); }
      out.moving = moved; check(moved > 60, 'the lit patch moves as the lantern swings (' + moved + ' pixels between frames)');
      if (wantShots) {
        const cv = document.createElement('canvas'), W = 220, H = 120, crops = []; const src = Engine.ctx.canvas, S = src.width / 320;
        con.facing = Math.PI / 2; con.x = 52.5; con.y = 17.5; Engine.cam.x = 52.5; Engine.cam.y = 21.5; Engine.cam.dir = -Math.PI / 2;
        for (let i = 0; i < 12; i++) { con.y += 0.0; for (let k = 0; k < 6; k++) { con.y += 1.2 / 60 * 0.0; frame(); } const c2 = document.createElement('canvas'); c2.width = W * S; c2.height = H * S; frame(); c2.getContext('2d').drawImage(src, 50 * S, 15 * S, W * S, H * S, 0, 0, W * S, H * S); crops.push(c2); }
        shots.walkStrip = 1;
      }

      // ---- the cap, the cull, nearest first
      reset(); loadMap('oakhaven', { x: 50, y: 20.5, dir: 0 }); G.fadeT = 0; clear(); night();
      const eight = []; for (let i = 0; i < 8; i++) eight.push(guard('outrider', 52 + (i % 4) * 1.4, 17 + Math.floor(i / 4) * 2.2));
      const far = guard('outrider', 50, 20.5 + 22), farNpc = G.ents.filter(e => e.lawGuard);
      for (const e of eight) e.hidden = false;
      frame(); frame();
      check(mine().length === 4 && LAN.stats.maxActive <= 4, 'eight carriers in view: at most four lights, got ' + mine().length);
      const ptWith = lights.length; MOTION10.setSwitch('lanterns', false); frame(); const ptWithout = lights.length; MOTION10.setSwitch('lanterns', true); frame();
      check(ptWith - ptWithout === 4, 'the engine\'s light list grows by exactly four: ' + (ptWith - ptWithout));
      const near = eight.slice().sort((a, b) => Math.hypot(a.x - Engine.cam.x, a.y - Engine.cam.y) - Math.hypot(b.x - Engine.cam.x, b.y - Engine.cam.y)).slice(0, 4);
      const chosen = mine(); check(near.every(e => chosen.some(p => Math.hypot(p.x - e.x, p.y - e.y) < 0.6)), 'the four nearest carriers got the lights');
      for (const e of eight) e.hidden = true; far.hidden = false; frame(); frame();
      check(mine().length === 0, 'a carrier 22 cells away (past the cull) gets no light');
      out.cap = 4;

      // ---- dies with the carrier; stunned drops it; it relights
      clear(); night(); const g1 = guard('outrider', 52, 19); g1.hidden = false; for (let i = 0; i < 5; i++) frame();
      check(mine().length === 1 && LAN.drops.length === 0, 'one lit outrider');
      g1.stun = 2.0; frame();
      check(mine().length === 1 && LAN.drops.length === 1, 'stunned: the lantern is on the floor, still guttering');
      for (let i = 0; i < 130; i++) { G.time += 1 / 60; frame(); }
      check(mine().length === 0, 'the dropped lantern has guttered out (' + mine().length + ' lights)');
      g1.stun = 0; for (let i = 0; i < 120; i++) { G.time += 1 / 60; frame(); }
      check(mine().length === 1 && LAN.drops.length === 0, 'stun over: he picks it up and it burns again');
      const lightsBefore = mine().length; killEnemy(g1, false); frame();
      check(mine().length === 1 && LAN.drops.length === 1, 'killed: his hand light is gone, a lantern lies where he fell');
      for (let i = 0; i < 130; i++) frame(); LAN.drops.forEach(d => { d.age = 5; }); frame(); frame();
      check(mine().length === 0, 'and it goes out: no lights after the guttering');
      out.drops = LAN.stats.drops;

      // ---- day, outdoors noon, lit interiors off; dark interiors on
      clear(); const g2 = guard('outrider', 52, 19); g2.hidden = false; G.tod = 0.5; frame(); frame();
      check(mine().length === 0 && MOTION10.lanterns.darkness() === 0, 'noon out of doors: no lanterns');
      G.tod = 0.2; frame(); check(mine().length === 1, 'before dawn: lit'); G.tod = 0.33; frame(); frame(); check(mine().length === 0, 'full morning: out');
      G.tod = 0.76; frame(); frame(); check(mine().length === 1, 'dusk: lit again');
      loadMap('tavern', { x: 8.5, y: 10.5, dir: 0 }); G.fadeT = 0; G.tod = 0.92; frame(); frame();
      const lawT = G.ents.filter(e => e.lawGuard && !e.hidden); check(lawT.length > 0, 'the tavern has its constable');
      check(mine().length === 0 && MOTION10.lanterns.darkness() === 0, 'a lit interior (the tavern, ambient ' + G.map.ambient + '): no lanterns');
      loadMap('quarry', { x: G.maps.quarry.spawn.x, y: G.maps.quarry.spawn.y, dir: 0 }); G.fadeT = 0; G.tod = 0.5;
      const q = G.ents.filter(e => e.kind === 'enemy' && CARRIER_OK(e)); function CARRIER_OK(e) { return MOTION10.lanterns.isCarrier(e) && !e.dead; }
      check(q.length > 0, 'the quarry has legionnaires'); for (const e of q) { e.hidden = false; e.x = Engine.cam.x + 2.5; e.y = Engine.cam.y; }
      frame(); frame(); check(MOTION10.lanterns.darkness() === 1 && mine().length >= 1, 'a dark interior at noon: lanterns on (' + mine().length + ')');
      GFX.darkInteriors = false; frame(); check(mine().length === 0, 'with dark interiors off the rooms are bright: no lanterns'); GFX.darkInteriors = true;
      PRESETS.apply('original'); frame(); check(mine().length === 0, 'Original preset: none'); PRESETS.apply('medium');

      // ---- AI and frames: identical with and without lanterns (and nothing else is drawn from Math.random)
      const fd0 = (a, b) => { const x = a.split('|'), y = b.split('|'); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i + ': ' + x[i] + ' / ' + y[i]; return -1; };
      const trace = (on) => {
        const pn = performance.now.bind(performance), dn = Date.now; let fake = 5e5; performance.now = () => fake; Date.now = () => 1.7e12 + fake;   // a frozen clock: the world's own real-time reads cannot differ between runs
        Math.random = lcg(4242); reset(); loadMap('oakhaven', { x: 24.5, y: 24.5, dir: 0 }); G.fadeT = 0; G.tod = 0.9; G.player.hp = G.player.hpMax = 9999;
        MOTION10.setSwitch('lanterns', on); G.time = 1000; Math.random = lcg(4242); MOTION10.stepBy(null);
        for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
        const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'idle'; e._tgSeen = true; G.ents.push(e); return e; };
        const list = [mk('proctor', 27.5, 22.5), mk('legionnaire', 22.5, 26.5), mk('outrider', 26.5, 27.5)];   // (a hound is left out: its idle step reads something outside the game's seeded state)
        const tr = [];
        for (let i = 0; i < 360; i++) {
          if (i === 120) { G.noise = 6; Engine.cam.x = 24.5; Engine.cam.y = 24.0; }
          fake += 1000 / 60; update(1 / 60); frame();
          if (i % 6 === 0) { for (const e of G.ents) if (e.kind === 'enemy') tr.push([e.id || e.type, e.x.toFixed(4), e.y.toFixed(4), e.state, e.cool, e.hp, e.alertT, e.stun, e.hidden].join(',')); tr.push(G.noise.toFixed(3), Engine.cam.x.toFixed(4)); }
        }
        performance.now = pn; Date.now = dn; MOTION10.setSwitch('lanterns', true); return tr.join('|');
      };
      trace(false);
      // the world has a little unseeded noise of its own (a hound's idle step), so compare in pairs: a real effect of the lanterns would differ every time
      const pairs = []; for (let i = 0; i < 4; i++) { const a = trace(false), b = trace(true); pairs.push([a, b]); }
      const same = pairs.filter(p => p[0] === p[1]).length;
      check(same === 4, 'AI traces identical with lanterns on and off (' + same + ' of 4 runs): ' + fd0(pairs[0][0], pairs[0][1]));
      const tOff = pairs[0][0];
      out.traceLen = tOff.length;

      // ---- parry sparks: only on a turned blow
      reset(); loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.fadeT = 0; G.tod = 0.5; for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true; clear();
      const foe = (type) => { const e = hydrate({ kind: 'enemy', type: type || 'proctor', x: 12.5, y: 10.7 }); e.state = 'chase'; e.cool = 0; e._tgSeen = true; G.ents.push(e); return e; };
      const e1 = foe(); const rnd0 = Math.random;
      const attempt = (r, guard, late) => {
        e1.cool = 0; e1.x = 12.5; e1.y = 10.7; e1.state = 'chase'; SPK.list.length = 0;
        UPG.parryCool = 0; UPG.blocking = false; UPG.parryWindow = 0;
        if (guard) { triggerBlock(); if (late) { UPG.parryWindow = 0; UPG.parryCool = 0.2; } }
        const hp0 = G.player.hp, f0 = SPK.stats.fired; Math.random = () => r; enemyUpdate(e1, 1 / 60); Math.random = rnd0;
        return { hurt: hp0 - G.player.hp, fired: SPK.stats.fired - f0, kind: SPK.list.length ? SPK.list[SPK.list.length - 1].kind : null };
      };
      const slip = attempt(0, true), hit = attempt(0.999, true), noGuardSlip = attempt(0, false), noGuardHit = attempt(0.999, false), block = attempt(0, true, true);
      check(slip.fired === 1 && slip.kind === 'parry' && slip.hurt === 0, 'a blow slipped inside the parry window sparks as a parry');
      check(block.fired === 1 && block.kind === 'block' && block.hurt === 0, 'a blow slipped after the window, guard still up, sparks as a block');
      // with js/guard.js a blow that would land inside the parry window is turned aside instead: a parry, no damage
      check(hit.hurt === 0 && hit.fired === 1 && hit.kind === 'parry', 'a blow that would land inside the window is parried (guard.js)');
      check(noGuardHit.fired === 0 && noGuardHit.hurt > 0, 'a blow that lands sparks nothing');
      check(noGuardSlip.fired === 0 && noGuardHit.fired === 0, 'no guard up: no sparks, slipped or not');
      // an ordinary hit by the player on a foe, and a foe struck while idle, do not spark either
      const w0 = G.player.weapon; const f0 = SPK.stats.fired; e1.state = 'chase'; e1.hp = e1.hpMax = 500; e1.x = 12.5; e1.y = 10.9; G.attack.t = 0; Math.random = () => 0.01; attack('swing'); Math.random = rnd0; G.attack.t = 0;
      check(SPK.stats.fired === f0, 'the player\'s own hit, landed or not, never makes parry sparks');
      // ranged foes' shots and far foes are not melee blows
      const bow = foe('outrider'); bow.x = 12.5; bow.y = 9.0; const fb = SPK.stats.fired; UPG.parryCool = 0; UPG.blocking = false; triggerBlock(); bow.cool = 0; Math.random = () => 0; enemyUpdate(bow, 1 / 60); Math.random = rnd0;
      check(SPK.stats.fired === fb, 'a crossbow shot from range is not a clash');
      // the guard timers tick down so the guard can come up again
      UPG.parryCool = 0; UPG.blocking = false; triggerBlock(); check(UPG.blocking && UPG.parryCool > 0 && UPG.parryWindow > 0, 'F raises the guard'); for (let i = 0; i < 40; i++) update(1 / 60);
      check(!UPG.blocking && UPG.parryCool === 0 && UPG.parryWindow === 0, 'the guard timers count down');
      // the documented key
      G.state = 'play'; G.openPanel = null; UPG.parryCool = 0; UPG.blocking = false; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); check(UPG.blocking, 'the F key raises the guard');
      UPG.parryCool = 0; UPG.blocking = false; G.state = 'panel'; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true })); check(!UPG.blocking, 'not while a panel is open'); G.state = 'play';
      // the switch
      MOTION10.setSwitch('parry', false); const off = attempt(0, true); check(off.fired === 0, 'parry sparks off: none'); MOTION10.setSwitch('parry', true);
      PRESETS.apply('original'); const orig = attempt(0, true); check(orig.fired === 0, 'Original preset: none'); PRESETS.apply('medium');
      out.parry = { slip, block, hit };

      // ---- what the sparks look like: material, counts, noFlash, reduced motion, pixels, sound
      const fire = (mat, o) => { SPK.list.length = 0; return MOTION10.parry.fire(Object.assign({ x: 12.5, y: 10.7, kind: 'parry', mat }, o || {})); };
      const counts = {}; for (const m of ['iron', 'bronze', 'glass', 'wood']) counts[m] = fire(m).parts.length;
      check(counts.iron > counts.wood && counts.bronze > counts.wood && counts.glass > counts.wood, 'wood throws the fewest chips: ' + JSON.stringify(counts));
      const col = m => MOTION10.parry.MATS[m].col[1].join(',');
      check(new Set(['iron', 'bronze', 'glass', 'wood'].map(col)).size === 4, 'four materials, four colours');
      check(MOTION10.parry.MATS.glass.col[1][2] > MOTION10.parry.MATS.glass.col[1][0] + 60, 'glass is cyan');
      check(MOTION10.parry.MATS.wood.col[0][0] < 230 && MOTION10.parry.MATS.wood.dull, 'wood is dull');
      const wmat = id => { const k = G.player.weapons.indexOf(id); const keep = G.player.weapons.slice(); G.player.weapons = [id]; G.player.weapon = 0; const m = MOTION10.parry.materialOf(); G.player.weapons = keep; G.player.weapon = Math.min(G.player.weapon, keep.length - 1); return m; };
      check(wmat('sword') === 'iron' && wmat('mace') === 'bronze' && wmat('spear') === 'bronze' && wmat('glass') === 'glass' && wmat('hands') === 'wood' && wmat('crossbow') === 'wood', 'weapon type picks the look: sword iron, mace/spear bronze, glass arm glass, hands/crossbow wood');
      GFX.noFlash = true; const nf = fire('iron'); GFX.noFlash = false; const full = fire('iron');
      check(nf.parts.length < full.parts.length && nf.dim < full.dim && !nf.star && full.star, 'No flashes: fewer sparks, dimmer, no flash cross: ' + nf.parts.length + ' vs ' + full.parts.length);
      FEEL.state.shake = 0; GFX.reduceMotion = true; fire('iron'); const sRM = FEEL.state.shake; GFX.reduceMotion = false; FEEL.state.shake = 0; fire('iron'); const sOn = FEEL.state.shake;
      check(sRM === 0 && sOn > 0, 'reduced motion: no screen shake (' + sRM + ' vs ' + sOn + ')');
      // pixels: sparks are visible, and glass ones are blue-green
      Engine.cam.x = 12.5; Engine.cam.y = 11.5; Engine.cam.dir = -Math.PI / 2; e1.hidden = true; for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
      const bright = (mat, nof) => {
        SPK.list.length = 0; frame(); const c = Engine.ctx.canvas, sh = Engine.ctx; const a = sh.getImageData(0, 0, c.width, Math.floor(c.height * 0.75)).data.slice();
        GFX.noFlash = !!nof; fire(mat); for (let i = 0; i < 4; i++) frame(); GFX.noFlash = false;
        const b = sh.getImageData(0, 0, c.width, Math.floor(c.height * 0.75)).data; let n = 0, r = 0, g = 0, bl = 0, br = 0;
        for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); if (d > 60) { n++; r += b[i]; g += b[i + 1]; bl += b[i + 2]; br += Math.max(b[i], b[i + 1], b[i + 2]); } }
        return { n, r: r / Math.max(1, n), g: g / Math.max(1, n), b: bl / Math.max(1, n), br: br / Math.max(1, n) };
      };
      MOTION10.stepBy(1 / 60);
      const pi = bright('iron'), pg = bright('glass'), pw = bright('wood'), pn = bright('iron', true);
      check(pi.n > 25 && pg.n > 20 && pw.n > 8, 'sparks are on the screen: ' + [pi.n, pg.n, pw.n]);
      check((pg.b - pg.r) > (pi.b - pi.r) + 15 && pg.r < pi.r - 15 && pi.r > pi.b + 10, 'glass sparks read cyan, iron ones warm: glass rgb ' + [pg.r, pg.g, pg.b].map(Math.round) + ' iron ' + [pi.r, pi.g, pi.b].map(Math.round));
      check(pi.br > pw.br + 10, 'iron brighter than wood: ' + Math.round(pi.br) + ' vs ' + Math.round(pw.br));
      check(pn.n < pi.n && pn.br <= pi.br + 1, 'No flashes: fewer and dimmer pixels: ' + pn.n + ' vs ' + pi.n);
      out.sparkPixels = { iron: pi.n, glass: pg.n, wood: pw.n, noFlash: pn.n };
      // the sound
      out.audio = { ctx: !!Audio_.ctx };
      if (Audio_.ctx) {
        const s0 = SPK.stats.sounds; fire('bronze'); MOTION10.parry.fire({ x: 14, y: 10, kind: 'block', mat: 'glass' });
        check(SPK.stats.sounds === s0 + 2 && SPK.stats.lastSound.played, 'a tick of metal plays through the effects bus'); out.audio.pan = SPK.stats.lastSound.pan;
        check(SPK.stats.lastSound.pan > 0.1, 'a foe to the right pans right (' + SPK.stats.lastSound.pan + ')');
        const s1 = SPK.stats.sounds; const wasMuted = Audio_.muted; if (!wasMuted) Audio_.toggleMute(); fire('iron'); check(SPK.stats.sounds === s1, 'muted: no sound'); if (!wasMuted) Audio_.toggleMute();
      }
      // frame ends: sparks die away and do not accumulate
      SPK.list.length = 0; fire('iron'); for (let i = 0; i < 60; i++) frame(); check(SPK.list.length === 0, 'the burst dies away within a second');
      MOTION10.stepBy(null);

      // ---- Options rows and persistence
      reset(); G.state = 'panel'; renderAccessibilityMenu();
      for (const id of ['m10-travel', 'm10-lanterns', 'm10-parry']) { const b = document.getElementById(id); check(!!b && b.textContent === 'On' && b.getAttribute('aria-pressed') === 'true', id + ' row is there and on'); }
      document.getElementById('m10-lanterns').click(); check(!MOTION10.on.lanterns() && document.getElementById('m10-lanterns').textContent === 'Off', 'the row switches lanterns off');
      check(JSON.parse(localStorage.getItem('octave.motion10.v1')).l === 0, 'and the choice is saved');
      document.getElementById('m10-lanterns').click(); check(MOTION10.on.lanterns(), 'and on again');
      out.rows = 3;
      return { out, shots: wantShots ? Object.keys(shots) : [] };
    }, !!SHOTS);
    console.log('PASS lanterns (swing, cap 4, cull, drop/guttering, day/lit/dark rooms, AI traces identical) and parry sparks (only on a turned blow, materials, No flashes, reduced motion, sound, Options)', JSON.stringify(L.out));

    // Options at 640x400: the three rows are on screen and nothing overflows sideways
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); document.getElementById('m10-parry').scrollIntoView(); });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.evaluate(() => { const p = document.querySelector('#modal-panel'); return p.scrollWidth <= p.clientWidth + 1; }), true, 'options fit at 640x400 with the new rows');
    assert.equal(await page.evaluate(() => ['m10-travel', 'm10-lanterns', 'm10-parry'].every(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })), true, 'the new switches are inside the viewport');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'options-640x400.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS options rows fit at 640x400');

    // ------------------------------------------------------------------ 4. performance: a 12-enemy night scene, features on vs off, interleaved
    const perf = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      restoreGame(JSON.parse(JSON.stringify(mBase))); G.state = 'play'; Weather.hold('clear'); G.fadeT = 0; MOTION10.stepBy(1 / 60);
      loadMap('oakhaven', { x: 24.5, y: 24.5, dir: 0 }); G.fadeT = 0; G.tod = 0.92;
      for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
      const crowd = []; for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['proctor', 'legionnaire', 'outrider', 'hound'][i % 4], x: 26 + (i % 6) * 1.2, y: 22 + Math.floor(i / 6) * 2.4 }); e.state = 'idle'; e._tgSeen = true; e.hidden = false; G.ents.push(e); crowd.push(e); }
      const set = on => { for (const s of ['lanterns', 'parry']) MOTION10.setSwitch(s, on); };
      const SPK = MOTION10.parry.state, LAN = MOTION10.lanterns.state;
      const time = (on, withSparks) => { set(on); SPK.list.length = 0; const t0 = performance.now(); for (let i = 0; i < 20; i++) { if (withSparks && on && i % 5 === 0) MOTION10.parry.fire({ x: 26, y: 22, kind: 'parry', mat: 'iron' }); Engine.render(G.ents, G.tod); } return (performance.now() - t0) / 20; };
      for (let i = 0; i < 10; i++) { time(true); time(false); }
      const A = { off: [], on: [], sparks: [] };
      for (let r = 0; r < 31; r++) { A.off.push(time(false)); A.on.push(time(true)); A.sparks.push(time(true, true)); }
      const med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
      set(true);
      const frames0 = LAN.stats.frames, ms0 = LAN.stats.ms; for (let i = 0; i < 200; i++) Engine.render(G.ents, G.tod);
      const per = (LAN.stats.ms - ms0) / (LAN.stats.frames - frames0);
      const r = { offMs: +med(A.off).toFixed(3), onMs: +med(A.on).toFixed(3), sparksMs: +med(A.sparks).toFixed(3), lanternFrameMs: +per.toFixed(4), active: LAN.stats.active };
      r.extraMs = +(r.onMs - r.offMs).toFixed(3); r.extraWithSparksMs = +(r.sparksMs - r.offMs).toFixed(3);
      check(LAN.stats.active === 4, 'the perf scene runs four lanterns');
      check(r.lanternFrameMs < 0.2 && r.extraMs < 1.6 && r.extraWithSparksMs < 2.0, 'about 1 ms extra per frame at most (the machine is shared, so the gate has headroom; typical 0.4-1.0): ' + JSON.stringify(r));
      MOTION10.stepBy(null);
      return r;
    });
    console.log('PASS perf, 12-enemy night scene, median ms per Engine.render at 1x:', JSON.stringify(perf));
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
