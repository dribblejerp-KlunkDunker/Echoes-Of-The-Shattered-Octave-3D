# Game — Phase 12 New In-Game Text (for review)

All new player-facing text added in Phase 12 ("Tools of the trade" and the festivals of the Reach). Anything marked [PROPOSED] is invented and can be changed or cut. The festivals follow the approved Project doc "World Bible Vol VII Addendum - Festivals of the Reach".

---

## Phase 12, FESTIVALS: all new in-game text (for review)

Every string below is player-visible. `[PROPOSED]` marks an invented fact (a name, a date, a place, a number, a lyric) for the author to rule on. Dates in prose follow the Calendar volume; no numerals. French: `tools/i18n/p12-festivals.tsv`.

## Invented facts to rule on [PROPOSED]

- The Last Sheaf is hung on the Hedge-gate at dawn of G.day 2 (Hearthday the eighth of Harvestmonth). [PROPOSED]
- The Church postpones it on G.day 4 (Stasisday the tenth of Harvestmonth); the notice goes up, the bunting comes down, the sheaf stays. [PROPOSED]
- The Eel-Run is the night of G.day 6 (Driftday the twelfth of Harvestmonth), evening to before dawn, tied to the Driftday Flume-walker. [PROPOSED]
- The Rite presentation follows the quest flags (rite_started, or rite_ready from G.day 10), not the day alone. The Greening ends all of it.
- The Drowned Lanterns: the first night the player spends in Whisper-Grove after the Third Part begins (flag p12f_dl = that day + 1). [PROPOSED]
- The north field is the north-east corner of Oakhaven, inside the Hedge, past the Carders' mill. [PROPOSED]
- Brenna Loft, baker (harvest table, days 2 and 3, daytime). [PROPOSED]
- Dunna Sedge, sheaf-binder (the north field crew, in the dead hour, the hour before dawn). [PROPOSED]
- Old Harrow has hung the sheaf eleven years running; the field was once cut by eighty people. [PROPOSED]
- The Sheaf Song: a sixteen-beat F-major pentatonic tune, words 'Cut it low, and cut it slow, the last of the year is let to go.' [PROPOSED]
- Items: Hearth Bread (12 health, 20 fatigue), Last-Apple Cider (10 voice, 15 fatigue), Moot-Curd (6 health, 10 voice), Run-Eel (14 health, 25 fatigue, value 8), Plaited Sheaf-Figure (key item). [PROPOSED]
- Reward for the cut: the figure, a loaf, a jug, Hedge standing +5, 40 xp, a journal entry. [PROPOSED]
- Lantern names offered, when the player has met or read of them: Tobin Ashgrove, Joram Pellow, Essa who was Tam's, Joss Wendle, Wyn Wendle, Davin Hale, Halder Wick, plus the ledger. The last entry is always 'For the ones not written down'. [PROPOSED names beyond the ledger]

## Options

- **Row label:** Festivals
- **Row hint:** The Last Sheaf, the Rite dressed as a feast, the Eel-Run on the Flume and the Drowned Lanterns of Whisper-Grove. Off: none of it.

## The Last Sheaf: Oakhaven, the preparation and the notice

- **Entering Oakhaven, the morning the sheaf is hung (day 2):** Someone has hung a sheaf on the Hedge-gate in the night. By noon every street knows what it means: the last field is ready to be cut.
- **Entering Oakhaven, preparing (days 2 and 3, one by day):**
  - Oakhaven is making ready for the Last Sheaf. Bunting on the lamp-posts, flour on every step, and no one humming the song in the open street.
  - The smell of new-flour bread is in the lane. Nobody has said what it is for.
