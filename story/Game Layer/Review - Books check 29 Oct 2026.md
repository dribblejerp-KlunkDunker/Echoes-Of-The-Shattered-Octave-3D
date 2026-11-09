# Books check: the novels and the Library of the Reach against current canon

Checked 29 Oct 2026, read-only, in `/home/user/echoes-of-the-shattered-octave`.

**What was checked**
- **Library.** All 65 books in `js/library26-books.js`, read in full, and the two Moor-serial installments in `js/books.js`.
- **Novels.** Book One's full manuscript, Book Two Ch 1–14, Book Three Ch 1–12 and Book Four Part One Ch 1–4.
  - They were checked against the Series Bible, Vol III (b), the Phase 20–21 Author Rulings, the Library Notes for the Owner, PLAYTEST's canon pass, Story Brainstorm §5 and the canon-pass commits (`052a6a6..origin/main`).
  - Every dated "Xday the Nth of Month" in the library and the novels was recomputed on Vol VII's calendar. All of them agree; the only failures are the Leaffall dates (below).
  - The novels were also scanned automatically for name variants and age/number clashes, and Book One's chronology and counts were checked by hand.

**The repo changed during the check.** Commit `2ab9ea7` replaced the Series Bible with **v1.3**, and section 4 is measured against v1.3. The same commit made two one-line edits to the books. Neither touches anything below. An untracked draft, `World Bibles/Vol VIII - The Game Layer.md`, also appeared during the check. It was not used as a baseline; section 4 only notes where it already mentions a fact.

Line numbers below:
- **"B1"** is `Book One - The Silenced Province (full manuscript).md`.
- **Book Two, Three and Four** line numbers are in the named part file.
- **The library** has no line numbers; a book's id is enough to find its passage.

---

## Library books that contradict canon

**Result for the canon-pass facts: none.** No library book or Moor installment touches any of these:
- Sable's whereabouts
- the crates
- Hob Wendle or the tanner
- the cutter and the 432
- the nine-day order
- Halder Wick
- the Cloister tapes
- the Wearer
- Voice at the Door
- Wren or Linnet
- Bettis Renn

The two that mention Tobin agree with ruling 1:
- `lib_a_wool_wall`: "The hounds had him at the Pellow farm in the spring, and the Hedge went in that summer without him."
- `lib_e_off_the_slate`: "the spring of 417".

The Moor serial (`book_things_taken_home`, `book_gate_book`) is Caldera fiction and conflicts with nothing.

The findings below are smaller contradictions with the manuscripts and rulings, ranked.

### L1. `lib_c_bellwether_book` (The Bellwether Book): the Hedge in the back-end of 417
- **Passage:** "417, back-end. Shut tonight. The wool has gone down to Oakhaven for the Hedge, and the flocks with it, and we are all to go in behind it"
- **Canon:**
  - The Hedge was planted in **summer** 417. B1 l.420 "planted two summers ago"; B1 l.3404 "She had helped plant it, two summers ago".
  - Library Notes ruling 3: "The summer of 417, 'two summers ago'".
  - The library itself agrees with summer. `lib_a_wool_wall` has the shearing and the planting together, with "the Bellwether put up its shutters", and "the Hedge went in that summer".
- **Replacement:** "417, high summer. Shut tonight. The wool has gone down to Oakhaven for the Hedge…" The rest is unchanged, and it echoes G. Thrale's "416, high summer" line just before.

### L2. `lib_f_long_mole_songs` (Songs of the Long Mole, "Wendmere Rings Three"): wrong year and manner of Wendmere's sinking
- **Passage:** "Wendmere was a fishing town south of the Cay. The trench opened under it in '13 and it went down whole, tower and all, and since that first winter its bell has rung under the water"
- **Canon:** Book Two, Part One Ch4-7 l.154: "on the slope of the shelf, in the Screaming Year, the old fishing town of Wendmere had slid into the sea in a single afternoon with its church and its bell-tower and four hundred people". Ch1-3 l.366 also has the peal of "a town that went under in the Screa[ming Year]". The Screaming Year is 412.
- **Replacement:** "Wendmere was a fishing town south of the Cay. In the Screaming Year the shelf gave way under it in a single afternoon and it went down whole, tower and all, and since that first winter its bell has rung under the water…"

### L3. `lib_g_plaza_and_canopy` (The Plaza and the Canopy, 411 SR): the cooper's barrel is three years off
- **Passage:** "The barrel has not leaked in fourteen years, and the cooper is insufferable about it." Written in 411, this dates the barrel to 397.
- **Canon:** B1 ch. 16, l.4556, in 419: "there is a barrel in the Moot-house cellar with his mark burned into the head and it has not leaked in nineteen years". That dates it to 400. The game's R5b cellar uses this barrel.
- **Replacement:** "The barrel has not leaked in eleven years, and the cooper is insufferable about it."

