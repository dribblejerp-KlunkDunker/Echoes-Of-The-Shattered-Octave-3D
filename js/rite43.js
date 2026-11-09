// ============================================================
//  rite43 — the Rite of Pure Unison, from procession to pumps (Book One ch. 9–10; ROADMAP R9 item 3).
//
//  Replaces "take the shaft, seat the coil, kill two golems" with the chapters as the book has them. The traveller is a
//  stranger: the needle, the coil and the speaking-tube are Kaelen's hands, and the Rite ends the way it ends. What the
//  player does is what a stranger beside them could do:
//    1  THE PROCESSION (ch. 9). The point of no return moves from the shaft gate to Lyra's door: when the column forms
//       there with the coil in Kaelen's toolbag, you walk with it up the main road to the headframe under the Pure Note,
//       and the town hums the Root note under it, "exactly a hand's width of voice". N hums with them. A loud Song turns
//       a Flambeau's stave toward you; twice, and a Legionnaire walks you at the back.
//    2  THE VAULT. The cage, four hundred feet; the pumps, where Lyra breathes the Root note into a Hollow's wrist.
//    3  THE NEEDLE. Kaelen's hands shake. "Closer, Engineer. I must be able to see." You stand between the Inquisitor's
//       eye and the glass hand for the seconds it takes to put the wire through skin and not through her voice. Then
//       "Speak, daughter." "I. Am. Fortunate." If he saw, he makes Kaelen thread it again, and her voice pays.
//    4  THE HOLD. "Head at one span!" Lyra sings 174. Kaelen goes to the drum on the collar walk: eight bolts, forty
//       seconds if they don't watch him. You hum beside the stool, and the Factor's green lenses, which see pitch as
//       colour, stay on you. Then he seats the coil, the lock throws, the crown of glass teeth snaps, and Crane shouts
//       for the hold. "LYRA! SING IT DOWN!": Hold the Pitch on the falling fifth, with her, until the Root lets go.
//    5  THE GOLEMS. "The Consortium kept four at the casing, and the Factor turned them all at once." Two come; two are
//       stopped by "Enough." Kaelen knees one and drinks the other, and the tideline is four fingers after.
//    6  THE TUBE AND THE PUMPS. The three-note purge alarm; Aldric's sixty seconds, "Forty-one. Forty." Twelve men on
//       the pumps, the cage holds eight, four go up with Tobiah and the sisters, eight are left. Your sixty seconds are
//       spent on names: a hand on a Hollow's wrist stops him for the length of a breath, and in that breath he says who
//       he was. Then forty thousand gallons, and the Root drinks, and screams, and cracks, and grows: the Greening.
//  Missing any of it changes lines, never fails a quest. Flags: r43 (stage), r43_hum, r43_you_hum, r43_strikes,
//  r43_marched, r43_seen, r43_lenses, r43_fifth, r43_names, r43_palm, rooke_drops, lyra_voice_worse; the eight left are
//  in the ledger. Text: TX, collected in TEXTS for the French (tools/i18n/p43-rite.tsv).
// ============================================================
'use strict';

