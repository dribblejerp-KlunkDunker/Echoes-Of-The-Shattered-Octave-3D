// PLAYWRIGHT_MODULE=/path/to/playwright node test/visual.test.js
// Uses the managed preview; never starts a server. Screenshots go outside source.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Angle Tester');
    await page.locator('#c-next').click();
    await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click();
    await page.locator('#c-next').click();
    // Biography choices followed by the extra origin/class-trait selection.
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else {
        const next = page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first();
        if (!(await next.count())) throw new Error('Unknown creation step: ' + await page.locator('#create-panel').innerText());
        await next.click();
      }
    }
    await page.locator('#c-go').click();
    await page.locator('#btn-intro-skip').click();
    await page.keyboard.press('i');
    await page.locator('.paper-doll svg').waitFor({ state: 'visible' });
    assert(await page.locator('.paper-doll').innerText().then(t => t.includes('THE TRAVELLER')));
    console.log('PASS normal Begin → character creation → inventory keyboard flow');
    assert.equal(await page.evaluate(() => G.count('pebble') === 3 && G.count('empty_bottle') === 2), true, 'new travellers receive throwing supplies');
    const result = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      check(Object.values(G.maps).some(m => m.entities.some(e => e.glassLamp)), 'glass lamp placed in playable map');
      const e = { kind: 'enemy', sprite: 'proctor', x: 0, y: 0, facing: 0 };
      const expected = [0, 1, 2, 3, 4, 3, 2, 1];
      for (let i = 0; i < 8; i++) {
        const a = animViewAngle(e, { x: Math.cos(i * Math.PI / 4), y: Math.sin(i * Math.PI / 4) });
        check(a.view === expected[i] && a.flip === (i > 4), 'octant ' + i);
      }
      const cam = { ...Engine.cam };
      Object.assign(Engine.cam, { x: -2, y: 0, dir: 0 });
      const back = animDirectionalSprite(e).sprite;
      check(back !== Engine.sprites.proctor && back.data.some(p => p >>> 24), 'rear artwork exists');
      Engine.cam.dir = 2;
      check(animDirectionalSprite(e).sprite === back, 'camera yaw does not change enemy heading');
      e.animSprite = 'proctor_w1';
      check(animDirectionalSprite(e).sprite !== back, 'walk pose preserved');
      const hashes = new Set();
      for (let v = 1; v <= 4; v++) {
        const sp = animProctorView(v, ''); let hash = 0;
        for (const p of sp.data) hash = (Math.imul(hash, 31) + p) | 0;
        hashes.add(hash);
      }
      check(hashes.size === 4, 'four distinct non-front drawings');
      check(PROCTOR_VIEWS.size <= 24, 'bounded directional cache');
      // with procedural directional views off, other species still fall back to their front art;
      // with them on (js/directions.js), a hound seen from behind gets its own drawn back view
      const dirOn = typeof GFX !== 'undefined' ? GFX.directions : undefined;
      if (typeof GFX !== 'undefined') GFX.directions = false;
      check(animDirectionalSprite({ ...e, sprite: 'hound', animSprite: null }).sprite === Engine.sprites.hound, 'other species fallback');
      if (typeof GFX !== 'undefined') { GFX.directions = true; check(animDirectionalSprite({ ...e, sprite: 'hound', animSprite: null }).sprite !== Engine.sprites.hound, 'other species get a procedural back view'); GFX.directions = dirOn; }
      Object.assign(Engine.cam, cam);
      const p = G.player;
      p.inv.push({ id: 'a_plate', n: 1 }, { id: 'a_kite', n: 1 });
      p.armor = { head: 'a_bellhelm', body: 'a_plate', hands: 'a_gauntlets', feet: 'a_greaves', shield: 'a_kite' };
      p.weapons = ['sword', 'spear']; p.weapon = 0;
      const one = inventoryDoll();
      for (const id of Object.values(p.armor)) check(one.includes(ARMOR[id].name), 'slot ' + id);
      p.weapon = 1; check(inventoryDoll().includes('shield stowed'), 'two-handed shield suppressed');
      p.weapon = 0; renderInventory();
      // Rendering fixture: compare a real wall/floor framebuffer with/without
      // emitters, including removal when a shard is hidden or dead.
      const map = new GameMap('light-test', 'Test', 8, 8, { floor: 't_flag', ceil: 't_stone', fogDist: 8 });
      map.border('t_stone');
      // Use the fixture consistently for renderer and weather/particle wrappers;
      // the live Oakhaven rain/leaves are intentionally time-varying.
      const liveMap = G.map, liveId = G.mapId;
      G.map = map; G.mapId = map.id; Engine.setMap(map);
      Object.assign(Engine.cam, { x: 4, y: 4, dir: 0, pitch: 0, bob: 0 });
      function pixels(ents) {
        Engine.render(ents, 0, {});
        return Engine.ctx.getImageData(0, 0, VW, VIEW_H).data;
      }
      const dark = pixels([]);
      const shard = { kind: 'item', item: 'shard', x: 6, y: 4 };
      const lit = pixels([shard]);
      check(lit.some((v, i) => i % 4 !== 3 && v > dark[i]), 'shard lights wall/floor pixels');
      shard.hidden = true; check(pixels([shard]).every((v, i) => v === dark[i]), 'hidden shard emits nothing');
      shard.hidden = false; shard.dead = true; check(pixels([shard]).every((v, i) => v === dark[i]), 'dead shard emits nothing');
      check(pixels([{ sprite: 'kaelen', x: 6, y: 4 }]).some((v, i) => i % 4 !== 3 && v > dark[i]), 'Kaelen emits light');
      check(pixels([{ glassLamp: true, x: 6, y: 4 }]).some((v, i) => i % 4 !== 3 && v > dark[i]), 'glass lamp emits light');
      const target = { kind: 'enemy', sprite: 'proctor', x: 5.5, y: 4, facing: 0, scale: 1 };
      const rearPixels = pixels([target]);
      check(target._screen && Engine.pick([target], 3) === target, 'rear view remains pickable');
      target.facing = Math.PI;
      check(pixels([target]).some((v, i) => v !== rearPixels[i]), 'real renderer changes front/back output');
      G.map = liveMap; G.mapId = liveId; Engine.setMap(liveMap); Object.assign(Engine.cam, cam);
      return { octants: 8, views: hashes.size + 1, cache: PROCTOR_VIEWS.size };
    });
    console.log('PASS directional, gear and real framebuffer assertions', result);
    await page.screenshot({ path: '/tmp/octave-inventory.png' });
    await page.locator('[data-off="body"]').click();
    assert((await page.locator('.paper-doll svg title').textContent()).includes('Body: none'));
    await page.locator('[data-use]').filter({ hasText: 'Wear' }).first().click();
    assert(!(await page.locator('.paper-doll svg title').textContent()).includes('Body: none'));
    await page.locator('[data-w="1"]').click();
    await page.waitForFunction(() => document.querySelector('.paper-doll figcaption').textContent.includes('shield stowed'));
    console.log('PASS inventory remove/wear/weapon buttons update doll');
    const deaths = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      // Freeze gameplay while exercising the real kill/render/map/save paths.
      G.state = 'panel'; closeModal();
      const map = G.map, id = G.mapId, cam = { ...Engine.cam };
      const p = G.player; p.level = 50; p.xp = 0;
      const enemy = hydrate({ kind: 'enemy', type: 'proctor', x: cam.x + 1, y: cam.y, name: 'Regression guard' });
      G.ents.push(enemy);
      const before = p.kills, xp = p.xp;
      killEnemy(enemy, false);
      const body = G.ents.find(e => e.deathArt && e.x === enemy.x && e.y === enemy.y);
      check(body && body.dieStyle === 'fall', 'kill spawns collapse visual');
      check(p.kills === before + 1 && p.xp === xp + ENEMIES.proctor.xp, 'kill reward exactly once');
      killEnemy(enemy, false);
      check(p.kills === before + 1 && p.xp === xp + ENEMIES.proctor.xp, 'repeat kill is inert');
      check(G.ents.filter(e => e.deathArt && e.x === enemy.x && e.y === enemy.y).length === 1, 'one body per kill');
      const frames = new Set();
      for (const t of [0, 0.4, 0.79]) {
        body.dieT = t; animDying(body, 0);
        let hash = 0; for (const px of animDeathSprite(body).data) hash = (Math.imul(hash, 31) + px) | 0;
        frames.add(hash);
      }
      check(frames.size === 3, 'three distinct collapse silhouettes');
      animDying(body, 2); animDeco(body, 0.1, 0, map.outdoor);
      check(body.corpse && !body.dead && !body.hidden && !body.dying && body.animAlpha === 1, 'body remains opaque after collapse');
      check(body.nopick && !body.solid, 'corpse cannot block or interact');
      Object.assign(Engine.cam, { dir: 0, pitch: 0, bob: 0 });
      Engine.render([body], 0.5, {});
      check(body._screen && Engine.pick([body], 3) === null, 'rendered body is unpickable');
      const saved = snapshotGame();
      check(!saved.maps[id].extra.some(e => e.kind === 'deco' && e.sprite === body.sprite && e.x === body.x && e.y === body.y), 'transient body excluded from save');
      check(saved.maps[id].extra.some(e => e.kind === 'enemy' && e.dead), 'enemy dead state still saved');
      const water = new GameMap('water-death', 'Water fixture', 8, 8, { floor: 't_water' });
      G.map = water;
      const hollow = animSpawnDeath(hydrate({ kind: 'enemy', type: 'drowned', x: 3, y: 3 }));
      check(hollow.dieStyle === 'sink', 'water Hollow sinks');
      animDying(hollow, 0.7);
      check(hollow.deathStage > 0 && hollow.animAlpha < 1, 'sinking advances clipping and fade');
      animDying(hollow, 2); check(hollow.dead && hollow.hidden && !hollow.corpse, 'sunken Hollow disappears');
      G.map = map;
      const dry = animSpawnDeath(hydrate({ kind: 'enemy', type: 'drowned', x: 23, y: 4 }));
      check(dry.dieStyle === 'fall', 'dry-land Hollow leaves a body');
      for (const type of ['mites', 'hushmoth']) {
        const cloud = animSpawnDeath(hydrate({ kind: 'enemy', type, x: 3, y: 3 }));
        check(cloud.dieStyle === 'scatter', type + ' scatters');
        const start = animDeathSprite(cloud); animDying(cloud, 0.4);
        check(animDeathSprite(cloud).data.some((px, i) => px !== start.data[i]), type + ' fragments move');
        animDying(cloud, 2); check(cloud.hidden && !cloud.corpse, type + ' leaves no body');
      }
      // All catalog species must produce valid, cached art without replacing
      // gameplay entities; this includes bosses and nonphysical dissolves.
      for (const type of Object.keys(ENEMIES)) {
        const ghost = animSpawnDeath(hydrate({ kind: 'enemy', type, x: 23, y: 4 }));
        check(ghost.deathArt && animDeathSprite(ghost).data.some(px => px >>> 24), type + ' death art');
        check(animDeathSprite(ghost) === animDeathSprite(ghost), type + ' cached pose');
        animDying(ghost, ghost.dieDur + 0.1);
        check(ghost.corpse || ghost.hidden, type + ' terminates');
      }
      const count = Object.keys(ENEMIES).length;
      const next = id === 'clearing' ? 'oakhaven' : 'clearing';
      loadMap(next);
      // scenery props and grass (js/scenery.js, js/flora.js) and other decorations their modules re-create on
      // every visit (marked _decor: chimneys, torches, stand-ins) are transient by design and are not corpses
      const effect = e => e.transient && !e._scn && !e._flora && !e._decor;
      check(!map.entities.some(effect), 'departure clears all old-area corpses/effects');
      loadMap(id, cam);
      check(!G.ents.some(effect), 'revisit does not resurrect corpses');
      restoreGame(JSON.parse(JSON.stringify(saved)));
      check(G.ents.some(e => e.kind === 'enemy' && e.dead && e.name === 'Regression guard'), 'save/load preserves killed enemy');
      check(!G.ents.some(e => e.deathArt || e.corpse), 'save/load does not serialize corpse art');
      G.state = 'panel';
      return { species: count, collapsePoses: frames.size };
    });
    console.log('PASS deaths, rewards, corpses, save/load and departure cleanup', deaths);
    await page.evaluate(() => {
      loadMap('cloister', { x: 6.5, y: 12.5, dir: Math.PI });
      G.state = 'play'; G.ents.forEach(e => { e._screen = null; });
      interact();
      if (G.openPanel !== 'lockpick') throw new Error('vestry interaction must open lockpicking');
    });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => G.openPanel), null);
    await page.evaluate(() => { G.state = 'play'; interact(); });
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => LOCKPICK.position), 55);
    await page.locator('#lp-left').tap();
    assert.equal(await page.evaluate(() => LOCKPICK.position), 50);
    await page.locator('#lp-cancel').click();
    await page.evaluate(() => { G.state = 'play'; interact(); });
    for (let pin = 0; pin < 3; pin++) {
      const steps = await page.evaluate(() => (LOCKPICK.centers[LOCKPICK.pin] - LOCKPICK.position) / 5);
      for (let step = 0; step < Math.abs(steps); step++) await page.keyboard.press(steps < 0 ? 'ArrowLeft' : 'ArrowRight');
      await page.keyboard.press('Space');
    }
    assert.equal(await page.evaluate(() => G.openPanel), null);
    await page.evaluate(() => { delete G.flags[mechanicalLockKey(G.map.get(5, 12), 5, 12)]; });
    const locks = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      const door = G.map.get(5, 12), key = mechanicalLockKey(door, 5, 12);
      const story = G.maps.oakhaven.get(23, 0);
      check(!beginLockpick(story, 'story-test', 1, () => {}), 'story seals cannot be picked');
      beginLockpick(door, key, 1, () => { G.map.doors[12 * G.map.w + 5].target = 1; });
      const tolerance = LOCKPICK.tolerance;
      lockpickInput('cancel');
      const rank = G.player.skills.Lockpicking; G.player.skills.Lockpicking = 90;
      beginLockpick(door, key, 1, () => {});
      check(LOCKPICK.tolerance > tolerance, 'higher skill widens safe range');
      lockpickInput('cancel'); G.player.skills.Lockpicking = rank;
      beginLockpick(door, key, 1, () => { G.map.doors[12 * G.map.w + 5].target = 1; });
      const fat = G.player.fat;
      LOCKPICK.position = LOCKPICK.centers[0] < 50 ? 100 : 0;
      lockpickInput('lift');
      check(LOCKPICK.misses === 1 && LOCKPICK.pin === 0 && G.player.fat === Math.max(0, fat - 1), 'failed lift costs fatigue and resets pins');
      lockpickInput('lift'); lockpickInput('lift');
      check(!LOCKPICK && !G.flags[key], 'three slips end attempt without unlocking');
      beginLockpick(door, key, 1, () => { G.map.doors[12 * G.map.w + 5].target = 1; });
      for (let i = 0; i < 3; i++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      check(G.flags[key] && G.map.doors[12 * G.map.w + 5].target === 1, 'three pins unlock and open door');
      check(G.player.skills.Lockpicking > rank || G.player.skillProg.Lockpicking > 0, 'success advances skill');
      const chest = G.map.item('cache', 7.5, 12.5); chest.tier = 2;
      const gold = G.player.gold; pickUp(chest);
      check(G.openPanel === 'lockpick' && !chest.dead && G.player.gold === gold, 'chest cannot pay loot before unlocking');
      lockpickInput('cancel'); check(!chest.dead && G.player.gold === gold, 'cancel grants no loot');
      pickUp(chest);
      for (let i = 0; i < 3; i++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      const after = G.player.gold;
      check(chest.dead && after > gold, 'unlocked chest pays loot');
      pickUp(chest); check(G.player.gold === after, 'opened chest cannot duplicate loot');
      const save = JSON.parse(JSON.stringify(snapshotGame()));
      delete save.player.skills.Lockpicking;
      restoreGame(save);
      check(G.flags[key] && G.player.skills.Lockpicking === 15, 'unlock survives load and old save gets skill default');
      // Exercise the actual controller polling path with press/release edges.
      const pads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp];
      const target = G.map.get(5, 12); delete G.flags[key];
      beginLockpick(target, key, 1, () => {});
      controlsTick(); gp.buttons[15].pressed = true; controlsTick();
      check(LOCKPICK.position === 55, 'controller D-pad moves pick');
      gp.buttons[15].pressed = false; controlsTick();
      LOCKPICK.position = LOCKPICK.centers[0]; gp.buttons[0].pressed = true; controlsTick();
      check(LOCKPICK.pin === 1, 'controller A lifts pin');
      gp.buttons[0].pressed = false; controlsTick(); gp.buttons[1].pressed = true; controlsTick();
      check(!LOCKPICK && G.state === 'play', 'controller B cancels');
      navigator.getGamepads = pads; G.state = 'panel';
      return { pins: 3, inputs: ['keyboard', 'buttons', 'controller'] };
    });
    console.log('PASS lockpicking gates, failure, loot, skill, save/load and controls', locks);
    await page.evaluate(() => {
      loadMap('oakhaven', { x: 51.5, y: 19.2, dir: -Math.PI / 2 }); G.state = 'panel';
      const owned = G.ents.find(e => e.owner === 'market');
      if (!owned) throw new Error('owned market item exists');
      window.crimeTestItem = owned; pickUp(owned);
    });
    await page.locator('#crime-leave').click();
    assert.equal(await page.evaluate(() => crimeTestItem.dead === true), false);
    await page.evaluate(() => {
      G.state = 'panel';
      // Isolate the witness fixture without deleting or rewriting catalog NPCs.
      window.crimeHidden = G.ents.map(e => e.hidden);
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; });
      pickUp(crimeTestItem);
    });
    await page.locator('#crime-take').click();
    assert.equal(await page.evaluate(() => crimeState().bounty), 0);
    const law = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      G.state = 'panel';
      const p = G.player, count = G.count('honey');
      pickUp(crimeTestItem); check(G.count('honey') === count, 'theft cannot duplicate items');
      G.ents.forEach((e, i) => { if (i < crimeHidden.length) e.hidden = crimeHidden[i]; });
      const owned = G.map.item('honey', 51.5, 19.2); owned.owner = 'market';
      const witness = G.ents.find(e => e.lawGuard);
      witness.x = Engine.cam.x + 1; witness.y = Engine.cam.y; witness.hidden = false;
      check(theftWitness(owned), 'near visible guard witnesses theft');
      witness.hidden = true;
      const others = G.ents.filter(e => e.kind === 'npc' && !e.hidden);
      others.forEach(e => { e.hidden = true; });
      check(!theftWitness(owned), 'hidden witnesses do not report');
      witness.hidden = false;
      const originalX = witness.x, originalY = witness.y;
      witness.x = Engine.cam.x + 2; witness.y = Engine.cam.y;
      const wallX = Math.floor(Engine.cam.x + 1), wallY = Math.floor(Engine.cam.y);
      const wall = G.map.get(wallX, wallY);
      G.map.set(wallX, wallY, WALL('t_stone'));
      check(!theftWitness(owned), 'walls block witness sight');
      G.map.set(wallX, wallY, wall); witness.x = originalX; witness.y = originalY;
      others.forEach(e => { e.hidden = false; });
      pickUp(owned); document.querySelector('#crime-take').click();
      check(crimeState().bounty === 20 && crimeState().thefts === 2, 'witnessed theft records bounty and count');
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(saved); G.state = 'panel';
      check(crimeState().bounty === 20, 'bounty survives save/load');
      const guard = G.ents.find(e => e.lawGuard);
      guard.hidden = false; guard.x = Engine.cam.x + 3; guard.y = Engine.cam.y;
      const before = Math.hypot(guard.x - Engine.cam.x, guard.y - Engine.cam.y);
      tickLaw(0.2);
      check(Math.hypot(guard.x - Engine.cam.x, guard.y - Engine.cam.y) < before, 'constable pursues visible wanted player');
      guard.x = Engine.cam.x + 1; guard.y = Engine.cam.y; G.lawGrace = 0; tickLaw(0.1);
      check(G.openPanel === 'arrest', 'nearby constable opens arrest choice');
      p.gold = 0; G.player.gold = 0; renderArrest();
      check(document.querySelector('#crime-pay').disabled, 'cannot pay without funds');
      document.querySelector('#crime-flee').click();
      check(crimeState().bounty === 20 && G.lawGrace === 5, 'refusal preserves bounty with escape grace');
      G.player.gold = 50; renderArrest(); document.querySelector('#crime-pay').click();
      check(crimeState().bounty === 0 && G.player.gold === 30, 'fine deducted exactly and bounty cleared');
      crimeState().bounty = 40;
      const clock = G.day * 24 + G.tod * 24, inventory = JSON.stringify(G.player.inv), weapon = JSON.stringify(G.player.weapons);
      renderArrest(); document.querySelector('#crime-jail').click();
      check(G.mapId === 'watchhouse' && crimeState().custody.remaining === 6 && crimeState().bounty === 40, 'jail enters a playable prison without clearing the fine');
      check(G.player.inv.every(s => ITEMS[s.id].key) && crimeState().evidence, 'non-quest gear held in evidence');
      renderPrison(); document.querySelector('#prison-serve').click();
      check(crimeState().bounty === 0 && crimeState().jailHours === 6, 'completed sentence clears bounty and records served hours');
      check(Math.abs(G.day * 24 + G.tod * 24 - clock - 6) < 0.0001, 'jail advances time six hours');
      check(JSON.stringify(G.player.inv) === inventory && JSON.stringify(G.player.weapons) === weapon, 'jail preserves quest items and equipment');
      check(G.mapId === 'oakhaven' && G.state === 'play', 'jail releases into playable town');
      const old = JSON.parse(JSON.stringify(snapshotGame())); delete old.player.crime; restoreGame(old);
      check(crimeState().bounty === 0 && crimeState().thefts === 0, 'old saves start without crime');
      G.player.crime = { bounty: '<img>', thefts: -7, jailHours: Infinity };
      check(crimeState().bounty === 0 && crimeState().thefts === 0 && crimeState().jailHours === 0, 'imported crime fields normalized');
      const ordinary = G.map.item('honey', 23.5, 6.5);
      pickUp(ordinary);
      check(ordinary.dead && !G.openPanel && crimeState().thefts === 0, 'unowned loot never invokes crime rules');
      G.state = 'panel';
      return { theft: true, pursuit: true, fine: true, jail: true };
    });
    console.log('PASS crime confirmation, witnesses, pursuit, fine, jail and save/load', law);
    const pocketRiskChecks = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      window.pocketBaseline = JSON.parse(JSON.stringify(snapshotGame()));
      loadMap('oakhaven', { x: 23.5, y: 22.25, dir: Math.PI / 2 });
      G.state = 'panel'; G.vel.x = G.vel.y = 0; G.keys = {}; G.touch.fx = G.touch.fy = 0;
      G.ents.forEach(e => { if (e.kind === 'npc' || e.kind === 'enemy') e.hidden = true; });
      const e = G.ents.find(e => e.id === 'bettany'); window.pocketNPC = e;
      Object.assign(e, { x: 23.5, y: 23.5, facing: Math.PI / 2, hidden: false, dead: false });
      G.player.skills.Stealth = 15; G.noise = 2; G.tod = 0.5; // Night-watch visibility is driven by the ambient tick.
      check(canPickpocket(e) && pickpocketTarget() === e, 'eligible nearby adult selected');
      const rear = pocketRisk(e); check(rear.position === 'Behind', 'NPC-relative rear position');
      e.facing = -Math.PI / 2;
      const front = pocketRisk(e); check(front.position === 'In front' && front.chance < rear.chance && front.attention === 'Watching you', 'owner attention penalizes front approach');
      e.facing = 0; check(pocketRisk(e).position === 'Beside', 'side approach classified');
      e.facing = Math.PI / 2; G.noise = 6;
      check(pocketRisk(e).chance < rear.chance && pocketRisk(e).attention === 'Listening for you', 'noise raises attention and lowers odds');
      G.noise = 2; G.player.skills.Stealth = 100;
      check(pocketRisk(e).chance > rear.chance && pocketRisk(e).chance <= 90, 'Stealth improves odds without certainty');
      G.player.skills.Stealth = 15;
      talk(e); check(pocketRisk(e).position === 'In front', 'conversation turns owner attention toward player'); closeModal();
      e.facing = Math.PI / 2;
      Engine.cam.dir = -Math.PI / 2; check(!pickpocketTarget(), 'must face target'); Engine.cam.dir = Math.PI / 2;
      Engine.cam.y = 20.5; check(!pickpocketTarget(), 'out of reach rejected'); Engine.cam.y = 22.25;
      const cell = G.map.get(23, 23); G.map.set(23, 23, WALL('t_stone'));
      check(!pickpocketTarget(), 'wall occlusion blocks reach'); G.map.set(23, 23, cell);
      e.hidden = true; check(!pickpocketTarget(), 'hidden target rejected'); e.hidden = false;
      e.dead = true; check(!pickpocketTarget(), 'dead target rejected'); e.dead = false;
      e.companion = true; check(!pickpocketTarget(), 'companions excluded'); delete e.companion;
      const guard = G.ents.find(o => o.lawGuard); guard.hidden = false;
      check(!canPickpocket(guard), 'constable excluded'); guard.hidden = true;
      G.flags.greening = true; check(!pickpocketTarget(), 'greening disables town theft'); delete G.flags.greening;
      check(!theftWitness(e), 'unaware owner is not their own third-party witness');
      window.pocketBefore = { gold: G.player.gold, thefts: crimeState().thefts, inventory: JSON.stringify(G.player.inv), skills: G.player.skillProg.Stealth || 0 };
      G.state = 'play';
      return { rear: rear.chance, front: front.chance };
    });
    await page.keyboard.press('p');
    await page.locator('#pocket-take').waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/octave-pickpocket.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'purse panel has no horizontal overflow');
    await page.screenshot({ path: '/tmp/octave-pickpocket-small.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      G.state = 'panel';
      if (G.flags[pocketKey(pocketNPC)] || G.player.gold !== pocketBefore.gold || crimeState().thefts !== pocketBefore.thefts) throw new Error('inspection/cancel has no theft or reward');
      G.state = 'play'; openPickpocket();
      // Force outcomes only around the attempt, not the game frame loop.
      const random = Math.random; Math.random = () => 0;
      try { document.querySelector('#pocket-take').click(); } finally { Math.random = random; }
      if (G.flags[pocketKey(pocketNPC)] !== 'taken' || G.player.gold !== pocketBefore.gold + 8 || crimeState().bounty !== 0) throw new Error('unnoticed rear success grants only loose coin: ' + JSON.stringify({ state: G.flags[pocketKey(pocketNPC)], gold: G.player.gold, before: pocketBefore.gold, bounty: crimeState().bounty }));
      if (JSON.stringify(G.player.inv) !== pocketBefore.inventory || (G.player.skillProg.Stealth || 0) <= pocketBefore.skills) throw new Error('success trains Stealth without touching quest inventory');
      const gold = G.player.gold, thefts = crimeState().thefts;
      pickpocketInput('take');
      if (G.player.gold !== gold || crimeState().thefts !== thefts || !document.querySelector('#pocket-take').disabled) throw new Error('duplicate attempt cannot farm coin');
      pickpocketInput('leave'); G.state = 'panel';
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'panel';
      const e = G.ents.find(o => o.pocketId === pocketNPC.pocketId); window.pocketNPC = e;
      if (G.flags[pocketKey(e)] !== 'taken' || G.player.gold !== gold) throw new Error('purse completion and coin persist');
      G.state = 'play'; openPickpocket();
      if (!document.querySelector('#pocket-take').disabled) throw new Error('saved empty purse stays disabled');
      pickpocketInput('leave'); G.state = 'panel';
      // Real old-save flags have no pocket entries.
      for (const key of Object.keys(saved.flags)) if (key.startsWith('pocket:')) delete saved.flags[key];
      restoreGame(saved); G.state = 'panel'; window.pocketNPC = G.ents.find(o => o.id === 'bettany');
      if (G.flags[pocketKey(pocketNPC)]) throw new Error('old save defaults to untouched purse');
      G.state = 'play'; openPickpocket();
    });
    // Touch cancellation never spends the one attempt.
    await page.locator('#pocket-leave').tap();
    const pockets = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      G.state = 'panel';
      check(!G.flags[pocketKey(pocketNPC)], 'touch cancel preserves opportunity');
      G.opts.touch = 'on'; G.state = 'play'; controlsTick();
      check(!document.querySelector('#t-pocket').hidden, 'contextual touch purse button visible in reach');
      G.state = 'panel';
      const originalPads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = i => { gp.buttons[i].pressed = true; controlsTick(); gp.buttons[i].pressed = false; controlsTick(); };
      try {
        G.state = 'play'; press(3); check(G.openPanel === 'pickpocket', 'controller Y opens purse instead of songs');
        const gold = G.player.gold, thefts = crimeState().thefts;
        const random = Math.random; Math.random = () => 0.999;
        try { press(0); } finally { Math.random = random; }
        check(G.flags[pocketKey(pocketNPC)] === 'caught' && G.player.gold === gold && crimeState().thefts === thefts + 1 && crimeState().bounty === 20, 'caught attempt consumes opportunity, no coin, bounty');
        press(0); check(crimeState().bounty === 20, 'held/repeated controller attempts cannot duplicate bounty');
        press(1); check(!G.openPanel && G.state === 'play', 'controller B leaves');
      } finally { navigator.getGamepads = originalPads; }
      G.state = 'panel';
      const failed = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(failed); G.state = 'panel';
      check(G.flags[pocketKey(G.ents.find(o => o.id === 'bettany'))] === 'caught' && crimeState().bounty === 20, 'caught state and bounty persist');
      const e = G.ents.find(o => o.id === 'tam'); Object.assign(e, { x: 23.5, y: 23.5, facing: Math.PI / 2, hidden: false });
      G.ents.find(o => o.id === 'bettany').hidden = true;
      const guard = G.ents.find(o => o.lawGuard); Object.assign(guard, { x: 24.5, y: 22.5, hidden: false });
      G.state = 'play'; openPickpocket();
      const gold = G.player.gold, random = Math.random; Math.random = () => 0;
      try { pickpocketInput('take'); } finally { Math.random = random; }
      check(G.flags[pocketKey(e)] === 'taken' && G.player.gold === gold + 8 && crimeState().bounty === 40, 'successful witnessed theft still reported');
      pickpocketInput('leave'); guard.hidden = true;
      // Revalidate even when a stale UI callback fires after transfer or movement.
      const next = G.ents.find(o => o.id === 'hob'); Object.assign(next, { x: 23.5, y: 23.5, facing: Math.PI / 2, hidden: false }); e.hidden = true;
      G.state = 'play'; openPickpocket(); Engine.cam.y = 18.5; pickpocketInput('take');
      check(!G.flags[pocketKey(next)] && !G.openPanel, 'movement out of reach cancels stale attempt');
      Engine.cam.y = 22.25; G.state = 'play'; openPickpocket(); loadMap('tavern'); pickpocketInput('take');
      check(!G.flags[pocketKey(next)], 'map transfer cancels stale attempt');
      restoreGame(pocketBaseline); G.opts.touch = 'on'; setTouchMode(true); G.state = 'panel';
      loadMap('oakhaven', { x: 23.5, y: 22.25, dir: Math.PI / 2 }); G.state = 'panel'; G.tod = 0.5;
      G.ents.forEach(o => { if (o.kind === 'npc' || o.kind === 'enemy') o.hidden = true; });
      const touchTarget = G.ents.find(o => o.id === 'bettany');
      Object.assign(touchTarget, { x: 23.5, y: 23.5, facing: Math.PI / 2, hidden: false });
      G.vel.x = G.vel.y = 0; G.touch.fx = G.touch.fy = 0; G.state = 'play'; controlsTick();
      window.pocketTouchGold = G.player.gold;
      return { controls: ['keyboard', 'touch', 'controller'], rewardsOnce: true, savedFailure: true };
    });
    await page.locator('#t-pocket').tap();
    await page.locator('#pocket-take').waitFor({ state: 'visible' });
    await page.evaluate(() => { window.pocketRandom = Math.random; Math.random = () => 0; });
    try { await page.locator('#pocket-take').tap(); }
    finally { await page.evaluate(() => { Math.random = pocketRandom; }); }
    assert.equal(await page.evaluate(() => G.player.gold === pocketTouchGold + 8 && G.flags[pocketKey(G.ents.find(e => e.id === 'bettany'))] === 'taken'), true, 'touch opens and takes purse');
    await page.locator('#pocket-leave').tap();
    await page.evaluate(() => {
      G.state = 'panel'; G.ents.find(e => e.id === 'bettany').hidden = true;
      const e = G.ents.find(o => o.id === 'hob');
      Object.assign(e, { x: 23.5, y: 23.5, facing: -Math.PI / 2, hidden: false });
      G.opts.touch = 'off'; setTouchMode(false); G.state = 'play'; openPickpocket();
      window.pocketRandom = Math.random; Math.random = () => 0.999;
    });
    try { await page.keyboard.press('Enter'); }
    finally { await page.evaluate(() => { Math.random = pocketRandom; }); }
    assert.equal(await page.evaluate(() => G.flags[pocketKey(G.ents.find(e => e.id === 'hob'))] === 'caught'), true, 'keyboard Enter attempts theft');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { restoreGame(pocketBaseline); G.opts.touch = 'auto'; setTouchMode(false); G.state = 'panel'; });
    console.log('PASS pickpocket position/attention, witnesses, attempts, controls and save/load', pocketRiskChecks, pockets);
    const distractions = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      window.throwBaseline = JSON.parse(JSON.stringify(snapshotGame()));
      const map = new GameMap('oakhaven', 'Distraction fixture', 32, 24, { floor: 't_flag', ceil: 't_stone', fogDist: 20, spawn: { x: 5.5, y: 10.5, dir: 0 } });
      map.border('t_stone'); G.maps.oakhaven = map; loadMap('oakhaven'); G.state = 'panel';
      G.noise = 1; G.player.crime = {}; G.throwReady = 0;
      G.player.inv = [{ id: 'pebble', n: 10 }, { id: 'empty_bottle', n: 10 }, { id: 'bottle', n: 1 }];
      const guard = map.npc('townsman', 12.5, 12.5, { lawGuard: true }); hydrate(guard); window.throwGuard = guard;
      const foe = hydrate(map.enemy('proctor', 15.5, 10.5, { guard: true })); window.throwFoe = foe;
      const active = hydrate(map.enemy('proctor', 18.5, 10.5)); active.state = 'chase';
      const passive = hydrate(map.enemy('proctor', 14.5, 14.5, { passive: true }));
      const boss = hydrate(map.enemy('weaver', 16.5, 17.5));
      const hidden = hydrate(map.enemy('proctor', 14.5, 9.5)); hidden.hidden = true;
      const dead = hydrate(map.enemy('proctor', 14.5, 8.5)); dead.dead = true;
      check(distractionImpact('empty_bottle').distance > distractionImpact('pebble').distance, 'bottle travels farther');
      const cell = map.get(7, 10); map.set(7, 10, WALL('t_stone'));
      check(distractionImpact('pebble').x < 7, 'wall clips impact before collision'); map.set(7, 10, cell);
      const blocker = map.deco('crates', 6.5, 10.5, { radius: 0.4 });
      check(!distractionImpact('pebble'), 'near solid entity prevents throw');
      G.state = 'play'; check(!throwDistraction('pebble') && G.count('pebble') === 10, 'blocked throw never consumes inventory'); G.state = 'panel';
      blocker.hidden = true;
      G.state = 'play'; check(throwDistraction('pebble'), 'stone throw accepted'); G.state = 'panel';
      check(G.count('pebble') === 9 && G.count('bottle') === 1 && G.noise === 1, 'one consumable spent, Vox-Bottle and source noise unchanged');
      check(guard.state === 'investigate' && foe.state === 'investigate', 'guard and ordinary idle enemy investigate impact');
      check(active.state === 'chase' && passive.state === 'passive' && !boss.investigation && !hidden.investigation && !dead.investigation, 'combat, passive, boss, hidden and dead exclusions');
      const target = { ...foe.investigation }, before = foe.x;
      enemyUpdate(foe, 0.2); check(foe.x < before && foe.investigation.x === target.x, 'enemy moves to impact, not thrower');
      const guardBefore = guard.x; tickLaw(0.2); check(guard.x < guardBefore, 'constable investigates without bounty');
      G.state = 'play'; check(!throwDistraction('pebble') && G.count('pebble') === 9, 'cooldown prevents double spending'); G.state = 'panel';
      tickDistractions(2); check(!G.ents.some(e => e.distractionT != null), 'impact marker expires');
      updateInvestigation(foe, 10); check(foe.state === 'idle' && !foe.investigation, 'investigation expires to idle');
      // Perception and attacks override investigation immediately.
      foe.x = 15.5; foe.y = 10.5; G.throwReady = 0; G.state = 'play'; throwDistraction('empty_bottle'); G.state = 'panel';
      Engine.cam.x = foe.x - 3; enemyUpdate(foe, 0.016);
      check(foe.state === 'chase' && !foe.investigation, 'visible player supersedes impact');
      Engine.cam.x = 5.5; G.player.crime = { bounty: 20 }; guard.x = 12.5; guard.y = 12.5;
      guard.state = 'idle'; delete guard.investigation;
      G.throwReady = 0; G.state = 'play'; throwDistraction('pebble'); G.state = 'panel';
      check(!guard.investigation, 'visible wanted player prevents guard diversion');
      // An existing investigation is interrupted when a wanted player becomes visible.
      guard.state = 'investigate'; guard.investigation = { x: 20.5, y: 12.5, left: 6 };
      tickLaw(0.1); check(guard.investigation?.source === 'crime', 'wanted-player sight replaces distraction with last-seen crime search');
      G.player.crime = {}; foe.state = 'idle'; foe.x = 15.5; foe.y = 10.5;
      // Nearby sound muffles through a wall; a distant listener cannot hear through it.
      map.set(13, 10, WALL('t_stone')); G.throwReady = 0; G.state = 'play'; throwDistraction('pebble'); G.state = 'panel';
      check(foe.state === 'idle', 'wall muffles distant impact'); map.set(13, 10, null);
      G.throwReady = 0; G.state = 'play'; throwDistraction('pebble'); G.state = 'panel';
      check(foe.state === 'investigate', 'same listener hears unobstructed impact');
      const position = { x: Engine.cam.x, y: Engine.cam.y }, weapons = G.player.weapons, weapon = G.player.weapon;
      Engine.cam.x = foe.x - 1; Engine.cam.y = foe.y; G.player.weapons = ['sword']; G.player.weapon = 0; G.attack.t = 0; G.song.t = 0;
      const random = Math.random; Math.random = () => 0;
      try { attack('thrust'); } finally { Math.random = random; }
      check(foe.state === 'chase' && !foe.investigation, 'weapon hit interrupts investigation immediately');
      Object.assign(Engine.cam, position); G.player.weapons = weapons; G.player.weapon = weapon; G.attack.t = 0;
      foe.state = 'idle'; G.throwReady = 0; G.state = 'play'; throwDistraction('pebble'); G.state = 'panel';
      check(foe.state === 'investigate', 'idle enemy can investigate a later sound');
      // Save while investigating; no transient impact or stale target may replay.
      map.baseCount = map.entities.filter(e => !e.transient).length;
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      check(!saved.maps.oakhaven.extra.some(e => e.kind === 'deco'), 'transient impacts excluded from snapshot');
      check(pickEnt({ state: 'investigate' }).state === 'idle', 'saved investigation normalizes without transient target');
      loadMap('tavern'); check(!foe.investigation && foe.state === 'idle', 'departure clears investigation');
      restoreGame(throwBaseline); G.state = 'panel';
      // Actual authored map round-trip with a listening constable.
      loadMap('oakhaven', { x: 23.5, y: 22.5, dir: Math.PI / 2 }); G.state = 'panel';
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; });
      const realGuard = G.ents.find(e => e.lawGuard); Object.assign(realGuard, { x: 26.5, y: 27.5, hidden: false });
      G.player.crime = {}; G.player.inv = [{ id: 'pebble', n: 4 }, { id: 'empty_bottle', n: 3 }, { id: 'bottle', n: 1 }];
      G.throwReady = 0; G.state = 'play'; throwDistraction('pebble'); G.state = 'panel';
      check(realGuard.state === 'investigate', 'authored town guard hears throw');
      const roundTrip = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(roundTrip); G.state = 'panel';
      check(G.count('pebble') === 3 && G.count('empty_bottle') === 3 && G.count('bottle') === 1, 'inventory consumption survives reload');
      check(!G.ents.some(e => e.investigation || e.distractionT != null || e.state === 'investigate'), 'reload never replays sound targets');
      // Prepare actual keyboard/touch/controller panel flows without moving listeners.
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; }); G.tod = 0.5;
      G.keys = {}; G.vel.x = G.vel.y = 0; G.throwReady = 0; G.state = 'play';
      return { consumables: 2, investigation: true, savedInventory: true };
    });
    await page.keyboard.press('o');
    await page.locator('#throw-pebble').waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/octave-distractions.png' });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => G.count('pebble')), 3, 'keyboard cancel is free');
    await page.keyboard.press('o'); await page.keyboard.press('1');
    assert.equal(await page.evaluate(() => G.count('pebble')), 2, 'keyboard throws one stone');
    await page.evaluate(() => { G.state = 'panel'; G.opts.touch = 'on'; setTouchMode(true); G.throwReady = 0; G.state = 'play'; controlsTick(); });
    await page.locator('#t-throw').tap();
    await page.locator('#throw-empty_bottle').tap();
    assert.equal(await page.evaluate(() => G.count('empty_bottle')), 2, 'touch throws one empty bottle');
    await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      G.state = 'panel'; G.throwReady = 0;
      const originalPads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = i => { gp.buttons[i].pressed = true; controlsTick(); gp.buttons[i].pressed = false; controlsTick(); };
      try {
        G.state = 'play'; press(11); check(G.openPanel === 'distractions', 'controller right stick opens throw panel');
        press(0); check(G.count('pebble') === 1, 'controller A throws stone');
        G.throwReady = 0; press(11); press(2); check(G.count('empty_bottle') === 1, 'controller X throws bottle');
        press(11); press(1); check(!G.openPanel && G.state === 'play', 'controller B cancels');
      } finally { navigator.getGamepads = originalPads; }
      G.state = 'panel'; G.throwReady = 0; openDistractions();
      const count = G.count('pebble'); check(!throwDistraction('pebble') && G.count('pebble') === count, 'paused gameplay cannot throw');
      G.player.inv = []; G.state = 'play'; openDistractions();
      check(document.querySelector('#throw-pebble').disabled && document.querySelector('#throw-empty_bottle').disabled, 'empty inventory disables throws');
      document.querySelector('#throw-leave').click();
      G.state = 'panel'; restoreGame(throwBaseline); G.opts.touch = 'auto'; setTouchMode(false); G.state = 'panel';
    });
    console.log('PASS distractions: impacts, inventory, investigation, threat priority, controls and reload', distractions);
    const bodies = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      window.bodyBaseline = JSON.parse(JSON.stringify(snapshotGame()));
      for (const id of ['oakhaven', 'quarry', 'cloister']) {
        const m = G.maps[id], recess = m.entities.find(e => e.bodyCover);
        check(recess && !recess.solid && !m.isBlocked(recess.x | 0, recess.y | 0), id + ' recess is accessible nonblocking floor');
        const recessIdx = m.entities.indexOf(recess);
        if (id === 'oakhaven') check(recessIdx >= 0 && recessIdx < m.baseCount && m.entities.slice(recessIdx + 1, m.baseCount).every(e => e.wantedPoster || e.lawGuard || e.use === 'stable'), id + ' recess retains its historical index before append-only law and stable entities');
        else check(recessIdx === m.baseCount - 1, id + ' recess retains its historical index');
      }
      const map = new GameMap('oakhaven', 'Body fixture', 32, 24, { floor: 't_flag', ceil: 't_stone', fogDist: 20, spawn: { x: 5.5, y: 10.5, dir: 0 } });
      map.border('t_stone'); G.maps.oakhaven = map; loadMap('oakhaven'); G.state = 'panel';
      G.noise = 1; G.player.crime = {}; G.keys = {}; G.vel.x = G.vel.y = 0; G.player.level = 50;
      const source = hydrate(map.enemy('proctor', 6.5, 10.5));
      const cover = map.deco('crates', 8.5, 10.5, { solid: false, bodyCover: true, use: 'body_cover' });
      map.baseCount = map.entities.length;
      const kills = G.player.kills, xp = G.player.xp;
      const random = Math.random; Math.random = () => 0;
      try { killEnemy(source, false); } finally { Math.random = random; }
      const body = G.ents.find(e => e.deathArt); window.testBody = body; window.bodyFixture = map;
      check(!bodyReachable(body), 'collapsing body cannot be dragged'); animDying(body, 2);
      const loot = G.ents.find(e => e.kind === 'item'), lootPosition = { x: loot.x, y: loot.y };
      check(bodyTarget() === body && body.nopick && !body.solid, 'settled corpse is reachable without changing engine picking or collision');
      Engine.cam.dir = Math.PI; check(!bodyTarget(), 'body selection requires facing'); Engine.cam.dir = 0;
      map.set(6, 10, WALL('t_stone')); check(!bodyTarget(), 'body selection cannot reach through walls'); map.set(6, 10, null);
      G.state = 'play'; openBody(); check(document.querySelector('#body-hide').disabled, 'conceal action disabled without nearby recess'); document.querySelector('#body-leave').click();
      check(!G.dragBody && G.player.kills === kills + 1 && G.player.xp === xp + ENEMIES.proctor.xp, 'inspection and cancel grant no rewards');
      openBody(); document.querySelector('#body-drag').click();
      check(G.dragBody === body && !bodyCover(body), 'drag begins without a hiding place in range');
      // Slow walking and no sprint: compare identical movement inputs.
      const simulate = drag => {
        Object.assign(Engine.cam, { x: 5.5, y: 10.5, dir: Math.PI / 2 });
        Object.assign(body, { x: 6.5, y: 10.5 }); G.dragBody = drag ? body : null;
        G.vel.x = G.vel.y = 0; G.keys = { w: true, shift: true }; G.touch.fx = G.touch.fy = 0; G.touch.run = false;
        G.state = 'play'; const fat = G.player.fat;
        for (let i = 0; i < 8; i++) update(0.016);
        const result = { distance: Engine.cam.y - 10.5, fat: fat - G.player.fat };
        G.state = 'panel'; G.keys = {}; G.vel.x = G.vel.y = 0; return result;
      };
      const walking = simulate(true), sprinting = simulate(false);
      check(walking.distance < sprinting.distance * 0.4 && walking.fat <= 0, 'drag slows movement and prevents sprint fatigue');
      Object.assign(Engine.cam, { x: 7.5, y: 10.5, dir: Math.PI }); Object.assign(body, { x: 6.5, y: 10.5 });
      G.dragBody = body; tickBodies(0); check(body.x > 6.5 && body.x < 7.5, 'body follows movement with trailing gap');
      Object.assign(body, { x: 6.5, y: 10.5 }); Engine.cam.x = 7.9;
      const blocker = map.deco('crates', 7.25, 10.5, { radius: 0.3 }); tickBodies(0);
      check(body.x < 6.8, 'solid prop blocks dragging without teleporting'); blocker.hidden = true;
      map.set(7, 10, DOOR({})); tickBodies(0); check(!G.dragBody && body.x < 7, 'closing door releases drag on original side'); map.set(7, 10, null);
      map.floorTextures = ['t_flag', 't_cobble', 't_water']; map.floorCells = new Uint8Array(map.w * map.h); map.setFloor(7, 10, 2);
      G.dragBody = body; tickBodies(0); check(body.x < 6.8, 'body cannot be dragged into water even when player can swim'); map.setFloor(7, 10, 0);
      Object.assign(Engine.cam, { x: 7.5, y: 10.5, dir: Math.PI }); Object.assign(body, { x: 7, y: 10.5 });
      G.state = 'play'; openBody(); document.querySelector('#body-hide').click();
      check(body.hidden && body.stashedIn === cover && !G.dragBody && body.x === cover.x, 'concealment uses nearby recess');
      const watcher = hydrate(map.enemy('proctor', 12.5, 10.5, { guard: true }));
      G.bodyScanT = 0; tickBodies(0.25); check(!body.bodyFound && !watcher.investigation, 'concealed body cannot raise alarm');
      Engine.cam.dir = 0; G.state = 'play'; openBody(); document.querySelector('#body-drag').click();
      check(!body.hidden && !body.stashedIn && G.dragBody === body, 'concealed body can be recovered during visit');
      G.dragBody = null; Engine.cam.x = 2.5;
      const ally = hydrate(map.enemy('legionnaire', 15.5, 10.5, { guard: true }));
      const active = hydrate(map.enemy('proctor', 13.5, 12.5)); active.state = 'chase';
      const passive = hydrate(map.enemy('proctor', 12.5, 13.5, { passive: true }));
      const hidden = hydrate(map.enemy('proctor', 12.5, 14.5)); hidden.hidden = true;
      const stunned = hydrate(map.enemy('proctor', 11.5, 11.5)); stunned.stun = 4;
      const boss = hydrate(map.enemy('wearer', 9.5, 10.5));
      check(!bodyPatrol(boss), 'bosses do not join body patrol alarms'); boss.hidden = true;
      for (let y = 2; y < 22; y++) map.set(10, y, WALL('t_stone')); G.bodyScanT = 0; tickBodies(0.25);
      check(!body.bodyFound, 'occluded and stunned patrols cannot discover body');
      for (let y = 2; y < 22; y++) map.set(10, y, null);
      G.bodyScanT = 0; tickBodies(0.25);
      check(body.bodyFound && watcher.investigation.source === 'body' && ally.state === 'investigate', 'visible body raises local ally investigation');
      check(active.state === 'chase' && passive.state === 'passive' && !hidden.investigation && !stunned.investigation, 'alarm preserves combat and listener exclusions');
      const before = watcher.x; enemyUpdate(watcher, 0.1);
      check(watcher.x < before && watcher.state !== 'chase', 'discovery searches body, not unseen player');
      watcher.investigation.left = 3; G.bodyScanT = 0; tickBodies(0.25);
      check(watcher.investigation.left === 3 && crimeState().bounty === 0, 'one alarm per body, no bounty from discovery alone');
      G.player.inv.push({ id: 'empty_bottle', n: 2 }); G.throwReady = 0; G.state = 'play'; throwDistraction('empty_bottle'); G.state = 'panel';
      check(watcher.investigation.source === 'body', 'distractions cannot override a body alarm');
      Engine.cam.x = watcher.x - 3; enemyUpdate(watcher, 0.016);
      check(watcher.state === 'chase' && !watcher.investigation, 'seeing player overrides body search');
      watcher.hidden = ally.hidden = active.hidden = passive.hidden = stunned.hidden = true;
      const guard = hydrate(map.npc('townsman', 11.5, 10.5, { lawGuard: true }));
      Object.assign(Engine.cam, { x: 7.5, y: 10.5, dir: 0 }); G.dragBody = body;
      G.bodyScanT = 0; tickBodies(0.25); check(crimeState().bounty === 20 && body.dragReported, 'constable witnessing drag reports one bounty');
      G.bodyScanT = 0; tickBodies(0.25); check(crimeState().bounty === 20, 'repeated sight cannot duplicate bounty');
      guard.hidden = true; G.player.crime = {};
      check(loot.x === lootPosition.x && loot.y === lootPosition.y && !loot.dead, 'dragging never moves or consumes independent loot');
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      check(!saved.maps.oakhaven.extra.some(e => e.kind === 'deco' && e.sprite === body.sprite) && !('dragBody' in saved) && !JSON.stringify(saved.maps.oakhaven).includes('stashedIn'), 'body refs, concealment and alarm state are not serialized');
      G.state = 'play'; openBody(); document.querySelector('#body-hide').click();
      check(body.hidden && body.stashedIn, 'concealed remains prepared for departure cleanup');
      G.state = 'play'; openBody(); const stale = document.querySelector('#body-drag');
      loadMap('tavern'); stale.click(); check(!G.dragBody, 'stale body action cannot start dragging in another map');
      check(!map.entities.some(e => e.corpse || (e.transient && !e._scn && !e._flora && !e._decor)), 'departure removes exposed or concealed corpses');
      const legacy = JSON.parse(JSON.stringify(bodyBaseline));
      for (const id of ['oakhaven', 'quarry', 'cloister']) legacy.maps[id].ents.pop();
      restoreGame(legacy); G.state = 'panel';
      check(['oakhaven', 'quarry', 'cloister'].every(id => G.maps[id].entities.some(e => e.bodyCover && !e.dead && !e.hidden)), 'older saves receive appended recesses');
      check(!G.dragBody && !G.ents.some(e => e.corpse), 'reload clears drag and visual corpses');
      // Real authored map lifecycle with a killed enemy and detached loot.
      loadMap('quarry'); G.state = 'panel'; const authored = G.ents.find(e => e.kind === 'enemy');
      killEnemy(authored, false); const realBody = G.ents.find(e => e.deathArt); animDying(realBody, 2);
      G.dragBody = realBody; const realSaved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(realSaved); G.state = 'panel';
      check(!G.dragBody && !G.ents.some(e => e.corpse) && G.ents.some(e => e.kind === 'enemy' && e.dead), 'authored save/load keeps death without body resurrection');
      restoreGame(bodyBaseline); G.state = 'panel';
      // Controls use authored art in a deterministic indoor fixture.
      G.maps.oakhaven = map; loadMap('oakhaven', { x: 7.5, y: 10.5, dir: 0 });
      map.entities.forEach(e => { if (e.kind === 'npc' || e.kind === 'enemy' && !e.dead) e.hidden = true; });
      const visual = animSpawnDeath(hydrate({ kind: 'enemy', type: 'proctor', x: 8.5, y: 10.5 })); animDying(visual, 2);
      window.controlBody = visual; G.state = 'play'; G.keys = {}; G.vel.x = G.vel.y = 0; G.tod = 0.5;
      return { dragCollision: true, concealRecover: true, oneAlarm: true, savedDeaths: true };
    });
    await page.keyboard.press('g'); await page.locator('#body-drag').waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/octave-body-panel.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.evaluate(() => {
      const panel = document.querySelector('#modal-panel'), button = document.querySelector('#body-hide');
      const bounds = panel.getBoundingClientRect();
      button.scrollIntoView({ block: 'nearest' });
      const rect = button.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && panel.scrollWidth <= panel.clientWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight;
    }), true, 'compact body panel remains readable and actions reachable');
    await page.screenshot({ path: '/tmp/octave-body-small.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => !!G.dragBody), false, 'keyboard inspection/cancel is free');
    await page.keyboard.press('g'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => G.dragBody === controlBody), true, 'keyboard starts drag');
    await page.keyboard.press('g'); await page.keyboard.press('h');
    assert.equal(await page.evaluate(() => !!controlBody.stashedIn && controlBody.hidden), true, 'keyboard conceals');
    await page.evaluate(() => { G.opts.touch = 'on'; setTouchMode(true); controlsTick(); });
    assert.equal(await page.evaluate(() => {
      const game = document.querySelector('#game').getBoundingClientRect();
      return [...document.querySelectorAll('#touchui button:not([hidden])')].every(el => {
        const rect = el.getBoundingClientRect(); return rect.top >= game.top && rect.bottom <= game.bottom;
      });
    }), true, 'all touch actions stay within the game frame with Body visible');
    await page.screenshot({ path: '/tmp/octave-body-touch.png' });
    await page.locator('#t-body').tap(); await page.locator('#body-drag').tap();
    assert.equal(await page.evaluate(() => G.dragBody === controlBody && !controlBody.hidden), true, 'touch recovers body');
    await page.locator('#t-body').tap(); await page.locator('#body-drag').tap();
    assert.equal(await page.evaluate(() => !!G.dragBody), false, 'touch drops body');
    await page.evaluate(() => {
      const original = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = i => { gp.buttons[i].pressed = true; controlsTick(); gp.buttons[i].pressed = false; controlsTick(); };
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      try {
        press(10); check(G.openPanel === 'body', 'left-stick opens body actions'); press(0); check(G.dragBody === controlBody, 'controller A drags');
        press(10); press(2); check(controlBody.hidden && !G.dragBody, 'controller X conceals');
        press(10); press(1); check(!G.openPanel && controlBody.hidden, 'controller B cancels');
        G.state = 'panel'; openBody(); check(!G.openPanel, 'paused state cannot open body actions');
      } finally { navigator.getGamepads = original; }
      G.state = 'play'; openBody(); document.querySelector('#body-drag').click();
      die('body regression'); check(!G.dragBody, 'player death releases body');
      restoreGame(bodyBaseline); G.opts.touch = 'auto'; setTouchMode(false); G.state = 'panel';
    });
    console.log('PASS bodies: collision, conceal/recover, local alarms, bounties, controls and lifecycle', bodies);
    const disguise = await page.evaluate(() => {
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      window.coverBaseline = JSON.parse(JSON.stringify(snapshotGame()));
      check(ITEMS.a_synodrobe.armor && ARMOR.a_synodrobe.slot === 'body' && NPCS.hob.shop.some(e => e.item === 'a_synodrobe'), 'robes are body armour sold by Hob');
      const map = new GameMap('oakhaven', 'Disguise fixture', 32, 24, { floor: 't_flag', ceil: 't_stone', fogDist: 20, spawn: { x: 5.5, y: 10.5, dir: 0 } });
      map.border('t_stone'); G.maps.oakhaven = map; loadMap('oakhaven'); G.state = 'panel';
      G.player.inv.push({ id: 'a_synodrobe', n: 1 }); G.player.crime = {}; G.keys = {}; G.vel.x = G.vel.y = 0;
      const patrol = hydrate(map.enemy('proctor', 9.5, 10.5, { guard: true })); window.coverPatrol = patrol;
      const reset = () => {
        delete G.flags[disguiseKey()]; G.coverSuspicion = 0; G.noise = 1; G.dragBody = null;
        patrol.hidden = false; patrol.dead = false; patrol.stun = 0; patrol.passive = false; patrol.state = 'idle'; delete patrol.investigation;
        patrol.x = 9.5; patrol.y = 10.5; G.player.armor = { body: 'a_synodrobe' }; G.attack.t = G.song.t = 0;
        Object.assign(Engine.cam, { x: 5.5, y: 10.5, dir: 0 }); G.state = 'panel';
      };
      reset(); enemyUpdate(patrol, 0.1); check(patrol.state === 'idle' && disguiseProtects(patrol), 'covered player can pass distant patrol');
      G.player.armor = {}; enemyUpdate(patrol, 0.1); check(patrol.state === 'chase', 'same ordinary patrol detects unrobed player');
      reset(); patrol.x = 7.5; tickDisguise(1); check(Math.abs(G.coverSuspicion - 1) < 0.01 && !disguiseExposed(), 'close sight builds inspection over three seconds');
      check(disguiseStatus().includes('34%'), 'written inspection percentage is rounded visibly');
      patrol.x = 9.5; tickDisguise(0.5); check(G.coverSuspicion < 1 && G.coverSuspicion > 0, 'retreat lowers suspicion');
      patrol.x = 7.5; map.set(6, 10, WALL('t_stone')); tickDisguise(1);
      check(G.coverSuspicion === 0 && !disguiseExposed(), 'wall blocks inspection and allows suspicion decay'); map.set(6, 10, null);
      tickDisguise(3); check(disguiseExposed() && patrol.state === 'chase', 'three seconds of inspection expose and alert');
      removeArmor('body'); equipArmor('a_synodrobe'); check(disguiseExposed(), 'changing robes cannot erase exposure');
      reset(); patrol.x = 7.5; G.noise = 4; tickDisguise(1.5); check(disguiseExposed(), 'loud movement doubles inspection speed');
      reset(); patrol.x = 7.5; G.state = 'play'; G.touch.fx = G.touch.fy = 0; G.touch.run = false; update(0.1); G.state = 'panel';
      check(G.coverSuspicion > 0 && !document.querySelector('#cover-status').hidden && document.querySelector('#cover-status').textContent.includes('INSPECTION'), 'actual simulation updates written inspection HUD');
      const pausedSuspicion = G.coverSuspicion; update(1); check(G.coverSuspicion === pausedSuspicion, 'inspection does not advance while paused');
      reset(); patrol.x = 7.5; patrol.stun = 2; tickDisguise(2); check(!G.coverSuspicion, 'stunned patrol cannot inspect');
      patrol.stun = 0; patrol.hidden = true; tickDisguise(2); check(!G.coverSuspicion, 'hidden patrol cannot inspect');
      patrol.hidden = false; patrol.passive = true; tickDisguise(2); check(!G.coverSuspicion, 'passive patrol cannot inspect');
      reset(); patrol.state = 'chase'; check(!disguiseProtects(patrol), 'robes never stop active combat');
      reset(); patrol.state = 'investigate'; patrol.investigation = { x: 12.5, y: 10.5, left: 8, source: 'body' };
      check(!disguiseProtects(patrol), 'body alarm search takes priority over cover');
      reset(); patrol.state = 'investigate'; patrol.investigation = { x: 12.5, y: 10.5, left: 8 }; const oldX = patrol.x;
      enemyUpdate(patrol, 0.1); check(patrol.x > oldX && patrol.state === 'investigate', 'covered patrol still follows thrown distractions');
      reset(); const legion = hydrate({ kind: 'enemy', type: 'legionnaire', x: 9.5, y: 10.5 }); check(disguiseProtects(legion), 'Legionnaires accept robes');
      legion.def = { ...legion.def, boss: true }; check(!disguiseProtects(legion), 'boss variants cannot be fooled');
      for (const type of ['hound', 'quiet', 'golem', 'wearer']) check(!disguiseProtects(hydrate({ kind: 'enemy', type, x: 9.5, y: 10.5 })), type + ' ignores disguise');
      // Actions break cover only when witnessed; failed/unavailable actions do not.
      reset(); G.player.weapons = ['sword']; G.player.weapon = 0; attack('thrust'); check(disguiseExposed(), 'witnessed swing exposes even without a hit');
      reset(); patrol.hidden = true; attack('thrust'); check(!disguiseExposed(), 'unseen attack cannot reveal player through walls');
      reset(); G.player.voice = 0; castSong('root'); check(!disguiseExposed(), 'unavailable song cannot expose player');
      G.player.voice = G.player.voiceMax; castSong('root'); check(disguiseExposed(), 'witnessed loud song exposes player');
      reset(); castSong('murmur'); check(!disguiseExposed(), 'quiet murmur does not break cover');
      reset(); executeCustomSong({ name: 'Cover regression', freq: 174, cost: 1, power: 0, noise: 1, effects: ['stun_core'] });
      check(disguiseExposed(), 'offensive custom song exposes even at low noise');
      reset(); G.player.inv.push({ id: 'pebble', n: 2 }); G.state = 'play'; G.throwReady = 0; throwDistraction('pebble'); G.state = 'panel';
      check(disguiseExposed(), 'witnessed throw breaks cover');
      reset(); G.player.armor = {}; equipArmor('a_synodrobe'); check(disguiseExposed(), 'changing into robes in sight is recognized');
      reset(); G.player.armor = {}; patrol.hidden = true; equipArmor('a_synodrobe'); check(!disguiseExposed(), 'unseen robe change is safe');
      reset(); G.dragBody = { corpse: true }; tickDisguise(0); check(disguiseExposed(), 'witnessed body dragging breaks cover'); G.dragBody = null;
      reset(); const constable = hydrate(map.npc('townsman', 6.5, 11.5, { lawGuard: true }));
      G.player.crime = { bounty: 20 }; G.lawGrace = 0; tickLaw(0.016);
      check(G.openPanel === 'arrest' && G.state === 'panel', 'disguise does not bypass wanted-player arrest'); closeModal(); constable.hidden = true; G.player.crime = {};
      reset(); exposeDisguise('Saved regression', true);
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(saved); G.state = 'panel'; check(wearingDisguise() && disguiseExposed() && G.coverSuspicion === 0, 'robe and area exposure save, inspection timer resets');
      loadMap('tavern'); check(!disguiseExposed(), 'exposure is local to each area'); loadMap('oakhaven'); check(disguiseExposed(), 'leaving and returning does not clear exposure');
      const old = JSON.parse(JSON.stringify(coverBaseline)); restoreGame(old); G.state = 'panel'; check(!disguiseExposed() && !wearingDisguise(), 'older saves default to undisguised without exposure');
      G.flags['disguise:exposed:oakhaven'] = '<img onerror=1>'; G.player.inv.push({ id: 'a_synodrobe', n: 1 }); G.player.armor.body = 'a_synodrobe';
      check(!disguiseExposed() && !disguiseStatus().includes('<'), 'hostile flag text is neither accepted as exposure nor rendered');
      delete G.flags['disguise:exposed:oakhaven'];
      // Trade through the actual dialogue UI next.
      loadMap('oakhaven'); G.state = 'panel'; G.ents.forEach(e => { if (e.kind === 'enemy') e.hidden = true; });
      G.player.inv = G.player.inv.filter(s => s.id !== 'a_synodrobe'); G.player.armor.body = 'a_plate'; G.player.gold = 100;
      window.coverPrice = buyPrice(NPCS.hob, NPCS.hob.shop.find(e => e.item === 'a_synodrobe'));
      talk(G.ents.find(e => e.id === 'hob'));
      return { inspection: true, exposureSaved: true, threatsPreserved: true };
    });
    await page.locator('#d-buy').click();
    await page.locator('[data-buy]').filter({ hasText: 'Synod Clerk Robes' }).click();
    assert.equal(await page.evaluate(() => G.has('a_synodrobe') && G.player.gold === 100 - coverPrice), true, 'merchant purchase gives robes and charges exact price');
    await page.locator('#d-bye').click();
    await page.keyboard.press('i');
    await page.locator('.carry tr').filter({ hasText: 'Synod Clerk Robes' }).locator('[data-use]').click();
    assert((await page.locator('.paper-doll svg title').textContent()).includes('Synod Clerk Robes'), 'real inventory Wear updates paper doll');
    await page.screenshot({ path: '/tmp/octave-disguise-inventory.png' });
    await page.keyboard.press('Escape'); await page.keyboard.press('y');
    await page.locator('#cover-wear').waitFor({ state: 'visible' });
    await page.screenshot({ path: '/tmp/octave-disguise-panel.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.evaluate(() => {
      const p = document.querySelector('#modal-panel'); document.querySelector('#cover-wear').scrollIntoView({ block: 'nearest' });
      const r = document.querySelector('#cover-wear').getBoundingClientRect();
      return p.scrollWidth <= p.clientWidth + 1 && r.top >= 0 && r.bottom <= innerHeight;
    }), true, 'compact cover panel actions are accessible');
    await page.screenshot({ path: '/tmp/octave-disguise-small.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => wearingDisguise()), true, 'keyboard cancel keeps robe equipped');
    await page.keyboard.press('y'); await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => wearingDisguise()), false, 'keyboard removes robe');
    await page.evaluate(() => { G.opts.touch = 'on'; setTouchMode(true); controlsTick(); });
    await page.locator('#t-cover').tap(); await page.locator('#cover-wear').tap();
    assert.equal(await page.evaluate(() => wearingDisguise()), true, 'touch equips robe');
    await page.evaluate(() => {
      const c = Engine.cam;
      const body = animSpawnDeath(hydrate({ kind: 'enemy', type: 'proctor', x: c.x + Math.cos(c.dir), y: c.y + Math.sin(c.dir) }));
      animDying(body, 2); controlsTick();
    });
    assert.equal(await page.evaluate(() => {
      const frame = document.querySelector('#game').getBoundingClientRect();
      return [...document.querySelectorAll('#touchui button:not([hidden])')].every(el => { const r = el.getBoundingClientRect(); return r.top >= frame.top && r.bottom <= frame.bottom; });
    }), true, 'touch Cover and Body actions remain within the frame together');
    await page.screenshot({ path: '/tmp/octave-disguise-touch.png' });
    await page.evaluate(() => {
      const original = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = i => { gp.buttons[i].pressed = true; controlsTick(); gp.buttons[i].pressed = false; controlsTick(); };
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      try {
        press(8); check(G.openPanel === 'disguise', 'controller Back opens cover status'); press(0); check(!wearingDisguise(), 'controller A removes robes');
        press(8); press(0); check(wearingDisguise(), 'controller A equips robes');
        press(8); press(1); check(!G.openPanel && wearingDisguise(), 'controller B cancels without changing clothing');
      } finally { navigator.getGamepads = original; }
      G.state = 'panel';
      const robeCount = G.count('a_synodrobe'); openDisguise(); check(!G.openPanel && G.count('a_synodrobe') === robeCount, 'paused gameplay cannot open or spend resources');
      G.player.inv = G.player.inv.filter(s => s.id !== 'a_synodrobe'); G.state = 'play'; openDisguise();
      check(document.querySelector('#cover-wear').disabled && !wearingDisguise(), 'missing inventory disables cover even with stale armour slot');
      document.querySelector('#cover-leave').click();
      G.player.inv.push({ id: 'a_synodrobe', n: 1 }); G.state = 'play'; openDisguise(); const stale = document.querySelector('#cover-wear');
      loadMap('tavern'); const before = G.player.armor.body; stale.click(); check(G.player.armor.body === before, 'stale wear callback cannot change clothes after departure');
      restoreGame(coverBaseline); G.opts.touch = 'auto'; setTouchMode(false); G.state = 'panel';
    });
    console.log('PASS Synod disguise: proximity inspection, exposure, combat/crime priority, trade, saves and all inputs', disguise);
    await page.evaluate(() => {
      loadMap('catacombs', { x: 6.5, y: 5.1, dir: Math.PI / 2 }); G.state = 'panel';
      const e = G.ents.find(e => e.trapType === 'tripwire'); useDeco(e);
    });
    await page.locator('#trap-disarm').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => G.flags[trapKey(G.ents.find(e => e.trapType === 'tripwire'))] || null), null);
    const traps = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      G.state = 'panel';
      const mechanisms = G.ents.filter(e => e.trapType);
      check(mechanisms.length === 3, 'three trap types placed');
      for (const e of mechanisms) {
        check(!G.map.isBlocked(e.x | 0, e.y | 0) && !e.solid, e.trapId + ' accessible and nonblocking');
        check(!G.map.triggers.some(t => dist2(e.x, e.y, t.x, t.y) < (t.r + 1) ** 2), e.trapId + ' away from story triggers');
      }
      const wire = mechanisms.find(e => e.trapType === 'tripwire');
      useDeco(wire); document.querySelector('#trap-disarm').click();
      for (let i = 0; i < 3; i++) { LOCKPICK.position = LOCKPICK.centers[0] < 50 ? 100 : 0; lockpickInput('lift'); }
      check(!G.flags[trapKey(wire)], 'failed disarm leaves trap armed');
      G.player.hp = 50;
      Engine.cam.x = wire.x; Engine.cam.y = wire.y; tickTraps();
      check(G.player.hp === 45 && G.flags[trapKey(wire)] === 'triggered', 'walking into wire deals five damage');
      tickTraps(); check(G.player.hp === 45, 'wire cannot fire twice');
      const net = mechanisms.find(e => e.trapType === 'net');
      useDeco(net); document.querySelector('#trap-disarm').click();
      for (let i = 0; i < 3; i++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      check(G.flags[trapKey(net)] === 'disarmed', 'successful disarm persists named state');
      G.webT = 0; triggerTrap(net); check(G.webT === 0, 'disarmed net cannot fire');
      delete G.flags[trapKey(net)]; triggerTrap(net); check(G.webT === 8, 'armed net applies movement slow timer');
      const bell = mechanisms.find(e => e.trapType === 'alarm');
      const enemy = hydrate({ kind: 'enemy', type: 'proctor', x: bell.x + 2, y: bell.y }); G.ents.push(enemy);
      triggerTrap(bell); check(enemy.state === 'chase' && enemy.alertT === 8, 'alarm alerts nearby active enemies');
      G.flags[trapKey(net)] = 'disarmed';
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'panel';
      check(G.ents.filter(e => e.trapType).every(e => G.flags[trapKey(e)] === (e.trapType === 'net' ? 'disarmed' : 'triggered')), 'spent and disarmed traps survive reload');
      const restoredWire = G.ents.find(e => e.trapType === 'tripwire'), hp = G.player.hp;
      triggerTrap(restoredWire); check(G.player.hp === hp, 'reload does not rearm trap');
      const old = JSON.parse(JSON.stringify(saved)); for (const e of G.ents.filter(e => e.trapType)) delete old.flags[trapKey(e)];
      restoreGame(old); G.state = 'panel';
      check(G.ents.filter(e => e.trapType).every(e => !G.flags[trapKey(e)]), 'old saves default to armed mechanisms');
      return { types: 3, oneShot: true, savedState: true };
    });
    console.log('PASS trap inspection, disarm, trigger effects and save/load', traps);
    await page.evaluate(() => {
      loadMap('cloister', { x: 16.5, y: 11, dir: Math.PI / 2 }); G.state = 'panel';
      const e = G.ents.find(e => e.use === 'note_reliquary');
      if (!e || G.map.isBlocked(e.x | 0, e.y | 0)) throw new Error('reliquary placed on accessible floor');
      window.noteBefore = { shards: G.count('shard'), voice: G.player.voice, story: G.flags.tombs_rung };
      G.ents.forEach(o => { o._screen = null; });
      interact();
      if (G.openPanel !== 'notelock') throw new Error('in-world interaction opens reliquary');
    });
    await page.locator('#note-1').tap();
    assert.equal(await page.evaluate(() => NOTELOCK.entered.length), 0);
    await page.waitForFunction(() => document.querySelector('#modal-panel [role="status"]').textContent.includes('reset'));
    await page.keyboard.press('1');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => G.flags[RELIQUARY_FLAG] || false), false);
    await page.evaluate(() => { G.state = 'panel'; useDeco(G.ents.find(e => e.use === 'note_reliquary')); });
    await page.locator('#note-listen').click();
    await page.waitForFunction(() => document.querySelector('#modal-panel [role="status"]').textContent.includes('174 Hz'));
    await page.keyboard.press('1'); await page.keyboard.press('3'); await page.keyboard.press('2');
    assert.equal(await page.evaluate(() => G.count('shard') - noteBefore.shards), 1);
    const notes = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      check(G.flags[RELIQUARY_FLAG] && G.player.voice === noteBefore.voice, 'solve has no Voice cost');
      check(G.flags.tombs_rung === noteBefore.story, 'note puzzle does not change story locks');
      const count = G.count('shard');
      noteLockInput(0); noteLockInput(2); noteLockInput(1);
      check(G.count('shard') === count, 'repeat notes cannot duplicate reward');
      noteLockInput('leave'); useDeco(G.ents.find(e => e.use === 'note_reliquary'));
      check(document.querySelector('#note-0').disabled, 'solved reliquary reopens empty');
      noteLockInput('leave');
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'panel';
      check(G.flags[RELIQUARY_FLAG] && G.count('shard') === count, 'completion and reward survive reload');
      // Old-save default and real controller polling edges.
      delete saved.flags[RELIQUARY_FLAG]; restoreGame(saved); G.state = 'panel';
      useDeco(G.ents.find(e => e.use === 'note_reliquary'));
      check(NOTELOCK.entered.length === 0 && !G.flags[RELIQUARY_FLAG], 'old saves default to unsolved');
      const originalPads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = index => { gp.buttons[index].pressed = true; controlsTick(); gp.buttons[index].pressed = false; controlsTick(); };
      press(0); check(NOTELOCK.entered.length === 1, 'controller A plays selected note');
      press(14); check(NOTELOCK.selected === 2, 'controller left wraps selection'); press(0);
      press(14); press(0); check(G.flags[RELIQUARY_FLAG], 'controller completes phrase');
      press(1); check(!NOTELOCK && !G.openPanel, 'controller B leaves');
      navigator.getGamepads = originalPads; G.state = 'panel';
      return { phrase: 3, rewardOnce: true, accessibleClue: true };
    });
    console.log('PASS note-lock retries, keyboard/touch/controller, reward and save/load', notes);
    await page.evaluate(() => {
      loadMap('catacombs', { x: 4.5, y: 24.3, dir: Math.PI / 2 }); G.state = 'panel';
      const plate = G.ents.find(e => e.use === 'pressure_plate');
      const m1 = G.ents.find(e => e.mirrorId === 'm1');
      if (!plate || !m1 || G.map.isBlocked(plate.x | 0, plate.y | 0) || G.map.isBlocked(m1.x | 0, m1.y | 0)) {
        throw new Error('catacombs plate and mirrors placed on accessible floor');
      }
      // Leaving a panel briefly resumes passive regeneration. Saturate the
      // fixture resources so frame scheduling cannot change this no-cost check.
      G.player.voice = G.player.voiceMax; G.player.fat = G.player.fatMax;
      window.puzzleBefore = { shards: G.count('shard'), voice: G.player.voice, fat: G.player.fat };
      G.ents.forEach(o => { o._screen = null; });
      interact();
      if (G.openPanel !== 'pressureplate') throw new Error('in-world interaction opens pressure plate panel');
    });
    await page.locator('#plate-toggle').tap();
    assert.equal(await page.evaluate(() => !!G.flags[PLATE_ANCHOR_FLAG] && !!G.flags[PLATE_FLAG]), true);
    assert.equal(await page.evaluate(() => G.count('shard') - puzzleBefore.shards), 1);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      loadMap('catacombs', { x: 14.5, y: 3.6, dir: -Math.PI / 2 }); G.state = 'panel';
      G.ents.forEach(o => { o._screen = null; });
      interact();
      if (G.openPanel !== 'mirror') throw new Error('in-world interaction opens turning mirror panel');
    });
    await page.locator('#mirror-0').tap();
    assert.equal(await page.evaluate(() => getMirrorAngle('m1', 1)), 0);
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    const puzzles = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      const trace = traceCatacombsBeam();
      check(trace.hit && G.flags[MIRROR_FLAG], 'beam reaches eastern lens and unlocks reliquary');
      check(G.count('shard') - puzzleBefore.shards === 2, 'plate and mirror puzzles each grant one shard once');
      check(G.player.voice === puzzleBefore.voice && G.player.fat === puzzleBefore.fat, 'puzzles cost no Voice or Fatigue');
      check(G.map.doors[26 * G.map.w + 10].target === 1 && G.map.doors[1 * G.map.w + 27].target === 1, 'both niche doors open when solved');
      const count = G.count('shard');
      turningMirrorInput('reset');
      check(!traceCatacombsBeam().hit && G.count('shard') === count, 'resetting mirrors updates beam without revoking or duplicating reward');
      turningMirrorInput(0); turningMirrorInput(1); turningMirrorInput(2);
      check(traceCatacombsBeam().hit && G.count('shard') === count, 're-solving mirrors cannot duplicate shard');
      turningMirrorInput('leave');
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(saved); G.state = 'panel';
      check(G.flags[PLATE_FLAG] && G.flags[MIRROR_FLAG] && traceCatacombsBeam().hit && G.count('shard') === count, 'solved plate/mirror states survive save/load');
      // Old-save defaults & controller edges
      delete saved.flags[PLATE_FLAG]; delete saved.flags[PLATE_ANCHOR_FLAG];
      delete saved.flags[MIRROR_FLAG];
      delete saved.flags['mirror:catacombs:m1']; delete saved.flags['mirror:catacombs:m2']; delete saved.flags['mirror:catacombs:m3'];
      restoreGame(saved); G.state = 'panel';
      check(!G.flags[PLATE_FLAG] && !G.flags[MIRROR_FLAG] && !traceCatacombsBeam().hit, 'old saves default to unsolved plate and mirrors');
      // Stepping directly onto the pressure plate in-world triggers it
      Engine.cam.x = 4.5; Engine.cam.y = 25.5; tickCatacombsPuzzles();
      check(G.flags[PLATE_FLAG] && G.map.doors[26 * G.map.w + 10].target === 1, 'stepping onto pressure plate unlatches west niche');
      // Controller polling on mirror panel
      useDeco(G.ents.find(e => e.mirrorId === 'm1'));
      const originalPads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp]; controlsTick();
      const press = index => { gp.buttons[index].pressed = true; controlsTick(); gp.buttons[index].pressed = false; controlsTick(); };
      press(0); check(getMirrorAngle('m1', 1) === 0, 'controller A rotates mirror 1');
      press(15); press(0); check(getMirrorAngle('m2', 1) === 0, 'controller D-right + A rotates mirror 2');
      press(15); press(0); check(G.flags[MIRROR_FLAG] && traceCatacombsBeam().hit, 'controller completes mirror alignment');
      press(1); check(!MIRROR_PUZZLE && !G.openPanel, 'controller B leaves mirror panel');
      navigator.getGamepads = originalPads; G.state = 'panel';
      return { plate: true, mirrors: 3, beamSegments: 4, rewardOnce: true };
    });
    console.log('PASS catacombs pressure plate & turning mirrors (step, ballast, beam, keyboard/touch/controller, save/load)', puzzles);
    const motion = await page.evaluate(() => {
      function check(ok, label) { if (!ok) throw new Error(label); }
      const state = JSON.stringify({ attack: G.attack, hp: G.player.hp, fat: G.player.fat, noise: G.noise });
      const families = new Set();
      for (const w of Object.values(WEAPONS)) {
        const start = animWeaponPose(w, 0, 'slash left');
        const hit = animWeaponPose(w, 0.48, 'slash left');
        const end = animWeaponPose(w, 1, 'slash left');
        check(start.x === 0 && start.y === 0 && end.x === 0 && end.y === 0 && end.rotation === 0 && end.scale === 1, w.name + ' rests at sequence ends');
        check(hit.x !== 0 || hit.y !== 0, w.name + ' has strike pose'); families.add(hit.family);
        for (const f of [-1, 0.2, 0.5, 0.8, 2]) {
          const pose = animWeaponPose(w, f, 'thrust');
          check([pose.x, pose.y, pose.rotation, pose.scale].every(Number.isFinite), w.name + ' finite pose');
        }
      }
      const left = animWeaponPose(WEAPONS.sword, 0.48, 'slash left');
      const right = animWeaponPose(WEAPONS.sword, 0.48, 'slash right');
      check(left.x === -right.x && left.rotation === -right.rotation, 'opposite slashes mirror');
      check(animWeaponPose(WEAPONS.mace, 0.48).family === 'overhead', 'mace overhead');
      check(animWeaponPose(WEAPONS.knife, 0.48).family === 'thrust', 'dagger thrust');
      check(state === JSON.stringify({ attack: G.attack, hp: G.player.hp, fat: G.player.fat, noise: G.noise }), 'choreography cannot mutate combat state');
      const hash = data => { let h = 0; for (const px of data) h = (Math.imul(h, 31) + px) | 0; return h; };
      for (const name of ['campfire', 'hearth']) {
        const source = Engine.sprites[name], before = hash(source.data), poses = new Set();
        for (let i = 0; i < 4; i++) {
          const art = animFireSprite(source, i); poses.add(hash(art.data));
          check(art === animFireSprite(source, i), name + ' cached frame');
          const base = Math.ceil(source.h * 0.68) * source.w;
          check(art.data.slice(base).every((px, j) => px === source.data[base + j]), name + ' fuel bed anchored');
        }
        check(poses.size === 4, name + ' four distinct flame drawings');
        check(before === hash(source.data), name + ' source unchanged');
      }
      const fire = { kind: 'deco', sprite: 'campfire', x: Engine.cam.x + 2, y: Engine.cam.y };
      const oldTime = ANIM.T;
      ANIM.T = 0; const firstFire = animDirectionalSprite(fire).sprite;
      ANIM.T = 1 / 7; const nextFire = animDirectionalSprite(fire).sprite;
      check(firstFire !== nextFire, 'renderer resolver advances fire frame with animation clock');
      ANIM.T = oldTime;
      // Use the real attack entrypoint: visuals do not create extra hits,
      // change its cooldown or bypass the existing attack lock.
      const savedWeapons = G.player.weapons, savedIndex = G.player.weapon;
      const savedFat = G.player.fat, savedAttack = { ...G.attack }, savedSong = G.song.t, savedNoise = G.noise;
      const savedEntities = G.ents;
      G.ents = []; G.player.weapons = ['sword']; G.player.weapon = 0;
      G.attack.t = 0; G.song.t = 0;
      attack('slash right');
      check(G.attack.t === WEAPONS.sword.speed && G.attack.dur === WEAPONS.sword.speed, 'real attack retains catalog cooldown');
      check(G.player.fat === Math.max(0, savedFat - 1), 'real attack charges fatigue once');
      const afterAttack = G.player.fat; attack('slash left');
      check(G.player.fat === afterAttack && G.attack.dirLabel === 'slash right', 'attack lock prevents duplicate input');
      G.ents = savedEntities; G.player.weapons = savedWeapons; G.player.weapon = savedIndex;
      G.player.fat = savedFat; Object.assign(G.attack, savedAttack); G.song.t = savedSong; G.noise = savedNoise;
      // Exercise the actual HUD draw path with every first-person catalog image.
      const player = G.player, originalWeapons = player.weapons, originalIndex = player.weapon;
      const attackState = { ...G.attack }, originalSong = G.song.t, originalFx = G.songFx;
      G.fadeT = 0; G.glassLock = 0; G.song.t = 0; G.songFx = 0;
      const rendered = new Set();
      for (const key of Object.keys(WEAPONS)) {
        player.weapons = [key]; player.weapon = 0;
        for (const progress of [0, 0.24, 0.48, 0.74, 1]) {
          Engine.ctx.clearRect(0, 0, VW, VH);
          Object.assign(G.attack, { dur: WEAPONS[key].speed, t: WEAPONS[key].speed * (1 - progress), dirLabel: 'slash left' });
          drawHUD();
          if (key === 'sword') rendered.add(hash(Engine.ctx.getImageData(0, 0, VW, VIEW_H).data));
        }
      }
      check(rendered.size >= 4, 'real HUD renders distinct sword sequence poses');
      player.weapons = originalWeapons; player.weapon = originalIndex;
      Object.assign(G.attack, attackState); G.song.t = originalSong; G.songFx = originalFx;
      return { weapons: Object.keys(WEAPONS).length, families: [...families], flameFrames: 8 };
    });
    console.log('PASS weapon choreography and cached fire artwork', motion);
    await page.evaluate(() => {
      closeModal(); hide('#title'); G.state = 'panel';
      const c = Engine.ctx; c.fillStyle = '#18141e'; c.fillRect(0, 0, VW, VH);
      for (let v = 0; v < 5; v++) {
        const sp = v === 0 ? Engine.sprites.proctor : animProctorView(v, '');
        const canvas = document.createElement('canvas'); canvas.width = sp.w; canvas.height = sp.h;
        const data = new ImageData(new Uint8ClampedArray(sp.data.buffer), sp.w, sp.h);
        canvas.getContext('2d').putImageData(data, 0, 0);
        c.drawImage(canvas, v * 64, 35, 64, 96);
        c.fillStyle = '#dcc69f'; c.font = '9px serif'; c.fillText(['Front', 'Front-side', 'Side', 'Back-side', 'Back'][v], v * 64 + 4, 150);
      }
    });
    await page.screenshot({ path: '/tmp/octave-directions.png' });
    assert.deepEqual(errors, [], 'no runtime errors');
    console.log('PASS browser runtime; screenshots: /tmp/octave-{inventory,directions}.png');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
