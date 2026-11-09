# Credits

Audit for Echoes of the Shattered Octave, Book One (Phase 7, VOICES team). It lists what the repository itself can show. Where the repository records no author, source or licence, this file says **unverified** and does not guess. File-by-file detail is in `ASSETS.md`; the in-game panel (Options > Graphics & access > Full credits) shows the same content from `js/voices.js`.

## Typefaces

All four are bundled in `fonts/` (Latin subsets cut with the `@fontsource` packages, per `css/fonts.css`) and licensed under the SIL Open Font License 1.1. The full licence texts ship beside them.

| Typeface | Authors (from the OFL text) | Used for | Files |
|---|---|---|---|
| Cinzel | The Cinzel Project Authors, 2020 | capital-letter labels and buttons | `cinzel-latin-500-normal.woff2`, `cinzel-latin-700-normal.woff2`, `OFL-Cinzel.txt` |
| Alegreya | The Alegreya Project Authors, 2011 | body text | `alegreya-latin-400-italic.woff2`, `alegreya-latin-400-normal.woff2`, `alegreya-latin-500-italic.woff2`, `alegreya-latin-500-normal.woff2`, `alegreya-latin-700-italic.woff2`, `alegreya-latin-700-normal.woff2`, `OFL-Alegreya.txt` |
| Alegreya SC | The Alegreya Project Authors, 2011 | small capitals | `alegreya-sc-latin-500-normal.woff2`, `alegreya-sc-latin-700-normal.woff2`, `OFL-AlegreyaSC.txt` |
| UnifrakturMaguntia | j. 'mach' wust (2010) and Peter Wiegel (2009) | blackletter, titles and headings only | `UnifrakturMaguntia.woff2`, `OFL-UnifrakturMaguntia.txt` |

## Music

Ten cues in `music/`: `coda.mp3`, `combat.mp3`, `dungeon.mp3`, `ending.mp3`, `greening.mp3`, `grove.mp3`, `tavern.mp3`, `title.mp3`, `town.mp3`, `wild.mp3`. The README describes them as an original orchestral score and `js/audio.js` as General MIDI orchestra cues. Composer, rendering tool, soundfont and licence are **unverified**.

`music/opening.mp3` is the opening cinematic's score (Phase 24): an original piece written as a Python score in `tools/music/pieces/opening.py`, cut to the sequence's shots and spoken lines, and rendered by `tools/music/render_opening.py` the same way as the Extended score below (FluidSynth, the FluidR3 GM soundfont, pedalboard, pyloudnorm, ffmpeg; 112 kbps). It quotes the main theme's tune.

