# Echoes of the Shattered Octave — Phase 6: all new in-game text, for the author's review

Everything below is new player-facing prose added to the browser game in Phase 6 (story reactivity). Anything that goes beyond the game's existing text and the world bibles is marked [PROPOSED] in the code. Two review fixes were applied after these files were written: Gazette No. 36 is now "THE HOLD OVER OAKHAVEN PROCEEDS" (the Rite of Pure Unison is the earlier Sol-Luminary rite), and Lyra's coda epilogue now reads "It cost her what was left of her voice. She talks in chalk now, in capitals, and makes every word earn its place on the wall."


---

## RUMOURS: player-facing text (Phase 6)

All prose is written to LORE_P6.md. Invented beyond the brief is marked [PROPOSED] in js/rumours.js.

## 1. "Any news?" at the Boar & Dulcimer (Hetty and the tavern patrons)

Chosen deterministically: ask n takes the n-th of the five newest eligible deeds (highest rank first), except every third ask is world/weather/town colour. Never the same line twice running.

### Deeds, story stages, law

- **d_cantor_asks** (any, rank 10) trigger: not: lyra_met, greening — You have not yet met Lyra
  - Does it ring? The Cantor has been asking at the gate after a stranger. If that is you, Cooper's Row, the house with the green door, and do not sing on the way.
- **d_hearthday** (any, rank 12) trigger: not: rite_started, greening, escaped — Before the Rite; the wording follows the days left to Hearthday (day 10)
  - 6+ days left: Hearthday is the best part of a week off and the Church is already on the Greenroot road. Singing, naturally. Hymns bring hounds and the Church does not care.
  - 3-5 days left: Hearthday is the best part of a week off and the Church is already on the Greenroot road. Singing, naturally. Hymns bring hounds and the Church does not care.
  - 1-2 days left: Hearthday is on us tomorrow or the day after. I have put the good mugs in the cellar and the bad ones on the bar. Sap and splinters, I hate a Rite.
  - Hearthday or later: They say it is Hearthday or near enough, and the Chapel smells of hot bronze. I have stopped counting days. I count lamps.
- **d_gate** (any, rank 20) trigger: all of: gate_open · not: kaelen_met — Harrow has opened the North Gate for you
  - Harrow unbarred the North Gate after dusk for someone with the Cantor's word. Eleven years he has kept it shut at night, and it took a stranger and one sentence to move him. Folk would like the sentence.
- **d_kaelen** (any, rank 30) trigger: all of: kaelen_met · not: coil_done — You have met Kaelen
  - Somebody walked out past the hound-bed to the Governor's son and walked back with their voice still in them. That is more than anyone expected. What he said is what folk want to know.
- **d_quarry_charts** (any, rank 32) trigger: all of: tobiah_met · not: coil_done — Tobiah gave you his charts
  - A boy on the quarry night shift has given something away he ought not to have, and it was not money. The Factor's people are counting paper. Sap and splinters, I would not be that boy.
- **d_coil** (any, rank 65) trigger: all of: coil_done · not: rite_started — Kaelen has the coil and has given you the pass
  - They say a coil has gone from Depot Three and a Consortium pass is in the wrong pocket. That is the quarry's business, and I suspect the Governor's son's. Hearthday is the day, whatever the day is for.
- **d_rite** (any, rank 80) trigger: all of: rite_started · not: greening — The Rite has begun (you went down to the Root-vault)
  - They walked the Cantor down in white, and the town hummed the Root note under the Pure Note, too quietly to punish. I am humming it into the mugs. Do not tell the proctors.
- **d_lyra_taken** (any, rank 85) trigger: all of: lyra_taken_seen · not: greening — You saw the seal on Lyra's shutter
  - The shutter on the Cantor's house has a proctor's seal pasted over it, and the hearth is cold. They call it the Church's protection. I call it a very tidy cell.
- **d_greening** (any, rank 95) trigger: all of: greening · not: escaped — The bore is broken and the Greening has begun
  - The oaks are doubling and ringing, and the cobbles are splitting from underneath. Get to the mooring mast on the east side of the square. The corsair takes children first, four to a line.
- **d_escaped** (any, rank 98) trigger: all of: escaped — You got out on the Kestrel
  - A skyship lifted off the mooring mast with more aboard than she had line for. They say the whole Reach heard the town after her. Calling, I would say, not singing.
- **d_part3** (any, rank 100) trigger: all of: part3 — Part Three: the Kestrel has reached Whisper-Grove
  - A skyship put down at Whisper-Grove, where nobody has put down since the Silencing in '16. The Port Cantabile sheets have it in four versions. One may be correct.
- **d_part4** (any, rank 101) trigger: all of: part4 — Part Four: the Deep Woods
  - A pedlar out of the Deep Woods says the quiet there has begun to keep time. He would not say whose. He bought nothing and left by the road he came.
- **d_done** (any, rank 102) trigger: all of: book_one_done — Book One is finished
  - There is talk on the barges of a skyship with a willow crown and a holed tank, down in the Deep Woods, and of an Office cutter nobody can account for. The Office has the cutter down as redeployed. [PROPOSED]
- **d_hetty_wait** (hetty, rank 22) trigger: all of: hetty_crates · not: crates_heard — Hetty asked you to listen at the crates; you have not
  - The cellar has been quiet all day. I went down twice and put my ear to the wood and it was only wood. That is worse.
- **d_hetty_wait_p** (patron, rank 22) trigger: all of: hetty_crates · not: crates_heard — Hetty asked you to listen at the crates
  - Hetty keeps going down to her cellar to listen at the corsair's crates, and coming up with her face shut. Do not ask her. I asked her.
- **d_crates_heard** (patron, rank 34) trigger: all of: crates_heard · not: vane_told — You have heard the crates (and Vane has not been told)
  - Something is said to be in the corsair's crates that Hetty will not name. She has stopped letting anyone carry a cask down there but herself.
- **d_hetty_paid** (hetty, rank 36) trigger: all of: hetty_paid · not: vane_told — Hetty paid you for the crates; Vane has not yet heard them
  - He is in the corner again, laughing at nothing. Go and make him hear them, will you. I paid for that, and it was not cheap.
- **d_vane_told** (hetty, rank 40) trigger: all of: vane_told · not: rite_started — Vane has been made to hear the names
  - He sat very still last night, your corsair, with a mug he did not touch. Whatever you made him hear has stayed with him. Good.
- **d_vane_told_p** (patron, rank 40) trigger: all of: vane_told · not: rite_started — Vane has been made to hear the names
  - The corsair paid his tab in full and has not laughed at nothing since. In my experience that is a man about to fly or about to confess.
- **d_plinth** (any, rank 28) trigger: all of: plinth_read · not: greening — You read the chalk on the empty bell-frame
  - Somebody has read the chalk on the empty bell-frame. They rang in E, it says. The old women have started saying it under their breath, like a grace, and asking who taught the Hedge to whistle.
- **d_culvert_key** (any, rank 38) trigger: all of: culvert_open · not: twins_found — You took the culvert key
  - The culvert key is off its nail at Hob Wendle's. First time in a month. Somebody has gone down, and nobody has said so.
- **d_twins_found** (any, rank 42) trigger: all of: twins_found · not: hob_told — You found the twins' coats under the culvert
  - A stranger has been down the Tannery culvert and come back up. Hob's lamp is still in the window, and Hob is standing at it, not looking.
- **d_twins_named** (any, rank 43) trigger: all of: twins_named · not: greening — You wrote Joss and Wyn in your ledger
  - Somebody has written the Tanner twins down, Joss and Wyn, whole names, somewhere that is not the Office's ledger. I do not know where that is. I would like to.
- **d_hob_told** (any, rank 44) trigger: all of: hob_told · not: greening — You told Hob what you found
  - Hob Wendle has put out the lamp in his window. All of Tannery Row saw it go dark, and none of us said a word.
- **d_boots** (any, rank 46) trigger: all of: rooke_boots · not: boots_delivered — Rooke gave you Davin's boots
  - Rooke handed a stranger a pair of boots to carry across town. In this town that is the nearest thing to a confession we have.
- **d_boots_done** (any, rank 48) trigger: all of: boots_delivered · not: greening — You gave Orla Hale the boots
  - Orla Hale has her boy's boots on the chair now. She asked the stranger for the harvest song and did not get it, and she says that was right. She says Lyra will sing her down proper.
- **d_nell_wait** (any, rank 50) trigger: all of: nell_met · not: pim_safe — Nell has asked you for oiled honey
  - Nell Carder has been to the market for honey twice and come home with none. The inspection is coming. I will say no more about whose hands.
- **d_pim_safe** (any, rank 52) trigger: all of: pim_safe · not: pim_tended, greening — You got Pim through (honey)
  - The Carder boy's hands have passed. Nobody has chalked the door. Nell has started talking again, mostly to the flour sacks.
- **d_pim_tended** (any, rank 54) trigger: all of: pim_tended · not: greening — You hummed the tending note over Pim's hands yourself
  - Somebody hummed the Carder boy's hands clean who is not the Cantor. The boy says they do it different. He says it like a compliment.
- **d_tam_asked** (any, rank 56) trigger: all of: tam_met · not: tam_told, tam_left — Tam asked you if it is her
  - Old Tam asked a stranger at the Flume whether it was her. Nobody asks that who wants a straight answer, and nobody gives one who has any heart.
- **d_tam_told** (any, rank 57) trigger: all of: tam_told · not: tam_sat, greening — You told Tam the truth
  - Tam has not been to the Flume crossing in days. He sits at home with the lamp lit, which he never allowed. They say he got his answer.
- **d_tam_left** (any, rank 57) trigger: all of: tam_left · not: greening — You left Tam his hope
  - Tam is back on his stone, and the water brings his Essa up at dusk, and he sings the second verse with her. Nobody tells him anything now.
- **d_tam_sat** (any, rank 58) trigger: all of: tam_sat · not: greening — You sat with Tam in silence
  - Someone sat with Old Tam at the crossing and never said a word, and he got up and went home. I cannot decide if that is the kindest thing I have heard or the cleverest.
- **d_sable_met** (any, rank 45) trigger: all of: sable_met · not: sable_done — You met Sable outside the Hedge
  - There is a woman out east past the Governor's son's hut, writing in a book by a hush-lamp. She asks strangers for three names. The grey men at the gate want her very badly.
- **d_sable_kept** (any, rank 60) trigger: all of: sable_kept · not: greening — You told Sable to keep what is left of her
  - The scribe out past the Hedge is keeping what is left of herself, they say, and writing down who told her to. I have decided that is a good thing. I will tell you if I change my mind.
- **d_sable_returned** (any, rank 60) trigger: all of: sable_returned · not: greening — Sable read a Hollow its name back [PROPOSED wording]
  - A Hollow at the quarry pumps said its own name aloud. Hew Callan. The ones either side stopped their loops to listen, they say, as if someone had said something rude.
- **d_ignatius** (any, rank 47) trigger: all of: ignatius_met · not: greening — Ignatius Crane spoke to you in the Chapel
  - Brother Ignatius has taken to preaching at the rafters. Folk say he has seen a thing and decided not to have seen it. The Note is held regardless.
- **d_bounty_board** (any, rank 41) trigger: all of: bounty_1_done · not: greening — You collected the Writ of Clearing
  - The Greenhall board has paid out for the culling of a pack on the north road. Thirty-five sovereigns, counted twice. Clean work, they say, and quiet.
- **d_house** (any, rank 41) trigger: all of: house_bought · not: greening — You bought the house on Cooper's Row
  - Somebody has paid the Greenhall clerk sixty sovereigns for a house on Cooper's Row. In this town. In this year. The clerk bit every coin.