### L4. `lib_d_narrow_larder` (The Narrow Larder, 419): the sheaf is already on the gate
- **Passage:** "The sheaf is up on the Hedge-gate as I write this, so you know the time of year, and they are saying the Church will want it put off."
- **Canon:**
  - The sheaf goes on the gate only once the last stand is cut, and stays there "till spring" (`lib_a_almanack_419`, `lib_c_last_sheaf_play`).
  - In 419 the stand is never cut: the almanack's last note reads "Sheaf still standing"; `lib_e_off_the_slate` has "the last stand is still uncut".
  - The game's Last Sheaf festival follows the same order.
  - The sentence cannot be true in Harvestmonth 419, which is when its own "the Church will want it put off" places it.
- **Replacement:** "The last stand is still uncut in the north field as I write this, so you know the time of year, and they are saying the Church will want it put off."

### L5. `lib_d_narrow_larder`: "the autumn the Hedge went in"
- **Passage:** "The hens went quiet first, the autumn the Hedge went in."
- **Canon:** summer 417 (B1 ll.420, 3404; ruling 3). The phrase reads as "the Hedge went in that autumn", which is Book Four's version (see N22). That version is deferred.
- **Replacement:** "The hens went quiet first, the autumn after the Hedge went in."

### L6. `lib_a_hard_winter` (The Fires on the Ground, 413): a second Essa who went in at the sluice
This is a collision, not a strict contradiction.
- **Passage:** "Essa Brindle, who went into the Flume at the sluice-gate. There was nothing to put in the ground."
- **Why it matters:**
  - The canon pass (`ad72340`) removed the game's old line that Old Tam's wife Essa "went in at the sluice in the Cascade year". It now follows B1 l.1999: "The pox took her the year the old king went into the glass. She used to call me *Tammy*."
  - The game still calls Tam's wife Essa (`js/couriers.js` ll.124–131).
  - This book's Essa dies the same death (the sluice) in the same winter (the Cascade winter), so readers will take her for Tam's wife.
- **Replacement:** "Avis Brindle, who went into the Flume at the sluice-gate." "Avis" is not used anywhere in `js/` or `story/`.

### L7. `lib_h_daybook` (The Duty-Scribe's Day-Book, 416): sixteen scribes at fourteen desks
- **Passage:** "Second day. Stove lit at the second bell, drew well. Sixteen at the desks."
- **Canon:**
  - B1 ll.4135, 5052, 5678: "Fourteen desks. Mine was by the second window."
  - `lib_a_what_is_written`: "fourteen sloped desks in two rows".
  - The same day-book's first day has "Fourteen at the desks".
- **Replacement:** "Second day. Stove lit at the second bell, drew well. Fourteen at the desks, and two copying at the stove."

### L8. `lib_b_letters_from_the_gate` (Letters from the Gatehouse): the bells go "in the first year of the works"
Low priority; this one is ambiguous.
- **Passage:** "They took all the bells in the first year of the works, for the bore"
- **Canon:**
  - Ruling 2: 417, "the first year of the quarry", following B1 l.410.
  - `lib_a_greenroot_road` dates the works to 415–416 and the bells to 417.
  - "The first year of the works" therefore reads as 415.
- **Replacement:** "They took all the bells in the first year of the bore, for the bore's teeth" (or simply "in 417, for the bore").

### L9. `lib_e_undertow_reach` (The Undertow): "in a night"
Low priority; it is broadsheet hearsay.
- **Passage:** "You planted it yourselves in a night, and we hear it was the bravest piece of work done in that province in a hundred years."
- **Canon:** the planting took several days and nights. `lib_a_wool_wall` has the engineer walking the line "in two days", and the Governor "there at dusk and there at dawn" with hands that "blistered on the first morning".
- **Replacement:** "You planted it yourselves, by hand, in a few days and nights, and we hear it was the bravest piece of work…"

### L10. "Umber" is now three scribes
This is a hazard, not a contradiction.
- **The three:**
  - `lib_a_what_is_written` (410): Umber has held the designation "fifty-one years".
  - `lib_e_veil_rule` has an Umber copying fair c. 290 SR.
  - The canon pass (`3c9b261`, `js/data.js` l.535) made the Reach's runaway scribe Umber [PROPOSED], who says of Sable: "I was her junior".
- **Why it holds together:** designations do pass on. `lib_g_bistre_commonplace` has "The last Bistre was an old man who left me a cracked horn", and `lib_g_orpiment_meditations` has "The scribe who had it before me died very old". So nothing is broken. But a player who reads *What Is Written* in the Mausoleum meets an Umber who was old in 410.
- **Optional one-line fix:** in `lib_a_what_is_written`, after "I have had it fifty-one years and I do not miss the other.", add: "When I lay the pen down it will go back in the cupboard for the next novice, as it came to me."

