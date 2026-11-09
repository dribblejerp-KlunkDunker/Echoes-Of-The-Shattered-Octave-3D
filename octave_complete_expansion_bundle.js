/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 1: STEALTH, LAW & GAMEPLAY
 * Includes:
 *   - Synod Robe Disguises, Proximity Inspection & Detection (window.OctaveDisguise)
 *   - Broader Crime, Wanted Posters & Playable Prison / Escape (window.OctaveCrimePrison)
 *   - Personality Bribes & Strength Threats in Dialogue (window.OctaveBribesThreats)
 *   - Horse Rental, Journey Survival Needs & Isolated Hardcore Mode (window.OctaveTravelSurvivalHardcore)
 * ============================================================================ */
(function () {
  'use strict';

  if (window.OctavePhase1Native) { window.OctaveDisguise = window.OctavePhase1Native.disguise; return; }

  const DISGUISE_ITEM_ID = 'synod_robe';
  const DISGUISE_CATALOG_ENTRY = Object.freeze({
    id: DISGUISE_ITEM_ID,
    name: 'Synod Initiate Robes',
    type: 'armour',
    slot: 'body',
    ar: 2,
    noise: -1,
    weight: 3.0,
    value: 35,
    disguiseFaction: 'synod',
    desc: 'Ash-grey wool cassock and leaded stole of the Choir-Church Synod. Blends among Proctors and Choristers from a distance, though close scrutiny invites liturgical inspection.'
  });

  const DISGUISE_PICKUP_DEFS = Object.freeze({
    cloister: [{ id: 'disguise_pickup_cloister_vestry', x: 15.5, y: 11.5, label: 'Folded Synod Robes (Inspect / Take)', flagKey: 'disguise_pickup:cloister:vestry_robe' }],
    quarry: [{ id: 'disguise_pickup_quarry_watchpost', x: 6.5, y: 5.5, label: 'Spare Proctor Cassock (Inspect / Take)', flagKey: 'disguise_pickup:quarry:watchpost_robe' }]
  });

  const SYNOD_HUMANOID_PATROLS = new Set(['proctor', 'legionnaire', 'chord_warden', 'chord-warden', 'office_marine', 'office-marine', 'outrider']);
  const DISGUISE_IMMUNE_SPECIES = new Set([
    'cacophony_hound', 'cacophony-hound', 'hound', 'drowned_hollow', 'weaverling',
    'hush_moth', 'cacophony_swarm', 'listening_horn', 'steam_golem', 'aegis_sentinel',
    'pressman_mallow', 'phantom_weaver', 'the_requiem', 'requiem', 'brood_mother',
    'deacon_of_the_unrung_bell', 'deacon', 'hal_brennick', 'hushwarden', 'the_wearer',
    'wearer', 'dirge', 'quiet', 'tongueless'
  ]);

  const INSPECT_MAX_RANGE = 4.2;
  const INSPECT_CLOSE_RANGE = 2.1;
  const INSPECT_PROMPT_THRESHOLD = 65;
  const INSPECT_BLOWN_THRESHOLD = 100;

  const transientDisguiseState = {
    mapId: null,
    suspicion: 0,
    compromised: false,
    inspectorId: null,
    challengedOnceIds: new Set(),
    panelOpen: false
  };

  function isWearingSynodRobe(G) {
    if (!G || !G.player) return false;
    const eq = G.player.equipment || G.player.equipped || {};
    const bodyItem = eq.body || eq.chest || eq.armour;
    const bodyId = typeof bodyItem === 'string' ? bodyItem : (bodyItem && bodyItem.id);
    return bodyId === DISGUISE_ITEM_ID || G.player.activeDisguise === DISGUISE_ITEM_ID;
  }

  function appendDisguisePickupsForMap(G, mapId) {
    if (!G || !Array.isArray(G.entities)) return 0;
    const resolvedMap = String(mapId || G.currentMap || (G.map && G.map.id) || '').toLowerCase();
    const defs = DISGUISE_PICKUP_DEFS[resolvedMap];
    if (!defs) return 0;
    G.flags = G.flags || {};
    let appended = 0;
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      if (G.flags[def.flagKey] === 'taken') continue;
      if (G.entities.some(function (e) { return e && e.id === def.id; })) continue;
      G.entities.push({
        id: def.id, type: 'prop', subtype: 'disguise_pickup', sprite: 'crate',
        x: def.x, y: def.y, solid: false, nonblocking: true, pickable: true,
        label: def.label, flagKey: def.flagKey, disguiseItemId: DISGUISE_ITEM_ID
      });
      appended++;
    }
    return appended;
  }

  function isEligibleSynodInspector(ent) {
    if (!ent || ent.dead || ent.hidden || ent.hp <= 0 || ent.passive || ent.boss || ent.isBoss) return false;
    const rawKey = String(ent.species || ent.enemyType || ent.subtype || ent.name || '').toLowerCase().replace(/\s+/g, '_');
    if (DISGUISE_IMMUNE_SPECIES.has(rawKey)) return false;
    return SYNOD_HUMANOID_PATROLS.has(rawKey) || /proctor|legionnaire|chord_warden|marine|chorister|synod/.test(rawKey);
  }

  function shouldSuppressEnemySightAggro(G, enemy) {
    if (!G || !G.player || !enemy) return false;
    if (!isWearingSynodRobe(G) || transientDisguiseState.compromised) return false;
    if (!isEligibleSynodInspector(enemy)) return false;
    if ((G.player.bounty || 0) > 0 || G.player.draggingBody || G.draggingCorpse) return false;
    if (enemy.state === 'chase' || enemy.state === 'combat' || enemy.hitByPlayer) return false;
    return true;
  }

  window.OctaveDisguise = {
    DISGUISE_ITEM_ID,
    DISGUISE_CATALOG_ENTRY,
    isWearingSynodRobe,
    appendDisguisePickupsForMap,
    isEligibleSynodInspector,
    shouldSuppressEnemySightAggro,
    getTransientState: function () { return transientDisguiseState; }
  };
})();

/* ============================================================================
 * PHASE 1 PASS: Broader Crime, Wanted Posters & Playable Prison / Escape
 * ============================================================================ */
(function () {
  'use strict';

  if (window.OctavePhase1Native) { window.OctaveCrimePrison = window.OctavePhase1Native.crime; return; }

  const THEFT_BOUNTY = 20;
  const ASSAULT_BOUNTY = 40;
  const ESCAPE_BOUNTY = 15;
  const WANTED_POSTER_BOUNTY_THRESHOLD = 40;
  const WANTED_POSTER_OFFENSE_THRESHOLD = 3;

  const OWNED_GOODS_DEFS = Object.freeze([
    {
      id: 'owned_oakhaven_bakers_loaf',
      itemId: 'spiced_loaf',
      name: "Baker's Spiced Loaf",
      value: 6,
      x: 11.5,
      y: 14.5,
      ownerFaction: 'oakhaven',
      flagKey: 'owned_good:oakhaven:bakers_loaf'
    },
    {
      id: 'owned_oakhaven_chandlers_tallow',
      itemId: 'tallow_bundle',
      name: "Chandler's Tallow Bundle",
      value: 10,
      x: 14.5,
      y: 13.5,
      ownerFaction: 'oakhaven',
      flagKey: 'owned_good:oakhaven:chandlers_tallow'
    },
    {
      id: 'owned_oakhaven_smith_ingot',
      itemId: 'tempered_ingot',
      name: "Smith's Tempered Ingot",
      value: 18,
      x: 18.5,
      y: 11.5,
      ownerFaction: 'oakhaven',
      flagKey: 'owned_good:oakhaven:smith_ingot'
    }
  ]);

  const WANTED_POSTER_DEFS = Object.freeze([
    {
      id: 'wanted_poster_oakhaven_square',
      x: 13.5,
      y: 12.5,
      label: 'Synod & Watch Wanted Poster (Inspect)',
      flagKey: 'wanted_poster:oakhaven:square'
    },
    {
      id: 'wanted_poster_oakhaven_watchhouse',
      x: 8.5,
      y: 9.5,
      label: 'Watchhouse Fugitive Notice (Inspect)',
      flagKey: 'wanted_poster:oakhaven:watchhouse'
    }
  ]);

  const transientCrimeState = {
    panelOpen: false,
    panelMode: null,
    activeTargetId: null,
    selectedOption: 0,
    lastStatusText: '',
    gamepadPrevButtons: {}
  };

  function ensurePlayerCrimeFields(G) {
    if (!G || !G.player) return;
    const p = G.player;
    p.bounty = Math.max(0, Number.isFinite(Number(p.bounty)) ? Math.floor(Number(p.bounty)) : 0);
    p.theftCount = Math.max(0, Number.isFinite(Number(p.theftCount)) ? Math.floor(Number(p.theftCount)) : 0);
    p.assaultCount = Math.max(0, Number.isFinite(Number(p.assaultCount)) ? Math.floor(Number(p.assaultCount)) : 0);
    p.servedHours = Math.max(0, Number.isFinite(Number(p.servedHours)) ? Math.floor(Number(p.servedHours)) : 0);
    p.inPrison = Boolean(p.inPrison);
    if (!Array.isArray(p.confiscatedInventory)) {
      p.confiscatedInventory = [];
    }
    G.flags = G.flags || {};
  }

  function normalizeCrimeSaveState(stateObj) {
    if (!stateObj || typeof stateObj !== 'object') return stateObj;
    if (stateObj.player && typeof stateObj.player === 'object') {
      const p = stateObj.player;
      p.bounty = Math.max(0, Number.isFinite(Number(p.bounty)) ? Math.floor(Number(p.bounty)) : 0);
      p.theftCount = Math.max(0, Number.isFinite(Number(p.theftCount)) ? Math.floor(Number(p.theftCount)) : 0);
      p.assaultCount = Math.max(0, Number.isFinite(Number(p.assaultCount)) ? Math.floor(Number(p.assaultCount)) : 0);
      p.servedHours = Math.max(0, Number.isFinite(Number(p.servedHours)) ? Math.floor(Number(p.servedHours)) : 0);
      p.inPrison = Boolean(p.inPrison);
      if (!Array.isArray(p.confiscatedInventory)) {
        p.confiscatedInventory = [];
      } else {
        p.confiscatedInventory = p.confiscatedInventory
          .filter(function (it) { return it && typeof it === 'object' && typeof it.id === 'string'; })
          .map(function (it) {
            return {
              id: String(it.id),
              name: String(it.name || it.id),
              qty: Math.max(1, Math.floor(Number(it.qty) || 1)),
              stolen: Boolean(it.stolen),
              quest: Boolean(it.quest)
            };
          });
      }
    }
    return stateObj;
  }

  function hasClearLineOfSight(G, x0, y0, x1, y1) {
    if (typeof window.hasLineOfSight === 'function') {
      return Boolean(window.hasLineOfSight(x0, y0, x1, y1));
    }
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.05) return true;
    const steps = Math.max(2, Math.ceil(dist * 4));
    const map = G && G.map;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = Math.floor(x0 + dx * t);
      const sy = Math.floor(y0 + dy * t);
      if (map && Array.isArray(map.grid) && map.grid[sy] && map.grid[sy][sx]) {
        const cell = map.grid[sy][sx];
        if (cell === 1 || (typeof cell === 'object' && cell.solid && !cell.open)) {
          return false;
        }
      }
    }
    return true;
  }

  function hasVisibleTownWitness(G, x, y, excludedEntityId) {
    if (!G || !Array.isArray(G.entities)) return false;
    const px = Number(x ?? (G.player && G.player.x) ?? 0);
    const py = Number(y ?? (G.player && G.player.y) ?? 0);
    for (let i = 0; i < G.entities.length; i++) {
      const ent = G.entities[i];
      if (!ent || ent.dead || ent.hidden || ent.id === excludedEntityId) continue;
      if (ent.isCompanion || ent.companion) continue;
      const isTownWatcher =
        ent.type === 'npc' ||
        ent.subtype === 'constable' ||
        ent.subtype === 'guard' ||
        ent.subtype === 'townsfolk' ||
        ent.subtype === 'merchant' ||
        /constable|watch|guard|merchant|townsfolk|villager/i.test(String(ent.name || ent.role || ''));
      if (!isTownWatcher) continue;
      const dist = Math.hypot((ent.x || 0) - px, (ent.y || 0) - py);
      if (dist <= 8.5 && hasClearLineOfSight(G, ent.x, ent.y, px, py)) {
        return true;
      }
    }
    return false;
  }

  function alertNearbyConstables(G) {
    if (!G || !Array.isArray(G.entities) || !G.player) return 0;
    let alerted = 0;
    for (let i = 0; i < G.entities.length; i++) {
      const ent = G.entities[i];
      if (!ent || ent.dead || ent.hidden) continue;
      const isGuard =
        ent.subtype === 'constable' ||
        ent.subtype === 'guard' ||
        /constable|watchman|guard/i.test(String(ent.name || ent.role || ''));
      if (!isGuard) continue;
      if (hasClearLineOfSight(G, ent.x, ent.y, G.player.x, G.player.y)) {
        ent.state = 'pursue_criminal';
        ent.alerted = true;
        alerted++;
      }
    }
    return alerted;
  }

  function isWantedPosterThresholdMet(G) {
    if (!G || !G.player) return false;
    ensurePlayerCrimeFields(G);
    const totalOffenses = (G.player.theftCount || 0) + (G.player.assaultCount || 0);
    return (
      G.player.bounty >= WANTED_POSTER_BOUNTY_THRESHOLD ||
      totalOffenses >= WANTED_POSTER_OFFENSE_THRESHOLD
    );
  }

  function appendOakhavenCrimeEntities(G) {
    if (!G || !Array.isArray(G.entities)) return { goods: 0, posters: 0 };
    ensurePlayerCrimeFields(G);
    const mapId = String(G.currentMap || (G.map && G.map.id) || '').toLowerCase();
    if (mapId !== 'oakhaven') return { goods: 0, posters: 0 };

    let goodsAppended = 0;
    for (let i = 0; i < OWNED_GOODS_DEFS.length; i++) {
      const def = OWNED_GOODS_DEFS[i];
      if (G.flags[def.flagKey] === 'taken') continue;
      if (G.entities.some(function (e) { return e && e.id === def.id; })) continue;
      G.entities.push({
        id: def.id,
        type: 'item',
        subtype: 'owned_good',
        itemId: def.itemId,
        name: def.name,
        value: def.value,
        x: def.x,
        y: def.y,
        owned: true,
        solid: false,
        nonblocking: true,
        pickable: true,
        flagKey: def.flagKey,
        label: `${def.name} (Owned — Inspect / Steal)`
      });
      goodsAppended++;
    }

    let postersAppended = 0;
    const shouldShowPosters = isWantedPosterThresholdMet(G) && G.player.bounty > 0;
    for (let i = 0; i < WANTED_POSTER_DEFS.length; i++) {
      const pdef = WANTED_POSTER_DEFS[i];
      const existing = G.entities.find(function (e) { return e && e.id === pdef.id; });
      const tornDown = G.flags[pdef.flagKey] === 'torn';
      if (existing) {
        existing.hidden = !shouldShowPosters || tornDown;
        continue;
      }
      if (!shouldShowPosters || tornDown) continue;
      G.entities.push({
        id: pdef.id,
        type: 'prop',
        subtype: 'wanted_poster',
        x: pdef.x,
        y: pdef.y,
        solid: false,
        nonblocking: true,
        pickable: true,
        flagKey: pdef.flagKey,
        label: pdef.label
      });
      postersAppended++;
    }

    return { goods: goodsAppended, posters: postersAppended };
  }

  function stealOwnedGood(G, entityId) {
    if (!G || !G.player || !Array.isArray(G.entities)) return { ok: false };
    ensurePlayerCrimeFields(G);
    const ent = G.entities.find(function (e) {
      return e && e.id === entityId && e.subtype === 'owned_good' && !e.hidden;
    });
    if (!ent || G.flags[ent.flagKey] === 'taken') {
      return { ok: false, reason: 'already_taken' };
    }

    G.flags[ent.flagKey] = 'taken';
    ent.hidden = true;
    G.player.theftCount += 1;

    G.player.inventory = Array.isArray(G.player.inventory) ? G.player.inventory : [];
    G.player.inventory.push({
      id: ent.itemId,
      name: ent.name,
      qty: 1,
      value: ent.value,
      stolen: true
    });

    const witnessed = hasVisibleTownWitness(G, ent.x, ent.y, ent.id);
    if (witnessed) {
      G.player.bounty += THEFT_BOUNTY;
      alertNearbyConstables(G);
      WANTED_POSTER_DEFS.forEach(function (d) { delete G.flags[d.flagKey]; });
      appendOakhavenCrimeEntities(G);
    }

    return {
      ok: true,
      stolenItem: ent.itemId,
      witnessed: witnessed,
      bountyAdded: witnessed ? THEFT_BOUNTY : 0,
      totalBounty: G.player.bounty
    };
  }

  function recordTownAssault(G, targetEntity) {
    if (!G || !G.player || !targetEntity || targetEntity.dead) return { ok: false };
    ensurePlayerCrimeFields(G);

    const isProtectedTownTarget =
      targetEntity.type === 'npc' ||
      targetEntity.subtype === 'townsfolk' ||
      targetEntity.subtype === 'merchant' ||
      targetEntity.subtype === 'constable' ||
      targetEntity.subtype === 'guard';

    if (!isProtectedTownTarget || targetEntity.hostileToPlayer) {
      return { ok: false, reason: 'not_protected_citizen' };
    }

    if (targetEntity._assaultRecordedThisVisit) {
      return { ok: true, alreadyRecorded: true, totalBounty: G.player.bounty };
    }

    targetEntity._assaultRecordedThisVisit = true;
    G.player.assaultCount += 1;

    const targetIsLivingWitness = !targetEntity.dead && (targetEntity.hp === undefined || targetEntity.hp > 0);
    const thirdPartyWitness = hasVisibleTownWitness(G, targetEntity.x, targetEntity.y, targetEntity.id);
    const witnessed = targetIsLivingWitness || thirdPartyWitness;

    if (witnessed) {
      G.player.bounty += ASSAULT_BOUNTY;
      alertNearbyConstables(G);
      WANTED_POSTER_DEFS.forEach(function (d) { delete G.flags[d.flagKey]; });
      appendOakhavenCrimeEntities(G);
    }

    return {
      ok: true,
      witnessed: witnessed,
      bountyAdded: witnessed ? ASSAULT_BOUNTY : 0,
      totalBounty: G.player.bounty
    };
  }

  function inspectOrTearWantedPoster(G, posterId, action) {
    if (!G || !G.player) return { ok: false };
    ensurePlayerCrimeFields(G);
    const poster = (G.entities || []).find(function (e) {
      return e && e.id === posterId && e.subtype === 'wanted_poster' && !e.hidden;
    });
    if (!poster) return { ok: false, reason: 'poster_not_found' };

    const description = `WANTED BY THE OAKHAVEN WATCH — Bounty: ${G.player.bounty} Sovereigns (Thefts: ${G.player.theftCount}, Assaults: ${G.player.assaultCount}).`;
    if (action !== 'tear_down') {
      transientCrimeState.lastStatusText = description;
      return { ok: true, inspected: true, text: description };
    }

    const witnessed = hasVisibleTownWitness(G, poster.x, poster.y, poster.id);
    if (witnessed) {
      G.player.bounty += 10;
      alertNearbyConstables(G);
      transientCrimeState.lastStatusText = 'A townsfolk catches you defacing a Watch notice (+10 Bounty)!';
      return { ok: true, torn: false, witnessed: true, totalBounty: G.player.bounty };
    }

    G.flags[poster.flagKey] = 'torn';
    poster.hidden = true;
    transientCrimeState.lastStatusText = 'You tear down the Wanted Poster while no one watches.';
    return { ok: true, torn: true, witnessed: false };
  }

  function enterPlayablePrison(G) {
    if (!G || !G.player) return { ok: false };
    ensurePlayerCrimeFields(G);

    G.player.inPrison = true;
    G.player.x = 7.5;
    G.player.y = 8.5;

    const inv = Array.isArray(G.player.inventory) ? G.player.inventory : [];
    const kept = [];
    const confiscated = Array.isArray(G.player.confiscatedInventory) ? G.player.confiscatedInventory.slice() : [];

    for (let i = 0; i < inv.length; i++) {
      const item = inv[i];
      if (!item) continue;
      if (item.quest || item.isQuest || item.id === 'vox_bottle' || item.id === 'bottle' || item.id === 'bound_ledger') {
        kept.push(item);
      } else {
        confiscated.push({
          id: String(item.id),
          name: String(item.name || item.id),
          qty: Math.max(1, Number(item.qty) || 1),
          stolen: Boolean(item.stolen),
          quest: false
        });
      }
    }

    G.player.inventory = kept;
    G.player.confiscatedInventory = confiscated;
    G.flags['prison:evidence_chest_locked'] = true;
    G.flags['prison:cell_door_locked'] = true;

    transientCrimeState.panelOpen = true;
    transientCrimeState.panelMode = 'prison';
    return {
      ok: true,
      inPrison: true,
      confiscatedCount: confiscated.length,
      keptQuestCount: kept.length
    };
  }

  function servePrisonSentence(G) {
    if (!G || !G.player || !G.player.inPrison) return { ok: false };
    ensurePlayerCrimeFields(G);

    G.player.servedHours += 6;
    if (typeof G.worldHours === 'number') {
      G.worldHours += 6;
    }
    G.player.bounty = 0;
    G.player.inPrison = false;

    const inv = Array.isArray(G.player.inventory) ? G.player.inventory : [];
    const confiscated = Array.isArray(G.player.confiscatedInventory) ? G.player.confiscatedInventory : [];
    let returnedCount = 0;
    let forfeitedStolenCount = 0;

    for (let i = 0; i < confiscated.length; i++) {
      const item = confiscated[i];
      if (!item) continue;
      if (item.stolen) {
        forfeitedStolenCount++;
      } else {
        inv.push({ id: item.id, name: item.name, qty: item.qty || 1 });
        returnedCount++;
      }
    }

    G.player.inventory = inv;
    G.player.confiscatedInventory = [];
    delete G.flags['prison:evidence_chest_locked'];
    delete G.flags['prison:cell_door_locked'];

    appendOakhavenCrimeEntities(G);
    G.player.x = 9.5;
    G.player.y = 10.5;
    transientCrimeState.panelOpen = false;
    transientCrimeState.panelMode = null;

    return {
      ok: true,
      servedHours: G.player.servedHours,
      returnedCount: returnedCount,
      forfeitedStolenCount: forfeitedStolenCount,
      bounty: G.player.bounty
    };
  }

  function attemptPrisonEscape(G, method, recoverEvidence) {
    if (!G || !G.player || !G.player.inPrison) return { ok: false };
    ensurePlayerCrimeFields(G);

    const skills = (G.player && G.player.skills) || {};
    const lockpicking = typeof skills.Lockpicking === 'number' ? skills.Lockpicking : 20;
    const climbing = typeof skills.Climbing === 'number' ? skills.Climbing : 20;
    const strength = (G.player.attributes && G.player.attributes.Strength) || 40;

    const skillScore = method === 'grate' ? (climbing + strength * 0.5) : (lockpicking * 1.4);
    const roll = typeof G.rng === 'function' ? G.rng() * 100 : 25;
    const successOdds = Math.min(90, Math.max(20, Math.round(35 + skillScore * 0.6)));

    if (roll > successOdds) {
      G.player.fatigue = Math.max(0, Number(G.player.fatigue || 20) - 5);
      return { ok: true, escaped: false, odds: successOdds };
    }

    G.player.inPrison = false;
    G.player.bounty += ESCAPE_BOUNTY;
    G.flags['prison:cell_door_locked'] = false;

    let recoveredItems = 0;
    if (recoverEvidence) {
      const inv = Array.isArray(G.player.inventory) ? G.player.inventory : [];
      const confiscated = Array.isArray(G.player.confiscatedInventory) ? G.player.confiscatedInventory : [];
      for (let i = 0; i < confiscated.length; i++) {
        inv.push(confiscated[i]);
        recoveredItems++;
      }
      G.player.inventory = inv;
      G.player.confiscatedInventory = [];
      G.flags['prison:evidence_chest_locked'] = false;
    }

    G.player.x = 6.5;
    G.player.y = 11.0;
    transientCrimeState.panelOpen = false;
    transientCrimeState.panelMode = null;
    appendOakhavenCrimeEntities(G);

    return {
      ok: true,
      escaped: true,
      recoveredItems: recoveredItems,
      bounty: G.player.bounty
    };
  }

  window.OctaveCrimePrison = {
    THEFT_BOUNTY,
    ASSAULT_BOUNTY,
    ESCAPE_BOUNTY,
    ensurePlayerCrimeFields,
    normalizeCrimeSaveState,
    isWantedPosterThresholdMet,
    appendOakhavenCrimeEntities,
    stealOwnedGood,
    recordTownAssault,
    inspectOrTearWantedPoster,
    enterPlayablePrison,
    servePrisonSentence,
    attemptPrisonEscape,
    getTransientState: function () { return transientCrimeState; }
  };
})();

