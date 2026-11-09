const assert = require('assert');
global.window = global;
require('../phase1_stealth_law_gameplay.js');

const BT = window.OctaveBribesThreats;
const TSH = window.OctaveTravelSurvivalHardcore;

window.G = {
  currentMap: 'oakhaven',
  worldHours: 10,
  options: { survivalNeeds: true },
  flags: {},
  player: {
    hp: 35,
    gold: 100,
    bounty: 20,
    skills: { Mercantile: 35, Blade: 40 },
    attributes: { Personality: 55, Strength: 50 },
    hardcoreMode: false
  },
  rng: () => 0.15
};

// 1. Bribe & Threat checks
const guard = { id: 'watch_1', subtype: 'constable', name: 'Watch Constable', disposition: 45 };
const boss = { id: 'deacon', species: 'deacon_of_the_unrung_bell', boss: true };

assert.strictEqual(BT.getBribeQuote(window.G, boss), null, 'Bosses cannot be bribed');
const bribeRes = BT.attemptDialogueBribe(window.G, guard);
assert.strictEqual(bribeRes.ok, true);
assert.strictEqual(bribeRes.succeeded, true);
assert.strictEqual(window.G.player.bounty, 0, 'Successful guard bribe clears bounty');

const merchant = { id: 'merch_1', subtype: 'merchant', name: 'Factor', disposition: 50 };
const threatRes = BT.attemptDialogueThreat(window.G, merchant);
assert.strictEqual(threatRes.ok, true);
assert.strictEqual(threatRes.succeeded, true);
assert.strictEqual(merchant.intimidated, true);

// 2. Horse rental & travel modifiers
const unmountedMod = TSH.computeTravelModifiers(window.G, 10, 20, 'cautious');
const rentRes = TSH.rentOakhavenHorse(window.G);
assert.strictEqual(rentRes.ok, true);
assert.strictEqual(TSH.hasActiveHorseMount(window.G), true);
const mountedMod = TSH.computeTravelModifiers(window.G, 10, 20, 'cautious');
assert(mountedMod.hours < unmountedMod.hours, 'Mounted travel is faster');
assert(mountedMod.fatigueCost < unmountedMod.fatigueCost, 'Mounted travel costs less fatigue');

// 3. Optional hunger & sleep deprivation over long journeys
const needsRes = TSH.advanceJourneyNeeds(window.G, 15);
assert.strictEqual(needsRes.active, true);
assert(needsRes.hunger >= 60, 'Hunger increases over 15-hour journey');
assert(needsRes.maxFatiguePenalty > 0, 'High hunger/sleep deprivation applies fatigue cap penalty');
TSH.consumeRationOrMeal(window.G, 50);
TSH.restAndRecoverNeeds(window.G, 8);
assert(window.G.player.hunger < 25 && window.G.player.sleepDeprivation < 10, 'Rations and rest clear survival needs');

// 4. Isolated Hardcore single-save & permadeath
assert.strictEqual(TSH.canImportIntoSlot({ hardcoreIsolated: false, player: { hardcoreMode: false } }, true), false, 'Normal save cannot import into hardcore');
assert.strictEqual(TSH.canImportIntoSlot({ hardcoreIsolated: true, player: { hardcoreMode: true } }, false), false, 'Hardcore save cannot import into normal');

window.G.player.hardcoreMode = true;
const hcSave = TSH.saveIsolatedHardcoreState(window.G);
assert.strictEqual(hcSave.ok, true);
assert(TSH.loadIsolatedHardcoreState() !== null, 'Hardcore single-save loaded');

const deathPurge = TSH.purgeHardcoreSaveOnPermadeath(window.G);
assert.strictEqual(deathPurge.purged, true);
assert.strictEqual(TSH.loadIsolatedHardcoreState(), null, 'Permadeath purges isolated hardcore save');

console.log('ALL BRIBES/THREATS & HORSE/NEEDS/HARDCORE ASSERTIONS PASSED');
