// PLAYWRIGHT_MODULE=/path/to/playwright node test/foundation.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Pins the Phase 2 engine extension points every graphics module builds on:
// render scale, per-pixel depth and material on both paths, sky/post hooks,
// procedural textures and sprites, decals, close-range detail, light
// occlusion, emissive masks, interior ceiling height and the look multipliers.
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
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Foundation Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      if (typeof GFX !== 'undefined') GFX.plain();
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; };
      const r = {};
      // --- depth and material on the flat path ----------------------------
      go('tavern', 8.5, 10.5, -Math.PI / 2); Engine.render(G.ents, G.tod);
      check(G.map.relief === false, 'the tavern renders on the flat path');
      check(Engine.materialAt(160, 140) === Engine.MAT.ground && Engine.depthAt(160, 140) < 2, 'flat floor pixels carry ground material and a near depth');
      check(Engine.materialAt(160, 5) === Engine.MAT.ceiling, 'flat ceiling pixels carry ceiling material');
      let wallSeen = false; for (let y = 40; y < 110; y++) if (Engine.materialAt(160, y) === Engine.MAT.wall) wallSeen = true;
      check(wallSeen, 'flat wall pixels carry wall material');
      go('oakhaven', 17.5, 47.5, Math.PI / 2); Engine.render(G.ents, G.tod);
      let water = 0; for (let y = 76; y < 150; y++) for (let x = 0; x < 320; x += 4) if (Engine.materialAt(x, y) === Engine.MAT.water) water++;
      check(water > 0, 'the Flume is marked as water');
      check(Engine.materialAt(160, 5) === Engine.MAT.sky && Engine.depthAt(160, 5) >= 1e8, 'outdoor sky is sky, infinitely far');
      // --- glow material: lamps are lights, a lamp-lit cart is not ---------------
      if (typeof GFX !== 'undefined' && 'scenery' in GFX) { GFX.scenery = true; GFX.changed(); }
      go('oakhaven', 52.6, 20.4, 0); Engine.render(G.ents, G.tod);
      const cart = G.ents.find(e => e.sprite === 'p_cart' && Math.hypot(e.x - 56.9, e.y - 20.2) < 0.5);
      const lamp = G.ents.find(e => e.sprite === 'lamp' && Math.hypot(e.x - 57.5, e.y - 21.5) < 0.6);
      const matIn = (en, mat) => { const s = en && en._screen; if (!s) return -1; let n = 0; for (let y = Math.max(0, s.y0 | 0); y <= Math.min(149, s.y1 | 0); y++) for (let x = Math.max(0, s.x0 | 0); x <= Math.min(319, s.x1 | 0); x++) if (Engine.materialAt(x, y) === mat) n++; return n; };
      check(matIn(lamp, Engine.MAT.glow) > 0, 'a lit street lamp is drawn as glow');
      check(!!cart || typeof SCENERY === 'undefined', 'the market cart beside the lamp is placed');
      if (cart) {
        check(matIn(cart, Engine.MAT.glow) === 0 && matIn(cart, Engine.MAT.sprite) > 0, 'a lamp-lit cart is an ordinary sprite, not a light source');
        if (typeof POST !== 'undefined' && POST.hooks && POST.hooks.bloom) {
          // bloom never brightens the cart's own pixels (it may still spill a little from the lamp's halo)
          const s = cart._screen, cx = ((s.x0 + s.x1) / 2) | 0, cy = ((s.y0 + s.y1) / 2) | 0;
          const before = Array.from(Engine.ctx.getImageData(cx - 2, cy - 2, 5, 5).data);
          const keep = GFX.bloom; GFX.bloom = true; Engine.render(G.ents, G.tod);
          const after = Array.from(Engine.ctx.getImageData(cx - 2, cy - 2, 5, 5).data); GFX.bloom = keep;
          let lift = 0; for (let i = 0; i < before.length; i += 4) lift = Math.max(lift, after[i] - before[i]);
          r.cartBloomLift = lift;
          check(lift < 40, 'bloom does not light up a lamp-lit cart (lift ' + lift + ')');
        }
      }
      if (typeof GFX !== 'undefined') GFX.plain();

      // --- hooks: run each frame, in order, and a broken hook is skipped -----
      const calls = [];
      Engine.addSkyHook(F => { calls.push('sky:' + (F.w === 320) + ':' + (typeof F.horizon)); }, 5);
      Engine.addPostHook(F => { calls.push('post'); F.fb[0] = 0xff0000ff; }, 1);
      Engine.addPostHook(() => { throw new Error('boom'); }, 2);
      Engine.render(G.ents, G.tod);
      check(calls.includes('sky:true:number') && calls.includes('post'), 'sky and post hooks run with frame info');
      check(Engine.ctx.getImageData(0, 0, 1, 1).data[0] === 255, 'a post hook can write the frame before it is shown');
      // --- procedural textures, sprites, decals, detail ----------------------
      const tex = new Uint32Array(64 * 64).fill(0xff00ff00);
      Engine.addTexture('t_test_green', tex);
      let threw = false; try { Engine.addTexture('bad', new Uint32Array(5)); } catch (e) { threw = true; }
      check(threw, 'a texture must be 64x64');
      Engine.addSprite('spr_test', { w: 2, h: 2, data: new Uint32Array([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]) });
      check(Engine.sprites.spr_test.hs === 1, 'procedural sprites get default metadata');
      go('tavern', 8.5, 10.5, -Math.PI / 2); Engine.render(G.ents, G.tod);
      const before = Array.from(Engine.ctx.getImageData(0, 0, 320, 150).data);
      G.map.decals = {}; for (let i = 0; i < G.map.cells.length; i++) if (G.map.cells[i] && !G.map.cells[i].door) G.map.decals[i] = 't_test_green';
      Engine.render(G.ents, G.tod);
      const after = Engine.ctx.getImageData(0, 0, 320, 150).data;
      let greener = 0; for (let i = 0; i < after.length; i += 4) if (after[i + 1] > before[i + 1] + 20 && after[i] <= before[i] + 5) greener++;
      check(greener > 2000, 'decals replace wall texels (' + greener + ')');
      delete G.map.decals;
      // --- light occlusion: a lamp does not light the far side of a wall ------
      // a small test room: one wall cell in open ground, a lamp west of it
      const room = new GameMap('light-probe', 'probe', 9, 5, { outdoor: true });
      room.set(4, 2, WALL('t_stone'));
      Engine.setMap(room);
      const probe = { kind: 'deco', sprite: 'lamp', x: 3.5, y: 2.5, glow: 1 };
      const near = Engine.lightAt([probe], 3.5, 3.4);   // same side as the lamp
      const far = Engine.lightAt([probe], 5.5, 2.5);    // behind the wall, within the lamp's reach
      const open = Engine.lightAt([probe], 1.5, 2.5);   // open ground, same distance the other way
      check(near[0] > 5 && open[0] > 5, 'the lamp lights open ground around it');
      check(far[0] === 0 && far[1] === 0 && far[2] === 0, 'the far side of a wall gets none of its light (' + far + ')');
      room.set(4, 2, Object.assign(WALL('t_stone'), { top: 0.3 }));
      const over = Engine.lightAt([probe], 5.5, 2.5);
      check(over[0] > 5, 'light carries over a knee-high wall');
      r.occlusion = { near: near.map(v => +v.toFixed(1)), far, open: open.map(v => +v.toFixed(1)), over: over.map(v => +v.toFixed(1)) };
      // --- render scale: 2x, logical picking and depth still agree -------------
      go('clearing', 20.4, 19.5, 0);
      Engine.setScale(2); Engine.render(G.ents, G.tod); render();
      check(Engine.canvas.width === 640 && Engine.canvas.height === 400 && Engine.getScale() === 2, 'the canvas doubles at scale 2');
      const d2 = Engine.depthAt(160, 120);
      check(d2 > 0 && d2 < 1e8, 'depth reads back in logical pixels at scale 2');
      const sign = G.ents.find(e => e.sprite === 'sign' && e._screen);
      check(!sign || (sign._screen.x1 <= 330 && sign._screen.y1 <= 160), 'sprite screen boxes stay in logical 320x150 space at scale 2');
      const hudPx = Engine.ctx.getImageData(0, 300, 640, 100).data; let hud = 0; for (let i = 0; i < hudPx.length; i += 4) if (hudPx[i] + hudPx[i + 1] + hudPx[i + 2] > 30) hud++;
      check(hud > 20000, 'the HUD fills the bottom of the doubled canvas (' + hud + ' px)');
      Engine.setScale(1); render();
      check(Engine.canvas.width === 320 && Engine.getScale() === 1, 'scale 1 restores the original canvas');
      // --- interior ceiling height on the relief path --------------------------
      go('tavern', 8.5, 10.5, -Math.PI / 2);
      G.map.lvls = new Float32Array(G.map.w * G.map.h); G.map.ceilZ = 2.2; Engine.render(G.ents, G.tod);
      let ceilRows = 0; for (let y = 0; y < 75; y++) if (Engine.materialAt(160, y) === Engine.MAT.ceiling) ceilRows++;
      let wallTop = 150; for (let y = 0; y < 150; y++) if (Engine.materialAt(160, y) === Engine.MAT.wall) { wallTop = y; break; }
      G.map.lvls = null; delete G.map.ceilZ; Engine.scanRelief(G.map); Engine.render(G.ents, G.tod);
      let wallTopFlat = 150; for (let y = 0; y < 150; y++) if (Engine.materialAt(160, y) === Engine.MAT.wall) { wallTopFlat = y; break; }
      check(wallTop < wallTopFlat, 'walls in a taller room reach a higher ceiling (' + wallTop + ' vs ' + wallTopFlat + ')');
      // --- look multipliers -----------------------------------------------------
      go('clearing', 20.4, 19.5, 0);
      Engine.setLook({ fogK: 0.5 }); Engine.render(G.ents, G.tod);
      const nearFog = Array.from(Engine.ctx.getImageData(0, 80, 320, 1).data);
      Engine.setLook({ fogK: 1 }); Engine.render(G.ents, G.tod);
      const normal = Array.from(Engine.ctx.getImageData(0, 80, 320, 1).data);
      check(nearFog.some((v, i) => v !== normal[i]), 'view distance changes the fog');
      return r;
    });
    console.log('PASS engine foundation: depth/material, hooks, textures, decals, scale, ceilings, look', JSON.stringify(out));
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
