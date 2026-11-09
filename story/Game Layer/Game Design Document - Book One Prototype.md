# Echoes of the Shattered Octave
## Game Design Document — Book One: *The Silenced Province*
*Octopath-style HD-2D RPG · Godot 4 · prototype v0.1 · built from the Series Bible v1.0 and the Book One draft (Prologue–Chapter 10)*

---

## 1. The pitch

Octopath Traveler tells eight stories that happen to share a road. *Shattered Octave* tells a handful of stories that turn out to be the same crime, seen by the people who committed it.

It keeps what makes Octopath work: HD-2D dioramas, one traveler per chapter with their own title card, a special action each traveler uses on townsfolk, and turn-based Break/Boost battles. Then it adds the book's one law, **sound is the predator's sense**. Every system in the game comes back to that. How much noise you make decides whether you fight, how you fight, and what finds you afterward.

**Tone:** the Series Bible's dread doctrine applies here too. Every miracle sends an invoice. Humor is armor. The camera stays for the aftermath. No chapter ends on a clean victory.

---

## 2. Structure: Parts, Travelers, Chapters

Octopath's structure: eight travelers, each with a four-chapter story, played in any order.

*Shattered Octave*'s structure: **Parts**. Each Part is a set of traveler chapters that can be played in any order while their story prerequisites are met, and it ends on a **Convergence** chapter, where the threads meet and the party fights together. Between Parts, the Tide-Weaver narrates an **Echo**: a playable discarded timeline.

| Book One | Travelers | Chapters | Convergence |
|---|---|---|---|
| Prologue | Solenne | The Cracked Bell | — |
| Part One · *The Narrow* | Lyra, Kaelen, Vane | 1–7 | Ch. 7 *Flambeau* (the plan) |
| Part Two · *The Root* | Lyra, Kaelen, Vane | 8–13 | Ch. 10 *The Siphon Casing* (boss) |
| Part Three · *The Forgetting* | + Sable | 14–20 | Ch. 17 *The Cloister* (Aegis joins) |
| Part Four · *Coda* | all | 21–24 | Ch. 23 *Coda* (the Wearer) |
| Echo I | the Tide-Weaver | *The Thread Where She Answered* | — |

**Prototype scope:** everything that exists on the page, meaning the Prologue and Chapters 1 through 10, played in book order. That's four travelers, eleven chapters, eleven maps, seven battles, and five sound-based minigames, ending on the cliffhanger of Chapter 10.

---

## 3. The Travelers

| Traveler | Role | Tone | Path Action (in the field) | Battle identity |
|---|---|---|---|---|
| **Lyra Ashgrove** | Cantor · Support | 174 Hz · Growth | **Tend**: hum the tending note into an NPC. It soothes a hurt and wins trust, which opens items, secrets, and followers. It costs Voice. | Heals, sings enemies down, and controls the Narrow. Her full-voice songs are the strongest moves in the game, and they call the hounds. |
| **Kaelen Vance** | Vanguard · Tank | 528 Hz · Light-glass | **Listen**: put the glass hand to a person, a bell, or a stone and hear what it keeps. Legionnaire cores give up their names this way. | Fists of glass. **Drink** eats sound for power, and the **tideline** climbs every time he does. |
| **Vane** | Corsair · Skirmisher | 639 Hz · Velocity | **Smuggle**: lift an item off an NPC. It succeeds based on the odds shown. *"Nobody looks up."* | Glass-shot pistols (*Last Rites*, *Second Opinion*), a boarding axe, and a laugh loud enough to pull hounds off children. |
| **Solenne Aubade** | Prologue only | 528 Hz | — (the wire allows only one note) | — (she holds the note) |

**Future travelers**, all from the bible: Sable (Mystic · **Recite**, which reads a name out of the Ledger), the Aegis Sentinel (Tank · guards NPCs), Ignatius (Mage · **Purify**), the Static Remnant (Assassin · can never stand still), and the rest of the sixteen.

---

## 4. Core systems

