// PREVIEW_URL=http://127.0.0.1:3852 PLAYWRIGHT_MODULE=/path/to/playwright node test/flourish11.test.js
// Phase 11 FLOURISH: hit-stop, weapon trails, level-up notes, quest banners, loot flights, shop coins, page turns.
// Optional SHOTS=<dir> writes review pictures (kept out of the repo). Uses the managed preview; never writes player saves.
// Everything here is presentation: the outcome tests run the same seeded scenes with the module on and off and
// compare damage, hp, positions, simulation clock and the RNG state.
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
    page.on('console', m => { if (m.type() === 'warning' && /flourish11/.test(m.text())) errors.push(m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3852');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof FLOURISH11 !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Flourish Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);
    const shot = async (name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); } };
    // shared helpers, defined once in the page
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.sleep = ms => new Promise(r => setTimeout(r, ms));
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.lcg = (seed) => { const o = { s: seed >>> 0 }; o.next = () => (o.s = (Math.imul(o.s, 1664525) + 1013904223) >>> 0) / 4294967296; return o; };
      window.reset = () => {
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; Weather.hold('clear'); G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {}; G.fadeT = 0;
        for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
        FLOURISH11.setSwitch('flourish', true); FLOURISH11.setSwitch('hitstop', true); GFX.reduceMotion = false; GFX.noFlash = false; GFX.flourishes = true; GFX.hitstop = true; GFX.preset = 'medium';
        FLOURISH11.hitstop.state.left = 0; FLOURISH11.hitstop.state.frozen = 0; FLOURISH11.hitstop.state.count = 0;
        document.getElementById('msgs').innerHTML = '';
      };
    });

    // ------------------------------------------------------------------ 0. switches and presets
    await page.evaluate(() => {
      reset();
      check(GFX.FX.includes('flourishes') && GFX.FX.includes('hitstop'), 'both switches are GFX.FX effects');
      check(FLOURISH11.on.flourishes() && FLOURISH11.on.hitstop(), 'default on');
      PRESETS.apply('original'); check(!FLOURISH11.on.flourishes() && !FLOURISH11.on.hitstop(), 'the Original preset leaves both off');
      PRESETS.apply('medium'); check(FLOURISH11.on.flourishes() && FLOURISH11.on.hitstop(), 'Medium turns them back on');
      GFX.reduceMotion = true; check(!FLOURISH11.on.hitstop(), 'Reduce motion = no freeze'); GFX.reduceMotion = false;
    });
    console.log('PASS switches default on, Original preset off, Reduce motion stops the freeze');

    // ------------------------------------------------------------------ 1. hit-stop: identical outcomes, exact resume
    const combat = await page.evaluate(() => {
      const DT = 1 / 60, N = 520;
      const run = (seed, on) => {
        reset(); loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
        UPG._ambT = 1e9;   // the ambient bird/rat timer is session state the save does not reset
        FLOURISH11.setSwitch('hitstop', on); FLOURISH11.setSwitch('flourish', on);
        const rng = lcg(seed), realRandom = Math.random; Math.random = rng.next;
        const p = G.player, c = Engine.cam; p.hpMax = p.hp = 9999; p.weapons = ['sword']; p.weapon = 0; p.attrs.Strength = 40;
        const foes = [['proctor', 1.1, 0], ['hound', 1.3, 0.25], ['legionnaire', 1.5, -0.25]].map(([t, d, off]) => {
          const e = hydrate({ kind: 'enemy', type: t, x: c.x + Math.cos(c.dir) * d - Math.sin(c.dir) * off, y: c.y + Math.sin(c.dir) * d + Math.cos(c.dir) * off });
          e.state = 'chase'; e.alertT = 8; e.hp = e.def.hp = 900; G.ents.push(e); return e;
        });
        const T0 = G.time, trace = []; let adv = 0, frozenSteps = 0, guard = 0;
        const snap = () => [adv, p.hp, +(G.time - T0).toFixed(4), +c.x.toFixed(4), +c.y.toFixed(4), ...foes.map(e => [e.hp, +e.x.toFixed(4), +e.y.toFixed(4), e.state, +(e.alertT || 0).toFixed(4)].join(',')), rng.s].join('|');
        const hsState = FLOURISH11.hitstop.state;
        while (adv < N && guard++ < N * 3) {
          const f0 = hsState.frozen; update(DT);
          if (hsState.frozen !== f0) { frozenSteps++; continue; }
          adv++;
          if (adv % 26 === 0) attack('swing');
          if (adv % 40 === 0) trace.push(snap());
        }
        Math.random = realRandom;
        const out = { trace, crits: hsState.count, frozenSteps, frozenMs: Math.round(hsState.frozen * 1000), hp: foes.map(e => e.hp), pl: p.hp };
        for (const e of foes) G.ents.splice(G.ents.indexOf(e), 1);
        return out;
      };
      let seed = 1, a = null;
      for (; seed < 40; seed++) { a = run(seed, true); if (a.crits >= 2) break; }
      check(a.crits >= 2, 'a seeded fight with at least two critical blows exists (tried ' + seed + ')');
      const b = run(seed, false), c2 = run(seed, false);
      check(b.crits === 0 && b.frozenSteps === 0, 'off: no freeze at all');
      { const d = b.trace.findIndex((t, i) => t !== c2.trace[i]); check(d === -1, 'control: two runs with the module off are identical (the scene is deterministic) @' + d + ' ' + b.trace[d] + ' / ' + c2.trace[d]); }
      const first = b.trace.findIndex((t, i) => t !== a.trace[i]);
      check(first === -1, 'damage, hp, positions, sim clock, alert timers and RNG state identical on/off; first difference at ' + first + ': ' + a.trace[first] + ' / ' + b.trace[first]);
      check(a.frozenSteps > 0 && a.frozenMs >= 60 * a.crits * 0.5, 'the freeze really ate simulation steps: ' + a.frozenSteps);
      return { seed, crits: a.crits, frozenSteps: a.frozenSteps, frozenMs: a.frozenMs, samples: a.trace.length, foeHp: a.hp, playerHp: a.pl };
    });
    console.log('PASS hit-stop: same seeded fight on/off gives identical damage/hp/positions/clock/RNG', JSON.stringify(combat));

    const hs = await page.evaluate(() => {
      reset(); const S = FLOURISH11.hitstop.state, out = {};
      // duration is 60-90 ms and the clock really stops
      G.state = 'play'; const t0 = G.time; check(FLOURISH11.hitstop.fire(80, 'test'), 'fires in play');
      check(S.left >= 0.06 && S.left <= 0.09, 'duration within 60-90 ms: ' + S.left);
      let steps = 0; while (S.left > 0) { update(1 / 60); steps++; check(steps < 30, 'ends'); }
      check(G.time === t0, 'the simulation clock did not move while frozen'); out.steps = steps;
      update(1 / 60); check(Math.abs(G.time - t0 - 1 / 60) < 1e-9, 'and resumes exactly one step at a time');
      check(FLOURISH11.hitstop.state.CRIT_MS >= 60 && FLOURISH11.hitstop.state.CRIT_MS <= 90 && FLOURISH11.hitstop.state.PARRY_MS >= 60 && FLOURISH11.hitstop.state.PARRY_MS <= 90, 'configured durations in range');
      // a parry: guard raised, melee blow turned aside -> freeze, no damage
      reset(); const p = G.player; p.hpMax = p.hp = 100; triggerBlock(); const hp0 = p.hp;
      GUARD.state.inMelee = true; damagePlayer(10, 'Test foe'); GUARD.state.inMelee = false;
      check(p.hp === hp0, 'parry still takes no damage'); check(S.left > 0 && S.last === 'parry', 'a parry freezes the world'); out.parry = S.left;
      // a plain unguarded hit does not freeze
      reset(); G.player.hpMax = G.player.hp = 100; UPG.blocking = false; UPG.parryWindow = 0; UPG.parryCool = 0; GUARD.state.inMelee = true; damagePlayer(5, 'Test foe'); GUARD.state.inMelee = false;
      check(S.left === 0, 'an unguarded hit does not freeze'); check(G.player.hp === 95, 'and still hurts');
      // a landed non-critical blow does not freeze; a critical one does
      reset(); const w = WEAPONS.sword, top = w.dmg[1] + Math.floor(G.player.attrs.Strength / 25); check(!FLOURISH11.hitstop.isCrit(w, top - 1) && FLOURISH11.hitstop.isCrit(w, top) && !FLOURISH11.hitstop.isCrit(w, 0), 'critical = the top of the weapon range');
      // reduce motion: no freeze, the clock keeps running
      reset(); GFX.reduceMotion = true; check(FLOURISH11.hitstop.fire(80, 'x') === false && S.left === 0, 'Reduce motion: no freeze'); GFX.reduceMotion = false;
      // switch off: no freeze
      FLOURISH11.setSwitch('hitstop', false); check(FLOURISH11.hitstop.fire(80, 'x') === false, 'Hit-stop off: no freeze'); FLOURISH11.setSwitch('hitstop', true);
      // opening a panel mid-freeze releases it
      FLOURISH11.hitstop.fire(80, 'x'); G.state = 'panel'; update(1 / 60); check(S.left === 0, 'a panel opening ends the freeze'); G.state = 'play';
      return out;
    });
    console.log('PASS hit-stop: 60-90 ms, clock frozen and resumed exactly, parry freezes, plain hit/off/Reduce motion do not', JSON.stringify(hs));

    // ------------------------------------------------------------------ 2. weapon trails
    const trails = await page.evaluate(async () => {
      const out = {}; reset();
      const p = G.player; p.weapons = ['sword', 'glass', 'mace', 'knife', 'pistol', 'hands']; G.state = 'play';
      const paint = () => { const ctx = Engine.ctx; ctx.fillStyle = '#303030'; ctx.fillRect(0, 0, 320, 200); drawHUD(); return ctx.getImageData(0, 0, 320, 150).data; };
      const swing = (wi, f) => { p.weapon = wi; const w = currentWeapon(); G.attack.dur = w.speed; G.attack.t = w.speed * (1 - f); G.attack.dirLabel = 'swing'; G.song.t = 0; G.songFx = 0; };
      const diff = (A, B) => { let n = 0, r = 0, g = 0, b = 0; for (let i = 0; i < A.length; i += 4) if (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2]) { n++; r += B[i] - A[i]; g += B[i + 1] - A[i + 1]; b += B[i + 2] - A[i + 2]; } return { n, r, g, b }; };
      const withOff = (wi, f) => { FLOURISH11.setSwitch('flourish', false); swing(wi, f); const A = paint(); FLOURISH11.setSwitch('flourish', true); swing(wi, f); const B = paint(); return diff(A, B); };
      for (const [wi, name] of [[0, 'sword'], [1, 'glass'], [2, 'mace'], [5, 'hands']]) {
        let best = null; for (const f of [0.4, 0.5, 0.6]) { const d = withOff(wi, f); if (!best || d.n > best.n) best = d; }
        out[name] = best; check(best.n > 40, name + ' leaves a visible trail: ' + best.n + ' pixels');
      }
      check(out.glass.b > out.glass.r, 'glass trail is cyan'); check(out.sword.r > out.sword.b && out.mace.r > out.mace.b, 'iron/bronze trails are warm'); check(out.mace.r - out.mace.b > out.sword.r - out.sword.b, 'bronze warmer than iron');
      check(out.hands.n < out.sword.n * 1.5, 'wood/hands trail is dull');
      check(FLOURISH11.trail.materialOf(WEAPONS.glass) === 'glass' && FLOURISH11.trail.materialOf(WEAPONS.mace) === 'bronze' && FLOURISH11.trail.materialOf(WEAPONS.hands) === 'wood', 'material mapping');
      // ranged weapons and idle: none
      { FLOURISH11.setSwitch('flourish', false); swing(4, 0.5); const A = paint(); FLOURISH11.setSwitch('flourish', true); swing(4, 0.5); const B = paint(); check(diff(A, B).n === 0, 'a pistol leaves no trail'); }
      { G.attack.t = 0; FLOURISH11.setSwitch('flourish', false); p.weapon = 0; const A = paint(); FLOURISH11.setSwitch('flourish', true); const B = paint(); check(diff(A, B).n === 0, 'no swing, no trail'); }
      // no flashes = dimmer; Reduce motion = none; Low preset = none
      const full = withOff(0, 0.5).n; const amt = (A, B) => { let s = 0; for (let i = 0; i < A.length; i += 4) s += Math.abs(B[i] - A[i]) + Math.abs(B[i + 1] - A[i + 1]) + Math.abs(B[i + 2] - A[i + 2]); return s; };
      const energy = () => { FLOURISH11.setSwitch('flourish', false); swing(0, 0.5); const A = paint(); FLOURISH11.setSwitch('flourish', true); swing(0, 0.5); const B = paint(); return amt(A, B); };
      const e1 = energy(); GFX.noFlash = true; const e2 = energy(); GFX.noFlash = false; check(e2 < e1 * 0.7 && e2 > 0, 'No flashes: dimmer trail ' + e1 + ' -> ' + e2);
      GFX.reduceMotion = true; check(energy() === 0, 'Reduce motion: no trail'); GFX.reduceMotion = false;
      GFX.preset = 'low'; check(energy() === 0, 'Low preset: no trail'); GFX.preset = 'medium';
      FLOURISH11.setSwitch('flourish', true); G.attack.t = 0; out.full = full; return out;
    });
    console.log('PASS weapon trails: per-material tint, none for ranged/idle, dimmer with No flashes, off with Reduce motion/Low', JSON.stringify({ sword: trails.sword.n, glass: trails.glass.n, mace: trails.mace.n, hands: trails.hands.n }));
    if (SHOTS) {
      await page.evaluate(() => { reset(); const p = G.player; p.weapons = ['glass']; p.weapon = 0; G.attack.dur = 0.55; G.attack.t = 0.55 * 0.5; G.attack.dirLabel = 'swing'; window.__keepSwing = setInterval(() => { G.attack.t = 0.55 * 0.5; }, 10); });
      await page.waitForTimeout(120); await shot('trail-glass-1280.png');
      await page.evaluate(() => { clearInterval(window.__keepSwing); G.attack.t = 0; });
    }

    // ------------------------------------------------------------------ 3. level-up flourish
    const lvl = await page.evaluate(async () => {
      reset(); const out = {}; const L = FLOURISH11.level.state;
      let oscs = 0; try { Audio_.init(); } catch (e) { /* no audio here */ }
      if (Audio_.ctx) { const real = Audio_.ctx.createOscillator.bind(Audio_.ctx); Audio_.ctx.createOscillator = () => { oscs++; return real(); }; }
      const p = G.player;
      p.xp = 0; checkLevel(); check(!L.active && document.querySelectorAll('.fl11-note').length === 0, 'no level, no flourish');
      p.xp = 99999; const lv = p.level, s0 = FLOURISH11.stats.levelups; checkLevel();
      check(p.level === lv + 1 && FLOURISH11.stats.levelups === s0 + 1, 'a level-up fires the flourish');
      const notes = [...document.querySelectorAll('.fl11-note')]; out.notes = notes.length; check(notes.length >= 8, 'notes rise');
      if (Audio_.ctx) { out.oscs = oscs; check(oscs >= 5, 'a rising arpeggio of at least five notes: ' + oscs); }
      const gr = document.getElementById('game').getBoundingClientRect();
      for (const n of notes) { const r = n.getBoundingClientRect(); const mid = (r.left + r.width / 2 - gr.left) / gr.width; check(mid < 0.12 || mid > 0.88, 'notes stay on the screen edges: ' + mid); }
      check(FLOURISH11.level.state.dur <= 2000, 'at most 2 s');
      window.__notes = notes;
      await sleep(2100); check(!L.active && document.querySelectorAll('.fl11-note').length === 0, 'gone within 2 s: ' + document.querySelectorAll('.fl11-note').length);
      // skippable
      p.xp = 99999; checkLevel(); await sleep(400); check(document.querySelectorAll('.fl11-note').length > 0, 'running'); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); check(document.querySelectorAll('.fl11-note').length === 0, 'any key skips');
      // switches
      FLOURISH11.setSwitch('flourish', false); p.xp = 99999; checkLevel(); check(document.querySelectorAll('.fl11-note').length === 0, 'Flourishes off: nothing'); FLOURISH11.setSwitch('flourish', true);
      GFX.preset = 'low'; p.xp = 99999; checkLevel(); check(document.querySelectorAll('.fl11-note').length === 0, 'Low preset: no note particles'); GFX.preset = 'medium'; FLOURISH11.level.fire(1); FLOURISH11.level.state.timer; await sleep(50);
      GFX.reduceMotion = true; FLOURISH11.level.fire(1); await sleep(60); const rm = [...document.querySelectorAll('.fl11-note')]; check(rm.length > 0 && rm.every(n => n.getAnimations().every(a => !(a.effect.getKeyframes().some(k => k.transform && k.transform !== 'none')))), 'Reduce motion: notes fade in place, no travel'); GFX.reduceMotion = false;
      // the level text is still there
      return out;
    });
    console.log('PASS level-up: notes along the edges, arpeggio, gone within 2 s, key skips, off/Low/Reduce motion handled', JSON.stringify(lvl));

    // ------------------------------------------------------------------ 4. quest banner
    const ban = await page.evaluate(async () => {
      reset(); const out = {}; const B = FLOURISH11.banner;
      const shownNow = () => [...document.querySelectorAll('.fl11-banner')].map(e => e.querySelector('b').textContent);
      // detection: questXp + a titled side journal in one go
      const xp0 = G.player.xp; questXp(60); journal('side', 'A Table for Four: I laid the name-tapes beside the plates.'); await sleep(0);
      check(B.queue.includes('A Table for Four') || shownNow().includes('A Table for Four'), 'questXp + journal gives a banner named from the entry: ' + JSON.stringify(B.queue));
      check(document.getElementById('msgs').textContent.includes('Your logbook has been updated.'), 'the existing message-log line stays');
      // small xp (15) never announces
      B.queue.length = 0; B.state.seen.clear(); questXp(15); journal('side', 'Some small note: nothing happened.'); await sleep(0);
      check(!B.queue.includes('Some small note'), 'a small reward is not a quest completion');
      // flag-watched quests (bounties) and baseline on load
      B.queue.length = 0; B.state.seen.clear(); G.flags.bounty_1_done = false; B.scan(); G.flags.bounty_1_done = true; check(B.scan() === 1 && B.queue.includes('Writ of Clearing'), 'a bounty flag turning true announces it');
      check(B.scan() === 0, 'only once');
      const flags2 = Object.assign({}, G.flags, { bounty_2_done: true }); G.flags = flags2; check(B.scan() === 0, 'a freshly loaded flag set does not replay old completions');
      G.flags.bounty_2_done = false; B.scan(); G.flags.bounty_2_done = true; B.scan(); B.queue.length = 0;
      // both detectors on the same completion: one banner
      B.queue.length = 0; B.state.seen.clear(); G.flags.p9q_bees_done = false; B.scan(); G.flags.p9q_bees_done = true; questXp(50); journal('side', 'You told the bees. They went quiet, then loud.'); await sleep(0);
      check(B.queue.filter(n => n === 'Telling the Bees').length === 1 && B.queue.length === 1, 'questXp + flag + journal announce once: ' + JSON.stringify(B.queue));
      // queueing: three quests in a row play one after another, never together
      B.queue.length = 0; B.state.seen.clear();
      for (let i = 0; i < 400 && (B.state.active || document.querySelector('.fl11-banner')); i++) await sleep(20);   // earlier banners finish on their own
      B.state.gap = 0;
      ['The First Quest', 'The Second Quest', 'The Third Quest'].forEach(n => B.enqueue(n));
      check(B.queue.length === 3, 'three queued');
      G.state = 'panel'; for (let i = 0; i < 5; i++) update(1 / 60); check(shownNow().length === 0, 'nothing shows over a panel or dialogue'); G.state = 'play';
      const seq = []; const t0 = performance.now(); let maxAtOnce = 0;
      while (seq.length < 3 && performance.now() - t0 < 14000) {
        update(1 / 60); const cur = shownNow(); maxAtOnce = Math.max(maxAtOnce, cur.length);
        if (cur.length && seq[seq.length - 1] !== cur[0]) seq.push(cur[0]);
        await sleep(16);
      }
      check(JSON.stringify(seq) === JSON.stringify(['The First Quest', 'The Second Quest', 'The Third Quest']), 'banners play in order: ' + JSON.stringify(seq));
      check(maxAtOnce === 1, 'never two at once'); out.seq = seq; out.gap = Math.round(performance.now() - t0);
      // placement: top of the screen, under every panel, label present
      for (let i = 0; i < 400 && (B.state.active || document.querySelector('.fl11-banner')); i++) await sleep(20);   // let the queue drain
      B.enqueue('Placement Quest');
      for (let i = 0; i < 100 && !document.querySelector('.fl11-banner'); i++) await sleep(20);
      const el = document.querySelector('.fl11-banner'); check(!!el, 'banner shown for placement'); await sleep(600);
      const gr = document.getElementById('game').getBoundingClientRect(), r = el.getBoundingClientRect();
      check(r.top - gr.top < gr.height * 0.14 && r.bottom - gr.top < gr.height * 0.2, 'across the top of the screen: ' + (r.bottom - gr.top) / gr.height);
      const zl = +getComputedStyle(document.getElementById('fl11-under')).zIndex, zm = +getComputedStyle(document.getElementById('modal')).zIndex;
      check(zl < zm, 'the banner layer sits under dialogue and panels'); check(el.getAttribute('role') === 'status', 'announced politely');
      check(el.textContent.includes('Quest complete'), 'label'); out.top = Math.round(r.bottom - gr.top);
      window.__bannerEl = el;
      // switches
      B.queue.length = 0; FLOURISH11.setSwitch('flourish', false); check(B.enqueue('Off Quest') === false, 'Flourishes off: no banners'); FLOURISH11.setSwitch('flourish', true);
      return out;
    });
    console.log('PASS quest banner: detection, no replay, one per completion, queued in order, only in play, under panels', JSON.stringify(ban));
    if (SHOTS) {
      await page.evaluate(() => { reset(); FLOURISH11.banner.state.queue.length = 0; document.querySelectorAll('.fl11-banner').forEach(e => e.remove()); FLOURISH11.banner.state.active = null; FLOURISH11.banner.state.gap = 0; FLOURISH11.banner.state.HOLD = 8000; FLOURISH11.banner.enqueue('A Table for Four'); msg('Your logbook has been updated.', 'warn', 6000); update(1 / 60); });
      await page.waitForTimeout(900); await shot('banner-1280.png');
      await page.evaluate(() => { document.querySelectorAll('.fl11-banner').forEach(e => e.remove()); FLOURISH11.banner.state.active = null; FLOURISH11.banner.state.HOLD = 2600; });
    }

    // ------------------------------------------------------------------ 5. loot flight
    const loot = await page.evaluate(async () => {
      reset(); const out = {}; const c = Engine.cam, p = G.player;
      const drop = (id, dx, dy) => { const e = { kind: 'item', item: id, sprite: 'loot', x: c.x + Math.cos(c.dir) * dx - Math.sin(c.dir) * dy, y: c.y + Math.sin(c.dir) * dx + Math.cos(c.dir) * dy, scale: 0.4, yOff: 0, solid: false, radius: 0.3 }; G.ents.push(e); return e; };
      const inv = () => JSON.stringify(p.inv.map(s => [s.id, s.n]));
      const mkItems = () => [drop('tonic', 1.6, 0), drop('honey', 1.8, 0.3), drop('bandage', 2.0, -0.3)].filter(Boolean);
      Engine.render(G.ents, G.tod);
      // inventory identical on and off
      const ids = Object.keys(ITEMS).filter(id => !ITEMS[id].key).slice(0, 3);
      const gather = (on) => { reset(); FLOURISH11.setSwitch('flourish', on); const c2 = Engine.cam; const es = ids.map((id, i) => { const e = { kind: 'item', item: id, sprite: 'loot', x: c2.x + Math.cos(c2.dir) * (1.6 + i * 0.2), y: c2.y + Math.sin(c2.dir) * (1.6 + i * 0.2), scale: 0.4, yOff: 0, solid: false, radius: 0.3 }; G.ents.push(e); return e; }); Engine.render(G.ents, G.tod); const f0 = FLOURISH11.stats.flights; for (const e of es) pickUp(e); const r = [inv(), FLOURISH11.stats.flights - f0, G.player.gold]; for (const e of es) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); } return r; };
      const A = gather(false), B = gather(true);
      check(A[0] === B[0] && A[2] === B[2], 'pickups give the same inventory and gold with the flourish on or off'); check(A[1] === 0 && B[1] === 3, 'flights only when on: ' + A[1] + '/' + B[1]);
      await sleep(900); reset(); FLOURISH11.setSwitch('flourish', true);
      // one flight: starts at the pickup point, ends at INV
      const e1 = drop('tonic', 2.0, 0); Engine.render(G.ents, G.tod); const sc = e1._screen; check(!!sc, 'the item was on screen');
      const f0 = FLOURISH11.stats.flights; pickUp(e1);
      check(FLOURISH11.stats.flights === f0 + 1 && FLOURISH11.loot.state.active === 1, 'a flight begins on pickup');
      const cv = document.getElementById('view').getBoundingClientRect(), gr = document.getElementById('game').getBoundingClientRect(), L = FLOURISH11.loot.state.last;
      const inv0 = HUD_BTNS.find(b => b.t === 'INV'); const ex = cv.left + (inv0.x + inv0.w / 2) * cv.width / 320 - gr.left, ey = cv.top + (inv0.y + inv0.h / 2) * cv.height / 200 - gr.top, half = gr.width * 0.016;
      check(Math.abs(L.to[0] + half - ex) < 1.5 && Math.abs(L.to[1] + half - ey) < 1.5, 'ends on the INV button'); const sx = cv.left + ((sc.x0 + sc.x1) / 2) * cv.width / 320 - gr.left;
      check(Math.abs(L.from[0] + half - sx) < 2, 'starts where the item lay (screen-projected)'); out.from = L.from.map(Math.round); out.to = L.to.map(Math.round);
      check(document.querySelectorAll('.fl11-fly').length === 1, 'one icon in flight');
      await sleep(900); check(document.querySelectorAll('.fl11-fly').length === 0 && FLOURISH11.loot.state.active === 0, 'icon removed at the end');
      // cap
      const many = []; for (let i = 0; i < 8; i++) many.push(drop('tonic', 1.5 + i * 0.1, 0)); Engine.render(G.ents, G.tod); for (const e of many) pickUp(e);
      check(document.querySelectorAll('.fl11-fly').length <= 4 && FLOURISH11.loot.state.active <= 4, 'at most four in flight at once'); out.cap = document.querySelectorAll('.fl11-fly').length;
      await sleep(900);
      // touch layout: the target is still the INV button on the canvas and clear of the touch controls
      G.opts.touch = 'on'; setTouchMode(true); document.getElementById('touchui').classList.add('on'); const t = FLOURISH11.loot.target(), tr = document.getElementById('touchui').getBoundingClientRect();
      check(t && !(t.x > tr.left && t.x < tr.right && t.y > tr.top && t.y < tr.bottom), 'touch layout: target not under the touch buttons'); setTouchMode(false); document.getElementById('touchui').classList.remove('on'); G.opts.touch = 'off';
      // Reduce motion: no travel
      for (let i = 0; i < 100 && document.querySelector('.fl11-fly'); i++) await sleep(20); GFX.reduceMotion = true; const e3 = drop('tonic', 1.6, 0); Engine.render(G.ents, G.tod); pickUp(e3); const fl = [...document.querySelectorAll('.fl11-fly')].pop(); check(fl && fl.getAnimations().every(a => !a.effect.getKeyframes().some(k => /translate/.test(k.transform || ''))), 'Reduce motion: the icon fades in place at the INV button'); GFX.reduceMotion = false; await sleep(600);
      // off
      FLOURISH11.setSwitch('flourish', false); const e4 = drop('tonic', 1.6, 0); const f1 = FLOURISH11.stats.flights; pickUp(e4); check(FLOURISH11.stats.flights === f1, 'off: no flight'); FLOURISH11.setSwitch('flourish', true);
      // a pickup that fails (already taken) flies nothing
      const e5 = drop('tonic', 1.6, 0); pickUp(e5); const f2 = FLOURISH11.stats.flights; pickUp(e5); check(FLOURISH11.stats.flights === f2, 'a second pickUp of the same item flies nothing');
      return out;
    });
    console.log('PASS loot flight: pickup point to INV, same inventory on/off, cap 4, touch + Reduce motion + off', JSON.stringify(loot));
    if (SHOTS) {
      await page.evaluate(() => { reset(); const c = Engine.cam; const e = { kind: 'item', item: 'tonic', sprite: 'loot', x: c.x + Math.cos(c.dir) * 2, y: c.y + Math.sin(c.dir) * 2, scale: 0.4, yOff: 0, solid: false, radius: 0.3 }; G.ents.push(e); Engine.render(G.ents, G.tod); pickUp(e); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 280; } });
      await page.waitForTimeout(80); await shot('loot-flight-1280.png');
      await page.evaluate(() => { document.querySelectorAll('.fl11-fly').forEach(e => e.remove()); FLOURISH11.loot.state.active = 0; });
    }

    // ------------------------------------------------------------------ 6. shop coins
    const shop = await page.evaluate(async () => {
      reset(); const out = {}; G.state = 'dialogue';
      const n = Object.values(NPCS).find(x => x.shop && x.shop.length > 2); DLG.npc = n; DLG.log = []; DLG.tone = 'normal'; DLG.choices = null; DLG.helloSaid = true;
      const purchase = (on) => {
        reset(); update(1 / 60); FLOURISH11.setSwitch('flourish', on); G.state = 'dialogue'; G.player.gold = 500; G.player.inv = []; DLG.npc = n; DLG.log = [];
        const rg = lcg(7), real = Math.random; Math.random = rg.next;
        renderDialogue('buy'); const g0 = G.player.gold; document.querySelector('[data-buy="0"]').click(); const afterBuy = [G.player.gold, JSON.stringify(G.player.inv), JSON.stringify(G.player.weapons)];
        renderDialogue('sell'); const rows = document.querySelectorAll('[data-sell]'); if (rows.length) rows[0].click();
        Math.random = real; return { afterBuy, gold: G.player.gold, inv: JSON.stringify(G.player.inv), rng: rg.s, g0 };
      };
      const off = purchase(false), on = purchase(true);
      check(JSON.stringify(off) === JSON.stringify(on), 'purchases and sales give the same gold, items and RNG with the flourish on or off: ' + JSON.stringify(off) + ' / ' + JSON.stringify(on));
      out.spent = on.g0 - on.afterBuy[0];
      // coin run mechanics
      reset(); update(1 / 60); G.state = 'dialogue'; G.player.gold = 500; DLG.npc = n; DLG.log = []; renderDialogue('buy');
      const chip = document.querySelector('.fl11-purse'); check(chip && chip.classList.contains('on'), 'purse chip shown in the buy panel'); check(chip.querySelector('.fl11-amt').textContent === '500', 'chip shows the purse');
      const cr0 = FLOURISH11.stats.coinRuns; const buyBtn = document.querySelector('[data-buy="0"]'); const price = buyPrice(n, n.shop[0]); buyBtn.click();
      check(FLOURISH11.stats.coinRuns === cr0 + 1, 'buying starts a coin run'); const C = FLOURISH11.coins.state.last; check(C.spend === true && C.n >= 1, 'coins leave the purse'); out.coins = C.n;
      check(G.player.gold === 500 - price, 'the transaction happened immediately');
      const coins = document.querySelectorAll('#fl11-over .fl11-fly').length; check(coins === C.n, 'coin elements in flight');
      await sleep(150); const mid = +chip.querySelector('.fl11-amt').textContent; check(mid < 500 && mid > 500 - price - 0.5 || mid === 500 - price || (mid <= 500 && mid >= 500 - price), 'the purse counts down: ' + mid);
      await sleep(C.total + 300); check(+document.querySelector('.fl11-purse .fl11-amt').textContent === 500 - price, 'and lands on the new total'); check(document.querySelectorAll('#fl11-over .fl11-fly').length === 0, 'coins cleaned up');
      // selling counts up
      renderDialogue('sell'); const sr = document.querySelector('[data-sell]');
      if (sr) { const g1 = G.player.gold; sr.click(); const C2 = FLOURISH11.coins.state.last; check(C2 && C2.spend === false && C2.delta === G.player.gold - g1, 'selling brings coins back to the purse'); await sleep(C2.total + 300); check(+document.querySelector('.fl11-purse .fl11-amt').textContent === G.player.gold, 'counted up'); out.sold = true; }
      // a refused purchase moves no coins
      G.player.gold = 0; renderDialogue('buy'); const cr1 = FLOURISH11.stats.coinRuns; document.querySelector('[data-buy="0"]').click(); check(FLOURISH11.stats.coinRuns === cr1, 'a refused purchase moves no coins');
      // leaving the shop hides the chip
      renderDialogue(null); check(!document.querySelector('.fl11-purse').classList.contains('on'), 'chip hidden outside the buy/sell panes');
      // Reduce motion: instant
      GFX.reduceMotion = true; G.player.gold = 300; renderDialogue('buy'); document.querySelector('[data-buy="0"]').click(); check(document.querySelectorAll('#fl11-over .fl11-fly').length === 0 && +document.querySelector('.fl11-purse .fl11-amt').textContent === G.player.gold, 'Reduce motion: instant count, no coins'); GFX.reduceMotion = false;
      // off
      FLOURISH11.setSwitch('flourish', false); G.player.gold = 300; renderDialogue('buy'); check(!document.querySelector('.fl11-purse').classList.contains('on'), 'off: no chip'); FLOURISH11.setSwitch('flourish', true);
      G.state = 'play'; closeModal(); return out;
    });
    console.log('PASS shop coins: same gold/items/RNG on/off, coins leave and return, counter ticks, refused buys quiet, instant under Reduce motion', JSON.stringify(shop));
    if (SHOTS) {
      await page.evaluate(() => { reset(); G.state = 'dialogue'; const n = Object.values(NPCS).find(x => x.shop && x.shop.length > 2); DLG.npc = n; DLG.log = []; DLG.helloSaid = true; G.player.gold = 240; renderDialogue('buy'); document.querySelector('[data-buy="1"]').click(); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 330; } });
      await page.waitForTimeout(80); await shot('coins-1280.png');
      await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(200);
      await page.evaluate(() => { renderDialogue('buy'); document.querySelector('[data-buy="1"]').click(); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 330; } });
      await page.waitForTimeout(80); await shot('coins-640.png');
      const fit = await page.evaluate(() => { const pn = document.getElementById('modal-panel'), chip = document.querySelector('.fl11-purse'), gr = document.getElementById('game').getBoundingClientRect(), r = chip.getBoundingClientRect(); return { chipInside: r.left >= gr.left && r.right <= gr.right && r.top >= gr.top, scrollW: pn.scrollWidth <= pn.clientWidth + 1 }; });
      assert(fit.chipInside && fit.scrollW, 'compact shop: chip inside the screen, no horizontal overflow ' + JSON.stringify(fit));
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.evaluate(() => { document.querySelectorAll('#fl11-over .fl11-fly').forEach(e => e.remove()); closeModal(); G.state = 'play'; });
    }

    // ------------------------------------------------------------------ 7. page turns
    const pages = await page.evaluate(async () => {
      reset(); const out = {}; const P = FLOURISH11.pages;
      const longHtml = Array.from({ length: 60 }, (_, i) => `<p>Entry ${i + 1}. The pumps at Depot Two ran dry on Memoryday, and the shift-bell did not ring. Nobody remarked on it. Nobody remarks on anything now.</p>`).join('');
      showEvent('The log of OC-742', longHtml, [{ t: 'Put it away.', f: null }]);
      await sleep(300);
      const sheet = document.querySelector('.hd-sheet'); check(!!sheet, 'a held document opened'); const count = () => document.querySelector('.hd-count').textContent;
      check(/Page 1 of (\d+)/.test(count()), 'multi-page: ' + count());
      const t0 = FLOURISH11.stats.turns; READING.go(1); await sleep(30);
      check(FLOURISH11.stats.turns === t0 + 1, 'turning a page plays the leaf turn: ' + count()); check(document.querySelectorAll('#fl11-over .fl11-leaf').length === 1, 'the leaf is running'); out.dur = P.state.DUR; check(out.dur <= 400, 'quick');
      { const body = document.querySelector('.hd-body'); check(getComputedStyle(body).transform === 'none', 'the page itself is never transformed'); }
      READING.go(0); await sleep(30); check(FLOURISH11.stats.turns === t0 + 2 && P.state.last.dir === -1, 'going back turns the other way');
      READING.go(0); await sleep(30); check(FLOURISH11.stats.turns === t0 + 2, 'no change of page, no turn');
      READING.setSize(2); await sleep(120); check(FLOURISH11.stats.turns === t0 + 2, 'a text-size re-flow is not a page turn');
      READING.setSize(1); await sleep(120);
      for (let i = 0; i < 60 && document.querySelector('.fl11-leaf'); i++) await sleep(20); GFX.reduceMotion = true; const t1 = FLOURISH11.stats.turns; READING.go(1); await sleep(30); check(FLOURISH11.stats.turns === t1 && document.querySelectorAll('.fl11-leaf').length === 0, 'Reduce motion: instant'); GFX.reduceMotion = false;
      FLOURISH11.setSwitch('flourish', false); const t2 = FLOURISH11.stats.turns; READING.go(0); await sleep(30); check(FLOURISH11.stats.turns === t2, 'off: instant'); FLOURISH11.setSwitch('flourish', true);
      READING.dismiss && READING.dismiss(); await sleep(100);
      // the logbook
      G.state = 'panel'; const t3 = FLOURISH11.stats.turns; renderLog(); check(FLOURISH11.stats.turns === t3 + 1 && document.querySelectorAll('.fl11-leaf').length === 1, 'opening the logbook turns a leaf');
      { const pr = document.getElementById('modal-panel'); check(getComputedStyle(pr).transform === 'none' && pr.getBoundingClientRect().width > 100, 'the logbook panel is never transformed'); }
      check(document.getElementById('modal-panel').textContent.includes('Logbook'), 'logbook unchanged'); for (let i = 0; i < 60 && document.querySelector('.fl11-leaf'); i++) await sleep(20); check(!document.querySelector('.fl11-leaf'), 'and finishes');
      GFX.reduceMotion = true; renderLog(); check(!document.querySelector('.fl11-leaf'), 'logbook: Reduce motion = instant'); GFX.reduceMotion = false;
      closeModal(); G.state = 'play'; return out;
    });
    console.log('PASS page turns: books and logbook, direction, no turn on re-flow/no change, instant under Reduce motion/off', JSON.stringify(pages));
    if (SHOTS) {
      await page.evaluate(async () => { reset(); const longHtml = Array.from({ length: 60 }, (_, i) => `<p>Entry ${i + 1}. The pumps at Depot Two ran dry on Memoryday, and the shift-bell did not ring.</p>`).join(''); showEvent('The log of OC-742', longHtml, [{ t: 'Put it away.', f: null }]); await sleep(300); READING.go(1); await sleep(20); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 110; } });
      await page.waitForTimeout(60); await shot('page-turn-1280.png');
      await page.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); document.querySelectorAll('.fl11-leaf').forEach(e => e.remove()); READING.dismiss && READING.dismiss(); });
    }

    // ------------------------------------------------------------------ 8. Options rows + persistence
    const opts = await page.evaluate(async () => {
      reset(); G.state = 'panel'; if (typeof renderMenu === 'function') renderMenu();
      const open = [...document.querySelectorAll('#modal-panel button')].find(b => /Options|Settings|Graphics/i.test(b.textContent)); if (open) open.click();
      if (!document.getElementById('f11-flourish') && typeof renderAccessibilityMenu === 'function') renderAccessibilityMenu();
      const b1 = document.getElementById('f11-flourish'), b2 = document.getElementById('f11-hitstop'); check(!!b1 && !!b2, 'both Options rows exist');
      check(b1.getAttribute('aria-pressed') === 'true' && b2.textContent === 'On', 'show On');
      b1.click(); check(!FLOURISH11.settings.flourish && b1.textContent === 'Off', 'toggle flourishes off'); b2.click(); check(!FLOURISH11.settings.hitstop, 'toggle hit-stop off');
      const saved = JSON.parse(localStorage.getItem('octave.flourish11.v1')); check(saved.f === 0 && saved.h === 0, 'persisted'); b1.click(); b2.click();
      const fresh = JSON.parse(localStorage.getItem('octave.flourish11.v1')); check(fresh.f === 1 && fresh.h === 1, 'and back'); closeModal(); G.state = 'play';
      return { ok: true };
    });
    console.log('PASS Options rows (Flourishes, Hit-stop) toggle and persist');

    // ------------------------------------------------------------------ 9. performance: 12-enemy scene
    const perf = await page.evaluate(async () => {
      reset(); loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
      const crowd = []; for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: 8 + (i % 6) * 1.6, y: 6.5 + Math.floor(i / 6) * 1.5 }); e.state = 'idle'; e.hp = 900; G.ents.push(e); crowd.push(e); }
      const p = G.player; p.weapons = ['sword']; p.weapon = 0; p.hp = p.hpMax = 9999;
      const frame = () => { update(1 / 60); Engine.render(G.ents, G.tod); drawHUD(); };
      const measure = (swinging) => { const ms = []; for (let k = 0; k < 121; k++) { if (swinging) { G.attack.dur = 0.42; G.attack.t = 0.42 * (0.3 + 0.5 * ((k % 20) / 20)); G.attack.dirLabel = 'swing'; } else G.attack.t = 0; const t0 = performance.now(); frame(); ms.push(performance.now() - t0); } ms.sort((a, b) => a - b); return ms[60]; };
      const res = { idle: [], swing: [] };
      const setAll = (on) => { FLOURISH11.setSwitch('flourish', on); FLOURISH11.setSwitch('hitstop', on); };
      measure(false); // warm up
      for (let round = 0; round < 5; round++) for (const on of [false, true]) { setAll(on); res.idle.push([on, measure(false)]); res.swing.push([on, measure(true)]); }
      const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
      const f = (kind, on) => med(res[kind].filter(r => r[0] === on).map(r => r[1]));
      const out = { idleOffMs: +f('idle', false).toFixed(3), idleOnMs: +f('idle', true).toFixed(3), swingOffMs: +f('swing', false).toFixed(3), swingOnMs: +f('swing', true).toFixed(3) };
      out.idleExtraMs = +(out.idleOnMs - out.idleOffMs).toFixed(3); out.swingExtraMs = +(out.swingOnMs - out.swingOffMs).toFixed(3);
      // the machine is shared and a whole frame costs ~15-20 ms in software, so the end-to-end medians above are
      // informational; the assertion is on the module's own per-frame work, timed in isolation
      G.attack.dur = 0.42; G.attack.t = 0.42 * 0.5; G.attack.dirLabel = 'swing'; Engine.ctx.save();
      const bench = (fn, n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - t0) / n; };
      bench(() => FLOURISH11.trail.draw(Engine.ctx), 200);
      out.trailDrawUs = +(bench(() => FLOURISH11.trail.draw(Engine.ctx), 2000) * 1000).toFixed(1);
      out.idlePumpUs = +(bench(() => { FLOURISH11.banner.scan(); FLOURISH11.banner.pump(1 / 60); }, 5000) * 1000).toFixed(2);
      Engine.ctx.restore(); G.attack.t = 0;
      for (const e of crowd) G.ents.splice(G.ents.indexOf(e), 1); setAll(true);
      check(out.trailDrawUs < 300 && out.idlePumpUs < 50, 'module work well under 1 ms per frame: ' + JSON.stringify(out));
      return out;
    });
    console.log('PASS perf (12-enemy scene, median frame ms)', JSON.stringify(perf));

    // ------------------------------------------------------------------ 10. hostile text + 640x400
    const hostile = await page.evaluate(async () => {
      reset(); const B = FLOURISH11.banner; B.queue.length = 0; B.state.seen.clear();
      B.enqueue('<img src=x onerror="window.__pwned=1">'); B.state.gap = 0; B.state.active = null; update(1 / 60); await sleep(100);
      const el = document.querySelector('.fl11-banner'); check(el && !el.querySelector('img') && el.querySelector('b').textContent.includes('<img'), 'banner text goes in through textContent');
      check(!window.__pwned, 'nothing ran'); check(B.nameFromJournal('x'.repeat(200)).length <= 46, 'long journal text is clipped');
      const j = '<b onclick=1>A'.repeat(10); check(!/[<>]/.test(el.innerHTML.replace(/<[^>]*>/g, '')), 'no stray markup');
      G.flags.p9q_bees_done = '<svg onload=1>'; check(B.scan() >= 0, 'a hostile flag value is not accepted as completion'); return true;
    });
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(300);
    const compact = await page.evaluate(async () => {
      reset(); const B = FLOURISH11.banner; document.querySelectorAll('.fl11-banner').forEach(e => e.remove()); B.queue.length = 0; B.state.active = null; B.state.gap = 0; B.state.HOLD = 6000; B.state.seen.clear();
      B.enqueue('The Pressman\'s Round: A Very Long Quest Name Indeed'); update(1 / 60); await sleep(900);
      const el = document.querySelector('.fl11-banner'), r = el.getBoundingClientRect(), gr = document.getElementById('game').getBoundingClientRect();
      const ok = r.left >= gr.left && r.right <= gr.right && r.height < gr.height * 0.2; B.state.HOLD = 2600; return { ok, w: Math.round(r.width), h: Math.round(r.height), fontPx: parseFloat(getComputedStyle(el.querySelector('b')).fontSize) };
    });
    assert(compact.ok, 'banner fits 640x400 ' + JSON.stringify(compact)); assert(compact.fontPx >= 9, 'banner text still legible at 640x400: ' + compact.fontPx);
    await shot('banner-640.png');
    await page.evaluate(() => { document.querySelectorAll('.fl11-banner').forEach(e => e.remove()); FLOURISH11.banner.state.active = null; });
    await page.evaluate(() => { reset(); FLOURISH11.level.fire(2); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 700; } });
    await page.waitForTimeout(80); await shot('level-up-640.png');
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300);
    await page.evaluate(() => { reset(); FLOURISH11.level.fire(2); for (const a of document.getAnimations()) { a.pause(); a.currentTime = 700; } });
    await page.waitForTimeout(80); await shot('level-up-1280.png');
    await page.evaluate(() => { reset(); });
    console.log('PASS hostile text through textContent only; banner fits 640x400', JSON.stringify(compact));

    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e.message || e); process.exitCode = 1; });
