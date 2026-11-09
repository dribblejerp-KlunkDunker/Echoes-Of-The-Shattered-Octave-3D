// PREVIEW_URL=http://127.0.0.1:4103 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/sprites21.test.js
// Phase 21 SPRITES (js/sprites21.js): the billboards, decals and particles R3D draws instead of the raycaster's sprite pass.
// Checks: the module is inert until a renderer attaches it (frames identical to a page with it blocked, Engine.render
// untouched); every sprite of the game fits the atlas (with its mips); the parity view (GL sprites over the raycaster with
// the raycaster's own projection) puts every sprite's screen rect on the raycaster's own rect, level and pitched, in the
// reference scenes, on relief maps and for directional enemies, and fills e._screen for the overlays; GL pixels really
// appear where the sprites are; shadows / marks / smoke / ghost / telegraph switches are honoured; gameplay traces are
// identical with the module working; no page errors; per-frame CPU cost. Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:4103';
const SHOTS = process.env.SHOTS_DIR || '';

async function boot(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /sprites21/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  if (opts.r3d) await page.addInitScript(() => { window.__r3d21 = { automation: true }; });
  if (opts.block) await page.route(process.env.S21_SAME ? /nothing-matches-this/ : /sprites21\.js/, (r) => r.abort());
  await page.goto(URL_ + '/?nosw=1', { timeout: 180000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 180000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Sprite Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    window.__stage = (map, x, y, dir, tod) => { G.state = 'paused'; loadMap(map, { x, y, dir }); G.fadeT = 0; G.tod = tod; Weather.hold('clear'); };
    window.__fr = () => { const pn = performance.now, dn = Date.now; performance.now = () => 123456; Date.now = () => 1700000000000; try { if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; } ANIM.last = 123.456; ANIM.T = 5; Engine.setTime(5); Engine.cam.bob = 0; render(); } finally { performance.now = pn; Date.now = dn; } };
    window.__hash = () => { let h = 2166136261 >>> 0; const d = Engine.ctx.getImageData(0, 0, Engine.canvas.width, Math.round(Engine.canvas.height * 0.75)).data; for (let i = 0; i < d.length; i += 3) h = Math.imul(h ^ d[i], 16777619) >>> 0; return h; };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    // ---------------------------------------------------------------- inert until attached
    const hashes = {};
    for (const block of [false, true]) {
      const { page, errors } = await boot(browser, { block });
      hashes[block ? 'blocked' : 'loaded'] = await page.evaluate(() => {
        const out = [];
        // (scenes whose frames are reproducible from page to page: outdoor weather and cinema dust follow boot timing)
        for (const [m, x, y, d, t, presets] of [['tavern', 8.5, 9.5, -1.57, 0.85, ['original', 'cinematic']], ['rootvault', 4.5, 5.5, 0, 0.5, ['original']]]) {
          for (const p of presets) { PRESETS.apply(p); __stage(m, x, y, d, t); Engine.cam.pitch = 0; __fr(); out.push(__hash()); }
        }
        return out;
      });
      if (!block) {
        const st = await page.evaluate(() => ({ canvas: !!document.getElementById('p21s-dev'), gl: SPRITES21.gl, frames: SPRITES21.stats.frames }));
        assert.equal(st.canvas, false); assert.equal(st.gl, null); assert.equal(st.frames, 0);
        assert.deepEqual(errors, []);
      }
      await page.close();
    }
    assert.deepEqual(hashes.loaded, hashes.blocked, 'frames differ with the module loaded but not attached');
    console.log('PASS inert: Original and Cinematic frames identical to a page with sprites21 blocked; no GL, no hooks until attached');

    const { page, errors } = await boot(browser);

    // ---------------------------------------------------------------- the atlas
    const atlas = await page.evaluate(() => {
      PRESETS.apply('medium'); __stage('oakhaven', 23.5, 8.5, Math.PI / 2, 0.5); __fr();
      if (!SPRITES21.dev.on()) return { ok: false };
      let n = 0, miss = 0, px = 0;
      for (const k in Engine.sprites) { const sp = Engine.sprites[k]; const en = SPRITES21.entryFor(sp); if (en) { n++; px += sp.w * sp.h; } else miss++; }
      const again = SPRITES21.stats.uploads; for (const k in Engine.sprites) SPRITES21.entryFor(Engine.sprites[k]);
      // a sprite whose pixels change is uploaded again
      const sp = Engine.sprites.lamp, en0 = SPRITES21.entryFor(sp), up0 = SPRITES21.stats.uploads;
      const copy = { ...sp, data: new Uint32Array(sp.data) }; SPRITES21.entryFor(copy); const up1 = SPRITES21.stats.uploads;
      return { ok: true, n, miss, px, pages: SPRITES21.pages, reupload: SPRITES21.stats.uploads - again, changed: up1 - up0, en0: !!en0, ev: SPRITES21.stats.evictions };
    });
    assert.ok(atlas.ok, 'WebGL2 parity view did not start');
    assert.equal(atlas.miss, 0); assert.equal(atlas.reupload, 1); assert.equal(atlas.changed, 1);
    assert.ok(atlas.pages <= 8);
    console.log(`PASS atlas: all ${atlas.n} sprites (${(atlas.px / 1e6).toFixed(2)} Mpx) placed on ${atlas.pages} pages of 1024x1024 with ${await page.evaluate(() => SPRITES21.consts.LEVELS)} mip levels, ${atlas.ev} evictions; found again by identity, re-uploaded when their pixels change`);

    // ---------------------------------------------------------------- parity: rects
    const SC = [
      ['oakhaven', 23.5, 8.5, Math.PI / 2, 0.5], ['oakhaven', 23.5, 6.5, Math.PI / 2, 0.73], ['tavern', 8.5, 9.5, -1.57, 0.85],
      ['deepwoods', 27.5, 14.5, Math.PI / 2, 0.02], ['whispergrove', 19.5, 9.6, Math.PI / 2, 0.75], ['rootvault', 4.5, 5.5, 0, 0.5],
      ['clearing', 20.5, 32.5, -Math.PI / 2, 0.3],
    ];
    const par = await page.evaluate((SC) => {
      const res = [];
      for (const pitch of [0, 22, -18]) for (const sc of SC) {
        SPRITES21.dev.off(); __stage(...sc); Engine.cam.pitch = pitch;
        // a few enemies around, facing different ways, so directional views and walk frames are in it
        for (let i = 0; i < 6; i++) { const types = ['proctor', 'hound', 'legionnaire', 'drowned', 'golem', 'tongueless']; const a = sc[3] + (i - 2.5) * 0.18, r = 2.5 + i * 0.9; const e = hydrate({ kind: 'enemy', type: types[i], x: sc[1] + Math.cos(a) * r, y: sc[2] + Math.sin(a) * r }); if (G.map.cells[(e.y | 0) * G.map.w + (e.x | 0)]) continue; e.facing = i * 1.1; G.ents.push(e); }
        __fr();
        const cpu = new Map(); for (const e of G.ents) if (e._screen) cpu.set(e, { ...e._screen });
        SPRITES21.dev.on(); __fr();
        let n = 0, worst = 0, missing = 0, extra = 0;
        for (const e of G.ents) {
          const a = cpu.get(e), b = e._screen;
          if (!a && !b) continue;
          if (a && !b) { if (a.y1 > 0 && a.y0 < 150 && a.x1 > 0 && a.x0 < 320 && a.z > 0.3) missing++; continue; }
          if (!a && b) { extra++; continue; }
          n++;
          // the raycaster rounds rows and columns to whole pixels of its (1x) frame
          const d = Math.max(Math.abs(a.x0 - b.x0), Math.abs(a.x1 - b.x1), Math.abs(a.y0 - b.y0), Math.abs(a.y1 - b.y1), Math.abs(a.z - b.z) * 10);
          if (d > worst) worst = d;
        }
        res.push({ map: sc[0], pitch, n, worst, missing, extra });
        for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy' && G.ents[i]._s21test !== false && !G.maps[G.mapId].entities.includes(G.ents[i])) G.ents.splice(i, 1);
      }
      SPRITES21.dev.off(); Engine.cam.pitch = 0;
      return res;
    }, SC);
    let total = 0, worst = 0;
    for (const r of par) {
      total += r.n; worst = Math.max(worst, r.worst);
      assert.ok(r.worst <= 2.01, `rect off by ${r.worst.toFixed(2)} px on ${r.map} pitch ${r.pitch}`);
      assert.equal(r.missing, 0, `${r.missing} sprites without a rect on ${r.map}`);
    }
    console.log(`PASS parity: ${total} sprite rects in ${par.length} views (7 scenes incl. relief maps, level and pitched +22/-18, directional enemies) within ${worst.toFixed(2)} logical px of the raycaster's; e._screen filled for every visible sprite`);

    // ---------------------------------------------------------------- GL pixels where the sprite is
    const pix = await page.evaluate(() => {
      __stage('oakhaven', 23.5, 8.5, Math.PI / 2, 0.5); Engine.cam.pitch = 0;
      SPRITES21.dev.on(); __fr();
      const g = SPRITES21.gl, c = SPRITES21.dev.canvas, harrow = G.ents.filter((e) => (e.kind === 'npc' || e.kind === 'enemy') && e._screen && e._screen.x0 > 20 && e._screen.x1 < 300).sort((a, b) => (b._screen.y1 - b._screen.y0) - (a._screen.y1 - a._screen.y0))[0];
      const s = harrow._screen, X = Math.round((s.x0 + s.x1) / 2 / 320 * c.width), Y = Math.round(c.height - ((s.y0 * 0.4 + s.y1 * 0.6) / 150 * c.height));
      const p = new Uint8Array(4); g.readPixels(X, Y, 1, 1, g.RGBA, g.UNSIGNED_BYTE, p);
      // hide him: the pixel shows what is behind
      harrow.hidden = true; __fr(); const q = new Uint8Array(4); g.readPixels(X, Y, 1, 1, g.RGBA, g.UNSIGNED_BYTE, q); harrow.hidden = false;
      return { p: [...p], q: [...q], n: SPRITES21.count };
    });
    assert.ok(Math.abs(pix.p[0] - pix.q[0]) + Math.abs(pix.p[1] - pix.q[1]) + Math.abs(pix.p[2] - pix.q[2]) > 20, 'no GL sprite pixels at the sprite');
    console.log('PASS GL pixels: the sprite is drawn where its rect says (' + pix.p.slice(0, 3) + ' vs background ' + pix.q.slice(0, 3) + ')');

    // ---------------------------------------------------------------- switches
    const sw = await page.evaluate(() => {
      __stage('oakhaven', 23.5, 8.5, Math.PI / 2, 0.5); SPRITES21.dev.on();
      const r = {};
      GFX.groundShadows = true; __fr(); r.shadowsOn = SPRITES21.stats.decals;
      GFX.groundShadows = false; __fr(); r.shadowsOff = SPRITES21.stats.decals; GFX.groundShadows = true;
      LOOK10.marks.add('blood', Engine.cam.x + Math.cos(Engine.cam.dir) * 2, Engine.cam.y + Math.sin(Engine.cam.dir) * 2, 0.3); __fr(); r.marksOn = SPRITES21.stats.decals;
      GFX.fightMarks = false; __fr(); r.marksOff = SPRITES21.stats.decals; GFX.fightMarks = true;
      // LIGHT's shadow maps: the billboards draw depth-only into a depth-only framebuffer without a GL error
      __fr();
      const g = SPRITES21.gl; g.getError();
      const fbo = g.createFramebuffer(), dt = g.createTexture(); g.bindTexture(g.TEXTURE_2D, dt); g.texStorage2D(g.TEXTURE_2D, 1, g.DEPTH_COMPONENT24, 256, 256);
      g.bindFramebuffer(g.FRAMEBUFFER, fbo); g.framebufferTexture2D(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.TEXTURE_2D, dt, 0); g.drawBuffers([g.NONE]); g.readBuffer(g.NONE);
      g.viewport(0, 0, 256, 256); g.clear(g.DEPTH_BUFFER_BIT);
      const c0 = SPRITES21.stats.calls; SPRITES21.drawCasters({ vp: SPRITES21.dev.view.vp, dir: [0.6, 0.8] });
      r.casterCalls = SPRITES21.stats.calls - c0; r.casterErr = g.getError(); r.fboOk = g.checkFramebufferStatus(g.FRAMEBUFFER) === g.FRAMEBUFFER_COMPLETE;
      g.bindFramebuffer(g.FRAMEBUFFER, null); g.deleteFramebuffer(fbo); g.deleteTexture(dt);
      return r;
    });
    assert.ok(sw.shadowsOn > sw.shadowsOff, 'shadows switch');
    assert.ok(sw.marksOn > sw.marksOff, 'marks switch');
    assert.ok(sw.fboOk && sw.casterCalls >= 1 && sw.casterErr === 0, 'shadow casters: ' + JSON.stringify(sw));
    console.log(`PASS switches: contact shadows (${sw.shadowsOn} decals on, ${sw.shadowsOff} off) and fight marks follow GFX.groundShadows / GFX.fightMarks; shadow casters draw depth-only for LIGHT (${sw.casterCalls} call(s), no GL error)`);

    // ---------------------------------------------------------------- gameplay untouched
    // the module's whole effect on the game is e._screen (which the raycaster writes too): entity state, the player and
    // the random stream are the same after its frames as before them
    const trace = await page.evaluate(() => {
      __stage('clearing', 20.5, 32.5, -Math.PI / 2, 0.3);
      for (let i = 0; i < 6; i++) { const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'golem'][i % 3], x: 18.5 + i, y: 28.5 }); e.state = 'chase'; G.ents.push(e); }
      SPRITES21.dev.on(); __fr();
      const snap = () => JSON.stringify(G.ents.map((e) => { const o = {}; for (const k in e) { if (k === '_screen' || k === 'def' || typeof e[k] === 'function' || (e[k] && typeof e[k] === 'object' && !Array.isArray(e[k]))) continue; o[k] = e[k]; } return o; })) + JSON.stringify(G.player) + JSON.stringify(G.flags);
      const before = snap(); let calls = 0; const r0 = Math.random; Math.random = () => { calls++; return r0(); };
      try { for (let i = 0; i < 10; i++) SPRITES21.frame(G.ents, SPRITES21.dev.view); } finally { Math.random = r0; }
      return { same: before === snap(), calls, n: G.ents.length };
    });
    assert.ok(trace.same, 'entity / player / flag state changed by SPRITES21.frame');
    assert.equal(trace.calls, 0, 'SPRITES21.frame consumed Math.random');
    console.log(`PASS gameplay: ${trace.n} entities, the player and the flags are unchanged by ten sprite frames, which take no random numbers`);

    // ---------------------------------------------------------------- cost
    const perf = await page.evaluate(() => {
      __stage('oakhaven', 23.5, 8.5, Math.PI / 2, 0.73); PRESETS.apply('cinematic'); SPRITES21.dev.on();
      for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['proctor', 'hound', 'legionnaire'][i % 3], x: 21 + (i % 4) * 1.2, y: 11 + Math.floor(i / 4) * 1.3 }); e.facing = i; G.ents.push(e); }
      for (let i = 0; i < 5; i++) __fr();
      const up0 = SPRITES21.stats.uploads;
      const ms = [], own = []; for (let i = 0; i < 30; i++) { Engine.cam.bob = 0; render(); ms.push(SPRITES21.stats.ms.frame); own.push(SPRITES21.stats.ms.own); }
      const uploads = SPRITES21.stats.uploads - up0, n = SPRITES21.count;
      // the machine these tests run on is shared and its timings swing several-fold: the module's CPU time is judged against
      // the raycaster's own frame measured in the same moments (the work R3D replaces), interleaved frame by frame
      const view = SPRITES21.dev.view, ownB = [], cpu = [];
      SPRITES21.dev.off();
      for (let i = 0; i < 30; i++) {
        let t = performance.now(); Engine.render(G.ents, G.tod); cpu.push(performance.now() - t);
        t = performance.now(); SPRITES21.frame(G.ents, view); ownB.push(SPRITES21.stats.ms.own);
      }
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      return { median: med(ms), own: med(own), ownB: med(ownB), cpu: med(cpu), n, calls: n.runs, uploads, parts: SPRITES21.stats.ms.parts };
    });
    assert.ok(perf.ownB < perf.cpu * 0.5 + 1, 'CPU collect too slow: ' + perf.ownB.toFixed(2) + ' ms of this module vs ' + perf.cpu.toFixed(2) + ' ms for the raycaster frame it replaces');
    assert.ok(perf.uploads <= 40, 'atlas churn: ' + perf.uploads + ' uploads in 30 steady frames');
    console.log(`PASS cost: ${perf.n.billboards} billboards, ${perf.n.decalVerts} decal vertices, ${perf.n.particles} particles in ${perf.n.runs} atlas run(s); CPU collect median ${perf.ownB.toFixed(2)} ms against ${perf.cpu.toFixed(2)} ms for the raycaster's whole frame in the same moments (parts ${JSON.stringify(perf.parts, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v)}), ${perf.uploads} atlas uploads in 30 frames of animation (SwiftShader host; GPU time not measurable here)`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'sprites21-parity.png') });

    // ---------------------------------------------------------------- under CORE's R3D
    if (typeof process.env.S21_NO_R3D === 'undefined') {
      const R = await boot(browser, { r3d: true });
      const r3 = await R.page.evaluate((SC) => {
        if (typeof R3D === 'undefined') return { none: true };
        const out = { views: 0, n: 0, worst: 0, missing: 0, attached: false, drawn: 0 };
        for (const sc of SC) {
          R3D.setMode('off'); __stage(...sc); Engine.cam.pitch = 0; __fr();
          const cpu = new Map(); for (const e of G.ents) if (e._screen && (e.kind === 'npc' || e.kind === 'enemy')) cpu.set(e, { ...e._screen });
          R3D.setMode('on'); __fr(); __fr();
          if (!R3D.active()) continue;
          out.views++; out.attached = SPRITES21.gl === R3D.frame.gl; out.drawn += SPRITES21.count.billboards;
          for (const [e, a] of cpu) {
            const b = e._screen; if (!b) { if (a.z > 0.3 && a.y1 > 0 && a.x1 > 0 && a.x0 < 320) out.missing++; continue; }
            out.n++; out.worst = Math.max(out.worst, Math.abs(a.x0 - b.x0), Math.abs(a.x1 - b.x1), Math.abs(a.y0 - b.y0), Math.abs(a.y1 - b.y1));
          }
        }
        // a free-look frame: looking 50 degrees down and 60 up draws without errors, rects follow the true camera
        R3D.camera.setAngle(-50 * Math.PI / 180); __fr(); out.down = SPRITES21.count.billboards + SPRITES21.count.decalVerts;
        R3D.camera.setAngle(60 * Math.PI / 180); __fr(); out.up = SPRITES21.count.billboards;
        R3D.camera.setAngle(0); out.warned = Object.keys(SPRITES21.stats.warned);
        return out;
      }, SC);
      if (r3.none) console.log('SKIP R3D: js/r3d21.js not loaded');
      else {
        assert.ok(r3.views >= 5, 'R3D did not draw: ' + JSON.stringify(r3));
        assert.ok(r3.attached && r3.drawn > 0, 'sprites21 not attached to R3D');
        assert.equal(r3.missing, 0); assert.ok(r3.worst <= 3.01, 'R3D rect off by ' + r3.worst);   // the raycaster truncates rows/columns of large near figures
        assert.deepEqual(r3.warned, []);
        assert.deepEqual(R.errors, []);
        console.log(`PASS R3D: attached to CORE's context; ${r3.n} figure rects in ${r3.views} reference views within ${r3.worst.toFixed(2)} px of the raycaster's at pitch 0; looking 50 down and 60 up draws cleanly`);
      }
      await R.page.close();
    }

    assert.deepEqual(errors, []);
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