- **Entering Oakhaven, after the postponement:** A Church notice has been nailed to the Hedge-gate, under the sheaf. The sheaf has not been taken down.
- **Gate sheaf, look label (preparing):** A sheaf from the last field, hung on the Hedge-gate. It means the day is named.
- **Gate sheaf, look label (postponed):** The sheaf is still on the Hedge-gate. Nobody has taken it down. Nobody has been asked to.
- **Gate, with the sheaf-figure hung:** Two sheaves on the Hedge-gate: the old one, and a plaited figure beside it. They stay until spring.
- **Small sheaf on a lamp-post:** A small sheaf tied to the lamp-post with a red cord.
- **Bunting:** Bunting of faded cloth, strung for the Last Sheaf.
- **Harvest table:** A harvest table: new-flour bread, cider, curd in dock-leaf.
- **Notice, look label:** A Church notice, nailed under the sheaf. Read it.
- **Notice, title:** A Church notice, nailed under the sheaf
- **Notice, text (Office voice):** NOTICE. The Choir-Church of the Pure Note acknowledges the agricultural custom of the Last Sheaf, which falls due in the week of the Rite. In the interest of the district's attention, the custom is postponed until after Hearthday. Gatherings in a field are gatherings. No sheaf is to be cut before notice is given. Notice will be given.
- **Notice, button:** Leave it nailed.
- **Synod Gazette item, preparing:** The district custom styled the Last Sheaf is noted. It is agricultural. Agricultural customs are tolerated for as long as they remain agricultural.
- **Synod Gazette item, postponed:** The custom styled the Last Sheaf, which falls in the week of the Rite, is postponed until after Hearthday. Postponement is not prohibition. No sheaf is to be cut before notice is given.
- **Synod Gazette item, the Rite:** The Rite of Hearthday is declared a district festival. Attendance at a festival is voluntary and will be minuted. Absence will be recorded as a preference.
- **Townsfolk, preparing (picked by who they are):**
  - The sheaf is up on the gate. You saw. Everyone saw. Nobody is mentioning it, loudly.
  - Last Sheaf this week. We cut it together, one cut to a beat. The field has been waiting.
  - Hearth bread from the new flour. It tastes of nearly what it should.
  - My mother cut the last stand with eighty people. We are fewer. We will cut it anyway.
  - It is the one sheaf that stays cut. Everything else grows back by morning and tastes of less. This one is allowed to end.
  - Do you know the Sheaf Song? Everyone can carry a tune. Nobody can read one.
- **Townsfolk, postponed:**
  - The Church wants it put off until after Hearthday. "Agricultural custom," it says, in that tone.
  - They have told us to wait. The grain does not read notices.
  - The sheaf is still on the gate. Nobody has taken it down. Nobody has been asked to.
  - The north field stands. Do not walk in it. Walk beside it, and look.
- **The Boar & Dulcimer: the Sheaf Song hummed (a message line):** Somebody at the next table is humming the Sheaf Song, low, and the man across from him is pretending not to hear. "Cut it low, and cut it slow, the last of the year is let to go."

## The north field

- **Last stand, uncut, no quest:** The last stand of the north field, uncut. Harrow says the Reach lets one sheaf stay cut. Nobody has said it will be this one.
- **Last stand, quest open:** The last stand of the north field, uncut. The rest of the field is stubble.
- **Last stand, after the Greening (and the one closing line, on entering Oakhaven once):** The sheaf is still standing in the north field.
- **Stubble:** Stubble. The field was cut weeks ago, all but the last stand.
- **Stooks, after the cut:** Stooks of the last stand, left to dry. It stayed cut.

## Brenna Loft, baker (harvest table)

- **Name:** Brenna Loft, baker
- **Greeting, polite:** Softly, love. New flour, the first in a year that tastes of nearly what it should. Bread, cider, curd. Eat it while it is warm.
- **Greeting, normal:** Hearth bread, cider, moot-curd. Last Sheaf week. Market prices; I am not here to get rich.
- **Greeting, blunt:** If you are going to shout, buy something first, and shout into the bread.
- **Shop: hello:** Everything on the board is from the new flour or the last apples. Ask the scale; it is honest.
- **Shop: not enough coin:** Not enough, love. Come back with coin, or with a song, and I will take the song.
- **Shop: thanks (one picked):**
  - Eat it warm.
  - The first loaf is for luck. Yours is the second.
  - Take the dock-leaf too. It keeps the curd.
- **Topic: Oakhaven:** We bake for the Last Sheaf every year the field is cut. This year the dough is rising and nobody has told the Church.
- **Topic: The Hedge:** Flour does not mind the Hedge. Flour minds the damp.