### L11. Note: when the eels ran in 419 (not a canon conflict)
- `lib_b_year_of_nights` puts the 419 Eel-Run ("late this year") before its "Corn standing… the Church has views" entry, which is before the Church arrives.
- `lib_d_rudds_almanac` (419) says "This year it is Harvestmonth and they have not gone".
- The game's Eel-Run is on 12 Harvestmonth (`js/festivals12.js` l.53), marked [PROPOSED].
- Nothing needs changing unless the owner wants the three to agree exactly.

---

## Novels: errata not yet applied

**Vol III (b) status.** Every erratum is reflected in Books Two to Four, and nothing contradicts them:
- Vaelen glassed: no manuscript has "never been glassed".
- Book Two ends at Ch 14.
- Sable has one piece left at the end of Book Two (B2 Part Two l.3331), and the copy of her name is in the third tray (B2 Part One Ch4-7 l.901).
- Tideline: an inch and a half → an inch → a finger's width in B2; half a finger in B3 l.1832.
- Lyra has no voice.
- Cores: 432, then 396.
- Rift 413, "six years", "Two thousand and eleven".
- Fen: Ebb Cross, summer '13, eighteen.
- F/3 redrafted in 416.
- Hester Vell.
- The Hall: the basement and three floors.
- Null-Watch: forty batteries, four miles.
- The edge, "A piece knows its way home", Tessa and Annis.
- Pennick dies in B3 ch. 1 with Tobiah as heir; Vane is still alive.

Vaelen's ruled line ("you have listened to them for eighty years, and you have never once sung back") is not in any manuscript yet. The ruling places it "late", so it is pending, not contradicted.

The exceptions follow.

### E1. Book One still dates the Valley's break to 414 (Vol III (b), Timeline corrections: "The Valley of Velocity broke in 398, not at the Fracture.")
- **Where:** B1 ch. 21 *Ten Heartbeats*, l.5630. Sable on Jory Quill: "He has been running since the Valley of Velocity went, which was five years ago, and he has not delivered it."
- **Ruling:**
  - Vol III (b), and Series Bible v1.3, Part V: "398 SR | The first law-collapse, in the Valley of Velocity".
  - B3 ch. 1 l.41: "Nothing had run on them since 398, twenty-one years ago".
  - The Bible keeps the five years, but as Jory's own: he was "caught in a Velocity flare", and the writ has been "undelivered for five years".
- **Fix:** "He has been running since a Velocity flare caught him, which was five years ago, and he has not delivered it."

### E2. Real-world weekday and month names (Series Bible Part I: "'Last Tuesday.' → No weekdays. Aethelgard keeps an eight-day octave-week"; months per Vol VII. Library ruling 9 applied the same rule to game text: "Firstfruit, not August")
- B1 ch. 18, l.5068: "with her husband's coat over her arm on a Tuesday in 416". **Fix:** "on an ordinary morning in 416". No book gives the weekday of her intake, so this avoids inventing one.
- B1 Echo I, l.6391: "almost always small, and almost always a Tuesday." **Fix:** "almost always a Hearthday."
- B2 ch. 1 (Part One Ch1-3, l.155): "it was the January water of the Rust Coast at six in the morning". The chapter is dated "The fourth of Ashfall". **Fix:** "the Ashfall water of the Rust Coast".
- B3 ch. 11 (Part Three Ch9-12, l.1049): "they had broken out a seacock and let the January sea into a hold". **Fix:** "let the Ashfall sea into a hold".

### E3. Book Four against rulings 1 and 3: the owner deferred this
- **Ruling 3:** "Book Four's 'autumn' is left for that book."
- **Ruling 1:** Tobin was taken in "Spring 417, at the Pellow farm, before the Hedge".
- **Book Four Part One ch. 4 contradicts both:**
  - l.1709: "She had watched it planted, in the autumn of 417, the same autumn the Synod sank the quarry bore and took her father… The Synod's engineers had planted it".
  - l.1745: "her father had lived inside it for the last weeks before they took him, in the autumn it was planted".
- **Against Book One:**
  - B1 l.454: "Her father had been taken two years ago, in the spring, at the Pellow farm, out past where the Hedge runs now".
  - B1 l.420: "The Consortium had paid for the planting… and the town had done the rest".
- **Fix, for when the owner takes it up:**
  - l.1709: "…in the summer of 417, the summer after the hounds took her father at the Pellow farm… The town had planted it, with the Consortium's money and every fleece in the Reach…"
  - l.1745: "And her father's voice had gone into it too: forty-one nights of a thing at this thorn, at the dead hour, saying her name the way he had said it every evening at the supper table."
  - This keeps the chapter's device: the Hedge, not the Wearer, holds his "Lyra-love".

---

## Novels: internal contradictions

### Book One, within itself

