// Integrated Phase 1: actual game, map, UI handlers and save functions in a minimal DOM host.
// Run: node test/phase1-integration.test.js. No server, screenshots or player storage.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
const ctx = new Proxy({ canvas: { width: 320, height: 200 } }, {
  get: (t, k) => k === 'createImageData' || k === 'getImageData'
    ? (...a) => { const w = a.length === 2 ? a[0] : a[2], h = a.length === 2 ? a[1] : a[3]; return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
    : k === 'measureText' ? () => ({ width: 10 }) : k in t ? t[k] : () => {},
  set: (t, k, v) => { t[k] = v; return true; }
});
function element() {
  return { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, children: [], innerHTML: '', textContent: '', value: '', width: 320, height: 200,
    parentNode: { children: [], insertBefore() {} },
    get firstChild() { return this.children[0]; },
    appendChild(e) { this.children.push(e); return e; },
    removeChild(e) { const i = this.children.indexOf(e); if (i >= 0) this.children.splice(i, 1); },
    insertBefore(e) { this.children.push(e); return e; }, remove() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null, focus() {}, querySelector: () => element(), querySelectorAll: () => [],
    getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 200 }) };
}
const select = s => { if (!elements.has(s)) elements.set(s, element()); return elements.get(s); };
const storageWrites = [];
const sandbox = {
  console, performance, TextEncoder, TextDecoder, Uint8Array, Uint8ClampedArray, Uint32Array, Float32Array,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
  navigator: { getGamepads: () => [], userAgent: 'test', maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  Image: class { constructor() { this.width = this.height = 64; } },
  document: { querySelector: select, getElementById: id => select('#' + id), querySelectorAll: () => [], createElement: element,
    addEventListener() {}, removeEventListener() {}, body: element(), head: element(), documentElement: element() },
  localStorage: { getItem: () => null, setItem: (k, v) => storageWrites.push(k), removeItem: k => storageWrites.push(k) },
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary')
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const order = ['assets', 'data', 'maps', 'engine', 'audio', 'grove', 'coda', 'wilds', 'game', 'party', 'anim', 'travel', 'upgrades', 'weather'];
for (const file of order) vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), sandbox, { filename: file });
vm.runInContext(fs.readFileSync(path.join(root, 'js/phase1-native.js'), 'utf8'), sandbox, { filename: 'phase1-native.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'phase1_stealth_law_gameplay.js'), 'utf8'), sandbox, { filename: 'phase1.js' });
vm.runInContext(`globalThis.T = { G, CLASSES, NPCS, ITEMS, Engine, PHASE1_NATIVE, HARDCORE, UPG, TRAVEL, HORSE,
 buildAllMaps, loadMap, snapshotGame, restoreGame, pickUp, useDeco, useItem, openDisguise, tickDisguise, enemyUpdate,
 exposeDisguise, wearingDisguise, disguiseProtects, throwDistraction, openBody, tickBodies, tickLaw,
 crimeState, syncWantedPosters, renderArrest, renderPrison, lockpickInput, lock: () => LOCKPICK,
 transfer, horseClock, horseActive, openStable, travelMinutes, travelGo, passHours, fatCap, doRest, Weather,
 renderMenu, setHardcoreRun, renderSave, renderLoad, encodeSave, decodeSave, die, closeModal };`, sandbox);
const T = sandbox.T, G = T.G, cam = T.Engine.cam;
const D = sandbox.OctaveDisguise, C = sandbox.OctaveCrimePrison, S = sandbox.OctaveBribesThreats, H = sandbox.OctaveTravelSurvivalHardcore;
assert.equal(D, T.PHASE1_NATIVE.disguise);
assert.equal(C, T.PHASE1_NATIVE.crime);
assert.equal(S, T.PHASE1_NATIVE.social);
assert.equal(H, T.PHASE1_NATIVE.travel);
assert.equal(sandbox.G, undefined, 'lexical game state is not aliased or replaced');
assert.equal(D.DISGUISE_ITEM_ID, 'a_synodrobe');
const click = id => { const button = select(id); assert.equal(typeof button.onclick, 'function', id); button.onclick(); };
const roll = value => vm.runInContext('Math.random = () => ' + value, sandbox);
function reset(map = 'oakhaven', x = 23.5, y = 5.5) {
  G.player = { name: 'Integrated', cls: T.CLASSES[0], hp: 40, hpMax: 40, voice: 20, voiceMax: 20, fat: 100, fatMax: 100,
    inv: [], weapons: ['sword', 'glass'], weapon: 0, armor: {}, attrs: { Personality: 70, Strength: 70, Endurance: 60, Willpower: 50 },
    skills: { Lore: 15, Lockpicking: 60 }, songs: ['murmur'], gold: 200, level: 1, xp: 0, kills: 0, pellets: 3, bolts: 2,
    horseUntil: 0, needs: false, hunger: 100, sleep: 100, hardcore: false };
  G.flags = {}; G.journal = []; G.ledger = []; G.maps = T.buildAllMaps(); G.map = null;
  G.dead = false; G.day = 0; G.tod = 0.5; G.time = 10; G.noise = 2; G.lawGrace = 0; G.coverSuspicion = 0;
  G.escapeTimer = 0; G.boreHold = 0; G.throwReady = 0; G.dragBody = null; T.HARDCORE.save = null;
  T.closeModal(); T.loadMap(map, { x, y, dir: 0 }); T.Weather.hold('clear'); G.state = 'play'; roll(0);
}
function inspector(x, y, type = 'proctor') {
  return vm.runInContext(`hydrate({ kind: 'enemy', type: '${type}', x: ${x}, y: ${y} })`, sandbox);
}
function lockOpen() {
  const l = T.lock(); assert(l);
  for (const center of l.centers) { l.position = center; T.lockpickInput('lift'); }
}
function noLegacyState() {
  for (const key of ['inventory', 'equipment', 'bounty', 'inPrison', 'confiscatedInventory', 'sleepDeprivation', 'horseRentedUntilHour', 'hardcoreMode']) assert(!Object.hasOwn(G.player, key), key + ' must not become a second store');
  for (const key of ['currentMap', 'entities', 'worldHours']) assert(!Object.hasOwn(G, key), key + ' must not become a second store');
}

reset();
G.give('a_synodrobe'); G.player.armor.body = 'a_synodrobe';
const proctor = inspector(10, 6);
T.loadMap('tavern', { x: 8.5, y: 6, dir: 0 }); G.ents.push(proctor);
assert.equal(D.isWearingSynodRobe(G), true);
assert.equal(D.shouldSuppressEnemySightAggro(G, proctor), true);
T.enemyUpdate(proctor, 0.1); assert.equal(proctor.state, 'idle', 'native enemy sight reaches Phase 1');
T.tickDisguise(3.1); assert.equal(D.getTransientState().compromised, true); assert.equal(proctor.state, 'chase');
const exposed = T.snapshotGame(); T.restoreGame(exposed); assert.equal(D.getTransientState().compromised, true);
assert.equal(D.shouldSuppressEnemySightAggro(G, inspector(10, 6, 'hound')), false);
assert.equal(D.appendDisguisePickupsForMap(G, 'quarry'), 0);
noLegacyState(); console.log('PASS native robe, sight suppression, inspection, persistent exposure, monster exclusion');

reset('tavern', 8.5, 6);
const listener = inspector(12.5, 6); G.ents.push(listener); G.give('pebble'); G.give('bottle');
assert.equal(T.throwDistraction('pebble'), true); assert.equal(G.count('pebble'), 0); assert.equal(G.count('bottle'), 1);
assert.equal(listener.state, 'investigate');
assert.equal(T.throwDistraction('bottle'), false, 'story Vox-Bottle is not a distraction');
T.loadMap('tavern', { x: 8.5, y: 6, dir: 0 }); assert.equal(listener.investigation, undefined);
const body = { kind: 'deco', sprite: 'proctor', corpse: true, transient: true, x: 9.5, y: 6, solid: false };
const cover = { kind: 'deco', sprite: 'crates', bodyCover: true, x: 9.5, y: 6.5, solid: false };
G.ents.push(body, cover); T.openBody(); click('#body-drag'); assert.equal(G.dragBody, body);
T.openBody(); click('#body-hide'); assert.equal(body.hidden, true); assert.equal(body.stashedIn, cover);
T.tickBodies(0.25); assert(!body.bodyFound); noLegacyState();
console.log('PASS distraction/investigation and body concealment remain native and independent of story loot');

reset();
const owned = G.ents.find(e => e.owner && e.kind === 'item'); assert(owned);
cam.x = owned.x - 0.5; cam.y = owned.y;
const watch = { kind: 'npc', id: 'townsman', lawGuard: true, x: cam.x - 0.5, y: cam.y, solid: false, facing: 0 };
G.ents.push(watch);
assert.equal(C.stealOwnedGood(G, owned).pending, true);
const staleTake = select('#crime-take').onclick; staleTake(); staleTake();
assert.equal(T.crimeState().thefts, 1); assert.equal(T.crimeState().bounty, 20); assert.equal(G.count(owned.item), 1);
assert.equal(C.recordTownAssault(G, watch).ok, true); assert.equal(C.recordTownAssault(G, watch).ok, false);
assert.equal(T.crimeState().bounty, 60); assert.equal(C.isWantedPosterThresholdMet(G), true);
assert(G.ents.some(e => e.wantedPoster && !e.hidden));
const count = G.ents.length; C.appendOakhavenCrimeEntities(G); C.appendOakhavenCrimeEntities(G); assert.equal(G.ents.length, count);
assert.equal(S.getBribeQuote(G, { boss: true }), null);
assert.equal(S.attemptDialogueBribe(G, { lawGuard: true }).ok, false);
const gold = G.player.gold, quote = S.getBribeQuote(G, watch);
assert.equal(S.attemptDialogueBribe(G, watch).succeeded, true);
assert.equal(G.player.gold, gold - quote.cost); assert.equal(T.crimeState().bounty, 0);
assert.equal(S.attemptDialogueBribe(G, watch).ok, false);
T.crimeState().bounty = 40; roll(0.999);
const beforeFail = G.player.gold; assert.equal(S.attemptDialogueBribe(G, watch).succeeded, false);
assert.equal(G.player.gold, beforeFail); assert.equal(T.crimeState().bounty, 55);
roll(0); assert.equal(S.attemptDialogueThreat(G, watch).succeeded, true); assert.equal(G.lawGrace, 12); assert.equal(T.crimeState().bounty, 55);
roll(0.999); assert.equal(S.attemptDialogueThreat(G, watch).succeeded, false); assert.equal(T.crimeState().bounty, 75);
T.crimeState().bounty = 9999; assert.equal(S.attemptDialogueThreat(G, watch).succeeded, false, 'failure remains failure at the bounty cap even during grace');
noLegacyState(); console.log('PASS witnessed theft, stale callback, assault cooldown, posters, bribe/threat success and failure');

reset(); T.crimeState().bounty = 40; G.give('coil'); G.give('tonic', 2);
assert.equal(C.enterPlayablePrison(G).ok, true); assert.equal(G.mapId, 'watchhouse');
assert.equal(G.has('coil'), true); assert.equal(G.has('tonic'), false); assert.equal(T.crimeState().evidence.inv.length, 1);
const prison = T.snapshotGame(); T.restoreGame(prison);
assert.equal(T.crimeState().custody.remaining, 6); assert.equal(C.attemptPrisonEscape(G, 'grate', true).ok, false);
assert.equal(C.attemptPrisonEscape(G, 'lockpick', false).pending, true); lockOpen();
assert.equal(G.map.doors[4 * G.map.w + 5].target, 1);
assert.equal(C.attemptPrisonEscape(G, 'lockpick', true).ok, false, 'evidence still requires its own lock');
cam.x = 8; cam.y = 3.5;
T.useDeco(G.ents.find(e => e.use === 'prison_evidence')); lockOpen(); assert.equal(G.count('tonic'), 2);
T.transfer({ map: 'oakhaven' }); assert.equal(G.mapId, 'oakhaven'); assert.equal(T.crimeState().bounty, 100); assert.equal(T.crimeState().escapes, 1);
assert.equal(C.enterPlayablePrison(G).ok, true); assert.equal(C.servePrisonSentence(G).ok, true);
assert.equal(G.mapId, 'oakhaven'); assert.equal(T.crimeState().bounty, 0); assert.equal(T.crimeState().jailHours, 6);
assert.equal(G.count('tonic'), 2); assert.equal(G.count('coil'), 1); noLegacyState();
console.log('PASS playable prison, save/load custody, real cell/evidence puzzles, escape +60, re-arrest, six-hour release');

reset();
const beforeOff = T.horseClock(); H.advanceJourneyNeeds(G, 2);
assert.equal(G.player.hunger, 100); assert.equal(G.player.sleep, 100); assert.equal(T.horseClock(), beforeOff + 2);
assert.equal(H.advanceJourneyNeeds(G, NaN).ok, false); assert.equal(H.advanceJourneyNeeds(G, -1).ok, false);
assert.equal(T.horseClock(), beforeOff + 2, 'invalid durations cannot change the native clock');
const stable = G.ents.find(e => e.use === 'stable'); assert(stable); cam.x = stable.x; cam.y = stable.y + 0.7;
assert.equal(H.HORSE_RENTAL_HOURS, 24); assert.equal(H.rentOakhavenHorse(G).ok, true); assert.equal(G.player.gold, 175);
assert.equal(H.rentOakhavenHorse(G).ok, false);
T.TRAVEL.region = 'reach'; T.TRAVEL.pace = 'reckless'; T.TRAVEL.here = [0.2, 0.2];
const destination = { name: 'The gate square', map: 'oakhaven', x: 23.5, y: 5.5, dir: 0, fx: 0.4, fy: 0.6, state: 'ok' };
const mounted = T.travelMinutes(destination), hire = G.player.horseUntil; G.player.horseUntil = 0;
const onFoot = T.travelMinutes(destination); assert(mounted < onFoot); G.player.horseUntil = hire;
G.player.needs = true; const clock = T.horseClock(), minutes = T.travelMinutes(destination); roll(0.999);
T.travelGo(destination); assert(Math.abs(T.horseClock() - clock - minutes / 60) < 1e-6);
assert.equal(G.player.fat, 92); assert(Math.abs(G.player.hunger - (100 - minutes / 60)) < 1e-6);
G.player.horseUntil = 0; G.player.hunger = G.player.sleep = 100;
H.advanceJourneyNeeds(G, 10); assert.equal(G.player.hunger, 80); assert.equal(G.player.sleep, 86);
G.player.hunger = 10; G.give('honey'); assert.equal(H.consumeRationOrMeal(G, 'honey').ok, true); assert.equal(G.player.hunger, 45); assert.equal(G.has('honey'), false);
assert.equal(H.consumeRationOrMeal(G, 50).ok, false, 'no free meals from a numeric legacy argument');
G.player.hunger = 0; assert.equal(T.fatCap(), 50); G.player.hunger = 80;
G.player.sleep = 20; G.state = 'play'; H.restAndRecoverNeeds(G); assert.equal(G.openPanel, 'rest'); T.doRest('lamp'); assert.equal(G.player.sleep, 100);
const needsSave = T.snapshotGame(); T.restoreGame(needsSave); assert.equal(G.player.needs, true);
const hostile = JSON.parse(JSON.stringify(needsSave)); hostile.player.horseUntil = 1e9; hostile.player.needs = 'yes'; hostile.player.hunger = 1e9; hostile.player.sleep = -5;
T.restoreGame(hostile); assert.equal(G.player.horseUntil, T.horseClock() + 48); assert.equal(G.player.needs, false); assert.equal(G.player.hunger, 100); assert.equal(G.player.sleep, 0);
const old = JSON.parse(JSON.stringify(needsSave)); for (const key of ['horseUntil', 'needs', 'hunger', 'sleep']) delete old.player[key];
T.restoreGame(old); assert.equal(G.player.horseUntil, 0); assert.equal(G.player.needs, false); assert.equal(G.player.hunger, 100); assert.equal(G.player.sleep, 100);
noLegacyState();
console.log('PASS stable hire, native travel time/fatigue, one clock advance, optional needs, consumed meal, rest and saves');

(async () => {
  reset(); const normal = T.snapshotGame();
  assert.equal(H.saveIsolatedHardcoreState(G).ok, false);
  T.setHardcoreRun(); assert.equal(G.player.hardcore, true);
  assert.equal(H.saveIsolatedHardcoreState(G).ok, true); const first = H.loadIsolatedHardcoreState(); assert(first.maps && first.player.hardcore);
  G.player.gold = 77; H.saveIsolatedHardcoreState(G); assert.equal(T.HARDCORE.save.player.gold, 77); assert.equal(first.player.gold, 200);
  assert.equal(H.canImportIntoSlot(normal, true), false); assert.equal(H.canImportIntoSlot(T.HARDCORE.save, false), false);
  assert.equal(H.canImportIntoSlot({ hardcoreIsolated: true, player: { hardcoreMode: true } }, true), false);
  const hc = H.loadIsolatedHardcoreState(); T.restoreGame(hc); assert.equal(G.player.gold, 77);
  hc.player.gold = 1; assert.equal(T.HARDCORE.save.player.gold, 77, 'returned copy cannot mutate the only slot');
  assert.throws(() => T.restoreGame(normal), /does not open ordinary saves/);
  await assert.rejects(T.encodeSave(T.snapshotGame()), /hardcore/i);
  T.die('test'); assert.equal(T.HARDCORE.save, null); assert.equal(H.loadIsolatedHardcoreState(), null); assert.equal(H.saveIsolatedHardcoreState(G).ok, false);
  assert(!storageWrites.includes('octave_hardcore_isolated_save_v1'));
  noLegacyState(); console.log('PASS native opt-in hardcore, one full save, no exports/cross-imports, permadeath, no persistent legacy slot');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert(html.indexOf('js/phase1-native.js') > html.indexOf('js/hanger22.js'));
  assert(html.indexOf('phase1_stealth_law_gameplay.js') > html.indexOf('js/phase1-native.js'));
  assert(!html.includes('octave_complete_expansion_bundle.js'));
  console.log('PASS runtime load order: only Phase 1 enabled, not Phases 2–7');
})().catch(e => { console.error(e); process.exitCode = 1; });