## Side quest: Old Harrow (after the postponement, before the Greening)

- **Offer:** Still here. Good. Come close and keep it low. The Church has put the Sheaf off, and I have hung it eleven years running and I will not take it down for a notice. The north field's last stand is ripe, and it will not wait: grain in the Reach goes back to seed by morning and tastes of less each time. The Sheaf is the one stand that is allowed to stay cut. We mean to cut it in the dead hour, the hour before dawn, nobody speaking, one cut to a beat. We need a hand that can keep the Narrow low. Will you stand in the line?
- **Choice: accept:** I will stand in the line.
- **Choice: decline:** Not this time.
- **Accepted:** Dunna Sedge binds it. The north field, past the Carders' mill; any night, in the dead hour, the hour before the dawn. Keep your boots soft and your breath small. If it goes loud we lie down in the stubble and let the patrol go by, and that is all that happens. Nobody is punished for a cut that did not get cut.
- **Declined:** No. That is an honest answer, and I will not hold it against you. The gate will keep.
- **Offered again:** The north field. The dead hour. If you have a mind to stand in the line, Dunna Sedge will have a sickle for you.
- **While the quest is open:** North field, the dead hour. Keep the Narrow low. You are no use to us loud.
- **While the Rite is staged:** Not now. They have the square. After the Rite, if there is an after.
- **After the cut:** It is cut. I will not say I was there. The figure goes over the gate and stays till spring, if the Church lets spring come.
- **Journal: accepted:** Old Harrow asked me to help hold the Last Sheaf in secret. The Church has put it off. The north field's last stand is to be cut in the dead hour, the hour before dawn, with the Narrow kept low: one cut on every beat, nobody speaking. Dunna Sedge binds it. The north field is past the Carders' mill.
- **Journal: the cut:** We cut the Last Sheaf in the dead hour: sixteen sickles on sixteen beats, and nobody speaking. Dunna Sedge plaited a figure from the last of it and gave it to me, with a loaf and a jug of cider. It is allowed to stay cut. The Hedge-gate wants it.
- **Journal: the Greening came first:** The sheaf was still standing in the north field.

## Dunna Sedge and the crew (dead hour, north field)

- **Name:** Dunna Sedge, sheaf-binder
- **Greeting, polite:** Not here. Not now. Ask Harrow.
- **Greeting, normal:** Not now. Ask Harrow.
- **Greeting, blunt:** Hush. Ask Harrow, and ask him quietly.
- **Ready (dialogue):** Dunna Sedge has her hood up and a sickle in her hand. "Quiet as your footfalls?" she breathes. "Then stand where I can see you. One cut to a beat. If it goes loud we lie down in the stubble."
- **Choice: begin:** Take a sickle and stand in the line.
- **Choice: not yet:** Not yet.
- **Not yet:** "Breathe, then," she says. "It will keep. It has kept this long."
- **Too loud to begin:** "Too loud," she breathes. "You came in like a cart. Stand still a moment, and let the field forget you."
- **Patrol still on the lane (tried tonight):** "They are still on the lane," Dunna says, without looking round. "Not tonight. The field will keep."
- **Taking the sickle:** You take a sickle and kneel in the line. The stalks are cold and heavy and smell of nearly what they should.
- **Villagers in the line (one each):**
  - Shh.
  - Sickle low. Breathe with the song.
  - My mother cut this field. Shh.
  - Not a word. Not one.

## The cut (panel)

- **Title:** The Last Sheaf
- **Hint:** Cut on every beat. The stand is cut together, in the dark, and nobody speaks.
- **Keys line:** Space, Enter or E cut · Esc puts the sickle down · pad: A cuts, B puts it down · or tap Cut
- **Buttons:**
  - Begin
  - Cut
  - Put the sickle down
  - Close
- **Before the count:** Wait for the count. Cut as the ring closes.
- **Canvas description (screen readers):** Sixteen stalks in the dark, and a ring closing on each in turn.
- **Noise meter:** Noise {0} of {1}
- **Progress:** Cut {0} of {1}
- **Grades:**
  - A clean cut.
  - A cut.
  - A ragged cut. Somebody heard that.
  - A stray stroke, loud in the dark.
