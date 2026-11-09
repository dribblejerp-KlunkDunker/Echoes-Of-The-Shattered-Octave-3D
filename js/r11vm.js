// r11vm — ROADMAP R11 phase 2, team HANDS: the first-person hands and weapons of the realistic look.
// Contract: window.R11VM = { viewmodel(kind, opts) -> { group, update(t, walk, F) }, kindFor(weaponId), kinds() }.
// r11core's vmFrame prefers R11VM over R11KIT's phase-1 viewmodels when R11VM.viewmodel exists; until then the stub
// below leaves R11VM undefined, so phase 1's hands draw as before.
'use strict';