const RITE43 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('rite43: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const px = () => Engine.cam.x, py = () => Engine.cam.y;
  const say = (t, cls, ms) => { try { msg(String(t).replace(/<\/?i>/g, ''), cls || '', ms || 5200); } catch (e) { /* cosmetic */ } const ids = MSG_VO && MSG_VO.get(t); if (ids) seq(ids); };
  const loud = () => { G.stillT = 0; if (G.noise < 3) G.noise = 3; };
  const voice = (t, ms) => say(t, 'voice', ms || 6500);
  const card = (title, body, choices) => {
    const hushed = (choices || []).map((c) => Object.assign({}, c, { f: function () { hush(); return c.f && c.f.apply(this, arguments); } }));
    try { showEvent(title, body, hushed); } catch (e) { warnOnce('card', e); }
    const v = CARD_VO && CARD_VO.find(([t]) => String(body).startsWith(t)); if (v) seq(v[1]);
  };
  // the voices (voices/script.json, rendered by tools/voices/build.py): narration is not auto-played by onMsg, so the
  // Rite plays its own, one line after another; a newer card or message cuts the one before, and a choice hushes it.
  let MSG_VO = null, CARD_VO = null, voTok = 0;
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
  const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const R = { walkT: 0, doorCool: 0, bolt: 0, watched: 0, q: 0, seen: 0, needle: 0, count: 0, unhook: null, drone: 0, slow: false, kaelenAt: null };

  // ================================================================ the words
  const TX = {
    // the door, and the point of no return
    doorTitle: S('The column at the Cantor\'s door'),
    door: S('The choir comes down Cooper\'s Row first, holding the Note, and the Flambeaux with their staves of glass-fire, and the Inquisitor with the censer; behind them the Governor in his chain and the Factor in her green lenses. Two sisters in grey bring Lyra out in a white wool shift with the seams turned, a gorget of thin gold at her throat, her hair combed, and two bell-helmed Legionnaires fall in at her shoulders.<br><br>This is the Rite. Oakhaven will not be the same after today: the heists close, and when the Greening comes, the town goes with it.'),
    doorLeft: S('Still open:'),
    doorGo: S('Walk with them.'),
    doorWait: S('Not yet.'),
    gateSealed: S('The shaft gate is sealed under the Factor\'s lead until the Rite. The column forms at the Cantor\'s door on Hearthday; the Church goes down together, and so will you.'),
    jStart: S('Hearthday. They have brought Lyra out in white. The Church holds the Pure Note over Oakhaven, and I am walking with the column to the quarry. The coil is in Kaelen\'s toolbag; nobody searches the supervising engineer\'s toolbag. My work is not to let them watch him.'),
    // the procession
    hudNote: S('THE PURE NOTE · the town hums 174 under it · N hums with them'),
    oldWoman: S('Somewhere by the well-house an old woman begins to hum. Not loud. Exactly a hand\'s width of voice. The Root note.'),
    takers: S('The dye-works women take it up, and the carters, and the tannery men, so softly that no one more than ten feet away could swear to it.'),
    hettyBettany: S('Bettany, at the kerb. The baker\'s wife with flour to her elbows. Hetty Bram in the doorway of the Boar & Dulcimer with her arms folded, humming through her teeth.'),
    flambeaux: S('The Tanner cousins, and old women on stools at the crossings. The Flambeaux turn their staves this way and that, looking for the source. There is nothing to punish.'),
    lissa: S('At the front of the crowd by the headframe, Lissa Merrow stands with her bandaged forearms at her sides, humming with her mouth shut, and does not look away.'),
    lyraWeeps: S('Lyra walks between the sisters and weeps without making a sound.'),
    youHum: S('You hum the Root note under the Pure Note, a hand\'s width of voice. Nobody more than ten feet away could swear to it.'),
    staveTurns: S('A stave of glass-fire turns toward you. The Flambeau looks for a mouth, and finds yours.'),
    marched: S('A Legionnaire takes you by the arm, not roughly, and walks you to the back of the column. You have lost your place beside her.'),
    columnSlows: S('The column slows at the crossing. The Legionnaire at her shoulder looks back for you.'),
    helpedHum: S('{0} is at the kerb, and hums.'),
    helpedHumMany: S('{0} are at the kerb, and hum.'),
    lookLyra: S('Lyra Ashgrove, in white'),
    lookLyraText: S('A white wool shift with the seams turned, pale leather sandals, a gorget of thin gold "that the Light may see the instrument". She has not spoken in four days. She does not look at you, and her mouth is shut, and she is weeping.'),
    lookSister: S('A Church sister'),
    lookSisterText: S('Grey, with gold at the collar. She has honey in a stone pot and a bottle of throat-oil that smells of almonds, and she believes every word she has said for four days: <i>you are very fortunate</i>.'),
    lookCrane: S('Ignatius Crane, with the censer'),
    lookCraneText: S('The Inquisitor walks with the censer swinging, his left hand in its silk glove. He has sung three hundred sunrises of this note before. He is not looking at the town. He is listening to it.'),
    lookChoir: S('The choir, holding the Note'),
    lookChoirText: S('Five hundred and twenty-eight beats to the second, the holy number, passed from throat to throat, breath by breath, so it never breaks. It is not a loud sound. It is worse than loud. It is a lid.'),
    lookAldric: S('Governor Aldric Vance'),
    lookAldricText: S('In his chain. He does not look at the kerbs either. He is counting something.'),
    lookVosk: S('Factor Adela Vosk'),
    lookVoskText: S('Green lenses. Pitch has a colour, through them, and she is reading the colour of the town.'),
    lookGuard: S('A Carillon Legionnaire'),
    lookGuardText: S('Bell-helmed, at her shoulder. Something inside it is murmuring. You do not listen to what.'),
    lookHum: S('{0}, humming'),
    lookHumText: S('Mouth nearly shut. A hand\'s width of voice. You would not swear to it.'),
    lookSilent: S('{0}, silent'),
    lookSilentText: S('Standing at the kerb with everyone else, and not humming. Perhaps nobody gave them a reason.'),
    // the headframe and the cage
    frameTitle: S('The headframe'),
    frame: S('A stair of scaffold goes down the terraces, hung with white cloth. Both shifts have been kept on, and stand along the rails in their drab with their caps off; a line of Legionnaires holds the top terrace. In front of the headframe, on a table with a cloth over it, lies a case of black leather with the Church\'s sunburst on the lid.<br><br>Tobiah Marsh of the night shift carries it to the cage with both hands, the way you carry something at a funeral. "It\'s an honour to meet you, ma\'am. Truly. I\'m Tobiah Marsh. My mother used to take me to hear the Sky Choir." And, lower: "They say it doesn\'t hurt very much. After the first part." Lyra smiles at him, and he goes scarlet.'),
    frameHum: S('You counted {0} voices humming under the Note, from the well-house to the headframe. {1}'),
    frameYou: S('Yours was one of them.'),
    frameNotYou: S('You kept yours in your chest.'),
    frameMarched: S('You come down the terraces at the back of the column, between two bell-helms.'),
    frameGo: S('Go down with them.'),
    cageTitle: S('Four hundred feet'),
    cage: S('The cage drops four hundred feet, and the world changes twice on the way: cut stone, then clay, grey and sweating, then the chamber.<br><br>A room made out of a root. It curves up and over you like the inside of a bell, grey-brown and ridged, and every ridge has veins in it, green-gold, glowing, thick as an arm at the bottom and fine as thread at the top, and the veins pulse. The bore is a machine the size of a barn with its head buried in the wall of the Root to the collar, and it is turning, and where it goes in, the Root bleeds. The glass runs in channels cut in the platform floor to the pumps, where a dozen men in grey smocks work the handles in pairs, up and down. You do not look at a pump.'),
    cageGo: S('Step out.'),
    pumpsTitle: S('The pumps'),
    pumps: S('Lyra crosses four yards of platform and puts her hand on a pump-man\'s wrist: an old man with a wedding ring and a scar through his eyebrow, whose lips are moving. She hums a thread of the Root note, breathed rather than sung. His lips stop. For about the length of a breath, he is <i>there</i>.<br><br>"Daughter," say the sisters. "Daughter, the instrument."<br><br>From the rail, the Factor: "Interesting. Did you see that, Inquisitor?"<br><br>"I saw a Cantor be gracious to a tool," says Ignatius Crane. "An error, but a small one. Bring her to the casing."'),
    pumpsGo: S('Follow them to the casing.'),
    lullabyTitle: S('The casing platform'),
    lullaby: S('A stool, ten feet from the bore\'s collar, where the chain-drums come down and the noise is so great that men shout into each other\'s ears. Under the grinding there is something else. Five notes. Down, and down, and up, and a little down again, and back to the beginning. A tending note held long, and let fall, and gathered. It is a lullaby, and every twelfth or thirteenth time round one of the five notes comes late, or flat, or not at all, and the phrase stumbles, and pauses, and starts again from the beginning, patiently.<br><br>From the catwalk, Ignatius Crane: "Holy daughter. You are the hand that steadies the patient. You hold the Light still, that it may be relieved of its excess. Blessed is the single note. Blessed is the throat that holds it. Blessed is the hand that keeps the throat."<br><br>The case is opened on the platform: the brass collar, and the four tuning pegs, and the ivory spool of copper wire, and the long silver needle curved like a new moon.<br><br>"Engineer," says Ignatius Crane. Kaelen kneels. His hands are shaking.'),
    lullabyGo: S('Stand where he needs you.'),
    needleHint: S('"Closer, Engineer. I must be able to see." Stand between the Inquisitor\'s eye and the glass hand. Keep there.'),
    hudEye: S('THE INQUISITOR\'S EYE'),
    hudBlocked: S('blocked'),
    hudSees: S('he can see the needle'),
    needleTitle: S('The needle'),
    needleGood: S('Kaelen angles his shoulder so that the Inquisitor sees the collar, and the needle, and the ivory spool, and not the place beneath the jaw where his left hand is. The collar goes on to the second notch, one looser than it should be. The glass thumb catches a pinch of skin along the side of her throat, under the shadow of her jaw, and the needle goes through it, and the copper wire after with a little jerk. Blood comes at once, a bright line on the white wool. <i>Good. It has to bleed.</i> Knots at both eyelets; the pegs, one, two, three, four, a half-turn each.<br><br>Crane comes down the ladder and crouches a foot away. "Blood. Good. It should bleed a little at the seating. The Foundry girls used to bleed for days." He looks at her. "Speak, daughter."<br><br>"I," says Lyra Ashgrove. "Am. Fortunate." One hundred and seventy-four, all the way through. Not a hair off.<br><br>"She is," says Ignatius Crane, and makes two fingers in the air, and goes back up the ladder.'),
    needleSeen: S('The Inquisitor sees. He sees the glass thumb pinch the skin under her jaw, and the needle go through skin and not through the notch of the throat, and the wire come after it. "No," he says, quite gently. "Closer, Engineer. At the notch. Angled up and back, into the fold of the voice itself. I have seated forty of these." Kaelen\'s hands shake, and he does it, because there is a Flambeau on the catwalk with a stave of glass-fire and a Cantor on the stool, and the needle goes where the Rite wants it, and the blood is not a bright line but a slow one.<br><br>"Speak, daughter."<br><br>"I," says Lyra Ashgrove. "Am. Fortunate." One hundred and seventy-four. Not a hair off. Something in it is already torn.<br><br>"She is," says Ignatius Crane.'),
    needleGo: S('"Head at one span!"'),
    holdTitle: S('The Hold'),
    hold: S('From the gauge platform, Tobiah Marsh: "Head at one span! One span and holding!" The chains come down a notch, and the grinding changes its note. "One note," says the Inquisitor. "One law. One hand."<br><br>Lyra sings. One hundred and seventy-four: clear, and hoarse, and absolutely steady, with four hours ahead of her. The Root hears her in the first minute. "Pitch coming up," says Tobiah. "It\'s — gods, look at it — it\'s matching." "Mark it," says the Factor.<br><br>The lullaby stops.<br><br>Kaelen stands up from the stool with his toolbag and goes along the collar walk to the drum. "Slippage on the lock," he says, to nobody. "I can hear it." He cannot. "Spanner. Tobiah, sit on the rail there and call the pitch to me every ten seconds." The plate over the phase port has eight bolts. He has promised himself forty seconds if they don\'t watch him, and three minutes if they do.<br><br>Her slate said it, Rootday night, in letters an inch high: <i>THEN DON\'T LET THEM WATCH YOU.</i>'),
    holdGo: S('Hum beside the stool.'),
    holdHint: S('The Factor\'s lenses see pitch as colour. Hum (N) near the stool and they stay on you, not on the drum. Eight bolts.'),
    hudLenses: S('THE FACTOR\'S LENSES'),
    hudOnYou: S('on you'),
    hudOnDrum: S('on the drum'),
    hudBolts: S('bolts'),
    hudListening: S('THE ROOT IS LISTENING'),
    pitchCall: S('Tobiah, from the rail: "Pitch, one-seventy-four. Holding."'),
    pitchCall2: S('Tobiah: "One-seventy-four. It\'s matching her, sir. It\'s — it\'s coming up to meet her."'),
    fuse: S('Kaelen, at the drum, with the margin of Revision Seven in his head: <i>On failure of the hold, for any cause, the Sequence is not to be halted. Slippage is to be absorbed by the source.</i> Nobody brings a Church four hundred feet down a shaft to save a bore-head. She is not the steadying hand. She is the fuse.'),
    voskTurns: S('The Factor\'s lenses come off you and go to the drum. "Engineer Vance," she says, quite calmly. "What are you doing at that plate?"'),
    boltsLost: S('"Engineer Vance, step away from the drum." He does not. He has two bolts to go and the coil in his hand, and he takes the three minutes, and Lyra holds the note the whole three minutes with the wire in her voice.'),
    boltsWon: S('Eight bolts. Forty-one seconds. Nobody looked.'),
    lockTitle: S('The lock throws'),
    lock: S('Tobiah: "Sir, what\'s that?" Kaelen gives him two seconds and one sentence: "You\'ll want to hold onto something." And he seats the reverse-phase coil in the port.<br><br>The drum screams. The chains come up taut and ring like a struck anvil, and the whole bore-head, thirty tons of iron with its teeth buried in living wood, tries to turn and cannot, and the crown of glass teeth snaps off inside the Root with a crack that goes through the chamber like a bell breaking. A chain-drum comes down through the scaffolding. A split channel sends green-gold glass across the platform in a wave two inches deep, and the boards smoke and sing.<br><br>Crane, on his knees on the catwalk: "The hold! Hold the note! Daughter — hold the note!"<br><br>She holds it. Hoarse and thin and unbroken, because she is a Cantor and the last thing a Cantor does is stop. And the Root stays drawn in, listening, asked.<br><br>Kaelen, with his glass hand flat on the drum: "LYRA! <i>SING IT DOWN!</i>"'),
    lockGo: S('Sing it down with her.'),
    fifthTitle: S('Sing it down'),
    fifthHint: S('The falling fifth: 174, and down a whole fifth to 116, slow as a leaf coming off a branch, and up, and down again. Follow her.'),
    fifthGood: S('She lets it fall. The Root note slides down a whole fifth, slow as a leaf coming off a branch, and climbs, and falls again, and you fall with it, a hand\'s width of voice under hers. <i>Down. Go back where you came from.</i><br><br>The Root lets go of the question. Under the grinding the lullaby starts again. Badly. Stumbling. From the beginning.'),
    fifthPoor: S('She lets it fall, a whole fifth, slow as a leaf coming off a branch, and you lose her on the way down and find her on the way up. It takes four falls, not two, and the glass wave reaches the legs of the stool before the Root lets go of the question. Under the grinding, the lullaby starts again. Badly. Stumbling. From the beginning.'),
    golemsTitle: S('The Golems'),
    golems: S('"The Consortium kept four at the casing, and the Factor turned them all at once." Haulage machines, brass and boiler-iron, twice a man\'s height, grapples for hands and a single dim glass eye. Vosk, through a speaking-trumpet, quite calmly: "Engineer Vance, step away from the drum."<br><br>Two come across the platform. Two stand at the rail, waiting to be told.'),
    golemsGo: S('Keep one off her stool.'),
    jGolems: S('The lock has thrown and the crown of teeth is snapped. The Factor has turned the Golems. Two are coming; two stand at the rail. Kaelen is at the drum and Lyra is on the stool with the wire in her throat.'),
    enoughTitle: S('"Enough."'),
    enough: S('Kaelen hits the first one in the knee-joint with his glass fist, where the steam-line crosses the joint, and it sits down in a screaming cloud of white vapour. The second throws him eight feet into the platform rail, and something in his side goes, and the platform is on fire in two places, and he gets his glass hand flat on its boiler and <i>drinks</i> it: the hammer of the piston, the shriek of the valve, the ring of brass under strain, all of it into the arm, and the men on the rails put their hands over their ears. Something in his shoulder goes cold.<br><br>The third and the fourth stop where they stand.<br><br>"<i>Enough</i>," says the Factor. "Engineer, I would very much like to know what you thought you were—"<br><br>And the purge alarm goes. Three notes. It is tested on the first Rootday of every month, and it has never once been run in earnest.'),
    enoughYou: S('You kept the second one off the stool for the seconds it took, and that is what a stranger could do.'),
    enoughGo: S('The speaking-tube.'),
    tubeTitle: S('The speaking-tube'),
    tube: S('Kaelen pulls the flap open. Four hundred feet above, small and tinny, the Governor\'s voice: "—sealing the vault. Governor\'s authority, under the works charter. Factor, I\'m sorry. The bleed-back\'s coming up the shaft and it\'s coming fast and there\'s four hundred feet of men above it. Sixty seconds on the reservoir gates. Anyone below, get to the cage."<br><br>"Da," says Kaelen.<br><br>The silence on the other end lasts three of the sixty.<br><br>"<i>…Kaelen.</i>"<br><br>"Don\'t run the purge. The Root\'s wounded. If you dump forty thousand gallons of raw glass into an open casing it will not seal, it will—"<br><br>"<i>I know what it will do.</i> I\'ve got Tam\'s widow\'s grandson on the day shift on the third terrace and I have to choose between a hole and a town. Get to the cage, boy. I\'m counting."<br><br>"Da—"<br><br>"<i>Forty-one. Forty.</i>"<br><br>Lyra has the collar off, the wire coming out of her skin easily because it was never anywhere but her skin. She puts her hand on Kaelen\'s jaw and says, in what is left of her voice: "The pumps."'),
    tubeGo: S('Sixty seconds.'),
    countHint: S('Twelve men on the pumps. The cage holds eight. A hand on a wrist stops a man for the length of a breath, and in that breath he will tell you who he was. Every one costs you seconds you need for the ladder.'),
    hudCount: S('THE RESERVOIR GATES'),
    hudNames: S('names'),
    aldric41: S('Aldric, from the tube: "Forty-one. Forty."'),
    aldric30: S('Aldric: "Thirty."'),
    aldric20: S('Aldric: "Twenty. Get to the cage, boy."'),
    aldric10: S('Aldric: "Ten."'),
    aldric5: S('Aldric: "Five. Four."'),
    aldric2: S('Aldric: "Two. One."'),
    lyraTakes: S('Lyra takes a man off the handles by the wrist, and he stops the way a cart stops when you unhook the horse, and the sisters walk him to the cage.'),
    cageUp: S('The cage goes up: four of them, with Tobiah, a shift-man with a crushed foot, and the sisters. The bell rings for the next, and the next does not come, because the winch-house has already been cleared.'),
    craneDown: S('Crane comes down the ladder three rungs at a time with his red robes burning at the hem, shouting for the Rite, for the case, for the collar, for the daughter. The Factor takes his arm.'),
    unhookStart: S('You take his wrist off the handle. He stops. Hold on.'),
    unhookLost: S('You let go of his wrist, and the handle takes it back.'),
    unhookName: S('For about the length of a breath, he is there. "{0}," he says, to you, as if you had asked. "Say it was {0}." And then the handle has him again.'),
    unhookLast: S('The man with the wedding ring and the scar through his eyebrow looks at your hand on his wrist with his lips moving. "{0}" That is all. You write it down.'),
    jNames: S('At the pumps, in the Governor\'s sixty seconds, I took {0} of them off the handles by the wrist long enough to hear a name. I have written them down. Eight were left pumping when the water came.'),
    jNoNames: S('At the pumps, in the Governor\'s sixty seconds, I went for the ladder. Eight men were left pumping when the water came. I do not know their names.'),
    ledgerWhere: S('the Root-vault, at the pumps'),
    pourTitle: S('Forty thousand gallons'),
    pour: S('It does not sound like a flood. It sounds like the largest bell in the world being poured full of sand. Green-gold light comes up the chamber walls, bright as a summer field. Kaelen puts Lyra behind a chain-drum and gets the glass arm up over her.<br><br>And the Root drinks.<br><br>Every vein in the chamber blazes like a lamp with the wick turned all the way up, and the thing in the stone stops. Then it screams. Not a sound: it comes up through the boots and the teeth and the glass arm, and four hundred feet above, every iron-oak from the quarry road to the Flume rings at once like the bells they took. The wall flexes like a flank, and the first crack opens along it from the wound to the roof, thirty feet of it, and out of the crack, instead of glass, comes green.<br><br>"Up," says Kaelen. "<i>Up</i>—"'),
    pourCaught: S('You are still on the platform when it comes. Kaelen gets the glass arm over you as well, and the first of it goes over the drum and takes the breath out of you, and the boards under you are warm.'),
    pourGo: S('Up.'),
    jGreening: S('The bit is snapped and the Root is Greening. Four hundred feet of service ladder in a chimney a yard and a half across, and leaves coming up it behind us. Oakhaven is going under in an hour. I must climb — the shaft, the headframe, the North Gate — and reach the mooring mast.'),
    getOut: S('UP. The service ladder, the headframe, the gate, the mooring mast.'),
    // the vault's figures
    lookKaelen: S('Kaelen Vance'),
    lookKaelenText: S('The supervising engineer, with his toolbag. The coil is in it. His hands are shaking, and he has decided that is all right.'),
    lookKaelenDrum: S('Kaelen Vance, at the drum'),
    lookKaelenDrumText: S('On the collar walk with a spanner, his back to the Factor. Eight bolts on the plate over the phase port.'),
    lookLyraStool: S('Lyra Ashgrove, on the stool'),
    lookLyraStoolText: S('Ten feet from the collar, in white, with a gorget of thin gold at her throat and her chin up. <i>Get on with it.</i>'),
    lookLyraWire: S('Lyra Ashgrove, with the wire in'),
    lookLyraWireText: S('A brass collar at the second notch, copper wire through the skin under her jaw, a bright line of blood on the white wool. She is singing one hundred and seventy-four and she has four hours to go.'),
    lookCraneWalk: S('Ignatius Crane, on the catwalk'),
    lookCraneWalkText: S('The Inquisitor, a foot above the platform, with his stave and his eye. "I must be able to see."'),
    lookVoskRail: S('Factor Vosk, at the rail'),
    lookVoskRailText: S('Green lenses, a slate, a speaking-trumpet at her elbow. She watches whatever has a colour.'),
    lookTobiah: S('Tobiah Marsh'),
    lookTobiahText: S('Night shift, on the gauge platform, with his charts under his arm and his cap off. He calls the pitch every ten seconds.'),
    lookSisterVault: S('A Church sister'),
    lookSisterVaultText: S('"Daughter. Daughter, the instrument."'),
    lookPump: S('A man at the pumps'),
    lookPumpHooked: S('Grey smock, both hands on the handle, up and down. You do not look at a pump.'),
    lookPumpRing: S('An old man at the pumps'),
    lookPumpRingText: S('White hair, a wedding ring, a scar through his eyebrow. His lips are moving.'),
    lookStool: S('The stool'),
    lookDrum: S('The drum on the collar walk'),
    lookDrumText: S('A chain-drum, and beside it the plate over the phase port: eight bolts, brass and glass and hair-fine wire behind them.'),
    lookTube: S('The speaking-tube'),
    lookTubeText: S('A brass tube with a flap, up to the works office four hundred feet above. It is Kaelen\'s hand that opens it.'),
    lookGolemStopped: S('A Steam Golem, stopped'),
    lookGolemStoppedText: S('Twice a man\'s height, brass and boiler-iron, a single dim glass eye. It stopped where it stood when the Factor said enough.'),
    lookCage: S('The cage'),
    lookCageText: S('It holds eight. It goes up once.'),
    lookCageGone: S('The cage is gone, and the bell rings for the next, and the next does not come.'),
    // custody: the palm message for Rooke (ch. 9, Nullday)
    palm: S('She takes your hand under the sisters\' eyes, turns it palm up, and writes on it with her finger, letter by letter, the way she wrote on Rooke\'s: IF THE FIRE COMES BEFORE I\'M BACK — ORLA HALE — THE LONG DROPS. LET HER GO QUIET. DON\'T LET THEM BURN HER IN THE CHAIR. Then she smudges it with her thumb.'),
    palmTake: S('Carry it to Rooke.'),
    palmLeave: S('Not now.'),
    palmJ: S('Lyra wrote on my palm for Rooke: Orla Hale, the long drops, if the fire comes before she is back. Nothing was said aloud.'),
    rookeTitle: S('The surgeon\'s hands'),
    rooke: S('You take Surgeon-Grafter Rooke\'s hands in his surgery and say nothing, and he looks at your face, and then at your palm, where nothing is written any more. "Thirty years in the Office," he says, "and I have never in my life heard of a Cantor dying of a four-hour Hold." He takes his instruction with a thumb pressed into your palm, and at the door, very slightly, a nod.'),
    rookeGo: S('Say nothing.'),
    rookeJ: S('Rooke has Lyra\'s instruction for Orla: the long drops, if the fire comes first. A thumb and a nod. Nothing was said.'),
    // the two "sings" that still stand: Lyra's and Kaelen's later lines
    lyraAfter: S('Be at my door when they come for me. Walk with the column; the town will hum the Root note under the Pure Note, too quietly to punish, and you can hum with it. Below, Kaelen is the hand at the wire and the hand at the drum. Your work is to stand where their eyes go.'),
    kaelenAfter: S('Give me the coil. It goes down in my toolbag, not yours: nobody searches the supervising engineer\'s toolbag. Keep the pass; it gets you past the bell-helms at her door and onto the terrace. On Hearthday walk with the column, and when I go to the drum, give them something else to look at. Eight bolts. Forty seconds, if they don\'t watch me.'),
    kaelenRepeat: S('Hearthday. Be at her door when the column forms. Below, I will be at the stool with the needle, and my hands will be shaking, and that is all right. When I go to the drum, keep their eyes on you.'),
  };
  const VO = {   // TX key -> the recorded lines it holds, in the order the book has them
    frame: ['tobiah.rite.honour', 'tobiah.rite.hurt'],
    pumps: ['sister.rite.daughter', 'vosk.rite.interesting', 'ignatius.rite.gracious'],
    lullaby: ['ignatius.rite.rubric', 'ignatius.rite.engineer'],
    needleGood: ['ignatius.rite.blood', 'ignatius.rite.speak', 'lyra_fortunate.rite.fortunate', 'ignatius.rite.sheis'],
    needleSeen: ['ignatius.rite.notch', 'ignatius.rite.speak', 'lyra_fortunate.rite.fortunate', 'ignatius.rite.sheis'],
    hold: ['tobiah.rite.span', 'ignatius.open.onenote', 'tobiah.rite.matching', 'vosk.rite.markit', 'kaelen.rite.slippage', 'kaelen.rite.spanner'],
    lock: ['tobiah.rite.whatsthat', 'kaelen.rite.holdon', 'ignatius.rite.holdnote', 'kaelen.rite.singitdown'],
    golems: ['vosk.rite.stepaway'],
    enough: ['vosk.rite.enough'],
    tube: ['aldric_tube.rite.seal', 'kaelen.rite.da', 'aldric_tube.rite.kaelen', 'kaelen.rite.dontrun', 'aldric_tube.rite.iknow', 'aldric_tube.rite.c41', 'lyra_ruined.rite.pumps'],
    pour: ['kaelen.rite.up'],
    needleHint: ['ignatius.rite.closer'],
    pitchCall: ['tobiah.rite.call1'], pitchCall2: ['tobiah.rite.call2'],
    voskTurns: ['vosk.rite.plate'], boltsLost: ['vosk.rite.stepaway'],
    aldric41: ['aldric_tube.rite.c41'], aldric30: ['aldric_tube.rite.c30'], aldric20: ['aldric_tube.rite.c20'],
    aldric10: ['aldric_tube.rite.c10'], aldric5: ['aldric_tube.rite.c5'], aldric2: ['aldric_tube.rite.c2'],
  };
  const MSGS = ['needleHint', 'pitchCall', 'pitchCall2', 'voskTurns', 'boltsLost', 'aldric41', 'aldric30', 'aldric20', 'aldric10', 'aldric5', 'aldric2'];
  MSG_VO = new Map(MSGS.map((k) => [TX[k], VO[k]]));
  CARD_VO = Object.keys(VO).filter((k) => !MSGS.includes(k)).map((k) => [TX[k], VO[k]]);
  const fmt = (t, ...a) => String(t).replace(/\{(\d+)\}/g, (m, i) => a[+i] != null ? a[+i] : m);

  const LEFT = ['Edders', 'Ruhl', 'Caine', 'Ott', 'Sennet', 'Vey', 'Marrow', 'Hale B.'];   // the eight left (Book One ch. 19, 24)
  const DOOR = { x: 21.5, y: 28.6, r: 1.7 };          // outside Lyra's door on Cooper's Row
  const PATH = [[23.5, 20.5], [23.5, 7.5], [21.0, 6.0]]; // the column's head: up the main road, then to the headframe
  const PACE = 1.0;                                    // cells a second, a slow processional pace
  const NEEDLE_SECS = 12, NEEDLE_SEEN = 4, BOLT_SECS = 41, WATCH_LIMIT = 18, COUNT = 60, UNHOOK_SECS = 3.2;

  // ================================================================ flags and stages
  const stage = () => (hasG() && F().r43) | 0;
  const setStage = (n) => { F().r43 = n; };
  const ready = () => hasG() && !guest() && !!F().coil_done && !!F().church_come && !F().rite_started;
  const active = () => hasG() && stage() >= 1 && stage() <= 6;

  // ================================================================ the column (Oakhaven)
  const COLUMN = [
    ['choir0', 'deacon', 0.0, -0.6, 'choir'], ['choir1', 'deacon', 0.0, 0.6, 'choir'], ['choir2', 'deacon', 0.9, -0.6, 'choir'], ['choir3', 'deacon', 0.9, 0.6, 'choir'],
    ['flam0', 'proctor', 2.2, -0.8, 'flam'], ['flam1', 'proctor', 2.2, 0.8, 'flam'], ['cens0', 'p12_censer', 2.0, 0.0, null],
    ['crane', 'flambeau', 3.4, 0.0, 'crane'], ['cens1', 'p12_censer', 3.0, 0.5, null],
    ['aldric', 'aldric', 4.8, -0.5, 'aldric'], ['vosk', 'vosk', 4.8, 0.6, 'vosk'],
    ['sis0', 'townswoman', 6.2, -0.9, 'sister'], ['lyra', 'lyra', 6.2, 0.0, 'lyra'], ['sis1', 'townswoman', 6.2, 0.9, 'sister'],
    ['leg0', 'legionnaire', 7.4, -0.7, 'guard'], ['leg1', 'legionnaire', 7.4, 0.7, 'guard'],
  ];
  const LOOKS = {
    choir: [TX.lookChoir, TX.lookChoirText], flam: [TX.lookChoir, TX.lookChoirText], crane: [TX.lookCrane, TX.lookCraneText], aldric: [TX.lookAldric, TX.lookAldricText],
    vosk: [TX.lookVosk, TX.lookVoskText], sister: [TX.lookSister, TX.lookSisterText], lyra: [TX.lookLyra, TX.lookLyraText], guard: [TX.lookGuard, TX.lookGuardText],
  };
  // the kerbs: the book's hummers always hum; people the traveller helped join them (flag), the rest stand silent
  const KERB = [
    ['A woman by the well-house', 'townswoman', 25.7, 22.2, null, 'old'],
    ['A dye-works woman', 'townswoman', 21.3, 24.0, null, 'always'], ['A dye-works woman', 'townswoman', 21.3, 23.2, null, 'always'],
    ['A carter', 'townsman', 25.7, 25.0, null, 'always'], ['A carter', 'townsman', 25.7, 24.2, null, 'always'],
    ['A tannery man', 'townsman', 21.3, 20.2, null, 'always'], ['A tannery man', 'townsman', 21.3, 19.4, null, 'always'],
    ['The baker\'s wife', 'townswoman', 25.7, 18.4, null, 'always'],
    ['Bettany', 'bettany', 21.3, 16.4, null, 'always'],
    ['Hetty Bram', 'hetty', 29.3, 17.3, Math.PI, 'always'],
    ['A Tanner cousin', 'townsman', 25.7, 14.2, null, 'always'], ['A Tanner cousin', 'townsman', 25.7, 13.5, null, 'always'], ['A Tanner cousin', 'townsman', 25.7, 12.8, null, 'always'],
    ['An old woman on a stool', 'townswoman', 21.3, 12.2, null, 'always'], ['An old woman on a stool', 'townswoman', 21.3, 10.2, null, 'always'],
    ['Lissa Merrow', 'townswoman', 21.3, 8.2, null, 'always', 0.68],
    ['Abner Fenning', 'hob', 25.7, 20.4, null, (f) => !!f.hob_told],
    ['Nell Carder', 'nell', 25.7, 16.6, null, (f) => !!f.p30c_told], ['Pim', 'pim', 26.3, 16.0, null, (f) => !!f.p30c_told, 0.6],
    ['Surgeon-Grafter Rooke', 'rooke', 17.0, 15.6, 0, (f) => !!f.boots_delivered || !!f.rooke_drops],
    ['Old Harrow', 'harrow', 25.7, 9.6, null, (f) => !!f.met_harrow],
  ];
  const keyed = (m, k) => (m.entities || []).find((e) => e && e._r43 === k);
  function put(m, k, e) {
    let have = keyed(m, k); if (have) return have;
    e = Object.assign(e, { transient: true, _decor: true, nopick: true, _r43: k });
    if (e.kind === 'enemy' && typeof hydrate === 'function') hydrate(e);
    m.entities.push(e); return e;
  }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._r43 && pred(e)) m.entities.splice(i, 1); } }
  const pathLen = () => { let L = 0; for (let i = 1; i < PATH.length; i++) L += dist(PATH[i - 1][0], PATH[i - 1][1], PATH[i][0], PATH[i][1]); return L; };
  function pathAt(d, off) {
    if (d < 0) {   // behind the head: back along the first segment
      const [ax, ay] = PATH[0], [bx, by] = PATH[1], seg = dist(ax, ay, bx, by), ux = (bx - ax) / seg, uy = (by - ay) / seg;
      return { x: ax + ux * d - uy * off, y: ay + uy * d + ux * off, dir: Math.atan2(uy, ux) };
    }
    let left = d;
    for (let i = 1; i < PATH.length; i++) {
      const [ax, ay] = PATH[i - 1], [bx, by] = PATH[i], seg = dist(ax, ay, bx, by);
      if (left <= seg || i === PATH.length - 1) {
        const t = Math.min(1, left / seg), ux = (bx - ax) / seg, uy = (by - ay) / seg;
        return { x: ax + ux * seg * t - uy * off, y: ay + uy * seg * t + ux * off, dir: Math.atan2(uy, ux) };
      }
      left -= seg;
    }
    return { x: PATH[0][0], y: PATH[0][1], dir: -Math.PI / 2 };
  }
  function stageColumn(m) {
    if (!m || m.id !== 'oakhaven') return;
    for (const [k, sprite, row, off, look] of COLUMN) {
      const e = put(m, k, { kind: 'deco', sprite, x: 0, y: 0, scale: sprite === 'p12_censer' ? 0.55 : 1.0, solid: false, radius: 0.25, _row: row, _off: off, yOff: sprite === 'p12_censer' ? 0.05 : 0 });
      if (sprite === 'p12_censer') e.lightCol = [40, 95, 160];
      if (look) { e.label = LOOKS[look][0]; e.use = 'r43_look'; e.look = LOOKS[look][1]; }
    }
    const f = F(); let hum = 0;
    KERB.forEach(([name, sprite, x, y, facing, when, scale], i) => {
      const hums = when === 'always' || when === 'old' || (typeof when === 'function' && when(f));
      const e = put(m, 'kerb' + i, { kind: 'deco', sprite, x, y, scale: scale || 1.0, solid: true, radius: 0.3, facing: facing == null ? (x < 23.5 ? 0 : Math.PI) : facing, use: 'r43_look', _hums: hums, _name: name });
      e.label = fmt(hums ? TX.lookHum : TX.lookSilent, name); e.look = hums ? TX.lookHumText : TX.lookSilentText;
      if (hums) hum++;
    });
    f.r43_hum = hum;
    placeColumn(m, 0);
  }
  function placeColumn(m, d) {
    for (const [k] of COLUMN) {
      const e = keyed(m, k); if (!e) continue;
      const p = pathAt(d - e._row, e._off); e.x = p.x; e.y = p.y; e.facing = p.dir;
      const w = Engine.sprites && Engine.sprites[e.sprite + '_w1'];
      if (w && R.walking) { const ph = Math.floor((R.walkT + e._row) * 3.2) & 3; e.animSprite = ph === 1 ? e.sprite + '_w1' : ph === 3 && Engine.sprites[e.sprite + '_w2'] ? e.sprite + '_w2' : null; } else e.animSprite = null;
    }
  }
  const lyraOf = (m) => keyed(m, 'lyra');
  function tickProcession(dt) {
    if (G.mapId !== 'oakhaven') return;
    const m = G.map; if (!lyraOf(m)) stageColumn(m);
    const f = F(), ly = lyraOf(m), L = pathLen();
    const lyraD = (f.r43_d || 0) - 6.2;
    const near = dist(px(), py(), ly.x, ly.y) < 8.5;
    R.walking = near && lyraD < L - 0.2;
    if (!near) { if (!R.slow) { R.slow = true; say(TX.columnSlows, 'warn', 4000); } } else R.slow = false;
    if (R.walking) { f.r43_d = (f.r43_d || 0) + dt * PACE; R.walkT += dt; }
    placeColumn(m, f.r43_d || 0);
    // the kerbs, as the column passes them: the book's lines, and the helped who joined
    const headY = pathAt(f.r43_d || 0, 0).y, b = f.r43_beats || 0;
    const beat = (n, y, text) => { if (b < n && headY <= y) { f.r43_beats = n; say(text, 'voice', 7000); } };
    beat(1, 22.4, TX.oldWoman); beat(2, 19.6, TX.takers); beat(3, 16.4, TX.hettyBettany); beat(4, 12.4, TX.flambeaux); beat(5, 9.6, TX.lissa);
    if (b >= 2 && !f.r43_wept && headY <= 18) { f.r43_wept = true; say(TX.lyraWeeps, '', 6000); }
    if (b >= 1 && !f.r43_helped) { f.r43_helped = true; const who = KERB.filter(([, , , , , w]) => typeof w === 'function' && w(f)).map((k) => k[0]); if (who.length) say(fmt(who.length > 1 ? TX.helpedHumMany : TX.helpedHum, who.join(', ')), '', 6000); }
    R.drone += dt; if (R.drone > 2.4) { R.drone = 0; try { Audio_.sfx.song(528, 2.6); } catch (e) { /* silent */ } }
    if (lyraD >= L - 0.2 && !R.arrived) { R.arrived = true; arrive(); }
  }
  function arrive() {
    const f = F(), n = (f.r43_hum | 0) + (f.r43_you_hum ? 1 : 0);
    let body = TX.frame + '<br><br>' + fmt(TX.frameHum, n, f.r43_you_hum ? TX.frameYou : TX.frameNotYou);
    if (f.r43_marched) body += ' ' + TX.frameMarched;
    card(TX.frameTitle, body, [{ t: TX.frameGo, f: () => descend() }]);
  }
  function descend() {
    const f = F(); setStage(2); R.arrived = false;
    drop(G.maps.oakhaven, () => true);
    const rv = G.maps.rootvault, cs = rv && rv.casingRoom;
    if (!cs) { setStage(0); return; }
    loadMap('rootvault', { x: cs.cx + 0.5, y: cs.cy + 1.9, dir: -Math.PI / 2 });
    card(TX.cageTitle, TX.cage, [{ t: TX.cageGo, f: () => card(TX.pumpsTitle, TX.pumps, [{ t: TX.pumpsGo, f: () => card(TX.lullabyTitle, TX.lullaby, [{ t: TX.lullabyGo, f: () => startNeedle() }]) }]) }]);
  }

  // ================================================================ the vault's figures
  const V = {};   // positions, from the casing room
  function layout() {
    const rv = G.maps.rootvault, cs = rv && rv.casingRoom; if (!cs) return null;
    const cx = cs.cx + 0.5, cy = cs.cy + 0.5;
    V.cx = cx; V.cy = cy; V.cs = cs;
    V.stool = [cx + 0.3, cy - 2.3]; V.kaelenStool = [cx - 0.8, cy - 2.2]; V.crane = [[cx - 2.6, cy - 3.4], [cx - 2.6, cy - 2.6]];
    V.vosk = [cx + 3.6, cy - 3.0]; V.sisters = [[cx + 1.4, cy - 3.3], [cx + 2.4, cy - 2.4]]; V.tobiah = [cx - 3.5, cy + 0.6]; V.tobiahDrum = [cx - 0.3, cy + 3.0];
    V.drum = [cx + 0.9, cy + 2.6]; V.kaelenDrum = [cx + 1.6, cy + 2.7]; V.tube = [cs.x + 0.6, cs.y + cs.h - 0.6]; V.cage = [cs.x + cs.w - 0.7, cs.y + cs.h - 0.7];
    V.guards = [[cs.x + 0.8, cs.y + 0.8], [cs.x + cs.w - 0.8, cs.y + 0.8]];
    V.pumps = [[-3, -2], [3, -2], [-3, 2], [3, 2]].map(([dx, dy]) => [cx + dx, cy + dy]);
    V.golems = [[cs.x + 0.9, cs.y + cs.h - 1.1], [cs.x + cs.w - 0.9, cs.y + cs.h - 1.1], [cs.x + 1.2, cs.y + 2.2], [cs.x + cs.w - 1.2, cs.y + 2.2]];
    return V;
  }
  function stageVault(m) {
    if (!m || m.id !== 'rootvault' || !layout()) return;
    const s = stage(), fig = (k, sprite, pos, o) => put(m, k, Object.assign({ kind: 'deco', sprite, x: pos[0], y: pos[1], scale: 1.0, solid: true, radius: 0.3, use: 'r43_look' }, o || {}));
    // the map's own Hollow at the pumps stands aside for the twelve
    for (const e of m.entities) if (e && e.kind === 'npc' && e.id === 'hollow' && !e._r43 && m.casingRoom && e.x > m.casingRoom.x && e.x < m.casingRoom.x + m.casingRoom.w && e.y > m.casingRoom.y && e.y < m.casingRoom.y + m.casingRoom.h) e.hidden = true;
    fig('stool', 'chair', V.stool, { scale: 0.6, radius: 0.2, label: TX.lookStool, look: TX.lookLyraStoolText });
    const ly = fig('lyra', 'lyra', [V.stool[0], V.stool[1] + 0.35], { facing: Math.PI, label: s >= 4 ? TX.lookLyraWire : TX.lookLyraStool, look: s >= 4 ? TX.lookLyraWireText : TX.lookLyraStoolText });
    ly.label = s >= 4 ? TX.lookLyraWire : TX.lookLyraStool; ly.look = s >= 4 ? TX.lookLyraWireText : TX.lookLyraStoolText;
    const atDrum = s >= 4;
    const ka = fig('kaelen', 'kaelen', atDrum ? V.kaelenDrum : V.kaelenStool, { facing: atDrum ? Math.PI : 0 });
    ka.x = atDrum ? V.kaelenDrum[0] : V.kaelenStool[0]; ka.y = atDrum ? V.kaelenDrum[1] : V.kaelenStool[1];
    ka.label = atDrum ? TX.lookKaelenDrum : TX.lookKaelen; ka.look = atDrum ? TX.lookKaelenDrumText : TX.lookKaelenText; ka.lightCol = [18, 66, 58];
    if (s <= 5) { const cr = fig('crane', 'flambeau', V.crane[0], { facing: 0, label: TX.lookCraneWalk, look: TX.lookCraneWalkText, lightCol: [70, 95, 140] }); if (s !== 3) { cr.x = V.crane[0][0]; cr.y = V.crane[0][1]; } }
    else drop(m, (e) => e._r43 === 'crane');
    fig('vosk', 'vosk', V.vosk, { facing: Math.PI * 0.75, label: TX.lookVoskRail, look: TX.lookVoskRailText });
    fig('sis0', 'townswoman', V.sisters[0], { facing: Math.PI / 2, label: TX.lookSisterVault, look: TX.lookSisterVaultText });
    fig('sis1', 'townswoman', V.sisters[1], { facing: Math.PI / 2, label: TX.lookSisterVault, look: TX.lookSisterVaultText });
    if (s <= 5) { const tb = fig('tobiah', 'tobiah', V.tobiah, { facing: 0, label: TX.lookTobiah, look: TX.lookTobiahText, scale: 0.94 }); const tp = atDrum ? V.tobiahDrum : V.tobiah; tb.x = tp[0]; tb.y = tp[1]; }
    fig('drum', 'lever', V.drum, { scale: 0.9, radius: 0.35, label: TX.lookDrum, look: TX.lookDrumText });
    fig('tube', 'sign', V.tube, { scale: 0.7, radius: 0.2, solid: false, label: TX.lookTube, look: TX.lookTubeText });
    fig('cage', 'ladder', V.cage, { scale: 1.3, radius: 0.3, label: TX.lookCage, look: s >= 6 && (F().r43_cage ? TX.lookCageGone : TX.lookCageText) || TX.lookCageText });
    V.guards.forEach((g, i) => put(m, 'guard' + i, { kind: 'enemy', type: 'legionnaire', x: g[0], y: g[1], passive: true, facing: Math.PI / 2, name: i ? 'Sella Marr' : 'Brannoc Hewe' }));
    // twelve men at the pumps, in pairs: eight named (the ones left), four not (the ones Lyra takes to the cage)
    const taken = F().r43_taken | 0, named = F().r43_named || [];
    let n = 0;
    V.pumps.forEach(([x, y], pi) => {
      [[-0.75, 0.15], [0.75, 0.15], [0, 0.8]].forEach(([dx, dy], j) => {
        const i = n++, isLeft = i < 8, name = isLeft ? LEFT[i] : null;
        const e = put(m, 'pump' + i, { kind: 'deco', sprite: 'hollow', x: x + dx, y: y + dy, scale: 0.95, solid: true, radius: 0.28, use: 'r43_pump', _pump: i, _name: name, facing: dy > 0 ? -Math.PI / 2 : (dx < 0 ? 0 : Math.PI) });
        e.label = i === 7 ? TX.lookPumpRing : TX.lookPump; e.look = i === 7 ? TX.lookPumpRingText : TX.lookPumpHooked;
        if (!isLeft && i - 8 < taken) e.hidden = true;             // gone to the cage
        if (name && named.includes(name)) e._said = true;
      });
    });
    if (s >= 5) stageGolems(m);
  }
  function stageGolems(m) {
    const f = F();
    for (let i = 2; i < 4; i++) put(m, 'golem' + i, { kind: 'enemy', type: 'golem', x: V.golems[i][0], y: V.golems[i][1], passive: true, facing: -Math.PI / 2, name: null, label: TX.lookGolemStopped });
    if (stage() === 5 && !f.r43_golems) {
      f.r43_golems = true; G.boreGolems = 0; G.boreHold = 75;
      for (let i = 0; i < 2; i++) {
        const e = hydrate({ kind: 'enemy', type: 'golem', x: V.golems[i][0], y: V.golems[i][1], transient: false });
        e.state = 'chase'; e._r43golem = true; e.onDeath = () => { G.boreGolems--; if (G.boreGolems <= 0) enough(); }; G.boreGolems++; m.entities.push(e);
      }
      try { Audio_.sfx.golem(); } catch (e) { /* silent */ }
    }
  }
  function rearm() {   // after a restore, the chasing golems' callbacks
    if (stage() !== 5) return; const m = G.maps.rootvault; if (!m) return;
    let n = 0; for (const e of m.entities) if (e && e.kind === 'enemy' && e.type === 'golem' && !e.dead && !e.passive && e.state !== 'passive' && !e._r43) { n++; e.onDeath = () => { G.boreGolems--; if (G.boreGolems <= 0) enough(); }; }
    G.boreGolems = n; if (!n) enough();
  }

  // ================================================================ 3 · the needle
  function startNeedle() {
    setStage(3); R.needle = F().r43_marched ? NEEDLE_SECS - 4 : NEEDLE_SECS; R.seen = 0;
    stageVault(G.map); say(TX.needleHint, 'warn', 7000);
  }
  function segDist(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1], wx = p[0] - a[0], wy = p[1] - a[1];
    const L = vx * vx + vy * vy, t = L ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L)) : 0;
    return dist(p[0], p[1], a[0] + vx * t, a[1] + vy * t);
  }
  const blocked = () => {
    const cr = keyed(G.map, 'crane'); if (!cr) return false;
    const C = [cr.x, cr.y], K = V.kaelenStool, P = [px(), py()];
    return segDist(P, C, K) < 0.75 && dist(P[0], P[1], C[0], C[1]) > 0.5 && dist(P[0], P[1], K[0], K[1]) > 0.5;
  };
  function tickNeedle(dt) {
    if (G.mapId !== 'rootvault') return;
    const cr = keyed(G.map, 'crane'); if (!cr || !V.crane) { stageVault(G.map); return; }
    // the Inquisitor paces the catwalk, so the line moves
    const t = (NEEDLE_SECS - R.needle), u = (Math.sin(t * 0.9) + 1) / 2;
    cr.x = V.crane[0][0]; cr.y = V.crane[0][1] + (V.crane[1][1] - V.crane[0][1]) * u; cr.facing = Math.atan2(V.kaelenStool[1] - cr.y, V.kaelenStool[0] - cr.x);
    loud(); R.blocked = blocked(); if (!R.blocked) R.seen += dt;
    R.needle -= dt;
    if (R.needle <= 0) {
      const seen = R.seen >= NEEDLE_SEEN; F().r43_seen = seen; if (seen) F().lyra_voice_worse = true;
      setStage(4); R.bolt = 0; R.q = 0; R.kaelenAt = 'drum';
      // what the Factor's bells told her before Hearthday: her eye is partly on the collar walk already (js/audit54.js)
      R.watched = 0; try { if (typeof AUDIT54 !== 'undefined') R.watched = Math.max(0, Number(AUDIT54.ritePenalty()) || 0); } catch (e) { R.watched = 0; }
      card(TX.needleTitle, seen ? TX.needleSeen : TX.needleGood, [{ t: TX.needleGo, f: () => card(TX.holdTitle, TX.hold, [{ t: TX.holdGo, f: () => { stageVault(G.map); say(TX.holdHint, 'warn', 8000); } }]) }]);
    }
  }

  // ================================================================ 4 · the Hold and the bolts
  const humming = () => (G.murmurT > 0) || (G.song && G.song.t > 0) || (G.songFx > 0);
  function tickHold(dt) {
    if (G.mapId !== 'rootvault') return;
    if (!keyed(G.map, 'kaelen')) stageVault(G.map);
    R.drone += dt; if (R.drone > 2.4) { R.drone = 0; try { Audio_.sfx.song(174, 2.6); } catch (e) { /* silent */ } }
    loud();
    const onYou = humming() && dist(px(), py(), V.vosk[0], V.vosk[1]) < 5.5;
    R.onYou = onYou;
    if (onYou) R.bolt += dt; else { R.bolt += dt * 0.3; R.watched += dt; }
    R.q = Math.min(1, R.q + dt / 70);
    const f = F();
    R.call = (R.call || 0) + dt; if (R.call > 10) { R.call = 0; f.r43_calls = (f.r43_calls | 0) + 1; voice(f.r43_calls === 2 ? TX.pitchCall2 : TX.pitchCall, 5000); }
    if (R.q > 0.5 && !f.r43_fuse) { f.r43_fuse = true; say(TX.fuse, '', 9000); }
    if (R.watched > WATCH_LIMIT * 0.6 && !R.turned) { R.turned = true; voice(TX.voskTurns, 6000); }
    if (R.watched >= WATCH_LIMIT && !f.r43_lenses) { f.r43_lenses = true; f.lyra_voice_worse = true; voice(TX.boltsLost, 8000); R.bolt = BOLT_SECS; }
    if (R.bolt >= BOLT_SECS) {
      if (!f.r43_lenses) say(TX.boltsWon, '', 4000);
      f.bore_seated = true; if (G.has && G.has('coil')) G.take('coil');
      setStage(5); try { Audio_.sfx.crack(); } catch (e) { /* silent */ }
      card(TX.lockTitle, TX.lock, [{ t: TX.lockGo, f: () => singDown() }]);
    }
  }
  async function singDown() {
    const f = F(); let score = 0;
    const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
    if (Rd) {
      try {
        const band = (Rd.bandFor ? Rd.bandFor(0) : 105) * (f.lyra_voice_worse ? 0.8 : 1);
        const res = await Rd.holdPitch({ curve: [[0, 174], [1.4, 174], [2.6, 116], [4.0, 116], [5.0, 174], [6.0, 174], [7.2, 116], [9, 116]], width: band, duration: 9, title: TX.fifthTitle, hint: TX.fifthHint });
        score = res && !res.aborted ? res.score : 0;
      } catch (e) { warnOnce('fifth', e); score = 0.5; }
    } else score = 0.5;
    f.r43_fifth = Math.round(score * 100) / 100;
    try { Audio_.sfx.fifth(); } catch (e) { /* silent */ }
    card(TX.fifthTitle, score >= 0.5 ? TX.fifthGood : TX.fifthPoor, [{ t: TX.golemsTitle, f: () => card(TX.golemsTitle, TX.golems, [{ t: TX.golemsGo, f: () => { stageVault(G.map); journal('main', TX.jGolems); } }]) }]);
  }

  // ================================================================ 5 · the Golems, and "Enough."
  function enough() {
    const f = F(); if (stage() !== 5) return;
    G.boreHold = 0; G.boreGolems = 0;
    for (const e of G.map.entities) if (e && e.kind === 'enemy' && e.type === 'golem' && !e.dead && !e.passive && e.state !== 'passive' && V.cx != null && dist(e.x, e.y, V.cx, V.cy) < 7) { e.passive = true; e.state = 'passive'; e.label = TX.lookGolemStopped; }
    setStage(6); R.count = COUNT; R.lastSaid = 99; f.r43_taken = 0; f.r43_cage = false;
    card(TX.enoughTitle, TX.enough + (f.r43_fifth >= 0.5 ? '<br><br>' + TX.enoughYou : ''), [{ t: TX.enoughGo, f: () => card(TX.tubeTitle, TX.tube, [{ t: TX.tubeGo, f: () => { stageVault(G.map); say(TX.countHint, 'warn', 9000); } }]) }]);
  }

  // ================================================================ 6 · sixty seconds at the pumps
  function tickCount(dt) {
    if (G.mapId !== 'rootvault') { R.count -= dt; if (R.count <= 0) pour(); return; }
    if (!keyed(G.map, 'pump0')) stageVault(G.map);
    loud();
    const f = F(); R.count -= dt; const t = R.count;
    const sayAt = (at, text) => { if (R.lastSaid > at && t <= at) { R.lastSaid = at; voice(text, 4500); } };
    sayAt(57, TX.aldric41); sayAt(30, TX.aldric30); sayAt(20, TX.aldric20); sayAt(10, TX.aldric10); sayAt(5, TX.aldric5); sayAt(2, TX.aldric2);
    if (R.lastCrane == null && t <= 52) { R.lastCrane = 1; say(TX.craneDown, '', 6000); drop(G.map, (e) => e._r43 === 'crane'); }
    // Lyra takes four by the wrist; the sisters walk them to the cage; the cage goes up once
    const takeAt = [50, 44, 38, 32];
    while ((f.r43_taken | 0) < 4 && t <= takeAt[f.r43_taken | 0]) { const e = keyed(G.map, 'pump' + (8 + (f.r43_taken | 0))); if (e) e.hidden = true; f.r43_taken = (f.r43_taken | 0) + 1; say(TX.lyraTakes, '', 5000); }
    if (!f.r43_cage && t <= 27) { f.r43_cage = true; say(TX.cageUp, 'warn', 7000); const c = keyed(G.map, 'cage'); if (c) c.look = TX.lookCageGone; const tb = keyed(G.map, 'tobiah'); if (tb) tb.hidden = true; for (const k of ['sis0', 'sis1']) { const e = keyed(G.map, k); if (e) e.hidden = true; } }
    // a hand on a wrist
    const u = R.unhook;
    if (u) {
      if (dist(px(), py(), u.e.x, u.e.y) > 1.4) { R.unhook = null; say(TX.unhookLost, 'warn', 3000); }
      else { u.t -= dt; if (u.t <= 0) { R.unhook = null; said(u.e); } }
    }
    if (t <= 0) pour();
  }
  function said(e) {
    const f = F(); e._said = true; const names = f.r43_named || (f.r43_named = []);
    if (!names.includes(e._name)) { names.push(e._name); G.ledger.push({ name: e._name, where: TX.ledgerWhere, day: G.day }); }
    f.r43_names = names.length;
    say(fmt(e._pump === 7 ? TX.unhookLast : TX.unhookName, e._name), 'voice', 7000);
    seq(['pumpman.rite.name.' + slug(e._name)]);
  }
  function usePump(e) {
    if (stage() !== 6) { say(TX.lookPumpHooked, '', 4000); return true; }
    if (e.hidden || !e._name) return true;
    if (e._said) { say(fmt(TX.unhookName, e._name), '', 4000); return true; }
    if (R.unhook && R.unhook.e === e) return true;
    R.unhook = { e, t: UNHOOK_SECS }; say(TX.unhookStart, '', 3000); return true;
  }
  function pour() {
    const f = F(); if (stage() !== 6) return;
    setStage(7); R.unhook = null;
    const inRoom = G.mapId === 'rootvault' && V.cx != null && dist(px(), py(), V.cx, V.cy) < 6;
    if (inRoom) { const p = G.player; p.hp = Math.max(1, Math.floor(p.hp * 0.7)); try { fx('hurt', 900); } catch (e) { /* cosmetic */ } }
    // the eight who were left: into the ledger, by name, with the four Lyra took not among them
    f.r43_left = LEFT.slice();
    journal('main', (f.r43_names | 0) > 0 ? fmt(TX.jNames, f.r43_names) : TX.jNoNames);
    // the Greening, as game.js has it
    f.bore_broken = true; f.greening = true; G.boreHold = 0; G.boreGolems = 0;
    try { Audio_.sfx.crack(); fx('green', 2500); } catch (e) { /* cosmetic */ }
    try { G.maps.oakhaven = buildOakhaven(true); } catch (e) { warnOnce('oakhaven', e); }
    if (G.mapId === 'oakhaven') { const c = Engine.cam; loadMap('oakhaven', { x: c.x, y: c.y, dir: c.dir }); }
    G.escapeTimer = 300;
    if (G.mapId === 'rootvault') { drop(G.map, (e) => /^(pump|guard|golem|sis|vosk|crane|tobiah)/.test(e._r43)); }
    card(TX.pourTitle, TX.pour + (inRoom ? '<br><br>' + TX.pourCaught : ''), [{ t: TX.pourGo, f: () => { journal('main', TX.jGreening); say(TX.getOut, 'bad', 8000); } }]);
  }

  // ================================================================ the door, the gate, and the hum
  function tickDoor(dt) {
    if (R.doorCool > 0) { R.doorCool -= dt; return; }
    if (G.mapId !== 'oakhaven' || !ready()) return;
    if (dist(px(), py(), DOOR.x, DOOR.y) > DOOR.r) return;
    R.doorCool = 2;
    const left = typeof riteOpenThreads === 'function' ? riteOpenThreads() : [];
    card(TX.doorTitle, TX.door + (left.length ? '<br><br>' + TX.doorLeft + ' ' + left.join(' ') : ''), [
      { t: TX.doorGo, f: () => begin() },
      { t: TX.doorWait, f: () => { R.doorCool = 8; } },
    ]);
  }
  function begin() {
    const f = F();
    f.rite_started = true; G.day = 10; G.tod = 0.42; setStage(1); f.r43_d = 0; f.r43_beats = 0; R.arrived = false; R.walkT = 0;
    if (G.has && G.has('coil')) G.take('coil');
    journal('main', TX.jStart);
    loadMap('oakhaven', { x: 23.5, y: 29.3, dir: -Math.PI / 2 });
    stageColumn(G.map);
  }
  function onSong(id) {
    if (!hasG() || stage() !== 1 || G.mapId !== 'oakhaven') return;
    const f = F(), ly = lyraOf(G.map); if (!ly) return;
    const s = typeof SONGS !== 'undefined' ? SONGS[id] : null;
    if (id === 'murmur') { if (dist(px(), py(), ly.x, ly.y) < 7 && !f.r43_you_hum) { f.r43_you_hum = true; say(TX.youHum, '', 6000); } return; }
    if (s && s.noise >= 1.5) {
      f.r43_strikes = (f.r43_strikes | 0) + 1; say(TX.staveTurns, 'bad', 5000);
      if (f.r43_strikes >= 2 && !f.r43_marched) { f.r43_marched = true; say(TX.marched, 'bad', 7000); }
    }
  }

  // ================================================================ the HUD
  function drawOverlay() {
    if (!hasG() || !active() || G.state !== 'play') return;
    const ctx = Engine.ctx, s = stage(); if (!ctx) return;
    ctx.save(); ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'center';
    const Y = (typeof VIEW_H === 'number' ? VIEW_H : 150) - 30;
    const bar = (y, frac, col) => { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(110, y, 100, 5); ctx.fillStyle = col; ctx.fillRect(110, y, Math.max(0, Math.min(100, 100 * frac)), 5); };
    if (s === 1) { ctx.fillStyle = '#d9a441'; ctx.fillText(TX.hudNote, 160, Y); }
    else if (s === 3) { ctx.fillStyle = R.blocked ? '#7fe060' : '#ff6a40'; ctx.fillText(TX.hudEye + ': ' + (R.blocked ? TX.hudBlocked : TX.hudSees), 160, Y); bar(Y + 4, R.seen / NEEDLE_SEEN, '#ff6a40'); }
    else if (s === 4) { ctx.fillStyle = R.onYou ? '#7fe060' : '#ff6a40'; ctx.fillText(TX.hudLenses + ': ' + (R.onYou ? TX.hudOnYou : TX.hudOnDrum), 160, Y - 14); bar(Y - 10, R.bolt / BOLT_SECS, '#d9a441'); ctx.fillStyle = '#9aa0b0'; ctx.fillText(TX.hudListening, 160, Y + 2); bar(Y + 6, R.q, '#7fe060'); }
    else if (s === 6) { ctx.fillStyle = '#ff6a40'; ctx.fillText(TX.hudCount + ' · ' + Math.max(0, Math.ceil(R.count)) + ' · ' + (F().r43_names | 0) + ' ' + TX.hudNames, 160, Y); bar(Y + 4, R.count / COUNT, '#ff6a40'); if (R.unhook) bar(Y + 10, 1 - R.unhook.t / UNHOOK_SECS, '#7fe060'); }
    ctx.restore();
  }

  // ================================================================ the tick, and the wiring
  function tick(dt) {
    if (!hasG() || guest()) return;
    const s = stage();
    if (s === 0) { tickDoor(dt); return; }
    if (G.state !== 'play') return;
    try {
      if (s === 1) tickProcession(dt);
      else if (s === 3) tickNeedle(dt);
      else if (s === 4) tickHold(dt);
      else if (s === 6) tickCount(dt);
    } catch (e) { warnOnce('tick' + s, e); }
  }
  function useOwn(e) {
    if (!e || !e._r43) return false;
    if (e.use === 'r43_pump') return usePump(e);
    if (e.use === 'r43_look') { say(e.look || e.label || '', '', 6000); return true; }
    return false;
  }
  function onLoad() {
    if (!hasG()) return;
    const s = stage(), m = G.map;
    if (s === 1 && m && m.id === 'oakhaven') { if (!lyraOf(m)) stageColumn(m); }
    if (s >= 2 && s <= 6 && m && m.id === 'rootvault') { stageVault(m); if (s === 3) { R.needle = NEEDLE_SECS; R.seen = 0; } if (s === 6 && R.count <= 0) { R.count = COUNT; R.lastSaid = 99; } }
  }
  function wire() {
    if (typeof update === 'function') {
      const _u = update;
      update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; };
    }
    if (typeof drawHUD === 'function') {
      const _d = drawHUD;
      drawHUD = function () { const r = _d.apply(this, arguments); try { drawOverlay(); } catch (e) { warnOnce('hud', e); } return r; };
    }
    if (typeof castSong === 'function') {
      const _c = castSong;
      castSong = function (id) { const before = G.song ? G.song.t : 0, v = G.player ? G.player.voice : 0; const r = _c.apply(this, arguments); try { if (id === 'murmur' ? G.murmurT > 0 : (G.song && G.song.t > 0 && (G.song.t !== before || G.player.voice !== v))) onSong(id); } catch (e) { warnOnce('song', e); } return r; };
    }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    if (typeof transfer === 'function') {
      const _t = transfer;
      transfer = function (portal) { try { if (portal && portal.map === 'rootvault' && hasG() && !guest() && !F().rite_started && F().coil_done) { say(TX.gateSealed, 'warn', 7000); return; } } catch (e) { warnOnce('gate', e); } return _t.apply(this, arguments); };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () { const r = _lm.apply(this, arguments); try { onLoad(); } catch (e) { warnOnce('load', e); } return r; };
    }
    if (typeof finishBore === 'function') {
      const _fb = finishBore;
      finishBore = function () { if (hasG() && stage() === 5) { try { enough(); } catch (e) { warnOnce('enough', e); } return; } return _fb.apply(this, arguments); };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () { const r = _rg.apply(this, arguments); try { if (hasG()) { if (stage() === 1) F().r43_d = 0; rearm(); onLoad(); } } catch (e) { warnOnce('restore', e); } return r; };
    }
    // Lyra's and Kaelen's standing lines follow the book: the coil goes in the engineer's toolbag; the Rite starts at her door
    if (typeof NPCS !== 'undefined') {
      const ly = NPCS.lyra, ka = NPCS.kaelen;
      if (ly && typeof ly.quest === 'function') {
        const own = ly.quest;
        ly.quest = function (g) {
          const f = g.flags;
          if (f.church_come && !f.rite_started && f.coil_done && !f.r43_palm) {
            return { text: TX.palm, choices: [{ t: TX.palmTake, f: () => { f.r43_palm = 1; journal('side', TX.palmJ); } }, { t: TX.palmLeave, f: null }] };
          }
          const r = own.apply(this, arguments);
          if (r && f.coil_done && !f.rite_started && /Take the shaft from the quarry/.test(r.text || '')) return { text: TX.lyraAfter, journal: null };
          return r;
        };
      }
      if (ka && typeof ka.quest === 'function') {
        const own = ka.quest;
        ka.quest = function (g) {
          const r = own.apply(this, arguments);
          if (!r) return r;
          if (/Keep the coil; it goes down in your bag/.test(r.text || '')) { if (g.has('coil')) g.take('coil'); return { text: TX.kaelenAfter + (g.has('charts') ? ' ' + String(r.text).slice(String(r.text).indexOf('And the charts.')) : ''), journal: r.journal }; }
          if (/Go down by the shaft; the pass opens it/.test(r.text || '')) return { text: TX.kaelenRepeat, journal: null };
          return r;
        };
      }
      if (NPCS.rooke && typeof talk === 'function') {
        const _t = talk;
        talk = function (e) {
          try {
            if (e && e.id === 'rooke' && hasG() && F().r43_palm === 1) { F().r43_palm = 2; F().rooke_drops = true; card(TX.rookeTitle, TX.rooke, [{ t: TX.rookeGo, f: () => journal('side', TX.rookeJ) }]); return; }
          } catch (err) { warnOnce('rooke', err); }
          return _t.apply(this, arguments);
        };
      }
    }
  }
  try { wire(); } catch (e) { console.warn('rite43 failed to wire', e); }

  return { TX, TEXTS, VO, seq, hush, slug, R, V, LEFT, DOOR, PATH, COLUMN, KERB, stage, ready, begin, startNeedle, singDown, enough, pour, stageVault, stageColumn, blocked, layout, usePump, onSong, tick, pathAt, pathLen,
    consts: { NEEDLE_SECS, NEEDLE_SEEN, BOLT_SECS, WATCH_LIMIT, COUNT, UNHOOK_SECS } };
})();
if (typeof window !== 'undefined') window.RITE43 = RITE43;