- **Patrol on the lane: the cut is abandoned (no punishment):** A lantern on the hedge-lane. Two in white, walking slow. "Down," Dunna breathes, and the line goes into the stubble like a shadow. You lie there and count their steps. When they have gone nobody has the heart to finish. "Another night," she whispers. "It has kept this long."
- **Patrol figures, look label:** Two in white, with a lantern, walking the hedge-lane.
- **Ragged cut: another night:** The cut is ragged, and half the stand leans uncut. Dunna shakes her head, not unkindly. "Again, another night. Sing it under your breath. It keeps you on the beat."
- **Success: scene title:** The last stand
- **Success: scene:** Sixteen cuts, and the field takes the sixteenth the way a held breath takes air. Nobody cheers. Dunna binds the sheaf with a plait of its own stalks and gives it to you in both hands, the way you pass a sleeping child. "This one stays cut," she says. "Everything else grows back by morning and tastes of less. This one is allowed to end." Behind her someone is crying very quietly, the way you do when you are not meant to be heard. In the morning the Church will find the stubble and say nothing, which is its way of counting.
- **Success: button:** Take the sheaf-figure
- **Success: Hedge standing line:** The Hedge folk will remember it.
- **Putting the sickle down:** You put the sickle down. Dunna nods once.

## Items

- **Hearth Bread: name / description / eaten:**
  - Hearth Bread
  - A round loaf from the new flour, still faintly warm from some hearth. It tastes of nearly what bread should. Restores 12 health and 20 fatigue.
  - You eat the hearth bread. It tastes of nearly what it should, and you do not say so.
- **Last-Apple Cider: name / description / drunk:**
  - Last-Apple Cider
  - Cloudy, sharp, in a stoppered clay jug. Restores 10 voice and 15 fatigue.
  - The cider is sharp and cloudy. Your throat remembers it is for singing.
- **Moot-Curd: name / description / eaten:**
  - Moot-Curd
  - Soft salted curd in a dock-leaf; what is eaten at the moot. Restores 6 health and 10 voice.
  - Moot-curd, salted, in dock-leaf. Plain and good.
- **Run-Eel: name / description / eaten:**
  - Run-Eel
  - A green Flume eel taken alive and quiet in the Eel-Run. Eat it for strength (14 health, 25 fatigue), or sell it: the Boar pays well for run-eels.
  - You eat the run-eel, boiled twice. Warmth returns to your limbs.
- **Plaited Sheaf-Figure: name / description:**
  - Plaited Sheaf-Figure
  - Plaited from the last stand of the north field, cut in the dead hour. It is the one sheaf allowed to stay cut. It belongs over the Hedge-gate until spring.
- **Hanging the figure at the gate:** You hang the sheaf-figure over the Hedge-gate beside the old sheaf. It turns once and hangs level. It will stay until spring.
- **Using it elsewhere:** Hang it over the Hedge-gate. That is where it belongs.

## The Rite as a false festival (presentation only)

- **Entering Oakhaven (two lines):**
  - White banners hang from every roof-peg, and the censers are lit. Oakhaven has been dressed for a festival, and nobody is smiling.
  - A herald in white stands at the crossroads. "By order of the Choir-Church, the district will assemble in the square. The Rite is a feast. Attendance is a courtesy and will be noted."
- **Sermon lines, read out in the square about every half minute:**
  - One note, held. One town, held under it. This is the peace of the Pure Note.
  - Be glad. Gladness is the only attendance that cannot be counted wrong.
  - The Rite is a feast for the whole district. Eat what is given. Hum what is given.
  - A town that sounds one note is a town that has nothing to fear from the Quiet.
  - Do not hum under the Note. It is not a punishment. It is a listening.
  - Not coming to the square is not absence. It is noted as elsewhere.
- **Herald: name:** Herald of the Pure Note
- **Herald: polite / normal / blunt:**
  - Blessings of the Pure Note, citizen. Take a place in the square. There is bread after. There is always bread after.
  - The Rite is a festival. Festivals are attended.
  - Lower your voice. This is a feast, and feasts are quiet.
