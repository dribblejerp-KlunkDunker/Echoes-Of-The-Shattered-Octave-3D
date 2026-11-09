# Game — Phase 9 New In-Game Text (for review)

All player-facing text added in Phase 9 (reed-craft, three Oakhaven side quests, The Third Parish, companion conversations). Anything invented beyond the game's text and the world bibles is marked [PROPOSED]. Also in this phase: Halder Wick's wife was renamed from Ada to Bryony, so Ada Pellow (from Book Four) is the only Ada.


---

## P9 REEDCRAFT: new player-facing text (for review)

Everything marked [PROPOSED] is invented here and needs the author's approval. Lore it leans on: wind-reed holds any pitch and dies in a day; reeds grow in beds by the Flume; a Cantor tunes each reed "against my own breastbone before I cut the slot" (Tobin, page 1). The French is in `tools/i18n/p9-reedcraft.tsv`.

## Items (inventory, tooltips)
- **Wind-Reed** [PROPOSED name]: "Cut green from a bed by the water. It holds any pitch you give it, and it is dead by this time tomorrow."
- **Dry Reed**: "Pale, brittle, and worth nothing. It will not hold a pitch. It will burn."
- **Root-Note Reed**: "A reed tuned to 174. Sound it against your breastbone and you stand a little straighter in the Narrow. One breath of use."
- **Lure Reed**: "A thin, high reed. Thrown (O opens the throw panel), it lies where it lands and sounds one note a long while. Idle listeners go to look."
- **Blank First Reed**: "Cut and slotted, and not yet tuned. In the Reach a reed like this hangs above every door, tuned to the one who sleeps behind it." [PROPOSED: the custom of one reed per door is inferred from the Ada Pellow material]

## Reed beds (Oakhaven by the Flume crossing; the clearing)
- Label, full bed: "A bed of wind-reed, green and quiet in the wet. E cuts one."
- Label, part cut: "A bed of wind-reed. {n} still standing today."
- Label, empty: "The reed bed is cut to the stubble. It will come again tomorrow."
- Cut: "You cut a wind-reed low, at the joint. The bed hardly notices."
- Last one: "You cut the last wind-reed. The bed will come again tomorrow."
- Empty bed, E again: "The bed is cut to the stubble. It will come again with the next day."
- A reed dries: "Your wind-reed has gone pale and brittle." / "Your wind-reeds have gone pale and brittle."
- Burning a dry reed: "You burn the dry reed. It gives a little smoke and no sound." / "You feed the dry reeds to the fire. A little smoke, and no sound."

## The Reeds panel (forge tab "Reeds (n)", rest by a fire, Use on a reed)
- Header "Reeds"; rest button "Tune a reed by the fire — while the wind-reed is still green."
- State: "Fresh wind-reed ×{n} · they keep about {h} more hours · Dry reed ×{n}"
- Skill line: "Tunings so far: {n} · the band is ±{c} cents (assist on)."
- Recipes: **Root-note reed** (2 reeds): "Two reeds, tuned to 174. Steadies you for a few breaths." Minigame title "Tune the root-note reed", hint "Find 174 and hold it."
  **Lure reed** (1 reed): "One reed, tuned high and thin. Throw it to call the watch away." Title "Tune the lure reed", hint "A two-note call. Follow it up and back."
- Buttons: "Burn the dry reeds", "Back to the forge / rest / inventory", "Done".
- Results: "The reed rings true. The offcut makes a second." (true tune: one extra product) / "The reed sounds a little flat. It will do." / "The reed splits along the slot." (score under 0.5: one raw reed wasted) / "You put the reed down, uncut." (abort, nothing lost) / "You need {n} fresh wind-reed(s) for that."

## Hold the Pitch (the minigame panel)
- Title: the recipe title; default "Hold the pitch". Controls line: "W / S or Up / Down steer · drag with the mouse or a finger · left stick or D-pad · Esc puts the reed down." Button "Put the reed down".
- Captions (screen-reader live region): "Listen for the note." / "Holding." / "Off pitch." / "Held NN%." Canvas reads "Listen…" then "Held NN%".
- Canvas alt: "Hold the pitch. The gold band is the note to hold. Your voice is the bright line. Steer up and down."

## Using the products
- Root-note reed: "You sound the root-note reed against your breastbone, once, softly. Your hands warm. The air has a floor under it again." plus " The Hollows nearby slow, and stand." when any were chasing.
- Lure reed, in the throw panel: button "3. Lure reed (n)"; hint "1 stone · 2 bottle · 3 lure reed · Escape leaves. Controller: A stone, X bottle, Y lure reed, B leaves."; throw line "Lure reed: sounds a thin note N paces ahead. Nearby listeners turn toward the impact." (or "No idle listener reacts.")

## Oakhaven
- Sounding a reed inside the Hedge (light noise, never a crime): "A constable glances over at the sound, then back to the street." [PROPOSED: only if a guard is within earshot]

## Quest hook: tuneFirstReed({ name, hz })
- Title "Tune a reed to {name}" (or "Tune a First Reed"); hint "Find their note, and hold it while it breathes."
- Success: "The reed finds {name}'s note and keeps it." / "The reed finds the note and keeps it." Failure: "The reed splits along the slot." No reed: "You have no fresh wind-reed to tune."

## Journal [PROPOSED]
- First tune (Tobin's echo): "My first reed. Tobin wrote that he tuned each one against his own breastbone before he cut the slot. I held the cane to mine and hummed until the bone answered. It is not hard to find the note. It is hard to keep it."
- When the Hedge is Greened: "The reed beds by the Flume went under with the Hedge. There are beds yet in the clearing, where the ground stays wet. A reed is only good for a day, so I will cut them as I need them."

## Options (Accessibility menu, new "Reed-craft" section)
- "Reed beds" (On/Off): "wind-reed to cut, the Reeds button at the forge, the lure in the throw menu"
- "Hold the Pitch assist" (On/Off): "a wider band to follow"

---

## P9 QUESTS: all new player-facing text

Team QUESTS, Phase 9. Branch `p9-quests`. Source of truth: `js/sidequests.js` (every string goes through `S()` and is listed in `SIDEQ.TEXTS`). French: `tools/i18n/p9-quests.tsv` (122 lines, English key then tab then French). This file is generated from the module, so it matches the code word for word.

Season: 419 SR autumn, Book One, before the Greening. The Hush is never described. No harm to children is shown.

## Invented facts ([PROPOSED])

- **Joram Pellow**: Ada's husband, died 418 SR, a stone on his tongue (the brief); his name, his note (**203 Hz**, "a hair under the bridge-post reed"), and that he hummed one note when thinking are mine.
- **Old Tam stood the night watch with Joram for nine winters** on the Flume bridge.
- **Kaelen's glass hand can Listen to what a cane kept**: Ada has heard "the glass hears what a thing has kept".
- Ada's age (seventy years in one street), her hooked stick, the reed nail over Cooper's Row's door (house 15,29), the old nail "worn bright for fifty years".
- **Tomas**: a timber-cutter with a glove over a hand that grew back wrong, a mare, a sock for coin, a quota he has "been thinking about since August". The timber shores the Consortium's headframe.
- The iron-bough is an ordinary oak of the clearing at its north-east end (34.5, 8.2), chalked by Tomas. Carded fleece sits uncollected in the Carders' mill since the engine stopped (Nell "is not carding").
- **Bettany's bees**: three straw skeps (her mother's and her mother's mother's), and the Reach custom of telling the bees every birth and death. The Madders' girl born on a Massday; Essa who died in the Cascade year; Joram Pellow in 418.

## Mechanics in one paragraph

