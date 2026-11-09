# Game — Phase 17 New In-Game Text (for review)

Phase 17 "Beyond Book One" adds four things reached only from the Extras menu on the title screen. Everything is set after Book One; everything marked [PROPOSED] is invented for the game and needs the author's yes or no.

## Questions for the author
1. **The prologue's name and moment.** Any Oakhaven scene before Book Four would contradict the books (Lyra is aboard the Kestrel through Books Two and Three), so the "prologue" plays Book Four's return through the river gate on 19 Frostmonth and is titled "Prologue: The River Gate". Keep that, or call it something else?
2. **Unlocks.** The extras open after either Book One ending ("Grab the Line", end of Part Two, or "Not yet"), so a save already in Part Three counts. And there is an "Open them anyway (they spoil the ending)" button. Keep both?
3. **The Long Night's three Cantors** (Marl Dunning, Tansy Quill, Jory Fenn) and the lullaby's contour and timing are invented.
4. **"Stillmonth" in French** is rendered "Mois d'accalmie" (not yet in the glossary).
5. **Cantabile inventions:** Marrin Tace, the Harbour Office staff, Teel's rhyme, the slack-key dues and Article Sixteen salvage.


---

## Phase 17 EXTRAS — new player-facing text (for review)

All strings live in `TX` at the top of js/extras17.js; French in tools/i18n/p17-extras.tsv.
This module is menus and plumbing: it invents no places, people or lore. Nothing here is [PROPOSED] canon;
the only "fact" it states is that the extras take place after Book One.

### Title screen
- Button: **Extras**

### Spoiler notice (once per browser)
- Heading: **Before you go on**
- These extras take place after Book One and spoil its ending.
- They open by themselves when you finish Book One, by either ending.
- Buttons: Show me the extras / Back to the title

