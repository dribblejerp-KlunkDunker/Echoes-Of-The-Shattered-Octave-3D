const assert = require('assert');
global.window = global;

require('../phase4_living_world.js');
require('../phase5_illustrated_interface.js');
require('../phase6_story_reactivity.js');
require('../phase7_sound_access_tools.js');

const LW = window.OctaveLivingWorld;
const II = window.OctaveIllustratedInterface;
const SR = window.OctaveStoryReactivity;
const SAT = window.OctaveSoundAccessTools;

window.G = {
  currentMap: 'oakhaven',
  worldHours: 14,
  options: { reducedShake: true, noFlashes: true, highContrast: true, largeText: true },
  flags: { helped_sable_ledger: true, kaelen_tideline_eased: true, lyra_calling_song_reconciled: true },
  companionApproval: { kaelen: 75, lyra: 80 },
  player: {
    x: 10.0,
    y: 10.0,
    angle: 0,
    gold: 50,
    bounty: 45,
    equipment: { head: 'iron_helm', body: 'synod_robe', weapon: 'choir_staff', shield: 'oak_buckler' }
  },
  map: {
    id: 'oakhaven',
    grid: Array.from({ length: 20 }, () => Array(20).fill(0))
  },
  entities: []
};

// --- Phase 4 assertions ---
const kaelen = { id: 'kaelen', hp: 50, maxHp: 60 };
const hit = LW.triggerCompanionHitReaction(kaelen, 35); // hp becomes 15/60 (25% < 35%)
assert.strictEqual(hit.injured, true);
assert.strictEqual(hit.limping, true);
assert.strictEqual(LW.resolveCompanionPose(kaelen, 1.0, false), 'kaelen_root_note_chest_hold');
assert.strictEqual(LW.resolveCompanionPose(kaelen, 1.0, true), 'kaelen_camp_sharpen_2');

const ripple = LW.emitLyraMusicalAirRipple(5, 5, 'calling_song');
assert.strictEqual(ripple.maxRadius, 5.5);
LW.stepLyraAirRipples(0.2);

const miller = { id: 'm1', artisanRole: 'miller', x: 8, y: 8 };
assert.strictEqual(LW.resolveNpcGestureAndRoutine(miller, 12, 0.5, false).frame, 'miller_grind_2');
assert.strictEqual(LW.resolveNpcGestureAndRoutine(miller, 12, 0.5, true).headTurnTowardPlayer, true);

const cat = { id: 'c1', species: 'cat', x: 11.0, y: 10.0 };
assert.strictEqual(LW.stepAmbientWildlife(cat, 10.0, 10.0, true, 0.2).state, 'flee');

assert.strictEqual(LW.getOrBuildFireSheet('brazier').frameCount, 4);
LW.setGateState('cloister_portcullis', 1.0);
LW.stepGateAnimations(0.6); // 0.72 >= 0.65 threshold
assert.strictEqual(LW.getState().gates.get('cloister_portcullis').collisionPassable, true);

const collapse = LW.triggerStoryWallCollapse(window.G, { id: 'quarry_cave_in', x: 10.2, y: 10.0, safeRecoveryX: 7.5, safeRecoveryY: 10.0 });
assert.strictEqual(collapse.collapseEvent.playerRecoveredSafely, true);
assert.strictEqual(window.G.player.x, 7.5);

// --- Phase 5 assertions ---
const doll = II.composePaperDollLayers(window.G);
assert.strictEqual(doll.twoHandedShieldSuppressed, true, 'Two-handed Choir-Staff suppresses shield on paper doll');
assert.strictEqual(II.getNpcPortraitSheet('lyra', 'wry').portraitKey, 'portrait_lyra_wry');
assert.strictEqual(II.getCauseSpecificDeathScreen('unwritten_by_hush').title, 'Unwritten in the Hush');
assert.strictEqual(II.getEndingIllustration('ledger_restored').chaptersReflected, 4);
assert.strictEqual(II.getAutomapStamp('quest_giver').glyph, '!');

// --- Phase 6 assertions ---
const rumours = SR.resolveTavernRumours(window.G);
assert(rumours.length > 0);
const broadsheet = SR.generateSynodBroadsheet(window.G);
assert.strictEqual(broadsheet.spin, 'alarmist_condemnation');
const letters = SR.checkAndDeliverCourierLetters(window.G);
assert.strictEqual(letters.length, 1);
for (let p = 1; p <= 8; p++) SR.collectTobinJournalPage(window.G, p);
assert.strictEqual(SR.getTobinJournalProgress(window.G).completed, true);
const endings = SR.resolveCompanionEndings(window.G);
assert.strictEqual(endings.kaelenEnding, 'kaelen_tempered_guardian');
assert.strictEqual(endings.lyraEnding, 'lyra_keeper_of_the_new_choir');

// --- Phase 7 assertions ---
assert.strictEqual(SAT.getAreaCompositionProfile('whisper_grove').rootHz, 528);
assert.strictEqual(SAT.getBossThemeProfile('the_requiem').themeId, 'theme_shattered_mass');

window.G.map.grid[10][9] = 1; // wall between player (7.5,10) and source (12,10)
const posAudio = SAT.computePositionalAudioAndRipple(window.G, 12.0, 10.0, 'bell_alarm');
assert.strictEqual(posAudio.muffledByWall, true);
assert.strictEqual(posAudio.lowPassCutoffHz, 950);
assert(posAudio.directionalRipple && posAudio.directionalRipple.muffledByWall === true);

const accessFx = SAT.enforceAccessibilityAcrossEffects(window.G, { shakePx: 9, flashAlpha: 0.8, blurPx: 4, minFontSizePx: 14 });
assert.strictEqual(accessFx.shakePx, 0);
assert.strictEqual(accessFx.flashAlpha, 0);
assert.strictEqual(accessFx.blurPx, 0);
assert.strictEqual(accessFx.minFontSizePx, 20);

assert.strictEqual(SAT.validateModPackage({ schemaVersion: 1, kind: 'map', script: '<script>evil()</script>' }).valid, false);
const customMap = SAT.createDungeonEditorMap('crypt_test', 12, 12);
const exported = SAT.exportValidatedEditorMap(customMap);
assert.strictEqual(exported.ok, true);
const imported = SAT.importValidatedEditorMap(exported.json);
assert.strictEqual(imported.ok, true);

console.log('ALL PHASES 4, 5, 6 & 7 ASSERTIONS PASSED');
