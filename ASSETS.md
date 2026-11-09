# Assets and licences

Every audio, font and image asset in the repository, with where it came from, its licence and its status. Written for the Phase 7 credits audit (VOICES team). The in-game "Full credits" panel (Options > Graphics & access) is built from the same audit (`js/voices.js`); the narrative version is `CREDITS.md`.

**Rule of this file:** nothing here claims authorship or a licence the repository cannot show. *Unverified* means the repository records no author, source or licence for it, so the answer must come from the project owner before any public release.

| Status | Meaning |
|---|---|
| verified | A licence text ships in the repository and names the authors |
| own code | Generated at run time by the game's own JavaScript; no external asset involved |
| procedural stand-in | Drawn or synthesised by the game's code as a placeholder for final art or recordings |
| unverified | The repository does not record the source, author or licence |

## Fonts (fonts/, css/fonts.css)

Latin subsets cut with the `@fontsource` packages (stated in the css/fonts.css header). Licence for all four families: SIL Open Font License 1.1, texts in `fonts/OFL-*.txt`.

| File | Family | Size | Copyright holder (from the OFL text) | Licence | Status |
|---|---|---|---|---|---|
| `OFL-Alegreya.txt` | Alegreya | 4 KB | The Alegreya Project Authors (2011) | OFL 1.1 text | verified |
| `OFL-AlegreyaSC.txt` | Alegreya SC | 5 KB | The Alegreya Project Authors (2011) | OFL 1.1 text | verified |
| `OFL-Cinzel.txt` | Cinzel | 4 KB | The Cinzel Project Authors (2020) | OFL 1.1 text | verified |
| `OFL-UnifrakturMaguntia.txt` | UnifrakturMaguntia | 4 KB | j. 'mach' wust (2010), Peter Wiegel (2009) | OFL 1.1 text | verified |
| `UnifrakturMaguntia.woff2` | UnifrakturMaguntia | 26 KB | j. 'mach' wust (2010), Peter Wiegel (2009) | OFL 1.1 | verified |
| `alegreya-latin-400-italic.woff2` | Alegreya | 23 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-latin-400-normal.woff2` | Alegreya | 22 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-latin-500-italic.woff2` | Alegreya | 24 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-latin-500-normal.woff2` | Alegreya | 24 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-latin-700-italic.woff2` | Alegreya | 24 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-latin-700-normal.woff2` | Alegreya | 24 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-sc-latin-500-normal.woff2` | Alegreya SC | 30 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `alegreya-sc-latin-700-normal.woff2` | Alegreya SC | 30 KB | The Alegreya Project Authors (2011) | OFL 1.1 | verified |
| `cinzel-latin-500-normal.woff2` | Cinzel | 15 KB | The Cinzel Project Authors (2020) | OFL 1.1 | verified |
| `cinzel-latin-700-normal.woff2` | Cinzel | 15 KB | The Cinzel Project Authors (2020) | OFL 1.1 | verified |

UnifrakturMaguntia is used for titles and panel headings only (readable Cinzel fallback). Its OFL names a Reserved Font Name; whether the packaged subset counts as a modified version is unverified.

## Music (music/)

Ten MP3 cues streamed by `Audio_.music` (js/audio.js). The README calls the score "an original orchestral score" and js/audio.js comments describe General MIDI orchestra cues. The repository records no composer, no rendering tool and no soundfont.

| File | Used for | Size | Source | Licence | Status |
|---|---|---|---|---|---|
| `coda.mp3` | Part Four, Deep Woods and Mausoleum | 2490 KB | not recorded (README: original score) | unverified | unverified |
| `combat.mp3` | combat loop | 824 KB | not recorded (README: original score) | unverified | unverified |
| `dungeon.mp3` | dungeons and crypts | 2453 KB | not recorded (README: original score) | unverified | unverified |
| `ending.mp3` | ending screens | 2534 KB | not recorded (README: original score) | unverified | unverified |
| `greening.mp3` | the Greening loop | 753 KB | not recorded (README: original score) | unverified | unverified |
| `grove.mp3` | Whisper-Grove | 2773 KB | not recorded (README: original score) | unverified | unverified |
| `tavern.mp3` | taverns | 1709 KB | not recorded (README: original score) | unverified | unverified |
| `title.mp3` | title screen | 2419 KB | not recorded (README: original score) | unverified | unverified |
| `town.mp3` | Oakhaven streets | 1928 KB | not recorded (README: original score) | unverified | unverified |
| `wild.mp3` | wilderness and the Reach | 2766 KB | not recorded (README: original score) | unverified | unverified |
| `opening.mp3` | the opening cinematic (Phase 24) | 1423 KB | composed in `tools/music/pieces/opening.py`, rendered with FluidSynth + FluidR3 GM (see CREDITS.md) | original; soundfont MIT | verified |

