# Game - R11 Phase 2 New In-Game Text (for review)

The hero square (9 Nov 2026, repo Echoes-Of-The-Shattered-Octave-3D, branch `claude/r11-phase2`). Three teams: LOOK (light, colour, wet cobbles, the bench camera, the art bible), SQUARE (Oakhaven's square dressed to picture 1's density), HANDS (the first-person sword, gloved fist, glass arm and the other weapons). No new player-facing strings this phase. Everything below is lore-bearing art. Anything invented is marked **[PROPOSED]** for the author's ruling; the rest is checked against the books, the Library of the Reach or the game's own text.

**Owner's rulings (9 Nov 2026):**
- The cobbles are wet only when it rains (rain or storm); dry otherwise and indoors. Done in r11core (phase 2 branch).
- The Chapel stays where the map has it (the east district); the bench camera keeps its framing without the Chapel.
- The Phone draw budget may run a little over 200.
- The [PROPOSED] items below are listed for the owner's review; nothing ruled yet.

Checked by the Commander:
- The iron-oaks' autumn leaves are "a kind of rust-pink, like a stain that has been scrubbed" (Book One, ch. 1, "The Tending Note"); the iron-oaks stand in the square ("Outside, in the square, the iron-oaks began to ring").
- The Chapel steps: "eleven of them, out of the best seam the quarry ever gave" (Library of the Reach, "Stone, Then Glass"); the hare-shaped flaw on the third step from the top follows that story, whose own canon notes mark it [PROPOSED].
- Kaelen's glass arm keeps its canon green vein, "bright as a river under ice".
- Phase 1's lore fixes are kept: the riveted lattice mooring mast, awnings "the colour of old wine and old moss", the empty belfry, no castle.


---

# R11 phase 2, team LOOK: new text

## New player-facing strings

None. LOOK changes no menu, label, message or Options row (the "Art style" row of phase 1 is unchanged), so there is no
`tools/i18n/r11p2-look.tsv`.

## [PROPOSED] items (docs/graphics/art-bible.md)

- Window boxes on the upper storeys of lived-in houses only, never on the shuttered or empty houses. [PROPOSED]
- Wet cobbles by default: Oakhaven's square is damp under the Hush's grey sky even when the weather is not rain (no
  falling rain unless the weather says rain; soaked in rain, drier under snow). [PROPOSED as a standing look; the owner's
  picture 1 shows it]
- LOOK's additions to the owner's ban list, for him to strike: no lens flares, no chromatic aberration, no film grain, no
  vignette beyond the HUD frame, no god rays.

## Canon kept

- Iron-oak bark is grey (swatch 11); the Queen's seal is dark bottle-green glass; cyan-violet only for light-glass and
  sound magic; the green vein ("bright as a river under ice") is the arm's alone; no castle in Oakhaven's views.

---

# R11 phase 2, SQUARE: new text and lore-bearing art (for the owner's ruling)

## Text
No new words are drawn or shown. The inn's board keeps phase 1's "THE BOAR & DULCIMER" (French pair already in
`tools/i18n/r11-kit.tsv`). `tools/i18n/r11p2-square.tsv` exists with a comment line only.

