// Assembles octave_complete_expansion_bundle.js from phase1..phase7 modules
// plus the unified expansion smoke & verification suite.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const phaseFiles = [
  'phase1_stealth_law_gameplay.js',
  'phase2_spatial_world.js',
  'phase3_combat_life.js',
  'phase4_living_world.js',
  'phase5_illustrated_interface.js',
  'phase6_story_reactivity.js',
  'phase7_sound_access_tools.js'
];

const unifiedRunner = `
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
`;

const parts = phaseFiles.map((f) => fs.readFileSync(path.join(root, f), 'utf8'));
parts.push(unifiedRunner.trim());

fs.writeFileSync(path.join(root, 'octave_complete_expansion_bundle.js'), parts.join('\n\n') + '\n');
console.log('Wrote octave_complete_expansion_bundle.js');
