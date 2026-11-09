# Story brainstorm: what Book One has that the game doesn't play yet

Written 27 October 2026 for the owner, who asked for "much more content added to the actual story, so long as it is entertaining". Read-only research. No repository file was edited.

**Sources read in full:** the Book One manuscript (Prologue to Echo I), the Series Bible, the Game Design Document, the Phase 20–21 Author Rulings, Vol III (b) Errata, ROADMAP.md's Release road (R1–R7) and the Release Readiness document.
**Code read:** `js/data.js` (NPCS, journal lines), `js/game.js` (the opening, the Rite, the Greening, the Part Two ending), `js/grove.js`, `js/coda.js` and `js/wilds.js`, plus the header comments of the story modules (kestrel16, sidequests, tavern11, festivals12, house13, synod15 and others).

**How to read the citations:**
- `ch. 6, l. 2113` is a line in `story/Books/Book One - The Silenced Province/Book One - The Silenced Province (full manuscript).md`.
- `data.js:436` is a line in `js/`.
- `[PROPOSED]` marks anything invented beyond canon.
- `R3`, `R6` and so on are the Release road milestones. Where an idea overlaps one, I say so and give only what this adds.
- The four libraries now being built (the Conservatory with Ilse Brennan, the Bonded Store at Stillwater, the Moot-house, the Veil's scriptorium in the Mausoleum) and their book quests are not duplicated here. Section 3.7 only says how books could carry story.

**What this can't tell you:** whether any of it is fun. These ideas come from reading, not playing. Pacing, difficulty, how long a set-piece really takes and whether a scene lands all need a playtest. Every minute figure below is a guess.

---

## 0. The short version

The game has the novel's **plot**: the coil, the Rite, the escape, the press, the herald. It mostly lacks the novel's **set-pieces**. Most of the book's great scenes are either a paragraph on an end card or happened before the player arrives:
- the Boar & Dulcimer;
- the water-meadow;
- the procession;
- the needle;
- the Greening walk;
- the rope;
- Hob on the deck;
- Sable reading Vane three names;
- the voice at the Cloister door;
- the Wearer at the lamps.

The best value is to **turn told beats into played ones**, mostly by replacing fetch steps rather than adding new ones. The ten strongest:

1. **The Greening, walked** (ch. 11). Sing a corridor through a drowning town, sing Orla down in her tree, and stand at the sealed North Gate while the Hedge calls people by name. It uses the voices *this player* let it learn.
2. **Grab the Line, played** (ch. 12). Children four to a line, a hound on the rope, the count to ten. If you reach the mast late, you are on the last rope and the Governor pushes you up past himself.
3. **The Rite from procession to pumps** (ch. 9–10). The town hums 174 under 528, everyone you helped joining in. Then Kaelen's shaking needle, "I. Am. Fortunate.", "SING IT DOWN", and Aldric counting down while you choose between the ladder and the eight men still pumping.
4. **The water-meadow** (ch. 6). Pim walks out toward Tobin's shape singing in Lyra's old voice. A two-note whistle duel the Wearer learns as you play it. Tam walks out singing *The Miller's Daughter*. If you told him to keep listening to his dead wife, that is why he didn't see Pim go.
5. **Hearthday at the Boar & Dulcimer** (ch. 4). Davin sings *The Last Sheaf*, the oaks ring, and you have ten counted seconds. Children behind the bar, Vane's deliberate laugh, the boots, Hetty rewriting her board.
6. **Voice at the Door** (ch. 20), replacing today's porch fight. Don't answer, and keep the Aegis from walking out to a "singer" in the fog. It cycles every voice it has taken from you this game.
7. **The forty-one nights.** The stone behind the cooperage, Lyra's secret, and what you do about it. This is the canon spine of the unbuilt Lyra companion quest, and it unlocks Echo I.
8. **Ash in the Hold** (ch. 13), a playable night on the *Kestrel* between Parts Two and Three: the field hospital, Hob rooting into the deck, the long drops, Tobiah's dawn confrontation, the calling-song from four miles back.
9. **The Wearer at the ring of lamps** (ch. 23). The canon finale: the funeral office sung at full voice, eight bars in harmony, one strike. It replaces or offers an alternative to the tomb-puzzle choir.
10. **Small canon payoffs that cost almost nothing.** Sable reads Vane three names ("You are not lost. You are filed."). "Tell Mam I'm Tamsin Reed", which the Bible plants (Bible l. 549) and the manuscript never pays off. The eight pump-men's names. Hymn 9's real words.

Section 5 lists **24 contradictions not in the Release Readiness doc**. The biggest:
- the crates are in Hetty's cellar, not the *Kestrel*'s hold;
- Bettis Renn is a man in the game;
- the cutter carries its own 432 vox-bottles;
- Hob survives as a crew blacksmith;
- the Wearer is fought three times;
- the opening day already has Davin dead.

---

## 1. How the game tells the story today

**The player's role.** You are a stranger who came up the Greenroot road, not one of the four travellers the GDD planned. The canon people stand where they live and hand you errands. That is the adaptation's real constraint. Every proposal below gives the player a job *inside* a canon scene without taking the canon moment away from Lyra, Kaelen, Vane or Sable.

**The main path now** (journal lines in parentheses):

| Part | What you do | Played or told |
|---|---|---|
| One/Two | Harrow sends you to Lyra (`game.js:162`, `data.js:339`). Lyra sends you to Kaelen (`data.js:353`). Kaelen sends you for the coil (`data.js:373`). Tobiah gives you charts. You kill the Depot Three Legionnaire, "Tamsin Reed" (`maps.js:644`), return to Kaelen, get the pass, and take the shaft (`game.js:209`, which sets Hearthday). You seat the coil, survive two Steam Golems (`game.js:1515–1529`), have a 300-second escape through a greened Oakhaven (hounds and burl-sick only, `maps.js:321–327`), and reach the mast. | **Played:** the coil fetch, the casing fight, the escape run. **Told** on the end card (`game.js:1610–1631`): the mast, the rope, Aldric, Orla, Tam, Tobiah's charts, the deck-beam list. |
| Side, Oakhaven | Davin's boots to Orla. Honey or tending for Pim. Hetty's talking crates (in her cellar). Tam and the Flume voice. The Tanner twins. Sable in the mist, collecting three names. Plus the large Phase 9–22 side content. | Mostly played, as dialogue choices. |
| Three | `startPart3` text card: YOU SAID DO IT, Vane's confession, the beam list. Then Whisper-Grove, the proctor ambush with Halder walking through it, Sable joining, the Cloister Aegis (Hymn 9), the Malting press, Quist, Bettis, the Tuning Room folder, a Wearer fight at the Cloister porch, and the ladder. | The ambush and Aegis are played. The chase, Jory, and Ch. 16 are text cards. |
| Four | `startPart4` text card (the grapnel choice, Jory). Then the Deep Woods camp, three lift-silk bolts, the cutter's valve, ringing four tombs high to low, the coda boss in the Mausoleum choir, the herald, and "Not Yet". | The camp, lift-tank and coda are played. The confession is a dialogue choice (`data.js:980`). |

**The pattern.** Wherever the novel has a long, felt scene, the game either:
- **narrates it after the fact:** the rope, Ash in the Hold, the chase;
- **turns it into an errand:** the boots, the coil, the lift-tank;
- **moves it before day 0:** Davin's song (Hetty says "not since Davin" at the start, `data.js:392`) and the culvert lure (Pim: "Something whistled my whistle… I didn't go", `data.js:436`).

Aldric, Vosk, Pim and Bettany have no story beats at all. Aldric's and Vosk's `quest` returns `null` (`data.js:448`, `442`).

---

## 2. Chapter by chapter: what the novel has that the game omits or flattens

Legend:
- **✔** in the game and played;
- **◐** present but told, flattened or moved;
- **✘** absent.

Items already on R1–R6 are tagged with their milestone.

### Prologue: The Cracked Bell (Solenne, 412 SR), ll. 8–223
- ✘ The whole chapter. The extra called "Prologue" (`prologue17.js`) is Book Four's River Gate.
  - The three hundredth sunrise, and the wire that sings for you (l. 25).
  - The choir's hand-speech under their hems, and *Look at me* to a sister who never looks (ll. 33, 75–77).
  - The engineer's low Reach hum, the only second note in the Foundry (ll. 85–93).
  - The chord drawing in until it asks *Is it time?* (ll. 115–131).
  - "Hold the note" (l. 141), and the light taking everything.
  - The engineer throwing three gantry boys into the conduit and holding the bulkhead while his arm sets (l. 175).
  - The fall, and the mouth below that sings her note back (ll. 217–223).
- The GDD planned this as *Hold the note* at 528 against the censer's creak.

### Ch. 1, The Tending Note (Lyra, Nullday), ll. 232–554
- ✘ The Madder birth through a clay jar, and "a good Narrow cry" (ll. 248–278). This is R6; the Madders' house is barred (`maps.js:256`).
- ◐ Pim's roots and the falling fifth (ll. 340–376). This is now Nell's honey-or-tending choice (`data.js:490–502`).
- ✘ The cost made visible. A root-hair grows in Lyra's palm and she bleeds green after mending (ll. 396–402, and again l. 1089). *Every mending borrows.*
- ✘ Nell's husband Joss, who shouted "hounds!" to save the children's lane and left only boots (ll. 332–336). This is the Carders' grief, and it is why Pim matters.
- ◐ The Listening Hour: lamplighters, night-hummers, "all's well, all's quiet, keep to the Narrow" (ll. 408–414, 506). R3 makes it ambient.
- ✘ "Lyra-lark" at the Hedge. She walks past her father's voice at the same pace while Tam stops humming and makes the ward-sign (ll. 430–450). Off-key on the fourth bar of *Apples in the Rain* (l. 436); that song appears nowhere in the code.
- ✘ **The forty-one nights** (ll. 506–554):
  - the thin stretch of Hedge behind the old cooperage;
  - a flat stone;
  - "Hello, Da";
  - it asks about her day, and knows about Pim's hands because she told it.
  - This is the book's central secret, and the Bible's "Secret" for Lyra. It is entirely absent.
- ◐ Tobin's death at the Pellow farm in spring, and the lyre by the stile (ll. 454–466). R2 fixes the game's version, which is wrong.
- ✘ Kaelen's lit window outside the Hedge, the stile story, and "I was supposed to hold something together" (ll. 472–490).

### Ch. 2, Charcoal and Glass (Kaelen, Rootday), ll. 561–893
- ✘ The sand trough, the tailor's tape, and the hut wall's column of tideline numbers (ll. 572–598).
- ✘ The charcoal clamps you manage by listening: a clamp goes quiet before it flares (ll. 602–608). This is a perfect Narrow-themed task, and it is unused.
- ◐ The hound's bed, twenty paces from the door (ll. 612–622). It is static in the game (`data.js:367`). In canon it creeps to five paces (l. 1885).
- ✘ The Legionnaire with the summons, and the young woman inside its bell: *the blue jug, Mam. Not the white* (ll. 626–668). In the game *every* Legionnaire murmurs about a blue jug (`game.js:1429`). See section 5.
- ✘ **The Greenhall** (ll. 682–877). This is ✘ as a scene; Aldric and Vosk only have greetings and topics:
  - carvings covered by banners, and the Cantor's chair replaced by the dead Queen's seal;
  - Vosk's resonance lenses seeing Kaelen's arm "burning like a lamp";
  - Revision 7 and Stage Nine (*Source: Cantor, local (1). Collar: standard. Wire: standard.*);
  - the three-part offer (the arm, the badge, the Hollow);
  - brandy;
  - "You sold them." / "I fed them." and the famine: the Wetherby twins, the Hale girl, the miller's three (l. 849);
  - **"Da. Your hair."**, Aldric's hidden roots (ll. 853–865);
  - the gate and the step (ll. 867–871);
  - **"Your room's as you left it. I had them air it every spring."** (l. 875). The Governor's house is R5 #5.

### Ch. 3, Burl (Lyra, Rootday), ll. 898–1287
- ✘ **The Grafters' round** (ll. 939–1077):
  - the felted white wagon, the masked Grafters hissing in the Narrow;
  - Rooke unmasking: "You went ahead of me";
  - Hob's three wooden toes, the mute-drops (which take the voice, not the pain), the hush-saw "whispering *shh* into a pillow", the sap-iron hiss;
  - Lyra breathing the Root note soundlessly into Hob's hair;
  - Pim's inspection: "Unusual. Recheck next month";
  - Orla rooted into her chair with green shoots ("I'm afraid I've put down roots"), roots in her lungs, the green chalk;
  - "sing me down… Proper. Not in a jar";
  - Rooke admitting the Inquisitor wants his sap-mark list.
  - R5 #1 (the Hollow) and R6 (Lissa, the nine days) cover the *place*; nobody has scripted the *round*.
- ◐ Lissa on the step, drinking from a tin cup between her bandaged forearms (l. 1079). This is R6.
- ✘ A voiceless Cantor at her door with a slate, and people going away "as if they had come to a well and found it dry" (ll. 1085–1087).
- ✘ **Kaelen's three raps** (ll. 1093–1241):
  - she unlaces the felt sleeve and breathes the Root note into the glass wrist, and green warmth rises through the blue;
  - he tells her Stage Nine;
  - the coil plan;
  - "Buy them", the lie they let stand.
- ✘ **His hum at the door is the Hedge's note** (ll. 1245–1287). She doesn't go that night; it hums his note until dawn. *It had been practicing.*

### Ch. 4, The Boar & Dulcimer (Vane, Hearthday), ll. 1292–1687
- ◐ The crates talk in their sleep (ll. 1305–1315). The game puts them in Hetty's cellar (`data.js:394`); canon puts them in the *Kestrel*'s hold.
- ✘ Mags and Pennick, and hand-cant: *Ship's sick. Tanks.* (ll. 1325–1351). Mags and Pennick appear only from Part Three (kestrel16).
- ◐ The rules board: NO SINGING, NO TOASTS, NO DICE, NO WEEPING ABOVE A HAND (ll. 1371–1376). This is R2.
- ✘ Kaelen buying berths with Consortium scrip ("I love it already", l. 1434), and "Survived? Gods above, Cantor, don't romanticize it" (l. 1476).
- ✘ **Davin sings *The Last Sheaf*** (ll. 1492–1546):
  - the room stops; Vane counts to ten;
  - the oaks ring at six; the birds stop;
  - at eight, the song comes back from outside, a quarter-tone flat.
  - This happens before the game starts.
- ✘ **The hounds through the gaps** (ll. 1550–1606):
  - *Last Rites* and *Second Opinion*;
  - Kaelen tearing the felt sleeve off with his teeth;
  - Lyra behind the bar, "the quietest thing in the room";
  - Vane choosing to laugh to pull two hounds off a whimpering child.
- ✘ The aftermath (ll. 1612–1631):
  - the boots side by side, still laced;
  - the clerk's ledger: *Hale, D. Carter. Dissonant: self-inflicted. No further action.*;
  - Hetty wiping the board and writing the same four rules again.
- ✘ The hold at night (ll. 1659–1687). A child inside a crate counting for hide-and-seek. The VESPER bottle. "Forty-eight."

### Ch. 5, The Quarry (Kaelen, Hearthday night), ll. 1694–1919
- ◐ Tobiah asks Kaelen to sign his worn *On the Calibration* (ll. 1721–1737). The game has one line (`data.js:455`), and Tobiah just hands over the charts.
- ✘ The Stage Nine kit in its velvet case: the collar, the copper wire, the silver needle "curved like a new moon" (ll. 1755–1763). "Do you think she knows yet, sir?"
- ◐ The Root chamber and the Hollows at the pumps, one with a wedding ring and a scarred eyebrow (ll. 1767–1781). There is one generic pump Hollow (`maps.js:637`).
- ✘ The hand on the Root: the humming stops and something turns toward him (ll. 1793–1811). R6 Listen verb.
- ◐ Depot Three. Kaelen drinks the bell's alarm note, breaks the grille, and Tamsin Reed says her name three times (ll. 1849–1869). The game has a Legionnaire named Tamsin Reed and a cracked core (`game.js:611`); the moment itself is not staged.
- ✘ Dragging the body to the slag-pit (ll. 1875–1879). The game already has a body-dragging system.
- ✘ The hound's bed at five paces (l. 1885).
- ✘ "*Tamsin Reed.*" in his own voice from the clearing (ll. 1905–1919).

### Ch. 6, The Listening Hour (Lyra, Massday), ll. 1924–2229
- ◐ Hetty brings the boots to the Cantor (l. 1947). Orla: "Was he any good?" / "He couldn't hold the fourth line." She heard the song come back "with nobody inside it". She asks Lyra to sing her down "before they come with their fire" (ll. 1955–1983). The game has the boots errand (`data.js:426`).
- ◐ Tam on the cooperage bench (ll. 1987–2009):
  - his dead wife calls him *Tammy*;
  - "Is that wicked, do you think?";
  - the basket for Tobin's reeds.
  - The game's Tam quest is a good adaptation, but with different canon (see section 5).
- ✘ Lyra teaching Pim the whistle: "Only you and me know it. It's ours." (ll. 2013–2025).
- ✘ **The whole set-piece** (ll. 2029–2229):
  - Pim goes to the Flume pump; Nell at the blue door;
  - the culvert;
  - the meadow outside the Hedge;
  - Tobin's shape singing *in Lyra's old voice*;
  - the whistle, which it learns while she watches;
  - the calling-song at full voice;
  - Pim running to the *torn* voice because that is the one that spent itself on him;
  - Tam walking out singing *The Miller's Daughter* and missing the high note;
  - his stool and the finished basket;
  - a dye-works woman sitting down on the stool and humming;
  - at the dead hour, four voices and a perfectly pitched whistle.
- The game reduces all of this to Pim's one topic line and a Tam ending sentence placed at the Greening (`game.js:1619`).

### Ch. 7, Flambeau (Kaelen, Dawnday–Driftday), ll. 2234–2549
- ✘ His Light-glass arm singing 528 in the sand as the choir approaches (ll. 2245–2255).
- ✘ **The Church arrives** (ll. 2259–2323). Still only a camera fly-by in `cinematic24`:
  - thirty voices passing one note down the line;
  - Flambeaux flaring glass-fire at hounds pacing the tree-line;
  - the censer's creak triggering the Foundry;
  - the warrant read aloud in the square;
  - two Legionnaires taking Lyra "into the Church's protection".
- ✘ Ignatius's bleached hand, and **"It let go because they held"** (ll. 2333–2373). The game has the topic line only (`data.js:507`).
- ✘ The Factor's office (ll. 2377–2409):
  - the lamp with no chimney;
  - "Thirty-one households. Eighty-four souls… nineteen of them children";
  - the paper;
  - "one of my Legionnaires walked into the slag-pit… Did you see anything?"
- ✘ **The slate** (ll. 2413–2523):
  - THEY KEEP EVERYTHING / THEN WE WHISPER, AND WE WRITE;
  - Tamsin's core on the table;
  - Lyra's five-point plan;
  - "A martyr is just a musician who gave up before the coda", in its real context: twelve years old, on the stile, after he fell off the chapel roof.
- ✘ The Carders climbing the mast-ladder on Driftday (l. 2527).
- ✘ The signing. Aldric's breath "like a man who has been holding a door shut against a storm" (ll. 2529–2549).

### Ch. 8, Cargo (Vane, Driftday night), ll. 2561–2818
- ✘ All of it. The GDD planned *Stall the Clerk* and an Echo.
  - "Nobody looks up."
  - Three rules.
  - The clerk counting crates while they murmur ("They do carry on, don't they").
  - A child's boot under Vane's boot.
  - Oona Salt's letter, the violet-eyed woman and old coin.
  - The temptation to cut the mast-line.
  - Pim talking to Annet; the crate opened; WG tags numbered in the order taken.
  - Vane does not laugh.
  - *We're not delivering.* / *Good.*
  - Pennick's lift arithmetic: 6, then 18. The long gun over the slag-pit.
  - "Annet. You're going home."
  - The letter burned.
- ◐ The game gives Vane's turn as one dialogue line, after you listen to Hetty's cellar (`data.js:405`).

### Ch. 9, Beneath (Lyra, Memoryday–Hearthday), ll. 2823–3046
- ✘ Four days in the rubric (ll. 2834–2852):
  - two kind sisters, honey and raw egg;
  - "You are very fortunate" (I KNOW / DO YOU SAY THAT TO ALL OF THEM?);
  - the Pure Note as "a lid", with wool in ears and children crying.
- In the game Lyra sits freely at home until you take the shaft (`maps.js:378`).
- ✘ Rooke reading her palm, smudging it with his thumb, and the nod (ll. 2856–2870). *THE LONG DROPS. DON'T LET THEM BURN HER IN THE CHAIR.*
- ✘ Kaelen's slate visit: *WHEN I MOVE, SING* / *IT'S A SMALL SONG* / *DON'T SHAKE* (ll. 2874–2906).
- ✘ Dressing her in white; her mother's shawl on her father's chair (ll. 2910–2918).
- ◐ **The procession.** One old woman hums the Root note, then the whole town, under the Pure Note, "so softly that no one more than ten feet away could have sworn to it". Lissa hums with her mouth shut (ll. 2922–2938). It is only a journal sentence (`game.js:209`). The GDD planned "every NPC you pass joins the hum".
- ✘ Tobiah carrying the case like a coffin: "They say it doesn't hurt very much" (ll. 2946–2956).
- ✘ Lyra touching the pump-man's wrist with a breath of 174, and he is *there* for one breath. Vosk: "Interesting." (ll. 2978–2994).
- ◐ **The five-note lullaby** that keeps losing the tune (ll. 3008–3030). It is one sentence in the coil event (`game.js:1513`).

### Ch. 10, The Siphon Casing (Kaelen, Hearthday noon), ll. 3051–3342
- ✘ **The needle through a fold of skin**, the "It has to bleed" (ll. 3062–3092). The Inquisitor crouching a foot away: "Speak, daughter." / **"I. Am. Fortunate."** flattened onto 174 (ll. 3094–3110). The GDD planned *Steady Hands*.
- ✘ Reading Revision Seven properly: "She was the fuse" and "You brought them to ask a question" (ll. 3144–3170).
- ◐ Tobiah calling the pitch, and "You'll want to hold onto something" (ll. 3176–3204).
- ◐ "LYRA! SING IT DOWN!": the Root lets go of the question and starts its lullaby again (ll. 3226–3242). There is one line of event text.
- ◐ Golems. Kaelen drinks a boiler (ll. 3246–3268). The game has the fight.
- ✘ **The speaking-tube** (ll. 3272–3298):
  - "Da." / "…Kaelen.";
  - "I have to choose between a hole and a town";
  - "Forty-one. Forty."
  - The game has one line: "…three. Two. For Oakhaven." (`game.js:1528`).
- ✘ **The pumps** (ll. 3310–3316). Twelve men on the pumps and a cage for eight. Lyra unhooking them one by one; four reach the cage; eight are left.

### Ch. 11, The Greening (Lyra), ll. 3347–3578
- ◐ The ladder climb with the shaft filling with leaves; the quarry gone green; Legionnaires standing with grass through their feet (ll. 3358–3392). The game has a timed run.
- ✘ The town's pieces (ll. 3416–3428):
  - the heaving churchyard;
  - the baker's wife saying *I punched it down*;
  - the carter rooting to the cobbles "with dreadful embarrassment".
- ✘ **Singing a corridor**: an eight-foot circle of stillness, sixty people in a line, hands on shoulders. Hetty, Bettany and Rooke organising (ll. 3432–3448).
- ✘ **Rooke couldn't cross Orla's floor and gives up the long drops** (ll. 3452–3460).
- ✘ **Orla inside the tree**: "You're late, lovey." / "Now, girl. Now. All the lines." The fourth line held (ll. 3462–3492).
- ✘ **The North Gate** (ll. 3508–3570):
  - four hundred people;
  - the thorn growing back faster than axes cut;
  - the Hedge speaking as Tobin, Tam, Lyra and Davin;
  - Lyra screaming DON'T ANSWER IT from the mounting-block;
  - **Ada Pellow: "Tobin Ashgrove, is that you?" / "Hello, Ada."**, and she climbs in;
  - the Chapel falls, and the Pure Note stops.
- The end card mentions only the Orla song (`game.js:1622`).

### Ch. 12, Grab the Line (Vane), ll. 3583–3810
- ◐ Told on the end card (`game.js:1614–1615`):
  - Mags axing the mooring cable;
  - "Oh," says Pennick;
  - children four to a line, Mags on the winch;
  - a hound down the rope, and an old man's hands staying on the knot;
  - Kaelen over the rail;
  - Lyra up with nothing left in her throat;
  - the last load and Aldric's palm-out wave;
  - the count;
  - "Do it.";
  - the leap;
  - 380 people waving;
  - Vane unable to laugh;
  - six feet of cut rope hanging for four days.

### Ch. 13, Ash in the Hold (Kaelen), ll. 3815–4063
- ◐ A text card (`grove.js:16–21`): YOU SAID DO IT, the confession, the beam list.
- ✘ The field hospital: Bettany; Hetty counting the children twice an hour "which was not about safety"; Lissa not speaking (ll. 3826–3836).
- ✘ Through the glass, the Root still holding with a hole in it. *Somebody has to hold it.* (ll. 3858–3872)
- ✘ "You didn't have to say it." / "I know. That's why I said it." (ll. 3902–3910)
- ✘ **Hob Wendle rooting into the deck**: "I'm sorry about your ship, Captain". Bettany hums for a Cantor who can't. Five feet of beam go over the side with him (ll. 3914–3964).
- ✘ **Tobiah at dawn**: "I saw what you put in the port." The charts with the margin. "It was a beautiful Sequence, sir." (ll. 3968–4018)
- ✘ The Church's glass-fire firebreak ring seen from the air (ll. 3970–3974).
- ✘ The calling-song in Lyra's whole voice following the ship from four miles back (ll. 4022–4038).
- ◐ The beam list (ll. 4042–4063). R6 covers the deck-beam names.

### Ch. 14, Entry (Sable), ll. 4072–4215
- ◐ Twenty names a night, and Halder's table. The game has both.
- ✘ Her nightly inventory recited aloud (ll. 4121–4147). The game mentions it in a greeting.
- ✘ The twice-taken man in Ashlane, and the margin rule "Do not comfort yourself in the margin" (ll. 4151–4167).
- ✘ Her entry: *This is the first time in three years that I have written the word I.* (l. 4215)

### Ch. 15, Statistical Anomaly (Kaelen), ll. 4220–4457
- ✔ The lamplighter, the cat, the slates, the ambush, Halder's death.
- ◐ Sable reading **Emory Wain** his surrendered name: mother Hanne, sister Ivy, "the clerk was me" (ll. 4401–4413). The game reads a random name or "Ansel Grey" (`grove.js:36`).
- ✘ The marble finial, Lyra sick in the water, the tuning key in a knee, the whistle used to aim Kaelen (ll. 4351–4387).

### Ch. 16, Manifest (Vane), ll. 4462–4638
- ✘ All of it:
  - Sable climbing a hundred feet with a broken nose;
  - reading the tags from memory with the Ledger shut;
  - "One thousand three hundred and forty-two";
  - *carrier OK-114 is reliable and does not ask questions*;
  - **"Read you three"**: Corwin Aye's barrel, Mirren Salk's coat, Annet who wouldn't let go of the boy's hand;
  - **"You are not lost. You are *filed*."** / *"Is that you, Mistress Dray?"* / "No, love. It's the clerk."

### Ch. 17, The Cloister of the Lost Choir (Lyra), ll. 4643–4846
- ✔ The Aegis, Hymn 9, the cloaks, WG-41,005, the red cloak.
- ✘ Mags, deaf, walking through the chord and standing in front of the risers (ll. 4746–4758).
- ✘ Hymn 9's actual words: *Hold us in the little light… until the morning comes* (l. 4790).
- ✘ The Cantor's palms-up gesture asking Sable for a note (l. 4782).

### Ch. 18, The Harvest-House (Sable), ll. 4851–5082
- ◐ The pamphlet sign is in the game (`grove.js:160`).
- ✘ **RELIEF STATION — REACH DISPLACED**: Oakhaven refugees on Sable's benches (ll. 4874–4892).
- ✘ The vinegar in the clerks' hall (l. 4914).
- ◐ Quist (ll. 4936–4960). "It is not a trap. It is a desk." and "You never once wrote down an alternative" are partly in the game.
- ✘ **The pressing of Ansel Hay**, Flume sluice-man: "Is it long, sir? Only they said there's food after." He looks relieved at six (ll. 4970–5006).
- ◐ Bettis Renn (ll. 5032–5082). The wrong person in the game; see section 5.
- ✘ "Now you understand why we don't."

### Ch. 19, The Tuning Room (Kaelen), ll. 5087–5276
- ◐ The returns and folder are in the game.
- ✘ Vaelen's full conversation from inside the glass (ll. 5202–5272). The game has one line if you are glassed.
- ✘ **The eight pump-men's names**, given away by Vaelen (ll. 5270–5276): Edders, Ruhl, Caine, Ott, Sennet, Vey, Marrow, Hale B. (l. 6355). Not in the game.

### Ch. 20, Voice at the Door (Lyra), ll. 5281–5476
- ◐ The cloaks, with the wrong names (R2).
- ◐ **The Wearer's confession in Kaelen's voice.** In the game it is a message plus a fight (`grove.js:63–71`). In canon it is not a fight:
  - IS IT TRUE held into the fog;
  - "*Lark, I can't read*";
  - it sings Hymn 9 to lure the Aegis out to a "singer";
  - Lyra with her arms across the door frame;
  - Pim's whistle with too much air in it;
  - "IT FOLLOWED US. IT'S GONE NOW", the lie she writes.

### Ch. 21, Ten Heartbeats (Vane), ll. 5481–5658
- ◐ A text card (`coda.js:14–37`).
- ✘ Bettis screaming in the hold, and Hetty sitting with her for two hours "about absolutely nothing" (ll. 5508–5510).
- ✘ "We're a bell": packing every crate in blankets against the listening horn (ll. 5528–5530).
- ✘ The canopy flight, the boarding, the willow.

### Ch. 22, What the Ledger Knows (Sable), ll. 5663–5878
- ✘ The shelf, not the gap (ll. 5684–5688).
- ✘ "Asked. Declined." (l. 5752).
- ✘ Sable giving Lyra the papers, and *I ALREADY KNOW… IN HIS VOICE* (ll. 5756–5842).
- ✔ The Aegis gives the red cloak (`data.js:1001`).

### Ch. 23, Coda (Lyra), ll. 5887–6154
- ◐ The confession is a dialogue choice.
- ✘ "I breathed on your arm… you let me pick you up without telling me how heavy you were" (ll. 5972–5988).
- ◐ **The lamps** (ll. 6022–6126). The game's choir and tomb puzzle replace these:
  - "Bait doesn't sing";
  - the father's funeral office ("He was afraid of ladders and nothing else");
  - eight bars of harmony;
  - "You can't do the close on your own";
  - "I know it's a two-voice part";
  - one strike;
  - the burst ending in Tobin getting *louder*.
- ✘ "Say something." / "No." / "You want somebody to sit here. I can do that one." (ll. 6142–6148). Her hand finds his and does not forgive him.

### Ch. 24, Heartglass (Kaelen), ll. 6159–6371
- ✘ The tideline column *1 · 2½ · 3 · 4 · 4½* (l. 6182).
- ◐ The herald; Lyra's answer.
- ✘ **"I'm taking it"**: Kaelen lights up at the offer of grace (ll. 6228–6246).
- ✘ Vane's "bad trade" (ll. 6250–6254).
- ◐ Sable: "a succession". It is in the game as one line.
- ✘ "You don't get to pay. You get to help… Work." (ll. 6310–6318). It is paraphrased in one sentence.
- ✘ Vane's hand flat on the third crate (l. 6340).
- ◐ The beam with ten names and *Not yet*.

### Echo I, The Thread Where She Answered, ll. 6376–6505
- ✘ Only R6's "Echo card" is planned.

---

## 3. Proposals, ranked

### 3.0 The ranking

Ranked by entertainment value first, then fidelity, then cost.
- **Fun** and **fidelity** are my judgement, 1–5.
- **Effort:** S is a day or two of text and flags in an existing module; M is a new event flow or module; L is a new or reworked map plus a scripted sequence.
- **Replaces** means the fetch or text step it would take the place of, so the Part gets richer rather than only longer.

| # | Idea | Kind | Part | Fun | Fid. | Effort | Replaces |
|---|---|---|---|---|---|---|---|
| 1 | The Greening, walked | set-piece / main beat | Two | 5 | 5 | L | the empty 300 s escape run |
| 2 | Grab the Line, played | set-piece / main beat | Two | 5 | 5 | M–L | the end-card paragraph |
| 3 | The Rite: procession → needle → SING IT DOWN → the pumps | set-piece / main beat | Two | 5 | 5 | L | "take the shaft" plus one event |
| 4 | The water-meadow | set-piece / main beat | One | 5 | 5 | L | Pim's topic line and Tam's end-card line |
| 5 | Hearthday at the Boar & Dulcimer | set-piece | One | 5 | 5 | M | Hetty's "not since Davin" |
| 6 | Voice at the Door | set-piece (replaces a fight) | Three | 5 | 5 | M | the porch Wearer fight |
| 7 | The forty-one nights | arc + choice + Echo | One → Four | 5 | 5 | M | (Lyra's unbuilt companion quest) |
| 8 | Ash in the Hold | interlude | Two→Three | 4 | 5 | M | the `startPart3` text card |
| 9 | The Wearer at the ring of lamps | finale (alternative) | Four | 5 | 5 | M | the tomb-puzzle choir (keep it for the Requiem) |
| 10 | Tamsin Reed, done properly, and "Tell Mam" | quest chain | One → Three | 4 | 5 | S–M | the generic Depot fight |
| 11 | Manifest: "Read you three" and "filed" | scene | Three | 4 | 5 | S | (nothing; it is new and tiny) |
| 12 | The slate and the bells (the Legionnaire audit) | system + main beat | One/Two | 4 | 5 | M | — |
| 13 | The Church comes up the road | scene | One | 4 | 5 | S–M | Ignatius just appearing |
| 14 | Cargo night: Stall the Clerk, the boot, the long gun | set-piece + choice | One | 4 | 5 | M | Vane's one-line turn |
| 15 | The Malting's front door and the Reach-displaced queue | scene + choice | Three | 4 | 5 | M | — |
| 16 | The gate and the step: Aldric's arc | arc | One→Two | 4 | 5 | M | Aldric's null quest |
| 17 | Orla's harvest home: learn it, sing her down | arc + song | One→Two | 5 | 5 | M | the boots-only errand's ending |
| 18 | Tobiah's arc | arc | One→Four | 4 | 5 | S–M | the one-shot chart hand-off |
| 19 | The eight men at the pumps | small quest | Two→Four | 3 | 5 | S | — |
| 20 | The cutter chase on deck | set-piece | Four | 4 | 4 | M–L | the `startPart4` text card |
| 21 | The herald and the temptation, with Echoes | choice + Echo | Four | 4 | 5 | S–M | — |
| 22 | The Grafters' Rootday round | set-piece | One | 4 | 5 | M | (sits on R5's Hollow) |
| 23 | Prologue: The Cracked Bell, as an extra | extra | — | 4 | 5 | M | — |
| 24 | Echo I, played | extra / Echo | after Book One | 4 | 5 | M | R6's Echo card |
| 25 | Twenty small canon touches | world | all | 3 | 5 | S each | — |

**If you can only afford three:**
- **#3 and #1 together** make the Part Two climax a sung, peopled sequence instead of a fight plus a timer.
- **#5** gives Part One the horror moment it is missing.
- **#11** costs nothing and makes people cry.

### 3.1 A prerequisite: let the nine days happen while you are there

Several Part One set-pieces (#5, #4, #13, #14) need canon's calendar to run **after** the player arrives. Today day 0 already contains Hearthday's tavern death and Massday's culvert lure (see section 5, item 12).

**Proposal.** Day 0 stays Nullday, the night of the Madder birth (canon Day 1). The canon days become **scheduled set-pieces**. This builds on R6 "Let the nine days count" and keeps its rule: missing an event changes lines, never fails a quest.

| Game day | Canon | Set-piece | If you are elsewhere |
|---|---|---|---|
| 0 Nullday, dusk | ch. 1 | the Madder birth (R6), the Listening Hour (R3), "Lyra-lark" at the Weavers' Cross | Bettany tells it at her stall next day |
| 1 Rootday, morning | ch. 2–3 | the Grafters' round (#22). The Greenhall summons (#16). | Nell's and Rooke's lines change. Pim passes or not according to `pim_safe`. |
| 2 Hearthday, evening | ch. 4 | **the Boar & Dulcimer** (#5) | Davin dies off-stage. Rooke's boots errand starts the next morning, as now. |
| 2–3, middle watch | ch. 5 | Depot Three (#10). The coil fetch can happen any night, as today. | — |
| 3 Massday, dusk | ch. 6 | **the water-meadow** (#4) | Pim comes back on his own *[PROPOSED]*. Tam is still lost. One line from Nell. |
| 5 Dawnday, sunrise | ch. 7 | **the Church comes** (#13). The Pure Note begins (the R6 drone). Lyra goes into custody. | You hear it from wherever you are. The warrant is pasted on the well-house. |
| 6 Driftday | ch. 7–8 | the signing; **Cargo night** (#14) | Vane's turn happens anyway and is told by Hetty |
| 7–9 | ch. 9 | custody visits; Rooke's palm (#3a) | — |
| 10 Hearthday | ch. 9–12 | **the Rite → the Greening → the rope** (#3, #1, #2), started by taking the shaft, as now | — |

**What the code already supports:**
- `calendar11.js` has the canon calendar and market days.
- `festivals12.js` already schedules day-numbered events, and its Last Sheaf festival day 2 is the same Hearthday.
- `synod15.js` runs sermons on weekdays.
- The Rite is already started by the player rather than by the clock (`game.js:209`). R1's point-of-no-return warning should list which of these the player has missed.

**Cost:** M, mostly flags and lines. A few existing lines need conditions: Hetty's greeting, Pim's Hedge topic, Nell's "inspection is the day after tomorrow".

### 3.2 Main-story beats and playable set-pieces

---

#### #1 The Greening, walked (ch. 11, ll. 3396–3578)

**What the player does.** You come up the service ladder behind Kaelen and Lyra into the green quarry. Instead of a lone dash to the mast, there are four movements, each a few minutes:

1. **The corridor** (ll. 3432–3448).
   - Lyra sings the falling fifth at full voice. A visible eight-foot circle of slumped grass moves with her.
   - The green closes three feet behind the last person.
   - Your job is the line: get people out of doorways into it (Hetty, Bettany and the dye-works women do the same), and keep hounds off its tail.
   - The pieces from l. 3416–3428 are passed or helped: the baker's wife saying *I punched it down*, the carter rooted to the cobbles.
   - A **Cantor** calling can take the singing over when Lyra breaks off *[PROPOSED]*.
2. **The square.** Rooke, in shirtsleeves with blood on both hands, can't cross Orla's floor and gives up the long drops (ll. 3452–3460). Choose:
   - **(a)** go with Lyra to Orla;
   - **(b)** stay and hold the square line with Rooke.
3. **Orla's tree** (ll. 3462–3492).
   - "You're late, lovey." Three drops on the tongue.
   - **Hold the Pitch** on *The Last Sheaf*, all the lines. The fourth line has the narrowest band in the game.
   - Lyra sings, but if you learned the song from Orla (#17), you can sing the second voice with her.
   - Hounds come through the missing roof at the end.
4. **The North Gate** (ll. 3508–3570).
   - A shrinking lozenge of mud, four hundred people, and axes the thorn outgrows.
   - Then **the Hedge speaks**, using the voices *this run's* Wearer has learned:
     - Tobin;
     - Tam (if he died in the meadow, #4);
     - Lyra whole;
     - Davin's harvest home;
     - and your own name in your voice, if you ever answered (`hedge_answered`).
   - Lyra screams DON'T ANSWER IT from the mounting-block. You can stand beside her, or shout it yourself (loud, so the hounds come, so Kaelen has to fight).
   - **Ada Pellow** says "Tobin Ashgrove, is that you?" and the Hedge says "Hello, Ada". She always goes; that is canon.
   - *[PROPOSED]* If you did neither of the shouting jobs, one more named townsperson you spoke to also answers. The canon number stays the minimum.
   - Then the Chapel falls, **the Pure Note stops** (all audio drops out for two beats), and the *Kestrel* comes down.

**Where:** greened Oakhaven (`buildOakhaven(true)`), with new set dressing.
**Part:** end of Two. **Effort:** L.

**Why it is fun.**
- It is the game's most cinematic sequence, and it is made of the player's own history: the people you helped are in your line, and the voices you gave the Hedge are what it uses against the town.
- It turns the Narrow's rule inside out. Full voice is the only way through, and it is exactly what brings the hounds.

**Reuses:**
- `G.escapeTimer`, now driving the green's advance;
- the hound spawns already in the greened map;
- `REEDS.holdPitch` for the song;
- festivals12's Sheaf song;
- the NPC list from the un-greened map, to choose who appears in the line;
- R3's Narrow and hush-lamp code (the circle works like a moving lamp that also holds back growth).

**Notes.**
- Fixes the end card's flat "Lyra sang Orla Hale down" (`game.js:1622`).
- Orla must still be alive here, so keep her death in the Greening (canon).
- Keep children out of harm, per the Bible's rule.

---

#### #2 Grab the Line, played (ch. 12, ll. 3594–3810)

**What the player does.** Two versions, chosen by when you reach the mast:
- **On deck (you arrive early).**
  1. You start on the *Kestrel* as Mags axes the mooring cable (a cut-scene beat).
  2. You work the winch drum with her. A rhythm task: four up, knot at four feet.
  3. Vane's count is on screen: *4. 8. 11. 13. 15.* You are working against the ship settling and the oaks rising.
  4. **At eighteen** a hound drops out of a crown onto the line. You fight it on the rope and rail, with glass shot or the glass arm. If you're slow, the old man's hands stay on the knot (canon; that happens whatever you do). If you're fast, you save the two women above him.
  5. Lyra comes up with nothing in her throat.
  6. The last load, then **the count, one to ten** (ll. 3730–3774). Aldric looks up and waves the cart on past a hole in the road. Kaelen says "Do it." Vane cuts.
  7. Your only input during the ten is where to look.
- **On the last rope (you arrive late, under about 60 s left on the escape timer).** *[PROPOSED]*
  - You are in the mud with the Governor, loading.
  - He puts you on the last load, then pushes you up past himself with one hand on your shoulder (l. 3712).
  - You climb while the count runs above you. The cut happens below your boots.
  - The game's existing death "The oaks close over" (`game.js:1575`) becomes rarer and earned.
  - This is the same canon outcome, seen from where it hurts most.

**The Echo** (GDD 4.9). Holding the rail and refusing to let go of the drum at "ten" plays a desaturated ten seconds:
- the drum tears out;
- the *Kestrel* goes into the crown;
- the Tide-Weaver says "I have watched you choose this four hundred and eleven times";
- you are back at nine.

**Where:** the mast and `p16k_kestrel_deck` (kestrel16 already builds the deck).
**Part:** end of Two. **Effort:** M–L.

**Why it is fun.**
- The count is the book's best device, and it costs nothing to stage.
- It is the only scene where the player is the arithmetic.

**Reuses:**
- kestrel16's deck map;
- hound AI;
- `G.escapeTimer` for the late branch;
- the Echo framing from the GDD.

**Notes.**
- Afterwards the six feet of cut rope hangs from the drum on the deck map until Part Four (l. 3810, l. 5652). Today the mast message speaks of rope coiled on the deck (`game.js:1555`).
- Watch the canon problem in section 5, item 22: who is on the last load.

---

#### #3 The Rite: procession → needle → SING IT DOWN → the pumps (ch. 9–10)

Replaces "take the shaft, seat the coil, kill two golems". Five beats, each short:

- **(a) Custody** (days 7–9, ll. 2834–2906).
  - Lyra's house has two Legionnaires at the door and two sisters inside. The Consortium pass opens the door, as Kaelen's green disc does in canon.
  - Visits are **slate conversations**. You can't speak near the bells (#12). The sisters interrupt with "You are very fortunate" on a timer.
  - Lyra writes the palm message for Rooke: *ORLA HALE — THE LONG DROPS*. Deliver it by taking Rooke's hands in his surgery (an unspoken exchange: a thumb and a nod).
  - This feeds #1. Rooke gives Lyra the drops on the day only if he got the message *[PROPOSED; canon has the palm message and the bottle both]*.
- **(b) The procession** (ll. 2922–2938).
  - Walk with the column down Cooper's Row to the quarry under the Pure Note.
  - The town hums the Root note "too quietly to punish". It is audibly built from the people you helped. Each NPC you've completed a quest for joins the hum as you pass: Bettany, Hetty, Nell, Hob, Ada Pellow, the Tarrows' neighbour Wenna Marl, Lissa with her mouth shut.
  - Flambeaux look for the source and can't find one.
  - *[PROPOSED]* You may hum too, under a noise threshold. Too loud and a Flambeau's glass-fire turns toward you. This is the Narrow in reverse.
  - The GDD planned exactly this.
- **(c) The needle** (ll. 3062–3110).
  - Kaelen kneels, and his hands are shaking. **Steady Hands**, the GDD minigame. You keep the Inquisitor's eyeline blocked by where you stand while Kaelen threads the fold of skin. A sightline puzzle using the existing NPC facing.
  - "Speak, daughter." Lyra's **"I. Am. Fortunate."**, flattened onto one tone, is the most chilling line in the book. Give it a voice-line.
- **(d) The Hold and the coil.**
  - Lyra sings 174. The **Question gauge** (GDD 4.4) rises as the Root's lullaby stops and it *listens*.
  - You seat the coil (today's interaction). The golems come (today's fight). The lock throws.
  - "LYRA! SING IT DOWN!": if the Question gauge is near full, a short **Hold the Pitch** on the falling fifth with Lyra, while golems are on you.
  - Fail state: soft. Kaelen drinks a golem's boiler, the tideline climbs more, and the beam column shows it.
- **(e) The speaking-tube and the pumps** (ll. 3272–3316).
  - The tube shrieks: "Da." / "…Kaelen." Aldric counts down **sixty real seconds**, in canon words ("Forty-one. Forty.").
  - Twelve Hollows are pumping and the cage holds eight. Take them off the handles one at a time by the wrist (Lyra does it in canon; you can too).
  - The cage takes a fixed number. **Your choice is the timer.** Every man you unhook costs seconds you need for the service ladder.
  - Canon is four saved and eight left. *[PROPOSED]* You can save up to six. Fewer pump-men left raises #19's ledger value and changes Kaelen's beam line.

**Part:** climax of Two. **Effort:** L in total. (a) and (b) are M; (c)–(e) are M on top of today's casing room.

**Why it is fun.**
- Today's climax is a golem fight. This one is a ritual you are complicit in, a deception under a watching eye, and a rescue against your own escape clock.

**Reuses:**
- `startBoreFight`;
- the casing room;
- REEDS Hold the Pitch;
- `showEvent`;
- the crime and witness code, for the Flambeaux;
- NPC facing (`e.facing`) for the sightline.

---

#### #4 The water-meadow (ch. 6, ll. 2029–2229)

**What the player does.** Massday at dusk:
1. Nell is at the blue door with a lamp: "He went for water… He said he heard you."
2. Run to the Flume crossing. Tam is on his stool. The grate is pushed aside.
3. Lyra crawls into the culvert, and you can follow her through, outside the Hedge at the Listening Hour.
4. In the meadow, Pim walks toward the tree-line holding his hands out stiff. At the trees stands **Tobin's shape, singing Lyra's old voice**: "Come on, love. Let me sing to your hands."
5. Lyra whistles the falling fifth. **The whistle duel** (a GDD set-piece): a two-note Hold the Pitch exchange. The Wearer's answer starts a sixth too wide and narrows each round. You *watch it learn*. Its whistle line can be drawn on the pitch graph.
6. Then it sings the calling-song. Lyra answers at full voice, torn.
7. Your job:
   - keep Pim's path clear;
   - if you have a bronze weapon, glass or shot, hold back the first hounds from the tree-line;
   - run Pim back once he chooses the torn voice.
8. **Tam's walk.** Tam comes out of the culvert singing *The Miller's Daughter* at full voice and walks away along the Hedge. The jitter swerves to him.
   - You can't save him. You can *see* it: the high note, and the missing.
9. Afterwards:
   - his stool and the finished basket;
   - the dye-works woman takes his stool and hums;
   - at the dead hour, four voices from the Hedge;
   - the whistle, now exactly right.

**The game's existing Tam choices, rewired to canon** (`data.js:466–479`):
- `tam_left`: you told him "if she gets the second verse right, who am I to say". That is why he stopped humming and didn't see Pim go (canon l. 2059: "I was listening. I'd stopped.").
- `tam_told`: he wasn't listening. He went down to the culvert early because he heard Pim, and is the first one there.
- In both, he walks out singing (canon).
- His end-card line moves from the Greening to here.

**Part:** One. **Effort:** L: a meadow map just outside the culvert (the Under-hedge and culvert exist) and scripted Wearer behaviour.

**Why it is fun.**
- It is the scariest scene in the book.
- The mimic rule ("a trick works on a mimic once") becomes something you witness rather than read.
- The whistle becomes a tool from here on (#25k).

**Notes.**
- The Wearer can't be fought here. Hounds can.
- Pim is never harmed on screen (the Bible's rule).

---

#### #5 Hearthday at the Boar & Dulcimer (ch. 4, ll. 1367–1687)

**What the player does.** Hearthday evening in the Boar:
- Vane is in the corner; Kaelen and Lyra come in to buy berths (overhear, or join them at the table).
- Davin Hale has been drinking since noon by the hearth. He stands, and the room stops. Mouths close, hands go flat on the felt.
- He sings *The Last Sheaf* above the Narrow.
- **Vane's count appears, one to ten.** The oaks ring at six and the birds stop.

**Your options during the count:**
1. **Get the children and the dye-works women behind the bar.** Lyra's canon job; you can do it with her or for her.
2. **Try to stop Davin.** Hetty tries and is pushed into a table. A Personality or Strength check can *delay* the line, never stop it. The Hedge has already heard.
3. **Get between the door and the room.**

**At eight** the song comes back from outside, a quarter-tone flat. Then hounds come through the gaps, not the door.

**The fight.**
- *Last Rites* and *Second Opinion* go off.
- Kaelen tears the felt sleeve off with his teeth.
- The hounds go for the loudest sound.
- The **choice that matters**: when two hounds turn toward a child whimpering behind the bar, you can **make yourself the loudest thing**: shout, laugh, fire, or ring a bronze weapon on the hearth. Or Vane does it, deliberately (l. 1602).
- Whoever does it carries the consequence:
  - Vane's later line "You drew them off the children" / "You did it on purpose" is said *to you*;
  - companion approval;
  - Vane's trust in Part Four (`vane_stays`).

**Aftermath** (ll. 1612–1631):
- Davin's boots side by side, still laced;
- a dead patch of hearth (R3's "where a hound bursts, nothing carries" rule);
- a Synod clerk's ledger you can read upside down: *Dissonant: self-inflicted*;
- Hetty wiping the rules board and chalking the same four rules again, her hand perfectly steady.

The boots errand then begins the next morning: Hetty brings them to the Cantor (l. 1947) and Rooke gives them to you.

**Part:** One. **Effort:** M. The Boar map, the hound spawns and the noise system all exist.
**Why it is fun:** a ten-second horror set-piece in the "safe" tavern. It teaches the whole game's rule in one room.
**Pairs with:** R2's fix to the Boar's rules. Davin's song is the reason for NO SINGING.

---

#### #6 Voice at the Door (ch. 20, ll. 5281–5476)

**What the player does.**
- In canon, Lyra is left at the Cloister as the fallback during the Malting raid. Here you can be left with her, or take the raid; the other half of the scene is told.
- If you stay:
  1. Take the cloaks off the pegs and read the name-tapes (R2 corrects them to canon's names).
  2. "Lark." from the porch.
  3. **An endurance scene, not a fight.** The voice cycles through:
     - Tobin;
     - Tam's "your friend in the hat";
     - Kaelen's confession (the calibration, line ninety-four, the ninth morning, the three seconds);
     - this run's learned voices, including yours if you answered anywhere.
  4. Choices:
     - **hold up Lyra's slate** (IS IT TRUE) and get "*Lark, I can't read*";
     - **answer** (it learns you; hounds; −);
     - **stay silent**.
  5. Then it sings **Hymn 9** in Lyra's whole voice. The Aegis turns toward the "singer" in the fog. **You have to physically hold the doorway**, standing in it as Lyra does in canon, while the Aegis tries to resolve DEFEND THE SINGERS with a singer behind you. Its lilac light flicks between you and the fog.
  6. It plays Pim's whistle with too much air in it.
  7. Survive the seven repetitions without speaking.
- When the raid comes back up the road, Lyra writes *IT FOLLOWED US. IT'S GONE NOW* to Kaelen. **You may contradict her** *[PROPOSED]*: "It told her everything." That flags the confession early and shortens Part Four's dialogue route. Or keep her lie.

**Part:** Three. **Effort:** M.
**Why it is fun:** the game's mimic rule as pure tension, with a nine-foot machine you can't overpower as the second clock.

**Fixes** a canon break: the Wearer is not fought at the porch (`grove.js:63–71`, `wearer_porch`). Keep its kill for #9.
**Reuses:** the Cloister map, the Aegis entity in passive state, the cloaks deco, `wgTrigger1`.

---

#### #9 The Wearer at the ring of lamps (ch. 23, ll. 6010–6126)

**What the player does.** At the Deep Woods camp, after the confession (`kaelen_told_now`), Lyra's voice comes back, and she says "And I'm going to kill it tonight."
1. **Plan at the bow.** Set a ring of hush-lamps at the edge of the clearing, using R3's temporary lamps.
2. She walks out past the last lamp and sings her father's funeral office: five parts and a coda, full voice ("He was afraid of ladders and nothing else").
3. You wait inside the ring. You get **one strike**, and only when it is *inside* the lamps:
   - too early, and it leaves ("comes back in a week": restart the night);
   - too late, and it has Lyra.
4. The Wearer circles, using voices to lure *you* out too. For eight bars it sings the harmony with her.
5. Then "Come out of the lamps, lark… it's a two-voice part" / "I know it's a two-voice part". She sings the close alone.
6. You strike. Kaelen and the Aegis strike from the other side.
7. The burst replays this run's collected voices, ending on Tobin getting *louder*.
8. Afterwards she sits in the moss. If you speak, she says "Say something". Your options include **"No."** (canon: "You want somebody to sit here.").

**Keep the Mausoleum choir and its tomb puzzle for the Requiem.** That is the branch where the Wearer is already dead (`coda.js:245`).

**Part:** Four. **Effort:** M (new trigger flow on the Deep Woods map, lamp ring).
**Fixes:** section 5, item 8.
**Reuses:** `codaShield`, the 45-second coda timer, CODA_VOICES, lamp decos, R3 lamps.

---

#### #13 The Church comes up the road (ch. 7, ll. 2259–2373)

**What the player does.**
- At sunrise on Dawnday you stand in the North Gate gatehouse with Harrow and half the north side, hands over mouths.
- Thirty voices pass one note down the line. Hounds pace the tree-line and flinch from glass-fire.
- In the square, the herald reads the warrant aloud: the Pure Note held without end, the Hollow given to the Pure Flame at the hour of the Rite, the Cantor taken into the Church's protection. Two Legionnaires cross the square to Lyra.
- Afterwards Ignatius stops by Kaelen at the well-house, and you overhear "It let go because they held". For a glassed player, he says it *to you*: "Do you know what the Church calls men like you?"

**Part:** One. **Effort:** S–M.
**Reuses:** `cinematic24`'s column, the synod15 deacon and choir sprites, and the R6 Pure Note drone, which starts here instead of at `rite_ready`.
**Consequences:**
- It sets `rite_ready` on the canon day rather than only on the coil.
- Lyra moves to custody (#3a).
- Ignatius's topic line can drop "the Hollow in the quarry" (section 5, item 10).

---

#### #14 Cargo night (ch. 8, ll. 2572–2818)

**What the player does.** On Driftday, help Mags get Nell and Pim up the mast-ladder in broad daylight ("Nobody looks up"). That night:
- **Stall the Clerk** (a GDD minigame). Talk to the paymaster's clerk on deck while Mags hides the Carders in the sail-locker.
  - The talk is a dialogue juggle: the wind, an invented Cantabile tariff dispute, the price of drift-glass.
  - A child's boot is left by the third crate. Put your boot over it.
  - The clerk counts twelve crates while they murmur: "They do carry on, don't they." "My first posting was the harvest-house at Whisper-Grove." A seed for Part Three.
- At the dead hour, find **Pim with his ear to the third crate talking to Annet**: "she's in a box… nobody's said anything to her for a long time".
- Vane opens the crate. Read the WG tags with him. Vane goes silent.
- The ballast choice (#E5): Pennick's figures go 6, then 18, and you decide what goes over the side.
- Carry the long gun to the slag-pit in the dark. This feeds R6's "Vane's long gun in the quarry mud".
- "Annet. You're going home." Vane can let *you* say it.

**This replaces Hetty's-cellar crates** (section 5, item 1). Hetty's quest becomes "Something talks in the corsair's hold; I heard it from the mast-ladder when I took up his supper" *[PROPOSED]*.

**Part:** One. **Effort:** M (kestrel16's deck and hold maps exist, moored at the Oakhaven mast).

---

#### #15 The Malting's front door and the Reach-displaced queue (ch. 18, ll. 4874–5082)

**What the player does.**
- Under Sable's tarred-canvas shelter sit **forty people in Reach clothes with Greening mud to the ankle**. *[PROPOSED]* They include named Oakhaven townsfolk you met and did *not* get onto the rope: the generic orchardmen and goodwives get names, plus anyone you failed in #1.
- The board says RELIEF STATION — REACH DISPLACED.
- Sable walks in the front door to hold the clerks' hall. You choose your half:
  - **(a)** go in with her, and witness Quist's desk offer and the pressing of **Ansel Hay**, Flume sluice-man ("Is it long, sir? Only they said there's food after"), at eight seconds of 741;
  - **(b)** take the press at the kiln end;
  - **(c)** work the queue.
- **The queue choice.** Walk the line telling people what is in the first room. Each one you persuade walks off into the orchard.
  - Too many leave and the clerks notice, which raises the alarm early: crime and witness code.
  - The relief station is the queue Sable designed (her nine seconds). Breaking it is the most personal sabotage in the game.

**Part:** Three. **Effort:** M.
**Why it is fun:** the player meets Oakhaven again, four days later, being registered. It is the cost of Part Two made visible.

---

#### #8 Ash in the Hold: a playable night between Parts Two and Three (ch. 13, ll. 3826–4063)

**What the player does.** After the rope, instead of the `startPart3` text card, play one night aboard. These are the deck and hold maps of kestrel16, moving, at night.

- **The field hospital.**
  - Bettany has the wounded under a staysail: a crushed foot, a broken collarbone, four people with rope-flayed hands, and Lissa, who has not spoken.
  - You can bring water, use tonics, or hum the tending note if you are a Cantor.
  - Hetty counts the children twice an hour. Talk to her and she counts aloud.
- **Lyra at the stern** in Vane's coat. If you bring her the slate, she writes *YOU SAID DO IT* and turns to the dark. Nothing you can say helps. That is the beat.
- **Vane's confession** in the hold, if `vane_told` (the game already gates a line on it): "Thirteen hundred."
- **The fourth hour.** Pennick screams.
  - **Hob's roots are in the deck seams** (ll. 3914–3964): "I'm sorry about your ship, Captain."
  - Choice: give the long drops (Rooke's bottle has three doses, if it came through #1 or #3a). With Lyra voiceless, **Bettany hums the tending note**, "badly, in the Narrow, for as long as it took".
  - Then you help cut him out with a chisel and hand-saw. Four planks and five feet of beam go over the side.
  - Then a search: crawl the deck with a lamp checking seams for green before dawn (Pennick's task). Miss one, and a sprout appears in the hold on the Part Three deck map *[PROPOSED; cosmetic]*.
- **At first light**, Tobiah (#18): "I saw what you put in the port."
  - If *you* seated the coil, as the game makes you do, this is an accusation aimed at you.
  - Truth or silence decides whether he hands over the margin copy. He already gave charts in the quarry, so the margin copy becomes a separate item, "the fair copy of Revision Seven" *[PROPOSED split]*.
- **Out of the canopy**, from four miles back, the calling-song in Lyra's whole voice follows the ship. Everyone on deck changes face; Mags reaches for the axe.
- **Kaelen's beam.** He writes nine names and *3½* by lantern. You can add yours from the ledger (R6 "names on the Kestrel's deck-beam" is the item; this is its first scene).
- From the rail, the dirty orange **firebreak ring** in the square: the Church burning the green to save the people it came to burn.

**Part:** the passage from Two to Three. **Effort:** M.
**Fixes:** Hob's survival (section 5, item 5). Hob dies here, and kestrel16's Hob crew role passes to another survivor, for example Coll Madder (who must live into Book Two, Bible l. 473) *[PROPOSED]*.
**Why it is fun:** the camera stays for the aftermath (Dread Doctrine). A quiet, horrible night after the loudest set-piece in the game is exactly the book's rhythm.

---

#### #12 The slate and the bells: the Legionnaire audit (ch. 5 l. 1751; ch. 7 ll. 2405, 2419; ch. 20 epigraph l. 5284)

**The canon rules:**
- Legionnaire cores keep everything they see and hear.
- Factor Vosk walks her line every morning with her lenses and "can hear it all back like reading a ledger".
- Lyra and Kaelen plan on a slate: THEN WE WHISPER, AND WE WRITE.
- The Null-Watch Press: "do your weeping on paper".

**The mechanic** *[PROPOSED]*:
- Some dialogue choices are **"say"** or **"write on the slate"**.
- Any "say" within earshot of a Legionnaire bell, or of a passive one standing guard, is logged.
- Next morning at dawn **Vosk walks the terraces** (a scheduled event).
- Anything logged comes back as consequences:
  - she mentions it (the slag-pit, Depot Three, the coil);
  - prices at her store change;
  - Depot Three gets a second guard;
  - on Hearthday she watches the collar walk more closely, which makes #3c's sightline puzzle harder.
- Nothing ever fails the main quest.

**Where it applies:** Lyra's custody (#3a), Kaelen's plan, Tobiah's cabin, the Kestrel at the mast (#14).
**Effort:** M. **Reuses:** the dialogue choice format, the crime and witness system, passive Legionnaires (`maps.js:408–409`).
**Why it is fun:** it makes the Synod's surveillance a felt rule, not lore, and gives the slate (the novel's other voice) a mechanical job.

---

#### #20 The cutter chase on deck (ch. 21, ll. 5492–5658)

**What the player does.**
- **Loading in eleven minutes** under smoke: water, canvas and chain over the side; the Aegis climbing the ladder one-handed with the red cloak.
- **"We're a bell."** The cutter's listening-horn hunts the hold's murmur. **Pack the crates**: carry blankets, coats and sail-locker spares into the hold and stuff them round each crate. A short noise-meter race: the horn's dial on screen drops as you pack.
- Bettis screaming in the hold, with Hetty holding her hand (if Bettis is awake, #E11).
- **The boarding.** Four proctors come down the grapnel. Fight on a deck in the willow-tops, with branches raking. The Aegis throws them; Mags meets one with a belaying pin.
- Vane's "Don't cut it!" and the willow-crown through the cutter's bow.
- **Jory Quill**: two seconds, lamps out, "*which way is east*", two scorched footprints (already a deco in the camp, `coda.js:152`).
- The holed tank. Brace.

**Part:** opening of Four. **Effort:** M–L. Today's choice event ("Say nothing. Let him count." / "Cut it, Vane.") can stay as the beat when the grapnel bites.
**Fixes:** "the cutter's hold murmurs in 432 voices" (section 5, item 4). It is *your* hold the horn hears.

---

#### #22 The Grafters' Rootday round (ch. 3, ll. 939–1081)

This builds on R5's Hollow and R6's nine days and Lissa. Their pieces are the place and Lissa. This is the scripted round that would happen there.

**What the player does.** At the second hour of Rootday the felted white wagon comes, and you walk the Hollow with Rooke as "somebody has to hold their heads".
- **Hob's toes.** Three mute-drops, a quarter hour, the hush-saw, the sap-iron.
  - You hold his head. As a Cantor you can breathe the Root note soundlessly into his hair; otherwise you can only hold on.
  - A quiet, controlled scene: one input, "hold".
- **Pim.** The outcome follows today's `pim_safe` and `pim_tended`: "Early… And receding, I'd have said. If I didn't know better… Unusual." Or a recheck date.
- **Orla in her chair.** "I'm afraid I've put down roots." Rooke's ear-trumpet; the rustle like barley; green chalk.
  - Orla asks *you*, or Lyra, to promise to sing her down (this starts #17).
- **In the lane**, Rooke explains the sap-mark list (canon: "My saws leave people alive. At least there's that.").
- **Lissa** on the step with her tin cup.

**Part:** One. **Effort:** M on top of R5's map.
**Why it is fun:** it is the book's tenderest horror, and it makes Pim's honey quest, which exists, pay off in a scene rather than in a coin.

### 3.3 Side quests drawn straight from the novel

#### #10 Tamsin Reed: Depot Three properly, and "Tell Mam" (ch. 5 ll. 1839–1919; ch. 7 l. 2435; Bible l. 549)

**Part 1, in Depot Three.**
- The reed-grille Legionnaire follows you down from the headframe. Its bell murmurs *"—the blue jug, Mam. Not the white—"*. This is *only her* line; every other bell gets its own (section 5, item 11).
- Choose:
  - **fight**, which is loud and draws the terraces;
  - **drink the bell** (glassed calling only): lay the glass hand on the bronze, swallow the alarm note, then break the core through the grille. Tamsin says her name three times;
  - **read her name** (archivist, the "Read the Name" song): she stops, and you still have to break her.
- **The body.** Drag her to the slag-pit using the existing BODIES system, or leave her.
  - The pit means Vosk asks "Did you see anything?" (canon: "It was very dark.").
  - Leaving her means Depot Three is guarded from then on and Vosk's prices go up (#12).
- **At dawn**, outside Kaelen's hut, his voice from the clearing says "*Tamsin Reed.*" a breath after you or he said it. If you are glassed: in *your* voice.

**Part 2, in Whisper-Grove** (canon-planned: the Bible's audit says "Sable finds her in the Ledger, Part Three").
- Give Sable the cracked lilac core. She finds the entry: *[PROPOSED]* a WG number, Tamsin Reed, nineteen, a dairymaid of the Bell Yard, "asked whether her mother would be told".
- Then the Reed house in the Bell Yard (R5 #4's map), where a Hollow woman is setting **a blue jug and a white one** on a sill, over and over *[PROPOSED]*.
- Choice: set the white one aside (a small gesture, the loop changes), or leave it.
- Either way, the core goes into the Ledger with a name and a mother, not a tag.

**Effort:** S (Part 1) plus S–M (Part 2).
**Why it is fun:** the game's first Legionnaire becomes the person the whole game's horror is built on, and the payoff lands two Parts later.

#### #11 Manifest: "Read you three" and "filed" (ch. 16, ll. 4538–4638)

**What the player does.** At the start of Part Three, aboard (kestrel16's hold):
- Sable climbs the ladder with her broken nose and asks for the carriage notes.
- In the hold she reads the tags from memory. The total is "One thousand three hundred and forty-two".
- **She reads Vane three people while you stand with him:**
  - Corwin Aye, whose barrel in the Moot-house cellar "has not leaked in nineteen years";
  - Mirren Salk and her husband's coat;
  - Annet.
- Then Pim asks her to tell Annet. She kneels at the third crate: **"You are not lost. You are *filed*."** / *"Is that you, Mistress Dray?"* / **"No, love. It's the clerk."**

**Effort:** S. It is a three-panel `showEvent` sequence with voice lines.
**Hooks:**
- Corwin Aye's barrel can be found in the Moot-house cellar (R5 #3, and one of the four libraries).
- *[PROPOSED]* Bringing his mark burned into a barrel-head to the third crate is a single, silent side beat.

#### #19 The eight men at the pumps (ch. 10 l. 3314, ch. 13 l. 4057, ch. 19 ll. 5270–5276, ch. 24 l. 6355)

- Kaelen's beam: "*8 men at the pumps — no names. FIND THEM.*"
- In the Malting archive, Vaelen tells him (or you, if glassed) exactly where to look: "third shelf, grey spine".
- Pull the box and tear out the carriage page. **Edders. Ruhl. Caine. Ott. Sennet. Vey. Marrow. Hale, B. (no relation)** go into the ledger and onto the beam.
- *[PROPOSED]* If you saved some in #3e, the page shows ticks beside the names that came up in the cage.
- Kaelen's line: he wrote them down "and thought about that for a long time afterward", because it was so easy to do what he was told.

**Effort:** S.
**Why:** it is the only quest whose clue-giver is the villain, and the player should feel that.

#### Other small canon quests (S each)

- **Tam's basket for the reeds** (ll. 2009, 2199).
  - Tam promises a basket "for your da's reeds" at the Flume crossing. After the meadow it is on his stool, finished, rim tied off.
  - Carry it to Lyra's house. She lays Tobin's **seven oiled wind-reed pipes** in it (R2 adds the pipes).
  - *[PROPOSED]* In Part Four the basket is at the camp, and the pipes can be played once, at the coda.
- **Oil the pipes on Memoryday** (ll. 504, 534–536).
  - The Hedge-voice asks "Did you remember to oil the reed-pipes?"
  - If you oil them (a monthly chore at Lyra's house) and then the Hedge asks you, you know what it has been listening to.
- **Mistress Pellow's milk** (l. 3544).
  - A bowl of new milk appears on Lyra's step every Driftday morning. Ask Ada Pellow why; she won't say.
  - At the North Gate (#1) it pays off.
  - It joins the existing "A Reed for Pellow" quest (sidequests.js) without contradicting it.
- **Rooke's palm** (#3a), and Rooke's long drops in #1 and #8.
- **The hide-and-seek child** (l. 1665). In the *Kestrel*'s hold at night, a little girl counting to ten inside a crate. Choose to wait for her to reach ten, or step away as Vane does. Wait, and she says "Ready or not" and nothing else *[PROPOSED]*.
- **Mirren Salk's coat** (ll. 4560, 4868). In the Malting a bin holds eleven hundred coats with numbered tickets. Find ticket *[PROPOSED]* 40,610 and lay the coat on the fourth-consignment stack in the hold. Cheap, silent and devastating.
- **The twice-taken man** (ll. 4151–4167). A Hollow in Ashlane doing nothing at all. Sable's margin entry. If you show Sable you found him, she tells you the three Veil rules, which unlocks #25p.

### 3.4 Character arcs

#### #7 Lyra: the forty-one nights (ch. 1 ll. 506–554; ch. 3 ll. 1253–1287; ch. 6 ll. 2041–2045; ch. 20 l. 5410; ch. 23; Echo I)

This is the canon spine for ROADMAP's unbuilt "Lyra's personal companion quest" (`ROADMAP.md:856`).

**Act 1: find the stone.**
- Behind the old cooperage there is a stretch of rotted wadding with no night-hummer and a flat worn stone.
- At the dead hour (the existing "dead hour" text) **you can watch Lyra sit there** with her back to the thorn: "Hello, Da." "*Boy or girl?*"
- You can't interrupt without being heard by both of them.

**Act 2: the choice** (each path carries its consequence):
- **Keep it** (canon). She goes on. Day 2 is the forty-first night; the Wearer learns the falling fifth from her. #4 plays as canon.
- **Tell Kaelen.** He comes to her door earlier and hums at the latch. She recognises the note a day sooner. *[PROPOSED]* The meadow still happens, because it already has her voice, but the Wearer has fewer of the boy's lines. One fewer voice in its burst in #9.
- **Sit with her, and don't answer.** You sit on the stone beside her at the dead hour. With a third person there it will not speak; "It wants you alone" (ch. 22 l. 5790). She doesn't go back.
  - This is **the thread where she didn't go out**. In the post-game Echo I (#24), the Tide-Weaver can say *"the world is never saved by the people who are fresh. Sometimes it is saved by somebody who sat down."* *[PROPOSED line]*
- **Answer it yourself.** It learns you (`hedge_answered` already exists). From then on the Hedge calls *you* in #1 and #6.

**Act 3: payoffs.**
- The meadow (#4).
- The confession scene. At the Cloister door, "you told me about Pim Carder's hands" (l. 5410) hits harder if you watched her say it.
- Her father's funeral office in #9: "I waited." / "I know."

**Effort:** M. **Reuses:** the dead-hour logic, the `hedge_*` flags, companion-talk's `l_hedge` topic (`companion-talk.js:291`), which can branch on what you saw.

#### #16 Aldric: the gate and the step (ch. 2 ll. 682–877; ch. 7 l. 2533; ch. 10 ll. 3280–3298; ch. 12 ll. 3712–3774)

**What the player does.**
- The **Greenhall summons** on Rootday. The reed-grille Legionnaire hands Harrow a letter for Kaelen ("*Requires*"). You carry it out to the hut, or follow Kaelen in.
- Witness the Factor's offer from the hall. The carved reeds are behind the banners; the Cantor's chair is gone.
- Stay after Vosk leaves. Aldric pours two brandies. "You sold them." / "I fed them." The famine names. "Da. Your hair."
- Later, alone with Aldric (his null quest gets a body):
  - he talks about the **aired room**;
  - he asks you to take something to the hut: *[PROPOSED]* a coat from that room, or the key to it.
  - Kaelen leaves it on the step of the hut, unopened, and says nothing.
  - If you tell Aldric that, he says "No. I didn't think he would."
- R5 #5, the Governor's house, is where the aired room *is*. Open it, and the bed is made, with the window aired on a day that isn't spring.
- **Payoffs:**
  - the signing (Aldric's breath of relief);
  - the speaking-tube ("Get to the cage, boy. I'm counting.");
  - the wave at the rope.
  - If you carried the coat, Kaelen is wearing it on the deck in #8 *[PROPOSED]*.

**Don't:** reconcile them. Canon never does, and Book Four may still have a Governor (`prologue17.js` header: "You'd best come and see the Governor"). Don't show Aldric's fate below the canopy.
**Effort:** M. **Reuses:** NPCS.aldric and NPCS.vosk (both null quests today), the Greenhall map.

#### #17 Orla: the harvest home (ch. 3 ll. 1005–1057; ch. 6 ll. 1955–1983; ch. 11 ll. 3462–3492)

This adds a teacher to R3's "songs learned from people", which lists Lyra, Tam, Bettany or Ilse, and Tobin's notebook. Orla is the missing one.

**What the player does.**
- **After the boots** (today's `boots_delivered`), Orla asks to be sung to and you refuse, as now. Add the canon follow-up: "Was he any good?" / "He couldn't hold the fourth line."
- Come back on later days and **she teaches you *The Last Sheaf***, one line per visit. She sings "in a voice like a rusty gate", from the chair, above the Narrow, so each lesson is a risk. Close the shutters and stuff the cracks first: a small room-prep task.
- **The fourth line** is the hard one. Davin couldn't hold it; neither could his father.
- The song becomes a learnable Song *[PROPOSED stats: calls hounds hard; in the Greening it is the only way to sing Orla down]*.
- **The Greening** (#1): with the song, you sing the second voice with Lyra and both of you hold the fourth line. Without it, Lyra holds it alone, as in canon.
- **Ties in** with festivals12's Last Sheaf festival and quest. The song she teaches is the sheaf's song.

**Effort:** M. **Reuses:** reedcraft Songs, Hold the Pitch, festivals12.

#### #18 Tobiah Marsh (ch. 5 ll. 1721–1763; ch. 9 ll. 2946–2956; ch. 10 ll. 3176–3204; ch. 13 ll. 3968–4018)

**The arc:**
- the signed book;
- the Stage Nine kit ("Do you think she knows yet, sir?");
- carrying the case at the procession ("They say it doesn't hurt very much");
- calling the pitch on the rail;
- seeing the coil go in;
- the dawn confrontation (#8);
- second engineer in Part Four (exists).

**Calling hooks** (R6 covers NPCs noticing your calling; this is Tobiah's specific line):
- A **Blade** calling: Tobiah asks *you* to sign *On the Calibration*. The book's author is Kaelen, so it is the wrong man: *[PROPOSED]* he blushes, and asks if you knew him at the Conservatory.
- An **Archivist**: he asks whether the Office really keeps everything.

**Choice at dawn.** Tell him why, or say nothing.
- **Truth:** he gives you the margin copy and asks you to keep his name off it ("My mother's in Sol-Luminary").
- **Silence:** he keeps it. *[PROPOSED]* In Part Four he still patches the tank, but the epilogue line differs.

**Effort:** S–M.

#### Smaller arcs (S each, all canon)

- **Kaelen: Line Ninety-Four.** ROADMAP's partial companion quest (`ROADMAP.md:857`) gets its canon pieces:
  - the hut wall's tideline column (ch. 2), readable on the hut map, gaining a new number after each big drink;
  - the hound's bed creeping from twenty paces to five (ch. 2 l. 618 → ch. 5 l. 1885);
  - the procurement order's line ninety-four (ch. 19 l. 5132) as a separate document from the returns;
  - the *1 · 2½ · 3 · 4 · 4½* column on the beam (ch. 24 l. 6182);
  - **Lyra breathing the Root note into the glass wrist** (ch. 3 ll. 1121–1145) as a once-per-Part mechanic: she slows a glassed player's tideline for a day. "Give. Me. Your. Wrist."
- **Vane.**
  - "Forty-eight," he tells the dark every night in the hold (l. 1685), audible if you go down at night.
  - The VESPER bottle is something he shows you once and you can't touch.
  - After Manifest, his hand flat on the third crate (l. 6340) is a resting pose on the deck map.
  - The book's laugh: if he has to laugh in #5, he can't laugh in #2. At the rope "nothing came up at all" (l. 3804).
- **Sable: the inventory.**
  - At every Part Three or Four rest with her, she recites what is left: *One. My mother's hands… Two. The scriptorium… Three. My name is—* (ll. 4129–4141).
  - The list shortens as the game's `sableFragments()` counts down.
  - The missing one is said as a pause, not a gap: "It feels like a shelf."
- **Pim.** He gets dialogue after each set-piece:
  - after the meadow: "there are two of everyone";
  - on the ship: Annet, "Will you tell her I'm still here?";
  - after the Greening: "That's the tannery lane."
  - Today his quest is `() => null` (`data.js:437`).
- **Hetty Bram.**
  - The board-rewriting after #5.
  - She organises the Greening line and counts the children on deck.
  - In #20 she holds Bettis's hand for two hours. Heirs per the Bible (l. 417), so make her matter.
- **Mags and Pennick** before Part Three.
  - Mags's hand-cant with Vane at the mast in #5 and #14. wilds.js already teaches some hand-cant.
  - Mags walking through the Aegis chord, deaf, in the Cloister (ch. 17 ll. 4746–4758): she is a companion in the room and the one you can't stop.
  - Pennick asleep on the lift-tanks with his tuning-hammer until he finds the note.
- **Ignatius.** He gets the "*I have held it*" exchange (#13) and is *watching* the needle (#3c). Don't convert him (Book Two).
- **Vosk.**
  - The morning Legion walk (#12).
  - "Interesting" when Lyra (or you, with the tending note) reaches the pump-man for one breath (l. 2992).
  - *[PROPOSED]* That word starts an Arbiterium interest in *you*, which the Part Four dispatch (wilds.js, "The Cantor is not to be harmed") can echo: "and the stranger who did it to a pump."

### 3.5 Choices with consequences

Every choice keeps canon's outcome as the default or the minimum. A choice changes **cost, who carries it, and what the Hedge knows**. It never changes whether the town falls.

| # | The choice | Where | Consequence | Effort |
|---|---|---|---|---|
| E1 | The stone behind the cooperage: keep Lyra's secret, tell Kaelen, sit with her, or answer it yourself (#7) | One | What the Wearer has learned; which voices the Hedge uses in #1 and #6; the Echo I variant | M |
| E2 | Tamsin Reed's body: the slag-pit or leave it (#10) | One | Vosk's line; Depot Three's guard; her suspicion on Hearthday | S |
| E3 | At the Boar: be the loudest thing, or let Vane (#5) | One | Who Vane credits; approval; Vane's Part Four trust line (`vane_stays`) | S |
| E4 | Tam: let him keep listening (`tam_left`), or tell him (`tam_told`) (exists; rewired, #4) | One | Whether his listening is *why* Pim got past. Tam's stool and basket. | S |
| E5 | **What goes over the side** (#14). Pennick's list, from ch. 8 ll. 2768–2772: the water, the brandy (worth more than the ship's other contents), the chain, the iron ballast, the long gun. | One | The rope count in #2. *[PROPOSED]* Each item kept is one fewer person up the rope: 19–21, with named people at the margin. Keep the long gun and you have a deck gun in #20, and Bettany and her wounded wait for a later load. | M |
| E6 | The pumps: unhook more men, or take the ladder sooner (#3e) | Two | Names on the beam; #19's ticks; how much time you have in #1 | S on top of #3 |
| E7 | In the Greening: go with Lyra to Orla, or hold the square with Rooke (#1) | Two | Orla sung by two voices or one; whether Rooke's line reaches the Gate whole | S on top of #1 |
| E8 | At the North Gate: shout DON'T ANSWER yourself, stand with Lyra, or stay silent (#1) | Two | Loud brings hounds to the crowd. Silent means one more named answerer *[PROPOSED]*. | S on top of #1 |
| E9 | Tobiah at dawn: the truth or nothing (#18) | Two→Three | The margin copy; his epilogue line | S |
| E10 | **Emory Wain, bound and silent** after the plaza (ch. 15 l. 4423): leave him bound, or read him his name and family and cut him loose | Three | *[PROPOSED]* In Part Four's "Lanterns in the Mist" (wilds.js), a hushwarden recognises you and lowers his crossbow, or Brennick knows your face. A man who got his name back for one and a half seconds decides what it is worth. | S–M |
| E11 | Bettis Renn (rebuilt to canon, section 5 item 2): put her back, or keep her awake and bring her aboard, to the stack where her husband Ivo's core lies | Three→Four | Awake: she screams through #20, Hetty sits with her, and Sable's Part Four greeting changes. Put back: "Now you understand why we don't." | S (rewrite of `grove.js:217`) |
| E12 | In the Malting queue: warn people off, or keep cover (#15) | Three | The alarm's timing; how many Reach folk walk into the orchard; Sable's line | M |
| E13 | **The herald: encourage Kaelen to take grace** (#21) | Four | An Echo: shown, then denied | S–M |

### 3.6 Echoes and extras

#### #21 The herald and the temptation (ch. 24, ll. 6188–6320)

**What the player does.**
- Today you choose whether you or Lyra answer the herald. Add the canon scene before it: twenty yards into the trees, **"I'm taking it."**
  - Lyra: "every single time, the plan is *only Kaelen goes into the dark*."
  - Vane's bad trade.
  - Sable's "succession".
- Your choice: back Kaelen, back Lyra, or say nothing.
- **Back Kaelen**, and the Tide-Weaver shows you the thread for one panel: a man lying down on a table in the Organum and the glass drawn; the Hall of Carriage taking 432 crates. "Proper disposition." Then he pulls you back. *[PROPOSED panel text; it reveals nothing beyond the writ's own terms.]*
- Then Lyra's "You don't get to pay. You get to help… Work." She takes the glass hand, "because the right one was easy".

**Effort:** S–M.

**The Echo system** is three canon "roads not taken" (GDD 4.9), each a short desaturated vignette:
- cut the mast-line (ch. 8 l. 2652);
- hold the rope (#2);
- take grace.

Recorded Echoes feed R6's "Echo memory" and the existing `G.runs` lines.

#### #23 Prologue: The Cracked Bell, as an Extra (ll. 8–223)

**What the player does.** As Solenne, on the top riser, ten minutes:
- **Hold the note** at 528 while the censer's creak pulses you off pitch. This is REEDS Hold the Pitch, and the GDD planned it.
- Between swells, sign *Look at me* under your hem to the gallery. Seraphina never looks.
- Listen for the engineer's low hum under the floor. It is the one note that isn't 528.
- On the three hundredth morning, the Question rises (*Is it time?*), and you can't stop holding: the wire.
- The light. You watch the engineer throw three boys into the conduit and hold the bulkhead.
- On the last morning Seraphina looks, and her hands do not open.
- The fall, and something below that sings your note back.

**Effort:** M: one Foundry map, registered through EXTRAS17 like the other extras.
**Spoilers:** keep it strictly to the chapter. Nothing of Solenne's return, the Wired or Mote.

#### #24 Echo I, played (ll. 6376–6505)

This goes past R6's Echo card.
- The Tide-Weaver's voice over a desaturated Oakhaven: the forty-second night, the drain, eleven seconds.
- Then you walk Cooper's Row **as the thing in Lyra's boots**: it is very good, and kind, "because kindness is a sound".
- Kaelen comes to the door with his plan and hums at the latch, and *nothing in you recognises it*. That missing recognition is the whole point.
- End on "the world is never saved by the people who are fresh".
- Unlocked if you answered the Hedge, or through E1.

**Effort:** M. It reuses the Oakhaven map with a grade.

### 3.7 Things from Book One's world the game could dramatise

#### #25 Twenty small canon touches (S each)

None of these duplicates R3, R4 or R6. Where one is close, the new part is named.

- **a. Hymn 9's real words.** *"Hold us in the little light… until the morning comes"* (l. 4790). Use them in the HYMN 9 event (`grove.js:142`) and the Wearer's lure (#6).
- **b. *Apples in the Rain*, off-key on the fourth bar** (l. 436). Tobin's song: in the Wearer's voice set, in Tobin's journal, and hummed by the Hedge-voice.
- **c. The Pure Note as a lid** (l. 2850). R6 adds the drone; this adds the town's response:
  - wet cloth over windows;
  - wool in ears;
  - children crying in lanes for no reason;
  - nobody sleeping. Rests in Oakhaven after Dawnday are shorter.
- **d. Every mending borrows** (ll. 396–402, 1089). After a large tending note, a Cantor-calling player finds a root-hair in their palm. Pull it and the blood is slightly green. A message only, but it makes the Voice system's cost visible.
- **e. The palm held flat.** "A hand's width of voice" (l. 258). Townsfolk lift a flat palm toward you when you are near the threshold, before R3's ward-sign at a breach.
- **f. The Cantor's clay jar** (ll. 248–250, 1937). A Cantor-calling item. Hum the tending note *into* a body: quieter than singing aloud, and it heals more on touch.
- **g. Kaelen's charcoal clamps** (ll. 602–608). A day job at the hut for coin. Listen to four clamps; one goes quiet before it pops; turf it in time. It is the Narrow as a trade, and "the finest ear for failure in forty years".
- **h. The hound's bed pebble** (l. 612). Drop a pebble into a bed and it makes no sound at all. Throwables already exist.
- **i. Pim's whistle as a tool** (ll. 2013–2025).
  - Once Lyra teaches it, a two-note signal locates her, or the companion, in fog.
  - The mimic rule: use it outside the Hedge once, and from then on the Wearer uses it on you. "It got the interval exactly right."
- **j. Legionnaires with grass through their feet** (l. 3386). Passive Legionnaires left standing at their posts in the greened quarry and town, because nobody told them to move.
- **k. "Dissonant: self-inflicted. No further action."** (l. 1622). The Synod's line for every death in Oakhaven. It appears in the Gazette (rumours.js) after Davin, Tam and Ada.
- **l. Consecrated.** On Chapel-days, sermon-goers glance toward the North Gate (l. 652). A glassed player walking with a Legionnaire gets the ward-sign twice.
- **m. "Colours were brighter once"** (l. 294). Over-thirty townsfolk say the reds were redder. A rumour line, and a Gazette line saying it will come right with prayer.
- **n. The dead Queen's decree with the paste still wet** (ll. 320–322) on the well-house, renewed each new day. "Her signature was very steady."
- **o. "Forty-eight."** Vane to the hold at night (l. 1685).
- **p. The Veil's three rules** (l. 4167). Once Sable is with you, she reacts when you add a ledger entry with a comforting note ("He died bravely"): "Do not comfort yourself in the margin." *[PROPOSED UI]*: a ledger entry can carry a plain note or none.
- **q. OK-114, twice painted over** (l. 4181), on the *Kestrel*'s bow, legible only up close.
- **r. Six feet of cut rope** hanging from the drum until it is coiled in Part Four (ll. 3808–3810, 5652).
- **s. Hetty's eyebrows.** No toasts. The Boar's drink-buying is a silent nod. Pairs with R2's rules.
- **t. Kaelen's stile story** (l. 2465). He broke his arm at twelve trying to see the chapel bells. That is when Lyra first said the martyr line. Today Tobin quotes it (R2). Move it here.

#### How books could carry story (for the four libraries, without duplicating their book quests)

These are suggestions for **what the canon documents are and where they would naturally sit**. Most are Book One's own epigraphs (R6 places 24 of them as single documents). The extra idea is that some are **evidence the story uses**:

- **The Conservatory (Ilse Brennan).**
  - Tobin's Cantor's notebooks: the dated entries of 398, 401 and 404 SR (ch. 11 l. 3350, ch. 6 l. 1927, ch. 23 l. 5890), and the margin "*Try the falling fifth*" beside a sketch of a split apple branch (l. 364).
  - *[PROPOSED]* The funeral office's five parts and coda as notebook pages. Gathering them gives Lyra the full office she sings in #9, a canon reason for the unbuilt "Calling-Song's Coda" companion quest.
- **The Bonded Store, Stillwater.**
  - The Catalogue's bill of lading (ch. 8 epigraph, l. 2564: "Carriers who report hearing the consignment will not be engaged again").
  - A carriage note for OK-114, Greenleaf 417, "travelled dry, secure and unopened" (ch. 16 epigraph).
  - If read before Manifest (#11), Vane's confession in the hold can quote it back.
- **The Moot-house.**
  - Sable's muniment-store room.
  - Her Ledger entry for the night the *Kestrel* came: *I am going to go and look at it. This is the first time in three years that I have written the word I.* (l. 4215)
  - The gallery where she saw the first proctor.
  - Corwin Aye's barrel in the cellar (#11).
- **The Veil's scriptorium in the Mausoleum.**
  - Quist's precept, "Rule the page before you write on it…" (ch. 22 epigraph).
  - The Precept of the Silent Veil's three rules (ch. 15 epigraph).
  - Fourteen desks; hers by the second window.
  - **Caution:** the scriptorium smell is Sable's *last* fragment in Book Two (Errata). Let the player find the room, never let it "restore" anything.
- **Two books worth making readable anywhere:**
  - Tobiah's copy of *On the Calibration of Resonant Bores*, with his two-colour marginalia "*yes!!*", "*but see ch. 4*", "*ALWAYS BENEATH*" (l. 1731);
  - *A Plain Account of the Cacophony* (Null-Watch Press), a primer that states the game's rules in-world: "It cannot read… do your weeping on paper" (l. 5284).

---

## 4. What the Parts would look like, and the cost in length

This is a sketch, not a plan. The aim is "richer, not longer for its own sake". Every set-piece below either replaces a text card or fetch step, or sits on a day the player already spends.

| Part | Today | With the top ideas | Rough change to the main path (estimate, unplayed) |
|---|---|---|---|
| One | Harrow → Lyra → Kaelen → quarry → Kaelen. Days are free. | The same errands, with five dated set-pieces: Grafters (#22), Boar (#5), Depot Three (#10), the meadow (#4), the Church (#13), and Cargo night (#14) on Driftday. | +40–60 min. The errands stay; the set-pieces are what happens between them. |
| Two | Shaft → coil → golems → 300 s run → end card | Custody (#3a) → procession (#3b) → needle (#3c) → SING IT DOWN (#3d) → pumps (#3e) → the Greening (#1) → the rope (#2) → Ash in the Hold (#8) | +35–50 min. The end card becomes play. |
| Three | Card → WG → ambush → Sable → Aegis → Malting → ladder | Manifest (#11) after the ambush; the front-door queue (#15); Voice at the Door (#6) instead of the porch fight; the eight names (#19) in the archive | +15–25 min |
| Four | Card → camp → silk and valve → tombs → coda → herald | The deck chase (#20) instead of the card; the lamps (#9) instead of or beside the choir; the temptation (#21) before the herald | +15–25 min |

**Net:** the main story goes from about 3–4.5 h to about **5–7 h**, all of it the novel's own scenes. That is a real increase, and it should be weighed against R1's point-of-no-return warning, which matters even more when Part Two becomes a long unbroken sequence. Suggestion: an autosave before #3b and again before #1.

**Build order, if this goes ahead** (each a separate PR, after R1–R2):
1. #11 Manifest, #19 the eight names, #25a/b/k/q/r (S; days).
2. #10 Tamsin, #13 the Church, #3.1 the scheduled days (S–M).
3. #5 the Boar (M). The first big set-piece; playtest it before scaling.
4. #3 the Rite and #1 the Greening (L, together).
5. #2 the rope, #8 the hold (M–L).
6. #6 Voice at the Door, #9 the lamps (M).
7. #4 the meadow, #7 the forty-one nights (L and M; the most design-sensitive).
8. Extras: #23, #24.

**Model note.** The owner's CLAUDE.md for Ashen-Wilds asks to flag when a stronger model is worth it, and the same habit seems useful here. #1, #3, #4 and #7 are design-heavy, tightly scripted sequences where tone is everything. They are the ones where Fable would be worth the switch. The S items are routine.

---

## 5. Where the game contradicts the novel (not already in the Release Readiness doc)

> **Owner's ruling, 28 Oct 2026:** match every one of these to the book. Fixed in the canon pass (`test/canon32.test.js`): #2, #3, #9, #10, #11, #13, #15, #16, #17, #18 (the hush-gift child is now Linnet), #19 and #20. The structural ones (#1, #4, #5, #6, #7, #8, #12, #14, #21) follow as their own pieces of work; PLAYTEST.md keeps the list.

Release Readiness §2 already covers these, so they are not repeated: the Boar's rules, the Legionnaire dying names, the Cloister name-tapes (but see item 21), the lore books, Tobin's pages and cairn, the lease, Ignatius's shop, the Mausoleum's identity, the Tanner twins, the Hall of Carriage, mutton, the proctor bounty, Lyra singing early, the near-collisions, and wind-reeds.

| # | The game | Canon | Suggested fix |
|---|---|---|---|
| 1 | **The talking crates are in Hetty's cellar** (`data.js:394`; `game.js:1492`). | Twelve crates in the *Kestrel*'s hold, which Vane can't put off ("It isn't mine", ch. 4 l. 1456). Pim talks to Annet there (ch. 8 l. 2662). | Move them to the hold (#14). Hetty hears them from the mast-ladder. |
| 2 | **Bettis Renn is a man, pressed twice, on a bench saying "name, please"** (`grove.js:217–235`). | A woman of thirty-eight, Ivo Renn's wife, carrying baskets in the Malting yard, kept on the long-term rack because the Office doesn't like to break a pair. She is the first person ever given back (ch. 18 ll. 5020–5082). The twice-pressed man is someone else, unnamed, in Ashlane (ch. 14 ll. 4155–4165). | Rewrite as canon. Use the twice-pressed man for #25 or the Ashlane beat. |
| 3 | **Quist's three questions are "your name, the name of a person you love, and whether you would like to rest"** (`data.js:748`). | Form 9: "Name. Age. Trade." (ch. 14 epigraph l. 4075; ch. 18 ll. 4970–4981; Sable's pamphlet). | Use canon. It is colder, and it is Sable's design. |
| 4 | **The Office cutter carries its own 432 voices**, "Consignment 19" vox-bottles for the Hall of Carriage (`coda.js:25`, `coda.js:202–207`; `data.js:988, 992`). | The 432 are the *Kestrel*'s cores. The cutter's horn hunts *them*: "Your cargo is not silent" (ch. 21 epigraph, ll. 5526–5528). Vox-bottles are Rust Coast black-market goods, not Office freight (Bible Part VII). | Make the cutter's hold empty, or proctors and papers only. Make packing the *Kestrel*'s crates the noise beat (#20). The bottle-freeing choice could survive as a *few* seized vox-bottles *[PROPOSED]*. |
| 5 | **Hob Wendle is the tanner, alive in Part Three as the *Kestrel*'s blade-sharpener** (`data.js:482`; `kestrel16.js:346`). | A field-hand of forty whose roots came through his feet. Rooke takes three toes on Rootday (ch. 3 l. 971). He roots into the deck and dies aboard (ch. 13 ll. 3914–3964). | Separate the tanner (rename him) from Hob, who dies in #8. Give the crew role to Coll Madder *[PROPOSED]*. |
| 6 | **Sable is in the Reach** in Parts One and Two, in the mist outside the Hedge, with proctors. She can come up the rope (`maps.js:768`; `data.js:523–557`; `game.js:1626`). | Sable never leaves Whisper-Grove until the *Kestrel* arrives. She joins in ch. 16. Her arc is that she *couldn't* leave ("the moment I get on a ship I am a woman who left", l. 4445). | The biggest structural break. **[DECISION]** for the owner. Options: keep it as a known adaptation; or recast the Reach figure as another Veil runaway *[PROPOSED]*, keeping Sable's first meeting at the fountain. |
| 7 | **The Wearer is fought up to three times**: at the Oakhaven mast if you answered (`game.js:1555–1561`), at the Cloister porch (`grove.js:63–71`), and in the Mausoleum. | One Wearer, never fought until ch. 23. At the porch it is only a voice in the fog (ch. 20). | Keep the Part Two mast encounter as a voice-only scare, or a hound pack in your voice. Make the porch #6. Kill it only in #9. |
| 8 | **The coda takes place in the Mausoleum choir behind a four-tomb puzzle** (`coda.js:208–253`). | The clearing by the Mausoleum. A ring of lamps. Lyra alone outside the last lamp singing the full office. Kaelen and the Aegis strike once it is inside the ring (ch. 23 ll. 6022–6126). | Offer #9. Keep the choir for the Requiem branch. |
| 9 | **Tam's wife Essa "went in at the sluice in the Cascade year"**, and he hears her on the Flume (`data.js:470`). | Forty years dead of the pox "the year the old king went into the glass". She called him *Tammy* (ch. 6 l. 1999). | Small text fix. Keep the Flume. Use *Tammy*. |
| 10 | Ignatius: "**The Hollow in the quarry** is to be burned" (`data.js:507`). | The Hollow is the burl-sick lanes behind the tannery (ch. 1 l. 326; the warrant, ch. 7 l. 2311). | One-word fix. |
| 11 | **Every Legionnaire murmurs about "the blue jug"** (`game.js:1429`), and so does a pump Hollow (`maps.js:637`); dreams.js gives it a pump-mender. | It is *Tamsin Reed's* line, to her mother (ch. 2 l. 658; ch. 5 l. 1867). Each core keeps its own last things. | Give each bell a small pool of its own lines. Keep the blue jug for Tamsin (#10). |
| 12 | **Day 0 already contains Davin's death** (Hetty: "not since Davin", `data.js:392`) **and the culvert lure** (Pim: `data.js:436`; couriers.js:114). Yet it is Nullday, canon's Day 1. | Davin dies Hearthday (Day 3). The lure is Massday (Day 4). Bible audit, ll. 543–545. | Section 3.1: schedule them. |
| 13 | Kaelen: "the coil goes down in your bag, not mine — **the Factor searches me at the casing**" (`data.js:382`). | "Nobody searches the supervising engineer's toolbag." The coil goes down in his bag (ch. 7 l. 2491). | Acceptable as the adaptation's reason for the player's role, but say it as a choice rather than a rule. In #3 you carry it because the Factor watched *him* at Depot Three (#12). |
| 14 | **Lyra is at home and free to talk until you take the shaft** (`maps.js:378`). Ignatius arrives on `rite_ready` (`maps.js:407`). | Taken into the Church's protection on Dawnday; four days without speech, with sisters and Legionnaires at her door (ch. 7 l. 2317; ch. 9). | #3a. |
| 15 | Aldric's purge countdown: "…three. Two. For Oakhaven." (`game.js:1528`). | Sixty seconds; "Forty-one. Forty."; "Get to the cage, boy. I'm counting." (ch. 10 ll. 3282–3298). | Text fix; the full scene is #3e. |
| 16 | The herald: "His hands are perfectly steady" (`data.js:1026`). | "His hands shook the entire time and he did not let it get into his reading, and Kaelen found that he respected him enormously" (ch. 24 l. 6196). | One-line fix. The canon line is better. |
| 17 | Sable at the Deep Woods camp: "One wreck, **eleven souls**, a press, and me" (`data.js:987`). | Twenty-one survivors and five crew aboard (ch. 21 l. 5494, ch. 16 l. 4476). | Fix the number, or have her count "twenty-six souls". |
| 18 | The Quiet Faith's child is called **Wren** (`data.js:1119`). | Wren Halloway is canon: the Bible's Aegis core, 41,112 (Bible l. 335), and Vol III (b) renames another character to avoid exactly this collision. The **manuscript** makes the Aegis WG-41,005, "a boy", surname W or M (ch. 17 l. 4832; ch. 22 ll. 5854–5862), and the game follows it. | Rename the hush-gift child. Flag the Bible-vs-manuscript Aegis identity for a ruling. Don't name the Aegis child in-game either way. |
| 19 | Sable stops a proctor by reading "Ansel Grey" (`grove.js:36`), or a random pool name. | She reads **Emory Wain**, of Cooper's Rise, mother Hanne, sister Ivy, whose intake she took (ch. 15 ll. 4401–4413). "Ansel Hay" is the canon man pressed in ch. 18. | Use Emory Wain, and drop him from NAMES_POOL (R2 already says so). Enables E10. |
| 20 | The bees (sidequests.js:214): "a girl to the Madders **on Massday**". | Ruth Madder's girl is born on Nullday, Day 1 (ch. 1; Bible audit l. 543). | Change to Nullday. It also ties to R6's Madder birth. |
| 21 | Halder Wick's table gets an answer: a wife, Bryony, and choir sons Tom and Wat, whose name-tapes put him to rest (`data.js:798`; `data.js:854–860`, `grove.js:361`). | Sable's entry: "*I do not know who he was expecting. There is no one left to ask.*" (ch. 15 l. 4435). The not-knowing is the point. | Release Readiness covers the tapes' names. The tone break is separate. Consider keeping the letter, but leaving the boys unnamed and off the canon tapes. |
| 22 | **(Canon-internal, matters for #2.)** Ch. 12's last load, the one that falls, lists "a girl of eleven with bandaged stumps" and "a young man in Consortium drab with a roll of charts" (ll. 3710–3712). | In ch. 13 both are aboard: Lissa "carried up roped under the arms" (l. 3828), and Tobiah with his charts (l. 3968). | **[DECISION]** before staging the rope. Suggest the last load is the dye-works woman, the screaming woman, two unnamed men and Aldric, with Lissa and Tobiah on the load before it. |
| 23 | **(Canon-internal.)** The manuscript dates Whisper-Grove "the sixteenth of Leaffall, 419" and the writ "the fourth day of Leaffall" (ll. 4163, 4199, 6198). | Vol VII's calendar, and the game (`calendar11.js:61`), have no Leaffall. Book One's autumn is Harvestmonth. The writ's date also falls *before* the events it answers. | **[DECISION]**. Any in-world dated document added from these proposals should use Harvestmonth. |
| 24 | **(Canon-internal, a naming hazard.)** Annet Sowerby's father is "Tam Sowerby" (ch. 16 l. 4564). | Old Tam has no surname on Kaelen's beam ("Tam — (no surname. ASK.)", l. 4053). | Don't let any proposal imply they are the same Tam unless the author rules it. |

---

## 6. What not to add

### Spoilers for later books
- **Book Two's people in the main game:** Vesper, Mote, Oona Salt in person, Port Cantabile, the Salt Stair, Merret Salt's bottle, Ilias Marren as a character. They stay as Echo narration and Extras only. Vane's VESPER bottle stays stoppered.
- **The Aegis child's name.** Sable gives it back in Book Two, and it costs her mother's hands (Errata). Find nothing more than "W or M". Her promise is the end of it.
- **The Grand Unison, the Planetary Engine, the Architects, the Accord ending, the Hush speaking, Kaelen becoming the voice of Light, Lyra teaching law-songs.** Vaelen may say only what he says in ch. 19.
- **Jory Quill's writ.** No quest and no dialogue beyond "which way is east" and "if you stop". The Engine Writ is Book Two's engine.
- **Ignatius's conversion.** Book Two. He can crack once ("something moved behind the statue's face", l. 2361) and close.
- **Aldric's fate below the canopy.** Book Four may have a Governor. Don't show a body.
- **Killing the heirs.** Tobiah, Lissa, Rooke, Hetty, Pim, Mags and Pennick are named heirs (Bible l. 417; Hetty and Pennick die in Book Three, per Vol VII and the Errata). Coll Madder and his newborn daughter must be on the *Kestrel*, because he dies on the Salt Stair in Book Two (Bible l. 473).
- **Forgiveness.** Lyra does not forgive Kaelen in Book One. Her hand finds his "and did not forgive him either" (l. 6152).

### Bloat
- **A new minigame for each set-piece.** Reuse Hold the Pitch, the count UI, dialogue choices and the existing fights. *Steady Hands*, *Stall the Clerk* and the whistle duel are the only new inputs worth building, and the GDD already designed all three.
- **More killable mimics.** The mimic's horror is that you mostly can't fight it. One Wearer kill in the whole game.
- **Rescues that undo canon.** Davin, Tam, Orla, Ada Pellow, Hob, Aldric, Halder and Tamsin are lost in every thread. Choices move *cost*, not outcome.
- **Hard timers that fail a quest.** Section 3.1's schedule changes lines, never fails anything (R6's rule). The escape and countdown timers are set-piece timers with soft failure.
- **Combat in scenes the book keeps non-violent:** the Grafters' round, custody, Voice at the Door, Manifest, the herald.
- **Sable reversing names in bulk.** Each one costs a fragment, and Bettis shows what it does. The game's "Missing Count" and "Pressman's Round" ledger names already stretch this.
- **Showing the Hush.** It is never shown (Phase 20 ruling); only quiets and absence.
- **Children harmed on screen.** Pim, Annet, Lissa and the hush-gift child are present and in danger, never hurt in detail (the Dread Doctrine).

---

## 7. Open questions for the owner

1. **Sable in the Reach** (section 5, item 6): keep it as an adaptation, or move her first meeting to Whisper-Grove?
2. **The scheduled days** (section 3.1): may the canon calendar run while the player is in Oakhaven? Davin and the culvert lure would happen in play instead of before it.
3. **The rope's last load** (section 5, item 22) and **Leaffall** (item 23): canon rulings are needed.
4. **The Aegis's identity:** the Bible's Wren Halloway (41,112), or the manuscript's boy (41,005)? The game follows the manuscript.
5. **Variable rope count** (E5, 19–21) and **saving up to six pump-men** (#3e): is a small spread around canon's numbers acceptable, or must they stay exact?
6. **The tomb-puzzle choir:** keep it for the Requiem branch beside #9, or retire it?
7. **The two Hobs:** may the game's tanner be renamed so canon Hob can die on the deck?
