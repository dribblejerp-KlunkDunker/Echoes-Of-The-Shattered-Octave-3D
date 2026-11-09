// ============================================================
//  PART THREE — THE FORGETTING
//  Whisper-Grove, the Cloister of the Lost Choir, and the Malting.
// ============================================================
'use strict';

// ---------------------------------------------------------------- the passage
function startPart3() {
  const f = G.flags, p = G.player;
  hide('#ending'); hide('#death'); closeModal();
  f.part3 = true;
  G.day += 3; G.tod = 0.74; G.escapeTimer = 0; G.boreHold = 0; G.dead = false; G.noise = 2;
  p.hp = p.hpMax; p.voice = p.voiceMax; p.fat = p.fatMax;
  loadMap('whispergrove');
  const L = [];
  const played = typeof ASH50 !== 'undefined' && ASH50.played();   // the night aboard was played (js/ash50.js): do not tell it again
  if (!played) L.push('Twenty-one survivors and no room. Lyra has no voice at all. She writes on a slate, and turns it to Kaelen: <b>YOU SAID DO IT.</b> Through the glass he can still hear the Root singing with a hole in it, still holding, and he files the thought.');
  // Hob Wendle roots into the deck (Book One ch. 13)
  if (!played) L.push('At the fourth hour the foredeck goes green. Hob Wendle, field-hand, forty, three toes short, is sitting against the deckhouse with a blanket over his knees, perfectly awake, and what is left of his feet has gone down into the good dry oak of Vane\'s deck. "I kept \'em dry," he says. "Like she told me." And then: "I\'m sorry about your ship, Captain." Lyra has nothing to hum with; she holds his hand. Old Bettany gives him the long drops and hums the tending note over him, badly, in the Narrow, for as long as it takes. They put him over the side with four planks and five feet of beam, because there is nothing else to be done with a thing that would grow wherever it was put down. Vane says the words.');
  if (!G.ledger.some((r) => r && r.name === 'Hob Wendle')) G.ledger.push({ name: 'Hob Wendle', where: 'the Kestrel\'s deck', day: G.day });
  if (!played) L.push(f.vane_told ? 'In the hold Captain Vane gives his confession, because you made him hear what was in it: thirteen hundred crates in two years, and a file at the Office that calls him reliable.' : 'Captain Vane will not go down into his own hold. On the second night Kaelen makes him say the number aloud, and he does, and then he goes up and changes course.');
  L.push(f.sable_met ? 'He sets the course for Whisper-Grove, because his crates were consigned there, and because a runaway of the Veil in the mist outside the Hedge said her order\'s last archivist is still in the drowned city, reading names to the Hollows.' : 'He sets the course for Whisper-Grove, because his crates were consigned there, and because the Reach says a Veil scribe in the drowned city can read a Hollow its name.');
  if (played) L.push(ASH50.TX.part3);
  else if (G.has('charts')) L.push('Kaelen reads Tobiah\'s charts by the binnacle lamp, and the margin of Revision Seven twice. That night he starts a list of names on a deck-beam, and understands that everyone who ever kept one before him was the Catalogue.');
  else L.push('That night Kaelen starts a list of names on a deck-beam, and understands that everyone who ever kept one before him was the Catalogue.');
  L.push('On the third day the Spectral Woods come up out of the mist: silver willows, phosphorescent pools, lilac air. Under them is a marble city that never fell down, sunk a foot under its own lit water. Whisper-Grove, at dusk. The Kestrel holds at mast-height over the south landing and lets down a hundred feet of ladder.');
  showEvent('Part Three — The Forgetting', L.join('<br><br>'), [{ t: 'Climb down into the water.', f: () => {
    journal('main', 'Part Three: The Forgetting. The Kestrel has put down over Whisper-Grove, the drowned capital of the Spectral Woods, where seventy-four thousand people forgot themselves in one night in 416. Find the Veil scribe: she will be in the Sunken Court, north up the causeway, where the names are thickest.');
    msg('A foot of warm, lit water. The Hollows walk their loops through it, and do not look up.', 'voice', 7000);
  } }]);
}

// ---------------------------------------------------------------- per-frame: the fight in the Sunken Court
function wgTick(dt) {
  const f = G.flags; if (G.mapId !== 'whispergrove' || !f.wg_ambush || f.wg_ambush_over) return;
  f.wg_ambush_t = (f.wg_ambush_t || 0) - dt;
  const amb = G.ents.filter(e => e.ambush);
  // Sable stops a proctor dead by reading him his own surrendered name
  if (!f.wg_sable_read && f.wg_ambush_t < 31) {
    const t = amb.find(e => !e.dead && !e.hidden);
    if (t) { f.wg_sable_read = true; t.name = 'Emory Wain'; killEnemy(t, false); msg('Sable is on her hands and knees in the water with blood coming out of her nose, and the Ledger hangs open above her, and she reads: "Emory Wain. Twenty-six. Of Cooper\'s Rise in the Iron Peaks. Your mother was Hanne. You had a sister called Ivy." The proctor stops, an absolute hitch in a machine, like a man who has walked into a door.', 'voice', 9000); }
  }
  // Halder Wick walks his loop straight through the middle of it
  if (!f.halder_dead && f.wg_ambush_t <= 0) {
    f.halder_dead = true;
    for (const e of G.ents) if (e.id === 'halder') e.hidden = true;
    msg('Halder Wick walks his loop through the middle of the fight with a plate in each hand, and a felted rod meant for you takes him across the temple. He goes down in the lit water without a sound, still holding the blue plate.', 'bad', 9000);
    journal('side', 'Halder Wick was killed in the Sunken Court, walking his loop through the middle of the proctors\' attack. He was setting a table for four. I was not quick enough.');
  }
  if (amb.length && amb.every(e => e.dead)) {
    f.wg_ambush_over = true; questXp(30);
    if (!f.halder_dead) { f.halder_safe = true; msg('The last proctor goes down in the water. Behind you, untouched, Halder Wick sets the blue plate down at his table, lifts it, and sets it again.', 'good', 7000); }
    journal('main', 'The Office came out of the mist in the Sunken Court: grey oilcloth, silver mesh, hand-presses tuned to 741. Sable read one of them his own surrendered name, and he stopped like a clock. A fourth got away north with the Kestrel\'s registry. I should talk to her again.');
  }
}

