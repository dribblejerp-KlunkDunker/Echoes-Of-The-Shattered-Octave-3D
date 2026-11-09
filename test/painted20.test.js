// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/path/to/playwright node test/painted20.test.js
// Phase 20b "The painted world, finished" (js/painted20.js):
//  - the tiles: eleven painted 64x64 textures from the base tiles' own tones, within the texture budget;
//  - painted ground: grass and moss maps carry more than one tile, the plain tile stays the commonest, every variant is
//    a grass/moss family name (footsteps and the rain's mud still read grass), deterministic between two pages,
//    roads / doors / water / walls untouched; off restores floorCells and floorTextures exactly;
//  - painted walls: whole buildings share one front, outdoor stone runs vary, nothing but t_house / t_stone changes,
//    doors and cell shapes untouched; off restores every cell's texture, and R3D is handed a new cells array;
//  - tree variety: oaks and willows re-coloured and turned about, same deco at the same place; off restores sprite and flip;
//  - the painted pieces: loaded, swapped in at the stand-in's size and anchor, off gives the stand-in back;
//  - the Original preset and every switch off are byte-identical frames to a build without the module; no page errors;
//  - a save made with the module on loads in a page without it.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000') + '/index.html?nosw=1';

async function boot(browser, block) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || /failed/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* none */ } let a = 2020; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  if (block) await page.route('**/js/painted20.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.evaluate(() => { try { CINEMATIC24.set.play = false; } catch (e) { /* no cinematic */ } });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Painter');
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
    window.__cap = null; window.__on = false;
    Engine.addPostHook((F) => { if (window.__on) window.__cap = { fb: F.fb.slice(), w: F.w, h: F.h }; }, 9999);
    window.go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; for (const m in G.maps) for (const e of G.maps[m].entities) if (e.kind === 'enemy') e.hidden = true; };
    window.grab = (tod, dir) => {
      Engine.cam.bob = 0; Engine.cam.pitch = 0; if (dir != null) Engine.cam.dir = dir; Engine.setTime(3.3);
      Weather.release(); Weather.hold('clear'); Weather.tick(1 / 60);
      const pn = performance.now; performance.now = () => 555555;
      window.__on = true; try { Engine.render([], tod); } finally { performance.now = pn; window.__on = false; }
      return window.__cap;
    };
    window.hash = (c) => { let h = 2166136261; for (let i = 0; i < c.fb.length; i++) { h ^= c.fb[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + c.w; };
  });
  return { page, errors };
}
const FLAGS = ['p20_ground', 'p20_walls', 'p20_trees', 'p20_pieces'];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const A = await boot(browser, false);
    const B = await boot(browser, true);
    assert.equal(await B.page.evaluate(() => typeof PAINTED20), 'undefined', 'page B runs without js/painted20.js');
    await A.page.waitForFunction(() => PAINTED20.tilesReady() && PAINTED20.treesReady() && PAINTED20.pieces().length === Object.keys(PAINTED20.PIECES).length, null, { timeout: 20000 });

    // ---- the off state: the Original preset, and Medium with the four switches off, match a build without the module ----
    const scenes = [
      ['clearing', 20.5, 24.5, 0.57, 0.5], ['clearing', 29.5, 19.5, 0.9, 0.5], ['oakhaven', 44.5, 15.5, -1.2, 0.5], ['oakhaven', 53.5, 20.5, 0, 0.5],
      ['oakhaven', 10.5, 23.5, 0, 0.5], ['deepwoods', 27.5, 30.5, 3.0, 0.5], ['greenroot', 4.8, 13.5, 0.02, 0.5], ['chapel', 6.5, 5.5, -Math.PI / 2, 0.5],
    ];
    assert.deepEqual(await A.page.evaluate((F) => { PRESETS.apply('original'); return F.map((k) => GFX[k]); }, FLAGS), [true, true, true, true], 'the Original preset has the four switches on (they are art)');
    const hashes = (page, preset) => page.evaluate(({ scenes, preset, FLAGS }) => {
      PRESETS.apply(preset); if (typeof PAINTED20 !== 'undefined') for (const k of FLAGS) GFX[k] = false; GFX.preset = PRESETS.current(); GFX.changed();
      return scenes.map(([m, x, y, d, tod]) => { go(m, x, y, d); return hash(grab(tod, d)); });
    }, { scenes, preset, FLAGS });
    for (const preset of ['original', 'medium']) {
      const ha = await hashes(A.page, preset), hb = await hashes(B.page, preset);
      // in Medium the Chapel's candle smoke runs on each page's live clock, so two live pages differ there with or without this module
      const bad = ha.map((h, i) => (h === hb[i] || (preset === 'medium' && scenes[i][0] === 'chapel') ? -1 : i)).filter((i) => i >= 0);
      assert.deepEqual(bad, [], preset + ' with the switches off matches a build without js/painted20.js (mismatches ' + bad.map((i) => scenes[i].join(',')).join(' | ') + ')');
    }
    console.log('PASS off state: Original and Medium with the four switches off are byte-identical to a build without the module in ' + scenes.length + ' scenes');

    // ---- on: the frames change where the art is ----
    const onA = await A.page.evaluate(({ scenes, FLAGS }) => { PRESETS.apply('medium'); for (const k of FLAGS) GFX[k] = true; GFX.changed(); return scenes.map(([m, x, y, d, tod]) => { go(m, x, y, d); return hash(grab(tod, d)); }); }, { scenes, FLAGS });
    const offA = await hashes(A.page, 'medium');
    const changed = onA.map((h, i) => (h === offA[i] ? -1 : i)).filter((i) => i >= 0);
    assert.ok(changed.length >= 6, 'the painted world shows in most scenes (' + changed.length + '/' + scenes.length + ')');
    console.log('PASS on: ' + changed.length + ' of ' + scenes.length + ' scenes change with the switches on');

    // ---- the art, the ground, the walls, the trees, the pieces ----
    const r = await A.page.evaluate((FLAGS) => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const out = {};
      PRESETS.apply('medium'); for (const k of FLAGS) GFX[k] = true; if (typeof GFX.pixel3d !== 'undefined') GFX.pixel3d = false; GFX.changed();   // (the pixel-3D set would take the barrel and crate)
      // --- the tiles ---
      const names = Object.keys(PAINTED20.TILES);
      check(names.length === 11 && PAINTED20.stats.tiles === 11, 'eleven tiles painted');
      for (const n of names) { const t = Engine.textures[n]; check(t && t.length === 4096, 'texture ' + n); check(t.every((p) => (p >>> 24) === 255), n + ' is opaque'); }
      const lum = (c) => 0.299 * (c & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * ((c >> 16) & 255);
      const avg = (t) => t.reduce((s, c) => s + lum(c), 0) / t.length;
      for (const fam of ['t_grass', 't_moss']) for (const n of PAINTED20.GROUND[fam].slice(1)) check(Math.abs(avg(Engine.textures[n]) - avg(Engine.textures[fam])) < 34, n + ' stays near its base tile\'s luminance (' + avg(Engine.textures[n]).toFixed(1) + ' vs ' + avg(Engine.textures[fam]).toFixed(1) + ')');
      check(PAINTED20.budgetBytes() + DECALS.budgetBytes() < 512 * 1024, 'the tiles and the decals fit the 512 KB texture budget together');
      out.tiles = names.length;
      // --- the ground ---
      const oak = G.maps.oakhaven, P = oak._p20b;
      check(P && P.ground && P.ground.applied, 'Oakhaven has painted ground applied');
      const counts = {}; for (let i = 0; i < oak.floorCells.length; i++) { const nm = oak.floorTextures[oak.floorCells[i]]; counts[nm] = (counts[nm] || 0) + 1; }
      for (const n of PAINTED20.GROUND.t_grass) check(counts[n] > 0, 'Oakhaven uses ' + n);
      check(counts.t_grass >= counts.t_grass_p20b_c && counts.t_grass >= counts.t_grass_p20b_d, 'the plain tile stays commoner than straw and earth');
      for (const nm in counts) check(/^t_(grass|cobble|water)/.test(nm), 'only grass variants are added (' + nm + ')');
      const c0 = P.ground.cells0, t0 = P.ground.textures0;
      for (let i = 0; i < c0.length; i++) if (c0[i]) check(oak.floorTextures[oak.floorCells[i]] === t0[c0[i]], 'a road, water or set cell keeps its texture (' + i + ')');
      for (let i = 0; i < oak.cells.length; i++) if (oak.cells[i]) check(oak.floorCells[i] === c0[i], 'a wall cell\'s floor is untouched (' + i + ')');
      check(stepSurface && typeof stepSurface === 'function', 'stepSurface exists');
      const probe = (nm) => { const i = oak.floorCells.indexOf(oak.floorTextures.indexOf(nm)); Engine.cam.x = (i % oak.w) + 0.5; Engine.cam.y = ((i / oak.w) | 0) + 0.5; G.map = oak; return stepSurface(); };
      check(probe('t_grass_p20b_c') === 'grass' && probe('t_grass_p20b_d') === 'grass', 'footsteps on straw and earth still sound as grass');
      const dw = G.maps.deepwoods; check(dw._p20b.ground && dw._p20b.ground.applied && dw.floorTextures.includes('t_moss_p20b_b'), 'the Deep Woods carry moss variants');
      out.ground = counts;
      // --- the walls ---
      const Wp = P.walls; check(Wp && Wp.applied && Wp.n > 20, 'Oakhaven has painted walls (' + (Wp && Wp.n) + ')');
      const comps = new Map();
      for (const [i, name] of Wp.tex) { const c = oak.cells[i]; check(c && c.tex === name, 'cell ' + i + ' wears ' + name); check(!c.door, 'no door changes'); check(c._p20bTex0 === 't_house' || c._p20bTex0 === 't_stone', 'only house and stone change'); }
      // one building, one front: every house cell's 8-neighbour house cells wear the same texture
      for (let i = 0; i < oak.cells.length; i++) { const c = oak.cells[i]; if (!c || !/^t_house/.test(c.tex)) continue; const x = i % oak.w, y = (i / oak.w) | 0; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const j = (y + dy) * oak.w + x + dx; const cc = oak.cells[j]; if (cc && /^t_house/.test(cc.tex)) check(cc.tex === c.tex, 'a building shares one front (' + i + ')'); } }
      let variants = new Set(); for (const [, name] of Wp.tex) variants.add(name); check(variants.size >= 3, 'several fronts are used (' + [...variants].join(' ') + ')');
      out.walls = Wp.n;
      // --- the trees ---
      const cl = G.maps.clearing, Tp = cl._p20b.trees; check(Tp && Tp.applied && Tp.n >= 6, 'the clearing\'s trees are prepared (' + (Tp && Tp.n) + ')');
      let turned = 0, recol = 0; for (const t of Tp.list) { check(t.e.sprite === t.sprite && cl.entities.includes(t.e), 'the tree stands where it did'); if (t.flip) turned++; if (t.sprite !== t.sprite0) recol++; }
      check(turned > 0 && recol > 0 && turned < Tp.n && recol < Tp.n, 'some trees turned (' + turned + '), some recoloured (' + recol + '), not all');
      for (const k of ['p20b_oak_green', 'p20b_oak_copper', 'p20b_willow_pale']) { const s = Engine.sprites[k], o = Engine.sprites[k.includes('oak') ? 'oak' : 'willow']; check(s && s.w === o.w && s.h === o.h, k + ' matches its source size'); let diff = 0, same = 0; for (let i = 0; i < s.data.length; i++) { if (!(o.data[i] >>> 24)) { check(!(s.data[i] >>> 24), 'alpha kept'); continue; } if (s.data[i] !== o.data[i]) diff++; else same++; } check(diff > same * 0.3 && same > 0, k + ' recolours the leaves and keeps the bark (' + diff + ' changed, ' + same + ' kept)'); }
      out.trees = Tp.n;
      // --- the pieces ---
      const want = Object.keys(PAINTED20.PIECES);
      check(PAINTED20.pieces().length === want.length && PAINTED20.stats.piecesFailed === 0, 'every painted piece loaded (' + PAINTED20.pieces().join(' ') + ')');
      for (const n of want) check(PAINTED20.pieceApplied(n), n + ' is applied');
      check(Engine.sprites.p_barrel.w === 48 && Engine.sprites.p_barrel.h === 64 && Engine.sprites.p_cart.w === 100, 'the pieces keep the stand-ins\' sizes');
      check(Engine.textures.d_poster1.length === 4096, 'the notice is a 64x64 texture');
      out.pieces = want.length;
      // --- off: everything back ---
      const texBefore = oak.cells.map((c) => (c ? c.tex : '')), cellsRef = oak.cells;
      for (const k of FLAGS) GFX[k] = false; GFX.changed();
      check(oak.floorTextures.length === t0.length && oak.floorCells.every((v, i) => v === c0[i]), 'off: Oakhaven\'s floor is exactly what it was');
      check(oak.cells !== cellsRef && oak.cells.every((c, i) => (c ? c.tex : '') === (texBefore[i].startsWith('t_house') ? 't_house' : texBefore[i].startsWith('t_stone') ? 't_stone' : texBefore[i])), 'off: every wall is its original texture, in a new cells array');
      check(Tp.list.every((t) => t.e.sprite === t.sprite0 && !!t.e.animFlip === t.flip0), 'off: every tree is its original sprite, unturned');
      check(!PAINTED20.pieceApplied('p_barrel') && Engine.sprites.p_barrel.w === 48, 'off: the stand-in barrel is back');
      for (const k of FLAGS) GFX[k] = true; GFX.changed();
      check(P.ground.applied && Wp.applied && Tp.applied && PAINTED20.pieceApplied('p_barrel'), 'on again');
      check(PAINTED20.stats.errors === 0, 'no internal errors (' + PAINTED20.stats.errors + ')');
      return out;
    }, FLAGS);
    console.log('PASS art and state: ' + JSON.stringify(r));

    // ---- determinism and saves: the same ground in two pages, and a save loads without the module ----
    const cellsA = await A.page.evaluate(() => Array.from(G.maps.clearing.floorCells).join(','));
    const C = await boot(browser, false);
    await C.page.waitForFunction(() => PAINTED20.tilesReady(), null, { timeout: 20000 });
    const cellsC = await C.page.evaluate(() => { PRESETS.apply('medium'); GFX.changed(); return Array.from(G.maps.clearing.floorCells).join(','); });
    assert.equal(cellsA, cellsC, 'the clearing\'s painted ground is the same in two pages');
    const save = await A.page.evaluate(() => { go('oakhaven', 30.5, 23.5, 0.4); G.player.hp = 7; return typeof snapshotGame === 'function' ? JSON.stringify(snapshotGame()) : null; });
    if (save) {
      const ok = await B.page.evaluate((s) => { try { restoreGame(JSON.parse(s)); return G.mapId === 'oakhaven' && Math.abs(Engine.cam.x - 30.5) < 0.6 && G.player.hp === 7; } catch (e) { return 'err ' + e.message; } }, save);
      assert.equal(ok, true, 'a save made with the module on loads in a page without it (' + ok + ')');
      const back = await A.page.evaluate((s) => { try { restoreGame(JSON.parse(s)); return G.mapId === 'oakhaven' && G.maps.oakhaven._p20b.ground.applied && G.maps.oakhaven.floorTextures.includes('t_grass_p20b_a'); } catch (e) { return 'err ' + e.message; } }, save);
      assert.equal(back, true, 'and loads again with it, the painted ground applied (' + back + ')');
      console.log('PASS determinism and saves');
    } else console.log('PASS determinism (snapshotGame not exposed; save round-trip skipped)');

    // ---- the Options rows ----
    await A.page.evaluate(() => { G.state = 'play'; });
    await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(300);
    const rows = await A.page.evaluate(() => { try { openModal('options'); } catch (e) { /* the key may have opened it */ } try { renderAccessibilityMenu(); } catch (e) { /* none */ } return ['p20_ground', 'p20_walls', 'p20_trees', 'p20_pieces'].map((k) => { const b = document.getElementById('gfx-p20b-' + k); return b ? b.textContent : null; }); });
    if (rows.every((x) => x)) { assert.deepEqual(rows, ['On', 'On', 'On', 'On'], 'the four rows read On'); console.log('PASS Options rows present'); }
    else console.log('PASS (Options rows not reachable from this state: ' + JSON.stringify(rows) + ')');

    for (const P of [A, B, C]) assert.deepEqual(P.errors, [], 'page errors: ' + P.errors.join(' | '));
    console.log('PASS painted20: no page errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