## Art grounded in the books or the game's text (checked by grep in the main repo)
- **The iron-oaks in the square** (map: the two plain `oak` decos at 31.5,20.5 and 31.5,26.5; no tree added anywhere):
  old, wide, a short massive bole on root flares, limbs reaching out nearly level, ~15.5 m tall. Grey bark (World Bible /
  game text: "An iron-bark oak, grey, as thick as a tower"; "bare and grey"). Leaves **rust-pink** (Book text: the leaves
  "had turned red in the autumns of their childhood ... and now they turned a kind of rust-pink, like a stain that has
  been scrubbed"), with a dull ochre leaf among them. The p20b copper and green variants keep their colours. They sway
  slowly in the vertex shader (the books: "the iron-oaks ring in the wind"; no sound is added).
- **The Chapel steps: eleven** (in-game library book *Stone, Then Glass*, Silas Hurlock: "I cut them the summer I was
  twenty-two, eleven of them"; Book One ch. 5: chapel steps cut from the quarry). Four broad low ones out on the street,
  seven inside the porch; the door now stands at the top of them.
- **The hare in the third step from the top** ("The third step from the top has a flaw in it shaped like a running
  hare"): a faint grey flaw on that tread. Note: that book's own canon notes mark the hare flaw **[PROPOSED]**, so this
  follows a [PROPOSED] detail.
- **The Greenhall steps** (Book One: "He stood on the Greenhall steps"; "the line below the Greenhall steps"): three broad
  steps across the entrance bay, then the porch's own.
- **The Boar & Dulcimer's casks of small beer** (story: "The Boar & Dulcimer's cellar keeps its casks of small beer"):
  five casks by the inn door, three crates of empties on the other side.
- **The cooper's shed** (map label "A cooper's shed"): casks in a five and a three. **The wool-factor's** (map label):
  three bound wool bales. Trades already dressed in phase 1 (baker's, chandler's, surgery, mill...): crates in threes.
- **Chimney smoke** only from the chimneys `js/firesmoke.js` already smokes (the map's chimney decos).

## [PROPOSED] - invented detail the owner should rule on
1. [PROPOSED] **Ivy** on the stone ground storeys (a third of street faces, more on all-stone houses), up the Chapel's
   buttresses and between its lancets, and at the Greenhall's ends. The only ivy in the books is on a standing stone
   (stones47: "Ivy on the north side, and under the ivy the stone is warm"); none is named in Oakhaven.
2. [PROPOSED] **Window-boxes** under about one upper window in six, herbs and the last flowers going over. The books' only
   window-box is the dead one on Bell Yard (Book One ch. 15), not in Oakhaven.
3. [PROPOSED] **Wall-arm lanterns** at most house doors (iron arm, brace and curl; lit, a small warm light each). They are
   plain lanterns, not hush-lamps: no reed in the chimney. The inn's two keep their reed (phase 1).
4. [PROPOSED] The inn board's **wrought-iron bracket** (wall plate, scrolled brace, curl at the tip, two rings).
5. [PROPOSED] **Rain butts** (an open cask) at some house corners; stallholders' **stock** (three crates or three casks)
   behind each market stall.
6. [PROPOSED] Door iron: strap hinges with split ends, a ring pull, a key plate, nail heads.

---

# R11 phase 2, team HANDS: text and lore

## New player-facing text
None. `js/r11vm.js` draws the hands and weapons only; it adds no strings (so no `tools/i18n/r11p2-hands.tsv`).

## Canon followed
- Kaelen's left arm is light-glass, cyan, lit from inside, "with the vein of sea-green moving through it like a river under ice" (Book text). Drawn as ONE sea-green vein running up the forearm under the back of it, through the wrist into the palm toward the middle finger, with light moving along it.

## Visual inventions a player could read as lore: [PROPOSED]
- [PROPOSED] The Short Sword's crossguard has swept quillons that turn toward the blade and end in rounded terminals, with a small langet up the blade; its pommel is a faceted scent-stopper. (Picture 1's sword, not described in the books.)
- [PROPOSED] The Synod Longsword: a straight guard with ball ends and a wheel pommel.
- [PROPOSED] The right glove is brown leather with three stitched "points" down the back and a flared gauntlet cuff stitched round its rim and down its outer seam.
- [PROPOSED] The Tuning-Fork Spear's head is literally a bronze tuning fork: a U-shaped yoke on a bronze socket and two long pointed tines.
- [PROPOSED] The Bell-Bronze Mace has a seven-flanged bronze head on a bronze shaft with a leather-wrapped grip.
- [PROPOSED] The Cinderhold Steam-Maul's head is a chamfered iron block with brass-capped faces and a brass band.
- [PROPOSED] The Glass-Shot Pistol: an octagonal steel barrel, brass furniture, and a cyan glass chamber ahead of the lock (the one place on the right hand where the resonance colour appears, since it is glass).
- [PROPOSED] The Rust Coast Crossbow: a steel prod curved forward, a front stirrup.
- [PROPOSED] Carder's Knife: single-edged, a wooden handle with two rivets.
