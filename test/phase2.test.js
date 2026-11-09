const assert = require('assert');
global.window = global;
require('../phase2_spatial_world.js');

const S = window.OctaveSpatialWorld;

// 1. Per-pixel depth buffer & low-wall partial occlusion
S.initDepthBuffer(320, 200);
window.G = {
  currentMap: 'cloister',
  worldHours: 22,
  flags: { part_three_kestrel_flyover: true },
  player: { x: 11.0, y: 12.0, z: 0.0, eyeZ: 0.52, angle: 0, torchLit: false },
  map: {
    id: 'cloister',
    grid: Array.from({ length: 25 }, () => Array(25).fill(0))
  },
  entities: [
    { id: 'tall_proctor', type: 'enemy', species: 'proctor', x: 14.0, y: 12.0, z: 0.0, height: 1.1, hp: 30, emissiveGlass: true, lightRadius: 6.0 }
  ]
};

// Rasterize low wall at (12,12) of height 0.45 at dist=1.5 on column x=160
const slice = S.rasterizeSpatialWallSlice(160, 1.5, 0.52, 0.0, 0.45, 100);
assert(slice.pixelsWritten > 0, 'Low wall writes to lower pixels of column 160');
assert.strictEqual(S.readPixelDepth(160, 80), Infinity, 'Upper pixel above low wall remains unoccluded (Infinity)');
assert.strictEqual(S.readPixelDepth(160, slice.bottomY), 1.5, 'Lower pixel behind low wall has depth 1.5');

// 2. 3D Picking agrees with per-pixel depth buffer (head visible above low wall is pickable; feet behind low wall occluded)
const headPick = S.pickSpatialTarget(window.G, 160, 88);
assert(headPick && headPick.entity.id === 'tall_proctor', 'Tall enemy upper body visible above low wall is pickable');
const feetPick = S.pickSpatialTarget(window.G, 160, slice.bottomY);
assert.strictEqual(feetPick, null, 'Lower body occluded by low wall is not pickable');

// 3. Elevation-aware collision: Cloister Belfry stairs & sheer drop/ledge checks
window.G.player.x = 14.0;
window.G.player.y = 11.0;
window.G.player.z = 0.0;

// Step onto Belfry lower stairs (14,10 -> floorZ 0.25)
const step1 = S.movePlayerWithElevation(window.G, 14.0, 10.0);
assert.strictEqual(step1.moved, true);
assert.strictEqual(window.G.player.z, 0.25);

// Step onto mid stairs (14,9 -> floorZ 0.55)
const step2 = S.movePlayerWithElevation(window.G, 14.0, 9.0);
assert.strictEqual(step2.moved, true);
assert.strictEqual(window.G.player.z, 0.55);

// Attempting to step directly from z=0.0 onto high platform (15,8 -> floorZ 1.15) is blocked
const blockedLedge = S.canTraverseElevation(window.G, 15.0, 9.0, 0.0, 15.0, 8.0);
assert.strictEqual(blockedLedge.allowed, false);
assert.strictEqual(blockedLedge.reason, 'ledge_too_high');

// Attempting to walk through low parapet wall at (12,12) is blocked
const blockedLowWall = S.canTraverseElevation(window.G, 11.0, 12.0, 0.0, 12.0, 12.0);
assert.strictEqual(blockedLowWall.allowed, false);
assert.strictEqual(blockedLowWall.reason, 'blocked_by_low_wall');

// 4. Painted ceilings, sky panorama, water ripples & ground mist
const vaultSample = S.samplePaintedCeiling('cloister_vault', 2.02, 2.02);
assert.strictEqual(vaultSample.tag, 'vault_rib');
const beamSample = S.samplePaintedCeiling('tavern_beams', 1.02, 1.5);
assert.strictEqual(beamSample.tag, 'oak_beam');

S.triggerFootstepRipple(5.0, 5.0, 1.0);
const waterSample = S.sampleWaterReflectionAndRipple(window.G, 5.1, 5.0, { r: 80, g: 100, b: 130 }, null);
assert(typeof waterSample.rippleDisplacement === 'number' && waterSample.b > 0, 'Water reflection and ripple displacement computed');

window.G.currentMap = 'whisper_grove';
const lowMist = S.computeSpatialFogAndTorchLight(window.G, 6.0, 0.1);
const highMist = S.computeSpatialFogAndTorchLight(window.G, 6.0, 1.2);
assert(lowMist.mistFactor > highMist.mistFactor, 'Ground-hugging mist is denser near the floor than up high');

// 5. Emissive light-glass wall occlusion & close-up wall detail memory budget
window.G.currentMap = 'cloister';
const clearLight = S.computeOccludedEmissiveLight(window.G, 12.0, 12.0);
assert(clearLight.g > 0, 'Emissive glass light illuminates unobstructed point');
window.G.map.grid[12][13] = 1; // solid wall between (14,12) and (12,12)
const occludedLight = S.computeOccludedEmissiveLight(window.G, 12.0, 12.0);
assert.strictEqual(occludedLight.activeEmitters, 0, 'Solid wall occludes light-glass emitter');
window.G.map.grid[12][13] = 0;

for (let i = 0; i < 90; i++) {
  S.getCloseUpWallDetailTile('stone_' + i, 128);
}
assert(S.getSpatialState().wallDetailBytesUsed <= S.MAX_WALL_DETAIL_CACHE_BYTES, 'Wall detail cache strictly respects 4MB memory budget');

// 6. Five-angle directional octant resolver (enemy heading vs viewer, mirror only opposite oblique/side)
const frontOct = S.resolveEnemyDirectionalOctant(0, 15, 10, 10, 10);
assert.strictEqual(frontOct.view, 'front');
assert.strictEqual(frontOct.mirrorX, false);

const leftSideOct = S.resolveEnemyDirectionalOctant(0, 10, 15, 10, 10);
const rightSideOct = S.resolveEnemyDirectionalOctant(0, 10, 5, 10, 10);
assert.strictEqual(leftSideOct.view, 'side');
assert.strictEqual(rightSideOct.view, 'side');
assert.strictEqual(leftSideOct.mirrorX, false);
assert.strictEqual(rightSideOct.mirrorX, true, 'Opposite side view is mirrored');

// 7. Presets & CRT clean unfiltered mode
const highPreset = S.applyQualityPreset('high');
assert.strictEqual(highPreset.renderWidth, 640);
const metrics = S.recordFrameTimeMs(14.2);
assert(metrics.measuredFps > 60 && metrics.activePreset === 'high');

const crtSubtle = S.configureCRTFilter('subtle', { highContrast: false });
assert.strictEqual(crtSubtle.mode, 'subtle');
const crtClean = S.configureCRTFilter('subtle', { highContrast: true });
assert.strictEqual(crtClean.mode, 'off', 'High-contrast accessibility forces clean unfiltered mode');

console.log('ALL PHASE 2 SPATIAL WORLD ASSERTIONS PASSED');
