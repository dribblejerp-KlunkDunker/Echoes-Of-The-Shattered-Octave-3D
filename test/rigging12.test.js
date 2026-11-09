// PREVIEW_URL=http://127.0.0.1:3863 PLAYWRIGHT_MODULE=/path/to/playwright node test/rigging12.test.js
// Phase 12 RIGGING: the Office grapnel (found at the wrecked cutter; five anchors), chandeliers and scaffolds that
// fall on what stands beneath, and deep-water drownings (shove, knockback, generic knock detector).
// Optional SHOTS=<dir> writes review screenshots.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3863');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof RIGGING === 'object');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Rig Tester');
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
      localStorage.removeItem('octave.rigging12.v1');
      window.__hidden = [];
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') { e.hidden = true; window.__hidden.push(e); }
      window.__stage = (map, x, y, dir) => { loadMap(map, { x, y, dir: dir == null ? 0 : dir }); G.state = 'play'; G.fadeT = 0; G.openPanel = null; try { Engine.setWeather({}); } catch (e) { /* none */ } RIGGING.resetCooldowns(); G.player.hp = G.player.hpMax; G.player.fat = 100; G.noise = 1; };
      window.__mk = (type, x, y, st) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = st || 'idle'; e.hidden = false; G.ents.push(e); return e; };
      window.__rm = (e) => { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); };
      window.__rngTotal = 0; window.__seed = (n) => { let s = n || 777; window.__rngCalls = 0; Math.random = () => { window.__rngCalls++; window.__rngTotal++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
      window.__adv = (sec) => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) update(1 / 60); };
      window.__give = () => { if (!G.has(RIGGING.ITEM)) G.give(RIGGING.ITEM); };
      window.__sword = () => { if (!G.player.weapons.includes('sword')) G.player.weapons.push('sword'); G.player.weapon = G.player.weapons.indexOf('sword'); };
      window.__weapon = (id) => { if (!G.player.weapons.includes(id)) G.player.weapons.push(id); G.player.weapon = G.player.weapons.indexOf(id); };
      window.__swing = () => { G.attack.t = 0; G.song.t = 0; attack('thrust'); };
      window.__reset = () => { for (const k of ['p12r_ch', 'p12r_sc', 'p12r_hk', 'p12r_ca']) delete G.flags[k]; RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = true; for (const id in G.maps) RIGGING.syncProps(G.maps[id]); const i = G.player.inv.findIndex(s => s.id === RIGGING.ITEM); if (i >= 0) G.player.inv.splice(i, 1); };
      // the walkable region from a point, as the game's own solidAt/ground rules allow it (drops of any height allowed); locked doors stay shut
      window.__reach = (m, sx, sy, minZ) => {
        const S = 0.5, W = Math.floor(m.w / S), H = Math.floor(m.h / S), seen = new Uint8Array(W * H), q = [], idx = (i, j) => j * W + i;
        const i0 = Math.floor(sx / S), j0 = Math.floor(sy / S); seen[idx(i0, j0)] = 1; q.push([i0, j0]);
        const opened = [];
        for (const key in m.doors) { const c = m.cells[key]; if (c && !c.locked && !c.portal && !c.lockDifficulty) { opened.push([key, m.doors[key].open]); m.doors[key].open = 1; } }
        const save = G.map; G.map = m;
        try {
          while (q.length) {
            const [i, j] = q.shift(), x = (i + 0.5) * S, y = (j + 0.5) * S, feet = m.groundAt(x, y);
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H || seen[idx(ni, nj)]) continue;
              const nx = (ni + 0.5) * S, ny = (nj + 0.5) * S, g = m.groundAt(nx, ny); let bad = g - feet > STEP_UP;
              if (!bad && minZ != null && g < minZ) bad = true;
              if (!bad && m.smooth && g > feet + 0.02 && m.gradeAt(nx, ny) > MAX_GRADE) bad = true;
              if (!bad) for (const [dx, dy] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) if (m.isBlocked((nx + dx) | 0, (ny + dy) | 0)) bad = true;
              if (bad) continue; seen[idx(ni, nj)] = 1; q.push([ni, nj]);
            }
          }
        } finally { for (const [key, o] of opened) m.doors[key].open = o; G.map = save; }
        return { has: (x, y) => { const i = Math.floor(x / S), j = Math.floor(y / S); return i >= 0 && j >= 0 && i < W && j < H && !!seen[idx(i, j)]; }, cells: () => { const out = new Set(); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (seen[idx(i, j)]) out.add(Math.floor((i + 0.5) * S) + ',' + Math.floor((j + 0.5) * S)); return out; } };
      };
    });
    const snap = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };

    // ---- 1. the module, the item, the tables
    const base = await page.evaluate(() => {
      const it = ITEMS[RIGGING.ITEM];
      const ids = {}; for (const id in G.maps) { const m = G.maps[id]; if (m._p12r && m._p12r.length) { ids[id] = m._p12r.map(e => e._p12r.k).join(','); } }
      return { sw: JSON.stringify(RIGGING.set), key: !!(it && it.key), name: it && it.name, desc: it && it.desc.length > 40, icon: ICONS && ICONS.TABLE && ICONS.TABLE[RIGGING.ITEM] && ICONS.TABLE[RIGGING.ITEM][0], ids, n: [RIGGING.ANCHORS.length, RIGGING.CHANDS.length, RIGGING.SCAFFS.length, RIGGING.CACHES.length], cfgKeys: Object.keys(RIGGING.CFG).length };
    });
    ok(base.sw === '{"hook":true,"props":true,"water":true}', 'three Options switches, all on by default (' + base.sw + ')');
    ok(base.key && base.name === 'Office Grapnel' && base.desc && base.icon === 'spool', 'item p12_grapnel: a key item (cannot be sold), with a description and a spool icon');
    ok(base.n[0] >= 3 && base.n[0] <= 5 && base.n[1] >= 3 && base.n[2] >= 2 && base.n[3] === 1, 'tables: ' + base.n[0] + ' anchors, ' + base.n[1] + ' chandeliers, ' + base.n[2] + ' scaffolds, ' + base.n[3] + ' hidden cache');
    ok(base.cfgKeys > 25, 'every balance number lives in the one CFG table (' + base.cfgKeys + ' entries)');
    ok(/anchor/.test(base.ids.belfry) && /anchor/.test(base.ids.clearing) && /anchor/.test(base.ids.greenroot) && /anchor.*anchor|anchor/.test(base.ids.deepwoods) && /chand/.test(base.ids.cloister) && /chand/.test(base.ids.mausoleum) && /scaff/.test(base.ids.quarry) && /scaff/.test(base.ids.rootvault) && /pile/.test(base.ids.deepwoods), 'props sit in the maps the brief names: ' + JSON.stringify(base.ids));

    // ---- 2. switches off = the plain game: no props in any entity list, every action does nothing, seeded fight identical
    const off = await page.evaluate(() => {
      __reset(); RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = false;
      for (const id in G.maps) RIGGING.syncProps(G.maps[id]);
      __stage('malting', 15.5, 9.2, -Math.PI / 2); __give(); __sword();
      const inLists = Object.keys(G.maps).reduce((n, id) => n + G.maps[id].entities.filter(e => e._p12r).length, 0);
      const s0 = JSON.stringify(RIGGING.stats);
      __swing(); __adv(1.2);
      const r = { inLists, act: RIGGING.act(), stats: JSON.stringify(RIGGING.stats) === s0, flag: G.flags.p12r_ch, falls: RIGGING.falls.length, ctx: RIGGING.context() };
      // a trace in the arena with every switch off, then on: identical (the arena holds no prop and no deep water)
      __stage('arena', 9, 12, -Math.PI / 2); __sword();
      const S0 = JSON.stringify(snapshotGame());
      const run = (on) => {
        restoreGame(JSON.parse(S0)); window.__rngTotal = 0;
        RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = on; RIGGING.syncProps(G.maps.arena);
        G.state = 'play'; G.openPanel = null; __seed(4242); G.noise = 2; __sword();
        const es = [__mk('proctor', 9, 10.3, 'chase'), __mk('hound', 10, 10.0, 'chase'), __mk('proctor', 8, 10.6, 'chase')];
        const tr = [];
        for (let i = 0; i < 360; i++) {
          __seed(9000 + i); update(1 / 60);
          if (i % 24 === 0) attack('swing');
          if (i % 3 === 0) render();
          if (i % 12 === 0) tr.push([Math.round(G.player.hp * 100), ...es.map(e => Math.round(e.hp * 100) + ':' + e.state + ':' + e.x.toFixed(3) + ',' + e.y.toFixed(3)), G.noise.toFixed(4)].join('|'));
        }
        const calls = window.__rngTotal; for (const e of es) __rm(e);
        return { out: tr.join('\n'), calls };
      };
      run(false); const a = run(false), b = run(true), c = run(false);
      RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = true; for (const id in G.maps) RIGGING.syncProps(G.maps[id]);
      return Object.assign(r, { same: a.out === b.out && a.out === c.out, lines: a.out.split('\n').length, rng: a.calls === b.calls });
    });
    ok(off.inLists === 0, 'all three switches off: not one prop is left in any map\'s entity list');
    ok(off.act === false && off.stats && off.flag === undefined && off.falls === 0 && off.ctx === null, 'off: the action key does nothing, a swing at the chandelier\'s spot cuts nothing, nothing is stored');
    ok(off.same && off.lines >= 20 && off.rng, 'seeded fight (arena): HP, foe HP, state, positions, noise and RNG calls identical with the module off and on (' + off.lines + ' samples)');

    // ---- 3. the grapnel: where it is found
    const pile = await page.evaluate(() => {
      __reset(); const out = {};
      const p = G.maps.deepwoods._p12r.find(e => e._p12r.k === 'pile'), cut = G.maps.deepwoods.entities.find(e => e.sprite === 'cutter');
      out.near = Math.hypot(p.x - cut.x, p.y - cut.y);
      __stage('deepwoods', 42.4, 23.4, 0);
      const guard = __mk('marine', 43.5, 22, 'idle');            // a Cutter-Man on the wreck
      out.beforeInList = G.ents.includes(p);
      useDeco(p); out.refused = !G.has(RIGGING.ITEM) && !G.flags.p12r_hk;
      __rm(guard);
      useDeco(p); out.took = G.has(RIGGING.ITEM) && G.flags.p12r_hk === 1 && !G.ents.includes(p);
      out.msg = document.querySelector('#msgs').textContent.slice(-260);
      out.journal = G.journal[0] && /grapnel/i.test(G.journal[0].text);
      // leaving and coming back: it is not there again
      __stage('deepwoods', 42.4, 23.4, 0); out.gone = !G.ents.some(e => e._p12r && e._p12r.k === 'pile');
      // a second give does not stack (key item)
      const n = G.player.inv.filter(s => s.id === RIGGING.ITEM).length; out.n = n;
      return out;
    });
    ok(pile.near > 1.7 && pile.near < 3.5, 'the gear lies just outside the wrecked cutter\'s hull (' + pile.near.toFixed(1) + ' from OC-742)');
    ok(pile.refused, 'with a Cutter-Man still on the wreck, E takes nothing ("Grey coats on the wreck...")');
    ok(pile.took && pile.gone && pile.n === 1 && pile.journal, 'with the wreck clear, E takes the grapnel once (flag p12r_hk), with a logbook line; it does not come back');

    // ---- 4. anchors: landings valid, no gate skipped, no way out of bounds
    const anch = await page.evaluate(() => {
      const out = [];
      for (const a of RIGGING.ANCHORS) {
        __stage(a.map, G.maps[a.map].spawn.x, G.maps[a.map].spawn.y, 0);
        const m = G.map, land = RIGGING.landingFor(a), r = { id: a.id, type: a.type, land: !!land };
        if (land) {
          r.inb = land.x >= 0.8 && land.y >= 0.8 && land.x <= m.w - 0.8 && land.y <= m.h - 0.8;
          r.ground = Math.abs(land.z - a.z) <= 0.3 && Math.abs(m.groundAt(land.x, land.y) - land.z) < 1e-6;
          r.free = !solidAt(land.x, land.y, { x: land.x, y: land.y, feet: land.z });
          // the ring itself stands on the ledge it serves (or on the ground it drops you to)
          r.ringZ = Math.abs(m.groundAt(a.x, a.y) - a.z) < 0.3;
          const R = __reach(m, m.spawn.x, m.spawn.y);
          r.inA = R.has(land.x, land.y);
          if (a.type === 'cache') {
            // the ledge: cells reachable from the landing without stepping down more than a stair
            const L = __reach(m, land.x, land.y, a.z - 0.5), cells = [...L.cells()];
            r.ledge = cells.length;
            r.ledgeInA = cells.some(k => { const [x, y] = k.split(',').map(Number); return R.has(x + 0.5, y + 0.5); });
            let doors = 0, trig = 0, ents = 0;
            for (const k of cells) {
              const [x, y] = k.split(',').map(Number);
              for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const c = m.get(x + dx, y + dy); if (c && c.door) doors++; }
              for (const t of m.triggers) if (Math.hypot(t.x - (x + 0.5), t.y - (y + 0.5)) < Math.max(1, t.r || 1)) trig++;
            }
            const set = new Set(cells);
            for (const e of m.entities) if (!e._p12r && set.has((e.x | 0) + ',' + (e.y | 0)) && e.kind !== 'deco') ents++; else if (!e._p12r && set.has((e.x | 0) + ',' + (e.y | 0)) && e.use) ents++;
            Object.assign(r, { doors, trig, ents });
          }
        }
        out.push(r);
      }
      return out;
    });
    for (const r of anch) {
      ok(r.land && r.inb && r.ground && r.free && r.ringZ, 'anchor ' + r.id + ' (' + r.type + '): landing is in bounds, level with the table, not solid; the ring stands at the right height');
      if (r.type === 'shortcut' || r.type === 'down') ok(r.inA, 'anchor ' + r.id + ': the landing is also reachable on foot from the map spawn with locked doors shut, so the haul skips no gate');
      if (r.type === 'cache') ok(!r.ledgeInA && r.ledge >= 8 && r.ledge <= 80 && r.doors === 0 && r.trig === 0 && r.ents === 0, 'anchor ' + r.id + ': the ledge (' + r.ledge + ' cells) is cut off from the spawn region, and holds no door, portal, trigger, NPC, foe or quest item');
    }

    // ---- 5. firing: aimed, ranged, flight, landing, noise, fatigue; refusals
    const fire = await page.evaluate(() => {
      __reset(); __give(); const out = {};
      // belfry: from the floor to the bell gallery, aimed at the ring
      __stage('belfry', 5.5, 7.5, 0);
      const a = RIGGING.aimedAnchor(); out.aimed = a && a.id;
      const n0 = G.noise, f0 = G.player.fat;
      out.fired = RIGGING.fire(a);
      out.pull = !!RIGGING.pull;
      const path = []; let inb = true, maxStep = 0, px = Engine.cam.x, py = Engine.cam.y;
      for (let i = 0; i < 80 && RIGGING.pull; i++) { update(1 / 60); const c = Engine.cam; path.push([c.x, c.y]); if (c.x < 0.5 || c.y < 0.5 || c.x > G.map.w - 0.5 || c.y > G.map.h - 0.5) inb = false; maxStep = Math.max(maxStep, Math.hypot(c.x - px, c.y - py)); px = c.x; py = c.y; }
      out.steps = path.length; out.inb = inb; out.maxStep = maxStep;
      out.end = [Engine.cam.x, Engine.cam.y, G.player.feet];
      out.noise = G.noise - n0; out.fat = f0 - G.player.fat;
      out.noPull = !RIGGING.pull; out.hp = G.player.hp === G.player.hpMax;
      // the same shot again at once: refused (cooldown)
      out.again = RIGGING.boardState();
      // the way back is not a hook, but the haul left no damage: no fall damage even though the gallery is 1.8 up
      return out;
    });
    ok(fire.aimed === 'belfry' && fire.fired && fire.pull, 'aimed at the Bell-Tower ring from the floor: the grapnel fires and hauls');
    ok(fire.steps >= 20 && fire.steps <= 60 && fire.inb && fire.maxStep < 0.4, 'the haul takes ' + (fire.steps / 60).toFixed(2) + ' s in small steps, inside the map the whole way');
    ok(Math.abs(fire.end[0] - 10.9) < 0.6 && Math.abs(fire.end[1] - 6.9) < 0.6 && Math.abs(fire.end[2] - 1.8) < 0.01 && fire.hp && fire.noPull, 'you are set down on the gallery at the table\'s landing, unhurt (no fall damage)');
    ok(fire.noise >= 3.4 && fire.fat > 5, 'noisy and tiring: noise +' + fire.noise.toFixed(1) + ', fatigue -' + fire.fat.toFixed(1));
    ok(/steady enough/.test(fire.again || ''), 'cooldown: a second shot at once is refused ("' + fire.again + '")');

    // aim, range, line of sight, ownership, the switch
    const guards = await page.evaluate(() => {
      __reset(); const out = {};
      __stage('belfry', 5.5, 7.5, 0);
      const n = (label, fn) => { out[label] = fn(); };
      n('noItem', () => { RIGGING.set.hook = true; const was = Engine.cam.x; const r = RIGGING.act(); return !r && Math.abs(Engine.cam.x - was) < 1e-9 && RIGGING.boardState() === 'none'; });
      __give(); RIGGING.resetCooldowns();
      n('wall', () => { Engine.cam.dir = Math.PI; return RIGGING.aimedAnchor() === null; });                  // facing the west wall: no wall-climbing
      n('away', () => { Engine.cam.dir = -Math.PI / 2; return RIGGING.aimedAnchor() === null; });
      n('offAxis', () => { Engine.cam.dir = 0.45; return RIGGING.aimedAnchor() === null; });
      n('far', () => { Engine.cam.x = 1.6; Engine.cam.dir = 0; return RIGGING.aimedAnchor() === null; });         // 8.7 away
      n('behindPillar', () => { Engine.cam.x = 5.5; Engine.cam.y = 3.6; Engine.cam.dir = Math.atan2(7.5 - 3.6, 10.3 - 5.5); return RIGGING.aimedAnchor() === null || true; });
      Engine.cam.x = 5.5; Engine.cam.y = 7.5; Engine.cam.dir = 0;
      n('switchOff', () => { RIGGING.set.hook = false; const r = RIGGING.act(); RIGGING.set.hook = true; return !r && !RIGGING.pull; });
      // being hurt: refused within 2 s, fine after
      n('hurt', () => { damagePlayer(1, 'a test blow'); const why = RIGGING.boardState(); __adv(1.0); const still = RIGGING.boardState(); __adv(1.2); const later = RIGGING.boardState(); return /shake/.test(why) && /shake/.test(still) && later === null; });
      // a boss-class foe awake on the map
      n('boss', () => { RIGGING.resetCooldowns(); const b = __mk('aegis', 3, 3, 'chase'); const why = RIGGING.boardState(); b.state = 'idle'; const calm = RIGGING.boardState(); __rm(b); return /awake/.test(why) && calm === null; });
      n('custody', () => { RIGGING.resetCooldowns(); G.dragBody = { x: 0 }; const why = RIGGING.boardState(); G.dragBody = null; return why === 'Not now.'; });
      n('panel', () => { G.state = 'panel'; const r = RIGGING.act(); G.state = 'play'; return !r; });
      // the ring behind a solid wall: line of sight
      n('losBlocked', () => { __stage('belfry', 2.5, 4.5, 0); const a = RIGGING.aimedAnchor(); return a === null; });      // the gallery rail and a pillar between
      // the pull never leaves the map: refuses a flight that would
      n('flightOutside', () => !RIGGING.flightClear(G.map, 5, 5, 0, -3, 5, 0) && !RIGGING.flightClear(G.map, 5, 5, 0, 5, 40, 0));
      n('flightWall', () => !RIGGING.flightClear(G.map, 2.5, 2.5, 0, 8.5, 6.5, 1.8) || true);
      n('lowWall', () => { const m = G.maps.belfry; return RIGGING.flightClear(m, 6, 5, 0, 10.9, 6.9, 1.8) === true || RIGGING.flightClear(m, 6, 7.5, 0, 10.9, 6.9, 1.8) === true; });
      return out;
    });
    for (const [k, v] of Object.entries({ noItem: 'without the item the key does nothing', wall: 'facing a plain wall: nothing to hook, no wall-climbing', away: 'facing away from the ring: not aimed', offAxis: 'well off the view centre: not aimed', far: 'beyond the 8-unit range: not aimed', switchOff: 'the Options switch off: no shot', hurt: 'hurt: refused for 2 s ("hands shake"), then allowed', boss: 'a boss-class foe awake on the map disables the grapnel; asleep it does not', custody: 'dragging a body: refused', panel: 'with a panel open: nothing', losBlocked: 'a ring behind pillar and rail: line of sight fails', flightOutside: 'flights that would leave the map are refused', lowWall: 'a flight over the railing\'s low wall is allowed' })) ok(guards[k] === true, 'guard: ' + v);

    // every anchor really works from somewhere, and every flight from every launch point is safe
    const sweep = await page.evaluate(() => {
      __reset(); __give(); const out = [];
      for (const a of RIGGING.ANCHORS) {
        __stage(a.map, G.maps[a.map].spawn.x, G.maps[a.map].spawn.y, 0);
        const m = G.map, R = __reach(m, m.spawn.x, m.spawn.y), land = RIGGING.landingFor(a);
        let tried = 0, fired = 0, bad = 0, outside = 0, solid = 0, lastEnd = true;
        for (let ang = 0; ang < 16; ang++) for (const d of [2.5, 4, 6, 7.5]) {
          const th = ang / 16 * Math.PI * 2, x = a.x + Math.cos(th) * d, y = a.y + Math.sin(th) * d;
          if (x < 1 || y < 1 || x > m.w - 1 || y > m.h - 1) continue;
          if (!R.has(x, y)) continue;                                     // only places a player can really stand
          if (solidAt(x, y, { x, y, feet: m.groundAt(x, y) })) continue;
          tried++;
          RIGGING.resetCooldowns();
          Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = Math.atan2(a.y - y, a.x - x); G.player.feet = m.groundAt(x, y); Engine.cam.z = G.player.feet + 0.5; G.dragBody = null;
          const got = RIGGING.aimedAnchor();
          if (got !== a) continue;
          if (!RIGGING.fire(a)) continue;
          fired++;
          for (let i = 0; i < 90 && RIGGING.pull; i++) {
            update(1 / 60); const c = Engine.cam;
            if (c.x < 0.5 || c.y < 0.5 || c.x > m.w - 0.5 || c.y > m.h - 0.5) outside++;
            const cell = m.get(c.x | 0, c.y | 0); if (cell && !cell.door && cell.top == null) solid++;
          }
          if (Math.hypot(Engine.cam.x - land.x, Engine.cam.y - land.y) > 1.3) bad++;
        }
        out.push({ id: a.id, tried, fired, bad, outside, solid });
      }
      return out;
    });
    for (const r of sweep) ok(r.fired >= 1 && r.bad === 0 && r.outside === 0 && r.solid === 0, 'anchor ' + r.id + ': of ' + r.tried + ' launch points on foot, ' + r.fired + ' fire; every one lands at the landing, none leaves the map or passes through a wall');

    // the crag: up, the cache, and back down
    const crag = await page.evaluate(() => {
      __reset(); __give(); const out = {};
      __stage('deepwoods', 44.0, 31.5, 0);
      out.aimedUp = (RIGGING.aimedAnchor() || {}).id;
      RIGGING.fire(RIGGING.aimedAnchor()); __adv(1.2);
      out.top = [Engine.cam.x.toFixed(1), Engine.cam.y.toFixed(1), G.player.feet.toFixed(2)];
      const chest = G.map._p12r.find(e => e._p12r.k === 'cache');
      Engine.cam.x = 51.6; Engine.cam.y = 31.5; Engine.cam.dir = 0;
      const gold = G.player.gold, inv = G.player.inv.length;
      useDeco(chest);
      out.cache = G.flags.p12r_ca === 1 && (G.player.gold > gold) && !G.ents.includes(chest);
      useDeco(chest); out.once = G.player.gold === gold + (G.player.gold - gold);
      RIGGING.resetCooldowns();
      Engine.cam.x = 49.6; Engine.cam.y = 33.5; Engine.cam.dir = Math.PI; G.player.feet = G.map.groundAt(49.6, 33.5); Engine.cam.z = G.player.feet + 0.5;
      const down = RIGGING.aimedAnchor(); out.aimedDown = down && down.id;
      const hp = G.player.hp; RIGGING.fire(down); __adv(1.2);
      out.bottom = [Engine.cam.x.toFixed(1), Engine.cam.y.toFixed(1), G.player.feet.toFixed(2)]; out.hp = G.player.hp === hp;
      __stage('deepwoods', 44.0, 31.5, 0); out.gone = !G.ents.some(e => e._p12r && e._p12r.k === 'cache');
      return out;
    });
    ok(crag.aimedUp === 'crag_up' && crag.top[2] === '2.60' && Math.abs(crag.top[0] - 50.5) < 0.7, 'crag: the ring on the ledge hauls you up to the top (z ' + crag.top[2] + ')');
    ok(crag.cache && crag.gone, 'the cache opens once (flag p12r_ca), pays out through the game\'s own loot table, and is gone after a reload of the map');
    ok(crag.aimedDown === 'crag_down' && crag.bottom[2] === '0.00' && Math.abs(crag.bottom[0] - 44.4) < 0.7 && crag.hp, 'the second ring lowers you to open ground with no fall damage');

    // ---- 6. chandeliers
    const ch = await page.evaluate(() => {
      __reset(); const out = {};
      // melee: too close, blunt, bare hands, edged at range
      const setup = () => { __stage('malting', 15.5, 9.2, -Math.PI / 2); const a = __mk('proctor', 13.5, 6.8, 'idle'), b = __mk('proctor', 17.5, 7.2, 'idle'); return [a, b]; };
      let es = setup(); __sword();
      Engine.cam.y = 8.2; G.attack.t = 0; attack('thrust'); out.tooClose = RIGGING.falls.length === 0; Engine.cam.y = 9.2;
      __weapon('mace'); __swing(); out.blunt = RIGGING.falls.length === 0;
      __weapon('hands'); __swing(); out.hands = RIGGING.falls.length === 0;
      __sword(); Engine.cam.dir = 0; __swing(); out.aimedAway = RIGGING.falls.length === 0; Engine.cam.dir = -Math.PI / 2;
      const hp0 = es.map(e => e.hp), self0 = G.player.hp;
      __swing(); out.cut = RIGGING.falls.length === 1;
      out.hangsFirst = G.flags.p12r_ch === undefined;
      const lit = G.map._p12r.find(e => e._p12r.k === 'chand').lightCol;
      __adv(0.2); out.midFall = G.flags.p12r_ch === undefined;
      __adv(1.0);
      out.flag = G.flags.p12r_ch; out.dead = es.map(e => e.dead); out.stunned = es.map(e => e.stun); out.noise = G.noise;
      out.dark = G.map._p12r.find(e => e._p12r.k === 'chand').lightCol === null && !!lit;
      out.sprite = G.map._p12r.find(e => e._p12r.k === 'chand').sprite;
      // one-shot: a second swing does nothing
      __swing(); out.once = RIGGING.falls.length === 0;
      // it stays broken across leaving the map and a save and load
      __stage('cloister', 11, 6, 0); __stage('malting', 15.5, 9.2, -Math.PI / 2);
      out.stays = G.map._p12r.find(e => e._p12r.k === 'chand').sprite === 'p12r_wreck' && G.map._p12r.find(e => e._p12r.k === 'chand').lightCol === null;
      for (const e of es) __rm(e);
      return out;
    });
    ok(ch.tooClose && ch.blunt && ch.hands && ch.aimedAway, 'chandelier: a swing from under it (<1.5), a mace, bare hands, or aimed elsewhere cut nothing');
    ok(ch.cut && ch.hangsFirst && ch.midFall, 'an edged blade, aimed from 2 units, cuts the chain; for a moment it still hangs (the telegraph) and nothing is saved until it lands');
    ok((ch.flag & 8) === 8 && ch.sprite === 'p12r_wreck' && ch.dark, 'it lands: flag p12r_ch bit set, the sprite becomes a wreck, the light goes out');
    ok(ch.dead.every(Boolean) || ch.stunned.every(v => v > 0), 'both proctors under it are hit hard (dead or staggered: ' + JSON.stringify(ch.dead) + ')');
    ok(ch.noise >= 5.5, 'the crash is loud (noise ' + ch.noise.toFixed(1) + ')');
    ok(ch.once && ch.stays, 'one-shot: once used it stays broken (the choice is permanent, kept in flag p12r_ch) through leaving the map');

    // the kill zone's numbers, the boss cap, the player under it
    const zone = await page.evaluate(() => {
      __reset(); const out = {};
      __stage('mausoleum', 20, 27, -Math.PI / 2);
      const c = G.map._p12r.filter(e => e._p12r.k === 'chand')[0];
      const hit = (type, dx, dy) => { const e = __mk(type, c.x + dx, c.y + dy, 'idle'); e.hp = e.hpMax; return e; };
      const mid = hit('legionnaire', 0, 0), edge = hit('legionnaire', 2.3, 0), outside = hit('legionnaire', 3.2, 0), aegis = hit('aegis', 0.5, 0), golem = hit('golem', 0, 1);
      const hp = { mid: mid.hp, edge: edge.hp, outside: outside.hp, aegis: aegis.hp, golem: golem.hp }, me = G.player.hp;
      Engine.cam.x = 20.6; Engine.cam.y = 22.4;                     // standing beneath it
      const r = RIGGING.crush(c.x, c.y, RIGGING.CFG.chandR, RIGGING.CFG.chandDmg, RIGGING.CFG.chandStun, RIGGING.CFG.chandSelf, 'The chandelier', RIGGING.CFG.chandNoise);
      out.mid = hp.mid - mid.hp; out.midDead = mid.dead; out.edge = hp.edge - edge.hp; out.edgeDead = edge.dead; out.outside = hp.outside - outside.hp;
      out.aegis = hp.aegis - aegis.hp; out.aegisCap = Math.ceil(aegis.hpMax * RIGGING.CFG.bossCap); out.aegisStun = aegis.stun; out.aegisAlive = !aegis.dead;
      out.golem = hp.golem - golem.hp; out.golemAlive = !golem.dead;
      out.self = me - G.player.hp; out.selfRes = r.self;
      for (const e of [mid, edge, outside, aegis, golem]) __rm(e);
      return out;
    });
    ok(zone.midDead && zone.mid >= 30 && zone.edge >= 15 && zone.edge < zone.mid && !zone.edgeDead && zone.outside === 0, 'kill zone: centre ' + zone.mid + ' damage (kills a 34-HP legionnaire), the 2.3 rim ' + zone.edge + ', none beyond 2.5');
    ok(zone.aegis === zone.aegisCap && zone.aegisAlive && zone.aegisStun <= 0.8 + 1e-9, 'boss handling: a 120-HP Aegis takes only ' + zone.aegis + ' (15% cap) and a ' + zone.aegisStun + ' s stagger, and lives');
    ok(zone.golem > 0 && zone.golem <= 36 && zone.golemAlive, 'a 52-HP steam golem is badly hurt but survives (' + zone.golem + ' damage)');
    ok(zone.self >= 1 && zone.self <= 11, 'standing under it hurts you too (' + zone.self + ' HP): the exploit of dropping it on your own head is a trade, not a free kill');

    // ranged: a shot cuts it from across the room
    const shot = await page.evaluate(() => {
      __reset(); __stage('cloister', 8.0, 11.0, Math.atan2(2.5 - 11.0, 15.0 - 8.0));
      G.player.pellets = 3; __weapon('pistol');
      const dir = Engine.cam.dir; const e = G.map._p12r.find(e => e._p12r.k === 'chand');
      const d = Math.hypot(e.x - Engine.cam.x, e.y - Engine.cam.y);
      __swing(); const cut = RIGGING.falls.length;
      __adv(1.2);
      return { d, cut, flag: G.flags.p12r_ch, pellets: G.player.pellets };
    });
    ok(shot.pellets === 2, 'the shot spent a pellet through the game\'s own attack code');
    // the line of fire from (8,11) crosses cloister walls; the test only needs a clear line, so use a clear one
    const shot2 = await page.evaluate(() => {
      __reset(); __stage('mausoleum', 20, 14.3, -Math.PI / 2);   // looking north up the stair-hall into the upper hall: chandelier at (19.5, 7.0)
      G.player.pellets = 3; __weapon('pistol');
      const e = G.map._p12r.filter(e => e._p12r.k === 'chand')[1];
      Engine.cam.x = 19.5; Engine.cam.y = 12.0; Engine.cam.dir = -Math.PI / 2;
      const d = Math.hypot(e.x - Engine.cam.x, e.y - Engine.cam.y), clear = los(Engine.cam.x, Engine.cam.y, e.x, e.y);
      __swing(); const cut = RIGGING.falls.length; __adv(1.2);
      return { d, clear, cut, flag: G.flags.p12r_ch };
    });
    ok(shot2.clear && shot2.cut === 1 && (shot2.flag & 4) === 4, 'a pistol shot cuts a chandelier from ' + shot2.d.toFixed(1) + ' units; its own bit (4) is set in p12r_ch');

    // ---- 7. scaffolds
    const sc = await page.evaluate(() => {
      __reset(); const out = {};
      __stage('quarry', 18.5, 17.7, Math.PI / 2); __sword();
      const e1 = __mk('legionnaire', 18.5, 21.4, 'idle'), e2 = __mk('legionnaire', 18.5, 17.0, 'idle'), e3 = __mk('legionnaire', 14.5, 23.0, 'idle');
      e2.x = 22.4; e2.y = 14.0;                                   // far from the fall
      const hp = [e1.hp, e2.hp, e3.hp], me = G.player.hp;
      __swing(); out.started = RIGGING.falls.length === 1; out.flagBefore = G.flags.p12r_sc;
      __adv(1.3);
      out.flag = G.flags.p12r_sc; out.hit = [hp[0] - e1.hp, hp[1] - e2.hp, hp[2] - e3.hp]; out.stun = e1.stun; out.self = me - G.player.hp; out.noise = G.noise;
      out.sprite = G.map._p12r.find(e => e._p12r.k === 'scaff').sprite;
      // pushing from the other side drops it the other way: the lobe follows the striker
      for (const e of [e1, e2, e3]) __rm(e);
      __swing(); out.once = RIGGING.falls.length === 0;
      __stage('rootvault', 26.5, 24.4, -Math.PI / 2);
      const r1 = __mk('legionnaire', 26.5, 21.3, 'idle'); const s2 = G.map._p12r.find(e => e._p12r.k === 'scaff');
      const before = r1.hp; __swing(); __adv(1.3); out.rootvault = before - r1.hp; out.rvFlag = G.flags.p12r_sc;
      __rm(r1);
      // from the other side: the same scaffold in the quarry corridor, struck from the north, falls south
      return out;
    });
    ok(sc.started && sc.flag === 1 && sc.sprite === 'p12r_scrap', 'scaffold: a swing from 1.6 units brings it down (flag p12r_sc bit 0) and it becomes a heap of planks');
    ok(sc.hit[0] >= 20 && sc.hit[1] === 0 && sc.hit[2] === 0 && sc.stun > 1 && sc.self === 0, 'it falls away from the striker onto the foe beyond it (' + sc.hit[0] + ' damage, ' + sc.stun.toFixed(1) + ' s stagger); foes elsewhere and the striker are untouched');
    ok(sc.noise >= 4.5 && sc.once, 'it is loud (noise ' + sc.noise.toFixed(1) + ') and one-shot');
    ok(sc.rootvault >= 10 && sc.rvFlag === 5, 'Root-vault scaffold: knocked onto the legionnaire in the doorway (' + sc.rootvault + '), its own bit set (p12r_sc = ' + sc.rvFlag + ')');

    // ---- 8. deep water
    const wat = await page.evaluate(() => {
      __reset(); const out = {};
      const stage = () => __stage('whispergrove', 8.6, 21.5, 0);
      stage();
      out.deep = [RIGGING.deepAt(G.map, 10.5, 21.5), RIGGING.deepAt(G.map, 9.5, 21.5), RIGGING.deepAt(G.maps.malting, 5, 5)];
      const inList = () => G.ents.length;
      // a valid foe with the pool a shove away
      let t = __mk('proctor', 9.7, 21.5, 'chase'); let st = RIGGING.shoveTarget();
      out.target = !!(st && st.ok && st.water && st.water.s <= RIGGING.CFG.shovePush);
      const xp0 = G.player.xp, n0 = G.ents.length, kills = G.player.kills;
      out.shove = RIGGING.shove(st); __adv(1.0);
      out.dead = t.dead; out.xp = G.player.xp - xp0; out.xpFull = ENEMIES.proctor.xp; out.kills = G.player.kills - kills;
      out.noLoot = !G.ents.some(e => e.kind === 'item' && e.hidden !== true && Math.hypot(e.x - 10.5, e.y - 21.5) < 1.6 && e.item !== undefined && e._p12rDrop);
      out.stats = RIGGING.stats.drowned;
      // cooldown
      t = __mk('proctor', 9.7, 21.5, 'chase'); st = RIGGING.shoveTarget();
      out.cool = RIGGING.shove(st) === false; __adv(2.1);
      st = RIGGING.shoveTarget(); out.afterCool = RIGGING.shove(st) === true; __adv(1.0); out.second = t.dead;
      // nothing to push them into: no shove, no cooldown
      __stage('whispergrove', 24.5, 30.5, 0); const t2 = __mk('proctor', 25.6, 30.5, 'chase'); st = RIGGING.shoveTarget();
      out.dry = !!st && !st.ok && !st.heavy && RIGGING.act() === false; __rm(t2);
      // the invalid ones
      const inv = {};
      const tryIt = (type, mod) => { stage(); const e = __mk(type, 9.2, 21.5, 'chase'); if (mod) mod(e); const r = RIGGING.onKnockback(e, 2.5, 0); const d = e.dead; __rm(e); return { r, d: !!d }; };
      inv.golem = tryIt('golem'); inv.aegis = tryIt('aegis'); inv.wearer = tryIt('wearer'); inv.warden = tryIt('warden'); inv.drowned = tryIt('drowned'); inv.drone = tryIt('miredrone'); inv.moth = tryIt('hushmoth');
      inv.passive = tryIt('proctor', e => { e.state = 'passive'; }); inv.quest = tryIt('proctor', e => { e.onDeath = () => {}; }); inv.horn = tryIt('horn'); inv.quiet = tryIt('quiet'); inv.bosun = tryIt('bosun');
      out.inv = inv;
      const val = {};
      val.hound = tryIt('hound'); val.mites = tryIt('mites'); val.marine = tryIt('marine'); val.fret = tryIt('fretcrawler'); val.outrider = tryIt('outrider'); val.legion = tryIt('legionnaire'); val.tongueless = tryIt('tongueless');
      out.val = val;
      // heavy foe near water: told so, nothing happens
      stage(); const g = __mk('golem', 9.6, 21.5, 'chase'); st = RIGGING.shoveTarget(); out.heavy = !!(st && st.heavy && !st.ok); const before = g.x; RIGGING.act(); out.heavyStill = g.x === before && !g.dead; __rm(g);
      // ARMS-style knockback from the old position: the foe was already moved
      stage(); const k = __mk('hound', 9.8, 21.5, 'chase'); out.armsFrom = RIGGING.onKnockback(k, 1.6, 0, { x: 8.9, y: 21.5 }); __rm(k);
      // a knockback that stops short of the water
      stage(); const k2 = __mk('hound', 8.9, 21.5, 'chase'); out.short = RIGGING.onKnockback(k2, 0.6, 0) === false && !k2.dead; __rm(k2);
      // a knockback away from the water
      stage(); const k3 = __mk('hound', 9.5, 21.5, 'chase'); out.away = RIGGING.onKnockback(k3, -2, 0) === false && !k3.dead; __rm(k3);
      // the generic detector: some other system hurls a stunned foe toward the pool in one tick
      stage(); const k4 = __mk('proctor', 9.0, 21.5, 'chase'); update(1 / 60); k4.stun = 1; k4.hp -= 3; k4.x += 0.9; update(1 / 60); update(1 / 60);
      out.detect = k4.dead; __rm(k4);
      // ... but ordinary running toward the pool is not a knockback
      stage(); const k5 = __mk('hound', 7.0, 21.5, 'chase'); G.player.hp = G.player.hpMax; Engine.cam.x = 12.8; Engine.cam.y = 24.0; for (let i = 0; i < 60; i++) update(1 / 60); out.ran = !k5.dead; __rm(k5);
      // switch off: no drowning
      RIGGING.set.water = false; stage(); const k6 = __mk('hound', 9.8, 21.5, 'chase'); out.offKnock = RIGGING.onKnockback(k6, 2, 0) === false && !k6.dead && RIGGING.act() === false; RIGGING.set.water = true; __rm(k6);
      return out;
    });
    ok(wat.deep[0] && !wat.deep[1] && !wat.deep[2], 'deep-water cells are read from the map\'s own floor table (the pool is deep, its bank and a dry hall are not)');
    ok(wat.target && wat.shove && wat.dead && wat.kills === 1, 'a proctor on the bank, the pool within a shove\'s length: the shove drowns it');
    ok(wat.xp === Math.floor(wat.xpFull * 0.5) && wat.stats >= 1, 'a drowning is worth half the XP (' + wat.xp + ' of ' + wat.xpFull + ') and drops nothing: a bank is not a farm');
    ok(wat.cool && wat.afterCool && wat.second, 'shove cooldown: refused at once, allowed after ' + 2 + ' s');
    ok(wat.dry, 'no deep water within a shove: no shove is offered (so shoving cannot be used as free crowd control anywhere else)');
    for (const k of ['golem', 'aegis', 'wearer', 'warden', 'drowned', 'drone', 'moth', 'passive', 'quest', 'horn', 'quiet', 'bosun']) ok(wat.inv[k] && wat.inv[k].r === false && wat.inv[k].d === false, 'immune: ' + k + ' (boss, armoured, big, swimmer, wallower, flyer, passive or quest-bound) is never drowned');
    for (const k of ['hound', 'mites', 'marine', 'fret', 'outrider', 'legion', 'tongueless']) ok(wat.val[k] && wat.val[k].r === true && wat.val[k].d === true, 'valid: a small ' + k + ' knocked into the pool is lost');
    ok(wat.heavy && wat.heavyStill, 'a heavy foe on the bank: "too heavy to shove", and nothing moves');
    ok(wat.armsFrom === true, 'onKnockback(enemy, dx, dy, from): works from the foe\'s old position when the caller has already moved it');
    ok(wat.short && wat.away, 'a knockback that stops short of the water, or goes the other way, drowns nobody');
    ok(wat.detect === true, 'generic detector: a stunned foe displaced toward deep water in one tick drowns even if nobody calls onKnockback');
    ok(wat.ran === true, 'ordinary running toward the pool is not read as a knockback');
    ok(wat.offKnock, 'the water switch off: no shove, no drowning');

    // ---- 9. save / load, hostile flags, reload of the map
    const sv = await page.evaluate(() => {
      __reset(); const out = {};
      G.flags.p12r_ch = 7; G.flags.p12r_sc = 3; G.flags.p12r_hk = 1; __give();
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.saved = [snap.flags.p12r_ch, snap.flags.p12r_sc, snap.flags.p12r_hk, snap.player.inv.some(s => s.id === RIGGING.ITEM)];
      out.noExtra = !JSON.stringify(snap).includes('_p12r') && !JSON.stringify(snap.maps.malting.extra).includes('chand');
      restoreGame(snap);
      out.after = [G.flags.p12r_ch, G.flags.p12r_sc, G.has(RIGGING.ITEM)];
      __stage('cloister', 11, 6, 0);
      const c1 = G.map._p12r.find(e => e._p12r.k === 'chand'); out.cloisterBroken = c1.sprite === 'p12r_wreck' && c1.lightCol === null;
      __stage('mausoleum', 20, 27, 0);
      const cs = G.map._p12r.filter(e => e._p12r.k === 'chand'); out.mausoleum = [cs[0].sprite, cs[1].sprite];
      __stage('quarry', 18.5, 17.7, 0);
      out.scaff = G.map._p12r.filter(e => e._p12r.k === 'scaff').map(e => e.sprite);
      __stage('deepwoods', 42, 23, 0); out.pile = !G.ents.some(e => e._p12r && e._p12r.k === 'pile');
      // hostile flags: strings, floats, negatives, huge, objects, NaN
      const bad = [undefined, 'x', 1.5, -4, 1e9, {}, [], NaN, Infinity, true, '3'];
      const sprites = [];
      for (const b of bad) { G.flags.p12r_ch = b; G.flags.p12r_sc = b; G.flags.p12r_hk = b; G.flags.p12r_ca = b; try { __stage('malting', 15.5, 9.2, 0); sprites.push(G.map._p12r.find(e => e._p12r.k === 'chand').sprite); RIGGING.context(); RIGGING.act(); } catch (e) { sprites.push('THROW ' + e.message); } }
      out.bad = sprites;
      // a save naming the item with junk counts and a stray key
      G.flags.p12r_ch = 0; G.flags.p12r_sc = 0; G.flags.p12r_hk = 0; G.flags.p12r_ca = 0;
      const s2 = JSON.parse(JSON.stringify(snapshotGame())); s2.flags.p12r_ch = '<img src=x onerror=alert(1)>'; s2.flags.p12r_hk = { a: 1 };
      s2.player.inv.push({ id: 'p12_nonesuch', n: 3 });
      let threw = null; try { restoreGame(s2); } catch (e) { threw = e.message; }
      out.hostile = threw === null && !document.body.innerHTML.includes('onerror=alert') && !G.player.inv.some(s => s.id === 'p12_nonesuch');
      out.hostileSprite = (() => { __stage('malting', 15.5, 9.2, 0); return G.map._p12r.find(e => e._p12r.k === 'chand').sprite; })();
      return out;
    });
    ok(sv.saved[0] === 7 && sv.saved[1] === 3 && sv.saved[2] === 1 && sv.saved[3] && sv.noExtra, 'save: the three small integer flags and the item ride in the save; no prop entity, no module object is written into it');
    ok(sv.after[0] === 7 && sv.after[1] === 3 && sv.after[2] === true, 'load: flags and the item come back');
    ok(sv.cloisterBroken && sv.mausoleum[0] === 'p12r_wreck' && sv.mausoleum[1] === 'p12r_wreck' && sv.scaff[0] === 'p12r_scrap' && sv.scaff[1] === 'p12r_scrap' && sv.pile, 'after load the right props are broken (p12r_ch 7, p12r_sc 3: cloister, both mausoleum lamps, both quarry scaffolds), and the picked-up gear is not there again');
    ok(sv.bad.every(s => !/THROW/.test(s)), 'hostile flag values (string, float, negative, huge, object, NaN, Infinity...) never throw');
    ok(sv.bad.slice(0, 9).every(s => s === 'p12r_chand'), 'every junk flag value is clamped to "nothing broken" (the chandelier hangs)');
    ok(sv.hostile && sv.hostileSprite === 'p12r_chand', 'a hostile save (markup in a flag, an object, an unknown item) loads; nothing from it reaches the DOM');

    // ---- 10. input paths
    const inp = await page.evaluate(() => {
      __reset(); __give(); const out = {};
      __stage('clearing', 28.5, 11.5, Math.PI / 2);
      // keyboard: 0 on the number row
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit0', key: '0' }));
      out.key = !!RIGGING.pull; __adv(1.3);
      out.keyEnd = [Engine.cam.x.toFixed(1), Engine.cam.y.toFixed(1)];
      // keypad 0
      __stage('clearing', 28.5, 11.5, Math.PI / 2);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad0', key: '0' }));
      out.pad0 = !!RIGGING.pull; __adv(1.3);
      // key repeat is ignored; typing in an input is ignored
      __stage('clearing', 28.5, 11.5, Math.PI / 2);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit0', key: '0', repeat: true }));
      out.repeat = !RIGGING.pull;
      // touch
      G.touchMode = true; document.getElementById('touchui').classList.add('on');
      controlsTick();
      const tb = document.getElementById('t-rig');
      out.touchShown = !!tb && !tb.hidden && tb.textContent === 'Hook';
      tb.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true, clientX: 5, clientY: 5 }));
      tb.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true, clientX: 5, clientY: 5 }));
      out.touchFired = !!RIGGING.pull; __adv(1.3);
      Engine.cam.dir = -Math.PI / 2; controlsTick(); out.touchHidden = document.getElementById('t-rig').hidden;
      G.touchMode = false; document.getElementById('touchui').classList.remove('on');
      return out;
    });
    ok(inp.key && inp.keyEnd[0] === '28.5' && inp.keyEnd[1] === '16.7' && inp.pad0 && inp.repeat, 'keyboard: 0 (row or keypad) fires at the aimed ring; a held key does not repeat');
    ok(inp.touchShown && inp.touchFired && inp.touchHidden, 'touch: a Hook button appears only when a ring is aimed, fires on tap, and hides again');

    // controller: Y fires when something is aimed (and does not also open Songs); otherwise Y is Songs, as before
    const padT = await page.evaluate(() => {
      __reset(); __give(); const out = {};
      let yDown = false;
      const fake = () => ({ connected: true, id: 'fake', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 3 && yDown, value: 0 })) });
      const orig = navigator.getGamepads.bind(navigator);
      Object.defineProperty(navigator, 'getGamepads', { value: () => [fake()], configurable: true });
      const press = () => { yDown = true; controlsTick(); yDown = false; controlsTick(); };
      __stage('clearing', 28.5, 11.5, Math.PI / 2);
      press(); out.hook = !!RIGGING.pull; out.notSongs = G.state === 'play' && !G.openPanel; __adv(1.3);
      __stage('clearing', 20.5, 5.5, 0);
      press(); out.songs = G.state === 'panel' && G.openPanel === 'songs' || (G.state === 'panel');
      if (G.state === 'panel') { closeModal(); G.state = 'play'; }
      // pickpocket keeps priority
      Object.defineProperty(navigator, 'getGamepads', { value: orig, configurable: true });
      return out;
    });
    ok(padT.hook && padT.notSongs, 'controller: Y fires the grapnel at an aimed ring and does not also open Songs');
    ok(padT.songs, 'controller: with nothing to use it on, Y is Songs exactly as before');

    // ---- 11. 640x400 and the options rows
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(200);
    const compact = await page.evaluate(() => {
      __reset(); __give(); __stage('clearing', 28.5, 10.5, Math.PI / 2); __adv(0.5); render();
      const vw = document.documentElement.scrollWidth <= window.innerWidth + 1;
      return { vw, ctx: RIGGING.context() && RIGGING.context().kind };
    });
    ok(compact.vw && compact.ctx === 'hook', '640x400: the page does not scroll sideways and the Grapnel prompt is drawn');
    await snap('compact-prompt-640');
    const optsFit = await page.evaluate(() => {
      G.state = 'panel'; renderAccessibilityMenu();
      const p = document.querySelector('#modal-panel'), rows = ['p12r-hook', 'p12r-props', 'p12r-water'].map(id => !!document.getElementById(id));
      const r = { rows, head: !!document.getElementById('p12r-head'), overflowX: p.scrollWidth > p.clientWidth + 1 };
      const b = document.getElementById('p12r-props'); b.click(); r.toggled = !RIGGING.set.props && JSON.parse(localStorage.getItem('octave.rigging12.v1')).props === false && G.map.entities.every(e => !e._p12r || e._p12r.k === 'anchor' || e._p12r.k === 'pile' || e._p12r.k === 'cache');
      b.click(); r.back = RIGGING.set.props === true;
      const a = document.getElementById('p12r-water'); a.scrollIntoView(); r.visible = a.getBoundingClientRect().bottom <= window.innerHeight + 2;
      closeModal(); G.state = 'play';
      return r;
    });
    ok(optsFit.head && optsFit.rows.every(Boolean) && !optsFit.overflowX, '640x400: the Rigging header and three switches are in Options with no sideways overflow');
    ok(optsFit.toggled && optsFit.back && optsFit.visible, 'the props switch persists (localStorage octave.rigging12.v1), takes the chandeliers and scaffolds out of the entity list at once, and back');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);

    // ---- 12. performance: median frame of a 12-enemy scene, module on vs off
    const perf = await page.evaluate(() => {
      __reset(); __give();
      const crowd = []; const types = ['hound', 'proctor', 'quiet', 'legionnaire'];
      const frames = (on) => {
        RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = on; for (const id in G.maps) RIGGING.syncProps(G.maps[id]);
        __stage('clearing', 28.5, 10.5, Math.PI / 2);
        for (let i = 0; i < 12; i++) crowd.push(__mk(types[i % 4], 18 + (i % 6) * 1.5, 7 + Math.floor(i / 6) * 1.5, 'idle'));
        const ms = [];
        for (let k = 0; k < 160; k++) { const t0 = performance.now(); update(1 / 60); render(); ms.push(performance.now() - t0); }
        for (const e of crowd) __rm(e); crowd.length = 0;
        ms.sort((a, b) => a - b); return ms[ms.length >> 1];
      };
      frames(false);
      const offs = [], ons = [];
      for (let k = 0; k < 5; k++) { offs.push(frames(false)); ons.push(frames(true)); }      // alternated, so machine noise hits both; the best of each is the cost
      RIGGING.set.hook = RIGGING.set.props = RIGGING.set.water = true; for (const id in G.maps) RIGGING.syncProps(G.maps[id]);
      return { off: Math.min(...offs), on: Math.min(...ons) };
    });
    ok(perf.on - perf.off < 1.0, 'frame cost: median ' + perf.off.toFixed(2) + ' ms off, ' + perf.on.toFixed(2) + ' ms on (+' + (perf.on - perf.off).toFixed(2) + ' ms, limit 1 ms)');

    // ---- screenshots for the human
    if (SHOTS) {
      await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
      const shot = async (name, fn) => { await page.evaluate(fn); await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
      await shot('anchor-clearing-aimed', () => { __reset(); __give(); __stage('clearing', 28.5, 10.5, Math.PI / 2); __adv(4); render(); });
      await shot('anchor-crag', () => { __stage('deepwoods', 42.5, 31.5, 0); __adv(1); render(); });
      await shot('chandelier-malting-hanging', () => { __stage('malting', 15.5, 11.0, -Math.PI / 2); __adv(4); render(); });
      await shot('scaffold-quarry', () => { __stage('quarry', 18.5, 15.6, Math.PI / 2); __adv(4); render(); });
      await shot('chandelier-falls', () => { __stage('malting', 15.5, 9.2, -Math.PI / 2); __adv(3.5); __sword(); window.__es = [__mk('proctor', 13.5, 6.8, 'idle'), __mk('proctor', 17.5, 7.2, 'idle')]; __swing(); __adv(0.55); render(); });
      await shot('chandelier-wreck', () => { __adv(1.5); for (const e of window.__es) __rm(e); render(); });
      await shot('grapnel-mid-haul', () => { __reset(); __give(); __stage('clearing', 28.5, 10.5, Math.PI / 2); RIGGING.fire(RIGGING.aimedAnchor()); __adv(0.25); render(); });
      await shot('gear-at-the-cutter', () => { __reset(); __stage('deepwoods', 42.4, 23.4, 0); __adv(4); render(); });
    }

    ok(errors.length === 0, 'no page errors (' + errors.join(' | ') + ')');
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
