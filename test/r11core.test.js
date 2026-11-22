// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4111 node test/r11core.test.js
// Covers js/r11core.js (ROADMAP R11 phase 1, team CORE): R11, the realistic renderer (Three.js).
//   - R11 draws Oakhaven at 10:00 and at 22:00 (day brighter than night), the world has geometry, the world's own draw
//     calls at Phone tier (reported) stay within ~60
//   - Art style: Pixel hands the frame back (R11.active() false, the raycaster or R3D draws) and Realistic takes it again,
//     live, with the setting stored in localStorage 'octave.r11.v1' merged (other keys kept); the Options row
//   - gameplay parity: Engine.pick under R11 answers exactly what it answers in Pixel style, on a grid of view directions
//   - entities: every entity the engine would draw within range is a billboard
//   - memory: loadMap away and back 5 times does not grow renderer.info.memory (geometries, textures)
//   - a scripted 30-step walk with R11.renderOnce() and no page errors
// Headless Chromium here has only SwiftShader (a software WebGL 2): the page opts in with
// window.__r11 = { automation: true, force: true, tier: 'phone' }. Frame times here mean nothing and are not checked.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4111';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r11core-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r11core|render override/.test(m.text()))) errors.push('console: ' + m.text()); });
  const r11 = opts.r11 || { automation: true, force: true, tier: 'phone' };
  await page.addInitScript(([o, pre]) => { window.__r11 = o; try { localStorage.setItem('octave.r11.v1', JSON.stringify(pre)); } catch (e) { /* none */ } }, [r11, opts.stored || { bench: { keep: 1 } }]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 600000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 600000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Core Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.waitForFunction(() => window.R11 && (R11.ready || R11.failed()), null, { timeout: 600000 });
  await page.evaluate(HELPERS);
  return { page, errors };
}

