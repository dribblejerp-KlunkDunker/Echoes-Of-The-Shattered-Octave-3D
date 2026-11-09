// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/path/to/playwright node test/horizon20.test.js
// Phase 20 HORIZON (js/horizon20.js, plus the art in js/sky.js and js/ceilings.js):
//  - the Watch Downs: registered, joined to the clearing only, BFS-safe (no softlock, no harmful fall, the Scar's top out
//    of reach), walked for real from the hurdle to the beacon and back, saved and restored, no story flag touched;
//  - country beyond the walls: Oakhaven drawn past the Hedge from the clearing, only where nothing nearer was drawn;
//  - the Chapel's belfry: openings with an empty frame; the Rite's lamp only once rite_ready; no bell, ever;
//  - the Chapel's bell-frame inside: the drawn frame (and the lamp variant), the stand-in back when the switch is off;
//  - art present and sized, the Original preset / switches off byte-identical to a page without the module, frame cost.
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
  if (block) await page.route('**/js/horizon20.js*', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Horizon Tester');
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
    Engine.addPostHook((F) => { if (window.__on) window.__cap = { fb: F.fb.slice(), mbuf: F.mbuf.slice(), dbuf: F.dbuf.slice(), w: F.w, h: F.h, horizon: F.horizon }; }, 9999);
    // right after this module's hooks (-9.6, -9.5): the frame before any later pass has spread or graded it
    Engine.addPostHook((F) => { if (window.__on) window.__early = { fb: F.fb.slice(), mbuf: F.mbuf.slice(), dbuf: F.dbuf.slice(), w: F.w, h: F.h }; }, -9.4);
    window.go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; for (const m in G.maps) for (const e of G.maps[m].entities) if (e.kind === 'enemy') e.hidden = true; };
    window.grab = (tod, dir, ents) => {
      Engine.cam.bob = 0; Engine.cam.pitch = 0; if (dir != null) Engine.cam.dir = dir; Engine.setTime(3.3);
      Weather.release(); Weather.hold('clear'); Weather.tick(1 / 60);
      const pn = performance.now; performance.now = () => 555555;
      window.__on = true; try { Engine.render(ents ? G.ents : [], tod); } finally { performance.now = pn; window.__on = false; }
      return window.__cap;
    };
    window.hash = (c) => { let h = 2166136261; for (let i = 0; i < c.fb.length; i++) { h ^= c.fb[i]; h = Math.imul(h, 16777619); } return (h >>> 0) + ':' + c.w; };
    window.diff = (a, b) => { const out = []; for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) out.push(i); return out; };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const A = await boot(browser, false);
    const B = await boot(browser, true);
    assert.equal(await B.page.evaluate(() => typeof HORIZON20), 'undefined', 'page B runs without js/horizon20.js');

    // ---- the off state: the Original preset (and the switches off) are the frames of a build without the module ----
    const scenes = [
      ['clearing', 20.5, 24.5, 0.57, 0.5], ['clearing', 29.5, 19.5, 0.9, 0.77], ['oakhaven', 44.5, 15.5, -1.2, 0.5], ['oakhaven', 49.0, 13.5, -1.57, 0.8],
      ['chapel', 6.5, 5.5, -Math.PI / 2, 0.5], ['tavern', 8.5, 9.5, -Math.PI / 2, 0.5], ['deepwoods', 27.5, 30.5, 3.0, 0.5], ['whispergrove', 20.5, 20.5, 1.0, 0.5],
    ];
    // Phase 20 MAX: the Original preset now has both switches on (belfryArt is art, farCountry is on in all but Low), so
    // the off state compares Original with the two switches turned off
    assert.deepEqual(await A.page.evaluate(() => { PRESETS.apply('original'); return [GFX.farCountry, GFX.belfryArt]; }), [true, true], 'the Original preset has both switches on');
    const hashes = (page, preset) => page.evaluate(({ scenes, preset }) => {
      PRESETS.apply(preset); if (typeof HORIZON20 !== 'undefined') { GFX.farCountry = false; GFX.belfryArt = false; } GFX.preset = PRESETS.current(); GFX.changed();
      return scenes.map(([m, x, y, d, tod]) => { go(m, x, y, d); return hash(grab(tod, d, m === 'chapel')); });
    }, { scenes, preset });
    for (const flag of ['rite', 'plain']) {
      if (flag === 'rite') { await A.page.evaluate(() => { G.flags.rite_ready = true; }); await B.page.evaluate(() => { G.flags.rite_ready = true; }); }
      const ha = await hashes(A.page, 'original'), hb = await hashes(B.page, 'original');
      const bad = ha.map((h, i) => (h === hb[i] ? -1 : i)).filter((i) => i >= 0);
      assert.deepEqual(bad, [], 'Original preset frames match a build without js/horizon20.js (' + flag + '; mismatches ' + bad.map((i) => scenes[i].join(',')).join(' | ') + ')');
      await A.page.evaluate(() => { delete G.flags.rite_ready; }); await B.page.evaluate(() => { delete G.flags.rite_ready; });
    }
    // (wandering townsfolk differ between two live pages, so only the Chapel scene draws its entities: the frame is one)
    // the two switches alone off, in Medium: the same (day scenes: at night Medium's own particles and air effects run on
    // each page's live clock, so two live pages differ there with or without this module)
    const dayScenes = scenes.filter((q) => q[4] === 0.5);
    const offA = await A.page.evaluate((scenes) => { PRESETS.apply('medium'); GFX.farCountry = false; GFX.belfryArt = false; GFX.changed(); return scenes.map(([m, x, y, d, tod]) => { go(m, x, y, d); return hash(grab(tod, d, false)); }); }, dayScenes);
    const offB = await B.page.evaluate((scenes) => { PRESETS.apply('medium'); GFX.changed(); return scenes.map(([m, x, y, d, tod]) => { go(m, x, y, d); return hash(grab(tod, d, false)); }); }, dayScenes);
    assert.deepEqual(offA.map((h, i) => (h === offB[i] ? '' : dayScenes[i].join(','))).filter(Boolean), [], 'Medium with Country beyond walls and Chapel belfry off matches a build without the module');
    console.log('PASS off state: the Original preset with both switches off (with and without rite_ready) and Medium with both off are byte-identical to a build without js/horizon20.js in ' + scenes.length + ' scenes');

    // ---- maps and saves: the clearing gains one door cell, no entity ----
    const shape = (page) => page.evaluate(() => { const c = G.maps.clearing; return { n: c.entities.length, base: c.baseCount, cells: c.cells.map((q) => (q ? (q.door ? 'D' : q.tex + '@' + (q.top == null ? '' : q.top)) : '.')) }; });
    const sa = await shape(A.page), sb = await shape(B.page);
    assert.equal(sa.n, sb.n, 'the clearing has the same entities'); assert.equal(sa.base, sb.base, 'and the same baseCount');
    const cellDiff = sa.cells.map((ch, i) => (ch === sb.cells[i] ? -1 : i)).filter((i) => i >= 0);
    assert.equal(cellDiff.length, 1, 'exactly one clearing cell changes (' + cellDiff.length + ': ' + cellDiff.slice(0, 6).map((i) => i + ' ' + sa.cells[i] + '/' + sb.cells[i]).join(', ') + ')');
    console.log('PASS the clearing: one new door cell (index ' + cellDiff[0] + '), entities and baseCount unchanged (' + sa.n + ')');

    const r = await A.page.evaluate(() => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const out = {};
      PRESETS.apply('medium'); GFX.preset = PRESETS.current(); GFX.changed();
      // --- art ---
      for (const k of ['p20_bellframe', 'p20_bellframe_lamp', 'p20_thorn', 'p20_cairn', 'p20_stone']) { const s = Engine.sprites[k]; check(s && s.w > 8 && s.h > 8 && s.data.length === s.w * s.h, 'sprite ' + k); check(s.data.some((p) => (p >>> 24) > 0) && s.data.some((p) => (p >>> 24) === 0), k + ' has a silhouette'); }
      for (const k of ['t_p20_chalk', 't_p20_track', 't_p20_gate', 'c_beams', 'c_vault', 'c_rock']) check(Engine.textures[k] && Engine.textures[k].length === 4096, 'texture ' + k);
      check(Engine.sprites.p20_bellframe_lamp.emit && Engine.sprites.p20_bellframe_lamp.emit.some((v) => v), 'the lamp variant carries an emissive mask');
      check(HORIZON20.BELFRY.plain.d.length === 128 * 64 && HORIZON20.BELFRY.lamp.glow.some((v) => v) && !HORIZON20.BELFRY.plain.glow.some((v) => v), 'belfry art: 128x64 a face; only the lamp variant glows');
      out.art = 'ok';

      // --- the Downs: registered, joined to the clearing only ---
      const D = G.maps[HORIZON20.DOWNS], cl = G.maps.clearing;
      check(D && D.outdoor && D.danger === 0 && D.lvls && D.smooth, 'the Downs are an outdoor height-mapped map with danger 0');
      const portals = []; for (let i = 0; i < D.cells.length; i++) { const c = D.cells[i]; if (c && c.portal) portals.push(c.portal.map); }
      // Phase 22 (js/sheepwalk22.js, the Author Rulings' region) adds one stile, south to Wethercombe; nothing else
      const ways = typeof SHEEPWALK22 !== 'undefined' ? ['clearing', SHEEPWALK22.COMBE] : ['clearing'];
      check(portals.length === ways.length && ways.every((w) => portals.includes(w)), 'the Downs\' ways out are ' + ways.join(' and ') + ' (' + portals.join(',') + ')');
      for (let x = 0; x < D.w; x++) for (const y of [0, D.h - 1]) check(D.get(x, y), 'the Downs are walled at ' + x + ',' + y);
      for (let y = 0; y < D.h; y++) for (const x of [0, D.w - 1]) check(D.get(x, y), 'the Downs are walled at ' + x + ',' + y);
      check(!D.entities.some((e) => e.kind === 'enemy' || e.kind === 'item' || e.kind === 'npc' || e.use), 'no enemies, items, people or usable props up there: walking and looking only');
      const g = cl._p20Gate, gc = cl.get(g.x, g.y);
      check(gc && gc.door && gc.portal && gc.portal.map === HORIZON20.DOWNS && !gc.locked && !/gate|grate|culvert/i.test(gc.label), 'the clearing\'s hurdle leads to the Downs, unlocked');
      // BFS: from the clearing's road, the hurdle is reachable; on the Downs, everything reached can get back; no harmful fall
      const rc = HORIZON20.reach(cl, 20, 33, 20, 33);
      check(rc.fwd[g.y * cl.w + 1], 'the hurdle is reachable from the North Gate road in the clearing');
      const yd = D._p20.yd, rd = HORIZON20.reach(D, D.w - 2, yd, D.w - 2, yd);
      check(rd.stuck === 0, 'no softlock on the Downs (' + rd.stuck + ' cells cannot get back: ' + JSON.stringify(rd.stuckCells) + ')');
      check(rd.maxDrop <= FALL_SAFE, 'no fall that hurts (worst drop ' + rd.maxDrop + ')');
      check(rd.reached > 1000, 'most of the Downs can be walked (' + rd.reached + ' cells)');
      check(!rd.fwd[9 * D.w + 32] && D.groundAt(32.5, 9.5) > 2, 'the Scar\'s top is out of reach');
      check(rd.fwd[13 * D.w + 18] && D.groundAt(18.5, 13.5) > 2.1, 'the Long Down\'s summit is in reach (' + D.groundAt(18.5, 13.5).toFixed(2) + ')');
      const looks = D.entities.filter((e) => e.label && e.kind === 'deco' && e.sprite !== 'oak' && e.sprite !== 'p20_thorn');
      for (const e of looks) { let ok = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const x = Math.floor(e.x) + dx, y = Math.floor(e.y) + dy; if (rd.fwd[y * D.w + x]) ok = true; } check(ok, 'you can walk up to ' + e.sprite + ' at ' + e.x + ',' + e.y); }
      out.bfs = { reached: rd.reached, stuck: rd.stuck, maxDrop: rd.maxDrop, maxZ: rd.maxZ, looks: looks.length };

      // --- walk it for real: through the hurdle, up the track to the beacon, and back down ---
      const flags0 = JSON.stringify(G.flags);
      go('clearing', 1.6, g.y + 0.5, Math.PI); G.player.hp = G.player.hpMax; const hp0 = G.player.hp;
      transfer(gc.portal);
      check(G.mapId === HORIZON20.DOWNS && Math.abs(Engine.cam.x - (D.w - 2.4)) < 0.01, 'the hurdle takes you onto the Downs');
      const walkTo = (pts, maxT) => {
        G.state = 'play'; G.fadeT = 0; let t = 0, k = 0;
        while (k < pts.length && t < maxT) {
          const [tx, ty] = pts[k], dx = tx - Engine.cam.x, dy = ty - Engine.cam.y;
          if (Math.hypot(dx, dy) < 0.4) { k++; continue; }
          Engine.cam.dir = Math.atan2(dy, dx); G.keys = { w: true }; update(1 / 30); t += 1 / 30;
          if (G.mapId !== HORIZON20.DOWNS) break;
        }
        G.keys = {}; for (let i = 0; i < 20; i++) update(1 / 30);
        return k;
      };
      const up = [[34.5, yd + 0.5], [28.5, yd - 1.5], [24.5, 19.5], [20.5, 15.5], [18.6, 14.0]];
      const k1 = walkTo(up, 90);
      out.summit = { z: +G.player.feet.toFixed(2), k: k1, x: +Engine.cam.x.toFixed(2), y: +Engine.cam.y.toFixed(2) };
      check(k1 === up.length && G.player.feet > 2.1, 'walked up the track to the beacon (feet ' + G.player.feet.toFixed(2) + ', waypoint ' + k1 + ')');
      check(G.player.hp === hp0, 'no damage on the way up');
      // down the steep side of the Long Down toward the pond (a slope, not a fall) and back to the hurdle
      const down = [[12.5, 22.5], [9.5, 29.5], [16.5, 30.0], [16.5, 32.5], [24.5, 30.5], [34.5, yd + 0.5], [D.w - 2.2, yd + 0.5]];
      walkTo(down, 120);
      // at the hurdle: face it and use it, as a player does (E)
      Engine.cam.dir = 0; interact();
      check(G.player.hp === hp0, 'no damage coming down (' + G.player.hp + '/' + hp0 + ')');
      check(G.mapId === 'clearing', 'walking into the hurdle takes you back to the clearing (' + G.mapId + ')');
      { const f0 = JSON.parse(flags0), changed = Object.keys(Object.assign({}, f0, G.flags)).filter((k) => JSON.stringify(f0[k]) !== JSON.stringify(G.flags[k])); out.flagsChanged = changed; check(!changed.some((k) => /p20|horizon|gate_open|rite|greening|culvert/.test(k)), 'no story flag changed by the visit (' + changed.join(',') + ')'); }
      out.walk = 'ok';

      // --- save and restore on the hill ---
      go(HORIZON20.DOWNS, 17.4, 15.4, 0); settleFeet();
      const z0 = G.player.feet, snap = JSON.parse(JSON.stringify(snapshotGame()));
      go('tavern', 8.5, 10.5, 0); restoreGame(snap); G.state = 'play';
      check(G.mapId === HORIZON20.DOWNS && Math.abs(G.player.feet - z0) < 1e-6 && z0 > 1.5, 'a save on the Downs restores there, feet on the hill (' + z0.toFixed(2) + ')');
      check(G.maps.clearing.get(g.x, g.y).portal.map === HORIZON20.DOWNS, 'the restored world still has the hurdle');

      // --- the Chapel from beyond the Hedge ---
      const farCase = (x, y, d, tod, preset) => {
        PRESETS.apply(preset); GFX.changed(); go('clearing', x, y, d);
        GFX.farCountry = false; GFX.changed(); grab(tod, d); const off = window.__early; GFX.farCountry = true; GFX.changed(); grab(tod, d); const on = window.__early;
        const dd = diff(off, on); let wasSky = 0; for (const i of dd) if (off.dbuf[i] >= 1e8) wasSky++;
        return { n: dd.length, onlyBack: wasSky === dd.length, backShare: +(wasSky / Math.max(1, dd.length)).toFixed(3), farPx: HORIZON20.stats.farPx };
      };
      const c1 = farCase(20.5, 24.5, 0.57, 0.5, 'medium'), c2 = farCase(29.5, 19.5, 0.9, 0.5, 'cinematic');
      check(c1.n > 150 && c1.onlyBack, 'from the clearing, Oakhaven shows over the Hedge and only where nothing nearer was drawn (' + JSON.stringify(c1) + ')');
      check(c2.n > 1000 && c2.onlyBack, 'from the Watch-stone in Cinematic, the town and the ground beyond (' + JSON.stringify(c2) + ')');
      PRESETS.apply('medium'); GFX.changed();
      go('clearing', 20.5, 24.5, -1.57); GFX.farCountry = false; GFX.changed(); const n0 = grab(0.5, -1.57); GFX.farCountry = true; GFX.changed(); const n1 = grab(0.5, -1.57);
      check(diff(n0, n1).length === 0, 'looking north from the clearing, away from the town, nothing changes');
      out.far = { clearingMedium: c1.n, stoneCinematic: c2.n };

      // --- the belfry, and the empty frame ---
      const bel = (x, y, d, tod, rite) => {
        if (rite) G.flags.rite_ready = true; else delete G.flags.rite_ready;
        go('oakhaven', x, y, d); GFX.belfryArt = false; GFX.changed(); const off = grab(tod, d); GFX.belfryArt = true; GFX.changed(); const on = grab(tod, d);
        let glow = 0; for (let i = 0; i < on.mbuf.length; i++) if (on.mbuf[i] === 8 && off.mbuf[i] !== 8) glow++;
        const dd = diff(off, on); let walls = 0; for (const i of dd) if (off.mbuf[i] === 4) walls++;
        return { n: dd.length, walls, glow, px: HORIZON20.stats.belfryPx };
      };
      const b1 = bel(44.5, 15.5, -1.2, 0.5, false), b2 = bel(49.0, 13.5, -1.57, 0.8, true), b3 = bel(49.0, 13.5, -1.57, 0.8, false), b4 = bel(44.5, 3.5, 0.5, 0.8, true);
      check(b1.n > 100 && b1.walls === b1.n, 'the belfry repaints only the tower\'s wall pixels (' + JSON.stringify(b1) + ')');
      check(b2.glow > 0 && b3.glow === 0, 'with rite_ready the glass-fire lamp glows in the south opening; without it, none (' + b2.glow + ' / ' + b3.glow + ')');
      check(b4.glow === 0, 'the lamp is not seen from the north side (' + b4.glow + ')');
      delete G.flags.rite_ready;
      // no bell: no flag in the game puts one back, so nothing here may draw one (the art has no bell; this guards the wiring)
      check(!Object.keys(Engine.sprites).some((k) => /^p20_.*bell(?!frame)/.test(k)), 'no bell sprite exists in this module');
      out.belfry = { day: b1.n, riteGlow: b2.glow };
      // the frame inside
      const fr = () => G.maps.chapel.entities.find((e) => e.use === 'plinth');
      const f0 = { r: fr().radius, s: fr().scale, x: fr().x, y: fr().y };
      go('chapel', 6.5, 8.5, -Math.PI / 2); check(fr().sprite === 'p20_bellframe', 'the Chapel shows the drawn, empty frame (' + fr().sprite + ')');
      G.flags.rite_ready = true; go('chapel', 6.5, 8.5, -Math.PI / 2); check(fr().sprite === 'p20_bellframe_lamp', 'after rite_ready, the lamp hangs in it');
      GFX.belfryArt = false; GFX.changed(); check(fr().sprite === 'lever', 'switch off: the old stand-in comes back');
      GFX.belfryArt = true; GFX.changed(); delete G.flags.rite_ready; go('chapel', 6.5, 8.5, -Math.PI / 2);
      check(fr().radius === f0.r && fr().scale === f0.s && fr().x === f0.x && fr().y === f0.y && fr().use === 'plinth', 'same place, radius, scale and use');
      // hostile save data cannot reach markup: the frame's text is the game's own, the flag only picks a sprite
      G.flags.rite_ready = '<img src=x onerror=alert(1)>'; go('chapel', 6.5, 8.5, -Math.PI / 2); check(fr().sprite === 'p20_bellframe_lamp' && !document.querySelector('img[src="x"]'), 'a hostile flag value only picks the sprite'); delete G.flags.rite_ready;

      // --- cost: the two hooks timed on their own (medians), at S=1 and S=2 ---
      const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
      const cost = {};
      for (const [preset, label] of [['medium', 'S1'], ['cinematic', 'S2']]) {
        PRESETS.apply(preset); GFX.changed();
        for (const [m, x, y, d, hook] of [['clearing', 29.5, 19.5, 0.9, 'far'], ['oakhaven', 44.5, 15.5, -1.2, 'belfry'], [HORIZON20.DOWNS, 18.5, 14.5, 0.6, 'far']]) {
          go(m, x, y, d); if (m === HORIZON20.DOWNS) settleFeet();
          let F = null; Engine.addPostHook((f) => { F = f; }, 9998);
          const fr = []; for (let k = 0; k < 9; k++) { const t0 = performance.now(); Engine.render([], 0.5); fr.push(performance.now() - t0); }
          // re-run the hook on the frame as the renderer left it: snapshot before the post hooks by re-rendering with the
          // module's switches off, then time the hook alone on that frame
          GFX.farCountry = false; GFX.belfryArt = false; Engine.render([], 0.5); GFX.farCountry = true; GFX.belfryArt = true;
          const snapFb = F.fb.slice(), snapD = F.dbuf.slice(), snapM = F.mbuf.slice();
          const ts = [];
          for (let k = 0; k < 15; k++) { F.fb.set(snapFb); F.dbuf.set(snapD); F.mbuf.set(snapM); const t0 = performance.now(); HORIZON20.hooks[hook](F); ts.push(performance.now() - t0); }
          cost[label + ':' + m + ':' + hook] = { ms: +med(ts).toFixed(3), frame: +med(fr).toFixed(2), share: +(med(ts) / med(fr)).toFixed(3) };
        }
      }
      // budget: a share of the same page's frame, measured in the same minute (the build box is shared, wall times swing)
      for (const k in cost) check(cost[k].share < 0.3, 'hook ' + k + ' stays inside its share of a frame (' + JSON.stringify(cost[k]) + ')');
      out.cost = cost;
      PRESETS.apply('medium'); GFX.changed();
      return out;
    });
    console.log('PASS art: sprites, textures, belfry art and emissive lamp present and sized');
    console.log('PASS the Downs: out to the clearing (and Wethercombe, Phase 22) only, walled, no enemies/items/people; BFS ' + JSON.stringify(r.bfs) + '; the Scar out of reach, the summit in reach, every sign and stone walkable to');
    console.log('PASS walked through the hurdle, up to the beacon (' + JSON.stringify(r.summit) + '; flags other modules recorded on the way: ' + JSON.stringify(r.flagsChanged) + ') and back down to the clearing with no damage and no flag changed; a save on the hill restores there');
    console.log('PASS country beyond the walls: ' + JSON.stringify(r.far) + ' px, only where nothing nearer was drawn; nothing when looking away');
    console.log('PASS belfry: ' + JSON.stringify(r.belfry) + '; the lamp only with rite_ready and only from the square side; no bell; the Chapel frame drawn (lamp variant with rite_ready), stand-in back when off, entity unchanged, hostile flag harmless');
    console.log('PASS hook cost (ms, medians): ' + JSON.stringify(r.cost));

    assert.deepEqual(A.errors, [], 'no browser errors (page A)');
    assert.deepEqual(B.errors, [], 'no browser errors (page B)');
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
