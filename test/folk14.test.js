// PREVIEW_URL=http://127.0.0.1:3924 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/folk14.test.js
// Phase 14 FOLK: hoods in rain, huddling in the cold, swaying coats, life at the Boar & Dulcimer.
// A second page with js/folk14.js blocked proves "all four switches off = the original frames and NPC positions".
// Optional SHOTS=<dir> writes review screenshots.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3924';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

async function boot(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/folk14.js*', r => r.abort());
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof TOWNSFOLK === 'object');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Folk Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    GFX.illustratedScreens = false;
    window.__stage = (map, x, y, dir) => {
      loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.keys = {}; G.vel.x = G.vel.y = 0; PARTICLES.list.length = 0;
      for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy') G.ents.splice(i, 1);
      G.dead = false; G.noise = 0;
    };
    window.__run = (secs, dt) => {
      dt = dt || 0.05;
      for (let t = 0; t < secs - 1e-9; t += dt) { ANIM.T += dt; update(dt); for (const e of G.ents) if ((e.kind === 'npc' || e.kind === 'enemy') && !e.hidden) animCreature(e, dt, ANIM.T); }
    };
    window.__still = () => { for (const e of G.ents) if (e.kind === 'npc' || e.kind === 'enemy') { e.wanderT = 1e6; e.moving = false; } };
    window.__npc = (id, x, y, extra) => { const e = hydrate(Object.assign({ kind: 'npc', id, x, y, sprite: NPCS[id].sprite, scale: NPCS[id].scale || 1, solid: true, radius: 0.35, transient: true }, extra || {})); e.homeX = x; e.homeY = y; G.ents.push(e); return e; };
    window.__brazier = (x, y) => { const b = { kind: 'deco', sprite: 'brazier', x, y, scale: 0.62, solid: false, nopick: true, transient: true, _decor: true, glow: 0.8, lightCol: [74, 38, 10], _fs: 'brazier' }; G.ents.push(b); return b; };
    window.__hood = e => (e._f14k >> 5) & 7;
    window.__sway = e => { const c = (e._f14k || 0) & 7; return c === 0 ? 0 : c <= 3 ? c - 4 : c - 3; };
    window.__seatIdx = e => (e._f14k >> 3) & 3;
    window.__hash = () => { Engine.render(G.ents, G.tod); const d = Engine.ctx.getImageData(0, 0, 320, 150).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
    window.__seed = (n) => { let s = n || 777; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; };
  });
  if (opts.freeze) { await page.evaluate(() => { window.requestAnimationFrame = () => 0; }); await page.waitForTimeout(150); }
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);

    // ------------------------------------------------------------------ 1. module, switches, presets
    const sw = await page.evaluate(() => {
      const o = {};
      o.have = typeof FOLK14 === 'object' && FOLK14.FLAGS.length === 4;
      o.defaults = FOLK14.FLAGS.map(k => GFX[k]);
      o.inFX = FOLK14.FLAGS.every(k => GFX.FX.includes(k));
      PRESETS.apply('original'); o.orig = FOLK14.FLAGS.map(k => GFX[k]);
      PRESETS.apply('low'); o.low = FOLK14.FLAGS.map(k => GFX[k]);
      PRESETS.apply('medium'); o.med = FOLK14.FLAGS.map(k => GFX[k]);
      localStorage.removeItem('echoes-folk14');
      return o;
    });
    ok(sw.have && sw.defaults.every(Boolean) && sw.inFX, 'module loaded: four GFX switches, on by default, all in GFX.FX (plain() turns them off)');
    ok(sw.orig.every(v => v === false) && sw.low.every(v => v === false) && sw.med.every(Boolean), 'presets: Original and Low switch all four off, Medium on');

    // ------------------------------------------------------------------ 2. hoods
    const hood = await page.evaluate(() => {
      const o = {}, fails = [], check = (c, m) => { if (!c) fails.push(m); };
      G.tod = 12 / 24; __stage('oakhaven', 40.5, 22.5, 0); Weather.hold('clear'); TOWNSFOLK.apply(true);
      const folk = () => G.ents.filter(e => e.kind === 'npc' && FOLK14.HUMAN.has(e.sprite) && !e.hidden && !e.dead);
      const named = G.ents.filter(e => e.kind === 'npc' && e.id !== 'townsman' && e.id !== 'townswoman' && !e.hidden && FOLK14.HUMAN.has(e.sprite));
      const pos0 = G.ents.filter(e => e.kind === 'npc').map(e => [e, e.x, e.y]);
      // a named, quest-bearing NPC outdoors (a fixture standing in the street, like a quest-giver at their post)
      const quest = __npc('rooke', 44.5, 22.5, { transient: true }); const qx = quest.x, qy = quest.y;
      const gen = __npc('townsman', 46.5, 24.5, { wander: true }); __still();
      __run(10);
      o.clearHoods = folk().filter(e => __hood(e) > 0).length;
      Weather.hold('rain'); __run(9);
      const out = folk();
      o.outdoor = out.length; o.hooded = out.filter(e => __hood(e) > 0).length;
      check(quest._f14k > 0 && __hood(quest) > 0, 'a quest NPC outdoors gets the cosmetic hood');
      o.questMoved = Math.hypot(quest.x - qx, quest.y - qy);
      o.enemyHood = (() => { const p = hydrate({ kind: 'enemy', type: 'proctor', x: 41.5, y: 22.5 }); G.ents.push(p); __run(0.2); const v = (p._f14k >> 5) & 7; G.ents.splice(G.ents.indexOf(p), 1); return v; })();
      const kinds = new Set(out.filter(e => __hood(e) > 0).map(e => __hood(e)));
      o.colours = kinds.size;
      Weather.hold('clear'); __run(16);
      o.afterClear = folk().filter(e => __hood(e) > 0).length;
      // storm and snow also count; indoors never
      Weather.hold('snow'); __run(9); o.snow = folk().filter(e => __hood(e) > 0).length;
      __stage('tavern', 8.5, 9.5, -Math.PI / 2); G.tod = 19 / 24; TOWNSFOLK.apply(true); Weather.hold('rain'); __run(9);
      o.indoor = G.ents.filter(e => e.kind === 'npc' && !e.hidden && __hood(e) > 0).length;
      // switch off: no hood, key 0
      __stage('oakhaven', 40.5, 22.5, 0); G.tod = 12 / 24; Weather.hold('rain'); GFX.folkHoods = false; __run(9);
      o.off = G.ents.filter(e => e.kind === 'npc' && __hood(e) > 0).length; GFX.folkHoods = true;
      Weather.hold('clear');
      o.fails = fails;
      return o;
    });
    ok(hood.clearHoods === 0, 'hoods: nobody hooded in clear weather');
    ok(hood.outdoor >= 3 && hood.hooded === hood.outdoor, 'hoods: in rain every outdoor person is hooded after the stagger (' + hood.hooded + '/' + hood.outdoor + ')');
    ok(hood.colours >= 2, 'hoods: more than one cloth colour');
    ok(hood.enemyHood === 0, 'hoods: enemies never get one');
    ok(hood.questMoved === 0, 'hoods: the quest NPC was not moved by the rain');
    ok(hood.afterClear === 0, 'hoods: they come down again when the rain stops');
    ok(hood.snow > 0, 'hoods: snow counts');
    ok(hood.indoor === 0, 'hoods: never indoors, even with rain held (tavern)');
    ok(hood.off === 0, 'hoods: switch off = no hood');
    ok(hood.fails.length === 0, 'hoods: ' + hood.fails.join('; '));

    // ------------------------------------------------------------------ 3. hurry to the eaves, and the huddle
    const cold = await page.evaluate(() => {
      const o = {}, fails = [], check = (c, m) => { if (!c) fails.push(m); };
      const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      // 3a rain: a wandering generic townsman drifts to the eave beside a door, never onto the doorway line
      G.tod = 12 / 24; __stage('oakhaven', 40.5, 22.5, 0); Weather.hold('rain'); TOWNSFOLK.apply(true); __still();
      const probe = __npc('townsman', 40.5, 22.5, { wander: true }); let w = null, spot = null;
      FOLK14.readEnv(-1);
      outer: for (let y = 0; y < G.map.h; y++) for (let x = 0; x < G.map.w; x++) {
        const c = G.map.get(x, y); if (!(c && c.door && c.portal)) continue;
        probe.x = x + 0.5; probe.y = y + 2.0; const sp = FOLK14.eaveSpot(probe); if (!sp) continue;
        for (const [ox, oy] of [[3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) {
          const sx = sp.x + ox, sy = sp.y + oy; if (solidAt(sx, sy, probe) || !los(sx, sy, sp.x, sp.y)) continue;
          probe.x = sx; probe.y = sy; const sp2 = FOLK14.eaveSpot(probe); if (sp2 && Math.hypot(sp2.x - sp.x, sp2.y - sp.y) < 0.01) { w = probe; spot = sp; break outer; }
        }
      }
      check(!!spot, 'an eave spot with a clear approach exists near a door');
      if (spot) {
        const m = G.map; let dd = 1e9; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.get(x, y); if (c && c.door && c.portal) dd = Math.min(dd, Math.hypot(x + 0.5 - spot.x, y + 0.5 - spot.y)); }
        o.eaveDoorDist = +dd.toFixed(2); check(dd >= 1.2, 'the eave spot leaves the doorway clear (' + dd.toFixed(2) + ')');
        w.homeX = w.x; w.homeY = w.y; __still();
        const d0 = dist(w, spot); __run(25); o.eave = [+d0.toFixed(1), +dist(w, spot).toFixed(1), w._f14m]; check(dist(w, spot) < 0.5 && w._f14m === 'eave', 'the townsman hurried to the eave beside the door');
      }
      // 3b huddle at night by a brazier
      Weather.hold('clear'); G.tod = 0.02; TOWNSFOLK.apply(true);
      for (const e of G.ents.filter(e => e._f14m)) e._f14m = null;
      const br = __brazier(52.5, 21.5);
      const a = __npc('townswoman', 49.5, 20.5, { wander: true }), b = __npc('townsman', 50.5, 24.5, { wander: true });
      const named = __npc('rooke', 51.5, 19.5, {}); const rx = named.x, ry = named.y;
      const guard = __npc('townsman', 50.5, 22.5, { lawGuard: true }); const gx = guard.x, gy = guard.y;
      const roster = G.ents.find(e => e._tf && e.id === 'townswoman'); const rosterAt = roster ? [roster.x, roster.y] : null;
      __run(40);
      o.cold = +FOLK14.env.cold.toFixed(2);
      o.huddled = [a, b].map(e => [+dist(e, br).toFixed(2), e._f14m, !!e._f14arrived]);
      check([a, b].every(e => e._f14m === 'huddle' && dist(e, br) < 1.9 && dist(e, br) > 0.9), 'both idle townsfolk stand in a ring round the brazier');
      check(Math.hypot(named.x - rx, named.y - ry) === 0 && !named._f14m, 'the named NPC beside the fire stayed put');
      check(Math.hypot(guard.x - gx, guard.y - gy) === 0 && !guard._f14m, 'the law guard stayed at his post');
      let bob = 0; for (let i = 0; i < 60; i++) { __run(0.05); if ((a.animLift || 0) > 0.001) bob++; } o.bob = bob; check(bob > 5, 'hands rubbed: a small bob while huddled');
      // 3c reduce motion: no bob
      GFX.reduceMotion = true; let bob2 = 0; for (let i = 0; i < 60; i++) { __run(0.05); if ((a.animLift || 0) > 0.001) bob2++; } GFX.reduceMotion = false; check(bob2 === 0, 'Reduce motion: no hand-rubbing bob');
      // 3d warms up: they go home
      G.tod = 0.5; __run(70); o.home = [a, b].map(e => +Math.hypot(e.x - e.homeX, e.y - e.homeY).toFixed(2));
      check([a, b].every(e => !e._f14m && Math.hypot(e.x - e.homeX, e.y - e.homeY) < 6), 'at noon they leave the fire (state cleared)');
      // 3e negatives: warm noon with a fire near: nobody steered
      const c2 = __npc('townsman', 52.5, 23.5, { wander: true }); __run(20); check(!c2._f14m, 'warm noon: no huddle even beside a fire');
      // cold but no fire in range
      br.hidden = true; G.tod = 0.02; const d2 = __npc('townsman', 20.5, 40.5, { wander: true }); __run(20); check(!d2._f14m, 'cold with no fire in range: no huddle'); br.hidden = false;
      // roster worker mid-shift, rain-cold (0.6 < hard cold): no slack, stays
      G.tod = 12 / 24; Weather.hold('rain'); TOWNSFOLK.apply(true);
      FOLK14.readEnv(-1); const rw = G.ents.find(e => e._tf && !e.hidden && e.id === 'townsman' && e._tf.work);
      if (rw) { const sl = FOLK14.slack(rw); o.rosterSlackMid = sl; check(!sl, 'a roster worker mid-shift has no slack'); }
      // switch off
      GFX.folkHuddle = false; G.tod = 0.02; Weather.hold('clear'); const e3 = __npc('townsman', 49.5, 22.5, { wander: true }); __run(20); check(!e3._f14m, 'switch off: no huddle'); GFX.folkHuddle = true;
      o.fails = fails;
      return o;
    });
    ok(cold.fails.length === 0, 'huddle/eave: ' + (cold.fails.join('; ') || 'rules hold') + ' ' + JSON.stringify({ cold: cold.cold, huddled: cold.huddled, eave: cold.eave, home: cold.home, bob: cold.bob }));

    // ------------------------------------------------------------------ 4. swaying coats
    const sway = await page.evaluate(() => {
      const o = {}, fails = [], check = (c, m) => { if (!c) fails.push(m); };
      G.tod = 12 / 24; __stage('oakhaven', 40.5, 22.5, 0); Weather.hold('clear'); __still();
      const mk = (id, y) => { const e = __npc(id, 44.5, y, {}); e.wanderT = 1e6; return e; };
      const walk = (e, secs) => { const seen = new Set(); for (let t = 0; t < secs; t += 0.05) { e.x += 0.04; ANIM.T += 0.05; animCreature(e, 0.05, ANIM.T); seen.add(__sway(e)); } return [...seen]; };
      const vane = mk('vane', 20.5), town = mk('townsman', 22.5), sable = mk('sable', 24.5);
      o.vaneWalk = walk(vane, 6); o.townWalk = walk(town, 6); o.sableWalk = walk(sable, 6);
      check(o.vaneWalk.some(k => k < 0) && o.vaneWalk.some(k => k > 0), 'a walking coat sways to both sides (' + o.vaneWalk + ')');
      check(o.townWalk.length === 1 && o.townWalk[0] === 0, 'a townsman (no coat sprite) never sways');
      check(o.sableWalk.some(k => k !== 0), 'Sable sways when she walks');
      // standing, clear: still
      const st = mk('vane', 26.5); const seen = new Set(); for (let t = 0; t < 8; t += 0.05) { ANIM.T += 0.05; animCreature(st, 0.05, ANIM.T); seen.add(__sway(st)); } o.standClear = [...seen];
      check(seen.size === 1 && seen.has(0), 'standing in clear weather: no sway');
      // wind: standing in a storm outdoors
      Weather.hold('storm'); __run(1); const seen2 = new Set(); for (let t = 0; t < 8; t += 0.05) { ANIM.T += 0.05; animCreature(st, 0.05, ANIM.T); seen2.add(__sway(st)); } o.standStorm = [...seen2];
      check([...seen2].some(k => k !== 0), 'standing in a storm: the coat moves in the wind (' + o.standStorm + ')');
      // wind in a house: nothing
      __stage('tavern', 8.5, 9.5, -Math.PI / 2); const vin = __npc('vane', 7.5, 9.5, {}); const seen3 = new Set(); for (let t = 0; t < 6; t += 0.05) { ANIM.T += 0.05; animCreature(vin, 0.05, ANIM.T); seen3.add(__sway(vin)); } check(seen3.size === 1 && seen3.has(0), 'indoors, standing: no wind sway');
      // Reduce motion = none, even walking
      __stage('oakhaven', 40.5, 22.5, 0); GFX.reduceMotion = true; const rv = mk('vane', 28.5); const sr = walk(rv, 5); GFX.reduceMotion = false; check(sr.length === 1 && sr[0] === 0, 'Reduce motion: no sway while walking');
      // switch off
      GFX.folkCapes = false; const ov = mk('vane', 30.5); const so = walk(ov, 5); GFX.folkCapes = true; check(so.length === 1 && so[0] === 0, 'switch off: no sway'); Weather.hold('clear');
      // the pixels: top rows identical, boots still, hem moves, whole rows only shifted by an integer
      const src = Engine.sprites.vane, f = FOLK14.figOf(src), w = src.w;
      for (const code of [1, 3, 4, 6]) {
        const v = FOLK14.variant(src, code); const k = code <= 3 ? code - 4 : code - 3;
        let top = true, boots = true, moved = false, integer = true;
        for (let y = f.t; y <= f.b; y++) {
          const rowS = Array.from(src.data.subarray(y * w, y * w + w)), rowV = Array.from(v.data.subarray(y * w, y * w + w));
          const same = rowS.every((p, i) => p === rowV[i]);
          if (y < f.b - Math.round(f.figH * FOLK14.CFG.sway.frac)) top = top && same;
          if (y > f.b - f.figH * 0.04) boots = boots && same;
          if (!same) { moved = true; let found = false; for (let off = -4; off <= 4 && !found; off++) { if (rowV.every((p, i) => { const s = i - off; return p === (s >= 0 && s < w ? rowS[s] : 0); })) found = true; } integer = integer && found; }
        }
        check(top && boots && moved && integer, 'variant ' + k + 'px: upper rows and boots untouched, hem shifted by whole pixels');
      }
      o.fails = fails; return o;
    });
    ok(sway.fails.length === 0, 'sway: ' + (sway.fails.join('; ') || 'only coat sprites, only walking or in wind, Reduce motion none, crisp whole-pixel rows'));

    // ------------------------------------------------------------------ 5. the Boar
    const tav = await page.evaluate(() => {
      const o = {}, fails = [], check = (c, m) => { if (!c) fails.push(m); };
      G.tod = 19 / 24; Weather.hold('clear'); __stage('tavern', 8.5, 9.5, -Math.PI / 2); TOWNSFOLK.apply(true); __run(1);
      const m = G.map, ents = G.ents.filter(e => e.kind === 'npc' && !e.hidden);
      const tables = G.ents.filter(e => e.kind === 'deco' && e.sprite === 'table');
      const sitting = ents.filter(e => __seatIdx(e) === 2);
      o.sitting = sitting.map(e => [e.id, e.x, e.y]);
      check(sitting.length >= 5, 'at 19:00 at least five patrons sit (' + sitting.length + ')');
      const names = sitting.map(e => e.id);
      check(names.includes('p11_dicer') && names.includes('vane'), "Garrow Finch and Vane sit");
      check(!ents.some(e => e.id === 'hetty' && __seatIdx(e) > 0), 'Hetty never sits');
      check(!ents.some(e => e.lawGuard && __seatIdx(e) > 0), 'the parish constable stays on his feet');
      // positions: every seat is beside a table, clear of the street door, the cellar door and the way in
      const dd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const door = { x: 8.5, y: 11.5 }, cellar = { x: 3.5, y: 9.5 }, spawn = { x: m.spawn.x, y: m.spawn.y };
      for (const e of sitting) {
        const dt = Math.min(...tables.map(t => dd(e, t)));
        check(dt >= 0.8 && dt <= 2.4, e.id + ' at ' + e.x + ',' + e.y + ' is ' + dt.toFixed(2) + ' from a table');
        check(dd(e, door) > 2.2 && dd(e, cellar) > 1.8 && dd(e, spawn) > 1.2, e.id + ' clear of doors and the spawn');
        const c = m.get(e.x | 0, e.y | 0); check(!c || !c.tex || !m.isSolidCell(e.x | 0, e.y | 0), e.id + ' stands on an open cell');
      }
      // Garrow keeps his place and the Bones table stays reachable: a grid walk from the spawn to the cell east of the table and to Garrow's north side
      const bones = tables.find(t => Math.abs(t.x - 4.5) < 0.1 && Math.abs(t.y - 7.5) < 0.1), garrow = ents.find(e => e.id === 'p11_dicer');
      check(!!bones && garrow && Math.hypot(garrow.x - 3.4, garrow.y - 7.5) === 0, "Garrow's seat is where tavern11 put him");
      const blockers = G.ents.filter(e => e.solid && !e.hidden && !e.dead && e.kind !== 'item');
      const free = (x, y) => { if (m.isSolidCell(x | 0, y | 0)) return false; for (const b of blockers) if (Math.hypot(b.x - (x + 0.5 - (x % 1)), b.y - (y + 0.5 - (y % 1))) < 0 ) return false; return true; };
      const reach = (sx, sy, tx, ty) => { // 0.25-pitch grid, a 0.4 body
        const P = 0.25, W = Math.round(m.w / P), H = Math.round(m.h / P), seen = new Uint8Array(W * H), q = [[Math.round(sx / P), Math.round(sy / P)]];
        const ok2 = (gx, gy) => { const x = gx * P, y = gy * P; if (gx < 0 || gy < 0 || gx >= W || gy >= H) return false; for (const [ax, ay] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) if (m.isSolidCell((x + ax) | 0, (y + ay) | 0)) return false; for (const b of blockers) { const r = (b.radius || 0.3) + 0.3; if ((b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) < r * r) return false; } return true; };
        seen[q[0][1] * W + q[0][0]] = 1; const gx = Math.round(tx / P), gy = Math.round(ty / P);
        while (q.length) { const [x, y] = q.shift(); if (Math.abs(x - gx) <= 1 && Math.abs(y - gy) <= 1) return true; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !ok2(nx, ny)) continue; seen[ny * W + nx] = 1; q.push([nx, ny]); } }
        return false;
      };
      o.reach = { door: reach(8.5, 9.5, 8.5, 10.6), cellar: reach(8.5, 9.5, 3.5, 8.4), bonesSide: reach(8.5, 9.5, 3.4, 6.5), bar: reach(8.5, 9.5, 5.5, 4.6), hearth: reach(8.5, 9.5, 13.9, 6.5) };
      check(o.reach.door && o.reach.cellar && o.reach.bonesSide && o.reach.bar, 'seated patrons block no path: spawn reaches the door, the cellar, the Bones table and the bar ' + JSON.stringify(o.reach));
      // nobody moved by the seating itself
      const before = ents.map(e => [e.x, e.y]); __still(); __run(30); const moved = ents.filter((e, i) => e.id !== 'hetty' && Math.hypot(e.x - before[i][0], e.y - before[i][1]) > 1e-9).length;
      check(moved === 0, 'seating moves nobody (positions identical after 30 s)');
      // the cycle: tankards and spoons, four lifts, tankard tilts, spoon does not
      const kinds = new Set(), lifts = new Set(), tilt = new Set(); let drinks = 0, lastK = -1;
      for (let t = 0; t < 200; t += 0.1) { const c = FOLK14.cycle(1.3, t); kinds.add(c.show ? c.kind : 0); lifts.add(c.lift); if (c.lift === 3) tilt.add(c.kind); if (c.k !== lastK) { drinks++; lastK = c.k; } }
      check(kinds.has(1) && kinds.has(2) && [0, 1, 2, 3].every(l => lifts.has(l)) && tilt.size === 1 && tilt.has(1) && drinks >= 15, 'eat/drink cycle: tankard and spoon, all four lifts, only the tankard tilts, a round every 9-13 s');
      // a seated patron's key changes over time (the arm moves) and not at all with Reduce motion
      const p = sitting.find(e => e.id === 'townsman'); const keys = new Set(); for (let t = 0; t < 30; t += 0.1) { __run(0.1); keys.add(p._f14k); } o.keys = keys.size; check(keys.size >= 4, 'a seated patron lifts and lowers (' + keys.size + ' frames in 30 s)');
      GFX.reduceMotion = true; const keys2 = new Set(); for (let t = 0; t < 30; t += 0.1) { __run(0.1); keys2.add(p._f14k); } GFX.reduceMotion = false; check(keys2.size <= 2, 'Reduce motion: seated but not moving (' + keys2.size + ')');
      // stand up before the routine ends; gone at the end
      const st = G.ents.find(e => e._tfStand === 'orchardA'); check(!!st, 'the orchard hand has a stand-in at the Boar');
      G.tod = 21.4 / 24; TOWNSFOLK.apply(true); __run(1); check(st && !st.hidden && __seatIdx(st) === 2, 'orchard hand seated at 21:24 (routine ends 22:00)');
      G.tod = 21.75 / 24; TOWNSFOLK.apply(true); __run(1); check(st && !st.hidden && __seatIdx(st) === 0, 'and on his feet at 21:45, twenty minutes before the routine ends');
      G.tod = 22.3 / 24; TOWNSFOLK.apply(true); __run(0.5); check(st && st.hidden, 'and gone after 22:00');
      G.tod = 19 / 24; TOWNSFOLK.apply(true); __run(2);
      // talking stands them up
      const t1 = G.ents.find(e => e.id === 'townsman' && !e.hidden && __seatIdx(e) === 2); DLG.ent = t1; G.state = 'dialogue'; ANIM.T += 0.05; __run(0); for (let i = 0; i < 10; i++) { ANIM.T += 0.1; animCreature(t1, 0.1, ANIM.T); } check(__seatIdx(t1) === 0, 'a patron you talk to stands up'); DLG.ent = null; G.state = 'play'; __run(2);
      o.fails = fails; return o;
    });
    ok(tav.fails.length === 0, 'tavern seating: ' + (tav.fails.join('; ') || 'valid seats, cycles, stand-up') + ' ' + JSON.stringify(tav.reach));

    // Hetty serves
    const het = await page.evaluate(() => {
      const o = {}, fails = [], check = (c, m) => { if (!c) fails.push(m); };
      G.tod = 19 / 24; Weather.hold('clear'); __stage('tavern', 8.5, 10.4, -Math.PI / 2); TOWNSFOLK.apply(true); __run(1);
      const h = G.ents.find(e => e.id === 'hetty'), home = [h.homeX, h.homeY];
      Engine.cam.x = 15.5; Engine.cam.y = 10.5;      // the player waits far off, in the corner
      const others = G.ents.filter(e => e !== h && (e.kind === 'npc' || e.kind === 'deco')).map(e => [e, e.x, e.y]);
      FOLK14.serve.since = 100;
      let maxAway = 0, nearPatron = 1e9, minClear = 1e9, hit = false, back = false; const states = new Set();
      for (let i = 0; i < 1200; i++) {
        __run(0.1); Engine.cam.x = 15.5; Engine.cam.y = 10.5; states.add(FOLK14.serve.st);
        maxAway = Math.max(maxAway, Math.hypot(h.x - home[0], h.y - home[1]));
        if (solidAt(h.x, h.y, h)) hit = true;
        for (const [e] of others) if (e.solid && !e.hidden) minClear = Math.min(minClear, Math.hypot(h.x - e.x, h.y - e.y) - (e.radius || 0.3));
        for (const p of G.ents) if (p !== h && p.kind === 'npc' && p._f14s && p._f14s.idx === 2) nearPatron = Math.min(nearPatron, Math.hypot(h.x - p.x, h.y - p.y));
        if (i > 20 && FOLK14.serve.st === 'idle' && Math.hypot(h.x - home[0], h.y - home[1]) < 0.15) { back = true; break; }
      }
      o.maxAway = +maxAway.toFixed(1); o.nearPatron = +nearPatron.toFixed(2); o.minClear = +minClear.toFixed(2); o.states = [...states];
      check(maxAway > 3 && ['out', 'wait', 'back'].every(s => states.has(s)), 'Hetty walks out to a table, waits and comes back (' + o.maxAway + ' tiles)');
      check(nearPatron < 1.4, 'she reaches a seated patron (' + o.nearPatron + ')');
      check(!hit && minClear > 0.05, 'she never stands inside a wall or another body (clearance ' + o.minClear + ')');
      check(back, 'she is back at the bar, exactly at her post');
      check(others.every(([e, x, y]) => e.x === x && e.y === y), 'nobody else moved');
      // she holds still while someone talks to her, and when the player is close
      FOLK14.serve.since = 100; for (let i = 0; i < 600 && FOLK14.serve.st === 'idle'; i++) { Engine.cam.x = 15.5; Engine.cam.y = 10.5; __run(0.1); }
      check(FOLK14.serve.st !== 'idle', 'a second round starts');
      const px = h.x, py = h.y; DLG.ent = h; G.state = 'dialogue'; for (let i = 0; i < 40; i++) FOLK14.steer(0.1); check(h.x === px && h.y === py, 'she does not move while in dialogue'); DLG.ent = null; G.state = 'play';
      Engine.cam.x = h.x + 1; Engine.cam.y = h.y; const px2 = h.x, py2 = h.y; for (let i = 0; i < 20; i++) FOLK14.steer(0.1); check(h.x === px2 && h.y === py2, 'she pauses when the player is close');
      // a save restored mid-round: back at the bar
      FOLK14.serve.st = 'idle'; FOLK14.serve.e = h; h.x = home[0] + 3; h.y = home[1] + 1.4; Engine.cam.x = 15.5; Engine.cam.y = 10.5; FOLK14.steer(0.1); check(Math.hypot(h.x - home[0], h.y - home[1]) < 0.01, 'a displaced Hetty (restored save) is put back at the bar');
      // never out of hours; off = stays at the bar
      GFX.folkTavern = false; FOLK14.serve.since = 100; G.tod = 19 / 24; for (let i = 0; i < 100; i++) { Engine.cam.x = 15.5; Engine.cam.y = 10.5; __run(0.1); } check(Math.hypot(h.x - home[0], h.y - home[1]) < 0.01, 'switch off: Hetty never leaves the bar'); GFX.folkTavern = true;
      G.tod = 11 / 24; FOLK14.serve.st = 'idle'; FOLK14.serve.since = 100; for (let i = 0; i < 100; i++) { Engine.cam.x = 15.5; Engine.cam.y = 10.5; __run(0.1); } check(Math.hypot(h.x - home[0], h.y - home[1]) < 0.01, 'in the morning she stays behind the bar');
      o.fails = fails; return o;
    });
    ok(het.fails.length === 0, 'Hetty: ' + (het.fails.join('; ') || 'serves a round on a valid route') + ' ' + JSON.stringify({ maxAway: het.maxAway, nearPatron: het.nearPatron, minClear: het.minClear }));

    // ------------------------------------------------------------------ 6. off = the original
    // Positions are compared with a second page that never loaded the module. The engine's own frame-to-frame state
    // (exposure adaptation, ripples) makes two renders of one scene differ slightly even with nothing changed, so
    // frames are compared at the source: for every NPC and enemy, every 0.25 s, the sprite the renderer is handed
    // (checksum of its pixels and the flip) and every animation field it reads, with all four switches off here
    // versus a page that never loaded the module.
    const { page: orig, errors: origErr } = await boot(browser, { block: true, freeze: true });
    const { page: offp, errors: offErr } = await boot(browser, { freeze: true });
    const scene = async (pg, mode) => pg.evaluate((mode) => {
      const trace = [], pos = [];
      const saved = { animCreature, animDirectionalSprite, update, loadMap, restoreGame };
      const sums = new WeakMap(); const sum = (sp) => { let v = sums.get(sp); if (v === undefined) { v = 2166136261; for (let i = 0; i < sp.data.length; i++) { v ^= sp.data[i]; v = Math.imul(v, 16777619); } v = (v >>> 0) ^ (sp.w * 1000 + sp.h); sums.set(sp, v); } return v; };
      if (mode === 'off') for (const k of ['folkHoods', 'folkHuddle', 'folkCapes', 'folkTavern']) GFX[k] = false;
      if (mode === 'bypass') { for (const k of ['folkHoods', 'folkHuddle', 'folkCapes', 'folkTavern']) GFX[k] = true; const O = FOLK14.ORIG; animCreature = O.animCreature; animDirectionalSprite = O.animDirectionalSprite; update = O.update; loadMap = O.loadMap; restoreGame = O.restoreGame; }
      try {
        const snap = () => G.ents.filter(e => (e.kind === 'npc' || e.kind === 'enemy') && !e.hidden).map(e => {
          const d = animDirectionalSprite(e);
          return [e.id || e.type, e.x.toFixed(3), e.y.toFixed(3), (+e.animSY).toFixed(4), (+e.animSX).toFixed(4), (+e.animLift).toFixed(4), (+e.animSkew).toFixed(4), e.animAlpha, e.animHurt, e.animGlow, e.animSprite, d.flip, sum(d.sprite)].join(',');
        }).sort().join(';');
        const run = (name, setup, secs) => {
          __seed(4242); setup(); for (const e of G.ents) if (e.kind === 'npc' || e.kind === 'enemy') { if (e.homeX != null) { e.x = e.homeX; e.y = e.homeY; } e.wanderT = 1e6; e.moving = false; }
          ANIM.T = 10; Weather.hold(Weather.state); __seed(99);
          __run(3);   // history (smoothed speeds, phases) from the boot washes out
          let h = 2166136261, n = 0;
          for (let t = 0; t < secs; t += 0.25) { __run(0.25); const line = snap(); n++; for (let i = 0; i < line.length; i++) { h ^= line.charCodeAt(i); h = Math.imul(h, 16777619); } }
          trace.push(name + ':' + (h >>> 0) + ':' + n);
          pos.push(name + ':' + G.ents.filter(e => e.kind === 'npc' || e.kind === 'enemy').map(e => (e.x.toFixed(3) + ',' + e.y.toFixed(3))).sort().join(';'));
        };
        run('tavern', () => { G.tod = 19 / 24; __stage('tavern', 8.2, 6.9, -0.35); TOWNSFOLK.apply(true); }, 12);
        run('rain', () => { G.tod = 12 / 24; __stage('oakhaven', 46.5, 20.5, 0); Weather.hold('rain'); TOWNSFOLK.apply(true); }, 14);
        run('night', () => { G.tod = 0.02; __stage('oakhaven', 46.5, 20.5, 0); Weather.hold('clear'); TOWNSFOLK.apply(true); __brazier(52.5, 21.5); __npc('townsman', 49.5, 21.5, { wander: true }); }, 24);
        run('coats', () => { G.tod = 12 / 24; __stage('oakhaven', 40.5, 22.5, 0); Weather.hold('storm'); const v = __npc('vane', 43.5, 22.5, {}); const p = hydrate({ kind: 'enemy', type: 'proctor', x: 43.5, y: 24.0, passive: true }); G.ents.push(p); const m = hydrate({ kind: 'enemy', type: 'legionnaire', x: 43.5, y: 21.0, passive: true }); G.ents.push(m); }, 8);
      } finally { animCreature = saved.animCreature; animDirectionalSprite = saved.animDirectionalSprite; update = saved.update; loadMap = saved.loadMap; restoreGame = saved.restoreGame; Weather.hold('clear'); }
      return { trace, pos };
    }, mode);
    const sOff = await scene(offp, 'off'), sOrig = await scene(orig, 'orig');
    ok(sOff.trace.every((l, i) => l === sOrig.trace[i]) && sOff.pos.every((l, i) => l === sOrig.pos[i]), 'all four switches off = identical sprites and animation fields for every NPC and enemy every 0.25 s, and identical NPC positions, to a page that never loaded the module (' + sOff.trace.map((l, i) => l === sOrig.trace[i]).join(',') + ')');
    if (sOff.trace.some((l, i) => l !== sOrig.trace[i])) console.log('  ' + sOff.trace.join(' | ') + ' // ' + sOrig.trace.join(' | '));
    // and the on state really differs (the test is not vacuous)
    const sOn = await offp.evaluate(() => { for (const k of ['folkHoods', 'folkHuddle', 'folkCapes', 'folkTavern']) GFX[k] = true; return 1; }).then(() => scene(offp, 'on'));
    ok(sOn.trace.filter((l, i) => l !== sOff.trace[i]).length >= 3, 'with the switches on the sprite traces differ in at least three of the four scenes (' + sOn.trace.map((l, i) => l !== sOff.trace[i]).join(',') + ')');
    ok(origErr.length === 0 && offErr.length === 0, 'the blocked-module and switched-off pages ran clean' + ((origErr.concat(offErr)).length ? ': ' + origErr.concat(offErr)[0] : ''));
    await orig.close(); await offp.close();

    // ------------------------------------------------------------------ 7. frame cost with a full tavern
    const cost = await page.evaluate(() => {
      const o = {};
      G.tod = 19 / 24; Weather.hold('clear'); __stage('tavern', 8.2, 6.9, -0.35); TOWNSFOLK.apply(true);
      // fill the room: ten more patrons round the tables, plus 12 enemies as in the other perf runs
      const spots = [[10.5, 5.5], [12.5, 5.5], [10.5, 7.5], [12.4, 7.5], [10.6, 9.5], [12.5, 9.4], [3.4, 6.4], [5.6, 6.5], [5.6, 8.5], [3.4, 8.6]];
      spots.forEach((s, i) => { const e = __npc(i % 2 ? 'townswoman' : 'townsman', s[0], s[1], {}); e.wanderT = 1e6; });
      for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: 14 + (i % 3) * 0.6, y: 1.5 + (i >> 2) * 0.8, passive: true }); G.ents.push(e); }
      for (const e of G.ents) if (e.kind === 'npc' || e.kind === 'enemy') { e.wanderT = 1e6; e.moving = false; }
      __run(3);
      const seated = G.ents.filter(e => e.kind === 'npc' && __seatIdx(e) === 2).length; o.seated = seated;
      const frame = (fn) => { const t0 = performance.now(); for (let j = 0; j < 40; j++) { ANIM.T += 0.016; fn(); } return (performance.now() - t0) / 40; };
      const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
      // each piece is measured alone, alternating which side goes first (a fixed order biases a busy machine)
      const pair = (fnOn, fnOff, before) => { const d = [], on = [], off = []; for (let r = 0; r < 15; r++) { let a, b; if (r % 2 === 0) { before(true); a = frame(fnOn); before(false); b = frame(fnOff); } else { before(false); b = frame(fnOff); before(true); a = frame(fnOn); } d.push(a - b); on.push(a); off.push(b); } before(true); return { diff: med(d), on: med(on), off: med(off) }; };
      const flags = on => { for (const k of FOLK14.FLAGS) GFX[k] = on; };
      const npcs = () => G.ents.filter(e => (e.kind === 'npc' || e.kind === 'enemy') && !e.hidden);
      const animOnly = () => { for (const e of npcs()) animCreature(e, 0.016, ANIM.T); };
      const dirOn = () => { for (const e of G.ents) if (e.sprite && !e.hidden) animDirectionalSprite(e); };
      const dirOff = () => { for (const e of G.ents) if (e.sprite && !e.hidden) FOLK14.ORIG.animDirectionalSprite(e); };
      const rend = () => Engine.render(G.ents, G.tod);
      animOnly(); animOnly();
      const keys = G.ents.map(e => e._f14k || 0);
      const setKeys = on => G.ents.forEach((e, i) => { e._f14k = on ? keys[i] : 0; });
      const an = pair(animOnly, animOnly, flags);   // flags on vs off, same loop
      flags(true); animOnly(); const keys2 = G.ents.map(e => e._f14k || 0); for (let i = 0; i < keys.length; i++) keys[i] = keys2[i];
      const di = pair(dirOn, dirOff, () => {});
      const rr = pair(rend, rend, setKeys);          // the frame with every patron's variant versus the plain sprites
      o.animMs = +an.diff.toFixed(3); o.dirMs = +di.diff.toFixed(3); o.renderMs = +rr.diff.toFixed(2); o.onMs = +rr.on.toFixed(2); o.offMs = +rr.off.toFixed(2);
      o.extraMs = +(Math.max(0, an.diff) + Math.max(0, di.diff) + Math.max(0, rr.diff)).toFixed(2); o.variants = FOLK14.stats.built();
      // the animation wrapper alone
      FOLK14.stats.timing = true; FOLK14.stats.ms = 0; FOLK14.stats.ents = 0; for (let i = 0; i < 300; i++) { ANIM.T += 0.016; for (const e of G.ents) if ((e.kind === 'npc' || e.kind === 'enemy') && !e.hidden) animCreature(e, 0.016, ANIM.T); } FOLK14.stats.timing = false;
      o.wrapperUsPerFrame = +(FOLK14.stats.ms / 300 * 1000).toFixed(1);
      return o;
    });
    console.log('  frame cost (full tavern, ' + cost.seated + ' seated, 12 enemies): render with variants ' + cost.onMs + ' ms vs plain ' + cost.offMs + ' ms (difference ' + cost.renderMs + '); animation ' + cost.animMs + ' ms; sprite swap ' + cost.dirMs + ' ms; total extra (positive parts) ' + cost.extraMs + ' ms; ' + cost.variants + ' variants built');
    ok(cost.seated >= 8 && cost.extraMs < 1.0, 'perf: a full tavern costs ' + cost.extraMs + ' ms extra per frame (animation ' + cost.animMs + ' + sprite swap ' + cost.dirMs + ' + render ' + cost.renderMs + '; limit 1 ms)');

    // ------------------------------------------------------------------ 8. Options rows
    const opt = await page.evaluate(() => {
      const o = {}; PRESETS.apply('medium'); localStorage.removeItem('echoes-folk14');
      renderAccessibilityMenu(); const rows = ['folk-hoods', 'folk-huddle', 'folk-capes', 'folk-tavern'].map(id => document.getElementById(id));
      o.have = rows.every(Boolean); o.before = rows.map(b => b.textContent + b.getAttribute('aria-pressed'));
      rows[0].click(); o.after = [GFX.folkHoods, rows[0].textContent, rows[0].getAttribute('aria-pressed')]; o.stored = localStorage.getItem('echoes-folk14');
      PRESETS.apply('original'); o.orig = FOLK14.FLAGS.map(k => GFX[k]); PRESETS.apply('medium'); o.med = FOLK14.FLAGS.map(k => GFX[k]); o.stored2 = localStorage.getItem('echoes-folk14');
      localStorage.removeItem('echoes-folk14'); if (typeof closeModal === 'function') closeModal();
      return o;
    });
    ok(opt.have && opt.before.every(s => s === 'Ontrue'), 'options: four rows in Graphics & access, each On');
    ok(opt.after[0] === false && opt.after[1] === 'Off' && opt.after[2] === 'false' && JSON.parse(opt.stored).folkHoods === false, 'options: clicking switches the effect and stores the choice');
    ok(opt.orig.every(v => v === false) && opt.med.every(Boolean) && JSON.parse(opt.stored2).folkHoods === null, 'options: a preset takes over again and drops the stored override');

    // ------------------------------------------------------------------ 9. screenshots and the compact window
    if (SHOTS) {
      const fs = require('fs'); fs.mkdirSync(SHOTS, { recursive: true });
      const clean = () => page.evaluate(() => { const m = document.querySelector('#msgs'); if (m) m.innerHTML = ''; const h = document.querySelector('#hint'); if (h) h.textContent = ''; const c = document.querySelector('#cover-status'); if (c) c.hidden = true; });
      const snap = async name => { await clean(); await page.waitForTimeout(250); await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
      for (const on of [false, true]) {
        await page.evaluate((on) => { for (const k of FOLK14.FLAGS) GFX[k] = on; G.tod = 19 / 24; Weather.hold('clear'); __stage('tavern', 8.2, 6.9, -0.35); TOWNSFOLK.apply(true); __run(2); }, on);
        await snap('tavern-' + (on ? 'on' : 'off'));
      }
      await page.evaluate(() => { for (const k of FOLK14.FLAGS) GFX[k] = true; });
    }
    const { page: pc, errors: errc } = await boot(browser, { viewport: { width: 640, height: 400 } });
    const compact = await pc.evaluate(() => {
      G.tod = 19 / 24; Weather.hold('rain'); __stage('oakhaven', 46.5, 20.5, 0); TOWNSFOLK.apply(true); G.tod = 12 / 24; __run(10);
      const hooded = G.ents.filter(e => e.kind === 'npc' && !e.hidden && __hood(e) > 0).length;
      __stage('tavern', 8.2, 6.9, -0.35); G.tod = 19 / 24; Weather.hold('clear'); TOWNSFOLK.apply(true); __run(3);
      const seated = G.ents.filter(e => e.kind === 'npc' && __seatIdx(e) === 2).length;
      renderAccessibilityMenu(); const panel = document.querySelector('#modal-panel'), row = document.getElementById('folk-tavern');
      const r = { hooded, seated, row: !!row, over: panel ? panel.scrollWidth - panel.clientWidth : -1 };
      if (typeof closeModal === 'function') closeModal(); return r;
    });
    if (SHOTS) { await pc.evaluate(() => { const m = document.querySelector('#msgs'); if (m) m.innerHTML = ''; }); await pc.waitForTimeout(250); await pc.locator('#game').screenshot({ path: SHOTS + '/compact-640x400.png' }); }
    ok(compact.hooded >= 1 && compact.seated >= 5 && compact.row && compact.over <= 1 && errc.length === 0, 'compact 640x400: hoods ' + compact.hooded + ', seated ' + compact.seated + ', the options row fits (overflow ' + compact.over + ')' + (errc.length ? ' ' + errc[0] : ''));
    await pc.close();

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? 'FAILED: ' + fails : 'folk14: ALL PASS');
  process.exit(fails ? 1 : 0);
})();