### 4.1 The Narrow meter (exploration)
*"Too loud brings the hounds, too still brings the Hush."*

A two-sided gauge replaces random encounters. It only runs **outside the Hedge** (the clearing, the water-meadow, the quarry terraces).

- **Noise** rises when you run, open chests, or fight. Walking adds a little. When Noise fills, **the hounds hear you** and an encounter begins.
- **Hush** rises when you stand still. When Hush fills, the party starts to **unwrite**: HP drains, the screen goes grey, and the edge of the screen smears.
- **Hush-lamps** on the map are safe points. Near one, Hush drains away and Noise is capped. They also work as save points.
- Inside the Hedge the meter hides and encounters stop. The Hedge swallows sound.

The result is a constant low tension. You can't sprint and you can't stop. You walk the Narrow.

### 4.2 Mimics: voices you cannot see
Some tiles hold a **voice from off-screen**: a dead father, your own voice, a friend. You get two choices: **keep walking** or **answer**. Answering always triggers an ambush, and it **teaches the Wearer** something. The game counts every voice the Wearer has learned, and those voices come back in later chapters, just as they do in the book.

### 4.3 Battle: Shatter & Breath (Break/Boost)
Octopath's combat, retuned.

- **Timbre (shield):** every enemy has a Timbre count and hidden weaknesses, shown as `?`. Each hit on a weakness lowers Timbre by 1.
- **Shatter (Break):** at 0 Timbre the enemy is **Shattered**. It loses the rest of this round and all of the next, takes +50% damage, and gets its Timbre back afterward.
- **Breath (BP):** each party member gains 1 Breath per round (max 5) and can spend up to 3 to boost an attack (more hits) or a song (more power). *Q / E* (or the shoulder buttons) adjust the boost.
- **Turn order** runs across the top of the screen, speed-based, and shows this round and the next.
- **Weakness types:** Fist · Staff · Axe · Shot · and three **tones**: Growth ♪174, Light ♪528, Velocity ♪639. The other five laws (Heat, Mass, Time, Memory, Decay) arrive with later travelers.

### 4.4 The Narrow in battle
The Narrow meter stays on screen during fights.

| Action | Noise |
|---|---|
| Basic attack | +5 |
| Glass shot | +25 |
| Vane's Laugh | +30 |
| Full-voice song (Calling-Song) | +60 |
| Murmur / Defend | −30 / −5 |
| Natural decay each round | −10 |

At the end of each round:
- **Loud (>70):** another hound comes through the walls, if the encounter has any left. Noise then drops by 30.
- **Hush (<15):** everyone unwrites for 6% of max HP.

So the strongest moves are also the most dangerous ones. Lyra's Calling-Song revives the whole party and fills the room with hounds.

### 4.5 Kaelen's tideline (glassing)
This is a persistent meter measured in **fingers from the shoulder**, the same way the book measures it. It starts at 2.5 and goes up +0.1 each time he uses **Drink** and +0.5 when he drinks something large (a Legionnaire's bell, a Golem's boiler). Every finger adds +8% ATK. In the full game, reaching Heartglass (10 fingers) forces a story path. The tideline is recorded on the hut wall in the menu, one line per chapter.

### 4.6 Voice (Lyra's SP): *"Every mending borrows"*
Lyra's SP is her Voice. When it hits 0 she becomes **Torn**: her songs work at half power until she rests. Her Path Action spends Voice too. In Chapter 3 the story empties it on purpose.

