# Game — Phase 20 New In-Game Text (for review)

Phase 20 "The painted world" is mostly art, so it adds very little text. Everything a player can read is listed below, word for word, from the code on main (js/horizon20.js, js/max20.js, tools/i18n/p20-horizon.tsv). Anything marked [PROPOSED] is invented for the game and needs the author's yes or no. Nothing here touches Book One's main quest, and nothing shows the Hush.

Not on main: PAINTER's work (branch p20-painter, one commit, 10 paintings) has not been merged. Its invented details are listed in section 3 so they can be judged before it is.

## 1. [PROPOSED] canon details, with a recommendation

1. **The Watch Downs.** A chalk-downland map west of the clearing, outside the Hedge, reached by a hurdle in the thorn. The bibles do not describe the country west of the clearing. Features, all invented: the Long Down with a beacon cairn on it (a beacon fire-basket, ash years old); Hedge Knoll; the Scar (a chalk crag, no way up); a sheepfold; a dew-pond; boundary stones; hawthorns; a finger-post whose lower line reads SHEEP-WALK; "there are no sheep" (left unexplained). Walking and looking only: no enemies, items, people or flags. *Recommend: keep.* It is scenery and adds no facts that any book contradicts. The only loose end is the missing sheep; keep it as a quiet hint that the Hush or the Synod took them, or have a later book explain it.
2. **The beacon's view.** The cairn text says that from the Long Down, to the north are the Grey Teeth (canon: js/maps.js already puts them beyond the Hedge) and south-east are the roofs of Oakhaven and the Chapel's belfry "open to the weather". *Recommend: keep.* It matches the empty frame.
3. **The lamp's place in the tower.** Once `rite_ready` is set, the glass-fire lamp the game already mentions ("The Flambeau's people have hung a glass-fire lamp where the tenor bell was") is also drawn hanging in the tower's south opening, the one that looks down on the square. The text only says "where the tenor bell was". *Recommend: keep.* It is the same lamp, seen from outside.
4. **What the belfry looks like.** Two round-headed openings on each face, with stone arches and a moulded cornice; inside, an oak frame, pegged and braced, on a stone plinth. (An oak frame for four bells and four hooks is canon, js/game.js; the openings, plinth and joinery are invented.) No bell is ever drawn: the frame stays empty through all of Book One, as the story says. *Recommend: keep.* If a later book rings a bell, the hook to change is `belfryTexel` / the frame sprite.
5. **The Drift-Kestrel in flight.** Two red pennants at the mastheads, lit stern windows, a brass lift-tank slung along her side (it matches the crash sprite). *Recommend: keep.*
6. **The panoramas.** Greenroot's chapel spire on the north-east skyline from Oakhaven (Greenroot exists, js/parish.js; its look from afar is invented); farmsteads, barns and orchards round Oakhaven; a snapped iron pylon and a standing-stone ring outside the Hedge and a broken tower stump in the Deep Woods (both were in the old stand-in recipe); a broken colonnade and marble spires round Whisper-Grove. *Recommend: keep, but check the standing-stone ring and the pylon against the bibles; they were stand-in decoration and nobody has ruled on them.*
7. **Item icon looks.** Where the item text gives no look, FOLK chose one:
   - Synod Kite Shield: the "dead queen" is a crowned ivory head in profile on red, in a brass rim. *Keep.*
   - The six Chapel letters share one fold; the wax and tie differ: Lyra green; Kaelen blue-grey with black string; Hetty red; Orla brown with twine; Pim grey with a wool tie; Dessa violet with a blue ribbon. *Keep, but confirm the colours are the author's picture of these six.*
   - Letters of credit: one, two or three seals (25 blue, 100 green, 500 red with a gilt edge). *Keep.*
   - Hymn-Nine Slate: a chalk "9". Requiem's Chord-Plate: engraved staff lines with one extra note. Pressman's Plate: three worn digit cells. Vox-Bottle: a lilac wisp in violet glass. Marrin Tace's Bottle: blue glass with a chalk "4" (the text says "a four in chalk"). Cutter's Log: a small stamped label. Mallow's Round-Book: Office blue with gilt bands and a broken chain. *Keep.*
   - Reeds: Root-Note Reed bound in green; Lure Reed in two red threads; First Reed with a hanging loop; Split Funeral-Reed nearly black. *Keep.*
