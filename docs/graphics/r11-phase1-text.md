# Game - R11 Phase 1 New In-Game Text (for review)

The realistic 3D look, phase 1 (8–9 Nov 2026, repo Echoes-Of-The-Shattered-Octave-3D, branch `claude/r11-phase1`). Four teams: CORE (the renderer), KIT (Oakhaven's buildings, props, far ring, first-person hands), HUD (the bronze bar), BENCH (graphics quality and the benchmark). Everything below is new player-facing text or lore-bearing art. Anything invented was marked [PROPOSED] for the author's ruling and is now **[APPROVED]**; everything else is checked against the books, the World Bibles or the game's own text.

**Owner's ruling (9 Nov 2026): every [PROPOSED] item in this document is approved** ("yes to all proposed ideas"). They are now canon for the game; the marks below read [APPROVED].

Commander's lore fixes during integration:
- The mooring mast is Book One's "a hundred and twenty feet of riveted iron on four splayed legs in the bedrock of the quarry rim" (a riveted lattice tower, 36.5 m), not a gallows-like post.
- The market awnings are "the colour of old wine and old moss", as the game's own Massday market line says (they had been cream and sage).
- No castle anywhere (the proof scene's far castle was replaced by the mast).


---

# R11 CORE — new player-facing text

All in Options → Graphics & access, the "Art style" row (js/r11core.js). French pairs in `tools/i18n/r11-core.tsv`, merged.

| English | French |
|---|---|
| Art style | Style graphique |
| Realistic | Réaliste |
| Pixel | Pixel |
| Realistic: the new 3D look; Pixel: the pixel-art look | Réaliste : le nouveau rendu 3D ; Pixel : le rendu en pixel art |
| needs hardware WebGL 2: this device shows the pixel look | il faut WebGL 2 accéléré : cet appareil garde le rendu pixel |
| the Original preset always shows the pixel look | le préréglage Original garde toujours le rendu pixel |

No lore text. No [PROPOSED] items: CORE invents nothing a player could read as lore. Material choices only map the
game's own textures (the Hedge's texture is drawn as dark thorn with pale flecks of packed wool, per canon).

---

# R11 KIT — new player-facing text and lore-bearing art (for the owner's ruling)

## Text
| English | French | Where |
|---|---|---|
| THE BOAR & DULCIMER | LE SANGLIER & TYMPANON | painted on the inn's board (canon name; French from p11-tavern.tsv's "Sanglier & Tympanon") |

No other words are drawn. Notices on the well-house, the Greenhall front and the Chapel front are drawn as illegible ink lines and wax seals, so they invent no text.

