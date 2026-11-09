# The Library of the Reach: notes for the owner

October 2026. The game has 65 in-world books (about 63,400 words), all English drafts.
- **Sources:** `tools/library/books/*.json`. Each book's `notes` lists its canon sources and every [PROPOSED] invention.
- **Placement:** `tools/library/placement.json` says where each book lives.
- **Build:** `node tools/library/build.js` builds `js/library26-books.js`. The game code is in `js/library26.js` (books) and `js/libraries26.js` (the four libraries).

## How the books were made and checked
1. **Writing.** Seven writers worked from one brief (canon first, no spoilers stated as fact, the Hush never described, names checked against `js/` and `story/`). They covered history, lives and letters, tales and verse, craft and the natural world, faith, law and the press, the wider world, and Whisper-Grove and the Veil.
2. **Cross-check.** One reviewer read all 65 against each other and against canon, and made about 40 small fixes:
   - name collisions between books;
   - dates of the bells, the lease and the Hedge;
   - the morning the orchards went;
   - mild Reach winters;
   - the tongue-stone custom dating from 417;
   - drift-glass, not lodestone, lifting skyships.

   Nothing was rewritten for taste.
3. **Placement.**
   - **Shelves:** the Conservatory (Oakhaven), the Bonded Store (Stillwater), the Moot-house (Whisper-Grove) and the Veil's scriptorium (the Mausoleum).
   - **Elsewhere:** piles where readers live, three vendors, books lying in the world, the keepers' quest books, and one gift.

## The owner's rulings (October 2026), and what changed
The rules:
- **Manuscript against an in-game book or journal:** the manuscript wins.
- **A volume against an in-game book:** the volume stands, and the book changes to match.
- **A book that comes close to a spoiler:** it stays, unless it makes the twist too easy to guess.
- **New lives for minor canon figures:** all fine.

1. **When Tobin was taken.** Spring 417, at the Pellow farm, before the Hedge (the manuscript). Changed to match:
   - Tobin's journal (js/tobin.js) now ends that night at the Pellows' kitchen table. The pages were re-dated and re-ordered: the bells move to 417 and the hounds to Stillmonth 417. The page about planting the Hedge is gone, and the chapel's 412 page keeps its bells.
   - His register (upgrades.js), the cairn slate, the inquiry's logbook lines and the prologue's line about the voice follow the manuscript. The "Wearer", the North Gate and the culvert are gone from them, and the Madder child is the Pellow child.
   - In the library, The Wool Wall and Off the Slate now say spring. The Greenroot letter answering Tobin is set in winter.
2. **When the bells were taken.** 417, "the first year of the quarry", for the bore's teeth (the manuscript). The chapel's chalk, the townsfolk line about the Church and Tobin's pages now say 417. The blade of 415 is ground from an old cracked treble.
3. **When the Hedge was planted.** The summer of 417, "two summers ago", paid for by the Consortium (the manuscript). A First History of Oakhaven now says summer, and The Wool Wall says Tobin did not live to see it. Book Four's "autumn" is left for that book.
4. **Bell-hours in the Veil's House.** Vol V's "second bell" is the House's own bell. Vol VII §5 retires only the old eight carillon bell-hours, so the two volumes agree and the Veil books stand.
5. **What lifts skyships.** Both: a Fortis-cut lodestone core that cancels the mass (Vol I) and drift-glass lift-tanks that give the lift (the manuscript). Going Up, The Tank and the Envelope and Fairweather's Companion now name both.
6. **Candles facing in at Canopy.** Vol VII and VII (b): Canopy is old and has not been held since 416. Every Grove book that keeps it is dated 416 or earlier, so all stand.
7. **Hounds in the Reach before 417.** The manuscript has every hound between the quarry and the Flume hearing Tobin in the spring of 417, and everyone knowing by then that bells brought them. Hounds in the wider Reach before 417 stand. Tobin's "first hounds" became the hounds at the orchards, at the turn of 417, and so did The Wool Wall's.
8. **Veil scribes' names.** No volume names them, and Sable already fits the pattern. The ink and pigment designations stand [PROPOSED].
9. **Calendar names.** Tomas now says Firstfruit, not August. The game's text uses only Vol VII's months, and Leaffall stays in the manuscript.
10. **Pre-Unnaming names in the Spectral Woods.** Vol II's "no living names" stands. The Grove books name only people before 416 (the manuscript names them too, and the Ledger holds those names). The Moot-house's shelver is unnamed.
11. **The Eight Keepers.** Too easy: the Owl's promise pointed straight at the Compact, so "We were told that somebody would" is cut. The fable keeps its Sparrow.
12. **Hints at the harvest.** They stay. The midwife's clerks ask for "the voice" and do not say why. "The Canopy keeps the dead" is a Grove saying, and Vol V and Tobin's own pages already say it. The older lore book bk_veil said more than that, and has been softened (below).
13. **New lives for minor canon figures.** All fine.

**Also fixed:** two Cantors called Ilse. Ilse Brennan is canon (Book Four), so the Greenroot Cantor (Phase 9, [PROPOSED]) is now Mabyn Verrow.

**Softened at your call:** the lore book "The Folding of the Silent Veil" (upgrades.js, bk_veil) used to state the harvest as fact: names removed from living debtors to make orderly workers, at 741 Hz, with memories surrendered as bond. It is now a dry Office memorandum, dated c. 300 SR by the Series Bible's timeline. The Veil is folded into the Synod as the Office of the Catalogue; its House stays open under the Office's seal. The Registrar-General finds the order's ways of recording a name "have uses beyond the keeping of the dead". The objecting scribes are sent to field ledgers and "not to be told what the ledgers are for". That is a suspicion, not an answer.

## Weaker books (for a later pass)
- **The Lamplighter's Second Note and A Year of Nights** share a device: an Oakhaven lamplighter courting with a two-note lamp reed. One should change.
- **Fairweather's Companion and A First History of Oakhaven** read more like tours than stories.
- **The Little Catechism** is mostly a list, saved by its last line.
- **Several Whisper-Grove books** lean on the same "before the fall" irony, and they blur when read together.
