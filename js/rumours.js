// ============================================================
//  rumours — Phase 6 (story reactivity), team RUMOURS.
//  1. Deed-sensitive tavern talk. Hetty Bram (the barman of the Boar & Dulcimer) and the
//     generic townsfolk (NPCS entries flagged `rumour: true`: the tavern patron and the
//     orchardmen and goodwives, including their tavern stand-ins) get one extra button in
//     the dialogue, "Any news?". It never touches NPCS, TOPICS or askTopic: the wrapper
//     only appends the button after renderDialogue has drawn the panel.
//  2. The Synod Gazette. A transient, non-solid notice-board sign on Oakhaven's street in
//     front of the Greenhall and the Chapel, and inside the Boar, opens a held document
//     (READING.SOURCES) in the flat Office voice. Its issue follows the story.
//  Switch: UPG.storyRumours (default true; GFX.storyRumours === false also turns it off).
//  Off = the original dialogue and street: no button, no signs, no flags written.
//  Honesty rules: a line is eligible ONLY when the flags (or crime record) prove the deed;
//  nothing is random (the choice is a pure function of the state, p6r_n and p6r_last);
//  quest flags are only ever read. The only things written are the integers p6r_n,
//  p6r_last and the boolean p6r_body (a patrol found a body: the game keeps that only on
//  a transient corpse, so it is remembered here). Every string shown comes from the
//  constant tables below; save data (flags, names, numbers) only selects among them and
//  numbers are clamped integers. Prose is written to LORE_P6.md; anything invented beyond
//  that brief is marked [PROPOSED].
// ============================================================
'use strict';

if (typeof UPG !== 'undefined' && UPG && UPG.storyRumours === undefined) UPG.storyRumours = true;