- **d_hedge_answered** (any, rank 61) trigger: all of: hedge_answered · not: wearer_dead, greening — You answered the Hedge
  - Harrow swears the Hedge said I'm here last night, in a voice he did not know and then did. Never answer it. Answering tells it you are there.
- **d_hedge_silent** (any, rank 59) trigger: all of: hedge_silent · not: hedge_answered, greening — You said nothing to the Hedge
  - A stranger stood at the Hedge at the dead hour and said nothing while it tried Lyra's voice, and then a child's, and then gave up. Folk call that brave. I call it quiet, and here that is the same.
- **d_hedge_listened** (any, rank 59) trigger: all of: hedge_listened · not: hedge_answered, greening — You stood and listened at the Hedge
  - They say someone stood at the Hedge and listened under the voices and heard another sound: a great many people, far down, all talking at once. I have not slept right since I heard that.
- **d_wearer_dead** (any, rank 64) trigger: all of: wearer_dead · not: greening — You killed the thing that wore voices at the Hedge
  - Whatever was wearing voices at the Hedge burst, they say, and everything it had eaten came out at once. There is a patch of ground there now where no sound carries. Do not test it.
- **c_small_bounty** (any, rank 62) trigger: Oakhaven bounty 1-39 (no notice yet)
  - The constables are asking after a stranger's light hand, or a heavy one. There is no paper up yet. They are considering, which is how paper starts.
- **c_wanted** (any, rank 70) trigger: Oakhaven bounty 40+ (the warrant is posted)
  - There is a warrant pasted up with a stranger's name on it and a sum beside the name. I am told I am sitting nearer to it than is wise. Keep your voice low and your hands where I can see them.
- **c_wanted_big** (hetty, rank 74) trigger: Oakhaven bounty 100+
  - I do not hold with trouble in my taproom, and I do not hold with the watch, and that sum on the wall would buy my cellar twice over. Drink up, and mind the door.
- **c_theft** (any, rank 60) trigger: You have been reported for theft
  - Purses in Oakhaven have gone lighter, and the constables have begun looking at hands. Quick ones, mostly. Keep yours in your lap.
- **c_assault** (any, rank 61) trigger: You have been reported for striking a civilian
  - Someone cuffed a townsman in the street and the watch took it personal. A slap is paperwork in Oakhaven. A bruise is a bounty.
- **c_jail** (any, rank 63) trigger: You have served time in the watch-house
  - A stranger served their hours on the watch-house bunk and came out quieter than they went in. The sergeant says they were no trouble. Nobody is, in there. It is a very quiet cell.
- **c_escape** (any, rank 72) trigger: You escaped from the watch-house
  - Somebody walked out of the watch-house cell, which has not happened since it was a granary. The Office will call it a scheduling matter. Watch what they call everything else.
- **c_body** (any, rank 68) trigger: A patrol found a body you left (remembered as p6r_body)
  - A patrol found a body where no body ought to be and rang for the others. They look at every shadow on the ground now. Even mine, and I am sitting.
- **c_disguise** (any, rank 66) trigger: You were spotted in a Synod clerk's robe
  - Somebody has been going about in a Synod clerk's robe and was spotted, and now every proctor looks hard at every grey sleeve. There is talk the clerks are counting their robes.
- **p_glass** (any, rank 8) trigger: Your character is a glass-bearer (p.glassed)
  - Somebody's arm is the colour of lamp-glass, green-gold at the wrist, and climbing. The Governor's son has the same, and look how he lives. Folk say coincidence. Folk are generous.
- **p_horse** (any, rank 9) trigger: You have a hired horse right now
  - Someone has hired a horse out of the North Gate stables by the hour. A horse. In Oakhaven. It will be back before it is missed, or it will not.

### Weather and hour

- **w_rain** (any) trigger: The sky is rain
  - Rain on the oaks tonight, soft as a hand on a hood. Sound will not carry in it, which is a mercy and a danger both.
- **w_storm** (any) trigger: The sky is storm
  - A storm is walking up the river. The oaks ring when the wind moves them, and tonight they will ring like a bad conscience.
- **w_mist** (any) trigger: The sky is mist
  - Sea-fog has sat down in the streets. The Hedge likes mist. Keep a lamp lit and follow no voice you cannot see.
- **w_snow** (any) trigger: The sky is snow
  - The first snow came sideways off the water. It crunches. Walk like you owe it money.
- **w_overcast** (any) trigger: The sky is overcast
  - Flat grey all day and nothing moving in it. I like it. The Hedge cannot find us under cloud, or so I tell myself.
- **w_clear** (any) trigger: The sky is clear
  - Clear, and cold with it. Sound carries on a night like this, so keep it in your chest.
- **w_night** (any) trigger: Between eleven at night and four in the morning
  - The dead hour is near. I put the hush-lamp on the sill early and I will sleep in my boots. Does it ring? True enough.

### The wider world (teasers)

- **x_cantabile** (any) trigger: Always (world colour)
  - A man off the river barge says Broadsheet Row in Port Cantabile prints four papers, all libellous, and one of them is occasionally correct. He would not say which. He said that was the business model.
- **x_pell** (any) trigger: Always (world colour)
  - There is a broadsheet-man in Port Cantabile, Pell, who prints what he likes and sleeps over the press. They say the Office has sent him three polite letters. He framed the first.
- **x_fortis** (any) trigger: Always (world colour)
  - My cousin says Fortis has never been conquered and has never won anything, either. They greet you with are you heavy, and you are meant to say heavy enough. I do not know what it means. I would like to.
- **x_bedrock** (any) trigger: Always (world colour)
  - Oakhaven and Fortis have never gone to war. Not once. My granda said it was the only boast the Reach had that cost nothing.
- **x_lodestone** (any) trigger: Always (world colour)
  - Every skyship in the world hangs on a Fortis-cut lodestone core, they say, even the corsair's. Think of that when she lifts. I do, daily.
- **x_organum_office** (any) trigger: Always (world colour)
  - A drover who has been through Registry Square says the Organum looks like a tax office. Grey buildings, brass plates, and a coffee stall that has been there sixty years. He said that was the worst of it.
- **x_organum_nine** (any) trigger: Always (world colour)
  - Old folk say that when the Edict of Symmetry was proclaimed the Organum played the hour for nine hours together. They say you could hear it thirty miles off. They do not say what they did about it.
- **x_nullwatch** (any) trigger: Always (world colour)
  - The garrison at Null-Watch talks all night along the whole line, never stopping, because silence invites the Quiet. Line-talk, they call it. I have started doing it at home.
- **x_ninth** (any) trigger: Always (world colour)
  - There is a half-line my nan used to hum and stop. The ninth is not stone. She never would sing the rest.
- **x_reed** (any) trigger: Always (world colour)
  - Every child in the Reach has a reed hung over the door, tuned to them at birth. A pedlar says in the silenced places not one of them sounds. Mine does, if the wind is right.
- **x_office** (any) trigger: Always (world colour)
  - I asked a proctor what became of the people the Office processes. Reconciled, he said. We both drank to that, and neither of us knew what we had drunk to.
- **x_patriarch** (any) trigger: Always (world colour)
  - The Choir-Church has a High Patriarch called Severin Ashe. They say he is kind. They say it the way you tell somebody the bridge is out.
- **x_arbiter** (any) trigger: Always (world colour)
  - They say the Supreme Arbiter is a hundred and forty years old and listens through glass. I took the pane out of my window. I am cold, and I am private.
- **x_sandglass** (any) trigger: Always (world colour)
  - At the Sandglass Bazaar, a traveller told me, they sell you an hour and you owe it back. I said that sounded like Oakhaven. He said no, Oakhaven does not give you the hour.
- **x_cinderhold** (any) trigger: Always (world colour)
  - A smith passing through said the furnaces at Cinderhold have not gone cold since before the Fracture. He said it like a complaint and like a prayer.

### Town colour

- **a_lamps** (any) trigger: Always (town colour)
  - Keep a hush-lamp lit on every sill. A room that goes quiet is a door left open. My mother taught me that, and the Hedge taught her.
- **a_oaks** (any) trigger: Always (town colour)
  - The oaks ring like bronze when the wind moves them. I loved that sound once. Sap and splinters, I would give a month's wages for one plain tree.
- **a_colour** (patron) trigger: Always (town colour)
  - Red was redder when I was a girl, and summers were warmer. Everyone over thirty says so. The young ones think we are mad.
- **a_hetty_sing** (hetty) trigger: Always (town colour)
  - Singing is free in here and it will get you killed. That is not a rumour, that is the house rule. It has been since Davin.
- **a_hetty_beer** (hetty) trigger: Always (town colour)
  - I have never lost a patron to a hound. Only to a song, and a song is not a thing I serve.

## 2. The Synod Gazette (notice boards: Greenhall front, Chapel front, inside the Boar)

Front page = the first issue whose flags match (top of this list wins). Each issue also shows one "Local matters" item if the law record calls for it (and the watch is on duty), and the Pell page when `crates_heard`.

### No. 38 · OAKHAVEN: A CLASSIFICATION UPDATE

Trigger: any of: escaped, part3, part4, book_one_done — You have left Oakhaven on the Kestrel

- The district formerly styled Oakhaven is reclassified as woodland. Persons formerly resident are considered reconciled to wherever relocation has occurred.
- Departures by air during the period of irregularity are recorded as weather.
- The Consortium thanks the Reach for its cooperation. Cooperation was not requested. It was received.
- **Notice.** Enquiries concerning the district are to be put in writing. They will be filed with the district.

### No. 37 · AN AGRICULTURAL IRREGULARITY

Trigger: all of: greening — The bore is broken: the Greening

- A period of accelerated growth has been recorded in the Oakhaven district. The cause is under review and is considered agricultural.
- The Consortium reports the early retirement of the quarry bore. The bore was retired by being broken. This is a scheduling matter.
- Residents are asked to make their way to the mooring mast in an orderly fashion. The mast is not an official relocation point. The Office has no comment on the mast.
- **Notice.** Oaks that ring are to be treated as weather.

### No. 36 · THE RITE OF PURE UNISON PROCEEDS

Trigger: all of: rite_started — The Rite has begun

- The Cantor of Oakhaven is in the Church's protection for the duration of the hold, estimated at four hours. Protection is not detention. The shutters of her house have been sealed for their safety.
- Persons humming the Root note beneath the Pure Note are thanked for their participation. Participation was not requested.
- Activity reported in the quarry shaft is the activity of the shaft.
- **Notice.** All shutters are to be closed. Sealed shutters are to remain sealed.

### No. 35 · A COIL IS UNACCOUNTED FOR

Trigger: all of: coil_done — You have the coil and the Consortium pass

- A reverse-phase coil, formerly held in Depot Three, is unaccounted for. It is not missing. Missing is a grade the Consortium has not assigned.
- A quarry pass has been issued to a party not on the roster. Passes are sometimes issued in error. The error is considered to have been issued correctly.
- The Governor's son is reminded that his presence at the Rite is not required, and will be minuted as attendance.
- **Notice.** Residents are asked to hold themselves ready for Hearthday. Readiness will be assessed by the Church.

### No. 34 · ACOUSTIC ECHO ARTIFACTING AT THE HEDGE

Trigger: any of: hedge_answered, hedge_listened, hedge_silent, wearer_dead — You have stood at the Hedge at the dead hour