**N1. The rope's last load (Brainstorm §5 #22; still unruled).**
- Ch. 12, ll.3708–3712: "Five went onto it… a girl of eleven with bandaged stumps for hands… a young man in Consortium drab with a roll of charts stuffed down his shirt". Then l.3740 has the old woman "trying to get the girl with no hands off the rope", and l.3784 has "five people falling forty feet into a canopy".
- Ch. 13 has both aboard. l.3828: "a girl of eleven who had no hands to flay, who had been carried up roped under the arms". l.3978: "The boy had his charts under his arm".
- **Fix:** move Lissa and Tobiah into "the last four before the last" (l.3700), and give the last load two unnamed carters.
  - l.3710: "…saw them from above: an old woman in a dye-works apron…; two carters who had been passing children up all afternoon; a woman who was screaming somebody's name up at the ship."
  - l.3740: "trying to get one of the carters off the rope and into the tree".

**N2. The cut rope.**
- Ch. 12, l.3810: "Nobody coiled it. It hung there for four days."
- Ch. 21, l.5652: "six feet of cut rope still hanging from the winch drum, which nobody had coiled in five days."
- By the book's count, ch. 21 (Nullday) is six days after the Rite (Hearthday).
- **Fix:** l.3810 "It hung there for six days." and l.5652 "…which nobody had coiled in six days."

**N3. Chapter 13's dateline breaks the week order.**
- l.3822: "*Hearthday night into Rootday.*"
- Rootday comes before Hearthday, and the chapter covers one night, a dawn, and "that night". Ch. 15 l.4241 has Lyra "silent for five days" on the Memoryday, five days after the Rite.
- **Fix:** "*Hearthday night into Massday.*"

**N4. "Four days" in ch. 24.**
- l.6361: "faint, four days and a hundred miles behind them".
- l.6365: "He had been pushing the thought away for four days".
- Ch. 24 is the Rootday seven days after the Rite (Hearthday, then Memoryday "five days" later, then Nullday, then Rootday).
- **Fix:** "a week and a hundred miles behind them" and "for a week".

**N5. Where the tideline reached four.**
- l.6174: "Four at the Malting, after a Steam Golem and a boiler's worth of working noise."
- The Golems and the boiler were at the casing. l.3248: "The Consortium kept four at the casing". l.3262–3264: "He drank the second Golem… got his glass hand flat on the boiler".
- **Fix:** "Four at the casing, after a Steam Golem and a boiler's worth of working noise."

**N6. Ivo Renn's entry, and where Bettis's core is.**
- Ch. 14, l.4105: "Entry forty thousand, one hundred and one. Ivo Renn". The game's tag for Bettis, "WG-40,102", follows from it.
- Ch. 16, l.4510, read off the third crate (tagged "WG-41,004 and up", ch. 8): "Forty-one thousand and four. Ivo Renn, forty-one, cooper, of Ashlane; his wife is at the bottom of this row".
- Ch. 18, l.5020: "Her core is in the long-term rack because her husband's was requisitioned and the pair were broken up". l.5076: Ivo "is in the third stack".
- **Fix (l.4510):** "Forty thousand, one hundred and one, in the next stack: Ivo Renn, forty-one, cooper, of Ashlane; his wife was taken within the hour, and the Office kept her."

**N7. Mirren Salk has two entry numbers.**
- l.4510: "Forty thousand nine hundred and ninety-one. That is Mirren Salk, twenty-six".
- l.4560: "Entry forty thousand, six hundred and ten. Mirren Salk. Twenty-six."
- **Fix:** use one number. Since 40,991 was read off a tag, change l.4560 to "Entry forty thousand, nine hundred and ninety-one."

**N8. WG-41,005 is in two places.**
- Ch. 8, l.2700, in the *Kestrel*'s crate: "He lifted another: **WG-41,005.** Another: **WG-41,006.**"
- Ch. 17, l.4832: the Aegis's core is "**WG-41,005**". Book Two ch. 14 agrees, and so does Series Bible v1.3, The Twelve.
- **Fix (l.2700):** "He lifted another: **WG-41,006.** Another: **WG-41,007.**" Book Three already has a gap in the run: a crate of "WG-40,880–40,915" shattered in its Bible chapter map.

**N9. When the Tanner twins died: spring or end of summer.**
- l.512: "one night at the end of summer, after she had sung the Tanner twins into the ground side by side".
- l.3986 (Tobiah): "Marten and Old Coyle and the Tanner twins died of slippage, sir. In the spring."
- **Fix (l.3986):** "…died of slippage, sir. In the summer."

**N10. The Grafters' round.**
- l.328: "the Grafters came to the Hollow on the second Rootday of every month".
- l.943: "She had watched them come every second Rootday for three years".
- The round in ch. 3 falls on Day 2, which is the *first* Rootday of the month in Book One's own dating (Leaffall 2) and also in the game's (7 Harvestmonth).
- **Fix (l.328):** "on every second Rootday".

