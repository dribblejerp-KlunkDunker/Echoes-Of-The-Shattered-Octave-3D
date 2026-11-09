// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/doors.test.js
// Swinging doors (flat and relief renderers), lifting chest lids, pulled levers.
// Uses the managed preview; never starts a server or writes player saves.
// SHOT_DIR=<dir> also writes the door / chest / lever screenshots there.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';

// The two door branches of engine.js as they are in the working tree, and as they were
// before swinging doors. The baseline page runs the engine with the swing blocks cut out,
// so "swingDoors off" can be compared byte for byte against the old sliding renderer.
const SWING_FLAT = `            if (openAmt > 0 && typeof Doors !== 'undefined') {
              // swinging leaf (Doors.swing is 0 when GFX.swingDoors is off or the doorway is unclear)
              const sw = Doors.swing(d, mapX, mapY, cam.x, cam.y, rdx, rdy, grid, mw);
              if (sw === 1) continue;
              if (sw === 2) { faces.push({ dist: Doors.out.t, wallX: Doors.out.u, base: cellLvl, top: cellLvl + 1, side: Doors.out.side, rdx, rdy, tex: c.tex, ci: mapY * mw + mapX }); break; }
            }
`;
function stripSwing(src) {
  if (!src.includes(SWING_FLAT)) return null;
  let s = src.replace(SWING_FLAT, '');
  const a = s.indexOf('let tD, frac, hit = true, dSide = side;');
  const b = s.indexOf('if (hit && frac >= openAmt) {', a);
  if (a < 0 || b < 0) return null;
  s = s.slice(0, a) + `let tD, frac, hit = true;
              if (side === 0) { tD = tIn + ddx * 0.5; const hy = CY + tD * rdy; if ((hy | 0) !== cy) hit = false; frac = hy - cy; }
              else { tD = tIn + ddy * 0.5; const hx = CX + tD * rdx; if ((hx | 0) !== cx) hit = false; frac = hx - cx; }
              ` + s.slice(b);
  return s.split('dSide').join('side');
}