### Extras menu
- Heading: **Extras**
- Short chapters set after the end of Book One. Each one runs on its own save: your Book One game is put aside, untouched, and given back when you leave.
- (finished) Book One is finished in this browser. The extras are open.
- (opened early) Opened early, at your word.
- (locked) The extras open when you finish Book One, by either ending.
- Button: Open them anyway (they spoil the ending)
- No extras are in this build yet.
- Each card: the extra's title; tag **An extra — after Book One**; its blurb; then one of
  - Locked: finish Book One to open it.
  - Not open yet. (the extra's own unlocked() said no)
  - Play / Continue from its save / Begin it again
  - Last time: <the result the extra passed to finish()>
  - Your last visit was interrupted (the page was closed or reloaded). It begins again.
  - This extra could not start. Your Book One game is untouched.
- Checker: **Finished Book One already?** — Paste a save code from a finished game, or choose its file. It is only read, never loaded.
  - Buttons: Check the save / Check a file…
  - That traveller finished Book One. The extras are open.
  - That save has not reached either ending of Book One yet.
  - That did not read as a save.
- Back / Close

### Ending screens (both Book One endings)
- The extras are open: Extras, on the title screen. They take place after Book One. (also a message when a finished save is loaded)

### Inside an extra
- Banner (top right): **An extra — after Book One** / <the extra's title>
- Options: "Return to title" reads **Leave the extra**; the hardcore switch is hidden; the tag line above the list.
- Death screen: extra button **Leave the extra**
- Save game: This extra keeps one save of its own, for as long as the page is open. Your Book One saves are put aside until you leave.
  - The extra's save — empty / Save here / Saved. This is the extra's own save.
- Load game: Only this extra's own save opens here. Book One saves open from the title screen once you leave.
  - Load / The extra's autosave (before the fight) / There is no save for this extra yet.
- Refusals: Only this extra's own save opens inside it. / That save belongs to an extra. Open it from Extras on the title screen.
- Stock name for an extra's traveller (the extra may rename): Traveller

### Options > Graphics & access
- **Winter in the extras** — snow on the ground and roofs, falling snow and a cold grade in the after-Book-One extras. Off: they look like the rest of the game.

---

## P17 PROLOGUE — review text: "Prologue: The River Gate" (js/prologue17.js)

Source: Book Four, Part One, Chapter Four ("The Root"), from the Greenroot road to Dorran Sedge at the river gate, put into the game's second person and present tense. Unmarked lines follow the book's own sentences and dialogue (dialogue verbatim). [PROPOSED] = this team's words or facts. French: tools/i18n/p17-prologue.tsv.

### Why this moment
- Book Four: on Rootday 19 Frostmonth Lyra "came through the river gate in the dark, and stood, and did not know where she was"; Dorran: "They said you'd gone up in the airship" — she has not been inside the Hedge since the Kestrel left in Harvestmonth.
- Book Two Ch.1-3: she is aboard the Kestrel from Oakhaven to Port Cantabile (4 Ashfall, twenty days out) and on through Ashfall (Book Three: the Watch, the edge of the Woods, 28 Ashfall).
- The leaves fell all at once on Nullday 18 Frostmonth ("Nullday night. Last night but one"). So the houses in the crowns + the fallen leaves + the voice outside the Hedge first coexist, for Lyra, on the evening of the 19th. Any earlier return would contradict Book Four. The extra stops at "You'd best come and see the Governor"; the ring of trees, Aldric Vance and the old stair are left to the book.

### Invented facts and looks [PROPOSED]
- The map layout (milestones II–V, where the graves lie, the numbers: ~40 done graves, 10 bare ones from the fifth milestone on; the stone piles; the clearing under the Hedge; the river and the river gate east of the North Gate; the river street's course and which oak holds what).
- Companion looks: Seraphina = the Legion's plate turned white with a held sword; Ignatius Crane = the Flambeau's robes with the fire out and a woman's apron; Solenne = a dark-clad woman with broken black-gold wings and copper at the throat; Dorran Sedge = a big townsman, white beard, lantern. The Aegis uses the game's own sprite.
- Lyra's face = creation portrait 2 (red braids). Her lantern on the road at dusk.
- Play-only choices: "Listen" before writing NOBODY (the book's own description of the voice); "Answer him" before NO (the book's own breath-only beat). The companions set stones every few seconds once the Aegis has begun.

### Every player-visible string

- Prologue: The River Gate  [PROPOSED]
- Rootday the nineteenth of Frostmonth, 419. Lyra Ashgrove, with no voice, walks home to Oakhaven through the snow.  [PROPOSED]
- An extra — after Book One
- Rootday the nineteenth of Frostmonth
- An extra — after Book One. It is set two months after the Greening, and it spoils how Book One ends.  [PROPOSED]
- There is snow on the Greenroot road. There has never been snow on the Greenroot road in your life.
- The Kestrel set you down at Greenroot Hamlet on Memoryday, on its way to the Woods and the Coast. You have walked for two days. The snow began on the first night.
- You are Lyra Ashgrove, Cantor of Oakhaven. You have no voice. There is a slate on a cord round your neck and chalk in your pocket, and your burned hand is bound in clean linen.
- Walk on.
- You cannot speak. What you say, you write on the slate. The Song key whistles, thinly, and it hurts.  [PROPOSED]
- The Greenroot road
- An iron-bark oak, bare and grey, with the snow along its limbs. It does not ring.  [PROPOSED]
- Iron-bark oaks, close and grey, with the snow lying on them.  [PROPOSED]
- A dull wet knock. No bell.  [PROPOSED]
- The second milestone.  [PROPOSED]
- The third milestone.  [PROPOSED]
- The fourth milestone.  [PROPOSED]
- The fifth milestone.  [PROPOSED]
- At the second milestone a branch comes down in the wind, an oak-limb as thick as your thigh, ten yards ahead. It strikes the frozen ground with a dull wet crack.
- No bell. In the Reach, since 417, any blow on wood has rung. An oak-limb falling should have tolled like struck bronze, and brought every hound for a mile. It lies across the road in the snow and is only wood.
- "Is that—" Seraphina looks at the limb, then at you. You nod.
- "Is that good?" You do not know how to answer. You have no slate free: your good hand is holding your coat shut at your throat, and your burned hand is in your armpit for the warmth.
- An oak-limb as thick as your thigh, across the road. Grey, and dead, and silent.
- There are graves along the road. Low mounds of turned earth under the snow, a stride long, some shorter.
- You stop counting at the fourth milestone, at sixty. They go on.
- A grave, set the Reach way: a stone at its head, flat side up, with a smaller stone on top. Stone on the tongue, stone on the stone. This one is quiet, and the next person along the road will not dig.
- A grave with a stone at its head, and nothing on it. Whoever buried this one had no time to do it properly. Or had no stone. Or did not know how.
- You have no stone to set. There are flat stones under the snow at the side of the road.
- Stones, under the snow at the side of the road.  [PROPOSED]
- You find a stone under the snow at the side of the road, flat, the size of your palm.
- You set it on the marker. Stone on the stone. So that the next person to come along the road will know.
- A small grave
- A child's. A stone at the head, and nothing on it. Whoever buried this one had not had time to do it properly. Or had not had a stone. Or had not known how. Or had been the last of their family on the road, and buried the child alone, and walked on.
- Kneel, and put your good hand flat on the turned earth.
- It is frozen hard. Nothing comes up through it. No hum. No growth. You had braced for it, for the person in the ground still growing. There is nothing at all: cold earth, and a small shape under it that has stopped. You do not know whether to be glad.
- Set a stone on the marker.
- Go on.
- Behind you the Aegis's knee grinds as it bends, and iron clicks on stone. It has found a stone too. It has set it on the next bare grave along.
- After a while Seraphina begins to do it too, and then Ignatius Crane with his one good hand, and at the last, without looking at any of you, Solenne.
- Iron clicks on stone behind you: another bare grave has its stone.  [PROPOSED]
- The Hedge is grey. It was green, always; even in the Greening it was green. Now the thorn is bare and grey and the wool between the roots is grey and sodden, and the whole long wall of it curves away round the hill in the dusk, under the snow, like the spine of something dead.
- The Hedge: blackthorn and briar three men deep, with raw wool packed between the roots to swallow the town's sounds. It is grey now. The wind goes through the bare thorn and does not even whistle.
- The North Gate. A great iron grille in an arch of stone, rusted shut, with the thorn grown through it. It has been sealed since the Greening, only two months. It looks as if it had been shut a hundred years.
- A gatepost of the North Gate, capped with snow.  [PROPOSED]
- This is where Ada Pellow went in, on the day of the Greening, with the town going under the oaks behind you. The Hedge spoke out of the thorn in the voices of Oakhaven's dead, and she heard your father's voice, and climbed in toward it. You had sixty people behind you. You kept walking.
- The Hedge is grey and silent in the snow. Good, you think.
- The river gate is round to the east, along the outside of the Hedge. You know the way.
- The river gate, where the river goes in under the Hedge.  [PROPOSED]
- Not tonight. The road goes one way.  [PROPOSED]
- Not here. Not yet.  [PROPOSED]
- "Lyra-love."
- You do not turn round.
- You stand in the road with your back to the Hedge and your hand at your throat, and you do not turn round, and you do not breathe.
- "Lyra-love. Is that you?"
- Listen.
- Do not turn round.
- Low. Warm. A little hoarse, the way it always was at the end of the day, from singing in the orchards. A man's voice. Your father's, as it was before they took him.
- The Hedge was planted to swallow sound. Everything Oakhaven said for two years went into the thorn and was kept there: every word, every cry, every song. And your father lived inside it for the last weeks before they took him, in the autumn it was planted, saying your name every evening at the supper table.
- "Lyra-love. Come round where I can see you."
- Who is that?
- Seraphina comes up beside you in the snow, and stops. Behind you, the Aegis's knee grinds.
- "Lyra," says Seraphina, very low. "Who is that?"
- Take up the slate, and write.
- NOBODY
- You lift the slate on its cord and find the chalk in your pocket. Your fingers are stiff with cold. It takes you a long time to write it.
- NOBODY.
- You hold it up. Then you walk away from the North Gate along the outside of the Hedge, toward the river gate, in the dusk. You do not look back. Behind you, very faint, through the grey thorn, the voice says your name once more, the way it always said it, with the little fall at the end.
- Lyra-love.
- Like a question.
- Walk on.
- Through the grey thorn, a man's voice: "Lyra-love."  [PROPOSED]
- Oakhaven
- You come through the river gate in the dark, and stand, and do not know where you are.
- Houses. In the trees. Forty feet up, sixty, eighty, wedged in the forks of great grey trunks as thick as towers. Tilted, broken-backed, with their doors hanging open on nothing.
- The leaves are gone. Every one. They lie a foot deep in the street under the snow, brown and grey and black, and frozen, and they do not rustle when you wade through them.
- "When?" says Seraphina. Her breath smokes. "When did they fall? They'd fall slowly. In autumn. It's not—"
- You do not know.
- "Nullday," says a voice from the dark. "Nullday night. Last night but one, at the dead hour. All at once."
- An iron-bark oak, grey, as thick as a tower. It came up through the cobbles and the cellars and the floors of houses, and carried the houses up with it.
- A cottage turned on its side in the crown of an oak above the river street, with its chimney pointing at the river.
- A shop-front sixty feet up in the snow, the painted board still over the door: HALE & DAUGHTER, CORDWAINERS.
- A cart, up in the crown of an oak.
- A bed, iron-framed, caught in the fork of a branch, with its blankets frozen to it.
- A house wedged in the fork of a great grey trunk, broken-backed, its door hanging open on nothing.
- An iron-bark oak with not one leaf on it.  [PROPOSED]
- The Hedge, from the inside. Grey.  [PROPOSED]
- The river gate, back out to the road.  [PROPOSED]
- Dorran Sedge
- An old man comes out of the trees on the far side of the river street with a lantern of his own, wading through the leaves. He stops, and holds the lantern up, and looks at you all: at the Aegis, nine feet of iron with DEFEND THE SINGERS on its chest and the rosy light in its helm; at the knight in white with the Sun-Blade; at the tall woman with the wings; at the priest with the translucent hand, in a woman's apron. And at you.
- His face does a thing. "Cantor," he says.
- You know him. It takes you a moment. He is thinner than he was, and his beard has gone white. Dorran Sedge, who kept the river gate for twenty years and the reed-beds at Reedside before that. He has a wife called Mabbie and a voice like a bullfrog, and he sang bass in the orchard choir every Longest Night you can remember, before 417.
- Lift your good hand.
- "Cantor," says Dorran Sedge again. He does not move. He stands in the leaves with the lantern held up and looks at you as if he is afraid that if he moves you will not be there. "Cantor Ashgrove. They said— The ones that walked out. Harvestmonth. They said you'd gone up in the airship and the airship'd gone down in the Woods. They said the Church had you. They said—"
- He stops. He has seen the slate round your neck, and the way you are holding your throat.
- He comes across the river street to you through the leaves. He is a big man, and he has always been slow. He looks at your throat for a long moment, and then, very carefully, the way you lift something that might break, he puts his free hand on your shoulder.
- "Does it ring?" says Dorran Sedge.
- The oldest thing in the Reach. Are you well. You have said it a thousand times, to the burl-sick in the Hollow, to women in labour, to old men in the orchard, to children who had fallen out of trees.
- Answer him.
- Write on the slate.
- You open your mouth. Nothing comes out. Only breath, and a long raw pull low in your throat where the torn place is. You shut your mouth. You stand there.
- NO
- You take up the slate and write on it, very slowly, with your stiff fingers, in the square capitals you have been writing for two months.
- NO.
- Dorran Sedge looks at it for a long time.
- "No," he says. "No. Nor me." He takes his hand off your shoulder. "Nobody says it now, Cantor. Not since Nullday. Nobody's said true enough since the leaves came down."
- He turns, and holds his lantern up toward the dark at the top of the river street, toward the square. "You'd best come and see the Governor. Before you see anything else. He's been asking for you. He's been asking every night." He stops. "He doesn't ask so loud now. You'll have to go close."
- Follow him.
- Follow Dorran Sedge up the river street.  [PROPOSED]
- Dorran Sedge, with his lantern held up toward the top of the river street.  [PROPOSED]
- Dorran Sedge stops in the leaves, and waits for you, with the lantern held up.  [PROPOSED]
- The Grove
- It is called the Grove now. Dorran tells you that on the way up the river street, wading. The ones at Reedside have called it that since Ashfall, and the name has stuck. The Grove. As if there were no other.
- Here the prologue ends. What is at the top of the river street, the books will tell.  [PROPOSED]
- Stones you set on the stone, on the Greenroot road: {0}.  [PROPOSED]
- Return
- Seraphina: the knight in white, with the Sun-Blade.
- The Aegis: nine feet of iron with DEFEND THE SINGERS on its chest, and in its helm, faint and rosy, like a hand over a candle, the light of the core.
- Ignatius Crane: the priest with the translucent hand, in a woman's apron.
- Solenne: the tall woman with the broken black-gold wings.
- Seraphina
- The Aegis
- Ignatius Crane
- Solenne
- You put your lips together and whistle the tending note, thin and breathy. It hurts, lower down, where the breath goes up past the torn place. You taste iron.
- The slate  [PROPOSED]
- A slate on a cord round your neck, and a stub of chalk in your pocket. You write in square capitals.  [PROPOSED]
- A flat stone  [PROPOSED]
- A flat stone the size of your palm, from under the snow. For a grave that has none on its marker.  [PROPOSED]
- Rootday the nineteenth of Frostmonth. Two days on foot from Greenroot Hamlet, where the Kestrel set us down. There is snow on the Greenroot road, and the oaks do not ring.  [PROPOSED]
- Graves all along the Greenroot road, set the Reach way: stone on the tongue, stone on the stone. Some have no second stone. I set them where I could.  [PROPOSED]
- At the North Gate the Hedge said my name in my father's voice. I wrote NOBODY, and went round to the river gate.  [PROPOSED]
- Oakhaven is a wood. The houses are up in the trees, and every leaf in the town is on the ground.  [PROPOSED]
- Dorran Sedge, who kept the river gate, is still here. He asked me does it ring. I wrote NO. He is taking me up the river street, to the Governor.  [PROPOSED]

---

## A trip to Port Cantabile: player-facing text (for review)

Team CANTABILE, Phase 17. Source: js/cantabile17.js. French: tools/i18n/p17-cantabile.tsv (322 lines, one per string below).

### What is canon and what is [PROPOSED]

**Canon (from the author's Port Cantabile material, kept as written or closely paraphrased):** the town as a cliff harbour with the Salt Stair; the Harbour-Queen Oona Salt and her bell rule (one stroke for every soul that enters the water, then silence so the harbour can count); Auld Bessa, the last Reef-Reader; the winter reef-song climbing a key an hour from the lowest and falling back at the turning; slack water (the key before the turning) as the moment dues are paid, to the Harbour-Queen's own hand; Articles Nine, Twelve and Sixteen; Marrin Tace and Jory's vox-bottle (J. TACE, a four in chalk on the wax); the Office's receiving clerk and his six-sovereign offer; the Flambeaux holding the counting-house; the Driftwood Cay graveyard with bell-hooks and the bare ones; the Kestrel on the mast-tower; Mags signing.

**[PROPOSED] (my inventions):** Article Twenty-One; the six-landing arrangement and which shop sits on which landing; Teague, Fenwick Sloe, Hollis Teel's rhyme, Marlow Quain, Hesper's four houses on the Yard; the gauge-valve errand and its price; the salvage crate; the pilot's whistle as Tace's thanks; the grave-bell price (one sou for Hesper, one sovereign for you); the unasked stroke of the Mole-bell while you walk; all numbers in the balance table; every description line.

**Not staged, by rule:** the Burning, Bettany's death, the Book Two counting-house murder (the door stays closed and nothing opens it). The Hush is never described; nobody screams.

### Balance table

| Thing | Value |
|---|---|
| Purse on arrival | 20 sovereigns (topped up) |
| Harbour dues | 6 sovereigns, to Oona Salt at slack water [PROPOSED amount from the board] |
| Valve gauge | 5 sovereigns plus the Harbour receipt |
| Salvage crate | worth 10, the Harbour takes a fifth: you keep 8 |
| Grave-bell | 1 sovereign at the chandler (shop price) |
| Sale of the bottle to the Office | 6 sovereigns (and the ending in which Oona never rings) |
| Tace's thanks for ringing | 6 sovereigns and Jory's whistle |
| Reef clock | 6 keys (E F# G A B C), 24 s each, slack = B (key 5 of 6); the clock holds still in dialogue |
| XP | dues 20, valve 15, bottle 45, bell 10, salvage 5 |
| Spend if you do everything honestly | 6 + 5 = 11; income 8 + 6; you cannot run dry |

### Flags (all p17c_, small validated integers)

act, q (0..2 dues), valve, btl (0 none, 1 carrying, 2 rung, 3 sold), bell, salv, seen, heard, reads, fin, shan, bes, met, rec, hung (bitmask of hooks). Nothing outside the p17c_ prefix is written. Winter is not saved.

### Every player-visible string (registration order, roughly by place)

1. A trip to Port Cantabile  

2. An errand ashore from the Drift-Kestrel: the Long Mole, the Salt Stair's six wet landings, a harbour that sings the hour, and a bottle nobody has opened.  

3. An extra: after Book One  

4. Memoryday, the seventh of Ashfall, 419 SR  

5. The Drift-Kestrel lies on the Harbour's bench at the head of the Long Mole, murmuring on her mooring, and every hand she has is wanted aboard. Pennick has a list. Vane has a purse. You are the one who can be spared.<br><br>Pay the Kestrel's dues to the Harbour. Fetch the gauge-valve from the chandler on the third landing. Be back at the mast before dark.<br><br>Mind the Stair. Every step is wet.  

6. Go ashore  

7. Port Cantabile, the seventh of Ashfall. Pennick sent me ashore from the Kestrel with a list and twenty sovereigns of Vane's money: pay the mooring dues to the Harbour, fetch a gauge-valve from the chandler on the third landing, and be back at the mast-tower before dark.  

8. Port Cantabile. Salt, tar, rum, fish, lime and rot, and sun off the water moving on every wall. Nothing here is still.  

9. The Kestrel is moored at the mast-tower at the head of the Long Mole. The Lantern Yard is the lower town. The Salt Stair climbs the cliff in six wet flights, with a shop on the landings, to the counting-house at the top.  

10. The mast-tower: sixty feet of iron rungs, and the Drift-Kestrel on her mooring at the head of it, murmuring.  

11. The foot of the mast-tower. Iron rungs, wet, going up into the Kestrel's shadow.  

12. The derrick on the Mole-head. The Articles of the Free Captains are kept from here, and everyone on the Mole knows how.  

13. The Mole-bell, in its iron frame, with a rope hanging to the stones. It is rung once for each soul that goes into the water. Then nobody speaks, so the harbour can count.  

14. You do not touch the rope. It is the Harbour's, and it is rung for the dead, and nobody has asked you to ring it.  

15. A moored boat. At her shroud-head hangs a bar of small bronze tubes, and the wind plays it.  

16. A coil of tarred rope, laid down the Harbour's way, left hand over right.  

17. A net drying on poles. It smells of the sea, and of what the sea would rather keep.  

18. Washing on a line between two posts. Everything here dries in the wind, and is salt again by noon.  

19. A gull on a bollard, giving you the look of someone who is owed money.  

20. A harbour lamp on an iron post. At dusk they light the Stair one landing at a time.  

21. One of Hesper's four houses. A row of small boots by the door, and the door is shut for supper.  

22. A house of the Lantern Yard, lime-washed, with salt streaked down its face. Nobody is at the window. Somebody is behind it.  

23. THE HARBOUR OFFICE. Dues, bench and bell. Under it, in chalk: THE ARTICLES ARE READ AT NOON.  

24. Cliff. Wet, grey, furred with weed at the foot. The Stair is cut into it.  

25. A rail of iron stanchions in lead pockets, and two strung cables. Beyond it the drop starts at thirty feet on the first flight and ends at a hundred and ninety on the sixth.  

26. Forty-one steps in this flight, and every step is wet. A gutter runs down the middle all day with the overflow of the cistern at the top.  

27. A lantern on a hook, small and gold, with a washing line beside it.  

28. Listen to the reef  

29. The foot of the Salt Stair. Six flights up the cliff, and numbered landings, and at night a zigzag of small gold lamps.  

30. A crate wallowing off the Yard steps, roped to nothing. Article the Sixteenth: what lies below the tide-mark belongs to whoever brings it up. The Harbour takes a fifth.  

31. The Yard steps, and a ring in the water where the crate was.  

32. You hook the crate in with the Yard's boat-hook and haul it up the steps. A fifth goes to the Harbour's box, honestly, and you keep the rest.  

33. Whatever was in the crate is in your purse now, less the Harbour's fifth.  

34. The Long Mole. Granite blocks, green at the water, and an iron ring every few paces to make fast to. The water goes by on both sides and the whole arm hums faintly with it.  

35. From here the whole harbour lies open: the Mole, the boats at their moorings, the reef green under forty feet of water, and out past the harbour mouth, low and grey, the Cay.  

36. A bench cut out of the landing wall, worn to a dip by a hundred years of people getting their breath. You sit a moment. The Stair goes on beneath you, wet.  

37. The cistern at the top of the Stair: green slate, a spout, and the overflow running away down the steps all day.  

38. A gap in the rail, lashed across with a spar. Somebody has hung a lantern on it, and the lamp is lit.  

39. Nobody sleeps ashore at Port Cantabile. If you are tired, the Kestrel has a bunk, and the Coast has rules about the rest.  

40. The light is going. Somewhere on the Stair a lamplighter starts at the bottom. Mags will want you back at the mast before the last lamp.  

41. The Mole-bell rings once. The Yard stops talking. A woman on a doorstep puts down her net, lifts her face to the sea and counts, with her lips. Nobody says whose it was. Then the harbour is itself again, loud with its own small noises, and nobody looks at anybody for a while.  

42. FIRST LANDING. Rope and tar. The shutters are up and a card in the window says BACK AT THE TURN.  

43. SECOND LANDING. A shuttered shop with a card in the window: BOTTLES. Nobody on the landing looks at it.  

44. THIRD LANDING. A chandler's, with a diving-helm in the window that was new in his grandfather's time.  

45. FOURTH LANDING. A narrow door in the rock, with a lamp on a hook and three years of salt on the step, swept this morning.  

46. FIFTH LANDING. A net-loft and a bench, and the best view on the Stair.  

47. SIXTH LANDING, the top of the Stair. A yard of wet flags, with the wind going over it.  

48. The rope-and-tar shop is shut, and the door has been shut since before you came.  

49. The shutters of the shop on the second landing are down, and a chalk mark on the lintel has been rubbed at and not quite out.  

50. The chandler's  

51. Mistress Tace's door  

52. The net-loft door, hung with floats. It is on the latch, and nobody is in.  

53. The counting-house door is shut and the iron shutters are down. Over the lintel a sun-disc of hammered brass, and on the disc the Church's flame. You knock. Nobody answers. It is a door like any other, and it is closed.  

54. The counting-house: square stone, a slate roof, iron shutters. The oldest building in Port Cantabile, built by the Synod's tax-farmers to count what the harbour owed, and given to the Church.  

55. A sun-disc of hammered brass over the door. On the disc, the Church's flame.  

56. The cliff-top, and the wind going over it. Beyond the wall, grey grass and a long drop to the sea.  

57. She is singing E, low and a little flat, like a held breath.  

58. She is singing F-sharp, and the swell lifts under it.  

59. She is singing G, bright, with gold on the water.  

60. She is singing A, grey and level.  

61. She is singing B, and the harbour goes slack: the boats hang on their ropes and the water stops pulling.  

62. She is singing C, and the water turns: every boat swings on her rope at once.  

63. The reef changes key: E.  

64. The reef changes key: F-sharp.  

65. The reef changes key: G.  

66. The reef changes key: A.  

67. The reef changes key: B.  

68. The reef changes key: C.  

69. The reef sings under the water  

70. The Mole-bell, once  

71. Bronze rigging-chimes  

72. A grave-bell, in the wind  

73. The Harbour office. A pine box under the desk, a rack of gaffs, and a board on the wall with a great deal of chalk on it.  

74. The Harbour office, at the foot of the Long Mole. Teague keeps the book. The dues are paid to the Harbour-Queen herself, on the Mole-head, at the slack: and the slack is the key before the turning. The board on the wall says so.  

75. The Harbour's board  

76. THE REEF'S KEYS, WINTER, SINCE THE FRACTURE.<br>The reef changes key with the tide. She sings six keys up from the low one, E, F-sharp, G, A, B, C, one to the tide-hour, and drops back to E at the turn. The Harbour keeps its business by the key.<br><br>MOORING DUES: six sovereigns a hull, a day, paid into the Harbour-Queen's own hand AT THE SLACK. The slack is the key before the turning. NOT THROUGH THE OFFICE. NOT BEFORE. NOT AFTER.<br><br>By order of the Harbour.  

77. A board on the wall, chalked over many times. THE REEF'S KEYS, and MOORING DUES.  

78. The Articles, as read at noon  

79. <i>Article the Ninth.</i> Any vessel making the harbour under no hand shall be boarded by the Harbour's people and no other, and what is found aboard her belongs to the Harbour.<br><br><i>Article the Twelfth.</i> Nothing is to be lifted off a vessel lying on the Harbour's bench. The Harbour does not forbid theft; the Harbour forbids theft from the Harbour's own pocket, which is a different crime and carries the drop.<br><br><i>Article the Sixteenth.</i> What lies below the tide-mark belongs to whoever brings it up. The Harbour takes a fifth. The sea takes what it likes, and no court on this coast will hear a complaint against it.<br><br><i>Article the Twenty-first</i> [PROPOSED]. No bottle may be opened within the harbour.  

80. The Articles of the Free Captains, painted white on black board, in numbered lines. They are read aloud at noon, in a flat voice, and enforced from the derrick.  

81. A pine box under the desk, two feet by one, with a lock on it. Teague says the key stays with the Harbour-Queen, and that it has been used four times in nineteen years.  

82. A rack of gaffs and long hooks and lanterns, hung ready by size. The Harbour boards a thing that comes in under no hand, and it does not do it with its bare hands.  

83. Out to the Lantern Yard  

84. A chandler's, cut back into the rock. Coils of rope hang from the ceiling, lamp-oil and tar are in the air, and in the window stands a diving-helm that was new in his grandfather's time.  

85. The chandler on the third landing: rope, tar, oil and brass. Sloe sells to hulls with the Harbour's receipt.  

86. A diving-helm of beaten brass, dented, with a window the size of a hand. New in his grandfather's time. Fortis brass, he says. It is not.  

87. Shelves of lamp-oil, tar, wicks, marlinspike and brass fittings in drawers, every drawer labelled by hand, and every label crossed out and written over.  

88. Out to the third landing  

89. A room cut into the rock. One window onto the harbour, a table laid for one, a bed made tight as a sail. It is very clean, and the floor is salt again already.  

90. Mistress Marrin Tace lives on the fourth landing. A vox-bottle sits on her shelf that she has not opened in three years and will not sell.  

91. A shelf with one thing on it: a blue glass bottle with a wax seal, a chalk mark on the wax, and a clean place round it where nothing has been allowed to gather dust. J. TACE, and a four.  

92. A table laid for one, and a second chair that has been pulled out and pushed in again so often it has worn a mark.  

93. A small hearth, banked. The kettle is on, and the tea may or may not be tea.  

94. The window looks out over the Lantern Yard roofs and the harbour. From here you can hear the Mole-bell between the gulls.  

95. Out to the fourth landing  

96. Driftwood Cay. A long low island of grey rock and grey scrub, and on its spine the burying-ground, where the Coast puts its children in earth. The wind comes across it, and every grave rings a little, each in its own voice.  

97. Driftwood Cay, out past the harbour mouth. The Coast has no ground to spare, so its children are buried here in earth, and every grave has a small bell on an iron hook, so that the wind rings for them. Some hooks are bare.  

98. A grave in the earth, a mound the length of a child, with a small bell on an iron hook beside it. The wind has found it.  

99. An iron hook in the earth beside a small mound, with nothing hung on it. A bell costs a copper to Hesper and a sovereign to you.  

100. You hang the bell on the hook. It takes the wind at once, a little crooked, and goes on ringing. You do not say anything. There is nobody on the Cay who would expect it.  

101. You have no bell to hang. The chandler on the third landing sells them.  

102. A small bell on an iron hook. The wind has found it already.  

103. I hung a small bell on a bare hook on the Cay, for a child nobody had claimed. The wind rang it before I had stepped back.  

104. Hesper's orphan-house: low, square, a kitchen window with the light on and a row of boots by the door. A line of washing, with a very small shirt.  

105. The high rock above the orphan-house, where the Cay keeps its dead. The wind is steady up here, and it is never quiet.  

106. The jetty. Quain's boat lies at the end of it, and Quain beside her with his hat over his eyes.  

107. The sea, going on, in the winter key. You can feel it in your teeth.  

108. Grey scrub, bent all one way.  

109. Away across the water the harbour, small and busy and gold, with the Stair going up it like a thread of lamps.  

110. The jetty back to the Mole  

111. Teague, Harbour office  

112. Harbour office. Dues, bench and bell, in that order, and the bell is not mine to ring.  

113. Harbour office. If it is dues, it is not me. If it is not dues, it is still not me.  

114. Be quick. The tide will not wait, and neither will the Harbour-Queen.  

115. Kestrel? Aye, on the bench at the mast-tower since the morning tide. Six sovereigns a hull, a day, same as anyone. Not to me. The Harbour-Queen takes dues in her own hand, on the Mole-head, at the slack, and I have asked her to take them through me eleven times.  

116. Square with the Harbour, and the book says so. Mind the Stair going up. It is wet on every flight, and the Harbour has had enough of it.  

117. What is the slack?  

118. The water stands still between the flood and the ebb. You will know it by the reef: she changes key hour by hour, and the slack is the key before the turning. It is on the board on my wall, if you read it slowly. Auld Bessa on the Mole steps will teach you to hear it in a breath, and she is right oftener than the tide-tables.  

119. Where do I find the Harbour-Queen?  

120. On the Mole-head, by the bell. Nineteen years of mornings, and most afternoons. Do not stand under the derrick. Everyone does it once.  

121. Read me the Articles.  

122. Teague reads them in the voice you would use for a tide-table. The Ninth, the Twelfth, the Sixteenth and the Twenty-first. When he is done he says, in exactly the same voice, "That is all of them that anyone is likely to ask about."  

123. What does the bell mean?  

124. One stroke for every soul that goes into the water. Then nobody speaks, so the harbour can count. That is the whole grammar, there is no other. If you hear it, somebody has had the worst day of their year, and you do not ask whose.  

125. I am short of the dues.  

126. Article the Sixteenth. There is a crate off the Yard steps nobody has lifted in two days, and the boat-hook is on the post. The Harbour takes a fifth, and it will take its fifth honestly.  

127. I paid the dues.  

128. That is all.  

129. Oona Salt, the Harbour-Queen  

130. Harbour-Queen is not a title anyone gives you, and not one anyone can take back. What is it you want?  

131. What's she singing?  

132. I have ears, a harbour and a headache, and I can only put down one of them.  

133. Dues, is it? What's she singing?  

134. Ask the reef.  

135. Not today.  

136. "Aye. That is how it is answered here." She says it kindly, and she does not take her eyes off the water. "The reef will tell you, if you stand still. Come back when she has."  

137. "Then go and ask her properly." She nods at the Mole steps. "Auld Bessa will teach you in a breath."  

138. "No." She does not raise her voice. "Listen again. Do not think about the pitch. Think about the hour."  

139. "Right. And that is not the slack. I take dues at the slack, in my own hand, and not before. Come back when she has changed. You will hear the boats go slack on their ropes."  

140. "You have the note and not the coin." She looks at your purse the way she looks at weather. "Article the Sixteenth. There is a crate off the Yard steps. I will be here."  

141. She counts the six sovereigns without looking at them. "Drift-Kestrel," she says, flat, a woman reading a tide-table, "one hull, one berth at the mast-tower, dues six sovereigns, received at the slack in the Harbour-Queen's own hand." She gives you a receipt with a chalk stamp on it. "The chandler will want that. He does not sell brass to a hull on the Harbour's bad list, and neither would I."  

142. You pay the Harbour six sovereigns, and the Harbour writes it down.  

143. "Square, you are." She does not look round. "Anything else is a question for the water."  

144. Ask about the Mole-bell.  

145. "Once for every soul that goes in. Then silence, so the harbour can count." She looks at the rope. "Nobody rings it for anything else. It is not for me to say what else it is for. It is for the dead, and the dead have a way of not minding."  

146. Mistress Tace, on the fourth landing, sends a bottle. She has not opened it in three years. She asks if the bell can be rung.  

147. There is a silence on the Mole-head, and in it the sea goes on breathing against the stones.<br><br>"The Articles ring the bell for the dead who go into the water. A bottle is not the dead. A bottle is not anything. That is what I have told forty widows, kindly, and I have meant it."  

148. "My brother Merret was a pilot. A man held his bottle back eleven days, because his sister would pay more." She holds out her hand, flat. "Give it here. Do not unstopper it. Do not look at the chalk."  

149. Give her the bottle.  

150. Keep it a little longer.  

151. "As you like. It is hers to ask, and mine to ring, and neither of us is in a hurry." Her hand does not move for a while.  

152. The Mole-bell  

153. Oona Salt takes the bottle in both hands, like something that might spill. She does not open it. She does not look at it. She walks to the edge of the Mole-head, and waits there until the tide is right, and then she lets it down into the water on a length of cord, and lets go of the cord.<br><br>She puts her hand on the bell-rope, and rings it once.<br><br>Then nobody speaks. The gulls, the boats, the chimes: the whole harbour holds still, and counts.  

154. Count with the harbour.  

155. Oona lets go of the rope. "That is the count," she says, in the voice she uses for tide-tables. The voice does not shake. Her hand does, and she puts it flat on her coat, where nobody can see.  

156. Marrin Tace's bottle went into the water off the Mole-head, unopened, and Oona Salt rang the Mole-bell for it. The harbour counted. Nobody has ever asked a bell for a bottle before, she said, and she did not say whether anyone will again.  

157. "The Harbour counted. That is all it can do. It is more than most places do."  

158. "I hear a bottle went up the Yard in a grey man's ledger," she says, to the water. "I hear nobody asked the bell." She says nothing else, and nor does the Mole.  

159. Auld Bessa, the last Reef-Reader  

160. Eyes shut, head on one side. That is how it is done. What's she singing?  

161. Sit, if you can sit quietly. The reef does not like a talker.  

162. I am eighty-four. If you want something, it had better be short.  

163. "What's she singing?" She does not open her eyes. The old woman sits on a bollard at the Mole steps with her head on one side, as if the sea were a long way off and talking low. She is the last Reef-Reader on the Rust Coast, and the harbour goes round her like water round a post.  

164. "Ah. You again. What's she singing?"  

165. "That is it exactly. Ask, and wait. She will tell you if you are not in a hurry." The corner of her mouth moves. "Nobody is ever not in a hurry. That is why the Harbour keeps a clock made of fish."  

166. Teach me to listen.  

167. "The reef is a bar of keys, six of them, and she climbs one to each tide-hour. In the winter key, mind. She has been in the winter key since the Fracture. Seven years of winter." Her head tilts. "Start low: E. Then F-sharp. G. A. B. C. Then she drops back to E, and starts again. Do not listen to the pitch. Listen to what the boats do."  

168. What is she singing now?  

169. What happens at the slack?  

170. "The water stands still between the flood and the ebb, and the boats hang on their ropes like washing. Everything in Cantabile that was moving stops, for about the length of a breath. That is when the Harbour-Queen takes the dues." She smiles at nothing. "She is the only person on the coast who is never late for it."  

171. Who are you?  

172. "Bessa. I read the reef for the pilots, when I had pilots. Now I sit on a bollard and the pilots read it for themselves, badly." She turns her face toward you for the first time, and her eyes are shut, and she looks at you anyway. "You sing, I think. Do not do it near the water. The reef listens harder than it used to."  

173. Hollis Teel, Free Captain  

174. Hollis Teel, the Long Odds. Salvage and nothing else, whatever you have heard. What's she singing?  

175. If you are selling, I am buying at a price you will not like. If you are buying, I have nothing.  

176. I am sitting on the best bollard in the Yard and I am not moving.  

177. Hollis Teel, Free Captain of the Long Odds, salvage and nothing else, whatever you have heard. He sits on a bollard with his boots on a coil of rope and a stone jar between them, and sings a little under his breath, and stops when he sees you listening.  

178. He laughs, one short bark, and the jar rocks. "Good. A stranger who knows what to say. Most say "the usual"."  

179. What was that you were singing?  

180. "A pilot's rhyme, the way they teach it to children on the Mole. A tide-table you can sing with a mouthful of rum."<br><br><i>E for the waking, F-sharp the flood,<br>G is the gold of the morning mud;<br>A is the grey, and B is the slack,<br>C is the turning, and she is coming back.</i>  

181. Tell me about the Sixteenth.  

182. "What lies below the tide-mark belongs to whoever brings it up, and the Harbour takes a fifth. That is the whole of my religion." He lifts the jar. "The sea takes what it likes, and no court on this coast will hear a complaint against it. Remember that, if you are ever tempted to complain to the sea."  

183. Good luck with the salvage.  

184. Fenwick Sloe, chandler  

185. Rope, tar, lamp-oil, brass. The brass is from Fortis. Do not look at me like that, they all say it.  

186. Gauge-valves, bells, oil. Ask. If I have it, you will not like the price.  

187. I do not haggle. Haggling is a form of theft and the Harbour has a view.  

188. A gauge-valve for a lift-tank? Aye, I have one, in a drawer I keep for the right sort of hull. I do not sell brass to ships on the Harbour's bad list, not since the Twelfth got interesting. Bring me the Harbour's receipt, and the drawer opens.  

189. I will bring it.  

190. There is the Harbour's chalk on it, and the Queen's hand. Five sovereigns. It is the real brass. He leans in. "Mostly."  

191. Pay five sovereigns.  

192. Five, I said. You are short, and I am a man who notices.  

193. He puts the valve in your hand in a twist of oiled cloth. "Your engineer will say it is the wrong thread. It is the right thread. They say that about every valve I have ever sold, and I have sold the Coast three hundred."  

194. Anything else? Bells for the hooks, a copper to anyone, a sovereign to anyone off the coast. The Cay has more bare hooks than it has bells.  

195. Done.  

196. The Harbour thanks you.  

197. Mind the Stair.  

198. Not for what is in your purse.  

199. Rope, oil, a bell for a hook. Look in the drawers if you like. Everything has a price and most things have two.  

200. Marrin Tace, widow  

201. Mind the step. I sweep it every morning, and every morning it is salt again.  

202. Come in out of the stair. You will want to sit down; everyone does after the fourth flight.  

203. I do not sell it. That is the first thing everyone asks.  

204. You are off the airship. I saw her on the mast from the landing, and so did the whole Stair. There is tea, and I can say it is tea.<br><br>You will have been told about bottles. Everyone is told about bottles, in the first hour. That one. <i>Jory's.</i> Jory Tace, pilot, lost off the Cay passage three years ago and not found. I bought it from a man on the second landing, the spring after. Four sovereigns. J. TACE, in chalk on the wax, and a four. I have never taken the stopper out.  

205. Why not?  

206. "If I open it and it is him, he will ask if it is the tide. They always ask. And he will be calm, and I will have a husband in a bottle in my kitchen, and a kitchen. If I open it and it is the other thing, I lose the kitchen. If I do not open it, he is both and neither, and I can sweep the step."  

207. Has anyone offered to buy it?  

208. "A man in a grey coat comes up from the Yard once a month, very civil. Six sovereigns, receipt stamped, and the bottle reconciled. I said it was not for sale, and he wrote that down." She turns her cup a quarter-turn. "I think he writes everything down."  

209. What do you want done with it?  

210. "I would have him go to the water with a bell. The way he should have, off the Mole at the turn, with the Harbour counting. But the Articles say the bell is for the dead who go in, and a bottle is not the dead, and the Harbour-Queen has told me so very kindly forty times. My knees will not do the Stair down. Would you carry it to her, and ask? Do not open it. Do not take it aboard a ship. Not even to look."  

211. I will carry it.  

212. She takes the bottle off the shelf in both hands and sets it in yours, like a full cup, and does not let go for a second after you have it. "Mind the wet. Every flight."  

213. Marrin Tace gave me her husband's vox-bottle, unopened, and asked me to carry it down to the Harbour-Queen and ask for the Mole-bell. Not aboard a ship. Not to be opened.  

214. "Then not today. The bottle is not going anywhere. That is rather the trouble with it."  

215. "You have him. Take your time on the Stair. Every flight is wet."  

216. "I heard it. From the fourth landing you hear the Mole-bell between the gulls. One stroke. And then the whole harbour counted, and I counted with it. It is the only time in three years I have counted with anyone." She goes to the shelf and puts her hand on the clean place, and takes it away again. "Take this. Jory's pilot's whistle. It is tin. He whistled the keys when he could not hear them. It is no use to me and I cannot sweep round it. And these." Six sovereigns. "The six the grey man never got."  

217. "I sweep the step, and I count. It is all right. It is not nothing, but it is all right."  

218. She looks at the clean place on the shelf for a long time. "Then he has gone where they all go. I will not ask what you were paid." She is not angry. That is what is the matter. "Thank you for telling me straight."  

219. "I sweep the step. There is nothing on the shelf, and I dust it."  

220. You receive six sovereigns and a tin pilot's whistle.  

221. Jory's Pilot's Whistle  

222. A tin whistle on a bit of cord, worn bright at the mouth. It plays the six keys of the reef, and only those.  

223. You blow the whistle softly. It plays the key the reef is in, and nothing else, and the boats do not mind.  

224. Mr. Dunmore, Receiving Clerk  

225. Bottles are received, graded and reconciled. Receipts are stamped. The Office is grateful for your cooperation.  

226. Six sovereigns the unit. I am told it is more than the trade will bear.  

227. There is a queue. It is, at present, you.  

228. Mr. Dunmore has a trestle desk, a ledger, a stamp, and a brass-bound box that clinks. His coat is grey. He is pleasant in the way a closed door is pleasant. "Units are received here," he says. "Six sovereigns, stamped. If you have a unit, it will be reconciled."  

229. Mr. Dunmore does not look at the bottle in your pack. He looks, kindly, at a place near it. "A unit is in your possession. Chalk on the wax: J. TACE, four. It would be reconciled today. Six sovereigns, stamped."  

230. Sell it.  

231. No.  

232. "Received. Thank you." He writes. "A receipt is stamped. The Office is grateful for your cooperation." The bottle goes into the box with a small sound, one of many.  

233. I sold Marrin Tace's husband's bottle to the Office's receiving clerk on the Yard for six sovereigns and a stamped receipt. It went into a brass-bound box with a clink. I did not ask what reconciled meant.  

234. "The offer does not expire," says Mr. Dunmore. "It is simply not renewed." He writes something down.  

235. "The unit has been received. There is nothing further."  

236. Marlow Quain, pilot  

237. Cay run, a copper there and back. I go at the slack and I come back at the slack.  

238. If it is the Cay you want, sit in the stern. If it is not the Cay, I am asleep.  

239. The boat goes when I say. Not before.  

240. Marlow Quain sits in his boat at the Mole steps with his hat over his eyes. "The Cay?" he says, without moving the hat. "A copper there and back. Do not sing in the boat. The reef listens harder past the mouth."  

241. Take me to the Cay.  

242. Not now.  

243. The harbour mouth goes by on the left, and the reef is green under the keel, and for the whole crossing Quain whistles four notes over and over and does not seem to notice. The Cay comes up out of the sea like a thing that has been waiting.  

244. Back to the Mole?  

245. Back to the Mole.  

246. A little longer.  

247. Quain rows back without a word, and the harbour comes up gold and loud out of the afternoon.  

248. Marlow Quain tips his hat back. "Back to the Mole, when you are done. I am not going anywhere. Nobody goes anywhere from the Cay but back."  

249. Hesper, of the four houses  

250. You have the look of someone off the airship. They have all got it, the ones with ears for an engine.  

251. Four houses, and a Cay, and nine children at supper tonight, and I have lost count, which is not a thing I say lightly.  

252. If you want something, say it. If you want to stand there, stand in the sun, it is free.  

253. Hesper runs four houses on the Lantern Yard and takes in wreck-orphans on Driftwood Cay. She is a big slow woman with a soft face and a voice like a foghorn, and she has buried, she says, more children than most women on the Coast have borne. She has the kindness of a person who has stopped expecting anything back for it.  

254. Tell me about the Cay.  

255. "Older than the Coast's customs. The Cay's people were farmers once, and we put our children in earth there, because the town is cut into rock and every foot of flat ground is a house or a yard or a cistern. Every grave has a bell on a hook, so the wind rings for them. Some hooks are bare, for the ones nobody claimed. A bell costs a copper to me and a sovereign to you." She says it without a trace of reproach. "Sloe, on the third landing."  

256. How many children?  

257. "Since the Screaming Year? More than I will say in the Yard." She looks at the sea. "You count them, and you do not say the number, and you get on."  

258. Thank you.  

259. Mags Tennant  

260. Mags watches your mouth, and then your hands. She signs: <i>Here.</i>  

261. She nods, once, and signs: <i>Dues. Chandler. Dark.</i>  

262. She raises one eyebrow and goes on watching the Yard.  

263. Mags is at the foot of the mast-tower, with her back to the iron and her face to the Yard, because she always sees things first. She watches your mouth and then your hands, and signs: <i>Here.</i> Then the list, slowly: <i>Dues. Chandler. Third landing. Dark.</i> She touches her ear, then the planks: <i>The harbour hums through the boards all day. You will feel it too.</i>  

264. She signs: <i>Dues. Chandler. Back before dark.</i>  

265. Mags sees what you carry. Her face does not change. She signs, slowly, with both hands: <i>Not aboard. Never aboard.</i> Then she points at the Stair.  

266. She signs: <i>Done?</i> and, when you nod, <i>Up.</i> She holds the rungs for you.  

267. Climb to the Kestrel.  

268. Not yet.  

269. Not everything on the list is done. She tilts her head at that, once, as at weather, and signs: <i>Pennick will say.</i> She does not stop you.  

270. A net-wife on the fifth landing  

271. Mind the rail. It is a hundred and ninety feet from here to the Yard roofs, and the Yard roofs are not soft.  

272. They light the Stair at dusk, one landing at a time, from the bottom up. The lamplighter is on his fourth in three years. I tell you so you will hold the rail.  

273. I am mending. If you are going to talk, hold the other end.  

274. A deck-hand of the Yard  

275. Mind the Twelfth. The Harbour does not forbid theft, it forbids theft from its own pocket. I was a thief nine years and never once took a nail from the Harbour.  

276. Fish, tar and rum. In that order, on a good day.  

277. A child on the Cay  

278. That one is my brother's. He was three. It only rings when the wind is from the west, and nowhere else.  

279. Hesper says the crooked one rings crooked because the hook is crooked. I say it rings crooked because he was.  

280. Shh. You will frighten the bells.  

281. The mast-tower  

282. Sixty feet of wet iron rungs, and the Drift-Kestrel at the top of them, murmuring. Mags is watching your hands.  

283. You have done none of Pennick's list. Go up anyway?  

284. Climb.  

285. You cannot take the bottle aboard. Never on a ship. The Coast is very firm about it, and so is Marrin Tace, and so, now, are you.  

286. You climb. The rungs are cold and every one of them is wet, and at the top the Kestrel's deck takes your weight as if it had been waiting. Below you the harbour goes on, with nothing still in it.  

287. You paid the dues at the slack.  

288. The dues are unpaid, and the Harbour has a long memory.  

289. Pennick has his valve.  

290. Pennick has no valve, and an opinion about it.  

291. The Mole-bell rang once, for a bottle.  

292. The bottle went into the Office's box.  

293. The bottle is still on a shelf on the fourth landing.  

294. A bell hangs on a hook that was bare.  

295. You can tell the hour from the sea.  

296. I paid the Kestrel's mooring dues into the Harbour-Queen's own hand, at the slack. Six sovereigns, and a receipt with a chalk stamp on it.  

297. Fenwick Sloe, the chandler on the third landing, sold me the gauge-valve for Pennick for five sovereigns, on the Harbour's receipt.  

298. The Mole-bell rang once while I was walking the Yard. Nobody said whose it was.  

299. I lifted a crate under the Sixteenth Article. The Harbour took its fifth, honestly.  

300. The Harbour's Receipt  

301. A slip of tarred paper with a chalk stamp, and the Harbour-Queen's hand across it. DUES PAID, AT THE SLACK.  

302. A Gauge-Valve  

303. A brass gauge-valve for a lift-tank, in a twist of oiled cloth. Fortis brass, the chandler says. Mostly.  

304. Marrin Tace's Bottle  

305. A blue glass bottle, wax-sealed, J. TACE and a four in chalk. It is not to be opened, not to be sold, and not to be taken aboard a ship.  

306. Never take the stopper out. That is the first thing anyone on the Coast tells you, and the last.  

307. A Small Bell  

308. A small bronze bell on an iron hook, no bigger than a cup. For a grave on the Cay that has none.  

309. the Mole-head  

310. the Salt Stair  

311. the Harbour office  

312. the chandler's  

313. the counting-house  

314. the Cay boat  

315. the mast-tower  

316. the Yard steps  

317. A bottle is a drowned man's breath with a stopper in it, or a thing that learned his name off the water, or nothing at all. Nobody can tell which until the wax is broken. The Coast has a rule for that: never take the stopper out.  

318. It keeps what it takes. Nobody on the Coast says more than that, and nobody says it loudly.  

319. The Flambeaux have had the counting-house since the spring, up at the top of the Stair. They pay for talk, and the Lantern Yard has plenty.  

320. The Synod taxed this harbour for a hundred years and has never once been thanked for it.  

321. The airship on the mast-tower. She came in on the morning tide, and half the Yard has already worked out what she is carrying.  

322. The hounds came down out of the hills the same year the quiets came up out of the trenches. The Coast has both. We do not discuss which is worse.  


---

## Phase 17 LONGNIGHT: "The Long Night" - in-game text for review
Every line below is **[PROPOSED]**: invented for this extra, not canon. Canon it leans on: the Longest Night and the Long Tending (Vol V, "The Cantors' Secret"), the lullaby of five notes, a turn, the five again lower and a fall (Vol VI), Ilse Brennan's letter ("Sing it all through. From the first note to the last."), the sealed old stair and the gallery above the fill (Vol VI, Book Four), and the Reach greeting "Does it ring?". Not shown or resolved here: Vaelen, the Organum, any other stair. The year is not named. The Hush is never shown, only reported (things go missing; things are given back). Nobody screams.
French: `tools/i18n/p17-longnight.tsv` (glossary terms: le Silence, les Creux, Chantre, veilleuse, la Racine, les Confins).

### Extras menu and names [PROPOSED]
- An extra — after Book One
- The Long Night
- Down the old stair on the Longest Night. Keep the lullaby going until first light.
- The Conservatory Orchard
- The Gallery above the Root-vault

### Intro card [PROPOSED]
- The Longest Night
- Stasisday, the thirtieth of Frostmonth. The year is not said.
- Every Longest Night the Cantors of the Reach went down the old stair and sang the Root its lullaby, all through, from the first note to the last, because a god that holds a law for ten thousand years forgets the tune. Nobody has gone down in three hundred years. Somebody found the ring under the fallen oak. Three Cantors have come. You are the fourth.
- Sing the verse at the Keeper's Stone (E): steer the note with W and S. Keep the lamps burning, keep the keepers humming, and sing the Root a verse every hour until first light.
- Go down the old stair
- The tally of nights
- Not yet
- The Conservatory orchard, at dusk. Snow on the iron-bark, and the fallen oak lying across the old wall. Under its roots a slab has been lifted, and a cold breath comes up out of the dark.
- The orchard, at first light. The oak lies as it fell. The slab is grey with frost. Nothing has changed, except that it is morning.

### Orchard props [PROPOSED]
- The old stair
- The stair is open at the top. It goes down, narrow, cut in the rock, with a rope rail of rotted hemp.
- The slab, lifted and propped on a log. An iron ring is set in it. It is older than the Conservatory.
- A page pinned to the ring-post in a small upright hand, copied out and passed round: "Sing it all through. From the first note to the last. It forgets. Nobody has been down in three hundred years. If you go, come and tell me what it said."
- An iron-bark oak that fell across the orchard wall and took a length of it. The wood is still faintly ringing.
- The old wall of the Conservatory's orchard. Reed-frost on the coping.
- The tally-board of nights kept. Scratched into it, a time for every dawn that was reached.
- A reed-orchard tree, hollow at the heart. Cantors hum into the hollow of the oldest one on the Longest Night. This is what is left of that.

### Gallery props, the stone, lamps, oil [PROPOSED]
- The gallery. Below the rail the Root goes down, a hundred thousand roots twisted into one like a rope, grey, with green only in the deepest places. It is the coldest place in the Reach.
- A stone rail, waist-high, worn smooth by hands. Beyond it there is only the Root.
- The Root. It is listening.
- The Root. It is losing its place, and going back to the start.
- The Root. It has almost nothing of the tune left.
- The Keeper's Stone. Five notches in it, worn by knees.
- The Keeper's Stone. E: sing the verse.
- The Keeper's Stone. The Root has had this hour's verse; sing again if the tune is low.
- The Keeper's Stone. The Root is quiet.
- A hush-lamp. Its reed-whistle keeps the room from going silent.
- A hush-lamp, dark. E: relight it (a flask of oil).
- A hush-lamp, burning low. E: trim it (a flask of oil).
- A hush-lamp, burning well.
- A hush-lamp, with a pale moth on the glass. It is drinking the light.
- The oil niche. E: take a flask.
- The oil niche. The flasks are filling again, slowly.
- Fallen stone and a long way back into the dark.
- The Synod's fill, where the bore came through. It is thin here.
- The foot of the old stair. The way up is open only at first light.
- Up the old stair
- Climb out before first light? The vigil would be lost.

### The hours (one line each, shown as the hour turns) [PROPOSED]
- The first hour. Marl begins, low, and the Root turns toward him like a sleeper. Sing the verse at the Stone (E) when you are ready.
- The second hour. The lamps burn steady. Tansy's voice is thin, and she knows it.
- The third hour. Your breath is smoke. Below you, something that dripped all night has stopped.
- The fourth hour. The Root does not seem to mind the cold. It minds being alone.
- The fifth hour. The oil niche scrapes. The stair wind has dropped to nothing.
- The sixth hour. Half the night. The song has gone round six times, and it has not once gone round the same.
- The seventh hour. The keepers have stopped looking at one another.
- The eighth hour. Your feet are making no sound on the stone.
- The ninth hour. Jory says it is the longest he has stood at anything. He says it low.
- The dead hour, the one before dawn. Everything that is coming has come. Hold the middle of the note.

### In-run messages [PROPOSED]
- Something is coming in from the {0} way.
- A Hollow, from the {0} way. They come slowly, toward a held voice.
- Claws on stone, from the {0} way.
- Pale wings, from the {0} way, drawn to the lamps.
- A lamp is burning low.
- A lamp goes out.
- The lamp takes, and steadies.
- You trim the wick. It steadies.
- You have no oil. The niche refills slowly, by the east lamp.
- You take a flask of lamp-oil.
- You are carrying all the oil you can.
- A pale moth has settled on a lamp. The glass is dimming.
- The moth goes still, and the lamp brightens.
- {0} has stopped humming. They sit as they were sitting, hands in their lap, quite warm.
- You find {0}'s note under your own breath and hold it out.
- {0} breathes in, and takes up the note where it was left.
- You lose the note. Stay beside them.
- The lamp-light turns it aside.
- The Hollow sits down where it stands, and is still.
- A Hollow is standing beside {0}.
- Your legs are stiff with cold. You cannot run until you are warm.
- Warmth comes back into your hands.
- The dark takes your legs. When you can see again you are on the flags beside the Stone, and Tansy has your hand.
- You cannot stand. They carry you to the stair.
- The Root has the verse.
- The verse slips. The Root goes back to the start of it.
- You break off. The note goes on without you for a breath, and stops.
- Something strikes you, and the note is gone.
- The hour passes unsung.
- The hour turns.
- You cannot hear the drip any more.
- The drip comes back, a little too loud.
- The keepers' breathing has gone out of the room.
- You can hear the keepers breathe again.
- The wind in the stair has stopped.
- The wind in the stair comes back, thin, and cold.
- Your footsteps make no sound.
- Your footsteps come back, a little too loud.
- The stair is grey at the top.
- Not now. The Root has stopped asking. Wait for first light.
- Your voice is not here. Wait a moment.
- Hold the middle of the note.

### Captions (shown when captions are on) [PROPOSED]
- {0} sits with their hands in their lap and their eyes open. They are warm. They are not singing. (Hold E beside them to call them back.)
- [the dripping has stopped]
- [dripping returns]
- [the breathing has stopped]
- [breathing returns]
- [the wind has stopped]
- [wind returns]
- [footsteps make no sound]
- [footsteps return]
- [something is coming]
- [the lullaby, held]
- [a lamp goes out]

### HUD labels (canvas) [PROPOSED]
- HOUR
- THE DEAD HOUR
- TUNE
- LAMPS
- KEEPERS
- OIL
- WARM
- THE LULLABY
- HELD
- KEPT
- COMING
- west
- east
- south
- W / S steer · Esc breaks off
- Listen for the note.
- FIRST
- SECOND
- THIRD
- FOURTH
- FIFTH
- SIXTH
- SEVENTH
- EIGHTH
- NINTH
- TENTH

### The three keepers (names, greetings, hour lines, kept, dawn, orchard, returning) [PROPOSED]
- Marl Dunning, bass
- Does it ring? Don't answer. There is no breath to spare. Hold the middle of the note and it will find you.
- Low and slow. That is all the old ones ever asked.
- Sing, or sit down.
- Does it ring? Don't answer, there is no breath to spare. Hold the middle of the note, and it will find you. Low and slow. That is all the old ones ever asked.
- Tell me if the lamp at my back goes. I won't turn round. If I turn round I lose my place.
- My mother hummed it into the hollow of the oldest tree every year and never said what for. I have hummed it forty. Tonight it has somewhere to go.
- Marl Dunning sits with his hands in his lap and his eyes open. He is warm. He is not singing.
- That is the whole song, then. All through.
- It is a long stair. Mind the rope rail; it is older than any of us.
- It takes Marl a moment to know where he is. He takes your hand, and does not let go for a while.
- Tansy Quill, apprentice
- Is it always this cold? Marl says it is the coldest place in the Reach. I thought he was being a Cantor about it.
- I keep losing my place on the turn.
- I am singing. Look at the lamps.
- I keep losing my place on the turn. Just there, after the fifth. Don't tell Marl.
- If I stop, will you tell me? I don't think I would know.
- Tansy Quill sits very straight, eyes open, her hands in her lap. She is warm. She is not singing.
- It is light. Is that — is it light?
- I have never been this far from the Conservatory in the dark.
- Tansy comes up the stair with her eyes wide, and says, quietly, that she can hear everything.
- Jory Fenn, lamplighter
- I brought the oil. Six lamps, and a flask each, he says. I said that is not much of a plan. Take it from the niche by the east lamp.
- Lamps first. The moths come for the light and the dark comes for the rest.
- Mind the lamps.
- I brought the oil. Take a flask from the niche by the east lamp. Lamps first: the moths come for the light, and the dark comes for the rest.
- A lamp with a moth on it burns three times as fast. Don't ask me how I know. Swat it. It does not mind.
- I have lit lamps in the Reach for twenty years. First time one has been lit for something.
- Jory Fenn stands where he was standing, a flask in his hand, quite still. He is warm. He is not humming.
- Put the lamps out. We shall not be needing them.
- Oil is in the niche. Remember: lamps first.
- Jory walks up the stair carrying the empty flask as if it were full, and does not say a word until noon.

### Dawn, results, the tally, the leave card [PROPOSED]
- First light
- The tune has held. The stair is grey at the top, and then it is not grey. First light of the first of Stillmonth, a Dawnday. Far below, the Root has the whole song again for another year, and is asleep. Whether any other stair was kept tonight, you cannot know.
- Climb the old stair
- The night is kept
- The keepers come up behind you, one by one, into the frost. The oak lies as it fell.
- The night is not kept
- The tune slips and does not come back. Far below, the Root begins again from the first note, with nobody to hear it. You climb the old stair in the grey, and the keepers climb behind you, quiet.
- Carried up
- You are carried up the old stair before the night is out. The lamps are still burning below. The Root is still listening.
- Climb out?
- The stair is open, but the night is not finished. If you go up now the Root will have nobody tonight.
- Climb out
- Stay
- Time to first light {0} · Score {1}
- Verses held {0} · Lamps lit {1} of 6 · Keepers held {2} of 3 · Falls {3}
- A new best night.
- Fastest dawn number {0} on the tally.
- Return
- Stay a moment
- Time · Score · Keepers · Lamps · Falls
- No dawn has been reached yet. This is a local tally; it is kept only on this device.
- Local to this device. It does not touch any save.
- Close
- The lullaby uses the Hold the Pitch assist (Options → Reeds).

### Foes and result words [PROPOSED]
- A Hollow
- One of the Unstrung, walking toward a held voice. It does not hurry, and it does not know it is walking.
- Cacophony Hound
- Static with appetite. It has come for the singer.
- Pale Moth
- A pale moth, drawn to the lamps. It drinks the light first.
- The night was kept.
- The night was lost.
- The night was left.

### Mechanics notes [PROPOSED]
10 hours (first to the dead hour), 34 s at least and 76 s at most each; the lullaby verse (~12.7 s held pitch) at the Keeper's Stone; tune drains with lamps out and keepers kept; 3 falls end the night; no death. Dates: day 84 is Stasisday 30 Frostmonth, day 85 Dawnday 1 Stillmonth (calendar11).
