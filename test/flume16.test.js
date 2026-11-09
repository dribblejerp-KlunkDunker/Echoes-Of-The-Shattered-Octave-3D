// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/flume16.test.js
// Phase 16, team FLUME: "The Chlorophyll Flume" (js/flume16.js).
//   registration, the gate in Oakhaven's Hedge and every exit, flood-fill reachability with and without the surge (and a real
//   crossing of the Wash), the surge clock / telegraph / push / slow / recovery, the held vowel, briar-sprites (numbers, bleed,
//   fatigue, HUD), ringing timber, Pellam's rumour and key, the fence, the lock quest and the Greening's closure, saves (mid-area,
//   old, hostile), the Options rows, presets, frame cost, 640x400 and no page errors.
// SHOT_DIR=<dir> also writes screenshots there (Medium and Cinematic). Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /flume16/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    window.__acn = 0;
    try { window.AudioContext = new Proxy(window.AudioContext, { construct(t, a) { window.__acn++; return Reflect.construct(t, a); } }); } catch (e) { /* no audio */ }
  });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof FLUME16 !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Flume Tester');
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

const HELPERS = () => {
  window.T = {
    reset() {
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16f_') || k === 'greening' || k.startsWith('picked:flume_') || k.startsWith('p15r_s_')) delete G.flags[k];
      const fresh = buildAllMaps();
      for (const id of FLUME16.MAPS) G.maps[id] = fresh[id];
      G.maps.oakhaven = fresh.oakhaven;
      const p = G.player; p.hp = p.hpMax = 999; p.fat = p.fatMax; p.voice = p.voiceMax; p.needs = false; p.hunger = 100; p.sleep = 100; p.gold = 0;
      p.inv = p.inv.filter(s => !/^p16_/.test(s.id) && s.id !== 'honey' && s.id !== 'bandage');
      p.factions = p.factions || {}; p.factions.hedge = 0;
      try { UPG.status.bleed = 0; } catch (e) { /* none */ }
      G.dead = false; G.state = 'play'; G.keys = {}; G.attack.t = 0; G.song.t = 0; G.stillT = 0; G.noise = 0; G.journal = [];
      FLUME16.cfg.surges = true; FLUME16.resetRun(); FLUME16.T.bleedHud = 0;
      GFX.reduceMotion = false; GFX.noFlash = false; GFX.flumeGlow = true;
      document.getElementById('msgs').innerHTML = '';
    },
    go(id, x, y, dir) { loadMap(id, { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; update(0.01); },
    ent(pred) { return G.ents.find(pred); },
    step(n, keys, dt) { for (let i = 0; i < n; i++) { G.keys = keys || {}; update(dt || 0.033); } G.keys = {}; },
    quiet() { for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; } },
    phase(p, t) { FLUME16.T.t = 1e9; FLUME16.setPhase(p); FLUME16.T.t = t == null ? 1e6 : t; },
    open(m, c) { if (!c) return false; if (!c.door || c.portal) return false; if (c.locked && !(c.locked !== '__never' && c.locked !== 'pass' && G.flags[c.locked])) return false; return true; },
    // an independent flood fill over the real map (deep water walls, portal doors terminal, flags honoured); `block` rects are walls
    reach(m, sx, sy, block) {
      const inBlock = (x, y) => !!block && block.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
      const open = (x, y) => {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h || inBlock(x, y)) return false;
        const c = m.cells[y * m.w + x];
        if (c && !T.open(m, c)) return false;
        return !(m.floorCells && m.floorCells[y * m.w + x] === 2);
      };
      const seen = new Uint8Array(m.w * m.h), q = [[sx, sy]]; if (!open(sx, sy)) return seen; seen[sy * m.w + sx] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!open(nx, ny) || seen[ny * m.w + nx]) continue;
          const ga = m.groundAt(x + 0.5, y + 0.5), gb = m.groundAt(nx + 0.5, ny + 0.5);
          if (Math.abs(ga - gb) > STEP_UP && !(m.smooth && m.smooth[ny * m.w + nx] && m.smooth[y * m.w + x])) continue;
          seen[ny * m.w + nx] = 1; q.push([nx, ny]);
        }
      }
      return seen;
    },
    at(seen, m, x, y) { return !!seen[(y | 0) * m.w + (x | 0)]; },
    near(seen, m, x, y) { return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T.at(seen, m, x + dx, y + dy)); },
    talkTo(id, mode) {
      const n = NPCS[id]; DLG.npc = n; DLG.ent = { id }; DLG.log = []; DLG.choices = null; DLG.tone = 'normal'; G.state = 'dialogue';
      const q = n.quest ? n.quest(G) : null;
      if (q) { DLG.log.push({ who: 'them', t: q.text }); DLG.choices = q.choices || null; } else DLG.log.push({ who: 'them', t: n.greet.normal });
      renderDialogue(mode === undefined ? (DLG.choices ? 'choice' : null) : mode);
      return q;
    },
    choose(i) { const b = document.querySelector('[data-choice="' + i + '"]'); if (!b) return false; b.click(); return true; },
    lastReply() { const l = DLG.log[DLG.log.length - 1]; return l ? l.t : ''; },
    msgs() { return Array.from(document.querySelectorAll('#msgs .m')).map(e => e.textContent); },
    closeUi() { try { closeModal(); } catch (e) { /* none */ } const ev = document.getElementById('event'); if (ev) ev.classList.add('hidden'); G.state = 'play'; G.keys = {}; },
    frameSum(x, y, w, h) { const d = Engine.ctx.getImageData(x, y, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 3 + d[i + 2] * 7; return s; },
    solvePick() { for (let i = 0; i < 3 && LOCKPICK; i++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); } },
  };
};

