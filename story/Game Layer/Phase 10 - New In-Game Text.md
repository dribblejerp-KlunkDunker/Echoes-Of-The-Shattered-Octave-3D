# Game — Phase 10 New In-Game Text (for review)

All player-facing text added in Phase 10 (ground shadows and fight marks, travel route and lanterns, Dread: the Dissonance meter and the stalker, Origins: class questions and interaction modes). Invented content is marked [PROPOSED].

---

## P10 LOOK: new player-visible text [PROPOSED]

Both rows sit at the end of the Graphics & access menu. Button labels are the existing On / Off.

- [PROPOSED] Ground shadows: "a soft shadow under people and creatures"
  - FR: Ombres au sol: "une ombre douce sous les gens et les créatures"
- [PROPOSED] Fight marks: "blood, scorch and cracks, for this visit only"
  - FR: Traces de combat: "sang, brûlures et fissures, pour cette visite seulement"

No other new text. Marks and shadows are purely visual; the combat log is untouched.

---

## P10 MOTION: new player-facing text

All of it is [PROPOSED] and sits in js/motion10.js. French is in tools/i18n/p10-motion.tsv (vous; no participle agrees with the player).

## Travel picture (shown after "Begin the journey" on the travel map)
- Title: the destination name, as text. [PROPOSED] no new words.
- Button: "Skip" [PROPOSED]
- Hint: "Click, press any key or A to skip." [PROPOSED]
- Status line while the figure walks: "Walking, keeping to cover." (cautious pace) / "Walking fast." (reckless pace) / "Riding." (on the horse) [PROPOSED]
- Status line when an ambush is waiting: "Something has picked up the trail." [PROPOSED]
- Status line at the end: "Arrived." [PROPOSED]
- The clock is the game's own: the day name and HH:MM.

## Options rows (Accessibility / Options panel, beside Ripples)
- "Animated travel": "a figure walks the route across the map as the hours pass" [PROPOSED]
- "Guard lanterns": "night patrols carry swinging lights" [PROPOSED]
- "Parry sparks": "sparks and a metal tick when a guard turns a blow" [PROPOSED]
- Buttons: "On" / "Off" (existing words).

## No other text
Lanterns and sparks are pictures and sound only. No new message lines, no new dialogue, no lore claims.

## Notes for the Commander
- The figure is a walker (a rider when mounted, with a companion figure when one travels with you). The game has no air travel, so no Kestrel appears.
- Block/parry: the game's guard never worked (the timers never ran and no key was bound). MOTION wired F to the existing triggerBlock and made its timers tick, with no balance change. If the owner wants a real deflection (damage negated), that is a design call.

---

## P10 DREAD: new player-visible text, for review

Everything below is [PROPOSED]. All of it appears only when Options > Graphics & access > Dread is On (default Off).
Nothing describes the presence. Nobody screams. No line says what it looks like, what it wants, or that it is hostile.
Nothing here goes past Book One. French for every line is in tools/i18n/p10-dread.tsv.

## Options row (always present, in the Graphics and access panel)

- Label: Dread
- Note: a Dissonance meter, whispers behind you and a stalker in the quiet · Jump scares: none
- Button: Off / On (existing words)

## Dissonance (message line, shown once per rise or fall; the first two are rare)

- [PROPOSED] The last Song has not finished leaving. The air keeps a thin edge.   (Dissonance first crosses the high mark)
- [PROPOSED] Behind you, the front of a word. Nobody is there.   (the first whisper from behind)
- [PROPOSED] The edge goes out of the air.   (it settles back below the mark)
- [PROPOSED] You wake with your own voice in your head, and no other.   (after Rest, if it was high)

## The quiet arriving (message line; one per place and cue, never in Oakhaven)

Stage 1, first noticing:
- [PROPOSED] The river has gone quiet. You did not hear it stop.   (by water)
- [PROPOSED] The leaves are moving and you cannot hear them.   (in woods, wind)
- [PROPOSED] The water that was ticking somewhere in the stone has stopped.   (underground)

Stage 2, closer:
- [PROPOSED] The lamp is still lit. Its hum is gone.   (near a hush-lamp)
- [PROPOSED] Your steps have stopped coming back to you.   (anywhere else)

