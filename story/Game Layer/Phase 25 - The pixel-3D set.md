# Game — Phase 25: the pixel-3D set (for review)

*Written for review, Oct 2026. The code is `js/pixel3d.js`; the tool is `tools/art/pixel3d/voxelise.py`; the atlases `img/pixel3d/`.*

The owner asked for everything that makes sense in 3D to be **pixelated 3D**, and, after seeing a first pass of low-poly models built from primitives, said the point plainly: *keep the same pixelated graphics as before, just make it 3D.* So the model is the painting.

## How it works

Every painted sprite (the bestiary, the people, the scenery props) is extruded into a voxel model: each solid run of pixels on a row is treated as an elliptical section whose depth is a share of its width (fuller for round things, flatter for signs and grates), so each pixel becomes a column of voxels. The front faces carry the painting pixel for pixel; the back faces carry its mirror a shade darker; the sides carry the outline's own colours. Blender (the `bpy` module, headless on the CPU) renders the model at the painting's own density (its rows per world unit) from its four sides, front, left, back and right (the owner's call after the first full bake: the 45-degree views of an extrusion look square, so they are gone and a creature snaps to the nearest side), in every pose it animates (idle, two walk steps, wind-up, strike), under one sun whose shading is held to gentle bands so the painting's colours stay its own. Seen head-on, the cell is the painting; from behind, its mirror; from the side, the same painting with real depth.

The Cacophony Hound is painted side-on and has no face to show head-on or from behind, so only its two sides come from the extrusion (the painting and its mirror, lit); the head-on and back views stay with the hand-built art of Phase 20, asked for the same side exactly. Its lunge is painted head-on and has all four sides.

One atlas per model, the cell table in `js/pixel3d.js`; the runtime swaps the cell in for an entity's bearing and pose (or a prop's sprite under its name) when the switch is on. Nothing in saves, flags or the RNG changes; off, the flat sprites draw byte for byte as before.

## Painted side views for the main species

After the four-side bake the owner asked for painted side views for the main species. The bestiary already had them: Phase 20's teams cut each enemy's own painting, turned it on a rig and re-lit it (`js/bestiary20a.js`, `js/bestiary20b.js`), and from the side those beat any extrusion, so the pixel-3D set now shows them, snapped to the four sides, and bakes nothing for the bestiary. The Catalogue Proctor (which had only its pilot stand-ins), Kaelen, Lyra, the townsman and the townswoman are rigged the same way in `js/people25.js` with the humanoid kit: the body and head as stacks of sections whose width is the painted silhouette and whose depth is authored per band; the staff, arms, jug, hands and boots cut out of the painting and re-hung in 3D; the back painted from the figure's own cloth (a hood's back, a cap, a shirt, the dress behind the apron). The Proctor's attack is the painted one: the staff raised overhead in both hands, then brought down. The second batch, the innkeepers and quest-givers the player talks to most (Hetty with her tankard, Rooke with his scraping blade, Sable with her ledger, Hob, Nell with her folded arms), is rigged the same way. The rest of the named cast follows in batches (Flambeau with his censer, Vane, Pim, Vosk with his ledger, Harrow with lantern and staff; Tobiah, Aldric, Bettany with her herbs, Tam on his cane; Quist, Halder with his tray, the Sexton on his shovel, the Herald with his proclamation; Mags with her rope and sling, the Mourner with her lilies, Wren, Burlsick with his twigs): 27 rigs in all. Orla, enthroned among her roots, and the Cutter, a wreck, are not people shapes and stay extruded with the props.

## What is baked

| Set | Count | Notes |
|---|---|---|
| the bestiary | 0 | its Phase 20 hand-built views, snapped to four sides |
| rigged people | 27 (no atlas) | the Proctor, Kaelen, Lyra, the townsman, the townswoman, Hetty, Rooke, Sable, Hob, Nell, Flambeau, Vane, Pim, Vosk, Harrow, Tobiah, Aldric, Bettany, Tam, Quist, Halder, Sexton, Herald, Mags, the Mourner, Wren, Burlsick: built at run time |
| the people | 3 | Orla, the Cutter and the Hollow |
| props | 33 | chests, beds, looms, presses, tombs, lamps, bells, signs, ladders, the barrel and crate of Phase 20b; one view each |

Kept painted on purpose: the trees (Phase 20b's painted variants), the swarms, the moth, A Quiet (an absence with smoke), the cat, the fire, decals, ground and skies, and the first-person hands and weapons, which never turn.

## No new text

One Options row: **Pixel-3D models** — *creatures, people and props as the paintings given depth: pixel models that turn, lit the same from every side*. FR: Modèles pixel-3D / créatures, gens et objets : les peintures avec de la profondeur, des modèles en pixels qui tournent, éclairés pareil de tous côtés.

## Questions for sleeves

1. The depth: people and bipeds are extruded to 0.6 of their width, round props fully. Thicker or thinner?
2. The back of a figure is the mirrored front, darkened; a hood or a cloak reads well, a face less so. Worth painting true backs for the named people later?
3. The whole named cast is rigged. The Hollow (a hooded nobody) could take a rig too; Orla and the Cutter are not people shapes and stay as they are.