If a General MIDI soundfont was used to render these, its licence also applies to the audio. Check this before any release.

### Extended score (music/extended/)

Phase 8. Twenty-two recorded pieces used only when Options > Score is Extended (js/score.js falls back to its procedural pieces if a file is missing). Each is written as Python in `tools/music/pieces/`, rendered with `python3 tools/music/render_all.py`, checked with `check.py` (duration, loudness, peak, silence, spectrogram) and `chroma.py` (key). The folder is about 28.8 MB. All pieces are normalised to about -17.5 LUFS with peaks under -2.5 dBFS; boss themes loop (the reverb tail is folded onto the start); area pieces end by fading to silence.

| File | Used for | Size | Source | Licence | Status |
|---|---|---|---|---|---|
| `extended/oakhaven.mp3` | Oakhaven (Growth, F lydian, 76 bpm) | 1802 KB | composed in `tools/music/pieces/oakhaven.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/whispergrove.mp3` | Whisper-Grove (Memory, F# minor, 50 bpm) | 1812 KB | composed in `tools/music/pieces/whispergrove.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/deepwoods.mp3` | Deep Woods (F phrygian, 46 bpm) | 1924 KB | composed in `tools/music/pieces/deepwoods.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/quarry.mp3` | Quarry (C phrygian, 60 bpm) | 1719 KB | composed in `tools/music/pieces/quarry.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/rootvault.mp3` | Root-vault and Under-hedge (F pentatonic, 40 bpm) | 1640 KB | composed in `tools/music/pieces/rootvault.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/catacombs.mp3` | Catacombs (E dorian, 44 bpm) | 1560 KB | composed in `tools/music/pieces/catacombs.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/mausoleum.mp3` | Mausoleum and Belfry (G minor, 42 bpm) | 1650 KB | composed in `tools/music/pieces/mausoleum.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_requiem.mp3` | the Requiem (Bb minor, in six) (looped) | 1085 KB | composed in `tools/music/pieces/boss_requiem.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_broodmother.mp3` | the Brood-Mother (A phrygian) (looped) | 1045 KB | composed in `tools/music/pieces/boss_broodmother.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_weaver.mp3` | the Phantom Weaver (F# pentatonic) (looped) | 1069 KB | composed in `tools/music/pieces/boss_weaver.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_aegis.mp3` | the Aegis Sentinel (G minor) (looped) | 1055 KB | composed in `tools/music/pieces/boss_aegis.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_pressman.mp3` | Pressman Mallow (A phrygian) (looped) | 1044 KB | composed in `tools/music/pieces/boss_pressman.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_deacon.mp3` | the Deacon of the Unrung Bell (A minor) (looped) | 1023 KB | composed in `tools/music/pieces/boss_deacon.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_wearer.mp3` | the Wearer (F) (looped) | 954 KB | composed in `tools/music/pieces/boss_wearer.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_golem.mp3` | the Steam Golem (A phrygian) (looped) | 1055 KB | composed in `tools/music/pieces/boss_golem.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/boss_captain.mp3` | Outrider-Captain Brennick (A mixolydian) (looped) | 1049 KB | composed in `tools/music/pieces/boss_captain.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_0.mp3` | main theme, stage 0 (alone); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_1.mp3` | main theme, stage 1 (harmonised); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_2.mp3` | main theme, stage 2 (shadowed); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_3.mp3` | main theme, stage 3 (broken); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_4.mp3` | main theme, stage 4 (re-forming); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |
| `extended/maintheme_5.mp3` | main theme, stage 5 (restored); replaces the title and ending cue in turns | 1108 KB | composed in `tools/music/pieces/maintheme.py`, FluidSynth + FluidR3 GM | MIT soundfont; composition original | verified |

The soundfont is FluidR3 GM (Frank Wen), MIT licence per its Debian packaging (`fluid-soundfont-gm`); the licence text ships with that package, not with the game.

## Generated sounds (js/audio.js)

No sample files. All run-time WebAudio: `Audio_.sfx.*` (footsteps by surface, hit, swing, bow, shot, hound, bell, golem, hurt, door, pickup, ui, song, fifth, murmur, press, quiet, crack, voice, thunder, rain, bird, rat), the drone and wind beds, the hush-lamp whistle and the `Audio_.hum` Root-note hum.

| Item | Module | Status |
|---|---|---|
| Sound effects, drone, wind, hum | js/audio.js | own code |
| Grunts and greetings | js/voices.js | own code, procedural stand-in |

Licence of the game's own code: **unverified** (the repository contains no LICENSE file).

## Voices (js/voices.js)

Formant-synthesised vocal sounds: a sawtooth buzz through three band-pass formants plus breath noise. No recordings and no text-to-speech voices are bundled. The optional "Grunts + spoken" setting uses the browser's own `speechSynthesis` (through the game's `speakLine` in js/upgrades.js); those voices belong to the player's device and are never shipped.

