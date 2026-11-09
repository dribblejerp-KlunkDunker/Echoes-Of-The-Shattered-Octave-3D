# Phase 20 and Phase 21 — Author Rulings

*Ruled by sleeves, 22 Oct 2026. These answer the [PROPOSED] items in
`Phase 20 - New In-Game Text.md` and `Phase 21 - New In-Game Text.md`. Those two files stay as
they came from the Project; this file is what was decided about them. Item numbers match theirs.*

Where a ruling here and a phase doc disagree, the ruling wins.

**Two rounds.** sleeves ruled on the items first. Afterwards sleeves asked Claude to settle what was
still open ("make the decisions here"). Those later decisions are marked **Decided (delegated)**, so
they can be told apart from sleeves' own rulings, and sleeves can overturn any of them.

---

## Two rulings that grow the game

### The Watch Downs become a region (Phase 20, item 1)

**Kept, and promoted.** sleeves: "a whole new region would be amazing." The Downs are no longer
a one-map walk-and-look; they are the first map of a new region west of the clearing. All the
invented features stand as canon: the Long Down and its beacon cairn, Hedge Knoll, the Scar, the
sheepfold, the dew-pond, the boundary stones, the hawthorns, and the finger-post that reads
SHEEP-WALK.

**Decided (delegated): the sheep went into the Hedge's wool and never came back up.** The answer
follows canon nearly all the way:

- The Hedge was planted in the autumn of 417, "with fleece packed into the gaps between the roots,
  raw wool from every sheep in the Reach" (Book Four, Part One).
- The town planted it by hand: "Thorn in the trench, a man's height of packed wool either side …
  The carders came out in their aprons and worked all night" (Phase 6 in-game text).
- Salt mutton is the Reach's staple (Vol I; Phase 6). The Carders' mill has stood idle since its
  engine stopped, with fleece "carded and never collected" (Phase 9 in-game text).

The new part: the Downs flocks were driven down off the hills to be shorn for the Hedge and were
kept inside it. Over the two years Oakhaven lived shut in, they were eaten. Nobody has walked the
sheep-walk since, which is why the fold was "kept mended for a long time, and then stopped".
Nothing took them, neither the Hush nor anyone else.

In the game, no line says this yet. "There are no sheep" stays unexplained on the Downs; the answer
is what any later text must agree with. The region's first inhabited place is a good spot for a
player to learn it, from a shepherd's family or from Nell at the Carders' mill. That line is to be
written and reviewed like any other.

### The panorama becomes reachable (Phase 20, item 6)

**Kept, and promoted.** sleeves: "make the panorama something that can be reached and
explored." What is painted on the skyline today is to become places a player can walk to:

- the snapped iron pylon outside the Hedge
- the standing-stone ring outside the Hedge
- the broken tower stump in the Deep Woods
- Greenroot's chapel spire on the north-east skyline from Oakhaven
- the farmsteads, barns and orchards round Oakhaven
- the broken colonnade and marble spires round Whisper-Grove

This settles the question the phase doc left hanging: the pylon and the stone ring are canon.

**A constraint to design around.** `js/horizon20.js` states that Oakhaven's walls stay walls
because the Hedge beyond them is a story boundary: "the country there is shown … but never made
walkable." Making the panorama reachable reverses that rule. It does not lift the story gate. Any
new route to these places has to respect the Hedge. Two ways to do that: reach them from the Downs,
which are already outside the Hedge, or open them only after the point in the story where the
Hedge is passed.

### The route (Decided, delegated)

**The Hedge stays a story boundary. Everything beyond it is reached from outside it, never from
Oakhaven.** These rules apply to every new place:

1. **Nothing new joins Oakhaven.** Its walls stay walls, as `js/horizon20.js` already says.
2. **A new place joins only the map it is seen from**, or a new map beside it, and only one the
   player can already reach at that point in the story. It never joins two maps that are not
   already joined. The Watch Downs were built on this rule: "It joins nothing but the clearing, so
   it cannot lead around a story gate."
3. **Every new map passes the Downs' checks:** `HORIZON20.reach()` finds no softlock and no fall
   that hurts, and with the switches off the frames stay byte-identical.
4. **A painted landmark that becomes a real place stands on the skyline at its real bearing**,
   the way Oakhaven already does when seen from the clearing.

Where each one goes. The bearings come from the panorama recipes in `js/sky.js`, where 0 is east
and π/2 is south.

