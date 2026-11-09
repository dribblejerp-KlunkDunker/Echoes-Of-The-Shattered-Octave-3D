// PLAYWRIGHT_MODULE=/path/to/playwright node test/law.test.js
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Law Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.evaluate(() => { G.state = 'panel'; window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    const rules = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      window.lawBase = JSON.parse(JSON.stringify(snapshotGame()));
      window.resetLaw = () => { restoreGame(JSON.parse(JSON.stringify(lawBase))); G.state = 'play'; G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {}; };
      check(G.maps.watchhouse && G.maps.oakhaven.get(40, 6).portal.map === 'watchhouse', 'prison has a world entrance');
      for (const id of ['tavern', 'greenhall', 'mill', 'surgery', 'chapel', 'tannery']) {
        const m = G.maps[id]; const e = m.entities.find(o => o.owner === id);
        check(e && !ITEMS[e.item].key && !m.isBlocked(e.x | 0, e.y | 0), 'reachable non-quest stock in ' + id);
      }
      loadMap('tavern');
      const stock = G.ents.find(e => e.owner === 'tavern');
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; });
      pickUp(stock); const staleTheft = document.querySelector('#crime-take').onclick;
      document.querySelector('#crime-leave').click(); staleTheft();
      check(!stock.dead && crimeState().thefts === 0, 'cancelled/stale theft grants nothing');
      pickUp(stock); document.querySelector('#crime-take').click();
      check(stock.dead && crimeState().thefts === 1 && crimeState().bounty === 0, 'unwitnessed interior theft');
      const guard = G.ents.find(e => e.lawGuard); Object.assign(guard, { x: 8.5, y: 8.5, hidden: false, stun: 0 });
      Object.assign(Engine.cam, { x: 8.5, y: 7.5, dir: 0 });
      const extra = G.map.item('tonic', 8.7, 7.5); extra.owner = 'tavern';
      check(theftWitness(extra) === guard, 'live interior guard can witness');
      guard.stun = 2; check(!theftWitness(extra), 'stunned witness cannot report'); guard.stun = 0;
      pickUp(extra); document.querySelector('#crime-take').click();
      check(crimeState().bounty === 20, 'witnessed interior theft adds 20');
      syncWantedPosters(); check(G.maps.oakhaven.entities.filter(e => e.wantedPoster).every(e => e.hidden), 'below threshold notices hidden');
      G.state = 'play'; G.lawGrace = 0; tickLaw(0);
      check(G.openPanel === 'arrest', 'interior guard makes arrest');
      document.querySelector('#crime-flee').click();
      check(crimeState().bounty === 40 && crimeState().resisting === true && G.lawGrace === 2 && !G.openPanel && G.state === 'play', 'refusing arrest is resisting: +20 and a two-second start');
      // resisting: the constable no longer asks; he closes and strikes, on a cooldown
      const hp0 = G.player.hp = G.player.hpMax; tickLaw(0.1);
      check(G.player.hp === hp0 && !G.openPanel, 'no blow inside the head start');
      G.lawGrace = 0; guard.lawCool = 0; tickLaw(0.1);
      check(G.player.hp < hp0 && !G.openPanel && G.state === 'play', 'then a cudgel, not the arrest panel');
      const hp1 = G.player.hp; tickLaw(0.1); check(G.player.hp === hp1, 'one blow per cooldown');
      // fighting back staggers him (and is still an assault on the warrant)
      G.time += 5; assaultCivilian(guard); guard.lawCool = 0;
      check(guard.stun > 0 && crimeState().bounty === 80, 'a blow on the constable staggers him and adds the assault');
      tickLaw(0.1); check(G.player.hp === hp1, 'a staggered constable cannot strike');
      guard.stun = 0;
      // he runs you down faster than a walk
      Object.assign(guard, { x: 8.5, y: 8.5 }); Object.assign(Engine.cam, { x: 8.5, y: 5.5 }); guard.lawCool = 1;
      const d0 = Math.hypot(guard.x - 8.5, guard.y - 5.5); tickLaw(0.25);
      check(d0 - Math.hypot(guard.x - 8.5, guard.y - 5.5) > 0.7, 'he closes at a run (' + (d0 - Math.hypot(guard.x - 8.5, guard.y - 5.5)).toFixed(2) + ')');
      // beaten down: taken alive to the watch-house, never killed
      Object.assign(guard, { x: 8.5, y: 6.5 }); guard.lawCool = 0; G.player.hp = 3; tickLaw(0.1);
      check(!G.dead && G.player.hp >= 1 && crimeState().custody && G.mapId === 'watchhouse' && crimeState().resisting === false, 'beaten down, you wake in the watch-house, not dead');
      resetLaw();
      // Deterministic real weapon targeting: visible civilian, then same target behind a wall.
      const npc = G.ents.find(e => e.id === 'bettany');
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; });
      Object.assign(npc, { x: 23.5, y: 24.5, hidden: false });
      Object.assign(Engine.cam, { x: 23.5, y: 23.5, dir: Math.PI / 2 });
      G.attack.t = G.song.t = 0; G.player.weapons = ['sword']; G.player.weapon = 0;
      const kills = G.player.kills, ledger = G.ledger.length;
      attack('thrust'); check(crimeState().assaults === 1 && crimeState().bounty === 40 && !npc.dead, 'weapon assault nonlethal and reported by victim');
      G.attack.t = 0; attack('thrust'); check(crimeState().bounty === 40, 'held attacks cannot spam offence within cooldown');
      check(G.player.kills === kills && G.ledger.length === ledger && NPCS[npc.id].shop, 'quest/service/kill data unaffected');
      G.time += 5; executeCustomSong({ effects: ['sear'], power: 4, cadence: 'cone', noise: 3, name: 'Law test', hz: '396', freq: 396 });
      check(crimeState().assaults === 2 && crimeState().bounty === 80 && !npc.dead, 'offensive Song uses nonlethal assault rules');
      crimeState().bounty = 40; syncWantedPosters();
      check(G.maps.oakhaven.entities.filter(e => e.wantedPoster).length === 2 && G.maps.oakhaven.entities.filter(e => e.wantedPoster).every(e => !e.hidden), '40 bounty publishes both world notices');
      const state = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(state); G.state = 'play';
      check(crimeState().assaults === 2 && G.ents.filter(e => e.wantedPoster).every(e => !e.hidden), 'offences/notices survive save');
      const victim = G.ents.find(e => e.id === 'bettany'); victim.x = 23.5; victim.y = 25.5;
      G.map.set(23, 24, WALL('t_stone')); G.attack.t = 0; attack('thrust');
      check(crimeState().bounty === 40, 'melee does not assault through walls'); G.map.set(23, 24, null);
      const lawGuard = G.ents.find(e => e.lawGuard); Object.assign(lawGuard, { x: 23.5, y: 27.5, hidden: false });
      tickLaw(0.1); check(lawGuard.investigation?.source === 'crime', 'visible offender leaves last-seen search');
      const seen = { x: lawGuard.investigation.x, y: lawGuard.investigation.y };
      G.map.set(23, 25, WALL('t_stone')); Engine.cam.x = 22.5;
      tickLaw(0.1); check(lawGuard.investigation.x === seen.x && lawGuard.investigation.y === seen.y, 'search cannot track offender through occlusion');
      G.map.set(23, 25, null);
      G.player.gold = 100; renderArrest(); const stalePay = document.querySelector('#crime-pay').onclick;
      document.querySelector('#crime-flee').click(); stalePay(); check(crimeState().bounty === 60 && G.player.gold === 100, 'stale fine callback inert (running added resisting)');
      renderArrest(); stalePay(); check(crimeState().bounty === 60, 'previous arrest callback cannot act on a newer panel');
      document.querySelector('#crime-pay').click();
      check(crimeState().bounty === 0 && G.player.gold === 40 && !crimeState().resisting && G.ents.filter(e => e.wantedPoster).every(e => e.hidden), 'exact payment withdraws notices immediately (and ends the resisting)');
      resetLaw(); loadMap('clearing'); assaultCivilian(G.ents.find(e => e.id === 'kaelen')); check(crimeState().bounty === 0, 'no Oakhaven jurisdiction outside town');
      resetLaw(); G.flags.greening = true; assaultCivilian(G.ents.find(e => e.id === 'bettany')); check(crimeState().bounty === 0, 'story crisis has no law arrests');
      resetLaw();
      window.gearFixture = () => {
        G.player.inv = [{ id: 'coil', n: 1 }, { id: 'pass', n: 1 }, { id: 'tonic', n: 3 }, { id: 'a_synodrobe', n: 1 }];
        G.player.weapons = ['sword', 'pistol', 'glass', 'tobin_blade']; G.player.weapon = 1;
        G.player.armor = { body: 'a_synodrobe' }; G.player.pellets = 7; G.player.bolts = 6; G.player.tknives = 4;
        G.player.gold = 100; crimeState().bounty = 40;
      };
      // A world warrant is interactable, not merely a direct-rendered panel.
      crimeState().bounty = 40; syncWantedPosters();
      Object.assign(Engine.cam, { x: 25.5, y: 20.6, dir: -Math.PI / 2 }); render(); interact();
      check(G.openPanel === 'wanted' && document.querySelector('.wanted-sheet').textContent.includes('40 sovereigns'), 'in-world sign opens current warrant: ' + JSON.stringify({ panel: G.openPanel, picked: Engine.pick(G.ents, USE_RANGE), nearby: G.ents.filter(e => !e.hidden && !e.dead && dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) < 4).map(e => ({ kind: e.kind, id: e.id, use: e.use, x: e.x, y: e.y })) }));
      document.querySelector('#law-leave').click();
      // The existing facade portal enters the new map without a test teleport.
      Object.assign(Engine.cam, { x: 39.1, y: 6.5, dir: 0 }); render(); interact();
      check(G.mapId === 'watchhouse' && !crimeState().custody, 'public watch-house entrance works');
      Object.assign(Engine.cam, { x: 11.1, y: 4.5, dir: 0 }); render(); interact();
      check(G.mapId === 'oakhaven' && crimeState().escapes === 0 && crimeState().bounty === 40, 'visitors can leave without an escape offence');
      // Authored prison has a continuous clear path once the mechanical door opens.
      const gaol = G.maps.watchhouse, reached = new Set(['3,4']), queue = [[3, 4]];
      for (let i = 0; i < queue.length; i++) {
        const [x, y] = queue[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, key = nx + ',' + ny, cell = gaol.get(nx, ny);
          if (nx < 1 || ny < 1 || nx >= gaol.w - 1 || ny >= gaol.h - 1 || reached.has(key) || (cell && !cell.door)) continue;
          reached.add(key); queue.push([nx, ny]);
        }
      }
      check(reached.has('8,3') && reached.has('11,4'), 'cell, evidence and street exit share a walkable route');
      gearFixture(); enterPrison();
      const blockedX = 4.7; Object.assign(Engine.cam, { x: blockedX, y: 4.5 });
      playerMove(Engine.cam, 0.15, 0); check(Engine.cam.x < 4.77, 'closed cell blocks player collision');
      check(G.mapId === 'watchhouse' && G.state === 'play' && crimeState().custody.remaining === 6, 'playable custody entered');
      check(G.has('coil') && G.has('pass') && !G.has('tonic') && G.player.weapons.includes('glass') && G.player.weapons.includes('tobin_blade') && !G.player.weapons.includes('sword'), 'quest and innate gear safe, ordinary gear confiscated');
      check(!G.player.armor.body && G.player.pellets === 0 && crimeState().evidence.pellets === 7, 'equipped armor and ammo escrow');
      check(travelBlocked().includes('watch-house'), 'world travel cannot bypass prison');
      const door = G.map.get(5, 4); check(door.lockDifficulty === 2 && !door.locked && !G.flags[PRISON_CELL_KEY], 'cell uses real mechanical lock not story flag');
      passHours(2); check(Math.abs(crimeState().custody.remaining - 4) < 1e-8, 'time served reduces remaining');
      const code = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(code); G.state = 'play';
      check(crimeState().custody.remaining === 4 && crimeState().evidence.inv.length === 2 && !G.has('tonic'), 'mid-sentence custody and confiscation survive save');
      renderRest(); check(G.openPanel === 'prison', 'rest exposes sentence actions');
      return { crime: true, posters: 2, savedCustody: true };
    });
    console.log('PASS expanded law, world posters, jurisdiction, custody and evidence', rules);
    const roundtrip = await page.evaluate(async () => {
      const encoded = await encodeSave(snapshotGame());
      const restored = await decodeSave(encoded); restoreGame(restored); G.state = 'play';
      if (crimeState().custody.remaining !== 4 || crimeState().evidence.inv.find(s => s.id === 'tonic').n !== 3) throw new Error('actual save code roundtrip lost custody/evidence');
      renderPrison(); return encoded.startsWith('OCT');
    });
    assert(roundtrip); console.log('PASS encoded save-code roundtrip in custody');
    // Real keyboard interaction with prison actions, then duplicate event callback.
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => G.mapId === 'watchhouse' && !G.openPanel), true);
    await page.evaluate(() => { renderPrison(); window.oldServe = document.querySelector('#prison-serve').onclick; });
    await page.keyboard.press('Enter');
    const served = await page.evaluate(() => {
      oldServe();
      if (G.mapId !== 'oakhaven' || crimeState().bounty !== 0 || crimeState().jailHours !== 6 || crimeState().evidence || crimeState().custody) throw new Error('sentence/repeated callback failed');
      if (G.count('tonic') !== 3 || G.player.armor.body !== 'a_synodrobe' || G.player.pellets !== 7 || G.player.bolts !== 6 || G.player.tknives !== 4 || G.player.weapons[G.player.weapon] !== 'pistol') throw new Error('gear must return exactly and re-equip');
      return true;
    });
    assert(served); console.log('PASS keyboard sentence completion and exact gear return');
    const escape = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      resetLaw(); gearFixture(); enterPrison();
      // Use actual cell-wall picking/lock UI, not a test-only exit action.
      Object.assign(Engine.cam, { x: 4.1, y: 4.5, dir: 0 }); render(); interact();
      check(G.openPanel === 'lockpick' && LOCKPICK.key === PRISON_CELL_KEY, 'facing cell door starts lockpicking');
      lockpickInput('cancel'); check(!G.flags[PRISON_CELL_KEY] && G.map.doors[61].target === 0, 'cancel cannot open cell');
      render(); interact();
      for (let pin = 0; pin < 3; pin++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      check(G.flags[PRISON_CELL_KEY] && G.map.doors[61].target === 1, 'three pins unlock cell');
      // Actual movement through the opened cell into the evidence office.
      G.map.doors[61].open = 1;
      for (let i = 0; i < 40; i++) playerMove(Engine.cam, 0.1, 0);
      check(Engine.cam.x > 7, 'player can walk through picked cell');
      Object.assign(Engine.cam, { x: 8.5, y: 4.5, dir: -Math.PI / 2 }); render(); interact();
      check(G.openPanel === 'lockpick' && LOCKPICK.key === EVIDENCE_KEY, 'world evidence chest has lock UI');
      for (let pin = 0; pin < 3; pin++) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); }
      check(!crimeState().evidence && G.count('tonic') === 3, 'evidence recovery once');
      useDeco(G.ents.find(e => e.use === 'prison_evidence')); check(G.count('tonic') === 3, 'empty evidence cannot duplicate');
      const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'play';
      check(G.flags[PRISON_CELL_KEY] && !crimeState().evidence && G.count('tonic') === 3, 'picked cell and recovered evidence save');
      Object.assign(Engine.cam, { x: 11.1, y: 4.5, dir: 0 }); render(); interact();
      check(G.mapId === 'oakhaven' && !crimeState().custody && crimeState().bounty === 100 && crimeState().escapes === 1 && G.lawGrace === 5, 'street door escapes with one extra bounty');
      check(crimeState().jailHours === 0, 'escape is not time served');
      // Escape without recovery, then re-arrest: old and new evidence must survive.
      resetLaw(); gearFixture(); enterPrison(); leaveWatchhouse();
      const oldTonic = crimeState().evidence.inv.find(s => s.id === 'tonic').n;
      G.give('honey', 2); enterPrison();
      check(crimeState().evidence.inv.some(s => s.id === 'tonic' && s.n === oldTonic) && crimeState().evidence.inv.some(s => s.id === 'honey' && s.n === 2), 're-arrest merges unrecovered property');
      check(!G.flags[PRISON_CELL_KEY] && !G.flags[EVIDENCE_KEY], 'new sentence relocks escape route');
      const clock = G.day * 24 + G.tod * 24; renderPrison(); document.querySelector('#prison-pay').click();
      check(G.mapId === 'oakhaven' && G.player.gold === 0 && crimeState().bounty === 0 && G.count('tonic') === 3 && G.count('honey') === 2, 'pay prison fine returns merged evidence exactly');
      check(Math.abs(G.day * 24 + G.tod * 24 - clock) < 1e-6 && crimeState().jailHours === 0, 'payment does not claim served time');
      resetLaw(); const old = JSON.parse(JSON.stringify(snapshotGame())); delete old.player.crime; delete old.maps.watchhouse;
      // Emulate an older save by dropping everything the town appends after its historical recess.
      const liveOh = G.maps.oakhaven, recessIdx = liveOh.entities.findIndex(e => e.bodyCover);
      // transient scenery and grass are never saved, so only count saved entities
      const appendedTown = liveOh.entities.filter(e => !e.transient).length - 1 - recessIdx;
      old.maps.oakhaven.ents = old.maps.oakhaven.ents.slice(0, -appendedTown);
      for (const id of ['tavern', 'greenhall', 'mill', 'surgery', 'chapel', 'tannery']) old.maps[id].ents = old.maps[id].ents.slice(0, ['tavern', 'greenhall', 'mill'].includes(id) ? -2 : -1);
      const historicalRecess = old.maps.oakhaven.ents.length - 1;
      old.maps.oakhaven.ents[historicalRecess].name = 'Historical recess marker';
      restoreGame(old); check(!crimeState().custody && !crimeState().evidence && G.maps.watchhouse, 'old saves gain prison with no phantom custody');
      check(G.ents[historicalRecess].bodyCover && G.ents[historicalRecess].name === 'Historical recess marker' && G.ents.filter(e => e.wantedPoster).length === 2, 'historical map indexes retained while new world entities append');
      resetLaw(); gearFixture(); enterPrison();
      const timeBefore = G.day * 24 + G.tod * 24;
      crimeState().custody.remaining = 0.01; update(0.9);
      check(G.mapId === 'oakhaven' && !crimeState().custody && crimeState().jailHours === 6 && Math.abs(G.day * 24 + G.tod * 24 - timeBefore - 0.01) < 1e-8, 'natural simulation time releases without losing clock progress');
      resetLaw(); G.player.weapons = ['glass']; G.player.weapon = 0; crimeState().bounty = 40; enterPrison();
      renderPrison(); document.querySelector('#prison-serve').click();
      check(G.player.weapons.join() === 'glass', 'innate-only weapon loadout unchanged by release');
      resetLaw(); G.player.weapons = ['hands', 'sword']; G.player.weapon = 0; crimeState().bounty = 40; enterPrison();
      renderPrison(); document.querySelector('#prison-serve').click();
      check(G.player.weapons.includes('hands') && G.player.weapons[G.player.weapon] === 'hands', 'explicitly selected bare hands restored with ordinary weapons');
      resetLaw(); gearFixture(); enterPrison(); G.player.gold = 0; renderPrison();
      return { escape: true, evidence: true, oldSaves: true };
    });
    console.log('PASS cell lock, walkable escape, evidence lock/recovery, re-arrest, payment and old saves', escape);

    const social = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      const roll = Math.random;
      try {
        resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0; renderArrest();
        const pers = Math.round(G.player.attrs.Personality), str = Math.round(G.player.attrs.Strength);
        const bribe = bribeTerms(), threat = threatTerms();
        check(document.querySelector('#crime-bribe') && !document.querySelector('#crime-bribe').disabled, 'funded bribe is offered');
        check(bribe.cost === 24 && bribe.chance === socialOdds(pers, 40) && bribe.chance >= 10 && bribe.chance <= 90, 'bribe cost is 60% of the fine and odds follow Personality');
        check(threat.chance === socialOdds(str, 40, -5) && threat.grace === 12, 'threat odds follow Strength and offer 12 seconds');
        // Deterministic acceptance: the purse is paid, the warrant is dropped, notices come down.
        Math.random = () => 0;
        document.querySelector('#crime-bribe').click();
        check(crimeState().bounty === 0 && G.player.gold === 76 && !G.openPanel && G.state === 'play' && G.lawGrace === 5, 'accepted bribe clears the warrant at a discount');
        check(G.ents.filter(e => e.wantedPoster).every(e => e.hidden), 'accepted bribe withdraws wanted notices');
        // Deterministic refusal: no coin leaves the purse and the registry grows.
        resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0;
        Math.random = () => 0.999;
        renderArrest(); document.querySelector('#crime-bribe').click();
        check(crimeState().bounty === 55 && G.player.gold === 100 && G.openPanel === 'arrest', 'refused bribe takes nothing and adds 15');
        check(/Coin for a watchman/.test(document.querySelector('#arrest-note').textContent), 'refusal line is readable');
        check(document.querySelector('#crime-pay').textContent && document.querySelector('#crime-jail'), 'fine and prison remain available after a refusal');
        G.player.gold = 0; renderArrest();
        check(document.querySelector('#crime-bribe').disabled, 'empty purse disables the bribe');
        document.querySelector('#crime-threat').click();
        check(crimeState().bounty === 75 && G.lawGrace === 0 && G.openPanel === 'arrest', 'refused threat adds 20 and buys no grace');
        // Deterministic success: the warrant stands, but the constable steps back.
        resetLaw(); gearFixture(); crimeState().bounty = 40; G.lawGrace = 0; Math.random = () => 0;
        renderArrest(); document.querySelector('#crime-threat').click();
        check(crimeState().bounty === 40 && G.lawGrace === 12 && !G.openPanel && G.state === 'play', 'successful threat keeps the warrant and buys 12 seconds');
        check(!G.ents.some(e => e.lawGuard && e.investigation), 'threatened constable resets to idle');
        // Stale callbacks from an older panel must not spend coin or clear a newer warrant.
        renderArrest();
        const staleBribe = document.querySelector('#crime-bribe').onclick, staleThreat = document.querySelector('#crime-threat').onclick;
        document.querySelector('#crime-flee').click(); staleBribe(); staleThreat();
        check(crimeState().bounty === 40 && G.player.gold === 100 && !G.openPanel, 'stale social callbacks are inert');
        // The bribe result is ordinary saved state.
        resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; Math.random = () => 0;
        renderArrest(); document.querySelector('#crime-bribe').click(); Math.random = roll;
        const saved = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(saved); G.state = 'play';
        check(crimeState().bounty === 0 && G.player.gold === 76 && G.ents.filter(e => e.wantedPoster).every(e => e.hidden), 'bribe result survives save/load');
        // Hand the original prison-panel assertions their fixture back.
        resetLaw(); gearFixture(); enterPrison(); G.player.gold = 0; renderPrison();
        return { pers, str, cost: bribe.cost, bribeChance: bribe.chance, threatChance: threat.chance };
      } finally { Math.random = roll; }
    });
    console.log('PASS watch bribes and threats: cost, odds, refusals, stale callbacks and saves', social);
    assert.equal(await page.locator('#prison-pay').isDisabled(), true);
    // Touch buttons use the same checked callbacks as keyboard and controller.
    await page.locator('#law-leave').tap();
    assert.equal(await page.evaluate(() => G.state === 'play' && G.mapId === 'watchhouse'), true);
    await page.evaluate(() => { renderPrison(); render(); });
    await page.screenshot({ path: '/tmp/octave-prison-panel.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    assert.equal(await page.locator('#modal-panel button').evaluateAll(bs => bs.every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })), true);
    await page.screenshot({ path: '/tmp/octave-prison-small.png' });
    await page.locator('#prison-serve').tap();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { resetLaw(); gearFixture(); reportCrime('test warrant', 20); renderWantedPoster(); render(); });
    assert((await page.locator('.wanted-sheet').innerText()).includes('60 sovereigns'));
    await page.screenshot({ path: '/tmp/octave-wanted-poster.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    assert.equal(await page.locator('#law-leave').evaluate(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      resetLaw(); gearFixture(); enterPrison(); renderPrison();
      const pads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp];
      const press = i => { gp.buttons.forEach(b => { b.pressed = false; }); controlsTick(); gp.buttons[i].pressed = true; controlsTick(); };
      try {
        press(1); if (G.openPanel || G.mapId !== 'watchhouse') throw new Error('controller B leaves panel, not custody');
        renderPrison(); press(2); if (G.mapId !== 'oakhaven' || crimeState().bounty || G.player.gold !== 60) throw new Error('controller X pays exact fine');
        crimeState().bounty = 40; renderArrest(); press(2); if (G.mapId !== 'watchhouse') throw new Error('controller X enters custody');
        renderPrison(); press(0); if (G.mapId !== 'oakhaven' || crimeState().jailHours !== 6) throw new Error('controller A serves sentence');
      } finally { navigator.getGamepads = pads; controlsTick(); }
    });
    console.log('PASS keyboard, touch, simulated controller and compact prison layout');
    // Keyboard 3/4, touch buttons and simulated controller Y/Back reach the same checked callbacks.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => {
      resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0;
      window.__socialRoll = Math.random; Math.random = () => 0; renderArrest(); render();
    });
    await page.screenshot({ path: '/tmp/octave-arrest-social.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    assert.equal(await page.locator('#crime-bribe').evaluate(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }), true);
    await page.keyboard.press('3');
    assert.equal(await page.evaluate(() => crimeState().bounty === 0 && G.player.gold === 76 && !G.openPanel), true);
    await page.evaluate(() => { resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0; renderArrest(); });
    await page.keyboard.press('4');
    assert.equal(await page.evaluate(() => crimeState().bounty === 40 && G.lawGrace === 12 && !G.openPanel), true);
    await page.evaluate(() => { resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0; renderArrest(); });
    await page.locator('#crime-threat').tap();
    assert.equal(await page.evaluate(() => G.lawGrace === 12 && !G.openPanel), true);
    await page.evaluate(() => {
      resetLaw(); gearFixture(); crimeState().bounty = 40; G.player.gold = 100; G.lawGrace = 0; renderArrest();
      const pads = navigator.getGamepads;
      const gp = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [gp];
      const press = i => { gp.buttons.forEach(b => { b.pressed = false; }); controlsTick(); gp.buttons[i].pressed = true; controlsTick(); };
      try {
        press(3); if (crimeState().bounty !== 0 || G.player.gold !== 76 || G.openPanel) throw new Error('controller Y does not bribe');
        resetLaw(); gearFixture(); crimeState().bounty = 40; G.lawGrace = 0; renderArrest();
        press(8); if (G.lawGrace !== 12 || G.openPanel) throw new Error('controller Back does not threaten');
      } finally { navigator.getGamepads = pads; Math.random = window.__socialRoll; controlsTick(); }
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS watch social keyboard, touch and simulated controller inputs');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