| Voice set | Profiles | Style | Status |
|---|---|---|---|
| NPCs (every key of `NPCS`, plus the generic Hollow) | 31 people; the _wg and _dw versions share a person | human, gravel (Kaelen, Hob), brass (Herald), breathy (Hollows, Mourner), chord (Aegis), cat | procedural stand-in |
| Enemies (every key of `ENEMIES`) | 26 families | brass (Legion, Office), beast (hound, Brood-Mother, weaverling), swarm (mites), golem, multi (Wearer, Weaver, Requiem, Dirge), breathy (Drowned, Deacon), chord (Aegis) | procedural stand-in |
| Silent | the Quiet, Hush-moths, the Tongueless, the Hushwarden (marked mute), and Lyra when her slate flags say she has no voice | none | by design |

## Recorded voice lines (voices/, js/voice-lines.js, js/voice-acting.js)

Neural text-to-speech, rendered offline by `tools/voices/build.py` from `voices/script.json`; casting in `tools/voices/cast.py`.

| Item | Source | Licence | Status |
|---|---|---|---|
| `voices/<speaker>/*.mp3` (mono, 24 kHz, 40 kbps) | Kokoro-82M (hexgrad) voices through kokoro-onnx, then per-character treatment (age waver, gravel, Hollow breath, Kaelen's 528 Hz glass ring, bell, many-voiced chorus, rooms) | Kokoro-82M and its voices: Apache-2.0 | generated; recorded actors could replace any file with the same name |
| `voices/script.json` | the words: game text (greetings, mimicry, companions, the Aegis), plus short barks for speaking enemies marked PROPOSED | game text | for the author's review |
| `js/voice-lines.js` | generated manifest | game source | generated |

Not voiced: the player's own lines, lines that need the player's name, sung passages with no words in the game, the Deacon's hand-cant, and every silent character.

## Paintings (img/painted/)

Generated paintings shown in place of the procedural stand-ins when present (js/painted.js; Options → Painted art). The list of files is img/painted/README.md, generated by tools/art/manifest.py.

| Files | Source | Licence | Status |
|---|---|---|---|
| area/hedge, street, hall, hearth, mill | Canva AI image generation (text-to-image), owner's Canva account, Oct 2026; resized to 1280x720 | Per Canva's terms for AI-generated content on the owner's account | generated |

## Painted pieces (img/painted20/)

Phase 20b (js/painted20.js, Options → Painted pieces): paintings swapped in under the stand-ins' own sprite and texture names. Sources in tools/art/painted20/src/ (200x200, Canva AI image generation on a flat magenta ground, owner's Canva account, Oct 2026), keyed, cut and scaled to the stand-in's size by tools/art/painted20/key.py.

| Files | Replaces | Source | Licence | Status |
|---|---|---|---|---|
| p_barrel, p_barrel_open, p_barrel_side, p_crate, p_cart, p_cart_broken, p_statue_broken, p_statue_broken2, p_statue_head, p_bones_small | scenery props (js/scenery.js); each keeps its stand-in's dithered contact shadow | Canva AI image generation, keyed by tools/art/painted20/key.py | Per Canva's terms for AI-generated content on the owner's account | generated |
| p_grass1, p_grass2, p_grass3, p_reed1, p_reed2 | grass tufts and reeds (js/flora.js); p_grass3 is toned down at keying to sit with the others | the same | the same | generated |
| d_poster1, d_poster2, d_poster3, d_synod1, d_synod2, d_moss1 | three wall notices, two Synod notices, a moss patch (js/decals.js) | the same | the same | generated |
| d_moss2, d_moss3, d_crack1, d_crack2, d_scorch1, d_scorch2 | the other mosses, the cracks and the scorch marks (js/decals.js) | rendered by Blender (bpy) from procedural materials, tools/art/decals/marks.py | game source | done |

## Pixel-3D set (img/pixel3d/)

Phase 25 (js/pixel3d.js, Options → Pixel-3D models): one atlas per extruded model, four sides in five poses for a creature, one view for a prop. The models are the painted sprites themselves, extruded into voxels and rendered by Blender's bpy module at the painting's own density (tools/art/pixel3d/voxelise.py); the game's own work, no outside asset. The bestiary and the rigged people (js/people25.js) ship no atlas: their views are built at run time from their paintings, as in Phase 20.