| Landmark | Painted on | Reached from | Order |
|---|---|---|---|
| Farmsteads, barns, orchards | Oakhaven's skyline | The Watch Downs region. It is chalk downland too, so these become its country. | 1 |
| Snapped iron pylon | The clearing's skyline, south-south-west (2.07) | The Watch Downs region, going south from the Downs, west of Oakhaven | 1 |
| Standing-stone ring | The clearing's skyline, east (0.11) | Off the Greenroot road, which already leaves the clearing by the east hedge | 2 |
| Greenroot's chapel spire | Oakhaven's skyline, north-east | **Already reachable.** Greenroot is a map (`js/parish.js`), three miles east by the road. | done |
| Broken tower stump | The Deep Woods' skyline | The Deep Woods only | 3 |
| Broken colonnade, marble spires | Whisper-Grove's skyline | Whisper-Grove only | 3 |

**What the new country holds.** Unlike the first Downs map, the region is not walking-only. New
maps may have people, items, enemies and quests. The existing Downs map keeps danger 0, as its
tests require: it is the quiet way in. What the pylon, the ring and the stump were is up to whoever
builds each place. Mark it [PROPOSED] and send it for review like each phase's in-game text.

---

## Confirmed as proposed

### Phase 20

| # | Item | Ruling |
|---|---|---|
| 2 | The beacon's view (Grey Teeth north; Oakhaven and the open belfry south-east) | Kept. See the note under "Checked", below. |
| 3 | The glass-fire lamp drawn in the tower's south opening once `rite_ready` is set | Kept. |
| 4 | The belfry: two round-headed openings a face, stone arches, moulded cornice, oak frame pegged on a plinth, **no bell ever drawn** | Kept. |
| 5 | The Drift-Kestrel in flight: two red pennants, lit stern windows, brass lift-tank | Kept. |
| 7 | Item icon looks | Kept. **The six Chapel letters' colours are confirmed** ("they match"): Lyra green; Kaelen blue-grey with black string; Hetty red; Orla brown with twine; Pim grey with a wool tie; Dessa violet with a blue ribbon. |
| 8 | The Whisper-Grove cat as a grey tabby, side-on | Kept. |
| 9 | Rear and side views of the 25 species; A Quiet as an absence with smoke, so the Hush is never shown | Kept. |
| 10 | Mood portraits and companion frames | Nothing to rule on. |
| §2 | The Downs borrow the Hedge's area-card picture | Kept for now. Once the Downs are a region they will want a card of their own. |
| §3 | PAINTER (branch `p20-painter`): all death pictures, the shared-picture mapping, the Port Cantabile and Cay cards, the open-door card | Kept, including the Tongueless and the Hush-Moths sharing the Quiet picture, and the Hollows' far figures. Cleared to merge on story grounds. |

### Phase 21

| # | Item | Ruling |
|---|---|---|
| 1 | The band of star-dust across the night sky | **Kept, and the name is kept: it is the Chord.** The name now lives only in code comments; it is canon all the same. If any player-facing text ever names it, use "the Chord". |
| 2 | Sun and moon on real arcs; the moon shows the calendar's phase | Kept. |
| 3 | The Octave lights reaching straight overhead | Kept. |
| 4 | The Synod Kite Shield's dead queen: a crowned ivory head in profile on oxblood, in a bevelled brass rim | Kept. It agrees with Phase 20 item 7. |
| 5 | Gear looks: Corsair Buckler, Carillon Bell-Helm (no face shows through the slit from any angle), Consortium Brigandine, Vesper's Boarding Axe, the Throwing Knives as a fan of three | Kept. |
| 6 | The glass arm climbs on the character card: hand first, forearm from 15%, whole arm from 40% | **Kept. The thresholds are confirmed as canon** ("the glassing thresholds are fine"). |
| 7 | Bare-armed travellers in a shirt of the calling's coat colour, sleeves rolled | Kept. |
| 8 | Card headwear following the portraits: faces 1 and 4 hooded, face 3 in a captain's cap | Kept. |
| 9 | The card's dark niche, tinted by the calling's cloak, with a worn plinth | Kept. |
| 10 | Close-up ground detail at 4× | Kept. |

---

## Checked: the Hedge Knoll line