async function boot(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  if (route) await page.route('**/js/engine.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: route }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof Doors !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Door Tester');
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

// shared in-page helpers (installed on window so every evaluate can use them)
const HELPERS = () => {
  window.T = {
    freeze() {
      Engine.setWeather({}); PARTICLES.list = []; ANIM.dt = 0; ANIM.T = 3; Engine.setTime(3);
      Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      G.state = 'play'; G.fadeT = 0; G.tod = 0.45; Engine.setFlicker(1); Engine.cam.pitch = 0; Engine.cam.bob = 0;
      if (typeof PRESETS !== 'undefined') { PRESETS.apply('original'); }
      // The live game loop keeps animating between page.evaluate calls, so flame glow and figure poses are
      // whatever its last frame left. Recompute them at the frozen time so two pages render the same moment.
      for (const e of G.ents) { try { if (e.kind === 'deco') animDeco(e, 0, 3, G.map.outdoor); else animCreature(e, 0, 3); } catch (err) { /* a figure that cannot animate keeps its pose */ } }
    },
    // camera two cells off a door, on whichever side is open, looking at it
    look(mapId, mx, my, open, dist) {
      loadMap(mapId, { x: mx + 0.5, y: my + 0.5, dir: 0 });
      T.freeze();
      const m = G.map, ci = my * m.w + mx, d = m.doors[ci], c = m.cells[ci];
      const or = Doors.orient(d, m.cells, m.w, ci);
      const spots = or === 1 ? [[mx + 0.5 - dist, my + 0.5, 0], [mx + 0.5 + dist, my + 0.5, Math.PI]] : [[mx + 0.5, my + 0.5 - dist, Math.PI / 2], [mx + 0.5, my + 0.5 + dist, -Math.PI / 2]];
      const sp = spots.find(s => !m.isSolidCell(s[0] | 0, s[1] | 0)) || spots[0];
      Object.assign(Engine.cam, { x: sp[0], y: sp[1], dir: sp[2] });
      d.open = d.target = open; d._sw = 0;
      Engine.render(G.ents, G.tod);
      return { d, or, ci, c, m };
    },
    // independent analytic ray / leaf intersection (cross-product segment test)
    leafHit(d, or, mx, my, cx, cy, rdx, rdy) {
      const th = d.open * Math.PI / 2, hg = d._hg || 0, s = d._sw || 1, line = !!window.__line;   // closed doors never set a hinge: the leaf is the whole plane either way
      let H, L;
      if (or === 1) { H = [mx + 0.5, my + hg]; L = [s * Math.sin(th), (hg ? -1 : 1) * Math.cos(th)]; }
      else { H = [mx + hg, my + 0.5]; L = [(hg ? -1 : 1) * Math.cos(th), s * Math.sin(th)]; }
      const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
      const R = [rdx, rdy], den = cross(R, L); if (Math.abs(den) < 1e-9) return null;
      const P = [H[0] - cx, H[1] - cy];
      const t = cross(P, L) / den, u = cross(P, R) / den;
      if (t <= 0.01) return null;
      const px = cx + t * rdx, py = cy + t * rdy, inCell = px >= mx - 0.02 && px <= mx + 1.02 && py >= my - 0.02 && py <= my + 1.02;
      if (line) return { t, u, inCell };
      if (u < 0 || u > 1) return null;
      if (px < mx - 1e-4 || px > mx + 1 + 1e-4 || py < my - 1e-4 || py > my + 1 + 1e-4) return null;
      return { t, u };
    },
    // compare every column of the last frame with the analytic leaf; returns stats
    columns(info, mx, my) {
      const cam = Engine.cam, dx = Math.cos(cam.dir), dy = Math.sin(cam.dir), px = -dy * 0.66, py = dx * 0.66, w = Engine.VW;
      const st = { hit: 0, miss: 0, bad: 0, worst: 0, spanMin: 1e9, spanMax: -1, firstBad: null };
      for (let x = 0; x < w; x++) {
        const k = 2 * x / w - 1, rdx = dx + px * k, rdy = dy + py * k;
        const h = T.leafHit(info.d, info.or, mx, my, cam.x, cam.y, rdx, rdy), depth = Engine.depthAt(x, 75);
        if (h) {
          st.hit++; st.spanMin = Math.min(st.spanMin, x); st.spanMax = Math.max(st.spanMax, x);
          const err = Math.abs(depth - h.t); st.worst = Math.max(st.worst, err);
          if (err > 0.03) { st.bad++; if (!st.firstBad) st.firstBad = { x, depth, t: h.t }; }
        } else {
          st.miss++;
          // a ray that misses the leaf must not land on the leaf's line either: it sees something else
          window.__line = true; const ln = T.leafHit(info.d, info.or, mx, my, cam.x, cam.y, rdx, rdy); window.__line = false;
          if (ln && ln.inCell && (ln.u < -0.02 || ln.u > 1.02) && Math.abs(depth - ln.t) < 0.002) { st.bad++; if (!st.firstBad) st.firstBad = { x, miss: true, depth, ln }; }
        }
      }
      return st;
    },
    hash(rows) { Engine.render(G.ents, G.tod); let h = 0; const d = Engine.ctx.getImageData(0, 0, 320, rows || 150).data; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + (d[i + 1] << 8) + (d[i + 2] << 16)) | 0; return h; },
    shot() { return Engine.canvas.toDataURL('image/png'); },
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(HELPERS);

    // ---------------------------------------------------------------- 1. analytic swing, both renderers
    const cases = [
      ['flat', 'tavern', 3, 9, 1.8],
      ['relief', 'oakhaven', 6, 7, 1.8],
      ['relief', 'quarry', 13, 11, 1.8],
      ['relief', 'belfry', 0, 5, 1.8],
    ];
    const shots = {};
    for (const [kind, mapId, mx, my, dist] of cases) {
      const r = await page.evaluate(([mapId, mx, my, dist]) => {
        const out = { opens: {} };
        for (const open of [0, 0.25, 0.5, 0.75, 1]) {
          const info = T.look(mapId, mx, my, open, dist);
          const shot = T.shot();                      // the real frame, scenery and all
          // The analytic model covers the leaf alone, and sprites legitimately occlude it:
          // with the standing eye at 0.88 the horizon row now passes through hanging decor
          // (Oakhaven’s reed lintel) and townsfolk. Measure the leaf with sprites hidden;
          // the kept shot above is still the honest frame.
          for (const e of G.ents) e.hidden = true;
          Engine.render(G.ents, G.tod);
          const st = T.columns(info, mx, my);
          const cx = Engine.cam.x, cy = Engine.cam.y;
          // the sample columns in the middle of the screen, for the "blocks the view" / "passes through" checks
          const mid = Engine.depthAt(160, 75), planeDepth = info.or === 1 ? Math.abs(mx + 0.5 - cx) : Math.abs(my + 0.5 - cy);
          for (const e of G.ents) e.hidden = false;
          out.opens[open] = Object.assign(st, { mid, planeDepth, or: info.or, hg: info.d._hg, sw: info.d._sw });
          out.opens[open].shot = shot;
        }
        return out;
      }, [mapId, mx, my, dist]);
      const o = r.opens;
      for (const open of [0.25, 0.5, 0.75]) {
        assert.ok(o[open].hit > 4, `${mapId}: leaf has width at open=${open} (${o[open].hit} columns)`);
        assert.equal(o[open].bad, 0, `${mapId}: every column matches the analytic leaf at open=${open} (worst error ${o[open].worst.toFixed(4)}, first bad ${JSON.stringify(o[open].firstBad)})`);
        assert.ok(o[open].worst < 0.03, `${mapId}: depth within 0.03 of analytic at open=${open}`);
      }
      // closed: the doorway is a wall; centre column is the door plane itself
      assert.ok(Math.abs(o[0].mid - o[0].planeDepth) < 0.03, `${mapId}: closed door blocks at the plane (${o[0].mid} vs ${o[0].planeDepth})`);
      // half open: the leaf is no longer across the middle of the view; the leaf spans fewer columns than closed
      assert.ok(o[0.5].hit < o[0].hit, `${mapId}: half-open leaf covers fewer columns than a closed door`);
      assert.ok(o[0.5].hit < o[0.25].hit || o[0.5].hit < o[0].hit, `${mapId}: leaf narrows as it swings`);
      // fully open: you see through, the view runs past the door plane
      assert.ok(o[1].mid > o[1].planeDepth + 0.4, `${mapId}: fully open door passes the view through (${o[1].mid} past ${o[1].planeDepth})`);
      shots[mapId] = [0, 0.25, 0.5, 0.75, 1].map(k => o[k].shot);
      console.log(`PASS ${kind} path ${mapId} door ${mx},${my}: leaf columns ${[0, 0.25, 0.5, 0.75, 1].map(k => o[k].hit).join('/')} for open 0/.25/.5/.75/1, worst depth error ${Math.max(...[0.25, 0.5, 0.75].map(k => o[k].worst)).toFixed(4)}, hinge ${o[0.5].hg} swing ${o[0.5].sw}`);
    }

    // swing side: away from the viewer, from either side
    const side = await page.evaluate(() => {
      const r = {};
      for (const dist of [1.8, -1.8]) {
        loadMap('tavern', { x: 3.5, y: 9.5, dir: 0 }); T.freeze();
        const d = G.map.doors[9 * G.map.w + 3]; d._sw = 0;
        Object.assign(Engine.cam, { x: 3.5, y: 9.5 + dist, dir: dist > 0 ? -Math.PI / 2 : Math.PI / 2 });
        d.open = d.target = 0.6; Engine.render(G.ents, G.tod);
        r[dist] = d._sw;
      }
      return r;
    });
    assert.equal(side[1.8], -1, 'viewer on the +y side: the door swings toward -y, away from them');
    assert.equal(side[-1.8], 1, 'viewer on the -y side: the door swings toward +y, away from them');
    console.log('PASS swing side is away from the viewer who opens it:', JSON.stringify(side));

    // ---------------------------------------------------------------- 2. collision, portals, saves unchanged
    const gameplay = await page.evaluate(() => {
      const r = {};
      for (const flag of [true, false]) {
        GFX.swingDoors = flag;
        loadMap('tavern', { x: 5.5, y: 9.5, dir: 0 }); T.freeze();
        const m = G.map, d = m.doors[9 * m.w + 3];
        const sol = [0, 0.3, 0.7, 0.71, 1].map(o => { d.open = o; return m.isSolidCell(3, 9); });
        r['solid' + flag] = sol.join();
        d.open = d.target = 0; Engine.cam.x = 3.5; Engine.cam.y = 8.6; for (let i = 0; i < 6; i++) playerMove(Engine.cam, 0, 0.1); r['blocked' + flag] = Engine.cam.y < 9.0;
        d.open = d.target = 1; Engine.cam.x = 3.5; Engine.cam.y = 8.6; for (let i = 0; i < 18; i++) playerMove(Engine.cam, 0, 0.1); r['through' + flag] = Engine.cam.y > 10;
        // portal door: the real interact() path
        loadMap('tavern', { x: 8.5, y: 10.4, dir: Math.PI / 2 }); T.freeze(); Object.assign(Engine.cam, { x: 8.5, y: 10.2, dir: Math.PI / 2 });
        render(); interact(); r['portal' + flag] = G.mapId;
        // plain door toggles
        loadMap('tavern', { x: 3.5, y: 9.5, dir: 0 }); T.freeze(); Object.assign(Engine.cam, { x: 3.5, y: 8.3, dir: Math.PI / 2 }); G.map.doors[9 * G.map.w + 3].open = G.map.doors[9 * G.map.w + 3].target = 0;
        render(); interact(); r['toggle' + flag] = G.map.doors[9 * G.map.w + 3].target;
      }
      GFX.swingDoors = true;
      // nothing the door code adds reaches the save
      const dd = G.map.doors[9 * G.map.w + 3]; dd.open = 0.5; dd.target = 1; Engine.cam.x = 4.5; Engine.render(G.ents, G.tod);
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      r.saved = JSON.stringify(snap.maps.tavern.doors);
      r.privateKeys = Object.keys(dd).filter(k => k[0] === '_').join();
      return r;
    });
    assert.equal(gameplay.solidtrue, gameplay.solidfalse, 'isSolidCell is identical with swinging doors on or off');
    assert.equal(gameplay.solidtrue, 'true,true,true,false,false', 'doors open at > 0.7 exactly as before');
    assert.equal(gameplay.blockedtrue && gameplay.blockedfalse, true, 'a closed door still blocks movement');
    assert.equal(gameplay.throughtrue && gameplay.throughfalse, true, 'an open door can still be walked through');
    assert.equal(gameplay.portaltrue, 'oakhaven', 'a portal door still transfers');
    assert.equal(gameplay.portalfalse, 'oakhaven', 'a portal door still transfers (swing off)');
    assert.equal(gameplay.toggletrue, 1, 'a plain door still opens when used');
    const doorKey = await page.evaluate(() => 9 * G.maps.tavern.w + 3);
    assert.equal(gameplay.saved, JSON.stringify({ [doorKey]: [0.5, 1] }), 'saved door state is still [open, target]');
    console.log('PASS collision, portals, locks and saved door state unchanged; private fields:', gameplay.privateKeys);

    // ---------------------------------------------------------------- 3. swingDoors off == the old sliding renderer, byte for byte
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'engine.js'), 'utf8');
    const baseline = stripSwing(src);
    assert.ok(baseline, 'the swing blocks are where the baseline expects them (regenerate stripSwing if engine.js door code moved)');
    const base = await boot(browser, baseline);
    await base.page.evaluate(HELPERS);
    // (oakhaven is left out here: its street is built with unseeded dice, so two fresh games never match pixel for pixel)
    const scenes = [['tavern', 3, 9], ['quarry', 13, 11], ['quarry', 34, 5], ['belfry', 0, 5], ['rootvault', 20, 5]];
    const frames = async (pg, swing) => pg.evaluate(([scenes, swing]) => {
      GFX.swingDoors = swing; const out = [];
      for (const [id, mx, my] of scenes) { T.look(id, mx, my, 0, 1.8); T.hash(); for (const open of [0, 0.3, 0.5, 0.9, 1]) { const info = T.look(id, mx, my, open, 1.8); T.hash(); out.push(T.hash()); info.d.open = info.d.target = 0; } }
      return out;
    }, [scenes, swing]);
    const off = await frames(page, false), old = await frames(base.page, true);
    assert.deepEqual(off, old, 'GFX.swingDoors = false renders frames identical to the original sliding renderer; differing frames: ' + off.map((h, i) => h === old[i] ? '.' : 'X').join(''));
    const on = await frames(page, true);
    const diff = on.filter((h, i) => h !== old[i]).length;
    assert.ok(diff >= scenes.length * 3, 'swinging doors actually change the half-open frames (' + diff + ' of ' + on.length + ' differ)');
    // Closed doors: compare swing on and off on the same page at the same moment. (Across two pages the live game
    // loop keeps running between calls, so smoke, routines and figure poses drift; off == original is proven above.)
    const closedPairs = await page.evaluate((scenes) => {
      const out = [];
      for (const [id, mx, my] of scenes) {
        GFX.swingDoors = true; T.look(id, mx, my, 0, 1.8); const a = T.hash();
        GFX.swingDoors = false; T.look(id, mx, my, 0, 1.8); const b = T.hash();
        out.push(a === b);
      }
      GFX.swingDoors = true; return out;
    }, scenes);
    assert.ok(closedPairs.every(Boolean), 'closed doors look the same either way (' + closedPairs.map(ok => ok ? '.' : 'X').join('') + ')');
    console.log(`PASS swingDoors off: ${off.length} frames byte-identical to the sliding renderer; on: ${diff} differ, closed doors identical`);
    assert.deepEqual(base.errors, [], 'no baseline page errors'); await base.page.close();

    // ---------------------------------------------------------------- 4. frame cost
    const cost = await page.evaluate(() => {
      const med = a => a.sort((x, y) => x - y)[a.length >> 1];
      const r = {};
      // slide and swing frames interleaved, so a loaded box hits both alike
      for (const [id, mx, my] of [['tavern', 3, 9], ['oakhaven', 6, 7]]) {
        const t = { slide: [], swing: [] };
        for (let i = 0; i < 120; i++) for (const swing of [false, true]) {
          GFX.swingDoors = swing; if (i === 0) T.look(id, mx, my, 0.5, 1.8);
          const a = performance.now(); Engine.render(G.ents, G.tod); t[swing ? 'swing' : 'slide'].push(performance.now() - a);
        }
        r[id + ' slide'] = +med(t.slide).toFixed(2); r[id + ' swing'] = +med(t.swing).toFixed(2);
      }
      GFX.swingDoors = true;
      const info = T.look('tavern', 3, 9, 0.5, 1.8), d = info.d, m = G.map, cam = Engine.cam, ts = [];
      for (let b = 0; b < 40; b++) { const a = performance.now(); for (let i = 0; i < 2000; i++) Doors.swing(d, 3, 9, cam.x, cam.y, 1, 0.2 + (i % 7) * 0.03, m.cells, m.w); ts.push((performance.now() - a) / 2000 * 1000); }
      r.swingCallUs = +med(ts).toFixed(3);
      return r;
    });
    console.log('Frame cost (ms per frame, median of 60; door in view at open=0.5):', JSON.stringify(cost));

    // ---------------------------------------------------------------- 5. chest lids
    const chest = await page.evaluate(() => {
      const r = {}, ok = (c, t) => { if (!c) throw new Error(t); };
      GFX.propAnims = true;
      // a strongbox in the Under-hedge (or any map that carries one)
      let id = null, e = null;
      for (const k in G.maps) { const f = G.maps[k].entities.find(x => x.kind === 'item' && x.item === 'cache' && !x.dead); if (f) { id = k; e = f; break; } }
      ok(e, 'a strongbox exists on some map'); r.map = id;
      loadMap(id, { x: e.x - 1.2, y: e.y, dir: 0 }); T.freeze(); G.player.attrs.Luck = 10;
      e = G.ents.find(x => x.kind === 'item' && x.item === 'cache' && !x.dead && x.sprite === 'chest');
      Object.assign(Engine.cam, { x: e.x - 1.3, y: e.y, dir: 0 });
      e.tier = 1; e.owner = null;
      const fr = Doors.chestFrames('chest'); ok(fr && fr.length === Doors.FRAMES, 'chest frames built');
      const base = Engine.sprites.chest;
      const sig = sp => { let h = 0; for (let i = 0; i < sp.data.length; i++) h = (Math.imul(h, 31) + sp.data[i]) | 0; return h; };
      r.frameSigs = fr.map(sig); r.distinct = new Set(r.frameSigs).size;
      ok(sig(fr[Doors.FRAMES - 1]) === sig(base), 'the last frame is the original open-chest art');
      ok(sig(fr[0]) !== sig(base), 'the first frame is a closed chest, not the open art');
      ok(fr.every(s => s.w === base.w && s.h === base.h && s.hs === base.hs && s.cx === base.cx), 'frames keep the sprite geometry');
      Engine.render(G.ents, G.tod); r.closedName = e.animSprite; ok(e.animSprite === 'chest~lid0', 'an unopened strongbox shows a closed lid');
      r.shotClosed = T.shot();
      pickUp(e); ok(e.dead && e.hidden, 'the strongbox is looted');
      // step the clock (real time is not waited for)
      const names = [];
      Engine.render(G.ents, G.tod);
      const comp = G.ents.find(x => x._doorsLid); ok(comp, 'a transient open-chest companion stands where the strongbox was');
      ok(comp.transient && comp.x === e.x && comp.y === e.y && !comp.solid, 'companion is transient, in place and not solid');
      names.push(comp.animSprite);
      for (let i = 0; i < 8; i++) { Doors.advance(0.06); Engine.render(G.ents, G.tod); names.push(comp.animSprite); if (i === 2) r.shotMid = T.shot(); }
      r.names = names;
      ok(names[0] === 'chest~lid0' || names[0] === 'chest~lid1', 'lid starts down');
      ok(names[names.length - 1] === 'chest~lid7', 'lid ends fully lifted');
      const idx = names.map(n => +n.slice(-1)); ok(idx.every((v, i) => i === 0 || v >= idx[i - 1]), 'lid only rises');
      r.shotOpen = T.shot();
      Doors.advance(3); Engine.render(G.ents, G.tod); ok(comp.animSprite === 'chest~lid7', 'the lid stays open');
      // save, restore: looted state is saved by the game, the open lid follows it
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(snap); G.state = 'play';
      T.freeze(); Engine.render(G.ents, G.tod);
      const comp2 = G.ents.find(x => x._doorsLid); ok(comp2, 'after restore the opened strongbox is still drawn open');
      ok(comp2.animSprite === 'chest~lid7', 'restored lid is open at once, no replay (' + comp2.animSprite + ')');
      r.restoredMap = G.mapId;
      // leaving and returning keeps it open
      loadMap('tavern', { x: 8.5, y: 10.5, dir: 0 }); loadMap(id, { x: e.x - 1.2, y: e.y, dir: 0 }); T.freeze(); Engine.render(G.ents, G.tod);
      ok(G.ents.filter(x => x._doorsLid).length === 1 && G.ents.find(x => x._doorsLid).animSprite === 'chest~lid7', 'revisiting the map keeps one open chest');
      // switch off: original art
      GFX.propAnims = false; Engine.render(G.ents, G.tod);
      ok(!G.ents.some(x => x.animSprite && /^chest~/.test(x.animSprite)), 'GFX.propAnims = false drops the lid frames');
      GFX.propAnims = true;
      return r;
    });
    console.log('PASS strongbox lid: closed on arrival, lifts over 0.4s, stays open, survives save/restore and map changes; frames', chest.names.join(' '), 'distinct art', chest.distinct + '/8');

    // evidence chest (prison)
    const evid = await page.evaluate(() => {
      const ok = (c, t) => { if (!c) throw new Error(t); }, r = {};
      loadMap('oakhaven', { x: 40.5, y: 8.5, dir: 0 }); G.state = 'play';
      G.player.inv = [{ id: 'coil', n: 1 }, { id: 'pass', n: 1 }, { id: 'tonic', n: 3 }];
      G.player.weapons = ['sword', 'pistol']; G.player.weapon = 0; G.player.armor = {}; G.player.pellets = 7; G.player.gold = 100; crimeState().bounty = 40;
      enterPrison(); ok(G.mapId === 'watchhouse' && crimeState().custody, 'in custody'); T.freeze();
      const e = G.ents.find(x => x.use === 'prison_evidence'); ok(e, 'evidence chest');
      Object.assign(Engine.cam, { x: 8.5, y: 4.5, dir: -Math.PI / 2 }); Engine.render(G.ents, G.tod);
      ok(e.animSprite === 'chest~lid0', 'the locked evidence chest is shut'); r.before = e.animSprite;
      G.map.doors[61].open = G.map.doors[61].target = 1;
      render(); interact();
      ok(G.openPanel === 'lockpick', 'using the chest in custody starts the lock UI');
      Doors.advance(1); Engine.render(G.ents, G.tod); ok(e.animSprite === 'chest~lid0', 'still shut while the lock is being picked');
      for (let pin = 0; pin < 3; pin++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      ok(!crimeState().evidence && G.count('tonic') === 3, 'belongings recovered');
      Engine.render(G.ents, G.tod); r.start = e.animSprite;
      Doors.advance(0.1); Engine.render(G.ents, G.tod); r.mid = e.animSprite;
      Doors.advance(1); Engine.render(G.ents, G.tod); r.end = e.animSprite;
      ok(r.end === 'chest~lid7', 'the evidence chest lid is up once the lock is picked');
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play'; T.freeze();
      const e2 = G.ents.find(x => x.use === 'prison_evidence'); Engine.render(G.ents, G.tod);
      ok(e2.animSprite === 'chest~lid7', 'the lid is up after save/restore (the picked-lock flag is saved)');
      return r;
    });
    console.log('PASS evidence chest: shut in custody, lid lifts when the lock is picked (' + evid.start + ' > ' + evid.mid + ' > ' + evid.end + '), open after restore');

    // ---------------------------------------------------------------- 6. levers
    const lever = await page.evaluate(() => {
      const ok = (c, t) => { if (!c) throw new Error(t); }, r = {};
      // Phase 20 draws the Chapel's bell-frame (horizon20 'belfryArt', on in every preset); the lever under it is what this tests
      const bf = GFX.belfryArt; if (typeof HORIZON20 !== 'undefined') { GFX.belfryArt = false; GFX.changed(); }
      let pl = null; for (const k in G.maps) { const f = G.maps[k].entities.find(x => x.sprite === 'lever' && x.use === 'plinth'); if (f) { pl = [k, f]; break; } }
      ok(pl, 'the bell-frame lever exists'); loadMap(pl[0], { x: pl[1].x, y: pl[1].y + 1.2, dir: 0 }); T.freeze();
      if (typeof HORIZON20 !== 'undefined') { GFX.belfryArt = false; GFX.changed(); }   // a visit re-applies the preset
      const lv = G.ents.find(x => x.sprite === 'lever' && x.use === 'plinth');
      Object.assign(Engine.cam, { x: lv.x, y: lv.y + 1.2, dir: -Math.PI / 2 });
      const fr = Doors.leverFrames('lever'); ok(fr && fr.length === Doors.FRAMES, 'lever frames built');
      const sig = sp => { let h = 0; for (let i = 0; i < sp.data.length; i++) h = (Math.imul(h, 31) + sp.data[i]) | 0; return h; };
      r.distinct = new Set(fr.map(sig)).size; ok(r.distinct === Doors.FRAMES, 'every lever frame is different (' + r.distinct + ')');
      ok(sig(fr[0]) === sig(Engine.sprites.lever), 'frame 0 is the original art');
      Engine.render(G.ents, G.tod); ok(!lv.animSprite, 'a lever at rest uses its own sprite');
      r.shotRest = T.shot();
      render(); interact();
      Engine.render(G.ents, G.tod); r.names = [lv.animSprite];
      for (let i = 0; i < 18; i++) { Doors.advance(0.05); Engine.render(G.ents, G.tod); r.names.push(lv.animSprite || 'rest'); if (i === 4) r.shotPulled = T.shot(); }
      closeModal(); G.state = 'play';
      ok(r.names.includes('lever~pull7'), 'the handle reaches full pull');
      ok(r.names[r.names.length - 1] === 'rest', 'and returns to rest after the pull');
      const pullMs = r.names.findIndex(n => n === 'lever~pull7') * 50; r.pullMs = pullMs; ok(pullMs <= 400, 'the pull takes about 0.3s');
      // a lever with no handler of its own (the chained sluice lever) still pulls
      let other = null; for (const k in G.maps) { const f = G.maps[k].entities.find(x => x.sprite === 'lever' && !x.use); if (f) { other = [k, f]; break; } }
      ok(other, 'an unused lever exists'); loadMap(other[0], { x: other[1].x, y: other[1].y, dir: 0 }); T.freeze();
      const lv2 = G.ents.find(x => x.sprite === 'lever' && !x.use);
      Object.assign(Engine.cam, { x: lv2.x - 1.0, y: lv2.y, dir: 0 }); Engine.render(G.ents, G.tod); interact(); Doors.advance(0.2); Engine.render(G.ents, G.tod);
      r.chained = lv2.animSprite; ok(/^lever~pull[1-7]$/.test(lv2.animSprite), 'a chained lever pulls too (' + lv2.animSprite + ')');
      if (typeof HORIZON20 !== 'undefined') { GFX.belfryArt = bf; GFX.changed(); }
      return r;
    });
    console.log('PASS levers pull: ' + lever.names.filter((n, i, a) => i === 0 || n !== a[i - 1]).join(' '));

    // ---------------------------------------------------------------- screenshots
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const write = (name, dataUrl) => fs.writeFileSync(path.join(SHOTS, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
      for (const id in shots) {
        const strip = await page.evaluate(async urls => {
          const c = document.createElement('canvas'); c.width = 320 * urls.length; c.height = 150; const x = c.getContext('2d');
          for (let i = 0; i < urls.length; i++) { const im = new Image(); im.src = urls[i]; await im.decode(); x.drawImage(im, 0, 0, 320, 150, i * 320, 0, 320, 150); }
          return c.toDataURL('image/png');
        }, shots[id]);
        write('door-sequence-' + id + '.png', strip);
      }
      const sprites = await page.evaluate(() => {
        const strip = (prefix, n) => { const c = document.createElement('canvas'); const b = Engine.sprites[prefix + '0'] || Engine.sprites[prefix.split('~')[0]]; c.width = b.w * n + 4 * (n - 1); c.height = b.h; const x = c.getContext('2d');
          for (let i = 0; i < n; i++) { const sp = Engine.sprites[prefix + i]; const id = new ImageData(new Uint8ClampedArray(sp.data.buffer.slice(0)), sp.w, sp.h); x.putImageData(id, i * (sp.w + 4), 0); } return c.toDataURL('image/png'); };
        return { lid: strip('chest~lid', 8), pull: strip('lever~pull', 8) };
      });
      write('chest-lid-frames.png', sprites.lid); write('lever-pull-frames.png', sprites.pull);
      write('chest-world-closed.png', chest.shotClosed); write('chest-world-mid.png', chest.shotMid); write('chest-world-open.png', chest.shotOpen);
      write('lever-world-rest.png', lever.shotRest); write('lever-world-pulled.png', lever.shotPulled);
      console.log('screenshots written to', SHOTS);
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