// ---------------------------------------------------------------- triggers
function wgTrigger1(t) {
  const f = G.flags, c = Engine.cam;
  if (t.id === 'wg_ambush') {
    if (!t.done) {
      t.done = true; f.wg_ambush = true; f.wg_ambush_t = 40;
      for (const e of G.ents) if (e.ambush && !e.dead) { e.hidden = false; e.state = 'chase'; e.alertT = 8; }
      Audio_.sfx.press(); addNoise(2);
      msg('Out of the mist: grey oilcloth, silver mesh, felted rods. The Office of the Catalogue has come for the scribe, and now for you.', 'bad', 7000);
      setTimeout(() => { if (!f.halder_dead && !f.wg_ambush_over) msg('Halder Wick has started his loop, straight through the middle of it, with a plate in each hand. Be quick.', 'warn', 7000); }, 3500);
    }
    return true;
  }
  if (t.id === 'wearer_porch') {
    if (f.aegis_done && !f.wearer_porch) porchVoice();
    return true;
  }
  if (t.id === 'aegis_wake') { if (!f.aegis_awake && !f.aegis_done) aegisWake(); return true; }
  if (t.id === 'chorister_floor') {
    if (!t.done) { t.done = true; msg('Under the floor, very far down, something is reciting a list. Names. It reaches the bottom of a page and starts the page again. The Chorister of Memory, beneath the Office\'s archive, trying to finish.', 'voice', 9000); }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- Voice at the Door (Book One ch. 20)
// The Wearer is never fought here. It stands in the fog past the porch and talks, in every voice it has learned, and
// then sings; the Aegis inside cannot hold DEFEND THE SINGERS against a singer in the fog unless somebody holds the door.
function porchVoice() {
  const f = G.flags, p = G.player, first = p.name.split(' ')[0];
  f.wearer_porch = true; Audio_.sfx.voice();
  const spawnPack = () => { for (let i = 0; i < 3; i++) spawnHound(); };
  const finish = () => {
    f.porch_survived = true; questXp(60);
    journal('main', 'Voice at the Door: at the Cloister porch the thing that wore Tobin Ashgrove stood in the fog and would not come in. It gave me Kaelen\'s whole confession in his own voice: the calibration, line ninety-four, the girl on the ninth morning, the three seconds. It cannot read. It only knows what was said aloud in its hearing.' + (f.porch_held ? ' I held the doorway against the Aegis while it sang Hymn 9 in Lyra\'s voice.' : f.porch_aside ? ' I stepped aside, and the Aegis went out into the fog after a singer that was not there.' : '') + ' Lyra should know. So should Kaelen.');
    setTimeout(() => msg('As you go down the Cloister road the fog on your left says, in Kaelen\'s voice, so quietly you are nearly sure nobody else could have heard it: "Ask him, lark. He\'ll tell you. He\'s been waiting seven years for somebody to make him."', 'voice', 9000), 2500);
    if (f.porch_answered) setTimeout(spawnPack, 1500);
  };
  const step4 = () => {
    showEvent('Seven times', 'It sings the hymn seven times.<br><br>Then it sings "Apples in the Rain", off-key on the fourth bar, in Tobin Ashgrove\'s voice. Then the harvest home, all the lines, in Davin Hale\'s. Then it does the thing nothing could have braced you for: the sound of a seven-year-old boy whistling a falling fifth, badly, with too much air in it, the way Pim did it on his own doorstep in the sunshine.' + (f.porch_answered ? `<br><br>Then, last, it says "${first}" in your own voice, from about the height of your shoulder, and laughs, warmly.` : '') + '<br><br>You do not make a sound. You do not move. And after a long time there is nothing in the fog but fog.', [
      { t: 'Breathe.', f: finish },
    ]);
  };
  const hold = () => { f.porch_held = true; questXp(40); showEvent('The doorway', 'You put yourself in the doorway with your back to the thing that wants you and your arms out wide across the frame.<br><br>The Aegis stops. It stops with its leading foot eighteen inches from you and its head bowed under the lintel, and you watch a machine try to hold two instructions at once. The chest louvres lift an inch and close. The tick in its chest goes very fast, and settles. The lilac light moves from your face to the fog and back to your face.<br><br><i>"Hold us in the little light,"</i> sings the fog, <i>"until the morning comes."</i><br><br>You keep your arms across the door.', [{ t: 'Keep them there.', f: step4 }]); };
  const aside = () => { f.porch_aside = true; showEvent('The orchard', 'You step out of its way. Nine feet of bronze goes past you into the fog at a walk, DEFEND THE SINGERS, toward a singer that is forty feet off and then sixty and then nowhere, and the hymn stops at once, because it will not come where people are.<br><br>The Aegis stands in the orchard for a long time, facing nothing, with its chest open. When it comes back in it does not look at you, and it goes down on one knee by the risers and does not get up.', [{ t: 'Wait for it.', f: step4 }]); };
  const step3 = () => {
    const ch = [];
    if (f.aegis_calmed) { ch.push({ t: 'Stand in the doorway, arms across the frame, between the Aegis and the fog.', f: hold }); ch.push({ t: 'Step aside, and let it go to the singer.', f: aside }); }
    else ch.push({ t: 'Stand in the doorway and do not answer.', f: () => { f.porch_held = true; step4(); } });
    showEvent('Hold us in the little light', '<i>"Hold us in the little light,"</i> it sings.<br><br>In Lyra\'s voice. The Cloister\'s hymn, from out in the fog, forty feet off: HYMN 9, off the board by the risers, played back perfectly in Lyra Ashgrove\'s whole unbroken voice by something that heard it once.' + (f.aegis_calmed ? '<br><br>Behind you, inside, the Aegis comes off its mark by the risers. Nine feet of bronze, the floorboards flexing under it, DEFEND THE SINGERS stencilled across its chest, and a singer outside in the fog.' : '<br><br>Behind you the empty risers wait, eleven places, for a choir that is not coming.'), ch);
  };
  const slate = () => { f.porch_slate = true; showEvent('IS IT TRUE?', 'You take a child\'s slate off the end of the risers and write it in letters six inches high, and carry it to the door, and hold it up into the fog with both hands.<br><br><b>IS IT TRUE?</b><br><br>The fog says nothing. You shove it out past the door-frame into the white, into the air where the voice is.<br><br><i>"Lark,"</i> it says, gently, <i>"I can\'t read."</i><br><br><i>"I only know what people say out loud. That\'s all there\'s ever been. Your da said your name out loud in a yard in the spring; the old fellow sang in a meadow; your engineer talks to an empty room every night of the world. So say it out loud. Ask me anything you like, and I\'ll tell you. Nobody\'s listening but me."</i>', [
    { t: 'Say nothing.', f: step3 },
    { t: `Answer it. "Is it true?"`, f: () => { f.porch_answered = true; addNoise(4); showEvent('Learned', `<i>"Is it true,"</i> it says back, in your voice, exactly, the way you said it, and then your name, <i>"${first}"</i>, warmly, the way someone says a name they mean to keep.<br><br>Something has learned you. Out in the orchard, three jitters lift their heads.`, [{ t: 'Hold the door.', f: step3 }]); } },
  ]); };
  const step2 = () => {
    showEvent('"Lyra."', '<i>"Lyra, I need to tell you something and I\'m not going to be able to say it to your face."</i><br><br>Kaelen\'s voice. Not an approximation. It has had years with him: a man who talks to an empty room because nobody hears.<br><br><i>"I calibrated the bore at the Dawning Spire. I signed for the collars. Line ninety-four. Forty collars, forty spools of wire, forty needles, between the lamp oil and the scaffold clips, and I didn\'t read it. On the ninth morning the girl on the top tier was bleeding into her collar, and she looked at me, and I went back up the gantry. Three seconds. At the end it asked a question, and I had about six seconds, and I used three of them being sure. That\'s what happened to the sky, lark. That\'s why it\'s grey. That\'s me."</i><br><br>It is talking to someone who is not here. It cannot tell. Everything it says, it says because somebody said it out loud, alone, where it could hear.', [
      { t: 'Hold up a child\'s slate from the risers: IS IT TRUE?', f: slate },
      { t: 'Say nothing. Never answer a voice you cannot see.', f: step3 },
      { t: 'Answer it.', f: () => { f.porch_answered = true; addNoise(4); showEvent('Learned', `It stops talking at once, and listens, with an attention you can feel on your skin like a hand. Then it says your name, <i>"${first}"</i>, in your own voice, warmly, the way someone says a name they mean to keep.<br><br>Something has learned you. Out in the orchard, three jitters lift their heads.`, [{ t: 'Hold the door.', f: step3 }]); } },
    ]);
  };
  showEvent('"Lark."', 'The porch door stands open on a wall of fog. There is nothing in the doorway. The jitter is out past it somewhere, in the white, shifting.<br><br><i>"Lark,"</i> says the fog. <i>"I know you\'re in there. I can hear you breathing."</i><br><br>Tobin Ashgrove\'s voice: warm, a little hoarse, patient. It is calling someone who is not here.<br><br><i>"Your friend in the hat was very kind to me,"</i> it says, in Old Tam\'s cracked tenor, companionably. <i>"Walked right out into the meadow for you, he did. Didn\'t make the high note."</i>' + (f.hedge_answered ? `<br><br>Then, in your own voice, from the Hedge at the dead hour: <i>"I\'m here."</i>` : ''), [
    { t: 'Do not turn. Do not answer.', f: step2 },
  ]);
}

// ---------------------------------------------------------------- the Aegis Sentinel
function aegisWake() {
  const f = G.flags; f.aegis_awake = true;
  for (const e of G.ents) {
    if (e.kind === 'deco' && e.sprite === 'aegis') e.hidden = true;
    if (e.kind === 'enemy' && e.type === 'aegis' && !e.dead) { e.hidden = false; e.state = 'chase'; e.alertT = 8; }
  }
  Audio_.sfx.press();
  msg('The Aegis stands up out of its alcove. Nine feet. DEFEND THE SINGERS, stencilled. Its torso-plates part, and something inside it begins to hum a chord.', 'bad', 8000);
  setTimeout(() => msg(f.sable_joined ? 'From the doorway, very quietly, Sable says: "The board. Look at the board."' : f.hymn_read ? 'HYMN 9. You read it on the board by the risers on your way in, and you have not forgotten it.' : 'Behind it, on the board by the risers, someone chalked HYMN 9 three years ago and nobody ever rubbed it out.', 'voice', 7000), 3200);
  if (!f.aegis_journal) { f.aegis_journal = true; journal('main', 'The Aegis Sentinel of the Cloister stood up out of its alcove: DEFEND THE SINGERS. It is iron and bell-bronze; blades do little. The hymn board behind the risers still reads HYMN 9.'); }
}
function chordBlast(e) {
  const c = Engine.cam, a = Math.atan2(c.y - e.y, c.x - e.x);
  for (const k of [1.3, 0.9, 0.5]) { const nx = c.x + Math.cos(a) * k, ny = c.y + Math.sin(a) * k; if (!solidAt(nx, ny) && !solidAt(nx + 0.2, ny) && !solidAt(nx, ny + 0.2)) { c.x = nx; c.y = ny; break; } }
  G.hurtT = 0.5; addNoise(1.5); Audio_.sfx.press();
  if (G.player.glassed) { G.glassLock = 4; msg('Its torso opens and a bronze chord puts you on the floor. Your glass arm catches the chord and locks rigid, ringing.', 'bad', 4000); }
  else msg('Its torso opens and a bronze chord puts you on the floor.', 'bad', 3000);
}
function aegisCalm(how) {
  const f = G.flags; f.aegis_calmed = true; f.aegis_done = true; f.aegis_how = how;
  for (const e of G.ents) {
    if (e.kind === 'enemy' && e.type === 'aegis') { e.hidden = true; e.state = 'passive'; e.solid = false; }
    if (e.id === 'aegis_wg') e.hidden = false;
  }
  [587, 659, 698, 784, 698, 659, 587].forEach((hz, i) => setTimeout(() => Audio_.sfx.song(hz, 0.5), i * 420));
  questXp(100);
  const how_t = how === 'sable' ? 'You point at the board. Sable, who stood in that doorway counting children while they sang it, has to sing Hymn 9, and she does, in a thin dry voice that has not sung in three years.' : 'You sing Hymn 9 off the board, badly, all four lines, in a voice that carries.';
  msg(how_t + ' The Aegis stops. It kneels. Out of its open chest comes the alto line.', 'good', 10000);
  journal('main', (how === 'sable' ? 'Sable sang Hymn 9 off the board' : 'I sang Hymn 9 off the board') + ', and the Aegis Sentinel knelt by the empty risers and chimed the alto line. Now: the Malting, the Office\'s harvest-house on the Cloister road, north-east of the Cloister. Take a press.');
  if (how === 'you') addNoise(3);
}
function aegisDestroyed(e) {
  const f = G.flags; f.aegis_destroyed = true; f.aegis_done = true;
  G.ledger.push({ name: 'WG-41,005, a boy of the Cloister choir', where: G.map.name, day: G.day });
  for (const o of G.ents) if (o.item === 'redcloak' && !o.dead) o.hidden = false;
  setTimeout(() => msg('As the bronze goes still a boy\'s voice inside it says a number, three times: "Forty-one thousand and five." Then nothing. Its hand has fallen from the eleventh peg.', 'voice', 9000), 1500);
  journal('main', 'I destroyed the Aegis Sentinel. Inside it a boy said his intake number three times. The Malting, the Office\'s harvest-house, is on the Cloister road, north-east of the Cloister. Take a press.');
}

// ---------------------------------------------------------------- things you can use
const POOLS = [
  'A woman\'s hands kneading dough in a kitchen with a blue door. She is humming. There is flour on a small child\'s nose, and she leans down and blows it off. You do not know her. For the length of a breath you miss her more than anyone you have ever lost.',
  'A man on the steps of this court, in the year 416, waiting for someone who is late, checking a pocket-watch. Then a single long note, everywhere at once. He forgets what he was waiting for. He goes on waiting. He is waiting still; you passed him on the way in.',
  'A boy in a grey choir cloak, singing Hymn 9 off the board and looking sideways at the girl in red beside him, who has the alto line and is getting it wrong on purpose to make him laugh. In the doorway a young woman in a Veil coat is counting them. Eleven.',
];
const POOL_SABLE = 'A small cracked bell, rung at the hour before matins over fourteen desks, and the scratch of forty nibs stopping to listen to it. It is not your memory. It is not anyone\'s any longer. It is floating here because a runaway of the Veil, in the mist outside Oakhaven\'s Hedge, paid it out of herself to give a pump-man his name.';
const POOL_QUIST = 'Rows of desks under a high window. A girl of fourteen in a Veil coat, ruling a page, and a tall clerk standing over her: "Again. Straighter. A crooked line is a lie about the next one." She does it again. It is very straight.';
function wgUse1(e) {
  const f = G.flags, p = G.player;
  if (e.use === 'fountain') { msg(f.sable_joined ? 'The fountain of the Sunken Court, brimming with lit water. Sable read twenty names a night here, for nobody.' : 'The fountain of the Sunken Court, brimming with lit water. Somebody has worn a seat in its rim.', '', 5000); return true; }
  if (e.use === 'pool') {
    const i = e.pool, txt = i === 3 ? (f.sable_returned ? POOL_SABLE : POOL_QUIST) : POOLS[i];
    f['pool_' + i] = true;
    showEvent('A reflecting pool', 'You lean over the water. The light in it moves, and is not your face.<br><br>' + txt, [{ t: 'Step back from the water.', f: () => {
      if (!f.pools_all && [0, 1, 2, 3].every(k => f['pool_' + k])) { f.pools_all = true; questXp(40); journal('side', 'I have looked into all four reflecting pools of the Sunken Court and carried four strangers\' memories out of them' + (f.sable_returned ? '. One of them, I am nearly sure, was Sable\'s.' : '.')); msg('Four strangers\' memories. You will carry them now, since nobody else can.', 'good', 5000); }
    } }]);
    return true;
  }
  if (e.use === 'hymn') {
    if (f.aegis_done) { msg(f.aegis_calmed ? 'HYMN 9. When you touch the board the Aegis chimes the alto line, softly, from the risers.' : 'HYMN 9, still chalked. Nobody will sing it here again.', '', 5000); return true; }
    if (!f.aegis_awake) { f.hymn_read = true; msg('HYMN 9, chalked on the board in a grown-up hand, with a child\'s careful 9 underneath. Nobody has rubbed it out in three years.', '', 6000); return true; }
    const ch = [];
    if (f.sable_joined) ch.push({ t: 'Point at the board. Make Sable sing it.', f: () => aegisCalm('sable') });
    if (p.voice >= 10) ch.push({ t: 'Sing Hymn 9 yourself, off the board. (10 voice; it will carry)', f: () => { p.voice -= 10; aegisCalm('you'); } });
    else ch.push({ t: 'Try to sing it.', f: () => msg('You open your mouth and nothing comes but breath. Your voice is spent. The bronze chord comes instead.', 'bad', 5000) });
    ch.push({ t: 'Not now.', f: null });
    showEvent('HYMN 9', 'The Aegis is between you and the risers with its chest-plates open and a chord building in it. The board is still chalked HYMN 9: four lines, a children\'s tune, the one they were singing when the Anchor went quiet. Something like that does not forget the last thing it was told to guard. It might remember what it was guarding them <i>for</i>.', ch);
    return true;
  }
  if (e.use === 'cloaks') {
    if (!f.cloak_names) {
      f.cloak_names = true; CLOISTER_NAMES.forEach(n => G.ledger.push({ name: n, where: 'the Cloister of the Lost Choir', day: G.day })); questXp(40);
      showEvent('Ten small cloaks', 'You take the cloaks down off the pegs one at a time. Undyed grey wool, a child\'s size, and in the collars name-tapes stitched in red thread by somebody\'s mother: <i>' + CLOISTER_NAMES.join(', ') + '.</i> Nine names. The tenth collar has only the holes where its tape was. Ten cloaks, eleven pegs: the red one, on the peg nearest the alcove, has no tape. There is one shoe on the floor, and you leave it where it is.', [{ t: 'Write the nine names in your ledger.', f: () => { msg('Nine names, in the ledger. The empty collar and the eleventh peg, you leave.', 'good', 4000); journal('side', 'I took the name-tapes from the choir cloaks in the Cloister of the Lost Choir and wrote them in my ledger: nine names, and a tenth collar with only the holes where its tape had been. Eleven pegs; the red cloak has no name in it.'); } }]);
    } else msg('Eleven pegs, ten empty collars, one shoe on the floor.', '', 4000);
    return true;
  }
  if (e.use === 'reg_sign') { showEvent('WELCOME TO RELIEF', 'A printed pamphlet, in a very straight hand someone has had set in type: <i>You have walked a long way. Sit down; the bench is clean. There is water in the butt and a cup on the chain. A clerk will call your name. When he does, give him your coat at the door — you will not need it where you are going — and he will ask you three short questions. Most people find it a great relief.</i><br><br>At the bottom, very small: <i>Prepared for the Office by S., Veil Archives, 415.</i>', [{ t: 'Put it back on its pin.', f: null }]); return true; }
  if (e.use === 'press') { wgPress(e); return true; }
  if (e.use === 'wg_ladder') { wgLadder(); return true; }
  return false;
}
function wgPress(e) {
  const f = G.flags;
  if (G.ents.some(o => o.kind === 'enemy' && o.room === 'press' && !o.dead)) { msg('Two proctors stand between you and the press, felted rods up. They are not going to let you look at it.', 'warn', 4500); return; }
  showEvent('An Office hand-press', 'Forty pounds of iron and brass on a bolted bench: a screw-wheel, a felted die, a dial that reads in Hertz with the needle parked at 741. A pad on the bench is worn to the shape of the back of a head. Ninety seconds. Three questions. Eight seconds of seven forty-one.', [
    { t: 'Unbolt it and take it.', f: () => {
      f.press_taken = true; G.give('press741'); e.hidden = true; questXp(80); Audio_.sfx.pickup();
      journal('main', 'I have an Office hand-press, tuned to 741, out of the Malting. Now back to the Kestrel\'s mast-ladder at the south landing of Whisper-Grove.');
      f.malting_alarm = true;
      for (const o of G.ents) if (o.requires === 'malting_alarm' && !o.dead) { o.hidden = false; o.state = 'chase'; o.alertT = 8; }
      msg('You get the press off its bolts and onto your back. Somewhere in the clerks\' hall a bell rings: a real bell, the first you have heard since the Reach. The reserve is coming.', 'bad', 7000);
      Audio_.sfx.bellDie();
    } },
    { t: 'Leave it for now.', f: null },
  ]);
}
function wgLadder() {
  const f = G.flags;
  if (!f.press_taken) { msg(f.wg_plan ? 'Vane leans over the rail a hundred feet up: "Not without the press! The Malting, on the Cloister road!"' : 'Vane leans over the rail a hundred feet up: "Not yet! Find the scribe!"', 'warn', 5000); return; }
  const left = [];
  if (!f.aegis_done) left.push('the Aegis still stands in the Cloister');
  if (!f.bettis_awake && G.maps.malting) left.push('in the Malting a Hollow woman is still putting a coat over her arm that is not there');
  if (!f.lamps_lit) left.push('the lamps of the Sunken Court are still dry');
  if (!G.has('folder') && !f.folder_given) left.push('something in the Malting\'s Tuning Room has not been read');
  showEvent('The mast-ladder', 'A hundred feet of rope up into the lilac mist, and the Kestrel\'s keel above it, lift-tanks murmuring. Vane is shouting something about weight.' + (left.length ? '<br><br>Behind you, ' + left.join('; ') + '.' : '') + '<br><br><span class="muted">Climbing leaves Whisper-Grove behind for good.</span>', [
    { t: 'Climb.', f: () => startPart4() },
    { t: 'Not yet.', f: null },
  ]);
}

// ---------------------------------------------------------------- people who are not quite people
function talkCat() {
  const L = ['The cat looks at you, and then at the water, and decides the water is more interesting.', 'The cat does not care.', 'The cat permits you to scratch behind its ears, for exactly as long as it permits it, and not one breath longer.', 'The cat is not a Hollow. It remembers everything that happened here, and none of it impressed it.', 'The cat yawns at the Office of the Catalogue.'];
  const first = !G.flags.cat_met; G.flags.cat_met = true;
  msg(first ? 'The cat in the Sunken Court looks at you as if you are late, and then forgives you, slowly.' : L[rndi(0, L.length - 1)], '', 4500);
}
function talkLamplighter(e) {
  const f = G.flags;
  if (f.lamps_lit) { msg('The lamplighter stands under the last lamp with his pole raised, and looks at the flame, and does not light it again.', 'voice', 6000); return; }
  if (!G.has('oil')) {
    msg('A Hollow with a long brass pole lights a lamp that has no oil in it. The wick takes for a moment and goes out. He moves to the next. "...the lamps are late tonight..."', 'voice', 7000);
    if (!f.lamp_met) { f.lamp_met = true; journal('side', 'A Hollow lamplighter in the Sunken Court lights the dry lamps over and over. They have had no oil for three years. If I found some, somewhere in the city...'); }
    return;
  }
  showEvent('The lamplighter', 'He reaches the next dry lamp and raises his pole, the way he has a thousand times. You have a flask of oil from the Cloister vestry.', [
    { t: 'Fill the lamps for him, one by one, ahead of his pole.', f: () => {
      G.take('oil'); f.lamps_lit = true; questXp(60);
      for (const o of G.ents) if (o.drylamp) o.glow = 0.65;
      msg('You go round the ring of the court ahead of him, filling each lamp. Behind you, one after another, they take. For the first time in three years the Sunken Court is lit, and two hundred Hollows walk their loops through their own reflections.', 'good', 9000);
      journal('side', 'I filled the dry lamps of the Sunken Court with oil from the Cloister vestry, and the lamplighter lit them. He stood under the last one afterward and did not light it again.');
    } },
    { t: 'Leave him to it.', f: null },
  ]);
}
function talkBettis(e) {
  const f = G.flags;
  if (f.bettis_put_back) { msg('She sets the coat that is not there over her arm, and lifts it, and sets it down again. She is very peaceful about it.', 'voice', 5000); return; }
  if (f.bettis_kept_awake) { msg('They have carried Bettis Renn to the Kestrel.', 'voice', 4000); return; }
  if (!f.sable_joined) { msg('A Hollow woman in a Whisper-Grove apron three years filthy stands by the press with a basket at her feet. Her hands keep making one small gesture, setting something down and picking it up again. The tag on her wrist reads WG-40,102.', 'voice', 7000); return; }
  const fr = sableFragments(G);
  showEvent('A Hollow with a basket', `A woman of about forty stands by the press in a Whisper-Grove apron three years filthy, a basket at her feet, and her hands make one small gesture over and over: setting something down and picking it up again, the gesture of a woman putting a coat over her arm. The tag on her wrist reads WG-40,102. Sable knows it before she reads it. "Bettis Renn," she says. "Forty thousand one hundred and two. Her core is in the long-term rack, because her husband's was requisitioned and the pair were broken up, and the Office does not like to break a pair." She has ${fr} fragment${fr === 1 ? '' : 's'} left. "The press took it. The press can return it. Nobody in the Office ever has. Nobody ever put one back."`, [
    { t: 'Ask her to put Bettis back. (It will cost her a fragment.)', f: () => {
      f.bettis_awake = true; e.name = 'Bettis Renn'; questXp(60);
      showEvent('Bettis Renn', 'They sit her on the stool. Sable seats the core and reads the entry out of the Ledger in the flat clear voice of a woman reading a will: <i>Entry forty thousand, one hundred and two. Bettis Renn. Thirty-eight. Wife of Ivo Renn, cooper, of Ashlane. Taken on the fourth day of the harvest, in the sixth hour. She asked to go second.</i> She strikes the lever, and something leaves her that she will never be able to identify. And then Bettis Renn begins to scream. <b>The Hollow was awake the whole time.</b> She remembers all three years: the queue, the benches, the kind clerk, the eight seconds, and every day since, the baskets and the rain and the standing. She comes off the stool at Sable with her nails, and the words in among the screaming are <i>put it back, put it back, put it back.</i> Sable holds her on the floor and says into her hair, "I\'m sorry. I\'m here. Bettis. Your husband is on a ship four miles from here, he is in the third stack, he is whole."', [
        { t: 'Put her back.', f: () => { f.bettis_put_back = true; e.name = 'A Hollow with a basket'; journal('side', 'Sable put Bettis Renn back in the Malting, and it cost her a fragment. She had been awake the whole time, for three years, and she begged to be put back. I put her back.'); msg('Ninety seconds. Three questions. Eight seconds of seven forty-one. She looks relieved at six. Sable writes it down.', 'voice', 8000); } },
        { t: '"No. I am sorry. We will hold you until it passes."', f: () => { f.bettis_kept_awake = true; e.hidden = true; journal('side', 'Sable put Bettis Renn back in the Malting, and it cost her a fragment. She had been awake the whole time, for three years, and she begged to be put back. I would not do it. We carried her to the Kestrel, to her husband in the third stack.'); msg('It does not pass. In the end you carry her to the Kestrel in a canvas sling, screaming, to the hold where her husband is in the third stack.', 'bad', 8000); } },
      ]);
    } },
    { t: 'Leave her with her basket.', f: null },
  ]);
}

// ---------------------------------------------------------------- papers
function wgPickUp(e) {
  const f = G.flags;
  if (e.item === 'oil' && f.lamp_met) msg('Lamp-oil, still good. Somebody in the Sunken Court has been lighting dry lamps for three years.', 'warn', 5000);
  if (e.item === 'returns') journal('side', 'In the Malting\'s Tuning Room: Kaelen\'s own calibration returns from the Dawning, with his initials against line ninety-four. The Office keeps everything, including the Consortium\'s cross-files.');
  if (e.item === 'redcloak') msg('A child\'s red choir cloak. There is no name-tape in the collar. You fold it, the way you would fold something for someone.', 'voice', 6000);
  if (e.item === 'folder') {
    journal('side', 'Under Kaelen\'s returns in the Tuning Room: a grey Arbiterium folder dated eight months before the Fracture. "The object of Stage 9 is not extraction. An Anchor will yield without limit if it believes it has been relieved." And a note: Engineer V. is not to be told, because his ear is more accurate when his conscience is not engaged.');
    showEvent('The grey folder', 'Arbiterium grey, dated eight months before the Fracture. <i>The object of Stage 9 is not extraction. An Anchor will yield without limit if it believes it has been relieved.</i> And, in a different hand: <i>Engineer V. is not to be told. His ear is more accurate when his conscience is not engaged.</i>' + (G.player.glassed ? '<br><br>Then, very close, out of the glass in your own arm, a voice that is not yours: <i>"Two pieces of one Spire are one thing in two places. I keep a list too."</i> And nothing more.' : ''), [{ t: 'Put it in your shirt.', f: null }]);
  }
}

// ---------------------------------------------------------------- the end of Book One
function bookOneEnd1() {
  if (G.state === 'ending') return;
  G.state = 'ending'; G.runs = (G.runs || 0) + 1; G.flags.book_one_done = true; hide('#event'); hide('#death'); closeModal();
  const f = G.flags, p = G.player, names = G.ledger.length, fr = sableFragments(G);
  const L = [];
  L.push(`Eleven hundred pounds overloaded: a press, an archivist${f.aegis_follow ? ', and a nine-foot automaton coming up the mast-ladder with a red cloak held to its chest' : ''}. An Office cutter comes out of the mist hunting by sound, a listening horn on its bow, and the four hundred and thirty-two murmuring in the Kestrel\'s own hold are all it needs. Vane flies the canopy at forty feet${f.aegis_follow ? ', lets the proctors board, and the Aegis answers them the only way its stencil allows' : ', takes a grapnel, and will not cut the line'}. Then he puts the willow-crown through the cutter's bow.`);
  L.push('Mid-chase a boy of seventeen, made of lightning, crosses the foredeck with an undelivered writ clamped in his fist, asks the way east, and is gone, leaving two scorched footprints and two words: <i>if you stop.</i> A holed lift-tank puts you down in the deep woods by the Mausoleum of Chords.');
  if (f.aegis_calmed && f.aegis_follow) L.push('Sable tells the Aegis what she knows and cannot read, and promises to find his name in the Organum, and it gives her the red cloak.');
  else if (f.aegis_calmed) L.push('In the Cloister of the Lost Choir an automaton kneels by eleven empty pegs, chiming the alto line of Hymn 9 to nobody. You left it with its risers. Sable does not ask you why.');
  else if (f.aegis_destroyed) L.push(`WG-41,005 is in your ledger: the boy inside the Aegis, who said his number three times as the bronze went still. ${G.has('redcloak') ? 'The red cloak is folded in your pack. You have not decided whose it is.' : 'The red cloak is still on its peg.'}`);
  else L.push('The Aegis still stands in its alcove in the Cloister, guarding eleven empty places. Nobody sang to it.');
  if (f.cloak_names) L.push(`Nine children of the Cloister choir are in your ledger by the name-tapes in their collars: ${CLOISTER_NAMES.slice(0, 2).join(', ')}, and seven more. The tenth collar had only the holes where its tape had been, and the red cloak had none.`);
  if (f.bettis_put_back) L.push('Bettis Renn remembered all three years and begged to be put back, and you put her back. Sable paid a fragment for that, and she will never be able to say which one.');
  else if (f.bettis_kept_awake) L.push('Bettis Renn is in the Kestrel\'s hold beside the third stack, where her husband is. She has stopped screaming and started something quieter and worse. She begged to be put back. You would not. You are not sure, either way, who that was for.');
  else L.push('In the Malting a Hollow woman still sets down a coat that is not there, and picks it up again.');
  if (f.folder_given) L.push('Kaelen tells Lyra everything out loud, including the grey folder, and that his first feeling on reading it was relief, and that he decided he was not entitled to it. Her voice comes back at the worst possible moment, and the first thing she does with it is tell him she would have forgiven him on Rootday, and cannot now.');
  else if (G.has('folder')) L.push('The grey Arbiterium folder is in your shirt. <i>Engineer V. is not to be told.</i> He has not been told. That is your decision now, and it weighs exactly as much as paper.');
  if (G.has('returns')) L.push('Kaelen\'s calibration returns travel in the hold beside the press. The only record that he ever tried to stop it is the Inquisitor\'s charge against him.');
  if (f.halder_dead) L.push('Halder Wick was killed walking his loop through the middle of the fight in the Sunken Court, with the blue plate in his hand.');
  else if (f.halder_safe) L.push(`Halder Wick is still setting his table for four in the Sunken Court. The proctors never reached him.${f.halder_sat ? ' The blue plate is in front of the fourth chair, where you sat.' : ''}`);
  if (f.lamps_lit) L.push('In the Sunken Court the lamps are lit for the first time in three years, and the lamplighter stands under the last of them with his pole, and does not light it again.');
  if (f.pools_all) L.push(`You looked into all four reflecting pools and carried four strangers' memories out of Whisper-Grove${f.sable_returned ? '. One of them, you are nearly sure, was the runaway\'s' : ''}.`);
  if (f.porch_survived) L.push(`At the Cloister porch the thing that wore Tobin Ashgrove stood in the fog and would not come in, and gave you Kaelen\'s whole confession in his own voice. ${f.porch_held ? 'You held the doorway against the Aegis while it sang Hymn 9 in Lyra\'s voice.' : f.porch_aside ? 'You stepped aside, and the Aegis went out into the fog after nothing.' : 'You did not answer it.'}${f.porch_answered ? ' You answered it once, and it has your voice now.' : ''}${f.porch_told_lyra ? ' You told Lyra what it said.' : ' Lyra does not know what it said.'}`);
  L.push(`Sable has ${fr} fragment${fr === 1 ? '' : 's'} left. She recites ${fr === 1 ? 'it' : 'them'} nightly, so that she will know which one goes. The missing ones do not feel like gaps, she says. They feel like shelves.`);
  if (p.glassed) L.push(`Your tideline is ${p.glass >= 70 ? 'past the collarbone, three inches from the throat' : 'four and a half fingers from the shoulder'}. ${p.glass >= 70 ? 'Six weeks, at the current rate.' : 'Eight weeks of slack, perhaps.'}`);
  L.push('A herald walks nine miles alone to read the writ aloud, because the form requires it: all of you declared Dissonant, the Dread Arbiter nine days out on the Tramway, and grace offered once. Lyra answers him herself. <i>Tell him the Cantor says we heard the question too.</i> The ship needs a whole lift-tank, and there is one coast where you can get one.');
  L.push(`Kaelen adds the names to the beam${names ? `, all ${names} of yours among them` : ''}, and under them he writes: <i>Not yet.</i>`);
  L.push(`<span class="muted">Here ends Book One: The Silenced Province. ${G.runs > 1 ? 'The Tide-Weaver has watched this thread before. "It is still kind," he says.' : 'The Tide-Weaver has watched this thread before. He does not say so.'}</span>`);
  $('#ending-title').textContent = 'Not Yet';
  $('#ending-text').innerHTML = L.map(l => `<p>${l}</p>`).join('');
  $('#btn-part3').classList.add('hidden');
  show('#ending'); Audio_.setScene('inside');
}

// ============================================================
//  Second pass: the Whisper Catacombs, the Pressman's Round, A Table for Four
// ============================================================
function drownedShriek(e) {
  addNoise(3); Audio_.sfx.hound();
  if (!G.shriekMsgT || performance.now() - G.shriekMsgT > 8000) { G.shriekMsgT = performance.now(); msg('The Drowned Hollow sees you and screams in seventy voices at once. Everything in the mist hears it.', 'bad', 4500); }
}
function enemyHitFx(e, d) {
  if (d.web && Math.random() < (e.type === 'weaver' ? 0.6 : 0.4)) { const fresh = !(G.webT > 0); G.webT = 2.6; if (fresh) msg('Threads of lilac light catch at your legs. Every step comes slow.', 'warn', 2500); }
  if (d.toll) codaHitFx(e, d);
  if (d.mute || d.moth) wildsHitFx(e, d);
  if (d.forget && Math.random() < 0.35) {
    const p = G.player; p.voice = Math.max(0, p.voice - 8); Audio_.sfx.press();
    msg(`The felted die catches you across the temple. For a moment you cannot remember your own name. Then: ${p.name}. ${p.name}. You hold on to it.`, 'bad', 4500);
  }
}
const WEAVER_VOICES = [
  (p) => `"${p.name.split(' ')[0]}... ${p.name.split(' ')[0]}, come in now, the water's warm..." — in your own mother's voice.`,
  () => '"...the blue one goes there... they will be in directly..." — in Halder Wick\'s voice.',
  () => 'It sings the calling-song, beautifully, in Lyra Ashgrove\'s voice. The voice she does not have any more.',
  () => '"I am a list, not a cure," it says, in Sable\'s voice, and laughs in eleven children\'s.',
  () => '"Hymn nine, page forty... all rise... all rise..." — in two hundred voices, all slightly out of time.',
  () => '"Seven forty-one," it says, in Kaelen\'s voice, very gently. "I wrote it down myself."',
];
function enemyExtra(e, dt, dist, canSee) {
  const d = e.def;
  if (d.horn || d.grapnel || d.dirge) codaExtra(e, dt, dist, canSee);
  if (d.wilds) wildsExtra(e, dt, dist, canSee);
  if (d.mimic) { e.mimicT = (e.mimicT == null ? 2 : e.mimicT) - dt; if (e.mimicT <= 0 && dist < 10) { e.mimicT = rnd(7, 11); const V = d.coda ? codaVoices(e) : WEAVER_VOICES; msg((d.coda ? d.name + ' sings. ' : 'The Weaver speaks. ') + V[rndi(0, V.length - 1)](G.player), 'voice', 6000); Audio_.sfx.voice(); } }
  if (d.summon && canSee) {
    e.summonT = (e.summonT == null ? 6 : e.summonT) - dt;
    if (e.summonT <= 0) {
      e.summonT = rnd(9, 13);
      const alive = G.ents.filter(o => o.kind === 'enemy' && o.type === d.summon && !o.dead && !o.hidden).length; if (alive >= 4) return;
      for (let i = 0; i < 8; i++) { const a = rnd(0, 6.28), x = e.x + Math.cos(a) * 1.4, y = e.y + Math.sin(a) * 1.4; if (solidAt(x, y)) continue; const s = hydrate({ kind: 'enemy', type: d.summon, x, y }); s.state = 'chase'; s.alertT = 8; G.ents.push(s); msg(e.type === 'broodmother' ? 'The Brood-Mother\'s egg-sac splits along one seam, and a weaverling drops out of it running.' : 'The Weaver pulls a thread out of its shroud, and the thread runs at you on eight legs.', 'bad', 3500); Audio_.sfx.hound(); break; }
    }
  }
}
function wgBossDown(e) {
  const f = G.flags;
  if (e.type === 'weaver') {
    f.weaver_dead = true; questXp(60);
    msg('The Phantom Weaver comes apart thread by thread. Every voice it was wearing says one word as it goes, and none of them the same word. Then only the loom is humming.', 'good', 9000);
    journal('side', 'I killed the Phantom Weaver in the loom chamber of the Whisper Catacombs. Its loom still holds the shroud it was weaving out of Whisper-Grove\'s forgotten voices.' + ((f.cocoons || 0) < 5 ? ' Some of the missing Hollows are still wound in thread down there.' : ''));
  }
  if (e.type === 'pressman') {
    f.mallow_dead = true; G.give('roundbook'); questXp(40);
    msg('Pressman Mallow goes down in the water with the press still strapped to his back. His round-book comes away on its broken chain. You take it.', 'good', 7000);
    journal('side', 'The Pressman\'s Round: I killed Pressman Mallow and took his round-book: eight Hollows from the west quarter, marked for second pressing. Sable, or Quist, would know what to do with it.');
  }
}
// interactions, chained ahead of the first-pass handler
function wgUse(e) {
  const f = G.flags;
  if (e.use === 'cocoon') {
    if (G.ents.some(o => o.kind === 'enemy' && !o.dead && !o.hidden && o.state === 'chase' && dist2(o.x, o.y, Engine.cam.x, Engine.cam.y) < 16)) { msg('Not with that at your back. Deal with it first.', 'warn', 3000); return true; }
    e.hidden = true; f.cocoons = (f.cocoons || 0) + 1; f['cocoon_' + e.cocoon] = true; questXp(15); Audio_.sfx.pickup();
    msg(`You cut the threads away. A Hollow slumps out, wet and blinking at nothing, and then stands, and turns, and starts walking — back toward the stair, back toward its loop. (${f.cocoons} of 5)`, 'good', 6000);
    if (f.cocoons === 5) journal('side', 'The Missing Count: I cut all five missing Hollows out of the Weaver\'s threads in the catacombs. They walked back up the stair on their own.');
    return true;
  }
  if (e.use === 'loom') {
    if (!f.weaver_dead) { msg('The Weaver is at its loom. It is weaving your voice into the shroud as you stand there. You can hear it.', 'bad', 4000); return true; }
    if (f.shroud_done) { msg(f.shroud_cut ? 'The loom stands empty and silent, its threads cut.' : 'The loom hums, very faintly, with one thread missing.', '', 4000); return true; }
    showEvent('The shroud', 'A shroud half the size of a sail, woven from lilac thread, and in every thread a voice: a woman pricing eels, a boy practising scales, a man saying <i>I love you</i> to someone who forgot him first. Seventy-four thousand people forgot themselves in one night, and this is where the forgetting went.', [
      { t: 'Cut the shroud. Let them all go.', f: () => { f.shroud_done = true; f.shroud_cut = true; questXp(120); Audio_.sfx.song(741, 1.2); msg('You cut it from the loom. For half a breath, under Whisper-Grove, seventy-four thousand voices speak at once, and then they go up the stair and out into the mist, and the mist is a little brighter for it.', 'good', 10000); journal('side', 'I cut the Weaver\'s shroud from its loom. The voices of Whisper-Grove went up the Sunken Stair into the mist.'); } },
      { t: 'Take one thread. (+10 maximum voice; the Cacophony will hear you further)', f: () => { f.shroud_done = true; f.thread_kept = true; G.give('thread'); G.player.voiceMax += 10; G.player.voice += 10; questXp(60); msg('You wind one thread on a finger-bone. It hums against your ribs in a voice you nearly know. Behind you the shroud keeps the rest.', 'voice', 8000); journal('side', 'I took one thread from the Weaver\'s shroud and left the rest on the loom. It hums in my pack.'); } },
      { t: 'Leave it.', f: null },
    ]);
    return true;
  }
  if (e.use === 'wick_letter') {
    // Book One ch. 15: "He set a table for four every evening for three years. I do not know who he was expecting.
    // There is no one left to ask." The house keeps the question; nothing in it answers.
    if (!f.wick_dresser) {
      f.wick_dresser = true;
      journal('side', 'A Table for Four: Halder Wick\'s house has four chairs, two beds and nothing with a name on it. I do not know who he was expecting. There is no one left to ask.');
      showEvent('The dresser', 'A joiner\'s dresser, well made, and bare. No letters, no slates, no names chalked by the door, no Thursday marked on anything. Four chairs, two beds, one of them small. Whoever the other three plates are for, nothing in this house says, and the only man who knows is setting the table.', [{ t: 'Close the drawers.', f: null }]);
    } else msg('A bare dresser. Nothing in this house has a name on it.', '', 3000);
    return true;
  }
  if (e.use === 'wick_table') {
    msg(f.halder_dead ? 'A table for four, set in a foot of lit water. Nobody sits at it.' : 'A table for four, set in a foot of water. One of the plates is blue.', '', 4000);
    return true;
  }
  return wgUse1(e);
}
function wgTrigger(t) {
  if (t.id === 'weaver_room') {
    if (!t.done && !G.flags.weaver_dead) {
      t.done = true;
      for (const e of G.ents) if (e.type === 'weaver' && !e.dead) { e.state = 'chase'; e.alertT = 12; e.guard = false; }
      Audio_.sfx.voice(); msg('The thing at the loom turns round. It is wearing a shroud of voices, and all of them say your name.', 'bad', 7000);
    }
    return true;
  }
  return wgTrigger1(t);
}
function bookOneEnd() {
  bookOneEnd1();
  const f = G.flags, L = [];
  if (f.weaver_dead) L.push(`Under Whisper-Grove the Phantom Weaver is dead at its loom${f.shroud_cut ? ', its shroud cut, and seventy-four thousand voices went up the Sunken Stair into the mist' : f.thread_kept ? '. One thread of its shroud hums in your pack, in a voice you nearly know' : ''}. ${f.count_done ? 'Sable\'s count in the west quarter came out right.' : ''}`);
  if (f.round_sable) L.push('Pressman Mallow\'s round is in the Bound Ledger now, eight names, copied out in Sable\'s straight hand.');
  else if (f.round_struck) L.push('Pressman Mallow\'s round was struck off the register in Quist\'s hand. Eight Hollows in the west quarter are on no list at all.');
  else if (f.mallow_dead) L.push('Pressman Mallow is dead in the water of the west quarter. Three ticks in his round-book are still blank.');
  if (f.halder_rest) L.push(f.halder_dead ? 'Halder Wick\'s table is set for four in the Sunken Court. Nobody sits at it.' : 'Halder Wick sits at his own table now, facing the door, waiting for whoever he set it for.');
  const box = $('#ending-text'), ps = box.querySelectorAll('p'), anchor = ps[ps.length - 3];
  L.push(...codaEndingLines(), ...wildsEndingLines(), ...(typeof NARROW28 !== 'undefined' ? NARROW28.endingLines() : []));   // R3: one line from your standing in the Hedge
  if (!L.length && !f.part4) return;
  for (const l of L) { const pEl = document.createElement('p'); pEl.innerHTML = l; box.insertBefore(pEl, anchor || null); }
  if (f.part4) for (const pEl of [...box.querySelectorAll('p')]) if (/^(Eleven hundred pounds|Mid-chase)/.test(pEl.textContent) || (f.cloak_given && /^Sable tells the Aegis what she knows/.test(pEl.textContent))) pEl.remove();
}
