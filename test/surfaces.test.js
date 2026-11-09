// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:PORT node test/surfaces.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers the surface layers: seeded wall decals (moss, cracks, scorch, posters,
// Synod notices), the close-range wall grain, and the painted ceilings (timber
// beams, the Cloister vault, cave rock): textures, deterministic placement,
// pixel effects and their exact-off switches, the memory budget, saves, frame
// cost and screenshots (SHOT_DIR, default the system temp dir).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'surfaces-shots');
(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Surface Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // Helpers live in the page so every check shares one definition.
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; };
      // a deterministic frame: no sprites, steady flicker and clock, no weather (clouds scroll with the wall clock), no drifting leaves
      window.grab = () => { Engine.setWeather({}); Engine.setFlicker(1); Engine.setTime(0); PARTICLES.mapId = G.mapId; PARTICLES.list = []; ANIM.dt = 0; ANIM.dirLast = Engine.cam.dir; Engine.render([], 0.5); return new Uint8ClampedArray(Engine.ctx.getImageData(0, 0, 320, 150).data); };
      window.diff = (a, b) => { const px = []; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) px.push(i >> 2); return px; };
      window.same = (a, b) => a.length === b.length && diff(a, b).length === 0;
      window.setFx = (o) => { GFX.plain(); Object.assign(GFX, o); GFX.changed(); };
      // stand `dist` cells in front of a wall cell carrying decal `dec`, looking at it
      window.faceDecal = (mapId, dec, dist) => {
        const m = G.maps[mapId], keys = Object.keys(m._decalsAll).map(Number).filter(i => !dec || m._decalsAll[i] === dec);
        for (const i of keys) {
          const x = i % m.w, y = (i / m.w) | 0;
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            if (m.get(x + dx, y + dy) === null && m.get(x + dx * 2, y + dy * 2) === null && m.get(x + dx * 3, y + dy * 3) === null) {
              return { x: x + 0.5 + dx * dist, y: y + 0.5 + dy * dist, dir: Math.atan2(-dy, -dx), cell: i, name: m._decalsAll[i] };
            }
          }
        }
        return null;
      };
      window.hideLife = () => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true; };
      hideLife(); G.tod = 0.5;
    });

    const result = await page.evaluate(() => {
      const out = {};
      const DEC = DECALS.textures, CEI = CEILINGS.textures;

      // --- textures: all registered, 64x64, decals are cut-outs ------------------
      check(DEC.length === 12 && ['d_moss1', 'd_moss2', 'd_moss3', 'd_crack1', 'd_crack2', 'd_scorch1', 'd_scorch2', 'd_poster1', 'd_poster2', 'd_poster3', 'd_synod1', 'd_synod2'].every(n => DEC.includes(n)), 'the twelve decal textures are listed');
      check(CEI.length === 3 && ['c_beams', 'c_vault', 'c_rock'].every(n => CEI.includes(n)), 'the three ceiling textures are listed');
      for (const n of DEC.concat(CEI)) {
        const t = Engine.textures[n];
        check(t instanceof Uint32Array && t.length === 64 * 64, n + ' is a 64x64 texture');
      }
      for (const n of DEC) {
        const t = Engine.textures[n]; let clear = 0, solid = 0, other = 0;
        for (let i = 0; i < t.length; i++) { const a = t[i] >>> 24; if (a === 0) clear++; else if (a === 255) solid++; else other++; }
        check(other === 0 && clear > 300 && solid > 100, n + ' is a cut-out: transparent outside, opaque inside (' + clear + '/' + solid + '/' + other + ')');
      }
      for (const n of CEI) { const t = Engine.textures[n]; let opaque = 0; for (let i = 0; i < t.length; i++) if ((t[i] >>> 24) === 255) opaque++; check(opaque === 4096, n + ' is fully opaque'); }
      const grain = DECALS.detail(); let gm = 0, gv = 0;
      check(grain instanceof Uint32Array && grain.length === 4096, 'the wall grain is a 64x64 texture');
      for (let i = 0; i < 4096; i++) gm += grain[i] & 255; gm /= 4096;
      for (let i = 0; i < 4096; i++) gv += ((grain[i] & 255) - gm) ** 2; gv = Math.sqrt(gv / 4096);
      check(gm > 110 && gm < 146 && gv > 15, 'the grain is centred grey with real variation (mean ' + gm.toFixed(1) + ', sd ' + gv.toFixed(1) + ')');
      out.grain = { mean: +gm.toFixed(1), sd: +gv.toFixed(1) };

      // --- memory budget -----------------------------------------------------------
      const bytes = DECALS.budgetBytes();
      check(bytes === (DEC.length + CEI.length + 1) * 64 * 64 * 4, 'the budget counts every generated texture exactly (' + bytes + ')');
      check(bytes < 512 * 1024, 'the budget is under 512 KB');
      out.budgetBytes = bytes;

      // --- GFX flags exist and join the plain() set ---------------------------------
      check(GFX.ceilings === true && GFX.FX.includes('ceilings') && GFX.FX.includes('decals') && GFX.FX.includes('detail'), 'GFX.ceilings joins GFX.FX; decals and detail are there');

      // --- deterministic placement, never on a door -----------------------------------
      const a = buildAllMaps(), b = buildAllMaps();
      let total = 0;
      for (const id in a) {
        check(JSON.stringify(a[id]._decalsAll) === JSON.stringify(b[id]._decalsAll), id + ' decals are identical across builds');
        check(JSON.stringify(a[id].cells) === JSON.stringify(b[id].cells), id + ' cells are identical across builds');
        const ca = a[id].ceilCells, cb = b[id].ceilCells;
        check((ca === null || ca === undefined) === (cb === null || cb === undefined) && (!ca || ca.every((v, i) => v === cb[i])), id + ' ceilings are identical across builds');
        const m = a[id];
        for (const k in m._decalsAll) {
          const c = m.cells[k]; total++;
          check(c && !c.door, id + ' cell ' + k + ' carries a decal on a solid non-door cell');
          check(DEC.includes(m._decalsAll[k]), id + ' uses a known decal');
          check(!m.doors[k], id + ' never decorates a door cell');
        }
        // scenery props and grass (js/scenery.js, js/flora.js) and _decor decorations are other modules' transient layers
        const own = list => list.filter(e => !e._scn && !e._flora && !e._decor), me = own(m.entities), them = own(b[id].entities);
        check(me.length === them.length && me.every((e, i) => !e.transient && e.kind === them[i].kind), id + ' entities are the same on every build and none is added by the surface layers');
      }
      out.decalCells = total;

      const count = (id, pat) => Object.values(G.maps[id]._decalsAll).filter(n => pat.test(n)).length;
      const oh = G.maps.oakhaven, cob = (x, y) => oh.floorTextures[oh.floorCells[y * oh.w + x]] === 't_cobble';
      let paper = 0, nearSynod = 0;
      for (const k in oh._decalsAll) {
        const n = oh._decalsAll[k], x = k % oh.w, y = (k / oh.w) | 0;
        if (/poster|synod/.test(n)) {
          paper++;
          check(['t_house', 't_wood', 't_marble', 't_stone'].includes(oh.cells[k]._p20bTex0 || oh.cells[k].tex), 'paper sits on a building wall');   // (js/painted20.js may have given the wall a painted front; the original is kept on the cell)
          check([[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => oh.get(x + dx, y + dy) === null && cob(x + dx, y + dy)), 'a poster or notice cell touches a cobble floor cell (' + x + ',' + y + ')');
          if (/synod/.test(n) && x >= 24 && x <= 54 && y <= 12) nearSynod++;
        }
      }
      check(paper >= 5 && count('oakhaven', /poster/) >= 2 && count('oakhaven', /synod/) >= 2, 'Oakhaven carries posters and Synod notices (' + paper + ')');
      check(nearSynod >= 2, 'Synod notices cluster near the Chapel and Greenhall (' + nearSynod + ')');
      out.oakhavenPaper = paper; out.synodNearChapel = nearSynod;
      check(count('quarry', /scorch/) >= 5, 'the quarry is scorched');
      for (const id of ['rootvault', 'catacombs', 'underhedge']) check(count(id, /scorch/) >= 2, id + ' is scorched');
      for (const id of ['clearing', 'deepwoods', 'oakhaven']) check(count(id, /moss/) >= 3 && G.maps[id].outdoor, id + ' carries moss');
      for (const id of ['catacombs', 'underhedge', 'rootvault']) check(count(id, /moss/) >= 1, id + ' (damp) carries moss');
      for (const id of ['cloister', 'mausoleum', 'belfry']) check(count(id, /crack/) >= 1, id + ' is cracked');
      // density: 5-12% of the wall cells that show a face to open ground (checked as a loose band)
      const dens = {};
      for (const id of ['oakhaven', 'clearing', 'deepwoods', 'quarry', 'rootvault', 'underhedge', 'catacombs', 'mausoleum', 'whispergrove']) {
        const m = G.maps[id]; let open = 0;
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.cells[y * m.w + x]; if (c && !c.door && [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => m.get(x + dx, y + dy) === null)) open++; }
        const d = Object.keys(m._decalsAll).length / open; dens[id] = +d.toFixed(3);
        check(d > 0.02 && d < 0.2, id + ' decal density is modest (' + d.toFixed(3) + ')');
      }
      out.density = dens;

      // --- the toggle follows GFX on every map, including rebuilt ones ---------------------
      setFx({ decals: true });
      check(Object.values(G.maps).every(m => m.decals === m._decalsAll), 'decals on: every map shows its marks');
      setFx({});
      check(Object.values(G.maps).every(m => m.decals === null), 'decals off: every map is clean');
      setFx({ decals: true });
      G.maps.oakhaven = buildOakhaven(true);   // the Greening rebuilds Oakhaven outside buildAllMaps
      go('oakhaven', 23.5, 20.5, -1.57);
      check(G.map.decals && G.map.decals === G.map._decalsAll && Object.keys(G.map.decals).length > 5, 'a rebuilt map is marked on entry');
      setFx({});
      check(G.map.decals === null, 'and cleaned when the switch goes off');
      G.maps = buildAllMaps();   // back to the ordinary world
      hideLife();

      // --- pixels: decals change wall pixels only; off is byte-identical ----------------------
      const f = faceDecal('oakhaven', 'd_synod1', 1.4) || faceDecal('oakhaven', null, 1.4);
      check(!!f, 'a decorated wall can be faced in Oakhaven');
      setFx({}); go('oakhaven', f.x, f.y, f.dir);
      const base = grab(), base2 = grab();
      check(same(base, base2), 'a plain frame is deterministic');
      setFx({ decals: true });
      const withDecals = grab(), dd = diff(base, withDecals);
      check(dd.length > 400, 'decals change the wall in view (' + dd.length + ' px)');
      check(dd.every(p => Engine.materialAt(p % 320, (p / 320) | 0) === Engine.MAT.wall), 'only wall pixels change');
      setFx({});
      check(same(base, grab()), 'decals off restores byte-identical pixels');
      out.decalPixels = dd.length;

      // --- the grain: changes only walls close to the camera -------------------------------------
      go('oakhaven', f.x, f.y, f.dir); setFx({});
      const g0 = grab(); setFx({ detail: true }); const g1 = grab(), gd = diff(g0, g1);
      check(gd.length > 300, 'the grain changes wall pixels near you (' + gd.length + ' px)');
      check(gd.every(p => { const x = p % 320, y = (p / 320) | 0; return Engine.materialAt(x, y) === Engine.MAT.wall && Engine.depthAt(x, y) < DECALS.detailDist + 0.01; }), 'the grain touches only walls within its range');
      setFx({});
      check(same(g0, grab()), 'grain off restores byte-identical pixels');
      go('oakhaven', 23.5, 20.5, -1.57);   // a long street: far walls must stay untouched
      const s0 = grab(); setFx({ detail: true }); const s1 = grab();
      check(diff(s0, s1).every(p => Engine.depthAt(p % 320, (p / 320) | 0) < DECALS.detailDist + 0.01), 'distant walls get no grain');
      setFx({});
      out.grainPixels = gd.length;

      // --- ceilings --------------------------------------------------------------------------------
      const ceilCase = (id, x, y, dir, minPx, tex) => {
        go(id, x, y, dir); setFx({});
        check(G.map.ceilCells === null && G.map.ceilTextures[1] === tex, id + ' is assigned ' + tex + ' with the switch off');
        const off = grab(); setFx({ ceilings: true });
        check(G.map.ceilCells && G.map.ceilCells.length === G.map.w * G.map.h && G.map.ceilTextures[0] === G.map.ceil, id + ' per-cell ceilings are on, keeping the original at index 0');
        const on = grab(), d = diff(off, on);
        check(d.length > minPx, id + ' ceiling pixels change (' + d.length + ' px)');
        check(d.every(p => Engine.materialAt(p % 320, (p / 320) | 0) === Engine.MAT.ceiling), id + ': only ceiling pixels change');
        setFx({});
        check(same(off, grab()), id + ': ceilings off restores byte-identical pixels');
        return d.length;
      };
      out.ceilPixels = {
        tavern: ceilCase('tavern', 8.5, 10.5, -Math.PI / 2, 800, 'c_beams'),
        cloister: ceilCase('cloister', 9.5, 13.4, -Math.PI / 2, 600, 'c_vault'),
        catacombs: ceilCase('catacombs', 2.6, 14.5, 0, 40, 'c_rock'),
        quarry: ceilCase('quarry', G.maps.quarry.spawn.x, G.maps.quarry.spawn.y, 0, 40, 'c_rock'),
      };
      for (const id of ['underhedge', 'rootvault']) check(G.maps[id].ceilTextures[1] === 'c_rock', id + ' gets rock');
      for (const id of ['lyra_house', 'surgery', 'mill', 'tannery', 'malting', 'belfry']) check(G.maps[id].ceilTextures[1] === 'c_beams', id + ' gets beams');
      check(G.maps.chapel.ceilTextures[1] === 'c_vault', 'the Chapel is vaulted');
      check(G.maps.oakhaven.ceilCells == null && G.maps.clearing.ceilCells == null && !G.maps.deepwoods.ceilTextures, 'open-sky maps are untouched');
      check(G.maps.mausoleum.ceilTextures === undefined || G.maps.mausoleum.ceilTextures === null, 'maps outside the brief keep their ceilings');
      // nothing structural moved
      // the ceilings module never changes a room's height: compare with the quarry as its builder made it
      const q = G.maps.quarry, qBuilt = buildQuarry(); check(q.ceilZ === qBuilt.ceilZ, 'ceilZ untouched');

      // --- saves: round trip in Oakhaven ---------------------------------------------------------------
      setFx({ decals: true, detail: true, ceilings: true });
      go('oakhaven', 23.5, 20.5, -1.57);
      const beforeKeys = JSON.stringify(G.map._decalsAll), nEnts = G.map.entities.length;
      const save = JSON.parse(JSON.stringify(snapshotGame()));
      go('tavern', 8.5, 10.5, 0);
      restoreGame(save); G.state = 'play'; hideLife();
      check(G.mapId === 'oakhaven' && JSON.stringify(G.map._decalsAll) === beforeKeys, 'a restored world has the same marks');
      check(G.map.decals === G.map._decalsAll && G.map.entities.length === nEnts, 'and shows them without gaining entities');
      check(G.maps.tavern.ceilCells && G.maps.cloister.ceilCells, 'and its painted ceilings');
      Engine.render(G.ents, G.tod);
      setFx({ decals: true, detail: true, ceilings: true });   // the rest of the run keeps them on

      // --- frame cost: eight interleaved 40-frame runs of each, median reported, the cheapest
      // runs compared (the build server is shared, so single runs are noisy) ---------------------
      const median = (arr) => arr.slice().sort((x, y) => x - y)[arr.length >> 1];
      const ALL = { decals: true, detail: true, ceilings: true };
      const run = (flags) => { setFx(flags); for (let i = 0; i < 5; i++) Engine.render(G.ents, G.tod); const t0 = performance.now(); for (let i = 0; i < 40; i++) Engine.render(G.ents, G.tod); return (performance.now() - t0) / 40; };
      out.ms = {};
      for (const [id, x, y, dir] of [['oakhaven', 23.5, 20.5, -1.57], ['deepwoods', 27.5, 30.5, -1.57], ['tavern', 8.5, 10.5, -1.57]]) {
        go(id, x, y, dir);
        const off = [], on = [];
        for (let r = 0; r < 8; r++) { off.push(run({})); on.push(run(ALL)); }
        out.ms[id] = { off: +median(off).toFixed(2), on: +median(on).toFixed(2), deltaMedian: +(median(on) - median(off)).toFixed(2), deltaBest: +(Math.min(...on) - Math.min(...off)).toFixed(2) };
        // Plain frames cost 1-6 ms on an idle machine. When even those run slow the server is saturated and
        // a comparison is noise, so the numbers are reported but not asserted.
        const offBest = Math.min(...off), slack = 3 + 0.25 * offBest;
        out.ms[id].asserted = offBest <= 8;
        if (out.ms[id].asserted) check(Math.min(...on) - offBest < slack, id + ' surface effects add under ' + slack.toFixed(1) + ' ms a frame (' + out.ms[id].deltaBest + ')');
      }
      setFx(ALL);
      return out;
    });
    console.log('PASS surfaces: textures, budget, deterministic placement, toggles, pixel effects, ceilings, saves', JSON.stringify(result));

    // --- screenshots: before (everything off) and after, 1280x800 --------------------------------------------
    const shot = async (name, id, dec, dist, flags) => {
      await page.evaluate(([i, d, di, fl]) => {
        setFx(fl);
        let f = d ? faceDecal(i, d, di) : null;
        if (f) go(i, f.x, f.y, f.dir);
        G.tod = 0.5; hideLife();
      }, [id, dec, dist, flags]);
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') });
    };
    const ON = { decals: true, detail: true, ceilings: true };
    for (const [nm, id, dec, dist] of [['oakhaven_synod', 'oakhaven', 'd_synod1', 2.2], ['oakhaven_poster', 'oakhaven', 'd_poster2', 2.2], ['oakhaven_moss', 'oakhaven', 'd_moss1', 2.2], ['quarry_scorch', 'quarry', 'd_scorch1', 2.2], ['mausoleum_crack', 'mausoleum', 'd_crack2', 2.2], ['catacombs_moss', 'catacombs', 'd_moss2', 2.0], ['clearing_moss', 'clearing', 'd_moss3', 2.2]]) {
      await shot(nm + '_before', id, dec, dist, {});
      await shot(nm + '_after', id, dec, dist, ON);
    }
    for (const [nm, id, x, y, dir] of [['tavern_ceiling', 'tavern', 8.5, 10.5, -Math.PI / 2], ['cloister_ceiling', 'cloister', 9.5, 13.4, -Math.PI / 2], ['catacombs_ceiling', 'catacombs', 2.6, 14.5, 0]]) {
      for (const [tag, fl] of [['before', {}], ['after', ON]]) {
        await page.evaluate(([i, px, py, d, f]) => { setFx(f); go(i, px, py, d); G.tod = 0.5; hideLife(); }, [id, x, y, dir, tag === 'after' ? ON : {}]);
        await page.waitForTimeout(350);
        await page.screenshot({ path: path.join(SHOT_DIR, nm + '_' + tag + '.png') });
      }
    }
    await page.evaluate(() => setFx({ decals: true, detail: true, ceilings: true }));
    assert.ok(fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).length >= 20, 'screenshots were written');
    console.log('PASS surfaces screenshots in ' + SHOT_DIR);
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS surfaces: no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
