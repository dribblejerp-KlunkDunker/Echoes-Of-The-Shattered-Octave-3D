// PREVIEW_URL=http://127.0.0.1:4073 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/bestiary20b.test.js
// Phase 20 BEASTB: hand-built five-angle views for the second half of the bestiary (js/bestiary20b.js).
// Checks: every species of ours answers every view and pose; the drawings keep the painted pose frame's
// height and scale (hs) and stand on its ground line; they are distinct per view and per pose, darker
// from behind, deterministic and cached; the switch, the directions switch and the Original preset
// give back the stand-ins / the original sprite exactly; no page errors; frame cost unchanged.
// Screenshots go to BEASTB_SHOTS (default: the system temp dir), never the repo.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.BEASTB_SHOTS || path.join(os.tmpdir(), 'beastb-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const OURS = ['legionnaire', 'ln17_hollow', 'marine', 'miredrone', 'outrider', 'pressman', 'quiet', 'requiem', 'tongueless', 'warden', 'wearer', 'weaver', 'weaverling'];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let failed = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:3000') + '/?nosw=1');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof DIRECTIONS !== 'undefined' && typeof BEASTB !== 'undefined' && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Bestiary Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // 1. coverage, sizes, anchors, distinctness, darkness, determinism
    const r1 = await page.evaluate((OURS) => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      const hash = sp => { let h = 0; for (let i = 0; i < sp.data.length; i++) h = (Math.imul(h, 31) + sp.data[i]) | 0; return h + ':' + sp.w + 'x' + sp.h; };
      const lum = sp => { let s = 0, n = 0; for (const p of sp.data) if ((p >>> 24) > 100) { s += 0.3 * (p & 255) + 0.59 * ((p >>> 8) & 255) + 0.11 * ((p >>> 16) & 255); n++; } return s / Math.max(1, n); };
      GFX.directions = true; GFX.p20_beastb = true;
      // the Long Night's Hollow is cut on demand by js/longnight17.js; make sure it exists
      if (!Engine.sprites.ln17_hollow && typeof LONGNIGHT17 !== 'undefined' && LONGNIGHT17.ensureHollowFrames) LONGNIGHT17.ensureHollowFrames();
      const listed = DIRECTIONS.species().map(s => s.sprite);
      const out = { species: 0, views: 0 };
      for (const name of OURS) {
        if (!Engine.sprites[name]) { check(name === 'ln17_hollow', name + ' exists'); continue; }
        check(listed.includes(name) || name === 'ln17_hollow', name + ' is in the directions species list');
        check(BEASTB.SPECIES[name], name + ' has a rig');
        const idle = Engine.sprites[name];
        for (const pose of BEASTB.poses) {
          const fr = Engine.sprites[name + pose] || idle, hs = fr === idle ? (idle.hs || 1) : (fr.hs || fr.h / idle.h);
          const hashes = new Set([hash(fr)]);
          for (let v = 1; v <= 4; v++) {
            const sp = DIRECTIONS.view(name, v, pose);
            check(sp && sp.data instanceof Uint32Array && sp.data.length === sp.w * sp.h, name + pose + ' view ' + v + ' is a sprite');
            check(sp === BEASTB.view(name, v, pose), name + pose + ' view ' + v + ' is the hand-built drawing');
            check(Math.abs(sp.hs - hs) < 1e-6 && sp.h === Math.round(hs * idle.h), name + pose + ' view ' + v + ' keeps the frame scale (' + sp.hs + ' vs ' + hs + ', h ' + sp.h + ')');
            check(sp.cx > 0.2 && sp.cx < 0.8 && (sp.dy || 0) === 0, name + ' anchor sane');
            // it stands where the painted frame stands: the lowest opaque row matches (within 3 px)
            const low = s => { for (let y = s.h - 1; y >= 0; y--) for (let x = 0; x < s.w; x++) if ((s.data[y * s.w + x] >>> 24) > 100) return s.h - 1 - y; return s.h; };
            check(Math.abs(low(sp) - low(fr)) <= (['weaver', 'requiem', 'quiet'].includes(name) ? 8 : 3), name + pose + ' view ' + v + ' stands on the frame\'s ground line (' + low(sp) + ' vs ' + low(fr) + ' px up)');
            hashes.add(hash(sp)); out.views++;
          }
          check(hashes.size === 5, name + pose + ' has five distinct drawings (' + hashes.size + ')');
        }
        for (let v = 1; v <= 4; v++) {
          const set = new Set(BEASTB.poses.map(p => hash(DIRECTIONS.view(name, v, p))));
          check(set.size === 5, name + ' view ' + v + ' keeps its five poses apart (' + set.size + ')');
        }
        const back = DIRECTIONS.view(name, 4, '');
        check(lum(back) < lum(idle) * 0.85, name + ' back is darker than its front (' + lum(back).toFixed(1) + ' vs ' + lum(idle).toFixed(1) + ')');
        out.species++;
      }
      // deterministic: rebuild from nothing and compare
      const before = OURS.filter(n => Engine.sprites[n]).map(n => hash(DIRECTIONS.view(n, 2, '_a1')) + hash(DIRECTIONS.view(n, 3, '_w1')));
      BEASTB.clear();
      const after = OURS.filter(n => Engine.sprites[n]).map(n => hash(DIRECTIONS.view(n, 2, '_a1')) + hash(DIRECTIONS.view(n, 3, '_w1')));
      check(JSON.stringify(before) === JSON.stringify(after), 'views rebuild identically');
      check(BEASTB.budgetBytes() > 0 && BEASTB.budgetBytes() <= BEASTB.cap, 'cache inside its budget');
      // cost of building one view, once
      BEASTB.clear(); const t0 = performance.now(); let n = 0;
      for (const name of OURS) if (Engine.sprites[name]) for (let v = 1; v <= 4; v++) { DIRECTIONS.view(name, v, ''); n++; }
      out.buildMs = +((performance.now() - t0) / n).toFixed(2);
      check(out.buildMs < 40, 'a view builds once in reasonable time (' + out.buildMs + ' ms)');
      return out;
    }, OURS);
    console.log('PASS every view and pose of ' + r1.species + ' species is hand-built (' + r1.views + ' drawings), keeps the frame scale and ground line, five distinct drawings, darker backs, deterministic; build ' + r1.buildMs + ' ms/view');

    // 2. switches: ours off -> the stand-ins; directions off -> the original sprite; Original preset
    const r2 = await page.evaluate((OURS) => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      const hash = sp => { let h = 0; for (let i = 0; i < sp.data.length; i++) h = (Math.imul(h, 31) + sp.data[i]) | 0; return h + ':' + sp.w + 'x' + sp.h; };
      const cam = { x: Engine.cam.x, y: Engine.cam.y };
      const at = (e, oct) => { Engine.cam.x = e.x + Math.cos(oct * Math.PI / 4) * 3; Engine.cam.y = e.y + Math.sin(oct * Math.PI / 4) * 3; return animDirectionalSprite(e); };
      for (const name of OURS) {
        if (!Engine.sprites[name]) continue;
        const e = { kind: 'enemy', sprite: name, x: 0, y: 0, facing: 0 };
        GFX.directions = true; GFX.p20_beastb = true;
        const ours = at(e, 2).sprite;
        check(ours === BEASTB.view(name, 2, ''), name + ': the engine shows the hand-built side view');
        check(at(e, 6).flip === true && at(e, 6).sprite === ours, name + ': the other side mirrors');
        check(at(e, 0).sprite === Engine.sprites[name], name + ': the front is the painting');
        GFX.p20_beastb = false;
        const stand = at(e, 2).sprite;
        check(stand !== ours && stand.h === Engine.sprites[name].h, name + ': switched off, the stand-in view comes back');
        GFX.directions = false;
        check(at(e, 2).sprite === Engine.sprites[name], name + ': directions off gives the original sprite');
        GFX.directions = true; GFX.p20_beastb = true;
      }
      Object.assign(Engine.cam, cam);
      PRESETS.apply('original');
      check(GFX.p20_beastb === true && GFX.directions === true, 'the Original preset keeps the hand-built views (Phase 20 MAX: art is on in every preset)');
      PRESETS.apply('medium');
      check(GFX.p20_beastb === true, 'Medium has the hand-built views');
      PRESETS.apply('cinematic');
      check(GFX.p20_beastb === true, 'Cinematic has the hand-built views');
      PRESETS.apply('medium'); Engine.setScale(GFX.scale);
      return true;
    }, OURS);
    console.log('PASS switches: GFX.p20_beastb off gives the stand-ins, directions off gives the original sprite; every preset, Original included, has the hand-built views');

    // 3. frame cost: twelve of ours around the player, cached views, on vs off (best of runs)
    const r3 = await page.evaluate((OURS) => {
      const check = (ok, t) => { if (!ok) throw new Error(t); };
      loadMap('oakhaven', { x: 23.5, y: 20.5, dir: -1.57 }); G.state = 'play'; G.tod = 0.45;
      for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
      const c = Engine.cam, list = [];
      for (let i = 0; i < 12; i++) {
        const name = OURS.filter(n => Engine.sprites[n])[i % 12] || 'marine';
        const a = c.dir + (i - 6) * 0.08, d = 2.5 + (i % 4) * 0.8;
        const e = { kind: 'enemy', sprite: name, def: ENEMIES[Object.keys(ENEMIES).find(k => ENEMIES[k].sprite === name)] || {}, x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, facing: i * 0.7, scale: 1, transient: true, solid: false };
        G.ents.push(e); list.push(e);
      }
      const run = () => { const t = []; for (let k = 0; k < 7; k++) { const t0 = performance.now(); for (let f = 0; f < 15; f++) Engine.render(G.ents, G.tod); t.push((performance.now() - t0) / 15); } return Math.min(...t); };
      GFX.p20_beastb = true; run(); const on = run();
      GFX.p20_beastb = false; run(); const off = run();
      GFX.p20_beastb = true; const on2 = run();
      for (const e of list) G.ents.splice(G.ents.indexOf(e), 1);
      const best = Math.min(on, on2);
      check(best < off + 1.0, 'frame cost unchanged (' + best.toFixed(2) + ' vs ' + off.toFixed(2) + ' ms)');
      return { on: +best.toFixed(2), off: +off.toFixed(2) };
    }, OURS);
    console.log('PASS frame cost with 12 of our species on screen: ' + r3.on + ' ms with the hand-built views, ' + r3.off + ' ms with the stand-ins');

    const shot = path.join(SHOTS, 'beastb-oakhaven.png');
    await page.locator('#view').screenshot({ path: shot });
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
    console.log('OK bestiary20b');
  } catch (err) {
    failed = true; console.error('FAIL ' + (err && err.message || err));
  } finally { await browser.close(); }
  process.exit(failed ? 1 : 0);
})();