Stage 3, nearest:
- [PROPOSED] Your boots come down and make no sound. Neither does your breathing, and it is very gentle about it.

Leaving:
- [PROPOSED] Sound comes back a little at a time: a bird, your own boots, the water.   (you made noise, lit a lamp, moved on, played the root-note reed, or talked with a companion)
- [PROPOSED] Inside the Hedge, sound dies where it falls. Whatever was behind you does not follow.   (you reached Oakhaven)

## The keeping (message line)

It keeps the text of one old line in your logbook, only the writing. The entry, its date and everything it did stay.
It comes back after the next dawn, in your own writing and "not quite how I wrote it" (the text is exactly what was there; the sentence is the journal's).
- [PROPOSED] Nothing touches you. When the sound comes back, the last line in your logbook is empty ruled paper, with its date still at the head.
- [PROPOSED] Something leans close, finds nothing worth keeping, and withdraws.   (logbook has nothing to keep)
- [PROPOSED] The line is back in your logbook, in your own writing.   (the return)

## Logbook entries (journal, side; each told once)

1. [PROPOSED] Songs too close together and the air behind my ears begins to murmur. A Cantor lets each note finish before the next. I will try to do the same.   (first time Dissonance is high)
2. [PROPOSED] Outside the Hedge there is a quiet that keeps a little behind me. It has not touched me. I keep my voice low, I keep walking, and I keep a light.   (first time the quiet comes close)
3. [PROPOSED] The line I could not read is back, and it is mine, and it is not quite how I wrote it. Everything returned is a gift, and the bill comes with it.   (the first return)

## Sound captions (only when Sound captions is On; "[a whisper behind you]" is the only caption for whispers, false foes and shadows get none)

- [a whisper behind you]
- [the river goes quiet]
- [the leaves go quiet]
- [the dripping stops]
- [the lamp's hum stops]
- [your footsteps lose their echo]
- [your footsteps make no sound]
- [the sound drains away]

## Things that are not text (for the reviewer)

- The Dissonance band: two pixels of fill in the HUD, trembling by one pixel when high (still when Reduce motion is on).
- The second shadow: a faint dark shape at the screen edge, gone when you turn. No caption, no sound.
- The false foe: a hound-shape far down a corridor that thins out as you walk toward it. No caption, no sound, no entity.
- Whispers: wordless or half-vowels, placed behind you by the positional-audio mixer. Never words, never a voice you know.

---

## Phase 10 / ORIGINS: all new player-facing text, for review

Everything below is new, so everything is **[PROPOSED]**. Nothing in it states a fact about the world that the game does not already carry: the questions use only the Book One furniture that is already in the game (the Proctors, the Hedge, the glass cores, the Flambeaux and the Pure Note, the reed-whistles, the Last Note's silence, pump-house, Root, Reach prices). No Book Two to Four events, no Hush description (the Hush appears only as a quiet that is noticed, a child's humming, a warm loaf in an open door; it never acts and nobody screams).

French for every line is in `tools/i18n/p10-origins.tsv` (draft; Commander merges).

## 1. Character creation: "Answer questions…"

Button on the "Choose your calling" screen, beside "Custom Calling & Background…". Eleven questions, three answers each. Each answer carries weights (3 = the calling it sounds like, 1 = a near neighbour) for the six existing callings; the calling with the highest total is suggested, ties going to the earlier one in the list. The weights were read against `CLASSES`: Blade (STR/END, engineer, glass arm), Cantor (WIL/PER, tending), Corsair (AGI/SPD/LCK, laughs when afraid), Archivist (INT, names), Penitent (WIL, faith that is guttering), Quarry-Hand (STR/END, hands, short list of friends). Every calling is the first choice of at least five answers.

Screens: heading "Questions · N of 11" · the question · three answers (keys 1, 2, 3) · "Previous question" · "Back to the list" · a help line.
Verdict: heading "The Octave suggests" · calling name, Hz and skills · a paragraph of why · health/voice/shot/songs line (the list screen's own line) · "Also close: <calling>" when the runner-up is within a quarter of the winner · "Accept this calling" · "Answer again" · "Back to the list".

### The questions (answers show their weights; the player never sees the weights)

**Q1. A Proctor at the gate asks your name. You...**  [PROPOSED]
  1. Give it slowly, and watch where his pen goes afterwards.  — archivist 3, cantor 1
  2. Give it loud, and grin. A man who laughs is not worth the paperwork.  — corsair 3, blade 1
  3. Give your trade instead. Calloused hands seldom get a second question.  — quarry 3, blade 1

**Q2. In a silent town you hear a child humming. You...**  [PROPOSED]
  1. Hum the tune back, very low, and follow it.  — cantor 3, penitent 1
  2. Stand still and count the doors. Someone should write down which house.  — archivist 3, quarry 1
  3. Take your hand off your weapon. There is nothing here to hit.  — blade 3, penitent 1

**Q3. The Hedge speaks in your mother's voice. You...**  [PROPOSED]
  1. Say nothing, and hold something heavy until it stops.  — quarry 3, blade 1
  2. Say the first line of the old prayer. If it cannot finish it, you will know.  — penitent 3, cantor 1
  3. Say you will think it over, and walk the other way, whistling.  — corsair 3, archivist 1

**Q4. You may keep one sound for the rest of your life. Which?**  [PROPOSED]
  1. A wind-reed in an orchard, tuned to one person.  — cantor 3, penitent 1
  2. Rope running through a block as a ship comes about.  — corsair 3, blade 1
  3. A pump holding its note, hour after hour, because nothing has gone wrong.  — blade 3, quarry 1

**Q5. The Synod pins up a new fine for singing off-pitch. You...**  [PROPOSED]
  1. Read it twice, for the loophole. There is always one.  — archivist 3, corsair 1
  2. Pay it before anyone asks, and light a candle for whoever earned it.  — penitent 3, cantor 1
  3. Walk past. The fine is for people with time to sing.  — quarry 3, corsair 1

**Q6. The street's reed-whistle stops. The quiet that follows is not rest. You...**  [PROPOSED]
  1. Check your footing and your ways out. Quiet is information.  — blade 3, corsair 1
  2. Start singing something small and ordinary, to keep the place open.  — cantor 3, archivist 1
  3. Kneel, and say the old words, whether or not anyone is listening.  — penitent 3, cantor 1

**Q7. A stranger is dying, and no one here knows her song. You...**  [PROPOSED]
  1. Tell her a lie about the harbour, so the last thing she hears is good.  — corsair 3, cantor 1
  2. Ask her name, and write it down, so that it is somewhere.  — archivist 3, penitent 1
  3. Sit with her and hold one plain low note until she has finished.  — cantor 3, quarry 1

**Q8. A Flambeau on the road asks you to say the Pure Note with him. You...**  [PROPOSED]
  1. Say it. You know every word, and it still tastes of something.  — penitent 3, archivist 1
  2. Decline politely, and keep your good arm where he can see it.  — blade 3, corsair 1
  3. Say you have work. A man with work is rarely argued with.  — quarry 3, penitent 1

**Q9. Someone offers you a glass core, warm in the hand, and calls it a keepsake. You...**  [PROPOSED]
  1. Hand it back. You know what is inside, and that it can hear you.  — archivist 3, blade 1
  2. Ask whose it was, and how long you would have to answer for it.  — penitent 3, cantor 1
  3. Ask what it fetches. Everything in the Reach has a price, even the awful things.  — corsair 3, quarry 1

**Q10. A door stands open in the quiet part of town, a loaf still warm on the table. You...**  [PROPOSED]
  1. Say the household's names aloud, one at a time, in case they are listening.  — cantor 3, archivist 1
  2. Check the back door and the roof. Then eat nothing.  — blade 3, corsair 1
  3. Shut the door properly and mend the latch. Someone will want it to hold.  — quarry 3, cantor 1

**Q11. At the end of a long road, what would you rather have in your hands?**  [PROPOSED]
  1. A rope, a good knife, and a place to be by morning.  — corsair 3, quarry 1
  2. A small flame you are not sure you should still be carrying.  — penitent 3, blade 1
  3. A ledger, with room left in it.  — archivist 3, cantor 1

### The verdicts, one paragraph per calling

- **blade** [PROPOSED]: You weighed each answer by what it would cost and who would pay, and you did not flinch from either number. The Dissonant Blade is an engineer's mind behind a glass arm: the sum of a fight is done long before it begins.
- **cantor** [PROPOSED]: You answered with an ear before an opinion, and you would rather hold a place open than win it. The Cantor sings the births, fevers and burials of the orchards. The notes you carry are older than the Church knows.
- **corsair** [PROPOSED]: You made the room laugh, and left yourself a door. The Corsair counts rope and angles, trusts glass shot, and laughs loudest when most afraid. Nothing in the Reach is so grim that you cannot haggle over it.
- **archivist** [PROPOSED]: You kept count: the doors, the names, the order things were said in. The Archivist of the Veil writes it down and knows what every glass core is. Each name kept costs a little of you, and you seem to have decided it is worth it.
- **penitent** [PROPOSED]: You still half-believe, and you answered like someone for whom half is the heavier weight. The Flambeau Penitent carried a censer for the Church until the light turned. The faith and the fire are both guttering, and you have not chosen which to feed.
- **quarry** [PROPOSED]: You answered with your hands: shut the door, mend the latch, hold something heavy. The Quarry-Hand is a strong back and a short list of friends, and has heard the Root breathe through the pump-house floor.

## 2. Interaction modes (Options > Graphics & access > "Interaction modes", off by default)

Row label: **Interaction modes**. Hint: "Steal, Grab, Info and Talk, as in Daggerfall. ] or [ cycles; click, tap, Enter or controller A uses the current mode. E, Space and P keep their usual meaning."
Mode names (icon label, touch button): **Steal**, **Grab**, **Info**, **Talk**. Touch button: **Mode**. Screen-reader name of the icon: "Interaction mode: Talk".
On cycling: "Interaction mode: Talk."
Help screen note (only while on): "Interaction modes: ] and [ cycle Steal, Grab, Info and Talk; click, tap, Enter or controller A uses the current one. E, Space and P work as always."

Refusals and nudges:
- Grab at a person: "You cannot grab a person. Try Talk, or Steal."
- Talk at nothing / a thing: "No one here to talk to."
- Info at nothing: "Nothing close enough to look at."
- Steal at nothing / a prop: "Nothing here to steal."
- Steal at a companion: "Not from a friend."
- Steal at a person whose purse is out of reach: "Too far, or something is in the way. Close in until the purse is within arm’s reach."
- Steal at a person with no purse: "Nothing on them you could lift."
- Steal at an item nobody owns: "No one owns this. Grab it instead."

Info lines. The pieces are joined with " · " (as the game's stat lines are):
- A person: "<name from NPCS, as the hint line shows it> · Someone you could speak to." (a companion: "Travelling with you."; the watch: "Keeps the watch."). Nothing about quests, tier or greeting.
- An item: "<item name> · <first sentence of its catalogue description>", for example "Oiled Honey · For the throat." Quest items always read "<name> · Something you could pick up." (their catalogue text is written for someone who already holds them, and a different line would mark them out).
- A beast: "<name> · <first sentence of its description>", for example "Cacophony Hound · Static with appetite." (the E key already shows the full description). No health, armour or damage.
- A door: "A closed door." / "An open door." / "A door." or the door's own label. A prop: its own label. A wall: the game's own wall line. Never whether a door is locked, never what a container holds, never who owns a thing.

## 3. Load from file (Load panel, also the title screen's)

- Button: **Load from file…**
- Under it: "A save file (.txt or .octave) can also be dropped onto this panel."
- Too big: "That file is too large to be a save. The limit is 512 KB."
- Unreadable: "That file could not be read."
- Empty: "That file is empty."
- Two or more dropped: "Drop one save file at a time."
- A file dropped in a hardcore run: "Downloaded files cannot open a hardcore run."
- Anything else is the game's own existing line: "That did not read as a save. <reason>" with the reasons from the import (for example "Not an Octave save.", "The code is damaged or incomplete.", "That is a hardcore run. It only opens inside a hardcore run.").