(async () => {
  const browser = await chromium.launch();
  const lines = []; const log = s => { lines.push(s); console.log(s); };
  let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; log('PASS ' + msg); };
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(HELPERS);
    const E = (fn, arg) => page.evaluate(fn, arg);
    await E(() => { T.reset(); });

    // ---------------------------------------------------------------- 1. registration
    {
      const c = await E(() => {
        const o = {};
        o.maps = FLUME16.MAPS.map(id => { const m = G.maps[id]; return { id, ok: !!m, outdoor: m && m.outdoor, base: m && m.baseCount === m.entities.length, name: m && m.name }; });
        o.again = (() => { const a = buildAllMaps(), b = buildAllMaps(); return FLUME16.MAPS.every(id => a[id].entities.length === b[id].entities.length && a[id].baseCount === b[id].baseCount && a[id].entities.every((e, i) => e.x === b[id].entities[i].x && e.y === b[id].entities[i].y && (e.sprite || e.id || e.item || e.type) === (b[id].entities[i].sprite || b[id].entities[i].id || b[id].entities[i].item || b[id].entities[i].type))); })();
        const d = ENEMIES.briarsprite; o.foe = d && { hp: d.hp, dmg: d.dmg.join('-'), speed: d.speed, reach: d.reach, xp: d.xp, name: d.name };
        o.poses = ['', '_w1', '_w2', '_a1', '_a2'].every(p => !!Engine.sprites['briarsprite' + p]);
        o.key = !!ITEMS.p16_lock_key && ITEMS.p16_lock_key.key === true;
        o.loot = !!LOOT.briarsprite && LOOT.briarsprite.table.every(([id]) => id === 'sovereigns' || !!ITEMS[id]);
        o.npcs = Object.keys(FLUME16.NPC_DEFS).every(id => NPCS[id] && NPCS[id].portrait && Engine.sprites[NPCS[id].sprite]);
        o.npcSprites = FLUME16.MAPS.every(id => G.maps[id].entities.filter(e => e.kind === 'npc').every(e => !!NPCS[e.id] && !!Engine.sprites[e.sprite]));
        o.sprites = G.maps.flume_road.entities.concat(G.maps.flume_landing.entities, G.maps.flume_lowrings.entities).filter(e => e.sprite).every(e => !!Engine.sprites[e.sprite]);
        o.enemies = G.maps.flume_road.entities.concat(G.maps.flume_lowrings.entities).filter(e => e.kind === 'enemy').every(e => !!ENEMIES[e.type]);
        o.flag = GFX.flumeGlow === true && GFX.FX.includes('flumeGlow');
        o.lists = FLUME16.LIST.length > 100 && FLUME16.LIST.every(t => typeof t === 'string' && t.length > 0);
        o.musicOk = FLUME16.MAPS.map(id => G.maps[id].music);
        return o;
      });
      ok(c.maps.every(m => m.ok && m.outdoor && m.base) && c.again, 'three outdoor maps are registered with a stable entity list (baseCount) and build deterministically: ' + JSON.stringify(c.maps));
      ok(c.foe && c.foe.hp === 7 && c.foe.dmg === '1-2' && c.foe.speed === 2.4 && c.foe.xp === 8 && c.poses, 'the briar-sprite is in the catalogue with its numbers and all five poses: ' + JSON.stringify(c.foe));
      ok(c.key && c.loot && c.npcs && c.npcSprites && c.sprites && c.enemies, 'items, loot, people, sprites and foes on the maps all resolve to catalogue ids');
      ok(c.flag && c.lists, 'the glow switch is a GFX.FX flag; every player-visible string is registered: ' + c.musicOk.join(','));
    }

    // ---------------------------------------------------------------- 2. the gate, the exits, the world map
    {
      const r = await E(() => {
        T.reset(); const o = {};
        const oak = G.maps.oakhaven, gate = oak.get(69, 51);
        o.gate = !!gate && gate.door === true && !!gate.portal && gate.portal.map === 'flume_road' && !gate.locked;
        o.cleared = oak.get(68, 51) === null && !oak.isBlocked(67, 51);
        o.added = oak.entities.length === oak.baseCount || oak.entities.length >= oak.baseCount;   // no entity of mine is in Oakhaven
        o.noMine = !oak.entities.some(e => /^p16f_/.test(e.sprite || '') || /^p16f_/.test(e.id || ''));
        const road = G.maps.flume_road, land = G.maps.flume_landing, rings = G.maps.flume_lowrings;
        const exits = [
          [road, 0, 12, 'oakhaven'], [road, 8, 31, 'flume_landing'], [land, 16, 0, 'flume_road'], [land, 0, 13, 'flume_lowrings'], [rings, 37, 18, 'flume_landing'],
        ];
        o.exits = exits.map(([m, x, y, to]) => { const c = m.get(x, y); const t = c && c.portal; const tm = t && G.maps[t.map]; return { at: m.id + ':' + x + ',' + y, to, ok: !!t && t.map === to && !!tm && !tm.isBlocked(t.x | 0, t.y | 0) && t.x > 0 && t.y > 0 && t.x < tm.w && t.y < tm.h }; });
        // really walk through the gate and back
        T.go('oakhaven', 66.6, 51.5, 0); T.step(40, { w: true }); interact(); update(0.01);
        o.walkedTo = G.mapId; o.arrive = [Engine.cam.x, Engine.cam.y];
        o.journal = G.journal.some(j => /Outside the Hedge/.test(j.text));
        Engine.cam.dir = Math.PI; T.step(45, { w: true }); interact(); update(0.01);
        o.walkedBack = [G.mapId, G.mapId === 'oakhaven' ? Engine.cam.x : 0];
        // the world map
        T.reset(); T.go('flume_road', 2.5, 12.5, 0);
        const m = G.maps.flume_road; m.visited[12 * m.w + 3] = 1;
        o.travel = travelDestinations('reach').some(d => d.map === 'flume_road');
        o.region = !!TRAVEL_REGIONS.reach.maps.flume_road && TRAVEL_REGIONS.reach.maps.flume_road.rect.every(v => v >= 0 && v <= 1);
        o.music = [road.music, land.music, rings.music].every(mu => typeof mu === 'string');
        return o;
      });
      ok(r.gate && r.cleared && r.noMine, 'Oakhaven\'s east Hedge has a gate beside the Flume\'s exit (a portal, unlocked before the Greening) and no entity was added to Oakhaven');
      ok(r.exits.every(e => e.ok), 'every entry and exit door leads to a free cell of the right map: ' + JSON.stringify(r.exits));
      ok(r.walkedTo === 'flume_road' && Math.abs(r.arrive[0] - 1.7) < 2.5 && r.journal, 'walking east through the gate lands on the Flume Road with the first journal line: ' + JSON.stringify(r.arrive));
      ok(r.walkedBack[0] === 'oakhaven' && r.walkedBack[1] > 60, 'walking back west through the road\'s gate returns to Oakhaven by the Flume: ' + JSON.stringify(r.walkedBack));
      ok(r.travel && r.region && r.music, 'the Flume Road is a world-map waypoint once seen; every map has its own music track');
    }

    // ---------------------------------------------------------------- 3. no softlock: flood fills, with and without the surge
    {
      const r = await E(() => {
        T.reset(); const o = {};
        const Z = FLUME16.B.ZONE, wash = [[Z.x0, Z.y0, Z.x1 - 1, Z.y1 - 1]];
        const road = G.maps.flume_road, land = G.maps.flume_landing, rings = G.maps.flume_lowrings;
        // the road, no surge
        let s = T.reach(road, 2, 12);
        o.roadExits = [T.near(s, road, 1, 12), T.near(s, road, 8, 30)];
        const items = (m) => m.entities.filter(e => e.kind === 'item' || e.kind === 'npc' || e.kind === 'enemy');
        const free = (m, s2, e) => !m.isBlocked(e.x | 0, e.y | 0) ? T.near(s2, m, e.x, e.y) : false;
        o.roadHidden = items(road).filter(e => !free(road, s, e) && !(e.x > 24 && e.x < 40 && e.y > 14 && e.y < 18)).map(e => (e.item || e.type || e.id) + '@' + e.x + ',' + e.y);
        o.pathAll = (() => { let bad = 0; for (let x = 1; x < 63; x++) for (let y = 11; y <= 13; y++) if (!T.at(s, road, x, y)) bad++; return bad; })();
        o.tunnelShut = !T.at(s, road, 30, 16) && !T.at(s, road, 24, 16);
        // with the surge standing in the Wash (worst case: the whole Wash is a wall): the west half still has both exits; the pockets are real
        const s2 = T.reach(road, 2, 12, wash);
        o.surgeWest = [T.near(s2, road, 1, 12), T.near(s2, road, 8, 30)];
        o.surgeEastCut = !T.at(s2, road, 45, 12) && !T.at(s2, road, 41, 16);
        o.pockets = FLUME16.B.POCKETS.every(([x, y]) => !road.isBlocked(x, y) && !(x >= Z.x0 && x < Z.x1 && y >= Z.y0 && y < Z.y1) && T.at(s, road, x, y) && T.at(s, road, x, y - 1));
        // the rumour opens the hollow pier: the east half is reachable through it, surge or no surge
        G.flags.p16f_tip = 1;
        const s3 = T.reach(road, 2, 12, wash);
        o.tunnelEast = T.at(s3, road, 45, 12) && T.at(s3, road, 31, 16) && T.at(s3, road, 60, 16);
        const box = road.entities.find(e => e.item === 'cache' && e.tier === 2); o.box = T.at(s3, road, box.x, box.y);
        const east = items(road).filter(e => e.x > 41); o.eastAll = east.every(e => free(road, s3, e));
        delete G.flags.p16f_tip;
        // the landing
        s = T.reach(land, 16, 2);
        o.landExits = [T.near(s, land, 16, 0), T.near(s, land, 0, 13)];
        o.landHidden = items(land).filter(e => !free(land, s, e)).map(e => (e.item || e.id) + '@' + e.x + ',' + e.y);
        o.wheel = T.near(s, land, FLUME16.LANDING.wheel[0], FLUME16.LANDING.wheel[1]);
        o.landFloor = (() => { let bad = []; for (let y = 1; y < land.h - 1; y++) for (let x = 1; x < land.w - 1; x++) { const c = land.cells[y * land.w + x]; if (!c && land.floorCells[y * land.w + x] !== 2 && !s[y * land.w + x] && !land.isBlocked(x, y)) bad.push(x + ',' + y); } return bad; })();
        // the rings
        s = T.reach(rings, 36, 18);
        o.ringExit = T.near(s, rings, 37, 18);
        o.ringHidden = items(rings).filter(e => !free(rings, s, e)).map(e => (e.item || e.type || e.id) + '@' + e.x + ',' + e.y);
        o.ringStove = T.near(s, rings, FLUME16.RINGS.loft.stove[0], FLUME16.RINGS.loft.stove[1]) && T.near(s, rings, FLUME16.RINGS.loft.reed[0], FLUME16.RINGS.loft.reed[1]);
        o.ringFloor = (() => { let bad = []; for (let y = 1; y < rings.h - 1; y++) for (let x = 1; x < rings.w - 1; x++) { const c = rings.cells[y * rings.w + x]; if (!c && rings.floorCells[y * rings.w + x] !== 2 && !s[y * rings.w + x] && !rings.isBlocked(x, y)) bad.push(x + ',' + y); } return bad; })();
        // nothing stands in a wall
        o.inWall = [road, land, rings].map(m => m.entities.filter(e => (e.kind === 'npc' || e.kind === 'enemy' || e.kind === 'item') && m.isBlocked(e.x | 0, e.y | 0)).map(e => m.id + ':' + (e.item || e.type || e.id) + '@' + e.x + ',' + e.y)).flat();
        return o;
      });
      ok(r.roadExits.every(Boolean) && r.pathAll === 0, 'the Flume Road: both exits and every cell of the path are reachable with no surge');
      ok(r.roadHidden.length === 0, 'the Flume Road: every item, person and foe outside the sealed pier is reachable: ' + r.roadHidden.join(' '));
      ok(r.surgeWest.every(Boolean) && r.surgeEastCut && r.tunnelShut, 'with the surge treated as a wall the west half keeps both exits (no softlock); the east half is cut until the pier opens');
      ok(r.pockets, 'both pockets are open floor off the path and outside the surge rows');
      ok(r.tunnelEast && r.box && r.eastAll, 'once the rumour is bought the hollow pier carries you under the Wash to the east half and its strongbox, surge or no surge');
      ok(r.landExits.every(Boolean) && r.landHidden.length === 0 && r.wheel && r.landFloor.length === 0, 'Stillwater Landing: both exits, every person, item and the lock-wheel are reachable and no walkable floor is stranded: ' + r.landHidden.join(' ') + ' ' + r.landFloor.join(' '));
      ok(r.ringExit && r.ringHidden.length === 0 && r.ringStove && r.ringFloor.length === 0, 'the Low Rings: the exit, every room, item, the stove and the reed are reachable and no floor is stranded: ' + r.ringHidden.join(' ') + ' ' + r.ringFloor.join(' '));
      ok(r.inWall.length === 0, 'no person, foe or item stands inside a wall: ' + r.inWall.join(' '));
    }

    // ---------------------------------------------------------------- 4. the surge: clock, telegraph, push, slow, recovery
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B;
        T.go('flume_road', 10.5, 12.5, 0); T.quiet();
        // the clock: durations of each phase, measured by stepping the game
        FLUME16.T.phase = 'quiet'; FLUME16.T.t = B.QUIET;
        const seq = []; let cur = FLUME16.T.phase, since = 0; const dt = 0.02;
        for (let i = 0; i < 1600; i++) { G.keys = {}; update(dt); since += dt; if (FLUME16.T.phase !== cur) { seq.push([cur, +since.toFixed(2)]); cur = FLUME16.T.phase; since = 0; } }
        o.seq = seq;
        o.cycle = seq.slice(0, 4).map(s => s[0]).join('>');
        o.first = FLUME16.B.FIRST;
        // pitch and rumble through the telegraph
        const f = []; for (let k = 0; k <= 10; k++) { T.phase('telegraph', B.TELEGRAPH * (1 - k / 10)); f.push(FLUME16.ohhNow()); }
        o.pitch = f.map(x => Math.round(x.freq)); o.rumble = f.map(x => +x.rumble.toFixed(2));
        T.phase('quiet', 5); o.q = FLUME16.ohhNow();
        T.phase('surge', 5); o.s = FLUME16.ohhNow();
        T.phase('drain', B.DRAIN * 0.99); o.d0 = FLUME16.ohhNow(); T.phase('drain', 0.01); o.d1 = FLUME16.ohhNow();
        // the message and the floor of the telegraph
        T.reset(); T.go('flume_road', 10.5, 12.5, 0); T.quiet(); FLUME16.T.t = 0.02; T.step(5);
        o.teleMsg = T.msgs().some(t => t.includes(FLUME16.TX.surge.tele)) && FLUME16.T.phase === 'telegraph';
        const m = G.maps.flume_road; T.phase('telegraph', 0.5); T.step(2);
        o.puddles = [...Array(40).keys()].filter(i => m.floorCells[(11 + (i % 3)) * m.w + 24 + ((i / 3) | 0)] === 3).length;
        // the surge itself: wall of water, the floor
        T.phase('surge', 20); T.step(2);
        o.waves = FLUME16.T.waves.length; o.wavesTransient = FLUME16.T.waves.every(w => w.transient === true);
        o.wet = (() => { let w = 0, t = 0; for (let y = 11; y <= 13; y++) for (let x = 24; x < 40; x++) { t++; if (m.floorCells[y * m.w + x] === 3) w++; } return w === t; })();
        o.surgeMsg = T.msgs().some(t => t.includes(FLUME16.TX.surge.go));
        // the push: standing in it walks you back, slows you, costs fatigue and never hurts
        T.reset(); T.go('flume_road', 38.5, 12.5, 0); T.quiet(); T.phase('surge', 30); const p = G.player; p.hp = 50; p.hpMax = 50; p.fat = p.fatMax = 100;
        const x0 = Engine.cam.x; T.step(30); o.push = Engine.cam.x - x0; o.pushMsg = T.msgs().some(t => t.includes(FLUME16.TX.surge.push));
        o.hp = p.hp; o.fat = p.fat;
        // walking east against it still goes west; slowed on the other axis (south) by the factor
        T.go('flume_road', 30.5, 11.2, Math.PI / 2); T.quiet(); T.phase('quiet', 50);
        T.step(8, { w: true }); let y0 = Engine.cam.y; T.step(10, { w: true }); const dq = Engine.cam.y - y0;
        T.go('flume_road', 30.5, 11.2, Math.PI / 2); T.quiet(); T.phase('surge', 50);
        T.step(8, { w: true }); y0 = Engine.cam.y; T.step(10, { w: true }); const ds = Engine.cam.y - y0; o.slow = ds / dq; o.dq = dq;
        T.go('flume_road', 36.5, 12.5, 0); T.quiet(); T.phase('surge', 50); const x1 = Engine.cam.x; T.step(30, { w: true }); o.against = Engine.cam.x - x1;
        // a pocket is out of the water; outside the Wash it never reaches you
        T.go('flume_road', 30.5, 14.5, -Math.PI / 2); T.quiet(); T.phase('surge', 50); T.step(20); p.fat = p.fatMax; const px = Engine.cam.x, py = Engine.cam.y; T.step(60); o.pocket = [Engine.cam.x - px, Engine.cam.y - py, p.fat - p.fatMax];
        T.go('flume_road', 12.5, 12.5, 0); T.quiet(); T.phase('surge', 50); const qx = Engine.cam.x; T.step(30); o.outside = Engine.cam.x - qx;
        // recovery: after the drain the water is gone and you walk at full speed again
        T.go('flume_road', 30.5, 11.2, Math.PI / 2); T.quiet(); T.phase('drain', 0.05); T.step(8); o.drainPhase = FLUME16.T.phase;
        o.dry = (() => { const mm = G.maps.flume_road; let d = 0, t = 0; for (let y = 11; y <= 13; y++) for (let x = 24; x < 40; x++) { t++; if (mm.floorCells[y * mm.w + x] === 5) d++; } return d === t; })();
        o.wavesGone = FLUME16.T.waves.length === 0 && !G.ents.some(e => e._p16f === 'wave');
        T.go('flume_road', 30.5, 11.2, Math.PI / 2); T.quiet(); T.phase('quiet', 50); T.step(8, { w: true }); y0 = Engine.cam.y; T.step(10, { w: true }); o.after = (Engine.cam.y - y0) / dq;
        // the switch: off, the Wash never floods
        T.reset(); FLUME16.cfg.surges = false; T.go('flume_road', 10.5, 12.5, 0); T.quiet(); let phases = new Set(); for (let i = 0; i < 1800; i++) { G.keys = {}; update(0.033); phases.add(FLUME16.T.phase); } o.off = [...phases].join(',');
        FLUME16.cfg.surges = true;
        // the clock restarts when you come in from outside
        T.go('oakhaven', 66.5, 51.5, 0); T.go('flume_road', 10.5, 12.5, 0); o.fresh = [FLUME16.T.phase, +FLUME16.T.t.toFixed(1)];
        return o;
      });
      const d = (name) => { const s = r.seq.find(x => x[0] === name); return s ? s[1] : -1; };
      ok(r.cycle === 'quiet>telegraph>surge>drain', 'the clock runs quiet, telegraph, surge, drain: ' + JSON.stringify(r.seq.slice(0, 5)));
      ok(Math.abs(d('quiet') - 10) < 0.15 && Math.abs(d('telegraph') - 4) < 0.1 && Math.abs(d('surge') - 8) < 0.1 && Math.abs(d('drain') - 2.5) < 0.1, 'quiet 10 s, telegraph 4 s, surge 8 s, drain 2.5 s');
      ok(r.pitch[0] === 174 && r.pitch[10] === 261 && r.pitch.every((v, i) => i === 0 || v >= r.pitch[i - 1]) && r.rumble.every((v, i) => i === 0 || v >= r.rumble[i - 1]) && r.rumble[10] > r.rumble[0] + 0.4, 'the vowel climbs from 174 Hz to 261 Hz through the telegraph with a growing rumble: ' + r.pitch.join(' ') + ' | ' + r.rumble.join(' '));
      ok(Math.round(r.q.freq) === 174 && r.q.rumble === 0 && Math.round(r.s.freq) === 261 && r.s.rumble > 0.7 && Math.round(r.d0.freq) >= 255 && Math.round(r.d1.freq) <= 176, 'quiet is the low note with no rumble; the surge holds the high one; the drain brings it back down');
      ok(r.teleMsg && r.puddles > 3, 'the telegraph says so and the boards of the Wash start to weep (' + r.puddles + ' wet cells)');
      ok(r.waves >= 20 && r.wavesTransient && r.wet && r.surgeMsg, 'the surge raises a wall of water props (all transient), floods every cell of the Wash and says so: ' + r.waves + ' props');
      ok(r.push < -2.4 && r.push > -4.6 && r.pushMsg && r.hp === 50 && r.fat < 100 - 3.5, 'standing in the surge walks you back down the road (' + r.push.toFixed(2) + ' u in 1 s), costs fatigue, and does no damage: hp ' + r.hp + ', fatigue ' + r.fat.toFixed(1));
      ok(r.slow > 0.4 && r.slow < 0.5 && r.against < -0.8, 'in the surge you move at 45% speed (' + r.slow.toFixed(2) + ') and cannot walk east against it (' + r.against.toFixed(2) + ' u)');
      ok(Math.abs(r.pocket[0]) < 0.02 && Math.abs(r.pocket[1]) < 0.05 && r.pocket[2] === 0 && Math.abs(r.outside) < 0.01, 'a pocket in the cutting keeps you dry (not moved, no fatigue) and the road outside the Wash is untouched: ' + JSON.stringify([r.pocket, r.outside]));
      ok(r.drainPhase === 'quiet' && r.dry && r.wavesGone && r.after > 0.95 && r.after < 1.05, 'after the drain the boards are dry, the props are gone and you walk at full speed again (' + r.after.toFixed(2) + '): ' + JSON.stringify([r.drainPhase, r.dry, r.wavesGone]));
      ok(r.off === 'quiet', 'with the "Flume surges" switch off the Wash never floods: ' + r.off);
      ok(r.fresh[0] === 'quiet' && r.fresh[1] > 12 && r.fresh[1] <= 14.1, 'coming in from outside restarts the clock with a long quiet: ' + JSON.stringify(r.fresh));
    }

    // ---------------------------------------------------------------- 5. the Wash can be crossed: a real walk through the clock
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B;
        // in one quiet window
        T.go('flume_road', 22.5, 12.5, 0); T.quiet(); T.phase('quiet', B.QUIET); const hp0 = G.player.hp;
        let t = 0; while (t < 9 && Engine.cam.x < 41) { T.step(1, { w: true }, 0.033); t += 0.033; }
        o.single = [Engine.cam.x, +t.toFixed(1), FLUME16.T.phase];
        // a patient player: walk only when the quiet is long enough; wait out the rest at the pocket. no damage taken
        T.go('flume_road', 22.5, 12.5, 0); T.quiet(); T.phase('telegraph', 2); G.player.hp = hp0;
        let secs = 0, caught = 0; const pocket = B.POCKETS[0];
        while (secs < 120 && Engine.cam.x < 41) {
          const ph = FLUME16.T.phase, left = FLUME16.T.t;
          const inside = Engine.cam.x > 24.2 && Engine.cam.x < 40;
          if ((ph === 'quiet' && left > 6.5) || (inside && (ph === 'quiet' || (ph === 'telegraph' && left > 1.5)))) T.step(1, { w: true }); else T.step(1, {});
          secs += 0.033; if (FLUME16.T.caught) caught++;
        }
        o.patient = [Engine.cam.x, +secs.toFixed(1), G.player.hp === hp0];
        // a careless player runs into the surge and is walked back: they still get through in the next quiet, never hurt
        T.go('flume_road', 22.5, 12.5, 0); T.quiet(); T.phase('surge', 6);
        let s2 = 0; while (s2 < 120 && Engine.cam.x < 41) { T.step(1, { w: true }); s2 += 0.033; }
        o.careless = [Engine.cam.x, +s2.toFixed(1), G.player.hp === hp0];
        return o;
      });
      ok(r.single[0] >= 41 && r.single[1] < 9, 'the Wash is crossed in one quiet window (' + r.single[1] + ' s)');
      ok(r.patient[0] >= 41 && r.patient[2], 'a patient walker times it and arrives unhurt after ' + r.patient[1] + ' s');
      ok(r.careless[0] >= 41 && r.careless[2], 'a careless walker is walked back by the water and still gets across when it drains (' + r.careless[1] + ' s), unhurt');
    }

    // ---------------------------------------------------------------- 6. the held vowel: synthesis, position, mute, one AudioContext
    {
      const r = await E(() => {
        T.reset(); const o = {};
        T.go('flume_road', 10.5, 12.5, 0); T.quiet(); T.phase('quiet', 50); T.step(5);
        const mixE = FLUME16.ohhMix();   // facing east, the channel is to the north (left)
        Engine.cam.dir = Math.PI; const mixS = FLUME16.ohhMix();   // facing west: the channel is on the right
        Engine.cam.dir = -Math.PI / 2; const mixN = FLUME16.ohhMix();  // facing north, toward it
        o.pan = [+mixE.pan.toFixed(2), +mixS.pan.toFixed(2), +mixN.pan.toFixed(2)];
        Engine.cam.dir = 0; Engine.cam.y = 17.5; const far = FLUME16.ohhMix(); Engine.cam.y = 12.5; const near = FLUME16.ohhMix();
        o.gain = [near.gain, far.gain]; o.cut = [near.cutoff, far.cutoff];
        T.phase('telegraph', 1); o.freq = FLUME16.ohhMix().freq;
        T.go('flume_landing', 16.5, 2.5, Math.PI / 2); T.quiet(); o.landing = !!FLUME16.ohhMix() && FLUME16.ohhMix().gain > 0;
        T.go('flume_lowrings', 36.4, 18.5, Math.PI); T.quiet(); o.rings = !!FLUME16.ohhMix();
        T.go('oakhaven', 30.5, 30.5, 0); o.silent = FLUME16.ohhMix() === null;
        // the chain lives on the game's one context
        T.go('flume_road', 10.5, 12.5, 0); T.step(10);
        o.ctx = !!(Audio_ && Audio_.ctx); o.contexts = window.__acn; o.chain = !!FLUME16.OA.g && FLUME16.OA.ctx === Audio_.ctx;
        o.state = FLUME16.state().ohh;
        // never throws with the audio gone or muted
        const ctx = Audio_.ctx; let err = null;
        try { Audio_.ctx = null; T.step(5); const m = Audio_.muted; Audio_.muted = true; Audio_.ctx = ctx; T.step(5); Audio_.muted = m; } catch (e) { err = String(e); }
        Audio_.ctx = ctx; o.err = err;
        return o;
      });
      ok(r.pan[0] < -0.2 && r.pan[1] > 0.2 && Math.abs(r.pan[2]) < r.pan[1], 'the vowel is positional: facing east the channel is on the left, facing west on the right, facing it centred: ' + r.pan.join(' '));
      ok(r.gain[0] > r.gain[1] && r.gain[0] <= 0.15 && r.gain[0] > 0.05 && r.cut[0] >= r.cut[1] && r.freq > 174, 'it is louder and brighter near the channel, quiet overall, and its pitch follows the telegraph');
      ok(r.landing && r.rings && r.silent, 'it is audible at the Landing and in the Low Rings (from the channel, far off) and silent elsewhere');
      ok(r.ctx && r.contexts <= 1 && r.chain && r.err === null, 'the vowel is synthesised on the game\'s single AudioContext (' + r.contexts + ' constructed) and survives a missing or muted context: ' + r.err);
    }

    // ---------------------------------------------------------------- 7. briar-sprites: numbers, bleed, fatigue, the HUD tag
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B.SPRITE, p = G.player;
        T.go('flume_road', 12.5, 14.5, Math.PI / 2); T.quiet();
        o.table = { hp: ENEMIES.briarsprite.hp === B.hp, dmg: ENEMIES.briarsprite.dmg[0] === B.dmg[0] && ENEMIES.briarsprite.dmg[1] === B.dmg[1], bleed: B.bleed, cap: B.bleedCap, fat: B.fat, dps: FLUME16.B.BLEED_DPS, xp: ENEMIES.briarsprite.xp };
        // armour condition is not tracked by the game: the fallback is the bleed and the stolen fatigue
        o.armourTracked = typeof ARMOR !== 'undefined' && Object.values(ARMOR).some(a => a && (a.cond !== undefined || a.durability !== undefined));
        p.hp = 100; p.hpMax = 100; p.fat = 80; p.fatMax = 100; UPG.status.bleed = 0;
        damagePlayer(1, ENEMIES.briarsprite.name); o.afterHit = { bleed: UPG.status.bleed, fat: p.fat, msg: T.msgs().some(t => t.includes(FLUME16.TX.sprite.bleed)) };
        const hpA = p.hp; T.step(30, {}, 0.033); o.tick = hpA - p.hp;
        damagePlayer(1, ENEMIES.briarsprite.name); damagePlayer(1, ENEMIES.briarsprite.name); damagePlayer(1, ENEMIES.briarsprite.name); o.cap = UPG.status.bleed;
        // a hit by anything else leaves no bleed
        UPG.status.bleed = 0; damagePlayer(1, 'Hound'); o.other = UPG.status.bleed;
        // it never takes the last hit point
        p.hp = 1.3; UPG.status.bleed = 8; T.step(400, {}, 0.033); o.floor = p.hp; o.over = UPG.status.bleed;
        // the HUD tag
        p.hp = 100; UPG.status.bleed = 0; T.step(2); Engine.render(G.ents, G.tod); drawHUD(); const a = T.frameSum(157, VIEW_H + 36, 62, 9);
        UPG.status.bleed = 5; T.step(2); Engine.render(G.ents, G.tod); drawHUD(); const b = T.frameSum(157, VIEW_H + 36, 62, 9); o.hud = [a, b];
        UPG.status.bleed = 0;
        // a bandage still closes it
        G.give('bandage'); UPG.status.bleed = 6; const sl = p.inv.find(s => s.id === 'bandage'); if (sl) { try { useItem(sl); } catch (e) { /* ui */ } } o.bandage = UPG.status.bleed;
        // in play: a briar-sprite that reaches you opens a cut
        T.reset(); T.go('flume_road', 40.5, 15.5, 0); T.quiet(); p.hp = 100; p.hpMax = 100; p.fat = 100; p.fatMax = 100; UPG.status.bleed = 0;
        const e = G.ents.find(x => x.type === 'briarsprite'); e.dead = false; e.hidden = false; e.hp = ENEMIES.briarsprite.hp; e.x = 42.2; e.y = 15.5; e.state = 'chase'; e.alertT = 8; e.cool = 0;
        const d0 = p.hp; let seenBleed = false; for (let i = 0; i < 240 && !seenBleed; i++) { G.keys = {}; update(0.033); if (UPG.status.bleed > 0) seenBleed = true; }
        o.play = { bleed: seenBleed, hp: p.hp < d0 || seenBleed, fat: p.fat < 100 };
        o.speedOk = ENEMIES.briarsprite.speed < 2.6 + 70 / 60 * 1.7;
        return o;
      });
      ok(r.table.hp && r.table.dmg && r.table.bleed === 4 && r.table.cap === 8 && r.table.fat === 6 && r.table.dps === 0.5 && r.table.xp === 8, 'briar-sprite balance: hp 7, damage 1-2, bleed 4 s (cap 8) at 0.5 hp/s, 6 fatigue per hit, 8 xp: ' + JSON.stringify(r.table));
      ok(r.armourTracked === false, 'the game tracks no armour condition, so the briar-sprite\'s fallback (bleed + fatigue) is in force');
      ok(r.afterHit.bleed === 4 && r.afterHit.fat === 74 && r.afterHit.msg, 'a briar hit opens a 4 s bleed, steals 6 fatigue and says so: ' + JSON.stringify(r.afterHit));
      ok(r.tick > 0.44 && r.tick < 0.56 && r.cap === 8 && r.other === 0, 'the bleed costs about 0.5 hp/s (' + r.tick.toFixed(2) + ' in 1 s), stacks no further than 8 s, and other foes leave none');
      ok(r.floor >= 1 && r.over === 0, 'the bleed never takes the last hit point (hp ' + r.floor.toFixed(2) + ') and runs out');
      ok(r.hud[0] !== r.hud[1], 'the HUD shows a BLEEDING tag in the status panel while it lasts');
      ok(r.bandage === 0, 'a bandage still stops it (the game\'s own rule)');
      ok(r.play.bleed && r.play.fat, 'in play a briar-sprite that reaches you does cut you and tire you: ' + JSON.stringify(r.play));
    }

    // ---------------------------------------------------------------- 8. ringing timber
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B;
        // a blow on grown wood rings: noise, a bell, and a hound within hearing investigates
        T.go('flume_road', 19.0, 15.0, Math.PI / 2); T.quiet();
        const [hA, hB] = G.ents.filter(e => e.type === 'hound');   // hA at x 18.6, hB at x 51.4
        const calm = (h, x, y) => { h.dead = false; h.hidden = false; h.state = 'idle'; h.hp = 30; if (x != null) { h.x = x; h.y = y; } delete h.investigation; };
        calm(hA, 18.6, 17.4); calm(hB, 51.4, 15.6);
        const w = currentWeapon(); o.weapon = [w.name, w.noise, w.ranged || false];
        G.noise = 0; G.attack.t = 0; attack('swing'); const withWood = G.noise;
        o.hound = [hA.state, !!hA.investigation, hB.state];
        o.ringMsg = T.msgs().some(t => t.includes(FLUME16.TX.ring.ring));
        // the same swing in a clear spot: just the weapon's own noise, nobody turns
        T.go('flume_road', 10.5, 12.5, 0); T.quiet(); calm(hA, 18.6, 17.4);
        G.noise = 0; G.attack.t = 0; attack('swing'); const plain = G.noise; o.plain = [plain, hA.state];
        o.delta = withWood - plain;
        // a wall of grown wood (the pier) rings too
        T.go('flume_road', 27.5, 13.4, Math.PI / 2); T.quiet(); calm(hA, 22.5, 16.5);
        G.noise = 0; G.attack.t = 0; attack('swing'); o.pier = [G.noise - plain, hA.state];
        // out of hearing range nobody turns
        T.go('flume_road', 19.0, 15.0, Math.PI / 2); T.quiet(); calm(hA, 18.6, 17.4); hA.dead = true; hA.hidden = true; calm(hB, 51.4, 15.6);
        G.noise = 0; G.attack.t = 0; attack('swing'); o.far = hB.state;
        // using the stake itself
        T.go('flume_road', 19.0, 15.0, Math.PI / 2); T.quiet(); const post = G.ents.find(e => e.use === 'p16f_ring'); G.noise = 0; useDeco(post); o.use = G.noise;
        // a foe in front of the wood gets the swing, no ring
        T.go('flume_road', 19.0, 15.0, Math.PI / 2); T.quiet(); const sp = G.ents.find(e => e.type === 'briarsprite'); sp.dead = false; sp.hidden = false; sp.hp = 99; sp.x = 19.0; sp.y = 15.9; sp.state = 'idle';
        G.noise = 0; G.attack.t = 0; attack('swing'); o.foe = G.noise - plain;
        o.noWood = (() => { T.go('flume_landing', 16.5, 5.5, Math.PI / 2); T.quiet(); G.noise = 0; G.attack.t = 0; attack('swing'); return G.noise; })();
        return o;
      });
      ok(r.hound[0] === 'investigate' && r.hound[1] && r.ringMsg, 'a blow on a ringing stake turns the hound within hearing and the wood rings: ' + JSON.stringify(r.hound));
      ok(Math.abs(r.delta - 2.6) < 0.01 && r.plain[1] === 'idle', 'ringing wood adds exactly 2.6 noise to the swing; a swing in the clear adds none and wakes nothing: ' + r.delta.toFixed(2));
      ok(r.pier[0] > 2.5 && r.pier[1] === 'investigate', 'a grown-wood wall rings as well as a stake');
      ok(r.far === 'idle' && Math.abs(r.use - 2.6) < 0.01 && r.foe < 0.5 && r.noWood === r.plain[0], 'a hound beyond 18 does not hear; using a stake rings it; a foe in front takes the swing without a ring; the Landing\'s boards never ring');
    }

    // ---------------------------------------------------------------- 9. Pellam: the same news to six, the true rumour, the key; and the fence
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B, p = G.player;
        T.go('flume_landing', 24.5, 10.5, -Math.PI / 2); T.quiet();
        let q = T.talkTo('p16f_pellam');
        o.intro = q.text.includes('six') && q.text.includes('Compact') && q.text.includes('Church'); o.choices = q.choices.length;
        // too poor
        p.gold = 5; let reply = q.choices[0].f(G); o.broke = [reply === FLUME16.TX.pellam.broke, p.gold, G.flags.p16f_tip];
        // pay
        p.gold = 30; q = FLUME16.pellamQuest(); reply = q.choices[0].f(G);
        o.paid = [reply === FLUME16.TX.pellam.tip, p.gold, G.flags.p16f_tip, G.journal.some(j => j.text === FLUME16.TX.pellam.tipJournal)];
        o.tipTellsPier = /third pier/.test(reply) && /knot/.test(reply) && /under the Wash/.test(reply);
        q = FLUME16.pellamQuest(); o.noSecondSale = q.choices.every(c => c.t !== FLUME16.TX.pellam.buy);
        o.again = q.text === FLUME16.TX.pellam.again;
        // the rumour is TRUE: the doors it names now open and the strongbox is where he said
        const road = G.maps.flume_road; T.go('flume_road', 22.5, 16.5, 0); T.quiet();
        const kd = road.get(24, 16); o.doorFlag = kd.locked === 'p16f_tip' && T.open(road, kd);
        T.step(20, { w: true }); interact(); T.step(120, { w: true }); o.walked = Engine.cam.x;
        const box = G.ents.find(e => e.item === 'cache' && e.tier === 2); o.box = Math.hypot(box.x - 31.5, box.y - 16.5) < 0.1;
        // not bought: the doors are shut
        delete G.flags.p16f_tip; o.shut = !T.open(road, road.get(24, 16)) && !T.open(road, road.get(39, 16));
        // the six
        T.go('flume_landing', 24.5, 10.5, -Math.PI / 2); q = T.talkTo('p16f_pellam'); const who = q.choices.find(c => c.t === FLUME16.TX.pellam.who); o.who = who.f(G) === FLUME16.TX.pellam.whoText;
        // the key
        p.gold = 10; q = FLUME16.pellamQuest(); const kc = q.choices.find(c => c.t === FLUME16.TX.pellam.key); const r1 = kc.f(G); o.keyBroke = [r1.endsWith(FLUME16.TX.pellam.keyBroke), G.has('p16_lock_key'), p.gold];
        p.gold = 40; q = FLUME16.pellamQuest(); const r2 = q.choices.find(c => c.t === FLUME16.TX.pellam.key).f(G); o.keyBought = [r2.endsWith(FLUME16.TX.pellam.keyDone), G.has('p16_lock_key'), p.gold, G.flags.p16f_key];
        q = FLUME16.pellamQuest(); o.keyOnce = q.choices.every(c => c.t !== FLUME16.TX.pellam.key) && q.text === FLUME16.TX.pellam.keyHad;
        // the fence: half of the clean price, only while talking to her
        const clean = sellPrice('v_signet'); const base = ITEMS.v_signet.value;
        DLG.npc = NPCS.p16f_madge; G.state = 'dialogue'; const fenced = sellPrice('v_signet'); const fencedW = sellPrice('w_sword');
        DLG.npc = NPCS.harrow; const other = sellPrice('v_signet'); G.state = 'play'; DLG.npc = NPCS.p16f_madge; const outside = sellPrice('v_signet'); DLG.npc = null;
        o.fence = [clean, fenced, Math.floor(clean * 0.5), other, outside, NPCS.p16f_madge.fenceRate, !!NPCS.p16f_madge.shopTalk, base > 0];
        // she really buys at that rate through the shop
        G.give('v_signet'); const sellable = (() => { DLG.npc = NPCS.p16f_madge; DLG.ent = { id: 'p16f_madge' }; DLG.log = []; G.state = 'dialogue'; renderDialogue('sell'); const btn = Array.from(document.querySelectorAll('[data-sell]')).find(b => b.textContent.includes(ITEMS.v_signet.name)); const label = btn ? btn.querySelector('em').textContent : null; const g0 = p.gold; if (btn) btn.click(); return [label, p.gold - g0]; })();
        o.sold = sellable; T.closeUi();
        return o;
      });
      ok(r.intro && r.choices >= 4, 'Pellam sells the same news to six parties and says so');
      ok(r.broke[0] && r.broke[1] === 5 && !r.broke[2], 'the rumour costs twelve sovereigns: too poor, nothing changes');
      ok(r.paid[0] && r.paid[1] === 18 && r.paid[2] === 1 && r.paid[3] && r.tipTellsPier && r.noSecondSale && r.again, 'paying twelve gives the true rumour (the hollow third pier in the Wash), a journal line, and is never sold twice');
      ok(r.doorFlag && r.walked > 33 && r.box && r.shut, 'the rumour is true: the knot doors open, the tunnel runs under the Wash to the strongbox he named; unbought, the doors are shut: x=' + r.walked.toFixed(1));
      ok(r.who, 'he will name his six');
      ok(r.keyBroke[0] && !r.keyBroke[1] && r.keyBroke[2] === 10 && r.keyBought[0] && r.keyBought[1] && r.keyBought[2] === 15 && r.keyBought[3] === 1 && r.keyOnce, 'the key costs twenty-five, is sold once, and arrives in the pack');
      ok(r.fence[1] === r.fence[2] && r.fence[1] < r.fence[0] && r.fence[3] === r.fence[0] && r.fence[4] === r.fence[0] && r.fence[5] === 0.5, 'the fence pays half the clean price, only while talking to her: ' + JSON.stringify(r.fence));
      ok(r.sold[1] === r.fence[1] && Number(r.sold[0]) === r.fence[1], 'through the sell panel Madge really pays that: ' + JSON.stringify(r.sold));
    }

    // ---------------------------------------------------------------- 10. the lock of Stillwater: three ways in, the reward, the Greening
    {
      const r = await E(() => {
        T.reset(); const o = {}, B = FLUME16.B, p = G.player, TX = FLUME16.TX;
        T.go('flume_landing', 23.5, 11.0, 0); T.quiet();
        // start
        let q = T.talkTo('p16f_orrin'); o.offer = [q.text === TX.orrin.intro, q.choices.length];
        q.choices[1].f(G); o.declined = G.flags.p16f_q || 0;
        q = FLUME16.orrinQuest(); const rep = q.choices[0].f(G); o.started = [rep === TX.orrin.accept, G.flags.p16f_q, G.journal.some(j => j.text === TX.orrin.journalOffer)];
        q = FLUME16.orrinQuest(); o.waiting = q.text === TX.orrin.waiting && !q.choices;
        // the wheel is chained: picking it opens a lockpick game
        const wheel = G.ents.find(e => e.use === 'p16f_wheel'); T.go('flume_landing', 25.0, 13.6, 0); T.quiet();
        const gate = G.maps.flume_landing.get(28, 19); o.shut = !!gate && gate.locked === '__never';
        useDeco(wheel); o.lockpick = [G.state, G.openPanel, !!LOCKPICK];
        T.solvePick();
        o.opened = [G.flags.p16f_lock, G.maps.flume_landing.get(28, 19), G.maps.flume_landing.get(28, 20), wheel.label === TX.landing.wheelOpen, G.journal.some(j => j.text === TX.jour.lockOpened), T.msgs().some(t => t.includes(TX.landing.pickOpen))];
        T.closeUi();
        // Orrin pays
        const g0 = p.gold, xp0 = p.xp, lv0 = p.lvl || p.level || 0, h0 = G.count('honey'), r0 = p.factions.hedge;
        q = T.talkTo('p16f_orrin'); o.paidAsk = [q.text === TX.orrin.openFirst, q.choices.length];
        T.choose(0);
        o.reward = [p.gold - g0, (p.xp !== xp0) || ((p.lvl || p.level || 0) !== lv0), G.count('honey') - h0, p.factions.hedge - r0, G.flags.p16f_q, G.flags.p16f_done];
        o.replyDone = T.lastReply() === TX.orrin.done;
        const raft = G.ents.find(e => e.p16fRaft); o.raft = [raft.hidden === true, raft.label === TX.landing.raftGone];
        q = FLUME16.orrinQuest(); o.after = q.text === TX.orrin.after && !q.choices;
        FLUME16.completeLock(); o.once = p.gold - g0;
        // the quest is told in the Gazette and the rumours
        const gz = STORYRUM.ISSUES.some(i => i.items.some(it => it.t === TX.gazette && it.req.includes('p16f_done'))); const rm = STORYRUM.RUMOURS.some(x => x.id === 'd_p16f_lock' && x.req[0] === 'p16f_done');
        o.story = [gz, rm];
        // the other two ways: the key, and the Root note
        T.reset(); T.go('flume_landing', 25.0, 13.6, 0); T.quiet(); G.give('p16_lock_key'); useDeco(G.ents.find(e => e.use === 'p16f_wheel'));
        o.key = [G.flags.p16f_lock, G.has('p16_lock_key'), T.msgs().some(t => t.includes(TX.landing.keyOpen))];
        T.reset(); T.go('flume_landing', 25.0, 13.6, 0); T.quiet(); p.voice = p.voiceMax; G.song.t = 0; G.attack.t = 0; const v0 = p.voice; castSong('root');
        o.song = [G.flags.p16f_lock, v0 - p.voice, T.msgs().some(t => t.includes(TX.landing.songOpen))];
        T.reset(); T.go('flume_landing', 10.5, 11.0, 0); T.quiet(); p.voice = p.voiceMax; G.song.t = 0; castSong('root'); o.songFar = G.flags.p16f_lock || 0;
        // opened first, then asked: Orrin pays all the same
        T.reset(); T.go('flume_landing', 25.0, 13.6, 0); T.quiet(); FLUME16.openLock('key'); q = T.talkTo('p16f_orrin'); const g1 = p.gold; T.choose(0); o.first = [G.flags.p16f_done, p.gold - g1];
        // the wheel is already free
        T.closeUi(); useDeco(G.ents.find(e => e.use === 'p16f_wheel')); o.free = T.msgs().some(t => t.includes(TX.landing.wheelOpen));
        // a stored lockpick flag with no lock flag opens it too, and nothing breaks
        T.reset(); T.go('flume_landing', 25.0, 13.6, 0); T.quiet(); G.flags['picked:flume_landing:wheel'] = true; useDeco(G.ents.find(e => e.use === 'p16f_wheel')); o.stored = G.flags.p16f_lock;
        return o;
      });
      ok(r.offer[0] && r.offer[1] === 2 && r.declined === 0 && r.started[0] && r.started[1] === 1 && r.started[2] && r.waiting, 'the quest: Orrin offers it, declining changes nothing, accepting sets the stage and writes the journal');
      ok(r.shut && r.lockpick[0] === 'panel' && r.lockpick[1] === 'lockpick' && r.lockpick[2], 'the lock-wheel is chained: using it opens the game\'s lockpicking panel');
      ok(r.opened[0] === 1 && r.opened[1] === null && r.opened[2] === null && r.opened[3] && r.opened[4] && r.opened[5], 'picking the lock opens the lock gate, frees the wheel, writes the journal');
      ok(r.paidAsk[0] && r.paidAsk[1] === 1, 'with the lock open Orrin asks if it was you');
      ok(r.reward[0] === 40 && r.reward[1] && r.reward[2] === 2 && r.reward[3] === 3 && r.reward[4] === 2 && r.reward[5] === 1 && r.replyDone, 'the reward: 40 sovereigns, xp, two honey, Hedge standing +3, and his thanks: ' + JSON.stringify(r.reward));
      ok(r.raft[0] && r.raft[1] && r.after && r.once === 40, 'the raft leaves, Orrin has nothing more to say, and the reward is paid once');
      ok(r.story[0] && r.story[1], 'the Gazette and the tavern rumours tell it once it is done');
      ok(r.key[0] === 1 && !r.key[1] && r.key[2], 'the bought key opens the wheel and is used up');
      ok(r.song[0] === 1 && r.song[1] === 10 && r.song[2] && r.songFar === 0, 'the Root note sung at the wheel (and only there) opens it');
      ok(r.first[0] === 1 && r.first[1] === 40 && r.free && r.stored === 1, 'opening it before asking still pays; an opened wheel stays opened; a stored lockpick flag is honoured');
    }

    // ---------------------------------------------------------------- 11. the Greening closes it
    {
      await page.evaluate(() => { T.reset(); T.go('flume_landing', 23.5, 11.0, 0); T.quiet(); FLUME16.orrinQuest().choices[0].f(G); });
      const r = await E(() => {
        const o = {}, TX = FLUME16.TX;
        o.before = [G.flags.p16f_q, G.maps.oakhaven.get(69, 51).portal && G.maps.oakhaven.get(69, 51).portal.map];
        const road = G.maps.flume_road; road.visited[12 * road.w + 3] = 1; o.travelBefore = travelDestinations('reach').some(d => d.map === 'flume_road');
        G.flags.greening = true; T.step(20);
        o.closed = [G.flags.p16f_q, G.journal.filter(j => j.text === TX.orrin.closed).length];
        // the Greening rebuilds Oakhaven: the gate is a hedge with one line
        G.maps.oakhaven = buildOakhaven(true); const gate = G.maps.oakhaven.get(69, 51);
        o.gate = [!!gate, gate && !gate.portal, gate && gate.locked === '__never', gate && gate.lockMsg === TX.gate.shut];
        o.travelAfter = travelDestinations('reach').some(d => d.map === 'flume_road' || d.door === 'flume_road');
        // a stale or hostile save inside the area lands at the gate
        loadMap('flume_landing', { x: 5, y: 5, dir: 0 }); o.redirect = [G.mapId, !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0)];
        update(0.01); T.step(20);
        o.once = G.journal.filter(j => j.text === TX.orrin.closed).length;
        // an offered-but-unstarted quest and a finished one are left alone
        delete G.flags.greening; T.reset(); G.flags.p16f_q = 2; G.flags.p16f_done = 1; G.flags.greening = true; T.step(20); o.done = [G.flags.p16f_q, G.journal.length];
        T.reset();
        o.lore = /Hedge|Greening|green/.test(TX.gate.shut) && !/Hush/.test(FLUME16.LIST.join(' '));
        return o;
      });
      ok(r.before[0] === 1 && r.before[1] === 'flume_road' && r.travelBefore, 'before the Greening the gate is a portal and the Flume is on the world map');
      ok(r.closed[0] === 3 && r.closed[1] === 1 && r.once === 1, 'the Greening closes an open quest with one journal line, once: ' + JSON.stringify([r.closed, r.once]));
      ok(r.gate[0] && r.gate[1] && r.gate[2] && r.gate[3] && !r.travelAfter, 'after the Greening the gate is hedge with one shut line, and the waypoints are gone');
      ok(r.redirect[0] === 'oakhaven' && r.redirect[1], 'a stale save inside the area wakes at the gate after the Greening');
      ok(r.done[0] === 2 && r.done[1] === 0 && r.lore, 'a finished quest is left alone, and the text never describes the Hush');
    }

    // ---------------------------------------------------------------- 12. the loft: a gift left on the stove
    {
      const r = await E(() => {
        T.reset(); const o = {}, p = G.player, TX = FLUME16.TX;
        T.go('flume_lowrings', 28.0, 5.2, 0); T.quiet();
        const stove = G.ents.find(e => e.use === 'p16f_stove');
        useDeco(stove); o.none = T.msgs().some(t => t.includes(TX.rings.stoveNone)) && G.state === 'play';
        G.give('honey'); useDeco(stove); o.event = [G.state, document.getElementById('event-panel').innerHTML.includes(TX.rings.stove)];
        document.querySelector('#event-panel button').click(); o.gift = [G.flags.p16f_gift, G.has('honey'), G.journal.some(j => j.text === TX.rings.gift)];
        G.give('honey'); useDeco(stove); o.again = [G.state, G.has('honey')];
        useDeco(G.ents.find(e => e.use === 'p16f_reed')); o.reed = T.msgs().some(t => t.includes(TX.rings.reed));
        return o;
      });
      ok(r.none && r.event[0] === 'event' && r.event[1], 'the stove asks for a gift when you have one, and says so when you have none');
      ok(r.gift[0] === 1 && !r.gift[1] && r.gift[2] && r.again[0] === 'play' && r.again[1], 'leaving food takes it once, writes the journal, and the stove is only fed once');
      ok(r.reed, 'the child\'s reed over the hatch has its line');
    }

    // ---------------------------------------------------------------- 13. saves: mid-area, old, hostile
    {
      const r = await E(() => {
        T.reset(); const o = {};
        // in the Landing with the lock open and the quest paid
        G.flags.p16f_lock = 1; G.flags.p16f_q = 2; G.flags.p16f_done = 1; G.flags.p16f_tip = 1; G.flags.p16f_seen = 7;
        FLUME16.applyMapState('flume_landing');
        T.go('flume_landing', 20.5, 12.5, 1.0);
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        o.snap = snap.mapId;
        for (const k of Object.keys(G.flags)) delete G.flags[k]; G.maps.flume_landing = buildAllMaps().flume_landing; T.go('oakhaven', 20, 20, 0);
        restoreGame(snap); G.state = 'play'; T.step(5);
        const m = G.maps.flume_landing;
        o.back = { map: G.mapId, flags: [G.flags.p16f_lock, G.flags.p16f_q, G.flags.p16f_done, G.flags.p16f_tip, G.flags.p16f_seen].join(','), gate: m.get(28, 19) === null && m.get(28, 20) === null, raft: m.entities.find(e => e.p16fRaft).hidden === true, base: m.entities.length >= m.baseCount && m.entities.slice(m.baseCount).every(e => e.transient),   // other modules' people (R4) stand past baseCount, never saved
         pos: Math.hypot(Engine.cam.x - 20.5, Engine.cam.y - 12.5) < 0.6 };
        // in the Wash during a surge: nothing of the water is saved; it comes back quiet (other modules' transient
        // entities, such as library26's found book on the road, may sit past baseCount: never saved, never a wave)
        T.reset(); T.go('flume_road', 30.5, 12.5, 0); T.quiet(); T.phase('surge', 5); T.step(3);
        const snap2 = JSON.parse(JSON.stringify(snapshotGame()));
        o.snapWaves = JSON.stringify(snap2).indexOf('p16f_wave') < 0;
        restoreGame(snap2); G.state = 'play'; T.step(3);
        const rm = G.maps.flume_road;
        o.surge = { map: G.mapId, phase: FLUME16.T.phase, waves: FLUME16.T.waves.length, ents: rm.entities.length >= rm.baseCount && rm.entities.slice(rm.baseCount).every(e => e.transient && !e._p16f), wet: rm.floorCells[12 * rm.w + 30] };
        // an old save with none of this
        const old = JSON.parse(JSON.stringify(snap)); for (const id of FLUME16.MAPS) delete old.maps[id]; for (const k of Object.keys(old.flags)) if (k.startsWith('p16f_')) delete old.flags[k];
        old.mapId = 'oakhaven'; old.cam = { x: 66.5, y: 51.5, dir: 0 }; restoreGame(old); G.state = 'play';
        o.old = { map: G.mapId, maps: FLUME16.MAPS.every(id => !!G.maps[id] && G.maps[id].entities.length === G.maps[id].baseCount), gate: !!G.maps.oakhaven.get(69, 51).portal, flags: Object.keys(G.flags).filter(k => k.startsWith('p16f_')).length };
        // old save from inside the area (one made by a build that had the maps but different flags)
        const old2 = JSON.parse(JSON.stringify(snap)); old2.flags = {}; restoreGame(old2); G.state = 'play'; o.old2 = [G.mapId, G.maps.flume_landing.get(28, 19) && G.maps.flume_landing.get(28, 19).locked];
        return o;
      });
      ok(r.snap === 'flume_landing' && r.back.map === 'flume_landing' && r.back.flags === '1,2,1,1,7' && r.back.gate && r.back.raft && r.back.base && r.back.pos, 'a save made in the Landing loads back in the Landing with the open gate, the departed raft and every flag: ' + JSON.stringify(r.back));
      ok(r.snapWaves && r.surge.map === 'flume_road' && r.surge.phase === 'quiet' && r.surge.waves === 0 && r.surge.ents && r.surge.wet === 5, 'a save made in the middle of a surge saves none of the water and wakes on a dry, quiet Wash: ' + JSON.stringify(r.surge));
      ok(r.old.map === 'oakhaven' && r.old.maps && r.old.gate && r.old.flags === 0 && r.old2[0] === 'flume_landing' && r.old2[1] === '__never', 'an old save with none of this loads, the maps are rebuilt untouched and the gate is in Oakhaven\'s Hedge: ' + JSON.stringify(r.old));
    }
    {
      const r = await E(() => {
        T.reset(); const o = {}; const evil = '<img src=x onerror=window.__pwn=1>';
        FLUME16.setf('seen', 1);
        T.go('flume_landing', 20.5, 12.5, 0);
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        const bad = JSON.parse(JSON.stringify(snap));
        for (const k of ['q', 'tip', 'lock', 'key', 'seen', 'gift', 'done', 'met']) bad.flags['p16f_' + k] = ({ q: evil, tip: { a: 1 }, lock: -4, key: 1.5, seen: 1e9, gift: NaN, done: 'yes', met: [1] })[k];
        bad.flags.p16f_unknown = evil; bad.flags['p16f_' + evil] = evil; bad.flags.p16f_ = 1; bad.flags.p16f_q2 = 2;
        bad.mapId = 'flume_landing'; bad.cam = { x: 0.5, y: 0.5, dir: 0 };
        restoreGame(bad); G.state = 'play'; T.step(3);
        o.evil = { map: G.mapId, free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0), left: Object.keys(G.flags).filter(k => k.startsWith('p16f_')), gateShut: G.maps.flume_landing.get(28, 19) && G.maps.flume_landing.get(28, 19).locked === '__never', pwn: window.__pwn, html: /onerror/.test(document.body.innerHTML) };
        o.evilValues = o.evil.left.every(k => Number.isInteger(G.flags[k]));
        // clamped, not trusted: a legal-looking but silly value stays inside its range
        const b2 = JSON.parse(JSON.stringify(snap)); b2.flags.p16f_q = 9; b2.flags.p16f_seen = 8; b2.flags.p16f_lock = 2; restoreGame(b2); G.state = 'play'; o.range = [G.flags.p16f_q, G.flags.p16f_seen, G.flags.p16f_lock];
        // the camera in a wall on every map of mine
        o.walls = FLUME16.MAPS.map(id => { const s2 = JSON.parse(JSON.stringify(snap)); s2.mapId = id; s2.cam = { x: 0.5, y: 0.5, dir: 0 }; restoreGame(s2); G.state = 'play'; T.step(2); return [G.mapId, !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0)]; });
        // hostile + the Greening
        const gl = JSON.parse(JSON.stringify(snap)); gl.flags.greening = true; gl.mapId = 'flume_lowrings'; gl.cam = { x: 5.5, y: 5.5, dir: 0 }; restoreGame(gl); G.state = 'play';
        o.greened = [G.mapId, !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0)]; delete G.flags.greening;
        Engine.render(G.ents, G.tod); drawHUD();
        // no flag value reaches the screen: journal, messages, dialogue, panels
        T.reset(); G.flags.p16f_q = 1; G.flags.p16f_seen = 3; T.go('flume_landing', 23.5, 11.0, 0); T.talkTo('p16f_orrin'); const t1 = document.getElementById('modal-panel').innerHTML; T.closeUi();
        o.screen = !/p16f_|onerror/.test(t1 + document.getElementById('msgs').innerHTML);
        // the source never builds markup from a flag
        o.src = null;
        return o;
      });
      ok(r.evil.map === 'flume_landing' && r.evil.free && r.evil.left.every(k => k === 'p16f_seen') && r.evilValues && r.evil.gateShut && !r.evil.pwn && !r.evil.html, 'a hostile save (junk and markup in every p16f_ flag, unknown keys, the camera in a wall) loads safely: junk is dropped and the traveller stands on free floor: ' + JSON.stringify(r.evil));
      ok(r.range[0] == null && r.range[2] == null && r.range[1] !== 8, 'out-of-range values are dropped, not clamped into a state: ' + JSON.stringify(r.range));
      ok(r.walls.every(w => w[1]), 'a camera in a wall on any of the three maps is moved to free floor');
      ok(r.greened[0] === 'oakhaven' && r.greened[1] && r.screen, 'a hostile Greening save wakes at the gate, and no flag value is shown anywhere');
    }

    // ---------------------------------------------------------------- 14. the Options rows and presets
    {
      const o = await E(() => {
        T.reset(); G.state = 'panel'; renderAccessibilityMenu(); const r = {};
        const s1 = document.getElementById('p16f-opt-surges'), s2 = document.getElementById('p16f-opt-glow');
        r.has = !!s1 && !!s2 && !!document.getElementById('p16f-opt-surges-label');
        renderAccessibilityMenu(); r.dup = document.querySelectorAll('#p16f-opt-surges').length;
        r.on = [s1.textContent, document.getElementById('p16f-opt-surges').getAttribute('aria-pressed')];
        document.getElementById('p16f-opt-surges').click(); r.off = [FLUME16.cfg.surges, localStorage.getItem('octave.flume16.v1'), document.getElementById('p16f-opt-surges').textContent];
        document.getElementById('p16f-opt-surges').click(); r.back = FLUME16.cfg.surges;
        document.getElementById('p16f-opt-glow').click(); r.glow = [GFX.flumeGlow, document.getElementById('p16f-opt-glow').textContent];
        document.getElementById('p16f-opt-glow').click(); r.glowOn = GFX.flumeGlow;
        closeModal(); G.state = 'play';
        // presets: per-frame effects are off in Original and Low, on from Medium up
        const pre = {}; for (const n of ['original', 'low', 'medium', 'high', 'ultra', 'cinematic']) { PRESETS.apply(n); pre[n] = GFX.flumeGlow === true; }
        PRESETS.apply('medium'); r.pre = pre;
        return r;
      });
      ok(o.has && o.dup === 1 && o.on[0] === 'On' && o.on[1] === 'true', 'two Options rows ("Flume surges", "Flume glow"), added once and not duplicated on re-render');
      ok(o.off[0] === false && o.off[1] === '{"surges":false}' && o.off[2] === 'Off' && o.back === true && o.glow[0] === false && o.glow[1] === 'Off' && o.glowOn === true, 'the rows toggle the surge and the glow, and the surge choice persists in localStorage');
      ok(o.pre.original === false && o.pre.low === false && o.pre.medium && o.pre.high && o.pre.ultra && o.pre.cinematic, 'the glow is off in Original and Low and on from Medium up: ' + JSON.stringify(o.pre));
      const reload = await E(() => { localStorage.setItem('octave.flume16.v1', '{"surges":false}'); return 1; });
      await page.reload();
      await page.waitForFunction(() => typeof FLUME16 !== 'undefined' && G.state === 'title');
      const off = await page.evaluate(() => { const v = FLUME16.cfg.surges; localStorage.removeItem('octave.flume16.v1'); return v; });
      ok(reload === 1 && off === false, 'a stored "surges off" is read back at load');
      await boot2(page);
    }

    // ---------------------------------------------------------------- 15. frame cost, 12 enemies and a surge
    {
      const r = await E(() => {
        T.reset(); const o = {};
        PRESETS.apply('medium');
        T.go('flume_road', 22.5, 12.5, 0); T.phase('surge', 1e6); T.step(10);
        // twelve enemies in view
        const m = G.maps.flume_road; const extra = [];
        for (let i = 0; i < 12; i++) { const proto = G.ents.find(x => x.type === 'briarsprite'); const e = Object.assign({}, proto, { x: 24.5 + (i % 6) * 1.6, y: 12.0 + (i % 2) * 1.2, transient: true, dead: false, hidden: false, state: 'idle' }); m.entities.push(e); extra.push(e); }
        T.step(5);
        const time = (n) => { const t0 = performance.now(); for (let i = 0; i < n; i++) Engine.render(G.ents, G.tod); return (performance.now() - t0) / n; };
        time(10);
        const ab = () => { let a = 1e9, b = 1e9; for (let r = 0; r < 8; r++) { GFX.flumeGlow = true; a = Math.min(a, time(8)); GFX.flumeGlow = false; b = Math.min(b, time(8)); } GFX.flumeGlow = true; return [a, b]; }; const [on, off] = ab();
        o.glow = [on, off, on - off];
        const t0 = performance.now(); for (let i = 0; i < 200; i++) { G.keys = {}; update(0.016); } o.update = (performance.now() - t0) / 200;
        o.waves = FLUME16.T.waves.length;
        for (const e of extra) { const i = m.entities.indexOf(e); if (i >= 0) m.entities.splice(i, 1); }
        // the per-frame effects: glow only where it should be
        T.go('oakhaven', 30.5, 30.5, 0); const [o1, o2] = ab(); o.elsewhere = o1 - o2;
        return o;
      });
      ok(r.glow[2] < 1.5, 'the water glow costs ' + r.glow[2].toFixed(2) + ' ms a frame in the surge scene with 12 enemies and ' + r.waves + ' water props (limit 1.5 ms): on ' + r.glow[0].toFixed(2) + ', off ' + r.glow[1].toFixed(2));
      ok(r.update < 1.2 && Math.abs(r.elsewhere) < 1, 'the game tick with the surge and sprites costs ' + r.update.toFixed(2) + ' ms and the glow costs nothing elsewhere (' + r.elsewhere.toFixed(2) + ' ms)');
    }

    // ---------------------------------------------------------------- 16. text rules
    {
      const r = await E(() => {
        const o = {}, L = FLUME16.LIST;
        o.marked = L.length;
        o.hush = L.filter(t => /\bHush\b/.test(t));
        o.scream = L.filter(t => /scream|shriek/i.test(t));
        o.markup = L.filter(t => /[<>]/.test(t));
        o.long = L.filter(t => t.length > 700);
        o.src = null;
        return o;
      });
      ok(r.hush.length === 0 && r.scream.length === 0, 'the Hush is never named or described and nobody screams in any player-visible line');
      ok(r.markup.length === 0 && r.long.length === 0, 'no string carries markup or runs on');
    }

    // ---------------------------------------------------------------- 17. screenshots, 640x400
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const shot = async (name) => { const box = await page.locator('canvas').first().boundingBox(); await page.screenshot({ path: path.join(SHOTS, name), clip: box }); };
      const look = (preset, id, x, y, dir, ph, tod, extra) => E(([preset, id, x, y, dir, ph, tod, extra]) => {
        T.reset(); PRESETS.apply(preset); if (extra) eval(extra);
        T.go(id, x, y, dir); T.quiet(); G.tod = tod; G.time = 100;
        if (ph) T.phase(ph, ph === 'telegraph' ? 1.6 : 1e6);
        T.step(40); document.getElementById('msgs').innerHTML = '';
        Engine.render(G.ents, G.tod);
      }, [preset, id, x, y, dir, ph, tod, extra || '']);
      for (const preset of ['medium', 'cinematic']) {
        const tag = preset === 'medium' ? 'med' : 'cin';
        await look(preset, 'flume_road', 6.5, 12.5, -0.9, null, 0.45); await shot(`01-road-aqueduct-${tag}.png`);
        await look(preset, 'flume_road', 21.5, 12.5, 0, null, 0.45); await shot(`02-the-wash-quiet-${tag}.png`);
        await look(preset, 'flume_road', 21.5, 12.5, 0, 'telegraph', 0.45); await shot(`03-the-wash-telegraph-${tag}.png`);
        await look(preset, 'flume_road', 21.5, 12.5, 0, 'surge', 0.45); await shot(`04-the-wash-surge-${tag}.png`);
        await look(preset, 'flume_road', 21.5, 12.5, 0, 'surge', 0.78); await shot(`05-the-wash-surge-dusk-${tag}.png`);
        await look(preset, 'flume_road', 46.5, 12.5, -0.3, null, 0.45, 'FLUME16.B.SPRITE.hp = 7'); await E(() => { const e = G.ents.find(x => x.type === 'briarsprite' && x.x > 44); e.dead = false; e.hidden = false; e.x = 47.6; e.y = 12.6; e.state = 'idle'; Engine.render(G.ents, G.tod); }); await shot(`06-briar-sprite-${tag}.png`);
        await look(preset, 'flume_landing', 18.5, 11.5, 1.3, null, 0.45); await shot(`07-stillwater-quay-${tag}.png`);
        await look(preset, 'flume_landing', 22.0, 14.0, 0.2, null, 0.45); await shot(`08-lock-wheel-${tag}.png`);
        await look(preset, 'flume_landing', 24.5, 10.8, -Math.PI / 2, null, 0.45); await shot(`09-pellam-${tag}.png`);
        await look(preset, 'flume_lowrings', 30.5, 18.5, 3.0, null, 0.45); await shot(`10-low-rings-${tag}.png`);
        await look(preset, 'flume_lowrings', 30.5, 18.5, 3.0, null, 0.78); await shot(`11-low-rings-dusk-${tag}.png`);
        await look(preset, 'flume_road', 28.0, 12.5, 0, null, 0.45); await shot(`12-the-wash-from-inside-${tag}.png`);
      }
      await E(() => { T.reset(); PRESETS.apply('medium'); T.go('flume_landing', 24.5, 10.8, -Math.PI / 2); T.quiet(); T.talkTo('p16f_pellam'); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, '13-pellam-dialogue.png') });
      await E(() => { T.closeUi(); T.reset(); T.go('flume_road', 30.5, 12.5, 0); T.quiet(); G.player.hp = 60; UPG.status.bleed = 5; T.phase('quiet', 50); T.step(3); Engine.render(G.ents, G.tod); drawHUD(); }); await shot('14-bleeding-hud.png');
      await E(() => { UPG.status.bleed = 0; });
    }
    {
      await page.setViewportSize({ width: 640, height: 400 });
      const fit = await E(() => {
        T.reset(); const o = {}; const inside = (el) => { const q = el.getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1 && q.top >= -1 && q.bottom <= innerHeight + 1; };
        T.go('flume_landing', 24.5, 10.8, -Math.PI / 2); T.quiet();
        T.talkTo('p16f_pellam');
        const panel = document.querySelector('#modal-panel'); o.dlgX = panel.scrollWidth <= panel.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
        o.choice = Array.from(document.querySelectorAll('[data-choice]')).length >= 3;
        const first = document.querySelector('[data-choice]'); if (first) first.scrollIntoView({ block: 'nearest' }); o.reach = !first || inside(first);
        T.closeUi();
        T.go('flume_lowrings', 28.0, 5.2, 0); T.quiet(); G.give('honey'); useDeco(G.ents.find(e => e.use === 'p16f_stove'));
        const ev = document.getElementById('event-panel'); o.eventX = ev.scrollWidth <= ev.clientWidth + 1; o.eventBtns = Array.from(ev.querySelectorAll('button')).every(inside);
        T.closeUi();
        G.state = 'panel'; renderAccessibilityMenu();
        const grid = document.querySelector('#modal-panel .ctl-grid'), b = document.getElementById('p16f-opt-surges'); b.scrollIntoView({ block: 'nearest' }); const q = b.getBoundingClientRect();
        o.opt = { gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, reach: q.left >= -1 && q.right <= innerWidth + 1 && q.width > 20 };
        closeModal(); G.state = 'play';
        T.go('flume_road', 30.5, 12.5, 0); T.quiet(); T.phase('surge', 50); UPG.status.bleed = 5; T.step(10); Engine.render(G.ents, G.tod); drawHUD(); UPG.status.bleed = 0;
        o.canvas = [Engine.VW, Engine.VH];
        return o;
      });
      ok(fit.dlgX && fit.choice && fit.reach, '640x400: Pellam\'s dialogue and its answers fit');
      ok(fit.eventX && fit.eventBtns, '640x400: the stove\'s event sheet fits');
      ok(fit.opt.gridX && fit.opt.docX && fit.opt.reach, '640x400: the Options rows are reachable with no horizontal overflow');
      if (SHOTS) {
        await E(() => { T.reset(); PRESETS.apply('medium'); T.go('flume_road', 21.5, 12.5, 0); T.quiet(); T.phase('surge', 1e6); G.tod = 0.45; T.step(40); Engine.render(G.ents, G.tod); });
        await page.screenshot({ path: path.join(SHOTS, '15-640x400-surge.png') });
        await E(() => { T.reset(); PRESETS.apply('cinematic'); T.go('flume_lowrings', 30.5, 18.5, 3.0); T.quiet(); G.tod = 0.45; T.step(40); Engine.render(G.ents, G.tod); });
        await page.screenshot({ path: path.join(SHOTS, '16-640x400-rings-cinematic.png') });
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    ok(errors.length === 0, 'no page errors or flume16 warnings: ' + errors.join(' | '));
    await page.close();
    log(`ALL PASS (${n} checks)`);
  } catch (e) {
    console.error('FAIL', e.message); process.exitCode = 1;
  } finally { await browser.close(); }
})();

// after a reload the game is back at the title: make a new traveller again
async function boot2(page) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Flume Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  await page.evaluate(HELPERS);
}