Quest 2 uses the game's real noise: a stroke on the iron-bough adds the weapon's own noise plus a bell-note (3.0), times 0.35 with wool on the blade (four strokes a bundle, up to four bundles from the mill), times down to 0.3 in a full gust (gusts follow the sky's wind). Hounds hear noise through the usual `hearRange`. A hound in chase within 16 cells of the tree within 14 s of a stroke makes Tomas call it off until tomorrow. Quest 3 uses the murmur song (N, or E at the skep) within 2.4 cells of a skep with noise under 5.2. Quest 1 calls `REEDS.tuneFirstReed({ name: 'Joram Pellow', hz: 203 })` when reedcraft provides it.


## Oakhaven: Cooper's Row, Ada Pellow (A Reed for Pellow)

**Name (dialogue heading, hover label)**
> Ada Pellow, widow of Cooper's Row

**Greeting, polite**
> Good day to you. Softly. I sit out here more, now, under it. It does not sound, but I like to be under it.
**Greeting, normal**
> Does it ring? True enough, I suppose. Keep it low.
**Greeting, blunt**
> I have buried a husband and I have hung his reed twice. I will not be shouted at on my own step.

**Topic: Oakhaven**
> Seventy years in one street. It was louder when I was a girl. Everything was.
**Topic: The Hedge**
> Joram went in 418. The family holds the note until the body lets go, and in the old days it was sung out after. It cannot be now. The Hedge eats a note before it is halfway to the door.

**Offer (first talk)**
> Does it ring? No, never mind; I only say it from habit. Look up. That is Joram's reed. His mother hung it over his cradle and I carried it to this door the day we married. It split in the frost three nights ago, down the slot, and now it hangs with its mouth open as if it had something to tell me. I held his pitch the night he died, in my head, because there is nowhere else to hold it now. I put the stone on his tongue when he let go. Since then I have hummed it every evening to keep it. Tonight it came out mine.
**Choice**
> I will find his note.
**Choice**
> I am sorry. I cannot help.
**Reply to the refusal**
> No. Nobody can, I suppose. Thank you for standing there.
**Reply to the acceptance**
> She reaches up with a hooked stick and brings the reed down, and puts it in your hands as if it might spill. "Joram hummed. Never a tune. One note, when he was thinking, or the bread was proving, or he had been told something he did not like. Old Tam kept the night watch with him nine winters; Tam will have it. Or the engineer outside the gate, with the arm. They say the glass hears what a thing has kept. I would not know how to ask him." She wipes her hand down her apron. "When you have the note, come back. I will not hang a reed that is not his."

**While she waits for the note**
> Have you his note? No. Tam at the Flume crossing kept the watch with him. Or the engineer past the north gate, if you can bear him. Either will do.

**When you have the note**
> You have it. It is in the way you hold your mouth. There is cane in the shed. Cut it, and tune it against your breastbone the way a Cantor does. I will watch, if you do not mind. I cannot do it; my breath is not what it was.
**Choice**
> Cut the cane and tune it to his note.
**Choice**
> Not yet.
**Reply to "Not yet"**
> Take your time. He never hurried either.
**Lead-in before the tuning**
> She puts the cane in your hand and steps back, and folds her arms as if she were cold.
**If the tuning is cancelled**
> You put the cane down. Ada waits.

### The held scene after the reed is tuned (title: "The reed", button: "Leave her to it")

**Variant: the note came from Tam**
> The cane is green and a hand long. You hold it against your breastbone and hum until the cane hums back, then cut the slot. You blow across it and nothing comes. Of course nothing comes; it is the Hedge. But Ada's hand has closed on your wrist. "That is him," she says. "In the bone. You need not have heard it. That is him." She hangs it herself, on the old nail, with the hooked stick, and it turns once and hangs level. "Tam had it right," she says. "Tam would." Then, more quietly: "It was a comfort to have it wrong. A wrong reed can be mended. This one is right, and that is the end of him, isn't it." She presses eight sovereigns and a jar of honey on you and goes in. The door is barred from inside before you have turned, and from behind it, very low, someone begins to hum.
**Variant: the note came from Kaelen**
> The cane is green and a hand long. You hold it against your breastbone and hum until the cane hums back, then cut the slot. You blow across it and nothing comes. Of course nothing comes; it is the Hedge. But Ada's hand has closed on your wrist. "That is him," she says. "In the bone. You need not have heard it. That is him." She hangs it herself, on the old nail, with the hooked stick, and it turns once and hangs level. "In the cane the whole time, the engineer said," she says. "Well. I held it too hard, then." Then, more quietly: "It was a comfort to have it wrong. A wrong reed can be mended. This one is right, and that is the end of him, isn't it." She presses eight sovereigns and a jar of honey on you and goes in. The door is barred from inside before you have turned, and from behind it, very low, someone begins to hum.

**HUD line (voice spent)**
> Holding a dead man's note costs you a little voice.

### The door over Ada's step (hover label by state)

**Split reed hanging (offer open)**
> A First Reed over a door, split down the slot by the frost. Its mouth hangs open.
**Bare nail (quest under way)**
> An empty nail over a door, worn bright where a cord has hung for fifty years.
**New reed hanging (done)**
> A new reed on the old nail. It hangs level. It does not sound; nothing does in here.

### Item

**Name**
> Split First Reed
**Description**
> Joram Pellow's First Reed, split down the slot by the frost. A cane keeps the cut it was given, and the cut was made for one pitch.

## Flume crossing: Old Tam (extra button, his own talk is untouched)

**Button**
> Ask about Joram Pellow
**You say**
> Ask about Joram Pellow.
**Tam, while his own question is unanswered**
> Hm? Joram? Ask me after. I have a question of my own sitting on me.
**Tam tells**
> Joram. Hm. Nine winters on the bridge, the two of us, and he never said ten words. He hummed. One note, low, like a man testing a plank. He came in a hair under the bridge-post reed when the wind was right, and the post sang back at him, and he nodded at it. Here.
**Tam, asked again**
> Again, then. Here.
**Narration**
> Tam hums it, low. You feel it in your breastbone before you hear it: a flat, patient note, about two hundred and three.

## Outside the gate: Kaelen (extra button)

**Button**
> Ask him to Listen to the split reed
**You say**
> Will you Listen to this reed?
**Kaelen**
> He takes the reed as if it might still be warm. The glass palm lies along the split, and the glass hums once, far down its length. "Cane keeps the cut it was given," he says. "Somebody tuned this against a man's breastbone and cut the slot to what they heard. The slot remembers." A long breath. "Two hundred and three, near enough. A man who hummed to himself. Not in a hurry." He gives it back. "Tell her it was in the cane all along." A pause. "It generally is."

## The clearing: Tomas (The Ringing Wood)

**Name**
> Reeds-Miner Tomas, timber-cutter

**Greeting, polite**
> Does it ring? True enough. The wagon is loaded, and it hums, and I find I am used to it.
**Greeting, normal**
> The wagons do not creak any more. They hum. You feel it through the seat. A man could miss a creak.
**Greeting, blunt**
> I have one good hand and a bad temper. Choose which you want to speak to.

**Topic: The Hedge**
> Timber comes out of the clearing and goes into the town, and the Hedge takes the noise off it at the gate. I have wondered where the noise goes.
**Topic: Oakhaven**
> The Synod counts timber by the load. It does not count what the load weighs on a man.

**Offer**
> Does it ring? Good. Keep it that way. I need someone who can be quiet, and I am not built for it. He holds up the glove. Three fingers to a saw, and the fourth grew back wrong. Everybody looks. Quota day is close and I am one load short. There is an iron-bough at the north-east end of the clearing, a stone's throw from where the hounds sleep. It rings like a bell the moment you strike it, and a hound comes to a ring like a dog to its name. The Hedge eats noise in town. Out here nothing eats anything.
**Choice**
> Tell me how to fell it quietly.
**Choice**
> That is not my trade.
**Reply to the refusal**
> No. Nobody's trade. Come back if the quota frightens you more than the hounds do.
**Reply to the acceptance**
> Three ways, and none of them sure. Wool: take a fistful of carded fleece from the mill and bind the blade, and the bough only knocks. Nell is not carding; she will not miss it. Wind: when a gust is up the wood has something else to ring over. Or draw the hounds off with a stone, if you are clever and they are not. Strike, wait, let the ringing die, strike again. Then carry the log to my wagon. Carry it; do not run it. It knocks on everything.

**While the bough stands**
> Not yet. The bough is at the north-east end of the clearing, past the hound-bed, chalked. Quiet, mind. Wool on the blade, or wait for a gust.
**When it was called off today**
> Leave it for today. A struck bough remembers the hour. Ask it again tomorrow.
**Once it is felled**
> It is down. I felt it in the cart-boards before I heard anything. Fetch the log; it lies at the foot of the stump. Carry it, do not run it.

**Delivery (pays 18 sovereigns, 60 XP)**
> He takes the log in the crook of the bad hand and sets it on the wagon without a sound. The wagon hums. "That is the quota. It goes to shore the headframe, because the Consortium likes timber that rings; they can hear the bore from the road. I know what it holds up." He counts eighteen sovereigns out of a sock, and the sock hums too. "I need the quota or the Synod takes the wagon and the mare. You may think what you like of me. I have been thinking it since August."

### Things in the clearing

**Wagon**
> Tomas's timber wagon. The boards hum under your hand.
**Bough (fresh)**
> An iron-bough, chalked by Tomas. Strike it and it rings like a bell.
**Bough (windy)**
> An iron-bough, chalked by Tomas. The wind is up, and will cover a stroke.
**Bough (still humming)**
> An iron-bough, still humming from the last time. Leave it for a day.
**Stump**
> The stump of the iron-bough, sawn clean and chalked.
**Log on the ground**
> An iron-bough log, lying where it fell.

### Strokes (HUD lines)

**Kerf: untouched**
> Chalked, and untouched.
**Kerf: a hand deep**
> The kerf is a hand deep.
**Kerf: half through**
> The kerf is half through.
**Kerf: nearly through**
> It is nearly through. The bough has begun to lean.

**Loud stroke**
> The bough rings: a bell, struck in a cupboard.
**Wrapped stroke**
> The wool takes the note. The bough only knocks.
**Stroke in a gust**
> A gust takes the note and carries it off.
**Bare hands**
> Bare hands will only bruise you. Tomas wants a blade on it.
**Still humming, no progress today**
> The bough is still humming from the last time. Tomas said to leave it a day.

**Called off (a hound is up)**
> Tomas whistles from the camp: two notes, falling. A hound is up. He is calling it off.
**The felling**
> The iron-bough lets go. It comes down across the ferns with one long flat note, and then your ears are the loudest thing in the clearing.
**Taking the log**
> You get the log onto your shoulder. It hums against your collarbone. Walk; do not run.
**Running with the log**
> The log knocks on your pack-buckle.

## The Carders' mill: the fleece

**Hover label**
> Sacking of grey fleece, carded and never collected.
**Taking a bundle**
> You take a bundle of grey fleece from the open sacking. Nobody has carded it since the engine stopped.
**At the cap of four**
> You have all the wool the work will want.

### Items

**Wool, name**
> Bundle of Carded Wool
**Wool, description**
> Grey fleece from the Carders' mill. Wound round a blade, it deadens a ringing strike a few times over. Use it from your pack.
**Wrapping the blade**
> You wind the wool round the blade and bind it with a cord. It will deaden a ringing strike a few times.
**Already wrapped**
> The blade is already wrapped.
**Log, name**
> Iron-bough Log
**Log, description**
> A length of iron-bough, heavy as a bell and nearly as willing to ring. Carry it; do not run with it.

## The market: Bettany and the skeps (Telling the Bees)

**Offer**
> Softly, love, and come round where the cloth hides my mouth. My bees have stopped coming home. Three skeps, my mother's and hers before, and they go out to the orchard and the chapel lime and they do not come back to the straw. They hang in the Hedge-wool in clumps, like a bruise. Nobody has told them anything since the Hedge went up. You tell the bees, in the Reach, every birth and every death, or they go. And you cannot tell a bee out loud in a town that eats its sounds. It wants a murmur, close, at the straw. I have a bad knee and forty-one lullabies in me and nothing left over. Will you tell them for me?
**Choice**
> Tell me what to say.
**Choice**
> I have no time for bees.
**Reply to the refusal**
> Then I shall go on being a woman who talks to straw. Go softly.
**Reply to the acceptance**
> Three skeps, three tellings. The one behind my house wants the birth: a girl to the Madders on Massday, with her grandmother's hands. The one in the Governor's orchard wants the dead, in order of the years: Essa, in the Cascade year, and Joram Pellow in 418. The one by the Chapel wants the stranger, and you know who that is. Stand close, keep your voice in your chest, and murmur it. N, if your hands know it. Or press E at the straw. Not loud. Bees mind a shout worse than hounds do.

**While the bees wait**
> Behind my house, in the Governor's orchard, by the Chapel. Close, and low. I can hear which of them have had it; they go quiet in a different way.
**Payment (6 sovereigns, 2 honey, 50 XP)**
> She does not say anything for a moment. Then she lifts a hand to her ear. "They are home. I can hear them from here, under the market. I would know that kettle-sound anywhere." She puts two jars of honey into your hands and six sovereigns on top. "Now it hums, and a hum is a sound, and a sound brings hounds. I shall be buying fleece for the skeps till the leaf falls. There is your invoice, love. I did not ask for it either."

### The skeps (behind Bettany's house, the Governor's orchard, the Chapel garden)

**Hover: before the telling**
> A straw skep. The bees hang in it in a silent clump.
**Hover: told**
> A straw skep. It hums low, like a kettle thinking about it.
**Hover: not yet asked**
> A straw skep bound with bramble. The bees inside are quiet. Too quiet.

**Event title**
> The skep
**Event body**
> The bees hang in the straw in a clump, and nothing in the clump moves. Bettany said close, and low.
**Button**
> Murmur the news to them
**Button**
> Step back
**Already told**
> The skep hums back, softly.
**Too loud**
> The bees lift off the comb at the noise and settle again, grumbling. Softer.

**Telling 1: the birth**
> You murmur it to the skep: a girl born to the Madders on Massday, with her grandmother's hands. The straw hums back once, the way a kettle thinks about boiling.
**Telling 2: the dead**
> You murmur the dead to the skep, in the order of the years: Essa, in the Cascade year; Joram Pellow, in 418. Inside the straw something settles.
**Telling 2: the dead (if the Pellow reed hangs)**
> You murmur the dead to the skep, in the order of the years: Essa, in the Cascade year; Joram Pellow, in 418, whose reed hangs level over his door. Inside the straw something settles.
**Telling 3: the stranger**
> You murmur your own name to the skep, and that you came up the Greenroot road in the autumn. The hum inside changes by a half-tone, as if somebody had made room.

## Logbook (category: side)

**Pellow: offer**
> Ada Pellow, on Cooper's Row, has taken her husband's First Reed down. It split in the frost. Joram Pellow went into the ground in 418 with a stone on his tongue, and Ada can no longer hold his pitch. She wants it found, and a new reed cut. Old Tam, at the Flume crossing, kept the night watch with him. The engineer outside the gate can Listen to what a reed has kept.
**Pellow: note from Tam**
> Old Tam hummed Joram Pellow's note for me at the Flume crossing: one low note, a hair under the bridge-post reed, about two hundred and three. I should take it back to Ada.
**Pellow: note from Kaelen**
> Kaelen laid his glass hand along Joram Pellow's split reed and Listened: about two hundred and three. A cane keeps the cut it was given. I should take the note back to Ada.
**Pellow: done**
> I cut and tuned a new reed for Joram Pellow, to the note he hummed, and Ada hung it over her door. It does not sound; nothing does in here. She says it was a comfort to have it wrong. She gave me eight sovereigns and a jar of honey.

**Tomas: offer**
> Reeds-Miner Tomas is one load short for the Synod's quota day. The iron-bough he wants is chalked at the north-east end of the clearing, a stone's throw from where the hounds sleep, and it rings like a bell when struck. Wool from the mill on the blade, a gust of wind, or a thrown stone to draw the hounds off. Then carry the log to his wagon, and do not run.
**Tomas: called off**
> The iron-bough rang and a hound came up. Tomas called it off with two falling notes. He says to leave the wood a day to forget the hour.
**Tomas: felled**
> The iron-bough is down. The log lies at the foot of the stump, and it has to be carried to Tomas's wagon without running, or it will knock against everything I own.
**Tomas: done**
> Tomas has his last load. He paid me out of a sock that hums, and said I could think what I liked of him; he has been thinking it since August. The timber goes to shore the headframe.

**Bees: offer**
> Bettany's bees have stopped coming home. In the Reach you tell the bees every birth and death, and nobody has told them anything since the Hedge went up. I am to murmur the news close to three skeps: behind Bettany's house (a birth), in the Governor's orchard (the dead), by the Chapel (the stranger, which is me).
**Bees: all told**
> All three skeps have had their news. Bettany will want to hear it.
**Bees: done**
> Bettany's bees are home. She paid me in honey and warned me that a hum draws hounds; she will be buying fleece for the skeps. She says that is the invoice, and that she did not ask for it either.

### Closed by the Greening (one line each)

**Pellow**
> Oakhaven is gone under the oaks; Ada Pellow's door is a trunk now, and Joram's reed, split or whole, is somewhere in the bark.
**Tomas**
> Oakhaven is gone under the oaks; Tomas's wagon went down the road, and the iron-bough, felled or standing, is somebody else's quota now.
**Bees**
> Oakhaven is gone under the oaks; Bettany's bees went up into the new boughs, and the news I was carrying went with them.

## Echoes elsewhere

### Tavern rumours (added to `STORYRUM.RUMOURS`; gated by the quest flags)

**Pellow, open**
> Ada Pellow has taken the reed down from over her door, the one that split in the frost, and she has been asking the lane what her husband used to hum. Nobody can say. We all thought we would remember.
**Pellow, done**
> There is a new reed over the Pellow door. It does not sound, mind; nothing does in here. But Ada has started sitting out under it of an evening, and the lane has stopped crossing the street.
**Tomas, open**
> Reeds-Miner Tomas is a load short for quota day and has not a man in Oakhaven who will hold the other end of a saw. He asks strangers now. He says there is an iron-bough out past the hound-bed.
**Tomas, done**
> The timber wagon went out with the iron-bough wrapped in sacking and the hounds on the north road never stirred. Tomas stood a round for the mare. Not for the stranger. For the mare.
**Bees, open**
> Bettany's bees have stopped coming home to the skeps. She says nobody has told them anything since the Hedge went up. Half the town has started to feel guilty about its dead.
**Bees, done**
> Somebody told Bettany's bees the news, a name at a time, in a murmur. They hum again behind her house. The hounds cannot hear it, which is the only reason I allow it.

### Synod Gazette, "Local matters" (added to `STORYRUM.LOCAL`, Office dialect; shown once Tomas is paid)

**Note (what triggers it)**
> Tomas has made quota
**Line**
> A consignment of ringing timber has been received at the quota in good order. Ringing is recorded as a property of the timber. It is not recorded as a property of the Reach.


---

## The Third Parish (Greenroot): all new player text

Team PARISH, Phase 9. Source: js/parish.js. Every string below is player-facing. Invented facts are marked [PROPOSED]. French is in tools/i18n/p9-parish.tsv.


## 1. Items and creatures (names and descriptions)

Item and creature names are [PROPOSED]: the Greenroot Register, Verrow's Tuning-Reed Case (every Song costs about a quarter less Voice while carried), the Mire-drone, the Fret-crawler.

- The Greenroot Register
- Cantor Ilse Verrow's parish register, a slim book strapped shut. The last entries are in a careful hand, and the last line stops. Somebody should have it who will read it through.
- Verrow's Tuning-Reed Case
- A flat leather case of spare reeds, each tuned against a Cantor's own breastbone and long dead, as cut reeds are. It has a way of settling the breath. While you carry it, every Song costs you about a quarter less voice.
- Mire-drone
- A low, wallowing beast the size of a calf, the colour of the bank it lies in. It does not hunt. It hums, one note, under hearing, and everything near it gets a little heavier. Leave it be, or put it down.
- Fret-crawler
- Flat as a flagstone and the same grey, with a shell ridged like the neck of a lute. You do not see it until it moves. What it bites it cuts: after it, no Song will hold its pitch for a while.

## 2. Access: Harrow and Ignatius topics, the hedge door, journal

[PROPOSED] the Greenroot road (three miles east, off the clearing, outside the Hedge) and the parish on the Flume. Tobin's page 10 says the Cantors of the three nearest parishes were called to the Greenhall; two came and the third sent 'We have stopped being able to send' (existing canon).

- The Greenroot road
- The third parish
- East out of the clearing, between the oaks, the old cart-road. It goes to Greenroot. Nobody has been down it since the Cantors were called. Mind the wet ground; there is something in the reed-beds that makes a man sad enough to sit down in it.
- The Greenroot road leaves the clearing by the east hedge and runs three miles to the parish on the Flume, past the reed-beds. The Church came up it. Nobody has gone down it since the summer the third Cantor sent her note.
- Greenroot. Three miles east by the road, off the clearing, outside the Hedge. They sent no word after the summer. I do not ask. You should not either, in a loud voice.
- Greenroot is the third parish Cantor Tobin called to the Greenhall. Two Cantors came. The third sent one line, and then nothing more, and the Reach has been politely not asking since.
- The Greenroot road, back to the clearing
- Bramble and thorn, three deep. Nothing to see through it, and no reason to push.
- The east hedge
- The hedge has grown across the old cart-road, thick and green and ringing faintly. Whatever road ran east of here is under the green now. Leave it with the others.
- Gone. The Greening came up through that road the night the oaks began to ring, and nobody is going down it now. Leave it with the others.
- Harrow says an old cart-road leaves the clearing by the east hedge and runs to a parish called Greenroot, off the Flume. Nobody has gone down it since the summer the third Cantor sent her note.
- Greenroot. Tables laid, doors shut, kettles cold, and nobody. The chapel stands on the knoll to the east, barred from the inside. There is a stair into the earth by the charnel house.
- I have the Greenroot register. Cantor Ilse Verrow's last line stops in the middle of a sentence. It should go to someone who will read it to the end: Ignatius, who would have the Church file it, or Lyra, who would keep it with Tobin's pages.
- I gave the Greenroot register to Ignatius Crane. He read it standing, all of it, and then he said it would be filed. I do not know what it will be filed under.
- I gave the Greenroot register to Lyra. She read the names aloud, quietly, to the end, and put it with Tobin's pages. She said a book that is read to the end is not lost.
- Greenroot, the third parish

## 3. Greenroot village edge: glimpses through windows, props, labels

[PROPOSED] seven houses, thirty-one souls, the Cantor Ilse Verrow, the Pell and Joss houses. No bodies are shown anywhere: every scene is a place where a person was.

- Through the crack of the shutter: a table laid for four. Four bowls, four spoons, a loaf gone hard as a roof-tile. All four chairs are pulled out, the way you pull them out when you mean to sit.
- The door is shut, not locked. Through the window a kettle sits on its hob, and the hob is cold, and the water in the kettle has long since dried to a ring of white.
- The Cantor's house. A cloak is gone from its peg and the peg is bare. A pen lies across an inkwell gone to a crust. The bed is made, by someone who expected to be back for it.
- A pair of small boots stand side by side on the step. The door above is open by a hand's width. You do not push it.
- Washing hangs in the yard on a line, dry, stiff and gone grey. Nobody has taken it in.
- A loom stands in the window with a half-woven length still on it. The shuttle lies where the weaver put it down, on the sill, beside a bowl of something that was blackberries.
- The village well. The rope is dry and the bucket is on its hook. The water at the bottom is perfectly still, and there is nothing in it.
- A trestle table laid in the green for the whole village: bowl, cup and spoon at every place, a jug at the middle. The cloth has been rained on and dried and rained on. Nobody has taken a place.
- A wind-reed hung over the door on its cord, tuned to someone who lives here. It hangs perfectly straight. It does not sound.
- A doorpost with a hand-mirror grown into the wood. The wood has closed over the rim of it, the way a tree closes over a nail. Your own face is in it, a little green at the edges.
- A pair of small boots, side by side on the step, laces tucked in.
- Bread in a cloth, left on a step for somebody to collect.
- A hush-lamp, still burning on the last of its oil. The reed in it is the only thing in Greenroot that has not stopped.
- A grave, with a reed set in the ground at its head instead of a name. The reed is dry.
- The charnel stair. Down to the ossuary, where Greenroot keeps its old dead.
- Greenroot
- A cottage door
- The Cantor's house
- The chapel door is shut, not locked. It has been pulled to from the inside and held there. Nothing on this side of it will move.
- The chapel of Greenroot
- The charnel stair, down to the ossuary
- A silent wind-reed
- The village well
- A table laid for the whole village
- A mirror grown into a doorpost
- A pair of small boots
- Bread in a cloth, left on a step
- A grave with a reed at its head
- The charnel stair
- A hush-lamp, still burning

## 4. The Chapel of Greenroot

The barred door, the lever, the lectern and the register.

- A long table laid down the nave for the whole parish: bowl, cup and spoon at every place, thirty-one by your count. The cloth is turned back at the far end, where someone was still laying it.
- A pew. A folded shawl lies on the end of it.
- The lectern. The Greenroot register lies open on it, with a reed across the page.
- The Cantor's kettle on the vestry stove. Long cold. The cup beside it has a ring in the bottom that has dried black.
- A Cantor's cloak on its peg. The hem is stained to the knee and has dried that way.
- A rack of tuning-reeds, one slot for each house in Greenroot. Every slot is full.
- A lever on the wall beside the door, wired to the bar that holds it. Whoever barred this door from inside went down the stair after, and did not come back up to lift it.
- The bar lies across the door, in its brackets. There is a lever on the wall beside it that would lift the bar.
- The bar is lifted. The chapel door will open now, from either side.
- The lectern. There is a pale oblong on the wood where the register lay, and a reed across it.
- The Chapel of Greenroot
- The stair down to the undercroft
- The chapel door
- The lectern
- The Cantor's kettle
- A Cantor's cloak on its peg
- A rack of tuning-reeds
- A long table, laid for the parish
- A pew
- A lever beside the door
- A counterweight drops somewhere above, with a long iron sound. The reed gate in the ossuary hall has gone up.
- The bar lifts out of its brackets with a sound like a held breath let go. The chapel door will open, from either side.
- You take the Greenroot register.

## 5. The Greenroot Register (held sheet, eight pages, and its three answers)

[PROPOSED] the entire register. The last line stops mid-sentence, on purpose. Dates are Anchor-named days and bare years.

- Greenroot. The register of the parish, kept by Ilse Verrow, Cantor, in her own hand. Seven houses and thirty-one souls. [PROPOSED]
- Hearthday, 417. Counted the reeds in the wind at dusk, as I do each week: seven houses, seven reeds, every one sounding. Thirty-one at supper on the green. Hesper Pell, eighty-one, said the grace and held it past the end, as she does, and we all waited for her. [PROPOSED]
- Massday, 417. A letter from Tobin Ashgrove at Oakhaven. The Cantors of the three nearest parishes are to come to the Greenhall. I will go when the hay is in. The hounds have begun to sit on the Flume bank in the evenings. They do nothing. They sit. [PROPOSED]
- Nullday, 417. I answered Tobin. I wrote it three times. The pen worked and the ink went on, and each time the page would carry only the one line. I have sent that. It says: We have stopped being able to send. [PROPOSED]
- Driftday. The Joss reed did not sound. I took it down and blew across it and it spoke perfectly well. I hung it back up. In the wind it was silent. Six. [PROPOSED]
- Memoryday. Four. Ansa Pell's kettle was boiling and she could not hear it. We both stood and watched it. [PROPOSED]
- Rootday. Two. We have carried the tables into the chapel, all of them, to be together where the lamps are, and to see one another speak. Thirty-one places laid. Hesper held the grace again and we watched her lips to the end of it. [PROPOSED]
- Hearthday. One, and it is mine. I have put a lamp in every window. A hush-lamp keeps a room from going quite still, and the reed in it is the only thing in Greenroot that still sounds, and I find I am listening to it the way you listen to a person who is about to [PROPOSED]
- The next line is ruled, and empty. [PROPOSED]
- Take the register. Someone should read it to the end.
- Leave it where it lies.
- Close the book.

## 6. The Greenroot Undercroft: verses, bells, sung wall, sluice, gates

[PROPOSED] the Pell family bells (eighty-one, fifty-six, thirty-four, nineteen: eldest first, youngest last), the grooved reed-stone that wants the Root note, the Last Note held by a family.

- CARVED OVER THE STAIR: HOLD IT AS THE FAMILY HOLDS IT. THE ELDEST FIRST, THE YOUNGEST LAST, AND EACH WAITS FOR THE ONE BEFORE TO GO QUIET.
- CARVED BY THE BELLS: PELL. FOUR BELLS TO A HOUSE. NOBODY RINGS ONE OUT OF TURN.
- A niche with a reed hung in it, and the long bones of whoever it was kept for. The reed is dry.
- Grooved reed-stone. Each groove is cut to a pitch. The deepest one hums, very faintly, when you stand near it. It wants a note sung into it.
- Grooved reed-stone, each groove cut to a pitch. The deepest hums.
- CARVED BESIDE THE GROOVED STONE: SING IT THE NOTE EVERY CANTOR LEARNS FIRST, AND STAND CLOSE. THE ROOT, OR THE MENDING OF IT.
- A reed gate, iron-shod, shut. A bronze counterweight lever somewhere beyond the water would raise it.
- The passing gate. It will not rise until the house has been rung down in order.
- A sluice valve, wheel and pipe, green with a century of damp. Turned, it would let the deep channel down into the shallows.
- A bronze counterweight lever, set into the stone. It is wired to a gate somewhere above.
- Three chairs set close, facing a fourth. This is where a family sat to hold the Last Note, in the old way. In the new way they sat in silence and held it anyway.
- A shrouded recess in the wall. Whatever is laid in it is not found.
- The wheel turns, and turns, and then there is a sound of water going somewhere. The channel sinks to a shallow.
- Ansa Pell, thirty-four
- Hesper Pell, eighty-one
- Wick Pell, nineteen
- Joss Pell, fifty-six
- The Greenroot Undercroft
- The passing gate
- The reed gate
- Up the charnel stair
- The stair up to the chapel
- A verse carved over the stair
- Carved by the bells
- Carved beside the grooved stone
- A passing-bell on the rail.
- A niche with a reed hung in it
- Shrouded body recess — G to conceal nearby remains
- A sluice valve
- A bronze counterweight lever
- Chairs set close, facing a fourth
- A Cantor's strongbox
- A Cantor's case of reeds
- A family's strongbox
- The eldest. The hall waits.
- The next of the house. The hall waits.
- And the next. One more.
- The youngest, last. Under your feet, a bolt draws back.
- It rings out of turn. The rail goes still, and something under the floor sets itself back.
- The bells have been rung down in their order. They hang quiet, and the passing gate stands open.
- You sing the root into the stone. The deepest groove takes the note, and gives it back a fifth higher, and the middle panel sinks into the wall.
- The stone hums under your note, a little, and will not open for it.
- The wheel is spent. The channel is a shallow.
- The counterweight hangs at the bottom of its run. The reed gate stands open.

## 7. Mire-drone and Fret-crawler: combat and status text, HUD, Options

HUD readouts on the canvas are SEVERED <seconds> and HEAVY. The Options row is Mire-drone despair (On/Off).

- The bite cuts across your breath. You open your mouth for the interval and it will not hold. No Song will keep its pitch for a while.
- You reach for the note and every interval slides off it. Your voice has been cut. Wait it out.
- Your voice finds its pitch again.
- Under hearing, a single low note. Your limbs are heavier for it, and the road seems very long.
- The flagstones here are not quite flat. Something is lying very still on them.
- It is very dark below. If you carry a lantern, this is the place for it (U).
- Verrow's case sits in your pack. Your breath settles a little.
- Mire-drone despair
- a heavy view-edge, drained strength and a low hum near a Mire-drone
- SEVERED
- HEAVY
- SEVERED {0}
- HEAVY
- Mire-drone despair

## 8. Ending: giving the register (Ignatius or Lyra), rumours, Gazette, rewards

[PROPOSED] two consequence lines each by rumour and one Gazette item each. Rewards: Ignatius 45 sovereigns, 60 xp, Synod +3; Lyra two tonics, a jar of honey, 60 xp, Hedge +3.

- The Greenroot register
- A parish book from Greenroot. I do not know what it says. If it is a register, someone should read it to the end.
- The Greenroot register. If it is Ilse Verrow's, then it is the only account there is. Hand it to someone who will read it through.
- The Choir-Church keeps a file on Greenroot. It is short. The clerks write consolidated against parishes they cannot reach, and I have not signed it. I will say this once: if someone were to bring me that parish's own register, I could not sign the file at all, and I would have to ask it why.
- Filed. I read it before I filed it. The clerk does not know that, and you will not tell him.
- I read them out most evenings. The Pells, the Joss house, the Cantor. Thirty-one. Nobody asked me to, and I find I cannot stop.
- A book strapped shut, and your face the way a face is when it has carried a thing a long way. Is that the Greenroot register? Let me see it. No. Do not let me see it, I know what is in it. Give it here.
- Give him the register.
- Not yet.
- He reads it standing, to the very end, which takes a long time. Then he closes it and holds it flat in both hands. "It will be filed," he says, in the voice of a man reading from a card, and for a moment he does not look at you. "Take this. The Church is not ungrateful, whatever the file says."
- Then keep it a little longer. It will not get lighter.
- That book. Where did you find it? Greenroot. Ilse Verrow. We were girls in the same Conservatory, she sat behind me. May I? Please. I would like to have it read, by someone, properly.
- Give it to her to keep.
- She reads the names aloud, softly, one by one, to the very end, and when she reaches the line that stops she does not stop. She says the rest of it into the room, as if it were Ilse's. Then she puts the book with Tobin's pages. "A book that is read to the end is not lost," she says. "Thank you. Here. For the road."
- Of course. When you are ready. It is not going anywhere. It is the one thing in this story that is not.
- You gave the Greenroot register to Ignatius
- A register from Greenroot way went into the Church's vestry cupboard. Filed, they say. I notice nobody has said what it was filed under.
- You gave the Greenroot register to Lyra
- Lyra reads names out of a book of an evening, low, in the Cantor's chair at the back. Greenroot names. Nobody asks her where it came from, and she does not say.
- You gave the Greenroot register to Lyra (Hetty)
- Lyra sat in the corner with a book last night and read out names, soft, till the candles were low. I put a free drink in front of her. She did not drink it. She did not stop reading either.
- The parish of Greenroot is recorded as consolidated. Its register has been received and filed by the Choir-Church. Correspondence addressed to the parish will be answered by the file.
- A parish register of unconfirmed provenance is reported to be read aloud in the Cantor's house of an evening. Reading aloud is not an offence. The reading is noted.
- two tonics and a jar of honey
- I could not say.
- You receive {0}.
- {0} sovereigns
- Tell me about {0}.
- Register

---

## Companion conversations (Phase 9, team TALK) - review text

All new player-facing text from js/companion-talk.js, grouped by place. Quoted speech in the catalogue is exactly what the panel shows; Lyra's lines are shown here once and appear three ways in the game: as slate capitals while she is silent, as quoted speech once lyra_voice is set (with the tag "she says, in her own ruined voice." on her first line), and as the plain line in her `Lyra: "..."` form for the road/rest chatter.

Every topic is once-only (a bit in G.flags.p9t_t), 2-4 beats, 2-3 replies in different tones (steady / kind / blunt / curious / silent). Lines marked [PROPOSED] contain invented facts for Commander review; the full list is at the end.

## How to read the entries

- `>` a reply the player can pick (tone shown on the button in game).
- Plain lines are the companion speaking or narration.
- _italic note_ lines are narration shown between replies.
- Gate = existing flags only. `approval` = the change each reply can make (applied once, when the topic is finished).

## Kaelen (weary, understated)

### The arm  (`k_arm`, bit 0)

- Gate: `true`
- Approval on replies: 1, 2 (bank-capped, applied once)

He turns the glass hand over on his knee, palm up, the way you would show someone a tool that had stopped being yours. "Ask. Everybody wants to. Nobody does."

> "Does it hurt?"

"Not any more. The pain went first, and the glass came in behind it, like a tide over flat sand."

"It drinks what it breaks. Every Legionnaire, every hound: the ring gets fuller. I know the price of every fight before I take it. I take it anyway." He closes the hand. "That is not courage. That is arithmetic with the sign wrong."

> "Then let me take the front."

"No." Quickly. Then slower: "No. Thank you. You will take your share and I will take mine, and neither of us will say whose was heavier."

> "Stop fighting, then."

A short, dry breath, almost a laugh. "I did that sum too. If I stop, somebody else pays in a different coin. I would rather it were mine."

> "Does Lyra know the number?"

"She has never asked. That is a kind of knowing, and a kind of mercy, and I have not earned either."

> "How far has it climbed?"

"Four fingers from the shoulder, when I last measured. I measure in fingers. It is the one unit the arm cannot argue with." [PROPOSED]

> Say nothing. Wait.

He looks at you, and then at the glass. "Good. Most people fill the gap."

### The Foundry  (`k_foundry`, bit 1)

- Gate: `kaelen_met && (coil_done || part3 || part4)`
- Approval on replies: -1, 1, 2 (bank-capped, applied once)

"Four-twelve. The Foundry floor, the morning of the Fracture. I had my sleeve rolled and my hand flat on the glass. 'Hold,' I said, to the room. The room held. That was the trouble." [PROPOSED]

> "What happened?"

"The needle climbed. Everything in the hall leaned one way, the way grass leans before rain. Then the light turned, and the arm stopped being something I could describe."

"I keep a list now, on a beam, in chalk. The Synod kept lists too. It is the same list. I just pay it down in smaller coin, one name a day, and I do not get to stop." [PROPOSED]

> "Let me carry some of it."

"It does not come in pieces." After a while, not looking at you: "Stay near anyway."

> "Read me one name."

"Not tonight." He taps two fingers against his knee, once. "Ask me when I can say the first one without stopping."

> "You could not have known."

"I could have. I was the one man in the building paid to." He says it without heat, like a load figure.

> "Was any of it worth it?"

The silence is long enough to count in. "Ask me when the number is on the right side of the page."

### Why the Synod  (`k_synod`, bit 2)

- Gate: `part3 || part4`
- Approval on replies: -2, 1 (bank-capped, applied once)

"You want to know why an engineer takes the Synod's money. It paid. The Conservatory paid, the Consortium paid more, and it looked like fixing things: a bore here, a table there, a town fed. I was seventeen and I could make a wrong note come right." [PROPOSED]

> "You believed it."

"I believed the table. Tables don't lie. It's the people who hold them upside down."

"My father sold the Root to keep the town fed. I told myself I was doing the same sum, only bigger and better. It is the same sum. It is always the same sum."

> "What would you do with it now?"

"Nothing clean. Break the right thing, slowly, and stay to hear it go."

> "Your father fed a town."

"He did. Keep saying it to me until it stops sounding like an excuse."

> "You knew."

"Some of it. By line ninety-four I knew enough to look away, and I looked away. That is the part I earned." [PROPOSED]

> "It paid. Fair enough."

A short sound in his throat. "Don't let me off. I would only know."

### Lyra  (`k_lyra`, bit 3)

- Gate: `part3 || part4`
- Can unlock: kaelen:rest
- Approval on replies: 1, 2 (bank-capped, applied once)

"She taught me the Root note when we were nine. I hum it when the arm is bad. She knows, and has never said so, and that is her kindness, and I am wasting it."

> "She would want to hear it from you."

"That is what frightens me. That she would."

> "Then tell her. All of it."

"Soon. I have the words. What I do not have yet is the nerve to say them aloud, where they stop being a record and start being mine."

> "You could just hum at each other."

The corner of his mouth moves. "We have. For years. It is a poor way to say anything."

"I told her. All of it, out loud. She said she would have forgiven me on Rootday, and cannot now." He flexes the glass hand. "Then she took it. Not the easy hand. The glass one. It rang."

> "She meant the hand."

"I know what she meant." He is quiet. "I know what she meant, and I am still checking it for a flaw."

> "Do you feel lighter?"

"Seen. It isn't lighter. Seen is heavier, in a way, and easier to carry."

> "Good."

"It will do." The corner of his mouth moves. It is the closest thing to a smile you have seen on him.

### What he hears  (`k_listen`, bit 4)

- Gate: `part4`
- Can unlock: kaelen:chat
- Approval on replies: 1, 2 (bank-capped, applied once)

"I put the glass to a thing and it tells me what it keeps. A bell keeps its last stroke. A wall keeps whoever leaned on it. Out here?" He tilts his head. "The woods. They are very loud."

> "What does the Root keep?"

"A lullaby, and the loss of the tune, over and over. I laid my hand on it once. It turned toward me. It is tired, and it does not know how to ask."

> "Can you hear me?"

He closes his eyes. "A low, steady note, a little sharp when you are lying. Don't take that as an accusation. Everyone is a little sharp." [PROPOSED]

> "Does it ever go quiet?"

"On the hound-bed, outside my hut. A day without one voice in the glass. I used to walk out and stand there, just to remember what my own head sounded like." [PROPOSED]

### About you  (`k_you`, bit 5)

- Gate: `part4 && c.heard('kaelen') >= 3`
- Can unlock: kaelen:title
- Approval on replies: -1, 1, 2, 3 (bank-capped, applied once)

"Nobody came to the hut in four years who did not want something broken, or someone forgiven. You came and asked how to stop a thing. I have been trying to work out what that makes you."

> "Someone who needed an engineer."

"That is a better answer than I deserve. I will take it."

> "Someone who stayed."

"Yes." Only that. He looks at the fire for a long time. "Yes. That."

> "Don't decide. Walk with me."

"Walking is the one thing I am certain I can still do."

## Lyra (slate / ruined voice)

### The reeds  (`l_reeds`, bit 8)

- Gate: `lyra_met || lyra_wg_met || lyra_dw_met`
- Can unlock: lyra:rest
- Approval on replies: -1, 1, 2 (bank-capped, applied once)

Father set me the long cane first, the one that sounds the root. I blew across it until the note stopped being a noise and became a place. [PROPOSED]

> "Tell me about the First Reed."

Every child gets one over the door, tuned before they can lift their head. I tuned ours standing on a chair, with my tongue between my teeth. [PROPOSED]

A cut reed dies in a day. It holds any pitch you ask, and by the next dusk it is a stick. That is why we cut them fresh. That is why we love them.

> "A day is long enough."

Yes. A day is exactly long enough for the thing you meant to say.

> "That sounds like waste."

It is the opposite. Waste is a reed nobody cut.

> "Can you still play one?"

Not without a breath to put through it. I hold one sometimes anyway. It is company.

Badly. It sulks. A reed knows when you have lost something.

> "I never had the ear."

Nobody has the ear. They have the patience. Listen anyway.

### Tobin  (`l_tobin`, bit 9)

- Gate: `part3 || part4`
- Approval on replies: -1, 1, 2 (bank-capped, applied once)

He called me lark. He said a martyr is just a musician who gave up before the coda. Then a child in the lane went still, and he raised his voice above the Narrow to call her back, and she lived.

> "I'm sorry."

Don't be sorry. Be accurate. He called a child home and she came. Write that down first.

If you ever hear a man in the dark call "lark," it is not him. Promise me you will not answer.

> "I promise."

Thank you. That is a kindness I can use.

> "I'd answer. To see what it does."

Then do it with me beside you. I won't be left holding your silence.

> "Was it worth it?"

The child is alive. I do the sum every night. The answer changes. She is alive in every one.

> "Do you want the blade back?"

Not yet. Too heavy for a first fifth. I told him that once, and I was right then too.

> "What wears his voice?"

_Lyra is quiet for a long moment._

A thing that practised him. I will not give it the dignity of a name until it gives him back.

### The Rite  (`l_rite`, bit 10)

- Gate: `coil_done || part3 || part4`
- Can unlock: lyra:chat
- Approval on replies: 1, 2 (bank-capped, applied once)

They would have put a collar on my throat and a wire through my voice. I sang the falling fifth against the bore instead, and the bore broke. So did something in me. Nobody told me the singing was a loan.

> "You chose it."

I did. We choose, and then we pay, and the paying is always later and always larger. That's not a complaint. It's tuning.

> "Does it hurt now?"

Only when someone else sings well. That is not the voice. That is envy.

> "I'd have sung it for you."

You'd have sung it flat. Thank you. Truly.

### The Hedge  (`l_hedge`, bit 11)

- Gate: `part3 || part4 || greening || hedge_answered || hedge_silent || hedge_listened`
- Approval on replies: 1, 2 (bank-capped, applied once)

I kept my hand on the wool the night we planted it. It's listening, I said. Father said it was packed wool. I said, I know.

> "Was the Hedge a mistake?"

It was the only plan anyone offered. A candle is safe in a jar. A candle in a jar is also no use to the room.

> "Something answered me from it."

Then you've met it. It tried my father's fifth on me first. I won't ask what it said in yours.

> "I kept quiet inside it."

Good. Quiet is the Hedge's native tongue. You speak it better than most of us.

> "I listened to it."

Everyone does. It listens back. That is the whole of its charm.

> "Do you miss being inside?"

Not the walls. Being allowed to be loud and still found. Out here you are either quiet or found.

### What she would sing  (`l_sing`, bit 12)

- Gate: `(part3 || part4) && (lyra_wg_met || lyra_dw_met)`
- Approval on replies: 1, 2 (bank-capped, applied once)

If I could: the house song first. Then the Root, for Kaelen's arm. Then something rude, for me.

> "What's the rude one?"

The Miller's Daughter, both verses. Father sang it for Tam. It is not a hymn. It is true. [PROPOSED]

> "You'll sing again."

Something is sitting on it. I know what. I'm not ready to ask it to get up.

> "I'll sing the rude one for you."

_A laugh, silent, in the whole of her shoulders._

Then I will hear it first. Be loud. Do not be right.

_She touches her throat._

Now? With this? The Root, under my breath, for Kaelen's arm. Then something rude, for me.

> "It's a good voice."

It's a ruin, and it's mine. Don't lie to me with kindness. Lie to me with beer.

> "Sing it now."

_She does, low and rough: three bars of something a Cantor should not know._

There. Don't tell the Church.

### About you  (`l_you`, bit 13)

- Gate: `part4 && c.heard('lyra') >= 3`
- Can unlock: lyra:title
- Approval on replies: -1, 2, 3 (bank-capped, applied once)

I taught children for years. I know what it looks like when someone pretends to be steady so the others can be. It's a skill, and it costs. Who do you sing to, when it's your turn? [PROPOSED]

> "No one. There hasn't been time."

Then borrow mine. Humming is free. No one has ever been charged for it.

> "I'm fine."

_Lyra looks at you the way she looks at a reed she suspects of lying._

Of course you are.

> "You. When you're ready to listen."

Then we are waiting for the same thing. That's a start. That's a whole interval.

## Sable ("Entry:" ledger voice)

### The Bound Ledger  (`s_ledger`, bit 16)

- Gate: `sable_met || sable_wg_met || sable_with || sable_joined`
- Approval on replies: 1, 2 (bank-capped, applied once)

"Entry: the Bound Ledger keeps a name only at a price, weight for weight. I carry it open so that I never forget it is a debt."

> "What have you paid so far?"

"Entry: nothing yet. I have three things, and I recite them every night, so that I know which one goes." [PROPOSED]

"Entry: the smell of the scriptorium. Lampblack and oak-gall. I am told it was good. I no longer know what that means." [PROPOSED]

"Entry: one thing, for a man on a bench. I could not name it afterwards. I am most careful about that. I record that I cannot name it."

"Entry: the scriptorium, and one thing more, for a man on a bench, which I cannot name. One left. I recite it every hour." [PROPOSED]

> "Is it worth it?"

"Entry: the question is asked. The answer is a weight, not a sentence. It is worth it to the one it is spent on. It is not worth it to the one who spends."

> "Let me carry it a while."

She considers it with the whole of her face. "No. But you may hold the lantern. That is a trust."

### The Veil  (`s_veil`, bit 17)

- Gate: `sable_met || sable_wg_met`
- Can unlock: sable:chat
- Approval on replies: 1, 2 (bank-capped, applied once)

"Entry: the Veil records the death of civilisations. We do not hold it back. We do not hurry it. We write what was said, and by whom, and on which day."

> "And you never stepped in?"

"Entry: the question I asked in the Cloister doorway. I counted eleven in. I did not count them out. I am still writing the second column."

> "Why leave the Veil?"

"Entry: a list is not a cure. I said it so often it became a vow. Then a stranger came to the mist with a question, and I found I had stopped believing the second half."

> "Someone has to remember."

"Yes. And someone has to forgive the remembering. I am not sure the Veil trained for that."

### The schedule  (`s_schedule`, bit 18)

- Gate: `sable_met || sable_wg_met`
- Approval on replies: 1, 3 (bank-capped, applied once)

"Entry: I did not merely sign the Catalogue. I designed the harvest schedule, and I made it efficient. I wrote 'in white' on the Stage Nine form, so the Cantor would not be mistaken for staff. I was proud of the handwriting."

> "You can't undo that."

"No. I can only read it back, one name at a time. It is slower. It is the one direction left."

> "You couldn't have known."

"Entry: I knew the number. I knew the column. Not knowing is a luxury of the people who did not draft the form."

> "Quist kept your desk."

Her pen stops. "Entry: he said that. He would. He poured the second cup." She does not write the next line.

> "What would you write now?"

"Not 'in white.' Anything but that."

### The boy in the Cloister  (`s_boy`, bit 19)

- Gate: `aegis_calmed && (sable_with || sable_joined)`
- Approval on replies: 1, 2 (bank-capped, applied once)

"Entry: WG-forty-one thousand and five. A boy of the Cloister choir. A girl in a red cloak would not let go of him at intake, and my hand shook, and I made his surname illegible. The shaking is all the Office has of him now."

> "You'll find his name."

"The Organum, third floor, the Hall of Carriage. I know the cabinet. I know the clerk's handwriting."

> "Why did your hand shake?"

"Because the girl would not let go. That is the whole reason. I have no better one, and I have looked."

> "Does it understand you?"

"It gave me the cloak. Entry: whether it understood me is a question for the cloak."

"Entry: it knows the alto line. I do not know what else it knows. I have not asked. I record that I have not asked."

### About you  (`s_you`, bit 20)

- Gate: `part4 && (sable_with || sable_joined) && c.heard('sable') >= 3`
- Can unlock: sable:title
- Approval on replies: 2, 3 (bank-capped, applied once)

"Entry: the stranger. I have a page for you and it is not full. I do not know what to put in the column marked 'reason.'"

> "Write that I stayed."

She writes it. You hear the nib. "Entry: the stranger stayed. Reason: unrecorded. I will let it stand."

> "Read me what you have so far."

She turns the page toward her chest, gently, as if it might wake. "Not yet. Ask me again."

> "Leave the column blank."

"That is the kindest instruction I have ever been given. It is also, technically, an omission." The corner of her mouth moves. "I will allow it."

## Vane (bravado over grief)

### The Kestrel  (`v_kestrel`, bit 22)

- Gate: `dw_vane_met || part4`

"She's on her side in a wood with a hole in her you could post a sheep through, and I have never loved her more. Don't tell Tobiah. He thinks she's his."

> "Will she fly again?"

"Forty-mile hops, if the silk holds. Up, down, cool the tank, up. Stepping-stones, if the stones were on fire." [PROPOSED]

> "Why this ship?"

"Bought with money I'd rather not discuss, from people I'd rather not name. She was the only thing for sale that didn't ask what I was running from." [PROPOSED]

> "You love a ship more than people."

"Ha. A ship has never once asked me to feel anything. Mags would hit you for that." He grins. "Then she'd agree."

### The crates  (`v_crates`, bit 23)

- Gate: `vane_told || crates_heard || part3 || part4`

"One thousand three hundred and forty-two. I know the number now. I didn't want to. I carried twelve crates for two years and never asked what was in them. It's a skill. I was very good at it."

> "You didn't know."

"Don't. I knew the way you know a stair is missing in the dark. By not putting my weight on it."

> "You're asking now."

"Loudly. I'm told it counts. Mags says it counts."

> "Say Annet's name."

"Annet Sowerby. Six." He says it like a man setting a cup down very carefully. "She asked the Carder boy his name through the side of a crate."

### The cutter's hold  (`v_cutter`, bit 24)

- Gate: `part4 && dw_vane_met`

"Four hundred and thirty-two, in felt sleeves. I heard them all the way down when she went into the willows. Nobody tells you a voice in a bottle keeps its tone. Some of them were singing."

> "What should we do with them?"

"Open them where nothing else is listening. Or don't. I won't tell you which. I've been wrong about doors before."

> "It's done now."

"It's done. I counted the quiet after. It's a different sort of count."

> "You heard them singing?"

"One tune, four hundred ways. I didn't know the tune. I hum it when I'm not watching myself."

> "Don't hum it."

"Ha. Sap and splinters, you sound like the Cantor." He hums it anyway, one bar, and stops.

### Lifting off  (`v_lift`, bit 25)

- Gate: `tank_patched || coda_done`
- Can unlock: vane:journal

"She'll lift when you say. I won't lift without the Cantor. I've done that sum before, and I didn't like the answer."

> "We'll all go together."

"That's the only sum I'll sign."

> "And if I said now?"

"Then I'd say what I'd say to anyone who tried me. Not yet, and not without her." He is not smiling.

> "You put the axe down at the fire."

"I did." He turns the blade over. "Don't make it a thing. It's already a thing. That's why I put it down."

> "Where would you go, after?"

"Somewhere with a horizon and no paperwork. Mags says that's called dying. I say it's called Port Cantabile." [PROPOSED]

## The calmed Aegis (chords)

### The singers  (`a_singers`, bit 27)

- Gate: `aegis_calmed`

It turns its bronze head toward you. DEFEND. THE. SINGERS. Underneath the words, very softly, a chord: the alto line, held.

> "The singers are safe."

It chimes a long rising third, and holds it until you stop speaking.

> "Who taught you the alto line?"

A pause the width of a breath. Then one low fifth, and a high, shy note, a little flat on the turn. It is not a name. It is how a boy says one.

> "Rest."

It does not kneel. It chimes the root, once, and faces the dark, and you understand that it has been told something it means to keep.

### The red cloak  (`a_cloak`, bit 28)

- Gate: `aegis_calmed && cloak_given`

It stands with its hands empty, which you have not seen before. It chimes a chord that resolves, for what may be the first time in three years, upward.

> "Sable keeps her promises."

DEFEND THE SINGERS, it says, as if in reply, and then a warm, dropped chord, like a cloak settling over a shoulder.

> "You are allowed to stop."

It looks at its hands. It does not put anything down. It chimes the alto line once, to the empty air, and lets it end on the right note.

## Panel, buttons and messages

**kaelen / the panel**

- Kaelen looks up from the glass hand.
- Kaelen thinks the better of you.
- Kaelen thinks less of you.

**lyra / the panel**

- Lyra lays down the slate, and her whole attention with it.
- Lyra thinks the better of you.
- Lyra thinks less of you.

**sable / the panel**

- Sable closes the Bound Ledger over one finger.
- Sable thinks the better of you.
- Sable thinks less of you.

**vane / the panel**

- Vane puts the axe down within reach, and rubs his face.

**aegis / the panel**

- The Aegis turns its bronze head. The plates shiver, and chime.

**the panel**

- There is nothing more to say, for now. Come back when more has happened.
- She writes on her slate and turns it to you:
- she says, in her own ruined voice.
- This will come up again.
- something you said
- Talk
- Talk...
- "Can we talk?"
- Not while danger is near.
- Said
- Back
- Goodbye
- Go on
- Talk to your companion

**Options**

- Companion conversations
- a Talk option with your companions, when it is calm

**Lyra / state lines**

- Lyra turns her slate to you:

## Small permanent things (unlocks)

These reuse what the game already has: earnTitle(), the rest-camp murmur, the road chatter, and the journal. Nothing here changes combat.

**kaelen / at the rest fire**

- I'll take first watch, and I'll hum where she can hear it. Nobody asked me to. Sleep.

**lyra / at the rest fire**

- Sleep. I'll hum the Root for the arm, and the Miller's Daughter for me. Both verses. [PROPOSED]

**kaelen / on the road**

- Your note has been steady since the Hedge. I stopped checking. In my trade that is a compliment.

**lyra / on the road**

- Envy isn't the worst thing to carry in a throat. Hunger is. I'm only envious.

**sable / on the road**

- Entry: the stranger said someone has to remember. I have decided that it is a form of company.

**kaelen:title / title**

- Load-Bearing [PROPOSED]

**lyra:title / title**

- Beside the Reed [PROPOSED]

**sable:title / title**

- Entered in the Ledger [PROPOSED]

**vane:journal / logbook**

- Vane put the axe down at the fire and said not to make it a thing. I did not.

## [PROPOSED] items (invented facts needing Commander sign-off)

- the arm has climbed four fingers from the shoulder
- the Foundry morning is dated 412
- Kaelen keeps a chalked list of names on a beam
- Kaelen took the Synod's money at seventeen
- Kaelen read to line ninety-four of the table before looking away
- Kaelen hears each person as a note (his glass reads a "signature"); yours is low, steady, a little sharp when you lie
- the hound-bed outside the hut as the one quiet place in the glass
- the First Reed custom: a reed tuned over each child's door; cut reeds hold a pitch for a day
- the Miller's Daughter, two verses, sung by Lyra's father for Tam
- Lyra taught children for years before the Rite
- what Sable has paid, and what she has left (tied to the fragment count she already carries)
- the Kestrel hops forty miles at a time
- how Vane came to own the Kestrel
- Vane wants Port Cantabile for its horizon
- new title names

All other facts echo existing text: the Foundry and the Fracture, the Root note, Kaelen's hut, the Bound Ledger and Sable's three fragments, the Stage Nine form, WG-41005 and the red cloak, Vane's 1,342 crates / 432 vox-bottles / Annet Sowerby, Tobiah and Mags, Tobin and "lark".

## French

Every string above (and the Lyra quoted/capital variants, the rest/chat/message forms and the approval messages) has a French line in tools/i18n/p9-talk.tsv as "<english><TAB><french>" (400 lines). Vane tutoie; Kaelen, Lyra and Sable vouvoient; the player is never gender-marked.