**N11. Sable's arithmetic.**
- l.4113: "seventy-four thousand and six hundred and eleven entries, at twenty a night, is ten years and two hundred and twenty days… by then the ones you started with will have been standing in the rain for fourteen years".
- 74,611 ÷ 20 = 3,731 nights. On Vol VII's 360-day year that is 10 years and 131 days; on a 365-day year, 10 years and 81 days. Starting in 416, the first pass ends about 426, not fourteen years on.
- The Series Bible v1.3 ch. 14 entry repeats "ten years and two hundred and twenty days".
- **Fix:** "…is ten years and a hundred and thirty-one days… standing in the rain for ten years and more".

**N12. The consignment arithmetic does not close.**
- The figures:
  - ch. 14, l.4187: "The first one twelve crates, the second sixteen, and then twenty-four, and twenty-four, and twenty-four."
  - ch. 16, l.4534: "Twelve crates, then sixteen, then twenty-four and twenty-four and twenty-four and twenty-four".
  - Vane, l.4476: "twelve crates to a load, eleven loads".
  - Totals of 1,342 cores (ll.4199, 4546) at 36 a crate (l.2694), with 12 crates (432) in the current load.
- **Why they cannot all be true:**
  - The five loads Sable lists already come to 100 crates, which is 3,600 cores.
  - 1,342 is not a multiple of 36.
  - Vane's "twelve crates to a load" contradicts Sable's rising loads.
- **Related:**
  - l.4476 also says "Four hundred and thirty-two crates' worth of somebody else's people". It should be "twelve crates' worth… four hundred and thirty-two people".
  - Book Four l.1012 says "he had carried their crates, thirteen hundred and forty-two of them". That is cores, not crates.
- **Fix, which needs the author's choice:** keep 1,342 and make the earlier runs small (about 910 cores over the first ten, two or three crates a run), and drop Vane's "twelve crates to a load"; or keep the crate counts and raise the total.

**N13. How long the Wearer listened at Kaelen's hut.**
- Ch. 20, l.5358: "It had stood in the clearing outside a charcoal-burner's hut for seven years listening to a man who talked to an empty room".
- Ch. 23, l.6102: "It had eaten a Cantor and four others and two years of a woman's nights". Ch. 24, l.6174: "a thing that had eaten five people and two years of sound".
- Series Bible v1.3: "for two years it has also been listening outside Kaelen's hut".
- **Fix (l.5358):** "for two years".

**N14. The Aegis's name in Sable's mouth, against Book Two.**
- Ch. 22, l.5862: "I can read the first letter of the surname and it is either a W or an M… and the given name is one syllable".
- Book Two ch. 14 (Part Two l.3237): "Wren Halloway". Halloway starts with H.
- Ch. 17 agrees that the *surname* is the illegible part.
- **Fix:** "I can read the first letter of the given name and it is either a W or an M and I have never been able to decide, and it is one syllable and might be anything, and the surname is under the blot".

**N15. The writ and Sable's entry predate what they record (Leaffall).** The owner ruled that "Leaffall stays in the manuscript" (ruling 9), and the Leaffall dates agree with each other: Leaffall *n* = Day *n*, so the 11th is a Hearthday, the 15th a Driftday and the 16th a Memoryday. Two dates still break the story's order.
- **Ch. 24, l.6198:** the writ is dated "the fourth day of Leaffall, 419". That is Day 4, a week before the Rite, yet it declares Sable and "the carrier styled Vane, of registry OK-114" Dissonant. Sable joins on Day 17, and the registry escaped on Day 16. **Fix:** "the seventeenth day of Leaffall, 419".
- **Ch. 14, l.4199** ("Carriage attested… between Greenleaf 417 and Ashfall 419") and **ch. 16, l.4534** ("between Greenleaf of 417 and Ashfall of this year") are both written on 16 Leaffall. Ashfall comes after Book One, since Book Two opens on 4 Ashfall 419. **Fix:** "and Leaffall 419" / "and Leaffall of this year".
- **Notes for the ruling, not errors:**
  - "Greenleaf" (ch. 16 epigraph; l.5140 "the ninth of Greenleaf, 411") is a second non-Vol VII month, and no ruling covers it.
  - Books Two and Four call these same days Harvestmonth (B2 Part Two l.707; B4 l.1144 "Harvestmonth of 419, when you sat in this plaza").
  - On Vol VII's calendar no 16th of any month is a Memoryday. So Leaffall cannot be a renamed Vol VII month; it maps to 6–21 Harvestmonth, Day 1 = 6 Harvestmonth (see section 4).

**N16. Spelling of the Harbour-Queen.**
- B1 l.2630 has "Harbor-Queen". Book One uses US spelling throughout ("color" 19 times, "colour" 3 times; "harbor" 6 times).
- Books Two to Four have "Harbour-Queen" (15+ times) and UK spelling.
- **Fix:** standardise. At minimum, B1 l.2630 → "Harbour-Queen", and the three stray "colour"s in B1.

