// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/path/to/playwright node test/pixel3d.test.js
// The pixel-3D set (js/pixel3d.js, img/pixel3d/, tools/art/pixel3d/):
//  - every baked atlas loads; each extruded creature has four sides in five poses, each prop one view; cells are sized in world units (hs),
//    anchored (cx) and stand on their feet (dy small);
//  - an entity whose sprite has a model draws the model's cell for its side and pose (front, left, back, right by
//    quadrant, nothing mirrored), a prop's sprite is swapped under its name; an entity without a model is untouched;
//  - the bestiary and the rigged people (js/people25.js: the Proctor, the companions, the townsfolk) draw their
//    hand-built views, snapped to the four sides;
//  - off (and the Original preset), frames are byte-identical to a build without the module; no page errors.
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
  if (block) await page.route('**/js/pixel3d.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.evaluate(() => { try { CINEMATIC24.set.play = false; } catch (e) { /* no cinematic */ } });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Pixel');
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
    window.__figs = [];
    window.put = (sprite, x, y, facing, pose) => { const e = { kind: 'deco', sprite, x, y, scale: 1, solid: false, nopick: true, transient: true, facing, animSprite: pose ? sprite + pose : null }; if (typeof hydrate === 'function') hydrate(e); G.map.entities.push(e); window.__figs.push(e); return e; };
    window.clearFigs = () => { const S = new Set(window.__figs); for (const m in G.maps) G.maps[m].entities = G.maps[m].entities.filter((q) => !S.has(q)); window.__figs = []; };
    window.grab = (tod, dir) => {
      Engine.cam.bob = 0; Engine.cam.pitch = 0; if (dir != null) Engine.cam.dir = dir; Engine.setTime(3.3);
      Weather.release(); Weather.hold('clear'); Weather.tick(1 / 60);
      const pn = performance.now; performance.now = () => 555555;
      window.__on = true; try { Engine.render(window.__figs.slice(), tod); } finally { performance.now = pn; window.__on = false; }
      return window.__cap;
    };
    window.hash = (c) => { let h = 2166136261; for (let i = 0; i < c.fb.length; i++) { h ^= c.fb[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + c.w; };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const A = await boot(browser, false);
    const B = await boot(browser, true);
    assert.equal(await B.page.evaluate(() => typeof PIXEL3D), 'undefined', 'page B runs without js/pixel3d.js');
    await A.page.waitForFunction(() => PIXEL3D.models().every((n) => PIXEL3D.ready(n)), null, { timeout: 20000 });

    // ---- the atlases and their cells ----
    const r = await A.page.evaluate(() => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const out = { models: PIXEL3D.models(), cells: 0 };
      check(out.models.length >= 34 && ['orla', 'hollow', 'cutter', 'p_barrel', 'chest'].every((n) => out.models.includes(n)) && !['hound', 'proctor', 'townsman', 'legionnaire', 'hetty', 'hob', 'vane', 'harrow', 'tam', 'aldric', 'quist', 'herald', 'mags', 'wren'].some((n) => out.models.includes(n)), 'the unrigged people and the props are baked, the bestiary and the rigged people are not (' + out.models.length + ': ' + out.models.join(' ') + ')');
      for (const n of out.models) {
        const a = PIXEL3D.ATLAS[n], views = a.k === 'creature' ? [0, 2, 4, 6] : [0], poses = a.k === 'creature' ? PIXEL3D.POSES : [''];
        for (const v of views) for (const p of poses) {
          const s = PIXEL3D.view(n, v, p);
          check(s.w > 4 && s.h > 4 && s.data.length === s.w * s.h, n + ' ' + v + p + ' cell');
          check(s.hs > 0.2 && s.hs < 2.5 && s.cx > 0.1 && s.cx < 0.9 && Math.abs(s.dy) < 0.2, n + ' ' + v + p + ' metadata hs ' + s.hs + ' cx ' + s.cx + ' dy ' + s.dy);
          check(s.data.some((q) => (q >>> 24) === 255) && s.data.some((q) => (q >>> 24) === 0), n + ' ' + v + p + ' has a silhouette');
          out.cells++;
        }
      }
      // a creature's height in world units stays near the painted sprite's (the def's scale is applied on top)
      const h0 = PIXEL3D.view('orla', 2, '').hs, p0 = PIXEL3D.view('hollow', 0, '').hs;
      const hh = Engine.sprites.orla.hs || 1, ph = Engine.sprites.hollow.hs || 1;
      check(Math.abs(h0 - hh) < 0.25 && Math.abs(p0 - ph) < 0.25, 'model heights near the paintings (' + h0 + ' vs ' + hh + ', ' + p0 + ' vs ' + ph + ')');
      // --- the directional chain ---
      PRESETS.apply('medium'); GFX.pixel3d = true; GFX.changed();
      go('clearing', 20.5, 22.5, Math.PI / 2);
      const e = put('hollow', 20.5, 26.5, 0, '_w1');
      const seen = new Set();
      for (let k = 0; k < 8; k++) { e.facing = k * Math.PI / 4; const d = animDirectionalSprite(e); check(d.sprite && d.sprite.pixel3d && !d.flip, 'a hollow facing ' + k + ' draws a model cell, unmirrored'); seen.add(d.sprite); }
      check(seen.size === 4, 'turning the hollow shows its four sides (' + seen.size + ')');
      e.animSprite = 'hollow_a2'; const a2 = animDirectionalSprite(e); e.animSprite = null; const idle = animDirectionalSprite(e);
      check(a2.sprite !== idle.sprite, 'the strike pose is its own cell');
      // the rigged people: the Proctor's hand-built sides and back (js/people25.js), the painting head-on, four in all
      const pr = put('proctor', 20.5, 26.5, 0, '_w1'); const prs = new Set(); let prModel = 0;
      for (let k = 0; k < 8; k++) { pr.facing = k * Math.PI / 4; const d = animDirectionalSprite(pr); check(d.sprite, 'a proctor facing ' + k + ' draws'); if (d.sprite.pixel3d) prModel++; prs.add(d.sprite.w + 'x' + d.sprite.h + (d.flip ? 'F' : '') + '#' + (d.sprite === Engine.sprites.proctor_w1 ? 'paint' : (window.__ids = window.__ids || new Map(), window.__ids.has(d.sprite) ? window.__ids.get(d.sprite) : (window.__ids.set(d.sprite, window.__ids.size), window.__ids.size - 1)))); }
      check(prModel === 0 && prs.size === 4, 'the proctor turns through its rigged sides and back, not the extrusion (' + [...prs].join(' ') + ')');
      const tw = put('townswoman', 21.5, 27.5, 0, null); tw.facing = Math.PI; const twd = animDirectionalSprite(tw);
      check(twd.sprite && !twd.sprite.pixel3d && twd.sprite.w !== Engine.sprites.townswoman.w, 'a townswoman seen from the side draws her rigged side view');
      for (const n of ['hetty', 'rooke', 'sable', 'hob', 'nell', 'flambeau', 'vane', 'pim', 'vosk', 'harrow', 'tobiah', 'aldric', 'bettany', 'tam', 'quist', 'halder', 'sexton', 'herald', 'mags', 'mourner', 'wren', 'burlsick']) { const q = put(n, 21.5, 27.5, 0, null); q.facing = Math.PI; const d = animDirectionalSprite(q); check(d.sprite && !d.sprite.pixel3d && d.sprite.w !== Engine.sprites[n].w, n + ' seen from the side draws a rigged side view'); }
      // the bestiary keeps its Phase 20 hand-built views, snapped to four sides: a hound shows four drawings over eight facings
      const h = { kind: 'enemy', sprite: 'hound', x: 20.5, y: 26.5, scale: 0.8, facing: 0, animSprite: null };   // not in the map: no AI runs on it
      const hs = new Set(); let hm = 0;
      for (let k = 0; k < 8; k++) { h.facing = k * Math.PI / 4; const d = animDirectionalSprite(h); check(d.sprite, 'a hound facing ' + k + ' draws'); if (d.sprite.pixel3d) hm++; hs.add((window.__ids.has(d.sprite) ? window.__ids.get(d.sprite) : (window.__ids.set(d.sprite, window.__ids.size), window.__ids.size - 1)) + (d.flip ? 'F' : '')); }
      check(hm === 0 && hs.size === 4, 'the hound shows its four hand-built sides and no extrusion (' + [...hs].join(' ') + ')');
      const n = put('cat', 21.5, 26.5, 0, null); check(!animDirectionalSprite(n).sprite.pixel3d, 'a sprite without a model is untouched');
      check(Engine.sprites.p_barrel.pixel3d && Engine.sprites.p_crate.pixel3d, 'the props are swapped under their names');
      // --- off: the painted art is back ---
      GFX.pixel3d = false; GFX.changed();
      check(!animDirectionalSprite(e).sprite.pixel3d && !Engine.sprites.p_barrel.pixel3d, 'off: painted sprites again');
      GFX.pixel3d = true; GFX.changed();
      check(PIXEL3D.stats.errors === 0 && PIXEL3D.stats.failed === 0, 'no internal errors');
      return out;
    });
    console.log('PASS atlases, cells and the directional chain: ' + JSON.stringify(r));

    // ---- off state against a build without the module ----
    const scene = (page, on) => page.evaluate((on) => {
      PRESETS.apply('medium'); if (typeof PIXEL3D !== 'undefined') GFX.pixel3d = on; GFX.changed();
      go('clearing', 20.5, 22.5, Math.PI / 2);
      clearFigs();
      put('hound', 19.5, 26.0, 1.571, ''); put('hound', 21.5, 26.2, 4.0, '_a2'); put('proctor', 20.5, 27.2, 1.571, '_w1'); put('p_crate', 19.2, 25.3, 0, null); put('p_barrel', 21.9, 25.3, 0, null);
      return hash(grab(0.5, Math.PI / 2));
    }, on);
    const offA = await scene(A.page, false), offB = await scene(B.page, false), onA = await scene(A.page, true);
    assert.equal(offA, offB, 'off: the frame matches a build without js/pixel3d.js');
    assert.notEqual(onA, offA, 'on: the frame changes');
    console.log('PASS off state byte-identical; on state differs');
    for (const P of [A, B]) assert.deepEqual(P.errors, [], 'page errors: ' + P.errors.join(' | '));
    console.log('PASS pixel3d: no page errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