- **Herald: topic:** A feast for the whole district. Attendance is a courtesy and will be noted.
- **Banner:** A white banner of the Pure Note. It is very clean.
- **Censer:** A censer on a tripod. The smoke is sweet, and it settles in the throat.
- **Notice: look label:** A notice of the Choir-Church: the Rite. Read it.
- **Notice: title:** By order: the Rite
- **Notice: text (Office voice):** ALL RESIDENTS will assemble in the square at noon for the Rite of Hearthday, a district festival. Attendance is a courtesy. Absence will be recorded as a preference. Bread will be provided afterwards. Humming beneath the Pure Note is not attendance.
- **Notice: button:** Step back.
- **Townsfolk during the Rite:**
  - White banners. They hung them while we slept. We are to stand in the square at noon. "Attendance will be noted."
  - A festival, they call it. I have been to festivals. This one has a count at the door.
  - Hum under it. Low. They cannot punish what they cannot hear.
  - The smoke from their censers gets in the bread. I will never eat a loaf again without tasting it.

## The Eel-Run (the Flume, night of Driftday the twelfth)

- **Entering Oakhaven that night:** Lanterns have come out along the Flume, low to the water, one every few paces. The eels are going down tonight, and everyone who owns a trap is on the bank. Nobody is talking. The eels can hear.
- **Stake lantern:** A paper lantern on a stake, low over the water. The eels go down toward the light.
- **Trap:** A wicker eel-trap, weighted with a stone and set in the shallows.
- **Floating lantern:** A paper lantern afloat on the Flume, going down with the eels.
- **Townsfolk and trappers:**
  - Shh. They run on the dark and the quiet. Cough, and they turn back.
  - Late this year. Everything is late this year. The seasons are wrong and the eels came anyway.
  - Stand still, line in, and wait. It is like prayer, only it works.
  - The Driftday walker went down the bank at dusk and lit the first lantern. That is how we know.
- **Casting:** You let the reed-line down into the Flume and stand very still.
- **Waiting (re-use):** Still. Wait. The line is down.
- **Waiting:** The green water goes on, close and dark. You keep your breath small.
- **Bite:** The line shivers. Now.
- **Hauled:** You haul up an eel, green as a bruise, and it does not thrash. Even the eels keep quiet tonight.
- **Missed:** It slips the line. The eels keep their own counsel.
- **Startled by noise:** The eels felt that. The water closes over them like a door.
- **Too loud to cast:** Too loud. The eels would turn back. Stand still a moment, and try again.
- **Six eels taken:** Enough eels for one run. The rest of the Flume is for tomorrow's hunger.
- **Walked away:** You let the line go slack and step away.
- **Journal: the first eel:** The night of the Eel-Run: the whole bank in lanterns, every trap down, nobody speaking. I took an eel on the Flume by standing very still. The eels can hear. Everyone on the bank behaves as though it were a church.

## The Drowned Lanterns (Whisper-Grove, after the Greening, one night)

- **Entering the Grove that night:** The water in the Sunken Court has come up in the night, the way it does once a year, and every ripple holds a light. Paper lanterns on the lit water, a few hundred, drifting out under the willows. The Synod never banned it. Nobody from the Synod comes here.
- **Basket:** A basket of blank paper lanterns at the water's edge. One lantern, one name, said aloud.
- **Lantern on the water:** A paper lantern on the lit water, drifting out.
- **Panel: title:** The Drowned Lanterns
- **Panel: intro:** One lantern, one name, said aloud as you set it. Choose the name.
- **Panel: list heading:** Names in your logbook
- **Panel: generic row (always last):** For the ones not written down
- **Panel: step back:** Step back
- **Panel: keys line:** Up and Down choose · Enter sets the lantern · Esc steps back · pad: D-pad, A, B
- **Set for a name ({0} is the name, shown as text only):** "{0}." The lantern turns once on the lit water, and goes out under the willows.
- **Set for the generic lantern:** You set a lantern for the ones not written down. It goes out slowly, with the others, and nobody asks whose.
- **Too many lights:** The water is full of lights. Wait for one to go out.
- **Too far from the water:** The water is too far. Stand at the edge.
- **Journal: the first lantern set (no name in it):** On the night the Court's water rose I set a lantern on it and said a name aloud. Nobody stopped me. Nobody from the Synod comes here.

