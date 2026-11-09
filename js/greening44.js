// ============================================================
//  greening44 — the Greening, walked (Book One ch. 11; ROADMAP R9 item 1).
//
//  The bit is broken and Oakhaven is going under. This replaces the lone 300-second dash to the mast with the chapter's
//  four movements, played in the greened town (buildOakhaven(true)):
//    0  THE QUARRY. Out of the winch-house into a bowl of green; Tobiah at the rim: "The road's still open!"
//    1  THE LANES. The town drowning in its own ground; the Hedge closes over the North Gate behind you. Lyra and Kaelen
//       go down into the lanes, and the pieces come one after another: the churchyard heaving, the baker's wife ("I
//       punched it down"), the carter rooted at Weavers' Cross, the mouth of the Hollow.
//    2  THE CORRIDOR. At the well-head Lyra sings the falling fifth at full voice and an eight-foot circle of stillness
//       walks with her. Your work is the line: pull people out of doorways into it (Hetty and Bettany do the same) and
//       keep the hounds off its tail. The green closes three feet behind the last person; stray from the line and it
//       takes your boots. While you are with the line the Greening's clock stands still ("you could not walk faster
//       for an hour").
//    3  THE SQUARE. Rooke could not cross Orla's floor and gives Lyra the long drops. Go with Lyra to Orla, or stay and
//       hold the square line with Rooke.
//    4  ORLA'S TREE. "You're late, lovey." Three drops on the tongue. "Now, girl. Now. All the lines." The harvest home
//       as Hold the Pitch: lines one to three, then the fourth line, the narrowest band in the game. If you cut the
//       Last Sheaf with Harrow you know the song and sing the second voice; if not you hum the Root under her, or keep
//       the door. Orla stops breathing around the sixth line, whatever you do (canon). Hold the square instead: forty
//       seconds of hounds at the line, and Lyra sings Orla down alone.
//    5  THE NORTH GATE. Four hundred people in a lozenge of mud; thorn thirty feet high that outgrows the axes. The Hedge
//       speaks as Tobin, Tam, Lyra whole and Davin, and as you if you ever answered it (hedge_answered). Lyra screams
//       DON'T ANSWER IT from the mounting-block: stand beside her, shout it yourself (loud, so hounds come to the
//       crowd), or hold on and say nothing ([PROPOSED] one more answers). Ada Pellow always goes: "Tobin Ashgrove, is
//       that you?" / "Hello, Ada." The Chapel falls, the Pure Note stops (the sound drops out for two beats), and the
//       Kestrel comes down. Then Grab the Line, as game.js's ending has it.
//    6  done.
//  Missing a beat changes lines and never fails a quest. The mast still ends Part Two for a player who runs for it.
//  Figures are transient (staged again on load); progress lives in G.flags (g44*). Children are never harmed: the
//  hounds take from the tail, and Bettany keeps the children in the middle of the line.
// ============================================================
'use strict';

