# Game — Phase 20b "The painted world, finished": New In-Game Text (for review)

*Written for review, Oct 2026. The code is `js/painted20.js`; the painted pieces are `img/painted20/`.*

Phase 20b is art: it finishes the two lines Phase 20 left open on the roadmap (the stand-ins' painted art, and the horizon). It adds no story prose and no fact. Everything a player can read is the four Options rows below.

## What is new, in short

1. **Painted ground.** Every grass and moss map's ground changes from cell to cell: the meadow tile, a dense clover tile, a dry straw tile, a tile of bare trodden earth (beside roads, doors and walls), and two mosses (cushion moss; lichen and leaf-litter). All are painted at load from the original tile's own tones, so the colour the panoramas and the far country use is kept; only the detail is new.
2. **Painted walls.** Three more house fronts (close studding; brick nogging between the timbers; a braced frame with cracked plaster) and two more stone courses (dressed ashlar; rubble with moss in the joints). Each building, and each run of outdoor stone wall, wears one face for its whole length.
3. **Tree variety.** The painted oak in three colours (its own rust, a green-gold not yet turned, a dark copper) and the willow in two (its own lilac, a darker blue), about half of them turned about. The same trees in the same places.
4. **Painted pieces.** Paintings in place of the canvas-drawn stand-ins: the barrel, the crate, the hand-cart and the broken cart, the broken statue, the bones, two grass tufts, a reed, a wall notice, a Synod notice and a moss patch. (The open and side barrels, the second statue, the stone head, the third tuft, the second reed, the other mosses, the cracks, the scorch and the other posters are still the drawn stand-ins; they can follow the same way when the chance is opportune.)
5. **The horizon.** The far ground beyond a map's edge (Phase 20's "Country beyond walls") now runs on every outdoor height-mapped map, so Wethercombe and the Downs no longer end in a flat band where the map does: fields and hedgerows run on to the ridges. Oakhaven seen past the Hedge stays as it was, from the clearing and the Downs.

Nothing in the world changes: no entity, flag, position, door or route. Floor cells, wall textures and sprite names are rebuilt from code, so saves made with it load without it and the other way round. Every switch off (and the Original preset) gives the frames of a build without the module, byte for byte (test/painted20.test.js).

## [PROPOSED] canon details, with a recommendation

- **Brick nogging in Oakhaven.** One house front in three fills the timber frame with brick. The bibles describe Oakhaven's houses as timber and plaster under thatch and slate and say nothing of brick. *Recommend: keep, or turn it off by making `HOUSE` two entries in js/painted20.js if brick is wrong for the Reach.*
- **Clover and straw.** Damp hollows carry clover, open flats dry straw. No book speaks of either. *Recommend: keep; it is grass.*
- **Trodden earth** beside roads, doors and walls. *Recommend: keep.*

## New text a player reads

Options, Graphics & access (four rows; each an On/Off button with a small hint after the name). French is in tools/i18n/p20b-painted.tsv, merged into locales/story/fr.json.

| Row | Hint |
|---|---|
| Painted ground | grass and moss that change from cell to cell: clover, dry straw, trodden earth |
| Painted walls | house fronts and stone courses that differ from one building to the next |
| Tree variety | oaks in three colours and willows in two, some turned about |
| Painted pieces | painted barrels, carts, grass and notices in place of the drawn stand-ins |

FR: Sol peint / herbe et mousse qui changent d’une case à l’autre : trèfle, paille sèche, terre foulée · Murs peints / façades et assises de pierre qui diffèrent d’un bâtiment à l’autre · Arbres variés / chênes en trois couleurs et saules en deux, certains retournés · Pièces peintes / tonneaux, charrettes, herbes et avis peints à la place des substituts dessinés.

## Questions for sleeves

1. Brick nogging: right for Oakhaven, or timber-and-plaster only?
2. The painted pieces come from Canva's image generator (the same source as five of the area cards). Go on with it for the rest of the stand-ins (the open and side barrels, the second statue, the stone head, the cracks and scorch), or keep those drawn?
3. The Chapel bell stays undrawn, as the story keeps the frame empty. Phase 20's roadmap line asked for "a visible Chapel bell"; it is closed as *not until the story rings one*.

## Going on with the stand-ins (October 2026)

Sleeves answered question 2: start painting the rest. Canva's image generator is the one painting source this cloud session can reach (the local model in tools/art/paint.py cannot be downloaded here, and Canva's full-size downloads are blocked, so it hands back 200-pixel pictures: enough for props and wall marks, not for full-screen cards). Its quota allows about three pictures at a time, so the remaining pieces come in small batches.

- **Painted so far:** the open barrel and the barrel on its side (tools/art/painted20/src/barrel_open.png, barrel_side.png), given depth like the other painted props (js/pixel3d.js).
- **Contact shadows:** every painted prop now keeps its drawn stand-in's dithered contact shadow (tools/art/painted20/key.py SHADOW). Without it the lighting module's soft shadow fell a little in front of the base and the Phase 20b props seemed to hover. No new text.
- **Wall marks by Blender:** the two other mosses, both cracks and both scorch marks are rendered by Blender (the `bpy` module) from procedural materials (tools/art/decals/marks.py) at 256 pixels and brought down to the game's 64 with the same finish as the painted pieces; soft edges become an ordered dither like the drawn stand-ins'. Sleeves chose Blender for these; texture-like marks are what procedural materials do well.
- **Still to paint (Canva):** the second statue, the stone head, the third grass tuft, the second reed, two posters and the second Synod notice.