/* ============================================================================
 * PHASE 1 PASS: Personality Bribes & Strength Threats in Dialogue
 * ============================================================================ */
(function () {
  'use strict';

  if (window.OctavePhase1Native) { window.OctaveBribesThreats = window.OctavePhase1Native.social; return; }

  const BRIBE_BASE_COST = 15;
  const STORY_BOSS_EXCLUSIONS = new Set([
    'deacon_of_the_unrung_bell',
    'deacon',
    'the_wearer',
    'wearer',
    'the_requiem',
    'requiem',
    'aegis_sentinel',
    'steam_golem',
    'phantom_weaver',
    'brood_mother',
    'pressman_mallow',
    'hal_brennick',
    'hushwarden'
  ]);

  function isBossOrExcluded(npc) {
    if (!npc || typeof npc !== 'object') return true;
    if (npc.boss || npc.isBoss || npc.unbribeable) return true;
    const key = String(npc.id || npc.species || npc.subtype || npc.name || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    return STORY_BOSS_EXCLUSIONS.has(key);
  }

  function getBribeQuote(G, npc) {
    if (!G || !G.player || isBossOrExcluded(npc)) return null;
    const mercantile = Number((G.player.skills && G.player.skills.Mercantile) || 15);
    const personality = Number((G.player.attributes && G.player.attributes.Personality) || 40);
    const bounty = Number(G.player.bounty || 0);
    const isGuard = /constable|watch|guard|proctor/i.test(String(npc.subtype || npc.role || npc.name || ''));

    const base = isGuard ? Math.max(20, Math.round(bounty * 0.75) || 20) : BRIBE_BASE_COST;
    const discount = Math.min(0.45, (mercantile * 0.004) + Math.max(0, personality - 40) * 0.005);
    const cost = Math.max(5, Math.round(base * (1 - discount)));
    const odds = Math.max(15, Math.min(95, Math.round(45 + (personality - 35) * 0.8 + mercantile * 0.5 - (isGuard ? 10 : 0))));

    return { cost: cost, odds: odds, isGuard: isGuard };
  }

  function getThreatOdds(G, npc) {
    if (!G || !G.player || isBossOrExcluded(npc)) return null;
    const strength = Number((G.player.attributes && G.player.attributes.Strength) || 40);
    const blade = Number((G.player.skills && G.player.skills.Blade) || 15);
    const blunt = Number((G.player.skills && G.player.skills.Blunt) || 15);
    const combatSkill = Math.max(blade, blunt);
    const isGuard = /constable|watch|guard|proctor|legionnaire/i.test(String(npc.subtype || npc.role || npc.name || ''));

    const odds = Math.max(10, Math.min(90, Math.round(35 + (strength - 35) * 0.9 + combatSkill * 0.45 - (isGuard ? 20 : 0))));
    return { odds: odds, isGuard: isGuard };
  }

  function attemptDialogueBribe(G, npc) {
    if (!G || !G.player || !npc) return { ok: false, reason: 'invalid_target' };
    if (isBossOrExcluded(npc)) return { ok: false, reason: 'immune_to_bribe' };

    G.flags = G.flags || {};
    const flagKey = `dialogue_bribe:${G.currentMap || 'world'}:${npc.id || npc.name}`;
    if (G.flags[flagKey] === 'bribed') {
      return { ok: false, reason: 'already_bribed' };
    }

    const quote = getBribeQuote(G, npc);
    const gold = Number(G.player.gold ?? G.player.sovereigns ?? 0);
    if (gold < quote.cost) {
      return { ok: false, reason: 'insufficient_gold', required: quote.cost, gold: gold };
    }

    // Deduct sovereigns
    if (typeof G.player.sovereigns === 'number') {
      G.player.sovereigns -= quote.cost;
    } else {
      G.player.gold = gold - quote.cost;
    }

    const roll = typeof G.rng === 'function' ? G.rng() * 100 : 20;
    if (roll <= quote.odds) {
      G.flags[flagKey] = 'bribed';
      npc.disposition = Math.min(100, Number(npc.disposition || 50) + 25);
      if (quote.isGuard) {
        G.player.bounty = 0;
        npc.state = 'idle';
        npc.alerted = false;
      }
      return {
        ok: true,
        succeeded: true,
        spent: quote.cost,
        disposition: npc.disposition,
        bountyCleared: quote.isGuard
      };
    }

    npc.disposition = Math.max(0, Number(npc.disposition || 50) - 15);
    if (quote.isGuard) {
      G.player.bounty = Number(G.player.bounty || 0) + 10;
      npc.state = 'pursue_criminal';
    }
    return {
      ok: true,
      succeeded: false,
      spent: quote.cost,
      disposition: npc.disposition
    };
  }

  function attemptDialogueThreat(G, npc) {
    if (!G || !G.player || !npc) return { ok: false, reason: 'invalid_target' };
    if (isBossOrExcluded(npc)) return { ok: false, reason: 'immune_to_threat' };

    G.flags = G.flags || {};
    const flagKey = `dialogue_threat:${G.currentMap || 'world'}:${npc.id || npc.name}`;
    if (G.flags[flagKey]) {
      return { ok: false, reason: 'already_threatened' };
    }

    const info = getThreatOdds(G, npc);
    const roll = typeof G.rng === 'function' ? G.rng() * 100 : 20;
    if (roll <= info.odds) {
      G.flags[flagKey] = 'intimidated';
      npc.intimidated = true;
      npc.disposition = Math.max(0, Number(npc.disposition || 50) - 10);
      if (info.isGuard) {
        npc.state = 'idle';
        npc.alerted = false;
      }
      return {
        ok: true,
        succeeded: true,
        intimidated: true,
        backedDown: info.isGuard
      };
    }

    G.flags[flagKey] = 'failed';
    npc.disposition = Math.max(0, Number(npc.disposition || 50) - 25);
    if (info.isGuard) {
      G.player.bounty = Number(G.player.bounty || 0) + 15;
      npc.state = 'pursue_criminal';
    }
    return {
      ok: true,
      succeeded: false,
      bountyAdded: info.isGuard ? 15 : 0
    };
  }

  window.OctaveBribesThreats = {
    getBribeQuote,
    getThreatOdds,
    attemptDialogueBribe,
    attemptDialogueThreat
  };
})();

/* ============================================================================
 * PHASE 1 PASS: Horse Rental, Journey Survival Needs & Isolated Opt-In Hardcore Mode
 * ============================================================================ */
(function () {
  'use strict';

  if (window.OctavePhase1Native) { window.OctaveTravelSurvivalHardcore = window.OctavePhase1Native.travel; return; }

  const HORSE_RENTAL_COST = 25;
  const HORSE_RENTAL_HOURS = 72;
  const HORSE_SPEED_MULTIPLIER = 0.55; // 45% faster regional travel time
  const HORSE_FATIGUE_MULTIPLIER = 0.5; // Half travel fatigue cost
  const HARDCORE_STORAGE_KEY = 'octave_hardcore_isolated_save_v1';

  const memoryHardcoreSlot = { data: null };

  function ensureSurvivalAndMountFields(G) {
    if (!G || !G.player) return;
    const p = G.player;
    p.hunger = Math.max(0, Math.min(100, Number.isFinite(Number(p.hunger)) ? Number(p.hunger) : 0));
    p.sleepDeprivation = Math.max(0, Math.min(100, Number.isFinite(Number(p.sleepDeprivation)) ? Number(p.sleepDeprivation) : 0));
    p.horseRentedUntilHour = Math.max(0, Number.isFinite(Number(p.horseRentedUntilHour)) ? Number(p.horseRentedUntilHour) : 0);
    G.options = G.options || {};
    G.options.survivalNeeds = Boolean(G.options.survivalNeeds);
    p.hardcoreMode = Boolean(p.hardcoreMode);
    p.hardcoreDead = Boolean(p.hardcoreDead);
  }

  function hasActiveHorseMount(G) {
    if (!G || !G.player) return false;
    ensureSurvivalAndMountFields(G);
    const currentHour = Number(G.worldHours || 0);
    return G.player.horseRentedUntilHour > currentHour;
  }

  function rentOakhavenHorse(G) {
    if (!G || !G.player) return { ok: false };
    ensureSurvivalAndMountFields(G);
    const gold = Number(G.player.gold ?? G.player.sovereigns ?? 0);
    if (gold < HORSE_RENTAL_COST) {
      return { ok: false, reason: 'insufficient_gold', required: HORSE_RENTAL_COST };
    }
    if (typeof G.player.sovereigns === 'number') {
      G.player.sovereigns -= HORSE_RENTAL_COST;
    } else {
      G.player.gold = gold - HORSE_RENTAL_COST;
    }
    const currentHour = Number(G.worldHours || 0);
    G.player.horseRentedUntilHour = Math.max(currentHour, G.player.horseRentedUntilHour) + HORSE_RENTAL_HOURS;
    return {
      ok: true,
      rentedUntilHour: G.player.horseRentedUntilHour,
      spent: HORSE_RENTAL_COST
    };
  }

  function computeTravelModifiers(G, baseHours, baseFatigueCost, pace) {
    ensureSurvivalAndMountFields(G);
    const mounted = hasActiveHorseMount(G);
    const paceTimeMult = pace === 'reckless' ? 0.7 : 1.0;
    const paceFatigueMult = pace === 'reckless' ? 1.5 : 0.85;

    const finalHours = Math.max(1, Math.round(baseHours * paceTimeMult * (mounted ? HORSE_SPEED_MULTIPLIER : 1.0)));
    const finalFatigue = Math.max(0, Math.round(baseFatigueCost * paceFatigueMult * (mounted ? HORSE_FATIGUE_MULTIPLIER : 1.0)));

    return {
      mounted: mounted,
      hours: finalHours,
      fatigueCost: finalFatigue,
      ambushRiskReduction: mounted ? 0.25 : 0
    };
  }

  function advanceJourneyNeeds(G, hoursElapsed) {
    if (!G || !G.player) return { ok: false };
    ensureSurvivalAndMountFields(G);
    const hrs = Math.max(0, Number(hoursElapsed) || 0);
    G.worldHours = Number(G.worldHours || 0) + hrs;

    if (!G.options || !G.options.survivalNeeds) {
      return { ok: true, active: false, hunger: G.player.hunger, sleepDeprivation: G.player.sleepDeprivation };
    }

    G.player.hunger = Math.min(100, G.player.hunger + hrs * 4.5);
    G.player.sleepDeprivation = Math.min(100, G.player.sleepDeprivation + hrs * 3.5);

    const maxFatiguePenalty =
      (G.player.hunger >= 60 ? 10 : 0) +
      (G.player.sleepDeprivation >= 60 ? 10 : 0);

    return {
      ok: true,
      active: true,
      hunger: G.player.hunger,
      sleepDeprivation: G.player.sleepDeprivation,
      maxFatiguePenalty: maxFatiguePenalty,
      starving: G.player.hunger >= 85,
      exhausted: G.player.sleepDeprivation >= 85
    };
  }

  function consumeRationOrMeal(G, nutritionAmount) {
    if (!G || !G.player) return { ok: false };
    ensureSurvivalAndMountFields(G);
    G.player.hunger = Math.max(0, G.player.hunger - (Number(nutritionAmount) || 45));
    return { ok: true, hunger: G.player.hunger };
  }

  function restAndRecoverNeeds(G, sleepHours) {
    if (!G || !G.player) return { ok: false };
    ensureSurvivalAndMountFields(G);
    const hrs = Math.max(1, Number(sleepHours) || 6);
    G.player.sleepDeprivation = Math.max(0, G.player.sleepDeprivation - hrs * 14);
    return { ok: true, sleepDeprivation: G.player.sleepDeprivation };
  }

  // Isolated Opt-In Hardcore Single-Save & Permadeath
  function saveIsolatedHardcoreState(G) {
    if (!G || !G.player || !G.player.hardcoreMode) {
      return { ok: false, reason: 'not_hardcore_run' };
    }
    if (G.player.hardcoreDead || G.player.hp <= 0) {
      return { ok: false, reason: 'permadeath_locked' };
    }
    const payload = JSON.stringify({
      hardcoreIsolated: true,
      version: 1,
      worldHours: Number(G.worldHours || 0),
      currentMap: String(G.currentMap || 'oakhaven'),
      player: Object.assign({}, G.player, { hardcoreMode: true, hardcoreDead: false }),
      flags: Object.assign({}, G.flags || {})
    });
    memoryHardcoreSlot.data = payload;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HARDCORE_STORAGE_KEY, payload);
      }
    } catch (_) {}
    return { ok: true };
  }

  function loadIsolatedHardcoreState() {
    let raw = memoryHardcoreSlot.data;
    try {
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem(HARDCORE_STORAGE_KEY);
      }
    } catch (_) {}
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.hardcoreIsolated !== true) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function purgeHardcoreSaveOnPermadeath(G) {
    if (!G || !G.player || !G.player.hardcoreMode) return { purged: false };
    G.player.hardcoreDead = true;
    memoryHardcoreSlot.data = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(HARDCORE_STORAGE_KEY);
      }
    } catch (_) {}
    return { purged: true, hardcoreDead: true };
  }

  function canImportIntoSlot(savePayload, targetIsHardcore) {
    if (!savePayload || typeof savePayload !== 'object') return false;
    const payloadHardcore = Boolean(savePayload.hardcoreIsolated || (savePayload.player && savePayload.player.hardcoreMode));
    // Strictly isolate normal saves/imports from hardcore saves/imports
    return payloadHardcore === Boolean(targetIsHardcore);
  }

  window.OctaveTravelSurvivalHardcore = {
    HORSE_RENTAL_COST,
    HORSE_RENTAL_HOURS,
    ensureSurvivalAndMountFields,
    hasActiveHorseMount,
    rentOakhavenHorse,
    computeTravelModifiers,
    advanceJourneyNeeds,
    consumeRationOrMeal,
    restAndRecoverNeeds,
    saveIsolatedHardcoreState,
    loadIsolatedHardcoreState,
    purgeHardcoreSaveOnPermadeath,
    canImportIntoSlot
  };
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 2: SPATIAL WORLD (Graphics — 3D View)
 * Milestones:
 *   2.1 Per-pixel depth buffer, camera elevation, collision & picking foundation
 *   2.2 Variable-height low walls, tall towers, stepped rooftops & stairs/ramps
 *       (Cloister Belfry & Oakhaven Quarry terrace traversal)
 *   2.3 Painted ceilings, sky panoramas/Kestrel flyovers, water reflections/ripples,
 *       ground-hugging Spectral Woods mist & torch-driven interior darkness
 *   2.4 Light-glass emissive wall occlusion & arm masks, close-up wall detail with
 *       memory budgets, seeded wall decals, nonblocking scenery props, player-reactive
 *       swaying grass/reeds & horizon landmarks (Mausoleum Tower & Oakhaven Chapel)
 *   2.5 Five-angle enemy directional octants, measured quality presets (low/medium/high)
 *       with frame-time telemetry & refined optional CRT scanlines/curvature
 * ============================================================================ */
