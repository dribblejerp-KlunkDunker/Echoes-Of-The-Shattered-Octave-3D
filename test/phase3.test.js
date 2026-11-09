const assert = require('assert');
global.window = global;
require('../phase3_combat_life.js');

const CL = window.OctaveCombatLife;

window.G = {
  currentMap: 'cloister',
  options: { reducedShake: false, highContrast: false, largeText: true },
  player: { x: 10.0, y: 10.0, z: 0.5, status: { deafened: true, hushed: true } },
  entities: []
};

// 1. Verify all 26 species generate cached hit-flinch & 3-pose collapse/death sheets
for (const sp of CL.ALL_26_SPECIES) {
  const flinch = CL.getOrBuildHitFlinchFrame(sp, 'front', 1);
  assert(flinch && flinch.poseType === 'hit_flinch' && flinch.pixels.length > 0, 'Flinch built for ' + sp);
  const collapse = CL.getOrBuildCollapseSheet(sp, 'front', false);
  if (sp === 'cacophony_swarm' || sp === 'hush_moth') {
    assert.strictEqual(collapse.mode, 'scatter');
    assert.strictEqual(collapse.leavesCorpse, false);
  } else {
    assert.strictEqual(collapse.mode, 'collapse');
    assert.strictEqual(collapse.poses.length, 3);
    assert.strictEqual(collapse.leavesCorpse, true);
  }
}

// Water Drowned Hollow sinks without leaving corpse
const waterHollow = CL.getOrBuildCollapseSheet('drowned_hollow', 'front', true);
assert.strictEqual(waterHollow.mode, 'sink');
assert.strictEqual(waterHollow.leavesCorpse, false);

// 2. Species idle fidgets, detection startle & charging vs fleeing strides
const proctor = { id: 'p1', species: 'proctor', state: 'idle', hp: 20, maxHp: 20 };
const hound = { id: 'h1', species: 'cacophony_hound', state: 'idle', hp: 18, maxHp: 18 };
const quiet = { id: 'q1', species: 'quiet', state: 'idle', hp: 25, maxHp: 25 };

assert(CL.resolveIdleFidgetFrame(proctor, 0.5).fidgetType.startsWith('robe_hem_sway'));
assert(CL.resolveIdleFidgetFrame(hound, 0.5).fidgetType.startsWith('hound_sniff'));
assert(CL.resolveIdleFidgetFrame(quiet, 0.5).fidgetType.startsWith('quiet_head_turn'));

CL.triggerDetectionStartle(proctor, 'hearing');
assert.strictEqual(proctor._startleFrame, 'proctor_startle_hearing');

proctor.state = 'chase';
assert.strictEqual(CL.resolveLocomotionStrideFrame(proctor, 0.2).strideMode, 'charging');
proctor.hp = 2; // < 20% HP triggers fleeing stride
assert.strictEqual(CL.resolveLocomotionStrideFrame(proctor, 0.2).strideMode, 'fleeing');

// 3. Boss casting poses & Requiem/Brood-Mother 50% HP phase transitions
const deacon = { id: 'deacon', species: 'deacon_of_the_unrung_bell', boss: true, hp: 90, maxHp: 100 };
CL.beginBossCast(deacon, 'bell_rupture');
const castMid = CL.stepBossCast(deacon, 0.4);
assert.strictEqual(castMid.phase, 'pre_cast_glow');
const castRel = CL.stepBossCast(deacon, 0.6);
assert.strictEqual(castRel.phase, 'cast_release');

const requiem = { id: 'req', species: 'the_requiem', boss: true, hp: 45, maxHp: 100 };
const reqPhase = CL.checkAndApplyBossPhaseArtwork(requiem);
assert(reqPhase && reqPhase.phaseKey === 'requiem_half_health_shatter');

