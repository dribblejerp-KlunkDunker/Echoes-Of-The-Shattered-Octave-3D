// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/path/to/playwright node test/hanger22.test.js
// Phase 22b "What Bleats in the Wood" (js/hanger22.js): the Woolwight, the Hanger, Ewe Barrow, camp and fish anywhere.
//  - the route: the Hanger joins Wethercombe only, Ewe Barrow opens from the sarsen only when the Ram is white and the
//    three fires burn; every map is BFS-safe; the barrow's chambers, loot and the last chamber can be reached;
//  - the hunt: Woolwights come only at night on the region's open maps, keep out of firelight, go at dawn, are never saved;
//  - the quests played through: Bleating in the Wood (the nest, the hank, Tamar), The Lambing at Night (Kit gone, the
//    cap, the barrow, the Old Fleece, Kit home, the crook);
//  - camp anywhere (pitched, cooked at, slept at, struck; refused in town) and fishing (cast, the bite, the strike);
//  - the new gear exists with icons, art and looks; a save restores the quests and nothing transient; no page errors.
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
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* none */ } window.__r3d21 = { automation: true }; let a = 2223; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Wool Tester');
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
      window.choose = (i) => { const b = document.querySelector('#event-panel button[data-i="' + i + '"]'); if (b) b.click(); return !!b; };
      G.player.hp = G.player.hpMax = 9999;
      for (const m in G.maps) for (const e of G.maps[m].entities) if (e.kind === 'enemy' && m !== HANGER22.BARROW && m !== HANGER22.HANGER) e.hidden = true;
    });
    const results = async (title) => {
      const r = await page.evaluate(() => { const c = window.__checks; window.__checks = []; return c; });
      const bad = r.filter((c) => !c[0]).map((c) => c[1]);
      assert.deepEqual(bad, [], title + ': ' + bad.join('; '));
      pass(title + ' (' + r.length + ' checks)');
    };

    // ---------------------------------------------------------------- route and reach
    const route = await page.evaluate(() => {
      const H = HANGER22, C = G.maps[H.COMBE], W = G.maps[H.HANGER], B = G.maps[H.BARROW];
      const portals = (m) => { const out = []; for (const c of m.cells) if (c && c.portal) out.push(c.portal.map); return out; };
      check(W && W.outdoor && W.danger === 2 && B && !B.outdoor && B.danger === 3, 'the Hanger (outdoors, danger 2) and Ewe Barrow (a dungeon, danger 3)');
      check(JSON.stringify(portals(W)) === JSON.stringify([H.COMBE]), 'the Hanger joins Wethercombe only');
      const firstTuft = C.entities.findIndex((e) => e && e._flora);
      check(firstTuft < 0 || firstTuft >= C.baseCount, 'Wethercombe\'s saved entities stop before the grass (baseCount ' + C.baseCount + ', first tuft ' + firstTuft + ')');
      check(JSON.stringify(portals(B)) === JSON.stringify([H.COMBE]), 'the barrow\'s one door leads back to Wethercombe');
      check(portals(C).filter((p) => p === H.HANGER).length === 1, 'Wethercombe has one gap to the Hanger');
      for (const id in G.maps) if (id !== H.COMBE && id !== H.HANGER && id !== H.BARROW) check(!portals(G.maps[id]).some((p) => p === H.HANGER || p === H.BARROW), 'nothing else leads to the new maps (' + id + ')');
      const rw = HORIZON20.reach(W, H.GAP_HANGER[0], 1, H.GAP_HANGER[0], 1);
      check(rw.stuck === 0 && rw.maxDrop <= FALL_SAFE && rw.reached > 1000, 'the Hanger is safe, with room to walk and fight (' + rw.reached + ')');
      const trees = W.entities.filter((e) => /^p22_(beech|yew|bellash|glassthorn)$|^oak$/.test(e.sprite || '')).length;
      check(trees >= 550, 'the Hanger is a thick wood (' + trees + ' trees)');
      let lined = 0, track = 0; for (let y = 1; y < W.h - 1; y++) for (let x = 1; x < W.w - 1; x++) if (/track/.test(W.floorTextures[W.floorCells[y * W.w + x]] || '')) { track++; if (W.entities.some((e) => /beech|yew|bellash|glassthorn|^oak$/.test(e.sprite || '') && Math.hypot(e.x - x - 0.5, e.y - y - 0.5) < 2.2)) lined++; }
      check(lined / track > 0.7, 'the rides run through trees (' + lined + '/' + track + ' track cells have a tree within 2.2)');
      for (const e of W.entities) if (e.kind === 'npc' || e.use || e.kind === 'item') check(near(rw, W, e.x, e.y), 'you can walk up to ' + (e.use || e.item || e.id) + ' in the Hanger');
      const rb = HORIZON20.reach(B, B.w - 2, 6, B.w - 2, 6);
      check(rb.stuck === 0 && rb.maxDrop <= FALL_SAFE, 'the barrow is safe');
      for (const e of B.entities) if (e.kind === 'item' || e.kind === 'npc' || e.kind === 'enemy') check(near(rb, B, e.x, e.y), 'the barrow\'s ' + (e.item || e.id || e.type) + ' can be reached');
      const rc = HORIZON20.reach(C, SHEEPWALK22.STILE[0], 1, SHEEPWALK22.STILE[0], 1);
      check(rc.stuck === 0 && rc.maxDrop <= FALL_SAFE, 'Wethercombe stays safe with the gap and the trees');
      check(near(rc, C, H.GAP_COMBE[0] + 0.5, H.GAP_COMBE[1] - 1), 'the gap to the Hanger can be reached');
      check(near(rc, C, H.SARSEN[0] + 1.9, H.SARSEN[1] - 1.5), 'the barrow\'s door can be reached');
      check(W.entities.filter((e) => /^p22_(beech|yew|bellash|glassthorn)$|^oak$/.test(e.sprite)).length > 150, 'the Hanger is thick with trees');
      return { hanger: rw.reached, barrow: rb.reached };
    });
    await results('route and reach ' + JSON.stringify(route));

    // ---------------------------------------------------------------- the barrow is shut until the Ram is white and the fires burn
    await page.evaluate(() => {
      const H = HANGER22;
      go(H.COMBE, H.SARSEN[0] + 1.9, H.SARSEN[1] - 1.5, Math.PI / 2);
      const s = G.ents.find((e) => e.use === 'p22_sarsen');
      useDeco(s); check(G.mapId === H.COMBE && s.sprite === 'p22_sarsen', 'the sarsen will not move yet');
      for (let i = 0; i < 6; i++) G.flags['p22w_s' + i] = 1; for (let i = 0; i < 3; i++) G.flags['p22w_b' + i] = 1; G.flags.p22w_fires = 1;
      go(H.COMBE, H.SARSEN[0] + 1.9, H.SARSEN[1] - 1.5, Math.PI / 2);
      const s2 = G.ents.find((e) => e.use === 'p22_sarsen');
      check(s2.sprite === 'p22_sarsen_open' && H.barrowOpen(), 'with the Ram white and the fires lit, the sarsen stands open');
      useDeco(s2); check(G.mapId === H.BARROW, 'into Ewe Barrow');
      const out = G.map.cells.find((c) => c && c.portal); transfer(out.portal); G.state = 'play';
      check(G.mapId === H.COMBE, 'and out again by the passage');
    });
    await results('Ewe Barrow\'s door');

    // ---------------------------------------------------------------- the hunt
    await page.evaluate(() => {
      const H = HANGER22;
      G.tod = 0.5; go(H.HANGER, 25.5, 3, Math.PI / 2); step(900);
      check(H.hunters().length === 0, 'nothing hunts by day');
      G.tod = 0.95; go(H.HANGER, 25.5, 3, Math.PI / 2); step(1500);
      const hs = H.hunters();
      check(hs.length >= 1 && hs.length <= 2, 'by night the Woolwights come (' + hs.length + ')');
      check(G.flags.p22h_heard === 1 && G.journal.some((j) => /heap of grey wool/.test(j.text)), 'the first night is in the logbook');
      check(H.stats.bleats > 0, 'it bleats (' + H.stats.bleats + ', ' + H.stats.decoys + ' thrown)');
      check(snapshotGame().maps[H.HANGER].extra.every((e) => e.type !== 'p22_woolwight'), 'a hunting Woolwight is never saved');
      // firelight: pitch a camp, stand by it; a Woolwight put beside the fire backs out of it
      G.give('p22_campkit'); Engine.cam.dir = Math.PI / 2; HANGER22.pitchCamp();
      const fire = G.ents.find((e) => e._p22c === 'fire');
      check(fire && G.flags.p22c_map === H.HANGER, 'a camp pitched in the Hanger');
      const w = hs[0] || H.spawnHunter([]); w.x = fire.x + 2.2; w.y = fire.y; const d0 = Math.hypot(w.x - fire.x, w.y - fire.y);
      Engine.cam.x = fire.x - 1.2; Engine.cam.y = fire.y; step(60);
      check(w.dead || Math.hypot(w.x - fire.x, w.y - fire.y) > d0 + 0.5, 'it will not come into the firelight (' + d0.toFixed(1) + ' -> ' + Math.hypot(w.x - fire.x, w.y - fire.y).toFixed(1) + ')');
      check(H.stats.kept > 0, 'and it was kept off');
      // dawn
      G.tod = 0.3; step(400);
      check(H.hunters().filter((e) => !e.dead).length === 0, 'at dawn they go back into the wood');
      HANGER22.strikeCamp();
      check(!G.flags.p22c_map && !G.ents.some((e) => e._p22c), 'camp struck');
    });
    await results('the hunt');

    // ---------------------------------------------------------------- Bleating in the Wood
    await page.evaluate(() => {
      const H = HANGER22;
      G.flags.p22w_flock = 2;
      go('p22_bellwether', 6.5, 8.4, -Math.PI / 2);
      const said = talkTo(ent('p22_bellwether', (e) => e.id === 'p22_gideon'));
      check(/Bleating, nights/.test(said) && G.flags.p22h_wool === 1, 'Gideon tells of the bleating');
      const said2 = talkTo(ent('p22_bellwether', (e) => e.id === 'p22_absalom'));
      check(/Woolwight/.test(said2), 'Absalom names it');
      G.tod = 0.5; go(H.HANGER, H.NEST[0] - 1.6, H.NEST[1], 0);
      useDeco(G.ents.find((e) => e.use === 'p22_nest'));
      check(G.has('p22_hank') && G.flags.p22h_wool === 2, 'a hank of Hedge-wool from the nest');
      go(SHEEPWALK22.COMBE, 34.5, 29.4, Math.PI / 2);
      const gold = G.player.gold;
      const said3 = talkTo(ent(SHEEPWALK22.COMBE, (e) => e.id === 'p22_tamar'));
      check(/Something took the wool/.test(said3) && G.flags.p22h_wool === 3 && G.has('p22_campkit') && G.has('p22_line') && G.player.gold === gold + 30, 'Tamar knows the wool, and gives her father\'s kit and line');
    });
    await results('Bleating in the Wood');

    // ---------------------------------------------------------------- The Lambing at Night
    const lamb = await page.evaluate(() => {
      const H = HANGER22;
      G.tod = 0.95; go(SHEEPWALK22.COMBE, 34.5, 29.4, Math.PI / 2);
      check(G.flags.p22h_kit === 1, 'the first night after: Kit is gone');
      check(ent(SHEEPWALK22.COMBE, (e) => e.id === 'p22_kit').hidden, 'his place on the fold wall is empty');
      const said = talkTo(ent(SHEEPWALK22.COMBE, (e) => e.id === 'p22_tamar'));
      check(/Kit\'s gone/.test(said) && G.flags.p22h_kit === 2, 'Tamar asks');
      G.tod = 0.5; go(H.HANGER, H.NEST[0] - 1.6, H.NEST[1], 0);
      useDeco(G.ents.find((e) => e.use === 'p22_nest'));
      check(G.has('p22_kitcap') && G.flags.p22h_kit === 3, 'his cap in the nest');
      go(H.BARROW, 8.5, 6.5, Math.PI);
      const kit = G.ents.find((e) => e.id === 'p22_kitlost');
      check(kit && !kit.hidden, 'Kit is in the last chamber');
      const s1 = talkTo(kit);
      check(/still in there/.test(s1) && G.flags.p22h_kit === 3, 'while the Old Fleece stands, he will not come');
      const boss = G.ents.find((e) => e.type === 'p22_oldfleece');
      check(boss && boss.def.boss && boss.hp >= 200, 'the Old Fleece');
      boss.hp = 0; boss.dead = true; step(3);
      check(G.flags.p22h_boss === 1, 'the Old Fleece is down');
      const s2 = talkTo(kit);
      check(/going home/.test(s2) && G.flags.p22h_kit === 4 && kit.hidden, 'Kit goes home');
      go(SHEEPWALK22.COMBE, 34.5, 29.4, Math.PI / 2);
      check(!ent(SHEEPWALK22.COMBE, (e) => e.id === 'p22_kit').hidden, 'back on the fold wall');
      const s3 = talkTo(ent(SHEEPWALK22.COMBE, (e) => e.id === 'p22_tamar'));
      check(G.flags.p22h_kit === 5 && G.has('w_p22_crook') && /crook/.test(s3), 'Tamar gives you the Farrants\' crook');
      return G.journal.filter((j) => /Kit/.test(j.text)).length;
    });
    await results('The Lambing at Night (' + lamb + ' logbook lines)');

    // ---------------------------------------------------------------- camp and fish, anywhere
    await page.evaluate(() => {
      const H = HANGER22;
      go('oakhaven', 23.5, 20.5, 0); H.pitchCamp();
      check(!G.flags.p22c_map, 'no camp in Oakhaven');
      go('p20_downs', 5.5, 32.3, 0); H.pitchCamp();
      check(G.flags.p22c_map === 'p20_downs' && G.ents.some((e) => e._p22c === 'fire' && e.use === 'campfire'), 'a camp on the Downs, by the dew-pond');
      const fire = G.ents.find((e) => e._p22c === 'fire');
      // no sleeping it off mid-fight: a hound on your heels and the bed refuses, as the game's own rest does
      const hound = hydrate({ kind: 'enemy', type: 'hound', x: Engine.cam.x + 4, y: Engine.cam.y, transient: true }); hound.state = 'chase'; G.ents.push(hound);
      G.player.hp = 10; useDeco(fire); choose(0);
      check(G.player.hp === 10, 'no sleep by the fire with a hound on your heels');
      G.ents.splice(G.ents.indexOf(hound), 1); G.state = 'play';
      // the camp menu: sleep
      G.player.hp = 10; const day = G.day; useDeco(fire);
      check(/Your camp/.test(document.querySelector('#event-panel h2').textContent), 'the camp menu opens');
      choose(0);
      check(G.player.hp === G.player.hpMax && (G.day > day || G.tod > 0.3), 'slept eight hours by the fire');
      // fish: in the dew-pond
      G.state = 'play'; Engine.cam.x = 7.5; Engine.cam.y = 32.2; G.noise = 0.5;
      check(H.waterNear(), 'water near enough to cast');
      H.startFish(); check(H.H.fish.st === 'wait', 'cast');
      for (let i = 0; i < 400 && H.H.fish.st === 'wait'; i++) { G.noise = 0.5; step(1); }
      check(H.H.fish.st === 'bite', 'the line jumps');
      const before = G.player.inv.length; interact();
      check(H.H.fish.st === 'idle' && H.stats.catches === 1 && G.player.inv.length >= before, 'struck and landed');
      // roast what you caught
      G.give('p22_trout'); useDeco(fire); const btn = [...document.querySelectorAll('#event-panel button')].find((b) => /Roast/.test(b.textContent)); btn.click();
      check(G.has('p22_trout_roast'), 'roasted at the fire');
      const slot = G.player.inv.find((s) => s.id === 'p22_trout_roast'); const hp0 = G.player.hp = 50; useItem(slot);
      check(G.player.hp === hp0 + 18, 'and eaten');
      // a camp in a second place moves the first
      go(SHEEPWALK22.COMBE, 30.5, 42.5, 0); H.pitchCamp();
      check(G.flags.p22c_map === SHEEPWALK22.COMBE && !G.maps.p20_downs.entities.some((e) => e._p22c), 'one camp at a time');
      const snap = snapshotGame();
      check(!JSON.stringify(snap.maps[SHEEPWALK22.COMBE].extra).includes('_p22c'), 'the camp\'s fire is rebuilt from the flags, not saved');
      restoreGame(JSON.parse(JSON.stringify(snap)));
      check(G.ents.some((e) => e._p22c === 'fire'), 'and comes back with the save');
      H.strikeCamp();
    });
    await results('camp and fish');

    // ---------------------------------------------------------------- the gear
    await page.evaluate(() => {
      const H = HANGER22;
      for (const id in H.WEAPON_DEFS) check(WEAPONS[id] && ITEMS['w_' + id] && ICONS.hasPixel('weapon:' + id) && GEARLOOK21.WEAPONS[id], 'weapon ' + id + ': stats, item, icon, look');
      for (const id in H.ARMOR_DEFS) check(ARMOR[id] && ITEMS[id] && ICONS.hasPixel(id) && GEARLOOK21.ARMOR[id], 'armour ' + id);
      for (const id in H.ENEMY_DEFS) check(ENEMIES[id] && Engine.sprites[ENEMIES[id].sprite] && Engine.sprites[ENEMIES[id].sprite + '_a1'] && LOOT[id], 'foe ' + id + ': five poses and loot');
      for (const id of ['p22_torc', 'p22_amber', 'p22_lunula', 'p22_hedgewool', 'p22_trout', 'p22_glasseel', 'p22_campkit', 'p22_line']) check(ITEMS[id] && ICONS.hasPixel(id), 'item ' + id);
      check(NPCS.p22_gideon.shop.some((s) => s.item === 'p22_campkit') && NPCS.p22_gideon.shop.some((s) => s.item === 'p22_line'), 'Gideon sells the camp kit and the line');
    });
    await results('the gear');

    // ---------------------------------------------------------------- frames
    await page.evaluate(async () => {
      for (const mode of ['off', 'on']) {
        try { R3D.setMode(mode); } catch (e) { /* none */ }
        for (const [id, x, y, d, tod] of [[HANGER22.HANGER, 24.5, 14.5, Math.PI / 2, 0.45], [HANGER22.HANGER, 24.5, 14.5, Math.PI / 2, 0.95], [HANGER22.BARROW, 12.5, 6.5, Math.PI, 0.5]]) {
          G.tod = tod; go(id, x, y, d);
          for (let i = 0; i < 4; i++) { G.state = 'play'; update(1 / 30); Engine.render(G.ents); await new Promise((r) => setTimeout(r, 30)); }
        }
      }
      try { R3D.setMode('off'); } catch (e) { /* none */ }
    });
    pass('frames drawn on the CPU and with R3D: the Hanger by day and night, the barrow');
    assert.deepEqual(errors, [], 'page errors: ' + errors.join(' | '));
    pass('no page errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL ' + (e && e.message ? e.message : e)); process.exitCode = 1; });