---

## P12 ARMS review text ([PROPOSED] = invented, for the author)
Items (all [PROPOSED]):
- Quarry Great-Maul (Factor Vosk's company store): "A quarry sledge on an ash haft as long as a man, the head weighted with lead. Cracks bell-plate and golems; swings like a door closing. Two hands, so no shield."
- Long Glass-Edged Blade (Captain Vane): "A corsair's two-handed blade, the edge ground out of salvaged Aether-Glass. It rings through the Cacophony. Two hands, so no shield."
- Bell-Bronze Glaive (Brother Ignatius): "A curved bell-bronze blade on a six-foot shaft, struck from a chapel bell the Synod did not take. Reaches over a shield rim and past a hound. Two hands, so no shield."
- Reed-Guard Dirk (Hob): "A stiff, basket-hilted dirk for the off hand. Light enough to carry beside a blade. Rust Coast duellists call it the second word."
Messages: see tools/i18n/p12-arms.tsv (English column).
Options rows: Shield bash / Two-handed weapons / Dual wielding. Key: "." ; touch button "Bash"; combo: guard up (F, LT) + strike.

---

## P12 KIT: new player-facing text (for review). Every line is [PROPOSED]. French: tools/i18n/p12-kit.tsv in the branch.

## Lore decisions [PROPOSED]
- Fire burns beasts (hounds, swarms, weaverlings, fret-crawlers, Mire-drones) and people (Legion, Office, outriders) and SCARES them. The Hollows (Drowned, Dirge) burn but are not afraid: they have no will to be. Constructs (Steam Golem, Aegis, Listening-Horn, Chord-Warden) take a quarter damage, not scared. Bosses take half, capped at 15% of their health a flask, not scared. The Hush (a Quiet, Hush-Moths) is untouched: "The fire does not seem to reach it."
- The damper jar is mundane apothecary craft (wool-fat, wax, lead-salt), explicitly not the Hush. On a siphoned map the Hush's own "too still" clock still ticks in the jar's silence (silence draws it) but is held under the 7 s that unwrites you.
- The net is a corsair's boarding net (Vane's stock).

## Items
- Oil Flask: Lamp-oil and a rag wick in a stoppered bottle. Thrown (O opens the throw panel), it bursts into a patch of fire where it lands: a few paces of flame that bar a passage and burn what stays in them. Loud, and bright. Never throw it where a neighbour can see.
- Damper Jar [PROPOSED name]: Wool-fat, wax and powdered lead-salt, sealed in a jar. Apothecaries use it on sickrooms. Thrown (O opens the throw panel), it breaks and takes the sound out of the air around it for a few breaths. It is only wax. It is not the Hush, and Bettany asks that you not say it is.
- Weighted Net: Reed-cord knotted around fired-clay weights, the kind a corsair throws across a boarding deck. Thrown (O opens the throw panel) at a foe in front of you, it pins a small or ordinary one for a few seconds. Large things shrug it off, and some things are not there to be caught.
- Forge brewing: "Oil Flask (Burns Where Thrown)": Pressed reed-seed oil in an empty bottle, a rag for a wick. / "Weighted Net (Pins a Foe)": Reed-cord, knotted, with two stones for weights.

