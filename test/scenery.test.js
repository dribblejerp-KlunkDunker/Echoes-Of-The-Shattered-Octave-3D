// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3000 node test/scenery.test.js
// Covers js/scenery.js (barrels, crates, carts, broken statues, graves, bones) and
// js/flora.js (swaying, player-reactive grass and reeds): placement on the named
// maps, transient/append-only entities and saves, route safety (flood-fill and
// real walking), the sway and bend, the GFX toggles with byte-identical frames,
// frame cost, and screenshots for the human.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOT_DIR || '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/SCENERY';
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Scenery Tester');
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
      const out = {};
      const go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; G.vel.x = 0; G.vel.y = 0; };
      const quiet = () => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true; };
      const sig = (list) => list.map(e => e.sprite + '@' + e.x + ',' + e.y).join('|');
      // cinema14's god rays and ground fog drift with ANIM.T, so any update() between two frames moves them; this
      // suite compares frames across updates, so those two stay off here (cinema14.test.js covers them)
      const DEFAULTS = () => { for (const k of GFX.FX) GFX[k] = k !== 'crtCurve' && k !== 'cineLight' && k !== 'cineFog' && k !== 'pixel3d'; GFX.preset = 'medium'; GFX.changed(); };   // pixel3d stays off: it swaps props as its atlases load, and the frame comparisons here need the painted props
      G.tod = 0.45;

      // --- props and flora exist on the named maps ----------------------------
      const maps = buildAllMaps();
      const WANT = {
        oakhaven: { props: ['barrel', 'crate', 'cart'], flora: ['grass', 'reed'] },
        clearing: { props: ['cart_broken', 'bones'], flora: ['grass'] },
        quarry: { props: ['barrel', 'crate', 'cart'], flora: [] },
        deepwoods: { props: ['statue', 'grave', 'bones'], flora: ['grass', 'reed'] },
        whispergrove: { props: ['statue'], flora: ['reed'] },
        catacombs: { props: ['bones', 'grave'], flora: [] },
      };
      out.counts = {};
      for (const id in WANT) {
        const m = maps[id]; check(m && m._scn && m._scn.length, id + ' has props');
        const kinds = new Set(m._scn.map(e => e._scn));
        for (const k of WANT[id].props) check(kinds.has(k), id + ' has a ' + k);
        const fl = m._flora || [], ftypes = new Set(fl.map(e => e._flora));
        for (const k of WANT[id].flora) check(ftypes.has(k), id + ' has ' + k);
        if (!WANT[id].flora.length) check(fl.length === 0, id + ' has no flora');
        check(fl.length <= 120, id + ' flora is capped at 120');
        // transient, appended after baseCount, in the game's voice, sprites registered
        const all = m._scn.concat(fl);
        for (const e of all) {
          check(e.kind === 'deco' && e.transient === true && e.nopick === true, id + ' ' + e.sprite + ' is a transient, unpickable deco');
          check(typeof e.label === 'string' && e.label.length > 8, id + ' ' + e.sprite + ' has a label');
          check(Engine.sprites[e.sprite], id + ' sprite ' + e.sprite + ' is registered');
          const i = m.entities.indexOf(e); check(i >= m.baseCount, id + ' ' + e.sprite + ' sits after baseCount');
          if (fl.includes(e)) check(e.solid === false, 'flora never collides');
        }
        // baseCount is untouched by the scenery: the first baseCount entities are all original, and every
        // prop and tuft sits after the last non-transient entity (later builders append their own extras first)
        const lastReal = m.entities.map(e => !e.transient).lastIndexOf(true), firstNew = Math.min(...all.map(e => m.entities.indexOf(e)));
        check(m.entities.slice(0, m.baseCount).every(e => !e.transient && !e._scn && !e._flora), id + ' keeps its original entities in place');
        check(lastReal < firstNew, id + ' props come after every real entity (' + lastReal + ' < ' + firstNew + ')');
        check(m.entities.filter(e => !e.transient).length >= m.baseCount && m.entities.filter(e => e._scn || e._flora).length === all.length, id + ' baseCount never counts a prop');
        out.counts[id] = { props: m._scn.length, flora: fl.length, base: m.baseCount };
      }
      // determinism: the same build gives the same placement
      const again = buildAllMaps();
      for (const id in WANT) check(sig(again[id]._scn) === sig(maps[id]._scn) && sig(again[id]._flora || []) === sig(maps[id]._flora || []), id + ' is placed identically every build');
      out.sprites = Object.keys(Engine.sprites).filter(n => /^p_(barrel|barrel_open|cart|cart_broken|statue_broken|grass[123]|reed[12])$/.test(n)).length;
      check(out.sprites === 10, 'the required procedural sprites exist');
      // the Greening rebuilds Oakhaven outside buildAllMaps and still gets props
      const green = buildOakhaven(true);
      check(green._scn.length > 0 && green._flora.length > 0 && green.entities.indexOf(green._scn[0]) >= green.baseCount, 'the Greening Oakhaven carries props and flora too');
      check(SCENERY.reachable(green).ok, 'the Greening Oakhaven stays walkable');

      // --- routes are never blocked --------------------------------------------
      out.reach = {};
      for (const id in WANT) { const r = SCENERY.reachable(maps[id], maps); check(r.ok, id + ' lost reach of: ' + r.missing.join(', ')); check(r.checked > 5, id + ' checks real targets'); out.reach[id] = r.checked; }
      // and the check does notice a blocked route: wall the clearing spawn in with solid props
      { const m = maps.clearing, keep = m._scn.slice();
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; m._scn.push({ solid: true, radius: 0.6, x: m.spawn.x + Math.cos(a) * 1.5, y: m.spawn.y + Math.sin(a) * 1.5 }); }
        check(!SCENERY.reachable(m, maps).ok, 'a ring of solid props around the spawn is caught');
        m._scn = keep; check(SCENERY.reachable(m, maps).ok, 'and passes again without it'); }
      // no prop (or tuft) within 1.2 of a door or portal
      let nearest = 99;
      for (const id in WANT) {
        const m = maps[id];
        for (const k in m.doors) { const dx = (k % m.w) + 0.5, dy = ((k / m.w) | 0) + 0.5; for (const e of m._scn.concat(m._flora || [])) nearest = Math.min(nearest, Math.hypot(e.x - dx, e.y - dy)); }
      }
      check(nearest >= 1.2, 'nothing stands within 1.2 of a door (nearest ' + nearest.toFixed(2) + ')');
      out.nearestDoor = +nearest.toFixed(2);

      // --- saves: none of it is saved, all of it comes back ----------------------
      go('oakhaven', 23.5, 20.5, -1.57);
      const before = {}; for (const id in WANT) before[id] = sig(G.maps[id]._scn) + '#' + sig(G.maps[id]._flora || []);
      const snap = snapshotGame(), json = JSON.stringify(snap);
      check(!/p_barrel|p_cart|p_statue|p_grass|p_reed|p_crate|p_bones/.test(json), 'the save carries no scenery or flora');
      for (const id in WANT) {
        const sm = snap.maps[id], gm = G.maps[id];
        check(sm.ents.length === gm.baseCount, id + ' saves exactly its base entities');
        check(!(sm.extra || []).some(o => o.sprite && /^p_/.test(o.sprite)), id + ' has no scenery among the extras');
      }
      restoreGame(JSON.parse(json)); G.state = 'play'; G.fadeT = 0;
      for (const id in WANT) check(before[id] === sig(G.maps[id]._scn) + '#' + sig(G.maps[id]._flora || []), id + ' scenery comes back identical after a load');
      check(G.map._scn.every(e => G.ents.includes(e)) && G.map._flora.every(e => G.ents.includes(e)), 'the current map shows its props after a load');
      check(G.ents.length > G.map.baseCount, 'entities after the base are the props');
      // leaving and re-entering a map keeps them (anim.js sweeps transient entities on a map change)
      go('clearing', 20.5, 32.5, -1.57); render(); go('oakhaven', 23.5, 20.5, -1.57); render();
      check(G.map._scn.every(e => G.ents.includes(e)) && G.map._flora.every(e => G.ents.includes(e)), 'props return when a map is re-entered');
      go('clearing', 20.5, 32.5, -1.57); render();
      check(G.map._scn.every(e => G.ents.includes(e)), 'the clearing keeps its props while you are in it');

      // --- walking the routes ---------------------------------------------------
      const propHit = (m, x, y, pad) => m._scn.find(e => e.solid && Math.hypot(e.x - x, e.y - y) < (e.radius || 0.3) + 0.22 + pad);
      for (const [id, a, b] of [['oakhaven', [23.5, 2.5], [23.5, 29]], ['oakhaven', [23.5, 34.5], [23.5, 61]], ['oakhaven', [3, 23.5], [66.5, 23.5]], ['oakhaven', [53.5, 4], [53.5, 60]], ['clearing', [20.5, 33.5], [20.5, 5.5]], ['deepwoods', [27.5, 38.2], [27.5, 13.2]], ['whispergrove', [24.5, 43.5], [24.5, 31]]]) {
        const m = G.maps[id], n = 200;
        for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n; const p = propHit(m, x, y, 0.1); check(!p, id + ' route is clear of ' + (p && p.sprite) + ' at ' + x.toFixed(1) + ',' + y.toFixed(1)); }
      }
      go('oakhaven', 23.5, 5.5, Math.PI / 2); quiet();
      for (let i = 0; i < 1400 && Engine.cam.y < 29.6; i++) { G.keys = { w: true }; G.state = 'play'; update(0.033); }
      G.keys = {};
      check(Engine.cam.y > 29 && Math.abs(Engine.cam.x - 23.5) < 0.3, 'walking Oakhaven\'s high street from the North Gate to the square is never stopped (reached y=' + Engine.cam.y.toFixed(1) + ')');
      go('clearing', 20.5, 29.2, -Math.PI / 2); quiet();
      for (let i = 0; i < 1000 && Engine.cam.y > 7; i++) { G.keys = { w: true }; G.state = 'play'; update(0.033); }
      G.keys = {};
      check(Engine.cam.y <= 7 && Math.abs(Engine.cam.x - 20.5) < 0.6, 'walking the clearing path to the headframe is never stopped (reached y=' + Engine.cam.y.toFixed(1) + ')');

      // --- sway and bend ---------------------------------------------------------
      go('clearing', 20.5, 32.5, -Math.PI / 2); FLORA.hold(true);
      const cam = Engine.cam, tuft = G.map._flora.find(e => e._flora === 'grass' && e.x > 3 && e.x < 36 && e.y > 3 && e.y < 33);
      check(tuft, 'a tuft to test with');
      const put = (dir, side, dist) => { const rx = -Math.sin(dir), ry = Math.cos(dir); cam.dir = dir; cam.x = tuft.x - side * rx * dist; cam.y = tuft.y - side * ry * dist; };
      const settle = (n) => { for (let i = 0; i < n; i++) FLORA.step(0.016); };
      put(0.7, 1, 1.7); FLORA.T = 50; settle(10);
      check(Math.abs(tuft._fb || 0) < 1e-6, 'a tuft nobody is near does not bend');
      const swayed = []; for (let i = 0; i < 40; i++) { FLORA.step(0.1); swayed.push(tuft.animSkew); }
      const swayMax = Math.max(...swayed.map(Math.abs)), swayLeft = Math.min(...swayed), swayRight = Math.max(...swayed);
      check(swayRight > 0.01 && swayLeft < -0.01 && swayMax < 0.2, 'a free tuft sways both ways, gently, with the wind (' + swayLeft.toFixed(3) + ' to ' + swayRight.toFixed(3) + ')');
      put(0.7, 1, 30); settle(2); check(tuft.animSkew === 0, 'a distant tuft stays upright, keeping the engine\'s fast sprite path');
      put(0.7, 1, 0.7); G.vel.x = 0; G.vel.y = 0; settle(40);
      const rightStand = tuft._fb; check(rightStand > 0.08, 'a tuft on the player\'s right bends right (' + rightStand.toFixed(3) + ')');
      check(tuft.animSkew > 0.02, 'its skew leans right');
      put(0.7, -1, 0.7); settle(60);
      const leftStand = tuft._fb; check(leftStand < -0.08, 'a tuft on the player\'s left bends left (' + leftStand.toFixed(3) + ')');
      put(2.3, 1, 0.7); settle(60); check(tuft._fb > 0.08, 'the side is relative to where the player looks');
      put(0.7, 1, 0.7); G.vel.x = 5; G.vel.y = 0; settle(60);
      const rightRun = tuft._fb; check(rightRun > rightStand * 1.6, 'running bends it harder (' + rightRun.toFixed(3) + ' vs ' + rightStand.toFixed(3) + ')');
      put(0.7, 1, 0.3); settle(60); check(tuft._fb > rightRun, 'closer bends it more');
      // anim.js zeroes animSkew each frame; the lean survives a real render
      put(0.7, 1, 0.7); G.vel.x = 0; settle(60); const lean0 = tuft.animSkew; render(); render();
      check(lean0 > 0.02 && Math.abs(tuft.animSkew - lean0) < 1e-9, 'anim.js does not overwrite the lean (' + tuft.animSkew.toFixed(3) + ')');
      // easing back: not a snap, and gone in a couple of seconds
      put(0.7, 1, 9); const bent = tuft._fb; settle(10);
      check(Math.abs(tuft._fb) > 0.02 && Math.abs(tuft._fb) < Math.abs(bent), 'it eases back rather than snapping');
      settle(150); check(Math.abs(tuft._fb) < 0.005, 'and is upright again after a couple of seconds');
      // a tuft outside the fog is left alone
      tuft._fb = 0.3; tuft.animSkew = 0.3; cam.x = tuft.x - 40; cam.y = tuft.y; FLORA.step(0.016);
      check(tuft._fb === 0 && tuft.animSkew === 0, 'tufts beyond the fog are not updated');
      // wind drives the sway
      put(0.7, 1, 1.7); const amp = (w) => { Weather.set && 0; let mx = 0; const keep = Object.getOwnPropertyDescriptor(Weather, 'wind'); Object.defineProperty(Weather, 'wind', { get: () => w, configurable: true }); for (let i = 0; i < 400; i++) { FLORA.step(0.05); mx = Math.max(mx, Math.abs(tuft.animSkew)); } if (keep) Object.defineProperty(Weather, 'wind', keep); else delete Weather.wind; return mx; };
      const calm = amp(0.05), gale = amp(0.9); check(gale > calm * 1.8, 'a gale sways harder than a calm (' + calm.toFixed(3) + ' vs ' + gale.toFixed(3) + ')');
      FLORA.hold(false);
      out.bend = { stand: +rightStand.toFixed(3), run: +rightRun.toFixed(3), calm: +calm.toFixed(3), gale: +gale.toFixed(3) };

      // --- toggles ----------------------------------------------------------------
      go('oakhaven', 55, 23, -0.97); quiet(); FLORA.hold(true); FLORA.step(0.2);
      // the sky drifts with the wall clock (engine.js buildSky); freeze it so identical scenes give identical frames
      const realNow = performance.now.bind(performance); performance.now = () => 123456;
      // and so do anim.js's drifting leaves and motes, which are drawn over every frame
      const partSaved = Object.assign({}, PART_STYLE); for (const k in PART_STYLE) delete PART_STYLE[k];
      const tod0 = G.tod, solidProp = G.map._scn.find(e => e.solid), grabFrame = () => { G.tod = tod0; Engine.cam.bob = 0; Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data; };
      const diffPx = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      check(G.map._scn.every(e => !e.hidden) && G.map._flora.every(e => !e.hidden || e._lod), 'props and flora are shown by default (tufts beyond sight are culled)');
      check(solidAt(solidProp.x, solidProp.y, null), 'a solid prop collides');
      if (typeof GFX.pixel3d !== 'undefined') { GFX.pixel3d = false; GFX.changed(); update(0.01); }   // the painted props for every frame compared below (DEFAULTS keeps it off too)
      const frameOn = grabFrame();
      GFX.scenery = false; update(0.01);
      check(G.map._scn.every(e => e.hidden && !G.ents.includes(e)) && G.map._flora.every(e => !e.hidden || e._lod), 'GFX.scenery false hides the props and takes them out of the entity list');
      check(!solidAt(solidProp.x, solidProp.y, null), 'hidden props do not collide');
      GFX.scenery = true; GFX.grass = false; update(0.01);
      check(G.map._flora.every(e => e.hidden && !G.ents.includes(e)) && G.map._scn.every(e => !e.hidden && G.ents.includes(e)), 'GFX.grass false hides the flora and takes it out of the entity list');
      GFX.grass = true; update(0.01);
      check(G.map._flora.every(e => !e.hidden || e._lod), 'and shows it again');
      // GFX.plain() turns everything off; the frame must equal one where the props were never there
      GFX.plain();
      check(G.map._scn.every(e => e.hidden) && G.map._flora.every(e => e.hidden) && !G.ents.some(e => e.transient && !e._decor), 'GFX.plain() hides props and flora and leaves no transient decos in the list');   // _decor: story content (notice boards, journal pages) that is not a graphics effect
      const framePlain = grabFrame(), framePlain2 = grabFrame();
      check(diffPx(framePlain, framePlain2) === 0, 'the plain frame is repeatable');
      // hidden entities must not render or collide even if something puts them back in the list
      const gone = G.map._scn.concat(G.map._flora);
      for (const e of gone) G.ents.push(e);
      const frameHiddenIn = grabFrame();
      check(diffPx(framePlain, frameHiddenIn) === 0 && Array.prototype.every.call(framePlain, (v, i) => v === frameHiddenIn[i]), 'with flags off the frame is byte-identical to one without the props, even with them listed');
      check(!solidAt(solidProp.x, solidProp.y, null), 'hidden props listed in G.ents still do not collide');
      for (const e of gone) G.ents.splice(G.ents.indexOf(e), 1);
      DEFAULTS();
      check(G.map._scn.every(e => !e.hidden) && G.map._flora.every(e => !e.hidden || e._lod), 'restoring the defaults brings them back');
      const frameBack = grabFrame();
      check(diffPx(frameOn, frameBack) === 0, 'and the original frame returns');
      out.propPixels = diffPx(frameOn, framePlain);
      check(out.propPixels > 500, 'the props visibly change the frame (' + out.propPixels + ' px)');
      FLORA.hold(false); performance.now = realNow; Object.assign(PART_STYLE, partSaved);

      // --- frame cost ----------------------------------------------------------------
      // Frames are timed in alternating on/off pairs, so a busy machine slows both halves of a
      // pair together; the median of the paired differences is the cost of the scenery and flora.
      const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
      out.cost = {};
      for (const [id, x, y, d] of [['oakhaven', 23.5, 20.5, -1.57], ['deepwoods', 27.5, 30.5, -1.57]]) {
        go(id, x, y, d); quiet(); DEFAULTS(); Engine.setScale(1); FLORA.hold(true); FLORA.step(0.1);
        const one = (on) => { GFX.scenery = on; GFX.grass = on; SCENERY.sync(); FLORA.sync(); const t0 = performance.now(); Engine.render(G.ents, G.tod); return performance.now() - t0; };
        for (let i = 0; i < 6; i++) { one(true); one(false); }
        const diffs = [], ons = [], offs = [];
        for (let i = 0; i < 60; i++) { const first = i & 1, a = one(!!first), b = one(!first), on = first ? a : b, off = first ? b : a; diffs.push(on - off); ons.push(on); offs.push(off); }
        GFX.scenery = true; GFX.grass = true; SCENERY.sync(); FLORA.sync();
        // the per-frame sway pass on its own, best of many batches
        let best = 1e9; for (let k = 0; k < 20; k++) { const t0 = performance.now(); for (let i = 0; i < 20; i++) FLORA.apply(0.016); best = Math.min(best, (performance.now() - t0) / 20); }
        const vis = G.ents.filter(e => (e._scn || e._flora) && e._screen).length;
        out.cost[id] = { on: +med(ons).toFixed(2), off: +med(offs).toFixed(2), delta: +med(diffs).toFixed(2), ratio: +(med(diffs) / med(offs)).toFixed(3), swayMs: +best.toFixed(3), drawn: vis };
        FLORA.hold(false);
      }
      return out;
    });

    // frame cost budget: scenery + flora together under 1 ms per frame at S=1
    // (the shared machine can be badly overloaded, so the bound is relative to the frame as well as absolute for the sway pass)
    for (const [id, c] of Object.entries(result.cost)) assert.ok(c.ratio < 0.2 && c.swayMs < 0.3, `${id}: scenery + flora cost ${c.delta} ms of a ${c.off} ms frame (${(c.ratio * 100).toFixed(0)}%), sway pass ${c.swayMs} ms`);

    // --- screenshots for the human ----------------------------------------------------
    const views = [
      ['market', 'oakhaven', 55, 23, -0.97], ['lane', 'oakhaven', 14.5, 31.5, 0.6], ['clearing-cart', 'clearing', 21, 31, -1.37], ['quarry', 'quarry', 30.5, 33.2, -1.4],
      ['deepwoods-statues', 'deepwoods', 28.8, 23.2, -1.2], ['deepwoods-bones', 'deepwoods', 11, 40, -2.4], ['whispergrove-court', 'whispergrove', 24.5, 26.5, -2.14], ['catacombs', 'catacombs', 19.5, 7.5, -1.57],
    ];
    for (const [name, id, x, y, dir] of views) {
      for (const state of ['off', 'on']) {
        await page.evaluate(({ id, x, y, dir, state }) => {
          for (const k in G.maps) for (const e of G.maps[k].entities) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
          loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = 0.45; G.msgs && 0; document.getElementById('msgs').innerHTML = '';
          GFX.scenery = state === 'on'; GFX.grass = state === 'on'; GFX.changed(); FLORA.hold(true); FLORA.step(0.4); render();
        }, { id, x, y, dir, state });
        await page.screenshot({ path: path.join(SHOTS, `${name}_${state}.png`) });
      }
    }
    // grass and reeds up close, standing back from a patch, then walking and running through it
    for (const [name, id, kind] of [['grass-clearing', 'clearing', 'grass'], ['reeds-whispergrove', 'whispergrove', 'reed'], ['grass-deepwoods', 'deepwoods', 'grass'], ['reeds-oakhaven-flume', 'oakhaven', 'reed']]) {
      const stand = await page.evaluate(({ id, kind }) => {
        for (const k in G.maps) for (const e of G.maps[k].entities) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
        GFX.scenery = true; GFX.grass = true; GFX.changed();
        loadMap(id, G.maps[id].spawn); G.state = 'play'; G.fadeT = 0; G.tod = 0.45; document.getElementById('msgs').innerHTML = '';
        const sp = G.maps[id].spawn;
        // the densest patch of this kind within reach of the arrival point
        const all = G.map._flora.filter(e => e._flora === kind); let best = null;
        for (const t of all) { const near = all.filter(o => Math.hypot(o.x - t.x, o.y - t.y) < 1.4); const score = near.length - Math.hypot(t.x - sp.x, t.y - sp.y) * 0.12; if (!best || score > best.score) best = { score, near }; }
        let cx = 0, cy = 0; for (const o of best.near) { cx += o.x; cy += o.y; } cx /= best.near.length; cy /= best.near.length;
        const a = Math.atan2(sp.y - cy, sp.x - cx); return { cx, cy, a };
      }, { id, kind });
      for (const [tag, dist, vel] of [['apart', 3.2, 0], ['walk', 0.9, 3], ['run', 0.5, 5.2]]) {
        await page.evaluate(({ stand, dist, vel }) => {
          const c = Engine.cam; c.x = stand.cx + Math.cos(stand.a) * dist; c.y = stand.cy + Math.sin(stand.a) * dist; c.dir = stand.a + Math.PI + 0.12;
          G.vel.x = Math.cos(c.dir) * vel; G.vel.y = Math.sin(c.dir) * vel; FLORA.hold(true); FLORA.step(0.2); for (let i = 0; i < 40; i++) FLORA.step(0.016); render();
        }, { stand, dist, vel });
        await page.screenshot({ path: path.join(SHOTS, `${name}_${tag}.png`) });
      }
    }
    await page.evaluate(() => { FLORA.hold(false); G.vel.x = 0; G.vel.y = 0; });
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));

    console.log('PASS scenery.test.js');
    console.log('props/flora per map', JSON.stringify(result.counts));
    console.log('reachability targets checked', JSON.stringify(result.reach), 'nearest prop to a door', result.nearestDoor);
    console.log('bend', JSON.stringify(result.bend), 'prop pixels', result.propPixels);
    console.log('frame cost (median ms/frame at S=1, paired on vs off; on a loaded machine)', JSON.stringify(result.cost));
    console.log('screenshots in', SHOTS);
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL scenery.test.js:', e.message || e); process.exit(1); });