The **Extended score** (Options > Graphics & access > Score: Extended) adds 22 composed recordings in `music/extended/`: seven area pieces (Oakhaven, Whisper-Grove, Deep Woods, Quarry, Root-vault, Catacombs, Mausoleum of Chords), nine boss themes and six main-theme stages. Phase 8 (MUSIC team) wrote them as Python scores with the helper library in `tools/music/` (melody, harmony, orchestration and dynamics are the repository's own work), rendered them through **FluidSynth** with the **FluidR3 GM** soundfont (Frank Wen; **MIT** licence as packaged for Debian/Ubuntu as `fluid-soundfont-gm`), and finished them with `pedalboard` (reverb by a synthetic hall impulse response, gentle compression), `pyloudnorm` (about -17.5 LUFS, like the ten cues) and `ffmpeg` (MP3, stereo, 96 or 112 kbps). The compositions are original to this project; no sample, loop or melody was taken from elsewhere. The game's `js/score.js` falls back to its procedural stand-in pieces if a recording is missing.

## Sound effects and voices

Every sound effect is generated live with WebAudio in `js/audio.js`; no sample files ship. Vocal grunts and greetings are formant-synthesised in `js/voices.js` (a profile for every NPC and enemy family; the Quiet, the Tongueless and a voiceless Lyra are silent). Recorded voice lines in `voices/` (greetings, barks, boss and companion lines) were generated offline with the **Kokoro-82M** text-to-speech model and its voices by hexgrad (**Apache-2.0**), run through `kokoro-onnx` (MIT) and treated per character with `pedalboard` (GPL-3.0, a build tool only) and ffmpeg by `tools/voices/build.py`. The words are the game's own text; short barks written for this pass are marked PROPOSED in `voices/script.json`. The optional read-aloud setting uses the player's own browser voices; none are bundled. Licence of the game's own code: **unverified** (no LICENSE file in the repository).

## Art

- `img/`: 39 images (title, ending, four maps, six creation faces, dialogue portraits). How they were made is **unverified**.
- `js/assets.js`: embedded wall and floor textures, sprites and first-person weapon art. Origin **unverified**.
- Procedural stand-ins, drawn by the game's own code with no files: carved frames and brass corners, item icons and paper doll, mood portraits, logbook sketches, area cards, death and ending pictures, directional enemy views, flinches and poses, sky, weather, light, doors, gates, fire and smoke, small creatures. Each awaits painted art. The module list is in `ASSETS.md`.
- `img/painted20/`: Phase 20b's painted pieces (a barrel, an open barrel, a barrel on its side, a crate, two carts, two broken statues and a fallen stone head, bones, three grass tufts, two reeds, three wall notices, two Synod notices, a moss patch) were generated with Canva's AI image generator on the owner's account (October 2026) on a flat magenta ground and keyed, cut and scaled to the stand-ins' sizes by `tools/art/painted20/key.py`; the sources are in `tools/art/painted20/src/`. Per Canva's terms for AI-generated content. The painted ground, house fronts, stone courses and the re-coloured trees of `js/painted20.js` are the game's own code, painted at load from the embedded tiles' and sprites' own tones.
- `img/painted20/d_moss2`, `d_moss3`, `d_crack1`, `d_crack2`, `d_scorch1`, `d_scorch2`: wall marks rendered by **Blender** (the `bpy` Python module, a build tool only) from procedural noise and Voronoi materials in `tools/art/decals/marks.py`, the game's own work.
- `img/pixel3d/`: the pixel-3D set (Phase 25): the game's own painted sprites extruded into voxel models and rendered to five-view pixel sprites by **Blender** (the `bpy` Python module, GPL-2.0+, a build tool only; nothing of Blender ships) in `tools/art/pixel3d/voxelise.py`; the bestiary, the Proctor, the companions and every named person are turned at run time from their paintings instead (`js/bestiary20a.js`, `js/bestiary20b.js`, `js/people25.js`). No outside asset: every pixel comes from the paintings already credited above.
- `screenshots/`: captures of the game for the README.

## Tools

- Playwright and Chromium run the browser tests in `test/`. They are not bundled and are not needed to play. Playwright is Apache-2.0 upstream; Chromium carries its own licences.
- `@fontsource` packages supplied the font subsets (the typefaces remain OFL; the packaging licence is **unverified** here).
- Python's `http.server` serves the game locally for play and tests (not bundled).
- `tools/music/` (`lib.py`, `pieces/*.py`, `render_all.py`, `check.py`, `chroma.py`) composes and renders the Extended score offline with FluidSynth (LGPL-2.1+) and the FluidR3 GM soundfont (MIT), mido (MIT), numpy, soundfile, pyloudnorm (MIT), pedalboard (GPL-3.0, a build tool only) and ffmpeg. None ships with the game.
- `tools/voices/build.py` renders the voice lines offline with kokoro-onnx (MIT), onnxruntime (MIT), pedalboard (GPL-3.0) and ffmpeg. None ships with the game.
- The repository has no `package.json`, no build step and no npm dependency.

## Contributors

- Project owner: the GitHub account in the README's Pages link, `dribblejerp-klunkdunker`. Design, story and direction are the project's own; the repository cannot verify more than that.
- Code, from git history at the time of the audit: 93 commits authored as "Claude", 1 as "Codebuff". Commit trailers name Claude Opus 5.5 (74), Claude Sonnet 5.5 (6) and Codebuff (1) as co-authors. The game was built with AI assistance.

## Keeping this current

Add a row here and in `ASSETS.md` for anything new. If a source or licence is not known, write "unverified".