const STORYRUM = (() => {
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clampInt = (v, lo, hi) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.floor(v))) : lo;
  const enabled = () => {
    try { return !(typeof UPG !== 'undefined' && UPG && UPG.storyRumours === false) && !(typeof GFX !== 'undefined' && GFX && GFX.storyRumours === false); } catch (e) { return false; }
  };

  // ------------------------------------------------------------ context (read-only view of the game)
  // `over` lets the tests pin weather, hour, crime and so on without touching the game.
  function context(over) {
    const f = (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
    const p = (typeof G !== 'undefined' && G.player && typeof G.player === 'object') ? G.player : {};
    // read the crime record WITHOUT crimeState() so that looking never writes to the save
    const cr = p.crime && typeof p.crime === 'object' ? p.crime : {};
    const WEATHER = ['clear', 'overcast', 'rain', 'storm', 'mist', 'snow'];
    let weather = ''; try { if (typeof UPG === 'object' && UPG && WEATHER.includes(UPG.weather)) weather = UPG.weather; } catch (e) { /* none */ }
    const tod = (typeof G !== 'undefined' && typeof G.tod === 'number' && isFinite(G.tod)) ? G.tod : 0.5;
    const day = (typeof G !== 'undefined') ? clampInt(Number(G.day), 0, 99999) : 0;
    const c = {
      has: (k) => own(f, k) && !!f[k],
      crime: { bounty: clampInt(cr.bounty, 0, 9999), thefts: clampInt(cr.thefts, 0, 9999), assaults: clampInt(cr.assaults, 0, 9999), escapes: clampInt(cr.escapes, 0, 9999), jail: clampInt(cr.jailHours, 0, 99999) },
      weather, day,
      hour: (((tod % 1) + 1) % 1) * 24,
      // Hearthday is day 10 (game.js sets G.day = 10 when the Rite begins)
      daysLeft: 10 - day,
      body: own(f, 'p6r_body') && !!f.p6r_body,
      exposed: Object.keys(f).some(k => k.startsWith('disguise:exposed:') && f[k] === true),
      glassed: !!p.glassed,
      horse: false,
    };
    try { c.horse = typeof horseActive === 'function' && !!horseActive(); } catch (e) { /* no travel module */ }
    c.lawOn = !c.has('greening') && !c.has('part3');   // the watch is off duty once the town is going under
    return Object.assign(c, over || {});
  }

  // ------------------------------------------------------------ the rumours
  // cat: 'deed' (about something the player did or what is happening to the story), 'world'
  // (the wider world, lightly), 'weather', 'ambient' (town colour that claims no deed).
  // Eligible when: every flag in req, at least one in any, none in not, and when(c).
  // rank: how late in the story it sits; the newest eligible deed is told first.
  // who: 'hetty' (the barman), 'patron' (anyone who is not Hetty), 'any'.
  const R = [];
  const add = (id, cat, who, rank, spec, text) => R.push(Object.assign({ id, cat, who, rank, text }, spec));

  // ---- story stage
  add('d_cantor_asks', 'deed', 'any', 10, { not: ['lyra_met', 'greening'], note: 'You have not yet met Lyra' },
    'Does it ring? The Cantor has been asking at the gate after a stranger. If that is you, Cooper\'s Row, the house with the green door, and do not sing on the way.');
  add('d_hearthday', 'deed', 'any', 12, { not: ['rite_started', 'greening', 'escaped'], note: 'Before the Rite; the wording follows the days left to Hearthday (day 10)' },
    (c) => c.daysLeft >= 6 ? 'Hearthday is the best part of a week off and the Church is already on the Greenroot road. Singing, naturally. Hymns bring hounds and the Church does not care.'
      : c.daysLeft >= 3 ? 'Hearthday is a few days off and the censers are being aired at the Chapel. I counted four. They only needed three.'
      : c.daysLeft >= 1 ? 'Hearthday is on us tomorrow or the day after. I have put the good mugs in the cellar and the bad ones on the bar. Sap and splinters, I hate a Rite.'
      : 'They say it is Hearthday or near enough, and the Chapel smells of hot bronze. I have stopped counting days. I count lamps.');
  add('d_gate', 'deed', 'any', 20, { req: ['gate_open'], not: ['kaelen_met'], note: 'Harrow has opened the North Gate for you' },
    'Harrow unbarred the North Gate after dusk for someone with the Cantor\'s word. Eleven years he has kept it shut at night, and it took a stranger and one sentence to move him. Folk would like the sentence.');
  add('d_kaelen', 'deed', 'any', 30, { req: ['kaelen_met'], not: ['coil_done'], note: 'You have met Kaelen' },
    'Somebody walked out past the hound-bed to the Governor\'s son and walked back with their voice still in them. That is more than anyone expected. What he said is what folk want to know.');
  add('d_quarry_charts', 'deed', 'any', 32, { req: ['tobiah_met'], not: ['coil_done'], note: 'Tobiah gave you his charts' },
    'A boy on the quarry night shift has given something away he ought not to have, and it was not money. The Factor\'s people are counting paper. Sap and splinters, I would not be that boy.');
  add('d_coil', 'deed', 'any', 65, { req: ['coil_done'], not: ['rite_started'], note: 'Kaelen has the coil and has given you the pass' },
    'They say a coil has gone from Depot Three and a Consortium pass is in the wrong pocket. That is the quarry\'s business, and I suspect the Governor\'s son\'s. Hearthday is the day, whatever the day is for.');
  add('d_rite', 'deed', 'any', 80, { req: ['rite_started'], not: ['greening'], note: 'The Rite has begun (you went down to the Root-vault)' },
    'They walked the Cantor down in white, and the town hummed the Root note under the Pure Note, too quietly to punish. I am humming it into the mugs. Do not tell the proctors.');
  add('d_lyra_taken', 'deed', 'any', 85, { req: ['lyra_taken_seen'], not: ['greening'], note: 'You saw the seal on Lyra\'s shutter' },
    'The shutter on the Cantor\'s house has a proctor\'s seal pasted over it, and the hearth is cold. They call it the Church\'s protection. I call it a very tidy cell.');
  add('d_greening', 'deed', 'any', 95, { req: ['greening'], not: ['escaped'], note: 'The bore is broken and the Greening has begun' },
    'The oaks are doubling and ringing, and the cobbles are splitting from underneath. Get to the mooring mast on the east side of the square. The corsair takes children first, four to a line.');
  add('d_escaped', 'deed', 'any', 98, { req: ['escaped'], note: 'You got out on the Kestrel' },
    'A skyship lifted off the mooring mast with more aboard than she had line for. They say the whole Reach heard the town after her. Calling, I would say, not singing.');
  add('d_part3', 'deed', 'any', 100, { req: ['part3'], note: 'Part Three: the Kestrel has reached Whisper-Grove' },
    'A skyship put down at Whisper-Grove, where nobody has put down since the Silencing in \'16. The Port Cantabile sheets have it in four versions. One may be correct.');
  add('d_part4', 'deed', 'any', 101, { req: ['part4'], note: 'Part Four: the Deep Woods' },
    'A pedlar out of the Deep Woods says the quiet there has begun to keep time. He would not say whose. He bought nothing and left by the road he came.');
  add('d_done', 'deed', 'any', 102, { req: ['book_one_done'], note: 'Book One is finished' },
    'There is talk on the barges of a skyship with a willow crown and a holed tank, down in the Deep Woods, and of an Office cutter nobody can account for. The Office has the cutter down as redeployed. [PROPOSED]');

  // ---- Hetty, the mast-ladder and the Kestrel's hold
  add('d_hetty_wait', 'deed', 'hetty', 22, { req: ['hetty_crates'], not: ['crates_heard'], note: 'Hetty asked you to listen at the crates; you have not' },
    'His hold has been quiet all day. I took his supper up twice and put my ear to the hatch and it was only wood. That is worse.');
  add('d_hetty_wait_p', 'deed', 'patron', 22, { req: ['hetty_crates'], not: ['crates_heard'], note: 'Hetty asked you to listen at the crates' },
    'Hetty keeps taking the corsair\'s supper up the mast-ladder herself, and coming down with her face shut. Do not ask her. I asked her.');
  add('d_crates_heard', 'deed', 'patron', 34, { req: ['crates_heard'], not: ['vane_told'], note: 'You have heard the crates (and Vane has not been told)' },
    'Something is said to be in the corsair\'s crates that Hetty will not name. She has stopped letting anyone carry a cask down there but herself.');
  add('d_hetty_paid', 'deed', 'hetty', 36, { req: ['hetty_paid'], not: ['vane_told'], note: 'Hetty paid you for the crates; Vane has not yet heard them' },
    'He is in the corner again, laughing at nothing. Go and make him hear them, will you. I paid for that, and it was not cheap.');
  add('d_vane_told', 'deed', 'hetty', 40, { req: ['vane_told'], not: ['rite_started'], note: 'Vane has been made to hear the names' },
    'He sat very still last night, your corsair, with a mug he did not touch. Whatever you made him hear has stayed with him. Good.');
  add('d_vane_told_p', 'deed', 'patron', 40, { req: ['vane_told'], not: ['rite_started'], note: 'Vane has been made to hear the names' },
    'The corsair paid his tab in full and has not laughed at nothing since. In my experience that is a man about to fly or about to confess.');

  // ---- the lane, the mill, the Flume
  add('d_plinth', 'deed', 'any', 28, { req: ['plinth_read'], not: ['greening'], note: 'You read the chalk on the empty bell-frame' },
    'Somebody has read the chalk on the empty bell-frame. They rang in E, it says. The old women have started saying it under their breath, like a grace, and asking who taught the Hedge to whistle.');
  add('d_culvert_key', 'deed', 'any', 38, { req: ['culvert_open'], not: ['twins_found'], note: 'You took the culvert key' },
    'The culvert key is off its nail at Abner Fenning\'s. First time in a month. Somebody has gone down, and nobody has said so.');
  add('d_twins_found', 'deed', 'any', 42, { req: ['twins_found'], not: ['hob_told'], note: 'You found the twins\' coats under the culvert' },
    'A stranger has been down the Tannery culvert and come back up. Abner\'s lamp is still in the window, and Abner is standing at it, not looking.');
  add('d_twins_named', 'deed', 'any', 43, { req: ['twins_named'], not: ['greening'], note: 'You wrote Ned and Wyn in your ledger' },
    'Somebody has written the Fenning twins down, Ned and Wyn, whole names, somewhere that is not the Office\'s ledger. I do not know where that is. I would like to.');
  add('d_hob_told', 'deed', 'any', 44, { req: ['hob_told'], not: ['greening'], note: 'You told Abner what you found' },
    'Abner Fenning has put out the lamp in his window. All of Tannery Row saw it go dark, and none of us said a word.');
  add('d_boots', 'deed', 'any', 46, { req: ['rooke_boots'], not: ['boots_delivered'], note: 'Rooke gave you Davin\'s boots' },
    'Rooke handed a stranger a pair of boots to carry across town. In this town that is the nearest thing to a confession we have.');
  add('d_boots_done', 'deed', 'any', 48, { req: ['boots_delivered'], not: ['greening'], note: 'You gave Orla Hale the boots' },
    'Orla Hale has her boy\'s boots on the chair now. She asked the stranger for the harvest song and did not get it, and she says that was right. She says Lyra will sing her down proper.');
  add('d_nell_wait', 'deed', 'any', 50, { req: ['nell_met'], not: ['pim_safe'], note: 'Nell has asked you for oiled honey' },
    'Nell Carder has been to the market for honey twice and come home with none. The inspection is coming. I will say no more about whose hands.');
  add('d_pim_safe', 'deed', 'any', 52, { req: ['pim_safe'], not: ['pim_tended', 'greening'], note: 'You got Pim through (honey)' },
    'The Carder boy\'s hands have passed. Nobody has chalked the door. Nell has started talking again, mostly to the flour sacks.');
  add('d_pim_tended', 'deed', 'any', 54, { req: ['pim_tended'], not: ['greening'], note: 'You hummed the tending note over Pim\'s hands yourself' },
    'Somebody hummed the Carder boy\'s hands clean who is not the Cantor. The boy says they do it different. He says it like a compliment.');
  add('d_tam_asked', 'deed', 'any', 56, { req: ['tam_met'], not: ['tam_told', 'tam_left'], note: 'Tam asked you if it is her' },
    'Old Tam asked a stranger at the Flume whether it was her. Nobody asks that who wants a straight answer, and nobody gives one who has any heart.');
  add('d_tam_told', 'deed', 'any', 57, { req: ['tam_told'], not: ['tam_sat', 'greening'], note: 'You told Tam the truth' },
    'Tam has not been to the Flume crossing in days. He sits at home with the lamp lit, which he never allowed. They say he got his answer.');
  add('d_tam_left', 'deed', 'any', 57, { req: ['tam_left'], not: ['greening'], note: 'You left Tam his hope' },
    'Tam is back on his stone, and the water brings his Essa up at dusk, and he sings the second verse with her. Nobody tells him anything now.');
  add('d_tam_sat', 'deed', 'any', 58, { req: ['tam_sat'], not: ['greening'], note: 'You sat with Tam in silence' },
    'Someone sat with Old Tam at the crossing and never said a word, and he got up and went home. I cannot decide if that is the kindest thing I have heard or the cleverest.');
  add('d_sable_met', 'deed', 'any', 45, { req: ['sable_met'], not: ['sable_done'], note: 'You met Umber, the Veil runaway, outside the Hedge' },
    'There is a woman out east past the Governor\'s son\'s hut, writing in a book by a hush-lamp. She asks strangers for three names. The grey men at the gate want her very badly.');
  add('d_sable_kept', 'deed', 'any', 60, { req: ['sable_kept'], not: ['greening'], note: 'You told Umber to keep what is left of her' },
    'The scribe out past the Hedge is keeping what is left of herself, they say, and writing down who told her to. I have decided that is a good thing. I will tell you if I change my mind.');
  add('d_sable_returned', 'deed', 'any', 60, { req: ['sable_returned'], not: ['greening'], note: 'Umber read a Hollow its name back [PROPOSED wording]' },
    'A Hollow at the quarry pumps said its own name aloud. Hew Callan. The ones either side stopped their loops to listen, they say, as if someone had said something rude.');
  add('d_ignatius', 'deed', 'any', 47, { req: ['ignatius_met'], not: ['greening'], note: 'Ignatius Crane spoke to you in the Chapel' },
    'Brother Ignatius has taken to preaching at the rafters. Folk say he has seen a thing and decided not to have seen it. The Note is held regardless.');
  add('d_bounty_board', 'deed', 'any', 41, { req: ['bounty_1_done'], not: ['greening'], note: 'You collected the Writ of Clearing' },
    'The Greenhall board has paid out for the culling of a pack on the north road. Thirty-five sovereigns, counted twice. Clean work, they say, and quiet.');
  add('d_house', 'deed', 'any', 41, { req: ['house_bought'], not: ['greening'], note: 'You bought the house on Cooper\'s Row' },
    'Somebody has paid the Greenhall clerk sixty sovereigns for a house on Cooper\'s Row. In this town. In this year. The clerk bit every coin.');

  // ---- the Hedge
  add('d_hedge_answered', 'deed', 'any', 61, { req: ['hedge_answered'], not: ['wearer_dead', 'greening'], note: 'You answered the Hedge' },
    'Harrow swears the Hedge said I\'m here last night, in a voice he did not know and then did. Never answer it. Answering tells it you are there.');
  add('d_hedge_silent', 'deed', 'any', 59, { req: ['hedge_silent'], not: ['hedge_answered', 'greening'], note: 'You said nothing to the Hedge' },
    'A stranger stood at the Hedge at the dead hour and said nothing while it tried Lyra\'s voice, and then a child\'s, and then gave up. Folk call that brave. I call it quiet, and here that is the same.');
  add('d_hedge_listened', 'deed', 'any', 59, { req: ['hedge_listened'], not: ['hedge_answered', 'greening'], note: 'You stood and listened at the Hedge' },
    'They say someone stood at the Hedge and listened under the voices and heard another sound: a great many people, far down, all talking at once. I have not slept right since I heard that.');
  add('d_wearer_dead', 'deed', 'any', 64, { req: ['wearer_dead'], not: ['greening'], note: 'You killed the thing that wore voices at the Hedge' },
    'Whatever was wearing voices at the Hedge burst, they say, and everything it had eaten came out at once. There is a patch of ground there now where no sound carries. Do not test it.');

  // ---- law, bodies, disguise (all stop when the watch is off duty: the Greening, or Part Three)
  const law = (id, rank, who, note, when, text) => add(id, 'deed', who, rank, { note, when: (c) => c.lawOn && when(c) }, text);
  law('c_small_bounty', 62, 'any', 'Oakhaven bounty 1-39 (no notice yet)', (c) => c.crime.bounty >= 1 && c.crime.bounty < 40,
    'The constables are asking after a stranger\'s light hand, or a heavy one. There is no paper up yet. They are considering, which is how paper starts.');
  law('c_wanted', 70, 'any', 'Oakhaven bounty 40+ (the warrant is posted)', (c) => c.crime.bounty >= 40,
    'There is a warrant pasted up with a stranger\'s name on it and a sum beside the name. I am told I am sitting nearer to it than is wise. Keep your voice low and your hands where I can see them.');
  law('c_wanted_big', 74, 'hetty', 'Oakhaven bounty 100+', (c) => c.crime.bounty >= 100,
    'I do not hold with trouble in my taproom, and I do not hold with the watch, and that sum on the wall would buy my cellar twice over. Drink up, and mind the door.');
  law('c_theft', 60, 'any', 'You have been reported for theft', (c) => c.crime.thefts > 0,
    'Purses in Oakhaven have gone lighter, and the constables have begun looking at hands. Quick ones, mostly. Keep yours in your lap.');
  law('c_assault', 61, 'any', 'You have been reported for striking a civilian', (c) => c.crime.assaults > 0,
    'Someone cuffed a townsman in the street and the watch took it personal. A slap is paperwork in Oakhaven. A bruise is a bounty.');
  law('c_jail', 63, 'any', 'You have served time in the watch-house', (c) => c.crime.jail > 0,
    'A stranger served their hours on the watch-house bunk and came out quieter than they went in. The sergeant says they were no trouble. Nobody is, in there. It is a very quiet cell.');
  law('c_escape', 72, 'any', 'You escaped from the watch-house', (c) => c.crime.escapes > 0,
    'Somebody walked out of the watch-house cell, which has not happened since it was a granary. The Office will call it a scheduling matter. Watch what they call everything else.');
  law('c_body', 68, 'any', 'A patrol found a body you left (remembered as p6r_body)', (c) => c.body,
    'A patrol found a body where no body ought to be and rang for the others. They look at every shadow on the ground now. Even mine, and I am sitting.');
  law('c_disguise', 66, 'any', 'You were spotted in a Synod clerk\'s robe', (c) => c.exposed,
    'Somebody has been going about in a Synod clerk\'s robe and was spotted, and now every proctor looks hard at every grey sleeve. There is talk the clerks are counting their robes.');

  // ---- what the player is
  add('p_glass', 'deed', 'any', 8, { note: 'Your character is a glass-bearer (p.glassed)', when: (c) => c.glassed && !c.has('greening') },
    'Somebody\'s arm is the colour of lamp-glass, green-gold at the wrist, and climbing. The Governor\'s son has the same, and look how he lives. Folk say coincidence. Folk are generous.');
  add('p_horse', 'deed', 'any', 9, { note: 'You have a hired horse right now', when: (c) => c.horse && !c.has('greening') },
    'Someone has hired a horse out of the North Gate stables by the hour. A horse. In Oakhaven. It will be back before it is missed, or it will not.');

  // ---- weather and hour (world, claims no deed)
  const wx = (k, text) => add('w_' + k, 'weather', 'any', 0, { note: 'The sky is ' + k, when: (c) => c.weather === k }, text);
  wx('rain', 'Rain on the oaks tonight, soft as a hand on a hood. Sound will not carry in it, which is a mercy and a danger both.');
  wx('storm', 'A storm is walking up the river. The oaks ring when the wind moves them, and tonight they will ring like a bad conscience.');
  wx('mist', 'Sea-fog has sat down in the streets. The Hedge likes mist. Keep a lamp lit and follow no voice you cannot see.');
  wx('snow', 'The first snow came sideways off the water. It crunches. Walk like you owe it money.');
  wx('overcast', 'Flat grey all day and nothing moving in it. I like it. The Hedge cannot find us under cloud, or so I tell myself.');
  wx('clear', 'Clear, and cold with it. Sound carries on a night like this, so keep it in your chest.');
  add('w_night', 'weather', 'any', 0, { note: 'Between eleven at night and four in the morning', when: (c) => c.hour >= 23 || c.hour < 4 },
    'The dead hour is near. I put the hush-lamp on the sill early and I will sleep in my boots. Does it ring? True enough.');

  // ---- the wider world (teasers only; nothing here is said about the player)
  const world = (id, text, note) => add(id, 'world', 'any', 0, { note: note || 'Always (world colour)' }, text);
  world('x_cantabile', 'A man off the river barge says Broadsheet Row in Port Cantabile prints four papers, all libellous, and one of them is occasionally correct. He would not say which. He said that was the business model.');
  world('x_pell', 'There is a broadsheet-man in Port Cantabile, Pell, who prints what he likes and sleeps over the press. They say the Office has sent him three polite letters. He framed the first.');
  world('x_fortis', 'My cousin says Fortis has never been conquered and has never won anything, either. They greet you with are you heavy, and you are meant to say heavy enough. I do not know what it means. I would like to.');
  world('x_bedrock', 'Oakhaven and Fortis have never gone to war. Not once. My granda said it was the only boast the Reach had that cost nothing.');
  world('x_lodestone', 'Every skyship in the world hangs on a Fortis-cut lodestone core, they say, even the corsair\'s. Think of that when she lifts. I do, daily.');
  world('x_organum_office', 'A drover who has been through Registry Square says the Organum looks like a tax office. Grey buildings, brass plates, and a coffee stall that has been there sixty years. He said that was the worst of it.');
  world('x_organum_nine', 'Old folk say that when the Edict of Symmetry was proclaimed the Organum played the hour for nine hours together. They say you could hear it thirty miles off. They do not say what they did about it.');
  world('x_nullwatch', 'The garrison at Null-Watch talks all night along the whole line, never stopping, because silence invites the Quiet. Line-talk, they call it. I have started doing it at home.');
  world('x_ninth', 'There is a half-line my nan used to hum and stop. The ninth is not stone. She never would sing the rest.');
  world('x_reed', 'Every child in the Reach has a reed hung over the door, tuned to them at birth. A pedlar says in the silenced places not one of them sounds. Mine does, if the wind is right.');
  world('x_office', 'I asked a proctor what became of the people the Office processes. Reconciled, he said. We both drank to that, and neither of us knew what we had drunk to.');
  world('x_patriarch', 'The Choir-Church has a High Patriarch called Severin Ashe. They say he is kind. They say it the way you tell somebody the bridge is out.');
  world('x_arbiter', 'They say the Supreme Arbiter is a hundred and forty years old and listens through glass. I took the pane out of my window. I am cold, and I am private.');
  world('x_sandglass', 'At the Sandglass Bazaar, a traveller told me, they sell you an hour and you owe it back. I said that sounded like Oakhaven. He said no, Oakhaven does not give you the hour.');
  world('x_cinderhold', 'A smith passing through said the furnaces at Cinderhold have not gone cold since before the Fracture. He said it like a complaint and like a prayer.');

  // ---- town colour (claims no deed)
  const amb = (id, who, text) => add(id, 'ambient', who, 0, { note: 'Always (town colour)' }, text);
  amb('a_lamps', 'any', 'Keep a hush-lamp lit on every sill. A room that goes quiet is a door left open. My mother taught me that, and the Hedge taught her.');
  amb('a_oaks', 'any', 'The oaks ring like bronze when the wind moves them. I loved that sound once. Sap and splinters, I would give a month\'s wages for one plain tree.');
  amb('a_colour', 'patron', 'Red was redder when I was a girl, and summers were warmer. Everyone over thirty says so. The young ones think we are mad.');
  // Hetty's rule has Davin's name on it only once he has died, on Hearthday evening (days35)
  add('a_hetty_sing', 'ambient', 'hetty', 0, { req: ['davin_gone'], note: 'Town colour, once Davin has died' }, 'Singing is free in here and it will get you killed. That is not a rumour, that is the house rule. It has been since Davin.');
  add('a_hetty_beer', 'ambient', 'hetty', 0, { req: ['davin_gone'], note: 'Town colour, once Davin has died' }, 'I have never lost a patron to a hound. Only to a song, and a song is not a thing I serve.');
  add('a_hetty_rule', 'ambient', 'hetty', 0, { not: ['davin_gone'], note: 'Town colour, before Davin dies' }, 'Singing is free in here and it will get you killed. That is not a rumour, that is the house rule, and it is on the board by the door.');

  // ------------------------------------------------------------ choosing
  const ELIGIBLE_WHO = (who, speaker) => who === 'any' || who === speaker;
  function eligible(c, speaker) {
    return R.filter((r) => ELIGIBLE_WHO(r.who, speaker)
      && (!r.req || r.req.every((k) => c.has(k)))
      && (!r.any || r.any.some((k) => c.has(k)))
      && (!r.not || !r.not.some((k) => c.has(k)))
      && (!r.when || r.when(c)));
  }
  // newest deed first; ties keep the order they were written in
  const byRank = (a, b) => (b.rank - a.rank) || (R.indexOf(a) - R.indexOf(b));
  // Deterministic: ask number n (0,1,2,...) takes a deed from the five newest eligible, except
  // that every third ask (n % 3 === 2) is world colour so a long-playing save still hears of
  // the wider Reach. The same rumour is never told twice running.
  function choose(c, speaker, n, last) {
    const all = eligible(c, speaker);
    const deeds = all.filter((r) => r.cat === 'deed').sort(byRank).slice(0, 5);
    const colour = all.filter((r) => r.cat !== 'deed').sort((a, b) => (a.cat === b.cat ? R.indexOf(a) - R.indexOf(b) : (a.cat === 'weather' ? -1 : 1)));
    const slot = n % 3 === 2;
    let pool = slot ? colour : deeds, i = slot ? Math.floor(n / 3) : n - Math.floor((n + 1) / 3);
    if (!pool.length) { pool = slot ? deeds : colour; i = n; }
    if (!pool.length) return null;
    let r = pool[i % pool.length];
    if (R.indexOf(r) === last && pool.length > 1) r = pool[(i + 1) % pool.length];
    else if (R.indexOf(r) === last) { const other = (slot ? deeds : colour); if (other.length) r = other[0]; }
    return r;
  }
  const textOf = (r, c) => String(typeof r.text === 'function' ? r.text(c) : r.text);

  // Tell the next rumour. Writes only p6r_n and p6r_last.
  function next(speaker, over) {
    const c = context(over), f = G.flags;
    const n = own(f, 'p6r_n') && Number.isInteger(f.p6r_n) && f.p6r_n >= 0 && f.p6r_n < 1000 ? f.p6r_n : 0;
    const last = own(f, 'p6r_last') && Number.isInteger(f.p6r_last) && f.p6r_last >= 0 && f.p6r_last < R.length ? f.p6r_last : -1;
    const r = choose(c, speaker || 'patron', n, last);
    if (!r) return null;
    f.p6r_n = (n + 1) % 1000; f.p6r_last = R.indexOf(r);
    return { id: r.id, text: textOf(r, c) };
  }

  // ------------------------------------------------------------ the Synod Gazette
  // Priority order: the first issue whose flags are all there is the front page.
  const ISSUES = [
    { id: 'reclassed', no: 'No. 38', any: ['escaped', 'part3', 'part4', 'book_one_done'], note: 'You have left Oakhaven on the Kestrel',
      head: 'OAKHAVEN: A CLASSIFICATION UPDATE',
      items: [
        'The district formerly styled Oakhaven is reclassified as woodland. Persons formerly resident are considered reconciled to wherever relocation has occurred.',
        'Departures by air during the period of irregularity are recorded as weather.',
        'The Consortium thanks the Reach for its cooperation. Cooperation was not requested. It was received.'],
      notice: 'Enquiries concerning the district are to be put in writing. They will be filed with the district.' },
    { id: 'greening', no: 'No. 37', req: ['greening'], note: 'The bore is broken: the Greening',
      head: 'AN AGRICULTURAL IRREGULARITY',
      items: [
        'A period of accelerated growth has been recorded in the Oakhaven district. The cause is under review and is considered agricultural.',
        'The Consortium reports the early retirement of the quarry bore. The bore was retired by being broken. This is a scheduling matter.',
        'Residents are asked to make their way to the mooring mast in an orderly fashion. The mast is not an official relocation point. The Office has no comment on the mast.'],
      notice: 'Oaks that ring are to be treated as weather.' },
    { id: 'rite', no: 'No. 36', req: ['rite_started'], note: 'The Rite has begun',
      head: 'THE HOLD OVER OAKHAVEN PROCEEDS',
      items: [
        'The Cantor of Oakhaven is in the Church\'s protection for the duration of the hold, estimated at four hours. Protection is not detention. The shutters of her house have been sealed for their safety.',
        'Persons humming the Root note beneath the Pure Note are thanked for their participation. Participation was not requested.',
        'Activity reported in the quarry shaft is the activity of the shaft.'],
      notice: 'All shutters are to be closed. Sealed shutters are to remain sealed.' },
    { id: 'coil', no: 'No. 35', req: ['coil_done'], note: 'You have the coil and the Consortium pass',
      head: 'A COIL IS UNACCOUNTED FOR',
      items: [
        'A reverse-phase coil, formerly held in Depot Three, is unaccounted for. It is not missing. Missing is a grade the Consortium has not assigned.',
        'A quarry pass has been issued to a party not on the roster. Passes are sometimes issued in error. The error is considered to have been issued correctly.',
        'The Governor\'s son is reminded that his presence at the Rite is not required, and will be minuted as attendance.'],
      notice: 'Residents are asked to hold themselves ready for Hearthday. Readiness will be assessed by the Church.' },
    { id: 'hedge', no: 'No. 34', any: ['hedge_answered', 'hedge_listened', 'hedge_silent', 'wearer_dead'], note: 'You have stood at the Hedge at the dead hour',
      head: 'ACOUSTIC ECHO ARTIFACTING AT THE HEDGE',
      items: [
        'Residents who have heard voices at the Hedge are informed that the voices are acoustic echo artifacting. The dead are not speaking. The dead are being echoed.',
        { any: ['hedge_answered'], t: 'A report that a voice was answered at the Hedge has been filed under weather.' },
        { any: ['hedge_listened'], not: ['hedge_answered'], t: 'Listening at the Hedge is not a recognised activity. Residents who wish to listen are invited to do so at the Chapel.' },
        { any: ['hedge_silent'], not: ['hedge_answered', 'hedge_listened'], t: 'Saying nothing at the Hedge is a civic contribution. It is acknowledged. It is not rewarded.' },
        { any: ['wearer_dead'], t: 'A resonance fault in the boundary growth, previously described as a presence, has been resolved. The ground where sound does not carry is under review.' }],
      notice: 'Voices heard at the Hedge outside Hedge hours are not covered by the Hedge.' },
    { id: 'quarry', no: 'No. 33', any: ['kaelen_met', 'tobiah_met'], note: 'You have met Kaelen or Tobiah',
      head: 'QUARRY ROSTER UNDER ROUTINE RECONCILIATION',
      items: [
        'Charts held on the night shift are being counted. Where counts differ, the charts are considered to have been counted differently.',
        'Depot Three is being reconciled by Factor Vosk. Reconciliation has found no irregularity. Reconciliation has not finished.',
        { any: ['tobiah_met'], t: 'Junior Engineer Marsh is commended for diligence. Commendation is revocable on notice.' }],
      notice: 'Persons without a roster number are not on the quarry. The quarry regrets that this has to be said.' },
    { id: 'cantor', no: 'No. 32', req: ['lyra_met'], note: 'You have met Lyra',
      head: 'THE CANTOR IS HONOURED',
      items: [
        'The Cantor of Oakhaven has been identified as Source for the purposes of Stage Nine. This is an honour. It has not been made optional.',
        'Movements through the North Gate after dusk are under review. The gate has always been shut at dusk. It will continue to have always been shut.',
        'An engineer of the Consortium is recorded as absent from the district. Absence of long standing is not a disappearance.'],
      notice: 'Messages between the Cantor and parties beyond the Hedge may be left at the Chapel, where they will be held.' },
    { id: 'arrival', no: 'No. 31', note: 'The default front page: before you have met anyone',
      head: 'THE PURE NOTE IS TO BE HELD OVER OAKHAVEN',
      items: [
        'The Choir-Church announces that the Pure Note will be held over Oakhaven on Hearthday. Attendance is anticipated and will be noted. Humming beneath the Note is not attendance.',
        'The Consortium of Bores thanks the district for its patience during the preparation of Stage Nine. Bread will continue.',
        'An inspection of children\'s hands and feet is scheduled for Rootday week at the Greenhall. Chalk will be applied where indicated. Applied chalk is not an accusation.'],
      notice: 'Bells are not to be rung. The district has no bells. Reports of ringing are to be treated as weather.' },
  ];
  // "Local matters": the Office's spin on what the player has done to the law. One at most.
  const LOCAL = [
    { id: 'jailbreak', test: (c) => c.crime.escapes > 0, note: 'You escaped from the watch-house',
      t: 'A guest of the watch-house has concluded their stay ahead of schedule. This is a scheduling matter. The cell has been re-graded as available.' },
    { id: 'wanted', test: (c) => c.crime.bounty >= 40, note: 'Your Oakhaven bounty is 40 or more',
      t: 'A traveller is invited to attend the watch-house for questioning. The invitation carries a sum. The sum is not a reward. It is an expression of interest.' },
    { id: 'body', test: (c) => c.body, note: 'A patrol found a body you left',
      t: 'A resident has been found in a place other than the place to which they were assigned. They have been reconciled to that place.' },
    { id: 'disguise', test: (c) => c.exposed, note: 'You were spotted in a Synod clerk\'s robe',
      t: 'The wearing of clerk\'s grey by persons not on the roster has been noted. A wardrobe audit is under way. Nobody has been accused of anything. The robes are being counted.' },
    { id: 'petty', test: (c) => c.crime.thefts > 0 || c.crime.assaults > 0 || c.crime.bounty > 0, note: 'You have a theft, an assault or any bounty on record',
      t: 'Several purses have been described as lighter, and a civilian as having been struck. The words described as apply to both.' },
  ];
  // The free press, smuggled in under the Office sheet. Only when you have heard the crates yourself.
  // [PROPOSED] the paper's name; Cosimo Pell and Broadsheet Row are from the lore brief.
  const PELL = {
    req: ['crates_heard'], note: 'You heard the names in Hetty\'s crates',
    head: 'FOUND FOLDED BEHIND THE NOTICE, IN A DIFFERENT HAND',
    paper: 'THE CANTABILE CANDOUR · Broadsheet Row, Port Cantabile',
    t: 'The Office advises that a skyship out of the Rust Coast carries replacement garrison components. We have a question about the word components, and a second question about the word replacement. Cosimo Pell, proprietor, who cannot be reached for comment because he is standing right here.',
  };
  const flagsOk = (s, c) => (!s.req || s.req.every((k) => c.has(k))) && (!s.any || s.any.some((k) => c.has(k))) && (!s.not || !s.not.some((k) => c.has(k)));
  function issueFor(c) { return ISSUES.find((s) => flagsOk(s, c)); }
  function localFor(c) { return c.lawOn ? LOCAL.find((l) => l.test(c)) || null : null; }
  const DAYNAMES = (typeof DAYS !== 'undefined' && Array.isArray(DAYS)) ? DAYS : ['Nullday', 'Rootday', 'Hearthday', 'Massday', 'Stasisday', 'Dawnday', 'Driftday', 'Memoryday'];
  // Everything below is built from the constant tables. No save text is interpolated.
  function issueHtml(over) {
    const c = context(over), s = issueFor(c), loc = localFor(c);
    const items = s.items.filter((it) => typeof it === 'string' || flagsOk(it, c)).map((it) => typeof it === 'string' ? it : it.t);
    const day = DAYNAMES[((c.day % 8) + 8) % 8];
    let h = '<div class="rm-sheet">'
      + '<div class="rm-mast">The Synod Gazette</div>'
      + '<div class="rm-sub">Oakhaven District Desk · Printed under the Pure Note · ' + day + ', 419 · ' + s.no + '</div>'
      + '<h3 class="rm-head">' + s.head + '</h3>'
      + items.map((t) => '<div class="rm-item">' + t + '</div>').join('');
    if (loc) h += '<div class="rm-item rm-local"><b>Local matters.</b> ' + loc.t + '</div>';
    h += '<div class="rm-notice"><b>Notice.</b> ' + s.notice + '</div>';
    if (flagsOk(PELL, c)) h += '<div class="rm-pell"><div class="rm-pellhead">' + PELL.head + '</div><div class="rm-paper">' + PELL.paper + '</div><div>' + PELL.t + '</div></div>';
    return h + '</div>';
  }

  const TITLE = 'The Synod Gazette';
  if (typeof READING !== 'undefined' && READING && READING.SOURCES) READING.SOURCES[TITLE] = { style: 'office', kind: 'Broadsheet' };

  const CSS = `
.rm-sheet { font-size: 1em; line-height: 1.5; }
.rm-mast { font-family: var(--font-blackletter, var(--font-display, serif)), 'Cinzel', Georgia, serif; font-size: 1.7em; line-height: 1.1; text-align: center; letter-spacing: .02em; }
.rm-sub { text-align: center; font-size: .62em; letter-spacing: .08em; text-transform: uppercase; border-top: 1px solid currentColor; border-bottom: 1px solid currentColor; padding: .25em 0; margin: .3em 0 .7em; }
.hd-body .rm-head, #event .hd-body h3.rm-head { font-family: var(--font-display, 'Cinzel', Georgia, serif); font-size: 1.2em; line-height: 1.2; margin: .2em 0 .5em; letter-spacing: .03em; text-transform: none; border: 0; padding: 0; color: var(--hd-ink, inherit); }
.rm-item { margin: 0 0 .55em; }
.rm-local { border-left: .25em solid #7c8386; padding-left: .6em; }
.rm-notice { margin: .8em 0 .5em; padding: .45em .7em; border: 2px double currentColor; font-size: .92em; break-inside: avoid; }
.rm-pell { margin-top: 1em; padding: .5em .7em; background: rgba(90,60,30,.14); border: 1px dashed #5a3c1e; font-style: italic; break-inside: avoid; }
.rm-pellhead { font-size: .62em; letter-spacing: .12em; text-transform: uppercase; font-style: normal; font-weight: 700; }
.rm-paper { font-family: var(--font-sc, 'Alegreya SC', Georgia, serif); font-style: normal; font-weight: 700; margin: .15em 0 .35em; }
@media (max-height: 460px) { .rm-mast { display: none; } .rm-sub { margin-top: 0; } }
`;
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('rumours-style')) return;
    const st = document.createElement('style'); st.id = 'rumours-style'; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function readGazette() {
    injectStyle();
    showEvent(TITLE, issueHtml(), [{ t: 'Put it back.', f: null }]);
  }

  // ------------------------------------------------------------ the notice boards
  // Transient, non-solid decos (never saved; anim.js sweeps them on a map change so loadMap puts them back,
  // exactly as scenery.js does). Procedural stand-in: they use the existing 'sign' sprite.
  const SPOTS = {
    oakhaven: [[31.0, 10.7, 'Greenhall'], [46.8, 10.7, 'Chapel']],
    tavern: [[12.5, 10.3, 'Boar']],
  };
  function spotFree(m, x, y) {
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 1 || cy < 1 || cx >= m.w - 1 || cy >= m.h - 1) return false;
    if (m.get(cx, cy) || m.isBlocked(cx, cy)) return false;
    for (const e of m.entities) {
      if (e.transient || e.hidden) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < 0.9 && (e.solid !== false || e.kind === 'npc' || e.kind === 'item')) return false;
    }
    return true;
  }
  function placeFor(m, tx, ty) {
    for (let r = 0; r <= 2.5; r += 0.5) for (let k = 0; k < (r === 0 ? 1 : 12); k++) {
      const a = k / 12 * Math.PI * 2, x = +(tx + Math.cos(a) * r).toFixed(2), y = +(ty + Math.sin(a) * r).toFixed(2);
      if (spotFree(m, x, y)) return [x, y];
    }
    return null;
  }
  // the authored map sizes: a test fixture that reuses a map id (visual.test.js builds a 32x24 "oakhaven") gets no boards
  const SIZES = { oakhaven: [70, 64], tavern: [17, 12] };
  function makeBoards(m, id) {
    const out = [];
    if (!SIZES[id] || m.w !== SIZES[id][0] || m.h !== SIZES[id][1]) return out;
    for (const [tx, ty, where] of SPOTS[id] || []) {
      const at = placeFor(m, tx, ty); if (!at) continue;
      out.push({ kind: 'deco', sprite: 'sign', x: at[0], y: at[1], scale: 0.85, solid: false, radius: 0.2, use: 'synod_gazette', transient: true, _decor: true, _rmBoard: where,
        label: 'The Synod Gazette, pinned to the notice board — read the front page' });
    }
    return out;
  }
  function boardsOf(m) { return (m && m._rmBoards) || []; }
  // Put this map's boards in (or take them out when the switch is off). Cheap; safe to call often.
  function sync(m, id) {
    if (!m || !Array.isArray(m.entities)) return;
    const want = enabled();
    if (want && !m._rmBoards) m._rmBoards = makeBoards(m, id || (typeof G !== 'undefined' ? G.mapId : ''));
    const mine = new Set(boardsOf(m));
    if (!mine.size) return;
    if (!want) { for (let i = m.entities.length - 1; i >= 0; i--) if (mine.has(m.entities[i])) m.entities.splice(i, 1); return; }
    const have = new Set(m.entities);
    for (const b of mine) if (!have.has(b)) m.entities.push(b);
  }
  function syncCurrent() { if (typeof G !== 'undefined' && G.map && G.mapId) sync(G.map, G.mapId); }

  // ------------------------------------------------------------ the "Any news?" button
  const isNewsNpc = (n) => !!n && (n === NPCS.hetty || n.rumour === true);
  function asks(n) { return n === NPCS.hetty ? 'hetty' : 'patron'; }
  function addNewsButton() {
    if (!enabled() || typeof DLG === 'undefined' || !isNewsNpc(DLG.npc)) return;
    const btns = document.querySelector('#modal-panel .dlg .btns'); if (!btns || btns.querySelector('#d-news')) return;
    const b = document.createElement('button');
    b.className = 'dfbtn small'; b.id = 'd-news'; b.type = 'button'; b.textContent = 'Any news?';
    const bye = btns.querySelector('#d-bye');
    btns.insertBefore(b, bye || null);
    b.onclick = () => {
      if (!enabled() || !isNewsNpc(DLG.npc)) return;
      const out = next(asks(DLG.npc));
      DLG.log.push({ who: 'you', t: 'Any news?' });
      DLG.log.push({ who: 'them', t: out ? out.text : 'Nothing worth the breath.' });
      try { Audio_.sfx.ui(); } catch (e) { /* no audio */ }
      renderDialogue(null);
    };
  }

  // ------------------------------------------------------------ hooks
  if (typeof renderDialogue === 'function') {
    const _rd = renderDialogue;
    renderDialogue = function () {
      const r = _rd.apply(this, arguments);
      try { addNewsButton(); } catch (e) { console.warn('rumours: news button failed', e); }
      return r;
    };
  }
  if (typeof useDeco === 'function') {
    const _use = useDeco;
    useDeco = function (e) {
      if (e && e._rmBoard && enabled()) { try { readGazette(); return; } catch (err) { console.warn('rumours: gazette failed', err); } }
      return _use.apply(this, arguments);
    };
  }
  if (typeof loadMap === 'function') {
    const _load = loadMap;
    loadMap = function () { const r = _load.apply(this, arguments); try { syncCurrent(); } catch (e) { /* never break a load */ } return r; };
  }
  // The patrol that finds a body only remembers it on the transient corpse; keep a flag so the
  // tavern and the Gazette can speak of it after the corpse is gone.
  let bodyT = 0;
  if (typeof tickBodies === 'function') {
    const _tb = tickBodies;
    tickBodies = function (dt) {
      const r = _tb.apply(this, arguments);
      try {
        if (enabled() && G.flags && !G.flags.p6r_body && (bodyT += dt) > 0.5) {
          bodyT = 0;
          if (G.ents.some((e) => e && e.corpse && e.bodyFound)) G.flags.p6r_body = true;
        }
      } catch (e) { /* never break a tick */ }
      return r;
    };
  }
  if (typeof update === 'function') {
    const _upd = update; let was = enabled();
    update = function () {
      if (was !== enabled()) { was = enabled(); try { syncCurrent(); } catch (e) { /* ignore */ } }
      return _upd.apply(this, arguments);
    };
  }

  return { RUMOURS: R, ISSUES, LOCAL, PELL, SPOTS, TITLE, context, eligible, choose, next, textOf, issueFor, localFor, issueHtml, readGazette, sync, syncCurrent, boardsOf, makeBoards, enabled, addNewsButton, isNewsNpc };
})();
