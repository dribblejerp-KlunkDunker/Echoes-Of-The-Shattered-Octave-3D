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
