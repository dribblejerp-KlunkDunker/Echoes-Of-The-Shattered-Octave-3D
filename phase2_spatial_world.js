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