const GREEN44 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('greening44: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const px = () => Engine.cam.x, py = () => Engine.cam.y;
  const fmt = (t, ...a) => String(t).replace(/\{(\d+)\}/g, (m, i) => a[+i] != null ? a[+i] : m);
  let MSG_VO = null, CARD_VO = null, voTok = 0;
  const say = (t, cls, ms) => { try { msg(String(t).replace(/<\/?i>/g, ''), cls || '', ms || 5200); } catch (e) { /* cosmetic */ } const ids = MSG_VO && MSG_VO.get(t); if (ids) seq(ids); };
  const voice = (t, ms) => say(t, 'voice', ms || 6500);
  const card = (title, body, choices) => {
    const hushed = (choices || []).map((c) => Object.assign({}, c, { f: function () { hush(); return c.f && c.f.apply(this, arguments); } }));
    try { showEvent(title, body, hushed); } catch (e) { warnOnce('card', e); }
    const v = CARD_VO && CARD_VO.find(([t]) => String(body).startsWith(t)); if (v) seq(v[1]);
  };
  // the voices: narration is not auto-played by onMsg, so the scene plays its own, one line after another
  const voiced = () => typeof VOICE_ACT !== 'undefined' && !!VOICE_ACT.LINES && (typeof VOICES === 'undefined' || ['acted', 'spoken'].includes(VOICES.mode));
  function hush() { voTok++; try { const c = VOICE_ACT.state && VOICE_ACT.state.current; if (c) { c.stop(); VOICE_ACT.state.current = null; } } catch (e) { /* nothing playing */ } }
  function seq(ids) {
    if (!voiced()) return;
    const tok = ++voTok; let i = 0;
    const next = () => {
      while (tok === voTok && i < ids.length) {
        const id = ids[i++], l = VOICE_ACT.LINES[id];
        if (!l) continue;
        let d = 0; try { d = VOICE_ACT.playLine(Object.assign({ id }, l), { interrupt: true }) || 0; } catch (e) { warnOnce('line', e); }
        if (d > 0 && i < ids.length) setTimeout(next, (d + 0.3) * 1000);
        return;
      }
    };
    next();
  }

  // ================================================================ the words (Book One ch. 11, ll. 3347–3578)
  const TX = {
    // 0 the quarry
    quarryTitle: S('A bowl of green'),
    quarry: S('You come out through the winch-house into a world that has already ended and is extremely busy about it. The quarry is a bowl of green: grass a foot high on the second terrace and three feet on the first, brambles pouring over the tanker bays, a young iron-oak twice the height of a man in the middle of the censer-platform with the white cloth of the Rite hanging off it like a torn sail. The headframe\'s iron legs are bending outward, rivets going like gunshots one at a time. Four Legionnaires stand at the gate exactly where they were posted, bells lifted, with grass coming up through their pewter feet.<br><br>"Cantor!" Tobiah Marsh, at the rim, with his charts under his arm, hauling an old man by the belt. "The road\'s still open! It\'s going over the fields — the road\'s still—" And then he is gone in the crowd.'),
    quarryGo: S('Down the quarry road to the town'),
    // 1 the town, the lanes
    townTitle: S('Oakhaven, drowning in its own ground'),
    town: S('The Greening has gone through the town from the north, a swell of green moving over roofs and walls the way water moves over a weir: not fast, exactly. You could walk faster. You could not walk faster for an hour. The iron-oaks on the common were a hundred and fifty years old this morning and are three hundred now, and still going, and every one of them is ringing. The whole town rings like a struck carillon, and there is not one bell in it.<br><br>The Hedge is rising. It was three men deep and twice a woman\'s height; it is four times her height now, blackthorn and bramble braiding themselves into a wall the way bread rises in a pan, and the wall is closing over the North Gate behind you. The Hedge was built to keep the town\'s sound inside.<br><br>"The gate," Lyra says, and cannot hear herself. "Kael — the gate—"<br><br>"I see it."'),
    townGo: S('Down into the lanes'),
    gateShut: S('Behind you the thorn closes over the North Gate, braiding, the way bread rises in a pan.'),
    gateThorn: S('Where the gate was there is a wall of thorn, and it is still growing.'),
    jTown: S('Hearthday afternoon. The Greening has gone through Oakhaven from the north and the Hedge has closed over the North Gate behind us. Lyra and Kaelen have gone down into the lanes. I am going with them.'),
    hudLanes: S('THE LANES · stay with Lyra'),
    lyraWaits: S('Lyra stops in the lane and looks back for you, with her hand over her mouth.'),
    churchyard: S('The churchyard, heaving. The sexton\'s salt lies in white drifts along the paths and it has not mattered at all; the grass over the graves stands waist-high and glossy, and the mounds have risen so that the ground looks like a bed with somebody stretching in it.'),
    bakery: S('The bakery door, burst outward, and dough coming down the step in a slow white tongue. Inside, the oven cracked open like an egg, and the baker\'s wife in the middle of it with her hands in her hair, saying "I punched it down, I punched it down, I punched it down."'),
    carter: S('A carter on his knees in the middle of Weavers\' Cross with his hands pressed to the cobbles, unable to lift them, watching the fine white root-hairs come out of his palms and go down between the stones. He is not screaming. He is looking at his own hands with an expression of dreadful embarrassment, as though he had spilled something in somebody\'s house.'),
    hollow: S('The mouth of the tannery lane, and the Hollow beyond it, where every person in Oakhaven who ever had a root in them was. Lyra has a Cantor\'s training and thirty-three years of the Reach and a whole language for the ways a body can go wrong, and standing at the mouth of the lane she has nothing at all. She goes in anyway.'),
    lookCarter: S('The carter at Weavers\' Cross'),
    lookCarterText: S('You take him by the shoulders and pull, and his palms do not come up; they are part of the street now. "It\'s all right," he says, mortified. "Go on. You go on."'),
    lookBaker: S('The baker\'s wife'),
    lookBakerText: S('"I punched it down," she tells you, quite reasonably, as if you had asked. "I punched it down."'),
    // 2 the corridor
    wellTitle: S('The well-head'),
    well: S('Lyra starts singing at the well-head, because there is a crowd there and the green is coming up the lane behind them and they have nowhere to go.<br><br>The falling fifth. Full voice, torn, ugly, with the wire-hole still weeping under her jaw. The Root note, and down; and up; and down. <i>Go back. Go back where you came from. Go back to being a road.</i><br><br>The grass at her feet slumps. It is not a miracle. It works in a circle perhaps eight feet across, a circle of stillness in a world that has stopped being able to stop, and where she walks, the circle walks with her.<br><br>"Behind me!" she shouts between phrases, and her voice comes out like a torn sheet. "In a line! Hands on the shoulder in front! Behind me!"'),
    wellGo: S('Get them out of the doorways'),
    corridorHint: S('Walk with the line. Use a person in a doorway to bring them into it; keep the hounds off its tail. The green closes three feet behind the last of them.'),
    jCorridor: S('At the well-head Lyra sang the falling fifth at full voice and the grass lay down in a circle around her. The town is walking behind her in a line, hands on shoulders, and the green closes three feet behind the last of them. My work is the line.'),
    hudCircle: S('THE CIRCLE'),
    hudInLine: S('in the line'),
    hudLost: S('lost'),
    hudGreen: S('THE GREEN HAS YOUR BOOTS'),
    lookDoor: S('Someone in a doorway'),
    lookDoorText: S('They stand in the doorway with the green coming up the step behind them, and do not know where to go.'),
    pulled: S('You take them by the wrist and put their hand on the shoulder in front. "Behind her," you say. "Don\'t let go."'),
    hettyPulls: S('Hetty Bram gets them into a line, two at a time, with her hands and her voice: "Hands on the shoulder. On the shoulder, Josser, I don\'t care whose."'),
    bettanyPulls: S('Bettany gets the children into the middle of the line, where nothing can reach them from the front or the back, and holds the smallest by her apron strings.'),
    dyeWomen: S('The dye-works women come out of a doorway and take the old ones by the elbows.'),
    rookeComes: S('Surgeon-Grafter Rooke comes up the lane in his shirtsleeves with his bag in one hand and blood on both, and starts pulling people out of doorways and pushing them into the column, shouting names.'),
    houndBehind: S('Behind the line, a jitter in the air like heat-haze with teeth. A hound has heard her full voice, and it is coming for the tail.'),
    houndTook: S('A hound reaches the tail of the line. The last man\'s hand comes off the shoulder in front, and the green closes over the place where he was.'),
    inGreen: S('You have strayed from the line. The grass around your boots is not grass, and it is holding on.'),
    lineWake: S('Sixty people walk behind her down the middle of their own town, and the green closes over the road behind the last of them, three feet back, the way a wake closes behind a boat.'),
    lyraHolds: S('Lyra holds the circle where it is and waits for you, and it costs her.'),
    // 3 the square
    squareTitle: S('The square'),
    square: S('She gets them as far as the square.<br><br>"Orla," she says.<br><br>Rooke\'s face, up close, is grey. "I could not get near her." He says it flatly, the way he says <i>past cutting</i>. "The floor\'s gone. The whole floor of that house is roots up to my knees and moving, and I am fifty-two years old and I could not get across it with a bag in my hand. I tried twice." He holds up the little brown bottle of long drops, unbroken, unopened. "Take it. I\'ll hold the line here. Go on, girl. Go."'),
    squareWithLyra: S('Go with Lyra to Orla'),
    squareWithRooke: S('Stay and hold the square with Rooke'),
    squareLyraGoes: S('Lyra takes the brown bottle and goes, down the lane toward the house two doors along from the blue door.'),
    holdHint: S('Rooke\'s line stands in the square while the square goes. Keep the hounds off them until Lyra comes back.'),
    hudSquare: S('HOLD THE SQUARE'),
    // 4 Orla's tree
    orlaTitle: S('Orla\'s tree'),
    orla: S('The roof has come off Orla\'s house, not fallen but lifted, pushed up and aside by the thing that was a chair, and the walls stand open around a tree. A young tree, ten feet high, green-barked, shining, with new leaves still unrolling, grown out of the floorboards and up through the middle of Orla Hale\'s chair, and Orla is inside it. Not crushed. <i>Included.</i> The bark has come up around her to the chest. Her grey hair is full of leaves. Her face is the only thing left that is hers.<br><br>Her eyes move. They find Lyra, and light.<br><br>"You\'re late, lovey," says Orla Hale.'),
    orlaCross: S('Cross the floor with her'),
    orla2: S('There are roots in the floor that turn toward your boots, and you step over them the way you would step over sleeping dogs. Lyra gets both hands on the old woman\'s face.<br><br>"Does it hurt." It does not come out as a question.<br><br>"No." A rustling, delighted whisper. "I told you. It\'s like being held. It\'s very green, isn\'t it. I can hear it growing. I can hear the whole Reach growing. Isn\'t that a sound." The bark at her collarbone tightens by a finger\'s width, and her breath goes out of her in a small grunt, and she says, quite clearly: "Now, girl. Now. All the lines."<br><br>Lyra gets the stopper out of the brown bottle with her teeth and gives her the long drops on her tongue, three of them, the way she watched Rooke do it forty times.'),
    orlaSecond: S('Sing the second voice with her (you cut the Last Sheaf)'),
    orlaRoot: S('Hum the Root under her'),
    orlaDoor: S('Keep the door while she sings'),
    sheafTitle: S('The harvest home'),
    sheafHint: S('Lines one to three. Hold her under the torn notes.'),
    fourthTitle: S('The fourth line'),
    fourthHint: S('The line Davin could never hold, and his father could never hold. The narrowest band there is.'),
    orlaTwo: S('Full voice, every line. <i>Oh, the last sheaf\'s in and the barley\'s high, and the swallows are low in the harvest sky.</i> Lyra\'s throat tears on the third line and she goes on through it, and your voice is under hers where it tears, the second voice, the way a whole town used to sing it on the risers. Orla\'s eyes are shut and her mouth has come open a little and she is listening.<br><br>The fourth line, which Davin could never hold, and which his father could never hold. The two of you hold it.<br><br>Somewhere around the sixth line, the old woman stops breathing. Lyra finishes the song. All of it.'),
    orlaRootText: S('Full voice, every line. <i>Oh, the last sheaf\'s in and the barley\'s high, and the swallows are low in the harvest sky.</i> Lyra\'s throat tears on the third line and she goes on through it, and you keep the Root under her, one low note, so that the song has a floor to stand on. Orla\'s eyes are shut and she is listening.<br><br>The fourth line, which Davin could never hold, and which his father could never hold. Lyra holds it.<br><br>Somewhere around the sixth line, the old woman stops breathing. Lyra finishes the song. All of it.'),
    orlaOne: S('Full voice, every line. <i>Oh, the last sheaf\'s in and the barley\'s high, and the swallows are low in the harvest sky.</i> Her throat tears on the third line and she goes on through it, and the sound is barely human and it does not matter, because it is loud, and because Orla Hale is listening, the way she listened on the risers of fifty harvest homes.<br><br>The fourth line, which Davin could never hold, and which his father could never hold, and which Orla Hale held for fifty years in a voice like a rusty gate. Lyra holds it.<br><br>Somewhere around the sixth line, the old woman stops breathing. Lyra finishes the song. All of it.'),
    orlaPoor: S('The fourth line goes out from under you and Lyra takes it on alone, and holds it.'),
    orlaHounds: S('She puts her forehead against the bark for the length of three breaths, which is all she has, because by then the hounds have heard her. They come into the Hollow through the canopy. Kaelen meets the first one at the door of the house with his arm bare and blazing.<br><br>"Lyra." He has her by the wrist. "Lyra. The line\'s moving. Rooke\'s got them to the square and the square\'s going. The gate—"<br><br>"The gate\'s closed," she says.<br><br>"Then we open it."'),
    orlaGo: S('To the North Gate'),
    jOrlaTwo: S('Orla Hale is dead in her tree. Lyra gave her the long drops and sang her the harvest home, every line, and I sang the second voice, and the two of us held the fourth line. She stopped breathing around the sixth.'),
    jOrlaOne: S('Orla Hale is dead in her tree. Lyra gave her the long drops and sang her the harvest home, every line, and held the fourth line that Davin never could. She stopped breathing around the sixth.'),
    squareBack: S('Lyra comes back up the lane with the brown bottle empty and her voice gone to a thread, and Kaelen beside her with his arm still smoking. She does not say anything about Orla. She does not have to.<br><br>"The line\'s moving," Kaelen says. "The square\'s going. The gate—"<br><br>"The gate\'s closed," she says.<br><br>"Then we open it."'),
    squareWhole: S('Rooke\'s line goes to the gate whole. Not one hand came off a shoulder.'),
    squareNotWhole: S('Rooke\'s line goes to the gate with {0} fewer than it had.'),
    // 5 the North Gate
    gateTitle: S('The North Gate'),
    gate: S('Four hundred people of the town of Oakhaven stand at the North Gate in the last clear ground inside the Hedge, a lozenge of trampled mud sixty feet across, with the green coming in on three sides at a walking pace, and the Governor\'s men and the Consortium\'s men and the Church\'s men shoulder to shoulder in it with everybody else.<br><br>Where the gate was there is a wall of thorn thirty feet high and twenty feet thick, and it is still growing. They go at it with axes, with hedging-bills and hay-knives and a Legionnaire\'s halberd somebody has pulled off a Legionnaire who is no longer using it. The thorn grows back faster than they cut, and after a while the cutting stops, and the town stands in the mud in the green light and listens to itself breathing.'),
    gateGo: S('Stand in the mud with them'),
    hedgeLark: S('And the Hedge says, in Tobin Ashgrove\'s voice: "Lark."'),
    hedgeLark2: S('"Lark, there\'s a way through down here. I can see it from this side. Come along the thorn to me, lark, and bring them with you." Warm, and a little hoarse, and patient. Four hundred people turn their heads.'),
    hedgeTam: S('"Tammy," says the Hedge, in old Tam\'s cracked tenor, from thirty feet further down. "Tammy, there\'s a gap here. Bring the little ones first."'),
    hedgeLyra: S('"This way," says the Hedge, in Lyra\'s own voice, her whole voice, the one she gave it on forty-one nights on a stone behind a cooperage. "This way. Follow me. I know the way out."'),
    hedgeDavin: S('"The last sheaf\'s in," sings the Hedge, very softly, in Davin Hale\'s voice, "and the barley\'s high—"'),
    hedgeYou: S('And then, from the thorn by your shoulder, in your own voice, the one you gave it at the culvert: "{0}. It\'s me. There\'s a way through."'),
    hinge: S('Somebody in the crowd makes a sound like a hinge.'),
    dontTitle: S('DON\'T ANSWER IT'),
    dont: S('"DON\'T ANSWER IT!" Lyra screams. It takes everything she has left. It comes out of her ruined throat like a plank splitting, and she gets up on the mounting-block by the gatepost with Kaelen holding her by the belt so she can be seen, and screams it again.<br><br>"DON\'T ANSWER IT! IT ISN\'T THEM! IT WAS NEVER THEM! WHATEVER IT SAYS, WHATEVER VOICE — DON\'T ANSWER, DON\'T GO TO IT, DON\'T LET GO OF EACH OTHER—"'),
    dontBeside: S('Get up beside her on the mounting-block'),
    dontShout: S('Shout it yourself, as loud as you can'),
    dontSilent: S('Hold on to the people beside you and say nothing'),
    beside: S('You get up on the block beside her, so the back of the crowd can see two of you, and put your hand flat between her shoulders so she does not have to stand on her own.'),
    shout: S('"DON\'T ANSWER IT!" Your voice goes out over four hundred heads, as loud as you have ever let it be in the Reach, and the hounds hear it. Kaelen turns to the edge of the crowd with his arm already burning.'),
    shoutHounds: S('The hounds come out of the green at the edge of the mud, toward the crowd and the noise. Keep them off the people.'),
    silent: S('You hold on to the hand on either side of you and say nothing, and the Hedge goes on, and the crowd hears one voice telling it not to listen instead of two.'),
    silentOne: S('Down the thorn, one of the Tanner cousins says "Mam?" in a small voice, and lets go of the hand beside him, and is gone into the green before anyone can take hold of his coat.'),
    adaTitle: S('Ada Pellow'),
    ada: S('And down at the north end of the thorn, Mistress Pellow says, "Tobin?"<br><br>She is fifty-one years old. Her youngest had a marsh-fever two springs ago, going quiet in her cot, going out like a lamp, and an orchard-cantor stood up in that kitchen at four in the morning and said <i>Well, there\'s nothing for it</i>, and opened his mouth, and sang her back, and walked out into the yard singing so that the hounds would follow him and not the house. Ada Pellow has put a bowl of new milk on Lyra\'s step every week of the two years since, and never once said why.<br><br>"Tobin Ashgrove," she says, to the thorn, in a perfectly ordinary voice, "is that you?"<br><br>"Hello, Ada," says the Hedge.<br><br>She goes into it. The thorn does not part for her. She climbs into it with her arms up over her face, and it closes over her, and for four or five seconds there is the sound of a woman going into a hedge. Then there is no sound at all.'),
    adaReed: S('You cut her a reed for Joram\'s note, once. She had it in her apron.'),
    adaGo: S('Hold on to each other'),
    adaAfter: S('From somewhere on the other side, in the voice of Ada Pellow, the Hedge says: "Oh — it\'s easy, come on. It\'s easy from this side." Nobody else moves. Four hundred people stand in the mud and hold on to each other, and the Hedge goes on talking to them in the voices of their dead, patiently, name by name.'),
    ledgerAda: S('the North Gate, into the thorn'),
    chapelTitle: S('The Note stops'),
    chapel: S('Across the town, the Chapel of the Pure Note falls down. A long grinding crash from the square, and a great gout of green going up where the roof was, and then the thing that everyone in that crowd notices in the same half-second, the thing that makes four hundred people look up at once.<br><br>The Note has stopped. Five days, day and night, one note, until the town stopped hearing it the way you stop hearing your own blood. And now it is gone, and in its place there is nothing but the Greening: the crackle and stretch and sigh of ten thousand things growing at once, the ringing of the iron-oaks, and the Hedge, saying their names.<br><br>The silence where the Note was is the most frightening sound you have ever heard.<br><br>Kaelen\'s hand closes hard on Lyra\'s shoulder. "Lyra," he says. "Look up."<br><br>Out of the low green sky over the ruin of Oakhaven, brass-ribbed and patched and riding light as a leaf, with her lift-tanks burning cobalt and a line already uncoiling from her winch, comes the <i>Drift-Kestrel</i>.'),
    chapelGo: S('Grab the line'),
    jGate: S('At the North Gate the Hedge spoke to four hundred of us in the voices of our dead. Lyra screamed at us not to answer it, and Ada Pellow answered it anyway: "Tobin Ashgrove, is that you?" "Hello, Ada." She went into the thorn. Then the Chapel fell and the Note stopped, and the Kestrel came down out of the green.'),
    hudGate: S('THE NORTH GATE · hold on to each other'),
    hudShout: S('THE HOUNDS ARE AT THE CROWD'),
    // the end card (game.js's ending())
    endOrlaTwo: S('Lyra sang Orla Hale down in her tree, every line, and you sang the second voice, and the fourth line held between the two of you while the bark closed over her.'),
    endOrlaRoot: S('Lyra sang Orla Hale down in her tree, every line, with you on the Root under her, and held the fourth line that Davin never could.'),
    endOrlaOne: S('Lyra sang Orla Hale down in her tree on her own, every line, and held the fourth line that Davin never could, while you held the square with Rooke.'),
    endOrlaDoor: S('Lyra sang Orla Hale down in her tree, every line, and held the fourth line that Davin never could, while you kept the door.'),
    endLine: S('Sixty people walked behind her circle from the well-head to the square with their hands on each other\'s shoulders{0}.'),
    endLineLost: S(', and {0} of them were taken from the tail of it'),
    endAda: S('At the North Gate the Hedge called the town by its dead, and Ada Pellow went to Tobin Ashgrove\'s voice. Everyone else held on.'),
    endAdaShout: S('At the North Gate you shouted it with her, DON\'T ANSWER IT, and the hounds came to the noise, and Kaelen met them. Ada Pellow went to Tobin Ashgrove\'s voice anyway. Everyone else held on.'),
    endAdaSilent: S('At the North Gate you said nothing, and Ada Pellow went to Tobin Ashgrove\'s voice, and a Tanner cousin went after a voice that called him Mam. Everyone else held on.'),
  };

  // ================================================================ the voices: TX key -> recorded lines, in the book's order
  const VO = {
    quarry: ['tobiah.green.road'],
    town: ['lyra_ruined.green.gate', 'kaelen.green.isee'],
    bakery: ['townswoman.green.punched'],
    well: ['lyra_ruined.green.behind'],
    square: ['lyra_ruined.green.orla', 'rooke.green.couldnot', 'rooke.green.go'],
    orla: ['orla.green.late'],
    orla2: ['lyra_ruined.green.hurt', 'orla.green.held', 'orla.green.now'],
    orlaHounds: ['kaelen.green.line', 'lyra_ruined.green.closed', 'kaelen.green.open'],
    squareBack: ['kaelen.green.line', 'lyra_ruined.green.closed', 'kaelen.green.open'],
    hedgeLark: ['wearer.green.lark'], hedgeLark2: ['wearer.green.lark2'], hedgeTam: ['wearer.green.tam'], hedgeLyra: ['wearer.green.lyra'], hedgeDavin: ['wearer.green.davin'],
    dont: ['lyra_ruined.green.dont', 'lyra_ruined.green.dont2'],
    ada: ['ada.green.tobin', 'ada.green.isthatyou', 'wearer.green.helloada'],
    adaAfter: ['wearer.green.easy'],
    chapel: ['kaelen.green.lookup'],
  };
  const MSGS = ['bakery', 'hedgeLark', 'hedgeLark2', 'hedgeTam', 'hedgeLyra', 'hedgeDavin', 'adaAfter'];
  MSG_VO = new Map(MSGS.map((k) => [TX[k], VO[k]]));
  CARD_VO = Object.keys(VO).filter((k) => !MSGS.includes(k)).map((k) => [TX[k], VO[k]]);

  // ================================================================ the ground
  const GATE = { x: 23.5, y: 5.5, r: 5.5 };          // the lozenge of mud inside the North Gate
  const BLOCK = [21.6, 2.6];                           // the mounting-block by the gatepost
  const LANES = [[23.5, 5.0], [23.5, 51.6]];           // Lyra and Kaelen go down the main road to the tannery lane
  const CORRIDOR = [[23.5, 52.6], [23.5, 29.6]];       // the well-head, north over the Flume bridge, to the square
  const TO_ORLA = [[23.5, 29.6], [23.5, 40.5], [29.0, 40.5]];
  const SQUARE = [23.5, 26.0];
  const PIECES = [['churchyard', 12.0], ['bakery', 19.0], ['carter', 35.4], ['hollow', 48.0]];   // by Lyra's place on the lanes
  const DOORWAYS = [[21.0, 47.2], [26.0, 44.6], [21.0, 41.6], [26.0, 38.2], [21.0, 33.6], [26.0, 31.4]];
  const PACE_LANES = 1.5, PACE_LINE = 0.75, SPACING = 0.85, LINE0 = 6, HOLD_SECS = 40, SHOUT_SECS = 22;
  const SHEAF_ROOT = [[0, 174], [8, 174]], SHEAF = [[0, 174], [0.8, 196], [1.6, 220], [2.4, 196], [3.2, 174], [4.0, 196], [4.8, 233], [5.6, 220], [6.4, 196], [7.2, 174], [8, 174]];
  const FOURTH_ROOT = [[0, 174], [4, 174]], FOURTH = [[0, 220], [1.0, 262], [2.0, 294], [3.0, 262], [4, 262]];

  const stage = () => (hasG() && F().g44) | 0;
  const setStage = (n) => { F().g44 = n; };
  const live = () => hasG() && !guest() && !!F().greening && !F().escaped && !F().part3 && !F().part4 && ((G.escapeTimer || 0) > 0 || ((F().g44 | 0) >= 1 && (F().g44 | 0) <= 5));   // only while the escape runs
  const active = () => live() && stage() >= 1 && stage() <= 5;
  const R = { drone: 0, lyraWait: 0, hounds: 0, hold: 0, gt: -1, gi: 0, after: -1, shoutT: 0, greenT: 0, said: {} };

  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._g44 === k);
  function put(m, k, e) {
    let have = keyed(m, k); if (have) return have;
    e = Object.assign(e, { transient: true, _decor: true, nopick: true, _g44: k });
    if (e.kind === 'enemy' && typeof hydrate === 'function') e = Object.assign(hydrate(e), { transient: true, _g44: k });
    m.entities.push(e); return e;
  }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._g44 && pred(e)) m.entities.splice(i, 1); } }
  const polyLen = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]); return L; };
  function along(P, d, off) {
    off = off || 0;
    if (d <= 0) { const [ax, ay] = P[0], [bx, by] = P[1], s = dist(ax, ay, bx, by), ux = (bx - ax) / s, uy = (by - ay) / s; return { x: ax + ux * d - uy * off, y: ay + uy * d + ux * off, dir: Math.atan2(uy, ux) }; }
    let left = d;
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], s = dist(ax, ay, bx, by), ux = (bx - ax) / s, uy = (by - ay) / s;
      if (left <= s || i === P.length - 1) { const t = Math.min(1, left / s); return { x: ax + ux * s * t - uy * off, y: ay + uy * s * t + ux * off, dir: Math.atan2(uy, ux) }; }
      left -= s;
    }
    return { x: P[0][0], y: P[0][1], dir: 0 };
  }
  const fig = (m, k, sprite, x, y, o) => put(m, k, Object.assign({ kind: 'deco', sprite, x, y, scale: 1.0, solid: false, radius: 0.25, facing: Math.PI / 2 }, o || {}));
  const lineN = () => Math.max(0, (F().g44_line | 0));
  const tailD = () => (F().g44_d || 0) - 1.3 - (lineN() - 1) * SPACING;

  // ================================================================ staging (transient, again on every load)
  function stageTown(m) {
    if (!m || m.id !== 'oakhaven' || !live()) return;
    const s = stage(), f = F();
    const ly = fig(m, 'lyra', 'lyra', 0, 0), ka = fig(m, 'kaelen', 'kaelen', 0, 0, { lightCol: [18, 66, 58] });
    ly.label = 'Lyra Ashgrove'; ka.label = 'Kaelen Vance';
    if (s <= 1) {
      const p = along(LANES, f.g44_l || 0); ly.x = p.x; ly.y = p.y; ly.facing = p.dir; const q = along(LANES, (f.g44_l || 0) - 1.1, 0.6); ka.x = q.x; ka.y = q.y; ka.facing = q.dir;
      // the pieces stand where the book has them, for anyone who stops to look
      fig(m, 'baker', 'townswoman', 21.2, 19.2, { solid: true, radius: 0.3, facing: 0, use: 'g44_look', label: TX.lookBaker, look: TX.lookBakerText });
      fig(m, 'carter', 'townsman', 25.4, 35.6, { solid: true, radius: 0.3, facing: Math.PI, scale: 0.8, yOff: -0.06, use: 'g44_look', label: TX.lookCarter, look: TX.lookCarterText });
    }
    if (s === 2) placeLine(m);
    if (s === 2) DOORWAYS.forEach(([x, y], i) => { if (!((f.g44_pulled || []).includes(i))) fig(m, 'door' + i, i % 2 ? 'townsman' : 'townswoman', x, y, { solid: true, radius: 0.3, facing: x < 23.5 ? 0 : Math.PI, use: 'g44_pull', _door: i, label: TX.lookDoor, look: TX.lookDoorText }); });
    if (s === 3 || (s === 4 && f.g44_hold)) { placeSquare(m); }
    if (s === 4 && !f.g44_hold) { placeSquare(m); const p = along(TO_ORLA, f.g44_o || 0); ly.x = p.x; ly.y = p.y; ly.facing = p.dir; const q = along(TO_ORLA, (f.g44_o || 0) - 1.1, 0.6); ka.x = q.x; ka.y = q.y; }
    if (s === 4 && f.g44_hold) { ly.hidden = true; ka.hidden = true; }
    if (s === 5) placeGate(m);
  }
  function placeLine(m) {
    const f = F(), n = lineN(), d = f.g44_d || 0;
    const ly = keyed(m, 'lyra'), ka = keyed(m, 'kaelen');
    const p = along(CORRIDOR, d); if (ly) { ly.x = p.x; ly.y = p.y; ly.facing = p.dir; ly.hidden = false; }
    const q = along(CORRIDOR, d + 1.1, 0.7); if (ka) { ka.x = q.x; ka.y = q.y; ka.facing = q.dir; ka.hidden = false; }
    for (let i = 0; i < 16; i++) {
      const k = 'line' + i, e = keyed(m, k);
      if (i >= n) { if (e) e.hidden = true; continue; }
      const sprite = i === 0 ? 'hetty' : i === 2 ? 'bettany' : (i === 4 && f.g44_rooke ? 'rooke' : (i % 2 ? 'townsman' : 'townswoman'));
      const o = fig(m, k, sprite, 0, 0, { solid: false, radius: 0.25 }); o.sprite = sprite; o.hidden = false;
      const r = along(CORRIDOR, d - 1.3 - i * SPACING, (i % 2 ? 0.25 : -0.25)); o.x = r.x; o.y = r.y; o.facing = r.dir;
      o.scale = i === 3 || i === 5 ? 0.7 : 1.0;   // the children, in the middle where Bettany put them
    }
  }
  function placeSquare(m) {
    const n = lineN();
    for (let i = 0; i < 16; i++) {
      const e = keyed(m, 'line' + i); if (!e) { if (i < n) fig(m, 'line' + i, i % 2 ? 'townsman' : 'townswoman', 0, 0); }
      const o = keyed(m, 'line' + i); if (!o) continue;
      if (i >= n) { o.hidden = true; continue; }
      o.hidden = false; o.x = SQUARE[0] - 2.4 + (i % 4) * 1.6; o.y = SQUARE[1] - 1.2 + Math.floor(i / 4) * 1.2; o.facing = -Math.PI / 2;
    }
    const rk = fig(m, 'rooke', 'rooke', SQUARE[0] + 3.2, SQUARE[1] + 0.4, { facing: Math.PI }); rk.hidden = false;
  }
  function placeGate(m) {
    drop(m, (e) => /^(line|door|baker|carter|rooke)/.test(e._g44));
    const ly = keyed(m, 'lyra'), ka = keyed(m, 'kaelen');
    if (ly) { ly.hidden = false; ly.x = BLOCK[0]; ly.y = BLOCK[1]; ly.facing = Math.PI / 2; }
    if (ka) { ka.hidden = false; ka.x = BLOCK[0] + 0.7; ka.y = BLOCK[1] + 0.3; ka.facing = Math.PI / 2; }
    fig(m, 'block', 'p20_stone', BLOCK[0], BLOCK[1] - 0.1, { scale: 0.6, solid: false, radius: 0.2 });
    // the four hundred: a crowd standing in the mud, facing the thorn
    let i = 0;
    for (let y = 2.6; y <= 11.4; y += 1.0) for (let x = 16.6; x <= 30.4; x += 1.1) {
      if (Math.abs(x - 23.5) < 1.0 && y < 5.4) continue;          // a lane to the thorn
      if (Math.hypot(x - BLOCK[0], y - BLOCK[1]) < 1.3 || Math.hypot(x - 27.4, y - 2.6) < 1.0) continue;   // the block; Ada's place
      if (typeof solidAt === 'function' && (solidAt(x, y) || solidAt(x + 0.3, y) || solidAt(x - 0.3, y))) continue;
      const sp = ['townsman', 'townswoman', 'townsman', 'townswoman', 'legionnaire', 'townswoman'][i % 6];
      fig(m, 'crowd' + i, sp, x + ((i * 37) % 7) * 0.04, y, { facing: -Math.PI / 2, scale: sp === 'legionnaire' ? 1.0 : 0.94 + ((i * 13) % 5) * 0.02 }); i++;
    }
    fig(m, 'ada', 'townswoman', 27.4, 2.6, { facing: -Math.PI / 2, label: 'Ada Pellow' }).hidden = (F().g44_gate | 0) >= 3;
  }

  // ================================================================ 0 · the quarry; 1 · the town and the lanes
  function quarry() {
    const f = F(); if (f.g44_quarry) return; f.g44_quarry = true;
    card(TX.quarryTitle, TX.quarry, [{ t: TX.quarryGo, f: null }]);
  }
  function arriveTown() {
    const f = F(); if (stage() !== 0) return;
    setStage(1); f.g44_l = 0; f.g44_pieces = 0;
    journal('main', TX.jTown);
    stageTown(G.map);
    card(TX.townTitle, TX.town, [{ t: TX.townGo, f: () => say(TX.gateShut, 'warn', 6000) }]);
  }
  function tickLanes(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map; if (!keyed(m, 'lyra')) stageTown(m);
    const f = F(), ly = keyed(m, 'lyra'), ka = keyed(m, 'kaelen'), L = polyLen(LANES);
    const near = dist(px(), py(), ly.x, ly.y) < 7.5;
    if (near) { f.g44_l = Math.min(L, (f.g44_l || 0) + dt * PACE_LANES); R.lyraWait = 0; }
    else { R.lyraWait += dt; if (R.lyraWait > 4 && !R.said.wait) { R.said.wait = true; say(TX.lyraWaits, 'warn', 4500); } }
    const p = along(LANES, f.g44_l); ly.x = p.x; ly.y = p.y; ly.facing = p.dir;
    const q = along(LANES, f.g44_l - 1.1, 0.6); ka.x = q.x; ka.y = q.y; ka.facing = q.dir;
    const ny = p.y;
    while ((f.g44_pieces | 0) < PIECES.length && ny >= PIECES[f.g44_pieces | 0][1]) { const k = PIECES[f.g44_pieces | 0][0]; f.g44_pieces = (f.g44_pieces | 0) + 1; say(TX[k], k === 'hollow' ? 'warn' : '', 9000); }
    if (f.g44_l >= L - 0.05 && dist(px(), py(), ly.x, ly.y) < 6) startCorridor();
  }

  // ================================================================ 2 · the corridor
  function startCorridor() {
    const f = F(); if (stage() !== 1) return;
    setStage(2); f.g44_d = 0; f.g44_line = LINE0; f.g44_pulled = []; f.g44_lost = 0; f.g44_joins = 0; R.hounds = 0; R.greenT = 0;
    drop(G.map, (e) => e._g44 === 'baker' || e._g44 === 'carter');
    stageTown(G.map);
    card(TX.wellTitle, TX.well, [{ t: TX.wellGo, f: () => { journal('main', TX.jCorridor); say(TX.corridorHint, 'warn', 9000); } }]);
  }
  function pull(e) {
    const f = F(); if (stage() !== 2 || e._door == null) return false;
    const pulled = f.g44_pulled || (f.g44_pulled = []);
    if (!pulled.includes(e._door)) { pulled.push(e._door); f.g44_line = Math.min(16, lineN() + 1); }
    drop(G.map, (o) => o === e); say(TX.pulled, 'good', 4000); placeLine(G.map);
    return true;
  }
  function nearLine() {
    const m = G.map; let best = Infinity;
    for (const e of m.entities) if (e && e._g44 && (e._g44 === 'lyra' || /^line/.test(e._g44)) && !e.hidden) best = Math.min(best, dist(px(), py(), e.x, e.y));
    return best;
  }
  function tickCorridor(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map; if (!keyed(m, 'lyra') || !keyed(m, 'line0')) stageTown(m);
    const f = F(), L = polyLen(CORRIDOR), near = nearLine();
    if (near < 9.5) f.g44_d = Math.min(L, (f.g44_d || 0) + dt * PACE_LINE);
    else if (!R.said.holds) { R.said.holds = true; say(TX.lyraHolds, 'warn', 5000); }
    placeLine(m);
    const d = f.g44_d || 0, j = f.g44_joins | 0;
    // the others pull people in too: Hetty, Bettany, the dye-works women, Rooke
    const joins = [[3, 'hettyPulls'], [7, 'dyeWomen'], [11, 'bettanyPulls'], [15, 'rookeComes']];
    if (j < joins.length && d >= joins[j][0]) {
      f.g44_joins = j + 1; say(TX[joins[j][1]], '', 7000);
      if (joins[j][1] === 'rookeComes') { f.g44_rooke = true; f.g44_line = Math.min(16, lineN() + 1); }
      else if (joins[j][1] !== 'bettanyPulls') {   // they take the nearest doorway you have not reached
        const left = DOORWAYS.map((p, i) => i).filter((i) => !(f.g44_pulled || []).includes(i));
        const ly = keyed(m, 'lyra'); left.sort((a, b) => dist(DOORWAYS[a][0], DOORWAYS[a][1], ly.x, ly.y) - dist(DOORWAYS[b][0], DOORWAYS[b][1], ly.x, ly.y));
        if (left.length) { const i = left[0]; f.g44_pulled.push(i); f.g44_line = Math.min(16, lineN() + 1); drop(m, (o) => o._g44 === 'door' + i); }
      }
      placeLine(m);
    }
    if (d >= 8 && !f.g44_wake) { f.g44_wake = true; say(TX.lineWake, '', 8000); }
    // hounds, for the tail, three of them over the walk
    if (R.hounds < 3 && d >= [4, 11, 17][R.hounds]) { R.hounds++; spawnTailHound(m); }
    for (const e of m.entities) {
      if (!e || e._g44 !== 'tailhound' || e.dead || e.hidden) continue;
      const t = along(CORRIDOR, tailD());
      if (dist(px(), py(), e.x, e.y) > 3.0) {   // the player is not on it: it goes for the tail
        const dx = t.x - e.x, dy = t.y - e.y, l = Math.hypot(dx, dy) || 1;
        e.x += dx / l * Math.min(l, dt * 2.1); e.y += dy / l * Math.min(l, dt * 2.1); e.state = 'chase';
      }
      if (dist(e.x, e.y, t.x, t.y) < 0.9 && lineN() > 2) {
        f.g44_lost = (f.g44_lost | 0) + 1; f.g44_line = lineN() - 1; e.dead = true; e.hidden = true; say(TX.houndTook, 'bad', 6000); placeLine(m);
      }
    }
    // stray from the line and the green takes your boots
    if (near > 4.0) {
      R.greenT += dt;
      if (R.greenT > 1.5) { if (!R.said.green) { R.said.green = true; say(TX.inGreen, 'bad', 5000); } const p = G.player; p.hp = Math.max(1, p.hp - dt * 2.5); }
    } else R.greenT = Math.max(0, R.greenT - dt * 2);
    R.inGreen = R.greenT > 1.5;
    if (d >= L - 0.05) arriveSquare();
  }
  function spawnTailHound(m) {
    const p = along(CORRIDOR, tailD() - 6.5);
    const x = (typeof solidAt === 'function' && solidAt(p.x, p.y)) ? 23.5 : p.x;
    m.entities.push(Object.assign(hydrate({ kind: 'enemy', type: 'hound', x, y: p.y }), { transient: true, _g44: 'tailhound', state: 'chase' }));
    say(TX.houndBehind, 'bad', 5000);
    try { Audio_.sfx.hound(); } catch (err) { /* silent */ }
  }

  // ================================================================ 3 · the square
  function arriveSquare() {
    if (stage() !== 2) return;
    setStage(3); placeSquare(G.map);
    for (const e of G.map.entities) if (e && e._g44 === 'tailhound') { e.dead = true; e.hidden = true; }
    card(TX.squareTitle, TX.square, [
      { t: TX.squareWithLyra, f: () => { setStage(4); F().g44_hold = 0; F().g44_o = 0; say(TX.squareLyraGoes, '', 6000); } },
      { t: TX.squareWithRooke, f: () => { setStage(4); F().g44_hold = 1; R.hold = HOLD_SECS; R.sqLost = 0; R.hounds = 0; const m = G.map; const ly = keyed(m, 'lyra'), ka = keyed(m, 'kaelen'); if (ly) ly.hidden = true; if (ka) ka.hidden = true; say(TX.holdHint, 'warn', 8000); } },
    ]);
  }
  function tickToOrla(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map; if (!keyed(m, 'lyra')) stageTown(m);
    const f = F(), ly = keyed(m, 'lyra'), ka = keyed(m, 'kaelen'), L = polyLen(TO_ORLA);
    if (dist(px(), py(), ly.x, ly.y) < 7.5) f.g44_o = Math.min(L, (f.g44_o || 0) + dt * PACE_LANES);
    const p = along(TO_ORLA, f.g44_o); ly.x = p.x; ly.y = p.y; ly.facing = p.dir;
    const q = along(TO_ORLA, f.g44_o - 1.1, 0.6); ka.x = q.x; ka.y = q.y;
  }
  function tickSquare(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map; if (!keyed(m, 'rooke')) stageTown(m);
    const f = F();
    if (R.hold <= 0 && !R.holdDone) R.hold = HOLD_SECS;
    R.hold -= dt;
    if (R.hounds < 3 && R.hold <= [34, 22, 12][R.hounds]) {
      R.hounds++;
      const a = [[-1, 0], [1, 0], [0, 1]][R.hounds - 1], hx = SQUARE[0] + a[0] * 6.5, hy = SQUARE[1] + a[1] * 6.5 - 0.2;
      m.entities.push(Object.assign(hydrate({ kind: 'enemy', type: 'hound', x: hx, y: hy }), { transient: true, _g44: 'sqhound', state: 'chase' }));
      say(TX.houndBehind, 'bad', 4000); try { Audio_.sfx.hound(); } catch (err) { /* silent */ }
    }
    for (const e of m.entities) {
      if (!e || e._g44 !== 'sqhound' || e.dead || e.hidden) continue;
      let tgt = null, best = Infinity;
      for (const o of m.entities) if (o && /^line/.test(o._g44 || '') && !o.hidden) { const dd = dist(e.x, e.y, o.x, o.y); if (dd < best) { best = dd; tgt = o; } }
      if (!tgt) continue;
      if (dist(px(), py(), e.x, e.y) > 3.0) { const dx = tgt.x - e.x, dy = tgt.y - e.y, l = Math.hypot(dx, dy) || 1; e.x += dx / l * Math.min(l, dt * 1.9); e.y += dy / l * Math.min(l, dt * 1.9); }
      if (best < 0.8 && lineN() > 2) { R.sqLost = (R.sqLost | 0) + 1; f.g44_lost = (f.g44_lost | 0) + 1; f.g44_line = lineN() - 1; e.dead = true; e.hidden = true; say(TX.houndTook, 'bad', 5000); placeSquare(m); }
    }
    if (R.hold <= 0 && !R.holdDone) {
      R.holdDone = true;
      f.g44_whole = !(R.sqLost > 0); f.g44_orla = 'one';
      for (const e of m.entities) if (e && e._g44 === 'sqhound') { e.dead = true; e.hidden = true; }
      journal('main', TX.jOrlaOne);
      card(TX.squareTitle, TX.squareBack + '<br><br>' + (f.g44_whole ? TX.squareWhole : fmt(TX.squareNotWhole, R.sqLost)), [{ t: TX.orlaGo, f: () => toGate() }]);
    }
  }

  // ================================================================ 4 · Orla's tree
  function stageOrla(m) {
    if (!m || m.id !== 'orla_house' || stage() !== 4 || F().g44_hold) return;
    for (const e of m.entities) if (e && e.kind === 'npc' && e.id === 'orla') { e.label = 'Orla Hale, in the tree'; }
    fig(m, 'tree', 'oak', 4.5, 2.7, { scale: 1.35, solid: true, radius: 0.45, yOff: -0.02 });
    fig(m, 'lyra', 'lyra', 5.4, 3.9, { facing: -Math.PI * 0.75 });
    fig(m, 'kaelen', 'kaelen', 7.6, 5.0, { facing: Math.PI, lightCol: [18, 66, 58] });
  }
  function atOrla() {
    const f = F(); if (stage() !== 4 || f.g44_hold || f.g44_orla) return;
    stageOrla(G.map);
    card(TX.orlaTitle, TX.orla, [{ t: TX.orlaCross, f: () => {
      const ch = [];
      if (fsheaf()) ch.push({ t: TX.orlaSecond, f: () => sheaf('two') });
      ch.push({ t: TX.orlaRoot, f: () => sheaf('root') });
      ch.push({ t: TX.orlaDoor, f: () => orlaDone('door', 1) });
      card(TX.orlaTitle, TX.orla2, ch);
    } }]);
  }
  const fsheaf = () => (F().p12f_q | 0) === 2 || !!F().g44_knows_sheaf;
  async function sheaf(how) {
    const f = F(); let a = 0.5, b = 0.5;
    const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
    if (Rd) {
      try {
        const band = Rd.bandFor ? Rd.bandFor(0) : 105;
        const r1 = await Rd.holdPitch({ curve: how === 'two' ? SHEAF : SHEAF_ROOT, width: band, duration: 8, title: TX.sheafTitle, hint: TX.sheafHint });
        a = r1 && !r1.aborted ? r1.score : 0;
        const r2 = await Rd.holdPitch({ curve: how === 'two' ? FOURTH : FOURTH_ROOT, width: Math.max(20, band * 0.45), duration: 4, title: TX.fourthTitle, hint: TX.fourthHint });
        b = r2 && !r2.aborted ? r2.score : 0;
      } catch (e) { warnOnce('sheaf', e); }
    }
    f.g44_sheaf = Math.round(((a + b) / 2) * 100) / 100; f.g44_fourth = Math.round(b * 100) / 100;
    orlaDone(how, b);
  }
  function orlaDone(how, fourth) {
    const f = F();
    const held = how !== 'door' && fourth >= 0.5;
    f.g44_orla = how === 'two' ? (held ? 'two' : 'root') : how;
    const body = (how === 'two' && held ? TX.orlaTwo : how === 'door' ? TX.orlaOne : TX.orlaRootText) + (how !== 'door' && !held ? '<br><br>' + TX.orlaPoor : '');
    journal('main', f.g44_orla === 'two' ? TX.jOrlaTwo : TX.jOrlaOne);
    try { Audio_.sfx.fifth(); } catch (e) { /* cosmetic */ }
    card(TX.orlaTitle, body, [{ t: TX.orlaGo, f: () => card(TX.orlaTitle, TX.orlaHounds, [{ t: TX.orlaGo, f: () => toGate() }]) }]);
  }

  // ================================================================ 5 · the North Gate
  function toGate() {
    const f = F(); setStage(5); f.g44_gate = 0; R.gt = -1; R.gi = 0; R.after = -1;
    if (G.mapId === 'orla_house') { try { loadMap('oakhaven', { x: 29.5, y: 40.5, dir: -Math.PI / 2 }); } catch (e) { warnOnce('out', e); } }
    if (G.mapId === 'oakhaven') { stageTown(G.map); for (let i = 0; i < 2; i++) G.map.entities.push(Object.assign(hydrate({ kind: 'enemy', type: 'hound', x: px() + (i ? 4 : -4), y: py() - 3 }), { transient: true, _g44: 'gatehound' })); }
  }
  const HEDGE = [[0, 'hedgeLark'], [2.6, 'hedgeLark2'], [10, 'hedgeTam'], [15, 'hedgeLyra'], [20, 'hedgeDavin'], [24, 'hedgeYou'], [27, 'hinge']];
  function tickGate(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map, f = F(); if (!keyed(m, 'crowd0')) stageTown(m);
    const g = f.g44_gate | 0;
    if (g === 0) {
      if (dist(px(), py(), GATE.x, GATE.y) < GATE.r + 1.5) { f.g44_gate = 1; card(TX.gateTitle, TX.gate, [{ t: TX.gateGo, f: () => { R.gt = 0; R.gi = 0; } }]); }
      return;
    }
    if (g === 1 && R.gt >= 0) {
      R.gt += dt;
      while (R.gi < HEDGE.length && R.gt >= HEDGE[R.gi][0]) {
        const k = HEDGE[R.gi][1]; R.gi++;
        if (k === 'hedgeYou') { if (f.hedge_answered) say(fmt(TX.hedgeYou, G.player.name), 'voice', 6000); continue; }
        if (k === 'hinge') { say(TX.hinge, 'warn', 4000); f.g44_gate = 2; R.gt = -1; card(TX.dontTitle, TX.dont, [
          { t: TX.dontBeside, f: () => { f.g44_shout = 'beside'; say(TX.beside, '', 6000); R.after = 0; } },
          { t: TX.dontShout, f: () => { f.g44_shout = 'shout'; say(TX.shout, 'bad', 7000); try { addNoise(6); } catch (e) { /* noise is a bonus */ } R.shoutT = SHOUT_SECS; R.after = -1; spawnCrowdHounds(m); } },
          { t: TX.dontSilent, f: () => { f.g44_shout = 'silent'; say(TX.silent, '', 6000); R.after = 0; } },
        ]); return; }
        say(TX[k], 'voice', 7000);
      }
      return;
    }
    if (g === 2) {
      if (f.g44_shout === 'shout' && R.after < 0) {
        R.shoutT -= dt;
        const left = m.entities.filter((e) => e && e._g44 === 'crowdhound' && !e.dead && !e.hidden);
        if (!left.length || R.shoutT <= 0) { for (const e of left) { e.dead = true; e.hidden = true; } R.after = 0; }
      }
      if (R.after >= 0) { R.after += dt; if (R.after > 3) { R.after = -1; adaGoes(); } }
    }
  }
  function spawnCrowdHounds(m) {
    say(TX.shoutHounds, 'bad', 6000);
    for (let i = 0; i < 3; i++) m.entities.push(Object.assign(hydrate({ kind: 'enemy', type: 'hound', x: 18.2 + i * 5.3, y: 11.4 }), { transient: true, _g44: 'crowdhound', state: 'chase' }));
    try { Audio_.sfx.hound(); } catch (e) { /* silent */ }
  }
  function adaGoes() {
    const f = F(); if ((f.g44_gate | 0) >= 3) return;
    f.g44_gate = 3;
    const ada = keyed(G.map, 'ada'); if (ada) ada.hidden = true;
    const names = G.ledger || (G.ledger = []);
    if (!names.some((r) => r && r.name === 'Ada Pellow')) names.push({ name: 'Ada Pellow', where: TX.ledgerAda, day: G.day });
    const reed = f.p9q_pellow_done === true;
    card(TX.adaTitle, TX.ada + (reed ? '<br><br>' + TX.adaReed : ''), [{ t: TX.adaGo, f: () => {
      say(TX.adaAfter, 'voice', 8000);
      if (f.g44_shout === 'silent') setTimeout(() => { try { say(TX.silentOne, 'bad', 6000); } catch (e) { /* cosmetic */ } }, 2500);
      R.chapelAt = 6;
    } }]);
  }
  function tickAfter(dt) {
    if (R.chapelAt == null) return;
    R.chapelAt -= dt; if (R.chapelAt > 0) return;
    R.chapelAt = null; noteStops();
  }
  function noteStops() {
    const f = F(); if ((f.g44_gate | 0) >= 4) return;
    f.g44_gate = 4; f.g44_note_stopped = true;
    // the Pure Note stops: every sound drops out for two beats
    try { const mg = Audio_.master, ctx = Audio_.ctx; if (mg && ctx) { const v = mg.gain.value, t = ctx.currentTime; mg.gain.cancelScheduledValues(t); mg.gain.setValueAtTime(v, t); mg.gain.linearRampToValueAtTime(0, t + 0.08); mg.gain.setValueAtTime(0, t + 2.1); mg.gain.linearRampToValueAtTime(v, t + 2.6); } } catch (e) { warnOnce('note', e); }
    journal('main', TX.jGate);
    card(TX.chapelTitle, TX.chapel, [{ t: TX.chapelGo, f: () => { if (typeof ROPE45 !== 'undefined' && ROPE45.stage() === 0) { try { ROPE45.begin(); return; } catch (e) { warnOnce('rope', e); } } setStage(6); try { ending(); } catch (e) { warnOnce('ending', e); } } }]);
  }

  // ================================================================ the end card's lines (game.js ending())
  function endLines() {
    if (!hasG()) return [];
    const f = F(), out = [];
    if (f.g44_orla) out.push({ two: TX.endOrlaTwo, root: TX.endOrlaRoot, one: TX.endOrlaOne, door: TX.endOrlaDoor }[f.g44_orla] || TX.endOrlaOne);
    if ((f.g44 | 0) >= 3) out.push(fmt(TX.endLine, (f.g44_lost | 0) > 0 ? fmt(TX.endLineLost, f.g44_lost | 0) : ''));
    if ((f.g44_gate | 0) >= 3) out.push(f.g44_shout === 'shout' ? TX.endAdaShout : f.g44_shout === 'silent' ? TX.endAdaSilent : TX.endAda);
    return out;
  }

  // ================================================================ the clock, the drone, the HUD
  function withScene() {
    const s = stage(), f = F();
    if (G.mapId === 'orla_house') return s === 4;
    if (G.mapId !== 'oakhaven') return false;
    if (s === 1) { const ly = keyed(G.map, 'lyra'); return !!ly && dist(px(), py(), ly.x, ly.y) < 12; }
    if (s === 2) return nearLine() < 6;
    if (s === 3) return true;
    if (s === 4) { if (f.g44_hold) return dist(px(), py(), SQUARE[0], SQUARE[1]) < 9; const ly = keyed(G.map, 'lyra'); return !!ly && dist(px(), py(), ly.x, ly.y) < 10; }
    if (s === 5) return (f.g44_gate | 0) >= 1 || dist(px(), py(), GATE.x, GATE.y) < 30;
    return false;
  }
  function drawOverlay() {
    if (!active() || G.state !== 'play' || G.mapId !== 'oakhaven') return;
    const ctx = Engine.ctx; if (!ctx) return;
    const s = stage(), f = F();
    ctx.save(); ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'center';
    const Y = (typeof VIEW_H === 'number' ? VIEW_H : 150) - 30;
    if (s === 1) { ctx.fillStyle = '#7fe060'; ctx.fillText(TX.hudLanes, 160, Y); }
    else if (s === 2) { ctx.fillStyle = R.inGreen ? '#ff6a40' : '#7fe060'; ctx.fillText(R.inGreen ? TX.hudGreen : TX.hudCircle + ' · ' + lineN() * 5 + ' ' + TX.hudInLine + ((f.g44_lost | 0) ? ' · ' + f.g44_lost * 5 + ' ' + TX.hudLost : ''), 160, Y); }
    else if (s === 4 && f.g44_hold && !R.holdDone) { ctx.fillStyle = '#d9a441'; ctx.fillText(TX.hudSquare + ' · ' + Math.max(0, Math.ceil(R.hold)), 160, Y); }
    else if (s === 5) { ctx.fillStyle = f.g44_shout === 'shout' && R.after < 0 && (f.g44_gate | 0) === 2 ? '#ff6a40' : '#e8ecf4'; ctx.fillText(f.g44_shout === 'shout' && R.after < 0 && (f.g44_gate | 0) === 2 ? TX.hudShout : TX.hudGate, 160, Y); }
    ctx.restore();
  }
  function tick(dt) {
    if (!live()) return;
    if (G.state !== 'play') return;
    const s = stage(), f = F();
    try {
      if (s >= 1 && s <= 5) {
        if (withScene() && G.escapeTimer > 0) G.escapeTimer = Math.max(60, G.escapeTimer + dt);   // with the line, the hour does not run
        if (!f.g44_note_stopped && G.mapId === 'oakhaven') { R.drone += dt; if (R.drone > 2.4) { R.drone = 0; try { Audio_.sfx.song(528, 2.6); } catch (e) { /* silent */ } } }
      }
      if (s === 1) tickLanes(dt);
      else if (s === 2) tickCorridor(dt);
      else if (s === 4 && f.g44_hold) tickSquare(dt);
      else if (s === 4) tickToOrla(dt);
      else if (s === 5) { tickGate(dt); tickAfter(dt); }
    } catch (e) { warnOnce('tick' + s, e); }
  }
  function onLoad() {
    if (!live()) return;
    const m = G.map, s = stage();
    if (m && m.id === 'quarry' && s === 0) quarry();
    if (m && m.id === 'oakhaven') { if (s === 0) arriveTown(); else stageTown(m); }
    if (m && m.id === 'orla_house' && s === 4 && !F().g44_hold) atOrla();
  }
  function useOwn(e) {
    if (!e || !e._g44) return false;
    if (e.use === 'g44_pull') return pull(e);
    if (e.use === 'g44_look') { say(e.look || e.label || '', '', 6000); return true; }
    return false;
  }
  function wire() {
    if (typeof update === 'function') { const _u = update; update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; }; }
    if (typeof drawHUD === 'function') { const _d = drawHUD; drawHUD = function () { const r = _d.apply(this, arguments); try { drawOverlay(); } catch (e) { warnOnce('hud', e); } return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof loadMap === 'function') { const _lm = loadMap; loadMap = function () { const r = _lm.apply(this, arguments); try { onLoad(); } catch (e) { warnOnce('load', e); } return r; }; }
    if (typeof transfer === 'function') {
      const _t = transfer;
      transfer = function (portal) {
        try { if (portal && portal.map === 'clearing' && G.mapId === 'oakhaven' && active()) { say((F().g44 | 0) >= 5 ? TX.gateThorn : TX.gateShut, 'warn', 5000); return; } } catch (e) { warnOnce('gate', e); }
        return _t.apply(this, arguments);
      };
    }
    if (typeof restoreGame === 'function') { const _rg = restoreGame; restoreGame = function () { const r = _rg.apply(this, arguments); try { Object.assign(R, { gt: -1, gi: 0, after: (F().g44_gate | 0) === 2 && F().g44_shout ? 0 : -1, holdDone: false, hold: 0, chapelAt: (F().g44_gate | 0) === 3 ? 2 : null }); onLoad(); } catch (e) { warnOnce('restore', e); } return r; }; }
  }
  try { wire(); } catch (e) { console.warn('greening44 failed to wire', e); }

  return { TX, TEXTS, VO, R, GATE, BLOCK, LANES, CORRIDOR, TO_ORLA, SQUARE, DOORWAYS, stage, live, active, seq, hush, along, polyLen, tailD, lineN,
    arriveTown, startCorridor, arriveSquare, atOrla, sheaf, orlaDone, toGate, adaGoes, noteStops, endLines, pull, tick, withScene,
    consts: { PACE_LANES, PACE_LINE, SPACING, LINE0, HOLD_SECS, SHOUT_SECS } };
})();
if (typeof window !== 'undefined') window.GREEN44 = GREEN44;