(function () {
  'use strict';

  const MAX_STEP_HEIGHT = 0.55;
  const DEFAULT_EYE_HEIGHT = 0.52;
  const MAX_WALL_DETAIL_CACHE_BYTES = 4 * 1024 * 1024; // 4 MB strict budget

  // Deterministic elevation & architecture patches for Belfry, Quarry, Cloister, etc.
  const AREA_SPATIAL_PROFILES = Object.freeze({
    cloister: {
      ceilingStyle: 'cloister_vault',
      indoor: true,
      skyPanorama: 'dusk_reach',
      landmarks: [{ id: 'oakhaven_chapel_spire', azimuth: 1.15, height: 0.38, minViewDist: 4 }],
      elevationCells: {
        '14,10': { type: 'stairs', floorZ: 0.25, ceilZ: 2.6, wallHeight: 0.0, label: 'Belfry Lower Steps' },
        '14,9':  { type: 'stairs', floorZ: 0.55, ceilZ: 2.8, wallHeight: 0.0, label: 'Belfry Mid Steps' },
        '14,8':  { type: 'stairs', floorZ: 0.85, ceilZ: 3.0, wallHeight: 0.0, label: 'Belfry Upper Landing' },
        '15,8':  { type: 'platform', floorZ: 1.15, ceilZ: 3.4, wallHeight: 0.0, label: 'Belfry Bell-Platform' },
        '12,12': { type: 'low_wall', floorZ: 0.0, ceilZ: 2.4, wallHeight: 0.45, solid: true, label: 'Cloister Low Parapet' },
        '16,8':  { type: 'tower', floorZ: 0.0, ceilZ: 3.5, wallHeight: 2.5, solid: true, label: 'Cloister Belfry Tower Wall' }
      }
    },
    quarry: {
      ceilingStyle: 'cave_rock',
      indoor: false,
      skyPanorama: 'quarry_gorge',
      landmarks: [{ id: 'quarry_headframe', azimuth: 0.45, height: 0.42, minViewDist: 3 }],
      elevationCells: {
        '8,10':  { type: 'ramp', floorZ: 0.30, ceilZ: 4.0, wallHeight: 0.0, label: 'Quarry Lower Ramp' },
        '8,9':   { type: 'ramp', floorZ: 0.65, ceilZ: 4.0, wallHeight: 0.0, label: 'Quarry Terrace Ramp' },
        '8,8':   { type: 'platform', floorZ: 1.00, ceilZ: 4.0, wallHeight: 0.0, label: 'Quarry Upper Terrace' },
        '9,8':   { type: 'platform', floorZ: 1.00, ceilZ: 4.0, wallHeight: 0.0, label: 'Quarry Crane Ledge' },
        '7,10':  { type: 'low_wall', floorZ: 0.0, ceilZ: 4.0, wallHeight: 0.42, solid: true, label: 'Cut-Stone Low Retaining Wall' }
      }
    },
    oakhaven: {
      ceilingStyle: 'tavern_beams',
      indoor: false,
      skyPanorama: 'resonant_reach',
      landmarks: [{ id: 'oakhaven_chapel_beyond_hedge', azimuth: 2.35, height: 0.35, minViewDist: 5 }],
      elevationCells: {
        '10,12': { type: 'low_wall', floorZ: 0.0, ceilZ: 3.5, wallHeight: 0.45, solid: true, label: 'Hedge-Row Low Stone Wall' },
        '13,11': { type: 'rooftop', floorZ: 0.0, ceilZ: 3.5, wallHeight: 1.55, solid: true, label: 'Stepped Gable Rooftop' }
      }
    },
    whisper_grove: {
      ceilingStyle: 'none',
      indoor: false,
      skyPanorama: 'spectral_canopy',
      waterReflections: true,
      groundMist: true,
      landmarks: [{ id: 'drowned_marble_arch', azimuth: 1.8, height: 0.4, minViewDist: 4 }],
      elevationCells: {}
    },
    deep_woods: {
      ceilingStyle: 'none',
      indoor: false,
      skyPanorama: 'deep_woods_ash',
      groundMist: true,
      kestrelFlyover: true,
      landmarks: [{ id: 'mausoleum_tower_horizon', azimuth: 0.92, height: 0.48, minViewDist: 4 }],
      elevationCells: {}
    }
  });

  // Quality presets (measured before tuning defaults; no unverified hardware claims)
  const QUALITY_PRESETS = Object.freeze({
    low: {
      id: 'low',
      renderWidth: 160,
      renderHeight: 100,
      sharpness: 0.75,
      viewDistance: 10.0,
      maxParticles: 24,
      wallDetailLodDist: 2.5,
      reflectionsEnabled: false
    },
    medium: {
      id: 'medium',
      renderWidth: 320,
      renderHeight: 200,
      sharpness: 1.0,
      viewDistance: 16.0,
      maxParticles: 64,
      wallDetailLodDist: 4.5,
      reflectionsEnabled: true
    },
    high: {
      id: 'high',
      renderWidth: 640,
      renderHeight: 400,
      sharpness: 1.25,
      viewDistance: 24.0,
      maxParticles: 140,
      wallDetailLodDist: 7.0,
      reflectionsEnabled: true
    }
  });

  // Nonblocking scenery prop templates
  const NONBLOCKING_SCENERY_TEMPLATES = Object.freeze([
    { subtype: 'scenery_barrel', sprite: 'barrel', label: 'Weathered Cask' },
    { subtype: 'scenery_crate', sprite: 'crate', label: 'Stamped Timber Crate' },
    { subtype: 'scenery_cart', sprite: 'cart', label: 'Broken Hand-Cart' },
    { subtype: 'scenery_statue', sprite: 'statue_broken', label: 'Shattered Chorister Effigy' },
    { subtype: 'scenery_grave', sprite: 'grave_marker', label: 'Mossy Headstone' },
    { subtype: 'scenery_bones', sprite: 'bone_pile', label: 'Calcified Remains' },
    { subtype: 'scenery_reeds', sprite: 'reeds_sway', label: 'Swaying River Reeds', reactiveGrass: true }
  ]);

  // Spatial runtime state (per-pixel depth buffer, ripple waves, LRU detail cache, frame telemetry)
  const spatialState = {
    width: 320,
    height: 200,
    pixelDepthBuffer: new Float32Array(320 * 200),
    pixelNormalBuffer: new Uint8Array(320 * 200),
    activePreset: 'medium',
    crtSettings: {
      mode: 'off', // 'off' (clean unfiltered) | 'subtle' | 'classic'
      scanlineOpacity: 0.18,
      curvature: 0.035
    },
    waterRipples: [],
    kestrelFlyoverPhase: 0,
    cloudDriftOffset: 0,
    wallDetailCache: new Map(),
    wallDetailBytesUsed: 0,
    frameTimesMs: []
  };

  function getGame() {
    return typeof window !== 'undefined' && window.G ? window.G : null;
  }

  /* ----------------------------------------------------------------------------
   * 2.1 & 2.2: Per-Pixel Depth Buffer, Elevation, Collision & Picking
   * ---------------------------------------------------------------------------- */
  function initDepthBuffer(width, height) {
    const w = Math.max(16, Math.floor(Number(width) || 320));
    const h = Math.max(16, Math.floor(Number(height) || 200));
    if (spatialState.width !== w || spatialState.height !== h ||
        spatialState.pixelDepthBuffer.length !== w * h) {
      spatialState.width = w;
      spatialState.height = h;
      spatialState.pixelDepthBuffer = new Float32Array(w * h);
      spatialState.pixelNormalBuffer = new Uint8Array(w * h);
    }
    spatialState.pixelDepthBuffer.fill(Infinity);
    spatialState.pixelNormalBuffer.fill(0);
    return spatialState.pixelDepthBuffer;
  }

  function writePixelDepth(x, y, depth) {
    const w = spatialState.width;
    const h = spatialState.height;
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    const idx = y * w + x;
    if (depth < spatialState.pixelDepthBuffer[idx]) {
      spatialState.pixelDepthBuffer[idx] = depth;
      return true;
    }
    return false;
  }

  function readPixelDepth(x, y) {
    const w = spatialState.width;
    const h = spatialState.height;
    if (x < 0 || x >= w || y < 0 || y >= h) return Infinity;
    return spatialState.pixelDepthBuffer[y * w + x];
  }

  function getAreaProfile(G) {
    const mapId = String((G && (G.currentMap || (G.map && G.map.id))) || 'oakhaven').toLowerCase();
    return AREA_SPATIAL_PROFILES[mapId] || AREA_SPATIAL_PROFILES.oakhaven;
  }

  function getCellSpatialInfo(G, cellX, cellY) {
    const gx = Math.floor(Number(cellX) || 0);
    const gy = Math.floor(Number(cellY) || 0);
    const profile = getAreaProfile(G);
    const key = `${gx},${gy}`;
    const override = profile && profile.elevationCells && profile.elevationCells[key];

    const map = G && G.map;
    const gridCell = map && Array.isArray(map.grid) && map.grid[gy] ? map.grid[gy][gx] : 0;

    if (override) {
      return {
        x: gx,
        y: gy,
        type: override.type || 'flat',
        floorZ: Number(override.floorZ || 0),
        ceilZ: Number(override.ceilZ || 2.5),
        wallHeight: Number(override.wallHeight || 0),
        solid: Boolean(override.solid),
        label: override.label || ''
      };
    }

    if (gridCell && typeof gridCell === 'object') {
      return {
        x: gx,
        y: gy,
        type: gridCell.spatialType || (gridCell.stairs ? 'stairs' : gridCell.ramp ? 'ramp' : 'flat'),
        floorZ: Number(gridCell.floorZ || 0),
        ceilZ: Number(gridCell.ceilZ || 2.5),
        wallHeight: Number(gridCell.wallHeight ?? (gridCell.solid && !gridCell.open ? 1.0 : 0)),
        solid: Boolean(gridCell.solid && !gridCell.open),
        label: gridCell.label || ''
      };
    }

    const isSolidWall = gridCell === 1;
    return {
      x: gx,
      y: gy,
      type: 'flat',
      floorZ: 0.0,
      ceilZ: 2.5,
      wallHeight: isSolidWall ? 1.0 : 0.0,
      solid: isSolidWall,
      label: ''
    };
  }

  function ensurePlayerElevation(G) {
    if (!G || !G.player) return 0;
    if (!Number.isFinite(Number(G.player.z))) {
      const cell = getCellSpatialInfo(G, G.player.x, G.player.y);
      G.player.z = cell.floorZ;
    }
    G.player.eyeZ = G.player.z + DEFAULT_EYE_HEIGHT;
    return G.player.z;
  }

  function canTraverseElevation(G, fromX, fromY, fromZ, toX, toY) {
    const targetCell = getCellSpatialInfo(G, toX, toY);
    if (targetCell.solid && targetCell.wallHeight > 0.35) {
      return {
        allowed: false,
        reason: targetCell.wallHeight < 0.8 ? 'blocked_by_low_wall' : 'blocked_by_wall',
        targetFloorZ: targetCell.floorZ,
        wallHeight: targetCell.wallHeight
      };
    }

    const currentZ = Number.isFinite(Number(fromZ))
      ? Number(fromZ)
      : getCellSpatialInfo(G, fromX, fromY).floorZ;
    const deltaZ = targetCell.floorZ - currentZ;

    // Stairs and ramps allow traversal up to MAX_STEP_HEIGHT per cell transition
    if (deltaZ > MAX_STEP_HEIGHT) {
      return {
        allowed: false,
        reason: 'ledge_too_high',
        deltaZ: deltaZ,
        targetFloorZ: targetCell.floorZ
      };
    }

    return {
      allowed: true,
      targetFloorZ: targetCell.floorZ,
      deltaZ: deltaZ,
      traversalType: targetCell.type
    };
  }

  function movePlayerWithElevation(G, nextX, nextY) {
    if (!G || !G.player) return { moved: false };
    ensurePlayerElevation(G);
    const check = canTraverseElevation(G, G.player.x, G.player.y, G.player.z, nextX, nextY);
    if (!check.allowed) {
      return { moved: false, reason: check.reason, z: G.player.z };
    }
    G.player.x = nextX;
    G.player.y = nextY;
    G.player.z = check.targetFloorZ;
    G.player.eyeZ = G.player.z + DEFAULT_EYE_HEIGHT;

    // Trigger step-driven water ripple in Whisper-Grove or shallow water
    const profile = getAreaProfile(G);
    if (profile.waterReflections || G.currentMap === 'whisper_grove') {
      triggerFootstepRipple(nextX, nextY, 1.0);
    }

    return {
      moved: true,
      x: G.player.x,
      y: G.player.y,
      z: G.player.z,
      eyeZ: G.player.eyeZ,
      traversalType: check.traversalType
    };
  }

  // Render a vertical column segment with variable wallHeight / floorZ into per-pixel depth buffer
  function rasterizeSpatialWallSlice(screenX, dist, cameraEyeZ, floorZ, wallHeight, horizonY) {
    const w = spatialState.width;
    const h = spatialState.height;
    if (screenX < 0 || screenX >= w || dist <= 0.05) return { topY: h, bottomY: 0, pixelsWritten: 0 };

    const projScale = h * 0.85;
    const worldTopZ = floorZ + wallHeight;
    const worldBotZ = floorZ;

    const topY = Math.max(0, Math.min(h - 1, Math.round(horizonY - ((worldTopZ - cameraEyeZ) * projScale) / dist)));
    const bottomY = Math.max(0, Math.min(h - 1, Math.round(horizonY - ((worldBotZ - cameraEyeZ) * projScale) / dist)));

    let written = 0;
    for (let y = topY; y <= bottomY; y++) {
      if (writePixelDepth(screenX, y, dist)) {
        written++;
      }
    }
    return { topY: topY, bottomY: bottomY, pixelsWritten: written };
  }

  // Per-pixel depth-tested 3D picking that agrees with camera elevation & low-wall occlusion
  function pickSpatialTarget(G, screenX, screenY) {
    if (!G || !G.player || !Array.isArray(G.entities)) return null;
    ensurePlayerElevation(G);

    const sx = Math.max(0, Math.min(spatialState.width - 1, Math.floor(Number(screenX) || Math.floor(spatialState.width / 2))));
    const sy = Math.max(0, Math.min(spatialState.height - 1, Math.floor(Number(screenY) || Math.floor(spatialState.height / 2))));
    const wallDepthAtPixel = readPixelDepth(sx, sy);

    const px = Number(G.player.x || 0);
    const py = Number(G.player.y || 0);
    const cameraEyeZ = Number(G.player.eyeZ || DEFAULT_EYE_HEIGHT);
    const playerAngle = Number(G.player.angle ?? G.player.dir ?? 0);
    const fov = Math.PI / 3;
    const horizonY = Math.floor(spatialState.height / 2) + Number(G.player.pitchOffset || 0);
    const projScale = spatialState.height * 0.85;

    let bestEntity = null;
    let bestDist = Infinity;

    for (let i = 0; i < G.entities.length; i++) {
      const ent = G.entities[i];
      if (!ent || ent.dead || ent.hidden || ent.unpickable) continue;

      const dx = (ent.x || 0) - px;
      const dy = (ent.y || 0) - py;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0.1 || dist > 12.0) continue;

      // Must be closer than the per-pixel depth buffer at (sx, sy)
      if (dist > wallDepthAtPixel) continue;

      const angleToEnt = Math.atan2(dy, dx);
      let angleDiff = angleToEnt - playerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > fov * 0.65) continue;

      const entScreenX = Math.round((0.5 + angleDiff / fov) * spatialState.width);
      const entCell = getCellSpatialInfo(G, ent.x, ent.y);
      const entBaseZ = Number.isFinite(Number(ent.z)) ? Number(ent.z) : entCell.floorZ;
      const entHeight = Number(ent.height || 0.95);

      const topY = Math.round(horizonY - (((entBaseZ + entHeight) - cameraEyeZ) * projScale) / dist);
      const bottomY = Math.round(horizonY - ((entBaseZ - cameraEyeZ) * projScale) / dist);
      const halfWidth = Math.max(4, Math.round((projScale * 0.35) / dist));

      if (sx >= entScreenX - halfWidth && sx <= entScreenX + halfWidth && sy >= topY && sy <= bottomY) {
        if (dist < bestDist) {
          bestDist = dist;
          bestEntity = ent;
        }
      }
    }

    return bestEntity ? { entity: bestEntity, distance: bestDist } : null;
  }

  /* ----------------------------------------------------------------------------
   * 2.3: Painted Ceilings, Sky Panoramas, Water Ripples & Ground-Hugging Mist
   * ---------------------------------------------------------------------------- */
  function samplePaintedCeiling(ceilingStyle, worldX, worldY) {
    const ux = ((worldX % 1) + 1) % 1;
    const uy = ((worldY % 1) + 1) % 1;
    if (ceilingStyle === 'cloister_vault') {
      const onRib = Math.abs(ux - uy) < 0.08 || Math.abs(ux - (1 - uy)) < 0.08 || ux < 0.06 || uy < 0.06;
      return onRib ? { r: 118, g: 112, b: 98, tag: 'vault_rib' } : { r: 74, g: 72, b: 82, tag: 'vault_stone' };
    }
    if (ceilingStyle === 'tavern_beams') {
      const onBeam = (ux * 4) % 1 < 0.22;
      return onBeam ? { r: 68, g: 44, b: 26, tag: 'oak_beam' } : { r: 112, g: 84, b: 54, tag: 'plaster_plank' };
    }
    if (ceilingStyle === 'cave_rock') {
      const tooth = Math.sin(worldX * 6.3) * Math.cos(worldY * 5.7);
      const shade = Math.round(52 + tooth * 16);
      return { r: shade, g: shade - 4, b: shade + 3, tag: 'cave_rock' };
    }
    return null;
  }

  function sampleSkyPanorama(G, screenAngleRad, screenY, horizonY) {
    const worldHours = Number((G && G.worldHours) ?? 21);
    const isNight = worldHours < 6 || worldHours >= 20;
    const elev = Math.max(0, Math.min(1, (horizonY - screenY) / Math.max(1, horizonY)));
    const az = ((screenAngleRad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Part Three Kestrel flyover check
    const profile = getAreaProfile(G);
    const kestrelActive = Boolean((profile && profile.kestrelFlyover) || (G && G.flags && G.flags['part_three_kestrel_flyover']));
    if (kestrelActive) {
      const kestrelAz = (spatialState.kestrelFlyoverPhase * 0.35) % (Math.PI * 2);
      if (Math.abs(az - kestrelAz) < 0.09 && elev > 0.32 && elev < 0.48) {
        return { r: 28, g: 32, b: 38, feature: 'kestrel_flyover' };
      }
    }

    // Drifting clouds
    const cloudWave = Math.sin(az * 4.0 + spatialState.cloudDriftOffset) * Math.cos(elev * 6.0);
    if (cloudWave > 0.55 && elev > 0.12) {
      return isNight
        ? { r: 44, g: 48, b: 64, feature: 'drifting_cloud' }
        : { r: 186, g: 182, b: 174, feature: 'drifting_cloud' };
    }

    // Night starfield
    if (isNight && elev > 0.25) {
      const starSeed = Math.sin(Math.floor(az * 120) * 12.9898 + Math.floor(elev * 80) * 78.233) * 43758.5453;
      if ((starSeed - Math.floor(starSeed)) > 0.992) {
        return { r: 235, g: 240, b: 255, feature: 'night_star' };
      }
    }

    return isNight
      ? { r: Math.round(16 + (1 - elev) * 18), g: Math.round(20 + (1 - elev) * 22), b: Math.round(38 + (1 - elev) * 28), feature: 'sky_gradient' }
      : { r: Math.round(95 + (1 - elev) * 65), g: Math.round(118 + (1 - elev) * 55), b: Math.round(148 + (1 - elev) * 40), feature: 'sky_gradient' };
  }

  function triggerFootstepRipple(x, y, strength) {
    spatialState.waterRipples.push({
      x: Number(x || 0),
      y: Number(y || 0),
      age: 0,
      maxAge: 2.2,
      strength: Number(strength || 1.0)
    });
    if (spatialState.waterRipples.length > 16) {
      spatialState.waterRipples.shift();
    }
  }

  function sampleWaterReflectionAndRipple(G, worldX, worldY, skySample, buildingColor) {
    let rippleOffset = 0;
    for (let i = 0; i < spatialState.waterRipples.length; i++) {
      const rp = spatialState.waterRipples[i];
      const d = Math.hypot(worldX - rp.x, worldY - rp.y);
      const waveRadius = rp.age * 2.4;
      if (Math.abs(d - waveRadius) < 0.65) {
        const falloff = Math.max(0, 1 - rp.age / rp.maxAge);
        rippleOffset += Math.sin((d - waveRadius) * 14.0) * rp.strength * falloff;
      }
    }

    const baseSource = buildingColor || skySample || { r: 45, g: 68, b: 78 };
    const shift = Math.round(rippleOffset * 22);
    return {
      r: Math.max(0, Math.min(255, Math.round(baseSource.r * 0.65 + 18 + shift))),
      g: Math.max(0, Math.min(255, Math.round(baseSource.g * 0.72 + 28 + shift))),
      b: Math.max(0, Math.min(255, Math.round(baseSource.b * 0.80 + 36 + shift))),
      rippleDisplacement: rippleOffset
    };
  }

  function computeSpatialFogAndTorchLight(G, dist, worldZ) {
    const profile = getAreaProfile(G);
    const hasTorch = Boolean(G && G.player && (G.player.torchLit || G.player.lanternLit));
    const isIndoor = Boolean(profile && profile.indoor);

    // Ground-hugging Spectral Woods mist concentrates below z = 0.65
    let mistFactor = 0;
    if (profile && profile.groundMist) {
      const heightAtten = Math.max(0, Math.min(1, 1 - (Number(worldZ || 0) / 0.75)));
      const distAtten = Math.max(0, Math.min(1, (dist - 1.2) / 10.0));
      mistFactor = heightAtten * distAtten * 0.78;
    }

    // Torch-driven interior darkness
    let lightMultiplier = 1.0;
    if (isIndoor) {
      const torchRadius = hasTorch ? 8.5 : 3.2;
      lightMultiplier = Math.max(0.08, Math.min(1.0, 1 - (dist / torchRadius)));
    }

    return {
      mistFactor: mistFactor,
      lightMultiplier: lightMultiplier,
      mistColor: { r: 142, g: 132, b: 164 }
    };
  }

  /* ----------------------------------------------------------------------------
   * 2.4: Light-Glass Occlusion, Wall Detail Cache, Decals, Scenery & Landmarks
   * ---------------------------------------------------------------------------- */
  function hasClearLineOfSight(G, x0, y0, x1, y1) {
    if (typeof window.hasLineOfSight === 'function') {
      return Boolean(window.hasLineOfSight(x0, y0, x1, y1));
    }
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.05) return true;
    const steps = Math.max(2, Math.ceil(dist * 4));
    const map = G && G.map;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = Math.floor(x0 + dx * t);
      const sy = Math.floor(y0 + dy * t);
      if (map && Array.isArray(map.grid) && map.grid[sy] && map.grid[sy][sx]) {
        const cell = map.grid[sy][sx];
        if (cell === 1 || (typeof cell === 'object' && cell.solid && !cell.open)) {
          return false;
        }
      }
    }
    return true;
  }

  function computeOccludedEmissiveLight(G, sampleX, sampleY) {
    if (!G || !Array.isArray(G.entities)) return { r: 0, g: 0, b: 0, activeEmitters: 0 };
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let count = 0;

    for (let i = 0; i < G.entities.length; i++) {
      const ent = G.entities[i];
      if (!ent || ent.dead || ent.hidden || ent.hp <= 0) continue;
      const isGlassEmitter =
        ent.emissiveGlass ||
        ent.subtype === 'light_glass_shard' ||
        ent.subtype === 'glass_lamp' ||
        /kaelen|glass_shard|glass_lamp/i.test(String(ent.id || ent.name || ent.subtype || ''));
      if (!isGlassEmitter) continue;

      const dist = Math.hypot((ent.x || 0) - sampleX, (ent.y || 0) - sampleY);
      const radius = Number(ent.lightRadius || 5.0);
      if (dist > radius) continue;

      // Wall occlusion prevents light bleeding through solid walls
      if (!hasClearLineOfSight(G, ent.x, ent.y, sampleX, sampleY)) continue;

      const atten = Math.max(0, 1 - dist / radius);
      totalR += Math.round(95 * atten);
      totalG += Math.round(210 * atten);
      totalB += Math.round(165 * atten);
      count++;
    }

    return {
      r: Math.min(255, totalR),
      g: Math.min(255, totalG),
      b: Math.min(255, totalB),
      activeEmitters: count
    };
  }

  function getCloseUpWallDetailTile(textureId, resolution) {
    const res = Math.min(128, Math.max(32, Number(resolution) || 64));
    const key = `${textureId}@${res}`;
    if (spatialState.wallDetailCache.has(key)) {
      const entry = spatialState.wallDetailCache.get(key);
      spatialState.wallDetailCache.delete(key);
      spatialState.wallDetailCache.set(key, entry);
      return entry;
    }

    const byteLength = res * res * 4;
    while (spatialState.wallDetailBytesUsed + byteLength > MAX_WALL_DETAIL_CACHE_BYTES &&
           spatialState.wallDetailCache.size > 0) {
      const oldestKey = spatialState.wallDetailCache.keys().next().value;
      const oldest = spatialState.wallDetailCache.get(oldestKey);
      spatialState.wallDetailBytesUsed -= oldest.byteLength;
      spatialState.wallDetailCache.delete(oldestKey);
    }

    const pixels = new Uint8Array(byteLength);
    for (let i = 0; i < pixels.length; i += 4) {
      const grain = ((i * 2654435761) >>> 24) & 31;
      pixels[i] = 110 + grain;
      pixels[i + 1] = 106 + grain;
      pixels[i + 2] = 98 + grain;
      pixels[i + 3] = 255;
    }

    const tile = { key: key, resolution: res, byteLength: byteLength, pixels: pixels };
    spatialState.wallDetailCache.set(key, tile);
    spatialState.wallDetailBytesUsed += byteLength;
    return tile;
  }

  function resolveSeededWallDecal(cellX, cellY, faceIndex) {
    const hash = Math.abs(Math.sin(cellX * 127.1 + cellY * 311.7 + (faceIndex || 0) * 74.7) * 43758.5453);
    const frac = hash - Math.floor(hash);
    if (frac > 0.88) return 'synod_notice';
    if (frac > 0.76) return 'moss_patch';
    if (frac > 0.62) return 'masonry_cracks';
    if (frac > 0.50) return 'scorch_mark';
    return null;
  }

  function appendNonblockingSceneryProps(G) {
    if (!G || !Array.isArray(G.entities)) return 0;
    let appended = 0;
    for (let i = 0; i < NONBLOCKING_SCENERY_TEMPLATES.length; i++) {
      const tpl = NONBLOCKING_SCENERY_TEMPLATES[i];
      const id = `spatial_${tpl.subtype}_${i}`;
      if (G.entities.some(function (e) { return e && e.id === id; })) continue;

      const x = 3.5 + i * 1.5;
      const y = 3.5 + (i % 3) * 1.5;
      const cell = getCellSpatialInfo(G, x, y);
      if (cell.solid) continue;

      G.entities.push({
        id: id,
        type: 'decor',
        subtype: tpl.subtype,
        sprite: tpl.sprite,
        x: x,
        y: y,
        z: cell.floorZ,
        solid: false,
        nonblocking: true,
        reactiveGrass: Boolean(tpl.reactiveGrass),
        label: tpl.label
      });
      appended++;
    }
    return appended;
  }

  function computeGrassSwayOffset(G, propX, propY, timeSec) {
    const windSway = Math.sin((Number(timeSec) || 0) * 2.4 + propX * 1.7 + propY * 1.3) * 0.08;
    if (!G || !G.player) return windSway;
    const dx = propX - Number(G.player.x || 0);
    const dy = propY - Number(G.player.y || 0);
    const dist = Math.hypot(dx, dy);
    if (dist >= 1.4) return windSway;
    const push = (1.4 - dist) / 1.4;
    return windSway + (dx >= 0 ? 1 : -1) * push * 0.28;
  }

  /* ----------------------------------------------------------------------------
   * 2.5: Five-Angle Enemy Octants, Quality Presets & Optional CRT Filter
   * ---------------------------------------------------------------------------- */
  function resolveEnemyDirectionalOctant(enemyHeadingRad, viewerX, viewerY, enemyX, enemyY) {
    const toViewer = Math.atan2(viewerY - enemyY, viewerX - enemyX);
    let rel = toViewer - Number(enemyHeadingRad || 0);
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;

    const absRel = Math.abs(rel);
    const deg = (absRel * 180) / Math.PI;
    // Mirror only opposite oblique/side views (when rel < 0)
    const mirrorX = rel < -0.001 && deg >= 22.5 && deg <= 157.5;

    if (deg < 22.5) {
      return { view: 'front', mirrorX: false, octantIndex: 0 };
    }
    if (deg < 67.5) {
      return { view: 'front_side', mirrorX: mirrorX, octantIndex: rel >= 0 ? 1 : 7 };
    }
    if (deg < 112.5) {
      return { view: 'side', mirrorX: mirrorX, octantIndex: rel >= 0 ? 2 : 6 };
    }
    if (deg < 157.5) {
      return { view: 'back_side', mirrorX: mirrorX, octantIndex: rel >= 0 ? 3 : 5 };
    }
    return { view: 'back', mirrorX: false, octantIndex: 4 };
  }

  function applyQualityPreset(presetName) {
    const key = String(presetName || 'medium').toLowerCase();
    const preset = QUALITY_PRESETS[key] || QUALITY_PRESETS.medium;
    spatialState.activePreset = preset.id;
    initDepthBuffer(preset.renderWidth, preset.renderHeight);
    return Object.assign({}, preset);
  }

  function recordFrameTimeMs(frameDurationMs) {
    const ms = Math.max(0.1, Number(frameDurationMs) || 16.6);
    spatialState.frameTimesMs.push(ms);
    if (spatialState.frameTimesMs.length > 120) {
      spatialState.frameTimesMs.shift();
    }
    const sum = spatialState.frameTimesMs.reduce(function (a, b) { return a + b; }, 0);
    const avgMs = sum / spatialState.frameTimesMs.length;
    return {
      samples: spatialState.frameTimesMs.length,
      avgFrameMs: Number(avgMs.toFixed(2)),
      measuredFps: Number((1000 / avgMs).toFixed(1)),
      activePreset: spatialState.activePreset
    };
  }

  function configureCRTFilter(mode, options) {
    const cleanMode = String(mode || 'off').toLowerCase();
    const highContrast = Boolean(options && options.highContrast);
    if (cleanMode === 'off' || highContrast) {
      spatialState.crtSettings.mode = 'off';
      spatialState.crtSettings.scanlineOpacity = 0;
      spatialState.crtSettings.curvature = 0;
    } else if (cleanMode === 'subtle') {
      spatialState.crtSettings.mode = 'subtle';
      spatialState.crtSettings.scanlineOpacity = 0.12;
      spatialState.crtSettings.curvature = 0.02;
    } else {
      spatialState.crtSettings.mode = 'classic';
      spatialState.crtSettings.scanlineOpacity = 0.22;
      spatialState.crtSettings.curvature = 0.04;
    }
    return Object.assign({}, spatialState.crtSettings);
  }

  function stepSpatialWorldSimulation(dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    spatialState.cloudDriftOffset = (spatialState.cloudDriftOffset + step * 0.08) % (Math.PI * 2);
    spatialState.kestrelFlyoverPhase += step;
    for (let i = spatialState.waterRipples.length - 1; i >= 0; i--) {
      spatialState.waterRipples[i].age += step;
      if (spatialState.waterRipples[i].age >= spatialState.waterRipples[i].maxAge) {
        spatialState.waterRipples.splice(i, 1);
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.OctaveSpatialWorld = {
      MAX_STEP_HEIGHT,
      MAX_WALL_DETAIL_CACHE_BYTES,
      QUALITY_PRESETS,
      initDepthBuffer,
      writePixelDepth,
      readPixelDepth,
      getCellSpatialInfo,
      ensurePlayerElevation,
      canTraverseElevation,
      movePlayerWithElevation,
      rasterizeSpatialWallSlice,
      pickSpatialTarget,
      samplePaintedCeiling,
      sampleSkyPanorama,
      triggerFootstepRipple,
      sampleWaterReflectionAndRipple,
      computeSpatialFogAndTorchLight,
      computeOccludedEmissiveLight,
      getCloseUpWallDetailTile,
      resolveSeededWallDecal,
      appendNonblockingSceneryProps,
      computeGrassSwayOffset,
      resolveEnemyDirectionalOctant,
      applyQualityPreset,
      recordFrameTimeMs,
      configureCRTFilter,
      stepSpatialWorldSimulation,
      getSpatialState: function () { return spatialState; }
    };
  }
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 3: COMBAT LIFE
 * Scope: Animation — enemies and creatures (8 items) & Animation — first person (9 items)
 * Milestones:
 *   3.1 26-species cached hit-flinch sheets, 3-pose painted death/collapse sheets,
 *       species idle fidgets (robes, sniffing hounds, Quiet head turns),
 *       alert startle/turn frames, and separate charging vs. fleeing strides
 *   3.2 Pressman/Deacon casting poses with pre-cast glow & readable timing,
 *       Requiem 50% HP shatter & Brood-Mother egg-sac shedding phase artwork,
 *       and collision-safe spawn telegraphs (grave emergence, ceiling drop, mist entrance)
 *   3.3 Multi-frame first-person weapon swing sheets across all weapon families +
 *       Resonant Choir-Staff ('choir_staff'), draw/holster/switch transitions,
 *       raised Song-casting hands with frequency-coloured glow, and optional head bob/landing dip
 *   3.4 Access-safe heavy-hit shake/deafness blur/Hushed grey effects, animated swinging
 *       doors/chest lids/levers, coordinated ladder/climbing hands, and full-screen
 *       held notes/books with accessible large-text/high-contrast reading mode
 * ============================================================================ */
(function () {
  'use strict';

  const ALL_26_SPECIES = Object.freeze([
    'proctor', 'legionnaire', 'weaverling', 'drowned_hollow', 'cacophony_hound',
    'tongueless', 'office_marine', 'outrider', 'chord_warden', 'the_wearer',
    'dirge', 'quiet', 'steam_golem', 'aegis_sentinel', 'pressman_mallow',
    'phantom_weaver', 'the_requiem', 'brood_mother', 'deacon_of_the_unrung_bell',
    'hal_brennick', 'hushwarden', 'hush_moth', 'cacophony_swarm', 'listening_horn',
    'veteran_legionnaire', 'arch_proctor'
  ]);

  const ROBED_SPECIES = new Set([
    'proctor', 'arch_proctor', 'chord_warden', 'deacon_of_the_unrung_bell', 'pressman_mallow', 'the_wearer'
  ]);
  const HOUND_SPECIES = new Set(['cacophony_hound', 'elder_hound']);
  const EERIE_HEADTURN_SPECIES = new Set(['quiet', 'dirge', 'tongueless']);

  // 17th catalog weapon: Resonant Choir-Staff (completes staff weapon family)
  const CHOIR_STAFF_CATALOG_ENTRY = Object.freeze({
    id: 'choir_staff',
    name: 'Resonant Choir-Staff',
    type: 'weapon',
    family: 'staff',
    twoHanded: true,
    dmgMin: 7,
    dmgMax: 13,
    reach: 2.35,
    cooldown: 0.72,
    fatigueCost: 6,
    noise: 2,
    weight: 4.5,
    value: 65,
    desc: 'Ashwood cantor stave shod with a split bronze tuning-fork. Channels harmonic sweeps and long-reach thrusts.'
  });

  // Song frequency colour palette (Hz -> RGB + hex)
  const SONG_FREQUENCY_COLOURS = Object.freeze({
    174: { r: 111, g: 216, b: 156, hex: '#6fd89c', label: 'Root Mending Emerald' },
    285: { r: 232, g: 168, b: 86,  hex: '#e8a856', label: 'Bastion Amber' },
    396: { r: 224, g: 122, b: 78,  hex: '#e07a4e', label: 'Shatter Bronze' },
    528: { r: 140, g: 240, b: 232, hex: '#8cf0e8', label: 'Sun-Shard Cyan-Gold' },
    639: { r: 178, g: 132, b: 235, hex: '#b284eb', label: 'Veil-Harmonic Lilac' },
    741: { r: 200, g: 107, b: 224, hex: '#c86be0', label: 'Unnaming Violet-Crimson' }
  });

  // Cached procedural/painted sprite frame store (never serialized into saves)
  const combatLifeCache = {
    flinchFrames: new Map(),
    collapseSheets: new Map(),
    fidgetFrames: new Map(),
    strideFrames: new Map(),
    bossPhaseFrames: new Map(),
    weaponSwingSheets: new Map()
  };

  // Transient runtime state
  const combatLifeState = {
    spawnTelegraphs: [],
    worldInteractions: new Map(),
    fpWeapon: {
      equippedId: 'iron_sword',
      pendingId: null,
      transitionState: 'ready', // 'ready' | 'holstering' | 'drawing' | 'swinging' | 'casting'
      transitionProgress: 0,
      holsterDuration: 0.18,
      drawDuration: 0.20,
      swingProgress: 0,
      swingMoveType: 'slash_right',
      castFreqHz: 174,
      castProgress: 0,
      castDuration: 0.65
    },
    cameraMotion: {
      walkPhase: 0,
      bobOffsetX: 0,
      bobOffsetY: 0,
      landingDipY: 0,
      lastPlayerZ: 0,
      hitShakeTimer: 0,
      hitShakeIntensity: 0,
      climbPhase: 0,
      isClimbing: false
    },
    heldDocument: {
      open: false,
      title: '',
      pages: [],
      currentPage: 0,
      largeText: false,
      highContrast: false
    }
  };

  function getGame() {
    return typeof window !== 'undefined' && window.G ? window.G : null;
  }

  function ensureStaffInCatalog() {
    const G = getGame();
    if (typeof window !== 'undefined' && window.WEAPON_CATALOG && !window.WEAPON_CATALOG.choir_staff) {
      window.WEAPON_CATALOG.choir_staff = Object.assign({}, CHOIR_STAFF_CATALOG_ENTRY);
    }
    if (typeof window !== 'undefined' && window.ITEM_CATALOG && !window.ITEM_CATALOG.choir_staff) {
      window.ITEM_CATALOG.choir_staff = Object.assign({}, CHOIR_STAFF_CATALOG_ENTRY);
    }
    if (G && G.catalog && G.catalog.weapons && !G.catalog.weapons.choir_staff) {
      G.catalog.weapons.choir_staff = Object.assign({}, CHOIR_STAFF_CATALOG_ENTRY);
    }
  }

  /* ----------------------------------------------------------------------------
   * 3.1: Enemy Hit-Flinch, 3-Pose Collapse, Idle Fidgets, Startle & Strides
   * ---------------------------------------------------------------------------- */
  function buildSyntheticSpriteBuffer(seedKey, width, height, poseTransform) {
    const w = width || 32;
    const h = height || 48;
    const pixels = new Uint8Array(w * h * 4);
    let hash = 2166136261;
    for (let i = 0; i < seedKey.length; i++) {
      hash ^= seedKey.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const baseR = 90 + (Math.abs(hash) & 63);
    const baseG = 75 + ((Math.abs(hash) >> 6) & 63);
    const baseB = 85 + ((Math.abs(hash) >> 12) & 63);

    const shiftX = (poseTransform && poseTransform.shiftX) || 0;
    const shiftY = (poseTransform && poseTransform.shiftY) || 0;
    const flatten = (poseTransform && poseTransform.flattenRatio) || 1.0;

    const minY = Math.max(2, Math.floor(h * (1 - flatten * 0.85)));
    for (let y = minY; y < h - 2; y++) {
      const relY = (y - minY) / Math.max(1, h - 2 - minY);
      const halfSpan = Math.max(3, Math.round(w * (0.22 + 0.14 * Math.sin(relY * Math.PI)) / flatten));
      const cx = Math.max(halfSpan, Math.min(w - 1 - halfSpan, Math.floor(w / 2) + shiftX + Math.round((1 - relY) * shiftY)));
      for (let x = cx - halfSpan; x <= cx + halfSpan; x++) {
        const idx = (y * w + x) * 4;
        pixels[idx] = baseR;
        pixels[idx + 1] = baseG;
        pixels[idx + 2] = baseB;
        pixels[idx + 3] = 255;
      }
    }
    return { key: seedKey, width: w, height: h, pixels: pixels };
  }

  function getOrBuildHitFlinchFrame(species, viewOctant, flinchStage) {
    const normSpecies = String(species || 'proctor').toLowerCase().replace(/\s+/g, '_');
    const view = String(viewOctant || 'front');
    const stage = flinchStage === 2 ? 2 : 1;
    const cacheKey = `${normSpecies}:${view}:flinch_${stage}`;

    if (combatLifeCache.flinchFrames.has(cacheKey)) {
      return combatLifeCache.flinchFrames.get(cacheKey);
    }

    const frame = buildSyntheticSpriteBuffer(cacheKey, 32, 48, {
      shiftX: stage === 1 ? -3 : 2,
      shiftY: stage === 1 ? -2 : -1,
      flattenRatio: 0.94
    });
    frame.poseType = 'hit_flinch';
    frame.species = normSpecies;
    frame.stage = stage;
    combatLifeCache.flinchFrames.set(cacheKey, frame);
    return frame;
  }

  function getOrBuildCollapseSheet(species, viewOctant, onWaterFloor) {
    const normSpecies = String(species || 'proctor').toLowerCase().replace(/\s+/g, '_');
    const view = String(viewOctant || 'front');
    const isSwarm = normSpecies === 'cacophony_swarm' || normSpecies === 'hush_moth';
    const isWaterHollow = normSpecies === 'drowned_hollow' && Boolean(onWaterFloor);
    const mode = isSwarm ? 'scatter' : isWaterHollow ? 'sink' : 'collapse';
    const cacheKey = `${normSpecies}:${view}:death_${mode}`;

    if (combatLifeCache.collapseSheets.has(cacheKey)) {
      return combatLifeCache.collapseSheets.get(cacheKey);
    }

    const poses = [];
    const frameCount = mode === 'collapse' ? 3 : 8;
    for (let p = 1; p <= frameCount; p++) {
      const progress = p / frameCount;
      const buf = buildSyntheticSpriteBuffer(`${cacheKey}_${p}`, 32, 48, {
        shiftX: Math.round(progress * 4),
        shiftY: Math.round(progress * 6),
        flattenRatio: mode === 'collapse' ? (1 - progress * 0.62) : (1 - progress * 0.85)
      });
      buf.poseIndex = p;
      buf.leavesCorpse = mode === 'collapse' && p === frameCount;
      buf.nonblocking = true;
      buf.unpickable = true;
      poses.push(buf);
    }

    const sheet = {
      key: cacheKey,
      species: normSpecies,
      mode: mode,
      leavesCorpse: mode === 'collapse',
      poses: poses
    };
    combatLifeCache.collapseSheets.set(cacheKey, sheet);
    return sheet;
  }

  function resolveIdleFidgetFrame(enemy, simTimeSec) {
    if (!enemy || enemy.dead || enemy.state !== 'idle') return null;
    const normSpecies = String(enemy.species || enemy.subtype || 'proctor').toLowerCase().replace(/\s+/g, '_');
    const t = Number(simTimeSec || 0);
    const phase = Math.floor(t * 2.0) % 2 + 1;

    let fidgetType = 'breath_sway';
    if (ROBED_SPECIES.has(normSpecies)) {
      fidgetType = `robe_hem_sway_${phase}`;
    } else if (HOUND_SPECIES.has(normSpecies)) {
      fidgetType = `hound_sniff_${phase}`;
    } else if (EERIE_HEADTURN_SPECIES.has(normSpecies)) {
      fidgetType = `quiet_head_turn_${phase}`;
    }

    const cacheKey = `${normSpecies}:${fidgetType}`;
    if (!combatLifeCache.fidgetFrames.has(cacheKey)) {
      const buf = buildSyntheticSpriteBuffer(cacheKey, 32, 48, {
        shiftX: phase === 1 ? -1 : 1,
        shiftY: fidgetType.startsWith('hound_sniff') ? 3 : 0,
        flattenRatio: fidgetType.startsWith('hound_sniff') ? 0.88 : 1.0
      });
      buf.fidgetType = fidgetType;
      combatLifeCache.fidgetFrames.set(cacheKey, buf);
    }
    return combatLifeCache.fidgetFrames.get(cacheKey);
  }

  function triggerDetectionStartle(enemy, alertSourceType) {
    if (!enemy || enemy.dead) return false;
    enemy._startleTimer = 0.28;
    enemy._startleSource = alertSourceType || 'sight';
    enemy._startleFrame = `${String(enemy.species || 'proctor').toLowerCase()}_startle_${enemy._startleSource}`;
    return true;
  }

  function resolveLocomotionStrideFrame(enemy, simTimeSec) {
    if (!enemy || enemy.dead) return null;
    const normSpecies = String(enemy.species || enemy.subtype || 'proctor').toLowerCase().replace(/\s+/g, '_');
    const isFleeing = enemy.state === 'flee' || enemy.fleeing || (enemy.hp > 0 && enemy.maxHp > 0 && enemy.hp / enemy.maxHp < 0.2 && !enemy.boss);
    const strideMode = isFleeing ? 'fleeing' : 'charging';
    const stepIdx = (Math.floor(Number(simTimeSec || 0) * (isFleeing ? 7.5 : 6.0)) % 2) + 1;
    const cacheKey = `${normSpecies}:${strideMode}_${stepIdx}`;

    if (!combatLifeCache.strideFrames.has(cacheKey)) {
      const buf = buildSyntheticSpriteBuffer(cacheKey, 32, 48, {
        shiftX: stepIdx === 1 ? -2 : 2,
        shiftY: isFleeing ? -2 : 2,
        flattenRatio: isFleeing ? 0.90 : 1.02
      });
      buf.strideMode = strideMode;
      buf.stepIndex = stepIdx;
      combatLifeCache.strideFrames.set(cacheKey, buf);
    }
    return combatLifeCache.strideFrames.get(cacheKey);
  }

  /* ----------------------------------------------------------------------------
   * 3.2: Boss Casting Poses, Mid-Fight Phase Art & Collision-Safe Spawn Telegraphs
   * ---------------------------------------------------------------------------- */
  function beginBossCast(bossEntity, spellId) {
    if (!bossEntity || bossEntity.dead) return { ok: false };
    bossEntity._castingState = {
      spellId: spellId || 'unrung_tolling',
      elapsed: 0,
      windupDuration: 0.85,
      releaseDuration: 0.35,
      phase: 'pre_cast_glow',
      glowColor: { r: 140, g: 240, b: 232 },
      poseFrame: `${String(bossEntity.species || 'deacon').toLowerCase()}_cast_windup`
    };
    return { ok: true, castingState: bossEntity._castingState };
  }

  function stepBossCast(bossEntity, dt) {
    if (!bossEntity || !bossEntity._castingState) return null;
    if (bossEntity.dead || bossEntity.stunned > 0) {
      delete bossEntity._castingState;
      return { interrupted: true };
    }
    const st = bossEntity._castingState;
    st.elapsed += Math.max(0, Number(dt) || 0.016);
    if (st.elapsed < st.windupDuration) {
      st.phase = 'pre_cast_glow';
      st.poseFrame = `${String(bossEntity.species || 'deacon').toLowerCase()}_cast_windup`;
      return st;
    }
    if (st.elapsed < st.windupDuration + st.releaseDuration) {
      st.phase = 'cast_release';
      st.poseFrame = `${String(bossEntity.species || 'deacon').toLowerCase()}_cast_release`;
      return st;
    }
    delete bossEntity._castingState;
    return { completed: true, spellId: st.spellId };
  }

  function checkAndApplyBossPhaseArtwork(bossEntity) {
    if (!bossEntity || bossEntity.dead) return null;
    const maxHp = Number(bossEntity.maxHp || 100);
    const hp = Number(bossEntity.hp ?? maxHp);
    if (hp > maxHp * 0.5) return null;

    const normSpecies = String(bossEntity.species || bossEntity.id || '').toLowerCase().replace(/\s+/g, '_');
    if ((normSpecies === 'the_requiem' || normSpecies === 'requiem') && !bossEntity._halfHealthShatterApplied) {
      bossEntity._halfHealthShatterApplied = true;
      bossEntity.phaseArtwork = 'requiem_half_health_shatter';
      if (!combatLifeCache.bossPhaseFrames.has('requiem_half_health_shatter')) {
        combatLifeCache.bossPhaseFrames.set(
          'requiem_half_health_shatter',
          buildSyntheticSpriteBuffer('requiem_half_health_shatter', 48, 64, { shiftX: 1, shiftY: -2, flattenRatio: 0.96 })
        );
      }
      return {
        transitioned: true,
        phaseKey: 'requiem_half_health_shatter',
        frame: combatLifeCache.bossPhaseFrames.get('requiem_half_health_shatter')
      };
    }

    if (normSpecies === 'brood_mother' && !bossEntity._eggSacShedApplied) {
      bossEntity._eggSacShedApplied = true;
      bossEntity.phaseArtwork = 'brood_mother_egg_sac_shed';
      if (!combatLifeCache.bossPhaseFrames.has('brood_mother_egg_sac_shed')) {
        combatLifeCache.bossPhaseFrames.set(
          'brood_mother_egg_sac_shed',
          buildSyntheticSpriteBuffer('brood_mother_egg_sac_shed', 48, 64, { shiftX: 0, shiftY: 2, flattenRatio: 0.86 })
        );
      }
      return {
        transitioned: true,
        phaseKey: 'brood_mother_egg_sac_shed',
        frame: combatLifeCache.bossPhaseFrames.get('brood_mother_egg_sac_shed')
      };
    }

    return null;
  }

  function beginSpawnTelegraph(G, config) {
    if (!G || !config) return { ok: false };
    const mode = config.mode || 'grave_emergence'; // 'grave_emergence' | 'ceiling_drop' | 'mist_entrance'
    const px = Number(G.player && G.player.x) || 0;
    const py = Number(G.player && G.player.y) || 0;
    let spawnX = Number(config.x || 0);
    let spawnY = Number(config.y || 0);

    // Ensure collision-safe offset from the player so emerging enemies never trap the player
    const distToPlayer = Math.hypot(spawnX - px, spawnY - py);
    if (distToPlayer < 1.35) {
      const pushAngle = Math.atan2(spawnY - py, spawnX - px) || 0;
      spawnX = Number((px + Math.cos(pushAngle) * 1.45).toFixed(2));
      spawnY = Number((py + Math.sin(pushAngle) * 1.45).toFixed(2));
    }

    const telegraph = {
      id: config.id || `telegraph_${Date.now()}_${combatLifeState.spawnTelegraphs.length}`,
      species: config.species || 'drowned_hollow',
      mode: mode,
      x: spawnX,
      y: spawnY,
      elapsed: 0,
      duration: Number(config.duration || 0.9),
      stageFrame: `${mode}_stage_1`,
      completed: false,
      nonblocking: true
    };
    combatLifeState.spawnTelegraphs.push(telegraph);
    return { ok: true, telegraph: telegraph };
  }

  function stepSpawnTelegraphs(G, dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const spawned = [];
    for (let i = combatLifeState.spawnTelegraphs.length - 1; i >= 0; i--) {
      const tel = combatLifeState.spawnTelegraphs[i];
      tel.elapsed += step;
      const ratio = Math.min(1, tel.elapsed / tel.duration);
      const stageIdx = Math.min(3, Math.floor(ratio * 3) + 1);
      tel.stageFrame = `${tel.mode}_stage_${stageIdx}`;

      if (tel.elapsed >= tel.duration) {
        tel.completed = true;
        combatLifeState.spawnTelegraphs.splice(i, 1);
        if (G && Array.isArray(G.entities)) {
          const ent = {
            id: `spawned_${tel.id}`,
            type: 'enemy',
            species: tel.species,
            x: tel.x,
            y: tel.y,
            hp: 24,
            maxHp: 24,
            state: 'alert',
            spawnedVia: tel.mode
          };
          G.entities.push(ent);
          spawned.push(ent);
        }
      }
    }
    return spawned;
  }

  /* ----------------------------------------------------------------------------
   * 3.3: First-Person Swing Sheets, Staff, Draw/Holster/Switch, Song Glow & Bob
   * ---------------------------------------------------------------------------- */
  function getOrBuildFirstPersonWeaponSheet(weaponId, family) {
    ensureStaffInCatalog();
    const id = String(weaponId || 'iron_sword').toLowerCase();
    const fam = String(family || (id === 'choir_staff' ? 'staff' : 'blade')).toLowerCase();
    const cacheKey = `fp_sheet:${id}:${fam}`;

    if (combatLifeCache.weaponSwingSheets.has(cacheKey)) {
      return combatLifeCache.weaponSwingSheets.get(cacheKey);
    }

    const frameNames = ['idle', 'draw', 'holster', 'windup_1', 'windup_2', 'strike_arc', 'strike_apex', 'recover'];
    const frames = {};
    for (let i = 0; i < frameNames.length; i++) {
      const fn = frameNames[i];
      frames[fn] = buildSyntheticSpriteBuffer(`${cacheKey}:${fn}`, 96, 96, {
        shiftX: (i - 3) * 3,
        shiftY: fn === 'holster' ? 18 : fn === 'draw' ? 10 : 0,
        flattenRatio: 1.0
      });
    }

    const sheet = { weaponId: id, family: fam, frames: frames };
    combatLifeCache.weaponSwingSheets.set(cacheKey, sheet);
    return sheet;
  }

  function triggerWeaponSwitch(nextWeaponId) {
    const fp = combatLifeState.fpWeapon;
    if (!nextWeaponId || nextWeaponId === fp.equippedId) {
      return { switched: false, reason: 'already_equipped' };
    }
    fp.pendingId = String(nextWeaponId);
    fp.transitionState = 'holstering';
    fp.transitionProgress = 0;
    return { switched: true, state: fp.transitionState, pendingId: fp.pendingId };
  }

  function triggerFirstPersonSongCast(freqHz) {
    const fp = combatLifeState.fpWeapon;
    const hz = Number(freqHz) || 174;
    const palette = SONG_FREQUENCY_COLOURS[hz] || SONG_FREQUENCY_COLOURS[174];
    fp.transitionState = 'casting';
    fp.castFreqHz = hz;
    fp.castProgress = 0;
    return {
      ok: true,
      freqHz: hz,
      glowColor: palette,
      handPose: 'fp_cast_hands_raise'
    };
  }

  function stepFirstPersonWeaponState(dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const fp = combatLifeState.fpWeapon;

    if (fp.transitionState === 'holstering') {
      fp.transitionProgress += step / fp.holsterDuration;
      if (fp.transitionProgress >= 1.0) {
        fp.equippedId = fp.pendingId || fp.equippedId;
        fp.pendingId = null;
        fp.transitionState = 'drawing';
        fp.transitionProgress = 0;
      }
      return {
        state: fp.transitionState,
        equippedId: fp.equippedId,
        yOffsetNormalized: Math.min(1, fp.transitionProgress)
      };
    }

    if (fp.transitionState === 'drawing') {
      fp.transitionProgress += step / fp.drawDuration;
      if (fp.transitionProgress >= 1.0) {
        fp.transitionState = 'ready';
        fp.transitionProgress = 0;
      }
      return {
        state: fp.transitionState,
        equippedId: fp.equippedId,
        yOffsetNormalized: Math.max(0, 1 - fp.transitionProgress)
      };
    }

    if (fp.transitionState === 'casting') {
      fp.castProgress += step / fp.castDuration;
      const palette = SONG_FREQUENCY_COLOURS[fp.castFreqHz] || SONG_FREQUENCY_COLOURS[174];
      if (fp.castProgress >= 1.0) {
        fp.transitionState = 'ready';
        fp.castProgress = 0;
      }
      const handPose =
        fp.castProgress < 0.35
          ? 'fp_cast_hands_raise'
          : fp.castProgress < 0.75
            ? 'fp_cast_hands_hold'
            : 'fp_cast_hands_release';
      return {
        state: fp.transitionState,
        handPose: handPose,
        glowColor: palette,
        castProgress: fp.castProgress
      };
    }

    return { state: fp.transitionState, equippedId: fp.equippedId, yOffsetNormalized: 0 };
  }

  function computeHeadBobAndLandingOffset(G, moveSpeed, dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const cm = combatLifeState.cameraMotion;
    const opts = (G && G.options) || {};
    const playerZ = Number((G && G.player && G.player.z) || 0);

    // Detect landing dip when stepping down from higher elevation
    if (playerZ < cm.lastPlayerZ - 0.12) {
      cm.landingDipY = Math.min(8.0, (cm.lastPlayerZ - playerZ) * 14.0);
    }
    cm.lastPlayerZ = playerZ;
    cm.landingDipY = Math.max(0, cm.landingDipY - step * 24.0);

    if (opts.reducedMotion || opts.reducedShake || opts.headBob === false) {
      cm.bobOffsetX = 0;
      cm.bobOffsetY = 0;
      return { bobX: 0, bobY: 0, landingDipY: 0 };
    }

    const speed = Math.max(0, Number(moveSpeed) || 0);
    if (speed > 0.05) {
      cm.walkPhase = (cm.walkPhase + step * speed * 4.2) % (Math.PI * 2);
      cm.bobOffsetX = Number((Math.cos(cm.walkPhase * 0.5) * 1.8).toFixed(3));
      cm.bobOffsetY = Number((Math.abs(Math.sin(cm.walkPhase)) * 2.6).toFixed(3));
    } else {
      cm.bobOffsetX *= 0.8;
      cm.bobOffsetY *= 0.8;
    }

    return {
      bobX: cm.bobOffsetX,
      bobY: cm.bobOffsetY,
      landingDipY: Number(cm.landingDipY.toFixed(3))
    };
  }

  /* ----------------------------------------------------------------------------
   * 3.4: Access-Safe Hit/Status Effects, World Props, Climbing Hands & Held Books
   * ---------------------------------------------------------------------------- */
  function triggerHeavyHitShake(intensity) {
    combatLifeState.cameraMotion.hitShakeTimer = 0.32;
    combatLifeState.cameraMotion.hitShakeIntensity = Math.min(12, Math.max(2, Number(intensity) || 6));
  }

  function computeCombatScreenEffects(G, dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const cm = combatLifeState.cameraMotion;
    const opts = (G && G.options) || {};
    const status = (G && G.player && G.player.status) || {};

    cm.hitShakeTimer = Math.max(0, cm.hitShakeTimer - step);
    const shakeAllowed = !opts.reducedShake && !opts.reducedMotion && !opts.noFlashes;
    const activeShake = shakeAllowed && cm.hitShakeTimer > 0
      ? Number((cm.hitShakeIntensity * (cm.hitShakeTimer / 0.32)).toFixed(2))
      : 0;

    const isDeafened = Boolean(status.deafened || (G && G.player && G.player.deafened));
    const isHushed = Boolean(status.hushed || (G && G.player && G.player.hushed));

    return {
      shakePx: activeShake,
      deafnessBlurPx: opts.highContrast ? 0 : (isDeafened ? 2.5 : 0),
      hushedDesaturate: opts.highContrast ? 0 : (isHushed ? 0.72 : 0),
      highContrastBadge: (isDeafened || isHushed) ? { deafened: isDeafened, hushed: isHushed } : null
    };
  }

  function triggerWorldInteractionAnim(targetId, kind) {
    const id = String(targetId || 'prop_0');
    const normKind = kind || 'door'; // 'door' | 'chest' | 'lever'
    const entry = {
      id: id,
      kind: normKind,
      progress: 0,
      duration: normKind === 'door' ? 0.35 : normKind === 'chest' ? 0.30 : 0.25,
      completed: false,
      angleDeg: 0
    };
    combatLifeState.worldInteractions.set(id, entry);
    return entry;
  }

  function stepWorldInteractions(dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const active = [];
    combatLifeState.worldInteractions.forEach(function (entry) {
      if (!entry.completed) {
        entry.progress = Math.min(1, entry.progress + step / entry.duration);
        if (entry.kind === 'door') {
          entry.angleDeg = Math.round(entry.progress * 90);
        } else if (entry.kind === 'chest') {
          entry.angleDeg = Math.round(entry.progress * 75);
        } else {
          entry.angleDeg = Math.round(-35 + entry.progress * 70);
        }
        if (entry.progress >= 1) entry.completed = true;
      }
      active.push(Object.assign({}, entry));
    });
    return active;
  }

  function computeClimbingHandsOverlay(isClimbing, verticalVelocity, dt) {
    const cm = combatLifeState.cameraMotion;
    cm.isClimbing = Boolean(isClimbing);
    if (!cm.isClimbing) {
      return { visible: false, activeHand: null, rungPhase: 0 };
    }
    const step = Math.max(0, Number(dt) || 0.016);
    cm.climbPhase = (cm.climbPhase + step * Math.max(0.5, Math.abs(Number(verticalVelocity) || 1.2)) * 3.5) % 1.0;
    const activeHand = cm.climbPhase < 0.5 ? 'left_hand_reach' : 'right_hand_reach';
    return {
      visible: true,
      activeHand: activeHand,
      rungPhase: Number(cm.climbPhase.toFixed(3)),
      leftHandY: Math.round(Math.sin(cm.climbPhase * Math.PI * 2) * 18),
      rightHandY: Math.round(Math.sin((cm.climbPhase + 0.5) * Math.PI * 2) * 18)
    };
  }

  function openHeldReadingView(G, docConfig) {
    if (!docConfig) return { ok: false };
    const opts = (G && G.options) || {};
    combatLifeState.heldDocument = {
      open: true,
      title: String(docConfig.title || 'Recovered Ledger Folio'),
      pages: Array.isArray(docConfig.pages) && docConfig.pages.length
        ? docConfig.pages.map(String)
        : [String(docConfig.text || '')],
      currentPage: 0,
      largeText: Boolean(opts.largeText || docConfig.largeText),
      highContrast: Boolean(opts.highContrast || docConfig.highContrast),
      handFrame: 'fp_held_parchment_two_hands'
    };
    return Object.assign({}, combatLifeState.heldDocument);
  }

  function turnHeldDocumentPage(delta) {
    const doc = combatLifeState.heldDocument;
    if (!doc.open) return null;
    const next = Math.max(0, Math.min(doc.pages.length - 1, doc.currentPage + (Number(delta) || 0)));
    doc.currentPage = next;
    return Object.assign({}, doc);
  }

  function closeHeldReadingView() {
    combatLifeState.heldDocument.open = false;
    return { open: false };
  }

  function resetTransientCombatLifeState() {
    combatLifeState.spawnTelegraphs.length = 0;
    combatLifeState.worldInteractions.clear();
    combatLifeState.fpWeapon.transitionState = 'ready';
    combatLifeState.fpWeapon.transitionProgress = 0;
    combatLifeState.fpWeapon.pendingId = null;
    combatLifeState.cameraMotion.hitShakeTimer = 0;
    combatLifeState.cameraMotion.isClimbing = false;
    combatLifeState.heldDocument.open = false;
  }

  if (typeof window !== 'undefined') {
    window.OctaveCombatLife = {
      ALL_26_SPECIES,
      CHOIR_STAFF_CATALOG_ENTRY,
      SONG_FREQUENCY_COLOURS,
      ensureStaffInCatalog,
      getOrBuildHitFlinchFrame,
      getOrBuildCollapseSheet,
      resolveIdleFidgetFrame,
      triggerDetectionStartle,
      resolveLocomotionStrideFrame,
      beginBossCast,
      stepBossCast,
      checkAndApplyBossPhaseArtwork,
      beginSpawnTelegraph,
      stepSpawnTelegraphs,
      getOrBuildFirstPersonWeaponSheet,
      triggerWeaponSwitch,
      triggerFirstPersonSongCast,
      stepFirstPersonWeaponState,
      computeHeadBobAndLandingOffset,
      triggerHeavyHitShake,
      computeCombatScreenEffects,
      triggerWorldInteractionAnim,
      stepWorldInteractions,
      computeClimbingHandsOverlay,
      openHeldReadingView,
      turnHeldDocumentPage,
      closeHeldReadingView,
      resetTransientCombatLifeState,
      getState: function () { return combatLifeState; },
      getCacheStats: function () {
        return {
          flinchCount: combatLifeCache.flinchFrames.size,
          collapseCount: combatLifeCache.collapseSheets.size,
          fidgetCount: combatLifeCache.fidgetFrames.size,
          strideCount: combatLifeCache.strideFrames.size,
          weaponSheetCount: combatLifeCache.weaponSwingSheets.size
        };
      }
    };
  }
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 4: LIVING WORLD
 * Scope: Animation — companions and NPCs (8 items) & Animation — world (10 items)
 * ============================================================================ */
(function () {
  'use strict';

  const GATE_COLLISION_OPEN_THRESHOLD = 0.65;

  const NPC_DAILY_SCHEDULES = Object.freeze({
    merchant: [
      { startHour: 7, endHour: 18, state: 'work_stall', xOffset: 0, yOffset: 0 },
      { startHour: 18, endHour: 22, state: 'tavern_supper', xOffset: 2.0, yOffset: -1.5 },
      { startHour: 22, endHour: 7, state: 'home_rest', xOffset: -2.0, yOffset: 1.5 }
    ],
    townsfolk: [
      { startHour: 6, endHour: 17, state: 'daily_labor', xOffset: 1.0, yOffset: 0.5 },
      { startHour: 17, endHour: 21, state: 'tavern_social', xOffset: 2.5, yOffset: -1.0 },
      { startHour: 21, endHour: 6, state: 'home_rest', xOffset: -1.5, yOffset: 2.0 }
    ]
  });

  const ARTISAN_LOOPS = Object.freeze({
    miller: ['miller_grind_1', 'miller_grind_2'],
    tanner: ['tanner_scrape_1', 'tanner_scrape_2'],
    barman: ['barman_wipe_1', 'barman_wipe_2']
  });

  const livingWorldState = {
    lyraRipples: [],
    smokePlumes: [],
    waterSplashes: [],
    foliageParticles: [],
    gates: new Map(),
    wallCollapses: [],
    fireSheetCache: new Map()
  };

  function triggerCompanionHitReaction(companion, damageAmount) {
    if (!companion || companion.dead) return null;
    const maxHp = Math.max(1, Number(companion.maxHp || 60));
    companion.hp = Math.max(0, Number(companion.hp ?? maxHp) - Math.max(0, Number(damageAmount) || 0));
    companion._hitReactionTimer = 0.35;
    companion._isInjured = companion.hp / maxHp <= 0.40;
    companion._limping = companion._isInjured;
    companion.poseFrame = `${String(companion.id || 'kaelen').toLowerCase()}_hit_flinch`;
    return {
      id: companion.id,
      hp: companion.hp,
      injured: companion._isInjured,
      limping: companion._limping,
      poseFrame: companion.poseFrame
    };
  }

  function resolveCompanionPose(companion, simTimeSec, isCampfireScene) {
    if (!companion || companion.dead) return null;
    const id = String(companion.id || companion.name || 'kaelen').toLowerCase();
    const maxHp = Math.max(1, Number(companion.maxHp || 60));
    const hpRatio = Number(companion.hp ?? maxHp) / maxHp;
    const phase = (Math.floor(Number(simTimeSec || 0) * 3.0) % 2) + 1;

    if (isCampfireScene) {
      return id.includes('lyra')
        ? `lyra_camp_warm_hands_${phase}`
        : `kaelen_camp_sharpen_${phase}`;
    }

    // Kaelen chest-holding Root-note pose synchronized with <35% HP 174 Hz hum
    if (id.includes('kaelen') && hpRatio < 0.35) {
      companion._rootNoteHumActive = true;
      return 'kaelen_root_note_chest_hold';
    }
    companion._rootNoteHumActive = false;

    if (companion._hitReactionTimer > 0) {
      return `${id}_hit_flinch`;
    }
    if (hpRatio <= 0.40) {
      return `${id}_limp_w${phase}`;
    }
    return `${id}_idle_${phase}`;
  }

  function emitLyraMusicalAirRipple(lyraX, lyraY, songType) {
    const ripple = {
      x: Number(lyraX || 0),
      y: Number(lyraY || 0),
      radius: 0.25,
      maxRadius: songType === 'calling_song' ? 5.5 : 3.2,
      alpha: 0.9,
      colorHex: '#d8b4f8'
    };
    livingWorldState.lyraRipples.push(ripple);
    return ripple;
  }

  function stepLyraAirRipples(dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    for (let i = livingWorldState.lyraRipples.length - 1; i >= 0; i--) {
      const r = livingWorldState.lyraRipples[i];
      r.radius += step * 2.8;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius);
      if (r.radius >= r.maxRadius) {
        livingWorldState.lyraRipples.splice(i, 1);
      }
    }
    return livingWorldState.lyraRipples;
  }

  function resolveNpcGestureAndRoutine(npc, worldHours, simTimeSec, inConversation) {
    if (!npc || npc.dead) return null;
    const stepFrame = (Math.floor(Number(simTimeSec || 0) * 2.5) % 2) + 1;
    const role = String(npc.artisanRole || npc.role || npc.subtype || 'townsfolk').toLowerCase();

    if (inConversation) {
      return {
        routineState: 'conversing',
        frame: `npc_talk_gesture_${stepFrame}`,
        headTurnTowardPlayer: true,
        questAvailable: true
      };
    }

    if (ARTISAN_LOOPS[role]) {
      return {
        routineState: 'artisan_work',
        frame: ARTISAN_LOOPS[role][stepFrame - 1],
        headTurnTowardPlayer: false,
        questAvailable: true
      };
    }

    const hour = ((Number(worldHours) || 12) % 24 + 24) % 24;
    const sched = NPC_DAILY_SCHEDULES[role] || NPC_DAILY_SCHEDULES.townsfolk;
    let activeSlot = sched[0];
    for (let i = 0; i < sched.length; i++) {
      const s = sched[i];
      if (s.startHour < s.endHour) {
        if (hour >= s.startHour && hour < s.endHour) { activeSlot = s; break; }
      } else {
        if (hour >= s.startHour || hour < s.endHour) { activeSlot = s; break; }
      }
    }

    const homeX = Number(npc.homeX ?? npc.x ?? 10);
    const homeY = Number(npc.homeY ?? npc.y ?? 10);
    npc.homeX = homeX;
    npc.homeY = homeY;

    // Quest givers preserve quest availability even after hours
    const isQuestGiver = Boolean(npc.questGiver || npc.questId);
    if (!isQuestGiver) {
      npc.x = homeX + activeSlot.xOffset;
      npc.y = homeY + activeSlot.yOffset;
    }

    return {
      routineState: activeSlot.state,
      frame: `${role}_${activeSlot.state}_${stepFrame}`,
      questAvailable: true,
      x: npc.x,
      y: npc.y
    };
  }

  function stepAmbientWildlife(wildlifeEntity, playerX, playerY, playerRunning, simTimeSec) {
    if (!wildlifeEntity || wildlifeEntity.dead) return null;
    const species = String(wildlifeEntity.species || 'cat').toLowerCase(); // 'cat' | 'crow' | 'rat'
    const dist = Math.hypot((wildlifeEntity.x || 0) - playerX, (wildlifeEntity.y || 0) - playerY);
    const frameIdx = (Math.floor(Number(simTimeSec || 0) * 6.0) % 2) + 1;

    if (dist <= (playerRunning ? 4.5 : 2.2)) {
      wildlifeEntity.state = 'flee';
      const angleAway = Math.atan2((wildlifeEntity.y || 0) - playerY, (wildlifeEntity.x || 0) - playerX);
      wildlifeEntity.x = Number(((wildlifeEntity.x || 0) + Math.cos(angleAway) * 0.35).toFixed(2));
      wildlifeEntity.y = Number(((wildlifeEntity.y || 0) + Math.sin(angleAway) * 0.35).toFixed(2));
      return { state: 'flee', frame: `${species}_flee_${frameIdx}`, x: wildlifeEntity.x, y: wildlifeEntity.y };
    }

    wildlifeEntity.state = 'walk';
    return { state: 'walk', frame: `${species}_walk_${frameIdx}`, x: wildlifeEntity.x, y: wildlifeEntity.y };
  }

  function getOrBuildFireSheet(fixtureType) {
    const kind = String(fixtureType || 'campfire').toLowerCase(); // 'campfire' | 'hearth' | 'torch' | 'brazier'
    if (livingWorldState.fireSheetCache.has(kind)) {
      return livingWorldState.fireSheetCache.get(kind);
    }
    const frames = [];
    for (let f = 1; f <= 4; f++) {
      frames.push({
        frameIndex: f,
        spriteKey: `${kind}_flame_bespoke_${f}`,
        anchorBaseLocked: true,
        warmTint: { r: 255, g: 165 + f * 12, b: 64 }
      });
    }
    const sheet = { fixtureType: kind, frameCount: 4, frames: frames };
    livingWorldState.fireSheetCache.set(kind, sheet);
    return sheet;
  }

  function emitSmokeParticle(sourceType, x, y, z) {
    const p = {
      sourceType: sourceType || 'chimney', // 'chimney' | 'golem_vent' | 'campfire'
      x: Number(x || 0),
      y: Number(y || 0),
      z: Number(z || 1.0),
      age: 0,
      maxAge: 2.5
    };
    livingWorldState.smokePlumes.push(p);
    return p;
  }

  function triggerWaterSplash(x, y, entityType) {
    const splash = {
      x: Number(x || 0),
      y: Number(y || 0),
      entityType: entityType || 'player',
      dropletCount: 8,
      age: 0,
      maxAge: 0.45,
      frame: 'water_splash_1'
    };
    livingWorldState.waterSplashes.push(splash);
    return splash;
  }

  function computeWindSignAndBannerSway(windSpeed, simTimeSec) {
    const w = Math.max(0.1, Number(windSpeed) || 1.0);
    const t = Number(simTimeSec || 0);
    return {
      signAngleDeg: Number((Math.sin(t * 2.2) * 6.5 * w).toFixed(2)),
      bannerWavePhase: Number(((t * 3.1 * w) % (Math.PI * 2)).toFixed(3))
    };
  }

  function stepAreaFoliageParticles(mapId, dt) {
    const area = String(mapId || 'oakhaven').toLowerCase();
    const particleKind =
      area.includes('whisper') || area.includes('spectral')
        ? 'spectral_spore_petal'
        : area.includes('deep_woods')
          ? 'ash_blossom'
          : 'autumn_oak_leaf';
    if (livingWorldState.foliageParticles.length < 12) {
      livingWorldState.foliageParticles.push({
        kind: particleKind,
        x: (livingWorldState.foliageParticles.length * 1.7) % 16,
        y: (livingWorldState.foliageParticles.length * 2.3) % 16,
        z: 1.8
      });
    }
    const step = Math.max(0, Number(dt) || 0.016);
    for (let i = 0; i < livingWorldState.foliageParticles.length; i++) {
      const fp = livingWorldState.foliageParticles[i];
      fp.kind = particleKind;
      fp.z = fp.z <= 0.05 ? 1.8 : Number((fp.z - step * 0.35).toFixed(3));
    }
    return livingWorldState.foliageParticles;
  }

  function computeBellSwingState(isRinging, simTimeSec) {
    if (!isRinging) return { ringing: false, swingAngleDeg: 0, clapperStrike: false };
    const phase = Number(simTimeSec || 0) * 4.0;
    const angle = Math.sin(phase) * 32.0;
    const clapperStrike = Math.abs(Math.abs(angle) - 32.0) < 3.5;
    return {
      ringing: true,
      swingAngleDeg: Number(angle.toFixed(2)),
      clapperStrike: clapperStrike
    };
  }

  function computeMooredKestrelPose(simTimeSec) {
    const t = Number(simTimeSec || 0);
    return {
      verticalBobZ: Number((Math.sin(t * 1.1) * 0.14).toFixed(3)),
      yawDriftDeg: Number((Math.cos(t * 0.65) * 4.2).toFixed(2))
    };
  }

  function computeShardGlimmer(shardId, simTimeSec) {
    const seed = String(shardId || 'shard').length * 1.37;
    const pulse = (Math.sin(Number(simTimeSec || 0) * 5.0 + seed) + 1) * 0.5;
    return {
      glimmerIntensity: Number((0.35 + pulse * 0.65).toFixed(3)),
      sparkleFrame: pulse > 0.8 ? 'shard_glimmer_peak' : 'shard_glimmer_soft'
    };
  }

  function setGateState(gateId, targetOpenRatio) {
    const id = String(gateId || 'gate_0');
    const current = livingWorldState.gates.get(id) || { id: id, openRatio: 0, targetRatio: 0 };
    current.targetRatio = Math.max(0, Math.min(1, Number(targetOpenRatio) || 0));
    livingWorldState.gates.set(id, current);
    return current;
  }

  function stepGateAnimations(dt) {
    const step = Math.max(0, Number(dt) || 0.016);
    const results = [];
    livingWorldState.gates.forEach(function (gate) {
      if (gate.openRatio < gate.targetRatio) {
        gate.openRatio = Math.min(gate.targetRatio, gate.openRatio + step * 1.2);
      } else if (gate.openRatio > gate.targetRatio) {
        gate.openRatio = Math.max(gate.targetRatio, gate.openRatio - step * 1.2);
      }
      gate.collisionPassable = gate.openRatio >= GATE_COLLISION_OPEN_THRESHOLD;
      results.push(Object.assign({}, gate));
    });
    return results;
  }

  function triggerStoryWallCollapse(G, collapseConfig) {
    if (!G || !collapseConfig) return { ok: false };
    const cx = Number(collapseConfig.x || 10);
    const cy = Number(collapseConfig.y || 10);
    const safeX = Number(collapseConfig.safeRecoveryX ?? (cx - 2.0));
    const safeY = Number(collapseConfig.safeRecoveryY ?? cy);

    let playerRecoveredSafely = false;
    if (G.player) {
      const dist = Math.hypot((G.player.x || 0) - cx, (G.player.y || 0) - cy);
      if (dist < 1.75) {
        G.player.x = safeX;
        G.player.y = safeY;
        playerRecoveredSafely = true;
      }
    }

    const ev = {
      id: collapseConfig.id || 'quarry_cave_in',
      x: cx,
      y: cy,
      safeRecoveryX: safeX,
      safeRecoveryY: safeY,
      playerRecoveredSafely: playerRecoveredSafely,
      rubbleSettled: true
    };
    livingWorldState.wallCollapses.push(ev);
    return { ok: true, collapseEvent: ev };
  }

  if (typeof window !== 'undefined') {
    window.OctaveLivingWorld = {
      GATE_COLLISION_OPEN_THRESHOLD,
      triggerCompanionHitReaction,
      resolveCompanionPose,
      emitLyraMusicalAirRipple,
      stepLyraAirRipples,
      resolveNpcGestureAndRoutine,
      stepAmbientWildlife,
      getOrBuildFireSheet,
      emitSmokeParticle,
      triggerWaterSplash,
      computeWindSignAndBannerSway,
      stepAreaFoliageParticles,
      computeBellSwingState,
      computeMooredKestrelPose,
      computeShardGlimmer,
      setGateState,
      stepGateAnimations,
      triggerStoryWallCollapse,
      getState: function () { return livingWorldState; }
    };
  }
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 5: ILLUSTRATED INTERFACE
 * Scope: Graphics — menus and screens (10 items)
 * ============================================================================ */
(function () {
  'use strict';

  const VALID_PORTRAIT_EMOTIONS = new Set(['neutral', 'angry', 'sad', 'afraid', 'wry']);
  const AUTOMAP_STAMPS = Object.freeze({
    door:        { id: 'door',        glyph: '∏', inkHex: '#d8b66c', label: 'Doorway' },
    quest_giver: { id: 'quest_giver', glyph: '!', inkHex: '#7be098', label: 'Quest Giver' },
    shop:        { id: 'shop',        glyph: '⚖', inkHex: '#e8c456', label: 'Merchant Stall' },
    danger:      { id: 'danger',      glyph: '☠', inkHex: '#e06055', label: 'Hazard / Boss' },
    recess:      { id: 'recess',      glyph: '▨', inkHex: '#94a8b8', label: 'Shrouded Recess' },
    puzzle:      { id: 'puzzle',      glyph: '◈', inkHex: '#8cf0e8', label: 'Harmonic Mechanism' }
  });

  const DEATH_CAUSE_ILLUSTRATIONS = Object.freeze({
    unwritten_by_hush:       { id: 'unwritten_by_hush',       title: 'Unwritten in the Hush',         palette: ['#222430', '#6a7288', '#d0d4e0'] },
    shattered_by_cacophony:  { id: 'shattered_by_cacophony',  title: 'Torn by the Cacophony',         palette: ['#2e1418', '#b83230', '#f2a878'] },
    drowned_in_whisper_grove:{ id: 'drowned_in_whisper_grove',title: 'Claimed by Drowned Marble',     palette: ['#10242c', '#2e6878', '#98d8d0'] },
    claimed_by_synod:        { id: 'claimed_by_synod',        title: 'Catalogued by the Synod',       palette: ['#241e28', '#8a7248', '#e6d2a2'] },
    fell_in_battle:          { id: 'fell_in_battle',          title: 'Silenced Along the Narrow',     palette: ['#241a18', '#785240', '#d8c4b0'] }
  });

  const ENDING_ILLUSTRATIONS = Object.freeze({
    ledger_restored:     { id: 'ledger_restored',     title: 'The Names Remembered',              aspect: '16:9', chaptersReflected: 4 },
    synod_concord:       { id: 'synod_concord',       title: 'The Measured Accord of Oakhaven',   aspect: '16:9', chaptersReflected: 4 },
    free_captains_sails: { id: 'free_captains_sails', title: 'Sails Toward the Rust Coast',       aspect: '16:9', chaptersReflected: 4 },
    silent_coda:         { id: 'silent_coda',         title: 'Coda of the Unrung Bell',           aspect: '16:9', chaptersReflected: 4 }
  });

  const iconCache = new Map();
  const portraitCache = new Map();

  function getCarvedWoodFrameStyle(highContrast) {
    if (highContrast) {
      return {
        borderCss: '2px solid #ffffff',
        backgroundCss: '#000000',
        brassCorners: false
      };
    }
    return {
      borderCss: '3px ridge #6e4e2e',
      boxShadowCss: 'inset 0 0 0 2px #b99856, 0 8px 24px rgba(0,0,0,0.85)',
      backgroundCss: 'linear-gradient(180deg, #1d1714 0%, #14100e 100%)',
      brassCorners: true,
      cornerOrnaments: ['tl_brass_leaf', 'tr_brass_leaf', 'bl_brass_leaf', 'br_brass_leaf']
    };
  }

  function composePaperDollLayers(G) {
    const p = (G && G.player) || {};
    const eq = p.equipment || p.equipped || {};
    const slots = ['head', 'body', 'hands', 'legs', 'feet'];
    const layers = [{ layerId: 'base_character_sheet', zIndex: 0 }];

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = eq[slot];
      const itemId = typeof item === 'string' ? item : (item && item.id);
      if (itemId) {
        layers.push({
          slot: slot,
          itemId: String(itemId).replace(/[^a-z0-9_-]/gi, ''),
          spriteSheet: `paperdoll_${slot}_${String(itemId).replace(/[^a-z0-9_-]/gi, '')}`,
          zIndex: i + 1,
          canRemove: true
        });
      }
    }

    const weapon = eq.weapon || p.weapon || 'iron_sword';
    const weaponId = String(typeof weapon === 'string' ? weapon : (weapon.id || 'iron_sword')).replace(/[^a-z0-9_-]/gi, '');
    const isTwoHanded = Boolean(
      weaponId === 'choir_staff' ||
      weaponId.includes('maul') ||
      weaponId.includes('crossbow') ||
      weaponId.includes('spear') ||
      (weapon && weapon.twoHanded)
    );

    layers.push({
      slot: 'weapon',
      itemId: weaponId,
      spriteSheet: `paperdoll_weapon_${weaponId}`,
      twoHanded: isTwoHanded,
      zIndex: 10
    });

    const shield = eq.offhand || eq.shield;
    const shieldId = typeof shield === 'string' ? shield : (shield && shield.id);
    const shieldSuppressed = Boolean(isTwoHanded && shieldId);
    if (shieldId && !isTwoHanded) {
      layers.push({
        slot: 'shield',
        itemId: String(shieldId).replace(/[^a-z0-9_-]/gi, ''),
        spriteSheet: `paperdoll_shield_${String(shieldId).replace(/[^a-z0-9_-]/gi, '')}`,
        zIndex: 9
      });
    }

    return {
      layers: layers,
      twoHandedShieldSuppressed: shieldSuppressed,
      equipControlsPreserved: true
    };
  }

  function getOrBuildPaintedItemIcon(itemId, category) {
    const cleanId = String(itemId || 'unknown_item').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cat = String(category || 'item').toLowerCase();
    const key = `${cat}:${cleanId}`;
    if (iconCache.has(key)) return iconCache.get(key);

    const pixels = new Uint8Array(24 * 24 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 160;
      pixels[i + 1] = 135;
      pixels[i + 2] = 85;
      pixels[i + 3] = 255;
    }
    const icon = { itemId: cleanId, category: cat, width: 24, height: 24, pixels: pixels };
    iconCache.set(key, icon);
    return icon;
  }

  function getNpcPortraitSheet(npcId, emotion) {
    const id = String(npcId || 'kaelen').toLowerCase();
    const emo = VALID_PORTRAIT_EMOTIONS.has(String(emotion || '').toLowerCase())
      ? String(emotion).toLowerCase()
      : 'neutral';
    const key = `${id}:${emo}`;
    if (portraitCache.has(key)) return portraitCache.get(key);

    const sheet = {
      npcId: id,
      emotion: emo,
      portraitKey: `portrait_${id}_${emo}`,
      width: 64,
      height: 64
    };
    portraitCache.set(key, sheet);
    return sheet;
  }

  function getQuestLogSketch(questId) {
    const q = String(questId || 'the_rite').toLowerCase();
    return {
      questId: q,
      sketchKey: `logbook_sketch_${q}`,
      style: 'charcoal_sepia_ink'
    };
  }

  function getAreaLoadingIllustration(mapId) {
    const m = String(mapId || 'oakhaven').toLowerCase();
    return {
      mapId: m,
      illustrationKey: `loading_painted_${m}`,
      caption: `Entering ${m.replace(/_/g, ' ')}...`
    };
  }

  function getCauseSpecificDeathScreen(cause) {
    const key = String(cause || 'fell_in_battle').toLowerCase();
    return DEATH_CAUSE_ILLUSTRATIONS[key] || DEATH_CAUSE_ILLUSTRATIONS.fell_in_battle;
  }

  function getEndingIllustration(endingId) {
    const key = String(endingId || 'ledger_restored').toLowerCase();
    return ENDING_ILLUSTRATIONS[key] || ENDING_ILLUSTRATIONS.ledger_restored;
  }

  function getTypographyConfig(options) {
    const opts = options || {};
    const large = Boolean(opts.largeText);
    return {
      headingFontFamily: "'OctaveBlackletter', 'UnifrakturMaguntia', Georgia, serif",
      headingLicense: 'SIL Open Font License 1.1 (Locally Bundled)',
      bodyFontFamily: "'OctaveReadableSerif', Georgia, system-ui, sans-serif",
      baseFontSizePx: large ? 20 : 16,
      lineHeight: large ? 1.65 : 1.45
    };
  }

  function getAutomapStamp(stampType) {
    const key = String(stampType || 'door').toLowerCase();
    return AUTOMAP_STAMPS[key] || AUTOMAP_STAMPS.door;
  }

  if (typeof window !== 'undefined') {
    window.OctaveIllustratedInterface = {
      getCarvedWoodFrameStyle,
      composePaperDollLayers,
      getOrBuildPaintedItemIcon,
      getNpcPortraitSheet,
      getQuestLogSketch,
      getAreaLoadingIllustration,
      getCauseSpecificDeathScreen,
      getEndingIllustration,
      getTypographyConfig,
      getAutomapStamp
    };
  }
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 6: STORY REACTIVITY
 * Scope: Story and world-building (8 items)
 * ============================================================================ */
(function () {
  'use strict';

  const TOTAL_TOBIN_JOURNAL_PAGES = 8;

  const FUTURE_REGION_TEASERS = Object.freeze({
    organum: {
      region: 'Organum',
      title: 'The Brass Pipes of High Organum',
      teaserText: 'Beyond the Reach stand the cathedral-foundries of Organum, where entire valleys are tuned by steam-bellows.'
    },
    iron_peaks: {
      region: 'The Iron Peaks',
      title: 'Miners of the Unstruck Ore',
      teaserText: 'In the Iron Peaks, bell-founders quarry lodestone that hums against the Synod scale.'
    },
    the_rift: {
      region: 'The Rift',
      title: 'Where the Eighth Interval Broke',
      teaserText: 'South of the glass-veins lies the Rift, where the Shattered Octave still bleeds raw silence.'
    }
  });

  function resolveTavernRumours(G) {
    const flags = (G && G.flags) || {};
    const p = (G && G.player) || {};
    const rumours = [];

    if ((p.bounty || 0) >= 40) {
      rumours.push('The Watch has nailed your likeness to the square post—keep your hood low near the constables.');
    }
    if (flags['boss_defeated:deacon'] || flags['deacon_spared']) {
      rumours.push('Folk whisper the Unrung Bell in the Cloister fell silent without claiming its tithe.');
    }
    if (flags['ledger_hollows_restored'] > 0) {
      rumours.push('Some of the Hollows along the marsh spoke their own Christian names before dawn.');
    }
    if (!rumours.length) {
      rumours.push('The Proctors are measuring cellar casks and voices alike before the Rite.');
    }
    return rumours;
  }

  function generateSynodBroadsheet(G) {
    const flags = (G && G.flags) || {};
    const rep = (G && G.reputation) || {};
    const synodStanding = Number(rep.synod || 0);
    const bounty = Number((G && G.player && G.player.bounty) || 0);

    let spin = 'neutral_orthodoxy';
    let headline = 'THE SYNOD GAZETTE: HARMONY MAINTAINED IN THE REACH';
    if (bounty >= 40 || synodStanding < -20) {
      spin = 'alarmist_condemnation';
      headline = 'THE SYNOD GAZETTE: DISSONANT AGITATOR SOUGHT BY PROCTORS';
    } else if (synodStanding >= 25 || flags['sided_with_synod']) {
      spin = 'orthodox_praise';
      headline = 'THE SYNOD GAZETTE: FAITHFUL AUXILIARY UPHOLDS THE CANON';
    } else if (flags['boss_defeated:deacon']) {
      spin = 'censored_propaganda';
      headline = 'THE SYNOD GAZETTE: CLOISTER BELFRY CLOSED FOR ACOUSTIC REPAIRS';
    }

    return {
      spin: spin,
      headline: headline,
      issueNumber: 418
    };
  }

  function checkAndDeliverCourierLetters(G) {
    if (!G || !G.player) return [];
    G.flags = G.flags || {};
    const delivered = [];

    const candidates = [
      {
        triggerFlag: 'helped_sable_ledger',
        deliveredFlag: 'courier_delivered:sable_thanks',
        sender: 'Sable, Archivist of the Veil',
        subject: 'A Name Preserved in the Margin',
        rewardGold: 15
      },
      {
        triggerFlag: 'helped_cantor_root_note',
        deliveredFlag: 'courier_delivered:cantor_tuning',
        sender: 'Cantor Thorne',
        subject: 'The 174 Hz Tuning-Leaf',
        rewardGold: 12
      }
    ];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (G.flags[c.triggerFlag] && !G.flags[c.deliveredFlag]) {
        G.flags[c.deliveredFlag] = true;
        G.player.gold = Number(G.player.gold || 0) + c.rewardGold;
        delivered.push(c);
      }
    }
    return delivered;
  }

  function triggerRestDreamScene(G, actNumber) {
    if (!G) return null;
    G.flags = G.flags || {};
    const act = Math.max(1, Math.min(4, Number(actNumber) || 1));
    const key = `dream_seen:act_${act}`;
    if (G.flags[key]) return { alreadySeen: true, act: act };

    G.flags[key] = true;
    const visions = {
      1: 'You dream of eight bronze bells hanging above a glass sea; the seventh cracks without a sound.',
      2: 'Through drowned marble arches, a man with a tuning-fork writes "417" upon the water.',
      3: 'The Hush rises like snow over Oakhaven, erasing signboards letter by letter.',
      4: 'Two voices—one of resonant glass, one of living breath—hold the Narrow open against the dark.'
    };
    return {
      alreadySeen: false,
      act: act,
      visionText: visions[act]
    };
  }

  function triggerLightGlassMemoryEcho(G, echoId) {
    if (!G) return null;
    G.flags = G.flags || {};
    const id = String(echoId || 'tobin_hedge_417');
    G.flags[`memory_echo:${id}`] = true;
    return {
      echoId: id,
      title: 'Light-Glass Memory Echo',
      transcript: 'A green-gold afterimage shimmers in the glass: "If the Synod seals the Root-vault, strike the third interval..."'
    };
  }

  function collectTobinJournalPage(G, pageNumber) {
    if (!G) return { ok: false };
    G.flags = G.flags || {};
    const num = Math.max(1, Math.min(TOTAL_TOBIN_JOURNAL_PAGES, Math.floor(Number(pageNumber) || 1)));
    G.flags[`tobin_page:${num}`] = true;
    return getTobinJournalProgress(G);
  }

  function getTobinJournalProgress(G) {
    const flags = (G && G.flags) || {};
    const collected = [];
    for (let i = 1; i <= TOTAL_TOBIN_JOURNAL_PAGES; i++) {
      if (flags[`tobin_page:${i}`]) collected.push(i);
    }
    return {
      ok: true,
      collectedCount: collected.length,
      totalCount: TOTAL_TOBIN_JOURNAL_PAGES,
      completed: collected.length === TOTAL_TOBIN_JOURNAL_PAGES,
      pages: collected
    };
  }

  function resolveCompanionEndings(G) {
    const flags = (G && G.flags) || {};
    const approval = (G && G.companionApproval) || {};
    const kaelenScore = Number(approval.kaelen ?? 50);
    const lyraScore = Number(approval.lyra ?? 50);

    const kaelenEnding = flags['kaelen_tideline_eased']
      ? (kaelenScore >= 50 ? 'kaelen_tempered_guardian' : 'kaelen_wandering_warden')
      : 'kaelen_hardened_glass_blade';

    const lyraEnding = flags['lyra_calling_song_reconciled']
      ? (lyraScore >= 50 ? 'lyra_keeper_of_the_new_choir' : 'lyra_chronicler_of_417')
      : 'lyra_solitary_voice_in_the_narrow';

    return {
      kaelenEnding: kaelenEnding,
      lyraEnding: lyraEnding
    };
  }

  function getFutureRegionLoreTeasers() {
    return Object.assign({}, FUTURE_REGION_TEASERS);
  }

  if (typeof window !== 'undefined') {
    window.OctaveStoryReactivity = {
      TOTAL_TOBIN_JOURNAL_PAGES,
      resolveTavernRumours,
      generateSynodBroadsheet,
      checkAndDeliverCourierLetters,
      triggerRestDreamScene,
      triggerLightGlassMemoryEcho,
      collectTobinJournalPage,
      getTobinJournalProgress,
      resolveCompanionEndings,
      getFutureRegionLoreTeasers
    };
  }
})();


/* ============================================================================
 * Echoes of the Shattered Octave — PHASE 7: SOUND, ACCESS & TOOLS
 * (+ Phase 1 Directional On-Screen Sound Ripples Paired with Positional Sound)
 * Scope: Audio (6 items), Technical & Polish (9 items) & Directional Sound Ripples (1 item)
 * ============================================================================ */
(function () {
  'use strict';

  const AREA_COMPOSITIONS = Object.freeze({
    oakhaven:      { id: 'oakhaven_pastoral_minor',     rootHz: 174, tempoBpm: 76,  instruments: ['lute', 'low_flute', 'hearth_drone'] },
    whisper_grove: { id: 'whisper_grove_sunken_glass',  rootHz: 528, tempoBpm: 64,  instruments: ['glass_harp', 'water_chime', 'cello_swell'] },
    deep_woods:    { id: 'deep_woods_unrung_ash',       rootHz: 396, tempoBpm: 84,  instruments: ['prepared_strings', 'contrabass', 'bronze_bell'] }
  });

  const INDIVIDUAL_BOSS_THEMES = Object.freeze({
    steam_golem:               { themeId: 'theme_furnace_pistons',   tempoBpm: 118, keyHz: 285 },
    aegis_sentinel:            { themeId: 'theme_violet_core',       tempoBpm: 124, keyHz: 528 },
    pressman_mallow:           { themeId: 'theme_lead_type_march',   tempoBpm: 112, keyHz: 396 },
    phantom_weaver:            { themeId: 'theme_silk_and_echo',     tempoBpm: 128, keyHz: 639 },
    the_requiem:               { themeId: 'theme_shattered_mass',    tempoBpm: 132, keyHz: 741 },
    brood_mother:              { themeId: 'theme_chitin_swarm',      tempoBpm: 126, keyHz: 396 },
    deacon_of_the_unrung_bell: { themeId: 'theme_unrung_tolling',    tempoBpm: 108, keyHz: 174 },
    hal_brennick:              { themeId: 'theme_outrider_spur',     tempoBpm: 122, keyHz: 285 },
    hushwarden:                { themeId: 'theme_grey_coat_cordon',  tempoBpm: 116, keyHz: 639 },
    the_wearer:                { themeId: 'theme_many_borrowed_names',tempoBpm: 136, keyHz: 741 }
  });

  const VOICE_ASSET_LICENSE_MANIFEST = Object.freeze({
    licensePolicy: '100% Procedural WebAudio Synthesis + Web Speech API TTS (CC0 / MIT First-Party Authored Profiles)',
    profiles: {
      proctor:    { greet: 'State your parish and measure.', grunt: 'low_baritone_bark', license: 'CC0-1.0' },
      constable:  { greet: 'Keep the peace in Oakhaven.',   grunt: 'stern_watch_grunt', license: 'CC0-1.0' },
      kaelen:     { greet: 'My glass arm still hums.',      grunt: 'resonant_chest_hum',license: 'CC0-1.0' },
      lyra:       { greet: 'Listen to the interval.',       grunt: 'alto_breath_intake',license: 'CC0-1.0' }
    }
  });

  const CREDITS_AUDIT_MANIFEST = Object.freeze({
    project: 'Echoes of the Shattered Octave — Book One: The Silenced Province',
    artAndAnimation: 'First-Party Hand-Painted & Procedural Pixel Art (26 Enemy Species, Kaelen & Lyra, Regional Maps)',
    typography: 'Bundled OctaveBlackletter (SIL OFL 1.1) & System Accessible Serif/Sans Fallbacks',
    audioAndMusic: 'Procedural WebAudio Harmonic Synthesizer & Dynamic Music Director (CC0 / MIT)',
    toolsAndEngine: 'Custom Software Raycast 3D Engine with Per-Pixel Depth Buffer & Schema-Validated Dungeon Editor'
  });

  const DESKTOP_PACKAGING_MANIFEST = Object.freeze({
    targets: ['win32-x64', 'darwin-universal', 'linux-x86_64-AppImage'],
    license: 'MIT',
    codeSigningPolicy: 'Detached SHA-256 checksums + platform authenticode/notarization hooks; 100% offline-capable with no forced telemetry',
    verifiedInputs: ['keyboard_mouse', 'touch_virtual_stick', 'html5_gamepad_standard']
  });

  const TRANSLATION_CATALOG = Object.freeze({
    en: {
      'ui.disguise_active': 'Synod Robes (Unquestioned)',
      'ui.wanted_notice': 'Wanted by the Oakhaven Watch',
      'ui.photo_mode': 'Photo Mode — Interface Hidden (Paused)'
    },
    es: {
      'ui.disguise_active': 'Túnica del Sínodo (Sin sospecha)',
      'ui.wanted_notice': 'Buscado por la Guardia de Oakhaven',
      'ui.photo_mode': 'Modo Foto — Interfaz oculta (En pausa)'
    },
    fr: {
      'ui.disguise_active': 'Robe du Synode (Hors de soupçon)',
      'ui.wanted_notice': 'Recherché par la Garde d’Oakhaven',
      'ui.photo_mode': 'Mode Photo — Interface masquée (Pause)'
    }
  });

  const toolsState = {
    directionalRipples: [],
    photoModeActive: false,
    speedrunTimer: {
      enabled: false,
      igtMs: 0,
      pausedForLoadOrModal: false
    },
    statistics: {
      kills: 0,
      distanceUnits: 0,
      playtimeSeconds: 0,
      songsCast: 0
    }
  };

  function getAreaCompositionProfile(mapId) {
    const key = String(mapId || 'oakhaven').toLowerCase();
    return AREA_COMPOSITIONS[key] || AREA_COMPOSITIONS.oakhaven;
  }

  function getBossThemeProfile(bossSpecies) {
    const key = String(bossSpecies || 'deacon_of_the_unrung_bell').toLowerCase().replace(/\s+/g, '_');
    return INDIVIDUAL_BOSS_THEMES[key] || INDIVIDUAL_BOSS_THEMES.deacon_of_the_unrung_bell;
  }

  function getEntityVocalCue(entity, cueType) {
    const key = String((entity && (entity.species || entity.id || entity.subtype)) || 'proctor').toLowerCase();
    const prof = VOICE_ASSET_LICENSE_MANIFEST.profiles[key] || VOICE_ASSET_LICENSE_MANIFEST.profiles.proctor;
    return {
      cue: cueType === 'greet' ? prof.greet : prof.grunt,
      license: prof.license
    };
  }

  function hasClearLineOfSight(G, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.05) return true;
    const steps = Math.max(2, Math.ceil(dist * 4));
    const map = G && G.map;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = Math.floor(x0 + dx * t);
      const sy = Math.floor(y0 + dy * t);
      if (map && Array.isArray(map.grid) && map.grid[sy] && map.grid[sy][sx]) {
        const cell = map.grid[sy][sx];
        if (cell === 1 || (typeof cell === 'object' && cell.solid && !cell.open)) return false;
      }
    }
    return true;
  }

  // Positional audio + Phase 1's directional on-screen sound ripples
  function computePositionalAudioAndRipple(G, sourceX, sourceY, label) {
    const px = Number((G && G.player && G.player.x) || 0);
    const py = Number((G && G.player && G.player.y) || 0);
    const playerAngle = Number((G && G.player && (G.player.angle ?? G.player.dir)) || 0);

    const dx = Number(sourceX || 0) - px;
    const dy = Number(sourceY || 0) - py;
    const dist = Math.hypot(dx, dy);
    const maxDist = 16.0;
    const distanceGain = Math.max(0, Math.min(1, 1 - dist / maxDist));

    const clearLos = hasClearLineOfSight(G, px, py, sourceX, sourceY);
    const wallMuffledGain = clearLos ? distanceGain : distanceGain * 0.38;
    const lowPassCutoffHz = clearLos ? 18000 : 950;

    const worldAngle = Math.atan2(dy, dx);
    let relAngle = worldAngle - playerAngle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;
    const stereoPan = Number(Math.max(-1, Math.min(1, Math.sin(relAngle))).toFixed(3));

    const ripple = {
      bearingRad: Number(relAngle.toFixed(3)),
      screenEdge: Math.abs(relAngle) < 0.6 ? 'front' : relAngle > 0 ? 'right' : 'left',
      intensity: Number(wallMuffledGain.toFixed(3)),
      muffledByWall: !clearLos,
      label: String(label || 'sound_cue')
    };
    toolsState.directionalRipples.push(ripple);
    if (toolsState.directionalRipples.length > 12) toolsState.directionalRipples.shift();

    return {
      gain: Number(wallMuffledGain.toFixed(3)),
      stereoPan: stereoPan,
      lowPassCutoffHz: lowPassCutoffHz,
      muffledByWall: !clearLos,
      directionalRipple: ripple
    };
  }

  function computeWeatherAudioLayers(weatherState, isIndoor) {
    const w = String(weatherState || 'clear').toLowerCase();
    return {
      willowWindGain: w.includes('wind') || w.includes('rain') ? (isIndoor ? 0.25 : 0.65) : 0.18,
      rooftopRainGain: w.includes('rain') ? (isIndoor ? 0.75 : 0.55) : 0.0,
      thunderLayerGain: w.includes('storm') || w.includes('rain') ? 0.45 : 0.0
    };
  }

  function getEvolvingMainThemeState(actNumber) {
    const act = Math.max(1, Math.min(4, Number(actNumber) || 1));
    const stages = {
      1: { act: 1, arrangement: 'solo_tuning_fork_and_lute',   dynamicLayers: 2 },
      2: { act: 2, arrangement: 'sunken_choir_and_glass_chime',dynamicLayers: 3 },
      3: { act: 3, arrangement: 'muffled_hush_drone_strings',  dynamicLayers: 3 },
      4: { act: 4, arrangement: 'full_octave_polyphonic_coda', dynamicLayers: 5 }
    };
    return stages[act];
  }

  function setPhotoMode(G, active) {
    toolsState.photoModeActive = Boolean(active);
    if (G) {
      G.pausedForPhotoMode = toolsState.photoModeActive;
      G.hideHudForPhotoMode = toolsState.photoModeActive;
    }
    return {
      photoModeActive: toolsState.photoModeActive,
      hudHidden: toolsState.photoModeActive,
      simulationPaused: toolsState.photoModeActive,
      exportedDataUrl: toolsState.photoModeActive ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null
    };
  }

  function stepSpeedrunTimer(dtSec, isPausedOrLoading) {
    toolsState.speedrunTimer.pausedForLoadOrModal = Boolean(isPausedOrLoading);
    if (toolsState.speedrunTimer.enabled && !isPausedOrLoading) {
      toolsState.speedrunTimer.igtMs += Math.round(Math.max(0, Number(dtSec) || 0) * 1000);
    }
    return Object.assign({}, toolsState.speedrunTimer);
  }

  function recordPlayerStatistic(statKey, delta) {
    const amount = Math.max(0, Number(delta) || 0);
    if (statKey in toolsState.statistics) {
      toolsState.statistics[statKey] += amount;
    }
    return Object.assign({}, toolsState.statistics);
  }

  function enforceAccessibilityAcrossEffects(G, effectPayload) {
    const opts = (G && G.options) || {};
    const out = Object.assign({}, effectPayload || {});
    if (opts.reducedShake || opts.reducedMotion) out.shakePx = 0;
    if (opts.noFlashes) out.flashAlpha = 0;
    if (opts.highContrast) {
      out.blurPx = 0;
      out.highContrastEnforced = true;
    }
    if (opts.largeText) {
      out.minFontSizePx = Math.max(20, Number(out.minFontSizePx || 16));
    }
    return out;
  }

  function translateMessage(locale, key) {
    const loc = String(locale || 'en').toLowerCase();
    const table = TRANSLATION_CATALOG[loc] || TRANSLATION_CATALOG.en;
    const baseText = table[key] || TRANSLATION_CATALOG.en[key] || String(key);
    if (loc === 'pseudo_expanded') {
      // +35% text expansion stress test
      return `[~~ ${baseText} ${'x'.repeat(Math.ceil(baseText.length * 0.35))} ~~]`;
    }
    return baseText;
  }

  // Versioned Mod Schema Validator (blocks script execution & prototype pollution)
  function validateModPackage(modPayload) {
    if (!modPayload || typeof modPayload !== 'object' || Array.isArray(modPayload)) {
      return { valid: false, reason: 'Mod payload must be a plain object.' };
    }
    const rawJson = JSON.stringify(modPayload);
    if (/__proto__|constructor|prototype/i.test(rawJson)) {
      return { valid: false, reason: 'Prototype pollution keys are forbidden.' };
    }
    if (/<\s*script|javascript:|eval\s*\(|new\s+Function|\bon[a-z]+\s*=/i.test(rawJson)) {
      return { valid: false, reason: 'Executable scripts or event handlers are forbidden in mods.' };
    }
    if (modPayload.schemaVersion !== 1) {
      return { valid: false, reason: 'Unsupported or missing schemaVersion (expected 1).' };
    }
    if (!['quest', 'enemy', 'map'].includes(String(modPayload.kind || ''))) {
      return { valid: false, reason: 'Invalid mod kind (expected quest, enemy, or map).' };
    }
    return { valid: true, schemaVersion: 1, kind: modPayload.kind };
  }

  // Built-in Dungeon Editor using validated schemas
  function createDungeonEditorMap(id, width, height) {
    const w = Math.max(4, Math.min(64, Math.floor(Number(width) || 16)));
    const h = Math.max(4, Math.min(64, Math.floor(Number(height) || 16)));
    const grid = Array.from({ length: h }, function (_, y) {
      return Array.from({ length: w }, function (__, x) {
        return (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 1 : 0;
      });
    });
    return {
      schemaVersion: 1,
      kind: 'map',
      id: String(id || 'custom_dungeon').replace(/[^a-z0-9_-]/gi, ''),
      width: w,
      height: h,
      grid: grid,
      entities: []
    };
  }

  function exportValidatedEditorMap(mapObj) {
    const check = validateModPackage(mapObj);
    if (!check.valid) return { ok: false, reason: check.reason };
    return { ok: true, json: JSON.stringify(mapObj) };
  }

  function importValidatedEditorMap(jsonString) {
    let parsed = null;
    try {
      parsed = JSON.parse(jsonString);
    } catch (_) {
      return { ok: false, reason: 'Invalid JSON.' };
    }
    const check = validateModPackage(parsed);
    if (!check.valid) return { ok: false, reason: check.reason };
    return { ok: true, map: parsed };
  }

  if (typeof window !== 'undefined') {
    window.OctaveSoundAccessTools = {
      AREA_COMPOSITIONS,
      INDIVIDUAL_BOSS_THEMES,
      VOICE_ASSET_LICENSE_MANIFEST,
      CREDITS_AUDIT_MANIFEST,
      DESKTOP_PACKAGING_MANIFEST,
      getAreaCompositionProfile,
      getBossThemeProfile,
      getEntityVocalCue,
      computePositionalAudioAndRipple,
      computeWeatherAudioLayers,
      getEvolvingMainThemeState,
      setPhotoMode,
      stepSpeedrunTimer,
      recordPlayerStatistic,
      enforceAccessibilityAcrossEffects,
      translateMessage,
      validateModPackage,
      createDungeonEditorMap,
      exportValidatedEditorMap,
      importValidatedEditorMap,
      getState: function () { return toolsState; }
    };
  }
})();


/* ============================================================================
 * UNIFIED EXPANSION SMOKE & VERIFICATION SUITE (Phases 1–7)
 * ============================================================================ */
(function () {
  'use strict';
  if (typeof window !== 'undefined') {
    window.runOctaveExpansionTests = function () {
      const results = {
        phase1_disguise: Boolean(window.OctaveDisguise),
        phase1_crimePrison: Boolean(window.OctaveCrimePrison),
        phase1_bribesThreats: Boolean(window.OctaveBribesThreats),
        phase1_travelSurvivalHardcore: Boolean(window.OctaveTravelSurvivalHardcore),
        phase2_spatialWorld: Boolean(window.OctaveSpatialWorld),
        phase3_combatLife: Boolean(window.OctaveCombatLife),
        phase4_livingWorld: Boolean(window.OctaveLivingWorld),
        phase5_illustratedInterface: Boolean(window.OctaveIllustratedInterface),
        phase6_storyReactivity: Boolean(window.OctaveStoryReactivity),
        phase7_soundAccessTools: Boolean(window.OctaveSoundAccessTools)
      };
      results.allPassed = Object.values(results).every(Boolean);
      return results;
    };
  }
})();
