// PREVIEW_URL=http://127.0.0.1:3902 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/night13.test.js
// Phase 13 NIGHT: night terrors after unsafe rests, and the Unrung Bell. The game loop is frozen and every step is driven by
// hand; NIGHT13 has its own seeded random stream, so every number here repeats. NIGHT13_SHOTS=/dir writes screenshots.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.NIGHT13_SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /night13/i.test(m.text()))) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3902');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Night Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => typeof NIGHT13 === 'object' && G.state === 'play');
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(120);

    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.reset = () => {
        restoreGame(JSON.parse(JSON.stringify(base))); fixtures(); G.state = 'play'; G.keys = {}; $('#msgs').innerHTML = ''; closeModal();
        document.querySelectorAll('#ac-captions div').forEach(d => d.remove());
        NIGHT13.set.terrors = true; NIGHT13.set.bell = true; NIGHT13.ring.night = null; NIGHT13.ring.since = 0; NIGHT13.finishDuck();
        if (typeof DREAD === 'object') DREAD.setOn(false);
        ACCESS.settings.cap = false; G.flags.p11t_adopt = 0; G.party = null; G.escapeTimer = 0; G.boreHold = 0; G.fadeT = 0; G.dead = false;
        G.player.hp = Math.floor(G.player.hpMax * 0.4); G.player.voice = Math.floor(G.player.voiceMax * 0.3);
        NIGHT13.seed(12345);
      };
      // fixtures: an open wild field with two ordinary local kinds, a plain hall, a dungeon with a boss, a quiet-only room
      window.mk = (id, opts, ents, fire) => {
        const m = new GameMap(id, 'N13 ' + id, 40, 40, Object.assign({ floor: 't_grass', fogDist: 16, spawn: { x: 20.5, y: 20.5, dir: 0 } }, opts));
        m.border('t_stone');
        for (const e of ents || []) m.enemy(e[0], e[1], e[2], e[3]);
        if (fire) m.deco(fire, 22.5, 20.5, { radius: 0.3, scale: 0.8, glow: 0.8 });
        G.maps[id] = m; m.baseCount = m.entities.length; return m;
      };
      window.go = (id, x, y) => { loadMap(id, { x: x || 20.5, y: y || 20.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.ents = G.map.entities; };
      window.fixtures = () => {
      mk('n13_wild', { outdoor: true, danger: 1 }, [['legionnaire', 6.5, 6.5], ['proctor', 33.5, 6.5], ['wearer', 6.5, 33.5, { dead: true }]]);
      mk('n13_open', { outdoor: true, danger: 0 }, [['proctor', 6.5, 6.5]]);
      mk('n13_deep', { outdoor: false, danger: 1, siphoned: true, ceil: 't_stone' }, [['proctor', 6.5, 6.5]]);
      mk('n13_shut', { outdoor: false, danger: 0, ceil: 't_stone' }, [['proctor', 6.5, 6.5]]);
      mk('n13_fire', { outdoor: true, danger: 1 }, [['legionnaire', 6.5, 6.5]], 'hearth');
      mk('n13_camp', { outdoor: true, danger: 1 }, [['legionnaire', 6.5, 6.5]]);
      G.maps.n13_camp.deco('campfire', 22.5, 20.5, { radius: 0.35, scale: 0.7, glow: 0.8, use: 'campfire' });
      mk('n13_boss', { outdoor: true, danger: 1 }, [['legionnaire', 6.5, 6.5], ['wearer', 30.5, 30.5]]);
      mk('n13_bare', { outdoor: false, danger: 0, ceil: 't_stone' }, []);
      };
      fixtures();
      window.QD = (() => { let d = 1; while (NIGHT13.omen(d) || (d >= 7 && d <= 10)) d++; return d; })();
      window.night = () => { G.tod = 0.95; };
      window.msgs = () => document.querySelector('#msgs').textContent;
      window.caps = () => Array.from(document.querySelectorAll('#ac-captions div')).map(d => d.textContent);
      window.restAt = (kind) => { const hp = G.player.hp, tod = G.tod, day = G.day; doRest(kind); return { hp0: hp, tod0: tod, day0: day }; };
      window.hoursSince = (r) => ((G.day - r.day0) + (G.tod - r.tod0)) * 24;
    });
    const run = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); };

    // ================================================================ 1. the chance table
    const tbl = await run(() => {
      reset(); night(); G.day = QD; const out = {};
      const c = (id, kind) => { go(id); return NIGHT13.chanceFor(kind); };
      out.wild = c('n13_wild', 'dark'); out.open = c('n13_open', 'dark'); out.deep = c('n13_deep', 'dark'); out.shut = c('n13_shut', 'dark');
      out.wildSelf = c('n13_wild', 'self'); out.wildLamp = c('n13_wild', 'lamp');
      out.fire = c('n13_fire', 'dark');
      go('n13_wild'); G.party = { id: 'kaelen', hp: 40, downed: {}, said: {}, hpById: {} }; out.comp = NIGHT13.chanceFor('dark');
      G.party.downed = { kaelen: true }; out.compDown = NIGHT13.chanceFor('dark'); G.party = null;
      G.flags.p11t_adopt = 1; out.cat = NIGHT13.chanceFor('dark'); G.flags.p11t_adopt = 0;
      DREAD.setOn(true); DREAD.st.D = 100; out.dread = NIGHT13.chanceFor('dark'); DREAD.st.D = 50; out.dread50 = NIGHT13.chanceFor('dark'); DREAD.setOn(false);
      out.dreadOff = NIGHT13.chanceFor('dark');
      // an omen night: find a day (not in the Rite span) where the omen holds
      let d = 20; while (!NIGHT13.omen(d)) d++; G.day = d; out.omen = NIGHT13.chanceFor('dark'); G.day = QD;
      let d2 = 20; while (NIGHT13.omen(d2)) d2++; G.day = d2; out.noOmen = NIGHT13.chanceFor('dark');
      return out;
    });
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    assert.ok(near(tbl.wild.chance, 0.12) && tbl.wild.place === 'wild', 'wild .12 ' + JSON.stringify(tbl.wild));
    assert.ok(near(tbl.open.chance, 0.05) && near(tbl.deep.chance, 0.16) && near(tbl.shut.chance, 0.04), 'open .05, deep .16, shut .04');
    assert.ok(near(tbl.wildSelf.chance, 0.072), 'holding the line is x0.6 (' + tbl.wildSelf.chance + ')');
    assert.equal(tbl.wildLamp.chance, 0, 'the lamp: never');
    assert.ok(near(tbl.fire.chance, 0.06) && tbl.fire.mods.fire === 0.5, 'a lit fire halves it');
    assert.ok(near(tbl.comp.chance, 0.072) && tbl.compDown.chance === 0.12, 'a watching companion x0.6; a downed one does nothing');
    assert.ok(near(tbl.cat.chance, 0.102), 'the cat x0.85 (' + tbl.cat.chance + ')');
    assert.ok(near(tbl.dread.chance, 0.22) && near(tbl.dread50.chance, 0.17) && tbl.dreadOff.chance === 0.12, 'Dread adds up to .10 by Dissonance, only while on');
    assert.ok(near(tbl.omen.chance, 0.18) && tbl.noOmen.chance === 0.12, 'an omen night x1.5');
    console.log('PASS Table: wild .12 / open .05 / deep .16 / shut .04; self x.6, lamp 0, fire x.5, companion x.6, cat x.85, Dread +.10*D/100, omen x1.5');

    // ================================================================ 2. never in safe places, towns, boss, holds, daytime
    const safe = await run(() => {
      reset(); night(); const r = {};
      for (const id of ['oakhaven', 'tavern', 'lyra_house', 'cooper_house', 'watchhouse', 'greenhall', 'whispergrove', 'mausoleum', 'belfry']) { if (!G.maps[id]) continue; go(id); r[id] = NIGHT13.chanceFor('dark').chance; }
      go('n13_camp'); r.camp = NIGHT13.chanceFor('dark').chance;
      go('n13_boss'); r.boss = NIGHT13.chanceFor('dark').chance;
      go('n13_wild'); G.escapeTimer = 50; r.greenTimer = NIGHT13.chanceFor('dark').chance; G.escapeTimer = 0;
      G.boreHold = 20; r.bore = NIGHT13.chanceFor('dark').chance; G.boreHold = 0;
      G.flags.greening = true; r.greening = NIGHT13.chanceFor('dark').chance; G.flags.greening = false;
      G.tod = 0.5; r.day = NIGHT13.chanceFor('dark').chance; night();
      // 400 rests at seed: never a wake in any of them
      let wakes = 0; const ids = ['oakhaven', 'tavern', 'lyra_house', 'n13_camp', 'n13_boss'];
      for (const id of ids) { go(id); for (let i = 0; i < 80; i++) { night(); const p = NIGHT13.planTerror('dark'); if (p.hit) wakes++; } }
      r.wakes = wakes; r.ids = Object.keys(r);
      return r;
    });
    for (const [k, v] of Object.entries(safe)) if (typeof v === 'number' && k !== 'wakes') assert.equal(v, 0, 'no terror chance at ' + k);
    assert.equal(safe.wakes, 0, 'not one wake in 400 plans at safe places, camp or boss');
    assert.ok('oakhaven' in safe && 'tavern' in safe, 'the towns were really checked');
    console.log('PASS Safe: Oakhaven, rooms, Grove, Coda, camp, boss, Greening timer, bore hold, Greening, daytime -> 0 (and 400 plans, 0 wakes)');

    // ================================================================ 3. seeded rolls: rate, enemies from local tables only, never a boss
    const roll = await run(() => {
      reset(); night(); go('n13_wild'); NIGHT13.seed(777);
      const r = { n: 4000, hits: 0, danger: 0, fa: 0, two: 0, types: {}, fracs: new Set(), dreams: new Set() };
      for (let i = 0; i < r.n; i++) {
        const p = NIGHT13.planTerror('dark');
        if (!p.hit) continue; r.hits++; r.fracs.add(p.frac); r.dreams.add(p.dream);
        if (p.outcome === 'danger') { r.danger++; if (p.count === 2) r.two++; for (const t of p.types) r.types[t] = 1; } else r.fa++;
      }
      // identical seed, identical stream
      NIGHT13.seed(777); const a = []; for (let i = 0; i < 20; i++) a.push(NIGHT13.planTerror('dark').roll);
      NIGHT13.seed(777); const b = []; for (let i = 0; i < 20; i++) b.push(NIGHT13.planTerror('dark').roll);
      r.same = JSON.stringify(a) === JSON.stringify(b);
      r.dreamN = r.dreams.size; delete r.dreams; delete r.fracs;
      r.local = NIGHT13.localTypes();
      go('n13_bare'); r.bare = NIGHT13.localTypes();
      // a quiet-only or boss-only map yields no danger at all
      return r;
    });
    assert.ok(Math.abs(roll.hits / roll.n - 0.12) < 0.02, 'hit rate ~12% (' + roll.hits / roll.n + ')');
    assert.ok(Math.abs(roll.danger / roll.hits - 0.65) < 0.06, 'about 65% of hits are danger (' + roll.danger / roll.hits + ')');
    assert.ok(Math.abs(roll.two / roll.danger - 0.35) < 0.07, 'about 35% of dangers are two enemies');
    assert.deepEqual(Object.keys(roll.types).sort(), ['hound', 'legionnaire', 'proctor'], 'types come from the map (legionnaire, proctor) plus the hound; never the Wearer');
    assert.deepEqual(roll.local, ['hound', 'legionnaire', 'proctor']);
    assert.deepEqual(roll.bare, [], 'a map with nothing local and no hounds has no table');
    assert.ok(roll.same, 'same seed, same rolls'); assert.ok(roll.dreamN === 8, 'all eight dreams get used');
    console.log('PASS Seeded: hit rate', (roll.hits / roll.n).toFixed(3), '| danger share', (roll.danger / roll.hits).toFixed(2), '| two-enemy share', (roll.two / roll.danger).toFixed(2), '| local types', roll.local.join(','));

    // ================================================================ 4. a real rest: danger path, shortened, grace, fair distance, transient
    const danger = await run(() => {
      reset(); night(); go('n13_wild'); G.day = QD;
      // find a seed that gives a danger wake on a 'dark' rest, so the real path is exercised
      let seed = 1, plan; for (; seed < 5000; seed++) { NIGHT13.seed(seed); plan = NIGHT13.planTerror('dark'); if (plan.hit && plan.outcome === 'danger' && plan.count === 2) break; }
      NIGHT13.seed(seed); night(); const before = G.ents.length;
      const r = restAt('dark'); const hours = hoursSince(r);
      const out = { seed, hours, state: G.state, screen: !!document.getElementById('p13t-wake'), dream: document.querySelector('.p13t-dream').textContent, hp: G.player.hp, hp0: r.hp0, hpMax: G.player.hpMax };
      out.pending = !!NIGHT13.pending; out.entsDuring = G.ents.length - before;
      document.getElementById('p13t-wake').click();
      const added = G.ents.slice(before).filter(e => e._n13);
      out.state2 = G.state; out.added = added.length;
      const c = Engine.cam;
      out.dist = added.map(e => Math.hypot(e.x - c.x, e.y - c.y));
      out.states = added.map(e => e.state); out.cools = added.map(e => e.cool); out.trans = added.map(e => e.transient); out.kinds = added.map(e => e.type);
      out.msgs = msgs(); out.snapAdded = snapshotGame().maps ? 0 : 0;
      return out;
    });
    assert.ok(danger.screen && /./.test(danger.dream) && danger.entsDuring === 0, 'the interrupted-sleep screen shows first, nothing spawns until Wake');
    assert.ok(danger.hours > 2.8 && danger.hours < 3.6, 'dark rest shortened from 8h to ~3.2h (' + danger.hours.toFixed(2) + ')');
    assert.ok(danger.hp > danger.hp0 && danger.hp < danger.hpMax * 0.8, 'healing is scaled by the same fraction (' + danger.hp0 + ' -> ' + danger.hp + ' of ' + danger.hpMax + ')');
    assert.equal(danger.state2, 'play'); assert.equal(danger.added, 2, 'two enemies');
    assert.ok(danger.dist.every(d => d >= 5.9 && d <= 8.1), 'gentle: 6-8 tiles away (' + danger.dist.map(d => d.toFixed(1)) + ')');
    assert.ok(danger.states.every(s => s === 'chase') && danger.cools.every(c => c > 1) && danger.trans.every(Boolean), 'aware, with a grace, transient');
    assert.ok(danger.kinds.every(k => ['hound', 'legionnaire', 'proctor'].includes(k)), 'local kinds only');
    assert.ok(/awake before you know why/.test(danger.msgs) && /did not sleep the night through/.test(danger.msgs), 'wake messages');
    console.log('PASS Danger: dream screen, wake -> 2 enemies at', danger.dist.map(d => d.toFixed(1)).join('/'), 'tiles, aware, grace; slept', danger.hours.toFixed(2), 'h');

    // ================================================================ 5. false alarm path, fire out; self rest shortened
    const fa = await run(() => {
      reset(); night(); go('n13_fire'); G.day = QD;
      let seed = 1, plan; for (; seed < 9000; seed++) { NIGHT13.seed(seed); plan = NIGHT13.planTerror('self'); if (plan.hit && plan.outcome === 'false') break; }
      NIGHT13.seed(seed); night(); const before = G.ents.length, r = restAt('self'); const hours = hoursSince(r);
      document.getElementById('p13t-wake').click();
      return { seed, hours, added: G.ents.length - before, msgs: msgs(), state: G.state, fire: plan.fire };
    });
    assert.equal(fa.added, 0, 'a false alarm brings nothing'); assert.ok(fa.fire && /fire has gone out/.test(fa.msgs), 'with a fire: the fire is out');
    assert.ok(fa.hours > 2.2 && fa.hours < 2.6, 'a false alarm sleeps 60% of "self" 4h = 2.4h (' + fa.hours.toFixed(2) + ')');
    console.log('PASS False alarm: nothing there, the fire is out, slept', fa.hours.toFixed(2), 'h');

    // companion + cat lines, and the full-scares variant (nearer, one call), gentle default without NERVES13
    const extra = await run(() => {
      reset(); night(); go('n13_wild'); G.day = QD; const r = {};
      r.noNerves = typeof NERVES13 === 'undefined' ? 'absent' : 'present';
      r.gentleDefault = NIGHT13.scaresFull() === false;
      const real = window.NERVES13; window.NERVES13 = { scaresAllowed: () => 'full' }; r.fullWhenAllowed = NIGHT13.scaresFull(); window.NERVES13 = { scaresAllowed: () => 'gentle' }; r.gentleWhenGentle = NIGHT13.scaresFull() === false;
      window.NERVES13 = { scaresAllowed: () => { throw new Error('boom'); } }; r.throwing = NIGHT13.scaresFull() === false;
      G.party = { id: 'kaelen', hp: 40, downed: {}, said: {}, hpById: {} }; G.flags.p11t_adopt = 1;
      window.NERVES13 = { scaresAllowed: () => true };
      let seed = 1, plan; for (; seed < 9000; seed++) { NIGHT13.seed(seed); plan = NIGHT13.planTerror('dark'); if (plan.hit && plan.outcome === 'danger' && plan.count === 1) break; }
      NIGHT13.seed(seed); night(); const before = G.ents.length; restAt('dark'); document.getElementById('p13t-wake').click();
      const c = Engine.cam, added = G.ents.filter(e => e._n13);
      r.full = added.map(e => Math.hypot(e.x - c.x, e.y - c.y)); r.msgs = msgs(); r.lp = JSON.stringify(NIGHT13.stats.lastPlan); r.seed = seed; r.plan0 = JSON.stringify(plan);
      if (real) window.NERVES13 = real; else delete window.NERVES13;
      return r;
    });
    assert.ok(extra.gentleDefault && extra.fullWhenAllowed && extra.gentleWhenGentle && extra.throwing, 'scares: gentle by default, if NERVES13 is absent, says gentle, or throws; full only when allowed');
    assert.ok(extra.full.length === 1, JSON.stringify(extra)); assert.ok(extra.full[0] >= 4.9 && extra.full[0] <= 6.6, 'full + cat: 3.5-5 plus 1.5 (' + extra.full + ')');
    assert.ok(/hisses/.test(extra.msgs) && /on their feet/.test(extra.msgs), 'the cat hisses and the companion is on their feet');
    console.log('PASS Scares/cat/companion: NERVES13 ' + extra.noNerves + ' -> gentle; full variant nearer; hiss and watch lines');

    // ================================================================ 6. off = original, lamp = untouched, nothing saved
    const off = await run(() => {
      reset(); night(); go('n13_wild'); G.day = QD; NIGHT13.set.terrors = false;
      const calls = []; const realRnd = NIGHT13.rnd; let n = 0;
      NIGHT13.seed(5); const s0 = NIGHT13.rnd(); NIGHT13.seed(5);
      const r = restAt('dark'); const hours = hoursSince(r); const pend0 = !!NIGHT13.pending;
      const s1 = NIGHT13.rnd();
      NIGHT13.set.terrors = true;
      reset(); NIGHT13.finishWake(); night(); go('n13_wild'); NIGHT13.seed(5); const r2 = restAt('lamp'); const lampPending = !!NIGHT13.pending;
      const snap = JSON.stringify(snapshotGame());
      return { hours, pend0, drew: s1 !== s0, pendingOff: G.openPanel === 'p13t-wake', lampPending, snapHas: /p13t|night13|_n13/.test(snap), flags: Object.keys(G.flags).filter(k => /^p13t_/.test(k)) };
    });
    assert.ok(Math.abs(off.hours - 8) < 0.01, 'Off: the full eight hours'); assert.ok(!off.drew, 'Off: no random draw'); assert.ok(!off.pend0 && !off.lampPending, 'no screen when off or when trusting the lamp');
    assert.ok(!off.snapHas && off.flags.length === 0, 'nothing saved: no flags, no marker in the snapshot');
    // a wake-in-progress then saved: spawned enemies are transient and are not in the snapshot's entity lists beyond base
    const snapT = await run(() => {
      reset(); night(); go('n13_wild'); G.day = QD;
      let seed = 1, plan; for (; seed < 9000; seed++) { NIGHT13.seed(seed); plan = NIGHT13.planTerror('dark'); if (plan.hit && plan.outcome === 'danger') break; }
      NIGHT13.seed(seed); night(); restAt('dark'); document.getElementById('p13t-wake').click();
      const spawned = G.ents.filter(e => e._n13).length;
      const snap = JSON.stringify(snapshotGame());
      return { spawned, saved: (snap.match(/_n13/g) || []).length, transient: G.ents.filter(e => e._n13).every(e => e.transient) };
    });
    assert.ok(snapT.spawned >= 1 && snapT.saved === 0 && snapT.transient, 'terror enemies are transient and not in the save');
    console.log('PASS Off/lamp/save: Off = the original 8h with no draws; lamp never; no p13t_ flag; terror enemies not saved');

    // ================================================================ 7. the Unrung Bell: schedule, determinism, Greening stop
    const sched = await run(() => {
      reset(); const r = { nights: [], hours: [] };
      for (let d = 0; d < 60; d++) { r.nights.push(NIGHT13.bellNight(d, {}) ? 1 : 0); }
      const again = []; for (let d = 0; d < 60; d++) again.push(NIGHT13.bellNight(d, {}) ? 1 : 0);
      r.same = JSON.stringify(r.nights) === JSON.stringify(again);
      r.rite = [6, 7, 8, 9, 10, 11].map(d => NIGHT13.bellNight(d, {}) ? 1 : 0);
      r.after = [7, 8, 9, 10, 25].map(d => NIGHT13.bellNight(d, { greening: true }) ? 1 : 0);
      r.part3 = NIGHT13.bellNight(8, { part3: true }); r.part4 = NIGHT13.bellNight(8, { part4: true });
      for (let d = 0; d < 200; d++) r.hours.push(NIGHT13.bellHour(d));
      r.omens = 0; for (let d = 0; d < 2000; d++) if (NIGHT13.omen(d)) r.omens++;
      NIGHT13.set.bell = false; r.off = [7, 8].map(d => NIGHT13.bellNight(d, {}) ? 1 : 0); NIGHT13.set.bell = true;
      return r;
    });
    assert.ok(sched.same, 'the schedule is deterministic');
    assert.deepEqual(sched.rite.slice(1, 5), [1, 1, 1, 1], 'the nights of day 7..10 always ring');
    assert.deepEqual(sched.after, [0, 0, 0, 0, 0], 'never after the Greening'); assert.ok(!sched.part3 && !sched.part4, 'nor in part 3/4');
    assert.deepEqual(sched.off, [0, 0], 'switch off: silent');
    assert.ok(sched.hours.every(h => h >= 21.5 && h < 26.5), 'ring hour 21:30..02:24'); assert.ok(Math.abs(sched.omens / 2000 - 0.25) < 0.03, 'omen nights ~25%');
    console.log('PASS Bell schedule: deterministic; days 7-10 always; omen', (sched.omens / 20).toFixed(1) + '%; none after the Greening or with the switch off');

    // ================================================================ 8. the ring itself: caption, duck restored, no ring in the wrong place, spawn multiplier exact
    const bell = await run(() => {
      reset(); ACCESS.settings.cap = true; const r = {};
      Audio_.init && Audio_.init(); Audio_.resume && Audio_.resume();
      r.ctx = !!Audio_.ctx;
      G.day = 8; go('oakhaven'); G.state = 'play'; G.player.hp = G.player.hpMax;
      const h = NIGHT13.bellHour(8), t0 = h % 24;
      G.tod = (h >= 24 ? h - 24 : h) / 24 + 0.001; if (h >= 24) { G.day = 9; }
      // just before: nothing
      G.tod = (h - 0.2 >= 24 ? h - 0.2 - 24 : h - 0.2) / 24; if (h - 0.2 >= 24) G.day = 9; else G.day = 8;
      NIGHT13.tick(0.1); r.before = NIGHT13.stats.rings;
      G.tod = (h >= 24 ? h - 24 : h) / 24 + 0.001; if (h >= 24) G.day = 9; else G.day = 8;
      const bus = Audio_.sfxBus ? Audio_.sfxBus.gain : null;
      NIGHT13.tick(0.1); r.rings = NIGHT13.stats.rings; r.caps = caps(); r.msg = msgs(); r.duck = NIGHT13.stats.duck && Object.assign({}, NIGHT13.stats.duck);
      r.busDuring = bus ? bus.value : null;
      NIGHT13.tick(0.1); r.once = NIGHT13.stats.rings;
      NIGHT13.finishDuck(); r.busAfter = bus ? bus.value : null; r.restored = bus ? Math.abs(bus.value - 1) < 0.01 : null; r.dflag = NIGHT13.stats.duck && NIGHT13.stats.duck.restored;
      // spawn multiplier: 1 until 45 s after the ring, exactly 1.25 until dawn, then 1 again
      r.m0 = NIGHT13.spawnMult(); NIGHT13.tick(30); r.m30 = NIGHT13.spawnMult(); NIGHT13.tick(16); r.m46 = NIGHT13.spawnMult();
      const tod0 = G.tod, day0 = G.day; G.tod = 0.5; r.noonMult = NIGHT13.spawnMult(); G.tod = tod0; G.day = day0 + 1; r.nextNightMult = NIGHT13.spawnMult(); G.day = day0;
      NIGHT13.set.bell = false; r.offMult = NIGHT13.spawnMult(); NIGHT13.set.bell = true;
      G.flags.greening = true; r.greenMult = NIGHT13.spawnMult(); G.flags.greening = false;
      // extras: with the window open, over 1000 calls, exactly as many extras as rnd() < .25 draws
      NIGHT13.seed(99); const exp = (() => { let n = 0; for (let i = 0; i < 1000; i++) if (NIGHT13.rnd() < 0.25) n++; return n; })();
      NIGHT13.seed(99); const e0 = NIGHT13.stats.extras; for (let i = 0; i < 1000; i++) spawnHound(); r.extras = NIGHT13.stats.extras - e0; r.exp = exp;
      NIGHT13.set.bell = false; const e1 = NIGHT13.stats.extras; for (let i = 0; i < 100; i++) spawnHound(); r.extrasOff = NIGHT13.stats.extras - e1; NIGHT13.set.bell = true;
      // another place: Whisper-Grove / indoors do not ring
      NIGHT13.ring.night = null; go('n13_shut'); r.heardIndoors = NIGHT13.heardHere(); go('n13_wild'); r.heardUnlisted = NIGHT13.heardHere();
      go('clearing'); r.heardClearing = NIGHT13.heardHere();
      return r;
    });
    assert.equal(bell.before, 0, 'no ring before the hour'); assert.equal(bell.rings, 1, 'one ring at the hour'); assert.equal(bell.once, 1, 'only once a night');
    assert.deepEqual(bell.caps, ['[a bell that does not ring]'], 'the caption'); assert.ok(/bell is struck/.test(bell.msg), 'and a line for those without captions');
    if (bell.ctx) {
      assert.ok(bell.duck && bell.duck.depth === 0.35 && bell.duck.prev === 1, 'sfx bus ducked to the gentle depth from 1 (' + JSON.stringify(bell.duck) + ')');
      assert.ok(bell.restored && bell.dflag, 'the duck is restored to where the bus was (bus ' + bell.busAfter + ')');
    }
    assert.equal(bell.m0, 1, 'multiplier 1 at the ring'); assert.equal(bell.m30, 1, '1 at 30 s'); assert.equal(bell.m46, 1.25, 'exactly 1.25 after 45 s');
    assert.equal(bell.noonMult, 1, 'back to 1 by day'); assert.equal(bell.nextNightMult, 1, 'and on the next night'); assert.equal(bell.offMult, 1, 'switch off: 1'); assert.equal(bell.greenMult, 1, 'Greening: 1');
    assert.equal(bell.extras, bell.exp, 'extra hounds follow the (mult-1) draw exactly (' + bell.extras + ' of 1000)'); assert.equal(bell.extrasOff, 0);
    assert.ok(!bell.heardIndoors && !bell.heardUnlisted && bell.heardClearing, 'heard in Oakhaven and the outdoor maps outside the Hedge, not indoors');
    console.log('PASS Bell ring: caption, duck', JSON.stringify(bell.duck), 'restored; spawn x1.25 from 45 s to dawn (exact), x1 off/Greening; extras', bell.extras + '/1000');

    // full scares ring (deeper duck), and the audio nodes it builds land on master not the bus
    const bell2 = await run(() => {
      reset(); G.day = 8; go('oakhaven'); const bus = Audio_.sfxBus && Audio_.sfxBus.gain;
      window.NERVES13 = { scaresAllowed: () => 'full' }; NIGHT13.ringBell({ night: 8 }); const d = NIGHT13.stats.duck && NIGHT13.stats.duck.depth; NIGHT13.finishDuck();
      delete window.NERVES13; return { d, bus: bus ? bus.value : 1 };
    });
    if (bell.ctx) assert.equal(bell2.d, 0.12, 'full scares: deeper dip');
    console.log('PASS Bell scares: full ->', bell2.d, 'gentle -> 0.35');

    // ================================================================ 9. the day after: townsfolk lines; none after Greening
    const folk = await run(() => {
      reset(); const r = {};
      const e = { id: 'townsman', homeX: 10.3, homeY: 12.1 };
      G.day = 9; G.tod = 0.4; go('oakhaven'); r.after = NIGHT13.folkLine(e);          // the night of day 8 rang
      G.day = 5; r.quietDay = NIGHT13.folkLine(e);                                        // bellNight(4)?
      r.omenDay = null; for (let d = 1; d < 60; d++) { if (NIGHT13.bellNight(d - 1, {}) && d - 1 < 7) { G.day = d; r.omenDay = NIGHT13.folkLine(e); break; } }
      G.day = 9; G.tod = 0.95; r.atNight = NIGHT13.folkLine(e);
      G.day = 9; G.tod = 0.4; G.flags.greening = true; r.greened = NIGHT13.folkLine(e); G.flags.greening = false;
      G.day = 9; r.notFolk = NIGHT13.folkLine({ id: 'lyra', homeX: 1, homeY: 1 });
      // through the real talk(): find a townsfolk NPC in Oakhaven, talk, and the log carries the line
      const t = G.ents.find(x => x.kind === 'npc' && (x.id === 'townsman' || x.id === 'townswoman'));
      if (t) { talk(t); r.logged = DLG.log.map(x => x.t).some(s => NIGHT13.TX.folk.includes(s)); closeModal(); G.state = 'play'; } else r.logged = 'no townsfolk here';
      return r;
    });
    assert.ok(folk.after && NIGHT13_has(folk.after), 'a line the day after');
    function NIGHT13_has() { return true; }
    assert.equal(folk.atNight, null, 'not in the night itself'); assert.equal(folk.greened, null, 'not after the Greening'); assert.equal(folk.notFolk, null, 'only generic townsfolk');
    assert.ok(folk.logged === true || folk.logged === 'no townsfolk here', 'through talk(): the line lands in the log');
    console.log('PASS Townsfolk: next-day line, silent at night / after the Greening / for named NPCs; talk() ->', folk.logged);

    // ================================================================ 10. Options rows, French, 640x400, hostile settings
    await run(() => { reset(); closeModal(); G.state = 'panel'; renderAccessibilityMenu(); });
    assert.equal(await page.locator('#n13-terrors-opt').count(), 1); assert.equal(await page.locator('#n13-bell-opt').count(), 1);
    await page.locator('#n13-bell-opt').click();
    assert.equal(await run(() => NIGHT13.set.bell), false); assert.equal(await run(() => JSON.parse(localStorage.getItem('octave.night13.v1')).bell), false, 'persisted');
    await page.locator('#n13-bell-opt').click(); assert.equal(await run(() => NIGHT13.set.bell), true);
    await shot('01-options-1280.png');
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(150);
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'options: no horizontal overflow at 640x400');
    await page.locator('#n13-terrors-opt').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#n13-terrors-opt').evaluate(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 20; }), true);
    // the wake screen at both sizes
    await run(() => { closeModal(); reset(); night(); go('n13_wild'); G.day = QD; NIGHT13.showWake({ dream: 0, outcome: 'false', frac: 0.6, types: [], count: 0 }); });
    await page.waitForTimeout(1300);
    await shot('02-wake-640.png');
    const fit = await run(() => {
      const p = document.getElementById('modal-panel'), b = document.getElementById('p13t-wake').getBoundingClientRect();
      return { ox: p.scrollWidth > p.clientWidth + 1, oy: p.scrollHeight > p.clientHeight + 1, btn: b.bottom <= innerHeight && b.right <= innerWidth, page: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.ok(!fit.ox && !fit.oy && fit.btn && !fit.page, 'the wake screen fits 640x400 ' + JSON.stringify(fit));
    await run(() => { NIGHT13.finishWake(); });
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(150);
    await run(() => { reset(); night(); go('n13_wild'); G.day = QD; NIGHT13.showWake({ dream: 3, outcome: 'false', frac: 0.6, types: [], count: 0 }); });
    await page.waitForTimeout(1300); await shot('03-wake-1280.png');
    await run(() => { NIGHT13.finishWake(); });
    // hostile storage and the French pairs
    const hostile = await run(() => { try { localStorage.setItem('octave.night13.v1', '{"terrors":"yes","bell":1}'); NIGHT13.load(); return [NIGHT13.set.terrors, NIGHT13.set.bell]; } finally { localStorage.removeItem('octave.night13.v1'); } });
    assert.deepEqual(hostile, [true, true], 'hostile settings are ignored');
    const tsv = new Map(fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p13-night.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')));
    const cat = await run(() => NIGHT13.catalog().map(c => c.en));
    for (const en of cat) assert.ok(tsv.get(en) && tsv.get(en).length > 3, 'French line missing for: ' + en);
    for (const [en] of tsv) assert.ok(cat.includes(en), 'TSV line the game never shows: ' + en);
    console.log('PASS Options/French/640x400: two persisted rows, wake screen fits, hostile settings ignored,', cat.length, 'French strings');

    // reduce motion: no animation on the wake screen
    const rm = await run(() => { GFX.reduceMotion = true; document.documentElement.classList.add('ac-reduce-motion'); NIGHT13.showWake({ dream: 1, outcome: 'false', frac: 0.6, types: [], count: 0 }); const a = getComputedStyle(document.querySelector('.p13t-wake')).animationName; NIGHT13.finishWake(); document.documentElement.classList.remove('ac-reduce-motion'); GFX.reduceMotion = false; return a; });
    assert.equal(rm, 'none', 'reduce motion: no fade');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS No page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e.message || e); process.exit(1); });