## Messages
Fire: "Oil flask: the glass bursts and the oil takes, {0} paces ahead. A patch of fire holds the floor." / "Oil flask: it bursts on the water, and the oil floats there, and goes out." / "Too close. The oil would take you with it. Aim farther off." / "The last flask is still burning. Give it a moment." / "Someone sees the fire go up. The watch records it." (the game adds "The watch records a fire set in the street. +35 Oakhaven bounty") / "The fire dies down to black stones. The floor is as it was." / "The fire does not seem to reach it."
Silence: "Damper jar: it breaks, {0} paces ahead, and the sound goes out of the air around it." / "The last jar's wax is still settling. Wait a few breaths." / "The wax settles. Sound comes back, all at once." / "Your voice goes into the quiet and does not come back. The Song will not carry here." / badge "Silence {0}" (aria: "Silence: no sound carries here")
Net: "Weighted net: it opens over {0}, and the weights take it down." / "Weighted net: {0} is too big to pin. The net drags at it, and it slows." / "There is nothing in the line of the throw to net." / "The net would not hold {0}." / "The net would settle over nothing that holds." / "{0} is already tangled." / "Frayed rope still hangs on {0}. A second net will not take yet." / "{0} tears free of the net."
General: "You cannot carry more than {0} of those." / "Pack full" / "You have no use for that now."
Throw panel: its own sentence becomes "...stones and bottles never deal damage. A flask burns, a jar silences, a net pins." plus the key/controller hint lines.
Options: "Tools of the trade" / "Fire flasks" / "Damper jars" / "Throwing nets" with one-line hints.

---

## Phase 12 RIGGING: new in-game text for review

Every line is [PROPOSED]. Nothing here is canon until the Lorekeeper clears it. French is in tools/i18n/p12-rigging.tsv.

## Item

- [PROPOSED] Office Grapnel
- [PROPOSED] A cutter-man's grapnel gun, Office issue, the line still spooled and OC-742 stencilled on the stock. Face an iron ring set in a post or beam and press 0 (Y on a pad, Hook on touch) to be hauled across. It only holds at rings, it is loud, and it will not fire for a couple of breaths after a blow.

## Labels when you look at a prop

- [PROPOSED] A cache wedged into the rock, left by someone who came here by line.
- [PROPOSED] The wreck of a chandelier. The room is darker for it.
- [PROPOSED] A chandelier hangs on a rusted chain that creaks when nobody touches it. A shot or a clean cut would bring it down.
- [PROPOSED] What is left of a scaffold.
- [PROPOSED] Rotten timbers lashed with tarred rope. It ticks and settles when you stand near it.
- [PROPOSED] An iron ring set deep in old oak, bright on the inside where a line has run. A grapnel would hold here (0).
- [PROPOSED] An iron ring set deep in old oak, bright on the inside where a line has run.
- [PROPOSED] A cutter-man's grapnel gun in the moss by the hull.

## Chandeliers and scaffolds

- [PROPOSED] The chain parts. For a breath the chandelier hangs in the air.
- [PROPOSED] You put your weight to it. The lashings go, and the whole frame comes down.
- [PROPOSED] It comes down on them like a dropped bell.
- [PROPOSED] It hits the flags like a dropped bell. Every ear in the place has heard it.
- [PROPOSED] The falling iron clips you for {0}.
- [PROPOSED] It comes down on them in a long splintering rush.
- [PROPOSED] It comes down with a long splintering rush. Anything near has heard.
- [PROPOSED] A falling timber clips you for {0}.
- [PROPOSED] The chandelier
- [PROPOSED] The scaffold

## Grapnel refusals and flight

- [PROPOSED] Your hands are not steady enough for another shot yet.
- [PROPOSED] Your hands shake from the blow. Wait a moment.
- [PROPOSED] Not now.
- [PROPOSED] Not with that thing awake and watching you.
- [PROPOSED] There is no room to land there.
- [PROPOSED] The line fouls on something in the way.
- [PROPOSED] The grapnel bites. The line sings, and you go.
- [PROPOSED] You land with your ears ringing from the line.
- [PROPOSED] The water closes over it, and the ripples settle.

## Water

- [PROPOSED] Your shoulder is not ready for another.
- [PROPOSED] You put your shoulder into {0} and drive it off the bank.
- [PROPOSED] You shove {0} off the bank. The water closes over it.
- [PROPOSED] The water takes {0}.
- [PROPOSED] It is too heavy to shove.
- [PROPOSED] No ring in view.

## Hints and the pickup

- [PROPOSED] Nothing here to push anything into.
- [PROPOSED] Face an iron ring and press 0 (Y on a pad, Hook on touch).
- [PROPOSED] The moss is empty where the gear lay.
- [PROPOSED] Grey coats on the wreck, between you and the gear. Not yet.
- [PROPOSED] You take the Office grapnel off the moss. Its line is still spooled, and the stencil on the stock says OC-742.

