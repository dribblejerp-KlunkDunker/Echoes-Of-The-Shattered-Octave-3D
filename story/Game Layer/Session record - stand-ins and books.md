# Echoes of the Shattered Octave: session record

Written 26 October 2026. Repository: `dribblejerp-KlunkDunker/echoes-of-the-shattered-octave`, branch `claude/echoes-shattered-octave-b451tw`.

## Where things stand

- `main` is at commit `ab53321`, the merge of PR #59. Nothing is unpushed.
- Everything from this session is merged:

| PR | What it shipped |
|---|---|
| #55 | Phase 20b, the painted world, and Phase 25, the pixel-3D set from the paintings |
| #56 | Painted side views for the main species |
| #57 | Rigs for Hetty, Rooke, Sable, Hob and Nell |
| #58 | Rigs for the rest of the named cast |
| #59 | Roadmap tidy, two painted barrels, six Blender wall marks, contact shadows on painted props |

## Stand-ins still drawn rather than painted

- **Props:** the second broken statue (72×64) and the stone head (36×32).
- **Grass:** the third tuft and the second reed.
- **Wall marks:** posters two and three, and the second Synod notice.

A Canva batch for these is scheduled for 27 October 2026 at 01:04 UTC. If Canva's quota is still spent, it re-arms itself quietly. The work goes to a new PR, because #59 is merged.

## How the art is made, and its limits

- **Canva** gives 200-pixel thumbnails and about three images per quota window. The full-size downloads and Hugging Face are blocked by this environment's network policy. You can allow them under the environment's Network access setting (https://code.claude.com/docs/en/cloud-environments#network-access).
- **Painted props** are keyed by `tools/art/painted20/key.py`. It removes the magenta ground, posterises the piece, adds a rim, and copies the stand-in's dithered contact shadow so the prop stands on the ground.
- **Wall marks** are rendered by Blender from procedural materials in `tools/art/decals/marks.py`, then dithered down to 64 pixels. They can be re-rendered at any size.
- **Pixel-3D depth** comes from `tools/art/pixel3d/voxelise.py`. It leaves contact-shadow pixels flat.

## Going above 64-pixel textures

- **128 is the step that matters.** The game draws at 320×150 on Medium and 640×300 on High and above. At 64 pixels, walls look blocky only up close on High. 256 would rarely show.
- **The engine change is cheap.** It is about one PR. The size is hard-coded in about a dozen places in both renderers, and about 20 modules make or swap textures. Texture memory would go from about 1.3 MB to 5 MB.
- **The art is the real cost.** Procedural textures regenerate cheaply. The 19 hand-painted base wall and floor textures need repainting, which is about seven Canva quota windows plus making each one tile.
- **Suggestion:** do it after the remaining stand-ins are painted, and only if you play on High or above.

## The in-game books

Another agent added the Moor serial in `js/books.js` (commit `9167988`). It has two pamphlets, a bookseller in the Boar & Dulcimer, a donated pile by the east table, and a lending shelf in Lyra's house. The consistency review is a separate file: *Review - The Moor serial.md*.