const HELPERS = () => {
  const S = window.S = {};
  window.requestAnimationFrame = () => 0;   // the game loop must not render between our frames
  S.pin = (fn) => {
    const rn = Math.random, pn = performance.now.bind(performance), dn = Date.now;
    let sd = 7; Math.random = () => (sd = (sd * 16807) % 2147483647) / 2147483647; performance.now = () => 123456; Date.now = () => 1700000000000;
    try { return fn(); } finally { Math.random = rn; performance.now = pn; Date.now = dn; }
  };
  S.stage = (map, x, y, dir, tod, pitch) => S.pin(() => {
    G.state = 'paused'; G.day = 3; G.tod = tod; loadMap(map, { x, y, dir }); G.fadeT = 0; G.tod = tod; G.day = 3;
    Engine.cam.pitch = pitch || 0; Engine.cam.bob = 0; try { Weather.hold('clear'); } catch (e) { /* none */ } G.state = 'play';
  });
  S.frame = () => S.pin(() => render());
  // mean colour of a region of the R11 canvas, read right after a frame (logical 320x200 rect)
  S.mean = (x0, y0, x1, y1) => {
    const gl = R11.renderer.getContext(), c = R11.canvas(), kx = c.width / 320, ky = c.height / 200;
    const w = Math.max(1, ((x1 - x0) * kx) | 0), h = Math.max(1, ((y1 - y0) * ky) | 0), b = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels((x0 * kx) | 0, (c.height - y1 * ky) | 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
    let r = 0, g = 0, bl = 0; for (let i = 0; i < b.length; i += 4) { r += b[i]; g += b[i + 1]; bl += b[i + 2]; }
    const n = b.length / 4; return [r / n, g / n, bl / n];
  };
  // what the engine would draw (R3D's defaultProvider rule) within range
  S.expectedBillboards = () => {
    const env = R3D.frame.env, fd2 = env.fogDist * env.fogDist * 1.3; let n = 0;
    for (const e of G.ents) {
      if (!e || !e.sprite || e.hidden) continue;
      if (R11.replaced().has(e)) continue;   // KIT draws it as a model
      const dx = e.x - Engine.cam.x, dy = e.y - Engine.cam.y; if (dx * dx + dy * dy > fd2) continue;
      let d; try { d = animDirectionalSprite(e); } catch (err) { d = null; } if (!d || !d.sprite) continue;
      if ((e.animAlpha == null ? 1 : e.animAlpha) <= 0.02) continue;
      n++;
    }
    return n;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // ---------------------------------------------------------------- drawing, world, switching
  {
    const { page, errors } = await bootPage(browser, {});
    await step('R11 is ready and owns the frame (style realistic by default, opted in under automation)', async () => {
      const r = await page.evaluate(() => ({ ready: R11.ready, style: R11.style(), tier: R11.tier(), owns: R11.owns(), failed: R11.failed() }));
      assert.deepStrictEqual(r, { ready: true, style: 'realistic', tier: 'phone', owns: true, failed: false });
    });
    let day = null, night = null;
    await step('R11 draws Oakhaven at 10:00 (the HUD layer claimed, R3D stepped aside)', async () => {
      day = await page.evaluate(() => { S.stage('oakhaven', 20.5, 29.2, -1.25, 10 / 24); S.frame(); return { active: R11.active(), r3d: R3D.active(), claim: GPU18.hudClaim() === R11, cls: document.getElementById('game').classList.contains('r11-on'), sky: S.mean(40, 10, 280, 50), ground: S.mean(40, 110, 280, 145) }; });
      assert.ok(day.active && !day.r3d && day.claim && day.cls, JSON.stringify(day));
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11core-oakhaven-1000.png') });
    });
    await step('R11 draws Oakhaven at 22:00, darker than by day', async () => {
      night = await page.evaluate(() => { S.stage('oakhaven', 20.5, 29.2, -1.25, 22 / 24); S.frame(); return { active: R11.active(), sky: S.mean(40, 10, 280, 50), ground: S.mean(40, 110, 280, 145) }; });
      assert.ok(night.active);
      const L = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      console.log('  sky day ' + L(day.sky).toFixed(1) + ' night ' + L(night.sky).toFixed(1) + '; ground day ' + L(day.ground).toFixed(1) + ' night ' + L(night.ground).toFixed(1));
      assert.ok(L(day.sky) > 60 && L(night.sky) < L(day.sky) * 0.6 && L(night.ground) < L(day.ground) * 0.7, JSON.stringify({ day, night }));
      await page.screenshot({ path: path.join(SHOT_DIR, 'r11core-oakhaven-2200.png') });
    });
    await step('the world has geometry, merged by material: the world\'s own draw calls at Phone tier stay within ~60', async () => {
      const r = await page.evaluate(() => { S.stage('oakhaven', 20.5, 29.2, -1.25, 10 / 24); S.frame(); return { world: R11.worldDraws(), meshes: R11.stats.worldMeshes, tris: R11.stats.tris, frame: R11.stats.draws }; });
      console.log('  Oakhaven, Phone tier: world draws ' + r.world + ' (' + r.meshes + ' material meshes, ' + r.tris + ' triangles); whole frame ' + r.frame + ' draw calls');
      assert.ok(r.tris > 1000 && r.meshes >= 4 && r.world <= 60, JSON.stringify(r));
    });
    await step('Pixel hands the frame back (the raycaster draws) and Realistic takes it again, live; stored merged', async () => {
      const r = await page.evaluate(() => {
        R11.setStyle('pixel'); S.frame();
        const a = { active: R11.active(), owns: R11.owns(), cls: document.getElementById('game').classList.contains('r11-on'), claim: GPU18.hudClaim() === R11 };
        const stored = JSON.parse(localStorage.getItem('octave.r11.v1'));
        R11.setStyle('realistic'); S.frame();
        const b = { active: R11.active(), cls: document.getElementById('game').classList.contains('r11-on') };
        return { a, b, stored, stored2: JSON.parse(localStorage.getItem('octave.r11.v1')) };
      });
      assert.deepStrictEqual(r.a, { active: false, owns: false, cls: false, claim: false });
      assert.deepStrictEqual(r.b, { active: true, cls: true });
      assert.strictEqual(r.stored.style, 'pixel'); assert.deepStrictEqual(r.stored.bench, { keep: 1 });
      assert.strictEqual(r.stored2.style, 'realistic'); assert.deepStrictEqual(r.stored2.bench, { keep: 1 });
    });
    await step('Pixel with R3D on: R3D draws again (R11 steps aside both ways)', async () => {
      const r = await page.evaluate(() => {
        R3D.setMode('on', { noSave: true });
        R11.setStyle('pixel'); S.frame();
        const a = { r11: R11.active(), r3d: R3D.active() };
        R11.setStyle('realistic'); S.frame();
        const b = { r11: R11.active(), r3d: R3D.active() };
        R3D.setMode('off', { noSave: true }); S.frame();
        return { a, b };
      });
      assert.deepStrictEqual(r, { a: { r11: false, r3d: true }, b: { r11: true, r3d: false } });
    });
    await step('Options: the "Art style" row toggles Realistic / Pixel', async () => {
      const r = await page.evaluate(() => {
        if (!document.getElementById('r11-artstyle') && typeof renderAccessibilityMenu === 'function') { try { renderAccessibilityMenu(); } catch (e) { /* none */ } }
        const b = document.getElementById('r11-artstyle'); if (!b) return { found: false };
        const t0 = b.textContent; b.click(); const t1 = b.textContent, s1 = R11.style(); b.click();
        return { found: true, t0, t1, s1, s2: R11.style(), label: (document.getElementById('r11-artstyle-label') || {}).textContent || '' };
      });
      assert.ok(r.found, 'row not found');
      assert.deepStrictEqual([r.t0, r.t1, r.s1, r.s2], ['Realistic', 'Pixel', 'pixel', 'realistic']);
      await page.evaluate(() => { try { closeModal(); } catch (e) { /* none */ } });
    });
    await step('entities: every entity the engine would draw within range is a billboard', async () => {
      const r = await page.evaluate(() => {
        const out = [];
        for (const [x, y, d] of [[20.5, 29.2, -1.25], [45.5, 23.5, -0.6], [23.5, 4.5, 1.57]]) { S.stage('oakhaven', x, y, d, 10 / 24); S.frame(); out.push([R11.stats.billboards, S.expectedBillboards()]); }
        S.stage('tavern', 8.5, 10.5, -1.57, 0.85); S.frame(); out.push([R11.stats.billboards, S.expectedBillboards()]);
        return out;
      });
      console.log('  billboards vs expected: ' + JSON.stringify(r));
      for (const [a, b] of r) assert.strictEqual(a, b);
      assert.ok(r[0][0] > 20);
    });
    await step('memory: loadMap away and back 5 times does not grow geometries or textures', async () => {
      const r = await page.evaluate(() => {
        const visit = (id, x, y) => { S.stage(id, x, y, 0, 0.45); S.frame(); };
        // a warm-up visit to every map of the loop first: CORE's shared texture caches (game textures for decals and
        // gate lattices, gameTex) fill on a texture's first use and are kept for good, which is not growth. Oakhaven's
        // North Gate door cell is hidden by js/r11gate.js (it draws its own gate), so two of them are first used in the
        // deepwoods; without this visit the baseline is taken before they exist.
        visit('oakhaven', 20.5, 29.2); visit('tavern', 8.5, 10.5); visit('deepwoods', 27.5, 30.5); visit('oakhaven', 20.5, 29.2);
        const m0 = R11.memory();
        for (let i = 0; i < 5; i++) { visit('tavern', 8.5, 10.5); visit('deepwoods', 27.5, 30.5); visit('oakhaven', 20.5, 29.2); }
        return { m0, m1: R11.memory(), builds: R11.stats.builds };
      });
      console.log('  memory before ' + JSON.stringify(r.m0) + ' after ' + JSON.stringify(r.m1) + ' (' + r.builds + ' world builds)');
      assert.ok(r.m1.geometries <= r.m0.geometries && r.m1.textures <= r.m0.textures, JSON.stringify(r));
    });
    await step('no page errors (drawing, switching, memory)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- picking parity
  {
    const { page, errors } = await bootPage(browser, {});
    const res = await page.evaluate(() => {
      const out = { views: 0, picked: 0, same: 0, diffs: [], r11: 0 };
      for (const [id, nEnt] of [['oakhaven', 4], ['tavern', 3], ['deepwoods', 3]]) {
        S.stage(id, G.maps[id].spawn.x, G.maps[id].spawn.y, G.maps[id].spawn.dir || 0, 0.5);
        const m = G.map;
        const cands = G.ents.filter(e => e.sprite && !e.hidden && (e.kind === 'npc' || e.kind === 'deco' || e.kind === 'item' || e.kind === 'enemy'));
        const pickN = [];
        for (let i = 0; i < cands.length && pickN.length < nEnt; i += Math.max(1, Math.floor(cands.length / nEnt))) pickN.push(cands[i]);
        for (const e of pickN) {
          let sx = null, sy = null;
          for (let k = 0; k < 8 && sx === null; k++) { const a = k * Math.PI / 4, x = e.x + Math.cos(a) * 1.6, y = e.y + Math.sin(a) * 1.6; if (x > 1 && y > 1 && x < m.w - 1 && y < m.h - 1 && !m.isSolidCell(x | 0, y | 0)) { sx = x; sy = y; } }
          if (sx === null) continue;
          const face = Math.atan2(e.y - sy, e.x - sx);
          for (const dy of [-0.4, -0.1, 0, 0.25]) for (const pitch of [-40, 0, 30]) {
            const set = () => { Engine.cam.x = sx; Engine.cam.y = sy; Engine.cam.dir = face + dy; Engine.cam.pitch = pitch; Engine.cam.bob = 0; };
            R11.setStyle('pixel'); set(); S.frame();
            const cpu = [Engine.pick(G.ents, 2.6), Engine.pick(G.ents, 14)];
            R11.setStyle('realistic'); set(); S.frame();
            if (R11.active()) out.r11++;
            const r11 = [Engine.pick(G.ents, 2.6), Engine.pick(G.ents, 14)];
            for (let k = 0; k < 2; k++) {
              out.views++; if (cpu[k]) out.picked++;
              if (cpu[k] === r11[k]) out.same++;
              else if (out.diffs.length < 6) out.diffs.push({ id, pitch, dy, k, cpu: cpu[k] && cpu[k].sprite, r11: r11[k] && r11[k].sprite });
            }
          }
        }
      }
      return out;
    });
    console.log('  pick grid: ' + res.views + ' picks, ' + res.picked + ' found something in Pixel, ' + res.same + ' identical under R11 (' + res.r11 + ' R11 frames)');
    await step('picking: Engine.pick under R11 gives the Pixel style\'s answer on every view of the grid', async () => {
      assert.ok(res.picked > 15, 'too few picks to mean anything: ' + res.picked);
      assert.ok(res.r11 * 2 === res.views, 'R11 did not draw every view');
      assert.strictEqual(res.same, res.views, JSON.stringify(res.diffs));
    });
    await step('Engine.depthAt under R11 answers from the same virtual frame (sky far, ground near)', async () => {
      const r = await page.evaluate(() => { S.stage('oakhaven', 20.5, 29.2, -1.25, 0.45, 0); S.frame(); return { sky: Engine.depthAt(160, 10), ground: Engine.depthAt(160, 140), mat: Engine.materialAt(160, 140), skyMat: Engine.materialAt(160, 10) }; });
      assert.ok(r.sky >= 1e8 && r.ground < 6 && r.mat === 5 && r.skyMat === 1, JSON.stringify(r));
    });
    await step('no page errors (picking)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- a walk
  {
    const { page, errors } = await bootPage(browser, {});
    const r = await page.evaluate(() => {
      S.stage('oakhaven', 20.5, 29.2, -1.25, 0.6);
      R11.paused = true;
      let drawn = 0;
      for (let i = 0; i < 30; i++) {
        G.keys = {}; if (i < 18) G.keys.w = true; else if (i < 24) G.keys.a = true; else G.keys.d = true;
        if (i % 5 === 0) look(20, i % 10 ? 6 : -6);
        update(1 / 30);
        if (R11.renderOnce()) drawn++;
      }
      R11.paused = false;
      return { drawn, active: R11.active(), x: Engine.cam.x, frames: R11.stats.frames };
    });
    await step('a scripted 30-step walk with R11.renderOnce() draws every step', async () => { assert.strictEqual(r.drawn, 30, JSON.stringify(r)); });
    await step('no page errors (walk)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- automation default
  {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(URL + '/?nosw=1', { timeout: 600000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 600000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ owns: R11.owns(), ready: R11.ready, canvas: !!document.getElementById('r11-gl') }));
    await step('under automation without the opt-in R11 stays off (no context, no canvas): the suite runs unchanged', async () => { assert.deepStrictEqual(r, { owns: false, ready: false, canvas: false }); });
    await step('no page errors (automation default)', async () => { assert.deepStrictEqual(errs, []); });
    await page.close();
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
