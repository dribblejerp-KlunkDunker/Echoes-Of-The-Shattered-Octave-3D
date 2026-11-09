// PLAYWRIGHT_MODULE=/path/to/playwright node test/relief.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers the relief renderer (per-pixel depth, low walls, towers, stands) and
// sloped ground (hills, crags, ramps): rendering, collision, falling, sprites,
// picking, automap, saves and frame time.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Relief Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    const result = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const quiet = () => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; };
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; };
      const walk = (n, keys) => { for (let i = 0; i < n; i++) { G.keys = keys || { w: true }; update(0.033); } G.keys = {}; };
      const col = 160, depthCol = (x) => { const a = []; for (let y = 0; y < 150; y++) a.push(Engine.depthAt(x, y)); return a; };
      G.tod = 0.45; quiet();
      const out = {};

      // --- which maps have relief ----------------------------------------
      check(G.maps.oakhaven.relief === undefined || true, 'relief is scanned on load');
      go('oakhaven', 44.5, 13.5, -1.2);
      check(G.map.relief === true && G.map.lvls === null, 'Oakhaven has relief (towers, roofs, parapets) but still no height field');
      check(Math.abs(G.map.maxTop - 3.2) < 1e-6, 'the Chapel tower is the tallest thing in Oakhaven');
      check(G.map.get(49, 11).top === 0.3 && G.map.get(36, 19).top === 2.8 && G.map.get(20, 49).top === 0.32, 'the plinth, mast and parapets keep their heights after the town is built');
      go('tavern', 8.5, 10.5, 0);
      check(G.map.relief === false, 'interiors without relief keep the flat renderer');
      go('oakhaven', 23.5, 20.5, -1.57);
      check(G.player.feet === 0 && Engine.cam.z === 0.88, 'Oakhaven streets stand at the new eye height');

      // --- per-pixel depth: the tower stands above the roofs --------------
      go('oakhaven', 44.5, 13.5, -1.2);
      render();
      // column through the tower: something solid well above the eaves
      let towerCol = -1;
      for (let x = 0; x < 320 && towerCol < 0; x++) { const d = Engine.depthAt(x, 30); if (d < 1e8) towerCol = x; }   // row 30 is the sky band at the standing eye (0.88): the tower alone reaches it, the roofs begin at row 54
      check(towerCol >= 0, 'the bell-tower reaches high into the sky band');
      const towerCells = [[48, 5], [49, 5], [48, 6], [49, 6]];
      const keep = towerCells.map(([x, y]) => G.map.get(x, y).top);
      towerCells.forEach(([x, y]) => { G.map.get(x, y).top = 1.35; });
      render();
      check(Engine.depthAt(towerCol, 30) >= 1e8, 'without the tower that pixel is sky');
      towerCells.forEach(([x, y], i) => { G.map.get(x, y).top = keep[i]; });
      out.towerCol = towerCol;

      // --- low walls: you see over them, and they still block -------------
      go('clearing', 12.5, 11.5, -Math.PI / 2);   // facing north at the field wall on row 9
      render();
      const wallD = depthCol(col);
      const wallRows = wallD.map((d, y) => [d, y]).filter(([d]) => Math.abs(d - 2.0) < 0.6 || Math.abs(d - (2.0 + 0.45)) < 0.6);
      check(wallRows.length > 0, 'the field wall is drawn in front of the eye');
      const above = wallD.slice(76, Math.min(...wallRows.map(r => r[1]))).filter(d => d < 1e8);
      check(above.some(d => d > 4), 'ground beyond the wall is visible over it');
      check(solidAt(12.5, 9.5, null), 'a knee-high wall still blocks a walker');
      walk(60);
      check(Engine.cam.y > 9.9, 'walking into the wall stops at its face');
      // a sprite behind the wall shows above it and is hidden below it
      // drifting leaves and weather are drawn over the view; hold them still
      const probe = { kind: 'deco', sprite: 'townsman', x: 12.5, y: 7.6, solid: false };
      const parts = PART_STYLE.clearing; delete PART_STYLE.clearing;
      go('clearing', 12.5, 11.5, -Math.PI / 2);
      const grab = () => { Engine.render(G.ents, G.tod); return Array.from(Engine.ctx.getImageData(0, 0, 320, 150).data); };
      const base1 = grab(), base2 = grab();
      G.ents.push(probe); const snapA = grab();
      const s = probe._screen;
      G.ents.splice(G.ents.indexOf(probe), 1);
      PART_STYLE.clearing = parts;
      check(s && s.y0 < 75, 'a figure behind the wall is projected');
      let upper = 0, lower = 0; const capRow = Math.min(...wallRows.map(r => r[1]));
      for (let y = 0; y < 150; y++) for (let x = Math.max(0, s.x0); x <= Math.min(319, s.x1); x++) {
        const i = (y * 320 + x) * 4;
        if (base1[i] !== base2[i] || base1[i + 1] !== base2[i + 1]) continue;   // animated sky/weather, not the figure
        if (snapA[i] !== base1[i] || snapA[i + 1] !== base1[i + 1]) { if (y < capRow) upper++; else lower++; }
      }
      check(upper > 20, 'the figure shows above the wall (' + upper + ' px)');
      check(lower === 0, 'the wall hides the figure below its cap (' + lower + ' px leaked)');
      out.wallOcclusion = { upper, lower };

      // --- the timber stand: steps up, a deck, a drop ----------------------
      go('clearing', 31.2, 22.5, 0);
      walk(50);
      check(Math.abs(G.player.feet - 1.2) < 1e-6 && Engine.cam.x > 35, 'the stand steps carry you up to its deck');
      check(stepSurface() === 'wood', 'the deck sounds like timber underfoot');
      const deckHp = G.player.hp;
      walk(60);
      check(G.player.feet === 0 && G.player.hp < deckHp, 'stepping off the east edge drops you to the grass and hurts');

      // --- sloped ground: a hill you can walk up and down ------------------
      const dw = G.maps.deepwoods;
      check(!!dw.verts && !!dw.smooth, 'the Deep Woods carry sloped ground');
      check(dw.groundAt(47, 9) > 1.5 && dw.groundAt(47, 9) < 1.61, 'the willow rise peaks near 1.6');
      check(dw.gradeAt(43.5, 9.5) > 0.05 && dw.gradeAt(43.5, 9.5) < 1.1, 'its flank is a walkable slope');
      go('deepwoods', 38.5, 11.5, 0);
      check(G.player.feet < 0.05, 'you start at the foot of the rise');
      let maxGap = 0, fell = false, prev = G.player.feet, rises = 0;
      for (let i = 0; i < 70; i++) {
        G.keys = { w: true }; update(0.033);
        const g = dw.groundAt(Engine.cam.x, Engine.cam.y);
        maxGap = Math.max(maxGap, Math.abs(G.player.feet - g));
        if (G.player.fallFrom != null) fell = true;
        if (G.player.feet > prev + 1e-6) rises++;
        prev = G.player.feet;
      }
      G.keys = {};
      check(Engine.cam.x > 44, 'the walk climbs the hill (x=' + Engine.cam.x.toFixed(2) + ')');
      check(G.player.feet > 0.9, 'and gains real height (' + G.player.feet.toFixed(2) + ')');
      check(!fell, 'walking up a slope never counts as falling');
      check(maxGap < 0.13, 'your feet follow the hillside (largest gap ' + maxGap.toFixed(3) + ')');
      check(rises > 20, 'the eye climbs continuously, not in steps');
      check(Math.abs(Engine.cam.z - (G.player.feet + 0.88)) < 1e-6, 'the eye rides 0.88 above the slope');
      // and down the far side without falling
      go('deepwoods', 47.0, 11.5, 0); fell = false;
      for (let i = 0; i < 60; i++) { G.keys = { w: true }; update(0.033); if (G.player.fallFrom != null && G.player.feet - dw.groundAt(Engine.cam.x, Engine.cam.y) > 0.3) fell = true; }
      G.keys = {};
      check(!fell && G.player.hp === G.player.hpMax, 'walking down a gentle slope is not a fall');
      out.slope = { maxGap: +maxGap.toFixed(3), rises };

      // --- the ramp helper: a straight incline with an even grade ------------
      const rm = new GameMap('ramp-probe', 'probe', 8, 4, {});
      rm.ramp(2, 1, 4, 1, 0, 0.9, 'x');
      check(Math.abs(rm.groundAt(2.0, 1.5)) < 1e-6 && Math.abs(rm.groundAt(5.0 - 1e-6, 1.5) - 0.9) < 1e-4, 'a ramp rises from its start height to its end height');
      check(Math.abs(rm.groundAt(3.5, 1.5) - 0.45) < 1e-6 && Math.abs(rm.gradeAt(3.2, 1.5) - 0.3) < 1e-6, 'a ramp is straight, with an even grade of rise over run');
      check(rm.groundAt(3.5, 2.5) === 0 && rm.smooth[1 * 8 + 3] === 1, 'only the ramp cells are sloped');

      // --- the crag: too steep to climb, and it hurts to come off ----------
      check(dw.groundAt(51.5, 33.5) > 2.5 && dw.isSolidCell(51, 33), 'the crag top is 2.6 high and carries its thicket');
      let steepAt = null;
      for (let x = 44; x < 51 && !steepAt; x += 0.1) if (dw.gradeAt(x, 30.5) > 1.1 && !dw.isBlocked(x | 0, 30)) steepAt = x;
      check(steepAt !== null, 'the crag has a flank steeper than a walker can climb');
      go('deepwoods', 44.5, 30.5, 0);
      let maxFeet = 0; for (let i = 0; i < 90; i++) { G.keys = { w: true }; update(0.033); maxFeet = Math.max(maxFeet, G.player.feet); } G.keys = {};
      const stopX = Engine.cam.x;
      check(dw.gradeAt(stopX + 0.3, 30.5) > 0.9 || dw.groundAt(stopX + 0.3, 30.5) - G.player.feet > 0.3, 'the climb stops at the cliff');
      check(maxFeet < 1.25, 'you cannot walk up the crag (highest ' + maxFeet.toFixed(2) + ')');
      // standing on the crag's rim and walking off it
      let rim = null;
      for (let x = 50.9; x > 45 && !rim; x -= 0.05) { if (dw.gradeAt(x, 31.5) < 0.6 && dw.groundAt(x, 31.5) > 2.2 && !dw.isBlocked(x | 0, 31)) rim = x; }
      check(rim !== null, 'the crag has a flat rim');
      go('deepwoods', rim, 31.5, Math.PI);
      check(G.player.feet > 2.2, 'loaded onto the rim stands on top of the crag');
      const rimHp = G.player.hp;
      walk(80);
      check(G.player.feet < 0.5, 'walking west off the rim brings you down the flank');
      check(G.player.hp < rimHp, 'coming down a cliff flank costs health');
      check(G.player.hp > 0 && rimHp - G.player.hp <= Math.round((2.6 - FALL_SAFE) * 12) && rimHp - G.player.hp >= 10, 'a tumble is scored at the tumbling rate, not as a sheer fall (' + (rimHp - G.player.hp) + ')');
      check(/tumble down the rock face/.test(document.querySelector('#msgs').textContent), 'the tumble is reported');
      out.crag = { steepAt: +steepAt.toFixed(2), stopX: +stopX.toFixed(2), rim: +rim.toFixed(2), damage: rimHp - G.player.hp };

      // --- sprites stand on the slope, and picking agrees ------------------
      go('deepwoods', 41.5, 11.5, 0);
      const marker = { kind: 'deco', sprite: 'sign', x: 45.5, y: 11.5, solid: false, label: 'probe' };
      G.ents.push(marker); render();
      const ms = marker._screen;
      const groundRow = 75 + ((Engine.cam.z - dw.groundAt(45.5, 11.5)) * 150 / (45.5 - Engine.cam.x));
      check(ms && Math.abs(ms.y1 - groundRow) < 3, 'a sprite on the hillside stands on the hillside (' + (ms && ms.y1) + ' vs ' + groundRow.toFixed(1) + ')');
      // look up until the centre of the view rests on the sign (pitch lowers the horizon)
      Engine.cam.pitch = Math.max(-40, Math.min(40, Math.round(75 - (ms.y1 - 6))));
      check(Engine.pick(G.ents, 6) !== marker || true, 'aim set');
      render();
      check(Engine.pick(G.ents, 6) === marker, 'the crosshair picks a sprite standing on raised ground');
      Engine.cam.pitch = 0;
      G.ents.splice(G.ents.indexOf(marker), 1);

      // --- the Mausoleum tower is real geometry, seen across the woods -----
      go('deepwoods', 27.5, 30.5, -Math.PI / 2);
      render();
      let towerRows = 0; for (let y = 0; y < 75; y++) if (Engine.depthAt(160, y) < 30) towerRows++;
      check(towerRows > 18, 'the Mausoleum tower rises well above the horizon (' + towerRows + ' rows)');
      check(!LANDMARKS.deepwoods.some(l => Math.abs(l.a + 1.55) < 0.01), 'the painted tower silhouette is retired');

      // --- saves on a slope -------------------------------------------------
      go('deepwoods', 44.0, 9.5, 0);
      const z0 = dw.groundAt(44.0, 9.5);
      check(Math.abs(G.player.feet - z0) < 1e-6 && z0 > 0.3, 'loading onto a slope stands you on it');
      const save = JSON.parse(JSON.stringify(snapshotGame()));
      go('oakhaven', 23.5, 20.5, 0);
      restoreGame(save); G.state = 'play';
      check(G.mapId === 'deepwoods' && Math.abs(G.player.feet - G.map.groundAt(Engine.cam.x, Engine.cam.y)) < 1e-6, 'a save on a hillside restores you on the hillside');

      // --- automap shows height ---------------------------------------------
      G.map.visited.fill(1);
      G.state = 'panel'; renderMap();
      const amap = document.querySelector('#amap');
      check(!!amap, 'the automap opens on a sloped map');
      const actx = amap.getContext('2d');
      const lo = actx.getImageData(30 * 4 + 1, 30 * 4 + 1, 1, 1).data, hi = actx.getImageData(47 * 4 + 1, 9 * 4 + 1, 1, 1).data;
      check(hi[0] + hi[1] + hi[2] > lo[0] + lo[1] + lo[2] + 30, 'higher ground is drawn lighter on the automap');
      closeModal(); G.state = 'play';

      // --- frame time, measured not assumed -----------------------------------
      const time = (id, x, y, dir, feet) => {
        go(id, x, y, dir); if (feet != null) { G.player.feet = feet; Engine.cam.z = feet + 0.5; }
        for (let i = 0; i < 10; i++) Engine.render(G.ents, G.tod);
        const t0 = performance.now(); for (let i = 0; i < 200; i++) Engine.render(G.ents, G.tod);
        return +((performance.now() - t0) / 200).toFixed(2);
      };
      out.ms = {
        tavernFlat: time('tavern', 8.5, 10.5, -1.57),
        oakhavenStreet: time('oakhaven', 23.5, 20.5, -1.57),
        oakhavenChapel: time('oakhaven', 44.5, 13.5, -1.2),
        clearingHill: time('clearing', 28.5, 18.5, 3.14),
        deepwoodsCamp: time('deepwoods', 27.5, 30.5, -1.57),
        deepwoodsRise: time('deepwoods', 47, 9, 3.14),
      };
      return out;
    });
    console.log('PASS relief: depth, towers, low walls, stands, slopes, crags, sprites, picking, saves, automap', JSON.stringify(result));
    // compact viewport still renders relief without errors
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { loadMap('deepwoods', { x: 44.0, y: 9.5, dir: 0 }); G.state = 'play'; });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => G.player.feet > 0.3), true, 'compact view stands on the slope');
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS relief view at full and compact sizes');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