## Options, touch and prompt

- [PROPOSED] I took a grapnel gun off the Office cutter in the Deep Woods. Where somebody set iron rings in old oak, it will haul me across to them. It is not a quiet thing, and it does not forgive a blow.
- [PROPOSED] Rigging
- [PROPOSED] Grapnel
- [PROPOSED] the Office hook, its iron rings and the hidden cache
- [PROPOSED] Falling chandeliers and scaffolds
- [PROPOSED] cut or shoot them down onto what stands beneath
- [PROPOSED] Shove into deep water
- [PROPOSED] small foes pushed or knocked off a bank are lost
- [PROPOSED] Hook
- [PROPOSED] Shove

## Sound captions

- [PROPOSED] Use the grapnel or shove
- [PROPOSED] a chain parts
- [PROPOSED] a crash of iron
- [PROPOSED] timber groans
- [PROPOSED] timber falling
- [PROPOSED] a line sings
- [PROPOSED] a splash
- [PROPOSED] a chain creaks
- [PROPOSED] timber ticks


---

## P12 SONGCRAFT: new player-facing text (all [PROPOSED])

## Items (shop / inventory)
- Lute [PROPOSED] (Hob Wendle, 24 sov): "Hob Wendle strings these with his own gut, and sells one now and then to people who ask nicely. Equipped, Songs cost a quarter less voice and their timed effects do not last as long."
- Alder Flute [PROPOSED] (Old Tam, 14 sov): "Bored alder, packed in hush-cloth by the Hedge-weavers. Equipped, Songs make far less noise, and the Falling Fifth carries a little further down a narrow line ahead."
- Hurdy-Gurdy, the wheel-fiddle [PROPOSED] (Captain Vane, 38 sov): "A corsair's wheel-fiddle with a drone string that never stops. Equipped, timed effects hold much longer. Songs are louder, and the drone calls hounds for a while after."
- Iron Tuning Fork [PROPOSED] (Bettany, 12 sov; the old Silver Tuning Fork v_fork also works, wider): "Bettany had it from a Cantor's widow. Held (J), it hums near what is kept hidden: resonant stone, strongboxes, Light-glass, loose pages. The nearer, the higher it sings."
- Resonance Rod [PROPOSED] (Ignatius the smith, 30 sov): "A rod of bell-bronze, ground at the forge to 174. Held loose (J), it dips toward what is rooted below. Do not stand on what it finds."

## Messages
- Equip: "You take up the lute." / "You take up the flute." / "You settle the wheel-fiddle across your knees." / "You put the instrument away."
- Fork: "You hold the fork by its stem. It is silent, for now." / "You put the fork away."
- Fork first finds (once per kind): wall "The fork shivers against your palm. There is stone here that was cut to be listened to." cache "The fork hums low. Something has been kept near here." glass "The fork sings thin and high. Light-glass, close." page "The fork hums, dry and quiet, like a page turned in the next room."
- Captions: "[A tuning fork hums faintly]" "[The fork hums, closer]" "[The fork rings clear]"
- Rod: "You hold the rod loose between two fingers." / "You put the rod away."

## Journal lines (first time the rod steadies over each kind; Lyra-family voice, the Hush never described)
- Quarry shaft: "The rod went still over the quarry floor and would not be coaxed. Whatever the Consortium drills is under my feet, and it is keeping a note it has no breath for. I took my hands off the rod. It seemed the decent thing."
- Root-vault Casing: "At the Casing the rod stopped dead. The Root does not answer. It listens. I stood there until my hands stopped shaking."
- Malting Tuning Room (part3): "In the Tuning Room the rod stilled over the floor. Nothing sang. Something a very long way down was keeping count."
- Root-vein: "The rod steadied over a root-vein, a thread of green-gold glass under the floor. A small cousin of something much larger."
- Reed bed: "The rod steadied over a reed bed. Wet ground, a little life, a note a day long. Not everything it finds is sacred."