8. **The Whisper-Grove cat.** Walks as a grey tabby seen side-on, with markings taken from the sitting sprite's palette. *Keep.*
9. **Rear and side views of the enemies.** The books never describe the backs of the creatures, so every back and side view of the 25 hand-built species is invented from the front painting (cloth, hide and metal patches, seams, hood points, straps; the hound's head-on lunge; the Phantom Weaver's threads in its wind-up; the grown smoke on A Quiet's outline; Weaverling legs that splay in every view). Pressman Mallow's hand-press on his back is canon (his entry: "A hand-press on his back and a round-book on a chain"). *Recommend: keep; they only continue the paintings.* A Quiet is drawn as an absence with smoke, and nothing behind it is shown, so the Hush is not depicted.
10. **Mood portraits and companion frames.** No new design: each portrait is the existing face with brows, lids and mouth moved, and each companion frame re-poses the existing sprite. Harrow, Sable and Orla keep the old colour-graded stand-in. *Nothing to rule on.*

## 2. New text a player reads

French is in tools/i18n/p20-horizon.tsv, already merged into locales/story/fr.json, unless noted.

### Options, Graphics & access (two new rows; each is an On/Off button with a small hint after the name)

| Row | Hint |
|---|---|
| Country beyond walls | Oakhaven seen past the Hedge from outside it, and distant ground beyond the map edge |
| Chapel belfry | the Chapel tower's open belfry and its empty bell-frame, drawn |

(The hint for "Chapel belfry" starts with a lower-case "the", unlike the first hint, which starts with a capital. Consider "The Chapel tower's open belfry and its empty bell-frame, drawn".)
FR: "Pays au-delà des murs" / "Oakhaven vu par-delà la Haie depuis l’extérieur, et le sol lointain au-delà du bord de la carte"; "Beffroi de la Chapelle" / "le beffroi ouvert de la tour de la Chapelle et son châssis à cloches vide, dessinés". Button labels are the existing "On" / "Off".

### Notice (js/max20.js)

- "Graphics eased to {Cinematic, Ultra, High or Medium} to keep the game smooth — Options to change"
  Shown once for each step down when a first-launch automatic preset is too slow. *Not translated* (no French in locales/story/fr.json; the same was true of the Phase 19 error text). A French line is needed if English-only is not wanted.

### Map name, door labels and things to look at: the Watch Downs [PROPOSED]

- Map name: The Watch Downs. FR: Les Hauts du Guet
- Hurdle, clearing side: A hurdle in the thorn, and a sheep-track up onto the Watch Downs
- Hurdle, Downs side: The hurdle in the thorn, back down to the clearing
- Finger-post: A finger-post with one arm left: THE WATCH DOWNS. Under it someone has cut, small, SHEEP-WALK. There are no sheep. The turf is short anyway, as if it remembers them.
- Beacon cairn: The beacon on the Long Down: chalk and flint piled round an iron fire-basket. The ash in it is years old. North, the Grey Teeth. South-east, over the Hedge, the roofs of Oakhaven and the Chapel's bell-tower, its belfry open to the weather.
- Hedge Knoll: Hedge Knoll. From here the Hedge is a dark line along the bottom of the world, and Oakhaven is the roofs behind it: the Greenhall dome, the mooring mast, the Chapel's tower. Nothing hangs in the tower. You can see daylight through the frame.
- The Scar: The Scar: a chalk face, sheer on every side, flint standing out of it like knuckles. There is no way up, and nothing up there to want.
- Sheepfold: A sheepfold of dry stone, the gate gone. Thistles inside. Somebody kept it mended for a long time, and then stopped.
- Dew-pond: A dew-pond, lined with clay, older than the Hedge. Rain still fills it. Nothing drinks from it that you can see.
- Boundary stones (three): A boundary stone, leaning. Whatever parish it marked the edge of, the lettering is gone under the lichen.
- Hawthorns (many, one text): A hawthorn, combed flat by the wind.

Every line above has a French line in the .tsv.

Two checks for the author on these lines:
- "Nothing hangs in the tower. You can see daylight through the frame." (Hedge Knoll) never changes. After `rite_ready` the lamp is drawn in the tower (section 1, item 3); whether it can be seen from the knoll was not checked. If it can, the line needs a condition.
- The Downs have no area-card picture of their own; they borrow the Hedge card (`SCREENS.FAMILY`).

### Unused

`TX.wall` in js/horizon20.js ("A dry-stone wall across the slope, with a gap for a stile.") is defined but never shown, and has no French. Harmless; it can be deleted.

### Unchanged, but touched by the art

- The Chapel's bell-frame chalk and the Rite's lamp line keep their old words ("TAKEN FOR BORE-TEETH, 412 SR. THEY RANG IN E."; "The Flambeau's people have hung a glass-fire lamp where the tenor bell was."). Only the picture changed.
- Item names, icon alt text, enemy names, portrait alt text, sprite and area-card captions: no change. No new item or enemy exists.

## 3. Not on main: PAINTER (branch p20-painter) [PROPOSED]

No new in-game text. Invented visual detail for the death pictures and cards, to be judged before the branch is merged:

- Death picture for the Weaver family (weaverlings, the Phantom Weaver, the Brood-Mother): a web across a ruined archway with lilac threads and a dropped lantern; no spider shown. *Recommend: keep.*
- Death picture for the Mausoleum's choir (Dirge, Chord-Warden, the Requiem): a marble choirmaster statue with funeral lilies and guttering candles. *Keep.*
- Death picture for the Hollows (Drowned Hollow, Long Night hollows): a flooded street in lilac mist, thin far figures standing still. *Keep; check that the figures read as the hollows and not as the Hush.*
- Which killers share a picture: Cutter-Man and Bosun Teller use the grapnel picture; Office Outriders, Hushwardens and the Outrider-Captain use the bell-helm (soldier) picture; the Quiet Faith (Tongueless, the Deacon) and Hush-Moths use the Quiet picture (an empty lit room; the Hush is never shown); Mire-drones, Fret-crawlers, Briar-sprites and the Long Night hounds use the beast picture; the Aegis Sentinel uses the iron-fist (golem) picture. *Keep as a first mapping; the Tongueless and the Hush-Moths on one picture is the weakest fit.*
- Port Cantabile harbour card: the cliff stair with lamps, the Mole and the mooring mast with a small airship; the Cay card: a low islet with one cottage and a line of posts. *Keep.*
- The unknown-map card (also the Kestrel's deck): an open door spilling lamplight. *Keep.*