### Book Two against Book One

**N17. The Madder baby's age.**
- B2 Part One Ch1-3: l.435 "He had a daughter nineteen days old"; l.433 "he had been on a ship for twenty days with a wife and a newborn"; l.579 "nineteen days of baby".
- B2 Part One Ch4-7, l.845: "twenty-three days old" on 8 Ashfall.
- Book One: Ruth Madder's girl is born in ch. 1, on Nullday, Day 1 (l.532). Book One ends on Day 18 (ch. 24, Rootday). B2 Part One Ch1-3 l.214: "It had taken them eleven days to come four hundred miles". So on 4 Ashfall she is at least 28 days old. The Bible v1.3 repeats "nineteen days".
- **Fix:** "twenty-eight days old" / "twenty-eight days of baby", "thirty-two days old" on 8 Ashfall, and "on a ship for eighteen days with a wife and a month-old daughter".

**N18. When Lyra was taken.**
- B2 Part Two l.707: "under the protection of the Sun-Altar since Dawnday of the last week of Harvestmonth".
- Book One has her taken on Dawnday, Day 6, five days before the Rite and the Greening. On any calendar consistent with 4 Ashfall that is the second Dawnday of Harvestmonth (11 Harvestmonth in the game). The last Dawnday (the 27th) falls after the *Kestrel* had left.
- **Fix:** "since the second Dawnday of Harvestmonth".

**N19. How long Bettis screamed.** Low priority.
- B2 Part One Ch4-7, l.901: "the woman had screamed for six days afterward".
- B1 l.5804, the same night: "Bettis Renn had stopped screaming an hour ago and started something quieter and worse". B2 l.851 also has "has stopped screaming".
- **Fix:** "had screamed until nightfall".

**N20. Tobin's last reed.**
- B1 l.504: "These seven pipes were the last reeds in the Reach that had not turned… They had not been played in two years."
- B2 Part Two l.164: "the last wind-reed out of the orchards of the Reach. Her father had cut it in the spring of 412… she had carried it for seven years and never once played it, because it was the last one".
- **Fix (B2):** "one of the last wind-reeds out of the orchards of the Reach… because it was the last he ever cut".

### Book Four against Book One

**N21. Ada Pellow.**
- B4 l.1719: "Ada Pellow, who was seventy, and a widow, and had buried her husband with a stone on his tongue in 418".
- B1 l.3544: "She was fifty-one years old. Her youngest had had a marsh-fever two springs ago, and had been going quiet in her cot".
- **Fix (B4):** "who was fifty-one" (the widowhood can stay).

**N22. The Hedge's season, who planted it, and when Tobin was taken.** See E3, which is deferred by the owner.

**N23. Aldric's years as Governor.**
- B4 l.2187: "He had been Governor of Oakhaven for twenty years".
- B1 l.3762: "he had been a Governor for thirty years".
- **Fix:** "thirty years".

**N24. Tobiah's age.**
- B4 l.118: "He was nineteen, and he had been nineteen the whole time Kaelen had known him". B4 l.534: "Tobiah Marsh, nineteen".
- B1 l.3994: "was not going to tell a twenty-four-year-old on a deck at dawn" (about Tobiah).
- **Fix (B4):** "twenty-four", in both places.

**N25. Oakhaven's square and where the Root-shaft is.**
- B4 l.1833: "The Moot-hall on the east side, where the Moot had voted every lease… The Governor's House on the west, with the seal of the dead Queen Maelis over its door. And in the middle, where the old well had been, the black iron head of the Synod's quarry bore. The Root-shaft."
- Book One:
  - l.672: "the well-house with its layers of decrees and the dead queen's glass seal, the Chapel of the Pure Note…, the Greenhall's long timbered front — except that above the roofs to the north, where the Consortium's mooring mast stood over the quarry".
  - The shaft is at the quarry: l.3392 "came out onto the quarry road and saw the town", and the mast is "sunk into the bedrock of the quarry rim" (l.3598).
  - l.2529: the signing is "in the Greenhall, under the pale green seal".
  - The Moot is Whisper-Grove's.
- **Fix:**
  - "The Greenhall on the east side, where the bench had voted every lease…; in the middle the well-house with the dead Queen's seal".
  - For the Grove's ring around the shaft-head, the author must choose: move the ring to the quarry headframe north of the town ("She stood at the top of the quarry road… and looked at where the headframe had been"), or accept that a second shaft-head stands in the square.

### Elapsed-time drift (low priority; Vol VII weeks are eight days)
Book One's Day 1 is 6 Harvestmonth.
- B2 Part One Ch1-3 l.390, "a voice six weeks ruined", and Ch4-7 ll.232, 308, 547 and 741, "six weeks": on 4–7 Ashfall it is about 27–30 days since Rootday.
- B2 Ch4-7 l.901 "three weeks ago in the harvest-house" and l.913 "in three weeks": 16 days.
- B3 Part One l.33 "He had known that for two months" (also ll.419, 529, 585, 623, 963), on 13–21 Ashfall: about three to four weeks since ch. 19. The same chapter says "every night for three weeks" (l.961).
- B4 l.118 "three months ago" for Tobiah's signing: about 68 days.

