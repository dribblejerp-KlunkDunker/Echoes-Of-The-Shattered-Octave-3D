// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:PORT node test/telegraphs.test.js
// Pins js/telegraphs.js: the Pressman/Deacon casting tell delays (never changes) their effect, and
// mid-play spawns get a collision-safe entrance. Optional: TELEGRAPH_SHOTS=<dir> writes screenshots.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof TELEGRAPHS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Telegraph Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // we drive time by hand

    const out = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const r = {};
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      const seeded = (s) => { s = s * 104729 + 977777; return () => (s = (s * 16807) % 2147483647) / 2147483647; };   // seeds spread out, first draws not tiny
      const realRandom = Math.random;
      const log = []; const _msg = msg; msg = function (t, c, ttl) { log.push(t); return _msg(t, c, ttl); };
      const count = (re) => log.filter(t => re.test(t)).length;
      const LEAD = TELEGRAPHS.CFG.lead;
      // a quiet stage: belfry floor, player at (3.5,7.5) facing east
      const mine = [];
      function stage(id, pos) {
        for (const m of Object.values(G.maps)) for (const o of mine) { const i = m.entities.indexOf(o); if (i >= 0) m.entities.splice(i, 1); }
        mine.length = 0;
        loadMap(id || 'belfry', pos || { x: 3.5, y: 7.5, dir: 0 }); G.state = 'play'; G.fadeT = 0;
        Engine.setWeather({}); if (typeof PARTICLES !== 'undefined') PARTICLES.list.length = 0;
        G.player.hp = G.player.hpMax; G.dead = false; log.length = 0;
      }
      function mk(type, x, y, seen) {
        const e = hydrate({ kind: 'enemy', type, x, y }); G.ents.push(e); mine.push(e); mine.push(e);
        e.state = 'chase'; e.alertT = 8; e.cool = 0; if (seen !== false) e._tgSeen = true; return e;
      }
      GFX.telegraphs = true;
      check(GFX.telegraphs === true && !GFX.FX.includes('telegraphs'), 'GFX.telegraphs defaults on and is not a GFX.FX effect');

      // ---------- Pressman: the press lands exactly LEAD after the tell starts ----------
      function pressRun(dt, flag, seed) {
        stage(); GFX.telegraphs = flag; Math.random = seeded(seed);
        const p = G.player; p.glassed = true; G.glassLock = 0;
        const e = mk('pressman', 4.3, 7.5);
        const hp0 = p.hp; let n = 0, landed = -1, startedAt = -1;
        for (; n < 200; n++) {
          enemyUpdate(e, dt);
          if (e._cast && startedAt < 0) startedAt = n;
          if (p.hp < hp0) { landed = n; break; }
        }
        return { n: landed, startedAt, dmg: hp0 - p.hp, lock: G.glassLock, cool: e.cool, castLeft: !!e._cast, e };
      }
      const off = pressRun(0.05, false, 11);
      check(off.n === 0 && off.dmg > 0, 'flag off: the press lands on the first tick, as before (' + off.n + ')');
      check(off.lock === 8, 'flag off: the proctor-style lock still applies');
      for (const dt of [0.05, 0.016, 0.1]) {
        const on = pressRun(dt, true, 11);
        const expect = Math.ceil(LEAD / dt - 1e-9);   // ticks of tell, then the landing tick
        check(on.startedAt === 0, 'the tell starts on the first tick (dt ' + dt + ')');
        check(on.n === expect, 'dt ' + dt + ': press lands on tick ' + expect + ' (tell time ' + (expect * dt).toFixed(3) + 's), got ' + on.n);
        check((on.n) * dt >= LEAD - 1e-9 && (on.n - 1) * dt < LEAD, 'dt ' + dt + ': never lands before the lead time, and within one tick of it');
        check(on.dmg === off.dmg && on.lock === 8 && on.cool === 1.5, 'damage ' + on.dmg + '/' + off.dmg + ', glass lock and the 1.5 s cooldown are unchanged');
        r['press_dt' + dt] = on.n;
      }
      // the written cue appears once per cast
      stage(); GFX.telegraphs = true; Math.random = seeded(3);
      { const e = mk('pressman', 4.3, 7.5); for (let i = 0; i < 40; i++) enemyUpdate(e, 0.05);
        check(count(/Mallow raises the press/) >= 1, 'the cast writes its cue');
        // 40 ticks = 2 s: one 0.6 s tell, a 1.5 s cooldown, so exactly one cast so far
        check(count(/Mallow raises the press/) === 1, 'one cue per cast, not per tick'); }
      stage(); Math.random = seeded(3);
      { const e = mk('pressman', 4.3, 7.5); for (let i = 0; i < 12; i++) enemyUpdate(e, 0.05);   // exactly one tell
        check(count(/Mallow raises the press/) === 1, 'exactly one cue during one tell (' + count(/Mallow raises the press/) + ')'); }

      // ---------- cancelled by stun or death ----------
      function cancelRun(kind) {
        stage(); GFX.telegraphs = true; Math.random = seeded(5);
        const e = mk('pressman', 4.3, 7.5); const hp0 = G.player.hp;
        for (let i = 0; i < 6; i++) enemyUpdate(e, 0.05);
        check(!!e._cast, 'mid-tell');
        if (kind === 'stun') e.stun = 1.0; else { e.dead = true; e.hidden = true; }
        for (let i = 0; i < 18; i++) enemyUpdate(e, 0.05);   // 0.9 s: far beyond the lead
        const landedEarly = G.player.hp < hp0;
        return { e, landedEarly, cast: !!e._cast };
      }
      let c = cancelRun('stun'); check(!c.landedEarly && !c.cast, 'a stun during the tell cancels the press');
      for (let i = 0; i < 40; i++) enemyUpdate(c.e, 0.05);
      check(G.player.hp < G.player.hpMax, 'after the stun he casts again (and lands) normally');
      c = cancelRun('dead'); check(!c.landedEarly && !c.cast, 'a caster who dies during the tell never lands it');
      r.cancel = 'ok';

      // ---------- Deacon: the bell ----------
      function deaconRun(dt, flag, seed) {
        stage(); GFX.telegraphs = flag; Math.random = seeded(seed);
        const guard = hydrate({ kind: 'enemy', type: 'tongueless', x: 7.5, y: 7.5 }); guard.giftGuard = true; guard.state = 'idle'; guard._tgSeen = true; G.ents.push(guard); mine.push(guard);
        const e = mk('deacon', 5.0, 7.5); G.mutedT = 0;
        let n = 0, landed = -1;
        for (; n < 200; n++) { enemyUpdate(e, dt); if (guard.state === 'chase') { landed = n; break; } }
        return { n: landed, e, auraT: e.auraT, msgs: count(/lifts the clapperless bell/) };
      }
      const dOff = deaconRun(0.05, false, 9);
      check(dOff.n === 0 && dOff.auraT === 10 && dOff.msgs === 1, 'flag off: the bell lands on the first tick with its 10 s cooldown');
      for (const dt of [0.05, 0.016]) {
        const d = deaconRun(dt, true, 9), expect = Math.ceil(LEAD / dt - 1e-9);
        check(d.n === expect, 'deacon dt ' + dt + ': bell lands on tick ' + expect + ', got ' + d.n);
        check(d.n * dt >= LEAD - 1e-9 && (d.n - 1) * dt < LEAD, 'deacon never lands before the lead time');
        check(d.auraT === 10 && d.msgs === 1, 'deacon cooldown unchanged (10 s), the original line prints once');
        check(count(/Deacon lifts the bell/) === 1, 'deacon: one written cue per cast');
        r['deacon_dt' + dt] = d.n;
      }
      // stun cancels the bell
      stage(); GFX.telegraphs = true;
      { const guard = hydrate({ kind: 'enemy', type: 'tongueless', x: 7.5, y: 7.5 }); guard.giftGuard = true; guard.state = 'idle'; guard._tgSeen = true; G.ents.push(guard); mine.push(guard);
        const e = mk('deacon', 5.0, 7.5); for (let i = 0; i < 5; i++) enemyUpdate(e, 0.05);
        check(!!e._cast, 'deacon is casting'); e.stun = 0.5; enemyUpdate(e, 0.05);
        check(!e._cast, 'stun cancels the bell'); for (let i = 0; i < 10; i++) enemyUpdate(e, 0.05);
        check(guard.state === 'idle' && e.auraT !== 10, 'the bell did not land');
        e.dead = true; e.hidden = true; }
      // stepping out of range during the tell dodges it
      stage(); { const guard = hydrate({ kind: 'enemy', type: 'tongueless', x: 7.5, y: 7.5 }); guard.giftGuard = true; guard.state = 'idle'; guard._tgSeen = true; G.ents.push(guard); mine.push(guard);
        const e = mk('deacon', 5.0, 7.5); for (let i = 0; i < 5; i++) enemyUpdate(e, 0.05);
        e.x = 11.0;   // the player backs away: 7.5 from the Deacon
        for (let i = 0; i < 12; i++) enemyUpdate(e, 0.05);
        check(guard.state === 'idle', 'out of range when the tell ends: the bell does not reach you'); e.dead = true; e.hidden = true; }

      // ---------- the pose and the glow ----------
      stage(); GFX.telegraphs = true;
      { const e = mk('pressman', 4.3, 7.5); const t = (n) => { for (let i = 0; i < n; i++) enemyUpdate(e, 0.05); animCreature(e, 0.05, ANIM.T += 0.05); };
        animCreature(e, 0.05, 1); const sy0 = e.animSY, lift0 = e.animLift;
        t(1); const a = e.animSY; t(8); const b = e.animSY;
        check(!!e._cast && b > a && e.animSY > 1.05, 'arms raise: stretch grows through the tell (' + a.toFixed(3) + ' -> ' + b.toFixed(3) + ')');
        check(e.animLift > lift0 + 0.03 && e.animGlow > 0.6, 'lift and glow build during the tell');
        r.pose = { sy0, sy: b, lift: e.animLift, glow: e.animGlow };
        e.dead = true; e.hidden = true; }

      // ---------- entrances: style by type and map ----------
      const CS = TELEGRAPHS.chooseStyle;
      check(CS('weaverling', 'catacombs', false, false, true) === 'ceiling' && CS('broodmother', 'catacombs', false, false, true) === 'ceiling', 'brood drop from the ceiling indoors');
      check(CS('weaverling', 'whispergrove', true, false, true) === 'mist', 'a weaverling outdoors has no ceiling: mist');
      check(CS('drowned', 'deepwoods', true, false, true) === 'ground' && CS('dirge', 'oakhaven', true, true, false) === 'ground', 'grave types rise from the ground in the graveyard maps or near graves');
      check(CS('dirge', 'deepwoods', true, false, true) === 'mist' && CS('quiet', 'whispergrove', true, false, true) === 'mist' && CS('hushmoth', 'whispergrove', true, false, true) === 'mist', 'quiet/hushmoth/dirge use mist in mist maps');
      check(CS('hound', 'clearing', true, false, false) === 'mist', 'anything else fades in through a mist puff');

      // ---------- the entrance itself ----------
      function freeSpotAhead(d) {
        const c = Engine.cam; let best = null;
        for (const dd of [d, d + 0.5, d - 0.5, d + 1]) for (const da of [0, 0.3, -0.3, 0.6, -0.6]) {
          const x = c.x + Math.cos(c.dir + da) * dd, y = c.y + Math.sin(c.dir + da) * dd;
          if (!best && !solidAt(x, y) && !solidAt((x + c.x) / 2, (y + c.y) / 2)) best = { x, y };
        }
        return best || { x: c.x + Math.cos(c.dir) * d, y: c.y + Math.sin(c.dir) * d };
      }
      function entranceRun(mapId, pos, type, d) {
        stage(mapId, pos); GFX.telegraphs = true; Math.random = seeded(21);
        const s = freeSpotAhead(d), e = hydrate({ kind: 'enemy', type, x: s.x, y: s.y }); e.state = 'chase'; e.alertT = 8; G.ents.push(e); mine.push(e);
        const hp0 = G.player.hp, x0 = e.x, y0 = e.y; let t = 0, bad = '';
        enemyUpdate(e, 0.05); t += 0.05;
        const style = e._tg && e._tg.style; const total = TELEGRAPHS.entranceLen();
        while (e._tg && t < 5) {
          if (e.solid) bad = 'solid during entrance'; if (G.player.hp < hp0) bad = 'harmed during entrance';
          if (e.x !== x0 || e.y !== y0) bad = 'moved during entrance';
          enemyUpdate(e, 0.05); t += 0.05;
        }
        return { e, style, t, bad, total, solidAfter: e.solid, hp0 };
      }
      const probes = [['deepwoods', null, 'drowned', 'ground'], ['catacombs', null, 'weaverling', 'ceiling'], ['whispergrove', null, 'quiet', 'mist']];
      for (const [map, , type, style] of probes) {
        const m = G.maps[map]; const sp = m.spawn || { x: 3.5, y: 3.5, dir: 0 };
        // find a heading with 2 free cells ahead
        let ok = null; for (let k = 0; k < 16 && !ok; k++) { const dir = k * Math.PI / 8; stage(map, { x: sp.x, y: sp.y, dir }); const s = freeSpotAhead(2); if (!solidAt(s.x, s.y) && !solidAt(sp.x + (s.x - sp.x) / 2, sp.y + (s.y - sp.y) / 2)) ok = dir; }
        check(ok != null, map + ': found open ground ahead of the spawn');
        const q = entranceRun(map, { x: sp.x, y: sp.y, dir: ok }, type, 2);
        check(q.style === style, map + '/' + type + ' picks ' + style + ', got ' + q.style);
        check(!q.bad, map + ': ' + q.bad);
        check(Math.abs(q.t - q.total) < 0.06, map + ': entrance lasts ' + q.total + 's (' + q.t.toFixed(2) + ')');
        check(q.solidAfter === true, map + ': solid again after the entrance');
        // then it acts normally: it closes on the player and strikes
        let acted = false, tt = 0; for (let i = 0; i < 160 && !acted; i++) { enemyUpdate(q.e, 0.05); if (G.player.hp < q.hp0 || dist2(q.e.x, q.e.y, Engine.cam.x, Engine.cam.y) < 4) acted = true; tt += 0.05; }
        check(acted, map + ': after the entrance the enemy chases/attacks');
        r['entrance_' + style] = { t: +q.t.toFixed(2) };
      }
      // the written entrance never changes when the flag is off
      stage(); GFX.telegraphs = false;
      { const s = freeSpotAhead(2), e = hydrate({ kind: 'enemy', type: 'hound', x: s.x, y: s.y }); e.state = 'chase'; e.alertT = 8; G.ents.push(e); mine.push(e);
        const x0 = e.x; enemyUpdate(e, 0.05); check(!e._tg && e.solid && e.x !== x0, 'flag off: no entrance, acts on the first tick ' + JSON.stringify([!!e._tg, e.solid, e.x, x0, e.state, solidAt(e.x, e.y, e), G.player.glassed])); }
      // the pressed flag toggled mid-entrance restores solidity
      stage(); GFX.telegraphs = true;
      { const s = freeSpotAhead(2), e = hydrate({ kind: 'enemy', type: 'hound', x: s.x, y: s.y }); e.state = 'chase'; G.ents.push(e); mine.push(e);
        enemyUpdate(e, 0.05); check(!!e._tg && !e.solid, 'entering'); GFX.telegraphs = false; enemyUpdate(e, 0.05); check(!e._tg && e.solid, 'turning the flag off ends the entrance and restores solidity'); GFX.telegraphs = true; }

      // ---------- map-load entities are not new arrivals ----------
      stage('tavern', { x: 8.5, y: 10.5, dir: -Math.PI / 2 });
      for (const e of G.ents) if (e.kind === 'enemy') check(e._tgSeen === true, 'enemies present at load never get an entrance');

      // ---------- collision-safe spawn points ----------
      stage(); GFX.telegraphs = true;
      { // inside a wall: find a blocked cell with open ground within 1 of it
        const m = G.map; let wall = null;
        for (let y = 0; y < m.h && !wall; y++) for (let x = 0; x < m.w && !wall; x++) if (m.isBlocked(x, y) && Math.hypot(x + 0.5 - Engine.cam.x, y + 0.5 - Engine.cam.y) > 2.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!wall && x + dx >= 0 && y + dy >= 0 && x + dx < m.w && y + dy < m.h && !m.isBlocked(x + dx, y + dy) && !solidAt(x + dx + 0.5, y + dy + 0.5)) wall = { x: x + 0.5, y: y + 0.5 };
        check(!!wall, 'found a wall cell next to open ground ' + JSON.stringify([m.w, m.h, m.width, m.height, Object.keys(m).slice(0, 12)]));
        const e = hydrate({ kind: 'enemy', type: 'hound', x: wall.x, y: wall.y }); e.state = 'chase'; G.ents.push(e); mine.push(e);
        enemyUpdate(e, 0.05);
        check(!!e._tg, 'a spawn requested inside a wall still gets its telegraph');
        check(!solidAt(e.x, e.y, e), 'the nudged spawn point is free ground (' + e.x.toFixed(2) + ',' + e.y.toFixed(2) + ')');
        const moved = Math.hypot(e.x - wall.x, e.y - wall.y); check(moved > 0 && moved <= 1.5 + 1e-6, 'nudged by ' + moved.toFixed(2) + ' <= 1.5');
        check(e.homeX === e.x && e.homeY === e.y, 'its home follows the nudge');
        r.wallNudge = +moved.toFixed(2);
        e.dead = true; e.hidden = true; }
      stage();
      { // on the player
        const c = Engine.cam, e = hydrate({ kind: 'enemy', type: 'hound', x: c.x, y: c.y }); e.state = 'chase'; G.ents.push(e); mine.push(e);
        enemyUpdate(e, 0.05); check(!!e._tg, 'a spawn on the player still telegraphs');
        const d = Math.hypot(e.x - c.x, e.y - c.y); check(d >= TELEGRAPHS.CFG.minPlayer - 1e-6 && d <= 1.5 + 1e-6, 'moved off the player by ' + d.toFixed(2));
        // two arrivals at one point do not stack
        const f = hydrate({ kind: 'enemy', type: 'hound', x: e.x, y: e.y }); f.state = 'chase'; G.ents.push(f); mine.push(f); enemyUpdate(f, 0.05);
        check(!!f._tg && Math.hypot(f.x - e.x, f.y - e.y) >= 0.6 - 1e-6, 'a second arrival is nudged off the first');
        e.dead = true; e.hidden = true; f.dead = true; f.hidden = true; }
      stage();
      { // nowhere free within 1.5: no telegraph, a clean normal spawn
        const _solid = solidAt; solidAt = () => true;
        const s = freeSpotAhead(1.5), e = hydrate({ kind: 'enemy', type: 'hound', x: s.x, y: s.y }); e.state = 'chase'; G.ents.push(e); mine.push(e);
        const x0 = e.x, y0 = e.y; enemyUpdate(e, 0.05); solidAt = _solid;
        check(!e._tg && e.solid && e.x === x0 && e.y === y0, 'no free spot within 1.5: telegraph cancelled, enemy spawns normally where it was asked');
        e.dead = true; e.hidden = true; }

      // ---------- frame cost: the post hook in isolation (median of many calls), plus the whole frame ----------
      stage(); Engine.cam.dir = 0; GFX.telegraphs = true;
      let FI = null; Engine.addPostHook((F) => { FI = F; }, 99);
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      const timeHook = (n) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); TELEGRAPHS.hook(FI); ts.push(performance.now() - t0); } return med(ts); };
      const frame = () => { const ts = []; for (let i = 0; i < 60; i++) { const t0 = performance.now(); Engine.render(G.ents, G.tod); ts.push(performance.now() - t0); } return med(ts); };
      const pm = mk('pressman', 4.4, 7.5), dc = mk('deacon', 5.2, 7.2);
      Engine.render(G.ents, G.tod);
      const cost = {};
      cost.hookIdle_ms = +timeHook(200).toFixed(4);
      pm._cast = { t: 0.55 }; Engine.render(G.ents, G.tod); cost.hookOneCaster_ms = +timeHook(200).toFixed(3);
      dc._cast = { t: 0.55 }; Engine.render(G.ents, G.tod); cost.hookTwoCasters_ms = +timeHook(200).toFixed(3);
      cost.frameTwoCasters_ms = +frame().toFixed(1);
      pm._cast = null; dc._cast = null;
      const en = []; for (const [x, y, ty, st] of [[4.8, 6.6, 'drowned', 'ground'], [5.2, 8.2, 'weaverling', 'ceiling'], [6.0, 7.5, 'quiet', 'mist']]) { const e = mk('hound', x, y); e.type = ty; e._tg = { style: st, t: 1.0, solid: true }; e.solid = false; en.push(e); }
      Engine.render(G.ents, G.tod);
      for (const e of en) { const keep = en.map(o => o._tg); for (const o of en) o._tg = null; e._tg = keep[en.indexOf(e)]; Engine.render(G.ents, G.tod); cost['hook_' + e._tg.style + '_ms'] = +timeHook(200).toFixed(3); for (const o of en) o._tg = keep[en.indexOf(o)]; }
      Engine.render(G.ents, G.tod); cost.hookThreeEntrances_ms = +timeHook(200).toFixed(3);
      cost.frameThreeEntrances_ms = +frame().toFixed(1);
      for (const e of en) { e._tg = null; e.dead = true; e.hidden = true; }
      GFX.telegraphs = false; cost.frameOff_ms = +frame().toFixed(1); GFX.telegraphs = true;
      check(cost.hookTwoCasters_ms < 25 && cost.hookThreeEntrances_ms < 25, 'the hook stays cheap even on a slow box: ' + JSON.stringify(cost));
      // wrapper overhead on an ordinary enemy
      const h = mk('hound', 9.5, 7.5); h.state = 'idle';
      const t1 = performance.now(); for (let i = 0; i < 5000; i++) enemyUpdate(h, 0.001); const wrapped = (performance.now() - t1) / 5000;
      GFX.telegraphs = false; const t2 = performance.now(); for (let i = 0; i < 5000; i++) enemyUpdate(h, 0.001); const plain = (performance.now() - t2) / 5000; GFX.telegraphs = true;
      cost.enemyUpdateWrapped_us = +(wrapped * 1000).toFixed(2); cost.enemyUpdatePlain_us = +(plain * 1000).toFixed(2);
      r.cost = cost;
      Math.random = realRandom; msg = _msg;
      return r;
    });
    console.log('PASS telegraphs: casting tells delay by exactly the lead, cancel on stun/death, entrances are collision-safe, flag off restores timing', JSON.stringify(out));

    // ---------- screenshots (optional) ----------
    if (process.env.TELEGRAPH_SHOTS) {
      const dir = process.env.TELEGRAPH_SHOTS; fs.mkdirSync(dir, { recursive: true });
      async function shot(name, setup) {
        const b64 = await page.evaluate(setup);
        fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(b64, 'base64'));
      }
      const prep = `
        window.__frame = (n) => { for (let i = 0; i < n; i++) { ANIM.last = performance.now() / 1000 - 0.016; animFrame(); } Engine.render(G.ents, G.tod); const s = 3, V = Engine.canvas.height * 150 / 200 ; const c = document.createElement('canvas'); c.width = 320 * s; c.height = 150 * s; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; const sc = Engine.getScale(); x.drawImage(Engine.canvas, 0, 0, 320 * sc, 150 * sc, 0, 0, c.width, c.height); return c.toDataURL('image/png').split(',')[1]; };
        window.__scene = (map, pos, type, d) => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; loadMap(map, pos); G.state = 'play'; G.fadeT = 0; Engine.setWeather({}); if (typeof PARTICLES !== 'undefined') PARTICLES.list.length = 0; GFX.telegraphs = true; const c = Engine.cam; const e = hydrate({ kind: 'enemy', type, x: c.x + Math.cos(c.dir) * d, y: c.y + Math.sin(c.dir) * d }); G.ents.push(e); return e; };`;
      await page.evaluate(prep);
      const casts = [['pressman', 4.2], ['deacon', 4.2]];
      for (const [type] of casts) for (const k of [0.1, 0.5, 1.0]) {
        await shot(`cast-${type}-${Math.round(k * 100)}`, `(() => { const e = __scene('belfry', { x: 3.5, y: 7.5, dir: 0 }, '${type}', 1.9); e._tgSeen = true; e.state = 'chase'; e.alertT = 8; e.cool = 0; e._cast = { t: ${k} * TELEGRAPHS.CFG.lead }; e.facing = Math.PI; const g = G.ents.filter(o => o.kind === 'enemy' && o !== e); return __frame(3); })()`);
      }
      for (const [name, map, type] of [['ground', 'deepwoods', 'drowned'], ['ceiling', 'catacombs', 'weaverling'], ['mist', 'whispergrove', 'quiet']]) for (const t of [0.35, 0.95, 1.25]) {
        await shot(`entrance-${name}-${Math.round(t * 100)}`, `(() => { const sp = G.maps['${map}'].spawn; let dir = 0; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; const x = sp.x + Math.cos(a) * 2, y = sp.y + Math.sin(a) * 2; if (!solidAt(x, y) && !solidAt(sp.x + Math.cos(a), sp.y + Math.sin(a))) { dir = a; break; } } const e = __scene('${map}', { x: sp.x, y: sp.y, dir }, '${type}', 2.1); e.state = 'chase'; enemyUpdate(e, 0.01); e._tg.t = ${t}; return __frame(3); })()`);
      }
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