- Residents who have heard voices at the Hedge are informed that the voices are acoustic echo artifacting. The dead are not speaking. The dead are being echoed.
- A report that a voice was answered at the Hedge has been filed under weather. *(only if any of: hedge_answered)*
- Listening at the Hedge is not a recognised activity. Residents who wish to listen are invited to do so at the Chapel. *(only if any of: hedge_listened · not: hedge_answered)*
- Saying nothing at the Hedge is a civic contribution. It is acknowledged. It is not rewarded. *(only if any of: hedge_silent · not: hedge_answered, hedge_listened)*
- A resonance fault in the boundary growth, previously described as a presence, has been resolved. The ground where sound does not carry is under review. *(only if any of: wearer_dead)*
- **Notice.** Voices heard at the Hedge outside Hedge hours are not covered by the Hedge.

### No. 33 · QUARRY ROSTER UNDER ROUTINE RECONCILIATION

Trigger: any of: kaelen_met, tobiah_met — You have met Kaelen or Tobiah

- Charts held on the night shift are being counted. Where counts differ, the charts are considered to have been counted differently.
- Depot Three is being reconciled by Factor Vosk. Reconciliation has found no irregularity. Reconciliation has not finished.
- Junior Engineer Marsh is commended for diligence. Commendation is revocable on notice. *(only if any of: tobiah_met)*
- **Notice.** Persons without a roster number are not on the quarry. The quarry regrets that this has to be said.

### No. 32 · THE CANTOR IS HONOURED

Trigger: all of: lyra_met — You have met Lyra

- The Cantor of Oakhaven has been identified as Source for the purposes of Stage Nine. This is an honour. It has not been made optional.
- Movements through the North Gate after dusk are under review. The gate has always been shut at dusk. It will continue to have always been shut.
- An engineer of the Consortium is recorded as absent from the district. Absence of long standing is not a disappearance.
- **Notice.** Messages between the Cantor and parties beyond the Hedge may be left at the Chapel, where they will be held.

### No. 31 · THE PURE NOTE IS TO BE HELD OVER OAKHAVEN

Trigger: default (nothing else matches) — The default front page: before you have met anyone

- The Choir-Church announces a Rite of Pure Unison for Hearthday. Attendance is anticipated and will be noted. Humming beneath the Note is not attendance.
- The Consortium of Bores thanks the district for its patience during the preparation of Stage Nine. Bread will continue.
- An inspection of children's hands and feet is scheduled for Rootday week at the Greenhall. Chalk will be applied where indicated. Applied chalk is not an accusation.
- **Notice.** Bells are not to be rung. The district has no bells. Reports of ringing are to be treated as weather.

### Local matters (one at most; first match; only while the watch is on duty)

