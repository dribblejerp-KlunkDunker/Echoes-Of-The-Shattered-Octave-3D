// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:4101 node test/r3d21.test.js
// Covers js/r3d21.js (Phase 21, team CORE): the true 3D WebGL2 renderer R3D.
//   - switching: booting with the renderer off and turning it on (and back), the Options rows, the Original preset,
//     no WebGL2 at all (getContext stubbed), a lost context and its recovery
//   - gameplay parity: a seeded trace of play (movement, turning, combat, AI) with R3D on and off is identical
//   - picking parity: Engine.pick under R3D answers exactly what the CPU raycaster answers, on a grid of view
//     directions (yaw x pitch) in flat and relief maps; the CPU relief depth R3D reproduces matches the CPU's dbuf
//   - geometry: every map builds a mesh and draws without errors; doors and gates animate from map.doors
//   - the camera: free look past the old 40 rows under R3D, the comfort cap, the CPU's widened range, Original's old range
//   - frame cost (SwiftShader here: correctness only, its timings are not GPU timings) and no page errors
// Headless Chromium here has only SwiftShader (a software WebGL2). R3D's auto mode stays off under automation; the page
// opts in with window.__r3d21 = { automation: true, force: true }.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4101';
const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'r3d21-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
async function step(text, fn) { try { await fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? String(e.message).split('\n')[0] : e)); } }

