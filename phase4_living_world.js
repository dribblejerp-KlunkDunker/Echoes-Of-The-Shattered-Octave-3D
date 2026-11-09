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