**Suggested fixes:** "a month ruined", "two weeks ago", "for a month", "two months ago".

### Naming hazards (not contradictions)
- **Three Hespers:** the prologue's singer (B1 l.171), Annet's mother "Hesper and Tam Sowerby" (B1 l.4564), and the Cay's orphan-house keeper (B2, B4).
- **Annet's father "Tam Sowerby"** is next to Old Tam (Brainstorm #24).
- **Hob Tennery** on the Shelf (B3 l.1669) is next to Hob Wendle and the game's old "Hob the tanner".
- **The Cloister tape "Halloran"** (B1 l.5318) is one letter from **Halloway**. Vol III (b) renamed Hester Vell for exactly this reason.
- **Orrin** is used for the sexton Orrin Pale (game and library), Orrin Hale (B3) and the Boy-King Orrin (Bible).

---

## Book facts the bible lacks

The baseline is Series Bible v1.3 (`2ab9ea7`) plus Vols I–VII (b). "Vol VIII draft" says whether the untracked draft already mentions the item, by a text search only.

| # | Fact as the manuscript has it | Source | The game relies on it | Bible v1.3 has | Vol VIII draft |
|---|---|---|---|---|---|
| 1 | **Ivo and Bettis Renn.** Ivo is entry 40,101, cooper of Ashlane, forty-one; his core was requisitioned and is in the *Kestrel*'s third stack. Bettis is entry 40,102, his wife: thirty-eight when taken in 416, **forty-one now**. She carries baskets in the Malting yard, and a coat over her arm at her taking. Sable reverses the press on her; she screams and begs to be put back. | B1 ll.4105–4109, 5020–5076 | Canon pass `ad72340`: Bettis is Ivo's wife and goes to Ivo "in the third stack" | Bettis's entry number only | mentions |
| 2 | **Sable is forty-one** ("I am forty-one years old with a broken arm and two things left in my head"). | B1 l.5868 | Not directly | **Contradicts:** "Age unknown; she has forgotten" | no |
| 3 | **The Aegis is Wren Halloway**, a boy, WG-41,005, son of Jem and Isobel Halloway. | B1 l.4832; B2 l.3237 | The game's "WG-41,005, a boy of the Cloister choir"; the hush-gift child was renamed Linnet because of the Bible's Wren | Updated in The Twelve. **Leftovers:** Sable's Voice line still reads "Entry forty-one thousand, one hundred and twelve. Wren Halloway", and the Aegis's Bonds still say "Sable, who unnamed her". | mentions |
| 4 | **The talking crates** are twelve crates of 36 in the *Kestrel*'s hold, tagged WG-41,004 and up (but see N8). Pim talks to Annet through the side of a crate in the hold. | B1 ll.1305, 2564, 2694–2700 | Canon pass `d9fc079` | Implied ("the crates say names in the hold"); no location for ch. 4 | — |
| 5 | **Hob Wendle** is a field-hand of forty in the Hollow, rooting through his feet since summer. Rooke takes three toes on Rootday with the mute-drops. On the *Kestrel* he roots into the foredeck; Bettany gives him the long drops while Lyra holds his hand, and he goes over the side. | B1 ll.971–975, 2453, 3918–3956 | Canon pass `c9e83b8` | Name only, plus the ch. 13 summary | mentions |
| 6 | **The Tanner twins** are of a family named Tanner ("the Tanner cousins", "the Tanner boys"). They died with Marten and Old Coyle when a bore-head shattered, and Lyra sang them down side by side. They are not the tanner's children. | B1 ll.512, 1087, 1747, 2932, 3986 | The game's tanner, Abner Fenning, has twins "Ned and Wyn Fenning", invented and unrelated | "the Tanner twins" in the audit only | mentions; flags a contradiction |
| 7 | **The Office cutter** is a 40-foot courier-cutter that "could not carry anything heavier than paper and proctors". Its listening horn hunts the *Kestrel*'s own 432 ("Your cargo is not silent"). | B1 ll.5484, 5518–5524 | Canon pass `12ae249` | Ambiguous: "a hold with four hundred and thirty-two voices in it" | mentions |
| 8 | **Book One's dates.** Day *n* = Leaffall *n*; Greenleaf is also used. Mapped to Vol VII: Day 1 (Nullday) = 6 Harvestmonth 419 and the Rite (Hearthday) = 16 Harvestmonth. This follows from B2's 4 Ashfall plus "eleven days" and B1's 18 days, and the library almanack agrees ("a Rite on Hearthday the sixteenth"). | B1 ll.4163–4199, 6198; B2 Part One Ch1-3 ll.19, 214 | `js/calendar11.js` START_DOM = 6 [PROPOSED]; the canon-pass days | Day numbers only; Vol VII reconciles Books Two to Four only | mentions |
| 9 | **The days named.** Ruth Madder's girl is born Day 1 (Nullday). Davin dies at the Boar on Hearthday evening, Day 3. The culvert lure is at the Listening Hour on Massday, Day 4. | B1 ll.248–278, 532; chs 4 and 6 | Canon pass `e25b999` | The audit has Day 4 (Tam) and Day 6 (Church) but not the birth | partly |
| 10 | **Halder Wick:** "I do not know who he was expecting. There is no one left to ask." He is fifty-eight. | B1 ll.4097, 4435 | Canon pass `4c17766` | The table for four, but not the line | — |
| 11 | **The Cloister's name-tapes:** Orry, Dray, Sowerby, Halloran, two Veskes, a Marchant, a Tipp, a ninth not given and a tenth tape gone. Ten cloaks, eleven pegs. | B1 ll.5314–5320 | R2 ("the Cloister's nine tapes are canon's"); the ninth tape is C. Linley [PROPOSED] | "ten names, eleven pegs" | no |
| 12 | **The coda's ring of lamps.** Lyra walks "past the last lamp at the second hour". The strike comes "when it's inside the ring of lamps": Kaelen and the Aegis hit it from both sides. | B1 ll.6028–6040, 6098 | Canon pass `90e2680` | "It bursts"; no ring, no strikers | mentions |
| 13 | **Sable never leaves Whisper-Grove** before the *Kestrel*: "the moment I get on a ship I am a woman who left". Her room is in the Moot-house muniment store, and she first saw a proctor from its gallery. | B1 ll.4153, 4199, 4445 | Canon pass `3c9b261`; R5b's Moot-house | "walked into the mist" (ambiguous) | mentions (Umber) |
| 14 | **Form 9: "Name. Age. Trade."** | B1 ll.4075, 4868 | Canon pass | "three questions", not listed | mentions |
| 15 | **Old Tam** is eighty-one, a night-hummer "since the first autumn of the Hedge" and a basket-maker for sixty years. He sits at the Weavers' Cross and lately the Flume crossing by the tannery culvert. His wife died of the pox forty years ago and called him "Tammy". "Essa" is the game's name, not the book's. | B1 ll.426, 1989–1999 | Canon pass; Tam's letters | Night-hummer; listens to his dead wife | mentions |
| 16 | **Order of 417:** the bells go "in the first year of the quarry" (a peal of six, the town-hall clock-bell, the reed-row wind-bells); Tobin is taken in spring at the Pellow farm, with his lyre found "by the stile"; the Hedge is planted in summer, paid for by the Consortium, planted by the town, with wool by the cartload. | B1 ll.410, 420, 454–464, 3404 | Library rulings 1–3; R2 (the cairn "by the old stile") | 417 events, no seasons or order | mentions |
| 17 | **Ada Pellow** is fifty-one: the mother of the child Tobin saved, who has left milk on Lyra's step since. | B1 ll.3542–3548 | Ruling 1 (the Pellow child) | Name only | mentions |
| 18 | **Tobin's seven wind-reed pipes** hang on pegs in Lyra's house (but see N20). | B1 ll.500–504, 2213 | R2 / R3 (the reed-pipes) | — | mentions |
| 19 | **The eight pump-men:** Edders, Ruhl, Caine, Ott, Sennet, Vey, Marrow, Hale B. They are Whisper-Grove stock, consigned in the ninth month of 417. Twelve worked the pumps and four were saved. | B1 ll.3312–3314, 5270, 6355 | Brainstorm #19 (proposed quest) | "the eight pump-men's names" | no |
| 20 | **The Malting and Moot-house details R5b uses:** Corwin Aye's barrel in the Moot-house cellar ("nineteen years"); the twice-taken man in the Ashlane; the Veil's three rules; the Hollow's 84 souls, 19 of them children. | B1 ll.2543, 4155–4167, 4556 | R5a / R5b | — | partly |

**Naming collision to resolve in the Bible:** Phase 21 ruling 1 names the night sky's band of star-dust "the Chord", and calls it canon. The Bible's Part VII uses "The Chord" for the protagonists' faction. The novels use neither.

**Spotted in passing (game against book, outside this check's scope):**
- **Davin's boots.** B1 l.1949 has Hetty bring them to Lyra. `js/days35.js` has Rooke hold them from Massday.
- **Bettis's age.** The game says "a woman of thirty-eight". B1 has her thirty-eight at intake and **forty-one** now (l.5068).
- **"Thirteen hundred crates."** `js/grove.js` l.20, taken from the Bible's ch. 13 summary, says "thirteen hundred crates in two years". The book's figure is 1,342 cores (N12).
