// Phase 1 integration. The native game owns state, balance, UI and persistence.
// Loaded after native extensions and before phase1_stealth_law_gameplay.js.
// No window.G alias, legacy player fields, second update loop or persistent hardcore save.
'use strict';

const PHASE1_NATIVE = (function () {
  const native = { wearingDisguise, synodInspector, disguiseProtects, bribeTerms, threatTerms,
    horseActive, enterPrison, renderArrest, openStable, renderHardcoreSave };
  const live = game => game === G && !!G.player && !G.dead;
  const invalid = () => ({ ok: false, reason: 'not_live_game' });
  const guard = npc => G.ents.includes(npc) && npc.kind === 'npc' && npc.lawGuard && !npc.dead && !npc.hidden && !(npc.stun > 0) && dist2(npc.x, npc.y, Engine.cam.x, Engine.cam.y) <= USE_RANGE ** 2 && los(npc.x, npc.y, Engine.cam.x, Engine.cam.y);
  const canNegotiate = (game, npc) => live(game) && guard(npc) && lawActive() && crimeState().bounty > 0 && !crimeState().custody;
  const find = id => G.ents.find(e => e === id || (typeof id === 'string' && id.length > 0 && e.id === id));
  const runAction = (open, button) => { open(); const el = document.querySelector(button); return el && el.onclick ? el.onclick() : undefined; };

  const disguise = {
    DISGUISE_ITEM_ID: 'a_synodrobe', DISGUISE_CATALOG_ENTRY: ARMOR.a_synodrobe,
    isWearingSynodRobe: game => live(game) && native.wearingDisguise(),
    isEligibleSynodInspector: e => !!e && native.synodInspector(e),
    shouldSuppressEnemySightAggro: (game, e) => live(game) && native.disguiseProtects(e),
    // Native robes are sold by Abner. Do not inject legacy pickups at unverified coordinates.
    appendDisguisePickupsForMap: () => 0,
    getTransientState: () => ({ mapId: G.mapId, suspicion: (G.coverSuspicion || 0) / 3 * 100,
      compromised: disguiseExposed(), panelOpen: G.openPanel === 'disguise' })
  };

  const crime = {
    THEFT_BOUNTY: 20, ASSAULT_BOUNTY: 40, ESCAPE_BOUNTY: 60,
    ensurePlayerCrimeFields(game) { if (live(game)) normalizeCrime(); },
    normalizeCrimeSaveState(game) {
      if (game !== G) throw new Error('Use restoreGame for untrusted saves; Phase 1 only normalizes the live game.');
      normalizeCrime(); return game;
    },
    isWantedPosterThresholdMet: game => live(game) && lawActive() && crimeState().bounty >= 40,
    appendOakhavenCrimeEntities(game) {
      if (!live(game)) return { goods: 0, posters: 0 };
      syncWantedPosters(); // existing authored placements, never duplicate saved entities
      return { goods: 0, posters: 0 };
    },
    stealOwnedGood(game, id) {
      if (!live(game)) return invalid();
      const e = find(id);
      if (!e || e.kind !== 'item' || !e.owner || e.dead || e.hidden || !lawActive() || !los(Engine.cam.x, Engine.cam.y, e.x, e.y) || dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) > 4) return { ok: false, reason: 'invalid_target' };
      pickUp(e); // the native confirmation performs witness checks and stale-action validation
      return { ok: true, pending: G.openPanel === 'theft' };
    },
    recordTownAssault(game, e) {
      if (!live(game)) return invalid();
      if (!G.ents.includes(e) || !e || e.dead || e.hidden || dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) > 4 || !los(Engine.cam.x, Engine.cam.y, e.x, e.y)) return { ok: false, reason: 'invalid_target' };
      const before = crimeState().assaults;
      assaultCivilian(e);
      return { ok: crimeState().assaults > before, totalBounty: crimeState().bounty };
    },
    inspectOrTearWantedPoster(game, id, action) {
      if (!live(game)) return invalid();
      const e = find(id);
      if (!e || !e.wantedPoster || e.hidden || e.dead || !los(Engine.cam.x, Engine.cam.y, e.x, e.y) || dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) > 4) return { ok: false, reason: 'poster_not_found' };
      if (action === 'tear_down') return { ok: false, reason: 'native_notices_are_registry_backed' };
      renderWantedPoster(); return { ok: true, inspected: true };
    },
    enterPlayablePrison(game) {
      if (!live(game)) return invalid();
      native.enterPrison(); return { ok: !!crimeState().custody, inPrison: !!crimeState().custody };
    },
    servePrisonSentence(game) {
      if (!live(game) || G.mapId !== 'watchhouse' || !crimeState().custody) return { ok: false };
      passHours(crimeState().custody.remaining);
      return { ok: true, servedHours: crimeState().jailHours, bounty: crimeState().bounty };
    },
    attemptPrisonEscape(game, method, recoverEvidence) {
      if (!live(game) || G.mapId !== 'watchhouse' || !crimeState().custody) return { ok: false };
      if (method !== 'lockpick') return { ok: false, reason: 'use_native_cell_lock' };
      // No instant escape or remote evidence recovery: play the existing lock puzzle.
      const cell = G.map.get(5, 4);
      if (dist2(Engine.cam.x, Engine.cam.y, 5.5, 4.5) > USE_RANGE ** 2) return { ok: false, reason: 'approach_cell_lock' };
      if (!G.flags[PRISON_CELL_KEY]) {
        const pending = beginLockpick(cell, PRISON_CELL_KEY, cell.lockDifficulty, () => { G.map.doors[4 * G.map.w + 5].target = 1; });
        return { ok: pending, escaped: false, pending };
      }
      if (recoverEvidence && crimeState().evidence && !G.flags[EVIDENCE_KEY]) return { ok: false, reason: 'unlock_evidence_chest_in_world' };
      return { ok: true, escaped: false, reason: 'leave_by_street_door' };
    },
    getTransientState: () => ({ panelOpen: ['arrest', 'prison', 'wanted'].includes(G.openPanel), panelMode: G.openPanel })
  };

  const social = {
    getBribeQuote(game, npc) {
      if (!canNegotiate(game, npc)) return null;
      const t = native.bribeTerms(); return { cost: t.cost, odds: t.chance, isGuard: true };
    },
    getThreatOdds(game, npc) {
      if (!canNegotiate(game, npc)) return null;
      const t = native.threatTerms(); return { odds: t.chance, grace: t.grace, isGuard: true };
    },
    attemptDialogueBribe(game, npc) {
      if (!canNegotiate(game, npc)) return { ok: false, reason: 'native_watch_only' };
      const quote = native.bribeTerms(), before = G.player.gold;
      if (before < quote.cost) return { ok: false, reason: 'insufficient_gold' };
      runAction(native.renderArrest, '#crime-bribe');
      return { ok: true, succeeded: crimeState().bounty === 0, spent: before - G.player.gold, bountyCleared: crimeState().bounty === 0 };
    },
    attemptDialogueThreat(game, npc) {
      if (!canNegotiate(game, npc)) return { ok: false, reason: 'native_watch_only' };
      const succeeded = runAction(native.renderArrest, '#crime-threat') === true;
      return { ok: true, succeeded, backedDown: succeeded };
    }
  };

  const travel = {
    HORSE_RENTAL_COST: HORSE.cost, HORSE_RENTAL_HOURS: HORSE.hours,
    ensureSurvivalAndMountFields(game) { return live(game); }, // newPlayer/restoreGame own schema validation
    hasActiveHorseMount: game => live(game) && native.horseActive(),
    rentOakhavenHorse(game) {
      if (!live(game) || G.mapId !== 'oakhaven' || G.state !== 'play' || !G.ents.some(e => e.use === 'stable' && !e.hidden && !e.dead && dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) <= USE_RANGE ** 2 && los(Engine.cam.x, Engine.cam.y, e.x, e.y))) return { ok: false, reason: 'visit_oakhaven_stable' };
      if (native.horseActive()) return { ok: false, reason: 'already_mounted' };
      if (!Number.isFinite(G.player.gold) || G.player.gold < HORSE.cost) return { ok: false, reason: 'insufficient_gold' };
      runAction(native.openStable, '#stable-rent');
      return { ok: native.horseActive(), spent: HORSE.cost, rentedUntilHour: horseUntil() };
    },
    computeTravelModifiers(game, baseHours, baseFatigueCost, pace) {
      if (!live(game)) return invalid();
      const mounted = native.horseActive();
      return { mounted, hours: baseHours * (pace === 'cautious' ? 1.35 : 1) * (mounted ? HORSE.speed : 1),
        fatigueCost: baseFatigueCost * (mounted ? 0.4 : 1), ambushRiskReduction: 0 };
    },
    advanceJourneyNeeds(game, hours) {
      if (!live(game) || !Number.isFinite(hours) || hours < 0 || hours > 168) return invalid();
      passHours(hours); // includes clock, custody, needs, weather and native extension hooks exactly once
      return { ok: true, active: needsOn(), hunger: G.player.hunger, sleep: G.player.sleep, maxFatiguePenalty: G.player.fatMax - fatCap() };
    },
    consumeRationOrMeal(game, id = 'honey') {
      if (!live(game) || !['heal', 'voice', 'food'].includes(ITEMS[id] && ITEMS[id].use) || !G.has(id)) return { ok: false, reason: 'meal_required' };
      useItem(G.player.inv.find(s => s.id === id)); return { ok: true, hunger: G.player.hunger };
    },
    restAndRecoverNeeds(game) {
      if (!live(game) || G.state !== 'play') return invalid();
      renderRest(); return { ok: G.openPanel === 'rest' || G.openPanel === 'prison', pending: true };
    },
    saveIsolatedHardcoreState(game) {
      if (!live(game) || !hardcoreOn() || G.player.hp <= 0) return { ok: false, reason: 'not_living_hardcore_run' };
      runAction(native.renderHardcoreSave, '#hc-save'); return { ok: !!HARDCORE.save };
    },
    loadIsolatedHardcoreState() {
      if (!live(G) || !hardcoreOn()) return null;
      return HARDCORE.save ? JSON.parse(JSON.stringify(HARDCORE.save)) : null;
    },
    purgeHardcoreSaveOnPermadeath(game) {
      if (game !== G || !hardcoreOn() || (!G.dead && G.player.hp > 0)) return { purged: false };
      HARDCORE.save = null; return { purged: true, hardcoreDead: true };
    },
    canImportIntoSlot(payload, isHardcore) {
      if (!payload || typeof payload !== 'object' || payload.hardcoreIsolated || (payload.player && payload.player.hardcoreMode)) return false;
      return hardcorePayload(payload) === !!isHardcore;
    }
  };

  return { disguise, crime, social, travel, native };
})();
window.OctavePhase1Native = PHASE1_NATIVE;

// Real gameplay calls the same registered Phase 1 APIs. Fallbacks permit isolated native tests.
wearingDisguise = function () { return window.OctaveDisguise ? window.OctaveDisguise.isWearingSynodRobe(G) : PHASE1_NATIVE.native.wearingDisguise(); };
disguiseProtects = function (e) { return window.OctaveDisguise ? window.OctaveDisguise.shouldSuppressEnemySightAggro(G, e) : PHASE1_NATIVE.native.disguiseProtects(e); };
horseActive = function () { return window.OctaveTravelSurvivalHardcore ? window.OctaveTravelSurvivalHardcore.hasActiveHorseMount(G) : PHASE1_NATIVE.native.horseActive(); };