const brood = { id: 'bm', species: 'brood_mother', boss: true, hp: 40, maxHp: 100 };
const bmPhase = CL.checkAndApplyBossPhaseArtwork(brood);
assert(bmPhase && bmPhase.phaseKey === 'brood_mother_egg_sac_shed');

// 4. Collision-safe spawn telegraphs (pushes away if too close to player)
const telRes = CL.beginSpawnTelegraph(window.G, { mode: 'grave_emergence', species: 'drowned_hollow', x: 10.1, y: 10.0, duration: 0.5 });
assert(Math.hypot(telRes.telegraph.x - 10.0, telRes.telegraph.y - 10.0) >= 1.35, 'Telegraph pushed to collision-safe distance');
const spawned = CL.stepSpawnTelegraphs(window.G, 0.6);
assert.strictEqual(spawned.length, 1);
assert.strictEqual(spawned[0].spawnedVia, 'grave_emergence');

// 5. First-person Choir-Staff, draw/holster weapon switch, Song casting glow & head bob
window.WEAPON_CATALOG = {};
const staffSheet = CL.getOrBuildFirstPersonWeaponSheet('choir_staff', 'staff');
assert(window.WEAPON_CATALOG.choir_staff, 'Resonant Choir-Staff added to catalog');
assert(staffSheet.frames.strike_arc && staffSheet.frames.draw && staffSheet.frames.holster);

const sw = CL.triggerWeaponSwitch('choir_staff');
assert.strictEqual(sw.state, 'holstering');
CL.stepFirstPersonWeaponState(0.20); // finish holster -> enter drawing
assert.strictEqual(CL.getState().fpWeapon.equippedId, 'choir_staff');
CL.stepFirstPersonWeaponState(0.25); // finish draw -> ready
assert.strictEqual(CL.getState().fpWeapon.transitionState, 'ready');

const castSong = CL.triggerFirstPersonSongCast(528);
assert.strictEqual(castSong.glowColor.hex, '#8cf0e8');

// Establish the baseline elevation at z=0.5 first: the landing dip compares the
// new elevation against the previously measured one, so the walk up must be
// observed before the step down can register as a landing.
CL.computeHeadBobAndLandingOffset(window.G, 3.0, 0.05);
window.G.player.z = 0.0; // stepped down from 0.5 -> triggers landing dip
const bob = CL.computeHeadBobAndLandingOffset(window.G, 3.0, 0.05);
assert(bob.landingDipY > 0 && bob.bobY > 0, 'Head bob and landing dip active');

// 6. Access-safe screen effects, world interactions, climbing hands & held books
CL.triggerHeavyHitShake(8);
const fxNormal = CL.computeCombatScreenEffects(window.G, 0.05);
assert(fxNormal.shakePx > 0 && fxNormal.deafnessBlurPx > 0 && fxNormal.hushedDesaturate > 0);

window.G.options.reducedShake = true;
window.G.options.highContrast = true;
const fxAccess = CL.computeCombatScreenEffects(window.G, 0.05);
assert.strictEqual(fxAccess.shakePx, 0, 'Reduced shake zeroes camera shake');
assert.strictEqual(fxAccess.deafnessBlurPx, 0, 'High contrast disables blur');

CL.triggerWorldInteractionAnim('vestry_door', 'door');
const doorAnim = CL.stepWorldInteractions(0.40);
assert.strictEqual(doorAnim[0].angleDeg, 90);

const climb = CL.computeClimbingHandsOverlay(true, 1.5, 0.1);
assert.strictEqual(climb.visible, true);

const held = CL.openHeldReadingView(window.G, { title: 'Tobin Slate', pages: ['Page 1', 'Page 2'] });
assert.strictEqual(held.open, true);
assert.strictEqual(held.largeText, true);
const page2 = CL.turnHeldDocumentPage(1);
assert.strictEqual(page2.currentPage, 1);
CL.closeHeldReadingView();

console.log('ALL PHASE 3 COMBAT LIFE ASSERTIONS PASSED');