- **jailbreak** (You escaped from the watch-house): A guest of the watch-house has concluded their stay ahead of schedule. This is a scheduling matter. The cell has been re-graded as available.
- **wanted** (Your Oakhaven bounty is 40 or more): A traveller is invited to attend the watch-house for questioning. The invitation carries a sum. The sum is not a reward. It is an expression of interest.
- **body** (A patrol found a body you left): A resident has been found in a place other than the place to which they were assigned. They have been reconciled to that place.
- **disguise** (You were spotted in a Synod clerk's robe): The wearing of clerk's grey by persons not on the roster has been noted. A wardrobe audit is under way. Nobody has been accused of anything. The robes are being counted.
- **petty** (You have a theft, an assault or any bounty on record): Several purses have been described as lighter, and a civilian as having been struck. The words described as apply to both.

### Free-press counterpoint (trigger: crates_heard)

- *FOUND FOLDED BEHIND THE NOTICE, IN A DIFFERENT HAND* — THE CANTABILE CANDOUR · Broadsheet Row, Port Cantabile
- The Office advises that a skyship out of the Rust Coast carries replacement garrison components. We have a question about the word components, and a second question about the word replacement. Cosimo Pell, proprietor, who cannot be reached for comment because he is standing right here.

## 3. UI strings

- Button: "Any news?" · log line "Any news?" · fallback "Nothing worth the breath."
- Sign label: "The Synod Gazette, pinned to the notice board — read the front page"
- Held document: title "The Synod Gazette", kind "Broadsheet", choice "Put it back.", dateline "Oakhaven District Desk · Printed under the Pure Note · <Dayname>, 419 · No. NN"

---

## Courier letters (js/couriers.js)

Delivery rule: a letter is written when the deed is done and arrives at the next rest, day turn or area arrival at least 45 game seconds later (one per moment). Courier line: "A courier has found you with a letter from NAME (GIFT enclosed). It is kept in your logbook." Letters are read from Logbook > Letters as held paper documents. [PROPOSED] items: the courier, the loop letter for Halder, all gifts.

## Letter from Orla Hale  (flag: p6c_orla)
Trigger: f.boots_delivered | in reach: Oakhaven, before the Rite

Branch {}

To the stranger who brought the boots.

Bettany holds the pen, because I have none left to hold one with. She says I am to tell you she disapproves of the ink.

The boots are on the chair-rail where I can see them. Davin had big feet for a boy; I have been saying so to the room all morning, and the room has not argued. I thought I should not be able to look at them. I look at them instead of my hands, which is a mercy of a sort.

You did not sing, and I was angry with you for the length of a meal. Then I was not. Lyra has promised to sing me down proper, before the fire, and she is a woman who keeps what she promises. I find I can wait for that.

Bettany says that is enough, and that I am tiring.

> — Orla Hale, in her chair


## Letter from Anselm Rooke  (flag: p6c_rooke)
Trigger: f.boots_delivered && f.rooke_thanks | in reach: Oakhaven, before the Rite

Branch {}  Gift: a linen bandage

Stranger.

This is not a thanks. I do not write those; they are an invitation to be owed.

It is a record. The boots reached Orla Hale. I know because she sent for me afterwards, and I crossed the lane to her door, and stood on the step, and did not go in. She said through the wood that it was all right. I am told a man may stand on a step. I will take it.

I have still not found the Inquisitor's list. I intend to go on not finding it for as long as the Synod will wait, which is not as long as I would like.

Enclosed is a roll of linen, boiled twice. You will remember I said that my tonics are for cutting. This is the exception, and it is the opposite of cutting.

> — A. Rooke, Surgeon-Grafter


## Letter from Nell Carder  (flag: p6c_nell)
Trigger: f.pim_safe | in reach: Oakhaven, before the Rite

Branch {}

To the one who brought the jar.

Lyra came to the mill with what was left of her voice and sat by his hands until they were hands. I held the jar the whole while like a warm egg, and I did not say anything, because I was afraid that if I said it the roots would hear.

The inspection is still ahead of us, and I am less afraid of it than I was. I will be less afraid of it still on the morning Rooke looks at those palms and finds nothing to chalk.

Pim has asked after you every day. I have told him that strangers move on. He has asked me to tell you that he has not been to the culvert, and that I am to say it exactly like that.

> — Nell Carder


Branch {"pim_tended":1}  Gift: eight sovereigns

To the one who knelt on my meal-sacks.

You had no honey and you had no Cantor, and you had a mouth with the right note in it, and you used it. I have been trying to find a sentence for what that was, and I have not got one, so here is the plain version: his hands are just hands. I turn them over. I cannot stop turning them over.

He says you do it different from Lyra. He says it in the voice he uses for facts. I have told him strangers move on, and he has told me he knows.

We will be on the corsair's ship, if Hearthday lets us. I would have paid you for the kneeling. You took nothing, and I do not like being owed, so here are eight sovereigns, and you will not argue with a woman who has been up three nights.

> — Nell Carder


## Letter from Pim Carder  (flag: p6c_pim)
Trigger: f.pim_safe | in reach: Oakhaven, before the Rite

Branch {}  Gift: a sprig of sweet reed

Mam says I am not to talk about my hands to anybody. She says writing is not talking, so this is allowed.

You are the one who got the jar. Lyra hummed it and it tickled, and the roots went back under like worms from a lamp. Mam held the jar so tight her knuckles went white. I did not say anything about her knuckles.

The Hedge whistled my whistle again. I did not go. I counted to forty first, and then to forty again, and then it stopped.

I pulled this from the Flume bank. It is sweet reed. It is for your voice. Do not eat it near the water.

> — Pim


Branch {"pim_tended":1}  Gift: a sprig of sweet reed

Mam says I am not to talk about my hands to anybody. She says writing is not talking, so this is allowed.

You hummed it different from Lyra. Lyra goes up at the end. You go down. I watched your mouth the whole time and the roots went back under like worms from a lamp. Mam says it is rude to say what a stranger's hum goes like, so I am writing it, not saying it.

The Hedge whistled my whistle again. I did not go. I counted to forty first, and then to forty again, and then it stopped.

I pulled this from the Flume bank. It is sweet reed. It is for your voice. Do not eat it near the water.

> — Pim


## Letter from Old Tam  (flag: p6c_tam)
Trigger: f.tam_told || f.tam_left | in reach: Oakhaven, before the Rite

Branch {"tam_told":1}  Gift: a sprig of reed-pith

Hm. I do not write much. Essa did the writing.

I have not been down to the Flume since you told me. I thought I would. I stood at the end of the lane three nights running and listened from there, and it sang the second verse without me, and I went in. The second verse is mine. I gave it to something on the first night, to see. I would like it back, and I cannot have it, and I find that is the whole of what I knew.

If the hounds come to the meadow some night, there is a man who knows the whole song. I have started on a third verse. Essa never wrote one. I am only trying it quietly.

I enclose reed-pith from the bank. For a voice. Do not sing it.

> — Tam


Branch {"tam_told":1,"tam_sat":1}  Gift: a hush-whistle

Hm. I do not write much. Essa did the writing.

You sat. I have thought about that more than anything anybody has said to me this autumn. You did not tell me. You let me find it for myself, and a stranger who had heard her would have moved, and you did not move. That was the better kindness, and I did not know to ask for it.

I have not been down to the Flume since. If something must go singing into the meadow some night to pull the hounds, there is a man who knows the whole song. I am practising it quietly, in the kitchen.

I enclose a hush-whistle out of Essa's mother's stock. Walk soft in it.

> — Tam


Branch {"tam_left":1}

Hm. I do not write much. Essa did the writing.

You said you could not say, and you let an old man sit. It was a kindness and a coward's kindness both, and I took both, and I am not sorry. I am at the stone most nights. She gets the second verse right.

Some nights now I sing it with her. It is not quite my voice that comes out. I have noticed. I have noticed it, and I go on, and I do not know what that makes me.

Sit with me if you are ever by the bridge. Keep your voice down. She comes on the water about the time the light goes.

> — Tam


## Letter from Hob Wendle  (flag: p6c_hob)
Trigger: f.hob_told | in reach: Oakhaven, before the Rite

Branch {}

Wendle, tanner. I do not write; I am writing.

You went down where I could not, and came up, and told me. I have not asked what you left. I hear you did not write them in any book. I am not angry. I should not have either; I should have wanted no page to look at.

The lamp is out of the window. I stand with my hand on the nail where the key hung. The nail is empty. I keep my hand there anyway.

Leather is quieter than people. I should have known that, in my trade. Mind the lime if you come.

> — H. Wendle


Branch {"twins_named":1}

Wendle, tanner. I do not write; I am writing.

You put Joss and Wyn in your book. I asked the Cantor whether a name in a stranger's book counts, and she said that is what a book is for. I did not know what to do with that, so I took the lamp out of the window the night you told me, and stood in the dark shop with the vats ticking. The window is dark now. I find I can look at it.

Leather is quieter than people. I should have known that, in my trade.

There is a jerkin on the second hook that fits you better than what you are wearing. It is not a gift. Come and pay for it, and mind the lime.

> — H. Wendle


## Letter from Hetty Bram  (flag: p6c_hetty)
Trigger: f.hetty_paid | in reach: Oakhaven, before the Rite

Branch {}  Gift: a tonic

Hetty Bram, of the Boar & Dulcimer, to the one with the steady head.

I said I wanted to be told I was an old woman hearing things. You did not tell me. I have decided to be grateful. The cellar is still full, and I go down for the casks with a lamp and my fingers in my ears like a girl.

The corsair is still in his corner and still laughs too loud at nothing. You have not got to him yet. The names go on in my cellar, and I am the only one in this house who hears both.

Singing is free and it will get you killed. I mean to go on saying it. I send one of Bettany's tonics, for my nerves; I find I have the nerves still and none of the need.

> — H. B.


Branch {"vane_told":1}  Gift: a tonic

Hetty Bram, of the Boar & Dulcimer, to the one with the steady head.

I said I wanted to be told I was an old woman hearing things. You did not tell me. I have decided to be grateful. The cellar is still full, and I go down for the casks with a lamp and my fingers in my ears like a girl.

The corsair came in the day after you spoke to him and did not laugh at anything. He sat in his corner and drank small beer, which tells you all you need. Whatever you said to him, he heard it.

Singing is free and it will get you killed. I mean to go on saying it. I send one of Bettany's tonics, for my nerves; I find I have the nerves still and none of the need.

> — H. B.


## Letter from Captain Vane  (flag: p6c_vane)
Trigger: f.vane_told | in reach: Oakhaven, before the Rite

Branch {}  Gift: ten sovereigns

Vane, of the Drift-Kestrel, to the only honest person in Oakhaven, which is a low bar and a lonely one.

One thousand three hundred and forty-two. I say it every morning. It does not get lighter; it gets more exactly the same weight, which I am told is what grief is. Right. Right.

The Kestrel is at the mast. Mags has spliced the lines for four to a rung. Children first. I am not delivering what is in my hold, and if the Catalogue asks, I am a coward with a leaking hull, which is true, so I shall say it well.

I have not been to the Boar in two days. Do not tell Hetty I said so; I am told she keeps a tally.

Enclosed: ten sovereigns, for rope. Spend them on rope. Or drink. It comes to the same in the end.

> — V.


Branch {"hetty_paid":1}  Gift: ten sovereigns

Vane, of the Drift-Kestrel, to the only honest person in Oakhaven, which is a low bar and a lonely one.

One thousand three hundred and forty-two. I say it every morning. It does not get lighter; it gets more exactly the same weight, which I am told is what grief is. Right. Right.

The Kestrel is at the mast. Mags has spliced the lines for four to a rung. Children first. I am not delivering what is in my hold, and if the Catalogue asks, I am a coward with a leaking hull, which is true, so I shall say it well.

Hetty has stopped charging me for the small beer. It is the most frightening thing that has happened to me this week.

Enclosed: ten sovereigns, for rope. Spend them on rope. Or drink. It comes to the same in the end.

> — V.


## Letter from Tobiah Marsh  (flag: p6c_tobiah)
Trigger: f.tobiah_met | in reach: Oakhaven, before the Rite

Branch {}

Junior Engineer T. Marsh, night shift, to the person who took the charts.

I wanted this on paper. If I said it aloud under the pumps the bells would turn.

For three years Revision Seven was under my mattress. I learned the Vance Sequence at fourteen and I was proud of it the way you are proud of a thing you do not yet understand. I understand a little more now, and I wish it were less.

It is strange to be lighter. I keep patting my coat. I would call it relief, but I think relief is the word the Factor would put on a form.

Depot Three is quiet. The Legionnaire there has stopped talking about the blue jug, or I have stopped hearing it, and I do not know which is worse.

If Engineer Vance asks, tell him I kept the margin. Tell him I read it.

> — T. Marsh


## Letter from Hew Callan  (flag: p6c_hew)
Trigger: f.sable_returned && f.hew_thanked | in reach: Oakhaven, before the Rite

Branch {}

Hew Callan, pump-man, Depot Two. That is how I start everything now. I am told it reads like a notice.

You took my purse and the gear, and I am glad of it. A dead man's wages are better spent by the living. I say my name under my breath at the pumps, a dozen times a shift. It is easier with the purse gone. There is less to count.

I have sent word to Mags Harker. I hear she will come to the quarry gate on Dawnday. I think she will shout. I hope she shouts for an hour.

I still owe the scribe a name. I am saving it up. When I give it, I mean it to be right.

> — H. Callan


Branch {"hew_home":1}  Gift: four sovereigns

Hew Callan, pump-man, Depot Two. That is how I start everything now. Mags says it is like being written to by a notice.

I went home. I finished the rounds first, because I have never in my life walked off a pump half-checked, and Mags says that is the most Hew thing that has ever been said, and she is right. She had the door open anyway.

She did not shout. She sat me down and put the supper in front of me, the Dawnday one, three years late. I owed her four sovereigns and she has decided to take it out in being obeyed.

She says the four are yours, since you are the reason I am here to owe them. She counted my purse in front of me. It was all there. You were right about the purse.

> — H. Callan


## Letter from Sable  (flag: p6c_sable_ret)
Trigger: f.sable_returned | in reach: Oakhaven, before the Rite

Branch {}

Entry: a letter, which is not an entry, and which I do not know how to file.

Hew Callan has been told the year. He took it the way a man takes a blow he saw coming, and then he asked for a pen. I have two things left in the inventory: my mother's hands in my hair, and a name. The smell of the scriptorium is gone. I am asked whether that is a loss. It is a shelf.

You said whatever it cost, and I note that you did not ask what the cost was. It is an unusual courtesy. It cost what it cost. I am not sorry.

Go softly.

> — Sable


Branch {"sable_accused":1}

Entry: a letter, which is not an entry, and which I do not know how to file.

Hew Callan has been told the year. He took it the way a man takes a blow he saw coming, and then he asked for a pen. I have two things left in the inventory: my mother's hands in my hair, and a name. The smell of the scriptorium is gone. I am asked whether that is a loss. It is a shelf.

You said I owed him more than a page. I recorded it. I record also that you were right, and that I would have said it myself, in the spring of 416, if I had been the sort of person who said things.

Go softly.

> — Sable


## Letter from Sable (kept)  (flag: p6c_sable_kept)
Trigger: f.sable_kept | in reach: Oakhaven, before the Rite

Branch {}

Entry: the stranger asked me to keep myself. I kept.

I have three things: my mother's hands braiding my hair; the smell of the scriptorium; my own name. I say them at night so that I know which is which. They are all still where I put them. It is possible that I am the only person in the Reach who can say so.

The Hollow at the pumps is still counting. I can hear it from the hedge when the wind is right. Page nine thousand and six sits unread. You asked me not to spend, and I have not, and every night I hear him, and I write that down too.

I am not yet certain it was right. I record that I am not yet certain, because the Ledger prefers an honest hole to a tidy page.

> — Sable


## Letter from Registrar-General Quist  (flag: p6c_quist)
Trigger: f.quist_press || f.round_struck | in reach: Part Three onward

Branch {}  Gift: twelve sovereigns

Memorandum, informal. The matter of the hand-press is closed. It was requisitioned, and the form says so, and the form is correct, because I signed it.

No further entry is required. None has been made. I observe that this is the first file in forty years to close without a remainder.

Hot water continues. The chair remains clean. People hesitate less when it is clean.

The desk across from mine is kept. It is dusted on Rootday.

A sum is enclosed, recorded as petty cash, which nobody audits.

> — Q.


Branch {"round_struck":1}  Gift: twelve sovereigns

Memorandum, informal. The matter of the hand-press is closed. It was requisitioned, and the form says so, and the form is correct, because I signed it.

The round of Inspector Mallow has been struck from the register. Eight lines, one rule through each. The eight are on no list. It is the only freedom this Office has issued, and I issued it in a hand that was straight.

Hot water continues. The chair remains clean. People hesitate less when it is clean.

The desk across from mine is kept. It is dusted on Rootday.

A sum is enclosed, recorded as petty cash, which nobody audits.

> — Q.


Branch {"quist_sable":1}  Gift: twelve sovereigns

Memorandum, informal. The matter of the hand-press is closed. It was requisitioned, and the form says so, and the form is correct, because I signed it.

No further entry is required. None has been made. I observe that this is the first file in forty years to close without a remainder.

Hot water continues. The chair remains clean. People hesitate less when it is clean.

The second cup has not been moved. It is cold. Each morning I fill it, and each evening it is returned to me, unclaimed, and that is a reconciliation of a kind.

A sum is enclosed, recorded as petty cash, which nobody audits.

> — Q.


## Letter from Halder Wick  (flag: p6c_halder)
Trigger: f.halder_rest && !f.halder_dead | in reach: Part Three onward

Branch {}

...four plates. The blue one is Ada's...

To the one at the door. I have not the word for you. The one at the door.

The boys will be in directly. They are at choir. It is Thursday. Ada has let out their cloaks.

There are four chairs. I have sat down in one. The water is warm.

The blue plate is in front of the chair by the door. I have not lifted it. I have not lifted it.

It is a good chair. It faces the door.

...sit, sit, there's four...

> — H. W.


Branch {"halder_sat":1}

...four plates. The blue one is Ada's...

To the one at the door. I have not the word for you. The one at the door.

The boys will be in directly. They are at choir. It is Thursday. Ada has let out their cloaks.

There are four chairs. I have sat down in one. The water is warm.

The blue plate is in front of the fourth chair, where you sat. I have not lifted it. I have not lifted it.

It is a good chair. It faces the door.

...sit, sit, there's four...

> — H. W.


## Letter from Bettis Renn  (flag: p6c_bettis)
Trigger: f.bettis_kept_awake && !f.bettis_put_back | in reach: Part Three onward

Branch {}

Name, please. That is how I began every day for three years, and it is how I began this letter, and I crossed it out. My name is Bettis Renn. I am writing it so that it is somewhere.

You sat with me on the bench and it did not pass, and then it did not pass for several days. This is the true report: I do not forgive you for refusing me, and I am glad you sat. I cannot make those into one thing. I have stopped trying. That is a relief.

I am writing the days down in order, from the first. It is slow. I have reached the second winter. It helps in the way a rail helps on a stair.

There is a press at the back of the Malting. I keep my back to it. I eat when someone brings bread. Someone does.

> — Bettis Renn


## Letter from Amos Fell  (flag: p6c_sexton)
Trigger: f.sexton_rest | in reach: Part Three onward

Branch {}

Amos Fell, sexton. To the one with the hammer.

I sit by the filled grave with my cap in my hands and I pat the earth. Every so often I forget, and reach for the spade, and then I remember, and put it down. That is a great deal of work for a man to do before breakfast.

The headstone has no name on it yet. I am working up to the chisel. The rope in the tower is still cut, and I cut it. When the bell goes, I will know the hand, and I will not mind whose it is.

The mourners are still waiting on it. So am I. We are patient people. It is the one thing that was not taken.

> — A. Fell


Branch {"bell_rung":1}  Gift: nine sovereigns

Amos Fell, sexton. To the one with the hammer.

She is in the ground proper now, under a stone with her name on it. I cut it myself, nine days at the chisel; the N came out like a gate. NAN FELL, WIFE OF THE SEXTON. I have added nothing after. Nothing wants adding.

You struck the bell three times. I was at the foot of the tower with my cap in my hands, and the mourners with their lilies stopped walking, and laid them down, all at once, in a row. I had forgotten how a lot of people being sorry together sounds. It sounds like rain starting.

I am digging again, only for the ones who are owed. It is the work I know. By custom a sexton pays the fee for a tolling. It is nine sovereigns, and I would not have you refuse a custom.

> — A. Fell



---

## P6 DREAMS player-facing text

## Rest dreams (play on the first rest after the condition holds; one per game day; lowest tier first)

### The First Reed  (id reed, tier 0)
Condition: `() => true`

You are small, and the door is very tall. Above it hangs a reed, tuned to you before you could hold up your own head. In the dream it does not sound. You stand on the step and wait for it, the way you wait for a sneeze.

Down the street every door has its reed, and every reed is saying something low and slightly different, a long way off, like a roomful of people agreeing not to speak first. Somebody behind you rests a hand on your hair.

"Does it ring?" they ask. You open your mouth to say *true enough*, and the wind turns, and you wake with the answer still in your teeth.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Eight Lamps  (id anchors, tier 1)
Condition: `() => gf('kaelen_met') || gf('lyra_met') || seen('clearing')`

Eight lamps stand in a ring on bare ground, and none of them is lit by fire. Each one hums. A low one, a little higher, a long step up, then a bright one, a quick one, a deep unwilling one, and under them all a note you feel in your back teeth rather than hear.

You walk the ring and the sound moves through you like weather. One is warm as bread. One is cold and tastes of paper. You count them twice. Eight.

The ring is not closed. Between the last lamp and the first there is a gap, as wide as a doorway, and the wind comes through it from somewhere you have not been.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Foundry Floor  (id foundry, tier 1)
Condition: `() => gf('kaelen_met')`

Brass floors, wet to the ankle, and a heat that goes through your clothes and into the bones. Men in grey aprons shout numbers over a noise like a very large bell being unrung. It is 412. You are not meant to be here, and nobody asks you to leave.

A tall young man in a clean coat stands at a gauge with his sleeve rolled, one hand flat on the glass. Steady. Steady. "Hold," he says, to no one, to everyone.

The needle climbs. Everything in the hall leans one way, the way grass leans before rain. Then the light turns, and he is still holding, and the number he called is the last one anyone says.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Three Deep  (id hedge, tier 1)
Condition: `() => gf('hedge_answered') || gf('hedge_silent') || gf('hedge_listened') || gf('tobin_417_started') || gf('tobin_417_done') || gf('twins_found') || seen('underhedge')`

Thorn, and packed wool, three men deep, and you are inside it with your sleeve caught. It is spring, and the wool smells of sheep and rain. Somewhere ahead a man is singing very quietly, a Cantor's line, the falling fifth, the way you sing to a child who will not settle.

You push toward him. The thorn lets you through one hand at a time. You can see the back of his coat. You can see it begin to turn.

Then the wind comes the other way and carries his voice down the lane, and you are standing in the road with a reed in your hand, and it is autumn, and you have forgotten which of you was meant to go home.

[appended when Tobin's blade is found] () => gf('tobin_417_done') ? ' In your other hand something long and bronze is humming at a note you know.' : ''

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Long Rope  (id quarry, tier 2)
Condition: `() => seen('quarry') || gf('bore_seated')`

You are being lowered on a rope through green light. The shaft walls are wet and warm and veined like the inside of an arm. Far below, something is singing a lullaby, five notes, over and over, and each time it reaches the fifth it loses the tune and begins again, patient, tired, exact.

You want to help. You hum the missing note, and it is wrong, and the rope jerks, and the whole shaft winces.

A voice from the top says, very gently, "Sorry. We needed the bread." The light goes the colour of milk. You hang there, swinging, and the lullaby starts again from the beginning, as though you had never spoken.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Reading  (id names, tier 2)
Condition: `() => gf('part3') || seen('whispergrove')`

Down a stair that has more steps each time you count them, someone is reading aloud. A voice worn smooth, dry and level and without hurry. *Halder Wick.* A pause, exactly long enough for a person to stand up. The next name, and the next.

You try to listen to each one and keep none. The list goes on past what a life can hold. The voice reaches the bottom of a page and turns it, and you hear the paper, and it is the first page again.

"Halder Wick," it says, kindly. You say "Here," because someone should. Your own voice comes back to you in the next line, and you wake before it finishes.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Evening in the Court  (id silencing, tier 2)
Condition: `() => seen('whispergrove') && (gf('halder_done') || gf('halder_safe') || gf('halder_dead') || gf('wg_ambush_over') || seen('cloister'))`

Evening, in a court of lit water. A man on the steps checks his watch. A girl lifts a cup. Somewhere a choir has just begun the second verse of something, thirty voices, and you know the tune, and you are about to join in.

Then one long note comes from everywhere at once, from the stone and the water and the inside of your chest. The people do not fall. They do not run. They only stop being about to do things.

The man puts his watch away, carefully, and goes on standing there. The girl's cup stays at her lip. The water keeps its light. You have a name in your mouth and cannot think whose it is.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Long Desk  (id veil, tier 2)
Condition: `() => gf('sable_met') || gf('sable_wg_met') || gf('sable_aboard')`

A grey hall with no windows and one long desk, and the scratch of a pen that does not stop. Someone small and pale writes in a book as tall as a door. The page she is writing is the page she is standing on.

You ask what she is recording. "The end of a city," she says, in the rhythm of a thing said many times. "I do not hurry it. I do not hold it back." The ink is the colour of the sky an hour before dawn.

You lean to read over her shoulder. The entry is dated tomorrow. She turns the page before you can find your name on it. "Not yet," she says, softly. "Ask me again."

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Clear  (id glassing, tier 3)
Condition: `() => gf('kaelen_dw_done') || gf('kaelen_told_now')`

Your hand is cold, and then it is clear. Not numb: clear, like a pond in winter, the bones showing, each one lit green from inside. There is no pain, which is how you know how much there was.

The clearness climbs, patient, to the wrist. It takes the old scar first, then the older one. You tap a nail against it and it answers at a pitch you know.

Someone beside you in the dark says, "It keeps what it hears," the way you would apologise for a dog. You press the hand to the wall, and the wall begins, very quietly, to tell you everything it has been told.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Registry Square  (id organum, tier 3)
Condition: `() => gf('folder_given') || gf('folder_kept') || gf('folder_decided') || gf('dispatch_read') || gf('log_read') || gf('quist_press') || gf('quist_shown') || gf('press_taken') || gf('register_taken')`

A grey square with grey buildings and a coffee stall that has been there sixty years. Brass plates beside every door, polished by someone who does not look up. A clerk hands you a slip. It says your name is being reconciled. It says the matter will be assigned. It says nothing has happened to anyone.

Behind the stall the towers begin to breathe in. It is not wind. It is a low chord, held for hours, played to a city that stands very still and agrees that it is being kind.

"Mind the step," the clerk says, and the step goes down a long way. You take the coffee. It is good. That is the worst of it.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Wind-Reed Orchard  (id orchard, tier 3)
Condition: `() => gf('lyra_wg_met') || gf('lyra_dw_met') || gf('lyra_voice')`

Rows of reeds, planted in the old orchard, longer than your arm, longer than you. The wind goes down the rows and every reed speaks one note, and together the notes make something like a face.

A woman walks the rows with a cord of knots over her shoulder, touching one reed after another, listening with her whole body, the way you listen to someone coming up the stairs. "Not that one. It's sulking. That one is lying a little."

She crouches and lays her ear to the soil. "Hear it? Under the tune. The ground has an opinion." You nod. You don't. She laughs, and the whole orchard laughs a fifth above her.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### Ten Heartbeats  (id hawser, tier 3)
Condition: `() => gf('vane_vesper')`

Salt wind. The deck tilts, then keeps tilting. A hawser runs from the rail into a black seam in the sea, thick as your waist, humming like a plucked string. Someone stands at the far end of it, where no one could stand, in a long coat, and nods.

You have an axe. You are surprised how light it is. "Ten heartbeats," somebody says, and you count them with a stranger's patience, and at nine you know exactly what the tenth will do.

The rope parts with a note you have heard before. The sea closes. You wake with your hands open, and the count still going.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### A Good Conversation  (id quiet, tier 3)
Condition: `() => gf('shrine_used') || gf('gift_heard') || gf('gift_quiets') || gf('hew_home') || gf('hew_thanked') || gf('wren_saved') || gf('wren_gone')`

You are talking to someone at a fire, easily, about nothing, and it is a good conversation. You realise you cannot hear the fire. You look. It is burning, bright, the sticks folding and sparking, and no sound comes of it.

You cannot hear your own words either, but the other person is nodding, so they must be fine. It does not feel like losing anything. It feels like being excused.

Someone has set a cup beside your hand, the one you broke years ago, whole, and you are so grateful you cannot think why that should frighten you. You wake in the ordinary noise of the night and lie very still, listening to it, one sound at a time.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

### The Missing Bell  (id ninth, tier 4)
Condition: `() => seen('mausoleum') || gf('tombs_rung') || gf('part4') || gf('coda_done') || gf('book_one_done')`

Eight bells hang in the dark. You are asked to ring them in order, from the highest, and you do, and each one answers. When the last is quiet the air is still waiting.

Not for a bell. There is no frame for one, no hook, no rope. You look for the shape of the missing thing and find only the place where it is not, the way a held breath has a shape.

Very far above you a voice reads a line from an older book: "The ninth is not stone." You wake with the chord unfinished in your ears, like a sentence stopped in the middle, and for a long time you do not mind.

On waking: "You wake. The dream is already thinning, but it leaves a taste behind."

## Light-glass echoes (each plays once; re-readable from the logbook)

### The count-in  (id sh_wg; trigger shard; maps whispergrove)
Place line: Whisper-Grove, the Sunken Court

> "...and a one, and a two. Lean left, Wat. Left."
>
> Thirty voices find the key together, the way water finds its level.
>
> Then one long note, underneath all of it, that is not in the hymn.

### Nose up  (id sh_dw; trigger shard; maps deepwoods)
Place line: The Deep Woods

> "Nose up. Hold her nose up, hold her, hold her—"
>
> "Tank two is going."
>
> A woman's voice, very level: "Everyone stays on the line."

### Three deep  (id sh_oak; trigger shard; maps oakhaven)
Place line: Oakhaven

> "Three deep. Pack the wool into the thorn until you cannot hear yourself."
>
> Spades, and a great many people breathing hard.
>
> A child asks whether it will keep the hounds out. A man says, "It keeps the Narrow. That is all we ask of it."

### Beside the reed  (id sh_clear; trigger shard; maps clearing)
Place line: Outside the Hedge

> "Don't sing at the reed, love. Sing beside it."
>
> A girl's voice tries, and the reed goes sour.
>
> "There. Hear that? It is not wrong. It is only listening. Give it a moment to decide you are a friend."

### Hymn nine  (id sh_clo; trigger shard; maps cloister)
Place line: The Cloister of the Lost Choir

> "Hymn nine. Altos only. Whoever has the red cloak, you are late, and you are forgiven."
>
> One alto line, shy and bright, a little flat on the turn.
>
> Then the room waits for the rest of the choir to come in.

### Where the beam goes  (id sh_cat; trigger shard; maps catacombs)
Place line: The Whisper Catacombs

> "Mark the row. Mark every row. A mirror forgets what it was for."
>
> A scrape of brass, a held breath, a click.
>
> "Glass keeps the path. Nobody told it to keep the reason."

### Shift change  (id sh_qr; trigger shard; maps quarry)
Place line: The Oakhaven Quarry

> "Pump two is steady. Pump three is steady. Everything is steady."
>
> Boots on a ladder. A man humming something he is not supposed to know.
>
> "Don't hum down here," says someone, not unkindly. "It hums back."

### Roots do not  (id sh_rv; trigger shard; maps rootvault)
Place line: The Root-vault

> "Is it in pain?"
>
> "It is a root, sir. Roots don't."
>
> A long pause, in which something very large and very far away keeps five notes of a lullaby going.

### Intake  (id sh_mal; trigger shard; maps malting)
Place line: The Malting

> A flat, courteous voice: "Next, please."
>
> A pen. A stamp. "The name, as it is currently held."
>
> "There is no cost to you," the clerk says. Under it, very small, someone decides to say their name anyway.

### The low note  (id sh_mau; trigger shard; maps mausoleum)
Place line: The Mausoleum of Chords

> A gravel voice, tired: "From the highest, then. Down."
>
> Bell after bell, and each one leaves the room quieter than it found it.
>
> "And the last is not cast in stone," someone says, and is hushed.

### The night of the bore  (id gl_qr; trigger wall; maps quarry)
Place line: The Oakhaven Quarry

> "Seat the casing."
>
> "It's singing, foreman."
>
> "It's the drill. Seat it. Log it as resonance."
>
> Hours of that, thinned to a minute: iron on iron, a cheer that goes up and does not quite come down, and under it five notes of a lullaby, losing the tune.

### A held note  (id gl_rv; trigger wall; maps rootvault)
Place line: The Root-vault

> The wall is warm as a sleeping animal.
>
> Inside the glass, a man near the stone is humming one low note with his mouth closed, over and over, as if to keep a door from swinging.
>
> "Easy," he tells it. "I'm here. Easy."

### The emitter  (id lp_cat; trigger lamp mirror_lantern; maps catacombs)
Place line: The Whisper Catacombs

> A woman's voice, close to the lens: "Beam north, row one point five. If I have it right, nobody ever needs to know I was here."
>
> Brass ticks as it settles.
>
> "If I have it wrong, I am sorry. Light never forgives a mirror."

### Loud  (id lp_gift; trigger lamp gift_lamp; maps deepwoods)
Place line: The Deep Woods

> A child, singing loudly and wonderfully out of tune.
>
> "Is it working? It's working. Mama says the loud one is the one that gets heard."
>
> The song stops in the middle of a word, the way a page stops when someone closes the book. A beat later the lamp goes on humming, as if nothing had been asked of it.

### The keeper  (id lp_shr; trigger lamp shrine; maps deepwoods)
Place line: The Deep Woods

> An old voice, to the lamp, as to a dog: "There you are. There you are."
>
> A knife trimming a wick. A cough.
>
> "Somebody will come by. Somebody always does. I keep it for them." And later, to no one: "All right. I'll leave it burning."

### The name it was made from  (id co_qr; trigger core; maps quarry)
Place line: The Oakhaven Quarry

> Inside the bell, a voice, patient as a clerk: "{name}."
>
> "{first}. I mend pumps. The blue jug is on the shelf by the door."
>
> "If anyone asks, I am not late. I am on my way."

### Assigned  (id co_mal; trigger core; maps malting)
Place line: The Malting

> "{name}," says the glass, as though reading it off a label. "Assigned. Graded. Reconciled."
>
> Then, in a smaller register, a good deal younger: "{first}. Please. It is {first}."

### That one is mine  (id co_any; trigger core; maps any other)
Place line: Wherever a bell still rings

> A voice in the glass, trying a word the way you try a stair in the dark.
>
> "{first}. {first}. Is that— yes. That is the one. That's mine."
>
> It sounds so relieved that you find you are apologising.

## UI strings

- Dream card: kicker "You dream"; buttons "Wake" / "Close" (re-read).
- Echo card: kicker "The glass remembers"; buttons "Let it go" / "Close".
- Logbook sections: "Dreams", "What the glass kept" (only when something has been met).
- Options row: "Dreams and glass echoes - rest dreams, memory echoes" On/Off.

---

## TOBIN (Phase 6) player-facing text

All invention is [PROPOSED]. Each page opens as a held document (Journal, parchment). Placement in brackets.

## Page 1: The east rows [greenhall 1.6,5]
Pickup message: A single sheet, folded small, is wedged behind the ledgers on the Greenhall shelf. (Tobin's Journal n/12)
Title: Tobin's Journal, page 1

*Rootday, early spring, 412 SR*

Tending notes, the east rows. Still cold. The buds are holding their breath.

The old men say sing nothing to a tree before the third week, and then only the root note, a hand's width above the ground, with the mouth nearly closed. I have done it thirty springs and still feel a fool, kneeling in mud and humming at a pear.

Fed the grafts on the south wall their fifth. The Bergamot took it. The Pippins are sulking. Found two reeds in the lower orchard cracked by frost and replaced them from the beds by the Flume, tuning each against my own breastbone before I cut the slot.

Bettany came by with honey for my throat and a lecture about my throat. I said a Cantor's voice is the one tool he cannot sharpen. She said that was a poor reason to leave it out in the rain.

Lyra wants the reeds this year. She says she is not afraid of them. She has said so four times, which is how many times a person says it when she is.

Does it ring? The orchard rings. True enough.

## Page 2: The long cane [lyra_house 1.6,5.8]
Pickup message: A sheet is pinned flat under a reed-knife beside the hearth, one corner scorched brown. (Tobin's Journal n/12)
Title: Tobin's Journal, page 2

*Memoryday, high summer, 412 SR*

Lyra has the reeds. I mean she has them the way a cat has a sunbeam: all of her, and no notice taken of anyone else.

I set her the long cane first, the one that sounds the root, and told her to blow across it until the note stopped being a noise and became a place. By supper she had it. By dark she had the fifth as well, which I did not ask for, and was blowing it at the hearth-cat to see what it thought.

She holds the cane too tight. So did I, at her age. I told her so, and she said she had noticed whose daughter she was.

Tonight she tuned the First Reed above our own door, standing on the chair with her tongue between her teeth, while the wind came up the lane and the whole house hummed under her. It is a good house. It sounds like somebody lives in it.

Called her lark at supper. She pretended to mind.

## Page 3: The bells [chapel 1.6,9.4]
Pickup message: A page lies between two hymn-leaves on the chapel floor, grey with dust. (Tobin's Journal n/12)
Title: Tobin's Journal, page 3

*Hearthday, Ashfall, 412 SR*

They took the bells down this week. The Choir-Church sent a column, a cart, and a young man with a very clean voice, who said it was a blessing and that the Pure Note had need of the bronze. I said the Carillon had need of the bronze. He said the Carillon would be remembered. I have buried enough people to know what that sentence means.

It took six men and a block to bring the great bell down. It did not ring as it came. I think it was the one time in two hundred years it was not asked to.

The grain from the south has stopped. We are told the Cascade was nobody's fault. The Governor says to keep faith and ration.

Sang Essa down at the sluice-gate on Massday, there being nothing else to put in the ground. Tam asked for The Miller's Daughter, both verses. I gave him both. The water was very loud.

The chapel is quiet now. I keep humming into it, to see whether it will give me anything back.

## Page 4: Gradients [mill 2.5,9.5]
Pickup message: A sheet is stuck behind a loose board near the mill wall, stiff with damp. (Tobin's Journal n/12)
Title: Tobin's Journal, page 4

*Dawnday, Frostmonth, 413 SR*

Surveyors at the Carders' mill today, three of them in grey, with brass staves and a chain, walking the Flume bank a pace at a time and writing every pace down. Politely. Nobody has ever been so polite to my orchard.

Nell asked what they measured. The tall one said gradients. I asked whose. He said the Synod's, as though that were a place.

They drove a stake into the bank above the sluice and hung a small glass bell on it, and it began to hum, very low. I put my hand flat on the post and knew the note. Ours. Growth. One-seven-four, coming up out of the ground and being listened to.

I asked what he was listening for. He said, "Whatever's there, Cantor." He said it kindly. He had the face of a man who has been taught to be kind about things.

Asked Harrow to walk a night-round of the mill. I could not have said what for. Perhaps for the stake.

## Page 5: Such resonances as lie beneath [quarry 26.5,6.5]
Pickup message: A page is folded into the shelf by the quarry stores, under a fixed price-list. (Tobin's Journal n/12)
Title: Tobin's Journal, page 5

*Stasisday, Harvestmonth, 414 SR*

The Governor read the lease aloud in the Greenhall, standing, in his good coat, and did not look at the room. The Consortium of Bores takes the quarry, the shaft, and "such resonances as lie beneath." In return, bread: a cart a week, at a fixed price, for nine years.

Nine years is not long to a tree. It is long to a hungry child.

I voted to refuse, and I was the only one who did, and I do not think the others were cowards. I had seen the ration-slates. A man can hold out against a great many things on an empty stomach, but not against the smell of the baker's.

Afterward the Governor found me in the porch and said, "Say it, Tobin." I said I had nothing to say that he had not said to himself. He said he had said it every night for a month. I thought that a very sad joke, and so did he.

Walked up to the quarry at dusk. They have fenced the headframe. Even the fence hums.

## Page 6: Bell-bronze [tavern 1.6,4.4]
Pickup message: A sheet, ringed by the base of a cup, is tucked behind the tavern shelf. (Tobin's Journal n/12)
Title: Tobin's Journal, page 6

*Nullday, Ashfall, 415 SR*

The smith has finished the blade. I did not ask for it. The Greenhall voted it, all but Bettany, who said a Cantor with a sword was a pair of shears in a sermon. She is right. I took it anyway.

It is long and plain, bell-bronze (from which bell, I do not ask), ground until it rings at one-seven-four when struck. Not loud. It rings the way a held breath rings. I tapped it on the tavern step and every glass on the counter shivered in sympathy, and the potboy dropped a tray.

The idea is that it can cut a tuning where a voice cannot reach: a note thrown at a thing, instead of sung to it. I have no intention of using it. I have put it behind the door with the garden hooks, where it hums to the hooks.

Lyra picked it up this evening and held it correctly at once, which I do not love. I took it back. She said it was too heavy for a first fifth anyway. She was right about that as well.

## Page 7: A place where a sound should be [orla_house 1.6,4.6]
Pickup message: A page is tucked down the side of the settle, the ink a little smudged. (Tobin's Journal n/12)
Title: Tobin's Journal, page 7

*Rootday, Frostmonth, 416 SR*

Three doors on Cooper's Row, and their First Reeds do not sound. I went along the lane with my ear turned, door by door. The wind was up. The reeds hung straight as if painted on, and there was nothing wrong with any of them. I took one down and blew across it, and it spoke perfectly well. I hung it back, and in the wind it was silent.

Orla said she could not hear her own kettle. It was boiling. We both watched it.

That is the whole of it. A place where a sound should be, and is not. I have listened for the Hush all my life, the way one listens for a step on the stair. I did not know it would be so ordinary. It was not unkind. That was the worst of it.

Nobody screamed. I keep waiting for the part where somebody screams.

Lit a lamp in the porch of every house along the Row. A hush-lamp keeps a room from going quite still. Slept badly.

## Page 8: The drover [wickhouse 2.4,2.5]
Pickup message: A page lies flat on the shelf of the Wick House, weighed down by a stone. (Tobin's Journal n/12)
Title: Tobin's Journal, page 8

*Driftday, Ashfall, 416 SR*

A drover came up the south road with a story I have been trying not to believe. Whisper-Grove has stopped. He did not say fallen, or taken. He said stopped, and when I asked him to say it again he did, in the same flat voice, like a man reading from a card.

He said the Grove had kept the dead for a thousand years. "The Echo," he said. "It used to catch them. It was in all the songs." Now a man dies and the note goes out of him and nothing takes it up. He said that on the old fields beyond the Grove you can hear the dead humming, and that it is thinner every month.

That is a thing I will not tell Lyra. I have written it here instead, where a page can hold what a person should not have to.

I asked him where he was going. He said he had not decided. He only knew that he did not want to be where it was quiet.

Gave him bread and the root-note's blessing, and watched him go down the road, humming.

## Page 9: The lullaby [rootvault 36.4,8.6]
Pickup message: A sheet is jammed under the foot of a pump-housing, its edge printed with green. (Tobin's Journal n/12)
Title: Tobin's Journal, page 9

*Memoryday, spring, 417 SR*

They have begun to sink the bore. I went down the quarry shaft in the first week, against advice and a Consortium clerk, because a Cantor ought to hear what is done in his parish.

Below the third landing the walls begin to be alive. I know no better word. Green-gold, warm to the hand, veined like a leaf held to the sun. The Root. It sings, if singing is the word for a thing that has been told it may not stop. A lullaby, and it keeps losing the tune. It finds it, and loses it, and finds it, and the loss is worse each time.

The engineers say it is "within tolerance." I asked, whose? A young man with a ledger said the question was outside his remit. He was not unkind. He had been shown how not to be.

I sang the root note to the wall, softly, to tell it that somebody had heard. The wall hummed back. Then the drill started, and I climbed out into daylight and was ill in the quarry road.

I do not think we have long.

## Page 10: A congregation of hounds [mausoleum 4.4,22.6]
Pickup message: A sheet lies among the scriptorium papers, older than the paper around it. (Tobin's Journal n/12)
Title: Tobin's Journal, page 10

*Hearthday, high summer, 417 SR*

The first hounds came on Massday night. Not into the town: to the edge of the orchards, where they sat. Eleven, in a row, heads on one side, like a congregation. They did not howl. They listened.

Harrow says they wait for the evening bell, and we have no bell, so they wait for whatever else we do that sounds like one: the kettle, the cartwheel, the milkmaid's second verse.

I called the Cantors of the three nearest parishes to the Greenhall. Two came. The third sent a note that said only: We have stopped being able to send.

It was a carder from the mill who said it. Not a wall: a stopper. Wrap the town in what eats sound, the way you pad a cradle against a draught. Pack the thorn with wool, and plant the thorn deep. A hedge three men deep that swallows what we make, so the hounds hear nothing and have nothing to come for.

It is a coward's plan. It is also the only one anyone has offered. I wrote "yes" in the register and did not feel any better.

## Page 11: Wool and thorn [underhedge 7.5,24.5]
Pickup message: A page is caught in the roots at the foot of the wool wall, damp and soft as cloth. (Tobin's Journal n/12)
Title: Tobin's Journal, page 11

*Nullday, late summer, 417 SR*

We planted the Hedge. Four hundred hands, and the Governor's two, which blistered. Thorn in the trench, a man's height of packed wool either side, then thorn again, then wool. The carders came out in their aprons and worked all night by lamp. Nell sang the work-song until morning and nobody asked her to be quiet.

It is a strange thing, to build a wall that swallows your own noise. When the last row went in, the whole town stood on the rise and called out together, just to hear it. The sound went into the Hedge like a stone into a pond. There was no echo at all. It was the most terrible thing I have ever heard, and the crowd cheered, and I cheered, and then we were all very quiet, because we could be.

Lyra kept her hand on the wool a long while. "It's listening," she said. I said it was packed wool. She said, "I know," and kept her hand there.

The gate is shut at dusk. Harrow keeps the key. We are safe, they say, as a candle is safe in a jar.

## Page 12: For Lyra [clearing 8.6,21.4]
Pickup message: A last sheet is pinned flat under a stone at the edge of the western oaks. (Tobin's Journal n/12)
Title: Tobin's Journal, page 12

*Driftday, autumn, 417 SR*

For Lyra, if the register is lost and this is not.

The Madder child was warm this morning. I have put that in the register. This is what I did not put there.

Something outside the thorn whistled my own fifth back to me tonight. It had my breath exactly, down to the catch on the turn. It was not unkind. I thought you should know that before it learns yours.

If it comes for me, I will not let it come to the house. I have chosen the south road and the culvert, and a place under the oaks to put the blade down, since a Cantor who dies holding a sword has mistaken his vocation.

You will be angry. Good. Keep it in your chest, where it keeps, and save your voice for the living.

Does it ring? It rings, lark. True enough.

T.

## Completion (12/12), title: Tobin's Journal, bound

You square the twelve pages against your knee, spring to autumn, and they sit together as if they had never been apart. They are not a book. They have no spine, and the hand wavers in the last four. But it is one hand, from the pear-grafts to the oaks, and it never once asks to be pitied.

You find you have read it as a stranger reads a stranger's letters, and that it is not working. He keeps turning into somebody you know.

Somewhere in the Reach a reed hangs over a door and does not sound. Somewhere a man set all of this down so that someone would know how the town was built, and by whom, and that he was afraid, and went anyway.

You tie the pages with a strip of your own sleeve. Does it ring? True enough.

(You keep Tobin's Journal. Your logbook holds all twelve pages.)

Reward: +100 xp, title "Keeper of the Pages", keepsake item "Tobin's Journal" (key item), once.

## Logbook section

Heading: Tobin's Journal (n/12). Note: Loose pages in Cantor Tobin Ashgrove's hand. Read what you have found; the rest lie somewhere he walked. (12/12: All twelve pages. Read them in order.) Entries: "n. <head>" or "n. (not found)". Re-read button returns to the logbook.

## Items

A page in a Cantor's hand: A loose sheet of close, careful writing. Take it up and read.
Tobin's Journal: Twelve loose pages in Cantor Tobin Ashgrove's hand, spring 412 to autumn 417, tied with a strip of sleeve.

---

## EPILOGUE team: all new player-facing text (Phase 6)

Everything here is [PROPOSED] unless it restates LORE_P6.md facts. Variant selection is first-match-wins in the order listed; suffix sentences are appended (max 1 for Kaelen, 1 p2 Lyra, 2 for b1 Lyra). p6e_* flags are written by wrapped party functions (partyJoin, partyBark, partyDowned) in Part Four.

## "Grab the Line" (end of Part Two, ending()): kaelen

**k2_unmet** when `(f) => !gf(f, 'kaelen_met')`

Kaelen Vance is aboard, and you never spoke to him. The coil went into the lock without his instructions, and he has worked out the rest from the silence the bit left behind, because working out the rest is the one trade he has kept. He looks at you for a while the way he would look at a gauge that had read true by accident. "Whoever sent you was either very good or very lucky," he says. He does not say which he would prefer.

**k2_charts** when `(f, c) => c.charts`

Revision Seven made her the fuse, and Kaelen wrote the method Revision Seven improved, and the arithmetic of it is on his face. He sits with his back to the rail so that nobody has to look at him, and the glass hand taps one low note on the boards, over and over, the Root note, as low as the arm will go. He does not know he is doing it. You do not tell him.

**k2_glass_deep** when `(f, c) => c.glassed && c.glass >= 70`

He looks at your tideline once, past the collarbone, and then looks away, which is the first time you have seen him look away from a measurement. "Weeks," he says. Not months. "It follows pain. Stop paying it." He says it flatly, like a load figure. Then he sits down beside you on the deck, close enough that the two glasses can hear each other, and neither of you says what that sounds like.

**k2_glass** when `(f, c) => c.glassed`

He looks at your tideline once, and then at his own hand, and then at the Hedge going away under the keel. "It follows pain," he says. "The old hurts go first. Whatever you were going to do with that arm, do less of it." It is as near as Kaelen comes to asking anyone to be careful. He does not mention the Foundry. The glass hand rings, faintly, all the way up into the cloud.

**k2_plain** when `() => true`

Kaelen sits on a coil of the mooring line with the glass hand across his knees, listening to the Root through it: a lullaby with a hole where the tune keeps slipping. You broke the bore with a coil he specified, and he knows exactly where that sum ends up, and who will be sent the bill. "Hearthday," he says, to the deck. "I told you my hands would shake. I did not say for how long."

*suffix k2_h_answered* when `(f) => gf(f, 'hedge_answered')`

He does not ask what you said to the Hedge. He lived outside it for years, and he knows what an answer sounds like from the far side.

*suffix k2_h_silent* when `(f) => gf(f, 'hedge_silent')`

He asks one thing about the Hedge: whether you answered it. You say no. He nods, like a man handed a tool in good repair.

*suffix k2_h_listened* when `(f) => gf(f, 'hedge_listened')`

He asks whether you listened to the Hedge. You did. "Everyone does," he says. "Do not do it twice."

## "Grab the Line" (end of Part Two, ending()): lyra

**l2_blade** when `(f) => gf(f, 'tobin_417_done')`

Lyra asks to hold her father's tuning-blade. She does not draw it. She lays her palm along the bronze, and the 174 comes up through the sheath, and she stays that way until the rope stops swinging. She has not said a word since the casing. She hands the blade back with both hands, and gives you the look of a woman who would like to say a great deal and has been told by her own throat to wait.

**l2_orla_pim** when `(f) => gf(f, 'boots_delivered') && gf(f, 'pim_safe')`

Lyra hummed a mill-boy's hands clean, and sang the falling fifth against a bore, and sang Orla Hale down proper after it, and a Cantor's voice is a thing you spend, like lamp oil. She sits at the rail counting children by touch, one hand on each small head as it comes over, and has not said a word since the casing. She is not saying it was worth it. She is counting.

**l2_boots** when `(f) => gf(f, 'boots_delivered')`

She sang the falling fifth against the bore, and then she sang Orla Hale down with what was left. It is the second time in a day she has given the last of herself to something, and the second time she has been asked to be glad of it. On the Kestrel she does not speak. She mouths Orla's fourth line, line by line, to see whether it is still there. It is. The voice is not.

**l2_pim_tended** when `(f) => gf(f, 'pim_safe') && gf(f, 'pim_tended')`

Lyra watches the Carder boy come over the rail with his hands wrapped in his mother's apron. She hummed the roots back under his skin once, and you did it a second time, differently from her. She noticed. She was not hurt by it, and she was, a little, and she has no voice left to say either. She looks at his palms, and then she lets the next child's hand slide through hers.

**l2_pim** when `(f) => gf(f, 'pim_safe')`

Lyra watches the Carder boy come over the rail with his hands wrapped in his mother's apron. She hummed the roots back under his skin once. She cannot do it again, for him or for anyone, and she knows there will be other boys in other mills. She looks at his palms, and then she looks away, and lets the next child's hand slide through hers. There is nothing left in her to say it with.

**l2_plain** when `() => true`

Lyra has not spoken since the casing. She sits against the foremast with her hands open on her knees, as if she might be handed something, and watches the town go small. Three hundred and eighty people are waving. She lifts one hand, once, and lets it fall. A Cantor is supposed to sing a place out. The Reach did not get that. It got the rope.

*suffix l2_h_answered* when `(f) => gf(f, 'hedge_answered')`

The patch of quiet where the thing wearing your voice burst is behind her now. She looks at it for a long time, with the face of someone who knows the sound it is not making.

*suffix l2_h_silent* when `(f) => gf(f, 'hedge_silent')`

Somewhere in the mist the Hedge is still trying her voice on the town. She knows it. She watches the thorn for as long as there is thorn.

## "Not Yet" (end of Book One, bookOneEnd()): kaelen

**kb_told_with** when `(f) => (gf(f, 'folder_given') || gf(f, 'kaelen_told_now')) && own(f, 'p6e_ride_k')`

You walked the Deep Woods with him, and you know now what he sounds like when the arm is bad: one low note through his teeth, the Root, and a stop when he hears himself. Telling Lyra did not end the humming. It made it his own. He sleeps on the near side of the fire now, where she can see him, and nobody has caught him facing away since.

**kb_told** when `(f) => gf(f, 'folder_given') || gf(f, 'kaelen_told_now')`

He has said it all out loud, once, to the one person it was owed to, and nothing has been mended. He thought it would feel like putting down a load. It feels like being seen carrying one. He still takes the first watch, and the worst one. Lyra lets him, and takes the next, and neither of them mentions the arrangement.

**kb_kept** when `(f, c) => c.folder || gf(f, 'folder_kept')`

Kaelen has not asked about the folder again. He watches you the way he used to watch a gauge he trusted and could not read. If you gave it to him he would carry it, and he knows that, and you know that, and for now it stays in your shirt. The glass hand taps the rail whenever a note is wrong, and has tapped for days.

**kb_none** when `() => true`

Kaelen has never seen what the Arbiterium wrote about him, and still he keeps the beam like a ledger he owes. He counts what he can: the presses he specified, the bores he tuned, one morning at a Foundry. It does not come out. He does not stop. Whatever he did not do in Whisper-Grove, he will go on paying for in small coin, one name a day.

*suffix kb_s_down* when `(f) => own(f, 'p6e_down_k')`

He went down in the moss once, and you got him back to the fire. He has not mentioned it, and has started leaving the glass hand where you can reach it.

*suffix kb_s_hurt* when `(f) => own(f, 'p6e_hurt_k')`

You heard the arm ring when he was hurt, out in the woods. He pretended it was not ringing. So did you.

*suffix kb_s_ride* when `(f, c, base) => own(f, 'p6e_ride_k') && base !== 'kb_told_with'`

You walked the Deep Woods with him, and he put himself between you and every hound without once saying why.

## "Not Yet" (end of Book One, bookOneEnd()): lyra

**lb_you_sang** when `(f) => gf(f, 'coda_done') && gf(f, 'coda_by_you')`

You sang the coda she could not, and she heard every bar of it from the choir door with her mouth shut. She does not resent it. She says so twice, which is how you know. A Cantor who has been sung for has been given something that cannot be handed back, and she keeps a ledger of those too.

**lb_sang_wearer** when `(f) => gf(f, 'coda_done') && gf(f, 'wearer_coda_dead')`

Lyra sang eight bars of her father's funeral office in harmony with the thing that ate him, and then sang the coda alone. She has not sung it since. At the fire she hums something else, anything else, a skipping-rhyme, a reed-orchard drone, with the care of a woman walking past a grave on the wrong side. Tobin Ashgrove got his office sung to him, properly, once. It was not the one he was owed.

**lb_sang_req** when `(f) => gf(f, 'coda_done')`

Lyra sang the coda against the Requiem, and three hundred years of funeral offices came out of it sung properly, and for the length of one hymn she was exactly what she was trained to be. It cost her the rest of the voice she had. She is learning to speak again in small amounts, like a woman rationing salt.

**lb_pending** when `(f) => gf(f, 'part4')`

The Mausoleum is still singing to itself, a mile north, and Lyra faces it the way you face a debt that has been politely deferred. She has her father's office in her mouth and nowhere to put it. At night she hums the Root under her breath so that the woods will know a Cantor is still in them.

**lb_p3** when `() => true`

Lyra's voice is a ruin, and a ruin is not nothing. At night she hums the response to Sable's count under her breath, so that the Bound Ledger is never read to the dark in silence. Whether the Cantor of the Living Chord can sing again is a question for a later place. She does not ask it aloud.

*suffix lb_s_tend* when `(f) => own(f, 'p6e_tend_l')`

When you were bleeding in the moss she sang the tending note low and laid a hand flat over the wound. "Don't thank me for the healing," she said. "Thank me when we're all home." You are not home. You thanked her anyway.

*suffix lb_s_wren* when `(f) => gf(f, 'wren_saved')`

Wren sits at her elbow and sings the skipping-rhyme too loud, and Lyra lets her. Somebody has to be taught what the Reach was.

*suffix lb_s_taken* when `(f) => gf(f, 'wren_taken')`

She asked once about the girl in the north-west, and you told her. She nodded, and did not ask again, and hummed the skipping-rhyme for the rest of the night the way you hum for the ones you are not allowed to name.

*suffix lb_s_down* when `(f) => own(f, 'p6e_down_l')`

She went down in the moss once and you got her back to the fire. She laughs about it now. It is the wrong kind of laugh.

*suffix lb_s_ride* when `(f) => own(f, 'p6e_ride_l')`

You walked the Deep Woods with her. When the Hush came near she hummed, and it came no nearer. She has never asked you to thank her for it.

*suffix lb_s_blade* when `(f) => gf(f, 'tobin_417_done')`

Her father's tuning-blade rides on your belt. She has not asked for it back. She looks at it every night.

## Bookshelf volumes (read at a shelf; each sets p6e_rd_<id>)

**Memorandum: Registry Square, Revised Hours** (id o_memo, region o, Memorandum, shelf: quarry #0)

From the Clerk of Intake, Registry Square, to the Under-Registrar (Consignments). Re: the hour.

The city has played the hour every hour since the Edict, and the Registry windows have been reglazed twice at the Office's expense. Staff are reminded that the sound is a chord and not a disturbance, and that complaints concerning it are processed under Acoustic Echo Artifacting. The coffee stall in the Square remains sixty years old and unaffected. The Hall of Carriage does not appear on the public plan and should not be asked after at the counter.

Consignments were received in good order. Names were reconciled.

**Notice to Visitors: The Hour** (id o_notice, region o, Notice, shelf: greenhall #1)

Visitors to the Organum are reminded that the city plays the hour, and that the hour will be played.

On the day the Edict of Symmetry was proclaimed the city played for nine hours. No visitor with proper arrangements was inconvenienced. The sound carries thirty miles. Visitors arriving from the west may find that their reeds do not answer it; this is normal. Visitors who find that their reeds do answer it are asked to report to the nearest window.

The Organum thanks you for your patience and your attention.

**A Torn Leaf from the Conservatory Table** (id o_leaf, region o, Fragment, shelf: malting #2)

A single leaf, torn from a Conservatory copy of the Long Octave, and pressed flat. The table of pitches runs down the page and stops at 852.

Below it, in different ink and a different century: Eight is not the octave. Count again.

Below that, smaller, in a hand that shook: The ninth is not stone.

Somebody has tried to scrape the last line away with a knife, and given up, or been interrupted. The parchment keeps the ghost of the scratch. Held to the ear it hums, very faintly, although it is only paper.

**Letter Home from Bastion Fortis** (id p_letter, region p, Letter, shelf: greenhall #2)

Mam,

Rota holds. I have the third bell on the Spine wall again, which is the cold one. Black bread is black, salt mutton is salt, and the mist pulls my buckle sideways if I forget to leave it off. Sergeant says a man's word weighs what he has kept of it. I have kept most.

At muster they asked if I was heavy and I said heavy enough, same as Da. Nobody has taken the Bastion in my lifetime. Nobody has won anything either. Keep the stew on. I will be down by the thaw if the rota lets go of me.

Brannoch

**Harness Order for the Compact of Stone** (id p_order, region p, Order, shelf: tannery #0)

Item: forty hides, tanned to a weight. The Quartermaster of the Compact asks that no hide be sent that cannot hold a buckle in the mist.

Item: lodestone cores for three keels, Fortis-cut, as every core in every skyship is, to be collected from the Vaults by a man whose word has mass. The Compact does not accept a note from anyone it has not heard stand.

Payment in coin, or in work, and not in promises. A promise weighs nothing until it has been kept.

**The Compact of Stone: A Plain Account** (id p_compact, region p, Pamphlet, shelf: malting #3)

The Compact of Stone is a standing army that elects its own command. It has held the Titan's Spine since before the Silencing. Fortis has never been conquered and has never won anything, and the Compact does not regard these as two separate facts.

Growth sounds at 174 and Mass at 396, and a fifth apart is the most stable interval there is. Oakhaven and Fortis have never gone to war. The Compact does not call this friendship. It calls it a fifth, and expects it to hold.

**Line-talk, Null-Watch, Third Dog Watch** (id r_line, region r, Transcript, shelf: malting #1)

Rampart Two, lead battery, patrol of four. Taken down from the speaking-tube by the relief clerk.

...and she said the bees would know, and I said bees don't know, and she said that is what the last one said. Go on, Tam.
I am going on. What was the,
The bees.
Right. The bees. Your turn, Orrin.
My turn. I had a cat. I had a cat called,
Orrin.
Called Mustard. Sorry. Lost the end of it. Talk to me.
I am talking. Dawn gun in forty.

Patrol relieved at the bell. Four went out. The clerk has written four.

**Basket Log, the Rift Winch-house** (id r_baskets, region r, Logbook, shelf: wickhouse #0)

Basket 212. Lowered at dawn, after the gun. Came up at dusk. Contents: the basket, the rope, one boot, laced.

The Rift opened in 413 and baskets have gone down for six years. We do not write what we send them for.

Note for the day: winch quiet, which is not usual. Note corrected: the winch was loud. I could not hear it. The gun fired at dawn. The gun fires at dawn.

**Order of Service for Those Lowered** (id r_lowered, region r, Order of service, shelf: mausoleum #0)

For those who went down the Rift and whom nobody could bury.

The Cantor sings the response, because there is no body to sing over. The name is spoken. The garrison returns the response from the lead ramparts at dawn, over the gun. If no answer comes, the name is spoken again. It is spoken again.

Since Memory was silenced no one has been certain the response arrives. It is sung regardless.

## Lore Codex stubs (shown once a volume of that region is read)

**The Organum (hearsay)**

A seat, not a realm. Travellers from the east say it looks like a tax office, with brass plates and a coffee stall, and that its towers are pipes, and that when the wind is right the whole city sounds one low chord. The Keynote is said to lie beneath it, where the eight roots meet.

**Bastion Fortis (hearsay)**

A fortress cut into the Titan's Spine above the Lodestone Vaults. The people are dour, literal and decent, and treat weight as a moral category. The greeting is "You're heavy?" and the answer is "Heavy enough." Every skyship's lodestone core is Fortis-cut. They keep the longest unbroken watch-rota in history.

**Null-Watch and the Rift (hearsay)**

Where the continent ends: an abyssal divide opened in 413, and a garrison on lead ramparts firing dampening cannons at every dawn. Patrols are made to talk without pause, because silence invites the Quiet. Talking is how you keep each other. Baskets have gone down for six years.

## World map margin notes (second shows once a volume of that region is read)

**organum**

- In pencil, by the Organum: "Thirty miles, they say, you can hear it play the hour. Nobody in the Reach has tried to listen."
- Under it, in ink: "Registry Square. Grey buildings, brass plates, a coffee stall. Do not be taken in by the stall."

**peaks**

- Along the Spine, a carter's scrawl: "Leave your buckles at the foot. The mist takes metal sideways."
- Beneath: "Longest watch-rota in history. Nobody remembers who set it."

**rift**

- At the right-hand edge, where the paint stops, in pencil: "Keep talking."
- A dawn gun, drawn very small, and a column of tally strokes, one for every dawn since 413. The strokes run off the edge of the page.