The question (Phase 20, §2): the knoll's text never changes — "Nothing hangs in the tower. You can
see daylight through the frame." — but after `rite_ready` the lamp is drawn in the tower. Does the
line need a condition?

**No. The line is correct as written, before and after the Rite.**

Why: the lamp is only painted on the tower's **south** face, the opening over the Chapel door that
looks down on the square (`belfryTexel` in `js/horizon20.js` uses the lamp art only when
`face === 'S'`). Hedge Knoll stands north-west of the tower: in Oakhaven's coordinates the knoll
is at about (−2.5, −5.9) and the tower at (48–50, 5–7), 53 units away on a bearing of 13°. From
there you see the tower's north and west faces, which always carry the empty frame.

Measured on 22 Oct 2026 by rendering the view in the browser at commit `b09fd5d`. The test stood
at the knoll's post and on its summit and faced the tower at nine headings across ±14°, by day and
by night, on the Medium, High, Ultra and Cinematic presets. Each view was drawn with `rite_ready`
off and on, and the two frames were compared pixel by pixel.

| From | Belfry drawn on the tower | Pixels the Rite's lamp changes |
|---|---|---|
| Knoll, by its post | 35 px (Medium) to 142 px (High and up) | **0** on every preset, day and night |
| Knoll, summit | 24 px (Medium) to 115 px (High and up) | **0** on every preset, day and night |
| Control: in Oakhaven, south of the tower, facing it | yes | 8 px, 2 of them glowing |

The control shows the measurement catches the lamp where it should be seen. From the knoll you see
the belfry and its empty frame against the daylight, and the lamp never shows. The text and the
picture agree.

### Found while checking: the beacon's view on Medium

The beacon cairn's text says that from the Long Down you can see, south-east, "the Chapel's
bell-tower, its belfry open to the weather". The beacon is 77 units from the tower. The far view
draws the town out to 3.2 fog lengths, which on the Downs at Medium is about 70 units. So on
**Medium**, Oakhaven's roofs show from the beacon (about 1,100 px) but **the belfry is not drawn
at all** (0 px). On High, Ultra and Cinematic it is drawn (66–72 px).

**Decided (delegated): the view reaches the tower; the text is not changed.** The far town is
now drawn at least 84 units out (`FAR_MIN` in `js/horizon20.js`), enough for the whole Long Down
summit. On Medium the belfry now shows from the beacon (0 → 9 px), and High and up are unchanged.
The far hook's cost on Medium from the beacon goes from 0.9 to 1.0 ms. This is in
[PR #45](https://github.com/dribblejerp-KlunkDunker/echoes-of-the-shattered-octave/pull/45), which
is open and awaiting merge.

---

## Housekeeping (Decided, delegated)

All of these are in [PR #45](https://github.com/dribblejerp-KlunkDunker/echoes-of-the-shattered-octave/pull/45),
which is open and awaiting merge.

- **The eased-graphics notice gets French.** "Graphics eased to {0} to keep the game smooth —
  Options to change" becomes "Graphismes ramenés au préréglage {0} pour garder le jeu fluide —
  Options pour changer" (new file `tools/i18n/p20-max.tsv`). The catalogue already translates the
  preset names: Ultra, Élevé, Moyen.
- **`TX.wall` is deleted.**
- **The "Chapel belfry" hint stays lower-case.** The suggestion to capitalise it was wrong.
  Lower-case is the house style for Options hints ("beams through the canopy …", "a shimmer over
  fires …"). "Country beyond walls" starts with a capital only because its hint opens with
  "Oakhaven".

### Found while deciding: Phase 21's French was never merged

The Phase 21 doc says "French for all of it is in tools/i18n/p21-*.tsv", and the files are there,
but they were never merged into `locales/story/fr.json`: 4 of 72 lines were in. French players saw
English for the 3D renderer rows, the body rows, the character card and photo mode. PR #45 merges
them: 63 entries and 2 patterns added, no existing French changed. Three lines are deliberately
left out, because the catalogue gives each English string one French string across the whole game:

| English | Kept | Phase 21 wanted | Why |
|---|---|---|---|
| On | Activé | Oui | every switch in Options |
| Off | Désactivé | Non | every switch in Options |
| Back | Retour | Dos | every Back button |

The one cost: in French, the character card's back view reads "Retour" until it gets a label of
its own. The screenshot line used `{w}`/`{h}`, which the translator never matches; it is now a
`{0}`/`{1}` pattern.
