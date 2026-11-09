// ============================================================
//  sidequests — Phase 9 (new gameplay systems), team QUESTS.
//  Three Oakhaven side quests for Book One, built from the game's own systems. Nothing here
//  edits data.js or maps.js: NPCs and items go in with Object.assign, entities are transient
//  and are put on the map when it is entered (the tobin.js / rumours.js pattern), and the
//  behaviour is added by wrapping globals (loadMap, attack, castSong, pickUp, useItem,
//  useDeco, renderDialogue, renderMap, updateNarrow, update).
//
//    1. A Reed for Pellow   Ada Pellow (Cooper's Row). Her husband's First Reed split in the
//                           frost and she can no longer hold his pitch. Someone kept it: Old
//                           Tam (who stood the watch with him) or Kaelen's glass hand (which
//                           Listens to what the split reed kept). Then a new reed is cut and
//                           tuned with REEDS.tuneFirstReed({ name, hz }) from reedcraft.js
//                           (a plain dialogue success path when that module is not there).
//    2. The Ringing Wood    Reeds-Miner Tomas (the clearing). One iron-bough to fell and haul.
//                           Iron-bough rings like a bell when struck: every stroke adds noise
//                           to G.noise, and hounds hear noise. Wool on the blade, a gust of
//                           wind, or a thrown stone make it quiet enough. A woken hound makes
//                           Tomas call it off until tomorrow.
//    3. Telling the Bees    Bettany's three skeps. In the Reach you tell the bees every birth
//                           and death, and nobody has since the Hedge went up. Murmur (N) the
//                           news close to each skep, inside the Narrow.
//
//  STATE: G.flags under p9q_ only, booleans or small integers, validated on every read
//  (anything else reads as "not started"). Stage flags: p9q_pellow (0-2), p9q_tomas (0-3),
//  p9q_bees (0-2); p9q_pellow_via (1 Tam, 2 Kaelen); p9q_tomas_prog / _muff / _wait;
//  p9q_bees_told (bitmask 0-7); p9q_<q>_done and p9q_<q>_closed (true). Every word shown
//  comes from the constant tables below: save data only ever selects among them.
//
//  CLOSED STATE: when the Greening (or anything after it) happens first, an open quest
//  writes one journal line ("Oakhaven is gone under the oaks; ...") and its people and
//  props leave the maps. Nothing here ever blocks a main-quest flag.
//
//  ART is procedural stand-in work (canvas): the hung reed, the skep, the log and stump, the
//  timber wagon and the fleece sacking. NPCs and portraits reuse the townsman / townswoman
//  sprites and faces until painted ones exist.
//
//  Switch: UPG.sideQuests (default true; no Options row, these are content). Off = the
//  original town: no NPCs, no props, no wrapped behaviour.
//  Every invented fact is marked [PROPOSED] next to it.
// ============================================================
'use strict';

if (typeof UPG !== 'undefined' && UPG && UPG.sideQuests === undefined) UPG.sideQuests = true;

