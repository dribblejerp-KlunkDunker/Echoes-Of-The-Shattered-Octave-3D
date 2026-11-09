# Game — Phase 14 New In-Game Text (for review)

All new player-facing text added in Phase 14 ("A world that shows the story"). Anything marked [PROPOSED] is invented and can be changed or cut.

---

## Phase 14 GREENING - review text (all player-visible English; [PROPOSED] = invented)

## Options > Graphics & access (three new rows, On/Off buttons)
- **The Greening shows** - "Oakhaven grows greener as the story nears the Greening"
- **Light-glass spreads** - "crystals grow over walls and floor at the story moments"
- **Root veins** - "glowing veins near the Anchor-roots"

## Sound caption (only when Sound captions is on)
- "[A faint glassy chiming]" [PROPOSED wording, bracket style like the other captions]

No other text: the effects are pictures. Nothing is written to the journal or the log.

## Visual inventions [PROPOSED]
- Stage ladder (from existing flags only): 0 nothing; 1 kaelen_met (moss and a few flowers in the paving); 2 coil_done / rite_ready (vines on the shuttered houses, moss thickens);
  3 rite_started / bore_seated (vines to the eaves); 4 greening (the 300 s escape timer drives a slow creep: roots break the square, leaves thicken);
  5 escaped / part3 / part4 (the full, overgrown town). The Vol V winter after-images (houses in the crowns, HALE & DAUGHTER, the frozen bed, the cart) are NOT shown: Book One is the Greening
  happening, not its aftermath.
- Vines like the oaks: wall growth is denser within seven cells of an oak.
- Light-glass in the Root-vault spreads from the bore in three steps (the Rite, the coil seated, the bit snapping: R 4 / 7 / 11 cells); in Whisper-Grove (part3) around the Sunken Court's shard (R 6),
  and it can stand in the Grove's shallows. Colour: cyan, faintly warm, a glassy chime built on 528 Hz (Light) with 5 pitches of its chord.
- Root veins: green-gold for the Growth root (quarry shaft, Root-vault bore), lilac-white for the Memory root under the Malting's Tuning Room (Anchors are tinted by pitch); pulse period 1.2 s (visual 174 Hz),
  brighter as you come near; steady under No flashes / Reduce motion.

---

## P14 SKIES, new player-facing text (for review). Everything invented is [PROPOSED].

## Kestrel flight scene (between Parts Two and Three; skippable, plays once)
Four lines, Book One canon only (Lyra has no voice after the Root and writes on a slate, as in startPart3's own text).
1. [PROPOSED] Under the keel the orchards of the Reach go by in their rows, greener than any autumn has a right to be.
2. [PROPOSED] Lyra holds her slate up against the wind: THE HEDGE. It passes under you, a dark seam three men deep in thorn, and nothing in it sings.
3. [PROPOSED] Kaelen keeps his glass hand flat on the rail. Under the lift-tanks the whole ship hums one note, and holds it.
4. [PROPOSED] "Spectral Woods," says Vane, not turning round. "Whisper-Grove is under that, with its feet in the water. Mind your voices."
UI: "Skip", "Press any key, click or tap to skip.", sound note (only with Sound captions on) "Wind in the rigging."
Dialog label: The Drift-Kestrel, in flight to Whisper-Grove.

## Options rows (Graphics & access)
- Octave lights: slow coloured curtains in the night sky on certain nights
- Kestrel flight scene: a short skippable scene on the way to Whisper-Grove
- Water light: rippling light on the flooded floor of the Sunken Court

## Octave lights, no text; the lore meaning is [PROPOSED]
The aurora is the province's Signatures (the eight Anchor notes) made visible when the Relay is strained. One muted hue per note:
Growth 174 green, Heat 285 ember, Mass 396 slate, Time 417 amber, Light 528 cyan, Velocity 639 blue, Memory 741 violet, Decay 852 grey-mauve.
Nights (all [PROPOSED]): the eve of the Rite (day 9, Growth/Light/Mass); the first night after the Greening (Growth/Decay/Memory);
the first night in Whisper-Grove, the same night as the Drowned Lanterns (Memory/Light/Decay); the first night in the Deep Woods
(Growth/Decay/Time); and about one night in ten, faintly, by G.day.

---

## Phase 14 PROPS: new in-game text (for review)

All strings are [PROPOSED]. French pairs are in tools/i18n/p14-props.tsv.

## Options rows
- [PROPOSED] Phase 14: props
- [PROPOSED] Mirrors: framed glass in a few rooms shows you, your gear and the room behind you
- [PROPOSED] Sealed doors: doors held shut by story or magic show a thin shimmering skin; No flashes keeps it still, Reduce motion slows it
- [PROPOSED] Breakables: barrels and crates can be smashed with a blow; pieces fall, some hold a little loot; owned crates in town are a crime
- [PROPOSED] On / Off

## Mirror (wall label)
- [PROPOSED] A tall mirror in a plain frame. A traveller looks back out of it, dressed as you are, and the room behind them is the room behind you.
- [PROPOSED] (Wick house) The glass is clear, which is more than anything else in the house is. A traveller looks back out of it, dressed as you are.

## Breakables
- [PROPOSED] The staves crack and hold. / The boards split and hold.
- [PROPOSED] The barrel bursts its hoops. / The crate splinters.
- [PROPOSED] Inside: {0}. / Nothing inside but straw and dust.
- [PROPOSED] No one sees you do it.
- [PROPOSED] Crime label: damage to goods
- [PROPOSED] Sound captions: [Wood splinters] / [Wood cracks]

---

## P14 FOLK - player-visible text (all [PROPOSED]; no story text added, only Options rows)

Options -> Graphics & access (each row: label, hint, On/Off)
1. Hoods in the rain - "people outdoors pull a hood up and hurry for the eaves in rain and snow" [PROPOSED]
2. Huddling in the cold - "idle townsfolk gather at a fire in the cold and rub their hands" [PROPOSED]
3. Swaying coats and cloaks - "coats, cloaks and robes sway as they walk and in the wind (off with Reduce motion)" [PROPOSED]
4. Life at the Boar - "patrons sit, eat and drink; Hetty carries a round to a table" [PROPOSED]

No new dialogue, journal or message lines. Invented behaviour [PROPOSED]: hoods in rain/storm/snow; huddling at cold >= 0.55
(air11 coldness) with a fire within 12 tiles and slack in the routine (hard cold 0.85 gives every worker a warm-up);
patrons stand 20 game-minutes before their routine ends; Hetty's round from 16:00 to 23:00, at most one per 45 s.

---

## P14 CINEMA — new player-visible text (for review)

Options > Graphics & access (preset button and three switch rows; French in tools/i18n/p14-cinema.tsv)

- Preset button: **Cinematic** — state line reads "Graphics: Cinematic" [PROPOSED]
- **Cinematic light** — bloom on lamps and Light-glass, soft light shafts [PROPOSED]
- **Ground fog** — a low drifting fog band and distance haze [PROPOSED]
- **Cinematic grade** — richer colour and a soft vignette [PROPOSED]

No lore text, no dialogue, no item text.
