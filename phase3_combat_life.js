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