const SIDEQ = (() => {
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ------------------------------------------------------------ every player-visible string
  // S() registers the string so the French file and the review file can be checked against the
  // code (test/sidequests.test.js reads SIDEQ.TEXTS).
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };

  // ------------------------------------------------------------ tuning
  const PELLOW_HZ = 203;           // [PROPOSED] Joram Pellow's Signature, a hair under the Flume bridge-post reed
  const PELLOW_NAME = 'Joram Pellow';   // [PROPOSED] Ada's husband; the brief leaves his name to the quest
  const TUNE = {
    need: 20,           // progress to fell the bough: axe 3 a stroke, sword 2, knife 1 ...
    ring: 3.0,          // the bell-note an iron-bough adds to a stroke
    muffle: 0.35,       // what is left of a stroke with wool on the blade
    muffMax: 4,         // strokes one bundle of wool lasts
    windCut: 0.7,       // how much of a stroke a full gust takes away
    fall: 3.5,          // the felling itself
    carryRun: 1.6,      // noise a second from running with the log on your back
    failWindow: 14,     // a hound that comes up within this many seconds of a stroke ends the day's work
    failRadius: 16,     // ... and is within this many cells of the tree
    woolMax: 4,
    murmurHi: 5.2,      // the Narrow: under this much noise the bees listen (a murmur from a walk is about 3.3, from a run about 5.1)
    hiveReach: 2.4,
  };
  const POWER = { sword: 2, longsword: 2, axe: 3, knife: 1, mace: 2, spear: 1, maul: 4, glass: 1 };   // hands and ranged: none
  const TREE_AT = [34.5, 8.2];     // the existing oak at the north-east end of the clearing that Tomas has chalked
  const state = { windOverride: null, lastStrikeT: -1e9, tuning: false, carryMsgT: -1e9, calls: [], swallowAir: false };

  // ------------------------------------------------------------ flags (validated on read)
  const flags = () => (typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object' && !Array.isArray(G.flags)) ? G.flags : {};
  function int(k, max) {
    const v = flags()[k];
    if (v === true) return Math.min(1, max);
    return (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max) ? v : 0;
  }
  function setInt(k, v) { try { flags()[k] = v | 0; } catch (e) { /* a save that cannot hold flags */ } }
  function setTrue(k) { try { flags()[k] = true; } catch (e) { /* ditto */ } }
  const done = (q) => flags()['p9q_' + q + '_done'] === true;
  const closed = (q) => flags()['p9q_' + q + '_closed'] === true;
  const STAGE = { pellow: ['p9q_pellow', 2], tomas: ['p9q_tomas', 3], bees: ['p9q_bees', 2] };
  const stage = (q) => int(STAGE[q][0], STAGE[q][1]);
  const open = (q) => active() && !done(q) && !closed(q);
  const dayNow = () => { const d = (typeof G !== 'undefined') ? Number(G.day) : 0; return Number.isFinite(d) ? clamp(Math.floor(d), 0, 99999) : 0; };

  // The world the quests live in: Oakhaven and the clearing before the Greening.
  const worldGone = () => { const f = flags(); return !!(f.greening || f.escaped || f.part3); };
  const on = () => { try { return !(typeof UPG !== 'undefined' && UPG && UPG.sideQuests === false); } catch (e) { return false; } };
  const active = () => on() && !worldGone();

  // ============================================================
  //  THE TEXT
  // ============================================================
  const TX = {
    // ---- quest 1: Ada Pellow
    ada: {
      name: S('Ada Pellow, widow of Cooper\'s Row'),
      greet: {
        polite: S('Good day to you. Softly. I sit out here more, now, under it. It does not sound, but I like to be under it.'),
        normal: S('Does it ring? True enough, I suppose. Keep it low.'),
        blunt: S('I have buried a husband and I have hung his reed twice. I will not be shouted at on my own step.'),
      },
      topics: {
        'Oakhaven': S('Seventy years in one street. It was louder when I was a girl. Everything was.'),
        'The Hedge': S('Joram went in 418. The family holds the note until the body lets go, and in the old days it was sung out after. It cannot be now. The Hedge eats a note before it is halfway to the door.'),
      },
      intro: S('Does it ring? No, never mind; I only say it from habit. Look up. That is Joram\'s reed. His mother hung it over his cradle and I carried it to this door the day we married. It split in the frost three nights ago, down the slot, and now it hangs with its mouth open as if it had something to tell me. I held his pitch the night he died, in my head, because there is nowhere else to hold it now. I put the stone on his tongue when he let go. Since then I have hummed it every evening to keep it. Tonight it came out mine.'),
      yes: S('I will find his note.'),
      no: S('I am sorry. I cannot help.'),
      declined: S('No. Nobody can, I suppose. Thank you for standing there.'),
      accept: S('She reaches up with a hooked stick and brings the reed down, and puts it in your hands as if it might spill. "Joram hummed. Never a tune. One note, when he was thinking, or the bread was proving, or he had been told something he did not like. Old Tam kept the night watch with him nine winters; Tam will have it. Or the engineer outside the gate, with the arm. They say the glass hears what a thing has kept. I would not know how to ask him." She wipes her hand down her apron. "When you have the note, come back. I will not hang a reed that is not his."'),
      waiting: S('Have you his note? No. Tam at the Flume crossing kept the watch with him. Or the engineer past the north gate, if you can bear him. Either will do.'),
      ready: S('You have it. It is in the way you hold your mouth. There is cane in the shed. Cut it, and tune it against your breastbone the way a Cantor does. I will watch, if you do not mind. I cannot do it; my breath is not what it was.'),
      cut: S('Cut the cane and tune it to his note.'),
      notyet: S('Not yet.'),
      notyetReply: S('Take your time. He never hurried either.'),
      leadIn: S('She puts the cane in your hand and steps back, and folds her arms as if she were cold.'),
      // the scene after the cane is tuned (a held event): two variants, by who kept the note
      sceneTam: S('The cane is green and a hand long. You hold it against your breastbone and hum until the cane hums back, then cut the slot. You blow across it and nothing comes. Of course nothing comes; it is the Hedge. But Ada\'s hand has closed on your wrist. "That is him," she says. "In the bone. You need not have heard it. That is him." She hangs it herself, on the old nail, with the hooked stick, and it turns once and hangs level. "Tam had it right," she says. "Tam would." Then, more quietly: "It was a comfort to have it wrong. A wrong reed can be mended. This one is right, and that is the end of him, isn\'t it." She presses eight sovereigns and a jar of honey on you and goes in. The door is barred from inside before you have turned, and from behind it, very low, someone begins to hum.'),
      sceneKaelen: S('The cane is green and a hand long. You hold it against your breastbone and hum until the cane hums back, then cut the slot. You blow across it and nothing comes. Of course nothing comes; it is the Hedge. But Ada\'s hand has closed on your wrist. "That is him," she says. "In the bone. You need not have heard it. That is him." She hangs it herself, on the old nail, with the hooked stick, and it turns once and hangs level. "In the cane the whole time, the engineer said," she says. "Well. I held it too hard, then." Then, more quietly: "It was a comfort to have it wrong. A wrong reed can be mended. This one is right, and that is the end of him, isn\'t it." She presses eight sovereigns and a jar of honey on you and goes in. The door is barred from inside before you have turned, and from behind it, very low, someone begins to hum.'),
      sceneTitle: S('The reed'),
      sceneBye: S('Leave her to it'),
      cost: S('Holding a dead man\'s note costs you a little voice.'),
      cancelled: S('You put the cane down. Ada waits.'),
      reedSplit: S('A First Reed over a door, split down the slot by the frost. Its mouth hangs open.'),
      reedNew: S('A new reed on the old nail. It hangs level. It does not sound; nothing does in here.'),
      reedBare: S('An empty nail over a door, worn bright where a cord has hung for fifty years.'),
      jOffer: S('Ada Pellow, on Cooper\'s Row, has taken her husband\'s First Reed down. It split in the frost. Joram Pellow went into the ground in 418 with a stone on his tongue, and Ada can no longer hold his pitch. She wants it found, and a new reed cut. Old Tam, at the Flume crossing, kept the night watch with him. The engineer outside the gate can Listen to what a reed has kept.'),
      jTam: S('Old Tam hummed Joram Pellow\'s note for me at the Flume crossing: one low note, a hair under the bridge-post reed, about two hundred and three. I should take it back to Ada.'),
      jKaelen: S('Kaelen laid his glass hand along Joram Pellow\'s split reed and Listened: about two hundred and three. A cane keeps the cut it was given. I should take the note back to Ada.'),
      jDone: S('I cut and tuned a new reed for Joram Pellow, to the note he hummed, and Ada hung it over her door. It does not sound; nothing does in here. She says it was a comfort to have it wrong. She gave me eight sovereigns and a jar of honey.'),
      jClosed: S('Oakhaven is gone under the oaks; Ada Pellow\'s door is a trunk now, and Joram\'s reed, split or whole, is somewhere in the bark.'),
      itemName: S('Split First Reed'),
      itemDesc: S('Joram Pellow\'s First Reed, split down the slot by the frost. A cane keeps the cut it was given, and the cut was made for one pitch.'),
      // the two other people's side of it
      tamBtn: S('Ask about Joram Pellow'),
      tamLine: S('Ask about Joram Pellow.'),
      tamBusy: S('Hm? Joram? Ask me after. I have a question of my own sitting on me.'),
      tamTells: S('Joram. Hm. Nine winters on the bridge, the two of us, and he never said ten words. He hummed. One note, low, like a man testing a plank. He came in a hair under the bridge-post reed when the wind was right, and the post sang back at him, and he nodded at it. Here.'),
      tamAgain: S('Again, then. Here.'),
      tamHum: S('Tam hums it, low. You feel it in your breastbone before you hear it: a flat, patient note, about two hundred and three.'),
      kaelenBtn: S('Ask him to Listen to the split reed'),
      kaelenLine: S('Will you Listen to this reed?'),
      kaelenReply: S('He takes the reed as if it might still be warm. The glass palm lies along the split, and the glass hums once, far down its length. "Cane keeps the cut it was given," he says. "Somebody tuned this against a man\'s breastbone and cut the slot to what they heard. The slot remembers." A long breath. "Two hundred and three, near enough. A man who hummed to himself. Not in a hurry." He gives it back. "Tell her it was in the cane all along." A pause. "It generally is."'),
    },
    // ---- quest 2: Tomas
    tomas: {
      name: S('Reeds-Miner Tomas, timber-cutter'),
      greet: {
        polite: S('Does it ring? True enough. The wagon is loaded, and it hums, and I find I am used to it.'),
        normal: S('The wagons do not creak any more. They hum. You feel it through the seat. A man could miss a creak.'),
        blunt: S('I have one good hand and a bad temper. Choose which you want to speak to.'),
      },
      topics: {
        'The Hedge': S('Timber comes out of the clearing and goes into the town, and the Hedge takes the noise off it at the gate. I have wondered where the noise goes.'),
        'Oakhaven': S('The Synod counts timber by the load. It does not count what the load weighs on a man.'),
      },
      intro: S('Does it ring? Good. Keep it that way. I need someone who can be quiet, and I am not built for it. He holds up the glove. Three fingers to a saw, and the fourth grew back wrong. Everybody looks. Quota day is close and I am one load short. There is an iron-bough at the north-east end of the clearing, a stone\'s throw from where the hounds sleep. It rings like a bell the moment you strike it, and a hound comes to a ring like a dog to its name. The Hedge eats noise in town. Out here nothing eats anything.'),
      yes: S('Tell me how to fell it quietly.'),
      no: S('That is not my trade.'),
      declined: S('No. Nobody\'s trade. Come back if the quota frightens you more than the hounds do.'),
      accept: S('Three ways, and none of them sure. Wool: take a fistful of carded fleece from the mill and bind the blade, and the bough only knocks. Nell is not carding; she will not miss it. Wind: when a gust is up the wood has something else to ring over. Or draw the hounds off with a stone, if you are clever and they are not. Strike, wait, let the ringing die, strike again. Then carry the log to my wagon. Carry it; do not run it. It knocks on everything.'),
      waiting: S('Not yet. The bough is at the north-east end of the clearing, past the hound-bed, chalked. Quiet, mind. Wool on the blade, or wait for a gust.'),
      calledOff: S('Leave it for today. A struck bough remembers the hour. Ask it again tomorrow.'),
      felled: S('It is down. I felt it in the cart-boards before I heard anything. Fetch the log; it lies at the foot of the stump. Carry it, do not run it.'),
      deliver: S('He takes the log in the crook of the bad hand and sets it on the wagon without a sound. The wagon hums. "That is the quota. It goes to shore the headframe, because the Consortium likes timber that rings; they can hear the bore from the road. I know what it holds up." He counts eighteen sovereigns out of a sock, and the sock hums too. "I need the quota or the Synod takes the wagon and the mare. You may think what you like of me. I have been thinking it since August."'),
      jOffer: S('Reeds-Miner Tomas is one load short for the Synod\'s quota day. The iron-bough he wants is chalked at the north-east end of the clearing, a stone\'s throw from where the hounds sleep, and it rings like a bell when struck. Wool from the mill on the blade, a gust of wind, or a thrown stone to draw the hounds off. Then carry the log to his wagon, and do not run.'),
      jCalledOff: S('The iron-bough rang and a hound came up. Tomas called it off with two falling notes. He says to leave the wood a day to forget the hour.'),
      jFelled: S('The iron-bough is down. The log lies at the foot of the stump, and it has to be carried to Tomas\'s wagon without running, or it will knock against everything I own.'),
      jDone: S('Tomas has his last load. He paid me out of a sock that hums, and said I could think what I liked of him; he has been thinking it since Firstfruit. The timber goes to shore the headframe.'),
      jClosed: S('Oakhaven is gone under the oaks; Tomas\'s wagon went down the road, and the iron-bough, felled or standing, is somebody else\'s quota now.'),
      wagon: S('Tomas\'s timber wagon. The boards hum under your hand.'),
      treeFresh: S('An iron-bough, chalked by Tomas. Strike it and it rings like a bell.'),
      treeWind: S('An iron-bough, chalked by Tomas. The wind is up, and will cover a stroke.'),
      treeWait: S('An iron-bough, still humming from the last time. Leave it for a day.'),
      kerf0: S('Chalked, and untouched.'),
      kerf1: S('The kerf is a hand deep.'),
      kerf2: S('The kerf is half through.'),
      kerf3: S('It is nearly through. The bough has begun to lean.'),
      ringLoud: S('The bough rings: a bell, struck in a cupboard.'),
      ringWool: S('The wool takes the note. The bough only knocks.'),
      ringWind: S('A gust takes the note and carries it off.'),
      bare: S('Bare hands will only bruise you. Tomas wants a blade on it.'),
      stillHumming: S('The bough is still humming from the last time. Tomas said to leave it a day.'),
      calloff: S('Tomas whistles from the camp: two notes, falling. A hound is up. He is calling it off.'),
      fell: S('The iron-bough lets go. It comes down across the ferns with one long flat note, and then your ears are the loudest thing in the clearing.'),
      carry: S('You get the log onto your shoulder. It hums against your collarbone. Walk; do not run.'),
      knock: S('The log knocks on your pack-buckle.'),
      stump: S('The stump of the iron-bough, sawn clean and chalked.'),
      logLabel: S('An iron-bough log, lying where it fell.'),
      woolName: S('Bundle of Carded Wool'),
      woolDesc: S('Grey fleece from the Carders\' mill. Wound round a blade, it deadens a ringing strike a few times over. Use it from your pack.'),
      logName: S('Iron-bough Log'),
      logDesc: S('A length of iron-bough, heavy as a bell and nearly as willing to ring. Carry it; do not run with it.'),
      fleeceLabel: S('Sacking of grey fleece, carded and never collected.'),
      fleeceTake: S('You take a bundle of grey fleece from the open sacking. Nobody has carded it since the engine stopped.'),
      fleeceEnough: S('You have all the wool the work will want.'),
      wrap: S('You wind the wool round the blade and bind it with a cord. It will deaden a ringing strike a few times.'),
      wrapped: S('The blade is already wrapped.'),
    },
    // ---- quest 3: the bees
    bees: {
      intro: S('Softly, love, and come round where the cloth hides my mouth. My bees have stopped coming home. Three skeps, my mother\'s and hers before, and they go out to the orchard and the chapel lime and they do not come back to the straw. They hang in the Hedge-wool in clumps, like a bruise. Nobody has told them anything since the Hedge went up. You tell the bees, in the Reach, every birth and every death, or they go. And you cannot tell a bee out loud in a town that eats its sounds. It wants a murmur, close, at the straw. I have a bad knee and forty-one lullabies in me and nothing left over. Will you tell them for me?'),
      yes: S('Tell me what to say.'),
      no: S('I have no time for bees.'),
      declined: S('Then I shall go on being a woman who talks to straw. Go softly.'),
      accept: S('Three skeps, three tellings. The one behind my house wants the birth: a girl to the Madders on Nullday, with her grandmother\'s hands. The one in the Governor\'s orchard wants the dead, in order of the years: Essa, the year the old king went into the glass, and Joram Pellow in 418. The one by the Chapel wants the stranger, and you know who that is. Stand close, keep your voice in your chest, and murmur it. N, if your hands know it. Or press E at the straw. Not loud. Bees mind a shout worse than hounds do.'),
      waiting: S('Behind my house, in the Governor\'s orchard, by the Chapel. Close, and low. I can hear which of them have had it; they go quiet in a different way.'),
      reward: S('She does not say anything for a moment. Then she lifts a hand to her ear. "They are home. I can hear them from here, under the market. I would know that kettle-sound anywhere." She puts two jars of honey into your hands and six sovereigns on top. "Now it hums, and a hum is a sound, and a sound brings hounds. I shall be buying fleece for the skeps till the leaf falls. There is your invoice, love. I did not ask for it either."'),
      jOffer: S('Bettany\'s bees have stopped coming home. In the Reach you tell the bees every birth and death, and nobody has told them anything since the Hedge went up. I am to murmur the news close to three skeps: behind Bettany\'s house (a birth), in the Governor\'s orchard (the dead), by the Chapel (the stranger, which is me).'),
      jAll: S('All three skeps have had their news. Bettany will want to hear it.'),
      jDone: S('Bettany\'s bees are home. She paid me in honey and warned me that a hum draws hounds; she will be buying fleece for the skeps. She says that is the invoice, and that she did not ask for it either.'),
      jClosed: S('Oakhaven is gone under the oaks; Bettany\'s bees went up into the new boughs, and the news I was carrying went with them.'),
      skepUntold: S('A straw skep. The bees hang in it in a silent clump.'),
      skepTold: S('A straw skep. It hums low, like a kettle thinking about it.'),
      skepQuiet: S('A straw skep bound with bramble. The bees inside are quiet. Too quiet.'),
      evTitle: S('The skep'),
      evBody: S('The bees hang in the straw in a clump, and nothing in the clump moves. Bettany said close, and low.'),
      evYes: S('Murmur the news to them'),
      evNo: S('Step back'),
      evTold: S('The skep hums back, softly.'),
      tooLoud: S('The bees lift off the comb at the noise and settle again, grumbling. Softer.'),
      tell1: S('You murmur it to the skep: a girl born to the Madders on Nullday, with her grandmother\'s hands. The straw hums back once, the way a kettle thinks about boiling.'),
      tell2: S('You murmur the dead to the skep, in the order of the years: Essa, the year the old king went into the glass; Joram Pellow, in 418. Inside the straw something settles.'),
      tell2b: S('You murmur the dead to the skep, in the order of the years: Essa, the year the old king went into the glass; Joram Pellow, in 418, whose reed hangs level over his door. Inside the straw something settles.'),
      tell3: S('You murmur your own name to the skep, and that you came up the Greenroot road in the autumn. The hum inside changes by a half-tone, as if somebody had made room.'),
    },
    // ---- the echoes
    rumour: {
      pellowOpen: S('Ada Pellow has taken the reed down from over her door, the one that split in the frost, and she has been asking the lane what her husband used to hum. Nobody can say. We all thought we would remember.'),
      pellowDone: S('There is a new reed over the Pellow door. It does not sound, mind; nothing does in here. But Ada has started sitting out under it of an evening, and the lane has stopped crossing the street.'),
      tomasOpen: S('Reeds-Miner Tomas is a load short for quota day and has not a man in Oakhaven who will hold the other end of a saw. He asks strangers now. He says there is an iron-bough out past the hound-bed.'),
      tomasDone: S('The timber wagon went out with the iron-bough wrapped in sacking and the hounds on the north road never stirred. Tomas stood a round for the mare. Not for the stranger. For the mare.'),
      beesOpen: S('Bettany\'s bees have stopped coming home to the skeps. She says nobody has told them anything since the Hedge went up. Half the town has started to feel guilty about its dead.'),
      beesDone: S('Somebody told Bettany\'s bees the news, a name at a time, in a murmur. They hum again behind her house. The hounds cannot hear it, which is the only reason I allow it.'),
    },
    gazette: S('A consignment of ringing timber has been received at the quota in good order. Ringing is recorded as a property of the timber. It is not recorded as a property of the Reach.'),
    gazetteNote: S('Tomas has made quota'),
  };

  // ============================================================
  //  PROCEDURAL STAND-IN ART
  // ============================================================
  function paint(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let i = 0; i < w * h; i++) { const o = i * 4; if (u8[o + 3] < 100) u8[o + 3] = 0; else u8[o + 3] = 255; }
    return new Uint32Array(id.data.buffer);
  }
  function reg(name, w, h, draw, extra) {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, draw), hs: 1, cx: 0.5, dy: 0 }, extra || {}));
  }
  function paintAll() {
    // a First Reed on its cord: a cane with a slot cut in it, split or whole
    const reed = (split, col) => (c, w, h) => {
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, 8); c.stroke();
      c.fillStyle = col[0]; c.fillRect(w / 2 - 3, 8, 6, h - 10);
      c.fillStyle = col[1]; c.fillRect(w / 2 - 3, 8, 2, h - 10);
      c.fillStyle = '#2a1d10'; c.fillRect(w / 2 - 2, 20, 4, 9);
      c.fillStyle = col[2]; c.fillRect(w / 2 - 3, h - 4, 6, 2);
      if (split) { c.strokeStyle = '#1c130a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(w / 2 - 1, 24); c.lineTo(w / 2 + 1, 33); c.lineTo(w / 2 - 1, 41); c.lineTo(w / 2 + 1, h - 3); c.stroke(); }
    };
    reg('p9_reed_split', 14, 58, reed(true, ['#a8985a', '#c4b678', '#7a6c3a']));
    reg('p9_reed_new', 14, 58, reed(false, ['#8aa05a', '#a8bf78', '#5a7034']));
    // a straw skep: a dome of bound coils on a board
    reg('p9_skep', 44, 40, (c, w, h) => {
      c.fillStyle = '#4a3622'; c.fillRect(2, h - 5, w - 4, 5);
      for (let i = 0; i < 6; i++) {
        const y = h - 6 - i * 5.2, r = (w / 2 - 3) * Math.sqrt(Math.max(0.04, 1 - Math.pow(i / 6.4, 2)));
        c.fillStyle = i % 2 ? '#c4a24c' : '#a8893a'; c.beginPath(); c.ellipse(w / 2, y, r, 3.4, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#6a5222'; c.lineWidth = 0.8; c.stroke();
      }
      c.fillStyle = '#1c130a'; c.beginPath(); c.ellipse(w / 2, h - 8, 4, 3, 0, 0, Math.PI * 2); c.fill();
    });
    // a felled log, end-on grain showing, and the stump it came from
    reg('p9_log', 72, 22, (c, w, h) => {
      c.fillStyle = '#4a4036'; c.fillRect(6, 4, w - 12, h - 8);
      c.fillStyle = '#5f5446'; c.fillRect(6, 4, w - 12, 5);
      c.fillStyle = '#9a8a62'; c.beginPath(); c.ellipse(7, h / 2, 5, (h - 6) / 2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6a5a3a'; c.lineWidth = 0.8; c.beginPath(); c.ellipse(7, h / 2, 2.4, 4, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#7a8a8e'; for (let i = 0; i < 5; i++) c.fillRect(14 + i * 11, 6 + (i % 2) * 6, 4, 1.5);   // a bronze sheen along the bark
    }, { hs: 1 });
    reg('p9_stump', 40, 24, (c, w, h) => {
      c.fillStyle = '#4a4036'; c.fillRect(6, 8, w - 12, h - 8);
      c.fillStyle = '#9a8a62'; c.beginPath(); c.ellipse(w / 2, 8, (w - 12) / 2, 5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6a5a3a'; c.lineWidth = 0.8; for (let r = 4; r < 14; r += 4) { c.beginPath(); c.ellipse(w / 2, 8, r, r * 0.4, 0, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#e8e0cc'; c.fillRect(w / 2 - 1, 11, 3, 6);   // Tomas's chalk
    });
    // a timber wagon, loaded
    reg('p9_wagon', 96, 56, (c, w, h) => {
      c.fillStyle = '#3a2a1a'; c.fillRect(6, 26, w - 12, 7);
      c.fillStyle = '#4a3622'; c.fillRect(8, 33, w - 16, 3);
      for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#4a4036' : '#5a4e40'; c.fillRect(10, 8 + i * 6, w - 20, 6); c.fillStyle = '#9a8a62'; c.beginPath(); c.ellipse(11, 11 + i * 6, 2.5, 3, 0, 0, Math.PI * 2); c.fill(); }
      for (const x of [22, w - 22]) { c.fillStyle = '#2a1d10'; c.beginPath(); c.arc(x, 44, 11, 0, Math.PI * 2); c.fill(); c.fillStyle = '#5a4630'; c.beginPath(); c.arc(x, 44, 8, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a1d10'; c.lineWidth = 1.4; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(x, 44); c.lineTo(x + Math.cos(a * 1.047) * 8, 44 + Math.sin(a * 1.047) * 8); c.stroke(); } }
      c.fillStyle = '#3a2a1a'; c.fillRect(w - 12, 20, 14, 3);
    });
    // grey fleece in an open sack
    reg('p9_fleece', 46, 28, (c, w, h) => {
      c.fillStyle = '#6a5c44'; c.fillRect(4, 10, w - 8, h - 10);
      c.fillStyle = '#7a6c52'; c.fillRect(4, 10, w - 8, 3);
      c.fillStyle = '#b8b4a8';
      for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(9 + i * 5.2, 9 - (i % 3) * 1.5, 5, 5.5, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#9a968a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(12 + i * 6, 11, 3.5, 3, 0, 0, Math.PI * 2); c.fill(); }
    });
  }
  try { if (typeof document !== 'undefined') paintAll(); } catch (e) { console.warn('sidequests: art failed', e); }

  // ============================================================
  //  CATALOGUE: items and people
  // ============================================================
  const ITEM_DEFS = {
    p9_split_reed: { name: TX.ada.itemName, sprite: 'loot', desc: TX.ada.itemDesc, key: true },
    p9_wool: { name: TX.tomas.woolName, sprite: 'loot', desc: TX.tomas.woolDesc, use: 'p9_wrap', value: 1 },
    p9_bough: { name: TX.tomas.logName, sprite: 'loot', desc: TX.tomas.logDesc, key: true },
  };
  if (typeof ITEMS !== 'undefined') Object.assign(ITEMS, ITEM_DEFS);

  // ---- quest 1: Ada
  function adaQuest(g) {
    if (!active() || done('pellow') || closed('pellow')) return null;
    const A = TX.ada, s = stage('pellow');
    if (s === 0) {
      return { text: A.intro, choices: [
        { t: A.yes, f: () => {
          setInt('p9q_pellow', 1); G.give('p9_split_reed'); syncAll();
          journal('side', A.jOffer);
          return A.accept;
        } },
        { t: A.no, f: () => A.declined },
      ] };
    }
    if (s === 1) return { text: A.waiting };
    return { text: A.ready, choices: [
      { t: A.cut, f: () => { setTimeout(startTuning, 0); return A.leadIn; } },
      { t: A.notyet, f: () => A.notyetReply },
    ] };
  }

  // Tuning: REEDS.tuneFirstReed({ name, hz }) when reedcraft.js provides it, else a plain success.
  // The contract is not fixed yet, so every sane answer is read: a Promise (false = cancelled),
  // false (cancelled), a callback named done/onDone/cancel/onCancel, or nothing at all (a panel
  // opened: success when it closes). Anything truthy is a success.
  function startTuning() {
    if (state.tuning || !open('pellow') || stage('pellow') !== 2) return;
    state.tuning = true;
    let finished = false;
    const ok = () => { if (finished) return; finished = true; state.tuning = false; finishTuning(); };
    const no = () => { if (finished) return; finished = true; state.tuning = false; try { msg(TX.ada.cancelled, '', 4000); } catch (e) { /* no HUD */ } };
    // Ada's talk is over: the tuning panel (or the plain scene) takes the screen, so close hers first
    try { if (G.state === 'dialogue') { closeModal(); G.state = 'play'; } } catch (e) { /* none open */ }
    const R = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.tuneFirstReed === 'function') ? REEDS : null;
    state.calls.push({ real: !!R });
    if (!R) { ok(); return; }
    let res;
    try { res = R.tuneFirstReed({ name: PELLOW_NAME, hz: PELLOW_HZ, done: ok, onDone: ok, cancel: no, onCancel: no }); }
    catch (e) { console.warn('sidequests: tuneFirstReed failed, using the plain path', e); ok(); return; }
    if (res && typeof res.then === 'function') { res.then((v) => (v === false ? no() : ok()), () => no()); return; }
    if (res === false || res === null) { no(); return; }
    if (res !== undefined) { ok(); return; }
    // undefined: callbacks may still fire; otherwise treat the panel closing as the end of the work
    let waited = 0;
    const poll = setInterval(() => {
      waited += 0.25;
      if (finished) { clearInterval(poll); return; }
      const busy = (typeof G !== 'undefined' && (G.openPanel || G.state === 'event' || G.state === 'panel'));
      if (!busy && waited > 0.4) { clearInterval(poll); ok(); }
      else if (waited > 120) { clearInterval(poll); no(); }
    }, 250);
  }
  function finishTuning() {
    if (!open('pellow')) return;
    const A = TX.ada, via = int('p9q_pellow_via', 2);
    // settle the books first: if anything below throws, the reward can never be paid twice
    setTrue('p9q_pellow_done'); G.take('p9_split_reed'); syncAll();
    G.gold(8); G.give('honey'); questXp(50);
    try { G.player.voice = Math.max(0, (Number(G.player.voice) || 0) - 4); msg(A.cost, 'warn', 4500); } catch (e) { /* no voice to spend */ }
    journal('side', A.jDone);
    try { closeModal(); } catch (e) { /* none open */ }
    G.state = 'play';
    showEvent(A.sceneTitle, via === 2 ? A.sceneKaelen : A.sceneTam, [{ t: A.sceneBye, f: null }]);
  }
  function learnPitch(via) {
    if (stage('pellow') < 2) { setInt('p9q_pellow', 2); setInt('p9q_pellow_via', via); journal('side', via === 2 ? TX.ada.jKaelen : TX.ada.jTam); }
  }

  // ---- quest 2: Tomas
  function waitLeft() { const w = int('p9q_tomas_wait', 99999); return w > 0 && dayNow() < w; }
  function tomasQuest(g) {
    if (!active() || done('tomas') || closed('tomas')) return null;
    const T = TX.tomas, s = stage('tomas');
    if (s === 0) {
      return { text: T.intro, choices: [
        { t: T.yes, f: () => { setInt('p9q_tomas', 1); syncAll(); journal('side', T.jOffer); return T.accept; } },
        { t: T.no, f: () => T.declined },
      ] };
    }
    if (s === 1) return { text: waitLeft() ? T.calledOff : T.waiting };
    if (s === 2) return { text: T.felled };
    // s === 3: the log is on your back
    if (!G.has('p9_bough')) return { text: T.felled };
    G.take('p9_bough'); setTrue('p9q_tomas_done'); syncAll();
    G.gold(18); questXp(60);
    return { text: T.deliver, journal: ['side', T.jDone] };
  }

  // ---- quest 3: Bettany (her own quest() only ever returned null)
  function beesQuest(g) {
    if (!active() || done('bees') || closed('bees')) return null;
    const B = TX.bees, s = stage('bees');
    if (s === 0) {
      return { text: B.intro, choices: [
        { t: B.yes, f: () => { setInt('p9q_bees', 1); syncAll(); journal('side', B.jOffer); return B.accept; } },
        { t: B.no, f: () => B.declined },
      ] };
    }
    if (s === 1) return { text: B.waiting };
    setTrue('p9q_bees_done'); syncAll();
    G.gold(6); G.give('honey'); G.give('honey'); questXp(50);
    return { text: B.reward, journal: ['side', B.jDone] };
  }

  const NPC_DEFS = {
    p9_ada: {
      name: TX.ada.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low',
      greet: TX.ada.greet, topics: TX.ada.topics, quest: adaQuest,
    },
    p9_tomas: {
      name: TX.tomas.name, sprite: 'townsman', portrait: 'townsman', tier: 'low',
      greet: TX.tomas.greet, topics: TX.tomas.topics, quest: tomasQuest,
    },
  };
  if (typeof NPCS !== 'undefined') {
    Object.assign(NPCS, NPC_DEFS);
    if (NPCS.bettany) {
      const bq = NPCS.bettany.quest;
      NPCS.bettany.quest = (g) => beesQuest(g) || (typeof bq === 'function' ? bq(g) : null);
    }
  }

  // ============================================================
  //  PLACES: what stands where (all transient; rebuilt from the flags on every map change)
  // ============================================================
  const SPECS = [
    { id: 'ada', map: 'oakhaven', when: () => open('pellow'), make: () => ({ kind: 'npc', id: 'p9_ada', x: 16.9, y: 30.6, sprite: 'townswoman', scale: 1, solid: true, radius: 0.35, facing: Math.PI }) },
    { id: 'door_reed', map: 'oakhaven', when: () => open('pellow') ? stage('pellow') === 0 : done('pellow'), make: () => ({ kind: 'deco', sprite: 'p9_reed_split', x: 16.1, y: 29.5, scale: 0.7, yOff: -0.3, solid: false, radius: 0.1, label: TX.ada.reedSplit }),
      update: (e) => { const d = done('pellow'); e.sprite = d ? 'p9_reed_new' : 'p9_reed_split'; e.label = d ? TX.ada.reedNew : TX.ada.reedSplit; } },
    { id: 'door_nail', map: 'oakhaven', when: () => open('pellow') && stage('pellow') > 0, make: () => ({ kind: 'deco', sprite: 'p9_reed_nail', x: 16.1, y: 29.5, scale: 0.1, yOff: -0.74, solid: false, radius: 0.05, nopick: false, label: TX.ada.reedBare }) },
    { id: 'tomas', map: 'clearing', when: () => open('tomas'), make: () => ({ kind: 'npc', id: 'p9_tomas', x: 24.6, y: 30.4, sprite: 'townsman', scale: 1, solid: true, radius: 0.35, facing: -Math.PI / 2 }) },
    { id: 'wagon', map: 'clearing', when: () => open('tomas'), make: () => ({ kind: 'deco', sprite: 'p9_wagon', x: 26.4, y: 31.4, scale: 0.75, solid: true, radius: 0.7, label: TX.tomas.wagon }) },
    { id: 'stump', map: 'clearing', when: () => done('tomas') || (open('tomas') && stage('tomas') >= 2), make: () => ({ kind: 'deco', sprite: 'p9_stump', x: TREE_AT[0], y: TREE_AT[1], scale: 0.42, solid: false, radius: 0.3, label: TX.tomas.stump }) },
    { id: 'bough', map: 'clearing', when: () => open('tomas') && stage('tomas') === 2, make: () => ({ kind: 'item', item: 'p9_bough', sprite: 'p9_log', x: TREE_AT[0] - 1.3, y: TREE_AT[1] + 0.9, scale: 0.4, yOff: 0.06, solid: false, label: TX.tomas.logLabel }) },
    { id: 'fleece', map: 'mill', when: () => open('tomas'), make: () => ({ kind: 'deco', sprite: 'p9_fleece', x: 3.3, y: 1.9, scale: 0.42, solid: true, radius: 0.35, use: 'p9_fleece', label: TX.tomas.fleeceLabel }) },
    { id: 'hive1', map: 'oakhaven', when: () => hivesUp(), make: () => hive(28.6, 34.4, 1) },
    { id: 'hive2', map: 'oakhaven', when: () => hivesUp(), make: () => hive(53.5, 34.6, 2) },
    { id: 'hive3', map: 'oakhaven', when: () => hivesUp(), make: () => hive(44.7, 9.6, 4) },
  ];
  // the skeps stand once Bettany has asked, and stay (humming) once the bees are home
  function hivesUp() { return active() && (done('bees') || (!closed('bees') && stage('bees') >= 1)); }
  function hive(x, y, bit) { return { kind: 'deco', sprite: 'p9_skep', x, y, scale: 0.55, solid: true, radius: 0.4, use: 'p9_skep', _bit: bit, label: TX.bees.skepQuiet }; }
  function hiveLabel(e) {
    const s = stage('bees');
    if (done('bees') || (int('p9q_bees_told', 7) & e._bit)) return TX.bees.skepTold;
    return s >= 1 ? TX.bees.skepUntold : TX.bees.skepQuiet;
  }
  // the nail the reed hung on is a pixel of iron: reuse the reed sprite's cord end, tiny
  try { if (typeof document !== 'undefined') reg('p9_reed_nail', 6, 6, (c) => { c.fillStyle = '#6a6a6a'; c.fillRect(2, 0, 2, 5); c.fillStyle = '#a0a0a0'; c.fillRect(2, 0, 1, 5); }); } catch (e) { /* art */ }

  function removeMine(m, id) {
    for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p9 === id) m.entities.splice(i, 1);
  }
  function syncTree(m) {
    if (m.id !== 'clearing' || !realMap(m)) return;
    const tree = m.entities.find((e) => e && e.kind === 'deco' && e.sprite === 'oak' && Math.abs(e.x - TREE_AT[0]) < 0.3 && Math.abs(e.y - TREE_AT[1]) < 0.3 && !e.transient);
    if (!tree) return;
    const live = open('tomas') && stage('tomas') >= 1;
    // felled once it is down, and for good once the timber is delivered. A save made while it was
    // felled restores hidden:true before this module has tagged the tree, so the flags decide, not the tag.
    const felled = done('tomas') || (live && stage('tomas') >= 2);
    if (live) {
      tree._p9 = 'tree'; tree.use = 'p9_tree';
      tree.label = waitLeft() ? TX.tomas.treeWait : (windCover(tree.x, tree.y) > 0.45 ? TX.tomas.treeWind : TX.tomas.treeFresh);
    } else if (tree._p9 === 'tree') {
      delete tree._p9; delete tree.use; delete tree.label;
    }
    tree.hidden = felled; tree.solid = !felled;
  }
  // Put this map's people and props where the flags say they stand. Idempotent.
  // The coordinates above are only true on the real maps. A fixture or a mod that reuses a map id
  // (test/visual.test.js swaps in a 32x24 "oakhaven") must not get props dropped into its walls.
  const DIMS = { oakhaven: [70, 64], clearing: [40, 36], mill: [14, 12] };
  const realMap = (m) => !!DIMS[m.id] && m.w === DIMS[m.id][0] && m.h === DIMS[m.id][1];
  function ensure(m) {
    if (!m || !Array.isArray(m.entities) || !realMap(m)) return;
    const live = active();
    for (const sp of SPECS) {
      if (sp.map !== m.id) continue;
      let want = false;
      try { want = live && !!sp.when(); } catch (e) { want = false; }
      const have = m.entities.find((e) => e && e._p9 === sp.id);
      if (!want) { if (have) removeMine(m, sp.id); continue; }
      let e = have;
      if (!e) {
        e = Object.assign(sp.make(), { transient: true, _p9: sp.id, _decor: true });
        if (typeof hydrate === 'function') hydrate(e);
        m.entities.push(e);
      }
      if (sp.update) sp.update(e);
      if (e._bit) e.label = hiveLabel(e);
    }
    syncTree(m);
  }
  function syncAll() {
    if (typeof G === 'undefined' || !G.maps) return;
    for (const id in G.maps) { const m = G.maps[id]; if (m === G.map || m.id === 'clearing' || m.id === 'oakhaven' || m.id === 'mill') ensure(m); }
    syncGivers();
  }

  // ============================================================
  //  MARKERS: the automap's quest stamp follows the open quests
  // ============================================================
  let addedBettany = false;
  function syncGivers() {
    const arr = (typeof LOGMAP !== 'undefined' && LOGMAP && Array.isArray(LOGMAP.QUEST_GIVERS)) ? LOGMAP.QUEST_GIVERS : null;
    if (!arr) return;
    const set = (id, want) => { const i = arr.indexOf(id); if (want && i < 0) arr.push(id); else if (!want && i >= 0) arr.splice(i, 1); };
    set('p9_ada', open('pellow'));
    set('p9_tomas', open('tomas'));
    // Bettany is a shop, and test/logmap.test.js pins her as "quest-free": she is marked only once she has
    // asked (and until she has paid), not while the offer is still waiting. Ada and Tomas, who are mine, are marked from the first.
    const wantB = open('bees') && stage('bees') >= 1;
    if (wantB && arr.indexOf('bettany') < 0) { arr.push('bettany'); addedBettany = true; }
    else if (!wantB && addedBettany) { set('bettany', false); addedBettany = false; }
  }

  // ============================================================
  //  THE GREENING CLOSES THEM
  // ============================================================
  function checkClosure() {
    if (!worldGone()) return;
    const q = [['pellow', 'p9q_pellow', TX.ada.jClosed], ['tomas', 'p9q_tomas', TX.tomas.jClosed], ['bees', 'p9q_bees', TX.bees.jClosed]];
    for (const [name, key, line] of q) {
      if (done(name) || closed(name)) continue;
      if (int(key, 3) < 1) continue;          // never begun: nothing to close
      setTrue('p9q_' + name + '_closed');
      journal('side', line);
    }
    syncAll();
  }

  // ============================================================
  //  QUEST 2 MECHANICS: noise, wind, wool, hounds
  // ============================================================
  // A gust is the wind of the sky times a slow pulse, so a stormy day has loud moments and quiet ones.
  function windCover(x, y) {
    if (state.windOverride != null) return clamp(Number(state.windOverride) || 0, 0, 1);
    let g = 0;
    try {
      const base = (typeof Weather !== 'undefined' && Number.isFinite(Weather.wind)) ? clamp(Weather.wind, 0, 1.1) : 0;
      const T = (typeof G !== 'undefined' && Number.isFinite(G.time)) ? G.time : 0;
      const pulse = Math.pow(Math.max(0, Math.sin(T * 0.19 + 2 * Math.sin(T * 0.05))), 3);
      g = base * (0.7 + 0.2 * Math.sin(T * 0.37) + pulse * (0.2 + 0.4 * base));
    } catch (e) { g = 0; }
    return clamp((g - 0.28) / 0.5, 0, 1);
  }
  function treeEnt() {
    const m = typeof G !== 'undefined' && G.maps && G.maps.clearing;
    return m ? m.entities.find((e) => e && e._p9 === 'tree') : null;
  }
  function progress() { return int('p9q_tomas_prog', 9999); }
  function kerfLine(p) {
    const f = p / TUNE.need;
    return f <= 0 ? TX.tomas.kerf0 : f < 0.25 ? TX.tomas.kerf1 : f < 0.6 ? TX.tomas.kerf2 : TX.tomas.kerf3;
  }
  // Before the original swing: is this stroke aimed at the chalked bough, and nothing nearer?
  function beforeStrike() {
    if (!active() || G.state !== 'play' || G.dead || G.mapId !== 'clearing') return null;
    if (!open('tomas') || stage('tomas') !== 1) return null;
    const tree = treeEnt(); if (!tree || tree.hidden) return null;
    const p = G.player, wid = p.weapons[p.weapon], w = WEAPONS[wid];
    if (!w || w.ranged) return null;
    if (G.attack.t > 0 || G.song.t > 0) return null;
    const c = Engine.cam, dx = tree.x - c.x, dy = tree.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
    const norm = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
    if (d > w.reach + (tree.radius || 0.45) + 0.15 || Math.abs(norm(Math.atan2(dy, dx) - c.dir)) > 0.6) return null;
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden) continue;
      const ex = e.x - c.x, ey = e.y - c.y, ed = Math.sqrt(ex * ex + ey * ey);
      if (ed < d && ed <= w.reach + (e.radius || 0.3) && Math.abs(norm(Math.atan2(ey, ex) - c.dir)) < 0.55) return null;   // a foe is nearer: the swing is for it
    }
    return { tree, wid, noise: G.noise };
  }
  function afterStrike(pre) {
    if (!(G.attack.t > 0)) return;           // the swing never started (a locked arm, say)
    const T = TX.tomas, power = POWER[pre.wid] || 0;
    if (!power) { msg(T.bare, 'warn', 3000); return; }
    const weaponPart = Math.max(0, G.noise - pre.noise);
    if (waitLeft()) {
      msg(T.stillHumming, 'warn', 3500);
      return;
    }
    const cover = windCover(pre.tree.x, pre.tree.y), muff = int('p9q_tomas_muff', TUNE.muffMax);
    let mult = 1;
    if (muff > 0) { mult *= TUNE.muffle; setInt('p9q_tomas_muff', muff - 1); }
    mult *= 1 - TUNE.windCut * cover;
    G.noise = clamp(pre.noise + (weaponPart + TUNE.ring) * mult, 0, 10);
    state.lastStrikeT = G.time;
    const p = progress() + power;
    setInt('p9q_tomas_prog', Math.min(p, 9999));
    try { if (cover <= 0.45 && muff <= 0) Audio_.sfx.bell(); } catch (e) { /* no audio yet */ }
    msg(cover > 0.45 ? T.ringWind : muff > 0 ? T.ringWool : T.ringLoud, cover > 0.45 || muff > 0 ? '' : 'warn', 3500);
    if (p >= TUNE.need) fellBough(pre.tree, muff > 0, cover);
    else if (kerfLine(p) !== kerfLine(p - power)) msg(kerfLine(p), '', 3500);
  }
  function fellBough(tree, wrapped, cover) {
    setInt('p9q_tomas', 2);
    G.noise = clamp(G.noise + TUNE.fall * (wrapped ? 0.6 : 1) * (1 - TUNE.windCut * cover), 0, 10);
    syncAll();
    msg(TX.tomas.fell, 'warn', 6000);
    try { Audio_.sfx.bell(); } catch (e) { /* no audio yet */ }
    journal('side', TX.tomas.jFelled);
  }
  function callOff() {
    if (stage('tomas') !== 1 || waitLeft()) return;
    setInt('p9q_tomas_wait', dayNow() + 1);
    state.lastStrikeT = -1e9;
    msg(TX.tomas.calloff, 'bad', 6000);
    journal('side', TX.tomas.jCalledOff);
    syncAll();
  }
  // a hound that comes up soon after a stroke, near the tree, ends the day's work
  function watchHounds() {
    if (!open('tomas') || stage('tomas') !== 1 || G.mapId !== 'clearing') return;
    if (!(G.time - state.lastStrikeT < TUNE.failWindow)) return;
    const tree = treeEnt(); if (!tree) return;
    for (const e of G.ents) {
      if (e.kind === 'enemy' && e.type === 'hound' && !e.dead && !e.hidden && e.state === 'chase' && Math.hypot(e.x - tree.x, e.y - tree.y) < TUNE.failRadius) { callOff(); return; }
    }
  }

  // ============================================================
  //  QUEST 3 MECHANICS: telling the bees
  // ============================================================
  function nearestHive() {
    if (G.mapId !== 'oakhaven') return null;
    const c = Engine.cam; let best = null, bd = TUNE.hiveReach * TUNE.hiveReach;
    for (const e of G.ents) {
      if (!e._bit || e._p9 == null) continue;
      const d = (e.x - c.x) ** 2 + (e.y - c.y) ** 2;
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }
  function tellBees(hv) {
    const B = TX.bees, told = int('p9q_bees_told', 7);
    if (told & hv._bit) return false;
    if (G.noise > TUNE.murmurHi) { msg(B.tooLoud, 'warn', 4000); return false; }
    setInt('p9q_bees_told', told | hv._bit);
    msg(hv._bit === 1 ? B.tell1 : hv._bit === 2 ? (done('pellow') ? B.tell2b : B.tell2) : B.tell3, 'good', 8000);
    try { Audio_.sfx.song(196, 1.2); } catch (e) { /* no audio yet */ }
    if ((told | hv._bit) === 7 && stage('bees') === 1) { setInt('p9q_bees', 2); journal('side', B.jAll); }
    syncAll();
    return true;
  }

  // ============================================================
  //  USING THINGS
  // ============================================================
  function handleUse(e) {
    if (e.use === 'p9_tree') {
      const T = TX.tomas;
      msg(waitLeft() ? T.treeWait : kerfLine(progress()), '', 3500);
      return true;
    }
    if (e.use === 'p9_fleece') {
      if (G.count('p9_wool') >= TUNE.woolMax) { msg(TX.tomas.fleeceEnough, '', 3000); return true; }
      G.give('p9_wool'); try { Audio_.sfx.pickup(); } catch (err) { /* no audio yet */ }
      msg(TX.tomas.fleeceTake, 'good', 4500);
      return true;
    }
    if (e.use === 'p9_skep') {
      const B = TX.bees;
      if (stage('bees') < 1 || !open('bees')) { msg(done('bees') ? B.skepTold : B.skepQuiet, '', 3500); return true; }
      if (int('p9q_bees_told', 7) & e._bit) { msg(B.evTold, '', 3000); return true; }
      showEvent(B.evTitle, B.evBody, [
        { t: B.evYes, f: () => { if (typeof castSong === 'function') castSong('murmur'); } },
        { t: B.evNo, f: null },
      ]);
      return true;
    }
    return false;
  }
  function useWool() {
    const T = TX.tomas;
    if (int('p9q_tomas_muff', TUNE.muffMax) >= TUNE.muffMax) { msg(T.wrapped, '', 3000); return; }
    G.take('p9_wool'); setInt('p9q_tomas_muff', TUNE.muffMax);
    msg(T.wrap, 'good', 4500);
  }

  // ============================================================
  //  THE EXTRA BUTTONS IN TAM'S AND KAELEN'S TALK (they never lose their own quest())
  // ============================================================
  function tamClicked() {
    const A = TX.ada, f = flags();
    if (!open('pellow') || stage('pellow') < 1) return;
    DLG.log.push({ who: 'you', t: A.tamLine });
    if (stage('pellow') >= 2) {
      DLG.log.push({ who: 'them', t: A.tamAgain });
    } else if (!(f.tam_told || f.tam_left)) {
      DLG.log.push({ who: 'them', t: A.tamBusy });
      try { Audio_.sfx.ui(); } catch (e) { /* no audio yet */ }
      renderDialogue(null); return;
    } else {
      DLG.log.push({ who: 'them', t: A.tamTells });
    }
    try { Audio_.sfx.song(PELLOW_HZ, 1.4); } catch (e) { /* no audio yet */ }
    DLG.log.push({ who: 'them', t: A.tamHum });
    learnPitch(1);
    renderDialogue(null);
  }
  function kaelenClicked() {
    const A = TX.ada;
    if (!open('pellow') || stage('pellow') < 1 || !G.has('p9_split_reed')) return;
    DLG.log.push({ who: 'you', t: A.kaelenLine });
    DLG.log.push({ who: 'them', t: A.kaelenReply });
    try { Audio_.sfx.song(PELLOW_HZ, 1.2); } catch (e) { /* no audio yet */ }
    learnPitch(2);
    renderDialogue(null);
  }
  function addDialogueButtons() {
    if (!active() || typeof DLG === 'undefined' || !DLG.npc) return;
    const btns = document.querySelector('#modal-panel .dlg .btns'); if (!btns) return;
    const bye = btns.querySelector('#d-bye');
    const add = (id, label, fn) => {
      if (btns.querySelector('#' + id)) return;
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = id; b.type = 'button'; b.textContent = label;
      b.onclick = () => { try { fn(); } catch (e) { console.warn('sidequests: dialogue button failed', e); } };
      btns.insertBefore(b, bye || null);
    };
    if (DLG.npc === NPCS.tam && open('pellow') && stage('pellow') >= 1) add('d-p9-tam', TX.ada.tamBtn, tamClicked);
    if (DLG.npc === NPCS.kaelen && open('pellow') && stage('pellow') === 1 && G.has('p9_split_reed')) add('d-p9-kaelen', TX.ada.kaelenBtn, kaelenClicked);
  }

  // ============================================================
  //  THE ECHOES: tavern rumours and the Synod Gazette
  // ============================================================
  function addEchoes() {
    const SR = (typeof STORYRUM !== 'undefined') ? STORYRUM : null;
    if (SR && Array.isArray(SR.RUMOURS) && !SR.RUMOURS.some((r) => r.id === 'd_p9_pellow_open')) {
      const R = TX.rumour, add = (id, rank, spec, text) => SR.RUMOURS.push(Object.assign({ id, cat: 'deed', who: 'any', rank, text }, spec));
      add('d_p9_pellow_open', 52, { note: 'Ada Pellow has asked you to find her husband\'s note', req: ['p9q_pellow'], not: ['p9q_pellow_done', 'p9q_pellow_closed', 'greening'] }, R.pellowOpen);
      add('d_p9_pellow_done', 61, { note: 'You hung a new reed for Joram Pellow', req: ['p9q_pellow_done'], not: ['greening'] }, R.pellowDone);
      add('d_p9_tomas_open', 51, { note: 'Tomas has asked you to fell the iron-bough', req: ['p9q_tomas'], not: ['p9q_tomas_done', 'p9q_tomas_closed', 'greening'] }, R.tomasOpen);
      add('d_p9_tomas_done', 62, { note: 'You brought Tomas his last load', req: ['p9q_tomas_done'], not: ['greening'] }, R.tomasDone);
      add('d_p9_bees_open', 53, { note: 'Bettany has asked you to tell her bees', req: ['p9q_bees'], not: ['p9q_bees_done', 'p9q_bees_closed', 'greening'] }, R.beesOpen);
      add('d_p9_bees_done', 63, { note: 'You told Bettany\'s bees the news', req: ['p9q_bees_done'], not: ['greening'] }, R.beesDone);
    }
    // The Gazette's "Local matters" is the Office's spin on what the player has done. Last in the list,
    // so a bounty or a jailbreak still outranks timber.
    if (SR && Array.isArray(SR.LOCAL) && !SR.LOCAL.some((l) => l.id === 'p9_timber')) {
      SR.LOCAL.push({ id: 'p9_timber', test: (c) => c.has('p9q_tomas_done'), note: TX.gazetteNote, t: TX.gazette });
    }
  }

  // ============================================================
  //  WIRING
  // ============================================================
  let accum = 0;
  function tick(dt) {
    if (typeof G === 'undefined' || !G.player || !G.flags) return;
    accum += dt;
    if (accum < 0.25) return;
    accum = 0;
    if (worldGone()) { checkClosure(); return; }
    if (!on()) return;
    watchHounds();
    // the bough's label follows the wind and the clock
    if (G.mapId === 'clearing') { const t = treeEnt(); if (t) t.label = waitLeft() ? TX.tomas.treeWait : (windCover(t.x, t.y) > 0.45 ? TX.tomas.treeWind : TX.tomas.treeFresh); }
    syncGivers();
  }

  function install() {
    if (typeof loadMap === 'function') {
      const _load = loadMap;
      loadMap = function (id) {
        try { checkClosure(); if (typeof G !== 'undefined' && G.maps && G.maps[id]) ensure(G.maps[id]); } catch (err) { console.warn('sidequests: placement failed', err); }
        const r = _load.apply(this, arguments);
        // anim.js sweeps the transient entities of the map it is re-entering: put them back
        try { ensure(G.map); syncGivers(); } catch (err) { /* never break a map change */ }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _restore = restoreGame;
      restoreGame = function () {
        const r = _restore.apply(this, arguments);
        state.lastStrikeT = -1e9; state.tuning = false;
        try { checkClosure(); syncAll(); } catch (err) { /* ditto */ }
        return r;
      };
    }
    if (typeof attack === 'function') {
      const _attack = attack;
      attack = function () {
        let pre = null;
        try { pre = beforeStrike(); } catch (err) { pre = null; }
        if (!pre) return _attack.apply(this, arguments);
        state.swallowAir = true;      // "your swing finds nothing but air" is wrong about a tree
        let r;
        try { r = _attack.apply(this, arguments); } finally { state.swallowAir = false; }
        try { afterStrike(pre); } catch (err) { console.warn('sidequests: stroke failed', err); }
        return r;
      };
    }
    if (typeof msg === 'function') {
      const _msg = msg;
      msg = function (text) {
        if (state.swallowAir && typeof text === 'string' && /finds nothing but air/.test(text)) return undefined;
        return _msg.apply(this, arguments);
      };
    }
    if (typeof castSong === 'function') {
      const _cast = castSong;
      castSong = function (id) {
        // a cast refused because an arm or a song is already moving must not count as a telling
        const busy = !!(G.song && G.song.t > 0) || !!(G.attack && G.attack.t > 0);
        const r = _cast.apply(this, arguments);
        try {
          if (id === 'murmur' && !busy && G.murmurT > 0 && open('bees') && stage('bees') === 1) { const hv = nearestHive(); if (hv) tellBees(hv); }
        } catch (err) { console.warn('sidequests: telling failed', err); }
        return r;
      };
    }
    if (typeof pickUp === 'function') {
      const _pick = pickUp;
      pickUp = function (e) {
        if (e && e._p9 === 'bough' && !e.dead && !e.hidden) {
          e.dead = true; e.hidden = true;
          G.give('p9_bough'); setInt('p9q_tomas', 3); syncAll();
          try { Audio_.sfx.pickup(); } catch (err) { /* no audio yet */ }
          msg(TX.tomas.carry, 'good', 5000);
          return undefined;
        }
        return _pick.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _useItem = useItem;
      useItem = function (slot) {
        if (slot && slot.id === 'p9_wool') { useWool(); try { renderInventory(); } catch (err) { /* panel gone */ } return undefined; }
        return _useItem.apply(this, arguments);
      };
    }
    if (typeof useDeco === 'function') {
      const _useDeco = useDeco;
      useDeco = function (e) {
        if (e && e._p9 != null && e.use && handleUse(e)) return undefined;
        return _useDeco.apply(this, arguments);
      };
    }
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function (dt, moving, running) {
        const r = _un.apply(this, arguments);
        try {
          if (moving && running && stage('tomas') === 3 && open('tomas') && G.has('p9_bough')) {
            G.noise = clamp(G.noise + dt * TUNE.carryRun, 0, 10);
            if (G.time - state.carryMsgT > 8) { state.carryMsgT = G.time; msg(TX.tomas.knock, 'warn', 3000); }
          }
        } catch (err) { /* never break a tick */ }
        return r;
      };
    }
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function () {
        const r = _rd.apply(this, arguments);
        try { addDialogueButtons(); } catch (err) { console.warn('sidequests: dialogue buttons failed', err); }
        return r;
      };
    }
    if (typeof renderMap === 'function') {
      const _rm = renderMap;
      renderMap = function () { try { syncGivers(); } catch (err) { /* markers are cosmetic */ } return _rm.apply(this, arguments); };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) { const r = _up.apply(this, arguments); try { tick(dt); } catch (err) { /* never break a frame */ } return r; };
    }
    // The logbook picks a sketch by the first pattern that matches an entry. Old Tam and the Flume
    // are named in Ada's entries, and the 'tam' sketch (the voice on the Flume) would be the wrong picture.
    try {
      const P = (typeof LOGMAP !== 'undefined' && LOGMAP && Array.isArray(LOGMAP.PATTERNS)) ? LOGMAP.PATTERNS : null;
      if (P && !P.some((x) => x && x.p9)) { const row = ['quill', /joram pellow|ada pellow/]; row.p9 = true; P.unshift(row); }
    } catch (err) { /* sketches are cosmetic */ }
    addEchoes();
  }
  if (typeof document !== 'undefined') {
    try { install(); } catch (err) { console.warn('sidequests: install failed', err); }
  }

  return {
    TEXTS: LIST, TX, TUNE, POWER, SPECS, ITEM_DEFS, NPC_DEFS, PELLOW_HZ, PELLOW_NAME, TREE_AT, state,
    stage, done, closed, open, active, int, ensure, syncAll, syncGivers, checkClosure, tick, windCover, waitLeft, progress,
    startTuning, finishTuning, learnPitch, tamClicked, kaelenClicked, tellBees, nearestHive, handleUse, useWool, callOff, watchHounds,
    beforeStrike, afterStrike, treeEnt, addEchoes, kerfLine, hiveLabel,
  };
})();