| Files | Replaces | Source | Licence | Status |
|---|---|---|---|---|
| hollow | the painted sprite's every view and pose while the switch is on | the painting, extruded and rendered | game source | done |
| orla, cutter | the enthroned Orla and the wrecked Cutter, not people shapes | the same | game source | done |
| (no file) proctor, kaelen, lyra, townsman, townswoman, hetty, rooke, sable, hob, nell, flambeau, vane, pim, vosk, harrow, tobiah, aldric, bettany, tam, quist, halder, sexton, herald, mags, mourner, wren, burlsick | rigged at run time from their paintings by js/people25.js, like the bestiary | the paintings, cut and turned in code | game source | done |
| the props (crates, chest, table, bed, loom, press, tomb, grave, hearth, chair, bore, gear, lever, coil, cloaks, cocoon, lifttank, kestrel, bones, loot, lamp, pump, bigbell, cores, basin, sign, hymnboard, grate, web, ladder, shelf, p_barrel, p_crate) | the scenery props | the same | game source | done |

## Images (img/)

None of these has a recorded author, tool or licence in the repository. How they were produced is **unverified**.

| Group | Files | Status |
|---|---|---|
| Screens and paintings | `ending.jpg`, `title.jpg` | unverified |
| Maps | `map.jpg`, `map_continent.jpg`, `map_reach.jpg`, `map_woods.jpg` | unverified |
| Creation faces | `face_1.jpg`, `face_2.jpg`, `face_3.jpg`, `face_4.jpg`, `face_5.jpg`, `face_6.jpg` | unverified |
| Dialogue portraits | `p_aegis.jpg`, `p_aldric.jpg`, `p_bettany.jpg`, `p_flambeau.jpg`, `p_halder.jpg`, `p_harrow.jpg`, `p_herald.jpg`, `p_hetty.jpg`, `p_hob.jpg`, `p_kaelen.jpg`, `p_lyra.jpg`, `p_mags.jpg`, `p_nell.jpg`, `p_orla.jpg`, `p_pim.jpg`, `p_proctor.jpg`, `p_quist.jpg`, `p_rooke.jpg`, `p_sable.jpg`, `p_tam.jpg`, `p_tobiah.jpg`, `p_tongueless.jpg`, `p_townsman.jpg`, `p_townswoman.jpg`, `p_vane.jpg`, `p_vosk.jpg`, `p_wren.jpg` | unverified |

Total 39 files, 1478 KB.

## Embedded art (js/assets.js)

One 2.4 MB JavaScript file of base64 PNGs: `tex` (19 wall and floor textures), `spr` (193 sprites for creatures, people and props), `fp` (11 first-person weapons) and `meta` (110 entries for directional views and similar). Author, tool and licence **not recorded: unverified**. Side and back views, flinches, death poses and similar variants are derived from these sprites at run time.

## Procedural stand-ins by module

All drawn or generated by the game's own code at run time; they ship no files. Each is a placeholder for painted art.

| Module | What it makes |
|---|---|
| js/directions.js, enemy-fx.js, creature-life.js, telegraphs.js | enemy side and back views, flinches, startles, strides, casting tells |
| js/fp-hands.js, fp-feel.js | first-person hands, head bob, landing dip, hit shake |
| js/sky.js, weather.js, post.js, lighting.js, water.js | sky, stars, panoramas, weather, fog, bloom, light, reflections |
| js/ceilings.js, decals.js, scenery.js, flora.js, windbells.js, firesmoke.js, gates.js, doors.js, smalllife.js | ceilings (hand-built tiles since Phase 20), wall decals, props, grass, banners, fire and smoke, gates, doors, crows, rats, the cat. Since Phase 20b the barrel, crate, both carts, broken statue, bones, two grass tufts, one reed, one notice, one Synod notice and one moss patch are paintings (img/painted20/); the open and side barrels, the second statue, the stone head, the third tuft, the second reed, the other mosses, cracks, scorch and the other posters are still drawn |
| js/painted20.js | hand-built ground tiles (four grasses, two mosses), house fronts and stone courses, re-coloured oaks and willows: painted at load from the embedded tiles' and sprites' own tones; no files |
| js/companions.js, townsfolk.js | companion and townsfolk motion on existing sprites |
| js/frames.js, icons.js, portraits.js, logmap.js, screens.js | carved frames and brass corners, item icons and paper doll, mood portraits, logbook sketches and automap stamps, loading, death and ending pictures |
| js/reading.js, rumours.js, couriers.js, dreams.js, tobin.js, epilogue.js | held books, Gazette pages, letters, dream and memory-echo pictures |
| js/voices.js | vocal grunts and greetings (audio) |

## Screenshots (screenshots/)

85 README images (JPG, PNG, GIF) captured from the game itself. The game does not load them. Status: own capture.

## Maintaining this file

When an asset is added, add a row with its source, author and licence. If any of these is unknown, write *unverified* rather than guessing. `test/voices.test.js` fails if a font, a music file or an image in the folders above is missing from this file.