async function bootPage(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /r3d21|render override|render hook/.test(m.text()))) errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/r3d21.js*', r => r.abort());
  if (opts.init) await page.addInitScript(opts.init);
  const r3d = opts.r3d || { automation: true, force: true };
  const mode = opts.mode || 'on';
  await page.addInitScript(([o, mode]) => { window.__r3d21 = o; try { localStorage.setItem('octave.r3d21.v1', JSON.stringify({ mode, cap: 80 })); } catch (e) { /* none */ } }, [r3d, mode]);
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 300000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 300000 });
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
  S.mode = (m) => R3D.setMode(m, { noSave: true });
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // ---------------------------------------------------------------- switching
  {
    const { page, errors } = await bootPage(browser, { mode: 'off', r3d: { automation: true } });
    await step('booted with the renderer off: no GL context, the classic raycaster draws', async () => {
      const r = await page.evaluate(() => { S.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5); S.frame(); return { shown: R3D.shown(), active: R3D.active(), gl: !!R3D.gl(), r3d: GFX.r3d }; });
      assert.deepStrictEqual(r, { shown: false, active: false, gl: false, r3d: false });
    });
    await step('setMode("on") after booting off makes a context, CORE programs and passes, and draws (no recursion)', async () => {
      const r = await page.evaluate(() => { const m = S.mode('on'); S.frame(); return { m, shown: R3D.shown(), active: R3D.active(), passes: R3D.passes().map(p => p.name).join(','), warned: Object.keys(R3D.st.warned) }; });
      assert.strictEqual(r.m, 'on'); assert.ok(r.shown && r.active, JSON.stringify(r));
      // CORE's passes are present and in order; team passes (BODY's 'body', 'feel'...) may sit between them
      const core = ['sky', 'prepass', 'world', 'sprites', 'transparent', 'post'], names = r.passes.split(',');
      const idx = core.map(n => names.indexOf(n));
      assert.ok(idx.every(i => i >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]), r.passes);
      assert.deepStrictEqual(r.warned, []);
    });
    await step('the HUD layer is claimed while R3D shows and released when it stops', async () => {
      const r = await page.evaluate(() => {
        const a = { claim: GPU18.hudClaim() === R3D, ctx: Engine.ctx === GPU18.layers().hudCtx, cls: document.getElementById('game').classList.contains('r3d21-on') };
        S.mode('off'); S.frame();
        const b = { claim: GPU18.hudClaim(), ctxView: Engine.ctx === GPU18.layers().viewCtx || !GPU18.active(), cls: document.getElementById('game').classList.contains('r3d21-on') };
        S.mode('on'); S.frame();
        return { a, b };
      });
      assert.deepStrictEqual(r.a, { claim: true, ctx: true, cls: true });
      assert.deepStrictEqual(r.b, { claim: null, ctxView: true, cls: false });
    });
    await step('the Original preset always uses the classic raycaster (and the old 40-row look)', async () => {
      const r = await page.evaluate(() => { PRESETS.apply('original'); S.frame(); const a = { shown: R3D.shown(), lim: R3D.camera.limit(), want: Math.atan(40 / R3D.FX) }; PRESETS.apply('medium'); S.frame(); return Object.assign(a, { back: R3D.shown() }); });
      assert.strictEqual(r.shown, false); assert.ok(Math.abs(r.lim - r.want) < 1e-9); assert.strictEqual(r.back, true);
    });
    await step('Options: the "3D renderer" and "Look range" rows appear and switch', async () => {
      const r = await page.evaluate(() => {
        renderAccessibilityMenu();
        const b = document.getElementById('r3d-mode'), c = document.getElementById('r3d-cap');
        if (!b || !c) return { missing: true };
        const t0 = b.textContent; b.click(); const off = R3D.shown(); b.click(); const on = R3D.shown();
        const c0 = R3D.camera.limit(); c.click(); const c1 = R3D.camera.limit(); c.click();
        closeModal(); G.state = 'play';
        return { t0, off, on, c0: Math.round(c0 * 180 / Math.PI), c1: Math.round(c1 * 180 / Math.PI) };
      });
      assert.ok(!r.missing, 'rows missing'); assert.strictEqual(r.off, false); assert.strictEqual(r.on, true);
      assert.strictEqual(r.c0, 80); assert.strictEqual(r.c1, 45);
    });
    await step('free look: mouse, touch drag and the gamepad right stick pitch past the old 40 rows under R3D; the comfort cap holds 45 degrees', async () => {
      const r = await page.evaluate(() => {
        S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); S.frame(); G.state = 'play';
        const deg = () => Math.round(R3D.camera.angle() * 180 / Math.PI);
        const out = {};
        // mouse: look() as the game calls it (vertical input halved by the game)
        for (let i = 0; i < 60; i++) look(0, 40 * 0.5);
        out.mouseDown = deg(); Engine.cam.pitch = 0;
        // touch: a drag on the right half of the view
        const v = document.getElementById('view'), r0 = v.getBoundingClientRect();
        const ev = (type, x, y) => v.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, clientX: x, clientY: y, bubbles: true, cancelable: true }));
        const x0 = r0.left + r0.width * 0.75, y0 = r0.top + r0.height * 0.2;
        ev('pointerdown', x0, y0); for (let i = 1; i <= 20; i++) ev('pointermove', x0, y0 - i * 12); ev('pointerup', x0, y0 - 240);
        out.touchUp = deg(); Engine.cam.pitch = 0;
        // gamepad: right stick down (axes[3] > 0 looks down, as the stick convention)
        const pads = [{ connected: true, axes: [0, 0, 0, 0.9], buttons: [] }];
        const gp = navigator.getGamepads; navigator.getGamepads = () => pads;
        for (let i = 0; i < 12; i++) R3D._padTick(1000 + i * 100);
        navigator.getGamepads = gp;
        out.padDown = deg();
        // comfort cap
        R3D.st.cap = 45; for (let i = 0; i < 80; i++) look(0, 40); out.capped = deg(); R3D.st.cap = 80; Engine.cam.pitch = 0;
        out.old = Math.round(Math.atan(40 / R3D.FX) * 180 / Math.PI);
        return out;
      });
      assert.ok(r.mouseDown <= -60, 'mouse ' + JSON.stringify(r));
      assert.ok(r.touchUp >= 30, 'touch ' + JSON.stringify(r));
      assert.ok(r.padDown <= -30, 'pad ' + JSON.stringify(r));
      assert.strictEqual(r.capped, -45, 'cap ' + JSON.stringify(r));
    });
    await step('no page errors (switching)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- no WebGL2
  {
    const { page, errors } = await bootPage(browser, { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') return null; return g.call(this, t, a); }; } });
    await step('without WebGL2: R3D is unavailable, the raycaster draws, setMode("on") changes nothing', async () => {
      const r = await page.evaluate(() => { S.stage('tavern', 8.5, 10.5, -1.57, 0.85); S.frame(); S.mode('on'); S.frame(); renderAccessibilityMenu(); const t = (document.getElementById('r3d-mode') || {}).textContent; closeModal(); return { avail: R3D.available(), shown: R3D.shown(), t }; });
      assert.deepStrictEqual(r, { avail: false, shown: false, t: 'Not available' });
    });
    await step('no page errors (no WebGL2)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- lost context
  {
    const { page, errors } = await bootPage(browser, {});
    await step('a lost context falls back to the raycaster at once; a restored one comes back with its passes', async () => {
      const r = await page.evaluate(async () => {
        S.stage('oakhaven', 23.5, 6.5, Math.PI / 2, 0.5); S.frame();
        const ext = R3D.gl().getExtension('WEBGL_lose_context');
        if (!ext) return { skip: true };
        ext.loseContext(); await new Promise(r => setTimeout(r, 300)); S.frame();
        const lost = { shown: R3D.shown(), lost: R3D.st.lost };
        ext.restoreContext(); await new Promise(r => setTimeout(r, 600)); S.frame(); S.frame();
        return { lost, back: R3D.shown(), active: R3D.active(), warned: Object.keys(R3D.st.warned).filter(k => !/^(lost|frame)$/.test(k)) };
      });
      if (r.skip) return;
      assert.deepStrictEqual(r.lost, { shown: false, lost: true });
      assert.strictEqual(r.back, true); assert.strictEqual(r.active, true); assert.deepStrictEqual(r.warned, []);
    });
    await step('no page errors (lost context)', async () => { assert.deepStrictEqual(errors.filter(e => !/CONTEXT_LOST|context lost/i.test(e)), []); });
    await page.close();
  }

  // ---------------------------------------------------------------- the classic path is untouched
  {
    // frames hashed at fixed cameras on the CPU: a page without js/r3d21.js against one with it (Original, and Medium with
    // the renderer set to Classic)
    const hashes = async (opts) => {
      const { page, errors } = await bootPage(browser, opts);
      const h = await page.evaluate(() => {
        const out = {};
        const cap = { fb: null }; Engine.addPostHook(F => { cap.fb = F.fb; }, 1e9);
        const hash = () => { let x = 0x811c9dc5 | 0; const f = cap.fb; for (let i = 0; i < f.length; i++) x = Math.imul(x ^ f[i], 16777619) | 0; return x >>> 0; };
        for (const preset of ['original', 'medium']) {
          PRESETS.apply(preset);
          for (const [id, x, y, d, tod, pitch] of [['oakhaven', 23.5, 6.5, Math.PI / 2, 0.5, 0], ['tavern', 8.5, 10.5, -1.57, 0.85, 12], ['deepwoods', 27.5, 30.5, -1.57, 0.95, -20]]) {
            S.stage(id, x, y, d, tod, pitch);
            S.pin(() => { for (const e of G.ents) { e.animSprite = e.animSprite || null; } Engine.render(G.ents, G.tod); });
            out[preset + '/' + id] = hash();
          }
        }
        return out;
      });
      await page.close();
      return { h, errors };
    };
    const det = () => { window.requestAnimationFrame = () => 0; let c = 1000; performance.now = () => (c += 0.25); Date.now = () => 1700000000000 + c; };
    const without = await hashes({ block: true, mode: 'off', init: det }), withOff = await hashes({ mode: 'off', r3d: { automation: true }, init: det });
    await step('the classic raycaster draws the same frames with js/r3d21.js loaded (renderer Classic; Original preset)', async () => {
      assert.deepStrictEqual(withOff.h, without.h);
    });
    await step('no page errors (classic path)', async () => { assert.deepStrictEqual(withOff.errors, []); });
  }

  // ---------------------------------------------------------------- geometry: every map, doors and gates
  {
    const { page, errors } = await bootPage(browser, {});
    await step('every map builds its mesh and draws a frame under R3D without a warning', async () => {
      const r = await page.evaluate(() => {
        const bad = [], info = {};
        for (const id of Object.keys(G.maps)) {
          const sp = G.maps[id].spawn;
          try { S.stage(id, sp.x, sp.y, sp.dir || 0, 0.45); S.frame(); } catch (e) { bad.push(id + ': ' + e.message); continue; }
          if (!R3D.active()) bad.push(id + ': not drawn');
          const mi = R3D.mesh(); if (!mi || mi.map !== G.mapId || !(mi.tris > 0)) bad.push(id + ': no mesh');   // (the Kestrel's maps send you on to Whisper-Grove)
          info[id] = mi && mi.tris;
        }
        return { bad, warned: Object.keys(R3D.st.warned), n: Object.keys(info).length };
      });
      assert.ok(!r.bad.length && !r.warned.length, JSON.stringify({ bad: r.bad, warned: r.warned })); assert.ok(r.n >= 40, 'maps: ' + r.n);
    });
    await step('doors: a leaf is drawn from map.doors (shut, sliding, swung) and is gone when fully open', async () => {
      const r = await page.evaluate(() => {
        S.stage('tavern', 8.5, 10.5, -1.57, 0.85);
        const keys = Object.keys(G.map.doors); const d = G.map.doors[keys[0]];
        const out = {};
        d.open = 0; S.frame(); out.shut = R3D.dynamicTris();
        d.open = 0.5; GFX.swingDoors = false; S.frame(); out.slide = R3D.dynamicTris();
        GFX.swingDoors = true; d._sw = 0; S.frame(); out.swing = R3D.dynamicTris();
        d.open = 1; S.frame(); out.open = R3D.dynamicTris();
        d.open = 0; d._sw = 0; S.frame();
        return out;
      });
      assert.ok(r.shut >= 4 && r.slide >= 4 && r.swing >= 4, JSON.stringify(r));
      assert.ok(r.open < r.shut, JSON.stringify(r));
    });
    await step('gates: an opening gate is the lifted lattice, not a leaf', async () => {
      const r = await page.evaluate(() => {
        if (typeof GATES === 'undefined') return { skip: true };
        for (const id of Object.keys(G.maps)) {
          const gs = GATES.gatesOf(G.maps[id]).filter(g => g.or); if (!gs.length) continue;
          const g = gs[0], sp = G.maps[id].spawn;
          S.stage(id, sp.x, sp.y, sp.dir || 0, 0.5);
          const d = G.map.doors[g.ci]; const base = R3D.dynamicTris();
          d.open = 0.4; S.frame(); const lifted = R3D.dynamicTris();
          d.open = 0; S.frame();
          return { id, base, lifted };
        }
        return { skip: true };
      });
      if (r.skip) return;
      assert.ok(r.lifted > 0, JSON.stringify(r));
    });
    await step('no page errors (geometry)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- frame cost (reported; SwiftShader is not a GPU)
  {
    const { page, errors } = await bootPage(browser, {});
    const m = await page.evaluate(() => R3D.measure({ scenes: [{ id: 'oakhaven', map: 'oakhaven', x: 23.5, y: 20.5, dir: -1.57, tod: 0.73 }, { id: 'tavern', map: 'tavern', x: 8.5, y: 10.5, dir: -1.57, tod: 0.85 }], presets: ['medium', 'cinematic'], frames: 6, runs: 1 }));
    console.log('  frame cost, ms per game frame with 12 enemies (' + m.renderer + ', ' + m.size + '): ' + JSON.stringify({ oakhaven: m.oakhaven, tavern: m.tavern }));
    await step('frame cost measured for R3D and the CPU path in Medium and Cinematic (numbers reported, not judged on SwiftShader)', async () => {
      for (const sc of ['oakhaven', 'tavern']) for (const k of ['medium/cpu', 'medium/r3d', 'cinematic/cpu', 'cinematic/r3d']) assert.ok(m[sc][k] > 0 && m[sc][k] < 1e4, sc + ' ' + k + ' ' + m[sc][k]);
    });
    await step('no page errors (frame cost)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- picking parity
  {
    const { page, errors } = await bootPage(browser, {});
    // For each scene: stand 1.6 units from a few entities, sweep yaw and pitch; render once on the CPU and once with R3D at
    // the very same camera, and ask Engine.pick at two reaches (USE_RANGE and the HUD's 14). Also compare the relief depth
    // R3D reproduces with the CPU's own dbuf on a grid of pixels of each CPU frame.
    const res = await page.evaluate(() => {
      const out = { views: 0, picked: 0, same: 0, diffs: [], depthN: 0, depthBad: 0, depthEx: [] };
      const maps = [['tavern', 4], ['oakhaven', 4], ['deepwoods', 3], ['clearing', 3], ['quarry', 3], ['cantabile_harbour', 3]];
      for (const [id, nEnt] of maps) {
        S.stage(id, G.maps[id].spawn.x, G.maps[id].spawn.y, G.maps[id].spawn.dir || 0, 0.5);
        const m = G.map;
        const cands = G.ents.filter(e => e.sprite && !e.hidden && (e.kind === 'npc' || e.kind === 'deco' || e.kind === 'item' || e.kind === 'enemy'));
        const pickN = [];
        for (let i = 0; i < cands.length && pickN.length < nEnt; i += Math.max(1, Math.floor(cands.length / nEnt))) pickN.push(cands[i]);
        for (const e of pickN) {
          // a free spot 1.6 away
          let sx = null, sy = null;
          for (let k = 0; k < 8 && sx === null; k++) { const a = k * Math.PI / 4, x = e.x + Math.cos(a) * 1.6, y = e.y + Math.sin(a) * 1.6; if (x > 1 && y > 1 && x < m.w - 1 && y < m.h - 1 && !m.isSolidCell(x | 0, y | 0)) { sx = x; sy = y; } }
          if (sx === null) continue;
          const face = Math.atan2(e.y - sy, e.x - sx);
          for (const dy of [-0.4, -0.1, 0, 0.25]) for (const pitch of [-40, -15, 0, 30]) {
            const set = () => { Engine.cam.x = sx; Engine.cam.y = sy; Engine.cam.dir = face + dy; Engine.cam.pitch = pitch; Engine.cam.bob = 0; Engine.cam.z = (m.groundAt ? m.groundAt(sx, sy) : 0) + 0.5; };
            S.mode('off'); set(); S.frame();
            const cpu = [Engine.pick(G.ents, 2.6), Engine.pick(G.ents, 14)];
            // depth grid on relief maps
            const S1 = Engine.getScale(), dep = [];
            if (m.relief) for (let y = 4; y < 150; y += 13) for (let x = 3; x < 320; x += 29) { const mt = Engine.materialAt(x, y); if (mt === 6 || mt === 8) continue; dep.push([x, y, Engine.depthAt(x, y)]); }
            S.mode('on'); set(); S.frame();
            const gpu = [Engine.pick(G.ents, 2.6), Engine.pick(G.ents, 14)];
            for (let k = 0; k < 2; k++) {
              out.views++; if (cpu[k]) out.picked++;
              if (cpu[k] === gpu[k]) out.same++;
              else if (out.diffs.length < 6) out.diffs.push({ id, pitch, dy, k, cpu: cpu[k] && cpu[k].sprite, gpu: gpu[k] && gpu[k].sprite });
            }
            for (const [x, y, d] of dep) {
              const r = R3D.reliefDepth(x * S1, y * S1);
              out.depthN++;
              const ok = (d >= 1e8 && r >= 1e8) || Math.abs(d - r) < 1e-3 * Math.max(1, d);
              if (!ok) { out.depthBad++; if (out.depthEx.length < 6) out.depthEx.push({ id, x, y, cpu: d, r3d: r }); }
            }
          }
        }
      }
      return out;
    });
    console.log('  pick grid: ' + res.views + ' picks, ' + res.picked + ' found something on the CPU, ' + res.same + ' identical; relief depth samples ' + res.depthN + ', mismatched ' + res.depthBad);
    await step('picking: Engine.pick under R3D gives the raycaster\'s answer on every view of the grid', async () => {
      assert.ok(res.picked > 20, 'too few picks to mean anything: ' + res.picked);
      assert.strictEqual(res.same, res.views, JSON.stringify(res.diffs));
    });
    await step('relief depth: R3D\'s port of the CPU column walk matches the CPU dbuf (geometry pixels)', async () => {
      assert.ok(res.depthN > 500, 'too few samples');
      assert.ok(res.depthBad <= res.depthN * 0.002, res.depthBad + ' of ' + res.depthN + ' ' + JSON.stringify(res.depthEx));
    });
    await step('no page errors (picking)', async () => { assert.deepStrictEqual(errors, []); });
    await page.close();
  }

  // ---------------------------------------------------------------- gameplay parity: seeded traces
  {
    const trace = async (mode) => {
      // deterministic from the first line of script: no live game loop (every frame is ours), a fixed clock
      const { page, errors } = await bootPage(browser, { mode, init: () => { window.requestAnimationFrame = () => 0; let c = 1000; performance.now = () => (c += 0.25); Date.now = () => 1700000000000 + c; } });
      const t = await page.evaluate((mode) => {
        S.mode(mode);
        // a deterministic clock and RNG from here on; count every Math.random call
        let clock = 5000000, sd = 99991, calls = 0;
        performance.now = () => clock; Date.now = () => 1700000000000 + clock;
        Math.random = () => { calls++; return (sd = (sd * 16807) % 2147483647) / 2147483647; };
        G.state = 'paused'; G.day = 2; G.tod = 0.4; loadMap('deepwoods', { x: 27.5, y: 30.5, dir: -1.57 }); G.fadeT = 0; G.state = 'play';
        try { Weather.hold('clear'); } catch (e) { /* none */ }
        Engine.cam.pitch = 0; Engine.cam.bob = 0;
        // the boot ran the live loop for a moment: put back every clock and meter it could have moved
        const p0 = G.player; p0.hp = p0.hpMax; p0.fat = p0.fatMax; p0.voice = p0.voiceMax;
        G.noise = 2; G.stillT = 0; G.hurtT = 0; G.attack.t = 0; G.song.t = 0; G.songFx = 0; G.keys = {}; G.touch.fx = G.touch.fy = 0;
        if (typeof G.time === 'number') G.time = 100;
        if (typeof UPG === 'object' && UPG) UPG._ambT = 4;   // the ambient birds' timer
        const rows = [], r6 = (v) => Math.round(v * 1e6) / 1e6;
        for (let i = 0; i < 480; i++) {
          G.keys = {};
          if (i < 140) G.keys.w = true; else if (i < 200) G.keys.a = true; else if (i < 260) G.keys.d = true; else if (i < 380) G.keys.w = true; else G.keys.s = true;
          if (i % 9 === 0) look(i % 18 === 0 ? 24 : -17, (i % 27 === 0) ? 14 : (i % 45 === 0 ? -20 : 0));
          if (i % 50 === 25) { try { attack('thrust'); } catch (e) { /* fine */ } }
          if (i % 70 === 35) { try { interact(); } catch (e) { /* fine */ } }
          clock += 1000 / 60;
          update(1 / 60); render();
          const c = Engine.cam, p = G.player;
          const ents = G.ents.filter(e => e.kind === 'enemy' || e.kind === 'npc').map(e => [r6(e.x), r6(e.y), e.hp, e.state || '', e.dead ? 1 : 0].join(',')).join(';');
          rows.push([i, r6(c.x), r6(c.y), r6(c.dir), r6(c.pitch), p.hp, r6(p.fat), r6(p.voice), r6(G.noise), G.mapId, calls, ents].join('|'));
        }
        return { rows, drew: R3D.active() };
      }, mode);
      await page.close();
      return { t, errors };
    };
    const a = await trace('off'), b = await trace('on');
    await step('seeded trace: 480 steps of play (moving, turning, looking up and down, striking, using) are identical with R3D on and off', async () => {
      assert.strictEqual(a.t.drew, false); assert.strictEqual(b.t.drew, true);
      let first = -1; for (let i = 0; i < a.t.rows.length; i++) if (a.t.rows[i] !== b.t.rows[i]) { first = i; break; }
      if (first >= 0) { const x = a.t.rows[first].split('|'), y = b.t.rows[first].split('|'); const fields = x.map((v, i) => v === y[i] ? null : i + ': ' + String(v).slice(0, 160) + ' vs ' + String(y[i]).slice(0, 160)).filter(Boolean); assert.fail('first difference at step ' + first + ' -- ' + fields.join(' ;; ')); }
    });
    await step('no page errors (traces)', async () => { assert.deepStrictEqual(a.errors.concat(b.errors), []); });
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
