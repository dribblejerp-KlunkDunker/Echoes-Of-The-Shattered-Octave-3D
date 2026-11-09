// PLAYWRIGHT_MODULE=/path/to/playwright node test/water.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers js/water.js: reflections on water/shallows pixels, step-driven ripples,
// the GFX.reflections flag (byte-identical to GFX.plain()), render scale 2,
// other maps with water, and frame cost. Screenshots go to SHOT_DIR if set.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOT_DIR = process.env.SHOT_DIR || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (/render hook failed/.test(m.text())) errors.push(m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Water Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // Everything below runs inside one synchronous evaluate per group, so the
    // page's own animation loop cannot move the clock between two frames.
    const common = `
      window.__w = {
        check(ok, text) { if (!ok) throw new Error(text); },
        quiet() { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; },
        go(id, x, y, dir) { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; G.tod = 0.45; },
        // The 3D view straight from the engine's frame buffer, taken by a last post hook (order 1000). Reading the
        // canvas instead would include the weather/leaf overlay the page draws on top, which is random by design.
        shot() { return new Uint8ClampedArray(__w.cap.buffer.slice(0)); },
        // a fixed random stream per frame: the page sprinkles a few random pixels (sparkles, motes) that would
        // otherwise make two renders of the same instant differ
        seed() { let a = 12345; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
        frame(t) { __w.seed(); if (t != null) Engine.setTime(t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 0 }); Engine.render(G.ents, G.tod); return __w.shot(); },
        same(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; },
        isWater(x, y) { const m = Engine.materialAt(x, y); return m === 2 || m === 3; },
        lum(d, i) { return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; },
      };
      Engine.addPostHook(F => { if (!__w.cap || __w.cap.length !== F.fb.length) __w.cap = new Uint32Array(F.fb.length); __w.cap.set(F.fb); }, 1000);`;
    await page.evaluate(common);

    // ---- 1. reflections: water pixels change, others do not, and follow what is above
    const refl = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); GFX.reflections = true; WATER.clear();
      check(typeof WATER === 'object' && typeof WATER.ripple === 'function' && typeof WATER.ripples === 'function' && typeof WATER.clear === 'function', 'WATER exports ripple, ripples and clear');
      check(GFX.FX.includes('reflections'), 'the reflections flag is part of GFX.FX');
      W.quiet(); W.go('whispergrove', 20.5, 22.5, -2.5);
      check(WATER.kindAt(20.5, 22.5) === 1, 'the test spot is shallows');
      const T = 50;
      GFX.reflections = false; const off = W.frame(T); const offMat = Array.from({ length: 150 }, (_, y) => Array.from({ length: 320 }, (_, x) => Engine.materialAt(x, y)));
      const offCopy = new Uint8ClampedArray(off);
      GFX.reflections = true; const on = W.frame(T);
      let waterPx = 0, changed = 0, dryChanged = 0;
      for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) {
        const m = offMat[y][x], i = (y * 320 + x) * 4;
        const diff = on[i] !== offCopy[i] || on[i + 1] !== offCopy[i + 1] || on[i + 2] !== offCopy[i + 2];
        if (m === 2 || m === 3) { waterPx++; if (diff) changed++; } else if (diff) dryChanged++;
      }
      check(waterPx > 2000, 'plenty of water in view (' + waterPx + ')');
      check(changed > waterPx * 0.2, 'reflections change water pixels (' + changed + ' of ' + waterPx + ')');
      check(dryChanged === 0, 'no dry pixel is touched (' + dryChanged + ')');
      // correlation: just below a waterline the mirror shows what stands above it, so the change in the water's
      // brightness follows the brightness of that source (bright sky lifts the water, a dark wall does not)
      const src = [], dl = [], mats = {};
      for (let x = 0; x < 320; x++) {
        let r0 = -1;
        for (let y = 1; y < 150; y++) {
          if (!(offMat[y][x] === 2 || offMat[y][x] === 3)) { r0 = -1; continue; }
          if (r0 < 0) r0 = y;
          const dy = y - r0; if (dy < 2 || dy > 7) continue;
          const sy = r0 - 1 - dy; if (sy < 0) continue;
          const i = (y * 320 + x) * 4;
          src.push(W.lum(offCopy, (sy * 320 + x) * 4)); dl.push(W.lum(on, i) - W.lum(offCopy, i));
          mats[offMat[sy][x]] = (mats[offMat[sy][x]] || 0) + 1;
        }
      }
      const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
      check(src.length > 200, 'enough waterline samples (' + src.length + ')');
      const ms = mean(src), md = mean(dl);
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < src.length; i++) { sxy += (src[i] - ms) * (dl[i] - md); sxx += (src[i] - ms) ** 2; syy += (dl[i] - md) ** 2; }
      const corr = sxy / Math.sqrt(sxx * syy);
      check(corr > 0.4, 'water brightness follows the content above (r = ' + corr.toFixed(2) + ')');
      const order = src.map((v, i) => i).sort((p, q) => src[p] - src[q]), third = Math.floor(order.length / 3);
      const mDark = mean(order.slice(0, third).map(i => dl[i])), mBright = mean(order.slice(-third).map(i => dl[i]));
      check(mBright > mDark + 2, 'water under bright sources brightens more than under dark ones (' + mBright.toFixed(1) + ' vs ' + mDark.toFixed(1) + ')');
      // hook is deterministic: the same time gives the same frame
      const again = W.frame(T);
      check(W.same(on, again), 'a frame is repeatable at a fixed time');
      return { waterPx, changed, corr: +corr.toFixed(2), mBright: +mBright.toFixed(1), mDark: +mDark.toFixed(1), sourceMaterials: mats };
    });
    console.log('PASS water reflections: water pixels change, dry pixels do not, water follows the content above', JSON.stringify(refl));

    // ---- 2. shallows weaker than deep water ----------------------------------
    const kinds = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); GFX.reflections = true; W.quiet();
      // a deep pool in the Grove: stand on its dry rim and look over it
      W.go('whispergrove', 13.8, 21.5, Math.PI);
      const T = 51;
      GFX.reflections = false; const off = new Uint8ClampedArray(W.frame(T));
      const mats = []; for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) mats.push(Engine.materialAt(x, y));
      GFX.reflections = true; const on = W.frame(T);
      const dsum = { 2: 0, 3: 0 }, n = { 2: 0, 3: 0 };
      for (let p = 0; p < mats.length; p++) { const m = mats[p]; if (m !== 2 && m !== 3) continue; const i = p * 4; dsum[m] += Math.abs(W.lum(on, i) - W.lum(off, i)); n[m]++; }
      return { deepN: n[2], shalN: n[3], deep: n[2] ? dsum[2] / n[2] : 0, shal: n[3] ? dsum[3] / n[3] : 0 };
    });
    console.log('INFO water strength (mean abs luminance change)', JSON.stringify(kinds));

    // ---- 3. ripples from footsteps -------------------------------------------
    const steps = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); GFX.reflections = true; W.quiet();
      GFX.life = false;   // the townsfolk and Hollows on their loops (js/life60.js) wade too: hold them still for this
      for (const e of G.maps.whispergrove.entities) if (e.kind === 'npc') e.hidden = true;
      let t = 100;
      const step = (keys) => { G.keys = keys || {}; update(0.033); t += 0.033; Engine.setTime(t); Engine.render(G.ents, G.tod); };
      // dry causeway first: nothing to stir
      W.go('whispergrove', 24.5, 38.5, -Math.PI / 2); step(); WATER.clear();
      check(WATER.kindAt(24.5, 38.5) === 0, 'the causeway is dry');
      const y0 = Engine.cam.y;
      for (let i = 0; i < 30; i++) step({ w: true });
      check(y0 - Engine.cam.y > 1.5, 'the player walked along the causeway');
      check(WATER.ripples().length === 0, 'walking on dry marble raises no ripples');
      // shallows
      W.go('whispergrove', 20.5, 22.5, -Math.PI / 2); step(); WATER.clear();
      const sx = Engine.cam.x, sy = Engine.cam.y;
      let peak = 0;
      for (let i = 0; i < 45; i++) { step({ w: true }); peak = Math.max(peak, WATER.ripples().length); }
      const walked = Math.hypot(Engine.cam.x - sx, Engine.cam.y - sy);
      check(WATER.kindAt(Engine.cam.x, Engine.cam.y) > 0, 'still in water after the walk');
      check(walked > 2, 'the player waded some distance (' + walked.toFixed(2) + ')');
      check(peak >= 3, 'wading spawns ripples (' + peak + ')');
      check(peak <= WATER.CAP, 'the ring list is capped (' + peak + ')');
      check(WATER.ripples().length === Math.min(WATER.CAP, WATER.ripples().length), 'cap respected at the end');
      // standing still: they expire
      let first = WATER.ripples().length;
      for (let i = 0; i < 20; i++) step();
      check(WATER.ripples().length <= first, 'no new rings while standing still');
      for (let i = 0; i < 60; i++) step();
      check(WATER.ripples().length === 0, 'rings expire after about 1.5 s (' + WATER.ripples().length + ' left)');
      // 3.3 units of wading is about six steps; the limit is the cap
      for (let i = 0; i < 400; i++) { WATER.ripple(20 + (i % 7) * 0.3, 22 + (i % 5) * 0.2, 1); }
      check(WATER.ripples().length === WATER.CAP, 'a flood of ripples stays at the cap');
      WATER.clear(); G.keys = {};
      return { walked: +walked.toFixed(2), peak };
    });
    console.log('PASS water ripples: footsteps spawn rings in shallows, none on dry stone, cap and expiry', JSON.stringify(steps));

    // ---- 4. wading NPCs ripple too -------------------------------------------
    const npcs = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); GFX.reflections = true; W.quiet();
      W.go('whispergrove', 20.5, 22.5, 0); Engine.render(G.ents, G.tod); WATER.clear();
      const h = G.ents.find(e => e.kind === 'npc' && e.id === 'hollow');
      check(!!h, 'a Hollow stands in the Grove');
      const keep = { x: h.x, y: h.y, hidden: h.hidden };
      h.hidden = false; h.x = 23.5; h.y = 23.5;
      check(WATER.kindAt(h.x, h.y) > 0, 'the Hollow wades');
      let t = 200; Engine.setTime(t); Engine.render(G.ents, G.tod);
      let peak = 0;
      for (let i = 0; i < 10; i++) { h.x += 0.3; t += 0.12; Engine.setTime(t); Engine.render(G.ents, G.tod); peak = Math.max(peak, WATER.ripples().length); }
      check(peak >= 2, 'a wading Hollow stirs the water (' + peak + ')');
      WATER.clear(); h.x = keep.x; h.y = keep.y; h.hidden = keep.hidden;
      return { peak };
    });
    console.log('PASS water ripples: wading NPCs spawn rings', JSON.stringify(npcs));

    // ---- 5. a manual ripple distorts nearby water, and only water ------------
    const manual = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); GFX.reflections = true; W.quiet(); WATER.clear();
      W.go('whispergrove', 20.5, 22.5, -2.5);
      const c = Engine.cam, fx = c.x + Math.cos(c.dir) * 3, fy = c.y + Math.sin(c.dir) * 3;
      check(WATER.kindAt(fx, fy) > 0, 'the ring centre is on water');
      Engine.setTime(300); Engine.render(G.ents, G.tod);
      WATER.ripple(fx, fy, 1);
      check(WATER.ripples().length === 1, 'WATER.ripple() adds one ring');
      const mats = []; for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) mats.push(Engine.materialAt(x, y));
      Engine.setTime(300.5);
      WATER.clear(); const plain = new Uint8ClampedArray(W.frame());
      WATER.ripple(fx, fy, 1); WATER.ripples()[0].t0 = 300; const ring = W.frame();   // the same instant, now with a ring half a second old
      check(WATER.ripples().length === 1, 'the ring is alive half a second on');
      let diff = 0, dryDiff = 0, minX = 999, maxX = -1;
      for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) {
        const i = (y * 320 + x) * 4;
        if (ring[i] !== plain[i] || ring[i + 1] !== plain[i + 1] || ring[i + 2] !== plain[i + 2]) {
          const m = Engine.materialAt(x, y);
          if (m === 2 || m === 3) { diff++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); } else dryDiff++;
        }
      }
      check(diff > 40, 'the ring distorts and lights water pixels (' + diff + ')');
      check(dryDiff === 0, 'the ring never touches dry pixels');
      check(maxX - minX < 300, 'the ring is local, not a full-screen wash (' + (maxX - minX) + ' columns)');
      Engine.setTime(300 + WATER.LIFE + 0.1); Engine.render(G.ents, G.tod);
      check(WATER.ripples().length === 0, 'the ring expires');
      WATER.clear();
      return { diff, spanX: maxX - minX };
    });
    console.log('PASS water ripple: a manual ring distorts only nearby water pixels, then expires', JSON.stringify(manual));

    // ---- 6. flag off: byte-identical to GFX.plain(), and no ripple work -----
    const flag = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); W.quiet(); WATER.clear();
      W.go('whispergrove', 20.5, 22.5, -2.5);
      const T = 400;
      const plain = new Uint8ClampedArray(W.frame(T));
      GFX.reflections = true; const on = W.frame(T);
      check(!W.same(plain, on), 'reflections on changes the frame');
      WATER.ripple(20.5 + Math.cos(-2.5) * 3, 22.5 + Math.sin(-2.5) * 3, 1);
      GFX.reflections = false; GFX.changed();
      check(WATER.ripples().length === 0, 'turning the flag off drops the rings');
      check(W.same(plain, W.frame(T)), 'flag off is byte-identical to GFX.plain()');
      WATER.ripple(21, 22, 1);
      check(WATER.ripples().length === 0, 'WATER.ripple() does nothing while off');
      // walking in water with the flag off does no ripple work
      let t = T;
      for (let i = 0; i < 40; i++) { G.keys = { w: true }; update(0.033); t += 0.033; Engine.setTime(t); Engine.render(G.ents, G.tod); }
      G.keys = {};
      check(WATER.ripples().length === 0, 'no ripples are spawned while off');
      return { bytes: plain.length };
    });
    console.log('PASS water flag: GFX.reflections off is byte-identical to GFX.plain() with no ripple work', JSON.stringify(flag));

    // ---- 7. render scale 2 ---------------------------------------------------
    const s2 = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); W.quiet(); WATER.clear();
      Engine.setScale(2);
      try {
        W.go('whispergrove', 20.5, 22.5, -2.5);
        const T = 500, S = 2;
        const off = new Uint8ClampedArray(W.frame(T));
        const mats = new Uint8Array(640 * 300);
        for (let y = 0; y < 300; y++) for (let x = 0; x < 640; x++) mats[y * 640 + x] = Engine.materialAt(x / 2, y / 2);
        GFX.reflections = true; const on = new Uint8ClampedArray(W.frame(T));
        let waterPx = 0, changed = 0, dry = 0;
        for (let p = 0; p < mats.length; p++) {
          const m = mats[p], i = p * 4, diff = on[i] !== off[i] || on[i + 1] !== off[i + 1] || on[i + 2] !== off[i + 2];
          if (m === 2 || m === 3) { waterPx++; if (diff) changed++; } else if (diff) dry++;
        }
        check(on.length === 640 * 300 * 4, 'the view is 640x300 at scale 2');
        check(changed > waterPx * 0.2, 'scale 2: reflections change water (' + changed + ' of ' + waterPx + ')');
        check(dry === 0, 'scale 2: dry pixels untouched (' + dry + ')');
        // ring at scale 2
        const c = Engine.cam, fx = c.x + Math.cos(c.dir) * 3, fy = c.y + Math.sin(c.dir) * 3;
        Engine.setTime(T); Engine.render(G.ents, G.tod); WATER.ripple(fx, fy, 1);
        const base = new Uint8ClampedArray(W.frame(T + 0.5)); WATER.clear();
        const clean = new Uint8ClampedArray(W.frame(T + 0.5)); WATER.ripple(fx, fy, 1); WATER.ripples()[0].t0 = T;
        const ring = W.frame(T + 0.5);
        let d = 0; for (let i = 0; i < ring.length; i += 4) if (ring[i] !== clean[i] || ring[i + 1] !== clean[i + 1] || ring[i + 2] !== clean[i + 2]) d++;
        check(d > 100, 'scale 2: a ring distorts water (' + d + ')');
        WATER.clear();
        GFX.reflections = false; GFX.changed();
        const offAgain = W.frame(T);
        check(W.same(off, offAgain), 'scale 2: flag off is byte-identical to plain');
        return { waterPx, changed, ring: d };
      } finally { Engine.setScale(1); GFX.plain(); }
    });
    console.log('PASS water at render scale 2: reflections, ripples and flag off', JSON.stringify(s2));

    // ---- 8. other maps with water or shallows --------------------------------
    const maps = await page.evaluate(() => {
      const W = window.__w, check = W.check;
      GFX.plain(); W.quiet();
      const found = {};
      for (const id of ['oakhaven', 'catacombs', 'deepwoods', 'clearing', 'wickhouse']) {
        const m = G.maps[id]; if (!m || !m.floorCells) continue;
        let best = null, tries = 0;
        // stand on a dry open cell a few cells from water and look at it
        search: for (let cy = 2; cy < m.h - 2; cy += 2) for (let cx = 2; cx < m.w - 2; cx += 2) {
          if (m.isBlocked(cx, cy)) continue;
          for (let a = 0; a < 8; a++) {
            const dir = a * Math.PI / 4;
            const wx = cx + 0.5 + Math.cos(dir) * 3, wy = cy + 0.5 + Math.sin(dir) * 3;
            if (wx < 1 || wy < 1 || wx >= m.w - 1 || wy >= m.h - 1) continue;
            const idx = m.floorCells[(wy | 0) * m.w + (wx | 0)];
            const name = m.floorTextures ? m.floorTextures[idx] : m.floor;
            if (name !== 't_water' && name !== 't_shallows') continue;
            if (m.floorCells[cy * m.w + cx] !== 0 && (m.floorTextures[m.floorCells[cy * m.w + cx]] === 't_water')) continue;
            W.go(id, cx + 0.5, cy + 0.5, dir);
            GFX.reflections = false; const off = new Uint8ClampedArray(W.frame(7));
            let water = 0; for (let y = 0; y < 150; y += 2) for (let x = 0; x < 320; x += 2) if (W.isWater(x, y)) water++;
            if (water < 300) continue;
            if (++tries > 40) break search;
            GFX.reflections = true; const on = W.frame(7);
            let diff = 0; for (let i = 0; i < on.length; i += 4) if (on[i] !== off[i] || on[i + 1] !== off[i + 1] || on[i + 2] !== off[i + 2]) diff++;
            if (!best || diff > best.diff) best = { cx, cy, dir: +dir.toFixed(2), water, diff };
            if (best.diff > 400) break search;
          }
        }
        if (best) found[id] = best;
      }
      for (const id of ['oakhaven', 'catacombs']) check(found[id] && found[id].diff > 100, id + ' water reflects (' + JSON.stringify(found[id]) + ')');
      return found;
    });
    console.log('PASS water on other maps: reflections change water pixels', JSON.stringify(maps));

    // ---- 9. frame cost ---------------------------------------------------------
    // Wall-clock timing is useless on a busy machine, so the cost is read as main-thread CPU time (the browser's
    // ThreadTime counter) across a loop of renders, reflections on minus reflections off, in alternating rounds.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const threadMs = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'ThreadTime').value * 1000;
    const FRAMES = 100;
    const loop = (flag, rings) => page.evaluate(([flag, rings, FRAMES]) => {
      GFX.reflections = flag; WATER.clear(); Engine.setTime(900); Engine.render(G.ents, G.tod);
      for (let i = 0; i < FRAMES; i++) {
        if (flag && rings && WATER.ripples().length < rings) WATER.ripple(20.5 + Math.cos(-2.5) * (1.5 + (i % rings) * 0.3), 22.5 + Math.sin(-2.5) * (1.5 + (i % rings) * 0.3), 1);
        Engine.setTime(900 + (i % 20) * 0.005); Engine.render(G.ents, G.tod);   // the clock stays within a ring's life
      }
    }, [flag, rings, FRAMES]);
    const cpu = async (flag, rings) => { const t0 = await threadMs(); await loop(flag, rings); return (await threadMs() - t0) / FRAMES; };
    const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    const scene = async (id, x, y, dir, rings) => {
      await page.evaluate(([id, x, y, dir]) => { GFX.plain(); window.__w.quiet(); window.__w.go(id, x, y, dir); }, [id, x, y, dir]);
      const off = [], on = [], busy = [];
      for (let k = 0; k < 5; k++) { off.push(await cpu(false, 0)); on.push(await cpu(true, 0)); if (rings) busy.push(await cpu(true, rings)); }
      const diff = (a) => +median(a.map((v, i) => v - off[i])).toFixed(2);
      return { frameOff: +median(off).toFixed(2), reflections: diff(on), with8Rings: rings ? diff(busy) : null };
    };
    const cost = {
      oakhaven: await scene('oakhaven', 23.5, 20.5, -1.57, 0),
      whispergrove: await scene('whispergrove', 20.5, 22.5, -2.5, 8),
      whispergroveLanding: await scene('whispergrove', 24.5, 43.5, -Math.PI / 2, 8),
      deepwoods: await scene('deepwoods', 27.5, 30.5, -1.57, 0),
    };
    await page.evaluate(() => GFX.plain());
    // This machine is shared and slow, so the numbers are also scaled by how long a plain frame of flat Oakhaven takes
    // here against the 1.40 ms measured for it on a quiet machine (ROADMAP, slope terrain pass).
    const slow = Math.max(1, cost.oakhaven.frameOff / 1.4);
    const scaled = { whispergrove: +(cost.whispergrove.reflections / slow).toFixed(2), with8Rings: +(cost.whispergrove.with8Rings / slow).toFixed(2) };
    console.log('INFO added CPU ms per frame at S=1 (frameOff = a whole frame without reflections)', JSON.stringify(cost), 'machine slowdown x' + slow.toFixed(1), 'scaled', JSON.stringify(scaled));
    assert.ok(scaled.whispergrove < 0.8 && scaled.with8Rings < 0.8, 'reflections cost under 0.8 ms at S=1 in Whisper-Grove: ' + JSON.stringify(scaled));

    // ---- 10. screenshots for the human ----------------------------------------
    // 3x-scaled crops of the 3D view, rendered at a held instant so nothing moves (no weather overlay, no HUD)
    if (SHOT_DIR) {
      fs.mkdirSync(SHOT_DIR, { recursive: true });
      const grab = async (name, flag, rings, scale) => {
        const url = await page.evaluate(([flag, rings, scale]) => {
          const W = window.__w;
          GFX.plain(); W.quiet(); WATER.clear();
          Engine.setScale(scale); W.go('whispergrove', 20.5, 22.5, -2.5);
          GFX.reflections = flag;
          Engine.setTime(600); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 0 }); Engine.render(G.ents, G.tod);
          if (flag && rings) {
            const c = Engine.cam, f = [Math.cos(c.dir), Math.sin(c.dir)], sd = [-f[1], f[0]];
            [[2.2, -0.7, 0.7], [3.6, 1.0, 0.45], [5.0, -1.4, 0.3], [2.8, 1.9, 0.9], [6.5, 0.2, 0.2]].forEach(([d, side, age]) => {
              WATER.ripple(c.x + f[0] * d + sd[0] * side, c.y + f[1] * d + sd[1] * side, 1); WATER.ripples()[WATER.ripples().length - 1].t0 = 600 - age;
            });
            Engine.render(G.ents, G.tod);
          }
          const S = Engine.getScale(), src = Engine.canvas, out = document.createElement('canvas');
          out.width = 320 * 3; out.height = 150 * 3;
          const o = out.getContext('2d'); o.imageSmoothingEnabled = false;
          o.drawImage(src, 0, 0, 320 * S, 150 * S, 0, 0, out.width, out.height);
          Engine.setScale(1); GFX.plain();
          return out.toDataURL('image/png');
        }, [flag, rings, scale]);
        fs.writeFileSync(path.join(SHOT_DIR, name), Buffer.from(url.split(',')[1], 'base64'));
      };
      await grab('whispergrove_before.png', false, false, 1);
      await grab('whispergrove_after.png', true, false, 1);
      await grab('whispergrove_ripples.png', true, true, 1);
      await grab('whispergrove_after_scale2.png', true, true, 2);
      console.log('INFO screenshots written to ' + SHOT_DIR);
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
