// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/path/to/playwright node test/sheepwalk22.test.js
// Phase 22 "The Sheep-Walk" (js/sheepwalk22.js): the Watch Downs region.
//  - the route: Wethercombe joins the Downs only, the Bellwether joins Wethercombe only, the Downs gain one stile and
//    nothing else; the pylon stands at the bearing the clearing's panorama paints it;
//  - every map is BFS-safe (no softlock, no fall that hurts) and every person, stake, tree, beacon and stray can be
//    walked up to; the stile is walked through for real both ways;
//  - the four things to do, played through by their own rules: Strays (five ewes over two maps, led home), The
//    Scouring (six stakes, an hour each, the figure's tiles turning), Three Fires (tinder, furze, the Long Down cairn
//    and two beacons, burning at night), The Iron Hum (refused while the hounds live, then the wire cut); apples;
//  - mutton six ways on every inn's and food-seller's list, bought through the real dialogue and eaten;
//  - a save in Wethercombe restores the flags and rebuilds the sheep, and no transient entity is ever saved;
//  - frames drawn on the CPU and with R3D, and no page errors.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000') + '/index.html?nosw=1';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const pass = (m) => console.log('PASS ' + m);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* none */ } window.__r3d21 = { automation: true }; let a = 2022; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Sheep Tester');
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
      window.__checks = [];
      window.check = (ok, label) => { window.__checks.push([!!ok, label]); };
      window.go = (id, x, y, dir) => { loadMap(id, x != null ? { x, y, dir: dir || 0 } : undefined); G.state = 'play'; G.fadeT = 0; try { closeModal(); } catch (e) { /* none */ } G.state = 'play'; };
      window.ent = (map, f) => G.maps[map].entities.find(f);
      window.near = (r, m, x, y) => { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const cx = Math.floor(x) + dx, cy = Math.floor(y) + dy; if (cx >= 0 && cy >= 0 && cx < m.w && cy < m.h && r.fwd[cy * m.w + cx]) return true; } return false; };
      window.step = (n, dt) => { for (let i = 0; i < n; i++) { G.state = 'play'; update(dt || 1 / 30); } };
      window.talkTo = (e) => { G.state = 'play'; talk(e); const said = DLG.log.map((l) => l.t).join(' | '); closeModal(); G.state = 'play'; return said; };
      for (const m in G.maps) for (const e of G.maps[m].entities) if (e.kind === 'enemy' && m !== SHEEPWALK22.COMBE) e.hidden = true;
    });
    const results = async (title) => {
      const r = await page.evaluate(() => { const c = window.__checks; window.__checks = []; return c; });
      const bad = r.filter((c) => !c[0]).map((c) => c[1]);
      assert.deepEqual(bad, [], title + ': ' + bad.join('; '));
      pass(title + ' (' + r.length + ' checks)');
    };

    // ---------------------------------------------------------------- the route and the reach
    const route = await page.evaluate(() => {
      const S = SHEEPWALK22, C = G.maps[S.COMBE], I = G.maps[S.INN], D = G.maps[S.DOWNS], cl = G.maps.clearing;
      check(C && C.outdoor && C.danger === 1 && C.smooth, 'Wethercombe is an outdoor height-mapped map, danger 1');
      check(I && !I.outdoor, 'the Bellwether is an interior');
      const portals = (m) => { const out = []; for (const c of m.cells) if (c && c.portal) out.push(c.portal.map); return out; };
      const hanger = typeof HANGER22 !== 'undefined' ? [HANGER22.HANGER, HANGER22.BARROW] : [];   // Phase 22b adds the gap into the Hanger
      const r4 = typeof THIN29 !== 'undefined' ? [THIN29.MAPS.farm, THIN29.MAPS.barn, THIN29.MAPS.cottage] : [];   // R4 opens the farmsteads
      check(JSON.stringify(portals(C).sort()) === JSON.stringify([S.DOWNS, S.INN].concat(hanger.slice(0, 1), r4).sort()), 'Wethercombe joins the Downs, its inn, the Hanger and its farmsteads only (' + portals(C) + ')');
      check(JSON.stringify(portals(I)) === JSON.stringify([S.COMBE]), 'the inn joins Wethercombe only');
      check(portals(D).filter((p) => p === S.COMBE).length === 1, 'the Downs have one stile to Wethercombe');
      for (const id in G.maps) if (id !== S.DOWNS && id !== S.COMBE && id !== S.INN && hanger.indexOf(id) < 0 && r4.indexOf(id) < 0) check(!portals(G.maps[id]).some((p) => p === S.COMBE || p === S.INN), 'nothing else leads to the new maps (' + id + ')');
      check(!portals(G.maps.oakhaven).includes(S.COMBE) && D.danger === 0, 'nothing new joins Oakhaven, and the Downs keep danger 0');
      for (let x = 0; x < C.w; x++) for (const y of [0, C.h - 1]) check(C.get(x, y), 'Wethercombe is walled at ' + x + ',' + y);
      for (let y = 0; y < C.h; y++) for (const x of [0, C.w - 1]) check(C.get(x, y), 'Wethercombe is walled at ' + x + ',' + y);
      // the pylon's bearing from the clearing, in Oakhaven's frame (clearing: oak = map + (3, -35))
      const px = S.PYLON[0] + S.OFF[0], py = S.PYLON[1] + S.OFF[1], cx = cl.w / 2 + 3, cy = cl.h / 2 - 35, b = Math.atan2(py - cy, px - cx);
      check(Math.abs(b - 2.07) < 0.06, 'the pylon stands at the clearing panorama\'s bearing 2.07 (' + b.toFixed(3) + ')');
      // Wethercombe lies west of Oakhaven (oak x 0..70) and south of the Downs
      check(S.OFF[0] + C.w <= 0 + 1 && S.OFF[1] >= 1, 'Wethercombe is west of Oakhaven and south of the Downs');
      // reach: from the stile, nothing reached is stuck, no fall hurts, and every thing to use can be walked up to
      const rc = HORIZON20.reach(C, S.STILE[0], 1, S.STILE[0], 1);
      check(rc.stuck === 0, 'no softlock in Wethercombe (' + JSON.stringify(rc.stuckCells) + ')');
      check(rc.maxDrop <= FALL_SAFE, 'no fall that hurts in Wethercombe (' + rc.maxDrop + ')');
      check(rc.reached > 2000, 'most of Wethercombe can be walked (' + rc.reached + ')');
      for (const e of C.entities) if ((e.kind === 'npc' || e.use || e.kind === 'item') && e.use !== 'p22_pylon') check(near(rc, C, e.x, e.y), 'you can walk up to ' + (e.id || e.use || e.item) + ' at ' + e.x + ',' + e.y);
      const py0 = C.entities.find((e) => e.use === 'p22_pylon'); let pyOk = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (rc.fwd[(Math.floor(py0.y) + dy) * C.w + Math.floor(py0.x) + dx]) pyOk = true;
      check(pyOk, 'the pylon\'s foot can be reached');
      for (const s of S.STRAYS.filter((s) => s.map === S.COMBE)) check(near(rc, C, s.x, s.y), 'the stray at ' + s.x + ',' + s.y + ' can be reached');
      let foldIn = false; for (let y = S.FOLD.y0 + 1; y < S.FOLD.y1; y++) for (let x = S.FOLD.x0 + 1; x < S.FOLD.x1; x++) if (rc.fwd[y * C.w + x]) foldIn = true;
      check(foldIn, 'the fold can be walked into');
      const ri = HORIZON20.reach(I, 6, 9, 6, 9);
      check(ri.stuck === 0 && ri.maxDrop <= FALL_SAFE, 'the inn is safe');
      for (const e of I.entities) if (e.kind === 'npc') check(near(ri, I, e.x, e.y), 'you can walk up to ' + e.id + ' in the inn');
      const yd = D._p20.yd, rd = HORIZON20.reach(D, D.w - 2, yd, D.w - 2, yd);
      check(rd.stuck === 0 && rd.maxDrop <= FALL_SAFE, 'the Downs stay safe with the stile');
      check(near(rd, D, S.STILE_DOWNS[0] + 0.5, S.STILE_DOWNS[1] - 1), 'the stile is reachable from the Downs\' hurdle');
      for (const s of S.STRAYS.filter((s) => s.map === S.DOWNS)) check(near(rd, D, s.x, s.y), 'the stray on the Downs at ' + s.x + ',' + s.y + ' can be reached');
      return { reached: rc.reached, maxZ: rc.maxZ };
    });
    await results('route and reach ' + JSON.stringify(route));

    // ---------------------------------------------------------------- walk through the stile for real, both ways
    await page.evaluate(() => {
      const S = SHEEPWALK22, D = G.maps[S.DOWNS];
      go(S.DOWNS, S.STILE_DOWNS[0] + 0.5, S.STILE_DOWNS[1] - 1.6, Math.PI / 2);
      const st = D.get(S.STILE_DOWNS[0], S.STILE_DOWNS[1]); transfer(st.portal); G.state = 'play';
      check(G.mapId === S.COMBE && Math.abs(Engine.cam.y - 1.6) < 0.2, 'through the stile into Wethercombe');
      const back = G.map.get(S.STILE[0], 0); transfer(back.portal); G.state = 'play';
      check(G.mapId === S.DOWNS, 'and back up onto the Downs');
      go(S.COMBE); const inn = G.map.cells.find((c) => c && c.portal && c.portal.map === S.INN); transfer(inn.portal); G.state = 'play';
      check(G.mapId === S.INN && G.ents.some((e) => e.id === 'p22_gideon') && G.ents.some((e) => e.id === 'p22_absalom'), 'into the Bellwether: Gideon and Absalom are there');
      check(Engine.sprites.p22_tamar && Engine.sprites.p22_gideon && Engine.sprites.p22_absalom && Engine.sprites.p22_kit, 'the four new people have their sprites');
    });
    await results('the stile and the inn door, walked');

    // ---------------------------------------------------------------- Strays
    await page.evaluate(() => {
      const S = SHEEPWALK22;
      go(S.COMBE, 34.5, 29.4, Math.PI / 2);
      check(G.ents.filter((e) => e._p22 === 'sheep').length === 6, 'six of the flock at home before the quest (' + G.ents.filter((e) => e._p22 === 'sheep').length + ')');
      check(!G.ents.some((e) => e.stray != null), 'no strays before Tamar asks');
      const said = talkTo(ent(S.COMBE, (e) => e.id === 'p22_tamar'));
      check(/Eleven Rust Coast ewes/.test(said) && /Every sheep in the Reach went into the Hedge/.test(said), 'Tamar asks, and tells what became of the Downs flocks');
      check(G.flags.p22w_flock === 1 && G.flags.p22w_truth === 1 && G.journal.some((j) => /eaten in the two shut years/.test(j.text)), 'quest and the truth in the logbook');
      go(S.COMBE, 34.5, 29.4, Math.PI / 2);
      check(G.ents.filter((e) => e.stray != null).length === 3, 'three strays in Wethercombe');
      go(S.DOWNS, 30, 20, 0);
      const strays = G.ents.filter((e) => e.stray != null);
      check(strays.length === 2, 'two strays on the Downs');
      for (const e of strays) { Engine.cam.x = e.x + 0.8; Engine.cam.y = e.y; useDeco(e); }
      check(G.flags.p22w_f0 === 1 && G.flags.p22w_f1 === 1, 'both Downs ewes found');
      // they follow across the stile
      go(S.COMBE, 34.5, 2.2, Math.PI / 2);
      check(SHEEPWALK22.T.followers.length === 2, 'two ewes follow you down into Wethercombe');
      for (const e of G.ents.filter((q) => q.stray != null)) { Engine.cam.x = e.x + 0.8; Engine.cam.y = e.y; useDeco(e); step(2); }
      check(SHEEPWALK22.T.followers.length === 5, 'all five follow');
      // walk them into the fold: the camera goes to the gate and then in; the followers come behind
      go(S.COMBE, S.FOLD.cx, S.FOLD.y0 - 1.2, Math.PI / 2);
      step(90);
      Engine.cam.x = S.FOLD.cx; Engine.cam.y = S.FOLD.cy; step(240);
      check(SHEEPWALK22.homeCount() === 5, 'all five ewes counted home at the fold (' + SHEEPWALK22.homeCount() + ')');
      const gold0 = G.player.gold;
      const said2 = talkTo(ent(S.COMBE, (e) => e.id === 'p22_tamar'));
      check(G.flags.p22w_flock === 2 && G.player.inv.some((s) => s.id === 'a_p22_mantle') && G.player.gold === gold0 + 30, 'Tamar\'s reward: the mantle and thirty sovereigns');
      check(/My mother\'s mantle/.test(said2), 'and she says so');
      go(S.DOWNS, 30, 20, 0);
      check(G.ents.filter((e) => e._p22 === 'sheep' && e.stray == null).length >= 6, 'the flock grazes the Downs again');
      check(/There are Farrant ewes on it again/.test(G.ents.find((e) => e.sprite === 'sign' && /SHEEP-WALK/.test(e.label)).label), 'the finger-post line changes once they are back');
      go(S.COMBE, 34.5, 29.4, Math.PI / 2);
      check(G.ents.filter((e) => e._p22 === 'sheep').length === 11, 'eleven and the tup at home (' + G.ents.filter((e) => e._p22 === 'sheep').length + ')');
      // sheep move, graze, turn and bleat
      const s0 = G.ents.find((e) => e._p22 === 'sheep'), x0 = s0.x, y0 = s0.y; step(300);
      check(G.ents.some((e) => e._p22 === 'sheep' && e.animSprite && /_g$/.test(e.animSprite)), 'sheep graze');
      check(SHEEPWALK22.stats.bleats > 0, 'sheep bleat (' + SHEEPWALK22.stats.bleats + ')');
      check(G.ents.filter((e) => e._p22 === 'sheep').every((e) => !e.follow && Math.hypot(e.x - e._sx, e.y - e._sy) < (e._range || 0) + 1.2), 'each keeps near its own grass');
      void x0; void y0;
    });
    await results('Strays');

    // ---------------------------------------------------------------- The Scouring
    const scour = await page.evaluate(async () => {
      const S = SHEEPWALK22, C = G.maps[S.COMBE];
      go(S.COMBE, 22.5, 20.5, Math.PI);
      const tiles = () => S.ramCells().map(([x, y]) => C.floorCells[y * C.w + x]);
      check(tiles().every((t) => t >= 24 && t < 40), 'the Ram starts grown over');
      const said = talkTo(ent(S.COMBE, (e) => e.id === 'p22_kit'));
      check(/scoured every seven years/.test(said) && G.flags.p22w_ram === 1, 'Kit asks');
      const tod0 = G.day * 24 + G.tod * 24;
      for (const e of C.entities.filter((q) => q.use === 'p22_scour')) {
        useDeco(e);
        const b = document.querySelector('#event-panel button[data-i="0"]'); b.click();
      }
      check(S.scourCount() === 6, 'six stakes scoured');
      check(tiles().every((t) => t >= 8 && t < 24), 'every tile of the figure is white');
      const hrs = G.day * 24 + G.tod * 24 - tod0;
      check(Math.abs(hrs - 6) < 0.01, 'six hours on your knees (' + hrs.toFixed(2) + ')');
      check(C.entities.filter((q) => q.use === 'p22_scour').every((q) => q.sprite === 'p22_stake_done'), 'the stakes show it');
      const said2 = talkTo(ent(S.COMBE, (e) => e.id === 'p22_kit'));
      check(G.flags.p22w_ram === 2 && G.player.inv.some((s) => s.id === 'p22_button') && /He\'s white/.test(said2), 'Kit\'s ram\'s-horn button');
      return S.ramCells().length;
    });
    await results('The Scouring (' + scour + ' tiles)');

    // ---------------------------------------------------------------- Three Fires
    await page.evaluate(() => {
      const S = SHEEPWALK22, C = G.maps[S.COMBE];
      go(S.COMBE, 40, 12, 0);
      const knap = C.entities.find((e) => e.use === 'p22_beacon' && e.beacon === 1);
      Engine.cam.x = knap.x - 1; Engine.cam.y = knap.y; useDeco(knap);
      check(!G.flags.p22w_b1, 'no fire without furze and a light');
      go(S.INN, 6.5, 8.4, -Math.PI / 2);
      const said = talkTo(ent(S.INN, (e) => e.id === 'p22_absalom'));
      check(/fold-fires/.test(said) && G.has('p22_tinder') && G.has('p22_furze') && G.flags.p22w_fires === 1, 'Absalom gives his tinder-box and a faggot');
      go(S.COMBE, 40, 12, 0);
      const pile = C.entities.find((e) => e.use === 'p22_furze');
      for (let i = 0; i < 4; i++) useDeco(pile);
      const nF = (G.player.inv.find((s) => s.id === 'p22_furze') || { n: 0 }).n;
      check(nF === 3, 'three faggots, and no more (' + nF + ')');
      G.tod = 0.5; const flock0 = G.ents.filter((e) => e._p22 === 'sheep');
      useDeco(knap); useDeco(C.entities.find((e) => e.use === 'p22_beacon' && e.beacon === 2));
      check(G.flags.p22w_b1 === 1 && G.flags.p22w_b2 === 1, 'Hob\'s Knap and Ewe Barrow lit');
      const flock1 = G.ents.filter((e) => e._p22 === 'sheep');
      check(flock0.length > 0 && flock1.length === flock0.length && flock1.every((e, i) => e === flock0[i]), 'lighting a fire leaves the flock where it is (no rebuild)');
      check(!knap.lightCol, 'a fire lit at noon throws no light at noon');
      G.tod = 0.92; for (let i = 0; i < 80; i++) { G.state = 'play'; update(1 / 30); }
      check(knap.lightCol && C.entities.find((e) => e.use === 'p22_beacon' && e.beacon === 2).lightCol, 'and lights the hill when night comes, without leaving the map');
      G.tod = 0.5; for (let i = 0; i < 80; i++) { G.state = 'play'; update(1 / 30); }
      check(!knap.lightCol, 'and is only smoke again by day');
      go(S.DOWNS, 18.5, 14, 0);
      const cairn = G.ents.find((e) => e.sprite === 'p20_cairn');
      check(cairn && cairn.use === 'p22_beacon', 'the Long Down cairn can be lit once the quest is under way');
      useDeco(cairn);
      check(G.flags.p22w_b0 === 1 && S.litCount() === 3, 'all three burning');
      G.tod = 0.92; go(S.DOWNS, 18.5, 14, 0);
      check(G.ents.some((e) => e._p22 === 'fire' && e.lightCol), 'the Long Down burns at night');
      go(S.COMBE, 40, 12, 0);
      check(C.entities.filter((e) => e.use === 'p22_beacon').every((e) => e.sprite === 'p22_beacon_lit' && e.lightCol), 'the combe\'s two beacons burn and light the hill at night');
      G.tod = 0.5;
      const gold0 = G.player.gold;
      const said2 = talkTo(ent(S.INN, (e) => e.id === 'p22_absalom'));
      check(G.flags.p22w_fires === 2 && G.player.gold === gold0 + 25 && /Three fires/.test(said2), 'Absalom\'s purse');
    });
    await results('Three Fires');

    // ---------------------------------------------------------------- The Iron Hum, apples
    await page.evaluate(() => {
      const S = SHEEPWALK22, C = G.maps[S.COMBE];
      go(S.COMBE, S.PYLON[0] - 1.6, S.PYLON[1], 0);
      const py = G.ents.find((e) => e.use === 'p22_pylon');
      useDeco(py);
      check(!G.flags.p22w_hum && !document.querySelector('#event:not(.hidden) #event-panel h2'), 'refused while the hounds live');
      for (const e of G.ents) if (e.kind === 'enemy' && Math.hypot(e.x - S.PYLON[0], e.y - S.PYLON[1]) < 12) { e.dead = true; e.hp = 0; }
      useDeco(py); document.querySelector('#event-panel button[data-i="0"]').click();
      check(G.flags.p22w_hum === 1 && G.has('p22_tally') && py.sprite === 'p22_pylon_cut' && G.journal.some((j) => /singing wire/.test(j.text)), 'the wire is cut, the tally-book taken');
      // apples: one a tree a day
      const tree = C.entities.find((e) => e.use === 'p22_tree'), n0 = () => (G.player.inv.find((s) => s.id === 'p22_apple') || { n: 0 }).n;
      useDeco(tree); useDeco(tree);
      check(n0() === 1, 'one apple from a tree today');
      G.day++; useDeco(tree);
      check(n0() === 2, 'and another tomorrow');
    });
    await results('The Iron Hum and the orchard');

    // ---------------------------------------------------------------- mutton
    await page.evaluate(() => {
      const S = SHEEPWALK22;
      for (const id in S.MENUS) { const n = NPCS[id]; check(n && Array.isArray(n.shop) && S.MENUS[id].every((it) => n.shop.some((s) => s.item === it)), id + ' sells ' + S.MENUS[id].join(', ')); }
      const lard = CALENDAR11.VENDORS.find((v) => v.key === 'larder');
      check(lard.pool.includes('p22_salt_mutton') && !lard.pool.includes('p22_mutton_pie') && !lard.pool.includes('p22_mutton_chops'), 'Oakhaven\'s market has salt mutton only: its flocks were eaten (R2)');
      check(!NPCS.p12_baker || !NPCS.p12_baker.shop || !NPCS.p12_baker.shop.some((s) => s && /mutton/.test(s.item)), 'the baker bakes no mutton pies in a starving town');
      check(S.MUTTON.length === 6 && S.MUTTON.every((id) => ITEMS[id] && ITEMS[id].use === 'p22_food' && ITEMS[id].value > 0 && /Mutton|mutton/.test(ITEMS[id].name)), 'six mutton dishes');
      check(S.MUTTON.every((id) => typeof ICONS === 'undefined' || !ICONS.TABLE || ICONS.TABLE[id]), 'each has an icon');
    });
    await results('mutton on every list');
    // buy salt mutton from Hetty through the real dialogue (all the Boar has: R2), then eat it
    await page.evaluate(() => { go('tavern', 8.5, 9.5, -Math.PI / 2); G.player.gold = 100; G.player.needs = true; G.player.hunger = 20; G.player.hp = 5; G.state = 'play'; talk(G.ents.find((e) => e.id === 'hetty')); });
    await page.locator('#d-buy').click();
    const row = page.locator('[data-buy]').filter({ hasText: 'Salt Mutton' });
    assert.equal(await row.count(), 1, 'Hetty lists salt mutton');
    assert.equal(await page.locator('[data-buy]').filter({ hasText: 'Mutton and Barley Hotpot' }).count(), 0, 'and no hotpot: the town ate its flocks');
    await row.click();
    await page.evaluate(() => {
      const slot = G.player.inv.find((s) => s.id === 'p22_salt_mutton');
      check(slot && G.player.gold < 100, 'bought from Hetty');
      closeModal(); G.state = 'play';
      const hp0 = G.player.hp, h0 = G.player.hunger, n0 = slot.n || 1; useItem(slot);
      const left = (G.player.inv.find((s) => s.id === 'p22_salt_mutton') || { n: 0 }).n || 0;
      check(G.player.hp === Math.min(G.player.hpMax, hp0 + 8) && G.player.hunger === h0 + 30 && left === n0 - 1, 'eaten: health and hunger back (' + G.player.hp + ', ' + G.player.hunger + ', ' + n0 + ' to ' + left + ')');
      G.player.needs = false;
    });
    await results('bought from Hetty and eaten');

    // ---------------------------------------------------------------- save and restore
    await page.evaluate(() => {
      const S = SHEEPWALK22;
      go(S.COMBE, 34.5, 29.4, Math.PI / 2);
      const snap = snapshotGame(), C = snap.maps[S.COMBE];
      check(C && C.ents.length === G.maps[S.COMBE].baseCount && !C.extra.some((e) => e._p22 || e.transient), 'no transient sheep, flower or fire is saved');
      check(!JSON.stringify(snap).includes('"_p22"'), 'nothing of this module\'s transient state reaches the save');
      const flags = JSON.stringify(Object.keys(G.flags).filter((k) => k.startsWith('p22w_')).sort().map((k) => [k, G.flags[k]]));
      restoreGame(JSON.parse(JSON.stringify(snap)));
      check(JSON.stringify(Object.keys(G.flags).filter((k) => k.startsWith('p22w_')).sort().map((k) => [k, G.flags[k]])) === flags, 'the flags come back');
      check(G.mapId === S.COMBE && G.ents.filter((e) => e._p22 === 'sheep').length === 11, 'and the flock is rebuilt round you');
      check(S.ramCells().every(([x, y]) => G.map.floorCells[y * G.map.w + x] >= 8 && G.map.floorCells[y * G.map.w + x] < 24), 'and the Ram is still white');
      // hostile flags cannot make anything strange
      G.flags.p22w_flock = 99; G.flags.p22w_aday = 'x'; G.flags.p22w_apick = -5; G.flags.p22w_h0 = { a: 1 };
      go(S.COMBE, 34.5, 29.4, Math.PI / 2);
      check(S.flockStage() === 2 && G.ents.filter((e) => e._p22 === 'sheep').length >= 6, 'hostile flag values are clamped');
    });
    await results('save and restore');

    // ---------------------------------------------------------------- frames, both renderers
    const frames = await page.evaluate(async () => {
      const out = {};
      for (const mode of ['off', 'on']) {
        try { R3D.setMode(mode); } catch (e) { /* no R3D */ }
        for (const [id, x, y, d] of [[SHEEPWALK22.COMBE, 53.4, 18, Math.PI], [SHEEPWALK22.INN, 6.5, 8.4, -Math.PI / 2], [SHEEPWALK22.DOWNS, 14, 33, Math.PI / 2]]) {
          go(id, x, y, d); G.tod = 0.4;
          for (let i = 0; i < 4; i++) { G.state = 'play'; update(1 / 30); Engine.render(G.ents); await new Promise((r) => setTimeout(r, 30)); }
          out[mode + ':' + id] = typeof R3D !== 'undefined' ? R3D.active() : false;
        }
      }
      try { R3D.setMode('off'); } catch (e) { /* none */ }
      return out;
    });
    pass('frames drawn on the CPU and with R3D ' + JSON.stringify(frames));
    assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
    pass('no page errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
