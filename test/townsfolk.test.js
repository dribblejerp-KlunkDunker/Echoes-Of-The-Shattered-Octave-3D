// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/townsfolk.test.js
// Phase 4 townsfolk: talking gestures / glances, work loops (barman, tanner, mill), and the
// daily routines (who stands where by hour) with the save / load / time-skip guarantees.
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof TOWNSFOLK !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Folk Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    const out = await page.evaluate(() => {
      const r = {}, fails = [];
      const check = (c, m) => { if (!c) fails.push(m); };
      const hrs = []; for (let h = 0; h < 24; h += 0.25) hrs.push(h);
      const setH = (h, force = true) => { G.tod = h / 24; TOWNSFOLK.apply(force); };
      const allEnts = () => { const l = []; for (const id in G.maps) for (const e of G.maps[id].entities) l.push([id, e]); return l; };
      const roster = () => allEnts().filter(([, e]) => e._tf);
      G.state = 'play'; G.fadeT = 0;

      // ---------------- 1. the roster resolved, stand-ins are transient extras past baseCount
      check(roster().length === TOWNSFOLK.ROSTER.length, 'every roster entry found its entity (' + roster().length + '/' + TOWNSFOLK.ROSTER.length + ')');
      TOWNSFOLK.apply(true); const tav = G.maps.tavern, stands = tav.entities.filter(e => e._tfStand);
      check(stands.length === TOWNSFOLK.ROSTER.filter(x => x.slot != null).length, 'one tavern stand-in per slot');
      check(stands.every(e => e.transient && tav.entities.indexOf(e) >= tav.baseCount), 'stand-ins are transient and appended past baseCount');
      check(roster().every(([, e]) => e.kind === 'npc' && (e.id === 'townsman' || e.id === 'townswoman') && !e.lawGuard && !e.nightWatch && !e.requires && !e.until), 'the roster is only generic, duty-free townsfolk');
      r.roster = roster().length;

      // ---------------- 2. quest-critical NPCs: derive the list from the data and prove none is touched
      const generic = new Set(['townsman', 'townswoman']);
      const noQuest = fn => /^\(?[a-z_]*\)?\s*=>\s*null\s*$/.test(String(fn).trim());
      const critical = Object.keys(NPCS).filter(id => !generic.has(id) && NPCS[id].quest && !noQuest(NPCS[id].quest));
      check(critical.length >= 8, 'found the quest-bearing NPCs from data.js (' + critical.join(',') + ')');
      check(!TOWNSFOLK.ROSTER.some(x => critical.includes(x.id)), 'no quest-bearing NPC is in the roster');
      // baseline: hidden flags with routines OFF at each hour, for every non-roster entity
      const sig = () => allEnts().filter(([, e]) => !e._tf && !e._tfStand).map(([id, e]) => (e.hidden ? 1 : 0)).join('');
      GFX.routines = false; const baseSig = {}; for (const h of hrs) { setH(h); baseSig[h] = sig(); }
      GFX.routines = true;
      let diffs = 0, missing = [];
      for (const h of hrs) {
        setH(h);
        if (sig() !== baseSig[h]) diffs++;
        for (const [id, e] of allEnts()) if (e.kind === 'npc' && critical.includes(e.id) && !e.requires && !e.until && !e.nightWatch && !e.dead) {
          if (e.hidden) missing.push(id + ':' + e.id + '@' + h);
        }
      }
      check(diffs === 0, 'routines never change a non-roster entity at any of ' + hrs.length + ' hours (' + diffs + ' differ)');
      check(missing.length === 0, 'every quest-bearing NPC is present at every hour: ' + missing.slice(0, 4));
      // and the named quest NPCs are all actually in the world to be found
      const present = new Set(allEnts().filter(([, e]) => e.kind === 'npc').map(([, e]) => e.id));
      for (const id of ['hetty', 'hob', 'nell', 'pim', 'bettany', 'tam', 'harrow', 'rooke', 'orla', 'vane']) check(present.has(id), id + ' exists');
      r.critical = critical.length;

      // ---------------- 3. the pure function: every hour, state matches stateAt
      let bad = 0;
      for (const h of hrs) {
        setH(h);
        for (const [id, e] of roster()) {
          const st = TOWNSFOLK.stateAt(e._tf, h);
          if (!!e.hidden !== (st !== 'work')) bad++;
          if (e._tfStandIn && !!e._tfStandIn.hidden !== (st !== 'tavern')) bad++;
          if (e._tfStandIn && st === 'tavern' && !G.maps.tavern.entities.includes(e._tfStandIn)) bad++;
        }
      }
      check(bad === 0, 'hidden flags equal the schedule at every hour (' + bad + ' wrong)');
      // an original and its stand-in are never both out
      let both = 0; for (const h of hrs) { setH(h); for (const [, e] of roster()) if (e._tfStandIn && !e.hidden && !e._tfStandIn.hidden) both++; }
      check(both === 0, 'never in two places at once');
      // some variety: at noon, at the Boar in the evening, at night
      setH(12); const noon = roster().filter(([, e]) => !e.hidden).length;
      setH(19.5); const eve = G.maps.tavern.entities.filter(e => e._tfStand && !e.hidden).length;
      setH(3); const night = roster().filter(([, e]) => !e.hidden).length;
      check(noon >= 5 && eve >= 2 && night <= 1, 'noon ' + noon + ' out, evening ' + eve + ' in the tavern, night ' + night + ' out');
      r.shape = [noon, eve, night];

      // ---------------- 4. positions: nobody in a wall or on a door
      const doorsNear = (m, x, y, d) => { for (let cy = Math.floor(y - d); cy <= Math.floor(y + d); cy++) for (let cx = Math.floor(x - d); cx <= Math.floor(x + d); cx++) { const c = m.get(cx, cy); if (c && c.door && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) < d) return true; } return false; };
      let spotBad = [];
      for (const [mid, e] of allEnts().filter(([, e]) => e._tf || e._tfStand)) {
        const m = G.maps[mid];
        if (m.isBlocked(e.x | 0, e.y | 0)) spotBad.push(e._tf ? e._tf.key : e._tfStand + ' in wall');
        if (doorsNear(m, e.x, e.y, 1.6)) spotBad.push((e._tf ? e._tf.key : e._tfStand) + ' near a door');
        for (const [dx, dy] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) if (m.isBlocked((e.x + dx) | 0, (e.y + dy) | 0)) spotBad.push((e._tf ? e._tf.key : e._tfStand) + ' corner in wall');
        for (const o of m.entities) if (o !== e && e._tfStand && o.solid && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < (o.radius || 0.3) + 0.35 + 0.15 && !o._tfStand) spotBad.push((e._tf ? e._tf.key : e._tfStand) + ' overlaps ' + (o.id || o.sprite));
        // stand-ins also stay clear of the tavern's player spawn and keep the doorway reachable
        if (e._tfStand && Math.hypot(e.x - m.spawn.x, e.y - m.spawn.y) < 2) spotBad.push(e._tfStand + ' too close to the entrance');
      }
      check(spotBad.length === 0, 'no one stands in a wall, on a door or on furniture: ' + spotBad.slice(0, 5));
      // a walkable route from the tavern entrance to every stand-in's neighbour (grid flood fill, solid entities block)
      {
        const m = G.maps.tavern, W = m.w, H = m.h, blocked = new Uint8Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.isBlocked(x, y)) blocked[y * W + x] = 1;
        for (const e of m.entities) if (e.solid && !e.dead && e.kind !== 'item' && !e.hidden || e._tfStand) if (e.solid) blocked[(e.y | 0) * W + (e.x | 0)] = 1;
        const q = [[m.spawn.x | 0, m.spawn.y | 0]], seen = new Set([q[0].join()]);
        while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked[ny * W + nx] || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny]); } }
        const hetty = m.entities.find(e => e.id === 'hetty');
        const reach = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(((x | 0) + dx) + ',' + ((y | 0) + dy)));
        check(reach(hetty.x, hetty.y), 'the barman can still be reached with every stand-in seated');
        check(m.entities.filter(e => e.id === 'vane' || e.id === 'hetty').every(e => reach(e.x, e.y)), 'Vane and Hetty stay reachable');
      }

      // ---------------- 5. save at hour X, load -> the same state
      const snapState = () => JSON.stringify(roster().map(([, e]) => [e._tf.key, !!e.hidden, !!(e._tfStandIn && e._tfStandIn.hidden)]));
      const results = [];
      for (const h of [3, 6.5, 9, 12.5, 16.9, 17.2, 19.5, 21, 23.5]) {
        setH(h); loadMap('oakhaven', { x: 23.5, y: 10.5, dir: 0 }); G.state = 'play';
        const before = snapState(), save = JSON.parse(JSON.stringify(snapshotGame()));
        // wreck the live state, then load: stale hidden flags must not survive
        setH((h + 11) % 24); for (const [, e] of roster()) e.hidden = !e.hidden;
        restoreGame(save);
        results.push(snapState() === before);
        check(Math.abs(G.tod * 24 - h) < 0.01, 'tod restored at ' + h);
      }
      check(results.every(Boolean), 'save at hour X then load gives the same state at every sampled hour: ' + results.join());
      // a save whose stored hidden flags disagree with its clock (hand-edited / older) is corrected on load
      {
        setH(12); loadMap('oakhaven', { x: 23.5, y: 10.5, dir: 0 }); G.state = 'play';
        const save = JSON.parse(JSON.stringify(snapshotGame()));
        save.tod = 3 / 24; // same entity flags, but it is now 3 in the morning
        restoreGame(save);
        const out3 = roster().filter(([, e]) => !e.hidden).length;
        check(out3 <= 1, 'a save with stale flags is brought to its own hour on load (' + out3 + ' out at 3h)');
        // and in the tavern map (stand-ins rebuilt fresh)
        setH(19.5); loadMap('tavern', { x: 8.5, y: 9.5, dir: -Math.PI / 2 }); G.state = 'play';
        const sv = JSON.parse(JSON.stringify(snapshotGame()));
        restoreGame(sv);
        check(G.ents.filter(e => e._tfStand && !e.hidden).length >= 2 && G.ents.every(e => !e._tfStand || G.ents.includes(e)), 'stand-ins are in the tavern after loading a tavern save');
        check(JSON.stringify(sv).indexOf('_tfStand') < 0 && !sv.maps.tavern.extra.some(x => x.id === 'townsman' || x.id === 'townswoman'), 'stand-ins are never written to a save');
        check(sv.maps.tavern.ents.length === tav.baseCount, 'the saved entity count is unchanged (' + sv.maps.tavern.ents.length + ')');
      }

      // ---------------- 6. time skips: passHours across boundaries, rest, travel
      G.maps.oakhaven.entities.forEach(() => { });
      setH(16.5); loadMap('oakhaven', { x: 23.5, y: 10.5, dir: 0 }); G.state = 'play';
      const A = roster().find(([, e]) => e._tf.key === 'orchardA')[1];
      check(!A.hidden && A._tfStandIn.hidden, 'at 16:30 the orchard hand is working');
      passHours(1);
      check(A.hidden && !A._tfStandIn.hidden && Math.abs(G.tod * 24 - 17.5) < 0.01, 'passHours(1) across 17:00 sends him to the Boar');
      passHours(5);
      check(A.hidden && A._tfStandIn.hidden, 'passHours(5) across 22:00 sends him home');
      passHours(9);
      check(!A.hidden && A._tfStandIn.hidden, 'passHours(9) across dawn brings him back to work');
      passHours(48 - 0.0); check(!A.hidden, 'a two-day skip lands on the same state');
      r.dayWrap = G.day;

      // ---------------- 7. live ticks apply boundaries (out of view at once, in view after a short wait)
      loadMap('oakhaven', { x: 62.5, y: 5.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.tod = 16.99 / 24; TOWNSFOLK.apply(true);
      check(!A.hidden, 'before the boundary he is out');
      for (let i = 0; i < 40; i++) update(0.1);   // 4 s -> past 17:00 at 90 s per hour? (4 s = ~2.7 game minutes)
      check(A.hidden, 'far from the player, the change lands on the tick after the hour');
      // in view: stand 3 cells away looking at him
      G.tod = 16.99 / 24; TOWNSFOLK.apply(true); A.hidden = false; A._tfWait = 0;
      Engine.cam.x = A.x - 3; Engine.cam.y = A.y; Engine.cam.dir = 0; G.tod = 17.01 / 24;
      const watchedNow = los(Engine.cam.x, Engine.cam.y, A.x, A.y);
      TOWNSFOLK.apply(false, 0.1);
      check(!watchedNow || !A.hidden, 'a change in front of the player waits');
      TOWNSFOLK.apply(false, TOWNSFOLK.WAIT_MAX + 1);
      check(A.hidden, 'and lands once the wait is over');
      // dialogue is never interrupted
      A.hidden = false; A._tfWait = 0; DLG.ent = A; G.state = 'dialogue'; TOWNSFOLK.apply(false, 99);
      check(!A.hidden, 'nobody vanishes mid-conversation'); G.state = 'play'; DLG.ent = null;

      // ---------------- 8. switch off: original state
      for (const h of [3, 12, 19.5]) {
        GFX.routines = false; setH(h);
        check(roster().every(([, e]) => !e.hidden && (!e._tfStandIn || e._tfStandIn.hidden)), 'routines off at ' + h + ': everyone where the original had them');
      }
      GFX.routines = true;
      // greening Oakhaven: no routine, the original behaviour
      G.flags.greening = true; setH(3); check(roster().every(([, e]) => !e.hidden), 'during the greening the routines stand down'); delete G.flags.greening;

      r.fails = fails;
      return r;
    });
    console.log('routines:', JSON.stringify(out));
    assert.deepEqual(out.fails, [], 'routine checks: ' + out.fails.join(' | '));
    console.log('PASS routines (every hour, save/load, time skips, positions, switch off)');

    // ------------------------------------------------------------------ gestures + work loops
    const out2 = await page.evaluate(() => {
      const r = {}, fails = [];
      const check = (c, m) => { if (!c) fails.push(m); };
      GFX.routines = true; GFX.townsfolkLife = true; GFX.reduceMotion = false; G.state = 'play'; G.fadeT = 0;
      const F = ['animSY', 'animSX', 'animLift', 'animSkew'];
      const grab = e => F.map(k => e[k]);
      // run animCreature with the module off and on at the same T, report the delta
      const delta = (e, T) => {
        GFX.townsfolkLife = false; animCreature(e, 0.016, T); const a = grab(e);
        GFX.townsfolkLife = true; animCreature(e, 0.016, T); const b = grab(e);
        return b.map((v, i) => v - a[i]);
      };
      const mag = d => d.reduce((s, v) => s + Math.abs(v), 0);
      const settle = (e, T0, n = 40) => { for (let i = 0; i < n; i++) animCreature(e, 0.016, T0 + i * 0.016); };
      const sweep = (e, T0, n, fn) => { let mx = 0; for (let i = 0; i < n; i++) mx = Math.max(mx, mag(delta(e, T0 + i * 0.05))); return mx; };

      // ---- talking gestures
      G.tod = 12 / 24; TOWNSFOLK.apply(true);
      loadMap('tavern', { x: 8.5, y: 9.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.tod = 12 / 24; TOWNSFOLK.apply(true);
      const vane = G.ents.find(e => e.id === 'vane'), hetty = G.ents.find(e => e.id === 'hetty');
      Engine.cam.x = 8.5; Engine.cam.y = 9.5; Engine.cam.dir = -Math.PI / 2;
      for (let i = 0; i < 30; i++) { animCreature(vane, 0.016, 5 + i * 0.016); }
      const idleMax = sweep(vane, 20, 80);                       // vane is across the room: nothing extra
      check(idleMax < 1e-9, 'a far, idle NPC with no loop gets no extra motion (' + idleMax.toExponential(2) + ')');
      DLG.ent = vane; G.state = 'dialogue'; DLG.npc = NPCS.vane;
      settle(vane, 30);
      const talkMax = sweep(vane, 31, 80);
      check(talkMax > 0.02, 'a talking NPC gestures (' + talkMax.toFixed(3) + ')');
      check(talkMax < 0.35, 'the gestures stay small (' + talkMax.toFixed(3) + ')');
      const x0 = vane.x, y0 = vane.y, f0 = vane.facing;
      for (let i = 0; i < 100; i++) animCreature(vane, 0.016, 40 + i * 0.016);
      check(vane.x === x0 && vane.y === y0 && vane.facing === f0, 'gestures never move the NPC or turn its facing (witness cones read it)');
      GFX.townsfolkLife = false; for (let i = 0; i < 30; i++) animCreature(vane, 0.016, 60 + i * 0.016);
      const offGrab = grab(vane); GFX.townsfolkLife = true; DLG.ent = null; G.state = 'play';
      GFX.reduceMotion = true; DLG.ent = vane; G.state = 'dialogue';
      const rmMax = sweep(vane, 70, 40); check(rmMax < 1e-9, 'reduced motion: no gestures (' + rmMax.toExponential(2) + ')');
      GFX.reduceMotion = false; DLG.ent = null; G.state = 'play';
      r.talkMax = +talkMax.toFixed(3);

      // ---- the glance at a player who comes close
      Engine.cam.x = vane.x - 1.5; Engine.cam.y = vane.y + 0.2; Engine.cam.dir = 0;
      settle(vane, 100, 60);
      const nearMax = sweep(vane, 101, 200);
      check(nearMax > 0.02 && nearMax < 0.15, 'a close player draws a glance (' + nearMax.toFixed(3) + ')');
      Engine.cam.x = 8.5; Engine.cam.y = 9.5;

      // ---- work loops: barman
      Engine.cam.x = hetty.x; Engine.cam.y = hetty.y + 5.5; Engine.cam.dir = -Math.PI / 2;
      G.tod = 20 / 24; settle(hetty, 200, 80);
      const wk = sweep(hetty, 201, 400);
      check(wk > 0.03, 'Hetty wipes and pours in the evening (' + wk.toFixed(3) + ')');
      G.tod = 5 / 24; settle(hetty, 300, 80);
      const wkSleep = sweep(hetty, 301, 200);
      check(wkSleep < 0.03, 'and the bar is quiet before dawn (' + wkSleep.toFixed(3) + ')');
      G.tod = 20 / 24; settle(hetty, 400, 20);
      DLG.ent = hetty; G.state = 'dialogue'; DLG.npc = NPCS.hetty;
      for (let i = 0; i < 120; i++) animCreature(hetty, 0.016, 410 + i * 0.016);
      check(hetty._tfWk < 0.02, 'the loop pauses while she talks to you (' + hetty._tfWk.toFixed(3) + ')');
      DLG.ent = null; G.state = 'play';
      const loopsAfter = (() => { for (let i = 0; i < 120; i++) animCreature(hetty, 0.016, 430 + i * 0.016); return hetty._tfWk; })();
      check(loopsAfter > 0.9, 'and picks up again afterwards (' + loopsAfter.toFixed(2) + ')');

      // ---- tanner and mill
      loadMap("oakhaven", { x: 15.5, y: 49.5, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.tod = 12 / 24; TOWNSFOLK.apply(true);
      const hob = G.ents.find(e => e.id === 'hob');
      hob.x = hob.homeX; hob.y = hob.homeY; Engine.cam.x = hob.x; Engine.cam.y = hob.y - 6; Engine.cam.dir = Math.PI / 2;
      settle(hob, 500, 80); hob._spd = 0;
      const hobMax = sweep(hob, 501, 200); check(hobMax > 0.03, 'Hob scrapes a hide at midday (' + hobMax.toFixed(3) + ')');
      G.tod = 23 / 24; settle(hob, 520, 80); hob._spd = 0; const hobNight = sweep(hob, 521, 100); check(hobNight < 0.03, 'not at night (' + hobNight.toFixed(3) + ')');
      loadMap('mill', { x: 4.5, y: 6.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.tod = 12 / 24; TOWNSFOLK.apply(true);
      const nell = G.ents.find(e => e.id === 'nell'), pim = G.ents.find(e => e.id === 'pim');
      Engine.cam.x = 1.5; Engine.cam.y = 10.5; Engine.cam.dir = 0;
      settle(nell, 600, 80); const nm = sweep(nell, 601, 200); check(nm > 0.03, 'Nell cards wool at the engine (' + nm.toFixed(3) + ')');
      settle(pim, 600, 80); const pm = sweep(pim, 601, 300); check(pm > 0.02, 'Pim sorts fleece and coughs (' + pm.toFixed(3) + ')');
      r.work = [wk, hobMax, nm, pm].map(v => +v.toFixed(3));
      // quest state untouched: talking still resolves the same quests and nobody moved
      const x1 = nell.x, y1 = nell.y; for (let i = 0; i < 200; i++) animCreature(nell, 0.016, 700 + i * 0.016); check(nell.x === x1 && nell.y === y1, 'work loops do not move anyone');
      check(NPCS.nell.quest({ flags: { pim_safe: true } }) === null, 'Nell\'s quest logic is untouched');

      // ---- switch off: frames identical to the module not being there (== reduced motion)
      loadMap('tavern', { x: 8.5, y: 9.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.tod = 20 / 24; TOWNSFOLK.apply(true);
      Engine.setWeather({}); PARTICLES.list = []; ANIM.dt = 0;
      const hash = () => { Engine.render(G.ents, G.tod); let h = 0; const d = Engine.ctx.getImageData(0, 0, 320, 150).data; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + (d[i + 1] << 8) + (d[i + 2] << 16)) | 0; return h; };
      const frame = on => { GFX.townsfolkLife = on; for (const e of G.ents) { if (e.kind === 'npc') { e._tfWk = 0; e._tfTalk = 0; e._tfNear = 0; } } const T = 77.3; for (const e of G.ents) if (e.sprite && !e.hidden && e.kind === 'npc') { animCreature(e, 0.016, T - 0.016); animCreature(e, 0.016, T); } return hash(); };
      Engine.cam.x = 5.5; Engine.cam.y = 6.0; Engine.cam.dir = -Math.PI / 2; Engine.cam.pitch = 0;
      for (const e of G.ents) if (e.kind === 'npc') { e._tfWk = 1; }
      // reduced motion also calms the original idle motion (js/access.js), so compare it with the module off under the same setting
      const onH = frame(true), offH = frame(false), offH2 = (GFX.reduceMotion = true, frame(true)), offH3 = frame(false); GFX.reduceMotion = false;
      check(offH3 === offH2, 'townsfolkLife off == reduced motion on: the original frame');
      check(onH !== offH, 'and with it on the barman is drawn mid-motion (frames differ)');
      GFX.townsfolkLife = true;
      r.fails = fails; return r;
    });
    console.log('life:', JSON.stringify(out2));
    assert.deepEqual(out2.fails, [], 'gesture checks: ' + out2.fails.join(' | '));
    console.log('PASS gestures, glances and work loops (barman, tanner, mill)');

    // ------------------------------------------------------------------ frame cost
    const cost = await page.evaluate(() => {
      loadMap('mill', { x: 4.5, y: 6.5, dir: 0 }); G.state = 'play'; G.tod = 0.5; TOWNSFOLK.apply(true);
      const es = G.ents.filter(e => e.kind === 'npc'); const e = es.find(x => x.id === 'nell');
      const run = on => { GFX.townsfolkLife = on; const t = []; for (let k = 0; k < 40; k++) { const t0 = performance.now(); for (let i = 0; i < 500; i++) animCreature(e, 0.016, 5 + i * 0.016); t.push((performance.now() - t0) / 500); } t.sort((a, b) => a - b); return t[20]; };
      const off = run(false), on = run(true); GFX.townsfolkLife = true;
      const t = []; for (let k = 0; k < 40; k++) { const t0 = performance.now(); for (let i = 0; i < 200; i++) TOWNSFOLK.apply(false, 0.016); t.push((performance.now() - t0) / 200); } t.sort((a, b) => a - b);
      return { animOffUs: +(off * 1000).toFixed(2), animOnUs: +(on * 1000).toFixed(2), extraUs: +((on - off) * 1000).toFixed(2), applyTickUs: +(t[20] * 1000).toFixed(2) };
    });
    console.log('frame cost (median, microseconds per call):', JSON.stringify(cost));
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
