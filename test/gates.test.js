// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/gates.test.js
// Rising portcullises (collision threshold, portal opening, saves, switch-off identity) and the
// Quarry cave-in (flood-fill reachability, safe recovery, save/load, reduced motion).
// SHOT_DIR=<dir> also writes screenshots there. Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';

async function boot(browser, blockGates) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /gates/.test(m.text())) errors.push('console: ' + m.text()); });
  // the sky's cloud noise is drawn from Math.random when the engine loads: seed it so fresh pages render alike
  await page.addInitScript(() => { let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  if (blockGates) await page.route('**/js/gates.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof Doors !== 'undefined' && typeof PRESETS !== 'undefined');
  if (!blockGates) await page.waitForFunction(() => typeof GATES !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Gate Tester');
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
  window.__pn = performance.now.bind(performance);
  window.T = {
    freeze() {
      Engine.setWeather({}); PARTICLES.list = []; ANIM.dt = 0; ANIM.T = 3; Engine.setTime(3); G.tod = 0.5; G.day = 1; G.time = 100; performance.now = () => 5000; Date.now = () => 1e12;
      if (typeof Weather !== 'undefined' && Weather.load) { try { Weather.load(null); } catch (e) { /* default sky */ } }
      Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    },
    calm() { for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; } G.player.hp = G.player.hpMax = 9999; },
    frameHash() {
      const d = Engine.ctx.getImageData(0, 0, Engine.VW, Engine.VIEW_H).data; let h = 2166136261 >>> 0;
      for (let i = 0; i < d.length; i += 4) { h ^= d[i]; h = Math.imul(h, 16777619); h ^= d[i + 1]; h = Math.imul(h, 16777619); h ^= d[i + 2]; h = Math.imul(h, 16777619); }
      return h >>> 0;
    },
    look(id, x, y, dir) { loadMap(id, { x, y, dir }); T.freeze(); G.state = 'play'; },
    adv(ms) { window.advanceTime(ms); },
    // an independent flood fill over the real map (not the module's): which cells can a walker reach from (sx, sy)?
    reach(m, sx, sy) {
      const open = (x, y) => { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; const c = m.cells[y * m.w + x]; if (c && !c.door) return false; return !(m.floorCells && m.floorCells[y * m.w + x] === 2); };
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
    needs(m) {
      const out = [], add = (x, y, why) => out.push({ x: Math.floor(x), y: Math.floor(y), why });
      add(m.spawn.x, m.spawn.y, 'spawn'); if (m.shaftReturn) add(m.shaftReturn.x, m.shaftReturn.y, 'shaftReturn');
      for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (c && c.door) { const x = i % m.w, y = (i / m.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = m.cells[ny * m.w + nx]; if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && !n) add(nx, ny, (c.portal ? 'portal ' : 'door ') + (c.label || '')); } } }
      for (const e of m.entities) if (e.kind === 'item' || e.kind === 'npc' || (e.kind === 'deco' && e.use)) add(e.x, e.y, e.kind + ':' + (e.item || e.id || e.use));
      return out;
    },
    rubble(m) { const r = []; for (let i = 0; i < m.cells.length; i++) if (m.cells[i] && m.cells[i].rubble) r.push(i); return r; },
    cellsSig(m) { return m.cells.map(c => c ? (c.tex + (c.door ? 'D' : '') + (c.top != null ? c.top : '')) : '.').join(','); },
  };
};

(async () => {
  const browser = await chromium.launch();
  const lines = []; const log = s => { lines.push(s); console.log(s); };
  let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; log('PASS ' + msg); };
  try {
    const { page, errors } = await boot(browser, false);
    await page.evaluate(HELPERS);
    const E = (f, a) => page.evaluate(f, a);

    // ---------------------------------------------------------------- 1. switches and gate detection
    {
      const r = await E(() => ({ ga: GFX.gateAnims, co: GFX.collapses, fxGa: GFX.FX.includes('gateAnims'), fxCo: GFX.FX.includes('collapses') }));
      ok(r.ga === true && r.fxGa, 'GFX.gateAnims defaults on and joins GFX.FX (plain() switches it off)');
      ok(r.co === true && !r.fxCo, 'GFX.collapses defaults on and is NOT in GFX.FX (it changes the world)');
      const g = await E(() => {
        const out = {};
        for (const id of ['oakhaven', 'clearing', 'tannery', 'quarry', 'rootvault', 'underhedge', 'catacombs', 'tavern']) { const m = G.maps[id]; out[id] = GATES.gatesOf(m).map(x => (x.cell._gtex0 || x.cell.tex) + '@' + x.x + ',' + x.y + ' or' + x.or); }
        return out;
      });
      ok(g.oakhaven.length === 2 && g.clearing.length >= 1 && g.tannery.length === 0 && g.quarry.length >= 1 && g.rootvault.length >= 1 && g.underhedge.length >= 1 && g.catacombs.length === 2 && g.tavern.length === 0,
        'gate cells found: North Gate and culvert grate (both in Oakhaven), clearing gate, shaft gates, Under-hedge grate, two Catacombs grates, none in the tavern: ' + JSON.stringify(g));
      const orient = await E(() => Object.values(G.maps).every(m => GATES.gatesOf(m).every(x => x.or === 1 || x.or === 2)));
      ok(orient, 'every gate sits in a clear doorway (orientation known), so none falls back to the sliding leaf');
    }

    // ---------------------------------------------------------------- 2. collision threshold vs drawn bar
    {
      const r = await E(() => {
        const bad = [];
        const m = G.maps.oakhaven; const ci = 0 * m.w + 23, d = m.doors[ci];
        loadMap('oakhaven', { x: 23.5, y: 3.5, dir: -Math.PI / 2 }); T.freeze(); G.state = 'play';
        for (let i = 0; i <= 100; i++) {
          const o = i / 100; d.open = d.target = o;
          const solid = m.isSolidCell(23, 0), clear = GATES.clearsHead(o), bottom = GATES.barBottom(o);
          if (solid === clear) bad.push(['flip', o, solid, clear]);
          if (solid !== !(o > 0.7)) bad.push(['engine-threshold', o]);
          if ((bottom > GATES.HEAD_TOP + 1e-9) !== !solid) bad.push(['head', o, bottom]);
          // the player's own collision test agrees (feet on the cell's floor, eye 0.5)
          const sa = solidAt(23.5, 0.5, null); if (sa !== solid) bad.push(['solidAt', o, sa]);
        }
        d.open = d.target = 0;
        return { bad, at07: GATES.barBottom(0.7), head: GATES.HEAD_TOP, mono: Array.from({ length: 101 }, (_, i) => GATES.barBottom(i / 100)).every((v, i, a) => i === 0 || v >= a[i - 1]), end: GATES.barBottom(1) };
      });
      ok(r.bad.length === 0, 'portcullis passability flips exactly where the bar clears head height (0.7 threshold, 101 sweep points): ' + JSON.stringify(r.bad.slice(0, 3)));
      ok(Math.abs(r.at07 - r.head) < 1e-12 && r.mono && r.end === 1, 'bar bottom is monotonic, equals the head top at the threshold and reaches the lintel when fully open');
      // raised ground: a gate on a cell whose floor is 1.2 up: heights are relative to that floor
      const rr = await E(() => {
        const m = G.maps.quarry; loadMap('quarry', m.spawn); T.freeze(); T.calm();
        const dp = m.named.depot, x = dp.x + 1, y = dp.y;   // on the terrace (lvl 1.2)
        const lvl = m.groundAt(x + 0.5, y + 0.5), saved = m.cells[y * m.w + x];
        m.set(x, y, DOOR({ label: 'Test gate' })); const d = m.doors[y * m.w + x];
        const out = { lvl, bad: [] };
        const g = GATES.gateInfo(m.cells[y * m.w + x], m.cells, m.w, x, y);
        out.found = !!g;
        for (let i = 0; i <= 20; i++) { d.open = d.target = i / 20; if (m.isSolidCell(x, y) === GATES.clearsHead(i / 20)) out.bad.push(i / 20); }
        // solidAt with the player's feet on that floor
        Engine.cam.x = x + 0.5; Engine.cam.y = y + 1.5; G.player.feet = lvl;
        d.open = d.target = 0.5; out.solidShut = solidAt(x + 0.5, y + 0.5, null); d.open = d.target = 0.9; out.solidOpen = solidAt(x + 0.5, y + 0.5, null);
        m.cells[y * m.w + x] = saved; delete m.doors[y * m.w + x];
        return out;
      });
      ok(rr.lvl > 1 && rr.bad.length === 0 && rr.solidShut === true && rr.solidOpen === false, `height-aware collision still agrees on a gate cell raised to ${rr.lvl.toFixed(2)} (bar threshold and solidAt)`);
    }

    // ---------------------------------------------------------------- 3. drawn bar bottom tracks the lift (pixel check)
    {
      const r = await E(() => {
        G.flags.gate_open = true; T.look('oakhaven', 23.5, 3.5, -Math.PI / 2);
        // measure the lattice alone: other Phase 4 modules hang pennants, perch crows and blow smoke round the gate
        const others = ['smoke', 'splashes', 'torches', 'windSigns', 'leaves', 'critters', 'kestrelMoored', 'shardGlint'], keepFx = others.map(k => GFX[k]);
        others.forEach(k => { if (k in GFX) GFX[k] = false; });
        const m = G.map, d = m.doors[23], out = [];
        const F = { cam: Engine.cam };
        for (const o of [0.15, 0.35, 0.55, 0.7]) {
          d.open = d.target = o; Engine.render(G.ents.filter(e => !e._decor), G.tod);
          // find the lowest row in the centre columns that is lighter than the dark backing (an upright of the lattice)
          const W = Engine.VW, data = Engine.ctx.getImageData(0, 0, W, Engine.VIEW_H).data;
          let lowest = -1, highest = 1e9;
          for (let x = (W * 0.42) | 0; x < (W * 0.58) | 0; x++) for (let y = 0; y < Engine.VIEW_H; y++) {
            const i = (y * W + x) * 4, lum = data[i] + data[i + 1] + data[i + 2];
            if (lum > 60 && y > 52 && y < 116) { if (y > lowest) lowest = y; if (y < highest) highest = y; }
          }
          // expected: screen row of z = bottom, 0.9 away from the camera (cell plane 0.5 into cell at y=0 from y=3.5 -> 3.0)
          const t = 3.0, h = Engine.VIEW_H, horizon = (h >> 1), expect = horizon + (h / t) * (0.88 - GATES.barBottom(o));
          out.push({ o, lowest, expect: Math.round(expect), highest });
        }
        d.open = d.target = 0; others.forEach((k, i) => { if (k in GFX) GFX[k] = keepFx[i]; });
        return out;
      });
      const okAll = r.every(x => x.lowest > 0 && Math.abs(x.lowest - x.expect) <= 6);
      ok(okAll, 'drawn bar lower edge follows barBottom(open) within 6 px at four lifts: ' + JSON.stringify(r));
      ok(r[0].lowest > r[1].lowest && r[1].lowest > r[2].lowest && r[2].lowest > r[3].lowest, 'the bar visibly rises as the door opens');
    }

    // ---------------------------------------------------------------- 4. portal gate: opening plays, transfer happens once
    {
      const r = await E(() => {
        const out = {};
        G.flags.gate_open = true; T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); T.calm();
        let loads = 0; const _lm = loadMap; window.__lm = _lm; loadMap = function (id, pos) { loads++; return _lm.apply(this, arguments); };
        GATES.stats.transfers = 0;
        G.keys = { w: true };
        interact();
        out.pending = !!GATES.pending(); out.stillOakhaven = G.mapId === 'oakhaven';
        const c0 = [Engine.cam.x, Engine.cam.y];
        T.adv(150); const d = G.map.doors[23];
        out.midOpen = d.open > 0 && d.open < 0.98; out.moved = Math.hypot(Engine.cam.x - c0[0], Engine.cam.y - c0[1]);
        // saving mid-animation records the gate shut
        const snap = snapshotGame(); out.savedDoor = snap.maps.oakhaven.doors['23']; out.liveOpen = G.map.doors[23].open > 0;
        // a second press does nothing
        interact(); out.stillOne = true;
        T.adv(1200);
        out.mapAfter = G.mapId; out.loads = loads; out.transfers = GATES.stats.transfers; out.pendingAfter = !!GATES.pending();
        out.doorShut = G.maps.oakhaven.doors[23].open === 0 && G.maps.oakhaven.doors[23].target === 0;
        G.keys = {}; loadMap = _lm;
        return out;
      });
      ok(r.pending && r.stillOakhaven, 'interacting with the North Gate starts an opening instead of teleporting at once');
      ok(r.midOpen && r.moved < 1e-6, 'during the opening the gate rises and movement keys are ignored (input locked)');
      ok(r.savedDoor === undefined && r.liveOpen, 'a save taken mid-opening records the gate shut and leaves the live door alone');
      ok(r.mapAfter === 'clearing' && r.transfers === 1 && r.loads === 1 && !r.pendingAfter && r.doorShut, 'the transfer then runs exactly once (loadMap called once) and the gate is left shut behind');

      // a locked gate is unchanged
      const l = await E(() => {
        G.flags.gate_open = false; T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); G.keys = {};
        GATES.stats.started = 0; interact(); const s = GATES.stats.started, d = G.map.doors[23];
        T.adv(300);
        return { started: s, pending: !!GATES.pending(), open: d.open, map: G.mapId };
      });
      ok(l.started === 0 && !l.pending && l.open === 0 && l.map === 'oakhaven', 'a locked gate still refuses: no opening, no transfer');

      // reduced motion, switch off, load and map change
      const v = await E(() => {
        const out = {};
        G.flags.gate_open = true;
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); GFX.reduceMotion = true; interact(); out.rm = G.mapId; GFX.reduceMotion = false;
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); GFX.gateAnims = false; interact(); out.off = G.mapId; GFX.gateAnims = true;
        // load mid-opening
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); interact(); T.adv(100); const snap = snapshotGame(); const had = !!GATES.pending();
        restoreGame(JSON.parse(JSON.stringify(snap))); T.adv(1500); out.loadHad = had; out.loadMap = G.mapId; out.loadPending = !!GATES.pending();
        // map change mid-opening cancels without a transfer
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); interact(); T.adv(100); loadMap('tavern', G.maps.tavern.spawn); T.adv(1500);
        out.changeMap = G.mapId; out.oakDoor = G.maps.oakhaven.doors[23].open;
        // timeout: the door never gets going
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); interact(); const d = G.map.doors[23]; let steps = 0;
        while (G.mapId === 'oakhaven' && steps < 400) { d.open = 0.05; update(1 / 60); steps++; }
        out.timeoutMap = G.mapId; out.timeoutSteps = steps;
        return out;
      });
      ok(v.rm === 'clearing' && v.off === 'clearing', 'reduced motion and GFX.gateAnims = false transfer at once, as before');
      ok(v.loadHad && v.loadMap === 'oakhaven' && !v.loadPending, 'loading a save made mid-opening cancels the opening: you stay in Oakhaven, no softlock');
      ok(v.changeMap === 'tavern' && v.oakDoor === 0, 'a map change mid-opening cancels it and leaves the gate shut');
      ok(v.timeoutMap === 'clearing' && v.timeoutSteps < 140, `a stuck door cannot softlock: the timeout transfers after ${v.timeoutSteps} ticks`);
    }

    // ---------------------------------------------------------------- 5. switch off == original (frames and state)
    {
      const script = () => {
        const out = { frames: [], state: null };
        // other Phase 4 modules animate on their own clocks (smoke, leaves, crows, banners): hold them out of these frames
        for (const k of ['smoke', 'splashes', 'torches', 'windSigns', 'leaves', 'critters', 'kestrelMoored', 'shardGlint', 'sunShafts', 'heatHaze', 'glassGlare', 'seeThrough', 'coldBreath', 'footprints']) if (k in GFX) GFX[k] = false;
        G.flags.gate_open = true; G.flags.culvert_open = true;
        const views = [['oakhaven', 23.5, 3.4, -Math.PI / 2, 23, 0], ['clearing', 20.5, G.maps.clearing.h - 3.3, Math.PI / 2, 20, G.maps.clearing.h - 1], ['catacombs', 8.5, 26.5, Math.PI, 10, 26]];
        for (const [id, x, y, dir, gx, gy] of views) {
          T.look(id, x, y, dir); T.calm(); const d = G.map.doors[gy * G.map.w + gx];
          for (const o of [0, 0.25, 0.6, 0.9]) { d.open = d.target = o; Engine.render(G.ents.filter(e => !e._decor), G.tod); out.frames.push(id + '@' + o + ':' + T.frameHash()); }
          d.open = d.target = 0;
        }
        T.look('oakhaven', 23.5, 2.2, -Math.PI / 2); G.keys = {}; interact(); T.adv(1500);
        // the run clock and statistics counters (js/playtools.js) tick on their own; they are not gate state
        const gateFlags = {}; for (const k in G.flags) if (!/^p7[st]_/.test(k)) gateFlags[k] = G.flags[k];
        out.state = JSON.stringify({ map: G.mapId, flags: gateFlags, doors: Object.keys(G.maps.oakhaven.doors).filter(k => G.maps.oakhaven.doors[k].open > 0) });
        return out;
      };
      // each variant gets its own fresh page so the first run starts from the same state
      const run = async (blocked, gateAnims) => {
        const X = await boot(browser, blocked); await X.page.evaluate(HELPERS);
        if (gateAnims === false) await X.page.evaluate(() => { GFX.gateAnims = false; });
        const out = await X.page.evaluate(script); out.errors = X.errors; await X.page.close(); return out;
      };
      const base = await run(true), off = await run(false, false), on = await run(false, true);
      const A = { errors: base.errors, page: { close: async () => {} } };
      ok(JSON.stringify(off.frames) === JSON.stringify(base.frames), `gateAnims off: ${off.frames.length} frames identical to a build without gates.js` + off.frames.map((f, i) => f === base.frames[i] ? '' : ' differs:' + i).join(''));
      ok(off.state === base.state, 'gateAnims off: game state after interacting with a gate is identical to a build without gates.js');
      const diff = on.frames.filter((f, i) => f !== base.frames[i]).length;
      ok(diff >= 6 && on.frames.length === 12, `gateAnims on changes the gate frames (${diff} of 12 differ)`);
      ok(A.errors.length === 0, 'baseline page without gates.js has no page errors');
      await A.page.close();
    }

    // ---------------------------------------------------------------- 6. the Quarry cave-in
    {
      const p = await E(() => {
        const m = G.maps.quarry, pl = GATES.planOf(m);
        const again = buildAllMaps().quarry._gPlan;
        const room = m.named.shaft;
        return {
          n: pl.cells.length, same: JSON.stringify(pl.cells) === JSON.stringify(again.cells),
          inRoom: pl.cells.every(([x, y]) => x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h),
          cells: pl.cells.map(c => c.slice(0, 2)), room: [room.x, room.y, room.w, room.h],
          arrival: [Math.floor(m.shaftReturn.x), Math.floor(m.shaftReturn.y)],
        };
      });
      ok(p.n >= 4 && p.same && p.inRoom, `cave-in plan is deterministic, inside the shaft room and non-trivial (${p.n} cells): ${JSON.stringify(p.cells)}`);
      ok(!p.cells.some(c => c[0] === p.arrival[0] && c[1] === p.arrival[1]), 'the arrival cell at the shaft gate stays clear');

      // reachability: independent flood fill before and after, plus every prefix of the plan
      const rc = await E(() => {
        const m = G.maps.quarry, pl = GATES.planOf(m), sp = [Math.floor(m.spawn.x), Math.floor(m.spawn.y)];
        const needs = T.needs(m), before = T.reach(m, sp[0], sp[1]);
        const baseReach = needs.map(t => !!before[t.y * m.w + t.x]);
        const out = { needs: needs.length, baseReach: baseReach.filter(Boolean).length, lost: [], prefixLost: 0 };
        // every prefix of the chosen cells
        const saved = pl.cells.map(([x, y]) => [y * m.w + x, m.cells[y * m.w + x]]);
        for (let k = 1; k <= saved.length; k++) {
          saved.slice(0, k).forEach(([ci]) => { m.cells[ci] = { tex: 'gates_rubble', rubble: true }; });
          const s = T.reach(m, sp[0], sp[1]);
          needs.forEach((t, i) => { if (baseReach[i] && !s[t.y * m.w + t.x]) out.prefixLost++; });
          saved.slice(0, k).forEach(([ci, c]) => { m.cells[ci] = c; });
        }
        // full application through the module
        G.flags[GATES.FLAG] = true; GATES.ensureApplied(m);
        const after = T.reach(m, sp[0], sp[1]);
        needs.forEach((t, i) => { if (baseReach[i] && !after[t.y * m.w + t.x]) out.lost.push(t.why); });
        // every exit also reaches every other exit, not just the spawn (walk from the shaft gate front)
        const gf = [Math.floor(m.shaftReturn.x), Math.floor(m.shaftReturn.y) + 1], fromGate = T.reach(m, gf[0], gf[1]);
        out.gateFrontReaches = needs.every((t, i) => !baseReach[i] || fromGate[t.y * m.w + t.x]);
        out.rubble = T.rubble(m).length;
        GATES.revertPlan(m); delete G.flags[GATES.FLAG];
        return out;
      });
      ok(rc.baseReach >= 10 && rc.lost.length === 0 && rc.prefixLost === 0, `flood fill: all ${rc.baseReach} reachable targets (exits, portals, NPCs, items, props) stay reachable after the cave-in and after every prefix of it`);
      ok(rc.gateFrontReaches && rc.rubble === p.n, 'the shaft gate still reaches every target; the rubble in the map matches the plan');

      // story trigger, safe recovery, shake
      const st = await E(() => {
        const out = {}; const m = G.maps.quarry;
        G.flags.bore_broken = true; delete G.flags[GATES.FLAG];
        loadMap('quarry', m.shaftReturn); T.freeze(); T.calm(); G.state = 'play';
        const before = T.cellsSig(m);
        T.adv(600); out.idleEarly = GATES.cave.phase; // grace period
        T.adv(1000); out.phase1 = GATES.cave.phase; out.flagBefore = !!G.flags[GATES.FLAG]; out.cellsDuring = T.cellsSig(m) === before;
        // while the roof groans: put the player, a companion-like NPC, an enemy and loot into the pile
        const pl = GATES.planOf(m); const [cx, cy] = pl.cells[0], [dx, dy] = pl.cells[1], [ex, ey] = pl.cells[2];
        Engine.cam.x = cx + 0.5; Engine.cam.y = cy + 0.5;
        const npc = hydrate({ kind: 'npc', id: 'hollow', name: 'Test NPC', sprite: 'hollow', x: dx + 0.5, y: dy + 0.5, solid: true, radius: 0.3, transient: true }); G.ents.push(npc);
        const en = hydrate({ kind: 'enemy', type: 'mites', x: ex + 0.5, y: ey + 0.5 }); en.transient = true; en.hidden = false; en.dead = false; G.ents.push(en);
        const loot = hydrate({ kind: 'item', item: 'tonic', x: ex + 0.4, y: ey + 0.6, sprite: ITEMS.tonic.sprite, transient: true }); G.ents.push(loot);
        const hp0 = G.player.hp; FEEL.state.shake = 0;
        T.adv(2400); // past the commit
        out.phase2 = GATES.cave.phase; out.flagAfter = !!G.flags[GATES.FLAG]; out.shake = FEEL.state.shake;
        out.rubble = T.rubble(m).length; out.planned = pl.cells.length;
        out.playerFree = !GATES.overlapsRubble(m, Engine.cam.x, Engine.cam.y, 0.3) && !solidAt(Engine.cam.x, Engine.cam.y, null);
        out.playerMoved = Math.hypot(Engine.cam.x - (cx + 0.5), Engine.cam.y - (cy + 0.5));
        const sp = [Math.floor(m.spawn.x), Math.floor(m.spawn.y)], reach = T.reach(m, sp[0], sp[1]);
        const inReach = o => reach[Math.floor(o.y) * m.w + Math.floor(o.x)] === 1;
        out.npcFree = !GATES.overlapsRubble(m, npc.x, npc.y, 0.3) && inReach(npc);
        out.enemyFree = !GATES.overlapsRubble(m, en.x, en.y, 0.3) && inReach(en);
        out.lootFree = !GATES.overlapsRubble(m, loot.x, loot.y, 0.3) && inReach(loot);
        out.playerReach = inReach(Engine.cam); out.moved = GATES.moved.map(x => x.what);
        out.hpSame = G.player.hp >= hp0 - 0.01;
        out.rising = T.rubble(m).every(ci => m.cells[ci].top < m.cells[ci]._gground + GATES.RUBBLE_H);
        T.adv(2500); out.settled = T.rubble(m).every(ci => { const c = m.cells[ci]; return Math.abs(c.top - (c._gground + GATES.RUBBLE_H)) < 1e-6; });
        out.phase3 = GATES.cave.phase; out.once = T.rubble(m).length === out.planned;
        out.hum = Audio_.hums['gates_cavein'] || 0;
        out.tall = m.relief && m.maxTop >= m.ceilZ;
        out.sig = T.cellsSig(m);
        return out;
      });
      ok(st.idleEarly === 'idle' && st.phase1 === 'warn' && st.flagBefore === false && st.cellsDuring, 'after the bore breaks and you are back in the Quarry: a short grace, then the roof groans (warn) with the map and flag untouched until it falls');
      ok(st.phase2 === 'settle' && st.flagAfter && st.rubble === st.planned && st.rising && st.settled, `the roof falls: ${st.rubble} rubble cells that pile up to their full height, flag gates_quarry_cavein recorded`);
      ok(st.shake > 0, 'the fall shakes the view through FEEL.heavyHit');
      ok(st.playerFree && st.playerMoved > 0.2 && st.playerReach, 'the player standing in the pile is moved to a free spot that is reachable from the Quarry spawn');
      ok(st.npcFree && st.enemyFree && st.lootFree, 'an NPC, an enemy and loot inside the pile are moved out to reachable ground: ' + JSON.stringify(st.moved));
      ok(st.phase3 === 'idle' && st.once, 'the effect ends by itself and runs once');

      // save / load
      const sl = await E(() => {
        const out = {}; const m = G.maps.quarry; const sigBefore = T.cellsSig(m);
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        out.flagSaved = !!snap.flags[GATES.FLAG];
        restoreGame(snap); T.freeze(); T.calm();
        const m2 = G.maps.quarry; out.newMap = m2 !== m; out.sameCells = T.cellsSig(m2) === sigBefore; out.mapId = G.mapId;
        const sp = [Math.floor(m2.spawn.x), Math.floor(m2.spawn.y)], reach = T.reach(m2, sp[0], sp[1]);
        out.needsLost = T.needs(m2).filter(t => !reach[t.y * m2.w + t.x]).length;
        // saved elsewhere, travelling back by the shaft: lands clear of the rubble
        loadMap('oakhaven', G.maps.oakhaven.spawn); const rubbleHidden = true;
        transfer({ map: 'quarry', useSpawn: 'shaft' }); T.calm();
        out.arrive = G.mapId; out.arriveFree = !GATES.overlapsRubble(G.map, Engine.cam.x, Engine.cam.y, 0.3) && !solidAt(Engine.cam.x, Engine.cam.y, null);
        out.rubbleKept = T.rubble(G.map).length;
        // rest / passHours does not undo it
        passHours(3); out.afterRest = T.rubble(G.map).length;
        // a save made mid-warning has no rubble and plays it again once
        delete G.flags[GATES.FLAG]; GATES.revertPlan(G.map); loadMap('quarry', G.map.shaftReturn); T.calm(); T.adv(1800);
        out.warn = GATES.cave.phase; const mid = JSON.parse(JSON.stringify(snapshotGame()));
        out.midFlag = !!mid.flags[GATES.FLAG];
        restoreGame(mid); T.freeze(); T.calm(); out.midRubble = T.rubble(G.map).length; T.adv(1600); out.midWarn = GATES.cave.phase; T.adv(2600); out.midRubbleAfter = T.rubble(G.map).length; out.midFlagAfter = !!G.flags[GATES.FLAG];
        return out;
      });
      ok(sl.flagSaved && sl.newMap && sl.sameCells && sl.mapId === 'quarry' && sl.needsLost === 0, 'save then load rebuilds the Quarry with the identical rubble and every target still reachable');
      ok(sl.arrive === 'quarry' && sl.arriveFree && sl.rubbleKept >= 4 && sl.afterRest === sl.rubbleKept, 'travelling back down the shaft after the fall lands on free ground; resting keeps the rubble');
      ok(sl.warn === 'warn' && !sl.midFlag && sl.midRubble === 0 && sl.midWarn === 'warn' && sl.midRubbleAfter >= 4 && sl.midFlagAfter, 'a save taken mid-warning reloads without rubble and the fall then happens once, after the grace');

      // switches
      const sw = await E(() => {
        const out = {}; const m = G.maps.quarry;
        // collapses off: nothing happens, no flag, cells identical to the pristine map
        delete G.flags[GATES.FLAG]; GATES.revertPlan(m); GFX.collapses = false; const sig0 = T.cellsSig(m);
        loadMap('quarry', m.shaftReturn); T.freeze(); T.calm(); G.flags.bore_broken = true; T.adv(6000);
        out.offPhase = GATES.cave.phase; out.offFlag = !!G.flags[GATES.FLAG]; out.offSame = T.cellsSig(m) === sig0; out.offKeys = Object.keys(G.flags).filter(k => /gates/.test(k)).length;
        // applied, then switched off: reverts; switched on: back at the next entry
        GFX.collapses = true; T.adv(6000); out.onRubble = T.rubble(m).length;
        GFX.collapses = false; Engine.render(G.ents, G.tod); out.revert = T.rubble(m).length === 0 && T.cellsSig(m) === sig0;
        GFX.collapses = true; loadMap('quarry', m.shaftReturn); T.calm(); out.reapply = T.rubble(m).length === out.onRubble;
        // bore not broken: never
        delete G.flags.bore_broken; delete G.flags[GATES.FLAG]; GATES.revertPlan(m); loadMap('quarry', m.shaftReturn); T.calm(); T.adv(8000); out.neverBroken = GATES.cave.phase === 'idle' && T.rubble(m).length === 0;
        // reduced motion: no shake, still falls
        G.flags.bore_broken = true; GFX.reduceMotion = true; FEEL.state.shake = 0; loadMap('quarry', m.shaftReturn); T.calm(); T.adv(5000);
        out.rmShake = FEEL.state.shake; out.rmRubble = T.rubble(m).length; GFX.reduceMotion = false;
        return out;
      });
      ok(sw.offPhase === 'idle' && !sw.offFlag && sw.offSame && sw.offKeys === 0, 'GFX.collapses = false: nothing falls, no flag is written, the map is identical to the original');
      ok(sw.onRubble >= 4 && sw.revert && sw.reapply, 'switching collapses off reverts the rubble; switching on restores it from the saved flag');
      ok(sw.neverBroken, 'without bore_broken the cave-in never starts');
      ok(sw.rmShake === 0 && sw.rmRubble >= 4, 'reduced motion: the stone still falls but nothing shakes');
    }

    // ---------------------------------------------------------------- 7. cost and pictures
    {
      const c = await E(() => {
        G.flags.gate_open = true; T.look('oakhaven', 23.5, 3.4, -Math.PI / 2); T.calm(); const d = G.map.doors[23]; d.open = d.target = 0.4; Engine.render(G.ents, G.tod);
        const F = { }; let fi = null; Engine.addPostHook(f => { fi = f; }, 999); Engine.render(G.ents, G.tod);
        const med = fn => { const a = []; for (let i = 0; i < 200; i++) { const t0 = __pn(); fn(); a.push(__pn() - t0); } a.sort((x, y) => x - y); return a[a.length >> 1]; };
        const gate = med(() => GATES.drawGates(fi)), px = GATES.hook.px;
        d.open = d.target = 0;
        const m = G.maps.quarry; delete G.flags[GATES.FLAG]; GATES.revertPlan(m); G.flags.bore_broken = true; loadMap('quarry', { x: 20.5, y: 9.6, dir: Math.PI / 2 }); T.calm(); T.adv(1800); Engine.render(G.ents, G.tod);
        const warn = med(() => GATES.drawCave(fi));
        return { gate, warn, phase: GATES.cave.phase, px };
      });
      log(`INFO frame cost (median of 200 calls): drawGates ${c.gate.toFixed(3)} ms with a gate half open (${c.px} px), drawCave ${c.warn.toFixed(3)} ms in the warn phase (${c.phase})`);
      ok(c.gate < 3 && c.warn < 6, 'per-frame work stays small');
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        const shot = async (name) => { const box = await page.locator('canvas').first().boundingBox(); await page.screenshot({ path: path.join(SHOTS, name), clip: box }); };
        for (const o of [0, 0.3, 0.6]) { await E((o) => { G.flags.gate_open = true; T.look('oakhaven', 23.5, 3.4, -Math.PI / 2); const d = G.map.doors[23]; d.open = d.target = o; Engine.render(G.ents, G.tod); }, o); await shot(`gate-${o}.png`); }
        await E(() => { const m = G.maps.quarry; delete G.flags[GATES.FLAG]; GATES.revertPlan(m); G.flags.bore_broken = true; loadMap('quarry', { x: 20.5, y: 9.6, dir: Math.PI / 2 }); T.freeze(); T.calm(); });
        await E(() => { T.adv(1900); }); await shot('cavein-warn.png');
        await E(() => { T.adv(2000); }); await shot('cavein-fall.png');
        await E(() => { T.adv(3000); }); await shot('cavein-after.png');
      }
    }

    ok(errors.length === 0, 'no page errors or gates warnings: ' + errors.join(' | '));
    await page.close();
    log(`ALL PASS (${n} checks)`);
  } catch (e) {
    console.error('FAIL', e.message); process.exitCode = 1;
  } finally { await browser.close(); }
})();
