// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/enemy-fx.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers js/enemy-fx.js: a flinch frame for every enemy species, the hurt window
// and the return to the pose / side view, the Requiem's half-health shatter, the
// Brood-Mother shedding her sacs, loading a boss below half, on/off equivalence
// and frame cost. Screenshots go to ENEMYFX_SHOTS (default: the system temp dir).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.ENEMYFX_SHOTS || path.join(os.tmpdir(), 'enemy-fx-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const save = (name, dataUrl) => fs.writeFileSync(path.join(SHOTS, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof ENEMY_FX !== 'undefined' && typeof DIRECTIONS !== 'undefined' && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Flinch Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);

    const res = await page.evaluate(() => {
      const ok = (c, t) => { if (!c) throw new Error(t); };
      const out = {};
      const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      const toCanvas = sp => { const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sp.data.buffer.slice(0)), sp.w, sp.h), 0, 0); return c; };
      function sheet(rows, k) {
        let W = 0, H = 0; for (const r of rows) { let w = 0, h = 0; for (const s of r) { w += s.w * k + 6; h = Math.max(h, s.h * k); } W = Math.max(W, w); H += h + 6; }
        const o = document.createElement('canvas'); o.width = W; o.height = H; const g = o.getContext('2d'); g.fillStyle = '#4a4a5a'; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
        let y = 0; for (const r of rows) { let x = 0, hm = 0; for (const s of r) { g.drawImage(toCanvas(s), x, y, s.w * k, s.h * k); x += s.w * k + 6; hm = Math.max(hm, s.h * k); } y += hm + 6; }
        return o.toDataURL('image/png');
      }
      // a quiet scene: other enemies hidden, weather frozen
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      function scene() { loadMap('belfry', { x: 3.5, y: 7.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; for (const k in PART_STYLE) delete PART_STYLE[k]; PARTICLES.list = []; }
      const frozen = () => { Engine.setWeather({ haze: 0, dark: 0, flash: 0, cloud: 0, tint: [0, 0, 0] }); Engine.setTime(1); ANIM.dt = 0; ENEMY_FX.bits.length = 0; };
      const grab = () => { frozen(); Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data.slice(); };
      const spawn = (type, dist, extra) => { const c = Engine.cam, e = hydrate(Object.assign({ kind: 'enemy', type, x: c.x + Math.cos(c.dir) * dist, y: c.y + Math.sin(c.dir) * dist, transient: true }, extra)); e.hidden = false; G.ents.push(e); return e; };
      const drop = e => { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); };
      // face a creature so the camera sees it from `octant` * 45 degrees round
      const faceFor = (e, octant) => { e.facing = Math.atan2(Engine.cam.y - e.y, Engine.cam.x - e.x) - octant * Math.PI / 4; };
      scene(); GFX.enemyFx = true;

      // ---- 1. every species: a flinch frame, different from the art, in budget
      ENEMY_FX.clear();
      const species = ENEMY_FX.species(); ok(species.length >= 24, 'species list ' + species.length);
      const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
      let built = 0;
      for (const s of species) {
        for (const pose of POSES) {
          const src = Engine.sprites[s.sprite + pose]; if (!src) continue;
          const f = ENEMY_FX.flinch(src, s.symmetric); built++;
          ok(f.w === src.w && f.h === src.h && f.data.length === src.data.length, s.sprite + pose + ' keeps its size');
          ok(f.hs === src.hs && f.cx === src.cx && f.dy === src.dy, s.sprite + pose + ' keeps its anchor');
          let diff = 0, op = 0; for (let i = 0; i < src.data.length; i++) { if (f.data[i] !== src.data[i]) diff++; if (f.data[i] >>> 24 > 100) op++; }
          ok(diff > src.data.length * 0.01, s.sprite + pose + ' differs from its idle art (' + diff + ' px)');
          ok(op > 20, s.sprite + pose + ' flinch is not empty');
          ok(ENEMY_FX.flinch(src, s.symmetric) === f, s.sprite + pose + ' is cached');
        }
      }
      out.flinchFrames = built; out.bytesAll = ENEMY_FX.budgetBytes();
      ok(ENEMY_FX.budgetBytes() <= ENEMY_FX.cap, 'within budget: ' + ENEMY_FX.budgetBytes());
      for (const n of ['mites', 'hushmoth', 'horn']) ok(ENEMY_FX.symmetric.has(n), n + ' bursts');
      // sheet: idle | flinch for each species (idle pose)
      { const cur = []; for (const s of species) { const src = Engine.sprites[s.sprite]; cur.push(src, ENEMY_FX.flinch(src, s.symmetric)); }
        out.sheetFlinch = sheet([cur.slice(0, 16), cur.slice(16, 32), cur.slice(32)], 2); }
      ENEMY_FX.clear();

      // ---- 2. a hit: flinch for the hurt window, then the pose / side view
      const foe = spawn('legionnaire', 2.2); foe.state = 'idle'; faceFor(foe, 2);
      animCreature(foe, 0.016, ANIM.T + 0.016);
      const view = () => { GFX.enemyFx = false; const off = animDirectionalSprite(foe); GFX.enemyFx = true; return { off, on: animDirectionalSprite(foe) }; };
      let v = view();
      ok(v.on.sprite === v.off.sprite && v.on.flip === v.off.flip, 'not hurt: the on and off sprites are the same object');
      const pose = foe.animSprite ? foe.animSprite.slice(foe.sprite.length) : '';
      ok(v.on.sprite === DIRECTIONS.view('legionnaire', 2, pose), 'not hurt: the directional side view from directions.js is shown');
      const hp0 = foe.hp, px0 = foe.x, py0 = foe.y;
      foe.hp -= 5; animCreature(foe, 0.05, ANIM.T + 0.07);
      ok(foe._hurt > 0, 'a hit starts the hurt window');
      v = view();
      ok(v.on.sprite !== v.off.sprite && v.on.sprite === ENEMY_FX.flinch(v.off.sprite, false), 'hurt: the flinch frame replaces the pose');
      ok(v.on.flip === v.off.flip, 'hurt: flip is preserved');
      let shown = 1; for (let i = 0; i < 20; i++) { animCreature(foe, 0.05, ANIM.T + 0.1 + i * 0.05); const w = view(); if (foe._hurt > 0) { ok(w.on.sprite !== w.off.sprite, 'flinch shown through the window'); shown++; } else break; }
      ok(shown >= 5 && shown <= 8, 'the flinch lasts about the 0.3 s hurt window (' + shown + ' ticks of 0.05 s)');
      v = view(); ok(v.on.sprite === v.off.sprite && v.on.sprite === DIRECTIONS.view('legionnaire', 2, pose), 'after the window: back to the directional view');
      ok(foe.hp === hp0 - 5 && foe.x === px0 && foe.y === py0, 'the module changed no hp or position');
      // a symmetric species and a dying one
      const swarm = spawn('mites', 2.2); animCreature(swarm, 0.016, 1); swarm.hp -= 2; animCreature(swarm, 0.05, 1.1);
      ok(animDirectionalSprite(swarm).sprite === ENEMY_FX.flinch(animDirectionalSprite(Object.assign({}, swarm, { _hurt: 0 })).sprite, true), 'swarm bursts');
      const dying = spawn('legionnaire', 2.5); animCreature(dying, 0.016, 1); dying.hp -= 3; animCreature(dying, 0.05, 1.1); dying.hp = 0;
      { const onS = animDirectionalSprite(dying).sprite; GFX.enemyFx = false; const offS = animDirectionalSprite(dying).sprite; GFX.enemyFx = true; ok(onS === offS, 'a dying enemy (hp 0) gets no flinch, so its death art is as before'); }
      drop(foe); drop(swarm); drop(dying);

      // ---- 3. the Requiem at half health
      ENEMY_FX.clear();
      const req = spawn('requiem', 3.2); req.state = 'idle'; faceFor(req, 0);
      const base = Engine.sprites.requiem;
      animCreature(req, 0.05, 1); ok(req._fxPhase === 0, 'whole at full health');
      ok(animDirectionalSprite(req).sprite === base, 'whole: its own art');
      req.hp = Math.floor(req.hpMax * 0.49) + 0.5 - 0.5;   // 49%
      const rx = req.x, ry = req.y, rhp = req.hp;
      const frames = []; const stages = []; let T = 2, shatters = 0, lastPhase = 0;
      const shot = () => { frozen(); Engine.render(G.ents, G.tod); const d = Engine.ctx.getImageData(0, 0, 320, 150).data.slice(); const c = document.createElement('canvas'); c.width = 320; c.height = 150; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d), 320, 150), 0, 0); return c; };
      for (let i = 0; i < 16; i++) {
        T += 0.1; ANIM.dt = 0.1; animCreature(req, 0.1, T);
        if (req._fxPhase !== lastPhase && req._fxPhase === 1) shatters++; lastPhase = req._fxPhase;
        const sp = animDirectionalSprite(req).sprite; stages.push(sp);
        // draw the real frame with bits (do not reset them between frames)
        Engine.setWeather({ haze: 0, dark: 0, flash: 0, cloud: 0, tint: [0, 0, 0] }); Engine.setTime(1); Engine.render(G.ents, G.tod);
        const c = document.createElement('canvas'); c.width = 320; c.height = 150; c.getContext('2d').putImageData(Engine.ctx.getImageData(0, 0, 320, 150), 0, 0); frames.push(c);
        if (i === 0) ok(req._fxPhase === 1 && ENEMY_FX.active.includes(req), 'at 49% the shatter starts');
        if (i === 2) ok(ENEMY_FX.bits.length > 0, 'shards are in the air (' + ENEMY_FX.bits.length + ')');
      }
      ok(shatters === 1 && req._fxPhase === 2, 'one shatter, then finished');
      ok(ENEMY_FX.active.length === 0, 'no longer active');
      const variant = animDirectionalSprite(req).sprite;
      ok(variant !== base && variant === ENEMY_FX.stage(base, 'requiem', 4), 'the cracked variant is shown');
      ok(stages[0] !== base && stages[0] !== stages[3], 'cracks spread through stages');
      out.requiemFinalDiff = (() => { let d = 0; for (let i = 0; i < base.data.length; i++) if (base.data[i] !== variant.data[i]) d++; return d; })();
      // more hits: no second shatter, the variant stays, the flinch is of the variant
      ENEMY_FX.bits.length = 0; const waveBefore = req._fxWave, tBefore = req._fxT;
      for (let k = 0; k < 4; k++) { req.hp -= 3; T += 0.1; animCreature(req, 0.1, T); Engine.render(G.ents, G.tod); }
      ok(req._fxPhase === 2 && req._fxWave === waveBefore && req._fxT === tBefore && ENEMY_FX.bits.length === 0 && ENEMY_FX.active.length === 0, 'further hits do not shatter again');
      ok(animDirectionalSprite(req).sprite === ENEMY_FX.flinch(variant, false), 'hurt cracked Requiem: the flinch is drawn from the variant');
      for (let k = 0; k < 10; k++) { T += 0.1; animCreature(req, 0.1, T); }
      ok(animDirectionalSprite(req).sprite === variant, 'and returns to the cracked variant');
      ok(req.x === rx && req.y === ry && req.hp === rhp - 12, 'hp and position follow only the test hits');
      out.reqFrames = frames.map(c => c.toDataURL('image/png'));
      drop(req);

      // ---- 4. the Brood-Mother sheds her sacs
      ENEMY_FX.clear();
      const bm = spawn('broodmother', 3.0); bm.state = 'idle'; faceFor(bm, 0);
      const bbase = Engine.sprites.broodmother;
      animCreature(bm, 0.05, 1); ok(bm._fxPhase === 0, 'brood whole at full health');
      bm.hp = bm.hpMax * 0.49; let bshed = 0, bl = 0; const bframes = [], bstages = []; T = 5;
      for (let i = 0; i < 18; i++) {
        T += 0.1; ANIM.dt = 0.1; animCreature(bm, 0.1, T);
        if (bm._fxPhase !== bl && bm._fxPhase === 1) bshed++; bl = bm._fxPhase;
        bstages.push(animDirectionalSprite(bm).sprite);
        Engine.setWeather({ haze: 0, dark: 0, flash: 0, cloud: 0, tint: [0, 0, 0] }); Engine.setTime(1); Engine.render(G.ents, G.tod);
        const c = document.createElement('canvas'); c.width = 320; c.height = 150; c.getContext('2d').putImageData(Engine.ctx.getImageData(0, 0, 320, 150), 0, 0); bframes.push(c);
        if (i === 2) ok(ENEMY_FX.bits.length > 0, 'sac pieces are falling (' + ENEMY_FX.bits.length + ')');
      }
      ok(bshed === 1 && bm._fxPhase === 2, 'sheds once then finished');
      const bvar = animDirectionalSprite(bm).sprite;
      ok(bvar !== bbase && bvar === ENEMY_FX.stage(bbase, 'broodmother', 4), 'the sac-less variant is shown');
      const wv = bm._fxWave; bm.hp -= 4; T += 0.1; animCreature(bm, 0.1, T); Engine.render(G.ents, G.tod);
      ok(bm._fxPhase === 2 && bm._fxWave === wv && ENEMY_FX.active.length === 0, 'no second shedding');
      out.broodFrames = bframes.map(c => c.toDataURL('image/png'));
      drop(bm);

      // ---- 5. loading a save with a boss below half: variant at once
      ENEMY_FX.bits.length = 0;
      for (const [type, spr, kind] of [['requiem', 'requiem', 'requiem'], ['broodmother', 'broodmother', 'broodmother']]) {
        const e = hydrate({ kind: 'enemy', type, x: Engine.cam.x + 2.5, y: Engine.cam.y, transient: true });
        e.hp = e.hpMax * 0.3; e.hidden = false; G.ents.push(e);      // what a save restore does to hp
        ok(e._fxPhase === undefined, 'fresh entity has no phase yet');
        const sp = animDirectionalSprite(e).sprite; GFX.enemyFx = false; const plain = animDirectionalSprite(e).sprite; GFX.enemyFx = true;
        ok(sp !== plain && sp === ENEMY_FX.stage(plain, kind, 4), type + ' loaded below half shows the variant on its first frame');
        animCreature(e, 0.05, 9); ok(e._fxPhase === 2 && ENEMY_FX.active.length === 0, type + ' loaded below half plays no shatter');
        Engine.render(G.ents, G.tod); ok(ENEMY_FX.bits.length === 0, type + ' loaded below half spawns no shards');
        drop(e);
      }

      // ---- 6. flag off: sprites and frames exactly as before
      scene();
      const e1 = spawn('legionnaire', 2.2); e1.state = 'idle'; faceFor(e1, 0);
      const e2 = spawn('requiem', 3.4); e2.state = 'idle'; e2.x += 0.0; e2.y += 1.0; faceFor(e2, 0);
      const e3 = spawn('mites', 1.8); e3.y -= 0.8;
      animCreature(e1, 0.02, 1); animCreature(e2, 0.02, 1); animCreature(e3, 0.02, 1);
      const state = (hurt, low) => { for (const e of [e1, e3]) { e._hurt = hurt; e.animHurt = 0; } e2.hp = low ? e2.hpMax * 0.2 : e2.hpMax; e2._fxPhase = undefined; };
      GFX.enemyFx = true; state(0, false); const onIdle = grab();
      GFX.enemyFx = false; state(0, false); const offIdle = grab();
      state(0.3, true); const offBusy = grab();
      GFX.enemyFx = true; state(0, false); const onIdle2 = grab();
      ok(same(onIdle, offIdle) && same(offIdle, offBusy) && same(onIdle, onIdle2), 'flag off: frames identical to the plain frames, whatever the hurt and boss state');
      state(0.3, true); const onBusy = grab(); ok(!same(onBusy, onIdle), 'flag on: a hurt Requiem below half draws differently');
      out.offIdentical = true;
      out.shotFlinchScene = (() => { state(0.3, false); const c = document.createElement('canvas'); c.width = 320; c.height = 150; frozen(); Engine.render(G.ents, G.tod); c.getContext('2d').putImageData(Engine.ctx.getImageData(0, 0, 320, 150), 0, 0); state(0, false); return c.toDataURL('image/png'); })();
      drop(e1); drop(e2); drop(e3); GFX.enemyFx = true;

      // ---- 7. identical simulation with the module on and off
      const run = on => {
        GFX.enemyFx = on; ENEMY_FX.clear(); scene(); let s = 77; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
        G.player.hpMax = 99999; G.player.hp = 99999; const f = spawn('legionnaire', 1.4), b = spawn('requiem', 3.0); f.state = 'chase'; f.alertT = 8; b.state = 'chase'; b.alertT = 8;
        const trace = []; let t = 0;
        for (let i = 0; i < 240; i++) {
          t += 0.05; ANIM.dt = 0.05; enemyUpdate(f, 0.05); enemyUpdate(b, 0.05);
          if (i % 30 === 10) { f.hp -= 3; b.hp -= 25; }
          animCreature(f, 0.05, t); animCreature(b, 0.05, t); Engine.render(G.ents, G.tod);
          trace.push([f.hp, f.x, f.y, b.hp, b.x, b.y, G.player.hp, Math.random()].map(v => Math.round(v * 1e9) / 1e9).join(','));
        }
        out['phase' + on] = b._fxPhase; drop(f); drop(b); return trace;
      };
      const tOn = run(true), tOff = run(false), tOn2 = run(true);
      { const i = tOn.findIndex((v, j) => v !== tOff[j]); const j2 = tOn.findIndex((v, j) => v !== tOn2[j]); out.firstDiff = [i, j2, i >= 0 ? tOn[i] + ' | ' + tOff[i] : ''] ; }
      if (!(tOn.length === tOff.length && tOn.every((v, i) => v === tOff[i]))) throw new Error('DIFF ' + JSON.stringify(out.firstDiff));
      ok(tOn.length === tOff.length && tOn.every((v, i) => v === tOff[i]), 'hp, damage, positions and the game random sequence are identical with the module on and off');
      ok(out.phasetrue === 2 && out.phasefalse === undefined || out.phasefalse === 0 || out.phasefalse === 2, 'phase bookkeeping sane');
      GFX.enemyFx = true;

      // ---- 8. frame cost
      scene(); ENEMY_FX.clear();
      const cf = spawn('legionnaire', 2.2); animCreature(cf, 0.02, 1);
      const med = (n, fn) => { const a = []; for (let r = 0; r < 15; r++) { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); a.push((performance.now() - t0) / n); } a.sort((x, y) => x - y); return a[7]; };
      cf._hurt = 0; animDirectionalSprite(cf);
      out.costCalm = med(5000, () => animDirectionalSprite(cf));
      GFX.enemyFx = false; out.costOff = med(5000, () => animDirectionalSprite(cf)); GFX.enemyFx = true;
      cf._hurt = 0.3; animDirectionalSprite(cf); out.costHurtCached = med(5000, () => animDirectionalSprite(cf));
      const cold = []; for (const s of species) { const src = Engine.sprites[s.sprite]; ENEMY_FX.clear(); const t0 = performance.now(); ENEMY_FX.flinch(src, s.symmetric); cold.push(performance.now() - t0); }
      cold.sort((a, b) => a - b); out.coldBuildMedianMs = cold[cold.length >> 1]; out.coldBuildMaxMs = cold[cold.length - 1];
      const rq = Engine.sprites.requiem; ENEMY_FX.clear(); let t0 = performance.now(); ENEMY_FX.stage(rq, 'requiem', 4); out.crackBuildMs = performance.now() - t0;
      const bq = Engine.sprites.broodmother; t0 = performance.now(); ENEMY_FX.stage(bq, 'broodmother', 4); out.shedBuildMs = performance.now() - t0;
      out.nonBossDrawOverheadUs = Math.round((out.costCalm - out.costOff) * 1000 * 100) / 100;
      drop(cf);
      // budget under pressure: every species, every pose, hurt + both bosses' stages
      ENEMY_FX.clear(); for (const s of species) for (const pose of POSES) { const src = Engine.sprites[s.sprite + pose]; if (src) ENEMY_FX.flinch(src, s.symmetric); }
      for (const pose of POSES) for (const k of [0, 1, 2, 3, 4]) { ENEMY_FX.stage(Engine.sprites['requiem' + pose] || rq, 'requiem', k); ENEMY_FX.stage(Engine.sprites['broodmother' + pose] || bq, 'broodmother', k); }
      out.bytesWorst = ENEMY_FX.budgetBytes(); ok(out.bytesWorst <= ENEMY_FX.cap, 'worst-case budget ' + out.bytesWorst);
      return out;
    });

    // composite screenshots (page side, so PNG only)
    save('flinch-sheet.png', res.sheetFlinch);
    save('flinch-scene.png', res.shotFlinchScene);
    const strip = async (frames, name, idx) => {
      const html = await page.evaluate(async ([frames, idx]) => {
        const imgs = await Promise.all(idx.map(i => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = frames[i]; })));
        const k = 2, cw = 200, ch = 150, cols = 4, rows = Math.ceil(imgs.length / cols), o = document.createElement('canvas');
        o.width = cw * k * cols; o.height = ch * k * rows; const g = o.getContext('2d'); g.imageSmoothingEnabled = false;
        imgs.forEach((im, n) => g.drawImage(im, 60, 0, cw, ch, (n % cols) * cw * k, Math.floor(n / cols) * ch * k, cw * k, ch * k));
        return o.toDataURL('image/png');
      }, [frames, idx]);
      save(name, html);
    };
    await strip(res.reqFrames, 'requiem-shatter.png', [0, 1, 2, 3, 4, 5, 7, 12]);
    await strip(res.broodFrames, 'broodmother-shedding.png', [0, 1, 2, 3, 4, 6, 9, 14]);

    delete res.sheetFlinch; delete res.shotFlinchScene; delete res.reqFrames; delete res.broodFrames;
    console.log(JSON.stringify(res));
    assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));
    console.log('PASS enemy-fx');
  } catch (e) { console.error('FAIL enemy-fx:', e.message); process.exitCode = 1; }
  finally { await browser.close(); }
})();