## Art grounded in the map, the game's text or the books
- **The Boar & Dulcimer** (map: building 26-33 x 12-16, door 29,16): a three-storey timbered inn front, its board by the door, lanterns either side, casks of small beer by the wall (story: "The Boar & Dulcimer's cellar keeps its casks of small beer").
- **The Chapel of the Carillon / of the Pure Note** (map: 46-51 x 4-9, door 48,9; tower block 48-49 x 5-6 at 3.2): grey stone, a porch with steps (books: "the Chapel porch", "the Chapel steps"), the notice board at the Chapel front and the warrant on its door (Synod Gazette boards: "Greenhall front, Chapel front, inside the Boar"; "the Warrant of Purification on the Chapel door"), the bell-tower where the map raises it, its belfry open on four sides and **nothing hanging in it** (Book One: "the Chapel of the Pure Note with its empty belfry").
- **The empty bell-plinth** (map: 49,11) is left to CORE's stone block so its Synod decal stays.
- **The game's decals** (Synod posters d_synod1/2, d_poster2) on the cells KIT hides are redrawn on the kit walls at the same faces.
- **The Greenhall** (map: 26-34 x 4-8; dome block 30,6): the grandest building, an ashlar ground storey with "the Greenhall's long timbered front" above it (Book One), steps up to its door (the books' "Greenhall steps"), notice boards at its front, and the dome over the map's dome cell.
- **The well-house** in the square (books: "in the middle the well-house with the dead Queen's seal", "the well-house with its layers of decrees"; church55: Kaelen "at the corner of the well-house ... his right hand flat on the stone", placed so that corner is a step from his spot at 27.3,22.6): stone, decrees pasted in layers, the green glass seal with a woman's face in profile ("Her face is on the green glass seal").
- **The mooring mast** (map: 36-37 x 19-20; Book One: "a hundred and twenty feet of riveted iron on four splayed legs in the bedrock of the quarry rim"): a riveted iron lattice tower, 36.5 m, four legs splayed to the corners of the mast block on stone footings, ring girders and cross-bracing in every bay, a mooring head (drum, cone, ring).
- **Hush-lamps** at every map lamp: "a lamp with a reed in its chimney" — a lantern on a post with a reed whistle in its chimney; lit always (decoLabel: "Its reed-whistle never lets the street go silent").
- **Shutters**: about a third of windows shut (the Hush); lit and dark panes.
- **Oaks** only where the map has oak decos ("An iron-bark oak"; the p20b copper and green variants keep their colour); no tree is added to the square.
- **Props** only where the map has them: casks (p_barrel, open, on its side), crates, carts, the market tables (Carders' Quarter) as stalls.
- **The far ring** from js/upgrades.js LANDMARKS: the Grey Teeth north with snow, the chalk cliff shoulder, the downs, the quarry head; Greenroot's spire on the downs at the bearing js/sky.js gives it. **No castle.**

## [APPROVED] invented detail (approved by the owner, 9 Nov 2026)
1. [APPROVED] The inn board's painting: a boar in profile and a hammered dulcimer with its two hammers, gilt on dark wood (only the name is canon).
2. The market stalls' awnings are "the colour of old wine and old moss" (canon: the game's Massday market line, calendar11); [APPROVED] their goods (fleeces, honey jars, red cloth).
3. [APPROVED] The Greenhall dome covered in slate with iron ribs and a small lantern on top (the dome is canon; its covering is not).
4. [APPROVED] The well-house's form: four stone piers, a parapet and a slate pyramid roof, with a windlass beam and a bucket.
5. [APPROVED] The Chapel tower's slate pyramid cap and iron finial above the open belfry.
6. [APPROVED] Plaster tints on houses (cream, ochre, grey-white, pinkish) and the mix of timbered, rendered and all-stone upper storeys.

---

# R11 phase 1, team HUD: new player-facing text

All pairs are in `tools/i18n/r11-hud.tsv` and merged into `locales/story/fr.json`.

## The bar (js/r11hud.js)
Button labels are the game's own (`HUD_BTNS`: CHAR INV SONG LOG MAP REST NAMES HELP MURMUR SAVE WEAPON), already French
(PERSO INV CHANT JRNL CARTE REPOS NOMS AIDE MURMURE SAUVER ARME). Tooltips reuse each panel's own title.

| English | French | Where |
|---|---|---|
| Game bar | Barre de jeu | bar's accessible name |
| Health, Fatigue and Voice | Santé, Fatigue et Voix | the vials' group name (the Character sheet's names) |
| Health {0} / {1} · Fatigue {0} / {1} · Voice {0} / {1} | Santé / Fatigue / Voix {0} / {1} | vial tooltips (patterns already in the catalogue) |
| Glassing {0}% | Vitrification {0} % | glass vial tooltip (only when glassed) |
| The Narrow: how loud you are | L’Étroit : à quel point vous êtes bruyant | Narrow gauge tooltip |
| MORE | PLUS | the compact bar's button |
| More buttons | Autres boutons | its tooltip, and the panel's name |
| Equipped weapon | Arme en main | weapon panel's accessible name |
| Compass | Boussole | compass |
| Where you are | Où vous êtes | (reserved; place panel) |
| Character, Inventory, Song-book, Logbook, Map, Rest, The Ledger, How to play, Murmur, Options, Next weapon | Personnage, Inventaire, Livre de chants, Journal de bord, Carte, Se reposer, Le Registre, Comment jouer, Murmure, Options, Arme suivante | button tooltips |

Compass letters in French: N, E, S, O (as js/story-i18n.js already does on the canvas strip).

## The Reach calendar's HUD date (js/calendar11.js `dateShort`, e.g. "The sixth of Harvestmonth")
It had no French, on the canvas bar either. Each of the 360 dates is now an exact line, "Moisson, le six" style
(a `The {0} of {1}` pattern would have caught other "The X of Y" names, so it is deliberately not a pattern).

Month names: the four from the glossary are the author's (Moisson, Chute des cendres, Mois du givre, Mois d'accalmie).
The other eight were [PROPOSED] and are now **[APPROVED]**:
Thawmonth = Mois du dégel, Seedmonth = Mois des semailles, Lambmonth = Mois des agneaux, Reedmonth = Mois des roseaux,
Longsun = Longsoleil, Dustmonth = Mois de la poussière, Firstfruit = Premiers-fruits, Sheafmonth = Mois des gerbes.
Day numbers are French cardinals ("le premier", "le deux" ... "le trente").

---

# BENCH new player-facing text (none is lore; all UI). French pairs: tools/i18n/r11-bench.tsv
Graphics quality; Auto: Ultra/High/Phone; Benchmark; Run benchmark; Benchmark running; Esc to stop; Benchmark result; card labels; "Graphics quality set to X to keep the game smooth: Options to change".
No [PROPOSED] lore. The run uses day 17 (a Rootday), Oakhaven at 10:00, state paused so no event can fire.