### 4.7 The Ledger (names)
Every Carillon Legionnaire dies saying a name, and every core carries one. Names go into **the Ledger**, which is kept in the menu. The prototype holds three: **Tamsin Reed**, **Annet Sowerby (WG-41,006)**, and **Davin Hale** (the only person who isn't a core). In the full game, Sable spends her own identity fragments to return names, and those choices shape the ending (Concordance).

### 4.8 Pitch minigames (the book is about frequencies)
There's one reusable minigame: **Hold the Pitch**. A target band moves along a scripted curve, and you steer your voice with Up/Down to stay inside it. The chapters use it five ways:

| Chapter | Use | Curve |
|---|---|---|
| Prologue | *Hold the note* on the 300th sunrise, while the censer's creak knocks you off pitch | flat 528, with pulses |
| 1 | Hum the baby into the world through a clay jar | flat 174 |
| 1 | The falling fifth, on Pim's roots | 174 → 116 → 174, repeated |
| 6 | The whistle duel with the Wearer | two-note figure |
| 10 | "SING IT DOWN" (during the boss) | falling fifth under pressure |

Other one-off minigames: **Steady Hands** (Ch. 10, threading the wire through skin while the Inquisitor watches), **Eight Bolts** (Ch. 10, 51 seconds at the phase port), **Stall the Clerk** (Ch. 8, keep talking until Mags has hidden the passengers), and **Aldric's Count** (Ch. 10, a 60-second escape).

### 4.9 Echoes (branch you are shown and denied)
At a few points the game offers the choice the book *didn't* make, such as Vane cutting the mast-line in Ch. 8. If you take it, the Tide-Weaver narrates the discarded thread over a desaturated replay, then pulls you back: *"I have watched you choose this four hundred and eleven times."* Echoes you find are recorded. In the full game they add up to the New Game+ dialogue the bible describes.

---

## 5. Chapter-by-chapter (prototype)

| # | Chapter | Traveler | Map(s) | Play | Battle / set piece |
|---|---|---|---|---|---|
| P | **The Cracked Bell** | Solenne | Siphon Foundry | The 300th sunrise; the question; the light takes the risers | *Hold the note* (528), then the fall into a dark that sings back |
| 1 | **The Tending Note** | Lyra | Madder house · Oakhaven · Carder house · the Hedge | A birth through a clay jar; Pim's roots; *Lyra-lark* at the Hedge (mimic choice); the 41st night | Pitch ×2 · **Hush-Mites** in the Carders' root-cellar (tutorial) |
| 2 | **Charcoal and Glass** | Kaelen | Charcoal clearing · Oakhaven · Greenhall | The hound's bed at 20 paces; the Legionnaire and the blue jug (*Listen*); Factor Vosk and Revision 7; "You sold them." / "I fed them." | **Hound** at the clamps (tutorial: Drink, tideline) |
| 3 | **Burl** | Lyra | The Hollow · Lyra's house | Voice spent before dawn; the Grafters; Orla in her chair; Kaelen at the door; the note at the Hedge is *his* | Story chapter. Lyra is **Torn** |
| 4 | **The Boar & Dulcimer** | Vane | *Drift-Kestrel* · square · tavern | Crates talk in their sleep; Hetty's rules; three berths; Davin sings | **Hounds in the tavern**: protect the children behind the bar; the Laugh. Vane joins |
| 5 | **The Quarry** | Kaelen | Quarry terraces · Root-vault · Depot Three | Tobiah's book; the Stage Nine kit; hand on the Root; the coil | Terrace **Rootlings** · boss **Carillon Legionnaire**, which says *Tamsin Reed* |
| 6 | **The Listening Hour** | Lyra | Oakhaven · Flume crossing · water-meadow | Davin's boots; Tam on his bench; the whistle; Pim gone; the culvert | **Whistle duel** with the Wearer · **The Calling-Song**: survive 3 rounds; Tam walks out singing |
| 7 | **Flambeau** | Kaelen | North Gate · square · Factor's office · Lyra's house | The Pure Note on the Greenroot road; *"It let go because they held."*; the paper; **the slate plan** | Story / choice chapter. Signed at dusk |
| 8 | **Cargo** | Vane | *Drift-Kestrel* | Nobody looks up; **Stall the Clerk**; Oona Salt's letter; Annet in crate three; the long gun over the side | **Echo:** *cut the mast-line* |
| 9 | **Beneath** | Lyra | Lyra's house · procession · Root-vault | Four days of *You are very fortunate*; Rooke's thumb; **DON'T SHAKE**; the town hums 174 under 528; the five-note lullaby | The procession: every NPC you pass joins the hum |
| 10 | **The Siphon Casing** | Kaelen | Root-vault | **Steady Hands**; *"I. Am. Fortunate."*; Revision Seven, read properly; **Eight Bolts**; the coil | Boss **Steam Golems** + the **Question** gauge: Lyra must sing it down or the Root lets go · **Aldric's Count** escape · the Root drinks, and grows |

**Ending of the prototype:** "Next: Chapter Eleven — *The Greening*." Then the save shows a summary card: tideline, voices the Wearer has learned, names in the Ledger.

---

## 6. Enemies (prototype roster)

| Enemy | Where | HP | Timbre | Weak to | Behavior |
|---|---|---|---|---|---|
| Hush-Mite Swarm | cellars, meadow | low | 2 | Staff, Growth♪ | *Strip*: raises Hush in battle |
| Cacophony Hound | everywhere outside the Hedge | med | 3 | Shot, Fist, Light♪ | *Stolen Voice*: attack plus Noise; flinches from Kaelen's arm |
| Rootling (burl-sick overgrowth) | quarry | med | 3 | Axe, Growth♪ (sung back) | *Take Root*: binds a party member |
| Carillon Legionnaire | quarry | boss | 5 | Fist, Light♪, Axe | *Toll*: big Noise spike; says a name when destroyed |
| Steam Golem | Root-vault | boss ×2 | 6 | Fist, Shot, Velocity♪ | *Grapple*, *Vent*; Drink ends one instantly while it's Shattered |
| The Wearer (unkillable in Book One) | meadow | — | — | — | learns your voice |

---

## 7. Presentation: HD-2D in Godot 4

- **Dioramas:** maps are 3D, built from ASCII layouts and building rectangles with gabled roofs. Characters are **pixel-art billboard sprites** (32×48, 4 directions, walk cycles) that take real-time light.
- **The Octopath look:** a narrow-FOV tilted camera, **tilt-shift depth of field** (near and far blur), bloom, vignette, volumetric-ish fog, and warm point lights on every hush-lamp against a cold night.
- **Sound as design:** the soundtrack is synthesized from the canon's frequencies. The title theme sits on a 174 Hz drone. The Foundry is 528. The Root's lullaby is the five-note figure from Chapter 9. Hush-lamps whistle.
- **Hounds** are never drawn clean. They use a **heat-haze distortion shader** with a row of mouths down the back, as the book describes them.

---

## 8. Controls

| Action | Keyboard | Gamepad |
|---|---|---|
| Move | WASD / arrows | left stick / d-pad |
| Confirm / talk | Z / Enter / Space | A |
| Cancel / menu | X / Esc | B / Start |
| Run (Noise!) | Shift | X |
| Path Action | C | Y |
| Boost − / + | Q / E | LB / RB |

---

## 9. Roadmap past the prototype

1. **Part Two completion:** Ch. 11 *The Greening* (escape the overgrowing town as Lyra, holding one road open at full voice), Ch. 12 *Grab the Line* (the ten-heartbeats choice, played in real time), Ch. 13 *Ash in the Hold*.
2. **Part Three:** Whisper-Grove, Sable as the fourth traveler, Hollows you can restore by spending Sable's three identity fragments, and the Aegis Sentinel recruitment through a song.
3. **Concordance:** faction standings (Church penitents, Null-Watch, Free Captains, Deep Guilds, Catalogue defectors) that unlock the four endings in the bible (Accord, Crown, Void, Silence).
4. **Campfires:** *who holds the line tonight*, with permanent consequences.

---

## 10. Open design decisions (for you)
1. **Free order or book order?** The prototype follows book order. The full game can open each Part's traveler chapters to any order, Octopath-style.
2. **How much of the Echo system goes in:** a few short Echoes as flavor, or real branches that lead to the other endings.
3. **Graphic ceiling in pixel art:** the prototype keeps Orla's chair, the Grafters, and the Hollows readable but restrained, which matches the bible's "disturbing, never gratuitous."
