# Release readiness: length, areas and enrichment

Written 27 October 2026, for the owner, before the game goes on sale.

**Sources:**
- Three read-only research passes over the code and the canon. One estimated length, one inventoried areas, one looked for enrichment.
- A headless boot that loaded every map and counted what is on it.
- My own spot-checks of the most serious findings.

**Not yet shown by any of this:** how the game feels, its pacing, difficulty spikes, how loud things really are, and whether the suggestions are fun. Those need a real playtest. Every playtime below is an estimate made from reading the code.

---

## 1. How long the game is

**Assumptions:**
- A first-time player at a normal pace, on Standard difficulty.
- They read most of the text at about 200 words a minute, and die and retry a little.
- The main path has about 11–13k words, roughly an hour of reading, which is already inside these times.
- The game holds about 141k words of text in all.

| What | Estimate |
|---|---|
| **Main story only** | **3–4.5 hours**, typically about 3¾. A hurried player can finish in about 2½. |
| Part One/Two (Oakhaven, the Hedge, the quarry, the Root-vault, the Greening) | 90–125 min |
| Part Three (Whisper-Grove, the Cloister, the Malting) | 45–60 min |
| Part Four (the Deep Woods, the lift-tank, the Mausoleum, "Not Yet") | 60–85 min |
| **Main story plus all side quests** | **about 14–20 hours** (side quests add 11½–16½ hours) |
| Side quests in Oakhaven and the Reach | 6.7–9.9 h |
| Side quests in Whisper-Grove | 2.9–4 h |
| Side quests in the Deep Woods | 1.9–2.9 h |
| **Completionist** | **about 19–27 hours** |
| What completionist adds | Tobin's pages, strongboxes, books, tavern games, cooking, the arena, Kestrel upgrades, and the three post-game extras (the Prologue, Port Cantabile, the Long Night) |
| A second run for the other branches | +3–4 h (calm or destroy the Aegis, the Wearer or the Requiem, the Hedge answer, Sable's choices) |

**The biggest side-quest blocks:**

| Quest | Estimate |
|---|---|
| The heists (Held Letters, Depot Three) | 65–90 min |
| The Third Parish at Greenroot | 40–60 min |
| The Missing Count in the Catacombs | 40–55 min |
| The Hanger and Ewe Barrow | 50–75 min |
| The Sheep-Walk quests | 45–65 min |
| The Lock of Stillwater | 35–50 min |

**Most side content is front-loaded.** About two thirds of it sits in Oakhaven and the Reach, and it closes when the player goes down the shaft. That is why the point-of-no-return warning, fix 2 below, matters.

---

## 2. Fix before selling

These are bugs and loose ends, not features. The first three would show up in reviews.

1. **The Cooper's Row house can break the story.** I confirmed this by reading the code, not by playing.
   - The Whisper-Grove and Deep Woods noticeboards still offer "Enter Your House on Cooper's Row" in Parts 3 and 4 (upgrades.js:856, 1256–1262).
   - The house's only door leads out to Oakhaven (upgrades.js:747).
   - Oakhaven's mast trigger has no Part 3 guard. After the Greening it calls the Part Two ending again (game.js:1555–1564), which offers only a return to the title.
   - **Fix:** once Part 3 starts, hide or disable the house on those boards, or give the house a second door back to wherever the player came from.
2. **No warning before the point of no return.**
   - Going down the shaft sets `rite_started` immediately (game.js:209). That closes the heists and, with the Greening, all of Oakhaven and its 6–9 hours of side content.
   - Part 3's mast ladder lists what you left undone (grove.js:180–190). Part 2 has nothing like it.
   - **Fix:** a one-time "This is the Rite. Oakhaven will not be the same after tonight" confirmation, listing the open Oakhaven quests.
3. **Six quests never close.**
   - The Sheep-Walk and Hanger quests have no ending for the Greening or for leaving the Reach (sheepwalk22.js:780–809, 1331; hanger22.js:605–682).
   - They stay open in the logbook forever. Every other Oakhaven module writes a closing line.
4. **Optional quests are logged as main.** The Lanterns in the Mist, Ignatius, the grey folder and Kaelen telling Lyra are written as main-story entries (wilds.js:109, 117, 133; data.js:509, 684, 980; grove.js:242). Players can't tell what is required.
5. **The Year 417 quest points to the wrong place.** The board says the cairn is "near the culvert" (upgrades.js:855), but it stands at the west edge of the clearing (upgrades.js:1250). The journal says "western oaks".
6. **The Red Cloak can dead-end.** If Sable isn't travelling with you, the Aegis offers no choice (data.js:1001–1003).
7. **The ROADMAP and README promise things that aren't built.**
   - ROADMAP marks these [x], but they aren't in the code:
     - The First Glass and The Root Note.
     - Lyra's and Kaelen's personal quests.
     - Approval perks and leaving the party.
     - Companion gear slots.
     - The calmed Aegis as a companion.
     - The Resonant Coda combo.
   - README says 13 strongboxes; the code places 26.
   - Store copy built from these documents would oversell the game.
8. **Small things:**
   - "the Boar & **Bell**" (game.js:696).
   - Harrow has a duplicate, unreachable branch (data.js:338).
   - Six flags are set and never read, so those choices have no consequence: `halder_told`, `herald_answered`, `aegis_how`, `hymn_read`, `party_plan`, `cat_met`.
   - The Last Sheaf and the Eel-Run can be missed without notice.

### Canon contradictions inside the game

The serial is fixed; these others remain. Most are a line or two each.

- **The Boar & Dulcimer breaks its own rules.**
  - Canon's board says NO SINGING. NO TOASTS. NO DICE, and Hetty says "We do not sing in here, not since Davin".
  - Yet the evening set ends with clapping and stamping, and a dice game runs at a table (tavern11.js).
  - **Fix:** make the set a Narrow performance with silent applause, and move the dice to the cellar.
- **Names the Legionnaires speak when they die.** The pool (data.js:231) includes people who can't be in a core: Joss Carder, Emory Wain, Wren Halloway, Annet Sowerby and Merret Salt.
- **The Cloister's name-tapes are invented.** They include Elsie Fenn, the Behemoth's daughter. Canon has its own list in Book One ch. 20, and its "A. SOWERBY" would tie the tapes to Annet in the crate.
- **The lore books get canon wrong.**
  - "On the Eight Anchors" has the wrong Hz and Anchors.
  - The Veil's absorption is dated 415; canon is about 300 SR.
  - The 417 register tells Tobin's story wrong: it names the Madder child, where canon has the Pellow child in spring.
  - Tobin's journal pages 10–12 are dated after he was taken.
- **Tobin's Tuning-Blade cairn.** Canon has his lyre, found by the stile, and he carried no blade.
- **The heist's quarry lease is signed by Mossbrook,** from a superseded Vol II. Canon has Aldric signing the Consortium's paper.
- **Ignatius runs a shop selling bell-bronze.** In canon nobody has rung a bell since the Synod took them all.
- **The Mausoleum is called a tomb of "Cantors of Memory".** Canon makes it the old house of the Silent Veil.
- **The Tanner twins.**
  - The culvert mystery contradicts canon, where they were "sung into the ground side by side".
  - Their names, Joss and Wyn Wendle, collide with Joss Carder.
- **Sable's companion chat puts the Hall of Carriage in Port Cantabile.** It is at the Organum.
- **Mutton is on every menu** in a starving town whose flocks were eaten.
- **The noticeboard posts a public bounty on proctors** in an occupied Synod town.
- **Lyra sings in the Deep Woods before her voice returns,** although canon says "Lyra cannot sing" there.
- **Near-collisions:**
  - Pellam Dree, the lockkeeper, is close to Pellam Quist.
  - Wenna Marl is close to Abbess Wenna.
  - Annet Sorrel is close to Annet Sowerby.
  - Tobin quotes Lyra's own line, "A martyr is just a musician who gave up before the coda".
- **Reedcraft's "wind-reeds"** turned to sugar-glass dust in canon's 412. Call them Flume-reeds.

---

## 3. How many more areas fit inside Book One

**Today:** the main game has **41 maps**:
- 15 in Oakhaven
- 4 at the Hedge and north
- 6 on the Flume and at Greenroot
- 5 in the Sheep-Walk
- 2 on the Kestrel
- 6 in Whisper-Grove
- 3 in the Deep Woods

There are also 9 in the extras, plus generated dungeons.

**Answer: about 6 more areas without bloat, 8 at most,** for 47–49 in all. Past that you would be inventing places, or reaching into Book Four's winter Reach or other provinces.

**Fill the thin areas first.** These are big and nearly empty:

| Area | What's there now |
|---|---|
| The Watch Downs | Nothing at all, yet it is the doorway to a whole region |
| Wethercombe and the Bellwether | 4 people across a 60×60 combe and an inn, nothing to use at the inn, 3 farmsteads barred |
| The Flume Road (64×32) | No people. Canon has a beekeeper there, Ennis Crowle, who ties into Telling the Bees |
| The tannery | No people, though canon's Hollow sits behind it |
| The Low Rings | No people, 5 barred buildings |
| Stillwater Landing | 5 people and 1 usable object, for canon's "smugglers' town" |
| Oakhaven | 21 of 34 buildings barred; the baker's and chandler's are marked done in the ROADMAP but still barred |

Greenroot, the Cloister and the Mausoleum are empty on purpose, and should stay that way.

**New areas, best first.** Each joins a map that is already reachable.

1. **The Hollow,** through the tannery. A core Book One setting that exists only as a word today. The burl-sick ward, the Grafters' visit, Rooke's sap-mark list, the tending note. It closes at the Greening.
2. **The Carders' house and root-cellar,** behind a barred door. The design doc's tutorial, with Hush-Mites in the root-cellar, was never built. Pim and Nell live here. Small and cheap.
3. **The Moot-house in Whisper-Grove.** Sable's gallery, where she first saw a proctor (Book One).
4. **The Bell Yard and Ashlane,** as one map. Halder Wick's and Ivo Renn's homes: meals left on tables, names for the Ledger, proctor patrols.
5. **The Governor's house,** above the square. Kaelen's birthplace, with the "aired room" and his father's hidden roots.
6. **The standing-stone ring,** off the Greenroot road. Already ruled next in line in the Author Rulings.
7. **The Reedside Conservatory and reed orchard.** Ilse Brennan teaching by slate. Keep the old stair sealed, because it belongs to Book Four.
8. **The Deep Grove,** a wood where the path changes behind you. It has the highest design risk.

**One timing limit applies to all of these.** Anything new in Oakhaven is playable only in Parts One and Two, and anything in the Woods only in Parts Three and Four.

---

## 4. What to add, update and integrate, without bloat

**The main finding:** the game has more systems than it uses.
- The book's core rule, *too loud brings the hounds, too still brings the Hush*, never runs in Oakhaven, the hub.
- Hush-lamps are decoration.
- Songs are fixed by calling.
- Faction standing is only read to award titles.

The best value is making what exists matter. Effort is S (small), M (medium) or L (large).

### Gameplay: make the existing systems matter

| # | What | Effort | Why |
|---|---|---|---|
| 1 | **Hush-lamps as real anchors.** Near a lamp the stillness timer stops, and a hush-whistle can plant a temporary lamp outdoors. | S | The design doc promised it. Today 24 lamps in Oakhaven do nothing. |
| 2 | **The Narrow as law inside the Hedge.** Loud noise makes witnesses give the ward-sign and hush you; a repeat is a "breach of the Narrow" fine through the existing crime system. | S | The hub currently has no Narrow at all. |
| 3 | **Songs learned from people.** Lyra teaches the Root note. Old Tam teaches "The Miller's Daughter", which pulls hounds away. Ilse Brennan or Bettany teach the tending breath. The falling fifth comes from Tobin's notebook. | M | Today the only way to learn a new song is a cheat code. This reuses paid training and Hold the Pitch. |
| 4 | **Hound packs with a leader.** A falling fifth on the leader routs the pack. | M | Combat is chase-and-melee for every enemy; this gives the player a target choice. Canon, Vol II. |
| 5 | **Three small canon combat rules.** Fear raises your noise below 30% health. Quiets go to a lit lantern. Where a hound bursts, nothing carries for a while. | S each | Each plugs into the noise system that already exists. |
| 6 | **Faction standing (canon's Concordance) fed by choices you already make.** Tam, Sable, the bottles, the heists, Pim. It moves only shop prices, a line from Harrow and from Hetty, and one ending line. | M | It is tracked, but nothing reads it. |
| 7 | **Lyra's voiceless kit before her voice returns.** Whistle the falling fifth to stun or aim; the tending breath gives a small heal. | S | This fixes the canon break and gives her an identity in Part Four. |
| 8 | **"Who holds the line tonight?"** At the Part Four camp a companion takes the watch: Kaelen keeps the hounds off but never sleeps; Lyra hums the Hush off. | S | Uses the rest system that already exists. |
| 9 | **A "Listen" verb for the glassed.** Lay the glass hand on a Legionnaire, a stone or a person to hear what it keeps. | M | The 18 glass echoes already exist in dreams.js, and the glass arm has nothing to touch with. |
| 10 | **Let the nine days count, without failing anything.** The Grafters' inspection lands on Rootday and the Church on Dawnday, whether or not you are there. Missing one changes a line, never a quest. | M | Today the nine days carry no weight. |

### Places: life without new maps

| # | What | Effort |
|---|---|---|
| 11 | **The Listening Hour at dusk,** exactly when a new game starts. Lamplighters light the hush-lamps one by one, night-hummers take stools to the crossings, and the shift changes with "all's well, all's quiet, keep to the Narrow". | M |
| 12 | **Named NPCs keep routines.** Today only 6 generic townsfolk move, and the named ones stand in place day and night. | M |
| 13 | **Small Oakhaven life.** The iron-oaks chime in the wind. A sapling pushes up through the cobbles each morning with a hand-saw beside it. The baker's wife punches dough down all night. The sexton salts new graves. A daily tanker-wagon passes with a Legionnaire escort. Dogs howl at noon. | S each |
| 14 | **The Pure Note over Oakhaven.** A 528 Hz drone from `rite_ready` on. On Hearthday morning, townsfolk hum 174 under it, "too quietly to punish". | S–M |
| 15 | **Famine graves.** Readable stones for the Wetherby twins, the Hale girl and the miller's three, with bound jaws and a second stone on the marker. | S |
| 16 | **Hounds circling the camp fire,** humming your own pitches back to you, slightly wrong, all night. | S–M |

### Quests: small and canon-rooted

| # | What | Effort |
|---|---|---|
| 17 | **The Madder birth on day 0.** Help Bettany with Hold the Pitch: "a good Narrow cry" is life or death. The design doc planned exactly this. | S–M |
| 18 | **Lissa Merrow,** eleven, her hands taken by the Grafters. An NPC in the Hollow who knows every lamp, and a grounded reason to care about Pim's inspection. | S–M |
| 19 | **Ilse Brennan in Book One,** as the voiceless song-teacher for item 3. | M |
| 20 | **One residue encounter answered by tone.** A Mourn-echo that has to be told the battle is over, using Polite, Normal or Blunt. | M |
| 21 | **Vane's long gun in the quarry mud** after `vane_told`, as a unique reward. His pistols, *Last Rites* and *Second Opinion*, go into his lines. | S |

### Lore: canon that is written and unused

| # | What | Effort |
|---|---|---|
| 22 | **Book One's epigraphs as documents in the world.** 24 are written and none is used. For example: the Grafting Office handbook in Rooke's surgery; K. Vance on calibrating bores in Kaelen's hut; Catalogue Circular 12 in Depot Three; the bill of lading on Hetty's crates; the Warrant of Purification on the Chapel door; the Rubric of the Rite in Lyra's house. | S each |
| 23 | **Pay the ledger off.** Your names cut into the Kestrel's deck-beam; a candle per name at Canopy; real dates in the ledger, not weekdays. | S |
| 24 | **NPCs notice your calling.** Vosk sees a Blade's glass "burn like a lamp", Ignatius reacts to a Flambeau Penitent, Vane to a Corsair, Bettany to a Cantor. | S each |
| 25 | **An Echo card if you answered the Hedge,** from canon's "The Thread Where She Answered". | S |
| 26 | **Hew Callan remembers.** "I was there. I counted every stroke." | S |
| 27 | **Dialect and feast talk.** "Off-reed", "growing", Candlefast, and rumours about the Weighing. | S |
| 28 | **Recurring voices you can't see,** in a gentle version that is on by default. The dead you have met call from off-screen, and answering teaches the thing. | M |

### Avoid as bloat

- **More minigames or pastimes.** Fix the Boar's games instead of adding new ones.
- **More generic systems.** The arena, procedural vaults, titles and the bounty board already dilute the canon.
- **New regions, currencies, crafting trees, or companions beyond canon.**
- **Faction numbers on screen.** Show standing through how people react.
- **Hard timers that fail quests.**
- **Book Two content in the main game.** It belongs in the extras.

---

## 5. Suggested order

1. **Fix before selling (section 2).** The sequence break, the point-of-no-return warning, quest closure, main and side labels, and the ROADMAP and README claims. This is a few small PRs.
2. **Canon contradictions.** Mostly one-line text fixes, done in one sweep.
3. **The cheap systemic wins.** Hush-lamps, the Narrow in town, the Boar's rules, the Listening Hour, and the epigraph documents.
4. **Fill the thin areas,** then add the Hollow and the Carders' house.
5. **The rest of section 4,** chosen by playtest feedback.
